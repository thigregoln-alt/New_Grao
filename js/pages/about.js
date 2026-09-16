/* ==========================================================================
   Página: Sobre Nós
   ========================================================================== */
(function (GDM) {
  'use strict';
  const { el } = GDM.security;
  GDM.pages = GDM.pages || {};
  const S = GDM.content.STORY;
  const B = GDM.content.BRAND;

  function artPanel(seedColor) {
    const panel = el('div', { class: 'panel', style: 'aspect-ratio:4/3;background:linear-gradient(135deg,#3a2216,#1c1108);overflow:hidden' });
    panel.innerHTML = '<svg viewBox="0 0 400 300" style="width:100%;height:100%"><g transform="translate(40,120) scale(2)">' + GDM.motifs.mustardBranch({ leafColor: seedColor || '#a9b899' }) + '</g></svg>';
    return panel;
  }

  function render(container) {
    container.innerHTML = '';
    container.appendChild(GDM.components.pageHero({ eyebrow: 'Desde o início', title: 'Sobre Nós', lede: 'Como uma frase de fé se tornou um ateliê de produtos feitos à mão.' }));

    const originSection = el('section', { class: 'story-section' }, [
      el('div', { class: 'container split' }, [
        artPanel('#a9b899'),
        el('div', { class: 'text-block', 'data-reveal': 'right' }, [
          el('p', { class: 'eyebrow', text: 'De onde vem o nome' }),
          el('h2', { text: 'Um grão pequeno, uma grande promessa' }),
          el('p', { text: S.origin, style: 'color:var(--ink-700);margin-top:12px' }),
        ]),
      ]),
    ]);

    const quote = el('section', { class: 'section section--cream' }, [
      el('div', { class: 'container' }, [
        el('blockquote', { class: 'quote-block', 'data-reveal': 'scale' }, [
          document.createTextNode('"' + B.verse + '"'),
          el('cite', { text: B.verseRef }),
        ]),
      ]),
    ]);

    const purposeSection = el('section', { class: 'story-section' }, [
      el('div', { class: 'container split' }, [
        el('div', { class: 'text-block', 'data-reveal': 'left' }, [
          el('p', { class: 'eyebrow', text: 'O nosso propósito' }),
          el('h2', { text: 'Peças com significado, não só decoração' }),
          el('p', { text: S.purpose, style: 'color:var(--ink-700);margin-top:12px' }),
        ]),
        artPanel('#c9a25e'),
      ]),
    ]);

    const wayGrid = el('div', { class: 'steps' });
    [
      { title: 'Sem stock de prateleira', text: 'Cada peça só começa a ser produzida depois de confirmada — não fabricamos em massa antecipadamente.' },
      { title: 'Materiais escolhidos com cuidado', text: 'Pele, madeira, tecido e cerâmica selecionados pela durabilidade e pelo acabamento.' },
      { title: 'Revisão final à mão', text: 'Antes de embalar, cada gravação e cada costura é revista uma última vez.' },
    ].forEach(function (s) { wayGrid.appendChild(el('div', { class: 'step text-block', 'data-reveal': 'fade' }, [el('h3', { text: s.title }), el('p', { text: s.text, style: 'color:var(--ink-500)' })])); });

    const waySection = el('section', { class: 'section section--bordered' }, [
      el('div', { class: 'container text-block' }, [
        el('p', { class: 'eyebrow', text: 'Como trabalhamos' }),
        el('h2', { text: 'Feito à mão, por encomenda', style: 'margin-bottom:28px' }),
        el('p', { text: S.wayOfWorking, style: 'color:var(--ink-700);max-width:70ch;margin-bottom:28px' }),
        wayGrid,
      ]),
    ]);

    const cta = el('section', { class: 'section' }, [
      el('div', { class: 'container' }, [
        el('div', { class: 'cta-band text-block', 'data-reveal': 'scale' }, [
          el('h2', { text: 'Conheça as nossas peças' }),
          el('p', { text: 'Cada categoria carrega um pouco desta história.', style: 'color:var(--gold-200);margin-bottom:20px' }),
          el('a', { class: 'btn btn--primary', href: '#/loja', text: 'Ver a loja' }),
        ]),
      ]),
    ]);

    container.appendChild(originSection);
    container.appendChild(quote);
    container.appendChild(purposeSection);
    container.appendChild(waySection);
    container.appendChild(cta);
  }

  GDM.pages.about = { render: render };
})(window.GDM = window.GDM || {});
