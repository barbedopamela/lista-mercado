-- =====================================================================
-- Nossa Casa — Mercado: orçamento do mês dividido por forma de pagamento
-- Rode este arquivo inteiro uma vez em: Supabase > SQL Editor > New query
-- =====================================================================

create table if not exists public.orcamento_formas (
  mes date not null,                                   -- sempre o dia 1 do mês
  forma_id uuid not null references public.formas_pagamento (id) on delete cascade,
  valor numeric(12, 2) not null default 0 check (valor >= 0),
  primary key (mes, forma_id)
);

alter table public.orcamento_formas enable row level security;
drop policy if exists orcamento_formas_membros on public.orcamento_formas;
create policy orcamento_formas_membros on public.orcamento_formas
  for all using (public.is_membro()) with check (public.is_membro());

do $$
begin
  alter publication supabase_realtime add table public.orcamento_formas;
exception when duplicate_object then
  null;
end $$;
