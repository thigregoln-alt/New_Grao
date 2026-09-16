/* ==========================================================================
   Cabeçalho — marca, navegação principal, pesquisa rápida, ações (favoritos,
   carrinho), menu mobile em drawer.
   ========================================================================== */
(function (GDM) {
  'use strict';
  const { el } = GDM.security;
  GDM.components = GDM.components || {};

  /* Menu único e global — usado em todas as páginas (cabeçalho e drawer
     mobile) via a mesma lista, para nunca haver divergência entre páginas.
     "Inspiração" (histórias/versículos por categoria) e "Projetos" (o que
     o ateliê está a construir para além da loja) são páginas distintas —
     não fundir uma na outra. "Avaliações" não está aqui: continua
     acessível pelo rodapé e pelo separador de avaliações na página de
     produto (ver js/pages/reviews.js e a rota /avaliacoes em js/main.js). */
  const NAV_LINKS = [
    { path: '/', label: 'Início' },
    { path: '/loja', label: 'Loja' },
    { path: '/inspiracao', label: 'Inspiração' },
    { path: '/projetos', label: 'Projetos' },
    { path: '/sobre', label: 'Sobre Nós' },
    { path: '/contacto', label: 'Contacto' },
  ];

  let favBadge, cartBadge, mobileNavEl, searchPanel, releaseFocus, searchReleaseFocus;

  function navList(extraClass) {
    const ul = el('ul', { class: extraClass || '' });
    NAV_LINKS.forEach(function (link) {
      const li = el('li');
      li.appendChild(el('a', { href: '#' + link.path, 'data-route-link': '', text: link.label }));
      ul.appendChild(li);
    });
    return ul;
  }

  /* Pesquisa: overlay centrado (tipo "command palette"), não um dropdown
     dentro do cabeçalho — fica fora do <header> (anexado a root, como o
     mobile-nav) para não ficar preso ao overflow/posicionamento dele. */
  function buildSearchOverlay(root) {
    const icon = document.createElement('span');
    icon.className = 'search-overlay__icon';
    icon.innerHTML = GDM.icons.icon('search');
    icon.setAttribute('aria-hidden', 'true');

    const input = el('input', {
      type: 'search', name: 'q', placeholder: 'O que procura hoje?',
      'aria-label': 'Pesquisar produtos', autocomplete: 'off',
    });

    const closeBtn = el('button', { class: 'icon-btn', type: 'button', 'aria-label': 'Fechar pesquisa' });
    closeBtn.innerHTML = GDM.icons.icon('close');
    closeBtn.addEventListener('click', closeSearch);

    const form = el('form', { class: 'search-overlay__form', role: 'search' }, [icon, input, closeBtn]);
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      const term = GDM.security.sanitizeInput(input.value, 60);
      GDM.router.navigate('/loja' + (term ? '?pesquisa=' + encodeURIComponent(term) : ''));
      closeSearch();
    });

    const hint = el('p', { class: 'search-overlay__hint', text: 'Enter para pesquisar · Esc para fechar' });
    const box = el('div', { class: 'search-overlay__box' }, [form, hint]);
    const scrim = el('div', { class: 'search-overlay__scrim' });
    scrim.addEventListener('click', closeSearch);

    searchPanel = el('div', { class: 'search-overlay', 'data-open': 'false' }, [scrim, box]);
    root.appendChild(searchPanel);
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && searchPanel.getAttribute('data-open') === 'true') closeSearch();
    });
  }

  function toggleSearch() {
    const open = searchPanel.getAttribute('data-open') === 'true';
    if (open) closeSearch(); else openSearch();
  }
  function openSearch() {
    /* A pesquisa global é independente da pesquisa da Loja.
       Remove explicitamente o foco do controlo que estava na página
       antes de transferi-lo para o overlay, evitando dois estados
       visuais de foco ao mesmo tempo. */
    const active = document.activeElement;
    if (active && active !== document.body && typeof active.blur === 'function') active.blur();
    document.querySelectorAll('.shop-sort-dropdown[data-open=\"true\"]').forEach(function (node) {
      node.setAttribute('data-open', 'false');
      const toggle = node.querySelector('.shop-sort-toggle');
      if (toggle) toggle.setAttribute('aria-expanded', 'false');
    });

    searchPanel.setAttribute('data-open', 'true');
    document.body.style.overflow = 'hidden';
    searchReleaseFocus = GDM.components.trapFocus(searchPanel);
    const input = searchPanel.querySelector('input');
    if (input) {
      requestAnimationFrame(function () { input.focus(); });
    }
  }
  function closeSearch() {
    if (!searchPanel || searchPanel.getAttribute('data-open') !== 'true') return;
    searchPanel.setAttribute('data-open', 'false');
    document.body.style.overflow = '';
    if (searchReleaseFocus) searchReleaseFocus();
  }

  function mount(root) {
    const logo = el('a', { href: '#/', class: 'header-brand', 'aria-label': 'Grão de Mostarda Personalizados — Início' });
    const logoImg = document.createElement('span');
    logoImg.className = 'header-brand__logo';
    logoImg.appendChild(el('img', {
      src: 'assets/logo-grao-de-mostarda.png',
      alt: '',
      loading: 'eager',
    }));
    logo.appendChild(logoImg);
    logo.appendChild(el('span', { class: 'header-brand__wordmark' }, [
      el('strong', { text: 'Grão de Mostarda' }),
      el('span', { text: 'Personalizados' }),
    ]));

    const nav = navList('main-nav');

    const searchBtn = el('button', { class: 'icon-btn', type: 'button', 'aria-label': 'Pesquisar' });
    searchBtn.innerHTML = GDM.icons.icon('search');
    searchBtn.addEventListener('click', toggleSearch);

    const favLink = el('a', { class: 'icon-btn', href: '#/favoritos', 'aria-label': 'Ver favoritos' });
    favLink.innerHTML = GDM.icons.icon('heart');
    favBadge = el('span', { class: 'icon-btn__badge' });
    favLink.appendChild(favBadge);

    const cartBtn = el('button', { class: 'icon-btn', type: 'button', 'aria-label': 'Abrir carrinho' });
    cartBtn.innerHTML = GDM.icons.icon('cart');
    cartBadge = el('span', { class: 'icon-btn__badge' });
    cartBtn.appendChild(cartBadge);
    cartBtn.addEventListener('click', function () { GDM.components.cartDrawer.open(cartBtn); });

    const navToggle = el('button', { class: 'icon-btn nav-toggle', type: 'button', 'aria-label': 'Abrir menu', 'aria-expanded': 'false' });
    navToggle.innerHTML = GDM.icons.icon('menu');
    navToggle.addEventListener('click', function () { openMobileNav(navToggle); });

    const actions = el('div', { class: 'header-actions' }, [searchBtn, favLink, cartBtn, navToggle]);

    const bar = el('div', { class: 'container header-bar' }, [logo, nav, actions]);
    const headerEl = el('header', { class: 'site-header', id: 'site-header' }, [bar]);
    root.appendChild(headerEl);

    buildSearchOverlay(root);
    buildMobileNav(root);

    GDM.bus.on('favorites:change', updateFavBadge);
    GDM.bus.on('cart:change', updateCartBadge);
    updateFavBadge(GDM.favorites.list());
    updateCartBadge(GDM.cart.getState());
  }

  function updateFavBadge(list) {
    const count = Array.isArray(list) ? list.length : GDM.favorites.count();
    favBadge.textContent = String(count);
    favBadge.style.display = count ? 'flex' : 'none';
  }
  function updateCartBadge(state) {
    const count = (state && state.count) || 0;
    cartBadge.textContent = String(count);
    cartBadge.style.display = count ? 'flex' : 'none';
  }

  function buildMobileNav(root) {
    const closeBtn = el('button', { class: 'icon-btn', type: 'button', 'aria-label': 'Fechar menu', style: 'color:var(--cream-100)' });
    closeBtn.innerHTML = GDM.icons.icon('close');
    closeBtn.addEventListener('click', closeMobileNav);
    const logoImg = document.createElement('span');
    logoImg.className = 'mobile-nav__logo';
    logoImg.appendChild(el('img', {
      src: 'assets/logo-grao-de-mostarda.png',
      alt: 'Grão de Mostarda',
      loading: 'lazy',
    }));
    const head = el('div', { class: 'mobile-nav__head' }, [logoImg, closeBtn]);
    const list = navList('mobile-nav__list');
    list.querySelectorAll('a').forEach(function (a) { a.addEventListener('click', closeMobileNav); });
    const waLink = el('a', {
      class: 'btn btn--whatsapp btn--block', href: 'https://wa.me/' + GDM.content.BRAND.whatsapp, target: '_blank', rel: 'noopener',
    });
    waLink.innerHTML = GDM.icons.icon('whatsapp') + '<span>Falar no WhatsApp</span>';
    const panel = el('div', { class: 'mobile-nav__panel' }, [head, list, waLink]);
    const scrim = el('div', { class: 'mobile-nav__scrim' });
    scrim.addEventListener('click', closeMobileNav);
    mobileNavEl = el('div', { class: 'mobile-nav', 'data-open': 'false', id: 'mobile-nav' }, [scrim, panel]);
    root.appendChild(mobileNavEl);
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && mobileNavEl.getAttribute('data-open') === 'true') closeMobileNav();
    });
  }

  let lastNavTrigger;
  function openMobileNav(trigger) {
    lastNavTrigger = trigger;
    mobileNavEl.setAttribute('data-open', 'true');
    trigger.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';
    releaseFocus = GDM.components.trapFocus(mobileNavEl);
    mobileNavEl.querySelector('.icon-btn').focus();
  }
  function closeMobileNav() {
    if (!mobileNavEl || mobileNavEl.getAttribute('data-open') !== 'true') return;
    mobileNavEl.setAttribute('data-open', 'false');
    document.body.style.overflow = '';
    if (releaseFocus) releaseFocus();
    if (lastNavTrigger) { lastNavTrigger.setAttribute('aria-expanded', 'false'); lastNavTrigger.focus(); }
  }

  GDM.components.header = { mount: mount, closeMobileNav: closeMobileNav, closeSearch: closeSearch };
})(window.GDM = window.GDM || {});
