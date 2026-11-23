/* ==========================================================================
   Imitação local da API do Supabase usada pelas avaliações — SÓ PARA
   TESTES (não é usada pelo site publicado). Node puro, sem dependências.

   Uso:  node tools/mock-supabase.js [porta] [--aprovar-tudo]
         (porta por defeito 54321; --aprovar-tudo aprova cada avaliação
         recebida, para se ver logo o resultado no site)

   Imita os endpoints que js/state/reviews.js usa, com as mesmas regras que
   tools/supabase-avaliacoes.sql põe na base de dados real:
     GET  /rest/v1/avaliacoes          só aprovadas; só colunas públicas
                                       (pedir estado/referencia_encomenda ou
                                       select=* dá 401); order, limit, offset,
                                       filtros eq.; Prefer: count=exact
     POST /rest/v1/avaliacoes          só produto_id, autor, classificacao,
                                       titulo, texto, referencia_encomenda
                                       (estado, compra_verificada, … -> 401);
                                       validações do SQL -> 400; fica pendente;
                                       regras anti-spam da secção 4b -> 400
                                       com code P0001 e o motivo no hint
                                       (links, repetida, limite_origem —
                                       5/hora e 15/dia por IP —, limite_global
                                       — 30 pendentes nos últimos 10 min)
     PATCH/DELETE                      sempre 401 (sem policy para o público)
     GET  /rest/v1/resumo_avaliacoes   média/contagem/distribuição das aprovadas
   Pedidos sem o cabeçalho apikey certo -> 401.

   Contas de cliente (js/state/conta.js, regras de tools/supabase-contas.sql):
     POST /auth/v1/otp                 "envia" o código: aparece AQUI na consola
                                       (1 pedido por minuto por e-mail -> 429)
     POST /auth/v1/verify              código certo -> sessão; errado/expirado
                                       -> 403 otp_expired (5 tentativas)
     POST /auth/v1/token?grant_type=refresh_token | pkce
     GET  /auth/v1/authorize           imita o Google/Facebook: volta logo ao
                                       redirect_to com ?code= (PKCE S256 a sério)
     POST /auth/v1/logout
     GET/PATCH /rest/v1/perfis, /rest/v1/dados_cliente   só a própria linha
     GET/POST  /rest/v1/encomendas     só as próprias; 10 por hora
     POST /rest/v1/rpc/apagar_minha_conta
   MOCK_EXPIRA=<segundos> encurta a validade do token (para testar a renovação).

   Destaques (js/state/destaques.js, regras de tools/supabase-destaques.sql):
     POST /rest/v1/rpc/registar_visualizacao  {produto}  1 visita por IP e
                                       por produto em 24 h; 60 produtos/IP/dia
     GET  /rest/v1/produtos_mais_vistos   os 10 mais vistos com >= 5 visitas

   Endpoints só de teste (fazem o papel do Table Editor do Supabase):
     GET  /__admin/todas               todas as linhas, incluindo pendentes
     POST /__admin/aprovar   {id, compra_verificada?, resposta_atelier?}
     POST /__admin/inserir   {…linha completa, já aprovada se se quiser}
     POST /__admin/modo      {modo: 'normal'|'lento'|'erro'}
     POST /__admin/limpar
     GET  /__admin/contas              utilizadores, perfis, dados e encomendas
     POST /__admin/visitas   {produto_id, visitas}  põe o total de visitas
                                       de um produto (para testar os destaques
                                       sem precisar de 5 IPs diferentes)
   ========================================================================== */
'use strict';

const http = require('http');
const crypto = require('crypto');

const ARGS = process.argv.slice(2);
const PORTA = Number(ARGS.find((a) => /^\d+$/.test(a))) || 54321;
const APROVAR_TUDO = ARGS.includes('--aprovar-tudo');
const CHAVE = process.env.MOCK_CHAVE || 'sb_publishable_teste';
const PUBLICAS = ['id', 'criada_em', 'produto_id', 'autor', 'classificacao', 'titulo', 'texto', 'compra_verificada', 'resposta_atelier'];
const INSERIVEIS = ['produto_id', 'autor', 'classificacao', 'titulo', 'texto', 'referencia_encomenda'];

