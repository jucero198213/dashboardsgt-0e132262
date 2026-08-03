"""
rodopar_bot.py — Automação Rodopar via TECLADO + 6 cliques fixos (PWA).

Fluxo: login web (Tab/Enter) ->PROD_SGT (clique) ->login app (Tab/Enter) ->
upload planilha pro WebFile (TSplus toolbar, cliques) ->Ctrl+A (Aviso Bancário) ->
preencher aba 1 por Tab ->aba 2 Itens ->importar (Alt+I) ->"..." (clique) ->
digitar caminho WebFile ->processar ->aguardar ->cancelar ->Fecha Aviso (clique).

Detecção de troca de senha obrigatória: se aparecer após qualquer login,
notifica e PARA (exit code 2).

Coordenadas dos 6 cliques vêm de coordenadas.json (gerado por calibrar_teclado.py).

Uso:
  python rodopar_bot.py --data-aviso 22/07/2026 --valor 2576896,75 \
                        --planilha "C:\\automacao-mb\\downloads\\mb_baixa_X.xlsx" \
                        --nome-planilha DOCUMENTO
"""

import argparse
import json
import os
import sys
import time
import subprocess

try:
    from dotenv import load_dotenv
    load_dotenv(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '.env'))
except ImportError:
    pass

try:
    import pyautogui
    import pyperclip
except ImportError:
    print("ERRO: pip install pyautogui pyperclip pillow", file=sys.stderr)
    sys.exit(1)

pyautogui.FAILSAFE = True
pyautogui.PAUSE = 0.3

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
BASE_DIR = os.path.join(SCRIPT_DIR, '..')
COORDS_FILE = os.path.join(BASE_DIR, 'coordenadas.json')
IMG_DIR = os.path.join(BASE_DIR, 'img')

EXIT_OK = 0
EXIT_ERRO = 1
EXIT_TROCA_SENHA = 2
EXIT_INCONSISTENTE = 3

UPLOAD_ESPERA = 120
IMPORT_ESPERA = 120
MSG_ENTER_MAX = 10
MSG_ENTER_INTERVALO = 2

COORDS_KEYS = [
    'prod_sgt',
    'toolbar_toggle',
    'toolbar_upload',
    'upload_dropzone',
    'upload_close',
    'btn_reticencias',
    'webfile_folder',
    'webfile_file',
    'btn_fecha_aviso',
    'btn_sair',
    'btn_logoff',
]


# ── Helpers ──────────────────────────────────────────────────

def log(msg):
    print(f"  >> {msg}")


def esperar(segundos, motivo=''):
    if motivo:
        log(f"Aguardando {segundos}s — {motivo}")
    time.sleep(segundos)


def digitar(texto, colar=True):
    """Digita texto. colar=True usa clipboard (Ctrl+V), bom pra browser.
    colar=False digita tecla por tecla, necessário dentro do TSplus."""
    texto = str(texto)
    if colar:
        pyperclip.copy(texto)
        pyautogui.hotkey('ctrl', 'v')
    else:
        for c in texto:
            if c.isupper():
                pyautogui.hotkey('shift', c.lower())
            else:
                pyautogui.write(c, interval=0)
            time.sleep(0.03)
    time.sleep(0.3)


def tab(n=1):
    for _ in range(n):
        pyautogui.press('tab')
        time.sleep(0.2)


def enter():
    pyautogui.press('enter')
    time.sleep(0.3)


def hotkey(*keys):
    pyautogui.hotkey(*keys)
    time.sleep(0.3)


def clicar(coords, key):
    x, y = coords[key]
    log(f"Clique: {key} ({x}, {y})")
    pyautogui.click(x, y)
    time.sleep(0.5)


def env(var):
    val = os.environ.get(var, '').strip()
    if not val:
        print(f"ERRO: variável de ambiente {var} não configurada", file=sys.stderr)
        sys.exit(EXIT_ERRO)
    return val


# ── Coordenadas ──────────────────────────────────────────────

