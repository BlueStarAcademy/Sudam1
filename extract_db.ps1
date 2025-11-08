# PowerShell script to extract binary file from git stash
$stash = git stash show 'stash@{0}' --name-only | Select-String 'database.sqlite'
if ($stash) {
    # Use git show with binary mode
    $process = Start-Process -FilePath "git" -ArgumentList "show", "stash@{0}:database.sqlite" -RedirectStandardOutput "database_local_final.sqlite" -NoNewWindow -Wait -PassThru
    
    if ($process.ExitCode -eq 0) {
        Write-Host "Extracted successfully"
        $file = Get-Item "database_local_final.sqlite" -ErrorAction SilentlyContinue
        if ($file) {
            Write-Host "File size: $($file.Length) bytes"
            # Check header
            $bytes = [System.IO.File]::ReadAllBytes($file.FullName)
            $header = [System.Text.Encoding]::ASCII.GetString($bytes[0..15])
            Write-Host "Header: $header"
        }
    } else {
        Write-Host "Error: Exit code $($process.ExitCode)"
    }
} else {
    Write-Host "database.sqlite not found in stash"
}

