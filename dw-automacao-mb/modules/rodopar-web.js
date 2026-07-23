const { chromium } = require('playwright');
const log = require('./logger');

const RDP_URL      = process.env.RDP_URL      || 'https://webcloud2.datapardc.com';
const RDP_WEB_USER = process.env.RDP_WEB_USER;
const RDP_WEB_PASS = process.env.RDP_WEB_PASS;

// Faz login no Rodopar web (telas 1-3) e aguarda o Citrix carregar.
// Retorna { browser, page, fechar } — o chamador deve fechar o browser quando terminar.
async function loginWeb() {
  log.info('Rodopar-web: abrindo Chrome em modo visível...');

  const browser = await chromium.launch({
    headless: false,
    args: ['--start-maximized'],
  });

  const context = await browser.newContext({ viewport: null });
  const page = await context.newPage();

  try {
    // ── Tela 1: login web (Citrix StoreFront) ────────────────
    // Seletores reais confirmados por inspeção do DOM:
    //   Usuário: #Editbox1 (name=username) · Senha: #Editbox2 (name=Password)
    //   Login:   #buttonLogOn
    log.info('Rodopar-web: navegando para o login...');
    await page.goto(RDP_URL, { waitUntil: 'networkidle', timeout: 30000 });

    await page.locator('#Editbox1').waitFor({ timeout: 20000 });
    await page.locator('#Editbox1').fill(RDP_WEB_USER);
    await page.locator('#Editbox2').fill(RDP_WEB_PASS);
    await page.locator('#buttonLogOn').click();
    log.info('Rodopar-web: login enviado, aguardando próxima tela...');
    await page.waitForLoadState('networkidle', { timeout: 20000 });

    // ── Tela 2: aviso legal ─────────────────────────────────
    // Clica OK se o aviso aparecer (aparece um dialog/modal com botão OK)
    const btnOk = page.locator('button:has-text("OK"), input[value="OK"]').first();
    if (await btnOk.isVisible({ timeout: 8000 }).catch(() => false)) {
      log.info('Rodopar-web: aviso legal — clicando OK...');
      await btnOk.click();
      await page.waitForLoadState('networkidle', { timeout: 20000 });
    }

    // ── Tela 3: menu Citrix — clicar PROD_SGT ───────────────
    log.info('Rodopar-web: aguardando menu de aplicativos (PROD_SGT)...');
    await page.waitForSelector('text=PROD_SGT', { timeout: 30000 });
    await page.locator('text=PROD_SGT').first().click();
    log.info('Rodopar-web: PROD_SGT clicado — aguardando Citrix HTML5 inicializar...');

    // Aguarda o canvas do Citrix aparecer (indica que a sessão está carregando)
    await page.waitForSelector('canvas', { timeout: 60000 });
    log.info('Rodopar-web: canvas Citrix detectado, aguardando app Visual Rodopar...');

    // Tempo extra para o app Windows dentro do Citrix terminar de renderizar
    await page.waitForTimeout(20000);
    log.info('Rodopar-web: Citrix pronto — passando controle para o bot PyAutoGUI');

    return {
      browser,
      page,
      fechar: async () => { try { await browser.close(); } catch (_) {} },
    };

  } catch (err) {
    try { await browser.close(); } catch (_) {}
    throw err;
  }
}

module.exports = { loginWeb };
