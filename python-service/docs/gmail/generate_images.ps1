Add-Type -AssemblyName System.Drawing

$outDir = "c:\Users\Usuario\Downloads\Nova pasta\docs\gmail"
New-Item -ItemType Directory -Force -Path $outDir | Out-Null

$bg = [System.Drawing.Color]::FromArgb(255,253,247)
$ink = [System.Drawing.Color]::FromArgb(16,42,67)
$line = [System.Drawing.Color]::FromArgb(36,59,83)
$box = [System.Drawing.Color]::FromArgb(240,244,248)
$boxAlt = [System.Drawing.Color]::FromArgb(217,226,236)
$ok = [System.Drawing.Color]::FromArgb(230,255,250)
$warn = [System.Drawing.Color]::FromArgb(255,245,245)
$google = [System.Drawing.Color]::FromArgb(238,244,255)
$borderOk = [System.Drawing.Color]::FromArgb(44,122,123)
$borderWarn = [System.Drawing.Color]::FromArgb(197,48,48)
$borderBlue = [System.Drawing.Color]::FromArgb(31,60,136)

$fontTitle = New-Object System.Drawing.Font("Segoe UI", 30, [System.Drawing.FontStyle]::Bold)
$fontH2 = New-Object System.Drawing.Font("Segoe UI", 20, [System.Drawing.FontStyle]::Bold)
$fontText = New-Object System.Drawing.Font("Segoe UI", 15)
$fontMono = New-Object System.Drawing.Font("Consolas", 15)

function New-Canvas {
    param([int]$width, [int]$height)
    $bmp = New-Object System.Drawing.Bitmap($width, $height)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::ClearTypeGridFit
    $g.Clear($bg)
    return @{ bmp = $bmp; g = $g }
}

function Draw-Box {
    param($g, [int]$x, [int]$y, [int]$w, [int]$h, [System.Drawing.Color]$fill, [System.Drawing.Color]$border)
    $b = New-Object System.Drawing.SolidBrush($fill)
    $p = New-Object System.Drawing.Pen($border, 3)
    $g.FillRectangle($b, $x, $y, $w, $h)
    $g.DrawRectangle($p, $x, $y, $w, $h)
    $b.Dispose()
    $p.Dispose()
}

function Draw-Arrow {
    param($g, [int]$x1, [int]$y1, [int]$x2, [int]$y2)
    $pen = New-Object System.Drawing.Pen($line, 4)
    $cap = New-Object System.Drawing.Drawing2D.AdjustableArrowCap(5, 8, $true)
    $pen.CustomEndCap = $cap
    $g.DrawLine($pen, $x1, $y1, $x2, $y2)
    $cap.Dispose()
    $pen.Dispose()
}

$brushInk = New-Object System.Drawing.SolidBrush($ink)
$brushLine = New-Object System.Drawing.SolidBrush($line)
$brushBlue = New-Object System.Drawing.SolidBrush($borderBlue)
$brushGreen = New-Object System.Drawing.SolidBrush($borderOk)
$brushRed = New-Object System.Drawing.SolidBrush($borderWarn)

# 1) Fluxo reset senha
$ctx = New-Canvas 1400 840
$bmp = $ctx.bmp
$g = $ctx.g
$g.DrawString("Fluxo: Recuperacao de senha com Gmail SMTP", $fontTitle, $brushInk, 60, 40)

Draw-Box $g 80 170 340 180 $box $line
$g.DrawString("1) Usuario", $fontH2, $brushInk, 110, 205)
$g.DrawString("Clica em Esqueci minha senha", $fontText, $brushLine, 110, 255)
$g.DrawString("e informa o email.", $fontText, $brushLine, 110, 290)

Draw-Box $g 530 140 400 250 $boxAlt $line
$g.DrawString("2) Seu Flask (app.py)", $fontH2, $brushInk, 560, 180)
$g.DrawString("- Gera token", $fontText, $brushLine, 560, 235)
$g.DrawString("- Salva hash no banco", $fontText, $brushLine, 560, 270)
$g.DrawString("- Monta link /reset-senha", $fontText, $brushLine, 560, 305)
$g.DrawString("- Envia email via SMTP", $fontText, $brushLine, 560, 340)

Draw-Box $g 1010 170 310 180 $box $line
$g.DrawString("3) Gmail SMTP", $fontH2, $brushInk, 1040, 205)
$g.DrawString("smtp.gmail.com", $fontText, $brushLine, 1040, 255)
$g.DrawString("porta 587 (TLS)", $fontText, $brushLine, 1040, 290)

Draw-Box $g 530 500 400 230 $box $line
$g.DrawString("4) Usuario recebe link", $fontH2, $brushInk, 560, 540)
$g.DrawString("Abre o email", $fontText, $brushLine, 560, 595)
$g.DrawString("Clica no link", $fontText, $brushLine, 560, 630)
$g.DrawString("Define nova senha", $fontText, $brushLine, 560, 665)

Draw-Arrow $g 420 260 520 260
Draw-Arrow $g 930 260 1000 260
Draw-Arrow $g 1160 350 930 560
Draw-Arrow $g 530 620 420 620

