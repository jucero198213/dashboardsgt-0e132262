import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const respond = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json() as {
      action: "fetch" | "filters";
      dataInicio?: string;
      dataFim?: string;
      filial?: string | null;
      empresa?: string | null;
    };

    const { action, dataInicio, dataFim, filial = null, empresa = null } = body;

    // ── Conexão MSSQL via npm specifier ──────────────────────────────────
    const sql = (await import("npm:mssql")).default;
    const pool = await sql.connect({
      server: Deno.env.get("MSSQL_SERVER")!,
      port: parseInt(Deno.env.get("MSSQL_PORT") ?? "1433"),
      database: Deno.env.get("MSSQL_DATABASE")!,
      user: Deno.env.get("MSSQL_USER")!,
      password: Deno.env.get("MSSQL_PASSWORD")!,
      options: {
        encrypt: false,
        trustServerCertificate: true,
        connectTimeout: 30_000,
        requestTimeout: 120_000,
      },
    });

    try {
      // ── FILTERS ──────────────────────────────────────────────────────────
      if (action === "filters") {
        const res = await pool.request().query(`
          SELECT DISTINCT
            F.CODFIL                        AS filial_id,
            ISNULL(F.DESFIL, F.CODFIL)      AS filial_nome,
            F.CODEMP                        AS empresa_id
          FROM RODFIL F
          ORDER BY F.CODEMP, F.CODFIL
        `);

        const rows = res.recordset as {
          filial_id: string;
          filial_nome: string;
          empresa_id: string;
        }[];

        const empresaMap = new Map<string, string>();
        const filiais: { id: string; nome: string; empresa: string }[] = [];

        for (const r of rows) {
          if (!empresaMap.has(r.empresa_id)) empresaMap.set(r.empresa_id, r.empresa_id);
          filiais.push({ id: r.filial_id, nome: r.filial_nome, empresa: r.empresa_id });
        }

        const empresas = Array.from(empresaMap.entries()).map(([id, nome]) => ({ id, nome }));
        return respond({ empresas, filiais });
      }

      // ── FETCH ─────────────────────────────────────────────────────────────
      if (action === "fetch") {
        if (!dataInicio || !dataFim)
          return respond({ error: "dataInicio e dataFim são obrigatórios" }, 400);

        const dbReq = pool.request();
        dbReq.input("dataInicio", sql.Date, new Date(dataInicio));
        dbReq.input("dataFim",    sql.Date, new Date(dataFim));
        dbReq.input("filial",  sql.VarChar(20), filial  ?? null);
        dbReq.input("empresa", sql.VarChar(20), empresa ?? null);

        const query = `
-- ═══════════════════════════════════════════════════════════
-- UNION 1 – CONTAS A PAGAR (PAGDOCI / PAGDOC)
-- ═══════════════════════════════════════════════════════════
SELECT
  P.DATEMI  AS DATA_EMISSAO,
  I.DATVEN  AS DATA_VENCIMENTO,
  I.DATPAG  AS DATA_PAGAMENTO,
  P.CODCLIFOR AS COD_PARCEIRO,
  C.RAZSOC    AS NOME_PARCEIRO,
  P.SERIE,
  P.NUMDOC    AS DOCUMENTO,
  I.NUMPAR    AS PARCELA,
  P.TIPDOC    AS TIPO_DOCUMENTO,
  'CP'        AS ORIGEM,
  I.SITUAC    AS SITUACAO,
  P.DESCAN,
  I.DESISS,
  CAST(ROUND(I.VLRCOR, 2) AS DECIMAL(18,2))                         AS VLRCOR,
  CAST(ROUND(I.VLRJUR, 2) AS DECIMAL(18,2))                         AS VLRJUR,
  CAST(ROUND(I.VLRDES, 2) AS DECIMAL(18,2))                         AS VLRDES,
  CAST(ROUND(P.VLRDOC, 2) AS DECIMAL(18,2))                         AS VLRDOC,
  CAST(ROUND((RAT.VALOR / P.VLRDOC) * I.VLRLIQ, 2) AS DECIMAL(18,2)) AS VLR_LIQUIDO,
  CAST(ROUND((RAT.VALOR / P.VLRDOC) * I.VLRPAG, 2) AS DECIMAL(18,2)) AS VLR_PAGO,
  CAST(ROUND((RAT.VALOR / P.VLRDOC) * I.VLRPAR, 2) AS DECIMAL(18,2)) AS VLR_PARCELA,
  I.JURDOC,
  P.CODFIL    AS FILIAL,
  F.CODEMP    AS EMPRESA,
  RAT.CODCGA,
  CGA.DESCRI  AS CENTRO_GASTO,
  RAT.CODCUS,
  CUS.DESCRI  AS CENTRO_CUSTO,
  RAT.SINTET,
  CLA_SINTET.DESCRI AS SINTETICA,
  RAT.ANALIT,
  CLA_ANALIT.DESCRI AS ANALITICA
FROM PAGDOCI I
  LEFT JOIN PAGDOC  P          ON I.CODCLIFOR = P.CODCLIFOR AND I.SERIE = P.SERIE AND I.NUMDOC = P.NUMDOC
  LEFT JOIN PAGRAT  RAT        ON RAT.CODCLIFOR = P.CODCLIFOR AND RAT.SERIE = P.SERIE AND RAT.NUMDOC = P.NUMDOC
  LEFT JOIN PAGCLA  CLA_ANALIT ON RAT.ANALIT = CLA_ANALIT.CODCLAP
  LEFT JOIN PAGCLA  CLA_SINTET ON RAT.SINTET = CLA_SINTET.CODCLAP
  LEFT JOIN RODCUS  CUS        ON RAT.CODCUS = CUS.CODCUS
  LEFT JOIN RODCGA  CGA        ON RAT.CODCGA = CGA.CODCGA
  LEFT JOIN RODFIL  F          ON P.CODFIL   = F.CODFIL
  LEFT JOIN RODCLI  C          ON P.CODCLIFOR = C.CODCLIFOR
WHERE I.SITUAC NOT IN ('C','I')
  AND P.VLRDOC > 0
  AND I.DOCDES IS NULL
  AND P.DATEMI BETWEEN @dataInicio AND @dataFim
  AND (@filial  IS NULL OR P.CODFIL  = @filial)
  AND (@empresa IS NULL OR F.CODEMP  = @empresa)

UNION ALL

-- ═══════════════════════════════════════════════════════════
-- UNION 2 – CONTAS A RECEBER (RECDOCI / RECDOC)
-- ═══════════════════════════════════════════════════════════
SELECT
  P.DATEMI  AS DATA_EMISSAO,
  I.DATVEN  AS DATA_VENCIMENTO,
  I.DATREC  AS DATA_PAGAMENTO,
  P.CODCLIFOR AS COD_PARCEIRO,
  C.RAZSOC    AS NOME_PARCEIRO,
  NULL        AS SERIE,
  P.NUMDUP    AS DOCUMENTO,
  I.NUMPAR    AS PARCELA,
  P.TIPDOC    AS TIPO_DOCUMENTO,
  'CR'        AS ORIGEM,
  I.SITUAC    AS SITUACAO,
  P.DESCAN,
  NULL        AS DESISS,
  CAST(ROUND(I.VLRCOR, 2) AS DECIMAL(18,2))                              AS VLRCOR,
  CAST(ROUND(I.VLRJUR, 2) AS DECIMAL(18,2))                              AS VLRJUR,
  CAST(ROUND(I.VLRDES, 2) AS DECIMAL(18,2))                              AS VLRDES,
  CAST(ROUND(P.VALDUP, 2) AS DECIMAL(18,2))                              AS VLRDOC,
  CAST(ROUND((RAT.VALOR / P.VALDUP) * I.VLRLIQ,          2) AS DECIMAL(18,2)) AS VLR_LIQUIDO,
  CAST(ROUND((RAT.VALOR / P.VALDUP) * (I.VLRREC+I.DESADT),2) AS DECIMAL(18,2)) AS VLR_PAGO,
  CAST(ROUND((RAT.VALOR / P.VALDUP) * I.VLRPAR,          2) AS DECIMAL(18,2)) AS VLR_PARCELA,
  NULL        AS JURDOC,
  P.CODFIL    AS FILIAL,
  F.CODEMP    AS EMPRESA,
  RAT.CODCGA,
  CGA.DESCRI  AS CENTRO_GASTO,
  RAT.CODCUS,
  CUS.DESCRI  AS CENTRO_CUSTO,
  RAT.SINTET,
  CLA_SINTET.DESCRI AS SINTETICA,
  RAT.ANALIT,
  CLA_ANALIT.DESCRI AS ANALITICA
FROM RECDOCI I
  LEFT JOIN RECDOC  P          ON I.NUMDUP    = P.NUMDUP
  LEFT JOIN RECRAT  RAT        ON RAT.NUMDUP  = P.NUMDUP
  LEFT JOIN PAGCLA  CLA_ANALIT ON RAT.ANALIT  = CLA_ANALIT.CODCLAP
  LEFT JOIN PAGCLA  CLA_SINTET ON RAT.SINTET  = CLA_SINTET.CODCLAP
  LEFT JOIN RODCUS  CUS        ON RAT.CODCUS  = CUS.CODCUS
  LEFT JOIN RODCGA  CGA        ON RAT.CODCGA  = CGA.CODCGA
  LEFT JOIN RODFIL  F          ON P.CODFIL    = F.CODFIL
  LEFT JOIN RODCLI  C          ON P.CODCLIFOR = C.CODCLIFOR
WHERE I.SITUAC NOT IN ('C','I')
  AND P.VALDUP > 0
  AND P.DATEMI BETWEEN @dataInicio AND @dataFim
  AND (@filial  IS NULL OR P.CODFIL  = @filial)
  AND (@empresa IS NULL OR F.CODEMP  = @empresa)

UNION ALL

-- ═══════════════════════════════════════════════════════════
-- UNION 3 – LANÇAMENTOS BANCÁRIOS DÉBITO (BANRAZ D)
-- ═══════════════════════════════════════════════════════════
SELECT
  B.DATDOC  AS DATA_EMISSAO,
  B.DATCOM  AS DATA_VENCIMENTO,
  B.DATCOM  AS DATA_PAGAMENTO,
  B.CODCLIFOR AS COD_PARCEIRO,
  NULL        AS NOME_PARCEIRO,
  NULL        AS SERIE,
  B.NUMDOC    AS DOCUMENTO,
  NULL        AS PARCELA,
  B.TIPDOC    AS TIPO_DOCUMENTO,
  'LB_D'      AS ORIGEM,
  B.SITUAC    AS SITUACAO,
  NULL AS DESCAN, NULL AS DESISS,
  NULL AS VLRCOR, NULL AS VLRJUR, NULL AS VLRDES,
  CAST(ROUND(B.VLRDOC, 2) AS DECIMAL(18,2)) AS VLRDOC,
  NULL AS VLR_LIQUIDO,
  CAST(ROUND((RAT.VALOR/B.VLRDOC)*CASE WHEN B.DATCOM IS NULL THEN 0 ELSE B.VLRDOC END,2) AS DECIMAL(18,2)) AS VLR_PAGO,
  CAST(ROUND((RAT.VALOR/B.VLRDOC)*CASE WHEN B.DATCOM IS NULL THEN 0 ELSE B.VLRDOC END,2) AS DECIMAL(18,2)) AS VLR_PARCELA,
  NULL AS JURDOC,
  B.CODFIL  AS FILIAL,
  F.CODEMP  AS EMPRESA,
  RAT.CODCGA, CGA.DESCRI AS CENTRO_GASTO,
  RAT.CODCUS, CUS.DESCRI AS CENTRO_CUSTO,
  RAT.SINTET, CLA_SINTET.DESCRI AS SINTETICA,
  RAT.ANALIT, CLA_ANALIT.DESCRI AS ANALITICA
FROM BANRAZ B
  LEFT JOIN BANHIS  H          ON H.CODHISBC  = B.CODHISBC
  LEFT JOIN BANRNF  N          ON N.ID_RAZ    = B.ID_RAZ
  LEFT JOIN BANRAT  RAT        ON RAT.NUMDOC  = B.NUMDOC AND RAT.CODCTA = B.CODCTA AND RAT.CODFIL = B.CODFIL AND RAT.ID_RAZ = B.ID_RAZ
  LEFT JOIN PAGCLA  CLA_ANALIT ON CLA_ANALIT.CODCLAP = RAT.ANALIT
  LEFT JOIN PAGCLA  CLA_SINTET ON CLA_SINTET.CODCLAP = RAT.SINTET
  LEFT JOIN RODCUS  CUS        ON RAT.CODCUS  = CUS.CODCUS
  LEFT JOIN RODCGA  CGA        ON RAT.CODCGA  = CGA.CODCGA
  LEFT JOIN RODFIL  F          ON B.CODFIL    = F.CODFIL
WHERE H.TRANSF = 'N'
  AND B.ORIGEM = 'LB'
  AND B.CODFIL = F.CODFIL
  AND B.SITUAC = 'O'
  AND B.VLRDOC > 0
  AND B.CODCTA NOT IN ('BX-FORNEC')
  AND B.TIPDOC NOT IN ('ADF','ADL','TRA','ADC')
  AND B.DEBCRE = 'D'
  AND B.DATDOC BETWEEN @dataInicio AND @dataFim
  AND (@filial  IS NULL OR B.CODFIL  = @filial)
  AND (@empresa IS NULL OR F.CODEMP  = @empresa)

UNION ALL

-- ═══════════════════════════════════════════════════════════
-- UNION 4 – LANÇAMENTOS BANCÁRIOS CRÉDITO (BANRAZ C)
-- ═══════════════════════════════════════════════════════════
SELECT
  B.DATDOC  AS DATA_EMISSAO,
  B.DATCOM  AS DATA_VENCIMENTO,
  B.DATCOM  AS DATA_PAGAMENTO,
  B.CODCLIFOR AS COD_PARCEIRO,
  NULL        AS NOME_PARCEIRO,
  NULL        AS SERIE,
  B.NUMDOC    AS DOCUMENTO,
  NULL        AS PARCELA,
  B.TIPDOC    AS TIPO_DOCUMENTO,
  'LB_C'      AS ORIGEM,
  B.SITUAC    AS SITUACAO,
  NULL AS DESCAN, NULL AS DESISS,
  NULL AS VLRCOR, NULL AS VLRJUR, NULL AS VLRDES,
  CAST(ROUND(B.VLRDOC, 2) AS DECIMAL(18,2)) AS VLRDOC,
  NULL AS VLR_LIQUIDO,
  CAST(ROUND((RAT.VALOR/B.VLRDOC)*CASE WHEN B.DATCOM IS NULL THEN 0 ELSE B.VLRDOC END,2) AS DECIMAL(18,2)) AS VLR_PAGO,
  CAST(ROUND((RAT.VALOR/B.VLRDOC)*CASE WHEN B.DATCOM IS NULL THEN 0 ELSE B.VLRDOC END,2) AS DECIMAL(18,2)) AS VLR_PARCELA,
  NULL AS JURDOC,
  B.CODFIL  AS FILIAL,
  F.CODEMP  AS EMPRESA,
  RAT.CODCGA, CGA.DESCRI AS CENTRO_GASTO,
  RAT.CODCUS, CUS.DESCRI AS CENTRO_CUSTO,
  RAT.SINTET, CLA_SINTET.DESCRI AS SINTETICA,
  RAT.ANALIT, CLA_ANALIT.DESCRI AS ANALITICA
FROM BANRAZ B
  LEFT JOIN BANHIS  H          ON H.CODHISBC  = B.CODHISBC
  LEFT JOIN BANRNF  N          ON N.ID_RAZ    = B.ID_RAZ
  LEFT JOIN BANRAT  RAT        ON RAT.NUMDOC  = B.NUMDOC AND RAT.CODCTA = B.CODCTA AND RAT.CODFIL = B.CODFIL AND RAT.ID_RAZ = B.ID_RAZ
  LEFT JOIN PAGCLA  CLA_ANALIT ON CLA_ANALIT.CODCLAP = RAT.ANALIT
  LEFT JOIN PAGCLA  CLA_SINTET ON CLA_SINTET.CODCLAP = RAT.SINTET
  LEFT JOIN RODCUS  CUS        ON RAT.CODCUS  = CUS.CODCUS
  LEFT JOIN RODCGA  CGA        ON RAT.CODCGA  = CGA.CODCGA
  LEFT JOIN RODFIL  F          ON B.CODFIL    = F.CODFIL
WHERE H.TRANSF = 'N'
  AND B.ORIGEM = 'LB'
  AND B.CODFIL = F.CODFIL
  AND B.SITUAC = 'O'
  AND B.VLRDOC > 0
  AND B.CODCTA NOT IN ('BX-FORNEC')
  AND B.TIPDOC NOT IN ('ADF','ADL','TRA','ADC')
  AND B.DEBCRE = 'C'
  AND B.DATDOC BETWEEN @dataInicio AND @dataFim
  AND (@filial  IS NULL OR B.CODFIL  = @filial)
  AND (@empresa IS NULL OR F.CODEMP  = @empresa)
        `;

        const result = await dbReq.query(query);
        return respond({ data: result.recordset });
      }

      return respond({ error: "action inválida. Use 'fetch' ou 'filters'" }, 400);
    } finally {
      await pool.close();
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erro interno no servidor";
    console.error("[dw-financeiro]", message);
    return respond({ error: message }, 500);
  }
});
