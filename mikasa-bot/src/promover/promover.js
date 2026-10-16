const config = require("../../config");
async function promover(sock, msg, args) {
    const from = msg.key.remoteJid;
    const isGroup = msg.key.remoteJid.endsWith("@g.us");
    if (!isGroup) return sock.sendMessage(from, { text: `❌ Só em grupos!` }, { quoted: msg });
    
    if (!msg.message.extendedTextMessage?.contextInfo?.quotedMessage) {
        return sock.sendMessage(from, { text: `❌ Responda à mensagem do usuário!` }, { quoted: msg });
    }
    
    const quotedJid = msg.message.extendedTextMessage.contextInfo.participant;
    try {
        await sock.groupParticipantsUpdate(from, [quotedJid], "promote");
        await sock.sendMessage(from, { text: `✅ @${quotedJid.split("@")[0]} promovido a admin!` }, { quoted: msg });
    } catch (err) {
        await sock.sendMessage(from, { text: `❌ Erro: ${err.message}` }, { quoted: msg });
    }
}
module.exports = { promover };
