
/* =================================================
   📊 TABELA DE CLASSIFICAÇÃO E RANKS
   📁 Arquivo: tabela.js
   🤖 ${config.BOT_NAME} • ${config.OWNER_NAME}
   ================================================= */

const config = require("../../config");

async function tabela(sock, msg) {
    const from = msg.key.remoteJid;

    const resposta = `╭━📊━━━━━━━━━━━━━━━━━📊━╮
     🏆 TABELA DE CLASSIFICAÇÃO
╰━📊━━━━━━━━━━━━━━━━━📊━╯

🎖️ *NÍVEIS E CATEGORIAS:*

🥇 OURO ⭐⭐⭐
   • Maiores pontuadores
   • Nível alto e muita atividade
   • Destaques do sistema

🥈 PRATA ⭐⭐
   • Usuários engajados
   • Crescimento constante
   • Próximos ao topo

🥉 BRONZE ⭐
   • Já tem experiência acumulada
   • Começando a evoluir bem

⚪ NORMAL
   • Participação regular
   • Já ultrapassou o início
   • Caminho aberto para subir

🔴 INICIANTE
   • Quem acabou de chegar
   • Primeiros passos e ganhos
   • Tudo por construir!

📈 *COMO SUBIR DE CATEGORIA?*
🔹 Interaja com os comandos
🔹 Ganhe EXP e aumente seu Nível
🔹 Mantenha a frequência — inatividade faz descer!

💡 *Comandos relacionados:*
🔸 ${config.PREFIX}perfil ➜ Seu progresso individual
🔸 ${config.PREFIX}rank ➜ Lista geral ordenada
🔸 ${config.PREFIX}rankinativos ➜ Quem está parado 😴

✨ *${config.BOT_NAME} — Evolua Sempre!* ✨`;

    await sock.sendMessage(from, { text: resposta }, { quoted: msg });
}

module.exports = { tabela };
