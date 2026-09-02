# -*- coding: utf-8 -*-
"""
Genera la ruta física a partir de herramientas/pistas.json.

    python herramientas/generar_pistas.py

Deja tres cosas:
    js/pistas-datos.js        lo que lee la web: TODO CIFRADO
    pistas/carteles.html      los carteles para imprimir, con su QR
    herramientas/rutas.txt    el recorrido de cada equipo, para ti
    herramientas/rutas.json   el mismo recorrido, para las pruebas

POR QUÉ VA CIFRADO
Si la web llevara las pistas en claro, cualquiera abre el código fuente del
navegador y se las lee todas sin levantarse de la silla. Aquí todo va cerrado
con dos llaves, y las dos exigen haber ido al sitio:

  el reto de cada estación    con la FICHA que viaja en el QR de su cartel
  la recompensa de cada uno   con esa misma FICHA MÁS LA RESPUESTA del reto

La ficha son doce caracteres al azar que solo están impresos en el cartel. Por
eso no vale con adivinar la respuesta: aunque alguien pruebe "42" contra todos
los cofres desde su casa, sin la ficha no abre ninguno. Y para tener la ficha
hay que haber escaneado ese cartel.

El cifrado es PBKDF2-SHA256 usado como flujo de clave, con una sal distinta
por cofre. Se hace igual aquí y en el navegador; no hace falta ninguna
librería en ninguno de los dos lados.
"""
import base64
import hashlib
import json
import os
import secrets
import sys
import unicodedata

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CONFIG = os.path.join(RAIZ, "herramientas", "pistas.json")
SALIDA_JS = os.path.join(RAIZ, "js", "pistas-datos.js")
SALIDA_CARTELES = os.path.join(RAIZ, "pistas", "carteles.html")
SALIDA_RUTAS = os.path.join(RAIZ, "herramientas", "rutas.txt")
SALIDA_ORDEN = os.path.join(RAIZ, "herramientas", "rutas.json")

ITERACIONES = 120000     # rápido en un celular, lento para probar a lo bruto


def normaliza(texto):
    """Compara respuestas sin castigar tildes, mayúsculas ni espacios de más."""
    t = unicodedata.normalize("NFD", str(texto).lower())
    t = "".join(c for c in t if unicodedata.category(c) != "Mn")
    return "".join(c for c in t if c.isalnum())


def cifra(respuesta, mensaje):
    """Devuelve (sal, cifrado, sello) en base64.

    El sello permite decir 'respuesta incorrecta' sin llegar a descifrar nada.
    """
    sal = secrets.token_bytes(16)
    claro = mensaje.encode("utf-8")
    material = hashlib.pbkdf2_hmac("sha256", normaliza(respuesta).encode("utf-8"),
                                   sal, ITERACIONES, dklen=len(claro) + 32)
    flujo, sello = material[:len(claro)], material[len(claro):]
    cifrado = bytes(a ^ b for a, b in zip(claro, flujo))
    b64 = lambda x: base64.b64encode(x).decode("ascii")
    return b64(sal), b64(cifrado), b64(sello)


def rutas(estaciones, equipos):
    """A cada equipo su propio orden, rotando la lista.

    Sin esto los doce equipos salen corriendo al mismo sitio y se hace un
    tapón en la primera estación.
    """
    n = len(estaciones)
    return {equipo: [estaciones[(i + k) % n] for i in range(n)]
            for k, equipo in enumerate(equipos)}


def escapa(t):
    return (str(t).replace("&", "&amp;").replace("<", "&lt;")
            .replace(">", "&gt;").replace('"', "&quot;"))


