# Arquitetura — Grão de Mostarda Personalizados

Este documento explica, com honestidade, como o site foi construído, o que é
funcionalidade real (corre inteiramente no browser, sem servidor) e o que
precisaria de um backend para se tornar um site de produção com pagamentos e
gestão de encomendas reais.

## 1. Stack técnica

- **HTML + CSS + JavaScript puro.** Sem frameworks (React/Vue/etc.), sem
  bibliotecas externas, sem passo de build (webpack/vite/etc.), sem `npm
  install` no site em si (o único script Node do repositório,
  `tools/gerar-paginas.js`, é uma ferramenta de desenvolvimento — ver
  secção 2b — que também não usa dependências, só `fs`/`path`/`vm`/`crypto`, módulos do próprio Node).
- **47 páginas `.html` estáticas e pré-renderizadas.** Cada página já traz
  o conteúdo principal no próprio HTML (não há um `<main id="app">` vazio
  à espera de ser preenchido por JavaScript). O cabeçalho, o menu mobile e
  o rodapé também vêm escritos no HTML (`#header-host`/`#footer-host`,
  gerados por `tools/gerar-paginas.js`); `header.js`/`footer.js` só os
  **hidratam** (ligam eventos, badges, newsletter). Com JavaScript
  desativado, a navegação e todos os links funcionam — o botão do menu
  mobile é um link para `#mobile-nav`, que o CSS abre com `:target`. O que
  continua a precisar de JavaScript: carrinho/drawer, pesquisa, favoritos,
  checkout, formulários de contacto e avaliações, e os filtros da loja.
- **Sem router client-side.** Não existe navegação por hash nem History
  API: cada link aponta diretamente para o ficheiro `.html` de destino
  (`loja.html`, `produto-<slug>.html`, `loja.html?categoria=...`, etc.) e o
  browser faz um pedido HTTP normal a cada navegação — exatamente como
  qualquer site estático multi-página. Isto simplifica a indexação por
  motores de busca (cada página tem o seu próprio URL real, não um
  fragmento `#`) e funciona em GitHub Pages sem qualquer configuração.
- **`js/static-init.js`** faz o papel que antes era do router: monta
  cabeçalho/rodapé/drawer do carrinho/menu mobile/banner de cookies em
  todas as páginas, e expõe `GDM.router.navigate(path)` só como
  compatibilidade para código que ainda a chame (ex.: a pesquisa do
  cabeçalho) — a implementação atual limita-se a traduzir o `path` no
  nome do ficheiro `.html` correspondente e a fazer
  `window.location.href = ficheiro`, uma navegação real de página, não um
  "salto" de rota client-side.
- **Sem passo de build**: pode publicar a pasta tal como está no GitHub
  Pages, ou servir localmente com `python -m http.server` (não abrir por
  `file://`, porque os `fetch`/módulos e os caminhos relativos de alguns
  scripts pressupõem um servidor HTTP).

## 2. Estrutura de ficheiros

```
47 páginas HTML estáticas e pré-renderizadas na raiz do repo:
  index.html, loja.html, carrinho.html, checkout.html, favoritos.html,
  sobre.html, inspiracao.html, projetos.html, faq.html, envios.html,
  trocas.html, contacto.html, avaliacoes.html, privacidade.html, termos.html,
  admin.html, e 31 produto-<slug>.html (uma por produto do catálogo)
css/
  tokens.css             Variáveis de design (cor, tipografia, espaçamento)
  base.css                Reset e tipografia base
  layout.css              Cabeçalho, rodapé, contentores, grelhas utilitárias
  components.css          Botões, cartões, formulários, drawer, toasts, acordeão…
  animations.css          Scroll-reveal, microinterações, prefers-reduced-motion
  pages.css               Composições específicas de cada página
  overrides.css           Ver secção 2c — histórico de ajustes/patches, carregado
                          por último em todas as páginas
js/
  static-init.js          Monta cabeçalho/rodapé/drawers em todas as páginas;
                          substitui o antigo router (ver secção 1)
  utils/                  security.js, storage.js, format.js, bus.js, formHelpers.js
  data/                   icons.js, motifs.js, categoryArt.js, brandLogo.js,
                          products.js (catálogo), content.js (textos institucionais)
  state/                  cart.js, favorites.js, reviews.js, newsletter.js
  components/             header.js, footer.js, cartDrawer.js, toast.js, productCard.js, ui.js
  pages/                  Só as 5 páginas com interatividade própria (ver
                          secção 2a): cart.js, checkout.js, contact.js,
                          favorites.js, reviews.js
tools/
  gerar-paginas.js        Ver secção 2b
assets/
  favicon.svg
  fonts/                  DM Sans e Manrope (woff2, latin + latin-ext) — ver README.md lá dentro
  art/                    Ilustrações de produto (<slug>.svg, <slug>-b/-c.svg das
                          miniaturas) — escritas por tools/gerar-paginas.js, não editar à mão
  logo-grao-de-mostarda.png         Original (fallback do <picture>)
  logo-grao-de-mostarda-<96|192|384|666>.<avif|webp>
                          Versões leves do logótipo, geradas a partir do PNG
                          (sharp, fora do repositório); se o PNG mudar, gerar de novo
  og-image.png            Pré-visualização de partilha (PNG de paleta, ~30 KB)
```

