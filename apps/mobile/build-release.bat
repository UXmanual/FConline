@echo off
setlocal

set JAVA_HOME=C:\Program Files\Microsoft\jdk-17.0.18.8-hotspot
set EXPO_NO_METRO_WORKSPACE_ROOT=1
set KEYSTORE=C:\Users\Rich\fconline-ground\apps\mobile\keystore\release.keystore
set KS_PASS=140614
set KEY_ALIAS=fcoground
set KEY_PASS=140614

echo [0/8] Stopping Gradle daemons and killing Java processes...
if exist android\gradlew.bat (
  cd android
  call .\gradlew.bat --stop >nul 2>&1
  cd ..
)
taskkill /F /IM java.exe >nul 2>&1
timeout /t 2 /nobreak >nul

echo [1/8] Running expo prebuild...
call npx expo prebuild --platform android --clean
if %errorlevel% neq 0 (echo prebuild failed & exit /b 1)

echo [2/8] Patching build.gradle (monorepo root fix)...
powershell -Command "(Get-Content android\app\build.gradle) -replace '// root = file\(\"../../\"\)', 'root = file(\"../../\")' | Set-Content android\app\build.gradle"

echo [3/8] Patching gradle.properties (JVM memory + Java home)...
powershell -Command "$lines = (Get-Content android\gradle.properties) -replace 'org.gradle.jvmargs=.*', 'org.gradle.jvmargs=-Xmx4096m -XX:MaxMetaspaceSize=1024m'; $lines = $lines | Where-Object { $_ -notmatch 'org.gradle.java.home' }; $lines += 'org.gradle.java.home=C:\\Program Files\\Microsoft\\jdk-17.0.18.8-hotspot'; $lines | Set-Content android\gradle.properties"

echo [4/8] Writing local.properties (Android SDK path)...
echo sdk.dir=C\:\\Users\\Rich\\AppData\\Local\\Android\\Sdk> android\local.properties

echo [5/8] Copying google-services.json...
copy /Y google-services.json android\app\google-services.json

echo [6/8] Patching dark mode window background...
mkdir android\app\src\main\res\values-night 2>nul
(
echo ^<resources^>
echo   ^<style name="AppTheme" parent="Theme.AppCompat.DayNight.NoActionBar"^>
echo     ^<item name="android:windowBackground"^>#121318^</item^>
echo     ^<item name="android:statusBarColor"^>#121318^</item^>
echo   ^</style^>
echo ^</resources^>
) > android\app\src\main\res\values-night\styles.xml

echo [7/8] Adding Google Services plugin...
powershell -Command "$f='android\app\build.gradle'; $c=Get-Content $f -Raw; if ($c -notmatch 'com.google.gms.google-services') { Add-Content $f \"`napply plugin: 'com.google.gms.google-services'\" }"
powershell -Command "$f='android\build.gradle'; $c=Get-Content $f -Raw; if ($c -notmatch 'com.google.gms:google-services') { (Get-Content $f) -replace '(classpath\(''org.jetbrains.kotlin:kotlin-gradle-plugin''\))', \"`$1`n    classpath('com.google.gms:google-services:4.4.2')\" | Set-Content $f }"

echo [8/8] Clearing app build cache and building AAB...
if exist android\app\build (
  rd /s /q android\app\build >nul 2>&1
)
cd android
call .\gradlew.bat bundleRelease ^
  -Pandroid.injected.signing.store.file=%KEYSTORE% ^
  -Pandroid.injected.signing.store.password=%KS_PASS% ^
  -Pandroid.injected.signing.key.alias=%KEY_ALIAS% ^
  -Pandroid.injected.signing.key.password=%KEY_PASS%
if %errorlevel% neq 0 (cd .. & echo Build failed & exit /b 1)
cd ..

for /f "tokens=2 delims=:," %%v in ('findstr /r "\"version\"" app.json') do set APP_VER=%%v
set APP_VER=%APP_VER: =%
set APP_VER=%APP_VER:"=%
copy /Y android\app\build\outputs\bundle\release\app-release.aab fcoground-%APP_VER%.aab

echo.
echo Build complete!
echo AAB: fcoground-%APP_VER%.aab
