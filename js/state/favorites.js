/* ==========================================================================
   Estado de favoritos — lista de IDs de produto, validada contra o catálogo.
   ========================================================================== */
(function (GDM) {
  'use strict';
  const KEY = 'favorites';

  function validateShape(parsed) {
    return Array.isArray(parsed) && parsed.every(function (id) { return typeof id === 'string'; });
  }

  function load() {
    const stored = GDM.storage.read(KEY, validateShape) || [];
    return stored.filter(function (id) { return !!GDM.catalog.getById(id); });
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

  GDM.favorites = { list, has, count, toggle };
})(window.GDM = window.GDM || {});
