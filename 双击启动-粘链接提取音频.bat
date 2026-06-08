@echo off
setlocal EnableExtensions
title Link Audio Extractor - Local Launcher

set "APP_DIR=%~dp0"
cd /d "%APP_DIR%"

set "PATH=%APP_DIR%bin;%PATH%"
set "TMP=%APP_DIR%.runtime-tmp"
set "TEMP=%APP_DIR%.runtime-tmp"

if not exist "%TMP%" mkdir "%TMP%" >nul 2>nul
if not exist "%APP_DIR%downloads" mkdir "%APP_DIR%downloads" >nul 2>nul

where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo [ERROR] Node.js was not found, so the local server cannot start.
  echo Install Node.js, then double-click this launcher again.
  echo.
  pause
  exit /b 1
)

where yt-dlp >nul 2>nul
if errorlevel 1 (
  echo.
  echo [ERROR] yt-dlp was not found.
  echo Expected local file: "%APP_DIR%bin\yt-dlp.exe"
  echo Or install yt-dlp and add it to PATH.
  echo.
  pause
  exit /b 1
)

where ffmpeg >nul 2>nul
if errorlevel 1 (
  echo.
  echo [TIP] ffmpeg was not found. Source audio extraction can still work.
  echo MP3 export requires ffmpeg.
)

set "PORT=3847"
for /f "usebackq delims=" %%P in (`powershell -NoProfile -ExecutionPolicy Bypass -Command "$ports=3847,3848,3851; foreach ($p in $ports) { $listener = $null; try { $listener = [Net.Sockets.TcpListener]::new([Net.IPAddress]::Parse('127.0.0.1'), $p); $listener.Start(); $listener.Stop(); Write-Output $p; break } catch { if ($listener) { $listener.Stop() } } }"`) do set "PORT=%%P"

echo.
echo Starting Link Audio Extractor...
echo Project: %APP_DIR%
echo URL: http://127.0.0.1:%PORT%/
echo Save folder: shown and selectable in the web page
echo.
echo Close this window to stop the server.
echo.

start "" powershell -NoProfile -WindowStyle Hidden -Command "Start-Sleep -Seconds 2; Start-Process 'http://127.0.0.1:%PORT%/'"

set "PORT=%PORT%"
node server.js

echo.
echo Server stopped.
pause
