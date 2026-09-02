/* Prueba de la ruta de pistas: ejecuta el script real de pistas/index.html
   contra un DOM simulado y hace lo mismo que haria un equipo con el celular.

   Escanear un cartel es abrir la pagina con la ficha de ese cartel en la
   direccion, asi que "escanear" aqui es cargar la pagina otra vez con otra
   ficha, igual que en el telefono. */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const raiz = path.join(__dirname, '..');
const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
let fallos = 0, hechas = 0;
function ok(cond, que) {
  hechas++;
  if (cond) { console.log('  ok   ' + que); }
  else { fallos++; console.log('  FALLA ' + que); }
}

/* ------------------------------ DOM simulado ----------------------------- */
function nuevoDom(ficha, almacen) {
  function el(id) {
    return {
      id, value: '', textContent: '', innerHTML: '', className: '',
      disabled: false, hidden: false, style: {},
      classList: {
        _s: new Set(),
        add(c) { this._s.add(c); }, remove(c) { this._s.delete(c); },
        contains(c) { return this._s.has(c); }
      },
      appendChild() {}, addEventListener() {}, focus() {}
    };
  }
  const nodos = {};
  return {
    nodos,
    document: {
      getElementById: id => (nodos[id] = nodos[id] || el(id)),
      createElement: () => el('nuevo'),
      body: el('body')
    },
    location: { search: ficha ? '?e=' + ficha : '' },
    localStorage: {
      getItem: k => (k in almacen ? almacen[k] : null),
      setItem: (k, v) => { almacen[k] = String(v); },
      removeItem: k => { delete almacen[k]; }
    },
    crypto: require('crypto').webcrypto,
    atob, btoa, TextEncoder, TextDecoder, setTimeout, console
  };
}

/* Abre la pagina como si escanearan el cartel de esa ficha. El almacen se
   comparte entre cargas: es el mismo telefono. */
function abrirPagina(ficha, almacen, busca) {
  const ctx = nuevoDom(ficha, almacen);
  if (busca) ctx.location.search = busca;
  ctx.window = ctx;
  vm.createContext(ctx);
  for (const f of ['js/pistas-datos.js', 'js/pistas.js']) {
    vm.runInContext(fs.readFileSync(path.join(raiz, f), 'utf8'), ctx, { filename: f });
  }
  const html = fs.readFileSync(path.join(raiz, 'pistas/index.html'), 'utf8');
  const trozos = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]);
  if (!trozos.length) throw new Error('pistas/index.html no tiene script inline');
  try {
    vm.runInContext(trozos[trozos.length - 1], ctx, { filename: 'index.html' });
  } catch (e) {
    /* La pagina corta a proposito cuando se reinicia el telefono. */
    if (!/reiniciado/.test(e.message)) throw e;
  }
  return ctx;
}

/* PBKDF2 tarda de verdad: se espera a que pase algo, no por reloj. */
async function hasta(cond, ms) {
  const fin = Date.now() + (ms || 8000);
  while (!cond() && Date.now() < fin) await new Promise(r => setImmediate(r));
  return cond();
}

const avance = ctx => ctx.window.CQ.ruta.leer() || {};
const aviso = ctx => ctx.nodos.aviso.innerHTML;
const quieto = ctx => !/Comprobando/.test(aviso(ctx));
const cuantos = ctx => Object.keys(avance(ctx).fragmentos || {}).length;
/* El nodo del cierre solo lo toca la pagina cuando hay clave, asi que
   antes de eso ni siquiera existe en el DOM simulado. */
const cierre = ctx => (ctx.nodos.cierre && ctx.nodos.cierre.textContent) || '';

/* La clave no se guarda: la pinta la pagina cuando estan todos los
   fragmentos. Se lee de la pantalla, que es lo que el equipo tiene delante. */
function claveEnPantalla(ctx) {
  return ctx.nodos.final.hidden ? null : (ctx.nodos.clave.textContent || null);
}

