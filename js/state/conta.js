/* ==========================================================================
   Contas de cliente (opcionais) — sessão, entrada, sincronização.
   Fala com o Supabase (o mesmo projeto das avaliações) com fetch() direto
   à API, sem SDK — como js/state/reviews.js. Assim quem não tem conta não
   descarrega nada a mais e não há código de terceiros no site.
   Ver docs/CONTAS.md e tools/supabase-contas.sql.

   Desligado (GDM.contaConfig.ativa = false) ou sem Supabase configurado:
   nada aqui faz pedidos e o site fica exatamente como sem contas.

   Entrada:
   - por e-mail com código (sem passwords): pedirCodigo -> confirmarCodigo;
   - Google / Facebook com PKCE: entrarCom -> o Supabase volta a conta.html
     com ?code=… -> concluirRetorno troca o código pela sessão.

   Sessão: guardada em localStorage (gdm:sessao), como faz o SDK oficial.
   O token de acesso dura 1 hora e é renovado sozinho com o refresh token.

   Segurança: tudo o que vem da API é validado aqui; o preço e o stock vêm
   sempre do catálogo (GDM.catalog); a proteção dos dados está no RLS da
   base de dados — a chave pública sozinha não lê nada das contas.

   Todas as funções que falam com a API devolvem Promises que nunca
   rejeitam: resolvem para { ok / dados } ou { erro: 'mensagem' }.
   ========================================================================== */
