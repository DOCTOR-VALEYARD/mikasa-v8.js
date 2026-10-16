// src/Índia.js- COMANDO SECRETO APENAS PARA O CRIADOR
const config = require("../../config");
const fs = require("fs");
const path = require("path");

async function bronxys(sock, msg, args) {
    const from = msg.key.remoteJid;
    const userId = msg.key.participant || msg.key.remoteJid;

    // Verifica se é o criador (por número)
    const ehCriador = userId.includes(config.OWNER_NUMBER.slice(-10));

    // Se não é o criador, nega acesso
    if (!ehCriador) {
        const resposta = `
╭୨୧─────────────୨୧╮
      🔐 ACESSO NEGADO 🔐
╰୨୧─────────────୨୧╯

❌ Este é um comando exclusivo!

🔹 Apenas administradores podem usar.

୨୧ ─────────────── ୨୧
🛡️ Proteção ativada
୨୧ ─────────────── ୨୧`;

        return await sock.sendMessage(from, { text: resposta }, { quoted: msg });
    }

    // É o criador! Mostra o painel especial
    const resposta = `
╭୨୧─────────────୨୧╮
      👑 PAINEL PRIVADO 👑
╰୨୧─────────────୨୧╯

Bem-vindo ao painel exclusivo!

🤖 Bot: ${config.BOT_NAME}
📌 Prefixo: ${config.PREFIX}
📊 Versão: ${config.VERSION}
⭐ Status: PRIVADO

୨୧ ─────────────── ୨୧
🔓 Acesso confirmado
✨ Painel exclusivo desbloqueado
୨୧ ─────────────── ୨୧`;

    await sock.sendMessage(from, { text: resposta }, { quoted: msg });
}

module.exports = { bronxys };
