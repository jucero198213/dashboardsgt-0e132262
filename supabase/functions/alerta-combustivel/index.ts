// ─────────────────────────────────────────────────────────────────────────────
//  alerta-combustivel — alerta de abastecimentos suspeitos (últimos 7 dias)
//
//  Consulta /dw-abastecimento-qualidade no DW e só envia WhatsApp se houver
//  problema real: sem motorista >= 10% do valor OU placas com padrão suspeito.
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

const pad = (n: number) => String(n).padStart(2, "0");

// Datas no fuso de Brasília (UTC-3)
function periodoBR() {
  const hoje = new Date(Date.now() - 3 * 60 * 60 * 1000);
  const inicio = new Date(hoje.getTime() - 7 * 24 * 60 * 60 * 1000);
  const iso = (d: Date) => `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
  return {
    dataInicio: iso(inicio),
    dataFim: iso(hoje),
    ddmm: `${pad(hoje.getUTCDate())}/${pad(hoje.getUTCMonth() + 1)}`,
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
  const corpo = await res.text();
  if (!res.ok) {
    console.error(`Falha ao enviar alerta de combustível pra ${to}:`, corpo);
  } else {
    console.log(`Alerta aceito pela Meta pra ${to}:`, corpo);
  }
  return res.ok;
}

serve(async (_req) => {
  try {
    const p = periodoBR();

    const r = await fetch(`${DW_API_URL}/dw-abastecimento-qualidade`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": DW_API_SECRET },
      body: JSON.stringify({ dataInicio: p.dataInicio, dataFim: p.dataFim }),
    });
    if (!r.ok) {
      throw new Error(`DW /dw-abastecimento-qualidade ${r.status}: ${(await r.text()).slice(0, 200)}`);
    }
    const q = await r.json();

    const sem = q?.sem_motorista ?? {};
    const pctSemMotorista = Number(sem.pct_valor ?? 0);
    const valorSemMotorista = Number(sem.valor ?? 0);
    const placas = (q?.placas_suspeitas ?? []) as Array<Record<string, unknown>>;

    if (pctSemMotorista < 10 && placas.length === 0) {
      return new Response(JSON.stringify({ ok: true, motivo: "sem alertas" }),
        { headers: { "Content-Type": "application/json" } });
    }

    const linhas: string[] = [];
    linhas.push(`⛽ *Alerta Combustível — ${p.ddmm}*`);
    linhas.push(`Período: últimos 7 dias`);
    linhas.push("");

    if (placas.length > 0) {
      linhas.push(`🚨 *Placas com padrão suspeito (${placas.length}):*`);
      for (const x of placas.slice(0, 5)) {
        const placa = String(x.placa ?? x.PLACA ?? "—");
        const modelo = String(x.modelo ?? x.MODELO ?? "—");
        const media = Number(x.media_dia ?? x.media_kg_dia ?? 0);
        const pico = Number(x.pico_dia ?? x.pico ?? 0);
        const valor = Number(x.valor ?? 0);
        linhas.push(
          `   • ${placa} (${modelo}) — ${media.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}kg média/dia, ` +
          `pico ${pico.toLocaleString("pt-BR", { maximumFractionDigits: 0 })} no mesmo dia — ${fmtBRL(valor)}`,
        );
      }
      linhas.push("");
    }

    if (pctSemMotorista >= 10) {
      linhas.push(`👤 *Sem motorista identificado:* ${pctSemMotorista.toFixed(0)}% do valor — ${fmtBRL(valorSemMotorista)}`);
      linhas.push("");
    }

    linhas.push("_Verifique os lançamentos no SGT Log._");
    const corpo = linhas.join("\n");

    const numeros = (Deno.env.get("WHATSAPP_BRIEF_NUMEROS") ?? "")
      .split(/[;,]/).map((n) => n.trim()).filter(Boolean);

    const enviados: Record<string, boolean> = {};
    for (const to of numeros) {
      const nome = getContato(to);
      const msg = nome ? `Olá, ${nome}!\n\n${corpo}` : corpo;
      enviados[to] = await sendText(to, msg);
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
        enviados,
        alertas: { placas_suspeitas: placas.length, pct_sem_motorista: pctSemMotorista },
      }),
      { headers: { "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("alerta-combustivel:", err);
    return new Response(JSON.stringify({ ok: false, erro: String(err) }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
