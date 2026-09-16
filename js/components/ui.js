/* ==========================================================================
   Componentes de UI partilhados — estrelas, acordeão, separadores, foco.
   ========================================================================== */
(function (GDM) {
  'use strict';
  const { el, escapeHTML } = GDM.security;
  GDM.components = GDM.components || {};

  function starRow(rating, size) {
    const wrap = el('span', { class: 'rating__stars' });
    for (let i = 1; i <= 5; i++) {
      const filled = rating >= i - 0.25;
      const span = document.createElement('span');
      span.innerHTML = GDM.icons.icon('star');
      const svg = span.firstElementChild;
      svg.setAttribute('aria-hidden', 'true');
      svg.classList.add(filled ? 'is-filled' : 'is-empty');
      if (size) { svg.style.width = size; svg.style.height = size; }
      wrap.appendChild(svg);
    }
    return wrap;
  }

  function ratingBlock(rating, count) {
    if (!count) return null;
    const wrap = el('div', { class: 'rating' }, [
      starRow(rating),
      el('span', { text: rating.toFixed(1) + ' (' + count + ')' }),
    ]);
    return wrap;
  }

  /** Constrói um acordeão acessível a partir de [{title, bodyNode|bodyText}]. */
  function buildAccordion(items, opts) {
    opts = opts || {};
    const root = el('div', { class: 'accordion' });
    items.forEach(function (item, idx) {
      const panelId = 'acc-panel-' + (opts.idPrefix || 'x') + '-' + idx;
      const btnId = 'acc-trigger-' + (opts.idPrefix || 'x') + '-' + idx;
      const trigger = el('button', {
        class: 'accordion-item__trigger', id: btnId, 'aria-expanded': 'false', 'aria-controls': panelId, type: 'button',
      }, [
        el('span', { text: item.title }),
        (function () { const s = document.createElement('span'); s.className = 'accordion-item__icon'; s.innerHTML = GDM.icons.icon('plus'); s.setAttribute('aria-hidden', 'true'); return s; })(),
      ]);
      const inner = el('div', { class: 'accordion-item__panel-inner' }, [
        item.bodyNode || el('p', { text: item.bodyText || '' }),
      ]);
      const panel = el('div', { class: 'accordion-item__panel', id: panelId, role: 'region', 'aria-labelledby': btnId, 'data-open': 'false' }, [inner]);
      trigger.addEventListener('click', function () {
        const open = trigger.getAttribute('aria-expanded') === 'true';
        trigger.setAttribute('aria-expanded', String(!open));
        panel.setAttribute('data-open', String(!open));
      });
      const item_ = el('div', { class: 'accordion-item' }, [trigger, panel]);
      root.appendChild(item_);
    });
    return root;
  }

  /** Foco preso dentro de um elemento (drawers/modais). Devolve função de limpeza. */
  function trapFocus(container) {
    function handler(e) {
      if (e.key !== 'Tab') return;
      const focusable = container.querySelectorAll('a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])');
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
    container.addEventListener('keydown', handler);
    return function () { container.removeEventListener('keydown', handler); };
  }

  function updateActiveNav(path) {
    document.querySelectorAll('[data-route-link]').forEach(function (link) {
      const target = link.getAttribute('href').replace(/^#/, '');
      const isActive = target === path || (target !== '/' && path.indexOf(target) === 0);
      if (isActive) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    });
  }

  function closeAllOverlays() {
    if (GDM.components.cartDrawer) GDM.components.cartDrawer.close();
    if (GDM.components.header) { GDM.components.header.closeMobileNav(); GDM.components.header.closeSearch(); }
  }

  function initScrollReveal() {
    const els = document.querySelectorAll('[data-reveal]:not(.is-observed)');
    if (!('IntersectionObserver' in window)) {
      els.forEach(function (node) { node.classList.add('is-visible', 'is-observed'); });
      return;
    }
    const observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    els.forEach(function (node, idx) {
      node.classList.add('is-observed');
      node.style.setProperty('--reveal-index', idx % 6);
      observer.observe(node);
    });
  }

  function pageHero(opts) {
    const children = [];
    if (opts.eyebrow) children.push(el('p', { class: 'eyebrow', text: opts.eyebrow }));
    children.push(el('h1', { text: opts.title }));
    if (opts.lede) children.push(el('p', { text: opts.lede, style: 'max-width:60ch;margin-inline:auto;color:var(--ink-700)' }));
    return el('div', { class: 'page-hero' }, [el('div', { class: 'container stack', style: 'gap:10px;align-items:center' }, children)]);
  }

  function breadcrumb(items) {
    const nodes = [];
    items.forEach(function (item, idx) {
      if (idx > 0) nodes.push(el('span', { 'aria-hidden': 'true', text: '/' }));
      if (item.hash) nodes.push(el('a', { href: '#' + item.hash, 'data-route-link': '', text: item.label }));
      else nodes.push(el('span', { 'aria-current': 'page', text: item.label }));
    });
    return el('nav', { class: 'breadcrumb', 'aria-label': 'Localização atual' }, nodes);
  }

  GDM.components.pageHero = pageHero;
  GDM.components.breadcrumb = breadcrumb;
  GDM.components.starRow = starRow;
  GDM.components.ratingBlock = ratingBlock;
  GDM.components.buildAccordion = buildAccordion;
  GDM.components.trapFocus = trapFocus;
  GDM.components.updateActiveNav = updateActiveNav;
  GDM.components.closeAllOverlays = closeAllOverlays;
  GDM.components.initScrollReveal = initScrollReveal;
})(window.GDM = window.GDM || {});