def carregar_coords():
    if not os.path.exists(COORDS_FILE):
        print(f"ERRO: {COORDS_FILE} não existe. Rode: python scripts/calibrar_teclado.py", file=sys.stderr)
        sys.exit(EXIT_ERRO)
    with open(COORDS_FILE, encoding='utf-8') as f:
        coords = json.load(f)
    faltando = [k for k in COORDS_KEYS if k not in coords]
    if faltando:
        print(f"ERRO: coordenadas faltando: {', '.join(faltando)}. Rode: python scripts/calibrar_teclado.py", file=sys.stderr)
        sys.exit(EXIT_ERRO)
    return coords


# ── Detecção de troca de senha ───────────────────────────────

def detectar_troca_senha(tela):
    """Procura a imagem de referência da tela de troca de senha.
    Retorna True se encontrada. Se a imagem de referência não existir, pula."""
    img_path = os.path.join(IMG_DIR, f'troca_senha_{tela}.png')
    if not os.path.exists(img_path):
        log(f"Imagem de referência {img_path} não existe — pulando detecção de troca de senha ({tela})")
        return False
    try:
        loc = pyautogui.locateOnScreen(img_path, confidence=0.8)
        if loc:
            log(f"ALERTA:TROCA DE SENHA DETECTADA ({tela})!")
            return True
    except Exception as e:
        log(f"Erro na detecção de troca de senha ({tela}): {e}")
    return False


def sair_troca_senha(tela):
    msg = f"TROCA_SENHA: Rodopar exigiu troca de senha ({tela}). Atualize a senha manualmente e altere o .env."
    print(msg, file=sys.stderr)
    sys.exit(EXIT_TROCA_SENHA)


def detectar_inconsistente():
    """Verifica se o campo Situação mostra 'Inconsistente' após importação."""
    img_path = os.path.join(IMG_DIR, 'inconsistente.png')
    if not os.path.exists(img_path):
        log(f"Imagem de referência {img_path} não existe — pulando verificação de inconsistência")
        return False
    try:
        loc = pyautogui.locateOnScreen(img_path, confidence=0.8)
        if loc:
            log("ALERTA:INCONSISTÊNCIA DETECTADA no campo Situação!")
            return True
    except Exception as e:
        log(f"Erro na detecção de inconsistência: {e}")
    return False


def sair_inconsistente():
    msg = "INCONSISTENTE: Importação resultou em Situação 'Inconsistente'. Verificar manualmente no Rodopar."
    print(msg, file=sys.stderr)
    sys.exit(EXIT_INCONSISTENTE)


# ── Abrir PWA ────────────────────────────────────────────────

def abrir_pwa(url):
    """Abre o Rodopar em modo PWA (Chrome --app) com janela fixa."""
    log(f"Abrindo PWA: {url}")
    subprocess.Popen(
        f'start "" "chrome" --app="{url}" --window-position=0,0 --window-size=1920,1080',
        shell=True
    )


# ── Upload pro WebFile (TSplus File Transfer) ────────────────

def upload_webfile(coords, caminho_local):
    """Usa a barra do TSplus pra fazer upload do arquivo pro WebFile."""
    log(f"Upload pro WebFile: {caminho_local}")

    clicar(coords, 'toolbar_toggle')
    esperar(1, "toolbar expandindo")

    clicar(coords, 'toolbar_upload')
    esperar(2, "File Transfer abrindo")

    clicar(coords, 'upload_dropzone')
    esperar(2, "diálogo de arquivo abrindo")

    digitar(caminho_local)
    esperar(0.5)
    enter()
    esperar(UPLOAD_ESPERA, "arquivo sendo enviado pro WebFile (~2 min)")

    clicar(coords, 'upload_close')
    esperar(1, "fechando File Transfer")


# ── Preenchimento Aba 1 (Aviso Bancário) ─────────────────────

def preencher_aba1(data_aviso, valor, conta='79235-7', filial='1',
                   tipo_doc='AVI', hist_bancario='1', complemento='Baixa MB'):
    log("Preenchendo Aba 1 — Aviso Bancário")
    R = False  # dentro do TSplus: digitar tecla por tecla

    digitar(conta, colar=R)
    tab(2)

    digitar(filial, colar=R)
    tab()

    digitar(data_aviso, colar=R)
    tab(2)

    digitar(tipo_doc, colar=R)
    tab()

    digitar(hist_bancario, colar=R)
    tab()

    digitar(valor, colar=R)
    tab(2)

    digitar(complemento, colar=R)
    log("Aba 1 preenchida")


