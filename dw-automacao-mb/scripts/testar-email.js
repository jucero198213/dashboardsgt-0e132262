// Testa o envio de e-mail de notificação.
// Uso: node scripts/testar-email.js
// Envia um e-mail de teste para os endereços em EMAIL_NOTIF.

require('dotenv').config();
const notifier = require('../modules/notifier');

async function main() {
  const dest = (process.env.EMAIL_NOTIF || '').split(',').map((s) => s.trim()).filter(Boolean);
  console.log('\n━━━ Teste de e-mail de notificação ━━━');
  console.log(`Remetente:      ${process.env.IMAP_USER}`);
  console.log(`Destinatários:  ${dest.join(', ') || '(NENHUM — configure EMAIL_NOTIF)'}`);
  if (!dest.length) { process.exit(1); }

  console.log('\nEnviando e-mail de teste...');
  await notifier.enviarEmail(
    '🧪 Teste — Automação MB',
    'Este é um e-mail de teste da Automação MB.\n\nSe você recebeu, as notificações por e-mail estão funcionando.\n\n— Automação MB'
  );
  console.log('✓ Comando de envio concluído. Confira a caixa de entrada dos 3 endereços.\n');
  process.exit(0);
}

main().catch((err) => { console.error('FATAL:', err.message); process.exit(1); });
