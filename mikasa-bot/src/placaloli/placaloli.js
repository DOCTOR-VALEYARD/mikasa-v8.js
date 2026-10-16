const config = require("../../config");

async function placaloli(sock, msg, args) {
    const from = msg.key.remoteJid;
    const texto = args.join(" ") || "LOLI";
    
    const resp = `🎀 *PLACA LOLI*\n\n${texto}`;
    await sock.sendMessage(from, { text: resp }, { quoted: msg });
}

module.exports = { placaloli };
