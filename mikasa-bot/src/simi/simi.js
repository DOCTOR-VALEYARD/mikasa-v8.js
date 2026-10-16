// src/simi.js
const config = require("../../config");
const fs = require("fs");
const path = require("path");

async function simi(sock, msg, args) {
    const from = msg.key.remoteJid;
    const caminhoImagem = path.join(__dirname, "../midias/imagens/menu.png");
    const pergunta = args.join(" ").trim();

    // 🚫 NÃO FEZ NENHUMA PERGUNTA
    if (!pergunta) {
        const aviso = `
╭─── ❀ ───╮
       ⚠️ ORÁCULO ⚠️
╰─── ❀ ───╯

❀ Você precisa fazer uma pergunta!

❀ 📌 Como usar corretamente:
   ${config.PREFIX}simi [sua pergunta]

❀ 💡 Exemplos:
   ${config.PREFIX}simi vai dar certo?
   ${config.PREFIX}simi devo ir hoje?
   ${config.PREFIX}simi sou sortudo?

❀────────────────────❀
🤍 ${config.BOT_NAME}
🌹 ${config.OWNER_NAME}
❀────────────────────❀
`;
        return sock.sendMessage(from, { text: aviso }, { quoted: msg });
    }

    try {
        // ✅ LISTA AMPLIADA DE RESPOSTAS — MAIS VARIEDADE E DIVERTIDO
        const respostas = [
            "✅ Sim! Com toda certeza!",
            "❌ Não! Nem pense nisso.",
            "🤔 Talvez... ainda não é hora de saber.",
            "💯 Claro que sim! Vá em frente.",
            "🚫 De jeito nenhum! Melhor evitar.",
            "❔ Pode ser... depende muito de você.",
            "✨ Com certeza absoluta!",
            "⚖️ As chances são iguais.",
            "🔮 Os sinais apontam que sim.",
            "🌫️ O futuro ainda está confuso.",
            "👍 Provavelmente sim!",
            "👎 Provavelmente não!",
            "🌟 A resposta está dentro de você.",
            "📑 Tudo indica que sim!",
            "⛔ Os sinais dizem que não!"
        ];

        // SORTEIA UMA RESPOSTA ALEATÓRIA
        const respostaEscolhida = respostas[Math.floor(Math.random() * respostas.length)];

        // ✅ MENSAGEM FINAL FORMATADA
        const mensagemFinal = `
╭─── ❀ ───╮
       🔮 ORÁCULO SIMI 🔮
╰─── ❀ ───╯

❀ ❓ SUA PERGUNTA ❀
${pergunta}

❀ ✨ RESPOSTA DO DESTINO ❀
${respostaEscolhida}

❀────────────────────❀
🤍 Brinque com sabedoria!
🤍 ${config.BOT_NAME}
🌹 ${config.OWNER_NAME}
❀────────────────────❀
`;

        // ✅ ENVIA COM IMAGEM PADRÃO OU SÓ TEXTO
        if (fs.existsSync(caminhoImagem)) {
            const bufferImagem = fs.readFileSync(caminhoImagem);
            await sock.sendMessage(from, {
                image: bufferImagem,
                caption: mensagemFinal
            }, { quoted: msg });
        } else {
            await sock.sendMessage(from, { text: mensagemFinal }, { quoted: msg });
        }

    } catch (erro) {
        console.error("Erro Simi:", erro);
        const erroMsg = `
╭─── ❀ ───╮
       ❌ ERRO NO ORÁCULO ❌
╰─── ❀ ───╯

❀ Houve um pequeno problema ao consultar o destino!
❀ Tente fazer sua pergunta novamente.

❀────────────────────❀
🤍 ${config.BOT_NAME}
🌹 ${config.OWNER_NAME}
❀────────────────────❀
`;
        await sock.sendMessage(from, { text: erroMsg }, { quoted: msg });
    }
}

module.exports = { simi };

