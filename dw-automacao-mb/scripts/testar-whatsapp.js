// Testa o envio de aviso via Sofia/WhatsApp (Fase 2) — com diagnóstico.
// Uso: node scripts/testar-whatsapp.js
// Mostra o resultado número a número (útil pra saber se o template já aprovou).

require('dotenv').config();

async function main() {
  const url = process.env.SOFIA_NOTIFY_URL;
  const key = process.env.AUTOMACAO_NOTIFY_KEY || '';

  console.log('\n━━━ Teste WhatsApp (Sofia) — Fase 2 ━━━');
  console.log(`URL:   ${url || '(VAZIO — configure no .env)'}`);
  console.log(`Chave: ${key ? '(definida)' : '(FALTANDO)'}`);
  if (!url) {
    console.log('\n⚠️  SOFIA_NOTIFY_URL vazio no .env.\n');
    return;
  }
  if (typeof fetch === 'undefined') {
    console.log('\n⚠️  fetch indisponível (requer Node 18+).\n');
    return;
  }

  console.log('\nChamando a Edge Function...');
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-automacao-key': key },
    body: JSON.stringify({
      mensagem: '🧪 Teste da Fase 2 — se você recebeu, a Sofia está avisando as baixas MB pelo WhatsApp.',
    }),
  });

  const texto = await res.text();
  console.log(`\nHTTP ${res.status}`);

  let json;
  try { json = JSON.parse(texto); } catch { console.log(texto); return; }

  if (Array.isArray(json.resultados)) {
    console.log('Resultado por número:');
    for (const r of json.resultados) {
      const marca = r.ok ? '✓ aceito' : '✗ FALHOU';
      console.log(`  ${marca}  ${r.to}`);
      if (!r.ok) console.log(`           → ${r.resp}`);
    }
    const todosOk = json.resultados.every((r) => r.ok);
    console.log(
      todosOk
        ? '\n✅ Todos aceitos pela Meta. Confira se chegou nos 3 WhatsApp.'
        : '\n⚠️  Algum número falhou. Se o erro fala de template, ele ainda não foi APROVADO (aguarde sair de análise).'
    );
  } else {
    console.log(JSON.stringify(json, null, 2));
  }
  console.log('');
}

main().catch((err) => console.error('FATAL:', err.message));
