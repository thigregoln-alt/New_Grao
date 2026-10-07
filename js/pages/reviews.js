/* ==========================================================================
   Avaliações — vistas (cartão, resumo, estados), formulário e a página
   avaliacoes.html. Também carregado nas fichas de produto, que usam o
   resumo, os cartões e o formulário no separador "Avaliações".
   Os dados vêm de GDM.reviews (js/state/reviews.js). Todo o texto vindo da
   base de dados entra no DOM só por textContent / el() — são dados de
   visitantes, tratados como hostis.
   ========================================================================== */
(function (GDM) {
  'use strict';
  const { el } = GDM.security;
  GDM.pages = GDM.pages || {};

  const MAX_ENVIOS_SESSAO = 3;
  const TEMPO_MINIMO_MS = 4000;
  const CHAVE_ENVIOS = 'gdm:avaliacoes-enviadas';

  function numero(n) {
    return n.toLocaleString('pt-PT', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  }

  /* ---------------------------------------------------------------------
     Peças de UI (mesma linguagem visual que já existia)
     --------------------------------------------------------------------- */
  function reviewCard(r, opts) {
    opts = opts || {};
    const product = GDM.catalog.getById(r.produtoId);
    const children = [
      el('div', { class: 'review-card__head' }, [
        el('div', { class: 'review-card__author' }, [
          el('strong', { text: r.autor }),
          r.compraVerificada ? el('span', { class: 'badge badge--gold', text: 'Compra verificada' }) : null,
        ]),
        el('span', { style: 'color:var(--ink-500);font-size:var(--fs-xs)', text: GDM.format.dateLabel(r.data) }),
      ]),
      (function () { const s = GDM.components.starRow(r.classificacao); s.setAttribute('role', 'img'); s.setAttribute('aria-label', r.classificacao + ' de 5 estrelas'); return s; })(),
      r.titulo ? el('p', { style: 'font-weight:700', text: r.titulo }) : null,
      el('p', { style: 'color:var(--ink-700)', text: r.texto }),
    ];
    if (r.resposta) {
      children.push(el('div', { class: 'review-card__reply' }, [
        el('strong', { text: 'Resposta do ateliê' }),
        el('p', { text: r.resposta }),
      ]));
    }
    if (opts.mostrarProduto && product) {
      children.push(el('a', { href: 'produto-' + product.slug + '.html', style: 'font-size:var(--fs-xs);color:var(--gold-700);font-weight:700', text: 'Sobre: ' + product.name }));
    }
    return el('div', { class: 'review-card', 'data-reveal': 'fade' }, children);
  }

  /** Resumo (nota média + barras por estrelas). onEstrelas(n) torna as
   *  barras clicáveis (filtram a lista por número de estrelas). */
  function summaryBlock(resumo, onEstrelas, estrelasAtivas) {
    const total = resumo.contagem;
    const distRows = el('div', {}, [5, 4, 3, 2, 1].map(function (star) {
      const count = resumo.distribuicao[star] || 0;
      const pct = total ? Math.round((count / total) * 100) : 0;
      const cells = [
        el('span', { text: star + ' ★' }),
        el('div', { class: 'dist-bar' }, [el('div', { class: 'dist-bar__fill', style: 'width:' + pct + '%' })]),
        el('span', { text: String(count) }),
      ];
      if (!onEstrelas) return el('div', { class: 'dist-row' }, cells);
      const btn = el('button', {
        type: 'button', class: 'dist-row dist-row--btn',
        'aria-pressed': String(estrelasAtivas === star),
        'aria-label': 'Mostrar só avaliações de ' + star + (star === 1 ? ' estrela' : ' estrelas') + ' (' + count + ')',
      }, cells);
      btn.addEventListener('click', function () { onEstrelas(estrelasAtivas === star ? 0 : star); });
      return btn;
    }));
    return el('div', { class: 'panel reviews-summary' }, [
      el('div', { class: 'reviews-score stack', style: 'gap:6px;align-items:center' }, [
        el('p', { class: 'reviews-score__num', text: numero(resumo.media) }),
        (function () { const s = GDM.components.starRow(resumo.media); s.setAttribute('role', 'img'); s.setAttribute('aria-label', 'Média de ' + numero(resumo.media) + ' em 5 estrelas'); return s; })(),
        el('p', { style: 'color:var(--ink-500);font-size:var(--fs-xs)', text: total + (total === 1 ? ' avaliação' : ' avaliações') }),
      ]),
      distRows,
    ]);
  }

  /** Estado vazio / "a chegar em breve" (mesmo aspeto do estado vazio antigo). */
  function emptyBlock(titulo, texto) {
    const panel = el('div', { class: 'panel reviews-empty' });
    const icon = document.createElement('span');
    icon.innerHTML = GDM.icons.icon('sparkle');
    panel.appendChild(icon);
    panel.appendChild(el('h3', { text: titulo }));
    if (texto) panel.appendChild(el('p', { text: texto, style: 'color:var(--ink-500);max-width:48ch' }));
    return panel;
  }

  function comingSoonBlock() {
    return emptyBlock('As avaliações estão a chegar em breve', 'Estamos a preparar o espaço onde vai poder ler e deixar avaliações das nossas peças.');
  }

  /** Erro de rede/servidor com "Tentar novamente". */
  function errorBlock(onRetry) {
    const retry = el('button', { class: 'btn btn--outline btn--sm', type: 'button', text: 'Tentar novamente' });
    retry.addEventListener('click', onRetry);
    return el('div', { class: 'panel reviews-empty', role: 'status' }, [
      el('h3', { text: 'Não foi possível carregar as avaliações.' }),
      el('p', { style: 'color:var(--ink-500)', text: 'Verifique a ligação à internet e tente novamente.' }),
      retry,
    ]);
  }

  /** Esqueleto com a altura aproximada do conteúdo final (evita saltos). */
  function skeleton(tipo, n) {
    const wrap = el('div', { class: 'stack', style: 'gap:16px', 'aria-hidden': 'true' });
    for (let i = 0; i < (n || 1); i++) wrap.appendChild(el('div', { class: 'review-skeleton review-skeleton--' + tipo }));
    return wrap;
  }

  /* ---------------------------------------------------------------------
     Formulário
     --------------------------------------------------------------------- */
  function enviosNestaSessao() {
    try { return parseInt(window.sessionStorage.getItem(CHAVE_ENVIOS), 10) || 0; } catch (err) { return 0; }
  }
  function contarEnvio() {
    try { window.sessionStorage.setItem(CHAVE_ENVIOS, String(enviosNestaSessao() + 1)); } catch (err) { /* sem sessionStorage */ }
  }

  /** Estrelas como <input type="radio"> reais (as setas funcionam
   *  nativamente); começa sem nenhuma escolhida. */
  function starInput(errorId) {
    const group = el('div', { class: 'star-input' });
    let valor = 0;
    const labels = [];
    function pintar(ate) { labels.forEach(function (l, i) { l.setAttribute('data-active', String(i < ate)); }); }
    for (let i = 1; i <= 5; i++) {
      const input = el('input', { type: 'radio', name: 'rv-estrelas', id: 'rv-estrelas-' + i, value: String(i), 'aria-describedby': errorId });
      const label = el('label', { for: 'rv-estrelas-' + i, 'data-active': 'false' }, [el('span', { class: 'sr-only', text: i + (i === 1 ? ' estrela' : ' estrelas') })]);
      label.insertAdjacentHTML('afterbegin', GDM.icons.icon('star'));
      label.firstElementChild.setAttribute('aria-hidden', 'true');
      input.addEventListener('change', function () { valor = i; pintar(i); group.dispatchEvent(new Event('gdm:estrelas')); });
      label.addEventListener('mouseenter', function () { pintar(i); });
      label.addEventListener('mouseleave', function () { pintar(valor); });
      group.appendChild(input);
      group.appendChild(label);
      labels.push(label);
    }
    return {
      el: group,
      valor: function () { return valor; },
      limpar: function () { valor = 0; group.querySelectorAll('input').forEach(function (r) { r.checked = false; }); pintar(0); },
      focar: function () { group.querySelector('input').focus(); },
    };
  }

  /** Formulário de avaliação. opts.produtoSlug pré-seleciona o produto. */
  function buildForm(opts) {
    opts = opts || {};
    const abertoEm = Date.now();
    const configurado = GDM.reviews.configurado();

    const starsError = el('p', { class: 'field__error', id: 'rv-estrelas-error', 'aria-live': 'polite' });
    const stars = starInput('rv-estrelas-error');
    stars.el.addEventListener('gdm:estrelas', function () { starsError.textContent = ''; });
    const starsField = el('fieldset', { class: 'field rv-stars' }, [
      el('legend', { text: 'A sua classificação *' }),
      stars.el,
      starsError,
    ]);

    const defaultProduct = opts.produtoSlug ? GDM.catalog.getBySlug(opts.produtoSlug) : null;
    /* Seletor em dois passos: categoria (9 opções) e só depois o produto,
       já filtrado para essa categoria. */
    const categoryField = GDM.formHelpers.field({
      id: 'rv-category', label: 'Categoria', as: 'select', required: true,
      options: [{ value: '', label: 'Escolha uma categoria' }].concat(GDM.catalog.CATEGORIES.map(function (c) { return { value: c.slug, label: c.label }; })),
    });
    const productField = GDM.formHelpers.field({
      id: 'rv-product', label: 'Produto', as: 'select', required: true,
      options: [{ value: '', label: 'Escolha primeiro uma categoria' }],
    });
    function populateProducts(categorySlug, preselectSlug) {
      const input = productField.__gdmInput;
      input.innerHTML = '';
      if (!categorySlug) {
        input.appendChild(el('option', { value: '', text: 'Escolha primeiro uma categoria' }));
        input.disabled = true;
        return;
      }
      input.appendChild(el('option', { value: '', text: 'Escolha um produto' }));
      GDM.catalog.byCategory(categorySlug).forEach(function (p) { input.appendChild(el('option', { value: p.slug, text: p.name })); });
      input.disabled = false;
      if (preselectSlug) { input.value = preselectSlug; input.dispatchEvent(new Event('change', { bubbles: true })); }
    }
    categoryField.__gdmInput.addEventListener('change', function () { populateProducts(categoryField.__gdmInput.value); });
    function preselect() {
      if (defaultProduct) {
        categoryField.__gdmInput.value = defaultProduct.category;
        /* .value por código não dispara 'change' — o select personalizado
           (enhanceSelect) só repinta com o evento. */
        categoryField.__gdmInput.dispatchEvent(new Event('change', { bubbles: true }));
        populateProducts(defaultProduct.category, defaultProduct.slug);
      } else {
        populateProducts('');
      }
    }
    preselect();

    const authorField = GDM.formHelpers.field({
      id: 'rv-author', label: 'O seu nome', required: true, maxLength: 60, autocomplete: 'name',
      hint: 'O nome aparece publicamente com a avaliação; pode usar só o primeiro nome e a inicial.',
      validate: function (v) { return v.length < 2 ? 'Indique um nome com 2 a 60 caracteres.' : ''; },
    });
    const titleField = GDM.formHelpers.field({ id: 'rv-title', label: 'Título (opcional)', maxLength: 80, autocomplete: 'off' });
    const bodyField = GDM.formHelpers.field({
      id: 'rv-body', label: 'A sua experiência', as: 'textarea', required: true, maxLength: 600,
      validate: function (v) { return v.length < 10 ? 'Escreva pelo menos 10 caracteres.' : (v.length > 600 ? 'O texto pode ter no máximo 600 caracteres.' : ''); },
    });
    const counter = el('p', { class: 'field__hint rv-counter', id: 'rv-body-count', text: '0/600 caracteres' });
    bodyField.insertBefore(counter, bodyField.__gdmError);
    bodyField.__gdmInput.setAttribute('aria-describedby', 'rv-body-count rv-body-error');
    bodyField.__gdmInput.addEventListener('input', function () { counter.textContent = bodyField.__gdmInput.value.length + '/600 caracteres'; });

    const orderField = GDM.formHelpers.field({
      id: 'rv-order', label: 'Nº da encomenda (opcional)', maxLength: 11, placeholder: 'GM-XXXXXX', autocomplete: 'off',
      hint: 'Ajuda-nos a confirmar a compra e a mostrar o selo Compra verificada.',
      validate: function (v) { return v && !/^GM-[A-Z0-9]{4,8}$/.test(v.toUpperCase().replace(/\s+/g, '')) ? 'Use o formato GM-XXXXXX (o número que recebeu ao encomendar).' : ''; },
    });

    // armadilha para bots: campo invisível que uma pessoa nunca preenche
    const honeypot = el('div', { class: 'rv-hp', 'aria-hidden': 'true' }, [
      el('label', { for: 'rv-website', text: 'Não preencher' }),
      el('input', { type: 'text', id: 'rv-website', name: 'website', tabindex: '-1', autocomplete: 'off' }),
    ]);

    const consentId = 'rv-consent';
    const consentError = el('p', { class: 'field__error', id: consentId + '-error', 'aria-live': 'polite' });
    const consentBox = el('input', { type: 'checkbox', id: consentId, required: true, 'aria-describedby': consentId + '-error' });
    const consent = el('div', {}, [
      el('div', { class: 'checkbox-row' }, [
        consentBox,
        el('label', { for: consentId }, [
          'Li a ',
          el('a', { href: 'privacidade.html#avaliacoes', target: '_blank', rel: 'noopener', text: 'Política de Privacidade' }),
          ' e autorizo a publicação desta avaliação. *',
        ]),
      ]),
      consentError,
    ]);
    consentBox.addEventListener('change', function () { if (consentBox.checked) consentError.textContent = ''; });

    const fields = [categoryField, productField, authorField, titleField, bodyField, orderField];
    const validateAll = GDM.formHelpers.wireForm(fields);

    const submitBtn = el('button', { class: 'btn btn--primary', type: 'submit', text: 'Enviar avaliação' });
    const retryBtn = el('button', { class: 'btn btn--outline', type: 'button', text: 'Tentar novamente', hidden: true });
    const status = el('p', { class: 'newsletter-status', role: 'status' });

    const fieldset = el('fieldset', { class: 'rv-fieldset' }, [
      starsField,
      el('div', { class: 'form-row form-row--2' }, [categoryField, productField]),
      authorField, titleField, bodyField, orderField, honeypot, consent,
      el('div', { class: 'cluster', style: 'gap:12px' }, [submitBtn, retryBtn]),
    ]);
    const form = el('form', { novalidate: true, class: 'stack rv-form', style: 'gap:14px' }, [fieldset, status]);

    function mostrarEstado(texto, tipo) {
      status.textContent = texto;
      status.className = 'newsletter-status' + (tipo ? ' newsletter-status--' + tipo : '');
    }

    if (!configurado) {
      fieldset.disabled = true;
      mostrarEstado('As avaliações estão a chegar em breve — o formulário ainda não está ativo.');
      return form;
    }

    let aEnviar = false;
    function enviar() {
      if (aEnviar) return; // proteção contra duplo clique
      // armadilha preenchida: finge sucesso e não envia nada
      if (form.querySelector('#rv-website').value) { sucesso(); return; }
      if (Date.now() - abertoEm < TEMPO_MINIMO_MS) {
        mostrarEstado('Aguarde só uns segundos antes de enviar, por favor.', 'error');
        return;
      }
      if (enviosNestaSessao() >= MAX_ENVIOS_SESSAO) {
        mostrarEstado('Já enviou ' + MAX_ENVIOS_SESSAO + ' avaliações nesta visita — obrigado! Para enviar mais, volte mais tarde.', 'error');
        return;
      }
      const product = GDM.catalog.getBySlug(productField.__gdmInput.value);
      aEnviar = true;
      submitBtn.disabled = true;
      retryBtn.hidden = true;
      submitBtn.textContent = 'A enviar…';
      mostrarEstado('');
      GDM.reviews.enviar({
        produtoId: product ? product.id : '',
        autor: authorField.__gdmInput.value,
        classificacao: stars.valor(),
        titulo: titleField.__gdmInput.value,
        texto: bodyField.__gdmInput.value,
        referenciaEncomenda: orderField.__gdmInput.value,
      }).then(function (r) {
        aEnviar = false;
        submitBtn.disabled = false;
        submitBtn.textContent = 'Enviar avaliação';
        if (r.ok) { contarEnvio(); sucesso(); return; }
        if (r.erros) { mostrarEstado(Object.keys(r.erros).map(function (k) { return r.erros[k]; }).join(' '), 'error'); return; }
        // erro de rede/servidor: os dados ficam no formulário
        mostrarEstado(r.erro, 'error');
        retryBtn.hidden = false;
      });
    }

    function sucesso() {
      mostrarEstado('Obrigado! A sua avaliação foi recebida e fica visível depois de ser revista pelo ateliê (normalmente em 1–2 dias úteis).', 'ok');
      form.reset();
      stars.limpar();
      counter.textContent = '0/600 caracteres';
      preselect();
      retryBtn.hidden = true;
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      const starsOk = stars.valor() >= 1;
      starsError.textContent = starsOk ? '' : 'Escolha uma classificação de 1 a 5 estrelas.';
      const fieldsOk = validateAll();
      const consentOk = consentBox.checked;
      consentError.textContent = consentOk ? '' : 'É necessário autorizar a publicação para enviar.';
      if (!starsOk) { stars.focar(); }
      else if (fieldsOk && !consentOk) { consentBox.focus(); }
      if (!starsOk || !fieldsOk || !consentOk) {
        mostrarEstado('Reveja os campos assinalados.', 'error');
        return;
      }
      enviar();
    });
    retryBtn.addEventListener('click', enviar);
    return form;
  }

  /* ---------------------------------------------------------------------
     Página avaliacoes.html
     --------------------------------------------------------------------- */
  function lerFiltros() {
    const q = new URLSearchParams(window.location.search);
    const produto = GDM.security.sanitizeSlug(q.get('produto') || '');
    const categoria = GDM.security.sanitizeSlug(q.get('categoria') || '');
    const estrelas = parseInt(q.get('estrelas'), 10);
    const ordem = q.get('ordem');
    const p = GDM.catalog.getBySlug(produto);
    return {
      produto: p ? p.slug : '',
      categoria: p ? p.category : (GDM.catalog.CATEGORIES.some(function (c) { return c.slug === categoria; }) ? categoria : ''),
      estrelas: estrelas >= 1 && estrelas <= 5 ? estrelas : 0,
      ordem: GDM.reviews.ORDENS.indexOf(ordem) !== -1 ? ordem : 'recentes',
    };
  }

  function escreverFiltros(f) {
    const q = new URLSearchParams();
    if (f.produto) q.set('produto', f.produto);
    else if (f.categoria) q.set('categoria', f.categoria);
    if (f.estrelas) q.set('estrelas', String(f.estrelas));
    if (f.ordem !== 'recentes') q.set('ordem', f.ordem);
    window.history.replaceState({}, '', window.location.pathname + (q.toString() ? '?' + q.toString() : ''));
  }

  function selectField(id, label, options, value) {
    const select = el('select', { id: id }, options.map(function (o) { return el('option', { value: o.value, text: o.label }); }));
    select.value = value;
    return { select: select, el: el('div', { class: 'field', style: 'min-width:200px' }, [el('label', { for: id + '-toggle', class: 'sr-only', text: label }), GDM.components.enhanceSelect(select)]) };
  }

  function render(container) {
    container.innerHTML = '';
    container.appendChild(GDM.components.pageHero({ eyebrow: 'Prova social', title: 'Avaliações', lede: 'O que quem já comprou tem a dizer sobre as nossas peças.' }));

    const section = el('section', { class: 'section section--tight' });
    const inner = el('div', { class: 'container' });
    section.appendChild(inner);
    container.appendChild(section);

    const filtros = lerFiltros();
    const configurado = GDM.reviews.configurado();

    const summaryHost = el('div', { id: 'reviews-summary-host' });
    const listHost = el('div', { class: 'stack', style: 'gap:16px;margin-top:20px' });
    const countLine = el('p', { class: 'shop-results-count', role: 'status', style: 'margin-top:20px' });
    const moreBtn = el('button', { class: 'btn btn--outline', type: 'button', text: 'Carregar mais avaliações', hidden: true });
    const moreWrap = el('div', { style: 'text-align:center;margin-top:24px' }, [moreBtn]);

    const catSel = selectField('reviews-filter-category', 'Categoria', [{ value: '', label: 'Todas as categorias' }].concat(GDM.catalog.CATEGORIES.map(function (c) { return { value: c.slug, label: c.label }; })), filtros.categoria);
    const prodSel = selectField('reviews-filter-product', 'Produto', [{ value: '', label: 'Todos os produtos' }], '');
    const starSel = selectField('reviews-filter-stars', 'Estrelas', [{ value: '0', label: 'Todas as estrelas' }].concat([5, 4, 3, 2, 1].map(function (n) { return { value: String(n), label: n + (n === 1 ? ' estrela' : ' estrelas') }; })), String(filtros.estrelas));
    const ordSel = selectField('reviews-filter-sort', 'Ordenar', [{ value: 'recentes', label: 'Mais recentes' }, { value: 'maior', label: 'Maior classificação' }, { value: 'menor', label: 'Menor classificação' }], filtros.ordem);

    function produtosDaCategoria(cat) {
      const s = prodSel.select;
      s.innerHTML = '';
      s.appendChild(el('option', { value: '', text: cat ? 'Todos os produtos da categoria' : 'Escolha primeiro uma categoria' }));
      if (cat) GDM.catalog.byCategory(cat).forEach(function (p) { s.appendChild(el('option', { value: p.slug, text: p.name })); });
      s.disabled = !cat;
    }
    produtosDaCategoria(filtros.categoria);
    prodSel.select.value = filtros.produto;
    prodSel.select.dispatchEvent(new Event('change'));

    const filterRow = el('div', { class: 'cluster', style: 'gap:12px;margin-top:24px' }, [catSel.el, prodSel.el, starSel.el, ordSel.el]);

    const formHost = el('div', { class: 'panel', style: 'margin-top:32px', id: 'deixar-avaliacao' }, [
      el('h2', { text: 'Deixe a sua avaliação', style: 'font-size:1.2rem;margin-bottom:16px' }),
      buildForm({ produtoSlug: filtros.produto }),
    ]);

    inner.appendChild(summaryHost);
    inner.appendChild(filterRow);
    inner.appendChild(countLine);
    inner.appendChild(listHost);
    inner.appendChild(moreWrap);
    inner.appendChild(formHost);

    if (!configurado) {
      summaryHost.appendChild(comingSoonBlock());
      filterRow.hidden = true;
      return;
    }

    let pagina = 0;
    let pedidoAtual = 0;

    function idsFiltrados() {
      if (filtros.produto) return { produtoId: GDM.catalog.getBySlug(filtros.produto).id };
      if (filtros.categoria) return { produtoIds: GDM.catalog.byCategory(filtros.categoria).map(function (p) { return p.id; }) };
      return {};
    }

    function desenharResumo() {
      summaryHost.innerHTML = '';
      summaryHost.appendChild(skeleton('summary'));
      GDM.reviews.resumoTodos().then(function (r) {
        summaryHost.innerHTML = '';
        if (r.erro) { summaryHost.appendChild(errorBlock(function () { desenharResumo(); carregar(true); })); return; }
        let resumo = r.geral;
        const ids = idsFiltrados();
        const lista = ids.produtoId ? [ids.produtoId] : ids.produtoIds;
        if (lista) {
          resumo = { media: 0, contagem: 0, distribuicao: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } };
          let pontos = 0;
          lista.forEach(function (id) {
            const s = r.porProduto[id];
            if (!s) return;
            resumo.contagem += s.contagem;
            pontos += s.media * s.contagem;
            for (let n = 1; n <= 5; n++) resumo.distribuicao[n] += s.distribuicao[n];
          });
          resumo.media = resumo.contagem ? pontos / resumo.contagem : 0;
        }
        if (!resumo.contagem) {
          summaryHost.appendChild(lista
            ? emptyBlock('Ainda sem avaliações para esta escolha', 'Seja a primeira pessoa a avaliar — o formulário está aqui em baixo.')
            : emptyBlock('Ainda não temos avaliações públicas', 'O site acabou de nascer — seja a primeira pessoa a partilhar a sua experiência com o ateliê, aqui em baixo.'));
          return;
        }
        summaryHost.appendChild(summaryBlock(resumo, function (n) {
          filtros.estrelas = n;
          starSel.select.value = String(n);
          starSel.select.dispatchEvent(new Event('change'));
        }, filtros.estrelas));
      });
    }

    /* reiniciar = nova pesquisa (página 0); senão, "Carregar mais". */
    function carregar(reiniciar) {
      if (reiniciar) { pagina = 0; listHost.innerHTML = ''; listHost.appendChild(skeleton('card', 3)); countLine.textContent = ''; }
      moreBtn.disabled = true;
      const meu = ++pedidoAtual;
      GDM.reviews.listar(Object.assign({ ordem: filtros.ordem, pagina: pagina, estrelas: filtros.estrelas }, idsFiltrados())).then(function (r) {
        if (meu !== pedidoAtual) return; // chegou depois de outro filtro: ignora
        moreBtn.disabled = false;
        if (reiniciar) listHost.innerHTML = '';
        if (r.erro) {
          if (reiniciar) listHost.appendChild(errorBlock(function () { carregar(true); }));
          else GDM.components.toast.show('Não foi possível carregar mais avaliações. Tente novamente.', 'error');
          moreBtn.hidden = reiniciar;
          return;
        }
        r.itens.forEach(function (item) { listHost.appendChild(reviewCard(item, { mostrarProduto: !filtros.produto })); });
        const mostradas = listHost.querySelectorAll('.review-card').length;
        if (!r.total) {
          if (filtros.estrelas || filtros.produto || filtros.categoria) listHost.appendChild(el('p', { text: 'Sem avaliações para este filtro.', style: 'color:var(--ink-500)' }));
          countLine.textContent = '';
        } else {
          countLine.textContent = 'A mostrar ' + mostradas + ' de ' + r.total + (r.total === 1 ? ' avaliação' : ' avaliações');
        }
        moreBtn.hidden = (pagina + 1) * (GDM.reviewsConfig.porPagina || 8) >= r.total;
        /* Os cartões novos trazem data-reveal (opacidade 0 até entrarem no
           ecrã) — sem isto ficavam invisíveis depois de filtrar. */
        GDM.components.initScrollReveal();
      });
    }

    function aplicar() {
      escreverFiltros(filtros);
      desenharResumo();
      carregar(true);
    }

    catSel.select.addEventListener('change', function () {
      filtros.categoria = catSel.select.value;
      filtros.produto = '';
      produtosDaCategoria(filtros.categoria);
      aplicar();
    });
    prodSel.select.addEventListener('change', function () {
      filtros.produto = prodSel.select.value;
      aplicar();
    });
    starSel.select.addEventListener('change', function () { filtros.estrelas = parseInt(starSel.select.value, 10) || 0; aplicar(); });
    ordSel.select.addEventListener('change', function () { filtros.ordem = ordSel.select.value; escreverFiltros(filtros); carregar(true); });
    moreBtn.addEventListener('click', function () { pagina++; carregar(false); });

    desenharResumo();
    carregar(true);
  }

  GDM.pages.reviews = {
    render: render,
    buildForm: buildForm,
    reviewCard: reviewCard,
    summaryBlock: summaryBlock,
    emptyBlock: emptyBlock,
    comingSoonBlock: comingSoonBlock,
    errorBlock: errorBlock,
    skeleton: skeleton,
  };
})(window.GDM = window.GDM || {});
