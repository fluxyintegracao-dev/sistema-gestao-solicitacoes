Add-Type -AssemblyName System.Drawing

$outDir = "c:\Users\Usuario\Downloads\Nova pasta\docs\gmail"
New-Item -ItemType Directory -Force -Path $outDir | Out-Null

$bg = [System.Drawing.Color]::FromArgb(252, 250, 244)
$ink = [System.Drawing.Color]::FromArgb(17, 44, 74)
$line = [System.Drawing.Color]::FromArgb(38, 64, 92)
$card = [System.Drawing.Color]::FromArgb(239, 243, 248)
$card2 = [System.Drawing.Color]::FromArgb(232, 245, 240)
$warn = [System.Drawing.Color]::FromArgb(255, 241, 241)
$accent = [System.Drawing.Color]::FromArgb(22, 96, 153)

$fontTitle = New-Object System.Drawing.Font("Segoe UI", 30, [System.Drawing.FontStyle]::Bold)
$fontH2 = New-Object System.Drawing.Font("Segoe UI", 20, [System.Drawing.FontStyle]::Bold)
$fontText = New-Object System.Drawing.Font("Segoe UI", 16)
$fontMono = New-Object System.Drawing.Font("Consolas", 15)

function New-Canvas {
    param([int]$w, [int]$h)
    $bmp = New-Object System.Drawing.Bitmap($w, $h)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::ClearTypeGridFit
    $g.Clear($bg)
    return @{ bmp = $bmp; g = $g }
}

function Draw-Card {
    param($g, [int]$x, [int]$y, [int]$w, [int]$h, [System.Drawing.Color]$fill)
    $brush = New-Object System.Drawing.SolidBrush($fill)
    $pen = New-Object System.Drawing.Pen($line, 3)
    $g.FillRectangle($brush, $x, $y, $w, $h)
    $g.DrawRectangle($pen, $x, $y, $w, $h)
    $brush.Dispose(); $pen.Dispose()
}

$brushInk = New-Object System.Drawing.SolidBrush($ink)
$brushLine = New-Object System.Drawing.SolidBrush($line)
$brushAccent = New-Object System.Drawing.SolidBrush($accent)

# Image 1
$ctx = New-Canvas 1500 980
$bmp = $ctx.bmp; $g = $ctx.g
$g.DrawString("PASSO 1 - Preparar Gmail (2FA + Senha de App)", $fontTitle, $brushInk, 55, 38)

Draw-Card $g 55 130 680 500 $card
$g.DrawString("Parte A - Ativar 2FA", $fontH2, $brushAccent, 85, 170)
$g.DrawString("1) Abra: myaccount.google.com", $fontText, $brushLine, 90, 230)
$g.DrawString("2) Clique em Seguranca", $fontText, $brushLine, 90, 275)
$g.DrawString("3) Verificacao em 2 etapas -> Ativar", $fontText, $brushLine, 90, 320)
$g.DrawString("4) Confirme telefone/app autenticador", $fontText, $brushLine, 90, 365)

Draw-Card $g 770 130 675 500 $card2
$g.DrawString("Parte B - Gerar senha de app", $fontH2, $brushAccent, 800, 170)
$g.DrawString("1) Ainda em Seguranca, busque 'Senhas de app'", $fontText, $brushLine, 805, 230)
$g.DrawString("2) Escolha: App = Mail", $fontText, $brushLine, 805, 275)
$g.DrawString("3) Device = Outro (nome: CSC)", $fontText, $brushLine, 805, 320)
$g.DrawString("4) Copie os 16 digitos gerados", $fontText, $brushLine, 805, 365)
$g.DrawString("5) Esse valor vai em SMTP_PASSWORD", $fontText, $brushLine, 805, 410)

Draw-Card $g 55 675 1390 235 $warn
$g.DrawString("Importante", $fontH2, $brushAccent, 85, 715)
$g.DrawString("- Nao use a senha normal do Gmail no app.", $fontText, $brushLine, 90, 765)
$g.DrawString("- Use somente a senha de app (16 digitos).", $fontText, $brushLine, 90, 805)
$g.DrawString("- Se nao achar 'Senhas de app', a 2FA ainda nao foi ativada.", $fontText, $brushLine, 90, 845)

$bmp.Save((Join-Path $outDir "04_passo1_gmail.png"), [System.Drawing.Imaging.ImageFormat]::Png)
$g.Dispose(); $bmp.Dispose()

# Image 2
$ctx = New-Canvas 1500 980
$bmp = $ctx.bmp; $g = $ctx.g
$g.DrawString("PASSO 2 - Configurar variaveis SMTP", $fontTitle, $brushInk, 55, 38)

Draw-Card $g 55 130 1390 420 $card
$g.DrawString("Cole exatamente isso no .env (ou no painel da Render)", $fontH2, $brushAccent, 85, 170)
$envLines = @(
  "SMTP_HOST=smtp.gmail.com",
  "SMTP_PORT=587",
  "SMTP_USERNAME=seuemail@gmail.com",
  "SMTP_PASSWORD=sua_senha_de_app_16_digitos",
  "SMTP_FROM_EMAIL=seuemail@gmail.com",
  "SMTP_USE_TLS=true",
  "SMTP_USE_SSL=false"
)
for ($i = 0; $i -lt $envLines.Count; $i++) {
  $g.DrawString($envLines[$i], $fontMono, $brushLine, 95, 230 + ($i * 45))
}

