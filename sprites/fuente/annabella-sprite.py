# -*- coding: utf-8 -*-
"""Hoja de sprites de Annabella para el mundo: 3 columnas x 4 filas, 16x16.
A 16 px manda la silueta, no el detalle: pelo largo y oscuro, lentes, playera
negra con el pin de colores, jeans claros y tenis blancos. El detalle fino va
en el retrato de la caja de diálogo."""
from PIL import Image
import os
RAIZ = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
SALIDA = os.path.join(RAIZ, 'sprites\\annabella.png')


PAL = {
    # En la referencia el pelo es MAS CLARO que la playera. Respetarlo es lo
    # que evita que torso y cabellera se fundan en una sola mancha negra.
    'o': (0, 0, 0),          'h': (46, 46, 60),       'H': (26, 26, 34),
    's': (238, 184, 151),    'S': (211, 140, 109),    'g': (232, 224, 205),
    'c': (30, 30, 39),       'C': (18, 18, 24),       'r': (211, 119, 50),
    'p': (144, 177, 198),    'P': (78, 105, 131),
    'b': (255, 253, 255),    'B': (200, 199, 205),
}

TORSO_ABAJO = [
    "................",
    "....oooooooo....",
    "...ohhhhhhhho...",
    "..ohhhhhhhhhho..",
    "..ohhssssssHho..",
    "..ohsgogogsHho..",     # lentes: cristal, ojo, puente, ojo, cristal
    "..ohsssssssHho..",
    "..ohssoossSHho..",     # boca
    "..ohhoSSSSohho..",     # mentón y cuello
    "..ohccccccccho..",     # hombros: aca termina el pelo
    "..oscccccrccso..",     # brazos al aire y el pin
    "..oSCCCCCCCCSo..",     # ruedo de la playera y manos
]
TORSO_ARRIBA = [
    "................",
    "....oooooooo....",
    "...ohhhhhhhho...",
    "..ohhhhhhhhhho..",
    "..ohhhhhhhhhho..",
    "..ohhhhhhhhhho..",
    "..ohhhhhhhhhho..",
    "..ohhhhhhhhhho..",
    "..ohhHHHHHHhho..",
    "..ohccccccccho..",
    "..osccccccccso..",
    "..oSCCCCCCCCSo..",
]
TORSO_LADO = [
    "................",
    "...oooooooo.....",
    "..ohhhhhhhho....",
    ".ohhhhhhhhhho...",
    ".ohssssshhhho...",
    ".ohsgoshhhhho...",
    ".ohsssshhhhho...",
    ".ohsoosHhhhho...",
    ".ohhoSSohhhho...",
    "..occccccchho...",
    "..osccccrccho...",
    "..oSCCCCCCCho...",
]
PIERNAS = {
    'quieto': ["...opppppppPo...", "...opppppppPo...", "...opppooppPo...", "...obbboobbBo..."],
    'pasoA':  ["...opppppppPo...", "..opppppooppPo..", "..opppppooppPo..", "..obbbbboobbBo.."],
    'pasoB':  ["...opppppppPo...", "..opppooppppPo..", "..opppooppppPo..", "..obbboobbbbBo.."],
}

def pintar(img, filas, dx, dy, espejo=False):
    p = img.load()
    for y, fila in enumerate(filas):
        assert len(fila) == 16, "fila de %d px: %r" % (len(fila), fila)
        for x, ch in enumerate(fila):
            if ch == '.':
                continue
            p[dx + (15 - x if espejo else x), dy + y] = PAL[ch] + (255,)

hoja = Image.new("RGBA", (48, 64), (0, 0, 0, 0))
filas = [(TORSO_ABAJO, False), (TORSO_ARRIBA, False), (TORSO_LADO, False), (TORSO_LADO, True)]
for fy, (torso, espejo) in enumerate(filas):
    for fx, marco in enumerate(['quieto', 'pasoA', 'pasoB']):
        pintar(hoja, torso, fx * 16, fy * 16, espejo)
        pintar(hoja, PIERNAS[marco], fx * 16, fy * 16 + 12, espejo)
hoja.save(SALIDA)
print("sprites/annabella.png  48x64")

