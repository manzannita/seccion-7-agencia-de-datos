@echo off
rem Lanzador de SECCION 7. Levanta el servidor local y abre el juego.
cd /d "%~dp0"

where python >nul 2>nul
if %errorlevel%==0 (
  python jugar.py
  goto fin
)

where py >nul 2>nul
if %errorlevel%==0 (
  py jugar.py
  goto fin
)

echo.
echo   No encontre Python en este equipo.
echo   Instalalo desde https://www.python.org/downloads/
echo   y marca la casilla "Add Python to PATH".
echo.
pause
:fin
