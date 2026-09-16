/* ==========================================================================
   Páginas legais — Política de Privacidade e Termos e Condições. Exigidas
   por lei (RGPD/UE) por já existir recolha de dados via formulário de
   contacto, checkout e newsletter, mesmo sem checkout de pagamento
   automático. Reutiliza o layout de índice lateral de infoPages.js.
   ========================================================================== */
(function (GDM) {
  'use strict';
  const { el } = GDM.security;
  GDM.pages = GDM.pages || {};

  function legalPage(data, heroOpts) {
    return function render(container) {
      container.innerHTML = '';
      const toc = el('nav', { class: 'content-toc', 'aria-label': 'Índice da página' });
      const panelHost = el('div', { class: 'stack', style: 'gap:40px' });
      data.sections.forEach(function (s, idx) {
        const id = 'sec-' + idx;
        toc.appendChild(el('a', { href: '#' + id, text: s.title }));
        panelHost.appendChild(el('div', { id: id, 'data-reveal': 'fade' }, [
          el('h2', { text: s.title, style: 'margin-bottom:16px' }),
          el('p', { text: s.text, style: 'color:var(--ink-700)' }),
        ]));
      });
      const layout = el('div', { class: 'container content-layout' }, [toc, panelHost]);
      container.appendChild(GDM.components.pageHero(heroOpts));
      container.appendChild(el('section', { class: 'section' }, [
        el('div', { class: 'container', style: 'padding-bottom:0' }, [
          el('p', { style: 'color:var(--ink-500);font-size:var(--fs-sm)', text: 'Última atualização: ' + GDM.format.dateLabel(data.updated) }),
        ]),
        layout,
      ]));
    };
  }

  GDM.pages.privacyPolicy = { render: legalPage(GDM.content.PRIVACY_POLICY, { eyebrow: 'Os seus dados', title: 'Política de Privacidade', lede: 'Como recolhemos, usamos e protegemos os seus dados pessoais.' }) };
  GDM.pages.terms = { render: legalPage(GDM.content.TERMS, { eyebrow: 'Condições de compra', title: 'Termos e Condições', lede: 'As regras claras de como funciona uma encomenda no nosso ateliê.' }) };
})(window.GDM = window.GDM || {});
