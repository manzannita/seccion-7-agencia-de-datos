"""
Guarda una copia del intérprete de Python (Pyodide) dentro del proyecto, para
que el juego funcione SIN INTERNET.

Uso:  python herramientas/descargar_python.py

Deja los archivos en vendor/pyodide/. El juego los detecta solo: si esa carpeta
existe, usa la copia local; si no, baja el intérprete del CDN cada vez que se
abre en una máquina nueva.

Muy recomendable si la competencia es en una sede con internet dudoso: una vez
descargado, se copia la carpeta entera a cada computadora y listo.
"""
import os
import sys
import urllib.error
import urllib.request

VERSION = "v0.26.4"        # debe coincidir con PYODIDE_CDN en js/codigo.js
BASE = "https://cdn.jsdelivr.net/pyodide/%s/full/" % VERSION

# El intérprete y, además, pandas con sus dependencias: los retos lo usan.
# Sin estos últimos el juego funciona igual, pero los retos que piden un
# DataFrame no se pueden ejecutar.
ARCHIVOS = [
    "pyodide.js",
    "pyodide.asm.js",
    "pyodide.asm.wasm",
    "python_stdlib.zip",
    "pyodide-lock.json",
    # pandas y lo que necesita para arrancar
    "pandas-2.2.0-cp312-cp312-pyodide_2024_0_wasm32.whl",
    "numpy-1.26.4-cp312-cp312-pyodide_2024_0_wasm32.whl",
    "python_dateutil-2.9.0.post0-py2.py3-none-any.whl",
    "pytz-2024.1-py2.py3-none-any.whl",
    "six-1.16.0-py2.py3-none-any.whl",
]

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DESTINO = os.path.join(RAIZ, "vendor", "pyodide")


def humano(n):
    return "%.1f MB" % (n / 1048576.0) if n >= 1048576 else "%.0f KB" % (n / 1024.0)


def barra(hechos, total, nombre, bajado):
    ancho = 28
    lleno = int(ancho * hechos / total)
    sys.stdout.write("\r  [%s%s] %-20s %s   " % (
        "#" * lleno, "." * (ancho - lleno), nombre, humano(bajado)))
    sys.stdout.flush()


def bajar(nombre, indice, total):
    url = BASE + nombre
    destino = os.path.join(DESTINO, nombre)
    parcial = destino + ".parcial"
    bajado = 0
    try:
        with urllib.request.urlopen(url, timeout=60) as resp, open(parcial, "wb") as f:
            while True:
                trozo = resp.read(262144)
                if not trozo:
                    break
                f.write(trozo)
                bajado += len(trozo)
                barra(indice, total, nombre, bajado)
    except urllib.error.URLError as e:
        if os.path.exists(parcial):
            os.remove(parcial)
        raise SystemExit("\n  No pude bajar %s: %s\n  ¿Hay internet?" % (nombre, e))
    os.replace(parcial, destino)
    barra(indice + 1, total, nombre, bajado)
    print()
    return bajado


def main():
    print()
    print("  Descargando el intérprete de Python (Pyodide %s)" % VERSION)
    print("  Destino: vendor/pyodide/")
    print()
    os.makedirs(DESTINO, exist_ok=True)
    total_bytes = 0
    for i, nombre in enumerate(ARCHIVOS):
        total_bytes += bajar(nombre, i, len(ARCHIVOS))
    print()
    print("  Listo: %s en vendor/pyodide/" % humano(total_bytes))
    print("  El juego ya funciona sin internet. Copia la carpeta completa")
    print("  a cada computadora de la competencia.")
    print()
    print("  Para volver al CDN, borra la carpeta vendor/.")
    print()


if __name__ == "__main__":
    main()
