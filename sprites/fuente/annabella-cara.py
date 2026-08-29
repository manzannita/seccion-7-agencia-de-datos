# -*- coding: utf-8 -*-
"""Retrato de Annabella para la caja de diálogo: 48x48, dibujado con
rectángulos alineados al píxel.

Se dibuja, no se deriva. Bajar de resolución una foto o una imagen suavizada
deja cada borde en manos de un promedio y salen dentados; acá cada
rectángulo cae en coordenadas enteras y el borde es una decisión.
Colores tomados de la referencia: playera negra con el logo de colores,
lentes de aro claro, pelo largo oscuro."""
import os
from PIL import Image

RAIZ = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
SALIDA = os.path.join(RAIZ, "sprites", "annabella-cara.png")
R = 48

N   = (8, 10, 18)        # contorno
PEL = (58, 52, 66)       # pelo
PES = (34, 31, 41)       # pelo en sombra (derecha)
PEL_L = (86, 78, 98)     # brillo del pelo (arriba izquierda)
PIE = (234, 184, 148)    # piel
PIS = (198, 142, 106)    # piel en sombra
BOC = (150, 86, 78)
BOC_L = (188, 122, 112)
ARO = (222, 211, 188)    # aro de los lentes
BLA = (246, 246, 251)
ROP = (26, 30, 36)       # playera
ROS = (16, 19, 24)
ROL = (44, 50, 58)
LOG = [(224, 96, 60), (240, 184, 64), (63, 174, 106), (63, 143, 208)]

im = Image.new("RGBA", (R, R), (0, 0, 0, 0))
p = im.load()

def caja(color, x, y, w, h):
    for j in range(y, y + h):
        for i in range(x, x + w):
            if 0 <= i < R and 0 <= j < R:
                p[i, j] = color + (255,)

# La silueta se define fila por fila, no con rectángulos: un bloque
# rectangular no se lee como una cabeza. Cada número es el medio ancho de esa
# fila desde el centro, y al ser entero el borde queda duro.
CENTRO = 24

def franja(color, y, medio, dx=0):
    caja(color, CENTRO - medio + dx, y, medio * 2, 1)

# medio ancho del pelo, de arriba abajo (filas 2 a 44)
PELO_ANCHO = ([0]*2 + [6, 8, 10, 11] + [12, 12, 13, 13] + [14]*20 +
              [13, 13, 12, 12] + [11, 10, 9, 8] + [7, 6, 5, 4] + [3, 2])
# medio ancho de la cara (filas 10 a 34)
CARA_ANCHO = {9: 8, 10: 9, 11: 10, 12: 11, 31: 10, 32: 9, 33: 7, 34: 5}

# ---------------------------- hombros ------------------------------------
caja(N,   3, 36, 42, 12)
caja(ROP, 5, 37, 38, 11)
caja(ROL, 5, 37, 38, 2)
caja(ROS, 32, 40, 11, 8)
caja(N,   21, 37, 2, 11)
caja(ROL, 18, 37, 3, 3)
caja(ROL, 24, 37, 3, 3)

# ---------------------------- cuello -------------------------------------
caja(N,   19, 31, 10, 7)
caja(PIS, 20, 31, 8, 6)

# ------------------------- pelo: masa larga ------------------------------
for y in range(2, min(45, len(PELO_ANCHO))):
    m = PELO_ANCHO[y]
    if m:
        franja(N, y, m)
        if m > 1:
            franja(PEL, y, m - 1)
caja(PEL_L, 12, 7, 7, 7)          # brillo arriba a la izquierda
for y in range(11, 40):           # sombra a la derecha, siguiendo la silueta
    m = PELO_ANCHO[y] if y < len(PELO_ANCHO) else 0
    if m > 6:
        caja(PES, CENTRO + m - 7, y, 6, 1)

# ---------------------------- cara ---------------------------------------
for y in range(9, 35):
    m = CARA_ANCHO.get(y, 11)
    franja(N, y, m)
    if m > 1:
        franja(PIE, y, m - 1)
for y in range(14, 32):           # lado en sombra
    caja(PIS, CENTRO + 5, y, 4, 1)

# --------------------------- flequillo -----------------------------------
for y in range(9, 15):
    m = CARA_ANCHO.get(y, 11) - 1
    franja(PEL, y, m)
    caja(PES, CENTRO + m - 5, y, 5, 1)
caja(N, 15, 15, 18, 1)

# ---------------------------- cejas --------------------------------------
caja(PES, 16, 17, 6, 2)
caja(PES, 26, 17, 6, 2)

# ------------------- lentes: aro fino, mirada visible --------------------
OJO = 21
caja(ARO, 16, OJO - 2, 8, 8);  caja(PIE, 17, OJO - 1, 6, 6)
caja(ARO, 25, OJO - 2, 8, 8);  caja(PIE, 26, OJO - 1, 6, 6)
caja(ARO, 24, OJO + 1, 1, 1)
caja(ARO, 12, OJO + 1, 3, 1)
caja(ARO, 34, OJO + 1, 3, 1)
caja(BLA, 18, OJO, 4, 4);   caja(BLA, 27, OJO, 4, 4)
caja(N,   19, OJO + 1, 2, 2); caja(N, 28, OJO + 1, 2, 2)
caja((255, 255, 255), 19, OJO + 1, 1, 1)
caja((255, 255, 255), 28, OJO + 1, 1, 1)

# ----------------------- nariz y sonrisa ---------------------------------
caja(PIS, 23, 26, 3, 3)
caja((176, 118, 88), 23, 28, 3, 1)
caja(BOC, 20, 30, 8, 1)
caja(BOC, 19, 29, 1, 1); caja(BOC, 28, 29, 1, 1)
caja(BOC_L, 21, 31, 6, 1)

# --------------------- el logo en el pecho -------------------------------
for i, col in enumerate(LOG):
    caja(col, 33 + (i % 2) * 2, 42 + (i // 2) * 2, 2, 2)

im.save(SALIDA)
print("annabella-cara.png  %dx%d  (dibujado a mano)" % (R, R))
