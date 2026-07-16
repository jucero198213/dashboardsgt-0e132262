import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

// ── WhatsApp Cloud API webhook ───────────────────────────────────────────────
// GET  → handshake de verificação da Meta (hub.challenge)
// POST → mensagem recebida de um usuário → IA → resposta de volta no WhatsApp
//
// Secrets necessários (Supabase → Edge Functions → Secrets):
//   WHATSAPP_VERIFY_TOKEN   → string que você inventa e cola no painel da Meta
//   WHATSAPP_TOKEN          → token de acesso permanente (usuário do sistema)
//   WHATSAPP_PHONE_NUMBER_ID→ ID do número registrado (aparece na Etapa 2)
//   WHATSAPP_ALLOWED_NUMBERS→ números autorizados, separados por vírgula
//                             ex.: "5519997662102,5511988887777"
//   OPENAI_API_KEY          → já configurada (usada pela ai-assistant)

const GRAPH_VERSION = "v21.0";

// IDs de mensagens já processadas. A Meta REENVIA a mesma mensagem quando o
// webhook demora a responder — sem isto, a mesma pergunta seria respondida
// várias vezes (spam). Set em memória do processo, com limite de tamanho.
const processedIds = new Set<string>();

// ── Memória de conversa PERSISTENTE (tabela sofia_conversas no Supabase) ──────
// Guarda o histórico por número no banco → sobrevive a redeploy e cold start.
type Turn = { role: "user" | "assistant"; content: string };
const MAX_TURNS = 12;      // últimas 12 mensagens (~6 idas e voltas) no contexto
const JANELA_MIN = 90;     // considera como "conversa atual" as msgs da última 1h30

const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
);

async function getHistorico(telefone: string): Promise<Turn[]> {
  const desde = new Date(Date.now() - JANELA_MIN * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from("sofia_conversas")
    .select("role, conteudo")
    .eq("telefone", telefone)
    .gte("criado_em", desde)
    .order("criado_em", { ascending: false })
    .limit(MAX_TURNS);
  if (error || !data) {
    if (error) console.error("Erro ao ler histórico:", error.message);
    return [];
  }
  // veio do mais novo pro mais antigo → inverte pra ordem cronológica
  return data.reverse().map((r) => ({
    role: r.role as "user" | "assistant",
    content: r.conteudo as string,
  }));
}

async function salvarMensagem(telefone: string, role: "user" | "assistant", conteudo: string) {
  const { error } = await supabase
    .from("sofia_conversas")
    .insert({ telefone, role, conteudo });
  if (error) console.error("Erro ao salvar mensagem:", error.message);
}

// Instrução de formatação para o canal WhatsApp. O WhatsApp NÃO renderiza
// tabelas markdown nem cabeçalhos (#) — então pedimos respostas em lista.
// Negrito no WhatsApp é com *asteriscos simples*, itálico com _underscore_.
const WHATSAPP_FORMAT_HINT =
  "Você está respondendo pelo WhatsApp. Regras de formatação OBRIGATÓRIAS: " +
  "NÃO use tabelas markdown (nada de | ou :---). NÃO use cabeçalhos com #. " +
  "Para destacar, use negrito do WhatsApp com *um asterisco* de cada lado. " +
  "Para listas, use uma linha por item começando com '- '. " +
  "Para itens com valor, use o formato '- *Nome:* valor'. " +
  "Seja conciso e direto, ideal para leitura no celular.";

// ── Envia uma mensagem de texto de volta pro WhatsApp ────────────────────────
async function sendWhatsApp(to: string, body: string) {
  const token = Deno.env.get("WHATSAPP_TOKEN");
  const phoneId = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID");
  if (!token || !phoneId) {
    console.error("WHATSAPP_TOKEN ou WHATSAPP_PHONE_NUMBER_ID não configurados");
    return;
  }
  const res = await fetch(
    `https://graph.facebook.com/${GRAPH_VERSION}/${phoneId}/messages`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to,
        type: "text",
        text: { body },
      }),
    },
  );
  if (!res.ok) {
    console.error("Erro ao enviar WhatsApp:", await res.text());
  }
}

