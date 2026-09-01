# Prompt para escribir retos nuevos

Este archivo tiene dos cosas: **el prompt** para pegar en un asistente de IA, y
la explicación de por qué está escrito así. Si solo quieres generar retos,
copia el bloque de la sección 2 y rellena lo que está entre `<< >>`.

---

## 1. Antes de empezar: el presupuesto de tiempo

La competencia dura **90 minutos en total** para los seis retos. Pero los
equipos no pasan ese tiempo escribiendo código: caminan por el edificio, leen
enunciados, discuten y se equivocan. El tiempo de teclado real es más o menos
la mitad.

Reparto que funciona, como escalera de pandas:

| # | Rol | Minutos | Qué debe ejercitar |
|---|---|---|---|
| 1 | leer y filtrar | 5–8 | seleccionar columnas, filtrar por una condición |
| 2 | agregar | 10 | sum, mean, count sobre una columna |
| 3 | agrupar | 12 | groupby de una columna + una agregación |
| 4 | limpiar | 15 | nulos, duplicados, tipos, valores imposibles |
| 5 | cruzar u ordenar | 15 | merge de dos tablas, o ordenar y quedarse con el top |
| 6 | final | 20–25 | encadenar tres pasos: limpiar, agrupar, ordenar |

Si un reto se pasa de esos minutos, casi siempre es porque pide **dos ideas
nuevas a la vez**. Sepáralo en dos.

---

## 2. EL PROMPT

> Copia desde aquí.

```
Necesito un reto de programación para una competencia por equipos de la
materia FUNDAMENTOS DE PROGRAMACIÓN. Se resuelve escribiendo una función en
Python dentro de un videojuego.

CONTEXTO DEL JUEGO
Los equipos recorren la sede de una agencia secreta que procesa datos. En cada
departamento hay un especialista con un problema atascado; al resolverlo
entrega una credencial. El reto tiene que sonar a trabajo real de esa oficina,
no a ejercicio de libro.

EL RETO QUE NECESITO
- Departamento: <<sala: servidores / laboratorio / bóveda / redes / archivo>>
- Quién lo pide: <<nombre del personaje>>
- Tema de programación: <<contar / filtrar / recorrer texto / agrupar / buscar>>
- Debería tomar unos <<N>> minutos de código a alguien que recién aprende.

NIVEL Y ENFOQUE: MANEJO DE DATOS CON PANDAS
El reto se resuelve TRABAJANDO LA TABLA CON PANDAS. No es un ejercicio de
bucles disfrazado: la gracia está en pensar la operación sobre la tabla.

De pandas puede pedir: seleccionar columnas y filas, filtrar por condición
(incluida más de una con & y |), sum, mean, count, min, max, groupby con
as_index=False, sort_values, head, rename, drop_duplicates, dropna, fillna,
value_counts, astype, merge de dos tablas, y crear una columna nueva a partir
de otras.

NO puede necesitar: clases propias, recursión, expresiones regulares, apply
con funciones complicadas, pivot_table, índices jerárquicos, ventanas móviles,
series de tiempo, ni nada fuera de pandas y numpy.

El equipo ya vio pandas en clase. Puede resolverse en 3 a 8 líneas de pandas
por alguien que lo entendió; quien no, se atasca. Eso es intencional.

FORMATO EXACTO DE LA RESPUESTA
Devuélveme un único bloque de JavaScript con esta forma, listo para pegar en
js/retos.js:

reto: {
  titulo: "",          // corto y con sabor a la oficina, no "Ejercicio 3"
  puntos: 0,           // 100 el más fácil, 300 el final
  enunciado: "",       // qué recibe, qué debe devolver, y qué hacer en el
                       // caso raro. Sin ambigüedades: si hay empate, si la
                       // lista viene vacía, si no hay ningún valor válido.
  funcion: "nombre_en_minusculas_con_guion_bajo",
  comoDataFrame: true, // SIEMPRE en estos retos: la tabla llega ya como
                       // DataFrame, lista para trabajar.
  plantilla:
    "def nombre(parametros):\n" +
    "    # una o dos líneas que expliquen qué recibe\n" +
    "    pass\n",
  casos: [             // 3 casos VISIBLES
    { entrada: [ { columnas: ["col_a", "col_b"],
                   filas: [["x", 1], ["y", 2]] } ],
      salida: [ { col_a: "x", total: 1 } ] }
  ],
  casosOcultos: [      // 2 casos OCULTOS: solo se anuncia cuántos son
    { entrada: [ { columnas: [], filas: [] } ], salida: [] }
  ],
  pista: ""            // señala la técnica, NUNCA la solución
}

REGLAS DE LOS CASOS DE PRUEBA (esto es lo que más se rompe)

1. `entrada` es la LISTA DE ARGUMENTOS, no un valor.
   entrada: [tabla]           ->  funcion(tabla)
   entrada: [tabla, "redes"]  ->  funcion(tabla, "redes")

1b. LAS TABLAS SE ESCRIBEN EN FORMA COMPACTA: las columnas una vez, las filas
   como filas. Con comoDataFrame llegan a la función ya como DataFrame.

   { columnas: ["area", "maquina", "errores"],
     filas: [["redes", "M1", 3],
             ["datos", "M2", 0],
             ["redes", "M3", 5]] }

   Usa entre 8 y 25 filas: menos no se siente manejo de datos, más no cabe.
   Mete desorden a propósito: nulos, un duplicado, un valor imposible. Ahí
   está el trabajo real.

2. Los valores se escriben en JavaScript y el juego los traduce solo:
   null -> None,  true -> True,  false -> False,
   [ ] -> list,  { } -> dict.
   Escribe null, NO None, dentro del bloque de JavaScript.

3. Los 3 casos visibles enseñan a leer el problema. Los 2 ocultos son los
   casos borde: lista vacía, un solo elemento, todos iguales, ninguno válido,
   el resultado es cero. Ahí es donde se separa quien entendió.

4. Nada de redondeos a la mitad exacta. Python redondea round(4.5) a 4, no a
   5. Elige números cuyo promedio dé entero, o di en el enunciado qué regla
   usar.

4b. EL ORDEN DE LAS FILAS DEL RESULTADO IMPORTA. Si el reto agrupa, di en el
   enunciado cómo ordenar la salida (por ejemplo, alfabéticamente por área, o
   de mayor a menor por total). Sin esa instrucción, la mitad va a fallar por
   un orden distinto y con razón. El orden de las COLUMNAS no importa.

5. La comparación es en profundidad y muy tolerante con la forma:
   - una tupla vale igual que una lista;
   - un DataFrame vale igual que la lista de diccionarios equivalente, y el
     orden de las COLUMNAS no importa (el de las FILAS sí);
   - una Series con índice normal vale como lista; con índice propio, como
     diccionario;
   - los números de numpy valen como números de Python.
   Por eso la `salida` esperada se escribe SIEMPRE como lista de diccionarios
   o valor simple, aunque el equipo devuelva un DataFrame.

6. La plantilla tiene que COMPILAR pero NO resolver el reto. Termina en `pass`.

7. La pista cuesta 25 puntos: tiene que valer la pena y a la vez no regalar la
   respuesta. Buena: "un set guarda cada valor una sola vez". Mala: "usa
   len(set(registros))".

ADEMÁS DEL BLOQUE, DAME
- La solución de referencia con pandas, de 3 a 8 líneas, con API básica.
- Dos o tres líneas de diálogo del personaje pidiendo el favor, en su voz.

CUIDADO CON LA VERSIÓN DE PANDAS
El juego usa pandas 2.2 (el que trae el intérprete del navegador). Quédate en
API básica y estable. Evita lo que cambió entre versiones: `append` de
DataFrame ya no existe, y conviene poner `as_index=False` en los groupby en
vez de depender de cómo queda el índice.
```

