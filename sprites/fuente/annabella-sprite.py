# -*- coding: utf-8 -*-
"""Hoja de sprites de Annabella para el mundo: 3 columnas x 4 filas, 16x16.
A 16 px manda la silueta, no el detalle: pelo largo y oscuro, lentes, playera
negra con el pin de colores, jeans claros y tenis blancos. El detalle fino va
en el retrato de la caja de diálogo."""
from PIL import Image

PAL = {
    # En la referencia el pelo es MAS CLARO que la playera. Respetarlo es lo
    # que evita que torso y cabellera se fundan en una sola mancha negra.
    'o': (0, 0, 0),          'h': (46, 46, 60),       'H': (26, 26, 34),
    's': (238, 184, 151),    'S': (211, 140, 109),    'g': (232, 224, 205),
    'c': (30, 30, 39),       'C': (18, 18, 24),       'r': (211, 119, 50),
    'p': (144, 177, 198),    'P': (78, 105, 131),
    'b': (255, 253, 255),    'B': (200, 199, 205),
}

def C(*partes):
    f = "".join(partes)
    assert len(f) == 16, (len(f), f)
    return f

# 18 filas de torso + 6 de piernas = 24. Con 8 px más que antes entran
# lentes con dos cristales y una boca de verdad.
TORSO_ABAJO = [
    C("." * 16),
    C("." * 4, "o" * 8, "." * 4),
    C("..", "oo", "h" * 8, "oo", ".."),
    C(".", "o", "h" * 12, "o", "."),
    C("o", "h" * 14, "o"),
    C("o", "hhh", "s" * 8, "hhH", "o"),
    C("o", "hhh", "s", "gg", "ss", "gg", "s", "hhH", "o"),   # dos cristales
    C("o", "hhh", "s", "oo", "ss", "oo", "s", "hhH", "o"),   # ojos tras el vidrio
    C("o", "hhh", "s", "gg", "ss", "gg", "s", "hhH", "o"),
    C("o", "hhh", "s" * 8, "hhH", "o"),
    C("o", "hhh", "sss", "oo", "sss", "hhH", "o"),    # boca
    C("o", "hhh", "s" * 8, "hHH", "o"),
    C("o", "hhh", "S" * 8, "hHH", "o"),               # mandibula
    C("..", "oo", "hh", "S" * 4, "hh", "oo", ".."),   # cuello entre el pelo
    C(".", "o", "hh", "c" * 8, "hh", "o", "."),       # hombros
    C(".", "o", "h", "s", "c" * 8, "s", "h", "o", "."),
    C(".", "o", "s", "c" * 4, "r", "c" * 5, "s", "o", "."),   # el pin
    C(".", "o", "S", "c", "C" * 8, "c", "S", "o", "."),
]
TORSO_ARRIBA = [
    C("." * 16),
    C("." * 4, "o" * 8, "." * 4),
    C("..", "oo", "h" * 8, "oo", ".."),
    C(".", "o", "h" * 12, "o", "."),
    C("o", "h" * 14, "o"),
    C("o", "h" * 14, "o"),
    C("o", "h" * 14, "o"),
    C("o", "h" * 14, "o"),
    C("o", "h" * 14, "o"),
    C("o", "h" * 14, "o"),
    C("o", "h" * 13, "H", "o"),
    C("o", "h" * 12, "HH", "o"),
    C("o", "hh", "H" * 10, "hh", "o"),
    C("..", "oo", "hh", "H" * 4, "hh", "oo", ".."),
    C(".", "o", "hh", "c" * 8, "hh", "o", "."),
    C(".", "o", "h", "s", "c" * 8, "s", "h", "o", "."),
    C(".", "o", "s", "c" * 10, "s", "o", "."),
    C(".", "o", "S", "c", "C" * 8, "c", "S", "o", "."),
]
TORSO_LADO = [
    C("." * 16),
    C("...", "o" * 8, "." * 5),
    C(".", "oo", "h" * 8, "oo", "..."),
    C("o", "h" * 12, "o", ".."),
    C("o", "h" * 13, "o", "."),
    C("o", "s" * 5, "h" * 8, "o", "."),
    C("o", "s", "gg", "ss", "h" * 8, "o", "."),
    C("o", "s", "go", "ss", "h" * 8, "o", "."),
    C("o", "s", "gg", "ss", "h" * 8, "o", "."),
    C("o", "s" * 5, "h" * 8, "o", "."),
    C("o", "s", "oo", "ss", "h" * 8, "o", "."),
    C("o", "s" * 5, "hH", "h" * 6, "o", "."),
    C("o", "S" * 4, "h", "hH", "h" * 6, "o", "."),
    C("..", "oo", "S" * 3, "hh", "hh", "oo", "..."),
    C(".", "o", "c" * 10, "hh", "o", "."),
    C(".", "o", "s", "c" * 9, "hh", "o", "."),
    C(".", "o", "s", "c" * 4, "r", "c" * 5, "h", "o", "."),
    C(".", "o", "S", "c", "C" * 9, "h", "o", "."),
]
PIERNAS = {
    'quieto': [
        C("...", "o", "p" * 8, "o", "..."),
        C("...", "o", "p" * 8, "o", "..."),
        C("...", "o", "p" * 6, "PP", "o", "..."),
        C("...", "o", "ppp", "oo", "ppP", "o", "..."),
        C("...", "o", "ppp", "oo", "ppP", "o", "..."),
        C("...", "o", "bbb", "oo", "bbB", "o", "..."),
    ],
    'pasoA': [
        C("...", "o", "p" * 8, "o", "..."),
        C("...", "o", "p" * 8, "o", "..."),
        C("...", "o", "p" * 6, "PP", "o", "..."),
        C("..", "o", "ppppp", "oo", "ppP", "o", ".."),
        C("..", "o", "ppppp", "oo", "ppP", "o", ".."),
        C("..", "o", "bbbbb", "oo", "bbB", "o", ".."),
    ],
    'pasoB': [
        C("...", "o", "p" * 8, "o", "..."),
        C("...", "o", "p" * 8, "o", "..."),
        C("...", "o", "p" * 6, "PP", "o", "..."),
        C("..", "o", "ppp", "oo", "pppPP", "o", ".."),
        C("..", "o", "ppp", "oo", "pppPP", "o", ".."),
        C("..", "o", "bbb", "oo", "bbbBB", "o", ".."),
    ],
}

