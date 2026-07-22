const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const log = require('./logger');

const RF_URL  = process.env.RF_URL  || 'https://receitaflow.com/cliente/martin-brower';
const RF_USER = process.env.RF_USER;
const RF_PASS = process.env.RF_PASS;
const DOWNLOADS_DIR = process.env.DOWNLOADS_DIR || path.join(__dirname, '..', 'downloads');

async function processarMB({ caminhoAnexo, dataRecebimento, dataVencimento, valorBanco }) {
  log.info('ReceitaFlow: iniciando processamento MB...');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ acceptDownloads: true });
  const page = await context.newPage();

  try {
    await page.goto(RF_URL, { waitUntil: 'networkidle', timeout: 30000 });

    // Login se necessário (verifica se há campo de login na página)
    const loginField = page.locator('input[type="email"], input[name="email"], input[placeholder*="email" i]').first();
    if (await loginField.isVisible({ timeout: 3000 }).catch(() => false)) {
      log.info('ReceitaFlow: realizando login...');
      await loginField.fill(RF_USER);
      await page.locator('input[type="password"]').first().fill(RF_PASS);
      await page.locator('button[type="submit"], button:has-text("Entrar"), button:has-text("Login")').first().click();
      await page.waitForLoadState('networkidle', { timeout: 15000 });
    }

    // Aguarda o formulário do MB estar visível
    await page.waitForLoadState('networkidle', { timeout: 20000 });
    log.info('ReceitaFlow: página carregada, preenchendo formulário...');

    // Upload da planilha
    const fileInput = page.locator('input[type="file"]').first();
    await fileInput.waitFor({ timeout: 15000 });
    await fileInput.setInputFiles(caminhoAnexo);
    log.info('ReceitaFlow: planilha enviada');

    // Data Recebimento
    const campoDataRec = page.locator('input[placeholder*="recebimento" i], label:has-text("Recebimento") + input, label:has-text("Recebimento") ~ input').first();
    await campoDataRec.fill(dataRecebimento);

    // Data Vencimento / Pagamento
    const campoDataVenc = page.locator('input[placeholder*="vencimento" i], input[placeholder*="pagamento" i], label:has-text("Vencimento") + input, label:has-text("Vencimento") ~ input, label:has-text("Pagamento") + input, label:has-text("Pagamento") ~ input').first();
    await campoDataVenc.fill(dataVencimento);

    // Valor Banco
    const campoValor = page.locator('input[placeholder*="valor" i], label:has-text("Valor") + input, label:has-text("Valor") ~ input').first();
    await campoValor.fill(valorBanco);

    log.info('ReceitaFlow: formulário preenchido, clicando Processar...');

    // Clica em Processar e aguarda resultado
    const [downloadEvt] = await Promise.all([
      context.waitForEvent('download', { timeout: 60000 }).catch(() => null),
      page.locator('button:has-text("Processar"), input[value="Processar"]').first().click(),
    ]);

    // Aguarda qualquer resposta (download ou mensagem de erro)
    await page.waitForTimeout(3000);

    // Verifica divergência/erro na página
    const textoErro = await page.evaluate(() => {
      const seletores = [
        '.alert-danger', '.error', '.divergencia', '[class*="error"]',
        '[class*="alert"]', '[class*="divergen"]',
      ];
      for (const sel of seletores) {
        const el = document.querySelector(sel);
        if (el && el.innerText.trim()) return el.innerText.trim();
      }
      // Busca por texto "divergência" em qualquer lugar
      const body = document.body.innerText;
      const match = body.match(/divergên[^.!?\n]{0,200}/i);
      return match ? match[0] : null;
    });

    if (textoErro) {
      log.warn(`ReceitaFlow: divergência detectada — ${textoErro}`);
      return { ok: false, divergencia: true, detalhe: textoErro };
    }

    if (!downloadEvt) {
      // Tenta achar botão de download explícito
      const btnDownload = page.locator('a[download], button:has-text("Baixar"), a:has-text("Baixar"), a:has-text("Download")').first();
      if (await btnDownload.isVisible({ timeout: 5000 }).catch(() => false)) {
        const [dl] = await Promise.all([
          context.waitForEvent('download', { timeout: 30000 }),
          btnDownload.click(),
        ]);
        const campoSaida = await salvarDownload(dl);
        return { ok: true, caminhoSaida: campoSaida };
      }
      log.warn('ReceitaFlow: sem download e sem divergência detectada');
      return { ok: false, divergencia: false, detalhe: 'ReceitaFlow não gerou planilha nem indicou erro.' };
    }

    const caminhoSaida = await salvarDownload(downloadEvt);
    log.info(`ReceitaFlow: planilha baixada em ${caminhoSaida}`);
    return { ok: true, caminhoSaida };

  } catch (err) {
    log.error(`ReceitaFlow: erro inesperado — ${err.message}`);
    return { ok: false, divergencia: false, detalhe: err.message };
  } finally {
    await browser.close();
  }
}

async function salvarDownload(download) {
  if (!fs.existsSync(DOWNLOADS_DIR)) fs.mkdirSync(DOWNLOADS_DIR, { recursive: true });
  const ts = Date.now();
  const suggestedName = download.suggestedFilename() || `mb_saida_${ts}.xlsx`;
  const destino = path.join(DOWNLOADS_DIR, `mb_saida_${ts}_${suggestedName}`);
  await download.saveAs(destino);
  return destino;
}

module.exports = { processarMB };
