# Windows 방화벽 규칙 추가 스크립트
# 관리자 권한으로 실행 필요

Write-Host "SUDAM 서버 방화벽 규칙 추가 중..." -ForegroundColor Green

# 포트 4000 (서버)
netsh advfirewall firewall add rule name="SUDAM Server Port 4000" dir=in action=allow protocol=TCP localport=4000

# 포트 5173 (Vite 클라이언트)
netsh advfirewall firewall add rule name="SUDAM Vite Port 5173" dir=in action=allow protocol=TCP localport=5173

Write-Host "방화벽 규칙 추가 완료!" -ForegroundColor Green
Write-Host ""
Write-Host "접속 주소:" -ForegroundColor Yellow
Write-Host "  클라이언트: http://192.168.219.156:5173" -ForegroundColor Cyan
Write-Host "  서버 API: http://192.168.219.156:4000" -ForegroundColor Cyan

