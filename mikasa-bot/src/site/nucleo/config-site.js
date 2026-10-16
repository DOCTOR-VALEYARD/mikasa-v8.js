/* 🌐 Configuração do site (lê o bloco SITE do config.js, com valores padrão) */
const path = require("path");
const config = require("../../../config");

const RAIZ = path.resolve(__dirname, "../../..");
const DIR_DADOS = path.join(RAIZ, "database", "site");

const ARQUIVOS = {
    visitas: path.join(DIR_DADOS, "visitas.jsonl"),
    arquivos: path.join(DIR_DADOS, "arquivos.json"),
    mensagens: path.join(DIR_DADOS, "mensagens.json"),
    admin: path.join(DIR_DADOS, "admin.json"),
    segredo: path.join(DIR_DADOS, "segredo.key"),
    uploads: path.join(DIR_DADOS, "arquivos"),
    sites: path.join(DIR_DADOS, "sites"),
    web: path.join(__dirname, "..", "web")
};

function opcoes() {
    const c = config.SITE || {};
    return {
        ativo: c.ATIVO !== false,
        porta: Number(c.PORTA) > 0 ? Number(c.PORTA) : 3000,
        host: c.HOST || "0.0.0.0",
        nome: c.NOME || config.BOT_NAME || "Mikasa Bot",
        urlPublica: String(c.URL_PUBLICA || "").replace(/\/+$/, ""),
        confiarProxy: c.CONFIAR_PROXY === true,
        limiteUploadBytes: (Number(c.LIMITE_UPLOAD_MB) > 0 ? Number(c.LIMITE_UPLOAD_MB) : 300) * 1024 * 1024,
        limiteSiteBytes: (Number(c.LIMITE_SITE_MB) > 0 ? Number(c.LIMITE_SITE_MB) : 100) * 1024 * 1024,
        adminUsuario: String(c.ADMIN_USUARIO || "admin").slice(0, 30)
    };
}

module.exports = { RAIZ, DIR_DADOS, ARQUIVOS, opcoes, config };
