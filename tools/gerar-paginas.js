/* ==========================================================================
   Gera as páginas dependentes do catálogo (js/data/products.js) e do
   conteúdo institucional (js/data/content.js): as fichas de produto
   (produto-<slug>.html), a grelha da loja.html, a secção "Peças mais
   procuradas" da index.html, o sitemap.xml e o molde comum a todas as
   páginas da raiz (<head>, cabeçalho, rodapé — ver regenerateChrome).

   Uso:  node tools/gerar-paginas.js

   Como funciona: usa o HTML já existente de cada página como molde e
   substitui só as partes que dependem dos dados do produto (nome, preço,
   descrição, stock, categoria, meta tags, JSON-LD, "também vai gostar").
   Tudo o resto (SVGs ilustrativos, CSS, JS, secções institucionais) fica
   byte a byte igual. Se um produto novo aparecer em products.js, a
   página produto-<slug>.html é criada a partir de outra como molde. Se
   um produto desaparecer, a página antiga não é apagada — fica só um
   aviso na consola.
   ========================================================================== */
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const crypto = require('crypto');

const ROOT = path.join(__dirname, '..');
const rp = (...segments) => path.join(ROOT, ...segments);

/* -------------------------------------------------------------------------
   Carregar os módulos reais de js/ (sem DOM — só construção de strings) para
   reaproveitar exatamente a mesma lógica de ilustração/formatação/segurança
   que o site usa em runtime, em vez de a duplicar aqui.
   ------------------------------------------------------------------------- */
const sandbox = { window: {} };
vm.createContext(sandbox);
function loadModule(rel) {
  vm.runInContext(fs.readFileSync(rp(rel), 'utf8'), sandbox, { filename: rel });
}
['js/utils/security.js', 'js/data/motifs.js', 'js/data/categoryArt.js', 'js/data/icons.js', 'js/utils/format.js', 'js/data/products.js', 'js/data/content.js']
  .forEach(loadModule);

const GDM = sandbox.window.GDM;
const PRODUCTS = GDM.catalog.PRODUCTS;
const CATEGORIES = GDM.catalog.CATEGORIES;
const SITE_URL = GDM.content.BRAND.siteUrl;

/* Lê um ficheiro de texto com as quebras de linha normalizadas para \n
   (no Windows o git pode ter feito checkout com \r\n). Os ficheiros
   escritos pelo gerador ficam sempre com \n — o git normaliza na mesma. */
function readText(filePath) {
  return fs.readFileSync(filePath, 'utf8').replace(/\r\n/g, '\n');
}

function escAttr(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
function escText(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
}
function priceHtml(value) {
  return GDM.format.currency(value).replace(/ /g, '&nbsp;');
}
function relatedFor(product) {
  return PRODUCTS.filter((p) => p.category === product.category && p.id !== product.id).slice(0, 4);
}
/* Nota: usa o caractere de espaço insecável real (nunca a entidade &nbsp;)
   porque o resultado ainda vai passar por escAttr/escText — a entidade só é
   inserida no fim, depois de escapar o resto do texto. */
function metaDescriptionRaw(product) {
  return product.name + ' — ' + product.categoryLabel + ' a partir de ' + GDM.format.currency(product.price) + '. ' + product.description;
}

/* Encontra o índice logo a seguir ao fecho da tag aberta em openIdx,
   contando aberturas/fechos aninhados da mesma tag (ex.: <div>...<div>...</div>...</div>). */
function findBlockEnd(html, openIdx, tagName) {
  const openNeedle = '<' + tagName;
  const closeNeedle = '</' + tagName + '>';
  let depth = 0;
  let i = openIdx;
  for (;;) {
    const no = html.indexOf(openNeedle, i);
    const nc = html.indexOf(closeNeedle, i);
    if (nc === -1) return -1;
    if (no !== -1 && no < nc) { depth++; i = no + openNeedle.length; }
    else { depth--; i = nc + closeNeedle.length; if (depth === 0) return i; }
  }
}

/* -------------------------------------------------------------------------
   Ilustrações de produto em ficheiro (assets/art/<slug>.svg) em vez de SVG
   inline repetido em cada página: o browser descarrega cada uma uma vez e
   guarda-a em cache. Os SVGs não dependem de CSS da página (cores fixas,
   sem currentColor nem variáveis), por isso ficam iguais dentro de <img>.
   ------------------------------------------------------------------------- */
const artFiles = new Map(); // caminho absoluto -> conteúdo, escritos no fim por main()

/* Os ids internos (gradientes/padrões) vêm de um contador global — são
   renumerados por ficheiro para o resultado ser sempre o mesmo. */
function normalizeSvgIds(svg) {
  const ids = [];
  svg.replace(/ id="([^"]+)"/g, (_m, id) => { if (!ids.includes(id)) ids.push(id); return _m; });
  ids.forEach((id, i) => {
    const next = 'a' + (i + 1);
    svg = svg.split(' id="' + id + '"').join(' id="' + next + '"').split('url(#' + id + ')').join('url(#' + next + ')');
  });
  return svg;
}

function artPath(product, variant) {
  const name = product.slug + (variant ? '-' + variant : '') + '.svg';
  if (!artFiles.has(name)) {
    const art = GDM.categoryArt.productArt(variant ? Object.assign({}, product, { slug: product.slug + '-' + variant }) : product);
    // tamanho intrínseco explícito: sem ele o browser assume 300×150 dentro de <img>
    artFiles.set(name, normalizeSvgIds(art).replace('<svg viewBox="0 0 400 500"', '<svg width="400" height="500" viewBox="0 0 400 500"') + '\n');
  }
  return 'assets/art/' + name;
}

