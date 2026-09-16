# Prioridade 1 — Correções e Fundações (SEO, dados estruturados, legal) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Este projeto não tem framework de testes nem passo de build — "correr os testes" significa verificar no browser (idealmente via Playwright) e, quando aplicável, `grep`/leitura do ficheiro gerado.

**Goal:** Resolver a inconsistência das avaliações fictícias nos cartões de produto, adicionar meta tags dinâmicas (SEO + Open Graph + Twitter Card + canonical), dados estruturados JSON-LD, `robots.txt`/`sitemap.xml`, duas páginas legais (Privacidade, Termos) e um banner de consentimento de cookies — tudo em HTML/CSS/JS puro, sem build step, seguindo o padrão `window.GDM` já usado no projeto.

**Architecture:** Site é uma SPA com router por hash (`js/router.js`) e módulos IIFE que estendem `window.GDM`. Este plano acrescenta dois módulos novos (`js/utils/meta.js` para meta tags/JSON-LD, e conteúdo legal em `js/data/content.js` + `js/pages/legal.js`), estende `GDM.reviews` com um cálculo de nota real, e integra tudo no ciclo de vida do router (`resolve()`/`afterRender()`), que hoje só define `document.title`.

**Tech Stack:** HTML/CSS/JS puro (sem frameworks, sem build). Verificação manual/Playwright no browser em `http://127.0.0.1:5501/index.html`.

**Spec:** Briefing completo do utilizador nesta conversa (secção "Prioridade 1 — Correções e fundações"). Domínio de produção ainda não decidido — usa-se um placeholder centralizado (`BRAND.siteUrl = 'https://graodemostarda.pt'`) fácil de trocar mais tarde (confirmado com o utilizador via pergunta direta nesta sessão).

## Global Constraints

- Não introduzir frameworks, bibliotecas externas nem passo de build — tudo continua a carregar via `<script src>` simples no `index.html`, IIFEs a estender `window.GDM`.
- Nunca inserir texto de utilizador via `innerHTML` — usar sempre `GDM.security.el` / `textContent` (ver `js/utils/security.js`).
- Não reintroduzir avaliações/testemunhos fictícios como se fossem reais — qualquer nota exibida tem de vir de `GDM.reviews` (dados reais: semente `GDM.content.REVIEWS`, hoje vazia, + avaliações do utilizador em `localStorage`), nunca de números inventados no catálogo.
- Não adicionar checkout de pagamento automático nem qualquer fluxo de cobrança — o modelo de pagamento manual por WhatsApp é uma decisão consciente do cliente, não mexer nisso.
- Manter a paleta e tipografia já usadas no projeto — variáveis CSS em `css/tokens.css` (`--leather-*`, `--gold-*`, `--cream-*`, `--font-display`/`--font-body`). Não inventar cores novas.
- Comentários `REQUER BACKEND` existentes no código não podem ser apagados.
- Commits pequenos e frequentes, mensagens em português, um por tarefa (ou grupo de tarefas relacionadas).
- Depois de cada grupo de mudanças, testar manualmente as rotas afetadas em desktop e em viewport mobile (375px).

---

## File Structure

- `js/state/reviews.js` — **Modify**: adicionar `summaryFor(productId)` (nota média real + contagem, a partir de avaliações reais).
- `js/components/ui.js` — **Modify**: `ratingBlock(rating, count)` passa a devolver `null` quando `count` é 0 (nenhuma nota fictícia exibida).
- `js/components/productCard.js` — **Modify**: usar `GDM.reviews.summaryFor(product.id)` em vez de `product.rating`/`product.reviews`.
- `js/pages/product.js` — **Modify**: idem no bloco de info do produto e em `reviewsSummaryBlock`; adicionar JSON-LD `Product` + `BreadcrumbList` e `GDM.meta.set(...)` específico.
- `js/pages/shop.js` — **Modify**: ordenação "Melhor avaliação" usa nota real; `GDM.meta.set(...)` específico por categoria; JSON-LD `BreadcrumbList`.
- `js/data/products.js` — **Modify**: remover os campos fictícios `rating`/`reviews` de todos os 31 produtos (mecânico, via regex — ver Tarefa 2).
- `js/data/content.js` — **Modify**: adicionar `BRAND.siteUrl`, `BRAND.defaultDescription`, `BRAND.metaDescriptions` (mapa por rota estática) e os textos de `PRIVACY_POLICY` / `TERMS`.
- `js/utils/meta.js` — **Create**: módulo novo `GDM.meta` (title/description/canonical/OG/Twitter + JSON-LD helpers).
- `js/router.js` — **Modify**: chamar `GDM.meta.clearJsonLd()` + `GDM.meta.set(...)` com os defaults da rota **antes** de renderizar a página (para a página poder sobrepor com dados específicos depois).
- `js/main.js` — **Modify**: acrescentar `description` a cada rota registada; registar as duas novas rotas `/privacidade` e `/termos`.
- `js/pages/legal.js` — **Create**: páginas de Política de Privacidade e Termos e Condições (reutiliza `contentLayout` de `js/pages/infoPages.js`).
- `js/pages/home.js` — **Modify**: JSON-LD `Organization`.
- `js/components/footer.js` — **Modify**: adicionar coluna/links para as páginas legais; montar o banner de cookies.
- `js/components/cookieConsent.js` — **Create**: banner de consentimento (aceitar / recusar não-essenciais), guarda escolha em `localStorage`, expõe `GDM.consent.isAllowed('analytics')` para os scripts de terceiros futuros (Prioridade 2/4) verificarem antes de carregar.
- `js/utils/storage.js` — sem alterações (já genérico, reutilizado pelo consentimento).
- `index.html` — **Modify**: adicionar as tags `<meta>`/`<link>` placeholder que `GDM.meta.set` vai atualizar (para quem vê a página sem JS ver algo coerente), incluir `js/utils/meta.js`, `js/pages/legal.js`, `js/components/cookieConsent.js` na ordem certa.
- `assets/og-image.png` — **Create**: imagem de partilha 1200×630, gerada via screenshot Playwright de um template HTML temporário com a marca.
- `robots.txt` — **Create** (raiz do repo).
- `sitemap.xml` — **Create** (raiz do repo).
- `ARCHITECTURE.md` — **Modify**: documentar o que foi implementado nesta ronda.

---

### Task 1: Preparar o repositório Git

Não existe repositório Git localmente (`git status` devolve "not a git repository"), mas as regras de execução pedem commits pequenos e frequentes. Sem isto, nenhuma das tarefas seguintes pode ser commitada.

**Files:**
- Create: `.gitignore`

- [ ] **Passo 1: Inicializar o repo e criar `.gitignore`**

```bash
git init
```

Conteúdo de `.gitignore`:
```
.playwright-mcp/
```//gitignore separa artefactos locais de debug do Playwright MCP, que não fazem parte do site.

- [ ] **Passo 2: Commit inicial com o estado atual do site**

```bash
git add -A
git commit -m "chore: estado inicial do site (antes da ronda de SEO/legal/prioridade 1)"
```

- [ ] **Passo 3: Verificar**

```bash
git log --oneline
git status
```
Esperado: um commit, working tree limpo.

