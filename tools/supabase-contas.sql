-- ==========================================================================
-- Contas de cliente da Grão de Mostarda — base de dados no Supabase
--
-- Como usar: Supabase → o seu projeto → SQL Editor → "New query" → colar
-- este ficheiro inteiro → "Run". Pode ser corrido mais do que uma vez sem
-- estragar nada (é idempotente). Guia completo: docs/CONTAS.md
--
-- Segurança (o mais importante):
--   - a chave pública do site (anon) não lê nem escreve NADA destas tabelas;
--   - uma pessoa com sessão iniciada só vê e só altera as SUAS linhas (RLS);
--   - só pode mudar as colunas que fazem sentido (permissões por coluna):
--     nunca o dono da linha, as datas ou o id;
--   - as encomendas só se criam e leem — não se editam nem se apagam;
--   - tamanhos máximos em tudo e no máximo 10 encomendas por hora por pessoa;
--   - "apagar a minha conta" apaga a conta e, em cascata, todos os dados.
--
-- O preço e o stock nunca vêm daqui: o site usa sempre o catálogo
-- (js/data/products.js). Uma encomenda guardada é só o histórico da própria
-- pessoa — não prova nada ao ateliê (ver ARCHITECTURE.md, "Checkout").
-- ==========================================================================

-- --------------------------------------------------------------------------
-- 1. Tabelas
-- --------------------------------------------------------------------------

-- Dados de entrega (os mesmos campos do checkout). Uma linha por conta,
-- criada sozinha quando a conta é criada (secção 4).
create table if not exists public.perfis (
  id             uuid primary key references auth.users (id) on delete cascade,
  nome           text not null default '' check (char_length(nome) <= 100),
  telefone       text not null default '' check (char_length(telefone) <= 30 and telefone ~ '^[0-9+ ().-]*$'),
  morada         text not null default '' check (char_length(morada) <= 200),
  codigo_postal  text not null default '' check (codigo_postal = '' or codigo_postal ~ '^[0-9]{4}-[0-9]{3}$'),
  localidade     text not null default '' check (char_length(localidade) <= 80),
  atualizado_em  timestamptz not null default now()
);

-- Carrinho e favoritos guardados na conta (para acompanharem a pessoa entre
-- dispositivos). Só ids de produto e quantidades — nunca preços.
create table if not exists public.dados_cliente (
  utilizador     uuid primary key references auth.users (id) on delete cascade,
  carrinho       jsonb not null default '[]'::jsonb check (
                   jsonb_typeof(carrinho) = 'array'
                   and jsonb_array_length(carrinho) <= 60
                   and pg_column_size(carrinho) <= 8192),
  favoritos      jsonb not null default '[]'::jsonb check (
                   jsonb_typeof(favoritos) = 'array'
                   and jsonb_array_length(favoritos) <= 100
                   and pg_column_size(favoritos) <= 4096),
  atualizado_em  timestamptz not null default now()
);

