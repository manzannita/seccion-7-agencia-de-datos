/* =============================================================================
   SECCIÓN 7 — juego.js
   Motor: cámara, física, dibujo, diálogos, retos y guardado.
   El contenido está en js/retos.js; el arte en js/arte.js; la planta del
   edificio en js/mapa.js; la ejecución de código en js/codigo.js.
   ========================================================================== */
(function () {
"use strict";

const A = window.CQ.arte, M = window.CQ.mapa, EJEC = window.CQ.codigo;
const S = A.SUELO, O = A.OBJETO;

const T = 16;                    /* lado de la casilla */
/* Resolución lógica. NO es fija: se recalcula al cambiar el tamaño de la
   ventana. Estirar el canvas para llenar la pantalla obligaría a una escala
   fraccionaria, y ahí unos píxeles salen más anchos que otros y el pixel art
   se rompe. En vez de estirar, se mantiene la escala entera y se MUESTRA MÁS
   MAPA: la ventana se llena y cada píxel sigue midiendo lo mismo. */
const VW_MIN = 336, VH_MIN = 192;   /* lo mínimo que se ve: 21 x 12 casillas */
let VW = VW_MIN, VH = VH_MIN;
const VEL = 66;                  /* px por segundo */
const CLAVE = "seccion7-v1";

const $ = function (id) { return document.getElementById(id); };
const pantalla = $("pantalla"), ctx = pantalla.getContext("2d");
ctx.imageSmoothingEnabled = false;

/* --------------------------------- estado -------------------------------- */
const estado = {
  equipo: "", puntos: 0, xp: 0,
  resueltos: {}, pistas: {}, intentos: {}, borradores: {},
  vistos: {}, leidos: {},          /* a quién ya saludaron, qué ya leyeron */
  segundos: 0, vioIntro: false, terminado: false
};

/* ------------------------------ experiencia ------------------------------
   El puntaje es el marcador de la competencia; la experiencia es la sensación
   de avance, y premia además recorrer el edificio. Son dos cosas distintas a
   propósito: bajar de puntos por una pista no debería borrar lo aprendido. */
function niveles() { return JUEGO.niveles || [{ xp: 0, nombre: "Recluta" }]; }
function nivelDe(xp) {
  const t = niveles();
  let i = 0;
  for (let k = 0; k < t.length; k++) if (xp >= t[k].xp) i = k;
  return i;
}
function nivelActual() { return niveles()[nivelDe(estado.xp)]; }
function siguienteNivel() { return niveles()[nivelDe(estado.xp) + 1] || null; }
function sumarXP(cuanto, motivo) {
  if (!cuanto) return;
  const antes = nivelDe(estado.xp);
  estado.xp += cuanto;
  const ahora = nivelDe(estado.xp);
  anunciar("+" + cuanto + " XP" + (motivo ? "  " + motivo : ""));
  if (ahora > antes) {
    setTimeout(function () { anunciar("NUEVO RANGO: " + mayus(niveles()[ahora].nombre), true); }, 1200);
    sfx.subir();
  }
  guardar();
}
function conRetos() { return JUEGO.npcs.filter(function (n) { return n.reto; }); }
function credenciales() {
  return conRetos().filter(function (n) { return estado.resueltos[n.id]; }).length;
}
function totalRetos() { return conRetos().length; }

function guardar() {
  try { localStorage.setItem(CLAVE, JSON.stringify(estado)); } catch (e) {}
}
function cargar() {
  try {
    const d = JSON.parse(localStorage.getItem(CLAVE) || "null");
    if (!d || !d.equipo) return false;
    Object.keys(d).forEach(function (k) { estado[k] = d[k]; });
    return true;
  } catch (e) { return false; }
}

/* --------------------------------- sonido -------------------------------- */
let audio = null;
function tono(f, dur, tipo, vol) {
  try {
    if (!audio) audio = new (window.AudioContext || window.webkitAudioContext)();
    const o = audio.createOscillator(), g = audio.createGain();
    o.type = tipo || "square"; o.frequency.value = f;
    g.gain.value = vol === undefined ? 0.04 : vol;
    g.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + dur);
    o.connect(g); g.connect(audio.destination);
    o.start(); o.stop(audio.currentTime + dur);
  } catch (e) {}
}
const sfx = {
  letra: function () { tono(560 + Math.random() * 90, 0.025, "square", 0.015); },
  ok:    function () { tono(620, 0.08); setTimeout(function () { tono(840, 0.08); }, 85);
                       setTimeout(function () { tono(1150, 0.2); }, 175); },
  mal:   function () { tono(150, 0.2, "sawtooth", 0.035); },
  paso:  function () { tono(110 + Math.random() * 25, 0.035, "triangle", 0.014); },
  abrir: function () { tono(400, 0.05); setTimeout(function () { tono(600, 0.07); }, 60); },
  puerta:function () { tono(180, 0.25, "sawtooth", 0.05);
                       setTimeout(function () { tono(320, 0.3, "square", 0.04); }, 200); },
  subir: function () { [523, 659, 784, 1047].forEach(function (f, i) {
                         setTimeout(function () { tono(f, 0.12, "square", 0.045); }, i * 110); }); }
};

/* -------------------------------- entidades ------------------------------ */
const jugador = { x: 0, y: 0, dir: "up", paso: 0, mov: 0 };
let npcs = [], terminales = [];

/* Carga el PNG de un personaje si el reto lo declara. Si falla, no pasa nada:
   se sigue usando el dibujo por código. */
function cargarSprite(n) {
  const def = n.def;
  if (!def.sprite) return;
  const img = new Image();
  img.onload = function () {
    if (!img.width || !img.height) return;
    n.cols = def.columnas || 3;
    n.filas = def.filas || 4;
    n.fw = Math.floor(img.width / n.cols);
    n.fh = Math.floor(img.height / n.filas);
    if (n.fw > 0 && n.fh > 0) n.img = img;
  };
  img.onerror = function () { n.img = null; };
  img.src = def.sprite;
}

function colocarEntidades() {
  npcs = JUEGO.npcs.map(function (def) {
    const n = {
      def: def, id: def.id, nombre: def.nombre,
      x: (def.x + 0.5) * T, y: (def.y + 0.9) * T,
      dir: def.dir || "down", tx: def.x, ty: def.y, img: null
    };
    cargarSprite(n);
    return n;
  });
  /* nadie puede quedar dentro de un mueble por una coordenada mal puesta */
  npcs.forEach(function (n) {
    if (M.objeto_en(n.tx, n.ty) !== O.NADA) M.ponerObjeto(n.tx, n.ty, O.NADA);
  });
  terminales = (JUEGO.terminales || []).map(function (t) {
    return { tx: t[0], ty: t[1], texto: t[2] };
  });
}

/* --------------------------------- dibujo -------------------------------- */
const cam = { x: 0, y: 0 };
let tiempoTotal = 0;

function varianteSuelo(x, y, s) {
  if (s === S.LOGO) {
    const o = M.LOGO_ORIGEN;
    return (x - o.x) + (y - o.y) * 2;
  }
  const lista = A.piso[s];
  return Math.floor(A.ruido(x * 13, y * 7) * lista.length) % lista.length;
}

function dibujarSuelo(x0, y0, x1, y1) {
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    const s = M.suelo_en(x, y);
    if (s === S.VACIO) continue;
    const dx = x * T - cam.x, dy = y * T - cam.y;
    if (s === S.MURO) { ctx.drawImage(A.muro[M.mascaraMuro(x, y)], dx, dy); continue; }
    const lista = A.piso[s];
    if (!lista) continue;
    ctx.drawImage(lista[varianteSuelo(x, y, s) % lista.length], dx, dy);
  }
}

