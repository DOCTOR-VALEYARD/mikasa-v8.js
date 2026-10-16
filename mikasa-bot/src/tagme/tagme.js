const config = require("../../config");

async function tagme(sock, msg) {
    const from = msg.key.remoteJid;
    const userId = msg.key.participant || msg.key.remoteJid;
    
    const resp = `👋 Você foi marcado!`;
    await sock.sendMessage(from, {
        text: resp,
        mentions: [userId]
    }, { quoted: msg });
}

module.exports = { tagme };
