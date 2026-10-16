const config = require("../../config");
async function fechar(sock, msg, args) {
    const from = msg.key.remoteJid;
    const isGroup = msg.key.remoteJid.endsWith("@g.us");
    if (!isGroup) return sock.sendMessage(from, { text: `❌ Só em grupos!` }, { quoted: msg });
    try {
        await sock.groupSettingUpdate(from, "announcement");
        await sock.sendMessage(from, { text: `✅ Grupo fechado! Apenas admins podem enviar.` }, { quoted: msg });
    } catch (err) {
        await sock.sendMessage(from, { text: `❌ Erro: ${err.message}` }, { quoted: msg });
    }
}
module.exports = { fechar };
