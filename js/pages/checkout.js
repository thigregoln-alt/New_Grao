/* ==========================================================================
   Página: Checkout — formulário validado, resumo de encomenda, envio do
   pedido por e-mail/WhatsApp. Pagamento é sempre confirmado manualmente
   pelo ateliê — nunca há cobrança automática neste site (ver ARCHITECTURE.md).
   ========================================================================== */
(function (GDM) {
  'use strict';
  const { el } = GDM.security;
  const B = GDM.content.BRAND;
  GDM.pages = GDM.pages || {};

  function buildOrderId() {
    return 'GM-' + Date.now().toString(36).toUpperCase().slice(-6);
  }

  function buildMessage(orderId, customer, state) {
    const cleanPhone = GDM.format.digitsOnly(customer.phone);
    const phoneLine = 'Telefone: ' + customer.phone + (cleanPhone && cleanPhone !== customer.phone ? ' (WhatsApp: ' + cleanPhone + ')' : '');
    const lines = [
      'Nova encomenda ' + orderId + ' — Grão de Mostarda Personalizados',
      '',
      'Cliente: ' + customer.name,
      phoneLine,
      'E-mail: ' + customer.email,
      'Morada: ' + customer.address + ', ' + customer.postal + ' ' + customer.city,
      customer.notes ? 'Notas: ' + customer.notes : null,
      '',
      'Artigos:',
    ].filter(Boolean);
    state.items.forEach(function (item) {
      lines.push('• ' + item.product.name + ' (x' + item.qty + ') — ' + GDM.format.currency(item.lineTotal));
    });
    lines.push('', 'Subtotal: ' + GDM.format.currency(state.subtotal));
    lines.push('', 'Aguardo o vosso contacto para combinar o pagamento. Obrigado!');
    return lines.join('\n');
  }

  function confirmationView(orderId) {
    const wrap = el('div', { class: 'order-confirm', 'data-reveal': 'scale' });
    const svg = document.createElement('div');
    svg.innerHTML = '<svg class="success-check" width="72" height="72" viewBox="0 0 72 72" fill="none"><circle cx="36" cy="36" r="32" stroke="#4c7a4f" stroke-width="4"/><path d="M22 37l10 10 18-20" stroke="#4c7a4f" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    wrap.appendChild(svg);
    wrap.appendChild(el('h2', { text: 'Pedido preparado!' }));
    wrap.appendChild(el('p', { text: 'A sua encomenda ' + orderId + ' está pronta a enviar para o ateliê. Assim que recebermos a mensagem, confirmamos consigo o pagamento.', style: 'max-width:52ch' }));
    wrap.appendChild(el('a', { class: 'btn btn--dark', href: '#/loja', text: 'Continuar a comprar' }));
    return wrap;
  }

  function render(container) {
    container.innerHTML = '';
    container.appendChild(GDM.components.pageHero({ eyebrow: 'Último passo', title: 'Checkout', lede: 'Confirme os seus dados de entrega — o pagamento é combinado diretamente connosco.' }));

    const section = el('section', { class: 'section section--tight' });
    const inner = el('div', { class: 'container' });
    section.appendChild(inner);
    container.appendChild(section);

    const state = GDM.cart.getState();
    if (!state.items.length) {
      const empty = el('div', { class: 'empty-state' });
      empty.innerHTML = GDM.icons.icon('cart');
      empty.appendChild(el('h3', { text: 'O seu carrinho está vazio' }));
      empty.appendChild(el('p', { text: 'Adicione produtos antes de finalizar uma encomenda.' }));
      empty.appendChild(el('a', { class: 'btn btn--primary', href: '#/loja', text: 'Ver a loja' }));
      inner.appendChild(empty);
      return;
    }

    const nameField = GDM.formHelpers.field({ id: 'co-name', label: 'Nome completo', required: true, autocomplete: 'name' });
    const emailField = GDM.formHelpers.field({ id: 'co-email', label: 'E-mail', type: 'email', required: true, autocomplete: 'email', validate: function (v) { return GDM.format.isValidEmail(v) ? '' : 'Introduza um e-mail válido.'; } });
    const phoneField = GDM.formHelpers.field({ id: 'co-phone', label: 'Telemóvel', type: 'tel', required: true, autocomplete: 'tel', hint: 'Se estiver fora de Portugal, inclua o indicativo do país.' });
    const addressField = GDM.formHelpers.field({ id: 'co-address', label: 'Morada', required: true, autocomplete: 'street-address' });
    const postalField = GDM.formHelpers.field({ id: 'co-postal', label: 'Código postal', required: true, autocomplete: 'postal-code' });
    const cityField = GDM.formHelpers.field({ id: 'co-city', label: 'Localidade', required: true, autocomplete: 'address-level2' });
    const notesField = GDM.formHelpers.field({ id: 'co-notes', label: 'Notas para o ateliê (opcional)', as: 'textarea', maxLength: 400, placeholder: 'Alguma indicação especial para a sua encomenda?' });

    const fields = [nameField, emailField, phoneField, addressField, postalField, cityField];
    const validateAll = GDM.formHelpers.wireForm(fields);

    const consent = el('div', { class: 'checkbox-row' }, [
      el('input', { type: 'checkbox', id: 'co-consent', required: true }),
      el('label', { for: 'co-consent', text: 'Compreendo que o pagamento é combinado diretamente comigo pelo ateliê depois de enviar o pedido, e não é cobrado automaticamente neste site.' }),
    ]);
    const consentError = el('p', { class: 'field__error' });

    const form = el('form', { class: 'stack', novalidate: true }, [
      el('h2', { text: 'Dados de entrega', style: 'font-size:1.2rem;margin-bottom:14px' }),
      el('div', { class: 'form-row form-row--2' }, [nameField, emailField]),
      el('div', { class: 'form-row form-row--2' }, [phoneField, addressField]),
      el('div', { class: 'form-row form-row--2' }, [postalField, cityField]),
      notesField,
      el('h2', { text: 'Pagamento', style: 'font-size:1.2rem;margin-block:20px 14px' }),
      el('div', { class: 'manual-pay-note' }, [
        (function () { const s = document.createElement('span'); s.innerHTML = GDM.icons.icon('shield'); return s; })(),
        el('p', { text: 'O pagamento não é feito neste site. Depois de enviar o pedido, entramos em contacto diretamente consigo pelo WhatsApp para combinar o valor final e o pagamento.' }),
      ]),
      el('div', { style: 'margin-top:16px' }, [consent, consentError]),
      el('div', { class: 'cluster', style: 'gap:12px;margin-top:20px' }, [
        (function () { const b = el('button', { class: 'btn btn--whatsapp', type: 'submit', 'data-mode': 'whatsapp' }); b.innerHTML = GDM.icons.icon('whatsapp') + '<span>Enviar pedido por WhatsApp</span>'; return b; })(),
        (function () { const b = el('button', { class: 'btn btn--dark', type: 'submit', 'data-mode': 'email' }); b.innerHTML = GDM.icons.icon('mail') + '<span>Enviar pedido por e-mail</span>'; return b; })(),
      ]),
    ]);

    let submitMode = 'whatsapp';
    form.querySelectorAll('button[type="submit"]').forEach(function (btn) {
      btn.addEventListener('click', function () { submitMode = btn.getAttribute('data-mode'); });
    });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      const formOk = validateAll();
      const consentOk = form.querySelector('#co-consent').checked;
      consentError.textContent = consentOk ? '' : 'É necessário confirmar que entendeu o processo de pagamento.';
      if (!formOk || !consentOk) {
        GDM.components.toast.show('Reveja os campos assinalados.', 'error');
        return;
      }
      const customer = {
        name: GDM.formHelpers.readValue(nameField),
        email: GDM.formHelpers.readValue(emailField),
        phone: GDM.formHelpers.readValue(phoneField),
        address: GDM.formHelpers.readValue(addressField),
        postal: GDM.formHelpers.readValue(postalField),
        city: GDM.formHelpers.readValue(cityField),
        notes: GDM.formHelpers.readValue(notesField),
      };
      const freshState = GDM.cart.getState();
      const orderId = buildOrderId();
      const message = buildMessage(orderId, customer, freshState);

      if (submitMode === 'whatsapp') {
        window.open('https://wa.me/' + B.whatsapp + '?text=' + encodeURIComponent(message), '_blank', 'noopener');
      } else {
        const subject = 'Nova encomenda ' + orderId + ' — Grão de Mostarda';
        window.location.href = 'mailto:' + B.email + '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(message);
      }
      GDM.cart.clear();
      inner.innerHTML = '';
      inner.appendChild(confirmationView(orderId));
      GDM.components.initScrollReveal();
    });

    const summary = el('div', { class: 'panel order-summary' }, [
      el('h2', { text: 'Resumo da encomenda', style: 'font-size:1.2rem' }),
      el('div', { class: 'stack', style: 'gap:8px' }, state.items.map(function (item) {
        return el('div', { class: 'order-summary__row' }, [el('span', { text: item.qty + '× ' + item.product.name }), el('span', { text: GDM.format.currency(item.lineTotal) })]);
      })),
      el('div', { class: 'order-summary__row order-summary__row--total' }, [el('span', { text: 'Total' }), el('span', { text: GDM.format.currency(state.subtotal) })]),
    ]);

    const grid = el('div', { class: 'cart-page-grid' }, [form, summary]);
    inner.appendChild(grid);
  }

  GDM.pages.checkout = { render: render };
})(window.GDM = window.GDM || {});
