/* =============================================================================
   AGENCIA — arte.js
   Paleta, sprites de personajes y dibujo de casillas. Todo por código.

   REGLAS DE ESTILO (si las rompes, el arte deja de verse coherente):
   1. LUZ DESDE ARRIBA A LA IZQUIERDA. Los brillos van arriba/izquierda,
      las sombras abajo/derecha. Nunca sombrear todo el contorno por igual:
      eso deja los objetos inflados y planos ("pillow shading").
   2. LAS SOMBRAS SE VAN AL AZUL, LOS BRILLOS AL CÁLIDO. Una sombra no es el
      mismo color más oscuro: es más oscuro Y más frío. Las rampas de abajo
      ya vienen con ese desplazamiento de tono.
   3. TRAMADO ORDENADO, NUNCA RUIDO AL AZAR. Para texturas y degradados se usa
      damero o cuartos (ver tramar()). El ruido aleatorio se ve sucio.
   4. PALETA CORTA. Cinco rampas de 4-5 tonos alcanzan para todo el edificio.
   ========================================================================== */
(function () {
"use strict";

const arte = {};
window.CQ = window.CQ || {};
window.CQ.arte = arte;

/* --------------------------------- paleta --------------------------------
   Cada rampa va de sombra a brillo. Fíjate en el tono: los extremos oscuros
   tiran a azul/violeta y los claros a amarillo/rosa. */
const P = arte.P = {
  acero:  ["#0b1020", "#182339", "#293754", "#3f5178", "#6076a0"],  /* paredes */
  piso:   ["#10182a", "#1d2740", "#2b3856", "#3d4d70", "#57688e"],
  cian:   ["#083440", "#0f6d84", "#1fb8d4", "#6ee8f7", "#c4faff"],  /* pantallas */
  ambar:  ["#472a08", "#8a5a0d", "#d18f1c", "#f5c14e", "#ffe9a8"],  /* lámparas */
  verde:  ["#0d2a1c", "#1a5c33", "#2f9450", "#5fce84", "#b4f2c6"],  /* correcto */
  rojo:   ["#3d0d1c", "#7d1a30", "#c33a52", "#f0788c", "#ffc2cc"],  /* alerta */
  gris:   ["#0d0f16", "#1e222e", "#333949", "#4e566b", "#7c8599"],
  hueso:  ["#3a3a44", "#6e6e7d", "#a9a9b8", "#d8d8e2", "#f4f4fa"]
};
arte.NEGRO = "#070911";

/* -------------------------------- utilidades ------------------------------ */
function px(c, color, x, y, w, h) { c.fillStyle = color; c.fillRect(x, y, w || 1, h || 1); }
arte.px = px;

/* Tramado ordenado. patron: "damero" (50%) o "cuarto" (25%). */
function tramar(c, color, x, y, w, h, patron) {
  c.fillStyle = color;
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    const gx = x + i, gy = y + j;
    const pinta = patron === "cuarto"
      ? (gx % 2 === 0 && gy % 2 === 0)
      : ((gx + gy) % 2 === 0);
    if (pinta) c.fillRect(gx, gy, 1, 1);
  }
}
arte.tramar = tramar;

function lienzo(w, h) {
  const cv = document.createElement("canvas");
  cv.width = w; cv.height = h;
  const cx = cv.getContext("2d");
  cx.imageSmoothingEnabled = false;
  return { cv: cv, cx: cx };
}
arte.lienzo = lienzo;

/* Mezcla hacia un color, con desplazamiento de tono incluido:
   oscurecer tira al azul, aclarar tira al ámbar. */
function comp(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function hex(r, g, b) {
  return "#" + ((1 << 24) + (Math.round(r) << 16) + (Math.round(g) << 8) + Math.round(b)).toString(16).slice(1);
}
function oscurecer(color, f) {
  const c = comp(color);
  return hex(c[0] * f * 0.92, c[1] * f * 0.96, Math.min(255, c[2] * f * 1.12));
}
function aclarar(color, f) {
  const c = comp(color);
  return hex(Math.min(255, c[0] + (255 - c[0]) * f * 1.0),
             Math.min(255, c[1] + (255 - c[1]) * f * 0.92),
             Math.min(255, c[2] + (255 - c[2]) * f * 0.72));
}
arte.oscurecer = oscurecer;
arte.aclarar = aclarar;

/* ruido estable por casilla: solo para ELEGIR variantes, nunca para texturar */
function ruido(x, y) {
  let n = (x * 374761393 + y * 668265263) >>> 0;
  n = (n ^ (n >> 13)) >>> 0; n = Math.imul(n, 1274126177) >>> 0;
  return (n >>> 8) / 16777216;
}
arte.ruido = ruido;

/* ---------------------------- sprites de personaje ------------------------
   16x16. Cada letra es un color de la paleta del personaje:
     .  transparente   o contorno   s/S piel/sombra   h/H pelo/sombra
     c/C ropa/sombra   p/P pantalón/sombra            b botas
   Las mayúsculas (sombras) caen en el borde derecho y abajo: luz arriba-izq. */
const CUERPO = arte.CUERPO = {
  down: [
    "................",
    ".....oooooo.....",
    "....ohhhhhHo....",
    "...ohhhhhhhHo...",
    "...ohssssssHo...",
    "...osossssoSo...",
    "...osssssssSo...",
    "...osssoossSo...",
    "....ooSSSSoo....",
    "..occccccccCCo..",
    "..oscccccccCSo..",
    "..osccccccCCSo..",
    "..oScCCCCCCCSo.."
  ],
  up: [
    "................",
    ".....oooooo.....",
    "....ohhhhhHo....",
    "...ohhhhhhhHo...",
    "...ohhhhhhhHo...",
    "...ohhhhhhhHo...",
    "...ohhhhhhhHo...",
    "...ohHHHHHHHo...",
    "....ooSSSSoo....",
    "..occccccccCCo..",
    "..oscccccccCSo..",
    "..osccccccCCSo..",
    "..oScCCCCCCCSo.."
  ],
  side: [
    "................",
    "....oooooo......",
    "...ohhhhhHo.....",
    "..ohhhhhhhHo....",
    "..osssshhhHo....",
    "..osossHhhHo....",
    "..ossssHhhHo....",
    "..osoosHhhHo....",
    "...ooSSSSoo.....",
    "...occccccCCo...",
    "...osccccccCo...",
    "...osccccccCo...",
    "...oScCCCCCCo..."
  ]
};
/* Tres poses de piernas. El ciclo las combina en 4 tiempos: paso, cruce,
   paso, cruce. Con menos tiempos la caminata parece un salto. */
const PIERNAS = arte.PIERNAS = {
  quieto: ["...opppppppPo...", "...opppooppPo...", "...obbboobbbo..."],
  pasoA:  ["...opppppppPo...", "..opppppooppPo..", "..obbbbboobbbo.."],
  pasoB:  ["...opppppppPo...", "..opppooppppPo..", "..obbboobbbbbo.."]
};
arte.CICLO_CAMINAR = [1, 0, 2, 0];
arte.IDX_DIR = { down: 0, up: 1, left: 2, right: 3 };

const PALETA_BASE = {
  o: "#0a0c16", s: "#f0c39c", S: "#cf9770",
  h: "#8a4b2a", H: "#5a2f18", c: "#2f6f9e", C: "#1d4a71",
  p: "#2b3247", P: "#1a2032", b: "#6b4326"
};
function paletaDe(pelo, ropa, piel) {
  const p = Object.assign({}, PALETA_BASE);
  if (pelo) { p.h = pelo; p.H = oscurecer(pelo, 0.6); }
  if (ropa) { p.c = ropa; p.C = oscurecer(ropa, 0.66); }
  if (piel) { p.s = piel; p.S = oscurecer(piel, 0.78); }
  return p;
}
function pintarFilas(cx, filas, paleta, dx, dy, espejo, ancho) {
  for (let y = 0; y < filas.length; y++) {
    const fila = filas[y];
    for (let x = 0; x < fila.length; x++) {
      const ch = fila[x];
      if (ch === ".") continue;
      const color = paleta[ch];
      if (!color) continue;
      px(cx, color, dx + (espejo ? ancho - 1 - x : x), dy + y);
    }
  }
}
/* Hoja de 3 columnas (quieto, pasoA, pasoB) x 4 filas (abajo, arriba, izq, der).
   Es el MISMO formato que deben tener los PNG de personajes que se agreguen. */
const cacheSprites = {};
arte.hojaDe = function (pelo, ropa, piel) {
  const clave = (pelo || "-") + "|" + (ropa || "-") + "|" + (piel || "-");
  if (cacheSprites[clave]) return cacheSprites[clave];
  const paleta = paletaDe(pelo, ropa, piel);
  const L = lienzo(48, 64);
  ["down", "up", "left", "right"].forEach(function (dir, fy) {
    const cuerpo = CUERPO[dir === "left" || dir === "right" ? "side" : dir];
    const espejo = dir === "right";
    ["quieto", "pasoA", "pasoB"].forEach(function (fr, fx) {
      pintarFilas(L.cx, cuerpo, paleta, fx * 16, fy * 16, espejo, 16);
      pintarFilas(L.cx, PIERNAS[fr], paleta, fx * 16, fy * 16 + 13, espejo, 16);
    });
  });
  cacheSprites[clave] = L.cv;
  return L.cv;
};

/* ============================ casillas del edificio ======================
   Dos capas: SUELO (piso, muros, umbrales) y OBJETOS (muebles).
   Los objetos miden 16x24: los 8 píxeles de más sobresalen hacia arriba, así
   el personaje puede pasar por detrás de un rack y taparse de verdad. */
const S = arte.SUELO = {
  VACIO: 0, MURO: 1,
  PASILLO: 2, TEC: 3, METAL: 4, ALFOMBRA: 5, BALDOSA: 6, BOVEDA: 7,
  UMBRAL: 8, REJILLA: 9, LOGO: 10
};
const O = arte.OBJETO = {
  NADA: 0, RACK: 1, ESCRITORIO: 2, TERMINAL: 3, MESA: 4, PLANTA: 5,
  ARCHIVADOR: 6, MAQUINA: 7, CAJA: 8, PIZARRA: 9, NUCLEO: 10,
  COMPUERTA: 11, SILLA: 12, PLACA: 13, SOFA: 14, BARRA: 15
};
arte.SUELO_SOLIDO = {};
arte.SUELO_SOLIDO[S.VACIO] = true;
arte.SUELO_SOLIDO[S.MURO] = true;
/* Todos los objetos estorban salvo los que son puro decorado de piso. */
arte.OBJETO_SOLIDO = function (o) { return o !== O.NADA; };

/* ------------------------------- pisos ---------------------------------- */
function panel(c, base, junta, luz, paso) {
  px(c, base, 0, 0, 16, 16);
  for (let y = 0; y < 16; y += paso) {
    px(c, junta, 0, y, 16, 1);
    px(c, luz, 0, y + 1, 16, 1);
  }
  for (let x = 0; x < 16; x += paso) px(c, junta, x, 0, 1, 16);
}

arte.piso = {};
function pisoNuevo(tipo, n, pintor) {
  arte.piso[tipo] = [];
  for (let v = 0; v < n; v++) { const L = lienzo(16, 16); pintor(L.cx, v); arte.piso[tipo].push(L.cv); }
}

function construirPisos() {
  /* pasillo: placas metálicas grandes con una línea guía cian */
  pisoNuevo(S.PASILLO, 3, function (c, v) {
    panel(c, P.piso[1], P.piso[0], P.piso[2], 8);
    if (v === 1) { px(c, P.piso[2], 2, 2, 4, 1); px(c, P.piso[0], 10, 11, 3, 1); }
    if (v === 2) { tramar(c, P.piso[2], 1, 9, 6, 5, "cuarto"); }
  });

  /* laboratorio: baldosa clara con junta cian, se ve limpio y técnico */
  pisoNuevo(S.TEC, 3, function (c, v) {
    panel(c, P.piso[2], P.cian[0], P.piso[3], 8);
    px(c, P.cian[1], 0, 0, 1, 1); px(c, P.cian[1], 8, 8, 1, 1);
    if (v === 1) px(c, P.piso[3], 3, 3, 3, 1);
    if (v === 2) tramar(c, P.piso[1], 9, 2, 5, 4, "damero");
  });

  /* sala de servidores: rejilla metálica */
  pisoNuevo(S.METAL, 2, function (c, v) {
    px(c, P.gris[1], 0, 0, 16, 16);
    for (let y = 1; y < 16; y += 3) {
      px(c, P.gris[0], 0, y + 2, 16, 1);
      px(c, P.gris[3], 0, y, 16, 1);
      px(c, P.gris[2], 0, y + 1, 16, 1);
    }
    for (let x = (v ? 3 : 0); x < 16; x += 8) px(c, P.gris[0], x, 0, 1, 16);
  });

  /* recepción: alfombra oscura, tramado en cuartos para que no se vea plana */
  pisoNuevo(S.ALFOMBRA, 3, function (c, v) {
    px(c, "#1d2b3a", 0, 0, 16, 16);
    tramar(c, "#24384b", 0, 0, 16, 16, "cuarto");
    if (v === 1) tramar(c, "#1a2634", 4, 4, 8, 8, "damero");
    if (v === 2) px(c, "#24384b", 0, 7, 16, 2);
  });

  /* cafetería: damero, pero con poco contraste. Un damero blanco y negro
     grita más fuerte que cualquier personaje y arruina la lectura de la escena. */
  pisoNuevo(S.BALDOSA, 2, function (c, v) {
    px(c, P.hueso[1], 0, 0, 16, 16);
    px(c, P.gris[3], v ? 8 : 0, 0, 8, 8);
    px(c, P.gris[3], v ? 0 : 8, 8, 8, 8);
    px(c, P.hueso[2], 0, 0, 8, 1); px(c, P.hueso[2], 8, 8, 8, 1);
    px(c, P.gris[1], 0, 15, 16, 1); px(c, P.gris[1], 15, 0, 1, 16);
  });

  /* bóveda y núcleo: placa blindada oscura. El ámbar aparece solo de vez en
     cuando, como remache: si va en todas las casillas la sala parece de madera. */
  pisoNuevo(S.BOVEDA, 4, function (c, v) {
    px(c, P.gris[1], 0, 0, 16, 16);
    px(c, P.gris[0], 0, 0, 16, 1); px(c, P.gris[0], 0, 0, 1, 16);
    px(c, P.gris[2], 1, 1, 15, 1); px(c, P.gris[2], 1, 1, 1, 15);
    px(c, oscurecer(P.gris[1], 0.75), 1, 15, 15, 1);
    tramar(c, P.gris[2], 4, 4, 8, 8, "cuarto");
    if (v === 3) {                       /* remaches, en una de cada cuatro */
      px(c, P.ambar[1], 3, 3, 2, 2); px(c, P.ambar[3], 3, 3, 1, 1);
      px(c, P.ambar[1], 11, 11, 2, 2); px(c, P.ambar[3], 11, 11, 1, 1);
    }
  });

  /* umbral: franjas diagonales de advertencia. Sin trazados vectoriales:
     una diagonal dibujada con arc/lineTo sale suavizada y en pixel art eso
     deja un halo sucio alrededor. Con (x+y)%6 la diagonal queda limpia. */
  pisoNuevo(S.UMBRAL, 1, function (c) {
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      const franja = (x + y) % 6 < 3;
      px(c, franja ? P.ambar[2] : P.gris[2], x, y);
    }
    px(c, P.ambar[3], 0, 0, 16, 1);
    px(c, P.gris[0], 0, 15, 16, 1);
  });

  /* rejilla de ventilación en el suelo */
  pisoNuevo(S.REJILLA, 1, function (c) {
    px(c, P.gris[1], 0, 0, 16, 16);
    px(c, P.gris[0], 2, 2, 12, 12);
    for (let y = 3; y < 13; y += 3) { px(c, P.gris[3], 3, y, 10, 1); px(c, P.gris[0], 3, y + 1, 10, 2); }
    px(c, P.gris[3], 2, 2, 12, 1); px(c, P.gris[0], 2, 13, 12, 1);
  });

  /* Logotipo de la agencia: un anillo repartido en 4 casillas (2x2).
     La variante v codifica el cuadrante: v = qx + qy*2. Dibujado por
     distancia entera, sin arc(), para que el borde quede duro. */
  pisoNuevo(S.LOGO, 4, function (c, v) {
    const qx = v % 2, qy = (v / 2) | 0;
    px(c, "#1d2b3a", 0, 0, 16, 16);
    tramar(c, "#24384b", 0, 0, 16, 16, "cuarto");
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      const dx = qx * 16 + x - 15.5, dy = qy * 16 + y - 15.5;
      const d2 = dx * dx + dy * dy;
      if (d2 > 169 || d2 < 72) continue;
      /* el cuarto de arriba a la izquierda recibe la luz */
      px(c, (dx + dy < -6) ? P.cian[3] : (dx + dy > 6 ? P.cian[0] : P.cian[1]), x, y);
    }
  });
}

