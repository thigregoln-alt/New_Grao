/* ==========================================================================
   Formatação — moeda, datas, slugs, validação de formulário.
   ========================================================================== */
(function (GDM) {
  'use strict';

  function currency(value) {
    const num = Number(value);
    if (!Number.isFinite(num)) return '€0,00';
    return new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(num);
  }

  function slugify(text) {
    return String(text)
      .toLowerCase()
      .normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }

  function dateLabel(iso) {
    try {
      return new Intl.DateTimeFormat('pt-PT', { day: '2-digit', month: 'long', year: 'numeric' }).format(new Date(iso));
    } catch (err) {
      return '';
    }
  }

  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  function isValidEmail(value) { return EMAIL_RE.test(String(value || '').trim()); }

  /** Remove tudo o que não seja dígito — usado para números de telefone que
   *  precisam de chegar "limpos" a um destino (ex.: um link wa.me), mantendo
   *  sempre o valor original tal como o cliente o escreveu para apresentação. */
  function digitsOnly(value) { return String(value || '').replace(/\D+/g, ''); }

  GDM.format = { currency, slugify, dateLabel, isValidEmail, digitsOnly };
})(window.GDM = window.GDM || {});
