/* ==========================================================================
   Página: /admin — MAQUETE de demonstração, sem autenticação real.
   Não existe backend: os números de encomendas/receita abaixo são dados de
   exemplo fixos, não dados reais. Os únicos dados reais mostrados são os
   guardados no localStorage deste browser (carrinho, favoritos, newsletter).
   Ver ARCHITECTURE.md, secção "Administração".
   ========================================================================== */
(function (GDM) {
  'use strict';
  const { el } = GDM.security;
  GDM.pages = GDM.pages || {};

  const DEMO_ORDERS = [
    { id: 'GM-A1B2C3', client: 'Rita F.', total: 68.8, status: 'A confirmar pagamento' },
    { id: 'GM-D4E5F6', client: 'Miguel C.', total: 54.9, status: 'Em produção' },
    { id: 'GM-G7H8I9', client: 'Sofia R.', total: 31.8, status: 'Enviada' },
    { id: 'GM-J1K2L3', client: 'André T.', total: 8.9, status: 'Entregue' },
  ];

  function statCard(value, label) {
    return el('div', { class: 'admin-stat stack', style: 'gap:4px' }, [el('strong', { text: value }), el('span', { text: label, style: 'color:var(--ink-500);font-size:var(--fs-sm)' })]);
  }

  function render(container) {
    container.innerHTML = '';
    container.appendChild(GDM.components.pageHero({ eyebrow: 'Área interna', title: 'Painel de Administração', lede: 'Maquete de demonstração — sem autenticação real e sem dados de encomendas reais.' }));

    const section = el('section', { class: 'section section--tight' });
    const inner = el('div', { class: 'container stack', style: 'gap:28px' });

    const banner = el('div', { class: 'admin-banner' });
    banner.innerHTML = GDM.icons.icon('shield');
    banner.appendChild(el('span', { text: 'Esta página é uma demonstração visual. Não há sessão de administrador nem base de dados real — ver ARCHITECTURE.md.' }));
    inner.appendChild(banner);

    const stats = el('div', { class: 'admin-stats' }, [
      statCard('4', 'Encomendas de exemplo'),
      statCard(GDM.format.currency(164.4), 'Receita de exemplo (mês)'),
      statCard(String(GDM.catalog.PRODUCTS.length), 'Produtos no catálogo (real)'),
      statCard(String(GDM.content.REVIEWS.length), 'Avaliações-semente (real)'),
    ]);
    inner.appendChild(stats);

    const tableWrap = el('div', { class: 'panel' });
    tableWrap.appendChild(el('h2', { text: 'Encomendas recentes (dados de exemplo)', style: 'font-size:1.1rem;margin-bottom:12px' }));
    const table = el('table', { class: 'admin-table' });
    const thead = el('thead', {}, [el('tr', {}, ['ID', 'Cliente', 'Total', 'Estado'].map(function (h) { return el('th', { text: h }); }))]);
    const tbody = el('tbody', {}, DEMO_ORDERS.map(function (o) {
      return el('tr', {}, [el('td', { text: o.id }), el('td', { text: o.client }), el('td', { text: GDM.format.currency(o.total) }), el('td', {}, [el('span', { class: 'badge badge--outline', text: o.status })])]);
    }));
    table.appendChild(thead); table.appendChild(tbody);
    const tableScroll = el('div', { style: 'overflow-x:auto' }, [table]);
    tableWrap.appendChild(tableScroll);
    inner.appendChild(tableWrap);

    const realDataPanel = el('div', { class: 'panel' });
    realDataPanel.appendChild(el('h2', { text: 'Dados reais deste dispositivo (localStorage)', style: 'font-size:1.1rem;margin-bottom:12px' }));
    const cartState = GDM.cart.getState();
    const nl = GDM.newsletter.status();
    const realList = el('ul', { class: 'stack', style: 'gap:6px' }, [
      el('li', { text: 'Artigos no carrinho: ' + cartState.count }),
      el('li', { text: 'Favoritos guardados: ' + GDM.favorites.count() }),
      el('li', { text: 'Avaliações escritas neste browser: ' + (GDM.reviews.all().length - GDM.content.REVIEWS.length) }),
      el('li', { text: 'Newsletter: ' + (nl ? 'subscrito com ' + nl.email : 'sem subscrição neste dispositivo') }),
    ]);
    realDataPanel.appendChild(realList);
    inner.appendChild(realDataPanel);

    section.appendChild(inner);
    container.appendChild(section);
  }

  GDM.pages.admin = { render: render };
})(window.GDM = window.GDM || {});
