// ─────────────────────────────────────────────────────────────────────────────
//  DW API LOCAL  –  Roda na rede interna e expõe os dados via Cloudflare Tunnel
//  Uso: node server.js
// ─────────────────────────────────────────────────────────────────────────────

const express = require("express");
const cors    = require("cors");
const sql     = require("mssql");
const fs      = require("fs");
const path    = require("path");

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

// ── Health check ──────────────────────────────────────────────────────────────
app.get("/", (_req, res) => {
  res.json({ status: "ok", message: "DW API Local rodando ✅" });
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
  RAT.ANALIT, CLA_ANALIT.DESCRI AS ANALITICA
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
  RAT.ANALIT, CLA_ANALIT.DESCRI AS ANALITICA
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
  RAT.ANALIT, CLA_ANALIT.DESCRI AS ANALITICA
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
  RAT.ANALIT, CLA_ANALIT.DESCRI AS ANALITICA
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
  RAT.ANALIT, CLA_ANALIT.DESCRI AS ANALITICA
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
  RAT.ANALIT, CLA_ANALIT.DESCRI AS ANALITICA
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
  RAT.ANALIT, CLA_ANALIT.DESCRI AS ANALITICA
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
  const { dataInicio, dataFim, filial } = req.body;

  try {
    const p     = await getPool();
    const dbReq = p.request();

    const dInicio = dataInicio ? new Date(dataInicio) : new Date("2024-01-01");
    const dFim    = dataFim    ? new Date(dataFim)    : new Date();

    dbReq.input("dataInicio", sql.Date, dInicio);
    dbReq.input("dataFim",    sql.Date, dFim);
    dbReq.input("filial",     sql.VarChar(20), filial || null);

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
    AND (@filial IS NULL OR ORD.CODFIL = @filial)
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
    CLI.RAZSOC               AS fornecedor
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
  const { situacao } = req.body ?? {};

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
    WHERE (@situacao IS NULL OR SITUAC = @situacao)
    OPTION (RECOMPILE)
  `;

  try {
    const pool = await getPool();
    const request = pool.request();
    request.input("situacao", situacao ?? null);

    const result = await request.query(query);
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
    request.input("dataInicio", dataInicio ?? null);
    request.input("dataFim",    dataFim    ?? null);

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
