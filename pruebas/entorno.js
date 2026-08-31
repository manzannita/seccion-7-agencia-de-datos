/* Carga el juego completo fuera del navegador, con un DOM mínimo de mentira.
   Sirve para verificar el mapa, los retos y una partida entera sin abrir Chrome. */
const fs = require('fs'), path = require('path');
const { Canvas, leerPNG } = require('./canvas.js');
const RAIZ = path.join(__dirname, '..');

function arrancar() {
  const pantalla = new Canvas(336, 192);
  const cache = {}, oyentesVentana = {}, oyentesDoc = {};
  const realTimeout = setTimeout;

  function nuevoEl(id, etiqueta) {
    const oyentes = {};
    return {
      id, tagName: etiqueta || (/^(in|editor)/.test(id) ? 'INPUT' : 'DIV'),
      style: { setProperty() {}, display: '' },
      classList: {
        _c: new Set(),
        add(c) { this._c.add(c || '_v'); }, remove(c) { this._c.delete(c || '_v'); },
        get _v() { return this._c.has('visible') || this._c.has('_v'); }
      },
      addEventListener(t, f) { (oyentes[t] = oyentes[t] || []).push(f); },
      disparar(t, ev) {
        (oyentes[t] || []).forEach(f => f(Object.assign(
          { preventDefault() {}, stopPropagation() {}, target: this }, ev || {})));
      },
      setAttribute(k, v) { this[k] = v; }, appendChild() {}, removeChild() {},
      firstElementChild: { style: {} },
      contentWindow: { postMessage() {} }, parentNode: null,
      focus() {}, textContent: '', innerHTML: '', value: '', placeholder: '',
      disabled: false, src: '', selectionStart: 0, selectionEnd: 0, scrollTop: 0
    };
  }
  const el = id => id === 'pantalla' ? pantalla : (cache[id] || (cache[id] = nuevoEl(id)));

  /* El intérprete de Python del navegador (Pyodide) no existe en Node. Para
     las pruebas se reemplaza por el Python de la máquina, que corre EL MISMO
     js/piloto.py a través de pruebas/puente.py. Así la partida simulada
     ejecuta Python de verdad. */
  global.Blob = function () {};
  /* URL sigue siendo el constructor de Node: codigo.js lo usa para armar rutas */
  URL.createObjectURL = () => 'blob:falso';
  URL.revokeObjectURL = () => {};
  global.Worker = function () { throw new Error('sin Worker en Node'); };
  global.fetch = () => Promise.reject(new Error('sin red en las pruebas'));
  global.location = { href: 'http://localhost/', protocol: 'http:' };
  global.navigator = { onLine: true };

  global.document = {
    getElementById: el,
    createElement: t => t === 'iframe' ? nuevoEl('iframe', 'IFRAME') : new Canvas(16, 24),
    documentElement: { style: { setProperty() {} } },
    addEventListener(t, f) { (oyentesDoc[t] = oyentesDoc[t] || []).push(f); },
    fullscreenElement: null,
    body: { appendChild() {}, removeChild() {} }
  };
  global.window = {
    addEventListener(t, f) { (oyentesVentana[t] = oyentesVentana[t] || []).push(f); },
    removeEventListener() {},
    innerWidth: 1280, innerHeight: 800
  };
  /* Image que sí lee del disco: así las capturas muestran los sprites de
     verdad. El juego asigna src al final, después de onload/onerror. */
  global.Image = function () {
    const img = this;
    let valor = '';
    Object.defineProperty(this, 'src', {
      get() { return valor; },
      set(v) {
        valor = v;
        try {
          const cv = leerPNG(path.join(RAIZ, v));
          img.width = cv.w; img.height = cv.h; img.data = cv.data; img.w = cv.w; img.h = cv.h;
          if (img.onload) img.onload();
        } catch (e) {
          if (img.onerror) img.onerror(e);
        }
      }
    });
  };
  const disco = {};
  global.localStorage = {
    getItem: k => disco[k] || null, setItem(k, v) { disco[k] = v; }, removeItem(k) { delete disco[k]; }
  };
  let rafCb = null, reloj = 0;
  global.requestAnimationFrame = f => { rafCb = f; };
  /* tiempos comprimidos: se respeta el orden pero la prueba no tarda minutos */
  global.setTimeout = (f, ms) => realTimeout(f, Math.min(ms || 0, 40));
  global.clearTimeout = clearTimeout;

  ['js/arte.js', 'js/mapa.js', 'js/codigo.js', 'js/retos.js', 'js/juego.js'].forEach(function (f) {
    const src = fs.readFileSync(path.join(RAIZ, f), 'utf8');
    if (f === 'js/retos.js') { global.JUEGO = eval(src + String.fromCharCode(10) + ';JUEGO'); }
    else eval(src);
    /* En cuanto codigo.js está cargado se cambia Pyodide por el Python de la
       máquina. Tiene que ser ANTES de juego.js, que llama a preparar() al
       arrancar: si no, el juego cree que no hay intérprete y bloquea EJECUTAR. */
    if (f === 'js/codigo.js') {
      const C = global.window.CQ.codigo;
      C.ejecutar = (fuente, funcion, casos, comoDataFrame) =>
        Promise.resolve(pedirAPython({ tipo: 'correr', codigo: String(fuente || ''), funcion,
                                       casos: casos || [], comoDataFrame: !!comoDataFrame }));
      C.revisarSintaxis = (fuente) => String(fuente || '').trim()
        ? Promise.resolve(pedirAPython({ tipo: 'sintaxis', codigo: String(fuente) }))
        : Promise.resolve({ ok: false, mensaje: '' });
      C.preparar = () => {};
      C.estado = () => ({ listo: true, arrancando: false, fallo: null, pandas: true });
    }
  });

  function tick(n) { for (let i = 0; i < (n || 1); i++) { reloj += 40; if (rafCb) rafCb(reloj); } }
  function tecla(k, destino) {
    (oyentesVentana.keydown || []).forEach(f => f({ key: k, target: destino, preventDefault() {} }));
  }
  function pasarDialogo(veces) {
    for (let i = 0; i < (veces || 40); i++) { tick(); tecla('e'); tick(); tecla('e'); }
  }
  const esperar = ms => new Promise(r => realTimeout(r, ms || 60));

  return {
    S7: global.window.S7, CQ: global.window.CQ, JUEGO: global.JUEGO,
    el, tick, tecla, pasarDialogo, esperar, pantalla, disco, oyentesVentana
  };
}
/* --------- llama al Python de la máquina con el mismo js/piloto.py -------- */
const { execFileSync } = require('child_process');
let PYTHON = null;
function buscarPython() {
  if (PYTHON) return PYTHON;
  for (const cmd of ['python', 'python3', 'py']) {
    try {
      execFileSync(cmd, ['-c', 'print(1)'], { stdio: 'pipe' });
      PYTHON = cmd; return cmd;
    } catch (e) { /* seguir probando */ }
  }
  throw new Error('No encontré Python en el sistema. Las pruebas de código lo necesitan.');
}
function pedirAPython(trabajo) {
  try {
    const salida = execFileSync(buscarPython(), [path.join(__dirname, 'puente.py')],
      { input: JSON.stringify(trabajo), encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
    return JSON.parse(salida);
  } catch (e) {
    return { error: 'el puente con Python falló: ' + (e.message || e) };
  }
}

module.exports = { arrancar, pedirAPython, buscarPython };
