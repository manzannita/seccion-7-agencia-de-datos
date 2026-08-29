"""
SECCIÓN 7 — lanzador.

Levanta un servidor local y abre el juego en el navegador.

Hace falta porque el intérprete de Python del navegador (Pyodide) carga sus
archivos con fetch(), y desde file:// el navegador bloquea esas peticiones.
Con doble clic en index.html el mundo se ve y se camina, pero la terminal de
Python no arranca.

Uso:  python jugar.py        (o doble clic en jugar.bat / ./jugar.sh)
"""
import http.server
import os
import socketserver
import sys
import threading
import webbrowser

PUERTO_INICIAL = 8777
RAIZ = os.path.dirname(os.path.abspath(__file__))


class Manejador(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=RAIZ, **kwargs)

    def log_message(self, formato, *args):
        pass  # sin ruido en la consola

    def end_headers(self):
        # Sin caché: si un organizador edita retos.js, al recargar se ve el cambio
        self.send_header("Cache-Control", "no-store")
        super().end_headers()


# El navegador rechaza un .wasm servido con el tipo equivocado, y sin eso
# Pyodide no arranca cuando está guardado en vendor/pyodide/
Manejador.extensions_map[".wasm"] = "application/wasm"
Manejador.extensions_map[".js"] = "text/javascript"
Manejador.extensions_map[".json"] = "application/json"


def buscar_puerto(desde):
    for puerto in range(desde, desde + 20):
        try:
            servidor = socketserver.TCPServer(("127.0.0.1", puerto), Manejador)
            servidor.allow_reuse_address = True
            return servidor, puerto
        except OSError:
            continue
    return None, None


def main():
    servidor, puerto = buscar_puerto(PUERTO_INICIAL)
    if servidor is None:
        print("No encontré un puerto libre entre %d y %d." % (PUERTO_INICIAL, PUERTO_INICIAL + 19))
        return 1

    url = "http://localhost:%d/index.html" % puerto
    offline = os.path.isdir(os.path.join(RAIZ, "vendor", "pyodide"))

    print()
    print("  SECCIÓN 7 — Agencia de Datos")
    print("  " + "-" * 46)
    print("  Jugando en:  " + url)
    print("  Python:      " + ("copia local, funciona sin internet" if offline
                               else "se baja del CDN la primera vez (hace falta internet)"))
    if not offline:
        print("               para dejarlo sin internet:")
        print("               python herramientas/descargar_python.py")
    print()
    print("  Para cerrar: Ctrl+C en esta ventana")
    print()

    threading.Timer(1.0, lambda: webbrowser.open(url)).start()
    try:
        servidor.serve_forever()
    except KeyboardInterrupt:
        print("\n  Servidor cerrado. Hasta la próxima.")
    finally:
        servidor.server_close()
    return 0


if __name__ == "__main__":
    sys.exit(main())