/* ------------------------------- muros -----------------------------------
   Autotile de 4 bits: 1=piso al norte, 2=al este, 4=al sur, 8=al oeste.
   El lado que mira a una sala se dibuja como cara vista; el resto queda
   como techo oscuro. Así las salas se leen solas, sin dibujar 16 muros a mano. */
arte.muro = [];
function construirMuros() {
  for (let m = 0; m < 16; m++) {
    const L = lienzo(16, 16), c = L.cx;
    px(c, P.acero[1], 0, 0, 16, 16);
    px(c, P.acero[0], 8, 0, 1, 16);          /* junta entre placas */
    tramar(c, P.acero[2], 0, 0, 16, 8, "cuarto");

    if (m & 1) {                              /* piso arriba: canto superior */
      px(c, P.acero[0], 0, 0, 16, 1);
      px(c, P.acero[3], 0, 1, 16, 1);
      px(c, P.acero[2], 0, 2, 16, 1);
    }
    if (m & 8) {                              /* piso a la izquierda: lado iluminado */
      px(c, P.acero[3], 0, 0, 1, 16);
      px(c, P.acero[2], 1, 0, 1, 16);
    }
    if (m & 2) {                              /* piso a la derecha: lado en sombra */
      px(c, P.acero[0], 15, 0, 1, 16);
      px(c, oscurecer(P.acero[1], 0.75), 14, 0, 1, 16);
    }
    if (m & 4) {                              /* piso abajo: cara vista del muro */
      px(c, P.acero[2], 0, 9, 16, 5);
      px(c, P.acero[3], 0, 9, 16, 1);
      px(c, P.acero[0], 0, 14, 16, 2);
      px(c, oscurecer(P.acero[1], 0.8), 3, 11, 10, 2);
      px(c, P.acero[3], 3, 11, 10, 1);
    }
    arte.muro.push(L.cv);
  }
}

