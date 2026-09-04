// Testa o processamento MB localmente, usando o e-mail BAIXA MB da caixa.
// Uso: node scripts/testar-receitaflow.js
//
// Puxa o e-mail BAIXA MB não lido, extrai anexo + campos do corpo, roda o
// processamento e mostra o resultado (documentos, total, divergência).
// NÃO marca o e-mail como lido e NÃO envia nada pro Rodopar — é só teste.

require('dotenv').config();
const imap = require('../modules/imap-watcher');
const parser = require('../modules/email-parser');
const rf = require('../modules/receitaflow');

async function main() {
  console.log('\n━━━ Buscando e-mail BAIXA MB ━━━');
  const emails = await imap.buscarEmailsMB();
  if (!emails.length) {
    console.log('⚠️  Nenhum e-mail BAIXA MB não lido encontrado. Envie o e-mail de teste e rode de novo.\n');
    process.exit(1);
  }

  const email = emails[0];
  console.log(`✓ E-mail: "${email.assunto}" — anexo: ${email.nomeAnexo || 'NENHUM'}`);

  console.log('\n━━━ Lendo anexo e campos do corpo ━━━');
  const dados = parser.parse(email);
  if (!dados.ok) {
    console.log(`✗ ${dados.erro}\n`);
    console.log('--- CORPO LIDO (para diagnóstico) ---');
    console.log(email.corpo ? email.corpo.slice(0, 600) : '(CORPO VAZIO)');
    console.log('--- FIM DO CORPO ---\n');
    process.exit(1);
  }
  console.log(`✓ DATA_RECEBIMENTO: ${dados.dataRecebimento}`);
  console.log(`✓ DATA_VENCIMENTO:  ${dados.dataVencimento}`);
  console.log(`✓ VALOR_BANCO:      ${dados.valorBanco}`);
  console.log(`✓ Anexo salvo em:   ${dados.caminhoAnexo}`);

  console.log('\n━━━ Processando (mesma lógica do ReceitaFlow) ━━━');
  const res = rf.processarMB({
    caminhoAnexo: dados.caminhoAnexo,
    dataVencimento: dados.dataVencimento,
    valorBanco: dados.valorBanco,
  });

  console.log('');
  if (res.ok) {
    console.log('✅ PROCESSOU SEM DIVERGÊNCIA');
    console.log(`   Documentos gerados: ${res.totalDocumentos}`);
    console.log(`   Valor total:        R$ ${res.totalValorBruto.toFixed(2)}`);
    console.log(`   Aba da planilha:    "${res.nomeAba}"  ← vai no campo "Nome da Planilha" do Rodopar`);
    console.log(`   Planilha de baixa:  ${res.caminhoSaida}`);
    console.log('\n   👉 Abra essa planilha no Excel e confira se está igual à baixa que você geraria manualmente.\n');
  } else if (res.divergencia) {
    console.log('⚠️  DIVERGÊNCIA DETECTADA (a automação PARARIA aqui e avisaria pra fazer manual):');
    console.log('   ' + res.detalhe.replace(/\n/g, '\n   '));
    console.log('');
  } else {
    console.log(`✗ ERRO: ${res.detalhe}\n`);
  }
  process.exit(0);
}

main().catch((err) => {
  console.error('FATAL:', err.message);
  process.exit(1);
});
