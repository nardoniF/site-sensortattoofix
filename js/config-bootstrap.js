/**
 * URL do Worker Cloudflare (após deploy em api/).
 * Quando preenchida, o checkout e o admin usam a API para config em tempo real.
 * Exemplo: https://sensortattoofix-payments.SEU-USUARIO.workers.dev
 */
window.CONFIG_BOOTSTRAP = {
  configApiUrl: 'https://api.sensortattoofix.com.br',
  /** Chave pública enviada no log de cliques (validada no Worker). */
  clickLogKey: 'stf_ck_7f3a9e2b1c'
};

if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
  navigator.serviceWorker.register('/stf-log-sw.js', { scope: '/' }).catch(function () {});
}
