# Montar la competencia

Cinco minutos de trabajo, una sola vez. Al final tendrás una URL para los
equipos y un panel donde ves el avance de todos.

---

## 1. Crear la base de datos (una vez)

1. Entra a **https://supabase.com** y crea una cuenta.
2. Crea un proyecto. Anota la contraseña de la base: no la vas a necesitar
   para esto, pero perderla es un fastidio.
3. Abre **SQL Editor** en el menú de la izquierda.
4. Pega el contenido completo de `herramientas/supabase.sql` y dale a *Run*.

Al final la consulta te devuelve dos filas con `rowsecurity = true`. Si no es
así, algo no se ejecutó: vuelve a pegarlo entero.

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

## 3. El panel

Abre **`herramientas/panel.html`** con doble clic, desde tu disco. Pega la URL
del proyecto y esta vez sí la clave **`service_role`**.

Verás tres cosas:

- **Equipos**: quién va ganando, cuántos encargos resolvió, puntos, intentos y
  tiempo.
- **Por encargo**: cuántos equipos lo intentaron y cuántos lo lograron. Esto
  es lo que de verdad enseña: si un encargo lo intentaron doce equipos y lo
  resolvieron dos, el problema es el enunciado, no los equipos.
- **Últimos envíos**: el código exacto que mandó cada uno, con sus errores.

Hay un botón para actualizar cada 15 segundos y otro para bajar todo en CSV.

> **Este archivo no se publica nunca.** Lleva la clave que puede borrar la
> base. El despliegue está configurado para rechazarlo si alguien lo mueve a
> una carpeta publicada.

---

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
- [ ] El panel carga con la clave **service_role**
- [ ] Jugaste una partida de prueba y aparece en el panel
- [ ] Borraste esa prueba (`delete from intentos; delete from equipos;`)
- [ ] La copia local de 49 MB en una USB, por si acaso
