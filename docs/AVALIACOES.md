# Avaliações — guia passo a passo

Este guia explica como pôr as avaliações do site a funcionar e como as
moderar no dia a dia. Não é preciso saber programar nem conhecer o
Supabase.

**Como funciona, em resumo:** quando um cliente deixa uma avaliação no
site, ela fica guardada numa base de dados no **Supabase** (um serviço
gratuito, com os dados alojados na União Europeia) com o estado
**pendente**. Ninguém a vê até o ateliê a **aprovar** no painel do
Supabase. A partir daí aparece para todos os visitantes: na página de
Avaliações, na ficha do produto, nas estrelas dos cartões da loja e na
página inicial.

Enquanto os passos 1 a 4 não estiverem feitos, o site funciona
normalmente e mostra "As avaliações estão a chegar em breve" (o formulário
fica desativado).

---

## 1. Criar a conta e o projeto (gratuito)

1. Abrir <https://supabase.com> e clicar em **Start your project**. Criar
   conta (pode ser com a conta do GitHub ou com e-mail).
2. Clicar em **New project**.
3. Preencher:
   - **Name:** `grao-de-mostarda` (ou outro nome à escolha);
   - **Database Password:** clicar em *Generate a password* e guardar a
     palavra-passe num sítio seguro (não vai ser precisa no site, mas é a
     chave-mestra da base de dados);
   - **Region:** escolher **Central EU (Frankfurt)** — importante para o
     RGPD (os dados ficam na União Europeia);
   - **Plan:** Free.
4. Clicar em **Create new project** e esperar 1–2 minutos.

## 2. Criar a tabela das avaliações

1. No menu da esquerda, abrir **SQL Editor**.
2. Clicar em **New query**.
3. Abrir o ficheiro `tools/supabase-avaliacoes.sql` deste repositório,
   copiar **todo** o conteúdo e colar no editor.
4. Clicar em **Run** (canto inferior direito). Deve aparecer
   *"Success. No rows returned"*.

O script cria a tabela `avaliacoes`, as regras de segurança e a vista
`resumo_avaliacoes`. Pode ser corrido mais do que uma vez sem estragar
nada.

> O Supabase pode mostrar no **Security Advisor** um aviso
> "Security Definer View" sobre `resumo_avaliacoes`. É intencional: a vista
> só mostra contagens e médias das avaliações já aprovadas.

## 3. Copiar o endereço do projeto e a chave pública

1. No menu da esquerda, abrir **Project Settings** (roda dentada) →
   **API Keys** (em alguns painéis aparece como **Data API**).
2. Copiar:
   - o **Project URL** — tem o formato `https://xxxxxxxx.supabase.co`;
   - a **Publishable key** — começa por `sb_publishable_…`. (Em projetos
     mais antigos pode aparecer só a chave **anon public**, um texto longo
     que começa por `eyJ…`; também serve.)

**Nunca** copiar para o site a **secret key** (`sb_secret_…`) nem a antiga
**service_role**. Essas chaves passam por cima de todas as regras de
segurança: com elas qualquer pessoa conseguiria aprovar, alterar ou apagar
avaliações e ver os números de encomenda. A chave *publishable / anon* é
pública por natureza — pode estar no código do site sem risco, porque as
regras do passo 2 só a deixam ler avaliações aprovadas e criar avaliações
pendentes.

## 4. Ligar o site ao Supabase

1. Abrir `js/data/reviewsConfig.js` e preencher:

   ```js
   GDM.reviewsConfig = {
     url: 'https://xxxxxxxx.supabase.co',
     anonKey: 'sb_publishable_xxxxxxxxxxxxxxxx',
     porPagina: 8,
   };
   ```

2. Correr o gerador (atualiza a proteção *Content-Security-Policy* de
   todas as páginas para autorizar o site a falar com o Supabase):

   ```
   node tools/gerar-paginas.js
   ```

3. Fazer commit e push. Depois de o GitHub Pages publicar (1–2 minutos),
   o formulário fica ativo.

Para testar: deixar uma avaliação no site e confirmar que aparece no
Supabase em **Table Editor → avaliacoes** com `estado = pendente`.

## 5. Moderar: aprovar, rejeitar, compra verificada, responder

Tudo se faz no **Table Editor** do Supabase (menu da esquerda →
**Table Editor** → tabela **avaliacoes**). Cada linha é uma avaliação.

- **Ver as novas:** clicar em **Filter** → `estado` `equals` `pendente`.
- **Aprovar:** fazer duplo clique na célula `estado` da avaliação,
  escolher/escrever `aprovada` e carregar em **Save** (ou Enter). A data
  `aprovada_em` é preenchida sozinha. Aparece no site no máximo 5 minutos
  depois (o site guarda as leituras durante 5 minutos).
