# Montar la competencia

Cinco minutos de trabajo, una sola vez. Al final tendrás una URL para los
equipos y un panel donde ves el avance de todos.

---

## 1. Crear la base de datos (una vez)

1. Entra a **https://supabase.com** y crea una cuenta.
2. Crea un proyecto:
   - **Región**: `East US (North Virginia)`. Medido desde Ecuador es la más
     rápida (124 ms); São Paulo, pese a estar más cerca en el mapa, da 183 ms
     porque el tráfico sube a Miami igual. De todas formas la diferencia es
     irrelevante para este uso.
   - **Contraseña de la base**: guárdala. No hace falta para esto, pero
     perderla es un fastidio.
   - **Seguridad**: las tres casillas dan igual, el SQL de abajo pone los
     permisos a mano. Si quieres la configuración más prudente: deja
     *Enable Data API* marcada (sin ella el juego no puede escribir), desmarca
     *Automatically expose new tables* y marca *Enable automatic RLS*.
3. Aplica el esquema. Hay dos formas:

   **La cómoda, sin copiar ni pegar** (recomendada, porque el esquema cambia
   cada vez que se añade algo al juego):

   ```
   python -m pip install pg8000
   python herramientas/aplicar_sql.py
   ```

   La primera vez pide **solo la contraseña de la base de datos**. El resto lo
   arma solo: saca el identificador del proyecto de `js/config.js` y prueba por
   dónde conecta. No hay que buscar nada en los menús de Supabase.

   La contraseña queda guardada en `herramientas/.conexion`, fuera del
   repositorio. Las veces siguientes no pregunta nada: un comando y listo.

   **La manual:** abre **SQL Editor**, pega el contenido completo de
   `herramientas/supabase.sql` y dale a *Run*.

Al terminar salen tres comprobaciones y las tres tienen que dar bien:

| Consulta | Qué debe decir |
|---|---|
| 1 | `bien` en las dos tablas (seguridad por fila activada) |
| 2 | `bien` en las cuatro reglas |
| 3 | **cero filas** (el marcador no es legible por los equipos) |
| 4 | `bien` en las dos tablas (el panel sí puede leer) |

> La segunda comprobación dice las reglas con palabras: que los equipos no
> pueden leer el código ajeno, que no pueden borrar nada, y que sí pueden
> registrar sus intentos y lanzar sabotajes. Si alguna sale `MAL`, vuelve a
> ejecutar el archivo entero.

Si alguna sale mal, vuelve a ejecutarlo entero: es idempotente, se puede
correr las veces que haga falta sin romper ni borrar nada.

> La cadena de conexión lleva la contraseña de tu base. El archivo
> `herramientas/.conexion` está en `.gitignore` y el script nunca la muestra en
> pantalla. Si algún día cambias la contraseña, borra ese archivo y volverá a
> preguntarla.

> **¿Cuál contraseña?** Supabase maneja cuatro credenciales distintas y es
> fácil confundirlas:
>
> | Cuál | Para qué |
> |---|---|
> | La de tu cuenta | Entrar a supabase.com |
> | **La de la base de datos** | **La cadena de conexión, esta es** |
> | Claves `anon` / `service_role` | La API. Son claves, no contraseñas |
> | Usuario organizador | Entrar al panel |
>
> La de la base la inventaste al crear el proyecto y solo se muestra una vez.
> Si no la recuerdas, se cambia en **Project Settings → Database → Reset
> database password**. El script rellena solo el hueco `[YOUR-PASSWORD]` de la
> cadena: basta con darle la contraseña cuando la pida.

## 2. Conectar el juego

En Supabase, **Project Settings → API**. Copia dos cosas:

| En Supabase | Va en `js/config.js` |
|---|---|
| Project URL | `URL` |
| Project API keys → `anon` `public` | `CLAVE` |

```js
window.CQ.config = {
  URL: "https://xxxxxxxx.supabase.co",
  CLAVE: "eyJhbGciOi...",
  competencia: "Sección 7"
};
```

Haz push y en un minuto el sitio queda publicado con el registro activo.

> **Usa la clave `anon`, nunca la `service_role`.** La `anon` está pensada para
> viajar dentro de la página y el SQL solo le permite insertar. La
> `service_role` lee y borra todo. Si te equivocas, el despliegue falla a
> propósito antes de publicarla.

