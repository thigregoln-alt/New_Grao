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

let warnings = [];
function warn(msg) { warnings.push(msg); console.warn('AVISO: ' + msg); }

/* -------------------------------------------------------------------------
   Cartão de produto (usado na loja, no destaque da Início e em "também
   vai gostar"): só troca texto/atributos — nunca toca no SVG interno.
   ------------------------------------------------------------------------- */
function patchCard(html, cardOpenIdx, product) {
  const cardEnd = findBlockEnd(html, cardOpenIdx, 'article');
  if (cardEnd === -1) return null;
  let card = html.slice(cardOpenIdx, cardEnd);

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
  const media = '<div class="product-card__media">' + GDM.categoryArt.productArt(product) + '</div>';
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
function patchCardSequence(html, startIdx, endIdx, expectedProducts) {
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
    const patched = patchCard(out, positions[i], expectedProducts[i]);
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

  // aria-labels da galeria (nome do produto) — mesmo texto no principal e nas 3 miniaturas
  const oldNameMatch = html.match(/aria-label="([^"]+) — pré-visualização ilustrada"/);
  if (oldNameMatch && oldNameMatch[1] !== escAttr(name)) {
    const oldNameAttr = oldNameMatch[1];
    html = html.split('aria-label="' + oldNameAttr + ' — pré-visualização ilustrada"').join('aria-label="' + escAttr(name) + ' — pré-visualização ilustrada"');
    html = html.split('de ' + oldNameAttr.replace(/&quot;/g, '"').replace(/&amp;/g, '&') + '"').join('de ' + name.replace(/"/g, '\\"') + '"');
  }

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
  const donorHtml = fs.readFileSync(donorPath, 'utf8');
  const donorProduct = GDM.catalog.getBySlug(donorSlug);
  let html = regenerateProductPage(donorProduct, donorHtml); // normaliza o molde primeiro
  html = regenerateProductPage(product, html); // depois aplica os dados do produto novo (troca tudo)
  // regenera a galeria de raiz, porque o molde não tem os SVGs corretos para este produto
  html = regenerateGallery(html, product);
  return html;
}

function regenerateGallery(html, product) {
  const variants = [product, Object.assign({}, product, { slug: product.slug + '-b' }), Object.assign({}, product, { slug: product.slug + '-c' })];
  const mainSvg = GDM.categoryArt.productArt(variants[0]);
  const mainStart = html.indexOf('<div class="product-gallery__main">');
  const mainEnd = findBlockEnd(html, mainStart, 'div');
  const mainBlock = '<div class="product-gallery__main">' + mainSvg + '</div>';

  const thumbsStart = html.indexOf('<div class="product-gallery__thumbs">');
  const thumbsEnd = findBlockEnd(html, thumbsStart, 'div');
  const thumbsInner = variants.map((v, idx) =>
    '<button type="button" aria-current="' + (idx === 0 ? 'true' : 'false') + '" aria-label="Ver imagem ' + (idx + 1) + ' de ' + escAttr(product.name) + '">' + GDM.categoryArt.productArt(v) + '</button>'
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
  const patched = patchCardSequence(html, gridOpenIdx, gridEndIdx, ordered);
  if (patched !== null) return patched;
  warn('loja.html: composição da grelha mudou (produto novo/removido/destaque alterado) — grelha regenerada com novos ids internos de SVG (sem impacto visual).');
  const cardsHtml = ordered.map((p, i) => buildCard(p, { reveal: 'fade', revealIndex: i % 6 })).join('');
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
function regenerateChrome(html) {
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
      before = fs.readFileSync(filePath, 'utf8');
      after = regenerateProductPage(product, before);
    } else {
      const donorSlug = existingSlugs.find((s) => GDM.catalog.getBySlug(s) && GDM.catalog.getBySlug(s).category === product.category) || existingSlugs[0];
      warn('produto novo sem página: "' + product.slug + '" — criado a partir do molde "' + donorSlug + '".');
      after = buildNewProductPage(product, donorSlug);
      createdCount++;
    }
    writeIfChanged(filePath, before, regenerateChrome(after));
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
      const before = fs.readFileSync(filePath, 'utf8');
      let after = before;
      if (file === 'loja.html') after = regenerateShop(after);
      if (file === 'index.html') after = regenerateFeatured(after);
      writeIfChanged(filePath, before, regenerateChrome(after));
    });

  const sitemapPath = rp('sitemap.xml');
  writeIfChanged(sitemapPath, fs.readFileSync(sitemapPath, 'utf8'), buildSitemap());

  console.log('');
  console.log('Concluído: ' + createdCount + ' página(s) de produto criadas, ' + changedCount + ' ficheiro(s) alterados, ' + unchangedCount + ' sem alterações.');
  if (warnings.length) console.log(warnings.length + ' aviso(s) — ver acima.');
}

main();