- **Rejeitar:** mudar `estado` para `rejeitada`. Nunca aparece no site.
- **Compra verificada:** quando a avaliação tiver `referencia_encomenda`
  (ex.: `GM-K3F9QZ`), confirmar esse número nas encomendas recebidas por
  WhatsApp/e-mail. Se bater certo com o nome/produto, mudar
  `compra_verificada` para `true`. Aparece o selo **Compra verificada**.
  O número de encomenda nunca é mostrado no site.
- **Responder:** escrever na célula `resposta_atelier` (até 600
  caracteres). Aparece por baixo da avaliação, com o rótulo
  "Resposta do ateliê".

Se quiser que as estrelas e as avaliações contem também para o Google
(aparecem nos resultados de pesquisa), depois de aprovar avaliações novas
correr:

```
node tools/gerar-paginas.js --com-avaliacoes
```

e fazer commit e push. Isto escreve as avaliações aprovadas diretamente no
HTML de cada ficha de produto. Sem este passo as avaliações aparecem na
mesma para os visitantes — só não entram nos dados que o Google lê.

## 6. Apagar uma avaliação a pedido do cliente

1. **Table Editor → avaliacoes**, encontrar a linha (usar **Filter** por
   `autor` ou `produto_id`).
2. Marcar a caixa à esquerda da linha → **Delete 1 row** → confirmar.
3. Se a avaliação estava nas fichas estáticas (passo 5,
   `--com-avaliacoes`), correr de novo
   `node tools/gerar-paginas.js --com-avaliacoes` e fazer push.

**Rejeitadas com mais de 30 dias** (prometido na Política de
Privacidade): uma vez por mês, filtrar `estado` `equals` `rejeitada` e
apagar as que tiverem `criada_em` com mais de 30 dias. Para isto ser
automático, no fim de `tools/supabase-avaliacoes.sql` há um bloco opcional
com o **pg_cron** (Database → Extensions → ativar `pg_cron`, depois
descomentar esse bloco e correr o script de novo).

## 7. Limites do plano gratuito

Condições consultadas em outubro de 2026 em <https://supabase.com/pricing>
e <https://supabase.com/docs/guides/platform/free-project-pausing>:

- base de dados até **500 MB** — chega para centenas de milhares de
  avaliações;
- **5 GB** de tráfego por mês; pedidos à API ilimitados;
- no máximo **2 projetos gratuitos ativos** por conta;
- **o projeto é pausado se tiver pouca atividade durante 7 dias.**
  Enquanto está pausado, o site mostra "Não foi possível carregar as
  avaliações" (o resto do site continua a funcionar).

**Como reativar:** entrar em <https://supabase.com/dashboard>, abrir o
projeto e clicar em **Restore project** (demora cerca de um minuto). Há
**90 dias** para o fazer; depois disso o projeto deixa de poder ser
restaurado pelo painel.

**Como evitar a pausa:** com visitas reais diárias ao site isto
normalmente não acontece (cada página com avaliações faz uma leitura).
Se o site tiver pouco movimento, há duas alternativas:

1. passar para o plano **Pro** (pago), que nunca pausa; ou
2. criar um pedido automático de leitura a cada 3 dias com o GitHub
   Actions. Criar o ficheiro `.github/workflows/supabase-keepalive.yml`
   com o conteúdo abaixo (trocar o URL e a chave pelos do passo 3 — a
   chave é a mesma chave pública que já está no site):

   ```yaml
   name: Manter o Supabase ativo
   on:
     schedule:
       - cron: '0 6 */3 * *'   # às 06:00 UTC, de 3 em 3 dias
     workflow_dispatch:
   jobs:
     ping:
       runs-on: ubuntu-latest
       steps:
         - run: >
             curl -sf "https://xxxxxxxx.supabase.co/rest/v1/resumo_avaliacoes?select=produto_id&limit=1"
             -H "apikey: sb_publishable_xxxxxxxxxxxxxxxx"
   ```

   O GitHub desativa as tarefas agendadas de repositórios sem commits
   durante 60 dias — se isso acontecer, aparece um aviso no separador
   **Actions** com um botão para as voltar a ativar.

## Para quem mexe no código

- Base de dados e segurança: `tools/supabase-avaliacoes.sql`.
- Camada de dados (pedidos, cache de 5 min, timeout de 8 s, validação):
  `js/state/reviews.js`.
- Formulário, página de avaliações e peças visuais: `js/pages/reviews.js`.
- Ligação à ficha de produto, cartões, ordenação da loja e página inicial:
  `js/static-init.js`.
- Testes locais sem conta no Supabase: `node tools/mock-supabase.js`
  (imitação da API com as mesmas regras de segurança — só para testes).
