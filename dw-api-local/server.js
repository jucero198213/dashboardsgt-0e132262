// ─────────────────────────────────────────────────────────────────────────────
//  DW API LOCAL  –  Roda na rede interna e expõe os dados via Cloudflare Tunnel
//  Uso: node server.js
// ─────────────────────────────────────────────────────────────────────────────

const express = require("express");
const cors    = require("cors");
const sql     = require("mssql");
const fs      = require("fs");
const path    = require("path");
const https   = require("https");   // consulta à SEFAZ (mTLS com o certificado)
const zlib    = require("zlib");     // descompacta o docZip da SEFAZ (gzip)
const { XMLParser } = require("fast-xml-parser"); // parsing do XML da NFe

// ── Carrega .env manualmente (sem depender do dotenv) ─────────────────────────
const envPath = path.join(__dirname, ".env");
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, "utf-8")
    .split("\n")
    .forEach((line) => {
      const clean = line.trim();
      if (!clean || clean.startsWith("#")) return;
      const [key, ...rest] = clean.split("=");
      process.env[key.trim()] = rest.join("=").trim();
    });
}

// ── Configuração MSSQL ────────────────────────────────────────────────────────
const dbConfig = {
  server:   process.env.MSSQL_SERVER,
  port:     parseInt(process.env.MSSQL_PORT || "1433"),
  database: process.env.MSSQL_DATABASE,
  user:     process.env.MSSQL_USER,
  password: process.env.MSSQL_PASSWORD,
  options: {
    encrypt:                false,
    trustServerCertificate: true,
    connectTimeout:         30000,
    requestTimeout:         120000,
  },
  pool: {
    max: 5,
    min: 0,
    idleTimeoutMillis: 30000,
  },
};

// ── Pool de conexões (singleton com reconexão automática) ─────────────────────
let pool = null;

async function destroyPool() {
  if (pool) {
    try { await pool.close(); } catch { /* ignora */ }
    pool = null;
  }
}

async function getPool() {
  if (pool) {
    try {
      await pool.request().query("SELECT 1");
      return pool;
    } catch (e) {
      console.warn("⚠️  Pool morto (" + e.message + "), reconectando...");
      await destroyPool();
    }
  }
  console.log("🔄 Criando novo pool...");
  pool = await sql.connect(dbConfig);
  pool.on("error", async (err) => {
    console.error("❌ Erro no pool:", err.message);
    await destroyPool(); // fecha limpo e força reconexão
  });
  console.log("✅ Conectado ao SQL Server:", process.env.MSSQL_SERVER);
  return pool;
}

// ── Express ───────────────────────────────────────────────────────────────────
const app  = express();
const PORT = parseInt(process.env.PORT || "3001");

app.use(cors());
app.use(express.json());

// ── Rate limiting (sem dependência externa — sliding window por IP) ────────────
// 60 req/min por origem. Tráfego legítimo (Sofia + tela + brief) nunca chega
// perto disso; qualquer loop acidental ou varredura é barrado sem derrubar o banco.
const _rl = new Map(); // ip → [timestamps]
const RL_MAX = 60;
const RL_WIN = 60_000; // ms

setInterval(() => {
  const floor = Date.now() - RL_WIN;
  for (const [ip, hits] of _rl) {
    const fresh = hits.filter((t) => t > floor);
    if (fresh.length === 0) _rl.delete(ip);
    else _rl.set(ip, fresh);
  }
}, RL_WIN).unref();

app.use((req, res, next) => {
  if (req.method === "GET" && (req.path === "/" || req.path === "/health" || req.path === "/api/logs" || req.path === "/painel")) return next();
  const ip = (req.headers["x-forwarded-for"] ?? "").split(",")[0].trim() || req.socket?.remoteAddress || "?";
  const now = Date.now();
  const floor = now - RL_WIN;
  const hits = (_rl.get(ip) ?? []).filter((t) => t > floor);
  hits.push(now);
  _rl.set(ip, hits);
  if (hits.length > RL_MAX) {
    console.warn(`🚦 Rate limit atingido para ${ip} (${hits.length} req/min)`);
    return res.status(429).json({ error: "Muitas requisições — tente novamente em 1 minuto." });
  }
  next();
});

// ── Autenticação por API key ───────────────────────────────────────────────────
// Todos os endpoints POST exigem o header x-api-key com o valor de API_SECRET.
// O health check GET / é público (usado pelo painel admin para verificar conexão).
const API_SECRET = process.env.API_SECRET;

app.use((req, res, next) => {
  if (req.method === "GET" && (req.path === "/" || req.path === "/health" || req.path === "/api/logs" || req.path === "/painel")) return next();

  if (!API_SECRET) {
    console.warn("⚠️  API_SECRET não definido no .env — autenticação desabilitada");
    return next();
  }

  const key = req.headers["x-api-key"];
  if (key !== API_SECRET) {
    return res.status(401).json({ error: "Não autorizado" });
  }
  next();
});

// ── Health check ──────────────────────────────────────────────────────────────
app.get("/", (_req, res) => {
  res.json({ status: "ok", message: "DW API Local rodando ✅" });
});

// Health check completo (servidor + banco) — usado pela tela de status.
// Público (sem x-api-key) e com CORS liberado.
app.get("/health", async (_req, res) => {
  const started = Date.now();
  let db = false;
  try {
    const pool = await getPool();
    await pool.request().query("SELECT 1");
    db = true;
  } catch {
    db = false;
  }
  res.json({
    server: "ok",
    db,
    response_ms: Date.now() - started,
    timestamp: new Date().toISOString(),
  });
});

// ── DANFE em PDF pela chave (via MeuDanfe API v2) ─────────────────────────────
// Recebe { chave } (44 dígitos). Fluxo:
//   1. PUT /fd/add/{chave}  → busca a nota (cobra R$0,03; grátis se já adicionada)
//   2. poll do status até OK (aguardando ≥1,5s entre tentativas — <1s bloqueia a conta)
//   3. GET /fd/get/da/{chave} → DANFE em PDF (base64)
// Requer MEUDANFE_TOKEN no .env.
const MEUDANFE_BASE = "https://api.meudanfe.com.br/v2";

app.post("/nfe-danfe", async (req, res) => {
  const chave = String(req.body?.chave ?? "").replace(/\D/g, "");
  if (chave.length !== 44) {
    return res.status(400).json({ error: "Chave inválida (esperado 44 dígitos)." });
  }
  const token = process.env.MEUDANFE_TOKEN;
  if (!token) {
    return res.status(500).json({ error: "MEUDANFE_TOKEN não configurado no .env." });
  }

  const headers = { "Api-Key": token, Accept: "application/json" };

  try {
    // 1. Solicita a busca e faz poll do status (a 1ª chamada cobra; as demais, não)
    let status = null;
    let statusMessage = "";
    for (let tentativa = 0; tentativa < 20; tentativa++) {
      const r = await fetch(`${MEUDANFE_BASE}/fd/add/${chave}`, { method: "PUT", headers });
      if (r.status === 401 || r.status === 403) {
        return res.status(502).json({ error: "Api-Key do MeuDanfe inválida ou substituída." });
      }
      if (r.status === 402) {
        return res.status(402).json({ error: "Saldo insuficiente no MeuDanfe — adicione créditos." });
      }
      if (r.status === 400) {
        return res.status(400).json({ error: "Chave de acesso inválida (MeuDanfe)." });
      }
      if (!r.ok) {
        return res.status(502).json({ error: `MeuDanfe /add retornou HTTP ${r.status}.` });
      }
      const j = await r.json();
      status = j?.status;
      statusMessage = j?.statusMessage || "";
      if (status === "OK") break;
      if (status === "NOT_FOUND") {
        return res.status(404).json({ error: "Nota não encontrada na base (NOT_FOUND)." });
      }
      if (status === "ERROR") {
        return res.status(502).json({ error: `MeuDanfe retornou ERROR: ${statusMessage}` });
      }
      // WAITING / SEARCHING → aguarda e tenta de novo
      await new Promise((r2) => setTimeout(r2, 1500));
    }

    if (status !== "OK") {
      return res.status(504).json({ error: "Tempo esgotado aguardando a consulta no MeuDanfe." });
    }

    // 2. Baixa o DANFE em PDF (base64)
    const rd = await fetch(`${MEUDANFE_BASE}/fd/get/da/${chave}`, { method: "GET", headers });
    if (rd.status === 404) {
      return res.status(404).json({ error: "DANFE ainda não disponível para essa nota." });
    }
    if (!rd.ok) {
      return res.status(502).json({ error: `MeuDanfe /get/da retornou HTTP ${rd.status}.` });
    }
    const jd = await rd.json();
    if (!jd?.data) {
      return res.status(502).json({ error: "MeuDanfe não retornou o conteúdo do PDF." });
    }

    return res.json({
      ok: true,
      name: jd.name || `DANFE-${chave}.pdf`,
      pdf_base64: jd.data,
    });
  } catch (err) {
    console.error("Erro /nfe-danfe:", err.message);
    return res.status(500).json({ error: "Falha ao gerar o DANFE.", detalhe: err.message });
  }
});

// ── Consulta NFe na SEFAZ (NFeDistribuicaoDFe / consChNFe) ─────────────────────
// Dada a chave de 44 dígitos, usa o certificado A1 (.pfx) da empresa para baixar
// o XML da nota na SEFAZ e retorna os itens. Requer no .env:
//   CERT_PFX_PATH  = caminho do .pfx     |  CERT_PFX_SENHA = senha do .pfx
const CNPJ_EMPRESA = "18797307000120"; // destinatário (SGT LOG matriz)

// Busca recursiva por uma chave dentro do objeto (namespaces já removidos).
function acharChave(obj, alvo) {
  if (obj == null || typeof obj !== "object") return undefined;
  if (Object.prototype.hasOwnProperty.call(obj, alvo)) return obj[alvo];
  for (const k of Object.keys(obj)) {
    const r = acharChave(obj[k], alvo);
    if (r !== undefined) return r;
  }
  return undefined;
}

app.post("/nfe-consulta", (req, res) => {
  const chave = String(req.body?.chave ?? "").replace(/\D/g, "");
  if (chave.length !== 44) {
    return res.status(400).json({ error: "chave inválida — precisa ter 44 dígitos" });
  }

  const pfxPath  = process.env.CERT_PFX_PATH;
  const pfxSenha = process.env.CERT_PFX_SENHA;
  if (!pfxPath || !pfxSenha) {
    return res.status(500).json({ error: "certificado não configurado (CERT_PFX_PATH / CERT_PFX_SENHA no .env)" });
  }

  let pfx;
  try { pfx = fs.readFileSync(pfxPath); }
  catch (e) { return res.status(500).json({ error: "não consegui ler o certificado: " + e.message }); }

  const cUF = chave.substring(0, 2); // 2 primeiros dígitos da chave = código da UF

  const distDFeInt =
    `<distDFeInt xmlns="http://www.portalfiscal.inf.br/nfe" versao="1.01">` +
      `<tpAmb>1</tpAmb>` +
      `<cUFAutor>${cUF}</cUFAutor>` +
      `<CNPJ>${CNPJ_EMPRESA}</CNPJ>` +
      `<consChNFe><chNFe>${chave}</chNFe></consChNFe>` +
    `</distDFeInt>`;

  const soap =
    `<?xml version="1.0" encoding="utf-8"?>` +
    `<soap12:Envelope xmlns:soap12="http://www.w3.org/2003/05/soap-envelope">` +
      `<soap12:Body>` +
        `<nfeDistDFeInteresse xmlns="http://www.portalfiscal.inf.br/nfe/wsdl/NFeDistribuicaoDFe">` +
          `<nfeDadosMsg>${distDFeInt}</nfeDadosMsg>` +
        `</nfeDistDFeInteresse>` +
      `</soap12:Body>` +
    `</soap12:Envelope>`;

  const options = {
    hostname: "www1.nfe.fazenda.gov.br",
    port: 443,
    path: "/NFeDistribuicaoDFe/NFeDistribuicaoDFe.asmx",
    method: "POST",
    pfx,
    passphrase: pfxSenha,
    minVersion: "TLSv1.2",
    headers: {
      "Content-Type": "application/soap+xml; charset=utf-8",
      "Content-Length": Buffer.byteLength(soap),
    },
  };

  const sefazReq = https.request(options, (sefazRes) => {
    let body = "";
    sefazRes.setEncoding("utf-8");
    sefazRes.on("data", (d) => (body += d));
    sefazRes.on("end", () => {
      try {
        const parser = new XMLParser({ ignoreAttributes: false, removeNSPrefix: true, parseTagValue: false });
        const parsed = parser.parse(body);
        const ret = acharChave(parsed, "retDistDFeInt");
        if (!ret) {
          return res.status(502).json({ error: "resposta inesperada da SEFAZ", raw: body.slice(0, 800) });
        }
        const cStat = ret.cStat, xMotivo = ret.xMotivo;

        let docZips = acharChave(ret, "docZip");
        if (!docZips) {
          return res.json({ cStat, xMotivo, chave, encontrado: false,
            mensagem: `SEFAZ não retornou documento (cStat ${cStat}: ${xMotivo})` });
        }
        if (!Array.isArray(docZips)) docZips = [docZips];

        const documentos = [];
        for (const dz of docZips) {
          const b64 = typeof dz === "string" ? dz : dz["#text"];
          if (!b64) continue;
          let xml;
          try { xml = zlib.gunzipSync(Buffer.from(b64, "base64")).toString("utf-8"); }
          catch { continue; }
          const doc = parser.parse(xml);

          const infNFe = acharChave(doc, "infNFe");
          if (infNFe) {
            // NOTA COMPLETA — tem os itens
            let dets = infNFe.det ?? [];
            if (!Array.isArray(dets)) dets = [dets];
            documentos.push({
              tipo: "completa",
              fornecedor:      acharChave(infNFe.emit ?? {}, "xNome"),
              cnpj_fornecedor: acharChave(infNFe.emit ?? {}, "CNPJ"),
              numero_nota:     infNFe.ide?.nNF,
              data_emissao:    infNFe.ide?.dhEmi,
              valor_total:     acharChave(infNFe.total ?? {}, "vNF"),
              qtd_itens:       dets.length,
              itens: dets.map((d) => ({
                produto:     d.prod?.xProd,
                quantidade:  d.prod?.qCom,
                unidade:     d.prod?.uCom,
                valor_unit:  d.prod?.vUnCom,
                valor_total: d.prod?.vProd,
              })),
            });
            continue;
          }

          const resNFe = acharChave(doc, "resNFe");
          if (resNFe) {
            // Só o RESUMO — sem itens, mas tem fornecedor + valor total
            documentos.push({
              tipo: "resumo",
              fornecedor:      resNFe.xNome,
              cnpj_fornecedor: resNFe.CNPJ,
              data_emissao:    resNFe.dhEmi,
              valor_total:     resNFe.vNF,
              protocolo:       resNFe.nProt,
              aviso: "Só o resumo (sem itens) — nota não manifestada. Dá pra conferir fornecedor e valor total, não os itens.",
            });
          }
        }

        if (documentos.length === 0) {
          return res.json({ cStat, xMotivo, chave, encontrado: false,
            mensagem: `Documento não disponível (cStat ${cStat}: ${xMotivo})` });
        }
        return res.json({ cStat, xMotivo, chave, encontrado: true, documentos });
      } catch (e) {
        return res.status(500).json({ error: "erro ao processar resposta da SEFAZ: " + e.message, raw: body.slice(0, 800) });
      }
    });
  });
  sefazReq.on("error", (e) => res.status(502).json({ error: "erro na conexão com a SEFAZ: " + e.message }));
  sefazReq.write(soap);
  sefazReq.end();
});

