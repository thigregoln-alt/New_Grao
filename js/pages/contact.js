/* ======================================================================
   Página: Contacto — editorial layout
   ====================================================================== */
(function (GDM) {
  'use strict';
  const { el } = GDM.security;
  GDM.pages = GDM.pages || {};
  const B = GDM.content.BRAND;

  function methodRow(index, label, valueNode) {
    return el('div', { class: 'contact-v5__method' }, [
      el('span', { class: 'contact-v5__method-index', text: index }),
      el('div', { class: 'stack', style: 'gap:2px' }, [
        el('strong', { text: label }),
        valueNode,
      ]),
    ]);
  }

  function render(container) {
    container.innerHTML = '';

    const nameField = GDM.formHelpers.field({ id: 'ct-name', label: 'Nome', required: true });
    const emailField = GDM.formHelpers.field({ id: 'ct-email', label: 'E-mail', type: 'email', required: true, validate: function (v) {
      return GDM.format.isValidEmail(v) ? '' : 'Introduza um e-mail válido.';
    }});
    const subjectField = GDM.formHelpers.field({ id: 'ct-subject', label: 'Assunto', required: true });
    const messageField = GDM.formHelpers.field({ id: 'ct-message', label: 'Mensagem', as: 'textarea', required: true, maxLength: 600 });
    const fields = [nameField, emailField, subjectField, messageField];
    const validateAll = GDM.formHelpers.wireForm(fields);
    const status = el('p', { role: 'status', class: 'newsletter-status' });

    const submitBtn = el('button', { class: 'btn btn--primary', type: 'submit', text: 'Enviar mensagem' });
    const micro = el('p', { class: 'contact-v5__microcopy', text: 'A mensagem abre o seu programa de e-mail já preenchido.' });
    const form = el('form', { class: 'stack', novalidate: true }, [
      el('div', { class: 'contact-v5__field-grid' }, [nameField, emailField, el('div', { class: 'contact-v5__field--full' }, [subjectField]), el('div', { class: 'contact-v5__field--full' }, [messageField])]),
      el('div', { class: 'contact-v5__submit' }, [submitBtn, micro]),
      status,
    ]);

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!validateAll()) { GDM.components.toast.show('Reveja os campos assinalados.', 'error'); return; }
      const subject = GDM.formHelpers.readValue(subjectField);
      const body = 'Nome: ' + GDM.formHelpers.readValue(nameField) + '\nE-mail: ' + GDM.formHelpers.readValue(emailField) + '\n\n' + GDM.formHelpers.readValue(messageField);
      window.location.href = 'mailto:' + B.email + '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body);
      status.textContent = 'A abrir o seu programa de e-mail com a mensagem preenchida…';
      status.classList.add('newsletter-status--ok');
      GDM.components.toast.show('Mensagem preparada para envio.', 'success');
    });

    const info = el('aside', { class: 'contact-v5__info' }, [
      el('div', { class: 'contact-v5__brand' }, [
        (function () {
          const s = document.createElement('span');
          s.className = 'contact-v5__brand-logo';
          s.appendChild(el('img', { src: 'assets/logo-grao-de-mostarda.png', alt: 'Grão de Mostarda', loading: 'lazy' }));
          return s;
        })(),
        el('small', { text: 'Atendimento personalizado · normalmente em menos de 24 horas úteis' }),
      ]),
      el('blockquote', { class: 'contact-v5__verse' }, [
        document.createTextNode('"' + GDM.content.BRAND.verse.slice(0, 108) + '…"'),
        el('cite', { text: GDM.content.BRAND.verseRef }),
      ]),
      el('div', { class: 'contact-v5__methods' }, [
        methodRow('01', 'WhatsApp', el('a', { href: 'https://wa.me/' + B.whatsapp, target: '_blank', rel: 'noopener', text: B.whatsappDisplay })),
        methodRow('02', 'E-mail', el('a', { href: 'mailto:' + B.email, text: B.email })),
        methodRow('03', 'Instagram', el('a', { href: B.instagramUrl, target: '_blank', rel: 'noopener', text: B.instagram })),
        methodRow('04', 'Horário', el('span', { text: 'Segunda a sexta · 9h–18h' })),
      ]),
      el('a', { class: 'btn btn--whatsapp btn--block contact-v5__wa', href: 'https://wa.me/' + B.whatsapp, target: '_blank', rel: 'noopener', text: 'Falar agora no WhatsApp' }),
    ]);

    const hero = el('div', { class: 'contact-v5__hero' }, [
      el('div', { class: 'stack', style: 'gap:14px' }, [
        el('p', { class: 'eyebrow contact-v5__kicker', text: 'Fale connosco' }),
        el('h1', { text: 'Vamos conversar.' }),
        el('p', { text: 'Diga-nos o que precisa, conte-nos a ideia ou envie uma dúvida sobre a sua encomenda. Tratamos cada pedido com atenção de atelier.' }),
      ]),
      el('div', { class: 'contact-v5__aside' }, [
        el('strong', { text: 'Resposta humana, não automática.' }),
        el('p', { text: 'Preferimos mensagens claras e conversas simples. Assim conseguimos responder com contexto e ajudar mais depressa.' }),
      ]),
    ]);

    const formPanel = el('div', { class: 'contact-v5__form' }, [
      el('div', { class: 'contact-v5__form-head' }, [
        el('div', { class: 'stack', style: 'gap:7px' }, [
          el('p', { class: 'eyebrow', text: '01 · Mensagem' }),
          el('h2', { text: 'Escreva-nos' }),
        ]),
        el('span', { class: 'contact-v5__form-note', text: 'Campos obrigatórios *' }),
      ]),
      form,
    ]);

    const bottom = el('div', { class: 'contact-v5__bottom' }, [
      el('div', { class: 'stack', style: 'gap:3px' }, [
        el('strong', { text: 'Mais rápido pelo WhatsApp.' }),
        el('p', { text: 'Para dúvidas urgentes sobre encomendas, é o canal mais direto.' }),
      ]),
      el('span', { class: 'eyebrow', text: 'Grão de Mostarda · Atendimento' }),
    ]);

    const shell = el('div', { class: 'container contact-v5' }, [
      hero,
      el('div', { class: 'contact-v5__layout' }, [formPanel, info]),
      bottom,
    ]);

    container.appendChild(el('section', { class: 'section section--tight' }, [shell]));
  }

  GDM.pages.contact = { render: render };
})(window.GDM = window.GDM || {});
