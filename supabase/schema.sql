-- =====================================================================
-- Lista do Mercado — banco de dados (Supabase / PostgreSQL)
-- Rode este arquivo inteiro uma vez em: Supabase > SQL Editor > New query
--
-- ANTES DE RODAR: troque os dois e-mails da seção 1 pelos e-mails
-- Google de vocês dois.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Quem pode usar o app (lista de e-mails liberados)
-- ---------------------------------------------------------------------
create table if not exists public.membros_permitidos (
  email text primary key
);

insert into public.membros_permitidos (email) values
  ('barbedo.pamela@gmail.com'),
  ('TROQUE_PELO_EMAIL_DO_CAIO@gmail.com')
on conflict do nothing;

-- Função usada nas regras de acesso: "quem está logado é um dos dois?"
create or replace function public.is_membro()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.membros_permitidos
    where lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;

-- Bloqueia o cadastro de qualquer e-mail que não esteja na lista
create or replace function public.bloquear_cadastro_nao_liberado()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.membros_permitidos
    where lower(email) = lower(new.email)
  ) then
    raise exception 'Este e-mail não tem acesso ao app.';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_bloquear_cadastro on auth.users;
create trigger trg_bloquear_cadastro
  before insert on auth.users
  for each row execute function public.bloquear_cadastro_nao_liberado();

-- ---------------------------------------------------------------------
-- 2. Perfis (nome + foto de cada pessoa, copiados do Google no login)
-- ---------------------------------------------------------------------
create table if not exists public.perfis (
  id uuid primary key references auth.users (id) on delete cascade,
  nome text not null default 'Sem nome',
  avatar_url text,
  email text
);

create or replace function public.criar_perfil_ao_cadastrar()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.perfis (id, nome, avatar_url, email)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data ->> 'full_name',
      new.raw_user_meta_data ->> 'name',
      split_part(new.email, '@', 1)
    ),
    coalesce(
      new.raw_user_meta_data ->> 'avatar_url',
      new.raw_user_meta_data ->> 'picture'
    ),
    new.email
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists trg_criar_perfil on auth.users;
create trigger trg_criar_perfil
  after insert on auth.users
  for each row execute function public.criar_perfil_ao_cadastrar();

-- ---------------------------------------------------------------------
-- 3. Listas editáveis: categorias e formas de pagamento
-- ---------------------------------------------------------------------
create table if not exists public.categorias (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  emoji text default '🛒',
  ordem int not null default 0
);

create table if not exists public.formas_pagamento (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  ordem int not null default 0
);

insert into public.categorias (nome, emoji, ordem)
select * from (values
  ('Hortifrúti', '🥬', 1),
  ('Carnes e peixes', '🥩', 2),
  ('Padaria e frios', '🧀', 3),
  ('Laticínios', '🥛', 4),
  ('Mercearia', '🍝', 5),
  ('Bebidas', '🥤', 6),
  ('Limpeza', '🧼', 7),
  ('Higiene', '🧴', 8),
  ('Congelados', '🧊', 9),
  ('Outros', '🛒', 10)
) as v(nome, emoji, ordem)
where not exists (select 1 from public.categorias);

insert into public.formas_pagamento (nome, ordem)
select * from (values
  ('Cartão de crédito', 1),
  ('Cartão de débito', 2),
  ('Vale-alimentação', 3),
  ('Pix', 4),
  ('Dinheiro', 5)
) as v(nome, ordem)
where not exists (select 1 from public.formas_pagamento);

-- ---------------------------------------------------------------------
-- 4. Compras, itens e pagamentos
-- ---------------------------------------------------------------------
create table if not exists public.compras (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  data date not null default current_date,
  mercado text,
  orcamento numeric(12, 2) not null default 0,
  status text not null default 'planejando'
    check (status in ('planejando', 'no_mercado', 'finalizada')),
  criado_por uuid default auth.uid() references public.perfis (id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.itens (
  id uuid primary key default gen_random_uuid(),
  compra_id uuid not null references public.compras (id) on delete cascade,
  nome text not null,
  categoria_id uuid references public.categorias (id) on delete set null,
  quantidade numeric(12, 3) not null default 1,
  preco numeric(12, 2) not null default 0,         -- preço de 1 unidade
  no_carrinho boolean not null default false,
  adicionado_por uuid default auth.uid() references public.perfis (id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.pagamentos (
  id uuid primary key default gen_random_uuid(),
  compra_id uuid not null references public.compras (id) on delete cascade,
  forma_id uuid references public.formas_pagamento (id) on delete set null,
  valor numeric(12, 2) not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_itens_compra on public.itens (compra_id);
create index if not exists idx_pagamentos_compra on public.pagamentos (compra_id);

-- ---------------------------------------------------------------------
-- 5. Orçamento mensal (um valor por mês; "mes" é sempre o dia 1)
-- ---------------------------------------------------------------------
create table if not exists public.orcamento_mensal (
  mes date primary key,
  valor numeric(12, 2) not null default 0
);

-- ---------------------------------------------------------------------
-- 6. Regras de acesso (Row Level Security)
--    Só quem está na lista de e-mails liberados lê e escreve.
-- ---------------------------------------------------------------------
alter table public.membros_permitidos enable row level security;
alter table public.perfis enable row level security;
alter table public.categorias enable row level security;
alter table public.formas_pagamento enable row level security;
alter table public.compras enable row level security;
alter table public.itens enable row level security;
alter table public.pagamentos enable row level security;
alter table public.orcamento_mensal enable row level security;

-- membros_permitidos: ninguém mexe pelo app (só pelo SQL Editor)

-- perfis: os dois enxergam os perfis; cada um edita só o seu
drop policy if exists perfis_select on public.perfis;
create policy perfis_select on public.perfis
  for select using (public.is_membro());
drop policy if exists perfis_update on public.perfis;
create policy perfis_update on public.perfis
  for update using (public.is_membro() and id = auth.uid());

-- demais tabelas: acesso total para os membros liberados
do $$
declare t text;
begin
  foreach t in array array[
    'categorias', 'formas_pagamento', 'compras',
    'itens', 'pagamentos', 'orcamento_mensal'
  ] loop
    execute format('drop policy if exists %I_membros on public.%I', t, t);
    execute format(
      'create policy %I_membros on public.%I for all using (public.is_membro()) with check (public.is_membro())',
      t, t
    );
  end loop;
end $$;

-- ---------------------------------------------------------------------
-- 7. Tempo real: o que um adiciona aparece na tela do outro na hora
-- ---------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array[
    'compras', 'itens', 'pagamentos', 'orcamento_mensal',
    'categorias', 'formas_pagamento'
  ] loop
    begin
      execute format('alter publication supabase_realtime add table public.%I', t);
    exception when duplicate_object then
      null; -- já estava na publicação
    end;
  end loop;
end $$;
