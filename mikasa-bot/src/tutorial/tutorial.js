// src/tutorial.js - COMANDO SECRETO APENAS PARA O CRIADOR
const config = require("../../config");

async function tutorial(sock, msg, args) {
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
    if (!args.length) {
        const resposta = `
╭୨୧─────────────୨୧╮
      📖 PAINEL PRIVADO 📖
╰୨୧─────────────୨୧╯

Bem-vindo ao tutorial exclusivo!

Opções disponíveis:
🔹 /tutorial ver - Ver tutoriais
🔹 /tutorial criar [titulo] - Criar
🔹 /tutorial deletar [id] - Deletar
🔹 /tutorial editar [id] - Editar

୨୧ ─────────────── ୨୧
🔓 Acesso confirmado
✨ Painel exclusivo
୨୧ ─────────────── ୨୧`;

        return await sock.sendMessage(from, { text: resposta }, { quoted: msg });
    }

    const opcao = args[0].toLowerCase();

    if (opcao === "ver") {
        const resposta = `
╭୨୧─────────────୨୧╮
      📚 TUTORIAIS 📚
╰୨୧─────────────୨୧╯

Sistema de tutoriais privado!

Você pode gerenciar tutoriais exclusivos:

🔹 /tutorial criar [conteudo]
🔹 /tutorial deletar [id]
🔹 /tutorial editar [id] [novo]

୨୧ ─────────────── ୨୧`;

        return await sock.sendMessage(from, { text: resposta }, { quoted: msg });
    }

    const resposta = `
╭୨୧─────────────୨୧╮
      ✅ AÇÃO REALIZADA ✅
╰୨୧─────────────୨୧╯

Ação: ${opcao}
Status: Em processamento

୨୧ ─────────────── ୨୧`;

    await sock.sendMessage(from, { text: resposta }, { quoted: msg });
}

module.exports = { tutorial };
