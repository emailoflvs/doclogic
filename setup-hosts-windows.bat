@echo off
REM Add doclogic_v7 to Windows hosts - run as Administrator
REM Right-click -> Run as administrator

set HOSTS=%SystemRoot%\System32\drivers\etc\hosts
set ENTRY=127.0.0.1 doclogic_v7

findstr /C:"doclogic_v7" %HOSTS% >nul 2>&1
if %errorlevel%==0 (
    echo doclogic_v7 already in hosts
) else (
    echo %ENTRY% >> %HOSTS%
    echo Added: %ENTRY%
)
echo Done. Open http://doclogic_v7:8087/
pause