/* ------------------------------- objetos ---------------------------------
   Lienzos de 16x24. La base (y=24) se apoya en el borde inferior de la casilla. */
arte.objeto = {};
function objNuevo(tipo, pintor) {
  const L = lienzo(16, 24);
  pintor(L.cx);
  arte.objeto[tipo] = L.cv;
}
/* caja con volumen: tapa iluminada arriba-izq, frente medio, sombra a la derecha */
function bloque(c, x, y, w, h, base) {
  px(c, oscurecer(base, 0.45), x, y, w, h);              /* contorno */
  px(c, base, x + 1, y + 1, w - 2, h - 2);
  px(c, aclarar(base, 0.35), x + 1, y + 1, w - 2, 2);     /* tapa */
  px(c, aclarar(base, 0.15), x + 1, y + 3, 2, h - 4);     /* lado izq */
  px(c, oscurecer(base, 0.7), x + w - 3, y + 3, 2, h - 4);/* lado der */
  px(c, oscurecer(base, 0.55), x + 1, y + h - 3, w - 2, 2);
}
function luces(c, x, y, n, sep) {
  const cols = [P.verde[3], P.cian[3], P.ambar[3], P.verde[2]];
  for (let i = 0; i < n; i++) px(c, cols[i % cols.length], x + i * sep, y, 1, 1);
}

