/* =============================================================================
   SECCIÓN 7 — pistas.js
   La ruta física, desde el celular. Cada estación guarda su recompensa cifrada
   con la respuesta de esa estación, y el acertijo solo está impreso en el
   cartel. Descargar esta página no adelanta nada: sin ir al sitio no hay
   respuesta, y sin respuesta lo que hay aquí es ruido.

   El descifrado usa PBKDF2-SHA256 como flujo de clave, igual que lo cifró
   herramientas/generar_pistas.py. No hace falta ninguna librería.
   ========================================================================== */
(function () {
"use strict";

const datos = (window.CQ && window.CQ.pistas) || null;
const GUARDADO = "seccion7-ruta";
const $ = function (id) { return document.getElementById(id); };

function normaliza(t) {
  return String(t || "").toLowerCase().normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");
}
function deB64(s) {
  const b = atob(s), a = new Uint8Array(b.length);
  for (let i = 0; i < b.length; i++) a[i] = b.charCodeAt(i);
  return a;
}
function iguales(a, b) {
  if (a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a[i] ^ b[i];
  return d === 0;
}

/* Descifra el cofre de una estación con la respuesta que escribió el equipo.
   Devuelve el contenido, o null si la respuesta no es la correcta. */
function abrir(cofre, respuesta) {
  const sal = deB64(cofre.s), cifrado = deB64(cofre.c), sello = deB64(cofre.v);
  const clave = new TextEncoder().encode(normaliza(respuesta));
  return crypto.subtle.importKey("raw", clave, "PBKDF2", false, ["deriveBits"])
    .then(function (k) {
      return crypto.subtle.deriveBits(
        { name: "PBKDF2", salt: sal, iterations: 120000, hash: "SHA-256" },
        k, (cifrado.length + sello.length) * 8);
    })
    .then(function (bits) {
      const material = new Uint8Array(bits);
      const flujo = material.slice(0, cifrado.length);
      const marca = material.slice(cifrado.length);
      if (!iguales(marca, sello)) return null;      /* respuesta incorrecta */
      const claro = new Uint8Array(cifrado.length);
      for (let i = 0; i < cifrado.length; i++) claro[i] = cifrado[i] ^ flujo[i];
      return JSON.parse(new TextDecoder().decode(claro));
    });
}

/* Prueba una llave contra una lista de cofres y devuelve el contenido del
   primero que abra, o null. Se usa para los codigos de arranque y para las
   fichas de los QR: en los dos casos la pagina no sabe de antemano cual es. */
function probarTodos(lista, llave) {
  if (!llave) return Promise.resolve(null);
  return lista.reduce(function (antes, cofre) {
    return antes.then(function (hallado) {
      return hallado || abrir(cofre, llave);
    });
  }, Promise.resolve(null));
}

/* --------------------------- lo que lleva hecho -------------------------- */
function leer() {
  try { return JSON.parse(localStorage.getItem(GUARDADO) || "null") || {}; }
  catch (e) { return {}; }
}
function guardar(e) {
  try { localStorage.setItem(GUARDADO, JSON.stringify(e)); } catch (x) {}
}

window.CQ = window.CQ || {};
window.CQ.ruta = {
  datos: datos,
  normaliza: normaliza,
  abrir: abrir,
  leer: leer,
  guardar: guardar,
  equipos: function () { return datos ? Object.keys(datos.equipos) : []; },
  total: function () { return datos ? datos.total : 0; },
  cofres: function (equipo) {
    return (datos && datos.equipos[equipo] && datos.equipos[equipo].cofres) || {};
  },
  /* El codigo que reparte la organizacion. Dice de que equipo son y donde
     empieza su ruta. Devuelve {equipo, primera} o null si el codigo no vale. */
  arrancar: function (codigo) {
    return probarTodos((datos && datos.arranques) || [], codigo);
  },

  /* El reto de la estacion cuyo QR se acaba de escanear. La ficha viaja en
     la direccion; cada reto esta cerrado con la suya, asi que se prueban
     todos y solo abre el que corresponde. Devuelve {id, acertijo} o null. */
  reto: function (ficha) {
    return probarTodos((datos && datos.retos) || [], ficha);
  },

  /* Comprueba la clave final sin tenerla escrita: intenta abrir un cofre
     cerrado con ella. Devuelve una promesa de true o false. */
  claveOk: function (texto) {
    if (!datos || !datos.acceso) return Promise.resolve(false);
    return abrir(datos.acceso, texto).then(function (c) { return !!c; });
  }
};

})();
