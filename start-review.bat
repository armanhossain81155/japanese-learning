@echo off
rem Double-click to start the local server and open the test review page.
cd /d "%~dp0"
where node >nul 2>nul || (echo Node.js is not installed. Download it from https://nodejs.org & pause & exit /b)
start "Samurai Syntax server - close this window to stop" node model-tests\serve.js
timeout /t 2 /nobreak >nul
start "" http://localhost:8080/model-tests/review.html
