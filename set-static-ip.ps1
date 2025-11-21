# 고정 IP 설정 스크립트
# 사용법: .\set-static-ip.ps1 -IPAddress "192.168.219.XXX" -SubnetMask "255.255.255.0" -Gateway "192.168.219.1"

param(
    [Parameter(Mandatory=$true)]
    [string]$IPAddress,
    
    [Parameter(Mandatory=$false)]
    [string]$SubnetMask = "255.255.255.0",
    
    [Parameter(Mandatory=$false)]
    [string]$Gateway = "192.168.219.1",
    
    [Parameter(Mandatory=$false)]
    [string[]]$DNSServers = @("8.8.8.8", "8.8.4.4")
)

Write-Host "현재 네트워크 어댑터 정보:" -ForegroundColor Yellow
Get-NetAdapter | Where-Object {$_.Status -eq "Up"} | Format-Table Name, InterfaceDescription, Status

$adapterName = (Get-NetAdapter | Where-Object {$_.Status -eq "Up"} | Select-Object -First 1).Name

if (-not $adapterName) {
    Write-Host "활성화된 네트워크 어댑터를 찾을 수 없습니다." -ForegroundColor Red
    exit 1
}

Write-Host "`n네트워크 어댑터: $adapterName" -ForegroundColor Green
Write-Host "설정할 IP 주소: $IPAddress" -ForegroundColor Green
Write-Host "서브넷 마스크: $SubnetMask" -ForegroundColor Green
Write-Host "게이트웨이: $Gateway" -ForegroundColor Green

$confirm = Read-Host "`n위 설정으로 고정 IP를 설정하시겠습니까? (Y/N)"
if ($confirm -ne "Y" -and $confirm -ne "y") {
    Write-Host "취소되었습니다." -ForegroundColor Yellow
    exit 0
}

try {
    # 기존 DHCP 설정 제거
    Write-Host "`n기존 DHCP 설정 제거 중..." -ForegroundColor Yellow
    Remove-NetIPAddress -InterfaceAlias $adapterName -Confirm:$false -ErrorAction SilentlyContinue
    
    # 고정 IP 설정
    Write-Host "고정 IP 설정 중..." -ForegroundColor Yellow
    New-NetIPAddress -InterfaceAlias $adapterName -IPAddress $IPAddress -PrefixLength 24 -DefaultGateway $Gateway
    
    # DNS 설정
    Write-Host "DNS 서버 설정 중..." -ForegroundColor Yellow
    Set-DnsClientServerAddress -InterfaceAlias $adapterName -ServerAddresses $DNSServers
    
    Write-Host "`n고정 IP 설정이 완료되었습니다!" -ForegroundColor Green
    Write-Host "새 IP 주소: $IPAddress" -ForegroundColor Green
    
    # 설정 확인
    Write-Host "`n현재 네트워크 설정:" -ForegroundColor Cyan
    Get-NetIPAddress -InterfaceAlias $adapterName | Where-Object {$_.AddressFamily -eq "IPv4"} | Format-Table IPAddress, PrefixLength, InterfaceAlias
    Get-NetRoute -InterfaceAlias $adapterName | Where-Object {$_.DestinationPrefix -eq "0.0.0.0/0"} | Format-Table DestinationPrefix, NextHop, InterfaceAlias
    
} catch {
    Write-Host "`n오류 발생: $_" -ForegroundColor Red
    Write-Host "관리자 권한으로 실행했는지 확인하세요." -ForegroundColor Yellow
    exit 1
}

