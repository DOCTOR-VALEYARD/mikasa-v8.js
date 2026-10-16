const config = require("../../config");
async function atividades(sock, msg) {
    const from = msg.key.remoteJid;
    const resp = `
╭─「 📋 *ATIVIDADES* 」
│
│ 🎮 Jogos
│ 🎤 Conversa
│ 💬 Mensagens
│ 📸 Fotos
│
│ 💡 Acumule pontos
╰───────────────────────────`;
    await sock.sendMessage(from, { text: resp }, { quoted: msg });
}
module.exports = { atividades };