---

### Task 2: Avaliações honestas nos cartões de produto

Hoje `product.rating`/`product.reviews` em `js/data/products.js` são números inventados (ex.: `rating: 4.9, reviews: 86`) usados em `productCard.js`, `product.js` (info + relacionados) e na ordenação "Melhor avaliação" da loja. A página `/avaliacoes` já usa dados reais (`GDM.reviews`). Esta tarefa uniformiza tudo para a mesma fonte real, e remove os números fictícios da fonte de dados.

**Files:**
- Modify: `js/state/reviews.js`
- Modify: `js/components/ui.js:24-30`
- Modify: `js/components/productCard.js:42-51`
- Modify: `js/pages/product.js:63-74,156-163`
- Modify: `js/pages/shop.js:34`
- Modify: `js/data/products.js` (remove campos `rating`/`reviews` dos 31 produtos)

- [ ] **Passo 1: Adicionar `summaryFor` a `GDM.reviews`**

Em `js/state/reviews.js`, acrescentar antes do `GDM.reviews = { forProduct, all, add };` final:

```js
  /** Nota média real + contagem para um produto, a partir de avaliações reais
   *  (semente + utilizador). Nunca inventa números — devolve count:0 se não
   *  houver nenhuma avaliação ainda. */
  function summaryFor(productId) {
    const list = forProduct(productId);
    if (!list.length) return { avg: 0, count: 0 };
    const sum = list.reduce(function (s, r) { return s + r.rating; }, 0);
    return { avg: sum / list.length, count: list.length };
  }
```

E mudar a linha final para:
```js
  GDM.reviews = { forProduct, all, add, summaryFor };
```

- [ ] **Passo 2: `ratingBlock` deixa de mostrar nota quando não há avaliações**

Em `js/components/ui.js`, substituir:

```js
  function ratingBlock(rating, count) {
    const wrap = el('div', { class: 'rating' }, [
      starRow(rating),
      el('span', { text: rating.toFixed(1) + (count !== undefined ? ' (' + count + ')' : '') }),
    ]);
    return wrap;
  }
```

por:

```js
  function ratingBlock(rating, count) {
    if (!count) return null;
    const wrap = el('div', { class: 'rating' }, [
      starRow(rating),
      el('span', { text: rating.toFixed(1) + ' (' + count + ')' }),
    ]);
    return wrap;
  }
```

- [ ] **Passo 3: `productCard.js` usa a nota real**

Substituir (linha ~50):
```js
      GDM.components.ratingBlock(product.rating, product.reviews),
```
por:
```js
      (function () { const s = GDM.reviews.summaryFor(product.id); return GDM.components.ratingBlock(s.avg, s.count); })(),
```
(`el()` já ignora filhos `null` no array `bodyChildren`, por isso é seguro devolver `null` aqui.)

- [ ] **Passo 4: `product.js` — info do produto e "também vai gostar"**

Em `reviewsSummaryBlock` (linha ~66), substituir:
```js
    wrap.appendChild(GDM.components.ratingBlock(product.rating, product.reviews));
```
por:
```js
    const summary = GDM.reviews.summaryFor(product.id);
    const block = GDM.components.ratingBlock(summary.avg, summary.count);
    if (block) wrap.appendChild(block);
```
(`appendChild(null)` rebentaria — aqui não está dentro de um array `el()`, por isso precisa do `if`.)

Em `render()` (linha ~159), dentro do array `info`, substituir:
```js
      GDM.components.ratingBlock(product.rating, product.reviews),
```
por:
```js
      (function () { const s = GDM.reviews.summaryFor(product.id); return GDM.components.ratingBlock(s.avg, s.count); })(),
```

`relatedProducts()` já usa `GDM.components.productCard.render(p, ...)`, que por sua vez já foi corrigido no Passo 3 — nada a mudar aí.

- [ ] **Passo 5: `shop.js` — ordenar por avaliação real**

Substituir:
```js
    else if (sort === 'avaliacao') list.sort(function (a, b) { return b.rating - a.rating; });
```
por:
```js
    else if (sort === 'avaliacao') list.sort(function (a, b) { return GDM.reviews.summaryFor(b.id).avg - GDM.reviews.summaryFor(a.id).avg; });
```

- [ ] **Passo 6: Remover os campos fictícios de `js/data/products.js`**

Cada um dos 31 produtos tem uma linha no formato `rating: 4.9, reviews: 86, stock: 14, ...`. Remover mecanicamente com:

```bash
sed -i -E 's/rating: [0-9.]+, reviews: [0-9]+, //g' "js/data/products.js"
```

- [ ] **Passo 7: Verificar que não sobrou nenhuma referência a `product.rating`/`product.reviews`**

```bash
grep -rn "\.rating\b" js/ ; grep -rn "\.reviews\b" js/ ; grep -n "rating:" js/data/products.js
```
Esperado: nenhuma ocorrência de `product.rating`/`product.reviews`/`p.rating` fora de `GDM.reviews`/`review.rating` (avaliações reais têm `rating` no seu próprio objeto — isso é esperado); `rating:` já não existe em `products.js`.

- [ ] **Passo 8: Verificação no browser**

Abrir `http://127.0.0.1:5501/index.html`:
- Início → secção "Destaques": nenhum cartão mostra estrelas/nota (não há avaliações reais ainda).
- Loja → nenhum cartão mostra nota; ordenar por "Melhor avaliação" não deve dar erro (todos com `avg 0`, ordem estável).
- Um produto qualquer → nenhuma nota junto ao título; separador "Avaliações" mostra "Ainda sem avaliações escritas para este produto."
- Ir a `/avaliacoes`, submeter uma avaliação de teste para um produto → voltar à ficha desse produto: agora **deve** aparecer a nota real (1 avaliação) no cartão/ficha. Depois apagar a avaliação de teste do `localStorage` (`localStorage.removeItem('gdm:user_reviews')` na consola) para não deixar dados de teste.

- [ ] **Passo 9: Commit**

```bash
git add js/state/reviews.js js/components/ui.js js/components/productCard.js js/pages/product.js js/pages/shop.js js/data/products.js
git commit -m "fix: uniformizar avaliações dos cartões de produto com dados reais (sem notas fictícias)"
```

---

### Task 3: Imagem de partilha (Open Graph)

Sem fotografia real de produto, cria-se uma única imagem de marca (1200×630) para `og:image`/`twitter:image`, usada como default em todas as páginas até haver imagens por produto (Prioridade 2).

**Files:**
- Create (temporário, scratchpad): `<scratchpad>/og-template.html`
- Create: `assets/og-image.png`

- [ ] **Passo 1: Construir o template**

Criar um ficheiro HTML autónomo de 1200×630px que reutiliza o SVG do logótipo (`GDM.brand.logoSvg({ full: true })`, ver `js/data/brandLogo.js`) sobre um fundo em gradiente com as variáveis reais da paleta (`#2b1810` → `#1c1108`, cores douradas `#e6c583`/`#93672a`), com o nome da marca e a frase "Ateliê de Produtos Personalizados Cristãos" por baixo, tipografia consistente com `--font-display` (Georgia/serif) do `tokens.css`. Guardar em `<scratchpad>/og-template.html` — não faz parte do site, é só para gerar a imagem.