Draw-Card $g 55 590 680 320 $card2
$g.DrawString("Local (Windows)", $fontH2, $brushAccent, 85, 630)
$g.DrawString("1) Crie arquivo .env na pasta do projeto", $fontText, $brushLine, 90, 680)
$g.DrawString("2) Cole as 7 linhas acima", $fontText, $brushLine, 90, 720)
$g.DrawString("3) Reinicie o app", $fontText, $brushLine, 90, 760)

Draw-Card $g 765 590 680 320 $card2
$g.DrawString("Render", $fontH2, $brushAccent, 795, 630)
$g.DrawString("1) Dashboard > Service > Environment", $fontText, $brushLine, 800, 680)
$g.DrawString("2) Adicione as mesmas chaves", $fontText, $brushLine, 800, 720)
$g.DrawString("3) Save + Deploy", $fontText, $brushLine, 800, 760)

$bmp.Save((Join-Path $outDir "05_passo2_env.png"), [System.Drawing.Imaging.ImageFormat]::Png)
$g.Dispose(); $bmp.Dispose()

# Image 3
$ctx = New-Canvas 1500 980
$bmp = $ctx.bmp; $g = $ctx.g
$g.DrawString("PASSO 3 - Configurar Login com Google", $fontTitle, $brushInk, 55, 38)

Draw-Card $g 55 130 680 500 $card
$g.DrawString("Google Cloud Console", $fontH2, $brushAccent, 85, 170)
$g.DrawString("1) APIs e Servicos > OAuth consent screen", $fontText, $brushLine, 90, 230)
$g.DrawString("2) Configure nome/app/email", $fontText, $brushLine, 90, 275)
$g.DrawString("3) Credentials > Create credentials", $fontText, $brushLine, 90, 320)
$g.DrawString("4) OAuth Client ID > Web application", $fontText, $brushLine, 90, 365)

Draw-Card $g 770 130 675 500 $card2
$g.DrawString("Redirect URIs (obrigatorio)", $fontH2, $brushAccent, 800, 170)
$g.DrawString("Use estes caminhos no Google:", $fontText, $brushLine, 805, 230)
$g.DrawString("http://localhost:5000/auth/google/callback", $fontMono, $brushLine, 805, 275)
$g.DrawString("https://SEU-DOMINIO/auth/google/callback", $fontMono, $brushLine, 805, 325)
$g.DrawString("(troque SEU-DOMINIO pelo dominio real)", $fontText, $brushLine, 805, 375)

Draw-Card $g 55 675 1390 235 $warn
$g.DrawString("Variaveis no app", $fontH2, $brushAccent, 85, 715)
$g.DrawString("GOOGLE_CLIENT_ID=...", $fontMono, $brushLine, 90, 765)
$g.DrawString("GOOGLE_CLIENT_SECRET=...", $fontMono, $brushLine, 90, 805)
$g.DrawString("Sem essas duas variaveis, o botao 'Entrar com Google' nao aparece.", $fontText, $brushLine, 90, 845)

$bmp.Save((Join-Path $outDir "06_passo3_google_login.png"), [System.Drawing.Imaging.ImageFormat]::Png)
$g.Dispose(); $bmp.Dispose()

# Image 4
$ctx = New-Canvas 1500 980
$bmp = $ctx.bmp; $g = $ctx.g
$g.DrawString("PASSO 4 - Teste guiado (checklist)", $fontTitle, $brushInk, 55, 38)

Draw-Card $g 55 130 1390 360 $card
$g.DrawString("Teste A - Recuperacao de senha", $fontH2, $brushAccent, 85, 170)
$g.DrawString("1) Abra: /esqueci-senha", $fontText, $brushLine, 90, 230)
$g.DrawString("2) Digite email cadastrado", $fontText, $brushLine, 90, 275)
$g.DrawString("3) Veja se chega email com link /reset-senha", $fontText, $brushLine, 90, 320)
$g.DrawString("4) Clique no link e troque a senha", $fontText, $brushLine, 90, 365)

Draw-Card $g 55 530 680 380 $card2
$g.DrawString("Teste B - Login Google", $fontH2, $brushAccent, 85, 570)
$g.DrawString("1) Abra /login", $fontText, $brushLine, 90, 625)
$g.DrawString("2) Clique Entrar com Google", $fontText, $brushLine, 90, 665)
$g.DrawString("3) Autorize sua conta", $fontText, $brushLine, 90, 705)
$g.DrawString("4) Volta logado no sistema", $fontText, $brushLine, 90, 745)

Draw-Card $g 765 530 680 380 $warn
$g.DrawString("Se der erro", $fontH2, $brushAccent, 795, 570)
$g.DrawString("- 535 Username/Password: senha de app errada", $fontText, $brushLine, 800, 625)
$g.DrawString("- redirect_uri_mismatch: URI no Google esta diferente", $fontText, $brushLine, 800, 665)
$g.DrawString("- Login Google nao configurado: faltou client id/secret", $fontText, $brushLine, 800, 705)
$g.DrawString("- Veja log do app para detalhes", $fontText, $brushLine, 800, 745)

$bmp.Save((Join-Path $outDir "07_passo4_teste.png"), [System.Drawing.Imaging.ImageFormat]::Png)
$g.Dispose(); $bmp.Dispose()

$fontTitle.Dispose(); $fontH2.Dispose(); $fontText.Dispose(); $fontMono.Dispose()
$brushInk.Dispose(); $brushLine.Dispose(); $brushAccent.Dispose()
Write-Output "OK"