/* <img> de uma ilustração. opts.priority = primeira fila / imagem principal
   (eager + fetchpriority alta); sem isso, lazy. */
function artImg(product, opts) {
  opts = opts || {};
  const loading = opts.priority ? ' loading="eager" fetchpriority="high"' : (opts.eager ? '' : ' loading="lazy"');
  return '<img class="product-art" src="' + artPath(product, opts.variant) + '" width="400" height="500" alt="' + escAttr(product.name) + ' — pré-visualização ilustrada"' + loading + ' decoding="async">';
}

let warnings = [];
function warn(msg) { warnings.push(msg); console.warn('AVISO: ' + msg); }

/* -------------------------------------------------------------------------
   Cartão de produto (usado na loja, no destaque da Início e em "também
   vai gostar"): só troca texto/atributos — nunca toca no SVG interno.
   ------------------------------------------------------------------------- */
function patchCard(html, cardOpenIdx, product, mediaOpts) {
  const cardEnd = findBlockEnd(html, cardOpenIdx, 'article');
  if (cardEnd === -1) return null;
  let card = html.slice(cardOpenIdx, cardEnd);

  const mediaStart = card.indexOf('<div class="product-card__media">');
  if (mediaStart !== -1) {
    const mediaEnd = findBlockEnd(card, mediaStart, 'div');
    card = card.slice(0, mediaStart) + '<div class="product-card__media">' + artImg(product, mediaOpts) + '</div>' + card.slice(mediaEnd);
  }

  const badgesHtml = '<div class="product-card__badges">' +
    (product.featured ? '<span class="badge badge--gold">Destaque</span>' : '') +
    (product.oldPrice ? '<span class="badge badge--sale">Promoção</span>' : '') +
    '</div>';
  card = card.replace(/<div class="product-card__badges">[\s\S]*?<\/div>/, badgesHtml);

  card = card.replace(/<span class="product-card__cat">[^<]*<\/span>/, '<span class="product-card__cat">' + escText(product.categoryLabel) + '</span>');

  const href = 'produto-' + product.slug + '.html';
  card = card.replace(/<h3 class="product-card__title"><a href="[^"]*">[^<]*<\/a><\/h3>/,
    '<h3 class="product-card__title"><a href="' + href + '">' + escText(product.name) + '</a></h3>');

  if (card.indexOf('product-card__desc') !== -1) {
    card = card.replace(/<p class="product-card__desc">[^<]*<\/p>/, '<p class="product-card__desc">' + escText(product.description) + '</p>');
  }

  const metaHtml = '<div class="product-card__meta"><span class="product-card__price">' + priceHtml(product.price) + '</span>' +
    (product.oldPrice ? '<span class="product-card__price--old">' + priceHtml(product.oldPrice) + '</span>' : '') +
    '</div>';
  card = card.replace(/<div class="product-card__meta">[\s\S]*?<\/div>/, metaHtml);

  card = card.replace(/<a class="btn btn--outline btn--sm btn--block" href="[^"]*">Ver produto<\/a>/,
    '<a class="btn btn--outline btn--sm btn--block" href="' + href + '">Ver produto</a>');

  return html.slice(0, cardOpenIdx) + card + html.slice(cardEnd);
}

/* Constrói um cartão de produto de raiz (só usado quando uma secção muda de
   composição — produto novo/removido/reordenado — porque nesse caso não há
   cartão antigo para reaproveitar). IDs internos do SVG são novos: não têm
   qualquer efeito visual (são só referências de gradiente/padrão). */
function buildCard(product, opts) {
  opts = opts || {};
  const href = 'produto-' + product.slug + '.html';
  const media = '<div class="product-card__media">' + artImg(product, opts.media) + '</div>';
  const fav = '<button class="product-card__fav" type="button" aria-pressed="false" aria-label="Adicionar aos favoritos">' + GDM.icons.icon('heart') + '</button>';
  const badges = '<div class="product-card__badges">' +
    (product.featured ? '<span class="badge badge--gold">Destaque</span>' : '') +
    (product.oldPrice ? '<span class="badge badge--sale">Promoção</span>' : '') +
    '</div>';
  const desc = opts.hero ? '<p class="product-card__desc">' + escText(product.description) + '</p>' : '';
  const meta = '<div class="product-card__meta"><span class="product-card__price">' + priceHtml(product.price) + '</span>' +
    (product.oldPrice ? '<span class="product-card__price--old">' + priceHtml(product.oldPrice) + '</span>' : '') + '</div>';
  return '<article class="product-card' + (opts.hero ? ' product-card--hero' : '') + '" data-reveal="' + (opts.reveal || 'fade') + '" style="--reveal-index: ' + (opts.revealIndex || 0) + ';">' +
    '<div style="position:relative">' + media + fav + badges + '</div>' +
    '<div class="product-card__body"><span class="product-card__cat">' + escText(product.categoryLabel) + '</span>' +
    '<h3 class="product-card__title"><a href="' + href + '">' + escText(product.name) + '</a></h3>' +
    desc + meta + '</div>' +
    '<div class="product-card__footer"><a class="btn btn--outline btn--sm btn--block" href="' + href + '">Ver produto</a></div>' +
    '</article>';
}

