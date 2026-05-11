@echo off
setlocal
cd /d "%~dp0apps\api"
call npm.cmd run dev
pause
