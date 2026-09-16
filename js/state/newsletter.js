/* ==========================================================================
   Newsletter — sem backend real: guarda localmente o estado de subscrição
   para que a UI reconheça um visitante que já subscreveu neste browser.
   Ver ARCHITECTURE.md para o que é necessário para um envio real de email.
   ========================================================================== */
(function (GDM) {
  'use strict';
  const KEY = 'newsletter';

  function validateShape(parsed) {
    return parsed && typeof parsed === 'object' && typeof parsed.email === 'string' && typeof parsed.subscribedAt === 'string';
  }

  function status() {
    return GDM.storage.read(KEY, validateShape);
  }

  function subscribe(email) {
    const clean = GDM.security.sanitizeInput(email, 160);
    if (!GDM.format.isValidEmail(clean)) return { ok: false, error: 'Introduza um e-mail válido.' };
    const record = { email: clean, subscribedAt: new Date().toISOString() };
    GDM.storage.write(KEY, record);
    GDM.bus.emit('newsletter:change', record);
    return { ok: true, record: record };
  }

  function unsubscribe() {
    GDM.storage.remove(KEY);
    GDM.bus.emit('newsletter:change', null);
  }

  GDM.newsletter = { status, subscribe, unsubscribe };
})(window.GDM = window.GDM || {});