/* Aplica patchCard a cada <article class="product-card" a seguir a
   startIdx, na ordem dada por expectedSlugs. Se a lista de slugs já
   presente no HTML não bater certo com expectedSlugs (produto novo,
   removido ou secção reordenada), devolve null para o chamador decidir
   regenerar a secção inteira. */
function patchCardSequence(html, startIdx, endIdx, expectedProducts, mediaOptsFor) {
  const region = html.slice(startIdx, endIdx);
  const hrefs = [...region.matchAll(/<h3 class="product-card__title"><a href="produto-([^"]+)\.html">/g)].map((m) => m[1]);
  const expectedSlugs = expectedProducts.map((p) => p.slug);
  if (hrefs.length !== expectedSlugs.length || hrefs.some((h, i) => h !== expectedSlugs[i])) return null;

  let out = html;
  // percorre de trás para a frente para não invalidar índices já calculados
  const positions = [];
  let idx = startIdx;
  for (let i = 0; i < expectedProducts.length; i++) {
    idx = out.indexOf('<article class="product-card', idx);
    positions.push(idx);
    idx = findBlockEnd(out, idx, 'article');
  }
  for (let i = positions.length - 1; i >= 0; i--) {
    const patched = patchCard(out, positions[i], expectedProducts[i], mediaOptsFor ? mediaOptsFor(i) : null);
    if (patched === null) return null;
    out = patched;
  }
  return out;
}

/* -------------------------------------------------------------------------
   Página de produto individual
   ------------------------------------------------------------------------- */
function buildProductPagePath(slug) { return rp('produto-' + slug + '.html'); }

function regenerateProductPage(product, existingHtml) {
  let html = existingHtml;
  const name = product.name;
  const titleText = escText(name) + ' · Grão de Mostarda Personalizados';
  const titleAttr = escAttr(name) + ' · Grão de Mostarda Personalizados';
  const descFull = escAttr(metaDescriptionRaw(product)).replace(/ /g, '&nbsp;');
  const canonical = SITE_URL + '/produto-' + product.slug + '.html';

  html = html.replace(/<title>[^<]*<\/title>/, '<title>' + titleText + '</title>');
  html = html.replace(/<meta name="description" content="[^"]*">/, '<meta name="description" content="' + descFull + '">');
  html = html.replace(/<meta property="og:title" content="[^"]*">/, '<meta property="og:title" content="' + titleAttr + '">');
  html = html.replace(/<meta property="og:description" content="[^"]*">/, '<meta property="og:description" content="' + descFull + '">');
  html = html.replace(/<link rel="canonical" href="[^"]*">/, '<link rel="canonical" href="' + canonical + '">');
  html = html.replace(/<meta property="og:url" content="[^"]*">/, '<meta property="og:url" content="' + canonical + '">');
  html = html.replace(/<meta name="twitter:title" content="[^"]*">/, '<meta name="twitter:title" content="' + titleAttr + '">');
  html = html.replace(/<meta name="twitter:description" content="[^"]*">/, '<meta name="twitter:description" content="' + descFull + '">');

  const productLd = {
    '@context': 'https://schema.org', '@type': 'Product',
    name: product.name, description: product.description,
    image: SITE_URL + '/assets/og-image.png', category: product.categoryLabel,
    offers: { '@type': 'Offer', priceCurrency: 'EUR', price: product.price.toFixed(2), availability: 'https://schema.org/InStock', url: canonical },
  };
  html = html.replace(/(<script type="application\/ld\+json" id="ld-product" data-gdm-ld="">)([\s\S]*?)(<\/script>)/, '$1' + JSON.stringify(productLd) + '$3');

  const breadcrumbLd = {
    '@context': 'https://schema.org', '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Início', item: SITE_URL + '/' },
      { '@type': 'ListItem', position: 2, name: 'Loja', item: SITE_URL + '/loja.html' },
      { '@type': 'ListItem', position: 3, name: product.categoryLabel, item: SITE_URL + '/loja.html?categoria=' + product.category },
      { '@type': 'ListItem', position: 4, name: product.name, item: canonical },
    ],
  };
  html = html.replace(/(<script type="application\/ld\+json" id="ld-breadcrumb" data-gdm-ld="">)([\s\S]*?)(<\/script>)/, '$1' + JSON.stringify(breadcrumbLd) + '$3');

  html = html.replace(/<body data-gdm-page="produto" data-product-slug="[^"]*">/, '<body data-gdm-page="produto" data-product-slug="' + product.slug + '">');

  // breadcrumb visível
  html = html.replace(/(<nav class="breadcrumb"[^>]*>)([\s\S]*?)(<\/nav>)/, function (_m, open, _mid, close) {
    return open +
      '<a href="index.html">Início</a><span aria-hidden="true">/</span>' +
      '<a href="loja.html">Loja</a><span aria-hidden="true">/</span>' +
      '<a href="loja.html?categoria=' + product.category + '">' + escText(product.categoryLabel) + '</a><span aria-hidden="true">/</span>' +
      '<span aria-current="page">' + escText(product.name) + '</span>' + close;
  });

  // painel de informação do produto
  html = html.replace(/<span class="badge badge--outline">[^<]*<\/span><h1 class="product-info__title">[^<]*<\/h1>/,
    '<span class="badge badge--outline">' + escText(product.categoryLabel) + '</span><h1 class="product-info__title">' + escText(product.name) + '</h1>');

  const priceRow = '<div class="product-info__price-row"><span class="product-info__price">' + priceHtml(product.price) + '</span>' +
    (product.oldPrice ? '<span class="product-card__price--old">' + priceHtml(product.oldPrice) + '</span>' : '') + '</div>';
  html = html.replace(/<div class="product-info__price-row">[\s\S]*?<\/div>/, priceRow);

  const stockOk = product.stock > 5;
  const stockLabel = stockOk ? 'Em stock' : (product.stock > 0 ? 'Últimas unidades (' + product.stock + ')' : 'Esgotado');
  html = html.replace(/<p class="product-info__stock [^"]*">[^<]*<\/p>/,
    '<p class="product-info__stock ' + (stockOk ? 'product-info__stock--ok' : 'product-info__stock--low') + '">' + stockLabel + '</p>');

  html = html.replace(/<p class="product-info__desc">[^<]*<\/p>/, '<p class="product-info__desc">' + escText(product.description) + '</p>');
  html = html.replace(/(<input type="number" min="1" max=")\d+("[^>]*>)/, '$1' + product.stock + '$2');

  // galeria (imagem principal + 3 miniaturas) — sempre reescrita de raiz
  html = regenerateGallery(html, product);

  // separador "Descrição" (texto longo)
  html = html.replace(/<div class="detail-tabs__panel"><p>[^<]*<\/p><\/div>/, '<div class="detail-tabs__panel"><p>' + escText(product.long) + '</p></div>');

  // "também vai gostar"
  const related = relatedFor(product);
  const eyebrowIdx = html.indexOf('<p class="eyebrow">Também vai gostar</p>');
  if (eyebrowIdx !== -1) {
    html = html.replace(/<h2 style="margin-bottom:24px">Mais em [^<]*<\/h2>/, '<h2 style="margin-bottom:24px">Mais em ' + escText(product.categoryLabel) + '</h2>');
    const gridOpenIdx = html.indexOf('<div class="grid-auto">', eyebrowIdx);
    const gridEndIdx = findBlockEnd(html, gridOpenIdx, 'div');
    if (related.length === 0) {
      warn('produto ' + product.slug + ': categoria "' + product.category + '" ficou sem outros produtos — secção "também vai gostar" não foi limpa automaticamente (caso raro, revê manualmente).');
    } else {
      const patched = patchCardSequence(html, gridOpenIdx, gridEndIdx, related);
      if (patched !== null) {
        html = patched;
      } else {
        warn('produto ' + product.slug + ': lista de "também vai gostar" mudou de composição — secção regenerada com novos ids internos de SVG (sem impacto visual).');
        const cardsHtml = related.map((p) => buildCard(p, { reveal: 'fade', revealIndex: 0 })).join('');
        const newGrid = '<div class="grid-auto">' + cardsHtml + '</div>';
        html = html.slice(0, gridOpenIdx) + newGrid + html.slice(gridEndIdx);
      }
    }
  }

  return html;
}

