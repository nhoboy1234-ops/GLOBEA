@echo off
cd /d "%~dp0"
echo GLOBEA - Vietnam Edition
echo Mo trinh duyet tai http://127.0.0.1:8080
echo Giu cua so nay mo khi trinh dien. Nhan Ctrl+C de dung.
start "" "http://127.0.0.1:8080"
node server.cjs
pause
