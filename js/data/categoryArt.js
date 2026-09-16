/* ==========================================================================
   Ilustrações de categoria + composição de placeholder de produto.
   NOTA DE PRODUÇÃO: não existem fotografias reais de produto neste projeto.
   Estas composições SVG substituem-nas com direção de arte consistente com
   a marca. O ponto de maior impacto para fotografia real é exatamente aqui
   — cada cartão de produto e a galeria da página de produto (ver
   ARCHITECTURE.md, secção "Fotografia").
   ========================================================================== */
(function (GDM) {
  'use strict';

  const M = GDM.motifs;

  /* Ícone de 0 0 120 120 por categoria, traço + preenchimento leve. */
  const CATEGORY_ICONS = {
    biblias: function (c) {
      return '<g fill="none" stroke="' + c + '" stroke-width="3" stroke-linejoin="round" stroke-linecap="round">' +
        '<path d="M60 30c-10-8-24-10-36-8v56c12-2 26 0 36 8" fill="' + c + '" fill-opacity="0.14"/>' +
        '<path d="M60 30c10-8 24-10 36-8v56c-12-2-26 0-36 8Z" fill="' + c + '" fill-opacity="0.08"/>' +
        '<path d="M60 30v64"/>' +
        '<path d="M32 40c8-1.5 16-1 24 2M32 52c8-1.5 16-1 24 2M32 64c8-1.5 16-1 24 2"/>' +
        '<path d="M88 40c-8-1.5-16-1-24 2M88 52c-8-1.5-16-1-24 2"/>' +
      '</g>' +
      '<path d="M46 20 L46 42 L52 36 L58 42 L58 20Z" fill="#c4953f"/>';
    },
    'reforma-de-biblia': function (c) {
      return '<g fill="none" stroke="' + c + '" stroke-width="3" stroke-linejoin="round" stroke-linecap="round">' +
        '<rect x="30" y="24" width="60" height="74" rx="4" fill="' + c + '" fill-opacity="0.12"/>' +
        '<path d="M30 34h60M30 88h60"/>' +
        '<path d="M60 24v74" stroke-dasharray="2 5"/>' +
      '</g>' +
      '<g stroke="#c4953f" stroke-width="2.4" fill="none" stroke-linecap="round">' +
        '<path d="M24 46 Q60 36 96 46"/><path d="M24 58 Q60 48 96 58"/><path d="M24 70 Q60 60 96 70"/>' +
      '</g>' +
      '<circle cx="24" cy="46" r="2.6" fill="#c4953f"/><circle cx="96" cy="70" r="2.6" fill="#c4953f"/>';
    },
    'canecas-personalizadas': function (c) {
      return '<g fill="none" stroke="' + c + '" stroke-width="3" stroke-linejoin="round" stroke-linecap="round">' +
        '<path d="M32 40h44v40a10 10 0 0 1-10 10H42a10 10 0 0 1-10-10Z" fill="' + c + '" fill-opacity="0.12"/>' +
        '<path d="M76 48h8a10 10 0 0 1 0 20h-8"/>' +
        '<path d="M46 24c-4 4-4 8 0 12M58 20c-4 4-4 8 0 12M70 24c-4 4-4 8 0 12" stroke-opacity="0.55"/>' +
      '</g>' +
      '<circle cx="54" cy="66" r="12" fill="none" stroke="#c4953f" stroke-width="2.2"/>' +
      '<path d="M49 66l3.5 3.5L60 61" fill="none" stroke="#c4953f" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>';
    },
    'tshirts-temas-cristaos': function (c) {
      return '<g fill="' + c + '" fill-opacity="0.14" stroke="' + c + '" stroke-width="3" stroke-linejoin="round">' +
        '<path d="M42 22 24 32l6 14 10-5v57h40V41l10 5 6-14-18-10c-3 5-9 8-16 8s-13-3-16-8Z"/>' +
      '</g>' +
      '<g stroke="#c4953f" stroke-width="2.4" fill="none" stroke-linecap="round" stroke-linejoin="round">' +
        '<path d="M60 46v34M50 56h20"/>' +
        '<path d="M42 78c4-4 8-4 12 0s8 4 12 0" opacity="0.6"/>' +
      '</g>';
    },
    'decoracao-crista': function (c) {
      return '<g fill="none" stroke="' + c + '" stroke-width="3" stroke-linejoin="round">' +
        '<rect x="26" y="26" width="68" height="68" rx="3" fill="' + c + '" fill-opacity="0.1"/>' +
        '<rect x="34" y="34" width="52" height="52" rx="2"/>' +
      '</g>' +
      '<path d="M60 46v28M50 56h20" stroke="#c4953f" stroke-width="2.6" stroke-linecap="round"/>' +
      '<path d="M60 14v10M56 20l4-6 4 6" fill="none" stroke="' + c + '" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>';
    },
    'kit-pintura-infantil': function (c) {
      return '<path d="M60 24c-22 0-38 14-38 32 0 12 8 18 18 18 4 0 5-3 3-6-3-4 0-8 5-8h14c11 0 20-9 20-20 0-9-9-16-22-16Z" fill="' + c + '" fill-opacity="0.16" stroke="' + c + '" stroke-width="3"/>' +
      '<circle cx="46" cy="42" r="5" fill="#a3392f"/><circle cx="62" cy="34" r="5" fill="#c4953f"/><circle cx="78" cy="44" r="5" fill="#4c7a4f"/><circle cx="70" cy="58" r="5" fill="#7d4c2c"/>' +
      '<path d="M84 78 98 92" stroke="#7d4c2c" stroke-width="6" stroke-linecap="round"/>' +
      '<path d="M78 72 92 86" stroke="#e6c583" stroke-width="6" stroke-linecap="round"/>';
    },
    'porta-chaves': function (c) {
      return '<circle cx="46" cy="30" r="14" fill="none" stroke="' + c + '" stroke-width="3.4"/>' +
      '<path d="M46 44v10" stroke="' + c + '" stroke-width="3.4"/>' +
      '<path d="M36 56h48a6 6 0 0 1 6 6v26a6 6 0 0 1-6 6H36a6 6 0 0 1-6-6V62a6 6 0 0 1 6-6Z" fill="' + c + '" fill-opacity="0.14" stroke="' + c + '" stroke-width="3" stroke-linejoin="round"/>' +
      '<path d="M40 56v-4a4 4 0 0 1 4-4h32a4 4 0 0 1 4 4v4" fill="none" stroke="' + c + '" stroke-width="3"/>' +
      '<text x="60" y="80" text-anchor="middle" font-family="Georgia, serif" font-size="18" fill="#c4953f">GM</text>';
    },
    'cadernos-a4': function (c) {
      return '<g fill="' + c + '" fill-opacity="0.12" stroke="' + c + '" stroke-width="3" stroke-linejoin="round">' +
        '<rect x="28" y="20" width="56" height="80" rx="3"/>' +
      '</g>' +
      '<path d="M28 32h56M28 44h56M28 56h56M28 68h56M28 80h40" stroke="' + c + '" stroke-width="1.4" stroke-opacity="0.5"/>' +
      '<rect x="80" y="14" width="10" height="34" rx="2" fill="#c4953f"/>' +
      '<path d="M92 24 82 78" stroke="#7d4c2c" stroke-width="3" stroke-linecap="round"/>';
    },
    'cadernos-a5': function (c) {
      return '<g fill="' + c + '" fill-opacity="0.1" stroke="' + c + '" stroke-width="2.6" stroke-linejoin="round">' +
        '<rect x="24" y="34" width="46" height="62" rx="3" transform="rotate(-6 24 34)"/>' +
        '<rect x="52" y="26" width="46" height="62" rx="3" fill-opacity="0.16"/>' +
      '</g>' +
      '<path d="M58 38h32M58 48h32M58 58h32M58 68h22" stroke="' + c + '" stroke-width="1.3" stroke-opacity="0.5"/>' +
      '<rect x="52" y="22" width="9" height="26" rx="2" fill="#c4953f"/>';
    },
  };

  const CATEGORY_BG = ['#3a2216', '#4d2e1c', '#2b1810', '#653c23'];

  function categoryIconSvg(slug, color, size) {
    const build = CATEGORY_ICONS[slug] || CATEGORY_ICONS.biblias;
    size = size || 48;
    return '<svg viewBox="0 0 120 120" width="' + size + '" height="' + size + '" aria-hidden="true" focusable="false">' + build(color || '#7d4c2c') + '</svg>';
  }

  /** Composição completa usada em cartões de produto e galeria. */
  function productArt(product) {
    const bg = CATEGORY_BG[Math.abs(hash(product.slug)) % CATEGORY_BG.length];
    const pid = GDM.security.escapeHTML(product.slug);
    const gid = M.uid('artBg');
    const patId = M.uid('grain');
    const iconMarkup = (CATEGORY_ICONS[product.category] || CATEGORY_ICONS.biblias)('#e6c583');
    const label = GDM.security.escapeHTML(product.categoryLabel || '');
    return (
      '<svg viewBox="0 0 400 500" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="' + GDM.security.escapeHTML(product.name) + ' — pré-visualização ilustrada" preserveAspectRatio="xMidYMid slice">' +
        '<defs>' +
          '<linearGradient id="' + gid + '" x1="0" y1="0" x2="1" y2="1">' +
            '<stop offset="0" stop-color="' + lighten(bg, 12) + '"/>' +
            '<stop offset="1" stop-color="' + bg + '"/>' +
          '</linearGradient>' +
          '<pattern id="' + patId + '" width="60" height="60" patternUnits="userSpaceOnUse" patternTransform="rotate(12)">' +
            '<circle cx="10" cy="10" r="1.4" fill="#f0dbac" opacity="0.18"/>' +
            '<circle cx="40" cy="34" r="1" fill="#f0dbac" opacity="0.14"/>' +
          '</pattern>' +
        '</defs>' +
        '<rect width="400" height="500" fill="url(#' + gid + ')"/>' +
        '<rect width="400" height="500" fill="url(#' + patId + ')"/>' +
        '<g transform="translate(-10,-10) scale(1.3)" opacity="0.8">' + M.cornerSprig({ color: '#8a9a7a' }) + '</g>' +
        '<g transform="translate(410,510) scale(-1.3,-1.3) translate(-10,-10)" opacity="0.55">' + M.cornerSprig({ color: '#c9d3ba' }) + '</g>' +
        '<circle cx="200" cy="215" r="118" fill="#241a12" opacity="0.18"/>' +
        '<circle cx="200" cy="210" r="112" fill="none" stroke="#e6c583" stroke-width="1.4" stroke-opacity="0.55"/>' +
        '<g transform="translate(140,150)">' + '<svg viewBox="0 0 120 120" width="120" height="120">' + iconMarkup + '</svg>' + '</g>' +
        '<g transform="translate(200,392)">' +
          '<rect x="-92" y="-20" width="184" height="40" rx="20" fill="#1c1108" opacity="0.35"/>' +
          '<text x="0" y="6" text-anchor="middle" font-family="Georgia, \'Palatino Linotype\', serif" font-size="16" letter-spacing="1" fill="#f0dbac">' + label + '</text>' +
        '</g>' +
      '</svg>'
    );
  }

  function hash(str) {
    let h = 0;
    for (let i = 0; i < str.length; i++) { h = (h << 5) - h + str.charCodeAt(i); h |= 0; }
    return h;
  }

  function lighten(hex, amt) {
    const n = parseInt(hex.slice(1), 16);
    let r = (n >> 16) + amt, g = ((n >> 8) & 0xff) + amt, b = (n & 0xff) + amt;
    r = Math.min(255, r); g = Math.min(255, g); b = Math.min(255, b);
    return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
  }

  GDM.categoryArt = { categoryIconSvg, productArt };
})(window.GDM = window.GDM || {});
