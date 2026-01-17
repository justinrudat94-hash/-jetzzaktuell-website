@echo off
REM JETZZ APP - GitHub Push Script (Windows)
REM Dieses Script pusht dein Projekt zu GitHub

echo =========================================
echo JETZZ APP - GitHub Push
echo =========================================
echo.

REM Schritt 1: GitHub Repository URL eingeben
echo Schritt 1: Erstelle zuerst ein Repository auf GitHub:
echo - Gehe zu: https://github.com/new
echo - Repository Name: jetzz-app (oder beliebiger Name)
echo - Waehle: Private oder Public
echo - NICHT 'Initialize with README' anklicken
echo - Klicke 'Create repository'
echo.
set /p created="Hast du das Repository erstellt? (j/n): "

if not "%created%"=="j" (
    echo Bitte erstelle zuerst das Repository auf GitHub!
    pause
    exit /b 1
)

echo.
set /p repo_url="Gib die Repository URL ein (z.B. https://github.com/username/jetzz-app.git): "

REM Branch auf main umbenennen
echo.
echo Branch wird auf 'main' umbenannt...
git branch -M main

REM Remote hinzufuegen
echo Remote Repository wird verbunden...
git remote add origin %repo_url%

REM Push zu GitHub
echo.
echo Projekt wird zu GitHub gepusht...
echo WICHTIG: Wenn nach Authentifizierung gefragt wird:
echo - Username: Dein GitHub Username
echo - Password: Personal Access Token (NICHT dein Passwort!)
echo   Token erstellen: https://github.com/settings/tokens/new
echo.

git push -u origin main

if %errorlevel% equ 0 (
    echo.
    echo =========================================
    echo ERFOLGREICH!
    echo =========================================
    echo.
    echo Dein Code ist jetzt auf GitHub!
    echo.
    echo NAECHSTER SCHRITT: Vercel Deployment
    echo 1. Gehe zu: https://vercel.com/login
    echo 2. Melde dich mit GitHub an
    echo 3. Klicke 'Add New Project'
    echo 4. Waehle dein 'jetzz-app' Repository
    echo 5. Setze Root Directory auf: web
    echo 6. Klicke 'Deploy'
    echo.
    echo Siehe GITHUB-PUSH-ANLEITUNG.md fuer Details!
) else (
    echo.
    echo =========================================
    echo FEHLER beim Push
    echo =========================================
    echo.
    echo Moegliche Loesungen:
    echo 1. Stelle sicher, dass du ein Personal Access Token verwendest
    echo 2. Pruefe die Repository URL
    echo 3. Versuche es manuell mit:
    echo    git push -u origin main
)

echo.
pause
