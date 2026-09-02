"""
Aplica herramientas/supabase.sql a la base de datos, sin copiar ni pegar nada.

    python herramientas/aplicar_sql.py

LA CONTRASEÑA NO SE ESCRIBE AQUÍ NI SE MANDA A NADIE.
La primera vez pide la cadena de conexión y la guarda en herramientas/.conexion,
que está en .gitignore y nunca se sube ni se publica. Las veces siguientes ya
no pregunta nada.

Dónde encontrar la cadena: en Supabase, botón "Connect" arriba del todo ->
pestaña "Session pooler" o "Direct connection" -> copiar el URI. Se ve así:

    postgresql://postgres.xxxxx:TU_CONTRASENA@aws-0-us-east-1.pooler.supabase.com:5432/postgres

Si no te acuerdas de la contraseña, se puede cambiar en
Project Settings -> Database -> Reset database password.
"""
import getpass
import os
import re
import sys
from urllib.parse import urlparse, unquote

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
GUARDADO = os.path.join(RAIZ, "herramientas", ".conexion")
ESQUEMA = os.path.join(RAIZ, "herramientas", "supabase.sql")

try:
    import pg8000.native
except ImportError:
    raise SystemExit("Falta el cliente de Postgres. Instálalo con:\n"
                     "    python -m pip install pg8000")


def revisar(cad):
    """Devuelve el motivo por el que la cadena no sirve, o None si esta bien.

    Se comprueba ANTES de guardar. La primera version guardaba lo que fuera y
    fallaba despues: con un valor malo dentro, todas las corridas siguientes
    morian igual y ya no volvia a preguntar. Un archivo envenenado y sin
    salida visible.
    """
    if not cad:
        return "no escribiste nada"
    if "[" in cad or "]" in cad:
        return "lleva corchetes: copiaste el ejemplo sin poner tu contrasena"
    if " " in cad.strip():
        return "lleva espacios: se corto al pegar, o eso no es la cadena"
    if not cad.startswith("postgres"):
        return "no empieza por postgresql:// (esto parece otra cosa)"
    u = urlparse(cad)
    if not u.hostname:
        return "no trae host"
    if not u.username:
        return "no trae usuario"
    if not u.password:
        return "no trae contrasena"
    return None


def pedir_cadena():
    if not sys.stdin.isatty():
        aviso = [
            "",
            "  Este script pide la contrasena por teclado y necesita una terminal.",
            "  Abre PowerShell y ejecutalo ahi:",
            "",
            "      cd " + RAIZ,
            "      python herramientas/aplicar_sql.py",
            "",
        ]
        raise SystemExit(chr(10).join(aviso))

    print("")
    print("  Necesito la cadena de conexion de tu base.")
    print("  En Supabase: boton Connect (arriba) -> Session pooler -> copiar el URI.")
    print("  Empieza por postgresql:// y lleva la contrasena de la base.")
    print("")
    print("  OJO: lo que pegues NO se vera en pantalla. Es normal.")
    print("  En esta ventana se pega con clic derecho, no con Ctrl+V.")
    print("")
    for intento in range(3):
        cad = getpass.getpass("  Pega la cadena y pulsa Enter: ").strip()
        motivo = revisar(cad)
        if motivo is None:
            return cad
        print("  Esa cadena no sirve: " + motivo)
        if intento < 2:
            print("  Intentalo de nuevo.")
            print("")
    raise SystemExit("  Tres intentos fallidos. Revisa la cadena y vuelve a ejecutarlo.")


def cadena_conexion():
    if os.path.exists(GUARDADO):
        with open(GUARDADO, encoding="utf-8") as f:
            guardada = f.read().strip()
        motivo = revisar(guardada)
        if motivo is None:
            return guardada
        # guardada pero invalida: se tira y se vuelve a preguntar, en vez de
        # fallar una y otra vez sin decir como salir del atolladero
        print("  La cadena guardada no sirve (" + motivo + "). La pido de nuevo.")
        os.remove(GUARDADO)

    cad = pedir_cadena()
    with open(GUARDADO, "w", encoding="utf-8") as f:
        f.write(cad)
    try:
        os.chmod(GUARDADO, 0o600)
    except OSError:
        pass
    print("  Guardada en herramientas/.conexion (ignorada por git).")
    return cad


