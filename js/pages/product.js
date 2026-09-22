/* ==========================================================================
   Página: Produto individual
   ========================================================================== */
(function (GDM) {
  'use strict';
  const { el } = GDM.security;
  GDM.pages = GDM.pages || {};

  function gallery(product) {
    const variants = [product, Object.assign({}, product, { slug: product.slug + '-b' }), Object.assign({}, product, { slug: product.slug + '-c' })];
    const main = el('div', { class: 'product-gallery__main' });
    main.innerHTML = GDM.categoryArt.productArt(variants[0]);
    const thumbs = el('div', { class: 'product-gallery__thumbs' });
    variants.forEach(function (v, idx) {
      const btn = el('button', { type: 'button', 'aria-current': String(idx === 0), 'aria-label': 'Ver imagem ' + (idx + 1) + ' de ' + product.name });
      btn.innerHTML = GDM.categoryArt.productArt(v);
      btn.addEventListener('click', function () {
        main.innerHTML = GDM.categoryArt.productArt(v);
        thumbs.querySelectorAll('button').forEach(function (b) { b.setAttribute('aria-current', 'false'); });
        btn.setAttribute('aria-current', 'true');
      });
      thumbs.appendChild(btn);
    });
    return el('div', {}, [main, thumbs]);
  }

  function buildWhatsAppLink(product, qty) {
    const lines = [
      'Olá! Gostaria de encomendar:',
      '• ' + product.name + ' (x' + qty + ') — ' + GDM.format.currency(product.price * qty),
    ];
    return 'https://wa.me/' + GDM.content.BRAND.whatsapp + '?text=' + encodeURIComponent(lines.join('\n'));
  }

  function detailTabs(product) {
    const tabsDef = [
      { id: 'desc', label: 'Descrição', build: function () { return el('p', { text: product.long }); } },
      { id: 'envio', label: 'Envio & Trocas', build: function () {
        return el('div', { class: 'stack', style: 'gap:8px' }, [
          el('p', { text: 'Produção em 3 a 7 dias úteis. Envio pelos CTT, com portes grátis acima de €50.' }),
          el('p', {}, [el('a', { href: '#/envios', 'data-route-link': '', text: 'Ver prazos de envio completos' })]),
          el('p', {}, [el('a', { href: '#/trocas', 'data-route-link': '', text: 'Ver política de trocas e devoluções' })]),
        ]);
      } },
      { id: 'aval', label: 'Avaliações', build: function () { return reviewsSummaryBlock(product); } },
    ];
    const nav = el('div', { class: 'detail-tabs__nav', role: 'tablist' });
    const panelHost = el('div', { class: 'detail-tabs__panel' });
    function select(idx) {
      nav.querySelectorAll('button').forEach(function (b, i) { b.setAttribute('aria-selected', String(i === idx)); });
      panelHost.innerHTML = '';
      panelHost.appendChild(tabsDef[idx].build());
    }
    tabsDef.forEach(function (t, idx) {
      const btn = el('button', { type: 'button', role: 'tab', 'aria-selected': String(idx === 0), text: t.label });
      btn.addEventListener('click', function () { select(idx); });
      nav.appendChild(btn);
    });
    select(0);
    return el('div', { class: 'detail-tabs' }, [nav, panelHost]);
  }

  function reviewsSummaryBlock(product) {
    const list = GDM.reviews.forProduct(product.id);
    const wrap = el('div', { class: 'stack', style: 'gap:14px' });
    const summary = GDM.reviews.summaryFor(product.id);
    const ratingEl = GDM.components.ratingBlock(summary.avg, summary.count);
    if (ratingEl) wrap.appendChild(ratingEl);
    if (!list.length) {
      wrap.appendChild(el('p', { text: 'Ainda sem avaliações escritas para este produto.', style: 'color:var(--ink-500)' }));
    } else {
      list.slice(0, 3).forEach(function (r) { wrap.appendChild(reviewCard(r)); });
    }
    wrap.appendChild(el('a', { class: 'btn btn--outline btn--sm', href: '#/avaliacoes?produto=' + product.slug, text: 'Ver todas as avaliações' }));
    return wrap;
  }

  function reviewCard(r) {
    return el('div', { class: 'review-card' }, [
      el('div', { class: 'review-card__head' }, [
        el('div', { class: 'review-card__author' }, [
          el('strong', { text: r.author }),
          r.verified ? el('span', { class: 'badge badge--gold', text: 'Compra verificada' }) : null,
        ]),
        el('span', { style: 'color:var(--ink-500);font-size:var(--fs-xs)', text: GDM.format.dateLabel(r.date) }),
      ]),
      GDM.components.starRow(r.rating),
      r.title ? el('p', { style: 'font-weight:700', text: r.title }) : null,
      el('p', { style: 'color:var(--ink-700)', text: r.body }),
    ]);
  }

  function relatedProducts(product) {
    const list = GDM.catalog.byCategory(product.category).filter(function (p) { return p.id !== product.id; }).slice(0, 4);
    if (!list.length) return null;
    const grid = el('div', { class: 'grid-auto' });
    list.forEach(function (p) { grid.appendChild(GDM.components.productCard.render(p, { reveal: 'fade' })); });
    return el('section', { class: 'section section--cream' }, [
      el('div', { class: 'container' }, [
        el('p', { class: 'eyebrow', text: 'Também vai gostar' }),
        el('h2', { text: 'Mais em ' + product.categoryLabel, style: 'margin-bottom:24px' }),
        grid,
      ]),
    ]);
  }

  function render(container, params) {
    const product = GDM.catalog.getBySlug(GDM.security.sanitizeSlug(params.slug || ''));
    if (!product) { GDM.pages.notFound.render(container); return; }
    container.innerHTML = '';

    const crumbWrap = el('div', { class: 'container', style: 'padding-top:20px' }, [
      GDM.components.breadcrumb([{ label: 'Início', hash: '/' }, { label: 'Loja', hash: '/loja' }, { label: product.categoryLabel, hash: '/loja?categoria=' + product.category }, { label: product.name }]),
    ]);
    container.appendChild(crumbWrap);

    const stockOk = product.stock > 5;
    const stockLabel = product.stock > 5 ? 'Em stock' : (product.stock > 0 ? 'Últimas unidades (' + product.stock + ')' : 'Esgotado');

    const qtyStepper = el('div', { class: 'qty-stepper' });
    const minus = el('button', { type: 'button', 'aria-label': 'Diminuir quantidade', text: '−' });
    const qtyInput = el('input', { type: 'number', min: '1', max: String(product.stock), value: '1', 'aria-label': 'Quantidade' });
    const plus = el('button', { type: 'button', 'aria-label': 'Aumentar quantidade', text: '+' });
    minus.addEventListener('click', function () { qtyInput.value = String(Math.max(1, parseInt(qtyInput.value, 10) - 1)); });
    plus.addEventListener('click', function () { qtyInput.value = String(Math.min(product.stock, parseInt(qtyInput.value, 10) + 1)); });
    qtyStepper.appendChild(minus); qtyStepper.appendChild(qtyInput); qtyStepper.appendChild(plus);

    const addBtn = el('button', { class: 'btn btn--primary', type: 'button' });
    addBtn.innerHTML = GDM.icons.icon('cart') + '<span>Adicionar ao carrinho</span>';
    const buyBtn = el('a', { class: 'btn btn--whatsapp', href: '#', target: '_blank', rel: 'noopener' });
    buyBtn.innerHTML = GDM.icons.icon('whatsapp') + '<span>Perguntar no WhatsApp</span>';

    addBtn.addEventListener('click', function () {
      if (product.stock <= 0) return;
      const qty = Math.max(1, Math.min(product.stock, parseInt(qtyInput.value, 10) || 1));
      GDM.cart.addItem(product.id, qty);
      addBtn.classList.add('is-bumping');
      setTimeout(function () { addBtn.classList.remove('is-bumping'); }, 400);
      GDM.components.toast.show('Adicionado ao carrinho: ' + product.name, 'success');
      GDM.components.cartDrawer.open(addBtn);
    });

    buyBtn.addEventListener('click', function (e) {
      const qty = Math.max(1, Math.min(product.stock, parseInt(qtyInput.value, 10) || 1));
      buyBtn.href = buildWhatsAppLink(product, qty);
    });

    const favPressed = GDM.favorites.has(product.id);
    const favBtn = el('button', { class: 'btn btn--outline', type: 'button', 'aria-pressed': String(favPressed) });
    favBtn.innerHTML = GDM.icons.icon('heart') + '<span>' + (favPressed ? 'Nos favoritos' : 'Guardar nos favoritos') + '</span>';
    favBtn.addEventListener('click', function () {
      GDM.favorites.toggle(product.id);
      const pressed = GDM.favorites.has(product.id);
      favBtn.setAttribute('aria-pressed', String(pressed));
      favBtn.querySelector('span').textContent = pressed ? 'Nos favoritos' : 'Guardar nos favoritos';
    });

    const info = el('div', { class: 'product-info' }, [
      el('span', { class: 'badge badge--outline', text: product.categoryLabel }),
      el('h1', { class: 'product-info__title', text: product.name }),
      (function () { const s = GDM.reviews.summaryFor(product.id); return GDM.components.ratingBlock(s.avg, s.count); })(),
      el('div', { class: 'product-info__price-row' }, [
        el('span', { class: 'product-info__price', text: GDM.format.currency(product.price) }),
        product.oldPrice ? el('span', { class: 'product-card__price--old', text: GDM.format.currency(product.oldPrice) }) : null,
      ]),
      el('p', { class: 'product-info__stock ' + (stockOk ? 'product-info__stock--ok' : 'product-info__stock--low'), text: stockLabel }),
      el('p', { class: 'product-info__desc', text: product.description }),
      el('div', { class: 'field', style: 'max-width:160px;margin-top:14px' }, [el('label', { text: 'Quantidade' }), qtyStepper]),
      el('div', { class: 'product-info__actions' }, [favBtn, buyBtn, addBtn]),
      el('div', { class: 'trust-row', style: 'margin-top:20px' }, [
        trustMini('shield', 'Pagamento combinado por WhatsApp'),
        trustMini('truck', 'Envio em 3-7 dias úteis'),
        trustMini('handmade', 'Peça feita à mão'),
      ]),
    ]);

    const detail = el('div', { class: 'container product-detail' }, [gallery(product), info]);
    container.appendChild(el('section', { class: 'section section--tight' }, [detail]));
    container.appendChild(el('section', { class: 'section section--tight container' }, [detailTabs(product)]));
    const related = relatedProducts(product);
    if (related) container.appendChild(related);

    GDM.meta.set({
      title: product.name,
      description: product.name + ' — ' + product.categoryLabel + ' a partir de ' + GDM.format.currency(product.price) + '. ' + product.description,
      path: '/produto/' + product.slug,
      type: 'product',
    });

    const ldSummary = GDM.reviews.summaryFor(product.id);
    const productLd = {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: product.name,
      description: product.description,
      image: GDM.meta.absoluteUrl('assets/og-image.png'),
      category: product.categoryLabel,
      offers: {
        '@type': 'Offer',
        priceCurrency: 'EUR',
        price: product.price.toFixed(2),
        availability: product.stock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
        url: GDM.meta.absoluteUrl('#/produto/' + product.slug),
      },
    };
    if (ldSummary.count > 0) {
      productLd.aggregateRating = { '@type': 'AggregateRating', ratingValue: ldSummary.avg.toFixed(1), reviewCount: ldSummary.count };
    }
    GDM.meta.setJsonLd('product', productLd);
    GDM.meta.setJsonLd('breadcrumb', {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Início', item: GDM.meta.absoluteUrl('/') },
        { '@type': 'ListItem', position: 2, name: 'Loja', item: GDM.meta.absoluteUrl('#/loja') },
        { '@type': 'ListItem', position: 3, name: product.categoryLabel, item: GDM.meta.absoluteUrl('#/loja?categoria=' + product.category) },
        { '@type': 'ListItem', position: 4, name: product.name, item: GDM.meta.absoluteUrl('#/produto/' + product.slug) },
      ],
    });
  }

  function trustMini(icon, text) {
    const span = el('span', { class: 'trust-item' });
    span.innerHTML = GDM.icons.icon(icon);
    span.appendChild(el('span', { text: text }));
    return span;
  }

  GDM.pages.product = { render: render };
})(window.GDM = window.GDM || {});