function sombra(x, y, rx) {
  ctx.fillStyle = "rgba(0,0,0,0.3)";
  ctx.beginPath();
  ctx.ellipse(Math.round(x - cam.x), Math.round(y - cam.y) + 2, rx || 6, 2.5, 0, 0, Math.PI * 2);
  ctx.fill();
}

function respirar(e) {
  return Math.sin(tiempoTotal * 1.7 + e.x * 0.7) > 0.6 ? -1 : 0;
}

function dibujarPersonaje(e, def, frame, resp) {
  const dx = Math.round(e.x - cam.x), dy = Math.round(e.y - cam.y);
  sombra(e.x, e.y);
  if (e.img) {                                    /* sprite propio del equipo */
    const col = Math.min(frame, e.cols - 1);
    const fil = Math.min(A.IDX_DIR[e.dir], e.filas - 1);
    ctx.drawImage(e.img, col * e.fw, fil * e.fh, e.fw, e.fh,
                  dx - (e.fw >> 1), dy - e.fh + 3 + (resp || 0), e.fw, e.fh);
    return;
  }
  const hoja = A.hojaDe(def.pelo, def.ropa, def.piel);
  const W = A.SP_W, H = A.SP_H;
  /* el ancla son los pies: el sprite crece hacia arriba, nunca hacia abajo */
  ctx.drawImage(hoja, frame * W, A.IDX_DIR[e.dir] * H, W, H,
                dx - (W >> 1), dy - H + 3 + (resp || 0), W, H);
}

/* marcador sobre quien tiene un reto pendiente o resuelto */
function marcador(e, hecho) {
  const sube = Math.round(Math.sin(tiempoTotal * 3 + e.x) * 1.5);
  const x = Math.round(e.x - cam.x), y = Math.round(e.y - cam.y) - (A.SP_H + 2) + sube;
  A.px(ctx, "#070911", x - 5, y - 1, 11, 11);
  if (hecho) {
    A.px(ctx, A.P.verde[3], x - 3, y + 4, 2, 2); A.px(ctx, A.P.verde[3], x - 1, y + 6, 2, 2);
    A.px(ctx, A.P.verde[3], x + 1, y + 4, 2, 2); A.px(ctx, A.P.verde[3], x + 2, y + 2, 2, 2);
    A.px(ctx, A.P.verde[3], x + 3, y, 2, 2);
  } else {
    A.px(ctx, A.P.ambar[3], x - 1, y, 3, 6);
    A.px(ctx, A.P.ambar[3], x - 1, y + 7, 3, 2);
  }
}

/* ranuras de la compuerta: se encienden con cada credencial */
function brilloCompuerta() {
  const p = M.PUERTA_NUCLEO;
  if (M.objeto_en(p.x, p.y) !== O.COMPUERTA) return;
  const bx = p.x * T - cam.x, by = p.y * T - cam.y + T - 24 + 8;
  if (bx < -T || bx > VW || by < -30 || by > VH) return;
  const n = credenciales(), pulso = 0.5 + 0.5 * Math.sin(tiempoTotal * 3.5);
  for (let i = 0; i < 5; i++) {
    const r = A.RANURAS[i];
    ctx.fillStyle = i < n
      ? "rgba(110,232,247," + pulso.toFixed(2) + ")"
      : "rgba(240,120,140,0.55)";
    ctx.fillRect(Math.round(bx + r[0]), Math.round(by + r[1]), 2, 2);
  }
}

/* luz suave del Núcleo, para que se note que está vivo */
function brilloNucleo() {
  const nx = 28 * T + 8 - cam.x, ny = 4 * T - cam.y;
  if (nx < -40 || nx > VW + 40 || ny < -40 || ny > VH + 40) return;
  const r = 26 + Math.sin(tiempoTotal * 2) * 3;
  const g = ctx.createRadialGradient(nx, ny, 2, nx, ny, r);
  g.addColorStop(0, "rgba(110,232,247,0.30)");
  g.addColorStop(1, "rgba(110,232,247,0)");
  ctx.fillStyle = g;
  ctx.fillRect(nx - r, ny - r, r * 2, r * 2);
}

/* Dibuja muebles y personajes mezclados y ordenados por profundidad: así el
   personaje pasa por DETRÁS de un rack cuando está más arriba que él. */
