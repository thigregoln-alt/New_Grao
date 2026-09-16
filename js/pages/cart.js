/* ==========================================================================
   Página: Carrinho completo
   ========================================================================== */
(function (GDM) {
  'use strict';
  const { el } = GDM.security;
  GDM.pages = GDM.pages || {};

  function line(item) {
    const media = el('div', { class: 'cart-line__media', style: 'width:96px;height:96px' });
    media.innerHTML = GDM.categoryArt.productArt(item.product);

    const stepper = el('div', { class: 'qty-stepper', style: 'margin-top:8px' });
    const minus = el('button', { type: 'button', 'aria-label': 'Diminuir quantidade', text: '−' });
    const input = el('input', { type: 'number', min: '1', max: String(item.product.stock), value: String(item.qty), 'aria-label': 'Quantidade' });
    const plus = el('button', { type: 'button', 'aria-label': 'Aumentar quantidade', text: '+' });
    minus.addEventListener('click', function () { GDM.cart.updateQty(item.key, Math.max(1, item.qty - 1)); });
    plus.addEventListener('click', function () { GDM.cart.updateQty(item.key, Math.min(item.product.stock, item.qty + 1)); });
    input.addEventListener('change', function () {
      const val = parseInt(input.value, 10);
      GDM.cart.updateQty(item.key, Number.isFinite(val) ? val : 1);
    });
    stepper.appendChild(minus); stepper.appendChild(input); stepper.appendChild(plus);

    const removeBtn = el('button', { class: 'cart-line__remove', type: 'button', text: 'Remover' });
    removeBtn.addEventListener('click', function () { GDM.cart.removeItem(item.key); });

    return el('div', { class: 'panel', style: 'display:grid;grid-template-columns:96px 1fr auto;gap:16px;align-items:center' }, [
      media,
      el('div', { class: 'stack', style: 'gap:4px' }, [
        el('a', { href: '#/produto/' + item.product.slug, style: 'font-weight:700', text: item.product.name }),
        stepper,
      ]),
      el('div', { class: 'stack', style: 'text-align:right;gap:2px' }, [
        el('p', { style: 'font-weight:700;font-size:var(--fs-md)', text: GDM.format.currency(item.lineTotal) }),
        el('p', { style: 'color:var(--ink-500);font-size:var(--fs-xs)', text: GDM.format.currency(item.product.price) + ' / un.' }),
        removeBtn,
      ]),
    ]);
  }

  function render(container) {
    container.innerHTML = '';
    container.appendChild(GDM.components.pageHero({ eyebrow: 'O seu pedido', title: 'Carrinho', lede: 'Reveja os artigos antes de avançar para o checkout.' }));

    const section = el('section', { class: 'section section--tight' });
    const inner = el('div', { class: 'container' });

    function draw() {
      inner.innerHTML = '';
      const state = GDM.cart.getState();
      if (!state.items.length) {
        const empty = el('div', { class: 'empty-state' });
        empty.innerHTML = GDM.icons.icon('cart');
        empty.appendChild(el('h3', { text: 'O seu carrinho está vazio' }));
        empty.appendChild(el('p', { text: 'Adicione produtos da loja para começar a sua encomenda.' }));
        empty.appendChild(el('a', { class: 'btn btn--primary', href: '#/loja', text: 'Ver a loja' }));
        inner.appendChild(empty);
        return;
      }
      const grid = el('div', { class: 'cart-page-grid' });
      const list = el('div', { class: 'stack', style: 'gap:16px' });
      state.items.forEach(function (item) { list.appendChild(line(item)); });

      const summary = el('div', { class: 'panel order-summary' }, [
        el('h2', { text: 'Resumo', style: 'font-size:1.2rem' }),
        el('div', { class: 'order-summary__row' }, [el('span', { text: 'Subtotal (' + state.count + ' artigos)' }), el('span', { text: GDM.format.currency(state.subtotal) })]),
        el('div', { class: 'order-summary__row' }, [el('span', { text: 'Portes de envio' }), el('span', { text: 'Calculado no checkout' })]),
        el('div', { class: 'order-summary__row order-summary__row--total' }, [el('span', { text: 'Total estimado' }), el('span', { text: GDM.format.currency(state.subtotal) })]),
        el('div', { class: 'manual-pay-note' }, [
          (function () { const s = document.createElement('span'); s.innerHTML = GDM.icons.icon('shield'); return s; })(),
          el('p', { text: 'O pagamento não é feito no site — combinamos consigo diretamente pelo WhatsApp depois de recebermos a encomenda.' }),
        ]),
        el('a', { class: 'btn btn--primary btn--block', href: '#/checkout', text: 'Finalizar encomenda' }),
        el('a', { class: 'btn btn--ghost btn--block', href: '#/loja', text: 'Continuar a comprar' }),
      ]);

      grid.appendChild(list);
      grid.appendChild(summary);
      inner.appendChild(grid);
    }

    draw();
    const off = GDM.bus.on('cart:change', draw);
    section.appendChild(inner);
    container.appendChild(section);
    return off;
  }

  GDM.pages.cart = { render: render };
})(window.GDM = window.GDM || {});
