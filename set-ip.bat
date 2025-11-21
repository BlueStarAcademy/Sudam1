@echo off
chcp 65001 >nul
echo 현재 네트워크 어댑터를 확인 중...
echo.

for /f "tokens=*" %%i in ('powershell -Command "Get-NetAdapter | Where-Object {$_.Status -eq 'Up'} | Select-Object -First 1 | Select-Object -ExpandProperty Name"') do set ADAPTER_NAME=%%i

echo 네트워크 어댑터: %ADAPTER_NAME%
echo.
echo IP 주소를 192.168.219.156으로 설정 중...
echo.

powershell -Command "Remove-NetIPAddress -InterfaceAlias '%ADAPTER_NAME%' -Confirm:$false -ErrorAction SilentlyContinue"
powershell -Command "New-NetIPAddress -InterfaceAlias '%ADAPTER_NAME%' -IPAddress '192.168.219.156' -PrefixLength 24 -DefaultGateway '192.168.219.1'"
powershell -Command "Set-DnsClientServerAddress -InterfaceAlias '%ADAPTER_NAME%' -ServerAddresses '8.8.8.8','8.8.4.4'"

echo.
echo 설정 완료!
echo.
echo 현재 IP 주소 확인:
ipconfig | findstr /i "IPv4"
echo.
pause

