/* 🛣️ Rotas do site: páginas, API pública e API do painel (admin) */
const fs = require("fs");
const path = require("path");
const os = require("os");
const { execFile } = require("child_process");
const { ARQUIVOS, DIR_DADOS, opcoes, config } = require("./config-site");
const U = require("./util-http");
const A = require("./armazenamento");
const S = require("./seguranca");
const V = require("./visitas");
const B = require("./info-bot");

const PAGINAS = { "/": "index.html", "/downloads": "downloads.html", "/contato": "contato.html", "/privacidade": "privacidade.html", "/painel": "painel.html" };
const NOME_BOT = () => opcoes().nome;

// ───────────────────────── helpers ─────────────────────────
function limpar(t, max) { return A.limparTexto(t, max); }

function ipDoCliente(req) {
    const o = opcoes();
    let ip = req.socket.remoteAddress || "";
    if (o.confiarProxy) {
        const encaminhado = String(req.headers["cf-connecting-ip"] || req.headers["x-forwarded-for"] || "").split(",")[0].trim();
        if (encaminhado) ip = encaminhado;
    }
    return ip.replace(/^::ffff:/, "") || "desconhecido";
}

const ehHttps = req => opcoes().confiarProxy && String(req.headers["x-forwarded-proto"] || "").toLowerCase() === "https";

function mesmaOrigem(req) {
    const origem = req.headers.origin;
    if (!origem) return true;
    try { return new URL(origem).host === req.headers.host; } catch { return false; }
}

function erro(res, status, mensagem) {
    return U.enviarJson(res, status, { ok: false, erro: mensagem }, S.cabecalhosPadrao());
}
const ok = (res, dados = {}) => U.enviarJson(res, 200, { ok: true, ...dados }, S.cabecalhosPadrao());

