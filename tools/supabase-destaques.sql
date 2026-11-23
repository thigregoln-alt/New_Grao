-- ==========================================================================
-- Destaques da Grão de Mostarda — contagem de visitas às fichas de produto
--
-- O selo "Destaque" deixou de ser escolhido à mão: vai para os produtos
-- mais vistos. Cada vez que alguém abre a ficha de um produto, o site
-- chama registar_visualizacao(); a vista produtos_mais_vistos devolve os
-- mais vistos dos últimos 30 dias. O site mostra o selo nos 4 primeiros
-- (js/state/destaques.js).
--
-- Como usar: Supabase → o seu projeto → SQL Editor → "New query" → colar
-- este ficheiro inteiro → "Run". Pode ser corrido mais do que uma vez sem
-- estragar nada (é idempotente). Precisa do esquema "privado" e da tabela
-- privado.segredo — são criados aqui se ainda não existirem (também são
-- criados pelo tools/supabase-avaliacoes.sql).
--
-- Regras (mudar aqui):
--   * a mesma ligação (IP) só conta 1 visita por produto em 24 horas
--     (F5 seguidos não fazem um produto subir);
--   * a mesma ligação conta no máximo 60 produtos diferentes em 24 horas;
--   * só entram nos mais vistos os produtos com pelo menos 5 visitas
--     nos últimos 30 dias (com pouco movimento, ninguém tem o selo).
--
-- Privacidade: o IP nunca é guardado. Guarda-se só um "resumo" (hash
-- SHA-256 do IP com um segredo que nunca sai da base de dados), apagado
-- ao fim de 24 horas, como nas avaliações. O que fica é só o total de
-- visitas por produto e por dia, sem nada sobre quem visitou.
--
-- Segurança: a chave pública só consegue (1) chamar registar_visualizacao
-- e (2) ler a vista produtos_mais_vistos. Não consegue ler nem alterar a
-- tabela das visitas diretamente.
-- ==========================================================================

-- --------------------------------------------------------------------------
-- 1. Total de visitas por produto e por dia
-- --------------------------------------------------------------------------
create table if not exists public.visualizacoes (
  produto_id  text not null check (produto_id ~ '^[a-z0-9]{2,5}-[0-9]{2}$'),
  dia         date not null default current_date,
  visitas     int not null default 0 check (visitas >= 0),
  primary key (produto_id, dia)
);

create index if not exists visualizacoes_dia on public.visualizacoes (dia);

-- sem policies: através da API ninguém lê nem escreve a tabela
alter table public.visualizacoes enable row level security;
revoke all on public.visualizacoes from anon, authenticated;

-- --------------------------------------------------------------------------
-- 2. Quem já contou hoje (só o hash da ligação, apagado ao fim de 24 h)
-- --------------------------------------------------------------------------
create schema if not exists privado;
revoke all on schema privado from public, anon, authenticated;

create table if not exists privado.segredo (
  id     boolean primary key default true check (id),
  valor  text not null default gen_random_uuid()::text
);
insert into privado.segredo default values on conflict do nothing;

create table if not exists privado.visualizacoes_vistas (
  origem      text not null,
  produto_id  text not null,
  criada_em   timestamptz not null default now(),
  primary key (origem, produto_id)
);
create index if not exists visualizacoes_vistas_criada
  on privado.visualizacoes_vistas (criada_em);

alter table privado.visualizacoes_vistas enable row level security;
revoke all on privado.segredo, privado.visualizacoes_vistas from public, anon, authenticated;

-- --------------------------------------------------------------------------
-- 3. Registar uma visita: POST /rest/v1/rpc/registar_visualizacao
--    com o corpo {"produto": "bib-01"}. Não devolve nada.
--    "security definer": o público não tem acesso às tabelas, por isso a
--    função corre com as permissões do dono.
-- --------------------------------------------------------------------------
create or replace function public.registar_visualizacao(produto text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  -- limite (mudar aqui)
  max_produtos_por_dia  constant int := 60;

  cabecalhos   json;
  ip           text;
  esta_origem  text;
  novas        int;
begin
  if produto is null or produto !~ '^[a-z0-9]{2,5}-[0-9]{2}$' then
    return;
  end if;

  -- IP de quem fez o pedido (o mesmo método das avaliações). Sem IP não
  -- se conta nada, porque não há forma de travar repetições.
  cabecalhos := coalesce(nullif(current_setting('request.headers', true), ''), '{}')::json;
  ip := nullif(btrim(coalesce(
          cabecalhos->>'cf-connecting-ip',
          cabecalhos->>'x-real-ip',
          split_part(cabecalhos->>'x-forwarded-for', ',', 1))), '');
  if ip is null then
    return;
  end if;

  esta_origem := encode(sha256(convert_to((select valor from privado.segredo) || ip, 'UTF8')), 'hex');

  -- limpeza: nada fica guardado mais de 24 horas
  delete from privado.visualizacoes_vistas where criada_em < now() - interval '1 day';

  if (select count(*) from privado.visualizacoes_vistas where origem = esta_origem) >= max_produtos_por_dia then
    return;
  end if;

  -- 1 visita por ligação e por produto em 24 horas
  insert into privado.visualizacoes_vistas (origem, produto_id)
    values (esta_origem, produto)
    on conflict do nothing;
  get diagnostics novas = row_count;
  if novas = 0 then
    return;
  end if;

  insert into public.visualizacoes as v (produto_id, dia, visitas)
    values (produto, current_date, 1)
    on conflict (produto_id, dia) do update set visitas = v.visitas + 1;

  -- os totais com mais de 30 dias já não contam para nada
  delete from public.visualizacoes where dia < current_date - 30;
end;
$$;

revoke all on function public.registar_visualizacao(text) from public, anon, authenticated;
grant execute on function public.registar_visualizacao(text) to anon, authenticated;

-- --------------------------------------------------------------------------
-- 4. Os mais vistos dos últimos 30 dias (no máximo 10, por ordem).
--    O site fica com os 4 primeiros que existirem no catálogo.
--    A vista corre com as permissões do dono (como resumo_avaliacoes) e o
--    público só vê o id do produto e o total. O Supabase pode mostrar um
--    aviso "Security Definer View" no Security Advisor: aqui é intencional.
-- --------------------------------------------------------------------------
create or replace view public.produtos_mais_vistos as
  select produto_id, sum(visitas)::int as visitas
  from public.visualizacoes
  where dia >= current_date - 30
  group by produto_id
  having sum(visitas) >= 5
  order by sum(visitas) desc, produto_id
  limit 10;

revoke all on public.produtos_mais_vistos from anon, authenticated;
grant select on public.produtos_mais_vistos to anon, authenticated;
