# Guardia de despliegue: comprueba que la caceria de codigos QR no se filtro
# al sitio publicado.
#
# Los carteles llevan el lugar y el acertijo de cada estacion en claro, porque
# se imprimen y se pegan en la pared. Lo que se publica en internet solo puede
# llevar los cofres cifrados. Esto lo compara con el original y para el
# despliegue si algo se colo.
#
#   python3 pruebas/guardia-caceria.py _sitio

import json
import os
import sys

CARPETA = sys.argv[1] if len(sys.argv) > 1 else "_sitio"
RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ORIGINAL = os.path.join(RAIZ, "herramientas", "pistas.json")


def texto_publicado(carpeta):
    """Todo lo legible que hay dentro de la carpeta, en minusculas."""
    trozos = []
    for base, _, archivos in os.walk(carpeta):
        for nombre in archivos:
            ruta = os.path.join(base, nombre)
            try:
                with open(ruta, encoding="utf-8") as f:
                    trozos.append(f.read().lower())
            except (UnicodeDecodeError, OSError):
                pass          # binarios (las imagenes) no se revisan
    return " ".join(trozos)


def main():
    if not os.path.isdir(CARPETA):
        print("ERROR: no existe la carpeta %s" % CARPETA)
        return 1
    if not os.path.exists(ORIGINAL):
        print("ERROR: falta herramientas/pistas.json, no hay con que comparar")
        return 1

    cfg = json.load(open(ORIGINAL, encoding="utf-8"))
    todo = texto_publicado(CARPETA)

    # Los lugares y los acertijos son frases largas: se buscan tal cual.
    # Las respuestas sueltas no se buscan aqui porque son palabras cortas y
    # coincidirian por azar dentro del base64; que no se puedan sacar de los
    # cofres lo comprueba pruebas/verificar-pistas.js.
    filtrados = []
    for e in cfg["estaciones"]:
        if e["lugar"].lower() in todo:
            filtrados.append("el lugar de la estacion %s" % e["id"])
        if e["acertijo"].lower()[:24] in todo:
            filtrados.append("el acertijo de la estacion %s" % e["id"])

    # Los codigos de arranque solo los tiene la organizacion.
    orden = os.path.join(RAIZ, "herramientas", "rutas.json")
    if os.path.exists(orden):
        arranques = json.load(open(orden, encoding="utf-8")).get("arranques", {})
        for equipo, codigo in arranques.items():
            if codigo.lower() in todo:
                filtrados.append("el codigo de arranque de %s" % equipo)

    # Los dos archivos que solo se imprimen.
    for base, _, archivos in os.walk(CARPETA):
        for nombre in archivos:
            if nombre in ("carteles.html", "codigos-arranque.html"):
                filtrados.append("%s (es para imprimir)" % nombre)

    if filtrados:
        print("ERROR: la caceria se filtro al sitio:")
        for f in filtrados:
            print("   - %s" % f)
        return 1

    print("Caceria: %d estaciones revisadas, nada en claro en %s."
          % (len(cfg["estaciones"]), CARPETA))
    return 0


if __name__ == "__main__":
    sys.exit(main())