function dibujarEscena() {
  ctx.fillStyle = "#05070d";
  ctx.fillRect(0, 0, VW, VH);

  const x0 = Math.floor(cam.x / T) - 1, y0 = Math.floor(cam.y / T) - 1;
  const x1 = Math.ceil((cam.x + VW) / T), y1 = Math.ceil((cam.y + VH) / T) + 2;
  dibujarSuelo(x0, y0, x1, y1);
  brilloNucleo();

  const cola = [];
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    const o = M.objeto_en(x, y);
    if (o === O.NADA) continue;
    const img = A.objeto[o];
    if (!img) continue;
    cola.push({ orden: y * T + T, x: x * T - cam.x, y: y * T + T - 24 - cam.y, img: img });
  }
  npcs.forEach(function (n) { cola.push({ orden: n.y, npc: n }); });
  cola.push({ orden: jugador.y, yo: true });
  cola.sort(function (a, b) { return a.orden - b.orden; });

  cola.forEach(function (d) {
    if (d.img) { ctx.drawImage(d.img, Math.round(d.x), Math.round(d.y)); return; }
    if (d.npc) {
      const n = d.npc;
      dibujarPersonaje(n, n.def, 0, respirar(n));
      if (n.def.reto) marcador(n, !!estado.resueltos[n.id]);
      return;
    }
    let frame = 0, resp = respirar(jugador);
    if (jugador.mov > 0) { frame = A.CICLO_CAMINAR[Math.floor(jugador.paso) % 4]; resp = 0; }
    dibujarPersonaje(jugador, { pelo: "#e8b34a", ropa: "#c8452f", piel: "#f0c39c" }, frame, resp);
  });

  brilloCompuerta();

  /* viñeta: el edificio se siente cerrado y la atención va al centro */
  const g = ctx.createRadialGradient(VW / 2, VH / 2, VH * 0.33, VW / 2, VH / 2, VH * 0.95);
  g.addColorStop(0, "rgba(0,0,0,0)");
  g.addColorStop(1, "rgba(3,5,12,0.55)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, VW, VH);
}

/* --------------------------------- física -------------------------------- */
function libre(cx, cy) {
  const w = 5, h = 3;
  const puntos = [[cx - w, cy - h], [cx + w, cy - h], [cx - w, cy + h], [cx + w, cy + h]];
  for (let i = 0; i < puntos.length; i++) {
    if (M.solido(Math.floor(puntos[i][0] / T), Math.floor(puntos[i][1] / T))) return false;
  }
  for (let i = 0; i < npcs.length; i++) {
    const n = npcs[i];
    if (Math.abs(n.x - cx) < 11 && Math.abs(n.y - cy) < 8) return false;
  }
  return true;
}

const teclas = {};
let acumPaso = 0;
function mover(dt) {
  let vx = 0, vy = 0;
  if (teclas.up) vy -= 1;
  if (teclas.down) vy += 1;
  if (teclas.left) vx -= 1;
  if (teclas.right) vx += 1;
  if (vx && vy) { vx *= 0.7071; vy *= 0.7071; }
  jugador.mov = (vx || vy) ? 1 : 0;

  if (vy < 0) jugador.dir = "up"; else if (vy > 0) jugador.dir = "down";
  if (vx < 0) jugador.dir = "left"; else if (vx > 0) jugador.dir = "right";

  const nx = jugador.x + vx * VEL * dt, ny = jugador.y + vy * VEL * dt;
  if (vx && libre(nx, jugador.y)) jugador.x = nx;
  if (vy && libre(jugador.x, ny)) jugador.y = ny;

  if (jugador.mov) {
    /* el ciclo son 4 tiempos y avanza 32 px: atado a VEL, los pies no patinan */
    jugador.paso += dt * (VEL * 4 / 32);
    acumPaso += dt;
    if (acumPaso > 0.3) { acumPaso = 0; sfx.paso(); }
  } else { jugador.paso = 0; }
}

function seguirCamara() {
  const maxX = Math.max(0, M.AN * T - VW), maxY = Math.max(0, M.AL * T - VH);
  cam.x = Math.max(0, Math.min(Math.round(jugador.x - VW / 2), maxX));
  cam.y = Math.max(0, Math.min(Math.round(jugador.y - VH / 2), maxY));
}

/* -------------------------------- diálogos -------------------------------- */
const elDialogo = $("dialogo"), elNombre = $("dlgNombre"), elTexto = $("dlgTexto"),
      elSig = $("dlgSig"), elRetrato = $("dlgRetrato"), elAviso = $("aviso"),
      elSala = $("sala");
let modo = "inicio";
const dlg = { lineas: [], i: 0, escrito: 0, completo: false, alCerrar: null };

/* La cara que se ve en la caja de diálogo. Si el personaje trae su propio
   PNG (retrato: "sprites/x.png") se usa ese; si no, se dibuja uno con su
   paleta. Así cualquier guardián nuevo tiene cara sin dibujar nada. */
const cacheCaras = {};
function caraDe(def) {
  if (!def) return null;
  if (def.retrato) return def.retrato;
  if (cacheCaras[def.id]) return cacheCaras[def.id];
  try {
    const url = A.retratoDe(def).toDataURL();
    cacheCaras[def.id] = url;
    return url;
  } catch (e) { return null; }
}

/* La tipografía del juego (Press Start 2P) no trae las mayúsculas acentuadas:
   al escribir "SECCIÓN" el navegador sustituye la Ó por otra fuente y salta a
   la vista. En minúscula sí existen, así que los acentos se conservan en todo
   el texto corrido; solo se quitan en los rótulos que van en versales.
   Si algún día se cambia de tipografía, basta con borrar esta función. */
function mayus(s) {
  return String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase();
}

function conNombre(s) { return String(s).replace(/\{equipo\}/g, estado.equipo || "escuadrón"); }

