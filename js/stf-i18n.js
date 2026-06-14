/**
 * Traduções PT/EN — checkout, loja e UI compartilhada.
 * Ative com ?lang=en ou vindo de /en/
 */
window.STF_I18N = (function () {
  const STRINGS = {
    pt: {
      'brand.tagline': 'A paz entre o silício e a tinta',
      'nav.cart': 'Carrinho',
      'nav.back': 'Voltar',
      'nav.home': 'Início',
      'nav.myOrders': 'Meus pedidos',
      'nav.logout': 'Sair',
      'nav.login': 'Entrar',
      'nav.accountMenu': 'Menu da conta',
      'nav.guest': 'Cliente',
      'cart.title': 'Seu carrinho',
      'cart.empty': 'Carrinho vazio',
      'cart.addMore': 'Adicionar mais produtos',
      'cart.qty': 'Quantidade',
      'cart.decrease': 'Diminuir',
      'cart.increase': 'Aumentar',
      'cart.remove': 'Remover',
      'pelicula.upsellTitle': 'Aproveite o frete',
      'pelicula.upsellHint': 'Acessórios compatíveis com seu smartwatch',
      'pelicula.add': 'Adicionar película',
      'pelicula.added': 'Película adicionada ao carrinho!',
      'pelicula.inCart': 'No carrinho',
      'agregados.upsellTitle': 'Aproveite o frete',
      'agregados.upsellHint': 'Acessórios compatíveis com seu smartwatch',
      'agregados.forYourModel': 'Para o seu {model}',
      'agregados.sectionPelicula': 'Películas de tela',
      'agregados.sectionPulseira': 'Pulseiras',
      'agregados.descPelicula': 'Protege a tela do seu smartwatch dos riscos',
      'agregados.descPulseira': 'Conforto e estilo no mesmo envio',
      'agregados.zoomImage': 'Ampliar foto do produto',
      'agregados.zoomClose': 'Fechar',
      'pulseira.add': 'Adicionar pulseira',
      'pulseira.added': 'Pulseira adicionada ao carrinho!',
      'pulseira.inCart': 'No carrinho',
      'summary.subtotal': 'Subtotal',
      'summary.shipping': 'Frete',
      'summary.shippingIntl': 'Frete internacional',
      'summary.total': 'Total',
      'summary.order': 'Pedido',
      'summary.totalLabel': 'Total:',
      'trust.pix': 'PIX automático',
      'trust.card': 'Cartão',
      'trust.email': 'Confirmação por e-mail',
      'step.data': 'Dados',
      'step.payment': 'Pagamento',
      'step.confirm': 'Confirmação',
      'section.yourData': 'Seus dados',
      'section.shippingDest': 'Destino do envio',
      'section.chooseShipping': 'Escolha o frete',
      'pay.title': 'Forma de pagamento',
      'form.fullName': 'Nome completo',
      'form.email': 'E-mail',
      'form.whatsapp': 'WhatsApp',
      'form.cpf': 'CPF',
      'form.docOptional': 'Documento (opcional)',
      'form.watchModel': 'Modelo do smartwatch',
      'form.watchHint': 'O kit é feito para o seu modelo — escolha na lista antes de continuar.',
      'form.watchSelect': 'Selecione o modelo',
      'form.sensorMeasureHint': 'Meça o diâmetro do sensor no fundo do relógio (mm) para escolher a lente certa.',
      'form.sensorMismatch': 'Atenção: este relógio costuma ter sensor de {watch} mm e a lente no carrinho é {lens} mm. Confira a medida com a régua.',
      'form.notesOptional': 'Observações (opcional)',
      'form.notesRequired': 'Observações',
      'form.notesPhOptional': 'Ex.: instruções de entrega ou detalhes do pedido',
      'form.notesPhRequired': 'Informe marca e modelo do seu smartwatch',
      'form.notesPhDefault': 'Ex.: marca e modelo do relógio, cor da pulseira, instruções de entrega…',
      'form.country': 'País',
      'form.cep': 'CEP',
      'form.street': 'Rua',
      'form.number': 'Número',
      'form.complement': 'Complemento',
      'form.district': 'Bairro',
      'form.city': 'Cidade',
      'form.state': 'UF',
      'form.postal': 'Código postal',
      'form.streetIntl': 'Rua / avenida',
      'form.stateIntl': 'Estado / Província',
      'form.stateIntlPh': 'Opcional',
      'form.streetIntlPh': 'Rua do Além',
      'form.numberIntlPh': '78',
      'form.phonePh': '(11) 99999-9999',
      'account.logged': 'Olá, {name} — você está logado.',
      'account.ordersAt': 'Seus pedidos ficam em',
      'account.myAccount': 'Minha Conta',
      'account.tabRegister': 'Criar conta',
      'account.tabLogin': 'Já tenho conta',
      'account.createCheck': 'Criar conta para acompanhar pedidos (recomendado)',
      'account.checkoutTitle': 'Conta (opcional)',
      'account.password': 'Senha da conta (mín. 6 caracteres)',
      'account.passwordPh': 'Crie sua senha',
      'account.showPassword': 'Mostrar senha',
      'account.hidePassword': 'Ocultar senha',
      'account.loginHint': 'Entre com sua conta para preencher os dados automaticamente.',
      'account.loginEmail': 'E-mail da conta',
      'account.loginEmailPh': 'seu@email.com',
      'account.loginPasswordPh': 'Sua senha',
      'account.passwordShort': 'Senha',
      'account.loginBtn': 'Entrar',
      'account.loginEntering': 'Entrando...',
      'account.loginOk': 'Login realizado!',
      'account.loginNeedCreds': 'Informe e-mail e senha.',
      'account.loginUnavailable': 'Login indisponível. Tente em Minha Conta.',
      'account.loginFail': 'Não foi possível entrar.',
      'conta.title': 'Minha Conta',
      'conta.pageTitle': 'Minha Conta | Sensor TattooFix',
      'conta.intro': 'Acesse seus pedidos ou crie uma conta para comprar mais rápido.',
      'conta.tabLogin': 'Entrar',
      'conta.tabRegister': 'Criar conta',
      'conta.email': 'E-mail',
      'conta.password': 'Senha',
      'conta.fullName': 'Nome completo',
      'conta.whatsapp': 'WhatsApp',
      'conta.cpf': 'CPF',
      'conta.passwordRegister': 'Senha (mín. 6 caracteres)',
      'conta.btnLogin': 'Entrar',
      'conta.btnRegister': 'Criar conta',
      'conta.btnLogout': 'Sair',
      'conta.hello': 'Olá, {name}',
      'conta.ordersMeta': 'Seus pedidos na Loja Oficial',
      'conta.buyMore': 'Comprar mais',
      'conta.noOrders': 'Nenhum pedido ainda.',
      'conta.goShop': 'Ir à loja',
      'conta.statusPaid': 'Pago',
      'conta.statusPending': 'Aguardando pagamento',
      'conta.continuePay': 'Continuar pagamento',
      'conta.entering': 'Entrando...',
      'conta.creating': 'Criando conta...',
      'conta.created': 'Conta criada!',
      'conta.passwordMinErr': 'Senha mínima: 6 caracteres.',
      'conta.watch': 'Relógio',
      'conta.total': 'Total',
      'conta.tabOrders': 'Meus pedidos',
      'conta.tabProfile': 'Meus dados',
      'conta.profileIntro': 'Atualize seus dados para o checkout e os avisos de pedido. O e-mail não pode ser alterado aqui.',
      'conta.sectionPersonal': 'Dados pessoais',
      'conta.sectionAddress': 'Endereço padrão (Brasil)',
      'conta.addressHint': 'Usado para preencher o checkout automaticamente.',
      'conta.sectionPassword': 'Alterar senha',
      'conta.passwordHint': 'Deixe em branco se não quiser mudar a senha.',
      'conta.currentPassword': 'Senha atual',
      'conta.newPassword': 'Nova senha',
      'conta.btnSaveProfile': 'Salvar alterações',
      'conta.saving': 'Salvando...',
      'conta.profileSaved': 'Dados atualizados!',
      'conta.formCep': 'CEP',
      'conta.formStreet': 'Rua',
      'conta.formNumber': 'Número',
      'conta.formComplement': 'Complemento',
      'conta.formDistrict': 'Bairro',
      'conta.formCity': 'Cidade',
      'conta.formState': 'UF',
      'nav.whereBuy': 'Onde comprar',
      'nav.langEn': 'EN',
      'nav.langPt': 'PT',
      'pay.pix': 'PIX',
      'pay.pixHint': 'Confirmação automática · QR Code na hora',
      'pay.cardBr': 'Cartão de crédito',
      'pay.cardBrHint': 'Pagamento seguro via Asaas',
      'pay.cardBrHintMp': 'Pagamento seguro via Mercado Pago',
      'pay.intlCard': 'Cartão internacional',
      'pay.intlCardHint': 'Visa, Mastercard, Amex — valor em R$, seu banco converte',
      'pay.paypal': 'PayPal',
      'pay.paypalHint': 'Cartão, débito ou saldo PayPal',
      'pay.pixIntl': 'PIX',
      'pay.pixIntlHint': 'Para quem tem conta bancária no Brasil (mesmo morando fora)',
      'pay.noticeBr': 'Após o pagamento, a confirmação é automática no site e por e-mail.',
      'pay.noticeIntl': 'Valores em reais (BRL). Cartão internacional pelo Mercado Pago — como na Amazon, seu banco converte a moeda.',
      'pay.noticeIntlAll': 'Valores em reais (BRL). Cartão internacional (Mercado Pago) — seu banco converte. PayPal ou PIX também disponíveis.',
      'pay.noticeIntlNoPaypal': 'Valores em reais (BRL). Cartão internacional (Visa/Mastercard) — seu banco converte. PIX se tiver conta no Brasil.',
      'btn.continue': 'Continuar',
      'btn.back': 'Voltar',
      'btn.pay': 'Finalizar pedido',
      'btn.processing': 'Processando...',
      'btn.copyPix': 'Copiar PIX',
      'btn.openCard': 'Abrir pagamento com cartão',
      'btn.payPaypal': 'Pagar com PayPal',
      'card.asaas': 'Pagamento seguro processado pelo Asaas.',
      'card.mp': 'Pagamento seguro no Mercado Pago (Visa, Mastercard, Amex). Valor em reais — seu banco converte.',
      'paypal.redirect': 'Redirecionando ao PayPal… Se não abrir, use o botão abaixo.',
      'confirm.hint': 'A confirmação é enviada automaticamente por e-mail.',
      'store.priceSuffix': 'PIX e cartão',
      'store.intlSuffix': 'Cartão internacional · Envio para o exterior',
      'store.title': 'Loja Oficial',
      'store.loading': 'Carregando produtos...',
      'store.empty': 'Nenhum produto disponível no momento.',
      'store.added': 'Adicionado ao carrinho!',
      'store.addedName': '{name} adicionado ao carrinho!',
      'store.errorLoad': 'Erro ao carregar a loja.',
      'store.frete': 'frete',
      'store.freteLine': '+ Frete: Mini Envios todo Brasil e Uber até 5 km',
      'store.lojaFreteShort': '+ frete',
      'store.lojaPriceSuffix': 'Mini Envios · PIX e cartão',
      'store.add': 'Adicionar',
      'store.buy': 'Comprar',
      'store.alsoOn': 'Também no Mercado Livre, Shopee e Amazon',
      'alert.mpFail': 'Pagamento com cartão não foi concluído. Tente novamente.',
      'alert.intlCardUnavailable': 'Cartão internacional indisponível. Escolha PIX ou tente mais tarde.',
      'alert.paypalUnavailable': 'PayPal indisponível no momento. Tente novamente ou fale conosco no WhatsApp.',
      'alert.paypalCancel': 'Pagamento PayPal cancelado. Você pode retomar pelo link no e-mail ou criar um novo pedido.',
      'alert.cartEmpty': 'Seu carrinho está vazio.',
      'alert.required': 'Preencha todos os campos obrigatórios.',
      'alert.cpf': 'Informe o CPF.',
      'alert.watch': 'Selecione o modelo do smartwatch.',
      'alert.watchNotes': 'Informe o modelo do smartwatch nas observações.',
      'alert.password': 'Crie uma senha com pelo menos 6 caracteres ou desmarque "Criar conta".',
      'alert.shippingWait': 'Aguarde o cálculo do frete e escolha uma opção de envio.',
      'alert.shippingPick': 'Selecione uma opção de frete.',
      'alert.addrBr': 'Preencha o endereço brasileiro completo.',
      'alert.addrIntl': 'Preencha o endereço internacional.',
      'alert.pixIntlCpf': 'Para pagar com PIX no exterior, informe seu CPF (conta bancária no Brasil).',
      'alert.orderError': 'Erro ao processar pedido.',
      'alert.orderInvalid': 'Resposta inválida da API ao registrar pedido.',
      'alert.paypalConfirmFail': 'Falha ao confirmar PayPal.',
      'alert.paypalConfirmError': 'Erro ao confirmar PayPal.',
      'alert.cardBrUnavailable': 'Pagamento com cartão indisponível no momento. Escolha PIX ou tente mais tarde.',
      'status.redirectMp': 'Redirecionando ao pagamento com cartão…',
      'status.confirmMp': 'Confirmando pagamento com cartão…',
      'status.pendingMp': 'Pagamento em análise — esta página atualiza automaticamente.',
      'status.redirectPaypal': 'Redirecionando ao PayPal…',
      'status.confirmPaypal': 'Confirmando pagamento PayPal…',
      'status.waitPaypal': 'Aguardando confirmação do PayPal…',
      'status.paypalOk': 'Pagamento PayPal confirmado! Você receberá a confirmação por e-mail.',
      'status.paid': 'Pagamento confirmado! Você receberá a confirmação por e-mail em instantes.',
      'status.paidAlready': 'Pagamento já confirmado! Você receberá os detalhes por e-mail.',
      'status.waitPix': 'Aguardando confirmação automática do PIX...',
      'status.waitPixManual': 'Escaneie o QR Code ou copie o PIX abaixo. Esta página atualiza quando o pagamento for confirmado.',
      'status.pixRegistered': 'Pedido {id} registrado!',
      'status.pixManualHint': 'O PIX é na conta da loja — a confirmação é manual (não automática).',
      'status.pixWhatsapp': 'Enviar comprovante no WhatsApp',
      'status.pixWhatsappText': 'Olá! Paguei o PIX do pedido {id} ({total}). Segue o comprovante.',
      'status.cardWindow': 'Abra a janela de pagamento, conclua com cartão e volte aqui — a confirmação é automática.',
      'status.cardLink': 'Abra o link do cartão e volte aqui — a confirmação é automática.',
      'status.cardMpLink': 'Conclua o pagamento com cartão no Mercado Pago.',
      'status.paypalBtn': 'Conclua o pagamento no PayPal — use o botão abaixo se necessário.',
      'title.orderCard': 'Pedido registrado — pagamento com cartão',
      'title.orderPaypal': 'Pedido registrado — pagamento PayPal',
      'title.orderRegistered': 'Pedido registrado!',
      'title.paid': 'Pagamento confirmado!',
      'title.mpReceived': 'Pagamento recebido',
      'title.mpProcessing': 'Pagamento em processamento',
      'hint.mpReturn': 'Você será redirecionado ao Mercado Pago. A confirmação é automática ao voltar.',
      'hint.paypalReturn': 'Após pagar no PayPal, você voltará aqui com a confirmação automática.',
      'shipping.hint': 'Informe o destino para calcular o frete.',
      'shipping.calculating': 'Calculando frete...',
      'shipping.none': 'Nenhuma opção de frete disponível para este destino.',
      'shipping.error': 'Erro ao calcular frete.',
      'shipping.cepInvalid': 'CEP inválido.',
      'shipping.days': 'dias',
      'shipping.minutes': 'min',
      'shipping.document': 'documento/carta',
      'shipping.sourceCorreios': 'Correios',
      'shipping.sourceUber': 'Uber Direct',
      'shipping.sourceMotoboy': 'Envio particular',
      'shipping.motoboyEta': 'até {hours}h',
      'shipping.sourceExport': 'Correios Exporta Fácil',
      'shipping.sourceConfig': 'Tabela fallback do admin — API falhou!',
      'shipping.sourceConfigShort': 'tabela admin (fallback)',
      'shipping.sourceEstimate': 'Estimativa fixa no código — configure CORREIOS_USER no Worker',
      'shipping.sourceEstimateShort': 'estimativa',
      'shipping.uberTest': 'Modo teste Uber — valor simbólico (ex. R$ 0,01), sem entrega real. Em produção o frete será o preço real.',
      'shipping.intlPrefix': 'Internacional —',
      'status.pixManualConfirm': 'Esta página atualiza quando a loja confirmar o pagamento.',
      'shipping.optionsAria': 'Opções de frete',
      'country.other': 'Outro país',
      'country.unsupported': 'País não atendido',
      'watch.otherModel': 'Outro modelo (informar nas observações)',
      'watch.groupOtherBrands': 'Outras marcas',
      'watch.groupOthers': 'Outros',
      'page.checkoutTitle': 'Comprar Direto | Sensor Tattoo Fix — Loja Oficial',
      'page.checkoutDesc': 'Checkout oficial Sensor Tattoo Fix — PIX, cartão, envio nacional e internacional.',
      'page.checkoutTitleEn': 'Checkout | Sensor Tattoo Fix — Official Store',
      'page.checkoutDescEn': 'Official Sensor Tattoo Fix checkout — international cards, PIX, worldwide shipping.'
    },
    en: {
      'brand.tagline': 'Peace between silicon and ink',
      'nav.cart': 'Cart',
      'nav.back': 'Back',
      'nav.home': 'Home',
      'nav.myOrders': 'My orders',
      'nav.logout': 'Log out',
      'nav.login': 'Log in',
      'nav.accountMenu': 'Account menu',
      'nav.guest': 'Customer',
      'cart.title': 'Your cart',
      'cart.empty': 'Cart is empty',
      'cart.addMore': 'Add more products',
      'cart.qty': 'Quantity',
      'cart.decrease': 'Decrease',
      'cart.increase': 'Increase',
      'cart.remove': 'Remove',
      'pelicula.upsellTitle': 'Save on shipping',
      'pelicula.upsellHint': 'Accessories compatible with your smartwatch',
      'pelicula.add': 'Add screen protector',
      'pelicula.added': 'Screen protector added to cart!',
      'pelicula.inCart': 'In cart',
      'agregados.upsellTitle': 'Save on shipping',
      'agregados.upsellHint': 'Accessories compatible with your smartwatch',
      'agregados.forYourModel': 'For your {model}',
      'agregados.sectionPelicula': 'Screen protectors',
      'agregados.sectionPulseira': 'Watch bands',
      'agregados.descPelicula': 'Protects your smartwatch screen from scratches',
      'agregados.descPulseira': 'Comfort and style in the same shipment',
      'agregados.zoomImage': 'View larger product photo',
      'agregados.zoomClose': 'Close',
      'pulseira.add': 'Add band',
      'pulseira.added': 'Band added to cart!',
      'pulseira.inCart': 'In cart',
      'summary.subtotal': 'Subtotal',
      'summary.shipping': 'Shipping',
      'summary.shippingIntl': 'International shipping',
      'summary.total': 'Total',
      'summary.order': 'Order',
      'summary.totalLabel': 'Total:',
      'trust.pix': 'Instant PIX',
      'trust.card': 'Card',
      'trust.email': 'Email confirmation',
      'step.data': 'Details',
      'step.payment': 'Payment',
      'step.confirm': 'Confirmation',
      'section.yourData': 'Your details',
      'section.shippingDest': 'Shipping destination',
      'section.chooseShipping': 'Choose shipping',
      'pay.title': 'Payment method',
      'form.fullName': 'Full name',
      'form.email': 'Email',
      'form.whatsapp': 'WhatsApp',
      'form.cpf': 'CPF (Brazilian tax ID)',
      'form.docOptional': 'ID document (optional)',
      'form.watchModel': 'Smartwatch model',
      'form.watchHint': 'The kit is made for your watch — pick your model before continuing.',
      'form.watchSelect': 'Select your model',
      'form.sensorMeasureHint': 'Measure the sensor circle on the back of your watch (mm) to pick the right lens.',
      'form.sensorMismatch': 'Note: this watch usually has a {watch} mm sensor and your cart lens is {lens} mm. Double-check with a ruler.',
      'form.notesOptional': 'Notes (optional)',
      'form.notesRequired': 'Notes',
      'form.notesPhOptional': 'E.g. delivery instructions or order details',
      'form.notesPhRequired': 'Enter your smartwatch brand and model',
      'form.notesPhDefault': 'E.g. watch brand/model, band color, delivery instructions…',
      'form.country': 'Country',
      'form.cep': 'Postal code',
      'form.street': 'Street',
      'form.number': 'Number',
      'form.complement': 'Apt / suite',
      'form.district': 'District',
      'form.city': 'City',
      'form.state': 'State',
      'form.postal': 'Postal / ZIP code',
      'form.streetIntl': 'Street address',
      'form.stateIntl': 'State / Province',
      'form.stateIntlPh': 'Optional',
      'form.streetIntlPh': 'Main Street',
      'form.numberIntlPh': '78',
      'form.phonePh': '+1 555 000 0000',
      'account.logged': 'Hello, {name} — you are signed in.',
      'account.ordersAt': 'Your orders are in',
      'account.myAccount': 'My Account',
      'account.tabRegister': 'Create account',
      'account.tabLogin': 'I have an account',
      'account.createCheck': 'Create an account to track orders (recommended)',
      'account.checkoutTitle': 'Account (optional)',
      'account.password': 'Account password (min. 6 characters)',
      'account.passwordPh': 'Create your password',
      'account.showPassword': 'Show password',
      'account.hidePassword': 'Hide password',
      'account.loginHint': 'Sign in to fill in your details automatically.',
      'account.loginEmail': 'Account email',
      'account.loginEmailPh': 'you@email.com',
      'account.loginPasswordPh': 'Your password',
      'account.passwordShort': 'Password',
      'account.loginBtn': 'Sign in',
      'account.loginEntering': 'Signing in...',
      'account.loginOk': 'Signed in!',
      'account.loginNeedCreds': 'Enter email and password.',
      'account.loginUnavailable': 'Sign-in unavailable. Try My Account.',
      'account.loginFail': 'Could not sign in.',
      'conta.title': 'My Account',
      'conta.pageTitle': 'My Account | Sensor TattooFix',
      'conta.intro': 'Sign in to see your orders or create an account for faster checkout.',
      'conta.tabLogin': 'Sign in',
      'conta.tabRegister': 'Create account',
      'conta.email': 'Email',
      'conta.password': 'Password',
      'conta.fullName': 'Full name',
      'conta.whatsapp': 'WhatsApp',
      'conta.cpf': 'CPF',
      'conta.passwordRegister': 'Password (min. 6 characters)',
      'conta.btnLogin': 'Sign in',
      'conta.btnRegister': 'Create account',
      'conta.btnLogout': 'Sign out',
      'conta.hello': 'Hello, {name}',
      'conta.ordersMeta': 'Your orders at the Official Store',
      'conta.buyMore': 'Shop more',
      'conta.noOrders': 'No orders yet.',
      'conta.goShop': 'Go to store',
      'conta.statusPaid': 'Paid',
      'conta.statusPending': 'Awaiting payment',
      'conta.continuePay': 'Continue payment',
      'conta.entering': 'Signing in...',
      'conta.creating': 'Creating account...',
      'conta.created': 'Account created!',
      'conta.passwordMinErr': 'Password must be at least 6 characters.',
      'conta.watch': 'Watch',
      'conta.total': 'Total',
      'conta.tabOrders': 'My orders',
      'conta.tabProfile': 'My details',
      'conta.profileIntro': 'Update your details for checkout and order notifications. Email cannot be changed here.',
      'conta.sectionPersonal': 'Personal details',
      'conta.sectionAddress': 'Default address (Brazil)',
      'conta.addressHint': 'Used to pre-fill checkout automatically.',
      'conta.sectionPassword': 'Change password',
      'conta.passwordHint': 'Leave blank if you do not want to change your password.',
      'conta.currentPassword': 'Current password',
      'conta.newPassword': 'New password',
      'conta.btnSaveProfile': 'Save changes',
      'conta.saving': 'Saving...',
      'conta.profileSaved': 'Details updated!',
      'conta.formCep': 'Postal code',
      'conta.formStreet': 'Street',
      'conta.formNumber': 'Number',
      'conta.formComplement': 'Complement',
      'conta.formDistrict': 'District',
      'conta.formCity': 'City',
      'conta.formState': 'State',
      'nav.whereBuy': 'Where to buy',
      'nav.langEn': 'EN',
      'nav.langPt': 'PT',
      'pay.pix': 'PIX',
      'pay.pixHint': 'Instant confirmation · QR code',
      'pay.cardBr': 'Credit card',
      'pay.cardBrHint': 'Secure payment via Asaas',
      'pay.cardBrHintMp': 'Secure payment via Mercado Pago',
      'pay.intlCard': 'International card',
      'pay.intlCardHint': 'Visa, Mastercard, Amex — charged in BRL; your bank converts',
      'pay.paypal': 'PayPal',
      'pay.paypalHint': 'Card, debit or PayPal balance',
      'pay.pixIntl': 'PIX',
      'pay.pixIntlHint': 'If you have a Brazilian bank account (even abroad)',
      'pay.noticeBr': 'After payment, confirmation is automatic on this page and by email.',
      'pay.noticeIntl': 'Prices in Brazilian reais (BRL). International card via Mercado Pago — like Amazon, your bank converts currency.',
      'pay.noticeIntlAll': 'Prices in BRL. International card (Mercado Pago) — your bank converts. PayPal or PIX also available.',
      'pay.noticeIntlNoPaypal': 'Prices in BRL. International card (Visa/Mastercard) — your bank converts. PIX if you have a BR bank account.',
      'btn.continue': 'Continue',
      'btn.back': 'Back',
      'btn.pay': 'Place order',
      'btn.processing': 'Processing...',
      'btn.copyPix': 'Copy PIX code',
      'btn.openCard': 'Open card payment',
      'btn.payPaypal': 'Pay with PayPal',
      'card.asaas': 'Secure payment processed by Asaas.',
      'card.mp': 'Secure payment on Mercado Pago (Visa, Mastercard, Amex). BRL amount — your bank converts.',
      'paypal.redirect': 'Redirecting to PayPal… If nothing opens, use the button below.',
      'confirm.hint': 'Confirmation is sent automatically by email.',
      'store.priceSuffix': 'PIX & card',
      'store.intlSuffix': 'International cards · Worldwide shipping',
      'store.title': 'Official Store',
      'store.loading': 'Loading products...',
      'store.empty': 'No products available at the moment.',
      'store.added': 'Added to cart!',
      'store.addedName': '{name} added to cart!',
      'store.errorLoad': 'Error loading store.',
      'store.frete': 'shipping',
      'store.freteLine': '+ Shipping: Mini Envios nationwide & Uber within 5 km',
      'store.lojaFreteShort': '+ shipping',
      'store.lojaPriceSuffix': 'Mini Envios · Cards & PIX',
      'store.add': 'Add',
      'store.buy': 'Buy',
      'store.alsoOn': 'Also on Mercado Libre, Shopee and Amazon',
      'alert.mpFail': 'Card payment was not completed. Please try again.',
      'alert.intlCardUnavailable': 'International card unavailable. Choose PIX or try again later.',
      'alert.paypalUnavailable': 'PayPal unavailable right now. Try again or contact us on WhatsApp.',
      'alert.paypalCancel': 'PayPal payment cancelled. Resume from the email link or place a new order.',
      'alert.cartEmpty': 'Your cart is empty.',
      'alert.required': 'Please fill in all required fields.',
      'alert.cpf': 'Please enter your CPF.',
      'alert.watch': 'Please select your smartwatch model.',
      'alert.watchNotes': 'Enter your smartwatch model in the notes field.',
      'alert.password': 'Create a password with at least 6 characters or uncheck "Create account".',
      'alert.shippingWait': 'Wait for shipping quotes and choose an option.',
      'alert.shippingPick': 'Select a shipping option.',
      'alert.addrBr': 'Please complete the Brazilian address.',
      'alert.addrIntl': 'Please complete the international address.',
      'alert.pixIntlCpf': 'To pay with PIX abroad, enter your CPF (Brazilian bank account).',
      'alert.orderError': 'Error processing order.',
      'alert.orderInvalid': 'Invalid response when creating order.',
      'alert.paypalConfirmFail': 'Failed to confirm PayPal payment.',
      'alert.paypalConfirmError': 'Error confirming PayPal payment.',
      'alert.cardBrUnavailable': 'Card payment unavailable. Choose PIX or try again later.',
      'status.redirectMp': 'Redirecting to card payment…',
      'status.confirmMp': 'Confirming card payment…',
      'status.pendingMp': 'Payment under review — this page updates automatically.',
      'status.redirectPaypal': 'Redirecting to PayPal…',
      'status.confirmPaypal': 'Confirming PayPal payment…',
      'status.waitPaypal': 'Waiting for PayPal confirmation…',
      'status.paypalOk': 'PayPal payment confirmed! You will receive an email shortly.',
      'status.paid': 'Payment confirmed! You will receive an email shortly.',
      'status.paidAlready': 'Payment already confirmed! Details will be sent by email.',
      'status.waitPix': 'Waiting for automatic PIX confirmation...',
      'status.waitPixManual': 'Scan the QR code or copy the PIX below. This page updates when payment is confirmed.',
      'status.pixRegistered': 'Order {id} placed!',
      'status.pixManualHint': 'PIX is paid to the shop account — confirmation is manual.',
      'status.pixWhatsapp': 'Send proof on WhatsApp',
      'status.pixWhatsappText': 'Hi! I paid PIX for order {id} ({total}). Proof attached.',
      'status.cardWindow': 'Open the payment window, complete with card and return here — confirmation is automatic.',
      'status.cardLink': 'Open the card link and return here — confirmation is automatic.',
      'status.cardMpLink': 'Complete card payment on Mercado Pago.',
      'status.paypalBtn': 'Complete payment on PayPal — use the button below if needed.',
      'title.orderCard': 'Order placed — card payment',
      'title.orderPaypal': 'Order placed — PayPal payment',
      'title.orderRegistered': 'Order placed!',
      'title.paid': 'Payment confirmed!',
      'title.mpReceived': 'Payment received',
      'title.mpProcessing': 'Payment processing',
      'hint.mpReturn': 'You will be redirected to Mercado Pago. Confirmation is automatic when you return.',
      'hint.paypalReturn': 'After paying on PayPal, you will return here with automatic confirmation.',
      'shipping.hint': 'Enter destination to calculate shipping.',
      'shipping.calculating': 'Calculating shipping...',
      'shipping.none': 'No shipping options for this destination.',
      'shipping.error': 'Error calculating shipping.',
      'shipping.cepInvalid': 'Invalid postal code.',
      'shipping.days': 'days',
      'shipping.minutes': 'min',
      'shipping.document': 'document/letter',
      'shipping.sourceCorreios': 'Correios',
      'shipping.sourceUber': 'Uber Direct',
      'shipping.sourceMotoboy': 'Private courier',
      'shipping.motoboyEta': 'within {hours}h',
      'shipping.sourceExport': 'Correios Exporta Fácil',
      'shipping.sourceConfig': 'Admin fallback table — API failed!',
      'shipping.sourceConfigShort': 'admin fallback table',
      'shipping.sourceEstimate': 'Fixed estimate — configure CORREIOS_USER on Worker',
      'shipping.sourceEstimateShort': 'estimate',
      'shipping.uberTest': 'Uber test mode — symbolic price (e.g. R$ 0.01), no real delivery. Production shows the real fare.',
      'shipping.intlPrefix': 'International —',
      'status.pixManualConfirm': 'This page updates when the shop confirms payment.',
      'shipping.optionsAria': 'Shipping options',
      'country.other': 'Other country',
      'country.unsupported': 'Country not supported',
      'watch.otherModel': 'Other model (specify in notes)',
      'watch.groupOtherBrands': 'Other brands',
      'watch.groupOthers': 'Others',
      'page.checkoutTitle': 'Comprar Direto | Sensor Tattoo Fix — Loja Oficial',
      'page.checkoutDesc': 'Checkout oficial Sensor Tattoo Fix — PIX, cartão, envio nacional e internacional.',
      'page.checkoutTitleEn': 'Checkout | Sensor Tattoo Fix — Official Store',
      'page.checkoutDescEn': 'Official Sensor Tattoo Fix checkout — international cards, PIX, worldwide shipping.'
    }
  };

  function getLang() {
    try {
      const q = new URLSearchParams(location.search).get('lang');
      if (q === 'en' || q === 'pt') return q;
    } catch (e) { /* ignore */ }
    return location.pathname.includes('/en/') ? 'en' : 'pt';
  }

  function isEn() {
    return getLang() === 'en';
  }

  function setLang(lang) {
    const l = lang === 'en' ? 'en' : 'pt';
    try { sessionStorage.setItem('stf_lang', l); } catch (e) { /* ignore */ }
    document.documentElement.lang = l === 'en' ? 'en' : 'pt-BR';
    return l;
  }

  function t(key, vars) {
    const lang = getLang();
    let s = STRINGS[lang]?.[key] ?? STRINGS.pt[key] ?? key;
    if (vars) {
      Object.entries(vars).forEach(([k, v]) => {
        s = s.replace(new RegExp(`\\{${k}\\}`, 'g'), v);
      });
    }
    return s;
  }

  function setLabelText(label, key, forceRequired) {
    if (!label) return;
    const input = label.querySelector('input,select,textarea,button');
    const required = forceRequired || label.dataset.i18nRequired === '1' || !!label.querySelector('[required]');
    const suffix = required ? ' *' : '';
    const text = t(key) + suffix;
    if (input) {
      while (label.firstChild && label.firstChild !== input) {
        label.removeChild(label.firstChild);
      }
      label.insertBefore(document.createTextNode(text), input);
    } else {
      label.textContent = text;
    }
  }

  function fieldLabelText(key, required) {
    return t(key) + (required ? ' *' : '');
  }

  /** Labels dentro do campo (placeholder) — PT e EN */
  function applyCheckoutFormPlaceholders() {
    document.querySelectorAll('[data-i18n-label]').forEach((label) => {
      const key = label.dataset.i18nLabel;
      if (!key) return;
      const control = label.querySelector('input,select,textarea');
      if (!control) return;
      const required = label.dataset.i18nRequired === '1' || !!control.required;
      const text = fieldLabelText(key, required);
      label.classList.add('checkout-infield');
      while (label.firstChild && label.firstChild !== control) {
        label.removeChild(label.firstChild);
      }
      if (control.tagName === 'SELECT') {
        const placeholderOpt = control.querySelector('option[value=""]');
        if (placeholderOpt) placeholderOpt.textContent = text;
        control.setAttribute('aria-label', text);
      } else {
        control.placeholder = text;
        control.setAttribute('aria-label', text);
      }
    });

    applyText('#senha-label-text', 'account.password');
    setPlaceholder('#checkout-senha', 'account.passwordPh');
    document.querySelectorAll('.checkout-account-block .checkout-field-label').forEach((el) => {
      const row = el.closest('.checkout-field');
      if (row?.querySelector('#checkout-login-email')) el.textContent = t('account.loginEmail');
      if (row?.querySelector('#checkout-login-senha')) el.textContent = t('account.passwordShort');
    });
    setPlaceholder('#checkout-login-email', 'account.loginEmailPh');
    setPlaceholder('#checkout-login-senha', 'account.loginPasswordPh');
    document.querySelectorAll('.checkout-password-toggle').forEach((btn) => {
      const pressed = btn.getAttribute('aria-pressed') === 'true';
      btn.setAttribute('aria-label', pressed ? t('account.hidePassword') : t('account.showPassword'));
    });
  }

  function setPlaceholder(sel, key) {
    const el = document.querySelector(sel);
    if (el) el.placeholder = t(key);
  }

  function applyText(sel, key) {
    const el = document.querySelector(sel);
    if (el && key) el.textContent = t(key);
  }

  function applyHtml(sel, key, vars) {
    const el = document.querySelector(sel);
    if (el && key) el.innerHTML = t(key, vars);
  }

  function inEnDir() {
    return location.pathname.includes('/en/');
  }

  function assetPrefix() {
    return inEnDir() ? '../' : '';
  }

  function pageHref(page) {
    const en = isEn();
    if (page === 'index') {
      return en ? (inEnDir() ? 'index.html' : 'en/index.html') : 'index.html';
    }
    if (page === 'loja') {
      return en ? (inEnDir() ? 'loja.html' : 'en/loja.html') : 'loja.html';
    }
    if (page === 'comprar') {
      return en ? (inEnDir() ? 'comprar.html' : 'en/comprar.html') : 'comprar.html';
    }
    if (page === 'account') {
      return en ? (inEnDir() ? 'minha-conta.html' : 'en/minha-conta.html') : 'minha-conta.html';
    }
    return page;
  }

  function langQuery() {
    if (inEnDir()) return '';
    return isEn() ? (location.search ? '&lang=en' : '?lang=en') : '';
  }

  function lojaHref() {
    return pageHref('loja');
  }

  function accountHref() {
    return pageHref('account');
  }

  function comprarPageHref() {
    return pageHref('comprar');
  }

  function applyCheckoutDom() {
    applyCheckoutFormPlaceholders();

    if (!isEn()) return;

    document.title = t('page.checkoutTitleEn');
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) metaDesc.content = t('page.checkoutDescEn');

    applyText('.logo-tagline', 'brand.tagline');

    const cartLink = document.querySelector('.cart-nav-link');
    if (cartLink) {
      const badge = cartLink.querySelector('[data-cart-badge]');
      cartLink.href = comprarPageHref();
      cartLink.innerHTML = `<i class="fas fa-shopping-cart"></i> ${t('nav.cart')} `;
      if (badge) cartLink.appendChild(badge);
    }
    const addMore = document.querySelector('.cart-add-more');
    if (addMore) addMore.href = lojaHref();
    const backLink = document.querySelector('.checkout-nav a[href*="index"]');
    if (backLink) {
      backLink.href = pageHref('index');
      backLink.innerHTML = `<i class="fas fa-arrow-left"></i> ${t('nav.back')}`;
    }

    const cartTitle = document.querySelector('.cart-sidebar-title');
    if (cartTitle) cartTitle.innerHTML = `<i class="fas fa-shopping-cart"></i> ${t('cart.title')}`;
    applyText('.cart-add-more', 'cart.addMore');
    applyText('.checkout-summary .summary-row:nth-child(1) > span:first-child', 'summary.subtotal');
    applyText('.checkout-summary .summary-row.total > span:first-child', 'summary.total');
    applyText('#summary-shipping-label', 'summary.shipping');

    const trust = document.querySelectorAll('.checkout-trust span');
    if (trust[0]) trust[0].innerHTML = `<i class="fas fa-qrcode"></i> ${t('trust.pix')}`;
    if (trust[1]) trust[1].innerHTML = `<i class="fas fa-credit-card"></i> ${t('trust.card')}`;
    if (trust[2]) trust[2].innerHTML = `<i class="fas fa-envelope"></i> ${t('trust.email')}`;

    const stepLabels = { 1: 'step.data', 2: 'step.payment', 3: 'step.confirm' };
    document.querySelectorAll('.step-indicator[data-step]').forEach((ind) => {
      const n = ind.dataset.step;
      const key = stepLabels[n];
      if (!key) return;
      const num = ind.querySelector('span')?.textContent || n;
      ind.innerHTML = `<span>${num}</span> ${t(key)}`;
    });

    applyText('.checkout-step[data-step="1"] .checkout-step-head h3', 'section.yourData');
    applyText('.checkout-step[data-step="1"] > h3', 'section.shippingDest');
    applyText('#smartwatch-hint', 'form.watchHint');
    applyText('#sensor-measure-hint', 'form.sensorMeasureHint');
    applyText('.checkout-account-title', 'account.checkoutTitle');
    applyText('.shipping-options-title', 'section.chooseShipping');
    applyText('.checkout-step[data-step="2"] h3', 'pay.title');

    const loggedP = document.querySelector('#account-logged-wrap > p:first-child');
    if (loggedP) {
      const name = document.getElementById('account-logged-name')?.textContent || t('nav.guest');
      loggedP.innerHTML = `<i class="fas fa-user-check"></i> ${t('account.logged', { name: `<strong id="account-logged-name">${name}</strong>` })}`;
    }
    const ordersHint = document.querySelector('#account-logged-wrap .checkout-hint');
    if (ordersHint) {
      ordersHint.innerHTML = `${t('account.ordersAt')} <a href="${accountHref()}">${t('account.myAccount')}</a>.`;
    }

    document.querySelectorAll('[data-checkout-account-tab]').forEach((btn) => {
      const mode = btn.getAttribute('data-checkout-account-tab');
      btn.textContent = mode === 'login' ? t('account.tabLogin') : t('account.tabRegister');
    });
    applyText('#checkout-account-register .account-check span', 'account.createCheck');
    applyText('#checkout-account-login .checkout-hint', 'account.loginHint');
    const loginBtn = document.getElementById('btn-checkout-login');
    if (loginBtn) loginBtn.innerHTML = `<i class="fas fa-sign-in-alt"></i> ${t('account.loginBtn')}`;

    setPlaceholder('[name="telefone"]', 'form.whatsapp');
    setPlaceholder('#rua-intl', 'form.streetIntlPh');
    setPlaceholder('#numero-intl', 'form.numberIntlPh');
    setPlaceholder('#uf-intl', 'form.stateIntlPh');
    setPlaceholder('#observacoes', 'form.notesPhDefault');

    const watchSelect = document.getElementById('smartwatch-select');
    if (watchSelect?.options[0]) watchSelect.options[0].textContent = t('form.watchSelect');

    const payBr = document.querySelector('#payment-options-br .payment-option:nth-child(1)');
    if (payBr) {
      payBr.querySelector('strong').textContent = t('pay.pix');
      payBr.querySelector('small').textContent = t('pay.pixHint');
    }
    const payBrCard = document.querySelector('#payment-options-br .payment-option:nth-child(2)');
    if (payBrCard) {
      payBrCard.querySelector('strong').textContent = t('pay.cardBr');
      payBrCard.querySelector('small').textContent = t('pay.cardBrHint');
    }
    const intlCard = document.querySelector('.payment-option-intl-card');
    if (intlCard) {
      intlCard.querySelector('strong').textContent = t('pay.intlCard');
      intlCard.querySelector('small').textContent = t('pay.intlCardHint');
    }
    const intlPaypal = document.querySelector('.payment-option-paypal');
    if (intlPaypal) {
      intlPaypal.querySelector('strong').textContent = t('pay.paypal');
      intlPaypal.querySelector('small').textContent = t('pay.paypalHint');
    }
    const intlPix = document.querySelector('#payment-options-intl .payment-option:last-child');
    if (intlPix) {
      intlPix.querySelector('strong').textContent = t('pay.pixIntl');
      intlPix.querySelector('small').textContent = t('pay.pixIntlHint');
    }

    const noticeBr = document.getElementById('payment-notice-br');
    if (noticeBr) noticeBr.innerHTML = `<i class="fas fa-info-circle"></i> ${t('pay.noticeBr')}`;
    const noticeIntl = document.getElementById('payment-notice-intl');
    if (noticeIntl) noticeIntl.innerHTML = `<i class="fas fa-info-circle"></i> ${t('pay.noticeIntl')}`;

    const orderLabel = document.querySelector('.pix-amount-label');
    if (orderLabel) orderLabel.childNodes[0].textContent = t('summary.totalLabel') + ' ';
    const orderP = document.querySelector('#payment-panel > p');
    if (orderP && orderP.querySelector('#order-id')) {
      orderP.childNodes[0].textContent = t('summary.order') + ' ';
    }

    applyText('#btn-next .btn-checkout-label', 'btn.continue');
    applyText('#btn-back .btn-checkout-label', 'btn.back');
    applyText('#btn-pay .btn-checkout-label', 'btn.pay');
    applyText('#btn-copy-pix', 'btn.copyPix');
    applyText('#card-pay-link', 'btn.openCard');
    applyText('#paypal-pay-link', 'btn.payPaypal');
    applyText('#confirm-title', 'title.orderRegistered');
    applyText('#confirm-hint', 'confirm.hint');
    applyText('#shipping-hint', 'shipping.hint');
    applyText('#paypal-ui .card-pay-text', 'paypal.redirect');

    const shippingOpts = document.getElementById('shipping-options');
    if (shippingOpts) shippingOpts.setAttribute('aria-label', t('shipping.optionsAria'));

    const footer = document.querySelector('[data-site-footer]');
    if (footer) footer.dataset.lang = 'en';
  }

  function applyLojaDom() {
    if (!isEn()) return;
    document.title = t('store.title') + ' | Sensor Tattoo Fix';
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      metaDesc.content = 'Buy the Sensor Tattoo Fix kit — optical lens for smartwatch on tattooed skin. International cards, worldwide shipping.';
    }
    applyText('.logo-tagline', 'brand.tagline');
    applyText('h1.section-title', 'store.title');
    applyText('.loja-intro-alt a', 'store.alsoOn');
    const intro = document.querySelector('.loja-intro[data-store-price-tag]');
    if (intro) {
      intro.setAttribute('data-store-price-frete-line', t('store.lojaFreteShort'));
      intro.setAttribute('data-store-price-suffix', t('store.lojaPriceSuffix'));
    }
    const cartLink = document.querySelector('.cart-nav-link');
    if (cartLink) {
      const badge = cartLink.querySelector('[data-cart-badge]');
      cartLink.href = comprarPageHref();
      cartLink.innerHTML = `<i class="fas fa-shopping-cart"></i> ${t('nav.cart')} `;
      if (badge) cartLink.appendChild(badge);
    }
    const footer = document.querySelector('[data-site-footer]');
    if (footer) footer.dataset.lang = 'en';
    const back = document.querySelector('.nav-links a[href*="index"]');
    if (back) {
      back.href = pageHref('index');
      back.innerHTML = `<i class="fas fa-arrow-left"></i> ${t('nav.home')}`;
    }
    const introAlt = document.querySelector('.loja-intro-alt a');
    if (introAlt) introAlt.href = pageHref('index') + '#onde-comprar';
    const grid = document.getElementById('loja-grid');
    if (grid?.querySelector('.fa-spinner')) {
      grid.innerHTML = `<p class="conta-empty"><i class="fas fa-spinner fa-spin"></i> ${t('store.loading')}</p>`;
    }
  }

  function applyContaDom() {
    if (!isEn()) return;

    document.title = t('conta.pageTitle');
    applyText('.logo-tagline', 'brand.tagline');

    const whereBuy = document.querySelector('.checkout-nav a[href*="onde-comprar"], .checkout-nav a[href*="index"]');
    if (whereBuy && whereBuy.getAttribute('href')?.includes('onde-comprar')) {
      whereBuy.innerHTML = `<i class="fas fa-shopping-bag"></i> ${t('nav.whereBuy')}`;
      whereBuy.href = pageHref('index') + '#onde-comprar';
    }
    const home = document.querySelector('.checkout-nav a[href*="index"]:not([href*="#"])');
    if (home) {
      home.href = pageHref('index');
      home.innerHTML = `<i class="fas fa-arrow-left"></i> ${t('nav.home')}`;
    }

    const h1 = document.querySelector('#conta-login h1');
    if (h1) h1.innerHTML = `<i class="fas fa-user"></i> ${t('conta.title')}`;
    applyText('#conta-login .admin-intro', 'conta.intro');

    document.querySelectorAll('[data-conta-tab]').forEach((btn) => {
      const mode = btn.getAttribute('data-conta-tab');
      btn.textContent = mode === 'login' ? t('conta.tabLogin') : t('conta.tabRegister');
    });

    const loginForm = document.getElementById('conta-login-form');
    if (loginForm) {
      setLabelText(loginForm.querySelector('label:has([name="email"])'), 'conta.email');
      setLabelText(loginForm.querySelector('label:has([name="password"])'), 'conta.password');
      const btn = loginForm.querySelector('button[type="submit"]');
      if (btn) btn.textContent = t('conta.btnLogin');
    }

    const regForm = document.getElementById('conta-register-form');
    if (regForm) {
      setLabelText(regForm.querySelector('label:has([name="nome"])'), 'conta.fullName', true);
      setLabelText(regForm.querySelector('label:has([name="email"])'), 'conta.email', true);
      setLabelText(regForm.querySelector('label:has([name="telefone"])'), 'conta.whatsapp', true);
      setLabelText(regForm.querySelector('label:has([name="cpf"])'), 'conta.cpf', true);
      setLabelText(regForm.querySelector('label:has([name="password"])'), 'conta.passwordRegister', true);
      const btn = regForm.querySelector('button[type="submit"]');
      if (btn) btn.textContent = t('conta.btnRegister');
    }

    const logoutBtn = document.getElementById('conta-logout');
    if (logoutBtn) logoutBtn.textContent = t('conta.btnLogout');
    applyText('#conta-panel .admin-meta', 'conta.ordersMeta');

    document.querySelectorAll('[data-conta-panel-tab]').forEach((btn) => {
      const mode = btn.getAttribute('data-conta-panel-tab');
      btn.textContent = mode === 'orders' ? t('conta.tabOrders') : t('conta.tabProfile');
    });

    applyText('#conta-panel-profile > .admin-meta', 'conta.profileIntro');
    const profileForm = document.getElementById('conta-profile-form');
    if (profileForm) {
      const sections = profileForm.querySelectorAll('.conta-form-section');
      if (sections[0]) sections[0].textContent = t('conta.sectionPersonal');
      if (sections[1]) sections[1].textContent = t('conta.sectionAddress');
      if (sections[2]) sections[2].textContent = t('conta.sectionPassword');
      const metaPs = profileForm.querySelectorAll('p.admin-meta');
      if (metaPs[0]) metaPs[0].textContent = t('conta.addressHint');
      if (metaPs[1]) metaPs[1].textContent = t('conta.passwordHint');
      setLabelText(profileForm.querySelector('label:has([name="nome"])'), 'conta.fullName', true);
      setLabelText(profileForm.querySelector('label:has([name="email"])'), 'conta.email');
      setLabelText(profileForm.querySelector('label:has([name="telefone"])'), 'conta.whatsapp', true);
      setLabelText(profileForm.querySelector('label:has([name="cpf"])'), 'conta.cpf');
      setLabelText(profileForm.querySelector('label:has([name="cep"])'), 'conta.formCep');
      setLabelText(profileForm.querySelector('label:has([name="rua"])'), 'conta.formStreet');
      setLabelText(profileForm.querySelector('label:has([name="numero"])'), 'conta.formNumber');
      setLabelText(profileForm.querySelector('label:has([name="complemento"])'), 'conta.formComplement');
      setLabelText(profileForm.querySelector('label:has([name="bairro"])'), 'conta.formDistrict');
      setLabelText(profileForm.querySelector('label:has([name="cidade"])'), 'conta.formCity');
      setLabelText(profileForm.querySelector('label:has([name="uf"])'), 'conta.formState');
      setLabelText(profileForm.querySelector('label:has([name="senhaAtual"])'), 'conta.currentPassword');
      setLabelText(profileForm.querySelector('label:has([name="senhaNova"])'), 'conta.newPassword');
      const saveBtn = profileForm.querySelector('button[type="submit"]');
      if (saveBtn) saveBtn.innerHTML = `<i class="fas fa-save"></i> ${t('conta.btnSaveProfile')}`;
    }

    const buyMore = document.querySelector('#conta-panel .btn-primary[href*="loja"]');
    if (buyMore) {
      buyMore.href = lojaHref();
      buyMore.innerHTML = `<i class="fas fa-store"></i> ${t('conta.buyMore')}`;
    }

    const footer = document.querySelector('[data-site-footer]');
    if (footer) footer.dataset.lang = 'en';
  }

  function init() {
    try {
      const q = new URLSearchParams(location.search).get('lang');
      if (q === 'en' || q === 'pt') setLang(q);
      else setLang(inEnDir() ? 'en' : 'pt');
    } catch (e) {
      setLang(inEnDir() ? 'en' : 'pt');
    }
    if (document.body?.classList.contains('checkout-page')) applyCheckoutDom();
    if (document.body?.classList.contains('loja-page')) applyLojaDom();
    if (document.body?.classList.contains('conta-page')) applyContaDom();
    if (window.STF_ACCOUNT?.initNav) window.STF_ACCOUNT.initNav();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  return {
    t, getLang, isEn, setLang, inEnDir, assetPrefix, pageHref, accountHref, comprarPageHref,
    applyCheckoutDom, applyCheckoutFormPlaceholders, applyLojaDom, applyContaDom,
    langQuery, lojaHref, STRINGS
  };
})();
