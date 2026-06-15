@echo off
REM Chay phan tich AI mot lan roi thoat. Dung cho Windows Task Scheduler (7h sang).
REM Khong phu thuoc uvicorn co dang chay hay khong.

cd /d "%~dp0"
if not exist "logs" mkdir "logs"

REM Log tieng Viet dung UTF-8, khong bi escape \uXXXX
set PYTHONUTF8=1
set PYTHONIOENCODING=utf-8

echo. >> "logs\daily_ai.log"
echo ===== %DATE% %TIME% ===== >> "logs\daily_ai.log"
".venv\Scripts\python.exe" run_once.py >> "logs\daily_ai.log" 2>&1
