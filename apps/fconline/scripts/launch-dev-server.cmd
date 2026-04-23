@echo off
setlocal

cd /d "%~dp0.."

echo Starting FConline dev server on port 4000...
echo Local:   http://localhost:4000
echo Network: use this PC's LAN IP on port 4000
echo.

call ..\..\node_modules\.bin\next.cmd dev --webpack --hostname 0.0.0.0 --port 4000

echo.
echo Dev server exited with code %ERRORLEVEL%.
pause
