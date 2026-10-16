/* =================================================
   🗑️ MIKASA BOT — SISTEMA ANTI-DELETE
   📁 Arquivo: antidelete.js

   Guarda uma cópia leve de cada mensagem em memória.
   Quando alguém apaga uma mensagem (delete pra todos),
   o WhatsApp manda uma "protocolMessage" tipo REVOKE
   avisando qual mensagem foi apagada — aí a gente busca
   ela no nosso cache e reposta pro grupo, marcando quem
   mandou originalmente.

   ⚠️ Só pega mensagens que passaram pelo bot DEPOIS que
   ele ficou online (não tem como recuperar histórico de
   antes do bot ligar).
================================================= */

const { downloadMediaMessage, proto } = require("@whiskeysockets/baileys");
const fs = require("fs");
const path = require("path");

const LIMITE_CACHE = 500;           // não deixa crescer pra sempre
const LIMITE_TAMANHO_MIDIA = 5 * 1024 * 1024; // 5MB — mídia maior que isso não é cacheada (economia de RAM)

const cache = new Map(); // chave: `${remoteJid}::${id}` -> { tipo, conteudo, remetente, timestamp, midia, mimetype }

// ── LIGA/DESLIGA POR CHAT (comando .x9) ──
// A mensagem SEMPRE é cacheada (senão não tem como recuperar depois),
// mas só é REENVIADA se o X9 estiver ativo naquele chat.
const x9Ativo = new Map(); // chatId -> true/false
const x9Path = path.join(__dirname, "../dados/x9-modo.json");

(function carregarX9Inicial() {
    try {
        if (fs.existsSync(x9Path)) {
            const salvo = JSON.parse(fs.readFileSync(x9Path, "utf8"));
            for (const chave of Object.keys(salvo)) x9Ativo.set(chave, !!salvo[chave]);
        }
    } catch (e) {
        console.error("❌ Erro ao carregar estado do X9:", e);
    }
})();

function salvarX9Disco() {
    try {
        const obj = {};
        for (const [chave, valor] of x9Ativo.entries()) obj[chave] = valor;
        fs.writeFileSync(x9Path, JSON.stringify(obj, null, 2), "utf8");
    } catch (e) {
        console.error("❌ Erro ao salvar estado do X9:", e);
    }
}

// 🕵️ Comando .x9 — liga/desliga o aviso de mensagem apagada nesse chat
function gerenciarX9(chatId) {
    if (x9Ativo.get(chatId)) {
        x9Ativo.set(chatId, false);
        salvarX9Disco();
        return "🔸 *X9:* DESATIVADO\n_Não vou mais avisar quando apagarem mensagem aqui._";
    } else {
        x9Ativo.set(chatId, true);
        salvarX9Disco();
        return "🕵️ *X9:* ATIVADO\n_Toda mensagem apagada aqui, eu mostro de volta._";
    }
}

function chave(remoteJid, id) {
    return `${remoteJid}::${id}`;
}

function listarChavesGrupo(remoteJid) {
    const prefixo = `${remoteJid}::`;
    const resultado = [];
    for (const [chaveCache, dados] of cache.entries()) {
        if (!chaveCache.startsWith(prefixo)) continue;
        resultado.push({ id: chaveCache.slice(prefixo.length), remetente: dados.remetente });
    }
    return resultado;
}

function limitarCache() {
    while (cache.size > LIMITE_CACHE) {
        const primeiraChave = cache.keys().next().value;
        cache.delete(primeiraChave);
    }
}