function buildNewProductPage(product, donorSlug) {
  const donorPath = buildProductPagePath(donorSlug);
  if (!fs.existsSync(donorPath)) throw new Error('molde "' + donorSlug + '" não encontrado para criar página nova.');
  const donorHtml = readText(donorPath);
  const donorProduct = GDM.catalog.getBySlug(donorSlug);
  let html = regenerateProductPage(donorProduct, donorHtml); // normaliza o molde primeiro
  html = regenerateProductPage(product, html); // depois aplica os dados do produto novo (troca tudo)
  // regenera a galeria de raiz, porque o molde não tem os SVGs corretos para este produto
  html = regenerateGallery(html, product);
  return html;
}

function regenerateGallery(html, product) {
  const variants = ['', 'b', 'c'];
  const mainStart = html.indexOf('<div class="product-gallery__main">');
  const mainEnd = findBlockEnd(html, mainStart, 'div');
  const mainBlock = '<div class="product-gallery__main">' + artImg(product, { priority: true }) + '</div>';

  const thumbsStart = html.indexOf('<div class="product-gallery__thumbs">');
  const thumbsEnd = findBlockEnd(html, thumbsStart, 'div');
  const thumbsInner = variants.map((v, idx) =>
    '<button type="button" aria-current="' + (idx === 0 ? 'true' : 'false') + '" aria-label="Ver imagem ' + (idx + 1) + ' de ' + escAttr(product.name) + '">' + artImg(product, { variant: v, eager: true }) + '</button>'
  ).join('');
  const thumbsBlock = '<div class="product-gallery__thumbs">' + thumbsInner + '</div>';

  html = html.slice(0, thumbsStart) + thumbsBlock + html.slice(thumbsEnd);
  html = html.slice(0, mainStart) + mainBlock + html.slice(mainEnd);
  return html;
}

/* -------------------------------------------------------------------------
   loja.html — grelha de produtos
   ------------------------------------------------------------------------- */
function regenerateShop(html) {
  const ordered = PRODUCTS.slice().sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0));
  const gridOpenIdx = html.indexOf('<div class="grid-auto">');
  const gridEndIdx = findBlockEnd(html, gridOpenIdx, 'div');
  const firstRow = (i) => ({ priority: i < 4 });
  const patched = patchCardSequence(html, gridOpenIdx, gridEndIdx, ordered, firstRow);
  if (patched !== null) return patched;
  warn('loja.html: composição da grelha mudou (produto novo/removido/destaque alterado) — grelha regenerada com novos ids internos de SVG (sem impacto visual).');
  const cardsHtml = ordered.map((p, i) => buildCard(p, { reveal: 'fade', revealIndex: i % 6, media: firstRow(i) })).join('');
  return html.slice(0, gridOpenIdx) + '<div class="grid-auto">' + cardsHtml + '</div>' + html.slice(gridEndIdx);
}

