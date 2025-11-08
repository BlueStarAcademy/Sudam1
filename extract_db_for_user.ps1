# Git stash에서 database.sqlite 추출
$stashContent = git show "stash@{0}:database.sqlite" --binary
[System.IO.File]::WriteAllBytes("database_stash_backup.sqlite", $stashContent)
Write-Host "Extracted database.sqlite from stash"
Write-Host "File size: $([System.IO.FileInfo](Get-Item database_stash_backup.sqlite).Length) bytes"

