const config = require("../../config");
async function abrir(sock, msg, args) {
    const from = msg.key.remoteJid;
    const isGroup = msg.key.remoteJid.endsWith("@g.us");
    if (!isGroup) return sock.sendMessage(from, { text: `❌ Só em grupos!` }, { quoted: msg });
    try {
        await sock.groupSettingUpdate(from, "not_announcement");
        await sock.sendMessage(from, { text: `
┅『 ✦ Grupo aberto! 』┄┅┄┅┄
Membros podem enviar mensagens.
┅┄┅┄『 ✦ 』┄┅┄┅┄` }, { quoted: msg });
    } catch (err) {
        await sock.sendMessage(from, { text: `❌ Erro: ${err.message}` }, { quoted: msg });
    }
}
module.exports = { abrir };
