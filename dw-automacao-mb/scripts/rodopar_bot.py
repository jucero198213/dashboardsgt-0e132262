"""
rodopar_bot.py — PyAutoGUI para a parte Citrix do Rodopar

Uso:
  python rodopar_bot.py --data-aviso 22/07/2026 --valor 125432.50
                        --planilha "C:\downloads\mb_saida.xlsx"
                        --nome-planilha "Sheet1"

  python rodopar_bot.py --calibrate   # exibe posição do mouse a cada 1s

ATENÇÃO: Antes de usar em produção, execute --calibrate e atualize
         todas as constantes de coordenada abaixo (seção COORDENADAS).
"""

import argparse
import sys
import time
import subprocess
import os

try:
    import pyautogui
    import pyperclip
except ImportError:
    print("ERROR: execute: pip install pyautogui pyperclip pillow", file=sys.stderr)
    sys.exit(1)

pyautogui.FAILSAFE = True   # mover mouse pro canto superior esq. aborta o script
pyautogui.PAUSE = 0.3       # pausa entre cada ação (segurança)

# ════════════════════════════════════════════════════════════════
# COORDENADAS — CALIBRAR NA MÁQUINA DW
# Execute: python rodopar_bot.py --calibrate
# Passe o mouse sobre cada elemento e anote o (x, y)
# ════════════════════════════════════════════════════════════════

# ── Tela 4: Login Visual Rodopar (dentro do Citrix) ──────────
LOGIN_APP_USER_X, LOGIN_APP_USER_Y = 700, 350   # campo Login
LOGIN_APP_PASS_X, LOGIN_APP_PASS_Y = 700, 380   # campo Senha
LOGIN_APP_OK_X,   LOGIN_APP_OK_Y   = 660, 420   # botão OK

# ── Tela 5: Selecione a Filial ───────────────────────────────
FILIAL_CONTINUAR_X, FILIAL_CONTINUAR_Y = 620, 560   # botão Continuar

# ── Menu principal: Fluxo de Caixa ───────────────────────────
MENU_FLUXO_X,      MENU_FLUXO_Y      = 200, 120    # menu "Fluxo de Caixa"
MENU_MOVIMENT_X,   MENU_MOVIMENT_Y   = 220, 160    # submenu "Movimentação"
MENU_AVI_X,        MENU_AVI_Y        = 300, 200    # item "Baixa por Aviso Bancário"

# ── Formulário AVI (Aba 1 — Aviso Bancário) ──────────────────
AVI_CONTA_X,       AVI_CONTA_Y       = 700, 280    # Conta Corrente / Banco (79235-7)
AVI_DATA_AVISO_X,  AVI_DATA_AVISO_Y  = 700, 310    # Data do Aviso
AVI_DATA_REF_X,    AVI_DATA_REF_Y    = 700, 340    # Data de Referência
AVI_VALOR_X,       AVI_VALOR_Y       = 700, 370    # Valor

# ── Aba "Itens do Aviso" ─────────────────────────────────────
ABA_ITENS_X,       ABA_ITENS_Y       = 500, 220    # aba "Itens do Aviso"
BTN_IMPORTAR_X,    BTN_IMPORTAR_Y    = 750, 500    # botão "Importar Itens"
BTN_RETICENCIAS_X, BTN_RETICENCIAS_Y = 820, 380    # botão "..."
CAMPO_NOME_PLAN_X, CAMPO_NOME_PLAN_Y = 700, 420    # campo "Nome da Planilha"
BTN_PROCESSAR_X,   BTN_PROCESSAR_Y   = 750, 460    # botão "Processar" (importação)
BTN_CANCELAR_X,    BTN_CANCELAR_Y    = 830, 460    # botão "Cancelar" — fecha o diálogo após processar
BTN_FECHA_AVISO_X, BTN_FECHA_AVISO_Y = 860, 160    # botão "Fecha Aviso" na tela principal

IMPORTACAO_ESPERA = 70   # segundos de espera após Processar (documentos carregam ~1 min)

# ── Pasta WebFile na janela de seleção ───────────────────────
WEBFILE_X,         WEBFILE_Y         = 400, 350    # pasta "WebFile on U1UFF3QXTBHUO5"
ARQUIVO_ITEM_X,    ARQUIVO_ITEM_Y    = 400, 380    # arquivo dentro da pasta WebFile

# ── Área do canvas Citrix (para drag-and-drop do arquivo) ────
CITRIX_CANVAS_X,   CITRIX_CANVAS_Y   = 760, 400    # ponto central do canvas Citrix

