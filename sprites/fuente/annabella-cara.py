# -*- coding: utf-8 -*-
"""Retrato de Annabella para la caja de diálogo: 32x32, píxel por píxel.

Derivarlo bajando de resolución una imagen suavizada no funciona: cada borde
lo decide un promedio y salen dentados. Acá cada píxel está puesto a mano.
Colores tomados de la referencia: playera negra con el logo de colores,
lentes de aro claro, pelo largo oscuro."""
from PIL import Image
import os
RAIZ = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
SALIDA = os.path.join(RAIZ, 'sprites\\annabella-cara.png')


PAL = {
    'o': (10, 12, 20),      # contorno
    'h': (58, 52, 66),      # pelo
    'H': (34, 31, 41),      # pelo en sombra (derecha)
    'L': (82, 74, 94),      # brillo del pelo (arriba izquierda)
    's': (234, 184, 148),   # piel
    'S': (200, 144, 108),   # piel en sombra
    'g': (216, 205, 182),   # aro de los lentes (fino y tibio, no blanco puro)
    'e': (42, 32, 40),      # ojos
    'm': (138, 63, 58),     # boca
    'M': (181, 96, 90),      # labio inferior
    'c': (28, 32, 38),      # playera
    'C': (18, 21, 26),      # playera en sombra
    'V': (52, 58, 68),      # cuello de la playera
    'r': (224, 96, 60),     # logo
    'y': (240, 184, 64),
    'n': (63, 174, 106),
    'b': (63, 143, 208),
}

CARA = [
    "................................",
    "..........oooooooooooo..........",
    "........oohhhhhhhhhhhhoo........",
    ".......oohhhhhhhhhhhhhhoo.......",
    "......oohhhhhhhhhhhhhhhhoo......",
    "......ohhhhhhhhhhhhhhhhhho......",
    ".....ohhhhhhhhhhhhhhhhhhhho.....",
    ".....ohhhLLhhhhhhhhhhhhHHHo.....",
    ".....ohhhhsssssssssssshHHHo.....",
    ".....ohhhhsHHHssHHHsSShHHHo.....",
    ".....ohhhhssssssssssSShHHHo.....",
    ".....ohhhhsggggsggggSShHHHo.....",
    ".....ohhhhsgeegsgeegSShHHHo.....",
    ".....ohhhhsggggsggggSShHHHo.....",
    ".....ohhhhssssssssssSShHHHo.....",
    ".....ohhhhssssssSsssSShHHHo.....",
    ".....ohhhhsssssSSsssSShHHHo.....",
    ".....ohhhhsssmmmmmssSShHHHo.....",
    ".....ohhhhssssMMMsssSShHHHo.....",
    ".....ohhhhssssssssssSShHHHo.....",
    ".....ohhhhSSSSSSSSSSSShHHHo.....",
    ".....ohhhhoSSSSSSSSSSohHHHo.....",
    ".....ohhhhooooSSSSoooohHHHo.....",
    ".....ohhhhhhhoSSSSohhhhHHHo.....",
    "....ohhhcccccVVSSVVcccccHHHo....",
    "....ohhcccccccVVVVcccccccHHo....",
    "...ohhccccccccVVVVccccccccHHo...",
    "...ohhcccccccccVVccccrnccCCHo...",
    "...ohcccccccccccccccybccCCCCHo..",
    "...ohccccccccccccccccccCCCCCCo..",
    "...ohccccccccccccccccccCCCCCCo..",
    "...oooooooooooooooooooooooooo...",
]

for i, f in enumerate(CARA):
    assert len(f) == 32, "fila %d mide %d px: %r" % (i, len(f), f)

im = Image.new("RGBA", (32, 32), (0, 0, 0, 0))
p = im.load()
for y, fila in enumerate(CARA):
    for x, ch in enumerate(fila):
        if ch != '.':
            p[x, y] = PAL[ch] + (255,)
im.save(SALIDA)
print("sprites/annabella-cara.png  32x32  (dibujado a mano)")