function hablar(nombre, lineas, retrato, alCerrar) {
  if (!lineas || !lineas.length) { if (alCerrar) alCerrar(); return; }
  dlg.lineas = lineas.slice(); dlg.i = 0; dlg.escrito = 0;
  dlg.completo = false; dlg.alCerrar = alCerrar || null;
  modo = "dialogo";
  elDialogo.classList.add("visible");
  elNombre.textContent = nombre;
  elTexto.textContent = "";
  elAviso.classList.remove("visible");
  if (retrato) { elRetrato.src = retrato; elRetrato.classList.add("visible"); }
  else elRetrato.classList.remove("visible");
}
function avanzar() {
  const linea = conNombre(dlg.lineas[dlg.i] || "");
  if (dlg.escrito < linea.length) { dlg.escrito = linea.length; dlg.completo = true; return; }
  dlg.completo = true;
  dlg.i++;
  if (dlg.i >= dlg.lineas.length) { cerrarDialogo(); return; }
  dlg.escrito = 0; dlg.completo = false;
  sfx.abrir();
}
function cerrarDialogo() {
  elDialogo.classList.remove("visible");
  modo = "juego";
  const cb = dlg.alCerrar; dlg.alCerrar = null;
  if (cb) cb();
}
let acumLetra = 0;
function animarDialogo(dt) {
  const linea = conNombre(dlg.lineas[dlg.i] || "");
  if (dlg.escrito < linea.length) {
    acumLetra += dt;
    while (acumLetra > 0.016 && dlg.escrito < linea.length) {
      acumLetra -= 0.016; dlg.escrito++;
      if (dlg.escrito % 3 === 0) sfx.letra();
    }
  }
  dlg.completo = dlg.escrito >= linea.length;
  elTexto.textContent = linea.slice(0, dlg.escrito);
  elSig.textContent = dlg.completo ? (dlg.i < dlg.lineas.length - 1 ? "▼ [E]" : "✕ [E]") : "";
}

/* -------------------------- avisos flotantes -----------------------------
   Cola simple: si caen dos avisos juntos (XP y subida de rango) el segundo
   espera en vez de pisar al primero. */
const colaAvisos = [];
let avisoHasta = 0;
function anunciar(texto, fuerte) { colaAvisos.push({ texto: texto, fuerte: !!fuerte }); }
function moverAvisos() {
  const e = $("logro");
  if (!e) return;
  if (avisoHasta && tiempoTotal < avisoHasta) return;
  if (avisoHasta) { e.classList.remove("visible"); avisoHasta = 0; return; }
  const a = colaAvisos.shift();
  if (!a) return;
  e.textContent = a.texto;
  e.className = "visible" + (a.fuerte ? " fuerte" : "");
  avisoHasta = tiempoTotal + (a.fuerte ? 2.4 : 1.4);
}

/* --------------------------- rótulo de sala ------------------------------ */
let salaActual = null, salaHasta = 0;
function vigilarSala() {
  const s = M.salaDe(Math.floor(jugador.x / T), Math.floor(jugador.y / T));
  const id = s ? s.id : null;
  if (id && id !== salaActual) {
    salaActual = id;
    elSala.textContent = mayus(s.nombre);
    elSala.classList.add("visible");
    salaHasta = tiempoTotal + 2.2;
  } else if (!id) {
    salaActual = null;
  }
  if (salaHasta && tiempoTotal > salaHasta) {
    elSala.classList.remove("visible");
    salaHasta = 0;
  }
}

/* ------------------------------ interacción ------------------------------- */
const VECTOR = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
function objetivo() {
  const v = VECTOR[jugador.dir];
  const fx = jugador.x + v[0] * 13, fy = jugador.y + v[1] * 13 - 2;
  for (let i = 0; i < npcs.length; i++) {
    const n = npcs[i];
    if (Math.abs(n.x - fx) < 12 && Math.abs(n.y - fy) < 14) return { tipo: "npc", ref: n };
  }
  const tx = Math.floor(fx / T), ty = Math.floor(fy / T);
  const p = M.PUERTA_NUCLEO;
  if (tx === p.x && ty === p.y) return { tipo: "compuerta" };
  if (M.objeto_en(tx, ty) === O.NUCLEO) return { tipo: "consola" };
  for (let i = 0; i < terminales.length; i++) {
    if (terminales[i].tx === tx && terminales[i].ty === ty) return { tipo: "terminal", ref: terminales[i] };
  }
  return null;
}

function interactuar() {
  const o = objetivo();
  if (!o) return;
  sfx.abrir();

  if (o.tipo === "terminal") {
    const clave = o.ref.tx + "," + o.ref.ty;
    if (!estado.leidos[clave]) {
      estado.leidos[clave] = true;
      sumarXP((JUEGO.xpExplorar || {}).terminal || 0, "· terminal nueva");
    }
    hablar("Terminal", o.ref.texto.split("\n"));
    return;
  }

  if (o.tipo === "compuerta" || o.tipo === "consola") {
    const f = JUEGO.retoFinal;
    if (estado.terminado) { mostrarFinal(); return; }
    if (credenciales() < totalRetos()) {
      hablar("Compuerta del Núcleo", f.dialogos.bloqueado);
      return;
    }
    if (o.tipo === "compuerta") {                  /* primera vez: se abre */
      const primera = !estado.intentos["__final"];
      sfx.puerta();
      M.abrirNucleo();
      hablar(f.guardian, primera ? f.dialogos.intro : f.dialogos.pendiente, null, function () {
        abrirReto(f, "__final", f.guardian);
      });
      return;
    }
    hablar(f.guardian, f.dialogos.pendiente, null, function () {
      abrirReto(f, "__final", f.guardian);
    });
    return;
  }

  const n = o.ref, d = n.def;
  n.dir = { up: "down", down: "up", left: "right", right: "left" }[jugador.dir];
  if (!estado.vistos[d.id]) {
    estado.vistos[d.id] = true;
    sumarXP((JUEGO.xpExplorar || {}).hablar || 0, "· conociste a " + d.nombre.split(",")[0]);
  }

  if (!d.reto) {
    const listo = credenciales() >= totalRetos();
    hablar(d.nombre, listo && d.dialogos.resuelto ? d.dialogos.resuelto : d.dialogos.pendiente, caraDe(d));
    return;
  }
  if (estado.resueltos[d.id]) { hablar(d.nombre, d.dialogos.resuelto, caraDe(d)); return; }
  const primera = !estado.intentos[d.id];
  hablar(d.nombre, primera ? d.dialogos.intro : d.dialogos.pendiente, caraDe(d), function () {
    abrirReto(d.reto, d.id, d.nombre);
  });
}

