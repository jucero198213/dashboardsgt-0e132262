const fetch = require('node-fetch');
const log = require('./logger');

const ENDPOINT = process.env.SOFIA_ENDPOINT || 'http://localhost:3001';
const NUMEROS = (process.env.WHATSAPP_NUMEROS || '').split(',').map(n => n.trim()).filter(Boolean);

async function enviar(mensagem) {
  if (!NUMEROS.length) {
    log.warn('Notifier: nenhum número WhatsApp configurado em WHATSAPP_NUMEROS');
    return;
  }
  for (const numero of NUMEROS) {
    try {
      const res = await fetch(`${ENDPOINT}/api/whatsapp/enviar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ numero, mensagem }),
      });
      if (!res.ok) {
        log.warn(`Notifier: falha ao notificar ${numero} — HTTP ${res.status}`);
      } else {
        log.info(`Notifier: mensagem enviada para ${numero}`);
      }
    } catch (err) {
      log.error(`Notifier: erro ao chamar Sofia — ${err.message}`);
    }
  }
}

async function sucesso(valor, dataRecebimento) {
  await enviar(`✅ *Baixa MB concluída com sucesso!*\n💰 Valor: R$ ${valor}\n📅 Data: ${dataRecebimento}`);
}

async function divergencia(detalhe) {
  await enviar(`⚠️ *Baixa MB — Divergência no ReceitaFlow*\n\n${detalhe}\n\nProcesso precisa ser feito manualmente.`);
}

async function erro(etapa, detalhe) {
  await enviar(`❌ *Baixa MB — Erro na etapa: ${etapa}*\n\n${detalhe}\n\nVerifique os logs na máquina DW.`);
}

async function emailInvalido(motivo) {
  await enviar(`📧 *Baixa MB — E-mail inválido*\n\n${motivo}\n\nReenvie o e-mail com o formato correto.`);
}

module.exports = { enviar, sucesso, divergencia, erro, emailInvalido };
