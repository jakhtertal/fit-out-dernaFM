@echo off
echo.
echo =============================================
echo   DERNA FM - SUMOU GATE MADINAH
echo   Starting Application...
echo =============================================
echo.
echo Backend  -> http://localhost:3001
echo Frontend -> http://localhost:5173
echo.

start "DERNA FM - Backend"  cmd /k "cd /d "%~dp0backend"  && node index.js"
timeout /t 2 /nobreak >nul
start "DERNA FM - Frontend" cmd /k "cd /d "%~dp0frontend" && npm run dev"
timeout /t 3 /nobreak >nul

echo Opening browser...
start http://localhost:5173
