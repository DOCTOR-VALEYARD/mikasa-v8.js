const config = require("../../config");

const musicas = {
    "sad": "Sad - Imagine Dragons\n\nIt's the little things,\nAnd I don't know what I've been,\nMissing, I know now...",
    "blinding lights": "Blinding Lights - The Weeknd\n\nI can't sleep until I feel your touch...",
    "levitating": "Levitating - Dua Lipa\n\nIf you wanna run away with me,\nI know a galaxy..."
};

async function letramusica(sock, msg, args) {
    const from = msg.key.remoteJid;
    if (!args.length) {
        return sock.sendMessage(from, {
            text: `❌ Use: ${config.PREFIX}letramusica [música]\nExemplo: ${config.PREFIX}letramusica sad`
        }, { quoted: msg });
    }
    
    const busca = args.join(" ").toLowerCase();
    const letra = musicas[busca];
    
    if (!letra) {
        return sock.sendMessage(from, {
            text: `❌ Música não encontrada!\nTente: sad, blinding lights, levitating`
        }, { quoted: msg });
    }
    
    await sock.sendMessage(from, { text: letra }, { quoted: msg });
}

module.exports = { letramusica };