/* -------------------------------------------------------------------------
   index.html — "Peças mais procuradas"
   ------------------------------------------------------------------------- */
function regenerateFeatured(html) {
  const picks = GDM.catalog.featured().slice(0, 5);
  const gridOpenIdx = html.indexOf('<div class="featured-grid">');
  const gridEndIdx = findBlockEnd(html, gridOpenIdx, 'div');
  const patched = patchCardSequence(html, gridOpenIdx, gridEndIdx, picks);
  if (patched !== null) return patched;
  warn('index.html: "Peças mais procuradas" mudou de composição — secção regenerada com novos ids internos de SVG (sem impacto visual).');
  const cardsHtml = picks.map((p, i) => buildCard(p, { hero: i === 0, reveal: 'scale', revealIndex: i % 6 })).join('');
  return html.slice(0, gridOpenIdx) + '<div class="featured-grid">' + cardsHtml + '</div>' + html.slice(gridEndIdx);
}

/* -------------------------------------------------------------------------
   sitemap.xml — sempre reconstruído de raiz (determinístico)
   ------------------------------------------------------------------------- */
function buildSitemap() {
  const lines = [];
  lines.push('<?xml version="1.0" encoding="UTF-8"?>');
  lines.push('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');
  lines.push('  <url><loc>' + SITE_URL + '/</loc><changefreq>weekly</changefreq><priority>1.0</priority></url>');
  lines.push('  <url><loc>' + SITE_URL + '/loja.html</loc><changefreq>weekly</changefreq><priority>0.9</priority></url>');
  CATEGORIES.forEach((c) => {
    lines.push('  <url><loc>' + SITE_URL + '/loja.html?categoria=' + c.slug + '</loc><changefreq>weekly</changefreq><priority>0.7</priority></url>');
  });
  PRODUCTS.forEach((p) => {
    lines.push('  <url><loc>' + SITE_URL + '/produto-' + p.slug + '.html</loc><changefreq>monthly</changefreq><priority>0.6</priority></url>');
  });
  ['inspiracao.html:monthly:0.5', 'projetos.html:monthly:0.5', 'sobre.html:monthly:0.6', 'contacto.html:monthly:0.6',
    'faq.html:monthly:0.5', 'envios.html:monthly:0.5', 'trocas.html:monthly:0.5', 'avaliacoes.html:weekly:0.5',
    'privacidade.html:yearly:0.3', 'termos.html:yearly:0.3']
    .forEach((entry) => {
      const [file, freq, prio] = entry.split(':');
      lines.push('  <url><loc>' + SITE_URL + '/' + file + '</loc><changefreq>' + freq + '</changefreq><priority>' + prio + '</priority></url>');
    });
  lines.push('</urlset>');
  lines.push('');
  return lines.join('\n');
}

/* -------------------------------------------------------------------------
   Molde comum a TODAS as páginas (.html na raiz, incluindo admin.html):
   <head>, <main> e a envolvente do <body>. Cada passo é idempotente — correr
   o gerador duas vezes seguidas não altera nada na segunda.
   ------------------------------------------------------------------------- */
const CSS_FILES = ['tokens', 'base', 'layout', 'components', 'animations', 'pages', 'overrides'];

/* ?v=<hash> calculado do conteúdo de cada CSS/JS (com quebras de linha
   normalizadas, para dar o mesmo em Windows e no GitHub): muda sozinho
   sempre que o ficheiro muda, e o GitHub Pages nunca serve uma versão antiga
   da cache. Depois de editar qualquer CSS/JS, correr o gerador. */
const versionCache = {};
function assetVersion(rel) {
  if (!versionCache[rel]) versionCache[rel] = crypto.createHash('sha256').update(readText(rp(rel))).digest('hex').slice(0, 8);
  return versionCache[rel];
}
const BRAND = GDM.content.BRAND;
const icon = GDM.icons.icon;

/* Cabeçalho, menu mobile e rodapé escritos no próprio HTML (navegação sem
   JavaScript, sem salto de layout, menu visível para crawlers). Tem de
   produzir exatamente a mesma marcação que o fallback de
   js/components/header.js e footer.js — esses ficheiros só ligam os
   eventos (hydrate) quando a marcação já existe. */
const NAV_LINKS = [
  ['index.html', 'Início'], ['loja.html', 'Loja'], ['inspiracao.html', 'Inspiração'],
  ['projetos.html', 'Projetos'], ['sobre.html', 'Sobre Nós'], ['contacto.html', 'Contacto'],
];

/* Logótipo: AVIF/WebP em 4 larguras (gerados a partir do PNG original,
   ver ARCHITECTURE.md) + o PNG como último recurso. sizes = largura com que
   cada uso é mostrado no CSS. O mesmo <picture> é construído em
   js/components/ui.js (logoPicture) para o fallback em JavaScript. */
