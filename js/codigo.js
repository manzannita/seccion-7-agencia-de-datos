/* =============================================================================
   SECCIÓN 7 — codigo.js
   Ejecuta el código Python de los equipos sin que puedan colgar el juego.

   CÓMO FUNCIONA
   El intérprete es Pyodide: CPython compilado a WebAssembly. Vive dentro de un
   Web Worker, o sea en otro hilo, así que el juego sigue respondiendo pase lo
   que pase con el código del equipo. La lógica de corrección está en
   js/piloto.py, que se ejecuta dentro de ese intérprete.

   POR QUÉ HACE FALTA UN SERVIDOR
   Pyodide carga su intérprete con fetch(), y desde file:// el navegador
   bloquea esas peticiones. Con doble clic el juego se ve y se camina, pero la
   terminal de Python no arranca. Usa el lanzador (jugar.bat / jugar.sh) o
   levanta un servidor: python -m http.server 8000

   TRES REDES CONTRA LOS BUCLES INFINITOS
   1. piloto.py instala un vigilante por línea que corta a los 2 segundos.
      Es la que actúa casi siempre: no hay que recargar nada.
   2. Si el equipo desactiva ese vigilante, el Worker se mata a los 10 s
      y se levanta uno nuevo.
   3. Pase lo que pase, el hilo del juego nunca se bloquea.
   ========================================================================== */
