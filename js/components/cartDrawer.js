/* ==========================================================================
   Drawer do carrinho — painel lateral acessível (foco preso, Esc fecha).
   ========================================================================== */
(function (GDM) {
  'use strict';
  const { el } = GDM.security;
  GDM.components = GDM.components || {};

  let rootEl, panelEl, itemsEl, footEl, releaseFocus, lastFocused;

  function mount(root) {
    itemsEl = el('div', { class: 'cart-drawer__items' });
    footEl = el('div', { class: 'cart-drawer__foot' });
    const closeBtn = el('button', { class: 'icon-btn', 'aria-label': 'Fechar carrinho', type: 'button' });
    closeBtn.innerHTML = GDM.icons.icon('close');
    closeBtn.addEventListener('click', close);
    const head = el('div', { class: 'cart-drawer__head' }, [
      el('h2', { text: 'O seu carrinho', style: 'font-size:1.25rem' }),
      closeBtn,
    ]);
    panelEl = el('div', { class: 'cart-drawer__panel', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Carrinho de compras' }, [head, itemsEl, footEl]);
    const scrim = el('div', { class: 'cart-drawer__scrim' });
    scrim.addEventListener('click', close);
    rootEl = el('div', { class: 'cart-drawer', 'data-open': 'false' }, [scrim, panelEl]);
    root.appendChild(rootEl);
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && rootEl.getAttribute('data-open') === 'true') close();
    });
    GDM.bus.on('cart:change', renderContents);
    renderContents(GDM.cart.getState());
  }

  function cartLine(item) {
    const media = el('div', { class: 'cart-line__media' });
    media.innerHTML = GDM.categoryArt.productArt(item.product);

    const stepper = el('div', { class: 'qty-stepper', style: 'margin-top:6px' });
    const minus = el('button', { type: 'button', 'aria-label': 'Diminuir quantidade' }, [document.createTextNode('−')]);
    const input = el('input', { type: 'number', min: '1', max: String(item.product.stock), value: String(item.qty), 'aria-label': 'Quantidade' });
    const plus = el('button', { type: 'button', 'aria-label': 'Aumentar quantidade' }, [document.createTextNode('+')]);
    minus.addEventListener('click', function () { GDM.cart.updateQty(item.key, Math.max(1, item.qty - 1)); });
    plus.addEventListener('click', function () { GDM.cart.updateQty(item.key, Math.min(item.product.stock, item.qty + 1)); });
    input.addEventListener('change', function () {
      const val = parseInt(input.value, 10);
      GDM.cart.updateQty(item.key, Number.isFinite(val) ? val : 1);
    });
    stepper.appendChild(minus); stepper.appendChild(input); stepper.appendChild(plus);

    const removeBtn = el('button', { class: 'cart-line__remove', type: 'button', text: 'Remover' });
    removeBtn.addEventListener('click', function () {
      GDM.cart.removeItem(item.key);
      GDM.components.toast.show('Artigo removido do carrinho.', 'info');
    });

    return el('div', { class: 'cart-line' }, [
      media,
      el('div', { class: 'stack', style: 'gap:4px' }, [
        el('p', { class: 'cart-line__title', text: item.product.name }),
        stepper,
      ]),
      el('div', { style: 'text-align:right' }, [
        el('p', { class: 'cart-line__price', text: GDM.format.currency(item.lineTotal) }),
        removeBtn,
      ]),
    ]);
  }

  function renderContents(state) {
    state = state || GDM.cart.getState();
    itemsEl.innerHTML = '';
    footEl.innerHTML = '';
    if (!state.items.length) {
      const empty = el('div', { class: 'empty-state' });
      empty.innerHTML = GDM.icons.icon('cart');
      empty.appendChild(el('p', { text: 'O seu carrinho está vazio.' }));
      empty.appendChild(el('a', { class: 'btn btn--dark', href: '#/loja', text: 'Ver a loja' }));
      itemsEl.appendChild(empty);
      return;
    }
    state.items.forEach(function (item) { itemsEl.appendChild(cartLine(item)); });
    footEl.appendChild(el('div', { class: 'order-summary__row order-summary__row--total' }, [
      el('span', { text: 'Subtotal' }),
      el('span', { text: GDM.format.currency(state.subtotal) }),
    ]));
    footEl.appendChild(el('p', { class: 'field__hint', text: 'Portes calculados no checkout.' }));
    footEl.appendChild(el('a', { class: 'btn btn--primary btn--block', href: '#/checkout', text: 'Finalizar encomenda', onclick: close }));
    footEl.appendChild(el('a', { class: 'btn btn--ghost btn--block', href: '#/carrinho', text: 'Ver carrinho completo', onclick: close }));
  }

  function open(trigger) {
    lastFocused = trigger || document.activeElement;

    /* Fechar estados interactivos da página por baixo do drawer. */
    document.querySelectorAll('.shop-sort-dropdown[data-open=\"true\"]').forEach(function (node) {
      node.setAttribute('data-open', 'false');
      const toggle = node.querySelector('.shop-sort-toggle');
      if (toggle) toggle.setAttribute('aria-expanded', 'false');
    });
    const active = document.activeElement;
    if (active && active !== document.body && typeof active.blur === 'function') active.blur();

    rootEl.setAttribute('data-open', 'true');
    document.body.classList.add('cart-open');
    document.body.style.overflow = 'hidden';
    releaseFocus = GDM.components.trapFocus(panelEl);
    const closeBtn = panelEl.querySelector('.icon-btn');
    if (closeBtn) requestAnimationFrame(function () { closeBtn.focus(); });
  }

  function close() {
    if (!rootEl || rootEl.getAttribute('data-open') !== 'true') return;
    rootEl.setAttribute('data-open', 'false');
    document.body.classList.remove('cart-open');
    document.body.style.overflow = '';
    if (releaseFocus) releaseFocus();
    if (lastFocused && lastFocused.focus) lastFocused.focus();
  }

  GDM.components.cartDrawer = { mount: mount, open: open, close: close };
})(window.GDM = window.GDM || {});
