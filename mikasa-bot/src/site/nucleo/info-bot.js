/* 🤖 Ponte entre o site e o bot: status, links, comandos, planos, avisos ao dono */
const fs = require("fs");
const path = require("path");
const { config, RAIZ } = require("./config-site");

let status = { conectado: false, numero: null, desde: null, ultimaMudanca: Date.now() };
let socket = null;
const inicioDoProcesso = Date.now();

function definirStatus(parcial = {}) {
    status = { ...status, ...parcial, ultimaMudanca: Date.now() };
    if (parcial.conectado === true && !status.desde) status.desde = Date.now();
    if (parcial.conectado === false) status.desde = null;
}
function vincularSocket(sock) { socket = sock; }
const obterStatus = () => ({ ...status, uptimeProcessoS: Math.floor((Date.now() - inicioDoProcesso) / 1000) });

function linkCanal() {
    const candidatos = [config.CHANNEL_URL, config.CHANNEL_LINK, config.CHANNEL, config.CANAL_URL, config.CANAL_LINK, config.CANAL];
    const v = candidatos.find(x => typeof x === "string" && x.trim());
    if (!v) return null;
    const limpo = v.trim();
    if (/^https?:\/\//i.test(limpo)) return limpo;
    if (/^(whatsapp\.com\/channel\/|wa\.me\/)/i.test(limpo)) return `https://${limpo}`;
    return /^[A-Za-z0-9._-]+$/.test(limpo) ? `https://whatsapp.com/channel/${limpo}` : null;
}

function linkCriador(mensagem = "Olá! Vim pelo site do Mikasa Bot.") {
    const numero = String(config.OWNER_NUMBER || "").replace(/\D/g, "");
    return numero ? `https://wa.me/${numero}?text=${encodeURIComponent(mensagem)}` : null;
}

function planos() {
    try {
        const vip = require("../../aluguel-planos/aluguel-planos");
        return vip.listarPlanos().map(p => ({ dias: p.dias, valor: p.valor, grupos: vip.limiteGruposPorDias(p.dias) }));
    } catch { return []; }
}

let cacheCategorias = { t: 0, dados: [] };
function categorias() {
    if (Date.now() - cacheCategorias.t < 10 * 60 * 1000 && cacheCategorias.dados.length) return cacheCategorias.dados;
    try {
        const m = require("../../menuBotoes/menuBotoes");
        const dados = Object.entries(m.montarCategorias())
            .filter(([nome]) => !/ADMIN|DONO/.test(nome))
            .map(([nome, comandos]) => ({ nome, comandos }));
        cacheCategorias = { t: Date.now(), dados };
        return dados;
    } catch {
        // plano B: conta os comandos direto do arquivo principal
        try {
            const txt = fs.readFileSync(path.join(RAIZ, "mikasabot.js"), "utf8");
            const nomes = [...new Set([...txt.matchAll(/case\s+"([^"]+)"/g)].map(m => m[1]))];
            return [{ nome: "Comandos", comandos: nomes }];
        } catch { return []; }
    }
}

function contagens() {
    let grupos = 0, usuarios = 0;
    try { grupos = Object.keys(require("../../grupo-db/grupo-db").getDB()).filter(k => k.endsWith("@g.us")).length; } catch {}
    try { usuarios = Object.keys(JSON.parse(fs.readFileSync(path.join(RAIZ, "database", "usuarios.json"), "utf8"))).length; } catch {}
    return { grupos, usuarios };
}

async function avisarDono(texto) {
    try {
        const numero = String(config.OWNER_NUMBER || "").replace(/\D/g, "");
        if (!socket || !status.conectado || !numero) return false;
        await socket.sendMessage(`${numero}@s.whatsapp.net`, { text: texto });
        return true;
    } catch { return false; }
}

module.exports = { definirStatus, vincularSocket, obterStatus, linkCanal, linkCriador, planos, categorias, contagens, avisarDono };
