# Contas de cliente — guia passo a passo

As contas são **opcionais**: quem não quer conta compra exatamente como hoje.
Com conta, o carrinho, os favoritos e a morada ficam guardados e aparecem em
qualquer dispositivo, o checkout vem preenchido e há a lista "As minhas
encomendas".

Enquanto `ativa: false` em `js/data/contaConfig.js` (como está agora), o site
fica igual ao de antes: sem ícone de conta, sem scripts a mais, sem pedidos.

## Como funciona (resumo)

- Usa o **mesmo projeto Supabase das avaliações** (`grao-de-mostarda`, Zurique).
- Entrada por **e-mail com código de 6 dígitos** (sem passwords) e, se
  ligados, **Google** e **Facebook**.
- Sem SDK: `js/state/conta.js` fala com a API por `fetch()`, como as
  avaliações. Quem não tem conta não descarrega nada a mais.
- A proteção está na base de dados (RLS, `tools/supabase-contas.sql`): cada
  pessoa só vê e só altera os seus dados. A chave pública sozinha não lê nada.

## O que já está feito

- O SQL já foi corrido no projeto `grao-de-mostarda` (22/11/2026) e testado:
  - uma pessoa não lê nem altera os dados de outra;
  - não dá para gravar encomendas em nome de outra pessoa;
  - a 11.ª encomenda numa hora é recusada;
  - "apagar conta" apaga tudo em cascata.
- Também foi ligado o RLS nas tabelas `privado.segredo` e
  `privado.avaliacoes_envios` (as avaliações continuam a funcionar — testado).

Se um dia for preciso voltar a correr: Supabase → SQL Editor → colar
`tools/supabase-contas.sql` → Run. Pode correr-se várias vezes.

## O que falta fazer (por esta ordem)

### 1. SMTP próprio (obrigatório)

O e-mail que vem com o Supabase **só envia para os membros da equipa do
projeto**. Para os clientes receberem o código é preciso um serviço de e-mail:

1. Criar conta num serviço de SMTP. O **Brevo** tem plano grátis com 300
   e-mails/dia; o **Resend** também serve.
2. Verificar o domínio `graodemostardaegc.com` nesse serviço (registos DNS no
   dominios.pt — quem tem a conta do domínio tem de os pôr).
3. Supabase → **Authentication → Emails → SMTP Settings** → ligar e preencher
   (servidor, porta, utilizador, password do serviço). Remetente, por exemplo:
   `nao-responder@graodemostardaegc.com`, nome "Grão de Mostarda".
4. Supabase → **Authentication → Rate Limits** → e-mails por hora: 30 chega
   para começar.

### 2. Modelos dos e-mails com o código (obrigatório)

Supabase → **Authentication → Emails → Templates**. Mudar os **dois** modelos
abaixo: o "Confirm signup" é usado na primeira entrada (conta nova) e o
"Magic Link" nas seguintes.

**Confirm signup** e **Magic Link** — assunto: `O seu código de entrada`

```html
<h2>Grão de Mostarda</h2>
<p>O seu código para entrar é:</p>
<p style="font-size:28px;font-weight:bold;letter-spacing:6px">{{ .Token }}</p>
<p>O código expira daqui a 10 minutos. Se não foi você a pedir, ignore este e-mail.</p>
```

Não pôr `{{ .ConfirmationURL }}`: o site usa o código, não o link.

Em **Authentication → Sign In / Providers → Email**:
- **Email OTP Expiration**: `600` (10 minutos);
- **Email OTP Length**: `6`;
- deixar **Confirm email** ligado.

### 3. Endereços permitidos (obrigatório para Google/Facebook)

Supabase → **Authentication → URL Configuration**:
- **Site URL**: `https://graodemostardaegc.com`
- **Redirect URLs**: `https://graodemostardaegc.com/conta.html`

### 4. Google (opcional)

