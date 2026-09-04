// ─────────────────────────────────────────────────────────────────────────────
//  fiscal-alerta — alerta automático da conferência fiscal no WhatsApp
//
//  Disparada pelo agendador (pg_cron, seg–sex 8h de Brasília). Consulta o
//  /dw-consulta-nfe do MÊS CORRENTE (universo "pra lançar": sem notas de
//  entrada e sem fornecedores desconsiderados) e envia o resumo pros números
//  do secret WHATSAPP_ALERTA_NUMEROS (separados por vírgula).
//
//  Envia SEMPRE (mesmo zerado) — decisão do time, confirma que está rodando.
//
//  Obs (janela de 24h do WhatsApp): mensagens de formato livre só chegam pra
//  quem interagiu com o número nas últimas 24h. Se algum destinatário não
//  receber, é isso — a solução definitiva é um template aprovado na Meta
//  (ver WHATSAPP_ALERTA_TEMPLATE abaixo, opcional).
// ─────────────────────────────────────────────────────────────────────────────
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const GRAPH_VERSION = "v21.0";

// Grava o alerta na memória da Sofia (sofia_conversas) — assim, quando o
// usuário responder ao alerta ("me manda a planilha"), ela sabe do contexto.
const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
);
const DW_API_URL = Deno.env.get("DW_API_URL") || "https://dw.dwsgtlog.com";
const DW_API_SECRET =
  Deno.env.get("DW_API_SECRET") ||
  "92fdb5856ac33b770f3ea32484dd3222db0fcfe8d56b85919191b8c65ff9e7ab";

const fmtBRL = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2 });

// Datas do mês corrente no fuso de Brasília (UTC-3, sem horário de verão)
function periodoBR() {
  const agora = new Date(Date.now() - 3 * 60 * 60 * 1000);
  const y = agora.getUTCFullYear();
  const m = agora.getUTCMonth();
  const d = agora.getUTCDate();
  const pad = (n: number) => String(n).padStart(2, "0");
  const meses = [
    "janeiro", "fevereiro", "março", "abril", "maio", "junho",
    "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
  ];
  return {
    primeiroDia: `${y}-${pad(m + 1)}-01`,
    hoje: `${y}-${pad(m + 1)}-${pad(d)}`,
    diaLabel: `${pad(d)}/${pad(m + 1)}`,
    mesNome: meses[m],
  };
}

// Nome do contato pelo número (secret WHATSAPP_CONTATOS, mesmo mapa da Sofia).
function getContato(from: string): string | null {
  const raw = Deno.env.get("WHATSAPP_CONTATOS") ?? "";
  if (!raw) return null;
  for (const part of raw.split(/[;,]/)) {
    const idx = part.search(/[:=]/);
    if (idx === -1) continue;
    if (part.slice(0, idx).trim() === from) return part.slice(idx + 1).trim() || null;
  }
  return null;
}

// Envia via TEMPLATE aprovado (entrega fora da janela de 24h). false → cai no texto.
const TEMPLATE_NOME = Deno.env.get("WHATSAPP_FISCAL_TEMPLATE") || "alerta_fiscal_sgt";

async function sendTemplate(to: string, params: string[]): Promise<boolean> {
  const token = Deno.env.get("WHATSAPP_TOKEN");
  const phoneId = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID");
  if (!token || !phoneId) return false;
  const res = await fetch(
    `https://graph.facebook.com/${GRAPH_VERSION}/${phoneId}/messages`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to,
        type: "template",
        template: {
          name: TEMPLATE_NOME,
          language: { code: "pt_BR" },
          components: [{
            type: "body",
            parameters: params.map((p) => ({ type: "text", text: (p || "—").replace(/\s+/g, " ").trim() })),
          }],
        },
      }),
    },
  );
  const corpo = await res.text();
  if (!res.ok) {
    console.warn(`Template "${TEMPLATE_NOME}" falhou pra ${to} (caindo no texto livre):`, corpo);
    return false;
  }
  console.log(`Template "${TEMPLATE_NOME}" aceito pra ${to}:`, corpo);
  return true;
}

// Envia texto livre no WhatsApp. Retorna true/false e loga falhas (ex: janela 24h).
async function sendText(to: string, body: string): Promise<boolean> {
  const token = Deno.env.get("WHATSAPP_TOKEN");
  const phoneId = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID");
  if (!token || !phoneId) {
    console.error("WHATSAPP_TOKEN ou WHATSAPP_PHONE_NUMBER_ID não configurados");
    return false;
  }
  const res = await fetch(
    `https://graph.facebook.com/${GRAPH_VERSION}/${phoneId}/messages`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ messaging_product: "whatsapp", to, type: "text", text: { body } }),
    },
  );
  if (!res.ok) {
    console.error(`Falha ao enviar alerta pra ${to}:`, await res.text());
    return false;
  }
  return true;
}