## 2a. Que JavaScript cada página carrega

Todas as 47 páginas carregam `js/utils/*`, `js/data/*`, `js/state/*`,
`js/components/*` e `js/static-init.js` (cabeçalho, rodapé, drawer do
carrinho, menu mobile, banner de cookies, favoritos, toasts). Só 5 páginas
carregam também um ficheiro próprio de `js/pages/`, porque só essas têm
lógica que não dá para pré-renderizar (o conteúdo depende do que está em
`localStorage` ou de um formulário):

| Página          | Script próprio          |
|------------------|--------------------------|
| `carrinho.html`  | `js/pages/cart.js`       |
| `checkout.html`  | `js/pages/checkout.js`   |
| `contacto.html`  | `js/pages/contact.js`    |
| `favoritos.html` | `js/pages/favorites.js`  |
| `avaliacoes.html`| `js/pages/reviews.js`    |

Nenhuma outra página carrega ficheiros de `js/pages/` — os antigos
`main.js`, `router.js` e os `js/pages/home.js`, `shop.js`, `product.js`,
`about.js`, `admin.js`, `infoPages.js`, `inspiration.js`, `legal.js`,
`notFound.js`, `projects.js` foram removidos do repositório por não serem
carregados por nenhum `.html` (confirmado por grep a todos os
`<script src>` antes da remoção); o conteúdo que geravam já está
pré-renderizado nas próprias páginas.

## 2b. `tools/gerar-paginas.js` — manter as páginas em sincronia com o catálogo

Como o conteúdo dos produtos está pré-renderizado, mudar um preço ou texto
em `js/data/products.js` não muda sozinho o HTML. O script
`tools/gerar-paginas.js` (Node puro — `fs`, `path`, `vm`; corre com
`node tools/gerar-paginas.js`, sem instalar nada) lê `products.js` e
`content.js` e reescreve só as partes dependentes de produto:

- as 31 páginas `produto-<slug>.html` (nome, preço, preço antigo,
  descrição, texto longo, stock, tags, categoria, breadcrumb, meta
  tags/OG/Twitter, JSON-LD, "também vai gostar");
- a grelha de produtos da `loja.html`;
- a secção "Peças mais procuradas" da `index.html`;
- o `sitemap.xml`.

Usa o HTML já existente de cada página como molde e faz *patch* cirúrgico
(em vez de reconstruir a página do zero), pelo que correr o script sem
alterar `products.js`/`content.js` não produz nenhuma diferença
(`git diff` vazio). Se um produto novo aparecer em `products.js`, o
script cria a `produto-<slug>.html` correspondente a partir de outra
página como molde; se um produto desaparecer do catálogo, a página antiga
**não é apagada automaticamente** — o script só avisa na consola, para o
ateliê decidir o que fazer com ela (redirecionar, manter, remover à mão).
Deve correr-se sempre que `products.js` ou `content.js` mudarem.

## 2c. CSS

