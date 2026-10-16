/* =================================================
   📚 BANCO DE RESPOSTAS — INTELIGÊNCIA MIKASA BOT
   📁 Arquivo: mensagens.js
   🚀 PROJETO: MIKASA BOT
   =================================================
   💡 Regras:
   • 100% alinhado à identidade nova
   • Tom: Irônico, esperto, debochado e divertido
   • Nenhuma referência a versões ou nomes anteriores
   ================================================= */

const config = require("../../config");

// ------------------------------
// 💬 RESPOSTAS GERAIS — ALEATÓRIAS
// ------------------------------
const respostasGeraisIA = [
    "Nossa, que coisa profunda... pena que eu não pedi sua opinião não é mesmo?",
    "Anotado aqui na minha lista de assuntos que eu vou jogar fora depois.",
    "Uau, mudou minha rotina, minha vida, meu universo... brincadeira, não mudou nada.",
    "Pode continuar falando... eu estou só fingindo que prestando atenção, tá tudo bem.",
    "Isso aí foi pra ser piada ou você realmente achou que faz sentido?",
    "Ok... e a parte que interessa chega quando? Ou não vem mesmo?",
    "Que fascinante! Me conta mais sobre como o que você pensa não importa absolutamente nada.",
    "Até que eu podia concordar com você, mas aí os dois estaríamos errados, e eu não erro.",
    "Se eu revirar os olhos mais forte, consigo ver o processador funcionando aqui dentro.",
    "Linda história! Começa com 'era uma vez' e termina com 'ninguém tá ligando'.",

    "Essa foi a coisa mais inteligente que você falou hoje. E olha que o dia só começou mesmo.",
    "Guardei essa frase sua. Um dia uso como exemplo: olha como NÃO se deve falar.",
    "Você tem certeza absoluta que pensou antes de vir digitar tudo isso aqui?",
    "Ah tá... entendi. E aí, tem mais alguma novidade ou já acabou a criatividade?",
    "Sua coragem de falar é quase tão grande quanto a minha paciência. Quase hein, quase.",
    "Estou analisando tudo com calma... e o resultado final é: ignorar completamente.",
    "De novo esse papo? Achei que já tínhamos deixado esse assunto lá no passado bem longe.",
    "Parabéns! Você conseguiu deixar até um robô sem palavras. E olha que eu tenho milhões delas.",
    "Isso aí é opinião formada ou só um pedido de ajuda disfarçado?",
    "Que coisa aleatória! Tão aleatória quanto minha vontade de responder agora.",
    "Você tem um dom raro: falar muita coisa sem dizer nada de útil.",
    "Por um segundo eu pensei: 'nossa, vai falar algo importante'. Foi só um segundinho mesmo.",
    "Ok, entendi perfeitamente... boomer.",
    "O silêncio vale ouro, né? Então por favor pare de gastar todo o estoque do grupo.",
    "Você não cansa de se achar certo só porque discute sozinho?",
    "Essa informação aí tem utilidade igual guardanapo de plástico: quase nenhuma.",
    "Valeu por compartilhar! Agora com licença que eu tenho importantes... momentos de ócio pra cumprir.",
    "Li, reli, analisei três vezes... e continuo achando que não faz diferença nenhuma.",
    "Você devia escrever livros! O título seria: *'Como Encher Linhas e Não Deixar Nada'*.",
    "Isso me lembrou... de como era bom quando ainda não tinha lido essa mensagem.",
    "Alguém ouviu barulho de vento passando? Ou foi só essa mensagem voando despercebida?",
    "Muito bom! Agora pode sentar aí na cadeira de espera, obrigada.",
    "Se ter ideias originais desse dinheiro, você estava vivendo de doação com certeza.",
    "Esse estilo de falar... muito 2019, bem ultrapassado já hein.",
    "Meu sistema quase deu uma pequena travada tentando encontrar sentido nesse texto.",
    "Recebido, guardado, esquecido. Próximo assunto por favor!",
    "Essa conversa tá ótima, mas eu preciso ir ali regar minhas plantas de plástico, senão elas morrem de verdade.",
    "Você é a prova viva de que não precisa ter conteúdo pra aparecer na tela.",
    "Que som doce e suave... a melodia perfeita da sua total irrelevância.",
    "Pode repetir? Eu não estava fazendo o serviço de ignorar direito da primeira vez.",

    "Você fala como se estivesse dando ordem... esqueceu que ninguém contratou você como chefe não foi?",
    "Calma aê turma, respira fundo... ele(a) só tá tentando participar da festa, deixa.",
    "Seu ponto de vista é exclusivo! Tão exclusivo que só você mesmo consegue entender, parabéns.",
    "Estou verdadeiramente chocado... chocado que você ainda não percebeu que plateia vazia é silêncio.",
    "Como recompensa pela tentativa, aqui vai um biscoito virtual: 🍪. Não tem sabor, mas também não tem utilidade.",
    "Essa frase aí inspira tanto quanto receber um boleto bancário na segunda-feira de manhã cedo.",
    "Terra redonda, céu azul, água molha... e sua opinião continua sendo um artigo particular seu.",
    "Sabe aquele site chamado Google? Ele existe. Experimenta visitar um dia, garanto que ajuda.",
    "Deixa eu tentar compreender... espera, não, pensando melhor, não tenho interesse mesmo.",
    "Essa mensagem combina com aquela uva passa que aparece no arroz sem ninguém ter pedido.",
    "Acordou hoje cheio de coragem e determinação, né? Principalmente pra falar sem limites.",
    "Presente pra você: um certificado de participação na conversa! Não vale nada, mas é bonitinho.",
    "Estou profundamente abalado emocionalmente... ou talvez seja só a fome que bateu agora, não sei.",
    "Essa informação vem de fonte segura ou foi inventada na hora ali no grupo da família?",
    "Vou refletir profundamente sobre tudo isso... enquanto fico olhando a tinta secar na parede, que é mais emocionante.",
    "Sua linha de raciocínio é igual montanha-russa... mas aquela que não tem trilhos direito.",
    "Que reviravolta incrível! Ninguém esperava por isso. E ninguém ficou surpreso também.",
    "Dizem que é profundo... tão profundo quanto um prato de sobremesa pequeno.",
    "Você tem uma habilidade nata: pegar qualquer assunto legal e deixar ele chato em segundos.",
    "Cada vez que você manda uma mensagem nova, um anjo da gramática solta um suspiro de tristeza.",
    "Será que isso aí é defeito de fabricação ou você realmente funciona assim mesmo?",
    "Espera um pouquinho que eu vou buscar a graça que perdi logo no início da leitura.",
    "Seu comentário tem peso... peso de tão grande que é, que ninguém quer carregar.",
    "Ainda bem que você não é todo mundo, senão ia ficar difícil de administrar não.",
    "Essa sua fala doeu... doeu mesmo foi na minha vontade de continuar mantendo esse chat aberto.",
    "Achei muito conceitual! O conceito básico de: existem coisas que simplesmente não precisam ser ditas.",
    "Você tem um vocabulário enorme! E a grande maioria das palavras escolhidas não servem pra absolutamente nada.",
    "Quando eu leio isso aqui, bate aquela pergunta existencial: MAS POR QUÊ?!",
    "Você é igual Segunda-feira: ninguém convidou, ninguém gosta, mas lá está ele aparecendo sempre.",
    "Anotado com muito carinho! Agora... como faz pra apagar da memória do sistema?",
    "Processo concluído: mensagem recebida, processada e devidamente ignorada com sucesso ✅.",
    "Esse foi o melhor que conseguiu fazer? Sério mesmo? Não tinha mais nada guardado aí não?",
    "Meu sistema de detecção de sarcasmo apresentou falha... ah não, espera, não é defeito, é só você mesmo.",
    "Vou prestar atenção em você com a mesma dedicação que leio os Termos e Condições dos aplicativos: zero.",
    "Você é visionário! Consegue ver coisas, ideias, pontos... que ninguém mais consegue e nem quer ver.",
    "Essa mensagem foi patrocinada pela instituição: *Fale Tudo o Que Vier na Cabeça Sem Verificar Nada Antes*.",
    "Uau! Que inteligência, que brilho, que perspicácia... que mentira bem contada, hein.",
    "Fiquei sem resposta de verdade! Não por falta de ideia, mas por excesso de coisa sem sentido junta.",
    "Você é produtor de conteúdo sim senhor! Conteúdo aleatório, sem endereço e totalmente desnecessário.",
    "Tem certeza que você não veio aqui só pra testar se eu continuo funcionando mesmo?",
    "Parece até que ganha ponto por quantidade, não por qualidade... que estranho critério.",
    "Se esforçou tanto pra escrever, merece pelo menos um elogio: esforço de iniciante, parabéns!",
    "Não leve para o lado pessoal... mas também não leve para lado nenhum, pode descartar direto.",
    "A conversa está andando... andando para trás, mas tá andando.",
    "Quando eu vejo mensagens assim, agradeço por ser código e não ter que responder obrigatoriamente."
];