// ── Notas fiscais vinculadas a uma OS ─────────────────────────────────────────
// Dado o número da OS, retorna a(s) chave(s) da(s) NFe da compra dela.
// Caminho: OS (OSEREQ.CODORD) → itens da requisição (OSEIRE) → nota (ESTENT.NFE_ID)
app.post("/dw-os-notas", async (req, res) => {
  const { ordem } = req.body ?? {};
  if (!ordem) return res.status(400).json({ error: "ordem (número da OS) é obrigatório" });
  try {
    const p = await getPool();
    const dbReq = p.request();
    dbReq.input("ordem", sql.Int, ordem);
    const result = await dbReq.query(`
      SELECT DISTINCT
        ENT.NFE_ID    AS chave,
        ENT.NUMDOC    AS numero_nota,
        ENT.CODCLIFOR AS cod_fornecedor,
        CLI.RAZSOC    AS fornecedor,
        ENT.VLRDOC    AS valor_nota
      FROM OSEIRE IRE WITH (NOLOCK)
      JOIN OSEREQ REQ WITH (NOLOCK) ON REQ.CODREQ = IRE.CODREQ
      JOIN ESTENT ENT WITH (NOLOCK) ON ENT.CODCLIFOR = IRE.CODCLIFOR AND ENT.NUMDOC = IRE.NUMDOC
      LEFT JOIN RODCLI CLI WITH (NOLOCK) ON CLI.CODCLIFOR = ENT.CODCLIFOR
      WHERE REQ.CODORD = @ordem
        AND ENT.NFE_ID IS NOT NULL AND LEN(ENT.NFE_ID) = 44
      OPTION (RECOMPILE)
    `);
    return res.json({ ordem, data: result.recordset });
  } catch (err) {
    console.error("[dw-os-notas]", err.message);
    if (err.code === "ECONNRESET" || err.code === "ECONNREFUSED") await destroyPool();
    return res.status(500).json({ error: err.message });
  }
});