O CSS foi reduzido de 16 para 7 ficheiros. `tokens.css`, `base.css`,
`layout.css`, `components.css`, `animations.css` e `pages.css` nunca
tiveram conflitos entre si e mantêm-se como estavam. Os 10 ficheiros de
ajustes que foram sendo acrescentados ao longo do projeto (`redesign.css`,
`polish-v2.css` a `polish-v6-request.css`, `cart-final-fix.css`,
`final-fixes.css`, `cart-backdrop-final.css` e `categories-redesign.css` —
este último, antes, só carregado na `index.html`) foram concatenados,
verbatim e pela mesma ordem exata em que eram carregados, num único
`css/overrides.css`, carregado por último em todas as páginas depois de
`pages.css`. Preserva-se assim, byte a byte, o resultado da cascata
original (incluindo os `!important` que já lá existiam — não foram
removidos, porque tentar decidir manualmente "qual é a regra final
efetiva" propriedade a propriedade revelou-se um exercício arriscado
sempre que duas classes diferentes, aplicadas ao mesmo elemento, competiam
pela mesma propriedade em ficheiros diferentes). Fundir `overrides.css`
para dentro dos 6 ficheiros de base, selector a selector, com toda a
segurança, fica como trabalho futuro.

## 3. O que é real (funciona de verdade, sem backend)

- **Catálogo de produtos** (`js/data/products.js`): 9 categorias, 31
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
- **Avaliações**: guardadas no **Supabase** (base de dados partilhada,
  região UE) — qualquer visitante deixa uma avaliação, ela fica
  **pendente** até o ateliê a aprovar no painel do Supabase, e a partir daí
  aparece para todos (página de avaliações, ficha de produto, estrelas nos
  cartões, testemunhos da Início). A segurança está na própria base de dados
  (Row Level Security + permissões por coluna, `tools/supabase-avaliacoes.sql`):
  a chave pública do site só lê avaliações aprovadas e só cria pendentes.
  Pedidos com `fetch()` direto à API REST, sem SDK (`js/state/reviews.js`);
  vistas e formulário em `js/pages/reviews.js`. Com `js/data/reviewsConfig.js`
  por preencher, o site mostra "As avaliações estão a chegar em breve".
  Nunca há avaliações inventadas. Guia completo: `docs/AVALIACOES.md`.
  `GDM.content.TESTIMONIALS` continua vazio de propósito.
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
  array de produtos, refletida na própria URL (`loja.html?categoria=...`).
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
- **Página `/admin`**: é uma **maquete visual** pré-renderizada (sem
  `js/pages/admin.js` — removido por não ser carregado por nenhuma
  página, secção 2a), sem autenticação, sem sessão, sem dados reais de
  encomendas — os números e a tabela de "encomendas recentes" aí
  mostrados são valores de exemplo fixos, marcados como tal no ecrã.
- **Envio automático de e-mails** (confirmação de encomenda, boas-vindas da
  newsletter, notificações de estado). Hoje qualquer e-mail é aberto no
  cliente de e-mail do próprio utilizador via `mailto:`, nunca enviado pelo
  site.
- **Gestão de stock em tempo real partilhada.** O stock no catálogo é um
  número fixo no código; cada visitante vê o mesmo valor, mas comprar não o
  decrementa para os outros visitantes (não há servidor a coordenar isso).
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

- **Avaliações honestas em todo o site.** Médias e contagens vêm só de
  avaliações reais aprovadas (vista `resumo_avaliacoes` no Supabase); sem
  avaliações, nenhum selo de nota aparece. `aggregateRating`/`review` no
  JSON-LD só são escritos por `node tools/gerar-paginas.js --com-avaliacoes`,
  a partir das avaliações aprovadas (ver `docs/AVALIACOES.md`).
- **Meta tags por página, já pré-renderizadas**: title, description,
  `<link rel="canonical">`, Open Graph, Twitter Card e JSON-LD
  (`Product`+`BreadcrumbList` na ficha de produto, `Organization` na
  início, `BreadcrumbList` na loja) já vêm escritos no `<head>` de cada
  página estática — não há nenhum passo de JavaScript a preenchê-los em
  tempo de execução. `tools/gerar-paginas.js` (secção 2b) é quem os
  mantém corretos sempre que o catálogo muda. `js/utils/meta.js`
  (`GDM.meta.set`/`setJsonLd`/`clearJsonLd`) continua a ser carregado por
  todas as páginas mas **já não é chamado por nenhum script** desde que
  `main.js`/`router.js` (que eram quem o chamava, numa versão anterior
  do site que usava router client-side) foram removidos — fica como
  código morto, não removido por estar fora do critério usado para
  limpar `js/` (remover só o que **nenhuma** página carrega), mas é um
  candidato óbvio para uma limpeza futura.
  `BRAND.siteUrl` (`js/data/content.js`) é hoje um **placeholder**
  (`https://graodemostarda.pt`) — atualizar para o domínio final assim que
  estiver decidido, e depois correr `node tools/gerar-paginas.js` para
  propagar o novo domínio ao `canonical`, `og:url`, `og:image`, JSON-LD e
  `sitemap.xml` de todas as páginas (`robots.txt` continua manual, ver
  abaixo).
