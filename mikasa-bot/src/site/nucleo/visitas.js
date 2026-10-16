/* 👀 Registro de visitas: quem entrou, de onde, em qual página, erros e estatísticas */
const fs = require("fs");
const { ARQUIVOS } = require("./config-site");
const { garantirPastas } = require("./armazenamento");

const LIMITE_EM_MEMORIA = 30000;
const TAMANHO_MAXIMO_ARQUIVO = 25 * 1024 * 1024;

let registros = [];       // visitas (páginas e downloads)
let erros = [];           // respostas 4xx/5xx
let fila = [];
let gravando = false;
let iniciado = false;

const formatadorDia = new Intl.DateTimeFormat("sv-SE", { timeZone: "America/Sao_Paulo" });
const diaDe = t => formatadorDia.format(new Date(t));

function iniciar() {
    if (iniciado) return;
    iniciado = true;
    garantirPastas();
    try {
        if (fs.existsSync(ARQUIVOS.visitas)) {
            if (fs.statSync(ARQUIVOS.visitas).size > TAMANHO_MAXIMO_ARQUIVO) podarArquivo();
            const linhas = fs.readFileSync(ARQUIVOS.visitas, "utf8").split("\n").filter(Boolean).slice(-LIMITE_EM_MEMORIA * 2);
            for (const l of linhas) {
                try {
                    const r = JSON.parse(l);
                    (r.s >= 400 ? erros : registros).push(r);
                } catch {}
            }
            registros = registros.slice(-LIMITE_EM_MEMORIA);
            erros = erros.slice(-LIMITE_EM_MEMORIA);
        }
    } catch (e) { console.error("🌐 [site] não consegui ler o histórico de visitas:", e.message); }
}

function podarArquivo() {
    try {
        const linhas = fs.readFileSync(ARQUIVOS.visitas, "utf8").split("\n").filter(Boolean).slice(-LIMITE_EM_MEMORIA);
        fs.writeFileSync(ARQUIVOS.visitas, linhas.join("\n") + "\n");
    } catch {}
}

function descarregarFila() {
    if (gravando || !fila.length) return;
    gravando = true;
    const lote = fila.join("");
    fila = [];
    fs.appendFile(ARQUIVOS.visitas, lote, () => { gravando = false; if (fila.length) descarregarFila(); });
}

// ---------- reconhecimento do aparelho ----------
function analisarUA(ua) {
    const u = String(ua || "");
    const bot = /bot|crawl|spider|slurp|facebookexternalhit|whatsapp|telegram|preview|curl|wget|python|axios|node-fetch|go-http|java\/|scanner|monitor|headless/i.test(u);
    let dispositivo = /ipad|tablet/i.test(u) ? "Tablet" : /mobi|android|iphone/i.test(u) ? "Celular" : "Computador";
    if (bot) dispositivo = "Robô";
    const navegador = /edg\//i.test(u) ? "Edge" : /opr\/|opera/i.test(u) ? "Opera" : /samsungbrowser/i.test(u) ? "Samsung" :
        /firefox|fxios/i.test(u) ? "Firefox" : /chrome|crios/i.test(u) ? "Chrome" : /safari/i.test(u) ? "Safari" : bot ? "—" : "Outro";
    const sistema = /android/i.test(u) ? "Android" : /iphone|ipad|ios/i.test(u) ? "iOS" : /windows/i.test(u) ? "Windows" :
        /mac os/i.test(u) ? "macOS" : /linux/i.test(u) ? "Linux" : "—";
    return { bot, dispositivo, navegador, sistema };
}

function hostDoReferrer(ref) {
    try { return ref ? new URL(ref).host : ""; } catch { return ""; }
}

/** Anota um acesso. r: { ip, metodo, caminho, status, ua, ref, pais, tipo } */
function registrar(r) {
    const { bot, dispositivo, navegador, sistema } = analisarUA(r.ua);
    const item = {
        t: Date.now(), ip: r.ip, m: r.metodo, p: String(r.caminho).slice(0, 300), s: r.status,
        ua: String(r.ua || "").slice(0, 200), ref: String(r.ref || "").slice(0, 200), rh: hostDoReferrer(r.ref),
        pa: r.pais || "", d: dispositivo, n: navegador, o: sistema, b: bot ? 1 : 0, k: r.tipo || "pagina"
    };
    if (item.s >= 400) { erros.push(item); if (erros.length > LIMITE_EM_MEMORIA) erros.shift(); }
    else { registros.push(item); if (registros.length > LIMITE_EM_MEMORIA) registros.shift(); }
    fila.push(JSON.stringify(item) + "\n");
    descarregarFila();
}

// ---------- consultas ----------
function contar(lista, chave, limite = 8) {
    const mapa = new Map();
    for (const r of lista) { const k = chave(r); if (k) mapa.set(k, (mapa.get(k) || 0) + 1); }
    return [...mapa.entries()].sort((a, b) => b[1] - a[1]).slice(0, limite).map(([nome, total]) => ({ nome, total }));
}

function resumo() {
    const humanas = registros.filter(r => !r.b);
    const hoje = diaDe(Date.now());
    const agora = Date.now();
    const doDia = d => humanas.filter(r => diaDe(r.t) === d);
    const unicos = lista => new Set(lista.map(r => r.ip)).size;

    const serie = [];
    for (let i = 13; i >= 0; i--) {
        const d = diaDe(agora - i * 86400000);
        const lista = doDia(d);
        serie.push({ dia: d.slice(5), visitas: lista.length, unicos: unicos(lista) });
    }
    const ult7 = humanas.filter(r => agora - r.t < 7 * 86400000);
    const ult30 = humanas.filter(r => agora - r.t < 30 * 86400000);
    const hojeLista = doDia(hoje);
    return {
        hoje: { visitas: hojeLista.length, unicos: unicos(hojeLista) },
        dias7: { visitas: ult7.length, unicos: unicos(ult7) },
        dias30: { visitas: ult30.length, unicos: unicos(ult30) },
        total: { visitas: humanas.length, unicos: unicos(humanas), robos: registros.length - humanas.length },
        errosHoje: erros.filter(r => diaDe(r.t) === hoje).length,
        serie,
        paginas: contar(ult30.filter(r => r.k === "pagina"), r => r.p.split("?")[0]),
        origens: contar(ult30, r => r.rh || "Acesso direto"),
        aparelhos: contar(ult30, r => r.d),
        navegadores: contar(ult30, r => r.n),
        sistemas: contar(ult30, r => r.o !== "—" ? r.o : ""),
        paises: contar(ult30, r => r.pa)
    };
}

function listar({ pagina = 1, porPagina = 25, busca = "", robos = false } = {}) {
    const termo = String(busca).toLowerCase().trim();
    let lista = registros.slice().reverse();
    if (!robos) lista = lista.filter(r => !r.b);
    if (termo) lista = lista.filter(r => `${r.ip} ${r.p} ${r.ref} ${r.ua} ${r.pa}`.toLowerCase().includes(termo));
    const total = lista.length;
    const inicio = (Math.max(1, pagina) - 1) * porPagina;
    return { total, pagina, porPagina, itens: lista.slice(inicio, inicio + porPagina) };
}

function resumoErros() {
    const recentes = erros.slice().reverse();
    return {
        total: erros.length,
        porCaminho: contar(erros, r => `${r.s} ${r.p.split("?")[0]}`, 15),
        recentes: recentes.slice(0, 50)
    };
}

module.exports = { iniciar, registrar, resumo, listar, resumoErros, analisarUA };
