/* ==========================================================================
   Configuração das contas de cliente — ver docs/CONTAS.md.
   Usa o MESMO projeto Supabase das avaliações (url e chave pública de
   js/data/reviewsConfig.js) — não se repetem aqui.

   ativa: false  -> o site fica exatamente como sem contas: sem ícone de
                    conta, sem página de entrada no menu, sem pedidos.
   ativa: true   -> só depois de seguir os passos de docs/CONTAS.md
                    (SQL, modelo do e-mail com o código, SMTP próprio).

   fornecedores: cada botão só aparece com true. Google e Facebook só
   depois de criados no Google Cloud / Meta for Developers e ligados no
   Supabase (docs/CONTAS.md, passos 5 e 6).

   Depois de mudar este ficheiro: node tools/gerar-paginas.js e push.
   ========================================================================== */
(function (GDM) {
  'use strict';

  GDM.contaConfig = {
    ativa: false,
    fornecedores: { email: true, google: false, facebook: false },
  };
})(window.GDM = window.GDM || {});
