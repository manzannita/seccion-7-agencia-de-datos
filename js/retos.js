/* =============================================================================
   SECCIÓN 7 — retos.js
   HISTORIA, PERSONAJES Y RETOS. Es el único archivo que necesitan tocar los
   organizadores: el motor no hay que entenderlo.

   LOS EQUIPOS ESCRIBEN PYTHON. El intérprete corre dentro del navegador.

   ---------------------------------------------------------------------------
   UN PERSONAJE SE VE ASÍ:

     {
       id: "oro",                      identificador único
       nombre: "Bruno Oro",
       sala: "servidores",             solo informativo, para ubicarse
       x: 12, y: 24, dir: "down",      posición en casillas
       pelo: "#c96a2c", ropa: "#2e8f6e", piel: "#f0c39c",
       sprite: "sprites/oro.png",      OPCIONAL: reemplaza al dibujo por código
       retrato: "sprites/oro-cara.png",OPCIONAL: cara en la caja de diálogo
       dialogos: { intro:[], pendiente:[], resuelto:[] },
       reto: { ... }
     }

   SPRITES PROPIOS: ver sprites/LEEME.md. Si el PNG falta, el motor dibuja al
   personaje por código y el juego sigue andando.

   UN RETO DE CÓDIGO SE VE ASÍ:

     reto: {
       titulo, puntos, enunciado,
       funcion: "contar_unicos",       nombre exacto que deben definir
       plantilla: "def contar_unicos(...):\n    ...",   con esto arranca el editor
       casos: [ { entrada: [arg1, arg2], salida: esperado } ],
       casosOcultos: [ ... ]           iguales, pero no se muestran
       pista
     }

   OJO CON LOS VALORES: `entrada` y `salida` se escriben en JavaScript y se
   traducen solas a Python.  null -> None,  true -> True,  [] -> list,
   {} -> dict.  Evita casos que dependan de redondeos a la mitad exacta:
   Python redondea round(4.5) a 4, no a 5.

   TAMBIÉN HAY RETOS DE RESPUESTA ESCRITA: en vez de `funcion`/`casos` pon
   `respuestaHash` (genérala en herramientas/hash.html) o `respuesta`.
   ========================================================================== */

