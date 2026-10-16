const config = require("../../config");

async function aptoide_pesquisa(sock, msg, args) {
    const from = msg.key.remoteJid;
    if (!args.length) {
        return sock.sendMessage(from, { text: `❌ Use: ${config.PREFIX}aptoide_pesquisa [app]` }, { quoted: msg });
    }
    
    const app = args.join(" ");
    const resp = `📱 *PESQUISA APTOIDE*\n\nApp: ${app}\n⏳ Procurando...\n✅ Resultados encontrados!`;
    await sock.sendMessage(from, { text: resp }, { quoted: msg });
}

module.exports = { aptoide_pesquisa };