def carteles(cfg, url_base, fichas):
    """Un cartel por estación, listo para imprimir y pegar en la pared.

    Cada cartel lleva SU propio código: la dirección del QR incluye una ficha
    distinta por estación. Así, al escanear, la página sabe delante de cuál
    estás y te muestra el reto en el celular. El reto no se imprime.
    """
    import segno
    trozos = []
    for e in cfg["estaciones"]:
        destino = url_base + ("&" if "?" in url_base else "?") + "e=" + fichas[e["id"]]
        qr = segno.make(destino, error="h")
        svg = qr.svg_inline(scale=6, dark="#0b1020", light=None)
        trozos.append("""
  <section class="cartel">
    <div class="cabecera">
      <div class="titulo">%s</div>
      <div class="subtitulo">%s</div>
    </div>
    <div class="estacion">ESTACIÓN %s</div>
    <div class="instruccion">
      Escanea este código con el celular.<br>
      Ahí aparece tu reto.
    </div>
    <div class="qr">%s</div>
    <div class="consejo">
      Ábrelo en tu navegador (Chrome, Safari…), no dentro del lector de
      códigos, o pueden perder lo que llevan.
    </div>
    <div class="pie">Si el QR falla, escriban esta dirección:<br>%s</div>
  </section>""" % (escapa(cfg.get("titulo", "")), escapa(cfg.get("subtitulo", "")),
                   escapa(e["id"]), svg, escapa(destino)))

    return """<!DOCTYPE html>
<html lang="es"><head><meta charset="utf-8">
<title>Carteles - %s</title>
<style>
 @page { size: A4; margin: 12mm; }
 body { font-family: Georgia, "Times New Roman", serif; margin: 0; color: #0b1020; }
 .cartel { page-break-after: always; height: 250mm; display: flex; flex-direction: column;
           align-items: center; justify-content: center; text-align: center;
           border: 3px solid #0b1020; padding: 14mm; box-sizing: border-box; }
 .cabecera { margin-bottom: 6mm; }
 .titulo { font-size: 26pt; letter-spacing: .12em; font-weight: bold; }
 .subtitulo { font-size: 13pt; color: #555; margin-top: 2mm; }
 .estacion { font-size: 15pt; letter-spacing: .3em; margin: 8mm 0 4mm;
             border-top: 2px solid #0b1020; border-bottom: 2px solid #0b1020;
             padding: 3mm 10mm; }
 .instruccion { font-size: 15pt; color: #333; margin: 8mm 0; line-height: 1.6; }
 .qr svg { width: 95mm; height: 95mm; }
 .consejo { font-size: 11pt; color: #444; margin-top: 7mm; max-width: 120mm;
            line-height: 1.5; }
 .pie { font-size: 9pt; color: #777; margin-top: 5mm; word-break: break-all; }
 @media screen { body { background:#eee; padding: 10mm; }
                 .cartel { background: #fff; margin-bottom: 8mm; height: auto; } }
</style></head><body>%s</body></html>""" % (escapa(cfg.get("titulo", "")), "".join(trozos))


def cargar_previos():
    """Lo que se genero la vez anterior, si es que la hubo.

    Sirve para no cambiar las fichas de los QR ni los codigos de arranque al
    volver a generar: los carteles impresos siguen valiendo.
    """
    if not os.path.exists(SALIDA_ORDEN):
        return {}
    try:
        with open(SALIDA_ORDEN, encoding="utf-8") as f:
            return json.load(f)
    except (ValueError, OSError):
        return {}


def codigos_inicio(equipos):
    """Un codigo de arranque por equipo. Lo reparte la organizacion.

    Se lee en voz alta sin equivocarse, y normaliza() se come el guion, asi
    que da igual como lo escriban: "VEGA-4127", "vega 4127" o "vega4127".
    """
    palabras = ["VEGA", "ORION", "SIGMA", "DELTA", "NOVA", "KILO",
                "ATLAS", "LYRA", "TITAN", "ONIX", "CIRRO", "ZETA"]
    usadas = {}
    for i, equipo in enumerate(equipos):
        palabra = palabras[i % len(palabras)]
        numero = "".join(secrets.choice("23456789") for _ in range(4))
        usadas[equipo] = "%s-%s" % (palabra, numero)
    return usadas


def hoja_codigos(cfg, recorridos, arranques):
    """La hoja que te quedas tu: que codigo lleva cada equipo y donde empieza.

    Es una sola pagina y NO se publica: aqui estan todos los puntos de
    partida juntos.
    """
    filas = []
    for equipo, ruta in recorridos.items():
        filas.append("""
    <tr>
      <td class="equipo">%s</td>
      <td class="codigo">%s</td>
      <td class="lugar">%s</td>
    </tr>""" % (escapa(equipo), escapa(arranques[equipo]),
                escapa(ruta[0]["lugar"])))

    return """<!DOCTYPE html>
<html lang="es"><head><meta charset="utf-8"><title>Códigos de arranque</title>
<style>
 @page { size: A4; margin: 16mm; }
 body { font-family: Georgia, serif; color: #0b1020; }
 h1 { font-size: 19pt; letter-spacing: .1em; margin-bottom: 2mm; }
 .nota { font-size: 11pt; color: #555; margin-bottom: 8mm; line-height: 1.6; }
 table { width: 100%%; border-collapse: collapse; }
 th { text-align: left; font-size: 10pt; letter-spacing: .16em; color: #555;
      border-bottom: 2px solid #0b1020; padding-bottom: 2mm; }
 td { padding: 4mm 2mm; border-bottom: 1px solid #ccc; vertical-align: middle; }
 .equipo { font-size: 14pt; font-weight: bold; width: 32%%; }
 .codigo { font-family: "Courier New", monospace; font-size: 17pt;
           font-weight: bold; letter-spacing: .08em; width: 28%%; }
 .lugar { font-size: 12pt; color: #333; }
</style></head><body>
  <h1>%s &mdash; CÓDIGOS DE ARRANQUE</h1>
  <div class="nota">
    Esta hoja es para la organización, no para los equipos.<br>
    Dale a cada equipo <strong>solo su código</strong>. Con él, la página les
    dice dónde está su primera estación. La columna de la derecha es para
    que tú sepas dónde los mandaste.
  </div>
  <table>
    <tr><th>EQUIPO</th><th>CÓDIGO</th><th>EMPIEZA EN</th></tr>%s
  </table>
</body></html>""" % (escapa(cfg.get("titulo", "")), "".join(filas))



