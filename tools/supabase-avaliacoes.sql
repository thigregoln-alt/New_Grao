-- ==========================================================================
-- Avaliações da Grão de Mostarda — base de dados no Supabase
--
-- Como usar: Supabase → o seu projeto → SQL Editor → "New query" → colar
-- este ficheiro inteiro → "Run". Pode ser corrido mais do que uma vez sem
-- estragar nada (é idempotente) — útil se um dia for atualizado.
-- Guia completo: docs/AVALIACOES.md
--
-- Segurança (o mais importante): a chave pública que fica no site só
-- consegue (1) ler avaliações APROVADAS e só as colunas públicas, e
-- (2) criar avaliações novas, sempre PENDENTES. Não consegue aprovar,
-- marcar "compra verificada", responder, alterar nem apagar nada.
-- ==========================================================================

-- --------------------------------------------------------------------------
-- 1. Tabela
-- --------------------------------------------------------------------------
create table if not exists public.avaliacoes (
  id                    uuid primary key default gen_random_uuid(),
  criada_em             timestamptz not null default now(),
  produto_id            text not null check (produto_id ~ '^[a-z0-9]{2,5}-[0-9]{2}$'),
  autor                 text not null check (char_length(btrim(autor)) between 2 and 60),
  classificacao         smallint not null check (classificacao between 1 and 5),
  titulo                text check (titulo is null or char_length(titulo) <= 80),
  texto                 text not null check (char_length(btrim(texto)) between 10 and 600),
  referencia_encomenda  text check (referencia_encomenda is null or referencia_encomenda ~ '^GM-[A-Z0-9]{4,8}$'),
  estado                text not null default 'pendente' check (estado in ('pendente','aprovada','rejeitada')),
  compra_verificada     boolean not null default false,
  resposta_atelier      text check (resposta_atelier is null or char_length(resposta_atelier) <= 600),
  aprovada_em           timestamptz
);

-- lista de um produto, só aprovadas, mais recentes primeiro
create index if not exists avaliacoes_produto_aprovadas
  on public.avaliacoes (produto_id, criada_em desc)
  where estado = 'aprovada';

-- --------------------------------------------------------------------------
-- 2. Row Level Security: sem uma policy que o permita, ninguém lê nem
--    escreve nada através da API.
-- --------------------------------------------------------------------------
alter table public.avaliacoes enable row level security;

-- Leitura pública: só avaliações aprovadas (pendentes e rejeitadas nunca).
drop policy if exists "avaliacoes: ler aprovadas" on public.avaliacoes;
create policy "avaliacoes: ler aprovadas"
  on public.avaliacoes
  for select
  to anon
  using (estado = 'aprovada');

-- Escrita pública: só como pendente, sem selo, sem resposta, sem data de
-- aprovação. Não há policy de update nem de delete para o público.
drop policy if exists "avaliacoes: enviar pendente" on public.avaliacoes;
create policy "avaliacoes: enviar pendente"
  on public.avaliacoes
  for insert
  to anon
  with check (
    estado = 'pendente'
    and compra_verificada = false
    and resposta_atelier is null
    and aprovada_em is null
  );

-- --------------------------------------------------------------------------
-- 3. Colunas que o público pode ver/escrever. O número de encomenda e o
--    estado nunca são lidos publicamente (por isso o site envia com
--    "Prefer: return=minimal" e pede sempre as colunas pelo nome).
--    O papel "authenticated" também fica sem acesso: o site não usa
--    contas de utilizador.
-- --------------------------------------------------------------------------
revoke all on public.avaliacoes from anon;
revoke all on public.avaliacoes from authenticated;

grant select (id, criada_em, produto_id, autor, classificacao, titulo, texto, compra_verificada, resposta_atelier)
  on public.avaliacoes to anon;

grant insert (produto_id, autor, classificacao, titulo, texto, referencia_encomenda)
  on public.avaliacoes to anon;

-- --------------------------------------------------------------------------
-- 4. Data de aprovação preenchida sozinha quando o estado passa a
--    'aprovada' (e limpa se voltar a pendente/rejeitada).
-- --------------------------------------------------------------------------
create or replace function public.avaliacoes_marca_aprovacao()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.estado = 'aprovada' and old.estado is distinct from 'aprovada' then
    new.aprovada_em := now();
  elsif new.estado <> 'aprovada' then
    new.aprovada_em := null;
  end if;
  return new;
end;
$$;

drop trigger if exists avaliacoes_marca_aprovacao on public.avaliacoes;
create trigger avaliacoes_marca_aprovacao
  before update on public.avaliacoes
  for each row
  execute function public.avaliacoes_marca_aprovacao();

-- --------------------------------------------------------------------------
-- 5. Resumo por produto (média, contagem e distribuição de estrelas), só
--    com aprovadas — para a ficha, os cartões da loja e a página de
--    avaliações não terem de descarregar todas as avaliações.
--    A vista corre com as permissões do dono (é o comportamento normal de
--    uma view em Postgres) e por isso filtra ela própria por
--    estado = 'aprovada'; o público só tem acesso à vista, que não expõe
--    texto, nome nem número de encomenda. O Supabase pode mostrar um aviso
--    "Security Definer View" no Security Advisor: aqui é intencional.
-- --------------------------------------------------------------------------
create or replace view public.resumo_avaliacoes as
  select
    produto_id,
    count(*)::int                                          as contagem,
    round(avg(classificacao)::numeric, 2)                  as media,
    count(*) filter (where classificacao = 1)::int         as estrelas_1,
    count(*) filter (where classificacao = 2)::int         as estrelas_2,
    count(*) filter (where classificacao = 3)::int         as estrelas_3,
    count(*) filter (where classificacao = 4)::int         as estrelas_4,
    count(*) filter (where classificacao = 5)::int         as estrelas_5
  from public.avaliacoes
  where estado = 'aprovada'
  group by produto_id;

revoke all on public.resumo_avaliacoes from anon, authenticated;
grant select on public.resumo_avaliacoes to anon;

-- --------------------------------------------------------------------------
-- 6. (Opcional) Apagar sozinho as avaliações rejeitadas com mais de 30
--    dias. Precisa da extensão pg_cron: Database → Extensions → pg_cron →
--    Enable. Depois descomentar as duas linhas abaixo e correr de novo.
--    Sem isto, apagar à mão no Table Editor (ver docs/AVALIACOES.md).
-- --------------------------------------------------------------------------
-- select cron.schedule('apagar-avaliacoes-rejeitadas', '0 3 * * *',
--   $$delete from public.avaliacoes where estado = 'rejeitada' and criada_em < now() - interval '30 days'$$);
