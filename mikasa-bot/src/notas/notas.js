const config = require("../../config");
const fs = require("fs");
const path = require("path");

const dbPath = path.join(__dirname, "../../database/notas.json");

function lerDB() {
    if (!fs.existsSync(path.dirname(dbPath))) fs.mkdirSync(path.dirname(dbPath), { recursive: true });
    if (!fs.existsSync(dbPath)) return {};
    return JSON.parse(fs.readFileSync(dbPath, "utf8"));
}

function salvarDB(db) {
    fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));
}

async function notas(sock, msg, args) {
    const from = msg.key.remoteJid;
    const userId = msg.key.participant || msg.key.remoteJid;
    const db = lerDB();

    if (args[0] === "add") {
        const nota = args.slice(1).join(" ");
        if (!db[userId]) db[userId] = [];
        db[userId].push(nota);
        salvarDB(db);
        return await sock.sendMessage(from, { text: `✅ Nota adicionada!` }, { quoted: msg });
    }

    if (!db[userId] || db[userId].length === 0) {
        return await sock.sendMessage(from, { text: `📝 Você não tem notas!` }, { quoted: msg });
    }

    let texto = `📝 *SUAS NOTAS*\n\n`;
    db[userId].forEach((nota, i) => {
        texto += `${i+1}. ${nota}\n`;
    });

    await sock.sendMessage(from, { text: texto }, { quoted: msg });
}

module.exports = { notas };