# ── Importação da planilha ───────────────────────────────────

def importar_planilha(coords, nome_planilha):
    """Navega pra aba Itens, abre importação, seleciona arquivo via WebFile e processa."""
    log("Indo pra Aba 2 -- Itens do Aviso")
    tab()
    enter()
    tab(2)
    esperar(2, "aba Itens carregando")

    log("Abrindo dialogo de importacao (Alt+I x3 -> Enter)")
    hotkey('alt', 'i')
    esperar(0.5)
    hotkey('alt', 'i')
    esperar(0.5)
    hotkey('alt', 'i')
    esperar(0.5)
    enter()
    esperar(3, "dialogo de importacao abrindo")

    log("Selecionando arquivo via '...' -> WebFile")
    clicar(coords, 'btn_reticencias')
    esperar(3, "seletor de arquivo abrindo")

    log("Clicando na pasta WebFile")
    clicar(coords, 'webfile_folder')
    esperar(2, "pasta WebFile abrindo")

    log("Duplo clique no arquivo (unico na pasta)")
    x, y = coords['webfile_file']
    pyautogui.doubleClick(x, y)
    esperar(2, "arquivo selecionado")

    log("Preenchendo nome da planilha")
    hotkey('shift', 'tab')
    hotkey('ctrl', 'a')
    time.sleep(0.2)
    digitar(nome_planilha, colar=False)
    tab(2)
    enter()
    log(f"Processando importacao -- aguardando {IMPORT_ESPERA}s")
    esperar(IMPORT_ESPERA, "documentos importando (~2 min)")

    log("Fechando dialogo (Tab -> Enter = Cancelar)")
    tab()
    enter()
    esperar(2, "dialogo fechando")


# ── Fecha Aviso + mensagens variáveis ────────────────────────

def fechar_aviso(coords):
    log("Clicando Fecha Aviso")
    clicar(coords, 'btn_fecha_aviso')
    esperar(3, "aviso sendo fechado")

    log(f"Confirmando mensagens (até {MSG_ENTER_MAX} Enters)")
    for i in range(MSG_ENTER_MAX):
        enter()
        time.sleep(MSG_ENTER_INTERVALO)


# ── Logoff ───────────────────────────────────────────────────

def fazer_logoff(coords):
    """Clica em Sair -> Logoff e fecha o PWA."""
    log("Fazendo logoff do Rodopar")
    clicar(coords, 'btn_sair')
    esperar(1, "menu Sair expandindo")
    clicar(coords, 'btn_logoff')
    esperar(3, "logoff processando")
    enter()
    esperar(2)

    log("Fechando PWA (Alt+F4)")
    hotkey('alt', 'F4')
    esperar(2, "PWA fechando")


# ── Main ─────────────────────────────────────────────────────

