(function (GDM) {
  'use strict';

  function routeToFile(path) {
    path = String(path || '/');
    var q = '';
    if (path.indexOf('?') !== -1) { q = path.slice(path.indexOf('?')); path = path.slice(0, path.indexOf('?')); }
    path = path.replace(/^#/, '').replace(/\/$/, '') || '/';
    if (path.indexOf('/produto/') === 0) return 'produto-' + path.slice('/produto/'.length) + '.html' + q;
    var map = {'/':'index.html','/loja':'loja.html','/carrinho':'carrinho.html','/checkout':'checkout.html','/favoritos':'favoritos.html','/sobre':'sobre.html','/inspiracao':'inspiracao.html','/projetos':'projetos.html','/faq':'faq.html','/envios':'envios.html','/trocas':'trocas.html','/contacto':'contacto.html','/avaliacoes':'avaliacoes.html','/privacidade':'privacidade.html','/termos':'termos.html','/admin':'admin.html'};
    return (map[path] || 'index.html') + q;
  }

  GDM.router = GDM.router || {};
  GDM.router.navigate = function (path) { window.location.href = routeToFile(path); };

  function rewriteLinks(root) {
    (root || document).querySelectorAll('a[href^="#/"]').forEach(function (a) {
      a.setAttribute('href', routeToFile(a.getAttribute('href')));
    });
  }

  /* Links "#/…" criados depois do arranque (listas re-renderizadas ao
     filtrar, drawer, avaliações…) não passam por rewriteLinks. Um único
     listener delegado corrige o href no próprio link antes de o browser o
     seguir — assim o clique normal, Ctrl/Cmd+clique, o clique do meio e o
     URL mostrado ao passar o rato/focar funcionam todos. */
  function fixLinkOnInteraction(e) {
    var target = e.target;
    var a = target && target.closest ? target.closest('a[href^="#/"]') : null;
    if (a) a.setAttribute('href', routeToFile(a.getAttribute('href')));
  }
  ['mousedown', 'click', 'mouseover', 'focusin'].forEach(function (type) {
    document.addEventListener(type, fixLinkOnInteraction, true);
  });

  /* Loja aberta em vários separadores: quando outro separador altera o
     carrinho ou os favoritos, o evento 'storage' chega aqui e reemitimos a
     mudança no bus para o badge, o drawer e as páginas se atualizarem. */
  window.addEventListener('storage', function (e) {
    if (e.key === 'gdm:cart' || e.key === null) GDM.bus.emit('cart:change', GDM.cart.getState());
    if (e.key === 'gdm:favorites' || e.key === null) GDM.bus.emit('favorites:change', GDM.favorites.list());
  });

  function markActive() {
    var page = document.body.getAttribute('data-gdm-page') || '/';
    var normalized = page === 'produto' ? '' : page;
    document.querySelectorAll('a[data-route-link], .main-nav a, .mobile-nav__list a').forEach(function (a) {
      var href = a.getAttribute('href') || '';
      if (!normalized) { a.removeAttribute('aria-current'); return; }
      var target = href.replace(/^[.\/]+/, '').replace(/\.html.*$/, '');
      var desired = normalized === '/' ? 'index' : normalized.slice(1);
      if (target === desired) a.setAttribute('aria-current','page'); else a.removeAttribute('aria-current');
    });
  }

  function mountGlobal() {
    var hh = document.getElementById('header-host');
    var oh = document.getElementById('overlay-host');
    var fh = document.getElementById('footer-host');
    if (!hh || !oh || !fh) return;
    GDM.components.header.mount(hh);
    GDM.components.cartDrawer.mount(oh);
    GDM.components.toast.mount(oh);
    GDM.components.footer.mount(fh);
    GDM.components.cookieConsent.mount(oh);
    rewriteLinks(document);
    markActive();
    if (GDM.bus && GDM.bus.on) GDM.bus.on('cart:change', function () { setTimeout(function(){ rewriteLinks(document); }, 0); });
  }

  function hydrateFavorites() {
    document.querySelectorAll('.product-card__fav').forEach(function (btn) {
      if (btn.dataset.gdmHydrated) return;
      var card = btn.closest('.product-card');
      var link = card && card.querySelector('.product-card__title a');
      var href = link && link.getAttribute('href') || '';
      var m = href.match(/produto-([^?]+)\.html/);
      if (!m) return;
      var product = GDM.catalog.getBySlug(m[1]);
      if (!product) return;
      btn.dataset.gdmHydrated = '1';
      /* O HTML estático vem sempre com aria-pressed="false" — o estado real
         (favoritos deste browser) é aplicado já ao hidratar e sempre que os
         favoritos mudam (incluindo noutro separador). */
      function sync() {
        var pressed = GDM.favorites.has(product.id);
        btn.setAttribute('aria-pressed', String(pressed));
        btn.setAttribute('aria-label', pressed ? 'Remover dos favoritos' : 'Adicionar aos favoritos');
        return pressed;
      }
      sync();
      GDM.bus.on('favorites:change', sync);
      btn.addEventListener('click', function (e) {
        e.preventDefault(); e.stopPropagation();
        GDM.favorites.toggle(product.id);
        var pressed = sync();
        btn.classList.add('is-bumping');
        setTimeout(function(){btn.classList.remove('is-bumping')},400);
        if (GDM.components.toast) GDM.components.toast.show(pressed ? 'Adicionado aos favoritos.' : 'Removido dos favoritos.', 'info');
      });
    });
  }

  function hydrateAccordions() {
    document.querySelectorAll('.accordion-item__trigger').forEach(function (trigger) {
      if (trigger.dataset.gdmHydrated) return;
      var id = trigger.getAttribute('aria-controls');
      var panel = id && document.getElementById(id);
      if (!panel) return;
      trigger.dataset.gdmHydrated = '1';
      trigger.addEventListener('click', function(){
        var open = trigger.getAttribute('aria-expanded') === 'true';
        trigger.setAttribute('aria-expanded', String(!open));
        panel.setAttribute('data-open', String(!open));
      });
    });
  }

  function hydrateProductPage() {
    var slug = document.body.getAttribute('data-product-slug');
    if (!slug) return;
    var product = GDM.catalog.getBySlug(slug); if (!product) return;
    var main = document.querySelector('.product-gallery__main');
    var thumbs = document.querySelector('.product-gallery__thumbs');
    if (main && thumbs && !main.dataset.gdmHydrated) {
      var buttons = Array.prototype.slice.call(thumbs.querySelectorAll('button'));
      buttons.forEach(function(btn, idx){ btn.addEventListener('click', function(){ main.innerHTML = btn.innerHTML; buttons.forEach(function(b){b.setAttribute('aria-current','false')}); btn.setAttribute('aria-current','true'); }); });
      main.dataset.gdmHydrated='1';
    }
    var qty = document.querySelector('.product-info .qty-stepper input[type="number"]');
    var minus = document.querySelector('.product-info .qty-stepper button[aria-label="Diminuir quantidade"]');
    var plus = document.querySelector('.product-info .qty-stepper button[aria-label="Aumentar quantidade"]');
    var add = Array.prototype.find.call(document.querySelectorAll('.product-info .btn'), function(b){ return b.textContent.indexOf('Adicionar ao carrinho')!==-1; });
    if (qty && minus && plus && add && !add.dataset.gdmHydrated) {
      minus.addEventListener('click',function(){qty.value=Math.max(1,(parseInt(qty.value,10)||1)-1)});
      plus.addEventListener('click',function(){qty.value=Math.min(product.stock,(parseInt(qty.value,10)||1)+1)});
      add.addEventListener('click',function(){ var q=Math.max(1,Math.min(product.stock,parseInt(qty.value,10)||1)); GDM.cart.addItem(product.id,q); if(GDM.components.toast) GDM.components.toast.show('Artigo adicionado ao carrinho.','success'); });
      add.dataset.gdmHydrated='1';
    }
    /* Telemóvel: barra fixa no fundo com "Adicionar ao carrinho" quando o
       botão principal já ficou para trás no scroll (padrão Apple/Shopify).
       Fica dentro do <main>, por isso também fica inerte com o drawer aberto. */
    var app = document.getElementById('app');
    if (add && app && 'IntersectionObserver' in window && !document.querySelector('.sticky-buy')) {
      var bar = GDM.security.el('div', { class: 'sticky-buy', hidden: true }, [
        GDM.security.el('div', { class: 'sticky-buy__info' }, [
          GDM.security.el('p', { class: 'sticky-buy__name', text: product.name }),
          GDM.security.el('p', { class: 'sticky-buy__price', text: GDM.format.currency(product.price) }),
        ]),
        GDM.security.el('button', { class: 'btn btn--primary btn--sm', type: 'button', text: 'Adicionar ao carrinho', onclick: function(){ add.click(); } }),
      ]);
      app.appendChild(bar);
      new IntersectionObserver(function(entries){
        var e = entries[0];
        bar.hidden = e.isIntersecting || e.boundingClientRect.top > 0;
      }).observe(add);
    }
    var fav = Array.prototype.find.call(document.querySelectorAll('.product-info .btn'), function(b){ return b.textContent.indexOf('Guardar nos favoritos')!==-1 || b.textContent.indexOf('Remover dos favoritos')!==-1; });
    if (fav && !fav.dataset.gdmHydrated) {
      /* Estado inicial vindo dos favoritos deste browser (o HTML estático
         diz sempre "Guardar"). Só o <span> do texto muda — o ícone fica. */
      var syncFav = function(){
        var pressed=GDM.favorites.has(product.id);
        var label=fav.querySelector('span')||fav;
        label.textContent=pressed?'Remover dos favoritos':'Guardar nos favoritos';
        fav.setAttribute('aria-pressed',String(pressed));
        return pressed;
      };
      syncFav();
      GDM.bus.on('favorites:change', syncFav);
      fav.addEventListener('click',function(){ GDM.favorites.toggle(product.id); var pressed=syncFav(); if(GDM.components.toast) GDM.components.toast.show(pressed?'Adicionado aos favoritos.':'Removido dos favoritos.','info'); });
      fav.dataset.gdmHydrated='1';
    }
    /* Separadores com o padrão WAI-ARIA "tabs": só o separador ativo está na
       ordem do Tab (tabindex 0); ←/→ (com volta), Home e End mudam de
       separador e mostram logo o painel (ativação automática). */
    var tabButtons = Array.prototype.slice.call(document.querySelectorAll('.detail-tabs__nav [role="tab"], .detail-tabs__nav button'));
    function selectTab(idx, moveFocus){
      tabButtons[idx].click();
      if(moveFocus) tabButtons[idx].focus();
    }
    tabButtons.forEach(function(btn, idx, arr){
      if(btn.dataset.gdmHydrated) return;
      btn.dataset.gdmHydrated='1';
      btn.addEventListener('keydown',function(e){
        var next=null;
        if(e.key==='ArrowRight') next=(idx+1)%arr.length;
        else if(e.key==='ArrowLeft') next=(idx-1+arr.length)%arr.length;
        else if(e.key==='Home') next=0;
        else if(e.key==='End') next=arr.length-1;
        if(next===null) return;
        e.preventDefault();
        selectTab(next, true);
      });
      btn.addEventListener('click',function(){
        /* cada separador tem o seu painel (escrito no HTML pelo gerador):
           só se mostra/esconde — nada é reconstruído */
        arr.forEach(function(b,i){
          b.setAttribute('aria-selected',String(i===idx));
          b.setAttribute('tabindex', i===idx ? '0' : '-1');
          var p=document.getElementById(b.getAttribute('aria-controls'));
          if(p) p.hidden = i!==idx;
        });
        if(btn.id==='tab-avaliacoes') loadProductReviews();
      });
    });

    /* ---- Avaliações da ficha: linha junto ao título + separador ---- */
    var ratingLine = document.querySelector('[data-gdm-rating]');
    var reviewsHost = document.querySelector('[data-gdm-product-reviews]');
    var reviewsTab = document.getElementById('tab-avaliacoes');
    function openReviewsTab(e){
      if(e) e.preventDefault();
      if(reviewsTab){ reviewsTab.click(); reviewsTab.scrollIntoView({block:'center'}); reviewsTab.focus({preventScroll:true}); }
    }
    if (ratingLine && GDM.reviews.configurado()) {
      GDM.reviews.resumo(product.id).then(function(s){
        ratingLine.innerHTML='';
        if (s.erro) return;
        var link = document.createElement('a');
        link.href = '#panel-avaliacoes';
        link.addEventListener('click', openReviewsTab);
        if (s.contagem) {
          var stars = GDM.components.starRow(s.media);
          stars.setAttribute('role','img');
          stars.setAttribute('aria-label','Média de ' + s.media.toLocaleString('pt-PT',{maximumFractionDigits:1}) + ' em 5 estrelas');
          ratingLine.appendChild(stars);
          var avg = document.createElement('span');
          avg.textContent = s.media.toLocaleString('pt-PT',{minimumFractionDigits:1,maximumFractionDigits:1});
          ratingLine.appendChild(avg);
          link.textContent = '(' + s.contagem + (s.contagem===1 ? ' avaliação)' : ' avaliações)');
        } else {
          link.textContent = 'Seja o primeiro a avaliar';
        }
        ratingLine.appendChild(link);
      });
    }

    var reviewsLoaded = false;
    function loadProductReviews(){
      if (reviewsLoaded || !reviewsHost || !GDM.pages || !GDM.pages.reviews) return;
      reviewsLoaded = true;
      var R = GDM.pages.reviews;
      var list = document.createElement('div');
      list.className = 'stack';
      list.style.gap = '16px';
      var formPanel = document.createElement('div');
      formPanel.className = 'panel';
      formPanel.style.marginTop = '24px';
      var h = document.createElement('h3');
      h.textContent = 'Deixe a sua avaliação';
      h.style.marginBottom = '16px';
      formPanel.appendChild(h);
      formPanel.appendChild(R.buildForm({ produtoSlug: product.slug }));
      if (!GDM.reviews.configurado()) {
        reviewsHost.innerHTML = '';
        reviewsHost.appendChild(R.comingSoonBlock());
        reviewsHost.appendChild(formPanel);
        return;
      }
      function draw(){
        /* mantém a altura do bloco estático (se houver) enquanto carrega */
        var minH = reviewsHost.offsetHeight;
        reviewsHost.style.minHeight = minH ? minH + 'px' : '';
        reviewsHost.innerHTML = '';
        reviewsHost.appendChild(R.skeleton('card', 2));
        Promise.all([GDM.reviews.resumo(product.id), GDM.reviews.listar({ produtoId: product.id, limite: 5 })]).then(function(res){
          var s = res[0], l = res[1];
          reviewsHost.innerHTML = '';
          reviewsHost.style.minHeight = '';
          if (s.erro || l.erro) { reviewsHost.appendChild(R.errorBlock(draw)); reviewsHost.appendChild(formPanel); return; }
          if (!s.contagem) {
            reviewsHost.appendChild(R.emptyBlock('Ainda sem avaliações para este produto', 'Seja o primeiro a avaliar — o formulário está aqui em baixo.'));
          } else {
            reviewsHost.appendChild(R.summaryBlock(s));
            list.innerHTML = '';
            l.itens.forEach(function(item){ list.appendChild(R.reviewCard(item)); });
            list.style.marginTop = '20px';
            reviewsHost.appendChild(list);
            var all = document.createElement('a');
            all.className = 'btn btn--outline btn--sm';
            all.style.marginTop = '16px';
            all.href = 'avaliacoes.html?produto=' + encodeURIComponent(product.slug);
            all.textContent = 'Ver todas as avaliações';
            reviewsHost.appendChild(all);
          }
          reviewsHost.appendChild(formPanel);
          GDM.components.initScrollReveal();
        });
      }
      draw();
    }
    if (window.location.hash === '#panel-avaliacoes' || window.location.hash === '#avaliacoes') openReviewsTab();
    rewriteLinks(document);
  }

  function hydrateShop() {
    if (document.body.getAttribute('data-gdm-page') !== '/loja') return;

    var cards = Array.prototype.slice.call(document.querySelectorAll('.grid-auto .product-card'));
    var grid = document.querySelector('.grid-auto');
    var search = document.querySelector('.shop-toolbar input[type="search"]');
    var sort = document.querySelector('.shop-toolbar select');
    var pills = document.querySelectorAll('.filter-pill');
    if (!grid || !cards.length) return;

    function productOf(card){
      var a=card.querySelector('.product-card__title a');
      var h=a&&a.getAttribute('href')||'';
      var m=h.match(/produto-([^?]+)\.html/);
      return m?GDM.catalog.getBySlug(m[1]):null;
    }

    var cardProducts = cards.map(function(card){ return { card: card, product: productOf(card) }; }).filter(function(x){ return !!x.product; });
    /* médias por produto (GDM.reviews.resumoTodos): "Melhor avaliação" só
       fica disponível depois de carregarem */
    var ratings = null;

    var sortLabels = {
      'relevancia':'Relevância',
      'preco-asc':'Preço: menor para maior',
      'preco-desc':'Preço: maior para menor',
      'avaliacao':'Melhor avaliação'
    };

    function readState(){
      var params = new URLSearchParams(window.location.search);
      return {
        pesquisa: (params.get('pesquisa') || '').trim(),
        categoria: params.get('categoria') || '',
        ordenar: sortLabels[params.get('ordenar')] ? params.get('ordenar') : 'relevancia'
      };
    }

    function writeState(next, replace){
      var current = readState();
      var state = {
        pesquisa: next.pesquisa !== undefined ? next.pesquisa : current.pesquisa,
        categoria: next.categoria !== undefined ? next.categoria : current.categoria,
        ordenar: next.ordenar !== undefined ? next.ordenar : current.ordenar
      };
      var params = new URLSearchParams();
      if (state.pesquisa) params.set('pesquisa', state.pesquisa);
      if (state.categoria) params.set('categoria', state.categoria);
      if (state.ordenar && state.ordenar !== 'relevancia') params.set('ordenar', state.ordenar);
      var url = window.location.pathname + (params.toString() ? '?' + params.toString() : '') + window.location.hash;
      if (replace) window.history.replaceState({}, '', url); else window.history.pushState({}, '', url);
      apply();
    }

    function apply(){
      var state = readState();
      var term = state.pesquisa.toLowerCase();
      var cat = state.categoria;
      var ord = state.ordenar;
      var list = cardProducts.map(function(x){ return x.product; }).filter(function(p){
        return (!cat || p.category === cat) && (!term || p.name.toLowerCase().indexOf(term)!==-1 || p.description.toLowerCase().indexOf(term)!==-1 || p.categoryLabel.toLowerCase().indexOf(term)!==-1);
      });

      list.sort(function(a,b){
        if(ord==='preco-asc') return a.price-b.price;
        if(ord==='preco-desc') return b.price-a.price;
        if(ord==='avaliacao' && ratings){
          var ra=ratings[a.id], rb=ratings[b.id];
          return ((rb?rb.media:0)-(ra?ra.media:0)) || ((rb?rb.contagem:0)-(ra?ra.contagem:0));
        }
        return (b.featured?1:0)-(a.featured?1:0);
      });

      list.forEach(function(p){
        var found=cardProducts.find(function(x){ return x.product.id===p.id; });
        if(found) grid.appendChild(found.card);
      });
      cardProducts.forEach(function(x){
        x.card.style.display = list.some(function(p){ return p.id===x.product.id; }) ? '' : 'none';
      });

      if(search) search.value = state.pesquisa;
      if(sort) sort.value = state.ordenar;

      var count=document.querySelector('.shop-results-count');
      if(count) count.textContent=list.length+(list.length===1?' produto encontrado':' produtos encontrados');

      pills.forEach(function(b){
        var label=b.textContent.trim();
        var c=GDM.catalog.CATEGORIES.find(function(x){return x.label===label});
        var active=!c?!cat:(c.slug===cat);
        b.setAttribute('aria-pressed',String(active));
      });

      var toggleValue = document.querySelector('.shop-sort-toggle__value');
      if(toggleValue) toggleValue.textContent = sortLabels[state.ordenar];
      document.querySelectorAll('.shop-sort-option').forEach(function(option){
        var key = option.getAttribute('data-sort-value');
        if(key) option.setAttribute('aria-selected', String(key===state.ordenar));
      });
    }

    if(search && !search.dataset.gdmHydrated){
      var f=search.closest('form');
      if(f) f.addEventListener('submit',function(e){
        e.preventDefault();
        writeState({pesquisa: search.value.trim()});
      });
      search.dataset.gdmHydrated='1';
    }

    if(sort && !sort.dataset.gdmHydrated){
      var sortWrap = document.createElement('div');
      sortWrap.className = 'shop-sort-dropdown';
      sortWrap.dataset.open = 'false';
      sortWrap.setAttribute('data-shop-custom-sort','true');

      var toggle = document.createElement('button');
      toggle.type = 'button';
      toggle.className = 'shop-sort-toggle';
      toggle.setAttribute('aria-haspopup','listbox');
      toggle.setAttribute('aria-expanded','false');
      toggle.innerHTML = '<span class="shop-sort-toggle__label"><span class="shop-sort-toggle__meta">Ordenar</span><span class="shop-sort-toggle__value"></span></span><span class="shop-sort-toggle__arrow"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg></span>';

      var menu = document.createElement('div');
      menu.className = 'shop-sort-menu';
      menu.setAttribute('role','listbox');
      menu.setAttribute('aria-label','Ordenar por');
      menu.id = 'shop-sort-menu';
      toggle.setAttribute('aria-controls', menu.id);

      Object.keys(sortLabels).forEach(function(key){
        var option = document.createElement('button');
        option.type='button';
        option.className='shop-sort-option';
        option.setAttribute('role','option');
        option.setAttribute('data-sort-value', key);
        option.setAttribute('tabindex','-1');
        if(key==='avaliacao') option.hidden = true; // até as médias carregarem
        option.innerHTML='<span class="shop-sort-option__mark" aria-hidden="true"></span><span class="shop-sort-option__text"></span>';
        option.querySelector('.shop-sort-option__text').textContent=sortLabels[key];
        option.addEventListener('click',function(e){
          e.preventDefault();
          e.stopPropagation();
          closeSort();
          writeState({ordenar:key});
          toggle.focus();
        });
        menu.appendChild(option);
      });

      /* Teclado (padrão WAI-ARIA listbox): ↑/↓ no botão abrem a lista na
         opção atual; dentro da lista ↑/↓/Home/End mudam de opção,
         Enter/Espaço escolhem, Esc fecha e devolve o foco ao botão. */
      function focusOption(which){
        var opts = Array.prototype.slice.call(menu.querySelectorAll('.shop-sort-option:not([hidden])'));
        var idx = opts.indexOf(document.activeElement);
        var current = menu.querySelector('[aria-selected="true"]') || opts[0];
        var target = which === 'current' ? current
          : which === 'first' ? opts[0]
          : which === 'last' ? opts[opts.length - 1]
          : which === 'next' ? (opts[idx + 1] || opts[opts.length - 1])
          : (opts[idx - 1] || opts[0]);
        GDM.components.focusWhenVisible(target);
      }
      toggle.addEventListener('keydown',function(e){
        if(e.key!=='ArrowDown' && e.key!=='ArrowUp') return;
        e.preventDefault();
        // ao abrir, o clique já põe o foco na opção atual (depois de a lista ficar visível)
        if(sortWrap.dataset.open!=='true') { toggle.click(); return; }
        focusOption('current');
      });
      menu.addEventListener('keydown',function(e){
        if(e.key==='ArrowDown'){ e.preventDefault(); focusOption('next'); }
        else if(e.key==='ArrowUp'){ e.preventDefault(); focusOption('prev'); }
        else if(e.key==='Home'){ e.preventDefault(); focusOption('first'); }
        else if(e.key==='End'){ e.preventDefault(); focusOption('last'); }
        else if(e.key==='Escape'){ e.preventDefault(); closeSort(); toggle.focus(); }
        else if(e.key==='Tab'){ closeSort(); }
      });

      function closeSort(){
        sortWrap.dataset.open='false';
        toggle.setAttribute('aria-expanded','false');
      }

      toggle.addEventListener('click',function(e){
        e.stopPropagation();
        var open=sortWrap.dataset.open!=='true';
        document.querySelectorAll('.shop-sort-dropdown[data-open="true"]').forEach(function(x){
          x.dataset.open='false';
          var t=x.querySelector('.shop-sort-toggle');
          if(t) t.setAttribute('aria-expanded','false');
        });
        sortWrap.dataset.open=String(open);
        toggle.setAttribute('aria-expanded',String(open));
        if(open) focusOption('current');
      });
      document.addEventListener('click',function(e){ if(!sortWrap.contains(e.target)) closeSort(); });
      document.addEventListener('keydown',function(e){ if(e.key==='Escape') closeSort(); });

      sortWrap.appendChild(toggle);
      sortWrap.appendChild(menu);
      sort.parentNode.insertBefore(sortWrap, sort);
      sort.style.display='none';
      sort.dataset.gdmHydrated='1';
    }

    pills.forEach(function(b){
      if(b.dataset.gdmHydrated)return;
      b.dataset.gdmHydrated='1';
      b.addEventListener('click',function(){
        var label=b.textContent.trim();
        var c=GDM.catalog.CATEGORIES.find(function(x){return x.label===label});
        /* Clicar na categoria já ativa funciona como toggle: volta para
           "Todas" (mesmo estado de clicar diretamente na pill "Todas").
           Clicar numa categoria diferente troca o filtro normalmente. */
        var isActive = c && readState().categoria === c.slug;
        writeState({categoria: (c && !isActive) ? c.slug : ''});
      });
    });

    if (GDM.reviews.configurado()) {
      GDM.reviews.resumoTodos().then(function(r){
        if (r.erro) return; // sem médias, a opção "Melhor avaliação" continua escondida
        ratings = r.porProduto;
        var opt = document.querySelector('.shop-sort-option[data-sort-value="avaliacao"]');
        if (opt) opt.hidden = false;
        if (readState().ordenar === 'avaliacao') apply();
      });
    }

    window.addEventListener('popstate', apply);
    apply();
  }

  /* Estrelas e contagem nos cartões de produto (loja, destaques, "também vai
     gostar", favoritos): um só pedido por página (resumoTodos, em cache).
     Ficam na linha do preço, por isso não empurram nada (sem salto de
     layout). Sem configuração, com erro ou sem avaliações: nada aparece. */
  function decorateCardRatings(root) {
    var metas = (root || document).querySelectorAll('.product-card .product-card__meta');
    if (!metas.length || !GDM.reviews || !GDM.reviews.configurado()) return;
    GDM.reviews.resumoTodos().then(function(r){
      if (r.erro) return;
      metas.forEach(function(meta){
        if (meta.querySelector('.product-card__rating')) return;
        var a = meta.closest('.product-card').querySelector('.product-card__title a');
        var m = a && (a.getAttribute('href') || '').match(/produto-([^?#]+)\.html|#\/produto\/([^?#]+)/);
        var p = m && GDM.catalog.getBySlug(m[1] || m[2]);
        var s = p && r.porProduto[p.id];
        if (!s) return;
        var media = s.media.toLocaleString('pt-PT', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
        var span = document.createElement('span');
        span.className = 'product-card__rating';
        span.setAttribute('role', 'img');
        span.setAttribute('aria-label', 'Média de ' + media + ' em 5 estrelas, ' + s.contagem + (s.contagem === 1 ? ' avaliação' : ' avaliações'));
        span.innerHTML = GDM.icons.icon('star');
        span.firstElementChild.setAttribute('aria-hidden', 'true');
        span.appendChild(document.createTextNode(media + ' (' + s.contagem + ')'));
        meta.appendChild(span);
      });
    });
  }

  function hydrateContactPage() {
    if (document.body.getAttribute('data-gdm-page') !== '/contacto') return;
    if (!GDM.pages || !GDM.pages.contact) return;
    var app = document.getElementById('app');
    if (!app || app.dataset.gdmContactHydrated) return;
    GDM.pages.contact.render(app);
    app.dataset.gdmContactHydrated = '1';
  }

  function hydrateFullCartPage() {
    if (document.body.getAttribute('data-gdm-page') !== '/carrinho') return;
    if (!GDM.pages || !GDM.pages.cart) return;
    var app = document.getElementById('app');
    if (app) GDM.pages.cart.render(app);
  }

  function hydrateFavoritesPage() {
    if (document.body.getAttribute('data-gdm-page') !== '/favoritos') return;
    if (!GDM.pages || !GDM.pages.favorites) return;
    var app = document.getElementById('app');
    if (!app) return;
    GDM.pages.favorites.render(app);
    decorateCardRatings(app);
    // a página volta a desenhar os cartões quando os favoritos mudam
    GDM.bus.on('favorites:change', function () { setTimeout(function () { decorateCardRatings(app); }, 0); });
  }

  function hydrateCheckoutPage() {
    if (document.body.getAttribute('data-gdm-page') !== '/checkout') return;
    if (!GDM.pages || !GDM.pages.checkout) return;
    var app = document.getElementById('app');
    if (app) GDM.pages.checkout.render(app);
  }

  function hydrateHomeTestimonials() {
    if (document.body.getAttribute('data-gdm-page') !== '/') return;
    var emptyEl = document.getElementById('home-testimonials-empty');
    if (!emptyEl) return;
    /* As 6 melhores avaliações aprovadas (classificação desc, depois mais
       recentes). O estado vazio honesto que já está no HTML fica como está
       enquanto carrega, sem configuração ou sem nenhuma avaliação — nunca
       com dados inventados. */
    if (!GDM.reviews.configurado()) return;
    var current = emptyEl;

    function cardFor(r) {
      var product = GDM.catalog.getById(r.produtoId);
      var card = document.createElement('div');
      card.className = 'testi-card';
      card.setAttribute('data-reveal', 'fade');
      var stars = GDM.components.starRow(r.classificacao);
      stars.setAttribute('role', 'img');
      stars.setAttribute('aria-label', r.classificacao + ' de 5 estrelas');
      card.appendChild(stars);
      var quote = document.createElement('p');
      quote.className = 'testi-card__quote';
      quote.textContent = '“' + r.texto + '”';
      card.appendChild(quote);
      var who = document.createElement('div');
      who.className = 'testi-card__who';
      var avatar = document.createElement('span');
      avatar.className = 'testi-avatar';
      avatar.setAttribute('aria-hidden', 'true');
      avatar.textContent = (r.autor || '?').trim().charAt(0).toUpperCase();
      who.appendChild(avatar);
      var stack = document.createElement('div');
      stack.className = 'stack';
      stack.style.gap = '2px';
      var strong = document.createElement('strong');
      strong.textContent = r.autor;
      var meta = document.createElement('span');
      meta.textContent = GDM.format.dateLabel(r.data) + (product ? ' · ' + product.name : '');
      stack.appendChild(strong);
      stack.appendChild(meta);
      who.appendChild(stack);
      card.appendChild(who);
      return card;
    }

    function load() {
      GDM.reviews.listar({ ordem: 'maior', limite: 6 }).then(function (r) {
        if (r.erro) {
          var err = GDM.pages && GDM.pages.reviews ? GDM.pages.reviews.errorBlock(function () { err.replaceWith(emptyEl); current = emptyEl; load(); }) : null;
          if (err) { current.replaceWith(err); current = err; }
          return;
        }
        if (!r.itens.length) return;
        var wrap = document.createElement('div');
        var grid = document.createElement('div');
        grid.className = 'testi-grid';
        r.itens.forEach(function (item) { grid.appendChild(cardFor(item)); });
        wrap.appendChild(grid);
        var moreWrap = document.createElement('div');
        moreWrap.style.textAlign = 'center';
        moreWrap.style.marginTop = '28px';
        var all = document.createElement('a');
        all.className = 'btn btn--outline';
        all.href = 'avaliacoes.html';
        all.textContent = 'Ver todas as avaliações';
        moreWrap.appendChild(all);
        wrap.appendChild(moreWrap);
        current.replaceWith(wrap);
        current = wrap;
        /* data-reveal = opacidade 0 até entrar no ecrã: observar os novos */
        if (GDM.components && GDM.components.initScrollReveal) GDM.components.initScrollReveal();
      });
    }
    load();
  }

  function hydrateReviewsPage() {
    if (document.body.getAttribute('data-gdm-page') !== '/avaliacoes') return;
    if (!GDM.pages || !GDM.pages.reviews) return;
    var app = document.getElementById('app');
    if (!app) return;
    GDM.pages.reviews.render(app);
  }

  function init(){
    mountGlobal();
    hydrateFavorites();
    hydrateAccordions();
    hydrateProductPage();
    hydrateShop();
    hydrateContactPage();
    hydrateFullCartPage();
    hydrateFavoritesPage();
    hydrateCheckoutPage();
    hydrateReviewsPage();
    hydrateHomeTestimonials();
    decorateCardRatings(document);
    rewriteLinks(document);
    if (GDM.components && GDM.components.initScrollReveal) GDM.components.initScrollReveal();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})(window.GDM = window.GDM || {});