def conectar(cad):
    u = urlparse(cad)
    if not u.hostname:
        raise SystemExit("Esa cadena no parece un URI de conexión.\n"
                         "Debe empezar por postgresql:// y traer usuario, contraseña y host.")
    return pg8000.native.Connection(
        user=unquote(u.username or "postgres"),
        password=unquote(u.password or ""),
        host=u.hostname,
        port=u.port or 5432,
        database=(u.path or "/postgres").lstrip("/") or "postgres",
        ssl_context=True,
        timeout=30,
    )


def trozos(sql):
    """Parte el archivo en sentencias.

    Dos trampas que costó descubrir:
    - Dentro de un bloque $$ ... $$ (el cuerpo de una funcion) el punto y coma
      NO termina la sentencia. Hay que llevar la cuenta de si estamos dentro.
    - Un trozo que EMPIEZA por comentario no se puede descartar: lleva el SQL
      detrás. Descartarlo aplicaba el esquema a medias y en silencio.
    """
    partes, actual, dentro = [], [], False
    for linea in sql.splitlines():
        if linea.count("$$") % 2 == 1:
            dentro = not dentro
        actual.append(linea)
        if not dentro and linea.rstrip().endswith(";"):
            partes.append(chr(10).join(actual))
            actual = []
    if actual:
        partes.append(chr(10).join(actual))

    # Se queda solo con los trozos que llevan SQL de verdad, mirando línea a
    # línea: que el trozo empiece con un comentario no significa que esté vacío.
    utiles = []
    for trozo in partes:
        tiene_sql = any(l.strip() and not l.strip().startswith("--")
                        for l in trozo.splitlines())
        if tiene_sql:
            utiles.append(trozo.strip())
    return utiles


def resumen(sentencia):
    limpia = re.sub(r"--.*", "", sentencia)
    limpia = " ".join(limpia.split())
    return limpia[:76] + ("…" if len(limpia) > 76 else "")


def main():
    if not os.path.exists(ESQUEMA):
        raise SystemExit("No encuentro " + ESQUEMA)
    with open(ESQUEMA, encoding="utf-8") as f:
        sql = f.read()

    cad = cadena_conexion()
    print("\n  Conectando…")
    try:
        con = conectar(cad)
    except Exception as e:
        print("\n  No pude conectar: %s" % e)
        print("  Si la contraseña cambió, borra herramientas/.conexion y vuelve a intentarlo.")
        return 1
    print("  Conectado.\n")

    partes = trozos(sql)
    consultas, fallos = [], 0
    for i, sentencia in enumerate(partes, 1):
        try:
            filas = con.run(sentencia)
            es_select = sentencia.lstrip().lower().startswith("select")
            if es_select and filas is not None:
                consultas.append((resumen(sentencia), filas, con.columns))
            print("  %2d/%d  ok    %s" % (i, len(partes), resumen(sentencia)))
        except Exception as e:
            fallos += 1
            print("  %2d/%d  FALLA %s" % (i, len(partes), resumen(sentencia)))
            print("         %s" % str(e)[:200])

    print("\n" + "=" * 70)
    print("COMPROBACIONES")
    print("=" * 70)
    for titulo, filas, cols in consultas:
        nombres = [c["name"] for c in cols] if cols else []
        print("\n  " + titulo)
        if not filas:
            print("      (sin filas)")
        for fila in filas:
            print("      " + "  ".join("%s=%s" % (n, v) for n, v in zip(nombres, fila)))

    con.close()
    print("\n" + ("  %d sentencias fallaron." % fallos if fallos else "  Todo aplicado sin errores."))
    return 1 if fallos else 0


if __name__ == "__main__":
    sys.exit(main())
