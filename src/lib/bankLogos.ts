// Mapeia nome/código de banco para domínio (Clearbit Logo API)
// https://logo.clearbit.com/{domain} retorna o logotipo oficial em PNG.

const BY_CODE: Record<string, string> = {
  "001": "bb.com.br",
  "033": "santander.com.br",
  "104": "caixa.gov.br",
  "237": "bradesco.com.br",
  "341": "itau.com.br",
  "356": "bradesco.com.br",
  "389": "mercantil.com.br",
  "399": "hsbc.com.br",
  "422": "safra.com.br",
  "453": "rural.com.br",
  "633": "rendimento.com.br",
  "652": "itau.com.br",
  "745": "citibank.com.br",
  "041": "banrisul.com.br",
  "070": "brb.com.br",
  "077": "bancointer.com.br",
  "212": "original.com.br",
  "260": "nubank.com.br",
  "290": "pagseguro.uol.com.br",
  "323": "mercadopago.com.br",
  "336": "c6bank.com.br",
  "208": "btgpactual.com",
  "655": "votorantim.com.br",
  "748": "sicredi.com.br",
  "756": "sicoob.com.br",
  "136": "unicred.com.br",
  "085": "ailos.coop.br",
  "318": "bmg.com.br",
  "246": "abcbrasil.com.br",
};

const BY_NAME: Array<[RegExp, string]> = [
  [/itau|ita[uú]/i, "itau.com.br"],
  [/bradesco/i, "bradesco.com.br"],
  [/santander/i, "santander.com.br"],
  [/caixa|cef/i, "caixa.gov.br"],
  [/banco\s*do\s*brasil|^bb\b/i, "bb.com.br"],
  [/sicoob/i, "sicoob.com.br"],
  [/sicredi/i, "sicredi.com.br"],
  [/nubank|nu\s*pagamentos/i, "nubank.com.br"],
  [/inter/i, "bancointer.com.br"],
  [/safra/i, "safra.com.br"],
  [/btg/i, "btgpactual.com"],
  [/banrisul/i, "banrisul.com.br"],
  [/original/i, "original.com.br"],
  [/c6/i, "c6bank.com.br"],
  [/bmg/i, "bmg.com.br"],
  [/votorantim|^bv\b/i, "votorantim.com.br"],
  [/citi/i, "citibank.com.br"],
  [/hsbc/i, "hsbc.com.br"],
  [/pagseguro|pagbank/i, "pagseguro.uol.com.br"],
  [/mercado\s*pago/i, "mercadopago.com.br"],
  [/abc\s*brasil/i, "abcbrasil.com.br"],
  [/unicred/i, "unicred.com.br"],
  [/ailos/i, "ailos.coop.br"],
  [/brb/i, "brb.com.br"],
];

export function getBankLogoUrl(nome?: string | null, codigo?: string | null): string | null {
  if (codigo) {
    const code = String(codigo).padStart(3, "0");
    if (BY_CODE[code]) return `https://logo.clearbit.com/${BY_CODE[code]}`;
  }
  if (nome) {
    for (const [re, dom] of BY_NAME) {
      if (re.test(nome)) return `https://logo.clearbit.com/${dom}`;
    }
  }
  return null;
}
