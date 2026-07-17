// ─────────────────────────────────────────────────────────────────────────────
//  brief-executivo — "Bom dia diretoria": resumo matinal consolidado no WhatsApp
//
//  Disparada por cron (seg–sex 8h BRT). Junta num card só: faturamento de ontem
//  e do mês, operação em andamento, pendências fiscais e CNHs vencendo.
//  Envia pros números do secret WHATSAPP_BRIEF_NUMEROS (vírgula) e grava na
//  memória da Sofia (sofia_conversas). Cada seção tem try/catch — uma falha não
//  derruba o brief inteiro.
//
//  Nota: contas a pagar vencendo e inadimplência entram numa próxima versão,
//  com endpoint dedicado (o valor tem pegadinha de rateio e precisa ser exato).
// ─────────────────────────────────────────────────────────────────────────────
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const GRAPH_VERSION = "v21.0";
const DW_API_URL = Deno.env.get("DW_API_URL") || "https://dw.dwsgtlog.com";
const DW_API_SECRET =
  Deno.env.get("DW_API_SECRET") ||
  "92fdb5856ac33b770f3ea32484dd3222db0fcfe8d56b85919191b8c65ff9e7ab";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
);

const fmtBRL = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2 });

function agoraBR() {
  const d = new Date(Date.now() - 3 * 60 * 60 * 1000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return {
    y: d.getUTCFullYear(), m: d.getUTCMonth() + 1, d: d.getUTCDate(),
    iso: `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`,
    ddmm: `${pad(d.getUTCDate())}/${pad(d.getUTCMonth() + 1)}`,
  };
}

async function dw(path: string, body: Record<string, unknown>) {
  const r = await fetch(`${DW_API_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": DW_API_SECRET },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`${path} ${r.status}`);
  return r.json();
}

async function sendText(to: string, body: string): Promise<boolean> {
  const token = Deno.env.get("WHATSAPP_TOKEN");
  const phoneId = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID");
  if (!token || !phoneId) return false;
  const res = await fetch(
    `https://graph.facebook.com/${GRAPH_VERSION}/${phoneId}/messages`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ messaging_product: "whatsapp", to, type: "text", text: { body } }),
    },
  );
  if (!res.ok) console.error(`Falha ao enviar brief pra ${to}:`, await res.text());
  return res.ok;
}

serve(async (_req) => {
  try {
    const numeros = (Deno.env.get("WHATSAPP_BRIEF_NUMEROS") ?? "")
      .split(/[;,]/).map((n) => n.trim()).filter(Boolean);
    if (numeros.length === 0) {
      return new Response(JSON.stringify({ ok: false, motivo: "WHATSAPP_BRIEF_NUMEROS vazio." }),
        { headers: { "Content-Type": "application/json" } });
    }

    const t = agoraBR();
    const linhas: string[] = [`☀️ *Bom dia!* Resumo SGT — ${t.ddmm}`, ""];

    // 💰 Faturamento (ontem + mês)
    try {
      const f = await dw("/dw-faturamento-resumo", {});
      const ontem = Number(f?.daily_revenue?.revenue_value ?? 0);
      const mes = Number(f?.monthly_revenue?.revenue_value ?? 0);
      linhas.push(`💰 *Faturamento ontem:* ${fmtBRL(ontem)}`);
      linhas.push(`📈 *Mês até agora:* ${fmtBRL(mes)}`);
    } catch { linhas.push("💰 Faturamento: indisponível agora"); }

    // 🚛 Operação em andamento
    try {
      const op = await dw("/dw-operacional", {});
      const viagens = ((op?.data ?? []) as unknown[]).length;
      linhas.push(`🚛 *Operação:* ${viagens} viagem(ns) em andamento`);
    } catch { /* silencia seção */ }

    // 📄 Fiscal — notas a lançar no mês (universo "pra lançar")
    try {
      const primeiroDia = `${t.y}-${String(t.m).padStart(2, "0")}-01`;
      const c = await dw("/dw-consulta-nfe", { dataInicio: primeiroDia, dataFim: t.iso, limite: 5000 });
      const rows = ((c?.data ?? []) as Array<Record<string, unknown>>)
        .filter((x) => String(x.TPNF) !== "0" && Number(x.DESCONSIDERADO) !== 1 && x.SITUACAO === "NAO_LANCADA");
      const valor = rows.reduce((s, x) => s + Number(x.VALOR_NOTA ?? 0), 0);
      linhas.push(`📄 *Fiscal:* ${rows.length} nota(s) a lançar${rows.length ? ` — ${fmtBRL(valor)}` : ""}`);
    } catch { /* silencia */ }

    // 🪪 CNHs vencendo nos próximos 30 dias
    try {
      const rh = await dw("/dw-rh", { situacao: "ATIVO" });
      const hoje = new Date(t.iso);
      const limite = new Date(hoje.getTime() + 30 * 24 * 60 * 60 * 1000);
      const vencendo = ((rh?.data ?? []) as Array<Record<string, unknown>>)
        .map((m) => ({ nome: String(m.motorista ?? "—"), val: m.validade_habilitacao ? new Date(String(m.validade_habilitacao)) : null }))
        .filter((m) => m.val && !isNaN(m.val.getTime()) && m.val >= hoje && m.val <= limite)
        .sort((a, b) => (a.val!.getTime() - b.val!.getTime()));
      if (vencendo.length) {
        linhas.push(`🪪 *CNHs vencendo (30d):* ${vencendo.length}`);
        for (const v of vencendo.slice(0, 5)) {
          const d = v.val!;
          linhas.push(`   - ${v.nome} (vence ${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")})`);
        }
      }
    } catch { /* silencia */ }

    linhas.push("");
    linhas.push("_Precisa de detalhe de algo? É só me perguntar._ 🤖");
    const msg = linhas.join("\n");

    const enviados: Record<string, boolean> = {};
    for (const to of numeros) {
      enviados[to] = await sendText(to, msg);
      if (enviados[to]) {
        await supabase.from("sofia_conversas").insert({ telefone: to, role: "assistant", conteudo: msg });
      }
    }

    return new Response(JSON.stringify({ ok: true, enviados }),
      { headers: { "Content-Type": "application/json" } });
  } catch (err) {
    console.error("brief-executivo:", err);
    return new Response(JSON.stringify({ ok: false, erro: String(err) }),
      { status: 500, headers: { "Content-Type": "application/json" } });
  }
});
