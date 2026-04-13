@echo off
setlocal

cd /d "%~dp0.."

echo Starting FConline preview server on port 4000...
echo Local:   http://localhost:4000
echo Network: http://172.30.1.62:4000
echo.

call ..\..\node_modules\.bin\next.cmd start --hostname 0.0.0.0 --port 4000

echo.
echo Preview server exited with code %ERRORLEVEL%.
pause
