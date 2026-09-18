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
      btn.addEventListener('click', function (e) {
        e.preventDefault(); e.stopPropagation();
        var pressed = GDM.favorites.toggle(product.id).indexOf(product.id) !== -1;
        btn.setAttribute('aria-pressed', String(pressed));
        btn.setAttribute('aria-label', pressed ? 'Remover dos favoritos' : 'Adicionar aos favoritos');
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
    var fav = Array.prototype.find.call(document.querySelectorAll('.product-info .btn'), function(b){ return b.textContent.indexOf('Guardar nos favoritos')!==-1 || b.textContent.indexOf('Remover dos favoritos')!==-1; });
    if (fav && !fav.dataset.gdmHydrated) {
      fav.addEventListener('click',function(){ var pressed=GDM.favorites.toggle(product.id).indexOf(product.id)!==-1; fav.textContent=pressed?'Remover dos favoritos':'Guardar nos favoritos'; if(GDM.components.toast) GDM.components.toast.show(pressed?'Adicionado aos favoritos.':'Removido dos favoritos.','info'); });
      fav.dataset.gdmHydrated='1';
    }
    function renderProductReviews(){
      var wrap = document.createElement('div');
      wrap.className = 'stack';
      wrap.style.gap = '14px';
      var list = GDM.reviews.forProduct(product.id);
      var summary = GDM.reviews.summaryFor(product.id);
      if (summary.count) {
        var rating = document.createElement('div');
        rating.className = 'rating';
        rating.appendChild(GDM.components.starRow(summary.avg));
        var count = document.createElement('span');
        count.textContent = summary.avg.toFixed(1) + ' (' + summary.count + ')';
        rating.appendChild(count);
        wrap.appendChild(rating);
      }
      if (!list.length) {
        var empty = document.createElement('p');
        empty.style.color = 'var(--ink-500)';
        empty.textContent = 'Ainda sem avaliações escritas para este produto.';
        wrap.appendChild(empty);
      } else {
        list.slice(0,3).forEach(function(r){
          var card = document.createElement('div');
          card.className = 'review-card';
          var head = document.createElement('div');
          head.className = 'review-card__head';
          var author = document.createElement('div');
          author.className = 'review-card__author';
          var strong = document.createElement('strong');
          strong.textContent = r.author;
          author.appendChild(strong);
          var badge = document.createElement('span');
          badge.className = r.verified ? 'badge badge--gold' : 'badge badge--outline';
          badge.textContent = r.verified ? 'Compra verificada' : 'Não verificada';
          author.appendChild(badge);
          head.appendChild(author);
          var date = document.createElement('span');
          date.style.color = 'var(--ink-500)';
          date.style.fontSize = 'var(--fs-xs)';
          date.textContent = GDM.format.dateLabel(r.date);
          head.appendChild(date);
          card.appendChild(head);
          card.appendChild(GDM.components.starRow(r.rating));
          var title = document.createElement('p');
          title.style.fontWeight = '700';
          title.textContent = r.title;
          card.appendChild(title);
          var body = document.createElement('p');
          body.style.color = 'var(--ink-700)';
          body.textContent = r.body;
          card.appendChild(body);
          wrap.appendChild(card);
        });
      }
      var all = document.createElement('a');
      all.className = 'btn btn--outline btn--sm';
      all.href = 'avaliacoes.html?produto=' + encodeURIComponent(product.slug);
      all.textContent = 'Ver todas as avaliações';
      wrap.appendChild(all);
      return wrap;
    }

    document.querySelectorAll('.detail-tabs__nav button').forEach(function(btn, idx, arr){
      if(btn.dataset.gdmHydrated) return;
      btn.dataset.gdmHydrated='1';
      btn.addEventListener('click',function(){
        arr.forEach(function(b,i){b.setAttribute('aria-selected',String(i===idx))});
        var panel=document.querySelector('.detail-tabs__panel');
        if(!panel)return;
        if(idx===0){
          panel.innerHTML='';
          var p=document.createElement('p');
          p.textContent=product.long;
          panel.appendChild(p);
        } else if(idx===1){
          panel.innerHTML='<div class="stack" style="gap:8px"><p>Produção em 3 a 7 dias úteis. Envio pelos CTT, com portes grátis acima de €50.</p><p><a href="envios.html">Ver prazos de envio completos</a></p><p><a href="trocas.html">Ver política de trocas e devoluções</a></p></div>';
        } else if(idx===2){
          panel.innerHTML='';
          panel.appendChild(renderProductReviews());
        }
      });
    });
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
        if(ord==='avaliacao') return GDM.reviews.summaryFor(b.id).avg-GDM.reviews.summaryFor(a.id).avg;
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

      Object.keys(sortLabels).forEach(function(key){
        var option = document.createElement('button');
        option.type='button';
        option.className='shop-sort-option';
        option.setAttribute('role','option');
        option.setAttribute('data-sort-value', key);
        option.innerHTML='<span class="shop-sort-option__mark" aria-hidden="true"></span><span class="shop-sort-option__text"></span>';
        option.querySelector('.shop-sort-option__text').textContent=sortLabels[key];
        option.addEventListener('click',function(e){
          e.preventDefault();
          e.stopPropagation();
          closeSort();
          writeState({ordenar:key});
        });
        menu.appendChild(option);
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

    window.addEventListener('popstate', apply);
    apply();
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
    if (app) GDM.pages.favorites.render(app);
  }

  function hydrateCheckoutPage() {
    if (document.body.getAttribute('data-gdm-page') !== '/checkout') return;
    if (!GDM.pages || !GDM.pages.checkout) return;
    var app = document.getElementById('app');
    if (app) GDM.pages.checkout.render(app);
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
    rewriteLinks(document);
    if (GDM.components && GDM.components.initScrollReveal) GDM.components.initScrollReveal();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})(window.GDM = window.GDM || {});
