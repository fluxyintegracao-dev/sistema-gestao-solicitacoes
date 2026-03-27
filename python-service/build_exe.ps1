$ErrorActionPreference = "Stop"

$venvPython = ".\.venv\Scripts\python.exe"
if (-not (Test-Path $venvPython)) {
  Write-Error "Nao encontrei .venv. Crie o ambiente virtual antes de gerar o EXE."
}

& $venvPython -m pip install pyinstaller
& $venvPython -m PyInstaller `
  --noconfirm `
  --clean `
  --name CSC_Insumos `
  --icon "static\favicon.ico" `
  --add-data "templates;templates" `
  --add-data "static;static" `
  --add-data "app.db;." `
  app.py

Write-Host "EXE gerado em dist\CSC_Insumos\CSC_Insumos.exe"
