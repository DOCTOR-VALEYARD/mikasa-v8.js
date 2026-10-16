/* =================================================
   🎵 MENU DE MÍDIAS — card personalizado por solicitação
   O nome do solicitante fica somente dentro da imagem.
   Nenhum telefone, JID, LID ou identificador é exibido no texto.
================================================= */

const fs = require("fs");
const path = require("path");
const config = require("../../config");
const { criarCardMenuMidias } = require("../cardGenerator/cardGenerator");
const { enviarCardOuAnimado } = require("../card-envio/card-envio");
const { buscarFotoContexto } = require("../foto-contexto/foto-contexto");

function nomeSeguro(msg, metadata) {
    const autor = msg?.key?.participantAlt || msg?.key?.participant || msg?.key?.remoteJid;
    const participante = metadata?.participants?.find(p =>
        [p.id, p.lid, p.jid, p.participantAlt].filter(Boolean).some(id => String(id) === String(autor))
    );
    const nome = String(msg?.pushName || participante?.name || participante?.notify || "Usuário").trim();
    // Remove identificadores acidentais caso o WhatsApp não forneça um nome real.
    const limpo = nome.replace(/[+]?\d{6,}/g, "").replace(/[@]/g, "").trim();
    return limpo || "Usuário";
}

async function menumidias(sock, msg) {
    const from = msg?.key?.remoteJid;
    if (!from) return;

    const caminhoImagem = path.join(__dirname, "../../media_menu_card.png");
    let metadata = null;
    try { if (from.endsWith("@g.us")) metadata = await sock.groupMetadata(from); } catch {}
    const nome = nomeSeguro(msg, metadata);

    const legenda = `🌸┈┈┈┈┈┈┈┈┈┈┈┈┈┈🌸
✨ 『 ${config.BOT_NAME} 』✨
🌸┈┈┈┈┈┈┈┈┈┈┈┈┈┈🌸

🎵 ᶜᵉⁿᵗʳᵃˡ ᵈᵉ ᴹíᵈⁱᵃˢ
ᵉˢᶜᵒˡʰᵃ ᵘᵐᵃ ᵒᵖᶜ̧ᵃ̃ᵒ ᵒᵘ ᵈⁱᵍⁱᵗᵉ ᵒ ᶜᵒᵐᵃⁿᵈᵒ ᵐᵃⁿᵘᵃˡᵐᵉⁿᵗᵉ

🌷┈┈┈┈┈┈┈┈┈┈┈┈┈┈🌷
🎶 𝑴𝑼́𝑺𝑰𝑪𝑨 & 𝑨́𝑼𝑫𝑰𝑶
🌷┈┈┈┈┈┈┈┈┈┈┈┈┈┈🌷
🌸 ${config.PREFIX}ᵖˡᵃʸ ᵑᵒᵐᵉ ᵒᵘ ˡⁱⁿᵏ
🌸 ${config.PREFIX}ᵖˡᵃʸ ᵐᵖ⁴ ᵑᵒᵐᵉ ᵒᵘ ˡⁱⁿᵏ
🌸 ${config.PREFIX}ᵈᵛᶜˡ-ʸᵗ ˡⁱⁿᵏ — ˢᵒᵐᵉⁿᵗᵉ ᵃ́ᵘᵈⁱᵒ

🌷┈┈┈┈┈┈┈┈┈┈┈┈┈┈🌷
🎬 𝑽𝑰́𝑫𝑬𝑶𝑺 𝑷𝑶𝑹 𝑳𝑰𝑵𝑲
🌷┈┈┈┈┈┈┈┈┈┈┈┈┈┈🌷
🌸 ${config.PREFIX}ᵛⁱᵈᵉᵒ ˡⁱⁿᵏ
🌸 ${config.PREFIX}ᵗⁱᵏᵗᵒᵏ ˡⁱⁿᵏ
🌸 ${config.PREFIX}ⁱⁿˢᵗᵃᵍʳᵃᵐ ˡⁱⁿᵏ
🌸 ${config.PREFIX}ᵏʷᵃⁱ ˡⁱⁿᵏ

🌷┈┈┈┈┈┈┈┈┈┈┈┈┈┈🌷
🖼️ 𝑭𝑰𝑮𝑼𝑹𝑰𝑵𝑯𝑨 & 𝑪𝑶𝑵𝑽𝑬𝑹𝑺𝑨̃𝑶
🌷┈┈┈┈┈┈┈┈┈┈┈┈┈┈🌷
🌸 ${config.PREFIX}ˢ ᵒᵘ ${config.PREFIX}ˢᵗⁱᶜᵏᵉʳ
🌸 ${config.PREFIX}ᶠ ᵒᵘ ${config.PREFIX}ᵍⁱᶠ
🌸 ${config.PREFIX}ᵗᵒⁱᵐᵍ
🌸 ${config.PREFIX}ᵈᵛᶜˡ-ᵃᵘᵗᵒ — ᵃᵘᵗᵒᵐᵃ́ᵗⁱᶜᵃ (ᵃᵈᵐⁱⁿ ᵃᵗⁱᵛᵃ)

🌷┈┈┈┈┈┈┈┈┈┈┈┈┈┈🌷
📂 𝑨𝑹𝑸𝑼𝑰𝑽𝑶𝑺 & 𝑪𝑶𝑳𝑬𝑪̧𝑨̃𝑶
🌷┈┈┈┈┈┈┈┈┈┈┈┈┈┈🌷
🌸 ${config.PREFIX}ᵈᵛᶜˡ
🌸 ${config.PREFIX}ᵈᵛᶜˡ-ᴾʳᵗ ˡⁱⁿᵏ — ᴾⁱⁿᵗᵉʳᵉˢᵗ
🌸 ${config.PREFIX}ʰⁱˢᵗᵒʳⁱᶜᵒ-ᵈᵛᶜˡ

💐┈┈┈┈┈┈┈┈┈┈┈┈┈┈💐
🌷 ${config.BOT_NAME} • ${config.OWNER_NAME}
💐┈┈┈┈┈┈┈┈┈┈┈┈┈┈💐`.trim();

    try {
        const fotoBuffer = fs.existsSync(caminhoImagem) ? fs.readFileSync(caminhoImagem) : null;
        const fotoContextoBuffer = await buscarFotoContexto(sock, from);
        // O caption contém somente o menu. Nome e solicitação ficam na imagem, com a marca do bot sempre presente no card.
        return await enviarCardOuAnimado(sock, from, (fundoBuffer) => criarCardMenuMidias({ fotoBuffer, botName: config.BOT_NAME, nomeSolicitante: nome, fotoContextoBuffer, fundoBuffer }), { caption: legenda, mentions: [] }, msg);
    } catch (erro) {
        console.error("❌ Erro ao gerar menu de mídias:", erro.message);
        return sock.sendMessage(from, { text: legenda }, { quoted: msg });
    }
}

module.exports = { menumidias };
