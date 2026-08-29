"""
Puente para las pruebas: recibe un trabajo en JSON por la entrada estándar,
lo corre con js/piloto.py usando el Python de la máquina y devuelve el
informe por la salida estándar.

Sirve para verificar los retos sin abrir el navegador. En el juego real esto
mismo ocurre dentro de Pyodide, con el mismo js/piloto.py.
"""
import importlib.util
import json
import os
import sys

# sin .pyc: si no, cada corrida deja un __pycache__ dentro de js/
sys.dont_write_bytecode = True

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
spec = importlib.util.spec_from_file_location("piloto", os.path.join(RAIZ, "js", "piloto.py"))
piloto = importlib.util.module_from_spec(spec)
spec.loader.exec_module(piloto)

trabajo = json.loads(sys.stdin.read())
if trabajo.get("tipo") == "sintaxis":
    sys.stdout.write(piloto.revisar(trabajo["codigo"]))
else:
    sys.stdout.write(piloto.correr(
        trabajo["codigo"], trabajo["funcion"], json.dumps(trabajo["casos"])))
