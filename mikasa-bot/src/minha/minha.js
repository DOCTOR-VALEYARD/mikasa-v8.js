const config = require("../../config");

async function minha(sock, msg) {
    const from = msg.key.remoteJid;
    
    const resp = `📦 *SEU INVENTÁRIO*\n\n💰 Gold: 1000\n🎁 Items: 5\n🏆 Badges: 3\n⭐ Pontos: 500`;
    await sock.sendMessage(from, { text: resp }, { quoted: msg });
}

module.exports = { minha };
