@echo off
setlocal EnableExtensions EnableDelayedExpansion

pushd "%~dp0"

set "PORT=3000"
set "LAN_IP="
set "SECTION_IP="
set "SECTION_HAS_GATEWAY="
set "GATEWAY_PENDING="

for /f "usebackq tokens=* delims=" %%L in (`ipconfig`) do (
    set "LINE=%%L"

    if not defined LINE (
        call :maybe_use_section
        set "SECTION_IP="
        set "SECTION_HAS_GATEWAY="
        set "GATEWAY_PENDING="
    ) else (
        if not "!LINE:~0,1!"==" " if "!LINE:~-1!"==":" (
            call :maybe_use_section
            set "SECTION_IP="
            set "SECTION_HAS_GATEWAY="
            set "GATEWAY_PENDING="
        )

        if not defined SECTION_IP (
            echo(!LINE!| findstr /I "IPv4" >nul
            if not errorlevel 1 call :extract_ip "!LINE!" SECTION_IP
        )

        echo(!LINE!| findstr /I /C:"Default Gateway" >nul
        if not errorlevel 1 (
            set "GATEWAY_PENDING="
            call :extract_ip "!LINE!" GATEWAY_IP
            if defined GATEWAY_IP (
                set "SECTION_HAS_GATEWAY=1"
            ) else (
                set "GATEWAY_PENDING=1"
            )
            set "GATEWAY_IP="
        ) else if defined GATEWAY_PENDING (
            call :extract_ip "!LINE!" GATEWAY_IP
            if defined GATEWAY_IP (
                set "SECTION_HAS_GATEWAY=1"
                set "GATEWAY_PENDING="
            )
            set "GATEWAY_IP="
        )
    )
)

call :maybe_use_section

echo Local: http://localhost:%PORT%/index.html
if defined LAN_IP (
    echo Phone: http://%LAN_IP%:%PORT%/index.html
) else (
    echo Phone: Could not detect a LAN IP automatically. Run ipconfig and use your IPv4 address on port %PORT%.
)
echo(

call npx --yes live-server . --host=0.0.0.0 --port=%PORT% --open=index.html --watch=.
set EXIT_CODE=%ERRORLEVEL%
popd

exit /b %EXIT_CODE%

:maybe_use_section
if not defined LAN_IP if defined SECTION_IP if defined SECTION_HAS_GATEWAY set "LAN_IP=%SECTION_IP%"
exit /b

:extract_ip
setlocal EnableDelayedExpansion
set "VALUE=%~1"
for /f "tokens=2 delims=:" %%A in ("!VALUE!") do set "VALUE=%%A"
for /f "tokens=* delims= " %%A in ("!VALUE!") do set "VALUE=%%A"
for /f "tokens=1" %%A in ("!VALUE!") do set "VALUE=%%A"
if "!VALUE!"=="127.0.0.1" set "VALUE="
if "!VALUE:~0,8!"=="169.254." set "VALUE="
endlocal & set "%~2=%VALUE%"
exit /b
