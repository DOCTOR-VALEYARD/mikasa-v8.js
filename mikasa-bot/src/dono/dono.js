// src/dono.js
const config = require("../../config");
const fs = require("fs");
const path = require("path");

const responderDono = async (sock, from, msg) => {
    const caminhoImagem = path.join(__dirname, "../midias/imagens/menu.png");

    const frasesAutoridade = [
        "⚠️ Você não tem autoridade para me marcar ou contatar minha liderança!",
        "🚫 Cuidado com esse contato. Acesso restrito apenas a níveis superiores!",
        "🛑 Canal exclusivo. Você não possui permissão para acessar essa área!",
        "⚠️ Meu criador está ocupado com assuntos importantes. Não incomode sem autorização!",
        "🔒 Tentativa de acesso detectada. Contato com a liderança: AUTORIDADE NEGADA!"
    ];

    const fraseAleatoria = frasesAutoridade[Math.floor(Math.random() * frasesAutoridade.length)];
    const dataAtual = new Date().toLocaleDateString('pt-BR');
    const horaAtual = new Date().toLocaleTimeString('pt-BR');

    // ✅ TUDO VINDO DIRETO DO CONFIG — NENHUM NOME FIXO
    const mensagem = `
╭─── ❀ ───╮
   🔐 ACESSO RESTRITO 🔐
╰─── ❀ ───╯

❀ ⚠️ AVISO DE SEGURANÇA ❀
${fraseAleatoria}

❀ 👤 DADOS DO CRIADOR ❀
❀ Nome Principal: *${config.OWNER_NAME}*
❀ Contato: wa.me/${config.OWNER_NUMBER}
❀ Situação: Ocupado • Desenvolvimento
❀ Disponibilidade: Apenas convidados

❀ 📌 INFORMAÇÕES DO SISTEMA ❀
❀ Plataforma: ${config.BOT_NAME}
❀ Sistema: *${config.BOT_NAME}*
❀ Versão: ${config.VERSION}

❀ 🕒 REGISTRO DE CONSULTA ❀
❀ 📅 Data: ${dataAtual}
❀ 🕒 Hora: ${horaAtual}

❀────────────────────❀
🤍 ${config.BOT_NAME}
🌹 ${config.OWNER_NAME}
❀────────────────────❀
`;

    // ✅ ENVIA COM IMAGEM PADRÃO
    if (fs.existsSync(caminhoImagem)) {
        const buffer = fs.readFileSync(caminhoImagem);
        await sock.sendMessage(from, {
            image: buffer,
            caption: mensagem
        }, { quoted: msg });
    } else {
        await sock.sendMessage(from, { text: mensagem }, { quoted: msg });
    }
};

module.exports = { responderDono };
