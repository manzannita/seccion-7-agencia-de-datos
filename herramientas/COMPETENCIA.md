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

   La primera vez pide la cadena de conexión —en Supabase, botón **Connect**
   arriba, pestaña *Session pooler*, copiar el URI— y la guarda en
   `herramientas/.conexion`, que está fuera del repositorio. Las veces
   siguientes no pregunta nada: un comando y listo.

   **La manual:** abre **SQL Editor**, pega el contenido completo de
   `herramientas/supabase.sql` y dale a *Run*.

Al terminar salen tres comprobaciones y las tres tienen que dar bien:

| Consulta | Qué debe decir |
|---|---|
| 1 | `bien` en las dos tablas (seguridad por fila activada) |
| 2 | `bien` en cada fila: permisos `INSERT` y nada más |
| 3 | **cero filas** (el marcador no es legible por los equipos) |
| 4 | `bien` en las dos tablas (el panel sí puede leer) |

> Si la segunda dice `MAL: sobra TRUNCATE`, es porque el proyecto se creó con
> los permisos por defecto de Supabase, que son más amplios de lo que necesita
> el juego. **TRUNCATE deja vaciar la tabla entera**: con ese permiso, un
> equipo podría borrar los resultados de todos. El archivo ya lo corrige
> revocando todo antes de conceder; vuelve a ejecutarlo completo.

Si alguna sale mal, vuelve a ejecutarlo entero: es idempotente, se puede
correr las veces que haga falta sin romper ni borrar nada.

> La cadena de conexión lleva la contraseña de tu base. El archivo
> `herramientas/.conexion` está en `.gitignore` y el script nunca la muestra en
> pantalla. Si algún día cambias la contraseña, borra ese archivo y volverá a
> preguntarla.

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
