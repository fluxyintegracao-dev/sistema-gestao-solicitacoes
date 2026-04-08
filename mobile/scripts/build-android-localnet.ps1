param(
  [string]$ApiUrl = "http://10.3.152.21:8000/api",
  [string]$OutputDir = "C:\Users\Jose Ricardo\Downloads\FLUXY-mobile"
)

$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
$androidDir = Join-Path $projectRoot "android"
$apkSource = Join-Path $androidDir "app\build\outputs\apk\release\app-release.apk"

$javaHome = "C:\Program Files\Android\Android Studio\jbr"
if (-not (Test-Path $javaHome)) {
  throw "JAVA_HOME nao encontrado em '$javaHome'."
}

if (-not (Test-Path $androidDir)) {
  throw "Diretorio Android nao encontrado em '$androidDir'."
}

Write-Host "Build localnet do FLUXY mobile" -ForegroundColor Cyan
Write-Host "API URL: $ApiUrl" -ForegroundColor Cyan

$env:JAVA_HOME = $javaHome
$env:PATH = "$javaHome\bin;$env:PATH"
$env:EXPO_PUBLIC_API_URL = $ApiUrl

Push-Location $androidDir
try {
  & .\gradlew.bat clean assembleRelease --no-daemon --rerun-tasks --console=plain
} finally {
  Pop-Location
}

if (-not (Test-Path $apkSource)) {
  throw "APK release nao foi gerado em '$apkSource'."
}

New-Item -ItemType Directory -Force -Path $OutputDir | Out-Null

$safeApiLabel = ($ApiUrl -replace '^https?://', '') -replace '[^a-zA-Z0-9\.-]', '_'
$apkTarget = Join-Path $OutputDir "fluxy-solicitacoes-localnet-$safeApiLabel.apk"

Copy-Item -LiteralPath $apkSource -Destination $apkTarget -Force

Write-Host ""
Write-Host "APK gerado com sucesso:" -ForegroundColor Green
Write-Host $apkTarget -ForegroundColor Green
