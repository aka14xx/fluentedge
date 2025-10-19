@echo off
echo ========================================
echo   FLUENTEDGE - COMPLETE RENDER SETUP
echo ========================================
echo.
echo This will:
echo   1. Copy ALL images, lessons, CSS, JS to static/
echo   2. Stage everything for Git
echo   3. Commit and push to trigger Render deploy
echo.
pause

echo.
echo [Step 1/4] Copying ALL assets to static/...
call prepare_for_render.bat

echo.
echo [Step 2/4] Checking Git status...
git status

echo.
echo [Step 3/4] Adding all files to Git...
git add static/
git add webApp.py
git add api.py
git add requirements.txt
git add templates/
echo    Files staged for commit

echo.
echo [Step 4/4] Committing and pushing to Render...
git commit -m "Complete Render fix: All assets, simplified API, no AI libs"
git push origin main

echo.
echo ========================================
echo   DEPLOYMENT STARTED!
echo ========================================
echo.
echo Your Render site will rebuild in 2-3 minutes.
echo.
echo What to expect:
echo   ✓ Dashboard with full styling
echo   ✓ All grade pages with lesson cards
echo   ✓ Avatar images showing
echo   ✓ Lesson thumbnails visible
echo   ✓ Fast loading (no AI libraries)
echo.
echo If something still looks wrong:
echo   1. Wait 3 full minutes for deploy
echo   2. Hard refresh your browser (Ctrl+Shift+R)
echo   3. Check Render logs for any errors
echo.
pause
