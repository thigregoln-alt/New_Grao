/* ==========================================================================
   Página: Projetos — o que o ateliê está a construir para além da loja.
   Distinta de "Inspiração" (versículos/histórias ligadas às categorias) —
   ver js/pages/inspiration.js.
   ========================================================================== */
(function (GDM) {
  'use strict';
  const { el } = GDM.security;
  GDM.pages = GDM.pages || {};

  function projectArt(project) {
    const art = el('div', { class: 'project-card__art' });
    if (project.status === 'ativo') {
      const logo = el('span', { class: 'project-card__logo' });
      logo.appendChild(el('img', {
        src: 'assets/logo-grao-de-mostarda.png',
        alt: 'Grão de Mostarda',
        loading: 'lazy',
      }));
      art.appendChild(logo);
    } else {
      art.classList.add('project-card__art--placeholder');
      const seed = document.createElement('span');
      seed.innerHTML = '<svg viewBox="0 0 40 40" width="48" height="48"><g transform="translate(6,4)">' + GDM.motifs.seed({ r: 12 }) + '</g></svg>';
      art.appendChild(seed);
    }
    return art;
  }

  function projectCard(project) {
    const badgeClass = project.status === 'ativo' ? 'badge--gold' : 'badge--outline';
    const body = el('div', { class: 'project-card__body' }, [
      el('span', { class: 'badge ' + badgeClass, text: project.badge }),
      el('h3', { text: project.title }),
      el('p', { text: project.description, style: 'color:var(--ink-700)' }),
    ]);
    if (project.ctaLabel) {
      body.appendChild(el('a', { class: 'btn btn--outline', href: project.ctaHref, text: project.ctaLabel }));
    }
    return el('article', { class: 'project-card', 'data-reveal': 'fade' }, [projectArt(project), body]);
  }

  function render(container) {
    container.innerHTML = '';
    container.appendChild(GDM.components.pageHero({
      eyebrow: 'Projetos',
      title: 'O que estamos a construir',
      lede: 'Para além da loja, a Grão de Mostarda está por trás de mais do que um projeto. Estes são os que já estão em curso.',
    }));
    const grid = el('div', { class: 'container project-grid', style: 'padding-block:var(--space-2xl)' });
    GDM.content.PROJECTS.forEach(function (p) { grid.appendChild(projectCard(p)); });
    container.appendChild(grid);
  }

  GDM.pages.projects = { render: render };
})(window.GDM = window.GDM || {});
