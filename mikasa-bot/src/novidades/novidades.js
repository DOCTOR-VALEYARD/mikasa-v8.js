const config = require("../../config");

async function novidades(sock, msg) {
    const from = msg.key.remoteJid;
    
    const resp = `✨ *NOVIDADES v${config.VERSION}*\n\n🔥 Novo: Sistema de Marcar Funcionando\n🎮 Novo: Metadinha com 15 charadas\n💰 Novo: Sistema de Economia\n🛡️ Novo: Comandos de Admin\n\nObrigado por usar ${config.BOT_NAME}!`;
    await sock.sendMessage(from, { text: resp }, { quoted: msg });
}

module.exports = { novidades };
