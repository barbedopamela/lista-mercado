-- =====================================================================
-- Nossa Casa — Finanças, entrega 2: lançamentos avulsos e saldo da conta conjunta
-- Rode este arquivo inteiro uma vez em: Supabase > SQL Editor > New query
-- (precisa já ter rodado schema.sql e as migrações 002 e 003)
-- =====================================================================

-- 1. Categorias agora têm tipo: 'saida' (despesas) ou 'entrada' (receitas)
alter table public.categorias_financas
  add column if not exists tipo text not null default 'saida'
  check (tipo in ('saida', 'entrada'));

insert into public.categorias_financas (nome, emoji, ordem, tipo)
select * from (values
  ('Salário', '💼', 101, 'entrada'),
  ('Rendimentos', '📈', 102, 'entrada'),
  ('Reembolso', '↩️', 103, 'entrada'),
  ('Outras entradas', '💰', 104, 'entrada')
) as v(nome, emoji, ordem, tipo)
where not exists (select 1 from public.categorias_financas where tipo = 'entrada');

-- 2. Lançamentos avulsos: entradas e saídas do dia a dia
--    conta_pessoal_de vazio = conta conjunta. Só a conjunta entra no saldo.
create table if not exists public.lancamentos (
  id uuid primary key default gen_random_uuid(),
  tipo text not null check (tipo in ('entrada', 'saida')),
  valor numeric(12, 2) not null default 0 check (valor >= 0),
  data date not null default current_date,
  descricao text not null default '',
  categoria_id uuid references public.categorias_financas (id) on delete set null,
  conta_pessoal_de uuid references public.perfis (id) on delete set null,
  criado_por uuid references public.perfis (id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists idx_lancamentos_data on public.lancamentos (data);

-- 3. Saldo de partida da conta conjunta (uma única linha).
--    O app soma/subtrai tudo o que acontece depois dessa data.
create table if not exists public.saldo_conjunta (
  id int primary key default 1 check (id = 1),
  valor numeric(12, 2) not null default 0,
  data date not null default current_date,
  atualizado_por uuid references public.perfis (id) on delete set null,
  updated_at timestamptz not null default now()
);

-- 4. Regras de acesso
alter table public.lancamentos enable row level security;
alter table public.saldo_conjunta enable row level security;

do $$
declare t text;
begin
  foreach t in array array['lancamentos', 'saldo_conjunta'] loop
    execute format('drop policy if exists %I_membros on public.%I', t, t);
    execute format(
      'create policy %I_membros on public.%I for all using (public.is_membro()) with check (public.is_membro())',
      t, t
    );
  end loop;
end $$;

-- 5. Tempo real
do $$
declare t text;
begin
  foreach t in array array['lancamentos', 'saldo_conjunta'] loop
    begin
      execute format('alter publication supabase_realtime add table public.%I', t);
    exception when duplicate_object then
      null;
    end;
  end loop;
end $$;
