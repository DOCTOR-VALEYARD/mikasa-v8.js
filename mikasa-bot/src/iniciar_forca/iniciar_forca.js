const config = require("../../config");

async function iniciar_forca(sock, msg) {
    const from = msg.key.remoteJid;
    
    const resp = `🎮 *JOGO DA FORCA*\n\nPalavra escolhida: _ _ _ _ _\n\n💭 Adivinhe a palavra!\n⌨️ ${config.PREFIX}forca [letra]`;
    await sock.sendMessage(from, { text: resp }, { quoted: msg });
}

module.exports = { iniciar_forca };
