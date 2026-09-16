/* ==========================================================================
   Rodapé — newsletter, colunas de navegação, contactos, redes sociais.
   ========================================================================== */
(function (GDM) {
  'use strict';
  const { el } = GDM.security;
  const B = GDM.content.BRAND;
  GDM.components = GDM.components || {};

  const NEWSLETTER_COPY = 'Novos produtos, histórias do ateliê e promoções ocasionais — sem spam.';

  /** variant 'band' = formulário largo (secção de topo), 'pill' = campo compacto
   *  embutido na coluna "Fica a Par". Ambas as instâncias partilham o mesmo
   *  estado (GDM.newsletter) e sincronizam-se uma à outra via GDM.bus. */
  function newsletterForm(idPrefix, variant) {
    variant = variant === 'pill' ? 'pill' : 'band';
    const input = el('input', { type: 'email', name: 'email', id: idPrefix + '-email', placeholder: 'o.seu@email.com', 'aria-label': 'O seu e-mail', required: true, autocomplete: 'email' });
    const status = el('p', { class: 'newsletter-status', role: 'status' });
    const btn = variant === 'pill'
      ? (function () { const b = el('button', { class: 'btn-pill-submit', type: 'submit', 'aria-label': 'Subscrever' }); b.innerHTML = GDM.icons.icon('chevronRight'); return b; })()
      : el('button', { class: 'btn btn--primary', type: 'submit', text: 'Subscrever' });
    const form = el('form', { class: variant === 'pill' ? 'newsletter-form newsletter-form--pill' : 'newsletter-form', novalidate: true }, [
      el('div', { class: 'field' }, [
        el('label', { for: idPrefix + '-email', class: 'sr-only', text: 'E-mail' }),
        input,
      ]),
      btn,
    ]);

    function showSubscribed(record) {
      input.value = record.email;
      input.disabled = true;
      btn.disabled = true;
      if (variant !== 'pill') btn.textContent = 'Subscrito';
      status.textContent = 'Já está inscrito com este e-mail neste dispositivo.';
      status.className = 'newsletter-status newsletter-status--ok';
    }

    function showUnsubscribed() {
      input.value = '';
      input.disabled = false;
      btn.disabled = false;
      if (variant !== 'pill') btn.textContent = 'Subscrever';
      status.textContent = '';
      status.className = 'newsletter-status';
    }

    const existing = GDM.newsletter.status();
    if (existing) showSubscribed(existing);

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      const result = GDM.newsletter.subscribe(input.value);
      if (result.ok) {
        showSubscribed(result.record);
        GDM.components.toast.show('Inscrição na newsletter confirmada.', 'success');
      } else {
        status.className = 'newsletter-status newsletter-status--error';
        status.textContent = result.error;
        input.setAttribute('aria-invalid', 'true');
      }
    });

    GDM.bus.on('newsletter:change', function (record) {
      if (record) showSubscribed(record); else showUnsubscribed();
    });

    return el('div', { class: variant === 'pill' ? 'newsletter-pill-wrap' : '' }, [form, status]);
  }

  function col(title, links) {
    const ul = el('ul');
    links.forEach(function (l) {
      const a = l.hash ? el('a', { href: '#' + l.hash, 'data-route-link': '', text: l.label }) : el('a', { href: l.href, target: '_blank', rel: 'noopener', text: l.label });
      ul.appendChild(el('li', {}, [a]));
    });
    return el('div', { class: 'footer-col' }, [el('h4', { text: title }), ul]);
  }

  function contactCol() {
    const newsletterTitle = el('h4', { class: 'footer-newsletter__title', text: 'Fica a par' });
    const newsletterCopy = el('p', { class: 'footer-newsletter__copy', text: 'Novos produtos, histórias do ateliê e promoções ocasionais — sem spam.' });
    return el('div', { class: 'footer-col footer-col--contact footer-col--newsletter-bottom' }, [
      el('h4', { text: 'Contacto' }),
      el('ul', {}, [
        el('li', {}, [el('a', { href: 'mailto:' + B.email, text: B.email })]),
        el('li', {}, [el('a', { href: 'https://wa.me/' + B.whatsapp, target: '_blank', rel: 'noopener', text: 'WhatsApp' })]),
        el('li', {}, [el('a', { href: B.instagramUrl, target: '_blank', rel: 'noopener', text: 'Instagram' })]),
      ]),
      el('p', { class: 'footer-contact-note', text: 'Respondemos normalmente em menos de 24 horas úteis.' }),
      el('div', { class: 'footer-newsletter-mini' }, [
        newsletterTitle,
        newsletterCopy,
        newsletterForm('footer', 'pill'),
      ]),
    ]);
  }

  function mount(root) {
    const footerVisual = el('div', { class: 'footer-visual' }, [
      el('div', { class: 'container footer-visual__inner' }, [
        el('p', { class: 'footer-visual__kicker', text: 'GRÃO DE MOSTARDA  /  PORTUGAL  /  2026' }),
        el('button', { class: 'footer-visual__top', type: 'button', 'aria-label': 'Voltar ao topo', text: '↑' }),
      ]),
    ]);
    footerVisual.querySelector('.footer-visual__top').addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    const social = el('div', { class: 'social-row' }, [
      (function () { const a = el('a', { class: 'social-row__link social-row__link--whatsapp', href: 'https://wa.me/' + B.whatsapp, target: '_blank', rel: 'noopener', 'aria-label': 'WhatsApp' }); a.innerHTML = GDM.icons.icon('whatsapp'); return a; })(),
      (function () { const a = el('a', { class: 'social-row__link social-row__link--instagram', href: B.instagramUrl, target: '_blank', rel: 'noopener', 'aria-label': 'Instagram' }); a.innerHTML = GDM.icons.icon('instagram'); return a; })(),
      (function () { const a = el('a', { class: 'social-row__link social-row__link--mail', href: 'mailto:' + B.email, 'aria-label': 'E-mail' }); a.innerHTML = GDM.icons.icon('mail'); return a; })(),
    ]);

    const brandBlock = el('div', { class: 'footer-brand' }, [
      (function () {
        const d = el('div', { class: 'footer-logo-card' });
        d.appendChild(el('img', {
          src: 'assets/logo-grao-de-mostarda.png',
          alt: 'Grão de Mostarda — Editora Gráfica Cristã',
          width: '220',
          height: '124',
          loading: 'lazy',
        }));
        return d;
      })(),
      el('p', { class: 'footer-brand__tagline', text: 'Fé · Amor · Propósito' }),
      el('p', { class: 'footer-brand__desc', text: 'Ateliê de produtos personalizados com propósito — bíblias, canecas, cadernos e decoração cristã, feitos à mão, um de cada vez.' }),
      social,
    ]);

    const footerCols = el('div', { class: 'footer-cols' }, [
      brandBlock,
      col('Navegação', [
        { label: 'Loja', hash: '/loja' },
        { label: 'Inspiração', hash: '/inspiracao' },
        { label: 'Projetos', hash: '/projetos' },
        { label: 'Sobre Nós', hash: '/sobre' },
        { label: 'Contacto', hash: '/contacto' },
      ]),
      col('Ajuda', [
        { label: 'Envios & Prazos', hash: '/envios' },
        { label: 'Trocas & Devoluções', hash: '/trocas' },
        { label: 'Perguntas Frequentes', hash: '/faq' },
      ]),
      contactCol(),
    ]);

    const mainWrap = el('div', { class: 'container footer-main' }, [footerCols]);

    const unsubscribeBtn = el('button', { class: 'footer-unsub-btn', type: 'button', text: 'Cancelar subscrição da newsletter' });
    unsubscribeBtn.addEventListener('click', function () {
      if (GDM.newsletter.status()) {
        GDM.newsletter.unsubscribe();
        GDM.components.toast.show('Subscrição da newsletter cancelada.', 'info');
      } else {
        GDM.components.toast.show('Não tinha nenhuma subscrição ativa neste dispositivo.', 'info');
      }
    });

    const bottom = el('div', { class: 'container footer-bottom' }, [
      el('div', { class: 'footer-bottom__left' }, [
        el('p', { text: '© ' + new Date().getFullYear() + ' Grão de Mostarda Personalizados. Feito à mão em Portugal.' }),
        el('p', { text: 'Pagamento combinado diretamente por WhatsApp, depois da encomenda.' }),
      ]),
      el('div', { class: 'footer-bottom__right' }, [
        el('p', { class: 'footer-legal-links' }, [
          el('a', { href: '#/privacidade', 'data-route-link': '', text: 'Política de Privacidade' }),
          ' · ',
          el('a', { href: '#/termos', 'data-route-link': '', text: 'Termos e Condições' }),
        ]),
        unsubscribeBtn,
      ]),
    ]);

    const footerEl = el('footer', { class: 'site-footer' }, [footerVisual, mainWrap, bottom]);
    root.appendChild(footerEl);
  }

  GDM.components.footer = { mount: mount, newsletterForm: newsletterForm };
})(window.GDM = window.GDM || {});
