"""
rodopar_bot.py — PyAutoGUI para a parte Citrix do Rodopar.

Lê as coordenadas de coordenadas.json (gerado por calibrar.py). NÃO tem
coordenada hardcoded — se precisar recalibrar, rode calibrar.py de novo.

Uso:
  python rodopar_bot.py --data-aviso 22/07/2026 --valor 2576896,75 \
                        --planilha "C:\\automacao-mb\\downloads\\mb_baixa_X.xlsx" \
                        --nome-planilha DOCUMENTO

Pré-requisito: rodar antes  python scripts/calibrar.py
"""

import argparse
import json
import os
import sys
import time
import subprocess

try:
    import pyautogui
    import pyperclip
except ImportError:
    print("ERRO: execute: pip install pyautogui pyperclip pillow", file=sys.stderr)
    sys.exit(1)

pyautogui.FAILSAFE = True   # mouse no canto superior esquerdo aborta o script
pyautogui.PAUSE = 0.3

COORDS_FILE = os.path.join(os.path.dirname(__file__), '..', 'coordenadas.json')
IMPORTACAO_ESPERA = 70      # segundos após "Processar" (documentos carregam ~1 min)

# Todas as chaves que o robô precisa (devem existir no coordenadas.json)
CHAVES = [
    'login_user', 'login_pass', 'login_ok',
    'filial_continuar',
    'menu_fluxo', 'menu_moviment', 'menu_avi',
    'avi_conta', 'avi_data_aviso', 'avi_data_ref', 'avi_valor',
    'aba_itens', 'citrix_canvas', 'btn_importar',
    'btn_reticencias', 'campo_nome_plan', 'btn_processar', 'btn_cancelar',
    'webfile', 'arquivo_item',
    'btn_fecha_aviso',
    'explorer_arquivo',
]


def carregar_coords():
    if not os.path.exists(COORDS_FILE):
        print(f"ERRO: {COORDS_FILE} não existe. Rode antes: python scripts/calibrar.py", file=sys.stderr)
        sys.exit(1)
    with open(COORDS_FILE, encoding='utf-8') as f:
        coords = json.load(f)
    faltando = [k for k in CHAVES if k not in coords]
    if faltando:
        print(f"ERRO: faltam coordenadas: {', '.join(faltando)}. Rode: python scripts/calibrar.py", file=sys.stderr)
        sys.exit(1)
    return coords


def clicar(coords, key, descricao=''):
    x, y = coords[key]
    if descricao:
        print(f"  >> Clicando {descricao} ({x}, {y})")
    pyautogui.click(x, y)
    time.sleep(0.5)


def duplo_clique(coords, key, descricao=''):
    x, y = coords[key]
    if descricao:
        print(f"  >> Duplo clique {descricao} ({x}, {y})")
    pyautogui.doubleClick(x, y)
    time.sleep(0.5)


def digitar(texto, descricao=''):
    if descricao:
        print(f"  >> Digitando {descricao}: {texto}")
    pyperclip.copy(texto)
    pyautogui.hotkey('ctrl', 'v')
    time.sleep(0.3)


def limpar_campo():
    pyautogui.hotkey('ctrl', 'a')
    time.sleep(0.1)


def aguardar(segundos, motivo=''):
    if motivo:
        print(f"  >> Aguardando {segundos}s — {motivo}")
    time.sleep(segundos)


def drag_arquivo_para_citrix(coords, caminho_arquivo):
    """Abre o Explorer com o arquivo e arrasta pro canvas do Citrix."""
    subprocess.Popen(f'explorer /select,"{caminho_arquivo}"')
    aguardar(2, 'Explorer abrindo')

    ex, ey = coords['explorer_arquivo']
    cx, cy = coords['citrix_canvas']
    print(f"  >> Arrastando arquivo do Explorer ({ex},{ey}) pro Citrix ({cx},{cy})")
    pyautogui.moveTo(ex, ey)
    pyautogui.mouseDown()
    aguardar(0.5)
    pyautogui.moveTo(cx, cy, duration=1.5)
    pyautogui.mouseUp()
    aguardar(2, 'aguardando upload no Citrix')