## 3. Crear tu usuario de organizador

El panel entra con correo y contraseña, no con claves. Hay que crear ese
usuario y ponerlo en la lista blanca.

1. En Supabase, **Authentication → Users → Add user → Create new user**.
   Pon tu correo y una contraseña. Marca *Auto Confirm User* para no tener que
   confirmar por email.
2. En **SQL Editor**, mete ese correo en la lista:

   ```sql
   insert into organizadores (email, nota) values
     ('tu@correo.com', 'organizadora')
   on conflict (email) do nothing;
   ```

   Para añadir a alguien más (AngelPila, por ejemplo), repite los dos pasos con
   su correo.

3. **Cierra el registro público.** En **Authentication → Providers → Email**,
   desactiva *Enable Sign Ups*. Sin esto, cualquiera podría crearse una cuenta
   con la clave del juego. No vería nada —la lista blanca lo impide— pero es
   una puerta que no tiene por qué estar abierta.

## 4. El panel

Está publicado en
**https://manzannita.github.io/seccion-7-agencia-de-datos/panel/**

Entra con el correo y la contraseña del paso anterior. Verás tres cosas:

- **Equipos**: quién va ganando, cuántos encargos resolvió, puntos, intentos y
  tiempo.
- **Por encargo**: cuántos equipos lo intentaron y cuántos lo lograron. Esto
  es lo que de verdad enseña: si un encargo lo intentaron doce equipos y lo
  resolvieron dos, el problema es el enunciado, no los equipos.
- **Últimos envíos**: el código exacto que mandó cada uno, con sus errores.

Hay un botón para actualizar cada 15 segundos y otro para bajar todo en CSV.

> **Que el panel sea público no es un descuido.** La página no lleva ninguna
> clave: solo la misma que ya viaja en el juego, que únicamente puede insertar.
> Quien la abra sin un usuario de la lista no ve absolutamente nada. La clave
> `service_role` no se usa en ninguna parte y no debería salir nunca de tu
> cuenta de Supabase.

---

## Sabotajes

Cada encargo resuelto le da al equipo **un sabotaje** para lanzarle a otro. Se
lanza desde el panel de encargos (`TAB`), eligiendo qué y a quién.

| Sabotaje | Qué hace | Dura |
|---|---|---|
| Apagón de sector | Se va la luz, solo se ve alrededor del personaje | 20 s |
| Compuertas trabadas | No se puede pasar de una sala a otra | 25 s |
| Interferencia | El personaje camina a la mitad de velocidad | 30 s |

**Todos cuestan segundos de recorrido, ninguno toca el editor.** Es la regla de
diseño más importante de esta parte: si un ataque estropeara el código que un
equipo lleva veinte minutos escribiendo, eso no sería competir. Y si el ataque
llega mientras están en la pantalla de un encargo, espera a que salgan.

**Quién cuenta los sabotajes disponibles es el servidor.** El navegador muestra
un número, pero la base de datos tiene un disparador que comprueba cuántos
encargos distintos resolvió el equipo. Cambiar ese número desde las
herramientas de desarrollo no sirve de nada: el envío se rechaza.

### Qué se abrió para que esto funcione

Hasta aquí los equipos podían escribir pero no leer. El sabotaje obliga a abrir
una rendija, y conviene saber exactamente cuánta:

| Tabla | Los equipos pueden |
|---|---|
| `intentos` (el código) | **nada**, sigue cerrada |
| `equipos` | leer, pero ahí solo hay nombres |
| `sabotajes` | leer y escribir |

**El código enviado sigue siendo privado.** Un equipo ve los nombres de los
demás y quién atacó a quién, que es parte del juego, pero no puede ver una sola
línea del trabajo ajeno.

### Si prefieres la competencia sin sabotajes

Borra la tabla y listo; el juego lo detecta y esconde la sección:

```sql
drop table if exists sabotajes cascade;
```

## La cacería de códigos QR (antes de jugar)

El juego no se abre solo: pide una **clave de acceso** que los equipos arman
recorriendo el campus. Sin pasar por las tres estaciones no hay clave, y sin
clave no entran.

### Cómo funciona

Hay tres estaciones, cada una con un cartel pegado. El cartel lleva **un QR
distinto y nada más**: ni el reto ni el nombre del sitio. Al escanearlo, la
página reconoce ese cartel y **muestra el reto en el celular**. Si aciertan,
reciben un **fragmento** de la clave y **dónde está su siguiente estación**.