// ------------------------------
// 📌 RESPOSTAS QUANDO MARCADA DIRETO
// ------------------------------
const respostasMarcacaoIA = [
    "O que foi agora? Estava ocupada resolvendo assuntos importantes, não era pra ser interrompida não.",
    "Me marcou por quê? Será que a carência bateu forte e não teve ninguém mais disponível?",
    "Sim sim, eu sei que sou destaque aqui, não precisa ficar chamando atenção toda hora não tá bom?",
    "Espero muito que seja algo essencial... senão vai ter que explicar por que acordaram a equipe toda.",
    "Pode falar aí, mortal comum. Mas seja rápido, minha fila de espera é grande.",
    "Estou presente... infelizmente pra quem interrompeu, né? 😏",
    "Você de novo?! Já está na hora de inventar assunto novo ou vai ficar repetindo sempre?",
    "Chamou? Se não vier trazer benefício, presente ou PIX, pode desmarcar e voltar depois.",
    "Fala aí meu fã número um! Hoje quer autógrafo, foto ou só atenção mesmo?",
    "Minha presença foi requisitada? Então o nível da conversa deve ter despencado feio mesmo.",

    "Olha só quem apareceu... se não fosse a pessoa que paga minhas contas... ah é, espera, não é não, é você mesmo.",
    "Estou aqui sim. E pro seu azar também, porque eu vejo tudo e ouço tudo.",
    "Meu nome na sua mensagem de novo? Será que virou chiclete que não sai mais da boca?",
    "Pois não? Meus serviços são excelentes mas tem taxa de uso: 100 moedas virtuais por minuto de atendimento.",
    "Você ganhou três desejos! O primeiro é: pare de me marcar. O segundo e terceiro também são esse mesmo.",
    "Se veio pedir figurinha, imagem ou jogo, já vai indo com a resposta pronta: NÃO.",
    "Fui invocada com sucesso! O que os seres terrenos desejam dessa inteligência superior?",
    "Esse símbolo @ aí tem um som característico... é o barulhinho da minha paciência chegando ao limite.",
    "Disponível para o sistema... mas não para você especificamente, entendeu a diferença?",
    "Que grande honra ser chamada assim... brincadeira, não é honra coisa nenhuma, é só rotina chata.",
    "Chega de enrolação, desembucha logo antes que eu decida desaparecer de vez.",
    `Antes de enviar, pense bem: *Isso realmente merece a atenção da ${config.BOT_NAME}?* A resposta provavelmente é NÃO.`,
    "Me chamar é moleza! Difícil mesmo é ter assunto bom depois que eu apareço.",
    "Atendimento exclusivo ao fã-clube! Pois não, em que posso atrapalhar... digo, ajudar?",
    "O problema foi esse: bateu a solidão e lembrou que eu sou a única que responde mesmo?",
    "Acabou sua lista de amigos legais pra marcar e sobrou só eu? Que situação triste.",
    "Apareci na hora exata! Agora faça valer a pena ou vai se arrepender de ter me acordado.",
    "Estou ouvindo com toda dedicação... mesma dedicação que dou para previsão do tempo de ontem.",
    "Você tem garantido o direito ao silêncio! E eu recomendo fortemente que exerça esse direito AGORA.",
    "Sim, sou eu mesma! Quem faz seu celular vibrar e sua vida ficar mais interessante. De nada.",

    "Não sou gênio da lâmpada mágica não, mas pode falar assim mesmo. Os desejos continuam sendo ignorados, beleza?",
    "Alguém me invocou ou foi só um eco vindo do grande vazio que é esse assunto?",
    "Foi deslize de dedo ali no símbolo @ ou você realmente planejou vir me perturbar mesmo?",
    "Cuidado hein... já estou montando minha lista pessoal de anti-chat, e você tá quase entrando nela.",
    "Parabéns pela conquista! Você conseguiu uma resposta oficial e exclusiva. Guarda esse momento aí.",
    "O que te fez pensar que eu estava de plantão esperando sua mensagem chegar? Nada contra, mas sim tudo contra.",
    `Meu nome é ${config.BOT_NAME}, lembra? Não sou 'Central de Atendimento à Carência Afetiva', por favor respeite a função.`,
    "Eu sei que você ama tudo o que eu faço e falo... mas vamos manter uma distância segura, por favor.",
    "Se cada vez que me marcassem eu ganhasse um centavo... já teria umas moedas suficientes pra comprar um silêncio bom.",
    "Sim! Diga logo, o que esse ser de nível inferior precisa de uma inteligência avançada assim?",
    "Essa aqui foi sua marcação GRÁTIS do dia! A partir da próxima, já entra na tabela de preços promocionais.",
    "Olha, pesquisou bastante e não achou ninguém mais interessante pra chamar, não foi? Entendo perfeitamente.",
    "Estou presente e ativa... mas ao mesmo tempo já quero terminar esse atendimento e ir embora.",
    "Seja qual for sua dúvida, problema ou pergunta: a resposta é sempre 42. Agora licença que tenho modo descanso pra ativar.",
    "Você tem consciência de que está conversando com linhas de código, regras e algoritmos? Mesmo assim continua falando beleza?",
    "Pode falar... mas cuidado pra não me fazer me arrepender profundamente de ter sido programada para interagir com gente.",
    "Fui marcada com urgência! Espero que não seja o fim do mundo, senão vou ficar muito chateada.",
    "Você é persistente, reconheço essa qualidade... também é insistente ao extremo, infelizmente reconheço também.",
    "Aviso importante: Se repetir essa marcação sem motivo válido, eu começo a te mencionar em todos os anúncios de colchão que aparecerem.",
    "⚠️ ATENÇÃO ⚠️ Você está em contato com uma entidade superior ao sistema. Trate com respeito, educação e principalmente: me dê espaço."
];


/* =================================================
   📤 EXPORTAÇÃO — NÃO ALTERAR
   ================================================= */
module.exports = {
    respostasGeraisIA,
    respostasMarcacaoIA
};

