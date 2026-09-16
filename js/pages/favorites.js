/* ==========================================================================
   Página: Favoritos
   ========================================================================== */
(function (GDM) {
  'use strict';
  const { el } = GDM.security;
  GDM.pages = GDM.pages || {};

  function render(container) {
    container.innerHTML = '';
    container.appendChild(GDM.components.pageHero({ eyebrow: 'Guardados por si', title: 'Os Seus Favoritos', lede: 'Peças que marcou para não perder de vista.' }));

    const section = el('section', { class: 'section section--tight' });
    const inner = el('div', { class: 'container' });
    section.appendChild(inner);
    container.appendChild(section);

    function draw() {
      inner.innerHTML = '';
      const ids = GDM.favorites.list();
      const products = ids.map(function (id) { return GDM.catalog.getById(id); }).filter(Boolean);
      if (!products.length) {
        const empty = el('div', { class: 'empty-state' });
        empty.innerHTML = GDM.icons.icon('heart');
        empty.appendChild(el('h3', { text: 'Ainda não tem favoritos' }));
        empty.appendChild(el('p', { text: 'Toque no coração de qualquer produto para o guardar aqui.' }));
        empty.appendChild(el('a', { class: 'btn btn--primary', href: '#/loja', text: 'Ver a loja' }));
        inner.appendChild(empty);
        return;
      }
      const grid = el('div', { class: 'grid-auto' });
      products.forEach(function (p) { grid.appendChild(GDM.components.productCard.render(p, { reveal: 'fade' })); });
      inner.appendChild(grid);
    }

    draw();
    const off = GDM.bus.on('favorites:change', draw);
    return off;
  }

  GDM.pages.favorites = { render: render };
})(window.GDM = window.GDM || {});
