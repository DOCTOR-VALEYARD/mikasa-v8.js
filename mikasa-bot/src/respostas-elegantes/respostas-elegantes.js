// src/respostas-elegantes.js - MENSAGENS AUTOMÁTICAS ELEGANTES E DECORADAS

const config = require("../../config");

const mensagensAutomaticas = {
    // 🎉 BEM-VINDO (Variações)
    bemvindo: [
        `╭୨୧─────────────୨୧╮
      ✨ NOVO MEMBRO ✨
╰୨୧─────────────୨୧╯

👑 Bem-vindo ao nosso grupo!
🌸 Você chegou com estilo
💖 Que sua jornada seja incrível
✨ Prepare-se para o melhor!

୨୧ ─────────────── ୨୧
🎯 ACESSO • LIBERADO
⚡ STATUS • ELITE
🌟 REPUTAÇÃO • BRILHANTE
୨୧ ─────────────── ୨୧`,

        `╭୨୧─────────────୨୧╮
      🌺 BEM-VINDO! 🌺
╰୨୧─────────────୨୧╯

💎 Elegância para encantar
🦋 Inteligência para dominar
✨ Você agora faz parte de nós

୨୧ ─────────────── ୨୧
🔐 ACESSO • LIBERADO
💻 SISTEMA • ONLINE
🛡️ PROTEÇÃO • ATIVA
୨୧ ─────────────── ୨୧`,

        `╭୨୧─────────────୨୧╮
      🌸 ENTRADA GLORIOSA 🌸
╰୨୧─────────────୨୧╯

👤 Um novo integrante!
🌟 Brilho a mais no grupo
💫 Vamos juntos para o topo!

୨୧ ─────────────── ୨୧
⚡ ENERGIZADO • SIM
🎯 OBJETIVO • CLARO
✨ SUCESSO • GARANTIDO
୨୧ ─────────────── ୨୧`,

        `╭୨୧─────────────୨୧╮
      💖 SEJA BEM-VINDO 💖
╰୨୧─────────────୨୧╯

🌷 Mais uma joia em nossa coroa
🎀 Qualidade é o que nos define
✨ Você chegou no lugar certo!

୨୧ ─────────────── ୨୧
🔥 VIBE • PERFEITA
💯 QUALIDADE • MÁXIMA
👑 STATUS • PREMIUM
୨୧ ─────────────── ୨୧`
    ],

    // 👋 DESPEDIDA (Variações)
    despedida: [
        `╭୨୧─────────────୨୧╮
      🥀 ADEUS 🥀
╰୨୧─────────────୨୧╯

💔 Partiu...
🌙 Que volte com mais força
✨ Até logo, querido!

୨୧ ─────────────── ୨୧
😔 SAUDADES • GARANTIDAS
🌟 RECORDAÇÕES • ETERNAS
💫 RETORNO • ESPERADO
୨୧ ─────────────── ୨୧`,

        `╭୨୧─────────────୨୧╮
      🌸 PARTIDA ELEGANTE 🌸
╰୨୧─────────────୨୧╯

👋 Se foi...
💎 Deixou brilho por aqui
🦋 Que o sucesso acompanhe!

୨୧ ─────────────── ୨୧
🌙 NOITE • TRANQUILA
💫 LEMBRANÇA • ETERNA
🔮 DESTINO • GLORIOSO
୨୧ ─────────────── ୨୧`,

        `╭୨୧─────────────୨୧╮
      ✨ TCHAU, LINDO/A ✨
╰୨୧─────────────୨୧╯

👤 Partiu para outras jornadas
🌟 Que volte quando quiser
💖 Seu lugar sempre estará aqui!

୨୧ ─────────────── ୨୧
🚀 RUMO • AO SUCESSO
🎯 OBJETIVO • ALCANÇADO
✨ HISTÓRIA • CONTINUADA
୨୧ ─────────────── ୨୧`
    ],

    // 🚀 PROMOÇÃO (Variações)
    promocao: [
        `╭୨୧─────────────୨୧╮
      👑 COROAÇÃO 👑
╰୨୧─────────────୨୧╯

🎉 Promovido(a) a ADMIN!
✨ Dignidade conquistada
💎 Responsabilidade assumida

୨୧ ─────────────── ୨୧
⚡ PODER • ATIVADO
🔐 ACESSO • TOTAL
👑 AUTORIDADE • CONFIRMADA
୨୧ ─────────────── ୨୧`,

        `╭୨୧─────────────୨୧╮
      🌟 ELEVAÇÃO GLORIOSA 🌟
╰୨୧─────────────୨୧╯

👤 Novo administrador(a)!
🏆 Mérito reconhecido
✨ Poder nas mãos certas!

୨୧ ─────────────── ୨୧
💪 FORÇA • MÁXIMA
🎖️ CARGO • HONRADO
🔥 LIDERANÇA • CONFIRMADA
୨୧ ─────────────── ୨୧`
    ],

    // 💔 REBAIXAMENTO (Variações)
    rebaixamento: [
        `╭୨୧─────────────୨୧╮
      😔 PERDA DE CARGO 😔
╰୨୧─────────────୨୧╯

📉 Removido(a) do cargo
💭 Tempo de reflexão
✨ Oportunidade de volta existe!

୨୧ ─────────────── ୨୧
⚠️ AVISO • REGISTRADO
🔄 CHANCE • DISPONÍVEL
🌙 AMADURECIMENTO • PENDENTE
୨୧ ─────────────── ୨୧`,

        `╭୨୧─────────────୨୧╮
      ⚠️ MUDANÇA DE STATUS ⚠️
╰୨୧─────────────୨୧╯

👤 Deixou de ser admin
💔 Mas há caminhos para voltar
🌟 Tudo pode mudar de novo!

୨୧ ─────────────── ୨୧
⏳ TEMPO • PARA PENSAR
🔮 FUTURO • ABERTO
💫 REDENÇÃO • POSSÍVEL
୨୧ ─────────────── ୨୧`
    ],

    // ⚠️ ADVERTÊNCIA (Variações)
    advertencia: [
        `╭୨୧─────────────୨୧╮
      ⚠️ ATENÇÃO ⚠️
╰୨୧─────────────୨୧╯

🔔 Aviso oficial registrado
💭 Reflita sobre suas ações
🌟 Há tempo para consertar!

୨୧ ─────────────── ୨୧
📋 REGISTRO • ATIVO
⏰ PRAZO • PARA MELHORAR
🔥 RESGATE • POSSÍVEL
୨୧ ─────────────── ୨୧`,

        `╭୨୧─────────────୨୧╮
      🔔 AVISO FORMAL 🔔
╰୨୧─────────────୨୧╯

📌 Comunicado importante
💡 Mude seu comportamento
✨ Ou haverá consequências!

୨୧ ─────────────── ୨୧
⚠️ SERIEDADE • MÁXIMA
🎯 MENSAGEM • CLARA
🔴 PRÓXIMA • SERÁ SANÇÃO
୨୧ ─────────────── ୨୧`
    ]
};

// Função para pegar mensagem aleatória
function pegarMensagemAleatoria(tipo) {
    const mensagens = mensagensAutomaticas[tipo];
    if (!mensagens || mensagens.length === 0) return null;
    return mensagens[Math.floor(Math.random() * mensagens.length)];
}

module.exports = {
    mensagensAutomaticas,
    pegarMensagemAleatoria
};
