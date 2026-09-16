/* ==========================================================================
   Cartão de produto — usado na Loja, Início e "relacionados".
   ========================================================================== */
(function (GDM) {
  'use strict';
  const { el } = GDM.security;
  GDM.components = GDM.components || {};

  function render(product, opts) {
    opts = opts || {};
    const media = el('div', { class: 'product-card__media' });
    media.innerHTML = GDM.categoryArt.productArt(product);

    const favBtn = el('button', {
      class: 'product-card__fav', type: 'button',
      'aria-pressed': String(GDM.favorites.has(product.id)),
      'aria-label': GDM.favorites.has(product.id) ? 'Remover dos favoritos' : 'Adicionar aos favoritos',
    });
    favBtn.innerHTML = GDM.icons.icon('heart');
    favBtn.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      GDM.favorites.toggle(product.id);
      const pressed = GDM.favorites.has(product.id);
      favBtn.setAttribute('aria-pressed', String(pressed));
      favBtn.setAttribute('aria-label', pressed ? 'Remover dos favoritos' : 'Adicionar aos favoritos');
      favBtn.classList.add('is-bumping');
      setTimeout(function () { favBtn.classList.remove('is-bumping'); }, 400);
      GDM.components.toast.show(pressed ? 'Adicionado aos favoritos.' : 'Removido dos favoritos.', 'info');
    });

    const badges = el('div', { class: 'product-card__badges' }, [
      product.featured ? el('span', { class: 'badge badge--gold', text: 'Destaque' }) : null,
      product.oldPrice ? el('span', { class: 'badge badge--sale', text: 'Promoção' }) : null,
    ]);

    const mediaWrap = el('div', { style: 'position:relative' }, [media, favBtn, badges]);

    const titleLink = el('a', { href: '#/produto/' + product.slug, text: product.name });
    const title = el('h3', { class: 'product-card__title' }, [titleLink]);

    const priceRow = el('div', { class: 'product-card__meta' }, [
      el('span', { class: 'product-card__price', text: GDM.format.currency(product.price) }),
      product.oldPrice ? el('span', { class: 'product-card__price--old', text: GDM.format.currency(product.oldPrice) }) : null,
    ]);

    const bodyChildren = [
      el('span', { class: 'product-card__cat', text: product.categoryLabel }),
      title,
      (function () { const s = GDM.reviews.summaryFor(product.id); return GDM.components.ratingBlock(s.avg, s.count); })(),
    ];
    if (opts.hero) {
      bodyChildren.push(el('p', { class: 'product-card__desc', text: product.description }));
    }
    bodyChildren.push(priceRow);

    const body = el('div', { class: 'product-card__body' }, bodyChildren);

    const footer = el('div', { class: 'product-card__footer' }, [
      el('a', { class: 'btn btn--outline btn--sm btn--block', href: '#/produto/' + product.slug, text: 'Ver produto' }),
    ]);

    const card = el('article', { class: 'product-card' + (opts.hero ? ' product-card--hero' : ''), 'data-reveal': opts.reveal || null }, [mediaWrap, body, footer]);
    return card;
  }

  GDM.components.productCard = { render: render };
})(window.GDM = window.GDM || {});
