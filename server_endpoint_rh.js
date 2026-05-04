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
