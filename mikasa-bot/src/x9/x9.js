/* =================================================
   🕵️ MIKASA BOT — X9 (BYPASS DE VISUALIZAÇÃO ÚNICA)
   📁 Arquivo: x9.js

   Quando ativado num chat, toda mensagem de "visualização
   única" (foto/vídeo que só pode ser vista uma vez) que
   passar por ali é baixada e reenviada como uma cópia
   normal — nunca mais desaparece.
================================================= */

const { downloadMediaMessage } = require("@whiskeysockets/baileys");
const fs = require("fs");
const path = require("path");

const x9Ativo = new Map(); // chatId -> true/false
const x9Path = path.join(__dirname, "../dados/viewonce-modo.json");

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

function gerenciarViewOnce(chatId) {
    if (x9Ativo.get(chatId)) {
        x9Ativo.set(chatId, false);
        salvarX9Disco();
        return "🔸 *VIEW-ONCE:* DESATIVADO\n_Visualização única volta ao normal._";
    } else {
        x9Ativo.set(chatId, true);
        salvarX9Disco();
        return "🕵️ *VIEW-ONCE:* ATIVADO\n_Toda visualização única enviada aqui vira uma cópia normal._";
    }
}

// Extrai a mensagem "de dentro" do envelope de visualização única,
// não importa qual das duas versões o WhatsApp usou pra embrulhar —
// e também desembrulha mensagens efêmeras (chat com "mensagens temporárias"
// ligado), porque nesse caso o view-once vem *dentro* do ephemeralMessage.
function extrairConteudoViewOnce(msg) {
    let m = msg.message;
    if (!m) return null;

    if (m.ephemeralMessage?.message) m = m.ephemeralMessage.message;
    if (m.viewOnceMessageV2Extension?.message) return m.viewOnceMessageV2Extension.message;

    const envelope = m.viewOnceMessageV2 || m.viewOnceMessage || m.viewOnceMessageV2Extension;
    if (envelope?.message) return envelope.message;

    // algumas versões mandam a imagem/vídeo/áudio direto com a flag viewOnce: true
    if (m.imageMessage?.viewOnce) return { imageMessage: m.imageMessage };
    if (m.videoMessage?.viewOnce) return { videoMessage: m.videoMessage };
    if (m.audioMessage?.viewOnce) return { audioMessage: m.audioMessage };

    return null;
}

// Chamar pra toda mensagem recebida. Retorna true se tratou o evento.
async function processarX9(sock, msg, from) {
    if (!x9Ativo.get(from)) return false;

    const conteudo = extrairConteudoViewOnce(msg);
    if (!conteudo) return false;

    try {
        // "engana" o downloadMediaMessage montando uma mensagem equivalente
        // sem o envelope de view-once, só com o conteúdo de dentro
        const msgParaBaixar = { key: msg.key, message: conteudo };
        const buffer = await downloadMediaMessage(msgParaBaixar, "buffer", {});

        const remetente = msg.key.participant || msg.key.remoteJid;
        const nomeRemetente = (remetente || "").split("@")[0];
        const legenda = conteudo.imageMessage?.caption || conteudo.videoMessage?.caption || "";
        const caption = `🕵️ *X9 ATIVADO*\nVisualização única de @${nomeRemetente}${legenda ? `\n\n${legenda}` : ""}`;

        if (conteudo.imageMessage) {
            await sock.sendMessage(from, { image: buffer, caption, mentions: [remetente] });
        } else if (conteudo.videoMessage) {
            await sock.sendMessage(from, { video: buffer, caption, mentions: [remetente] });
        } else if (conteudo.audioMessage) {
            // manda o áudio normal + um aviso separado com a marcação,
            // porque mensagem de áudio não tem campo de legenda
            await sock.sendMessage(from, {
                audio: buffer,
                mimetype: conteudo.audioMessage.mimetype || "audio/ogg; codecs=opus",
                ptt: !!conteudo.audioMessage.ptt
            });
            await sock.sendMessage(from, { text: caption, mentions: [remetente] });
        } else {
            return false;
        }
        return true;
    } catch (erro) {
        console.error("❌ Erro no X9 (view-once):", erro);
        return false;
    }
}

module.exports = { gerenciarViewOnce, processarX9 };
