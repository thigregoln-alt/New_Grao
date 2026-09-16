# Arquitetura — Grão de Mostarda Personalizados

Este documento explica, com honestidade, como o site foi construído, o que é
funcionalidade real (corre inteiramente no browser, sem servidor) e o que
precisaria de um backend para se tornar um site de produção com pagamentos e
gestão de encomendas reais.

## 1. Stack técnica

- **HTML + CSS + JavaScript puro.** Sem frameworks (React/Vue/etc.), sem
  bibliotecas externas, sem passo de build (webpack/vite/etc.), sem `npm
  install`. Os ficheiros `.js` são carregados diretamente via `<script src>`
  no `index.html`, por ordem de dependência, e comunicam entre si através de
  um único objeto global `window.GDM`, dividido em namespaces
  (`GDM.catalog`, `GDM.cart`, `GDM.router`, `GDM.pages`, `GDM.components`,
  etc.) — cada módulo é uma IIFE que estende esse objeto.
- **Roteamento client-side por hash** (`js/router.js`): a navegação entre
  "páginas" acontece sem recarregar o documento, interpretando
  `location.hash` (`#/loja`, `#/produto/:slug`, `#/loja?categoria=...`).
  Escolhido em vez da History API porque funciona em GitHub Pages e mesmo
  em `file://` sem qualquer configuração de servidor ou reescrita de URLs.
- **Sem passo de build**: pode publicar a pasta tal como está no GitHub
  Pages, ou abrir `index.html` num servidor estático simples
  (`python -m http.server`, por exemplo) para testar localmente.

## 2. Estrutura de ficheiros

```
index.html              Shell da aplicação (cabeçalho/rodapé montados por JS + <main id="app">)
css/
  tokens.css             Variáveis de design (cor, tipografia, espaçamento)
  base.css                Reset e tipografia base
  layout.css              Cabeçalho, rodapé, contentores, grelhas utilitárias
  components.css          Botões, cartões, formulários, drawer, toasts, acordeão…
  animations.css          Scroll-reveal, microinterações, prefers-reduced-motion
  pages.css               Composições específicas de cada página
js/
  utils/                  security.js, storage.js, format.js, bus.js, formHelpers.js
  data/                   icons.js, motifs.js, categoryArt.js, brandLogo.js,
                          products.js (catálogo), content.js (textos institucionais)
  state/                  cart.js, favorites.js, reviews.js, newsletter.js
  components/             header.js, footer.js, cartDrawer.js, toast.js, productCard.js, ui.js
  pages/                  Um ficheiro por página (home, shop, product, cart, checkout, …)
  router.js
  main.js                 Arranque: monta layout, regista rotas, resolve a rota inicial
assets/
  favicon.svg
```

## 3. O que é real (funciona de verdade, sem backend)

- **Catálogo de produtos** (`js/data/products.js`): 9 categorias, ~30
  produtos com preço, descrição, stock e avaliações — tudo como dados
  estáticos no próprio código, `Object.freeze`d recursivamente
  (`deepFreeze`) para não poderem ser alterados a partir da consola do
  browser. **Não existem campos de personalização no site** (ver secção 1
  do briefing atualizado): a loja vende os produtos tal como apresentados;
  qualquer nome, versículo ou detalhe específico combinado com um cliente
  é tratado fora do site, por WhatsApp.
- **Carrinho de compras** (`localStorage`, chave `gdm:cart`): persiste entre
  visitas, soma quantidades por produto, respeita o stock definido no
  catálogo. **O preço usado em qualquer soma vem sempre de
  `GDM.catalog`, nunca do que estiver guardado no `localStorage`** — se
  alguém editar a consola para mudar o preço ou a quantidade guardada, o
  total apresentado continua a ser recalculado a partir do catálogo atual.
- **Favoritos**: lista de IDs em `localStorage`, filtrada contra o catálogo
  atual (um ID que já não exista é ignorado).
- **Avaliações**: `GDM.content.REVIEWS` e `GDM.content.TESTIMONIALS`
  (`js/data/content.js`) começam **vazios de propósito** — o site ainda não
  está publicado e não devem existir avaliações/testemunhos de demonstração
  apresentados como reais. A página `/avaliacoes` e a secção de testemunhos
  da Início mostram um estado vazio honesto enquanto estes arrays estiverem
  vazios; um comentário em `content.js`, junto de cada array, explica o
  formato para o ateliê acrescentar avaliações reais mais tarde. Avaliações
  novas escritas pelo visitante ficam guardadas em `localStorage` neste
  dispositivo e aparecem combinadas com as da semente. Não são partilhadas
  entre visitantes/dispositivos (não há servidor a agregá-las).
- **Newsletter**: valida o formato do e-mail e guarda localmente que este
  dispositivo já subscreveu — não existe envio real de e-mails de boas-vindas
  nem lista de contactos centralizada (ver secção 4).
- **Checkout**: formulário totalmente validado (nome, e-mail, telefone,
  morada, código postal); gera um resumo da encomenda e abre um link
  `wa.me` (WhatsApp) ou `mailto:` pré-preenchido com todos os dados, para o
  cliente enviar manualmente ao ateliê. **Não existe cobrança automática** —
  o texto do resumo diz sempre explicitamente que o pagamento é confirmado
  à parte.