def main(args):
    coords = carregar_coords()

    print("=" * 60)
    print("  Rodopar Bot — MB")
    print(f"  Data Aviso : {args.data_aviso}")
    print(f"  Valor      : {args.valor}")
    print(f"  Planilha   : {args.planilha}")
    print(f"  Nome aba   : {args.nome_planilha}")
    print("=" * 60)

    # ── 1. Login Visual Rodopar ──────────────────────────────
    print("\n[1/9] Login Visual Rodopar...")
    aguardar(5, 'garantindo que a janela de login apareceu')
    clicar(coords, 'login_user', 'campo Login')
    limpar_campo()
    digitar(os.environ.get('RDP_APP_USER', ''), 'usuário app')
    clicar(coords, 'login_pass', 'campo Senha')
    limpar_campo()
    digitar(os.environ.get('RDP_APP_PASS', ''), 'senha app')
    clicar(coords, 'login_ok', 'OK login')
    aguardar(5, 'aguardando tela de filial')

    # ── 2. Selecione a Filial ────────────────────────────────
    print("\n[2/9] Selecione a Filial → Continuar...")
    clicar(coords, 'filial_continuar', 'Continuar')
    aguardar(8, 'aguardando menu principal')

    # ── 3. Navegar até AVI ───────────────────────────────────
    print("\n[3/9] Abrindo Baixa por Aviso Bancário...")
    clicar(coords, 'menu_fluxo', 'menu Fluxo de Caixa')
    aguardar(1, 'submenu')
    clicar(coords, 'menu_moviment', 'Movimentação')
    aguardar(1, 'submenu')
    clicar(coords, 'menu_avi', 'Baixa por Aviso Bancário')
    aguardar(4, 'formulário AVI carregando')

    # ── 4. Aba 1: Aviso Bancário ─────────────────────────────
    print("\n[4/9] Preenchendo Aviso Bancário...")
    clicar(coords, 'avi_conta', 'Conta Corrente')
    limpar_campo()
    digitar('79235-7', 'conta MB')
    pyautogui.press('tab')
    aguardar(1)

    clicar(coords, 'avi_data_aviso', 'Data do Aviso')
    limpar_campo()
    digitar(args.data_aviso, 'data aviso')
    pyautogui.press('tab')
    aguardar(0.5)

    clicar(coords, 'avi_data_ref', 'Data de Referência')
    limpar_campo()
    digitar(args.data_aviso, 'data referência (= data aviso)')
    pyautogui.press('tab')
    aguardar(0.5)

    clicar(coords, 'avi_valor', 'Valor')
    limpar_campo()
    digitar(args.valor, 'valor banco')

    # ── 5. Aba 2: Itens do Aviso ─────────────────────────────
    print("\n[5/9] Abrindo aba Itens do Aviso...")
    clicar(coords, 'aba_itens', 'aba Itens do Aviso')
    aguardar(2, 'aba carregando')

    # ── 6. Importar planilha ─────────────────────────────────
    print("\n[6/9] Importando planilha...")
    drag_arquivo_para_citrix(coords, args.planilha)
    clicar(coords, 'btn_importar', 'Importar Itens')
    aguardar(3, 'diálogo de importação abrindo')
    clicar(coords, 'btn_reticencias', 'botão ...')
    aguardar(3, 'janela de seleção abrindo')
    duplo_clique(coords, 'webfile', 'pasta WebFile')
    aguardar(2, 'pasta abrindo')
    duplo_clique(coords, 'arquivo_item', 'arquivo da planilha')
    aguardar(2, 'arquivo selecionado')
    clicar(coords, 'campo_nome_plan', 'Nome da Planilha')
    limpar_campo()
    digitar(args.nome_planilha, 'nome da aba')

    # ── 7. Processar e aguardar ──────────────────────────────
    print(f"\n[7/9] Processar — aguardando {IMPORTACAO_ESPERA}s os documentos carregarem...")
    clicar(coords, 'btn_processar', 'Processar importação')
    aguardar(IMPORTACAO_ESPERA, 'documentos importando (~1 min)')

    # ── 8. Cancelar (fecha o diálogo) ────────────────────────
    print("\n[8/9] Fechando diálogo de importação (Cancelar)...")
    clicar(coords, 'btn_cancelar', 'Cancelar')
    aguardar(2, 'diálogo fechando')

    # ── 9. Fecha Aviso ───────────────────────────────────────
    print("\n[9/9] Clicando Fecha Aviso...")
    clicar(coords, 'btn_fecha_aviso', 'Fecha Aviso')
    aguardar(3, 'aviso sendo fechado')

    print("\n✅ Rodopar Bot concluído com sucesso!")
    sys.exit(0)


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--data-aviso',    required=True)
    parser.add_argument('--valor',         required=True)
    parser.add_argument('--planilha',      required=True)
    parser.add_argument('--nome-planilha', default='DOCUMENTO')
    args = parser.parse_args()
    try:
        main(args)
    except Exception as e:
        print(f"\nERRO: {e}", file=sys.stderr)
        sys.exit(1)
