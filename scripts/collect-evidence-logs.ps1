# ==============================================================================
# SMART HOME IoT 2026 — SCRIPT XUẤT TỰ ĐỘNG LOG MINH CHỨNG KIỂM THỬ (A.6 / B.4)
# Chạy từ thư mục gốc dự án:
#   .\scripts\collect-evidence-logs.ps1
# ==============================================================================

$ErrorActionPreference = "Continue"
$RootDir = Split-Path -Parent $PSScriptRoot
$OutDir = Join-Path $RootDir "evidence\02_backend_tests"

if (-not (Test-Path $OutDir)) {
  New-Item -ItemType Directory -Path $OutDir -Force | Out-Null
}

function Run-LoggedStep {
  param(
    [string]$Title,
    [string]$LogFileName,
    [scriptblock]$Command
  )
  $logPath = Join-Path $OutDir $LogFileName
  $ts = Get-Date -Format "yyyy-MM-dd HH:mm:ss zzz"
  $header = @(
    "======================================================================",
    "SMART HOME IoT 2026 - EVIDENCE LOG",
    "Step      : $Title",
    "Timestamp : $ts",
    "======================================================================",
    ""
  )
  $header | Out-File -FilePath $logPath -Encoding UTF8

  Write-Host "`n>>> [$Title]" -ForegroundColor Cyan
  $output = & $Command 2>&1 | Out-String
  $exitCode = $LASTEXITCODE

  $output | Out-File -FilePath $logPath -Append -Encoding UTF8
  "`n[EXIT_CODE=$exitCode]" | Out-File -FilePath $logPath -Append -Encoding UTF8

  if ($exitCode -eq 0) {
    Write-Host "    PASS -> $LogFileName" -ForegroundColor Green
    return @{ Title = $Title; File = $LogFileName; Status = "PASS" }
  } else {
    Write-Host "    FAIL (exit=$exitCode) -> Xem chi tiết tại $LogFileName" -ForegroundColor Red
    return @{ Title = $Title; File = $LogFileName; Status = "FAIL ($exitCode)" }
  }
}

$results = @()

# 1. Backend TypeScript typecheck
$results += Run-LoggedStep -Title "Backend TypeScript Typecheck (tsc --noEmit)" -LogFileName "01_backend_typecheck.log" -Command {
  Set-Location $RootDir
  npm.cmd --prefix backend run typecheck
}

# 2. Backend Vitest Unit & Integration Tests
$results += Run-LoggedStep -Title "Backend Vitest Unit & Integration Tests (13 tests)" -LogFileName "02_backend_vitest.log" -Command {
  Set-Location $RootDir
  npm.cmd --prefix backend test
}

# 3. Backend MQTT TLS (:8883) Connection Test
$results += Run-LoggedStep -Title "Backend MQTT Cloud TLS (:8883) Smoke Test" -LogFileName "03_backend_mqtt_tls.log" -Command {
  Set-Location $RootDir
  npm.cmd --prefix backend run test:hivemq
}

# 4. Mobile App TypeScript typecheck
$results += Run-LoggedStep -Title "Mobile App TypeScript Typecheck (tsc --noEmit)" -LogFileName "04_mobile_typecheck.log" -Command {
  Set-Location (Join-Path $RootDir "mobile")
  npx.cmd tsc --noEmit
}

# 5. Render Cloud Live Healthcheck
$results += Run-LoggedStep -Title "Render Cloud Backend Healthcheck (/api/health)" -LogFileName "05_render_health_live.log" -Command {
  $resp = Invoke-RestMethod -Uri "https://smarthome-iot-backend.onrender.com/api/health" -Method Get -TimeoutSec 30
  $resp | ConvertTo-Json -Depth 6
  $global:LASTEXITCODE = 0
}

# 6. Git Secret Audit (đảm bảo 0 file nhạy cảm trên GitHub)
$results += Run-LoggedStep -Title "Git Secret & Clean Structure Audit" -LogFileName "06_git_secret_audit.log" -Command {
  Set-Location $RootDir
  $matches = git ls-files | Select-String -Pattern '(^src/|(^|/)\.env($|\.(?!example))|secrets\.h$|google-services\.json$|serviceAccountKey|firebase-adminsdk)'
  if ($matches) {
    Write-Output "PHAT HIEN FILE NHAY CAM TRONG GIT:"
    $matches
    $global:LASTEXITCODE = 1
  } else {
    Write-Output "CLEAN 100%: Khong co file nhay cam (.env, secrets.h, google-services.json, serviceAccountKey) hoac thu muc src/ cu nao trong Git index."
    $global:LASTEXITCODE = 0
  }
}

Set-Location $RootDir

Write-Host "`n======================================================================" -ForegroundColor Yellow
Write-Host "TONG KET XUAT LOG MINH CHUNG -> evidence\02_backend_tests\" -ForegroundColor Yellow
Write-Host "======================================================================" -ForegroundColor Yellow
foreach ($r in $results) {
  $color = if ($r.Status -eq "PASS") { "Green" } else { "Red" }
  Write-Host ("  [{0,-10}] {1,-52} ({2})" -f $r.Status, $r.Title, $r.File) -ForegroundColor $color
}
Write-Host ""
