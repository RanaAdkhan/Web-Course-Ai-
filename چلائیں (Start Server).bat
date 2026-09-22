@echo off
chcp 65001 >nul
title Course Admission Portal - کورس داخلہ پورٹل
echo ====================================================
echo    کورس داخلہ و رجسٹریشن سسٹم شروع ہو رہا ہے...
echo ====================================================
echo.
echo طالب علم فارم لنک: http://localhost:3000
echo ایڈمن پینل لنک:   http://localhost:3000/admin.html
echo.
echo براؤزر میں پورٹل کھولا جا رہا ہے...
timeout /t 2 /nobreak >nul
start http://localhost:3000
echo.
echo سرور چل رہا ہے، اس ونڈو کو بند نہ کریں۔ بند کرنے کے لیے Ctrl+C دبائیں۔
node server.js
pause
