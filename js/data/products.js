/* ==========================================================================
   Catálogo de produtos — fonte única de verdade para preços/stock.
   Congelado (deepFreeze) para que não possa ser alterado a partir da
   consola do browser; qualquer cálculo de total tem de ler DAQUI, nunca de
   valores guardados em localStorage ou em atributos do DOM.
   ========================================================================== */
(function (GDM) {
  'use strict';

  function deepFreeze(obj) {
    Object.getOwnPropertyNames(obj).forEach(function (key) {
      const value = obj[key];
      if (value && (typeof value === 'object')) deepFreeze(value);
    });
    return Object.freeze(obj);
  }

  const CATEGORIES = [
    { slug: 'biblias', label: 'Bíblias', short: 'Bíblias com capa em pele, gravação e acabamento feitos à mão.' },
    { slug: 'reforma-de-biblia', label: 'Reforma de Bíblia', short: 'Devolvemos vida a uma Bíblia de família com nova encadernação.' },
    { slug: 'canecas-personalizadas', label: 'Canecas Personalizadas', short: 'Canecas em cerâmica com versículos e frases de fé, feitas à mão.' },
    { slug: 'tshirts-temas-cristaos', label: 'T-shirts Temas Cristãos', short: 'T-shirts com estampados originais de inspiração cristã.' },
    { slug: 'decoracao-crista', label: 'Decoração Cristã', short: 'Quadros, placas e peças para dar alma cristã à casa.' },
    { slug: 'kit-pintura-infantil', label: 'Kit Pintura Infantil', short: 'Kits para os mais pequenos pintarem histórias da Bíblia.' },
    { slug: 'porta-chaves', label: 'Porta-Chaves', short: 'Porta-chaves em pele e madeira, gravados à mão.' },
    { slug: 'cadernos-a4', label: 'Cadernos Personalizados A4', short: 'Cadernos devocionais e de propósito, formato A4.' },
    { slug: 'cadernos-a5', label: 'Cadernos Personalizados A5', short: 'Cadernos de bolso A5 para orações e apontamentos.' },
  ];

  const RAW_PRODUCTS = [
    /* ---------------- Bíblias ---------------- */
    {
      id: 'bib-01', slug: 'biblia-capa-couro-gravada', category: 'biblias',
      name: 'Bíblia Sagrada Capa em Pele Gravada', price: 54.9, oldPrice: 64.9,
      description: 'Bíblia Sagrada (Almeida Revista e Atualizada) com capa em pele sintética castanha, nome ou iniciais gravados a relevo e fecho em botão de pressão.',
      long: 'Cada Bíblia é preparada uma a uma: escolhemos a pele, gravamos o nome à mão com prensa a quente e revemos página a página antes do envio. Fica com identidade própria — para oferecer ou para guardar como herança de família.',
      stock: 14, featured: true, tags: ['mais vendido', 'ideal para batismo'],
    },
    {
      id: 'bib-02', slug: 'biblia-estudo-mulher-virtuosa', category: 'biblias',
      name: 'Bíblia de Estudo "Mulher Virtuosa"', price: 49.9,
      description: 'Bíblia de estudo com notas e mapas, capa florida em tecido reforçado e etiqueta com nome bordado.',
      long: 'Pensada para devocionais diárias: letra grande, referências cruzadas e espaço nas margens para anotações. A etiqueta com o nome é bordada à mão e cosida à capa.',
      stock: 9, featured: false, tags: ['presente'],
    },
    {
      id: 'bib-03', slug: 'biblia-infantil-ilustrada', category: 'biblias',
      name: 'Bíblia Infantil Ilustrada', price: 27.9,
      description: 'Bíblia infantil com ilustrações coloridas, capa dura resistente e nome da criança impresso na capa.',
      long: 'As histórias mais conhecidas contadas de forma simples, com ilustrações grandes. Ótima para o primeiro contacto da criança com a Palavra — e para guardar como recordação de batismo ou catequese.',
      stock: 20, featured: false, tags: ['crianças'],
    },
    {
      id: 'bib-04', slug: 'biblia-viagem-compacta', category: 'biblias',
      name: 'Bíblia de Viagem Compacta com Estojo', price: 38.9,
      description: 'Formato de bolso, capa em pele fina e estojo em tecido com cordão, nome gravado no estojo.',
      long: 'Feita para andar sempre consigo — cabe numa mala pequena ou bolso de casaco. O estojo protege as páginas e pode ser gravado com o mesmo nome da capa.',
      stock: 11, featured: false, tags: ['compacta'],
    },

    /* ---------------- Reforma de Bíblia ---------------- */
    {
      id: 'ref-01', slug: 'reforma-encadernacao-classica', category: 'reforma-de-biblia',
      name: 'Reforma de Bíblia — Encadernação Clássica', price: 39.9,
      description: 'Reforço de lombada, substituição de capa desgastada e reforço de páginas soltas, mantendo o miolo original.',
      long: 'Envie-nos a sua Bíblia de família — tratamos da lombada, reforçamos as páginas mais frágeis e devolvemos com capa nova, sem perder uma só anotação ou dedicatória do interior. Um serviço pensado para Bíblias com valor sentimental.',
      stock: 6, featured: true, tags: ['restauro', 'herança de família'],
    },
    {
      id: 'ref-02', slug: 'reforma-capa-couro-premium', category: 'reforma-de-biblia',
      name: 'Reforma de Bíblia — Capa em Pele Premium', price: 54.9,
      description: 'Substituição total da capa por pele espessa costurada à mão, com cantos reforçados e fecho novo.',
      long: 'Para quem quer devolver à Bíblia da avó ou do avô um acabamento à altura da história que ela carrega. Pele mais espessa, costura reforçada nos quatro cantos e fecho de qualidade.',
      stock: 5, featured: false, tags: ['restauro premium'],
    },
    {
      id: 'ref-03', slug: 'reforma-express-lombada', category: 'reforma-de-biblia',
      name: 'Reforma Express — Só Lombada', price: 22.9,
      description: 'Intervenção rápida focada apenas na lombada partida ou solta, sem troca de capa.',
      long: 'Ideal quando a capa ainda está em bom estado mas a lombada cedeu. Reforçamos e colamos com técnica de encadernação tradicional, devolvendo resistência ao dia a dia de uso.',
      stock: 8, featured: false, tags: ['reparação rápida'],
    },

    /* ---------------- Canecas Personalizadas ---------------- */
    {
      id: 'can-01', slug: 'caneca-grao-mostarda-fe', category: 'canecas-personalizadas',
      name: 'Caneca "Fé do Tamanho de um Grão de Mostarda"', price: 13.9,
      description: 'Caneca em cerâmica branca 325ml com o versículo de Lucas 17:6 e espaço para nome gravado.',
      long: 'A nossa caneca mais pedida. Estampa cozida a alta temperatura para não desbotar na máquina de lavar loiça — resistente ao uso diário, com o versículo que dá nome ao ateliê.',
      stock: 40, featured: true, tags: ['mais vendido'],
    },
    {
      id: 'can-02', slug: 'caneca-casal-devocional', category: 'canecas-personalizadas',
      name: 'Par de Canecas Devocional do Casal', price: 24.9,
      description: 'Duas canecas a combinar, com nomes do casal e data especial gravados.',
      long: 'Pensada para noivado, casamento ou aniversário. As duas canecas formam um par visual, com a data e os nomes dispostos para se completarem quando colocadas lado a lado.',
      stock: 18, featured: false, tags: ['casal', 'casamento'],
    },
    {
      id: 'can-03', slug: 'caneca-termica-oracao', category: 'canecas-personalizadas',
      name: 'Caneca Térmica "Momento de Oração"', price: 18.9,
      description: 'Caneca térmica em aço inoxidável com tampa, ideal para o café da manhã de devocional.',
      long: 'Mantém a bebida quente durante a leitura bíblica da manhã. Gravação a laser resistente, não desbota nem risca com o uso.',
      stock: 22, featured: false, tags: ['térmica'],
    },
    {
      id: 'can-04', slug: 'caneca-infantil-arca-noe', category: 'canecas-personalizadas',
      name: 'Caneca Infantil "Arca de Noé"', price: 11.9,
      description: 'Caneca pequena com ilustração colorida da Arca de Noé e nome da criança.',
      long: 'Em cerâmica atóxica própria para uso alimentar, com pega larga fácil de segurar por mãos pequenas.',
      stock: 26, featured: false, tags: ['crianças'],
    },

    /* ---------------- T-shirts Temas Cristãos ---------------- */
    {
      id: 'tsh-01', slug: 'tshirt-grao-mostarda-original', category: 'tshirts-temas-cristaos',
      name: 'T-shirt "Grão de Mostarda" Estampado Original', price: 21.9,
      description: 'T-shirt 100% algodão com estampado exclusivo do ateliê, gola redonda reforçada.',
      long: 'Design desenhado internamente, impresso com tinta de alta durabilidade. Corte unissexo, confortável para o dia a dia.',
      stock: 30, featured: true, tags: ['algodão'],
    },
    {
      id: 'tsh-02', slug: 'tshirt-versiculo-costas', category: 'tshirts-temas-cristaos',
      name: 'T-shirt Versículo nas Costas', price: 23.9,
      description: 'Estampado discreto à frente e versículo à escolha nas costas, em letra manuscrita.',
      long: 'Uma peça pensada para quem gosta de levar a mensagem sem exagero — o essencial à frente, a força do versículo nas costas.',
      stock: 24, featured: false, tags: ['versículo'],
    },
    {
      id: 'tsh-03', slug: 'tshirt-infantil-pequeno-david', category: 'tshirts-temas-cristaos',
      name: 'T-shirt Infantil "Pequeno David"', price: 16.9,
      description: 'T-shirt infantil com estampado da história de Davi e Golias, cores vivas.',
      long: 'Algodão macio, sem etiqueta a coçar (impressa diretamente no tecido), pensada para brincar o dia todo com conforto.',
      stock: 20, featured: false, tags: ['crianças'],
    },
    {
      id: 'tsh-04', slug: 'tshirt-familia-conjunto', category: 'tshirts-temas-cristaos',
      name: 'Conjunto Família — T-shirts a Combinar', price: 69.9,
      description: 'Conjunto de 3 t-shirts (adulto, adulto e criança) com o mesmo motivo em tamanhos diferentes.',
      long: 'Perfeito para retiros em família, batismos ou sessões fotográficas. Escolha o motivo e indicamos os três tamanhos no checkout.',
      stock: 10, featured: false, tags: ['família', 'conjunto'],
    },

    /* ---------------- Decoração Cristã ---------------- */
    {
      id: 'dec-01', slug: 'quadro-grao-mostarda-madeira', category: 'decoracao-crista',
      name: 'Quadro "Grão de Mostarda" em Madeira', price: 32.9,
      description: 'Placa decorativa em madeira com o versículo de Lucas 17:6 pirogravado.',
      long: 'Pirogravação artesanal sobre madeira de pinho tratada, com argola pronta a pendurar. Cada peça tem variações naturais do veio da madeira — nenhuma sai exatamente igual.',
      stock: 15, featured: true, tags: ['madeira'],
    },
    {
      id: 'dec-02', slug: 'placa-porta-versiculo-boas-vindas', category: 'decoracao-crista',
      name: 'Placa de Porta "Esta Casa Serve ao Senhor"', price: 19.9,
      description: 'Placa de entrada com o versículo de Josué 24:15, acabamento rústico.',
      long: 'Recebe quem chega com uma declaração de fé simples e elegante. Fixação incluída, pronta a pendurar na porta principal.',
      stock: 17, featured: false, tags: ['entrada'],
    },
    {
      id: 'dec-03', slug: 'porta-retrato-oracao-familia', category: 'decoracao-crista',
      name: 'Porta-Retrato "Oração em Família"', price: 24.9,
      description: 'Moldura em madeira gravada com espaço para foto 13x18 e frase gravada na base.',
      long: 'Uma moldura pensada para guardar um retrato de batismo, casamento ou primeira comunhão, com uma frase gravada na base à sua escolha.',
      stock: 12, featured: false, tags: ['moldura'],
    },
    {
      id: 'dec-04', slug: 'guirlanda-oracao-parede', category: 'decoracao-crista',
      name: 'Guirlanda Decorativa "Jardim de Oração"', price: 27.9,
      description: 'Guirlanda de parede com folhagem artificial e medalha central com cruz.',
      long: 'Composição feita à mão com folhagem de qualidade e uma medalha central em metal envelhecido. Dá um toque acolhedor a corredores e salas.',
      stock: 9, featured: false, tags: ['parede'],
    },

    /* ---------------- Kit Pintura Infantil ---------------- */
    {
      id: 'kit-01', slug: 'kit-pintura-arca-noe', category: 'kit-pintura-infantil',
      name: 'Kit Pintura "A Arca de Noé"', price: 15.9,
      description: 'Tela pré-desenhada, 6 tintas laváveis, 2 pincéis e avental — tudo incluído na caixa.',
      long: 'Uma tarde de atividade em família: a criança pinta a sua própria versão da Arca de Noé enquanto ouve a história. Tintas atóxicas e laváveis, testadas para uso infantil.',
      stock: 24, featured: true, tags: ['atividade em família'],
    },
    {
      id: 'kit-02', slug: 'kit-pintura-davi-golias', category: 'kit-pintura-infantil',
      name: 'Kit Pintura "Davi e Golias"', price: 15.9,
      description: 'Kit completo com tela, tintas, pincéis e ficha de atividade com a história ilustrada.',
      long: 'Inclui uma pequena ficha com a história contada de forma simples, para ler antes de começar a pintar. Caixa pronta para oferecer.',
      stock: 20, featured: false, tags: ['atividade em família'],
    },
    {
      id: 'kit-03', slug: 'kit-pintura-madeira-cruz', category: 'kit-pintura-infantil',
      name: 'Kit Pintura em Madeira "A Minha Cruz"', price: 12.9,
      description: 'Base de madeira em forma de cruz para pintar e decorar, com fita para pendurar.',
      long: 'Uma atividade mais simples e rápida, ótima para catequese ou festas de aniversário com tema cristão — vem com tintas em miniatura e pincel.',
      stock: 30, featured: false, tags: ['catequese'],
    },

    /* ---------------- Porta-Chaves ---------------- */
    {
      id: 'pc-01', slug: 'porta-chaves-pele-versiculo', category: 'porta-chaves',
      name: 'Porta-Chaves em Pele com Versículo', price: 8.9,
      description: 'Porta-chaves em pele legítima com versículo gravado a fogo e argola de metal.',
      long: 'Pequeno mas cheio de significado — leva um versículo consigo todos os dias. Cada peça é gravada individualmente à mão.',
      stock: 45, featured: true, tags: ['mais vendido'],
    },
    {
      id: 'pc-02', slug: 'porta-chaves-madeira-cruz', category: 'porta-chaves',
      name: 'Porta-Chaves em Madeira "Cruz"', price: 6.9,
      description: 'Porta-chaves em madeira maciça com forma de cruz, nome gravado a laser.',
      long: 'Um presente pequeno e acessível para lembranças de batismo, crisma ou casamento — vendido também em pack para eventos.',
      stock: 60, featured: false, tags: ['lembrança de evento'],
    },
    {
      id: 'pc-03', slug: 'porta-chaves-casal-fe', category: 'porta-chaves',
      name: 'Par de Porta-Chaves do Casal "Fé"', price: 14.9,
      description: 'Dois porta-chaves em pele que se completam com a palavra "Fé" dividida entre os dois.',
      long: 'Um para cada um — ideia de presente de noivado ou aniversário de casamento, simples e cheia de simbolismo.',
      stock: 22, featured: false, tags: ['casal'],
    },

    /* ---------------- Cadernos Personalizados A4 ---------------- */
    {
      id: 'ca4-01', slug: 'caderno-a4-devocional-anual', category: 'cadernos-a4',
      name: 'Caderno Devocional Anual A4', price: 17.9,
      description: 'Caderno A4 com 200 páginas pautadas, capa gravada e secção de metas espirituais.',
      long: 'Estruturado para acompanhar um ano de leitura devocional, com espaço para notas de pregação, pedidos de oração e reflexões semanais.',
      stock: 25, featured: true, tags: ['devocional'],
    },
    {
      id: 'ca4-02', slug: 'caderno-a4-proposito-metas', category: 'cadernos-a4',
      name: 'Caderno de Propósito & Metas A4', price: 16.9,
      description: 'Caderno A4 estruturado para planeamento pessoal com base em valores e propósito de vida.',
      long: 'Secções para definir prioridades, acompanhar hábitos e registar conquistas mês a mês — com capa gravada com o nome.',
      stock: 18, featured: false, tags: ['planeamento'],
    },
    {
      id: 'ca4-03', slug: 'caderno-a4-estudo-biblico', category: 'cadernos-a4',
      name: 'Caderno de Estudo Bíblico A4', price: 18.9,
      description: 'Caderno A4 com grelhas próprias para estudo indutivo da Bíblia, capa gravada.',
      long: 'Cada página tem espaço para versículo, contexto, aplicação prática e oração — pensado para pequenos grupos e estudo pessoal.',
      stock: 15, featured: false, tags: ['estudo'],
    },

    /* ---------------- Cadernos Personalizados A5 ---------------- */
    {
      id: 'ca5-01', slug: 'caderno-a5-oracoes-bolso', category: 'cadernos-a5',
      name: 'Caderno de Orações de Bolso A5', price: 12.9,
      description: 'Caderno A5 compacto com elástico e caneta, ideal para levar na mala.',
      long: 'O tamanho certo para não deixar em casa — cabe em qualquer mala e acompanha nos momentos de oração fora de casa.',
      stock: 35, featured: true, tags: ['bolso'],
    },
    {
      id: 'ca5-02', slug: 'caderno-a5-gratidao-diaria', category: 'cadernos-a5',
      name: 'Caderno de Gratidão Diária A5', price: 13.9,
      description: 'Caderno A5 com estrutura diária para registar três motivos de gratidão.',
      long: 'Um hábito simples que muda a forma como se olha para o dia — três linhas por dia, capa gravada com o nome.',
      stock: 28, featured: false, tags: ['gratidão'],
    },
    {
      id: 'ca5-03', slug: 'caderno-a5-versiculos-semana', category: 'cadernos-a5',
      name: 'Caderno "Um Versículo por Semana" A5', price: 11.9,
      description: 'Caderno A5 com 52 páginas, uma por semana, para memorizar um versículo de cada vez.',
      long: 'No topo de cada página há espaço para escrever o versículo escolhido e, por baixo, para registar como ele se aplicou à semana.',
      stock: 20, featured: false, tags: ['memorização'],
    },
  ];

  const PRODUCTS = RAW_PRODUCTS.map(function (p) {
    const cat = CATEGORIES.find(function (c) { return c.slug === p.category; });
    return Object.assign({}, p, { categoryLabel: cat ? cat.label : p.category });
  });

  GDM.catalog = {
    CATEGORIES: deepFreeze(CATEGORIES),
    PRODUCTS: deepFreeze(PRODUCTS),
    getBySlug: function (slug) {
      return GDM.catalog.PRODUCTS.find(function (p) { return p.slug === slug; }) || null;
    },
    getById: function (id) {
      return GDM.catalog.PRODUCTS.find(function (p) { return p.id === id; }) || null;
    },
    byCategory: function (slug) {
      return GDM.catalog.PRODUCTS.filter(function (p) { return p.category === slug; });
    },
    featured: function () {
      return GDM.catalog.PRODUCTS.filter(function (p) { return p.featured; });
    },
  };
})(window.GDM = window.GDM || {});
