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

async function getPool() {
  if (pool) {
    try {
      await pool.request().query("SELECT 1"); // verifica se ainda está vivo
      return pool;
    } catch {
      console.warn("⚠️  Pool morto, reconectando...");
      pool = null;
    }
  }
  pool = await sql.connect(dbConfig);
  pool.on("error", (err) => {
    console.error("❌ Erro no pool:", err.message);
    pool = null; // força reconexão na próxima chamada
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
FROM PAGDOCI I
  LEFT JOIN PAGDOC  P          ON I.CODCLIFOR=P.CODCLIFOR AND I.SERIE=P.SERIE AND I.NUMDOC=P.NUMDOC
  LEFT JOIN PAGRAT  RAT        ON RAT.CODCLIFOR=P.CODCLIFOR AND RAT.SERIE=P.SERIE AND RAT.NUMDOC=P.NUMDOC
  LEFT JOIN PAGCLA  CLA_ANALIT ON RAT.ANALIT=CLA_ANALIT.CODCLAP
  LEFT JOIN PAGCLA  CLA_SINTET ON RAT.SINTET=CLA_SINTET.CODCLAP
  LEFT JOIN RODCUS  CUS        ON RAT.CODCUS=CUS.CODCUS
  LEFT JOIN RODCGA  CGA        ON RAT.CODCGA=CGA.CODCGA
  LEFT JOIN RODFIL  F          ON P.CODFIL=F.CODFIL
  LEFT JOIN RODCLI  C          ON P.CODCLIFOR=C.CODCLIFOR
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
FROM PAGDOCI I
  LEFT JOIN PAGDOC  P          ON I.CODCLIFOR=P.CODCLIFOR AND I.SERIE=P.SERIE AND I.NUMDOC=P.NUMDOC
  LEFT JOIN PAGRAT  RAT        ON RAT.CODCLIFOR=P.CODCLIFOR AND RAT.SERIE=P.SERIE AND RAT.NUMDOC=P.NUMDOC
  LEFT JOIN PAGCLA  CLA_ANALIT ON RAT.ANALIT=CLA_ANALIT.CODCLAP
  LEFT JOIN PAGCLA  CLA_SINTET ON RAT.SINTET=CLA_SINTET.CODCLAP
  LEFT JOIN RODCUS  CUS        ON RAT.CODCUS=CUS.CODCUS
  LEFT JOIN RODCGA  CGA        ON RAT.CODCGA=CGA.CODCGA
  LEFT JOIN RODFIL  F          ON P.CODFIL=F.CODFIL
  LEFT JOIN RODCLI  C          ON P.CODCLIFOR=C.CODCLIFOR
WHERE I.SITUAC NOT IN ('C','I')
  AND P.VLRDOC > 0
  AND I.DOCDES IS NULL
  AND I.DATPAG BETWEEN @dataInicio AND @dataFim
  AND (I.DATVEN IS NULL OR I.DATVEN NOT BETWEEN @dataInicio AND @dataFim)
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
FROM RECDOCI I
  LEFT JOIN RECDOC  P          ON I.NUMDUP=P.NUMDUP
  LEFT JOIN RECRAT  RAT        ON RAT.NUMDUP=P.NUMDUP
  LEFT JOIN PAGCLA  CLA_ANALIT ON RAT.ANALIT=CLA_ANALIT.CODCLAP
  LEFT JOIN PAGCLA  CLA_SINTET ON RAT.SINTET=CLA_SINTET.CODCLAP
  LEFT JOIN RODCUS  CUS        ON RAT.CODCUS=CUS.CODCUS
  LEFT JOIN RODCGA  CGA        ON RAT.CODCGA=CGA.CODCGA
  LEFT JOIN RODFIL  F          ON P.CODFIL=F.CODFIL
  LEFT JOIN RODCLI  C          ON P.CODCLIFOR=C.CODCLIFOR
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
FROM RECDOCI I
  LEFT JOIN RECDOC  P          ON I.NUMDUP=P.NUMDUP
  LEFT JOIN RECRAT  RAT        ON RAT.NUMDUP=P.NUMDUP
  LEFT JOIN PAGCLA  CLA_ANALIT ON RAT.ANALIT=CLA_ANALIT.CODCLAP
  LEFT JOIN PAGCLA  CLA_SINTET ON RAT.SINTET=CLA_SINTET.CODCLAP
  LEFT JOIN RODCUS  CUS        ON RAT.CODCUS=CUS.CODCUS
  LEFT JOIN RODCGA  CGA        ON RAT.CODCGA=CGA.CODCGA
  LEFT JOIN RODFIL  F          ON P.CODFIL=F.CODFIL
  LEFT JOIN RODCLI  C          ON P.CODCLIFOR=C.CODCLIFOR
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
FROM BANRAZ B
  LEFT JOIN BANHIS  H          ON H.CODHISBC=B.CODHISBC
  LEFT JOIN BANRNF  N          ON N.ID_RAZ=B.ID_RAZ
  LEFT JOIN BANRAT  RAT        ON RAT.NUMDOC=B.NUMDOC AND RAT.CODCTA=B.CODCTA AND RAT.CODFIL=B.CODFIL AND RAT.ID_RAZ=B.ID_RAZ
  LEFT JOIN PAGCLA  CLA_ANALIT ON CLA_ANALIT.CODCLAP=RAT.ANALIT
  LEFT JOIN PAGCLA  CLA_SINTET ON CLA_SINTET.CODCLAP=RAT.SINTET
  LEFT JOIN RODCUS  CUS        ON RAT.CODCUS=CUS.CODCUS
  LEFT JOIN RODCGA  CGA        ON RAT.CODCGA=CGA.CODCGA
  LEFT JOIN RODFIL  F          ON B.CODFIL=F.CODFIL
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
FROM BANRAZ B
  LEFT JOIN BANHIS  H          ON H.CODHISBC=B.CODHISBC
  LEFT JOIN BANRNF  N          ON N.ID_RAZ=B.ID_RAZ
  LEFT JOIN BANRAT  RAT        ON RAT.NUMDOC=B.NUMDOC AND RAT.CODCTA=B.CODCTA AND RAT.CODFIL=B.CODFIL AND RAT.ID_RAZ=B.ID_RAZ
  LEFT JOIN PAGCLA  CLA_ANALIT ON CLA_ANALIT.CODCLAP=RAT.ANALIT
  LEFT JOIN PAGCLA  CLA_SINTET ON CLA_SINTET.CODCLAP=RAT.SINTET
  LEFT JOIN RODCUS  CUS        ON RAT.CODCUS=CUS.CODCUS
  LEFT JOIN RODCGA  CGA        ON RAT.CODCGA=CGA.CODCGA
  LEFT JOIN RODFIL  F          ON B.CODFIL=F.CODFIL
WHERE H.TRANSF='N' AND B.ORIGEM='LB' AND B.CODFIL=F.CODFIL AND B.SITUAC='O' AND B.VLRDOC>0
  AND B.CODCTA NOT IN ('BX-FORNEC')
  AND B.TIPDOC NOT IN ('ADF','ADL','TRA','ADC')
  AND B.DEBCRE='C'
  AND B.DATDOC BETWEEN @dataInicio AND @dataFim
  AND (@filial  IS NULL OR B.CODFIL =@filial)
  AND (@empresa IS NULL OR F.CODEMP =@empresa)
      `;

      const result = await dbReq.query(query);
      return res.json({ data: result.recordset });
    }

    // ── FATURAMENTO ───────────────────────────────────────────────────────────
    if (action === "faturamento") {
      if (!dataInicio || !dataFim) {
        return res.status(400).json({ error: "dataInicio e dataFim são obrigatórios" });
      }

      // Timeout independente de 30s para não bloquear os KPI cards
      const dbReq = p.request();
      dbReq.timeout = 30000;
      dbReq.input("dataInicio", sql.DateTime, new Date(dataInicio));
      dbReq.input("dataFim",    sql.DateTime, new Date(dataFim));

      // ── Query enxuta: apenas os 2 JOINs necessários para chegar em CGR.DESCRI
      //    RODCON / ESTNOT / RODORD foram removidos — não contribuem para o SELECT
      //    e causavam multiplicação de linhas + bloqueio de índice na view.
      //    WITH (NOLOCK) evita bloqueios de leitura.
      //    OPTION (RECOMPILE) garante plano de execução fresco (evita parameter sniffing).
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
