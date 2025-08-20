@echo off
echo ========================================
echo    DEPLOY COLMEIA PROJETOS - VERCEL
echo ========================================

:: Verificar se Node.js está instalado
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERRO] Node.js não encontrado. 
    echo Por favor, reinstale o Node.js ou reinicie o terminal.
    pause
    exit /b 1
)

echo [INFO] Node.js encontrado: 
node --version

:: Instalar Vercel CLI
echo [INFO] Instalando Vercel CLI...
npm install -g vercel

:: Fazer login na Vercel (se necessário)
echo [INFO] Fazendo login na Vercel...
vercel login

:: Fazer deploy
echo [INFO] Iniciando deploy...
vercel --prod

echo [SUCESSO] Deploy concluído!
echo Acesse: https://plataforma-colmeia27-03.vercel.app
pause 