| estación | lugar | reto | respuesta | da |
|---|---|---|---|---|
| A | TAWS | anagrama | `DATOS` | `NUC` |
| B | Labs de FIEC (externo) | letras por su número | `CODIGO` | `LEO` |
| C | Entrada a Coding Bootcamps ESPOL, FIEC nueva | ordenar código Python | `42` | `7X9` |

`NUC` + `LEO` + `7X9` = **NUCLEO7X9**, la clave que abre el juego.

Cada equipo recorre las tres en distinto orden para que no se amontonen ni se
copien. La clave no viaja dentro de ningún QR: la arma la página al juntar los
tres fragmentos. Saltarse una estación no es un atajo, es quedarse fuera.

### El código de arranque

Cada equipo empieza con un código que **le das tú**. Ese código dice quiénes
son y dónde empieza su ruta, así que la página no tiene que preguntarles nada
más. Está en `pistas/codigos-arranque.html` y en `herramientas/rutas.txt`:

```
Equipo 1   VEGA-3364    empieza en TAWS
Equipo 2   ORION-7346   empieza en Labs de FIEC (edificio externo)
...
```

Da igual cómo lo escriban: `VEGA-3364`, `vega 3364` o `vega3364` valen todos.

Con seis equipos y tres estaciones, los equipos 1 y 4 arrancan en el mismo
sitio, el 2 y el 5 en otro, y el 3 y el 6 en el tercero. Si quieres que no
coincidan ni al arrancar, usa tres equipos, o añade una cuarta estación.

### Preparar

```
python herramientas/generar_pistas.py
```

| archivo | para qué |
|---|---|
| `js/pistas-datos.js` | lo que lee la página, todo cifrado. Se publica |
| `pistas/carteles.html` | los tres carteles con su QR. **Imprimir y pegar** |
| `pistas/codigos-arranque.html` | los códigos, una hoja. **Para ti** |
| `pistas/donde-va-A.html` y sus hermanas | una hoja por cartel diciendo dónde se pega |
| `herramientas/rutas.txt` | recorridos, respuestas y las direcciones de los QR |

Los dos archivos imprimibles llevan datos que los equipos no deben ver. El
despliegue lo comprueba y se para solo si alguna vez se cuelan.

El generador **reutiliza** los códigos de arranque y los QR que ya existen
(los guarda en `herramientas/rutas.json`), así que puedes retocar un reto y
volver a generar sin que los carteles impresos dejen de servir. Te avisa al
final si algo salió nuevo y hay que reimprimir.

Si quieres códigos nuevos a propósito, borra `herramientas/rutas.json` y
vuelve a generar.

### Probar la ruta sin estropear nada

La cacería **no guarda nada en ningún servidor**: el avance vive solo en el
`localStorage` del teléfono que la hace. No hay ninguna lista de equipos que
la hayan completado, así que no hay nada que marcar ni desmarcar. Recorre la
ruta las veces que quieras con el código que quieras; a los equipos no les
afecta, porque usarán sus propios teléfonos. Los códigos tampoco se gastan.

Lo único que hay que cuidar: **si prestas el mismo teléfono a un equipo**
después de probar, ese teléfono lleva tu avance. Si el equipo es distinto al
que usaste, se borra solo al meter su código. Si es el mismo, se lo
encontraría hecho.

Para dejar un teléfono limpio:

```
https://manzannita.github.io/seccion-7-agencia-de-datos/pistas/?reiniciar=1
```

Borra el avance de ese teléfono y vuelve a pedir el código de arranque. Va en
la dirección y no en un botón a propósito: un botón en pantalla se pulsa sin
querer a media cacería.

Funciona en cualquier copia de la página, también en la de tu máquina
(`http://192.168.x.x:8000/pistas/?reiniciar=1`). Ojo con una cosa: **cada
dirección guarda su propio avance**. Si probaste en la copia local, hay que
limpiar la local; limpiar la de GitHub Pages no la toca, y al revés.

La otra opción, si solo quieres probar: hazlo en una ventana privada o de
incógnito. Al cerrarla no queda nada.

### Cambiar lugares o retos

Todo sale de `herramientas/pistas.json`. Cambia el `lugar`, el `acertijo`, la
`respuesta` o el `fragmento` y vuelve a generar. La clave final es la unión de
los fragmentos en el orden en que estén las estaciones en ese archivo.