serve(async (_req) => {
  try {
    const numeros = (Deno.env.get("WHATSAPP_ALERTA_NUMEROS") ?? "")
      .split(/[;,]/)
      .map((n) => n.trim())
      .filter(Boolean);
    if (numeros.length === 0) {
      return new Response(
        JSON.stringify({ ok: false, motivo: "Secret WHATSAPP_ALERTA_NUMEROS vazio — nenhum destinatário." }),
        { headers: { "Content-Type": "application/json" } },
      );
    }

    const p = periodoBR();

    // Conferência do mês corrente
    const r = await fetch(`${DW_API_URL}/dw-consulta-nfe`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": DW_API_SECRET },
      body: JSON.stringify({ dataInicio: p.primeiroDia, dataFim: p.hoje, limite: 5000 }),
    });
    if (!r.ok) throw new Error(`DW /dw-consulta-nfe ${r.status}: ${(await r.text()).slice(0, 200)}`);
    const rows = ((await r.json())?.data ?? []) as Array<Record<string, unknown>>;

    // Universo "pra lançar": sem entrada (TPNF=0) e sem desconsiderados (Minerva)
    const limpo = rows.filter((x) => String(x.TPNF) !== "0" && Number(x.DESCONSIDERADO) !== 1);
    const naoLanc = limpo.filter((x) => x.SITUACAO === "NAO_LANCADA");
    const diverg  = limpo.filter((x) => x.SITUACAO === "DIVERGENTE");
    const valorNaoLanc = naoLanc.reduce((s, x) => s + Number(x.VALOR_NOTA ?? 0), 0);
    const valorDiverg  = diverg.reduce((s, x) => s + Number(x.VALOR_NOTA ?? 0), 0);

    // Top 3 fornecedores pendentes por valor
    const porForn: Record<string, { qtd: number; valor: number }> = {};
    for (const x of naoLanc) {
      const f = String(x.RAZAO_SOCIAL ?? "—");
      (porForn[f] ??= { qtd: 0, valor: 0 });
      porForn[f].qtd++;
      porForn[f].valor += Number(x.VALOR_NOTA ?? 0);
    }
    const top = Object.entries(porForn)
      .sort((a, b) => b[1].valor - a[1].valor)
      .slice(0, 3);

    let msg: string;
    if (naoLanc.length === 0 && diverg.length === 0) {
      msg =
        `☀️ Bom dia! *Conferência fiscal de ${p.mesNome}* (até ${p.diaLabel}):\n\n` +
        `✅ Tudo em dia — nenhuma nota pendente de lançamento e nenhuma divergência. 👏`;
    } else {
      msg =
        `☀️ Bom dia! *Conferência fiscal de ${p.mesNome}* (até ${p.diaLabel}):\n\n` +
        `🔴 *Não lançadas:* ${naoLanc.length} nota(s) — ${fmtBRL(valorNaoLanc)}\n` +
        `🟡 *Divergentes:* ${diverg.length} nota(s) — ${fmtBRL(valorDiverg)}\n` +
        (top.length
          ? `\nMaiores pendências:\n` +
            top.map(([f, v]) => `- *${f}:* ${v.qtd} nota(s), ${fmtBRL(v.valor)}`).join("\n")
          : "") +
        `\n\nMe peça _a planilha do que falta lançar_ que eu envio o Excel. 📊`;
    }

    // Maior pendência numa linha só (template não aceita quebra de linha)
    const maiorPend = top.length
      ? `${top[0][0]} — ${top[0][1].qtd} nota(s), ${fmtBRL(top[0][1].valor)}`
      : "nenhuma";

    const enviados: Record<string, boolean> = {};
    const via: Record<string, string> = {};
    for (const to of numeros) {
      const nome = getContato(to) || "diretoria";
      const params = [
        nome,
        `${p.mesNome} (até ${p.diaLabel})`,
        String(naoLanc.length),
        fmtBRL(valorNaoLanc),
        String(diverg.length),
        fmtBRL(valorDiverg),
        maiorPend,
      ];
      // 1º tenta o template (entrega sempre); se não rolar, cai no texto livre
      const okTpl = await sendTemplate(to, params);
      enviados[to] = okTpl ? true : await sendText(to, msg);
      via[to] = okTpl ? "template" : "texto";

      // Registra o alerta no histórico da conversa — a Sofia "lembra" do que enviou
      if (enviados[to]) {
        const { error } = await supabase
          .from("sofia_conversas")
          .insert({ telefone: to, role: "assistant", conteudo: msg });
        if (error) console.error("Erro ao salvar alerta no histórico:", error.message);
      }
    }

    return new Response(
      JSON.stringify({
        ok: true,
        periodo: { de: p.primeiroDia, ate: p.hoje },
        nao_lancadas: naoLanc.length,
        divergentes: diverg.length,
        enviados,
        via,
      }),
      { headers: { "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("fiscal-alerta:", err);
    return new Response(JSON.stringify({ ok: false, erro: String(err) }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
