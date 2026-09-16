/* ==========================================================================
   Router client-side por hash — sem dependências, funciona em GitHub Pages
   e em file:// sem qualquer configuração de servidor.
   Formato: #/caminho/:parametro?chave=valor
   ========================================================================== */
(function (GDM) {
  'use strict';

  const routes = [];
  let current = null;

  function register(pattern, handler, meta) {
    const paramNames = [];
    const regexStr = (pattern === '/' ? '/' : pattern.replace(/\/$/, ''))
      .split('/')
      .map(function (segment) {
        if (segment.startsWith(':')) { paramNames.push(segment.slice(1)); return '([^/]+)'; }
        return segment.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      })
      .join('/');
    routes.push({ regex: new RegExp('^' + regexStr + '$'), paramNames: paramNames, handler: handler, meta: meta || {} });
  }

  function parseHash() {
    let hash = window.location.hash || '#/';
    hash = hash.replace(/^#/, '');
    if (!hash.startsWith('/')) hash = '/' + hash;
    const [pathPart, queryPart] = hash.split('?');
    const path = pathPart.replace(/\/+$/, '') || '/';
    const query = {};
    if (queryPart) {
      queryPart.split('&').forEach(function (pair) {
        if (!pair) return;
        const [k, v] = pair.split('=');
        query[decodeURIComponent(k || '')] = decodeURIComponent((v || '').replace(/\+/g, ' '));
      });
    }
    return { path: path, query: query };
  }

  function buildParams(match, paramNames) {
    const params = {};
    paramNames.forEach(function (name, idx) {
      params[name] = GDM.security.sanitizeSlug(decodeURIComponent(match[idx + 1] || ''));
    });
    return params;
  }

  function matchRoute(path) {
    for (let i = 0; i < routes.length; i++) {
      const m = path.match(routes[i].regex);
      if (m) return { route: routes[i], match: m };
    }
    return null;
  }

  function navigate(path) {
    window.location.hash = path;
  }

  let currentCleanup = null;
  function runCleanup() {
    if (typeof currentCleanup === 'function') {
      try { currentCleanup(); } catch (err) { console.error('[router] erro no cleanup', err); }
    }
    currentCleanup = null;
  }

  function resolve() {
    runCleanup();
    const { path, query } = parseHash();
    const found = matchRoute(path);
    const app = document.getElementById('app');
    GDM.components.closeAllOverlays();
    GDM.meta.clearJsonLd();

    if (!found) {
      current = { path: '/404', query: query };
      GDM.meta.set({ title: 'Página não encontrada', description: 'A página que procura não existe ou foi movida.', path: path });
      currentCleanup = GDM.pages.notFound.render(app, {}, query);
      afterRender(path);
      return;
    }

    const params = buildParams(found.match, found.route.paramNames);
    current = { path: path, query: query, params: params };
    GDM.meta.set({ title: found.route.meta.title, description: found.route.meta.description, path: path });
    try {
      currentCleanup = found.route.handler(app, params, query);
    } catch (err) {
      console.error('[router] erro a renderizar', path, err);
      currentCleanup = GDM.pages.notFound.render(app, {}, query);
    }
    afterRender(path);
  }

  function afterRender(path) {
    window.scrollTo({ top: 0, behavior: 'auto' });
    GDM.components.updateActiveNav(path);
    GDM.components.initScrollReveal();
  }

  window.addEventListener('hashchange', resolve);

  GDM.router = { register, navigate, resolve, getCurrent: function () { return current; } };
})(window.GDM = window.GDM || {});