- [ ] **Passo 2: Screenshot via Playwright**

Abrir o ficheiro local no browser Playwright com viewport 1200×630, tirar screenshot da página inteira e guardar como `assets/og-image.png`.

- [ ] **Passo 3: Verificar**

Confirmar que `assets/og-image.png` existe, tem ~1200×630px, e abre corretamente (visualizar com a ferramenta Read).

- [ ] **Passo 4: Commit**

```bash
git add assets/og-image.png
git commit -m "feat: adicionar imagem de partilha (og:image) com a marca"
```

---

### Task 4: Módulo `GDM.meta` (title, description, canonical, Open Graph, Twitter Card)

**Files:**
- Modify: `js/data/content.js` (adicionar `BRAND.siteUrl`, `BRAND.defaultDescription`)
- Create: `js/utils/meta.js`
- Modify: `index.html` (tags placeholder no `<head>` + `<script src="js/utils/meta.js">`)

- [ ] **Passo 1: Acrescentar `siteUrl`/`defaultDescription` ao `BRAND`**

Em `js/data/content.js`, dentro do objeto `BRAND` (depois de `verseRef`), acrescentar:
```js
    siteUrl: 'https://graodemostarda.pt', // TODO: confirmar o domínio final de produção e atualizar aqui
    defaultDescription: 'Ateliê português de produtos personalizados com temática cristã: Bíblias, canecas, t-shirts, decoração, cadernos e mais. Feito à mão, um de cada vez — pagamento combinado por WhatsApp.',
```

- [ ] **Passo 2: Criar `js/utils/meta.js`**

```js
/* ==========================================================================
   Meta tags dinâmicas por rota — título, descrição, canonical, Open Graph e
   Twitter Card, mais dados estruturados (JSON-LD). Sem isto, motores de
   busca sem JS e pré-visualizações de partilha (WhatsApp/Instagram) só viam
   o <title>/<meta> fixos do index.html, sempre iguais em qualquer rota.
   ========================================================================== */
(function (GDM) {
  'use strict';

  const SITE_NAME = 'Grão de Mostarda Personalizados';
  const DEFAULT_IMAGE = 'assets/og-image.png';

  function ensureMeta(attrName, attrValue) {
    let node = document.querySelector('meta[' + attrName + '="' + attrValue + '"]');
    if (!node) {
      node = document.createElement('meta');
      node.setAttribute(attrName, attrValue);
      document.head.appendChild(node);
    }
    return node;
  }

  function ensureLink(rel) {
    let node = document.querySelector('link[rel="' + rel + '"]');
    if (!node) {
      node = document.createElement('link');
      node.setAttribute('rel', rel);
      document.head.appendChild(node);
    }
    return node;
  }

  function absoluteUrl(path) {
    const base = GDM.content.BRAND.siteUrl.replace(/\/$/, '');
    if (!path) return base + '/';
    if (/^https?:\/\//.test(path)) return path;
    return base + '/' + path.replace(/^\//, '');
  }

  /** Atualiza title, description, canonical, Open Graph e Twitter Card para
   *  a rota atual. opts: { title, description, path, image, type } */
  function set(opts) {
    opts = opts || {};
    const title = opts.title ? opts.title + ' · ' + SITE_NAME : SITE_NAME;
    const description = opts.description || GDM.content.BRAND.defaultDescription;
    const image = absoluteUrl(opts.image || DEFAULT_IMAGE);
    const url = absoluteUrl('#' + (opts.path || '/'));
    const type = opts.type || 'website';

    document.title = title;
    ensureMeta('name', 'description').setAttribute('content', description);
    ensureLink('canonical').setAttribute('href', url);

    ensureMeta('property', 'og:title').setAttribute('content', title);
    ensureMeta('property', 'og:description').setAttribute('content', description);
    ensureMeta('property', 'og:image').setAttribute('content', image);
    ensureMeta('property', 'og:url').setAttribute('content', url);
    ensureMeta('property', 'og:type').setAttribute('content', type);
    ensureMeta('property', 'og:site_name').setAttribute('content', SITE_NAME);

    ensureMeta('name', 'twitter:card').setAttribute('content', 'summary_large_image');
    ensureMeta('name', 'twitter:title').setAttribute('content', title);
    ensureMeta('name', 'twitter:description').setAttribute('content', description);
    ensureMeta('name', 'twitter:image').setAttribute('content', image);
  }

  /** Injeta/atualiza um bloco JSON-LD identificado por `id` (ex.: 'organization',
   *  'product', 'breadcrumb'). Cada página é responsável por chamar isto depois
   *  de renderizar; o router limpa todos os blocos a cada mudança de rota
   *  (ver clearJsonLd), para nunca sobrar JSON-LD de uma página anterior. */
  function setJsonLd(id, obj) {
    let node = document.getElementById('ld-' + id);
    if (!node) {
      node = document.createElement('script');
      node.type = 'application/ld+json';
      node.id = 'ld-' + id;
      node.setAttribute('data-gdm-ld', '');
      document.head.appendChild(node);
    }
    node.textContent = JSON.stringify(obj);
  }

  function clearJsonLd() {
    document.querySelectorAll('script[data-gdm-ld]').forEach(function (n) { n.remove(); });
  }

  GDM.meta = { set: set, setJsonLd: setJsonLd, clearJsonLd: clearJsonLd, absoluteUrl: absoluteUrl };
})(window.GDM = window.GDM || {});
```

- [ ] **Passo 3: Registar o script e as tags placeholder em `index.html`**

Adicionar no `<head>`, depois da `<meta name="description">` existente (para quem não corre JS ver algo coerente):
```html
<link rel="canonical" href="https://graodemostarda.pt/">
<meta property="og:title" content="Grão de Mostarda Personalizados — Ateliê de Produtos Personalizados Cristãos">
<meta property="og:description" content="Ateliê português de produtos personalizados com temática cristã: Bíblias, canecas, t-shirts, decoração, cadernos e mais. Feito à mão, um de cada vez.">
<meta property="og:image" content="https://graodemostarda.pt/assets/og-image.png">
<meta property="og:url" content="https://graodemostarda.pt/">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Grão de Mostarda Personalizados">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="Grão de Mostarda Personalizados — Ateliê de Produtos Personalizados Cristãos">
<meta name="twitter:description" content="Ateliê português de produtos personalizados com temática cristã: Bíblias, canecas, t-shirts, decoração, cadernos e mais. Feito à mão, um de cada vez.">
<meta name="twitter:image" content="https://graodemostarda.pt/assets/og-image.png">
```

Adicionar `<script src="js/utils/meta.js"></script>` na secção "Utilitários", depois de `formHelpers.js` e antes da secção "Dados" (precisa de `GDM.content`, mas só em tempo de chamada, não no carregamento do IIFE, por isso a ordem de `<script>` não é crítica — mantém-se agrupado com os utilitários por convenção).

- [ ] **Passo 4: Verificar**

