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
-- 4b. Travões contra spam direto à API: quem tiver a chave pública pode
--     chamar a API sem passar pelo site (sem honeypot, sem tempo mínimo e
--     sem o limite por visita do formulário — isso tudo corre no browser).
--     Por isso estas regras correm AQUI, na base de dados, antes de cada
--     avaliação nova ser gravada. Se alguma falhar, a API responde 400 com
--     código P0001 e o "hint" diz qual foi (o site mostra a mensagem certa):
--
--     a) 'links'          — nome, título ou texto com links (http://, www.)
--     b) 'repetida'       — o mesmo texto já foi enviado nas últimas 24 h
--     c) 'limite_origem'  — a mesma ligação (IP) já enviou 5 avaliações na
--                           última hora ou 15 nas últimas 24 h
--     d) 'limite_global'  — já há 30 avaliações PENDENTES dos últimos 10
--                           minutos (travão de emergência, para o caso de
--                           muitos IPs diferentes ao mesmo tempo)
--
--     Um cliente normal nunca chega perto destes números. Os limites estão
--     no início da função, para ser fácil mudá-los.
--
--     O IP nunca é guardado: guarda-se só um "resumo" (hash SHA-256 do IP
--     com um segredo que nunca sai da base de dados), apagado ao fim de
--     24 horas. Serve só para contar envios. Fica no esquema "privado", que
--     a API não expõe (nem a chave pública nem o site lhe chegam).
--
--     "security definer": o público não consegue ler as pendentes (RLS +
--     colunas) nem o esquema privado, por isso a função corre com as
--     permissões do dono.
-- --------------------------------------------------------------------------
create index if not exists avaliacoes_pendentes_recentes
  on public.avaliacoes (criada_em)
  where estado = 'pendente';

create schema if not exists privado;
revoke all on schema privado from public, anon, authenticated;

-- segredo usado no hash do IP (criado uma vez, aleatório)
create table if not exists privado.segredo (
  id     boolean primary key default true check (id),
  valor  text not null default gen_random_uuid()::text
);
insert into privado.segredo default values on conflict do nothing;

-- um registo por avaliação aceite: só o hash da ligação e a hora
create table if not exists privado.avaliacoes_envios (
  origem     text not null,
  criada_em  timestamptz not null default now()
);
create index if not exists avaliacoes_envios_origem
  on privado.avaliacoes_envios (origem, criada_em);

revoke all on privado.segredo, privado.avaliacoes_envios from public, anon, authenticated;

create or replace function public.avaliacoes_limite_pendentes()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  -- limites (mudar aqui)
  max_por_hora   constant int := 5;
  max_por_dia    constant int := 15;
  max_pendentes  constant int := 30;

  cabecalhos   json;
  ip           text;
  esta_origem  text;
begin
  -- Uma avaliação de cada vez: sem isto, dois pedidos ao mesmo tempo
  -- podiam contar antes de o outro estar gravado e passarem os dois.
  -- O bloqueio é libertado sozinho no fim de cada pedido.
  perform pg_advisory_xact_lock(hashtext('avaliacoes_limite'));

  -- a) sem links
  if concat_ws(' ', new.autor, new.titulo, new.texto) ~* '(https?://|www\.)' then
    raise exception 'As avaliações não podem ter links.'
      using errcode = 'P0001', hint = 'links';
  end if;

  -- b) sem textos repetidos (o mesmo texto, ignorando maiúsculas e espaços)
  if exists (select 1 from public.avaliacoes
               where lower(btrim(texto)) = lower(btrim(new.texto))
                 and criada_em > now() - interval '1 day') then
    raise exception 'Esta avaliação já foi enviada.'
      using errcode = 'P0001', hint = 'repetida';
  end if;

  -- c) limite por ligação. O Supabase passa o IP de quem fez o pedido nos
  --    cabeçalhos (cf-connecting-ip, posto pela Cloudflare e que o cliente
  --    não consegue falsificar). Sem IP (ex.: inserção à mão no Table
  --    Editor), este limite não se aplica — os outros sim.
  cabecalhos := coalesce(nullif(current_setting('request.headers', true), ''), '{}')::json;
  ip := nullif(btrim(coalesce(
          cabecalhos->>'cf-connecting-ip',
          cabecalhos->>'x-real-ip',
          split_part(cabecalhos->>'x-forwarded-for', ',', 1))), '');

  if ip is not null then
    esta_origem := encode(sha256(convert_to((select valor from privado.segredo) || ip, 'UTF8')), 'hex');

    -- limpeza: nada fica guardado mais de 24 horas
    delete from privado.avaliacoes_envios where criada_em < now() - interval '1 day';

    if (select count(*) from privado.avaliacoes_envios
          where origem = esta_origem and criada_em > now() - interval '1 hour') >= max_por_hora
       or (select count(*) from privado.avaliacoes_envios
             where origem = esta_origem) >= max_por_dia then
      raise exception 'Demasiadas avaliações enviadas desta ligação — tente mais tarde.'
        using errcode = 'P0001', hint = 'limite_origem';
    end if;
  end if;

  -- d) travão global de emergência (>= 30: no máximo 30, nunca a 31.ª)
  if (select count(*) from public.avaliacoes
        where estado = 'pendente'
          and criada_em > now() - interval '10 minutes') >= max_pendentes then
    raise exception 'Demasiadas avaliações pendentes recentes — tente mais tarde.'
      using errcode = 'P0001', hint = 'limite_global';
  end if;

  -- passou tudo: conta este envio (se a inserção falhar depois, por
  -- exemplo numa regra da tabela, este registo também é desfeito)
  if esta_origem is not null then
    insert into privado.avaliacoes_envios (origem) values (esta_origem);
  end if;

  return new;
end;
$$;

revoke all on function public.avaliacoes_limite_pendentes() from public, anon, authenticated;

drop trigger if exists avaliacoes_limite_pendentes on public.avaliacoes;
create trigger avaliacoes_limite_pendentes
  before insert on public.avaliacoes
  for each row
  execute function public.avaliacoes_limite_pendentes();

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
--    dias e os registos de envios com mais de 24 horas (estes também são
--    apagados a cada avaliação nova; isto garante-o mesmo sem avaliações).
--    Precisa da extensão pg_cron: Database → Extensions → pg_cron →
--    Enable. Depois descomentar as linhas abaixo e correr de novo.
--    Sem isto, apagar as rejeitadas à mão no Table Editor (ver
--    docs/AVALIACOES.md).
-- --------------------------------------------------------------------------
-- select cron.schedule('apagar-avaliacoes-rejeitadas', '0 3 * * *',
--   $$delete from public.avaliacoes where estado = 'rejeitada' and criada_em < now() - interval '30 days'$$);
-- select cron.schedule('apagar-envios-antigos', '15 3 * * *',
--   $$delete from privado.avaliacoes_envios where criada_em < now() - interval '1 day'$$);
