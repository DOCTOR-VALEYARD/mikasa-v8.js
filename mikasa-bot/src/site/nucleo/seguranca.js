/* 🔐 Segurança do site: senha (scrypt), sessão assinada, limite de tentativas, cabeçalhos */
const fs = require("fs");
const crypto = require("crypto");
const { ARQUIVOS, opcoes } = require("./config-site");
const { lerJson, gravarJson, garantirPastas } = require("./armazenamento");

const DURACAO_SESSAO_MS = 12 * 60 * 60 * 1000;
const ALFABETO = "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";

// ---------- senha ----------
function hashSenha(senha) {
    const sal = crypto.randomBytes(16).toString("hex");
    const hash = crypto.scryptSync(String(senha), sal, 64).toString("hex");
    return `scrypt$${sal}$${hash}`;
}

function conferirHash(senha, guardado) {
    try {
        const [tipo, sal, hash] = String(guardado).split("$");
        if (tipo !== "scrypt") return false;
        const calculado = crypto.scryptSync(String(senha), sal, 64);
        const esperado = Buffer.from(hash, "hex");
        return calculado.length === esperado.length && crypto.timingSafeEqual(calculado, esperado);
    } catch { return false; }
}

function gerarSenha(tamanho = 14) {
    let s = "";
    const bytes = crypto.randomBytes(tamanho);
    for (let i = 0; i < tamanho; i++) s += ALFABETO[bytes[i] % ALFABETO.length];
    return s;
}

// Cria o administrador na primeira vez (devolve a senha UMA vez, pra mostrar no terminal).
function garantirAdmin() {
    garantirPastas();
    const atual = lerJson(ARQUIVOS.admin, null);
    if (atual?.hash) return { criado: false };
    const senha = gerarSenha();
    gravarJson(ARQUIVOS.admin, { usuario: opcoes().adminUsuario, hash: hashSenha(senha), criadoEm: Date.now() });
    return { criado: true, usuario: opcoes().adminUsuario, senha };
}

function redefinirSenha(novaSenha) {
    const senha = novaSenha || gerarSenha();
    const atual = lerJson(ARQUIVOS.admin, {}) || {};
    gravarJson(ARQUIVOS.admin, { ...atual, usuario: atual.usuario || opcoes().adminUsuario, hash: hashSenha(senha), alteradoEm: Date.now() });
    sessoes.clear(); // derruba todos os logins
    return senha;
}

function verificarLogin(usuario, senha) {
    const adm = lerJson(ARQUIVOS.admin, null);
    if (!adm?.hash) return false;
    const usuarioOk = String(usuario || "").length === String(adm.usuario).length &&
        crypto.timingSafeEqual(Buffer.from(String(usuario)), Buffer.from(String(adm.usuario)));
    const senhaOk = conferirHash(senha, adm.hash); // sempre calcula (mesmo tempo)
    return usuarioOk && senhaOk;
}

// ---------- sessão ----------
let segredo = null;
function obterSegredo() {
    if (segredo) return segredo;
    garantirPastas();
    try { segredo = fs.readFileSync(ARQUIVOS.segredo, "utf8").trim(); } catch {}
    if (!segredo || segredo.length < 32) {
        segredo = crypto.randomBytes(32).toString("hex");
        fs.writeFileSync(ARQUIVOS.segredo, segredo, { mode: 0o600 });
    }
    return segredo;
}

const sessoes = new Map(); // id -> { expira, ip }

function assinar(id) {
    return crypto.createHmac("sha256", obterSegredo()).update(id).digest("hex").slice(0, 40);
}

function criarSessao(ip) {
    const id = crypto.randomBytes(24).toString("hex");
    sessoes.set(id, { expira: Date.now() + DURACAO_SESSAO_MS, ip });
    return { cookie: `${id}.${assinar(id)}`, maxAge: DURACAO_SESSAO_MS / 1000 };
}

function lerCookie(req, nome) {
    const bruto = String(req.headers.cookie || "");
    for (const parte of bruto.split(";")) {
        const i = parte.indexOf("=");
        if (i > 0 && parte.slice(0, i).trim() === nome) return decodeURIComponent(parte.slice(i + 1).trim());
    }
    return null;
}

function sessaoDoPedido(req) {
    const valor = lerCookie(req, "mk_sess");
    if (!valor) return null;
    const [id, assinatura] = valor.split(".");
    if (!id || !assinatura) return null;
    const esperado = assinar(id);
    if (assinatura.length !== esperado.length || !crypto.timingSafeEqual(Buffer.from(assinatura), Buffer.from(esperado))) return null;
    const s = sessoes.get(id);
    if (!s || s.expira < Date.now()) { sessoes.delete(id); return null; }
    return { id, ...s };
}

function encerrarSessao(req) {
    const s = sessaoDoPedido(req);
    if (s) sessoes.delete(s.id);
}

function cookieDeSessao(valor, maxAge, https) {
    return `mk_sess=${encodeURIComponent(valor)}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${https ? "; Secure" : ""}`;
}

// ---------- limite de requisições (janela deslizante) ----------
const janelas = new Map();
function permitir(chave, maximo, janelaMs) {
    const agora = Date.now();
    const lista = (janelas.get(chave) || []).filter(t => agora - t < janelaMs);
    if (lista.length >= maximo) { janelas.set(chave, lista); return false; }
    lista.push(agora);
    janelas.set(chave, lista);
    if (janelas.size > 5000) for (const [k, v] of janelas) if (!v.length || agora - v[v.length - 1] > 3600000) janelas.delete(k);
    return true;
}

// ---------- cabeçalhos ----------
const CSP = "default-src 'self'; img-src 'self' data:; style-src 'self'; script-src 'self'; connect-src 'self'; " +
    "font-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'";

function cabecalhosPadrao(extras = {}) {
    return {
        "Content-Security-Policy": CSP,
        "X-Content-Type-Options": "nosniff",
        "X-Frame-Options": "DENY",
        "Referrer-Policy": "strict-origin-when-cross-origin",
        "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=()",
        "Cross-Origin-Opener-Policy": "same-origin",
        ...extras
    };
}

module.exports = {
    hashSenha, gerarSenha, garantirAdmin, redefinirSenha, verificarLogin, conferirHash,
    criarSessao, sessaoDoPedido, encerrarSessao, cookieDeSessao, lerCookie, permitir, cabecalhosPadrao
};
