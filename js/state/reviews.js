/* ==========================================================================
   Avaliações submetidas pelo utilizador — guardadas em localStorage,
   combinadas com as avaliações-semente de GDM.content.REVIEWS para efeitos
   de apresentação. Todo o texto é sanitizado antes de guardar E é sempre
   inserido no DOM via textContent (nunca innerHTML) no momento da leitura.
   ========================================================================== */
(function (GDM) {
  'use strict';
  const KEY = 'user_reviews';

  function isValidStoredReview(r) {
    return r && typeof r === 'object' &&
      typeof r.id === 'string' &&
      typeof r.productId === 'string' &&
      Number.isInteger(r.rating) && r.rating >= 1 && r.rating <= 5 &&
      typeof r.author === 'string' &&
      typeof r.title === 'string' &&
      typeof r.body === 'string' &&
      typeof r.date === 'string';
  }

  function validateShape(parsed) {
    return Array.isArray(parsed) && parsed.every(isValidStoredReview);
  }

  function loadUserReviews() {
    return GDM.storage.read(KEY, validateShape) || [];
  }

  function persist(list) {
    GDM.storage.write(KEY, list);
    GDM.bus.emit('reviews:change', list);
  }

  /** Todas as avaliações (semente + utilizador) para um produto, mais recentes primeiro por defeito. */
  function forProduct(productId) {
    const seed = GDM.content.REVIEWS.filter(function (r) { return r.productId === productId; });
    const mine = loadUserReviews().filter(function (r) { return r.productId === productId; });
    return seed.concat(mine);
  }

  function all() {
    return GDM.content.REVIEWS.concat(loadUserReviews());
  }

  function add(input) {
    const product = GDM.catalog.getById(input.productId);
    if (!product) return null;
    const rating = Math.max(1, Math.min(5, Math.round(Number(input.rating) || 0)));
    if (!rating) return null;
    const author = GDM.security.sanitizeInput(input.author, 60) || 'Cliente Grão de Mostarda';
    const title = GDM.security.sanitizeInput(input.title, 80);
    const body = GDM.security.sanitizeInput(input.body, 600);
    if (!title || !body) return null;
    const review = {
      id: 'usr-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
      productId: input.productId,
      author: author,
      rating: rating,
      title: title,
      body: body,
      date: new Date().toISOString().slice(0, 10),
      verified: false,
    };
    const list = loadUserReviews();
    list.unshift(review);
    persist(list);
    return review;
  }

  /** Nota média real + contagem para um produto, a partir de avaliações reais
   *  (semente + utilizador). Nunca inventa números — devolve count:0 se não
   *  houver nenhuma avaliação ainda. */
  function summaryFor(productId) {
    const list = forProduct(productId);
    if (!list.length) return { avg: 0, count: 0 };
    const sum = list.reduce(function (s, r) { return s + r.rating; }, 0);
    return { avg: sum / list.length, count: list.length };
  }

  GDM.reviews = { forProduct, all, add, summaryFor };
})(window.GDM = window.GDM || {});
