/* ==========================================================================
   Logótipo — recriação SVG fiel à identidade oficial (versão confirmada em
   2026-09-01): "GRÃO DE MOSTARDA" em letras douradas com efeito metálico
   sobre uma placa de couro com bordas costuradas de contorno irregular,
   gota/semente dourada no canto superior esquerdo, faixa "Personalizados
   Cristãos", versículos de referência e um anel/argola dourado metálico
   decorativo junto à faixa de versículos.
   NOTA DE PRODUÇÃO: substituir por assets/logo.webp (ficheiro oficial da
   marca, ainda não fornecido ao repositório) assim que disponível — ver
   ARCHITECTURE.md.
   ========================================================================== */
(function (GDM) {
  'use strict';

  function logoSvg(opts) {
    opts = opts || {};
    const full = !!opts.full;
    const gid1 = GDM.motifs.uid('goldText');
    const gid2 = GDM.motifs.uid('leatherPlaque');
    const gid3 = GDM.motifs.uid('seedDrop');
    const gid4 = GDM.motifs.uid('goldRing');
    return (
      '<svg viewBox="0 0 340 ' + (full ? 190 : 120) + '" role="img" aria-label="Grão de Mostarda Personalizados Cristãos">' +
        '<defs>' +
          '<linearGradient id="' + gid1 + '" x1="0" y1="0" x2="0" y2="1">' +
            '<stop offset="0" stop-color="#f5dfa4"/>' +
            '<stop offset="0.45" stop-color="#c4953f"/>' +
            '<stop offset="0.55" stop-color="#e6c583"/>' +
            '<stop offset="1" stop-color="#93672a"/>' +
          '</linearGradient>' +
          '<linearGradient id="' + gid2 + '" x1="0" y1="0" x2="1" y2="1">' +
            '<stop offset="0" stop-color="#4d2e1c"/>' +
            '<stop offset="0.5" stop-color="#2b1810"/>' +
            '<stop offset="1" stop-color="#1c1108"/>' +
          '</linearGradient>' +
          '<radialGradient id="' + gid3 + '" cx="0.35" cy="0.3" r="0.8">' +
            '<stop offset="0" stop-color="#f8e6b8"/>' +
            '<stop offset="0.6" stop-color="#c4953f"/>' +
            '<stop offset="1" stop-color="#7a5420"/>' +
          '</radialGradient>' +
          '<linearGradient id="' + gid4 + '" x1="0" y1="0" x2="1" y2="1">' +
            '<stop offset="0" stop-color="#f8e6b8"/>' +
            '<stop offset="0.5" stop-color="#c4953f"/>' +
            '<stop offset="1" stop-color="#8a6126"/>' +
          '</linearGradient>' +
        '</defs>' +
        '<path d="M22 ' + (full ? 30 : 8) + ' Q4 ' + (full ? 30 : 8) + ' 4 ' + (full ? 48 : 26) + ' L4 ' + (full ? 162 : 116) + ' Q4 ' + (full ? 180 : 134) + ' 24 ' + (full ? 180 : 134) + ' L316 ' + (full ? 180 : 134) + ' Q336 ' + (full ? 180 : 134) + ' 336 ' + (full ? 160 : 114) + ' L336 ' + (full ? 44 : 22) + ' Q336 ' + (full ? 26 : 4) + ' 314 ' + (full ? 26 : 4) + ' Z" fill="url(#' + gid2 + ')"/>' +
        '<path d="M28 ' + (full ? 34 : 12) + ' Q12 ' + (full ? 34 : 12) + ' 12 ' + (full ? 50 : 28) + ' L12 ' + (full ? 158 : 112) + ' Q12 ' + (full ? 174 : 128) + ' 28 ' + (full ? 174 : 128) + ' L312 ' + (full ? 174 : 128) + ' Q328 ' + (full ? 174 : 128) + ' 328 ' + (full ? 158 : 112) + ' L328 ' + (full ? 48 : 26) + ' Q328 ' + (full ? 32 : 10) + ' 310 ' + (full ? 32 : 10) + ' Z" fill="none" stroke="#c4953f" stroke-width="1.4" stroke-dasharray="3 4" opacity="0.7"/>' +
        '<path d="M40 ' + (full ? 12 : -6) + ' q11 15 0 28 q-11 -13 0 -28 Z" fill="url(#' + gid3 + ')" transform="translate(0 ' + (full ? 12 : 12) + ')"/>' +
        '<ellipse cx="37" cy="' + (full ? 27 : 15) + '" rx="2.4" ry="4" fill="#fbf1d6" opacity="0.85"/>' +
        (full
          ? '<text x="170" y="66" text-anchor="middle" font-family="Georgia, \'Palatino Linotype\', serif" font-size="15" letter-spacing="6" fill="url(#' + gid1 + ')">GRÃO DE</text>'
          : '<text x="170" y="52" text-anchor="middle" font-family="Georgia, \'Palatino Linotype\', serif" font-size="14" letter-spacing="5" fill="url(#' + gid1 + ')">GRÃO DE</text>') +
        (full
          ? '<text x="170" y="94" text-anchor="middle" font-family="Georgia, \'Palatino Linotype\', serif" font-weight="700" font-size="27" letter-spacing="4" fill="url(#' + gid1 + ')">MOSTARDA</text>'
          : '<text x="170" y="76" text-anchor="middle" font-family="Georgia, \'Palatino Linotype\', serif" font-weight="700" font-size="22" letter-spacing="3" fill="url(#' + gid1 + ')">MOSTARDA</text>') +
        '<path d="M96 ' + (full ? 106 : 84) + ' h148" stroke="#c4953f" stroke-width="1" opacity="0.7"/>' +
        '<text x="170" y="' + (full ? 123 : 101) + '" text-anchor="middle" font-family="Georgia, serif" font-style="italic" font-size="' + (full ? 11 : 9) + '" letter-spacing="1.4" fill="#e6c583">Personalizados Cristãos</text>' +
        (full
          ? '<text x="150" y="172" text-anchor="middle" font-family="Georgia, serif" font-size="9" letter-spacing="1" fill="#cdb896">Lc 17.6  |  Mt 17.20</text>' +
            '<circle cx="298" cy="168" r="11" fill="none" stroke="url(#' + gid4 + ')" stroke-width="3.2"/>' +
            '<circle cx="298" cy="168" r="6" fill="none" stroke="url(#' + gid4 + ')" stroke-width="1.1" opacity="0.6"/>'
          : '') +
      '</svg>'
    );
  }

  GDM.brand = { logoSvg: logoSvg };
})(window.GDM = window.GDM || {});
