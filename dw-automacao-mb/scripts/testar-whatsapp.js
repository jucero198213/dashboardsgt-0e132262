// Testa o envio de aviso via Sofia/WhatsApp (Fase 2) — isolado.
// Uso: node scripts/testar-whatsapp.js
// Requer: template automacao_baixa_mb APROVADO, números na allowlist da Meta,
//         e SOFIA_NOTIFY_URL + AUTOMACAO_NOTIFY_KEY no .env.

require('dotenv').config();
const notifier = require('../modules/notifier');

async function main() {
  console.log('\n━━━ Teste WhatsApp (Sofia) — Fase 2 ━━━');
  console.log(`URL:  ${process.env.SOFIA_NOTIFY_URL || '(VAZIO — configure no .env)'}`);
  console.log(`Chave: ${process.env.AUTOMACAO_NOTIFY_KEY ? '(definida)' : '(FALTANDO)'}`);
  if (!process.env.SOFIA_NOTIFY_URL) {
    console.log('\n⚠️  SOFIA_NOTIFY_URL vazio no .env. Preencha e rode de novo.\n');
    process.exit(1);
  }

  console.log('\nEnviando WhatsApp de teste pela Sofia...');
  await notifier.enviarWhatsApp(
    '🧪 Teste da Fase 2 — se você recebeu esta mensagem, a Sofia está avisando as baixas MB pelo WhatsApp com sucesso.'
  );
  console.log('✓ Comando enviado. Confira o WhatsApp dos números cadastrados.');
  console.log('  (Se não chegar: veja se o template está APROVADO e os números estão na allowlist da Meta.)\n');
  process.exit(0);
}

main().catch((err) => { console.error('FATAL:', err.message); process.exit(1); });
