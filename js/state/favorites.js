/* ==========================================================================
   Estado de favoritos — lista de IDs de produto, validada contra o catálogo.
   ========================================================================== */
(function (GDM) {
  'use strict';
  const KEY = 'favorites';

  function validateShape(parsed) {
    return Array.isArray(parsed);
  }

  /* Filtra item a item (um id estragado não apaga a lista inteira) e
     remove ids repetidos ou que já não existam no catálogo. */
  function load() {
    const stored = GDM.storage.read(KEY, validateShape) || [];
    return stored.filter(function (id, idx) {
      return typeof id === 'string' && stored.indexOf(id) === idx && !!GDM.catalog.getById(id);
    });
  }

  function persist(ids) {
    GDM.storage.write(KEY, ids);
    GDM.bus.emit('favorites:change', ids);
  }

  function list() { return load(); }
  function has(id) { return load().indexOf(id) !== -1; }
  function count() { return load().length; }

  function toggle(id) {
    if (!GDM.catalog.getById(id)) return list();
    const ids = load();
    const idx = ids.indexOf(id);
    if (idx === -1) ids.push(id); else ids.splice(idx, 1);
    persist(ids);
    return ids;
  }

  /* Contas (js/state/conta.js): juntar os favoritos da conta aos deste
     navegador, ou substituí-los. Passam pelo mesmo filtro de load(). */
  function juntar(ids) {
    if (!Array.isArray(ids)) return list();
    GDM.storage.write(KEY, load().concat(ids));
    persist(load());
    return list();
  }

  function substituir(ids) {
    GDM.storage.write(KEY, Array.isArray(ids) ? ids : []);
    persist(load());
    return list();
  }

  GDM.favorites = { list, has, count, toggle, juntar, substituir };
})(window.GDM = window.GDM || {});
