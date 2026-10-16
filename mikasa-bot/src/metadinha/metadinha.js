// src/metadinha.js - JOGO DE CHARADAS/METADINHAS REAL
const config = require("../../config");
const fs = require("fs");
const path = require("path");

const metadinhas = [
    { charada: "O que é que tem coroa mas não é rei?", resposta: "abacaxi" },
    { charada: "Anda todo o dia e nunca se cansa?", resposta: "relógio" },
    { charada: "Tenho cidades mas não tenho casas, tenho montanhas mas não tenho árvores, tenho água mas não tenho peixes. O que sou?", resposta: "mapa" },
    { charada: "Quanto mais tiras, maior fico. O que sou?", resposta: "buraco" },
    { charada: "Tenho rosto e duas mãos, mas não tenho braços. O que sou?", resposta: "relógio" },
    { charada: "Sou redondo como um cadarço e tenho um coração que bate. O que sou?", resposta: "melancia" },
    { charada: "Todos têm um, você vê todos os dias. O que é?", resposta: "reflexo" },
    { charada: "O que fica cada vez maior quando se tira dele?", resposta: "buraco" },
    { charada: "Sou preto quando está limpo e branco quando está sujo. O que sou?", resposta: "quadro negro" },
    { charada: "Tenho chave mas não tenho fechadura. O que sou?", resposta: "piano" },
    { charada: "Sou pai dos seus pais, mas você não é meu filho. Quem sou eu?", resposta: "tio avó" },
    { charada: "Posso correr mas não tenho pés. O que sou?", resposta: "rio" },
    { charada: "Tenho pescoço mas não tenho cabeça. O que sou?", resposta: "garrafa" },
    { charada: "Sou um animal que tem mais de 4 patas mas não é inseto. Qual sou?", resposta: "aranha" },
    { charada: "Quanto maior fico, menos peso tenho. O que sou?", resposta: "buraco" },
];

async function metadinha(sock, msg, args) {
    const from = msg.key.remoteJid;
    const userId = msg.key.participant || msg.key.remoteJid;
    
    // Banco de dados de charadas em progresso
    const dbPath = path.join(__dirname, "../../database/metadinhas.json");
    
    function lerDB() {
        if (!fs.existsSync(path.dirname(dbPath))) {
            fs.mkdirSync(path.dirname(dbPath), { recursive: true });
        }
        if (!fs.existsSync(dbPath)) return {};
        return JSON.parse(fs.readFileSync(dbPath, "utf8"));
    }

    function salvarDB(db) {
        fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));
    }

    const db = lerDB();

    // Se não houver charada em progresso, cria uma nova
    if (!db[userId] || args[0] === "nova") {
        const metadinhaAleatoria = metadinhas[Math.floor(Math.random() * metadinhas.length)];
        db[userId] = {
            charada: metadinhaAleatoria.charada,
            resposta: metadinhaAleatoria.resposta.toLowerCase(),
            tentativas: 0
        };
        salvarDB(db);

        const resposta = `
╭୨୧─────────────୨୧╮
      🎭 METADINHA 🎭
╰୨୧─────────────୨୧╯

🧩 ${db[userId].charada}

୨୧ ─────────────── ୨୧
💭 Qual é a resposta?
⌨️ Responda com /resposta [sua resposta]
୨୧ ─────────────── ୨୧`;

        return await sock.sendMessage(from, { text: resposta }, { quoted: msg });
    }

    // Se o usuário respondeu com /resposta
    if (args[0] === "resposta" || args[0] === "resp") {
        if (!args[1]) {
            return await sock.sendMessage(from, {
                text: `❌ Use: ${config.PREFIX}metadinha resposta [sua resposta]`
            }, { quoted: msg });
        }

        const respostaUsuario = args.slice(1).join(" ").toLowerCase();
        const respostaCorreta = db[userId].resposta;
        db[userId].tentativas++;

        if (respostaUsuario === respostaCorreta) {
            delete db[userId];
            salvarDB(db);

            const msgVitoria = `
╭୨୧─────────────୨୧╮
      ✨ PARABÉNS! ✨
╰୨୧─────────────୨୧╯

🎉 Você acertou!
📝 Resposta: ${respostaCorreta}
🎯 Tentativas: ${db[userId]?.tentativas || 1}

୨୧ ─────────────── ୨୧
🏆 Você é inteligente!
🌟 Quer outra? /metadinha nova
୨୧ ─────────────── ୨୧`;

            return await sock.sendMessage(from, { text: msgVitoria }, { quoted: msg });
        } else {
            const msgErro = `
╭୨୧─────────────୨୧╮
      ❌ ERRADO ❌
╰୨୧─────────────୨୧╯

😅 Que pena!
📍 Sua resposta: ${respostaUsuario}
🎯 Tentativa ${db[userId].tentativas}

💭 Quer tentar novamente?
⌨️ /metadinha resposta [nova resposta]

🔹 Ou desista:
⌨️ /metadinha desistir

୨୧ ─────────────── ୨୧`;

            salvarDB(db);
            return await sock.sendMessage(from, { text: msgErro }, { quoted: msg });
        }
    }

    // Se quer desistir
    if (args[0] === "desistir") {
        const resposta = db[userId].resposta;
        delete db[userId];
        salvarDB(db);

        const msgDesistiu = `
╭୨୧─────────────୨୧╮
      😔 DESISTIU 😔
╰୨୧─────────────୨୧╯

📝 A resposta era: ${resposta}
💭 Tente novamente!

⌨️ /metadinha nova

୨୧ ─────────────── ୨୧`;

        return await sock.sendMessage(from, { text: msgDesistiu }, { quoted: msg });
    }

    // Se não souber os comandos
    const ajuda = `
╭୨୧─────────────୨୧╮
      🎭 COMO JOGAR 🎭
╰୨୧─────────────୨୧╯

🎮 Comandos disponíveis:

📌 /metadinha nova
   Inicia uma nova charada

🎯 /metadinha resposta [sua resposta]
   Responde a charada

❌ /metadinha desistir
   Desiste da charada

୨୧ ─────────────── ୨୧`;

    await sock.sendMessage(from, { text: ajuda }, { quoted: msg });
}

module.exports = { metadinha };
