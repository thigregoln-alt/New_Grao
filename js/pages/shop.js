/* ==========================================================================
   Página: Loja — catálogo com pesquisa, filtro por categoria e ordenação.
   Estado de filtro vive na própria URL (#/loja?categoria=...&pesquisa=...).
   ========================================================================== */
(function (GDM) {
  'use strict';
  const { el } = GDM.security;
  GDM.pages = GDM.pages || {};

  function buildQuery(overrides, current) {
    const merged = Object.assign({}, current, overrides);
    const parts = Object.keys(merged).filter(function (k) { return merged[k]; }).map(function (k) {
      return encodeURIComponent(k) + '=' + encodeURIComponent(merged[k]);
    });
    return '/loja' + (parts.length ? '?' + parts.join('&') : '');
  }

  function applyFilters(query) {
    const term = GDM.security.sanitizeInput(query.pesquisa || '', 60).toLowerCase();
    const category = GDM.security.sanitizeSlug(query.categoria || '');
    const sort = query.ordenar || 'relevancia';

    let list = GDM.catalog.PRODUCTS.slice();
    if (category) list = list.filter(function (p) { return p.category === category; });
    if (term) {
      list = list.filter(function (p) {
        return p.name.toLowerCase().indexOf(term) !== -1 ||
          p.description.toLowerCase().indexOf(term) !== -1 ||
          p.categoryLabel.toLowerCase().indexOf(term) !== -1;
      });
    }
    if (sort === 'preco-asc') list.sort(function (a, b) { return a.price - b.price; });
    else if (sort === 'preco-desc') list.sort(function (a, b) { return b.price - a.price; });
    else if (sort === 'avaliacao') list.sort(function (a, b) { return GDM.reviews.summaryFor(b.id).avg - GDM.reviews.summaryFor(a.id).avg; });
    else list.sort(function (a, b) { return (b.featured ? 1 : 0) - (a.featured ? 1 : 0); });
    return { list: list, term: term, category: category, sort: sort };
  }

  function render(container, params, query) {
    const state = applyFilters(query);
    container.innerHTML = '';

    container.appendChild(GDM.components.pageHero({
      eyebrow: 'Catálogo completo',
      title: 'A Loja',
      lede: 'Nove categorias de peças feitas à mão, preparadas consoante a sua encomenda.',
    }));

    const wrap = el('div', { class: 'section section--tight' });
    const inner = el('div', { class: 'container' });

    const searchInput = el('input', { type: 'search', value: query.pesquisa || '', placeholder: 'Pesquisar por nome, categoria…', 'aria-label': 'Pesquisar produtos' });
    const searchForm = el('form', { class: 'search-box', role: 'search', style: 'max-width:420px' });
    const sIcon = document.createElement('span'); sIcon.innerHTML = GDM.icons.icon('search'); sIcon.setAttribute('aria-hidden', 'true');
    searchForm.appendChild(sIcon); searchForm.appendChild(searchInput);
    searchForm.addEventListener('submit', function (e) {
      e.preventDefault();
      GDM.router.navigate(buildQuery({ pesquisa: GDM.security.sanitizeInput(searchInput.value, 60) }, query));
    });

    const sortSelect = el('select', { 'aria-label': 'Ordenar por' }, [
      el('option', { value: 'relevancia', text: 'Relevância' }),
      el('option', { value: 'preco-asc', text: 'Preço: menor para maior' }),
      el('option', { value: 'preco-desc', text: 'Preço: maior para menor' }),
      el('option', { value: 'avaliacao', text: 'Melhor avaliação' }),
    ]);
    sortSelect.value = state.sort;

    const sortLabels = {
      'relevancia': 'Relevância',
      'preco-asc': 'Preço: menor para maior',
      'preco-desc': 'Preço: maior para menor',
      'avaliacao': 'Melhor avaliação',
    };
    const sortWrap = el('div', { class: 'shop-toolbar__sort' });
    const sortDropdown = el('div', { class: 'shop-sort-dropdown', 'data-open': 'false' });
    const sortToggle = el('button', { type: 'button', class: 'shop-sort-toggle', 'aria-haspopup': 'listbox', 'aria-expanded': 'false' });
    const sortToggleLabel = el('span', { class: 'shop-sort-toggle__label' }, [
      el('span', { class: 'shop-sort-toggle__meta', text: 'Ordenar' }),
      el('span', { class: 'shop-sort-toggle__value', text: sortLabels[state.sort] }),
    ]);
    const sortArrow = document.createElement('span');
    sortArrow.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>';
    sortToggle.appendChild(sortToggleLabel);
    sortToggle.appendChild(sortArrow);

    const sortMenu = el('div', { class: 'shop-sort-menu', role: 'listbox', 'aria-label': 'Ordenar por' });
    Object.keys(sortLabels).forEach(function (key) {
      const option = el('button', { type: 'button', class: 'shop-sort-option', role: 'option', 'aria-selected': String(state.sort === key) });
      option.appendChild(el('span', { class: 'shop-sort-option__mark', 'aria-hidden': 'true' }));
      option.appendChild(el('span', { class: 'shop-sort-option__text', text: sortLabels[key] }));
      option.addEventListener('click', function () {
        closeSort();
        GDM.router.navigate(buildQuery({ ordenar: key }, query));
      });
      sortMenu.appendChild(option);
    });
    function closeSort() {
      sortDropdown.dataset.open = 'false';
      sortToggle.setAttribute('aria-expanded', 'false');
    }
    sortToggle.addEventListener('click', function () {
      const open = sortDropdown.dataset.open !== 'true';
      sortDropdown.dataset.open = String(open);
      sortToggle.setAttribute('aria-expanded', String(open));
    });
    document.addEventListener('click', function (event) {
      if (!sortDropdown.contains(event.target)) closeSort();
    }, { once: false });
    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape') closeSort();
    });
    sortDropdown.appendChild(sortToggle);
    sortDropdown.appendChild(sortMenu);
    sortWrap.appendChild(sortDropdown);

    const toolbar = el('div', { class: 'shop-toolbar' }, [
      searchForm,
      sortWrap,
    ]);

    const filterHeading = el('div', { class: 'shop-filter-heading', 'aria-hidden': 'true' }, [
      el('span', { class: 'shop-filter-heading__label', text: 'Explorar categorias' }),
      el('span', { class: 'shop-filter-heading__rule' }),
    ]);
    const pillsRow = el('div', { class: 'filter-row', role: 'group', 'aria-label': 'Filtrar por categoria' });
    const allPill = el('button', { class: 'filter-pill', type: 'button', 'aria-pressed': String(!state.category), text: 'Todas' });
    allPill.addEventListener('click', function () { GDM.router.navigate(buildQuery({ categoria: '' }, query)); });
    pillsRow.appendChild(allPill);
    GDM.catalog.CATEGORIES.forEach(function (cat) {
      const pill = el('button', { class: 'filter-pill', type: 'button', 'aria-pressed': String(state.category === cat.slug), text: cat.label });
      pill.addEventListener('click', function () { GDM.router.navigate(buildQuery({ categoria: cat.slug }, query)); });
      pillsRow.appendChild(pill);
    });

    const countLabel = el('p', { class: 'shop-results-count', style: 'margin-bottom:16px' }, [
      document.createTextNode(state.list.length + (state.list.length === 1 ? ' produto encontrado' : ' produtos encontrados')),
    ]);

    inner.appendChild(toolbar);
    inner.appendChild(filterHeading);
    inner.appendChild(pillsRow);
    inner.appendChild(countLabel);

    if (state.list.length) {
      const grid = el('div', { class: 'grid-auto' });
      state.list.forEach(function (p) { grid.appendChild(GDM.components.productCard.render(p, { reveal: 'fade' })); });
      inner.appendChild(grid);
    } else {
      const empty = el('div', { class: 'shop-empty' });
      empty.innerHTML = GDM.icons.icon('search');
      empty.appendChild(el('h3', { text: 'Sem resultados para esta pesquisa', style: 'margin-top:12px' }));
      empty.appendChild(el('p', { text: 'Experimente outro termo ou veja todas as categorias.', style: 'color:var(--ink-500);margin-bottom:16px' }));
      empty.appendChild(el('a', { class: 'btn btn--outline', href: '#/loja', text: 'Limpar filtros' }));
      inner.appendChild(empty);
    }

    wrap.appendChild(inner);
    container.appendChild(wrap);

    const activeCat = state.category ? GDM.catalog.CATEGORIES.find(function (c) { return c.slug === state.category; }) : null;
    GDM.meta.set({
      title: activeCat ? 'Loja — ' + activeCat.label : 'Loja',
      description: activeCat ? activeCat.short : 'Nove categorias de peças cristãs feitas à mão: Bíblias, canecas, t-shirts, decoração, cadernos, porta-chaves e kits de pintura infantil.',
      path: '/loja' + (state.category ? '?categoria=' + state.category : ''),
    });
    GDM.meta.setJsonLd('breadcrumb', {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Início', item: GDM.meta.absoluteUrl('/') },
        { '@type': 'ListItem', position: 2, name: activeCat ? activeCat.label : 'Loja', item: GDM.meta.absoluteUrl('#/loja' + (state.category ? '?categoria=' + state.category : '')) },
      ],
    });
  }

  GDM.pages.shop = { render: render };
})(window.GDM = window.GDM || {});
