/* ==========================================================================
   Página: Avaliações — prova social com filtro, ordenação e formulário.
   ========================================================================== */
(function (GDM) {
  'use strict';
  const { el } = GDM.security;
  GDM.pages = GDM.pages || {};

  function reviewCard(r, productName) {
    return el('div', { class: 'review-card', 'data-reveal': 'fade' }, [
      el('div', { class: 'review-card__head' }, [
        el('div', { class: 'review-card__author' }, [
          el('strong', { text: r.author }),
          r.verified ? el('span', { class: 'badge badge--gold', text: 'Compra verificada' }) : el('span', { class: 'badge badge--outline', text: 'Não verificada' }),
        ]),
        el('span', { style: 'color:var(--ink-500);font-size:var(--fs-xs)', text: GDM.format.dateLabel(r.date) }),
      ]),
      GDM.components.starRow(r.rating),
      r.title ? el('p', { style: 'font-weight:700', text: r.title }) : null,
      el('p', { style: 'color:var(--ink-700)', text: r.body }),
      productName ? el('a', { href: '#/produto/' + r.productSlug, 'data-route-link': '', style: 'font-size:var(--fs-xs);color:var(--gold-700);font-weight:700', text: 'Sobre: ' + productName }) : null,
    ]);
  }

  function emptyStateBlock() {
    const panel = el('div', { class: 'panel reviews-empty', 'data-reveal': 'fade' });
    const icon = document.createElement('span');
    icon.innerHTML = GDM.icons.icon('sparkle');
    panel.appendChild(icon);
    panel.appendChild(el('h3', { text: 'Ainda não temos avaliações públicas' }));
    panel.appendChild(el('p', { text: 'O site acabou de nascer — seja a primeira pessoa a partilhar a sua experiência com o ateliê, aqui em baixo.', style: 'color:var(--ink-500);max-width:48ch' }));
    return panel;
  }

  function summaryBlock(all) {
    const avg = all.length ? all.reduce(function (s, r) { return s + r.rating; }, 0) / all.length : 0;
    const dist = [5, 4, 3, 2, 1].map(function (star) {
      const count = all.filter(function (r) { return r.rating === star; }).length;
      const pct = all.length ? Math.round((count / all.length) * 100) : 0;
      return { star: star, count: count, pct: pct };
    });
    const distRows = el('div', {}, dist.map(function (d) {
      return el('div', { class: 'dist-row' }, [
        el('span', { text: d.star + ' ★' }),
        el('div', { class: 'dist-bar' }, [el('div', { class: 'dist-bar__fill', style: 'width:' + d.pct + '%' })]),
        el('span', { text: String(d.count) }),
      ]);
    }));
    return el('div', { class: 'panel reviews-summary' }, [
      el('div', { class: 'reviews-score stack', style: 'gap:6px;align-items:center' }, [
        el('p', { class: 'reviews-score__num', text: avg.toFixed(1) }),
        GDM.components.starRow(avg),
        el('p', { style: 'color:var(--ink-500);font-size:var(--fs-xs)', text: all.length + ' avaliações' }),
      ]),
      distRows,
    ]);
  }

  function buildForm(defaultProductSlug) {
    let rating = 5;
    const starInput = el('div', { class: 'star-input', role: 'radiogroup', 'aria-label': 'Classificação em estrelas' });
    function drawStars() {
      starInput.innerHTML = '';
      for (let i = 1; i <= 5; i++) {
        const btn = el('button', { type: 'button', 'data-active': String(i <= rating), 'aria-label': i + ' estrela' + (i > 1 ? 's' : ''), 'aria-pressed': String(i === rating) });
        btn.innerHTML = GDM.icons.icon('star');
        btn.addEventListener('click', function () { rating = i; drawStars(); });
        starInput.appendChild(btn);
      }
    }
    drawStars();

    const defaultProduct = defaultProductSlug ? GDM.catalog.getBySlug(defaultProductSlug) : null;
    const defaultCategory = defaultProduct ? defaultProduct.category : '';

    /* Seletor em dois passos: primeiro a categoria (9 opções, rápido de
       percorrer), só depois o produto — já filtrado para essa categoria
       (2-3 opções em vez das ~19 do catálogo inteiro). O campo de produto
       fica desativado com um placeholder explícito até haver categoria
       escolhida. */
    const categoryField = GDM.formHelpers.field({
      id: 'rv-category', label: 'Categoria', as: 'select', required: true,
      options: [{ value: '', label: 'Escolha uma categoria' }].concat(
        GDM.catalog.CATEGORIES.map(function (c) { return { value: c.slug, label: c.label }; })
      ),
    });
    const productField = GDM.formHelpers.field({
      id: 'rv-product', label: 'Produto', as: 'select', required: true,
      options: [{ value: '', label: 'Escolha primeiro uma categoria' }],
    });

    function populateProducts(categorySlug, preselectSlug) {
      const input = productField.__gdmInput;
      input.innerHTML = '';
      if (!categorySlug) {
        input.appendChild(el('option', { value: '', text: 'Escolha primeiro uma categoria' }));
        input.disabled = true;
        return;
      }
      input.appendChild(el('option', { value: '', text: 'Escolha um produto' }));
      GDM.catalog.byCategory(categorySlug).forEach(function (p) {
        input.appendChild(el('option', { value: p.slug, text: p.name }));
      });
      input.disabled = false;
      if (preselectSlug) input.value = preselectSlug;
    }

    categoryField.__gdmInput.addEventListener('change', function () {
      populateProducts(categoryField.__gdmInput.value);
    });

    if (defaultCategory) {
      categoryField.__gdmInput.value = defaultCategory;
      /* Definir .value por código não dispara 'change' nem mutação de
         childList/atributos — o botão personalizado (enhanceSelect) nunca
         soube que o valor mudou e continuava a mostrar o placeholder.
         Dispara o evento manualmente para o sincronizar (mesmo padrão já
         usado mais abaixo depois do form.reset()). */
      categoryField.__gdmInput.dispatchEvent(new Event('change', { bubbles: true }));
      populateProducts(defaultCategory, defaultProductSlug);
    } else {
      populateProducts('');
    }

    const authorField = GDM.formHelpers.field({ id: 'rv-author', label: 'O seu nome', required: true, maxLength: 60 });
    const titleField = GDM.formHelpers.field({ id: 'rv-title', label: 'Título (opcional)', maxLength: 80 });
    const bodyField = GDM.formHelpers.field({ id: 'rv-body', label: 'A sua experiência', as: 'textarea', required: true, maxLength: 600 });
    const fields = [categoryField, productField, authorField, titleField, bodyField];
    const validateAll = GDM.formHelpers.wireForm(fields);

    const submitBtn = el('button', { class: 'btn btn--primary', type: 'submit', text: 'Publicar avaliação' });
    const status = el('p', { class: 'newsletter-status', role: 'status' });

    const form = el('form', { novalidate: true, class: 'stack', style: 'gap:14px' }, [
      el('div', { class: 'field' }, [el('label', { text: 'A sua classificação *' }), starInput]),
      el('div', { class: 'form-row form-row--2' }, [categoryField, productField]),
      authorField, titleField, bodyField, submitBtn, status,
    ]);

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      /* A classificação por estrelas não é um <input required> nativo — a
         validação genérica de wireForm() não a cobre, por isso o campo
         obrigatório é garantido aqui explicitamente antes de tudo o resto. */
      if (!rating) { GDM.components.toast.show('Escolha uma classificação em estrelas.', 'error'); return; }
      if (!validateAll()) { GDM.components.toast.show('Preencha os campos obrigatórios.', 'error'); return; }
      const product = GDM.catalog.getBySlug(productField.__gdmInput.value);
      const review = GDM.reviews.add({
        productId: product ? product.id : '',
        author: GDM.formHelpers.readValue(authorField),
        title: GDM.formHelpers.readValue(titleField),
        body: GDM.formHelpers.readValue(bodyField),
        rating: rating,
      });
      if (!review) { status.textContent = 'Não foi possível publicar — reveja os dados.'; status.className = 'newsletter-status newsletter-status--error'; return; }
      status.textContent = 'Obrigado! A sua avaliação foi publicada.';
      status.className = 'newsletter-status newsletter-status--ok';
      form.reset();
      /* form.reset() não dispara 'change' — força a repintura do select
         personalizado de categoria (e, em cascata, o de produto) para não
         ficar a mostrar a categoria antiga com o <select> real já vazio. */
      categoryField.__gdmInput.dispatchEvent(new Event('change', { bubbles: true }));
      rating = 5; drawStars();
      GDM.components.toast.show('Avaliação publicada. Obrigado pelo seu feedback!', 'success');
      // GDM.reviews.add já emite 'reviews:change', que a página escuta para
      // redesenhar a lista — não é necessário chamar onSaved aqui também.
    });

    return form;
  }

  function render(container, params, query) {
    container.innerHTML = '';
    container.appendChild(GDM.components.pageHero({ eyebrow: 'Prova social', title: 'Avaliações', lede: 'O que quem já comprou tem a dizer sobre as nossas peças.' }));

    const section = el('section', { class: 'section section--tight' });
    const inner = el('div', { class: 'container' });
    section.appendChild(inner);
    container.appendChild(section);

    const productFilter = GDM.security.sanitizeSlug(query.produto || '');

    const listHost = el('div', { class: 'stack', style: 'gap:16px;margin-top:20px' });

    const productSelect = el('select', { id: 'reviews-filter-product', 'aria-label': 'Filtrar por produto' }, [
      el('option', { value: '', text: 'Todos os produtos' }),
    ].concat(GDM.catalog.PRODUCTS.map(function (p) { return el('option', { value: p.slug, text: p.name }); })));
    productSelect.value = productFilter;

    const sortSelect = el('select', { id: 'reviews-filter-sort', 'aria-label': 'Ordenar avaliações' }, [
      el('option', { value: 'recentes', text: 'Mais recentes' }),
      el('option', { value: 'maior', text: 'Maior classificação' }),
      el('option', { value: 'menor', text: 'Menor classificação' }),
    ]);

    function draw() {
      const all = GDM.reviews.all().map(function (r) {
        const product = GDM.catalog.getById(r.productId);
        return Object.assign({}, r, { productSlug: product ? product.slug : '', productName: product ? product.name : '' });
      });
      const summaryHost = inner.querySelector('#reviews-summary-host');
      summaryHost.innerHTML = '';
      summaryHost.appendChild(all.length ? summaryBlock(all) : emptyStateBlock());
      filterRow.style.display = all.length ? '' : 'none';

      let list = all;
      if (productSelect.value) list = list.filter(function (r) { return r.productSlug === productSelect.value; });
      if (sortSelect.value === 'maior') list = list.slice().sort(function (a, b) { return b.rating - a.rating; });
      else if (sortSelect.value === 'menor') list = list.slice().sort(function (a, b) { return a.rating - b.rating; });
      else list = list.slice().sort(function (a, b) { return new Date(b.date) - new Date(a.date); });

      listHost.innerHTML = '';
      if (!list.length && all.length) {
        listHost.appendChild(el('p', { text: 'Sem avaliações para este filtro.', style: 'color:var(--ink-500)' }));
      } else {
        list.forEach(function (r) { listHost.appendChild(reviewCard(r, r.productName)); });
      }
    }

    productSelect.addEventListener('change', draw);
    sortSelect.addEventListener('change', draw);

    const filterRow = el('div', { class: 'cluster', style: 'gap:12px;margin-top:24px' }, [
      el('div', { class: 'field', style: 'min-width:220px' }, [el('label', { for: 'reviews-filter-product-toggle', class: 'sr-only', text: 'Produto' }), GDM.components.enhanceSelect(productSelect)]),
      el('div', { class: 'field', style: 'min-width:200px' }, [el('label', { for: 'reviews-filter-sort-toggle', class: 'sr-only', text: 'Ordenar' }), GDM.components.enhanceSelect(sortSelect)]),
    ]);

    const formHost = el('div', { class: 'panel', style: 'margin-top:32px' }, [
      el('h2', { text: 'Deixe a sua avaliação', style: 'font-size:1.2rem;margin-bottom:16px' }),
      buildForm(productFilter),
    ]);

    inner.appendChild(el('div', { id: 'reviews-summary-host' }));
    inner.appendChild(filterRow);
    inner.appendChild(listHost);
    inner.appendChild(formHost);

    draw();
    const off = GDM.bus.on('reviews:change', draw);
    return off;
  }

  GDM.pages.reviews = { render: render };
})(window.GDM = window.GDM || {});