async function meterCodigo(ctx, codigo) {
  ctx.nodos.inCodigo.value = codigo;
  ctx.nodos.btnArrancar.onclick.call(ctx.nodos.btnArrancar);
  await hasta(() => quieto(ctx));
}

async function responder(ctx, texto) {
  ctx.nodos.inRespuesta.value = texto;
  ctx.nodos.btnResponder.onclick.call(ctx.nodos.btnResponder);
  await hasta(() => quieto(ctx));
}

/* Escanea el cartel y espera a que el reto aparezca en pantalla. */
async function escanear(ficha, almacen) {
  const ctx = abrirPagina(ficha, almacen);
  await hasta(() => !ctx.nodos.pasoReto.hidden ||
                    /no corresponde|No se pudo/.test(ctx.nodos.textoEsperar.textContent));
  return ctx;
}

async function probar() {
  const claro = JSON.parse(fs.readFileSync(
    path.join(raiz, 'herramientas/pistas.json'), 'utf8'));
  const org = JSON.parse(fs.readFileSync(
    path.join(raiz, 'herramientas/rutas.json'), 'utf8'));
  const rutas = org.rutas, fichas = org.fichas, arranques = org.arranques;
  const respuestaDe = {}, lugarDe = {};
  claro.estaciones.forEach(e => { respuestaDe[e.id] = e.respuesta; lugarDe[e.id] = e.lugar; });
  const equipos = Object.keys(rutas);
  const nEst = claro.estaciones.length;
  const claveFinal = claro.estaciones.map(e => e.fragmento).join('');
  ok(claveFinal.length > 0, 'la clave final se arma con los fragmentos: ' + claveFinal);

  /* ------------------------- codigos de arranque ------------------------ */
  console.log('\nCodigos de arranque');
  for (const equipo of equipos) {
    const ctx = abrirPagina(null, {});
    ok(!ctx.nodos.pasoArranque.hidden, equipo + ': sin codigo se pide el codigo');
    await meterCodigo(ctx, arranques[equipo]);
    ok(avance(ctx).equipo === equipo, arranques[equipo] + ' identifica a ' + equipo);
    ok(aviso(ctx).indexOf(lugarDe[rutas[equipo][0]]) >= 0,
       arranques[equipo] + ' dice donde empieza');
  }
  {
    const ctx = abrirPagina(null, {});
    await meterCodigo(ctx, 'VEGA-0000');
    ok(!avance(ctx).equipo, 'un codigo inventado no arranca nada');
    ok(/no es/.test(aviso(ctx)), 'y lo dice');
    await meterCodigo(ctx, '  ');
    ok(!avance(ctx).equipo, 'un codigo vacio tampoco');
  }

  /* --------------------------- escanear carteles ------------------------ */
  console.log('\nEscanear un cartel muestra su reto');
  for (const e of claro.estaciones) {
    const almacen = {};
    const arranque = abrirPagina(null, almacen);
    await meterCodigo(arranque, arranques[equipos[0]]);
    const ctx = await escanear(fichas[e.id], almacen);
    ok(!ctx.nodos.pasoReto.hidden, 'la ficha de ' + e.id + ' abre su reto');
    ok(ctx.nodos.etiquetaEstacion.textContent === 'ESTACIÓN ' + e.id,
       'y dice que es la estacion ' + e.id);
    ok(ctx.nodos.textoReto.textContent === e.acertijo,
       'y muestra el reto entero de ' + e.id);
  }
  {
    const almacen = {};
    const a = abrirPagina(null, almacen);
    await meterCodigo(a, arranques[equipos[0]]);
    const ctx = await escanear('fichafalsa99', almacen);
    ok(ctx.nodos.pasoReto.hidden, 'una ficha inventada no abre ningun reto');
    ok(/no corresponde/.test(ctx.nodos.textoEsperar.textContent), 'y lo dice');
  }

  /* ------------- escanean primero y meten el codigo despues ------------- */
  /* Pasara: llegan al cartel, escanean por curiosidad y solo entonces sacan
     el papel con su codigo. La pagina tiene que seguir desde ahi. */
  console.log('\nEscanear antes de meter el codigo');
  {
    const almacen = {};
    const equipo = equipos[0], primera = rutas[equipo][0];
    const ctx = abrirPagina(fichas[primera], almacen);
    await hasta(() => !ctx.nodos.pasoArranque.hidden);
    ok(!ctx.nodos.pasoArranque.hidden, 'sin codigo pide el codigo, aunque escaneen');
    ok(ctx.nodos.pasoReto.hidden, 'y todavia no ensena el reto');

    await meterCodigo(ctx, arranques[equipo]);
    await hasta(() => !ctx.nodos.pasoReto.hidden);
    ok(!ctx.nodos.pasoReto.hidden, 'al meter el codigo aparece el reto de ese cartel');
    ok(ctx.nodos.etiquetaEstacion.textContent === 'ESTACIÓN ' + primera,
       'y es el reto del cartel que tenian delante');

    await responder(ctx, respuestaDe[primera]);
    ok(cuantos(ctx) === 1, 'y pueden responder ahi mismo');
  }

  /* --------------------------- recorrido completo ----------------------- */
  console.log('\nRecorrido completo de cada equipo');
  for (const equipo of equipos) {
    const almacen = {};
    const arranque = abrirPagina(null, almacen);
    await meterCodigo(arranque, arranques[equipo]);
    const orden = rutas[equipo];
    let clavePorAhi = false;

    for (let i = 0; i < orden.length; i++) {
      const ctx = await escanear(fichas[orden[i]], almacen);
      await responder(ctx, respuestaDe[orden[i]]);
      if (i < orden.length - 1) {
        if (claveEnPantalla(ctx)) clavePorAhi = true;
        ok(!cierre(ctx),
           equipo + ': tras ' + orden[i] + ' todavia no lo manda al laboratorio');
        ok(aviso(ctx).indexOf(lugarDe[orden[i + 1]]) >= 0,
           equipo + ': tras ' + orden[i] + ' lo manda a ' + orden[i + 1]);
      } else {
        ok(!!claveEnPantalla(ctx), equipo + ': recibe la clave al cerrar la ruta');
        ok(claveEnPantalla(ctx) === claveFinal, equipo + ': la clave es la correcta');
        ok(cuantos(ctx) === nEst, equipo + ': junta los ' + nEst + ' fragmentos');
        ok(cierre(ctx) === claro.cierre,
           equipo + ': y le dice que vuelva al laboratorio');
      }
    }
    ok(!clavePorAhi, equipo + ': NO hay clave antes de la ultima estacion');
  }

  /* ------------------ un telefono prestado no regala nada --------------- */
  console.log('\nUn telefono que ya uso otro equipo');
  {
    const almacen = {};                       /* el mismo telefono */
    const primero = equipos[0], segundo = equipos[1];
    let ctx = abrirPagina(null, almacen);
    await meterCodigo(ctx, arranques[primero]);
    for (const id of rutas[primero]) {
      ctx = await escanear(fichas[id], almacen);
      await responder(ctx, respuestaDe[id]);
    }
    ok(claveEnPantalla(ctx) === claveFinal, primero + ' termina su ruta');

    ctx = abrirPagina(null, almacen);
    await meterCodigo(ctx, arranques[segundo]);
    ok(avance(ctx).equipo === segundo, 'el telefono pasa a ' + segundo);
    ok(cuantos(ctx) === 0, segundo + ' NO hereda los fragmentos del otro');
    ok(!claveEnPantalla(ctx), segundo + ' no ve la clave sin caminar');
    ok(/se borr/.test(aviso(ctx)), 'y avisa de que se borro el avance anterior');

    /* Volver a meter el codigo del mismo equipo no le borra lo suyo. */
    ctx = await escanear(fichas[rutas[segundo][0]], almacen);
    await responder(ctx, respuestaDe[rutas[segundo][0]]);
    ok(cuantos(ctx) === 1, segundo + ' avanza normal');
    ctx = abrirPagina(null, almacen);
    await meterCodigo(ctx, arranques[segundo]);
    ok(cuantos(ctx) === 1, 'y repetir su propio codigo no le borra lo que lleva');
  }

  /* ---------------------- sin todos los QR no se acaba ------------------ */
  console.log('\nSin todos los QR no se puede terminar');
  for (const equipo of equipos.slice(0, 3)) {
    for (let saltada = 0; saltada < rutas[equipo].length; saltada++) {
      const almacen = {};
      let ultimo = abrirPagina(null, almacen);
      await meterCodigo(ultimo, arranques[equipo]);
      for (let i = 0; i < rutas[equipo].length; i++) {
        if (i === saltada) continue;
        ultimo = await escanear(fichas[rutas[equipo][i]], almacen);
        await responder(ultimo, respuestaDe[rutas[equipo][i]]);
      }
      ok(!claveEnPantalla(ultimo),
         equipo + ': saltandose ' + rutas[equipo][saltada] + ' no hay clave');
    }
  }

  /* --------------------------- respuestas malas ------------------------- */
  console.log('\nRespuestas equivocadas');
  {
    const almacen = {};
    const a = abrirPagina(null, almacen);
    await meterCodigo(a, arranques[equipos[0]]);
    const primera = rutas[equipos[0]][0];
    const ctx = await escanear(fichas[primera], almacen);
    for (const mala of ['perro', '0', claveFinal, respuestaDe[primera] + 'x',
                        '???', '...', 'áéí']) {
      await responder(ctx, mala);
      ok(cuantos(ctx) === 0, JSON.stringify(mala) + ' no entrega ningun fragmento');
      ok(/no es/.test(aviso(ctx)), JSON.stringify(mala) + ' avisa del error');
      ok(ctx.nodos.btnResponder.disabled === false,
         JSON.stringify(mala) + ' rehabilita el boton');
    }
    await responder(ctx, '   ');
    ok(/Escriban/.test(aviso(ctx)), 'una respuesta vacia no rompe la pagina');

    await responder(ctx, respuestaDe[primera]);
    ok(cuantos(ctx) === 1, 'y la buena si entra');
    await responder(ctx, respuestaDe[primera]);
    ok(cuantos(ctx) === 1, 'repetir la misma estacion no suma de mas');
    ok(/ya la ten/.test(aviso(ctx)), 'y avisa que esa ya la tenian');
  }

  /* ------------------ dejar el telefono limpio tras probar -------------- */
  console.log('\nReiniciar el telefono');
  {
    const almacen = {};
    let ctx = abrirPagina(null, almacen);
    await meterCodigo(ctx, arranques[equipos[0]]);
    const primera = rutas[equipos[0]][0];
    ctx = await escanear(fichas[primera], almacen);
    await responder(ctx, respuestaDe[primera]);
    ok(cuantos(ctx) === 1, 'se prueba la ruta y queda avance en el telefono');

    abrirPagina(null, almacen, '?reiniciar=1');
    const limpio = abrirPagina(null, almacen);
    ok(cuantos(limpio) === 0, 'con ?reiniciar=1 el avance desaparece');
    ok(!avance(limpio).equipo, 'y ya no recuerda de que equipo era');
    ok(!limpio.nodos.pasoArranque.hidden, 'vuelve a pedir el codigo de arranque');
  }

  /* ------------- la respuesta sola no abre nada desde fuera ------------- */
  /* Alguien que se baje pistas-datos.js y pruebe respuestas cortas ("42") a
     fuerza bruta no debe sacar nada: la recompensa esta cerrada con la ficha
     del cartel ademas de la respuesta. */
  console.log('\nNo se puede romper desde casa');
  {
    const R = abrirPagina(null, {}).window.CQ.ruta;
    for (const equipo of equipos) {
      for (const id of rutas[equipo]) {
        const cofre = R.cofres(equipo)[id];
        const sola = await R.abrir(cofre, respuestaDe[id]);
        ok(sola === null,
           'la respuesta de ' + id + ' sin la ficha no abre el cofre de ' + equipo);
      }
    }
    /* Y con la ficha correcta si abre: la ruta sigue funcionando. */
    const cofre = R.cofres(equipos[0])[rutas[equipos[0]][0]];
    const id = rutas[equipos[0]][0];
    const con = await R.abrir(cofre, fichas[id] + respuestaDe[id]);
    ok(con && con.fragmento, 'con la ficha del cartel si abre');

    /* Fuerza bruta corta contra el cofre de la estacion de respuesta "42". */
    const corta = claro.estaciones.filter(e => e.respuesta.length <= 3)[0];
    if (corta) {
      let rota = false;
      for (let n = 0; n < 200 && !rota; n++) {
        const c = R.cofres(equipos[0])[corta.id];
        if (await R.abrir(c, String(n))) rota = true;
      }
      ok(!rota, 'probar 200 numeros contra la estacion ' + corta.id + ' no la abre');
    }
  }

  /* -------------------- los datos publicados no filtran ----------------- */
  console.log('\nLos datos publicados no filtran nada');
  /* Buscar palabras dentro del base64 da coincidencias por azar, asi que en
     vez de rastrear texto se comprueba la forma: todo lo que se publica de
     cada cofre tiene que ser base64 y nada mas. */
  const pub = abrirPagina(null, {}).window.CQ.pistas;
  const secretos = [claveFinal];
  claro.estaciones.forEach(e => secretos.push(e.respuesta, e.lugar, e.acertijo, e.fragmento));
  Object.keys(arranques).forEach(eq => secretos.push(arranques[eq]));
  const enClaro = secretos.filter(Boolean).map(t => String(t).toLowerCase());

  let cadenas = 0; const sueltas = [];
  (function hurgar(nodo, ruta) {
    if (typeof nodo === 'string') {
      cadenas++;
      if (nodo.length <= 8 || !nodo.split('').every(c => B64.indexOf(c) >= 0)) {
        sueltas.push(ruta + ' = ' + JSON.stringify(nodo));
      }
      if (enClaro.indexOf(nodo.toLowerCase()) >= 0) {
        sueltas.push(ruta + ' ES UN SECRETO: ' + nodo);
      }
    } else if (nodo && typeof nodo === 'object') {
      Object.keys(nodo).forEach(k => hurgar(nodo[k], ruta + '.' + k));
    }
  })({ equipos: pub.equipos, retos: pub.retos, arranques: pub.arranques,
       acceso: pub.acceso }, 'datos');
  ok(cadenas > 0, 'los cofres publicados tienen ' + cadenas + ' cadenas');
  ok(sueltas.length === 0, 'todas son base64 cifrado' +
     (sueltas.length ? ' -- sobran: ' + sueltas.slice(0, 4).join(' | ') : ''));

  /* Los lugares, los retos y los codigos son texto largo: esos si se rastrean
     tal cual en los archivos que se publican. */
  const publicados = {
    'js/pistas-datos.js': fs.readFileSync(path.join(raiz, 'js/pistas-datos.js'), 'utf8'),
    'pistas/index.html': fs.readFileSync(path.join(raiz, 'pistas/index.html'), 'utf8')
  };
  for (const nombre of Object.keys(publicados)) {
    const texto = publicados[nombre].toLowerCase();
    for (const e of claro.estaciones) {
      ok(texto.indexOf(e.lugar.toLowerCase()) < 0, nombre + ' no revela el lugar de ' + e.id);
      ok(texto.indexOf(e.acertijo.toLowerCase().slice(0, 24)) < 0,
         nombre + ' no revela el reto de ' + e.id);
    }
    for (const eq of Object.keys(arranques)) {
      ok(texto.indexOf(arranques[eq].toLowerCase()) < 0,
         nombre + ' no revela el codigo de ' + eq);
    }
  }

  console.log('\n' + hechas + ' comprobaciones, ' + fallos + ' fallas');
  process.exit(fallos ? 1 : 0);
}
probar().catch(e => { console.error(e); process.exit(1); });
