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
from urllib.parse import urlparse, unquote, quote

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


REGIONES = ["us-east-1", "us-east-2", "us-west-1", "ca-central-1", "sa-east-1",
            "eu-west-1", "eu-central-1", "ap-southeast-1"]


def referencia_del_proyecto():
    ruta = os.path.join(RAIZ, "js", "config.js")
    if not os.path.exists(ruta):
        return None
    with open(ruta, encoding="utf-8") as f:
        texto = f.read()
    m = re.search(r"https://([a-z0-9]+)\.supabase\.co", texto)
    return m.group(1) if m else None


def candidatas(ref, pwd):
    clave = quote(pwd, safe="")
    lista = ["postgresql://postgres:%s@db.%s.supabase.co:5432/postgres" % (clave, ref)]
    for reg in REGIONES:
        lista.append("postgresql://postgres.%s:%s@aws-0-%s.pooler.supabase.com:5432/postgres"
                     % (ref, clave, reg))
    return lista


def es_de_contrasena(fallo):
    f = fallo.lower()
    return "password" in f or "authentication" in f or "autenticacion" in f


def pedir_cadena():
    if not sys.stdin.isatty():
        aviso = ["",
                 "  Este script pide la contrasena por teclado y necesita una terminal.",
                 "  Abre PowerShell y ejecutalo ahi:",
                 "",
                 "      cd " + RAIZ,
                 "      python herramientas/aplicar_sql.py",
                 ""]
        raise SystemExit(chr(10).join(aviso))

    ref = referencia_del_proyecto()
    print("")
    if not ref:
        print("  Pega la cadena de conexion de Supabase (Connect -> Session pooler).")
        print("  OJO: lo que pegues NO se vera. Se pega con clic derecho.")
        print("")
        for _ in range(3):
            cad = getpass.getpass("  Cadena de conexion: ").strip()
            if "[" in cad and "]" in cad:
                pwd = getpass.getpass("  Contrasena de la base: ").strip()
                if pwd:
                    cad = re.sub(r"\[[^\]]*\]", quote(pwd, safe=""), cad, count=1)
            motivo = revisar(cad)
            if motivo is None:
                return cad
            print("  Esa cadena no sirve: " + motivo)
        raise SystemExit("  Tres intentos fallidos.")

    print("  Proyecto: " + ref + "   (leido de js/config.js)")
    print("")
    print("  Solo necesito la CONTRASENA DE LA BASE DE DATOS.")
    print("  Es la que inventaste al crear el proyecto, no la de tu cuenta.")
    print("  Si no la recuerdas, en los ajustes del proyecto busca")
    print("  'Database password' y dale a Reset para poner una nueva.")
    print("")
    print("  OJO: lo que escribas NO se vera en pantalla. Es normal.")
    print("")
    for _ in range(3):
        pwd = getpass.getpass("  Contrasena de la base de datos: ").strip()
        if not pwd:
            print("  No escribiste nada.")
            continue
        if pwd.startswith("postgres"):
            motivo = revisar(pwd)
            if motivo is None:
                return pwd
            print("  Esa cadena no sirve: " + motivo)
            continue
        print("")
        print("  Buscando por donde conectar...")
        mala = False
        for cad in candidatas(ref, pwd):
            host = urlparse(cad).hostname
            try:
                con = conectar(cad)
                con.close()
                print("  Conecta por " + host)
                return cad
            except Exception as e:
                if es_de_contrasena(str(e)):
                    mala = True
                    break
        print("  La contrasena no es correcta." if mala
              else "  No pude conectar por ninguna ruta.")
        print("")
    raise SystemExit("  Tres intentos. Cambia la contrasena en Supabase y reintenta.")



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