function construirObjetos() {
  /* rack de servidores: alto, con muchas luces */
  objNuevo(O.RACK, function (c) {
    bloque(c, 1, 2, 14, 22, P.gris[2]);
    for (let y = 5; y < 21; y += 4) {
      px(c, P.gris[0], 3, y, 10, 3);
      px(c, P.gris[1], 3, y, 10, 1);
      luces(c, 4, y + 1, 4, 2);
      px(c, P.cian[2], 11, y + 1, 1, 1);
    }
    px(c, P.cian[1], 3, 3, 10, 1);
  });

  /* escritorio con monitor encendido */
  objNuevo(O.ESCRITORIO, function (c) {
    px(c, P.gris[0], 3, 4, 10, 8);                 /* monitor */
    px(c, P.cian[0], 4, 5, 8, 6);
    px(c, P.cian[2], 5, 6, 6, 1); px(c, P.cian[1], 5, 8, 4, 1); px(c, P.cian[1], 5, 9, 5, 1);
    px(c, P.gris[1], 7, 12, 2, 2);
    bloque(c, 0, 14, 16, 9, "#6b4a2e");            /* mesa */
    px(c, P.hueso[3], 2, 17, 5, 2);                /* papeles */
    px(c, P.hueso[2], 3, 18, 4, 1);
  });

  /* consola de pared */
  objNuevo(O.TERMINAL, function (c) {
    bloque(c, 2, 6, 12, 12, P.acero[2]);
    px(c, P.cian[0], 4, 8, 8, 6);
    px(c, P.cian[2], 5, 9, 6, 1); px(c, P.cian[3], 5, 11, 3, 1); px(c, P.cian[1], 5, 12, 5, 1);
    luces(c, 4, 15, 5, 2);
  });

  /* mesa larga: se une sin costura con la de al lado */
  objNuevo(O.MESA, function (c) {
    px(c, oscurecer("#6b4a2e", 0.45), 0, 10, 16, 10);
    px(c, "#6b4a2e", 0, 11, 16, 8);
    px(c, aclarar("#6b4a2e", 0.3), 0, 11, 16, 2);
    px(c, oscurecer("#6b4a2e", 0.6), 0, 18, 16, 2);
    px(c, P.gris[1], 2, 20, 3, 4); px(c, P.gris[1], 11, 20, 3, 4);
  });

  /* planta: rompe la frialdad del acero */
  objNuevo(O.PLANTA, function (c) {
    px(c, P.verde[1], 6, 6, 4, 10);
    px(c, P.verde[2], 3, 8, 5, 3); px(c, P.verde[3], 4, 8, 3, 1);
    px(c, P.verde[2], 8, 5, 5, 3); px(c, P.verde[3], 9, 5, 3, 1);
    px(c, P.verde[1], 2, 12, 5, 3); px(c, P.verde[2], 10, 11, 4, 3);
    bloque(c, 4, 16, 8, 7, "#8a5a3a");
  });

  /* archivador */
  objNuevo(O.ARCHIVADOR, function (c) {
    bloque(c, 2, 8, 12, 16, P.acero[3]);
    for (let y = 11; y < 22; y += 5) {
      px(c, P.acero[0], 4, y, 8, 4);
      px(c, P.acero[2], 4, y, 8, 1);
      px(c, P.ambar[3], 7, y + 2, 2, 1);
    }
  });

  /* máquina expendedora */
  objNuevo(O.MAQUINA, function (c) {
    bloque(c, 1, 1, 14, 23, P.rojo[1]);
    px(c, P.gris[0], 3, 4, 8, 14);
    px(c, P.cian[0], 3, 4, 8, 14);
    for (let y = 5; y < 17; y += 4) for (let x = 4; x < 11; x += 3) px(c, P.ambar[3], x, y, 2, 2);
    px(c, P.gris[2], 12, 5, 2, 8);
    luces(c, 12, 15, 1, 2);
  });

  /* caja de equipo */
  objNuevo(O.CAJA, function (c) {
    bloque(c, 2, 10, 12, 13, P.ambar[1]);
    px(c, oscurecer(P.ambar[1], 0.6), 2, 15, 12, 1);
    px(c, P.ambar[3], 6, 12, 4, 2);
  });
}