- **Imagem de partilha** (`assets/og-image.png`, 1200×630): gerada uma única
  vez a partir de um template HTML com o logótipo real e a paleta da marca,
  via screenshot Playwright — não existe pipeline de geração automática.
  Serve de `og:image`/`twitter:image` por omissão em todas as páginas até
  existir fotografia real de produto (ver secção 4).
- **Dados estruturados JSON-LD**: já vêm escritos, por página, no próprio
  HTML (`<script type="application/ld+json">` no `<head>`) — sem nenhum
  passo de JavaScript a injetá-los ou a limpá-los em runtime. A início
  publica `Organization`; cada ficha de produto publica `Product` (com
  `aggregateRating` **só** quando há avaliações reais) e `BreadcrumbList`;
  a loja publica `BreadcrumbList`. `tools/gerar-paginas.js` mantém estes
  blocos corretos sempre que o catálogo muda.
- **`sitemap.xml`** (raiz do repo): já usa URLs reais por página
  (`https://.../produto-<slug>.html`, `https://.../loja.html?categoria=...`,
  etc.), não fragmentos `#` — consistente com o site já não ser uma SPA
  (secção 1). É **gerado automaticamente** por `tools/gerar-paginas.js`
  (secção 2b) a partir de `products.js`/`content.js`, listando as rotas
  institucionais, as 9 categorias e os 31 produtos. `robots.txt` continua
  estático e editado à mão (não depende do catálogo).
- **Páginas legais** (`privacidade.html`, `termos.html`): já pré-renderizadas
  como as restantes; o texto-fonte continua em
  `GDM.content.PRIVACY_POLICY`/`TERMS` (`js/data/content.js`) mas não há
  nenhum `js/pages/legal.js` a lê-lo em runtime — esse ficheiro foi
  removido por não ser carregado por nenhuma página (secção 2a). Exigidas
  por lei (RGPD/UE) por já existir recolha de dados via formulário de
  contacto, checkout e newsletter — mesmo sem checkout de pagamento
  automático. Linkadas no rodapé.
- **Banner de consentimento de cookies** (`js/components/cookieConsent.js`,
  `GDM.consent`): guarda a escolha (aceitar/recusar não-essenciais) em
  `localStorage` (`gdm:cookie_consent`) e não volta a aparecer depois de
  respondido. `GDM.consent.isAllowed('analytics')` está pronto a ser
  verificado por qualquer script de terceiros futuro (Google Analytics 4,
  Plausible, pixel do Meta/Instagram) antes de o injetar no DOM; hoje o
  site não carrega nenhum script de terceiros, por
  isso esta função ainda não é chamada em lado nenhum além do próprio banner.
- **Hoje o site não usa nada que exija consentimento.** Com as fontes
  alojadas no próprio site (`assets/fonts/`, antes vinham do Google
  Fonts), a fotografia do rodapé também local (antes vinha do Unsplash) e
  sem analytics nem pixels, nenhum pedido sai para terceiros ao abrir uma
  página — a Content-Security-Policy (`default-src 'self'`) garante-o. O
  `localStorage` usado (carrinho, favoritos, newsletter, escolha de
  cookies) é estritamente necessário ao que o visitante pede. O banner e o
  `GDM.consent` ficam como estão, prontos para o dia em que se acrescente
  algo não essencial. Exceção futura: o pedido à API do Supabase para ler
  avaliações (secção de avaliações, `docs/AVALIACOES.md`) é funcional — o
  conteúdo que o visitante abriu — e não grava nada no browser.

## 6b. Acessibilidade e movimento

- Todas as animações de scroll-reveal e microinterações respeitam
  `prefers-reduced-motion: reduce` (ver `css/animations.css` e
  `--dur-*` em `css/tokens.css`, reduzidos a `1ms` nesse caso).
- Drawers (carrinho, menu mobile) prendem o foco (`GDM.components.trapFocus`)
  e devolvem-no ao elemento que os abriu ao fechar; fecham com `Esc`.
- Todo o catálogo de ícones é SVG com `aria-hidden` quando decorativo, e os
  botões de ícone têm sempre `aria-label`.
