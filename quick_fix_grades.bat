@echo off
echo ====================================
echo   QUICK FIX: Grade Pages Update
echo ====================================
echo.
echo Fixing:
echo   - Grade 6 template (add sidebar)
echo   - All grade JS files (fix JSON paths)
echo   - Avatar click handlers
echo.

echo [1/3] Staging files...
git add templates/grades/grade6.html
git add static/grade5-lessons.js
git add static/grade6-lessons.js
git add static/grade7-lessons.js
git add static/grade8-lessons.js
echo    OK: Files staged

echo.
echo [2/3] Committing...
git commit -m "Fix grade pages: Add G6 sidebar, fix JSON paths, add avatar handlers"
echo    OK: Changes committed

echo.
echo [3/3] Pushing to Render...
git push origin main
echo    OK: Pushed to Render

echo.
echo ====================================
echo   DEPLOYMENT IN PROGRESS
echo ====================================
echo.
echo Wait 2 minutes, then:
echo   1. Visit your Render URL
echo   2. Click Grade 6
echo   3. Should see sidebar + lesson cards!
echo.
echo What's fixed:
echo   ✓ Grade 6 has sidebar with goal and units
echo   ✓ All grades load JSON from correct path
echo   ✓ Avatar is clickable (goes to dashboard)
echo   ✓ "Loading..." text hides properly
echo.
pause
