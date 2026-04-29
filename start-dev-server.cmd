@echo off
setlocal

pushd "%~dp0"
call npx --yes live-server . --host=127.0.0.1 --port=3000 --open=index.html --watch=.
set EXIT_CODE=%ERRORLEVEL%
popd

exit /b %EXIT_CODE%