(function () {
"use strict";

const codigo = {};
window.CQ = window.CQ || {};
window.CQ.codigo = codigo;

/* Versión fijada a propósito: que una actualización del CDN no rompa la
   competencia el día de la competencia. */
const PYODIDE_CDN = "https://cdn.jsdelivr.net/pyodide/v0.26.4/full/";
const PYODIDE_LOCAL = "vendor/pyodide/";
const LIMITE_DURO_MS = 10000;

/* ------------------------ el cuerpo del Worker ---------------------------- */
const CUERPO_WORKER = [
  "let pyodide = null, correr = null, revisar = null;",
  "async function iniciar(base, urlPiloto) {",
  "  try {",
  "    importScripts(base + 'pyodide.js');",
  "    self.postMessage({ progreso: 'descargando el intérprete de Python' });",
  "    pyodide = await loadPyodide({ indexURL: base });",
  "    self.postMessage({ progreso: 'preparando el corrector' });",
  "    const resp = await fetch(urlPiloto);",
  "    if (!resp.ok) throw new Error('no pude leer piloto.py (' + resp.status + ')');",
  "    pyodide.runPython(await resp.text());",
  "    correr = pyodide.globals.get('correr');",
  "    revisar = pyodide.globals.get('revisar');",
  "    self.postMessage({ listo: true });",
  "    /* pandas pesa 35 MB mas: se baja DESPUES de avisar que el interprete",
  "       basico esta listo, para que se pueda empezar a jugar de inmediato. */",
  "    try {",
  "      self.postMessage({ progreso: 'descargando pandas en segundo plano' });",
  "      await pyodide.loadPackage(['pandas']);",
  "      pyodide.runPython(await (await fetch(urlPiloto)).text());",
  "      correr = pyodide.globals.get('correr');",
  "      revisar = pyodide.globals.get('revisar');",
  "      self.postMessage({ pandasListo: true });",
  "    } catch (e2) {",
  "      self.postMessage({ pandasFallo: String(e2 && e2.message ? e2.message : e2) });",
  "    }",
  "  } catch (err) {",
  "    self.postMessage({ fallo: String(err && err.message ? err.message : err) });",
  "  }",
  "}",
  "self.onmessage = function (e) {",
  "  const d = e.data || {};",
  "  if (d.tipo === 'init') { iniciar(d.base, d.piloto); return; }",
  "  if (!pyodide) { self.postMessage({ id: d.id, error: 'El intérprete de Python todavía no está listo.' }); return; }",
  "  try {",
  "    if (d.tipo === 'sintaxis') {",
  "      self.postMessage({ id: d.id, json: revisar(d.codigo) });",
  "    } else {",
  "      self.postMessage({ id: d.id, json: correr(d.codigo, d.funcion, d.casos, !!d.comoDataFrame) });",
  "    }",
  "  } catch (err) {",
  "    self.postMessage({ id: d.id, error: String(err && err.message ? err.message : err) });",
  "  }",
  "};"
].join("\n");

/* ------------------------------ estado ------------------------------------ */
let worker = null, listo = false, arrancando = false, fallo = null;
let pandasListo = false, pandasFallo = null;
let siguienteId = 1;
const pendientes = {};
const oyentes = [];

codigo.alCambiarEstado = function (f) { oyentes.push(f); };
function avisar(texto, tipo) {
  oyentes.forEach(function (f) {
    try { f({ listo: listo, pandas: pandasListo, texto: texto, tipo: tipo }); } catch (e) {}
  });
}
codigo.estado = function () {
  return { listo: listo, arrancando: arrancando, fallo: fallo,
           pandas: pandasListo, pandasFallo: pandasFallo };
};

/* --------------------------- arranque del intérprete ---------------------- */
function absoluta(rel) { return new URL(rel, location.href).href; }

/* Si alguien dejó una copia de Pyodide en vendor/pyodide/, se usa esa y el
   juego funciona sin internet. Si no, se baja del CDN. */
function elegirBase() {
  return fetch(absoluta(PYODIDE_LOCAL + "pyodide.js"), { method: "HEAD" })
    .then(function (r) { return r.ok ? absoluta(PYODIDE_LOCAL) : PYODIDE_CDN; })
    .catch(function () { return PYODIDE_CDN; });
}

codigo.preparar = function () {
  if (listo || arrancando) return;
  if (location.protocol === "file:") {
    fallo = "El juego está abierto con doble clic (file://) y así el navegador " +
            "no deja arrancar Python. Ciérralo y usa el lanzador jugar.bat, " +
            "o levanta un servidor con:  python -m http.server 8000";
    avisar(fallo, "fallo");
    return;
  }
  arrancando = true;
  avisar("arrancando el intérprete de Python", "cargando");
  elegirBase().then(function (base) {
    try {
      const blob = new Blob([CUERPO_WORKER], { type: "application/javascript" });
      worker = new Worker(URL.createObjectURL(blob));
    } catch (e) {
      arrancando = false;
      fallo = "Este navegador no deja crear el intérprete: " + e.message;
      avisar(fallo, "fallo");
      return;
    }
    worker.onmessage = alMensaje;
    worker.onerror = function (e) {
      arrancando = false;
      fallo = "El intérprete de Python falló al arrancar: " + (e.message || "error desconocido");
      avisar(fallo, "fallo");
    };
    worker.postMessage({ tipo: "init", base: base, piloto: absoluta("js/piloto.py") });
  });
};

function alMensaje(e) {
  const d = e.data || {};
  if (d.progreso) { avisar(d.progreso, "cargando"); return; }
  if (d.listo) {
    listo = true; arrancando = false; fallo = null;
    avisar("Python listo", "listo");
    return;
  }
  if (d.pandasListo) {
    pandasListo = true; pandasFallo = null;
    avisar("Python y pandas listos", "listo");
    return;
  }
  if (d.pandasFallo) {
    pandasFallo = d.pandasFallo;
    avisar("Python listo, pero pandas no se pudo cargar: " + d.pandasFallo, "aviso");
    return;
  }
  if (d.fallo) {
    listo = false; arrancando = false;
    fallo = "No se pudo cargar Python: " + d.fallo +
            (navigator.onLine === false ? " (parece que no hay internet)" : "");
    avisar(fallo, "fallo");
    Object.keys(pendientes).forEach(function (id) {
      pendientes[id].resolver({ error: fallo });
      delete pendientes[id];
    });
    return;
  }
  const p = pendientes[d.id];
  if (!p) return;
  delete pendientes[d.id];
  clearTimeout(p.reloj);
  if (d.error) { p.resolver({ error: d.error }); return; }
  try { p.resolver(JSON.parse(d.json)); }
  catch (err) { p.resolver({ error: "El corrector devolvió algo ilegible." }); }
}

/* Red de seguridad: si el vigilante de piloto.py fue desactivado y el Worker
   no responde, se lo mata y se levanta uno nuevo. */
function reiniciar() {
  if (worker) { try { worker.terminate(); } catch (e) {} }
  worker = null; listo = false; arrancando = false; pandasListo = false;
  Object.keys(pendientes).forEach(function (id) { delete pendientes[id]; });
  codigo.preparar();
}

function pedir(mensaje, limite) {
  return new Promise(function (resolver) {
    if (fallo) { resolver({ error: fallo }); return; }
    if (!listo) { resolver({ error: "El intérprete de Python todavía se está cargando. Espera unos segundos." }); return; }
    const id = siguienteId++;
    mensaje.id = id;
    pendientes[id] = {
      resolver: resolver,
      reloj: setTimeout(function () {
        delete pendientes[id];
        avisar("reiniciando el intérprete", "cargando");
        reiniciar();
        resolver({
          error: "Tu código bloqueó el intérprete y hubo que reiniciarlo. " +
                 "Revisa si hay un bucle que nunca termina.",
          corte: true
        });
      }, limite || LIMITE_DURO_MS)
    };
    worker.postMessage(mensaje);
  });
}

codigo.ejecutar = function (fuente, funcion, casos, comoDataFrame) {
  return pedir({ tipo: "correr", codigo: String(fuente || ""), funcion: funcion,
                 casos: JSON.stringify(casos || []), comoDataFrame: !!comoDataFrame });
};

codigo.revisarSintaxis = function (fuente) {
  if (!String(fuente || "").trim()) return Promise.resolve({ ok: false, mensaje: "" });
  if (!listo) return Promise.resolve({ ok: false, mensaje: "" });
  return pedir({ tipo: "sintaxis", codigo: String(fuente) }, 4000);
};

/* ------------------------------- el editor -------------------------------
   Un textarea con numeración, indentación de 4 espacios (la de Python) y
   aviso de sintaxis en vivo. Sin resaltado de color: colorear dentro de un
   textarea obliga a montar una capa espejo que se desalinea al menor
   descuido, y a esta edad estorba más de lo que ayuda. */
codigo.montarEditor = function (opciones) {
  const ta = opciones.editor, nums = opciones.numeros, aviso = opciones.sintaxis;
  const SANGRIA = "    ";                 /* Python: 4 espacios */
  let temporizador = null;

  function renumerar() {
    const n = ta.value.split("\n").length;
    let s = "";
    for (let i = 1; i <= n; i++) s += i + (i < n ? "\n" : "");
    nums.textContent = s;
    nums.scrollTop = ta.scrollTop;
  }
  function revisar() {
    const fuente = ta.value;
    codigo.revisarSintaxis(fuente).then(function (r) {
      if (ta.value !== fuente) return;    /* llegó tarde: ya siguieron escribiendo */
      aviso.textContent = r.mensaje ? (r.ok ? "✓ " + r.mensaje : "✗ " + r.mensaje) : "";
      aviso.className = r.ok ? "bien" : "";
    });
  }
  function alEscribir() {
    renumerar();
    clearTimeout(temporizador);
    temporizador = setTimeout(revisar, 400);
  }

  ta.addEventListener("input", alEscribir);
  ta.addEventListener("scroll", function () { nums.scrollTop = ta.scrollTop; });

  ta.addEventListener("keydown", function (e) {
    e.stopPropagation();                  /* que WASD no mueva al personaje */

    if (e.key === "Tab") {
      e.preventDefault();
      const ini = ta.selectionStart, fin = ta.selectionEnd, v = ta.value;
      if (ini === fin && !e.shiftKey) {
        ta.value = v.slice(0, ini) + SANGRIA + v.slice(fin);
        ta.selectionStart = ta.selectionEnd = ini + SANGRIA.length;
      } else {
        const a = v.lastIndexOf("\n", ini - 1) + 1;
        const bloque = v.slice(a, fin);
        const nuevo = e.shiftKey ? bloque.replace(/^ {1,4}/gm, "")
                                 : bloque.replace(/^/gm, SANGRIA);
        ta.value = v.slice(0, a) + nuevo + v.slice(fin);
        ta.selectionStart = a; ta.selectionEnd = a + nuevo.length;
      }
      alEscribir();
      return;
    }

    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      if (opciones.alEjecutar) opciones.alEjecutar();
      return;
    }

    if (e.key === "Enter") {
      /* mantiene la sangría, y agrega un nivel después de los dos puntos:
         en Python la indentación es la sintaxis, no un adorno */
      const ini = ta.selectionStart, v = ta.value;
      const a = v.lastIndexOf("\n", ini - 1) + 1;
      const anterior = v.slice(a, ini);
      const sangria = (anterior.match(/^[ \t]*/) || [""])[0];
      const abreBloque = /:\s*(#.*)?$/.test(anterior);
      e.preventDefault();
      const ins = "\n" + sangria + (abreBloque ? SANGRIA : "");
      ta.value = v.slice(0, ini) + ins + v.slice(ta.selectionEnd);
      ta.selectionStart = ta.selectionEnd = ini + ins.length;
      alEscribir();
    }
  });

  return {
    poner: function (texto) { ta.value = texto || ""; alEscribir(); },
    leer: function () { return ta.value; },
    refrescar: alEscribir
  };
};

})();
