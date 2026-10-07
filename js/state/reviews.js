/* ==========================================================================
   Avaliações — guardadas no Supabase (base de dados partilhada, região UE),
   lidas e enviadas com fetch() direto à API REST, sem SDK. Ver
   docs/AVALIACOES.md e tools/supabase-avaliacoes.sql.

   Segurança: a chave pública só permite ler avaliações APROVADAS (colunas
   públicas) e criar avaliações PENDENTES — quem aprova é o ateliê, no
   painel do Supabase. Mesmo assim, tudo o que vem da base de dados é texto
   de visitantes: é validado aqui e só entra no DOM por textContent / el().

   Todas as funções devolvem Promises que nunca rejeitam: em caso de
   problema resolvem para { erro: 'mensagem em português' } (com
   semConfiguracao: true se reviewsConfig.js estiver por preencher).
   ========================================================================== */
(function (GDM) {
  'use strict';

  const TIMEOUT_MS = 8000;
  const CACHE_MS = 5 * 60 * 1000;
  const CACHE_PREFIX = 'gdm:avaliacoes-cache:';
  const COLUNAS = 'id,criada_em,produto_id,autor,classificacao,titulo,texto,compra_verificada,resposta_atelier';
  const ORDENS = {
    recentes: 'criada_em.desc',
    maior: 'classificacao.desc,criada_em.desc',
    menor: 'classificacao.asc,criada_em.desc',
  };
  const MSG = {
    semConfiguracao: 'As avaliações estão a chegar em breve.',
    rede: 'Não foi possível ligar ao serviço de avaliações. Verifique a ligação à internet e tente novamente.',
    timeout: 'O serviço de avaliações demorou demasiado a responder. Tente novamente daqui a pouco.',
    recusado: 'O serviço de avaliações recusou o pedido.',
    dados: 'Não foi possível guardar a avaliação — reveja os dados e tente novamente.',
    servidor: 'O serviço de avaliações está com problemas. Tente novamente mais tarde.',
  };

  /* Limpeza única do sistema antigo (avaliações só no localStorage de quem
     as escrevia — nunca foram vistas por mais ninguém). */
  GDM.storage.remove('user_reviews');

  const memoria = {};
  let avisouConfig = false;

  function config() {
    const c = GDM.reviewsConfig || {};
    return {
      url: String(c.url || '').trim().replace(/\/+$/, ''),
      chave: String(c.anonKey || '').trim(),
      porPagina: Number.isInteger(c.porPagina) && c.porPagina > 0 ? c.porPagina : 8,
    };
  }

  function configurado() {
    const c = config();
    const ok = /^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(c.url) && !!c.chave;
    if (!ok && !avisouConfig) {
      avisouConfig = true;
      console.warn('[avaliações] js/data/reviewsConfig.js por preencher (url e anonKey do Supabase) — as avaliações ficam desativadas e o site mostra "a chegar em breve". Ver docs/AVALIACOES.md.');
    }
    return ok;
  }

  function semConfiguracao() {
    return Promise.resolve({ erro: MSG.semConfiguracao, semConfiguracao: true });
  }

  function cabecalhos(extra) {
    const chave = config().chave;
    const h = { apikey: chave };
    // as chaves novas (sb_publishable_…) não são JWT: vão só no cabeçalho apikey;
    // a chave "anon" antiga (JWT) vai também como Bearer
    if (!/^sb_publishable_/.test(chave)) h.Authorization = 'Bearer ' + chave;
    return Object.assign(h, extra || {});
  }

  /* Pedido à API com timeout. Resolve para { resposta } ou { erro }. */
  function pedido(caminho, opcoes) {
    opcoes = opcoes || {};
    const controlo = new AbortController();
    const relogio = setTimeout(function () { controlo.abort(); }, TIMEOUT_MS);
    return fetch(config().url + '/rest/v1/' + caminho, {
      method: opcoes.metodo || 'GET',
      headers: cabecalhos(opcoes.cabecalhos),
      body: opcoes.corpo,
      signal: controlo.signal,
      credentials: 'omit',
    }).then(function (resposta) {
      clearTimeout(relogio);
      if (resposta.ok) return { resposta: resposta };
      if (resposta.status === 401 || resposta.status === 403) return { erro: MSG.recusado };
      if (resposta.status >= 400 && resposta.status < 500) return { erro: MSG.dados };
      return { erro: MSG.servidor };
    }, function (falha) {
      clearTimeout(relogio);
      return { erro: falha && falha.name === 'AbortError' ? MSG.timeout : MSG.rede };
    });
  }

  /* ---- cache de leituras: memória + sessionStorage, 5 minutos ---- */
  function lerCache(chave) {
    const agora = Date.now();
    if (memoria[chave] && agora - memoria[chave].t < CACHE_MS) return memoria[chave].v;
    try {
      const bruto = window.sessionStorage.getItem(CACHE_PREFIX + chave);
      if (!bruto) return null;
      const guardado = JSON.parse(bruto);
      if (!guardado || typeof guardado.t !== 'number' || agora - guardado.t >= CACHE_MS || !guardado.v || typeof guardado.v !== 'object') return null;
      memoria[chave] = guardado;
      return guardado.v;
    } catch (err) {
      return null;
    }
  }
  function guardarCache(chave, valor) {
    const registo = { t: Date.now(), v: valor };
    memoria[chave] = registo;
    try { window.sessionStorage.setItem(CACHE_PREFIX + chave, JSON.stringify(registo)); } catch (err) { /* sessionStorage indisponível */ }
  }

  /* ---- validação do que vem da base de dados (dados hostis por princípio) ---- */
  function normalizar(linha) {
    if (!linha || typeof linha !== 'object') return null;
    if (typeof linha.id !== 'string' || typeof linha.produto_id !== 'string') return null;
    const produto = GDM.catalog.getById(linha.produto_id);
    if (!produto) return null; // produto que já não existe no catálogo
    const nota = Number(linha.classificacao);
    if (!Number.isInteger(nota) || nota < 1 || nota > 5) return null;
    if (typeof linha.autor !== 'string' || typeof linha.texto !== 'string' || typeof linha.criada_em !== 'string') return null;
    return {
      id: linha.id,
      data: linha.criada_em,
      produtoId: produto.id,
      autor: linha.autor.slice(0, 60),
      classificacao: nota,
      titulo: typeof linha.titulo === 'string' ? linha.titulo.slice(0, 80) : '',
      texto: linha.texto.slice(0, 600),
      compraVerificada: linha.compra_verificada === true,
      resposta: typeof linha.resposta_atelier === 'string' ? linha.resposta_atelier.slice(0, 600) : '',
    };
  }

  function produtoValido(id) {
    return typeof id === 'string' && /^[a-z0-9]{2,5}-[0-9]{2}$/.test(id) && !!GDM.catalog.getById(id);
  }

  /** Lista paginada de avaliações aprovadas.
   *  opcoes: { produtoId, ordem: 'recentes'|'maior'|'menor', pagina (0…), estrelas (1–5) }
   *  -> { itens, total } */
  function listar(opcoes) {
    if (!configurado()) return semConfiguracao();
    opcoes = opcoes || {};
    const porPagina = config().porPagina;
    const pagina = Number.isInteger(opcoes.pagina) && opcoes.pagina > 0 ? opcoes.pagina : 0;
    const params = new URLSearchParams();
    params.set('select', COLUNAS);
    params.set('order', ORDENS[opcoes.ordem] || ORDENS.recentes);
    if (produtoValido(opcoes.produtoId)) params.set('produto_id', 'eq.' + opcoes.produtoId);
    if (Number.isInteger(opcoes.estrelas) && opcoes.estrelas >= 1 && opcoes.estrelas <= 5) params.set('classificacao', 'eq.' + opcoes.estrelas);
    params.set('limit', String(porPagina));
    params.set('offset', String(pagina * porPagina));
    const caminho = 'avaliacoes?' + params.toString();
    const emCache = lerCache(caminho);
    if (emCache && Array.isArray(emCache.itens) && typeof emCache.total === 'number') return Promise.resolve(emCache);

    return pedido(caminho, { cabecalhos: { Prefer: 'count=exact' } }).then(function (r) {
      if (r.erro) return r;
      const intervalo = r.resposta.headers.get('Content-Range') || '';
      return r.resposta.json().then(function (linhas) {
        if (!Array.isArray(linhas)) return { erro: MSG.servidor };
        const itens = linhas.map(normalizar).filter(Boolean);
        const total = parseInt(intervalo.split('/')[1], 10);
        const resultado = { itens: itens, total: Number.isFinite(total) ? total : itens.length };
        guardarCache(caminho, resultado);
        return resultado;
      }, function () { return { erro: MSG.servidor }; });
    });
  }

  function resumoVazio() {
    return { media: 0, contagem: 0, distribuicao: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } };
  }

  /** Resumo de todos os produtos num só pedido (vista resumo_avaliacoes):
   *  -> { porProduto: { <id>: { media, contagem, distribuicao } }, geral: {…} } */
  function resumoTodos() {
    if (!configurado()) return semConfiguracao();
    const caminho = 'resumo_avaliacoes?select=produto_id,contagem,media,estrelas_1,estrelas_2,estrelas_3,estrelas_4,estrelas_5';
    const emCache = lerCache(caminho);
    if (emCache && emCache.porProduto && emCache.geral) return Promise.resolve(emCache);

    return pedido(caminho).then(function (r) {
      if (r.erro) return r;
      return r.resposta.json().then(function (linhas) {
        if (!Array.isArray(linhas)) return { erro: MSG.servidor };
        const porProduto = {};
        const geral = resumoVazio();
        let soma = 0;
        linhas.forEach(function (l) {
          if (!l || !produtoValido(l.produto_id)) return;
          const dist = {};
          let contagem = 0, pontos = 0;
          for (let n = 1; n <= 5; n++) {
            const c = Number.isInteger(l['estrelas_' + n]) && l['estrelas_' + n] >= 0 ? l['estrelas_' + n] : 0;
            dist[n] = c; contagem += c; pontos += c * n;
            geral.distribuicao[n] += c;
          }
          if (!contagem) return;
          porProduto[l.produto_id] = { media: pontos / contagem, contagem: contagem, distribuicao: dist };
          geral.contagem += contagem;
          soma += pontos;
        });
        geral.media = geral.contagem ? soma / geral.contagem : 0;
        const resultado = { porProduto: porProduto, geral: geral };
        guardarCache(caminho, resultado);
        return resultado;
      }, function () { return { erro: MSG.servidor }; });
    });
  }

  /** Resumo de um produto -> { media, contagem, distribuicao } */
  function resumo(produtoId) {
    return resumoTodos().then(function (r) {
      if (r.erro) return r;
      return r.porProduto[produtoId] || resumoVazio();
    });
  }

  /** Valida os dados do formulário com as mesmas regras da base de dados.
   *  -> { dados } (já limpos) ou { erros: { campo: mensagem } } */
  function validar(entrada) {
    entrada = entrada || {};
    const erros = {};
    const autor = GDM.security.sanitizeInput(entrada.autor, 200);
    const titulo = GDM.security.sanitizeInput(entrada.titulo, 200);
    const texto = GDM.security.sanitizeInput(entrada.texto, 2000);
    const referencia = GDM.security.sanitizeInput(entrada.referenciaEncomenda, 40).toUpperCase().replace(/\s+/g, '');
    const nota = Number(entrada.classificacao);
    if (!Number.isInteger(nota) || nota < 1 || nota > 5) erros.classificacao = 'Escolha uma classificação de 1 a 5 estrelas.';
    if (!produtoValido(entrada.produtoId)) erros.produtoId = 'Escolha o produto que quer avaliar.';
    if (autor.length < 2 || autor.length > 60) erros.autor = 'Indique um nome com 2 a 60 caracteres.';
    if (titulo.length > 80) erros.titulo = 'O título pode ter no máximo 80 caracteres.';
    if (texto.length < 10 || texto.length > 600) erros.texto = 'Escreva entre 10 e 600 caracteres.';
    if (referencia && !/^GM-[A-Z0-9]{4,8}$/.test(referencia)) erros.referenciaEncomenda = 'Use o formato GM-XXXXXX (o número que recebeu ao encomendar).';
    if (Object.keys(erros).length) return { erros: erros };
    return {
      dados: {
        produto_id: entrada.produtoId,
        autor: autor,
        classificacao: nota,
        titulo: titulo || null,
        texto: texto,
        referencia_encomenda: referencia || null,
      },
    };
  }

  /** Envia uma avaliação (fica PENDENTE até o ateliê a aprovar).
   *  -> { ok: true } | { erros } | { erro } */
  function enviar(entrada) {
    const v = validar(entrada);
    if (v.erros) return Promise.resolve({ erros: v.erros });
    if (!configurado()) return semConfiguracao();
    return pedido('avaliacoes', {
      metodo: 'POST',
      // return=minimal: o público não pode ler a linha acabada de criar (estado, nº de encomenda)
      cabecalhos: { 'Content-Type': 'application/json', Prefer: 'return=minimal' },
      corpo: JSON.stringify(v.dados),
    }).then(function (r) { return r.erro ? r : { ok: true }; });
  }

  GDM.reviews = { configurado: configurado, listar: listar, resumo: resumo, resumoTodos: resumoTodos, validar: validar, enviar: enviar, ORDENS: Object.keys(ORDENS) };
})(window.GDM = window.GDM || {});
