/* Verifica el juego sin abrir el navegador.
   Uso:  node pruebas/verificar.js
   Necesita Node y Python en la máquina. El código de los retos se ejecuta con
   el Python del sistema usando el MISMO js/piloto.py que corre en el juego. */
const { arrancar } = require('./entorno.js');

let fallos = 0;
function comprobar(nombre, cond, extra) {
  console.log((cond ? '  ok    ' : '  FALLA ') + nombre + (extra ? '   [' + extra + ']' : ''));
  if (!cond) fallos++;
}
function titulo(t) { console.log('\n' + t); }

/* Soluciones de referencia en Python. Si cambias un reto, actualiza también
   esta tabla: es la red que avisa cuando un caso de prueba quedó mal escrito. */
const SOLUCIONES = {
  contar_unicos:
    'def contar_unicos(registros):\n' +
    '    return len(set(registros))\n',

  promedio_valido:
    'def promedio_valido(lecturas):\n' +
    '    validas = [v for v in lecturas if v is not None and v >= 0]\n' +
    '    if not validas:\n' +
    '        return 0\n' +
    '    return round(sum(validas) / len(validas))\n',

  descifrar:
    'def descifrar(texto, desplazamiento):\n' +
    '    salida = ""\n' +
    '    for c in texto:\n' +
    '        if "A" <= c <= "Z":\n' +
    '            salida += chr((ord(c) - 65 - desplazamiento) % 26 + 65)\n' +
    '        else:\n' +
    '            salida += c\n' +
    '    return salida\n',

  saltos_minimos:
    'def saltos_minimos(conexiones, origen, destino):\n' +
    '    if origen == destino:\n' +
    '        return 0\n' +
    '    vecinos = {}\n' +
    '    for a, b in conexiones:\n' +
    '        vecinos.setdefault(a, []).append(b)\n' +
    '        vecinos.setdefault(b, []).append(a)\n' +
    '    visitados = {origen}\n' +
    '    capa = [origen]\n' +
    '    n = 0\n' +
    '    while capa:\n' +
    '        n += 1\n' +
    '        siguiente = []\n' +
    '        for u in capa:\n' +
    '            for v in vecinos.get(u, []):\n' +
    '                if v == destino:\n' +
    '                    return n\n' +
    '                if v not in visitados:\n' +
    '                    visitados.add(v)\n' +
    '                    siguiente.append(v)\n' +
    '        capa = siguiente\n' +
    '    return -1\n',

  sin_pareja:
    'def sin_pareja(codigos):\n' +
    '    r = 0\n' +
    '    for c in codigos:\n' +
    '        r ^= c\n' +
    '    return r\n',

  indice:
    'def indice(registros):\n' +
    '    conteo = {}\n' +
    '    for r in registros:\n' +
    '        conteo[r["area"]] = conteo.get(r["area"], 0) + 1\n' +
    '    return [{"area": a, "total": conteo[a]} for a in sorted(conteo)]\n'
};

