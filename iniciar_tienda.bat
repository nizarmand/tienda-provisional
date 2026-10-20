@echo off
cd /d "%~dp0"

if not exist ".venv\Scripts\python.exe" (
    echo Creando entorno virtual...
    python -m venv .venv
    if errorlevel 1 goto error
)

".venv\Scripts\python.exe" -c "import flask" >nul 2>&1
if errorlevel 1 (
    echo Instalando dependencias...
    ".venv\Scripts\python.exe" -m pip install --quiet -r requirements.txt
    if errorlevel 1 goto error
)

echo.
echo Tienda NIZAR disponible en http://127.0.0.1:5000
echo Pulsa Ctrl+C para detener el servidor.
echo.
start "" powershell -NoProfile -WindowStyle Hidden -Command "Start-Sleep -Seconds 2; Start-Process 'http://127.0.0.1:5000'"
".venv\Scripts\python.exe" app.py
goto end

:error
echo.
echo No se pudo preparar el entorno. Comprueba que Python esta instalado.
pause

:end
