-- =====================================================================
-- Nossa Casa — Etapa 2: "A resolver" + anexos (comprovantes)
-- Rode este arquivo inteiro uma vez em: Supabase > SQL Editor > New query
-- (precisa já ter rodado o schema.sql da primeira versão)
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Categorias editáveis de "A resolver"
-- ---------------------------------------------------------------------
create table if not exists public.categorias_resolver (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  emoji text default '📌',
  ordem int not null default 0
);

insert into public.categorias_resolver (nome, emoji, ordem)
select * from (values
  ('Casa', '🏠', 1),
  ('Carro', '🚗', 2),
  ('Documentos', '📄', 3),
  ('Contas e burocracia', '🧾', 4),
  ('Compras grandes', '🛋️', 5),
  ('Outros', '📌', 6)
) as v(nome, emoji, ordem)
where not exists (select 1 from public.categorias_resolver);

-- ---------------------------------------------------------------------
-- 2. Pendências
-- ---------------------------------------------------------------------
create table if not exists public.pendencias (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  descricao text,
  categoria_id uuid references public.categorias_resolver (id) on delete set null,
  responsavel_id uuid references public.perfis (id) on delete set null,
  para_ambos boolean not null default false,       -- true = os dois resolvem
  prazo date,
  status text not null default 'pendente' check (status in ('pendente', 'feita')),
  concluida_em timestamptz,
  concluida_por uuid references public.perfis (id) on delete set null,
  criado_por uuid references public.perfis (id) on delete set null,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 3. Anexos (serve para pendências agora e para contas da casa depois)
--    O arquivo em si fica no Storage; aqui fica só o "cadastro" dele.
-- ---------------------------------------------------------------------
create table if not exists public.anexos (
  id uuid primary key default gen_random_uuid(),
  origem text not null,                -- 'pendencia', 'conta', ...
  origem_id uuid not null,             -- id do registro dono do anexo
  caminho text not null,               -- caminho do arquivo no Storage
  nome text not null,
  tipo text,
  tamanho int,
  enviado_por uuid references public.perfis (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_pendencias_status on public.pendencias (status);
create index if not exists idx_anexos_origem on public.anexos (origem, origem_id);

-- ---------------------------------------------------------------------
-- 4. Regras de acesso: só os dois e-mails liberados
-- ---------------------------------------------------------------------
alter table public.categorias_resolver enable row level security;
alter table public.pendencias enable row level security;
alter table public.anexos enable row level security;

do $$
declare t text;
begin
  foreach t in array array['categorias_resolver', 'pendencias', 'anexos'] loop
    execute format('drop policy if exists %I_membros on public.%I', t, t);
    execute format(
      'create policy %I_membros on public.%I for all using (public.is_membro()) with check (public.is_membro())',
      t, t
    );
  end loop;
end $$;

-- ---------------------------------------------------------------------
-- 5. Tempo real
-- ---------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['categorias_resolver', 'pendencias', 'anexos'] loop
    begin
      execute format('alter publication supabase_realtime add table public.%I', t);
    exception when duplicate_object then
      null;
    end;
  end loop;
end $$;

-- ---------------------------------------------------------------------
-- 6. Armazenamento dos arquivos (bucket PRIVADO "anexos")
--    Limite de 10 MB por arquivo; só imagens e PDF.
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'anexos', 'anexos', false, 10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'application/pdf']
)
on conflict (id) do update
  set file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types,
      public = false;

drop policy if exists anexos_ler on storage.objects;
create policy anexos_ler on storage.objects
  for select using (bucket_id = 'anexos' and public.is_membro());

drop policy if exists anexos_enviar on storage.objects;
create policy anexos_enviar on storage.objects
  for insert with check (bucket_id = 'anexos' and public.is_membro());

drop policy if exists anexos_trocar on storage.objects;
create policy anexos_trocar on storage.objects
  for update using (bucket_id = 'anexos' and public.is_membro());

drop policy if exists anexos_apagar on storage.objects;
create policy anexos_apagar on storage.objects
  for delete using (bucket_id = 'anexos' and public.is_membro());
