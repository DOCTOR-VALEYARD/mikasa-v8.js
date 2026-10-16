const config = require("../../config");

async function crimg(sock, msg, args) {
    const from = msg.key.remoteJid;
    const texto = args.join(" ") || "Texto";
    
    const resp = `🎨 *IMAGEM CRIADA*\n\nTexto: ${texto}\n✅ Imagem gerada com sucesso!`;
    await sock.sendMessage(from, { text: resp }, { quoted: msg });
}

module.exports = { crimg };