let linhas = [];
// contas: tudo em memória, como as avaliações
const EXPIRA_S = Number(process.env.MOCK_EXPIRA) || 3600;
let contas = {};      // email -> { id, email }
let codigos = {};     // email -> { codigo, t, tentativas }
let sessoes = {};     // access_token -> { id, exp }
let refreshes = {};   // refresh_token -> id
let pkce = {};        // code -> { desafio, id, t }
let perfis = {};      // id -> perfil
let dadosCliente = {};// id -> { carrinho, favoritos }
let encomendas = [];  // { id, utilizador, ... }
let envios = []; // { origem, t } — como privado.avaliacoes_envios (aqui com o IP em claro: é só no PC)
let visitas = {};      // produto_id -> total (como public.visualizacoes, sem os dias)
let vistas = [];       // { origem, produto, t } — como privado.visualizacoes_vistas
let modo = 'normal';

/* Regras da secção 4b de tools/supabase-avaliacoes.sql (mesma ordem e
   mesmos números). Devolve o hint do erro, ou '' se passar. */
function regrasAntiSpam(l, origem) {
  const agora = Date.now();
  if (/(https?:\/\/|www\.)/i.test([l.autor, l.titulo, l.texto].filter((x) => x != null).join(' '))) return 'links';
  const normal = (s) => String(s).trim().toLowerCase();
  if (linhas.some((x) => normal(x.texto) === normal(l.texto) && Date.parse(x.criada_em) > agora - 24 * 3600 * 1000)) return 'repetida';
  envios = envios.filter((e) => e.t > agora - 24 * 3600 * 1000);
  const destaOrigem = envios.filter((e) => e.origem === origem);
  if (destaOrigem.filter((e) => e.t > agora - 3600 * 1000).length >= 5 || destaOrigem.length >= 15) return 'limite_origem';
  const recentes = linhas.filter((x) => x.estado === 'pendente' && Date.parse(x.criada_em) > agora - 10 * 60 * 1000).length;
  if (recentes >= 30) return 'limite_global';
  return '';
}
const MSG_REGRAS = {
  links: 'As avaliações não podem ter links.',
  repetida: 'Esta avaliação já foi enviada.',
  limite_origem: 'Demasiadas avaliações enviadas desta ligação — tente mais tarde.',
  limite_global: 'Demasiadas avaliações pendentes recentes — tente mais tarde.',
};

function responder(res, estado, corpo, extra) {
  const cab = Object.assign({
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'apikey, authorization, content-type, prefer',
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
    'Access-Control-Expose-Headers': 'Content-Range',
  }, extra || {});
  if (corpo !== undefined) cab['Content-Type'] = 'application/json';
  res.writeHead(estado, cab);
  res.end(corpo === undefined ? '' : JSON.stringify(corpo));
}
const negado = (res) => responder(res, 401, { code: '42501', message: 'permission denied for table avaliacoes' });

function lerCorpo(req) {
  return new Promise((ok) => { let d = ''; req.on('data', (c) => { d += c; }); req.on('end', () => { try { ok(d ? JSON.parse(d) : {}); } catch (e) { ok(null); } }); });
}

function validarLinha(l) {
  const t = (v) => (typeof v === 'string' ? v.trim() : '');
  if (typeof l.produto_id !== 'string' || !/^[a-z0-9]{2,5}-[0-9]{2}$/.test(l.produto_id)) return 'produto_id';
  if (typeof l.autor !== 'string' || t(l.autor).length < 2 || t(l.autor).length > 60) return 'autor';
  if (!Number.isInteger(l.classificacao) || l.classificacao < 1 || l.classificacao > 5) return 'classificacao';
  if (l.titulo != null && (typeof l.titulo !== 'string' || l.titulo.length > 80)) return 'titulo';
  if (typeof l.texto !== 'string' || t(l.texto).length < 10 || t(l.texto).length > 600) return 'texto';
  if (l.referencia_encomenda != null && !/^GM-[A-Z0-9]{4,8}$/.test(l.referencia_encomenda)) return 'referencia_encomenda';
  if (l.resposta_atelier != null && String(l.resposta_atelier).length > 600) return 'resposta_atelier';
  return '';
}

