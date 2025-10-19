@echo off
echo Copying essential images to static/images...
echo.

if not exist "static\images" mkdir "static\images"

copy /Y "images\boys_avatar1.JPG" "static\images\" 2>nul && echo OK: boys_avatar1.JPG
copy /Y "images\boys_avatar2.jpg" "static\images\" 2>nul && echo OK: boys_avatar2.jpg
copy /Y "images\boys_avatar3.jpg" "static\images\" 2>nul && echo OK: boys_avatar3.jpg
copy /Y "images\boys_avatar4.jpg" "static\images\" 2>nul && echo OK: boys_avatar4.jpg

copy /Y "images\girls_avatar1.jpg" "static\images\" 2>nul && echo OK: girls_avatar1.jpg
copy /Y "images\girls_avatar2.jpg" "static\images\" 2>nul && echo OK: girls_avatar2.jpg
copy /Y "images\girls_avatar3.jpg" "static\images\" 2>nul && echo OK: girls_avatar3.jpg
copy /Y "images\girls_avatar4.jpg" "static\images\" 2>nul && echo OK: girls_avatar4.jpg

copy /Y "images\grade5_icon.jpg" "static\images\" 2>nul && echo OK: grade5_icon.jpg
copy /Y "images\grade6_icon.jpg" "static\images\" 2>nul && echo OK: grade6_icon.jpg
copy /Y "images\grade7_icon.jpg" "static\images\" 2>nul && echo OK: grade7_icon.jpg
copy /Y "images\grade8_icon.jpg" "static\images\" 2>nul && echo OK: grade8_icon.jpg

copy /Y "images\fluent-oman-logo.png" "static\images\" 2>nul && echo OK: fluent-oman-logo.png
copy /Y "images\fluentoman_logo.jpg" "static\images\" 2>nul && echo OK: fluentoman_logo.jpg

echo.
echo Done! Images copied to static\images\
pause
