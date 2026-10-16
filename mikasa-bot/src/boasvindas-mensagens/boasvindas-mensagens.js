/* =================================================
   🎉 MIKASA BOT — MENSAGENS DE ENTRADA E SAÍDA DO GRUPO
   📁 Arquivo: boasvindas-mensagens.js
================================================= */

// 🎉 Chamadas de entrada — chamativas, animadas, dão vontade de participar
const chamadasEntrada = [
    "🎉 SEGURA QUE CHEGOU MAIS UM(A)!",
    "🚀 POUSOU MAIS UM(A) POR AQUI!",
    "✨ OLHA QUEM CHEGOU!",
    "🔥 REFORÇO NOVO NO GRUPO!",
    "💫 ABRAM ALAS, CHEGOU GENTE BOA!",
    "🎊 A FESTA SÓ COMEÇA AGORA!",
    "🥳 MAIS UM PRA ANIMAR ESSA BAGUNÇA!",
    "🌟 UMA ESTRELA ACABOU DE CHEGAR!",
    "🎆 ENTRADA TRIUNFAL NO GRUPO!",
    "💥 EXPLODIU DE ANIMAÇÃO POR AQUI!",
    "🏆 GANHAMOS UM NOVO MEMBRO TOP!",
    "🎯 MAIS UM NA MIRA DA DIVERSÃO!",
    "🎈 SOLTA OS FOGOS, CHEGOU GENTE!",
    "🦄 RARIDADE CHEGANDO NO GRUPO!",
    "👑 REALEZA ACABOU DE ENTRAR!",
    "🌈 O GRUPO FICOU MAIS COLORIDO!",
    "⚡ ENERGIA NOVA NO PEDAÇO!",
    "🎬 E A CENA GANHOU UM NOVO PERSONAGEM!",
    "🍾 BORA COMEMORAR ESSA CHEGADA!",
    "🎁 PRESENTE DO DIA ACABOU DE CHEGAR!",
];

// 🥀 Zoeiras de saída — bem debochadas, no tom de brincadeira
const zoeirasSaida = [
    "😂 @{nome} saiu correndo — deve ter cansado de perder toda hora.",
    "🚪 @{nome} apertou o \"sair\" mais rápido que resposta em prova.",
    "👋 @{nome} foi embora... calma, ninguém vai atrás não.",
    "🥲 @{nome} saiu. Aposto que nem vão sentir falta.",
    "🤡 @{nome} desistiu. Nem chegou a fazer diferença mesmo.",
    "🍃 @{nome} sumiu no vento — típico.",
    "🎭 @{nome} bateu em retirada. Fim de carreira por aqui.",
    "🐌 @{nome} demorou, mas foi embora igual todo mundo já esperava.",
    "🧹 Varreram @{nome} pra fora... ou ele(a) que se varreu, tanto faz.",
    "📉 A audiência caiu: @{nome} saiu do ar.",
    "🎈 @{nome} murchou e saiu de fininho.",
    "🥶 Nem se despediu direito, @{nome} já sumiu.",
    "🚶 @{nome} deu no pé antes que alguém percebesse.",
    "🎬 Corta! @{nome} saiu de cena sem nem reclamar.",
    "🐔 @{nome} fugiu igual galinha assustada.",
    "🧯 Apagaram o @{nome} do grupo — ou ele(a) apagou sozinho(a).",
    "🎯 Alvo abatido: @{nome} não aguentou e saiu.",
    "🥊 Nocaute! @{nome} bateu asas e sumiu do ringue.",
    "🍂 Mais uma folha caiu: @{nome} saiu do grupo.",
    "🛸 @{nome} foi abduzido(a)... ou só cansou e saiu mesmo.",
];

function preencher(texto, nome) {
    return texto.replace(/\{nome\}/g, nome);
}

function gerarChamadaEntrada() {
    return chamadasEntrada[Math.floor(Math.random() * chamadasEntrada.length)];
}

function gerarZoeiraSaida(nome) {
    const escolhida = zoeirasSaida[Math.floor(Math.random() * zoeirasSaida.length)];
    return preencher(escolhida, nome);
}

// ─────────────────────────────────────────────────
// 📐 MONTAGEM ORGANIZADA DAS MENSAGENS
// Todo o texto do bem-vindo e da saída fica aqui, no mesmo visual
// (cabeçalho 『 ✦ 』, informações em citação, rodapé com o bot).
// ─────────────────────────────────────────────────

const LIMITE_REGRAS = 350; // a descrição do grupo pode ser enorme — corta pra não virar um textão

function resumirRegras(texto) {
    let limpo = String(texto || "")
        .replace(/\r/g, "")
        .replace(/[ \t]+\n/g, "\n")
        .replace(/\n{3,}/g, "\n\n")
        .trim();

    if (limpo.length <= LIMITE_REGRAS) return limpo;

    const corte = limpo.slice(0, LIMITE_REGRAS);
    const ultimoEspaco = corte.lastIndexOf(" ");
    const base = ultimoEspaco > LIMITE_REGRAS * 0.6 ? corte.slice(0, ultimoEspaco) : corte;
    return `${base.trimEnd()}…`;
}

function montarMensagemBemVindo({ chamada, nomeUsuario, nomeGrupo, totalMembros, regras, autorAceite, semFoto, nomeBot, nomeDono }) {
    const info = [
        `> 👋 @${nomeUsuario}`,
        `> 🏷️ ${nomeGrupo}`,
        `> 👥 ${totalMembros} membros`
    ];
    if (autorAceite) info.push(`> ✅ Aceito(a) por @${autorAceite}`);

    const partes = [
        `『 ✦ 』BEM-VINDO(A)『 ✦ 』`,
        chamada,
        "",
        info.join("\n"),
        "",
        `📜 *REGRAS*`,
        resumirRegras(regras),
        "",
        `💬 Mande um “OI” para a galera!`
    ];

    if (semFoto) partes.push(`📸 _Sem foto de perfil visível — que tal colocar uma?_`);

    partes.push("", `『 ✦ 』 ${nomeBot} • 👑 ${nomeDono} 『 ✦ 』`);
    return partes.join("\n");
}

function montarMensagemSaida({ zoeira, nomeGrupo, totalMembros, nomeBot, nomeDono }) {
    return [
        `『 ✦ 』SAÍDA REGISTRADA『 ✦ 』`,
        zoeira,
        "",
        `> 🏷️ ${nomeGrupo}`,
        `> 👥 Restam ${totalMembros} membros`,
        "",
        `『 ✦ 』 ${nomeBot} • 👑 ${nomeDono} 『 ✦ 』`
    ].join("\n");
}

module.exports = { gerarChamadaEntrada, gerarZoeiraSaida, montarMensagemBemVindo, montarMensagemSaida };
