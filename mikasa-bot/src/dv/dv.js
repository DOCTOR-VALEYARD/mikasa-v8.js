// src/dv.js - MENSAGEM DIVERSÃO
const mensagens = [
    "Vocês acham que é brincadeira? Tá começando agora! 🔥",
    "Diversão? Aqui tem de sobra! 🎉",
    "Preparem-se para o caos criativo! 🌪️",
    "A festa tá começando, galera! 🎊",
    "Visão 20/20: Vocês vão se divertir muito! 👁️"
];

const mensagem = mensagens[Math.floor(Math.random() * mensagens.length)];
module.exports = { mensagem };
