export function buildForumSeedLangPacks({ A, officialReply, iso }) {
  const pt = [
    {
      title: 'Apple Watch pedindo senha sem parar',
      body: 'Tattoo preta bem embaixo do sensor. O Ultra bloqueia a tela, pede a senha de novo e some com as notificações. Já apertei a pulseira até doer e limpei o vidro com álcool. Volta em duas horas.',
      tags: ["apple-watch", "senha", "detecao", "tattoo"],
      author: { ...A['seed-guga'] },
      createdAt: iso(60*52),
      replies: [
        { ...officialReply('Mesma tortura. No caixa o Apple Pay também cai porque ele acha que tirei o relógio.', iso(60*0)), ref: 'a1' },
        { ...officialReply('Eu troquei pro braço sem tinta e parou. No braço tatuado continua pedindo senha no meio do expediente.', iso(60*0)), ref: 'a1b', parentRef: 'a1' },
        { ...officialReply('Trocar de braço pra mim não resolveu: os dois têm cobertura na área do sensor.', iso(60*0)), parentRef: 'a1b' },
        { ...officialReply('O lock de senha do Apple Watch depende do canal de proximidade no IR. Tinta densa mata o retorno e o sistema trata como remoção — daí o spam de código, não é bug aleatório de software.', iso(60*0)), ref: 'a1c', parentRef: 'a1' },
        { ...officialReply('Também desativei Desbloquear com iPhone pensando que ajudava. Zero diferença.', iso(60*0)), ref: 'a2' },
        { ...officialReply('Quando a detecção de pulso oscila, o Apple Watch reforça a segurança e pede senha como se tivesse sido removido. O Sensor Tattoo Fix melhora a interface óptica nessa região. Informe o modelo exato do seu Apple Watch para verificarmos a compatibilidade.', iso(60*12)), ref: 'a3', parentRef: 'a1c' }
      ]
    },
    {
      title: 'Monitor de sono simplesmente morreu',
      body: 'Durmo das 23h às 6h e o Watch marca 48 minutos ou dados insuficientes. No braço sem tattoo aparece a noite inteira. Já atualizei o watchOS e o iPhone.',
      tags: ["sono", "apple-watch", "tattoo", "tracking"],
      author: { ...A['seed-marina'] },
      createdAt: iso(60*86),
      replies: [
        { ...officialReply('Eu perco os estágios REM toda madrugada. O app mostra acordado no meio do sono.', iso(60*0)), ref: 'a1' },
        { ...officialReply('Sono precisa de PPG estável por horas. Quando o SNR cai, o classificador de estágios corta blocos inteiros e a sessão vira dados insuficientes.', iso(60*0)), ref: 'a1b', parentRef: 'a1' },
        { ...officialReply('Apertei a pulseira pra dormir e acordei com marca vermelha. Continua marcando 1h.', iso(60*0)), ref: 'a2' },
        { ...officialReply('Apertar demais atrapalha circulação e piora o sinal. Não é solução.', iso(60*0)), parentRef: 'a2' },
        { ...officialReply('No Amazfit o mesmo: cochilo de 40 min depois de uma noite inteira. Não é só Apple.', iso(60*0)), parentRef: 'a1b' },
        { ...officialReply('O tracking noturno falha quando o retorno óptico fica irregular por horas. O Sensor Tattoo Fix estabiliza essa leitura no pulso tatuado. Se quiser, informe o modelo do seu smartwatch para verificarmos a compatibilidade.', iso(60*34)), ref: 'a3', parentRef: 'a1b' }
      ]
    },
    {
      title: 'Qual Apple Watch funciona melhor com tattoo?',
      body: 'Estou entre SE 2, Series 10 e Ultra 2. Tattoo densa no pulso dominante. Vale pagar o Ultra ou qualquer um vai sofrer igual?',
      tags: ["apple-watch", "modelo", "compatibilidade", "tattoo"],
      author: { ...A['seed-pedro'] },
      createdAt: iso(60*120),
      replies: [
        { ...officialReply('Uso Ultra 2. Continua pedindo senha. Hardware melhor, física da tinta igual.', iso(60*0)), ref: 'a1' },
        { ...officialReply('Series novas melhoram amostragem e LEDs verdes, mas o princípio PPG + IR de on-wrist é o mesmo. Modelo sozinho não vence tinta preta sobre o fotodiodo.', iso(60*0)), ref: 'a1c', parentRef: 'a1' },
        { ...officialReply('Series 9 aqui. Pior que o do meu marido sem tattoo. SE nem experimentei.', iso(60*0)), ref: 'a2' },
        { ...officialReply('Passei do SE pro 9 achando que resolvia. Quase o mesmo drama. Dinheiro jogado.', iso(60*0)), parentRef: 'a2' },
        { ...officialReply('Honestamente: se a tinta cobre o sensor, qualquer geração sofre. Não compre Ultra só por isso.', iso(60*0)), parentRef: 'a1c' },
        { ...officialReply('A geração muda LEDs e processamento, mas o obstáculo óptico da tinta permanece. O Sensor Tattoo Fix existe para esse gap, independente do modelo. Informe qual Apple Watch você está considerando para verificarmos a compatibilidade.', iso(60*64)), ref: 'a3', parentRef: 'a1c' }
      ]
    },
    {
      title: 'Apple Pay para de funcionar sozinho',
      body: 'FC às vezes ainda mostra número. No caixa o Pay trava e pede senha. Parece que o wrist detect quebrou só pro pagamento.',
      tags: ["apple-pay", "pagamento", "detecao", "tattoo"],
      author: { ...A['seed-pri'] },
      createdAt: iso(60*154),
      replies: [
        { ...officialReply('Comigo o Pay caiu antes de tudo. Depois veio o spam de senha.', iso(60*0)), ref: 'a1' },
        { ...officialReply('Wallet exige confiança alta de on wrist. O limiar é mais rígido que o da FC contínua — sinal limítrofe bloqueia Pay antes do gráfico de BPM.', iso(60*0)), ref: 'a1c', parentRef: 'a1' },
        { ...officialReply('Achei que era cartão. Removi e recadastrei. Não era.', iso(60*0)), ref: 'a2' },
        { ...officialReply('Resetei o Watch e restaurei backup. Só melhorou no braço sem tinta.', iso(60*0)), parentRef: 'a2' },
        { ...officialReply('No Google Wallet do Galaxy acontece parecido. Não é exclusivo da Apple.', iso(60*0)), parentRef: 'a1c' },
        { ...officialReply('Pagamento por aproximação costuma ser o primeiro a cair quando a detecção de pulso perde confiança. O Sensor Tattoo Fix melhora essa leitura óptica. Informe o modelo do seu Apple Watch para verificarmos a compatibilidade.', iso(60*96)), ref: 'a3', parentRef: 'a1c' }
      ]
    },
    {
      title: 'Garmin é realmente melhor para pulso tatuado?',
      body: 'Cansei do Apple pedindo senha. Olhando Forerunner 965 / Fenix. Quem tem tinta densa no pulso: melhora de verdade ou só muda o tipo de dor?',
      tags: ["garmin", "apple-watch", "comparacao", "tattoo"],
      author: { ...A['seed-bruno'] },
      createdAt: iso(60*188),
      replies: [
        { ...officialReply('No Fenix a FC ainda falha no gym. Menos drama de senha, mas sensor é sensor.', iso(60*0)), ref: 'a1' },
        { ...officialReply('Garmin também usa PPG verde + IR. Os limiares de watch removed são diferentes, então some o lock da Apple — mas gaps de FC e SpO2 em tinta preta continuam.', iso(60*0)), ref: 'a1c', parentRef: 'a1' },
        { ...officialReply('Troquei achando vida nova. Continuo com buracos no gráfico. Só troquei o tipo de irritação.', iso(60*0)), ref: 'a2' },
        { ...officialReply('Discordo um pouco: no 955 a detecção é menos chata. FC falha, mas dá pra viver no dia a dia.', iso(60*0)), parentRef: 'a2' },
        { ...officialReply('No Forerunner o auto-pause do treino continua. Não comprem esperando milagre óptico.', iso(60*0)), parentRef: 'a2' },
        { ...officialReply('Trocar de marca muda a UI e o bloqueio, mas o limite óptico da tinta permanece. O Sensor Tattoo Fix ataca a interface do sensor, não só o sintoma do ecossistema. Informe o modelo Garmin ou Apple para verificarmos a compatibilidade.', iso(60*124)), ref: 'a3', parentRef: 'a1c' }
      ]
    },
    {
      title: 'Trocar Apple por Garmin vale a pena?',
      body: 'Quase vendendo o Ultra depois do retoque que cobriu o sensor. A troca resolve a detecção ou vou só gastar de novo no ecossistema errado?',
      tags: ["apple-watch", "garmin", "troca", "tattoo"],
      author: { ...A['seed-alex'] },
      createdAt: iso(60*222),
      replies: [
        { ...officialReply('Fiz a troca. Perdi iMessage no pulso e ganhei outro tipo de falha de FC. Não voltaria só por tattoo.', iso(60*0)), ref: 'a1' },
        { ...officialReply('Se o objetivo é sinal através de tinta densa, mudar de marca não muda a absorção do LED verde. Muda UX; a óptica continua a mesma lei.', iso(60*0)), ref: 'a1c', parentRef: 'a1' },
        { ...officialReply('Fiquei no Apple e foquei na interface do sensor. Trocar seria overkill pra mim.', iso(60*0)), ref: 'a2' },
        { ...officialReply('Concordo. O problema era o pulso, não a logo na caixa.', iso(60*0)), parentRef: 'a2' },
        { ...officialReply('Tem gente que jura no Garmin. Eu estou no grupo não mudou nada de verdade.', iso(60*0)), ref: 'a3' },
        { ...officialReply('Antes de trocar o ecossistema inteiro, vale olhar a causa: leitura óptica no pulso tatuado. O Sensor Tattoo Fix foi pensado para isso sem forçar você a abandonar Apple ou Garmin. Informe o modelo atual para verificarmos a compatibilidade.', iso(60*158)), ref: 'a4', parentRef: 'a1c' }
      ]
    },
    {
      title: 'Galaxy Watch perde a FC na academia',
      body: 'No sofá a FC até aparece. No remador e no agachamento o gráfico do Galaxy 6 Classic vira um deserto. Suor + tinta preta = nada.',
      tags: ["galaxy-watch", "academia", "fc", "tattoo"],
      author: { ...A['seed-felipe'] },
      createdAt: iso(60*256),
      replies: [
        { ...officialReply('Comigo some exatamente na série de terra. Em repouso entre sets volta meio torto.', iso(60*0)), ref: 'a1' },
        { ...officialReply('Em movimento o PPG já luta com artefato de movimento. Tinta preta derruba o SNR e o filtro joga fora amostras — o treino fica cheio de gaps.', iso(60*0)), ref: 'a1c', parentRef: 'a1' },
        { ...officialReply('Desativei o auto-pause e ainda assim o gráfico fica furado. Não é só UI.', iso(60*0)), ref: 'a2' },
        { ...officialReply('Eu troquei a pulseira oficial por uma mais apertada. Ajudou 10%. O resto continua lixo.', iso(60*0)), parentRef: 'a2' },
        { ...officialReply('No peito com cinta Polar a FC fica linda. No pulso tatuado o Galaxy inventa número.', iso(60*0)), parentRef: 'a1c' },
        { ...officialReply('Treino com suor e movimento amplifica a falha óptica em tinta escura. O Sensor Tattoo Fix estabiliza a leitura no pulso para o sensor voltar a ter sinal útil. Informe o modelo do Galaxy Watch para verificarmos a compatibilidade.', iso(60*190)), ref: 'a3', parentRef: 'a1c' }
      ]
    },
    {
      title: 'Galaxy Watch se bloqueia no meu braço',
      body: 'Galaxy Watch 5 Pro trava sozinho e pede PIN várias vezes por dia. A pulseira está firme; acontece exatamente sobre a tinta preta do antebraço.',
      tags: ["galaxy-watch", "bloqueio", "pin", "tattoo"],
      author: { ...A['seed-diego'] },
      createdAt: iso(60*290),
      replies: [
        { ...officialReply('Achei que era atualização do One UI. Rolei pra trás e o bloqueio voltou igual.', iso(60*0)), ref: 'a1' },
        { ...officialReply('Samsung também usa IR/verde para decidir se o relógio está no pulso. Quando o retorno some, o lock de segurança dispara — mesmo padrão do Apple, UI diferente.', iso(60*0)), ref: 'a1c', parentRef: 'a1' },
        { ...officialReply('No meu Watch 4 acontecia. Troquei de braço e melhorou. No braço tatuado continua.', iso(60*0)), ref: 'a2' },
        { ...officialReply('Eu não tenho braço livre. Os dois estão cobertos. Travo o dia inteiro.', iso(60*0)), parentRef: 'a2' },
        { ...officialReply('Desativei o bloqueio automático e fiquei sem segurança. Péssima troca.', iso(60*0)), parentRef: 'a1c' },
        { ...officialReply('Bloqueios repetidos costumam seguir falhas de detecção de pulso, não necessariamente defeito de fábrica. O Sensor Tattoo Fix melhora a estabilidade óptica nessa área. Informe o modelo Galaxy para verificarmos a compatibilidade.', iso(60*226)), ref: 'a3', parentRef: 'a1c' }
      ]
    },
    {
      title: 'Huawei GT também falha com tattoo?',
      body: 'Queria um GT 5 pela bateria. Meu pulso dominante é quase todo preto. O sensor da Huawei sofre igual ou lida melhor?',
      tags: ["huawei", "gt", "bateria", "tattoo"],
      author: { ...A['seed-andre'] },
      createdAt: iso(60*324),
      replies: [
        { ...officialReply('GT 4 aqui. Sono e FC falham no mesmo braço. Bateria boa, sensor comum.', iso(60*0)), ref: 'a1' },
        { ...officialReply('Huawei GT também é PPG refletivo. LED verde para FC e canais extras para SpO2 — tinta preta continua absorvendo o retorno, independente da autonomia de 14 dias.', iso(60*0)), ref: 'a1c', parentRef: 'a1' },
        { ...officialReply('Comprei achando que marca chinesa ia magia. Não. Mesmo buraco no gráfico.', iso(60*0)), ref: 'a2' },
        { ...officialReply('A bateria longa me fez ficar. Aceito FC furada no treino, mas irrita.', iso(60*0)), parentRef: 'a2' },
        { ...officialReply('Autonomia alta não muda a física do PPG sob tinta. O Sensor Tattoo Fix atua na interface óptica do sensor. Se for comprar ou já tiver um GT, informe o modelo para verificarmos a compatibilidade.', iso(60*268)), ref: 'a3', parentRef: 'a1c' }
      ]
    },
    {
      title: 'Amazfit perdeu todas as noites de sono',
      body: 'Depois do retoque da tattoo no pulso, o GTR 4 só registra cochilos aleatórios. Antes marcava 7h. Sensor limpo, pulseira nova.',
      tags: ["amazfit", "sono", "tattoo", "noite"],
      author: { ...A['seed-lucas'] },
      createdAt: iso(60*358),
      replies: [
        { ...officialReply('Bip U Pro aqui — mesma coisa depois da tattoo. Zepp fica vazio.', iso(60*0)), ref: 'a1' },
        { ...officialReply('Algoritmos de sono Amazfit/Zepp descartam noites com PPG intermitente. Tinta no sensor = dropout de estágios e sessão quase nula.', iso(60*0)), ref: 'a1b', parentRef: 'a1' },
        { ...officialReply('Tentei dormir com o relógio no tornozelo. Absurdo e ainda assim inútil.', iso(60*0)), ref: 'a2' },
        { ...officialReply('No tornozelo a FC de treino também fica estranha. Não é atalho bom.', iso(60*0)), parentRef: 'a2' },
        { ...officialReply('Antes do retoque funcionava. A tinta nova é bem mais saturada na área do sensor.', iso(60*0)), parentRef: 'a1b' },
        { ...officialReply('Quando o PPG noturno fica intermitente, o app de sono perde a noite. O Sensor Tattoo Fix melhora o retorno óptico nessa faixa. Informe o modelo Amazfit para verificarmos a compatibilidade.', iso(60*292)), ref: 'a3', parentRef: 'a1b' }
      ]
    },
    {
      title: 'Por que algumas tattoos interferem e outras não?',
      body: 'Tenho aquarela clara de um lado e preto sólido do outro. O relógio só morre quando escorrega pra parte preta. Qual é a explicação física?',
      tags: ["tinta", "optica", "ppg", "tattoo"],
      author: { ...A['seed-ricardo'] },
      createdAt: iso(60*392),
      replies: [
        { ...officialReply('Preto carbonado absorve forte o verde (~525 nm) do PPG. Cores claras espalham mais luz de volta ao fotodiodo. Por isso só o bloco preto derruba o sinal.', iso(60*0)), ref: 'a1' },
        { ...officialReply('No meu braço o sombreado cinza atrapalha menos que o preenchimento cheio. Bate com o que o Chris disse.', iso(60*0)), ref: 'a1b', parentRef: 'a1' },
        { ...officialReply('Eu tenho só linha fina e o Watch quase não reclama. Densidade importa mais que “ter tattoo”.', iso(60*0)), ref: 'a2' },
        { ...officialReply('Além da cor, espessura da camada e cicatriz sob a tinta mudam espalhamento. Dois pretos “iguais” podem ter SNR bem diferente.', iso(60*0)), ref: 'a2b', parentRef: 'a2' },
        { ...officialReply('Aprendi na marra: se o sensor para em cima do preenchimento, FC some. Dois centímetros ao lado, volta.', iso(60*0)), parentRef: 'a1b' },
        { ...officialReply('A interferência depende muito de cor, densidade e posição sob o sensor — não de “ter ou não ter tattoo”. O Sensor Tattoo Fix foi feito para estabilizar o retorno óptico nesses casos. Informe o modelo do seu relógio para verificarmos a compatibilidade.', iso(60*328)), ref: 'a3', parentRef: 'a1' }
      ]
    },
    {
      title: 'A tattoo pode estragar o relógio?',
      body: 'Pergunta sincera: usar o sensor em cima da tinta pode queimar LED, aquecer a pele ou danificar o módulo óptico com o tempo?',
      tags: ["seguranca", "led", "pele", "tattoo"],
      author: { ...A['seed-ana'] },
      createdAt: iso(60*426),
      replies: [
        { ...officialReply('Na prática o LED não “queima” a tinta. O que acontece é o fotodiodo receber menos fótons — o relógio interpreta mal, mas o hardware não explode por causa da tattoo.', iso(60*0)), ref: 'a1' },
        { ...officialReply('Eu fiquei paranóico com aquecimento. Meu Ultra esquenta igual no outro braço. O problema é leitura, não temperatura.', iso(60*0)), ref: 'a1b', parentRef: 'a1' },
        { ...officialReply('Assistência da Apple me disse que tattoo não anula garantia, mas também não “conserta” detecção.', iso(60*0)), ref: 'a2' },
        { ...officialReply('LEDs de smartwatch operam em potência baixa. Absorção da tinta muda o sinal de volta, não a vida útil típica do emissor.', iso(60*0)), parentRef: 'a2' },
        { ...officialReply('A tattoo normalmente não danifica o módulo; ela atrapalha a leitura óptica. O Sensor Tattoo Fix atua nessa interface de luz, sem alterar a tinta. Informe o modelo do seu smartwatch para verificarmos a compatibilidade.', iso(60*370)), ref: 'a3', parentRef: 'a1' }
      ]
    },
    {
      title: 'Funcionava antes da tattoo, agora nada',
      body: 'Dois anos de Series 8 perfeitos. Fiz um preenchimento no pulso numa sexta e no sábado a FC já estava furada. Não mudei nada no software.',
      tags: ["antes-depois", "tattoo", "fc", "apple-watch"],
      author: { ...A['seed-marcos'] },
      createdAt: iso(60*460),
      replies: [
        { ...officialReply('História idêntica comigo. Antes da sessão o Watch era santo. Depois virou pedra no pulso.', iso(60*0)), ref: 'a1' },
        { ...officialReply('O baseline do algoritmo aprendeu sua pele limpa. Depois da tinta o perfil de refletância muda e o filtro passa a rejeitar picos que antes aceitava.', iso(60*0)), ref: 'a1c', parentRef: 'a1' },
        { ...officialReply('Esperei cicatrizar três semanas. Não voltou. Não é inchaço temporário.', iso(60*0)), ref: 'a2' },
        { ...officialReply('Mesma espera aqui. Cicatrizou, tinta assentou, sensor continua cego no preenchimento.', iso(60*0)), parentRef: 'a2' },
        { ...officialReply('Trocar pulseira e resetar não trouxe o baseline antigo. O hardware não esqueceu; a pele mudou.', iso(60*0)), parentRef: 'a1c' },
        { ...officialReply('Se o relógio era estável antes e piorou logo após a tattoo, o mais comum é a mudança óptica no pulso. O Sensor Tattoo Fix restaura uma interface mais legível para o sensor. Informe o modelo para verificarmos a compatibilidade.', iso(60*394)), ref: 'a3', parentRef: 'a1c' }
      ]
    },
    {
      title: 'Tatuei os dois braços. E agora?',
      body: 'Minha gambiarra era trocar de pulso. Ontem fechei o segundo braço e agora nenhum lado reconhece o Watch direito. Sem plano B.',
      tags: ["dois-bracos", "tattoo", "opcoes", "sensor"],
      author: { ...A['seed-juliana'] },
      createdAt: iso(60*494),
      replies: [
        { ...officialReply('Bem-vindo ao clube. Eu descobri isso tarde demais. Tornozelo não é solução séria pra mim.', iso(60*0)), ref: 'a1' },
        { ...officialReply('Eu tentei cinta peitoral nos treinos e Watch só pra notificação. Funciona, mas perde o ponto do smartwatch.', iso(60*0)), ref: 'a1b', parentRef: 'a1' },
        { ...officialReply('Sem pele limpa sob o módulo, você depende 100% da qualidade do retorno óptico. Não há braço reserva — o SNR tem que subir onde o sensor senta.', iso(60*0)), ref: 'a1c', parentRef: 'a1b' },
        { ...officialReply('Pensei em vender o relógio. Ainda não vendi porque quero sono e pagamentos no pulso.', iso(60*0)), ref: 'a2' },
        { ...officialReply('Mesmo dilema. Os dois braços tatuados matam a solução barata de só trocar de lado.', iso(60*0)), parentRef: 'a2' },
        { ...officialReply('Com os dois pulsos cobertos, improvisos de trocar de braço deixam de existir. O Sensor Tattoo Fix foi pensado exatamente para quem precisa de leitura estável na área tatuada. Informe o modelo do seu smartwatch para verificarmos a compatibilidade.', iso(60*428)), ref: 'a3', parentRef: 'a1c' }
      ]
    },
    {
      title: 'Treino entra em pausa sozinho',
      body: 'Corrida de 10 km: o Watch pausa, retoma, pausa de novo. Desativei pausa automática e o comportamento continua. Tattoo no sensor.',
      tags: ["treino", "autopause", "corrida", "tattoo"],
      author: { ...A['seed-kai'] },
      createdAt: iso(60*528),
      replies: [
        { ...officialReply('Isso me deixava louco. Parecia que eu tinha tirado o relógio no meio da avenida.', iso(60*0)), ref: 'a1' },
        { ...officialReply('Muitos firmwares amarram pausa fantasma à confiança de on-wrist mais estabilidade do PPG em movimento. Tinta e bounce da corrida cruzam o limiar o tempo todo.', iso(60*0)), ref: 'a1c', parentRef: 'a1' },
        { ...officialReply('No Garmin o auto-pause também me zoava. Não é exclusivo de Apple.', iso(60*0)), ref: 'a2' },
        { ...officialReply('Eu gravei a tela. Dá pra ver o ícone de relógio removido piscando sem eu tocar em nada.', iso(60*0)), parentRef: 'a2' },
        { ...officialReply('Pulseira mais apertada reduziu uns 30% das pausas. O resto continua.', iso(60*0)), parentRef: 'a1c' },
        { ...officialReply('Pausas fantasma em corrida costumam refletir detecção de pulso instável sob tinta, não só configuração de treino. O Sensor Tattoo Fix ajuda a manter o contato óptico estável. Informe o modelo do relógio para verificarmos a compatibilidade.', iso(60*462)), ref: 'a3', parentRef: 'a1c' }
      ]
    },
    {
      title: 'Fita transparente funciona mesmo?',
      body: 'Vi o truque da fita adesiva transparente no sensor. Testei na Series 8: detectou melhor por umas 3h, depois virou meleca e coletou fiapo.',
      tags: ["diy", "fita", "gambiarra", "tattoo"],
      author: { ...A['seed-vini'] },
      createdAt: iso(60*562),
      replies: [
        { ...officialReply('Comigo durou um treino. Suor dissolveu a cola e a FC sumiu de novo.', iso(60*0)), ref: 'a1' },
        { ...officialReply('Fita pode mudar o índice de refração e o gap ar-pele por algumas horas. Não é interface óptica estável: suja, amarela e cria bolhas.', iso(60*0)), ref: 'a1c', parentRef: 'a1' },
        { ...officialReply('Eu usei filme de PVC de cozinha. Pior ainda — escorrega e deixa resíduo gorduroso.', iso(60*0)), ref: 'a2' },
        { ...officialReply('Qualquer gambiarra adesiva no vidro traseiro me deixa com medo de garantia.', iso(60*0)), parentRef: 'a2' },
        { ...officialReply('Funciona um pouco e depois vira sujeira. Concordo com o SensorGuru: não é solução de verdade.', iso(60*0)), parentRef: 'a1c' },
        { ...officialReply('Fitas e filmes improvisados podem enganar o sensor por pouco tempo, mas degradam com suor e sujeira. O Sensor Tattoo Fix foi feito como interface óptica estável, não como gambiarra temporária. Informe o modelo do seu relógio para verificarmos a compatibilidade.', iso(60*496)), ref: 'a3', parentRef: 'a1c' }
      ]
    },
    {
      title: 'Almofadinha de silicone de móvel no sensor',
      body: 'Vi gente colando aqueles protetores transparentes de mesa no vidro do sensor. Parece piada. Alguém testou de verdade?',
      tags: ["diy", "silicone", "protecao", "sensor"],
      author: { ...A['seed-renato'] },
      createdAt: iso(60*596),
      replies: [
        { ...officialReply('Testei. O relógio ficou mais alto e a detecção piorou. Virada de mesa.', iso(60*0)), ref: 'a1' },
        { ...officialReply('Aumentar o gap entre LED/fotodiodo e pele quase sempre piora o acoplamento óptico. Silicone grosso é o contrário do que o PPG quer.', iso(60*0)), ref: 'a1c', parentRef: 'a1' },
        { ...officialReply('Um amigo jura que o fino quase funcionou. No meu Watch 7 não.', iso(60*0)), ref: 'a2' },
        { ...officialReply('Quase não conta. Quero algo que sobreviva a um treino suado.', iso(60*0)), parentRef: 'a2' },
        { ...officialReply('Ainda por cima deixa marca circular no pulso. Horroroso.', iso(60*0)), parentRef: 'a1c' },
        { ...officialReply('Espaçadores improvisados costumam afastar o sensor da pele e piorar o PPG. O Sensor Tattoo Fix trabalha a interface óptica sem criar esse gap inútil. Informe o modelo do seu smartwatch para verificarmos a compatibilidade.', iso(60*530)), ref: 'a3', parentRef: 'a1c' }
      ]
    },
    {
      title: 'Sensor Tattoo Fix é laser?',
      body: 'Vi o nome e fiquei na dúvida: isso remove tinta, usa laser ou altera a tattoo de alguma forma? Não quero mexer no desenho.',
      tags: ["sensor-tattoo-fix", "laser", "duvida", "produto"],
      author: { ...A['seed-patricia'] },
      createdAt: iso(60*630),
      replies: [
        { ...officialReply('Pelo que entendi é uma interface no sensor, não um tratamento na pele. Mas quero confirmação oficial.', iso(60*0)), ref: 'a1' },
        { ...officialReply('Não é laser nem remoção. É acoplamento óptico: melhorar o caminho da luz entre LEDs/fotodiodo e a pele tatuada, sem apagar pigmento.', iso(60*0)), ref: 'a1c', parentRef: 'a1' },
        { ...officialReply('Boa, porque eu também assustei com a palavra fix no nome.', iso(60*0)), ref: 'a2' },
        { ...officialReply('Mesma paranoia. Tattoo demorou anos; não quero corrigir ela com luz forte.', iso(60*0)), parentRef: 'a2' },
        { ...officialReply('Sensor Tattoo Fix não é laser e não remove tinta: é uma solução de interface óptica para o sensor do smartwatch. Se quiser detalhes de encaixe, informe o modelo do seu relógio para verificarmos a compatibilidade.', iso(60*574)), ref: 'a3', parentRef: 'a1c' }
      ]
    },
    {
      title: 'Tinta preta é realmente pior?',
      body: 'Meu desenho tem preto, vermelho e amarelo. O relógio só falha quando escorrega para a parte preta. Confirma a teoria?',
      tags: ["tinta-preta", "cor", "ppg", "tattoo"],
      author: { ...A['seed-fernando'] },
      createdAt: iso(60*664),
      replies: [
        { ...officialReply('Preto carbonado engole o LED verde; vermelho e amarelo devolvem bem mais fótons ao fotodiodo. Sua observação bate com a física do PPG.', iso(60*0)), ref: 'a1' },
        { ...officialReply('No meu braço o amarelo quase não atrapalha. O preto sólido é outro planeta.', iso(60*0)), ref: 'a1b', parentRef: 'a1' },
        { ...officialReply('SpO2 usa vermelho/IR e também sofre no preto denso, mas a FC contínua (verde) costuma cair primeiro.', iso(60*0)), parentRef: 'a1b' },
        { ...officialReply('Por isso artistas que entendem de wearables deixam uma janela sem preenchimento sob o sensor.', iso(60*0)), ref: 'a2' },
        { ...officialReply('Eu já tinha o preenchimento. Janela agora seria cover-up caro. Preciso de outra saída.', iso(60*0)), parentRef: 'a2' },
        { ...officialReply('Preto denso é o pior cenário para PPG verde, exatamente como você descreveu. O Sensor Tattoo Fix melhora o retorno óptico nessa região sem exigir apagar a arte. Informe o modelo do relógio para verificarmos a compatibilidade.', iso(60*598)), ref: 'a3', parentRef: 'a1' }
      ]
    },
    {
      title: 'Suor piora a leitura no pulso tatuado?',
      body: 'Seco ele ainda lê. Depois de dez minutos correndo e suando, a FC some completamente em cima da tinta.',
      tags: ["suor", "corrida", "fc", "tattoo"],
      author: { ...A['seed-edurunner'] },
      createdAt: iso(60*698),
      replies: [
        { ...officialReply('Exato. No começo da corrida ok, no km 3 já é traço. Sem tattoo isso não acontecia.', iso(60*0)), ref: 'a1' },
        { ...officialReply('Suor cria filme e microbolhas que somam ao déficit de retorno da tinta. O filtro de movimento já está no limite; o combo derruba o SNR.', iso(60*0)), ref: 'a1c', parentRef: 'a1' },
        { ...officialReply('Sequei o sensor no meio do treino com a camisa. Voltou por dois minutos e morreu de novo.', iso(60*0)), ref: 'a2' },
        { ...officialReply('No bike indoor com menos suor horizontal também falha, só que mais tarde. Não é só corrida.', iso(60*0)), parentRef: 'a2' },
        { ...officialReply('Água entre sensor e pele muda reflexão especular. Sobre tinta preta você já está no fio da navalha — qualquer filme empurra para o dropout.', iso(60*0)), parentRef: 'a1c' },
        { ...officialReply('Suor amplifica a falha óptica em pulsos tatuados porque soma película irregular a um retorno já fraco. O Sensor Tattoo Fix estabiliza essa interface. Informe o modelo do seu smartwatch para verificarmos a compatibilidade.', iso(60*632)), ref: 'a3', parentRef: 'a1c' }
      ]
    },
    {
      title: 'Achei que meu relógio estava com defeito',
      body: 'Resetei, troquei pulseira e quase mandei pra assistência. No braço sem tattoo funciona perfeito. Quase paguei frete à toa.',
      tags: ["defeito", "assistencia", "diagnostico", "tattoo"],
      author: { ...A['seed-camila'] },
      createdAt: iso(60*732),
      replies: [
        { ...officialReply('Quase mesmo drama. O técnico pediu vídeo e no braço limpo ele ficou sem argumento.', iso(60*0)), ref: 'a1' },
        { ...officialReply('Teste A/B de braço é o diagnóstico mais barato: se o hardware falha só sobre tinta, não é módulo morto — é óptica.', iso(60*0)), ref: 'a1c', parentRef: 'a1' },
        { ...officialReply('Eu já tinha marcado coleta da assistência. Cancelei depois desse teste.', iso(60*0)), ref: 'a2' },
        { ...officialReply('Logs de FC com gaps só num braço também contam. Não precisa abrir o relógio.', iso(60*0)), parentRef: 'a2' },
        { ...officialReply('Se o mesmo relógio funciona no braço sem tinta, o mais provável é interferência óptica, não defeito de fábrica. O Sensor Tattoo Fix trata essa interface. Informe o modelo para verificarmos a compatibilidade.', iso(60*676)), ref: 'a3', parentRef: 'a1c' }
      ]
    },
    {
      title: 'Descobri o problema depois de tatuar o segundo braço',
      body: 'Eu usava o braço livre como solução. Tatuei ontem e agora descobri por que o outro nunca funcionava. Estou sem saída óbvia.',
      tags: ["segundo-braco", "descoberta", "tattoo", "detecao"],
      author: { ...A['seed-bela'] },
      createdAt: iso(60*766),
      replies: [
        { ...officialReply('Dor conhecida. O braço bom escondia o problema até você fechar o desenho.', iso(60*0)), ref: 'a1' },
        { ...officialReply('Enquanto existia pele limpa, o sistema sempre tinha um caminho de alto SNR. Sem ele, o algoritmo não tem referência fácil.', iso(60*0)), ref: 'a1c', parentRef: 'a1' },
        { ...officialReply('Eu adiei o segundo braço por causa disso. Você foi mais corajoso — ou mais teimoso.', iso(60*0)), ref: 'a2' },
        { ...officialReply('Teimoso aqui também. Arte primeiro, wearables depois. Agora pago o preço.', iso(60*0)), parentRef: 'a2' },
        { ...officialReply('Não há milagre de firmware que invente retorno óptico onde a tinta engoliu o verde. Ou sobe o sinal na interface, ou aceita gaps.', iso(60*0)), parentRef: 'a1c' },
        { ...officialReply('Perder o braço reserva deixa clara a causa óptica. O Sensor Tattoo Fix existe para quem precisa ler o sensor sobre a área tatuada. Informe o modelo do seu smartwatch para verificarmos a compatibilidade.', iso(60*700)), ref: 'a3', parentRef: 'a1c' }
      ]
    },
    {
      title: 'Qual marca sofre menos com tattoo?',
      body: 'Apple, Garmin, Samsung, Huawei ou Amazfit: existe alguma que lide melhor com tinta escura no pulso?',
      tags: ["marcas", "comparacao", "tattoo", "sensor"],
      author: { ...A['seed-rodrigo'] },
      createdAt: iso(60*800),
      replies: [
        { ...officialReply('Garmin incomoda menos no lock, mas FC furada igual. Samsung trava PIN. Apple pede senha. Amazfit perde sono. Escolha seu veneno.', iso(60*0)), ref: 'a1' },
        { ...officialReply('Todas usam PPG refletivo. Diferenças estão em limiares de segurança e UX, não em milagre óptico contra carbono preto.', iso(60*0)), ref: 'a1c', parentRef: 'a1' },
        { ...officialReply('Eu testei Apple e Garmin no mesmo braço. Nenhum salvou o treino de força.', iso(60*0)), ref: 'a2' },
        { ...officialReply('Huawei ganha em bateria. Sensor continua medíocre sobre preenchimento.', iso(60*0)), parentRef: 'a2' },
        { ...officialReply('Se a métrica é menos spam de segurança, Garmin/Amazfit. Se a métrica é PPG limpo sob tinta, nenhuma marca resolve sozinha.', iso(60*0)), parentRef: 'a1c' },
        { ...officialReply('A marca muda a experiência de bloqueio e app, mas a física do PPG sob tinta escura é compartilhada. O Sensor Tattoo Fix atua nessa camada óptica. Informe o modelo que você usa ou pretende comprar para verificarmos a compatibilidade.', iso(60*734)), ref: 'a3', parentRef: 'a1c' }
      ]
    },
    {
      title: 'Gráfico de FC cheio de buracos',
      body: 'O resumo do treino parece código Morse: alguns minutos de FC, vários vazios, depois picos sem sentido. Tattoo preta sob o sensor.',
      tags: ["fc", "grafico", "gaps", "treino"],
      author: { ...A['seed-daniel'] },
      createdAt: iso(60*834),
      replies: [
        { ...officialReply('Meu Strava fica ridículo. Zona 5 em descanso e zona 0 no sprint.', iso(60*0)), ref: 'a1' },
        { ...officialReply('Quando amostras caem abaixo do limiar de qualidade, o firmware injeta gaps ou interpola mal. Tinta + movimento = rejeição em massa.', iso(60*0)), ref: 'a1c', parentRef: 'a1' },
        { ...officialReply('Achei que era GPS. Desliguei GPS e o gráfico de FC continuou furado.', iso(60*0)), ref: 'a2' },
        { ...officialReply('GPS não gera esses gaps de BPM. Isso é pipeline óptica: LED verde → pele/tinta → fotodiodo → filtro.', iso(60*0)), parentRef: 'a2' },
        { ...officialReply('Cinta peitoral resolve o gráfico, mas eu quero o relógio funcionando no pulso.', iso(60*0)), parentRef: 'a1c' },
        { ...officialReply('Buracos e picos fantasmas no gráfico costumam nascer de amostras ópticas rejeitadas sob tinta. O Sensor Tattoo Fix melhora a qualidade do sinal na origem. Informe o modelo do seu smartwatch para verificarmos a compatibilidade.', iso(60*768)), ref: 'a3', parentRef: 'a1c' }
      ]
    },
    {
      title: 'SpO2 também falha por causa da tattoo?',
      body: 'Além da frequência, a saturação dá erro quase sempre. Ela usa outra luz; ainda assim a tinta interfere?',
      tags: ["spo2", "oxigenio", "sensor", "tattoo"],
      author: { ...A['seed-moth'] },
      createdAt: iso(60*868),
      replies: [
        { ...officialReply('SpO2 típico usa vermelho + IR. Tinta escura ainda absorve e desbalanceia a razão entre canais — daí erro ou valor inventado.', iso(60*0)), ref: 'a1' },
        { ...officialReply('No meu Ultra a medição de oxigênio trava em calculando… até eu mudar de braço.', iso(60*0)), ref: 'a1b', parentRef: 'a1' },
        { ...officialReply('FC verde cai primeiro; SpO2 vermelho/IR cai depois ou junto, dependendo da densidade e do comprimento de onda absorvido pela tinta.', iso(60*0)), parentRef: 'a1b' },
        { ...officialReply('Achei que SpO2 seria imune. Não é. Mesma área preta, mesmo fracasso.', iso(60*0)), ref: 'a2' },
        { ...officialReply('SpO2 também depende de retorno óptico limpo; tinta escura atrapalha os canais vermelho/IR. O Sensor Tattoo Fix melhora essa interface. Informe o modelo do seu smartwatch para verificarmos a compatibilidade.', iso(60*812)), ref: 'a3', parentRef: 'a1' }
      ]
    },
    {
      title: 'Ainda vale comprar smartwatch tendo tattoo?',
      body: 'Quero sono, treino e pagamentos, mas tenho os dois pulsos tatuados. É jogar dinheiro fora ou ainda faz sentido?',
      tags: ["compra", "vale-a-pena", "tattoo", "smartwatch"],
      author: { ...A['seed-jordan'] },
      createdAt: iso(60*902),
      replies: [
        { ...officialReply('Faz sentido se você resolver a óptica. Sem isso vira notificação cara no pulso.', iso(60*0)), ref: 'a1' },
        { ...officialReply('Sem caminho óptico estável, sono/FC/Pay ficam inconsistentes. O hardware novo não cancela absorção de tinta.', iso(60*0)), ref: 'a1c', parentRef: 'a1' },
        { ...officialReply('Eu comprei mesmo assim pelos apps. FC eu ignoro. Não recomendo essa paz podre.', iso(60*0)), ref: 'a2' },
        { ...officialReply('Se o orçamento aperta, resolva a interface antes de upar de geração.', iso(60*0)), parentRef: 'a2' },
        { ...officialReply('Compre se a proposta do relógio importa pra você — mas planeje o acoplamento óptico como parte do setup, não como detalhe.', iso(60*0)), parentRef: 'a1c' },
        { ...officialReply('Smartwatch ainda faz sentido com tattoos se a leitura óptica for estabilizada. O Sensor Tattoo Fix existe justamente para esse cenário. Informe o modelo que você está olhando para verificarmos a compatibilidade.', iso(60*836)), ref: 'a3', parentRef: 'a1c' }
      ]
    },
    {
      title: 'Megathread: adesivo de epóxi funciona, mas...',
      body: 'Colei um adesivo de epóxi transparente no sensor do Ultra. A detecção voltou. Só que o carregador não encosta direito, o ECG morreu e as bordas já levantaram no segundo dia. Thread aberto pra relatos honestos.',
      tags: ["epoxi", "diy", "megathread", "sensor"],
      author: { ...A['seed-huck'] },
      createdAt: iso(60*936),
      replies: [
        { ...officialReply('Mesmo setup. Detecção ok por 48h. No banho o canto descolou e entrou água.', iso(60*0)), ref: 'a1' },
        { ...officialReply('Água + cola improvisada = curto caminho pro resíduo no vidro. Tive que limpar com isopropanol.', iso(60*0)), ref: 'a1b', parentRef: 'a1' },
        { ...officialReply('O MagSafe do Ultra ficou frouxo. Às vezes carrega, às vezes não. Odeio isso.', iso(60*0)), ref: 'a1c', parentRef: 'a1b' },
        { ...officialReply('Camada de epóxi muda gap e capacitância vista pelo carregador e pelo eletrodo de ECG. Pode consertar PPG e quebrar outras funções no mesmo movimento.', iso(60*0)), ref: 'a1d', parentRef: 'a1c' },
        { ...officialReply('ECG no meu Series 9 zerou com o adesivo. Removi e voltou. Trade ridículo.', iso(60*0)), ref: 'a1e', parentRef: 'a1d' },
        { ...officialReply('Cortei o adesivo menor que o anel do sensor. Carregou melhor, mas a detecção piorou de novo.', iso(60*0)), ref: 'a2' },
        { ...officialReply('Você está otimizando gap ótico contra contato elétrico/indutivo. DIY epóxi não foi desenhado como interface PPG — daí o conflito.', iso(60*0)), ref: 'a2b', parentRef: 'a2' },
        { ...officialReply('Suor matou o meu em uma semana. A borda virou uma trilha suja. Zero glamour.', iso(60*0)), ref: 'a2c', parentRef: 'a2b' },
        { ...officialReply('Concordo com o TechRunner. Funciona até não funcionar — e sempre quebra outra coisa.', iso(60*0)), ref: 'a2d', parentRef: 'a2c' },
        { ...officialReply('Tem gente vendendo kit de epóxi no Instagram como solução definitiva. Cuidado.', iso(60*0)), ref: 'a2e', parentRef: 'a2d' },
        { ...officialReply('Eu voltei pro braço sem tinta. Epóxi foi só experimento caro e meleca.', iso(60*0)), parentRef: 'a2e' },
        { ...officialReply('Relatos assim são comuns: gambiarra de epóxi pode melhorar PPG por um tempo e ao mesmo tempo atrapalhar carga, ECG e durabilidade. O Sensor Tattoo Fix foi desenvolvido como interface óptica específica para o sensor, sem esse improviso. Informe o modelo do seu smartwatch para verificarmos a compatibilidade.', iso(60*850)), ref: 'a3', parentRef: 'a2b' }
      ]
    },
    {
      title: 'Relógio inventando 180 bpm em repouso',
      body: 'Sentado no sofá ele marca 180 bpm, depois traço, depois 72. No braço sem tinta fica estável em 68–74. Series 9.',
      tags: ["fc", "180bpm", "repouso", "tattoo"],
      author: { ...A['seed-dudu'] },
      createdAt: iso(60*970),
      replies: [
        { ...officialReply('Isso me deu susto a primeira vez. Achei arritmia. Era o sensor enlouquecido na tinta.', iso(60*0)), ref: 'a1' },
        { ...officialReply('Com SNR baixo o detector de picos agarra harmônicos e ruído e vê FC alta. Depois perde lock e mostra traço. Clássico de PPG degradado.', iso(60*0)), ref: 'a1c', parentRef: 'a1' },
        { ...officialReply('Desativei notificações de FC alta pra não pirar. Não resolve a causa.', iso(60*0)), ref: 'a2' },
        { ...officialReply('Avisos falsos são sintoma do mesmo pipeline: sinal sujo → algoritmo confiante demais em um pico errado.', iso(60*0)), parentRef: 'a2' },
        { ...officialReply('No outro braço nunca inventou 180. Acabou a teoria da ansiedade.', iso(60*0)), parentRef: 'a1c' },
        { ...officialReply('Leituras absurdas em repouso com gaps no meio costumam vir de sinal óptico confuso sob tinta. O Sensor Tattoo Fix estabiliza o retorno para o algoritmo parar de inventar picos. Informe o modelo do seu Apple Watch para verificarmos a compatibilidade.', iso(60*904)), ref: 'a3', parentRef: 'a1c' }
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
        { ...officialReply('Same torture. At checkout Apple Pay also dies because it thinks I took the watch off.', iso(60*0)), ref: 'a1' },
        { ...officialReply('I switched to the arm without ink and it stopped. On the tattooed arm it still asks mid-workday.', iso(60*0)), ref: 'a1b', parentRef: 'a1' },
        { ...officialReply('Switching arms did nothing for me: both have coverage over the sensor area.', iso(60*0)), parentRef: 'a1b' },
        { ...officialReply('Apple Watch passcode lock leans on the IR proximity channel. Dense ink kills the return and the system treats it as removal — that is why you get code spam, not a random software bug.', iso(60*0)), ref: 'a1c', parentRef: 'a1' },
        { ...officialReply('I also turned off Unlock with iPhone thinking it would help. Zero difference.', iso(60*0)), ref: 'a2' },
        { ...officialReply('When wrist detection flickers, Apple Watch tightens security and asks for a passcode as if it were removed. Sensor Tattoo Fix improves the optical interface in that area. Tell us your exact Apple Watch model so we can check compatibility.', iso(60*12)), ref: 'a3', parentRef: 'a1c' }
      ]
    },
    {
      title: 'Sleep tracking is completely dead',
      body: 'I sleep 11pm–6am and the Watch shows 48 minutes or insufficient data. On the arm without a tattoo it logs the whole night. Already updated watchOS and iPhone.',
      tags: ["sleep", "apple-watch", "tattoo", "tracking"],
      author: { ...A['seed-marina'] },
      createdAt: iso(60*86),
      replies: [
        { ...officialReply('I lose REM stages every night. The app marks me awake in the middle of sleep.', iso(60*0)), ref: 'a1' },
        { ...officialReply('Sleep needs stable PPG for hours. When SNR drops, the stage classifier cuts whole blocks and the session becomes insufficient data.', iso(60*0)), ref: 'a1b', parentRef: 'a1' },
        { ...officialReply('I slept with a tighter band and woke with a red mark. Still shows 1h.', iso(60*0)), ref: 'a2' },
        { ...officialReply('Overtightening hurts circulation and makes the signal worse. Not a fix.', iso(60*0)), parentRef: 'a2' },
        { ...officialReply('Same on Amazfit: a 40-minute nap after a full night. Not just Apple.', iso(60*0)), parentRef: 'a1b' },
        { ...officialReply('Overnight tracking fails when the optical return stays irregular for hours. Sensor Tattoo Fix stabilizes that reading on a tattooed wrist. If you want, tell us your smartwatch model so we can check compatibility.', iso(60*34)), ref: 'a3', parentRef: 'a1b' }
      ]
    },
    {
      title: 'Which Apple Watch works best with tattoos?',
      body: 'Choosing between SE 2, Series 10 and Ultra 2. Dense tattoo on dominant wrist. Is Ultra worth it or will they all struggle the same?',
      tags: ["apple-watch", "model", "compatibility", "tattoo"],
      author: { ...A['seed-pedro'] },
      createdAt: iso(60*120),
      replies: [
        { ...officialReply('On Ultra 2. Still passcode spam. Better hardware, same ink physics.', iso(60*0)), ref: 'a1' },
        { ...officialReply('Newer Series improve sampling and green LEDs, but PPG + IR on-wrist is the same principle. The model alone does not beat black ink over the photodiode.', iso(60*0)), ref: 'a1c', parentRef: 'a1' },
        { ...officialReply('Series 9 here. Worse than my husband\'s without tattoos. Never tried SE.', iso(60*0)), ref: 'a2' },
        { ...officialReply('Went SE to 9 hoping it would fix it. Almost the same drama. Money wasted.', iso(60*0)), parentRef: 'a2' },
        { ...officialReply('Honestly: if ink covers the sensor, every generation struggles. Do not buy Ultra just for that.', iso(60*0)), parentRef: 'a1c' },
        { ...officialReply('Generations change LEDs and processing, but the optical obstacle from ink remains. Sensor Tattoo Fix exists for that gap, regardless of model. Tell us which Apple Watch you are considering so we can check compatibility.', iso(60*64)), ref: 'a3', parentRef: 'a1c' }
      ]
    },
    {
      title: 'Apple Pay quits for no reason',
      body: 'HR still shows a number sometimes. At checkout Pay locks and asks for a passcode. Feels like wrist detect broke only for payments.',
      tags: ["apple-pay", "payment", "detection", "tattoo"],
      author: { ...A['seed-pri'] },
      createdAt: iso(60*154),
      replies: [
        { ...officialReply('For me Pay died first. Then the passcode spam started.', iso(60*0)), ref: 'a1' },
        { ...officialReply('Wallet needs high on-wrist confidence. That bar is stricter than continuous HR — borderline signal blocks Pay before the BPM chart dies.', iso(60*0)), ref: 'a1c', parentRef: 'a1' },
        { ...officialReply('Thought it was the card. Removed and re-added it. It was not.', iso(60*0)), ref: 'a2' },
        { ...officialReply('Reset the Watch and restored a backup. Only better on the arm without ink.', iso(60*0)), parentRef: 'a2' },
        { ...officialReply('Galaxy Google Wallet does something similar. Not Apple-only.', iso(60*0)), parentRef: 'a1c' },
        { ...officialReply('Tap-to-pay is often first to fail when wrist detection loses confidence. Sensor Tattoo Fix improves that optical reading. Tell us your Apple Watch model so we can check compatibility.', iso(60*96)), ref: 'a3', parentRef: 'a1c' }
      ]
    },
    {
      title: 'Is Garmin actually better on tattooed wrists?',
      body: 'Tired of Apple passcode spam. Looking at Forerunner 965 / Fenix. Dense wrist ink folks: real improvement or just a different kind of pain?',
      tags: ["garmin", "apple-watch", "comparison", "tattoo"],
      author: { ...A['seed-bruno'] },
      createdAt: iso(60*188),
      replies: [
        { ...officialReply('On Fenix HR still fails at the gym. Less passcode drama, but a sensor is a sensor.', iso(60*0)), ref: 'a1' },
        { ...officialReply('Garmin also uses green PPG + IR. Watch-removed thresholds differ, so Apple\'s lock fades — but HR gaps and SpO2 issues on black ink remain.', iso(60*0)), ref: 'a1c', parentRef: 'a1' },
        { ...officialReply('Switched thinking new life. Still holes in the chart. Just traded the kind of annoyance.', iso(60*0)), ref: 'a2' },
        { ...officialReply('Disagree a bit: on the 955 detection is less annoying. HR fails, but daily life is fine.', iso(60*0)), parentRef: 'a2' },
        { ...officialReply('On Forerunner workout auto-pause still happens. Do not buy expecting an optical miracle.', iso(60*0)), parentRef: 'a2' },
        { ...officialReply('Switching brands changes UI and lock behavior, but the optical limit from ink remains. Sensor Tattoo Fix targets the sensor interface, not only the ecosystem symptom. Tell us your Garmin or Apple model so we can check compatibility.', iso(60*124)), ref: 'a3', parentRef: 'a1c' }
      ]
    },
    {
      title: 'Is switching Apple to Garmin worth it?',
      body: 'Almost selling the Ultra after a touch-up covered the sensor. Does switching fix detection or do I just spend again on the wrong ecosystem?',
      tags: ["apple-watch", "garmin", "switch", "tattoo"],
      author: { ...A['seed-alex'] },
      createdAt: iso(60*222),
      replies: [
        { ...officialReply('I switched. Lost wrist iMessage and gained a different HR failure. Would not go back just for tattoos.', iso(60*0)), ref: 'a1' },
        { ...officialReply('If the goal is signal through dense ink, changing brands does not change green LED absorption. UX changes; optics stay the same law.', iso(60*0)), ref: 'a1c', parentRef: 'a1' },
        { ...officialReply('Stayed on Apple and focused on the sensor interface. Switching would be overkill for me.', iso(60*0)), ref: 'a2' },
        { ...officialReply('Agree. The problem was the wrist, not the logo on the box.', iso(60*0)), parentRef: 'a2' },
        { ...officialReply('Some swear by Garmin. I am in the nothing really changed camp.', iso(60*0)), ref: 'a3' },
        { ...officialReply('Before swapping your whole ecosystem, look at the cause: optical reading on a tattooed wrist. Sensor Tattoo Fix was designed for that without forcing you off Apple or Garmin. Tell us your current model so we can check compatibility.', iso(60*158)), ref: 'a4', parentRef: 'a1c' }
      ]
    },
    {
      title: 'Galaxy Watch loses HR at the gym',
      body: 'On the couch HR still shows. On the rower and squats my Galaxy 6 Classic chart becomes a desert. Sweat + black ink = nothing.',
      tags: ["galaxy-watch", "gym", "heart-rate", "tattoo"],
      author: { ...A['seed-felipe'] },
      createdAt: iso(60*256),
      replies: [
        { ...officialReply('Mine dies exactly on deadlift sets. At rest between sets it comes back half wrong.', iso(60*0)), ref: 'a1' },
        { ...officialReply('In motion PPG already fights motion artifact. Black ink tanks SNR and the filter discards samples — workouts fill with gaps.', iso(60*0)), ref: 'a1c', parentRef: 'a1' },
        { ...officialReply('Disabled auto-pause and the chart is still full of holes. Not just UI.', iso(60*0)), ref: 'a2' },
        { ...officialReply('Swapped the stock band for a tighter one. Helped maybe 10%. Rest still garbage.', iso(60*0)), parentRef: 'a2' },
        { ...officialReply('Chest strap with Polar looks clean. On the tattooed wrist Galaxy invents numbers.', iso(60*0)), parentRef: 'a1c' },
        { ...officialReply('Sweaty moving workouts amplify optical failure on dark ink. Sensor Tattoo Fix stabilizes wrist reading so the sensor gets usable signal again. Tell us your Galaxy Watch model so we can check compatibility.', iso(60*190)), ref: 'a3', parentRef: 'a1c' }
      ]
    },
    {
      title: 'Galaxy Watch keeps locking on my arm',
      body: 'Galaxy Watch 5 Pro locks itself and asks for the PIN several times a day. Band is snug; it happens exactly over the black ink on my forearm.',
      tags: ["galaxy-watch", "lock", "pin", "tattoo"],
      author: { ...A['seed-diego'] },
      createdAt: iso(60*290),
      replies: [
        { ...officialReply('Thought it was a One UI update. Rolled back and the locking came back the same.', iso(60*0)), ref: 'a1' },
        { ...officialReply('Samsung also uses IR/green to decide the watch is on-wrist. When the return vanishes, the security lock fires — same pattern as Apple, different UI.', iso(60*0)), ref: 'a1c', parentRef: 'a1' },
        { ...officialReply('Happened on my Watch 4. Switching arms helped. Tattooed arm still locks.', iso(60*0)), ref: 'a2' },
        { ...officialReply('I have no clear arm. Both are covered. I lock all day.', iso(60*0)), parentRef: 'a2' },
        { ...officialReply('I turned off auto-lock and lost security. Terrible trade.', iso(60*0)), parentRef: 'a1c' },
        { ...officialReply('Repeated locks usually follow wrist-detection failures, not necessarily a factory defect. Sensor Tattoo Fix improves optical stability in that area. Tell us your Galaxy model so we can check compatibility.', iso(60*226)), ref: 'a3', parentRef: 'a1c' }
      ]
    },
    {
      title: 'Does Huawei GT fail on tattoos too?',
      body: 'Want a GT 5 for battery life. Dominant wrist is almost all black. Does Huawei\'s sensor struggle the same or handle it better?',
      tags: ["huawei", "gt", "battery", "tattoo"],
      author: { ...A['seed-andre'] },
      createdAt: iso(60*324),
      replies: [
        { ...officialReply('GT 4 here. Sleep and HR fail on the same arm. Great battery, ordinary sensor.', iso(60*0)), ref: 'a1' },
        { ...officialReply('Huawei GT is reflective PPG too. Green LED for HR and extra channels for SpO2 — black ink still absorbs the return, no matter the 14-day battery.', iso(60*0)), ref: 'a1c', parentRef: 'a1' },
        { ...officialReply('Bought thinking a Chinese brand would magic it. Nope. Same holes in the chart.', iso(60*0)), ref: 'a2' },
        { ...officialReply('Long battery made me stay. I accept holey HR in workouts, but it annoys me.', iso(60*0)), parentRef: 'a2' },
        { ...officialReply('Long battery life does not change PPG physics under ink. Sensor Tattoo Fix works on the sensor\'s optical interface. If you are buying or already own a GT, tell us the model so we can check compatibility.', iso(60*268)), ref: 'a3', parentRef: 'a1c' }
      ]
    },
    {
      title: 'Amazfit stopped recording every night',
      body: 'After a wrist tattoo touch-up, my GTR 4 only logs random naps. Used to show 7h. Clean sensor, new band.',
      tags: ["amazfit", "sleep", "tattoo", "night"],
      author: { ...A['seed-lucas'] },
      createdAt: iso(60*358),
      replies: [
        { ...officialReply('Bip U Pro here — same after the tattoo. Zepp stays empty.', iso(60*0)), ref: 'a1' },
        { ...officialReply('Amazfit/Zepp sleep algorithms discard nights with intermittent PPG. Ink on the sensor = stage dropout and a near-empty session.', iso(60*0)), ref: 'a1b', parentRef: 'a1' },
        { ...officialReply('Tried sleeping with the watch on my ankle. Absurd and still useless.', iso(60*0)), ref: 'a2' },
        { ...officialReply('Ankle HR for workouts is weird too. Not a good shortcut.', iso(60*0)), parentRef: 'a2' },
        { ...officialReply('Worked before the touch-up. New ink is much more saturated under the sensor.', iso(60*0)), parentRef: 'a1b' },
        { ...officialReply('When overnight PPG goes intermittent, the sleep app loses the night. Sensor Tattoo Fix improves optical return in that band. Tell us your Amazfit model so we can check compatibility.', iso(60*292)), ref: 'a3', parentRef: 'a1b' }
      ]
    },
    {
      title: 'Why do some tattoos interfere and others do not?',
      body: 'I have light watercolor on one side and solid black on the other. The watch only dies when it slides onto the black. What is the physical explanation?',
      tags: ["ink", "optics", "ppg", "tattoo"],
      author: { ...A['seed-ricardo'] },
      createdAt: iso(60*392),
      replies: [
        { ...officialReply('Carbon black strongly absorbs green (~525 nm) PPG light. Light colors scatter more light back to the photodiode. That is why only the black block kills the signal.', iso(60*0)), ref: 'a1' },
        { ...officialReply('On my arm gray shading hurts less than solid fill. Matches what Chris said.', iso(60*0)), ref: 'a1b', parentRef: 'a1' },
        { ...officialReply('I only have fine line work and the Watch barely complains. Density matters more than “having a tattoo”.', iso(60*0)), ref: 'a2' },
        { ...officialReply('Beyond color, layer thickness and scar under the ink change scattering. Two “same” blacks can have very different SNR.', iso(60*0)), ref: 'a2b', parentRef: 'a2' },
        { ...officialReply('Learned the hard way: sensor on the fill → HR gone. Two centimeters aside → back.', iso(60*0)), parentRef: 'a1b' },
        { ...officialReply('Interference depends heavily on color, density, and position under the sensor — not simply “having a tattoo”. Sensor Tattoo Fix was built to stabilize optical return in those cases. Tell us your watch model so we can check compatibility.', iso(60*328)), ref: 'a3', parentRef: 'a1' }
      ]
    },
    {
      title: 'Can a tattoo damage the watch?',
      body: 'Honest question: can running the sensor over ink burn LEDs, heat the skin, or damage the optical module over time?',
      tags: ["safety", "led", "skin", "tattoo"],
      author: { ...A['seed-ana'] },
      createdAt: iso(60*426),
      replies: [
        { ...officialReply('In practice the LED does not “burn” the ink. The photodiode just gets fewer photons — the watch misreads, but hardware does not explode because of a tattoo.', iso(60*0)), ref: 'a1' },
        { ...officialReply('I got paranoid about heat. My Ultra warms the same on the other arm. It is a reading issue, not temperature.', iso(60*0)), ref: 'a1b', parentRef: 'a1' },
        { ...officialReply('Apple support said tattoos do not void warranty, but also do not “fix” detection.', iso(60*0)), ref: 'a2' },
        { ...officialReply('Smartwatch LEDs run at low power. Ink absorption changes the return signal, not typical emitter lifespan.', iso(60*0)), parentRef: 'a2' },
        { ...officialReply('A tattoo usually does not damage the module; it interferes with optical reading. Sensor Tattoo Fix works on that light interface without changing the ink. Tell us your smartwatch model so we can check compatibility.', iso(60*370)), ref: 'a3', parentRef: 'a1' }
      ]
    },
    {
      title: 'It worked before the tattoo, now nothing',
      body: 'Two years of perfect Series 8. Got a wrist fill on Friday and by Saturday HR was already full of holes. Changed nothing in software.',
      tags: ["before-after", "tattoo", "heart-rate", "apple-watch"],
      author: { ...A['seed-marcos'] },
      createdAt: iso(60*460),
      replies: [
        { ...officialReply('Identical story. Before the session the Watch was a saint. After it became a brick on my wrist.', iso(60*0)), ref: 'a1' },
        { ...officialReply('The algorithm baseline learned your clear skin. After ink the reflectance profile changes and the filter starts rejecting peaks it used to accept.', iso(60*0)), ref: 'a1c', parentRef: 'a1' },
        { ...officialReply('Waited three weeks to heal. Did not come back. Not temporary swelling.', iso(60*0)), ref: 'a2' },
        { ...officialReply('Same wait here. Healed, ink settled, sensor still blind on the fill.', iso(60*0)), parentRef: 'a2' },
        { ...officialReply('New band and reset did not bring the old baseline back. Hardware did not forget; the skin changed.', iso(60*0)), parentRef: 'a1c' },
        { ...officialReply('If the watch was stable before and worsened right after the tattoo, the usual cause is the optical change at the wrist. Sensor Tattoo Fix restores a more readable interface for the sensor. Tell us the model so we can check compatibility.', iso(60*394)), ref: 'a3', parentRef: 'a1c' }
      ]
    },
    {
      title: 'Both arms are tattooed. Now what?',
      body: 'My hack was switching wrists. Yesterday I finished the second arm and now neither side recognizes the Watch properly. No plan B.',
      tags: ["both-arms", "tattoo", "options", "sensor"],
      author: { ...A['seed-juliana'] },
      createdAt: iso(60*494),
      replies: [
        { ...officialReply('Welcome to the club. I found out too late. Ankle is not a serious solution for me.', iso(60*0)), ref: 'a1' },
        { ...officialReply('I use a chest strap for workouts and the Watch only for notifications. Works, but misses the point of a smartwatch.', iso(60*0)), ref: 'a1b', parentRef: 'a1' },
        { ...officialReply('With no clear skin under the module, you depend 100% on optical return quality. No backup arm — SNR has to rise where the sensor sits.', iso(60*0)), ref: 'a1c', parentRef: 'a1b' },
        { ...officialReply('Thought about selling the watch. Have not yet because I still want sleep and payments on the wrist.', iso(60*0)), ref: 'a2' },
        { ...officialReply('Same dilemma. Both arms tattooed kill the cheap just-switch-sides fix.', iso(60*0)), parentRef: 'a2' },
        { ...officialReply('With both wrists covered, switching-arm workarounds disappear. Sensor Tattoo Fix was designed for people who need stable reading on the tattooed area. Tell us your smartwatch model so we can check compatibility.', iso(60*428)), ref: 'a3', parentRef: 'a1c' }
      ]
    },
    {
      title: 'Workout keeps pausing by itself',
      body: '10k run: Watch pauses, resumes, pauses again. Disabled auto-pause and it still happens. Tattoo under the sensor.',
      tags: ["workout", "autopause", "running", "tattoo"],
      author: { ...A['seed-kai'] },
      createdAt: iso(60*528),
      replies: [
        { ...officialReply('Drove me crazy. Felt like I had taken the watch off in the middle of the avenue.', iso(60*0)), ref: 'a1' },
        { ...officialReply('Many firmwares tie phantom pauses to on-wrist confidence plus PPG stability while moving. Ink and running bounce cross the threshold constantly.', iso(60*0)), ref: 'a1c', parentRef: 'a1' },
        { ...officialReply('Garmin auto-pause messed with me too. Not Apple-only.', iso(60*0)), ref: 'a2' },
        { ...officialReply('I screen-recorded it. You can see the watch-removed icon flicker without me touching anything.', iso(60*0)), parentRef: 'a2' },
        { ...officialReply('Tighter band cut pauses by maybe 30%. The rest remains.', iso(60*0)), parentRef: 'a1c' },
        { ...officialReply('Phantom pauses on runs usually reflect unstable wrist detection under ink, not only workout settings. Sensor Tattoo Fix helps keep optical contact stable. Tell us your watch model so we can check compatibility.', iso(60*462)), ref: 'a3', parentRef: 'a1c' }
      ]
    },
    {
      title: 'Does clear tape actually work?',
      body: 'Saw the clear adhesive tape trick on the sensor. Tried it on Series 8: detection better for about 3h, then sticky mess and lint.',
      tags: ["diy", "tape", "hack", "tattoo"],
      author: { ...A['seed-vini'] },
      createdAt: iso(60*562),
      replies: [
        { ...officialReply('Lasted one workout for me. Sweat dissolved the glue and HR vanished again.', iso(60*0)), ref: 'a1' },
        { ...officialReply('Tape can change refractive index and the air-skin gap for a few hours. Not a stable optical interface: it dirties, yellows, and bubbles.', iso(60*0)), ref: 'a1c', parentRef: 'a1' },
        { ...officialReply('I used kitchen PVC film. Even worse — slips and leaves greasy residue.', iso(60*0)), ref: 'a2' },
        { ...officialReply('Any sticky hack on the rear glass makes me worry about warranty.', iso(60*0)), parentRef: 'a2' },
        { ...officialReply('Works a bit then becomes dirt. Agree with SensorGuru: not a real solution.', iso(60*0)), parentRef: 'a1c' },
        { ...officialReply('Improvised tapes and films can fool the sensor briefly, but degrade with sweat and dirt. Sensor Tattoo Fix was built as a stable optical interface, not a temporary hack. Tell us your watch model so we can check compatibility.', iso(60*496)), ref: 'a3', parentRef: 'a1c' }
      ]
    },
    {
      title: 'Furniture silicone pad on the sensor',
      body: 'Saw people sticking clear table bumpers on the sensor glass. Sounds like a joke. Has anyone actually tested it?',
      tags: ["diy", "silicone", "bumper", "sensor"],
      author: { ...A['seed-renato'] },
      createdAt: iso(60*596),
      replies: [
        { ...officialReply('Tried it. Watch sat higher and detection got worse. Table turn.', iso(60*0)), ref: 'a1' },
        { ...officialReply('Increasing the gap between LED/photodiode and skin almost always worsens optical coupling. Thick silicone is the opposite of what PPG wants.', iso(60*0)), ref: 'a1c', parentRef: 'a1' },
        { ...officialReply('A friend swears the thin one almost worked. On my Watch 7, no.', iso(60*0)), ref: 'a2' },
        { ...officialReply('Almost does not count. I want something that survives a sweaty workout.', iso(60*0)), parentRef: 'a2' },
        { ...officialReply('Also leaves a circular mark on the wrist. Hideous.', iso(60*0)), parentRef: 'a1c' },
        { ...officialReply('Improvised spacers usually lift the sensor off the skin and worsen PPG. Sensor Tattoo Fix works the optical interface without creating that useless gap. Tell us your smartwatch model so we can check compatibility.', iso(60*530)), ref: 'a3', parentRef: 'a1c' }
      ]
    },
    {
      title: 'Is Sensor Tattoo Fix a laser?',
      body: 'The name confused me: does it remove ink, use a laser, or change the tattoo somehow? I do not want to mess with the art.',
      tags: ["sensor-tattoo-fix", "laser", "question", "product"],
      author: { ...A['seed-patricia'] },
      createdAt: iso(60*630),
      replies: [
        { ...officialReply('From what I get it is an interface on the sensor, not a skin treatment. Want official confirmation though.', iso(60*0)), ref: 'a1' },
        { ...officialReply('Not a laser and not removal. It is optical coupling: improving the light path between LEDs/photodiode and tattooed skin, without erasing pigment.', iso(60*0)), ref: 'a1c', parentRef: 'a1' },
        { ...officialReply('Good, because fix in the name scared me too.', iso(60*0)), ref: 'a2' },
        { ...officialReply('Same paranoia. Tattoo took years; I do not want to correct it with strong light.', iso(60*0)), parentRef: 'a2' },
        { ...officialReply('Sensor Tattoo Fix is not a laser and does not remove ink: it is an optical interface solution for the smartwatch sensor. For fit details, tell us your watch model so we can check compatibility.', iso(60*574)), ref: 'a3', parentRef: 'a1c' }
      ]
    },
    {
      title: 'Is black ink really worse?',
      body: 'My piece has black, red and yellow. The watch fails only when it slides onto the black area. Does that confirm the theory?',
      tags: ["black-ink", "color", "ppg", "tattoo"],
      author: { ...A['seed-fernando'] },
      createdAt: iso(60*664),
      replies: [
        { ...officialReply('Carbon black swallows the green LED; red and yellow return far more photons to the photodiode. Your observation matches PPG physics.', iso(60*0)), ref: 'a1' },
        { ...officialReply('On my arm yellow barely interferes. Solid black is another planet.', iso(60*0)), ref: 'a1b', parentRef: 'a1' },
        { ...officialReply('SpO2 uses red/IR and also suffers on dense black, but continuous HR (green) usually dies first.', iso(60*0)), parentRef: 'a1b' },
        { ...officialReply('That is why artists who get wearables leave an unfilled window under the sensor.', iso(60*0)), ref: 'a2' },
        { ...officialReply('I already had the fill. A window now would be an expensive cover-up. Need another way out.', iso(60*0)), parentRef: 'a2' },
        { ...officialReply('Dense black is the worst case for green PPG, exactly as you described. Sensor Tattoo Fix improves optical return there without requiring you to erase the art. Tell us your watch model so we can check compatibility.', iso(60*598)), ref: 'a3', parentRef: 'a1' }
      ]
    },
    {
      title: 'Does sweat make tattoo readings worse?',
      body: 'When dry it still reads. Ten minutes into a sweaty run, heart rate disappears completely over the ink.',
      tags: ["sweat", "running", "heart-rate", "tattoo"],
      author: { ...A['seed-edurunner'] },
      createdAt: iso(60*698),
      replies: [
        { ...officialReply('Exactly. Fine at the start, by km 3 it is dashes. Without the tattoo that did not happen.', iso(60*0)), ref: 'a1' },
        { ...officialReply('Sweat creates a film and microbubbles that stack on top of ink return loss. The motion filter is already marginal; the combo tanks SNR.', iso(60*0)), ref: 'a1c', parentRef: 'a1' },
        { ...officialReply('Wiped the sensor mid-workout with my shirt. Came back for two minutes then died again.', iso(60*0)), ref: 'a2' },
        { ...officialReply('On the indoor bike with less dripping sweat it also fails, just later. Not only running.', iso(60*0)), parentRef: 'a2' },
        { ...officialReply('Water between sensor and skin changes specular reflection. Over black ink you are already on a knife edge — any film pushes into dropout.', iso(60*0)), parentRef: 'a1c' },
        { ...officialReply('Sweat amplifies optical failure on tattooed wrists by adding an irregular film to an already weak return. Sensor Tattoo Fix stabilizes that interface. Tell us your smartwatch model so we can check compatibility.', iso(60*632)), ref: 'a3', parentRef: 'a1c' }
      ]
    },
    {
      title: 'I thought my watch was defective',
      body: 'I reset it, changed bands and nearly sent it for repair. It works perfectly on the arm without ink. Almost paid shipping for nothing.',
      tags: ["defect", "support", "diagnosis", "tattoo"],
      author: { ...A['seed-camila'] },
      createdAt: iso(60*732),
      replies: [
        { ...officialReply('Almost the same drama. The tech asked for a video and on the clear arm he had no argument.', iso(60*0)), ref: 'a1' },
        { ...officialReply('A/B arm test is the cheapest diagnosis: if hardware fails only over ink, it is not a dead module — it is optics.', iso(60*0)), ref: 'a1c', parentRef: 'a1' },
        { ...officialReply('I had already booked a support pickup. Cancelled after that test.', iso(60*0)), ref: 'a2' },
        { ...officialReply('HR logs with gaps on only one arm also count. No need to open the watch.', iso(60*0)), parentRef: 'a2' },
        { ...officialReply('If the same watch works on the arm without ink, optical interference is more likely than a factory defect. Sensor Tattoo Fix addresses that interface. Tell us the model so we can check compatibility.', iso(60*676)), ref: 'a3', parentRef: 'a1c' }
      ]
    },
    {
      title: 'Found out after tattooing my second arm',
      body: 'My clear arm was the workaround. I tattooed it yesterday and finally learned why the other one never worked. No obvious way out.',
      tags: ["second-arm", "discovery", "tattoo", "detection"],
      author: { ...A['seed-bela'] },
      createdAt: iso(60*766),
      replies: [
        { ...officialReply('Known pain. The good arm hid the problem until you finished the design.', iso(60*0)), ref: 'a1' },
        { ...officialReply('While clear skin existed, the system always had a high-SNR path. Without it, the algorithm has no easy reference.', iso(60*0)), ref: 'a1c', parentRef: 'a1' },
        { ...officialReply('I delayed the second arm because of this. You were braver — or more stubborn.', iso(60*0)), ref: 'a2' },
        { ...officialReply('Stubborn here too. Art first, wearables later. Now I pay the price.', iso(60*0)), parentRef: 'a2' },
        { ...officialReply('No firmware miracle invents optical return where ink swallowed the green. Either raise signal at the interface, or accept gaps.', iso(60*0)), parentRef: 'a1c' },
        { ...officialReply('Losing the backup arm makes the optical cause obvious. Sensor Tattoo Fix exists for people who need the sensor to read over the tattooed area. Tell us your smartwatch model so we can check compatibility.', iso(60*700)), ref: 'a3', parentRef: 'a1c' }
      ]
    },
    {
      title: 'Which brand struggles least with tattoos?',
      body: 'Apple, Garmin, Samsung, Huawei or Amazfit: does any brand handle dark wrist ink better?',
      tags: ["brands", "comparison", "tattoo", "sensor"],
      author: { ...A['seed-rodrigo'] },
      createdAt: iso(60*800),
      replies: [
        { ...officialReply('Garmin annoys less on lock, but HR is still holey. Samsung PIN-locks. Apple passcode-spams. Amazfit loses sleep. Pick your poison.', iso(60*0)), ref: 'a1' },
        { ...officialReply('All use reflective PPG. Differences are security thresholds and UX, not an optical miracle against carbon black.', iso(60*0)), ref: 'a1c', parentRef: 'a1' },
        { ...officialReply('I tested Apple and Garmin on the same arm. Neither saved strength workouts.', iso(60*0)), ref: 'a2' },
        { ...officialReply('Huawei wins on battery. Sensor still mediocre over fill.', iso(60*0)), parentRef: 'a2' },
        { ...officialReply('If the metric is less security spam, Garmin/Amazfit. If the metric is clean PPG under ink, no brand solves it alone.', iso(60*0)), parentRef: 'a1c' },
        { ...officialReply('Brand changes lock/app experience, but PPG physics under dark ink is shared. Sensor Tattoo Fix works on that optical layer. Tell us the model you use or plan to buy so we can check compatibility.', iso(60*734)), ref: 'a3', parentRef: 'a1c' }
      ]
    },
    {
      title: 'Heart-rate chart is full of gaps',
      body: 'My workout summary looks like Morse code: a few minutes of HR, long blanks, then nonsense spikes. Black tattoo under the sensor.',
      tags: ["heart-rate", "chart", "gaps", "workout"],
      author: { ...A['seed-daniel'] },
      createdAt: iso(60*834),
      replies: [
        { ...officialReply('My Strava looks ridiculous. Zone 5 while resting and zone 0 on a sprint.', iso(60*0)), ref: 'a1' },
        { ...officialReply('When samples fall below the quality threshold, firmware injects gaps or interpolates badly. Ink + motion = mass rejection.', iso(60*0)), ref: 'a1c', parentRef: 'a1' },
        { ...officialReply('Thought it was GPS. Turned GPS off and the HR chart stayed holey.', iso(60*0)), ref: 'a2' },
        { ...officialReply('GPS does not create those BPM gaps. That is the optical pipeline: green LED → skin/ink → photodiode → filter.', iso(60*0)), parentRef: 'a2' },
        { ...officialReply('A chest strap fixes the chart, but I want the watch working on the wrist.', iso(60*0)), parentRef: 'a1c' },
        { ...officialReply('Holes and ghost spikes in the chart usually come from rejected optical samples under ink. Sensor Tattoo Fix improves signal quality at the source. Tell us your smartwatch model so we can check compatibility.', iso(60*768)), ref: 'a3', parentRef: 'a1c' }
      ]
    },
    {
      title: 'Does SpO2 fail because of tattoos too?',
      body: 'Besides heart rate, oxygen readings error out almost always. It uses different light; does ink still matter?',
      tags: ["spo2", "oxygen", "sensor", "tattoo"],
      author: { ...A['seed-moth'] },
      createdAt: iso(60*868),
      replies: [
        { ...officialReply('Typical SpO2 uses red + IR. Dark ink still absorbs and unbalances the channel ratio — hence errors or invented values.', iso(60*0)), ref: 'a1' },
        { ...officialReply('On my Ultra oxygen measurement sticks on calculating… until I switch arms.', iso(60*0)), ref: 'a1b', parentRef: 'a1' },
        { ...officialReply('Green HR usually dies first; red/IR SpO2 dies later or together, depending on density and which wavelengths the ink absorbs.', iso(60*0)), parentRef: 'a1b' },
        { ...officialReply('I thought SpO2 would be immune. It is not. Same black area, same failure.', iso(60*0)), ref: 'a2' },
        { ...officialReply('SpO2 also needs a clean optical return; dark ink interferes with red/IR channels. Sensor Tattoo Fix improves that interface. Tell us your smartwatch model so we can check compatibility.', iso(60*812)), ref: 'a3', parentRef: 'a1' }
      ]
    },
    {
      title: 'Is a smartwatch worth it with tattoos?',
      body: 'I want sleep, workouts and payments, but both wrists are tattooed. Is buying one a waste or still worth it?',
      tags: ["buying", "worth-it", "tattoo", "smartwatch"],
      author: { ...A['seed-jordan'] },
      createdAt: iso(60*902),
      replies: [
        { ...officialReply('It makes sense if you fix the optics. Without that it becomes an expensive wrist notification brick.', iso(60*0)), ref: 'a1' },
        { ...officialReply('Without a stable optical path, sleep/HR/Pay stay inconsistent. New hardware does not cancel ink absorption.', iso(60*0)), ref: 'a1c', parentRef: 'a1' },
        { ...officialReply('I bought anyway for the apps. I ignore HR. I do not recommend that rotten peace.', iso(60*0)), ref: 'a2' },
        { ...officialReply('If budget is tight, fix the interface before upgrading generations.', iso(60*0)), parentRef: 'a2' },
        { ...officialReply('Buy if the watch\'s features matter to you — but plan optical coupling as part of the setup, not as a footnote.', iso(60*0)), parentRef: 'a1c' },
        { ...officialReply('A smartwatch still makes sense with tattoos if optical reading is stabilized. Sensor Tattoo Fix exists exactly for that scenario. Tell us which model you are looking at so we can check compatibility.', iso(60*836)), ref: 'a3', parentRef: 'a1c' }
      ]
    },
    {
      title: 'Megathread: epoxy sticker works, but...',
      body: 'Stuck a clear epoxy sticker on the Ultra sensor. Detection came back. But the charger does not seat right, ECG died, and edges lifted on day two. Open thread for honest reports.',
      tags: ["epoxy", "diy", "megathread", "sensor"],
      author: { ...A['seed-huck'] },
      createdAt: iso(60*936),
      replies: [
        { ...officialReply('Same setup. Detection ok for 48h. In the shower a corner peeled and water got in.', iso(60*0)), ref: 'a1' },
        { ...officialReply('Water + improvised glue = fast track to residue on the glass. Had to clean with isopropyl.', iso(60*0)), ref: 'a1b', parentRef: 'a1' },
        { ...officialReply('Ultra MagSafe got loose. Sometimes charges, sometimes not. Hate it.', iso(60*0)), ref: 'a1c', parentRef: 'a1b' },
        { ...officialReply('An epoxy layer changes gap and capacitance seen by the charger and ECG electrode. It can fix PPG and break other functions in one move.', iso(60*0)), ref: 'a1d', parentRef: 'a1c' },
        { ...officialReply('ECG on my Series 9 zeroed with the sticker. Removed it and it returned. Ridiculous trade.', iso(60*0)), ref: 'a1e', parentRef: 'a1d' },
        { ...officialReply('Trimmed the sticker smaller than the sensor ring. Charged better, detection got worse again.', iso(60*0)), ref: 'a2' },
        { ...officialReply('You are optimizing optical gap against electrical/inductive contact. DIY epoxy was not designed as a PPG interface — hence the conflict.', iso(60*0)), ref: 'a2b', parentRef: 'a2' },
        { ...officialReply('Sweat killed mine in a week. The edge became a dirty trail. Zero glamour.', iso(60*0)), ref: 'a2c', parentRef: 'a2b' },
        { ...officialReply('Agree with TechRunner. Works until it does not — and it always breaks something else.', iso(60*0)), ref: 'a2d', parentRef: 'a2c' },
        { ...officialReply('People sell epoxy kits on Instagram as the definitive fix. Be careful.', iso(60*0)), ref: 'a2e', parentRef: 'a2d' },
        { ...officialReply('I went back to the clear arm. Epoxy was just an expensive sticky experiment.', iso(60*0)), parentRef: 'a2e' },
        { ...officialReply('Reports like these are common: epoxy hacks can improve PPG for a while while hurting charging, ECG and durability. Sensor Tattoo Fix was developed as an optical interface specific to the sensor, without that improvisation. Tell us your smartwatch model so we can check compatibility.', iso(60*850)), ref: 'a3', parentRef: 'a2b' }
      ]
    },
    {
      title: 'Watch invents 180 bpm while I rest',
      body: 'Sitting on the couch it says 180 bpm, then a dash, then 72. On the arm without ink it stays 68–74. Series 9.',
      tags: ["heart-rate", "180bpm", "rest", "tattoo"],
      author: { ...A['seed-dudu'] },
      createdAt: iso(60*970),
      replies: [
        { ...officialReply('Scared me the first time. Thought arrhythmia. It was the sensor going nuts on the ink.', iso(60*0)), ref: 'a1' },
        { ...officialReply('With low SNR the peak detector grabs harmonics and noise and sees high HR. Then it loses lock and shows a dash. Classic degraded PPG.', iso(60*0)), ref: 'a1c', parentRef: 'a1' },
        { ...officialReply('Turned off high HR notifications so I would not freak out. Does not fix the cause.', iso(60*0)), ref: 'a2' },
        { ...officialReply('False alerts are a symptom of the same pipeline: dirty signal → algorithm overconfident on a wrong peak.', iso(60*0)), parentRef: 'a2' },
        { ...officialReply('On the other arm it never invented 180. So much for the anxiety theory.', iso(60*0)), parentRef: 'a1c' },
        { ...officialReply('Absurd resting readings with gaps in between usually come from a confused optical signal under ink. Sensor Tattoo Fix stabilizes the return so the algorithm stops inventing peaks. Tell us your Apple Watch model so we can check compatibility.', iso(60*904)), ref: 'a3', parentRef: 'a1c' }
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
        { ...officialReply('Stessa tortura. Alla cassa Apple Pay muore perché pensa che abbia tolto l\'orologio.', iso(60*0)), ref: 'a1' },
        { ...officialReply('Ho cambiato sul braccio senza inchiostro e ha smesso. Sul tatuato continua a chiedere il codice a metà giornata.', iso(60*0)), ref: 'a1b', parentRef: 'a1' },
        { ...officialReply('Cambiare braccio non ha risolto: entrambi hanno copertura sulla zona del sensore.', iso(60*0)), parentRef: 'a1b' },
        { ...officialReply('Il blocco codice dell\'Apple Watch usa il canale IR di prossimità. Inchiostro denso uccide il ritorno e il sistema lo tratta come rimozione — ecco lo spam di codice, non un bug a caso.', iso(60*0)), ref: 'a1c', parentRef: 'a1' },
        { ...officialReply('Ho anche disattivato Sblocca con iPhone pensando aiutasse. Zero differenza.', iso(60*0)), ref: 'a2' },
        { ...officialReply('Quando il rilevamento del polso oscilli, Apple Watch rafforza la sicurezza e chiede il codice come se fosse stato rimosso. Sensor Tattoo Fix migliora l\'interfaccia ottica in quella zona. Indica il modello esatto del tuo Apple Watch così verifichiamo la compatibilità.', iso(60*12)), ref: 'a3', parentRef: 'a1c' }
      ]
    },
    {
      title: 'Il monitoraggio del sonno è morto',
      body: 'Dormo dalle 23 alle 6 e il Watch segna 48 minuti o dati insufficienti. Sul braccio senza tatuaggio registra tutta la notte. Già aggiornato watchOS e iPhone.',
      tags: ["sonno", "apple-watch", "tattoo", "tracking"],
      author: { ...A['seed-marina'] },
      createdAt: iso(60*86),
      replies: [
        { ...officialReply('Perdo le fasi REM ogni notte. L\'app mi segna sveglio nel bel mezzo del sonno.', iso(60*0)), ref: 'a1' },
        { ...officialReply('Il sonno richiede PPG stabile per ore. Quando lo SNR cala, il classificatore di fasi taglia blocchi interi e la sessione diventa dati insufficienti.', iso(60*0)), ref: 'a1b', parentRef: 'a1' },
        { ...officialReply('Ho dormito col cinturino più stretto e mi sono svegliato col segno rosso. Segna ancora 1h.', iso(60*0)), ref: 'a2' },
        { ...officialReply('Stringere troppo peggiora la circolazione e il segnale. Non è una soluzione.', iso(60*0)), parentRef: 'a2' },
        { ...officialReply('Stesso su Amazfit: pisolino di 40 minuti dopo una notte intera. Non è solo Apple.', iso(60*0)), parentRef: 'a1b' },
        { ...officialReply('Il tracking notturno fallisce quando il ritorno ottico resta irregolare per ore. Sensor Tattoo Fix stabilizza quella lettura sul polso tatuato. Se vuoi, indica il modello del tuo smartwatch così verifichiamo la compatibilità.', iso(60*34)), ref: 'a3', parentRef: 'a1b' }
      ]
    },
    {
      title: 'Quale Apple Watch va meglio coi tatuaggi?',
      body: 'Scelgo tra SE 2, Series 10 e Ultra 2. Tatuaggio denso sul polso dominante. Vale l\'Ultra o soffrono tutti uguale?',
      tags: ["apple-watch", "modello", "compatibilita", "tattoo"],
      author: { ...A['seed-pedro'] },
      createdAt: iso(60*120),
      replies: [
        { ...officialReply('Uso Ultra 2. Continua a chiedere il codice. Hardware meglio, fisica dell\'inchiostro uguale.', iso(60*0)), ref: 'a1' },
        { ...officialReply('Le Series nuove migliorano campionamento e LED verdi, ma PPG + IR on-wrist è lo stesso principio. Il modello da solo non batte l\'inchiostro nero sul fotodiodo.', iso(60*0)), ref: 'a1c', parentRef: 'a1' },
        { ...officialReply('Series 9 qui. Peggio di quello di mio marito senza tattoo. SE non l\'ho provato.', iso(60*0)), ref: 'a2' },
        { ...officialReply('Da SE a 9 sperando di risolvere. Quasi lo stesso drama. Soldi buttati.', iso(60*0)), parentRef: 'a2' },
        { ...officialReply('Onestamente: se l\'inchiostro copre il sensore, ogni generazione soffre. Non comprare Ultra solo per quello.', iso(60*0)), parentRef: 'a1c' },
        { ...officialReply('Le generazioni cambiano LED e processamento, ma l\'ostacolo ottico dell\'inchiostro resta. Sensor Tattoo Fix esiste per quel vuoto, indipendentemente dal modello. Indica quale Apple Watch stai valutando così verifichiamo la compatibilità.', iso(60*64)), ref: 'a3', parentRef: 'a1c' }
      ]
    },
    {
      title: 'Apple Pay smette di funzionare da solo',
      body: 'La FC a volte mostra ancora un numero. Alla cassa Pay si blocca e chiede il codice. Sembra che il wrist detect sia rotto solo per i pagamenti.',
      tags: ["apple-pay", "pagamento", "rilevamento", "tattoo"],
      author: { ...A['seed-pri'] },
      createdAt: iso(60*154),
      replies: [
        { ...officialReply('Per me Pay è morto per primo. Poi è arrivato lo spam del codice.', iso(60*0)), ref: 'a1' },
        { ...officialReply('Wallet richiede alta confidenza on-wrist. La soglia è più rigida della FC continua — segnale al limite blocca Pay prima che muoia il grafico BPM.', iso(60*0)), ref: 'a1c', parentRef: 'a1' },
        { ...officialReply('Pensavo fosse la carta. Rimossa e rimessa. Non lo era.', iso(60*0)), ref: 'a2' },
        { ...officialReply('Reset del Watch e restore del backup. Meglio solo sul braccio senza inchiostro.', iso(60*0)), parentRef: 'a2' },
        { ...officialReply('Anche Google Wallet su Galaxy fa qualcosa di simile. Non è solo Apple.', iso(60*0)), parentRef: 'a1c' },
        { ...officialReply('Il pagamento contactless è spesso il primo a cadere quando il rilevamento perde confidenza. Sensor Tattoo Fix migliora quella lettura ottica. Indica il modello del tuo Apple Watch così verifichiamo la compatibilità.', iso(60*96)), ref: 'a3', parentRef: 'a1c' }
      ]
    },
    {
      title: 'Garmin è davvero migliore sui polsi tatuati?',
      body: 'Stufo di Apple che chiede il codice. Guardo Forerunner 965 / Fenix. Chi ha inchiostro denso: miglioramento vero o solo un altro tipo di dolore?',
      tags: ["garmin", "apple-watch", "confronto", "tattoo"],
      author: { ...A['seed-bruno'] },
      createdAt: iso(60*188),
      replies: [
        { ...officialReply('Sul Fenix la FC fallisce ancora in palestra. Meno drama del codice, ma un sensore è un sensore.', iso(60*0)), ref: 'a1' },
        { ...officialReply('Anche Garmin usa PPG verde + IR. Le soglie watch-removed differiscono, quindi il lock Apple cala — ma buchi di FC e SpO2 su inchiostro nero restano.', iso(60*0)), ref: 'a1c', parentRef: 'a1' },
        { ...officialReply('Ho cambiato pensando a una vita nuova. Ancora buchi nel grafico. Ho solo cambiato tipo di irritazione.', iso(60*0)), ref: 'a2' },
        { ...officialReply('Non d\'accordo del tutto: sul 955 il rilevamento è meno seccante. La FC fallisce, ma il quotidiano è ok.', iso(60*0)), parentRef: 'a2' },
        { ...officialReply('Sul Forerunner l\'auto-pause dell\'allenamento continua. Non comprate aspettando un miracolo ottico.', iso(60*0)), parentRef: 'a2' },
        { ...officialReply('Cambiare marca cambia UI e blocco, ma il limite ottico dell\'inchiostro resta. Sensor Tattoo Fix agisce sull\'interfaccia del sensore, non solo sul sintomo dell\'ecosistema. Indica il modello Garmin o Apple così verifichiamo la compatibilità.', iso(60*124)), ref: 'a3', parentRef: 'a1c' }
      ]
    },
    {
      title: 'Vale la pena passare da Apple a Garmin?',
      body: 'Sto per vendere l\'Ultra dopo un ritocco che ha coperto il sensore. Il cambio sistema il rilevamento o spendo di nuovo sull\'ecosistema sbagliato?',
      tags: ["apple-watch", "garmin", "cambio", "tattoo"],
      author: { ...A['seed-alex'] },
      createdAt: iso(60*222),
      replies: [
        { ...officialReply('Ho cambiato. Perso iMessage al polso e guadagnato un altro fallimento FC. Non tornerei solo per i tattoo.', iso(60*0)), ref: 'a1' },
        { ...officialReply('Se l\'obiettivo è segnale attraverso inchiostro denso, cambiare marca non cambia l\'assorbimento del LED verde. Cambia la UX; l\'ottica resta la stessa legge.', iso(60*0)), ref: 'a1c', parentRef: 'a1' },
        { ...officialReply('Rimasta su Apple e concentrata sull\'interfaccia del sensore. Cambiare sarebbe eccessivo per me.', iso(60*0)), ref: 'a2' },
        { ...officialReply('D\'accordo. Il problema era il polso, non il logo sulla scatola.', iso(60*0)), parentRef: 'a2' },
        { ...officialReply('C\'è chi giura su Garmin. Io sono nel gruppo non è cambiato niente di vero.', iso(60*0)), ref: 'a3' },
        { ...officialReply('Prima di cambiare tutto l\'ecosistema, guarda la causa: lettura ottica sul polso tatuato. Sensor Tattoo Fix è pensato per quello senza costringerti a lasciare Apple o Garmin. Indica il modello attuale così verifichiamo la compatibilità.', iso(60*158)), ref: 'a4', parentRef: 'a1c' }
      ]
    },
    {
      title: 'Galaxy Watch perde la FC in palestra',
      body: 'Sul divano la FC appare ancora. Sul vogatore e squat il grafico del Galaxy 6 Classic diventa un deserto. Sudore + nero = niente.',
      tags: ["galaxy-watch", "palestra", "fc", "tattoo"],
      author: { ...A['seed-felipe'] },
      createdAt: iso(60*256),
      replies: [
        { ...officialReply('Il mio muore proprio nelle serie di stacco. A riposo tra le serie torna a metà.', iso(60*0)), ref: 'a1' },
        { ...officialReply('In movimento il PPG lotta già con artefatto di moto. Nero abbassa lo SNR e il filtro scarta campioni — l\'allenamento si riempie di buchi.', iso(60*0)), ref: 'a1c', parentRef: 'a1' },
        { ...officialReply('Disattivato auto-pause e il grafico è ancora bucherellato. Non è solo UI.', iso(60*0)), ref: 'a2' },
        { ...officialReply('Cambiato il cinturino stock con uno più stretto. Aiuto forse 10%. Il resto resta spazzatura.', iso(60*0)), parentRef: 'a2' },
        { ...officialReply('Fascia Polar al petto è pulita. Sul polso tatuato Galaxy inventa numeri.', iso(60*0)), parentRef: 'a1c' },
        { ...officialReply('Allenamenti con sudore e movimento amplificano il fallimento ottico su inchiostro scuro. Sensor Tattoo Fix stabilizza la lettura al polso perché il sensore abbia di nuovo segnale utile. Indica il modello Galaxy Watch così verifichiamo la compatibilità.', iso(60*190)), ref: 'a3', parentRef: 'a1c' }
      ]
    },
    {
      title: 'Galaxy Watch continua a bloccarsi sul braccio',
      body: 'Galaxy Watch 5 Pro si blocca e chiede il PIN più volte al giorno. Cinturino stretto; succede proprio sopra il nero sull\'avambraccio.',
      tags: ["galaxy-watch", "blocco", "pin", "tattoo"],
      author: { ...A['seed-diego'] },
      createdAt: iso(60*290),
      replies: [
        { ...officialReply('Pensavo fosse un update One UI. Tornato indietro e il blocco è uguale.', iso(60*0)), ref: 'a1' },
        { ...officialReply('Anche Samsung usa IR/verde per decidere se è al polso. Quando il ritorno sparisce, scatta il blocco sicurezza — stesso schema di Apple, UI diversa.', iso(60*0)), ref: 'a1c', parentRef: 'a1' },
        { ...officialReply('Succedeva sul Watch 4. Cambiare braccio ha aiutato. Il braccio tatuato si blocca ancora.', iso(60*0)), ref: 'a2' },
        { ...officialReply('Non ho un braccio libero. Entrambi coperti. Mi blocco tutto il giorno.', iso(60*0)), parentRef: 'a2' },
        { ...officialReply('Ho disattivato il blocco automatico e perso sicurezza. Scambio pessimo.', iso(60*0)), parentRef: 'a1c' },
        { ...officialReply('I blocchi ripetuti seguono di solito fallimenti di rilevamento polso, non per forza un difetto di fabbrica. Sensor Tattoo Fix migliora la stabilità ottica in quella zona. Indica il modello Galaxy così verifichiamo la compatibilità.', iso(60*226)), ref: 'a3', parentRef: 'a1c' }
      ]
    },
    {
      title: 'Anche Huawei GT fallisce coi tatuaggi?',
      body: 'Vorrei un GT 5 per la batteria. Polso dominante quasi tutto nero. Il sensore Huawei soffre uguale o gestisce meglio?',
      tags: ["huawei", "gt", "batteria", "tattoo"],
      author: { ...A['seed-andre'] },
      createdAt: iso(60*324),
      replies: [
        { ...officialReply('GT 4 qui. Sonno e FC falliscono sullo stesso braccio. Batteria top, sensore ordinario.', iso(60*0)), ref: 'a1' },
        { ...officialReply('Anche Huawei GT è PPG riflessivo. LED verde per FC e canali extra per SpO2 — il nero assorbe ancora il ritorno, batteria da 14 giorni o no.', iso(60*0)), ref: 'a1c', parentRef: 'a1' },
        { ...officialReply('Comprato pensando a magia della marca cinese. No. Stessi buchi nel grafico.', iso(60*0)), ref: 'a2' },
        { ...officialReply('La batteria lunga mi ha fatto restare. Accetto FC bucherellata, ma irrita.', iso(60*0)), parentRef: 'a2' },
        { ...officialReply('L\'autonomia alta non cambia la fisica del PPG sotto inchiostro. Sensor Tattoo Fix agisce sull\'interfaccia ottica del sensore. Se compri o hai già un GT, indica il modello così verifichiamo la compatibilità.', iso(60*268)), ref: 'a3', parentRef: 'a1c' }
      ]
    },
    {
      title: 'Amazfit non registra più il sonno',
      body: 'Dopo un ritocco sul polso, il GTR 4 segna solo pisolini a caso. Prima faceva 7h. Sensore pulito, cinturino nuovo.',
      tags: ["amazfit", "sonno", "tattoo", "notte"],
      author: { ...A['seed-lucas'] },
      createdAt: iso(60*358),
      replies: [
        { ...officialReply('Bip U Pro qui — stesso dopo il tatuaggio. Zepp resta vuoto.', iso(60*0)), ref: 'a1' },
        { ...officialReply('Gli algoritmi sonno Amazfit/Zepp scartano notti con PPG intermittente. Inchiostro sul sensore = dropout di fasi e sessione quasi vuota.', iso(60*0)), ref: 'a1b', parentRef: 'a1' },
        { ...officialReply('Provato a dormire col orologio alla caviglia. Assurdo e comunque inutile.', iso(60*0)), ref: 'a2' },
        { ...officialReply('Anche la FC alla caviglia in allenamento è strana. Non è una scorciatoia buona.', iso(60*0)), parentRef: 'a2' },
        { ...officialReply('Prima del ritocco andava. L\'inchiostro nuovo è molto più saturo sotto il sensore.', iso(60*0)), parentRef: 'a1b' },
        { ...officialReply('Quando il PPG notturno diventa intermittente, l\'app sonno perde la notte. Sensor Tattoo Fix migliora il ritorno ottico in quella fascia. Indica il modello Amazfit così verifichiamo la compatibilità.', iso(60*292)), ref: 'a3', parentRef: 'a1b' }
      ]
    },
    {
      title: 'Perché alcuni tatuaggi interferiscono e altri no?',
      body: 'Ho acquerello chiaro da un lato e nero pieno dall\'altro. L\'orologio muore solo quando scivola sul nero. Qual è la spiegazione fisica?',
      tags: ["inchiostro", "ottica", "ppg", "tattoo"],
      author: { ...A['seed-ricardo'] },
      createdAt: iso(60*392),
      replies: [
        { ...officialReply('Il nero carbonioso assorbe forte il verde (~525 nm) del PPG. I colori chiari rimandano più luce al fotodiodo. Per questo solo il blocco nero uccide il segnale.', iso(60*0)), ref: 'a1' },
        { ...officialReply('Sul mio braccio l\'ombreggiatura grigia dà meno noia del pieno. Conferma Chris.', iso(60*0)), ref: 'a1b', parentRef: 'a1' },
        { ...officialReply('Ho solo linee sottili e il Watch quasi non si lamenta. Conta la densità, non “avere un tattoo”.', iso(60*0)), ref: 'a2' },
        { ...officialReply('Oltre al colore, spessore dello strato e cicatrice sotto l\'inchiostro cambiano lo scattering. Due neri “uguali” possono avere SNR molto diverso.', iso(60*0)), ref: 'a2b', parentRef: 'a2' },
        { ...officialReply('Imparato a dure: sensore sul pieno → FC sparisce. Due centimetri di lato → torna.', iso(60*0)), parentRef: 'a1b' },
        { ...officialReply('L\'interferenza dipende molto da colore, densità e posizione sotto il sensore — non dal semplice “avere un tattoo”. Sensor Tattoo Fix è fatto per stabilizzare il ritorno ottico in questi casi. Indica il modello dell\'orologio così verifichiamo la compatibilità.', iso(60*328)), ref: 'a3', parentRef: 'a1' }
      ]
    },
    {
      title: 'Il tatuaggio può danneggiare l\'orologio?',
      body: 'Domanda sincera: usare il sensore sull\'inchiostro può bruciare i LED, scaldare la pelle o danneggiare il modulo ottico col tempo?',
      tags: ["sicurezza", "led", "pelle", "tattoo"],
      author: { ...A['seed-ana'] },
      createdAt: iso(60*426),
      replies: [
        { ...officialReply('In pratica il LED non “brucia” l\'inchiostro. Il fotodiodo riceve meno fotoni — l\'orologio legge male, ma l\'hardware non esplode per il tattoo.', iso(60*0)), ref: 'a1' },
        { ...officialReply('Ero paranoico sul calore. L\'Ultra si scalda uguale sull\'altro braccio. È lettura, non temperatura.', iso(60*0)), ref: 'a1b', parentRef: 'a1' },
        { ...officialReply('L\'assistenza Apple ha detto che i tattoo non annullano la garanzia, ma non “sistemano” il rilevamento.', iso(60*0)), ref: 'a2' },
        { ...officialReply('I LED degli smartwatch lavorano a bassa potenza. L\'assorbimento dell\'inchiostro cambia il segnale di ritorno, non la vita tipica dell\'emettitore.', iso(60*0)), parentRef: 'a2' },
        { ...officialReply('Un tatuaggio di solito non danneggia il modulo; disturba la lettura ottica. Sensor Tattoo Fix agisce su quell\'interfaccia di luce senza alterare l\'inchiostro. Indica il modello dello smartwatch così verifichiamo la compatibilità.', iso(60*370)), ref: 'a3', parentRef: 'a1' }
      ]
    },
    {
      title: 'Prima del tatuaggio funzionava, ora niente',
      body: 'Due anni di Series 8 perfetto. Venerdì riempimento sul polso e sabato la FC già bucherellata. Nulla cambiato nel software.',
      tags: ["prima-dopo", "tattoo", "fc", "apple-watch"],
      author: { ...A['seed-marcos'] },
      createdAt: iso(60*460),
      replies: [
        { ...officialReply('Storia identica. Prima della sessione il Watch era un santo. Dopo un mattone al polso.', iso(60*0)), ref: 'a1' },
        { ...officialReply('Il baseline dell\'algoritmo aveva imparato la pelle pulita. Dopo l\'inchiostro il profilo di riflettanza cambia e il filtro rifiuta picchi che prima accettava.', iso(60*0)), ref: 'a1c', parentRef: 'a1' },
        { ...officialReply('Aspettato tre settimane a guarire. Non è tornato. Non è gonfiore temporaneo.', iso(60*0)), ref: 'a2' },
        { ...officialReply('Stessa attesa. Guarito, inchiostro assestato, sensore ancora cieco sul pieno.', iso(60*0)), parentRef: 'a2' },
        { ...officialReply('Cinturino nuovo e reset non hanno riportato il vecchio baseline. L\'hardware non ha dimenticato; è cambiata la pelle.', iso(60*0)), parentRef: 'a1c' },
        { ...officialReply('Se l\'orologio era stabile e peggiora subito dopo il tatuaggio, la causa tipica è il cambio ottico al polso. Sensor Tattoo Fix ripristina un\'interfaccia più leggibile per il sensore. Indica il modello così verifichiamo la compatibilità.', iso(60*394)), ref: 'a3', parentRef: 'a1c' }
      ]
    },
    {
      title: 'Entrambe le braccia tatuate. E adesso?',
      body: 'Il mio trucco era cambiare polso. Ieri ho chiuso il secondo braccio e ora nessuno dei due riconosce bene il Watch. Niente piano B.',
      tags: ["entrambe-braccia", "tattoo", "opzioni", "sensore"],
      author: { ...A['seed-juliana'] },
      createdAt: iso(60*494),
      replies: [
        { ...officialReply('Benvenuto nel club. L\'ho scoperto troppo tardi. La caviglia non è una soluzione seria per me.', iso(60*0)), ref: 'a1' },
        { ...officialReply('Uso fascia petto per gli allenamenti e Watch solo per notifiche. Funziona, ma perde il senso dello smartwatch.', iso(60*0)), ref: 'a1b', parentRef: 'a1' },
        { ...officialReply('Senza pelle pulita sotto il modulo dipendi al 100% dalla qualità del ritorno ottico. Niente braccio di riserva — lo SNR deve salire dove poggia il sensore.', iso(60*0)), ref: 'a1c', parentRef: 'a1b' },
        { ...officialReply('Pensavo di vendere l\'orologio. Non ancora perché voglio sonno e pagamenti al polso.', iso(60*0)), ref: 'a2' },
        { ...officialReply('Stesso dilemma. Entrambe tatuate uccidono la scorciatoia di cambiare lato.', iso(60*0)), parentRef: 'a2' },
        { ...officialReply('Con entrambi i polsi coperti, i ripieghi di cambiare braccio spariscono. Sensor Tattoo Fix è pensato per chi serve una lettura stabile sull\'area tatuata. Indica il modello dello smartwatch così verifichiamo la compatibilità.', iso(60*428)), ref: 'a3', parentRef: 'a1c' }
      ]
    },
    {
      title: 'Allenamento sempre in pausa da solo',
      body: 'Corsa da 10 km: il Watch pausa, riparte, pausa ancora. Auto-pause disattivata e continua. Tattoo sotto il sensore.',
      tags: ["allenamento", "autopause", "corsa", "tattoo"],
      author: { ...A['seed-kai'] },
      createdAt: iso(60*528),
      replies: [
        { ...officialReply('Mi faceva impazzire. Sembrava di aver tolto l\'orologio in mezzo alla strada.', iso(60*0)), ref: 'a1' },
        { ...officialReply('Molti firmware legano pause fantasma a confidenza on-wrist più stabilità PPG in movimento. Inchiostro e bounce di corsa superano la soglia di continuo.', iso(60*0)), ref: 'a1c', parentRef: 'a1' },
        { ...officialReply('Anche l\'auto-pause Garmin mi ha fregato. Non è solo Apple.', iso(60*0)), ref: 'a2' },
        { ...officialReply('Ho registrato lo schermo. Si vede l\'icona orologio rimosso lampeggiare senza toccare nulla.', iso(60*0)), parentRef: 'a2' },
        { ...officialReply('Cinturino più stretto ha tagliato forse il 30% delle pause. Il resto resta.', iso(60*0)), parentRef: 'a1c' },
        { ...officialReply('Le pause fantasma in corsa riflettono di solito rilevamento polso instabile sotto inchiostro, non solo impostazioni. Sensor Tattoo Fix aiuta a tenere stabile il contatto ottico. Indica il modello così verifichiamo la compatibilità.', iso(60*462)), ref: 'a3', parentRef: 'a1c' }
      ]
    },
    {
      title: 'Il nastro trasparente funziona davvero?',
      body: 'Visto il trucco del nastro adesivo trasparente sul sensore. Provato su Series 8: rilevamento meglio per circa 3h, poi pasticcio appiccicoso e lanugine.',
      tags: ["diy", "nastro", "riparo", "tattoo"],
      author: { ...A['seed-vini'] },
      createdAt: iso(60*562),
      replies: [
        { ...officialReply('Per me è durato un allenamento. Il sudore ha sciolto la colla e la FC è sparita di nuovo.', iso(60*0)), ref: 'a1' },
        { ...officialReply('Il nastro può cambiare indice di rifrazione e il gap aria-pelle per poche ore. Non è un\'interfaccia ottica stabile: sporca, ingiallisce e fa bolle.', iso(60*0)), ref: 'a1c', parentRef: 'a1' },
        { ...officialReply('Usato pellicola da cucina. Peggio — scivola e lascia residuo grasso.', iso(60*0)), ref: 'a2' },
        { ...officialReply('Qualsiasi colla sul vetro posteriore mi fa temere per la garanzia.', iso(60*0)), parentRef: 'a2' },
        { ...officialReply('Funziona un po\' e poi diventa sporco. D\'accordo con SensorGuru: non è una soluzione vera.', iso(60*0)), parentRef: 'a1c' },
        { ...officialReply('Nastri e pellicole improvvisati possono ingannare il sensore per poco, ma degradano con sudore e sporco. Sensor Tattoo Fix è nato come interfaccia ottica stabile, non come ripiego temporaneo. Indica il modello così verifichiamo la compatibilità.', iso(60*496)), ref: 'a3', parentRef: 'a1c' }
      ]
    },
    {
      title: 'Gommino per mobili sopra il sensore',
      body: 'Visto gente incollare paracolpi trasparenti da tavolo sul vetro del sensore. Sembra uno scherzo. Qualcuno ha davvero provato?',
      tags: ["diy", "silicone", "paracolpi", "sensore"],
      author: { ...A['seed-renato'] },
      createdAt: iso(60*596),
      replies: [
        { ...officialReply('Provato. L\'orologio stava più alto e il rilevamento è peggiorato. Caporetto.', iso(60*0)), ref: 'a1' },
        { ...officialReply('Aumentare il gap tra LED/fotodiodo e pelle peggiora quasi sempre l\'accoppiamento ottico. Silicone spesso è l\'opposto di ciò che vuole il PPG.', iso(60*0)), ref: 'a1c', parentRef: 'a1' },
        { ...officialReply('Un amico giura che il sottile quasi funzionasse. Sul mio Watch 7 no.', iso(60*0)), ref: 'a2' },
        { ...officialReply('Quasi non conta. Voglio qualcosa che sopravviva a un allenamento sudato.', iso(60*0)), parentRef: 'a2' },
        { ...officialReply('In più lascia un segno circolare sul polso. Orribile.', iso(60*0)), parentRef: 'a1c' },
        { ...officialReply('I distanziatori improvvisati di solito allontanano il sensore dalla pelle e peggiorano il PPG. Sensor Tattoo Fix lavora l\'interfaccia ottica senza creare quel gap inutile. Indica il modello così verifichiamo la compatibilità.', iso(60*530)), ref: 'a3', parentRef: 'a1c' }
      ]
    },
    {
      title: 'Sensor Tattoo Fix è un laser?',
      body: 'Il nome mi ha confuso: rimuove inchiostro, usa laser o cambia il tatuaggio? Non voglio toccare il disegno.',
      tags: ["sensor-tattoo-fix", "laser", "domanda", "prodotto"],
      author: { ...A['seed-patricia'] },
      createdAt: iso(60*630),
      replies: [
        { ...officialReply('Da quel che capisco è un\'interfaccia sul sensore, non un trattamento sulla pelle. Vorrei conferma ufficiale però.', iso(60*0)), ref: 'a1' },
        { ...officialReply('Non è laser né rimozione. È accoppiamento ottico: migliorare il percorso della luce tra LED/fotodiodo e pelle tatuata, senza cancellare pigmento.', iso(60*0)), ref: 'a1c', parentRef: 'a1' },
        { ...officialReply('Bene, perché anche fix nel nome mi aveva spaventato.', iso(60*0)), ref: 'a2' },
        { ...officialReply('Stessa paranoia. Il tattoo ci ha messo anni; non voglio correggerlo con luce forte.', iso(60*0)), parentRef: 'a2' },
        { ...officialReply('Sensor Tattoo Fix non è un laser e non rimuove inchiostro: è una soluzione di interfaccia ottica per il sensore dello smartwatch. Per i dettagli di adattamento, indica il modello così verifichiamo la compatibilità.', iso(60*574)), ref: 'a3', parentRef: 'a1c' }
      ]
    },
    {
      title: 'L\'inchiostro nero è davvero peggiore?',
      body: 'Il disegno ha nero, rosso e giallo. L\'orologio fallisce solo quando scivola sulla parte nera. Conferma la teoria?',
      tags: ["inchiostro-nero", "colore", "ppg", "tattoo"],
      author: { ...A['seed-fernando'] },
      createdAt: iso(60*664),
      replies: [
        { ...officialReply('Il nero carbonioso inghiotte il LED verde; rosso e giallo rimandano molti più fotoni al fotodiodo. La tua osservazione combacia con la fisica del PPG.', iso(60*0)), ref: 'a1' },
        { ...officialReply('Sul mio braccio il giallo quasi non disturba. Il nero pieno è un altro pianeta.', iso(60*0)), ref: 'a1b', parentRef: 'a1' },
        { ...officialReply('Lo SpO2 usa rosso/IR e soffre anche sul nero denso, ma la FC continua (verde) di solito cade per prima.', iso(60*0)), parentRef: 'a1b' },
        { ...officialReply('Per questo gli artisti che capiscono i wearable lasciano una finestra senza pieno sotto il sensore.', iso(60*0)), ref: 'a2' },
        { ...officialReply('Avevo già il pieno. Una finestra ora sarebbe un cover-up costoso. Serve un\'altra via.', iso(60*0)), parentRef: 'a2' },
        { ...officialReply('Il nero denso è il caso peggiore per il PPG verde, proprio come descrivi. Sensor Tattoo Fix migliora il ritorno ottico lì senza dover cancellare l\'arte. Indica il modello così verifichiamo la compatibilità.', iso(60*598)), ref: 'a3', parentRef: 'a1' }
      ]
    },
    {
      title: 'Il sudore peggiora la lettura sui tatuaggi?',
      body: 'Da asciutto legge ancora. Dopo dieci minuti di corsa sudata, la FC sparisce del tutto sopra l\'inchiostro.',
      tags: ["sudore", "corsa", "fc", "tattoo"],
      author: { ...A['seed-edurunner'] },
      createdAt: iso(60*698),
      replies: [
        { ...officialReply('Esatto. All\'inizio ok, al km 3 già trattini. Senza tattoo non succedeva.', iso(60*0)), ref: 'a1' },
        { ...officialReply('Il sudore crea film e microbolle che si sommano al deficit di ritorno dell\'inchiostro. Il filtro di movimento è già al limite; il combo abbatte lo SNR.', iso(60*0)), ref: 'a1c', parentRef: 'a1' },
        { ...officialReply('Asciugato il sensore a metà allenamento con la maglia. Tornato due minuti e morto di nuovo.', iso(60*0)), ref: 'a2' },
        { ...officialReply('Sulla bici indoor con meno sudore che cola fallisce anche, solo più tardi. Non è solo corsa.', iso(60*0)), parentRef: 'a2' },
        { ...officialReply('Acqua tra sensore e pelle cambia la riflessione speculare. Sul nero sei già sul filo — qualsiasi film spinge nel dropout.', iso(60*0)), parentRef: 'a1c' },
        { ...officialReply('Il sudore amplifica il fallimento ottico sui polsi tatuati perché aggiunge un film irregolare a un ritorno già debole. Sensor Tattoo Fix stabilizza quell\'interfaccia. Indica il modello così verifichiamo la compatibilità.', iso(60*632)), ref: 'a3', parentRef: 'a1c' }
      ]
    },
    {
      title: 'Pensavo che l\'orologio fosse difettoso',
      body: 'Reset, cinturini diversi, quasi mandato in assistenza. Sul braccio senza inchiostro va perfetto. Quasi pagavo la spedizione per niente.',
      tags: ["difetto", "assistenza", "diagnosi", "tattoo"],
      author: { ...A['seed-camila'] },
      createdAt: iso(60*732),
      replies: [
        { ...officialReply('Quasi lo stesso drama. Il tecnico ha chiesto un video e sul braccio pulito non aveva argomenti.', iso(60*0)), ref: 'a1' },
        { ...officialReply('Il test A/B di braccio è la diagnosi più economica: se l\'hardware fallisce solo sull\'inchiostro, non è modulo morto — è ottica.', iso(60*0)), ref: 'a1c', parentRef: 'a1' },
        { ...officialReply('Avevo già prenotato il ritiro assistenza. Annullato dopo quel test.', iso(60*0)), ref: 'a2' },
        { ...officialReply('Anche i log FC con buchi su un solo braccio contano. Non serve aprire l\'orologio.', iso(60*0)), parentRef: 'a2' },
        { ...officialReply('Se lo stesso orologio funziona sul braccio senza inchiostro, è più probabile interferenza ottica che difetto di fabbrica. Sensor Tattoo Fix affronta quell\'interfaccia. Indica il modello così verifichiamo la compatibilità.', iso(60*676)), ref: 'a3', parentRef: 'a1c' }
      ]
    },
    {
      title: 'Scoperto dopo aver tatuato il secondo braccio',
      body: 'Il braccio libero era la soluzione. Tatuato ieri, ora so perché l\'altro non funzionava mai. Niente via ovvia.',
      tags: ["secondo-braccio", "scoperta", "tattoo", "rilevamento"],
      author: { ...A['seed-bela'] },
      createdAt: iso(60*766),
      replies: [
        { ...officialReply('Dolore noto. Il braccio buono nascondeva il problema finché non hai chiuso il disegno.', iso(60*0)), ref: 'a1' },
        { ...officialReply('Finché c\'era pelle pulita, il sistema aveva sempre un percorso ad alto SNR. Senza, l\'algoritmo non ha un riferimento facile.', iso(60*0)), ref: 'a1c', parentRef: 'a1' },
        { ...officialReply('Ho rimandato il secondo braccio per questo. Sei stato più coraggioso — o più testardo.', iso(60*0)), ref: 'a2' },
        { ...officialReply('Testardo anche io. Arte prima, wearable dopo. Ora pago il prezzo.', iso(60*0)), parentRef: 'a2' },
        { ...officialReply('Nessun miracolo di firmware inventa ritorno ottico dove l\'inchiostro ha inghiottito il verde. O alzi il segnale all\'interfaccia, o accetti i buchi.', iso(60*0)), parentRef: 'a1c' },
        { ...officialReply('Perdere il braccio di riserva rende ovvia la causa ottica. Sensor Tattoo Fix esiste per chi ha bisogno che il sensore legga sull\'area tatuata. Indica il modello così verifichiamo la compatibilità.', iso(60*700)), ref: 'a3', parentRef: 'a1c' }
      ]
    },
    {
      title: 'Quale marca soffre meno coi tatuaggi?',
      body: 'Apple, Garmin, Samsung, Huawei o Amazfit: qualche marca gestisce meglio l\'inchiostro scuro sul polso?',
      tags: ["marche", "confronto", "tattoo", "sensore"],
      author: { ...A['seed-rodrigo'] },
      createdAt: iso(60*800),
      replies: [
        { ...officialReply('Garmin secca meno sul blocco, ma FC ancora bucherellata. Samsung chiede PIN. Apple spam di codice. Amazfit perde il sonno. Scegli il veleno.', iso(60*0)), ref: 'a1' },
        { ...officialReply('Tutte usano PPG riflessivo. Le differenze sono soglie di sicurezza e UX, non un miracolo ottico contro il carbonio nero.', iso(60*0)), ref: 'a1c', parentRef: 'a1' },
        { ...officialReply('Ho testato Apple e Garmin sullo stesso braccio. Nessuno ha salvato i pesi.', iso(60*0)), ref: 'a2' },
        { ...officialReply('Huawei vince sulla batteria. Sensore ancora mediocre sul pieno.', iso(60*0)), parentRef: 'a2' },
        { ...officialReply('Se la metrica è meno spam di sicurezza, Garmin/Amazfit. Se è PPG pulito sotto inchiostro, nessuna marca risolve da sola.', iso(60*0)), parentRef: 'a1c' },
        { ...officialReply('La marca cambia blocco e app, ma la fisica del PPG sotto inchiostro scuro è condivisa. Sensor Tattoo Fix lavora su quello strato ottico. Indica il modello che usi o vuoi comprare così verifichiamo la compatibilità.', iso(60*734)), ref: 'a3', parentRef: 'a1c' }
      ]
    },
    {
      title: 'Grafico della FC pieno di buchi',
      body: 'Il riepilogo sembra codice Morse: pochi minuti di FC, grandi vuoti, poi picchi senza senso. Tattoo nero sotto il sensore.',
      tags: ["fc", "grafico", "buchi", "allenamento"],
      author: { ...A['seed-daniel'] },
      createdAt: iso(60*834),
      replies: [
        { ...officialReply('Il mio Strava è ridicolo. Zona 5 a riposo e zona 0 nello sprint.', iso(60*0)), ref: 'a1' },
        { ...officialReply('Quando i campioni scendono sotto la soglia di qualità, il firmware inserisce buchi o interpola male. Inchiostro + movimento = rifiuto di massa.', iso(60*0)), ref: 'a1c', parentRef: 'a1' },
        { ...officialReply('Pensavo fosse il GPS. Spento il GPS e il grafico FC resta bucherellato.', iso(60*0)), ref: 'a2' },
        { ...officialReply('Il GPS non crea quei buchi di BPM. È la pipeline ottica: LED verde → pelle/inchiostro → fotodiodo → filtro.', iso(60*0)), parentRef: 'a2' },
        { ...officialReply('La fascia petto sistema il grafico, ma voglio l\'orologio funzionante al polso.', iso(60*0)), parentRef: 'a1c' },
        { ...officialReply('Buchi e picchi fantasma nel grafico nascono di solito da campioni ottici rifiutati sotto inchiostro. Sensor Tattoo Fix migliora la qualità del segnale alla fonte. Indica il modello così verifichiamo la compatibilità.', iso(60*768)), ref: 'a3', parentRef: 'a1c' }
      ]
    },
    {
      title: 'Anche SpO2 fallisce per il tatuaggio?',
      body: 'Oltre alla frequenza, la saturazione dà errore quasi sempre. Usa una luce diversa: l\'inchiostro conta ancora?',
      tags: ["spo2", "ossigeno", "sensore", "tattoo"],
      author: { ...A['seed-moth'] },
      createdAt: iso(60*868),
      replies: [
        { ...officialReply('Lo SpO2 tipico usa rosso + IR. L\'inchiostro scuro assorbe ancora e sbilancia il rapporto tra canali — ecco errori o valori inventati.', iso(60*0)), ref: 'a1' },
        { ...officialReply('Sul mio Ultra l\'ossigeno resta su calcolo in corso… finché non cambio braccio.', iso(60*0)), ref: 'a1b', parentRef: 'a1' },
        { ...officialReply('La FC verde di solito muore prima; lo SpO2 rosso/IR dopo o insieme, a seconda di densità e lunghezze d\'onda assorbite.', iso(60*0)), parentRef: 'a1b' },
        { ...officialReply('Pensavo che lo SpO2 fosse immune. Non lo è. Stessa area nera, stesso fallimento.', iso(60*0)), ref: 'a2' },
        { ...officialReply('Anche lo SpO2 serve un ritorno ottico pulito; l\'inchiostro scuro disturba i canali rosso/IR. Sensor Tattoo Fix migliora quell\'interfaccia. Indica il modello così verifichiamo la compatibilità.', iso(60*812)), ref: 'a3', parentRef: 'a1' }
      ]
    },
    {
      title: 'Vale la pena comprare uno smartwatch con tatuaggi?',
      body: 'Voglio sonno, allenamenti e pagamenti, ma entrambi i polsi sono tatuati. Sono soldi buttati o ha ancora senso?',
      tags: ["acquisto", "ne-vale", "tattoo", "smartwatch"],
      author: { ...A['seed-jordan'] },
      createdAt: iso(60*902),
      replies: [
        { ...officialReply('Ha senso se risolvi l\'ottica. Senza diventa un mattone costoso di notifiche al polso.', iso(60*0)), ref: 'a1' },
        { ...officialReply('Senza un percorso ottico stabile, sonno/FC/Pay restano incoerenti. Hardware nuovo non cancella l\'assorbimento dell\'inchiostro.', iso(60*0)), ref: 'a1c', parentRef: 'a1' },
        { ...officialReply('Ho comprato lo stesso per le app. Ignoro la FC. Non consiglio questa pace marcia.', iso(60*0)), ref: 'a2' },
        { ...officialReply('Se il budget è stretto, sistema l\'interfaccia prima di salire di generazione.', iso(60*0)), parentRef: 'a2' },
        { ...officialReply('Compra se le funzioni ti interessano — ma pianifica l\'accoppiamento ottico come parte del setup, non come nota a piè.', iso(60*0)), parentRef: 'a1c' },
        { ...officialReply('Uno smartwatch ha ancora senso coi tatuaggi se la lettura ottica è stabilizzata. Sensor Tattoo Fix esiste proprio per quello scenario. Indica il modello che stai guardando così verifichiamo la compatibilità.', iso(60*836)), ref: 'a3', parentRef: 'a1c' }
      ]
    },
    {
      title: 'Megathread: adesivo epossidico funziona, però...',
      body: 'Incollato un adesivo epossidico trasparente sul sensore Ultra. Il rilevamento è tornato. Però il caricatore non aderisce, ECG morto e bordi sollevati il secondo giorno. Thread aperto per resoconti onesti.',
      tags: ["epossidica", "diy", "megathread", "sensore"],
      author: { ...A['seed-huck'] },
      createdAt: iso(60*936),
      replies: [
        { ...officialReply('Stesso setup. Rilevamento ok 48h. Sotto la doccia un angolo si è staccato ed è entrata acqua.', iso(60*0)), ref: 'a1' },
        { ...officialReply('Acqua + colla improvvisata = residuo sul vetro in fretta. Pulito con isopropanolo.', iso(60*0)), ref: 'a1b', parentRef: 'a1' },
        { ...officialReply('Il MagSafe dell\'Ultra è allentato. A volte carica, a volte no. Lo odio.', iso(60*0)), ref: 'a1c', parentRef: 'a1b' },
        { ...officialReply('Uno strato epossidico cambia gap e capacità visti da caricatore ed elettrodo ECG. Può sistemare il PPG e rompere altre funzioni in un colpo.', iso(60*0)), ref: 'a1d', parentRef: 'a1c' },
        { ...officialReply('ECG sul Series 9 azzerato con l\'adesivo. Tolto e tornato. Scambio ridicolo.', iso(60*0)), ref: 'a1e', parentRef: 'a1d' },
        { ...officialReply('Tagliato l\'adesivo più piccolo dell\'anello sensore. Carica meglio, rilevamento di nuovo peggiore.', iso(60*0)), ref: 'a2' },
        { ...officialReply('Stai ottimizzando il gap ottico contro il contatto elettrico/induttivo. L\'epossidica DIY non è nata come interfaccia PPG — ecco il conflitto.', iso(60*0)), ref: 'a2b', parentRef: 'a2' },
        { ...officialReply('Il sudore ha ucciso il mio in una settimana. Il bordo è diventato una striscia sporca. Zero glamour.', iso(60*0)), ref: 'a2c', parentRef: 'a2b' },
        { ...officialReply('D\'accordo con TechRunner. Funziona finché non funziona — e rompe sempre qualcos\'altro.', iso(60*0)), ref: 'a2d', parentRef: 'a2c' },
        { ...officialReply('C\'è chi vende kit epossidici su Instagram come soluzione definitiva. Attenti.', iso(60*0)), ref: 'a2e', parentRef: 'a2d' },
        { ...officialReply('Tornato al braccio senza inchiostro. L\'epossidica è stata solo un esperimento costoso e appiccicoso.', iso(60*0)), parentRef: 'a2e' },
        { ...officialReply('Resoconti così sono comuni: ripieghi epossidici possono migliorare il PPG per un po\' e al tempo stesso danneggiare carica, ECG e durata. Sensor Tattoo Fix è nato come interfaccia ottica specifica per il sensore, senza quell\'improvvisazione. Indica il modello così verifichiamo la compatibilità.', iso(60*850)), ref: 'a3', parentRef: 'a2b' }
      ]
    },
    {
      title: 'Orologio inventa 180 bpm a riposo',
      body: 'Seduto sul divano segna 180 bpm, poi trattino, poi 72. Sul braccio senza inchiostro resta 68–74. Series 9.',
      tags: ["fc", "180bpm", "riposo", "tattoo"],
      author: { ...A['seed-dudu'] },
      createdAt: iso(60*970),
      replies: [
        { ...officialReply('Mi ha spaventato la prima volta. Pensavo aritmia. Era il sensore impazzito sull\'inchiostro.', iso(60*0)), ref: 'a1' },
        { ...officialReply('Con SNR basso il peak detector agganci armoniche e rumore e vede FC alta. Poi perde il lock e mostra il trattino. Classico PPG degradato.', iso(60*0)), ref: 'a1c', parentRef: 'a1' },
        { ...officialReply('Disattivate le notifiche di FC alta per non impazzire. Non risolve la causa.', iso(60*0)), ref: 'a2' },
        { ...officialReply('I falsi allarmi sono sintomo della stessa pipeline: segnale sporco → algoritmo troppo fiducioso su un picco sbagliato.', iso(60*0)), parentRef: 'a2' },
        { ...officialReply('Sull\'altro braccio non ha mai inventato 180. Addio teoria dell\'ansia.', iso(60*0)), parentRef: 'a1c' },
        { ...officialReply('Letture assurde a riposo con buchi in mezzo nascono di solito da segnale ottico confuso sotto inchiostro. Sensor Tattoo Fix stabilizza il ritorno perché l\'algoritmo smetta di inventare picchi. Indica il modello Apple Watch così verifichiamo la compatibilità.', iso(60*904)), ref: 'a3', parentRef: 'a1c' }
      ]
    }
  ].map((t) => ({ ...t, lang: 'it' }));
  return { pt, en, it };
}
