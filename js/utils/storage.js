/* ==========================================================================
   localStorage seguro — sempre try/catch, sempre validado por um schema
   simples antes de ser aceite de volta na aplicação. Dados inválidos ou
   incompatíveis são descartados silenciosamente (nunca fazem crash da app).
   ========================================================================== */
(function (GDM) {
  'use strict';

  const PREFIX = 'gdm:';

  function read(key, validate) {
    try {
      const raw = window.localStorage.getItem(PREFIX + key);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (typeof validate === 'function' && !validate(parsed)) return null;
      return parsed;
    } catch (err) {
      return null;
    }
  }

  function write(key, value) {
    try {
      window.localStorage.setItem(PREFIX + key, JSON.stringify(value));
      return true;
    } catch (err) {
      return false;
    }
  }

  function remove(key) {
    try {
      window.localStorage.removeItem(PREFIX + key);
    } catch (err) {
      /* localStorage indisponível (modo privado, quota) — falha silenciosa */
    }
  }

  GDM.storage = { read, write, remove };
})(window.GDM = window.GDM || {});
