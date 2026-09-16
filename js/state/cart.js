/* ==========================================================================
   Estado do carrinho — persistido em localStorage, mas o PREÇO E O STOCK
   USADOS EM QUALQUER CÁLCULO VÊM SEMPRE DO CATÁLOGO (GDM.catalog), nunca do
   que estiver guardado. Linhas cujo produto já não existe, ou cuja
   quantidade não é um número válido, são descartadas silenciosamente.
   ========================================================================== */
(function (GDM) {
  'use strict';

  const KEY = 'cart';
  const MAX_QTY_PER_LINE = 20;

  function lineKey(productId) {
    return productId;
  }

  function isValidRawLine(line) {
    return line && typeof line === 'object' &&
      typeof line.productId === 'string' &&
      Number.isInteger(line.qty) && line.qty > 0;
  }

  function validateShape(parsed) {
    return Array.isArray(parsed) && parsed.every(isValidRawLine);
  }

  function loadRaw() {
    const stored = GDM.storage.read(KEY, validateShape);
    if (!stored) return [];
    // Descarta linhas cujo produto já não exista no catálogo atual, e
    // recorta a quantidade ao stock real disponível — nunca confia no
    // número guardado além do que o catálogo permite hoje.
    return stored.reduce(function (acc, line) {
      const product = GDM.catalog.getById(line.productId);
      if (!product) return acc;
      const safeQty = Math.max(1, Math.min(line.qty, product.stock, MAX_QTY_PER_LINE));
      acc.push({ productId: line.productId, qty: safeQty });
      return acc;
    }, []);
  }

  function persist(lines) {
    GDM.storage.write(KEY, lines);
    GDM.bus.emit('cart:change', getState());
  }

  function getRawLines() { return loadRaw(); }

  /** Devolve as linhas do carrinho já unidas com dados frescos do catálogo. */
  function getState() {
    const lines = getRawLines();
    const items = lines.map(function (line) {
      const product = GDM.catalog.getById(line.productId);
      return {
        key: lineKey(line.productId),
        product: product,
        qty: line.qty,
        lineTotal: Math.round(product.price * line.qty * 100) / 100,
      };
    });
    const subtotal = Math.round(items.reduce(function (sum, it) { return sum + it.lineTotal; }, 0) * 100) / 100;
    const count = items.reduce(function (sum, it) { return sum + it.qty; }, 0);
    return { items: items, subtotal: subtotal, count: count };
  }

  function addItem(productId, qty) {
    const product = GDM.catalog.getById(productId);
    if (!product) return getState();
    const safeQty = Math.max(1, Math.min(Number(qty) || 1, product.stock, MAX_QTY_PER_LINE));
    const lines = getRawLines();
    const existing = lines.find(function (l) { return l.productId === productId; });
    if (existing) {
      existing.qty = Math.max(1, Math.min(existing.qty + safeQty, product.stock, MAX_QTY_PER_LINE));
    } else {
      lines.push({ productId: productId, qty: safeQty });
    }
    persist(lines);
    return getState();
  }

  function updateQty(key, qty) {
    const lines = getRawLines();
    const target = lines.find(function (l) { return lineKey(l.productId) === key; });
    if (!target) return getState();
    const product = GDM.catalog.getById(target.productId);
    const safeQty = Math.max(1, Math.min(Number(qty) || 1, product.stock, MAX_QTY_PER_LINE));
    target.qty = safeQty;
    persist(lines);
    return getState();
  }

  function removeItem(key) {
    const lines = getRawLines().filter(function (l) { return lineKey(l.productId) !== key; });
    persist(lines);
    return getState();
  }

  function clear() {
    persist([]);
    return getState();
  }

  GDM.cart = { getState, addItem, updateQty, removeItem, clear, lineKey: lineKey };
})(window.GDM = window.GDM || {});
