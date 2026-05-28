@echo off
setlocal EnableExtensions

set "SCRIPT_DIR=%~dp0"
cd /d "%SCRIPT_DIR%" || exit /b 1

if exist "%SCRIPT_DIR%build-config.local.bat" (
  call "%SCRIPT_DIR%build-config.local.bat"
)
if exist "%SCRIPT_DIR%build-config-aab.local.bat" (
  call "%SCRIPT_DIR%build-config-aab.local.bat"
)

if not defined JAVA_HOME if exist "C:\Program Files\Microsoft\jdk-17.0.18.8-hotspot" set "JAVA_HOME=C:\Program Files\Microsoft\jdk-17.0.18.8-hotspot"
if not defined ANDROID_SDK_ROOT if defined ANDROID_HOME set "ANDROID_SDK_ROOT=%ANDROID_HOME%"
if not defined ANDROID_SDK_ROOT if exist "C:\Users\Rich\AppData\Local\Android\Sdk" set "ANDROID_SDK_ROOT=C:\Users\Rich\AppData\Local\Android\Sdk"
if not defined KEYSTORE set "KEYSTORE=%SCRIPT_DIR%keystore\release.keystore"
if not defined GOOGLE_SERVICES_JSON set "GOOGLE_SERVICES_JSON=%SCRIPT_DIR%google-services.json"
if not defined GRADLE_USER_HOME set "GRADLE_USER_HOME=C:\tmp\fco-gradle"
set "EXPO_NO_METRO_WORKSPACE_ROOT=1"

if not defined JAVA_HOME (
  echo Missing JAVA_HOME. Set it in build-config.local.bat or the environment.
  exit /b 1
)
if not exist "%JAVA_HOME%" (
  echo JAVA_HOME path does not exist: %JAVA_HOME%
  exit /b 1
)
if not defined ANDROID_SDK_ROOT (
  echo Missing ANDROID_SDK_ROOT. Set it in build-config.local.bat or the environment.
  exit /b 1
)
if not exist "%ANDROID_SDK_ROOT%" (
  echo Android SDK path does not exist: %ANDROID_SDK_ROOT%
  exit /b 1
)
if not exist "%KEYSTORE%" (
  echo Keystore file not found: %KEYSTORE%
  exit /b 1
)
if not defined KS_PASS (
  echo Missing KS_PASS. Set it in build-config.local.bat or the environment.
  exit /b 1
)
if not defined KEY_ALIAS (
  echo Missing KEY_ALIAS. Set it in build-config.local.bat or the environment.
  exit /b 1
)
if not defined KEY_PASS (
  echo Missing KEY_PASS. Set it in build-config.local.bat or the environment.
  exit /b 1
)
if not exist "%GOOGLE_SERVICES_JSON%" (
  echo google-services.json not found: %GOOGLE_SERVICES_JSON%
  exit /b 1
)
if not exist "%GRADLE_USER_HOME%" (
  mkdir "%GRADLE_USER_HOME%" >nul 2>&1
)

echo [0/8] Stopping Gradle daemons...
if exist android\gradlew.bat (
  pushd android
  call .\gradlew.bat --stop >nul 2>&1
  popd
)
timeout /t 1 /nobreak >nul

echo [1/8] Running expo prebuild...
set CI=1
call npx expo prebuild --platform android --clean
if %errorlevel% neq 0 (echo prebuild failed & exit /b 1)

echo [2/8] Patching build.gradle (monorepo root fix)...
powershell -NoProfile -ExecutionPolicy Bypass -Command "(Get-Content android\app\build.gradle) -replace '// root = file\(\"../../\"\)', 'root = file(\"../../\")' | Set-Content android\app\build.gradle"

echo [3/8] Patching gradle.properties (JVM memory + Java home)...
powershell -NoProfile -ExecutionPolicy Bypass -Command "$javaHome = '%JAVA_HOME%'.Replace('\','/'); $lines = (Get-Content android\gradle.properties) -replace 'org.gradle.jvmargs=.*', 'org.gradle.jvmargs=-Xmx2048m -XX:MaxMetaspaceSize=512m -XX:+HeapDumpOnOutOfMemoryError'; $lines = $lines | Where-Object { $_ -notmatch 'org.gradle.java.home|org.gradle.workers.max' }; $lines += ('org.gradle.java.home=' + $javaHome); $lines += 'org.gradle.workers.max=2'; $lines | Set-Content android\gradle.properties"

echo [4/8] Writing local.properties (Android SDK path)...
> android\local.properties echo sdk.dir=%ANDROID_SDK_ROOT:\=\\%

echo [5/8] Copying google-services.json...
copy /Y "%GOOGLE_SERVICES_JSON%" android\app\google-services.json >nul
if %errorlevel% neq 0 (echo google-services copy failed & exit /b 1)

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
powershell -NoProfile -ExecutionPolicy Bypass -Command "$f='android\app\build.gradle'; $c=Get-Content $f -Raw; if ($c -notmatch 'com.google.gms.google-services') { Add-Content $f \"`napply plugin: 'com.google.gms.google-services'\" }"
powershell -NoProfile -ExecutionPolicy Bypass -Command "$f='android\build.gradle'; $c=Get-Content $f -Raw; if ($c -notmatch 'com.google.gms:google-services') { (Get-Content $f) -replace '(classpath\(''org.jetbrains.kotlin:kotlin-gradle-plugin''\))', \"`$1`n    classpath('com.google.gms:google-services:4.4.2')\" | Set-Content $f }"

echo [8/8] Clearing app build cache and building AAB...
if exist android\app\build (
  rd /s /q android\app\build >nul 2>&1
)
pushd android
call .\gradlew.bat -g "%GRADLE_USER_HOME%" bundleRelease ^
  -Pandroid.injected.signing.store.file=%KEYSTORE% ^
  -Pandroid.injected.signing.store.password=%KS_PASS% ^
  -Pandroid.injected.signing.key.alias=%KEY_ALIAS% ^
  -Pandroid.injected.signing.key.password=%KEY_PASS%
if %errorlevel% neq 0 (popd & echo Build failed & exit /b 1)
popd

for /f "tokens=2 delims=:," %%v in ('findstr /r "\"version\"" app.json') do set APP_VER=%%v
set APP_VER=%APP_VER: =%
set APP_VER=%APP_VER:"=%
copy /Y android\app\build\outputs\bundle\release\app-release.aab fcoground-%APP_VER%.aab >nul
if %errorlevel% neq 0 (echo AAB copy failed & exit /b 1)

if exist android\app\build\outputs\mapping\release\mapping.txt (
  copy /Y android\app\build\outputs\mapping\release\mapping.txt fcoground-%APP_VER%-mapping.txt >nul
)

echo.
echo Build complete!
echo AAB:     fcoground-%APP_VER%.aab
echo Mapping: fcoground-%APP_VER%-mapping.txt
echo.
echo [REQUIRED] Upload both AAB and Mapping file to Google Play Console.
echo           After uploading AAB, attach fcoground-%APP_VER%-mapping.txt as deobfuscation file.