```bash
grep -n "meta.js" index.html
grep -n "GDM.meta" js/utils/meta.js
```
Abrir `index.html` no browser, consola: `GDM.meta.set({ title: 'Teste', description: 'Desc teste', path: '/teste' })` → confirmar que `document.title` e `document.querySelector('meta[name=description]').content` mudam.

- [ ] **Passo 5: Commit**

```bash
git add js/data/content.js js/utils/meta.js index.html
git commit -m "feat: adicionar módulo GDM.meta (title/description/canonical/Open Graph/Twitter Card)"
```

---

### Task 5: Integrar `GDM.meta` no router + descrições por rota

**Files:**
- Modify: `js/router.js:69-99`
- Modify: `js/main.js:19-36`

- [ ] **Passo 1: Router define os defaults da rota antes de renderizar, a página pode sobrepor depois**

Em `js/router.js`, substituir a função `resolve()` inteira por:

```js
  function resolve() {
    runCleanup();
    const { path, query } = parseHash();
    const found = matchRoute(path);
    const app = document.getElementById('app');
    GDM.components.closeAllOverlays();
    GDM.meta.clearJsonLd();

    if (!found) {
      current = { path: '/404', query: query };
      GDM.meta.set({ title: 'Página não encontrada', description: 'A página que procura não existe ou foi movida.', path: path });
      currentCleanup = GDM.pages.notFound.render(app, {}, query);
      afterRender(path);
      return;
    }

    const params = buildParams(found.match, found.route.paramNames);
    current = { path: path, query: query, params: params };
    GDM.meta.set({ title: found.route.meta.title, description: found.route.meta.description, path: path });
    try {
      currentCleanup = found.route.handler(app, params, query);
    } catch (err) {
      console.error('[router] erro a renderizar', path, err);
      currentCleanup = GDM.pages.notFound.render(app, {}, query);
    }
    afterRender(path);
  }
```

E substituir `afterRender(path, meta)` por (já não precisa de `meta`, e já não mexe em `document.title` — isso passou a ser responsabilidade do `GDM.meta.set` acima):
```js
  function afterRender(path) {
    window.scrollTo({ top: 0, behavior: 'auto' });
    GDM.components.updateActiveNav(path);
    GDM.components.initScrollReveal();
  }
```

- [ ] **Passo 2: Acrescentar `description` a cada rota em `js/main.js`**

Substituir o corpo de `registerRoutes()` por:
```js
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
```
(`/privacidade` e `/termos` só vão existir depois da Tarefa 8 — registar já aqui poupa uma segunda edição a este ficheiro; até lá o build falha em runtime se navegar para essas rotas antes de `legal.js` existir, o que é aceitável dentro deste plano porque as tarefas são executadas em ordem.)

- [ ] **Passo 3: Verificar no browser**

Abrir `http://127.0.0.1:5501/index.html`, navegar por `/`, `/loja`, `/sobre`, `/contacto` — confirmar na consola/inspector que `document.title` muda e que `meta[name=description]` muda de conteúdo em cada rota (Nota: `/privacidade` e `/termos` ainda vão dar 404 até à Tarefa 8 — esperado neste ponto).

- [ ] **Passo 4: Commit**

```bash
git add js/router.js js/main.js
git commit -m "feat: integrar GDM.meta no router com descrição específica por rota"
```

---

### Task 6: Meta tags específicas — Produto e Loja (com filtro)

**Files:**
- Modify: `js/pages/product.js` (fim de `render()`)
- Modify: `js/pages/shop.js` (fim de `render()`)

- [ ] **Passo 1: `product.js` — título/descrição/imagem específicos**

No fim de `render(container, params)`, depois de todos os `container.appendChild(...)`, acrescentar:
```js
    GDM.meta.set({
      title: product.name,
      description: product.name + ' — ' + product.categoryLabel + ' a partir de ' + GDM.format.currency(product.price) + '. ' + product.description,
      path: '/produto/' + product.slug,
      type: 'product',
    });
```
(Isto sobrepõe o default genérico "Produto" que o router já tinha definido antes de chamar `render`.)

- [ ] **Passo 2: `shop.js` — descrição varia com a categoria ativa**

No fim de `render(container, params, query)`, depois de `container.appendChild(wrap)`, acrescentar:
```js
    const activeCat = state.category ? GDM.catalog.CATEGORIES.find(function (c) { return c.slug === state.category; }) : null;
    GDM.meta.set({
      title: activeCat ? 'Loja — ' + activeCat.label : 'Loja',
      description: activeCat ? activeCat.short : 'Nove categorias de peças cristãs feitas à mão: Bíblias, canecas, t-shirts, decoração, cadernos, porta-chaves e kits de pintura infantil.',
      path: '/loja' + (state.category ? '?categoria=' + state.category : ''),
    });
```

- [ ] **Passo 3: Verificar no browser**

Abrir um produto qualquer (`#/produto/caneca-grao-mostarda-fe`) → `document.title` deve ser "Caneca "Fé do Tamanho de um Grão de Mostarda" · Grão de Mostarda Personalizados" e a meta description deve incluir categoria e preço. Ir a `#/loja?categoria=biblias` → título "Loja — Bíblias".

- [ ] **Passo 4: Commit**

```bash
git add js/pages/product.js js/pages/shop.js
git commit -m "feat: meta tags específicas para ficha de produto e loja filtrada"
```

---

### Task 7: Dados estruturados JSON-LD (Organization, Product, BreadcrumbList)

**Files:**
- Modify: `js/pages/home.js` (fim de `render()`)
- Modify: `js/pages/product.js` (fim de `render()`, junto ao `GDM.meta.set` da Tarefa 6)
- Modify: `js/pages/shop.js` (fim de `render()`, junto ao `GDM.meta.set` da Tarefa 6)

- [ ] **Passo 1: `Organization` na Início**

No fim de `render(container)` em `js/pages/home.js`:
```js
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
```

- [ ] **Passo 2: `Product` + `BreadcrumbList` na ficha de produto**

Em `js/pages/product.js`, junto ao `GDM.meta.set` já acrescentado na Tarefa 6:
```js
    const summary = GDM.reviews.summaryFor(product.id);
    const productLd = {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: product.name,
      description: product.description,
      image: GDM.meta.absoluteUrl('assets/og-image.png'),
      category: product.categoryLabel,
      offers: {
        '@type': 'Offer',
        priceCurrency: 'EUR',
        price: product.price.toFixed(2),
        availability: product.stock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
        url: GDM.meta.absoluteUrl('/produto/' + product.slug),
      },
    };
    if (summary.count > 0) {
      productLd.aggregateRating = { '@type': 'AggregateRating', ratingValue: summary.avg.toFixed(1), reviewCount: summary.count };
    }
    GDM.meta.setJsonLd('product', productLd);
    GDM.meta.setJsonLd('breadcrumb', {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Início', item: GDM.meta.absoluteUrl('/') },
        { '@type': 'ListItem', position: 2, name: 'Loja', item: GDM.meta.absoluteUrl('/loja') },
        { '@type': 'ListItem', position: 3, name: product.categoryLabel, item: GDM.meta.absoluteUrl('/loja?categoria=' + product.category) },
        { '@type': 'ListItem', position: 4, name: product.name, item: GDM.meta.absoluteUrl('/produto/' + product.slug) },
      ],
    });
```
Nota: `aggregateRating` só é incluído `if (summary.count > 0)` — nunca inventar números aqui, conforme pedido explicitamente no briefing.