const LOGO_WIDTHS = [96, 192, 384, 666];
function logoPicture(sizes, imgAttrs) {
  const srcset = (ext) => LOGO_WIDTHS.map((w) => 'assets/logo-grao-de-mostarda-' + w + '.' + ext + ' ' + w + 'w').join(', ');
  return '<picture>' +
    '<source type="image/avif" srcset="' + srcset('avif') + '" sizes="' + sizes + '">' +
    '<source type="image/webp" srcset="' + srcset('webp') + '" sizes="' + sizes + '">' +
    '<img src="assets/logo-grao-de-mostarda.png"' + imgAttrs + '>' +
    '</picture>';
}

function routeLink(href, label, currentFile) {
  return '<a href="' + href + '" data-route-link=""' + (href === currentFile ? ' aria-current="page"' : '') + '>' + escText(label) + '</a>';
}

function navListHtml(cls, currentFile) {
  return '<ul class="' + cls + '">' + NAV_LINKS.map(([href, label]) => '<li>' + routeLink(href, label, currentFile) + '</li>').join('') + '</ul>';
}

function headerHtml(currentFile) {
  const wa = 'https://wa.me/' + BRAND.whatsapp;
  const header =
    '<header class="site-header" id="site-header"><div class="container header-bar">' +
      '<a href="index.html" class="header-brand" aria-label="Grão de Mostarda Personalizados — Início"><span class="header-brand__logo">' + logoPicture('(max-width: 420px) 64px, 92px', ' alt="" width="666" height="375" loading="eager"') + '</span><span class="header-brand__wordmark"><strong>Grão de Mostarda</strong><span>Personalizados</span></span></a>' +
      navListHtml('main-nav', currentFile) +
      '<div class="header-actions">' +
        '<button class="icon-btn" type="button" aria-label="Pesquisar" data-header-action="search">' + icon('search') + '</button>' +
        '<a class="icon-btn" href="favoritos.html" aria-label="Ver favoritos" data-header-action="favorites">' + icon('heart') + '<span class="icon-btn__badge" style="display: none;">0</span></a>' +
        '<button class="icon-btn" type="button" aria-label="Abrir carrinho" data-header-action="cart">' + icon('cart') + '<span class="icon-btn__badge" style="display: none;">0</span></button>' +
        '<a class="icon-btn nav-toggle" href="#mobile-nav" role="button" aria-label="Abrir menu" aria-expanded="false" aria-controls="mobile-nav" data-header-action="menu">' + icon('menu') + '</a>' +
      '</div>' +
    '</div></header>';
  const mobileNav =
    '<div class="mobile-nav" data-open="false" id="mobile-nav"><div class="mobile-nav__scrim"></div><div class="mobile-nav__panel">' +
      '<div class="mobile-nav__head"><span class="mobile-nav__logo">' + logoPicture('46px', ' alt="Grão de Mostarda" width="666" height="375" loading="lazy"') + '</span>' +
        '<a class="icon-btn" href="#" role="button" aria-label="Fechar menu" style="color:var(--cream-100)" data-mobile-nav-close="">' + icon('close') + '</a></div>' +
      navListHtml('mobile-nav__list', currentFile) +
      '<a class="btn btn--whatsapp btn--block" href="' + escAttr(wa) + '" target="_blank" rel="noopener">' + icon('whatsapp') + '<span>Falar no WhatsApp</span></a>' +
    '</div></div>';
  return header + mobileNav;
}

