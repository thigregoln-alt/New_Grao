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

  /**
   * Substitui a interação de um <select> nativo já existente por um botão +
   * lista personalizados (paleta da marca — nunca o azul de sistema que o
   * popup nativo de <option>s pinta em vários browsers). O <select> original
   * continua no DOM (só visualmente escondido): guarda o valor, dispara
   * 'change' quando uma opção é escolhida, e é o que qualquer validação ou
   * lógica já existente (ex.: cascata categoria → produto) continua a ler —
   * por isso repopular as suas <option> em runtime (input.innerHTML = …)
   * também atualiza a lista personalizada automaticamente, via
   * MutationObserver. Devolve o wrapper a inserir no lugar do <select>.
   */
  function enhanceSelect(select) {
    const wrap = el('div', { class: 'gdm-select' });
    wrap.setAttribute('data-open', 'false');

    const toggleId = select.id ? select.id + '-toggle' : '';
    const toggle = el('button', { type: 'button', class: 'gdm-select__toggle', 'aria-haspopup': 'listbox', 'aria-expanded': 'false' });
    if (toggleId) toggle.id = toggleId;
    const describedBy = select.getAttribute('aria-describedby');
    if (describedBy) toggle.setAttribute('aria-describedby', describedBy);

    const valueEl = el('span', { class: 'gdm-select__value' });
    const arrow = el('span', { class: 'gdm-select__arrow', 'aria-hidden': 'true' });
    arrow.innerHTML = GDM.icons.icon('chevronDown');
    toggle.appendChild(valueEl);
    toggle.appendChild(arrow);

    const menu = el('div', { class: 'gdm-select__menu', role: 'listbox' });
    if (toggleId) menu.setAttribute('aria-labelledby', toggleId);

    function closeMenu() {
      wrap.setAttribute('data-open', 'false');
      toggle.setAttribute('aria-expanded', 'false');
    }
    function openMenu() {
      if (select.disabled) return;
      wrap.setAttribute('data-open', 'true');
      toggle.setAttribute('aria-expanded', 'true');
    }

    /* Espelha apenas o estado (disabled/aria-invalid) no botão — nunca
       destrói as linhas da lista. Importante: um clique real do rato numa
       opção passa primeiro por um mousedown que tira o foco do botão
       (blur), e esse blur pode disparar validação (wireForm) que marca
       aria-invalid — se isso reconstruísse a lista a meio do clique (como
       fazia antes, tudo dentro de uma única sync()), a linha clicada era
       removida do DOM entre o mousedown e o click e o clique perdia-se. */
    function syncState() {
      toggle.disabled = select.disabled;
      if (select.hasAttribute('aria-invalid')) toggle.setAttribute('aria-invalid', select.getAttribute('aria-invalid'));
      else toggle.removeAttribute('aria-invalid');
    }

    function syncValue() {
      const opt = select.options[select.selectedIndex];
      valueEl.textContent = opt ? opt.textContent : '';
      menu.innerHTML = '';
      Array.prototype.forEach.call(select.options, function (o) {
        const row = el('button', { type: 'button', class: 'gdm-select__option', role: 'option', 'aria-selected': String(o.selected), text: o.textContent });
        row.addEventListener('click', function () {
          if (select.value !== o.value) {
            select.value = o.value;
            select.dispatchEvent(new Event('change', { bubbles: true }));
          }
          closeMenu();
          toggle.focus();
        });
        menu.appendChild(row);
      });
    }

    function sync() { syncValue(); syncState(); }

    toggle.addEventListener('click', function () {
      if (wrap.getAttribute('data-open') === 'true') { closeMenu(); return; }
      sync(); openMenu();
      const current = menu.querySelector('[aria-selected="true"]') || menu.firstElementChild;
      if (current) current.focus();
    });
    toggle.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        sync(); openMenu();
        const current = menu.querySelector('[aria-selected="true"]') || menu.firstElementChild;
        if (current) current.focus();
      }
    });
    menu.addEventListener('keydown', function (e) {
      const opts = Array.prototype.slice.call(menu.querySelectorAll('.gdm-select__option'));
      const idx = opts.indexOf(document.activeElement);
      if (e.key === 'Escape') { e.preventDefault(); closeMenu(); toggle.focus(); }
      else if (e.key === 'ArrowDown') { e.preventDefault(); (opts[idx + 1] || opts[0]).focus(); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); (opts[idx - 1] || opts[opts.length - 1]).focus(); }
      else if (e.key === 'Tab') { closeMenu(); }
    });
    document.addEventListener('click', function (e) {
      if (!wrap.contains(e.target)) closeMenu();
    });

    select.addEventListener('change', sync);
    const mo = new MutationObserver(function (mutations) {
      if (mutations.some(function (m) { return m.type === 'childList'; })) syncValue();
      syncState();
    });
    mo.observe(select, { childList: true, attributes: true, attributeFilter: ['disabled', 'aria-invalid'] });

    select.classList.add('gdm-select__native');
    select.setAttribute('tabindex', '-1');
    select.setAttribute('aria-hidden', 'true');

    wrap.appendChild(select);
    wrap.appendChild(toggle);
    wrap.appendChild(menu);
    sync();
    return wrap;
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
  GDM.components.enhanceSelect = enhanceSelect;
  GDM.components.starRow = starRow;
  GDM.components.ratingBlock = ratingBlock;
  GDM.components.buildAccordion = buildAccordion;
  GDM.components.trapFocus = trapFocus;
  GDM.components.updateActiveNav = updateActiveNav;
  GDM.components.closeAllOverlays = closeAllOverlays;
  GDM.components.initScrollReveal = initScrollReveal;
})(window.GDM = window.GDM || {});
