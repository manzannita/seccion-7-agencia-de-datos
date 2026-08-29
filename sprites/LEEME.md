# Sprites de personajes

Aquí van los PNG de los personajes. **La carpeta puede quedar vacía**: si un
personaje no tiene PNG, el motor lo dibuja por código y el juego funciona igual.

## Formato

Una hoja de **3 columnas × 4 filas**:

```
            quieto     paso A     paso B
 abajo    [       ] [        ] [        ]
 arriba   [       ] [        ] [        ]
 izquierda[       ] [        ] [        ]
 derecha  [       ] [        ] [        ]
```

- Los pies van **pegados al borde inferior** de cada cuadro: así el personaje
  se apoya bien en el piso y queda ordenado con los muebles.
- El cuadro mide **16×24** (la hoja completa, 48×96). El personaje es más alto
  que la casilla a propósito: con 16×16 la cara tiene 8×8 píxeles y ahí no cabe
  una expresión.
- Fondo **transparente**. PNG, nunca JPEG: el JPEG inventa píxeles borrosos
  y destruye el pixel art.

## Plantilla

```
node pruebas/plantilla.js
```

Deja `_plantilla.png` (tamaño real, con un personaje de ejemplo para calcar) y
`_plantilla-guia.png` (ampliada 6× y con cuadrícula, para mirar mientras
dibujas).

## Cómo se conecta

En `js/retos.js`, dentro del personaje:

```js
sprite: "sprites/annabella.png",        // la hoja de 3x4
retrato: "sprites/annabella-cara.png",  // la cara en la caja de diálogo
```

Si tienes **una sola imagen** en vez de una hoja (el personaje queda quieto):

```js
sprite: "sprites/quieta.png",
columnas: 1,
filas: 1,
```

Si el archivo no existe o falla al cargar, el motor vuelve al dibujo por código
sin romper nada.

## Retratos

El retrato se muestra en un cuadro al lado del texto del diálogo. Cualquier
imagen cuadrada sirve; **48×48 es la escala del juego**.

Si un personaje no trae `retrato`, el motor le dibuja un busto de 48×48 con su
paleta, y acepta `lentes: true`, `pelolargo: true` y `robot: true`. O sea que
nadie se queda sin cara.

## Ejemplo hecho: Annabella

`annabella.png` y `annabella-cara.png` son el caso completo, por si sirven de
referencia:

- En el **mundo** mide 16×24 como todos los demás. A esa escala manda la
  silueta: pelo largo y oscuro, lentes, playera negra con el pin, jeans claros,
  tenis blancos.
- El **retrato** es de 48×48 y ahí sí se le ve la cara.

Ese reparto es la razón de tener las dos cosas: personaje chico para caminar,
retrato grande para conversar.

## Retocar a Annabella sin abrir un editor

Su arte está escrito como una cuadrícula de letras, una por color:

```
sprites/fuente/annabella-sprite.py   el personaje del mundo (16x24)
sprites/fuente/annabella-cara.py     el retrato (48x48)
```

Cada fila es una línea de texto donde cada letra es un color de la paleta de
arriba del archivo. Para cambiar algo se edita la letra y se vuelve a correr:

```
python sprites/fuente/annabella-cara.py
```

Los archivos avisan si una fila queda con el largo equivocado, así que es
difícil romperlos.

## Dos cosas que arruinan un retrato

1. **Derivarlo bajando de resolución una imagen suavizada.** Cada borde lo
   termina decidiendo un promedio borroso y salen dentados. No hay filtro que
   lo arregle: a esta escala los píxeles se ponen a mano.
2. **Mostrarlo con escala no entera.** Si el cuadro mide 30 y la imagen 48, el
   navegador estira unos píxeles y otros no, y los bordes se ven rotos por
   limpio que esté el dibujo. Por eso el cuadro del diálogo mide exactamente
   48 unidades. Si cambias el tamaño del retrato, ajusta también `#dlgRetrato`
   en `index.html` a un múltiplo exacto. Hay una prueba que lo vigila.

## Consejos de la casa

- **Silueta antes que detalle.** A esta escala el personaje se reconoce por su
  contorno, no por los ojos. Si no se distingue en miniatura, ningún detalle
  lo va a salvar.
- **Luz desde arriba a la izquierda**, igual que el resto del juego: las
  sombras van al borde derecho y abajo. Si sombreas todo el contorno por
  igual, el personaje se ve inflado.
- **Pocos colores.** Cuatro o cinco tonos por material alcanzan y sobran.
- **Sombras más frías, brillos más cálidos.** Una sombra no es el mismo color
  más oscuro: además tira al azul.