function vigilarAviso() {
  if (modo !== "juego") { elAviso.classList.remove("visible"); return; }
  const o = objetivo();
  if (!o) { elAviso.classList.remove("visible"); return; }
  let t = "[E] Hablar";
  if (o.tipo === "terminal") t = "[E] Leer terminal";
  else if (o.tipo === "compuerta") t = credenciales() >= totalRetos() ? "[E] Abrir compuerta" : "[E] Compuerta bloqueada";
  else if (o.tipo === "consola") t = "[E] Usar consola";
  else if (o.ref.def.reto && !estado.resueltos[o.ref.def.id]) t = "[E] Aceptar el encargo";
  elAviso.textContent = t;
  elAviso.classList.add("visible");
}

/* ------------------------- respuestas escritas ---------------------------- */
function normalizar(s) {
  return String(s).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
}
function hash(s) {
  let h = 0x811c9dc5; s = normalizar(s);
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return ("0000000" + h.toString(16)).slice(-8);
}
function textoCorrecto(reto, valor) {
  const n = normalizar(valor);
  if (!n) return false;
  if (reto.respuesta && normalizar(reto.respuesta) === n) return true;
  const h = hash(n);
  if (reto.respuestaHash === h) return true;
  return !!(reto.alternativas && reto.alternativas.indexOf(h) >= 0);
}

/* --------------------------- pantalla de reto ----------------------------- */
let retoActual = null, retoId = null, esCodigo = false, editor = null, ejecutando = false;

function escapar(s) {
  return String(s).replace(/[&<>"]/g, function (c) {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
  });
}
/* Los casos se escriben en JavaScript pero el equipo programa en Python, así
   que hay que mostrarlos como los escribirían ellos. Con JSON.stringify salía
   null, true y false: sintaxis de otro lenguaje colada en los ejemplos, y un
   chico que copie eso se lleva un error de sintaxis. */
function verPython(v) {
  if (v === null || v === undefined) return "None";
  if (v === true) return "True";
  if (v === false) return "False";
  if (typeof v === "number") return String(v);
  if (typeof v === "string") return JSON.stringify(v);
  if (Array.isArray(v)) return "[" + v.map(verPython).join(", ") + "]";
  if (typeof v === "object") {
    return "{" + Object.keys(v).map(function (k) {
      return JSON.stringify(k) + ": " + verPython(v[k]);
    }).join(", ") + "}";
  }
  return String(v);
}
function argsPython(entrada) {
  return (entrada || []).map(verPython).join(", ");
}

function casosVisibles(r) { return r.casos || []; }
function casosTodos(r) { return (r.casos || []).concat(r.casosOcultos || []); }

function pintarCasos(resultados) {
  const cont = $("casos"), vis = casosVisibles(retoActual);
  let html = "";
  vis.forEach(function (c, i) {
    const r = resultados ? resultados[i] : null;
    const clase = r ? (r.paso ? "caso pasa" : "caso falla") : "caso";
    const marca = r ? (r.paso ? "✓ " : "✗ ") : "· ";
    let linea = marca + retoActual.funcion + "(" + escapar(argsPython(c.entrada)) + ")" +
                "  <span class='eti'>→ esperado</span> " + escapar(verPython(c.salida));
    if (r && !r.paso) {
      linea += r.fallo
        ? "\n   <span class='eti'>error:</span> " + escapar(r.fallo)
        : "\n   <span class='eti'>obtuviste:</span> " + escapar(r.obtenido);
    }
    html += "<div class='" + clase + "'>" + linea + "</div>";
  });
  const ocultos = (retoActual.casosOcultos || []).length;
  if (ocultos) {
    let txt = "· " + ocultos + " caso(s) oculto(s): también tienen que pasar";
    let clase = "caso";
    if (resultados) {
      const ro = resultados.slice(vis.length);
      const bien = ro.filter(function (x) { return x.paso; }).length;
      txt = (bien === ocultos ? "✓ " : "✗ ") + "casos ocultos: " + bien + "/" + ocultos;
      clase = bien === ocultos ? "caso pasa" : "caso falla";
    }
    html += "<div class='" + clase + "'>" + txt + "</div>";
  }
  cont.innerHTML = html;
}

/* El intérprete de Python tarda unos segundos en bajar la primera vez.
   Se avisa en pantalla y se desactiva EJECUTAR hasta que esté listo, para que
   nadie crea que su código está mal cuando lo que falta es el intérprete. */
let interpreteListo = false;
function pintarInterprete(info) {
  const e = $("interprete");
  if (!e) return;
  interpreteListo = info.listo;
  if (info.tipo === "listo") { e.className = "listo"; e.textContent = "✓ Python listo"; }
  else if (info.tipo === "fallo") { e.className = "fallo"; e.textContent = "✗ " + info.texto; }
  else { e.className = ""; e.textContent = "⌛ " + info.texto + "…"; }
  if (esCodigo) $("btnEnviar").disabled = !info.listo || ejecutando;
}