1. [console.cloud.google.com](https://console.cloud.google.com) → criar um
   projeto "Grão de Mostarda".
2. **APIs e serviços → Ecrã de consentimento OAuth**:
   - tipo **Externo**;
   - nome da app "Grão de Mostarda";
   - e-mail de apoio;
   - domínio `graodemostardaegc.com`;
   - link da política: `https://graodemostardaegc.com/privacidade.html`;
   - âmbitos: só `email`, `profile` e `openid`.
   Depois, **Publicar app**.
3. **Credenciais → Criar credenciais → ID de cliente OAuth → Aplicação Web**:
   - Origens JavaScript autorizadas: `https://graodemostardaegc.com`
   - URIs de redirecionamento autorizados:
     `https://umozapqpgsflrsrhpyza.supabase.co/auth/v1/callback`
4. Copiar o **ID de cliente** e o **segredo** para o Supabase →
   **Authentication → Sign In / Providers → Google** → ligar → Save.
5. Em `contaConfig.js`: `google: true`.

### 5. Facebook (opcional)

1. [developers.facebook.com](https://developers.facebook.com) → **Criar app**
   → caso de uso "Autenticar e pedir dados aos utilizadores com o Início de
   sessão do Facebook".
2. Permissões: só **`email`** e **`public_profile`**. Mais nenhuma.
3. **Início de sessão do Facebook → Definições → URIs de redirecionamento
   OAuth válidos**: `https://umozapqpgsflrsrhpyza.supabase.co/auth/v1/callback`
4. **Definições da app → Básicas**:
   - URL da Política de Privacidade:
     `https://graodemostardaegc.com/privacidade.html`
   - URL das instruções de eliminação de dados:
     `https://graodemostardaegc.com/privacidade.html#apagar-conta`
   - domínio da app: `graodemostardaegc.com`; ícone; categoria.
5. Copiar o **ID da app** e a **Chave secreta** para o Supabase →
   **Authentication → Sign In / Providers → Facebook** → ligar → Save.
6. Passar a app para **Publicada / Live** (sem isto só os administradores da
   app conseguem entrar).
7. Em `contaConfig.js`: `facebook: true`.

### 6. Ligar no site

1. `js/data/contaConfig.js` → `ativa: true` (e os fornecedores que estiverem
   prontos).
2. `node tools/gerar-paginas.js`. Isto põe o ícone de conta no cabeçalho, os
   scripts nas páginas e a secção das contas na Política de Privacidade.
   Correr de novo tem de dar "0 ficheiro(s) alterados".
3. Commit e push.
4. Testar no site publicado com o seu e-mail: entrar, guardar a morada, fazer
   uma encomenda de teste, terminar sessão, apagar a conta.

## Dia a dia do ateliê

- **Ver contas**: Supabase → Authentication → Users.
- **Ver encomendas gravadas**: Table Editor → `encomendas`.
  Atenção: a encomenda é gravada pelo browser do cliente. Tal como a mensagem
  do WhatsApp, **não prova nada** — confirmar sempre artigos e preços com a
  loja (ARCHITECTURE.md, "Checkout").
- **Pedido para apagar uma conta** (cliente que não consegue entrar):
  - Authentication → Users → o e-mail → **Delete user**.
  - O perfil, o carrinho, os favoritos e as encomendas da conta são apagados
    juntos.
  - Responder ao cliente a confirmar (a política promete até 30 dias).

## Testar no próprio PC (sem Supabase)

1. Em `js/data/reviewsConfig.js` deixar `url: ''` (só na cópia de teste, não
   fazer commit) e em `contaConfig.js` pôr `ativa: true`, `google: true` e
   `facebook: true`. Depois correr o gerador.
2. Terminal 1: `node tools/mock-supabase.js`
3. Terminal 2: `python -m http.server 8000` e abrir
   `http://127.0.0.1:8000/conta.html`.
4. O código "enviado" por e-mail aparece **no terminal 1**.
5. Google/Facebook: o mock volta logo ao site como se tivesse entrado
   (`teste-google@exemplo.pt`). Serve para testar o PKCE e o regresso.
6. `MOCK_EXPIRA=62 node tools/mock-supabase.js` faz o token durar só 62
   segundos, para ver a renovação automática.
7. `http://127.0.0.1:54321/__admin/contas` mostra o que ficou guardado.

## Limites e proteções

| O quê | Limite | Onde |
|---|---|---|
| Pedir código | 1 por minuto por e-mail + limite do Supabase | Supabase Auth |
| Tentar código | limite de verificações do Supabase; o código expira em 10 min | Supabase Auth |
| Encomendas | 10 por hora por pessoa | `encomendas_limite` |
| Carrinho / favoritos | 60 / 100 linhas, 8 KB / 4 KB | `dados_cliente` |
| Textos do perfil | nome 100, morada 200, telefone 30… | `perfis` |
| Leituras da conta | no máx. 1 por minuto ao navegar | `js/state/conta.js` |
| Gravações | juntas num pedido (1,5 s depois da última mudança) | `js/state/conta.js` |

Se aparecerem contas falsas em massa: ligar o **CAPTCHA** em Supabase →
Authentication → Attack Protection (Cloudflare Turnstile). Isso também
obriga a mudar o site para enviar o token do CAPTCHA (ainda não está feito).
