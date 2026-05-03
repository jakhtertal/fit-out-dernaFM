@echo off
echo.
echo =============================================
echo   DERNA FM - Installing Dependencies
echo =============================================
echo.

echo [1/2] Installing Backend dependencies...
cd /d "%~dp0backend"
call npm install
if %errorlevel% neq 0 (echo ERROR: Backend install failed & pause & exit /b 1)

echo.
echo [2/2] Installing Frontend dependencies...
cd /d "%~dp0frontend"
call npm install
if %errorlevel% neq 0 (echo ERROR: Frontend install failed & pause & exit /b 1)

echo.
echo =============================================
echo   Installation Complete!
echo   Run start.bat to launch the application.
echo =============================================
pause