-- Histórico de encomendas da pessoa (gravado quando confirma "Já enviei o
-- pedido"). O pagamento e o estado continuam a ser combinados pelo WhatsApp.
create table if not exists public.encomendas (
  id          uuid primary key default gen_random_uuid(),
  utilizador  uuid not null default auth.uid() references auth.users (id) on delete cascade,
  numero      text not null check (numero ~ '^GM-[A-Z0-9]{8}$'),
  itens       jsonb not null check (
                jsonb_typeof(itens) = 'array'
                and jsonb_array_length(itens) between 1 and 60
                and pg_column_size(itens) <= 16384),
  subtotal    numeric(10,2) not null check (subtotal >= 0 and subtotal < 100000),
  portes      numeric(10,2) not null check (portes >= 0 and portes < 1000),
  total       numeric(10,2) not null check (total >= 0 and total < 100000),
  modo        text not null check (modo in ('whatsapp', 'email')),
  criada_em   timestamptz not null default now(),
  unique (utilizador, numero)
);

create index if not exists encomendas_utilizador_data
  on public.encomendas (utilizador, criada_em desc);

-- --------------------------------------------------------------------------
-- 2. Permissões: anon não tem nada; authenticated só o necessário, coluna
--    a coluna. Sem uma policy (secção 3), mesmo isto não deixa ver nada.
-- --------------------------------------------------------------------------
revoke all on public.perfis, public.dados_cliente, public.encomendas from public, anon, authenticated;

grant select on public.perfis to authenticated;
grant update (nome, telefone, morada, codigo_postal, localidade) on public.perfis to authenticated;

grant select on public.dados_cliente to authenticated;
grant update (carrinho, favoritos) on public.dados_cliente to authenticated;

grant select on public.encomendas to authenticated;
grant insert (numero, itens, subtotal, portes, total, modo) on public.encomendas to authenticated;

-- --------------------------------------------------------------------------
-- 3. Row Level Security: cada pessoa só as suas linhas.
--    (select auth.uid()) em vez de auth.uid(): o Postgres calcula-o uma vez
--    por pedido em vez de uma vez por linha.
-- --------------------------------------------------------------------------
alter table public.perfis enable row level security;
alter table public.dados_cliente enable row level security;
alter table public.encomendas enable row level security;

drop policy if exists "perfis: ler o meu" on public.perfis;
create policy "perfis: ler o meu" on public.perfis
  for select to authenticated using (id = (select auth.uid()));

drop policy if exists "perfis: alterar o meu" on public.perfis;
create policy "perfis: alterar o meu" on public.perfis
  for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

drop policy if exists "dados_cliente: ler os meus" on public.dados_cliente;
create policy "dados_cliente: ler os meus" on public.dados_cliente
  for select to authenticated using (utilizador = (select auth.uid()));

drop policy if exists "dados_cliente: alterar os meus" on public.dados_cliente;
create policy "dados_cliente: alterar os meus" on public.dados_cliente
  for update to authenticated
  using (utilizador = (select auth.uid())) with check (utilizador = (select auth.uid()));

drop policy if exists "encomendas: ler as minhas" on public.encomendas;
create policy "encomendas: ler as minhas" on public.encomendas
  for select to authenticated using (utilizador = (select auth.uid()));

drop policy if exists "encomendas: gravar as minhas" on public.encomendas;
create policy "encomendas: gravar as minhas" on public.encomendas
  for insert to authenticated with check (utilizador = (select auth.uid()));

-- --------------------------------------------------------------------------
-- 4. Linhas criadas sozinhas quando nasce uma conta (assim o site nunca
--    precisa de poder inserir perfis nem dados_cliente).
-- --------------------------------------------------------------------------
create or replace function public.contas_nova_conta()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.perfis (id) values (new.id) on conflict (id) do nothing;
  insert into public.dados_cliente (utilizador) values (new.id) on conflict (utilizador) do nothing;
  return new;
end;
$$;
revoke execute on function public.contas_nova_conta() from public, anon, authenticated;

drop trigger if exists contas_nova_conta on auth.users;
create trigger contas_nova_conta
  after insert on auth.users
  for each row execute function public.contas_nova_conta();

-- contas que já existissem antes deste ficheiro
insert into public.perfis (id) select id from auth.users on conflict (id) do nothing;
insert into public.dados_cliente (utilizador) select id from auth.users on conflict (utilizador) do nothing;

-- --------------------------------------------------------------------------
-- 5. Datas sempre do servidor
-- --------------------------------------------------------------------------
create or replace function public.contas_marca_atualizacao()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.atualizado_em := now();
  return new;
end;
$$;
revoke execute on function public.contas_marca_atualizacao() from public, anon, authenticated;

drop trigger if exists perfis_atualizado on public.perfis;
create trigger perfis_atualizado before update on public.perfis
  for each row execute function public.contas_marca_atualizacao();

drop trigger if exists dados_cliente_atualizado on public.dados_cliente;
create trigger dados_cliente_atualizado before update on public.dados_cliente
  for each row execute function public.contas_marca_atualizacao();

-- --------------------------------------------------------------------------
-- 6. Limite de encomendas: no máximo 10 por hora por pessoa.
--    O cadeado (advisory lock) por pessoa evita que 20 pedidos em paralelo
--    passem todos a contagem ao mesmo tempo (a mesma correção das avaliações).
-- --------------------------------------------------------------------------
create or replace function public.encomendas_limite()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  max_por_hora constant int := 10;
begin
  perform pg_advisory_xact_lock(hashtext('encomendas:' || new.utilizador::text));
  new.criada_em := now();
  if (select count(*) from public.encomendas
        where utilizador = new.utilizador
          and criada_em > now() - interval '1 hour') >= max_por_hora then
    raise exception 'Demasiadas encomendas seguidas — tente mais tarde.'
      using errcode = 'P0001', hint = 'limite_encomendas';
  end if;
  return new;
end;
$$;
revoke execute on function public.encomendas_limite() from public, anon, authenticated;

drop trigger if exists encomendas_limite on public.encomendas;
create trigger encomendas_limite before insert on public.encomendas
  for each row execute function public.encomendas_limite();

-- --------------------------------------------------------------------------
-- 7. Apagar a minha conta: apaga a conta de quem está com sessão iniciada
--    e, em cascata (on delete cascade), o perfil, o carrinho, os favoritos
--    e as encomendas. Só pode apagar a PRÓPRIA conta.
-- --------------------------------------------------------------------------
create or replace function public.apagar_minha_conta()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  eu uuid := auth.uid();
begin
  if eu is null then
    raise exception 'Sem sessão iniciada.' using errcode = '42501';
  end if;
  delete from auth.users where id = eu;
end;
$$;
revoke execute on function public.apagar_minha_conta() from public, anon;
grant execute on function public.apagar_minha_conta() to authenticated;
