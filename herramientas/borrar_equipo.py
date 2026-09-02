# Borra un equipo de la base y todo lo que hizo.
#
# PARA QUÉ
# Para poder probar el juego sin miedo. Si juegas una partida completa para
# comprobar que todo funciona, esa partida queda registrada como si fuera de un
# equipo de verdad y ensucia el marcador. Con esto se deshace: se borra la fila
# del equipo y, en cascada, todos sus intentos y sus sabotajes.
#
# Ni la clave pública ni la del panel pueden borrar nada (solo insertan y leen),
# así que esto se conecta directamente a Postgres con la cadena guardada en
# herramientas/.conexion, la misma que usa aplicar_sql.py.
#
#   python herramientas/borrar_equipo.py                  ver qué hay
#   python herramientas/borrar_equipo.py "PyHunters"      borrar ese equipo
#
# Pide confirmación escribiendo BORRAR antes de tocar nada.

import sys

from aplicar_sql import cadena_conexion, conectar


def equipos(con):
    """Cada equipo con lo que lleva hecho, del más reciente al más viejo.

    pg8000.native no usa cursores: con.run() devuelve las filas directamente.
    """
    return con.run("""
        select e.id, e.nombre, e.creado_en,
               (select count(*) from intentos i where i.equipo_id = e.id),
               (select count(*) from intentos i
                 where i.equipo_id = e.id and i.paso),
               (select count(*) from sabotajes s where s.de_equipo = e.id)
          from equipos e
         order by e.creado_en desc
    """) or []


def mostrar(filas):
    if not filas:
        print("  No hay ningún equipo registrado todavía.")
        return
    print("  %-26s %-17s %8s %8s %10s" %
          ("EQUIPO", "CUÁNDO", "INTENTOS", "ACIERTOS", "SABOTAJES"))
    print("  " + "-" * 74)
    for _, nombre, cuando, intentos, aciertos, sabotajes in filas:
        print("  %-26s %-17s %8d %8d %10d"
              % (nombre[:26], str(cuando)[:16], intentos, aciertos, sabotajes))


def main():
    try:
        con = conectar(cadena_conexion())
    except Exception as fallo:                       # noqa: BLE001
        print("  No se pudo conectar: %s" % fallo)
        print("  Si la contraseña cambió, borra herramientas/.conexion y reintenta.")
        return 1

    filas = equipos(con)

    if len(sys.argv) < 2:
        print()
        print("  EQUIPOS REGISTRADOS")
        print()
        mostrar(filas)
        print()
        print('  Para borrar uno:  python herramientas/borrar_equipo.py "NOMBRE"')
        print("  Se borra el equipo y, con él, sus intentos y sus sabotajes.")
        return 0

    buscado = sys.argv[1]
    coinciden = [f for f in filas if f[1] == buscado]

    if not coinciden:
        print('  No hay ningún equipo que se llame exactamente "%s".' % buscado)
        print("  Los que hay:")
        mostrar(filas)
        return 1

    print()
    print('  SE VA A BORRAR "%s"' % buscado)
    print()
    if len(coinciden) > 1:
        print("  OJO: hay %d equipos con ese nombre. Se borran TODOS." % len(coinciden))
        print()
    mostrar(coinciden)
    total = sum(f[3] for f in coinciden)
    print()
    print("  Desaparecen %d fila(s) de equipo y %d intento(s). No se puede deshacer."
          % (len(coinciden), total))
    print()

    try:
        respuesta = input("  Escribe BORRAR para confirmar: ").strip()
    except EOFError:
        respuesta = ""
    if respuesta != "BORRAR":
        print("  No se ha tocado nada.")
        return 0

    # intentos y sabotajes se van solos: la clave foránea es on delete cascade.
    con.run("delete from equipos where nombre = :n", n=buscado)

    print()
    print("  Borrado: %d equipo(s) fuera, con todo lo que habían hecho."
          % len(coinciden))
    print()
    print("  COMO QUEDA LA BASE")
    print()
    mostrar(equipos(con))
    return 0


if __name__ == "__main__":
    sys.exit(main())
