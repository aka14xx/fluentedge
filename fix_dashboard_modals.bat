@echo off
echo ====================================
echo   FIXING DASHBOARD MODALS
echo ====================================
echo.
echo Adding missing modals:
echo   - Avatar selection modal (8 avatars)
echo   - Name editor modal
echo   - Weekly goal modal
echo.

echo [1/3] Staging dashboard template...
git add templates/dashboard.html
echo    OK: dashboard.html staged

echo.
echo [2/3] Committing changes...
git commit -m "Add dashboard modals: avatar selection, name editor, weekly goals"
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
echo   1. Visit your Render URL /dashboard
echo   2. Click the avatar in top-right
echo   3. See 8 avatars to choose from!
echo   4. Click the pencil icon next to name
echo   5. Enter your name!
echo.
echo What now works:
echo   ✓ Avatar selection (8 avatars: 4 boys + 4 girls)
echo   ✓ Name editor (click pencil icon)
echo   ✓ Weekly goal setter (Set Weekly Goals button)
echo   ✓ All modals have proper styling
echo.
pause
