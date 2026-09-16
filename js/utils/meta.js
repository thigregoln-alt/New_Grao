/* ==========================================================================
   Meta tags dinâmicas por rota — título, descrição, canonical, Open Graph e
   Twitter Card, mais dados estruturados (JSON-LD). Sem isto, motores de
   busca sem JS e pré-visualizações de partilha (WhatsApp/Instagram) só viam
   o <title>/<meta> fixos do index.html, sempre iguais em qualquer rota.
   ========================================================================== */
(function (GDM) {
  'use strict';

  const SITE_NAME = 'Grão de Mostarda Personalizados';
  const DEFAULT_IMAGE = 'assets/og-image.png';

  function ensureMeta(attrName, attrValue) {
    let node = document.querySelector('meta[' + attrName + '="' + attrValue + '"]');
    if (!node) {
      node = document.createElement('meta');
      node.setAttribute(attrName, attrValue);
      document.head.appendChild(node);
    }
    return node;
  }

  function ensureLink(rel) {
    let node = document.querySelector('link[rel="' + rel + '"]');
    if (!node) {
      node = document.createElement('link');
      node.setAttribute('rel', rel);
      document.head.appendChild(node);
    }
    return node;
  }

  function absoluteUrl(path) {
    const base = GDM.content.BRAND.siteUrl.replace(/\/$/, '');
    if (!path) return base + '/';
    if (/^https?:\/\//.test(path)) return path;
    return base + '/' + path.replace(/^\//, '');
  }

  /** Atualiza title, description, canonical, Open Graph e Twitter Card para
   *  a rota atual. opts: { title, description, path, image, type } */
  function set(opts) {
    opts = opts || {};
    const title = opts.title ? opts.title + ' · ' + SITE_NAME : SITE_NAME;
    const description = opts.description || GDM.content.BRAND.defaultDescription;
    const image = absoluteUrl(opts.image || DEFAULT_IMAGE);
    const url = absoluteUrl('#' + (opts.path || '/'));
    const type = opts.type || 'website';

    document.title = title;
    ensureMeta('name', 'description').setAttribute('content', description);
    ensureLink('canonical').setAttribute('href', url);

    ensureMeta('property', 'og:title').setAttribute('content', title);
    ensureMeta('property', 'og:description').setAttribute('content', description);
    ensureMeta('property', 'og:image').setAttribute('content', image);
    ensureMeta('property', 'og:url').setAttribute('content', url);
    ensureMeta('property', 'og:type').setAttribute('content', type);
    ensureMeta('property', 'og:site_name').setAttribute('content', SITE_NAME);

    ensureMeta('name', 'twitter:card').setAttribute('content', 'summary_large_image');
    ensureMeta('name', 'twitter:title').setAttribute('content', title);
    ensureMeta('name', 'twitter:description').setAttribute('content', description);
    ensureMeta('name', 'twitter:image').setAttribute('content', image);
  }

  /** Injeta/atualiza um bloco JSON-LD identificado por `id` (ex.: 'organization',
   *  'product', 'breadcrumb'). Cada página é responsável por chamar isto depois
   *  de renderizar; o router limpa todos os blocos a cada mudança de rota
   *  (ver clearJsonLd), para nunca sobrar JSON-LD de uma página anterior. */
  function setJsonLd(id, obj) {
    let node = document.getElementById('ld-' + id);
    if (!node) {
      node = document.createElement('script');
      node.type = 'application/ld+json';
      node.id = 'ld-' + id;
      node.setAttribute('data-gdm-ld', '');
      document.head.appendChild(node);
    }
    node.textContent = JSON.stringify(obj);
  }

  function clearJsonLd() {
    document.querySelectorAll('script[data-gdm-ld]').forEach(function (n) { n.remove(); });
  }

  GDM.meta = { set: set, setJsonLd: setJsonLd, clearJsonLd: clearJsonLd, absoluteUrl: absoluteUrl };
})(window.GDM = window.GDM || {});
