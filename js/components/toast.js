/* ==========================================================================
   Toasts — notificações não bloqueantes, com região viva para leitores de
   ecrã.
   ========================================================================== */
(function (GDM) {
  'use strict';
  const { el } = GDM.security;
  GDM.components = GDM.components || {};

  let region = null;

  function mount(root) {
    region = el('div', { class: 'toast-region', role: 'status', 'aria-live': 'polite' });
    root.appendChild(region);
  }

  function show(message, type) {
    if (!region) return;
    type = type || 'info';
    const toast = el('div', { class: 'toast toast--' + type });
    const p = el('p', { text: message });
    const closeBtn = el('button', { 'aria-label': 'Fechar notificação', type: 'button' });
    closeBtn.innerHTML = GDM.icons.icon('close');
    closeBtn.style.width = '22px'; closeBtn.style.height = '22px';
    function dismiss() {
      toast.classList.add('is-leaving');
      setTimeout(function () { toast.remove(); }, 180);
    }
    closeBtn.addEventListener('click', dismiss);
    toast.appendChild(p);
    toast.appendChild(closeBtn);
    region.appendChild(toast);
    setTimeout(dismiss, 1500);
  }

  GDM.components.toast = { mount: mount, show: show };
})(window.GDM = window.GDM || {});