- **Pesquisa e filtros da loja**: filtragem e ordenação client-side sobre o
  array de produtos, refletida na própria URL (`#/loja?categoria=...`).
- **Segurança de entrada**: todo o texto escrito pelo utilizador (pesquisa,
  formulários, avaliações, parâmetros de rota) passa por
  `GDM.security.sanitizeInput` / `sanitizeSlug` e é sempre inserido no DOM
  via `textContent` (nunca `innerHTML` com valor do utilizador) — ver
  `js/utils/security.js`.

## 4. O que é maquete / precisa de backend para produção

Isto **não é uma loja com pagamento ou gestão de encomendas real**. Para lá
chegar, seria necessário construir (fora do âmbito deste projeto estático):

- **Pagamento automático real** (Stripe, SIBS/MBWay API, etc.). Hoje o
  "checkout" só prepara uma mensagem para WhatsApp/e-mail; a confirmação do
  pagamento é 100% manual, tal como pedido no briefing.
- **Base de dados de encomendas.** Não existe nenhum registo persistente e
  partilhado das encomendas — cada visitante só vê o que está no seu
  próprio `localStorage`. Duas pessoas em computadores diferentes não veem
  as encomendas uma da outra.
- **Página `/admin`**: é uma **maquete visual**, sem autenticação, sem
  sessão, sem dados reais de encomendas — os números e a tabela de
  "encomendas recentes" aí mostrados são valores de exemplo fixos, marcados
  como tal no ecrã. A única secção com dados reais nessa página é a que lê
  o `localStorage` do próprio dispositivo (carrinho, favoritos, avaliações
  escritas, newsletter).
- **Envio automático de e-mails** (confirmação de encomenda, boas-vindas da
  newsletter, notificações de estado). Hoje qualquer e-mail é aberto no
  cliente de e-mail do próprio utilizador via `mailto:`, nunca enviado pelo
  site.
- **Gestão de stock em tempo real partilhada.** O stock no catálogo é um
  número fixo no código; cada visitante vê o mesmo valor, mas comprar não o
  decrementa para os outros visitantes (não há servidor a coordenar isso).
- **Avaliações partilhadas entre visitantes.** Como não há backend, uma
  avaliação escrita por uma pessoa só é visível no browser dela — não
  aparece para outros visitantes do site.
- **Fotografia real de produto.** Todas as imagens de produto são
  composições SVG geradas (`js/data/categoryArt.js`), com direção de arte
  cuidada (gradiente por categoria, ícone ilustrado, motivo botânico de
  canto, etiqueta com o nome da categoria) — não fotografias reais. É o
  ponto de maior impacto visual para uma substituição futura: bastaria
  trocar a chamada a `GDM.categoryArt.productArt(product)` por um elemento
  `<img>` apontando para o ficheiro de fotografia real de cada produto.
- **Logótipo**: `js/data/brandLogo.js` contém uma **recriação em SVG**
  fiel à descrição do logótipo oficial confirmada em 2026-09-01 (placa de
  couro de contorno irregular com bordas costuradas, letras douradas
  metálicas, gota dourada no canto superior esquerdo, faixa "Personalizados
  Cristãos", versículos de referência e um anel/argola dourado metálico
  decorativo), porque o ficheiro `assets/logo.webp` mencionado no briefing
  nunca foi fornecido ao repositório (apenas descrito em texto). Assim que o
  ficheiro oficial (idealmente com fundo transparente) estiver disponível,
  basta colocá-lo em `assets/logo.webp` e substituir as chamadas a
  `GDM.brand.logoSvg()` (no cabeçalho, rodapé, página de contacto e menu
  mobile) por
  `<img src="assets/logo.webp" alt="Grão de Mostarda Personalizados Cristãos">`.

## 5. Modelo de dados do carrinho (nota de segurança)

Cada linha do carrinho guardada em `localStorage` tem apenas
`{ productId, qty, personalization }` — **nunca preço, nunca nome do
produto, nunca stock**. Ao ler o carrinho (`GDM.cart.getState()`):

1. Cada `productId` é procurado no catálogo atual (`GDM.catalog.getById`).
   Se já não existir, a linha é descartada silenciosamente.
2. A quantidade é sempre recortada (`Math.min`) ao stock atual do produto e
   a um máximo de 20 unidades por linha — mesmo que o valor guardado seja
   maior.
3. O total de cada linha (`lineTotal`) é sempre `product.price * qty`, lido
   do catálogo `Object.freeze`d, nunca de um valor gravado anteriormente.

Isto significa que editar manualmente `localStorage` (ou tentar alterar
`GDM.catalog` a partir da consola, o que falha por estar congelado) não
consegue alterar o total apresentado ao utilizador nem o valor comunicado
ao ateliê no resumo da encomenda.

## 6a. SEO, dados estruturados e conformidade legal (ronda de Prioridade 1, 2026-09-03)

