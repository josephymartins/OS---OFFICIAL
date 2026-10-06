# ============================================================
# AUTOCOM OS - Ativa o CADASTRO COM CODIGO DE CONVITE no Supabase.
# Faz: cria a regra no banco (so aceita cadastro com o codigo certo),
#      liga o cadastro e desliga a confirmacao por e-mail.
# Pode rodar de novo para TROCAR o codigo.
# Uso (na pasta do projeto):
#   powershell -ExecutionPolicy Bypass -File .\configurar-convite.ps1
# Token opcional: $env:SUPABASE_TOKEN = 'sbp_...'  (antes de rodar)
# ============================================================
$ErrorActionPreference = 'Stop'
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
$api = 'https://api.supabase.com'
$defaultRef = 'hwjjknbbcydrgjnbmclm'

function Read-Secret($prompt) {
  $s = Read-Host $prompt -AsSecureString
  $b = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($s)
  try { return [Runtime.InteropServices.Marshal]::PtrToStringBSTR($b) }
  finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($b) }
}

function Call($method, $url, $headers, $body) {
  try {
    $json = $body | ConvertTo-Json -Depth 5 -Compress
    return Invoke-RestMethod -Method $method -Uri $url -Headers $headers `
      -ContentType 'application/json; charset=utf-8' `
      -Body ([Text.Encoding]::UTF8.GetBytes($json))
  } catch {
    $detail = $_.ErrorDetails.Message
    if (-not $detail) { $detail = $_.Exception.Message }
    throw "Falha em $method $url :: $detail"
  }
}

$sqlTemplate = @'
create table if not exists public.app_settings (
  key   text primary key,
  value text not null
);
alter table public.app_settings enable row level security;
revoke all on public.app_settings from anon, authenticated;

insert into public.app_settings (key, value) values ('invite_code', '__CODIGO__')
on conflict (key) do update set value = excluded.value;

create or replace function public.check_invite_code()
returns trigger
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  expected text;
  given text;
begin
  select value into expected from public.app_settings where key = 'invite_code';
  given := btrim(coalesce(new.raw_user_meta_data->>'invite_code', ''));
  if expected is null or lower(given) <> lower(expected) then
    raise exception 'invalid invite code';
  end if;
  -- o codigo nao fica guardado no perfil do usuario
  new.raw_user_meta_data := new.raw_user_meta_data - 'invite_code';
  return new;
end;
$fn$;

revoke all on function public.check_invite_code() from public, anon, authenticated;

drop trigger if exists check_invite_code on auth.users;
create trigger check_invite_code
  before insert on auth.users
  for each row execute function public.check_invite_code();
'@

Write-Host ''
Write-Host 'Token em https://supabase.com/dashboard/account/tokens (Generate new token, acesso total).' -ForegroundColor Cyan
$token = $env:SUPABASE_TOKEN
if (-not $token) { $token = Read-Secret 'Cole o token pessoal do Supabase (campo oculto)' }
$token = ($token -replace '[^\x21-\x7E]', '')
if ($token.Length -lt 20) {
  Write-Host 'O campo oculto nao recebeu o token inteiro. Cole de novo abaixo (vai aparecer na tela).' -ForegroundColor Yellow
  $token = (Read-Host 'Token') -replace '[^\x21-\x7E]', ''
}
if (-not $token.StartsWith('sbp_')) { throw 'Token invalido: ele deve comecar com sbp_ . Gere outro e cole de novo.' }
$h = @{ Authorization = "Bearer $token" }

$ref = (Read-Host "Ref do projeto (ENTER para usar $defaultRef)").Trim()
if (-not $ref) { $ref = $defaultRef }

$code = ''
while ($code.Length -lt 6) {
  $code = (Read-Host 'Codigo de convite que os tecnicos vao digitar (minimo 6 caracteres, sem aspas)').Trim()
  if ($code.Length -lt 6) { Write-Host 'Muito curto. Use pelo menos 6 caracteres.' -ForegroundColor Yellow }
}
$codeEsc = $code.Replace("'", "''")
$sql = $sqlTemplate.Replace('__CODIGO__', $codeEsc)

Write-Host 'Criando a regra de convite no banco ...' -ForegroundColor Yellow
Call 'POST' "$api/v1/projects/$ref/database/query" $h @{ query = $sql } | Out-Null
Write-Host 'Regra criada.' -ForegroundColor Green

Write-Host 'Ligando o cadastro e desligando a confirmacao por e-mail ...' -ForegroundColor Yellow
Call 'PATCH' "$api/v1/projects/$ref/config/auth" $h @{ disable_signup = $false; mailer_autoconfirm = $true } | Out-Null
Write-Host 'Cadastro ligado.' -ForegroundColor Green

Write-Host ''
Write-Host '================ PRONTO ================' -ForegroundColor Cyan
Write-Host "Codigo de convite: $code"
Write-Host 'Entregue esse codigo so aos tecnicos. Na tela do app: Primeiro acesso? Criar conta.'
Write-Host 'Para trocar o codigo, rode este script de novo com outro.'
Write-Host 'Por seguranca, apague o token em https://supabase.com/dashboard/account/tokens' -ForegroundColor Yellow
