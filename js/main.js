/* ==========================================================================
   Bootstrap da aplicação — monta layout persistente, regista rotas, arranca
   o router. Sem frameworks, sem passo de build.
   ========================================================================== */
(function (GDM) {
  'use strict';

  function mountLayout() {
    const headerHost = document.getElementById('header-host');
    const overlayHost = document.getElementById('overlay-host');
    const footerHost = document.getElementById('footer-host');

    GDM.components.header.mount(headerHost);
    GDM.components.cartDrawer.mount(overlayHost);
    GDM.components.toast.mount(overlayHost);
    GDM.components.footer.mount(footerHost);
    GDM.components.cookieConsent.mount(overlayHost);
  }

  function registerRoutes() {
    const R = GDM.router;
    R.register('/', GDM.pages.home.render, { title: 'Início', description: 'Ateliê português de produtos personalizados com temática cristã: Bíblias, canecas, t-shirts, decoração, cadernos e mais. Feito à mão, um de cada vez.' });
    R.register('/loja', GDM.pages.shop.render, { title: 'Loja', description: 'Nove categorias de peças cristãs feitas à mão: Bíblias, canecas, t-shirts, decoração, cadernos, porta-chaves e kits de pintura infantil.' });
    R.register('/produto/:slug', GDM.pages.product.render, { title: 'Produto' });
    R.register('/carrinho', GDM.pages.cart.render, { title: 'Carrinho', description: 'Reveja os produtos no seu carrinho antes de finalizar o pedido.' });
    R.register('/checkout', GDM.pages.checkout.render, { title: 'Checkout', description: 'Confirme os seus dados de entrega — o pagamento é combinado diretamente pelo WhatsApp.' });
    R.register('/favoritos', GDM.pages.favorites.render, { title: 'Favoritos', description: 'Os produtos que guardou como favoritos neste dispositivo.' });
    R.register('/sobre', GDM.pages.about.render, { title: 'Sobre Nós', description: 'Como uma frase de fé — "Se tiverdes fé do tamanho de um grão de mostarda" — se tornou um ateliê de produtos cristãos feitos à mão em Portugal.' });
    R.register('/inspiracao', GDM.pages.inspiration.render, { title: 'Inspiração', description: 'Versículos e histórias de fé ligados a cada categoria de produtos do ateliê.' });
    R.register('/projetos', GDM.pages.projects.render, { title: 'Projetos', description: 'O que a Grão de Mostarda está a construir para além da loja.' });
    R.register('/faq', GDM.pages.faq.render, { title: 'FAQ', description: 'Perguntas frequentes sobre encomendas, produção e pagamento no ateliê Grão de Mostarda.' });
    R.register('/envios', GDM.pages.shipping.render, { title: 'Envios & Prazos', description: 'Métodos e prazos de envio das encomendas do ateliê Grão de Mostarda, via CTT.' });
    R.register('/trocas', GDM.pages.returns.render, { title: 'Trocas & Devoluções', description: 'Política de trocas e devoluções do ateliê Grão de Mostarda, incluindo peças feitas por encomenda.' });
    R.register('/contacto', GDM.pages.contact.render, { title: 'Contacto', description: 'Fale connosco por WhatsApp, e-mail ou Instagram — respondemos normalmente em menos de 24 horas úteis.' });
    R.register('/avaliacoes', GDM.pages.reviews.render, { title: 'Avaliações', description: 'Avaliações reais de clientes do ateliê Grão de Mostarda.' });
    R.register('/privacidade', GDM.pages.privacyPolicy.render, { title: 'Política de Privacidade', description: 'Como o ateliê Grão de Mostarda recolhe, usa e protege os seus dados pessoais.' });
    R.register('/termos', GDM.pages.terms.render, { title: 'Termos e Condições', description: 'Termos e condições de compra no ateliê Grão de Mostarda: produção por encomenda, pagamento e envios.' });
    R.register('/admin', GDM.pages.admin.render, { title: 'Administração', description: 'Área de administração (maquete de demonstração).' });
  }

  function init() {
    mountLayout();
    registerRoutes();
    GDM.router.resolve();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})(window.GDM = window.GDM || {});
