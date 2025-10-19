@echo off
echo ====================================
echo  COPYING ALL ASSETS FOR RENDER
echo ====================================
echo.

REM Create directories
if not exist "static\images" mkdir "static\images"
if not exist "static\lessons" mkdir "static\lessons"
if not exist "static\css" mkdir "static\css"
if not exist "static\javascript" mkdir "static\javascript"

echo [1/5] Copying lesson JSON files...
copy /Y "lessons\*.json" "static\lessons\" >nul 2>&1
if %errorlevel% equ 0 (echo    OK: Lesson JSON files copied) else (echo    WARN: Some lesson files missing)

echo [2/5] Copying ALL images (this may take a moment)...
copy /Y "images\*.jpg" "static\images\" >nul 2>&1
copy /Y "images\*.JPG" "static\images\" >nul 2>&1
copy /Y "images\*.png" "static\images\" >nul 2>&1
copy /Y "images\*.svg" "static\images\" >nul 2>&1
echo    OK: Images copied

echo [3/5] Copying grade lesson JS files...
copy /Y "grade5-lessons.js" "static\" >nul 2>&1 && echo    OK: grade5-lessons.js
copy /Y "grade6-lessons.js" "static\" >nul 2>&1 && echo    OK: grade6-lessons.js
copy /Y "grade7-lessons.js" "static\" >nul 2>&1 && echo    OK: grade7-lessons.js
copy /Y "grade8-lessons.js" "static\" >nul 2>&1 && echo    OK: grade8-lessons.js

echo [4/5] Copying other JavaScript files...
copy /Y "reading.js" "static\" >nul 2>&1
copy /Y "dashboard.js" "static\" >nul 2>&1
copy /Y "lessons.js" "static\" >nul 2>&1
copy /Y "script.js" "static\" >nul 2>&1
copy /Y "speaking.js" "static\" >nul 2>&1
echo    OK: JavaScript files copied

echo [5/5] Copying CSS files...
copy /Y "dashboard.css" "static\" >nul 2>&1
copy /Y "lessons.css" "static\" >nul 2>&1
copy /Y "style.css" "static\" >nul 2>&1
copy /Y "speaking-minimal.css" "static\" >nul 2>&1
echo    OK: CSS files copied

echo.
echo ====================================
echo  COMPLETE! All assets ready
echo ====================================
echo.
echo Next steps:
echo   1. git add static/
echo   2. git commit -m "Add all static assets for Render"
echo   3. git push origin main
echo.
pause
