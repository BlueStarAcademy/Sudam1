# DHCP 자동 할당으로 변경하는 스크립트

Write-Host "현재 네트워크 어댑터 정보:" -ForegroundColor Yellow
Get-NetAdapter | Where-Object {$_.Status -eq "Up"} | Format-Table Name, InterfaceDescription, Status

$adapterName = (Get-NetAdapter | Where-Object {$_.Status -eq "Up"} | Select-Object -First 1).Name

if (-not $adapterName) {
    Write-Host "활성화된 네트워크 어댑터를 찾을 수 없습니다." -ForegroundColor Red
    exit 1
}

Write-Host "`n네트워크 어댑터: $adapterName" -ForegroundColor Green

$confirm = Read-Host "`nDHCP 자동 할당으로 변경하시겠습니까? (Y/N)"
if ($confirm -ne "Y" -and $confirm -ne "y") {
    Write-Host "취소되었습니다." -ForegroundColor Yellow
    exit 0
}

try {
    # 고정 IP 설정 제거
    Write-Host "`n고정 IP 설정 제거 중..." -ForegroundColor Yellow
    Remove-NetIPAddress -InterfaceAlias $adapterName -Confirm:$false -ErrorAction SilentlyContinue
    Remove-NetRoute -InterfaceAlias $adapterName -Confirm:$false -ErrorAction SilentlyContinue
    
    # DHCP 설정
    Write-Host "DHCP 자동 할당 설정 중..." -ForegroundColor Yellow
    Set-NetIPInterface -InterfaceAlias $adapterName -Dhcp Enabled
    
    # DNS도 자동으로 설정
    Set-DnsClientServerAddress -InterfaceAlias $adapterName -ResetServerAddresses
    
    Write-Host "`nDHCP 자동 할당 설정이 완료되었습니다!" -ForegroundColor Green
    
    # 잠시 대기 후 새 IP 확인
    Start-Sleep -Seconds 3
    Write-Host "`n새로 할당된 IP 주소:" -ForegroundColor Cyan
    Get-NetIPAddress -InterfaceAlias $adapterName | Where-Object {$_.AddressFamily -eq "IPv4"} | Format-Table IPAddress, PrefixLength, InterfaceAlias
    
} catch {
    Write-Host "`n오류 발생: $_" -ForegroundColor Red
    Write-Host "관리자 권한으로 실행했는지 확인하세요." -ForegroundColor Yellow
    exit 1
}

