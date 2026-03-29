# FitTrack — Deploy Script
# Kullanım: .\deploy.ps1
# docs/index.html bundle oluştur + GitHub'a push et

$ErrorActionPreference = 'Stop'
$dir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $dir

Write-Host "`n=== FitTrack Deploy ===" -ForegroundColor Cyan

# ── 1. Bundle Oluştur ───────────────────────────────────────
Write-Host "`n[1/3] Bundle oluşturuluyor..." -ForegroundColor Yellow

$css   = Get-Content "$dir\style.css"   -Raw -Encoding UTF8
$exjs  = Get-Content "$dir\exercises.js" -Raw -Encoding UTF8
$appjs = Get-Content "$dir\app.js"       -Raw -Encoding UTF8
$html  = Get-Content "$dir\index.html"   -Raw -Encoding UTF8

$html = $html -replace '<link rel="stylesheet" href="style\.css">',   "<style>`n$css`n</style>"
$html = $html -replace '<script src="exercises\.js"></script>',       "<script>`n$exjs`n</script>"
$html = $html -replace '<script src="app\.js"></script>',             "<script>`n$appjs`n</script>"
$html = $html -replace '<link rel="manifest" href="manifest\.json">', ''

$bundlePath = "$dir\docs\index.html"
$html | Set-Content $bundlePath -Encoding UTF8

$size = [Math]::Round((Get-Item $bundlePath).Length / 1024, 1)
Write-Host "  ✓ docs\index.html — $size KB" -ForegroundColor Green

# ── 2. Git Add + Commit ─────────────────────────────────────
Write-Host "`n[2/3] Git commit..." -ForegroundColor Yellow

$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm"
git add -A
git diff --cached --quiet
if ($LASTEXITCODE -ne 0) {
    git commit -m "deploy: FitTrack update $timestamp"
    Write-Host "  ✓ Commit oluşturuldu" -ForegroundColor Green
} else {
    Write-Host "  · Değişiklik yok, commit atlandı" -ForegroundColor Gray
}

# ── 3. Push ─────────────────────────────────────────────────
Write-Host "`n[3/3] GitHub'a push ediliyor..." -ForegroundColor Yellow
git push origin master
Write-Host "  ✓ Push tamamlandı" -ForegroundColor Green

Write-Host "`n=== Deploy Başarılı! ===" -ForegroundColor Cyan
Write-Host "GitHub Pages: https://harunbozkurt007-ops.github.io/fitness-app/" -ForegroundColor White
Write-Host ""
