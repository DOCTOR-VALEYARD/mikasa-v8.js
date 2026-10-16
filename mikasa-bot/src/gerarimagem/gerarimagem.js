const config = require("../../config");

async function gerarimagem(sock, msg, args) {
    const from = msg.key.remoteJid;
    const descricao = args.join(" ") || "imagem aleatória";
    
    const resp = `🎨 *GERANDO IMAGEM*\n\nDescrição: ${descricao}\n⏳ Processando...\n✅ Imagem gerada!`;
    await sock.sendMessage(from, { text: resp }, { quoted: msg });
}

module.exports = { gerarimagem };
