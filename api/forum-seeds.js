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
        { body: 'O lock de senha do Apple Watch depende do canal de proximidade no IR. Tinta densa mata o retorno e o sistema trata como remoção — daí o spam de código, não é bug aleatório de software.', author: { ...A['seed-chris'] }, createdAt: iso(60*31), ref: 'a1c', parentRef: 'a1' },
        { body: 'Também desativei Desbloquear com iPhone pensando que ajudava. Zero diferença.', author: { ...A['seed-felipe'] }, createdAt: iso(60*24), ref: 'a2' },
        { ...officialReply('Quando a detecção de pulso oscila, o Apple Watch reforça a segurança e pede senha como se tivesse sido removido. O Sensor Tattoo Fix melhora a interface óptica nessa região. Informe o modelo exato do seu Apple Watch para verificarmos a compatibilidade.', iso(60*16)), ref: 'a3', parentRef: 'a1c' }
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
        { body: 'Sono precisa de PPG estável por horas. Quando o SNR cai, o classificador de estágios corta blocos inteiros e a sessão vira dados insuficientes.', author: { ...A['seed-edu'] }, createdAt: iso(60*75), ref: 'a1b', parentRef: 'a1' },
        { body: 'Apertei a pulseira pra dormir e acordei com marca vermelha. Continua marcando 1h.', author: { ...A['seed-andre'] }, createdAt: iso(60*69), ref: 'a2' },
        { body: 'Apertar demais atrapalha circulação e piora o sinal. Não é solução.', author: { ...A['seed-marcelo'] }, createdAt: iso(60*62), parentRef: 'a2' },
        { body: 'No Amazfit o mesmo: cochilo de 40 min depois de uma noite inteira. Não é só Apple.', author: { ...A['seed-fernanda'] }, createdAt: iso(60*54), parentRef: 'a1b' },
        { ...officialReply('O tracking noturno falha quando o retorno óptico fica irregular por horas. O Sensor Tattoo Fix estabiliza essa leitura no pulso tatuado. Se quiser, informe o modelo do seu smartwatch para verificarmos a compatibilidade.', iso(60*50)), ref: 'a3', parentRef: 'a1b' }
      ]
    },
    {
      title: 'Qual Apple Watch funciona melhor com tattoo?',
      body: 'Estou entre SE 2, Series 10 e Ultra 2. Tattoo densa no pulso dominante. Vale pagar o Ultra ou qualquer um vai sofrer igual?',
      tags: ["apple-watch", "modelo", "compatibilidade", "tattoo"],
      author: { ...A['seed-pedro'] },
      createdAt: iso(60*120),
      replies: [
        { body: 'Uso Ultra 2. Continua pedindo senha. Hardware melhor, física da tinta igual.', author: { ...A['seed-camila'] }, createdAt: iso(60*114), ref: 'a1' },
        { body: 'Series novas melhoram amostragem e LEDs verdes, mas o princípio PPG + IR de on-wrist é o mesmo. Modelo sozinho não vence tinta preta sobre o fotodiodo.', author: { ...A['seed-chris'] }, createdAt: iso(60*108), ref: 'a1c', parentRef: 'a1' },
        { body: 'Series 9 aqui. Pior que o do meu marido sem tattoo. SE nem experimentei.', author: { ...A['seed-rafa'] }, createdAt: iso(60*101), ref: 'a2' },
        { body: 'Passei do SE pro 9 achando que resolvia. Quase o mesmo drama. Dinheiro jogado.', author: { ...A['seed-henrique'] }, createdAt: iso(60*93), parentRef: 'a2' },
        { body: 'Honestamente: se a tinta cobre o sensor, qualquer geração sofre. Não compre Ultra só por isso.', author: { ...A['seed-carlos'] }, createdAt: iso(60*89), parentRef: 'a1c' },
        { ...officialReply('A geração muda LEDs e processamento, mas o obstáculo óptico da tinta permanece. O Sensor Tattoo Fix existe para esse gap, independente do modelo. Informe qual Apple Watch você está considerando para verificarmos a compatibilidade.', iso(60*84)), ref: 'a3', parentRef: 'a1c' }
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
        { body: 'Wallet exige confiança alta de on wrist. O limiar é mais rígido que o da FC contínua — sinal limítrofe bloqueia Pay antes do gráfico de BPM.', author: { ...A['seed-edu'] }, createdAt: iso(60*141), ref: 'a1c', parentRef: 'a1' },
        { body: 'Achei que era cartão. Removi e recadastrei. Não era.', author: { ...A['seed-daniel'] }, createdAt: iso(60*133), ref: 'a2' },
        { body: 'Resetei o Watch e restaurei backup. Só melhorou no braço sem tinta.', author: { ...A['seed-marina'] }, createdAt: iso(60*129), parentRef: 'a2' },
        { body: 'No Google Wallet do Galaxy acontece parecido. Não é exclusivo da Apple.', author: { ...A['seed-ricardo'] }, createdAt: iso(60*124), parentRef: 'a1c' },
        { ...officialReply('Pagamento por aproximação costuma ser o primeiro a cair quando a detecção de pulso perde confiança. O Sensor Tattoo Fix melhora essa leitura óptica. Informe o modelo do seu Apple Watch para verificarmos a compatibilidade.', iso(60*118)), ref: 'a3', parentRef: 'a1c' }
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
        { body: 'Garmin também usa PPG verde + IR. Os limiares de watch removed são diferentes, então some o lock da Apple — mas gaps de FC e SpO2 em tinta preta continuam.', author: { ...A['seed-chris'] }, createdAt: iso(60*174), ref: 'a1c', parentRef: 'a1' },
        { body: 'Troquei achando vida nova. Continuo com buracos no gráfico. Só troquei o tipo de irritação.', author: { ...A['seed-gustavo'] }, createdAt: iso(60*170), ref: 'a2' },
        { body: 'Discordo um pouco: no 955 a detecção é menos chata. FC falha, mas dá pra viver no dia a dia.', author: { ...A['seed-joao'] }, createdAt: iso(60*165), parentRef: 'a2' },
        { body: 'No Forerunner o auto-pause do treino continua. Não comprem esperando milagre óptico.', author: { ...A['seed-thiago'] }, createdAt: iso(60*159), parentRef: 'a2' },
        { ...officialReply('Trocar de marca muda a UI e o bloqueio, mas o limite óptico da tinta permanece. O Sensor Tattoo Fix ataca a interface do sensor, não só o sintoma do ecossistema. Informe o modelo Garmin ou Apple para verificarmos a compatibilidade.', iso(60*152)), ref: 'a3', parentRef: 'a1c' }
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
        { body: 'Se o objetivo é sinal através de tinta densa, mudar de marca não muda a absorção do LED verde. Muda UX; a óptica continua a mesma lei.', author: { ...A['seed-edu'] }, createdAt: iso(60*212), ref: 'a1c', parentRef: 'a1' },
        { body: 'Fiquei no Apple e foquei na interface do sensor. Trocar seria overkill pra mim.', author: { ...A['seed-eduardo'] }, createdAt: iso(60*207), ref: 'a2' },
        { body: 'Concordo. O problema era o pulso, não a logo na caixa.', author: { ...A['seed-vini'] }, createdAt: iso(60*201), parentRef: 'a2' },
        { body: 'Tem gente que jura no Garmin. Eu estou no grupo não mudou nada de verdade.', author: { ...A['seed-gabriel'] }, createdAt: iso(60*194), ref: 'a3' },
        { ...officialReply('Antes de trocar o ecossistema inteiro, vale olhar a causa: leitura óptica no pulso tatuado. O Sensor Tattoo Fix foi pensado para isso sem forçar você a abandonar Apple ou Garmin. Informe o modelo atual para verificarmos a compatibilidade.', iso(60*186)), ref: 'a4', parentRef: 'a1c' }
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
        { body: 'Em movimento o PPG já luta com artefato de movimento. Tinta preta derruba o SNR e o filtro joga fora amostras — o treino fica cheio de gaps.', author: { ...A['seed-chris'] }, createdAt: iso(60*245), ref: 'a1c', parentRef: 'a1' },
        { body: 'Desativei o auto-pause e ainda assim o gráfico fica furado. Não é só UI.', author: { ...A['seed-marcos'] }, createdAt: iso(60*239), ref: 'a2' },
        { body: 'Eu troquei a pulseira oficial por uma mais apertada. Ajudou 10%. O resto continua lixo.', author: { ...A['seed-juliana'] }, createdAt: iso(60*232), parentRef: 'a2' },
        { body: 'No peito com cinta Polar a FC fica linda. No pulso tatuado o Galaxy inventa número.', author: { ...A['seed-leo'] }, createdAt: iso(60*224), parentRef: 'a1c' },
        { ...officialReply('Treino com suor e movimento amplifica a falha óptica em tinta escura. O Sensor Tattoo Fix estabiliza a leitura no pulso para o sensor voltar a ter sinal útil. Informe o modelo do Galaxy Watch para verificarmos a compatibilidade.', iso(60*220)), ref: 'a3', parentRef: 'a1c' }
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
        { body: 'Samsung também usa IR/verde para decidir se o relógio está no pulso. Quando o retorno some, o lock de segurança dispara — mesmo padrão do Apple, UI diferente.', author: { ...A['seed-edu'] }, createdAt: iso(60*278), ref: 'a1c', parentRef: 'a1' },
        { body: 'No meu Watch 4 acontecia. Troquei de braço e melhorou. No braço tatuado continua.', author: { ...A['seed-patricia'] }, createdAt: iso(60*271), ref: 'a2' },
        { body: 'Eu não tenho braço livre. Os dois estão cobertos. Travo o dia inteiro.', author: { ...A['seed-fernando'] }, createdAt: iso(60*263), parentRef: 'a2' },
        { body: 'Desativei o bloqueio automático e fiquei sem segurança. Péssima troca.', author: { ...A['seed-jordan'] }, createdAt: iso(60*259), parentRef: 'a1c' },
        { ...officialReply('Bloqueios repetidos costumam seguir falhas de detecção de pulso, não necessariamente defeito de fábrica. O Sensor Tattoo Fix melhora a estabilidade óptica nessa área. Informe o modelo Galaxy para verificarmos a compatibilidade.', iso(60*254)), ref: 'a3', parentRef: 'a1c' }
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
        { body: 'Huawei GT também é PPG refletivo. LED verde para FC e canais extras para SpO2 — tinta preta continua absorvendo o retorno, independente da autonomia de 14 dias.', author: { ...A['seed-chris'] }, createdAt: iso(60*311), ref: 'a1c', parentRef: 'a1' },
        { body: 'Comprei achando que marca chinesa ia magia. Não. Mesmo buraco no gráfico.', author: { ...A['seed-hunt'] }, createdAt: iso(60*303), ref: 'a2' },
        { body: 'A bateria longa me fez ficar. Aceito FC furada no treino, mas irrita.', author: { ...A['seed-writer'] }, createdAt: iso(60*299), parentRef: 'a2' },
        { ...officialReply('Autonomia alta não muda a física do PPG sob tinta. O Sensor Tattoo Fix atua na interface óptica do sensor. Se for comprar ou já tiver um GT, informe o modelo para verificarmos a compatibilidade.', iso(60*294)), ref: 'a3', parentRef: 'a1c' }
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
        { body: 'Algoritmos de sono Amazfit/Zepp descartam noites com PPG intermitente. Tinta no sensor = dropout de estágios e sessão quase nula.', author: { ...A['seed-edu'] }, createdAt: iso(60*344), ref: 'a1b', parentRef: 'a1' },
        { body: 'Tentei dormir com o relógio no tornozelo. Absurdo e ainda assim inútil.', author: { ...A['seed-moth'] }, createdAt: iso(60*340), ref: 'a2' },
        { body: 'No tornozelo a FC de treino também fica estranha. Não é atalho bom.', author: { ...A['seed-omens'] }, createdAt: iso(60*335), parentRef: 'a2' },
        { body: 'Antes do retoque funcionava. A tinta nova é bem mais saturada na área do sensor.', author: { ...A['seed-syrup'] }, createdAt: iso(60*329), parentRef: 'a1b' },
        { ...officialReply('Quando o PPG noturno fica intermitente, o app de sono perde a noite. O Sensor Tattoo Fix melhora o retorno óptico nessa faixa. Informe o modelo Amazfit para verificarmos a compatibilidade.', iso(60*322)), ref: 'a3', parentRef: 'a1b' }
      ]
    },
    {
      title: 'Por que algumas tattoos interferem e outras não?',
      body: 'Tenho aquarela clara de um lado e preto sólido do outro. O relógio só morre quando escorrega pra parte preta. Qual é a explicação física?',
      tags: ["tinta", "optica", "ppg", "tattoo"],
      author: { ...A['seed-ricardo'] },
      createdAt: iso(60*392),
      replies: [
        { body: 'Preto carbonado absorve forte o verde (~525 nm) do PPG. Cores claras espalham mais luz de volta ao fotodiodo. Por isso só o bloco preto derruba o sinal.', author: { ...A['seed-chris'] }, createdAt: iso(60*386), ref: 'a1' },
        { body: 'No meu braço o sombreado cinza atrapalha menos que o preenchimento cheio. Bate com o que o Chris disse.', author: { ...A['seed-edurunner'] }, createdAt: iso(60*382), ref: 'a1b', parentRef: 'a1' },
        { body: 'Eu tenho só linha fina e o Watch quase não reclama. Densidade importa mais que “ter tattoo”.', author: { ...A['seed-malu'] }, createdAt: iso(60*377), ref: 'a2' },
        { body: 'Além da cor, espessura da camada e cicatriz sob a tinta mudam espalhamento. Dois pretos “iguais” podem ter SNR bem diferente.', author: { ...A['seed-edu'] }, createdAt: iso(60*371), ref: 'a2b', parentRef: 'a2' },
        { body: 'Aprendi na marra: se o sensor para em cima do preenchimento, FC some. Dois centímetros ao lado, volta.', author: { ...A['seed-pri'] }, createdAt: iso(60*364), parentRef: 'a1b' },
        { ...officialReply('A interferência depende muito de cor, densidade e posição sob o sensor — não de “ter ou não ter tattoo”. O Sensor Tattoo Fix foi feito para estabilizar o retorno óptico nesses casos. Informe o modelo do seu relógio para verificarmos a compatibilidade.', iso(60*356)), ref: 'a3', parentRef: 'a1' }
      ]
    },
    {
      title: 'A tattoo pode estragar o relógio?',
      body: 'Pergunta sincera: usar o sensor em cima da tinta pode queimar LED, aquecer a pele ou danificar o módulo óptico com o tempo?',
      tags: ["seguranca", "led", "pele", "tattoo"],
      author: { ...A['seed-ana'] },
      createdAt: iso(60*426),
      replies: [
        { body: 'Na prática o LED não “queima” a tinta. O que acontece é o fotodiodo receber menos fótons — o relógio interpreta mal, mas o hardware não explode por causa da tattoo.', author: { ...A['seed-edu'] }, createdAt: iso(60*420), ref: 'a1' },
        { body: 'Eu fiquei paranóico com aquecimento. Meu Ultra esquenta igual no outro braço. O problema é leitura, não temperatura.', author: { ...A['seed-bela'] }, createdAt: iso(60*415), ref: 'a1b', parentRef: 'a1' },
        { body: 'Assistência da Apple me disse que tattoo não anula garantia, mas também não “conserta” detecção.', author: { ...A['seed-marcinha'] }, createdAt: iso(60*409), ref: 'a2' },
        { body: 'LEDs de smartwatch operam em potência baixa. Absorção da tinta muda o sinal de volta, não a vida útil típica do emissor.', author: { ...A['seed-chris'] }, createdAt: iso(60*402), parentRef: 'a2' },
        { ...officialReply('A tattoo normalmente não danifica o módulo; ela atrapalha a leitura óptica. O Sensor Tattoo Fix atua nessa interface de luz, sem alterar a tinta. Informe o modelo do seu smartwatch para verificarmos a compatibilidade.', iso(60*394)), ref: 'a3', parentRef: 'a1' }
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
        { body: 'O baseline do algoritmo aprendeu sua pele limpa. Depois da tinta o perfil de refletância muda e o filtro passa a rejeitar picos que antes aceitava.', author: { ...A['seed-chris'] }, createdAt: iso(60*448), ref: 'a1c', parentRef: 'a1' },
        { body: 'Esperei cicatrizar três semanas. Não voltou. Não é inchaço temporário.', author: { ...A['seed-nati'] }, createdAt: iso(60*441), ref: 'a2' },
        { body: 'Mesma espera aqui. Cicatrizou, tinta assentou, sensor continua cego no preenchimento.', author: { ...A['seed-raf'] }, createdAt: iso(60*433), parentRef: 'a2' },
        { body: 'Trocar pulseira e resetar não trouxe o baseline antigo. O hardware não esqueceu; a pele mudou.', author: { ...A['seed-lu'] }, createdAt: iso(60*429), parentRef: 'a1c' },
        { ...officialReply('Se o relógio era estável antes e piorou logo após a tattoo, o mais comum é a mudança óptica no pulso. O Sensor Tattoo Fix restaura uma interface mais legível para o sensor. Informe o modelo para verificarmos a compatibilidade.', iso(60*424)), ref: 'a3', parentRef: 'a1c' }
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
        { body: 'Sem pele limpa sob o módulo, você depende 100% da qualidade do retorno óptico. Não há braço reserva — o SNR tem que subir onde o sensor senta.', author: { ...A['seed-edu'] }, createdAt: iso(60*473), ref: 'a1c', parentRef: 'a1b' },
        { body: 'Pensei em vender o relógio. Ainda não vendi porque quero sono e pagamentos no pulso.', author: { ...A['seed-guga'] }, createdAt: iso(60*469), ref: 'a2' },
        { body: 'Mesmo dilema. Os dois braços tatuados matam a solução barata de só trocar de lado.', author: { ...A['seed-kai'] }, createdAt: iso(60*464), parentRef: 'a2' },
        { ...officialReply('Com os dois pulsos cobertos, improvisos de trocar de braço deixam de existir. O Sensor Tattoo Fix foi pensado exatamente para quem precisa de leitura estável na área tatuada. Informe o modelo do seu smartwatch para verificarmos a compatibilidade.', iso(60*458)), ref: 'a3', parentRef: 'a1c' }
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
        { body: 'Muitos firmwares amarram pausa fantasma à confiança de on-wrist mais estabilidade do PPG em movimento. Tinta e bounce da corrida cruzam o limiar o tempo todo.', author: { ...A['seed-chris'] }, createdAt: iso(60*514), ref: 'a1c', parentRef: 'a1' },
        { body: 'No Garmin o auto-pause também me zoava. Não é exclusivo de Apple.', author: { ...A['seed-bruno'] }, createdAt: iso(60*510), ref: 'a2' },
        { body: 'Eu gravei a tela. Dá pra ver o ícone de relógio removido piscando sem eu tocar em nada.', author: { ...A['seed-felipe'] }, createdAt: iso(60*505), parentRef: 'a2' },
        { body: 'Pulseira mais apertada reduziu uns 30% das pausas. O resto continua.', author: { ...A['seed-diego'] }, createdAt: iso(60*499), parentRef: 'a1c' },
        { ...officialReply('Pausas fantasma em corrida costumam refletir detecção de pulso instável sob tinta, não só configuração de treino. O Sensor Tattoo Fix ajuda a manter o contato óptico estável. Informe o modelo do relógio para verificarmos a compatibilidade.', iso(60*492)), ref: 'a3', parentRef: 'a1c' }
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
        { body: 'Fita pode mudar o índice de refração e o gap ar-pele por algumas horas. Não é interface óptica estável: suja, amarela e cria bolhas.', author: { ...A['seed-edu'] }, createdAt: iso(60*552), ref: 'a1c', parentRef: 'a1' },
        { body: 'Eu usei filme de PVC de cozinha. Pior ainda — escorrega e deixa resíduo gorduroso.', author: { ...A['seed-marcelo'] }, createdAt: iso(60*547), ref: 'a2' },
        { body: 'Qualquer gambiarra adesiva no vidro traseiro me deixa com medo de garantia.', author: { ...A['seed-fernanda'] }, createdAt: iso(60*541), parentRef: 'a2' },
        { body: 'Funciona um pouco e depois vira sujeira. Concordo com o SensorGuru: não é solução de verdade.', author: { ...A['seed-camila'] }, createdAt: iso(60*534), parentRef: 'a1c' },
        { ...officialReply('Fitas e filmes improvisados podem enganar o sensor por pouco tempo, mas degradam com suor e sujeira. O Sensor Tattoo Fix foi feito como interface óptica estável, não como gambiarra temporária. Informe o modelo do seu relógio para verificarmos a compatibilidade.', iso(60*526)), ref: 'a3', parentRef: 'a1c' }
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
        { body: 'Aumentar o gap entre LED/fotodiodo e pele quase sempre piora o acoplamento óptico. Silicone grosso é o contrário do que o PPG quer.', author: { ...A['seed-chris'] }, createdAt: iso(60*585), ref: 'a1c', parentRef: 'a1' },
        { body: 'Um amigo jura que o fino quase funcionou. No meu Watch 7 não.', author: { ...A['seed-rafa'] }, createdAt: iso(60*579), ref: 'a2' },
        { body: 'Quase não conta. Quero algo que sobreviva a um treino suado.', author: { ...A['seed-henrique'] }, createdAt: iso(60*572), parentRef: 'a2' },
        { body: 'Ainda por cima deixa marca circular no pulso. Horroroso.', author: { ...A['seed-carlos'] }, createdAt: iso(60*564), parentRef: 'a1c' },
        { ...officialReply('Espaçadores improvisados costumam afastar o sensor da pele e piorar o PPG. O Sensor Tattoo Fix trabalha a interface óptica sem criar esse gap inútil. Informe o modelo do seu smartwatch para verificarmos a compatibilidade.', iso(60*560)), ref: 'a3', parentRef: 'a1c' }
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
        { body: 'Não é laser nem remoção. É acoplamento óptico: melhorar o caminho da luz entre LEDs/fotodiodo e a pele tatuada, sem apagar pigmento.', author: { ...A['seed-edu'] }, createdAt: iso(60*618), ref: 'a1c', parentRef: 'a1' },
        { body: 'Boa, porque eu também assustei com a palavra fix no nome.', author: { ...A['seed-daniel'] }, createdAt: iso(60*611), ref: 'a2' },
        { body: 'Mesma paranoia. Tattoo demorou anos; não quero corrigir ela com luz forte.', author: { ...A['seed-marina'] }, createdAt: iso(60*603), parentRef: 'a2' },
        { ...officialReply('Sensor Tattoo Fix não é laser e não remove tinta: é uma solução de interface óptica para o sensor do smartwatch. Se quiser detalhes de encaixe, informe o modelo do seu relógio para verificarmos a compatibilidade.', iso(60*599)), ref: 'a3', parentRef: 'a1c' }
      ]
    },
    {
      title: 'Tinta preta é realmente pior?',
      body: 'Meu desenho tem preto, vermelho e amarelo. O relógio só falha quando escorrega para a parte preta. Confirma a teoria?',
      tags: ["tinta-preta", "cor", "ppg", "tattoo"],
      author: { ...A['seed-fernando'] },
      createdAt: iso(60*664),
      replies: [
        { body: 'Preto carbonado engole o LED verde; vermelho e amarelo devolvem bem mais fótons ao fotodiodo. Sua observação bate com a física do PPG.', author: { ...A['seed-chris'] }, createdAt: iso(60*658), ref: 'a1' },
        { body: 'No meu braço o amarelo quase não atrapalha. O preto sólido é outro planeta.', author: { ...A['seed-ricardo'] }, createdAt: iso(60*651), ref: 'a1b', parentRef: 'a1' },
        { body: 'SpO2 usa vermelho/IR e também sofre no preto denso, mas a FC contínua (verde) costuma cair primeiro.', author: { ...A['seed-leandro'] }, createdAt: iso(60*643), parentRef: 'a1b' },
        { body: 'Por isso artistas que entendem de wearables deixam uma janela sem preenchimento sob o sensor.', author: { ...A['seed-gustavo'] }, createdAt: iso(60*639), ref: 'a2' },
        { body: 'Eu já tinha o preenchimento. Janela agora seria cover-up caro. Preciso de outra saída.', author: { ...A['seed-joao'] }, createdAt: iso(60*634), parentRef: 'a2' },
        { ...officialReply('Preto denso é o pior cenário para PPG verde, exatamente como você descreveu. O Sensor Tattoo Fix melhora o retorno óptico nessa região sem exigir apagar a arte. Informe o modelo do relógio para verificarmos a compatibilidade.', iso(60*628)), ref: 'a3', parentRef: 'a1' }
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
        { body: 'Suor cria filme e microbolhas que somam ao déficit de retorno da tinta. O filtro de movimento já está no limite; o combo derruba o SNR.', author: { ...A['seed-edu'] }, createdAt: iso(60*684), ref: 'a1c', parentRef: 'a1' },
        { body: 'Sequei o sensor no meio do treino com a camisa. Voltou por dois minutos e morreu de novo.', author: { ...A['seed-lucas'] }, createdAt: iso(60*680), ref: 'a2' },
        { body: 'No bike indoor com menos suor horizontal também falha, só que mais tarde. Não é só corrida.', author: { ...A['seed-eduardo'] }, createdAt: iso(60*675), parentRef: 'a2' },
        { body: 'Água entre sensor e pele muda reflexão especular. Sobre tinta preta você já está no fio da navalha — qualquer filme empurra para o dropout.', author: { ...A['seed-chris'] }, createdAt: iso(60*669), parentRef: 'a1c' },
        { ...officialReply('Suor amplifica a falha óptica em pulsos tatuados porque soma película irregular a um retorno já fraco. O Sensor Tattoo Fix estabiliza essa interface. Informe o modelo do seu smartwatch para verificarmos a compatibilidade.', iso(60*662)), ref: 'a3', parentRef: 'a1c' }
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
        { body: 'Teste A/B de braço é o diagnóstico mais barato: se o hardware falha só sobre tinta, não é módulo morto — é óptica.', author: { ...A['seed-chris'] }, createdAt: iso(60*722), ref: 'a1c', parentRef: 'a1' },
        { body: 'Eu já tinha marcado coleta da assistência. Cancelei depois desse teste.', author: { ...A['seed-vini'] }, createdAt: iso(60*717), ref: 'a2' },
        { body: 'Logs de FC com gaps só num braço também contam. Não precisa abrir o relógio.', author: { ...A['seed-gabriel'] }, createdAt: iso(60*711), parentRef: 'a2' },
        { ...officialReply('Se o mesmo relógio funciona no braço sem tinta, o mais provável é interferência óptica, não defeito de fábrica. O Sensor Tattoo Fix trata essa interface. Informe o modelo para verificarmos a compatibilidade.', iso(60*704)), ref: 'a3', parentRef: 'a1c' }
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
        { body: 'Enquanto existia pele limpa, o sistema sempre tinha um caminho de alto SNR. Sem ele, o algoritmo não tem referência fácil.', author: { ...A['seed-edu'] }, createdAt: iso(60*755), ref: 'a1c', parentRef: 'a1' },
        { body: 'Eu adiei o segundo braço por causa disso. Você foi mais corajoso — ou mais teimoso.', author: { ...A['seed-marcos'] }, createdAt: iso(60*749), ref: 'a2' },
        { body: 'Teimoso aqui também. Arte primeiro, wearables depois. Agora pago o preço.', author: { ...A['seed-juliana'] }, createdAt: iso(60*742), parentRef: 'a2' },
        { body: 'Não há milagre de firmware que invente retorno óptico onde a tinta engoliu o verde. Ou sobe o sinal na interface, ou aceita gaps.', author: { ...A['seed-chris'] }, createdAt: iso(60*734), parentRef: 'a1c' },
        { ...officialReply('Perder o braço reserva deixa clara a causa óptica. O Sensor Tattoo Fix existe para quem precisa ler o sensor sobre a área tatuada. Informe o modelo do seu smartwatch para verificarmos a compatibilidade.', iso(60*730)), ref: 'a3', parentRef: 'a1c' }
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
        { body: 'Todas usam PPG refletivo. Diferenças estão em limiares de segurança e UX, não em milagre óptico contra carbono preto.', author: { ...A['seed-chris'] }, createdAt: iso(60*788), ref: 'a1c', parentRef: 'a1' },
        { body: 'Eu testei Apple e Garmin no mesmo braço. Nenhum salvou o treino de força.', author: { ...A['seed-renato'] }, createdAt: iso(60*781), ref: 'a2' },
        { body: 'Huawei ganha em bateria. Sensor continua medíocre sobre preenchimento.', author: { ...A['seed-patricia'] }, createdAt: iso(60*773), parentRef: 'a2' },
        { body: 'Se a métrica é menos spam de segurança, Garmin/Amazfit. Se a métrica é PPG limpo sob tinta, nenhuma marca resolve sozinha.', author: { ...A['seed-edu'] }, createdAt: iso(60*769), parentRef: 'a1c' },
        { ...officialReply('A marca muda a experiência de bloqueio e app, mas a física do PPG sob tinta escura é compartilhada. O Sensor Tattoo Fix atua nessa camada óptica. Informe o modelo que você usa ou pretende comprar para verificarmos a compatibilidade.', iso(60*764)), ref: 'a3', parentRef: 'a1c' }
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
        { body: 'Quando amostras caem abaixo do limiar de qualidade, o firmware injeta gaps ou interpola mal. Tinta + movimento = rejeição em massa.', author: { ...A['seed-edu'] }, createdAt: iso(60*821), ref: 'a1c', parentRef: 'a1' },
        { body: 'Achei que era GPS. Desliguei GPS e o gráfico de FC continuou furado.', author: { ...A['seed-jordan'] }, createdAt: iso(60*813), ref: 'a2' },
        { body: 'GPS não gera esses gaps de BPM. Isso é pipeline óptica: LED verde → pele/tinta → fotodiodo → filtro.', author: { ...A['seed-chris'] }, createdAt: iso(60*809), parentRef: 'a2' },
        { body: 'Cinta peitoral resolve o gráfico, mas eu quero o relógio funcionando no pulso.', author: { ...A['seed-jeff'] }, createdAt: iso(60*804), parentRef: 'a1c' },
        { ...officialReply('Buracos e picos fantasmas no gráfico costumam nascer de amostras ópticas rejeitadas sob tinta. O Sensor Tattoo Fix melhora a qualidade do sinal na origem. Informe o modelo do seu smartwatch para verificarmos a compatibilidade.', iso(60*798)), ref: 'a3', parentRef: 'a1c' }
      ]
    },
    {
      title: 'SpO2 também falha por causa da tattoo?',
      body: 'Além da frequência, a saturação dá erro quase sempre. Ela usa outra luz; ainda assim a tinta interfere?',
      tags: ["spo2", "oxigenio", "sensor", "tattoo"],
      author: { ...A['seed-moth'] },
      createdAt: iso(60*868),
      replies: [
        { body: 'SpO2 típico usa vermelho + IR. Tinta escura ainda absorve e desbalanceia a razão entre canais — daí erro ou valor inventado.', author: { ...A['seed-chris'] }, createdAt: iso(60*862), ref: 'a1' },
        { body: 'No meu Ultra a medição de oxigênio trava em calculando… até eu mudar de braço.', author: { ...A['seed-hunt'] }, createdAt: iso(60*854), ref: 'a1b', parentRef: 'a1' },
        { body: 'FC verde cai primeiro; SpO2 vermelho/IR cai depois ou junto, dependendo da densidade e do comprimento de onda absorvido pela tinta.', author: { ...A['seed-edu'] }, createdAt: iso(60*850), parentRef: 'a1b' },
        { body: 'Achei que SpO2 seria imune. Não é. Mesma área preta, mesmo fracasso.', author: { ...A['seed-writer'] }, createdAt: iso(60*845), ref: 'a2' },
        { ...officialReply('SpO2 também depende de retorno óptico limpo; tinta escura atrapalha os canais vermelho/IR. O Sensor Tattoo Fix melhora essa interface. Informe o modelo do seu smartwatch para verificarmos a compatibilidade.', iso(60*839)), ref: 'a3', parentRef: 'a1' }
      ]
    },
    {
      title: 'Ainda vale comprar smartwatch tendo tattoo?',
      body: 'Quero sono, treino e pagamentos, mas tenho os dois pulsos tatuados. É jogar dinheiro fora ou ainda faz sentido?',
      tags: ["compra", "vale-a-pena", "tattoo", "smartwatch"],
      author: { ...A['seed-jordan'] },
      createdAt: iso(60*902),
      replies: [
        { body: 'Faz sentido se você resolver a óptica. Sem isso vira notificação cara no pulso.', author: { ...A['seed-huck'] }, createdAt: iso(60*896), ref: 'a1' },
        { body: 'Sem caminho óptico estável, sono/FC/Pay ficam inconsistentes. O hardware novo não cancela absorção de tinta.', author: { ...A['seed-edu'] }, createdAt: iso(60*892), ref: 'a1c', parentRef: 'a1' },
        { body: 'Eu comprei mesmo assim pelos apps. FC eu ignoro. Não recomendo essa paz podre.', author: { ...A['seed-moth'] }, createdAt: iso(60*887), ref: 'a2' },
        { body: 'Se o orçamento aperta, resolva a interface antes de upar de geração.', author: { ...A['seed-omens'] }, createdAt: iso(60*881), parentRef: 'a2' },
        { body: 'Compre se a proposta do relógio importa pra você — mas planeje o acoplamento óptico como parte do setup, não como detalhe.', author: { ...A['seed-chris'] }, createdAt: iso(60*874), parentRef: 'a1c' },
        { ...officialReply('Smartwatch ainda faz sentido com tattoos se a leitura óptica for estabilizada. O Sensor Tattoo Fix existe justamente para esse cenário. Informe o modelo que você está olhando para verificarmos a compatibilidade.', iso(60*866)), ref: 'a3', parentRef: 'a1c' }
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
        { body: 'Água + cola improvisada = curto caminho pro resíduo no vidro. Tive que limpar com isopropanol.', author: { ...A['seed-chris'] }, createdAt: iso(60*925), ref: 'a1b', parentRef: 'a1' },
        { body: 'O MagSafe do Ultra ficou frouxo. Às vezes carrega, às vezes não. Odeio isso.', author: { ...A['seed-edurunner'] }, createdAt: iso(60*919), ref: 'a1c', parentRef: 'a1b' },
        { body: 'Camada de epóxi muda gap e capacitância vista pelo carregador e pelo eletrodo de ECG. Pode consertar PPG e quebrar outras funções no mesmo movimento.', author: { ...A['seed-edu'] }, createdAt: iso(60*912), ref: 'a1d', parentRef: 'a1c' },
        { body: 'ECG no meu Series 9 zerou com o adesivo. Removi e voltou. Trade ridículo.', author: { ...A['seed-malu'] }, createdAt: iso(60*904), ref: 'a1e', parentRef: 'a1d' },
        { body: 'Cortei o adesivo menor que o anel do sensor. Carregou melhor, mas a detecção piorou de novo.', author: { ...A['seed-pri'] }, createdAt: iso(60*900), ref: 'a2' },
        { body: 'Você está otimizando gap ótico contra contato elétrico/indutivo. DIY epóxi não foi desenhado como interface PPG — daí o conflito.', author: { ...A['seed-chris'] }, createdAt: iso(60*895), ref: 'a2b', parentRef: 'a2' },
        { body: 'Suor matou o meu em uma semana. A borda virou uma trilha suja. Zero glamour.', author: { ...A['seed-bela'] }, createdAt: iso(60*889), ref: 'a2c', parentRef: 'a2b' },
        { body: 'Concordo com o TechRunner. Funciona até não funcionar — e sempre quebra outra coisa.', author: { ...A['seed-marcinha'] }, createdAt: iso(60*882), ref: 'a2d', parentRef: 'a2c' },
        { body: 'Tem gente vendendo kit de epóxi no Instagram como solução definitiva. Cuidado.', author: { ...A['seed-rick'] }, createdAt: iso(60*874), ref: 'a2e', parentRef: 'a2d' },
        { body: 'Eu voltei pro braço sem tinta. Epóxi foi só experimento caro e meleca.', author: { ...A['seed-nati'] }, createdAt: iso(60*870), parentRef: 'a2e' },
        { ...officialReply('Relatos assim são comuns: gambiarra de epóxi pode melhorar PPG por um tempo e ao mesmo tempo atrapalhar carga, ECG e durabilidade. O Sensor Tattoo Fix foi desenvolvido como interface óptica específica para o sensor, sem esse improviso. Informe o modelo do seu smartwatch para verificarmos a compatibilidade.', iso(60*865)), ref: 'a3', parentRef: 'a2b' }
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
        { body: 'Com SNR baixo o detector de picos agarra harmônicos e ruído e vê FC alta. Depois perde lock e mostra traço. Clássico de PPG degradado.', author: { ...A['seed-edu'] }, createdAt: iso(60*958), ref: 'a1c', parentRef: 'a1' },
        { body: 'Desativei notificações de FC alta pra não pirar. Não resolve a causa.', author: { ...A['seed-lu'] }, createdAt: iso(60*951), ref: 'a2' },
        { body: 'Avisos falsos são sintoma do mesmo pipeline: sinal sujo → algoritmo confiante demais em um pico errado.', author: { ...A['seed-chris'] }, createdAt: iso(60*943), parentRef: 'a2' },
        { body: 'No outro braço nunca inventou 180. Acabou a teoria da ansiedade.', author: { ...A['seed-rita'] }, createdAt: iso(60*939), parentRef: 'a1c' },
        { ...officialReply('Leituras absurdas em repouso com gaps no meio costumam vir de sinal óptico confuso sob tinta. O Sensor Tattoo Fix estabiliza o retorno para o algoritmo parar de inventar picos. Informe o modelo do seu Apple Watch para verificarmos a compatibilidade.', iso(60*934)), ref: 'a3', parentRef: 'a1c' }
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
        { body: 'Apple Watch passcode lock leans on the IR proximity channel. Dense ink kills the return and the system treats it as removal — that is why you get code spam, not a random software bug.', author: { ...A['seed-chris'] }, createdAt: iso(60*31), ref: 'a1c', parentRef: 'a1' },
        { body: 'I also turned off Unlock with iPhone thinking it would help. Zero difference.', author: { ...A['seed-felipe'] }, createdAt: iso(60*24), ref: 'a2' },
        { ...officialReply('When wrist detection flickers, Apple Watch tightens security and asks for a passcode as if it were removed. Sensor Tattoo Fix improves the optical interface in that area. Tell us your exact Apple Watch model so we can check compatibility.', iso(60*16)), ref: 'a3', parentRef: 'a1c' }
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
        { body: 'Sleep needs stable PPG for hours. When SNR drops, the stage classifier cuts whole blocks and the session becomes insufficient data.', author: { ...A['seed-edu'] }, createdAt: iso(60*75), ref: 'a1b', parentRef: 'a1' },
        { body: 'I slept with a tighter band and woke with a red mark. Still shows 1h.', author: { ...A['seed-andre'] }, createdAt: iso(60*69), ref: 'a2' },
        { body: 'Overtightening hurts circulation and makes the signal worse. Not a fix.', author: { ...A['seed-marcelo'] }, createdAt: iso(60*62), parentRef: 'a2' },
        { body: 'Same on Amazfit: a 40-minute nap after a full night. Not just Apple.', author: { ...A['seed-fernanda'] }, createdAt: iso(60*54), parentRef: 'a1b' },
        { ...officialReply('Overnight tracking fails when the optical return stays irregular for hours. Sensor Tattoo Fix stabilizes that reading on a tattooed wrist. If you want, tell us your smartwatch model so we can check compatibility.', iso(60*50)), ref: 'a3', parentRef: 'a1b' }
      ]
    },
    {
      title: 'Which Apple Watch works best with tattoos?',
      body: 'Choosing between SE 2, Series 10 and Ultra 2. Dense tattoo on dominant wrist. Is Ultra worth it or will they all struggle the same?',
      tags: ["apple-watch", "model", "compatibility", "tattoo"],
      author: { ...A['seed-pedro'] },
      createdAt: iso(60*120),
      replies: [
        { body: 'On Ultra 2. Still passcode spam. Better hardware, same ink physics.', author: { ...A['seed-camila'] }, createdAt: iso(60*114), ref: 'a1' },
        { body: 'Newer Series improve sampling and green LEDs, but PPG + IR on-wrist is the same principle. The model alone does not beat black ink over the photodiode.', author: { ...A['seed-chris'] }, createdAt: iso(60*108), ref: 'a1c', parentRef: 'a1' },
        { body: 'Series 9 here. Worse than my husband\'s without tattoos. Never tried SE.', author: { ...A['seed-rafa'] }, createdAt: iso(60*101), ref: 'a2' },
        { body: 'Went SE to 9 hoping it would fix it. Almost the same drama. Money wasted.', author: { ...A['seed-henrique'] }, createdAt: iso(60*93), parentRef: 'a2' },
        { body: 'Honestly: if ink covers the sensor, every generation struggles. Do not buy Ultra just for that.', author: { ...A['seed-carlos'] }, createdAt: iso(60*89), parentRef: 'a1c' },
        { ...officialReply('Generations change LEDs and processing, but the optical obstacle from ink remains. Sensor Tattoo Fix exists for that gap, regardless of model. Tell us which Apple Watch you are considering so we can check compatibility.', iso(60*84)), ref: 'a3', parentRef: 'a1c' }
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
        { body: 'Wallet needs high on-wrist confidence. That bar is stricter than continuous HR — borderline signal blocks Pay before the BPM chart dies.', author: { ...A['seed-edu'] }, createdAt: iso(60*141), ref: 'a1c', parentRef: 'a1' },
        { body: 'Thought it was the card. Removed and re-added it. It was not.', author: { ...A['seed-daniel'] }, createdAt: iso(60*133), ref: 'a2' },
        { body: 'Reset the Watch and restored a backup. Only better on the arm without ink.', author: { ...A['seed-marina'] }, createdAt: iso(60*129), parentRef: 'a2' },
        { body: 'Galaxy Google Wallet does something similar. Not Apple-only.', author: { ...A['seed-ricardo'] }, createdAt: iso(60*124), parentRef: 'a1c' },
        { ...officialReply('Tap-to-pay is often first to fail when wrist detection loses confidence. Sensor Tattoo Fix improves that optical reading. Tell us your Apple Watch model so we can check compatibility.', iso(60*118)), ref: 'a3', parentRef: 'a1c' }
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
        { body: 'Garmin also uses green PPG + IR. Watch-removed thresholds differ, so Apple\'s lock fades — but HR gaps and SpO2 issues on black ink remain.', author: { ...A['seed-chris'] }, createdAt: iso(60*174), ref: 'a1c', parentRef: 'a1' },
        { body: 'Switched thinking new life. Still holes in the chart. Just traded the kind of annoyance.', author: { ...A['seed-gustavo'] }, createdAt: iso(60*170), ref: 'a2' },
        { body: 'Disagree a bit: on the 955 detection is less annoying. HR fails, but daily life is fine.', author: { ...A['seed-joao'] }, createdAt: iso(60*165), parentRef: 'a2' },
        { body: 'On Forerunner workout auto-pause still happens. Do not buy expecting an optical miracle.', author: { ...A['seed-thiago'] }, createdAt: iso(60*159), parentRef: 'a2' },
        { ...officialReply('Switching brands changes UI and lock behavior, but the optical limit from ink remains. Sensor Tattoo Fix targets the sensor interface, not only the ecosystem symptom. Tell us your Garmin or Apple model so we can check compatibility.', iso(60*152)), ref: 'a3', parentRef: 'a1c' }
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
        { body: 'If the goal is signal through dense ink, changing brands does not change green LED absorption. UX changes; optics stay the same law.', author: { ...A['seed-edu'] }, createdAt: iso(60*212), ref: 'a1c', parentRef: 'a1' },
        { body: 'Stayed on Apple and focused on the sensor interface. Switching would be overkill for me.', author: { ...A['seed-eduardo'] }, createdAt: iso(60*207), ref: 'a2' },
        { body: 'Agree. The problem was the wrist, not the logo on the box.', author: { ...A['seed-vini'] }, createdAt: iso(60*201), parentRef: 'a2' },
        { body: 'Some swear by Garmin. I am in the nothing really changed camp.', author: { ...A['seed-gabriel'] }, createdAt: iso(60*194), ref: 'a3' },
        { ...officialReply('Before swapping your whole ecosystem, look at the cause: optical reading on a tattooed wrist. Sensor Tattoo Fix was designed for that without forcing you off Apple or Garmin. Tell us your current model so we can check compatibility.', iso(60*186)), ref: 'a4', parentRef: 'a1c' }
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
        { body: 'In motion PPG already fights motion artifact. Black ink tanks SNR and the filter discards samples — workouts fill with gaps.', author: { ...A['seed-chris'] }, createdAt: iso(60*245), ref: 'a1c', parentRef: 'a1' },
        { body: 'Disabled auto-pause and the chart is still full of holes. Not just UI.', author: { ...A['seed-marcos'] }, createdAt: iso(60*239), ref: 'a2' },
        { body: 'Swapped the stock band for a tighter one. Helped maybe 10%. Rest still garbage.', author: { ...A['seed-juliana'] }, createdAt: iso(60*232), parentRef: 'a2' },
        { body: 'Chest strap with Polar looks clean. On the tattooed wrist Galaxy invents numbers.', author: { ...A['seed-leo'] }, createdAt: iso(60*224), parentRef: 'a1c' },
        { ...officialReply('Sweaty moving workouts amplify optical failure on dark ink. Sensor Tattoo Fix stabilizes wrist reading so the sensor gets usable signal again. Tell us your Galaxy Watch model so we can check compatibility.', iso(60*220)), ref: 'a3', parentRef: 'a1c' }
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
        { body: 'Samsung also uses IR/green to decide the watch is on-wrist. When the return vanishes, the security lock fires — same pattern as Apple, different UI.', author: { ...A['seed-edu'] }, createdAt: iso(60*278), ref: 'a1c', parentRef: 'a1' },
        { body: 'Happened on my Watch 4. Switching arms helped. Tattooed arm still locks.', author: { ...A['seed-patricia'] }, createdAt: iso(60*271), ref: 'a2' },
        { body: 'I have no clear arm. Both are covered. I lock all day.', author: { ...A['seed-fernando'] }, createdAt: iso(60*263), parentRef: 'a2' },
        { body: 'I turned off auto-lock and lost security. Terrible trade.', author: { ...A['seed-jordan'] }, createdAt: iso(60*259), parentRef: 'a1c' },
        { ...officialReply('Repeated locks usually follow wrist-detection failures, not necessarily a factory defect. Sensor Tattoo Fix improves optical stability in that area. Tell us your Galaxy model so we can check compatibility.', iso(60*254)), ref: 'a3', parentRef: 'a1c' }
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
        { body: 'Huawei GT is reflective PPG too. Green LED for HR and extra channels for SpO2 — black ink still absorbs the return, no matter the 14-day battery.', author: { ...A['seed-chris'] }, createdAt: iso(60*311), ref: 'a1c', parentRef: 'a1' },
        { body: 'Bought thinking a Chinese brand would magic it. Nope. Same holes in the chart.', author: { ...A['seed-hunt'] }, createdAt: iso(60*303), ref: 'a2' },
        { body: 'Long battery made me stay. I accept holey HR in workouts, but it annoys me.', author: { ...A['seed-writer'] }, createdAt: iso(60*299), parentRef: 'a2' },
        { ...officialReply('Long battery life does not change PPG physics under ink. Sensor Tattoo Fix works on the sensor\'s optical interface. If you are buying or already own a GT, tell us the model so we can check compatibility.', iso(60*294)), ref: 'a3', parentRef: 'a1c' }
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
        { body: 'Amazfit/Zepp sleep algorithms discard nights with intermittent PPG. Ink on the sensor = stage dropout and a near-empty session.', author: { ...A['seed-edu'] }, createdAt: iso(60*344), ref: 'a1b', parentRef: 'a1' },
        { body: 'Tried sleeping with the watch on my ankle. Absurd and still useless.', author: { ...A['seed-moth'] }, createdAt: iso(60*340), ref: 'a2' },
        { body: 'Ankle HR for workouts is weird too. Not a good shortcut.', author: { ...A['seed-omens'] }, createdAt: iso(60*335), parentRef: 'a2' },
        { body: 'Worked before the touch-up. New ink is much more saturated under the sensor.', author: { ...A['seed-syrup'] }, createdAt: iso(60*329), parentRef: 'a1b' },
        { ...officialReply('When overnight PPG goes intermittent, the sleep app loses the night. Sensor Tattoo Fix improves optical return in that band. Tell us your Amazfit model so we can check compatibility.', iso(60*322)), ref: 'a3', parentRef: 'a1b' }
      ]
    },
    {
      title: 'Why do some tattoos interfere and others do not?',
      body: 'I have light watercolor on one side and solid black on the other. The watch only dies when it slides onto the black. What is the physical explanation?',
      tags: ["ink", "optics", "ppg", "tattoo"],
      author: { ...A['seed-ricardo'] },
      createdAt: iso(60*392),
      replies: [
        { body: 'Carbon black strongly absorbs green (~525 nm) PPG light. Light colors scatter more light back to the photodiode. That is why only the black block kills the signal.', author: { ...A['seed-chris'] }, createdAt: iso(60*386), ref: 'a1' },
        { body: 'On my arm gray shading hurts less than solid fill. Matches what Chris said.', author: { ...A['seed-edurunner'] }, createdAt: iso(60*382), ref: 'a1b', parentRef: 'a1' },
        { body: 'I only have fine line work and the Watch barely complains. Density matters more than “having a tattoo”.', author: { ...A['seed-malu'] }, createdAt: iso(60*377), ref: 'a2' },
        { body: 'Beyond color, layer thickness and scar under the ink change scattering. Two “same” blacks can have very different SNR.', author: { ...A['seed-edu'] }, createdAt: iso(60*371), ref: 'a2b', parentRef: 'a2' },
        { body: 'Learned the hard way: sensor on the fill → HR gone. Two centimeters aside → back.', author: { ...A['seed-pri'] }, createdAt: iso(60*364), parentRef: 'a1b' },
        { ...officialReply('Interference depends heavily on color, density, and position under the sensor — not simply “having a tattoo”. Sensor Tattoo Fix was built to stabilize optical return in those cases. Tell us your watch model so we can check compatibility.', iso(60*356)), ref: 'a3', parentRef: 'a1' }
      ]
    },
    {
      title: 'Can a tattoo damage the watch?',
      body: 'Honest question: can running the sensor over ink burn LEDs, heat the skin, or damage the optical module over time?',
      tags: ["safety", "led", "skin", "tattoo"],
      author: { ...A['seed-ana'] },
      createdAt: iso(60*426),
      replies: [
        { body: 'In practice the LED does not “burn” the ink. The photodiode just gets fewer photons — the watch misreads, but hardware does not explode because of a tattoo.', author: { ...A['seed-edu'] }, createdAt: iso(60*420), ref: 'a1' },
        { body: 'I got paranoid about heat. My Ultra warms the same on the other arm. It is a reading issue, not temperature.', author: { ...A['seed-bela'] }, createdAt: iso(60*415), ref: 'a1b', parentRef: 'a1' },
        { body: 'Apple support said tattoos do not void warranty, but also do not “fix” detection.', author: { ...A['seed-marcinha'] }, createdAt: iso(60*409), ref: 'a2' },
        { body: 'Smartwatch LEDs run at low power. Ink absorption changes the return signal, not typical emitter lifespan.', author: { ...A['seed-chris'] }, createdAt: iso(60*402), parentRef: 'a2' },
        { ...officialReply('A tattoo usually does not damage the module; it interferes with optical reading. Sensor Tattoo Fix works on that light interface without changing the ink. Tell us your smartwatch model so we can check compatibility.', iso(60*394)), ref: 'a3', parentRef: 'a1' }
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
        { body: 'The algorithm baseline learned your clear skin. After ink the reflectance profile changes and the filter starts rejecting peaks it used to accept.', author: { ...A['seed-chris'] }, createdAt: iso(60*448), ref: 'a1c', parentRef: 'a1' },
        { body: 'Waited three weeks to heal. Did not come back. Not temporary swelling.', author: { ...A['seed-nati'] }, createdAt: iso(60*441), ref: 'a2' },
        { body: 'Same wait here. Healed, ink settled, sensor still blind on the fill.', author: { ...A['seed-raf'] }, createdAt: iso(60*433), parentRef: 'a2' },
        { body: 'New band and reset did not bring the old baseline back. Hardware did not forget; the skin changed.', author: { ...A['seed-lu'] }, createdAt: iso(60*429), parentRef: 'a1c' },
        { ...officialReply('If the watch was stable before and worsened right after the tattoo, the usual cause is the optical change at the wrist. Sensor Tattoo Fix restores a more readable interface for the sensor. Tell us the model so we can check compatibility.', iso(60*424)), ref: 'a3', parentRef: 'a1c' }
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
        { body: 'With no clear skin under the module, you depend 100% on optical return quality. No backup arm — SNR has to rise where the sensor sits.', author: { ...A['seed-edu'] }, createdAt: iso(60*473), ref: 'a1c', parentRef: 'a1b' },
        { body: 'Thought about selling the watch. Have not yet because I still want sleep and payments on the wrist.', author: { ...A['seed-guga'] }, createdAt: iso(60*469), ref: 'a2' },
        { body: 'Same dilemma. Both arms tattooed kill the cheap just-switch-sides fix.', author: { ...A['seed-kai'] }, createdAt: iso(60*464), parentRef: 'a2' },
        { ...officialReply('With both wrists covered, switching-arm workarounds disappear. Sensor Tattoo Fix was designed for people who need stable reading on the tattooed area. Tell us your smartwatch model so we can check compatibility.', iso(60*458)), ref: 'a3', parentRef: 'a1c' }
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
        { body: 'Many firmwares tie phantom pauses to on-wrist confidence plus PPG stability while moving. Ink and running bounce cross the threshold constantly.', author: { ...A['seed-chris'] }, createdAt: iso(60*514), ref: 'a1c', parentRef: 'a1' },
        { body: 'Garmin auto-pause messed with me too. Not Apple-only.', author: { ...A['seed-bruno'] }, createdAt: iso(60*510), ref: 'a2' },
        { body: 'I screen-recorded it. You can see the watch-removed icon flicker without me touching anything.', author: { ...A['seed-felipe'] }, createdAt: iso(60*505), parentRef: 'a2' },
        { body: 'Tighter band cut pauses by maybe 30%. The rest remains.', author: { ...A['seed-diego'] }, createdAt: iso(60*499), parentRef: 'a1c' },
        { ...officialReply('Phantom pauses on runs usually reflect unstable wrist detection under ink, not only workout settings. Sensor Tattoo Fix helps keep optical contact stable. Tell us your watch model so we can check compatibility.', iso(60*492)), ref: 'a3', parentRef: 'a1c' }
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
        { body: 'Tape can change refractive index and the air-skin gap for a few hours. Not a stable optical interface: it dirties, yellows, and bubbles.', author: { ...A['seed-edu'] }, createdAt: iso(60*552), ref: 'a1c', parentRef: 'a1' },
        { body: 'I used kitchen PVC film. Even worse — slips and leaves greasy residue.', author: { ...A['seed-marcelo'] }, createdAt: iso(60*547), ref: 'a2' },
        { body: 'Any sticky hack on the rear glass makes me worry about warranty.', author: { ...A['seed-fernanda'] }, createdAt: iso(60*541), parentRef: 'a2' },
        { body: 'Works a bit then becomes dirt. Agree with SensorGuru: not a real solution.', author: { ...A['seed-camila'] }, createdAt: iso(60*534), parentRef: 'a1c' },
        { ...officialReply('Improvised tapes and films can fool the sensor briefly, but degrade with sweat and dirt. Sensor Tattoo Fix was built as a stable optical interface, not a temporary hack. Tell us your watch model so we can check compatibility.', iso(60*526)), ref: 'a3', parentRef: 'a1c' }
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
        { body: 'Increasing the gap between LED/photodiode and skin almost always worsens optical coupling. Thick silicone is the opposite of what PPG wants.', author: { ...A['seed-chris'] }, createdAt: iso(60*585), ref: 'a1c', parentRef: 'a1' },
        { body: 'A friend swears the thin one almost worked. On my Watch 7, no.', author: { ...A['seed-rafa'] }, createdAt: iso(60*579), ref: 'a2' },
        { body: 'Almost does not count. I want something that survives a sweaty workout.', author: { ...A['seed-henrique'] }, createdAt: iso(60*572), parentRef: 'a2' },
        { body: 'Also leaves a circular mark on the wrist. Hideous.', author: { ...A['seed-carlos'] }, createdAt: iso(60*564), parentRef: 'a1c' },
        { ...officialReply('Improvised spacers usually lift the sensor off the skin and worsen PPG. Sensor Tattoo Fix works the optical interface without creating that useless gap. Tell us your smartwatch model so we can check compatibility.', iso(60*560)), ref: 'a3', parentRef: 'a1c' }
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
        { body: 'Not a laser and not removal. It is optical coupling: improving the light path between LEDs/photodiode and tattooed skin, without erasing pigment.', author: { ...A['seed-edu'] }, createdAt: iso(60*618), ref: 'a1c', parentRef: 'a1' },
        { body: 'Good, because fix in the name scared me too.', author: { ...A['seed-daniel'] }, createdAt: iso(60*611), ref: 'a2' },
        { body: 'Same paranoia. Tattoo took years; I do not want to correct it with strong light.', author: { ...A['seed-marina'] }, createdAt: iso(60*603), parentRef: 'a2' },
        { ...officialReply('Sensor Tattoo Fix is not a laser and does not remove ink: it is an optical interface solution for the smartwatch sensor. For fit details, tell us your watch model so we can check compatibility.', iso(60*599)), ref: 'a3', parentRef: 'a1c' }
      ]
    },
    {
      title: 'Is black ink really worse?',
      body: 'My piece has black, red and yellow. The watch fails only when it slides onto the black area. Does that confirm the theory?',
      tags: ["black-ink", "color", "ppg", "tattoo"],
      author: { ...A['seed-fernando'] },
      createdAt: iso(60*664),
      replies: [
        { body: 'Carbon black swallows the green LED; red and yellow return far more photons to the photodiode. Your observation matches PPG physics.', author: { ...A['seed-chris'] }, createdAt: iso(60*658), ref: 'a1' },
        { body: 'On my arm yellow barely interferes. Solid black is another planet.', author: { ...A['seed-ricardo'] }, createdAt: iso(60*651), ref: 'a1b', parentRef: 'a1' },
        { body: 'SpO2 uses red/IR and also suffers on dense black, but continuous HR (green) usually dies first.', author: { ...A['seed-leandro'] }, createdAt: iso(60*643), parentRef: 'a1b' },
        { body: 'That is why artists who get wearables leave an unfilled window under the sensor.', author: { ...A['seed-gustavo'] }, createdAt: iso(60*639), ref: 'a2' },
        { body: 'I already had the fill. A window now would be an expensive cover-up. Need another way out.', author: { ...A['seed-joao'] }, createdAt: iso(60*634), parentRef: 'a2' },
        { ...officialReply('Dense black is the worst case for green PPG, exactly as you described. Sensor Tattoo Fix improves optical return there without requiring you to erase the art. Tell us your watch model so we can check compatibility.', iso(60*628)), ref: 'a3', parentRef: 'a1' }
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
        { body: 'Sweat creates a film and microbubbles that stack on top of ink return loss. The motion filter is already marginal; the combo tanks SNR.', author: { ...A['seed-edu'] }, createdAt: iso(60*684), ref: 'a1c', parentRef: 'a1' },
        { body: 'Wiped the sensor mid-workout with my shirt. Came back for two minutes then died again.', author: { ...A['seed-lucas'] }, createdAt: iso(60*680), ref: 'a2' },
        { body: 'On the indoor bike with less dripping sweat it also fails, just later. Not only running.', author: { ...A['seed-eduardo'] }, createdAt: iso(60*675), parentRef: 'a2' },
        { body: 'Water between sensor and skin changes specular reflection. Over black ink you are already on a knife edge — any film pushes into dropout.', author: { ...A['seed-chris'] }, createdAt: iso(60*669), parentRef: 'a1c' },
        { ...officialReply('Sweat amplifies optical failure on tattooed wrists by adding an irregular film to an already weak return. Sensor Tattoo Fix stabilizes that interface. Tell us your smartwatch model so we can check compatibility.', iso(60*662)), ref: 'a3', parentRef: 'a1c' }
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
        { body: 'A/B arm test is the cheapest diagnosis: if hardware fails only over ink, it is not a dead module — it is optics.', author: { ...A['seed-chris'] }, createdAt: iso(60*722), ref: 'a1c', parentRef: 'a1' },
        { body: 'I had already booked a support pickup. Cancelled after that test.', author: { ...A['seed-vini'] }, createdAt: iso(60*717), ref: 'a2' },
        { body: 'HR logs with gaps on only one arm also count. No need to open the watch.', author: { ...A['seed-gabriel'] }, createdAt: iso(60*711), parentRef: 'a2' },
        { ...officialReply('If the same watch works on the arm without ink, optical interference is more likely than a factory defect. Sensor Tattoo Fix addresses that interface. Tell us the model so we can check compatibility.', iso(60*704)), ref: 'a3', parentRef: 'a1c' }
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
        { body: 'While clear skin existed, the system always had a high-SNR path. Without it, the algorithm has no easy reference.', author: { ...A['seed-edu'] }, createdAt: iso(60*755), ref: 'a1c', parentRef: 'a1' },
        { body: 'I delayed the second arm because of this. You were braver — or more stubborn.', author: { ...A['seed-marcos'] }, createdAt: iso(60*749), ref: 'a2' },
        { body: 'Stubborn here too. Art first, wearables later. Now I pay the price.', author: { ...A['seed-juliana'] }, createdAt: iso(60*742), parentRef: 'a2' },
        { body: 'No firmware miracle invents optical return where ink swallowed the green. Either raise signal at the interface, or accept gaps.', author: { ...A['seed-chris'] }, createdAt: iso(60*734), parentRef: 'a1c' },
        { ...officialReply('Losing the backup arm makes the optical cause obvious. Sensor Tattoo Fix exists for people who need the sensor to read over the tattooed area. Tell us your smartwatch model so we can check compatibility.', iso(60*730)), ref: 'a3', parentRef: 'a1c' }
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
        { body: 'All use reflective PPG. Differences are security thresholds and UX, not an optical miracle against carbon black.', author: { ...A['seed-chris'] }, createdAt: iso(60*788), ref: 'a1c', parentRef: 'a1' },
        { body: 'I tested Apple and Garmin on the same arm. Neither saved strength workouts.', author: { ...A['seed-renato'] }, createdAt: iso(60*781), ref: 'a2' },
        { body: 'Huawei wins on battery. Sensor still mediocre over fill.', author: { ...A['seed-patricia'] }, createdAt: iso(60*773), parentRef: 'a2' },
        { body: 'If the metric is less security spam, Garmin/Amazfit. If the metric is clean PPG under ink, no brand solves it alone.', author: { ...A['seed-edu'] }, createdAt: iso(60*769), parentRef: 'a1c' },
        { ...officialReply('Brand changes lock/app experience, but PPG physics under dark ink is shared. Sensor Tattoo Fix works on that optical layer. Tell us the model you use or plan to buy so we can check compatibility.', iso(60*764)), ref: 'a3', parentRef: 'a1c' }
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
        { body: 'When samples fall below the quality threshold, firmware injects gaps or interpolates badly. Ink + motion = mass rejection.', author: { ...A['seed-edu'] }, createdAt: iso(60*821), ref: 'a1c', parentRef: 'a1' },
        { body: 'Thought it was GPS. Turned GPS off and the HR chart stayed holey.', author: { ...A['seed-jordan'] }, createdAt: iso(60*813), ref: 'a2' },
        { body: 'GPS does not create those BPM gaps. That is the optical pipeline: green LED → skin/ink → photodiode → filter.', author: { ...A['seed-chris'] }, createdAt: iso(60*809), parentRef: 'a2' },
        { body: 'A chest strap fixes the chart, but I want the watch working on the wrist.', author: { ...A['seed-jeff'] }, createdAt: iso(60*804), parentRef: 'a1c' },
        { ...officialReply('Holes and ghost spikes in the chart usually come from rejected optical samples under ink. Sensor Tattoo Fix improves signal quality at the source. Tell us your smartwatch model so we can check compatibility.', iso(60*798)), ref: 'a3', parentRef: 'a1c' }
      ]
    },
    {
      title: 'Does SpO2 fail because of tattoos too?',
      body: 'Besides heart rate, oxygen readings error out almost always. It uses different light; does ink still matter?',
      tags: ["spo2", "oxygen", "sensor", "tattoo"],
      author: { ...A['seed-moth'] },
      createdAt: iso(60*868),
      replies: [
        { body: 'Typical SpO2 uses red + IR. Dark ink still absorbs and unbalances the channel ratio — hence errors or invented values.', author: { ...A['seed-chris'] }, createdAt: iso(60*862), ref: 'a1' },
        { body: 'On my Ultra oxygen measurement sticks on calculating… until I switch arms.', author: { ...A['seed-hunt'] }, createdAt: iso(60*854), ref: 'a1b', parentRef: 'a1' },
        { body: 'Green HR usually dies first; red/IR SpO2 dies later or together, depending on density and which wavelengths the ink absorbs.', author: { ...A['seed-edu'] }, createdAt: iso(60*850), parentRef: 'a1b' },
        { body: 'I thought SpO2 would be immune. It is not. Same black area, same failure.', author: { ...A['seed-writer'] }, createdAt: iso(60*845), ref: 'a2' },
        { ...officialReply('SpO2 also needs a clean optical return; dark ink interferes with red/IR channels. Sensor Tattoo Fix improves that interface. Tell us your smartwatch model so we can check compatibility.', iso(60*839)), ref: 'a3', parentRef: 'a1' }
      ]
    },
    {
      title: 'Is a smartwatch worth it with tattoos?',
      body: 'I want sleep, workouts and payments, but both wrists are tattooed. Is buying one a waste or still worth it?',
      tags: ["buying", "worth-it", "tattoo", "smartwatch"],
      author: { ...A['seed-jordan'] },
      createdAt: iso(60*902),
      replies: [
        { body: 'It makes sense if you fix the optics. Without that it becomes an expensive wrist notification brick.', author: { ...A['seed-huck'] }, createdAt: iso(60*896), ref: 'a1' },
        { body: 'Without a stable optical path, sleep/HR/Pay stay inconsistent. New hardware does not cancel ink absorption.', author: { ...A['seed-edu'] }, createdAt: iso(60*892), ref: 'a1c', parentRef: 'a1' },
        { body: 'I bought anyway for the apps. I ignore HR. I do not recommend that rotten peace.', author: { ...A['seed-moth'] }, createdAt: iso(60*887), ref: 'a2' },
        { body: 'If budget is tight, fix the interface before upgrading generations.', author: { ...A['seed-omens'] }, createdAt: iso(60*881), parentRef: 'a2' },
        { body: 'Buy if the watch\'s features matter to you — but plan optical coupling as part of the setup, not as a footnote.', author: { ...A['seed-chris'] }, createdAt: iso(60*874), parentRef: 'a1c' },
        { ...officialReply('A smartwatch still makes sense with tattoos if optical reading is stabilized. Sensor Tattoo Fix exists exactly for that scenario. Tell us which model you are looking at so we can check compatibility.', iso(60*866)), ref: 'a3', parentRef: 'a1c' }
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
        { body: 'Water + improvised glue = fast track to residue on the glass. Had to clean with isopropyl.', author: { ...A['seed-chris'] }, createdAt: iso(60*925), ref: 'a1b', parentRef: 'a1' },
        { body: 'Ultra MagSafe got loose. Sometimes charges, sometimes not. Hate it.', author: { ...A['seed-edurunner'] }, createdAt: iso(60*919), ref: 'a1c', parentRef: 'a1b' },
        { body: 'An epoxy layer changes gap and capacitance seen by the charger and ECG electrode. It can fix PPG and break other functions in one move.', author: { ...A['seed-edu'] }, createdAt: iso(60*912), ref: 'a1d', parentRef: 'a1c' },
        { body: 'ECG on my Series 9 zeroed with the sticker. Removed it and it returned. Ridiculous trade.', author: { ...A['seed-malu'] }, createdAt: iso(60*904), ref: 'a1e', parentRef: 'a1d' },
        { body: 'Trimmed the sticker smaller than the sensor ring. Charged better, detection got worse again.', author: { ...A['seed-pri'] }, createdAt: iso(60*900), ref: 'a2' },
        { body: 'You are optimizing optical gap against electrical/inductive contact. DIY epoxy was not designed as a PPG interface — hence the conflict.', author: { ...A['seed-chris'] }, createdAt: iso(60*895), ref: 'a2b', parentRef: 'a2' },
        { body: 'Sweat killed mine in a week. The edge became a dirty trail. Zero glamour.', author: { ...A['seed-bela'] }, createdAt: iso(60*889), ref: 'a2c', parentRef: 'a2b' },
        { body: 'Agree with TechRunner. Works until it does not — and it always breaks something else.', author: { ...A['seed-marcinha'] }, createdAt: iso(60*882), ref: 'a2d', parentRef: 'a2c' },
        { body: 'People sell epoxy kits on Instagram as the definitive fix. Be careful.', author: { ...A['seed-rick'] }, createdAt: iso(60*874), ref: 'a2e', parentRef: 'a2d' },
        { body: 'I went back to the clear arm. Epoxy was just an expensive sticky experiment.', author: { ...A['seed-nati'] }, createdAt: iso(60*870), parentRef: 'a2e' },
        { ...officialReply('Reports like these are common: epoxy hacks can improve PPG for a while while hurting charging, ECG and durability. Sensor Tattoo Fix was developed as an optical interface specific to the sensor, without that improvisation. Tell us your smartwatch model so we can check compatibility.', iso(60*865)), ref: 'a3', parentRef: 'a2b' }
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
        { body: 'With low SNR the peak detector grabs harmonics and noise and sees high HR. Then it loses lock and shows a dash. Classic degraded PPG.', author: { ...A['seed-edu'] }, createdAt: iso(60*958), ref: 'a1c', parentRef: 'a1' },
        { body: 'Turned off high HR notifications so I would not freak out. Does not fix the cause.', author: { ...A['seed-lu'] }, createdAt: iso(60*951), ref: 'a2' },
        { body: 'False alerts are a symptom of the same pipeline: dirty signal → algorithm overconfident on a wrong peak.', author: { ...A['seed-chris'] }, createdAt: iso(60*943), parentRef: 'a2' },
        { body: 'On the other arm it never invented 180. So much for the anxiety theory.', author: { ...A['seed-rita'] }, createdAt: iso(60*939), parentRef: 'a1c' },
        { ...officialReply('Absurd resting readings with gaps in between usually come from a confused optical signal under ink. Sensor Tattoo Fix stabilizes the return so the algorithm stops inventing peaks. Tell us your Apple Watch model so we can check compatibility.', iso(60*934)), ref: 'a3', parentRef: 'a1c' }
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
        { body: 'Il blocco codice dell\'Apple Watch usa il canale IR di prossimità. Inchiostro denso uccide il ritorno e il sistema lo tratta come rimozione — ecco lo spam di codice, non un bug a caso.', author: { ...A['seed-chris'] }, createdAt: iso(60*31), ref: 'a1c', parentRef: 'a1' },
        { body: 'Ho anche disattivato Sblocca con iPhone pensando aiutasse. Zero differenza.', author: { ...A['seed-felipe'] }, createdAt: iso(60*24), ref: 'a2' },
        { ...officialReply('Quando il rilevamento del polso oscilli, Apple Watch rafforza la sicurezza e chiede il codice come se fosse stato rimosso. Sensor Tattoo Fix migliora l\'interfaccia ottica in quella zona. Indica il modello esatto del tuo Apple Watch così verifichiamo la compatibilità.', iso(60*16)), ref: 'a3', parentRef: 'a1c' }
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
        { body: 'Il sonno richiede PPG stabile per ore. Quando lo SNR cala, il classificatore di fasi taglia blocchi interi e la sessione diventa dati insufficienti.', author: { ...A['seed-edu'] }, createdAt: iso(60*75), ref: 'a1b', parentRef: 'a1' },
        { body: 'Ho dormito col cinturino più stretto e mi sono svegliato col segno rosso. Segna ancora 1h.', author: { ...A['seed-andre'] }, createdAt: iso(60*69), ref: 'a2' },
        { body: 'Stringere troppo peggiora la circolazione e il segnale. Non è una soluzione.', author: { ...A['seed-marcelo'] }, createdAt: iso(60*62), parentRef: 'a2' },
        { body: 'Stesso su Amazfit: pisolino di 40 minuti dopo una notte intera. Non è solo Apple.', author: { ...A['seed-fernanda'] }, createdAt: iso(60*54), parentRef: 'a1b' },
        { ...officialReply('Il tracking notturno fallisce quando il ritorno ottico resta irregolare per ore. Sensor Tattoo Fix stabilizza quella lettura sul polso tatuato. Se vuoi, indica il modello del tuo smartwatch così verifichiamo la compatibilità.', iso(60*50)), ref: 'a3', parentRef: 'a1b' }
      ]
    },
    {
      title: 'Quale Apple Watch va meglio coi tatuaggi?',
      body: 'Scelgo tra SE 2, Series 10 e Ultra 2. Tatuaggio denso sul polso dominante. Vale l\'Ultra o soffrono tutti uguale?',
      tags: ["apple-watch", "modello", "compatibilita", "tattoo"],
      author: { ...A['seed-pedro'] },
      createdAt: iso(60*120),
      replies: [
        { body: 'Uso Ultra 2. Continua a chiedere il codice. Hardware meglio, fisica dell\'inchiostro uguale.', author: { ...A['seed-camila'] }, createdAt: iso(60*114), ref: 'a1' },
        { body: 'Le Series nuove migliorano campionamento e LED verdi, ma PPG + IR on-wrist è lo stesso principio. Il modello da solo non batte l\'inchiostro nero sul fotodiodo.', author: { ...A['seed-chris'] }, createdAt: iso(60*108), ref: 'a1c', parentRef: 'a1' },
        { body: 'Series 9 qui. Peggio di quello di mio marito senza tattoo. SE non l\'ho provato.', author: { ...A['seed-rafa'] }, createdAt: iso(60*101), ref: 'a2' },
        { body: 'Da SE a 9 sperando di risolvere. Quasi lo stesso drama. Soldi buttati.', author: { ...A['seed-henrique'] }, createdAt: iso(60*93), parentRef: 'a2' },
        { body: 'Onestamente: se l\'inchiostro copre il sensore, ogni generazione soffre. Non comprare Ultra solo per quello.', author: { ...A['seed-carlos'] }, createdAt: iso(60*89), parentRef: 'a1c' },
        { ...officialReply('Le generazioni cambiano LED e processamento, ma l\'ostacolo ottico dell\'inchiostro resta. Sensor Tattoo Fix esiste per quel vuoto, indipendentemente dal modello. Indica quale Apple Watch stai valutando così verifichiamo la compatibilità.', iso(60*84)), ref: 'a3', parentRef: 'a1c' }
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
        { body: 'Wallet richiede alta confidenza on-wrist. La soglia è più rigida della FC continua — segnale al limite blocca Pay prima che muoia il grafico BPM.', author: { ...A['seed-edu'] }, createdAt: iso(60*141), ref: 'a1c', parentRef: 'a1' },
        { body: 'Pensavo fosse la carta. Rimossa e rimessa. Non lo era.', author: { ...A['seed-daniel'] }, createdAt: iso(60*133), ref: 'a2' },
        { body: 'Reset del Watch e restore del backup. Meglio solo sul braccio senza inchiostro.', author: { ...A['seed-marina'] }, createdAt: iso(60*129), parentRef: 'a2' },
        { body: 'Anche Google Wallet su Galaxy fa qualcosa di simile. Non è solo Apple.', author: { ...A['seed-ricardo'] }, createdAt: iso(60*124), parentRef: 'a1c' },
        { ...officialReply('Il pagamento contactless è spesso il primo a cadere quando il rilevamento perde confidenza. Sensor Tattoo Fix migliora quella lettura ottica. Indica il modello del tuo Apple Watch così verifichiamo la compatibilità.', iso(60*118)), ref: 'a3', parentRef: 'a1c' }
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
        { body: 'Anche Garmin usa PPG verde + IR. Le soglie watch-removed differiscono, quindi il lock Apple cala — ma buchi di FC e SpO2 su inchiostro nero restano.', author: { ...A['seed-chris'] }, createdAt: iso(60*174), ref: 'a1c', parentRef: 'a1' },
        { body: 'Ho cambiato pensando a una vita nuova. Ancora buchi nel grafico. Ho solo cambiato tipo di irritazione.', author: { ...A['seed-gustavo'] }, createdAt: iso(60*170), ref: 'a2' },
        { body: 'Non d\'accordo del tutto: sul 955 il rilevamento è meno seccante. La FC fallisce, ma il quotidiano è ok.', author: { ...A['seed-joao'] }, createdAt: iso(60*165), parentRef: 'a2' },
        { body: 'Sul Forerunner l\'auto-pause dell\'allenamento continua. Non comprate aspettando un miracolo ottico.', author: { ...A['seed-thiago'] }, createdAt: iso(60*159), parentRef: 'a2' },
        { ...officialReply('Cambiare marca cambia UI e blocco, ma il limite ottico dell\'inchiostro resta. Sensor Tattoo Fix agisce sull\'interfaccia del sensore, non solo sul sintomo dell\'ecosistema. Indica il modello Garmin o Apple così verifichiamo la compatibilità.', iso(60*152)), ref: 'a3', parentRef: 'a1c' }
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
        { body: 'Se l\'obiettivo è segnale attraverso inchiostro denso, cambiare marca non cambia l\'assorbimento del LED verde. Cambia la UX; l\'ottica resta la stessa legge.', author: { ...A['seed-edu'] }, createdAt: iso(60*212), ref: 'a1c', parentRef: 'a1' },
        { body: 'Rimasta su Apple e concentrata sull\'interfaccia del sensore. Cambiare sarebbe eccessivo per me.', author: { ...A['seed-eduardo'] }, createdAt: iso(60*207), ref: 'a2' },
        { body: 'D\'accordo. Il problema era il polso, non il logo sulla scatola.', author: { ...A['seed-vini'] }, createdAt: iso(60*201), parentRef: 'a2' },
        { body: 'C\'è chi giura su Garmin. Io sono nel gruppo non è cambiato niente di vero.', author: { ...A['seed-gabriel'] }, createdAt: iso(60*194), ref: 'a3' },
        { ...officialReply('Prima di cambiare tutto l\'ecosistema, guarda la causa: lettura ottica sul polso tatuato. Sensor Tattoo Fix è pensato per quello senza costringerti a lasciare Apple o Garmin. Indica il modello attuale così verifichiamo la compatibilità.', iso(60*186)), ref: 'a4', parentRef: 'a1c' }
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
        { body: 'In movimento il PPG lotta già con artefatto di moto. Nero abbassa lo SNR e il filtro scarta campioni — l\'allenamento si riempie di buchi.', author: { ...A['seed-chris'] }, createdAt: iso(60*245), ref: 'a1c', parentRef: 'a1' },
        { body: 'Disattivato auto-pause e il grafico è ancora bucherellato. Non è solo UI.', author: { ...A['seed-marcos'] }, createdAt: iso(60*239), ref: 'a2' },
        { body: 'Cambiato il cinturino stock con uno più stretto. Aiuto forse 10%. Il resto resta spazzatura.', author: { ...A['seed-juliana'] }, createdAt: iso(60*232), parentRef: 'a2' },
        { body: 'Fascia Polar al petto è pulita. Sul polso tatuato Galaxy inventa numeri.', author: { ...A['seed-leo'] }, createdAt: iso(60*224), parentRef: 'a1c' },
        { ...officialReply('Allenamenti con sudore e movimento amplificano il fallimento ottico su inchiostro scuro. Sensor Tattoo Fix stabilizza la lettura al polso perché il sensore abbia di nuovo segnale utile. Indica il modello Galaxy Watch così verifichiamo la compatibilità.', iso(60*220)), ref: 'a3', parentRef: 'a1c' }
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
        { body: 'Anche Samsung usa IR/verde per decidere se è al polso. Quando il ritorno sparisce, scatta il blocco sicurezza — stesso schema di Apple, UI diversa.', author: { ...A['seed-edu'] }, createdAt: iso(60*278), ref: 'a1c', parentRef: 'a1' },
        { body: 'Succedeva sul Watch 4. Cambiare braccio ha aiutato. Il braccio tatuato si blocca ancora.', author: { ...A['seed-patricia'] }, createdAt: iso(60*271), ref: 'a2' },
        { body: 'Non ho un braccio libero. Entrambi coperti. Mi blocco tutto il giorno.', author: { ...A['seed-fernando'] }, createdAt: iso(60*263), parentRef: 'a2' },
        { body: 'Ho disattivato il blocco automatico e perso sicurezza. Scambio pessimo.', author: { ...A['seed-jordan'] }, createdAt: iso(60*259), parentRef: 'a1c' },
        { ...officialReply('I blocchi ripetuti seguono di solito fallimenti di rilevamento polso, non per forza un difetto di fabbrica. Sensor Tattoo Fix migliora la stabilità ottica in quella zona. Indica il modello Galaxy così verifichiamo la compatibilità.', iso(60*254)), ref: 'a3', parentRef: 'a1c' }
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
        { body: 'Anche Huawei GT è PPG riflessivo. LED verde per FC e canali extra per SpO2 — il nero assorbe ancora il ritorno, batteria da 14 giorni o no.', author: { ...A['seed-chris'] }, createdAt: iso(60*311), ref: 'a1c', parentRef: 'a1' },
        { body: 'Comprato pensando a magia della marca cinese. No. Stessi buchi nel grafico.', author: { ...A['seed-hunt'] }, createdAt: iso(60*303), ref: 'a2' },
        { body: 'La batteria lunga mi ha fatto restare. Accetto FC bucherellata, ma irrita.', author: { ...A['seed-writer'] }, createdAt: iso(60*299), parentRef: 'a2' },
        { ...officialReply('L\'autonomia alta non cambia la fisica del PPG sotto inchiostro. Sensor Tattoo Fix agisce sull\'interfaccia ottica del sensore. Se compri o hai già un GT, indica il modello così verifichiamo la compatibilità.', iso(60*294)), ref: 'a3', parentRef: 'a1c' }
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
        { body: 'Gli algoritmi sonno Amazfit/Zepp scartano notti con PPG intermittente. Inchiostro sul sensore = dropout di fasi e sessione quasi vuota.', author: { ...A['seed-edu'] }, createdAt: iso(60*344), ref: 'a1b', parentRef: 'a1' },
        { body: 'Provato a dormire col orologio alla caviglia. Assurdo e comunque inutile.', author: { ...A['seed-moth'] }, createdAt: iso(60*340), ref: 'a2' },
        { body: 'Anche la FC alla caviglia in allenamento è strana. Non è una scorciatoia buona.', author: { ...A['seed-omens'] }, createdAt: iso(60*335), parentRef: 'a2' },
        { body: 'Prima del ritocco andava. L\'inchiostro nuovo è molto più saturo sotto il sensore.', author: { ...A['seed-syrup'] }, createdAt: iso(60*329), parentRef: 'a1b' },
        { ...officialReply('Quando il PPG notturno diventa intermittente, l\'app sonno perde la notte. Sensor Tattoo Fix migliora il ritorno ottico in quella fascia. Indica il modello Amazfit così verifichiamo la compatibilità.', iso(60*322)), ref: 'a3', parentRef: 'a1b' }
      ]
    },
    {
      title: 'Perché alcuni tatuaggi interferiscono e altri no?',
      body: 'Ho acquerello chiaro da un lato e nero pieno dall\'altro. L\'orologio muore solo quando scivola sul nero. Qual è la spiegazione fisica?',
      tags: ["inchiostro", "ottica", "ppg", "tattoo"],
      author: { ...A['seed-ricardo'] },
      createdAt: iso(60*392),
      replies: [
        { body: 'Il nero carbonioso assorbe forte il verde (~525 nm) del PPG. I colori chiari rimandano più luce al fotodiodo. Per questo solo il blocco nero uccide il segnale.', author: { ...A['seed-chris'] }, createdAt: iso(60*386), ref: 'a1' },
        { body: 'Sul mio braccio l\'ombreggiatura grigia dà meno noia del pieno. Conferma Chris.', author: { ...A['seed-edurunner'] }, createdAt: iso(60*382), ref: 'a1b', parentRef: 'a1' },
        { body: 'Ho solo linee sottili e il Watch quasi non si lamenta. Conta la densità, non “avere un tattoo”.', author: { ...A['seed-malu'] }, createdAt: iso(60*377), ref: 'a2' },
        { body: 'Oltre al colore, spessore dello strato e cicatrice sotto l\'inchiostro cambiano lo scattering. Due neri “uguali” possono avere SNR molto diverso.', author: { ...A['seed-edu'] }, createdAt: iso(60*371), ref: 'a2b', parentRef: 'a2' },
        { body: 'Imparato a dure: sensore sul pieno → FC sparisce. Due centimetri di lato → torna.', author: { ...A['seed-pri'] }, createdAt: iso(60*364), parentRef: 'a1b' },
        { ...officialReply('L\'interferenza dipende molto da colore, densità e posizione sotto il sensore — non dal semplice “avere un tattoo”. Sensor Tattoo Fix è fatto per stabilizzare il ritorno ottico in questi casi. Indica il modello dell\'orologio così verifichiamo la compatibilità.', iso(60*356)), ref: 'a3', parentRef: 'a1' }
      ]
    },
    {
      title: 'Il tatuaggio può danneggiare l\'orologio?',
      body: 'Domanda sincera: usare il sensore sull\'inchiostro può bruciare i LED, scaldare la pelle o danneggiare il modulo ottico col tempo?',
      tags: ["sicurezza", "led", "pelle", "tattoo"],
      author: { ...A['seed-ana'] },
      createdAt: iso(60*426),
      replies: [
        { body: 'In pratica il LED non “brucia” l\'inchiostro. Il fotodiodo riceve meno fotoni — l\'orologio legge male, ma l\'hardware non esplode per il tattoo.', author: { ...A['seed-edu'] }, createdAt: iso(60*420), ref: 'a1' },
        { body: 'Ero paranoico sul calore. L\'Ultra si scalda uguale sull\'altro braccio. È lettura, non temperatura.', author: { ...A['seed-bela'] }, createdAt: iso(60*415), ref: 'a1b', parentRef: 'a1' },
        { body: 'L\'assistenza Apple ha detto che i tattoo non annullano la garanzia, ma non “sistemano” il rilevamento.', author: { ...A['seed-marcinha'] }, createdAt: iso(60*409), ref: 'a2' },
        { body: 'I LED degli smartwatch lavorano a bassa potenza. L\'assorbimento dell\'inchiostro cambia il segnale di ritorno, non la vita tipica dell\'emettitore.', author: { ...A['seed-chris'] }, createdAt: iso(60*402), parentRef: 'a2' },
        { ...officialReply('Un tatuaggio di solito non danneggia il modulo; disturba la lettura ottica. Sensor Tattoo Fix agisce su quell\'interfaccia di luce senza alterare l\'inchiostro. Indica il modello dello smartwatch così verifichiamo la compatibilità.', iso(60*394)), ref: 'a3', parentRef: 'a1' }
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
        { body: 'Il baseline dell\'algoritmo aveva imparato la pelle pulita. Dopo l\'inchiostro il profilo di riflettanza cambia e il filtro rifiuta picchi che prima accettava.', author: { ...A['seed-chris'] }, createdAt: iso(60*448), ref: 'a1c', parentRef: 'a1' },
        { body: 'Aspettato tre settimane a guarire. Non è tornato. Non è gonfiore temporaneo.', author: { ...A['seed-nati'] }, createdAt: iso(60*441), ref: 'a2' },
        { body: 'Stessa attesa. Guarito, inchiostro assestato, sensore ancora cieco sul pieno.', author: { ...A['seed-raf'] }, createdAt: iso(60*433), parentRef: 'a2' },
        { body: 'Cinturino nuovo e reset non hanno riportato il vecchio baseline. L\'hardware non ha dimenticato; è cambiata la pelle.', author: { ...A['seed-lu'] }, createdAt: iso(60*429), parentRef: 'a1c' },
        { ...officialReply('Se l\'orologio era stabile e peggiora subito dopo il tatuaggio, la causa tipica è il cambio ottico al polso. Sensor Tattoo Fix ripristina un\'interfaccia più leggibile per il sensore. Indica il modello così verifichiamo la compatibilità.', iso(60*424)), ref: 'a3', parentRef: 'a1c' }
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
        { body: 'Senza pelle pulita sotto il modulo dipendi al 100% dalla qualità del ritorno ottico. Niente braccio di riserva — lo SNR deve salire dove poggia il sensore.', author: { ...A['seed-edu'] }, createdAt: iso(60*473), ref: 'a1c', parentRef: 'a1b' },
        { body: 'Pensavo di vendere l\'orologio. Non ancora perché voglio sonno e pagamenti al polso.', author: { ...A['seed-guga'] }, createdAt: iso(60*469), ref: 'a2' },
        { body: 'Stesso dilemma. Entrambe tatuate uccidono la scorciatoia di cambiare lato.', author: { ...A['seed-kai'] }, createdAt: iso(60*464), parentRef: 'a2' },
        { ...officialReply('Con entrambi i polsi coperti, i ripieghi di cambiare braccio spariscono. Sensor Tattoo Fix è pensato per chi serve una lettura stabile sull\'area tatuata. Indica il modello dello smartwatch così verifichiamo la compatibilità.', iso(60*458)), ref: 'a3', parentRef: 'a1c' }
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
        { body: 'Molti firmware legano pause fantasma a confidenza on-wrist più stabilità PPG in movimento. Inchiostro e bounce di corsa superano la soglia di continuo.', author: { ...A['seed-chris'] }, createdAt: iso(60*514), ref: 'a1c', parentRef: 'a1' },
        { body: 'Anche l\'auto-pause Garmin mi ha fregato. Non è solo Apple.', author: { ...A['seed-bruno'] }, createdAt: iso(60*510), ref: 'a2' },
        { body: 'Ho registrato lo schermo. Si vede l\'icona orologio rimosso lampeggiare senza toccare nulla.', author: { ...A['seed-felipe'] }, createdAt: iso(60*505), parentRef: 'a2' },
        { body: 'Cinturino più stretto ha tagliato forse il 30% delle pause. Il resto resta.', author: { ...A['seed-diego'] }, createdAt: iso(60*499), parentRef: 'a1c' },
        { ...officialReply('Le pause fantasma in corsa riflettono di solito rilevamento polso instabile sotto inchiostro, non solo impostazioni. Sensor Tattoo Fix aiuta a tenere stabile il contatto ottico. Indica il modello così verifichiamo la compatibilità.', iso(60*492)), ref: 'a3', parentRef: 'a1c' }
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
        { body: 'Il nastro può cambiare indice di rifrazione e il gap aria-pelle per poche ore. Non è un\'interfaccia ottica stabile: sporca, ingiallisce e fa bolle.', author: { ...A['seed-edu'] }, createdAt: iso(60*552), ref: 'a1c', parentRef: 'a1' },
        { body: 'Usato pellicola da cucina. Peggio — scivola e lascia residuo grasso.', author: { ...A['seed-marcelo'] }, createdAt: iso(60*547), ref: 'a2' },
        { body: 'Qualsiasi colla sul vetro posteriore mi fa temere per la garanzia.', author: { ...A['seed-fernanda'] }, createdAt: iso(60*541), parentRef: 'a2' },
        { body: 'Funziona un po\' e poi diventa sporco. D\'accordo con SensorGuru: non è una soluzione vera.', author: { ...A['seed-camila'] }, createdAt: iso(60*534), parentRef: 'a1c' },
        { ...officialReply('Nastri e pellicole improvvisati possono ingannare il sensore per poco, ma degradano con sudore e sporco. Sensor Tattoo Fix è nato come interfaccia ottica stabile, non come ripiego temporaneo. Indica il modello così verifichiamo la compatibilità.', iso(60*526)), ref: 'a3', parentRef: 'a1c' }
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
        { body: 'Aumentare il gap tra LED/fotodiodo e pelle peggiora quasi sempre l\'accoppiamento ottico. Silicone spesso è l\'opposto di ciò che vuole il PPG.', author: { ...A['seed-chris'] }, createdAt: iso(60*585), ref: 'a1c', parentRef: 'a1' },
        { body: 'Un amico giura che il sottile quasi funzionasse. Sul mio Watch 7 no.', author: { ...A['seed-rafa'] }, createdAt: iso(60*579), ref: 'a2' },
        { body: 'Quasi non conta. Voglio qualcosa che sopravviva a un allenamento sudato.', author: { ...A['seed-henrique'] }, createdAt: iso(60*572), parentRef: 'a2' },
        { body: 'In più lascia un segno circolare sul polso. Orribile.', author: { ...A['seed-carlos'] }, createdAt: iso(60*564), parentRef: 'a1c' },
        { ...officialReply('I distanziatori improvvisati di solito allontanano il sensore dalla pelle e peggiorano il PPG. Sensor Tattoo Fix lavora l\'interfaccia ottica senza creare quel gap inutile. Indica il modello così verifichiamo la compatibilità.', iso(60*560)), ref: 'a3', parentRef: 'a1c' }
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
        { body: 'Non è laser né rimozione. È accoppiamento ottico: migliorare il percorso della luce tra LED/fotodiodo e pelle tatuata, senza cancellare pigmento.', author: { ...A['seed-edu'] }, createdAt: iso(60*618), ref: 'a1c', parentRef: 'a1' },
        { body: 'Bene, perché anche fix nel nome mi aveva spaventato.', author: { ...A['seed-daniel'] }, createdAt: iso(60*611), ref: 'a2' },
        { body: 'Stessa paranoia. Il tattoo ci ha messo anni; non voglio correggerlo con luce forte.', author: { ...A['seed-marina'] }, createdAt: iso(60*603), parentRef: 'a2' },
        { ...officialReply('Sensor Tattoo Fix non è un laser e non rimuove inchiostro: è una soluzione di interfaccia ottica per il sensore dello smartwatch. Per i dettagli di adattamento, indica il modello così verifichiamo la compatibilità.', iso(60*599)), ref: 'a3', parentRef: 'a1c' }
      ]
    },
    {
      title: 'L\'inchiostro nero è davvero peggiore?',
      body: 'Il disegno ha nero, rosso e giallo. L\'orologio fallisce solo quando scivola sulla parte nera. Conferma la teoria?',
      tags: ["inchiostro-nero", "colore", "ppg", "tattoo"],
      author: { ...A['seed-fernando'] },
      createdAt: iso(60*664),
      replies: [
        { body: 'Il nero carbonioso inghiotte il LED verde; rosso e giallo rimandano molti più fotoni al fotodiodo. La tua osservazione combacia con la fisica del PPG.', author: { ...A['seed-chris'] }, createdAt: iso(60*658), ref: 'a1' },
        { body: 'Sul mio braccio il giallo quasi non disturba. Il nero pieno è un altro pianeta.', author: { ...A['seed-ricardo'] }, createdAt: iso(60*651), ref: 'a1b', parentRef: 'a1' },
        { body: 'Lo SpO2 usa rosso/IR e soffre anche sul nero denso, ma la FC continua (verde) di solito cade per prima.', author: { ...A['seed-leandro'] }, createdAt: iso(60*643), parentRef: 'a1b' },
        { body: 'Per questo gli artisti che capiscono i wearable lasciano una finestra senza pieno sotto il sensore.', author: { ...A['seed-gustavo'] }, createdAt: iso(60*639), ref: 'a2' },
        { body: 'Avevo già il pieno. Una finestra ora sarebbe un cover-up costoso. Serve un\'altra via.', author: { ...A['seed-joao'] }, createdAt: iso(60*634), parentRef: 'a2' },
        { ...officialReply('Il nero denso è il caso peggiore per il PPG verde, proprio come descrivi. Sensor Tattoo Fix migliora il ritorno ottico lì senza dover cancellare l\'arte. Indica il modello così verifichiamo la compatibilità.', iso(60*628)), ref: 'a3', parentRef: 'a1' }
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
        { body: 'Il sudore crea film e microbolle che si sommano al deficit di ritorno dell\'inchiostro. Il filtro di movimento è già al limite; il combo abbatte lo SNR.', author: { ...A['seed-edu'] }, createdAt: iso(60*684), ref: 'a1c', parentRef: 'a1' },
        { body: 'Asciugato il sensore a metà allenamento con la maglia. Tornato due minuti e morto di nuovo.', author: { ...A['seed-lucas'] }, createdAt: iso(60*680), ref: 'a2' },
        { body: 'Sulla bici indoor con meno sudore che cola fallisce anche, solo più tardi. Non è solo corsa.', author: { ...A['seed-eduardo'] }, createdAt: iso(60*675), parentRef: 'a2' },
        { body: 'Acqua tra sensore e pelle cambia la riflessione speculare. Sul nero sei già sul filo — qualsiasi film spinge nel dropout.', author: { ...A['seed-chris'] }, createdAt: iso(60*669), parentRef: 'a1c' },
        { ...officialReply('Il sudore amplifica il fallimento ottico sui polsi tatuati perché aggiunge un film irregolare a un ritorno già debole. Sensor Tattoo Fix stabilizza quell\'interfaccia. Indica il modello così verifichiamo la compatibilità.', iso(60*662)), ref: 'a3', parentRef: 'a1c' }
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
        { body: 'Il test A/B di braccio è la diagnosi più economica: se l\'hardware fallisce solo sull\'inchiostro, non è modulo morto — è ottica.', author: { ...A['seed-chris'] }, createdAt: iso(60*722), ref: 'a1c', parentRef: 'a1' },
        { body: 'Avevo già prenotato il ritiro assistenza. Annullato dopo quel test.', author: { ...A['seed-vini'] }, createdAt: iso(60*717), ref: 'a2' },
        { body: 'Anche i log FC con buchi su un solo braccio contano. Non serve aprire l\'orologio.', author: { ...A['seed-gabriel'] }, createdAt: iso(60*711), parentRef: 'a2' },
        { ...officialReply('Se lo stesso orologio funziona sul braccio senza inchiostro, è più probabile interferenza ottica che difetto di fabbrica. Sensor Tattoo Fix affronta quell\'interfaccia. Indica il modello così verifichiamo la compatibilità.', iso(60*704)), ref: 'a3', parentRef: 'a1c' }
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
        { body: 'Finché c\'era pelle pulita, il sistema aveva sempre un percorso ad alto SNR. Senza, l\'algoritmo non ha un riferimento facile.', author: { ...A['seed-edu'] }, createdAt: iso(60*755), ref: 'a1c', parentRef: 'a1' },
        { body: 'Ho rimandato il secondo braccio per questo. Sei stato più coraggioso — o più testardo.', author: { ...A['seed-marcos'] }, createdAt: iso(60*749), ref: 'a2' },
        { body: 'Testardo anche io. Arte prima, wearable dopo. Ora pago il prezzo.', author: { ...A['seed-juliana'] }, createdAt: iso(60*742), parentRef: 'a2' },
        { body: 'Nessun miracolo di firmware inventa ritorno ottico dove l\'inchiostro ha inghiottito il verde. O alzi il segnale all\'interfaccia, o accetti i buchi.', author: { ...A['seed-chris'] }, createdAt: iso(60*734), parentRef: 'a1c' },
        { ...officialReply('Perdere il braccio di riserva rende ovvia la causa ottica. Sensor Tattoo Fix esiste per chi ha bisogno che il sensore legga sull\'area tatuata. Indica il modello così verifichiamo la compatibilità.', iso(60*730)), ref: 'a3', parentRef: 'a1c' }
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
        { body: 'Tutte usano PPG riflessivo. Le differenze sono soglie di sicurezza e UX, non un miracolo ottico contro il carbonio nero.', author: { ...A['seed-chris'] }, createdAt: iso(60*788), ref: 'a1c', parentRef: 'a1' },
        { body: 'Ho testato Apple e Garmin sullo stesso braccio. Nessuno ha salvato i pesi.', author: { ...A['seed-renato'] }, createdAt: iso(60*781), ref: 'a2' },
        { body: 'Huawei vince sulla batteria. Sensore ancora mediocre sul pieno.', author: { ...A['seed-patricia'] }, createdAt: iso(60*773), parentRef: 'a2' },
        { body: 'Se la metrica è meno spam di sicurezza, Garmin/Amazfit. Se è PPG pulito sotto inchiostro, nessuna marca risolve da sola.', author: { ...A['seed-edu'] }, createdAt: iso(60*769), parentRef: 'a1c' },
        { ...officialReply('La marca cambia blocco e app, ma la fisica del PPG sotto inchiostro scuro è condivisa. Sensor Tattoo Fix lavora su quello strato ottico. Indica il modello che usi o vuoi comprare così verifichiamo la compatibilità.', iso(60*764)), ref: 'a3', parentRef: 'a1c' }
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
        { body: 'Quando i campioni scendono sotto la soglia di qualità, il firmware inserisce buchi o interpola male. Inchiostro + movimento = rifiuto di massa.', author: { ...A['seed-edu'] }, createdAt: iso(60*821), ref: 'a1c', parentRef: 'a1' },
        { body: 'Pensavo fosse il GPS. Spento il GPS e il grafico FC resta bucherellato.', author: { ...A['seed-jordan'] }, createdAt: iso(60*813), ref: 'a2' },
        { body: 'Il GPS non crea quei buchi di BPM. È la pipeline ottica: LED verde → pelle/inchiostro → fotodiodo → filtro.', author: { ...A['seed-chris'] }, createdAt: iso(60*809), parentRef: 'a2' },
        { body: 'La fascia petto sistema il grafico, ma voglio l\'orologio funzionante al polso.', author: { ...A['seed-jeff'] }, createdAt: iso(60*804), parentRef: 'a1c' },
        { ...officialReply('Buchi e picchi fantasma nel grafico nascono di solito da campioni ottici rifiutati sotto inchiostro. Sensor Tattoo Fix migliora la qualità del segnale alla fonte. Indica il modello così verifichiamo la compatibilità.', iso(60*798)), ref: 'a3', parentRef: 'a1c' }
      ]
    },
    {
      title: 'Anche SpO2 fallisce per il tatuaggio?',
      body: 'Oltre alla frequenza, la saturazione dà errore quasi sempre. Usa una luce diversa: l\'inchiostro conta ancora?',
      tags: ["spo2", "ossigeno", "sensore", "tattoo"],
      author: { ...A['seed-moth'] },
      createdAt: iso(60*868),
      replies: [
        { body: 'Lo SpO2 tipico usa rosso + IR. L\'inchiostro scuro assorbe ancora e sbilancia il rapporto tra canali — ecco errori o valori inventati.', author: { ...A['seed-chris'] }, createdAt: iso(60*862), ref: 'a1' },
        { body: 'Sul mio Ultra l\'ossigeno resta su calcolo in corso… finché non cambio braccio.', author: { ...A['seed-hunt'] }, createdAt: iso(60*854), ref: 'a1b', parentRef: 'a1' },
        { body: 'La FC verde di solito muore prima; lo SpO2 rosso/IR dopo o insieme, a seconda di densità e lunghezze d\'onda assorbite.', author: { ...A['seed-edu'] }, createdAt: iso(60*850), parentRef: 'a1b' },
        { body: 'Pensavo che lo SpO2 fosse immune. Non lo è. Stessa area nera, stesso fallimento.', author: { ...A['seed-writer'] }, createdAt: iso(60*845), ref: 'a2' },
        { ...officialReply('Anche lo SpO2 serve un ritorno ottico pulito; l\'inchiostro scuro disturba i canali rosso/IR. Sensor Tattoo Fix migliora quell\'interfaccia. Indica il modello così verifichiamo la compatibilità.', iso(60*839)), ref: 'a3', parentRef: 'a1' }
      ]
    },
    {
      title: 'Vale la pena comprare uno smartwatch con tatuaggi?',
      body: 'Voglio sonno, allenamenti e pagamenti, ma entrambi i polsi sono tatuati. Sono soldi buttati o ha ancora senso?',
      tags: ["acquisto", "ne-vale", "tattoo", "smartwatch"],
      author: { ...A['seed-jordan'] },
      createdAt: iso(60*902),
      replies: [
        { body: 'Ha senso se risolvi l\'ottica. Senza diventa un mattone costoso di notifiche al polso.', author: { ...A['seed-huck'] }, createdAt: iso(60*896), ref: 'a1' },
        { body: 'Senza un percorso ottico stabile, sonno/FC/Pay restano incoerenti. Hardware nuovo non cancella l\'assorbimento dell\'inchiostro.', author: { ...A['seed-edu'] }, createdAt: iso(60*892), ref: 'a1c', parentRef: 'a1' },
        { body: 'Ho comprato lo stesso per le app. Ignoro la FC. Non consiglio questa pace marcia.', author: { ...A['seed-moth'] }, createdAt: iso(60*887), ref: 'a2' },
        { body: 'Se il budget è stretto, sistema l\'interfaccia prima di salire di generazione.', author: { ...A['seed-omens'] }, createdAt: iso(60*881), parentRef: 'a2' },
        { body: 'Compra se le funzioni ti interessano — ma pianifica l\'accoppiamento ottico come parte del setup, non come nota a piè.', author: { ...A['seed-chris'] }, createdAt: iso(60*874), parentRef: 'a1c' },
        { ...officialReply('Uno smartwatch ha ancora senso coi tatuaggi se la lettura ottica è stabilizzata. Sensor Tattoo Fix esiste proprio per quello scenario. Indica il modello che stai guardando così verifichiamo la compatibilità.', iso(60*866)), ref: 'a3', parentRef: 'a1c' }
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
        { body: 'Acqua + colla improvvisata = residuo sul vetro in fretta. Pulito con isopropanolo.', author: { ...A['seed-chris'] }, createdAt: iso(60*925), ref: 'a1b', parentRef: 'a1' },
        { body: 'Il MagSafe dell\'Ultra è allentato. A volte carica, a volte no. Lo odio.', author: { ...A['seed-edurunner'] }, createdAt: iso(60*919), ref: 'a1c', parentRef: 'a1b' },
        { body: 'Uno strato epossidico cambia gap e capacità visti da caricatore ed elettrodo ECG. Può sistemare il PPG e rompere altre funzioni in un colpo.', author: { ...A['seed-edu'] }, createdAt: iso(60*912), ref: 'a1d', parentRef: 'a1c' },
        { body: 'ECG sul Series 9 azzerato con l\'adesivo. Tolto e tornato. Scambio ridicolo.', author: { ...A['seed-malu'] }, createdAt: iso(60*904), ref: 'a1e', parentRef: 'a1d' },
        { body: 'Tagliato l\'adesivo più piccolo dell\'anello sensore. Carica meglio, rilevamento di nuovo peggiore.', author: { ...A['seed-pri'] }, createdAt: iso(60*900), ref: 'a2' },
        { body: 'Stai ottimizzando il gap ottico contro il contatto elettrico/induttivo. L\'epossidica DIY non è nata come interfaccia PPG — ecco il conflitto.', author: { ...A['seed-chris'] }, createdAt: iso(60*895), ref: 'a2b', parentRef: 'a2' },
        { body: 'Il sudore ha ucciso il mio in una settimana. Il bordo è diventato una striscia sporca. Zero glamour.', author: { ...A['seed-bela'] }, createdAt: iso(60*889), ref: 'a2c', parentRef: 'a2b' },
        { body: 'D\'accordo con TechRunner. Funziona finché non funziona — e rompe sempre qualcos\'altro.', author: { ...A['seed-marcinha'] }, createdAt: iso(60*882), ref: 'a2d', parentRef: 'a2c' },
        { body: 'C\'è chi vende kit epossidici su Instagram come soluzione definitiva. Attenti.', author: { ...A['seed-rick'] }, createdAt: iso(60*874), ref: 'a2e', parentRef: 'a2d' },
        { body: 'Tornato al braccio senza inchiostro. L\'epossidica è stata solo un esperimento costoso e appiccicoso.', author: { ...A['seed-nati'] }, createdAt: iso(60*870), parentRef: 'a2e' },
        { ...officialReply('Resoconti così sono comuni: ripieghi epossidici possono migliorare il PPG per un po\' e al tempo stesso danneggiare carica, ECG e durata. Sensor Tattoo Fix è nato come interfaccia ottica specifica per il sensore, senza quell\'improvvisazione. Indica il modello così verifichiamo la compatibilità.', iso(60*865)), ref: 'a3', parentRef: 'a2b' }
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
        { body: 'Con SNR basso il peak detector agganci armoniche e rumore e vede FC alta. Poi perde il lock e mostra il trattino. Classico PPG degradato.', author: { ...A['seed-edu'] }, createdAt: iso(60*958), ref: 'a1c', parentRef: 'a1' },
        { body: 'Disattivate le notifiche di FC alta per non impazzire. Non risolve la causa.', author: { ...A['seed-lu'] }, createdAt: iso(60*951), ref: 'a2' },
        { body: 'I falsi allarmi sono sintomo della stessa pipeline: segnale sporco → algoritmo troppo fiducioso su un picco sbagliato.', author: { ...A['seed-chris'] }, createdAt: iso(60*943), parentRef: 'a2' },
        { body: 'Sull\'altro braccio non ha mai inventato 180. Addio teoria dell\'ansia.', author: { ...A['seed-rita'] }, createdAt: iso(60*939), parentRef: 'a1c' },
        { ...officialReply('Letture assurde a riposo con buchi in mezzo nascono di solito da segnale ottico confuso sotto inchiostro. Sensor Tattoo Fix stabilizza il ritorno perché l\'algoritmo smetta di inventare picchi. Indica il modello Apple Watch così verifichiamo la compatibilità.', iso(60*934)), ref: 'a3', parentRef: 'a1c' }
      ]
    }
  ].map((t) => ({ ...t, lang: 'it' }));
  return { pt, en, it };
}