> Copia hasta aquí.

---

## 2b. Cómo llega la tabla y cómo se devuelve

La tabla se escribe compacta en `retos.js` y llega a la función como DataFrame:

```python
def peores_areas(tabla):
    con_fallas = tabla[tabla["errores"] > 0]
    r = con_fallas.groupby("area", as_index=False)["errores"].sum()
    return r.sort_values("errores", ascending=False).head(3)
```

**La `salida` esperada siempre se escribe como lista de diccionarios**, aunque
la función devuelva un DataFrame. El corrector los compara igual, y también
acepta una Series (como lista o como diccionario, según su índice) y los
números de numpy. O sea que `groupby(...).sum()` vale devolverlo tal cual, sin
`reset_index()`.

En la pantalla del reto las tablas grandes se muestran resumidas
(`<tabla de 12 filas: area, errores, maquina>`) para que los ejemplos sigan
siendo legibles.

## 3. Qué hacer con lo que te devuelva

1. Pega el bloque `reto: { ... }` dentro del personaje que corresponda en
   `js/retos.js`.
2. Pega la solución de referencia en la tabla `SOLUCIONES`, arriba de
   `pruebas/verificar.js`, con el mismo nombre de función.
3. Corre:

   ```
   node pruebas/verificar.js
   ```

   Eso comprueba tres cosas de una vez: que la solución de referencia pase
   todos los casos, que la plantilla compile, y que la plantilla **no**
   resuelva el reto sola. Si un caso de prueba quedó mal escrito, se entera
   ahí y no el día de la competencia.

---

## 4. Los errores que ya cometimos, para que no se repitan

- **Un reto que no es de datos.** Si la solución de referencia con pandas no
  usa ni un filtro ni un groupby ni un merge, no es un reto de manejo de
  datos: es un ejercicio de bucles con una tabla al lado. Replantéalo.
- **Un reto por encima del nivel.** Si la solución necesita pivot_table,
  índices jerárquicos o apply con una función de cinco líneas, se salió de lo
  que el curso cubre.
- **Casos que dependen del redondeo.** `round(4.5)` da 4 en Python. Un caso
  así reprueba a quien lo hizo bien.
- **Enunciado que no dice cómo ordenar el resultado.** Es el error más caro de
  todos: un groupby devuelve las filas en un orden que depende de la versión y
  de los datos. Si no dices "ordenado alfabéticamente por área" o "de mayor a
  menor", media clase falla por algo que nadie especificó.
- **Enunciado que no dice qué hacer con la tabla vacía.** Si no lo dices, la
  mitad devolverá una tabla vacía y la otra mitad se caerá, y las dos tendrán
  razón.
- **Tablas de tres filas.** No se siente manejo de datos. Entre 8 y 25 filas,
  con algún nulo y algún duplicado.
- **Pistas que son la solución.** Si la pista se puede copiar y pegar, nadie
  aprende y además pierden 25 puntos por nada.
- **Enunciados largos.** A los diez minutos nadie los relee. Tres frases: qué
  llega, qué devolver, qué pasa en el caso raro.