function novaLinha(dados) {
  return Object.assign({
    id: crypto.randomUUID(), criada_em: new Date().toISOString(), titulo: null, referencia_encomenda: null,
    estado: 'pendente', compra_verificada: false, resposta_atelier: null, aprovada_em: null,
  }, dados);
}

function filtrar(lista, params) {
  for (const [k, v] of params) {
    if (['select', 'order', 'limit', 'offset'].includes(k)) continue;
    const eq = /^eq\.(.*)$/.exec(v);
    const lst = /^in\.\((.*)\)$/.exec(v);
    if (eq) lista = lista.filter((l) => String(l[k]) === eq[1]);
    else if (lst) { const vals = lst[1].split(','); lista = lista.filter((l) => vals.includes(String(l[k]))); }
  }
  return lista;
}

function ordenar(lista, order) {
  const regras = (order || '').split(',').filter(Boolean).map((x) => x.split('.'));
  return lista.slice().sort((a, b) => {
    for (const [col, dir] of regras) {
      if (a[col] < b[col]) return dir === 'desc' ? 1 : -1;
      if (a[col] > b[col]) return dir === 'desc' ? -1 : 1;
    }
    return 0;
  });
}

/* ---------------------------------------------------------------------
   Contas
   --------------------------------------------------------------------- */
const aleatorio = (n) => crypto.randomBytes(n).toString('base64url');

function criarConta(email) {
  if (!contas[email]) {
    const id = crypto.randomUUID();
    contas[email] = { id, email };
    // trigger contas_nova_conta
    perfis[id] = { id, nome: '', telefone: '', morada: '', codigo_postal: '', localidade: '', atualizado_em: new Date().toISOString() };
    dadosCliente[id] = { utilizador: id, carrinho: [], favoritos: [], atualizado_em: new Date().toISOString() };
  }
  return contas[email];
}

function novaSessao(conta) {
  const access = 'mock.' + aleatorio(24) + '.token';
  const refresh = aleatorio(18);
  const exp = Math.floor(Date.now() / 1000) + EXPIRA_S;
  sessoes[access] = { id: conta.id, exp };
  refreshes[refresh] = conta.id;
  return { access_token: access, token_type: 'bearer', expires_in: EXPIRA_S, expires_at: exp, refresh_token: refresh, user: { id: conta.id, email: conta.email, aud: 'authenticated', role: 'authenticated' } };
}

function contaPorId(id) { return Object.values(contas).find((c) => c.id === id); }

function utilizadorDoPedido(req) {
  const m = /^Bearer (.+)$/.exec(req.headers.authorization || '');
  const s = m && sessoes[m[1]];
  if (!s || s.exp < Date.now() / 1000 || !contaPorId(s.id)) return null;
  return s.id;
}

const erroAuth = (res, estado, codigo, msg) => responder(res, estado, { code: estado, error_code: codigo, msg });
// como o PostgREST: 401 sem sessão (anon), 403 com sessão mas sem permissão
const semPermissao = (res, tabela, comSessao) => responder(res, comSessao ? 403 : 401, { code: '42501', message: 'permission denied for table ' + tabela });
const violacao = (res, nome) => responder(res, 400, { code: '23514', message: 'violates check constraint "' + nome + '"' });