async function principal() {
  const J = arrancar();
  const { S7, CQ, JUEGO, el, tick, tecla, pasarDialogo, esperar } = J;
  const M = CQ.mapa;
  console.log('Python del sistema: ' + require('./entorno.js').buscarPython());

  /* ------------------------------------------------ 1. el edificio ------ */
  titulo('EDIFICIO');
  const vis = new Set([M.INICIO.x + ',' + M.INICIO.y]), cola = [[M.INICIO.x, M.INICIO.y]];
  while (cola.length) {
    const [x, y] = cola.shift();
    [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dx, dy]) => {
      const k = (x + dx) + ',' + (y + dy);
      if (!vis.has(k) && !M.solido(x + dx, y + dy)) { vis.add(k); cola.push([x + dx, y + dy]); }
    });
  }
  comprobar('el edificio es transitable', vis.size > 600, vis.size + ' casillas');
  M.SALAS.forEach(s => {
    let libres = 0, alcanzadas = 0;
    for (let y = s.y; y < s.y + s.h; y++) for (let x = s.x; x < s.x + s.w; x++) {
      if (!M.solido(x, y)) { libres++; if (vis.has(x + ',' + y)) alcanzadas++; }
    }
    if (s.id === 'nucleo') comprobar('el Núcleo empieza cerrado', alcanzadas === 0);
    else comprobar('se recorre entera ' + s.nombre, libres > 0 && alcanzadas === libres,
      alcanzadas + '/' + libres);
  });
  JUEGO.npcs.forEach(n => {
    const cerca = [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => vis.has((n.x + dx) + ',' + (n.y + dy)));
    comprobar('se puede llegar a ' + n.nombre, cerca);
    comprobar('  ' + n.nombre + ' está en ' + n.sala, M.zona_en(n.x, n.y) === n.sala,
      M.zona_en(n.x, n.y) || 'fuera de toda sala');
  });
  JUEGO.terminales.forEach(t => {
    const cerca = [[0, 1], [0, -1], [1, 0], [-1, 0]].some(([dx, dy]) => vis.has((t[0] + dx) + ',' + (t[1] + dy)));
    comprobar('terminal legible: ' + t[2].split('\n')[0], cerca);
  });
  comprobar('la compuerta se alcanza desde el pasillo',
    vis.has(M.PUERTA_NUCLEO.x + ',' + (M.PUERTA_NUCLEO.y + 1)));

  /* --------------------------------- 1b. arte de personajes ------------- */
  titulo('PERSONAJES');
  const fs = require('fs'), ruta = require('path');
  const RAIZ = ruta.join(__dirname, '..');

  /* lee ancho y alto de un PNG sin librerías: están en la cabecera IHDR */
  function medirPNG(archivo) {
    const b = fs.readFileSync(archivo);
    if (b.length < 24 || b.readUInt32BE(0) !== 0x89504e47) return null;
    return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) };
  }

  JUEGO.npcs.forEach(n => {
    if (n.sprite) {
      const f = ruta.join(RAIZ, n.sprite);
      const existe = fs.existsSync(f);
      comprobar('existe el sprite de ' + n.nombre, existe, n.sprite);
      if (existe) {
        const m = medirPNG(f), cols = n.columnas || 3, filas = n.filas || 4;
        const bien = !!m && m.w % cols === 0 && m.h % filas === 0 &&
                     m.w / cols === CQ.arte.SP_W && m.h / filas === CQ.arte.SP_H;
        comprobar('  la hoja de ' + n.nombre + ' tiene cuadros de ' +
          CQ.arte.SP_W + 'x' + CQ.arte.SP_H,
          bien, m ? (m.w + 'x' + m.h + ' → cuadro ' + (m.w / cols) + 'x' + (m.h / filas)) : 'no es PNG');
      }
    }
    if (n.retrato) {
      const f = ruta.join(RAIZ, n.retrato);
      comprobar('existe el retrato de ' + n.nombre, fs.existsSync(f), n.retrato);
    }
  });

  /* El cuadro del retrato tiene que medir un múltiplo exacto de la imagen.
     Si no, el navegador la escala en fracciones: unos píxeles salen más
     anchos que otros y los bordes se ven rotos aunque el dibujo esté bien. */
  (function () {
    const html = fs.readFileSync(ruta.join(RAIZ, 'index.html'), 'utf8');
    const m = html.match(/#dlgRetrato\{[^}]*width:calc\(var\(--u\)\*(\d+)\)/);
    const lado = m ? parseInt(m[1], 10) : 0, R = CQ.arte.RETRATO;
    comprobar('el cuadro del retrato usa escala entera', lado > 0 && lado % R === 0,
      lado ? lado + 'u para una imagen de ' + R + ' px' : 'no encontré la regla CSS');
  })();

  /* todos los personajes tienen cara, con archivo propio o dibujada */
  JUEGO.npcs.forEach(n => {
    const dibujado = CQ.arte.retratoDe(n);
    comprobar('  ' + n.nombre + ' tiene retrato', !!n.retrato || (dibujado && dibujado.width === CQ.arte.RETRATO),
      n.retrato ? 'archivo propio' : 'dibujado por código');
  });

  /* ------------------------------- 2. el intérprete de Python ----------- */
  titulo('INTÉRPRETE DE PYTHON');
  const EJ = CQ.codigo;

  let r = await EJ.ejecutar('def f(a):\n    return a + 1\n', 'f', [{ entrada: [1], salida: 2 }]);
  comprobar('acepta una respuesta correcta', r.resultados && r.resultados[0].paso);

  r = await EJ.ejecutar('def f(a):\n    return a + 2\n', 'f', [{ entrada: [1], salida: 2 }]);
  comprobar('detecta una respuesta incorrecta', r.resultados && !r.resultados[0].paso,
    'obtuvo ' + (r.resultados && r.resultados[0].obtenido));

  r = await EJ.ejecutar('def otra():\n    pass\n', 'f', [{ entrada: [], salida: 1 }]);
  comprobar('avisa si la función no existe', !!r.error && /f/.test(r.error), r.error);

  r = await EJ.ejecutar('def f(:\n', 'f', [{ entrada: [], salida: 1 }]);
  comprobar('avisa si el código no compila, con número de línea',
    !!r.error && /línea/.test(r.error), r.error);

  r = await EJ.ejecutar('def f():\n    return 1 / 0\n', 'f', [{ entrada: [], salida: 1 }]);
  comprobar('informa el error de un caso sin tumbar el resto',
    r.resultados && /ZeroDivisionError/.test(r.resultados[0].fallo || ''),
    r.resultados && r.resultados[0].fallo);

  r = await EJ.ejecutar('def f():\n    return [1, {"a": 2}]\n', 'f',
    [{ entrada: [], salida: [1, { a: 2 }] }]);
  comprobar('compara listas y diccionarios en profundidad', r.resultados && r.resultados[0].paso);

  r = await EJ.ejecutar('def f():\n    return (1, 2)\n', 'f', [{ entrada: [], salida: [1, 2] }]);
  comprobar('una tupla vale igual que una lista', r.resultados && r.resultados[0].paso);

  r = await EJ.ejecutar('def f():\n    print("hola", 42)\n    return 1\n', 'f',
    [{ entrada: [], salida: 1 }]);
  comprobar('captura lo que se imprime con print',
    r.registros && r.registros[0] === 'hola 42', (r.registros || [])[0]);

  r = await EJ.ejecutar('import math\ndef f(a):\n    return math.floor(a)\n', 'f',
    [{ entrada: [3.7], salida: 3 }]);
  comprobar('se pueden importar módulos de la librería estándar',
    r.resultados && r.resultados[0].paso, r.error);

  /* la prueba que importa: un bucle infinito de verdad */
  const t0 = Date.now();
  r = await EJ.ejecutar('def f():\n    while True:\n        pass\n', 'f', [{ entrada: [], salida: 1 }]);
  const tardo = ((Date.now() - t0) / 1000).toFixed(1);
  comprobar('corta un bucle infinito dentro de la función',
    !!r.corte || (r.resultados && /bucle/.test(r.resultados[0].fallo || '')),
    'tardó ' + tardo + ' s');

  r = await EJ.ejecutar('while True:\n    pass\n', 'f', [{ entrada: [], salida: 1 }]);
  comprobar('corta un bucle infinito fuera de la función', !!r.corte, r.error);

  const sx = await EJ.revisarSintaxis('def f(:');
  comprobar('el chequeo de sintaxis en vivo detecta errores', !sx.ok && !!sx.mensaje, sx.mensaje);
  comprobar('el chequeo de sintaxis acepta código válido',
    (await EJ.revisarSintaxis('x = 1')).ok);

  /* ------------------------------- 3. los retos son resolubles ---------- */
  titulo('RETOS');
  const retos = JUEGO.npcs.filter(n => n.reto).map(n => ({ n: n.nombre, r: n.reto }))
    .concat([{ n: 'EL ÍNDICE (final)', r: JUEGO.retoFinal }]);
  for (const item of retos) {
    const reto = item.r;
    const casos = (reto.casos || []).concat(reto.casosOcultos || []);
    const sol = SOLUCIONES[reto.funcion];
    if (!sol) { comprobar('hay solución de referencia para ' + reto.funcion, false); continue; }
    const res = await EJ.ejecutar(sol, reto.funcion, casos);
    const pasan = res.resultados ? res.resultados.filter(x => x.paso).length : 0;
    comprobar(item.n + ' — ' + reto.titulo, pasan === casos.length,
      pasan + '/' + casos.length + ' casos' + (res.error ? ' · ' + res.error : ''));
    comprobar('  la plantilla de ' + reto.funcion + ' compila',
      (await EJ.revisarSintaxis(reto.plantilla)).ok);
    const conPlantilla = await EJ.ejecutar(reto.plantilla, reto.funcion, casos);
    comprobar('  la plantilla NO resuelve el reto sola',
      !conPlantilla.resultados || conPlantilla.resultados.filter(x => x.paso).length < casos.length);
  }

  /* ------------------------------------- 4. una partida completa -------- */
  titulo('PARTIDA COMPLETA');
  el('inNombreEquipo').value = 'Los Bytes Locos';
  el('btnJugar').disparar('click');
  comprobar('arranca con el nombre del escuadrón', S7.estado.equipo === 'Los Bytes Locos');
  comprobar('la directora da la bienvenida', /Vega/.test(el('dlgNombre').textContent),
    el('dlgNombre').textContent);
  pasarDialogo(30);
  comprobar('la bienvenida se cierra con E', !el('dialogo').classList._v);

  let yaRevisadoPython = false;
  for (const npc of JUEGO.npcs.filter(n => n.reto)) {
    S7.jugador.x = (npc.x + 0.5) * S7.T;
    S7.jugador.y = (npc.y + 1.7) * S7.T;
    S7.jugador.dir = 'up';
    tick(); tecla('e'); pasarDialogo(20);
    comprobar('se abre el encargo de ' + npc.id, el('pReto').classList._v, el('retoTitulo').textContent);
    comprobar('  el editor arranca con la plantilla',
      el('editor').value.indexOf('def ' + npc.reto.funcion) === 0, el('editor').value.split('\n')[0]);

    if (!yaRevisadoPython) {
      /* Los casos se escriben en JavaScript pero se le muestran a quien
         programa en Python: null, true y false no pueden llegar a pantalla. */
      yaRevisadoPython = true;
      const ejemplos = el('casos').innerHTML;
      comprobar('  los ejemplos se muestran en Python, sin null ni true/false',
        !/null|true|false/.test(ejemplos),
        (ejemplos.match(/[a-z_]+\([^)]*\)/) || ['sin ejemplos'])[0]);
    }

    el('editor').value = 'def ' + npc.reto.funcion + '(*args):\n    return "nada"\n';
    el('btnEnviar').disparar('click');
    await esperar(400);
    comprobar('  rechaza el código incorrecto', !S7.estado.resueltos[npc.id],
      el('retoEstado').textContent);

    el('btnPista').disparar('click');
    comprobar('  la pista se cobra una sola vez', S7.estado.pistas[npc.id] === true);

    el('editor').value = SOLUCIONES[npc.reto.funcion];
    el('btnEnviar').disparar('click');
    await esperar(500);
    comprobar('  acepta la solución correcta', S7.estado.resueltos[npc.id] === true,
      el('retoEstado').textContent);
  }
  /* Al hablar con alguien, la caja muestra su cara. Hay que cerrar antes lo
     que quedó abierto: si sigue un diálogo en pantalla, la E lo avanza en vez
     de iniciar una conversación nueva, y se termina leyendo el retrato viejo. */
  function despejar() {
    tecla('Escape'); tick();
    if (el('pReto').classList._v) el('btnCerrarReto').disparar('click');
    tick();
  }
  function hablarCon(id) {
    despejar();
    const n = JUEGO.npcs.filter(x => x.id === id)[0];
    S7.jugador.x = (n.x + 0.5) * S7.T;
    S7.jugador.y = (n.y + 1.7) * S7.T;
    S7.jugador.dir = 'up';
    tick(); tecla('e'); tick();
    return el('dlgRetrato').src || '';
  }

  comprobar('la caja de diálogo muestra el retrato propio de Annabella',
    /annabella-cara/.test(hablarCon('anna')), el('dlgRetrato').src);
  comprobar('un personaje sin archivo propio recibe retrato dibujado',
    /^data:image/.test(hablarCon('rut')), (el('dlgRetrato').src || '').slice(0, 22));
  despejar();

  comprobar('se reúnen las 5 credenciales',
    Object.keys(S7.estado.resueltos).length === 5, S7.estado.puntos + ' pts');

  const pc = M.PUERTA_NUCLEO;
  S7.jugador.x = (pc.x + 0.5) * S7.T; S7.jugador.y = (pc.y + 1.7) * S7.T; S7.jugador.dir = 'up';
  tick(); tecla('e'); pasarDialogo(20);
  comprobar('la compuerta se abre con las 5 credenciales', el('pReto').classList._v,
    el('retoTitulo').textContent);
  comprobar('el Núcleo queda transitable', !M.solido(pc.x, pc.y));

  el('editor').value = SOLUCIONES[JUEGO.retoFinal.funcion];
  el('btnEnviar').disparar('click');
  await esperar(600);
  comprobar('el Índice acepta la reconstrucción', S7.estado.terminado === true,
    el('retoEstado').textContent);
  comprobar('aparece la pantalla final', el('pFinal').classList._v);
  comprobar('el informe nombra al escuadrón', el('finTexto').innerHTML.indexOf('Los Bytes Locos') > 0);
  comprobar('la partida queda guardada', !!J.disco['seccion7-v1']);
  comprobar('el código escrito se conserva como borrador',
    Object.keys(S7.estado.borradores).length >= 5);

  /* ------------------------------------------ 4b. la interfaz ----------- */
  titulo('INTERFAZ');

  /* La tipografía no tiene mayúsculas acentuadas: si alguna se cuela en un
     rótulo, el navegador la sustituye por otra fuente y se nota. */
  const htmlUI = fs.readFileSync(ruta.join(RAIZ, 'index.html'), 'utf8');
  const cuerpo = htmlUI.slice(htmlUI.indexOf('<body'));
  const acentuadas = (cuerpo.match(/[ÁÉÍÓÚÑÜ]/g) || []);
  comprobar('ningún rótulo lleva mayúsculas acentuadas', acentuadas.length === 0,
    acentuadas.length ? acentuadas.join(' ') : 'limpio');

  /* La barra de desplazamiento del sistema rompe el estilo del juego. */
  comprobar('las barras de desplazamiento están personalizadas',
    /::-webkit-scrollbar-thumb/.test(htmlUI) && /scrollbar-color/.test(htmlUI));

  /* ------------------------------- 4c. pantalla y avance --------------- */
  titulo('PANTALLA, ENCARGOS Y EXPERIENCIA');

  /* La ventana se llena con escala ENTERA: en vez de estirar el lienzo, se
     muestra más mapa. Estirar obligaría a media escala y rompe el pixel art. */
  [[1366, 768], [1462, 856], [1920, 1080], [2560, 1440]].forEach(([w, h]) => {
    global.window.innerWidth = w; global.window.innerHeight = h;
    (J.oyentesVentana.resize || []).forEach(f => f());
    const esc = Math.max(1, Math.min(Math.floor((w - 24) / 336), Math.floor((h - 24) / 192)));
    const usoW = J.pantalla.w * esc / w, usoH = J.pantalla.h * esc / h;
    comprobar('a ' + w + 'x' + h + ' se aprovecha la ventana',
      usoW > 0.93 && usoH > 0.93 && Number.isInteger(esc),
      J.pantalla.w + 'x' + J.pantalla.h + ' a ' + esc + 'x  →  ' +
      Math.round(usoW * 100) + '% x ' + Math.round(usoH * 100) + '%');
  });
  comprobar('nunca se ve menos del área mínima',
    J.pantalla.w >= 336 && J.pantalla.h >= 192, J.pantalla.w + 'x' + J.pantalla.h);

  /* El panel de encargos: se abre con TAB y marca lo ya resuelto.
     Vuelvo al modo de juego porque el panel no se abre sobre la pantalla
     final, que es donde quedó la partida simulada. */
  despejar();
  S7.modo('juego');
  tecla('Tab');
  comprobar('TAB abre la lista de encargos', el('pTareas').classList._v);
  const lista = el('listaTareas').innerHTML;
  comprobar('la lista trae los 5 encargos y el final',
    (lista.match(/class='tarea/g) || []).length === 6,
    (lista.match(/class='tarea/g) || []).length + ' entradas');
  comprobar('los encargos resueltos salen marcados',
    (lista.match(/tarea hecha/g) || []).length === 6, 'resueltos en esta partida');
  comprobar('la lista dice en qué sala está cada uno', /LABORATORIO DE DATOS|Laboratorio/i.test(lista));
  /* el título y el "dónde" tienen que ir en líneas separadas, no pegados */
  comprobar('el título y la ubicación no van pegados',
    /class='titulo'/.test(lista) && /class='donde'/.test(lista) &&
    /\.tarea \.titulo\{display:block/.test(fs.readFileSync(ruta.join(RAIZ, 'index.html'), 'utf8')));
  /* la tipografía no tiene mayúsculas acentuadas: no pueden llegar a pantalla */
  const acentosLista = (lista.match(/[À-Ý]/g) || []);
  comprobar('la lista no muestra mayúsculas acentuadas', acentosLista.length === 0,
    acentosLista.length ? acentosLista.join(' ') : 'limpio');
  comprobar('pero conserva los acentos en minúscula', /á|é|í|ó|ú|ñ/.test(lista),
    (lista.match(/[a-zá-úñ]*[áéíóúñ][a-zá-úñ]*/) || ['?'])[0]);
  tecla('Tab');
  comprobar('TAB vuelve a cerrarla', !el('pTareas').classList._v);

  /* Experiencia: sube al resolver y también por explorar. */
  comprobar('la experiencia acompaña al puntaje', S7.estado.xp >= S7.estado.puntos,
    S7.estado.xp + ' XP con ' + S7.estado.puntos + ' pts');
  comprobar('conocer gente suma experiencia',
    Object.keys(S7.estado.vistos).length > 0,
    Object.keys(S7.estado.vistos).length + ' personajes conocidos');

  /* leer una terminal suma una vez, y solo una */
  despejar(); S7.modo('juego');
  const antesXP = S7.estado.xp;
  const term = JUEGO.terminales[0];
  S7.jugador.x = (term[0] + 0.5) * S7.T; S7.jugador.y = (term[1] + 1.7) * S7.T;
  S7.jugador.dir = 'up';
  tick(); tecla('e'); tick();
  const trasLeer = S7.estado.xp;
  comprobar('leer una terminal suma experiencia', trasLeer > antesXP,
    '+' + (trasLeer - antesXP) + ' XP');
  despejar(); S7.modo('juego');
  tick(); tecla('e'); tick();
  comprobar('releerla no vuelve a sumar', S7.estado.xp === trasLeer, S7.estado.xp + ' XP');
  despejar();
  const tope = JUEGO.niveles[JUEGO.niveles.length - 1];
  const maxRetos = JUEGO.npcs.filter(n => n.reto).reduce((a, n) => a + n.reto.puntos, 0) +
                   JUEGO.retoFinal.puntos;
  const maxExplorar = JUEGO.npcs.length * JUEGO.xpExplorar.hablar +
                      JUEGO.terminales.length * JUEGO.xpExplorar.terminal;
  comprobar('el rango máximo es alcanzable', tope.xp <= maxRetos + maxExplorar,
    'tope ' + tope.xp + ' XP, máximo posible ' + (maxRetos + maxExplorar));
  comprobar('el rango máximo exige además explorar', tope.xp > maxRetos,
    'resolver todo da ' + maxRetos + ' XP');


  /* --------------------------------------------- 5. teclado ------------- */
  titulo('TECLADO');
  let bloqueada = false;
  J.oyentesVentana.keydown.forEach(f =>
    f({ key: 'a', target: el('inNombreEquipo'), preventDefault() { bloqueada = true; } }));
  comprobar('se puede escribir W A S D en un campo de texto', !bloqueada);

  let bloqueadaEditor = false;
  J.oyentesVentana.keydown.forEach(f =>
    f({ key: 'w', target: { tagName: 'TEXTAREA' }, preventDefault() { bloqueadaEditor = true; } }));
  comprobar('se puede escribir W A S D en el editor de código', !bloqueadaEditor);

  S7.modo('reto'); el('pReto').classList.add('visible');
  tecla('Escape', el('editor'));
  comprobar('Esc cierra el reto con el cursor en el editor', !el('pReto').classList._v);

  console.log(fallos ? '\n>>> ' + fallos + ' FALLAS' : '\n>>> Todo en orden.');
  process.exit(fallos ? 1 : 0);
}

principal().catch(e => { console.error('\nLa prueba se rompió:', e); process.exit(1); });
