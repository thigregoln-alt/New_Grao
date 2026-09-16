/* ==========================================================================
   Ícones — conjunto próprio, traço (stroke), sem dependências externas.
   Todas as strings são markup fixo gerado internamente (não contêm dados
   de utilizador), pelo que é seguro inseri-las via innerHTML.
   ========================================================================== */
(function (GDM) {
  'use strict';

  const ICONS = {
    cart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="20" r="1.4"/><circle cx="18" cy="20" r="1.4"/><path d="M2.5 3h2l2.2 12.1a2 2 0 0 0 2 1.6h8.6a2 2 0 0 0 2-1.6L21 7H6"/></svg>',
    heart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20.2s-7.6-4.6-10-9.3C.4 7.6 2 4 5.7 4c2 0 3.6 1.1 4.6 2.6C11.3 5.1 12.9 4 14.9 4 18.6 4 20 7.6 18.4 11c-2.4 4.6-6.4 9.2-6.4 9.2Z"/></svg>',
    search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m20 20-4.4-4.4"/></svg>',
    user: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="3.6"/><path d="M4.5 20c1.3-4 4-6 7.5-6s6.2 2 7.5 6"/></svg>',
    menu: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M3.5 6.5h17M3.5 12h17M3.5 17.5h17"/></svg>',
    close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"><path d="M5 5l14 14M19 5 5 19"/></svg>',
    chevronRight: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 5 7 7-7 7"/></svg>',
    chevronDown: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m5 9 7 7 7-7"/></svg>',
    plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
    minus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M5 12h14"/></svg>',
    trash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2m-9 0 1 13a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-13"/></svg>',
    star: '<svg viewBox="0 0 24 24"><path d="M12 2.8l2.7 6.3 6.8.6-5.2 4.5 1.6 6.7L12 17.6l-5.9 3.3 1.6-6.7-5.2-4.5 6.8-.6Z"/></svg>',
    truck: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="1.5" y="7" width="12.5" height="9.5" rx="1.2"/><path d="M14 10.5h3.8L21 13.7v2.8h-7z"/><circle cx="6" cy="19" r="1.7"/><circle cx="17.5" cy="19" r="1.7"/></svg>',
    shield: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2.5 4.5 5.5v6c0 5 3.2 8 7.5 10 4.3-2 7.5-5 7.5-10v-6Z"/><path d="m8.7 12 2.3 2.3 4.3-4.6"/></svg>',
    gift: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="8.5" width="18" height="4" rx="0.8"/><rect x="4.5" y="12.5" width="15" height="8" rx="0.8"/><path d="M12 8.5v12M12 8.5c-1.8-4.2-7-3.6-7 0M12 8.5c1.8-4.2 7-3.6 7 0"/></svg>',
    sparkle: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2c.6 4.2 2 6.4 6 7-4 .6-5.4 2.8-6 7-.6-4.2-2-6.4-6-7 4-.6 5.4-2.8 6-7Z"/><path d="M19 14c.3 1.8.9 2.7 2.5 3-1.6.3-2.2 1.2-2.5 3-.3-1.8-.9-2.7-2.5-3 1.6-.3 2.2-1.2 2.5-3Z"/></svg>',
    mapPin: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21.5s7-6.4 7-12A7 7 0 1 0 5 9.5c0 5.6 7 12 7 12Z"/><circle cx="12" cy="9.3" r="2.4"/></svg>',
    phone: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3.5h3l1.5 4-2 1.6a12.5 12.5 0 0 0 6.4 6.4l1.6-2 4 1.5v3a2 2 0 0 1-2.2 2C10.7 19.7 4.3 13.3 4 5.7A2 2 0 0 1 6 3.5Z"/></svg>',
    mail: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="2.5" y="4.5" width="19" height="15" rx="2"/><path d="m3.5 6 8.5 6.5L20.5 6"/></svg>',
    clock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5.5l3.8 2.2"/></svg>',
    check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m4 12.5 5.5 5.5L20 6.5"/></svg>',
    whatsapp: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.2A9.8 9.8 0 0 0 3.5 17.3L2.2 21.8l4.6-1.3A9.8 9.8 0 1 0 12 2.2Zm5.6 13.9c-.25.7-1.4 1.3-2 1.4-.5.1-1.1.15-3.6-.85-3-1.2-4.9-4.2-5.1-4.4-.15-.2-1.2-1.6-1.2-3.1 0-1.5.75-2.2 1-2.5.25-.3.6-.35.8-.35h.6c.2 0 .45-.05.7.55.25.6.85 2.1.9 2.25.06.15.1.33 0 .53-.1.2-.15.32-.3.5-.15.17-.32.4-.45.53-.15.15-.32.32-.13.63.2.3.85 1.4 1.85 2.28 1.27 1.13 2.3 1.48 2.63 1.65.3.15.5.13.68-.08.2-.2.8-.9 1-1.2.2-.3.4-.25.68-.15.28.1 1.78.84 2.08 1 .3.15.5.22.58.35.08.13.08.75-.17 1.44Z"/></svg>',
    instagram: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4.2"/><circle cx="17.2" cy="6.8" r="1.1" fill="currentColor" stroke="none"/></svg>',
    bank: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9.5 12 4l9 5.5"/><path d="M4.5 9.5v9M9.5 9.5v9M14.5 9.5v9M19.5 9.5v9M2.5 20.5h19"/></svg>',
    filter: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3.5 5h17L14 13.2V20l-4-2v-4.8Z"/></svg>',
    handmade: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M8 13V5.5a1.6 1.6 0 0 1 3.2 0V11"/><path d="M11.2 10.7V4.2a1.6 1.6 0 0 1 3.2 0v6.5"/><path d="M14.4 10.5V5.8a1.6 1.6 0 0 1 3.2 0v9.7c0 3.6-2.3 6-6 6-2.4 0-3.6-.8-4.9-2.4L3 14.8c-.6-.8-.4-1.8.4-2.3.7-.4 1.6-.3 2.2.3L8 15.4"/></svg>',
    leaf: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M20 4C10 4 4 10 4 20c10 0 16-6 16-16Z"/><path d="M6.5 17.5 17 7"/></svg>',
    calendar: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>',
    refresh: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12a8 8 0 0 1 13.7-5.6L20 8.5M20 12a8 8 0 0 1-13.7 5.6L4 15.5"/><path d="M20 4.5v4h-4M4 19.5v-4h4"/></svg>',
    box: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3.5 7.5 12 3l8.5 4.5V16L12 20.5 3.5 16Z"/><path d="M3.5 7.5 12 12l8.5-4.5M12 12v8.5"/></svg>',
  };

  function icon(name, extraClass) {
    const svg = ICONS[name] || ICONS.sparkle;
    if (!extraClass) return svg;
    return svg.replace('<svg ', '<svg class="' + extraClass + '" ');
  }

  GDM.icons = { icon, raw: ICONS };
})(window.GDM = window.GDM || {});
