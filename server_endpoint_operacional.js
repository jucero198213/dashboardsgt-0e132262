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