function footerHtml(currentFile) {
  const wa = escAttr('https://wa.me/' + BRAND.whatsapp);
  const mail = escAttr('mailto:' + BRAND.email);
  const insta = escAttr(BRAND.instagramUrl);
  const col = (title, links) => '<div class="footer-col"><h4>' + escText(title) + '</h4><ul>' +
    links.map(([href, label]) => '<li>' + routeLink(href, label, currentFile) + '</li>').join('') + '</ul></div>';
  return '<footer class="site-footer">' +
    '<div class="footer-visual"><div class="container footer-visual__inner"><p class="footer-visual__kicker">GRÃO DE MOSTARDA  /  PORTUGAL  /  2026</p><button class="footer-visual__top" type="button" aria-label="Voltar ao topo">↑</button></div></div>' +
    '<div class="container footer-main"><div class="footer-cols">' +
      '<div class="footer-brand"><div class="footer-logo-card">' + logoPicture('112px', ' alt="Grão de Mostarda — Editora Gráfica Cristã" width="220" height="124" loading="lazy"') + '</div>' +
        '<p class="footer-brand__tagline">Fé · Amor · Propósito</p>' +
        '<p class="footer-brand__desc">Ateliê de produtos personalizados com propósito — bíblias, canecas, cadernos e decoração cristã, feitos à mão, um de cada vez.</p>' +
        '<div class="social-row">' +
          '<a class="social-row__link social-row__link--whatsapp" href="' + wa + '" target="_blank" rel="noopener" aria-label="WhatsApp">' + icon('whatsapp') + '</a>' +
          '<a class="social-row__link social-row__link--instagram" href="' + insta + '" target="_blank" rel="noopener" aria-label="Instagram">' + icon('instagram') + '</a>' +
          '<a class="social-row__link social-row__link--mail" href="' + mail + '" aria-label="E-mail">' + icon('mail') + '</a>' +
        '</div></div>' +
      col('Navegação', [['loja.html', 'Loja'], ['inspiracao.html', 'Inspiração'], ['projetos.html', 'Projetos'], ['sobre.html', 'Sobre Nós'], ['contacto.html', 'Contacto']]) +
      col('Ajuda', [['envios.html', 'Envios & Prazos'], ['trocas.html', 'Trocas & Devoluções'], ['faq.html', 'Perguntas Frequentes']]) +
      '<div class="footer-col footer-col--contact footer-col--newsletter-bottom"><h4>Contacto</h4><ul>' +
        '<li><a href="' + mail + '">' + escText(BRAND.email) + '</a></li>' +
        '<li><a href="' + wa + '" target="_blank" rel="noopener">WhatsApp</a></li>' +
        '<li><a href="' + insta + '" target="_blank" rel="noopener">Instagram</a></li></ul>' +
        '<p class="footer-contact-note">Respondemos normalmente em menos de 24 horas úteis.</p>' +
        '<div class="footer-newsletter-mini"><h4 class="footer-newsletter__title">Fica a par</h4><p class="footer-newsletter__copy">Novos produtos, histórias do ateliê e promoções ocasionais — sem spam.</p>' +
          '<div class="newsletter-pill-wrap"><form class="newsletter-form newsletter-form--pill" novalidate="true"><div class="field"><label for="footer-email" class="sr-only">E-mail</label><input type="email" name="email" id="footer-email" placeholder="o.seu@email.com" aria-label="O seu e-mail" required="true" autocomplete="email"></div><button class="btn-pill-submit" type="submit" aria-label="Subscrever">' + icon('chevronRight') + '</button></form><p class="newsletter-status" role="status"></p></div>' +
        '</div></div>' +
    '</div></div>' +
    '<div class="container footer-bottom"><div class="footer-bottom__left"><p data-footer-year="">© ' + new Date().getFullYear() + ' Grão de Mostarda Personalizados. Feito à mão em Portugal.</p><p>Pagamento combinado diretamente por WhatsApp, depois da encomenda.</p></div>' +
      '<div class="footer-bottom__right"><p class="footer-legal-links">' + routeLink('privacidade.html', 'Política de Privacidade', currentFile) + ' · ' + routeLink('termos.html', 'Termos e Condições', currentFile) + '</p><button class="footer-unsub-btn" type="button">Cancelar subscrição da newsletter</button></div></div>' +
    '</footer>';
}

/* index.html — logótipo grande do hero (fora do molde comum). */
function regenerateHeroLogo(html) {
  const open = '<div class="hero__logo"><span class="hero__logo-shadow"></span>';
  const start = html.indexOf(open);
  if (start === -1) return html;
  const end = findBlockEnd(html, start, 'div');
  const img = logoPicture('(max-width: 650px) 260px, (max-width: 1200px) 40vw, 480px', ' alt="Grão de Mostarda — Editora Gráfica Cristã" width="480" height="270" loading="eager" fetchpriority="high" class="hero-float hero-float--slow"');
  return html.slice(0, start) + open + img + '</div>' + html.slice(end);
}

/* Substitui o conteúdo de <div id="..."> (que pode ter divs aninhadas). */
function replaceHostContent(html, hostId, inner) {
  const open = '<div id="' + hostId + '">';
  const start = html.indexOf(open);
  if (start === -1) return html;
  const end = findBlockEnd(html, start, 'div');
  return html.slice(0, start) + open + inner + '</div>' + html.slice(end);
}

/* Bloco de recursos do <head> (ícone, preload das fontes, CSS, scripts):
   reescrito sempre de raiz entre o <link rel="icon"> e o último
   <link rel="stylesheet">. Os scripts vão para o <head> com defer — a ordem
   mantém-se e só correm depois de o HTML estar todo lido, sem bloquear a
   renderização. Cada página mantém a sua própria lista de scripts. */
function headAssets(scripts) {
  return [
    '<link rel="icon" type="image/svg+xml" href="assets/favicon.svg">',
    // só a fonte do corpo e a dos títulos (subconjunto latin) — as -ext só
    // descarregam se a página tiver caracteres fora do latin básico
    '<link rel="preload" href="assets/fonts/dm-sans-latin.woff2" as="font" type="font/woff2" crossorigin>',
    '<link rel="preload" href="assets/fonts/manrope-latin.woff2" as="font" type="font/woff2" crossorigin>',
  ].concat(CSS_FILES.map((name) => '<link rel="stylesheet" href="css/' + name + '.css?v=' + assetVersion('css/' + name + '.css') + '">'))
    .concat(scripts.map((src) => '<script src="' + src + '?v=' + assetVersion(src) + '" defer></script>'))
    .join('\n');
}

/* Content-Security-Policy por <meta> (o GitHub Pages não deixa definir
   cabeçalhos HTTP). 'unsafe-inline' só nos estilos, por causa dos
   style="…" do HTML e dos que el() cria; nenhum <script> inline é executado
   (os blocos JSON-LD não são código). connect-src inclui o projeto Supabase
   das avaliações quando js/data/reviewsConfig.js tiver o url preenchido. */
function cspContent() {
  let supabase = '';
  const cfgPath = rp('js', 'data', 'reviewsConfig.js');
  if (fs.existsSync(cfgPath)) {
    const ctx = { window: { GDM: {} } };
    vm.createContext(ctx);
    vm.runInContext(fs.readFileSync(cfgPath, 'utf8'), ctx, { filename: 'js/data/reviewsConfig.js' });
    const url = (ctx.window.GDM.reviewsConfig && ctx.window.GDM.reviewsConfig.url) || '';
    const m = String(url).match(/^https:\/\/[a-z0-9-]+\.supabase\.co/);
    if (m) supabase = ' ' + m[0];
    else if (url) warn('reviewsConfig.url não parece um URL do Supabase (https://<projeto>.supabase.co) — ficou fora da CSP.');
  }
  return "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'" + supabase + "; object-src 'none'; base-uri 'self'; form-action 'self'";
}
let cspCache = null;

