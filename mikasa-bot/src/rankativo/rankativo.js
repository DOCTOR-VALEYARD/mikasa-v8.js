const config = require("../../config");
async function rankativo(sock, msg) {
    const from = msg.key.remoteJid;
    const resp = `
╭─「 📈 *RANKING ATIVOS* 」
│
│ 🥇 1º Lugar
│ 🥈 2º Lugar
│ 🥉 3º Lugar
│
│ 💡 Use ${config.PREFIX}rank
╰───────────────────────────`;
    await sock.sendMessage(from, { text: resp }, { quoted: msg });
}
module.exports = { rankativo };
