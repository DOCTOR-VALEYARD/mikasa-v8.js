const config = require("../../config");

async function blocklist(sock, msg) {
    const from = msg.key.remoteJid;
    
    const resp = `🚫 *LISTA DE BLOQUEADOS*\n\nVocê não bloqueou ninguém!`;
    await sock.sendMessage(from, { text: resp }, { quoted: msg });
}

module.exports = { blocklist };