function abrirReto(reto, id, guardian) {
  retoActual = reto; retoId = id;
  esCodigo = !!(reto.funcion && reto.casos);
  modo = "reto";
  $("retoGuardian").textContent = mayus(guardian);
  $("retoTitulo").textContent = reto.titulo;
  $("retoEnunciado").textContent = reto.enunciado;
  const ej = $("retoEjemplo");
  ej.textContent = reto.ejemplo || "";
  ej.style.display = reto.ejemplo ? "block" : "none";
  $("retoEstado").textContent = ""; $("retoEstado").className = "";
  $("consola").className = ""; $("consola").textContent = "";
  $("btnPista").style.display = reto.pista ? "inline-block" : "none";
  $("btnPista").disabled = false;
  $("btnEnviar").disabled = false;

  $("modoCodigo").style.display = esCodigo ? "block" : "none";
  $("modoTexto").style.display = esCodigo ? "none" : "block";
  $("btnReiniciarCodigo").style.display = esCodigo ? "inline-block" : "none";
  $("btnEnviar").textContent = esCodigo ? "▶ EJECUTAR" : "✓ ENVIAR";

  if (esCodigo) {
    editor.poner(estado.borradores[id] || reto.plantilla || "");
    pintarCasos(null);
    const est = EJEC.estado();
    pintarInterprete({
      listo: est.listo,
      tipo: est.fallo ? "fallo" : (est.listo ? "listo" : "cargando"),
      texto: est.fallo || (est.listo ? "Python listo" : "arrancando el intérprete de Python")
    });
    if (!est.listo && !est.fallo) EJEC.preparar();
    setTimeout(function () { $("editor").focus(); }, 40);
  } else {
    $("inRespuesta").value = "";
    setTimeout(function () { $("inRespuesta").focus(); }, 40);
  }
  $("pReto").classList.add("visible");
}

function cerrarReto() {
  if (esCodigo && retoId) { estado.borradores[retoId] = editor.leer(); guardar(); }
  $("pReto").classList.remove("visible");
  retoActual = null; modo = "juego";
}

function acertar(ganados) {
  estado.puntos += ganados;
  estado.resueltos[retoId] = true;
  sumarXP(ganados, "· encargo resuelto");
  guardar(); sfx.ok();
  const est = $("retoEstado");
  est.className = "ok";
  est.textContent = "CREDENCIAL OBTENIDA  ·  +" + ganados + " puntos";
  $("btnEnviar").disabled = true;
  const idCerrado = retoId;
  setTimeout(function () {
    $("btnEnviar").disabled = false;
    cerrarReto();
    if (idCerrado === "__final") { estado.terminado = true; guardar(); mostrarFinal(); return; }
    const npc = JUEGO.npcs.filter(function (n) { return n.id === idCerrado; })[0];
    if (npc) hablar(npc.nombre, npc.dialogos.resuelto, caraDe(npc));
    actualizarHUD();
  }, 1400);
}

function puntosDe(reto) {
  let g = reto.puntos || 100;
  if (estado.pistas[retoId]) g -= 25;
  return Math.max(10, g);
}

function enviar() {
  if (!retoActual || ejecutando) return;
  const est = $("retoEstado");
  estado.intentos[retoId] = (estado.intentos[retoId] || 0) + 1;

  if (!esCodigo) {
    const valor = $("inRespuesta").value;
    if (!normalizar(valor)) { est.className = "mal"; est.textContent = "Escriban algo primero."; return; }
    if (textoCorrecto(retoActual, valor)) { acertar(puntosDe(retoActual)); }
    else {
      sfx.mal(); est.className = "mal";
      est.textContent = "No es la respuesta. Intento " + estado.intentos[retoId] + ".";
      guardar();
    }
    actualizarHUD();
    return;
  }

  /* --- reto de código --- */
  if (!interpreteListo) {
    est.className = "mal";
    est.textContent = "El intérprete de Python todavía no está listo.";
    return;
  }
  const fuente = editor.leer();
  estado.borradores[retoId] = fuente;
  guardar();
  ejecutando = true;
  $("btnEnviar").disabled = true;
  est.className = "tenue"; est.textContent = "Ejecutando…";

  EJEC.ejecutar(fuente, retoActual.funcion, casosTodos(retoActual)).then(function (r) {
    ejecutando = false;
    $("btnEnviar").disabled = false;
    const consola = $("consola");
    if (r && r.registros && r.registros.length) {
      consola.textContent = r.registros.join("\n");
      consola.className = "visible";
    } else { consola.textContent = ""; consola.className = ""; }

    if (!r || r.error) {
      sfx.mal();
      pintarCasos(null);
      est.className = "mal";
      est.textContent = (r && r.error) ? r.error : "No se pudo ejecutar el código.";
      return;
    }
    pintarCasos(r.resultados);
    const pasaron = r.resultados.filter(function (x) { return x.paso; }).length;
    const total = r.resultados.length;
    if (pasaron === total) { acertar(puntosDe(retoActual)); }
    else {
      sfx.mal();
      est.className = "mal";
      est.textContent = "Pasan " + pasaron + " de " + total + " casos. Intento " +
                        estado.intentos[retoId] + ".";
    }
    actualizarHUD();
  });
}

function pedirPista() {
  if (!retoActual || !retoActual.pista) return;
  if (!estado.pistas[retoId]) {
    estado.pistas[retoId] = true;
    estado.puntos = Math.max(0, estado.puntos - 25);
    guardar(); actualizarHUD();
  }
  const est = $("retoEstado");
  est.className = "tenue";
  est.textContent = "PISTA: " + retoActual.pista;
  $("btnPista").disabled = true;
}

/* --------------------------- encargos pendientes -------------------------
   Lo que dice la directora al principio no alcanza: son siete salas y cinco
   encargos, y a los diez minutos ya nadie recuerda quién pedía qué. Este
   panel es la lista, siempre a un TAB de distancia. */
