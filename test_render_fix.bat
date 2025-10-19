@echo off
REM RENDER FIX - Start Flask server and verify styling works
echo ========================================
echo   FLUENT EDGE - Render Fix Test
echo ========================================
echo.

cd /d "%~dp0"

REM Check venv
if not exist ".venv\Scripts\python.exe" (
    echo Creating virtual environment...
    python -m venv .venv
)

REM Install minimal deps
echo Installing Flask...
.venv\Scripts\python.exe -m pip install --quiet --upgrade pip
.venv\Scripts\python.exe -m pip install --quiet flask flask-cors gunicorn

REM Stop any existing Python processes
echo Stopping existing Python processes...
tasklist /FI "IMAGENAME eq python.exe" /NH | find /I "python.exe" >nul
if %ERRORLEVEL% EQU 0 (
    taskkill /F /IM python.exe >nul 2>&1
    timeout /t 1 /nobreak >nul
)

REM Start server in background
echo Starting Flask server...
start /B .venv\Scripts\python.exe webApp.py > logs\webapp.out 2> logs\webapp.err
timeout /t 4 /nobreak >nul

REM Test endpoints
echo.
echo Testing endpoints...
echo.

.venv\Scripts\python.exe -c "import urllib.request; r=urllib.request.urlopen('http://127.0.0.1:5000/', timeout=5); print('✓ Root (/) -', r.getcode(), 'OK'); content=r.read().decode('utf-8'); print('✓ Dashboard CSS found' if 'dashboard.css' in content or 'Dashboard' in content else '✗ CSS missing')"

.venv\Scripts\python.exe -c "import urllib.request; r=urllib.request.urlopen('http://127.0.0.1:5000/dashboard', timeout=5); print('✓ Dashboard -', r.getcode(), 'OK'); content=r.read().decode('utf-8'); print('✓ Dashboard CSS link found' if 'dashboard.css' in content else '✗ Dashboard CSS link missing')"

.venv\Scripts\python.exe -c "import urllib.request; r=urllib.request.urlopen('http://127.0.0.1:5000/grades/grade5', timeout=5); print('✓ Grade 5 -', r.getcode(), 'OK'); content=r.read().decode('utf-8'); print('✓ Grade styles CSS found' if 'grade-styles.css' in content else '✗ Grade CSS missing')"

.venv\Scripts\python.exe -c "import urllib.request; r=urllib.request.urlopen('http://127.0.0.1:5000/static/dashboard.css', timeout=5); content=r.read(); print('✓ Static CSS accessible -', len(content), 'bytes')"

.venv\Scripts\python.exe -c "import urllib.request; r=urllib.request.urlopen('http://127.0.0.1:5000/static/grade-styles.css', timeout=5); content=r.read(); print('✓ Grade styles CSS accessible -', len(content), 'bytes')"

echo.
echo ========================================
echo   Server is running on http://127.0.0.1:5000
echo   Open in browser to verify styling
echo   Press any key to stop server...
echo ========================================
pause > nul

REM Cleanup
taskkill /F /IM python.exe >nul 2>&1
echo Server stopped.
