/* ==========================================================================
   Páginas institucionais: FAQ, Envios & Prazos, Trocas & Devoluções.
   Partilham o layout de conteúdo com índice lateral.
   ========================================================================== */
(function (GDM) {
  'use strict';
  const { el } = GDM.security;
  GDM.pages = GDM.pages || {};
  const C = GDM.content;

  function contentLayout(sections, heroOpts) {
    const toc = el('nav', { class: 'content-toc', 'aria-label': 'Índice da página' });
    const panelHost = el('div', { class: 'stack', style: 'gap:40px' });
    sections.forEach(function (s, idx) {
      const id = 'sec-' + idx;
      const link = el('a', { href: '#' + id, text: s.title });
      link.addEventListener('click', function () {
        toc.querySelectorAll('a').forEach(function (a) { a.classList.remove('is-active'); });
        link.classList.add('is-active');
      });
      toc.appendChild(link);
      const block = el('div', { id: id, 'data-reveal': 'fade' }, [el('h2', { text: s.title, style: 'margin-bottom:16px' }), s.body]);
      panelHost.appendChild(block);
    });
    const layout = el('div', { class: 'container content-layout' }, [toc, panelHost]);
    const wrap = el('div');
    wrap.appendChild(GDM.components.pageHero(heroOpts));
    wrap.appendChild(el('section', { class: 'section' }, [layout]));
    return wrap;
  }

  /* ---------------- FAQ ---------------- */
  function renderFaq(container) {
    container.innerHTML = '';
    const sections = C.FAQ_GROUPS.map(function (group) {
      const accItems = group.items.map(function (item) { return { title: item.q, bodyText: item.a }; });
      return { title: group.title, body: GDM.components.buildAccordion(accItems, { idPrefix: group.title }) };
    });
    container.appendChild(contentLayout(sections, { eyebrow: 'Apoio ao cliente', title: 'Perguntas Frequentes', lede: 'Tudo o que precisa de saber sobre encomendas, produção e pagamento.' }));
  }

  /* ---------------- Envios ---------------- */
  function renderShipping(container) {
    container.innerHTML = '';
    const info = C.SHIPPING_INFO;
    const methodsBody = el('div', { class: 'stack', style: 'gap:14px' });
    methodsBody.appendChild(el('p', { text: info.intro, style: 'color:var(--ink-700)' }));
    info.methods.forEach(function (m) {
      methodsBody.appendChild(el('div', { class: 'info-card' }, [
        (function () { const s = document.createElement('span'); s.innerHTML = GDM.icons.icon('truck'); return s; })(),
        el('div', { class: 'stack', style: 'gap:4px' }, [el('strong', { text: m.title }), el('p', { text: m.time, style: 'color:var(--ink-500)' }), el('p', { text: m.price, style: 'font-weight:700;color:var(--gold-700)' })]),
      ]));
    });
    const notesBody = el('ul', { class: 'stack', style: 'gap:8px' });
    info.notes.forEach(function (n) { notesBody.appendChild(el('li', { text: '• ' + n, style: 'color:var(--ink-700)' })); });

    const sections = [
      { title: 'Métodos e prazos de envio', body: methodsBody },
      { title: 'Notas importantes', body: notesBody },
    ];
    container.appendChild(contentLayout(sections, { eyebrow: 'Apoio ao cliente', title: 'Envios & Prazos', lede: 'Como e quando a sua encomenda chega até si.' }));
  }

  /* ---------------- Trocas ---------------- */
  function renderReturns(container) {
    container.innerHTML = '';
    const info = C.RETURNS_INFO;
    const introBody = el('p', { text: info.intro, style: 'color:var(--ink-700)' });
    const sections = [{ title: 'Como funcionam as trocas e devoluções', body: introBody }];
    info.points.forEach(function (p) {
      sections.push({ title: p.title, body: el('p', { text: p.text, style: 'color:var(--ink-700)' }) });
    });
    container.appendChild(contentLayout(sections, { eyebrow: 'Apoio ao cliente', title: 'Trocas & Devoluções', lede: 'Transparência total sobre como tratamos peças feitas por encomenda.' }));
  }

  GDM.pages.faq = { render: renderFaq };
  GDM.pages.shipping = { render: renderShipping };
  GDM.pages.returns = { render: renderReturns };
})(window.GDM = window.GDM || {});
