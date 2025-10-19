@echo off
REM start_server.bat - launches the Flask app in a new cmd window and writes logs to logs\
if not exist "logs" mkdir "logs"
REM Use start to open a new cmd window so the current PowerShell PSReadLine doesn't interfere
start "FluentEdgeServer" cmd /c ".venv\Scripts\python.exe .\webApp.py > logs\webapp.out 2> logs\webapp.err"
echo started