$g.DrawString("No seu codigo: is_password_reset_email_ready() e send_password_reset_email().", $fontText, $brushLine, 80, 785)
$bmp.Save((Join-Path $outDir "01_fluxo_reset_senha.png"), [System.Drawing.Imaging.ImageFormat]::Png)
$g.Dispose(); $bmp.Dispose()

# 2) Variaveis
$ctx = New-Canvas 1400 840
$bmp = $ctx.bmp
$g = $ctx.g
$g.DrawString("Variaveis de ambiente para Gmail no app", $fontTitle, $brushInk, 60, 40)
Draw-Box $g 60 120 1280 440 $box $line
$g.DrawString(".env / Render / Railway (recomendado)", $fontH2, $brushBlue, 95, 165)

$lines = @(
    "SMTP_HOST=smtp.gmail.com",
    "SMTP_PORT=587",
    "SMTP_USERNAME=seuemail@gmail.com",
    "SMTP_PASSWORD=senha_de_app_16_digitos",
    "SMTP_FROM_EMAIL=seuemail@gmail.com",
    "SMTP_USE_TLS=true",
    "SMTP_USE_SSL=false"
)
for ($i = 0; $i -lt $lines.Count; $i++) {
    $y = 225 + ($i * 46)
    $g.DrawString($lines[$i], $fontMono, $brushLine, 95, $y)
}

Draw-Box $g 60 610 610 180 $ok $borderOk
$g.DrawString("Com isso, funciona", $fontH2, $brushGreen, 95, 650)
$g.DrawString("/esqueci-senha -> envia link", $fontText, $brushLine, 95, 700)
$g.DrawString("Sem usar senha real da conta", $fontText, $brushLine, 95, 735)

Draw-Box $g 730 610 610 180 $warn $borderWarn
$g.DrawString("Erros comuns", $fontH2, $brushRed, 765, 650)
$g.DrawString("- Usar senha normal do Gmail", $fontText, $brushLine, 765, 700)
$g.DrawString("- TLS e SSL ligados juntos", $fontText, $brushLine, 765, 735)

$bmp.Save((Join-Path $outDir "02_variaveis_env_gmail.png"), [System.Drawing.Imaging.ImageFormat]::Png)
$g.Dispose(); $bmp.Dispose()

# 3) Login Google
$ctx = New-Canvas 1400 840
$bmp = $ctx.bmp
$g = $ctx.g
$g.DrawString("Fluxo: Login com Google (OpenID Connect)", $fontTitle, $brushInk, 60, 40)

Draw-Box $g 80 150 320 170 $box $line
$g.DrawString("Usuario", $fontH2, $brushInk, 110, 195)
$g.DrawString("Clica Entrar com Google", $fontText, $brushLine, 110, 245)

Draw-Box $g 500 110 440 250 $box $line
$g.DrawString("Seu Flask", $fontH2, $brushInk, 530, 155)
$g.DrawString("/login/google gera state", $fontText, $brushLine, 530, 210)
$g.DrawString("redireciona para Google Auth", $fontText, $brushLine, 530, 250)
$g.DrawString("scope: openid email profile", $fontText, $brushLine, 530, 290)

Draw-Box $g 1020 150 300 190 $google $borderBlue
$g.DrawString("Google", $fontH2, $brushInk, 1050, 195)
$g.DrawString("Tela de consentimento", $fontText, $brushLine, 1050, 245)
$g.DrawString("retorna code + state", $fontText, $brushLine, 1050, 280)

Draw-Box $g 500 430 440 330 $box $line
$g.DrawString("Callback /auth/google/callback", $fontH2, $brushInk, 530, 475)
$g.DrawString("1) valida state", $fontText, $brushLine, 530, 530)
$g.DrawString("2) troca code por access_token", $fontText, $brushLine, 530, 574)
$g.DrawString("3) chama userinfo endpoint", $fontText, $brushLine, 530, 618)
$g.DrawString("4) login/cria usuario local", $fontText, $brushLine, 530, 662)

Draw-Box $g 1020 470 300 230 $google $borderBlue
$g.DrawString("Google APIs", $fontH2, $brushInk, 1050, 515)
$g.DrawString("token_endpoint", $fontText, $brushLine, 1050, 565)
$g.DrawString("userinfo_endpoint", $fontText, $brushLine, 1050, 600)

Draw-Arrow $g 400 240 490 240
Draw-Arrow $g 940 240 1010 240
Draw-Arrow $g 1170 340 940 520
Draw-Arrow $g 940 580 1010 580

$g.DrawString("No codigo: rotas entre app.py:2327 e app.py:2472.", $fontText, $brushLine, 80, 785)
$bmp.Save((Join-Path $outDir "03_fluxo_login_google.png"), [System.Drawing.Imaging.ImageFormat]::Png)
$g.Dispose(); $bmp.Dispose()

$brushInk.Dispose(); $brushLine.Dispose(); $brushBlue.Dispose(); $brushGreen.Dispose(); $brushRed.Dispose()
$fontTitle.Dispose(); $fontH2.Dispose(); $fontText.Dispose(); $fontMono.Dispose()

Write-Output "OK"
