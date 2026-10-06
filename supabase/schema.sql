-- ============================================================
-- AUTOCOM - Ordem de Serviço  |  Esquema do Supabase
-- Rode este arquivo UMA vez em: Supabase > SQL Editor > New query > Run
-- Pode rodar de novo sem problema (é idempotente).
-- ============================================================

-- 1) Tabela de ordens de serviço ------------------------------------------
create table if not exists public.orders (
  id                  text primary key,
  -- Dono da ordem. Preenchido automaticamente com o técnico logado.
  user_id             uuid not null default auth.uid()
                        references auth.users (id) on delete cascade,

  client_name         text,
  client_cpf          text,
  client_fantasia     text,
  client_cnpj         text,
  client_endereco     text,
  client_cidade       text,
  client_cep          text,
  client_telefone     text,
  client_email        text,

  numero_os           text,
  equipamento         text,
  tecnico             text,
  problema_informado  text,
  selected_services   text not null default '[]',   -- JSON em texto
  observacoes         text,
  data_atendimento    text,
  hora_entrada        text,
  hora_saida          text,
  responsavel         text,
  signature_data      text,                          -- assinatura (data URL)

  has_pdf             boolean not null default false,
  archived            boolean not null default false,
  status              text    not null default 'finalizado',

  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index if not exists orders_user_created_idx
  on public.orders (user_id, created_at desc);

-- 2) RLS: cada técnico enxerga e altera SOMENTE as próprias ordens --------
alter table public.orders enable row level security;

drop policy if exists "orders_select_own" on public.orders;
drop policy if exists "orders_insert_own" on public.orders;
drop policy if exists "orders_update_own" on public.orders;
drop policy if exists "orders_delete_own" on public.orders;

create policy "orders_select_own" on public.orders
  for select to authenticated
  using (user_id = auth.uid());

create policy "orders_insert_own" on public.orders
  for insert to authenticated
  with check (user_id = auth.uid());

create policy "orders_update_own" on public.orders
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "orders_delete_own" on public.orders
  for delete to authenticated
  using (user_id = auth.uid());

-- 3) Bucket privado para os PDFs (caminho: <user_id>/<id-da-ordem>.pdf) ---
insert into storage.buckets (id, name, public)
values ('os-pdfs', 'os-pdfs', false)
on conflict (id) do nothing;

drop policy if exists "os_pdfs_select_own" on storage.objects;
drop policy if exists "os_pdfs_insert_own" on storage.objects;
drop policy if exists "os_pdfs_update_own" on storage.objects;
drop policy if exists "os_pdfs_delete_own" on storage.objects;

create policy "os_pdfs_select_own" on storage.objects
  for select to authenticated
  using (bucket_id = 'os-pdfs'
         and (storage.foldername(name))[1] = auth.uid()::text);

create policy "os_pdfs_insert_own" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'os-pdfs'
              and (storage.foldername(name))[1] = auth.uid()::text);

create policy "os_pdfs_update_own" on storage.objects
  for update to authenticated
  using (bucket_id = 'os-pdfs'
         and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'os-pdfs'
              and (storage.foldername(name))[1] = auth.uid()::text);

create policy "os_pdfs_delete_own" on storage.objects
  for delete to authenticated
  using (bucket_id = 'os-pdfs'
         and (storage.foldername(name))[1] = auth.uid()::text);
