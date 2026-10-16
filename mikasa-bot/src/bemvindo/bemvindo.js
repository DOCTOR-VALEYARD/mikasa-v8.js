// src/bemvindo.js
const config = require("../../config");
const fs = require("fs");
const path = require("path");

// ✅ BANCO DO GRUPO (sincronizado com grupo.js)
const grupoDbPath = path.join(__dirname, "../dados/grupos.json");

// 📖 LER DADOS DO GRUPO
function lerGrupoDB() {
    if (!fs.existsSync(grupoDbPath)) {
        return {};
    }
    return JSON.parse(fs.readFileSync(grupoDbPath, "utf8"));
}

// 💾 SALVAR DADOS DO GRUPO
function salvarGrupoDB(db) {
    fs.writeFileSync(grupoDbPath, JSON.stringify(db, null, 2), "utf8");
}

async function bemvindo(sock, msg, args) {
    const from = msg.key.remoteJid;
    const isGroup = from.endsWith("@g.us");

    // 🚫 SÓ FUNCIONA DENTRO DE GRUPO
    if (!isGroup) {
        const aviso = `
✨ SISTEMA BOAS-VINDAS ✨

❌ Este comando só pode ser usado
dentro de grupos de conversa!

❀ ${config.BOT_NAME}`;
        return sock.sendMessage(from, { text: aviso }, { quoted: msg });
    }

    try {
        const db = lerGrupoDB();
        
        // ✅ INICIALIZA GRUPO SE NÃO EXISTIR
        if (!db[from]) {
            db[from] = { 
                antilink: false, 
                antinota: false,
                antinudes: false,
                bemvindo: false, 
                regras: "⚠️ Nenhuma regra definida ainda." 
            };
        }
        
        // ✅ ALTERNA O ESTADO
        const estadoAtual = db[from].bemvindo || false;
        const novoEstado = !estadoAtual;
        db[from].bemvindo = novoEstado;
        salvarGrupoDB(db);

        // ✅ MENSAGEM DE RESPOSTA
        const mensagemFinal = novoEstado ? `
✅ SISTEMA ATIVADO ✅

👋 BOAS-VINDAS: *ATIVADO*

❀ Agora quando alguém novo entrar,
receberá uma mensagem com foto! 🥳💬

❀ ${config.BOT_NAME}
` : `
❌ SISTEMA DESATIVADO ❌

👋 BOAS-VINDAS: *DESATIVADO*

❀ Nenhuma mensagem será enviada
quando novos membros entrarem.

❀ ${config.BOT_NAME}
`;

        await sock.sendMessage(from, { text: mensagemFinal }, { quoted: msg });

    } catch (erro) {
        console.error("Erro Bem-vindo:", erro);
        const erroMsg = `
❌ FALHA NO SISTEMA ❌

❀ Não foi possível alterar configuração!
❀ Verifique permissões ou tente novamente.

❀ ${config.BOT_NAME}
`;
        await sock.sendMessage(from, { text: erroMsg }, { quoted: msg });
    }
}

module.exports = { bemvindo, lerGrupoDB };

