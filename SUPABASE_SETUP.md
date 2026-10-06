# Configuração do Supabase (acesso de qualquer aparelho)

## 1. Criar o projeto
1. Entre em https://supabase.com e crie um projeto (região: South America - São Paulo).
2. Guarde a senha do banco em local seguro.

## 2. Criar tabela, regras e bucket
1. Supabase → **SQL Editor** → **New query**.
2. Cole o conteúdo de `supabase/schema.sql` e clique em **Run**.

## 3. Criar os 4 técnicos e travar cadastro aberto
1. **Authentication → Sign In / Providers → Email**: desligue **Allow new users to sign up**
   (e, se não quiser confirmar e-mail, desligue **Confirm email**).
2. **Authentication → Users → Add user → Create new user**: crie cada técnico com e-mail e senha
   (marque **Auto Confirm User**).

## 4. Variáveis na Vercel
Em **Project Settings → API** copie a *Project URL* e a chave *anon public*. Na Vercel:
**Settings → Environment Variables**, crie:

| Nome | Valor |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon public key |

Depois faça **Redeploy**.

## 5. Trazer os dados que já estão no celular
1. (Segurança) No app antigo, faça **Exportar backup** e guarde o `.json`.
2. Abra o app novo **no mesmo celular e no mesmo navegador** de antes, entre com seu login.
3. Aparece a faixa "Encontrei N ordem(ns) salvas só neste aparelho" → **Enviar para a nuvem**.
   Os dados locais não são apagados.
4. Se preferir, também dá para usar **Importar backup** no histórico com o `.json`.

Cada técnico vê somente as próprias ordens (RLS por `user_id`).
