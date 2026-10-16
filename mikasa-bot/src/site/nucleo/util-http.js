/* 🧰 Utilidades HTTP (sem dependências): respostas, arquivos com Range/cache, corpo, upload */
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { Transform, pipeline } = require("stream");

const MIME = {
    ".html": "text/html; charset=utf-8", ".htm": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".mjs": "text/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8", ".txt": "text/plain; charset=utf-8", ".xml": "application/xml; charset=utf-8",
    ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".gif": "image/gif",
    ".webp": "image/webp", ".ico": "image/x-icon", ".avif": "image/avif",
    ".mp4": "video/mp4", ".webm": "video/webm", ".mp3": "audio/mpeg", ".ogg": "audio/ogg", ".wav": "audio/wav", ".m4a": "audio/mp4",
    ".pdf": "application/pdf", ".zip": "application/zip", ".apk": "application/vnd.android.package-archive",
    ".woff": "font/woff", ".woff2": "font/woff2", ".ttf": "font/ttf", ".map": "application/json"
};

function mimeDe(arquivo) {
    return MIME[path.extname(String(arquivo)).toLowerCase()] || "application/octet-stream";
}

function enviarJson(res, status, objeto, extras = {}) {
    const corpo = Buffer.from(JSON.stringify(objeto));
    res.writeHead(status, {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Length": corpo.length,
        "Cache-Control": "no-store",
        ...extras
    });
    res.end(corpo);
}

function enviarTexto(res, status, texto, tipo = "text/plain; charset=utf-8", extras = {}) {
    const corpo = Buffer.from(String(texto));
    res.writeHead(status, { "Content-Type": tipo, "Content-Length": corpo.length, ...extras });
    res.end(corpo);
}

// Transforma o caminho da URL em um caminho de disco DENTRO de "base" (ou null se tentar escapar).
function resolverSeguro(base, caminhoUrl, { bloquearOcultos = true } = {}) {
    let decodificado;
    try { decodificado = decodeURIComponent(caminhoUrl); } catch { return null; }
    if (decodificado.includes("\0") || decodificado.includes("\\")) return null;
    const normalizado = path.posix.normalize("/" + decodificado);
    if (bloquearOcultos && normalizado.split("/").some(p => p.startsWith(".") && p !== "" && p !== ".well-known")) return null;
    const abs = path.resolve(base, "." + normalizado);
    if (abs !== base && !abs.startsWith(base + path.sep)) return null;
    return abs;
}

/**
 * Envia um arquivo com suporte a: Range (retomar download / vídeo), ETag, 304 e HEAD.
 * opcoes: { baixar: bool, nome: string, cache: segundos, extras: {headers} }
 */
function servirArquivo(req, res, abs, opcoes = {}) {
    let stat;
    try { stat = fs.statSync(abs); } catch { return false; }
    if (!stat.isFile()) return false;

    const etag = `W/"${stat.size.toString(16)}-${Math.floor(stat.mtimeMs).toString(16)}"`;
    const cabecalhos = {
        "Content-Type": opcoes.tipo || mimeDe(abs),
        "Accept-Ranges": "bytes",
        "Last-Modified": stat.mtime.toUTCString(),
        "ETag": etag,
        "Cache-Control": opcoes.cache ? `public, max-age=${opcoes.cache}` : "no-cache",
        "X-Content-Type-Options": "nosniff",
        ...(opcoes.extras || {})
    };
    if (opcoes.baixar) {
        const nome = String(opcoes.nome || path.basename(abs)).replace(/[\r\n"\\]/g, "_");
        cabecalhos["Content-Disposition"] = `attachment; filename="${nome.replace(/[^\x20-\x7e]/g, "_")}"; filename*=UTF-8''${encodeURIComponent(nome)}`;
    }

    if (req.headers["if-none-match"] === etag) {
        res.writeHead(304, cabecalhos);
        res.end();
        return true;
    }

    let inicio = 0;
    let fim = stat.size - 1;
    let status = opcoes.statusFixo || 200;
    const faixa = req.headers.range;
    if (faixa) {
        const m = /^bytes=(\d*)-(\d*)$/.exec(String(faixa).trim());
        if (m && (m[1] !== "" || m[2] !== "")) {
            if (m[1] === "") { inicio = Math.max(0, stat.size - Number(m[2])); }
            else { inicio = Number(m[1]); if (m[2] !== "") fim = Math.min(Number(m[2]), stat.size - 1); }
            if (inicio > fim || inicio >= stat.size) {
                res.writeHead(416, { "Content-Range": `bytes */${stat.size}` });
                res.end();
                return true;
            }
            status = 206;
            cabecalhos["Content-Range"] = `bytes ${inicio}-${fim}/${stat.size}`;
        }
    }
    cabecalhos["Content-Length"] = fim - inicio + 1;
    res.writeHead(status, cabecalhos);
    if (req.method === "HEAD" || stat.size === 0) { res.end(); return true; }
    const leitura = fs.createReadStream(abs, { start: inicio, end: fim });
    leitura.on("error", () => res.destroy());
    res.on("close", () => leitura.destroy());
    leitura.pipe(res);
    return true;
}

function lerCorpoJson(req, limite = 64 * 1024) {
    return new Promise((resolve, reject) => {
        const partes = [];
        let total = 0;
        req.on("data", c => {
            total += c.length;
            if (total > limite) { reject(Object.assign(new Error("corpo grande demais"), { status: 413 })); req.destroy(); return; }
            partes.push(c);
        });
        req.on("end", () => {
            if (!total) return resolve({});
            try { resolve(JSON.parse(Buffer.concat(partes).toString("utf8"))); }
            catch { reject(Object.assign(new Error("JSON inválido"), { status: 400 })); }
        });
        req.on("error", reject);
    });
}

// Grava o corpo da requisição direto no disco (streaming), com limite de tamanho.
function receberParaArquivo(req, destino, limiteBytes) {
    return new Promise((resolve, reject) => {
        const declarado = Number(req.headers["content-length"] || 0);
        if (declarado > limiteBytes) {
            req.resume();
            return reject(Object.assign(new Error("arquivo maior que o limite"), { status: 413 }));
        }
        let total = 0;
        const contador = new Transform({
            transform(pedaco, _enc, cb) {
                total += pedaco.length;
                if (total > limiteBytes) return cb(Object.assign(new Error("arquivo maior que o limite"), { status: 413 }));
                cb(null, pedaco);
            }
        });
        pipeline(req, contador, fs.createWriteStream(destino, { mode: 0o640 }), erro => {
            if (erro) { try { fs.unlinkSync(destino); } catch {} return reject(erro); }
            resolve(total);
        });
    });
}

function idAleatorio(bytes = 8) {
    return crypto.randomBytes(bytes).toString("hex");
}

module.exports = { MIME, mimeDe, enviarJson, enviarTexto, resolverSeguro, servirArquivo, lerCorpoJson, receberParaArquivo, idAleatorio };