- [ ] **Passo 3: `BreadcrumbList` na Loja**

Em `js/pages/shop.js`, junto ao `GDM.meta.set` da Tarefa 6:
```js
    GDM.meta.setJsonLd('breadcrumb', {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Início', item: GDM.meta.absoluteUrl('/') },
        { '@type': 'ListItem', position: 2, name: activeCat ? activeCat.label : 'Loja', item: GDM.meta.absoluteUrl('/loja' + (state.category ? '?categoria=' + state.category : '')) },
      ],
    });
```

- [ ] **Passo 4: Verificar**

No browser, consola:
```js
document.getElementById('ld-organization').textContent // na Início
document.getElementById('ld-product').textContent // numa ficha de produto
document.getElementById('ld-breadcrumb').textContent // na loja/produto
```
Confirmar JSON válido (`JSON.parse(...)` não rebenta) e que, ao navegar da Início para a Loja, `ld-organization` desaparece (removido por `clearJsonLd()` no router) e só existe o que a página atual definiu.

- [ ] **Passo 5: Commit**

```bash
git add js/pages/home.js js/pages/product.js js/pages/shop.js
git commit -m "feat: dados estruturados JSON-LD (Organization, Product, BreadcrumbList)"
```

---

### Task 8: Páginas legais — Política de Privacidade e Termos e Condições

**Files:**
- Modify: `js/data/content.js` (adicionar `PRIVACY_POLICY`, `TERMS`)
- Create: `js/pages/legal.js`
- Modify: `index.html` (`<script src="js/pages/legal.js">`)
- Modify: `js/components/footer.js` (link para as duas páginas legais)

- [ ] **Passo 1: Conteúdo em `js/data/content.js`**

Acrescentar antes do `GDM.content = {...}` final:
```js
  const PRIVACY_POLICY = {
    updated: '2026-09-03',
    sections: [
      { title: 'Que dados recolhemos', text: 'Recolhemos apenas os dados que nos fornece diretamente: nome, e-mail, telefone e morada (no formulário de checkout), nome e e-mail (no formulário de contacto), e e-mail (na subscrição da newsletter). Não usamos cookies de rastreio nem recolhemos dados de navegação além do estritamente necessário ao funcionamento do site (ver secção de cookies).' },
      { title: 'Para que servem', text: 'Usamos estes dados exclusivamente para: preparar e combinar consigo a sua encomenda (por WhatsApp ou e-mail), responder às suas mensagens de contacto, e enviar novidades do ateliê caso subscreva a newsletter. Nunca vendemos nem partilhamos os seus dados com terceiros para fins de marketing.' },
      { title: 'Onde ficam guardados', text: 'O carrinho, os favoritos, a subscrição da newsletter e as avaliações que escrever ficam guardados apenas no seu próprio dispositivo (localStorage do navegador) — não existe uma base de dados central neste site. Os dados que envia por WhatsApp ou e-mail no checkout/contacto ficam guardados nessas plataformas (WhatsApp, Gmail), fora do site, e são geridos diretamente pelo ateliê.' },
      { title: 'Quanto tempo guardamos', text: 'Os dados de encomendas e mensagens de contacto são guardados pelo ateliê pelo tempo necessário para cumprir obrigações legais e fiscais (normalmente até 10 anos, por exigência da lei portuguesa para documentos comerciais). Pode pedir a eliminação de dados que não estejam sujeitos a essa obrigação a qualquer momento.' },
      { title: 'Os seus direitos', text: 'Tem direito a aceder, retificar, apagar ou pedir a portabilidade dos seus dados pessoais, e a opor-se ao seu tratamento, nos termos do RGPD. Para exercer qualquer um destes direitos, contacte-nos pelos dados abaixo.' },
      { title: 'Responsável pelo tratamento', text: 'Ateliê Grão de Mostarda Personalizados — contacto: ateliergraodemostarda176@gmail.com ou WhatsApp +351 925 130 518. Se não ficar satisfeito com a nossa resposta, pode apresentar reclamação junto da Comissão Nacional de Proteção de Dados (CNPD).' },
    ],
  };

  const TERMS = {
    updated: '2026-09-03',
    sections: [
      { title: 'O que vendemos', text: 'A Grão de Mostarda Personalizados é um ateliê artesanal: cada peça é preparada por encomenda, uma de cada vez, depois de confirmado o pedido. Não temos stock de prateleira nem produção em série.' },
      { title: 'Como funciona a encomenda e o pagamento', text: 'O site não processa pagamentos automaticamente. Depois de enviar o pedido a partir do checkout (por WhatsApp ou e-mail), entramos em contacto diretamente consigo para confirmar o valor final e combinar o pagamento (MBWay ou transferência bancária). A produção só começa depois de o pagamento (ou sinal, em encomendas de maior valor) estar confirmado.' },
      { title: 'Prazos de produção e envio', text: 'A maioria das peças fica pronta em 3 a 7 dias úteis após confirmação do pagamento (reformas de Bíblia podem demorar até 10 dias úteis). O envio é feito pelos CTT, com prazo adicional de 1 a 5 dias úteis consoante o método escolhido — ver detalhes em /envios.' },
      { title: 'Trocas, devoluções e direito de livre resolução', text: 'Nos termos da legislação portuguesa de defesa do consumidor (que transpõe a Diretiva 2011/83/UE), bens feitos por medida ou claramente personalizados a pedido do cliente não estão abrangidos pelo direito de livre resolução de 14 dias aplicável a encomendas à distância. Para peças com defeito de fabrico ou erro do ateliê, ver a nossa política completa em /trocas.' },
      { title: 'Preços', text: 'Os preços apresentados no site incluem IVA à taxa legal em vigor e estão em euros. O ateliê reserva-se o direito de atualizar preços a qualquer momento, sem efeito retroativo sobre encomendas já confirmadas.' },
      { title: 'Contacto', text: 'Para qualquer dúvida sobre estes termos, contacte-nos por WhatsApp (+351 925 130 518) ou e-mail (ateliergraodemostarda176@gmail.com).' },
    ],
  };
```

E acrescentar `PRIVACY_POLICY, TERMS` ao objeto exportado `GDM.content = { ... }`.

- [ ] **Passo 2: Criar `js/pages/legal.js`**

