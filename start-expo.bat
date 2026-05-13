@echo off
cd /d C:\Users\llama109\fconline

echo [1/3] npm install...
call npm install --silent

echo [2/3] Metro 서버 시작...
set "EXPO_NO_DEPENDENCY_VALIDATION=true"
set "REACT_NATIVE_PACKAGER_HOSTNAME=172.30.1.62"
start "Metro" cmd /k "cd /d C:\Users\llama109\fconline\apps\mobile && set EXPO_NO_DEPENDENCY_VALIDATION=true && set REACT_NATIVE_PACKAGER_HOSTNAME=172.30.1.62 && npx expo start"

echo Metro 시작 대기 중...
timeout /t 8 /nobreak > nul

echo [3/3] iOS 번들 pre-warm (Expo Go 타임아웃 방지)...
curl -s -m 120 "http://172.30.1.62:8081/node_modules/expo-router/entry.bundle?platform=ios&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.bytecode=1&transform.routerRoot=app&unstable_transformProfile=hermes-stable" -o nul
echo.
echo 완료! Expo Go에서 QR 코드 스캔하세요.
pause
