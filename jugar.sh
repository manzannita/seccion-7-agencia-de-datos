#!/bin/sh
cd "$(dirname "$0")" || exit 1
if command -v python3 >/dev/null 2>&1; then exec python3 jugar.py; fi
if command -v python  >/dev/null 2>&1; then exec python  jugar.py; fi
echo "No encontré Python en este equipo. Instálalo desde https://www.python.org/downloads/"
exit 1