```js
/* ==========================================================================
   Páginas legais — Política de Privacidade e Termos e Condições. Exigidas
   por lei (RGPD/UE) por já existir recolha de dados via formulário de
   contacto, checkout e newsletter, mesmo sem checkout de pagamento
   automático. Reutiliza o layout de índice lateral de infoPages.js.
   ========================================================================== */
(function (GDM) {
  'use strict';
  const { el } = GDM.security;
  GDM.pages = GDM.pages || {};

  function legalPage(data, heroOpts) {
    return function render(container) {
      container.innerHTML = '';
      const toc = el('nav', { class: 'content-toc', 'aria-label': 'Índice da página' });
      const panelHost = el('div', { class: 'stack', style: 'gap:40px' });
      data.sections.forEach(function (s, idx) {
        const id = 'sec-' + idx;
        toc.appendChild(el('a', { href: '#' + id, text: s.title }));
        panelHost.appendChild(el('div', { id: id, 'data-reveal': 'fade' }, [
          el('h2', { text: s.title, style: 'margin-bottom:16px' }),
          el('p', { text: s.text, style: 'color:var(--ink-700)' }),
        ]));
      });
      const layout = el('div', { class: 'container content-layout' }, [toc, panelHost]);
      container.appendChild(GDM.components.pageHero(heroOpts));
      container.appendChild(el('section', { class: 'section' }, [
        el('div', { class: 'container', style: 'padding-bottom:0' }, [
          el('p', { style: 'color:var(--ink-500);font-size:var(--fs-sm)', text: 'Última atualização: ' + GDM.format.dateLabel(data.updated) },
          ),
        ]),
        layout,
      ]));
    };
  }

  GDM.pages.privacyPolicy = { render: legalPage(GDM.content.PRIVACY_POLICY, { eyebrow: 'Os seus dados', title: 'Política de Privacidade', lede: 'Como recolhemos, usamos e protegemos os seus dados pessoais.' }) };
  GDM.pages.terms = { render: legalPage(GDM.content.TERMS, { eyebrow: 'Condições de compra', title: 'Termos e Condições', lede: 'As regras claras de como funciona uma encomenda no nosso ateliê.' }) };
})(window.GDM = window.GDM || {});
```

Nota: `legalPage()` devolve uma função `render` fechada sobre `data`/`heroOpts` — mas é chamada uma única vez no carregamento do módulo (`GDM.content.PRIVACY_POLICY` já existe nesse momento porque `content.js` carrega antes de `pages/legal.js` em `index.html`), por isso é seguro.

- [ ] **Passo 3: Registar o script em `index.html`**

Adicionar `<script src="js/pages/legal.js"></script>` na secção "Páginas", depois de `js/pages/reviews.js` e antes de `js/pages/admin.js`.

- [ ] **Passo 4: Link no footer**

Em `js/components/footer.js`, na coluna "Ajuda" (dentro de `linksGrid`), acrescentar duas entradas:
```js
      col('Ajuda', [
        { label: 'Envios & Prazos', hash: '/envios' },
        { label: 'Trocas & Devoluções', hash: '/trocas' },
        { label: 'Perguntas Frequentes', hash: '/faq' },
        { label: 'Contacto', hash: '/contacto' },
        { label: 'Política de Privacidade', hash: '/privacidade' },
        { label: 'Termos e Condições', hash: '/termos' },
      ]),
```

- [ ] **Passo 5: Verificar no browser**

Ir a `#/privacidade` e `#/termos` diretamente e a partir do link no rodapé — confirmar que renderizam com índice lateral, que `document.title` muda, e que não há erros na consola. Testar em viewport 375px (índice lateral deve continuar legível/utilizável, tal como as outras páginas de `infoPages.js` já testadas).

- [ ] **Passo 6: Commit**

```bash
git add js/data/content.js js/pages/legal.js index.html js/components/footer.js
git commit -m "feat: adicionar páginas de Política de Privacidade e Termos e Condições"
```

---

### Task 9: Banner de consentimento de cookies

Estrutura pronta para quando entrar analytics (Prioridade 2/4) — hoje não há nenhum script de terceiros a bloquear, mas o banner e a API `GDM.consent` ficam prontos.

**Files:**
- Create: `js/components/cookieConsent.js`
- Modify: `js/main.js` (montar o banner em `mountLayout()`)
- Modify: `index.html` (`<script src="js/components/cookieConsent.js">`)
- Modify: `css/components.css` (estilos do banner, reaproveitando classes/tokens existentes)

- [ ] **Passo 1: Criar `js/components/cookieConsent.js`**

```js
/* ==========================================================================
   Consentimento de cookies — banner simples, sem bibliotecas externas.
   Hoje o site não carrega nenhum script de terceiros (sem analytics/pixels),
   mas a estrutura fica pronta: GDM.consent.isAllowed('analytics') deve ser
   verificado por qualquer script de terceiros adicionado no futuro
   (ver MIGRACAO-UMBRACO.md) antes de o injetar no DOM.
   ========================================================================== */
(function (GDM) {
  'use strict';
  const { el } = GDM.security;
  GDM.components = GDM.components || {};

  const KEY = 'cookie_consent';

  function isValidChoice(v) {
    return v && typeof v === 'object' && (v.status === 'accepted' || v.status === 'rejected') && typeof v.date === 'string';
  }

  function getChoice() {
    return GDM.storage.read(KEY, isValidChoice);
  }

  function setChoice(status) {
    const value = { status: status, date: new Date().toISOString() };
    GDM.storage.write(KEY, value);
    GDM.bus.emit('consent:change', value);
    return value;
  }

  /** Só cookies/scripts não-essenciais (analytics, pixels) dependem disto.
   *  Funcionalidade essencial do site (carrinho, favoritos, newsletter) usa
   *  sempre localStorage independentemente do consentimento, porque não são
   *  cookies de rastreio de terceiros. */
  function isAllowed(category) {
    const choice = getChoice();
    if (!choice) return false;
    if (category === 'essential') return true;
    return choice.status === 'accepted';
  }

  function mount(root) {
    if (getChoice()) return; // já respondeu antes, não mostrar de novo

    const text = el('p', { text: 'Usamos apenas o essencial para o site funcionar (carrinho, favoritos). Com a sua autorização, poderemos também usar cookies não-essenciais no futuro (ex.: estatísticas de visitas). Pode aceitar ou recusar.' });
    const acceptBtn = el('button', { class: 'btn btn--primary btn--sm', type: 'button', text: 'Aceitar' });
    const rejectBtn = el('button', { class: 'btn btn--outline btn--sm', type: 'button', text: 'Recusar não-essenciais' });
    const linkRow = el('p', { style: 'font-size:var(--fs-xs)' }, [
      el('a', { href: '#/privacidade', 'data-route-link': '', text: 'Saber mais na Política de Privacidade' }),
    ]);

    const banner = el('div', { class: 'cookie-banner', role: 'region', 'aria-label': 'Consentimento de cookies' }, [
      el('div', { class: 'cookie-banner__inner' }, [
        el('div', { class: 'stack', style: 'gap:4px' }, [text, linkRow]),
        el('div', { class: 'cluster', style: 'gap:10px' }, [rejectBtn, acceptBtn]),
      ]),
    ]);

    function close() {
      banner.remove();
    }
    acceptBtn.addEventListener('click', function () { setChoice('accepted'); close(); });
    rejectBtn.addEventListener('click', function () { setChoice('rejected'); close(); });

    root.appendChild(banner);
  }

  GDM.consent = { getChoice: getChoice, isAllowed: isAllowed };
  GDM.components.cookieConsent = { mount: mount };
})(window.GDM = window.GDM || {});
```

- [ ] **Passo 2: Montar no arranque**

Em `js/main.js`, dentro de `mountLayout()`, depois de `GDM.components.footer.mount(footerHost);`:
```js
    GDM.components.cookieConsent.mount(overlayHost);
```

