/* 💬 Comando do dono no WhatsApp: /site  (status, nova senha, enviar arquivo pro site) */
const fs = require("fs");
const path = require("path");
const os = require("os");
const { ARQUIVOS, opcoes, config } = require("./config-site");
const U = require("./util-http");
const A = require("./armazenamento");
const S = require("./seguranca");
const V = require("./visitas");
const B = require("./info-bot");

function enderecos() {
    const o = opcoes();
    const lista = [];
    if (o.urlPublica) lista.push(`🌍 ${o.urlPublica}`);
    for (const i of Object.values(os.networkInterfaces()).flat()) {
        if (i && i.family === "IPv4" && !i.internal) lista.push(`📶 http://${i.address}:${o.porta}`);
    }
    lista.push(`📱 http://localhost:${o.porta} (neste celular)`);
    return lista;
}

function achar(mensagem) {
    const base = mensagem?.message || {};
    const ctx = base.extendedTextMessage?.contextInfo;
    const q = ctx?.quotedMessage;
    const conteudo = q?.ephemeralMessage?.message || q?.viewOnceMessage?.message || q || base;
    for (const [tipo, parte] of [["documentMessage", "document"], ["videoMessage", "video"], ["audioMessage", "audio"], ["imageMessage", "image"]]) {
        if (conteudo?.[tipo]) return { parte: conteudo[tipo], tipoDownload: parte, tipoMsg: tipo };
    }
    return null;
}

async function subirArquivo(sock, msg, titulo) {
    const alvo = achar(msg);
    if (!alvo) return "📎 Responda (marque) um *arquivo, vídeo, áudio ou foto* com:\n*" + config.PREFIX + "site upload Título do arquivo*";
    const limite = opcoes().limiteUploadBytes;
    if (Number(alvo.parte.fileLength || 0) > limite) return `❌ Arquivo maior que o limite do site (${Math.round(limite / 1048576)} MB).`;

    const { downloadContentFromMessage } = require("@whiskeysockets/baileys");
    const id = U.idAleatorio(6);
    const extPadrao = { documentMessage: "", videoMessage: ".mp4", audioMessage: ".mp3", imageMessage: ".jpg" }[alvo.tipoMsg];
    const nome = A.nomeSeguro(alvo.parte.fileName || `${titulo || "arquivo"}${extPadrao}`);
    const ext = path.extname(nome).toLowerCase().replace(/[^.a-z0-9]/g, "").slice(0, 10);
    const guardado = `${id}${ext}`;
    A.garantirPastas();
    const destino = path.join(ARQUIVOS.uploads, guardado);
    let total = 0;
    try {
        const fluxo = await downloadContentFromMessage(alvo.parte, alvo.tipoDownload);
        const saida = fs.createWriteStream(destino, { mode: 0o640 });
        for await (const pedaco of fluxo) {
            total += pedaco.length;
            if (total > limite) throw new Error("arquivo maior que o limite");
            if (!saida.write(pedaco)) await new Promise(r => saida.once("drain", r));
        }
        await new Promise((r, j) => saida.end(e => e ? j(e) : r()));
    } catch (e) {
        try { fs.unlinkSync(destino); } catch {}
        return `❌ Não consegui baixar o arquivo: ${e.message}`;
    }
    const lista = A.listaArquivos();
    lista.push({ id, titulo: A.limparTexto(titulo, 100) || nome, descricao: "", categoria: "", nome, arquivo: guardado, tamanho: total, mime: U.mimeDe(nome), publico: true, baixadas: 0, criadoEm: Date.now() });
    A.salvarArquivos(lista);
    return `✅ *Arquivo publicado no site!*\n\n📄 ${A.limparTexto(titulo, 100) || nome}\n📦 ${(total / 1048576).toFixed(2)} MB\n🔗 /baixar/${id}`;
}

async function comandoSite(sock, msg, args) {
    const from = msg.key.remoteJid;
    const autor = msg.key.participant || from;
    const { ehDono } = require("../../utils-validacao/utils-validacao");
    const responder = t => sock.sendMessage(from, { text: t }, { quoted: msg });

    if (!ehDono([autor, msg.key.participantAlt, from], config.OWNER_NUMBER)) {
        return responder("🚫 Só o dono do bot pode usar o comando do site.");
    }
    if (!opcoes().ativo) return responder("⚠️ O site está desligado (SITE.ATIVO: false no config.js).");

    const sub = String(args?.[0] || "").toLowerCase();

    if (sub === "senha") {
        const nova = S.redefinirSenha();
        const dono = `${String(config.OWNER_NUMBER).replace(/\D/g, "")}@s.whatsapp.net`;
        const texto = `🔐 *Nova senha do painel*\n\n👤 Usuário: ${opcoes().adminUsuario}\n🔑 Senha: ${nova}\n\nTodos os logins antigos foram encerrados. Troque a senha no painel.`;
        if (String(from).endsWith("@g.us")) {
            await sock.sendMessage(dono, { text: texto }).catch(() => {});
            return responder("🔐 Nova senha gerada e enviada no seu privado.");
        }
        return responder(texto);
    }

    if (sub === "upload") {
        const titulo = (args || []).slice(1).join(" ").trim();
        return responder(await subirArquivo(sock, msg, titulo));
    }

    const r = V.resumo();
    const mensagens = A.lerJson(ARQUIVOS.mensagens, []);
    return responder(
        `🌐 *SITE — ${opcoes().nome}*\n\n` +
        `${enderecos().join("\n")}\n\n` +
        `📊 Hoje: ${r.hoje.visitas} visitas (${r.hoje.unicos} pessoas)\n` +
        `📈 Total: ${r.total.visitas} visitas (${r.total.unicos} pessoas)\n` +
        `📥 Arquivos: ${A.listaArquivos().length}  •  🌍 Sites: ${A.listaSites().length}\n` +
        `📩 Mensagens novas: ${mensagens.filter(m => !m.lida).length}\n\n` +
        `🔧 Painel: */painel*\n` +
        `• ${config.PREFIX}site senha — gerar nova senha\n` +
        `• ${config.PREFIX}site upload Título — (respondendo um arquivo) publica no site`
    );
}

module.exports = { comandoSite, enderecos };
