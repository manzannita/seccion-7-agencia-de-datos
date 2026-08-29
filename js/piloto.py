"""
SECCIÓN 7 — piloto.py
Corre el código de los equipos contra los casos de prueba, DENTRO de Python.

Este archivo se ejecuta en el intérprete de Python del navegador (Pyodide) y
también se puede correr con el Python de la máquina, que es como lo prueba
pruebas/verificar_python.py. Una sola fuente de verdad para las dos cosas.

Protección contra bucles infinitos: sys.settrace instala un vigilante que se
dispara en cada línea ejecutada y corta pasado el límite de tiempo. Sin esto,
un `while True:` congelaría el intérprete y habría que recargarlo entero,
perdiendo varios segundos y el trabajo del equipo.
"""

import json
import sys
import time
import io
import contextlib

LIMITE_SEG = 2.0
MAX_LINEAS_LOG = 40


class TiempoAgotado(Exception):
    pass


def _vigilante(limite):
    """Devuelve un trazador que corta la ejecución al pasarse del tiempo."""
    def trazar(marco, evento, arg):
        if time.monotonic() > limite:
            raise TiempoAgotado()
        return trazar
    return trazar


def _normalizar(v):
    """Tuplas y listas se comparan igual: el equipo puede devolver cualquiera."""
    if isinstance(v, tuple):
        return [_normalizar(x) for x in v]
    if isinstance(v, list):
        return [_normalizar(x) for x in v]
    if isinstance(v, dict):
        return {k: _normalizar(x) for k, x in v.items()}
    return v


def igual(a, b):
    a, b = _normalizar(a), _normalizar(b)
    if isinstance(a, bool) or isinstance(b, bool):
        return a is b
    if isinstance(a, (int, float)) and isinstance(b, (int, float)):
        return abs(a - b) < 1e-9
    if isinstance(a, list) and isinstance(b, list):
        return len(a) == len(b) and all(igual(x, y) for x, y in zip(a, b))
    if isinstance(a, dict) and isinstance(b, dict):
        if set(a.keys()) != set(b.keys()):
            return False
        return all(igual(a[k], b[k]) for k in a)
    return a == b


def ver(v):
    """Cómo se le muestra un valor al equipo.

    Con repr y no con json.dumps: el equipo escribe Python, así que lo que
    obtuvo tiene que verse como Python. json.dumps devolvería null, true y
    false, que en Python no existen y solo confunden.
    """
    try:
        return repr(_normalizar(v))
    except Exception:
        return str(v)


def revisar(codigo):
    """Chequeo de sintaxis en vivo. Compila, no ejecuta nada."""
    try:
        compile(codigo, "<editor>", "exec")
        return json.dumps({"ok": True, "mensaje": "sintaxis correcta"})
    except SyntaxError as e:
        linea = e.lineno if e.lineno else "?"
        return json.dumps({"ok": False, "mensaje": "línea %s: %s" % (linea, e.msg)})
    except Exception as e:
        return json.dumps({"ok": False, "mensaje": str(e)})


def correr(codigo, funcion, casos_json):
    """Ejecuta el código del equipo contra los casos y devuelve un informe JSON."""
    casos = json.loads(casos_json)
    registros = []

    # 1) compilar
    try:
        objeto = compile(codigo, "<editor>", "exec")
    except SyntaxError as e:
        linea = e.lineno if e.lineno else "?"
        return json.dumps({
            "error": "Tu código no compila — línea %s: %s" % (linea, e.msg),
            "registros": registros
        }, ensure_ascii=False)

    # 2) ejecutar el módulo del equipo (definiciones, imports, etc.)
    ambito = {"__name__": "__main__"}
    captura = io.StringIO()
    limite = time.monotonic() + LIMITE_SEG
    try:
        sys.settrace(_vigilante(limite))
        with contextlib.redirect_stdout(captura):
            exec(objeto, ambito)
    except TiempoAgotado:
        sys.settrace(None)
        return json.dumps({
            "error": "Tu código tardó más de %g segundos. ¿Se quedó en un bucle infinito?" % LIMITE_SEG,
            "corte": True, "registros": registros
        }, ensure_ascii=False)
    except BaseException as e:
        sys.settrace(None)
        return json.dumps({
            "error": "Tu código falló al cargarse: %s: %s" % (type(e).__name__, e),
            "registros": _cortar(captura)
        }, ensure_ascii=False)
    finally:
        sys.settrace(None)

    registros = _cortar(captura)

    # 3) buscar la función pedida
    fn = ambito.get(funcion)
    if not callable(fn):
        return json.dumps({
            "error": "No encontré una función llamada %s. Revisa que el nombre esté escrito igual." % funcion,
            "registros": registros
        }, ensure_ascii=False)

    # 4) correr cada caso, cada uno con su propio reloj
    resultados = []
    for n, caso in enumerate(casos):
        fila = {
            "n": n,
            "oculto": bool(caso.get("oculto")),
            "entrada": ver(caso.get("entrada", [])),
            "esperado": ver(caso.get("salida")),
        }
        captura = io.StringIO()
        limite = time.monotonic() + LIMITE_SEG
        try:
            sys.settrace(_vigilante(limite))
            with contextlib.redirect_stdout(captura):
                obtuvo = fn(*caso.get("entrada", []))
            sys.settrace(None)
            fila["obtenido"] = ver(obtuvo)
            fila["paso"] = igual(obtuvo, caso.get("salida"))
        except TiempoAgotado:
            sys.settrace(None)
            fila["paso"] = False
            fila["fallo"] = "tardó demasiado — ¿bucle infinito?"
            resultados.append(fila)
            registros += _cortar(captura)
            return json.dumps({
                "resultados": resultados,
                "registros": registros[:MAX_LINEAS_LOG],
                "corte": True
            }, ensure_ascii=False)
        except BaseException as e:
            sys.settrace(None)
            fila["paso"] = False
            fila["fallo"] = "%s: %s" % (type(e).__name__, e)
        finally:
            sys.settrace(None)
        registros += _cortar(captura)
        resultados.append(fila)

    return json.dumps({
        "resultados": resultados,
        "registros": registros[:MAX_LINEAS_LOG]
    }, ensure_ascii=False)


def _cortar(captura):
    texto = captura.getvalue()
    if not texto:
        return []
    return texto.rstrip("\n").split("\n")[:MAX_LINEAS_LOG]
