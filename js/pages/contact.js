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

  function validEmail(v) {
    return GDM.format.isValidEmail(v) ? '' : 'Introduza um e-mail válido.';
  }

  /* A marcação da página já vem no HTML (escrita por tools/gerar-paginas.js
     — manter as duas versões iguais), para o conteúdo inicial ser o final e
     o rodapé não saltar. buildPage só corre como fallback, se a marcação
     não existir; em ambos os casos os eventos são ligados por hydrate(). */
  function buildPage() {
    const nameField = GDM.formHelpers.field({ id: 'ct-name', label: 'Nome', required: true, autocomplete: 'name' });
    const emailField = GDM.formHelpers.field({ id: 'ct-email', label: 'E-mail', type: 'email', required: true, autocomplete: 'email' });
    const subjectField = GDM.formHelpers.field({ id: 'ct-subject', label: 'Assunto', required: true });
    const messageField = GDM.formHelpers.field({ id: 'ct-message', label: 'Mensagem', as: 'textarea', required: true, maxLength: 600 });
    const status = el('p', { role: 'status', class: 'newsletter-status' });

    const submitBtn = el('button', { class: 'btn btn--primary', type: 'submit', text: 'Enviar mensagem' });
    const micro = el('p', { class: 'contact-v5__microcopy', text: 'A mensagem abre o seu programa de e-mail já preenchido.' });
    const form = el('form', { class: 'stack', novalidate: true }, [
      el('div', { class: 'contact-v5__field-grid' }, [nameField, emailField, el('div', { class: 'contact-v5__field--full' }, [subjectField]), el('div', { class: 'contact-v5__field--full' }, [messageField])]),
      el('div', { class: 'contact-v5__submit' }, [submitBtn, micro]),
      status,
    ]);


    const info = el('aside', { class: 'contact-v5__info' }, [
      el('div', { class: 'contact-v5__brand' }, [
        (function () {
          const s = document.createElement('span');
          s.className = 'contact-v5__brand-logo';
          s.appendChild(GDM.components.logoPicture('190px', { alt: 'Grão de Mostarda', width: '666', height: '375', loading: 'lazy' }));
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

    return el('section', { class: 'section section--tight' }, [shell]);
  }

  /* Liga um campo já existente na página à validação genérica de
     formHelpers (as mesmas propriedades que formHelpers.field põe). */
  function adoptField(id, validate) {
    const input = document.getElementById(id);
    const wrap = input.closest('.field');
    wrap.__gdmInput = input;
    wrap.__gdmError = document.getElementById(id + '-error');
    wrap.__gdmValidate = validate;
    wrap.__gdmRequired = input.required;
    return wrap;
  }

  function hydrate(container) {
    const nameField = adoptField('ct-name');
    const emailField = adoptField('ct-email', validEmail);
    const subjectField = adoptField('ct-subject');
    const messageField = adoptField('ct-message');
    const validateAll = GDM.formHelpers.wireForm([nameField, emailField, subjectField, messageField]);
    const form = container.querySelector('.contact-v5__form form');
    const status = form.querySelector('[role="status"]');

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
  }

  function render(container) {
    if (!container.querySelector('.contact-v5')) {
      container.innerHTML = '';
      container.appendChild(buildPage());
    }
    hydrate(container);
  }

  GDM.pages.contact = { render: render };
})(window.GDM = window.GDM || {});
