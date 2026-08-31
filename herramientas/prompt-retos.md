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

Reparto que funciona:

| # | Rol | Minutos de código | Qué debe ejercitar |
|---|---|---|---|
| 1 | calentamiento | 5–8 | un recorrido y un contador |
| 2 | filtrar | 10 | condición dentro del recorrido + un caso borde |
| 3 | texto | 12 | recorrer una cadena carácter por carácter |
| 4 | agrupar | 15 | diccionario como acumulador |
| 5 | buscar | 15 | dos pasadas, o recorrido con memoria |
| 6 | final | 20–25 | combina dos de las anteriores |

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

NIVEL: FUNDAMENTOS DE PROGRAMACIÓN, CON MANEJO DE DATOS
Puede usar: variables, if/elif/else, for, while, listas, cadenas, índices y
rebanadas, diccionarios, sets, funciones, len, range, sum, min, max, sorted,
round, ord, chr, los métodos comunes de listas y cadenas, Y PANDAS.

De pandas puede pedir: crear y leer un DataFrame, seleccionar columnas y
filas, filtrar por condición, ordenar (sort_values), agrupar (groupby) con
count, sum y mean, renombrar columnas, contar valores (value_counts), quitar
o rellenar nulos (dropna, fillna), y unir dos tablas con merge.

NO puede necesitar: clases propias, recursión, grafos o árboles, librerías
fuera de pandas y numpy, expresiones regulares, apply con funciones
complicadas, pivot_table, ni índices jerárquicos.

REGLA DE ORO: el reto tiene que poder resolverse de las DOS formas, con
pandas o con un for normal sobre la lista. Pandas debe ahorrar trabajo, no
ser el único camino. Si un reto solo se puede resolver con una función
específica de pandas, está mal planteado.

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
  comoDataFrame: true, // OPCIONAL. Con esto, los argumentos que sean lista de
                       // diccionarios llegan a la función ya convertidos en
                       // DataFrame. Sin esto, llegan como lista de dicts y el
                       // equipo la convierte con pd.DataFrame(registros).
  plantilla:
    "def nombre(parametros):\n" +
    "    # una o dos líneas que expliquen qué recibe\n" +
    "    pass\n",
  casos: [             // 3 casos VISIBLES: se muestran en pantalla
    { entrada: [], salida: null }
  ],
  casosOcultos: [      // 2 casos OCULTOS: solo se anuncia cuántos son
    { entrada: [], salida: null }
  ],
  pista: ""            // señala la técnica, NUNCA la solución
}

REGLAS DE LOS CASOS DE PRUEBA (esto es lo que más se rompe)

1. `entrada` es la LISTA DE ARGUMENTOS, no un valor.
   entrada: [[1,2,3]]      ->  funcion([1,2,3])        una lista como argumento
   entrada: ["ABC", 3]     ->  funcion("ABC", 3)       dos argumentos

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
- DOS soluciones de referencia: una con pandas y otra con un for normal, para
  comprobar que el reto se puede resolver de las dos formas. Ambas de 3 a 8
  líneas, sin trucos.
- Dos o tres líneas de diálogo del personaje pidiendo el favor, en su voz.

CUIDADO CON LA VERSIÓN DE PANDAS
El juego usa pandas 2.2 (el que trae el intérprete del navegador). Quédate en
API básica y estable. Evita lo que cambió entre versiones: `append` de
DataFrame ya no existe, y conviene poner `as_index=False` en los groupby en
vez de depender de cómo queda el índice.
```

> Copia hasta aquí.

---

## 2b. Cómo llega la tabla: las dos formas

**Sin `comoDataFrame`** (por defecto) la función recibe la lista de registros
tal cual, y el equipo decide:

```python
def resumen(registros):
    tabla = pd.DataFrame(registros)      # quien quiera pandas
    ...
```

**Con `comoDataFrame: true`** la tabla llega ya construida:

```python
def resumen(tabla):
    return tabla.groupby("area", as_index=False)["id"].count()
```

La primera forma enseña también a construir el DataFrame y deja el camino
abierto a quien prefiera un bucle. La segunda va directa al grano. Para los
primeros retos conviene la primera; para los últimos, la segunda.

En los dos casos la `salida` esperada se escribe igual, como lista de
diccionarios.

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

- **Un reto por encima del nivel.** El de recorrido de grafos por capas es
  Estructuras de Datos, no Fundamentos. Si al escribir la solución de
  referencia necesitas una cola de pendientes y un conjunto de visitados, el
  reto se salió de la materia.
- **Casos que dependen del redondeo.** `round(4.5)` da 4 en Python. Un caso
  así reprueba a quien lo hizo bien.
- **Enunciado que no dice qué hacer con la lista vacía.** Si no lo dices, la
  mitad devolverá 0 y la otra mitad se caerá con división por cero, y las dos
  tendrán razón.
- **Pistas que son la solución.** Si la pista se puede copiar y pegar, nadie
  aprende y además pierden 25 puntos por nada.
- **Enunciados largos.** A los diez minutos nadie los relee. Tres frases: qué
  llega, qué devolver, qué pasa en el caso raro.