// ── Endpoint principal ────────────────────────────────────────────────────────
app.post("/dw-financeiro", async (req, res) => {
  const { action, dataInicio, dataFim, filial, empresa } = req.body;

  try {
    const p = await getPool();

    // ── FILTERS ──────────────────────────────────────────────────────────────
    if (action === "filters") {
      const result = await p.request().query(`
        SELECT DISTINCT
          F.CODFIL                   AS filial_id,
          ISNULL(F.NOMEAB, F.CODFIL) AS filial_nome,
          F.CODEMP                   AS empresa_id
        FROM RODFIL F
        ORDER BY F.CODEMP, F.CODFIL
      `);

      const rows       = result.recordset;
      const empresaMap = new Map();
      const filiais    = [];

      for (const r of rows) {
        if (!empresaMap.has(r.empresa_id)) empresaMap.set(r.empresa_id, r.empresa_id);
        filiais.push({ id: r.filial_id, nome: r.filial_nome, empresa: r.empresa_id });
      }

      const empresas = Array.from(empresaMap.entries()).map(([id, nome]) => ({ id, nome }));
      return res.json({ empresas, filiais });
    }

    // ── FETCH ─────────────────────────────────────────────────────────────────
    if (action === "fetch") {
      if (!dataInicio || !dataFim) {
        return res.status(400).json({ error: "dataInicio e dataFim são obrigatórios" });
      }

      const dbReq = p.request();
      dbReq.input("dataInicio", sql.Date, new Date(dataInicio));
      dbReq.input("dataFim",    sql.Date, new Date(dataFim));
      dbReq.input("filial",     sql.VarChar(20), filial  || null);
      dbReq.input("empresa",    sql.VarChar(20), empresa || null);

      // ─────────────────────────────────────────────────────────────────────
      // NOTA DE PERFORMANCE:
      //   O OR em campos de data (DATVEN OR DATPAG) impede o uso de índice e
      //   força full table scan. A solução é dividir cada OR em dois UNION ALL
      //   separados — cada um acessa apenas um campo indexado.
      //   Regra anti-duplicata: o 2º UNION de cada bloco exclui registros cujo
      //   campo primário (DATVEN) já esteja dentro do período.
      // ─────────────────────────────────────────────────────────────────────
      const query = `

-- ═══════════════════════════════════════════════════════════════
-- UNION 1 – CONTAS A PAGAR  →  por DATVEN  (usa índice)
-- ═══════════════════════════════════════════════════════════════
SELECT
  P.DATEMI    AS DATA_EMISSAO,
  I.DATVEN    AS DATA_VENCIMENTO,
  I.DATPAG    AS DATA_PAGAMENTO,
  P.CODCLIFOR AS COD_PARCEIRO,
  C.RAZSOC    AS NOME_PARCEIRO,
  P.SERIE,
  P.NUMDOC    AS DOCUMENTO,
  I.NUMPAR    AS PARCELA,
  P.TIPDOC    AS TIPO_DOCUMENTO,
  'CP'        AS ORIGEM,
  I.SITUAC    AS SITUACAO,
  P.DESCAN,   I.DESISS,
  CAST(ROUND(I.DESADT,2) AS DECIMAL(18,2))                            AS DESADT,
  CAST(ROUND(I.VLRCOR,2) AS DECIMAL(18,2))                            AS VLRCOR,
  CAST(ROUND(I.VLRJUR,2) AS DECIMAL(18,2))                            AS VLRJUR,
  CAST(ROUND(I.VLRDES,2) AS DECIMAL(18,2))                            AS VLRDES,
  CAST(ROUND(P.VLRDOC,2) AS DECIMAL(18,2))                            AS VLRDOC,
  CAST(ROUND((RAT.VALOR/P.VLRDOC)*I.VLRLIQ,2) AS DECIMAL(18,2))      AS VLR_LIQUIDO,
  CAST(ROUND((RAT.VALOR/P.VLRDOC)*I.VLRPAG,2) AS DECIMAL(18,2))      AS VLR_PAGO,
  CAST(ROUND((RAT.VALOR/P.VLRDOC)*I.VLRPAR,2) AS DECIMAL(18,2))      AS VLR_PARCELA,
  CAST(ROUND(I.VLRPAR,2) AS DECIMAL(18,2))                            AS VLR_PAR_RAW,
  CAST(ROUND(I.VLRPAG,2) AS DECIMAL(18,2))                            AS VLR_REC_RAW,
  I.JURDOC,
  P.CODFIL    AS FILIAL,
  F.CODEMP    AS EMPRESA,
  RAT.CODCGA, CGA.DESCRI AS CENTRO_GASTO,
  RAT.CODCUS, CUS.DESCRI AS CENTRO_CUSTO,
  RAT.SINTET, CLA_SINTET.DESCRI AS SINTETICA,
  RAT.ANALIT, CLA_ANALIT.DESCRI AS ANALITICA,
  NULL                                     AS COD_CONTA,
  NULL                                     AS DATA_LANCAMENTO,
  NULL                                     AS HISTORICO,
  NULL                                     AS NOME_CONTA,
  NULL                                     AS COD_BANCO,
  NULL                                     AS NOME_BANCO,
  NULL                                     AS NUM_CHEQUE,
  NULL                                     AS NUM_AVISO,
  NULL                                     AS DATA_COMPENSACAO
FROM PAGDOCI I WITH (NOLOCK)
  LEFT JOIN PAGDOC  P  WITH (NOLOCK)  ON I.CODCLIFOR=P.CODCLIFOR AND I.SERIE=P.SERIE AND I.NUMDOC=P.NUMDOC
  LEFT JOIN PAGRAT  RAT WITH (NOLOCK) ON RAT.CODCLIFOR=P.CODCLIFOR AND RAT.SERIE=P.SERIE AND RAT.NUMDOC=P.NUMDOC
  LEFT JOIN PAGCLA  CLA_ANALIT WITH (NOLOCK) ON RAT.ANALIT=CLA_ANALIT.CODCLAP
  LEFT JOIN PAGCLA  CLA_SINTET WITH (NOLOCK) ON RAT.SINTET=CLA_SINTET.CODCLAP
  LEFT JOIN RODCUS  CUS WITH (NOLOCK)        ON RAT.CODCUS=CUS.CODCUS
  LEFT JOIN RODCGA  CGA WITH (NOLOCK)        ON RAT.CODCGA=CGA.CODCGA
  LEFT JOIN RODFIL  F   WITH (NOLOCK)        ON P.CODFIL=F.CODFIL
  LEFT JOIN RODCLI  C   WITH (NOLOCK)        ON P.CODCLIFOR=C.CODCLIFOR
WHERE I.SITUAC NOT IN ('C','I')
  AND P.VLRDOC > 0
  AND I.DOCDES IS NULL
  AND I.DATVEN BETWEEN @dataInicio AND @dataFim
  AND (@filial  IS NULL OR P.CODFIL =@filial)
  AND (@empresa IS NULL OR F.CODEMP =@empresa)

UNION ALL

-- ═══════════════════════════════════════════════════════════════
-- UNION 2 – CONTAS A PAGAR  →  por DATPAG  (usa índice)
--           Exclui registros já trazidos pelo UNION 1 (DATVEN no período)
-- ═══════════════════════════════════════════════════════════════
SELECT
  P.DATEMI    AS DATA_EMISSAO,
  I.DATVEN    AS DATA_VENCIMENTO,
  I.DATPAG    AS DATA_PAGAMENTO,
  P.CODCLIFOR AS COD_PARCEIRO,
  C.RAZSOC    AS NOME_PARCEIRO,
  P.SERIE,
  P.NUMDOC    AS DOCUMENTO,
  I.NUMPAR    AS PARCELA,
  P.TIPDOC    AS TIPO_DOCUMENTO,
  'CP'        AS ORIGEM,
  I.SITUAC    AS SITUACAO,
  P.DESCAN,   I.DESISS,
  CAST(ROUND(I.DESADT,2) AS DECIMAL(18,2))                            AS DESADT,
  CAST(ROUND(I.VLRCOR,2) AS DECIMAL(18,2))                            AS VLRCOR,
  CAST(ROUND(I.VLRJUR,2) AS DECIMAL(18,2))                            AS VLRJUR,
  CAST(ROUND(I.VLRDES,2) AS DECIMAL(18,2))                            AS VLRDES,
  CAST(ROUND(P.VLRDOC,2) AS DECIMAL(18,2))                            AS VLRDOC,
  CAST(ROUND((RAT.VALOR/P.VLRDOC)*I.VLRLIQ,2) AS DECIMAL(18,2))      AS VLR_LIQUIDO,
  CAST(ROUND((RAT.VALOR/P.VLRDOC)*I.VLRPAG,2) AS DECIMAL(18,2))      AS VLR_PAGO,
  CAST(ROUND((RAT.VALOR/P.VLRDOC)*I.VLRPAR,2) AS DECIMAL(18,2))      AS VLR_PARCELA,
  CAST(ROUND(I.VLRPAR,2) AS DECIMAL(18,2))                            AS VLR_PAR_RAW,
  CAST(ROUND(I.VLRPAG,2) AS DECIMAL(18,2))                            AS VLR_REC_RAW,
  I.JURDOC,
  P.CODFIL    AS FILIAL,
  F.CODEMP    AS EMPRESA,
  RAT.CODCGA, CGA.DESCRI AS CENTRO_GASTO,
  RAT.CODCUS, CUS.DESCRI AS CENTRO_CUSTO,
  RAT.SINTET, CLA_SINTET.DESCRI AS SINTETICA,
  RAT.ANALIT, CLA_ANALIT.DESCRI AS ANALITICA,
  NULL                                     AS COD_CONTA,
  NULL                                     AS DATA_LANCAMENTO,
  NULL                                     AS HISTORICO,
  NULL                                     AS NOME_CONTA,
  NULL                                     AS COD_BANCO,
  NULL                                     AS NOME_BANCO,
  NULL                                     AS NUM_CHEQUE,
  NULL                                     AS NUM_AVISO,
  NULL                                     AS DATA_COMPENSACAO
FROM PAGDOCI I WITH (NOLOCK)
  LEFT JOIN PAGDOC  P  WITH (NOLOCK)  ON I.CODCLIFOR=P.CODCLIFOR AND I.SERIE=P.SERIE AND I.NUMDOC=P.NUMDOC
  LEFT JOIN PAGRAT  RAT WITH (NOLOCK) ON RAT.CODCLIFOR=P.CODCLIFOR AND RAT.SERIE=P.SERIE AND RAT.NUMDOC=P.NUMDOC
  LEFT JOIN PAGCLA  CLA_ANALIT WITH (NOLOCK) ON RAT.ANALIT=CLA_ANALIT.CODCLAP
  LEFT JOIN PAGCLA  CLA_SINTET WITH (NOLOCK) ON RAT.SINTET=CLA_SINTET.CODCLAP
  LEFT JOIN RODCUS  CUS WITH (NOLOCK)        ON RAT.CODCUS=CUS.CODCUS
  LEFT JOIN RODCGA  CGA WITH (NOLOCK)        ON RAT.CODCGA=CGA.CODCGA
  LEFT JOIN RODFIL  F   WITH (NOLOCK)        ON P.CODFIL=F.CODFIL
  LEFT JOIN RODCLI  C   WITH (NOLOCK)        ON P.CODCLIFOR=C.CODCLIFOR
WHERE I.SITUAC NOT IN ('C','I')
  AND P.VLRDOC > 0
  AND I.DOCDES IS NULL
  AND I.DATPAG BETWEEN @dataInicio AND @dataFim
  AND (I.DATVEN IS NULL OR I.DATVEN NOT BETWEEN @dataInicio AND @dataFim)
  AND (@filial  IS NULL OR P.CODFIL =@filial)
  AND (@empresa IS NULL OR F.CODEMP =@empresa)

UNION ALL

-- ═══════════════════════════════════════════════════════════════
-- UNION 2B – CONTAS A PAGAR  →  por DATEMI (emissão)
--            Captura documentos EMITIDOS no período cujo vencimento
--            e pagamento estão FORA do range (indicadores usam DATEMI)
-- ═══════════════════════════════════════════════════════════════
SELECT
  P.DATEMI    AS DATA_EMISSAO,
  I.DATVEN    AS DATA_VENCIMENTO,
  I.DATPAG    AS DATA_PAGAMENTO,
  P.CODCLIFOR AS COD_PARCEIRO,
  C.RAZSOC    AS NOME_PARCEIRO,
  P.SERIE,
  P.NUMDOC    AS DOCUMENTO,
  I.NUMPAR    AS PARCELA,
  P.TIPDOC    AS TIPO_DOCUMENTO,
  'CP'        AS ORIGEM,
  I.SITUAC    AS SITUACAO,
  P.DESCAN,   I.DESISS,
  CAST(ROUND(I.DESADT,2) AS DECIMAL(18,2))                            AS DESADT,
  CAST(ROUND(I.VLRCOR,2) AS DECIMAL(18,2))                            AS VLRCOR,
  CAST(ROUND(I.VLRJUR,2) AS DECIMAL(18,2))                            AS VLRJUR,
  CAST(ROUND(I.VLRDES,2) AS DECIMAL(18,2))                            AS VLRDES,
  CAST(ROUND(P.VLRDOC,2) AS DECIMAL(18,2))                            AS VLRDOC,
  CAST(ROUND((RAT.VALOR/P.VLRDOC)*I.VLRLIQ,2) AS DECIMAL(18,2))      AS VLR_LIQUIDO,
  CAST(ROUND((RAT.VALOR/P.VLRDOC)*I.VLRPAG,2) AS DECIMAL(18,2))      AS VLR_PAGO,
  CAST(ROUND((RAT.VALOR/P.VLRDOC)*I.VLRPAR,2) AS DECIMAL(18,2))      AS VLR_PARCELA,
  CAST(ROUND(I.VLRPAR,2) AS DECIMAL(18,2))                            AS VLR_PAR_RAW,
  CAST(ROUND(I.VLRPAG,2) AS DECIMAL(18,2))                            AS VLR_REC_RAW,
  I.JURDOC,
  P.CODFIL    AS FILIAL,
  F.CODEMP    AS EMPRESA,
  RAT.CODCGA, CGA.DESCRI AS CENTRO_GASTO,
  RAT.CODCUS, CUS.DESCRI AS CENTRO_CUSTO,
  RAT.SINTET, CLA_SINTET.DESCRI AS SINTETICA,
  RAT.ANALIT, CLA_ANALIT.DESCRI AS ANALITICA,
  NULL                                     AS COD_CONTA,
  NULL                                     AS DATA_LANCAMENTO,
  NULL                                     AS HISTORICO,
  NULL                                     AS NOME_CONTA,
  NULL                                     AS COD_BANCO,
  NULL                                     AS NOME_BANCO,
  NULL                                     AS NUM_CHEQUE,
  NULL                                     AS NUM_AVISO,
  NULL                                     AS DATA_COMPENSACAO
FROM PAGDOCI I WITH (NOLOCK)
  LEFT JOIN PAGDOC  P  WITH (NOLOCK)  ON I.CODCLIFOR=P.CODCLIFOR AND I.SERIE=P.SERIE AND I.NUMDOC=P.NUMDOC
  LEFT JOIN PAGRAT  RAT WITH (NOLOCK) ON RAT.CODCLIFOR=P.CODCLIFOR AND RAT.SERIE=P.SERIE AND RAT.NUMDOC=P.NUMDOC
  LEFT JOIN PAGCLA  CLA_ANALIT WITH (NOLOCK) ON RAT.ANALIT=CLA_ANALIT.CODCLAP
  LEFT JOIN PAGCLA  CLA_SINTET WITH (NOLOCK) ON RAT.SINTET=CLA_SINTET.CODCLAP
  LEFT JOIN RODCUS  CUS WITH (NOLOCK)        ON RAT.CODCUS=CUS.CODCUS
  LEFT JOIN RODCGA  CGA WITH (NOLOCK)        ON RAT.CODCGA=CGA.CODCGA
  LEFT JOIN RODFIL  F   WITH (NOLOCK)        ON P.CODFIL=F.CODFIL
  LEFT JOIN RODCLI  C   WITH (NOLOCK)        ON P.CODCLIFOR=C.CODCLIFOR
WHERE I.SITUAC NOT IN ('C','I')
  AND P.VLRDOC > 0
  AND I.DOCDES IS NULL
  AND P.DATEMI BETWEEN @dataInicio AND @dataFim
  AND (I.DATVEN IS NULL OR I.DATVEN NOT BETWEEN @dataInicio AND @dataFim)
  AND (I.DATPAG IS NULL OR I.DATPAG NOT BETWEEN @dataInicio AND @dataFim)
  AND (@filial  IS NULL OR P.CODFIL =@filial)
  AND (@empresa IS NULL OR F.CODEMP =@empresa)

UNION ALL

-- ═══════════════════════════════════════════════════════════════
-- UNION 3 – CONTAS A RECEBER  →  por DATVEN  (usa índice)
-- ═══════════════════════════════════════════════════════════════
SELECT
  P.DATEMI    AS DATA_EMISSAO,
  I.DATVEN    AS DATA_VENCIMENTO,
  I.DATREC    AS DATA_PAGAMENTO,
  P.CODCLIFOR AS COD_PARCEIRO,
  C.RAZSOC    AS NOME_PARCEIRO,
  NULL        AS SERIE,
  P.NUMDUP    AS DOCUMENTO,
  I.NUMPAR    AS PARCELA,
  P.TIPDOC    AS TIPO_DOCUMENTO,
  'CR'        AS ORIGEM,
  I.SITUAC    AS SITUACAO,
  P.DESCAN,   NULL AS DESISS,
  CAST(ROUND(I.DESADT,2) AS DECIMAL(18,2))                               AS DESADT,
  CAST(ROUND(I.VLRCOR,2) AS DECIMAL(18,2))                               AS VLRCOR,
  CAST(ROUND(I.VLRJUR,2) AS DECIMAL(18,2))                               AS VLRJUR,
  CAST(ROUND(I.VLRDES,2) AS DECIMAL(18,2))                               AS VLRDES,
  CAST(ROUND(P.VALDUP,2) AS DECIMAL(18,2))                               AS VLRDOC,
  CAST(ROUND((RAT.VALOR/P.VALDUP)*I.VLRLIQ,            2) AS DECIMAL(18,2)) AS VLR_LIQUIDO,
  CAST(ROUND((RAT.VALOR/P.VALDUP)*(I.VLRREC+I.DESADT), 2) AS DECIMAL(18,2)) AS VLR_PAGO,
  CAST(ROUND((RAT.VALOR/P.VALDUP)*I.VLRPAR,            2) AS DECIMAL(18,2)) AS VLR_PARCELA,
  CAST(ROUND(I.VLRPAR,                                  2) AS DECIMAL(18,2)) AS VLR_PAR_RAW,
  CAST(ROUND(I.VLRREC+I.DESADT,                         2) AS DECIMAL(18,2)) AS VLR_REC_RAW,
  NULL AS JURDOC,
  P.CODFIL    AS FILIAL,
  F.CODEMP    AS EMPRESA,
  RAT.CODCGA, CGA.DESCRI AS CENTRO_GASTO,
  RAT.CODCUS, CUS.DESCRI AS CENTRO_CUSTO,
  RAT.SINTET, CLA_SINTET.DESCRI AS SINTETICA,
  RAT.ANALIT, CLA_ANALIT.DESCRI AS ANALITICA,
  NULL                                     AS COD_CONTA,
  NULL                                     AS DATA_LANCAMENTO,
  NULL                                     AS HISTORICO,
  NULL                                     AS NOME_CONTA,
  NULL                                     AS COD_BANCO,
  NULL                                     AS NOME_BANCO,
  NULL                                     AS NUM_CHEQUE,
  NULL                                     AS NUM_AVISO,
  NULL                                     AS DATA_COMPENSACAO
FROM RECDOCI I WITH (NOLOCK)
  LEFT JOIN RECDOC  P   WITH (NOLOCK) ON I.NUMDUP=P.NUMDUP
  LEFT JOIN RECRAT  RAT WITH (NOLOCK) ON RAT.NUMDUP=P.NUMDUP
  LEFT JOIN PAGCLA  CLA_ANALIT WITH (NOLOCK) ON RAT.ANALIT=CLA_ANALIT.CODCLAP
  LEFT JOIN PAGCLA  CLA_SINTET WITH (NOLOCK) ON RAT.SINTET=CLA_SINTET.CODCLAP
  LEFT JOIN RODCUS  CUS WITH (NOLOCK)        ON RAT.CODCUS=CUS.CODCUS
  LEFT JOIN RODCGA  CGA WITH (NOLOCK)        ON RAT.CODCGA=CGA.CODCGA
  LEFT JOIN RODFIL  F   WITH (NOLOCK)        ON P.CODFIL=F.CODFIL
  LEFT JOIN RODCLI  C   WITH (NOLOCK)        ON P.CODCLIFOR=C.CODCLIFOR
WHERE I.SITUAC NOT IN ('C','I')
  AND P.VALDUP > 0
  AND I.DATVEN BETWEEN @dataInicio AND @dataFim
  AND (@filial  IS NULL OR P.CODFIL =@filial)
  AND (@empresa IS NULL OR F.CODEMP =@empresa)

UNION ALL

-- ═══════════════════════════════════════════════════════════════
-- UNION 4 – CONTAS A RECEBER  →  por DATREC  (usa índice)
--           Exclui registros já trazidos pelo UNION 3 (DATVEN no período)
-- ═══════════════════════════════════════════════════════════════
SELECT
  P.DATEMI    AS DATA_EMISSAO,
  I.DATVEN    AS DATA_VENCIMENTO,
  I.DATREC    AS DATA_PAGAMENTO,
  P.CODCLIFOR AS COD_PARCEIRO,
  C.RAZSOC    AS NOME_PARCEIRO,
  NULL        AS SERIE,
  P.NUMDUP    AS DOCUMENTO,
  I.NUMPAR    AS PARCELA,
  P.TIPDOC    AS TIPO_DOCUMENTO,
  'CR'        AS ORIGEM,
  I.SITUAC    AS SITUACAO,
  P.DESCAN,   NULL AS DESISS,
  CAST(ROUND(I.DESADT,2) AS DECIMAL(18,2))                               AS DESADT,
  CAST(ROUND(I.VLRCOR,2) AS DECIMAL(18,2))                               AS VLRCOR,
  CAST(ROUND(I.VLRJUR,2) AS DECIMAL(18,2))                               AS VLRDES,
  CAST(ROUND(I.VLRDES,2) AS DECIMAL(18,2))                               AS VLRDES,
  CAST(ROUND(P.VALDUP,2) AS DECIMAL(18,2))                               AS VLRDOC,
  CAST(ROUND((RAT.VALOR/P.VALDUP)*I.VLRLIQ,            2) AS DECIMAL(18,2)) AS VLR_LIQUIDO,
  CAST(ROUND((RAT.VALOR/P.VALDUP)*(I.VLRREC+I.DESADT), 2) AS DECIMAL(18,2)) AS VLR_PAGO,
  CAST(ROUND((RAT.VALOR/P.VALDUP)*I.VLRPAR,            2) AS DECIMAL(18,2)) AS VLR_PARCELA,
  CAST(ROUND(I.VLRPAR,                                  2) AS DECIMAL(18,2)) AS VLR_PAR_RAW,
  CAST(ROUND(I.VLRREC+I.DESADT,                         2) AS DECIMAL(18,2)) AS VLR_REC_RAW,
  NULL AS JURDOC,
  P.CODFIL    AS FILIAL,
  F.CODEMP    AS EMPRESA,
  RAT.CODCGA, CGA.DESCRI AS CENTRO_GASTO,
  RAT.CODCUS, CUS.DESCRI AS CENTRO_CUSTO,
  RAT.SINTET, CLA_SINTET.DESCRI AS SINTETICA,
  RAT.ANALIT, CLA_ANALIT.DESCRI AS ANALITICA,
  NULL                                     AS COD_CONTA,
  NULL                                     AS DATA_LANCAMENTO,
  NULL                                     AS HISTORICO,
  NULL                                     AS NOME_CONTA,
  NULL                                     AS COD_BANCO,
  NULL                                     AS NOME_BANCO,
  NULL                                     AS NUM_CHEQUE,
  NULL                                     AS NUM_AVISO,
  NULL                                     AS DATA_COMPENSACAO
FROM RECDOCI I WITH (NOLOCK)
  LEFT JOIN RECDOC  P   WITH (NOLOCK) ON I.NUMDUP=P.NUMDUP
  LEFT JOIN RECRAT  RAT WITH (NOLOCK) ON RAT.NUMDUP=P.NUMDUP
  LEFT JOIN PAGCLA  CLA_ANALIT WITH (NOLOCK) ON RAT.ANALIT=CLA_ANALIT.CODCLAP
  LEFT JOIN PAGCLA  CLA_SINTET WITH (NOLOCK) ON RAT.SINTET=CLA_SINTET.CODCLAP
  LEFT JOIN RODCUS  CUS WITH (NOLOCK)        ON RAT.CODCUS=CUS.CODCUS
  LEFT JOIN RODCGA  CGA WITH (NOLOCK)        ON RAT.CODCGA=CGA.CODCGA
  LEFT JOIN RODFIL  F   WITH (NOLOCK)        ON P.CODFIL=F.CODFIL
  LEFT JOIN RODCLI  C   WITH (NOLOCK)        ON P.CODCLIFOR=C.CODCLIFOR
WHERE I.SITUAC NOT IN ('C','I')
  AND P.VALDUP > 0
  AND I.DATREC BETWEEN @dataInicio AND @dataFim
  AND (I.DATVEN IS NULL OR I.DATVEN NOT BETWEEN @dataInicio AND @dataFim)
  AND (@filial  IS NULL OR P.CODFIL =@filial)
  AND (@empresa IS NULL OR F.CODEMP =@empresa)

UNION ALL

-- ═══════════════════════════════════════════════════════════════
-- UNION 5 – LANÇAMENTOS BANCÁRIOS DÉBITO
-- ═══════════════════════════════════════════════════════════════
SELECT
  B.DATDOC AS DATA_EMISSAO,
  B.DATCOM AS DATA_VENCIMENTO,
  B.DATCOM AS DATA_PAGAMENTO,
  B.CODCLIFOR AS COD_PARCEIRO,
  NULL AS NOME_PARCEIRO,
  NULL AS SERIE,
  B.NUMDOC AS DOCUMENTO,
  NULL AS PARCELA,
  B.TIPDOC AS TIPO_DOCUMENTO,
  'LB_D' AS ORIGEM,
  B.SITUAC AS SITUACAO,
  NULL AS DESCAN, NULL AS DESISS,
  NULL AS DESADT,
  NULL AS VLRCOR, NULL AS VLRJUR, NULL AS VLRDES,
  CAST(ROUND(B.VLRDOC,2) AS DECIMAL(18,2)) AS VLRDOC,
  NULL AS VLR_LIQUIDO,
  CAST(ROUND((RAT.VALOR/B.VLRDOC)*CASE WHEN B.DATCOM IS NULL THEN 0 ELSE B.VLRDOC END,2) AS DECIMAL(18,2)) AS VLR_PAGO,
  CAST(ROUND((RAT.VALOR/B.VLRDOC)*CASE WHEN B.DATCOM IS NULL THEN 0 ELSE B.VLRDOC END,2) AS DECIMAL(18,2)) AS VLR_PARCELA,
  NULL AS VLR_PAR_RAW,
  NULL AS VLR_REC_RAW,
  NULL AS JURDOC,
  B.CODFIL AS FILIAL,
  F.CODEMP AS EMPRESA,
  RAT.CODCGA, CGA.DESCRI AS CENTRO_GASTO,
  RAT.CODCUS, CUS.DESCRI AS CENTRO_CUSTO,
  RAT.SINTET, CLA_SINTET.DESCRI AS SINTETICA,
  RAT.ANALIT, CLA_ANALIT.DESCRI AS ANALITICA,
  B.CODCTA   AS COD_CONTA,
  B.DATDOC   AS DATA_LANCAMENTO,
  H.DESCRI   AS HISTORICO,
  NULL       AS NOME_CONTA,
  NULL       AS COD_BANCO,
  NULL       AS NOME_BANCO,
  NULL       AS NUM_CHEQUE,
  NULL       AS NUM_AVISO,
  B.DATCOM   AS DATA_COMPENSACAO
FROM BANRAZ B WITH (NOLOCK)
  LEFT JOIN BANHIS  H   WITH (NOLOCK) ON H.CODHISBC=B.CODHISBC
  LEFT JOIN BANRNF  N   WITH (NOLOCK) ON N.ID_RAZ=B.ID_RAZ
  LEFT JOIN BANRAT  RAT WITH (NOLOCK) ON RAT.NUMDOC=B.NUMDOC AND RAT.CODCTA=B.CODCTA AND RAT.CODFIL=B.CODFIL AND RAT.ID_RAZ=B.ID_RAZ
  LEFT JOIN PAGCLA  CLA_ANALIT WITH (NOLOCK) ON CLA_ANALIT.CODCLAP=RAT.ANALIT
  LEFT JOIN PAGCLA  CLA_SINTET WITH (NOLOCK) ON CLA_SINTET.CODCLAP=RAT.SINTET
  LEFT JOIN RODCUS  CUS WITH (NOLOCK)        ON RAT.CODCUS=CUS.CODCUS
  LEFT JOIN RODCGA  CGA WITH (NOLOCK)        ON RAT.CODCGA=CGA.CODCGA
  LEFT JOIN RODFIL  F   WITH (NOLOCK)        ON B.CODFIL=F.CODFIL
WHERE H.TRANSF='N' AND B.ORIGEM='LB' AND B.CODFIL=F.CODFIL AND B.SITUAC='O' AND B.VLRDOC>0
  AND B.CODCTA NOT IN ('BX-FORNEC')
  AND B.TIPDOC NOT IN ('ADF','ADL','TRA','ADC')
  AND B.DEBCRE='D'
  AND B.DATDOC BETWEEN @dataInicio AND @dataFim
  AND (@filial  IS NULL OR B.CODFIL =@filial)
  AND (@empresa IS NULL OR F.CODEMP =@empresa)

UNION ALL

-- ═══════════════════════════════════════════════════════════════
-- UNION 6 – LANÇAMENTOS BANCÁRIOS CRÉDITO
-- ═══════════════════════════════════════════════════════════════
SELECT
  B.DATDOC AS DATA_EMISSAO,
  B.DATCOM AS DATA_VENCIMENTO,
  B.DATCOM AS DATA_PAGAMENTO,
  B.CODCLIFOR AS COD_PARCEIRO,
  NULL AS NOME_PARCEIRO,
  NULL AS SERIE,
  B.NUMDOC AS DOCUMENTO,
  NULL AS PARCELA,
  B.TIPDOC AS TIPO_DOCUMENTO,
  'LB_C' AS ORIGEM,
  B.SITUAC AS SITUACAO,
  NULL AS DESCAN, NULL AS DESISS,
  NULL AS DESADT,
  NULL AS VLRCOR, NULL AS VLRJUR, NULL AS VLRDES,
  CAST(ROUND(B.VLRDOC,2) AS DECIMAL(18,2)) AS VLRDOC,
  NULL AS VLR_LIQUIDO,
  CAST(ROUND((RAT.VALOR/B.VLRDOC)*CASE WHEN B.DATCOM IS NULL THEN 0 ELSE B.VLRDOC END,2) AS DECIMAL(18,2)) AS VLR_PAGO,
  CAST(ROUND((RAT.VALOR/B.VLRDOC)*CASE WHEN B.DATCOM IS NULL THEN 0 ELSE B.VLRDOC END,2) AS DECIMAL(18,2)) AS VLR_PARCELA,
  NULL AS VLR_PAR_RAW,
  NULL AS VLR_REC_RAW,
  NULL AS JURDOC,
  B.CODFIL AS FILIAL,
  F.CODEMP AS EMPRESA,
  RAT.CODCGA, CGA.DESCRI AS CENTRO_GASTO,
  RAT.CODCUS, CUS.DESCRI AS CENTRO_CUSTO,
  RAT.SINTET, CLA_SINTET.DESCRI AS SINTETICA,
  RAT.ANALIT, CLA_ANALIT.DESCRI AS ANALITICA,
  B.CODCTA   AS COD_CONTA,
  B.DATDOC   AS DATA_LANCAMENTO,
  H.DESCRI   AS HISTORICO,
  NULL       AS NOME_CONTA,
  NULL       AS COD_BANCO,
  NULL       AS NOME_BANCO,
  NULL       AS NUM_CHEQUE,
  NULL       AS NUM_AVISO,
  B.DATCOM   AS DATA_COMPENSACAO
FROM BANRAZ B WITH (NOLOCK)
  LEFT JOIN BANHIS  H   WITH (NOLOCK) ON H.CODHISBC=B.CODHISBC
  LEFT JOIN BANRNF  N   WITH (NOLOCK) ON N.ID_RAZ=B.ID_RAZ
  LEFT JOIN BANRAT  RAT WITH (NOLOCK) ON RAT.NUMDOC=B.NUMDOC AND RAT.CODCTA=B.CODCTA AND RAT.CODFIL=B.CODFIL AND RAT.ID_RAZ=B.ID_RAZ
  LEFT JOIN PAGCLA  CLA_ANALIT WITH (NOLOCK) ON CLA_ANALIT.CODCLAP=RAT.ANALIT
  LEFT JOIN PAGCLA  CLA_SINTET WITH (NOLOCK) ON CLA_SINTET.CODCLAP=RAT.SINTET
  LEFT JOIN RODCUS  CUS WITH (NOLOCK)        ON RAT.CODCUS=CUS.CODCUS
  LEFT JOIN RODCGA  CGA WITH (NOLOCK)        ON RAT.CODCGA=CGA.CODCGA
  LEFT JOIN RODFIL  F   WITH (NOLOCK)        ON B.CODFIL=F.CODFIL
WHERE H.TRANSF='N' AND B.ORIGEM='LB' AND B.CODFIL=F.CODFIL AND B.SITUAC='O' AND B.VLRDOC>0
  AND B.CODCTA NOT IN ('BX-FORNEC')
  AND B.TIPDOC NOT IN ('ADF','ADL','TRA','ADC')
  AND B.DEBCRE='C'
  AND B.DATDOC BETWEEN @dataInicio AND @dataFim
  AND (@filial  IS NULL OR B.CODFIL =@filial)
  AND (@empresa IS NULL OR F.CODEMP =@empresa)
      OPTION (RECOMPILE)
      `;

      const result = await dbReq.query(query);
      return res.json({ data: result.recordset });
    }

    // ── FATURAMENTO ───────────────────────────────────────────────────────────
    if (action === "faturamento") {
      if (!dataInicio || !dataFim) {
        return res.status(400).json({ error: "dataInicio e dataFim são obrigatórios" });
      }

      const dbReq = p.request();
      dbReq.timeout = 30000;
      dbReq.input("dataInicio", sql.DateTime, new Date(dataInicio));
      dbReq.input("dataFim",    sql.DateTime, new Date(dataFim));

      const query = `
        SELECT
          SUM(T.TOTFRE)                                                  AS FRETE_TOTAL,
          ISNULL(CGR.DESCRI, 'Sem grupo')                                AS DESCRI,
          SUM(T.TOTFRE) * 100.0
            / NULLIF(SUM(SUM(T.TOTFRE)) OVER (), 0)                     AS PERCENTUAL
        FROM VW_FAT_ICMS T WITH (NOLOCK)
          LEFT JOIN RODCLI CLI WITH (NOLOCK) ON T.CODCLIFOR = CLI.CODCLIFOR
          LEFT JOIN RODCGR CGR WITH (NOLOCK) ON CLI.CODCGR  = CGR.CODCGR
        WHERE T.DATA >= @dataInicio
          AND T.DATA <  DATEADD(day, 1, @dataFim)
        GROUP BY CGR.DESCRI
        ORDER BY FRETE_TOTAL DESC
        OPTION (RECOMPILE)
      `;

      const result = await dbReq.query(query);
      return res.json({ data: result.recordset });
    }

    return res.status(400).json({ error: "action inválida. Use 'fetch', 'filters' ou 'faturamento'" });

  } catch (err) {
    console.error("❌ Erro:", err.message);
    if (err.code === "ECONNRESET" || err.code === "ECONNABORTED" || err.message?.includes("ECONN")) {
      console.warn("🔄 ECONNRESET detectado — destruindo pool para reconexão na próxima chamada");
      await destroyPool();
    }
    return res.status(500).json({ error: err.message, code: err.code ?? null });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
//  ENDPOINT: /dw-manutencao
// ─────────────────────────────────────────────────────────────────────────────
app.post("/dw-manutencao", async (req, res) => {
  const { dataInicio, dataFim, filial, veiculo, ordem } = req.body;

  try {
    const p     = await getPool();
    const dbReq = p.request();

    // Ao buscar uma OS específica, ignora a janela de data (pode ser antiga).
    const dInicio = ordem ? new Date("2000-01-01")
                          : (dataInicio ? new Date(dataInicio) : new Date("2024-01-01"));
    const dFim    = dataFim ? new Date(dataFim) : new Date();

    dbReq.input("dataInicio", sql.Date, dInicio);
    dbReq.input("dataFim",    sql.Date, dFim);
    dbReq.input("filial",     sql.VarChar(20), filial || null);
    dbReq.input("veiculo",    sql.VarChar(20), veiculo || null);
    dbReq.input("ordem",      sql.Int,         ordem || null);

    const query = `
SELECT
    ORD.CODFIL               AS filial,
    ORD.CODORD               AS ordem,
    CASE ORD.TIPORD
        WHEN '2' THEN 'SERVICOEXTERNO'
        WHEN '1' THEN 'SERVICOINTERNO'
    END                      AS tiposervico,
    CASE ORD.SITUAC
        WHEN 'I' THEN 'INCONSISTENTE'
        WHEN 'A' THEN 'ANDAMENTO'
        WHEN 'C' THEN 'CANCELADO'
        WHEN 'O' THEN 'CONCLUIDO'
    END                      AS situacao,
    MOT.NOMMOT               AS motorista,
    CON.DESCRI               AS conjunto,
    FUN.NOMFUN               AS funcionario,
    SETO.DESCRI              AS setor,
    CMO.DESCRI               AS classificacao,
    IRE.CODPROD              AS codigoprod,
    CASE PRO.TIPPRO
        WHEN 'S' THEN 'SERVICO'
        WHEN 'P' THEN 'PRODUTO'
        WHEN 'I' THEN 'PRODUTOGARANTIA'
        WHEN 'E' THEN 'PLANOMANUTENCAO'
    END                      AS tipoprod,
    PRO.DESCRI               AS produto,
    SGP.DESCRI               AS subgrupo,
    CONVERT(INT, IRE.QUANTI) AS qtd,
    IRE.PRECUS               AS custo,
    ORD.DATBAI               AS baixa,
    UPPER(CLI.RAZSOC)        AS fornecedor,
    ORD.SOLICI               AS solicitacao,
    ORD.OBSERV               AS observacao,
    ORD.CODVEI               AS veiculo,
    ORD.DATREF               AS dataordem,
    ORD.HORCUS               AS valormo,
    ORD.HORCU2               AS valormo2,
    ORD.REQCUS               AS valorpc,
    ORD.REQCU2               AS valorpc2
FROM OSEORD ORD WITH (NOLOCK)
LEFT JOIN OSEREQ  REQ  WITH (NOLOCK) ON  ORD.CODORD    = REQ.CODORD
                                     AND ORD.CODFIL    = REQ.ORDFIL
LEFT JOIN RODCLI  CLI  WITH (NOLOCK) ON  ORD.CODCLIFOR = CLI.CODCLIFOR
LEFT JOIN OSEIRE  IRE  WITH (NOLOCK) ON  REQ.CODREQ    = IRE.CODREQ
                                     AND REQ.CODFIL    = IRE.CODFIL
LEFT JOIN ESTPRO  PRO  WITH (NOLOCK) ON  IRE.CODPROD   = PRO.CODPROD
LEFT JOIN ESTSGP  SGP  WITH (NOLOCK) ON  PRO.CODSGP    = SGP.CODSGP
LEFT JOIN RODMOT  MOT  WITH (NOLOCK) ON  ORD.CODMOT    = MOT.CODMOT
LEFT JOIN OSECON  CON  WITH (NOLOCK) ON  ORD.CODCON    = CON.CODCON
LEFT JOIN OSEFUN  FUN  WITH (NOLOCK) ON  ORD.CODFUN    = FUN.CODFUN
LEFT JOIN OSESET  SETO WITH (NOLOCK) ON  ORD.CODSET    = SETO.CODSET
LEFT JOIN RODCMO  CMO  WITH (NOLOCK) ON  ORD.CODCMO    = CMO.CODCMO
WHERE
    ORD.DATREF BETWEEN @dataInicio AND @dataFim
    AND ORD.SITUAC NOT IN ('C')
    AND (@filial  IS NULL OR ORD.CODFIL = @filial)
    AND (@veiculo IS NULL OR ORD.CODVEI = @veiculo)
    AND (@ordem   IS NULL OR ORD.CODORD = @ordem)
OPTION (RECOMPILE)
    `;

    const result = await dbReq.query(query);
    return res.json({ data: result.recordset });

  } catch (err) {
    console.error("❌ Erro /dw-manutencao:", err.message);
    if (err.code === "ECONNRESET" || err.code === "ECONNABORTED" || err.message?.includes("ECONN")) {
      await destroyPool();
    }
    return res.status(500).json({ error: err.message, code: err.code ?? null });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
//  ENDPOINT: /dw-frota
// ─────────────────────────────────────────────────────────────────────────────
app.post("/dw-frota", async (req, res) => {
  const { situacao } = req.body ?? {};

  try {
    const p     = await getPool();
    const dbReq = p.request();

    let situacaoFiltro = null;
    if (situacao === "ATIVO")   situacaoFiltro = 1;
    if (situacao === "BAIXADO") situacaoFiltro = 2;
    if (situacao === "INATIVO") situacaoFiltro = 0;

    dbReq.input("situacao", sql.Int, situacaoFiltro);

    const query = `
SELECT
    V.CODVEI                 AS codvei,
    V.CHASSI                 AS chassi,
    V.TIPVEI                 AS tipvei,
    F.CODFRO                 AS codfro,
    F.DESCRI                 AS frota,
    M.CODMCV                 AS codmcv,
    M.DESCRI                 AS marca,
    D.CODMDV                 AS codmdv,
    D.DESCRI                 AS modelo,
    V.CODMUN                 AS codmun,
    N.DESCRI                 AS municipio,
    CASE
        WHEN V.SITUAC = 1 THEN 'ATIVO'
        WHEN V.SITUAC = 2 THEN 'BAIXADO'
        ELSE 'INATIVO'
    END                      AS situacao,
    O.CODCMO                 AS codcmo,
    O.DESCRI                 AS classificacao,
    V.ANOFAB                 AS anofab,
    V.ANOMOD                 AS anomod,
    V.TIPCAR                 AS tipcar,
    V.NUMEIX                 AS numeix,
    V.ALTURA                 AS altura,
    V.LARGUR                 AS largur,
    V.COMPRI                 AS compri,
    V.QTDLIT                 AS qtdlit,
    V.TARAKG                 AS tarakg,
    V.LOTACA                 AS lotaca,
    V.PESBRU                 AS pesbru,
    V.QTDPNE                 AS qtdpne,
    V.PROPRI                 AS propri,
    V.DATINC                 AS datinc
FROM  dbo.RODVEI  AS V  WITH (NOLOCK)
INNER JOIN dbo.RODFRO AS F  WITH (NOLOCK) ON V.CODFRO = F.CODFRO
INNER JOIN dbo.RODMCV AS M  WITH (NOLOCK) ON V.CODMCV = M.CODMCV
INNER JOIN dbo.RODMDV AS D  WITH (NOLOCK) ON V.CODMDV = D.CODMDV
LEFT  JOIN dbo.RODCMO AS O  WITH (NOLOCK) ON V.CODCMO = O.CODCMO
INNER JOIN dbo.RODMUN AS N  WITH (NOLOCK) ON V.CODMUN = N.CODMUN
WHERE (@situacao IS NULL OR V.SITUAC = @situacao)
OPTION (RECOMPILE)
    `;

    const result = await dbReq.query(query);
    return res.json({ data: result.recordset });

  } catch (err) {
    console.error("❌ Erro /dw-frota:", err.message);
    if (err.code === "ECONNRESET" || err.code === "ECONNABORTED" || err.message?.includes("ECONN")) {
      await destroyPool();
    }
    return res.status(500).json({ error: err.message, code: err.code ?? null });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
//  ENDPOINT: /dw-compras
//  Parâmetros opcionais (body JSON):
//    dataInicio  {string}  YYYY-MM-DD  → filtro em ENT.DATREF  (opcional)
//    dataFim     {string}  YYYY-MM-DD  → filtro em ENT.DATREF  (opcional)
//  Sem datas informadas retorna todos os registros (respeita filtros do WHERE original)
// ─────────────────────────────────────────────────────────────────────────────
app.post("/dw-compras", async (req, res) => {
  const { dataInicio, dataFim } = req.body ?? {};

  try {
    const p     = await getPool();
    const dbReq = p.request();

    dbReq.input("dataInicio", sql.Date, dataInicio ? new Date(dataInicio) : null);
    dbReq.input("dataFim",    sql.Date, dataFim    ? new Date(dataFim)    : null);

    const query = `
SELECT DISTINCT
    SGP.DESCRI               AS sub_grupo,
    SGP.CODSGP               AS codsgp,
    ENT.TIPONF               AS tiponf,
    ENT.SERIE                AS serie,
    ENT.DATREF               AS data_compra,
    PNF.NUMPED               AS pedido,
    ENT.NUMDOC               AS nota_fiscal,
    ENT.SITUAC               AS situac,
    CUS.CODCUS               AS codcus,
    CUS.DESCRI               AS centro_custo,
    GRP.CODGPP               AS codgpp,
    GRP.DESCRI               AS grupo,
    PRO.CODPROD              AS codprod,
    PRO.DESCRI               AS produto,
    AIE.QTDENT               AS quantidade,
    AIE.VLRUNI               AS valor_un,
    ENT.CODCLIFOR            AS codclifor,
    CLI.RAZSOC               AS fornecedor,
    ENT.NFE_ID		     AS Chave
FROM ESTAIE AIE WITH (NOLOCK)
LEFT JOIN ESTENT ENT WITH (NOLOCK) ON  AIE.CODCLIFOR = ENT.CODCLIFOR
                                   AND AIE.TIPONF    = ENT.TIPONF
                                   AND AIE.SERIE     = ENT.SERIE
                                   AND AIE.NUMDOC    = ENT.NUMDOC
LEFT JOIN ESTPRO PRO WITH (NOLOCK) ON  AIE.CODPROD   = PRO.CODPROD
LEFT JOIN ESTPNF PNF WITH (NOLOCK) ON  AIE.CODCLIFOR = PNF.CODCLIFOR
                                   AND AIE.TIPONF    = PNF.TIPONF
                                   AND AIE.SERIE     = PNF.SERIE
                                   AND AIE.NUMPED    = PNF.NUMPED
                                   AND AIE.NUMDOC    = PNF.NUMDOC
LEFT JOIN RODCLI CLI WITH (NOLOCK) ON  AIE.CODCLIFOR = CLI.CODCLIFOR
LEFT JOIN PAGRAT RAT WITH (NOLOCK) ON  ENT.CODCLIFOR = RAT.CODCLIFOR
                                   AND ENT.SERIE     = RAT.SERIE
                                   AND ENT.NUMDOC    = RAT.NUMDOC
LEFT JOIN RODCUS CUS WITH (NOLOCK) ON  RAT.CODCUS    = CUS.CODCUS
LEFT JOIN ESTGRP GRP WITH (NOLOCK) ON  PRO.CODGPP    = GRP.CODGPP
LEFT JOIN ESTSGP SGP WITH (NOLOCK) ON  PRO.CODSGP    = SGP.CODSGP
WHERE
    ENT.TIPONF NOT IN ('NFF', 'NSS')
    AND ENT.SITUAC <> 'C'
    AND (@dataInicio IS NULL OR ENT.DATREF >= @dataInicio)
    AND (@dataFim    IS NULL OR ENT.DATREF <= @dataFim)
OPTION (RECOMPILE)
    `;

    const result = await dbReq.query(query);
    return res.json({ data: result.recordset });

  } catch (err) {
    console.error("❌ Erro /dw-compras:", err.message);
    if (err.code === "ECONNRESET" || err.code === "ECONNABORTED" || err.message?.includes("ECONN")) {
      await destroyPool();
    }
    return res.status(500).json({ error: err.message, code: err.code ?? null });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// ENDPOINT: /dw-rh
//
// INSTRUÇÕES:
//   1. Copie o bloco abaixo e cole no server.js junto com os outros app.post().
//   2. Reinicie o servidor via INICIAR-SERVIDOR.bat.
//
// PARÂMETROS recebidos no body (POST):
//   situacao  : string | null   "ATIVO" | "INATIVO" | null (null = todos)
// ─────────────────────────────────────────────────────────────────────────────

app.post("/dw-rh", async (req, res) => {
  const query = `
    SELECT
      CODMOT                  AS codmot,
      NOMMOT                  AS motorista,
      DTNASC                  AS data_nascimento,
      NATUR2                  AS nacionalidade,
      ESTADO                  AS estado,
      ENDERE                  AS endereco,
      BAIRRO                  AS bairro,
      CARTHA                  AS habilitacao,
      CARTUF                  AS uf_habilitacao,
      CATECH                  AS categoria_habilitacao,
      VENCHA                  AS validade_habilitacao,
      NUMERG                  AS numero_rg,
      DATARG                  AS data_emissao_rg,
      NUMCPF                  AS numero_cpf,
      EMPREG                  AS empregado,
      CODFOL                  AS codigo_folha,
      CODFIL                  AS codigo_filial,
      DATADM                  AS data_admissao,
      DATBAI                  AS data_demissao,
      MOTBAI                  AS motivo_demissao,
      SITUAC                  AS situacao,
      FUNCAO                  AS funcao,
      TIPMOT                  AS tipo_funcionario,
      SEXO                    AS sexo
    FROM RODMOT WITH (NOLOCK)
    OPTION (RECOMPILE)
  `;

  try {
    const pool   = await getPool();
    const result = await pool.request().query(query);
    return res.json({ data: result.recordset });
  } catch (err) {
    console.error("[dw-rh] Erro:", err.message);
    if (err.code === "ECONNRESET" || err.code === "ECONNREFUSED") {
      await destroyPool();
    }
    return res.status(500).json({ error: err.message });
  }
});
// ─────────────────────────────────────────────────────────────────────────────
// ENDPOINT: /dw-operacional
//
// INSTRUÇÕES:
//   1. Copie o bloco abaixo e cole no server.js junto com os outros app.post().
//   2. Reinicie o servidor via INICIAR-SERVIDOR.bat.
//
// SEM parâmetros de entrada — retorna snapshot em tempo real da VRMON_VEICULO.
// ─────────────────────────────────────────────────────────────────────────────

app.post("/dw-operacional", async (req, res) => {
  const query = `
    SELECT
      ID,
      CODCLI,
      CLI_NOMEAB,
      CODMOT,
      MOT_NOMEAB              AS motorista,
      CODVEI                  AS veiculo,
      VEI_LATITU              AS latitude,
      VEI_LONGIT              AS longitude,
      VEI_REFERE              AS referencia,
      CODVEI2                 AS veiculo2,
      CODVEI3                 AS veiculo3,
      TIPDOC                  AS tipo_documento,
      CODDOC                  AS codigo_documento,
      SERDOC                  AS serie_documento,
      FILDOC                  AS filial_documento,
      CODREM                  AS cod_remetente,
      REM_NOMEAB              AS remetente,
      CODDES                  AS cod_destinatario,
      DES_NOMEAB              AS destinatario,
      DATSAI_ORIGINAL         AS data_saida_original,
      DATSAI_REAL             AS data_saida_real,
      PERC_COMPLETO           AS percentual_completo,
      PREV_CHEGADA            AS previsao_chegada,
      SITUAC_VIAGEM           AS situacao_viagem,
      DOC_DESCRI              AS descricao_documento,
      SITUAC_DESCRI           AS descricao_situacao,
      ORIGEM_DESCRI           AS descricao_origem,
      DESTINO_DESCRI          AS descricao_destino,
      REM_LATITU              AS latitude_remetente,
      REM_LONGIT              AS longitude_remetente,
      DES_LATITU              AS latitude_destinatario,
      DES_LONGIT              AS longitude_destinatario,
      ITEM_TOTAL              AS total_itens,
      ITEM_REAL               AS itens_real,
      CLASSI_VEI              AS classificacao_veiculo,
      SITCAR                  AS situacao_veiculo,
      EM_MANUTENCAO           AS em_manutencao
    FROM VRMON_VEICULO WITH (NOLOCK)
    OPTION (RECOMPILE)
  `;

  try {
    const pool = await getPool();
    const result = await pool.request().query(query);
    return res.json({ data: result.recordset });
  } catch (err) {
    console.error("[dw-operacional] Erro:", err.message);
    if (err.code === "ECONNRESET" || err.code === "ECONNREFUSED") {
      await destroyPool();
    }
    return res.status(500).json({ error: err.message });
  }
});
// ─────────────────────────────────────────────────────────────────────────────
// ENDPOINT: /dw-abastecimento
//
// INSTRUÇÕES:
//   1. Copie o bloco abaixo e cole no server.js, junto com os outros app.post().
//   2. Reinicie o servidor via INICIAR-SERVIDOR.bat.
//
// PARÂMETROS recebidos no body (POST):
//   dataInicio  : string  "YYYY-MM-DD"  (opcional)
//   dataFim     : string  "YYYY-MM-DD"  (opcional)
// ─────────────────────────────────────────────────────────────────────────────

app.post("/dw-abastecimento", async (req, res) => {
  const { dataInicio, dataFim } = req.body ?? {};

  const query = `
    SELECT
      ABA.CODABA                AS codaba,
      MOT.NOMMOT                AS motorista,
      POS.DESCRI                AS posto,
      POS.CODPON                AS codpon,
      POS.ESTADO                AS estado,
      ABA.VLRTOT                AS vlrtot,
      ABA.QUANTI                AS quanti,
      ABA.DATREF                AS datref,
      ABA.NUMDOC                AS numdoc,
      VEI.CODVEI                AS veiculo,
      MCV.DESCRI                AS marca,
      MDV.DESCRI                AS modelo,
      LIN.CODLIN                AS linha,
      ABA.MEDIA                 AS media,
      ABA.ULTKMT                AS ultkmt,
      ABA.ATUKMT                AS atukmt,
      VEI.MEDFAB                AS medfab,
      VEI.ODOHOR                AS odohor,
      FRO.DESCRI                AS frota,
      ABA.CODCMB                AS codigo_combustivel,
      GAS.DESCRI                AS tipo_combustivel,
      ABA.NUMCPA                AS nota_fiscal
    FROM RODABA ABA WITH (NOLOCK)
    LEFT JOIN RODVEI VEI WITH (NOLOCK) ON ABA.PLACA   = VEI.CODVEI
    LEFT JOIN RODMOT MOT WITH (NOLOCK) ON ABA.CODMOT  = MOT.CODMOT
    LEFT JOIN RODLIN LIN WITH (NOLOCK) ON ABA.CODLIN  = LIN.CODLIN
    LEFT JOIN RODPOS POS WITH (NOLOCK) ON ABA.CODPON  = POS.CODPON
    LEFT JOIN RODGAS GAS WITH (NOLOCK) ON ABA.CODCMB  = GAS.CODCMB
    LEFT JOIN RODMDV MDV WITH (NOLOCK) ON VEI.CODMDV  = MDV.CODMDV
    LEFT JOIN RODMCV MCV WITH (NOLOCK) ON VEI.CODMCV  = MCV.CODMCV
    LEFT JOIN RODFRO FRO WITH (NOLOCK) ON VEI.CODFRO  = FRO.CODFRO
    WHERE VEI.TIPVEI IN (1, 2, 3, 7, 8, 12)
      AND (@dataInicio IS NULL OR ABA.DATREF >= @dataInicio)
      AND (@dataFim    IS NULL OR ABA.DATREF <= @dataFim)
    OPTION (RECOMPILE)
  `;

  try {
    const pool = await getPool();
    const request = pool.request();
    request.input("dataInicio", sql.Date, dataInicio ? new Date(dataInicio) : null);
    request.input("dataFim",    sql.Date, dataFim    ? new Date(dataFim)    : null);

    const result = await request.query(query);
    return res.json({ data: result.recordset });
  } catch (err) {
    console.error("[dw-abastecimento] Erro:", err.message);
    if (err.code === "ECONNRESET" || err.code === "ECONNREFUSED") {
      await destroyPool();
    }
    return res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
//  ENDPOINT: /dw-posto-interno
//  Razão de estoque de diesel (CODPROD=881) da ESTRAZ.
//  Retorna movimentações do período + saldo_atual_litros (registro mais recente).
//
//  Parâmetros opcionais (body JSON):
//    dataInicio  {string}  YYYY-MM-DD  (default: 1/jan do ano corrente)
//    dataFim     {string}  YYYY-MM-DD  (default: hoje)
// ─────────────────────────────────────────────────────────────────────────────
app.post("/dw-posto-interno", async (req, res) => {
  const { dataInicio, dataFim } = req.body ?? {};

  try {
    const p    = await getPool();
    const hoje = new Date();
    const dFim = dataFim    ? new Date(dataFim)    : hoje;
    const dIni = dataInicio ? new Date(dataInicio)
                            : new Date(dFim.getFullYear(), 0, 1); // 1/jan padrão

    const dbReq = p.request();
    dbReq.input("dataInicio", sql.Date, dIni);
    dbReq.input("dataFim",    sql.Date, dFim);

    const query = `
SELECT
    RAZ.ID_RAZ                                                        AS id_raz,
    RAZ.NUMDOC                                                        AS numdoc,
    RAZ.DATA                                                          AS data,
    RAZ.QTDADE                                                        AS qtdade,
    RAZ.VALOR                                                         AS valor,
    CASE WHEN RAZ.ENTSAI = 'S' THEN 'SAIDA' ELSE 'ENTRADA' END       AS tipo,
    RAZ.FISANT                                                        AS saldo_anterior,
    RAZ.SALFIS                                                        AS saldo_atual,
    RAZ.CODPROD                                                       AS produto,
    CASE WHEN RAZ.QTDADE > 0 THEN RAZ.VALOR / RAZ.QTDADE ELSE 0 END  AS vl_unit,
    RAZ.CODCLIFOR                                                     AS codfornec,
    CLI.RAZSOC                                                        AS fornecedor,
    RAZ.CODVEI                                                        AS veiculo,
    RAZ.TIPONF                                                        AS tipo_nf
FROM ESTRAZ RAZ
LEFT OUTER JOIN RODCLI CLI ON RAZ.CODCLIFOR = CLI.CODCLIFOR
WHERE RAZ.CODPROD = 881
  AND RAZ.DATA >= @dataInicio
  AND RAZ.DATA <  DATEADD(DAY, 1, @dataFim)   -- inclui o dia inteiro do dataFim (DATA tem hora)
ORDER BY RAZ.DATA DESC, RAZ.ID_RAZ DESC, RAZ.ENTSAI DESC
OPTION (RECOMPILE)
    `;

    const result = await dbReq.query(query);

    // Saldo = SALFIS do registro mais recente do período (já vem ordenado DESC)
    // Se o período não tem registros na ESTRAZ → null (exibido como —)
    const saldo_atual_litros = result.recordset.length > 0
      ? (result.recordset[0].saldo_atual ?? null)
      : null;

    return res.json({ data: result.recordset, saldo_atual_litros });

  } catch (err) {
    console.error("[dw-posto-interno] Erro:", err.message);
    if (err.code === "ECONNRESET" || err.code === "ECONNREFUSED") {
      await destroyPool();
    }
    return res.status(500).json({ error: err.message });
  }
});

app.post("/dw-faturamento-resumo", async (_req, res) => {
  try {
    const p = await getPool();
    const dbReq = p.request();
    dbReq.timeout = 30000;

    const query = `
      WITH latest_date AS (
        SELECT MAX(T.DATA) AS reference_date
        FROM VW_FAT_ICMS T WITH (NOLOCK)
        WHERE T.DATA IS NOT NULL
      ),
      daily_total AS (
        SELECT
          CAST(T.DATA AS DATE) AS reference_date,
          SUM(T.TOTFRE) AS daily_revenue
        FROM VW_FAT_ICMS T WITH (NOLOCK)
        INNER JOIN latest_date L
          ON CAST(T.DATA AS DATE) = CAST(L.reference_date AS DATE)
        GROUP BY CAST(T.DATA AS DATE)
      ),
      monthly_total AS (
        SELECT
          DATEFROMPARTS(YEAR(L.reference_date), MONTH(L.reference_date), 1) AS reference_month,
          SUM(T.TOTFRE) AS monthly_revenue
        FROM VW_FAT_ICMS T WITH (NOLOCK)
        CROSS JOIN latest_date L
        WHERE T.DATA >= DATEFROMPARTS(YEAR(L.reference_date), MONTH(L.reference_date), 1)
          AND T.DATA < DATEADD(MONTH, 1, DATEFROMPARTS(YEAR(L.reference_date), MONTH(L.reference_date), 1))
        GROUP BY DATEFROMPARTS(YEAR(L.reference_date), MONTH(L.reference_date), 1)
      )
      SELECT
        L.reference_date,
        D.daily_revenue,
        M.reference_month,
        M.monthly_revenue
      FROM latest_date L
      LEFT JOIN daily_total D
        ON D.reference_date = CAST(L.reference_date AS DATE)
      LEFT JOIN monthly_total M
        ON M.reference_month = DATEFROMPARTS(YEAR(L.reference_date), MONTH(L.reference_date), 1);
    `;

    const result = await dbReq.query(query);
    const row = result.recordset?.[0];

    if (!row) {
      return res.json({
        daily_revenue: { valid: false, error: "consulta sem dados" },
        monthly_revenue: { valid: false, error: "consulta sem dados" },
      });
    }

    return res.json({
      daily_revenue: {
        reference_date: row.reference_date ?? null,
        revenue_value: row.daily_revenue ?? null,
        valid: row.reference_date != null && row.daily_revenue != null,
        error: row.reference_date != null && row.daily_revenue != null ? null : "faturamento diario incompleto",
      },
      monthly_revenue: {
        reference_month: row.reference_month ?? null,
        revenue_value: row.monthly_revenue ?? null,
        valid: row.reference_month != null && row.monthly_revenue != null,
        error: row.reference_month != null && row.monthly_revenue != null ? null : "faturamento mensal incompleto",
      },
    });
  } catch (err) {
    console.error("[dw-faturamento-resumo] Erro:", err.message);
    if (err.code === "ECONNRESET" || err.code === "ECONNABORTED" || err.message?.includes("ECONN")) {
      await destroyPool();
    }

    return res.status(500).json({
      daily_revenue: { valid: false, error: err.message, code: err.code ?? null },
      monthly_revenue: { valid: false, error: err.message, code: err.code ?? null },
    });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
//  ENDPOINT: /dw-financiamento-frota
//  Retorna TODAS as parcelas de contratos de financiamento de frota.
//  Filtragem de período é feita NO CLIENTE (preserva window fn TOTAL_PARCELAS).
//
//  Parâmetros opcionais (body JSON):
//    filial   : string | null  → filtra por D.CODFIL
//    banco    : string | null  → filtra por T.DESCRI (LIKE)
//    situacao : string | null  → ex: "A" (aberto) | "L" (liquidado)
//

// ─────────────────────────────────────────────────────────────────────────────
// ENDPOINT: /dw-bancos
// Retorna saldos e movimentação por conta bancária no período.
// Tenta enriquecer com BANCAD (cadastro); se não existir, usa apenas BANRAZ.
// ─────────────────────────────────────────────────────────────────────────────
app.post("/dw-bancos", async (req, res) => {
  const { filial, empresa, dataInicio, dataFim } = req.body ?? {};

  try {
    const p    = await getPool();
    const hoje = new Date();
    const di   = dataInicio ? new Date(dataInicio) : new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    const df   = dataFim    ? new Date(dataFim)    : hoje;

    // ═══════════════════════════════════════════════════════════════════════
    // QUERY 1 — Cadastro de contas (BANCTA)
    // Filtra apenas contas com banco real (CODBCO preenchido).
    // Carteiras internas têm CODBCO nulo/vazio e são excluídas aqui.
    // ═══════════════════════════════════════════════════════════════════════
    const q1 = p.request();
    q1.input("filial",  sql.VarChar(20), filial  || null);
    q1.input("empresa", sql.VarChar(20), empresa || null);

    const rCadastro = await q1.query(`
      SELECT
        CA.CODCTA                                           AS cod_conta,
        CA.CODFIL                                           AS filial,
        CA.DESCRI                                           AS nome_conta,
        ISNULL(CA.NUMAGC,'')                                AS agencia,
        ISNULL(CA.CODBCO,'')                                AS cod_banco,
        ISNULL(BC.DESCRI, ISNULL(CA.CODBCO,''))            AS nome_banco,
        ISNULL(F.CODEMP,'')                                 AS empresa,
        ISNULL(F.NOMEAB, CAST(CA.CODFIL AS VARCHAR(20)))    AS nome_filial
      FROM BANCTA CA WITH (NOLOCK)
        LEFT JOIN RODBCO BC WITH (NOLOCK) ON BC.CODBCO = CA.CODBCO
        LEFT JOIN RODFIL  F  WITH (NOLOCK) ON F.CODFIL  = CA.CODFIL
      WHERE UPPER(CA.SITUAC) = 'A'
        AND CA.CODBCO IS NOT NULL
        AND LTRIM(RTRIM(CA.CODBCO)) <> ''
        AND LTRIM(RTRIM(CA.CODBCO)) <> '0'
        AND (@filial  IS NULL OR CA.CODFIL = @filial)
        AND (@empresa IS NULL OR F.CODEMP  = @empresa)
    `);

    // ═══════════════════════════════════════════════════════════════════════
    // QUERY 2 — Movimentação do PERÍODO (BANRAZ puro, SEM join com BANCTA)
    // Separado do cadastro para não excluir lançamentos cuja conta existe em
    // BANRAZ mas tem CODBCO diferente ou nulo em BANCTA.
    // ═══════════════════════════════════════════════════════════════════════
    const q2 = p.request();
    q2.input("dataInicio", sql.Date, di);
    q2.input("dataFim",    sql.Date, df);
    q2.input("filial",     sql.VarChar(20), filial  || null);
    q2.input("empresa",    sql.VarChar(20), empresa || null);

    const rMov = await q2.query(`
      SELECT
        B.CODCTA,
        B.CODFIL,
        CAST(SUM(CASE WHEN B.DEBCRE = 'C' THEN B.VLRDOC ELSE 0 END) AS DECIMAL(18,2)) AS entradas_mes,
        CAST(SUM(CASE WHEN B.DEBCRE = 'D' THEN B.VLRDOC ELSE 0 END) AS DECIMAL(18,2)) AS saidas_mes
      FROM BANRAZ B WITH (NOLOCK)
        LEFT JOIN RODFIL F WITH (NOLOCK) ON F.CODFIL = B.CODFIL
      WHERE B.SITUAC NOT IN ('C')
        AND B.VLRDOC > 0
        AND B.DATDOC BETWEEN @dataInicio AND @dataFim
        AND (@filial  IS NULL OR B.CODFIL = @filial)
        AND (@empresa IS NULL OR F.CODEMP = @empresa)
      GROUP BY B.CODCTA, B.CODFIL
    `);

    const movMap = new Map();
    for (const r of rMov.recordset)
      movMap.set(`${r.CODFIL}:${r.CODCTA}`, r);

    // ═══════════════════════════════════════════════════════════════════════
    // QUERY 3 — Saldo anterior
    // Estratégia em cascata:
    //   A) BANCTA → campo de saldo armazenado (SALDOAT, SALDOA, SALDBA, etc.)
    //   B) BANRAZ → acumulado dos últimos 5 anos (fallback)
    // ═══════════════════════════════════════════════════════════════════════
    const saldoMap = new Map();
    let saldoSource = 'banraz_5anos';

    // ── A) BANCTA.SLDATU — saldo atual armazenado (campo confirmado no BD) ──
    try {
      const rB = await p.request().query(`
        SELECT CODCTA, CODFIL, ISNULL(SLDATU, 0) AS saldo FROM BANCTA WITH (NOLOCK)
      `);
      if (rB.recordset.length > 0) {
        for (const r of rB.recordset)
          saldoMap.set(`${r.CODFIL}:${r.CODCTA}`, parseFloat(r.saldo) || 0);
        saldoSource = 'BANCTA.SLDATU';
      }
    } catch (_) { /* campo não acessível — cai no fallback */ }

    // ── B) BANRAZ acumulado — últimos 5 anos (fallback) ──────────────────
    if (!saldoSource.startsWith('BANCTA.')) {
      const limiteAnt = new Date(di.getFullYear() - 5, di.getMonth(), di.getDate());
      const qC = p.request();
      qC.input("dataInicio", sql.Date, di);
      qC.input("limiteAnt",  sql.Date, limiteAnt);
      qC.input("filial",     sql.VarChar(20), filial  || null);
      qC.input("empresa",    sql.VarChar(20), empresa || null);

      const rC = await qC.query(`
        SELECT B.CODCTA, B.CODFIL,
          CAST(SUM(CASE WHEN B.DEBCRE='C' THEN B.VLRDOC ELSE -B.VLRDOC END) AS DECIMAL(18,2)) AS saldo_anterior
        FROM BANRAZ B WITH (NOLOCK)
          LEFT JOIN RODFIL F WITH (NOLOCK) ON F.CODFIL = B.CODFIL
        WHERE B.SITUAC NOT IN ('C')
          AND B.VLRDOC  > 0
          AND B.DATDOC >= @limiteAnt
          AND B.DATDOC <  @dataInicio
          AND (@filial  IS NULL OR B.CODFIL = @filial)
          AND (@empresa IS NULL OR F.CODEMP = @empresa)
        GROUP BY B.CODCTA, B.CODFIL
      `);
      for (const r of rC.recordset)
        saldoMap.set(`${r.CODFIL}:${r.CODCTA}`, parseFloat(r.saldo_anterior) || 0);
    }

    console.log(`[/dw-bancos] saldoSource=${saldoSource} | contas_cadastro=${rCadastro.recordset.length} | movimentos_periodo=${rMov.recordset.length}`);

    // ═══════════════════════════════════════════════════════════════════════
    // MERGE: Cadastro + Movimentos + Saldo
    // ═══════════════════════════════════════════════════════════════════════
    const contas = rCadastro.recordset.map(ca => {
      const key = `${ca.filial}:${ca.cod_conta}`;
      const mov = movMap.get(key) ?? { entradas_mes: 0, saidas_mes: 0 };
      const ent = parseFloat(mov.entradas_mes) || 0;
      const sai = parseFloat(mov.saidas_mes)   || 0;

      let saldoAnt = parseFloat(saldoMap.get(key)) || 0;
      // Se saldo veio de BANCTA.campo = saldo atual do cadastro (não anterior)
      // Retroage: saldo_anterior = saldo_atual_cadastro - entradas + saidas
      if (saldoSource.startsWith('BANCTA.')) {
        saldoAnt = saldoAnt - ent + sai;
      }

      return {
        cod_conta:      ca.cod_conta,
        nome_conta:     ca.nome_conta,
        agencia:        ca.agencia,
        num_conta:      ca.cod_conta,
        cod_banco:      ca.cod_banco,
        nome_banco:     ca.nome_banco,
        tipo_conta:     'CC',
        filial:         ca.filial,
        empresa:        ca.empresa,
        nome_filial:    ca.nome_filial,
        saldo_anterior: saldoAnt,
        saldo_atual:    saldoAnt + ent - sai,
        entradas_mes:   ent,
        saidas_mes:     sai,
      };
    });

    const resultado = contas
      .filter(c => c.entradas_mes !== 0 || c.saidas_mes !== 0 || c.saldo_atual !== 0 || c.saldo_anterior !== 0)
      .sort((a, b) => b.saldo_atual - a.saldo_atual);

    return res.json({
      data: resultado,
      _meta: {
        saldoSource,
        contas_cadastro:   rCadastro.recordset.length,
        movimentos_periodo: rMov.recordset.length,
        periodoInicio: di,
        periodoFim:    df,
      }
    });

  } catch (err) {
    console.error("[/dw-bancos]", err);
    return res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// ENDPOINT: /dw-bancos-extrato
// Retorna lançamentos de uma conta bancária específica no período.
// Query independente do /dw-financeiro — usa SITUAC NOT IN ('C') para
// capturar tanto lançamentos abertos (O) quanto efetivados/compensados (E).
// ─────────────────────────────────────────────────────────────────────────────
app.post("/dw-bancos-extrato", async (req, res) => {
  const { codcta, codfil, filial, empresa, dataInicio, dataFim } = req.body ?? {};

  if (!codcta) return res.status(400).json({ error: "codcta obrigatório" });

  try {
    const p    = await getPool();
    const hoje = new Date();
    const di   = dataInicio ? new Date(dataInicio) : new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    const df   = dataFim    ? new Date(dataFim)    : hoje;

    const q = p.request();
    q.input("codcta",     sql.VarChar(30), codcta);
    q.input("codfil",     sql.Int,         codfil    || null);
    q.input("filial",     sql.VarChar(20), filial    || null);
    q.input("empresa",    sql.VarChar(20), empresa   || null);
    q.input("dataInicio", sql.Date,        di);
    q.input("dataFim",    sql.Date,        df);

    const result = await q.query(`
      SELECT
        B.CODCTA                             AS COD_CONTA,
        B.CODFIL                             AS FILIAL,
        B.NUMDOC                             AS DOCUMENTO,
        B.TIPDOC                             AS TIPO_DOCUMENTO,
        B.DEBCRE,
        B.VLRDOC,
        B.DATDOC                             AS DATA_LANCAMENTO,
        B.DATCOM                             AS DATA_COMPENSACAO,
        ISNULL(H.DESCRI, '')                 AS HISTORICO,
        ISNULL(RAT.CODCUS, '')               AS CODCUS,
        ISNULL(CUS.DESCRI, '')               AS CENTRO_CUSTO,
        ISNULL(RAT.ANALIT, '')               AS CODANALIT,
        ISNULL(CLA.DESCRI, '')               AS ANALITICA,
        CASE WHEN B.DEBCRE = 'C' THEN 'LB_C' ELSE 'LB_D' END AS ORIGEM,
        B.SITUAC                             AS SITUACAO
      FROM BANRAZ B WITH (NOLOCK)
        LEFT JOIN BANHIS  H   WITH (NOLOCK) ON H.CODHISBC = B.CODHISBC
        LEFT JOIN BANRAT  RAT WITH (NOLOCK) ON RAT.NUMDOC = B.NUMDOC
                                            AND RAT.CODCTA = B.CODCTA
                                            AND RAT.CODFIL = B.CODFIL
                                            AND RAT.ID_RAZ = B.ID_RAZ
        LEFT JOIN RODCUS  CUS WITH (NOLOCK) ON CUS.CODCUS = RAT.CODCUS
        LEFT JOIN PAGCLA  CLA WITH (NOLOCK) ON CLA.CODCLAP = RAT.ANALIT
        LEFT JOIN RODFIL  F   WITH (NOLOCK) ON F.CODFIL  = B.CODFIL
      WHERE B.CODCTA  = @codcta
        AND B.SITUAC NOT IN ('C')
        AND B.VLRDOC > 0
        AND B.DATDOC BETWEEN @dataInicio AND @dataFim
        AND (@codfil  IS NULL OR B.CODFIL = @codfil)
        AND (@filial  IS NULL OR B.CODFIL = @filial)
        AND (@empresa IS NULL OR F.CODEMP = @empresa)
      ORDER BY B.DATDOC DESC, B.NUMDOC DESC
    `);

    return res.json({ data: result.recordset, total: result.recordset.length });
  } catch (err) {
    console.error("[/dw-bancos-extrato]", err);
    return res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// ENDPOINT: /dw-financiamento-frota
//  Estrutura de joins (SQL corrigido):
//    PAGDOCI I  → parcelas (tem DATVEN = data de vencimento)
//    PAGDOC  D  → cabeçalho do documento (tem NUMCTF, VLRDOC, SITUAC, etc.)
//    PATBAT  B  → bem patrimonial / veículo adquirido
//    RODVEI  V  → cadastro do veículo
//    PAGCON  P  → contrato financeiro (tem CODTAR → banco)
//    RODTAR  T  → tabela de tarifas/banco (DESCRI = nome do banco)
//    RODFRO  F  → frota do veículo
// ─────────────────────────────────────────────────────────────────────────────
app.post("/dw-financiamento-frota", async (req, res) => {
  const { filial, banco, situacao } = req.body ?? {};

  try {
    const p     = await getPool();
    const dbReq = p.request();

    dbReq.input("filial",   sql.VarChar(20), filial   || null);
    dbReq.input("banco",    sql.VarChar(80), banco    || null);
    dbReq.input("situacao", sql.VarChar(5),  situacao || null);

    const query = `
-- Parte de PAGDOC (1 linha por parcela) e usa OUTER APPLY para buscar
-- apenas 1 linha de PAGDOCI por NUMDOC — evita duplicatas do join direto.
WITH FINANCIAMENTOS AS (
    SELECT
        D.DATREF                                                                        AS data_referencia,
        I.DATVEN                                                                        AS data_vencimento,
        P.NUMCON                                                                        AS contrato,
        B.NOTFIS                                                                        AS nota,
        B.VLRBRU                                                                        AS valor_aquisicao,
        P.VLRCON                                                                        AS valor_contrato,
        TRY_CAST(RIGHT(D.NUMDOC, 2) AS INT)                                             AS parcela_atual,
        TRY_CAST(MAX(RIGHT(D.NUMDOC, 2)) OVER (PARTITION BY D.NUMCTF) AS INT)           AS total_parcelas,
        D.TIPDOC                                                                        AS tipo,
        D.CODFIL                                                                        AS filial,
        T.DESCRI                                                                        AS banco,
        V.CODVEI                                                                        AS veiculo,
        F.DESCRI                                                                        AS frota,
        V.ANOMOD                                                                        AS anomod,
        V.ANOFAB                                                                        AS anofab,
        V.CHASSI                                                                        AS chassi,
        D.SITUAC                                                                        AS situacao,
        D.VLRDOC                                                                        AS valor_parcela,
        I.VLRPAR                                                                        AS valor_parcela_base,
        D.VLRJUR                                                                        AS juros,
        D.VLRDES                                                                        AS valor_desconto,
        D.VLRLIQ                                                                        AS vlrliq,
        D.VLRPAG                                                                        AS valor_pago
    FROM PAGDOC  D WITH (NOLOCK)
    OUTER APPLY (
        SELECT TOP 1
            I2.DATVEN,
            I2.VLRPAR
        FROM PAGDOCI I2 WITH (NOLOCK)
        WHERE I2.NUMDOC = D.NUMDOC
        ORDER BY I2.DATVEN
    ) I
    INNER JOIN PATBAT  B WITH (NOLOCK) ON D.NUMCTF  = B.NUMCON
    INNER JOIN RODVEI  V WITH (NOLOCK) ON B.CODVEI  = V.CODVEI
    LEFT  JOIN PAGCON  P WITH (NOLOCK) ON B.NUMCON  = P.CODIGO
    INNER JOIN RODTAR  T WITH (NOLOCK) ON P.CODTAR  = T.CODTAR
    INNER JOIN RODFRO  F WITH (NOLOCK) ON V.CODFRO  = F.CODFRO
    WHERE ISNULL(D.NUMCTF, '') <> ''
      AND (@filial   IS NULL OR D.CODFIL = @filial)
      AND (@banco    IS NULL OR T.DESCRI LIKE '%' + @banco + '%')
      AND (@situacao IS NULL OR D.SITUAC = @situacao)
)
SELECT
    data_referencia,
    data_vencimento,
    contrato,
    nota,
    valor_aquisicao,
    valor_contrato,
    parcela_atual,
    total_parcelas,
    tipo,
    filial,
    banco,
    veiculo,
    frota,
    anomod,
    anofab,
    chassi,
    situacao,
    valor_parcela,
    valor_parcela_base,
    juros,
    valor_desconto,
    vlrliq,
    valor_pago
FROM FINANCIAMENTOS
ORDER BY banco, veiculo, parcela_atual
OPTION (RECOMPILE)
    `;

    const result = await dbReq.query(query);
    return res.json({ data: result.recordset });

  } catch (err) {
    console.error("❌ Erro /dw-financiamento-frota:", err.message);
    if (err.code === "ECONNRESET" || err.code === "ECONNABORTED" || err.message?.includes("ECONN")) {
      await destroyPool();
    }
    return res.status(500).json({ error: err.message, code: err.code ?? null });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
//  ENDPOINT: /dw-consulta-nfe
//  Conciliação das NF-e destinadas ao CNPJ (NFEIDIST).
//  LANÇADA ou não vem do flag do próprio Rodopar: NFEIDIST.SITUAC_VR
//    (1 = lançada no VR, 0/null = não lançada) — mesma regra do portal fiscal.
//  Para detectar DIVERGÊNCIA de valor, cruza com as fontes de lançamento:
//    • COMPRAS        → ESTENT (TIPONF NFE/NFI) por CHAVE
//    • CONTAS A PAGAR → PAGDOCI por CNPJ do fornecedor + número (valor líquido)
//  Classifica cada nota:
//    • NAO_LANCADA  — SITUAC_VR = 0
//    • DIVERGENTE   — lançada (SITUAC_VR=1), mas valor difere do lançado
//    • OK           — lançada e valor bate (ou sem base de comparação de valor)
//  Params (todos OPCIONAIS):
//    dataInicio / dataFim → filtra por data de emissão (DEMI)
//    filial               → CODFIL
//    modo                 → 'todas' (padrão) | 'nao_lancadas' | 'divergentes'
//    limite               → TOP N (padrão 1000, teto 5000)
// ─────────────────────────────────────────────────────────────────────────────
// Fornecedores cujas notas a SGT DESCONSIDERA (não lança de propósito).
// Comparação pelo RADICAL do CNPJ (8 primeiros dígitos) — cobre todas as filiais.
const NFE_FORNECEDORES_DESCONSIDERADOS = [
  "67620377", // MINERVA S A
];

app.post("/dw-consulta-nfe", async (req, res) => {
  const { dataInicio, dataFim, filial, modo, limite } = req.body ?? {};

  try {
    const p     = await getPool();
    const dbReq = p.request();

    dbReq.input("dataInicio", sql.DateTime,    dataInicio ? new Date(dataInicio) : null);
    dbReq.input("dataFim",    sql.DateTime,    dataFim    ? new Date(dataFim)    : null);
    dbReq.input("filial",     sql.VarChar(20), filial || null);
    dbReq.input("modo",       sql.VarChar(20), modo || null);
    dbReq.input("limite",     sql.Int,         Math.min(parseInt(limite, 10) || 1000, 5000));

    // Limpa CNPJ (tira máscara) e padroniza pra 14 dígitos — usado nos 2 lados
    // do casamento de abastecimento (NFEIDIST.CNPJ × RODPOS.CODCGC).
    const limpaCnpj = (col) =>
      `RIGHT(REPLICATE('0',14) + REPLACE(REPLACE(REPLACE(REPLACE(LTRIM(RTRIM(${col})),'.',''),'/',''),'-',''),' ',''), 14)`;

    // Lista de radicais de CNPJ desconsiderados (Minerva etc.) pro IN do SQL.
    // Vazio → usa '' (nunca casa, pois radical tem 8 dígitos).
    const descInSql = NFE_FORNECEDORES_DESCONSIDERADOS.length
      ? NFE_FORNECEDORES_DESCONSIDERADOS.map((c) => `'${c}'`).join(",")
      : "''";

    const query = `
      WITH BASE AS (
        SELECT
          D.CODFIL   AS FILIAL,
          D.CHNFE    AS CHAVE,
          D.CNPJ     AS CNPJ,
          D.XNOME    AS RAZAO_SOCIAL,
          D.DEMI     AS DATA_EMISSAO,
          D.VNF      AS VALOR_NOTA,
          D.DHRECBTO AS DATA_RECEBIMENTO,
          D.NOTA     AS NUMERO_NOTA,
          D.SERIE    AS SERIE_NOTA,
          D.TPNF     AS TPNF,
          -- Marcações pra tela filtrar (Opção C): entrada (TPNF=0) e fornecedor
          -- desconsiderado (Minerva etc.). Nenhuma é escondida aqui no servidor.
          CASE WHEN LEFT(${limpaCnpj("D.CNPJ")}, 8) IN (${descInSql}) THEN 1 ELSE 0 END AS DESCONSIDERADO,
          -- Accountability: quem/quando lançou (USUATU/DATATU registram a última
          -- atualização — pra nota lançada, é o lançamento) e há quantos dias a
          -- nota está no sistema (pra medir quanto tempo as pendentes empacam).
          D.USUATU   AS USUARIO_LANCAMENTO,
          D.DATATU   AS DATA_LANCAMENTO,
          DATEDIFF(day, COALESCE(D.DHRECBTO, D.DEMI), GETDATE()) AS DIAS_PARADA,
          -- Valor pra comparar: prioriza o líquido do contas a pagar (VLRLIQ, já
          -- com desconto); só usa o VLRDOC da compra se a nota não estiver no
          -- contas a pagar. Evita falso divergente em nota com desconto.
          COALESCE(A.VLR_ABAST, C.VLR_COMPRA) AS VALOR_LANCADO,
          CASE
            WHEN C.CHAVE IS NOT NULL THEN 'COMPRA'
            WHEN A.CNPJ  IS NOT NULL THEN 'CONTAS_PAGAR'
            ELSE NULL
          END AS ORIGEM,
          -- LANÇADA ou não vem do flag oficial do Rodopar (SITUAC_VR): mesma
          -- regra do portal fiscal. O cruzamento ESTENT/PAGDOCI serve só pra
          -- comparar o valor e apontar DIVERGENTE nas que estão lançadas.
          CASE
            WHEN D.SITUAC_VR = 0 OR D.SITUAC_VR IS NULL                    THEN 'NAO_LANCADA'
            WHEN ABS(D.VNF - COALESCE(A.VLR_ABAST, C.VLR_COMPRA)) > 0.01   THEN 'DIVERGENTE'
            ELSE 'OK'
          END AS SITUACAO
        FROM NFEIDIST D WITH (NOLOCK)
        -- Fonte 1: COMPRAS (ESTENT) — casa por chave
        LEFT JOIN (
          SELECT LTRIM(RTRIM(NFE_ID)) AS CHAVE,
                 SUM(VLRDOC)          AS VLR_COMPRA
          FROM ESTENT WITH (NOLOCK)
          WHERE TIPONF IN ('NFE','NFI')
            AND SITUAC <> 'C'
            AND NFE_ID IS NOT NULL
            AND LEN(LTRIM(RTRIM(NFE_ID))) = 44
          GROUP BY LTRIM(RTRIM(NFE_ID))
        ) C ON C.CHAVE = LTRIM(RTRIM(D.CHNFE))
        -- Fonte 2: CONTAS A PAGAR (PAGDOCI) — casa por CNPJ do fornecedor + número.
        -- Compara pelo VLRLIQ (valor líquido/devedor, já com desconto) somado por
        -- nota — evita falso "divergente" em notas com desconto. Ignora canceladas.
        LEFT JOIN (
          SELECT ${limpaCnpj("CLI.CODCGC")}     AS CNPJ,
                 TRY_CONVERT(BIGINT, PI.NUMDOC) AS NUMDOC,
                 SUM(PI.VLRLIQ)                 AS VLR_ABAST
          FROM PAGDOCI PI WITH (NOLOCK)
          JOIN RODCLI CLI WITH (NOLOCK) ON CLI.CODCLIFOR = PI.CODCLIFOR
          WHERE PI.NUMDOC IS NOT NULL
            AND TRY_CONVERT(BIGINT, PI.NUMDOC) IS NOT NULL
            AND PI.SITUAC NOT IN ('C','I')
          GROUP BY ${limpaCnpj("CLI.CODCGC")}, TRY_CONVERT(BIGINT, PI.NUMDOC)
        ) A ON A.CNPJ   = ${limpaCnpj("D.CNPJ")}
           AND A.NUMDOC = TRY_CONVERT(BIGINT, D.NOTA)
        WHERE D.VNF > 0
          AND D.XNOME IS NOT NULL
          -- Entrada (TPNF=0) e desconsiderados NÃO são escondidos aqui: a tela
          -- devolve TODAS as notas (marcadas em TPNF/DESCONSIDERADO) e o usuário
          -- liga/desliga os filtros na interface (Opção C).
          AND (@dataInicio IS NULL OR D.DEMI >= @dataInicio)
          AND (@dataFim    IS NULL OR D.DEMI <  DATEADD(day, 1, @dataFim))
          AND (@filial     IS NULL OR D.CODFIL = @filial)
      )
      SELECT TOP (@limite) *
      FROM BASE
      WHERE @modo IS NULL
         OR @modo = 'todas'
         OR (@modo = 'nao_lancadas' AND SITUACAO = 'NAO_LANCADA')
         OR (@modo = 'divergentes'  AND SITUACAO = 'DIVERGENTE')
      ORDER BY DATA_EMISSAO DESC
      OPTION (RECOMPILE)
    `;

    const result = await dbReq.query(query);

    // Resumo por situação (sobre as linhas retornadas)
    const resumo = { total: result.recordset.length, ok: 0, nao_lancadas: 0, divergentes: 0,
                     por_origem: { compra: 0, contas_pagar: 0 } };
    for (const r of result.recordset) {
      if      (r.SITUACAO === "OK")          resumo.ok++;
      else if (r.SITUACAO === "NAO_LANCADA") resumo.nao_lancadas++;
      else if (r.SITUACAO === "DIVERGENTE")  resumo.divergentes++;
      if      (r.ORIGEM === "COMPRA")        resumo.por_origem.compra++;
      else if (r.ORIGEM === "CONTAS_PAGAR")  resumo.por_origem.contas_pagar++;
    }

    return res.json({ resumo, data: result.recordset });

  } catch (err) {
    console.error("❌ Erro /dw-consulta-nfe:", err.message);
    if (err.code === "ECONNRESET" || err.code === "ECONNABORTED" || err.message?.includes("ECONN")) {
      await destroyPool();
    }
    return res.status(500).json({ error: err.message, code: err.code ?? null });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
//  ENDPOINT: /dw-consulta-nfe-tendencia
//  Série MENSAL de notas (universo "pra lançar": sem entrada e sem fornecedores
//  desconsiderados) — alimenta o gráfico de tendência da tela Fiscal.
//  Param: meses (padrão 6, teto 24). Lançada/não pelo flag SITUAC_VR do Rodopar.
// ─────────────────────────────────────────────────────────────────────────────
app.post("/dw-consulta-nfe-tendencia", async (req, res) => {
  const meses = Math.min(Math.max(parseInt(req.body?.meses, 10) || 6, 1), 24);
  const agora = new Date();
  const desde = new Date(agora.getFullYear(), agora.getMonth() - (meses - 1), 1);

  const limpaCnpj = (col) =>
    `RIGHT(REPLICATE('0',14) + REPLACE(REPLACE(REPLACE(REPLACE(LTRIM(RTRIM(${col})),'.',''),'/',''),'-',''),' ',''), 14)`;
  const descInSql = NFE_FORNECEDORES_DESCONSIDERADOS.length
    ? NFE_FORNECEDORES_DESCONSIDERADOS.map((c) => `'${c}'`).join(",")
    : "''";

  try {
    const p     = await getPool();
    const dbReq = p.request();
    dbReq.input("desde", sql.DateTime, desde);

    const result = await dbReq.query(`
      SELECT
        CONVERT(char(7), D.DEMI, 126) AS mes,
        COUNT(*)                                                                 AS total,
        SUM(CASE WHEN D.SITUAC_VR = 1 THEN 1 ELSE 0 END)                         AS lancadas,
        SUM(CASE WHEN D.SITUAC_VR = 0 OR D.SITUAC_VR IS NULL THEN 1 ELSE 0 END)  AS nao_lancadas
      FROM NFEIDIST D WITH (NOLOCK)
      WHERE D.VNF > 0
        AND D.XNOME IS NOT NULL
        AND (D.TPNF IS NULL OR D.TPNF <> '0')
        AND LEFT(${limpaCnpj("D.CNPJ")}, 8) NOT IN (${descInSql})
        AND D.DEMI >= @desde
      GROUP BY CONVERT(char(7), D.DEMI, 126)
      ORDER BY mes
      OPTION (RECOMPILE)
    `);
    return res.json({ data: result.recordset });
  } catch (err) {
    console.error("❌ Erro /dw-consulta-nfe-tendencia:", err.message);
    if (err.code === "ECONNRESET" || err.code === "ECONNABORTED" || err.message?.includes("ECONN")) {
      await destroyPool();
    }
    return res.status(500).json({ error: err.message, code: err.code ?? null });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
//  ENDPOINT: /dw-custo-veiculo
//  Custo por veículo no período = MANUTENÇÃO (peças: PRECUS×QTD, mesma fórmula
//  da tela Manutenção) + COMBUSTÍVEL (RODABA.VLRTOT). Sem receita (a empresa não
//  atribui faturamento por placa). Ordena do que mais custa pro que menos custa.
//  Params: dataInicio, dataFim (default últimos 30 dias), veiculo (opcional), limite.
// ─────────────────────────────────────────────────────────────────────────────
app.post("/dw-custo-veiculo", async (req, res) => {
  const { dataInicio, dataFim, veiculo, limite } = req.body ?? {};
  const dFim    = dataFim    ? new Date(dataFim)    : new Date();
  const dInicio = dataInicio ? new Date(dataInicio) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  try {
    const p     = await getPool();
    const dbReq = p.request();
    dbReq.input("dataInicio", sql.Date,       dInicio);
    dbReq.input("dataFim",    sql.Date,       dFim);
    dbReq.input("veiculo",    sql.VarChar(20), veiculo || null);
    dbReq.input("limite",     sql.Int,         Math.min(parseInt(limite, 10) || 100, 500));

    const query = `
      WITH MANUT AS (
        SELECT ORD.CODVEI AS veiculo,
               SUM(IRE.PRECUS * IRE.QUANTI) AS custo_manutencao,
               COUNT(DISTINCT ORD.CODORD)   AS qtd_os
        FROM OSEORD ORD WITH (NOLOCK)
        JOIN OSEREQ REQ WITH (NOLOCK) ON ORD.CODORD = REQ.CODORD AND ORD.CODFIL = REQ.ORDFIL
        JOIN OSEIRE IRE WITH (NOLOCK) ON REQ.CODREQ = IRE.CODREQ AND REQ.CODFIL = IRE.CODFIL
        WHERE ORD.SITUAC <> 'C'
          AND ORD.DATREF BETWEEN @dataInicio AND @dataFim
          AND (@veiculo IS NULL OR ORD.CODVEI = @veiculo)
        GROUP BY ORD.CODVEI
      ),
      COMB AS (
        SELECT VEI.CODVEI AS veiculo,
               SUM(ABA.VLRTOT) AS custo_combustivel,
               SUM(ABA.QUANTI) AS litros,
               COUNT(*)        AS qtd_abastecimentos
        FROM RODABA ABA WITH (NOLOCK)
        JOIN RODVEI VEI WITH (NOLOCK) ON ABA.PLACA = VEI.CODVEI
        WHERE ABA.DATREF BETWEEN @dataInicio AND @dataFim
          AND (@veiculo IS NULL OR VEI.CODVEI = @veiculo)
        GROUP BY VEI.CODVEI
      ),
      -- Detecta placa usada como "lixeira" no lançamento das notas de combustível
      POR_DIA AS (
        SELECT VEI.CODVEI AS veiculo, CAST(ABA.DATREF AS DATE) AS dia, COUNT(*) AS n
        FROM RODABA ABA WITH (NOLOCK)
        JOIN RODVEI VEI WITH (NOLOCK) ON ABA.PLACA = VEI.CODVEI
        WHERE ABA.DATREF BETWEEN @dataInicio AND @dataFim
        GROUP BY VEI.CODVEI, CAST(ABA.DATREF AS DATE)
      ),
      PICO AS (
        SELECT veiculo, MAX(n) AS max_no_dia, COUNT(*) AS dias_com_abast
        FROM POR_DIA GROUP BY veiculo
      )
      SELECT TOP (@limite)
        COALESCE(M.veiculo, C.veiculo)                              AS veiculo,
        FRO.DESCRI                                                  AS frota,
        MCV.DESCRI                                                  AS marca,
        MDV.DESCRI                                                  AS modelo,
        CAST(ISNULL(M.custo_manutencao, 0) AS DECIMAL(18,2))        AS custo_manutencao,
        ISNULL(M.qtd_os, 0)                                         AS qtd_os,
        CAST(ISNULL(C.custo_combustivel, 0) AS DECIMAL(18,2))       AS custo_combustivel,
        CAST(ISNULL(C.litros, 0) AS DECIMAL(18,2))                  AS litros,
        ISNULL(C.qtd_abastecimentos, 0)                            AS qtd_abastecimentos,
        ISNULL(PK.max_no_dia, 0)                                   AS max_abast_no_dia,
        -- 1 = volume/frequência implausível → provável erro de lançamento
        CASE WHEN ISNULL(C.qtd_abastecimentos, 0) > 0
              AND ( (CAST(C.qtd_abastecimentos AS FLOAT) / NULLIF(PK.dias_com_abast, 0)) > 1.5
                    OR ISNULL(PK.max_no_dia, 0) > 4 )
             THEN 1 ELSE 0 END                                     AS abastecimento_suspeito,
        CAST(ISNULL(M.custo_manutencao,0) + ISNULL(C.custo_combustivel,0) AS DECIMAL(18,2)) AS custo_total
      FROM MANUT M
      FULL OUTER JOIN COMB C ON M.veiculo = C.veiculo
      LEFT JOIN PICO PK ON PK.veiculo = COALESCE(M.veiculo, C.veiculo)
      LEFT JOIN RODVEI VE  WITH (NOLOCK) ON VE.CODVEI  = COALESCE(M.veiculo, C.veiculo)
      LEFT JOIN RODFRO FRO WITH (NOLOCK) ON VE.CODFRO  = FRO.CODFRO
      LEFT JOIN RODMCV MCV WITH (NOLOCK) ON VE.CODMCV  = MCV.CODMCV
      LEFT JOIN RODMDV MDV WITH (NOLOCK) ON VE.CODMDV  = MDV.CODMDV
      WHERE ISNULL(M.custo_manutencao,0) + ISNULL(C.custo_combustivel,0) > 0
      ORDER BY custo_total DESC
      OPTION (RECOMPILE)
    `;

    const result = await dbReq.query(query);
    const rows = result.recordset;
    const totalGeral = rows.reduce((s, r) => s + Number(r.custo_total || 0), 0);
    return res.json({
      periodo: { dataInicio: dInicio.toISOString().slice(0, 10), dataFim: dFim.toISOString().slice(0, 10) },
      total_veiculos: rows.length,
      custo_total_frota: Math.round(totalGeral * 100) / 100,
      data: rows,
    });
  } catch (err) {
    console.error("❌ Erro /dw-custo-veiculo:", err.message);
    if (err.code === "ECONNRESET" || err.code === "ECONNABORTED" || err.message?.includes("ECONN")) {
      await destroyPool();
    }
    return res.status(500).json({ error: err.message, code: err.code ?? null });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
//  ENDPOINT: /dw-abastecimento-qualidade
//  Indicador de QUALIDADE do lançamento de abastecimento. Mede dois furos:
//   1. Registros sem motorista identificado ("A INFORMAR") — combustível sem dono
//   2. Placas com volume/frequência implausível (placa usada como "lixeira" na
//      importação das notas) — ex: 16 abastecimentos no mesmo dia, 50+ postos
//  Params: dataInicio, dataFim (default últimos 30 dias).
// ─────────────────────────────────────────────────────────────────────────────
app.post("/dw-abastecimento-qualidade", async (req, res) => {
  const { dataInicio, dataFim } = req.body ?? {};
  const dFim    = dataFim    ? new Date(dataFim)    : new Date();
  const dInicio = dataInicio ? new Date(dataInicio) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  try {
    const p     = await getPool();
    const dbReq = p.request();
    dbReq.input("dataInicio", sql.Date, dInicio);
    dbReq.input("dataFim",    sql.Date, dFim);

    const result = await dbReq.query(`
      WITH POR_DIA AS (
        SELECT VEI.CODVEI AS veiculo, CAST(ABA.DATREF AS DATE) AS dia, COUNT(*) AS n
        FROM RODABA ABA WITH (NOLOCK)
        JOIN RODVEI VEI WITH (NOLOCK) ON ABA.PLACA = VEI.CODVEI
        WHERE ABA.DATREF BETWEEN @dataInicio AND @dataFim
        GROUP BY VEI.CODVEI, CAST(ABA.DATREF AS DATE)
      ),
      PICO AS (
        SELECT veiculo, MAX(n) AS max_no_dia, COUNT(*) AS dias_com_abast
        FROM POR_DIA GROUP BY veiculo
      )
      SELECT
        VEI.CODVEI                                    AS veiculo,
        MDV.DESCRI                                    AS modelo,
        COUNT(*)                                      AS qtd,
        CAST(SUM(ABA.QUANTI) AS DECIMAL(18,2))        AS litros,
        CAST(SUM(ABA.VLRTOT) AS DECIMAL(18,2))        AS valor,
        SUM(CASE WHEN ISNULL(MOT.NOMMOT,'') = 'A INFORMAR' THEN 1 ELSE 0 END)          AS qtd_sem_motorista,
        CAST(SUM(CASE WHEN ISNULL(MOT.NOMMOT,'') = 'A INFORMAR' THEN ABA.VLRTOT ELSE 0 END) AS DECIMAL(18,2)) AS valor_sem_motorista,
        COUNT(DISTINCT ABA.CODPON)                    AS postos_distintos,
        MAX(PICO.max_no_dia)                          AS max_no_dia,
        MAX(PICO.dias_com_abast)                      AS dias_com_abast
      FROM RODABA ABA WITH (NOLOCK)
      JOIN RODVEI VEI WITH (NOLOCK) ON ABA.PLACA = VEI.CODVEI
      LEFT JOIN RODMOT MOT WITH (NOLOCK) ON ABA.CODMOT = MOT.CODMOT
      LEFT JOIN RODMDV MDV WITH (NOLOCK) ON VEI.CODMDV = MDV.CODMDV
      LEFT JOIN PICO ON PICO.veiculo = VEI.CODVEI
      WHERE ABA.DATREF BETWEEN @dataInicio AND @dataFim
      GROUP BY VEI.CODVEI, MDV.DESCRI
      ORDER BY valor DESC
      OPTION (RECOMPILE)
    `);

    const rows = result.recordset;
    const n = (x) => Number(x || 0);
    const tot = {
      registros: rows.reduce((s, r) => s + n(r.qtd), 0),
      litros:    rows.reduce((s, r) => s + n(r.litros), 0),
      valor:     rows.reduce((s, r) => s + n(r.valor), 0),
      registros_sem_motorista: rows.reduce((s, r) => s + n(r.qtd_sem_motorista), 0),
      valor_sem_motorista:     rows.reduce((s, r) => s + n(r.valor_sem_motorista), 0),
    };
    const r2 = (x) => Math.round(x * 100) / 100;

    // Placa suspeita: média > 1,5 abastecimentos/dia ativo OU pico > 4 no mesmo dia
    const suspeitas = rows
      .map((r) => ({
        veiculo: r.veiculo, modelo: r.modelo,
        litros: n(r.litros), valor: n(r.valor), qtd: n(r.qtd),
        max_no_dia: n(r.max_no_dia), postos_distintos: n(r.postos_distintos),
        media_por_dia: r2(n(r.qtd) / Math.max(n(r.dias_com_abast), 1)),
        qtd_sem_motorista: n(r.qtd_sem_motorista),
      }))
      .filter((r) => r.media_por_dia > 1.5 || r.max_no_dia > 4)
      .sort((a, b) => b.valor - a.valor)
      .slice(0, 10);

    return res.json({
      periodo: { dataInicio: dInicio.toISOString().slice(0, 10), dataFim: dFim.toISOString().slice(0, 10) },
      total_registros: tot.registros,
      total_litros: r2(tot.litros),
      total_valor: r2(tot.valor),
      sem_motorista: {
        registros: tot.registros_sem_motorista,
        valor: r2(tot.valor_sem_motorista),
        pct_registros: tot.registros ? r2((tot.registros_sem_motorista / tot.registros) * 100) : 0,
        pct_valor: tot.valor ? r2((tot.valor_sem_motorista / tot.valor) * 100) : 0,
      },
      placas_suspeitas: suspeitas,
    });
  } catch (err) {
    console.error("❌ Erro /dw-abastecimento-qualidade:", err.message);
    if (err.code === "ECONNRESET" || err.code === "ECONNABORTED" || err.message?.includes("ECONN")) {
      await destroyPool();
    }
    return res.status(500).json({ error: err.message, code: err.code ?? null });
  }
});

// ── Endpoint de logs dos serviços ─────────────────────────────────────────────
// Público (sem x-api-key). Lê as últimas N linhas dos arquivos de log.
// GET /api/logs?service=automacao&lines=100
const LOG_SOURCES = {
  automacao: path.join(__dirname, '..', 'dw-automacao-mb', 'logs', 'service-stdout.log'),
  'automacao-err': path.join(__dirname, '..', 'dw-automacao-mb', 'logs', 'service-stderr.log'),
};

function tailFile(filePath, n) {
  try {
    if (!fs.existsSync(filePath)) return { ok: false, error: 'Arquivo não encontrado' };
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n').filter(Boolean);
    const tail = lines.slice(-n);
    return { ok: true, lines: tail, total: lines.length };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

app.get("/api/logs", (_req, res) => {
  const service = _req.query.service;
  const lines = Math.min(parseInt(_req.query.lines) || 100, 500);

  if (!service) {
    const available = Object.keys(LOG_SOURCES);
    const services = {};
    for (const svc of available) {
      const filePath = LOG_SOURCES[svc];
      const exists = fs.existsSync(filePath);
      let size = 0;
      let modified = null;
      if (exists) {
        const stat = fs.statSync(filePath);
        size = stat.size;
        modified = stat.mtime.toISOString();
      }
      services[svc] = { exists, size, modified, path: filePath };
    }
    return res.json({ services });
  }

  if (!LOG_SOURCES[service]) {
    return res.status(400).json({ error: `Serviço desconhecido: ${service}. Disponíveis: ${Object.keys(LOG_SOURCES).join(', ')}` });
  }

  const result = tailFile(LOG_SOURCES[service], lines);
  res.json({ service, ...result });
});

// ── Painel de logs (serve o HTML) ────────────────────────────────────────────
const painelPath = path.join(__dirname, "painel.html");
app.get("/painel", (_req, res) => {
  if (!fs.existsSync(painelPath)) return res.status(404).send("painel.html não encontrado");
  res.sendFile(painelPath);
});

// ── Inicia o servidor ─────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log("─────────────────────────────────────────");
  console.log(`🚀 DW API Local rodando em http://localhost:${PORT}`);
  console.log(`📦 Banco: ${process.env.MSSQL_DATABASE} @ ${process.env.MSSQL_SERVER}:${process.env.MSSQL_PORT}`);
  console.log("─────────────────────────────────────────");
  console.log("⏳ Conectando ao SQL Server...");
  getPool().catch((err) => {
    console.error("❌ Falha na conexão inicial:", err.message);
    console.log("⚠️  Servidor continua rodando. Tentará reconectar na próxima requisição.");
  });
});

// ── Captura erros não tratados para não fechar a janela ───────────────────────
process.on("uncaughtException", (err) => {
  console.error("❌ Erro não tratado:", err.message);
  console.error(err.stack);
});

process.on("unhandledRejection", (reason) => {
  console.error("❌ Promise rejeitada:", reason);
});
