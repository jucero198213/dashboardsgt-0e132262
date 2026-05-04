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