function regenerateChrome(html, file) {
  // CSP logo a seguir ao viewport (a CSP só se aplica ao que vem depois dela)
  if (cspCache === null) cspCache = cspContent();
  html = html.replace(/<meta http-equiv="Content-Security-Policy" content="[^"]*">\n/, '').replace(/<meta name="referrer" content="[^"]*">\n/, '');
  html = html.replace(/(<meta name="viewport" content="[^"]*">\n)/, '$1<meta http-equiv="Content-Security-Policy" content="' + cspCache + '">\n');

  // recolhe os <script src="js/…"> (no fim do <body> ou já no <head>) pela ordem atual
  const scripts = [];
  html = html.replace(/<script src="(js\/[^"?]+)(?:\?[^"]*)?"(?: defer)?><\/script>\n?/g, function (_m, src) {
    scripts.push(src);
    return '';
  });
  const currentFile = /^produto-/.test(file) ? '' : file;
  html = replaceHostContent(html, 'header-host', headerHtml(currentFile));
  html = replaceHostContent(html, 'footer-host', footerHtml(currentFile));

  const assetsStart = html.indexOf('<link rel="icon"');
  const lastCss = html.lastIndexOf('<link rel="stylesheet"');
  if (assetsStart !== -1 && lastCss !== -1) {
    const assetsEnd = html.indexOf('>', lastCss) + 1;
    html = html.slice(0, assetsStart) + headAssets(scripts) + html.slice(assetsEnd);
  }
  html = html.replace(/\n+<\/head>/, '\n</head>').replace(/\n+<\/body>/, '\n</body>');
  // <main> sem aria-live: anunciava a página inteira a cada alteração. As
  // regiões vivas certas são o toast e os role="status" de cada formulário.
  html = html.replace(/<main id="app" tabindex="-1" aria-live="polite">/, '<main id="app" tabindex="-1">');
  return html;
}

/* ------------------------------------------------------------------------- */

function main() {
  let createdCount = 0, changedCount = 0, unchangedCount = 0;

  function writeIfChanged(filePath, before, after) {
    if (before !== after) {
      fs.writeFileSync(filePath, after, 'utf8');
      if (before !== null) changedCount++;
    } else {
      unchangedCount++;
    }
  }

  const existingSlugs = fs.readdirSync(ROOT)
    .filter((f) => /^produto-.*\.html$/.test(f))
    .map((f) => f.slice('produto-'.length, -'.html'.length));
  const catalogSlugs = PRODUCTS.map((p) => p.slug);

  PRODUCTS.forEach((product) => {
    const filePath = buildProductPagePath(product.slug);
    let before = null;
    let after;
    if (fs.existsSync(filePath)) {
      before = readText(filePath);
      after = regenerateProductPage(product, before);
    } else {
      const donorSlug = existingSlugs.find((s) => GDM.catalog.getBySlug(s) && GDM.catalog.getBySlug(s).category === product.category) || existingSlugs[0];
      warn('produto novo sem página: "' + product.slug + '" — criado a partir do molde "' + donorSlug + '".');
      after = buildNewProductPage(product, donorSlug);
      createdCount++;
    }
    writeIfChanged(filePath, before, regenerateChrome(after, path.basename(filePath)));
  });

  existingSlugs.filter((s) => !catalogSlugs.includes(s)).forEach((s) => {
    warn('página "produto-' + s + '.html" existe mas o produto já não está em products.js — não foi apagada, revê manualmente.');
  });

  // restantes páginas da raiz (loja, início, institucionais, legais, admin…)
  fs.readdirSync(ROOT)
    .filter((f) => /\.html$/.test(f) && !/^produto-/.test(f))
    .sort()
    .forEach((file) => {
      const filePath = rp(file);
      const before = readText(filePath);
      let after = before;
      if (file === 'loja.html') after = regenerateShop(after);
      if (file === 'index.html') after = regenerateHeroLogo(regenerateFeatured(after));
      writeIfChanged(filePath, before, regenerateChrome(after, file));
    });

  if (!fs.existsSync(rp('assets', 'art'))) fs.mkdirSync(rp('assets', 'art'));
  [...artFiles.keys()].sort().forEach((name) => {
    const filePath = rp('assets', 'art', name);
    writeIfChanged(filePath, fs.existsSync(filePath) ? readText(filePath) : null, artFiles.get(name));
  });
  fs.readdirSync(rp('assets', 'art')).filter((f) => !artFiles.has(f)).forEach((f) => {
    warn('assets/art/' + f + ' já não é usada por nenhuma página — não foi apagada, revê manualmente.');
  });

  const sitemapPath = rp('sitemap.xml');
  writeIfChanged(sitemapPath, readText(sitemapPath), buildSitemap());

  console.log('');
  console.log('Concluído: ' + createdCount + ' página(s) de produto criadas, ' + changedCount + ' ficheiro(s) alterados, ' + unchangedCount + ' sem alterações.');
  if (warnings.length) console.log(warnings.length + ' aviso(s) — ver acima.');
}

main();
