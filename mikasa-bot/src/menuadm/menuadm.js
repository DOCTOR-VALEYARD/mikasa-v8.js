// src/menuadm.js
const config = require("../../config");
const fs = require("fs");
const path = require("path");


// ═══════════════════════════════════════════════════════════════
// 🛡️ MENU ADMINISTRATIVO
// ═══════════════════════════════════════════════════════════════

async function menuadm(sock, msg) {

    const from =
        msg?.key?.remoteJid;

    if (!from) {
        return;
    }


    // 🔐 Somente administradores podem abrir o painel administrativo.
    try {
        const meta = await sock.groupMetadata(from);
        const autor = msg.key.participant || msg.key.remoteJid;
        const admin = meta.participants.some(p => (p.id === autor || p.lid === autor) && p.admin);
        if (!admin) return sock.sendMessage(from, { text: "❌ O menu administrativo é exclusivo para administradores." }, { quoted: msg });
    } catch {
        return sock.sendMessage(from, { text: "❌ Não consegui verificar sua permissão de administrador." }, { quoted: msg });
    }

    // ═════════════════════════════════════════════════════════════
    // 🖼️ IMAGEM DO MENU
    // ═════════════════════════════════════════════════════════════

    const caminhoImagem =
        path.join(
            __dirname, "../midias/imagens/menu.png"
        );


    // ═════════════════════════════════════════════════════════════
    // 📋 MENU
    // ═════════════════════════════════════════════════════════════

    const resposta = `🌸━━━━━━〔 🛡️ 〕━━━━━━🌸
𝑴𝑬𝑵𝑼 𝑨𝑫𝑴𝑰𝑵𝑰𝑺𝑻𝑹𝑨𝑻𝑰𝑽𝑶
🌸━━━━━━〔 🛡️ 〕━━━━━━🌸

🔐 ᵃʳᵉᵃ ᵉˣᶜˡᵘˢⁱᵛᵃ ᵖᵃʳᵃ ᵃᵈᵐⁱⁿⁱˢᵗʳᵃᵈᵒʳᵉˢ

━━━━〔 📊 〕━━━━
𝑹𝑬𝑺𝑼𝑴𝑶 𝑬 𝑨𝑻𝑰𝑽𝑰𝑫𝑨𝑫𝑬
━━━━〔 📊 〕━━━━
> 🌸 ${config.PREFIX}ʳᵉˢᵘᵐᵒ
> 🌸 ${config.PREFIX}ᵃᵗⁱᵛⁱᵈᵃᵈᵉˢ
> 🌸 ${config.PREFIX}ᵗᵒᵖ10
> 🌸 ${config.PREFIX}ʳᵃⁿᵏᵃᵗⁱᵛᵒ
> 🌸 ${config.PREFIX}ᵗᵉᵐᵖᵒ
> 🌸 ${config.PREFIX}ʳᵉˡᵃᵗᵒʳⁱᵒ

━━━━〔 ⚔️ 〕━━━━
           ᵍʳᵘᵖᵒˢ 
━━━━〔 ⚔️ 〕━━━━
> 🌸 ${config.PREFIX}ᵇᵃⁿ
> 🌸 ${config.PREFIX}ᵏⁱᶜᵏ
> 🌸 ${config.PREFIX}ᵖʳᵒᵐᵒᵛᵉʳ
> 🌸 ${config.PREFIX}ʳᵉᵇᵃⁱˣᵃʳ
> 🌸 ${config.PREFIX}ᵃᵛⁱˢᵒ
> 🌸 ${config.PREFIX}ᵐᵃʳᶜᵃʳ
> 🌸 ${config.PREFIX}ʰⁱᵈᵉᵗᵃᵍ
> 🌸 ${config.PREFIX}ᶜⁱᵗᵃʳ
> 🌸 ${config.PREFIX}ˢᵃⁱʳ
> 🌸 ${config.PREFIX}ᵃᵇʳⁱʳ
> 🌸 ${config.PREFIX}ᶠᵉᶜʰᵃʳ
> 🌸 ${config.PREFIX}ᵃˡᵘᵍᵃʳ

━━━━〔 🔒 〕━━━━
    𝑺𝑬𝑮𝑼𝑹𝑨𝑵𝑪̧𝑨 
━━━━〔 🔒 〕━━━━
> 🌸 ${config.PREFIX}ᵃⁿᵗⁱˡⁱⁿᵏ
> 🌸 ${config.PREFIX}ᵃⁿᵗⁱⁿᵒᵗᵃ
> 🌸 ${config.PREFIX}ᵃⁿᵗⁱᶠᵃᵏᵉ
> 🌸 ${config.PREFIX}ᵃⁿᵗⁱᵖᵃˡᵃᵛʳᵃᵒ
> 🌸 ${config.PREFIX}ᵃⁿᵗⁱˢᵖᵃᵐ
> 🌸 ${config.PREFIX}ᵃⁿᵗⁱᶠˡᵒᵒᵈ
> 🌸 ${config.PREFIX}ᵈᵛᶜˡ-ᵃᵘᵗᵒ
> 🌸 ${config.PREFIX}ᵈᵛᶜˡ1
> 🌸 ${config.PREFIX}ᵈᵛᶜˡ0
> 🌸 ${config.PREFIX}ᵇᵉᵐᵛⁱⁿᵈᵒ
> 🌸 ${config.PREFIX}ᵃᶜᵉⁱᵗᵃʳ
> 🌸 ${config.PREFIX}ᵐᵉⁿᶜᵃᵒ
> 🌸 ${config.PREFIX}ˢᵃᵘᵈᵃᶜᵃᵒ
> 🌸 ${config.PREFIX}ᵇˡᵃᶜᵏˡⁱˢᵗ
> 🌸 ${config.PREFIX}ˡⁱˢᵗᵃ
> 🌸 ${config.PREFIX}ˡⁱᵐᵖᵃʳᵇᵒᵗ
> 🌸 ${config.PREFIX}ᵃᵗⁱᵛᵃʳ
> 🌸 ${config.PREFIX}ᵈᵉˢᵃᵗⁱᵛᵃʳ

━━━━〔 🧰 〕━━━━
    𝑭𝑬𝑹𝑹𝑨𝑴𝑬𝑵𝑻𝑨𝑺
━━━━〔 🧰 〕━━━━
> 🌸 ${config.PREFIX}ᵃᵈᵈ
> 🌸 ${config.PREFIX}ˡⁱˢᵗᵃ
> 🌸 ${config.PREFIX}ᵗⁱʳᵃʳˡⁱˢᵗᵃ
> 🌸 ${config.PREFIX}ˡᵒᵍᵇᵃⁿ
> 🌸 ${config.PREFIX}ᵐᵒᵈᵘˡᵒˢ
> 🌸 ${config.PREFIX}ᶜᵃˡᶜ
> 🌸 ${config.PREFIX}ʷⁱᵏⁱ
> 🌸 ${config.PREFIX}ᵉⁿᶜᵘʳᵗᵃʳ
> 🌸 ${config.PREFIX}ᵗʳᵃᵈᵘᶻⁱʳ
> 🌸 ${config.PREFIX}ᵇᵃˢᵉ64
> 🌸 ${config.PREFIX}ᵐᵈ5
> 🌸 ${config.PREFIX}ˢᵖᵒⁱˡᵉʳ
> 🌸 ${config.PREFIX}ˤʳᶜᵒᵈᵉ
> 🌸 ${config.PREFIX}ᵐᵉ
> 🌸 ${config.PREFIX}ᵃᵈᵐˢ

━━━━〔 ⚡ 〕━━━━
             𝑨𝑫𝑴𝑰𝑵 
━━━━〔 ⚡ 〕━━━━
🌷 sistema: ${config.BOT_NAME}
🌷 responsável: ${config.OWNER_NAME}
🌷 ᵃᶜᵉˢˢᵒ: ᵃᵈᵐⁱⁿⁱˢᵗʳᵃᵗⁱᵛᵒ
🌷 ˢᵗᵃᵗᵘˢ: 𝘖𝘱𝘦𝘳𝘢𝘤𝘪𝘰𝘯𝘢𝘭 🟢`;


    // ═════════════════════════════════════════════════════════════
    // 📤 ENVIO
    // ═════════════════════════════════════════════════════════════

    try {

        if (fs.existsSync(caminhoImagem)) {

            const bufferImagem =
                fs.readFileSync(
                    caminhoImagem
                );


            await sock.sendMessage(
                from,
                {
                    image: bufferImagem,
                    caption: resposta
                },
                {
                    quoted: msg
                }
            );

            return;
        }


        // ─────────────────────────────────────────────────────────
        // ⚠️ FALLBACK SEM IMAGEM
        // ─────────────────────────────────────────────────────────

        await sock.sendMessage(
            from,
            {
                text:
                    `${resposta}\n\n` +
                    `⚠️ *Imagem do menu não localizada.*`
            },
            {
                quoted: msg
            }
        );

    } catch (erro) {

        console.error(
            "❌ Erro ao enviar menu administrativo:",
            erro
        );
    }
}


// ═══════════════════════════════════════════════════════════════
// 📦 EXPORTAÇÃO
// ═══════════════════════════════════════════════════════════════

module.exports = {
    menuadm
};