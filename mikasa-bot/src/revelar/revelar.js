const config = require("../../config");

async function revelar(sock, msg) {
    const from = msg.key.remoteJid;
    const segredos = ["Você é incrível!", `O bot foi criado por ${config.OWNER_NAME}`, "Parabéns, você achou um segredo!"];
    
    const resp = `🔓 *SEGREDO REVELADO*\n\n${segredos[Math.floor(Math.random() * segredos.length)]}`;
    await sock.sendMessage(from, { text: resp }, { quoted: msg });
}

module.exports = { revelar };
