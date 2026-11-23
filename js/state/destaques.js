/* ==========================================================================
   Destaques — o selo "Destaque" vai para os produtos mais vistos.
   Ver tools/supabase-destaques.sql.

   - registar(produtoId): chamado ao abrir a ficha de um produto. A base de
     dados só conta 1 visita por ligação e por produto em 24 horas. Não
     conta robôs nem quem clicou "Recusar" no aviso de cookies.
   - lista(): ids dos produtos em destaque (os QUANTOS mais vistos dos
     últimos 30 dias, só os que têm pelo menos 5 visitas). Um só pedido por
     página; sem configuração, com erro ou sem visitas suficientes devolve
     uma lista vazia e o site fica sem selos.

   Usa a mesma ligação ao Supabase que as avaliações (js/state/reviews.js),
   incluindo o modo de teste local (tools/mock-supabase.js).
   ========================================================================== */
(function (GDM) {
  'use strict';

  const QUANTOS = 4;
  // robôs (Google, testes automáticos…) não contam como visitas
  const ROBO = /bot|crawl|spider|slurp|lighthouse|headless|preview/i;

  let pedidoLista = null;

  function ligado() {
    return !!(GDM.reviews && GDM.reviews.configurado());
  }

  function registar(produtoId) {
    if (!ligado() || !GDM.catalog.getById(produtoId)) return;
    if (navigator.webdriver || ROBO.test(navigator.userAgent || '')) return;
    // o aviso de cookies diz que as estatísticas de visitas se podem recusar: quem recusou não conta
    const escolha = GDM.consent && GDM.consent.getChoice();
    if (escolha && escolha.status === 'rejected') return;
    GDM.reviews.pedido('rpc/registar_visualizacao', {
      metodo: 'POST',
      cabecalhos: { 'Content-Type': 'application/json', Prefer: 'return=minimal' },
      corpo: JSON.stringify({ produto: produtoId }),
    }); // o resultado não interessa: se falhar, esta visita só não conta
  }

  /** -> Promise de um array de ids (pode ser vazio). Nunca rejeita. */
  function lista() {
    if (pedidoLista) return pedidoLista;
    if (!ligado()) return Promise.resolve([]);
    pedidoLista = GDM.reviews.pedido('produtos_mais_vistos?select=produto_id,visitas').then(function (r) {
      if (r.erro) return [];
      return r.resposta.json().then(function (linhas) {
        if (!Array.isArray(linhas)) return [];
        const ids = [];
        linhas.forEach(function (l) {
          // dados da base de dados: só ids que existem no catálogo
          if (l && typeof l.produto_id === 'string' && GDM.catalog.getById(l.produto_id) && ids.indexOf(l.produto_id) === -1 && ids.length < QUANTOS) {
            ids.push(l.produto_id);
          }
        });
        return ids;
      }, function () { return []; });
    });
    return pedidoLista;
  }

  GDM.destaques = { QUANTOS: QUANTOS, registar: registar, lista: lista };
})(window.GDM = window.GDM || {});
