/* ==========================================================================
   Imitação local da API do Supabase usada pelas avaliações — SÓ PARA
   TESTES (não é usada pelo site publicado). Node puro, sem dependências.

   Uso:  node tools/mock-supabase.js [porta]        (porta por defeito 54321)

   Imita os endpoints que js/state/reviews.js usa, com as mesmas regras que
   tools/supabase-avaliacoes.sql põe na base de dados real:
     GET  /rest/v1/avaliacoes          só aprovadas; só colunas públicas
                                       (pedir estado/referencia_encomenda ou
                                       select=* dá 401); order, limit, offset,
                                       filtros eq.; Prefer: count=exact
     POST /rest/v1/avaliacoes          só produto_id, autor, classificacao,
                                       titulo, texto, referencia_encomenda
                                       (estado, compra_verificada, … -> 401);
                                       validações do SQL -> 400; fica pendente
     PATCH/DELETE                      sempre 401 (sem policy para o público)
     GET  /rest/v1/resumo_avaliacoes   média/contagem/distribuição das aprovadas
   Pedidos sem o cabeçalho apikey certo -> 401.

   Endpoints só de teste (fazem o papel do Table Editor do Supabase):
     GET  /__admin/todas               todas as linhas, incluindo pendentes
     POST /__admin/aprovar   {id, compra_verificada?, resposta_atelier?}
     POST /__admin/inserir   {…linha completa, já aprovada se se quiser}
     POST /__admin/modo      {modo: 'normal'|'lento'|'erro'}
     POST /__admin/limpar
   ========================================================================== */
'use strict';

const http = require('http');
const crypto = require('crypto');

const PORTA = Number(process.argv[2]) || 54321;
const CHAVE = process.env.MOCK_CHAVE || 'sb_publishable_teste';
const PUBLICAS = ['id', 'criada_em', 'produto_id', 'autor', 'classificacao', 'titulo', 'texto', 'compra_verificada', 'resposta_atelier'];
const INSERIVEIS = ['produto_id', 'autor', 'classificacao', 'titulo', 'texto', 'referencia_encomenda'];

let linhas = [];
let modo = 'normal';

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

const servidor = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  if (req.method === 'OPTIONS') return responder(res, 204);

  // ---- endpoints só de teste ----
  if (url.pathname.startsWith('/__admin/')) {
    const corpo = req.method === 'POST' ? await lerCorpo(req) : {};
    const acao = url.pathname.slice('/__admin/'.length);
    if (acao === 'todas') return responder(res, 200, linhas);
    if (acao === 'limpar') { linhas = []; return responder(res, 200, { ok: true }); }
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
  if (req.headers.apikey !== CHAVE) return responder(res, 401, { message: 'Invalid API key' });

  const tabela = url.pathname.replace('/rest/v1/', '');
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
      linhas.push(novaLinha(corpo));
      if (/return=representation/.test(req.headers.prefer || '')) return negado(res); // sem select em estado/referencia
      return responder(res, 201);
    }
    return negado(res); // PATCH / DELETE: sem policy para o público
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

servidor.listen(PORTA, '127.0.0.1', () => console.log('mock do Supabase em http://127.0.0.1:' + PORTA + ' (chave: ' + CHAVE + ')'));