# ════════════════════════════════════════════════════════════════

def calibrate_mode():
    print("Modo calibração — mova o mouse sobre cada elemento e anote o (x, y).")
    print("Pressione Ctrl+C para sair.\n")
    try:
        while True:
            x, y = pyautogui.position()
            print(f"\r  Mouse em: ({x:4d}, {y:4d})   ", end='', flush=True)
            time.sleep(0.5)
    except KeyboardInterrupt:
        print("\nCalibração encerrada.")


def clicar(x, y, descricao=''):
    if descricao:
        print(f"  >> Clicando {descricao} ({x}, {y})")
    pyautogui.click(x, y)
    time.sleep(0.5)


def digitar(texto, descricao=''):
    if descricao:
        print(f"  >> Digitando {descricao}: {texto}")
    pyperclip.copy(texto)
    pyautogui.hotkey('ctrl', 'v')
    time.sleep(0.3)


def aguardar(segundos, motivo=''):
    if motivo:
        print(f"  >> Aguardando {segundos}s — {motivo}")
    time.sleep(segundos)


def abrir_explorer_com_arquivo(caminho):
    """Abre o Explorer com o arquivo selecionado para facilitar o drag."""
    subprocess.Popen(f'explorer /select,"{caminho}"')
    aguardar(2, 'Explorer abrindo')


def drag_arquivo_para_citrix(caminho_arquivo):
    """
    Estratégia: abre Explorer com o arquivo, depois arrastar da posição do
    arquivo no Explorer até o canvas Citrix.
    NOTA: as coordenadas do arquivo no Explorer dependem de onde a janela abriu.
    Após calibração, atualize EXPLORER_ARQUIVO_X/Y abaixo.
    """
    EXPLORER_ARQUIVO_X = 300   # posição do ícone do arquivo no Explorer
    EXPLORER_ARQUIVO_Y = 200   # ← atualizar após calibração

    abrir_explorer_com_arquivo(caminho_arquivo)
    aguardar(2, 'Explorer pronto')

    print(f"  >> Arrastando arquivo para canvas Citrix ({CITRIX_CANVAS_X}, {CITRIX_CANVAS_Y})")
    pyautogui.moveTo(EXPLORER_ARQUIVO_X, EXPLORER_ARQUIVO_Y)
    pyautogui.mouseDown()
    aguardar(0.5)
    pyautogui.moveTo(CITRIX_CANVAS_X, CITRIX_CANVAS_Y, duration=1.5)
    pyautogui.mouseUp()
    aguardar(2, 'aguardando upload Citrix')


