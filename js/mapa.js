/* =============================================================================
   AGENCIA — mapa.js
   Planta del edificio: salas rectangulares unidas por pasillos, al estilo de
   la nave de Among Us. Los muros NO se dibujan a mano: se generan solos
   alrededor del piso, y cada muro elige su dibujo según a qué lado tiene sala.
   ========================================================================== */
(function () {
"use strict";

const arte = window.CQ.arte, S = arte.SUELO, O = arte.OBJETO;
const mapa = {};
window.CQ.mapa = mapa;

const AN = mapa.AN = 56, AL = mapa.AL = 42;

/* --------------------------------- salas --------------------------------
   x,y = esquina superior izquierda del PISO (los muros se agregan afuera). */
const SALAS = mapa.SALAS = [
  { id: "nucleo",     nombre: "NÚCLEO",              x: 23, y: 2,  w: 11, h: 7, piso: S.BOVEDA },
  { id: "laboratorio",nombre: "LABORATORIO DE DATOS",x: 5,  y: 7,  w: 14, h: 9, piso: S.TEC },
  { id: "boveda",     nombre: "BÓVEDA DE CIFRADO",   x: 38, y: 7,  w: 13, h: 9, piso: S.BOVEDA },
  { id: "servidores", nombre: "SALA DE SERVIDORES",  x: 4,  y: 21, w: 13, h: 8, piso: S.METAL },
  { id: "redes",      nombre: "CENTRO DE REDES",     x: 39, y: 21, w: 13, h: 8, piso: S.TEC },
  { id: "archivo",    nombre: "ARCHIVO",             x: 5,  y: 32, w: 12, h: 7, piso: S.PASILLO },
  { id: "cafeteria",  nombre: "CAFETERÍA",           x: 39, y: 32, w: 12, h: 7, piso: S.BALDOSA },
  { id: "recepcion",  nombre: "RECEPCIÓN",           x: 23, y: 30, w: 11, h: 8, piso: S.ALFOMBRA }
];

/* pasillos: [x, y, ancho, alto] */
const PASILLOS = [
  [27, 10, 3, 20],   /* troncal norte-sur: del Núcleo a Recepción */
  [17, 24, 22, 3],   /* troncal este-oeste: Servidores a Redes    */
  [19, 10, 8, 3],    /* Laboratorio -> troncal                     */
  [30, 10, 8, 3],    /* troncal -> Bóveda                          */
  [9, 29, 3, 3],     /* Servidores -> Archivo                      */
  [44, 29, 3, 3],    /* Redes -> Cafetería                         */
  [17, 34, 6, 3],    /* Archivo -> Recepción                       */
  [34, 34, 5, 3]     /* Recepción -> Cafetería                     */
];

/* umbrales: franjas amarillas que marcan cada entrada */
const UMBRALES = [
  [27, 30, 3, 1], [16, 24, 1, 3], [39, 24, 1, 3],
  [19, 12, 1, 1], [18, 11, 1, 1], [37, 11, 1, 1], [38, 12, 1, 1],
  [9, 31, 3, 1], [44, 31, 3, 1], [17, 35, 1, 1], [38, 35, 1, 1],
  [22, 35, 1, 1], [34, 35, 1, 1]
];

/* ----------------------------- capas del mapa ---------------------------- */
const suelo = mapa.suelo = new Uint8Array(AN * AL);
const objetos = mapa.objetos = new Uint8Array(AN * AL);
const zona = mapa.zona = new Array(AN * AL).fill(null);

const idx = (x, y) => y * AN + x;
mapa.dentro = (x, y) => x >= 0 && y >= 0 && x < AN && y < AL;
mapa.suelo_en = (x, y) => mapa.dentro(x, y) ? suelo[idx(x, y)] : S.VACIO;
mapa.objeto_en = (x, y) => mapa.dentro(x, y) ? objetos[idx(x, y)] : O.NADA;
mapa.zona_en = (x, y) => mapa.dentro(x, y) ? zona[idx(x, y)] : null;
mapa.poner = function (x, y, t) { if (mapa.dentro(x, y)) suelo[idx(x, y)] = t; };
mapa.ponerObjeto = function (x, y, o) { if (mapa.dentro(x, y)) objetos[idx(x, y)] = o; };

mapa.solido = function (x, y) {
  if (!mapa.dentro(x, y)) return true;
  const s = suelo[idx(x, y)];
  if (arte.SUELO_SOLIDO[s]) return true;
  return objetos[idx(x, y)] !== O.NADA;
};
mapa.esPiso = function (x, y) {
  const s = mapa.suelo_en(x, y);
  return s !== S.VACIO && s !== S.MURO;
};

function rect(x, y, w, h, t, z) {
  for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) {
    if (!mapa.dentro(i, j)) continue;
    suelo[idx(i, j)] = t;
    if (z !== undefined) zona[idx(i, j)] = z;
  }
}

/* ------------------------------ mobiliario -------------------------------
   Colocado a mano: un generador aleatorio deja las salas con cara de bodega. */
function amueblar() {
  const P = mapa.ponerObjeto;

  /* SERVIDORES: dos hileras de racks con pasillos para caminar entre ellos */
  [22, 27].forEach(function (y) {
    for (let x = 5; x <= 15; x++) if (x !== 8 && x !== 12) P(x, y, O.RACK);
  });
  P(4, 21, O.TERMINAL); P(16, 28, O.CAJA);

  /* LABORATORIO: fila de puestos de análisis mirando a la pizarra */
  for (let x = 6; x <= 17; x += 2) P(x, 8, O.ESCRITORIO);
  for (let x = 6; x <= 17; x += 4) P(x, 10, O.SILLA);
  for (let x = 7; x <= 16; x += 3) P(x, 13, O.ESCRITORIO);
  P(11, 6, O.PIZARRA); P(12, 6, O.PIZARRA);
  P(5, 15, O.PLANTA); P(18, 15, O.PLANTA);

  /* BÓVEDA: archivadores contra las paredes y cajas fuertes al centro */
  for (let x = 39; x <= 49; x += 2) P(x, 8, O.ARCHIVADOR);
  P(38, 7, O.TERMINAL); P(50, 7, O.TERMINAL);
  P(41, 12, O.CAJA); P(43, 12, O.CAJA); P(47, 12, O.CAJA);
  P(44, 6, O.PLACA);

  /* REDES: consolas en la pared norte y una mesa de operaciones */
  for (let x = 40; x <= 50; x += 2) P(x, 21, O.TERMINAL);
  for (let x = 42; x <= 48; x++) P(x, 26, O.MESA);
  P(42, 28, O.SILLA); P(45, 28, O.SILLA); P(48, 28, O.SILLA);
  P(51, 28, O.PLANTA);

  /* ARCHIVO: pasillos de archivadores */
  [33, 37].forEach(function (y) {
    for (let x = 6; x <= 15; x++) if (x !== 10) P(x, y, O.ARCHIVADOR);
  });
  P(5, 32, O.CAJA); P(16, 38, O.CAJA);

  /* CAFETERÍA: barra, máquina y mesas */
  for (let x = 41; x <= 47; x++) P(x, 33, O.BARRA);
  P(39, 33, O.MAQUINA); P(49, 33, O.PLANTA);
  [42, 45, 48].forEach(function (x) { P(x, 36, O.MESA); P(x, 37, O.SILLA); });

  /* RECEPCIÓN: el mostrador va a un lado, no frente a la puerta: si tapa la
     entrada la directora queda inalcanzable y el paso se estrecha. */
  for (let x = 24; x <= 26; x++) P(x, 31, O.BARRA);
  P(32, 32, O.SOFA); P(33, 32, O.SOFA);
  P(32, 35, O.SOFA); P(33, 35, O.SOFA);
  P(23, 30, O.PLANTA); P(33, 30, O.PLANTA);
  P(23, 37, O.PLANTA); P(33, 37, O.PLANTA);
  rect(27, 34, 2, 2, S.LOGO, "recepcion");
  mapa.LOGO_ORIGEN = { x: 27, y: 34 };

  /* NÚCLEO: el mainframe al centro, consolas alrededor */
  P(28, 4, O.NUCLEO);
  P(26, 4, O.TERMINAL); P(30, 4, O.TERMINAL);
  P(24, 2, O.ARCHIVADOR); P(32, 2, O.ARCHIVADOR);
}

/* ------------------------------ construcción ----------------------------- */
mapa.PUERTA_NUCLEO = { x: 28, y: 9 };
mapa.INICIO = { x: 28, y: 36 };

mapa.construir = function () {
  suelo.fill(S.VACIO);
  objetos.fill(O.NADA);
  zona.fill(null);

  SALAS.forEach(function (s) { rect(s.x, s.y, s.w, s.h, s.piso, s.id); });
  PASILLOS.forEach(function (p) { rect(p[0], p[1], p[2], p[3], S.PASILLO, "pasillo"); });

  /* muros: todo lo vacío que toque piso (incluidas diagonales) se vuelve muro */
  const nuevos = [];
  for (let y = 0; y < AL; y++) for (let x = 0; x < AN; x++) {
    if (suelo[idx(x, y)] !== S.VACIO) continue;
    let toca = false;
    for (let j = -1; j <= 1 && !toca; j++) for (let i = -1; i <= 1; i++) {
      if (mapa.esPiso(x + i, y + j)) { toca = true; break; }
    }
    if (toca) nuevos.push(idx(x, y));
  }
  nuevos.forEach(function (k) { suelo[k] = S.MURO; });

  UMBRALES.forEach(function (u) { rect(u[0], u[1], u[2], u[3], S.UMBRAL); });
  mapa.poner(10, 25, S.REJILLA); mapa.poner(30, 25, S.REJILLA);
  mapa.poner(28, 20, S.REJILLA);

  amueblar();
  /* la compuerta del Núcleo va sobre el muro que lo separa del pasillo */
  mapa.ponerObjeto(mapa.PUERTA_NUCLEO.x, mapa.PUERTA_NUCLEO.y, O.COMPUERTA);
};

/* al reunir las credenciales la compuerta se abre y deja pasar */
mapa.abrirNucleo = function () {
  mapa.ponerObjeto(mapa.PUERTA_NUCLEO.x, mapa.PUERTA_NUCLEO.y, O.NADA);
  mapa.poner(mapa.PUERTA_NUCLEO.x, mapa.PUERTA_NUCLEO.y, S.UMBRAL);
};

/* máscara de autotile del muro: 1=piso al N, 2=al E, 4=al S, 8=al O */
mapa.mascaraMuro = function (x, y) {
  return (mapa.esPiso(x, y - 1) ? 1 : 0) | (mapa.esPiso(x + 1, y) ? 2 : 0) |
         (mapa.esPiso(x, y + 1) ? 4 : 0) | (mapa.esPiso(x - 1, y) ? 8 : 0);
};

mapa.salaDe = function (x, y) {
  const z = mapa.zona_en(x, y);
  if (!z || z === "pasillo") return null;
  for (let i = 0; i < SALAS.length; i++) if (SALAS[i].id === z) return SALAS[i];
  return null;
};

})();
