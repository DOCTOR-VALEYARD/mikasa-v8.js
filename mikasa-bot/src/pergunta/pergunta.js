const config = require("../../config");

const perguntas = [
    "Qual é seu maior sonho?",
    "Do que você mais gosta?",
    "Qual é seu nome?",
    "Qual é sua cor favorita?",
    "O que você quer ser?"
];

async function pergunta(sock, msg) {
    const from = msg.key.remoteJid;
    const pergunta = perguntas[Math.floor(Math.random() * perguntas.length)];
    
    const resp = `❓ ${pergunta}`;
    await sock.sendMessage(from, { text: resp }, { quoted: msg });
}

module.exports = { pergunta };