def main(args):
    data_aviso   = args.data_aviso
    valor        = args.valor
    planilha     = args.planilha
    nome_planilha = args.nome_planilha

    print("=" * 60)
    print(f"  Rodopar Bot — MB")
    print(f"  Data Aviso : {data_aviso}")
    print(f"  Valor      : {valor}")
    print(f"  Planilha   : {planilha}")
    print(f"  Nome aba   : {nome_planilha}")
    print("=" * 60)

    # ── Tela 4: Login Visual Rodopar ─────────────────────────
    print("\n[1/7] Login Visual Rodopar...")
    aguardar(5, 'garantindo que janela de login apareceu')

    clicar(LOGIN_APP_USER_X, LOGIN_APP_USER_Y, 'campo Login')
    pyautogui.hotkey('ctrl', 'a')
    digitar(os.environ.get('RDP_APP_USER', 'joao'), 'usuário app')

    clicar(LOGIN_APP_PASS_X, LOGIN_APP_PASS_Y, 'campo Senha')
    pyautogui.hotkey('ctrl', 'a')
    digitar(os.environ.get('RDP_APP_PASS', '123'), 'senha app')

    clicar(LOGIN_APP_OK_X, LOGIN_APP_OK_Y, 'OK login')
    aguardar(5, 'aguardando tela de filial')

    # ── Tela 5: Selecione a Filial ───────────────────────────
    print("\n[2/7] Selecione a Filial → Continuar...")
    clicar(FILIAL_CONTINUAR_X, FILIAL_CONTINUAR_Y, 'Continuar')
    aguardar(8, 'aguardando menu principal carregar')

    # ── Navegação: Fluxo de Caixa → AVI ─────────────────────
    print("\n[3/7] Navegando para Baixa por Aviso Bancário...")
    clicar(MENU_FLUXO_X, MENU_FLUXO_Y, 'menu Fluxo de Caixa')
    aguardar(1, 'submenu abrindo')
    clicar(MENU_MOVIMENT_X, MENU_MOVIMENT_Y, 'Movimentação')
    aguardar(1, 'submenu abrindo')
    clicar(MENU_AVI_X, MENU_AVI_Y, 'Baixa por Aviso Bancário')
    aguardar(4, 'formulário AVI carregando')

    # ── Aba 1: Aviso Bancário ────────────────────────────────
    print("\n[4/7] Preenchendo Aviso Bancário (aba 1)...")

    clicar(AVI_CONTA_X, AVI_CONTA_Y, 'Conta Corrente')
    pyautogui.hotkey('ctrl', 'a')
    digitar('79235-7', 'conta MB')
    pyautogui.press('tab')
    aguardar(1)

    clicar(AVI_DATA_AVISO_X, AVI_DATA_AVISO_Y, 'Data do Aviso')
    pyautogui.hotkey('ctrl', 'a')
    digitar(data_aviso, 'data aviso')
    pyautogui.press('tab')
    aguardar(0.5)

    clicar(AVI_DATA_REF_X, AVI_DATA_REF_Y, 'Data de Referência')
    pyautogui.hotkey('ctrl', 'a')
    digitar(data_aviso, 'data referencia (= data aviso)')
    pyautogui.press('tab')
    aguardar(0.5)

    clicar(AVI_VALOR_X, AVI_VALOR_Y, 'Valor')
    pyautogui.hotkey('ctrl', 'a')
    digitar(valor, 'valor banco')

    # ── Aba 2: Itens do Aviso ────────────────────────────────
    print("\n[5/7] Abrindo aba Itens do Aviso...")
    clicar(ABA_ITENS_X, ABA_ITENS_Y, 'aba Itens do Aviso')
    aguardar(2, 'aba carregando')

    # Arrastar planilha para dentro do Citrix
    print("\n[6/7] Importando planilha...")
    drag_arquivo_para_citrix(planilha)

    clicar(BTN_IMPORTAR_X, BTN_IMPORTAR_Y, 'Importar Itens')
    aguardar(3, 'diálogo de seleção abrindo')

    clicar(BTN_RETICENCIAS_X, BTN_RETICENCIAS_Y, 'botão ...')
    aguardar(3, 'janela de seleção de arquivo abrindo')

    # Navega até WebFile
    pyautogui.doubleClick(WEBFILE_X, WEBFILE_Y)
    aguardar(2, 'pasta WebFile abrindo')
    pyautogui.doubleClick(ARQUIVO_ITEM_X, ARQUIVO_ITEM_Y)
    aguardar(2, 'arquivo selecionado')

    # Preenche nome da planilha
    clicar(CAMPO_NOME_PLAN_X, CAMPO_NOME_PLAN_Y, 'Nome da Planilha')
    pyautogui.hotkey('ctrl', 'a')
    digitar(nome_planilha, 'nome aba planilha')

    # Processar e aguardar documentos carregarem (~1 min)
    print(f"\n[7/9] Clicando Processar — aguardando {IMPORTACAO_ESPERA}s para documentos carregarem...")
    clicar(BTN_PROCESSAR_X, BTN_PROCESSAR_Y, 'Processar importação')
    aguardar(IMPORTACAO_ESPERA, 'documentos sendo importados (média 1 min)')

    # Cancelar para fechar o diálogo de importação
    print("\n[8/9] Fechando diálogo de importação (Cancelar)...")
    clicar(BTN_CANCELAR_X, BTN_CANCELAR_Y, 'Cancelar (fechar diálogo)')
    aguardar(2, 'diálogo fechando')

    # Fecha Aviso na tela principal
    print("\n[9/9] Clicando Fecha Aviso...")
    clicar(BTN_FECHA_AVISO_X, BTN_FECHA_AVISO_Y, 'Fecha Aviso')
    aguardar(3, 'aviso sendo fechado')

    print("\n✅ Rodopar Bot concluído com sucesso!")
    sys.exit(0)


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--calibrate', action='store_true', help='Modo calibração de coordenadas')
    parser.add_argument('--data-aviso',    default='')
    parser.add_argument('--valor',         default='')
    parser.add_argument('--planilha',      default='')
    parser.add_argument('--nome-planilha', default='Sheet1')
    args = parser.parse_args()

    if args.calibrate:
        calibrate_mode()
    else:
        if not args.data_aviso or not args.valor or not args.planilha:
            print("ERROR: --data-aviso, --valor e --planilha são obrigatórios", file=sys.stderr)
            sys.exit(1)
        try:
            main(args)
        except Exception as e:
            print(f"\nERROR: {e}", file=sys.stderr)
            sys.exit(1)
