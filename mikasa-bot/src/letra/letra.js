// src/letra.js
const config = require("../../config");
const fs = require("fs");
const path = require("path");
const https = require("https"); // ✅ Módulo nativo, não instala nada!

// Função auxiliar de requisição
function requisitarAPI(url) {
    return new Promise((resolve, reject) => {
        https.get(url, (res) => {
            let corpo = "";
            res.on("data", pedaco => corpo += pedaco);
            res.on("end", () => resolve(corpo));
        }).on("error", reject);
    });
}

async function letra(sock, msg, args) {
    const from = msg.key.remoteJid;
    const caminhoImagem = path.join(__dirname, "../midias/imagens/menu.png");
    const entrada = args.join(" ").trim();

    // 🚫 NÃO DIGITOU NADA
    if (!entrada) {
        const aviso = `
╭─── ❀ ───╮
      ⚠️ LETRA DE MÚSICA ⚠️
╰─── ❀ ───╯

❀ Você não informou o que deseja!

❀ 📌 Modos corretos de usar:
   ${config.PREFIX}letra [nome da música]
   ${config.PREFIX}letra [artista] - [música]

❀ 💡 Exemplos:
   ${config.PREFIX}letra aquela carta
   ${config.PREFIX}letra legião urbana - tempo perdido

❀────────────────────❀
🤍 ${config.BOT_NAME}
🌹 ${config.OWNER_NAME}
❀────────────────────❀
`;
        return sock.sendMessage(from, { text: aviso }, { quoted: msg });
    }


    try {
        // ⏳ AVISO DE BUSCA
        await sock.sendMessage(from, {
            text: `
╭─── ❀ ───╮
       🎶 BUSCANDO LETRA 🎶
╰─── ❀ ───╯

❀ Pesquisando: *${entrada}*
❀ Acessando base de dados... 📚🎤
❀ Aguarde um instante!

❀────────────────────❀
🤍 ${config.BOT_NAME}
🌹 ${config.OWNER_NAME}
❀────────────────────❀`
        }, { quoted: msg });


        // ✅ SEPARAR ARTISTA E MÚSICA SE TIVER O SÍMBOLO "-"
        let artista, musica;
        if (entrada.includes(" - ")) {
            const partes = entrada.split(" - ");
            artista = partes[0].trim();
            musica = partes[1].trim();
        } else {
            // Se não tiver, busca como música apenas — API tenta adivinhar
            artista = "";
            musica = entrada;
        }

        // Codifica para URL e busca
        const url = `https://api.lyrics.ovh/v1/${encodeURIComponent(artista || "desconhecido")}/${encodeURIComponent(musica)}`;
        const respostaCrua = await requisitarAPI(url);
        const dados = JSON.parse(respostaCrua);


        if (!dados.lyrics) {
            throw new Error("Letra não encontrada. Tente com o nome do artista também!");
        }


        // ✅ LIMPAR E FORMATAR TEXTO — REMOVE LINHAS EM BRANCO EXTRAS
        let textoLetra = dados.lyrics
            .replace(/\r\n/g, "\n")
            .replace(/\n{3,}/g, "\n\n")
            .trim();

        // ⚠️ CORTE INTELIGENTE — WhatsApp tem limite de ~650 caracteres por mensagem
        let mensagemFinal = `
╭─── ❀ ───╮
     📜 LETRA ENCONTRADA 📜
╰─── ❀ ───╯

❀ 🎤 Artista: ${artista || "Não informado"}
❀ 🎵 Música: *${musica.toUpperCase()}*

❀ 🎶 LETRA ❀
`;

        // Adiciona parte da letra e avisa se cortou
        if (textoLetra.length > 450) {
            textoLetra = textoLetra.substring(0, 450) + "\n\n✂️ ... *[CONTINUA]* — Limite de mensagem atingido!";
        }

        mensagemFinal += textoLetra + `

❀────────────────────❀
🤍 Fonte: Base de Dados Musical
🤍 ${config.BOT_NAME}
🌹 ${config.OWNER_NAME}
❀────────────────────❀
`;


        // ✅ ENVIO COM IMAGEM OU TEXTO PURO
        if (fs.existsSync(caminhoImagem)) {
            const buffer = fs.readFileSync(caminhoImagem);
            await sock.sendMessage(from, {
                image: buffer,
                caption: mensagemFinal
            }, { quoted: msg });
        } else {
            await sock.sendMessage(from, { text: mensagemFinal }, { quoted: msg });
        }


    } catch (erro) {
        console.error("Erro Letra:", erro);
        const erroMsg = `
╭─── ❀ ───╮
       ❌ NÃO ENCONTRADO ❌
╰─── ❀ ───╯

❀ Infelizmente não localizei essa música!

❀ 💡 Dicas para dar certo:
   • Verifique se escreveu certo
   • Adicione o nome do artista
   • Ex: ${config.PREFIX}letra artista - música

❀ 📌 Lembrete:
   Funciona melhor com:
   • Português 🇧🇷
   • Inglês 🇺🇸🇬🇧

❀────────────────────❀
🤍 ${config.BOT_NAME}
🌹 ${config.OWNER_NAME}
❀────────────────────❀
`;
        await sock.sendMessage(from, { text: erroMsg }, { quoted: msg });
    }
}

module.exports = { letra };