function enviarPagina(req, res, arquivo, status = 200) {
    const abs = path.join(ARQUIVOS.web, arquivo);
    let html;
    try { html = fs.readFileSync(abs, "utf8"); } catch { return U.enviarTexto(res, 404, "Página não encontrada"); }
    html = html.replace(/\{\{NOME\}\}/g, NOME_BOT()).replace(/\{\{DONO\}\}/g, String(config.OWNER_NAME || NOME_BOT()).replace(/[<>&"]/g, "")).replace(/\{\{ANO\}\}/g, String(new Date().getFullYear()));
    const corpo = Buffer.from(html);
    res.writeHead(status, S.cabecalhosPadrao({
        "Content-Type": "text/html; charset=utf-8", "Content-Length": corpo.length,
        "Cache-Control": arquivo === "painel.html" ? "no-store" : "no-cache"
    }));
    res.end(req.method === "HEAD" ? undefined : corpo);
}

const nomeCookie = "mk_sess";
function exigirAdmin(req, res) {
    const s = S.sessaoDoPedido(req);
    if (!s) { erro(res, 401, "Faça login no painel."); return null; }
    return s;
}

// ───────────────────────── API pública ─────────────────────────
function dadosPublicos() {
    const st = B.obterStatus();
    const cats = B.categorias();
    const cont = B.contagens();
    return {
        nome: NOME_BOT(),
        versao: config.VERSION || "",
        dono: config.OWNER_NAME || "",
        online: st.conectado,
        links: { canal: B.linkCanal(), criador: B.linkCriador(), criadorBase: B.linkCriador("") ? B.linkCriador("").split("?")[0] : null },
        stats: {
            comandos: cats.reduce((n, c) => n + c.comandos.length, 0),
            categorias: cats.length,
            grupos: cont.grupos
        },
        prefixo: config.PREFIX,
        categorias: cats,
        planos: B.planos()
    };
}

function listaPublicaDeArquivos() {
    return A.listaArquivos().filter(a => a.publico).sort((a, b) => b.criadoEm - a.criadoEm).map(a => ({
        id: a.id, titulo: a.titulo, descricao: a.descricao, nome: a.nome, tamanho: a.tamanho, baixadas: a.baixadas || 0, criadoEm: a.criadoEm, categoria: a.categoria || ""
    }));
}

async function contato(req, res, ip) {
    if (!S.permitir(`contato:${ip}`, 3, 60 * 60 * 1000)) return erro(res, 429, "Você já enviou mensagens demais. Tente de novo mais tarde.");
    const corpo = await U.lerCorpoJson(req);
    if (corpo.website) return ok(res); // campo-isca: robô preencheu → finge que deu certo
    const nome = limpar(corpo.nome, 80), contatoInfo = limpar(corpo.contato, 120), mensagem = limpar(corpo.mensagem, 1500);
    if (nome.length < 2 || mensagem.length < 5) return erro(res, 400, "Preencha seu nome e a mensagem.");
    const lista = A.lerJson(ARQUIVOS.mensagens, []);
    lista.push({ id: U.idAleatorio(5), nome, contato: contatoInfo, mensagem, ip, quando: Date.now(), lida: false });
    A.gravarJson(ARQUIVOS.mensagens, lista.slice(-500));
    B.avisarDono(`📩 *Nova mensagem pelo site*\n\n👤 ${nome}\n📞 ${contatoInfo || "(não informou)"}\n\n${mensagem}`);
    return ok(res);
}

async function baixar(req, res, id) {
    const a = A.listaArquivos().find(x => x.id === id && x.publico);
    if (!a) return false;
    const abs = path.join(ARQUIVOS.uploads, a.arquivo);
    if (!fs.existsSync(abs)) return false;
    if (req.method === "GET" && !req.headers.range) {
        const lista = A.listaArquivos();
        const item = lista.find(x => x.id === id);
        if (item) { item.baixadas = (item.baixadas || 0) + 1; A.salvarArquivos(lista); }
    }
    return U.servirArquivo(req, res, abs, { baixar: true, nome: a.nome, extras: S.cabecalhosPadrao({ "Content-Security-Policy": "sandbox" }) });
}

// ───────────────────────── sites hospedados ─────────────────────────
function servirSiteHospedado(req, res, caminho) {
    const m = /^\/sites\/([a-z0-9-]+)(\/.*)?$/.exec(caminho);
    if (!m || !A.slugValido(m[1])) return false;
    const base = path.join(ARQUIVOS.sites, m[1]);
    if (!fs.existsSync(base)) return false;
    if (m[2] === undefined) { res.writeHead(301, { Location: `/sites/${m[1]}/` }); res.end(); return true; }
    let alvo = U.resolverSeguro(base, m[2]);
    if (!alvo) return false; // caminho proibido (.., arquivos ocultos): responde como se não existisse
    try { if (fs.statSync(alvo).isDirectory()) alvo = path.join(alvo, "index.html"); } catch {}
    const extras = { "X-Content-Type-Options": "nosniff", "Referrer-Policy": "strict-origin-when-cross-origin" };
    if (U.servirArquivo(req, res, alvo, { extras })) return true;
    const pagina404 = path.join(base, "404.html");
    if (fs.existsSync(pagina404)) { U.servirArquivo(req, res, pagina404, { extras, statusFixo: 404 }); return true; }
    return false;
}

// ───────────────────────── API do painel ─────────────────────────
function execFileP(cmd, args, opts = {}) {
    return new Promise((resolve, reject) => execFile(cmd, args, { maxBuffer: 20 * 1024 * 1024, timeout: 120000, ...opts },
        (e, so, se) => e ? reject(new Error(String(se || e.message).trim().split("\n").slice(-2).join(" | "))) : resolve(so)));
}

function consulta(url) { return Object.fromEntries(url.searchParams.entries()); }

async function publicarSite(req, url) {
    const o = opcoes();
    const slug = limpar(url.searchParams.get("nome"), 40).toLowerCase();
    if (!A.slugValido(slug)) throw Object.assign(new Error("Nome inválido: use letras minúsculas, números e hífen (ex.: meu-site)."), { status: 400 });
    const nomeOriginal = A.nomeSeguro(decodeURIComponent(String(req.headers["x-nome-arquivo"] || "site.zip")));
    const tmpDir = path.join(DIR_DADOS, "tmp");
    fs.mkdirSync(tmpDir, { recursive: true });
    const id = U.idAleatorio(6);
    const tmpArquivo = path.join(tmpDir, `${id}.upload`);
    const novoDir = path.join(ARQUIVOS.sites, `.novo-${id}`);
    try {
        await U.receberParaArquivo(req, tmpArquivo, o.limiteSiteBytes);
        const cabeca = Buffer.alloc(4);
        const fd = fs.openSync(tmpArquivo, "r"); fs.readSync(fd, cabeca, 0, 4, 0); fs.closeSync(fd);
        fs.mkdirSync(novoDir, { recursive: true });

        if (cabeca.toString("latin1", 0, 2) === "PK") {
            // proteção contra "zip bomba": confere o tamanho descompactado antes
            const listagem = await execFileP("unzip", ["-l", tmpArquivo]);
            const ultima = listagem.trim().split("\n").pop();
            const mt = /^\s*(\d+)\s+\d+\s+files?/.exec(ultima);
            if (mt && Number(mt[1]) > o.limiteSiteBytes * 4) throw Object.assign(new Error("O zip descompactado é grande demais."), { status: 413 });
            await execFileP("unzip", ["-q", "-o", tmpArquivo, "-d", novoDir]);
            A.higienizarPasta(novoDir);
            A.achatarSeUmaPasta(novoDir);
        } else if (/\.html?$/i.test(nomeOriginal)) {
            fs.copyFileSync(tmpArquivo, path.join(novoDir, "index.html"));
        } else {
            throw Object.assign(new Error("Envie um .zip (ou um arquivo .html) com o site."), { status: 400 });
        }
        const temIndex = fs.existsSync(path.join(novoDir, "index.html"));
        const destino = path.join(ARQUIVOS.sites, slug);
        const antigo = path.join(ARQUIVOS.sites, `.antigo-${id}`);
        if (fs.existsSync(destino)) fs.renameSync(destino, antigo);
        fs.renameSync(novoDir, destino);
        fs.rmSync(antigo, { recursive: true, force: true });
        return { slug, temIndex, url: `/sites/${slug}/` };
    } finally {
        fs.rmSync(novoDir, { recursive: true, force: true });
        try { fs.unlinkSync(tmpArquivo); } catch {}
    }
}

async function rotaAdmin(req, res, url, ip) {
    const caminho = url.pathname;
    const metodo = req.method;

    // ----- login / logout -----
    if (caminho === "/api/admin/login" && metodo === "POST") {
        if (!S.permitir(`login:${ip}`, 5, 10 * 60 * 1000)) return erro(res, 429, "Muitas tentativas. Aguarde 10 minutos.");
        const corpo = await U.lerCorpoJson(req);
        if (!S.verificarLogin(corpo.usuario, corpo.senha)) {
            V.registrar({ ip, metodo, caminho: "/api/admin/login (senha errada)", status: 401, ua: req.headers["user-agent"], tipo: "login" });
            return erro(res, 401, "Usuário ou senha incorretos.");
        }
        const sessao = S.criarSessao(ip);
        U.enviarJson(res, 200, { ok: true }, S.cabecalhosPadrao({ "Set-Cookie": S.cookieDeSessao(sessao.cookie, sessao.maxAge, ehHttps(req)) }));
        return;
    }
    if (caminho === "/api/admin/logout" && metodo === "POST") {
        S.encerrarSessao(req);
        return U.enviarJson(res, 200, { ok: true }, S.cabecalhosPadrao({ "Set-Cookie": S.cookieDeSessao("", 0, ehHttps(req)) }));
    }

    const sessao = exigirAdmin(req, res);
    if (!sessao) return;

    if (caminho === "/api/admin/eu") return ok(res, { usuario: opcoes().adminUsuario });

    if (caminho === "/api/admin/resumo") {
        const msgs = A.lerJson(ARQUIVOS.mensagens, []);
        const arquivos = A.listaArquivos();
        return ok(res, {
            visitas: V.resumo(),
            arquivos: { total: arquivos.length, baixadas: arquivos.reduce((n, a) => n + (a.baixadas || 0), 0) },
            sites: A.listaSites().length,
            mensagens: { total: msgs.length, naoLidas: msgs.filter(m => !m.lida).length },
            bot: B.obterStatus()
        });
    }

    if (caminho === "/api/admin/visitas") {
        const q = consulta(url);
        return ok(res, V.listar({ pagina: Math.max(1, Number(q.pagina) || 1), porPagina: 25, busca: q.busca || "", robos: q.robos === "1" }));
    }
    if (caminho === "/api/admin/erros") return ok(res, V.resumoErros());

    // ----- arquivos -----
    if (caminho === "/api/admin/arquivos" && metodo === "GET") return ok(res, { itens: A.listaArquivos().sort((a, b) => b.criadoEm - a.criadoEm) });

    if (caminho === "/api/admin/arquivos/upload" && metodo === "PUT") {
        const nome = A.nomeSeguro(decodeURIComponent(String(req.headers["x-nome-arquivo"] || "arquivo")));
        const id = U.idAleatorio(6);
        const ext = path.extname(nome).toLowerCase().replace(/[^.a-z0-9]/g, "").slice(0, 10);
        const guardado = `${id}${ext}`;
        A.garantirPastas();
        const tamanho = await U.receberParaArquivo(req, path.join(ARQUIVOS.uploads, guardado), opcoes().limiteUploadBytes);
        const lista = A.listaArquivos();
        lista.push({
            id, titulo: limpar(url.searchParams.get("titulo"), 100) || nome, descricao: limpar(url.searchParams.get("descricao"), 300),
            categoria: limpar(url.searchParams.get("categoria"), 30), nome, arquivo: guardado, tamanho, mime: U.mimeDe(nome),
            publico: url.searchParams.get("publico") !== "0", baixadas: 0, criadoEm: Date.now()
        });
        A.salvarArquivos(lista);
        return ok(res, { id });
    }

    let m = /^\/api\/admin\/arquivos\/([a-f0-9]{12})$/.exec(caminho);
    if (m && metodo === "PATCH") {
        const corpo = await U.lerCorpoJson(req);
        const lista = A.listaArquivos();
        const a = lista.find(x => x.id === m[1]);
        if (!a) return erro(res, 404, "Arquivo não encontrado.");
        if (typeof corpo.titulo === "string") a.titulo = limpar(corpo.titulo, 100) || a.titulo;
        if (typeof corpo.descricao === "string") a.descricao = limpar(corpo.descricao, 300);
        if (typeof corpo.categoria === "string") a.categoria = limpar(corpo.categoria, 30);
        if (typeof corpo.publico === "boolean") a.publico = corpo.publico;
        A.salvarArquivos(lista);
        return ok(res);
    }
    if (m && metodo === "DELETE") {
        const lista = A.listaArquivos();
        const a = lista.find(x => x.id === m[1]);
        if (!a) return erro(res, 404, "Arquivo não encontrado.");
        try { fs.unlinkSync(path.join(ARQUIVOS.uploads, a.arquivo)); } catch {}
        A.salvarArquivos(lista.filter(x => x.id !== m[1]));
        return ok(res);
    }

    // ----- sites hospedados -----
    if (caminho === "/api/admin/sites" && metodo === "GET") return ok(res, { itens: A.listaSites() });
    if (caminho === "/api/admin/sites/upload" && metodo === "PUT") return ok(res, await publicarSite(req, url));
    m = /^\/api\/admin\/sites\/([a-z0-9-]+)$/.exec(caminho);
    if (m && metodo === "DELETE") {
        if (!A.slugValido(m[1])) return erro(res, 400, "Nome inválido.");
        fs.rmSync(path.join(ARQUIVOS.sites, m[1]), { recursive: true, force: true });
        return ok(res);
    }

    // ----- mensagens -----
    if (caminho === "/api/admin/mensagens" && metodo === "GET") return ok(res, { itens: A.lerJson(ARQUIVOS.mensagens, []).slice().reverse() });
    m = /^\/api\/admin\/mensagens\/([a-f0-9]{10})$/.exec(caminho);
    if (m && metodo === "PATCH") {
        const lista = A.lerJson(ARQUIVOS.mensagens, []);
        const msg = lista.find(x => x.id === m[1]);
        if (!msg) return erro(res, 404, "Mensagem não encontrada.");
        msg.lida = true; A.gravarJson(ARQUIVOS.mensagens, lista);
        return ok(res);
    }
    if (m && metodo === "DELETE") {
        A.gravarJson(ARQUIVOS.mensagens, A.lerJson(ARQUIVOS.mensagens, []).filter(x => x.id !== m[1]));
        return ok(res);
    }

    // ----- bot e conta -----
    if (caminho === "/api/admin/bot") {
        const mem = process.memoryUsage();
        return ok(res, {
            status: B.obterStatus(), contagens: B.contagens(), node: process.version, plataforma: `${os.platform()} ${os.arch()}`,
            memoriaMb: Math.round(mem.rss / 1048576), cargaCpu: os.loadavg()[0].toFixed(2),
            ips: Object.values(os.networkInterfaces()).flat().filter(i => i && i.family === "IPv4" && !i.internal).map(i => i.address),
            porta: opcoes().porta, urlPublica: opcoes().urlPublica
        });
    }
    if (caminho === "/api/admin/senha" && metodo === "POST") {
        const corpo = await U.lerCorpoJson(req);
        if (!S.verificarLogin(opcoes().adminUsuario, corpo.atual)) return erro(res, 403, "Senha atual incorreta.");
        if (String(corpo.nova || "").length < 10) return erro(res, 400, "A nova senha precisa ter pelo menos 10 caracteres.");
        S.redefinirSenha(String(corpo.nova));
        return U.enviarJson(res, 200, { ok: true }, S.cabecalhosPadrao({ "Set-Cookie": S.cookieDeSessao("", 0, ehHttps(req)) }));
    }
    return erro(res, 404, "Rota não encontrada.");
}

// ───────────────────────── roteador principal ─────────────────────────
async function tratar(req, res) {
    const ip = ipDoCliente(req);
    const url = new URL(req.url, "http://localhost");
    const caminho = url.pathname;
    const metodo = req.method;

    if (!["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"].includes(metodo)) return U.enviarTexto(res, 405, "Método não permitido");
    if (!S.permitir(`geral:${ip}`, 240, 30 * 1000)) return U.enviarTexto(res, 429, "Calma! Muitas requisições. Tente de novo em instantes.", "text/plain; charset=utf-8", { "Retry-After": "30" });

    const muda = !["GET", "HEAD", "OPTIONS"].includes(metodo);
    if (muda && !mesmaOrigem(req)) return erro(res, 403, "Origem não permitida.");
    if (muda && caminho.startsWith("/api/admin/") && req.headers["x-mk"] !== "1") return erro(res, 403, "Requisição inválida.");
    if (metodo === "OPTIONS") { res.writeHead(204, { Allow: "GET, HEAD, POST, PUT, PATCH, DELETE" }); return res.end(); }

    // ----- API -----
    if (caminho.startsWith("/api/admin/")) return rotaAdmin(req, res, url, ip);
    if (caminho === "/api/publico" && metodo === "GET") return ok(res, dadosPublicos());
    if (caminho === "/api/downloads" && metodo === "GET") return ok(res, { itens: listaPublicaDeArquivos() });
    if (caminho === "/api/contato" && metodo === "POST") return contato(req, res, ip);
    if (caminho === "/saude") return U.enviarJson(res, 200, { ok: true, online: B.obterStatus().conectado });
    if (caminho.startsWith("/api/")) return erro(res, 404, "Rota não encontrada.");

    if (!["GET", "HEAD"].includes(metodo)) return U.enviarTexto(res, 405, "Método não permitido");

    // ----- downloads -----
    let m = /^\/baixar\/([a-f0-9]{12})$/.exec(caminho);
    if (m) { if (await baixar(req, res, m[1])) return; return enviarPagina(req, res, "404.html", 404); }

    // ----- sites hospedados -----
    if (caminho.startsWith("/sites/")) { if (servirSiteHospedado(req, res, caminho)) return; return enviarPagina(req, res, "404.html", 404); }

    // ----- páginas -----
    if (PAGINAS[caminho]) return enviarPagina(req, res, PAGINAS[caminho]);

    // ----- arquivos estáticos do site -----
    if (caminho === "/robots.txt") return U.enviarTexto(res, 200, "User-agent: *\nDisallow: /painel\nDisallow: /api/\nAllow: /\n");
    const rel = caminho === "/favicon.ico" ? "/assets/img/favicon.svg" : caminho;
    if (rel.startsWith("/assets/")) {
        const abs = U.resolverSeguro(path.join(ARQUIVOS.web, "assets"), rel.slice("/assets".length));
        if (abs && U.servirArquivo(req, res, abs, { cache: 3600, extras: S.cabecalhosPadrao() })) return;
    }
    return enviarPagina(req, res, "404.html", 404);
}

module.exports = { tratar, ipDoCliente };
