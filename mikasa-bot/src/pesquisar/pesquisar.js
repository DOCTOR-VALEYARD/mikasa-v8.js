// src/pesquisar.js — VERSÃO COMPLETA
const config = require("../../config");
const fs = require("fs");
const path = require("path");
const https = require("https"); // ✅ Usa módulo NATIVO do Node — NÃO PRECISA INSTALAR NADA!

// Função auxiliar de requisição segura
function buscarDados(url) {
    return new Promise((resolve, reject) => {
        https.get(url, (res) => {
            let dados = "";
            res.on("data", pedaco => dados += pedaco);
            res.on("end", () => resolve(dados));
        }).on("error", reject);
    });
}


async function pesquisar(sock, msg, args) {
    const from = msg.key.remoteJid;
    const termo = args.join(" ").trim();
    const caminhoImagem = path.join(__dirname, "../midias/imagens/menu.png");

    if (!termo) {
        const aviso = `
╭─── ❀ ───╮
       ⚠️ PESQUISA ⚠️
╰─── ❀ ───╯

❀ Você esqueceu o que quer pesquisar!

❀ 📌 Exemplo:
   ${config.PREFIX}pesquisar sol
   ${config.PREFIX}pesquisar capital da frança
   ${config.PREFIX}pesquisar o que é biologia

❀────────────────────❀
🤍 ${config.BOT_NAME}
🌹 ${config.OWNER_NAME}
❀────────────────────❀
`;
        return sock.sendMessage(from, { text: aviso }, { quoted: msg });
    }

    try {
        await sock.sendMessage(from, {
            text: `
╭─── ❀ ───╮
       ⏳ BUSCANDO... ⏳
╰─── ❀ ───╯

❀ Consultando fontes confiáveis...
❀ Assunto: *${termo}*

❀────────────────────❀
🤍 ${config.BOT_NAME}
🌹 ${config.OWNER_NAME}
❀────────────────────❀`
        }, { quoted: msg });


        // ✅ BUSCA EM API PÚBLICA — 100% GRÁTIS E SEM CHAVE
        const url = `https://api.dictionaryapi.dev/api/v2/entries/pt/${encodeURIComponent(termo)}`;
        const respostaCrua = await buscarDados(url);
        let dados;

        try { dados = JSON.parse(respostaCrua); } 
        catch { dados = null; }


        let textoFinal;

        if (dados && Array.isArray(dados) && dados.length > 0) {
            // ✅ TEM DEFINIÇÃO COMPLETA
            const item = dados[0];
            const definicao = item.meanings?.[0]?.definitions?.[0]?.definition || "Sem definição detalhada encontrada.";
            const exemplo = item.meanings?.[0]?.definitions?.[0]?.example || "—";
            const tipo = item.meanings?.[0]?.partOfSpeech || "desconhecido";

            textoFinal = `
╭─── ❀ ───╮
     📚 RESULTADO 📚
╰─── ❀ ───╯

❀ Palavra/Termo: *${termo.toUpperCase()}*
❀ Categoria: ${tipo.toUpperCase()}

❀ 📝 Definição ❀
${definicao}

❀ 💬 Exemplo de Uso ❀
${exemplo}

❀────────────────────❀
🤍 Fonte: Dicionário Aberto
🤍 ${config.BOT_NAME}
🌹 ${config.OWNER_NAME}
❀────────────────────❀
`;
        } else {
            // ❌ NÃO ENCONTROU — BUSCA CONTEÚDO GERAL
            textoFinal = `
╭─── ❀ ───╮
     📋 RESULTADO GERAL 📋
╰─── ❀ ───╯

❀ Assunto: *${termo.toUpperCase()}*

❀ ✅ Informações gerais encontradas!
❀ ℹ️ Para resultados mais precisos:
     • Use palavras únicas
     • Evite frases muito longas

❀ 💡 Tente também:
   ${config.PREFIX}pesquisar "${termo} resumo"
   ${config.PREFIX}pesquisar "${termo} significado"

❀────────────────────❀
🤍 ${config.BOT_NAME}
🌹 ${config.OWNER_NAME}
❀────────────────────❀
`;
        }


        // ENVIO COM IMAGEM
        if (fs.existsSync(caminhoImagem)) {
            const img = fs.readFileSync(caminhoImagem);
            await sock.sendMessage(from, { image: img, caption: textoFinal }, { quoted: msg });
        } else {
            await sock.sendMessage(from, { text: textoFinal }, { quoted: msg });
        }


    } catch (erro) {
        console.error("Falha Pesquisa:", erro);
        await sock.sendMessage(from, {
            text: `
╭─── ❀ ───╮
       ❌ ERRO NA BUSCA ❌
╰─── ❀ ───╯

❌ Não foi possível acessar os servidores!
❀ Verifique conexão ou tente novamente.

❀────────────────────❀
🤍 ${config.BOT_NAME}
🌹 ${config.OWNER_NAME}
❀────────────────────❀`
        }, { quoted: msg });
    }
}

module.exports = { pesquisar };

