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
  /* ------------------------------------- 2b. pandas --------------------- */
  titulo('PANDAS');

  /* El codigo Python se arma juntando lineas, sin escapes de salto: es
     demasiado facil que un editor los coma y el error aparece lejos. */
  const NL = String.fromCharCode(10);
  const py = (...lineas) => lineas.join(NL) + NL;

  const TABLA = [
    { area: 'redes', id: 1, ok: true },
    { area: 'datos', id: 2, ok: false },
    { area: 'redes', id: 3, ok: true }
  ];
  const ESPERADO = [{ area: 'datos', total: 1 }, { area: 'redes', total: 2 }];

  /* con comoDataFrame los argumentos llegan ya convertidos */
  r = await EJ.ejecutar(py(
    'def resumen(tabla):',
    '    r = tabla.groupby("area", as_index=False)["id"].count()',
    '    return r.rename(columns={"id": "total"}).sort_values("area")'),
    'resumen', [{ entrada: [TABLA], salida: ESPERADO }], true);
  comprobar('un reto recibe la tabla ya como DataFrame',
    r.resultados && r.resultados[0].paso, r.error || (r.resultados && r.resultados[0].obtenido));

  /* y el mismo reto se puede resolver sin pandas: solo importa lo devuelto */
  r = await EJ.ejecutar(py(
    'def resumen(tabla):',
    '    conteo = {}',
    '    for fila in tabla.to_dict("records"):',
    '        conteo[fila["area"]] = conteo.get(fila["area"], 0) + 1',
    '    return [{"area": a, "total": conteo[a]} for a in sorted(conteo)]'),
    'resumen', [{ entrada: [TABLA], salida: ESPERADO }], true);
  comprobar('el mismo reto vale resuelto con un bucle',
    r.resultados && r.resultados[0].paso, r.error || (r.resultados && r.resultados[0].obtenido));

  /* una Series se compara contra un diccionario */
  r = await EJ.ejecutar(py(
    'def por_area(tabla):',
    '    return tabla.groupby("area")["id"].count()'),
    'por_area', [{ entrada: [TABLA], salida: { datos: 1, redes: 2 } }], true);
  comprobar('una Series se compara contra un diccionario',
    r.resultados && r.resultados[0].paso, r.error || (r.resultados && r.resultados[0].obtenido));

  /* los numeros de numpy valen como numeros de Python */
  r = await EJ.ejecutar(py(
    'def cuantos(tabla):',
    '    return tabla["id"].sum()'),
    'cuantos', [{ entrada: [TABLA], salida: 6 }], true);
  comprobar('un entero de numpy vale como entero',
    r.resultados && r.resultados[0].paso, r.error || (r.resultados && r.resultados[0].obtenido));

  /* sin la bandera, la funcion recibe la lista de diccionarios tal cual */
  r = await EJ.ejecutar(py(
    'def cuantos(registros):',
    '    return len(registros)'),
    'cuantos', [{ entrada: [TABLA], salida: 3 }]);
  comprobar('sin la bandera llega una lista de diccionarios',
    r.resultados && r.resultados[0].paso, r.error);

  /* la forma compacta de tabla: columnas una vez, filas como filas */
  const TABLA_COMPACTA = {
    columnas: ['area', 'maquina', 'errores'],
    filas: [['redes', 'M1', 3], ['datos', 'M2', 0], ['redes', 'M3', 5],
            ['boveda', 'M4', 7], ['datos', 'M5', 2], ['boveda', 'M6', 1]]
  };
  r = await EJ.ejecutar(py(
    'def peores(tabla):',
    '    con_fallas = tabla[tabla["errores"] > 0]',
    '    t = con_fallas.groupby("area", as_index=False)["errores"].sum()',
    '    return t.sort_values("errores", ascending=False).head(2)'),
    'peores', [{ entrada: [TABLA_COMPACTA],
                 salida: [{ area: 'boveda', errores: 8 }, { area: 'redes', errores: 8 }] }], true);
  comprobar('una tabla en forma compacta llega como DataFrame',
    r.resultados && r.resultados[0].paso, r.error || (r.resultados && r.resultados[0].obtenido));
  comprobar('  y en pantalla se muestra resumida, no fila por fila',
    /<tabla de 6 filas/.test((r.resultados && r.resultados[0].entrada) || ''),
    (r.resultados && r.resultados[0].entrada) || '');

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


  /* ---------------------------- 4d. registro de resultados -------------- */
  titulo('REGISTRO DE RESULTADOS');

  const R = CQ.registro;
  const conf = fs.readFileSync(ruta.join(RAIZ, 'js', 'config.js'), 'utf8');
  const configurado = /URL:\s*"https/.test(conf);
  comprobar('el registro sabe si hay configuración', R.activo() === configurado,
    configurado ? 'configurado' : 'sin configurar, se juega en local');

  /* La clave que se publica tiene que ser la anon. La service_role lee y borra
     todo, y va dentro de una página que cualquiera puede abrir. */
  const tok = (conf.match(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/) || [])[0];
  if (tok) {
    let carga = tok.split('.')[1];
    while (carga.length % 4) carga += '=';
    const rol = JSON.parse(Buffer.from(carga, 'base64').toString()).role;
    comprobar('la clave publicada es anon, no service_role', rol === 'anon', 'rol: ' + rol);
  }

  /* Lo esencial: SIN RED el juego tiene que seguir. En las pruebas fetch
     siempre falla, así que este camino es justo el del wifi caído. */
  let reventó = false;
  try {
    R.anotarIntento({ equipo: 'X', reto: 'oro', codigo: 'x = 1', paso: true,
                      pasados: 5, total: 5, puntos: 100, segundos: 42 });
    R.recuperarEquipo();
  } catch (e) { reventó = true; }
  comprobar('anotar un intento sin red no rompe nada', !reventó);

  const idEquipo = await R.abrirEquipo('Equipo de prueba');
  comprobar('sin red, el equipo igual recibe su identificador y juega',
    configurado ? (typeof idEquipo === 'string' && idEquipo.length > 10) : idEquipo === null,
    String(idEquipo).slice(0, 20));

  if (configurado) {
    const cola = JSON.parse(J.disco['seccion7-cola-envios'] || '[]');
    comprobar('lo que no se pudo enviar queda en cola para reintentar',
      cola.length > 0, cola.length + ' filas esperando');
  }

  /* El esquema y el cliente tienen que hablar de las mismas columnas. */
  const sql = fs.readFileSync(ruta.join(RAIZ, 'herramientas', 'supabase.sql'), 'utf8');
  const cliente = fs.readFileSync(ruta.join(RAIZ, 'js', 'registro.js'), 'utf8');
  const columnas = ['equipo_id', 'equipo_nombre', 'reto', 'funcion', 'codigo', 'paso',
                    'pasados', 'total', 'error', 'puntos', 'pista_usada', 'segundos'];
  const faltantes = columnas.filter(c => !sql.includes(c) || !cliente.includes(c));
  comprobar('el esquema y el cliente usan las mismas columnas', faltantes.length === 0,
    faltantes.length ? 'faltan: ' + faltantes.join(', ') : columnas.length + ' columnas');

  /* LA REGLA QUE IMPORTA, y que el sabotaje no puede romper: el código que
     escriben los equipos vive en `intentos`, y esa tabla no se lee jamás
     desde el juego. Los nombres de equipo y los ataques sí, porque hacen
     falta para elegir objetivo y para recibir el estorbo. */
  comprobar('la tabla del código NUNCA se abre a los equipos',
    !/grant[^;]*select[^;]*on table intentos[^;]*to anon/i.test(sql) &&
    !/policy[^;]*on intentos[\s\S]{0,80}for select to anon/i.test(sql),
    'intentos queda cerrada');
  comprobar('  y lo que sí se abre son solo nombres y ataques',
    /grant select on table equipos to anon/i.test(sql) &&
    /grant select, insert on table sabotajes to anon/i.test(sql));
  comprobar('las tres tablas tienen seguridad por fila activada',
    (sql.match(/enable row level security/gi) || []).length === 3,
    (sql.match(/enable row level security/gi) || []).length + ' tablas');
  comprobar('los privilegios son explícitos, no heredados de la configuración',
    /grant insert on table equipos/i.test(sql) && /grant insert on table intentos/i.test(sql));
  /* Quitar permisos de uno en uno no basta: Supabase concede un paquete que
     incluye TRUNCATE, y con eso un equipo podría vaciar los resultados de
     todos. Hay que revocar TODO y devolver solo INSERT. */
  comprobar('se revocan TODOS los permisos antes de conceder',
    /revoke all on table equipos\s+from anon, authenticated/i.test(sql) &&
    /revoke all on table intentos\s+from anon, authenticated/i.test(sql));
  comprobar('  no queda ningún revoke parcial, que dejaría TRUNCATE',
    !/revoke\s+select,\s*update,\s*delete/i.test(sql));
  /* La prueba tiene que mirar A QUIÉN se concede: el panel sí necesita leer,
     los equipos no. Sin el rol en la comprobación, cualquier permiso nuevo
     para el panel la haría fallar sin motivo. */
  const aAnon = (sql.match(/grant\s+[a-z, ]+on table (\w+)\s+to anon/gi) || []);
  const conLectura = aAnon.filter(g => /select/i.test(g))
                          .map(g => (g.match(/on table (\w+)/i) || [])[1]);
  comprobar('  ninguna concesión de lectura toca la tabla del código',
    conLectura.indexOf('intentos') < 0,
    'con lectura: ' + (conLectura.join(', ') || 'ninguna'));
  comprobar('la vista del marcador no queda legible para los equipos',
    /revoke all on marcador from anon/i.test(sql));
  /* Con "Automatically expose new tables" desmarcada, Supabase no concede
     permisos a NINGÚN rol. Si solo se le dan a anon, el panel no puede leer. */
  comprobar('el panel sí puede leer las dos tablas',
    /grant select on table equipos\s+to service_role/i.test(sql) &&
    /grant select on table intentos\s+to service_role/i.test(sql));
  comprobar('el cliente no lee nada de la base',
    !/return=representation/.test(cliente) && !/select=/.test(cliente),
    'el id del equipo se genera en el navegador');

  /* El panel usa la clave que lee todo: no puede publicarse. */
  const flujo = fs.readFileSync(ruta.join(RAIZ, '.github', 'workflows', 'desplegar.yml'), 'utf8');
  comprobar('el despliegue rechaza una clave service_role', /service_role/.test(flujo));
  /* El panel ya se puede publicar porque no lleva claves: entra con usuario y
     contraseña. Lo que hay que vigilar es justamente eso. */
  const panel = fs.readFileSync(ruta.join(RAIZ, 'herramientas', 'panel.html'), 'utf8');
  comprobar('el panel no menciona la clave de administrador',
    !/service_role/.test(panel));
  comprobar('el panel entra con usuario y contraseña',
    /grant_type=password/.test(panel) && /auth\/v1\/token/.test(panel));
  comprobar('el despliegue rechaza un panel con clave de administrador',
    /grep -q "service_role" _sitio\/panel/.test(flujo));

  /* La lista blanca: no basta con estar autenticado, hay que estar en ella. */
  comprobar('leer exige estar en la lista de organizadores',
    /using \(es_organizador\(\)\)/.test(sql) &&
    (sql.match(/using \(es_organizador\(\)\)/g) || []).length === 2);
  comprobar('la lista de organizadores no se puede consultar desde la API',
    /revoke all on table organizadores from anon, authenticated/i.test(sql));
  comprobar('la vista respeta las reglas de quien consulta',
    /security_invoker = true/.test(sql),
    'sin esto, cualquier registrado vería el marcador');


  /* ------------------------------ 4e. sabotajes ------------------------- */
  titulo('SABOTAJES');

  const SB = CQ.sabotaje;
  comprobar('hay catálogo de sabotajes', SB.CATALOGO.length >= 3,
    SB.CATALOGO.map(o => o.tipo).join(', '));

  /* La regla de diseño: estorban el recorrido, no el trabajo. Si algún efecto
     tocara el editor o el código, un equipo podría perder veinte minutos de
     trabajo por un ataque, y eso no es competir. */
  const juego = fs.readFileSync(ruta.join(RAIZ, 'js', 'juego.js'), 'utf8');
  const efectos = SB.CATALOGO.map(o => o.tipo);
  comprobar('los efectos solo estorban el mundo, no el editor',
    efectos.every(t => ['apagon', 'compuertas', 'interferencia'].indexOf(t) >= 0),
    efectos.join(', '));
  /* Un estorbo sin explicación se lee como un fallo del juego, y entonces la
     culpa se la lleva el juego en vez del rival. */
  comprobar('a quien lo recibe se le dice quién fue',
    /SABOTAJE DE/.test(juego) && /de_nombre/.test(juego));
  comprobar('  con un aviso distinto al de las buenas noticias',
    /"alarma"/.test(juego) && /#logro\.alarma/.test(
      fs.readFileSync(ruta.join(RAIZ, 'index.html'), 'utf8')));
  comprobar('  y un contador en pantalla mientras dura',
    /\$\("estorbo"\)/.test(juego) && /Math\.ceil\(e\.hasta - tiempoTotal\)/.test(juego));

  comprobar('  ningún efecto toca el editor ni el código escrito',
    !/estorbo[\s\S]{0,200}editor\.(poner|leer)/.test(juego) &&
    !/sabotajeActivo\(\)[\s\S]{0,120}borradores/.test(juego));

  /* Quién cuenta los ataques disponibles: el servidor. Si lo decidiera el
     navegador, bastarían las herramientas de desarrollo para tener infinitos. */
  comprobar('el servidor comprueba que el sabotaje esté ganado',
    /create trigger sabotajes_solo_ganados/i.test(sql) &&
    /Sin sabotajes disponibles/i.test(sql));
  comprobar('  y prohíbe sabotearse a uno mismo',
    /no puede sabotearse a si mismo/i.test(sql));

  /* Sin conexión, el sabotaje se apaga y el juego sigue igual. */
  let rompió = false;
  try {
    const lista = await SB.equipos('x');
    const n = await SB.disponibles('x', 3);
    comprobar('sin red, el sabotaje no rompe el juego',
      Array.isArray(lista) && lista.length === 0 && n === 0);
  } catch (e) { rompió = true; }
  comprobar('  y no lanza excepciones', !rompió);


  /* -------------------------- 4f. aplicar el esquema -------------------- */
  titulo('APLICAR EL ESQUEMA');

  const aplicador = fs.readFileSync(ruta.join(RAIZ, 'herramientas', 'aplicar_sql.py'), 'utf8');

  /* La contraseña de la base no puede acabar en el repositorio jamás. */
  const ignorados = fs.readFileSync(ruta.join(RAIZ, '.gitignore'), 'utf8');
  comprobar('la cadena de conexión está fuera del repositorio',
    /herramientas\/\.conexion/.test(ignorados));
  comprobar('  y el aplicador no la escribe en pantalla',
    /getpass/.test(aplicador) && !/print\(cad/.test(aplicador));

  /* El troceador tuvo un fallo grave: descartaba los trozos que empezaban por
     comentario, y con ellos el SQL que llevaban detrás. Aplicaba el esquema a
     medias y en silencio. Esta prueba comprueba que no se pierde nada. */
  const sqlTexto = fs.readFileSync(ruta.join(RAIZ, 'herramientas', 'supabase.sql'), 'utf8');
  const imprescindibles = [
    'create table if not exists equipos', 'create table if not exists intentos',
    'create table if not exists sabotajes', 'create table if not exists organizadores',
    'create or replace function sabotaje_ganado', 'create or replace function es_organizador',
    'create trigger sabotajes_solo_ganados', 'create or replace view marcador'
  ];
  const ausentes = imprescindibles.filter(c => sqlTexto.indexOf(c) < 0);
  comprobar('el esquema tiene todas las piezas', ausentes.length === 0,
    ausentes.length ? 'faltan: ' + ausentes.join(', ') : imprescindibles.length + ' piezas');
  comprobar('  el aplicador respeta los cuerpos de función',
    /\$\$/.test(aplicador) && /dentro = not dentro/.test(aplicador));
  comprobar('  y no descarta los trozos que empiezan por comentario',
    /tiene_sql/.test(aplicador) && !/texto\.startswith\("--"\)/.test(aplicador));

  /* Guardar sin comprobar dejaba el archivo envenenado: con un valor malo
     dentro, todas las corridas siguientes fallaban igual y ya no preguntaba. */
  comprobar('la cadena se comprueba ANTES de guardarla',
    aplicador.indexOf('def revisar(') < aplicador.indexOf('f.write(cad)') &&
    /motivo = revisar\(cad\)/.test(aplicador));
  comprobar('  y si la guardada no sirve, la pide otra vez',
    /La cadena guardada no sirve/.test(aplicador) && /os\.remove\(GUARDADO\)/.test(aplicador));
  comprobar('  avisa de que lo pegado no se ve',
    /NO se vera en pantalla/.test(aplicador));


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