- **Avaliações honestas em todo o site.** `GDM.reviews.summaryFor(productId)`
  (`js/state/reviews.js`) calcula a nota média e a contagem reais a partir de
  `GDM.content.REVIEWS` (semente) + avaliações escritas neste dispositivo —
  nunca de números inventados. Os campos fictícios `rating`/`reviews` foram
  **removidos** de `js/data/products.js`. `GDM.components.ratingBlock`
  (`js/components/ui.js`) devolve `null` quando não há avaliações reais, e o
  cartão de produto, a ficha de produto e "também vai gostar" usam sempre
  `summaryFor` — nunca mostram um selo de nota até existir pelo menos 1
  avaliação real. A ordenação "Melhor avaliação" na loja segue a mesma regra.
- **Meta tags dinâmicas por rota** (`js/utils/meta.js`, `GDM.meta`): title,
  description, `<link rel="canonical">`, Open Graph e Twitter Card
  atualizados a cada navegação. O router (`js/router.js`) chama
  `GDM.meta.set(...)` com os valores por omissão da rota (definidos em
  `js/main.js`) **antes** de renderizar a página; páginas com conteúdo
  dinâmico (ficha de produto, loja filtrada por categoria) chamam
  `GDM.meta.set(...)` de novo no fim do próprio `render()` com dados mais
  específicos (nome+categoria+preço do produto, categoria da loja).
  `BRAND.siteUrl` (`js/data/content.js`) é hoje um **placeholder**
  (`https://graodemostarda.pt`) — atualizar para o domínio final assim que
  estiver decidido; é a única constante a mudar (usada por `canonical`,
  `og:url`, `og:image`, JSON-LD e por `robots.txt`/`sitemap.xml`, que têm de
  ser editados manualmente por serem ficheiros estáticos).
- **Imagem de partilha** (`assets/og-image.png`, 1200×630): gerada uma única
  vez a partir de um template HTML com o logótipo real e a paleta da marca,
  via screenshot Playwright — não existe pipeline de geração automática.
  Serve de `og:image`/`twitter:image` por omissão em todas as páginas até
  existir fotografia real de produto (ver secção 4).
- **Dados estruturados JSON-LD**: `GDM.meta.setJsonLd(id, obj)` injeta um
  `<script type="application/ld+json">`; `GDM.meta.clearJsonLd()` é chamado
  pelo router a cada mudança de rota, para nunca sobrar JSON-LD da página
  anterior. Início publica `Organization`; a ficha de produto publica
  `Product` (com `aggregateRating` **só** quando há avaliações reais) e
  `BreadcrumbList`; a loja publica `BreadcrumbList`.
- **`robots.txt`/`sitemap.xml`** (raiz do repo, estáticos, sem geração
  automática): o `sitemap.xml` lista as rotas institucionais, as 9
  categorias (`?categoria=`) e os 31 produtos, todos como URLs com `#`
  (`https://.../#/produto/slug`). **Limitação conhecida**: como o site é uma
  SPA por hash (decisão arquitetural documentada na secção 1, para funcionar
  em GitHub Pages/`file://` sem servidor), crawlers tradicionais não
  distinguem fragmentos `#` como páginas separadas — só motores modernos que
  executam JavaScript (como o Googlebot atual) conseguem de facto indexar
  cada rota individualmente, apoiados pela tag `canonical` por rota. Resolver
  isto de vez exigiria migrar para History API + configuração de servidor,
  fora do âmbito deste projeto estático.
- **Páginas legais** (`js/pages/legal.js`, rotas `/privacidade` e `/termos`,
  texto em `GDM.content.PRIVACY_POLICY`/`TERMS`): exigidas por lei (RGPD/UE)
  por já existir recolha de dados via formulário de contacto, checkout e
  newsletter — mesmo sem checkout de pagamento automático. Linkadas no
  rodapé.
- **Banner de consentimento de cookies** (`js/components/cookieConsent.js`,
  `GDM.consent`): guarda a escolha (aceitar/recusar não-essenciais) em
  `localStorage` (`gdm:cookie_consent`) e não volta a aparecer depois de
  respondido. `GDM.consent.isAllowed('analytics')` está pronto a ser
  verificado por qualquer script de terceiros futuro (Google Analytics 4,
  Plausible, pixel do Meta/Instagram — ver `MIGRACAO-UMBRACO.md`) antes de o
  injetar no DOM; hoje o site não carrega nenhum script de terceiros, por
  isso esta função ainda não é chamada em lado nenhum além do próprio banner.

## 6b. Acessibilidade e movimento

- Todas as animações de scroll-reveal e microinterações respeitam
  `prefers-reduced-motion: reduce` (ver `css/animations.css` e
  `--dur-*` em `css/tokens.css`, reduzidos a `1ms` nesse caso).
- Drawers (carrinho, menu mobile) prendem o foco (`GDM.components.trapFocus`)
  e devolvem-no ao elemento que os abriu ao fechar; fecham com `Esc`.
- Todo o catálogo de ícones é SVG com `aria-hidden` quando decorativo, e os
  botões de ícone têm sempre `aria-label`.