function construirObjetos2() {
  /* Pizarra y placa van COLGADAS EN UN MURO, no apoyadas en el piso. Los
     objetos se dibujan 8 px más arriba de su casilla para que los altos
     sobresalgan; a estos hay que bajarlos esos 8 px o quedan cortados por
     el borde de arriba de la pantalla. */
  objNuevo(O.PIZARRA, function (c) {
    px(c, P.gris[0], 1, 10, 14, 12);
    px(c, P.hueso[4], 2, 11, 12, 10);
    px(c, P.cian[1], 3, 13, 5, 1); px(c, P.cian[1], 3, 15, 8, 1);
    px(c, P.rojo[2], 3, 17, 4, 1); px(c, P.gris[3], 8, 17, 4, 1);
    px(c, P.gris[2], 1, 21, 14, 1);
  });

  objNuevo(O.PLACA, function (c) {
    px(c, P.acero[0], 2, 12, 12, 7);
    px(c, P.cian[0], 3, 13, 10, 5);
    px(c, P.cian[2], 4, 14, 8, 1);
    px(c, P.cian[1], 4, 16, 6, 1);
  });

  /* sillón de recepción */
  objNuevo(O.SOFA, function (c) {
    bloque(c, 0, 9, 16, 8, "#2f5a6b");
    px(c, aclarar("#2f5a6b", 0.25), 1, 10, 14, 3);
    px(c, oscurecer("#2f5a6b", 0.6), 1, 16, 14, 2);
    px(c, P.gris[1], 2, 21, 2, 3); px(c, P.gris[1], 12, 21, 2, 3);
  });

  /* barra de la cafetería */
  objNuevo(O.BARRA, function (c) {
    px(c, oscurecer(P.hueso[1], 0.5), 0, 9, 16, 14);
    px(c, P.hueso[1], 0, 10, 16, 12);
    px(c, P.hueso[3], 0, 10, 16, 2);
    px(c, oscurecer(P.hueso[1], 0.7), 0, 20, 16, 2);
    px(c, P.gris[0], 4, 13, 3, 4); px(c, P.cian[2], 5, 14, 1, 2);
  });

  /* silla */
  objNuevo(O.SILLA, function (c) {
    px(c, P.gris[0], 4, 8, 8, 8);
    px(c, P.gris[2], 5, 9, 6, 6);
    px(c, P.gris[3], 5, 9, 6, 1);
    px(c, P.gris[1], 4, 16, 8, 3);
    px(c, P.gris[0], 5, 19, 2, 4); px(c, P.gris[0], 9, 19, 2, 4);
  });

  /* NÚCLEO: el mainframe. Late: se dibuja con brillo animado encima. */
  objNuevo(O.NUCLEO, function (c) {
    bloque(c, 1, 0, 14, 24, P.acero[2]);
    px(c, P.acero[0], 3, 3, 10, 18);
    px(c, P.cian[0], 4, 4, 8, 16);
    for (let y = 5; y < 19; y += 3) px(c, P.cian[1], 5, y, 6, 1);
    px(c, P.cian[3], 6, 9, 4, 6);
    px(c, P.cian[4], 7, 10, 2, 4);
    px(c, P.acero[3], 3, 2, 10, 1);
  });

  /* compuerta blindada del Núcleo, con cinco ranuras de credencial */
  objNuevo(O.COMPUERTA, function (c) {
    px(c, P.acero[0], 0, 2, 16, 22);
    px(c, P.acero[2], 1, 3, 14, 20);
    px(c, P.acero[3], 1, 3, 14, 1);
    px(c, P.acero[1], 1, 21, 14, 2);
    px(c, P.acero[0], 7, 3, 2, 20);                 /* juntura central */
    for (let i = 0; i < 5; i++) {
      const gx = 2 + (i % 3) * 5, gy = 7 + Math.floor(i / 3) * 6;
      px(c, P.acero[0], gx, gy, 4, 4);
      px(c, "#0a1420", gx + 1, gy + 1, 2, 2);
    }
    px(c, P.ambar[2], 1, 3, 14, 1);
  });
}

