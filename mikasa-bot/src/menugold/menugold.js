const config = require("../../config");
async function menugold(sock, msg) {
    const from = msg.key.remoteJid;
    const resposta = ` 🌸┈┈┈┈┈┈┈┈┈┈┈┈🌸
✨ 『 ${config.BOT_NAME} 』✨
🌸┈┈┈┈┈┈┈┈┈┈┈┈🌸

💰 𝑴𝑬𝑵𝑼 𝑮𝑶𝑳𝑫 💰

🌷┈┈┈┈┈┈┈┈┈┈┈┈🌷
💸 𝑬𝑪𝑶𝑵𝑶𝑴𝑰𝑨 & 𝑴𝑶𝑬𝑫𝑨𝑺
🌷┈┈┈┈┈┈┈┈┈┈┈┈🌷
🌸 ${config.PREFIX}ˢᵃˡᵈᵒ ➜ ᵛᵉʳ ˢᵃˡᵈᵒ ᴳᵒˡᵈ
🌸 ${config.PREFIX}ʳᵒᵘᵇᵃʳ [@user] ➜ ʳᵒᵘᵇᵃʳ ᴳᵒˡᵈ
🌸 ${config.PREFIX}ˡᵒʲᵃ ➜ ᶜᵒᵐᵖʳᵃʳ ⁱᵗᵉⁿˢ
🌸 ${config.PREFIX}ᵈᵘᵉˡᵒ [@user] ➜ ᵃᵖᵒˢᵗᵃʳ ᴳᵒˡᵈ
🌸 ${config.PREFIX}ʳᵉˢᵍᵃᵗᵃʳ ➜ ʳᵉˢᵍᵃᵗᵃʳ ᵗᵒᵏᵉⁿ

🌷┈┈┈┈┈┈┈┈┈┈┈┈🌷
🏆 𝑹𝑨𝑵𝑲𝑰𝑵𝑮
🌷┈┈┈┈┈┈┈┈┈┈┈┈🌷
🌸 ${config.PREFIX}ʳᵃⁿᵏ ➜ ᵛᵉʳ ʳᵃⁿᵏⁱⁿᵍ
🌸 ${config.PREFIX}ᵖᵉʳᶠⁱˡ ➜ ˢᵉᵘ ᵖᵉʳᶠⁱˡ

🌷┈┈┈┈┈┈┈┈┈┈┈┈🌷
📊 𝑪𝑶𝑵𝑽𝑬𝑹𝑺𝑨̃𝑶
🌷┈┈┈┈┈┈┈┈┈┈┈┈🌷
🌸 1000 ᴳᵒˡᵈ = 1 ᴾʳᵉᵐⁱᵘᵐ
💐┈┈┈┈┈┈┈┈┈┈┈┈💐
`;
    await sock.sendMessage(from, { text: resposta }, { quoted: msg });
}
module.exports = { menugold };
