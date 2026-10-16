const config = require("../../config");

async function brasileiraob(sock, msg) {
    const from = msg.key.remoteJid;
    
    const resp = `⚽ *SÉRIE B*\n\n📊 Campeonato em andamento\n✅ Últimas notícias carregadas!`;
    await sock.sendMessage(from, { text: resp }, { quoted: msg });
}

module.exports = { brasileiraob };