function pintarTareas() {
  const salas = {};
  M.SALAS.forEach(function (x) { salas[x.id] = x.nombre; });

  let html = "";
  JUEGO.npcs.filter(function (n) { return n.reto; }).forEach(function (n) {
    const hecho = !!estado.resueltos[n.id];
    html += "<div class='tarea" + (hecho ? " hecha" : "") + "'>" +
      "<span class='marca'>" + (hecho ? "✓" : "○") + "</span>" +
      "<span class='cuerpo'><span class='titulo'>" + escapar(n.reto.titulo) + "</span>" +
      "<span class='donde'>" + escapar(n.nombre) + " · " +
      escapar(salas[n.sala] || n.sala || "") + "</span></span>" +
      "<span class='premio'>" + n.reto.puntos + " pts</span></div>";
  });

  const listas = credenciales() >= totalRetos();
  const f = JUEGO.retoFinal;
  html += "<div class='tarea" + (estado.terminado ? " hecha" : (listas ? "" : " bloqueada")) + "'>" +
    "<span class='marca'>" + (estado.terminado ? "✓" : (listas ? "○" : "🔒")) + "</span>" +
    "<span class='cuerpo'><span class='titulo'>" + escapar(f.titulo) + "</span>" +
    "<span class='donde'>" + (listas
      ? "La compuerta del Núcleo ya los reconoce. Suban por el pasillo central."
      : "Se abre con las " + totalRetos() + " credenciales.") + "</span></span>" +
    "<span class='premio'>" + f.puntos + " pts</span></div>";
  $("listaTareas").innerHTML = html;

  const sig = siguienteNivel();
  $("resumenTareas").innerHTML =
    "Credenciales: <b>" + credenciales() + "/" + totalRetos() + "</b> &nbsp;·&nbsp; " +
    "Puntaje: <b>" + estado.puntos + "</b> &nbsp;·&nbsp; " +
    "Rango: <b>" + escapar(nivelActual().nombre) + "</b>" +
    (sig ? " &nbsp;·&nbsp; faltan <b>" + (sig.xp - estado.xp) + " XP</b> para " +
           escapar(sig.nombre) : " &nbsp;·&nbsp; rango máximo");
}
let modoPrevio = "juego";
function abrirTareas() {
  if (modo === "reto" || modo === "final" || modo === "inicio") return;
  modoPrevio = modo;
  pintarTareas();
  $("pTareas").classList.add("visible");
  modo = "tareas";
}
function cerrarTareas() {
  $("pTareas").classList.remove("visible");
  modo = modoPrevio === "tareas" ? "juego" : modoPrevio;
}

/* ------------------------------ pantalla final ---------------------------- */
function mostrarFinal() {
  modo = "final";
  const m = Math.floor(estado.segundos / 60), s = Math.floor(estado.segundos % 60);
  $("finTexto").innerHTML =
    JUEGO.final.map(function (l) { return "<p>" + escapar(conNombre(l)) + "</p>"; }).join("") +
    "<p class='tenue'>ESCUADRON: " + escapar(estado.equipo) + "</p>" +
    "<p>PUNTAJE FINAL: <span class='ok'>" + estado.puntos + "</span></p>" +
    "<p>TIEMPO: " + (m < 10 ? "0" : "") + m + ":" + (s < 10 ? "0" : "") + s + "</p>" +
    "<p>CREDENCIALES: " + credenciales() + "/" + totalRetos() + "</p>";
  $("pFinal").classList.add("visible");
  sfx.ok();
}

/* ---------------------------------- HUD ----------------------------------- */
function actualizarHUD() {
  $("equipo").textContent = mayus(estado.equipo || "EQUIPO");
  $("rango").textContent = mayus(nivelActual().nombre) + "  " + estado.xp + " XP";
  const sig = siguienteNivel(), base = nivelActual().xp;
  const pct = sig ? Math.min(100, ((estado.xp - base) / (sig.xp - base)) * 100) : 100;
  const relleno = $("barraXP") && $("barraXP").firstElementChild;
  if (relleno) relleno.style.width = pct.toFixed(1) + "%";
  $("credenciales").textContent = "CREDENCIALES " + credenciales() + "/" + totalRetos();
  $("puntos").textContent = estado.puntos + " PTS";
  const m = Math.floor(estado.segundos / 60), s = Math.floor(estado.segundos % 60);
  $("tiempo").textContent = (m < 10 ? "0" : "") + m + ":" + (s < 10 ? "0" : "") + s;
}

/* ----------------------- escala y pantalla completa ----------------------- */
const elEscenario = $("escenario"), elMarco = $("marco");
function ajustar() {
  const completa = !!document.fullscreenElement;
  const anchoDisp = completa ? window.innerWidth : window.innerWidth - 24;
  const altoDisp = completa ? window.innerHeight : window.innerHeight - 24;

  /* 1. La escala es SIEMPRE entera. Se elige la mayor que permita ver al
        menos el área mínima. */
  const escala = Math.max(1, Math.min(Math.floor(anchoDisp / VW_MIN),
                                      Math.floor(altoDisp / VH_MIN)));
  /* 2. Con esa escala fija, el lienzo crece hasta llenar la ventana. Se ve
        más edificio, no píxeles más grandes. Nunca más que el mapa entero. */
  VW = Math.min(Math.floor(anchoDisp / escala), M.AN * T);
  VH = Math.min(Math.floor(altoDisp / escala), M.AL * T);
  VW -= VW % 2; VH -= VH % 2;                 /* par: la viñeta queda centrada */

  if (pantalla.width !== VW || pantalla.height !== VH) {
    pantalla.width = VW; pantalla.height = VH;
    ctx.imageSmoothingEnabled = false;        /* redimensionar reinicia el contexto */
  }
  pantalla.style.width = (VW * escala) + "px";
  pantalla.style.height = (VH * escala) + "px";
  elMarco.style.width = (VW * escala) + "px";
  elMarco.style.height = (VH * escala) + "px";
  elMarco.style.setProperty("--u", escala + "px");
  elEscenario.style.setProperty("--u", escala + "px");
  document.documentElement.style.setProperty("--u", escala + "px");
}
function alternarPantallaCompleta() {
  if (document.fullscreenElement) {
    if (document.exitFullscreen) document.exitFullscreen();
  } else if (elEscenario.requestFullscreen) {
    elEscenario.requestFullscreen().catch(function () {});
  }
}
window.addEventListener("resize", ajustar);
document.addEventListener("fullscreenchange", function () { setTimeout(ajustar, 60); });

