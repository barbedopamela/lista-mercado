-- =====================================================================
-- Nossa Casa — Finanças, entrega 1: contas fixas e contas do mês
-- Rode este arquivo inteiro uma vez em: Supabase > SQL Editor > New query
-- (precisa já ter rodado o schema.sql e a migração 002)
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Categorias editáveis de Finanças
-- ---------------------------------------------------------------------
create table if not exists public.categorias_financas (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  emoji text default '💰',
  ordem int not null default 0
);

insert into public.categorias_financas (nome, emoji, ordem)
select * from (values
  ('Moradia', '🏠', 1),
  ('Contas de consumo', '💡', 2),
  ('Assinaturas', '📺', 3),
  ('Transporte', '🚗', 4),
  ('Educação', '🎓', 5),
  ('Lazer', '🎉', 6),
  ('Impostos e taxas', '🧾', 7),
  ('Outros', '💰', 8)
) as v(nome, emoji, ordem)
where not exists (select 1 from public.categorias_financas);

-- ---------------------------------------------------------------------
-- 2. Contas fixas: o "molde" que se repete todo mês na mesma data
--    conta_pessoal_de: vazio = conta conjunta; senão, conta pessoal dessa
--    pessoa (só marca de onde sai; o app não guarda saldo de conta pessoal)
--    parcelas: vazio = todo mês sem fim; número = parcelado nesse tanto
-- ---------------------------------------------------------------------
create table if not exists public.contas_fixas (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  valor numeric(12, 2) not null default 0,
  dia_vencimento int not null check (dia_vencimento between 1 and 31),
  categoria_id uuid references public.categorias_financas (id) on delete set null,
  conta_pessoal_de uuid references public.perfis (id) on delete set null,
  primeiro_mes date not null default (date_trunc('month', current_date))::date,
  parcelas int check (parcelas is null or parcelas > 0),
  ativa boolean not null default true,
  criado_por uuid references public.perfis (id) on delete set null,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 3. Contas do mês: cada conta de cada mês, com valor, pagamento e
--    comprovantes próprios. conta_id vazio = conta avulsa (só daquele mês).
--    O par (conta_id, mes) é único: nunca nasce a mesma conta duas vezes
--    no mesmo mês, mesmo se vocês dois abrirem o mês ao mesmo tempo.
-- ---------------------------------------------------------------------
create table if not exists public.contas_mes (
  id uuid primary key default gen_random_uuid(),
  conta_id uuid references public.contas_fixas (id) on delete set null,
  mes date not null,
  nome text not null,
  valor numeric(12, 2) not null default 0,
  vencimento date not null,
  categoria_id uuid references public.categorias_financas (id) on delete set null,
  conta_pessoal_de uuid references public.perfis (id) on delete set null,
  parcela_n int,
  parcela_total int,
  ajustada boolean not null default false,   -- valor/data mudados só neste mês
  pulada boolean not null default false,     -- "não vai ter essa conta neste mês"
  paga boolean not null default false,
  pago_em date,
  pago_por uuid references public.perfis (id) on delete set null,
  criado_por uuid references public.perfis (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (conta_id, mes)
);

create index if not exists idx_contas_mes_mes on public.contas_mes (mes);

-- ---------------------------------------------------------------------
-- 4. Regras de acesso: só os dois e-mails liberados
-- ---------------------------------------------------------------------
alter table public.categorias_financas enable row level security;
alter table public.contas_fixas enable row level security;
alter table public.contas_mes enable row level security;

do $$
declare t text;
begin
  foreach t in array array['categorias_financas', 'contas_fixas', 'contas_mes'] loop
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
  foreach t in array array['categorias_financas', 'contas_fixas', 'contas_mes'] loop
    begin
      execute format('alter publication supabase_realtime add table public.%I', t);
    exception when duplicate_object then
      null;
    end;
  end loop;
end $$;
