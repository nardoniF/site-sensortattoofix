export function buildForumSeedLangPacks({ A, officialReply, iso }) {
  const pt = [
    {
      title: 'Apple Watch pedindo senha sem parar',
      body: 'Tattoo preta bem embaixo do sensor. O Ultra bloqueia a tela, pede a senha de novo e some com as notificações. Já apertei a pulseira até doer e limpei o vidro com álcool. Volta em duas horas.',
      tags: ["apple-watch", "senha", "detecao", "tattoo"],
      author: { ...A['seed-guga'] },
      createdAt: iso(60*52),
      replies: [
        { body: 'Mesma tortura. No caixa o Apple Pay também cai porque ele acha que tirei o relógio.', author: { ...A['seed-kai'] }, createdAt: iso(60*46), ref: 'a1' },
        { body: 'Eu troquei pro braço sem tinta e parou. No braço tatuado continua pedindo senha no meio do expediente.', author: { ...A['seed-dudu'] }, createdAt: iso(60*42), ref: 'a1b', parentRef: 'a1' },
        { body: 'Trocar de braço pra mim não resolveu: os dois têm cobertura na área do sensor.', author: { ...A['seed-bruno'] }, createdAt: iso(60*37), parentRef: 'a1b' },
        { body: 'O Apple Watch usa uma luzinha no fundo pra saber se ainda está no pulso. Tinta densa engole essa luz, ele acha que você tirou e fica pedindo senha — não é bug aleatório.', author: { ...A['seed-chris'] }, createdAt: iso(60*31), ref: 'a1c', parentRef: 'a1' },
        { body: 'Também desativei Desbloquear com iPhone pensando que ajudava. Zero diferença.', author: { ...A['seed-felipe'] }, createdAt: iso(60*24), ref: 'a2' },
        { ...officialReply('Quando a detecção de pulso oscila, o Apple Watch reforça a segurança e pede senha como se tivesse sido removido. O Sensor Tattoo Fix ajuda o sensor a ler melhor nessa região. Acesse nossos canais e adquira nossas lentes.', iso(60*16)), ref: 'a3', parentRef: 'a1c' }
      ]
    },
    {
      title: 'Monitor de sono simplesmente morreu',
      body: 'Durmo das 23h às 6h e o Watch marca 48 minutos ou dados insuficientes. No braço sem tattoo aparece a noite inteira. Já atualizei o watchOS e o iPhone.',
      tags: ["sono", "apple-watch", "tattoo", "tracking"],
      author: { ...A['seed-marina'] },
      createdAt: iso(60*86),
      replies: [
        { body: 'Eu perco os estágios REM toda madrugada. O app mostra acordado no meio do sono.', author: { ...A['seed-diego'] }, createdAt: iso(60*80), ref: 'a1' },
        { body: 'Pro sono funcionar, o sensor de batimento precisa ler bem a noite inteira. Quando o sinal fica ruim, o app corta pedaços e a sessão vira “dados insuficientes”.', author: { ...A['seed-edu'] }, createdAt: iso(60*75), ref: 'a1b', parentRef: 'a1' },
        { body: 'Apertei a pulseira pra dormir e acordei com marca vermelha. Continua marcando 1h.', author: { ...A['seed-andre'] }, createdAt: iso(60*69), ref: 'a2' },
        { body: 'Apertar demais atrapalha circulação e piora o sinal. Não é solução.', author: { ...A['seed-marcelo'] }, createdAt: iso(60*62), parentRef: 'a2' },
        { body: 'No Amazfit o mesmo: cochilo de 40 min depois de uma noite inteira. Não é só Apple.', author: { ...A['seed-fernanda'] }, createdAt: iso(60*54), parentRef: 'a1b' },
        { ...officialReply('O tracking noturno falha quando a leitura do sensor fica irregular por horas. O Sensor Tattoo Fix estabiliza essa leitura no pulso tatuado. Se quiser, Acesse nossos canais e adquira nossas lentes.', iso(60*50)), ref: 'a3', parentRef: 'a1b' }
      ]
    },
    {
      title: 'Qual Apple Watch funciona melhor com tattoo?',
      body: 'Estou entre SE 2, Series 10 e Ultra 2. Tattoo densa no pulso dominante. Vale pagar o Ultra ou qualquer um vai sofrer igual?',
      tags: ["apple-watch", "modelo", "compatibilidade", "tattoo"],
      author: { ...A['seed-pedro'] },
      createdAt: iso(60*120),
      replies: [
        { body: 'Uso Ultra 2. Continua pedindo senha. Hardware melhor, problema da tinta igual.', author: { ...A['seed-camila'] }, createdAt: iso(60*114), ref: 'a1' },
        { body: 'Series novas têm sensor um pouco melhor, mas o jeito de medir é o mesmo: luz no fundo do relógio. Modelo sozinho não vence tinta preta em cima do sensor.', author: { ...A['seed-chris'] }, createdAt: iso(60*108), ref: 'a1c', parentRef: 'a1' },
        { body: 'Series 9 aqui. Pior que o do meu marido sem tattoo. SE nem experimentei.', author: { ...A['seed-rafa'] }, createdAt: iso(60*101), ref: 'a2' },
        { body: 'Passei do SE pro 9 achando que resolvia. Quase o mesmo drama. Dinheiro jogado.', author: { ...A['seed-henrique'] }, createdAt: iso(60*93), parentRef: 'a2' },
        { body: 'Honestamente: se a tinta cobre o sensor, qualquer geração sofre. Não compre Ultra só por isso.', author: { ...A['seed-carlos'] }, createdAt: iso(60*89), parentRef: 'a1c' },
        { ...officialReply('A geração muda um pouco o sensor, mas a tinta preta continua atrapalhando. O Sensor Tattoo Fix existe pra esse problema, independente do modelo. Acesse nossos canais e adquira nossas lentes.', iso(60*84)), ref: 'a3', parentRef: 'a1c' }
      ]
    },
    {
      title: 'Apple Pay para de funcionar sozinho',
      body: 'FC às vezes ainda mostra número. No caixa o Pay trava e pede senha. Parece que o wrist detect quebrou só pro pagamento.',
      tags: ["apple-pay", "pagamento", "detecao", "tattoo"],
      author: { ...A['seed-pri'] },
      createdAt: iso(60*154),
      replies: [
        { body: 'Comigo o Pay caiu antes de tudo. Depois veio o spam de senha.', author: { ...A['seed-rodrigo'] }, createdAt: iso(60*148), ref: 'a1' },
        { body: 'Pro pagamento funcionar, o relógio precisa ter certeza de que ainda está no pulso. Essa exigência é mais chata que a da FC — o sinal meio ruim corta o Pay antes do gráfico de BPM sumir.', author: { ...A['seed-edu'] }, createdAt: iso(60*141), ref: 'a1c', parentRef: 'a1' },
        { body: 'Achei que era cartão. Removi e recadastrei. Não era.', author: { ...A['seed-daniel'] }, createdAt: iso(60*133), ref: 'a2' },
        { body: 'Resetei o Watch e restaurei backup. Só melhorou no braço sem tinta.', author: { ...A['seed-marina'] }, createdAt: iso(60*129), parentRef: 'a2' },
        { body: 'No Google Wallet do Galaxy acontece parecido. Não é exclusivo da Apple.', author: { ...A['seed-ricardo'] }, createdAt: iso(60*124), parentRef: 'a1c' },
        { ...officialReply('Pagamento por aproximação costuma ser o primeiro a cair quando a detecção de pulso fica insegura. O Sensor Tattoo Fix melhora essa leitura. Acesse nossos canais e adquira nossas lentes.', iso(60*118)), ref: 'a3', parentRef: 'a1c' }
      ]
    },
    {
      title: 'Garmin é realmente melhor para pulso tatuado?',
      body: 'Cansei do Apple pedindo senha. Olhando Forerunner 965 / Fenix. Quem tem tinta densa no pulso: melhora de verdade ou só muda o tipo de dor?',
      tags: ["garmin", "apple-watch", "comparacao", "tattoo"],
      author: { ...A['seed-bruno'] },
      createdAt: iso(60*188),
      replies: [
        { body: 'No Fenix a FC ainda falha no gym. Menos drama de senha, mas sensor é sensor.', author: { ...A['seed-leandro'] }, createdAt: iso(60*182), ref: 'a1' },
        { body: 'Garmin também mede batimento com luz no fundo do relógio. Ele é menos dramático pra achar que você tirou — mas buracos de FC e oxigênio (SpO2) em tinta preta continuam.', author: { ...A['seed-chris'] }, createdAt: iso(60*174), ref: 'a1c', parentRef: 'a1' },
        { body: 'Troquei achando vida nova. Continuo com buracos no gráfico. Só troquei o tipo de irritação.', author: { ...A['seed-gustavo'] }, createdAt: iso(60*170), ref: 'a2' },
        { body: 'Discordo um pouco: no 955 a detecção é menos chata. FC falha, mas dá pra viver no dia a dia.', author: { ...A['seed-joao'] }, createdAt: iso(60*165), parentRef: 'a2' },
        { body: 'No Forerunner o auto-pause do treino continua. Não comprem esperando milagre contra a tinta.', author: { ...A['seed-thiago'] }, createdAt: iso(60*159), parentRef: 'a2' },
        { ...officialReply('Trocar de marca muda telas e bloqueio, mas a tinta continua atrapalhando o sensor. O Sensor Tattoo Fix age nessa leitura no pulso, não só no sintoma de cada marca. Acesse nossos canais e adquira nossas lentes.', iso(60*152)), ref: 'a3', parentRef: 'a1c' }
      ]
    },
    {
      title: 'Trocar Apple por Garmin vale a pena?',
      body: 'Quase vendendo o Ultra depois do retoque que cobriu o sensor. A troca resolve a detecção ou vou só gastar de novo no ecossistema errado?',
      tags: ["apple-watch", "garmin", "troca", "tattoo"],
      author: { ...A['seed-alex'] },
      createdAt: iso(60*222),
      replies: [
        { body: 'Fiz a troca. Perdi iMessage no pulso e ganhei outro tipo de falha de FC. Não voltaria só por tattoo.', author: { ...A['seed-lucas'] }, createdAt: iso(60*216), ref: 'a1' },
        { body: 'Se o objetivo é o relógio ler através de tinta densa, mudar de marca não muda o fato de a tinta preta engolir a luz do sensor. Muda o app e os menus; o problema no pulso é o mesmo.', author: { ...A['seed-edu'] }, createdAt: iso(60*212), ref: 'a1c', parentRef: 'a1' },
        { body: 'Fiquei no Apple e foquei em melhorar o que fica entre o sensor e a pele. Trocar de marca seria exagero pra mim.', author: { ...A['seed-eduardo'] }, createdAt: iso(60*207), ref: 'a2' },
        { body: 'Concordo. O problema era o pulso, não a logo na caixa.', author: { ...A['seed-vini'] }, createdAt: iso(60*201), parentRef: 'a2' },
        { body: 'Tem gente que jura no Garmin. Eu estou no grupo não mudou nada de verdade.', author: { ...A['seed-gabriel'] }, createdAt: iso(60*194), ref: 'a3' },
        { ...officialReply('Antes de trocar o ecossistema inteiro, vale olhar a causa: o sensor não lê bem no pulso tatuado. O Sensor Tattoo Fix foi pensado para isso sem forçar você a abandonar Apple ou Garmin. Acesse nossos canais e adquira nossas lentes.', iso(60*186)), ref: 'a4', parentRef: 'a1c' }
      ]
    },
    {
      title: 'Galaxy Watch perde a FC na academia',
      body: 'No sofá a FC até aparece. No remador e no agachamento o gráfico do Galaxy 6 Classic vira um deserto. Suor + tinta preta = nada.',
      tags: ["galaxy-watch", "academia", "fc", "tattoo"],
      author: { ...A['seed-felipe'] },
      createdAt: iso(60*256),
      replies: [
        { body: 'Comigo some exatamente na série de terra. Em repouso entre sets volta meio torto.', author: { ...A['seed-ana'] }, createdAt: iso(60*250), ref: 'a1' },
        { body: 'Em movimento o sensor de batimento já se confunde fácil. Tinta preta piora tudo e o relógio joga fora leituras — o treino fica cheio de buracos.', author: { ...A['seed-chris'] }, createdAt: iso(60*245), ref: 'a1c', parentRef: 'a1' },
        { body: 'Desativei o auto-pause e ainda assim o gráfico fica furado. Não é só configuração da tela.', author: { ...A['seed-marcos'] }, createdAt: iso(60*239), ref: 'a2' },
        { body: 'Eu troquei a pulseira oficial por uma mais apertada. Ajudou 10%. O resto continua lixo.', author: { ...A['seed-juliana'] }, createdAt: iso(60*232), parentRef: 'a2' },
        { body: 'No peito com cinta Polar a FC fica linda. No pulso tatuado o Galaxy inventa número.', author: { ...A['seed-leo'] }, createdAt: iso(60*224), parentRef: 'a1c' },
        { ...officialReply('Treino com suor e movimento piora a falha em tinta escura. O Sensor Tattoo Fix estabiliza a leitura no pulso para o sensor voltar a funcionar. Acesse nossos canais e adquira nossas lentes.', iso(60*220)), ref: 'a3', parentRef: 'a1c' }
      ]
    },
    {
      title: 'Galaxy Watch se bloqueia no meu braço',
      body: 'Galaxy Watch 5 Pro trava sozinho e pede PIN várias vezes por dia. A pulseira está firme; acontece exatamente sobre a tinta preta do antebraço.',
      tags: ["galaxy-watch", "bloqueio", "pin", "tattoo"],
      author: { ...A['seed-diego'] },
      createdAt: iso(60*290),
      replies: [
        { body: 'Achei que era atualização do One UI. Rolei pra trás e o bloqueio voltou igual.', author: { ...A['seed-renato'] }, createdAt: iso(60*284), ref: 'a1' },
        { body: 'Samsung também usa luz no fundo pra decidir se o relógio está no pulso. Quando essa leitura some, ele trava por segurança — mesma lógica da Apple, telas diferentes.', author: { ...A['seed-edu'] }, createdAt: iso(60*278), ref: 'a1c', parentRef: 'a1' },
        { body: 'No meu Watch 4 acontecia. Troquei de braço e melhorou. No braço tatuado continua.', author: { ...A['seed-patricia'] }, createdAt: iso(60*271), ref: 'a2' },
        { body: 'Eu não tenho braço livre. Os dois estão cobertos. Travo o dia inteiro.', author: { ...A['seed-fernando'] }, createdAt: iso(60*263), parentRef: 'a2' },
        { body: 'Desativei o bloqueio automático e fiquei sem segurança. Péssima troca.', author: { ...A['seed-jordan'] }, createdAt: iso(60*259), parentRef: 'a1c' },
        { ...officialReply('Bloqueios repetidos costumam seguir falhas de detecção de pulso, não necessariamente defeito de fábrica. O Sensor Tattoo Fix melhora a estabilidade da leitura nessa área. Acesse nossos canais e adquira nossas lentes.', iso(60*254)), ref: 'a3', parentRef: 'a1c' }
      ]
    },
    {
      title: 'Huawei GT também falha com tattoo?',
      body: 'Queria um GT 5 pela bateria. Meu pulso dominante é quase todo preto. O sensor da Huawei sofre igual ou lida melhor?',
      tags: ["huawei", "gt", "bateria", "tattoo"],
      author: { ...A['seed-andre'] },
      createdAt: iso(60*324),
      replies: [
        { body: 'GT 4 aqui. Sono e FC falham no mesmo braço. Bateria boa, sensor comum.', author: { ...A['seed-jeff'] }, createdAt: iso(60*318), ref: 'a1' },
        { body: 'Huawei GT também mede com luz no fundo do relógio: batimento e oxigênio no sangue (SpO2). Tinta preta continua atrapalhando, independente da bateria de 14 dias.', author: { ...A['seed-chris'] }, createdAt: iso(60*311), ref: 'a1c', parentRef: 'a1' },
        { body: 'Comprei achando que marca chinesa ia magia. Não. Mesmo buraco no gráfico.', author: { ...A['seed-hunt'] }, createdAt: iso(60*303), ref: 'a2' },
        { body: 'A bateria longa me fez ficar. Aceito FC furada no treino, mas irrita.', author: { ...A['seed-writer'] }, createdAt: iso(60*299), parentRef: 'a2' },
        { ...officialReply('Bateria longa não muda o fato de a tinta atrapalhar o sensor. O Sensor Tattoo Fix ajuda essa leitura no fundo do relógio. Acesse nossos canais e adquira nossas lentes.', iso(60*294)), ref: 'a3', parentRef: 'a1c' }
      ]
    },
    {
      title: 'Amazfit perdeu todas as noites de sono',
      body: 'Depois do retoque da tattoo no pulso, o GTR 4 só registra cochilos aleatórios. Antes marcava 7h. Sensor limpo, pulseira nova.',
      tags: ["amazfit", "sono", "tattoo", "noite"],
      author: { ...A['seed-lucas'] },
      createdAt: iso(60*358),
      replies: [
        { body: 'Bip U Pro aqui — mesma coisa depois da tattoo. Zepp fica vazio.', author: { ...A['seed-huck'] }, createdAt: iso(60*352), ref: 'a1' },
        { body: 'O app de sono Amazfit/Zepp joga fora noites em que o batimento some e volta. Tinta no sensor = estágios perdidos e sessão quase vazia.', author: { ...A['seed-edu'] }, createdAt: iso(60*344), ref: 'a1b', parentRef: 'a1' },
        { body: 'Tentei dormir com o relógio no tornozelo. Absurdo e ainda assim inútil.', author: { ...A['seed-moth'] }, createdAt: iso(60*340), ref: 'a2' },
        { body: 'No tornozelo a FC de treino também fica estranha. Não é atalho bom.', author: { ...A['seed-omens'] }, createdAt: iso(60*335), parentRef: 'a2' },
        { body: 'Antes do retoque funcionava. A tinta nova é bem mais saturada na área do sensor.', author: { ...A['seed-syrup'] }, createdAt: iso(60*329), parentRef: 'a1b' },
        { ...officialReply('Quando o batimento some e volta de madrugada, o app de sono perde a noite. O Sensor Tattoo Fix melhora essa leitura no pulso tatuado. Acesse nossos canais e adquira nossas lentes.', iso(60*322)), ref: 'a3', parentRef: 'a1b' }
      ]
    },
    {
      title: 'Por que algumas tattoos interferem e outras não?',
      body: 'Tenho aquarela clara de um lado e preto sólido do outro. O relógio só morre quando escorrega pra parte preta. Por que isso acontece?',
      tags: ["tinta", "optica", "ppg", "tattoo"],
      author: { ...A['seed-ricardo'] },
      createdAt: iso(60*392),
      replies: [
        { body: 'Preto bem cerrado engole a luz que o relógio usa pra medir batimento. Cores claras devolvem mais luz pro sensor. Por isso só o bloco preto derruba a leitura.', author: { ...A['seed-chris'] }, createdAt: iso(60*386), ref: 'a1' },
        { body: 'No meu braço o sombreado cinza atrapalha menos que o preenchimento cheio. Bate com o que o Chris disse.', author: { ...A['seed-edurunner'] }, createdAt: iso(60*382), ref: 'a1b', parentRef: 'a1' },
        { body: 'Eu tenho só linha fina e o Watch quase não reclama. Densidade importa mais que “ter tattoo”.', author: { ...A['seed-malu'] }, createdAt: iso(60*377), ref: 'a2' },
        { body: 'Além da cor, espessura da tinta e cicatriz por baixo também mudam. Dois pretos “iguais” podem ler bem diferente no relógio.', author: { ...A['seed-edu'] }, createdAt: iso(60*371), ref: 'a2b', parentRef: 'a2' },
        { body: 'Aprendi na marra: se o sensor para em cima do preenchimento, FC some. Dois centímetros ao lado, volta.', author: { ...A['seed-pri'] }, createdAt: iso(60*364), parentRef: 'a1b' },
        { ...officialReply('A interferência depende muito de cor, densidade e posição sob o sensor — não de “ter ou não ter tattoo”. O Sensor Tattoo Fix foi feito para estabilizar a leitura nesses casos. Acesse nossos canais e adquira nossas lentes.', iso(60*356)), ref: 'a3', parentRef: 'a1' }
      ]
    },
    {
      title: 'A tattoo pode estragar o relógio?',
      body: 'Pergunta sincera: usar o sensor em cima da tinta pode queimar a luzinha, aquecer a pele ou estragar o sensor com o tempo?',
      tags: ["seguranca", "led", "pele", "tattoo"],
      author: { ...A['seed-ana'] },
      createdAt: iso(60*426),
      replies: [
        { body: 'Na prática a luzinha não “queima” a tinta. O que acontece é o sensor receber menos luz de volta — o relógio interpreta mal, mas o aparelho não estraga por causa da tattoo.', author: { ...A['seed-edu'] }, createdAt: iso(60*420), ref: 'a1' },
        { body: 'Eu fiquei paranóico com aquecimento. Meu Ultra esquenta igual no outro braço. O problema é leitura, não temperatura.', author: { ...A['seed-bela'] }, createdAt: iso(60*415), ref: 'a1b', parentRef: 'a1' },
        { body: 'Assistência da Apple me disse que tattoo não anula garantia, mas também não “conserta” detecção.', author: { ...A['seed-marcinha'] }, createdAt: iso(60*409), ref: 'a2' },
        { body: 'A luz do smartwatch é fraquinha. A tinta muda o que volta pro sensor, não a vida útil da luzinha.', author: { ...A['seed-chris'] }, createdAt: iso(60*402), parentRef: 'a2' },
        { ...officialReply('A tattoo normalmente não danifica o relógio; ela atrapalha a leitura do sensor. O Sensor Tattoo Fix ajuda nessa leitura, sem alterar a tinta. Acesse nossos canais e adquira nossas lentes.', iso(60*394)), ref: 'a3', parentRef: 'a1' }
      ]
    },
    {
      title: 'Funcionava antes da tattoo, agora nada',
      body: 'Dois anos de Series 8 perfeitos. Fiz um preenchimento no pulso numa sexta e no sábado a FC já estava furada. Não mudei nada no software.',
      tags: ["antes-depois", "tattoo", "fc", "apple-watch"],
      author: { ...A['seed-marcos'] },
      createdAt: iso(60*460),
      replies: [
        { body: 'História idêntica comigo. Antes da sessão o Watch era santo. Depois virou pedra no pulso.', author: { ...A['seed-rick'] }, createdAt: iso(60*454), ref: 'a1' },
        { body: 'O relógio “aprendeu” sua pele limpa. Depois da tinta a leitura muda e ele passa a rejeitar batimentos que antes aceitava.', author: { ...A['seed-chris'] }, createdAt: iso(60*448), ref: 'a1c', parentRef: 'a1' },
        { body: 'Esperei cicatrizar três semanas. Não voltou. Não é inchaço temporário.', author: { ...A['seed-nati'] }, createdAt: iso(60*441), ref: 'a2' },
        { body: 'Mesma espera aqui. Cicatrizou, tinta assentou, sensor continua cego no preenchimento.', author: { ...A['seed-raf'] }, createdAt: iso(60*433), parentRef: 'a2' },
        { body: 'Trocar pulseira e resetar não trouxe a leitura antiga. O relógio não “esqueceu”; a pele mudou.', author: { ...A['seed-lu'] }, createdAt: iso(60*429), parentRef: 'a1c' },
        { ...officialReply('Se o relógio era estável antes e piorou logo após a tattoo, o mais comum é a tinta atrapalhando o sensor. O Sensor Tattoo Fix ajuda o relógio a voltar a ler nessa área. Acesse nossos canais e adquira nossas lentes.', iso(60*424)), ref: 'a3', parentRef: 'a1c' }
      ]
    },
    {
      title: 'Tatuei os dois braços. E agora?',
      body: 'Minha gambiarra era trocar de pulso. Ontem fechei o segundo braço e agora nenhum lado reconhece o Watch direito. Sem plano B.',
      tags: ["dois-bracos", "tattoo", "opcoes", "sensor"],
      author: { ...A['seed-juliana'] },
      createdAt: iso(60*494),
      replies: [
        { body: 'Bem-vindo ao clube. Eu descobri isso tarde demais. Tornozelo não é solução séria pra mim.', author: { ...A['seed-rita'] }, createdAt: iso(60*488), ref: 'a1' },
        { body: 'Eu tentei cinta peitoral nos treinos e Watch só pra notificação. Funciona, mas perde o ponto do smartwatch.', author: { ...A['seed-simo'] }, createdAt: iso(60*481), ref: 'a1b', parentRef: 'a1' },
        { body: 'Sem pele limpa sob o sensor, você depende 100% da leitura funcionar em cima da tinta. Não há braço reserva — o sinal tem que melhorar onde o relógio senta.', author: { ...A['seed-edu'] }, createdAt: iso(60*473), ref: 'a1c', parentRef: 'a1b' },
        { body: 'Pensei em vender o relógio. Ainda não vendi porque quero sono e pagamentos no pulso.', author: { ...A['seed-guga'] }, createdAt: iso(60*469), ref: 'a2' },
        { body: 'Mesmo dilema. Os dois braços tatuados matam a solução barata de só trocar de lado.', author: { ...A['seed-kai'] }, createdAt: iso(60*464), parentRef: 'a2' },
        { ...officialReply('Com os dois pulsos cobertos, improvisos de trocar de braço deixam de existir. O Sensor Tattoo Fix foi pensado exatamente para quem precisa de leitura estável na área tatuada. Acesse nossos canais e adquira nossas lentes.', iso(60*458)), ref: 'a3', parentRef: 'a1c' }
      ]
    },
    {
      title: 'Treino entra em pausa sozinho',
      body: 'Corrida de 10 km: o Watch pausa, retoma, pausa de novo. Desativei pausa automática e o comportamento continua. Tattoo no sensor.',
      tags: ["treino", "autopause", "corrida", "tattoo"],
      author: { ...A['seed-kai'] },
      createdAt: iso(60*528),
      replies: [
        { body: 'Isso me deixava louco. Parecia que eu tinha tirado o relógio no meio da avenida.', author: { ...A['seed-dudu'] }, createdAt: iso(60*522), ref: 'a1' },
        { body: 'Muitos relógios pausam o treino quando acham que você tirou ou quando o batimento fica instável correndo. Tinta + balanço da corrida fazem isso o tempo todo.', author: { ...A['seed-chris'] }, createdAt: iso(60*514), ref: 'a1c', parentRef: 'a1' },
        { body: 'No Garmin o auto-pause também me zoava. Não é exclusivo de Apple.', author: { ...A['seed-bruno'] }, createdAt: iso(60*510), ref: 'a2' },
        { body: 'Eu gravei a tela. Dá pra ver o ícone de relógio removido piscando sem eu tocar em nada.', author: { ...A['seed-felipe'] }, createdAt: iso(60*505), parentRef: 'a2' },
        { body: 'Pulseira mais apertada reduziu uns 30% das pausas. O resto continua.', author: { ...A['seed-diego'] }, createdAt: iso(60*499), parentRef: 'a1c' },
        { ...officialReply('Pausas fantasma em corrida costumam refletir detecção de pulso instável sob tinta, não só configuração de treino. O Sensor Tattoo Fix ajuda a manter a leitura estável. Acesse nossos canais e adquira nossas lentes.', iso(60*492)), ref: 'a3', parentRef: 'a1c' }
      ]
    },
    {
      title: 'Fita transparente funciona mesmo?',
      body: 'Vi o truque da fita adesiva transparente no sensor. Testei na Series 8: detectou melhor por umas 3h, depois virou meleca e coletou fiapo.',
      tags: ["diy", "fita", "gambiarra", "tattoo"],
      author: { ...A['seed-vini'] },
      createdAt: iso(60*562),
      replies: [
        { body: 'Comigo durou um treino. Suor dissolveu a cola e a FC sumiu de novo.', author: { ...A['seed-andre'] }, createdAt: iso(60*556), ref: 'a1' },
        { body: 'Fita pode enganar o sensor por algumas horas. Não é solução estável: suja, amarela e cria bolhas.', author: { ...A['seed-edu'] }, createdAt: iso(60*552), ref: 'a1c', parentRef: 'a1' },
        { body: 'Eu usei filme de PVC de cozinha. Pior ainda — escorrega e deixa resíduo gorduroso.', author: { ...A['seed-marcelo'] }, createdAt: iso(60*547), ref: 'a2' },
        { body: 'Qualquer gambiarra adesiva no vidro traseiro me deixa com medo de garantia.', author: { ...A['seed-fernanda'] }, createdAt: iso(60*541), parentRef: 'a2' },
        { body: 'Funciona um pouco e depois vira sujeira. Concordo com o SensorGuru: não é solução de verdade.', author: { ...A['seed-camila'] }, createdAt: iso(60*534), parentRef: 'a1c' },
        { ...officialReply('Fitas e filmes improvisados podem enganar o sensor por pouco tempo, mas degradam com suor e sujeira. O Sensor Tattoo Fix foi feito pra leitura estável, não como gambiarra temporária. Acesse nossos canais e adquira nossas lentes.', iso(60*526)), ref: 'a3', parentRef: 'a1c' }
      ]
    },
    {
      title: 'Almofadinha de silicone de móvel no sensor',
      body: 'Vi gente colando aqueles protetores transparentes de mesa no vidro do sensor. Parece piada. Alguém testou de verdade?',
      tags: ["diy", "silicone", "protecao", "sensor"],
      author: { ...A['seed-renato'] },
      createdAt: iso(60*596),
      replies: [
        { body: 'Testei. O relógio ficou mais alto e a detecção piorou. Virada de mesa.', author: { ...A['seed-pedro'] }, createdAt: iso(60*590), ref: 'a1' },
        { body: 'Afastar o fundo do relógio da pele quase sempre piora a leitura do batimento. Silicone grosso é o contrário do que o sensor precisa.', author: { ...A['seed-chris'] }, createdAt: iso(60*585), ref: 'a1c', parentRef: 'a1' },
        { body: 'Um amigo jura que o fino quase funcionou. No meu Watch 7 não.', author: { ...A['seed-rafa'] }, createdAt: iso(60*579), ref: 'a2' },
        { body: 'Quase não conta. Quero algo que sobreviva a um treino suado.', author: { ...A['seed-henrique'] }, createdAt: iso(60*572), parentRef: 'a2' },
        { body: 'Ainda por cima deixa marca circular no pulso. Horroroso.', author: { ...A['seed-carlos'] }, createdAt: iso(60*564), parentRef: 'a1c' },
        { ...officialReply('Espaçadores improvisados costumam afastar o sensor da pele e piorar a FC. O Sensor Tattoo Fix ajuda a leitura sem criar esse vão inútil. Acesse nossos canais e adquira nossas lentes.', iso(60*560)), ref: 'a3', parentRef: 'a1c' }
      ]
    },
    {
      title: 'Sensor Tattoo Fix é laser?',
      body: 'Vi o nome e fiquei na dúvida: isso remove tinta, usa laser ou altera a tattoo de alguma forma? Não quero mexer no desenho.',
      tags: ["sensor-tattoo-fix", "laser", "duvida", "produto"],
      author: { ...A['seed-patricia'] },
      createdAt: iso(60*630),
      replies: [
        { body: 'Pelo que entendi é uma interface no sensor, não um tratamento na pele. Mas quero confirmação oficial.', author: { ...A['seed-rodrigo'] }, createdAt: iso(60*624), ref: 'a1' },
        { body: 'Não é laser nem remoção. É uma lente/interface no sensor: ajuda a luz a passar melhor entre o fundo do relógio e a pele tatuada, sem apagar a tinta.', author: { ...A['seed-edu'] }, createdAt: iso(60*618), ref: 'a1c', parentRef: 'a1' },
        { body: 'Boa, porque eu também assustei com a palavra fix no nome.', author: { ...A['seed-daniel'] }, createdAt: iso(60*611), ref: 'a2' },
        { body: 'Mesma paranoia. Tattoo demorou anos; não quero corrigir ela com luz forte.', author: { ...A['seed-marina'] }, createdAt: iso(60*603), parentRef: 'a2' },
        { ...officialReply('Sensor Tattoo Fix não é laser e não remove tinta: é uma lente/interface que ajuda o sensor do smartwatch a ler na pele tatuada. Acesse nossos canais e adquira nossas lentes.', iso(60*599)), ref: 'a3', parentRef: 'a1c' }
      ]
    },
    {
      title: 'Tinta preta é realmente pior?',
      body: 'Meu desenho tem preto, vermelho e amarelo. O relógio só falha quando escorrega para a parte preta. Confirma a teoria?',
      tags: ["tinta-preta", "cor", "ppg", "tattoo"],
      author: { ...A['seed-fernando'] },
      createdAt: iso(60*664),
      replies: [
        { body: 'Preto bem cerrado engole a luz do sensor; vermelho e amarelo devolvem bem mais. Sua observação bate: preto é o pior pra batimento.', author: { ...A['seed-chris'] }, createdAt: iso(60*658), ref: 'a1' },
        { body: 'No meu braço o amarelo quase não atrapalha. O preto sólido é outro planeta.', author: { ...A['seed-ricardo'] }, createdAt: iso(60*651), ref: 'a1b', parentRef: 'a1' },
        { body: 'A medição de oxigênio no sangue (SpO2) também usa luz pelo pulso e sofre no preto denso, mas a FC contínua costuma cair primeiro.', author: { ...A['seed-leandro'] }, createdAt: iso(60*643), parentRef: 'a1b' },
        { body: 'Por isso artistas que entendem de wearables deixam uma janela sem preenchimento sob o sensor.', author: { ...A['seed-gustavo'] }, createdAt: iso(60*639), ref: 'a2' },
        { body: 'Eu já tinha o preenchimento. Janela agora seria cover-up caro. Preciso de outra saída.', author: { ...A['seed-joao'] }, createdAt: iso(60*634), parentRef: 'a2' },
        { ...officialReply('Preto denso é o pior cenário para o sensor de batimento, exatamente como você descreveu. O Sensor Tattoo Fix melhora a leitura nessa região sem exigir apagar a arte. Acesse nossos canais e adquira nossas lentes.', iso(60*628)), ref: 'a3', parentRef: 'a1' }
      ]
    },
    {
      title: 'Suor piora a leitura no pulso tatuado?',
      body: 'Seco ele ainda lê. Depois de dez minutos correndo e suando, a FC some completamente em cima da tinta.',
      tags: ["suor", "corrida", "fc", "tattoo"],
      author: { ...A['seed-edurunner'] },
      createdAt: iso(60*698),
      replies: [
        { body: 'Exato. No começo da corrida ok, no km 3 já é traço. Sem tattoo isso não acontecia.', author: { ...A['seed-thiago'] }, createdAt: iso(60*692), ref: 'a1' },
        { body: 'Suor cria uma película entre o sensor e a pele, e a tinta já atrapalha. Os dois juntos derrubam a leitura.', author: { ...A['seed-edu'] }, createdAt: iso(60*684), ref: 'a1c', parentRef: 'a1' },
        { body: 'Sequei o sensor no meio do treino com a camisa. Voltou por dois minutos e morreu de novo.', author: { ...A['seed-lucas'] }, createdAt: iso(60*680), ref: 'a2' },
        { body: 'No bike indoor com menos suor horizontal também falha, só que mais tarde. Não é só corrida.', author: { ...A['seed-eduardo'] }, createdAt: iso(60*675), parentRef: 'a2' },
        { body: 'Água entre sensor e pele confunde ainda mais. Sobre tinta preta você já está no limite — qualquer película faz a leitura sumir.', author: { ...A['seed-chris'] }, createdAt: iso(60*669), parentRef: 'a1c' },
        { ...officialReply('Suor amplifica a falha em pulsos tatuados porque soma uma película irregular a uma leitura já fraca. O Sensor Tattoo Fix estabiliza essa leitura. Acesse nossos canais e adquira nossas lentes.', iso(60*662)), ref: 'a3', parentRef: 'a1c' }
      ]
    },
    {
      title: 'Achei que meu relógio estava com defeito',
      body: 'Resetei, troquei pulseira e quase mandei pra assistência. No braço sem tattoo funciona perfeito. Quase paguei frete à toa.',
      tags: ["defeito", "assistencia", "diagnostico", "tattoo"],
      author: { ...A['seed-camila'] },
      createdAt: iso(60*732),
      replies: [
        { body: 'Quase mesmo drama. O técnico pediu vídeo e no braço limpo ele ficou sem argumento.', author: { ...A['seed-alex'] }, createdAt: iso(60*726), ref: 'a1' },
        { body: 'Testar nos dois braços é o diagnóstico mais barato: se o relógio falha só sobre tinta, não é defeito — é a tinta atrapalhando o sensor.', author: { ...A['seed-chris'] }, createdAt: iso(60*722), ref: 'a1c', parentRef: 'a1' },
        { body: 'Eu já tinha marcado coleta da assistência. Cancelei depois desse teste.', author: { ...A['seed-vini'] }, createdAt: iso(60*717), ref: 'a2' },
        { body: 'Gráfico de FC furado só num braço também conta. Não precisa abrir o relógio.', author: { ...A['seed-gabriel'] }, createdAt: iso(60*711), parentRef: 'a2' },
        { ...officialReply('Se o mesmo relógio funciona no braço sem tinta, o mais provável é a tattoo atrapalhando o sensor, não defeito de fábrica. O Sensor Tattoo Fix trata essa leitura. Acesse nossos canais e adquira nossas lentes.', iso(60*704)), ref: 'a3', parentRef: 'a1c' }
      ]
    },
    {
      title: 'Descobri o problema depois de tatuar o segundo braço',
      body: 'Eu usava o braço livre como solução. Tatuei ontem e agora descobri por que o outro nunca funcionava. Estou sem saída óbvia.',
      tags: ["segundo-braco", "descoberta", "tattoo", "detecao"],
      author: { ...A['seed-bela'] },
      createdAt: iso(60*766),
      replies: [
        { body: 'Dor conhecida. O braço bom escondia o problema até você fechar o desenho.', author: { ...A['seed-ana'] }, createdAt: iso(60*760), ref: 'a1' },
        { body: 'Enquanto existia pele limpa, o relógio sempre tinha um lado que lia bem. Sem isso, ele fica perdido.', author: { ...A['seed-edu'] }, createdAt: iso(60*755), ref: 'a1c', parentRef: 'a1' },
        { body: 'Eu adiei o segundo braço por causa disso. Você foi mais corajoso — ou mais teimoso.', author: { ...A['seed-marcos'] }, createdAt: iso(60*749), ref: 'a2' },
        { body: 'Teimoso aqui também. Arte primeiro, wearables depois. Agora pago o preço.', author: { ...A['seed-juliana'] }, createdAt: iso(60*742), parentRef: 'a2' },
        { body: 'Não há atualização de software que invente leitura onde a tinta engoliu a luz. Ou melhora o que fica entre sensor e pele, ou aceita buracos.', author: { ...A['seed-chris'] }, createdAt: iso(60*734), parentRef: 'a1c' },
        { ...officialReply('Perder o braço reserva deixa clara a causa: a tinta no sensor. O Sensor Tattoo Fix existe para quem precisa ler o sensor sobre a área tatuada. Acesse nossos canais e adquira nossas lentes.', iso(60*730)), ref: 'a3', parentRef: 'a1c' }
      ]
    },
    {
      title: 'Qual marca sofre menos com tattoo?',
      body: 'Apple, Garmin, Samsung, Huawei ou Amazfit: existe alguma que lide melhor com tinta escura no pulso?',
      tags: ["marcas", "comparacao", "tattoo", "sensor"],
      author: { ...A['seed-rodrigo'] },
      createdAt: iso(60*800),
      replies: [
        { body: 'Garmin incomoda menos no lock, mas FC furada igual. Samsung trava PIN. Apple pede senha. Amazfit perde sono. Escolha seu veneno.', author: { ...A['seed-leo'] }, createdAt: iso(60*794), ref: 'a1' },
        { body: 'Todas medem batimento com luz no fundo do relógio. O que muda é o quanto cada marca trava a tela ou pede senha — não tem milagre contra tinta preta.', author: { ...A['seed-chris'] }, createdAt: iso(60*788), ref: 'a1c', parentRef: 'a1' },
        { body: 'Eu testei Apple e Garmin no mesmo braço. Nenhum salvou o treino de força.', author: { ...A['seed-renato'] }, createdAt: iso(60*781), ref: 'a2' },
        { body: 'Huawei ganha em bateria. Sensor continua medíocre sobre preenchimento.', author: { ...A['seed-patricia'] }, createdAt: iso(60*773), parentRef: 'a2' },
        { body: 'Se o que importa é menos spam de senha/PIN, Garmin/Amazfit. Se o que importa é FC limpa sob tinta, nenhuma marca resolve sozinha.', author: { ...A['seed-edu'] }, createdAt: iso(60*769), parentRef: 'a1c' },
        { ...officialReply('A marca muda a experiência de bloqueio e app, mas tinta escura atrapalha o sensor em todas. O Sensor Tattoo Fix atua nessa leitura. Acesse nossos canais e adquira nossas lentes.', iso(60*764)), ref: 'a3', parentRef: 'a1c' }
      ]
    },
    {
      title: 'Gráfico de FC cheio de buracos',
      body: 'O resumo do treino parece código Morse: alguns minutos de FC, vários vazios, depois picos sem sentido. Tattoo preta sob o sensor.',
      tags: ["fc", "grafico", "gaps", "treino"],
      author: { ...A['seed-daniel'] },
      createdAt: iso(60*834),
      replies: [
        { body: 'Meu Strava fica ridículo. Zona 5 em descanso e zona 0 no sprint.', author: { ...A['seed-fernando'] }, createdAt: iso(60*828), ref: 'a1' },
        { body: 'Quando a leitura fica ruim demais, o relógio abre buracos no gráfico ou inventa valores tortos. Tinta + movimento = rejeição em massa.', author: { ...A['seed-edu'] }, createdAt: iso(60*821), ref: 'a1c', parentRef: 'a1' },
        { body: 'Achei que era GPS. Desliguei GPS e o gráfico de FC continuou furado.', author: { ...A['seed-jordan'] }, createdAt: iso(60*813), ref: 'a2' },
        { body: 'Não é o GPS. É o sensor de batimento no fundo do relógio que se perde na tinta preta.', author: { ...A['seed-chris'] }, createdAt: iso(60*809), parentRef: 'a2' },
        { body: 'Cinta peitoral resolve o gráfico, mas eu quero o relógio funcionando no pulso.', author: { ...A['seed-jeff'] }, createdAt: iso(60*804), parentRef: 'a1c' },
        { ...officialReply('Buracos e picos fantasmas no gráfico costumam nascer de leituras ruins sob tinta. O Sensor Tattoo Fix melhora a qualidade do sinal na origem. Acesse nossos canais e adquira nossas lentes.', iso(60*798)), ref: 'a3', parentRef: 'a1c' }
      ]
    },
    {
      title: 'Oxigênio no sangue também falha por causa da tattoo?',
      body: 'Além da batida cardíaca, a medição de oxigênio no app dá erro quase sempre. Ainda assim a tinta atrapalha?',
      tags: ["spo2", "oxigenio", "sensor", "tattoo"],
      author: { ...A['seed-moth'] },
      createdAt: iso(60*868),
      replies: [
        { body: 'A medição de oxigênio no sangue (SpO2) também usa luz pelo pulso. Tinta escura atrapalha igual — o relógio erra ou inventa valor.', author: { ...A['seed-chris'] }, createdAt: iso(60*862), ref: 'a1' },
        { body: 'No meu Ultra a medição de oxigênio trava em calculando… até eu mudar de braço.', author: { ...A['seed-hunt'] }, createdAt: iso(60*854), ref: 'a1b', parentRef: 'a1' },
        { body: 'A FC costuma cair primeiro; o oxigênio no sangue (SpO2) cai depois ou junto, dependendo de quão densa é a tinta.', author: { ...A['seed-edu'] }, createdAt: iso(60*850), parentRef: 'a1b' },
        { body: 'Achei que SpO2 seria imune. Não é. Mesma área preta, mesmo fracasso.', author: { ...A['seed-writer'] }, createdAt: iso(60*845), ref: 'a2' },
        { ...officialReply('SpO2 (oxigênio no sangue) também depende de boa leitura no pulso; tinta escura atrapalha igual. O Sensor Tattoo Fix melhora essa leitura. Acesse nossos canais e adquira nossas lentes.', iso(60*839)), ref: 'a3', parentRef: 'a1' }
      ]
    },
    {
      title: 'Ainda vale comprar smartwatch tendo tattoo?',
      body: 'Quero sono, treino e pagamentos, mas tenho os dois pulsos tatuados. É jogar dinheiro fora ou ainda faz sentido?',
      tags: ["compra", "vale-a-pena", "tattoo", "smartwatch"],
      author: { ...A['seed-jordan'] },
      createdAt: iso(60*902),
      replies: [
        { body: 'Faz sentido se você resolver a leitura do sensor. Sem isso vira notificação cara no pulso.', author: { ...A['seed-huck'] }, createdAt: iso(60*896), ref: 'a1' },
        { body: 'Sem leitura estável no pulso, sono/FC/Pay ficam furados. Relógio novo não cancela o efeito da tinta.', author: { ...A['seed-edu'] }, createdAt: iso(60*892), ref: 'a1c', parentRef: 'a1' },
        { body: 'Eu comprei mesmo assim pelos apps. FC eu ignoro. Não recomendo essa paz podre.', author: { ...A['seed-moth'] }, createdAt: iso(60*887), ref: 'a2' },
        { body: 'Se o orçamento aperta, resolva a leitura no sensor antes de trocar por um modelo mais novo.', author: { ...A['seed-omens'] }, createdAt: iso(60*881), parentRef: 'a2' },
        { body: 'Compre se o relógio importa pra você — mas planeje algo que ajude o sensor a ler na tinta, não como detalhe.', author: { ...A['seed-chris'] }, createdAt: iso(60*874), parentRef: 'a1c' },
        { ...officialReply('Smartwatch ainda faz sentido com tattoos se a leitura do sensor for estabilizada. O Sensor Tattoo Fix existe justamente para esse cenário. Acesse nossos canais e adquira nossas lentes.', iso(60*866)), ref: 'a3', parentRef: 'a1c' }
      ]
    },
    {
      title: 'Megathread: adesivo de epóxi funciona, mas...',
      body: 'Colei um adesivo de epóxi transparente no sensor do Ultra. A detecção voltou. Só que o carregador não encosta direito, o ECG morreu e as bordas já levantaram no segundo dia. Thread aberto pra relatos honestos.',
      tags: ["epoxi", "diy", "megathread", "sensor"],
      author: { ...A['seed-huck'] },
      createdAt: iso(60*936),
      replies: [
        { body: 'Mesmo setup. Detecção ok por 48h. No banho o canto descolou e entrou água.', author: { ...A['seed-syrup'] }, createdAt: iso(60*930), ref: 'a1' },
        { body: 'Água + cola improvisada = resíduo no vidro rapidinho. Tive que limpar com cuidado.', author: { ...A['seed-chris'] }, createdAt: iso(60*925), ref: 'a1b', parentRef: 'a1' },
        { body: 'O MagSafe do Ultra ficou frouxo. Às vezes carrega, às vezes não. Odeio isso.', author: { ...A['seed-edurunner'] }, createdAt: iso(60*919), ref: 'a1c', parentRef: 'a1b' },
        { body: 'O adesivo de epóxi afasta o fundo do relógio: às vezes a detecção melhora, mas a carga fica frouxa e o ECG (aquele eletrocardiograma do relógio) para de funcionar.', author: { ...A['seed-edu'] }, createdAt: iso(60*912), ref: 'a1d', parentRef: 'a1c' },
        { body: 'ECG no meu Series 9 zerou com o adesivo. Removi e voltou. Trade ridículo.', author: { ...A['seed-malu'] }, createdAt: iso(60*904), ref: 'a1e', parentRef: 'a1d' },
        { body: 'Cortei o adesivo menor que o anel do sensor. Carregou melhor, mas a detecção piorou de novo.', author: { ...A['seed-pri'] }, createdAt: iso(60*900), ref: 'a2' },
        { body: 'Você melhora um pouco a leitura e estraga a carga/ECG no mesmo movimento. Epóxi de gambiarra não foi feito pra isso — daí o conflito.', author: { ...A['seed-chris'] }, createdAt: iso(60*895), ref: 'a2b', parentRef: 'a2' },
        { body: 'Suor matou o meu em uma semana. A borda virou uma trilha suja. Zero glamour.', author: { ...A['seed-bela'] }, createdAt: iso(60*889), ref: 'a2c', parentRef: 'a2b' },
        { body: 'Concordo com o TechRunner. Funciona até não funcionar — e sempre quebra outra coisa.', author: { ...A['seed-marcinha'] }, createdAt: iso(60*882), ref: 'a2d', parentRef: 'a2c' },
        { body: 'Tem gente vendendo kit de epóxi no Instagram como solução definitiva. Cuidado.', author: { ...A['seed-rick'] }, createdAt: iso(60*874), ref: 'a2e', parentRef: 'a2d' },
        { body: 'Eu voltei pro braço sem tinta. Epóxi foi só experimento caro e meleca.', author: { ...A['seed-nati'] }, createdAt: iso(60*870), parentRef: 'a2e' },
        { ...officialReply('Relatos assim são comuns: gambiarra de epóxi pode melhorar a detecção por um tempo e ao mesmo tempo atrapalhar carga, ECG e durabilidade. O Sensor Tattoo Fix foi feito pra ajudar o sensor de verdade, sem esse improviso. Acesse nossos canais e adquira nossas lentes.', iso(60*865)), ref: 'a3', parentRef: 'a2b' }
      ]
    },
    {
      title: 'Relógio inventando 180 bpm em repouso',
      body: 'Sentado no sofá ele marca 180 bpm, depois traço, depois 72. No braço sem tinta fica estável em 68–74. Series 9.',
      tags: ["fc", "180bpm", "repouso", "tattoo"],
      author: { ...A['seed-dudu'] },
      createdAt: iso(60*970),
      replies: [
        { body: 'Isso me deu susto a primeira vez. Achei arritmia. Era o sensor enlouquecido na tinta.', author: { ...A['seed-raf'] }, createdAt: iso(60*964), ref: 'a1' },
        { body: 'Quando o sinal fica ruim, o relógio confunde barulho com batimento e inventa um número alto. Depois perde o fio e mostra traço.', author: { ...A['seed-edu'] }, createdAt: iso(60*958), ref: 'a1c', parentRef: 'a1' },
        { body: 'Desativei notificações de FC alta pra não pirar. Não resolve a causa.', author: { ...A['seed-lu'] }, createdAt: iso(60*951), ref: 'a2' },
        { body: 'Avisos falsos são o mesmo problema: sinal sujo e o relógio confiante demais num pico errado.', author: { ...A['seed-chris'] }, createdAt: iso(60*943), parentRef: 'a2' },
        { body: 'No outro braço nunca inventou 180. Acabou a teoria da ansiedade.', author: { ...A['seed-rita'] }, createdAt: iso(60*939), parentRef: 'a1c' },
        { ...officialReply('Leituras absurdas em repouso com buracos no meio costumam vir de sinal confuso sob tinta. O Sensor Tattoo Fix estabiliza a leitura para o relógio parar de inventar picos. Acesse nossos canais e adquira nossas lentes.', iso(60*934)), ref: 'a3', parentRef: 'a1c' }
      ]
    }
  ].map((t) => ({ ...t, lang: 'pt' }));
  const en = [
    {
      title: 'Apple Watch will not stop asking for my passcode',
      body: 'Black ink right under the sensor. My Ultra locks, asks for the passcode again, and kills notifications. I tightened the band until it hurt and cleaned the glass with alcohol. It comes back in two hours.',
      tags: ["apple-watch", "passcode", "detection", "tattoo"],
      author: { ...A['seed-guga'] },
      createdAt: iso(60*52),
      replies: [
        { body: 'Same torture. At checkout Apple Pay also dies because it thinks I took the watch off.', author: { ...A['seed-kai'] }, createdAt: iso(60*46), ref: 'a1' },
        { body: 'I switched to the arm without ink and it stopped. On the tattooed arm it still asks mid-workday.', author: { ...A['seed-dudu'] }, createdAt: iso(60*42), ref: 'a1b', parentRef: 'a1' },
        { body: 'Switching arms did nothing for me: both have coverage over the sensor area.', author: { ...A['seed-bruno'] }, createdAt: iso(60*37), parentRef: 'a1b' },
        { body: 'Apple Watch uses a little light on the back to know it is still on your wrist. Dense ink eats that light, it thinks you took it off, and keeps asking for the passcode — not a random software bug.', author: { ...A['seed-chris'] }, createdAt: iso(60*31), ref: 'a1c', parentRef: 'a1' },
        { body: 'I also turned off Unlock with iPhone thinking it would help. Zero difference.', author: { ...A['seed-felipe'] }, createdAt: iso(60*24), ref: 'a2' },
        { ...officialReply('When wrist detection flickers, Apple Watch tightens security and asks for a passcode as if it were removed. Sensor Tattoo Fix helps the sensor read better in that area. Visit our channels and get our lenses.', iso(60*16)), ref: 'a3', parentRef: 'a1c' }
      ]
    },
    {
      title: 'Sleep tracking is completely dead',
      body: 'I sleep 11pm–6am and the Watch shows 48 minutes or insufficient data. On the arm without a tattoo it logs the whole night. Already updated watchOS and iPhone.',
      tags: ["sleep", "apple-watch", "tattoo", "tracking"],
      author: { ...A['seed-marina'] },
      createdAt: iso(60*86),
      replies: [
        { body: 'I lose REM stages every night. The app marks me awake in the middle of sleep.', author: { ...A['seed-diego'] }, createdAt: iso(60*80), ref: 'a1' },
        { body: 'Sleep needs a steady heart-rate reading for hours. When the signal gets bad, the app cuts whole chunks and the session becomes insufficient data.', author: { ...A['seed-edu'] }, createdAt: iso(60*75), ref: 'a1b', parentRef: 'a1' },
        { body: 'I slept with a tighter band and woke with a red mark. Still shows 1h.', author: { ...A['seed-andre'] }, createdAt: iso(60*69), ref: 'a2' },
        { body: 'Overtightening hurts circulation and makes the signal worse. Not a fix.', author: { ...A['seed-marcelo'] }, createdAt: iso(60*62), parentRef: 'a2' },
        { body: 'Same on Amazfit: a 40-minute nap after a full night. Not just Apple.', author: { ...A['seed-fernanda'] }, createdAt: iso(60*54), parentRef: 'a1b' },
        { ...officialReply('Overnight tracking fails when the sensor reading stays irregular for hours. Sensor Tattoo Fix stabilizes that reading on a tattooed wrist. Visit our channels and get our lenses.', iso(60*50)), ref: 'a3', parentRef: 'a1b' }
      ]
    },
    {
      title: 'Which Apple Watch works best with tattoos?',
      body: 'Choosing between SE 2, Series 10 and Ultra 2. Dense tattoo on dominant wrist. Is Ultra worth it or will they all struggle the same?',
      tags: ["apple-watch", "model", "compatibility", "tattoo"],
      author: { ...A['seed-pedro'] },
      createdAt: iso(60*120),
      replies: [
        { body: 'On Ultra 2. Still passcode spam. Better hardware, same ink problem.', author: { ...A['seed-camila'] }, createdAt: iso(60*114), ref: 'a1' },
        { body: 'Newer Series have a slightly better sensor, but they still measure the same way: light on the back of the watch. The model alone does not beat black ink over the sensor.', author: { ...A['seed-chris'] }, createdAt: iso(60*108), ref: 'a1c', parentRef: 'a1' },
        { body: 'Series 9 here. Worse than my husband\'s without tattoos. Never tried SE.', author: { ...A['seed-rafa'] }, createdAt: iso(60*101), ref: 'a2' },
        { body: 'Went SE to 9 hoping it would fix it. Almost the same drama. Money wasted.', author: { ...A['seed-henrique'] }, createdAt: iso(60*93), parentRef: 'a2' },
        { body: 'Honestly: if ink covers the sensor, every generation struggles. Do not buy Ultra just for that.', author: { ...A['seed-carlos'] }, createdAt: iso(60*89), parentRef: 'a1c' },
        { ...officialReply('Generations change the sensor a bit, but black ink still gets in the way. Sensor Tattoo Fix exists for that problem, regardless of model. Visit our channels and get our lenses.', iso(60*84)), ref: 'a3', parentRef: 'a1c' }
      ]
    },
    {
      title: 'Apple Pay quits for no reason',
      body: 'HR still shows a number sometimes. At checkout Pay locks and asks for a passcode. Feels like wrist detect broke only for payments.',
      tags: ["apple-pay", "payment", "detection", "tattoo"],
      author: { ...A['seed-pri'] },
      createdAt: iso(60*154),
      replies: [
        { body: 'For me Pay died first. Then the passcode spam started.', author: { ...A['seed-rodrigo'] }, createdAt: iso(60*148), ref: 'a1' },
        { body: 'For payments, the watch needs to be sure it is still on your wrist. That bar is stricter than continuous HR — a borderline signal blocks Pay before the BPM chart dies.', author: { ...A['seed-edu'] }, createdAt: iso(60*141), ref: 'a1c', parentRef: 'a1' },
        { body: 'Thought it was the card. Removed and re-added it. It was not.', author: { ...A['seed-daniel'] }, createdAt: iso(60*133), ref: 'a2' },
        { body: 'Reset the Watch and restored a backup. Only better on the arm without ink.', author: { ...A['seed-marina'] }, createdAt: iso(60*129), parentRef: 'a2' },
        { body: 'Galaxy Google Wallet does something similar. Not Apple-only.', author: { ...A['seed-ricardo'] }, createdAt: iso(60*124), parentRef: 'a1c' },
        { ...officialReply('Tap-to-pay is often first to fail when wrist detection gets unsure. Sensor Tattoo Fix improves that reading. Visit our channels and get our lenses.', iso(60*118)), ref: 'a3', parentRef: 'a1c' }
      ]
    },
    {
      title: 'Is Garmin actually better on tattooed wrists?',
      body: 'Tired of Apple passcode spam. Looking at Forerunner 965 / Fenix. Dense wrist ink folks: real improvement or just a different kind of pain?',
      tags: ["garmin", "apple-watch", "comparison", "tattoo"],
      author: { ...A['seed-bruno'] },
      createdAt: iso(60*188),
      replies: [
        { body: 'On Fenix HR still fails at the gym. Less passcode drama, but a sensor is a sensor.', author: { ...A['seed-leandro'] }, createdAt: iso(60*182), ref: 'a1' },
        { body: 'Garmin also measures heart rate with light on the back of the watch. It is less dramatic about thinking you took it off — but HR gaps and blood oxygen (SpO2) issues on black ink remain.', author: { ...A['seed-chris'] }, createdAt: iso(60*174), ref: 'a1c', parentRef: 'a1' },
        { body: 'Switched thinking new life. Still holes in the chart. Just traded the kind of annoyance.', author: { ...A['seed-gustavo'] }, createdAt: iso(60*170), ref: 'a2' },
        { body: 'Disagree a bit: on the 955 detection is less annoying. HR fails, but daily life is fine.', author: { ...A['seed-joao'] }, createdAt: iso(60*165), parentRef: 'a2' },
        { body: 'On Forerunner workout auto-pause still happens. Do not buy expecting a miracle against the ink.', author: { ...A['seed-thiago'] }, createdAt: iso(60*159), parentRef: 'a2' },
        { ...officialReply('Switching brands changes screens and lock behavior, but ink still blocks the sensor. Sensor Tattoo Fix targets that wrist reading, not only each brand\'s symptom. Visit our channels and get our lenses.', iso(60*152)), ref: 'a3', parentRef: 'a1c' }
      ]
    },
    {
      title: 'Is switching Apple to Garmin worth it?',
      body: 'Almost selling the Ultra after a touch-up covered the sensor. Does switching fix detection or do I just spend again on the wrong ecosystem?',
      tags: ["apple-watch", "garmin", "switch", "tattoo"],
      author: { ...A['seed-alex'] },
      createdAt: iso(60*222),
      replies: [
        { body: 'I switched. Lost wrist iMessage and gained a different HR failure. Would not go back just for tattoos.', author: { ...A['seed-lucas'] }, createdAt: iso(60*216), ref: 'a1' },
        { body: 'If the goal is the watch reading through dense ink, changing brands does not change that black ink swallows the sensor light. Apps and menus change; the wrist problem stays the same.', author: { ...A['seed-edu'] }, createdAt: iso(60*212), ref: 'a1c', parentRef: 'a1' },
        { body: 'Stayed on Apple and focused on what sits between the sensor and the skin. Switching brands would be overkill for me.', author: { ...A['seed-eduardo'] }, createdAt: iso(60*207), ref: 'a2' },
        { body: 'Agree. The problem was the wrist, not the logo on the box.', author: { ...A['seed-vini'] }, createdAt: iso(60*201), parentRef: 'a2' },
        { body: 'Some swear by Garmin. I am in the nothing really changed camp.', author: { ...A['seed-gabriel'] }, createdAt: iso(60*194), ref: 'a3' },
        { ...officialReply('Before swapping your whole ecosystem, look at the cause: the sensor does not read well on a tattooed wrist. Sensor Tattoo Fix was designed for that without forcing you off Apple or Garmin. Visit our channels and get our lenses.', iso(60*186)), ref: 'a4', parentRef: 'a1c' }
      ]
    },
    {
      title: 'Galaxy Watch loses HR at the gym',
      body: 'On the couch HR still shows. On the rower and squats my Galaxy 6 Classic chart becomes a desert. Sweat + black ink = nothing.',
      tags: ["galaxy-watch", "gym", "heart-rate", "tattoo"],
      author: { ...A['seed-felipe'] },
      createdAt: iso(60*256),
      replies: [
        { body: 'Mine dies exactly on deadlift sets. At rest between sets it comes back half wrong.', author: { ...A['seed-ana'] }, createdAt: iso(60*250), ref: 'a1' },
        { body: 'While moving, the heart-rate sensor already gets confused easily. Black ink makes it worse and the watch throws readings away — workouts fill with gaps.', author: { ...A['seed-chris'] }, createdAt: iso(60*245), ref: 'a1c', parentRef: 'a1' },
        { body: 'Disabled auto-pause and the chart is still full of holes. Not just a screen setting.', author: { ...A['seed-marcos'] }, createdAt: iso(60*239), ref: 'a2' },
        { body: 'Swapped the stock band for a tighter one. Helped maybe 10%. Rest still garbage.', author: { ...A['seed-juliana'] }, createdAt: iso(60*232), parentRef: 'a2' },
        { body: 'Chest strap with Polar looks clean. On the tattooed wrist Galaxy invents numbers.', author: { ...A['seed-leo'] }, createdAt: iso(60*224), parentRef: 'a1c' },
        { ...officialReply('Sweaty moving workouts make dark-ink failures worse. Sensor Tattoo Fix stabilizes wrist reading so the sensor works again. Visit our channels and get our lenses.', iso(60*220)), ref: 'a3', parentRef: 'a1c' }
      ]
    },
    {
      title: 'Galaxy Watch keeps locking on my arm',
      body: 'Galaxy Watch 5 Pro locks itself and asks for the PIN several times a day. Band is snug; it happens exactly over the black ink on my forearm.',
      tags: ["galaxy-watch", "lock", "pin", "tattoo"],
      author: { ...A['seed-diego'] },
      createdAt: iso(60*290),
      replies: [
        { body: 'Thought it was a One UI update. Rolled back and the locking came back the same.', author: { ...A['seed-renato'] }, createdAt: iso(60*284), ref: 'a1' },
        { body: 'Samsung also uses light on the back to decide the watch is on your wrist. When that reading vanishes, security lock fires — same idea as Apple, different screens.', author: { ...A['seed-edu'] }, createdAt: iso(60*278), ref: 'a1c', parentRef: 'a1' },
        { body: 'Happened on my Watch 4. Switching arms helped. Tattooed arm still locks.', author: { ...A['seed-patricia'] }, createdAt: iso(60*271), ref: 'a2' },
        { body: 'I have no clear arm. Both are covered. I lock all day.', author: { ...A['seed-fernando'] }, createdAt: iso(60*263), parentRef: 'a2' },
        { body: 'I turned off auto-lock and lost security. Terrible trade.', author: { ...A['seed-jordan'] }, createdAt: iso(60*259), parentRef: 'a1c' },
        { ...officialReply('Repeated locks usually follow wrist-detection failures, not necessarily a factory defect. Sensor Tattoo Fix improves reading stability in that area. Visit our channels and get our lenses.', iso(60*254)), ref: 'a3', parentRef: 'a1c' }
      ]
    },
    {
      title: 'Does Huawei GT fail on tattoos too?',
      body: 'Want a GT 5 for battery life. Dominant wrist is almost all black. Does Huawei\'s sensor struggle the same or handle it better?',
      tags: ["huawei", "gt", "battery", "tattoo"],
      author: { ...A['seed-andre'] },
      createdAt: iso(60*324),
      replies: [
        { body: 'GT 4 here. Sleep and HR fail on the same arm. Great battery, ordinary sensor.', author: { ...A['seed-jeff'] }, createdAt: iso(60*318), ref: 'a1' },
        { body: 'Huawei GT also measures with light on the back: heart rate and blood oxygen (SpO2). Black ink still gets in the way, no matter the 14-day battery.', author: { ...A['seed-chris'] }, createdAt: iso(60*311), ref: 'a1c', parentRef: 'a1' },
        { body: 'Bought thinking a Chinese brand would magic it. Nope. Same holes in the chart.', author: { ...A['seed-hunt'] }, createdAt: iso(60*303), ref: 'a2' },
        { body: 'Long battery made me stay. I accept holey HR in workouts, but it annoys me.', author: { ...A['seed-writer'] }, createdAt: iso(60*299), parentRef: 'a2' },
        { ...officialReply('Long battery life does not change the fact that ink blocks the sensor. Sensor Tattoo Fix helps that reading on the watch back. Visit our channels and get our lenses.', iso(60*294)), ref: 'a3', parentRef: 'a1c' }
      ]
    },
    {
      title: 'Amazfit stopped recording every night',
      body: 'After a wrist tattoo touch-up, my GTR 4 only logs random naps. Used to show 7h. Clean sensor, new band.',
      tags: ["amazfit", "sleep", "tattoo", "night"],
      author: { ...A['seed-lucas'] },
      createdAt: iso(60*358),
      replies: [
        { body: 'Bip U Pro here — same after the tattoo. Zepp stays empty.', author: { ...A['seed-huck'] }, createdAt: iso(60*352), ref: 'a1' },
        { body: 'Amazfit/Zepp sleep apps throw out nights where heart rate keeps dropping out. Ink on the sensor = missing stages and a near-empty session.', author: { ...A['seed-edu'] }, createdAt: iso(60*344), ref: 'a1b', parentRef: 'a1' },
        { body: 'Tried sleeping with the watch on my ankle. Absurd and still useless.', author: { ...A['seed-moth'] }, createdAt: iso(60*340), ref: 'a2' },
        { body: 'Ankle HR for workouts is weird too. Not a good shortcut.', author: { ...A['seed-omens'] }, createdAt: iso(60*335), parentRef: 'a2' },
        { body: 'Worked before the touch-up. New ink is much more saturated under the sensor.', author: { ...A['seed-syrup'] }, createdAt: iso(60*329), parentRef: 'a1b' },
        { ...officialReply('When overnight heart rate keeps dropping out, the sleep app loses the night. Sensor Tattoo Fix improves that reading on a tattooed wrist. Visit our channels and get our lenses.', iso(60*322)), ref: 'a3', parentRef: 'a1b' }
      ]
    },
    {
      title: 'Why do some tattoos interfere and others do not?',
      body: 'I have light watercolor on one side and solid black on the other. The watch only dies when it slides onto the black. Why does that happen?',
      tags: ["ink", "optics", "ppg", "tattoo"],
      author: { ...A['seed-ricardo'] },
      createdAt: iso(60*392),
      replies: [
        { body: 'Solid black ink swallows the light the watch uses for heart rate. Lighter colors bounce more light back to the sensor. That is why only the black block kills the reading.', author: { ...A['seed-chris'] }, createdAt: iso(60*386), ref: 'a1' },
        { body: 'On my arm gray shading hurts less than solid fill. Matches what Chris said.', author: { ...A['seed-edurunner'] }, createdAt: iso(60*382), ref: 'a1b', parentRef: 'a1' },
        { body: 'I only have fine line work and the Watch barely complains. Density matters more than “having a tattoo”.', author: { ...A['seed-malu'] }, createdAt: iso(60*377), ref: 'a2' },
        { body: 'Beyond color, ink thickness and scar under the ink also change things. Two “same” blacks can read very differently on the watch.', author: { ...A['seed-edu'] }, createdAt: iso(60*371), ref: 'a2b', parentRef: 'a2' },
        { body: 'Learned the hard way: sensor on the fill → HR gone. Two centimeters aside → back.', author: { ...A['seed-pri'] }, createdAt: iso(60*364), parentRef: 'a1b' },
        { ...officialReply('Interference depends heavily on color, density, and position under the sensor — not simply “having a tattoo”. Sensor Tattoo Fix was built to stabilize the reading in those cases. Visit our channels and get our lenses.', iso(60*356)), ref: 'a3', parentRef: 'a1' }
      ]
    },
    {
      title: 'Can a tattoo damage the watch?',
      body: 'Honest question: can running the sensor over ink burn the little light, heat the skin, or damage the sensor over time?',
      tags: ["safety", "led", "skin", "tattoo"],
      author: { ...A['seed-ana'] },
      createdAt: iso(60*426),
      replies: [
        { body: 'In practice the little light does not “burn” the ink. The sensor just gets less light back — the watch misreads, but the hardware does not break because of a tattoo.', author: { ...A['seed-edu'] }, createdAt: iso(60*420), ref: 'a1' },
        { body: 'I got paranoid about heat. My Ultra warms the same on the other arm. It is a reading issue, not temperature.', author: { ...A['seed-bela'] }, createdAt: iso(60*415), ref: 'a1b', parentRef: 'a1' },
        { body: 'Apple support said tattoos do not void warranty, but also do not “fix” detection.', author: { ...A['seed-marcinha'] }, createdAt: iso(60*409), ref: 'a2' },
        { body: 'Smartwatch lights run at low power. Ink changes what comes back to the sensor, not the usual lifespan of the light.', author: { ...A['seed-chris'] }, createdAt: iso(60*402), parentRef: 'a2' },
        { ...officialReply('A tattoo usually does not damage the watch; it interferes with the sensor reading. Sensor Tattoo Fix helps that reading without changing the ink. Visit our channels and get our lenses.', iso(60*394)), ref: 'a3', parentRef: 'a1' }
      ]
    },
    {
      title: 'It worked before the tattoo, now nothing',
      body: 'Two years of perfect Series 8. Got a wrist fill on Friday and by Saturday HR was already full of holes. Changed nothing in software.',
      tags: ["before-after", "tattoo", "heart-rate", "apple-watch"],
      author: { ...A['seed-marcos'] },
      createdAt: iso(60*460),
      replies: [
        { body: 'Identical story. Before the session the Watch was a saint. After it became a brick on my wrist.', author: { ...A['seed-rick'] }, createdAt: iso(60*454), ref: 'a1' },
        { body: 'The watch “learned” your clear skin. After ink the reading changes and it starts rejecting beats it used to accept.', author: { ...A['seed-chris'] }, createdAt: iso(60*448), ref: 'a1c', parentRef: 'a1' },
        { body: 'Waited three weeks to heal. Did not come back. Not temporary swelling.', author: { ...A['seed-nati'] }, createdAt: iso(60*441), ref: 'a2' },
        { body: 'Same wait here. Healed, ink settled, sensor still blind on the fill.', author: { ...A['seed-raf'] }, createdAt: iso(60*433), parentRef: 'a2' },
        { body: 'New band and reset did not bring the old reading back. The watch did not forget; the skin changed.', author: { ...A['seed-lu'] }, createdAt: iso(60*429), parentRef: 'a1c' },
        { ...officialReply('If the watch was stable before and worsened right after the tattoo, the usual cause is ink blocking the sensor. Sensor Tattoo Fix helps the watch read that area again. Visit our channels and get our lenses.', iso(60*424)), ref: 'a3', parentRef: 'a1c' }
      ]
    },
    {
      title: 'Both arms are tattooed. Now what?',
      body: 'My hack was switching wrists. Yesterday I finished the second arm and now neither side recognizes the Watch properly. No plan B.',
      tags: ["both-arms", "tattoo", "options", "sensor"],
      author: { ...A['seed-juliana'] },
      createdAt: iso(60*494),
      replies: [
        { body: 'Welcome to the club. I found out too late. Ankle is not a serious solution for me.', author: { ...A['seed-rita'] }, createdAt: iso(60*488), ref: 'a1' },
        { body: 'I use a chest strap for workouts and the Watch only for notifications. Works, but misses the point of a smartwatch.', author: { ...A['seed-simo'] }, createdAt: iso(60*481), ref: 'a1b', parentRef: 'a1' },
        { body: 'With no clear skin under the sensor, you depend 100% on the reading working over ink. No backup arm — the signal has to improve where the watch sits.', author: { ...A['seed-edu'] }, createdAt: iso(60*473), ref: 'a1c', parentRef: 'a1b' },
        { body: 'Thought about selling the watch. Have not yet because I still want sleep and payments on the wrist.', author: { ...A['seed-guga'] }, createdAt: iso(60*469), ref: 'a2' },
        { body: 'Same dilemma. Both arms tattooed kill the cheap just-switch-sides fix.', author: { ...A['seed-kai'] }, createdAt: iso(60*464), parentRef: 'a2' },
        { ...officialReply('With both wrists covered, switching-arm workarounds disappear. Sensor Tattoo Fix was designed for people who need stable reading on the tattooed area. Visit our channels and get our lenses.', iso(60*458)), ref: 'a3', parentRef: 'a1c' }
      ]
    },
    {
      title: 'Workout keeps pausing by itself',
      body: '10k run: Watch pauses, resumes, pauses again. Disabled auto-pause and it still happens. Tattoo under the sensor.',
      tags: ["workout", "autopause", "running", "tattoo"],
      author: { ...A['seed-kai'] },
      createdAt: iso(60*528),
      replies: [
        { body: 'Drove me crazy. Felt like I had taken the watch off in the middle of the avenue.', author: { ...A['seed-dudu'] }, createdAt: iso(60*522), ref: 'a1' },
        { body: 'Many watches pause a workout when they think you took it off or when heart rate gets shaky while running. Ink and running bounce trigger that constantly.', author: { ...A['seed-chris'] }, createdAt: iso(60*514), ref: 'a1c', parentRef: 'a1' },
        { body: 'Garmin auto-pause messed with me too. Not Apple-only.', author: { ...A['seed-bruno'] }, createdAt: iso(60*510), ref: 'a2' },
        { body: 'I screen-recorded it. You can see the “watch removed” icon flicker without me touching anything.', author: { ...A['seed-felipe'] }, createdAt: iso(60*505), parentRef: 'a2' },
        { body: 'Tighter band cut pauses by maybe 30%. The rest remains.', author: { ...A['seed-diego'] }, createdAt: iso(60*499), parentRef: 'a1c' },
        { ...officialReply('Phantom pauses on runs usually reflect unstable wrist detection under ink, not only workout settings. Sensor Tattoo Fix helps keep the reading stable. Visit our channels and get our lenses.', iso(60*492)), ref: 'a3', parentRef: 'a1c' }
      ]
    },
    {
      title: 'Does clear tape actually work?',
      body: 'Saw the clear adhesive tape trick on the sensor. Tried it on Series 8: detection better for about 3h, then sticky mess and lint.',
      tags: ["diy", "tape", "hack", "tattoo"],
      author: { ...A['seed-vini'] },
      createdAt: iso(60*562),
      replies: [
        { body: 'Lasted one workout for me. Sweat dissolved the glue and HR vanished again.', author: { ...A['seed-andre'] }, createdAt: iso(60*556), ref: 'a1' },
        { body: 'Tape can fool the sensor for a few hours. Not a stable fix: it dirties, yellows, and bubbles.', author: { ...A['seed-edu'] }, createdAt: iso(60*552), ref: 'a1c', parentRef: 'a1' },
        { body: 'I used kitchen PVC film. Even worse — slips and leaves greasy residue.', author: { ...A['seed-marcelo'] }, createdAt: iso(60*547), ref: 'a2' },
        { body: 'Any sticky hack on the rear glass makes me worry about warranty.', author: { ...A['seed-fernanda'] }, createdAt: iso(60*541), parentRef: 'a2' },
        { body: 'Works a bit then becomes dirt. Agree with SensorGuru: not a real solution.', author: { ...A['seed-camila'] }, createdAt: iso(60*534), parentRef: 'a1c' },
        { ...officialReply('Improvised tapes and films can fool the sensor briefly, but degrade with sweat and dirt. Sensor Tattoo Fix was built for a stable reading, not a temporary hack. Visit our channels and get our lenses.', iso(60*526)), ref: 'a3', parentRef: 'a1c' }
      ]
    },
    {
      title: 'Furniture silicone pad on the sensor',
      body: 'Saw people sticking clear table bumpers on the sensor glass. Sounds like a joke. Has anyone actually tested it?',
      tags: ["diy", "silicone", "bumper", "sensor"],
      author: { ...A['seed-renato'] },
      createdAt: iso(60*596),
      replies: [
        { body: 'Tried it. Watch sat higher and detection got worse. Table turn.', author: { ...A['seed-pedro'] }, createdAt: iso(60*590), ref: 'a1' },
        { body: 'Lifting the watch back off the skin almost always worsens heart-rate reading. Thick silicone is the opposite of what the sensor needs.', author: { ...A['seed-chris'] }, createdAt: iso(60*585), ref: 'a1c', parentRef: 'a1' },
        { body: 'A friend swears the thin one almost worked. On my Watch 7, no.', author: { ...A['seed-rafa'] }, createdAt: iso(60*579), ref: 'a2' },
        { body: 'Almost does not count. I want something that survives a sweaty workout.', author: { ...A['seed-henrique'] }, createdAt: iso(60*572), parentRef: 'a2' },
        { body: 'Also leaves a circular mark on the wrist. Hideous.', author: { ...A['seed-carlos'] }, createdAt: iso(60*564), parentRef: 'a1c' },
        { ...officialReply('Improvised spacers usually lift the sensor off the skin and worsen HR. Sensor Tattoo Fix helps the reading without creating that useless gap. Visit our channels and get our lenses.', iso(60*560)), ref: 'a3', parentRef: 'a1c' }
      ]
    },
    {
      title: 'Is Sensor Tattoo Fix a laser?',
      body: 'The name confused me: does it remove ink, use a laser, or change the tattoo somehow? I do not want to mess with the art.',
      tags: ["sensor-tattoo-fix", "laser", "question", "product"],
      author: { ...A['seed-patricia'] },
      createdAt: iso(60*630),
      replies: [
        { body: 'From what I get it is an interface on the sensor, not a skin treatment. Want official confirmation though.', author: { ...A['seed-rodrigo'] }, createdAt: iso(60*624), ref: 'a1' },
        { body: 'Not a laser and not removal. It is a lens/interface on the sensor: it helps light pass better between the watch back and tattooed skin, without erasing ink.', author: { ...A['seed-edu'] }, createdAt: iso(60*618), ref: 'a1c', parentRef: 'a1' },
        { body: 'Good, because fix in the name scared me too.', author: { ...A['seed-daniel'] }, createdAt: iso(60*611), ref: 'a2' },
        { body: 'Same paranoia. Tattoo took years; I do not want to correct it with strong light.', author: { ...A['seed-marina'] }, createdAt: iso(60*603), parentRef: 'a2' },
        { ...officialReply('Sensor Tattoo Fix is not a laser and does not remove ink: it is a lens/interface that helps the smartwatch sensor read tattooed skin. Visit our channels and get our lenses.', iso(60*599)), ref: 'a3', parentRef: 'a1c' }
      ]
    },
    {
      title: 'Is black ink really worse?',
      body: 'My piece has black, red and yellow. The watch fails only when it slides onto the black area. Does that confirm the theory?',
      tags: ["black-ink", "color", "ppg", "tattoo"],
      author: { ...A['seed-fernando'] },
      createdAt: iso(60*664),
      replies: [
        { body: 'Solid black swallows the sensor light; red and yellow bounce far more back. Your observation matches: black is the worst for heart rate.', author: { ...A['seed-chris'] }, createdAt: iso(60*658), ref: 'a1' },
        { body: 'On my arm yellow barely interferes. Solid black is another planet.', author: { ...A['seed-ricardo'] }, createdAt: iso(60*651), ref: 'a1b', parentRef: 'a1' },
        { body: 'Blood oxygen (SpO2) also uses light through the wrist and suffers on dense black, but continuous HR usually dies first.', author: { ...A['seed-leandro'] }, createdAt: iso(60*643), parentRef: 'a1b' },
        { body: 'That is why artists who get wearables leave an unfilled window under the sensor.', author: { ...A['seed-gustavo'] }, createdAt: iso(60*639), ref: 'a2' },
        { body: 'I already had the fill. A window now would be an expensive cover-up. Need another way out.', author: { ...A['seed-joao'] }, createdAt: iso(60*634), parentRef: 'a2' },
        { ...officialReply('Dense black is the worst case for the heart-rate sensor, exactly as you described. Sensor Tattoo Fix improves the reading there without requiring you to erase the art. Visit our channels and get our lenses.', iso(60*628)), ref: 'a3', parentRef: 'a1' }
      ]
    },
    {
      title: 'Does sweat make tattoo readings worse?',
      body: 'When dry it still reads. Ten minutes into a sweaty run, heart rate disappears completely over the ink.',
      tags: ["sweat", "running", "heart-rate", "tattoo"],
      author: { ...A['seed-edurunner'] },
      createdAt: iso(60*698),
      replies: [
        { body: 'Exactly. Fine at the start, by km 3 it is dashes. Without the tattoo that did not happen.', author: { ...A['seed-thiago'] }, createdAt: iso(60*692), ref: 'a1' },
        { body: 'Sweat creates a film between sensor and skin, and the ink already gets in the way. Together they tank the reading.', author: { ...A['seed-edu'] }, createdAt: iso(60*684), ref: 'a1c', parentRef: 'a1' },
        { body: 'Wiped the sensor mid-workout with my shirt. Came back for two minutes then died again.', author: { ...A['seed-lucas'] }, createdAt: iso(60*680), ref: 'a2' },
        { body: 'On the indoor bike with less dripping sweat it also fails, just later. Not only running.', author: { ...A['seed-eduardo'] }, createdAt: iso(60*675), parentRef: 'a2' },
        { body: 'Water between sensor and skin confuses things even more. Over black ink you are already on the edge — any film makes the reading drop out.', author: { ...A['seed-chris'] }, createdAt: iso(60*669), parentRef: 'a1c' },
        { ...officialReply('Sweat amplifies failure on tattooed wrists by adding an irregular film to an already weak reading. Sensor Tattoo Fix stabilizes that reading. Visit our channels and get our lenses.', iso(60*662)), ref: 'a3', parentRef: 'a1c' }
      ]
    },
    {
      title: 'I thought my watch was defective',
      body: 'I reset it, changed bands and nearly sent it for repair. It works perfectly on the arm without ink. Almost paid shipping for nothing.',
      tags: ["defect", "support", "diagnosis", "tattoo"],
      author: { ...A['seed-camila'] },
      createdAt: iso(60*732),
      replies: [
        { body: 'Almost the same drama. The tech asked for a video and on the clear arm he had no argument.', author: { ...A['seed-alex'] }, createdAt: iso(60*726), ref: 'a1' },
        { body: 'Trying both arms is the cheapest diagnosis: if the watch fails only over ink, it is not a dead unit — the ink is blocking the sensor.', author: { ...A['seed-chris'] }, createdAt: iso(60*722), ref: 'a1c', parentRef: 'a1' },
        { body: 'I had already booked a support pickup. Cancelled after that test.', author: { ...A['seed-vini'] }, createdAt: iso(60*717), ref: 'a2' },
        { body: 'A holey HR chart on only one arm also counts. No need to open the watch.', author: { ...A['seed-gabriel'] }, createdAt: iso(60*711), parentRef: 'a2' },
        { ...officialReply('If the same watch works on the arm without ink, the tattoo blocking the sensor is more likely than a factory defect. Sensor Tattoo Fix addresses that reading. Visit our channels and get our lenses.', iso(60*704)), ref: 'a3', parentRef: 'a1c' }
      ]
    },
    {
      title: 'Found out after tattooing my second arm',
      body: 'My clear arm was the workaround. I tattooed it yesterday and finally learned why the other one never worked. No obvious way out.',
      tags: ["second-arm", "discovery", "tattoo", "detection"],
      author: { ...A['seed-bela'] },
      createdAt: iso(60*766),
      replies: [
        { body: 'Known pain. The good arm hid the problem until you finished the design.', author: { ...A['seed-ana'] }, createdAt: iso(60*760), ref: 'a1' },
        { body: 'While clear skin existed, the watch always had one side that read well. Without it, it gets lost.', author: { ...A['seed-edu'] }, createdAt: iso(60*755), ref: 'a1c', parentRef: 'a1' },
        { body: 'I delayed the second arm because of this. You were braver — or more stubborn.', author: { ...A['seed-marcos'] }, createdAt: iso(60*749), ref: 'a2' },
        { body: 'Stubborn here too. Art first, wearables later. Now I pay the price.', author: { ...A['seed-juliana'] }, createdAt: iso(60*742), parentRef: 'a2' },
        { body: 'No software update invents a reading where ink swallowed the light. Either improve what sits between sensor and skin, or accept gaps.', author: { ...A['seed-chris'] }, createdAt: iso(60*734), parentRef: 'a1c' },
        { ...officialReply('Losing the backup arm makes the cause obvious: ink over the sensor. Sensor Tattoo Fix exists for people who need the sensor to read over the tattooed area. Visit our channels and get our lenses.', iso(60*730)), ref: 'a3', parentRef: 'a1c' }
      ]
    },
    {
      title: 'Which brand struggles least with tattoos?',
      body: 'Apple, Garmin, Samsung, Huawei or Amazfit: does any brand handle dark wrist ink better?',
      tags: ["brands", "comparison", "tattoo", "sensor"],
      author: { ...A['seed-rodrigo'] },
      createdAt: iso(60*800),
      replies: [
        { body: 'Garmin annoys less on lock, but HR is still holey. Samsung PIN-locks. Apple passcode-spams. Amazfit loses sleep. Pick your poison.', author: { ...A['seed-leo'] }, createdAt: iso(60*794), ref: 'a1' },
        { body: 'All measure heart rate with light on the back of the watch. What changes is how often each brand locks or asks for a code — no miracle against black ink.', author: { ...A['seed-chris'] }, createdAt: iso(60*788), ref: 'a1c', parentRef: 'a1' },
        { body: 'I tested Apple and Garmin on the same arm. Neither saved strength workouts.', author: { ...A['seed-renato'] }, createdAt: iso(60*781), ref: 'a2' },
        { body: 'Huawei wins on battery. Sensor still mediocre over fill.', author: { ...A['seed-patricia'] }, createdAt: iso(60*773), parentRef: 'a2' },
        { body: 'If you care about less lock/passcode spam, Garmin/Amazfit. If you care about clean HR under ink, no brand solves it alone.', author: { ...A['seed-edu'] }, createdAt: iso(60*769), parentRef: 'a1c' },
        { ...officialReply('Brand changes lock/app experience, but dark ink blocks the sensor on all of them. Sensor Tattoo Fix works on that reading. Visit our channels and get our lenses.', iso(60*764)), ref: 'a3', parentRef: 'a1c' }
      ]
    },
    {
      title: 'Heart-rate chart is full of gaps',
      body: 'My workout summary looks like Morse code: a few minutes of HR, long blanks, then nonsense spikes. Black tattoo under the sensor.',
      tags: ["heart-rate", "chart", "gaps", "workout"],
      author: { ...A['seed-daniel'] },
      createdAt: iso(60*834),
      replies: [
        { body: 'My Strava looks ridiculous. Zone 5 while resting and zone 0 on a sprint.', author: { ...A['seed-fernando'] }, createdAt: iso(60*828), ref: 'a1' },
        { body: 'When the reading gets too bad, the watch opens gaps in the chart or invents weird values. Ink + motion = mass rejection.', author: { ...A['seed-edu'] }, createdAt: iso(60*821), ref: 'a1c', parentRef: 'a1' },
        { body: 'Thought it was GPS. Turned GPS off and the HR chart stayed holey.', author: { ...A['seed-jordan'] }, createdAt: iso(60*813), ref: 'a2' },
        { body: 'It is not the GPS. It is the heart-rate sensor on the back of the watch getting lost in the black ink.', author: { ...A['seed-chris'] }, createdAt: iso(60*809), parentRef: 'a2' },
        { body: 'A chest strap fixes the chart, but I want the watch working on the wrist.', author: { ...A['seed-jeff'] }, createdAt: iso(60*804), parentRef: 'a1c' },
        { ...officialReply('Holes and ghost spikes in the chart usually come from bad readings under ink. Sensor Tattoo Fix improves signal quality at the source. Visit our channels and get our lenses.', iso(60*798)), ref: 'a3', parentRef: 'a1c' }
      ]
    },
    {
      title: 'Does blood oxygen fail because of tattoos too?',
      body: 'Besides heart rate, the blood oxygen reading in the app errors out almost always. Does ink still get in the way?',
      tags: ["spo2", "oxygen", "sensor", "tattoo"],
      author: { ...A['seed-moth'] },
      createdAt: iso(60*868),
      replies: [
        { body: 'Blood oxygen (SpO2) also uses light through the wrist. Dark ink gets in the way the same way — the watch errors out or invents a value.', author: { ...A['seed-chris'] }, createdAt: iso(60*862), ref: 'a1' },
        { body: 'On my Ultra oxygen measurement sticks on calculating… until I switch arms.', author: { ...A['seed-hunt'] }, createdAt: iso(60*854), ref: 'a1b', parentRef: 'a1' },
        { body: 'HR usually dies first; blood oxygen (SpO2) dies later or together, depending on how dense the ink is.', author: { ...A['seed-edu'] }, createdAt: iso(60*850), parentRef: 'a1b' },
        { body: 'I thought SpO2 would be immune. It is not. Same black area, same failure.', author: { ...A['seed-writer'] }, createdAt: iso(60*845), ref: 'a2' },
        { ...officialReply('SpO2 (blood oxygen) also needs a clean wrist reading; dark ink gets in the way the same. Sensor Tattoo Fix improves that reading. Visit our channels and get our lenses.', iso(60*839)), ref: 'a3', parentRef: 'a1' }
      ]
    },
    {
      title: 'Is a smartwatch worth it with tattoos?',
      body: 'I want sleep, workouts and payments, but both wrists are tattooed. Is buying one a waste or still worth it?',
      tags: ["buying", "worth-it", "tattoo", "smartwatch"],
      author: { ...A['seed-jordan'] },
      createdAt: iso(60*902),
      replies: [
        { body: 'It makes sense if you fix the sensor reading. Without that it becomes an expensive wrist notification brick.', author: { ...A['seed-huck'] }, createdAt: iso(60*896), ref: 'a1' },
        { body: 'Without a stable wrist reading, sleep/HR/Pay stay inconsistent. New hardware does not cancel the ink effect.', author: { ...A['seed-edu'] }, createdAt: iso(60*892), ref: 'a1c', parentRef: 'a1' },
        { body: 'I bought anyway for the apps. I ignore HR. I do not recommend that rotten peace.', author: { ...A['seed-moth'] }, createdAt: iso(60*887), ref: 'a2' },
        { body: 'If budget is tight, fix the sensor reading before upgrading to a newer model.', author: { ...A['seed-omens'] }, createdAt: iso(60*881), parentRef: 'a2' },
        { body: 'Buy if the watch\'s features matter to you — but plan something that helps the sensor read through ink, not as a footnote.', author: { ...A['seed-chris'] }, createdAt: iso(60*874), parentRef: 'a1c' },
        { ...officialReply('A smartwatch still makes sense with tattoos if the sensor reading is stabilized. Sensor Tattoo Fix exists exactly for that scenario. Visit our channels and get our lenses.', iso(60*866)), ref: 'a3', parentRef: 'a1c' }
      ]
    },
    {
      title: 'Megathread: epoxy sticker works, but...',
      body: 'Stuck a clear epoxy sticker on the Ultra sensor. Detection came back. But the charger does not seat right, ECG died, and edges lifted on day two. Open thread for honest reports.',
      tags: ["epoxy", "diy", "megathread", "sensor"],
      author: { ...A['seed-huck'] },
      createdAt: iso(60*936),
      replies: [
        { body: 'Same setup. Detection ok for 48h. In the shower a corner peeled and water got in.', author: { ...A['seed-syrup'] }, createdAt: iso(60*930), ref: 'a1' },
        { body: 'Water + improvised glue = fast track to residue on the glass. Had to clean it carefully.', author: { ...A['seed-chris'] }, createdAt: iso(60*925), ref: 'a1b', parentRef: 'a1' },
        { body: 'Ultra MagSafe got loose. Sometimes charges, sometimes not. Hate it.', author: { ...A['seed-edurunner'] }, createdAt: iso(60*919), ref: 'a1c', parentRef: 'a1b' },
        { body: 'The epoxy sticker lifts the watch back: sometimes detection improves, but charging gets loose and ECG (the watch electrocardiogram) stops working.', author: { ...A['seed-edu'] }, createdAt: iso(60*912), ref: 'a1d', parentRef: 'a1c' },
        { body: 'ECG on my Series 9 zeroed with the sticker. Removed it and it returned. Ridiculous trade.', author: { ...A['seed-malu'] }, createdAt: iso(60*904), ref: 'a1e', parentRef: 'a1d' },
        { body: 'Trimmed the sticker smaller than the sensor ring. Charged better, detection got worse again.', author: { ...A['seed-pri'] }, createdAt: iso(60*900), ref: 'a2' },
        { body: 'You improve the reading a bit and break charging/ECG in the same move. DIY epoxy was not made for this — hence the conflict.', author: { ...A['seed-chris'] }, createdAt: iso(60*895), ref: 'a2b', parentRef: 'a2' },
        { body: 'Sweat killed mine in a week. The edge became a dirty trail. Zero glamour.', author: { ...A['seed-bela'] }, createdAt: iso(60*889), ref: 'a2c', parentRef: 'a2b' },
        { body: 'Agree with TechRunner. Works until it does not — and it always breaks something else.', author: { ...A['seed-marcinha'] }, createdAt: iso(60*882), ref: 'a2d', parentRef: 'a2c' },
        { body: 'People sell epoxy kits on Instagram as the definitive fix. Be careful.', author: { ...A['seed-rick'] }, createdAt: iso(60*874), ref: 'a2e', parentRef: 'a2d' },
        { body: 'I went back to the clear arm. Epoxy was just an expensive sticky experiment.', author: { ...A['seed-nati'] }, createdAt: iso(60*870), parentRef: 'a2e' },
        { ...officialReply('Reports like these are common: epoxy hacks can improve detection for a while while hurting charging, ECG and durability. Sensor Tattoo Fix was made to help the sensor for real, without that improvisation. Visit our channels and get our lenses.', iso(60*865)), ref: 'a3', parentRef: 'a2b' }
      ]
    },
    {
      title: 'Watch invents 180 bpm while I rest',
      body: 'Sitting on the couch it says 180 bpm, then a dash, then 72. On the arm without ink it stays 68–74. Series 9.',
      tags: ["heart-rate", "180bpm", "rest", "tattoo"],
      author: { ...A['seed-dudu'] },
      createdAt: iso(60*970),
      replies: [
        { body: 'Scared me the first time. Thought arrhythmia. It was the sensor going nuts on the ink.', author: { ...A['seed-raf'] }, createdAt: iso(60*964), ref: 'a1' },
        { body: 'When the signal gets bad, the watch confuses noise with a beat and invents a high number. Then it loses the thread and shows a dash.', author: { ...A['seed-edu'] }, createdAt: iso(60*958), ref: 'a1c', parentRef: 'a1' },
        { body: 'Turned off high HR notifications so I would not freak out. Does not fix the cause.', author: { ...A['seed-lu'] }, createdAt: iso(60*951), ref: 'a2' },
        { body: 'False alerts are the same problem: dirty signal and the watch too confident on a wrong peak.', author: { ...A['seed-chris'] }, createdAt: iso(60*943), parentRef: 'a2' },
        { body: 'On the other arm it never invented 180. So much for the anxiety theory.', author: { ...A['seed-rita'] }, createdAt: iso(60*939), parentRef: 'a1c' },
        { ...officialReply('Absurd resting readings with gaps in between usually come from a confused signal under ink. Sensor Tattoo Fix stabilizes the reading so the watch stops inventing peaks. Visit our channels and get our lenses.', iso(60*934)), ref: 'a3', parentRef: 'a1c' }
      ]
    }
  ].map((t) => ({ ...t, lang: 'en' }));
  const it = [
    {
      title: 'Apple Watch continua a chiedere il codice',
      body: 'Inchiostro nero proprio sotto il sensore. L\'Ultra si blocca, richiede il codice e uccide le notifiche. Ho stretto il cinturino fino a far male e pulito il vetro con alcol. Torna dopo due ore.',
      tags: ["apple-watch", "codice", "rilevamento", "tattoo"],
      author: { ...A['seed-guga'] },
      createdAt: iso(60*52),
      replies: [
        { body: 'Stessa tortura. Alla cassa Apple Pay muore perché pensa che abbia tolto l\'orologio.', author: { ...A['seed-kai'] }, createdAt: iso(60*46), ref: 'a1' },
        { body: 'Ho cambiato sul braccio senza inchiostro e ha smesso. Sul tatuato continua a chiedere il codice a metà giornata.', author: { ...A['seed-dudu'] }, createdAt: iso(60*42), ref: 'a1b', parentRef: 'a1' },
        { body: 'Cambiare braccio non ha risolto: entrambi hanno copertura sulla zona del sensore.', author: { ...A['seed-bruno'] }, createdAt: iso(60*37), parentRef: 'a1b' },
        { body: 'L\'Apple Watch usa una lucina sul fondo per capire se è ancora al polso. L\'inchiostro denso mangia quella luce, pensa che tu l\'abbia tolto e continua a chiedere il codice — non è un bug a caso.', author: { ...A['seed-chris'] }, createdAt: iso(60*31), ref: 'a1c', parentRef: 'a1' },
        { body: 'Ho anche disattivato Sblocca con iPhone pensando aiutasse. Zero differenza.', author: { ...A['seed-felipe'] }, createdAt: iso(60*24), ref: 'a2' },
        { ...officialReply('Quando il rilevamento del polso oscilli, Apple Watch rafforza la sicurezza e chiede il codice come se fosse stato rimosso. Sensor Tattoo Fix aiuta il sensore a leggere meglio in quella zona. Accedi ai nostri canali e acquista le nostre lenti.', iso(60*16)), ref: 'a3', parentRef: 'a1c' }
      ]
    },
    {
      title: 'Il monitoraggio del sonno è morto',
      body: 'Dormo dalle 23 alle 6 e il Watch segna 48 minuti o dati insufficienti. Sul braccio senza tatuaggio registra tutta la notte. Già aggiornato watchOS e iPhone.',
      tags: ["sonno", "apple-watch", "tattoo", "tracking"],
      author: { ...A['seed-marina'] },
      createdAt: iso(60*86),
      replies: [
        { body: 'Perdo le fasi REM ogni notte. L\'app mi segna sveglio nel bel mezzo del sonno.', author: { ...A['seed-diego'] }, createdAt: iso(60*80), ref: 'a1' },
        { body: 'Per il sonno serve che il sensore del battito legga bene tutta la notte. Quando il segnale peggiora, l\'app taglia pezzi e la sessione diventa “dati insufficienti”.', author: { ...A['seed-edu'] }, createdAt: iso(60*75), ref: 'a1b', parentRef: 'a1' },
        { body: 'Ho dormito col cinturino più stretto e mi sono svegliato col segno rosso. Segna ancora 1h.', author: { ...A['seed-andre'] }, createdAt: iso(60*69), ref: 'a2' },
        { body: 'Stringere troppo peggiora la circolazione e il segnale. Non è una soluzione.', author: { ...A['seed-marcelo'] }, createdAt: iso(60*62), parentRef: 'a2' },
        { body: 'Stesso su Amazfit: pisolino di 40 minuti dopo una notte intera. Non è solo Apple.', author: { ...A['seed-fernanda'] }, createdAt: iso(60*54), parentRef: 'a1b' },
        { ...officialReply('Il tracking notturno fallisce quando la lettura del sensore resta irregolare per ore. Sensor Tattoo Fix stabilizza quella lettura sul polso tatuato. Accedi ai nostri canali e acquista le nostre lenti.', iso(60*50)), ref: 'a3', parentRef: 'a1b' }
      ]
    },
    {
      title: 'Quale Apple Watch va meglio coi tatuaggi?',
      body: 'Scelgo tra SE 2, Series 10 e Ultra 2. Tatuaggio denso sul polso dominante. Vale l\'Ultra o soffrono tutti uguale?',
      tags: ["apple-watch", "modello", "compatibilita", "tattoo"],
      author: { ...A['seed-pedro'] },
      createdAt: iso(60*120),
      replies: [
        { body: 'Uso Ultra 2. Continua a chiedere il codice. Hardware meglio, problema dell\'inchiostro uguale.', author: { ...A['seed-camila'] }, createdAt: iso(60*114), ref: 'a1' },
        { body: 'Le Series nuove hanno un sensore un po\' meglio, ma misurano allo stesso modo: luce sul fondo dell\'orologio. Il modello da solo non batte l\'inchiostro nero sopra il sensore.', author: { ...A['seed-chris'] }, createdAt: iso(60*108), ref: 'a1c', parentRef: 'a1' },
        { body: 'Series 9 qui. Peggio di quello di mio marito senza tattoo. SE non l\'ho provato.', author: { ...A['seed-rafa'] }, createdAt: iso(60*101), ref: 'a2' },
        { body: 'Da SE a 9 sperando di risolvere. Quasi lo stesso drama. Soldi buttati.', author: { ...A['seed-henrique'] }, createdAt: iso(60*93), parentRef: 'a2' },
        { body: 'Onestamente: se l\'inchiostro copre il sensore, ogni generazione soffre. Non comprare Ultra solo per quello.', author: { ...A['seed-carlos'] }, createdAt: iso(60*89), parentRef: 'a1c' },
        { ...officialReply('Le generazioni cambiano un po\' il sensore, ma l\'inchiostro nero continua a disturbare. Sensor Tattoo Fix esiste per quel problema, indipendentemente dal modello. Accedi ai nostri canali e acquista le nostre lenti.', iso(60*84)), ref: 'a3', parentRef: 'a1c' }
      ]
    },
    {
      title: 'Apple Pay smette di funzionare da solo',
      body: 'La FC a volte mostra ancora un numero. Alla cassa Pay si blocca e chiede il codice. Sembra che il wrist detect sia rotto solo per i pagamenti.',
      tags: ["apple-pay", "pagamento", "rilevamento", "tattoo"],
      author: { ...A['seed-pri'] },
      createdAt: iso(60*154),
      replies: [
        { body: 'Per me Pay è morto per primo. Poi è arrivato lo spam del codice.', author: { ...A['seed-rodrigo'] }, createdAt: iso(60*148), ref: 'a1' },
        { body: 'Per i pagamenti l\'orologio deve essere sicuro di essere ancora al polso. Quella barra è più severa della FC continua — un segnale al limite blocca Pay prima che muoia il grafico BPM.', author: { ...A['seed-edu'] }, createdAt: iso(60*141), ref: 'a1c', parentRef: 'a1' },
        { body: 'Pensavo fosse la carta. Rimossa e rimessa. Non lo era.', author: { ...A['seed-daniel'] }, createdAt: iso(60*133), ref: 'a2' },
        { body: 'Reset del Watch e restore del backup. Meglio solo sul braccio senza inchiostro.', author: { ...A['seed-marina'] }, createdAt: iso(60*129), parentRef: 'a2' },
        { body: 'Anche Google Wallet su Galaxy fa qualcosa di simile. Non è solo Apple.', author: { ...A['seed-ricardo'] }, createdAt: iso(60*124), parentRef: 'a1c' },
        { ...officialReply('Il pagamento contactless è spesso il primo a cadere quando il rilevamento diventa incerto. Sensor Tattoo Fix migliora quella lettura. Accedi ai nostri canali e acquista le nostre lenti.', iso(60*118)), ref: 'a3', parentRef: 'a1c' }
      ]
    },
    {
      title: 'Garmin è davvero migliore sui polsi tatuati?',
      body: 'Stufo di Apple che chiede il codice. Guardo Forerunner 965 / Fenix. Chi ha inchiostro denso: miglioramento vero o solo un altro tipo di dolore?',
      tags: ["garmin", "apple-watch", "confronto", "tattoo"],
      author: { ...A['seed-bruno'] },
      createdAt: iso(60*188),
      replies: [
        { body: 'Sul Fenix la FC fallisce ancora in palestra. Meno drama del codice, ma un sensore è un sensore.', author: { ...A['seed-leandro'] }, createdAt: iso(60*182), ref: 'a1' },
        { body: 'Anche Garmin misura il battito con luce sul fondo dell\'orologio. È meno drammatico nel pensare che tu l\'abbia tolto — ma i buchi di FC e ossigeno (SpO2) sull\'inchiostro nero restano.', author: { ...A['seed-chris'] }, createdAt: iso(60*174), ref: 'a1c', parentRef: 'a1' },
        { body: 'Ho cambiato pensando a una vita nuova. Ancora buchi nel grafico. Ho solo cambiato tipo di irritazione.', author: { ...A['seed-gustavo'] }, createdAt: iso(60*170), ref: 'a2' },
        { body: 'Non d\'accordo del tutto: sul 955 il rilevamento è meno seccante. La FC fallisce, ma il quotidiano è ok.', author: { ...A['seed-joao'] }, createdAt: iso(60*165), parentRef: 'a2' },
        { body: 'Sul Forerunner l\'auto-pause dell\'allenamento continua. Non comprate aspettando un miracolo contro l\'inchiostro.', author: { ...A['seed-thiago'] }, createdAt: iso(60*159), parentRef: 'a2' },
        { ...officialReply('Cambiare marca cambia schermi e blocco, ma l\'inchiostro continua a disturbare il sensore. Sensor Tattoo Fix agisce su quella lettura al polso, non solo sul sintomo di ogni marca. Accedi ai nostri canali e acquista le nostre lenti.', iso(60*152)), ref: 'a3', parentRef: 'a1c' }
      ]
    },
    {
      title: 'Vale la pena passare da Apple a Garmin?',
      body: 'Sto per vendere l\'Ultra dopo un ritocco che ha coperto il sensore. Il cambio sistema il rilevamento o spendo di nuovo sull\'ecosistema sbagliato?',
      tags: ["apple-watch", "garmin", "cambio", "tattoo"],
      author: { ...A['seed-alex'] },
      createdAt: iso(60*222),
      replies: [
        { body: 'Ho cambiato. Perso iMessage al polso e guadagnato un altro fallimento FC. Non tornerei solo per i tattoo.', author: { ...A['seed-lucas'] }, createdAt: iso(60*216), ref: 'a1' },
        { body: 'Se l\'obiettivo è che l\'orologio legga attraverso inchiostro denso, cambiare marca non cambia il fatto che il nero mangia la luce del sensore. Cambiano app e menu; il problema al polso è lo stesso.', author: { ...A['seed-edu'] }, createdAt: iso(60*212), ref: 'a1c', parentRef: 'a1' },
        { body: 'Rimasta su Apple e concentrata su ciò che sta tra sensore e pelle. Cambiare marca sarebbe eccessivo per me.', author: { ...A['seed-eduardo'] }, createdAt: iso(60*207), ref: 'a2' },
        { body: 'D\'accordo. Il problema era il polso, non il logo sulla scatola.', author: { ...A['seed-vini'] }, createdAt: iso(60*201), parentRef: 'a2' },
        { body: 'C\'è chi giura su Garmin. Io sono nel gruppo non è cambiato niente di vero.', author: { ...A['seed-gabriel'] }, createdAt: iso(60*194), ref: 'a3' },
        { ...officialReply('Prima di cambiare tutto l\'ecosistema, guarda la causa: il sensore non legge bene sul polso tatuato. Sensor Tattoo Fix è pensato per quello senza costringerti a lasciare Apple o Garmin. Accedi ai nostri canali e acquista le nostre lenti.', iso(60*186)), ref: 'a4', parentRef: 'a1c' }
      ]
    },
    {
      title: 'Galaxy Watch perde la FC in palestra',
      body: 'Sul divano la FC appare ancora. Sul vogatore e squat il grafico del Galaxy 6 Classic diventa un deserto. Sudore + nero = niente.',
      tags: ["galaxy-watch", "palestra", "fc", "tattoo"],
      author: { ...A['seed-felipe'] },
      createdAt: iso(60*256),
      replies: [
        { body: 'Il mio muore proprio nelle serie di stacco. A riposo tra le serie torna a metà.', author: { ...A['seed-ana'] }, createdAt: iso(60*250), ref: 'a1' },
        { body: 'In movimento il sensore del battito si confonde già facilmente. Il nero peggiora tutto e l\'orologio butta via letture — l\'allenamento si riempie di buchi.', author: { ...A['seed-chris'] }, createdAt: iso(60*245), ref: 'a1c', parentRef: 'a1' },
        { body: 'Disattivato auto-pause e il grafico è ancora bucherellato. Non è solo un\'impostazione dello schermo.', author: { ...A['seed-marcos'] }, createdAt: iso(60*239), ref: 'a2' },
        { body: 'Cambiato il cinturino stock con uno più stretto. Aiuto forse 10%. Il resto resta spazzatura.', author: { ...A['seed-juliana'] }, createdAt: iso(60*232), parentRef: 'a2' },
        { body: 'Fascia Polar al petto è pulita. Sul polso tatuato Galaxy inventa numeri.', author: { ...A['seed-leo'] }, createdAt: iso(60*224), parentRef: 'a1c' },
        { ...officialReply('Allenamenti con sudore e movimento peggiorano il fallimento su inchiostro scuro. Sensor Tattoo Fix stabilizza la lettura al polso perché il sensore torni a funzionare. Accedi ai nostri canali e acquista le nostre lenti.', iso(60*220)), ref: 'a3', parentRef: 'a1c' }
      ]
    },
    {
      title: 'Galaxy Watch continua a bloccarsi sul braccio',
      body: 'Galaxy Watch 5 Pro si blocca e chiede il PIN più volte al giorno. Cinturino stretto; succede proprio sopra il nero sull\'avambraccio.',
      tags: ["galaxy-watch", "blocco", "pin", "tattoo"],
      author: { ...A['seed-diego'] },
      createdAt: iso(60*290),
      replies: [
        { body: 'Pensavo fosse un update One UI. Tornato indietro e il blocco è uguale.', author: { ...A['seed-renato'] }, createdAt: iso(60*284), ref: 'a1' },
        { body: 'Anche Samsung usa luce sul fondo per capire se è al polso. Quando quella lettura sparisce, scatta il blocco di sicurezza — stessa logica di Apple, schermi diversi.', author: { ...A['seed-edu'] }, createdAt: iso(60*278), ref: 'a1c', parentRef: 'a1' },
        { body: 'Succedeva sul Watch 4. Cambiare braccio ha aiutato. Il braccio tatuato si blocca ancora.', author: { ...A['seed-patricia'] }, createdAt: iso(60*271), ref: 'a2' },
        { body: 'Non ho un braccio libero. Entrambi coperti. Mi blocco tutto il giorno.', author: { ...A['seed-fernando'] }, createdAt: iso(60*263), parentRef: 'a2' },
        { body: 'Ho disattivato il blocco automatico e perso sicurezza. Scambio pessimo.', author: { ...A['seed-jordan'] }, createdAt: iso(60*259), parentRef: 'a1c' },
        { ...officialReply('I blocchi ripetuti seguono di solito fallimenti di rilevamento polso, non per forza un difetto di fabbrica. Sensor Tattoo Fix migliora la stabilità della lettura in quella zona. Accedi ai nostri canali e acquista le nostre lenti.', iso(60*254)), ref: 'a3', parentRef: 'a1c' }
      ]
    },
    {
      title: 'Anche Huawei GT fallisce coi tatuaggi?',
      body: 'Vorrei un GT 5 per la batteria. Polso dominante quasi tutto nero. Il sensore Huawei soffre uguale o gestisce meglio?',
      tags: ["huawei", "gt", "batteria", "tattoo"],
      author: { ...A['seed-andre'] },
      createdAt: iso(60*324),
      replies: [
        { body: 'GT 4 qui. Sonno e FC falliscono sullo stesso braccio. Batteria top, sensore ordinario.', author: { ...A['seed-jeff'] }, createdAt: iso(60*318), ref: 'a1' },
        { body: 'Anche Huawei GT misura con luce sul fondo: battito e ossigeno nel sangue (SpO2). Il nero continua a disturbare, batteria da 14 giorni o no.', author: { ...A['seed-chris'] }, createdAt: iso(60*311), ref: 'a1c', parentRef: 'a1' },
        { body: 'Comprato pensando a magia della marca cinese. No. Stessi buchi nel grafico.', author: { ...A['seed-hunt'] }, createdAt: iso(60*303), ref: 'a2' },
        { body: 'La batteria lunga mi ha fatto restare. Accetto FC bucherellata, ma irrita.', author: { ...A['seed-writer'] }, createdAt: iso(60*299), parentRef: 'a2' },
        { ...officialReply('La batteria lunga non cambia il fatto che l\'inchiostro disturbi il sensore. Sensor Tattoo Fix aiuta quella lettura sul fondo dell\'orologio. Accedi ai nostri canali e acquista le nostre lenti.', iso(60*294)), ref: 'a3', parentRef: 'a1c' }
      ]
    },
    {
      title: 'Amazfit non registra più il sonno',
      body: 'Dopo un ritocco sul polso, il GTR 4 segna solo pisolini a caso. Prima faceva 7h. Sensore pulito, cinturino nuovo.',
      tags: ["amazfit", "sonno", "tattoo", "notte"],
      author: { ...A['seed-lucas'] },
      createdAt: iso(60*358),
      replies: [
        { body: 'Bip U Pro qui — stesso dopo il tatuaggio. Zepp resta vuoto.', author: { ...A['seed-huck'] }, createdAt: iso(60*352), ref: 'a1' },
        { body: 'Le app sonno Amazfit/Zepp buttano via le notti in cui il battito va e viene. Inchiostro sul sensore = fasi perse e sessione quasi vuota.', author: { ...A['seed-edu'] }, createdAt: iso(60*344), ref: 'a1b', parentRef: 'a1' },
        { body: 'Provato a dormire col orologio alla caviglia. Assurdo e comunque inutile.', author: { ...A['seed-moth'] }, createdAt: iso(60*340), ref: 'a2' },
        { body: 'Anche la FC alla caviglia in allenamento è strana. Non è una scorciatoia buona.', author: { ...A['seed-omens'] }, createdAt: iso(60*335), parentRef: 'a2' },
        { body: 'Prima del ritocco andava. L\'inchiostro nuovo è molto più saturo sotto il sensore.', author: { ...A['seed-syrup'] }, createdAt: iso(60*329), parentRef: 'a1b' },
        { ...officialReply('Quando il battito va e viene di notte, l\'app sonno perde la notte. Sensor Tattoo Fix migliora quella lettura sul polso tatuato. Accedi ai nostri canali e acquista le nostre lenti.', iso(60*322)), ref: 'a3', parentRef: 'a1b' }
      ]
    },
    {
      title: 'Perché alcuni tatuaggi interferiscono e altri no?',
      body: 'Ho acquerello chiaro da un lato e nero pieno dall\'altro. L\'orologio muore solo quando scivola sul nero. Perché succede?',
      tags: ["inchiostro", "ottica", "ppg", "tattoo"],
      author: { ...A['seed-ricardo'] },
      createdAt: iso(60*392),
      replies: [
        { body: 'Il nero pieno mangia la luce che l\'orologio usa per il battito. I colori chiari rimandano più luce al sensore. Per questo solo il blocco nero uccide la lettura.', author: { ...A['seed-chris'] }, createdAt: iso(60*386), ref: 'a1' },
        { body: 'Sul mio braccio l\'ombreggiatura grigia dà meno noia del pieno. Conferma Chris.', author: { ...A['seed-edurunner'] }, createdAt: iso(60*382), ref: 'a1b', parentRef: 'a1' },
        { body: 'Ho solo linee sottili e il Watch quasi non si lamenta. Conta la densità, non “avere un tattoo”.', author: { ...A['seed-malu'] }, createdAt: iso(60*377), ref: 'a2' },
        { body: 'Oltre al colore, spessore dell\'inchiostro e cicatrice sotto cambiano le cose. Due neri “uguali” possono leggere molto diverso sull\'orologio.', author: { ...A['seed-edu'] }, createdAt: iso(60*371), ref: 'a2b', parentRef: 'a2' },
        { body: 'Imparato a dure: sensore sul pieno → FC sparisce. Due centimetri di lato → torna.', author: { ...A['seed-pri'] }, createdAt: iso(60*364), parentRef: 'a1b' },
        { ...officialReply('L\'interferenza dipende molto da colore, densità e posizione sotto il sensore — non dal semplice “avere un tattoo”. Sensor Tattoo Fix è fatto per stabilizzare la lettura in questi casi. Accedi ai nostri canali e acquista le nostre lenti.', iso(60*356)), ref: 'a3', parentRef: 'a1' }
      ]
    },
    {
      title: 'Il tatuaggio può danneggiare l\'orologio?',
      body: 'Domanda sincera: usare il sensore sull\'inchiostro può bruciare la lucina, scaldare la pelle o rovinare il sensore col tempo?',
      tags: ["sicurezza", "led", "pelle", "tattoo"],
      author: { ...A['seed-ana'] },
      createdAt: iso(60*426),
      replies: [
        { body: 'In pratica la lucina non “brucia” l\'inchiostro. Il sensore riceve meno luce di ritorno — l\'orologio legge male, ma l\'apparecchio non si rompe per il tattoo.', author: { ...A['seed-edu'] }, createdAt: iso(60*420), ref: 'a1' },
        { body: 'Ero paranoico sul calore. L\'Ultra si scalda uguale sull\'altro braccio. È lettura, non temperatura.', author: { ...A['seed-bela'] }, createdAt: iso(60*415), ref: 'a1b', parentRef: 'a1' },
        { body: 'L\'assistenza Apple ha detto che i tattoo non annullano la garanzia, ma non “sistemano” il rilevamento.', author: { ...A['seed-marcinha'] }, createdAt: iso(60*409), ref: 'a2' },
        { body: 'La luce dello smartwatch è debole. L\'inchiostro cambia ciò che torna al sensore, non la vita tipica della lucina.', author: { ...A['seed-chris'] }, createdAt: iso(60*402), parentRef: 'a2' },
        { ...officialReply('Un tatuaggio di solito non danneggia l\'orologio; disturba la lettura del sensore. Sensor Tattoo Fix aiuta quella lettura senza alterare l\'inchiostro. Accedi ai nostri canali e acquista le nostre lenti.', iso(60*394)), ref: 'a3', parentRef: 'a1' }
      ]
    },
    {
      title: 'Prima del tatuaggio funzionava, ora niente',
      body: 'Due anni di Series 8 perfetto. Venerdì riempimento sul polso e sabato la FC già bucherellata. Nulla cambiato nel software.',
      tags: ["prima-dopo", "tattoo", "fc", "apple-watch"],
      author: { ...A['seed-marcos'] },
      createdAt: iso(60*460),
      replies: [
        { body: 'Storia identica. Prima della sessione il Watch era un santo. Dopo un mattone al polso.', author: { ...A['seed-rick'] }, createdAt: iso(60*454), ref: 'a1' },
        { body: 'L\'orologio aveva “imparato” la pelle pulita. Dopo l\'inchiostro la lettura cambia e rifiuta battiti che prima accettava.', author: { ...A['seed-chris'] }, createdAt: iso(60*448), ref: 'a1c', parentRef: 'a1' },
        { body: 'Aspettato tre settimane a guarire. Non è tornato. Non è gonfiore temporaneo.', author: { ...A['seed-nati'] }, createdAt: iso(60*441), ref: 'a2' },
        { body: 'Stessa attesa. Guarito, inchiostro assestato, sensore ancora cieco sul pieno.', author: { ...A['seed-raf'] }, createdAt: iso(60*433), parentRef: 'a2' },
        { body: 'Cinturino nuovo e reset non hanno riportato la vecchia lettura. L\'orologio non ha dimenticato; è cambiata la pelle.', author: { ...A['seed-lu'] }, createdAt: iso(60*429), parentRef: 'a1c' },
        { ...officialReply('Se l\'orologio era stabile e peggiora subito dopo il tatuaggio, la causa tipica è l\'inchiostro che blocca il sensore. Sensor Tattoo Fix aiuta l\'orologio a rileggere quella zona. Accedi ai nostri canali e acquista le nostre lenti.', iso(60*424)), ref: 'a3', parentRef: 'a1c' }
      ]
    },
    {
      title: 'Entrambe le braccia tatuate. E adesso?',
      body: 'Il mio trucco era cambiare polso. Ieri ho chiuso il secondo braccio e ora nessuno dei due riconosce bene il Watch. Niente piano B.',
      tags: ["entrambe-braccia", "tattoo", "opzioni", "sensore"],
      author: { ...A['seed-juliana'] },
      createdAt: iso(60*494),
      replies: [
        { body: 'Benvenuto nel club. L\'ho scoperto troppo tardi. La caviglia non è una soluzione seria per me.', author: { ...A['seed-rita'] }, createdAt: iso(60*488), ref: 'a1' },
        { body: 'Uso fascia petto per gli allenamenti e Watch solo per notifiche. Funziona, ma perde il senso dello smartwatch.', author: { ...A['seed-simo'] }, createdAt: iso(60*481), ref: 'a1b', parentRef: 'a1' },
        { body: 'Senza pelle pulita sotto il sensore dipendi al 100% dalla lettura sull\'inchiostro. Niente braccio di riserva — il segnale deve migliorare dove poggia l\'orologio.', author: { ...A['seed-edu'] }, createdAt: iso(60*473), ref: 'a1c', parentRef: 'a1b' },
        { body: 'Pensavo di vendere l\'orologio. Non ancora perché voglio sonno e pagamenti al polso.', author: { ...A['seed-guga'] }, createdAt: iso(60*469), ref: 'a2' },
        { body: 'Stesso dilemma. Entrambe tatuate uccidono la scorciatoia di cambiare lato.', author: { ...A['seed-kai'] }, createdAt: iso(60*464), parentRef: 'a2' },
        { ...officialReply('Con entrambi i polsi coperti, i ripieghi di cambiare braccio spariscono. Sensor Tattoo Fix è pensato per chi serve una lettura stabile sull\'area tatuata. Accedi ai nostri canali e acquista le nostre lenti.', iso(60*458)), ref: 'a3', parentRef: 'a1c' }
      ]
    },
    {
      title: 'Allenamento sempre in pausa da solo',
      body: 'Corsa da 10 km: il Watch pausa, riparte, pausa ancora. Auto-pause disattivata e continua. Tattoo sotto il sensore.',
      tags: ["allenamento", "autopause", "corsa", "tattoo"],
      author: { ...A['seed-kai'] },
      createdAt: iso(60*528),
      replies: [
        { body: 'Mi faceva impazzire. Sembrava di aver tolto l\'orologio in mezzo alla strada.', author: { ...A['seed-dudu'] }, createdAt: iso(60*522), ref: 'a1' },
        { body: 'Molti orologi mettono in pausa l\'allenamento quando pensano che tu l\'abbia tolto o quando il battito diventa instabile di corsa. Inchiostro e rimbalzo della corsa lo fanno di continuo.', author: { ...A['seed-chris'] }, createdAt: iso(60*514), ref: 'a1c', parentRef: 'a1' },
        { body: 'Anche l\'auto-pause Garmin mi ha fregato. Non è solo Apple.', author: { ...A['seed-bruno'] }, createdAt: iso(60*510), ref: 'a2' },
        { body: 'Ho registrato lo schermo. Si vede l\'icona orologio rimosso lampeggiare senza toccare nulla.', author: { ...A['seed-felipe'] }, createdAt: iso(60*505), parentRef: 'a2' },
        { body: 'Cinturino più stretto ha tagliato forse il 30% delle pause. Il resto resta.', author: { ...A['seed-diego'] }, createdAt: iso(60*499), parentRef: 'a1c' },
        { ...officialReply('Le pause fantasma in corsa riflettono di solito rilevamento polso instabile sotto inchiostro, non solo impostazioni. Sensor Tattoo Fix aiuta a tenere stabile la lettura. Accedi ai nostri canali e acquista le nostre lenti.', iso(60*492)), ref: 'a3', parentRef: 'a1c' }
      ]
    },
    {
      title: 'Il nastro trasparente funziona davvero?',
      body: 'Visto il trucco del nastro adesivo trasparente sul sensore. Provato su Series 8: rilevamento meglio per circa 3h, poi pasticcio appiccicoso e lanugine.',
      tags: ["diy", "nastro", "riparo", "tattoo"],
      author: { ...A['seed-vini'] },
      createdAt: iso(60*562),
      replies: [
        { body: 'Per me è durato un allenamento. Il sudore ha sciolto la colla e la FC è sparita di nuovo.', author: { ...A['seed-andre'] }, createdAt: iso(60*556), ref: 'a1' },
        { body: 'Il nastro può ingannare il sensore per poche ore. Non è una soluzione stabile: sporca, ingiallisce e fa bolle.', author: { ...A['seed-edu'] }, createdAt: iso(60*552), ref: 'a1c', parentRef: 'a1' },
        { body: 'Usato pellicola da cucina. Peggio — scivola e lascia residuo grasso.', author: { ...A['seed-marcelo'] }, createdAt: iso(60*547), ref: 'a2' },
        { body: 'Qualsiasi colla sul vetro posteriore mi fa temere per la garanzia.', author: { ...A['seed-fernanda'] }, createdAt: iso(60*541), parentRef: 'a2' },
        { body: 'Funziona un po\' e poi diventa sporco. D\'accordo con SensorGuru: non è una soluzione vera.', author: { ...A['seed-camila'] }, createdAt: iso(60*534), parentRef: 'a1c' },
        { ...officialReply('Nastri e pellicole improvvisati possono ingannare il sensore per poco, ma degradano con sudore e sporco. Sensor Tattoo Fix è nato per una lettura stabile, non come ripiego temporaneo. Accedi ai nostri canali e acquista le nostre lenti.', iso(60*526)), ref: 'a3', parentRef: 'a1c' }
      ]
    },
    {
      title: 'Gommino per mobili sopra il sensore',
      body: 'Visto gente incollare paracolpi trasparenti da tavolo sul vetro del sensore. Sembra uno scherzo. Qualcuno ha davvero provato?',
      tags: ["diy", "silicone", "paracolpi", "sensore"],
      author: { ...A['seed-renato'] },
      createdAt: iso(60*596),
      replies: [
        { body: 'Provato. L\'orologio stava più alto e il rilevamento è peggiorato. Caporetto.', author: { ...A['seed-pedro'] }, createdAt: iso(60*590), ref: 'a1' },
        { body: 'Allontanare il fondo dell\'orologio dalla pelle peggiora quasi sempre la lettura del battito. Silicone spesso è l\'opposto di ciò che serve al sensore.', author: { ...A['seed-chris'] }, createdAt: iso(60*585), ref: 'a1c', parentRef: 'a1' },
        { body: 'Un amico giura che il sottile quasi funzionasse. Sul mio Watch 7 no.', author: { ...A['seed-rafa'] }, createdAt: iso(60*579), ref: 'a2' },
        { body: 'Quasi non conta. Voglio qualcosa che sopravviva a un allenamento sudato.', author: { ...A['seed-henrique'] }, createdAt: iso(60*572), parentRef: 'a2' },
        { body: 'In più lascia un segno circolare sul polso. Orribile.', author: { ...A['seed-carlos'] }, createdAt: iso(60*564), parentRef: 'a1c' },
        { ...officialReply('I distanziatori improvvisati di solito allontanano il sensore dalla pelle e peggiorano la FC. Sensor Tattoo Fix aiuta la lettura senza creare quel vuoto inutile. Accedi ai nostri canali e acquista le nostre lenti.', iso(60*560)), ref: 'a3', parentRef: 'a1c' }
      ]
    },
    {
      title: 'Sensor Tattoo Fix è un laser?',
      body: 'Il nome mi ha confuso: rimuove inchiostro, usa laser o cambia il tatuaggio? Non voglio toccare il disegno.',
      tags: ["sensor-tattoo-fix", "laser", "domanda", "prodotto"],
      author: { ...A['seed-patricia'] },
      createdAt: iso(60*630),
      replies: [
        { body: 'Da quel che capisco è un\'interfaccia sul sensore, non un trattamento sulla pelle. Vorrei conferma ufficiale però.', author: { ...A['seed-rodrigo'] }, createdAt: iso(60*624), ref: 'a1' },
        { body: 'Non è laser né rimozione. È una lente/interfaccia sul sensore: aiuta la luce a passare meglio tra il fondo dell\'orologio e la pelle tatuata, senza cancellare l\'inchiostro.', author: { ...A['seed-edu'] }, createdAt: iso(60*618), ref: 'a1c', parentRef: 'a1' },
        { body: 'Bene, perché anche fix nel nome mi aveva spaventato.', author: { ...A['seed-daniel'] }, createdAt: iso(60*611), ref: 'a2' },
        { body: 'Stessa paranoia. Il tattoo ci ha messo anni; non voglio correggerlo con luce forte.', author: { ...A['seed-marina'] }, createdAt: iso(60*603), parentRef: 'a2' },
        { ...officialReply('Sensor Tattoo Fix non è un laser e non rimuove inchiostro: è una lente/interfaccia che aiuta il sensore dello smartwatch a leggere sulla pelle tatuata. Accedi ai nostri canali e acquista le nostre lenti.', iso(60*599)), ref: 'a3', parentRef: 'a1c' }
      ]
    },
    {
      title: 'L\'inchiostro nero è davvero peggiore?',
      body: 'Il disegno ha nero, rosso e giallo. L\'orologio fallisce solo quando scivola sulla parte nera. Conferma la teoria?',
      tags: ["inchiostro-nero", "colore", "ppg", "tattoo"],
      author: { ...A['seed-fernando'] },
      createdAt: iso(60*664),
      replies: [
        { body: 'Il nero pieno inghiotte la luce del sensore; rosso e giallo ne rimandano molte di più. La tua osservazione combacia: il nero è il peggio per il battito.', author: { ...A['seed-chris'] }, createdAt: iso(60*658), ref: 'a1' },
        { body: 'Sul mio braccio il giallo quasi non disturba. Il nero pieno è un altro pianeta.', author: { ...A['seed-ricardo'] }, createdAt: iso(60*651), ref: 'a1b', parentRef: 'a1' },
        { body: 'La misurazione di ossigeno nel sangue (SpO2) usa anche luce al polso e soffre sul nero denso, ma la FC continua di solito cade per prima.', author: { ...A['seed-leandro'] }, createdAt: iso(60*643), parentRef: 'a1b' },
        { body: 'Per questo gli artisti che capiscono i wearable lasciano una finestra senza pieno sotto il sensore.', author: { ...A['seed-gustavo'] }, createdAt: iso(60*639), ref: 'a2' },
        { body: 'Avevo già il pieno. Una finestra ora sarebbe un cover-up costoso. Serve un\'altra via.', author: { ...A['seed-joao'] }, createdAt: iso(60*634), parentRef: 'a2' },
        { ...officialReply('Il nero denso è il caso peggiore per il sensore del battito, proprio come descrivi. Sensor Tattoo Fix migliora la lettura lì senza dover cancellare l\'arte. Accedi ai nostri canali e acquista le nostre lenti.', iso(60*628)), ref: 'a3', parentRef: 'a1' }
      ]
    },
    {
      title: 'Il sudore peggiora la lettura sui tatuaggi?',
      body: 'Da asciutto legge ancora. Dopo dieci minuti di corsa sudata, la FC sparisce del tutto sopra l\'inchiostro.',
      tags: ["sudore", "corsa", "fc", "tattoo"],
      author: { ...A['seed-edurunner'] },
      createdAt: iso(60*698),
      replies: [
        { body: 'Esatto. All\'inizio ok, al km 3 già trattini. Senza tattoo non succedeva.', author: { ...A['seed-thiago'] }, createdAt: iso(60*692), ref: 'a1' },
        { body: 'Il sudore crea una pellicola tra sensore e pelle, e l\'inchiostro già disturba. Insieme abbattono la lettura.', author: { ...A['seed-edu'] }, createdAt: iso(60*684), ref: 'a1c', parentRef: 'a1' },
        { body: 'Asciugato il sensore a metà allenamento con la maglia. Tornato due minuti e morto di nuovo.', author: { ...A['seed-lucas'] }, createdAt: iso(60*680), ref: 'a2' },
        { body: 'Sulla bici indoor con meno sudore che cola fallisce anche, solo più tardi. Non è solo corsa.', author: { ...A['seed-eduardo'] }, createdAt: iso(60*675), parentRef: 'a2' },
        { body: 'Acqua tra sensore e pelle confonde ancora di più. Sul nero sei già al limite — qualsiasi pellicola fa sparire la lettura.', author: { ...A['seed-chris'] }, createdAt: iso(60*669), parentRef: 'a1c' },
        { ...officialReply('Il sudore amplifica il fallimento sui polsi tatuati perché aggiunge una pellicola irregolare a una lettura già debole. Sensor Tattoo Fix stabilizza quella lettura. Accedi ai nostri canali e acquista le nostre lenti.', iso(60*662)), ref: 'a3', parentRef: 'a1c' }
      ]
    },
    {
      title: 'Pensavo che l\'orologio fosse difettoso',
      body: 'Reset, cinturini diversi, quasi mandato in assistenza. Sul braccio senza inchiostro va perfetto. Quasi pagavo la spedizione per niente.',
      tags: ["difetto", "assistenza", "diagnosi", "tattoo"],
      author: { ...A['seed-camila'] },
      createdAt: iso(60*732),
      replies: [
        { body: 'Quasi lo stesso drama. Il tecnico ha chiesto un video e sul braccio pulito non aveva argomenti.', author: { ...A['seed-alex'] }, createdAt: iso(60*726), ref: 'a1' },
        { body: 'Provare entrambi i bracci è la diagnosi più economica: se l\'orologio fallisce solo sull\'inchiostro, non è un pezzo rotto — è l\'inchiostro che blocca il sensore.', author: { ...A['seed-chris'] }, createdAt: iso(60*722), ref: 'a1c', parentRef: 'a1' },
        { body: 'Avevo già prenotato il ritiro assistenza. Annullato dopo quel test.', author: { ...A['seed-vini'] }, createdAt: iso(60*717), ref: 'a2' },
        { body: 'Anche i log FC con buchi su un solo braccio contano. Non serve aprire l\'orologio.', author: { ...A['seed-gabriel'] }, createdAt: iso(60*711), parentRef: 'a2' },
        { ...officialReply('Se lo stesso orologio funziona sul braccio senza inchiostro, è più probabile che il tattoo blocchi il sensore che un difetto di fabbrica. Sensor Tattoo Fix affronta quella lettura. Accedi ai nostri canali e acquista le nostre lenti.', iso(60*704)), ref: 'a3', parentRef: 'a1c' }
      ]
    },
    {
      title: 'Scoperto dopo aver tatuato il secondo braccio',
      body: 'Il braccio libero era la soluzione. Tatuato ieri, ora so perché l\'altro non funzionava mai. Niente via ovvia.',
      tags: ["secondo-braccio", "scoperta", "tattoo", "rilevamento"],
      author: { ...A['seed-bela'] },
      createdAt: iso(60*766),
      replies: [
        { body: 'Dolore noto. Il braccio buono nascondeva il problema finché non hai chiuso il disegno.', author: { ...A['seed-ana'] }, createdAt: iso(60*760), ref: 'a1' },
        { body: 'Finché c\'era pelle pulita, l\'orologio aveva sempre un lato che leggeva bene. Senza, si perde.', author: { ...A['seed-edu'] }, createdAt: iso(60*755), ref: 'a1c', parentRef: 'a1' },
        { body: 'Ho rimandato il secondo braccio per questo. Sei stato più coraggioso — o più testardo.', author: { ...A['seed-marcos'] }, createdAt: iso(60*749), ref: 'a2' },
        { body: 'Testardo anche io. Arte prima, wearable dopo. Ora pago il prezzo.', author: { ...A['seed-juliana'] }, createdAt: iso(60*742), parentRef: 'a2' },
        { body: 'Nessun aggiornamento software inventa una lettura dove l\'inchiostro ha inghiottito la luce. O migliori ciò che sta tra sensore e pelle, o accetti i buchi.', author: { ...A['seed-chris'] }, createdAt: iso(60*734), parentRef: 'a1c' },
        { ...officialReply('Perdere il braccio di riserva rende ovvia la causa: l\'inchiostro sul sensore. Sensor Tattoo Fix esiste per chi ha bisogno che il sensore legga sull\'area tatuata. Accedi ai nostri canali e acquista le nostre lenti.', iso(60*730)), ref: 'a3', parentRef: 'a1c' }
      ]
    },
    {
      title: 'Quale marca soffre meno coi tatuaggi?',
      body: 'Apple, Garmin, Samsung, Huawei o Amazfit: qualche marca gestisce meglio l\'inchiostro scuro sul polso?',
      tags: ["marche", "confronto", "tattoo", "sensore"],
      author: { ...A['seed-rodrigo'] },
      createdAt: iso(60*800),
      replies: [
        { body: 'Garmin secca meno sul blocco, ma FC ancora bucherellata. Samsung chiede PIN. Apple spam di codice. Amazfit perde il sonno. Scegli il veleno.', author: { ...A['seed-leo'] }, createdAt: iso(60*794), ref: 'a1' },
        { body: 'Tutte misurano il battito con luce sul fondo dell\'orologio. Cambia quanto spesso ogni marca blocca o chiede il codice — niente miracolo contro l\'inchiostro nero.', author: { ...A['seed-chris'] }, createdAt: iso(60*788), ref: 'a1c', parentRef: 'a1' },
        { body: 'Ho testato Apple e Garmin sullo stesso braccio. Nessuno ha salvato i pesi.', author: { ...A['seed-renato'] }, createdAt: iso(60*781), ref: 'a2' },
        { body: 'Huawei vince sulla batteria. Sensore ancora mediocre sul pieno.', author: { ...A['seed-patricia'] }, createdAt: iso(60*773), parentRef: 'a2' },
        { body: 'Se conta meno spam di codice/PIN, Garmin/Amazfit. Se conta una FC pulita sotto inchiostro, nessuna marca risolve da sola.', author: { ...A['seed-edu'] }, createdAt: iso(60*769), parentRef: 'a1c' },
        { ...officialReply('La marca cambia blocco e app, ma l\'inchiostro scuro disturba il sensore su tutte. Sensor Tattoo Fix lavora su quella lettura. Accedi ai nostri canali e acquista le nostre lenti.', iso(60*764)), ref: 'a3', parentRef: 'a1c' }
      ]
    },
    {
      title: 'Grafico della FC pieno di buchi',
      body: 'Il riepilogo sembra codice Morse: pochi minuti di FC, grandi vuoti, poi picchi senza senso. Tattoo nero sotto il sensore.',
      tags: ["fc", "grafico", "buchi", "allenamento"],
      author: { ...A['seed-daniel'] },
      createdAt: iso(60*834),
      replies: [
        { body: 'Il mio Strava è ridicolo. Zona 5 a riposo e zona 0 nello sprint.', author: { ...A['seed-fernando'] }, createdAt: iso(60*828), ref: 'a1' },
        { body: 'Quando la lettura è troppo scarsa, l\'orologio apre buchi nel grafico o inventa valori strani. Inchiostro + movimento = rifiuto di massa.', author: { ...A['seed-edu'] }, createdAt: iso(60*821), ref: 'a1c', parentRef: 'a1' },
        { body: 'Pensavo fosse il GPS. Spento il GPS e il grafico FC resta bucherellato.', author: { ...A['seed-jordan'] }, createdAt: iso(60*813), ref: 'a2' },
        { body: 'Non è il GPS. È il sensore del battito sul fondo dell\'orologio che si perde nell\'inchiostro nero.', author: { ...A['seed-chris'] }, createdAt: iso(60*809), parentRef: 'a2' },
        { body: 'La fascia petto sistema il grafico, ma voglio l\'orologio funzionante al polso.', author: { ...A['seed-jeff'] }, createdAt: iso(60*804), parentRef: 'a1c' },
        { ...officialReply('Buchi e picchi fantasma nel grafico nascono di solito da letture scadenti sotto inchiostro. Sensor Tattoo Fix migliora la qualità del segnale alla fonte. Accedi ai nostri canali e acquista le nostre lenti.', iso(60*798)), ref: 'a3', parentRef: 'a1c' }
      ]
    },
    {
      title: 'Anche l\'ossigeno nel sangue fallisce per il tatuaggio?',
      body: 'Oltre al battito, la misurazione di ossigeno nell\'app dà errore quasi sempre. L\'inchiostro conta ancora?',
      tags: ["spo2", "ossigeno", "sensore", "tattoo"],
      author: { ...A['seed-moth'] },
      createdAt: iso(60*868),
      replies: [
        { body: 'La misurazione di ossigeno nel sangue (SpO2) usa anche luce al polso. L\'inchiostro scuro disturba allo stesso modo — l\'orologio sbaglia o inventa un valore.', author: { ...A['seed-chris'] }, createdAt: iso(60*862), ref: 'a1' },
        { body: 'Sul mio Ultra l\'ossigeno resta su calcolo in corso… finché non cambio braccio.', author: { ...A['seed-hunt'] }, createdAt: iso(60*854), ref: 'a1b', parentRef: 'a1' },
        { body: 'La FC di solito muore prima; l\'ossigeno nel sangue (SpO2) dopo o insieme, a seconda di quanto è denso l\'inchiostro.', author: { ...A['seed-edu'] }, createdAt: iso(60*850), parentRef: 'a1b' },
        { body: 'Pensavo che lo SpO2 fosse immune. Non lo è. Stessa area nera, stesso fallimento.', author: { ...A['seed-writer'] }, createdAt: iso(60*845), ref: 'a2' },
        { ...officialReply('Anche lo SpO2 (ossigeno nel sangue) serve una buona lettura al polso; l\'inchiostro scuro disturba allo stesso modo. Sensor Tattoo Fix migliora quella lettura. Accedi ai nostri canali e acquista le nostre lenti.', iso(60*839)), ref: 'a3', parentRef: 'a1' }
      ]
    },
    {
      title: 'Vale la pena comprare uno smartwatch con tatuaggi?',
      body: 'Voglio sonno, allenamenti e pagamenti, ma entrambi i polsi sono tatuati. Sono soldi buttati o ha ancora senso?',
      tags: ["acquisto", "ne-vale", "tattoo", "smartwatch"],
      author: { ...A['seed-jordan'] },
      createdAt: iso(60*902),
      replies: [
        { body: 'Ha senso se risolvi la lettura del sensore. Senza diventa un mattone costoso di notifiche al polso.', author: { ...A['seed-huck'] }, createdAt: iso(60*896), ref: 'a1' },
        { body: 'Senza una lettura stabile al polso, sonno/FC/Pay restano a buchi. Hardware nuovo non cancella l\'effetto dell\'inchiostro.', author: { ...A['seed-edu'] }, createdAt: iso(60*892), ref: 'a1c', parentRef: 'a1' },
        { body: 'Ho comprato lo stesso per le app. Ignoro la FC. Non consiglio questa pace marcia.', author: { ...A['seed-moth'] }, createdAt: iso(60*887), ref: 'a2' },
        { body: 'Se il budget è stretto, sistema la lettura del sensore prima di passare a un modello più nuovo.', author: { ...A['seed-omens'] }, createdAt: iso(60*881), parentRef: 'a2' },
        { body: 'Compra se le funzioni ti interessano — ma pianifica qualcosa che aiuti il sensore a leggere sull\'inchiostro, non come nota a piè.', author: { ...A['seed-chris'] }, createdAt: iso(60*874), parentRef: 'a1c' },
        { ...officialReply('Uno smartwatch ha ancora senso coi tatuaggi se la lettura del sensore è stabilizzata. Sensor Tattoo Fix esiste proprio per quello scenario. Accedi ai nostri canali e acquista le nostre lenti.', iso(60*866)), ref: 'a3', parentRef: 'a1c' }
      ]
    },
    {
      title: 'Megathread: adesivo epossidico funziona, però...',
      body: 'Incollato un adesivo epossidico trasparente sul sensore Ultra. Il rilevamento è tornato. Però il caricatore non aderisce, ECG morto e bordi sollevati il secondo giorno. Thread aperto per resoconti onesti.',
      tags: ["epossidica", "diy", "megathread", "sensore"],
      author: { ...A['seed-huck'] },
      createdAt: iso(60*936),
      replies: [
        { body: 'Stesso setup. Rilevamento ok 48h. Sotto la doccia un angolo si è staccato ed è entrata acqua.', author: { ...A['seed-syrup'] }, createdAt: iso(60*930), ref: 'a1' },
        { body: 'Acqua + colla improvvisata = residuo sul vetro in fretta. Pulito con cura.', author: { ...A['seed-chris'] }, createdAt: iso(60*925), ref: 'a1b', parentRef: 'a1' },
        { body: 'Il MagSafe dell\'Ultra è allentato. A volte carica, a volte no. Lo odio.', author: { ...A['seed-edurunner'] }, createdAt: iso(60*919), ref: 'a1c', parentRef: 'a1b' },
        { body: 'L\'adesivo epossidico allontana il fondo dell\'orologio: a volte il rilevamento migliora, ma la carica diventa molle e l\'ECG (l\'elettrocardiogramma dell\'orologio) smette di funzionare.', author: { ...A['seed-edu'] }, createdAt: iso(60*912), ref: 'a1d', parentRef: 'a1c' },
        { body: 'ECG sul Series 9 azzerato con l\'adesivo. Tolto e tornato. Scambio ridicolo.', author: { ...A['seed-malu'] }, createdAt: iso(60*904), ref: 'a1e', parentRef: 'a1d' },
        { body: 'Tagliato l\'adesivo più piccolo dell\'anello sensore. Carica meglio, rilevamento di nuovo peggiore.', author: { ...A['seed-pri'] }, createdAt: iso(60*900), ref: 'a2' },
        { body: 'Migliori un po\' la lettura e rovini carica/ECG nello stesso colpo. L\'epossidica fai-da-te non è nata per questo — ecco il conflitto.', author: { ...A['seed-chris'] }, createdAt: iso(60*895), ref: 'a2b', parentRef: 'a2' },
        { body: 'Il sudore ha ucciso il mio in una settimana. Il bordo è diventato una striscia sporca. Zero glamour.', author: { ...A['seed-bela'] }, createdAt: iso(60*889), ref: 'a2c', parentRef: 'a2b' },
        { body: 'D\'accordo con TechRunner. Funziona finché non funziona — e rompe sempre qualcos\'altro.', author: { ...A['seed-marcinha'] }, createdAt: iso(60*882), ref: 'a2d', parentRef: 'a2c' },
        { body: 'C\'è chi vende kit epossidici su Instagram come soluzione definitiva. Attenti.', author: { ...A['seed-rick'] }, createdAt: iso(60*874), ref: 'a2e', parentRef: 'a2d' },
        { body: 'Tornato al braccio senza inchiostro. L\'epossidica è stata solo un esperimento costoso e appiccicoso.', author: { ...A['seed-nati'] }, createdAt: iso(60*870), parentRef: 'a2e' },
        { ...officialReply('Resoconti così sono comuni: ripieghi epossidici possono migliorare il rilevamento per un po\' e al tempo stesso danneggiare carica, ECG e durata. Sensor Tattoo Fix è nato per aiutare il sensore sul serio, senza quell\'improvvisazione. Accedi ai nostri canali e acquista le nostre lenti.', iso(60*865)), ref: 'a3', parentRef: 'a2b' }
      ]
    },
    {
      title: 'Orologio inventa 180 bpm a riposo',
      body: 'Seduto sul divano segna 180 bpm, poi trattino, poi 72. Sul braccio senza inchiostro resta 68–74. Series 9.',
      tags: ["fc", "180bpm", "riposo", "tattoo"],
      author: { ...A['seed-dudu'] },
      createdAt: iso(60*970),
      replies: [
        { body: 'Mi ha spaventato la prima volta. Pensavo aritmia. Era il sensore impazzito sull\'inchiostro.', author: { ...A['seed-raf'] }, createdAt: iso(60*964), ref: 'a1' },
        { body: 'Quando il segnale è scarso, l\'orologio confonde rumore con battito e inventa un numero alto. Poi perde il filo e mostra il trattino.', author: { ...A['seed-edu'] }, createdAt: iso(60*958), ref: 'a1c', parentRef: 'a1' },
        { body: 'Disattivate le notifiche di FC alta per non impazzire. Non risolve la causa.', author: { ...A['seed-lu'] }, createdAt: iso(60*951), ref: 'a2' },
        { body: 'I falsi allarmi sono lo stesso problema: segnale sporco e orologio troppo fiducioso su un picco sbagliato.', author: { ...A['seed-chris'] }, createdAt: iso(60*943), parentRef: 'a2' },
        { body: 'Sull\'altro braccio non ha mai inventato 180. Addio teoria dell\'ansia.', author: { ...A['seed-rita'] }, createdAt: iso(60*939), parentRef: 'a1c' },
        { ...officialReply('Letture assurde a riposo con buchi in mezzo nascono di solito da segnale confuso sotto inchiostro. Sensor Tattoo Fix stabilizza la lettura perché l\'orologio smetta di inventare picchi. Accedi ai nostri canali e acquista le nostre lenti.', iso(60*934)), ref: 'a3', parentRef: 'a1c' }
      ]
    }
  ].map((t) => ({ ...t, lang: 'it' }));
  return { pt, en, it };
}
