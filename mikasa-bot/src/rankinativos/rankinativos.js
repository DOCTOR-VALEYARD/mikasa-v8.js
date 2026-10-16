
/* =================================================
   📉 RANKING DE USUÁRIOS INATIVOS
   📁 Arquivo: rankinativos.js
   🤖 ${config.BOT_NAME} • ${config.OWNER_NAME}
   ================================================= */

const config = require("../../config");

async function rankinativos(sock, msg) {
    const from = msg.key.remoteJid;

    const resposta = `╭━📉━━━━━━━━━━━━━━━━━📉━╮
     📊 RANKING DE INATIVOS 😴
╰━📉━━━━━━━━━━━━━━━━━📉━╯

💤 *O que é essa lista?*
Aqui aparecem os usuários cadastrados que
fazem tempo não interagem, não ganham
EXP e não evoluem no sistema!

📌 *O que mostra:*
🔸 Nome do usuário
⏱️ Última vez que apareceu
📅 Dias sem atividade
📉 Posição na classificação

💡 *Comandos relacionados:*
🔹 ${config.PREFIX}rank ➜ Ranking Geral por Nível
🔹 ${config.PREFIX}rankinativos ➜ Esta lista aqui!

⚠️ *Aviso:* Quanto mais tempo parado,
mais atrás vai ficando... até sumir! 🫣

✨ *${config.BOT_NAME} — Movimento é Evolução!* ✨`;

    await sock.sendMessage(from, { text: resposta }, { quoted: msg });
}

module.exports = { rankinativos };