async function tratarAuth(req, res, url) {
  const acao = url.pathname.slice('/auth/v1/'.length);
  if (acao === 'otp' && req.method === 'POST') {
    const c = await lerCorpo(req);
    const email = String((c && c.email) || '').trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return erroAuth(res, 400, 'email_address_invalid', 'Email address is invalid');
    const antes = codigos[email];
    if (antes && Date.now() - antes.t < 60 * 1000) return erroAuth(res, 429, 'over_email_send_rate_limit', 'For security purposes, you can only request this after 60 seconds.');
    const codigo = String(crypto.randomInt(0, 1000000)).padStart(6, '0');
    codigos[email] = { codigo, t: Date.now(), tentativas: 0 };
    console.log('[contas] código para ' + email + ': ' + codigo);
    return responder(res, 200, {});
  }
  if (acao === 'verify' && req.method === 'POST') {
    const c = await lerCorpo(req) || {};
    const email = String(c.email || '').trim().toLowerCase();
    const reg = codigos[email];
    if (!reg || Date.now() - reg.t > 60 * 60 * 1000 || reg.tentativas >= 5) return erroAuth(res, 403, 'otp_expired', 'Token has expired or is invalid');
    if (String(c.token) !== reg.codigo) { reg.tentativas++; return erroAuth(res, 403, 'otp_expired', 'Token has expired or is invalid'); }
    delete codigos[email];
    return responder(res, 200, novaSessao(criarConta(email)));
  }
  if (acao === 'authorize' && req.method === 'GET') {
    const destino = url.searchParams.get('redirect_to') || '';
    if (!/^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?\//.test(destino)) return responder(res, 400, { msg: 'redirect_to não autorizado' });
    if (url.searchParams.get('code_challenge_method') !== 's256' || !url.searchParams.get('code_challenge')) return responder(res, 400, { msg: 'PKCE em falta' });
    const conta = criarConta('teste-' + url.searchParams.get('provider') + '@exemplo.pt');
    const code = crypto.randomUUID();
    pkce[code] = { desafio: url.searchParams.get('code_challenge'), id: conta.id, t: Date.now() };
    res.writeHead(302, { Location: destino + (destino.includes('?') ? '&' : '?') + 'code=' + code });
    return res.end();
  }
  if (acao.startsWith('token') && req.method === 'POST') {
    const c = await lerCorpo(req) || {};
    const tipo = url.searchParams.get('grant_type');
    if (tipo === 'refresh_token') {
      const id = refreshes[c.refresh_token];
      if (!id || !contaPorId(id)) return erroAuth(res, 400, 'refresh_token_not_found', 'Invalid Refresh Token: Refresh Token Not Found');
      delete refreshes[c.refresh_token];
      return responder(res, 200, novaSessao(contaPorId(id)));
    }
    if (tipo === 'pkce') {
      const reg = pkce[c.auth_code];
      delete pkce[c.auth_code];
      if (!reg || Date.now() - reg.t > 5 * 60 * 1000) return erroAuth(res, 404, 'flow_state_not_found', 'invalid flow state');
      const calculado = crypto.createHash('sha256').update(String(c.code_verifier || '')).digest('base64url');
      if (calculado !== reg.desafio) return erroAuth(res, 403, 'bad_code_verifier', 'code challenge does not match previously saved code verifier');
      return responder(res, 200, novaSessao(contaPorId(reg.id)));
    }
    return erroAuth(res, 400, 'validation_failed', 'grant_type inválido');
  }
  if (acao.startsWith('logout') && req.method === 'POST') {
    const m = /^Bearer (.+)$/.exec(req.headers.authorization || '');
    if (m) delete sessoes[m[1]];
    return responder(res, 204);
  }
  return responder(res, 404, { msg: 'não existe' });
}

const PERFIL_COLUNAS = ['nome', 'telefone', 'morada', 'codigo_postal', 'localidade'];
function validarPerfil(p) {
  if (p.nome != null && String(p.nome).length > 100) return 'perfis_nome_check';
  if (p.telefone != null && (String(p.telefone).length > 30 || !/^[0-9+ ().-]*$/.test(p.telefone))) return 'perfis_telefone_check';
  if (p.morada != null && String(p.morada).length > 200) return 'perfis_morada_check';
  if (p.codigo_postal != null && p.codigo_postal !== '' && !/^[0-9]{4}-[0-9]{3}$/.test(p.codigo_postal)) return 'perfis_codigo_postal_check';
  if (p.localidade != null && String(p.localidade).length > 80) return 'perfis_localidade_check';
  return '';
}

async function tratarContas(req, res, url, tabela) {
  const eu = utilizadorDoPedido(req);
  if (!eu) return semPermissao(res, tabela.replace('rpc/', ''));
  const alvo = (col) => { const m = /^eq\.(.+)$/.exec(url.searchParams.get(col) || ''); return m ? m[1] : null; };

  if (tabela === 'rpc/apagar_minha_conta' && req.method === 'POST') {
    const conta = contaPorId(eu);
    delete contas[conta.email];
    delete perfis[eu]; delete dadosCliente[eu];
    encomendas = encomendas.filter((e) => e.utilizador !== eu);
    Object.keys(sessoes).forEach((t) => { if (sessoes[t].id === eu) delete sessoes[t]; });
    Object.keys(refreshes).forEach((t) => { if (refreshes[t] === eu) delete refreshes[t]; });
    return responder(res, 204);
  }
  if (tabela === 'perfis' || tabela === 'dados_cliente') {
    const guardado = tabela === 'perfis' ? perfis[eu] : dadosCliente[eu];
    const chave = tabela === 'perfis' ? 'id' : 'utilizador';
    if (req.method === 'GET') {
      const cols = (url.searchParams.get('select') || '*').split(',');
      return responder(res, 200, guardado ? [cols[0] === '*' ? guardado : Object.fromEntries(cols.map((c) => [c, guardado[c]]))] : []);
    }
    if (req.method === 'PATCH') {
      const c = await lerCorpo(req);
      if (!c || Array.isArray(c)) return responder(res, 400, { message: 'JSON inválido' });
      const permitidas = tabela === 'perfis' ? PERFIL_COLUNAS : ['carrinho', 'favoritos'];
      if (Object.keys(c).some((k) => !permitidas.includes(k))) return semPermissao(res, tabela, true);
      if (alvo(chave) !== eu || !guardado) return responder(res, 204); // RLS: linha de outra pessoa = 0 linhas alteradas
      if (tabela === 'perfis') {
        const erro = validarPerfil(c);
        if (erro) return violacao(res, erro);
      } else {
        if ('carrinho' in c && (!Array.isArray(c.carrinho) || c.carrinho.length > 60 || JSON.stringify(c.carrinho).length > 8192)) return violacao(res, 'dados_cliente_carrinho_check');
        if ('favoritos' in c && (!Array.isArray(c.favoritos) || c.favoritos.length > 100 || JSON.stringify(c.favoritos).length > 4096)) return violacao(res, 'dados_cliente_favoritos_check');
      }
      Object.assign(guardado, c, { atualizado_em: new Date().toISOString() });
      return responder(res, 204);
    }
    return semPermissao(res, tabela, true);
  }
  if (tabela === 'encomendas') {
    if (req.method === 'GET') {
      const cols = (url.searchParams.get('select') || '*').split(',');
      let lista = ordenar(encomendas.filter((e) => e.utilizador === eu), url.searchParams.get('order'));
      lista = lista.slice(0, Number(url.searchParams.get('limit') || lista.length));
      return responder(res, 200, lista.map((e) => (cols[0] === '*' ? e : Object.fromEntries(cols.map((c) => [c, e[c]])))));
    }
    if (req.method === 'POST') {
      const c = await lerCorpo(req);
      if (!c || Array.isArray(c)) return responder(res, 400, { message: 'JSON inválido' });
      if (Object.keys(c).some((k) => !['numero', 'itens', 'subtotal', 'portes', 'total', 'modo'].includes(k))) return semPermissao(res, tabela, true);
      if (!/^GM-[A-Z0-9]{8}$/.test(c.numero || '')) return violacao(res, 'encomendas_numero_check');
      if (!Array.isArray(c.itens) || !c.itens.length || c.itens.length > 60 || JSON.stringify(c.itens).length > 16384) return violacao(res, 'encomendas_itens_check');
      if (!['whatsapp', 'email'].includes(c.modo)) return violacao(res, 'encomendas_modo_check');
      if (encomendas.some((e) => e.utilizador === eu && e.numero === c.numero)) return responder(res, 409, { code: '23505', message: 'duplicate key value violates unique constraint' });
      if (encomendas.filter((e) => e.utilizador === eu && Date.parse(e.criada_em) > Date.now() - 3600 * 1000).length >= 10) {
        return responder(res, 400, { code: 'P0001', message: 'Demasiadas encomendas seguidas — tente mais tarde.', hint: 'limite_encomendas', details: null });
      }
      encomendas.push(Object.assign({ id: crypto.randomUUID(), utilizador: eu, criada_em: new Date().toISOString() }, c));
      return responder(res, 201);
    }
    return semPermissao(res, tabela, true); // sem editar nem apagar
  }
  return responder(res, 404, { message: 'tabela desconhecida' });
}

const servidor = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  if (req.method === 'OPTIONS') return responder(res, 204);

  // ---- endpoints só de teste ----
  if (url.pathname.startsWith('/__admin/')) {
    const corpo = req.method === 'POST' ? await lerCorpo(req) : {};
    const acao = url.pathname.slice('/__admin/'.length);
    if (acao === 'todas') return responder(res, 200, linhas);
    if (acao === 'limpar') { linhas = []; envios = []; contas = {}; codigos = {}; sessoes = {}; refreshes = {}; pkce = {}; perfis = {}; dadosCliente = {}; encomendas = []; visitas = {}; vistas = []; return responder(res, 200, { ok: true }); }
    if (acao === 'contas') return responder(res, 200, { contas, perfis, dadosCliente, encomendas, codigos });
    if (acao === 'visitas') { visitas[corpo.produto_id] = Number(corpo.visitas) || 0; return responder(res, 200, visitas); }
    if (acao === 'modo') { modo = corpo.modo || 'normal'; return responder(res, 200, { modo }); }
    if (acao === 'inserir') { const l = novaLinha(corpo); if (l.estado === 'aprovada' && !l.aprovada_em) l.aprovada_em = new Date().toISOString(); linhas.push(l); return responder(res, 200, l); }
    if (acao === 'aprovar') {
      const l = linhas.find((x) => x.id === corpo.id);
      if (!l) return responder(res, 404, { message: 'não existe' });
      l.estado = 'aprovada'; l.aprovada_em = new Date().toISOString();
      if ('compra_verificada' in corpo) l.compra_verificada = !!corpo.compra_verificada;
      if ('resposta_atelier' in corpo) l.resposta_atelier = corpo.resposta_atelier;
      return responder(res, 200, l);
    }
    return responder(res, 404, {});
  }

  // ---- API REST ----
  if (modo === 'lento') await new Promise((r) => setTimeout(r, 12000));
  if (modo === 'erro') return responder(res, 500, { message: 'erro simulado' });
  // o browser vai ao /authorize por navegação normal, sem o cabeçalho apikey
  if (url.pathname === '/auth/v1/authorize') return tratarAuth(req, res, url);
  if (req.headers.apikey !== CHAVE) return responder(res, 401, { message: 'Invalid API key' });
  if (url.pathname.startsWith('/auth/v1/')) return tratarAuth(req, res, url);

  const tabela = url.pathname.replace('/rest/v1/', '');
  if (['perfis', 'dados_cliente', 'encomendas', 'rpc/apagar_minha_conta'].includes(tabela)) return tratarContas(req, res, url, tabela);
  if (tabela === 'avaliacoes') {
    if (req.method === 'GET') {
      const cols = (url.searchParams.get('select') || '*').split(',');
      if (cols.some((c) => c === '*' || !PUBLICAS.includes(c))) return negado(res);
      for (const k of url.searchParams.keys()) if (!['select', 'order', 'limit', 'offset'].includes(k) && !PUBLICAS.includes(k)) return negado(res);
      let lista = filtrar(linhas.filter((l) => l.estado === 'aprovada'), url.searchParams);
      lista = ordenar(lista, url.searchParams.get('order'));
      const total = lista.length;
      const offset = Number(url.searchParams.get('offset') || 0);
      const limit = Number(url.searchParams.get('limit') || total);
      const pagina = lista.slice(offset, offset + limit).map((l) => Object.fromEntries(cols.map((c) => [c, l[c]])));
      const extra = /count=exact/.test(req.headers.prefer || '') ? { 'Content-Range': (pagina.length ? offset + '-' + (offset + pagina.length - 1) : '*') + '/' + total } : {};
      return responder(res, 200, pagina, extra);
    }
    if (req.method === 'POST') {
      const corpo = await lerCorpo(req);
      if (!corpo || Array.isArray(corpo)) return responder(res, 400, { message: 'JSON inválido' });
      if (Object.keys(corpo).some((k) => !INSERIVEIS.includes(k))) return negado(res);
      const erro = validarLinha(corpo);
      if (erro) return responder(res, 400, { code: '23514', message: 'violates check constraint "avaliacoes_' + erro + '_check"' });
      // trigger avaliacoes_limite_pendentes do SQL
      const origem = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
      const motivo = regrasAntiSpam(corpo, origem);
      if (motivo) return responder(res, 400, { code: 'P0001', message: MSG_REGRAS[motivo], hint: motivo, details: null });
      envios.push({ origem: origem, t: Date.now() });
      const nova = novaLinha(corpo);
      if (APROVAR_TUDO) { nova.estado = 'aprovada'; nova.aprovada_em = new Date().toISOString(); }
      linhas.push(nova);
      if (/return=representation/.test(req.headers.prefer || '')) return negado(res); // sem select em estado/referencia
      return responder(res, 201);
    }
    return negado(res); // PATCH / DELETE: sem policy para o público
  }
  if (tabela === 'rpc/registar_visualizacao' && req.method === 'POST') {
    const corpo = await lerCorpo(req);
    const produto = corpo && corpo.produto;
    const origem = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    vistas = vistas.filter((v) => Date.now() - v.t < 24 * 3600 * 1000);
    if (typeof produto === 'string' && /^[a-z0-9]{2,5}-[0-9]{2}$/.test(produto)
        && vistas.filter((v) => v.origem === origem).length < 60
        && !vistas.some((v) => v.origem === origem && v.produto === produto)) {
      vistas.push({ origem: origem, produto: produto, t: Date.now() });
      visitas[produto] = (visitas[produto] || 0) + 1;
      console.log('visita contada: ' + produto + ' (total ' + visitas[produto] + ')');
    }
    return responder(res, 204);
  }
  if (tabela.startsWith('produtos_mais_vistos') && req.method === 'GET') {
    const lista = Object.keys(visitas).filter((id) => visitas[id] >= 5)
      .sort((a, b) => visitas[b] - visitas[a] || (a < b ? -1 : 1)).slice(0, 10)
      .map((id) => ({ produto_id: id, visitas: visitas[id] }));
    return responder(res, 200, lista);
  }
  if (tabela.startsWith('resumo_avaliacoes') && req.method === 'GET') {
    const grupos = {};
    linhas.filter((l) => l.estado === 'aprovada').forEach((l) => {
      const g = grupos[l.produto_id] = grupos[l.produto_id] || { produto_id: l.produto_id, contagem: 0, soma: 0, estrelas_1: 0, estrelas_2: 0, estrelas_3: 0, estrelas_4: 0, estrelas_5: 0 };
      g.contagem++; g.soma += l.classificacao; g['estrelas_' + l.classificacao]++;
    });
    let lista = Object.values(grupos).map((g) => { const m = Math.round((g.soma / g.contagem) * 100) / 100; delete g.soma; return Object.assign(g, { media: m.toFixed(2) }); });
    lista = filtrar(lista, url.searchParams);
    return responder(res, 200, lista);
  }
  return responder(res, 404, { message: 'tabela desconhecida' });
});

servidor.listen(PORTA, '127.0.0.1', () => console.log('mock do Supabase em http://127.0.0.1:' + PORTA + ' (chave: ' + CHAVE + ')' + (APROVAR_TUDO ? ' — a aprovar tudo automaticamente' : '')));