// 📥 Chamar pra TODA mensagem normal recebida (guarda uma cópia)
async function cachearMensagem(msg) {
    try {
        if (!msg.message || msg.message.protocolMessage) return; // não cacheia a própria notificação de delete
        const from = msg.key.remoteJid;
        const id = msg.key.id;
        if (!from || !id) return;

        const remetente = msg.key.participant || msg.key.remoteJid;
        const m = msg.message;

        let tipo = "texto";
        let conteudo = "";
        let midia = null;
        let mimetype = null;

        if (m.conversation) {
            conteudo = m.conversation;
        } else if (m.extendedTextMessage?.text) {
            conteudo = m.extendedTextMessage.text;
        } else if (m.imageMessage) {
            tipo = "imagem";
            conteudo = m.imageMessage.caption || "";
            if ((m.imageMessage.fileLength || 0) < LIMITE_TAMANHO_MIDIA) {
                try { midia = await downloadMediaMessage(msg, "buffer", {}); mimetype = "image/jpeg"; } catch { midia = null; }
            }
        } else if (m.videoMessage) {
            tipo = "vídeo";
            conteudo = m.videoMessage.caption || "";
            if ((m.videoMessage.fileLength || 0) < LIMITE_TAMANHO_MIDIA) {
                try { midia = await downloadMediaMessage(msg, "buffer", {}); mimetype = "video/mp4"; } catch { midia = null; }
            }
        } else if (m.audioMessage) {
            tipo = "áudio";
            conteudo = "";
        } else if (m.stickerMessage) {
            tipo = "figurinha";
            conteudo = "";
        } else if (m.documentMessage) {
            tipo = "documento";
            conteudo = m.documentMessage.fileName || "";
        } else {
            return; // tipo não tratado (ex: reação, enquete, etc.) — ignora
        }

        cache.set(chave(from, id), {
            tipo, conteudo, remetente, mimetype,
            midia, timestamp: Date.now()
        });
        limitarCache();
    } catch (erro) {
        console.error("❌ Erro ao cachear mensagem (anti-delete):", erro);
    }
}

// 🗑️ Chamar pra TODA mensagem recebida — detecta se é um aviso de "apagada"
// Retorna true se tratou o evento (pra quem chamou saber que já foi cuidado)
async function verificarMensagemApagada(sock, msg) {
    try {
        const protocolo = msg.message?.protocolMessage;
        const ehRevoke = protocolo && (
            protocolo.type === proto.Message.ProtocolMessage.Type.REVOKE ||
            protocolo.type === 0 // REVOKE = 0 em algumas versões do baileys, só por garantia
        );
        if (!ehRevoke) return false;

        const from = protocolo.key?.remoteJid || msg.key.remoteJid;
        const chaveOriginal = protocolo.key;
        if (!chaveOriginal?.id) return false;

        const dados = cache.get(chave(from, chaveOriginal.id));
        if (!dados) {
            // não tínhamos essa mensagem em cache — não dá pra recuperar o conteúdo
            return false;
        }
        cache.delete(chave(from, chaveOriginal.id));

        // 🔸 X9 desligado nesse chat -> não mostra a mensagem apagada
        if (!x9Ativo.get(from)) return true;

        const nomeRemetente = (dados.remetente || "").split("@")[0];
        const legenda = `
┅┄┅┄『 ✦ 🗑️ ✦ 』┄┅┄┅┄
> MENSAGEM APAGADA
┅┄┅┄『 ✦ 🗑️ ✦ 』┄┅┄┅┄
┅┄┅┄『 🙋 De:   』 
@${nomeRemetente}
┅┄┅┄『 📦 Tipo: 』 
${dados.tipo}

${dados.conteudo ? `
┅┄┅┄『 📝 Conteúdo 』: 
${dados.conteudo}` : ""}
┅┄┅┄『 ✦ 』┄┅┄┅┄`;

        if (dados.midia && dados.tipo === "imagem") {
            await sock.sendMessage(from, { image: dados.midia, caption: legenda, mentions: [dados.remetente] });
        } else if (dados.midia && dados.tipo === "vídeo") {
            await sock.sendMessage(from, { video: dados.midia, caption: legenda, mentions: [dados.remetente] });
        } else {
            await sock.sendMessage(from, { text: legenda, mentions: [dados.remetente] });
        }
        return true;
    } catch (erro) {
        console.error("❌ Erro ao processar mensagem apagada (anti-delete):", erro);
        return false;
    }
}

module.exports = { cachearMensagem, verificarMensagemApagada, gerenciarX9, listarChavesGrupo };
