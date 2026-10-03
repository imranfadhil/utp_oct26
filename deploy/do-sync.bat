@echo off
setlocal enabledelayedexpansion

REM ═══════════════════════════════════════════════════════════════════
REM  do-sync.bat — Push code to the DigitalOcean droplet over SSH
REM  Usage:
REM    do-sync.bat              pull code + restart containers
REM    do-sync.bat --restart    force docker rebuild
REM    do-sync.bat --from-deploy called by do-deploy.bat (first push)
REM ═══════════════════════════════════════════════════════════════════

cd /d "%~dp0"
set DEPLOY_DIR=%CD%
call do-config.bat

set BUILD=0
if "%1"=="--restart"     set BUILD=1
if "%1"=="--from-deploy" set BUILD=1

echo.
echo === SYNC - DigitalOcean ===
echo.

REM ── Resolve public IP ───────────────────────────────────────────────
set PUBLIC_IP=
if exist "%TEMP%\%PROJECT_NAME%-do-ip.txt" set /p PUBLIC_IP=<"%TEMP%\%PROJECT_NAME%-do-ip.txt"
if "%PUBLIC_IP%"=="" (
    for /f %%i in ('doctl compute droplet get %DROPLET_NAME% --format PublicIPv4 --no-header 2^>nul') do set PUBLIC_IP=%%i
)
if "%PUBLIC_IP%"=="" (
    echo [ERROR] No droplet IP found. Run do-deploy.bat first.
    exit /b 1
)
echo [INFO] Target: %PUBLIC_IP%

if not exist "%KEY_FILE%" (
    echo [ERROR] SSH key not found: %KEY_FILE%
    exit /b 1
)

REM ── Package code (exclude node_modules, .git, db files) ────────────
echo [1/4] Packaging project...
cd /d "%PROJECT_DIR%"
if exist "%TEMP%\%PROJECT_NAME%.tar" del "%TEMP%\%PROJECT_NAME%.tar"
tar -cf "%TEMP%\%PROJECT_NAME%.tar" --exclude="node_modules" --exclude=".git" --exclude="*.db" --exclude="*.db-wal" --exclude="*.db-shm" --exclude="*.db-journal" *
if %ERRORLEVEL% neq 0 (
    echo [ERROR] tar packaging failed.
    exit /b 1
)
echo [OK] Packaged.

REM ── Copy to droplet ─────────────────────────────────────────────────
echo [2/4] Ensuring remote directory exists...
ssh -o StrictHostKeyChecking=accept-new -i "%KEY_FILE%" root@%PUBLIC_IP% "mkdir -p /root/lecture-system" <nul
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Could not create remote directory. Droplet may still be booting.
    exit /b 1
)
echo [OK] Remote directory ready.

echo [3/4] Copying to droplet...
type "%TEMP%\%PROJECT_NAME%.tar" | ssh -o StrictHostKeyChecking=accept-new -i "%KEY_FILE%" root@%PUBLIC_IP% "cat > /root/lecture-system/app.tar"
set SCP_RC=%ERRORLEVEL%
del "%TEMP%\%PROJECT_NAME%.tar" 2>nul
if not %SCP_RC% equ 0 (
    echo [ERROR] scp failed. Droplet may still be booting, or SSH not ready yet.
    exit /b 1
)
echo [OK] Uploaded.

REM ── Extract + run on the droplet ───────────────────────────────────
echo [4/4] Extracting and starting containers...

set REMOTE_CMD=cd /root/lecture-system ^&^& tar -xf app.tar ^&^& rm -f app.tar ^&^& export ADMIN_PASSWORD='%ADMIN_PASSWORD%'
if %BUILD% equ 1 (
    set REMOTE_CMD=!REMOTE_CMD! ^&^& docker-compose -f deploy/docker-compose.yml up -d --build
) else (
    set REMOTE_CMD=!REMOTE_CMD! ^&^& docker-compose -f deploy/docker-compose.yml up -d
)

ssh -o StrictHostKeyChecking=accept-new -i "%KEY_FILE%" root@%PUBLIC_IP% "!REMOTE_CMD!" <nul
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Remote deploy failed. Check the droplet:
    echo         ssh -i %KEY_FILE% root@%PUBLIC_IP%
    exit /b 1
)

echo.
echo [OK] Sync complete.  http://%PUBLIC_IP%/
if %BUILD% equ 1 echo [OK] Containers rebuilt.

REM ── Grab tunnel URL from cloudflared container logs ────────────────
echo.
echo [INFO] Waiting for Cloudflare Tunnel URL...
timeout /t 12 /nobreak >nul

echo [INFO] Tunnel URL:
ssh -o StrictHostKeyChecking=accept-new -i "%KEY_FILE%" root@%PUBLIC_IP% "docker ps --filter name=cloudflared --format '{{.Names}}' | head -1 | xargs docker logs 2>&1 | grep -o 'https://[a-zA-Z0-9.-]*\.trycloudflare\.com' | head -1" <nul
if %ERRORLEVEL% neq 0 (
    echo [WARN] Tunnel URL not found yet. Check manually:
    echo        ssh -i %KEY_FILE% root@%PUBLIC_IP% docker logs deploy_cloudflared_1
)

endlocal
