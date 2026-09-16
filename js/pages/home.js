/* ==========================================================================
   Página: Início
   ========================================================================== */
(function (GDM) {
  'use strict';
  const { el } = GDM.security;
  GDM.pages = GDM.pages || {};
  const C = GDM.content;

  function heroTrustItem(iconName, label) {
    const icon = el('span', { class: 'hero-trust-item__icon' });
    icon.innerHTML = GDM.icons.icon(iconName);
    return el('div', { class: 'hero-trust-item' }, [icon, el('span', { class: 'hero-trust-item__label', text: label })]);
  }

  function hero() {
    const logo = el('div', { class: 'hero__logo' });
    logo.appendChild(el('span', { class: 'hero__logo-shadow' }));
    logo.appendChild(el('img', {
      src: 'assets/logo-grao-de-mostarda.png',
      alt: 'Grão de Mostarda — Editora Gráfica Cristã',
      width: '480',
      height: '270',
      loading: 'eager',
      class: 'hero-float hero-float--slow',
    }));

    const title = el('h1', { class: 'hero__title' });
    title.appendChild(document.createTextNode('Produtos feitos com'));
    title.appendChild(el('em', { text: 'amor, fé e propósito' }));

    const verse = el('blockquote', { class: 'hero__verse' }, [
      document.createTextNode('"Se tiverdes fé do tamanho de um grão de mostarda…"'),
      el('cite', { text: C.BRAND.verseRef }),
    ]);

    const actions = el('div', { class: 'hero__actions' }, [
      el('a', { class: 'btn btn--primary', href: '#/loja', text: 'Ver a loja' }),
      (function () { const a = el('a', { class: 'btn btn--outline-light', href: 'https://wa.me/' + C.BRAND.whatsapp, target: '_blank', rel: 'noopener' }); a.innerHTML = GDM.icons.icon('whatsapp') + '<span>Falar no WhatsApp</span>'; return a; })(),
    ]);

    const trust = el('div', { class: 'hero-trust-row' }, [
      heroTrustItem('handmade', 'Feito à mão'),
      heroTrustItem('truck', 'Envio Nacional'),
      heroTrustItem('shield', 'Pagamento Seguro'),
    ]);

    const content = el('div', { class: 'container hero__content' }, [
      logo,
      el('p', { class: 'eyebrow hero__eyebrow', text: 'Artesanato · Fé' }),
      title,
      verse,
      actions,
      trust,
    ]);
    return el('section', { class: 'hero' }, [content]);
  }

  const CATEGORY_CARD_TONES = ['#3a2216', '#4d2e1c', '#2b1810', '#653c23'];

  function categoryCard(cat, idx) {
    const tone = CATEGORY_CARD_TONES[idx % CATEGORY_CARD_TONES.length];
    const art = el('div', { class: 'category-card__art', style: 'background:linear-gradient(150deg,' + tone + ',#1c1108)' });
    const iconWrap = el('span', { class: 'category-card__icon' });
    iconWrap.innerHTML = GDM.categoryArt.categoryIconSvg(cat.slug, '#e6c583', 96);
    art.appendChild(iconWrap);
    art.appendChild(el('span', { class: 'category-card__scrim' }));

    const label = el('div', { class: 'category-card__label' }, [
      el('span', { class: 'category-card__name', text: cat.label }),
    ]);
    const arrow = el('span', { class: 'category-card__arrow' });
    arrow.innerHTML = GDM.icons.icon('chevronRight');
    label.appendChild(arrow);

    return el('a', {
      class: 'category-card', href: '#/loja?categoria=' + cat.slug, 'data-route-link': '',
      'data-reveal': 'fade', style: '--reveal-index:' + (idx % 6),
    }, [art, label]);
  }

  function categoriesSection() {
    const grid = el('div', { class: 'category-grid' });
    GDM.catalog.CATEGORIES.forEach(function (cat, idx) { grid.appendChild(categoryCard(cat, idx)); });
    return el('section', { class: 'section section--tight section--bordered' }, [
      el('div', { class: 'container text-block' }, [
        el('p', { class: 'eyebrow', text: 'Explorar' }),
        el('h2', { text: 'As nossas categorias', style: 'margin-bottom:20px' }),
        grid,
      ]),
    ]);
  }

  function featuredSection() {
    const picks = GDM.catalog.featured().slice(0, 5);
    const grid = el('div', { class: 'featured-grid' });
    picks.forEach(function (p, idx) {
      grid.appendChild(GDM.components.productCard.render(p, { hero: idx === 0, reveal: 'scale' }));
    });
    return el('section', { class: 'section section--cream' }, [
      el('div', { class: 'container' }, [
        el('div', { class: 'cluster', style: 'justify-content:space-between;margin-bottom:24px;gap:12px' }, [
          el('div', { class: 'text-block' }, [el('p', { class: 'eyebrow', text: 'Destaques' }), el('h2', { text: 'Peças mais procuradas' })]),
          el('a', { class: 'btn btn--outline', href: '#/loja', text: 'Ver todos os produtos' }),
        ]),
        grid,
      ]),
    ]);
  }

  function benefitsSection() {
    const row = el('div', { class: 'benefit-row' });
    C.BENEFITS.forEach(function (b) {
      const icon = el('div', { class: 'benefit__icon' });
      icon.innerHTML = GDM.icons.icon(b.icon);
      row.appendChild(el('div', { class: 'benefit', 'data-reveal': 'fade' }, [icon, el('h3', { text: b.title }), el('p', { text: b.text })]));
    });
    return el('section', { class: 'section' }, [el('div', { class: 'container' }, [row])]);
  }

  function storyTeaser() {
    const art = el('div', { class: 'story-teaser__art panel', style: 'aspect-ratio:1/1;background:linear-gradient(135deg,#f4ead6,#e6c583)', 'data-reveal': 'left' });
    art.innerHTML = '<svg viewBox="0 0 300 300" style="width:100%;height:100%"><g transform="translate(40,90) scale(1.8)">' + GDM.motifs.mustardBranch({ leafColor: '#6b7b5e' }) + '</g><g transform="translate(70,170) scale(1.6)">' + GDM.motifs.mustardBranch({ leafColor: '#93672a', flip: true }) + '</g></svg>';

    const text = el('div', { class: 'text-block', 'data-reveal': 'right' }, [
      el('p', { class: 'eyebrow', text: 'A nossa história' }),
      el('h2', { text: 'Porque se chama Grão de Mostarda' }),
      el('blockquote', { class: 'story-teaser__verse' }, [
        document.createTextNode('"' + C.BRAND.verse + '"'),
        el('cite', { text: C.BRAND.verseRef }),
      ]),
      el('p', { text: C.STORY.origin.slice(0, 220) + '…', style: 'color:var(--ink-700)' }),
      el('a', { class: 'btn btn--dark', href: '#/sobre', text: 'Conhecer a nossa história' }),
    ]);

    return el('section', { class: 'section section--bordered' }, [el('div', { class: 'container split' }, [art, text])]);
  }

  function howItWorks() {
    const steps = el('div', { class: 'steps' });
    C.HOW_IT_WORKS.slice(0, 4).forEach(function (s) {
      steps.appendChild(el('div', { class: 'step text-block', 'data-reveal': 'fade' }, [el('h3', { text: s.title }), el('p', { text: s.text, style: 'color:var(--ink-500)' })]));
    });
    return el('section', { class: 'section section--cream' }, [
      el('div', { class: 'container text-block' }, [
        el('p', { class: 'eyebrow', text: 'Como funciona' }),
        el('h2', { text: 'Da escolha à sua porta', style: 'margin-bottom:28px' }),
        steps,
      ]),
    ]);
  }

  function testimonials() {
    if (!C.TESTIMONIALS.length) {
      const empty = el('div', { class: 'testi-empty panel', 'data-reveal': 'fade' }, [
        (function () { const s = document.createElement('span'); s.innerHTML = GDM.icons.icon('sparkle'); return s; })(),
        el('h3', { text: 'Ainda não temos histórias publicadas' }),
        el('p', { text: 'O site é novo em folha — seja das primeiras pessoas a partilhar a sua experiência com o ateliê.', style: 'color:var(--ink-500);max-width:46ch' }),
        (function () { const a = el('a', { class: 'btn btn--dark', href: 'https://wa.me/' + C.BRAND.whatsapp, target: '_blank', rel: 'noopener' }); a.innerHTML = GDM.icons.icon('whatsapp') + '<span>Falar connosco</span>'; return a; })(),
      ]);
      return el('section', { class: 'section' }, [
        el('div', { class: 'container text-block' }, [
          el('p', { class: 'eyebrow', text: 'Quem já comprou' }),
          el('h2', { text: 'Histórias de quem confia no ateliê', style: 'margin-bottom:28px' }),
          empty,
        ]),
      ]);
    }
    const grid = el('div', { class: 'testi-grid' });
    C.TESTIMONIALS.forEach(function (t) {
      const avatar = el('span', { class: 'testi-avatar', style: 'background:' + t.color, text: t.name.charAt(0) });
      grid.appendChild(el('div', { class: 'testi-card', 'data-reveal': 'fade' }, [
        GDM.components.starRow(5),
        el('p', { class: 'testi-card__quote', text: '"' + t.quote + '"' }),
        el('div', { class: 'testi-card__who' }, [avatar, el('div', { class: 'stack', style: 'gap:2px' }, [el('strong', { text: t.name }), el('span', { text: t.location })])]),
      ]));
    });
    return el('section', { class: 'section' }, [
      el('div', { class: 'container text-block' }, [
        el('p', { class: 'eyebrow', text: 'Quem já comprou' }),
        el('h2', { text: 'Histórias de quem confiou no ateliê', style: 'margin-bottom:28px' }),
        grid,
      ]),
    ]);
  }

  function ctaBand() {
    const band = el('div', { class: 'cta-band text-block', 'data-reveal': 'scale' }, [
      el('p', { class: 'eyebrow', text: 'Comece hoje', style: 'justify-content:center;color:var(--gold-300)' }),
      el('h2', { text: 'Encontre a peça que fala por si' }),
      el('p', { class: 'cta-band__verse', text: '"' + C.BRAND.verse + '"' }),
      el('div', { class: 'hero__actions', style: 'justify-content:center' }, [
        el('a', { class: 'btn btn--primary', href: '#/loja', text: 'Explorar a loja' }),
        el('a', { class: 'btn btn--outline-light', href: '#/inspiracao', text: 'Ver inspiração' }),
      ]),
    ]);
    return el('section', { class: 'section' }, [el('div', { class: 'container' }, [band])]);
  }

  function render(container) {
    container.innerHTML = '';
    container.appendChild(hero());
    container.appendChild(benefitsSection());
    container.appendChild(categoriesSection());
    container.appendChild(featuredSection());
    container.appendChild(storyTeaser());
    container.appendChild(howItWorks());
    container.appendChild(testimonials());
    container.appendChild(ctaBand());

    GDM.meta.setJsonLd('organization', {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: C.BRAND.name,
      url: GDM.meta.absoluteUrl('/'),
      logo: GDM.meta.absoluteUrl('assets/og-image.png'),
      sameAs: [C.BRAND.instagramUrl],
      contactPoint: {
        '@type': 'ContactPoint',
        contactType: 'customer service',
        telephone: '+' + C.BRAND.whatsapp,
        email: C.BRAND.email,
        areaServed: 'PT',
      },
    });
  }

  GDM.pages.home = { render: render };
})(window.GDM = window.GDM || {});