// ── Envia um documento (planilha Excel .xlsx) de volta pro WhatsApp ──────────
// Recebe o conteúdo em base64 (gerado pela ai-assistant com SheetJS) e sobe
// com o MIME oficial do Excel — formato aceito pela Media API do WhatsApp.
const XLSX_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

async function sendWhatsAppDocument(to: string, filename: string, base64: string, caption: string) {
  const token = Deno.env.get("WHATSAPP_TOKEN");
  const phoneId = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID");
  if (!token || !phoneId) {
    console.error("WHATSAPP_TOKEN ou WHATSAPP_PHONE_NUMBER_ID não configurados");
    return;
  }

  // 1. Decodifica o base64 e faz upload na Media API do WhatsApp
  const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
  const form = new FormData();
  form.append("messaging_product", "whatsapp");
  form.append("type", XLSX_MIME);
  form.append("file", new Blob([bytes], { type: XLSX_MIME }), filename);

  const up = await fetch(
    `https://graph.facebook.com/${GRAPH_VERSION}/${phoneId}/media`,
    { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: form },
  );
  if (!up.ok) {
    console.error("Erro no upload do documento:", await up.text());
    return;
  }
  const mediaId = (await up.json())?.id;
  if (!mediaId) return;

  // 2. Envia a mensagem de documento referenciando a mídia
  const res = await fetch(
    `https://graph.facebook.com/${GRAPH_VERSION}/${phoneId}/messages`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to,
        type: "document",
        document: { id: mediaId, filename, caption },
      }),
    },
  );
  if (!res.ok) {
    console.error("Erro ao enviar documento WhatsApp:", await res.text());
  }
}

// Mapa número → nome, lido do secret WHATSAPP_CONTATOS.
// Formato: "5519997662102:João Pedral;5511988887777:Maria Silva"
// (separadores aceitos entre contatos: ; ou , — entre número e nome: : ou =)
function getContato(from: string): string | null {
  const raw = Deno.env.get("WHATSAPP_CONTATOS") ?? "";
  if (!raw) return null;
  for (const part of raw.split(/[;,]/)) {
    const idx = part.search(/[:=]/);
    if (idx === -1) continue;
    const num = part.slice(0, idx).trim();
    const nome = part.slice(idx + 1).trim();
    if (num === from) return nome || null;
  }
  return null;
}

// Período do dia no horário de Brasília (America/Sao_Paulo = UTC-3, sem horário de verão).
function periodoDoDia(): string {
  const horaBR = (new Date().getUTCHours() - 3 + 24) % 24;
  if (horaBR >= 5 && horaBR < 12) return "manhã";
  if (horaBR >= 12 && horaBR < 18) return "tarde";
  return "noite";
}

// ── Pergunta pra IA ──────────────────────────────────────────────────────────
// Reaproveita a Edge Function "ai-assistant" (mesma usada no chat do site):
// ela já tem a OpenAI + todas as ferramentas do DW. Assim o WhatsApp ganha a
// MESMA assistente, com acesso aos dados reais — sem duplicar lógica aqui.
interface AiResposta {
  reply: string;
  planilha?: { filename?: string; xlsx_base64?: string };
}

