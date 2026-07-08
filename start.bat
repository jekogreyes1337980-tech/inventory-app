@echo off
cd /d "%~dp0"

echo Inventory App - Waiting for system to be ready...
timeout /t 15 /nobreak >nul

echo Starting Backend Server on http://localhost:3000...
start "Inventory App - Backend" cmd /k "cd /d "%~dp0" && npm run dev"

echo Waiting for backend to initialize...
timeout /t 5 /nobreak >nul

echo Starting Frontend Client on http://localhost:5173...
start "Inventory App - Frontend" cmd /k "cd /d "%~dp0" && npm run dev:client"

echo.
echo Both servers are running!
echo Open http://localhost:5173/login in your browser.
timeout /t 5 /nobreak >nul
exit
