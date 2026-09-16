/* ==========================================================================
   Mini event bus — para que o header/drawer reajam a mudanças de estado
   (carrinho, favoritos) sem acoplamento direto entre módulos.
   ========================================================================== */
(function (GDM) {
  'use strict';
  const listeners = {};

  function on(event, fn) {
    (listeners[event] = listeners[event] || []).push(fn);
    return function off() {
      listeners[event] = (listeners[event] || []).filter(function (f) { return f !== fn; });
    };
  }

  function emit(event, payload) {
    (listeners[event] || []).slice().forEach(function (fn) {
      try { fn(payload); } catch (err) { console.error('[bus] listener error for', event, err); }
    });
  }

  GDM.bus = { on, emit };
})(window.GDM = window.GDM || {});