async function askAI(historico: Turn[], nome: string | null, periodo: string): Promise<AiResposta> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceKey) {
    console.error("SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY ausentes");
    return "Assistente indisponível no momento.";
  }

  const contexto =
    `[Contexto: conversa via WhatsApp com ${nome ?? "um gestor da SGT"}. ` +
    `Período atual no Brasil: ${periodo}. Se a pessoa cumprimentar ou estiver ` +
    `iniciando a conversa, retribua com a saudação do período ("Bom dia"/"Boa tarde"/` +
    `"Boa noite") tratando-a pelo nome. Não repita a saudação a cada mensagem.]`;

  // Envia o histórico inteiro (para a Sofia lembrar o papo), enriquecendo APENAS
  // a última mensagem (a atual) com a instrução de formato e o contexto.
  const payload = historico.map((t, i) => {
    if (i === historico.length - 1 && t.role === "user") {
      return { role: "user", content: `${WHATSAPP_FORMAT_HINT}\n\n${contexto}\n\nMensagem: ${t.content}` };
    }
    return { role: t.role, content: t.content };
  });

  const res = await fetch(`${supabaseUrl}/functions/v1/ai-assistant`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${serviceKey}`,
    },
    body: JSON.stringify({ messages: payload }),
  });

  if (!res.ok) {
    console.error("Erro ao chamar ai-assistant:", await res.text());
    return { reply: "Não consegui processar agora. Tente novamente em instantes." };
  }
  const data = await res.json();
  return { reply: data?.reply ?? "Não consegui responder agora.", planilha: data?.planilha };
}

serve(async (req: Request) => {
  const url = new URL(req.url);

  // ── Verificação do webhook (Meta chama via GET) ────────────────────────────
  if (req.method === "GET") {
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");
    const expected = Deno.env.get("WHATSAPP_VERIFY_TOKEN");

    if (mode === "subscribe" && token === expected) {
      return new Response(challenge ?? "", { status: 200 });
    }
    return new Response("Forbidden", { status: 403 });
  }

  // ── Mensagem recebida ──────────────────────────────────────────────────────
  if (req.method === "POST") {
    let payload: Record<string, unknown>;
    try {
      payload = await req.json();
    } catch {
      return new Response("ok", { status: 200 });
    }

    const value = (payload as any)?.entry?.[0]?.changes?.[0]?.value;
    const message = value?.messages?.[0];

    // Sem mensagem de texto (ex.: status de entrega) → só confirma 200
    if (!message || message.type !== "text") {
      return new Response("ok", { status: 200 });
    }

    // Dedup: ignora reenvios da Meta da mesma mensagem
    const msgId: string = message.id ?? "";
    if (msgId && processedIds.has(msgId)) {
      return new Response("ok", { status: 200 });
    }
    if (msgId) {
      processedIds.add(msgId);
      if (processedIds.size > 500) {
        processedIds.delete(processedIds.values().next().value as string);
      }
    }

    const from: string = message.from;
    const text: string = message.text?.body ?? "";

    // Processa em SEGUNDO PLANO e responde 200 imediatamente, para a Meta não
    // reenviar a mensagem enquanto a IA é consultada (causa do spam).
    const work = handleMessage(from, text);
    // @ts-ignore EdgeRuntime é injetado pelo runtime do Supabase
    if (typeof EdgeRuntime !== "undefined" && EdgeRuntime?.waitUntil) {
      // @ts-ignore
      EdgeRuntime.waitUntil(work);
    } else {
      await work; // fallback (ambiente sem waitUntil)
    }

    return new Response("ok", { status: 200 });
  }

  return new Response("Method not allowed", { status: 405 });
});

// ── Processa uma mensagem: trava de acesso → IA → resposta ───────────────────
async function handleMessage(from: string, text: string) {
  try {
    const allowed = (Deno.env.get("WHATSAPP_ALLOWED_NUMBERS") ?? "")
      .split(",")
      .map((n) => n.trim())
      .filter(Boolean);

    if (allowed.length > 0 && !allowed.includes(from)) {
      await sendWhatsApp(
        from,
        "Este assistente é restrito. Seu número não tem autorização de acesso.",
      );
      return;
    }

    const nome = getContato(from);

    // Carrega o histórico do banco, persiste a mensagem atual, consulta a Sofia
    // com todo o contexto e guarda a resposta — tudo na tabela sofia_conversas.
    const historicoAnterior = await getHistorico(from);
    await salvarMensagem(from, "user", text);

    const historico = [...historicoAnterior, { role: "user" as const, content: text }];
    const { reply, planilha } = await askAI(historico, nome, periodoDoDia());

    await salvarMensagem(from, "assistant", reply);
    await sendWhatsApp(from, reply);

    // Se a Sofia gerou uma planilha, envia como documento anexo
    if (planilha?.xlsx_base64) {
      await sendWhatsAppDocument(
        from,
        planilha.filename ?? "conferencia_nfe.xlsx",
        planilha.xlsx_base64,
        "📊 Planilha de conferência fiscal",
      );
    }
  } catch (err) {
    console.error("Erro ao processar mensagem:", err);
  }
}