def main():
    if not os.path.exists(CONFIG):
        raise SystemExit("No encuentro " + CONFIG)
    with open(CONFIG, encoding="utf-8") as f:
        cfg = json.load(f)

    estaciones = cfg["estaciones"]
    equipos = cfg["equipos"]
    clave_final = "".join(e["fragmento"] for e in estaciones)
    url_base = cfg.get("url", "https://manzannita.github.io/seccion-7-agencia-de-datos/pistas/")

    recorridos = rutas(estaciones, equipos)

    # Las fichas de los QR y los codigos de arranque se REUTILIZAN si ya
    # existen. Si no, cada vez que se toca un acertijo cambiarian todos los
    # codigos y los carteles ya impresos dejarian de servir.
    previos = cargar_previos()
    alfabeto = "abcdefghijkmnpqrstuvwxyz23456789"

    fichas, nuevas = {}, []
    for e in estaciones:
        guardada = previos.get("fichas", {}).get(e["id"])
        if guardada:
            fichas[e["id"]] = guardada
        else:
            fichas[e["id"]] = "".join(secrets.choice(alfabeto) for _ in range(12))
            nuevas.append(e["id"])

    # El codigo que reparte la organizacion. Abre un cofre con el nombre del
    # equipo y su primera estacion: por eso la pagina no necesita preguntar
    # quienes son, y un equipo no puede meterse en la ruta de otro.
    arranques, codigos_nuevos = {}, []
    for equipo, codigo in codigos_inicio(equipos).items():
        guardado = previos.get("arranques", {}).get(equipo)
        arranques[equipo] = guardado or codigo
        if not guardado:
            codigos_nuevos.append(equipo)

    # --- lo que lee la web, todo cifrado ---
    datos = {"titulo": cfg.get("titulo", ""), "total": len(estaciones),
             "cierre": cfg.get("cierre", ""),
             "equipos": {}, "estaciones": [e["id"] for e in estaciones]}
    # Cada estacion vale por su sitio en la clave, no por el turno en que la
    # visite el equipo: asi los fragmentos se ordenan igual para todos.
    sitio = {e["id"]: i + 1 for i, e in enumerate(estaciones)}

    for equipo, ruta in recorridos.items():
        cofres = {}
        for i, e in enumerate(ruta):
            siguiente = ruta[i + 1]["lugar"] if i + 1 < len(ruta) else None
            # La clave final NO viaja dentro de ningun cofre. Si el ultimo la
            # entregara, un equipo podria saltarse una estacion y terminar
            # igual. Sale de juntar los fragmentos, y para eso hacen falta
            # todos los codigos.
            mensaje = json.dumps({
                "fragmento": e["fragmento"],
                "n": sitio[e["id"]],
                "siguiente": siguiente,
            }, ensure_ascii=False)
            # La llave es la ficha del QR MAS la respuesta, no la respuesta
            # sola. Una respuesta corta ("42") se rompe a fuerza bruta desde
            # casa en segundos; con la ficha delante hay que haber escaneado
            # ese cartel para siquiera intentarlo.
            sal, ct, sello = cifra(fichas[e["id"]] + e["respuesta"], mensaje)
            cofres[e["id"]] = {"s": sal, "c": ct, "v": sello}
        # El punto de partida NO va en el archivo. Con varios equipos, cada
        # uno empieza en una estacion distinta, asi que publicar los arranques
        # revelaria todas las ubicaciones de golpe. Se entrega en papel.
        datos["equipos"][equipo] = {"cofres": cofres}

    # Los arranques, cada uno cerrado con su propio codigo.
    datos["arranques"] = []
    for equipo, ruta in recorridos.items():
        mensaje = json.dumps({"equipo": equipo, "primera": ruta[0]["lugar"]},
                             ensure_ascii=False)
        sal_i, ct_i, sello_i = cifra(arranques[equipo], mensaje)
        datos["arranques"].append({"s": sal_i, "c": ct_i, "v": sello_i})

    # El reto de cada estacion, cerrado con la ficha de su QR. Sin escanear
    # ese cartel no hay ficha, y sin ficha el reto no se puede leer: por eso
    # se puede publicar la lista entera sin adelantar nada.
    datos["retos"] = []
    for e in estaciones:
        mensaje = json.dumps({"id": e["id"], "acertijo": e["acertijo"]},
                             ensure_ascii=False)
        sal_r, ct_r, sello_r = cifra(fichas[e["id"]], mensaje)
        datos["retos"].append({"s": sal_r, "c": ct_r, "v": sello_r})

    # Con que el juego compruebe la clave final. Se cifra un mensaje corto
    # usando la propia clave como respuesta: si abre, la clave es la buena.
    # Asi el juego puede validarla sin llevarla escrita en ninguna parte.
    sal_a, ct_a, sello_a = cifra(clave_final, json.dumps({"ok": True}))
    datos["acceso"] = {"s": sal_a, "c": ct_a, "v": sello_a}

    cabecera = ("/* GENERADO POR herramientas/generar_pistas.py - no editar a mano.\n"
                "   Todo va cifrado con la respuesta de cada estacion: leer este\n"
                "   archivo no revela ninguna pista. Las respuestas en claro estan\n"
                "   en herramientas/pistas.json, que no se publica. */\n")
    with open(SALIDA_JS, "w", encoding="utf-8") as f:
        f.write(cabecera + "window.CQ = window.CQ || {};\nwindow.CQ.pistas = " +
                json.dumps(datos, ensure_ascii=False, indent=1) + ";\n")

    os.makedirs(os.path.dirname(SALIDA_CARTELES), exist_ok=True)
    with open(SALIDA_CARTELES, "w", encoding="utf-8") as f:
        f.write(carteles(cfg, url_base, fichas))

    with open(SALIDA_RUTAS, "w", encoding="utf-8") as f:
        f.write("RECORRIDOS  (para ti, no para los equipos)\n")
        f.write("clave final: %s\n\n" % clave_final)
        f.write("CODIGO DE ARRANQUE DE CADA EQUIPO\n")
        for equipo, ruta in recorridos.items():
            f.write("   %-10s %-12s empieza en %s\n"
                    % (equipo, arranques[equipo], ruta[0]["lugar"]))
        f.write("\n")
        f.write("DIRECCION DE CADA CARTEL (para probarlos sin caminar)\n")
        for e in estaciones:
            f.write("   [%s] %-42s %s?e=%s\n"
                    % (e["id"], e["lugar"], url_base, fichas[e["id"]]))
        f.write("\n")
        for equipo, ruta in recorridos.items():
            f.write("%s\n" % equipo)
            for i, e in enumerate(ruta, 1):
                f.write("   %d. [%s] %-46s respuesta: %-12s da: %s\n"
                        % (i, e["id"], e["lugar"], e["respuesta"], e["fragmento"]))
            f.write("\n")

    # El orden de cada equipo, en JSON, para que las pruebas puedan recorrerlo.
    with open(SALIDA_ORDEN, "w", encoding="utf-8") as f:
        json.dump({"rutas": {eq: [e["id"] for e in ruta]
                             for eq, ruta in recorridos.items()},
                   "fichas": fichas,
                   "arranques": arranques},
                  f, ensure_ascii=False, indent=1)

    with open(os.path.join(RAIZ, "pistas", "codigos-arranque.html"), "w",
              encoding="utf-8") as f:
        f.write(hoja_codigos(cfg, recorridos, arranques))

    print("  js/pistas-datos.js       %d equipos x %d estaciones, todo cifrado"
          % (len(equipos), len(estaciones)))
    print("  pistas/carteles.html     %d carteles para imprimir" % len(estaciones))
    print("  pistas/codigos-arranque.html  los %d codigos, para la organizacion"
          % len(equipos))
    print("  herramientas/rutas.txt   los recorridos y las respuestas (no se publica)")
    print()
    if nuevas or codigos_nuevos:
        print("  NUEVOS (habra que reimprimir): %s"
              % ", ".join(["cartel " + x for x in nuevas] + codigos_nuevos))
    else:
        print("  Se reutilizaron los codigos y los QR de antes: lo ya impreso vale.")
    print()
    print("  clave final: %s" % clave_final)
    print("  Cada equipo empieza en una estacion distinta, para que no se amontonen.")


if __name__ == "__main__":
    sys.exit(main())
