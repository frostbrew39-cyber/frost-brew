@echo off
cd /d "%~dp0"
start "ZenPOS API" cmd /c "npm run dev:api"
start "ZenPOS POS" cmd /c "npm run dev:pos"
echo Servers are starting in new windows...
pause
