@echo off
REM ---------------------------------------------------------------
REM  LifeGain369 — starts the app in your browser.
REM
REM  You can also just double-click index.html. This launcher serves
REM  the app over http instead, which lets the browser use its full
REM  storage and allows the "Use my current location" button to work.
REM ---------------------------------------------------------------
title LifeGain369
cd /d "%~dp0"

set PORT=8777

where py >nul 2>nul
if %errorlevel%==0 (
  start "" "http://localhost:%PORT%/index.html"
  echo.
  echo   LifeGain369 is running.
  echo   Keep this window open while you use the app.
  echo   Close it when you are finished.
  echo.
  py -m http.server %PORT% --bind 127.0.0.1
  goto :eof
)

where python >nul 2>nul
if %errorlevel%==0 (
  start "" "http://localhost:%PORT%/index.html"
  echo.
  echo   LifeGain369 is running.
  echo   Keep this window open while you use the app.
  echo.
  python -m http.server %PORT% --bind 127.0.0.1
  goto :eof
)

echo Python was not found, so opening the app directly instead.
echo Everything works except the GPS button.
start "" "index.html"
pause
