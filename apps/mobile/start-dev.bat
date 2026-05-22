@echo off
cd /d "%~dp0"
set EXPO_NO_METRO_WORKSPACE_ROOT=1
npx expo start --lan --reset-cache
pause
