/* =============================================================================
   SECCIÓN 7 — registro.js
   Manda a la nube cada intento de los equipos. Nada de esto es imprescindible:
   si no hay configuración, si no hay red o si el servidor falla, el juego
   sigue igual y el equipo no se entera. Perder un registro es molesto; que un
   equipo pierda su partida por un problema de red sería inaceptable.

   Qué se guarda y por qué:
   El puntaje que reporta un navegador no es confiable, así que además del
   resultado se guarda EL CÓDIGO que escribió el equipo. Con eso se puede
   revisar después quién resolvió de verdad, y ver dónde se atascaron todos.
   ========================================================================== */
(function () {
"use strict";

const registro = {};
window.CQ = window.CQ || {};
window.CQ.registro = registro;

const cfg = (window.CQ.config || {});
const activo = !!(cfg.URL && cfg.CLAVE);
const COLA = "seccion7-cola-envios";
const LIMITE_CODIGO = 20000;      /* por si alguien pega media librería */

let equipoId = null;

function url(tabla) {
  return cfg.URL.replace(/\/+$/, "") + "/rest/v1/" + tabla;
}
function cabeceras(extra) {
  return Object.assign({
    "apikey": cfg.CLAVE,
    "Authorization": "Bearer " + cfg.CLAVE,
    "Content-Type": "application/json"
  }, extra || {});
}

/* ------------------------------- la cola ---------------------------------
   Si el envío falla, la fila espera en el navegador y se reintenta más tarde.
   Así un corte de wifi de treinta segundos no pierde los intentos. */
function leerCola() {
  try { return JSON.parse(localStorage.getItem(COLA) || "[]"); } catch (e) { return []; }
}
function guardarCola(c) {
  try { localStorage.setItem(COLA, JSON.stringify(c.slice(-200))); } catch (e) {}
}
function encolar(tabla, fila) {
  const c = leerCola();
  c.push({ tabla: tabla, fila: fila });
  guardarCola(c);
}

function enviar(tabla, fila) {
  return fetch(url(tabla), {
    method: "POST",
    headers: cabeceras(),
    body: JSON.stringify(fila)
  }).then(function (r) {
    if (!r.ok) throw new Error("HTTP " + r.status);
    return null;
  });
}

/* El identificador del equipo se genera AQUÍ, no lo devuelve la base.
   Si lo pidiéramos de vuelta haría falta permiso de lectura, y entonces un
   equipo podría leer la tabla y ver el código de los demás. Generándolo en el
   navegador, la clave pública nunca necesita más que insertar. */
function nuevoId() {
  try {
    if (window.crypto && window.crypto.randomUUID) return window.crypto.randomUUID();
  } catch (e) {}
  const az = "0123456789abcdef";
  let s = "";
  for (let i = 0; i < 36; i++) {
    s += (i === 8 || i === 13 || i === 18 || i === 23) ? "-"
       : (i === 14 ? "4" : az[Math.floor(Math.random() * 16)]);
  }
  return s;
}

registro.vaciarCola = function () {
  if (!activo) return Promise.resolve(0);
  const c = leerCola();
  if (!c.length) return Promise.resolve(0);
  guardarCola([]);
  let fallidas = [];
  return c.reduce(function (previa, item) {
    return previa.then(function () {
      return enviar(item.tabla, item.fila).catch(function () { fallidas.push(item); });
    });
  }, Promise.resolve()).then(function () {
    if (fallidas.length) guardarCola(fallidas);
    return c.length - fallidas.length;
  });
};

/* --------------------------- alta del equipo ----------------------------- */
registro.abrirEquipo = function (nombre) {
  if (!activo) return Promise.resolve(null);
  equipoId = nuevoId();
  try { localStorage.setItem("seccion7-equipo-id", equipoId); } catch (e) {}
  const fila = { id: equipoId, nombre: String(nombre || "").slice(0, 60) };
  return enviar("equipos", fila)
    .then(function () { registro.vaciarCola(); return equipoId; })
    .catch(function () {
      /* sin red se juega igual: el alta espera en la cola y los intentos
         que se hagan mientras tanto ya llevan este mismo identificador */
      encolar("equipos", fila);
      return equipoId;
    });
};

registro.recuperarEquipo = function () {
  try { equipoId = localStorage.getItem("seccion7-equipo-id") || null; } catch (e) {}
  if (activo && equipoId) registro.vaciarCola();
  return equipoId;
};

/* ---------------------------- un intento --------------------------------- */
registro.anotarIntento = function (datos) {
  if (!activo || !equipoId) return;
  const fila = {
    equipo_id: equipoId,
    equipo_nombre: String(datos.equipo || "").slice(0, 60),
    reto: String(datos.reto || ""),
    funcion: datos.funcion || null,
    codigo: String(datos.codigo || "").slice(0, LIMITE_CODIGO),
    paso: !!datos.paso,
    pasados: datos.pasados | 0,
    total: datos.total | 0,
    error: datos.error ? String(datos.error).slice(0, 500) : null,
    puntos: datos.puntos | 0,
    pista_usada: !!datos.pista,
    segundos: datos.segundos | 0
  };
  enviar("intentos", fila).catch(function () { encolar("intentos", fila); });
};

registro.activo = function () { return activo; };
registro.equipo = function () { return equipoId; };

})();
