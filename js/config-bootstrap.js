/**
 * URL do Worker Cloudflare (após deploy em api/).
 * Quando preenchida, o checkout e o admin usam a API para config em tempo real.
 * Exemplo: https://sensortattoofix-payments.SEU-USUARIO.workers.dev
 */
window.CONFIG_BOOTSTRAP = {
  configApiUrl: 'https://sensortattoofix-payments.sensortattoofix.workers.dev',
  /** Chave pública enviada no log de cliques (validada no Worker). */
  clickLogKey: 'stf_ck_7f3a9e2b1c'
};
