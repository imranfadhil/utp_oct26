@echo off
REM ═══════════════════════════════════════════════════════════════════
REM  do-config.bat — Shared config for DigitalOcean deployment
REM  Edit these values BEFORE running do-deploy.bat
REM  Prereq: doctl installed & authenticated  ->  doctl auth init
REM ═══════════════════════════════════════════════════════════════════

REM ---- Project ----
set PROJECT_NAME=utp-lecture1
REM PROJECT_DIR = repo root (this file lives in deploy\, so up one level)
set PROJECT_DIR=%~dp0..

REM ---- Droplet ----
set DROPLET_NAME=%PROJECT_NAME%-server
REM Region: sgp1 = Singapore (lowest DO latency to Malaysia).
set REGION=sgp1
REM Size: s-1vcpu-2gb (~$12/mo, hourly-billed). 2 GB RAM = headroom for ~200 sockets.
REM Use s-1vcpu-1gb (~$6/mo) to trim cost.
set SIZE=s-1vcpu-2gb
REM Docker 1-click marketplace image on Ubuntu (Docker + Compose preinstalled).
set IMAGE=docker-20-04

REM ---- SSH Key ----
REM A key of this name is registered with DO (from your local public key).
set KEY_NAME=%PROJECT_NAME%-do-key
set KEY_FILE=%USERPROFILE%\.ssh\%KEY_NAME%
set PUB_FILE=%USERPROFILE%\.ssh\%KEY_NAME%.pub

REM ---- Admin Password (locks /lecturer.html) ----
REM Leave empty to skip auth. Set a value to require it.
set ADMIN_PASSWORD=use_a_secure_password

echo [CONFIG] Project:   %PROJECT_NAME%
echo [CONFIG] Region:    %REGION%
echo [CONFIG] Droplet:   %DROPLET_NAME%  (%SIZE%, %IMAGE%)
echo.
