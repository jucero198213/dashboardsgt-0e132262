// Teste de sanidade — valida .env e conexão com o Gmail.
// Uso: node scripts/testar-conexao.js
// NÃO imprime nenhuma senha, só confirma presença e conexão.

require('dotenv').config();
const imap = require('../modules/imap-watcher');

const OK = '✓';
const NO = '✗';

function checarVar(nome, { segredo = false } = {}) {
  const val = process.env[nome];
  const presente = !!val && val.trim().length > 0;
  const mostra = presente
    ? (segredo ? '(definido)' : val)
    : '(FALTANDO)';
  console.log(`  ${presente ? OK : NO} ${nome.padEnd(18)} ${mostra}`);
  return presente;
}

async function main() {
  console.log('\n━━━ 1. Verificando variáveis do .env ━━━');
  const vars = [
    ['IMAP_USER'],
    ['IMAP_PASS', { segredo: true }],
    ['RF_URL'],
    ['RF_USER'],
    ['RF_PASS', { segredo: true }],
    ['RDP_URL'],
    ['RDP_WEB_USER'],
    ['RDP_WEB_PASS', { segredo: true }],
    ['RDP_APP_USER'],
    ['RDP_APP_PASS', { segredo: true }],
    ['DOWNLOADS_DIR'],
    ['NOME_PLANILHA_MB'],
  ];
  let todasOk = true;
  for (const [nome, opts] of vars) {
    if (!checarVar(nome, opts)) todasOk = false;
  }

  if (!todasOk) {
    console.log('\n⚠️  Faltam variáveis no .env. Corrija antes de continuar.\n');
    process.exit(1);
  }

  console.log('\n━━━ 2. Testando conexão com o Gmail (IMAP) ━━━');
  console.log('  Conectando...');
  try {
    const emails = await imap.buscarEmailsMB();
    console.log(`  ${OK} Conexão com o Gmail funcionou!`);
    console.log(`  ${OK} E-mails "BAIXA MB" não lidos encontrados: ${emails.length}`);
    if (emails.length > 0) {
      emails.forEach((e, i) => {
        console.log(`      ${i + 1}. "${e.assunto}" — anexo: ${e.nomeAnexo || 'NENHUM'}`);
      });
    } else {
      console.log('      (Nenhum e-mail BAIXA MB não lido no momento — normal se você ainda não enviou o teste)');
    }
    console.log('\n✅ Tudo certo! Gmail conectado e .env válido.\n');
    process.exit(0);
  } catch (err) {
    console.log(`  ${NO} Falha na conexão: ${err.message}`);
    console.log('\n⚠️  Verifique:');
    console.log('     - O IMAP_USER está correto? (sgtrecebimento@gmail.com)');
    console.log('     - O IMAP_PASS é o App Password de 16 caracteres, sem espaços?');
    console.log('     - O IMAP está habilitado no Gmail? (Configurações → Encaminhamento e POP/IMAP)\n');
    process.exit(1);
  }
}

main();