- [ ] **Passo 3: Registar o script em `index.html`**

Adicionar `<script src="js/components/cookieConsent.js"></script>` na secção "Componentes", depois de `footer.js` e antes da secção "Router".

- [ ] **Passo 4: Estilos em `css/components.css`**

Acrescentar ao fim do ficheiro (reaproveita `--leather-900`, `--gold-*`, `--shadow-lg`, `--radius-md` já definidos em `tokens.css`):
```css
/* ---- Banner de consentimento de cookies ---- */
.cookie-banner {
  position: fixed;
  left: 0; right: 0; bottom: 0;
  z-index: 60;
  background: var(--leather-900);
  color: var(--ink-on-dark);
  box-shadow: var(--shadow-lg);
  padding: var(--space-sm) var(--space-md);
}
.cookie-banner__inner {
  max-width: var(--container-max);
  margin-inline: auto;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-sm);
}
.cookie-banner__inner p { margin: 0; color: var(--ink-on-dark-muted); max-width: 60ch; }
.cookie-banner__inner a { color: var(--gold-300); }
@media (max-width: 640px) {
  .cookie-banner__inner { flex-direction: column; align-items: stretch; }
}
```

- [ ] **Passo 5: Verificar no browser**

Abrir o site (limpar `localStorage` primeiro: `localStorage.removeItem('gdm:cookie_consent')`) → banner deve aparecer fixo no fundo. Clicar "Aceitar" → banner desaparece; recarregar a página → não volta a aparecer. Repetir com "Recusar não-essenciais". Testar em 375px — botões e texto devem continuar legíveis, sem sobrepor o conteúdo nem cortar fora do ecrã.

- [ ] **Passo 6: Commit**

```bash
git add js/components/cookieConsent.js js/main.js index.html css/components.css
git commit -m "feat: adicionar banner de consentimento de cookies (estrutura pronta para analytics futuro)"
```

---

### Task 10: `robots.txt` e `sitemap.xml`

**Files:**
- Create: `robots.txt`
- Create: `sitemap.xml`

- [ ] **Passo 1: `robots.txt`**

```
User-agent: *
Allow: /
Disallow: /admin

Sitemap: https://graodemostarda.pt/sitemap.xml
```
(`/admin` é maquete de demonstração sem dados reais — não faz sentido indexar. Como o site é uma SPA por hash, isto é apenas indicativo: crawlers que respeitam `Disallow` por path de ficheiro não distinguem hashes, então o valor real de proteção é limitado — documentar esta limitação na Tarefa 11.)

- [ ] **Passo 2: `sitemap.xml`**

Gerar a lista completa de URLs (todas as rotas estáticas + as 9 categorias + os 31 produtos, lidos de `js/data/products.js`/`js/data/content.js`) no formato `https://graodemostarda.pt/#/rota`. Conteúdo completo:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>https://graodemostarda.pt/#/</loc><changefreq>weekly</changefreq><priority>1.0</priority></url>
  <url><loc>https://graodemostarda.pt/#/loja</loc><changefreq>weekly</changefreq><priority>0.9</priority></url>
  <url><loc>https://graodemostarda.pt/#/loja?categoria=biblias</loc><changefreq>weekly</changefreq><priority>0.7</priority></url>
  <url><loc>https://graodemostarda.pt/#/loja?categoria=reforma-de-biblia</loc><changefreq>weekly</changefreq><priority>0.7</priority></url>
  <url><loc>https://graodemostarda.pt/#/loja?categoria=canecas-personalizadas</loc><changefreq>weekly</changefreq><priority>0.7</priority></url>
  <url><loc>https://graodemostarda.pt/#/loja?categoria=tshirts-temas-cristaos</loc><changefreq>weekly</changefreq><priority>0.7</priority></url>
  <url><loc>https://graodemostarda.pt/#/loja?categoria=decoracao-crista</loc><changefreq>weekly</changefreq><priority>0.7</priority></url>
  <url><loc>https://graodemostarda.pt/#/loja?categoria=kit-pintura-infantil</loc><changefreq>weekly</changefreq><priority>0.7</priority></url>
  <url><loc>https://graodemostarda.pt/#/loja?categoria=porta-chaves</loc><changefreq>weekly</changefreq><priority>0.7</priority></url>
  <url><loc>https://graodemostarda.pt/#/loja?categoria=cadernos-a4</loc><changefreq>weekly</changefreq><priority>0.7</priority></url>
  <url><loc>https://graodemostarda.pt/#/loja?categoria=cadernos-a5</loc><changefreq>weekly</changefreq><priority>0.7</priority></url>
  <url><loc>https://graodemostarda.pt/#/produto/biblia-capa-couro-gravada</loc><changefreq>monthly</changefreq><priority>0.6</priority></url>
  <url><loc>https://graodemostarda.pt/#/produto/biblia-estudo-mulher-virtuosa</loc><changefreq>monthly</changefreq><priority>0.6</priority></url>
  <url><loc>https://graodemostarda.pt/#/produto/biblia-infantil-ilustrada</loc><changefreq>monthly</changefreq><priority>0.6</priority></url>
  <url><loc>https://graodemostarda.pt/#/produto/biblia-viagem-compacta</loc><changefreq>monthly</changefreq><priority>0.6</priority></url>
  <url><loc>https://graodemostarda.pt/#/produto/reforma-encadernacao-classica</loc><changefreq>monthly</changefreq><priority>0.6</priority></url>
  <url><loc>https://graodemostarda.pt/#/produto/reforma-capa-couro-premium</loc><changefreq>monthly</changefreq><priority>0.6</priority></url>
  <url><loc>https://graodemostarda.pt/#/produto/reforma-express-lombada</loc><changefreq>monthly</changefreq><priority>0.6</priority></url>
  <url><loc>https://graodemostarda.pt/#/produto/caneca-grao-mostarda-fe</loc><changefreq>monthly</changefreq><priority>0.6</priority></url>
  <url><loc>https://graodemostarda.pt/#/produto/caneca-casal-devocional</loc><changefreq>monthly</changefreq><priority>0.6</priority></url>
  <url><loc>https://graodemostarda.pt/#/produto/caneca-termica-oracao</loc><changefreq>monthly</changefreq><priority>0.6</priority></url>
  <url><loc>https://graodemostarda.pt/#/produto/caneca-infantil-arca-noe</loc><changefreq>monthly</changefreq><priority>0.6</priority></url>
  <url><loc>https://graodemostarda.pt/#/produto/tshirt-grao-mostarda-original</loc><changefreq>monthly</changefreq><priority>0.6</priority></url>
  <url><loc>https://graodemostarda.pt/#/produto/tshirt-versiculo-costas</loc><changefreq>monthly</changefreq><priority>0.6</priority></url>
  <url><loc>https://graodemostarda.pt/#/produto/tshirt-infantil-pequeno-david</loc><changefreq>monthly</changefreq><priority>0.6</priority></url>
  <url><loc>https://graodemostarda.pt/#/produto/tshirt-familia-conjunto</loc><changefreq>monthly</changefreq><priority>0.6</priority></url>
  <url><loc>https://graodemostarda.pt/#/produto/quadro-grao-mostarda-madeira</loc><changefreq>monthly</changefreq><priority>0.6</priority></url>
  <url><loc>https://graodemostarda.pt/#/produto/placa-porta-versiculo-boas-vindas</loc><changefreq>monthly</changefreq><priority>0.6</priority></url>
  <url><loc>https://graodemostarda.pt/#/produto/porta-retrato-oracao-familia</loc><changefreq>monthly</changefreq><priority>0.6</priority></url>
  <url><loc>https://graodemostarda.pt/#/produto/guirlanda-oracao-parede</loc><changefreq>monthly</changefreq><priority>0.6</priority></url>
  <url><loc>https://graodemostarda.pt/#/produto/kit-pintura-arca-noe</loc><changefreq>monthly</changefreq><priority>0.6</priority></url>
  <url><loc>https://graodemostarda.pt/#/produto/kit-pintura-davi-golias</loc><changefreq>monthly</changefreq><priority>0.6</priority></url>
  <url><loc>https://graodemostarda.pt/#/produto/kit-pintura-madeira-cruz</loc><changefreq>monthly</changefreq><priority>0.6</priority></url>
  <url><loc>https://graodemostarda.pt/#/produto/porta-chaves-pele-versiculo</loc><changefreq>monthly</changefreq><priority>0.6</priority></url>
  <url><loc>https://graodemostarda.pt/#/produto/porta-chaves-madeira-cruz</loc><changefreq>monthly</changefreq><priority>0.6</priority></url>
  <url><loc>https://graodemostarda.pt/#/produto/porta-chaves-casal-fe</loc><changefreq>monthly</changefreq><priority>0.6</priority></url>
  <url><loc>https://graodemostarda.pt/#/produto/caderno-a4-devocional-anual</loc><changefreq>monthly</changefreq><priority>0.6</priority></url>
  <url><loc>https://graodemostarda.pt/#/produto/caderno-a4-proposito-metas</loc><changefreq>monthly</changefreq><priority>0.6</priority></url>
  <url><loc>https://graodemostarda.pt/#/produto/caderno-a4-estudo-biblico</loc><changefreq>monthly</changefreq><priority>0.6</priority></url>
  <url><loc>https://graodemostarda.pt/#/produto/caderno-a5-oracoes-bolso</loc><changefreq>monthly</changefreq><priority>0.6</priority></url>
  <url><loc>https://graodemostarda.pt/#/produto/caderno-a5-gratidao-diaria</loc><changefreq>monthly</changefreq><priority>0.6</priority></url>
  <url><loc>https://graodemostarda.pt/#/produto/caderno-a5-versiculos-semana</loc><changefreq>monthly</changefreq><priority>0.6</priority></url>
  <url><loc>https://graodemostarda.pt/#/inspiracao</loc><changefreq>monthly</changefreq><priority>0.5</priority></url>
  <url><loc>https://graodemostarda.pt/#/projetos</loc><changefreq>monthly</changefreq><priority>0.5</priority></url>
  <url><loc>https://graodemostarda.pt/#/sobre</loc><changefreq>monthly</changefreq><priority>0.6</priority></url>
  <url><loc>https://graodemostarda.pt/#/contacto</loc><changefreq>monthly</changefreq><priority>0.6</priority></url>
  <url><loc>https://graodemostarda.pt/#/faq</loc><changefreq>monthly</changefreq><priority>0.5</priority></url>
  <url><loc>https://graodemostarda.pt/#/envios</loc><changefreq>monthly</changefreq><priority>0.5</priority></url>
  <url><loc>https://graodemostarda.pt/#/trocas</loc><changefreq>monthly</changefreq><priority>0.5</priority></url>
  <url><loc>https://graodemostarda.pt/#/avaliacoes</loc><changefreq>weekly</changefreq><priority>0.5</priority></url>
  <url><loc>https://graodemostarda.pt/#/privacidade</loc><changefreq>yearly</changefreq><priority>0.3</priority></url>
  <url><loc>https://graodemostarda.pt/#/termos</loc><changefreq>yearly</changefreq><priority>0.3</priority></url>
