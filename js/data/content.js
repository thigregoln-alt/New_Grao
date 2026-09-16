/* ==========================================================================
   Conteúdo institucional — depoimentos, FAQ, envios, devoluções, inspiração,
   avaliações-semente. Texto estático, sem dados de utilizador.
   ========================================================================== */
(function (GDM) {
  'use strict';

  const BRAND = {
    name: 'Grão de Mostarda Personalizados',
    whatsapp: '351925130518',
    whatsappDisplay: '+351 925 130 518',
    email: 'ateliergraodemostarda176@gmail.com',
    instagram: '@ateliergraodemostarda',
    instagramUrl: 'https://instagram.com/ateliergraodemostarda',
    mbway: '925 130 518',
    mbwayName: 'Margie Macedo',
    nib: '0033 0000 4555 0970 2080 5',
    bank: 'Banco Millennium',
    accountHolder: 'Margie Macedo',
    verse: 'Se tiverdes fé do tamanho de um grão de mostarda, direis a esta amoreira: desarraiga-te e planta-te no mar; e ela vos obedecerá.',
    verseRef: 'Lucas 17:6 · Mateus 17:20',
    siteUrl: 'https://graodemostarda.pt', // TODO: confirmar o domínio final de produção e atualizar aqui
    defaultDescription: 'Ateliê português de produtos personalizados com temática cristã: Bíblias, canecas, t-shirts, decoração, cadernos e mais. Feito à mão, um de cada vez — pagamento combinado por WhatsApp.',
  };

  /* TESTEMUNHOS — o site ainda não foi publicado, por isso não existem
     testemunhos reais de clientes ainda. NÃO preencher com nomes/citações
     inventados: o ateliê pediu explicitamente para não apresentar conteúdo
     de demonstração como se fosse real. Quando houver testemunhos reais
     (recolhidos por WhatsApp, Instagram, etc.), adicionar aqui no formato
     { name, location, quote, color } — a secção na página inicial usa
     automaticamente a grelha de cartões assim que este array tiver itens,
     e mostra um estado vazio honesto enquanto estiver vazio. */
  const TESTIMONIALS = [];

  const BENEFITS = [
    { icon: 'handmade', title: 'Feito à mão, um de cada vez', text: 'Cada peça é preparada individualmente no nosso ateliê — não trabalhamos em produção em série.' },
    { icon: 'shield', title: 'Pagamento combinado por WhatsApp', text: 'Sem checkout automático: falamos diretamente consigo para confirmar o pagamento.' },
    { icon: 'truck', title: 'Envio para todo o país', text: 'Preparamos e enviamos através dos CTT para qualquer morada em Portugal.' },
    { icon: 'sparkle', title: 'Peça única do ateliê', text: 'Cada encomenda sai das nossas mãos, com atenção ao detalhe do início ao fim.' },
  ];

  const HOW_IT_WORKS = [
    { title: 'Escolha o produto', text: 'Navegue pelas 9 categorias do ateliê e encontre a peça certa para si ou para oferecer.' },
    { title: 'Confirme a encomenda', text: 'Finalize no carrinho e envie o pedido — por e-mail ou WhatsApp — com os seus dados de entrega.' },
    { title: 'Combine o pagamento', text: 'Entramos em contacto pelo WhatsApp para confirmar o pagamento antes da produção.' },
    { title: 'Receba em casa', text: 'Preparamos a sua peça à mão e enviamos para a morada indicada, com todo o cuidado na embalagem.' },
  ];

  const FAQ_GROUPS = [
    {
      title: 'Encomendas',
      items: [
        { q: 'Como faço uma encomenda?', a: 'Escolha o produto na loja e adicione ao carrinho. No checkout confirma os seus dados de entrega e envia o pedido para o ateliê, por e-mail ou WhatsApp.' },
        { q: 'Posso pedir um nome, texto ou versículo específico numa peça?', a: 'Sim. Depois de enviar a encomenda, escreva-nos por WhatsApp ou e-mail com o que pretende — combinamos sempre os detalhes consigo antes de avançar para produção.' },
        { q: 'Quanto tempo demora a produção?', a: 'A maioria das peças fica pronta em 3 a 7 dias úteis. Reformas de Bíblia podem demorar até 10 dias úteis, consoante o estado da peça original.' },
        { q: 'Posso alterar algum detalhe depois de enviar a encomenda?', a: 'Sim, desde que a produção ainda não tenha começado. Contacte-nos o mais rápido possível pelo WhatsApp indicando o número da encomenda.' },
      ],
    },
    {
      title: 'Pagamento',
      items: [
        { q: 'Como funciona o pagamento?', a: 'O site não processa pagamentos automaticamente. Depois de enviar a encomenda, entramos em contacto diretamente consigo pelo WhatsApp para confirmar o valor final e combinar o pagamento.' },
        { q: 'Preciso de escolher um método de pagamento no site?', a: 'Não — não há nenhuma seleção de método de pagamento no site. Os dados para MBWay ou transferência bancária são partilhados diretamente consigo, por WhatsApp ou e-mail, depois de combinarmos a encomenda.' },
        { q: 'A produção começa antes ou depois do pagamento?', a: 'Iniciamos a produção após confirmação do pagamento (ou de um sinal, em encomendas de maior valor), para garantir segurança para ambas as partes.' },
      ],
    },
  ];

  const SHIPPING_INFO = {
    intro: 'Preparamos cada encomenda com cuidado antes de a entregarmos aos CTT. Os prazos abaixo começam a contar depois de o pagamento ser confirmado e a produção estar concluída.',
    methods: [
      { title: 'Envio Normal (CTT)', time: '3 a 5 dias úteis após produção', price: '€4,90 · grátis em encomendas acima de €50' },
      { title: 'Envio Expresso', time: '1 a 2 dias úteis após produção', price: '€7,90' },
      { title: 'Levantamento no Ateliê', time: 'Combinado por WhatsApp', price: 'Grátis' },
    ],
    notes: [
      'Encomendas com vários artigos seguem juntas assim que todos estiverem prontos.',
      'Enviamos o código de rastreio pelo WhatsApp ou e-mail assim que a encomenda sai do ateliê.',
      'Não são feitos envios internacionais neste momento — apenas para Portugal Continental e Ilhas (consultar prazo adicional para Açores e Madeira).',
    ],
  };

  const RETURNS_INFO = {
    intro: 'Queremos que fique feliz com a sua peça. Como a maioria dos nossos artigos é feita por encomenda, as regras de devolução são um pouco diferentes de uma loja com stock geral — explicamos tudo de forma transparente abaixo.',
    points: [
      { title: 'Peças feitas por encomenda', text: 'Nos termos da legislação portuguesa de defesa do consumidor (que transpõe a Diretiva 2011/83/UE), bens feitos por medida ou claramente personalizados a pedido do cliente não estão abrangidos pelo direito de livre resolução de 14 dias aplicável a encomendas à distância. Sempre que combinarmos consigo um nome, versículo ou detalhe específico numa peça, esta exceção aplica-se; para peças vendidas tal como apresentadas na loja, esclarecemos a situação caso a caso.' },
      { title: 'Defeitos de fabrico', text: 'Se a peça chegar com defeito ou dano de transporte, contacte-nos nos 7 dias seguintes à receção com fotografias — substituímos ou reparamos sem custo adicional.' },
      { title: 'Erro do ateliê', text: 'Se a peça entregue não corresponder ao que foi combinado no pedido (erro nosso), corrigimos ou refazemos sem custo.' },
      { title: 'Como pedir apoio', text: 'Escreva-nos por WhatsApp ou e-mail com o número da encomenda — respondemos o mais rápido possível para encontrar a melhor solução.' },
    ],
  };

  const STORY = {
    origin: 'O nome "Grão de Mostarda" nasce de uma frase de Jesus em Lucas 17:6: "Se tiverdes fé do tamanho de um grão de mostarda, direis a esta amoreira: desarraiga-te e planta-te no mar; e ela vos obedecerá." É também mencionado em Mateus 17:20, sobre a fé capaz de mover montanhas. O grão de mostarda é uma das sementes mais pequenas — mas dá origem a uma das maiores árvores da horta. Foi isso que nos inspirou: começar pequenos, com as mãos e uma mesa de trabalho, e confiar que algo maior pode crescer daí.',
    purpose: 'Cada peça que sai do nosso ateliê carrega um propósito simples: lembrar quem a recebe de que a fé não precisa de ser grande para ser real. Trabalhamos com temas cristãos porque acreditamos no valor de ter, em casa, no bolso ou na mesa de trabalho, algo que aponte para essa fé — feito com cuidado, não em série.',
    wayOfWorking: 'Não temos stock de prateleira nem produção em massa. Cada encomenda é preparada depois de confirmada, uma de cada vez, muitas vezes numa única sessão de trabalho — da escolha dos materiais à gravação final. É mais lento do que uma loja tradicional, mas é assim que garantimos que cada peça tem o cuidado que merece.',
  };

  const INSPIRATION = [
    { title: 'Um novo começo', verse: '"Eis que faço uma coisa nova; agora está saindo à luz."', ref: 'Isaías 43:19', text: 'Devolver vida a uma Bíblia de família é também celebrar um recomeço — sem perder a história que ela já carrega.', category: 'reforma-de-biblia' },
    { title: 'Vestir a fé', verse: '"Revesti-vos de todo o poder de Deus."', ref: 'Efésios 6:11', text: 'Uma t-shirt é uma forma simples de levar consigo, no dia a dia, aquilo em que acredita.', category: 'tshirts-temas-cristaos' },
    { title: 'A casa que ora unida', verse: '"Escolhei hoje a quem sirvais... eu e a minha casa serviremos ao Senhor."', ref: 'Josué 24:15', text: 'Pequenos lembretes na parede transformam uma casa num espaço de fé partilhada.', category: 'decoracao-crista' },
    { title: 'Ensinar desde pequenos', verse: '"Instrui a criança no caminho em que deve andar."', ref: 'Provérbios 22:6', text: 'Pintar histórias da Bíblia é uma forma lúdica de plantar as primeiras sementes de fé.', category: 'kit-pintura-infantil' },
    { title: 'Gratidão em cada página', verse: '"Em tudo dai graças."', ref: '1 Tessalonicenses 5:18', text: 'Um caderno de gratidão transforma um hábito simples numa prática diária de fé.', category: 'cadernos-a5' },
    { title: 'Levar a Palavra consigo', verse: '"A tua palavra é lâmpada para os meus pés."', ref: 'Salmos 119:105', text: 'Um porta-chaves gravado é um lembrete discreto, presente em cada porta que se abre.', category: 'porta-chaves' },
  ];

  /* AVALIAÇÕES-SEMENTE — o site ainda não foi publicado, por isso ainda não
     existem avaliações reais de clientes. NÃO preencher este array com
     avaliações inventadas: o ateliê pediu explicitamente para não mostrar
     avaliações falsas como se fossem reais. A página de Avaliações
     (js/pages/reviews.js) mostra um estado vazio honesto enquanto este
     array estiver vazio, e passa a listar automaticamente qualquer
     avaliação que aqui for adicionada — sem precisar de mexer em mais
     nenhum ficheiro.
     Para acrescentar uma avaliação real recolhida por WhatsApp, Instagram,
     etc., adicionar um objeto neste formato (copiar o exemplo comentado
     abaixo, substituindo pelos dados reais):
     { id: 'rv-01', productId: 'can-01', author: 'Rita F.', rating: 5,
       date: '2026-06-12', title: 'Superou expectativas',
       body: 'Texto real da avaliação do cliente.', verified: true }
     — productId tem de corresponder a um id existente em GDM.catalog.PRODUCTS
     (ver js/data/products.js); date no formato AAAA-MM-DD; verified indica
     se foi uma compra confirmada pelo ateliê. */
  const REVIEWS = [];

  /* PROJETOS — o que o ateliê está a construir para além da loja em si.
     Página distinta de "Inspiração" (versículos/histórias por categoria).
     Fica isolado aqui para o cliente conseguir atualizar facilmente mais
     tarde (ex. quando o Ministério Bíblico tiver mais detalhes), sem
     precisar de mexer em js/pages/projects.js. */
  const PROJECTS = [
    {
      status: 'ativo',
      badge: 'Ativo',
      title: 'Grão de Mostarda Personalizados',
      description: 'A nossa loja de artesanato cristão — Bíblias, canecas, roupa, cadernos, decoração e presentes feitos com amor, fé e propósito, inspirados em Lucas 17:6 e Mateus 17:20.',
      ctaLabel: 'Visitar a loja',
      ctaHref: '#/loja',
    },
    {
      status: 'em-desenvolvimento',
      badge: 'Em desenvolvimento',
      title: 'Ministério Bíblico',
      description: 'Um novo projeto da Grão de Mostarda, ainda em fase inicial. Em breve partilhamos aqui a missão, os objetivos e as atividades deste projeto.',
    },
  ];

  /* PÁGINAS LEGAIS — exigidas por lei (RGPD/UE) por já existir recolha de
     dados via formulário de contacto, checkout e newsletter, mesmo sem
     checkout de pagamento automático. Ver js/pages/legal.js. */
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

  GDM.content = { BRAND, TESTIMONIALS, BENEFITS, HOW_IT_WORKS, FAQ_GROUPS, SHIPPING_INFO, RETURNS_INFO, STORY, INSPIRATION, REVIEWS, PROJECTS, PRIVACY_POLICY, TERMS };
})(window.GDM = window.GDM || {});
