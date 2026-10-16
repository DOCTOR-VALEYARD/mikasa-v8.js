/* 💾 Armazenamento do site (JSON com gravação atômica + pastas de arquivos e sites) */
const fs = require("fs");
const path = require("path");
const { ARQUIVOS, DIR_DADOS } = require("./config-site");

function garantirPastas() {
    for (const p of [DIR_DADOS, ARQUIVOS.uploads, ARQUIVOS.sites]) fs.mkdirSync(p, { recursive: true });
}

function lerJson(arquivo, padrao) {
    try { return JSON.parse(fs.readFileSync(arquivo, "utf8")); } catch { return padrao; }
}

function gravarJson(arquivo, dados) {
    fs.mkdirSync(path.dirname(arquivo), { recursive: true });
    const tmp = `${arquivo}.${process.pid}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(dados, null, 2), { mode: 0o640 });
    fs.renameSync(tmp, arquivo);
}

// ---------- arquivos para download ----------
const listaArquivos = () => lerJson(ARQUIVOS.arquivos, []);
const salvarArquivos = lista => gravarJson(ARQUIVOS.arquivos, lista);

function limparTexto(t, max) {
    return String(t ?? "").replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, max);
}

function nomeSeguro(nome) {
    const base = path.basename(String(nome || "arquivo")).replace(/[^\p{L}\p{N}._ ()+\-]/gu, "_").replace(/^\.+/, "").slice(0, 120);
    return base || "arquivo";
}

// ---------- sites hospedados ----------
const SLUG = /^[a-z0-9](?:[a-z0-9-]{0,38}[a-z0-9])?$/;
const SLUGS_RESERVADOS = new Set(["admin", "api", "assets", "painel", "baixar", "downloads", "contato", "sites"]);

function slugValido(slug) {
    return SLUG.test(slug) && !SLUGS_RESERVADOS.has(slug);
}

function tamanhoDaPasta(dir) {
    let total = 0, arquivos = 0;
    const visitar = d => {
        for (const e of fs.readdirSync(d, { withFileTypes: true })) {
            const p = path.join(d, e.name);
            if (e.isDirectory()) visitar(p);
            else if (e.isFile()) { total += fs.statSync(p).size; arquivos++; }
        }
    };
    try { visitar(dir); } catch {}
    return { total, arquivos };
}

function listaSites() {
    garantirPastas();
    return fs.readdirSync(ARQUIVOS.sites, { withFileTypes: true })
        .filter(e => e.isDirectory() && SLUG.test(e.name))
        .map(e => {
            const dir = path.join(ARQUIVOS.sites, e.name);
            const { total, arquivos } = tamanhoDaPasta(dir);
            return { slug: e.name, tamanho: total, arquivos, temIndex: fs.existsSync(path.join(dir, "index.html")), atualizadoEm: fs.statSync(dir).mtimeMs };
        })
        .sort((a, b) => a.slug.localeCompare(b.slug));
}

// Remove links simbólicos e devolve quantos arquivos ficaram (proteção contra zip malicioso).
function higienizarPasta(dir, maxArquivos = 5000) {
    let arquivos = 0;
    const visitar = d => {
        for (const e of fs.readdirSync(d, { withFileTypes: true })) {
            const p = path.join(d, e.name);
            if (e.isSymbolicLink()) { fs.unlinkSync(p); continue; }
            if (e.isDirectory()) visitar(p);
            else if (e.isFile()) { arquivos++; if (arquivos > maxArquivos) throw new Error(`o zip tem arquivos demais (limite ${maxArquivos})`); }
        }
    };
    visitar(dir);
    return arquivos;
}

// Se o zip trouxe tudo dentro de UMA pasta (comum), sobe o conteúdo um nível.
function achatarSeUmaPasta(dir) {
    const itens = fs.readdirSync(dir).filter(n => n !== "__MACOSX" && n !== ".DS_Store");
    if (itens.length === 1 && fs.statSync(path.join(dir, itens[0])).isDirectory()) {
        const interna = path.join(dir, itens[0]);
        for (const n of fs.readdirSync(interna)) fs.renameSync(path.join(interna, n), path.join(dir, n));
        fs.rmSync(interna, { recursive: true, force: true });
    }
    fs.rmSync(path.join(dir, "__MACOSX"), { recursive: true, force: true });
}

module.exports = {
    garantirPastas, lerJson, gravarJson, listaArquivos, salvarArquivos, limparTexto, nomeSeguro,
    slugValido, listaSites, higienizarPasta, achatarSeUmaPasta, tamanhoDaPasta, SLUGS_RESERVADOS
};
