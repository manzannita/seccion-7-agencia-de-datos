/* Genera la plantilla para dibujar personajes propios.
   Uso:  node pruebas/plantilla.js

   Deja dos archivos en sprites/:
     _plantilla.png       48x64, tamaño real. Ábrelo en tu editor de pixel art
                          y dibuja encima: ya trae un personaje de ejemplo con
                          las 12 poses en su sitio.
     _plantilla-guia.png  el mismo, ampliado 6x y con la cuadrícula marcada,
                          para mirar mientras dibujas.

   DISPOSICIÓN DE LA HOJA (3 columnas x 4 filas):
     columna 1: quieto      columna 2: paso A      columna 3: paso B
     fila 1: mirando abajo  fila 2: arriba  fila 3: izquierda  fila 4: derecha
   Los pies del personaje van pegados al borde inferior de cada cuadro. */
const fs = require('fs'), path = require('path');
const { Canvas, png } = require('./canvas.js');
const { arrancar } = require('./entorno.js');
const A = arrancar().CQ.arte;

const destino = path.join(__dirname, '..', 'sprites');
if (!fs.existsSync(destino)) fs.mkdirSync(destino);

/* la hoja que el motor genera por código sirve como base para calcar */
const hoja = A.hojaDe("#8a4b2a", "#2f6f9e", "#f0c39c");
const base = new Canvas(48, 64), bc = base.getContext('2d');
bc.drawImage(hoja, 0, 0);
png(base, path.join(destino, '_plantilla.png'));

/* versión ampliada con cuadrícula */
const Z = 6;
const guia = new Canvas(48 * Z, 64 * Z), gc = guia.getContext('2d');
/* fondo de damero: contra un fondo liso, los píxeles oscuros del pantalón
   desaparecen y parece que al personaje le faltan las piernas */
for (let y = 0; y < 64; y++) for (let x = 0; x < 48; x++) {
  gc.fillStyle = ((x >> 1) + (y >> 1)) % 2 ? '#9aa3b8' : '#c8cedd';
  gc.fillRect(x * Z, y * Z, Z, Z);
}
for (let y = 0; y < 64; y++) for (let x = 0; x < 48; x++) {
  const s = (y * 48 + x) * 4;
  if (!base.data[s + 3]) continue;
  gc.fillStyle = 'rgb(' + base.data[s] + ',' + base.data[s + 1] + ',' + base.data[s + 2] + ')';
  gc.fillRect(x * Z, y * Z, Z, Z);
}
gc.fillStyle = 'rgba(20,30,60,0.22)';           /* rejilla de 1 píxel */
for (let x = 0; x <= 48; x++) gc.fillRect(x * Z, 0, 1, guia.h);
for (let y = 0; y <= 64; y++) gc.fillRect(0, y * Z, guia.w, 1);
gc.fillStyle = '#f5c14e';                          /* separación de cuadros */
for (let x = 0; x <= 48; x += 16) gc.fillRect(x * Z - 1, 0, 3, guia.h);
for (let y = 0; y <= 64; y += 16) gc.fillRect(0, y * Z - 1, guia.w, 3);
png(guia, path.join(destino, '_plantilla-guia.png'));

console.log('sprites/_plantilla.png       48x64  (tamaño real, para calcar)');
console.log('sprites/_plantilla-guia.png  ' + guia.w + 'x' + guia.h + '  (ampliada, con cuadrícula)');
console.log('\nColumnas: quieto, paso A, paso B');
console.log('Filas:    abajo, arriba, izquierda, derecha');
console.log('\nCuando tengas el PNG, en js/retos.js agrega al personaje:');
console.log('   sprite: "sprites/tu-personaje.png"');