const JUEGO = {

  titulo: "SECCIÓN 7 — Agencia de Datos",

  intro: [
    "Adelante, {equipo}. Cierren la puerta.",
    "A las 03:14 el ÍNDICE CENTRAL de la Agencia se corrompió. Es el catálogo que dice dónde está cada dato del edificio.",
    "Sin él, Servidores no encuentra sus registros, Redes no sabe qué máquina habla con cuál, y la Bóveda no puede leer un solo mensaje.",
    "Cada departamento guarda una CREDENCIAL. Las cinco juntas abren la compuerta del Núcleo, donde vive el Índice.",
    "Pero nadie entrega su credencial gratis: van a tener que resolverles el problema que tienen atascado.",
    "Escriban Python de verdad. Hay una terminal en cada sala.",
    "El edificio es suyo. Muévanse."
  ],

  final: [
    "El Índice vuelve a levantarse. Uno por uno, los departamentos recuperan sus archivos.",
    "La Sección 7 recordará al escuadrón {equipo}."
  ],

  /* =========================== PERSONAJES =========================== */
  npcs: [

    /* ---- Recepción: la directora. Da la bienvenida y orienta. ---- */
    {
      id: "vega",
      nombre: "Directora Vega",
      sala: "recepcion",
      x: 28, y: 32, dir: "down",
      pelo: "#d8d8e2", ropa: "#7b4fc4", piel: "#c99878",
      guia: true,
      dialogos: {
        pendiente: [
          "Todavía faltan credenciales, {equipo}.",
          "Servidores queda al oeste por el pasillo largo. Redes, al este.",
          "Arriba a la izquierda está el Laboratorio: pregunten por Annabella, que es la que sostiene esa sala. Arriba a la derecha, la Bóveda de Cifrado.",
          "El Archivo está detrás de Servidores, bajando. Si se traban con un problema, pasen al siguiente y vuelvan."
        ],
        resuelto: [
          "Las cinco credenciales. No pensé que lo lograrían tan rápido.",
          "Suban por el pasillo central. La compuerta del Núcleo ya los reconoce.",
          "Lo que hay adentro es el Índice. Reconstrúyanlo."
        ]
      }
    },

    /* ---------------------------- RETO 1 ---------------------------- */
    {
      id: "oro",
      nombre: "Bruno Oro",
      sala: "servidores",
      x: 12, y: 24, dir: "down",
      pelo: "#3a2a1e", ropa: "#c0432f", piel: "#e0b088",
      dialogos: {
        intro: [
          "¡Bienvenidos a Servidores! Cuidado con los cables, que aquí abajo hace frío por algo.",
          "Miren esto: desde que cayó el Índice, cada máquina reporta sus registros DUPLICADOS. A veces triplicados.",
          "Necesito saber cuántos registros distintos hay de verdad. Escríbanme la función y la credencial es suya."
        ],
        pendiente: [ "Distintos, Bruno, DISTINTOS. Si el mismo identificador aparece cinco veces, cuenta como uno." ],
        resuelto: [ "¡Ahí está el número real! Tomen la credencial de Servidores. Y no toquen el rack tres." ]
      },
      reto: {
        titulo: "Registros duplicados",
        puntos: 100,
        enunciado: "Cada máquina manda una lista de identificadores de registro, pero muchos vienen repetidos. Devuelve CUÁNTOS IDENTIFICADORES DISTINTOS hay en la lista.",
        funcion: "contar_unicos",
        plantilla:
          "def contar_unicos(registros):\n" +
          "    # registros es una lista de textos, por ejemplo [\"A1\", \"B2\", \"A1\"]\n" +
          "    # devuelve cuántos valores distintos contiene\n" +
          "    pass\n",
        casos: [
          { entrada: [["A1", "B2", "A1", "C3"]], salida: 3 },
          { entrada: [[]], salida: 0 },
          { entrada: [["X", "X", "X"]], salida: 1 }
        ],
        casosOcultos: [
          { entrada: [["a", "b", "c", "d", "b", "a"]], salida: 4 },
          { entrada: [["1", "2", "3"]], salida: 3 }
        ],
        pista: "Un set guarda cada valor una sola vez: len(set(registros)). También sirve recorrer la lista con una lista aparte y agregar solo lo que todavía no está."
      }
    },

    /* ---------------------------- RETO 2 ----------------------------
       Annabella usa arte propio: sprites/annabella.png para el mundo y
       sprites/annabella-cara.png para la caja de diálogo. Los campos pelo,
       ropa, piel, lentes y pelolargo quedan como respaldo por si algún día
       falta el PNG: el motor dibuja el personaje y el juego no se rompe. */
    {
      id: "anna",
      nombre: "Annabella",
      sala: "laboratorio",
      x: 11, y: 11, dir: "down",
      sprite: "sprites/annabella.png",
      retrato: "sprites/annabella-cara.png",
      pelo: "#2e2e3c", ropa: "#23232d", piel: "#eeb897",
      lentes: true, pelolargo: true,
      dialogos: {
        intro: [
          "¡Hola! Pasen, pasen. Cuidado con el cable ese, que lleva tres días así.",
          "Soy Annabella, la ayudante del Laboratorio. Aunque desde el fallo, ayudante de todo el mundo.",
          "Miren: los sensores del edificio mandan una lectura por minuto. Desde las 03:14 vienen sucias, con None y valores negativos que no existen en la vida real.",
          "Necesito el promedio de las lecturas que SÍ sirven. Si me lo resuelven, la credencial del Laboratorio es suya.",
          "Y si se traban, vuelvan y lo pensamos juntas. Para eso estoy."
        ],
        pendiente: [
          "Repasemos: válida es que sea número y que no sea negativa.",
          "El None no cuenta, el -5 tampoco. Y ojo con dividir cuando no queda ninguna: ahí devuelvan 0 antes de hacer la cuenta."
        ],
        resuelto: [
          "¡Eso es una señal limpia! Mírenla, por fin se entiende algo.",
          "La credencial del Laboratorio, firmada. Y si necesitan una mano en otra sala, ya saben dónde encontrarme."
        ]
      },
      reto: {
        titulo: "Señal en el ruido",
        puntos: 150,
        enunciado: "La lista trae lecturas de un sensor. Algunas son None y otras son negativas: esas están corruptas y se descartan. Devuelve el PROMEDIO de las lecturas válidas, redondeado con round(). Si no queda ninguna válida, devuelve 0.",
        funcion: "promedio_valido",
        plantilla:
          "def promedio_valido(lecturas):\n" +
          "    # lecturas trae numeros, negativos y None mezclados\n" +
          "    # descarta None y negativos, promedia el resto y redondea\n" +
          "    pass\n",
        casos: [
          { entrada: [[10, null, 20, -5, 30]], salida: 20 },
          { entrada: [[null, null]], salida: 0 },
          { entrada: [[4, 5, 6]], salida: 5 }
        ],
        casosOcultos: [
          { entrada: [[0, 0, 0]], salida: 0 },
          { entrada: [[7, -1, null, 8, 9]], salida: 8 }
        ],
        pista: "Filtra primero: v is not None and v >= 0. Ojo con dividir por cero cuando no queda ninguna lectura buena: ahí hay que devolver 0 antes de dividir."
      }
    },

    /* ---------------------------- RETO 3 ---------------------------- */
    {
      id: "noa",
      nombre: "Criptógrafa Noa",
      sala: "boveda",
      x: 44, y: 10, dir: "down",
      pelo: "#6b3fa0", ropa: "#2f6f9e", piel: "#8a5f42",
      dialogos: {
        intro: [
          "Pasen. Y bajen la voz: aquí adentro todo lo que se dice queda grabado.",
          "La Bóveda guarda los mensajes internos cifrados. Antes el Índice sabía qué desplazamiento usaba cada uno.",
          "Ahora tengo miles de mensajes y ninguna forma automática de leerlos. Escríbanme el descifrador."
        ],
        pendiente: [ "Recuerden: si el mensaje se cifró corriendo las letras hacia adelante, hay que correrlas hacia atrás. Y después de la A se vuelve a la Z." ],
        resuelto: [ "Funciona con los miles. Credencial de la Bóveda. No repitan lo que leyeron ahí dentro." ]
      },
      reto: {
        titulo: "Descifrar el mensaje",
        puntos: 150,
        enunciado: "Los mensajes están cifrados con el método César: cada letra fue reemplazada por la que está N lugares más adelante en el abecedario. Devuelve el texto original. Todo viene en MAYÚSCULAS sin Ñ ni tildes; los espacios y signos se dejan tal cual.",
        funcion: "descifrar",
        plantilla:
          "def descifrar(texto, desplazamiento):\n" +
          "    # texto viene en MAYÚSCULAS, por ejemplo \"FRGLJR\"\n" +
          "    # desplazamiento es cuántos lugares se corrió cada letra\n" +
          "    # devuelve el texto original\n" +
          "    pass\n",
        casos: [
          { entrada: ["FRGLJR VHFUHWR", 3], salida: "CODIGO SECRETO" },
          { entrada: ["ABC", 1], salida: "ZAB" },
          { entrada: ["HOLA", 0], salida: "HOLA" }
        ],
        casosOcultos: [
          { entrada: ["MJQQT", 5], salida: "HELLO" },
          { entrada: ["EBUPT EF WVFMP", 1], salida: "DATOS DE VUELO" }
        ],
        pista: "ord(letra) te da el número de la letra (ord('A') es 65) y chr() hace lo contrario. Resta el desplazamiento y usa % 26 para volver al final del abecedario: chr((ord(c) - 65 - d) % 26 + 65)."
      }
    },

    /* ---------------------------- RETO 4 ---------------------------- */
    {
      id: "rut",
      nombre: "Ingeniera Rut",
      sala: "redes",
      x: 45, y: 23, dir: "down",
      pelo: "#2b2b3f", ropa: "#1fb8d4", piel: "#e8c4a0",
      dialogos: {
        intro: [
          "Bienvenidos a Redes. Ese mapa de la pared era el mapa del edificio. Ahora es un adorno.",
          "Tengo la lista de qué máquina está conectada con cuál, pero perdí la herramienta que calculaba distancias.",
          "Díganme en cuántos SALTOS se llega de una máquina a otra. Es lo único que necesito."
        ],
        pendiente: [ "Saltos, no cables recorridos. Y si no hay forma de llegar, quiero un -1, no un error." ],
        resuelto: [ "Con eso vuelvo a ver la red entera. Credencial de Redes, y gracias." ]
      },
      reto: {
        titulo: "Saltos mínimos",
        puntos: 200,
        enunciado: "Te doy las conexiones de la red como pares de máquinas. Las conexiones funcionan en los dos sentidos. Devuelve el MÍNIMO NÚMERO DE SALTOS para ir de origen a destino. Si la máquina es la misma, son 0 saltos. Si no hay camino, devuelve -1.",
        funcion: "saltos_minimos",
        plantilla:
          "def saltos_minimos(conexiones, origen, destino):\n" +
          "    # conexiones es una lista de pares, por ejemplo [[\"A\",\"B\"], [\"B\",\"C\"]]\n" +
          "    # devuelve la cantidad mínima de saltos de origen a destino, o -1\n" +
          "    pass\n",
        casos: [
          { entrada: [[["A", "B"], ["B", "C"], ["C", "D"], ["A", "D"]], "A", "C"], salida: 2 },
          { entrada: [[["A", "B"]], "A", "A"], salida: 0 },
          { entrada: [[["A", "B"], ["C", "D"]], "A", "D"], salida: -1 }
        ],
        casosOcultos: [
          { entrada: [[["S", "1"], ["1", "2"], ["2", "T"], ["S", "3"], ["3", "T"]], "S", "T"], salida: 2 },
          { entrada: [[["A", "B"], ["B", "C"], ["C", "D"], ["D", "E"]], "A", "E"], salida: 4 }
        ],
        pista: "Explora por capas: primero los vecinos del origen (1 salto), después los vecinos de esos (2 saltos)... El primero que llegue al destino gana. Se arma un diccionario de vecinos y se usa una lista como cola, con un set de visitados."
      }
    },

    /* ---------------------------- RETO 5 ---------------------------- */
    {
      id: "diaz",
      nombre: "Archivista Díaz",
      sala: "archivo",
      x: 10, y: 35, dir: "down",
      pelo: "#8a8a99", ropa: "#5a5f7a", piel: "#d8a878",
      dialogos: {
        intro: [
          "Shhh. Aquí abajo se guarda lo que ya nadie consulta. Hasta hoy.",
          "Todo expediente se archiva por duplicado: uno en la sala A y otro en la B. Es la regla desde que existe la Agencia.",
          "Pero hay uno solo, sin copia. Ese es el que el Índice estaba escondiendo. Encuéntrenlo."
        ],
        pendiente: [ "Todos vienen de a dos. Uno viene solo. Ese." ],
        resuelto: [ "Ahí estaba, después de treinta años. Tomen la credencial del Archivo." ]
      },
      reto: {
        titulo: "El expediente sin pareja",
        puntos: 150,
        enunciado: "En la lista de códigos de expediente, todos aparecen exactamente DOS veces menos uno, que aparece una sola vez. Devuelve ese código.",
        funcion: "sin_pareja",
        plantilla:
          "def sin_pareja(codigos):\n" +
          "    # codigos es una lista de números; todos van de a pares menos uno\n" +
          "    # devuelve el que no tiene pareja\n" +
          "    pass\n",
        casos: [
          { entrada: [[7, 3, 5, 4, 3, 4, 8, 7, 5]], salida: 8 },
          { entrada: [[1, 1, 2]], salida: 2 },
          { entrada: [[42]], salida: 42 }
        ],
        casosOcultos: [
          { entrada: [[9, 2, 9, 4, 2]], salida: 4 },
          { entrada: [[100, 200, 100, 300, 200]], salida: 300 }
        ],
        pista: "Se puede contar cuántas veces aparece cada uno con codigos.count(c). Pero hay un truco de una línea: el XOR (^) de todos los números deja justo al que no tiene pareja, porque a ^ a = 0."
      }
    },

    /* ---- Cafetería: personaje de ambiente, sin reto ---- */
    {
      id: "beto",
      nombre: "Beto, de la cafetería",
      sala: "cafeteria",
      x: 44, y: 34, dir: "down",
      pelo: "#4a3020", ropa: "#d18f1c", piel: "#b8845c",
      guia: true,
      dialogos: {
        pendiente: [
          "¿Café? Es lo único del edificio que no depende del Índice.",
          "Consejo gratis: cuando un problema no sale, no insistan de frente. Bajen a otra sala, hablen con otro, y vuelvan.",
          "Funciona con el código y funciona con casi todo."
        ],
        resuelto: [
          "Así que lo lograron. Sabía que ese escuadrón tenía algo.",
          "La casa invita. Suban al Núcleo, que los están esperando."
        ]
      }
    }
  ],

  /* ====================== RETO FINAL: EL NÚCLEO ====================== */
  retoFinal: {
    guardian: "EL ÍNDICE",
    titulo: "Reconstruir el Índice",
    puntos: 300,
    dialogos: {
      bloqueado: [
        "La compuerta no cede.",
        "Cinco ranuras vacías parpadean en rojo sobre el blindaje."
      ],
      intro: [
        "Las cinco credenciales entran a la vez. El blindaje se abre sin ruido.",
        "Adentro no hay nadie: solo una columna de luz y una consola encendida.",
        "En la pantalla hay una sola línea: «reconstruir indice — esperando funcion»."
      ],
      pendiente: [ "La consola sigue esperando. «reconstruir indice — esperando funcion»." ]
    },
    enunciado: "El Índice agrupa los registros de todo el edificio por área. Te doy la lista completa de registros, cada uno con su área y su id. Devuelve una lista con un diccionario {\"area\": ..., \"total\": ...} por cada área, ordenada alfabéticamente por área.",
    funcion: "indice",
    plantilla:
      "def indice(registros):\n" +
      "    # registros: [{\"area\": \"redes\", \"id\": 1}, {\"area\": \"datos\", \"id\": 2}, ...]\n" +
      "    # devuelve:  [{\"area\": \"datos\", \"total\": 1}, {\"area\": \"redes\", \"total\": 1}, ...]\n" +
      "    # ordenada alfabéticamente por area\n" +
      "    pass\n",
    casos: [
      { entrada: [[{ area: "redes", id: 1 }, { area: "datos", id: 2 }, { area: "redes", id: 3 }]],
        salida: [{ area: "datos", total: 1 }, { area: "redes", total: 2 }] },
      { entrada: [[]], salida: [] }
    ],
    casosOcultos: [
      { entrada: [[{ area: "b", id: 1 }, { area: "a", id: 2 }, { area: "a", id: 3 }, { area: "c", id: 4 }, { area: "a", id: 5 }]],
        salida: [{ area: "a", total: 3 }, { area: "b", total: 1 }, { area: "c", total: 1 }] }
    ],
    pista: "Cuenta primero en un diccionario: conteo[r[\"area\"]] = conteo.get(r[\"area\"], 0) + 1. Después sorted(conteo) te da las áreas en orden, y con una comprensión de lista armas los diccionarios."
  },

  /* Terminales de pared que se pueden leer: [x, y, texto] */
  terminales: [
    [28, 20, "PASILLO CENTRAL\nNorte: Núcleo (restringido)\nSur: Recepción"],
    [10, 25, "SALA DE SERVIDORES\nTemperatura: 18°C\nRacks activos: 22/24"],
    [30, 25, "AVISO\nEl Índice central no responde.\nTicket #0314 sin asignar."],
    [44, 6,  "BÓVEDA DE CIFRADO\nNivel de acceso: 3\nMensajes sin descifrar: 9.412"]
  ]
};