def pintar(img, filas, dx, dy, espejo=False):
    p = img.load()
    for y, fila in enumerate(filas):
        assert len(fila) == 16, "fila de %d px: %r" % (len(fila), fila)
        for x, ch in enumerate(fila):
            if ch == '.':
                continue
            p[dx + (15 - x if espejo else x), dy + y] = PAL[ch] + (255,)

hoja = Image.new("RGBA", (48, 96), (0, 0, 0, 0))
filas = [(TORSO_ABAJO, False), (TORSO_ARRIBA, False), (TORSO_LADO, False), (TORSO_LADO, True)]
for fy, (torso, espejo) in enumerate(filas):
    for fx, marco in enumerate(['quieto', 'pasoA', 'pasoB']):
        pintar(hoja, torso, fx * 16, fy * 24, espejo)
        pintar(hoja, PIERNAS[marco], fx * 16, fy * 24 + 18, espejo)
hoja.save("sprites/annabella.png")
print("annabella.png  48x96  (3 columnas x 4 filas de 16x24)")

Z = 10
v = Image.new("RGB", (48 * Z, 64 * Z)); vp = v.load(); hp = hoja.load()
for y in range(64 * Z):
    for x in range(48 * Z):
        c = hp[x // Z, y // Z]
        vp[x, y] = c[:3] if c[3] else ((150, 156, 170) if ((x // Z) + (y // Z)) % 2 else (190, 196, 208))
v.save(r"C:/Users/ANNAB_~1/AppData/Local/Temp/anna_hoja.png")
