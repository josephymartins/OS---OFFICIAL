# ============================================================
# AUTOCOM OS - Configura o Supabase SEM usar o painel/SQL Editor.
# Faz: (opcional) cria o projeto, roda supabase\schema.sql,
#      desliga cadastro aberto, cria os usuarios (tecnicos).
# Uso (na pasta do projeto):
#   powershell -ExecutionPolicy Bypass -File .\configurar-supabase.ps1   (se estiver na raiz)
#   powershell -ExecutionPolicy Bypass -File .\scripts\configurar-supabase.ps1
# Nada e gravado em disco. Token e chaves ficam so na memoria.
# ============================================================
$ErrorActionPreference = 'Stop'
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
$api = 'https://api.supabase.com'

function Read-Secret($prompt) {
  $s = Read-Host $prompt -AsSecureString
  $b = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($s)
  try { return [Runtime.InteropServices.Marshal]::PtrToStringBSTR($b) }
  finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($b) }
}

function New-Pass([int]$n) {
  $chars = 'abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  $rng = [Security.Cryptography.RandomNumberGenerator]::Create()
  $bytes = New-Object byte[] $n
  $rng.GetBytes($bytes)
  -join ($bytes | ForEach-Object { $chars[$_ % $chars.Length] })
}

function Call($method, $url, $headers, $body) {
  try {
    if ($null -ne $body) {
      $json = $body | ConvertTo-Json -Depth 5 -Compress
      return Invoke-RestMethod -Method $method -Uri $url -Headers $headers `
        -ContentType 'application/json; charset=utf-8' `
        -Body ([Text.Encoding]::UTF8.GetBytes($json))
    }
    return Invoke-RestMethod -Method $method -Uri $url -Headers $headers
  } catch {
    $detail = $_.ErrorDetails.Message
    if (-not $detail) { $detail = $_.Exception.Message }
    throw "Falha em $method $url :: $detail"
  }
}

# Funciona com o script na raiz do projeto ou dentro de scripts\
$schemaPath = $null
foreach ($c in @((Join-Path $PSScriptRoot 'supabase\schema.sql'), (Join-Path $PSScriptRoot '..\supabase\schema.sql'), (Join-Path (Get-Location) 'supabase\schema.sql'))) {
  if (Test-Path $c) { $schemaPath = $c; break }
}
if (-not $schemaPath) { throw 'Nao achei supabase\schema.sql. Rode dentro da pasta do projeto (onde existe a pasta supabase).' }
# ReadAllText devolve string pura (Get-Content -Raw vira objeto no ConvertTo-Json)
$sql = [string][IO.File]::ReadAllText((Resolve-Path $schemaPath).Path, [Text.Encoding]::UTF8)

Write-Host ''
Write-Host 'Crie um token em https://supabase.com/dashboard/account/tokens (Generate new token).' -ForegroundColor Cyan
# Opcao 1: variavel de ambiente ($env:SUPABASE_TOKEN = 'sbp_...') antes de rodar o script
$token = $env:SUPABASE_TOKEN
if (-not $token) { $token = Read-Secret 'Cole o token pessoal do Supabase (campo oculto)' }
# Remove espacos, quebras de linha e qualquer caractere invisivel colado junto
$token = ($token -replace '[^\x21-\x7E]', '')
# Opcao 2: se o campo oculto nao recebeu a colagem, pede de novo num campo VISIVEL
if ($token.Length -lt 20) {
  Write-Host 'O campo oculto nao recebeu o token inteiro. Cole de novo abaixo (desta vez vai aparecer na tela).' -ForegroundColor Yellow
  $token = (Read-Host 'Token') -replace '[^\x21-\x7E]', ''
}
if (-not $token.StartsWith('sbp_')) { throw 'Token invalido: ele deve comecar com sbp_ . Gere outro e cole de novo.' }
$h = @{ Authorization = "Bearer $token" }

$ref = (Read-Host 'Ref do projeto (o codigo na URL do projeto). Deixe VAZIO para criar um novo').Trim()