/* --------------------------------- teclado -------------------------------- */
const MAPA_TECLAS = {
  ArrowUp: "up", ArrowDown: "down", ArrowLeft: "left", ArrowRight: "right",
  w: "up", s: "down", a: "left", d: "right", W: "up", S: "down", A: "left", D: "right"
};
window.addEventListener("keydown", function (e) {
  if (e.key === "Escape") {
    if (modo === "reto") cerrarReto();
    else if (modo === "tareas") cerrarTareas();
    else if (modo === "dialogo") cerrarDialogo();
    return;
  }
  if (e.key === "Tab") {
    e.preventDefault();
    if (modo === "tareas") cerrarTareas(); else abrirTareas();
    return;
  }
  /* mientras se escribe en un campo o en el editor, el juego no toca el teclado:
     si no, WASD movería al personaje y esas letras no se podrían escribir */
  const destino = e.target && e.target.tagName;
  if (destino === "INPUT" || destino === "TEXTAREA") return;

  if (e.key === "f" || e.key === "F") { e.preventDefault(); alternarPantallaCompleta(); return; }

  const dir = MAPA_TECLAS[e.key];
  if (dir) { teclas[dir] = true; e.preventDefault(); }

  if (e.key === "e" || e.key === "E" || e.key === " " || e.key === "Enter") {
    if (modo === "dialogo") { e.preventDefault(); avanzar(); }
    else if (modo === "juego") { e.preventDefault(); interactuar(); }
  }
});
window.addEventListener("keyup", function (e) {
  const dir = MAPA_TECLAS[e.key];
  if (dir) teclas[dir] = false;
});
window.addEventListener("blur", function () { for (const k in teclas) teclas[k] = false; });

/* ----------------------------- bucle principal ---------------------------- */
let ultimo = 0;
function bucle(t) {
  const dt = Math.min(0.05, (t - ultimo) / 1000 || 0);
  ultimo = t;
  tiempoTotal += dt;

  if (modo === "juego") { estado.segundos += dt; mover(dt); vigilarAviso(); vigilarSala(); }
  else if (modo === "dialogo") { estado.segundos += dt; animarDialogo(dt); }
  else if (modo === "reto" || modo === "tareas") { estado.segundos += dt; }
  moverAvisos();

  if (modo !== "inicio") { seguirCamara(); dibujarEscena(); actualizarHUD(); }
  requestAnimationFrame(bucle);
}

/* --------------------------------- arranque ------------------------------- */
function iniciarMundo() {
  A.construir();
  M.construir();
  colocarEntidades();
  jugador.x = (M.INICIO.x + 0.5) * T;
  jugador.y = (M.INICIO.y + 0.9) * T;
  jugador.dir = "up";
  if (credenciales() >= totalRetos()) M.abrirNucleo();
  ajustar();
}

function empezar(nueva) {
  $("pInicio").classList.remove("visible");
  modo = "juego";
  if (credenciales() >= totalRetos()) M.abrirNucleo();
  actualizarHUD();
  guardar();
  if (nueva && !estado.vioIntro) {
    estado.vioIntro = true; guardar();
    const vega = JUEGO.npcs.filter(function (n) { return n.id === "vega"; })[0];
    hablar(vega ? vega.nombre : "Directora Vega", JUEGO.intro, caraDe(vega));
  }
}

function conectar() {
  /* Se empieza a bajar Python de inmediato: así ya está listo cuando el
     escuadrón llegue a su primer encargo. */
  EJEC.alCambiarEstado(pintarInterprete);
  EJEC.preparar();

  editor = EJEC.montarEditor({
    editor: $("editor"), numeros: $("numeros"), sintaxis: $("sintaxis"),
    alEjecutar: enviar
  });

  const inNombre = $("inNombreEquipo");
  $("btnJugar").addEventListener("click", function () {
    estado.equipo = ((inNombre.value || "").trim() || "Escuadrón sin nombre").slice(0, 18);
    estado.puntos = 0; estado.xp = 0; estado.resueltos = {}; estado.pistas = {};
    estado.intentos = {}; estado.borradores = {}; estado.segundos = 0;
    estado.vistos = {}; estado.leidos = {};
    estado.vioIntro = false; estado.terminado = false;
    M.construir(); colocarEntidades();
    empezar(true);
  });
  inNombre.addEventListener("keydown", function (e) {
    e.stopPropagation();
    if (e.key === "Enter") { e.preventDefault(); $("btnJugar").click(); }
  });

  $("btnContinuar").addEventListener("click", function () {
    if (!cargar()) { inNombre.placeholder = "No hay partida guardada"; return; }
    empezar(false);
  });

  $("btnEnviar").addEventListener("click", enviar);
  $("btnPista").addEventListener("click", pedirPista);
  $("btnCerrarReto").addEventListener("click", cerrarReto);
  $("btnReiniciarCodigo").addEventListener("click", function () {
    if (retoActual) editor.poner(retoActual.plantilla || "");
  });
  $("inRespuesta").addEventListener("keydown", function (e) {
    e.stopPropagation();
    if (e.key === "Enter") { e.preventDefault(); enviar(); }
  });
  $("btnPantalla").addEventListener("click", alternarPantallaCompleta);
  $("btnTareas").addEventListener("click", function () {
    if (modo === "tareas") cerrarTareas(); else abrirTareas();
  });
  $("btnCerrarTareas").addEventListener("click", cerrarTareas);
  $("btnReiniciar").addEventListener("click", function () {
    try { localStorage.removeItem(CLAVE); } catch (e) {}
    location.reload();
  });
  pantalla.addEventListener("click", function () {
    if (modo === "juego") interactuar();
    else if (modo === "dialogo") avanzar();
  });

  try {
    const d = JSON.parse(localStorage.getItem(CLAVE) || "null");
    if (d && d.equipo) inNombre.value = d.equipo;
  } catch (e) {}
}

iniciarMundo();
conectar();
requestAnimationFrame(bucle);

/* Para depurar durante la competencia: window.S7.estado muestra la partida. */
window.S7 = {
  estado: estado, jugador: jugador, npcs: npcs, cam: cam,
  hash: hash, normalizar: normalizar,
  dibujar: dibujarEscena, camara: seguirCamara,
  modo: function (m) { modo = m; }, T: T
};

})();
