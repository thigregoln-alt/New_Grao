/* ==========================================================================
   Página 404
   ========================================================================== */
(function (GDM) {
  'use strict';
  const { el } = GDM.security;
  GDM.pages = GDM.pages || {};

  function render(container) {
    container.innerHTML = '';
    const art = document.createElement('div');
    art.style.width = '96px';
    art.innerHTML = '<svg viewBox="0 0 100 100"><g transform="translate(20 20) scale(1.6)">' + GDM.motifs.seed({ r: 12 }) + '</g></svg>';
    const wrap = el('div', { class: 'container not-found' }, [
      art,
      el('p', { class: 'eyebrow', text: 'Erro 404' }),
      el('h1', { text: 'Esta página não floresceu por aqui' }),
      el('p', { text: 'O endereço que procura pode ter mudado ou não existe. Vamos ajudá-lo a encontrar o caminho de volta.', style: 'max-width:50ch' }),
      el('div', { class: 'cluster', style: 'gap:12px' }, [
        el('a', { class: 'btn btn--primary', href: '#/', text: 'Voltar ao início' }),
        el('a', { class: 'btn btn--outline', href: '#/loja', text: 'Ver a loja' }),
      ]),
    ]);
    container.appendChild(wrap);
  }

  GDM.pages.notFound = { render: render };
})(window.GDM = window.GDM || {});
