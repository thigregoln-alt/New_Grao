/* ==========================================================================
   Página: Conta (conta.html) — entrar / criar conta, ou "A minha conta".
   Sem sessão: "Continuar sem conta" (a opção mais visível), entrada por
   e-mail com código e, se ligados, Google e Facebook.
   Com sessão: dados de entrega, encomendas, terminar sessão, apagar conta.
   Toda a lógica de sessão e pedidos está em js/state/conta.js.
   ========================================================================== */
(function (GDM) {
  'use strict';
  const { el } = GDM.security;
  GDM.pages = GDM.pages || {};

  const ESPERA_REENVIO_S = 60;

  /* Logótipos oficiais (regras de marca: o "G" a cores num botão branco, o
     "f" branco num botão azul #1877F2). Marcação fixa, sem dados do utilizador. */
  const LOGO_GOOGLE = '<svg viewBox="0 0 48 48" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>';
  const LOGO_FACEBOOK = '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="#fff" d="M24 12.07C24 5.4 18.63 0 12 0S0 5.4 0 12.07C0 18.1 4.39 23.1 10.13 24v-8.44H7.08v-3.49h3.05V9.41c0-3.02 1.79-4.69 4.53-4.69 1.31 0 2.68.24 2.68.24v2.97h-1.51c-1.49 0-1.96.93-1.96 1.89v2.26h3.33l-.53 3.49h-2.8V24C19.61 23.1 24 18.1 24 12.07z"/></svg>';

  /* As mesmas regras de js/pages/checkout.js (telemóvel e código postal). */
  function normalizePostal(value) {
    const v = String(value || '').trim();
    return /^\d{7}$/.test(v) ? v.slice(0, 4) + '-' + v.slice(4) : v;
  }
  function isValidPhone(value) {
    const v = String(value || '').replace(/[\s().-]/g, '');
    return /^[29]\d{8}$/.test(v) || /^\+\d{8,15}$/.test(v);
  }

  /* Para onde voltar: ?voltar=checkout.html (explícito — depois de entrar
     volta lá) ou a página de onde a pessoa veio (só para "Continuar sem
     conta"). Só páginas do próprio site. */
  function destinos() {
    const params = new URLSearchParams(window.location.search);
    const explicito = GDM.conta.destinoSeguro(params.get('voltar'));
    let anterior = '';
    try {
      const r = new URL(document.referrer);
      if (r.origin === window.location.origin) anterior = GDM.conta.destinoSeguro(r.pathname.split('/').pop());
    } catch (e) { anterior = ''; }
    return { depoisDeEntrar: explicito, semConta: explicito || anterior || 'index.html' };
  }

  function iconHtml(nome) {
    const s = document.createElement('span');
    s.setAttribute('aria-hidden', 'true');
    s.innerHTML = GDM.icons.icon(nome);
    return s;
  }

  function estado(texto, tipo) {
    return el('p', { class: 'account-status' + (tipo ? ' account-status--' + tipo : ''), role: 'status', 'aria-live': 'polite', text: texto || '' });
  }
  function mostrar(status, texto, tipo) {
    status.textContent = texto || '';
    status.className = 'account-status' + (tipo ? ' account-status--' + tipo : '');
  }

  function ocupado(botao, sim, textoOcupado) {
    if (sim) {
      botao.dataset.textoOriginal = botao.textContent;
      botao.textContent = textoOcupado;
      botao.disabled = true;
      botao.setAttribute('aria-busy', 'true');
    } else {
      if (botao.dataset.textoOriginal) botao.textContent = botao.dataset.textoOriginal;
      botao.disabled = false;
      botao.removeAttribute('aria-busy');
    }
  }

  /* ---------------------------------------------------------------------
     Sem sessão — "Entrar ou criar conta"
     --------------------------------------------------------------------- */
  function cartaoSemConta(destino) {
    return el('div', { class: 'panel account-card account-card--guest', 'data-reveal': 'fade' }, [
      el('p', { class: 'eyebrow', text: 'Sem conta' }),
      el('h2', { text: 'Comprar sem conta' }),
      el('p', { class: 'account-card__lede', text: 'Não precisa de conta para encomendar. O carrinho e os favoritos ficam guardados neste dispositivo, como sempre.' }),
      el('a', { class: 'btn btn--primary btn--block', href: destino, text: 'Continuar sem conta' }),
    ]);
  }

  function botoesFornecedores(status) {
    const lista = [];
    [['google', 'Continuar com Google', LOGO_GOOGLE], ['facebook', 'Continuar com Facebook', LOGO_FACEBOOK]].forEach(function (f) {
      if (!GDM.conta.fornecedorAtivo(f[0])) return;
      const b = el('button', { class: 'btn-social btn-social--' + f[0], type: 'button' });
      b.innerHTML = f[2];
      b.appendChild(el('span', { text: f[1] }));
      b.addEventListener('click', function () {
        ocupado(b, true, 'A abrir…');
        GDM.conta.entrarCom(f[0], destinos().depoisDeEntrar).then(function (r) {
          if (r.erro) { ocupado(b, false); mostrar(status, r.erro, 'erro'); }
        });
      });
      lista.push(b);
    });
    return lista;
  }

  function cartaoEntrar(aoEntrar) {
    const status = estado();
    const corpo = el('div', { class: 'stack', style: 'gap:14px' });
    const sociais = botoesFornecedores(status);
    const comEmail = GDM.conta.fornecedorAtivo('email');

    const card = el('div', { class: 'panel account-card', 'data-reveal': 'fade', style: '--reveal-index: 1;' }, [
      el('p', { class: 'eyebrow', text: 'Com conta' }),
      el('h2', { text: 'Entrar ou criar conta' }),
      el('ul', { class: 'account-perks' }, [
        'Carrinho e favoritos guardados em todos os seus dispositivos',
        'Morada preenchida sozinha no checkout',
        'As suas encomendas sempre à mão',
      ].map(function (t) { return el('li', {}, [iconHtml('check'), el('span', { text: t })]); })),
    ]);
    if (sociais.length) card.appendChild(el('div', { class: 'stack', style: 'gap:10px' }, sociais));
    if (sociais.length && comEmail) card.appendChild(el('p', { class: 'account-divider', text: 'ou com o seu e-mail' }));
    if (comEmail) card.appendChild(corpo);
    card.appendChild(status);

    /* Passo 1: e-mail */
    function passoEmail(emailInicial) {
      corpo.innerHTML = '';
      const emailField = GDM.formHelpers.field({ id: 'conta-email', label: 'E-mail', type: 'email', required: true, autocomplete: 'email', hint: 'Sem passwords: enviamos-lhe um código de 6 dígitos.', validate: function (v) { return GDM.format.isValidEmail(v) ? '' : 'Introduza um e-mail válido.'; } });
      if (emailInicial) emailField.__gdmInput.value = emailInicial;
      const validar = GDM.formHelpers.wireForm([emailField]);
      const enviar = el('button', { class: 'btn btn--dark btn--block', type: 'submit', text: 'Enviar código' });
      const form = el('form', { class: 'stack', style: 'gap:14px', novalidate: true }, [emailField, enviar]);
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        mostrar(status, '');
        if (!validar()) return;
        const email = GDM.formHelpers.readValue(emailField).toLowerCase();
        ocupado(enviar, true, 'A enviar…');
        GDM.conta.pedirCodigo(email).then(function (r) {
          ocupado(enviar, false);
          if (r.erro) { mostrar(status, r.erro, 'erro'); return; }
          passoCodigo(email);
        });
      });
      corpo.appendChild(form);
    }

    /* Passo 2: código */
    function passoCodigo(email) {
      corpo.innerHTML = '';
      const aviso = el('p', { class: 'account-card__lede' }, ['Enviámos um código para ', el('strong', { text: email }), '. Veja também a pasta de spam.']);
      const codigoField = GDM.formHelpers.field({ id: 'conta-codigo', label: 'Código', required: true, autocomplete: 'one-time-code', maxLength: 10, validate: function (v) { return /^\d{6,10}$/.test(v.replace(/\s+/g, '')) ? '' : 'Escreva os 6 dígitos do código.'; } });
      codigoField.classList.add('account-code');
      codigoField.__gdmInput.setAttribute('inputmode', 'numeric');
      codigoField.__gdmInput.setAttribute('pattern', '[0-9]*');
      const validar = GDM.formHelpers.wireForm([codigoField]);
      const entrar = el('button', { class: 'btn btn--dark btn--block', type: 'submit', text: 'Entrar' });
      const reenviar = el('button', { class: 'link-btn', type: 'button' });
      const outro = el('button', { class: 'link-btn', type: 'button', text: 'Usar outro e-mail' });
      const form = el('form', { class: 'stack', style: 'gap:14px', novalidate: true }, [aviso, codigoField, entrar, el('div', { class: 'account-links' }, [reenviar, outro])]);

      let falta = ESPERA_REENVIO_S;
      let relogio = null;
      function contar() {
        clearInterval(relogio);
        falta = ESPERA_REENVIO_S;
        reenviar.disabled = true;
        reenviar.textContent = 'Reenviar código (' + falta + ' s)';
        relogio = setInterval(function () {
          falta--;
          if (!reenviar.isConnected) { clearInterval(relogio); return; }
          if (falta <= 0) { clearInterval(relogio); reenviar.disabled = false; reenviar.textContent = 'Reenviar código'; return; }
          reenviar.textContent = 'Reenviar código (' + falta + ' s)';
        }, 1000);
      }
      contar();

      reenviar.addEventListener('click', function () {
        mostrar(status, '');
        reenviar.disabled = true;
        GDM.conta.pedirCodigo(email).then(function (r) {
          if (r.erro) { mostrar(status, r.erro, 'erro'); reenviar.disabled = false; return; }
          mostrar(status, 'Enviámos um código novo.', 'ok');
          contar();
        });
      });
      outro.addEventListener('click', function () { clearInterval(relogio); mostrar(status, ''); passoEmail(email); });

      form.addEventListener('submit', function (e) {
        e.preventDefault();
        mostrar(status, '');
        if (!validar()) return;
        ocupado(entrar, true, 'A entrar…');
        GDM.conta.confirmarCodigo(email, codigoField.__gdmInput.value).then(function (r) {
          if (r.erro) {
            ocupado(entrar, false);
            mostrar(status, r.erro, 'erro');
            codigoField.__gdmInput.select();
            return;
          }
          clearInterval(relogio);
          aoEntrar();
        });
      });
      corpo.appendChild(form);
      requestAnimationFrame(function () { codigoField.__gdmInput.focus(); });
    }

    if (comEmail) passoEmail('');
    card.__mostrarErro = function (texto) { mostrar(status, texto, 'erro'); };
    return card;
  }

  function vistaSemSessao(inner, ir) {
    const d = destinos();
    inner.innerHTML = '';
    const entrar = cartaoEntrar(function () {
      if (d.depoisDeEntrar) { window.location.href = d.depoisDeEntrar; return; }
      ir();
    });
    inner.appendChild(el('div', { class: 'account-grid' }, [cartaoSemConta(d.semConta), entrar]));
    return entrar;
  }

  /* ---------------------------------------------------------------------
     Com sessão — "A minha conta"
     --------------------------------------------------------------------- */
  function cartaoDados(aoPerderSessao) {
    const status = estado();
    const f = GDM.formHelpers;
    const nome = f.field({ id: 'ac-name', label: 'Nome completo', autocomplete: 'name', maxLength: 100 });
    const telefone = f.field({ id: 'ac-phone', label: 'Telemóvel', type: 'tel', autocomplete: 'tel', maxLength: 30, validate: function (v) {
      return !v || isValidPhone(v) ? '' : 'Indique 9 dígitos a começar por 9 ou 2, ou o número com indicativo (ex.: +351 912 345 678).';
    } });
    const morada = f.field({ id: 'ac-address', label: 'Morada', autocomplete: 'street-address' });
    const postal = f.field({ id: 'ac-postal', label: 'Código postal', autocomplete: 'postal-code', placeholder: '1234-567', maxLength: 8, validate: function (v) {
      return !v || /^\d{4}-\d{3}$/.test(normalizePostal(v)) ? '' : 'Use o formato 1234-567.';
    } });
    postal.__gdmInput.addEventListener('blur', function () { postal.__gdmInput.value = normalizePostal(postal.__gdmInput.value); });
    const localidade = f.field({ id: 'ac-city', label: 'Localidade', autocomplete: 'address-level2', maxLength: 80 });
    const campos = [nome, telefone, morada, postal, localidade];
    const validar = f.wireForm(campos);
    const guardar = el('button', { class: 'btn btn--dark', type: 'submit', text: 'Guardar dados' });

    const form = el('form', { class: 'stack', style: 'gap:14px', novalidate: true, hidden: true }, [
      el('div', { class: 'form-row form-row--2' }, [nome, telefone]),
      morada,
      el('div', { class: 'form-row form-row--2' }, [postal, localidade]),
      el('div', { class: 'cluster', style: 'gap:12px;align-items:center' }, [guardar]),
    ]);
    const esqueleto = el('div', { class: 'skeleton account-skeleton account-skeleton--form', 'aria-hidden': 'true' });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      mostrar(status, '');
      if (!validar()) return;
      ocupado(guardar, true, 'A guardar…');
      GDM.conta.guardarPerfil({
        nome: f.readValue(nome), telefone: f.readValue(telefone), morada: f.readValue(morada),
        codigo_postal: normalizePostal(f.readValue(postal)), localidade: f.readValue(localidade),
      }).then(function (r) {
        ocupado(guardar, false);
        if (r.semSessao) { aoPerderSessao(); return; }
        if (r.erro) { mostrar(status, r.erro, 'erro'); return; }
        mostrar(status, 'Dados guardados.', 'ok');
      });
    });

    GDM.conta.lerPerfil().then(function (r) {
      if (r.semSessao) { aoPerderSessao(); return; }
      esqueleto.remove();
      form.hidden = false;
      if (r.erro) { mostrar(status, r.erro, 'erro'); return; }
      nome.__gdmInput.value = r.perfil.nome;
      telefone.__gdmInput.value = r.perfil.telefone;
      morada.__gdmInput.value = r.perfil.morada;
      postal.__gdmInput.value = r.perfil.codigo_postal;
      localidade.__gdmInput.value = r.perfil.localidade;
    });

    return el('div', { class: 'panel account-card', 'data-reveal': 'fade' }, [
      el('h2', { text: 'Dados de entrega' }),
      el('p', { class: 'account-card__lede', text: 'Ficam guardados na sua conta para preencher o checkout mais depressa.' }),
      esqueleto, form, status,
    ]);
  }

  function cartaoEncomendas(aoPerderSessao) {
    const lista = el('div', { class: 'stack', style: 'gap:12px' }, [
      el('div', { class: 'skeleton account-skeleton account-skeleton--order', 'aria-hidden': 'true' }),
      el('div', { class: 'skeleton account-skeleton account-skeleton--order', 'aria-hidden': 'true' }),
    ]);
    function carregar() {
      GDM.conta.listarEncomendas().then(function (r) {
        if (r.semSessao) { aoPerderSessao(); return; }
        lista.innerHTML = '';
        if (r.erro) {
          const tentar = el('button', { class: 'btn btn--outline btn--sm', type: 'button', text: 'Tentar novamente' });
          tentar.addEventListener('click', carregar);
          lista.appendChild(el('p', { class: 'account-status account-status--erro', text: r.erro }));
          lista.appendChild(tentar);
          return;
        }
        if (!r.itens.length) {
          lista.appendChild(el('div', { class: 'account-empty' }, [
            el('p', { text: 'Ainda não tem encomendas guardadas nesta conta.' }),
            el('a', { class: 'btn btn--outline btn--sm', href: 'loja.html', text: 'Ver a loja' }),
          ]));
          return;
        }
        r.itens.forEach(function (enc) {
          lista.appendChild(el('article', { class: 'account-order' }, [
            el('div', { class: 'account-order__head' }, [
              el('strong', { text: enc.numero }),
              el('span', { class: 'account-order__total', text: GDM.format.currency(enc.total) }),
            ]),
            el('p', { class: 'account-order__meta', text: GDM.format.dateLabel(enc.data) + ' · enviada por ' + (enc.modo === 'email' ? 'e-mail' : 'WhatsApp') }),
            el('ul', { class: 'account-order__items' }, enc.itens.map(function (it) {
              return el('li', { text: it.quantidade + '× ' + it.nome });
            })),
          ]));
        });
      });
    }
    carregar();
    return el('div', { class: 'panel account-card', 'data-reveal': 'fade', style: '--reveal-index: 1;' }, [
      el('h2', { text: 'As minhas encomendas' }),
      el('div', { class: 'manual-pay-note' }, [iconHtml('shield'), el('p', { text: 'O pagamento e o estado de cada encomenda são combinados connosco pelo WhatsApp. Esta lista é só o seu histórico.' })]),
      lista,
    ]);
  }

  function cartaoSessao(resumo, aoSair) {
    const status = estado();
    const sair = el('button', { class: 'btn btn--outline btn--block', type: 'button', text: 'Terminar sessão' });
    sair.addEventListener('click', function () {
      ocupado(sair, true, 'A terminar…');
      GDM.conta.terminarSessao().then(function () {
        GDM.components.toast.show('Sessão terminada.', 'info');
        aoSair();
      });
    });

    const apagar = el('button', { class: 'link-btn link-btn--danger', type: 'button', text: 'Apagar a minha conta' });
    const confirmar = el('div', { class: 'account-confirm', hidden: true }, [
      el('p', { text: 'Tem a certeza? A conta, os dados de entrega, o carrinho, os favoritos e o histórico de encomendas são apagados para sempre. Não dá para desfazer.' }),
    ]);
    const sim = el('button', { class: 'btn btn--danger btn--sm', type: 'button', text: 'Sim, apagar a minha conta' });
    const nao = el('button', { class: 'btn btn--ghost btn--sm', type: 'button', text: 'Cancelar' });
    confirmar.appendChild(el('div', { class: 'cluster', style: 'gap:8px' }, [sim, nao]));
    apagar.addEventListener('click', function () {
      confirmar.hidden = false;
      apagar.hidden = true;
      sim.focus();
    });
    nao.addEventListener('click', function () {
      confirmar.hidden = true;
      apagar.hidden = false;
      apagar.focus();
    });
    sim.addEventListener('click', function () {
      mostrar(status, '');
      ocupado(sim, true, 'A apagar…');
      nao.disabled = true;
      GDM.conta.apagarConta().then(function (r) {
        if (r.erro) {
          ocupado(sim, false);
          nao.disabled = false;
          mostrar(status, r.erro, 'erro');
          return;
        }
        GDM.components.toast.show('A sua conta e os seus dados foram apagados.', 'success');
        aoSair();
      });
    });

    return el('aside', { class: 'panel account-card account-card--session', 'data-reveal': 'fade', style: '--reveal-index: 2;' }, [
      el('div', { class: 'account-who' }, [
        el('span', { class: 'account-avatar', 'aria-hidden': 'true', text: resumo.inicial }),
        el('div', { class: 'stack', style: 'gap:2px;min-width:0' }, [
          el('strong', { text: resumo.nome || 'Olá!' }),
          el('span', { class: 'account-who__email', text: resumo.email }),
        ]),
      ]),
      sair,
      el('div', { class: 'account-danger' }, [apagar, confirmar, status]),
    ]);
  }

  function vistaComSessao(inner, aoSair) {
    inner.innerHTML = '';
    const resumo = GDM.conta.resumo();
    inner.appendChild(el('div', { class: 'account-grid account-grid--dash' }, [
      el('div', { class: 'stack', style: 'gap:24px;min-width:0' }, [cartaoDados(aoSair), cartaoEncomendas(aoSair)]),
      cartaoSessao(resumo, aoSair),
    ]));
  }

  /* ---------------------------------------------------------------------
     Página
     --------------------------------------------------------------------- */
  function render(container) {
    const hero = container.querySelector('.page-hero');
    const inner = container.querySelector('[data-conta-host]');
    if (!hero || !inner) return;
    const titulo = hero.querySelector('h1');
    const eyebrow = hero.querySelector('.eyebrow');
    const lede = hero.querySelector('h1 + p');

    function desenhar() {
      if (GDM.conta.temSessao()) {
        const r = GDM.conta.resumo();
        eyebrow.textContent = 'A sua conta';
        titulo.textContent = 'A minha conta';
        lede.textContent = 'Sessão iniciada como ' + r.email + '.';
        vistaComSessao(inner, desenhar);
      } else {
        eyebrow.textContent = 'A sua conta';
        titulo.textContent = 'Entrar ou criar conta';
        lede.textContent = 'A conta é opcional — pode sempre comprar sem ela.';
        vistaSemSessao(inner, desenhar);
      }
      GDM.components.initScrollReveal();
    }

    if (!GDM.conta.ativa()) {
      // contas desligadas: a página não é ligada em lado nenhum, mas se alguém a abrir
      inner.innerHTML = '';
      eyebrow.textContent = 'A sua conta';
      titulo.textContent = 'Contas a chegar em breve';
      lede.textContent = 'Por agora pode comprar sem conta — o carrinho e os favoritos ficam guardados neste dispositivo.';
      inner.appendChild(el('div', { class: 'account-grid account-grid--single' }, [el('a', { class: 'btn btn--primary', href: 'loja.html', text: 'Ir para a loja' })]));
      return;
    }

    GDM.conta.concluirRetorno().then(function (r) {
      if (r && r.ok && r.voltar) { window.location.href = r.voltar; return; }
      desenhar();
      if (r && r.erro) {
        const card = inner.querySelector('.account-card:not(.account-card--guest)');
        if (card && card.__mostrarErro) card.__mostrarErro(r.erro);
      }
    });
    // sessão terminada/iniciada noutro separador (neste, quem muda a sessão já redesenha)
    window.addEventListener('storage', function (e) {
      if (e.key !== 'gdm:sessao' && e.key !== null) return;
      const comSessao = !!inner.querySelector('.account-grid--dash');
      if (comSessao !== GDM.conta.temSessao()) desenhar();
    });
  }

  GDM.pages.account = { render: render };
})(window.GDM = window.GDM || {});
