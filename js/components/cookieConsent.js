/* ==========================================================================
   Consentimento de cookies — banner simples, sem bibliotecas externas.
   Hoje o site não carrega nenhum script de terceiros (sem analytics/pixels),
   mas a estrutura fica pronta: GDM.consent.isAllowed('analytics') deve ser
   verificado por qualquer script de terceiros adicionado no futuro
   (ver MIGRACAO-UMBRACO.md) antes de o injetar no DOM.
   ========================================================================== */
(function (GDM) {
  'use strict';
  const { el } = GDM.security;
  GDM.components = GDM.components || {};

  const KEY = 'cookie_consent';

  function isValidChoice(v) {
    return v && typeof v === 'object' && (v.status === 'accepted' || v.status === 'rejected') && typeof v.date === 'string';
  }

  function getChoice() {
    return GDM.storage.read(KEY, isValidChoice);
  }

  function setChoice(status) {
    const value = { status: status, date: new Date().toISOString() };
    GDM.storage.write(KEY, value);
    GDM.bus.emit('consent:change', value);
    return value;
  }

  /** Só cookies/scripts não-essenciais (analytics, pixels) dependem disto.
   *  Funcionalidade essencial do site (carrinho, favoritos, newsletter) usa
   *  sempre localStorage independentemente do consentimento, porque não são
   *  cookies de rastreio de terceiros. */
  function isAllowed(category) {
    const choice = getChoice();
    if (category === 'essential') return true;
    if (!choice) return false;
    return choice.status === 'accepted';
  }

  function mount(root) {
    if (getChoice()) return; // já respondeu antes, não mostrar de novo

    const text = el('p', { text: 'Usamos apenas o essencial para o site funcionar (carrinho, favoritos). Com a sua autorização, poderemos também usar cookies não-essenciais no futuro (ex.: estatísticas de visitas). Pode aceitar ou recusar.' });
    const acceptBtn = el('button', { class: 'btn btn--primary btn--sm', type: 'button', text: 'Aceitar' });
    const rejectBtn = el('button', { class: 'btn btn--outline-light btn--sm', type: 'button', text: 'Recusar não-essenciais' });
    const linkRow = el('p', { style: 'font-size:var(--fs-xs)' }, [
      el('a', { href: '#/privacidade', 'data-route-link': '', text: 'Saber mais na Política de Privacidade' }),
    ]);

    const banner = el('div', { class: 'cookie-banner', role: 'region', 'aria-label': 'Consentimento de cookies' }, [
      el('div', { class: 'cookie-banner__inner' }, [
        el('div', { class: 'stack', style: 'gap:4px' }, [text, linkRow]),
        el('div', { class: 'cluster', style: 'gap:10px' }, [rejectBtn, acceptBtn]),
      ]),
    ]);

    function close() {
      banner.remove();
    }
    acceptBtn.addEventListener('click', function () { setChoice('accepted'); close(); });
    rejectBtn.addEventListener('click', function () { setChoice('rejected'); close(); });

    root.appendChild(banner);
  }

  GDM.consent = { getChoice: getChoice, isAllowed: isAllowed };
  GDM.components.cookieConsent = { mount: mount };
})(window.GDM = window.GDM || {});