def main(args):
    coords = carregar_coords()

    rdp_url = env('RDP_URL')
    rdp_web_user = env('RDP_WEB_USER')
    rdp_web_pass = env('RDP_WEB_PASS')
    rdp_app_user = env('RDP_APP_USER')
    rdp_app_pass = env('RDP_APP_PASS')

    print("=" * 60)
    print(f"  Rodopar Bot -- {args.complemento} (Teclado)")
    print(f"  Data Aviso  : {args.data_aviso}")
    print(f"  Valor       : {args.valor}")
    print(f"  Planilha    : {args.planilha}")
    print(f"  Nome aba    : {args.nome_planilha}")
    print(f"  Complemento : {args.complemento}")
    print(f"  Conta       : {args.conta}")
    print(f"  Filial      : {args.filial}")
    print(f"  Tipo Doc    : {args.tipo_doc}")
    print(f"  Hist Banc   : {args.hist_bancario}")
    print("=" * 60)

    # ── 1. Abrir PWA ─────────────────────────────────────────
    print("\n[1/10] Abrindo Rodopar (PWA)...")
    abrir_pwa(rdp_url)
    esperar(12, "PWA carregando página de login")

    # ── 2. Login Web (teclado) ───────────────────────────────
    print("\n[2/10] Login web...")
    pyautogui.click(400, 400)
    esperar(1, "garantindo foco na página")
    tab()
    digitar(rdp_web_user)
    tab()
    digitar(rdp_web_pass)
    tab()
    enter()
    esperar(15, "página carregando após login web")

    # ── 3. Aviso legal ->Enter ───────────────────────────────
    print("\n[3/10] Aviso legal ->Enter...")
    enter()
    esperar(10, "menu de aplicativos carregando")

    # ── 4. PROD_SGT ->CLIQUE ────────────────────────────────
    print("\n[4/10] Abrindo PROD_SGT...")
    clicar(coords, 'prod_sgt')
    esperar(20, "Visual Rodopar inicializando")

    # ── 5. Verificar troca de senha (web) ────────────────────
    if detectar_troca_senha('web'):
        sair_troca_senha('web')

    # ── 6. Login App (teclado — dentro do TSplus, digita tecla por tecla) ──
    print("\n[5/10] Login Visual Rodopar...")
    digitar(rdp_app_user, colar=False)
    tab()
    digitar(rdp_app_pass, colar=False)
    tab()
    enter()
    esperar(5, "tela de filial carregando")

    # ── 7. Verificar troca de senha (app) ────────────────────
    if detectar_troca_senha('app'):
        sair_troca_senha('app')

    # ── 8. Filial ->Enter (Continuar) ────────────────────────
    print("\n[6/10] Selecione a Filial ->Enter...")
    enter()
    esperar(8, "menu principal carregando")

    # ── 9. Upload da planilha pro WebFile ────────────────────
    print("\n[7/10] Upload da planilha pro WebFile...")
    upload_webfile(coords, args.planilha)

    # ── 10. Ctrl+A ->Aviso Bancário ──────────────────────────
    print("\n[8/10] Abrindo Aviso Bancário (Ctrl+A)...")
    hotkey('ctrl', 'a')
    esperar(4, "tela Aviso Bancário carregando")

    # ── 11. Preencher Aba 1 ──────────────────────────────────
    print("\n[9/10] Preenchendo formulário...")
    preencher_aba1(
        data_aviso=args.data_aviso,
        valor=args.valor,
        conta=args.conta,
        filial=args.filial,
        tipo_doc=args.tipo_doc,
        hist_bancario=args.hist_bancario,
        complemento=args.complemento,
    )

    # ── 12. Importar planilha (Aba 2) ────────────────────────
    print("\n[10/10] Importando planilha...")
    importar_planilha(
        coords=coords,
        nome_planilha=args.nome_planilha,
    )

    # ── 13. Verificar Situacao ───────────────────────────────
    print("\n[VERIFICACAO] Checando campo Situacao...")
    esperar(3, "aguardando tela atualizar")
    if detectar_inconsistente():
        sair_inconsistente()

    # ── 14. Fecha Aviso ──────────────────────────────────────
    print("\n[FIM] Fechando aviso...")
    fechar_aviso(coords)

    # ── 15. Logoff (limpa WebFile pra proxima baixa) ─────────
    print("\n[LOGOFF] Encerrando sessao...")
    fazer_logoff(coords)

    print("\nOK: Rodopar Bot concluido com sucesso!")
    sys.exit(EXIT_OK)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Rodopar Bot — Baixa automática por teclado')
    parser.add_argument('--data-aviso', required=True, help='Data do aviso (DD/MM/AAAA)')
    parser.add_argument('--valor', required=True, help='Valor do banco (ex: 2576896,75)')
    parser.add_argument('--planilha', required=True, help='Caminho LOCAL da planilha .xlsx')
    parser.add_argument('--nome-planilha', default='DOCUMENTO', help='Nome da aba na planilha')
    parser.add_argument('--complemento', default='Baixa MB', help='Texto do campo Complemento')
    parser.add_argument('--conta', default='79235-7', help='Conta Corrente')
    parser.add_argument('--filial', default='1', help='Filial')
    parser.add_argument('--tipo-doc', default='AVI', help='Tipo de Doc. Bancário')
    parser.add_argument('--hist-bancario', default='1', help='Histórico Bancário')
    args = parser.parse_args()
    try:
        main(args)
    except pyautogui.FailSafeException:
        print("\nABORTADO: mouse movido pro canto (failsafe)", file=sys.stderr)
        sys.exit(EXIT_ERRO)
    except Exception as e:
        print(f"\nERRO: {e}", file=sys.stderr)
        sys.exit(EXIT_ERRO)
