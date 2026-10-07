/* ==========================================================================
   Configuração das avaliações (Supabase) — ver docs/AVALIACOES.md.
   Depois de preencher, correr `node tools/gerar-paginas.js` (para a
   Content-Security-Policy passar a deixar o site falar com o Supabase) e
   fazer push.
   Enquanto url/anonKey estiverem vazios o site funciona na mesma: as
   secções de avaliações mostram "As avaliações estão a chegar em breve" e
   o formulário fica desativado.
   ========================================================================== */
(function (GDM) {
  'use strict';

  GDM.reviewsConfig = {
    url: '',      // ex.: https://xxxx.supabase.co — preencher depois de criar o projeto
    anonKey: '',  // chave "publishable" (sb_publishable_…) ou a antiga "anon public" do Supabase.
                  // É pública por desenho; a segurança está no RLS. NUNCA usar aqui a
                  // chave secreta / service_role.
    porPagina: 8,
  };
})(window.GDM = window.GDM || {});
