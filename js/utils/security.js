/* ==========================================================================
   Segurança — escaping, sanitização de texto, validação de forma de dados.
   Nunca usar innerHTML com valor vindo do utilizador. Estas funções são o
   único caminho aprovado para inserir texto dinâmico no DOM.
   ========================================================================== */
(function (GDM) {
  'use strict';

  /** Escapa texto para uso seguro dentro de HTML (usado só quando é
   *  mesmo necessário construir HTML como string; preferir sempre
   *  textContent / os helpers de DOM abaixo). */
  function escapeHTML(value) {
    return String(value ?? '').replace(/[&<>"']/g, function (ch) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch];
    });
  }

  /** Cria um elemento DOM com texto seguro (via textContent) e atributos. */
  function el(tag, attrs, children) {
    const node = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (key) {
        const value = attrs[key];
        if (value === undefined || value === null || value === false) return;
        if (key === 'class') node.className = value;
        else if (key === 'text') node.textContent = value;
        else if (key.startsWith('on') && typeof value === 'function') node.addEventListener(key.slice(2), value);
        else if (key === 'html') node.innerHTML = value; // só usar com HTML gerado internamente (svg/markup fixo), nunca com input do utilizador
        else node.setAttribute(key, value);
      });
    }
    (children || []).forEach(function (child) {
      if (child === null || child === undefined || child === false) return;
      node.appendChild(typeof child === 'string' ? document.createTextNode(child) : child);
    });
    return node;
  }

  /** Limpa texto de input de utilizador: remove tags, trima, limita comprimento. */
  function sanitizeInput(value, maxLength) {
    const asString = String(value ?? '');
    const stripped = asString.replace(/<[^>]*>/g, '').trim();
    return maxLength ? stripped.slice(0, maxLength) : stripped;
  }

  /** Normaliza um slug de rota vindo da URL — só letras/números/hífen. */
  function sanitizeSlug(value) {
    return String(value ?? '').toLowerCase().trim().replace(/[^a-z0-9-]/g, '').slice(0, 80);
  }

  GDM.security = { escapeHTML, el, sanitizeInput, sanitizeSlug };
})(window.GDM = window.GDM || {});
