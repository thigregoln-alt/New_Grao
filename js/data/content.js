/* ==========================================================================
   Conteúdo institucional — marca, envios, newsletter e textos legais.
   Texto estático, sem dados de utilizador. (As avaliações vivem no
   Supabase — ver js/state/reviews.js.)
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
    siteUrl: 'https://graodemostardaegc.com',
    defaultDescription: 'Ateliê português de produtos personalizados com temática cristã: Bíblias, canecas, t-shirts, decoração, cadernos e mais. Feito à mão, um de cada vez — pagamento combinado por WhatsApp.',
  };

  /* NEWSLETTER — ainda não há serviço de envio (o e-mail ficava só no
     localStorage do visitante e ninguém o recebia), por isso o formulário
     sai do site. Quando houver um serviço de newsletter real, mudar para
     `true` e ligar o envio — ver ARCHITECTURE.md. Com `ativa: false` o
     gerador não escreve o formulário e footer.js não o monta;
     js/state/newsletter.js e newsletterForm ficam prontos para voltar. */
  const NEWSLETTER = { ativa: false };

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
    /* Valores numéricos do Envio Normal (CTT) usados nos cálculos do
       checkout, do carrinho e do aviso "Faltam X € para portes grátis".
       Manter alinhados com o texto de methods[0].price acima. */
    normalPrice: 4.90,
    freeShippingFrom: 50,
  };

  /* PÁGINAS LEGAIS — exigidas por lei (RGPD/UE) por já existir recolha de
     dados via formulário de contacto, checkout e newsletter, mesmo sem
     checkout de pagamento automático. O tools/gerar-paginas.js escreve-as em
     termos.html e privacidade.html. */
  const PRIVACY_POLICY = {
    updated: '2026-11-22',
    sections: [
      { title: 'Que dados recolhemos', text: 'Recolhemos apenas os dados que nos fornece diretamente: nome, e-mail, telefone e morada (no formulário de checkout), nome e e-mail (no formulário de contacto), e, se deixar uma avaliação, o nome que escolher, a classificação, o texto e, opcionalmente, o número da encomenda (ver secção "Avaliações de produtos"). Não usamos cookies de rastreio nem recolhemos dados de navegação além do estritamente necessário ao funcionamento do site (ver secção de cookies). A newsletter do ateliê ainda não está disponível e o site não recolhe e-mails para esse fim; quando estiver, esta política será atualizada antes de começarmos a recolher subscrições.' },
      { title: 'Para que servem', text: 'Usamos estes dados exclusivamente para: preparar e combinar consigo a sua encomenda (por WhatsApp ou e-mail), e responder às suas mensagens de contacto. Nunca vendemos nem partilhamos os seus dados com terceiros para fins de marketing.' },
      { title: 'Onde ficam guardados', text: 'O carrinho e os favoritos ficam guardados apenas no seu próprio dispositivo (localStorage do navegador). As exceções são as avaliações de produtos e a contagem de visitas aos produtos: ficam numa base de dados alojada pelo Supabase na Suíça (ver as secções seguintes). Os dados que envia por WhatsApp ou e-mail no checkout/contacto ficam guardados nessas plataformas (WhatsApp, Gmail), fora do site, e são geridos diretamente pelo ateliê.' },
      { id: 'avaliacoes', title: 'Avaliações de produtos', text: 'Quando deixa uma avaliação guardamos o nome que indicar (aparece publicamente com a avaliação — pode usar só o primeiro nome e a inicial), a classificação em estrelas, o título e o texto, a data e, se o indicar, o número da encomenda. Estes dados ficam alojados pelo Supabase (Supabase Inc.), numa base de dados em Zurique (Suíça, país que a União Europeia reconhece como tendo proteção de dados adequada), que atua como subcontratante do ateliê. Cada avaliação só é publicada depois de revista pelo ateliê. O número da encomenda nunca é mostrado publicamente: serve apenas para confirmarmos a compra e mostrarmos o selo "Compra verificada". Para travar spam, quando envia uma avaliação guardamos também, durante no máximo 24 horas, um código calculado a partir do endereço IP da sua ligação (o IP em si não é guardado); serve só para limitar o número de avaliações enviadas a partir da mesma ligação, com base no interesse legítimo do ateliê em proteger o site contra abusos. As avaliações publicadas ficam guardadas enquanto estiverem publicadas; as que não forem aprovadas são apagadas no prazo de 30 dias. Pode pedir a qualquer momento para corrigir ou apagar a sua avaliação, por WhatsApp (+351 925 130 518) ou e-mail (ateliergraodemostarda176@gmail.com) — indique o nome e o produto avaliado.' },
      { title: 'Produtos mais vistos', text: 'Para mostrarmos o selo "Destaque" nos produtos mais procurados, contamos quantas vezes cada página de produto é aberta. Fica guardado apenas o total de visitas de cada produto por dia, sem nada que identifique quem visitou, e apagado ao fim de 30 dias. Para que a mesma pessoa não conte várias vezes, guardamos durante no máximo 24 horas um código calculado a partir do endereço IP da ligação (o IP em si não é guardado), na mesma base de dados das avaliações (Supabase, Suíça), com base no interesse legítimo do ateliê em saber que produtos interessam mais. Não são usados cookies para isto e, se recusar os não-essenciais no aviso de cookies, as suas visitas não são contadas.' },
      { title: 'Quanto tempo guardamos', text: 'Os dados de encomendas e mensagens de contacto são guardados pelo ateliê pelo tempo necessário para cumprir obrigações legais e fiscais (normalmente até 10 anos, por exigência da lei portuguesa para documentos comerciais). Pode pedir a eliminação de dados que não estejam sujeitos a essa obrigação a qualquer momento.' },
      { title: 'Os seus direitos', text: 'Tem direito a aceder, retificar, apagar ou pedir a portabilidade dos seus dados pessoais, e a opor-se ao seu tratamento, nos termos do RGPD. Para exercer qualquer um destes direitos, contacte-nos pelos dados abaixo.' },
      { title: 'Responsável pelo tratamento', text: 'Ateliê Grão de Mostarda Personalizados — contacto: ateliergraodemostarda176@gmail.com ou WhatsApp +351 925 130 518. Se não ficar satisfeito com a nossa resposta, pode apresentar reclamação junto da Comissão Nacional de Proteção de Dados (CNPD).' },
    ],
  };

  /* Secções sobre as contas de cliente: o gerador só as acrescenta à
     Política de Privacidade com GDM.contaConfig.ativa = true (ver
     privacyContasExtra em tools/gerar-paginas.js). */
  const PRIVACY_CONTAS = {
    sections: [
      { id: 'contas', title: 'Contas de cliente (opcionais)', paragraphs: [
        'Não precisa de conta para comprar. Se decidir criar uma, guardamos: o seu e-mail; o nome, telefone e morada de entrega que escrever na área "A minha conta" ou no checkout (só se deixar marcada a opção "Guardar estes dados na minha conta"); o carrinho e os favoritos (só os códigos dos produtos e as quantidades); e o histórico das encomendas que enviar com sessão iniciada (número, artigos, valores e se seguiu por WhatsApp ou e-mail).',
        'Para que servem: manter o carrinho, os favoritos e a morada iguais em todos os seus dispositivos, preencher o checkout por si e mostrar-lhe as suas encomendas. A base legal é o seu pedido para criar e usar a conta (execução de contrato). O histórico de encomendas da conta é só para si: o pagamento e o estado de cada encomenda continuam a ser combinados connosco pelo WhatsApp.',
        'Onde e até quando: no Supabase (Supabase Inc.), na mesma base de dados das avaliações, em Zurique (Suíça, país que a União Europeia reconhece como tendo proteção de dados adequada). Ficam guardados até apagar a conta. Cada pessoa só consegue ver e alterar os dados da sua própria conta.',
        'Entrada com e-mail: enviamos-lhe um código de uso único, sem passwords. Entrada com Google ou Facebook (se estiver disponível): o Google ou a Meta confirmam quem é e enviam-nos apenas o seu nome, e-mail e foto de perfil públicos, que ficam guardados com a conta; não temos acesso à sua password nem a mais nada da sua conta nesses serviços.',
        'Sessão no navegador: com sessão iniciada, o seu navegador guarda um código de sessão (localStorage), necessário para a conta funcionar — não é usado para mais nada. Ao terminar sessão é apagado, junto com o carrinho e os favoritos guardados nesse dispositivo.',
      ] },
      { id: 'apagar-conta', title: 'Como apagar a sua conta e os seus dados', paragraphs: [
        'Entre na sua conta (ícone de pessoa no topo do site), vá a "A minha conta" e escolha "Apagar a minha conta". A conta é apagada de imediato, junto com os dados de entrega, o carrinho, os favoritos e o histórico de encomendas guardados nela. Não dá para desfazer.',
        'Se entrou com o Facebook ou o Google, pode também retirar o acesso do nosso site nas definições desses serviços (Facebook: Definições → Apps e sites; Google: Conta Google → Segurança → Ligações a apps de terceiros). Isso não apaga a conta no nosso site — para isso, use o passo acima.',
        'Se não conseguir entrar, peça-nos para apagar a conta por WhatsApp (+351 925 130 518) ou e-mail (ateliergraodemostarda176@gmail.com), indicando o e-mail da conta. Apagamos tudo no prazo de 30 dias e confirmamos consigo.',
      ] },
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

  GDM.content = { BRAND, SHIPPING_INFO, NEWSLETTER, PRIVACY_POLICY, PRIVACY_CONTAS, TERMS };
})(window.GDM = window.GDM || {});
