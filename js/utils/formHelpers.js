/* ==========================================================================
   Helpers de formulário — construção de campos + validação genérica.
   ========================================================================== */
(function (GDM) {
  'use strict';
  const { el } = GDM.security;

  /**
   * Constrói um campo controlado.
   * config: { id, label, type, required, placeholder, hint, validate(value) -> errorString|'' , as: 'input'|'select'|'textarea', options }
   */
  function field(config) {
    const errorId = config.id + '-error';
    let input;
    if (config.as === 'select') {
      input = el('select', { id: config.id, name: config.id, 'aria-describedby': errorId, required: !!config.required });
      (config.options || []).forEach(function (opt) {
        const value = typeof opt === 'string' ? opt : opt.value;
        const label = typeof opt === 'string' ? opt : opt.label;
        input.appendChild(el('option', { value: value, text: label }));
      });
    } else if (config.as === 'textarea') {
      input = el('textarea', { id: config.id, name: config.id, 'aria-describedby': errorId, placeholder: config.placeholder || '', required: !!config.required, maxlength: config.maxLength || 600 });
    } else {
      input = el('input', { id: config.id, name: config.id, type: config.type || 'text', 'aria-describedby': errorId, placeholder: config.placeholder || '', required: !!config.required, maxlength: config.maxLength || 200, autocomplete: config.autocomplete || 'on' });
    }
    const errorEl = el('p', { class: 'field__error', id: errorId, 'aria-live': 'polite' });
    const children = [el('label', { for: config.id, text: config.label + (config.required ? ' *' : '') }), input];
    if (config.hint) children.push(el('p', { class: 'field__hint', text: config.hint }));
    children.push(errorEl);
    const wrap = el('div', { class: 'field' }, children);
    wrap.__gdmInput = input;
    wrap.__gdmError = errorEl;
    wrap.__gdmValidate = config.validate;
    wrap.__gdmRequired = !!config.required;
    return wrap;
  }

  function readValue(fieldWrap) {
    return GDM.security.sanitizeInput(fieldWrap.__gdmInput.value, fieldWrap.__gdmInput.maxLength > 0 ? fieldWrap.__gdmInput.maxLength : 600);
  }

  function validateField(fieldWrap) {
    const input = fieldWrap.__gdmInput;
    const value = input.value.trim();
    let error = '';
    if (fieldWrap.__gdmRequired && !value) error = 'Campo obrigatório.';
    if (!error && fieldWrap.__gdmValidate) error = fieldWrap.__gdmValidate(value) || '';
    fieldWrap.__gdmError.textContent = error;
    if (error) input.setAttribute('aria-invalid', 'true'); else input.removeAttribute('aria-invalid');
    return !error;
  }

  /** Liga validação on-blur/input e devolve função validateAll(). */
  function wireForm(fieldWraps) {
    fieldWraps.forEach(function (fw) {
      fw.__gdmInput.addEventListener('blur', function () { validateField(fw); });
      fw.__gdmInput.addEventListener('input', function () {
        if (fw.__gdmInput.getAttribute('aria-invalid') === 'true') validateField(fw);
      });
    });
    return function validateAll() {
      let firstInvalid = null;
      let ok = true;
      fieldWraps.forEach(function (fw) {
        const valid = validateField(fw);
        if (!valid) { ok = false; if (!firstInvalid) firstInvalid = fw.__gdmInput; }
      });
      if (firstInvalid) firstInvalid.focus();
      return ok;
    };
  }

  GDM.formHelpers = { field: field, readValue: readValue, wireForm: wireForm, validateField: validateField };
})(window.GDM = window.GDM || {});
