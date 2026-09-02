/* =============================================================================
   SECCIÓN 7 — sabotaje.js
   Los equipos ganan un sabotaje por cada encargo resuelto y pueden lanzárselo
   a otro equipo. Los efectos cuestan TIEMPO, nunca trabajo: apagan las luces,
   traban las compuertas o hacen caminar despacio. Ninguno toca el editor ni el
   código escrito. Perder veinte minutos de trabajo por un ataque no es
   competir, es abandonar la partida.

   Quién cuenta los sabotajes: el servidor. Aquí se muestra un número, pero si
   alguien lo cambia desde las herramientas de desarrollo, el insert falla
   igual: hay un disparador en la base que comprueba cuántos encargos resolvió.
   ========================================================================== */
(function () {
"use strict";

const sab = {};
window.CQ = window.CQ || {};
window.CQ.sabotaje = sab;

const cfg = (window.CQ.config || {});
const activo = !!(cfg.URL && cfg.CLAVE);

/* Catálogo. Cada efecto se paga en segundos de recorrido. */
const CATALOGO = sab.CATALOGO = [
  { tipo: "apagon",       nombre: "Apagón de sector",
    descripcion: "Se va la luz en el edificio. Solo se ve alrededor.", segundos: 20 },
  { tipo: "compuertas",   nombre: "Compuertas trabadas",
    descripcion: "Los umbrales no dejan pasar de una sala a otra.",    segundos: 25 },
  { tipo: "interferencia", nombre: "Interferencia",
    descripcion: "El personaje camina a la mitad de velocidad.",       segundos: 30 }
];
sab.buscar = function (tipo) {
  for (let i = 0; i < CATALOGO.length; i++) if (CATALOGO[i].tipo === tipo) return CATALOGO[i];
  return null;
};

function url(ruta) { return cfg.URL.replace(/\/+$/, "") + "/rest/v1/" + ruta; }
function cabeceras(extra) {
  return Object.assign({
    "apikey": cfg.CLAVE, "Authorization": "Bearer " + cfg.CLAVE,
    "Content-Type": "application/json"
  }, extra || {});
}
function traer(ruta) {
  return fetch(url(ruta), { headers: cabeceras() }).then(function (r) {
    if (!r.ok) throw new Error("HTTP " + r.status);
    return r.json();
  });
}

sab.activo = function () { return activo; };

/* --------------------------- a quién atacar ------------------------------ */
sab.equipos = function (miId) {
  if (!activo) return Promise.resolve([]);
  return traer("equipos?select=id,nombre&order=creado_en.asc")
    .then(function (filas) {
      return filas.filter(function (e) { return e.id !== miId; });
    })
    .catch(function () { return []; });
};

/* Cuántos le quedan: resueltos menos enviados. Es solo para mostrar; la
   cuenta que manda es la del servidor. */
sab.disponibles = function (miId, resueltos) {
  if (!activo || !miId) return Promise.resolve(0);
  return traer("sabotajes?select=id&de_equipo=eq." + encodeURIComponent(miId))
    .then(function (filas) { return Math.max(0, resueltos - filas.length); })
    .catch(function () { return 0; });
};

sab.lanzar = function (miId, miNombre, aEquipo, tipo) {
  if (!activo) return Promise.reject(new Error("El sabotaje necesita conexión."));
  return fetch(url("sabotajes"), {
    method: "POST",
    headers: cabeceras(),
    body: JSON.stringify({
      de_equipo: miId, de_nombre: String(miNombre || "").slice(0, 60),
      a_equipo: aEquipo, tipo: tipo
    })
  }).then(function (r) {
    if (r.ok) return true;
    return r.json().then(function (d) {
      /* el disparador del servidor habla claro; se le pasa el mensaje al equipo */
      throw new Error((d && (d.message || d.hint)) || ("HTTP " + r.status));
    });
  });
};

/* ------------------------ ataques que me llegan --------------------------
   Se pregunta por los posteriores al último visto. La marca vive en el
   navegador, así que recargar la página no revive ataques viejos. */
const MARCA = "seccion7-sabotaje-visto";
function ultimoVisto() {
  try { return localStorage.getItem(MARCA) || new Date(Date.now() - 60000).toISOString(); }
  catch (e) { return new Date(Date.now() - 60000).toISOString(); }
}
function anotarVisto(iso) {
  try { localStorage.setItem(MARCA, iso); } catch (e) {}
}

sab.recibidos = function (miId) {
  if (!activo || !miId) return Promise.resolve([]);
  const desde = ultimoVisto();
  return traer("sabotajes?select=*&a_equipo=eq." + encodeURIComponent(miId) +
               "&creado_en=gt." + encodeURIComponent(desde) + "&order=creado_en.asc")
    .then(function (filas) {
      if (filas.length) anotarVisto(filas[filas.length - 1].creado_en);
      return filas;
    })
    .catch(function () { return []; });
};

/* Al empezar la partida se marca el momento: los ataques anteriores no cuentan. */
sab.empezarDesdeAhora = function () { anotarVisto(new Date().toISOString()); };

})();
