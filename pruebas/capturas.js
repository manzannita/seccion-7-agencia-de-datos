/* Dibuja el edificio y varias vistas del juego como PNG, sin navegador.
   Uso:  node pruebas/capturas.js
   La planta trae rejilla de coordenadas: es la forma rápida de elegir las
   x / y de un personaje nuevo en js/retos.js */
const fs = require('fs'), path = require('path');
const { Canvas, png } = require('./canvas.js');
const { arrancar } = require('./entorno.js');
const J = arrancar(), S7 = J.S7, CQ = J.CQ, JUEGO = J.JUEGO;
const A = CQ.arte, M = CQ.mapa, S = A.SUELO, O = A.OBJETO, T = 16;

const salida = path.join(__dirname, 'capturas');
if (!fs.existsSync(salida)) fs.mkdirSync(salida);

/* ------------------------- planta completa del edificio ------------------ */
const plano = new Canvas(M.AN * T, M.AL * T), c = plano.getContext('2d');
c.fillStyle = '#05070d'; c.fillRect(0, 0, plano.w, plano.h);
for (let y = 0; y < M.AL; y++) for (let x = 0; x < M.AN; x++) {
  const s = M.suelo_en(x, y);
  if (s === S.VACIO) continue;
  if (s === S.MURO) { c.drawImage(A.muro[M.mascaraMuro(x, y)], x * T, y * T); continue; }
  const lista = A.piso[s]; if (!lista) continue;
  const v = s === S.LOGO ? (x - M.LOGO_ORIGEN.x) + (y - M.LOGO_ORIGEN.y) * 2
                         : Math.floor(A.ruido(x * 13, y * 7) * lista.length) % lista.length;
  c.drawImage(lista[v % lista.length], x * T, y * T);
}
for (let y = 0; y < M.AL; y++) for (let x = 0; x < M.AN; x++) {
  const o = M.objeto_en(x, y);
  if (o !== O.NADA && A.objeto[o]) c.drawImage(A.objeto[o], x * T, y * T + T - 24);
}
c.fillStyle = 'rgba(255,255,255,0.16)';
for (let x = 0; x < M.AN; x += 4) c.fillRect(x * T, 0, 1, M.AL * T);
for (let y = 0; y < M.AL; y += 4) c.fillRect(0, y * T, M.AN * T, 1);
JUEGO.npcs.forEach(n => {
  c.fillStyle = n.reto ? '#ff2b2b' : '#ffcf40';
  c.fillRect(n.x * T + 3, n.y * T + 3, 10, 10);
  c.fillStyle = '#ffffff'; c.fillRect(n.x * T + 6, n.y * T + 6, 4, 4);
});
JUEGO.terminales.forEach(t => { c.fillStyle = '#1fb8d4'; c.fillRect(t[0] * T + 5, t[1] * T + 5, 6, 6); });
c.fillStyle = '#2bff2b'; c.fillRect(M.INICIO.x * T + 3, M.INICIO.y * T + 3, 10, 10);
png(plano, path.join(salida, 'planta.png'));
console.log('planta.png            ' + plano.w + 'x' + plano.h);
console.log('   rojo = da un reto · dorado = personaje de ambiente');
console.log('   verde = inicio · cian = terminal legible · rejilla cada 4 casillas');

/* --------------------------- vistas tal como se juegan ------------------- */
function escalar(src, f) {
  const d = new Canvas(src.w * f, src.h * f);
  for (let y = 0; y < d.h; y++) for (let x = 0; x < d.w; x++) {
    const s = (((y / f) | 0) * src.w + ((x / f) | 0)) * 4, i = (y * d.w + x) * 4;
    d.data[i] = src.data[s]; d.data[i + 1] = src.data[s + 1];
    d.data[i + 2] = src.data[s + 2]; d.data[i + 3] = src.data[s + 3];
  }
  return d;
}
S7.modo('juego');
const vistas = [
  ['recepcion', 28, 34], ['servidores', 11, 24], ['laboratorio', 11, 13],
  ['boveda', 44, 11], ['redes', 45, 25], ['archivo', 10, 35],
  ['cafeteria', 44, 35], ['compuerta', 28, 12]
];
vistas.forEach(([nombre, x, y]) => {
  S7.jugador.x = (x + 0.5) * T; S7.jugador.y = (y + 0.9) * T; S7.jugador.dir = 'down';
  S7.camara(); S7.dibujar();
  png(escalar(J.pantalla, 2), path.join(salida, 'vista-' + nombre + '.png'));
  console.log('vista-' + nombre + '.png');
});
console.log('\nImágenes en ' + salida);