</urlset>
```

- [ ] **Passo 3: Verificar**

```bash
grep -c "<url>" sitemap.xml
```
Esperado: 49 (1 início + 1 loja + 9 categorias + 31 produtos + 7 páginas institucionais/legais). Confirmar que o XML é válido (sem tags por fechar) lendo o ficheiro.

- [ ] **Passo 4: Commit**

```bash
git add robots.txt sitemap.xml
git commit -m "feat: adicionar robots.txt e sitemap.xml"
```

---

### Task 11: Verificação final e `ARCHITECTURE.md`

**Files:**
- Modify: `ARCHITECTURE.md`

- [ ] **Passo 1: Passagem completa no browser (desktop + 375px)**

Rotas a testar: `/`, `/loja`, `/loja?categoria=biblias`, um produto, `/carrinho` (com item), `/contacto`, `/sobre`, `/privacidade`, `/termos`. Para cada uma, confirmar:
- Sem erros na consola.
- `document.title` e meta description mudam corretamente.
- Banner de cookies aparece uma vez, some depois de decidir, não reaparece ao recarregar.
- Nenhum cartão de produto mostra estrelas/nota (sem avaliações reais ainda).
- Rodapé mostra os dois novos links legais.

- [ ] **Passo 2: Atualizar `ARCHITECTURE.md`**

Acrescentar uma secção nova (`## 7. SEO, dados estruturados e conformidade legal (ronda de Prioridade 1)`) documentando: o módulo `GDM.meta`, onde o router o chama, que `BRAND.siteUrl` é um placeholder a atualizar quando o domínio final for decidido, a limitação de `robots.txt`/`sitemap.xml` numa SPA por hash (crawlers tradicionais não distinguem fragmentos `#`; motores modernos com JS, como o Googlebot, conseguem indexar via `canonical`, mas é uma limitação conhecida da arquitetura escolhida — só migrar para History API resolveria de vez, o que exigiria configuração de servidor, hoje fora de âmbito), o novo `GDM.consent` e `GDM.reviews.summaryFor`, e as duas páginas legais novas.

- [ ] **Passo 3: Commit**

```bash
git add ARCHITECTURE.md
git commit -m "docs: atualizar ARCHITECTURE.md com a ronda de SEO/legal (Prioridade 1)"
```

---

## Self-Review Notes

- Cobertura do briefing: avaliações honestas (Task 2), meta tags por página + OG/Twitter (Tasks 3-6), canonical (Task 4/5), robots.txt/sitemap.xml (Task 10), JSON-LD Organization/Product/BreadcrumbList (Task 7), páginas legais (Task 8), banner de cookies (Task 9). Todos os itens da Prioridade 1 do briefing estão cobertos.
- `aggregateRating` no JSON-LD de produto só é incluído quando há avaliações reais (`summary.count > 0`) — nunca inventa números, conforme exigido.
- `GDM.meta.set` é chamado duas vezes em rotas dinâmicas (router com defaults genéricos, depois a página com dados específicos) — isto é intencional, não um bug: o router corre primeiro para garantir que toda rota tem sempre alguma meta tag coerente mesmo que uma página futura se esqueça de a sobrepor.
