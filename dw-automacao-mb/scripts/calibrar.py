"""
calibrar.py — Captura as coordenadas de tela do Rodopar (Citrix) de forma guiada.

Uso:  python scripts/calibrar.py

Como funciona: para cada elemento, você posiciona o mouse EM CIMA dele e aperta
ENTER. A ferramenta captura a posição sozinha e salva tudo em coordenadas.json.
O robô (rodopar_bot.py) lê desse arquivo — você nunca precisa editar código.

DICA IMPORTANTE sobre o foco do teclado:
  Clique UMA vez nesta janela do terminal pra ela ter o foco do teclado.
  Depois mova o mouse sobre o elemento (SEM clicar) e aperte ENTER.
  No Windows o foco fica no terminal mesmo com o mouse sobre o navegador.
"""

import json
import os
import sys

try:
    import pyautogui
except ImportError:
    print("ERRO: execute antes:  pip install pyautogui pyperclip pillow", file=sys.stderr)
    sys.exit(1)

COORDS_FILE = os.path.join(os.path.dirname(__file__), '..', 'coordenadas.json')

# Fases seguem a ordem das telas do Rodopar. Cada fase pede pra você navegar
# até a tela certa antes de capturar os elementos dela.
FASES = [
    ("Login WEB do Rodopar (tela do navegador — 1º print). Pode PULAR se já passou dela.", [
        ("web_user",  "campo Usuário"),
        ("web_pass",  "campo Senha"),
        ("web_login", "botão Login"),
    ]),
    ("Aviso legal 'Domínio de propriedade legal da Datapar' (2º print). Pode PULAR.", [
        ("aviso_ok", "botão OK"),
    ]),
    ("Menu de Aplicativos (3º print)", [
        ("prod_sgt", "item 'PROD_SGT'"),
    ]),
    ("Login do Visual Rodopar (usuário/senha DENTRO do Citrix — 4º print)", [
        ("login_user", "campo Login (usuário)"),
        ("login_pass", "campo Senha"),
        ("login_ok",   "botão OK"),
    ]),
    ("Selecione a Filial (5º print)", [
        ("filial_continuar", "botão Continuar"),
    ]),
    ("Menu principal — abrir Baixa por Aviso Bancário", [
        ("menu_fluxo",    "menu 'Fluxo de Caixa'"),
        ("menu_moviment", "submenu 'Movimentação'"),
        ("menu_avi",      "item 'Baixa por Aviso Bancário'"),
    ]),
    ("Aba 'Aviso Bancário' (aba 1 do AVI)", [
        ("avi_conta",      "campo Conta Corrente / Banco"),
        ("avi_data_aviso", "campo Data do Aviso"),
        ("avi_data_ref",   "campo Data de Referência"),
        ("avi_valor",      "campo Valor"),
    ]),
    ("Aba 'Itens do Aviso' — abra a aba antes de continuar", [
        ("aba_itens",       "a aba 'Itens do Aviso'"),
        ("citrix_canvas",   "centro da área do Citrix (onde a planilha será arrastada)"),
        ("btn_importar",    "botão 'Importar Itens'"),
    ]),
    ("Diálogo de importação (clique em 'Importar Itens' antes)", [
        ("btn_reticencias", "botão '...' (ao lado do Caminho do Arquivo)"),
        ("campo_nome_plan", "campo 'Nome da Planilha'"),
        ("btn_processar",   "botão 'Processar'"),
        ("btn_cancelar",    "botão 'Cancelar'"),
    ]),
    ("Janela de seleção de arquivo (clique no '...' antes)", [
        ("webfile",      "a pasta 'WebFile on U1UFF3QXTBHUO5'"),
        ("arquivo_item", "o arquivo da planilha dentro da pasta WebFile"),
    ]),
    ("Tela principal do Aviso (depois de fechar o diálogo)", [
        ("btn_fecha_aviso", "botão 'Fecha Aviso'"),
    ]),
    ("Explorer do Windows (para arrastar a planilha)", [
        ("explorer_arquivo", "o ícone do arquivo no Explorer (abra a pasta downloads antes)"),
    ]),
]


def capturar(desc):
    input(f"    → Posicione o mouse sobre: {desc}\n      e aperte ENTER... ")
    x, y = pyautogui.position()
    print(f"      ✓ capturado: ({x}, {y})")
    return [x, y]


def main():
    coords = {}
    if os.path.exists(COORDS_FILE):
        with open(COORDS_FILE, encoding='utf-8') as f:
            coords = json.load(f)
        print(f"Arquivo existente carregado ({len(coords)} coordenadas). Vamos revisar/atualizar.\n")

    print("=" * 64)
    print("  CALIBRAÇÃO DE COORDENADAS — RODOPAR")
    print("=" * 64)
    print("  Clique UMA vez nesta janela do terminal (foco do teclado).")
    print("  A cada item: mova o mouse sobre o elemento e aperte ENTER.")
    print("  Deixe o Rodopar visível ao lado. Não precisa clicar nos elementos.")
    print("=" * 64)

    total_fases = len(FASES)
    for idx, (titulo, elementos) in enumerate(FASES, 1):
        print(f"\n\n━━━ FASE {idx}/{total_fases}: {titulo} ━━━")
        resp = input("  Navegue até essa tela no Rodopar. ENTER p/ começar (ou 'pular'): ").strip().lower()
        if resp == 'pular':
            print("  (fase pulada)")
            continue
        for key, desc in elementos:
            atual = coords.get(key)
            sufixo = f"  [atual: {tuple(atual)}]" if atual else ""
            print(f"\n  • {key}{sufixo}")
            coords[key] = capturar(desc)
            # salva a cada captura, pra não perder progresso
            with open(COORDS_FILE, 'w', encoding='utf-8') as f:
                json.dump(coords, f, indent=2, ensure_ascii=False)

    print("\n\n" + "=" * 64)
    print(f"  ✅ Calibração salva em: {os.path.abspath(COORDS_FILE)}")
    print(f"  Total de coordenadas: {len(coords)}")
    print("=" * 64)
    print("\n  Agora rode o robô de teste (quando estivermos prontos):")
    print("    python scripts/rodopar_bot.py --data-aviso 22/07/2026 --valor 2576896,75 \\")
    print("           --planilha C:\\automacao-mb\\downloads\\mb_baixa_XXXX.xlsx --nome-planilha DOCUMENTO\n")


if __name__ == '__main__':
    try:
        main()
    except KeyboardInterrupt:
        print("\n\nCalibração interrompida. O que já foi capturado está salvo.")
