/* ==========================================================================
   Motivos botânicos — folhas, ramos de mostardeira, sementes.
   Desenhados com nervuras, gradientes e sombra para não parecerem clipart
   genérico. Várias variantes/espécies para evitar repetição do mesmo
   formato. Todo o markup é fixo/gerado internamente — seguro para innerHTML.
   ========================================================================== */
(function (GDM) {
  'use strict';

  let uidCounter = 0;
  function uid(prefix) { uidCounter += 1; return (prefix || 'gdm') + '-' + uidCounter; }

  /** Folha com nervura central e veios secundários, desenhada numa caixa
   *  fixa de 40x40 — os chamadores escalam via transform="scale(...)" no
   *  grupo envolvente. variant: 'olive'|'bay'|'round'|'trifoil' */
  function leaf(variant, opts) {
    opts = opts || {};
    const color = opts.color || '#6b7b5e';
    const rotate = opts.rotate || 0;
    const gid = uid('leafShade');
    let shape;
    if (variant === 'bay') {
      shape = 'M20 2C9 8 6 20 20 38 34 20 31 8 20 2Z';
    } else if (variant === 'round') {
      shape = 'M20 3C8 3 3 12 3 20c0 9 8 15 17 15s17-6 17-15C37 12 32 3 20 3Z';
    } else if (variant === 'trifoil') {
      shape = 'M20 4c3 6 1 10-2 12 5-1 9 1 10 6 1-6 5-8 9-7-4-3-4-8-1-12-5 3-9 2-11-2-1 4-4 5-8 4 2-1 3-1 3-1Z';
    } else {
      shape = 'M20 1C6 10 2 22 20 39 38 22 34 10 20 1Z'; /* olive */
    }
    return (
      '<g transform="rotate(' + rotate + ' 20 20)">' +
        '<defs><linearGradient id="' + gid + '" x1="0" y1="0" x2="1" y2="1">' +
          '<stop offset="0" stop-color="' + color + '" stop-opacity="0.55"/>' +
          '<stop offset="1" stop-color="' + color + '" stop-opacity="1"/>' +
        '</linearGradient></defs>' +
        '<path d="' + shape + '" fill="url(#' + gid + ')" stroke="' + color + '" stroke-width="0.6" stroke-opacity="0.5"/>' +
        '<path d="M20 4 L20 36" stroke="' + color + '" stroke-opacity="0.55" stroke-width="0.9" fill="none"/>' +
        '<path d="M20 11 L14 8 M20 11 L26 8 M20 18 L13 15 M20 18 L27 15 M20 25 L14 23 M20 25 L26 23" stroke="' + color + '" stroke-opacity="0.4" stroke-width="0.6" fill="none"/>' +
      '</g>'
    );
  }

  /** Semente/grão dourado com gradiente e sombra suave. */
  function seed(opts) {
    opts = opts || {};
    const r = opts.r || 5;
    const gid = uid('seedShine');
    return (
      '<g>' +
        '<defs><radialGradient id="' + gid + '" cx="0.35" cy="0.3" r="0.75">' +
          '<stop offset="0" stop-color="#f3d9a0"/>' +
          '<stop offset="0.55" stop-color="#c4953f"/>' +
          '<stop offset="1" stop-color="#8a6226"/>' +
        '</radialGradient></defs>' +
        '<ellipse cx="0" cy="' + (r * 0.15) + '" rx="' + (r * 1.05) + '" ry="' + (r * 0.4) + '" fill="#2b1810" opacity="0.18"/>' +
        '<circle r="' + r + '" fill="url(#' + gid + ')"/>' +
        '<ellipse cx="' + (-r * 0.32) + '" cy="' + (-r * 0.32) + '" rx="' + (r * 0.28) + '" ry="' + (r * 0.18) + '" fill="#fff" opacity="0.55"/>' +
      '</g>'
    );
  }

  /** Ramo curvo de mostardeira com vagens/sementes e folhas alternadas. */
  function mustardBranch(opts) {
    opts = opts || {};
    const w = opts.width || 220;
    const h = opts.height || 90;
    const color = opts.leafColor || '#6b7b5e';
    const flipTransform = opts.flip ? 'translate(' + w + ' 0) scale(-1,1)' : '';
    const seeds = [];
    const positions = [[0.14, -6, 4.2], [0.32, 10, 5.4], [0.5, -10, 4.8], [0.68, 8, 5.8], [0.86, -4, 4.4]];
    positions.forEach(function (p) {
      seeds.push('<g transform="translate(' + (p[0] * w) + ' ' + (h / 2 + p[1]) + ')">' + seed({ r: p[2] }) + '</g>');
    });
    return (
      '<g transform="' + flipTransform + '">' +
      '<path d="M2 ' + (h / 2) + ' Q ' + (w * 0.5) + ' ' + (h / 2 - 30) + ' ' + (w - 2) + ' ' + (h / 2) + '" fill="none" stroke="#7d4c2c" stroke-width="2.4" stroke-linecap="round"/>' +
      '<g transform="translate(' + (w * 0.2) + ' ' + (h / 2 - 18) + ') scale(0.55)">' + leaf('olive', { color: color, rotate: -20 }) + '</g>' +
      '<g transform="translate(' + (w * 0.46) + ' ' + (h / 2 + 6) + ') scale(0.5)">' + leaf('bay', { color: color, rotate: 15 }) + '</g>' +
      '<g transform="translate(' + (w * 0.74) + ' ' + (h / 2 - 20) + ') scale(0.5)">' + leaf('round', { color: color, rotate: -8 }) + '</g>' +
      seeds.join('') +
      '</g>'
    );
  }

  /** Grinalda/divisor decorativo com folhas e sementes variadas — usar em separadores de secção. */
  function sprigDivider() {
    return (
      '<svg viewBox="0 0 240 40" width="180" height="30" aria-hidden="true" focusable="false">' +
        '<g transform="translate(120 20)">' +
          '<path d="M-100 0 H-16" stroke="#c4953f" stroke-width="1" opacity="0.6"/>' +
          '<path d="M100 0 H16" stroke="#c4953f" stroke-width="1" opacity="0.6"/>' +
          '<g transform="translate(-16 0) scale(0.4) translate(-20,-20)">' + leaf('trifoil', { color: '#93672a', rotate: 10 }) + '</g>' +
          seed({ r: 3.4 }) +
          '<g transform="translate(16 0) scale(0.4) translate(-20,-20)">' + leaf('trifoil', { color: '#93672a', rotate: -10 }) + '</g>' +
        '</g>' +
      '</svg>'
    );
  }

  /** Ramo de canto para cartões/hero — composição maior com múltiplas espécies. */
  function cornerSprig(opts) {
    opts = opts || {};
    const color = opts.color || '#8a9a7a';
    return (
      '<g opacity="' + (opts.opacity || 0.9) + '">' +
        '<g transform="translate(6 60) rotate(-18) scale(0.9)">' + leaf('olive', { color: color, rotate: 0 }) + '</g>' +
        '<g transform="translate(26 30) rotate(14) scale(0.7)">' + leaf('bay', { color: color, rotate: 0 }) + '</g>' +
        '<g transform="translate(4 10) rotate(-6) scale(0.55)">' + leaf('round', { color: color, rotate: 0 }) + '</g>' +
        '<g transform="translate(40 55)">' + seed({ r: 5 }) + '</g>' +
        '<g transform="translate(52 34)">' + seed({ r: 3.6 }) + '</g>' +
        '<g transform="translate(24 74)">' + seed({ r: 4 }) + '</g>' +
      '</g>'
    );
  }

  GDM.motifs = { uid, leaf, seed, mustardBranch, sprigDivider, cornerSprig };
})(window.GDM = window.GDM || {});
