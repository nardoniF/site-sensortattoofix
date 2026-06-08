/**
 * Configuração da loja oficial — edite os valores abaixo.
 * PIX: gratuito, funciona imediatamente após preencher sua chave.
 * Mercado Pago: opcional, requer deploy do Worker em api/ (plano gratuito Cloudflare).
 */
window.CHECKOUT_CONFIG = {
  product: {
    name: 'Kit Sensor TattooFix',
    description: 'Lente ótica para smartwatch em pele tatuada — kit completo',
    price: 79.90,
    shipping: 0,
    image: 'https://sensortattoofix.com.br/sensortattoofix.jpg'
  },

  pix: {
    key: 'sensortattoofix@gmail.com',
    keyType: 'email',
    merchantName: '3N20 SOLUCOES TEC',
    merchantCity: 'SAO PAULO'
  },

  // Mercado Pago — deixe apiUrl vazio até fazer o deploy do Worker
  mercadoPago: {
    apiUrl: '',
    successUrl: 'https://sensortattoofix.com.br/comprar.html?status=aprovado',
    pendingUrl: 'https://sensortattoofix.com.br/comprar.html?status=pendente',
    failureUrl: 'https://sensortattoofix.com.br/comprar.html?status=recusado'
  },

  formsubmit: {
    email: 'sensortattoofix@gmail.com',
    subject: 'Novo pedido — Loja Oficial Sensor TattooFix'
  },

  whatsapp: '5511913394665',
  siteUrl: 'https://sensortattoofix.com.br'
};