if (-not $ref) {
  $orgs = @(Call 'GET' "$api/v1/organizations" $h $null)
  if ($orgs.Count -eq 0) { throw 'Nenhuma organizacao encontrada na sua conta Supabase.' }
  $org = $orgs[0]
  if ($orgs.Count -gt 1) {
    for ($i = 0; $i -lt $orgs.Count; $i++) { Write-Host "[$i] $($orgs[$i].name)" }
    $org = $orgs[[int](Read-Host 'Numero da organizacao')]
  }
  $slug = if ($org.slug) { $org.slug } else { $org.id }
  $dbPass = New-Pass 24
  Write-Host 'Criando projeto autocom-os ...' -ForegroundColor Yellow
  $proj = Call 'POST' "$api/v1/projects" $h @{ name = 'autocom-os'; organization_slug = $slug; db_pass = $dbPass }
  $ref = $proj.id
  Write-Host "Projeto criado: $ref" -ForegroundColor Green
  Write-Host "SENHA DO BANCO (guarde, nao sera mostrada de novo): $dbPass" -ForegroundColor Magenta
}

Write-Host 'Aguardando o projeto ficar pronto (pode levar alguns minutos) ...' -ForegroundColor Yellow
$ok = $false
for ($i = 0; $i -lt 60; $i++) {
  $p = Call 'GET' "$api/v1/projects/$ref" $h $null
  if ($p.status -eq 'ACTIVE_HEALTHY') { $ok = $true; break }
  Start-Sleep -Seconds 10
}
if (-not $ok) { throw "O projeto $ref nao ficou ativo a tempo. Espere um pouco e rode de novo informando o ref." }

Write-Host 'Criando tabela, regras (RLS) e bucket de PDFs ...' -ForegroundColor Yellow
Call 'POST' "$api/v1/projects/$ref/database/query" $h @{ query = $sql } | Out-Null
Write-Host 'Banco configurado.' -ForegroundColor Green

try {
  Call 'PATCH' "$api/v1/projects/$ref/config/auth" $h @{ disable_signup = $true } | Out-Null
  Write-Host 'Cadastro aberto desligado (so voce cria usuarios).' -ForegroundColor Green
} catch {
  Write-Host "AVISO: nao consegui desligar o cadastro aberto. Desligue em Authentication > Sign In / Providers. ($_)" -ForegroundColor DarkYellow
}

$keys = @(Call 'GET' "$api/v1/projects/$ref/api-keys?reveal=true" $h $null)
$anon = ($keys | Where-Object { $_.name -eq 'anon' } | Select-Object -First 1).api_key
if (-not $anon) { $anon = ($keys | Where-Object { $_.type -eq 'publishable' } | Select-Object -First 1).api_key }
$svc = ($keys | Where-Object { $_.name -eq 'service_role' } | Select-Object -First 1).api_key
if (-not $svc) { $svc = ($keys | Where-Object { $_.type -eq 'secret' } | Select-Object -First 1).api_key }
if (-not $anon) { throw 'Nao encontrei a chave publica (anon) do projeto.' }

$url = "https://$ref.supabase.co"
$created = @()
if ($svc) {
  $ah = @{ apikey = $svc }
  if ($svc.StartsWith('eyJ')) { $ah['Authorization'] = "Bearer $svc" }
  Write-Host ''
  Write-Host 'Cadastre os tecnicos (um e-mail por vez; ENTER vazio para terminar).' -ForegroundColor Cyan
  while ($true) {
    $email = (Read-Host 'E-mail do tecnico').Trim()
    if (-not $email) { break }
    $pw = New-Pass 12
    try {
      Call 'POST' "$url/auth/v1/admin/users" $ah @{ email = $email; password = $pw; email_confirm = $true } | Out-Null
      $created += [pscustomobject]@{ Email = $email; Senha = $pw }
      Write-Host "  criado: $email" -ForegroundColor Green
    } catch { Write-Host "  FALHOU: $email -> $_" -ForegroundColor Red }
  }
} else {
  Write-Host 'AVISO: chave de servico nao encontrada; crie os usuarios em Authentication > Users.' -ForegroundColor DarkYellow
}

Write-Host ''
Write-Host '================ RESULTADO ================' -ForegroundColor Cyan
if ($created.Count) {
  Write-Host 'Usuarios (anote e entregue a cada tecnico; as senhas nao serao mostradas de novo):'
  $created | Format-Table -AutoSize | Out-String | Write-Host
}
Write-Host 'Coloque na Vercel (Settings > Environment Variables) e faca Redeploy:'
Write-Host "NEXT_PUBLIC_SUPABASE_URL      = $url"
Write-Host "NEXT_PUBLIC_SUPABASE_ANON_KEY = $anon"
Write-Host ''
Write-Host 'Por seguranca, apague o token em https://supabase.com/dashboard/account/tokens' -ForegroundColor Yellow
