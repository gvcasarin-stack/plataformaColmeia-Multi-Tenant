@echo off
REM Script de Teste: Chamar API available-billing via curl
REM
REM IMPORTANTE: Substitua INSIRA_SUA_URL pela URL real da aplicação
REM Exemplos:
REM   - http://localhost:3000
REM   - https://seuapp.vercel.app
REM
REM USO: test-available-billing-api.bat

set PROJECT_ID=3e77f97a-94a4-42b0-aefd-52e39b53734c
set TENANT_ID=061ff77b-8b3a-4732-9158-a574c1f1690a
set BASE_URL=INSIRA_SUA_URL

echo.
echo ================================
echo Teste API available-billing
echo ================================
echo.
echo Projeto ID: %PROJECT_ID%
echo Tenant ID: %TENANT_ID%
echo Base URL: %BASE_URL%
echo.
echo Chamando API...
echo.

curl -X GET "%BASE_URL%/api/admin/projects/%PROJECT_ID%/available-billing" ^
  -H "Content-Type: application/json" ^
  -H "x-tenant-id: %TENANT_ID%" ^
  -v

echo.
echo.
echo ================================
echo Teste concluído
echo ================================
pause
