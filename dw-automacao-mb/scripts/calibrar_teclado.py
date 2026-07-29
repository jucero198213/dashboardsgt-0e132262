"""
calibrar_teclado.py — Captura as 6 coordenadas de clique fixas para o rodopar_bot.py.

Abra o Rodopar no modo PWA (chrome --app=URL --window-position=0,0 --window-size=1920,1080)
e siga as instruções: posicione o mouse sobre cada elemento e pressione ESPAÇO.

As coordenadas são salvas em coordenadas.json na raiz do projeto.
"""

import json
import os
import sys
import time

try:
    import pyautogui
except ImportError:
    print("ERRO: pip install pyautogui", file=sys.stderr)
    sys.exit(1)

try:
    from pynput import keyboard
except ImportError:
    print("ERRO: pip install pynput", file=sys.stderr)
    sys.exit(1)

COORDS_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'coordenadas.json')

PONTOS = [
    ('prod_sgt',        'Botão PROD_SGT (tela de seleção de aplicativo)'),
    ('toolbar_toggle',  'Setinha ⌄ da barra TSplus (topo da tela)'),
    ('toolbar_upload',  'Ícone de upload (nuvem) na barra TSplus'),
    ('upload_dropzone', '"Click or drop files to upload" no File Transfer'),
    ('upload_close',    'Botão X pra fechar o painel File Transfer'),
    ('btn_reticencias', 'Botão "..." no diálogo de importação do Rodopar'),
    ('btn_fecha_aviso', 'Botão "Fecha Aviso" na tela de Aviso Bancário'),
]

captured = {}
current_index = 0
done = False


def show_current():
    if current_index >= len(PONTOS):
        return
    key, desc = PONTOS[current_index]
    print(f"\n  [{current_index + 1}/{len(PONTOS)}] Posicione o mouse sobre: {desc}")
    print(f"       (chave: {key})")
    print("       Pressione ESPAÇO para capturar | ESC para cancelar")


def on_press(k):
    global current_index, done

    if k == keyboard.Key.esc:
        print("\n  Cancelado pelo usuário.")
        done = True
        return False

    if k == keyboard.Key.space:
        x, y = pyautogui.position()
        key, desc = PONTOS[current_index]
        captured[key] = [x, y]
        print(f"       ✓ {key} = ({x}, {y})")
        current_index += 1

        if current_index >= len(PONTOS):
            done = True
            return False

        show_current()


def main():
    global done

    print("=" * 60)
    print("  Calibração — Rodopar Bot (Teclado)")
    print("=" * 60)
    print()
    print("  Abra o Rodopar no PWA e navegue até cada tela conforme")
    print("  solicitado. Posicione o mouse e pressione ESPAÇO.")
    print()
    print("  DICA: calibre na ORDEM do fluxo real:")
    print("    1) Abra o PWA e vá até a tela de apps → calibre PROD_SGT")
    print("    2) Entre no Rodopar → calibre toolbar (⌄, upload, dropzone)")
    print("    3) Abra um AVI de teste → calibre '...' e 'Fecha Aviso'")

    existing = {}
    if os.path.exists(COORDS_FILE):
        with open(COORDS_FILE, encoding='utf-8') as f:
            existing = json.load(f)
        print(f"\n  ⚠ coordenadas.json já existe ({len(existing)} chaves).")
        print("    Novas capturas vão SOBRESCREVER as chaves recalibradas.")

    show_current()

    with keyboard.Listener(on_press=on_press) as listener:
        listener.join()

    if not captured:
        print("\nNenhuma coordenada capturada.")
        return

    existing.update(captured)

    with open(COORDS_FILE, 'w', encoding='utf-8') as f:
        json.dump(existing, f, indent=2, ensure_ascii=False)

    print(f"\n✅ {len(captured)} coordenada(s) salva(s) em {COORDS_FILE}")
    print(json.dumps(captured, indent=2))


if __name__ == '__main__':
    main()
