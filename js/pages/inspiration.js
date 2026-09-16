/* ==========================================================================
   Página: Inspiração — versículos e histórias ligadas às categorias.
   ========================================================================== */
(function (GDM) {
  'use strict';
  const { el } = GDM.security;
  GDM.pages = GDM.pages || {};

  function card(item, idx) {
    const art = el('div', { class: 'product-card__media', style: 'aspect-ratio:16/10' });
    art.innerHTML = '<svg viewBox="0 0 400 250" style="width:100%;height:100%"><defs><linearGradient id="insp' + idx + '" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#3a2216"/><stop offset="1" stop-color="#1c1108"/></linearGradient></defs><rect width="400" height="250" fill="url(#insp' + idx + ')"/><g transform="translate(150,90) scale(1.3)">' + GDM.motifs.mustardBranch({ leafColor: idx % 2 ? '#c9a25e' : '#a9b899', flip: !!(idx % 2) }) + '</g></svg>';

    const cat = GDM.catalog.CATEGORIES.find(function (c) { return c.slug === item.category; });

    return el('article', { class: 'panel', style: 'padding:0;overflow:hidden', 'data-reveal': 'fade' }, [
      art,
      el('div', { style: 'padding:20px' }, [
        el('h3', { text: item.title, style: 'margin-bottom:8px' }),
        el('blockquote', { class: 'story-teaser__verse', style: 'font-size:1rem;margin-block:8px' }, [
          document.createTextNode(item.verse),
          el('cite', { text: item.ref }),
        ]),
        el('p', { text: item.text, style: 'color:var(--ink-700);margin-bottom:16px' }),
        el('a', { class: 'btn btn--outline btn--sm', href: '#/loja?categoria=' + item.category, text: 'Ver ' + (cat ? cat.label : '') }),
      ]),
    ]);
  }

  function render(container) {
    container.innerHTML = '';
    container.appendChild(GDM.components.pageHero({
      eyebrow: 'Fé em cada detalhe',
      title: 'Inspiração',
      lede: 'Pequenas histórias bíblicas que dão sentido a cada categoria do nosso ateliê.',
    }));
    const grid = el('div', { class: 'container grid-auto', style: 'padding-block:var(--space-2xl);grid-template-columns:repeat(auto-fill,minmax(320px,1fr))' });
    GDM.content.INSPIRATION.forEach(function (item, idx) { grid.appendChild(card(item, idx)); });
    container.appendChild(grid);
  }

  GDM.pages.inspiration = { render: render };
})(window.GDM = window.GDM || {});