(function (GDM) {
  'use strict';

  const TIMEOUT_MS = 10000;
  const TESTE_URL = 'http://127.0.0.1:54321';
  const TESTE_CHAVE = 'sb_publishable_teste'; // a mesma de tools/mock-supabase.js
  const CHAVE_SESSAO = 'sessao';        // gdm:sessao
  const CHAVE_SYNC = 'conta_sync';      // gdm:conta_sync — { pendente, puxado }
  const CHAVE_PKCE = 'gdm:pkce';        // sessionStorage, só durante a ida ao Google/Facebook
  const PUXAR_CADA_MS = 60 * 1000;      // no máximo 1 leitura por minuto ao navegar
  const ATRASO_GUARDAR_MS = 1500;       // junta vários cliques num só pedido
  const FORNECEDORES = ['google', 'facebook'];

  const MSG = {
    rede: 'Não foi possível ligar. Verifique a ligação à internet e tente novamente.',
    timeout: 'O serviço demorou demasiado a responder. Tente novamente daqui a pouco.',
    servidor: 'O serviço de contas está com problemas. Tente novamente mais tarde.',
    sessao: 'A sua sessão terminou. Entre novamente.',
    email: 'Esse e-mail não parece válido.',
    codigo: 'O código está errado ou já expirou. Confira-o ou peça um código novo.',
    codigoFormato: 'Escreva o código de 6 dígitos que recebeu por e-mail.',
    esperar: 'Já enviámos um código há pouco. Espere um minuto antes de pedir outro.',
    demasiados: 'Demasiadas tentativas. Espere alguns minutos e tente novamente.',
    emailNaoAutorizado: 'De momento não conseguimos enviar o código para este e-mail. Fale connosco pelo WhatsApp.',
    registoDesligado: 'A criação de contas está desligada de momento.',
    retorno: 'Não foi possível concluir a entrada. Tente novamente.',
    retornoExpirado: 'A entrada demorou demasiado ou foi aberta noutro navegador. Tente novamente.',
    cancelado: 'A entrada foi cancelada.',
    encomendas: 'Demasiadas encomendas seguidas — tente mais tarde.',
    dados: 'Não foi possível guardar — reveja os dados e tente novamente.',
  };

  let avisou = false;

  /* ---------------------------------------------------------------------
     Configuração
     --------------------------------------------------------------------- */
  function local() {
    return window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost';
  }

  /** true = sem Supabase configurado e a página está aberta no próprio PC
   *  (fala com tools/mock-supabase.js, como as avaliações). */
  function modoTeste() {
    const c = GDM.reviewsConfig || {};
    return !String(c.url || '').trim() && local();
  }

  function ligacao() {
    const c = GDM.reviewsConfig || {};
    const teste = modoTeste();
    return {
      url: teste ? TESTE_URL : String(c.url || '').trim().replace(/\/+$/, ''),
      chave: teste ? TESTE_CHAVE : String(c.anonKey || '').trim(),
    };
  }

  /** As contas estão ligadas e o Supabase configurado. */
  function ativa() {
    if (!GDM.contaConfig || GDM.contaConfig.ativa !== true) return false;
    const l = ligacao();
    const ok = modoTeste() || (/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(l.url) && !!l.chave);
    if (!ok && !avisou) {
      avisou = true;
      console.warn('[contas] contaConfig.ativa = true mas reviewsConfig.js não tem o Supabase preenchido — as contas ficam desligadas. Ver docs/CONTAS.md.');
    }
    return ok;
  }

  function fornecedorAtivo(nome) {
    const f = (GDM.contaConfig && GDM.contaConfig.fornecedores) || {};
    return f[nome] === true;
  }

  /* ---------------------------------------------------------------------
     Sessão (localStorage)
     --------------------------------------------------------------------- */
  function sessaoValida(s) {
    return s && typeof s === 'object' &&
      typeof s.access_token === 'string' && s.access_token.length > 20 &&
      typeof s.refresh_token === 'string' && s.refresh_token.length > 5 &&
      Number.isFinite(s.expires_at) &&
      s.user && typeof s.user.id === 'string' && /^[0-9a-f-]{36}$/i.test(s.user.id);
  }

  function lerSessao() {
    return GDM.storage.read(CHAVE_SESSAO, sessaoValida);
  }

  /* Guarda só o necessário da resposta da API (nada de metadados extra). */
  function guardarSessao(resposta, nomeAnterior) {
    if (!resposta || typeof resposta !== 'object') return null;
    const agora = Math.floor(Date.now() / 1000);
    const expira = Number.isFinite(resposta.expires_at) ? resposta.expires_at
      : agora + (Number.isFinite(resposta.expires_in) ? resposta.expires_in : 3600);
    const user = resposta.user || {};
    const sessao = {
      access_token: resposta.access_token,
      refresh_token: resposta.refresh_token,
      expires_at: expira,
      user: { id: user.id, email: typeof user.email === 'string' ? user.email.slice(0, 200) : '' },
      nome: typeof nomeAnterior === 'string' ? nomeAnterior : '',
    };
    if (!sessaoValida(sessao)) return null;
    GDM.storage.write(CHAVE_SESSAO, sessao);
    GDM.bus.emit('conta:change', resumo());
    return sessao;
  }

  function apagarSessaoLocal() {
    GDM.storage.remove(CHAVE_SESSAO);
    GDM.storage.remove(CHAVE_SYNC);
    GDM.bus.emit('conta:change', null);
  }

  /** Sem pedidos à rede: há sessão iniciada neste navegador? */
  function temSessao() {
    return ativa() && !!lerSessao();
  }

  /** { email, nome, inicial } da sessão, ou null. Sem pedidos à rede. */
  function resumo() {
    if (!ativa()) return null;
    const s = lerSessao();
    if (!s) return null;
    const base = (s.nome || s.user.email || '?').trim();
    return { email: s.user.email, nome: s.nome || '', inicial: base.charAt(0).toUpperCase() || '?' };
  }

  function guardarNome(nome) {
    const s = lerSessao();
    if (!s) return;
    s.nome = GDM.security.sanitizeInput(nome, 100);
    GDM.storage.write(CHAVE_SESSAO, s);
    GDM.bus.emit('conta:change', resumo());
  }

  /* ---------------------------------------------------------------------
     Pedidos à API
     --------------------------------------------------------------------- */
  function cabecalhos(token, extra) {
    const l = ligacao();
    const h = { apikey: l.chave };
    // com sessão vai o token da pessoa; sem sessão, a chave "anon" antiga (JWT) vai também como Bearer
    if (token) h.Authorization = 'Bearer ' + token;
    else if (!/^sb_publishable_/.test(l.chave)) h.Authorization = 'Bearer ' + l.chave;
    return Object.assign(h, extra || {});
  }

  /* Pedido com timeout. Resolve para { estado, corpo } ou { erro }.
     corpo = JSON da resposta (ou null). */
  function pedido(caminho, opcoes) {
    opcoes = opcoes || {};
    const controlo = new AbortController();
    const relogio = setTimeout(function () { controlo.abort(); }, TIMEOUT_MS);
    return fetch(ligacao().url + caminho, {
      method: opcoes.metodo || 'GET',
      headers: cabecalhos(opcoes.token, opcoes.cabecalhos),
      body: opcoes.corpo === undefined ? undefined : JSON.stringify(opcoes.corpo),
      signal: controlo.signal,
      credentials: 'omit',
      keepalive: !!opcoes.keepalive,
    }).then(function (resposta) {
      clearTimeout(relogio);
      return resposta.text().then(function (texto) {
        let corpo = null;
        try { corpo = texto ? JSON.parse(texto) : null; } catch (e) { corpo = null; }
        return { estado: resposta.status, corpo: corpo };
      }, function () { return { estado: resposta.status, corpo: null }; });
    }, function (falha) {
      clearTimeout(relogio);
      return { erro: falha && falha.name === 'AbortError' ? MSG.timeout : MSG.rede };
    });
  }

  /* Código de erro da API de autenticação (formatos antigo e novo). */
  function codigoErro(corpo) {
    if (!corpo || typeof corpo !== 'object') return '';
    return String(corpo.error_code || corpo.error || corpo.code || '');
  }

  function erroAuth(r) {
    if (r.erro) return { erro: r.erro };
    const codigo = codigoErro(r.corpo);
    if (codigo === 'over_email_send_rate_limit') return { erro: MSG.esperar };
    if (r.estado === 429 || codigo === 'over_request_rate_limit') return { erro: MSG.demasiados };
    if (codigo === 'otp_expired' || codigo === 'invalid_credentials') return { erro: MSG.codigo };
    if (codigo === 'email_address_not_authorized') return { erro: MSG.emailNaoAutorizado };
    if (codigo === 'signup_disabled' || codigo === 'otp_disabled') return { erro: MSG.registoDesligado };
    if (codigo === 'email_address_invalid' || codigo === 'validation_failed') return { erro: MSG.email };
    if (r.estado === 403 || r.estado === 400) return { erro: MSG.codigo };
    return { erro: MSG.servidor };
  }

  /* Renovação do token: uma de cada vez (vários pedidos ao mesmo tempo
     esperam pela mesma renovação). */
  let renovacao = null;

  /** Token de acesso válido (renovado se faltar menos de 1 minuto), ou null. */
  function token() {
    const s = lerSessao();
    if (!s) return Promise.resolve(null);
    if (s.expires_at * 1000 - Date.now() > 60 * 1000) return Promise.resolve(s.access_token);
    if (renovacao) return renovacao;
    renovacao = pedido('/auth/v1/token?grant_type=refresh_token', { metodo: 'POST', corpo: { refresh_token: s.refresh_token }, cabecalhos: { 'Content-Type': 'application/json' } })
      .then(function (r) {
        renovacao = null;
        if (r.erro) return null; // sem rede: a sessão fica, tenta-se mais tarde
        if (r.estado >= 200 && r.estado < 300) {
          const nova = guardarSessao(r.corpo, s.nome);
          return nova ? nova.access_token : null;
        }
        // refresh token inválido/revogado (ex.: conta apagada noutro dispositivo)
        if (r.estado === 400 || r.estado === 401 || r.estado === 403) apagarSessaoLocal();
        return null;
      });
    return renovacao;
  }

  /* Pedido à API REST com a sessão. Resolve para { corpo } ou { erro }. */
  function rest(caminho, opcoes) {
    opcoes = opcoes || {};
    return token().then(function (t) {
      if (!t) return { erro: MSG.sessao, semSessao: true };
      return pedido('/rest/v1/' + caminho, Object.assign({}, opcoes, { token: t })).then(function (r) {
        if (r.erro) return r;
        if (r.estado >= 200 && r.estado < 300) return { corpo: r.corpo };
        // token recusado (ex.: chaves do projeto mudadas): a sessão deixa de servir
        if (r.estado === 401) { apagarSessaoLocal(); return { erro: MSG.sessao, semSessao: true }; }
        if (r.corpo && r.corpo.code === 'P0001' && r.corpo.hint === 'limite_encomendas') return { erro: MSG.encomendas };
        if (r.estado >= 400 && r.estado < 500) return { erro: MSG.dados };
        return { erro: MSG.servidor };
      });
    });
  }

  /* ---------------------------------------------------------------------
     Entrada por e-mail com código
     --------------------------------------------------------------------- */
  function limparEmail(email) {
    return GDM.security.sanitizeInput(email, 200).toLowerCase();
  }

  /** Envia o código para o e-mail (cria a conta se ainda não existir). */
  function pedirCodigo(email) {
    if (!ativa() || !fornecedorAtivo('email')) return Promise.resolve({ erro: MSG.registoDesligado });
    const limpo = limparEmail(email);
    if (!GDM.format.isValidEmail(limpo)) return Promise.resolve({ erro: MSG.email });
    return pedido('/auth/v1/otp', {
      metodo: 'POST',
      cabecalhos: { 'Content-Type': 'application/json' },
      corpo: { email: limpo, create_user: true },
    }).then(function (r) {
      if (!r.erro && r.estado >= 200 && r.estado < 300) return { ok: true };
      return erroAuth(r);
    });
  }

  /** Confirma o código recebido e inicia a sessão. */
  function confirmarCodigo(email, codigo) {
    if (!ativa()) return Promise.resolve({ erro: MSG.registoDesligado });
    const limpo = limparEmail(email);
    const cod = String(codigo || '').replace(/\s+/g, '');
    if (!/^\d{6,10}$/.test(cod)) return Promise.resolve({ erro: MSG.codigoFormato });
    return pedido('/auth/v1/verify', {
      metodo: 'POST',
      cabecalhos: { 'Content-Type': 'application/json' },
      corpo: { type: 'email', email: limpo, token: cod },
    }).then(function (r) {
      if (r.erro || r.estado < 200 || r.estado >= 300) return erroAuth(r);
      if (!guardarSessao(r.corpo)) return { erro: MSG.servidor };
      return aoEntrar().then(function () { return { ok: true }; });
    });
  }

  /* ---------------------------------------------------------------------
     Google / Facebook (OAuth com PKCE)
     --------------------------------------------------------------------- */
  function base64url(bytes) {
    let s = '';
    bytes.forEach(function (b) { s += String.fromCharCode(b); });
    return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }

  /** Só aceita voltar para uma página do próprio site (nunca para fora). */
  function destinoSeguro(valor) {
    const v = String(valor || '').replace(/^\.?\//, '');
    return /^[a-z0-9-]+\.html$/.test(v) && v !== 'conta.html' ? v : '';
  }

  function enderecoConta() {
    return new URL('conta.html', window.location.href).href.split('?')[0].split('#')[0];
  }

  /** Vai para o Google/Facebook. Ao voltar, conta.html chama concluirRetorno(). */
  function entrarCom(fornecedor, voltar) {
    if (!ativa() || FORNECEDORES.indexOf(fornecedor) === -1 || !fornecedorAtivo(fornecedor)) return Promise.resolve({ erro: MSG.registoDesligado });
    if (!window.crypto || !window.crypto.subtle) return Promise.resolve({ erro: MSG.retorno });
    const bytes = new Uint8Array(48);
    window.crypto.getRandomValues(bytes);
    const verificador = base64url(bytes);
    return window.crypto.subtle.digest('SHA-256', new TextEncoder().encode(verificador)).then(function (hash) {
      try {
        window.sessionStorage.setItem(CHAVE_PKCE, JSON.stringify({ v: verificador, t: Date.now(), voltar: destinoSeguro(voltar) }));
      } catch (e) {
        return { erro: MSG.retorno };
      }
      const params = new URLSearchParams();
      params.set('provider', fornecedor);
      params.set('redirect_to', enderecoConta());
      params.set('code_challenge', base64url(new Uint8Array(hash)));
      params.set('code_challenge_method', 's256');
      window.location.assign(ligacao().url + '/auth/v1/authorize?' + params.toString());
      return { ok: true };
    }, function () { return { erro: MSG.retorno }; });
  }

  /** Em conta.html: se o endereço trouxer ?code= (volta do Google/Facebook)
   *  troca-o pela sessão. -> null (nada a fazer) | { ok, voltar } | { erro } */
  function concluirRetorno() {
    const params = new URLSearchParams(window.location.search);
    const codigo = params.get('code');
    const erroFornecedor = params.get('error') || params.get('error_description');
    if (!codigo && !erroFornecedor) return Promise.resolve(null);
    // tira o código do endereço já (não fica no histórico nem é reenviado num F5)
    window.history.replaceState({}, '', window.location.pathname);
    let guardado = null;
    try {
      guardado = JSON.parse(window.sessionStorage.getItem(CHAVE_PKCE) || 'null');
      window.sessionStorage.removeItem(CHAVE_PKCE);
    } catch (e) { guardado = null; }
    if (!ativa()) return Promise.resolve(null);
    if (erroFornecedor) return Promise.resolve({ erro: /denied|cancel/i.test(erroFornecedor) ? MSG.cancelado : MSG.retorno });
    if (!guardado || typeof guardado.v !== 'string' || !Number.isFinite(guardado.t) || Date.now() - guardado.t > 10 * 60 * 1000) {
      return Promise.resolve({ erro: MSG.retornoExpirado });
    }
    if (!/^[A-Za-z0-9-]{8,200}$/.test(codigo)) return Promise.resolve({ erro: MSG.retorno });
    return pedido('/auth/v1/token?grant_type=pkce', {
      metodo: 'POST',
      cabecalhos: { 'Content-Type': 'application/json' },
      corpo: { auth_code: codigo, code_verifier: guardado.v },
    }).then(function (r) {
      if (r.erro || r.estado < 200 || r.estado >= 300) return { erro: r.erro || MSG.retorno };
      if (!guardarSessao(r.corpo)) return { erro: MSG.retorno };
      return aoEntrar().then(function () { return { ok: true, voltar: destinoSeguro(guardado.voltar) }; });
    });
  }

  /* ---------------------------------------------------------------------
     Terminar sessão / apagar conta
     --------------------------------------------------------------------- */
  /* Limpa o carrinho e os favoritos deste navegador: a próxima pessoa no
     mesmo computador não vê os da anterior. */
  function limparDispositivo() {
    aplicandoRemoto = true;
    GDM.cart.substituir([]);
    GDM.favorites.substituir([]);
    aplicandoRemoto = false;
    clearTimeout(temporizador);
  }

  function terminarSessao() {
    const s = lerSessao();
    limparDispositivo();
    apagarSessaoLocal();
    if (!s || !ativa()) return Promise.resolve({ ok: true });
    // só esta sessão (scope=local); se falhar, o token expira sozinho dentro de 1 hora
    return pedido('/auth/v1/logout?scope=local', { metodo: 'POST', token: s.access_token, keepalive: true })
      .then(function () { return { ok: true }; });
  }

  function apagarConta() {
    return rest('rpc/apagar_minha_conta', { metodo: 'POST', corpo: {}, cabecalhos: { 'Content-Type': 'application/json' } })
      .then(function (r) {
        if (r.erro) return r;
        limparDispositivo();
        apagarSessaoLocal();
        return { ok: true };
      });
  }

  /* ---------------------------------------------------------------------
     Perfil (dados de entrega) e encomendas
     --------------------------------------------------------------------- */
  const CAMPOS_PERFIL = { nome: 100, telefone: 30, morada: 200, codigo_postal: 8, localidade: 80 };

  function normalizarPerfil(linha) {
    const p = {};
    Object.keys(CAMPOS_PERFIL).forEach(function (campo) {
      p[campo] = linha && typeof linha[campo] === 'string' ? linha[campo].slice(0, CAMPOS_PERFIL[campo]) : '';
    });
    return p;
  }

  function lerPerfil() {
    if (!temSessao()) return Promise.resolve({ erro: MSG.sessao, semSessao: true });
    return rest('perfis?select=nome,telefone,morada,codigo_postal,localidade').then(function (r) {
      if (r.erro) return r;
      const linha = Array.isArray(r.corpo) ? r.corpo[0] : null;
      const perfil = normalizarPerfil(linha);
      if (perfil.nome && perfil.nome !== (lerSessao() || {}).nome) guardarNome(perfil.nome);
      return { perfil: perfil };
    });
  }

  /** Guarda os dados de entrega (já validados por quem chama). */
  function guardarPerfil(dados) {
    if (!temSessao()) return Promise.resolve({ erro: MSG.sessao, semSessao: true });
    const corpo = {};
    Object.keys(CAMPOS_PERFIL).forEach(function (campo) {
      corpo[campo] = GDM.security.sanitizeInput(dados && dados[campo], CAMPOS_PERFIL[campo]);
    });
    if (corpo.codigo_postal && !/^\d{4}-\d{3}$/.test(corpo.codigo_postal)) corpo.codigo_postal = '';
    corpo.telefone = corpo.telefone.replace(/[^0-9+ ().-]/g, '');
    const id = lerSessao().user.id;
    return rest('perfis?id=eq.' + id, {
      metodo: 'PATCH', corpo: corpo,
      cabecalhos: { 'Content-Type': 'application/json', Prefer: 'return=minimal' },
    }).then(function (r) {
      if (r.erro) return r;
      guardarNome(corpo.nome);
      return { ok: true };
    });
  }

  function normalizarEncomenda(linha) {
    if (!linha || typeof linha !== 'object') return null;
    if (typeof linha.numero !== 'string' || !/^GM-[A-Z0-9]{8}$/.test(linha.numero)) return null;
    if (typeof linha.criada_em !== 'string' || !Array.isArray(linha.itens)) return null;
    const itens = linha.itens.slice(0, 60).map(function (it) {
      if (!it || typeof it !== 'object') return null;
      const qtd = Number(it.quantidade);
      if (typeof it.nome !== 'string' || !Number.isInteger(qtd) || qtd < 1 || qtd > 99) return null;
      return { nome: it.nome.slice(0, 120), quantidade: qtd, produtoId: typeof it.produto === 'string' ? it.produto.slice(0, 20) : '' };
    }).filter(Boolean);
    const total = Number(linha.total);
    return {
      numero: linha.numero,
      data: linha.criada_em,
      itens: itens,
      total: Number.isFinite(total) && total >= 0 ? total : 0,
      modo: linha.modo === 'email' ? 'email' : 'whatsapp',
    };
  }

  function listarEncomendas() {
    if (!temSessao()) return Promise.resolve({ erro: MSG.sessao, semSessao: true });
    return rest('encomendas?select=numero,itens,total,modo,criada_em&order=criada_em.desc&limit=50').then(function (r) {
      if (r.erro) return r;
      return { itens: (Array.isArray(r.corpo) ? r.corpo : []).map(normalizarEncomenda).filter(Boolean) };
    });
  }

  /** Grava a encomenda na conta (quando a pessoa confirma "Já enviei o pedido").
   *  estado = GDM.cart.getState() no momento do envio. */
  function gravarEncomenda(numero, estado, modo) {
    if (!temSessao()) return Promise.resolve({ erro: MSG.sessao, semSessao: true });
    if (!/^GM-[A-Z0-9]{8}$/.test(numero) || !estado || !estado.items || !estado.items.length) return Promise.resolve({ erro: MSG.dados });
    const envio = GDM.cart.shipping(estado.subtotal);
    return rest('encomendas', {
      metodo: 'POST',
      cabecalhos: { 'Content-Type': 'application/json', Prefer: 'return=minimal' },
      corpo: {
        numero: numero,
        itens: estado.items.map(function (it) {
          return { produto: it.product.id, nome: it.product.name, quantidade: it.qty, preco: it.product.price };
        }),
        subtotal: estado.subtotal,
        portes: envio.cost,
        total: envio.total,
        modo: modo === 'email' ? 'email' : 'whatsapp',
      },
    }).then(function (r) { return r.erro ? r : { ok: true }; });
  }

  /* ---------------------------------------------------------------------
     Sincronização do carrinho e dos favoritos
     - ao entrar: junta o deste navegador com o da conta;
     - com sessão: cada mudança é guardada na conta (com um pequeno atraso);
       ao abrir uma página, lê a conta no máximo 1 vez por minuto;
     - sem rede: tudo continua só no localStorage, como sem conta.
     --------------------------------------------------------------------- */
  let temporizador = null;
  let aplicandoRemoto = false;

  function lerSync() {
    return GDM.storage.read(CHAVE_SYNC, function (v) { return v && typeof v === 'object'; }) || {};
  }
  function escreverSync(mudancas) {
    GDM.storage.write(CHAVE_SYNC, Object.assign(lerSync(), mudancas));
  }

  function linhasLocais() {
    return GDM.cart.getState().items.map(function (it) { return { productId: it.product.id, qty: it.qty }; });
  }

  function lerRemoto() {
    return rest('dados_cliente?select=carrinho,favoritos').then(function (r) {
      if (r.erro) return r;
      const linha = Array.isArray(r.corpo) ? r.corpo[0] : null;
      return {
        carrinho: linha && Array.isArray(linha.carrinho) ? linha.carrinho : [],
        favoritos: linha && Array.isArray(linha.favoritos) ? linha.favoritos.filter(function (x) { return typeof x === 'string'; }) : [],
      };
    });
  }

  /** Guarda o carrinho e os favoritos deste navegador na conta. */
  function empurrar(opcoes) {
    clearTimeout(temporizador);
    const s = lerSessao();
    if (!ativa() || !s) return Promise.resolve({ ok: false });
    const corpo = { carrinho: linhasLocais(), favoritos: GDM.favorites.list() };
    // ao sair da página não dá para esperar por uma renovação do token
    if (opcoes && opcoes.aoSair) {
      if (s.expires_at * 1000 - Date.now() < 60 * 1000) return Promise.resolve({ ok: false });
      return pedido('/rest/v1/dados_cliente?utilizador=eq.' + s.user.id, {
        metodo: 'PATCH', token: s.access_token, keepalive: true, corpo: corpo,
        cabecalhos: { 'Content-Type': 'application/json', Prefer: 'return=minimal' },
      }).then(function (r) {
        if (!r.erro && r.estado >= 200 && r.estado < 300) escreverSync({ pendente: false });
        return { ok: true };
      });
    }
    return rest('dados_cliente?utilizador=eq.' + s.user.id, {
      metodo: 'PATCH', corpo: corpo,
      cabecalhos: { 'Content-Type': 'application/json', Prefer: 'return=minimal' },
    }).then(function (r) {
      if (!r.erro) escreverSync({ pendente: false, puxado: Date.now() });
      return r.erro ? r : { ok: true };
    });
  }

  function agendarEnvio() {
    if (aplicandoRemoto || !temSessao()) return;
    escreverSync({ pendente: true });
    clearTimeout(temporizador);
    temporizador = setTimeout(empurrar, ATRASO_GUARDAR_MS);
  }

  /* Substitui o deste navegador pelo da conta (outro dispositivo mudou-o). */
  function aplicarRemoto(remoto) {
    aplicandoRemoto = true;
    if (JSON.stringify(linhasLocais()) !== JSON.stringify(remoto.carrinho)) GDM.cart.substituir(remoto.carrinho);
    if (JSON.stringify(GDM.favorites.list()) !== JSON.stringify(remoto.favoritos)) GDM.favorites.substituir(remoto.favoritos);
    aplicandoRemoto = false;
  }

  /** Lê a conta (se passou mais de 1 minuto) ou envia o que ficou por enviar. */
  function sincronizar(forcar) {
    if (!temSessao()) return Promise.resolve();
    const sync = lerSync();
    if (sync.pendente) return empurrar();
    if (!forcar && Number.isFinite(sync.puxado) && Date.now() - sync.puxado < PUXAR_CADA_MS) return Promise.resolve();
    return lerRemoto().then(function (remoto) {
      if (remoto.erro) return;
      // a pessoa mexeu no carrinho enquanto se lia: o local ganha
      if (lerSync().pendente) return empurrar();
      aplicarRemoto(remoto);
      escreverSync({ puxado: Date.now() });
    });
  }

  /* Logo a seguir a entrar: junta este navegador com a conta e guarda. */
  function aoEntrar() {
    return lerRemoto().then(function (remoto) {
      if (!remoto.erro) {
        aplicandoRemoto = true;
        GDM.cart.juntar(remoto.carrinho);
        GDM.favorites.juntar(remoto.favoritos);
        aplicandoRemoto = false;
      }
      return Promise.all([empurrar(), lerPerfil()]);
    });
  }

  /* Chamado por js/static-init.js em todas as páginas. */
  function iniciar() {
    if (!ativa()) return;
    GDM.bus.on('cart:change', agendarEnvio);
    GDM.bus.on('favorites:change', agendarEnvio);
    // sessão iniciada/terminada noutro separador
    window.addEventListener('storage', function (e) {
      if (e.key === 'gdm:' + CHAVE_SESSAO || e.key === null) GDM.bus.emit('conta:change', resumo());
    });
    // ao sair da página com uma mudança ainda por enviar
    window.addEventListener('pagehide', function () {
      if (temporizador && lerSync().pendente) empurrar({ aoSair: true });
    });
    document.addEventListener('visibilitychange', function () {
      if (document.visibilityState === 'visible') sincronizar(false);
    });
    if (lerSessao()) {
      // depois de a página estar desenhada, para não atrasar nada
      setTimeout(function () { sincronizar(false); }, 300);
    }
  }

  GDM.conta = {
    ativa: ativa,
    modoTeste: modoTeste,
    fornecedorAtivo: fornecedorAtivo,
    temSessao: temSessao,
    resumo: resumo,
    destinoSeguro: destinoSeguro,
    pedirCodigo: pedirCodigo,
    confirmarCodigo: confirmarCodigo,
    entrarCom: entrarCom,
    concluirRetorno: concluirRetorno,
    terminarSessao: terminarSessao,
    apagarConta: apagarConta,
    lerPerfil: lerPerfil,
    guardarPerfil: guardarPerfil,
    listarEncomendas: listarEncomendas,
    gravarEncomenda: gravarEncomenda,
    sincronizar: sincronizar,
    iniciar: iniciar,
  };
})(window.GDM = window.GDM || {});