El `acertijo` ahora se ve en el celular, así que puede ser largo y llevar
saltos de línea (`
`). La `respuesta` es lo que tienen que escribir: se
ignoran mayúsculas, tildes, espacios y guiones.

El campo `cierre` es lo que ven al completar la ruta, debajo de la clave:

```
"cierre": "Ya pueden volver al laboratorio. Escriban esta clave en el juego para entrar."
```

### El día

1. Imprime `carteles.html` y las hojas `donde-va-*.html`. Cada hoja dice en
   qué sitio va su cartel; el cartel lleva la letra grande arriba para que los
   emparejes. Ninguna de las dos dice el reto ni la respuesta, así que puedes
   darle el paquete a otra persona para que los pegue sin que se entere de
   nada. Que se quede las hojas: no se dejan junto al cartel.
2. Quédate con `codigos-arranque.html`.
3. A cada equipo le das **solo su código**. Ellos lo escriben en la página y
   ahí les dice dónde ir.
4. Van, escanean, resuelven, y la página los manda a la siguiente.
5. Con las tres, la página les muestra `NUCLEO7X9` y les dice que vuelvan al
   laboratorio. Con esa clave entran al juego.

Si un equipo se atasca de verdad, en `herramientas/rutas.txt` tienes todas las
respuestas y las direcciones de los QR para probarlos sin caminar.

## El juego solo se juega en el laboratorio

Si alguien abre el juego desde el celular, no entra: sale una pantalla que dice
**REGRESA AL LABORATORIO**, y si ya completaron la cacería en ese mismo teléfono
se les recuerda su clave ahí mismo, que la van a necesitar al llegar.

No es solo por reglas: el juego pide escribir Python y moverse con WASD, y desde
un teléfono no se puede. Además así el celular no se descarga los 49 MB del
intérprete para nada.

La página de las pistas sí funciona en el celular, claro. Es solo el juego.

### Si una máquina del laboratorio se bloqueara por error

No debería: se comprueba que el navegador se identifique como teléfono **o** que
no exista ningún ratón conectado, y un portátil con pantalla táctil sigue
contando como computadora. Pero si el día del evento alguna máquina diera un
falso positivo, se salta añadiendo `?lab=1` al final de la dirección:

```
https://manzannita.github.io/seccion-7-agencia-de-datos/?lab=1
```

Guárdate ese truco por si acaso.

## Qué se guarda de cada intento

Cada vez que un equipo pulsa EJECUTAR, se guarda una fila: equipo, encargo,
**el código completo**, si pasó, cuántos casos pasó, puntos, si usó la pista y
en qué minuto de la partida iba.

Se guarda el código y no solo el resultado por una razón: **el puntaje que
reporta un navegador no es confiable**. Cualquiera con las herramientas de
desarrollo puede inventarse un número. El código, en cambio, se revisa: si un
equipo "resolvió" seis encargos con `return 20`, se ve en el panel.

Y de paso queda un registro de dónde se atascó cada equipo, que para la clase
siguiente vale más que el marcador.

## Si algo falla el día del evento

**El registro no es imprescindible.** Si Supabase no responde o se cae el
wifi, el juego sigue funcionando: cada equipo guarda su progreso en su propio
navegador y los intentos que no se pudieron enviar quedan en cola y se mandan
solos cuando vuelve la red.

Lo único que se pierde es lo que no alcanzó a subirse si además cierran el
navegador. El juego nunca se detiene por un problema de red.

**El proyecto gratuito de Supabase se duerme** tras una semana sin uso. Si lo
montas con antelación, entra al tablero un día antes y despiértalo con un
clic.

## Repaso antes de empezar

- [ ] El SQL ejecutado y `rowsecurity = true` en las dos tablas
- [ ] `js/config.js` con la URL y la clave **anon**, subido
- [ ] El sitio abre y deja ejecutar código
- [ ] Tu usuario creado y su correo en la tabla `organizadores`
- [ ] El registro público de cuentas desactivado
- [ ] El panel carga con tu correo y contraseña
- [ ] Jugaste una partida de prueba y aparece en el panel
- [ ] Borraste esa prueba (`delete from intentos; delete from equipos;`)
- [ ] La copia local de 49 MB en una USB, por si acaso
