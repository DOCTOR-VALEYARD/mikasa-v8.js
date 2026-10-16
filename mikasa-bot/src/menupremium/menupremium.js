const config = require("../../config");
async function menupremium(sock, msg) {
    const from = msg.key.remoteJid;
    const resp = `🌸┈┈┈┈┈┈┈┈┈┈┈┈┈┈🌸
✨ 『 ${config.BOT_NAME} 』✨
🌸┈┈┈┈┈┈┈┈┈┈┈┈┈┈🌸

   ⭐ 𝑴𝑬𝑵𝑼 𝑷𝑹𝑬𝑴𝑰𝑼𝑴 ⭐

🌷┈┈┈┈┈┈┈┈┈┈┈┈┈┈🌷
🌸 💎 Recursos exclusivos
🌸 🎁 Sem anúncios
🌸 ⚡ Suporte prioritário
🌸 🔥 Mais 50+ comandos
🌸 💳 Preço: Entre em contato
🌷┈┈┈┈┈┈┈┈┈┈┈┈┈┈🌷`;
    await sock.sendMessage(from, { text: resp }, { quoted: msg });
}
module.exports = { menupremium };
