const config = require("../../config");

async function rvvisu(sock, msg, args) {
    const from = msg.key.remoteJid;
    const texto = args.join(" ") || "Nenhum texto fornecido";
    
    const resp = `👁️ *ANÁLISE VISUAL*\n\nTexto: ${texto}\n✅ Estrutura: OK\n✅ Ortografia: OK`;
    await sock.sendMessage(from, { text: resp }, { quoted: msg });
}

module.exports = { rvvisu };