/* posición de las cinco ranuras dentro del sprite de la compuerta */
arte.RANURAS = [];
for (let i = 0; i < 5; i++) {
  arte.RANURAS.push([2 + (i % 3) * 5 + 1, 7 + Math.floor(i / 3) * 6 + 1]);
}

/* ------------------------------- retratos --------------------------------
   Busto de 32x32 para la caja de diálogo. En el mundo los personajes miden
   16 px y a esa escala no cabe una cara: el retrato es donde se les ve.
   Se dibuja con la misma paleta del personaje, así que un guardián nuevo
   tiene retrato sin que nadie dibuje nada.

   Campos opcionales del personaje: lentes, pelolargo, robot. */
const cacheRetratos = {};
arte.retratoDe = function (def) {
  const clave = [def.id, def.pelo, def.ropa, def.piel, def.lentes, def.pelolargo, def.robot].join("|");
  if (cacheRetratos[clave]) return cacheRetratos[clave];

  const L = lienzo(32, 32), c = L.cx;
  const N = "#080a12";
  const pelo = def.pelo || "#8a4b2a";
  const ropa = def.ropa || "#2f6f9e";
  const piel = def.piel || "#f0c39c";
  const peloS = oscurecer(pelo, 0.58), peloL = aclarar(pelo, 0.3);
  const ropaS = oscurecer(ropa, 0.62), ropaL = aclarar(ropa, 0.22);
  const pielS = oscurecer(piel, 0.78);

  /* --- hombros --- */
  px(c, N, 3, 22, 26, 10);
  px(c, ropa, 4, 23, 24, 9);
  px(c, ropaL, 4, 23, 24, 2);
  px(c, ropaS, 21, 25, 7, 7);
  px(c, N, 15, 23, 2, 9);

  /* --- cuello --- */
  px(c, N, 12, 18, 8, 5);
  px(c, pielS, 13, 18, 6, 5);

  /* --- pelo: la masa se redondea arriba, si no parece un casco --- */
  px(c, N, 10, 1, 12, 3);
  px(c, N, 8, 2, 16, 4);
  px(c, N, 6, 4, 20, def.pelolargo ? 21 : 16);
  px(c, pelo, 11, 2, 10, 3);
  px(c, pelo, 9, 3, 14, 3);
  px(c, pelo, 7, 5, 18, def.pelolargo ? 19 : 14);
  px(c, peloL, 9, 4, 6, 3);
  px(c, peloS, 20, 6, 4, def.pelolargo ? 17 : 12);

  /* --- cara --- */
  px(c, N, 9, 6, 14, 16);
  px(c, piel, 10, 7, 12, 14);
  px(c, pielS, 19, 9, 3, 11);
  px(c, pielS, 11, 20, 10, 1);

  /* --- flequillo --- */
  px(c, pelo, 10, 7, 12, 2);
  px(c, peloS, 18, 7, 4, 2);
  px(c, N, 10, 9, 12, 1);

  const ojoY = 12;
  if (def.robot) {
    px(c, N, 9, ojoY - 2, 14, 6);
    px(c, P.cian[1], 10, ojoY - 1, 12, 4);
    px(c, P.cian[3], 11, ojoY, 4, 1);
    px(c, P.cian[0], 17, ojoY + 1, 4, 1);
  } else {
    /* ojos */
    px(c, "#f6f6fb", 12, ojoY, 3, 3); px(c, "#f6f6fb", 17, ojoY, 3, 3);
    px(c, N, 13, ojoY + 1, 2, 2);     px(c, N, 18, ojoY + 1, 2, 2);
    px(c, N, 12, ojoY - 1, 3, 1);     px(c, N, 17, ojoY - 1, 3, 1);
    /* nariz y boca */
    px(c, pielS, 15, ojoY + 3, 2, 2);
    px(c, oscurecer(piel, 0.5), 14, 18, 4, 1);
    px(c, oscurecer(piel, 0.35), 15, 19, 2, 1);

    if (def.lentes) {
      /* Cristales como ARO, no como mancha: si se rellenan de blanco tapan
         los ojos y el personaje pierde la mirada. */
      const A = "#fffdff";
      px(c, A, 11, ojoY - 1, 5, 5);  px(c, piel, 12, ojoY, 3, 3);
      px(c, A, 17, ojoY - 1, 5, 5);  px(c, piel, 18, ojoY, 3, 3);
      px(c, N, 13, ojoY + 1, 2, 2);  px(c, N, 19, ojoY + 1, 2, 2);
      px(c, A, 16, ojoY, 1, 1);                       /* puente */
      px(c, A, 9, ojoY, 2, 1);   px(c, A, 22, ojoY, 1, 1);  /* patillas */
    }
  }

  cacheRetratos[clave] = L.cv;
  return L.cv;
};

arte.construir = function () {
  construirPisos();
  construirMuros();
  construirObjetos();
  construirObjetos2();
};

})();
