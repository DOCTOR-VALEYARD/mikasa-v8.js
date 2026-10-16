/* =================================================
   🌐 MIKASA BOT — SITE (servidor + painel do dono)
   📁 Arquivo: site.js

   Sobe junto com o bot: basta ligar o bot (bash iniciar.sh) que o site funciona.
   É um servidor Node PURO (módulo http) — não precisa instalar nada novo.

   PÁGINAS:   /  (apresentação)   /downloads   /contato   /privacidade
   PAINEL:    /painel  (login) — visitas, quem entrou, erros, downloads, sites, mensagens
   HOSPEDAGEM: /sites/<nome>/  → você sobe um .zip pelo painel e vira um site
   DOWNLOADS: /baixar/<id>     → arquivos que você publica pelo painel ou pelo WhatsApp

   Configuração (opcional) no config.js:
     SITE: { ATIVO: true, PORTA: 3000, URL_PUBLICA: "https://seu-dominio.com",
             CONFIAR_PROXY: false, LIMITE_UPLOAD_MB: 300, LIMITE_SITE_MB: 100 }
   Na PRIMEIRA vez, a senha do painel aparece no terminal (e fica guardada com hash).
   Esqueceu? No WhatsApp (dono):  <prefixo>site senha
================================================= */

const http = require("http");
const { opcoes } = require("./nucleo/config-site");
const A = require("./nucleo/armazenamento");
const S = require("./nucleo/seguranca");
const V = require("./nucleo/visitas");
const B = require("./nucleo/info-bot");
const R = require("./nucleo/rotas");

let servidor = null;
const PAGINAS_CONTADAS = new Set(["/", "/downloads", "/contato", "/privacidade"]);

// Decide se esse acesso vai pro registro de visitas / erros.
function registrarAcesso(req, res) {
    try {
        const caminho = String(req.url || "").split("?")[0];
        if (caminho.startsWith("/api/") || caminho === "/saude" || caminho === "/painel" || caminho.startsWith("/assets/")) {
            // erros de arquivos/páginas aparecem; chamadas de API do painel e assets não
            if (!(res.statusCode >= 400 && caminho.startsWith("/assets/"))) return;
        }
        let tipo = null;
        if (res.statusCode >= 400) tipo = "erro";
        else if (req.method === "GET") {
            if (PAGINAS_CONTADAS.has(caminho)) tipo = "pagina";
            else if (caminho.startsWith("/baixar/")) tipo = "download";
            else if (caminho.startsWith("/sites/") && (caminho.endsWith("/") || /\.html?$/i.test(caminho))) tipo = "pagina";
        }
        if (!tipo) return;
        V.registrar({
            ip: R.ipDoCliente(req), metodo: req.method, caminho: req.url, status: res.statusCode,
            ua: req.headers["user-agent"], ref: req.headers.referer,
            pais: opcoes().confiarProxy ? req.headers["cf-ipcountry"] : "", tipo
        });
    } catch {}
}

function iniciar() {
    const o = opcoes();
    if (!o.ativo || servidor) return servidor;

    try {
        A.garantirPastas();
        V.iniciar();
        const adm = S.garantirAdmin();
        if (adm.criado) {
            console.log("\n╔══════════════════════════════════════════════╗");
            console.log("║  🌐 SITE — PAINEL DO DONO (guarde esta senha) ║");
            console.log(`║  Usuário: ${adm.usuario.padEnd(34)}║`);
            console.log(`║  Senha:   ${adm.senha.padEnd(34)}║`);
            console.log("║  Perdeu? No WhatsApp: <prefixo>site senha    ║");
            console.log("╚══════════════════════════════════════════════╝\n");
        }
    } catch (erro) {
        console.error("🌐 [site] erro ao preparar o site:", erro.message);
        return null;
    }

    servidor = http.createServer((req, res) => {
        res.on("finish", () => registrarAcesso(req, res));
        R.tratar(req, res).catch(erro => {
            const status = erro?.status || 500;
            if (status >= 500) console.error("🌐 [site] erro:", erro?.stack || erro);
            if (res.headersSent) return res.destroy();
            const corpo = JSON.stringify({ ok: false, erro: status >= 500 ? "Erro interno do servidor." : erro.message });
            res.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Content-Length": Buffer.byteLength(corpo) });
            res.end(corpo);
        });
    });
    servidor.headersTimeout = 30 * 1000;
    servidor.keepAliveTimeout = 5 * 1000;
    servidor.requestTimeout = 30 * 60 * 1000; // uploads grandes em conexão lenta
    servidor.on("clientError", (_e, socket) => { try { socket.end("HTTP/1.1 400 Bad Request\r\n\r\n"); } catch {} });
    servidor.on("error", erro => {
        console.error(erro.code === "EADDRINUSE"
            ? `🌐 [site] a porta ${o.porta} já está em uso — o bot segue normal, só o site não subiu. Mude SITE.PORTA no config.js.`
            : `🌐 [site] erro no servidor: ${erro.message}`);
        servidor = null;
    });
    servidor.listen(o.porta, o.host, () => console.log(`🌐 Site no ar: http://localhost:${o.porta}   (painel: /painel)`));
    return servidor;
}

function parar() {
    if (servidor) { servidor.close(); servidor = null; }
}

module.exports = {
    iniciar, parar,
    definirStatus: B.definirStatus,
    vincularSocket: B.vincularSocket,
    comandoSite: (...a) => require("./nucleo/comando-site").comandoSite(...a)
};
