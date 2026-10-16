/* =================================================
   🎨 MIKASA BOT — GERADOR DE CARDS (Canvas)
   📁 Arquivo: cardGenerator.js
   👑 DOCTOR VALEYARD
   Cards: Boas-vindas (alegre) / Despedida (macabro) / Música
================================================= */

const { createCanvas, loadImage, GlobalFonts } = require("@napi-rs/canvas");
const https = require("https");
const fs = require("fs");
const path = require("path");
const config = require("../../config");

// Nome de marca sempre puxado da configuração (nunca fixo no código)
const NOME_MARCA = (config.BOT_NAME || "DVCL").toUpperCase();

// ── FUNDO PADRÃO (src/fundo.png) ──
// Usado como plano de fundo fixo em TODOS os cards que não são o menu
// (boas-vindas, despedida, música, etc) — o conteúdo específico de cada
// card (avatar da pessoa, capa da música...) fica em cima, como um selo/banner.
let _fundoPadraoCache = undefined;
function carregarFundoPadrao() {
    if (_fundoPadraoCache !== undefined) return _fundoPadraoCache;
    try {
        const caminho = path.join(__dirname, "../midias/imagens/fundo.png");
        if (fs.existsSync(caminho)) {
            _fundoPadraoCache = fs.readFileSync(caminho);
        } else {
            console.error(`❌ fundo.png não encontrado em: ${caminho}`);
            _fundoPadraoCache = null;
        }
    } catch (e) {
        console.error("❌ Erro ao carregar fundo.png:", e.message);
        _fundoPadraoCache = null;
    }
    return _fundoPadraoCache;
}

async function desenharFundoPadrao(ctx, W, H) {
    const buffer = carregarFundoPadrao();
    if (!buffer) return false;
    const img = await carregarImagemComDiagnostico(buffer, "fundo.png (fundo padrão)");
    if (!img) return false;
    const escala = Math.max(W / img.width, H / img.height);
    const w = img.width * escala;
    const h = img.height * escala;
    ctx.drawImage(img, (W - w) / 2, (H - h) / 2, w, h);
    return true;
}

// ───────────────────────────────────────────────
// 🔤 FONTES — tenta registrar fontes do sistema/projeto
// (em Termux normalmente não existe fonte instalada por padrão,
// então tentamos várias rotas conhecidas antes de desistir)
// ───────────────────────────────────────────────
let FONTE_PRINCIPAL = "sans-serif";
let FONTE_TITULO = "sans-serif";

(function registrarFontes() {
    const candidatos = [
        // fontes que o próprio dev pode colocar em src/assets/fonts
        path.join(__dirname, "../midias/assets/fonts/Poppins-Bold.ttf"),
        path.join(__dirname, "../midias/assets/fonts/Poppins-Regular.ttf"),
        // fontes comuns de sistema Android (acessíveis sem root na maioria dos aparelhos)
        "/system/fonts/Roboto-Bold.ttf",
        "/system/fonts/Roboto-Regular.ttf",
        "/system/fonts/NotoSans-Regular.ttf",
        // fontes instaladas via "pkg install fontconfig" / "pkg install font-noto" no Termux
        "/data/data/com.termux/files/usr/share/fonts/TTF/DejaVuSans-Bold.ttf",
        "/data/data/com.termux/files/usr/share/fonts/TTF/DejaVuSans.ttf",
    ];

    let achouNegrito = false;
    let achouRegular = false;

    for (const arquivo of candidatos) {
        try {
            if (fs.existsSync(arquivo)) {
                const familia = arquivo.toLowerCase().includes("bold") ? "DVCL-Bold" : "DVCL-Regular";
                GlobalFonts.registerFromPath(arquivo, familia);
                if (familia === "DVCL-Bold") achouNegrito = true;
                if (familia === "DVCL-Regular") achouRegular = true;
            }
        } catch (e) {
            // ignora e segue tentando as próximas
        }
    }

    if (achouNegrito) FONTE_TITULO = "DVCL-Bold";
    if (achouRegular) FONTE_PRINCIPAL = "DVCL-Regular";
    if (!achouNegrito && achouRegular) FONTE_TITULO = "DVCL-Regular";

    if (!achouNegrito && !achouRegular) {
        console.log("⚠️ Nenhuma fonte .ttf encontrada para os cards. Usando fallback do sistema.");
        console.log("💡 Dica: coloque um arquivo .ttf em src/midias/assets/fonts/ (ex: Poppins-Bold.ttf) para garantir texto bonito nos cards.");
    }
})();

// ───────────────────────────────────────────────
// 🌐 HELPERS
// ───────────────────────────────────────────────
function baixarBuffer(url) {
    return new Promise((resolve, reject) => {
        if (!url) return reject(new Error("URL vazia"));
        https.get(url, (res) => {
            if (res.statusCode !== 200) return reject(new Error("Falha ao baixar imagem: " + res.statusCode));
            const chunks = [];
            res.on("data", (c) => chunks.push(c));
            res.on("end", () => resolve(Buffer.concat(chunks)));
        }).on("error", reject);
    });
}

// ───────────────────────────────────────────────
// 🔎 DETECTA O FORMATO REAL DA IMAGEM PELOS BYTES
// (não pela extensão do arquivo — um arquivo pode se chamar "menu.png" e
// ter, por dentro, bytes de JPEG/WEBP/GIF/etc. Isso é normal quando a foto
// vem direto do WhatsApp e é só salva com nome fixo, sem converter.)
// ───────────────────────────────────────────────
function detectarFormatoImagem(buffer) {
    if (!buffer || buffer.length < 12) return "desconhecido (arquivo vazio ou muito pequeno)";
    const b = buffer;
    if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return "PNG";
    if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "JPEG";
    if (b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46) return "GIF";
    if (b[0] === 0x42 && b[1] === 0x4d) return "BMP";
    if (b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 &&
        b.length > 11 && b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50) return "WEBP";
    if (b.length > 12 && b.slice(4, 8).toString("ascii") === "ftyp") {
        const marca = b.slice(8, 12).toString("ascii").toLowerCase();
        if (marca.includes("avif")) return "AVIF";
        if (marca.includes("heic") || marca.includes("heix") || marca.includes("hevc") || marca.includes("mif1")) {
            return "HEIC/HEIF (foto de iPhone sem conversão — normalmente o WhatsApp converte pra JPEG antes de enviar; se chegou assim, esse formato pode não ser suportado)";
        }
    }
    return `desconhecido (primeiros bytes em hex: ${buffer.slice(0, 4).toString("hex")})`;
}

// ───────────────────────────────────────────────
// 🖼️ CARREGADOR ROBUSTO DE IMAGEM — tenta de TODAS as formas antes de
// desistir, e se mesmo assim falhar, explica no console exatamente o
// tamanho do arquivo, o formato real detectado e o motivo do erro.
// Use esta função em vez de chamar loadImage() direto em qualquer lugar
// novo do código.
// ───────────────────────────────────────────────
async function carregarImagemComDiagnostico(buffer, label) {
    if (!buffer) {
        console.error(`❌ [${label}] nenhum buffer de imagem foi passado (nulo/indefinido).`);
        return null;
    }
    if (!Buffer.isBuffer(buffer)) {
        try { buffer = Buffer.from(buffer); } catch { /* deixa cair na checagem de baixo */ }
    }
    if (!buffer || !buffer.length) {
        console.error(`❌ [${label}] o buffer da imagem está vazio (0 bytes) — o download ou a leitura do arquivo falhou antes de chegar aqui.`);
        return null;
    }

    const formato = detectarFormatoImagem(buffer);
    const tentativas = [
        () => loadImage(buffer),
        () => loadImage(new Uint8Array(buffer)),
        () => loadImage(Buffer.from(buffer)), // cópia nova do buffer, evita buffers "compartilhados"/views estranhas
    ];

    let ultimoErro = null;
    for (const tentativa of tentativas) {
        try {
            return await tentativa();
        } catch (e) {
            ultimoErro = e;
        }
    }

    console.error(
        `❌ [${label}] não consegui carregar a imagem em NENHUMA tentativa.\n` +
        `   📦 Tamanho do arquivo: ${buffer.length} bytes\n` +
        `   🔍 Formato real detectado pelos bytes (não pela extensão): ${formato}\n` +
        `   ⚠️ Último erro: ${ultimoErro?.message}\n` +
        `   💡 Se o formato acima não for PNG/JPEG/WEBP/GIF/BMP, esse é o motivo — ` +
        `reenvie a imagem original (sem editar/renomear) ou converta pra JPEG antes de salvar.`
    );
    return null;
}

function quebrarTexto(ctx, texto, maxLargura) {
    const palavras = texto.split(" ");
    const linhas = [];
    let linhaAtual = "";

    for (const palavra of palavras) {
        const teste = linhaAtual ? `${linhaAtual} ${palavra}` : palavra;
        if (ctx.measureText(teste).width > maxLargura && linhaAtual) {
            linhas.push(linhaAtual);
            linhaAtual = palavra;
        } else {
            linhaAtual = teste;
        }
    }
    if (linhaAtual) linhas.push(linhaAtual);
    return linhas;
}

// Marca sempre "DVCL" — o nome do criador aparece à parte, dentro do texto
// de cada card (ex: "criado por ${ownerName}"), não na marca d'água.
function desenharAssinaturaDVCL(ctx, largura, altura, corDestaque = "#ff1744") {
    ctx.save();
    const texto = `💀 ${NOME_MARCA}`;
    ctx.font = `bold 18px ${FONTE_PRINCIPAL}`;
    const paddingX = 14, paddingY = 8;
    const larguraTexto = ctx.measureText(texto).width;
    const boxW = larguraTexto + paddingX * 2;
    const boxH = 30;
    const x = largura - boxW - 16;
    const y = altura - boxH - 14;

    ctx.globalAlpha = 0.85;
    ctx.fillStyle = "rgba(10,4,4,0.6)";
    desenharRetanguloArredondado(ctx, x, y, boxW, boxH, 14);
    ctx.fill();
    ctx.strokeStyle = corDestaque;
    ctx.lineWidth = 1.5;
    desenharRetanguloArredondado(ctx, x, y, boxW, boxH, 14);
    ctx.stroke();

    ctx.globalAlpha = 1;
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#ffe0e0";
    ctx.fillText(texto, x + paddingX, y + boxH / 2 + 1);
    ctx.restore();
}

// 💀 Caveirinha/marca decorativa simples no canto — reaproveitada em vários cards
function marcaCantoDestaque(ctx, largura, altura, cor = "#ff1744") {
    ctx.save();
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.font = `24px ${FONTE_PRINCIPAL}`;
    ctx.globalAlpha = 0.9;
    ctx.fillText("💀", 18, 16);
    ctx.restore();
}

async function desenharAvatarCircular(ctx, fotoBuffer, cx, cy, raio, corAnel = "#ffffff", textoFallback = null) {
    // anel decorativo
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, raio + 8, 0, Math.PI * 2);
    ctx.closePath();
    ctx.fillStyle = corAnel;
    ctx.shadowColor = "rgba(0,0,0,0.5)";
    ctx.shadowBlur = 18;
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, raio, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();

    const img = fotoBuffer ? await carregarImagemComDiagnostico(fotoBuffer, "avatar circular") : null;
    if (img) {
        // cobre o círculo mantendo proporção (cover)
        const escala = Math.max((raio * 2) / img.width, (raio * 2) / img.height);
        const w = img.width * escala;
        const h = img.height * escala;
        ctx.drawImage(img, cx - w / 2, cy - h / 2, w, h);
    } else {
        if (textoFallback) {
            // sem foto -> mostra o número/nome da pessoa dentro do círculo
            const grad = ctx.createLinearGradient(cx - raio, cy - raio, cx + raio, cy + raio);
            grad.addColorStop(0, "#3a1c71");
            grad.addColorStop(1, "#6a3de8");
            ctx.fillStyle = grad;
            ctx.fillRect(cx - raio, cy - raio, raio * 2, raio * 2);

            ctx.fillStyle = "#ffffff";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            // ajusta o tamanho da fonte conforme o tamanho do texto, pra caber no círculo
            let tamanhoFonte = Math.round(raio * 0.5);
            ctx.font = `bold ${tamanhoFonte}px ${FONTE_TITULO}`;
            let largura = ctx.measureText(textoFallback).width;
            const larguraMax = raio * 1.7;
            while (largura > larguraMax && tamanhoFonte > 10) {
                tamanhoFonte -= 2;
                ctx.font = `bold ${tamanhoFonte}px ${FONTE_TITULO}`;
                largura = ctx.measureText(textoFallback).width;
            }
            ctx.fillText(textoFallback, cx, cy);
        } else {
            // sem foto e sem texto -> desenha um avatar padrão (silhueta simples)
            ctx.fillStyle = "#999999";
            ctx.fillRect(cx - raio, cy - raio, raio * 2, raio * 2);
            ctx.fillStyle = "#666666";
            ctx.beginPath();
            ctx.arc(cx, cy - raio * 0.15, raio * 0.45, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(cx, cy + raio * 1.15, raio * 0.85, Math.PI, 0);
            ctx.fill();
        }
    }
    ctx.restore();
}

// ── Avatar QUADRADO (com cantos levemente arredondados) ──
// x,y = canto superior esquerdo do quadrado. tamanho = lado do quadrado.
async function desenharAvatarQuadrado(ctx, fotoBuffer, x, y, tamanho, corBorda = "#ffffff", textoFallback = null, raioCanto = 22, iconeFallback = null) {
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(x + raioCanto, y);
    ctx.arcTo(x + tamanho, y, x + tamanho, y + tamanho, raioCanto);
    ctx.arcTo(x + tamanho, y + tamanho, x, y + tamanho, raioCanto);
    ctx.arcTo(x, y + tamanho, x, y, raioCanto);
    ctx.arcTo(x, y, x + tamanho, y, raioCanto);
    ctx.closePath();
    ctx.shadowColor = "rgba(0,0,0,0.55)";
    ctx.shadowBlur = 20;
    ctx.fillStyle = "#1a1a1a";
    ctx.fill();
    ctx.clip();
    ctx.shadowBlur = 0;

    const img = fotoBuffer ? await carregarImagemComDiagnostico(fotoBuffer, "avatar quadrado") : null;
    if (img) {
        const escala = Math.max(tamanho / img.width, tamanho / img.height);
        const w = img.width * escala;
        const h = img.height * escala;
        ctx.drawImage(img, x + (tamanho - w) / 2, y + (tamanho - h) / 2, w, h);
    } else {
        if (iconeFallback) {
            // ícone genérico (ex: robô/coroa) — usado quando NÃO faz sentido mostrar
            // silhueta de pessoa (ex: foto do menu do bot)
            const grad = ctx.createLinearGradient(x, y, x + tamanho, y + tamanho);
            grad.addColorStop(0, "#210505");
            grad.addColorStop(1, "#3a0a0a");
            ctx.fillStyle = grad;
            ctx.fillRect(x, y, tamanho, tamanho);
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.font = `${Math.round(tamanho * 0.4)}px ${FONTE_PRINCIPAL}`;
            ctx.fillText(iconeFallback, x + tamanho / 2, y + tamanho / 2);
        } else if (textoFallback) {
            const grad = ctx.createLinearGradient(x, y, x + tamanho, y + tamanho);
            grad.addColorStop(0, "#3a1c71");
            grad.addColorStop(1, "#6a3de8");
            ctx.fillStyle = grad;
            ctx.fillRect(x, y, tamanho, tamanho);

            ctx.fillStyle = "#ffffff";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            let tamanhoFonte = Math.round(tamanho * 0.22);
            ctx.font = `bold ${tamanhoFonte}px ${FONTE_TITULO}`;
            let largura = ctx.measureText(textoFallback).width;
            const larguraMax = tamanho * 0.85;
            while (largura > larguraMax && tamanhoFonte > 10) {
                tamanhoFonte -= 2;
                ctx.font = `bold ${tamanhoFonte}px ${FONTE_TITULO}`;
                largura = ctx.measureText(textoFallback).width;
            }
            ctx.fillText(textoFallback, x + tamanho / 2, y + tamanho / 2);
        } else {
            ctx.fillStyle = "#999999";
            ctx.fillRect(x, y, tamanho, tamanho);
            ctx.fillStyle = "#666666";
            ctx.beginPath();
            ctx.arc(x + tamanho / 2, y + tamanho * 0.38, tamanho * 0.2, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(x + tamanho / 2, y + tamanho * 1.05, tamanho * 0.4, Math.PI, 0);
            ctx.fill();
        }
    }
    ctx.restore();

    // borda colorida em volta do quadrado
    ctx.save();
    ctx.strokeStyle = corBorda;
    ctx.lineWidth = 5;
    desenharRetanguloArredondado(ctx, x, y, tamanho, tamanho, raioCanto);
    ctx.stroke();
    ctx.restore();
}

// ── Raios elétricos decorativos (tema "vermelho com raios/quebradura") ──
function raiosEletricos(ctx, largura, altura, qtd = 5, cor = "rgba(255,60,60,0.55)") {
    ctx.save();
    ctx.strokeStyle = cor;
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.shadowColor = cor;
    ctx.shadowBlur = 10;
    for (let i = 0; i < qtd; i++) {
        let x = Math.random() * largura;
        let y = 0;
        ctx.beginPath();
        ctx.moveTo(x, y);
        const segmentos = 5 + Math.floor(Math.random() * 4);
        for (let s = 0; s < segmentos; s++) {
            x += (Math.random() - 0.5) * 70;
            y += altura / segmentos;
            ctx.lineTo(x, y);
        }
        ctx.stroke();
    }
    ctx.restore();
}

function confete(ctx, largura, altura, qtd = 60) {
    const cores = ["#ffd166", "#ef476f", "#06d6a0", "#118ab2", "#ffffff"];
    for (let i = 0; i < qtd; i++) {
        const x = Math.random() * largura;
        const y = Math.random() * altura;
        const r = 2 + Math.random() * 4;
        ctx.save();
        ctx.globalAlpha = 0.55 + Math.random() * 0.35;
        ctx.fillStyle = cores[i % cores.length];
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

function neblinaMacabra(ctx, largura, altura, qtd = 8) {
    for (let i = 0; i < qtd; i++) {
        const x = Math.random() * largura;
        const y = altura * 0.55 + Math.random() * altura * 0.45;
        const r = 60 + Math.random() * 120;
        const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
        grad.addColorStop(0, "rgba(80,0,20,0.35)");
        grad.addColorStop(1, "rgba(80,0,20,0)");
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
    }
}

function rachaduras(ctx, largura, altura, qtd = 6) {
    ctx.save();
    ctx.strokeStyle = "rgba(255,255,255,0.12)";
    ctx.lineWidth = 2;
    for (let i = 0; i < qtd; i++) {
        let x = Math.random() * largura;
        let y = Math.random() * altura * 0.3;
        ctx.beginPath();
        ctx.moveTo(x, y);
        const segmentos = 4 + Math.floor(Math.random() * 3);
        for (let s = 0; s < segmentos; s++) {
            x += (Math.random() - 0.5) * 60;
            y += 25 + Math.random() * 35;
            ctx.lineTo(x, y);
        }
        ctx.stroke();
    }
    ctx.restore();
}

function notasMusicais(ctx, largura, altura, qtd = 16) {
    const simbolos = ["♪", "♫", "♬", "♩"];
    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    for (let i = 0; i < qtd; i++) {
        const x = Math.random() * largura;
        const y = Math.random() * altura;
        const tamanho = 16 + Math.random() * 28;
        ctx.save();
        ctx.globalAlpha = 0.10 + Math.random() * 0.16;
        ctx.fillStyle = "#ffffff";
        ctx.font = `${tamanho}px ${FONTE_TITULO}`;
        ctx.translate(x, y);
        ctx.rotate((Math.random() - 0.5) * 0.6);
        ctx.fillText(simbolos[i % simbolos.length], 0, 0);
        ctx.restore();
    }
    ctx.restore();
}

function marcaDaguaDVCL() {
    // marca d'água removida a pedido — intencionalmente vazio
}

// ───────────────────────────────────────────────
// ✨ CARD DE BOAS-VINDAS (ALEGRE) — com variações de cor
// ───────────────────────────────────────────────
// Paletas diferentes pra cada card não sair sempre igual (sorteio por membro)
const PALETAS_BOASVINDAS = [
    { nome: "Royal",  cores: ["#1b1035", "#3a1c71", "#6a3de8"], anel: "#ffd166", titulo: "#ffd166" },
    { nome: "Neon",   cores: ["#03122e", "#0a3d62", "#00c2cb"], anel: "#00e5ff", titulo: "#00e5ff" },
    { nome: "Ouro",   cores: ["#241503", "#5c3a00", "#d98e04"], anel: "#ffe08a", titulo: "#ffe08a" },
    { nome: "Esmeralda", cores: ["#04120c", "#0b3d2e", "#12a86b"], anel: "#7CFFC4", titulo: "#7CFFC4" },
];

async function criarCardBoasVindas({ fotoBuffer, nomeUsuario, nomeGrupo, totalMembros, fotoFundoBuffer, variante }) {
    const W = 1000, H = 560;
    const canvas = createCanvas(W, H);
    const ctx = canvas.getContext("2d");

    const paleta = PALETAS_BOASVINDAS[
        Number.isInteger(variante) ? variante % PALETAS_BOASVINDAS.length : Math.floor(Math.random() * PALETAS_BOASVINDAS.length)
    ];

    // fundo: SEMPRE tenta usar a foto fixa (src/fundo.png), nítida, sem blur.
    // Usa o carregador robusto (detecta formato real + tenta de várias formas)
    // porque em alguns ambientes (Termux/Android) uma forma pode falhar.
    let usouFotoFundo = false;
    if (fotoFundoBuffer) {
        const imgFundo = await carregarImagemComDiagnostico(fotoFundoBuffer, "fundo.png (card boas-vindas)");
        if (imgFundo) {
            const escala = Math.max(W / imgFundo.width, H / imgFundo.height);
            const w = imgFundo.width * escala;
            const h = imgFundo.height * escala;
            ctx.drawImage(imgFundo, (W - w) / 2, (H - h) / 2, w, h);
            usouFotoFundo = true;
        }
    }
    if (!usouFotoFundo) {
        const grad = ctx.createLinearGradient(0, 0, W, H);
        grad.addColorStop(0, paleta.cores[0]);
        grad.addColorStop(0.5, paleta.cores[1]);
        grad.addColorStop(1, paleta.cores[2]);
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, W, H);
    }
    // véu leve só pra garantir contraste do texto, sem tirar a nitidez da foto
    if (usouFotoFundo) {
        ctx.fillStyle = "rgba(10,5,25,0.28)";
        ctx.fillRect(0, 0, W, H);
    }

    confete(ctx, W, H, 70);

    // moldura decorativa
    ctx.save();
    ctx.strokeStyle = "rgba(255,255,255,0.75)";
    ctx.lineWidth = 6;
    ctx.strokeRect(18, 18, W - 36, H - 36);
    ctx.restore();

    // avatar QUADRADO centralizado no topo
    const avTam = 200, avX = (W - avTam) / 2, avY = 42;
    await desenharAvatarQuadrado(ctx, fotoBuffer, avX, avY, avTam, paleta.anel, nomeUsuario);

    // textos centralizados, abaixo do avatar
    const larguraTexto = W - 120;
    let y = avY + avTam + 55;

    ctx.textAlign = "center";
    ctx.fillStyle = paleta.titulo;
    ctx.shadowColor = "rgba(0,0,0,0.5)";
    ctx.shadowBlur = 12;
    ctx.font = `bold 42px ${FONTE_TITULO}`;
    ctx.fillText("BEM-VINDO(A)! 🎉", W / 2, y);

    y += 46;
    ctx.fillStyle = "#ffffff";
    ctx.font = `bold 30px ${FONTE_TITULO}`;
    ctx.fillText(`@${nomeUsuario}`, W / 2, y);

    // info do grupo
    ctx.shadowBlur = 0;
    y += 40;
    ctx.font = `24px ${FONTE_PRINCIPAL}`;
    ctx.fillStyle = "rgba(255,255,255,0.95)";
    const linhasGrupo = quebrarTexto(ctx, nomeGrupo, larguraTexto);
    for (const linha of linhasGrupo.slice(0, 2)) {
        ctx.fillText(linha, W / 2, y);
        y += 30;
    }
    ctx.font = `20px ${FONTE_PRINCIPAL}`;
    ctx.fillText(`👥 ${totalMembros} membros`, W / 2, y + 6);

    ctx.textAlign = "left";
    marcaCantoDestaque(ctx, W, H, paleta.titulo);
    desenharAssinaturaDVCL(ctx, W, H, paleta.titulo);

    return canvas.encode("png");
}

// ───────────────────────────────────────────────
// 🥀 CARD DE DESPEDIDA (MACABRO — MAIS AGRESSIVO)
// ───────────────────────────────────────────────
const TITULOS_DESPEDIDA = ["ATÉ NUNCA MAIS... 🥀", "FOI EXPULSO(A)! 💀", "SUMIU DO MAPA... ☠️"];

function respingosSangue(ctx, largura, altura, qtd = 14) {
    ctx.save();
    for (let i = 0; i < qtd; i++) {
        const x = Math.random() * largura;
        const y = Math.random() * altura;
        const r = 3 + Math.random() * 9;
        ctx.globalAlpha = 0.5 + Math.random() * 0.4;
        ctx.fillStyle = "#a30016";
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.restore();
}

async function criarCardDespedida({ fotoBuffer, nomeUsuario, nomeGrupo, totalMembros, fotoFundoBuffer, variante }) {
    const W = 1000, H = 560;
    const canvas = createCanvas(W, H);
    const ctx = canvas.getContext("2d");

    // fundo: SEMPRE tenta usar a foto fixa (src/fundo.png), com o mesmo
    // carregador robusto do card de boas-vindas — só cai no gradiente
    // vermelho se realmente falhar.
    let usouFotoFundo = false;
    if (fotoFundoBuffer) {
        const imgFundo = await carregarImagemComDiagnostico(fotoFundoBuffer, "fundo.png (card despedida)");
        if (imgFundo) {
            const escala = Math.max(W / imgFundo.width, H / imgFundo.height);
            const w = imgFundo.width * escala;
            const h = imgFundo.height * escala;
            ctx.drawImage(imgFundo, (W - w) / 2, (H - h) / 2, w, h);
            usouFotoFundo = true;
        }
    }
    if (!usouFotoFundo) {
        const grad = ctx.createLinearGradient(0, 0, W, H);
        grad.addColorStop(0, "#050505");
        grad.addColorStop(0.5, "#1a0008");
        grad.addColorStop(1, "#3a0010");
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, W, H);
    }
    // véu leve só pra garantir contraste do texto, sem borrar a foto
    ctx.fillStyle = usouFotoFundo ? "rgba(20,0,4,0.35)" : "rgba(0,0,0,0.35)";
    ctx.fillRect(0, 0, W, H);

    neblinaMacabra(ctx, W, H, 12);
    rachaduras(ctx, W, H, 9);
    respingosSangue(ctx, W, H, 16);

    // moldura decorativa vermelho-sangue mais grossa/intensa
    ctx.save();
    ctx.strokeStyle = "rgba(200,0,30,0.9)";
    ctx.lineWidth = 8;
    ctx.strokeRect(16, 16, W - 32, H - 32);
    ctx.restore();

    // avatar QUADRADO com borda vermelho sangue — centralizado no topo
    const avTam = 200, avX = (W - avTam) / 2, avY = 42;
    await desenharAvatarQuadrado(ctx, fotoBuffer, avX, avY, avTam, "#8a0018", nomeUsuario);

    // "X" sangrento sobre o avatar
    ctx.save();
    ctx.strokeStyle = "rgba(230,0,50,0.85)";
    ctx.lineWidth = 10;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(avX + 20, avY + 20); ctx.lineTo(avX + avTam - 20, avY + avTam - 20);
    ctx.moveTo(avX + avTam - 20, avY + 20); ctx.lineTo(avX + 20, avY + avTam - 20);
    ctx.stroke();
    ctx.restore();

    // textos centralizados, abaixo do avatar
    const larguraTexto = W - 120;
    let y = avY + avTam + 55;

    // título (sorteado)
    const titulo = TITULOS_DESPEDIDA[
        Number.isInteger(variante) ? variante % TITULOS_DESPEDIDA.length : Math.floor(Math.random() * TITULOS_DESPEDIDA.length)
    ];
    ctx.textAlign = "center";
    ctx.fillStyle = "#ff0033";
    ctx.shadowColor = "rgba(0,0,0,0.9)";
    ctx.shadowBlur = 18;
    ctx.font = `bold 42px ${FONTE_TITULO}`;
    ctx.fillText(titulo, W / 2, y);

    y += 46;
    ctx.fillStyle = "#f2f2f2";
    ctx.font = `bold 30px ${FONTE_TITULO}`;
    ctx.fillText(`@${nomeUsuario}`, W / 2, y);

    // info do grupo
    ctx.shadowBlur = 0;
    y += 40;
    ctx.font = `24px ${FONTE_PRINCIPAL}`;
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    const linhasGrupo = quebrarTexto(ctx, `deixou o grupo ${nomeGrupo}`, larguraTexto);
    for (const linha of linhasGrupo.slice(0, 2)) {
        ctx.fillText(linha, W / 2, y);
        y += 30;
    }
    ctx.font = `20px ${FONTE_PRINCIPAL}`;
    ctx.fillStyle = "rgba(255,255,255,0.65)";
    ctx.fillText(`👥 restam ${totalMembros} membros`, W / 2, y + 6);

    ctx.textAlign = "left";
    marcaCantoDestaque(ctx, W, H, "#ff1744");
    desenharAssinaturaDVCL(ctx, W, H, "#ff1744");

    return canvas.encode("png");
}

// ───────────────────────────────────────────────
// 🎵 CARD DE MÚSICA
// ───────────────────────────────────────────────
async function criarCardMusica({ capaBuffer, titulo, artista, duracao }) {
    const W = 1000, H = 420;
    const canvas = createCanvas(W, H);
    const ctx = canvas.getContext("2d");

    // fundo: usa o fundo.png padrão (nítido, sem blur) — a capa da música
    // vira só o selo pequeno à esquerda, não o fundo inteiro
    const usouFundoPadrao = await desenharFundoPadrao(ctx, W, H);
    if (!usouFundoPadrao) {
        const grad = ctx.createLinearGradient(0, 0, W, H);
        grad.addColorStop(0, "#1f1147");
        grad.addColorStop(1, "#0b0b1f");
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, W, H);
    }

    // véu escuro pra garantir legibilidade do texto
    ctx.fillStyle = "rgba(0,0,0,0.4)";
    ctx.fillRect(0, 0, W, H);

    // carrega a capa só pra desenhar no selinho quadrado (não mais como fundo)
    const capaImg = capaBuffer ? await carregarImagemComDiagnostico(capaBuffer, "capa da música") : null;

    // ✦ marca sutil de fundo + marca colorida no canto + notinhas musicais decorativas
    marcaDaguaDVCL(ctx, W, H);
    marcaCantoDestaque(ctx, W, H, "#ff1744");
    notasMusicais(ctx, W, H, 18);

    // capa quadrada com cantos arredondados, à esquerda
    const tamCapa = 280;
    const xCapa = 60;
    const yCapa = (H - tamCapa) / 2;
    const raioCanto = 24;

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(xCapa + raioCanto, yCapa);
    ctx.arcTo(xCapa + tamCapa, yCapa, xCapa + tamCapa, yCapa + tamCapa, raioCanto);
    ctx.arcTo(xCapa + tamCapa, yCapa + tamCapa, xCapa, yCapa + tamCapa, raioCanto);
    ctx.arcTo(xCapa, yCapa + tamCapa, xCapa, yCapa, raioCanto);
    ctx.arcTo(xCapa, yCapa, xCapa + tamCapa, yCapa, raioCanto);
    ctx.closePath();
    ctx.shadowColor = "rgba(0,0,0,0.6)";
    ctx.shadowBlur = 20;
    ctx.fillStyle = "#111";
    ctx.fill();
    ctx.clip();
    ctx.shadowBlur = 0;

    if (capaImg) {
        const escalaCapa = Math.max(tamCapa / capaImg.width, tamCapa / capaImg.height);
        const wC = capaImg.width * escalaCapa;
        const hC = capaImg.height * escalaCapa;
        ctx.drawImage(capaImg, xCapa + (tamCapa - wC) / 2, yCapa + (tamCapa - hC) / 2, wC, hC);
    } else {
        ctx.fillStyle = "#333";
        ctx.fillRect(xCapa, yCapa, tamCapa, tamCapa);
    }
    ctx.restore();

    // equalizador decorativo — linhas finas no lugar das caixinhas grossas
    const baseX = xCapa + tamCapa + 50;
    const baseY = H - 60;
    ctx.save();
    ctx.strokeStyle = "rgba(255,255,255,0.5)";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    for (let i = 0; i < 22; i++) {
        const altura = 6 + Math.random() * 22;
        const x = baseX + i * 8;
        ctx.beginPath();
        ctx.moveTo(x, baseY);
        ctx.lineTo(x, baseY - altura);
        ctx.stroke();
    }
    ctx.restore();

    // textos
    const xTexto = xCapa + tamCapa + 50;
    let yTexto = 110;

    ctx.textAlign = "left";
    ctx.fillStyle = "#ffffff";
    ctx.shadowColor = "rgba(0,0,0,0.6)";
    ctx.shadowBlur = 8;
    ctx.font = `bold 22px ${FONTE_PRINCIPAL}`;
    ctx.fillText("🎵 TOCANDO AGORA", xTexto, yTexto);

    yTexto += 48;
    ctx.font = `bold 36px ${FONTE_TITULO}`;
    const linhasTitulo = quebrarTexto(ctx, titulo || "Título desconhecido", W - xTexto - 60);
    for (const linha of linhasTitulo.slice(0, 2)) {
        ctx.fillText(linha, xTexto, yTexto);
        yTexto += 42;
    }

    yTexto += 10;
    ctx.font = `26px ${FONTE_PRINCIPAL}`;
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    ctx.fillText(artista || "Artista desconhecido", xTexto, yTexto);

    if (duracao) {
        yTexto += 36;
        ctx.font = `22px ${FONTE_PRINCIPAL}`;
        ctx.fillStyle = "rgba(255,255,255,0.65)";
        ctx.fillText(`⏱ ${duracao}`, xTexto, yTexto);
    }

    desenharAssinaturaDVCL(ctx, W, H);

    return canvas.encode("png");
}

// ───────────────────────────────────────────────
// 🏆 CARD DE LEVEL UP (PERSONALIZADO — PERFIL + NÍVEL)
// ───────────────────────────────────────────────
async function criarCardLevelUp({ fotoBuffer, nomeUsuario, novoNivel, ouroGanho }) {
    const W = 1000, H = 560;
    const canvas = createCanvas(W, H);
    const ctx = canvas.getContext("2d");

    // fundo dourado/festivo
    const grad = ctx.createLinearGradient(0, 0, W, H);
    grad.addColorStop(0, "#1a1102");
    grad.addColorStop(0.5, "#4a2f00");
    grad.addColorStop(1, "#a86a00");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    confete(ctx, W, H, 90);

    // moldura decorativa dourada
    ctx.save();
    ctx.strokeStyle = "rgba(255,215,100,0.9)";
    ctx.lineWidth = 6;
    ctx.strokeRect(18, 18, W - 36, H - 36);
    ctx.restore();

    // avatar QUADRADO (foto do perfil, ou nome/número se não tiver foto)
    const avTam = 200, avX = W / 2 - avTam / 2, avY = 90;
    await desenharAvatarQuadrado(ctx, fotoBuffer, avX, avY, avTam, "#ffd166", nomeUsuario);

    // selo de nível sobre o avatar (canto inferior direito do quadrado)
    const selX = avX + avTam - 10, selY = avY + avTam - 10;
    ctx.save();
    ctx.beginPath();
    ctx.arc(selX, selY, 38, 0, Math.PI * 2);
    ctx.fillStyle = "#ffd166";
    ctx.shadowColor = "rgba(0,0,0,0.5)";
    ctx.shadowBlur = 10;
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = "#3a1c00";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `bold 30px ${FONTE_TITULO}`;
    ctx.fillText(novoNivel, selX, selY + 2);
    ctx.restore();

    // título
    ctx.textAlign = "center";
    ctx.fillStyle = "#ffd166";
    ctx.shadowColor = "rgba(0,0,0,0.5)";
    ctx.shadowBlur = 12;
    ctx.font = `bold 52px ${FONTE_TITULO}`;
    ctx.fillText("LEVEL UP! 🎉", W / 2, 345);

    // nome do usuário
    ctx.fillStyle = "#ffffff";
    ctx.font = `bold 36px ${FONTE_TITULO}`;
    ctx.fillText(`@${nomeUsuario}`, W / 2, 395);

    // nível e recompensa
    ctx.shadowBlur = 0;
    ctx.font = `30px ${FONTE_PRINCIPAL}`;
    ctx.fillStyle = "rgba(255,255,255,0.95)";
    ctx.fillText(`📈 Novo nível: ${novoNivel}`, W / 2, 450);
    ctx.font = `26px ${FONTE_PRINCIPAL}`;
    ctx.fillStyle = "rgba(255,230,150,0.95)";
    ctx.fillText(`🪙 +${ouroGanho} de Ouro`, W / 2, 486);

    marcaCantoDestaque(ctx, W, H, "#ffd166");
    desenharAssinaturaDVCL(ctx, W, H, "#ffd166");

    return canvas.encode("png");
}

// ───────────────────────────────────────────────
// 🪪 CARD DE PERFIL — foto, patente, nível, barra de progresso
// ───────────────────────────────────────────────
async function criarCardPerfil({ fotoBuffer, nomeUsuario, patente, nivel, exp, expNecessario, moedas, vitorias, derrotas }) {
    const W = 1000, H = 620;
    const canvas = createCanvas(W, H);
    const ctx = canvas.getContext("2d");

    // paleta reaproveitada (mesma família visual dos outros cards)
    const paleta = PALETAS_BOASVINDAS[nivel % PALETAS_BOASVINDAS.length];

    const grad = ctx.createLinearGradient(0, 0, W, H);
    grad.addColorStop(0, paleta.cores[0]);
    grad.addColorStop(0.5, paleta.cores[1]);
    grad.addColorStop(1, paleta.cores[2]);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    // moldura decorativa
    ctx.save();
    ctx.strokeStyle = "rgba(255,255,255,0.7)";
    ctx.lineWidth = 6;
    ctx.strokeRect(18, 18, W - 36, H - 36);
    ctx.restore();

    // avatar QUADRADO (foto ou nome/número como fallback)
    const avTam = 200, avX = W / 2 - avTam / 2, avY = 75;
    await desenharAvatarQuadrado(ctx, fotoBuffer, avX, avY, avTam, paleta.anel, nomeUsuario);

    // nome
    ctx.textAlign = "center";
    ctx.fillStyle = "#ffffff";
    ctx.shadowColor = "rgba(0,0,0,0.5)";
    ctx.shadowBlur = 10;
    ctx.font = `bold 38px ${FONTE_TITULO}`;
    ctx.fillText(`@${nomeUsuario}`, W / 2, 320);

    // patente
    ctx.fillStyle = paleta.titulo;
    ctx.font = `bold 30px ${FONTE_TITULO}`;
    ctx.fillText(patente, W / 2, 362);

    // nível
    ctx.shadowBlur = 0;
    ctx.fillStyle = "rgba(255,255,255,0.95)";
    ctx.font = `26px ${FONTE_PRINCIPAL}`;
    ctx.fillText(`⭐ Nível ${nivel}`, W / 2, 408);

    // barra de progresso desenhada (não em texto)
    const barW = 640, barH = 26, barX = (W - barW) / 2, barY = 430;
    const progresso = Math.max(0, Math.min(1, exp / expNecessario));
    ctx.save();
    ctx.fillStyle = "rgba(0,0,0,0.35)";
    desenharRetanguloArredondado(ctx, barX, barY, barW, barH, 13);
    ctx.fill();
    if (progresso > 0) {
        ctx.fillStyle = paleta.anel;
        desenharRetanguloArredondado(ctx, barX, barY, barW * progresso, barH, 13);
        ctx.fill();
    }
    ctx.strokeStyle = "rgba(255,255,255,0.6)";
    ctx.lineWidth = 2;
    desenharRetanguloArredondado(ctx, barX, barY, barW, barH, 13);
    ctx.stroke();
    ctx.restore();

    ctx.fillStyle = "#ffffff";
    ctx.font = `20px ${FONTE_PRINCIPAL}`;
    ctx.fillText(`${exp} / ${expNecessario} EXP (${Math.floor(progresso * 100)}%)`, W / 2, barY + 50);

    // recursos (moedas / vitórias / derrotas) lado a lado
    ctx.font = `24px ${FONTE_PRINCIPAL}`;
    ctx.fillStyle = "rgba(255,255,255,0.95)";
    ctx.fillText(`💸 ${Number(moedas).toLocaleString("pt-BR")}   ✅ ${vitorias}   ❌ ${derrotas}`, W / 2, 545);

    marcaCantoDestaque(ctx, W, H, paleta.titulo);
    desenharAssinaturaDVCL(ctx, W, H, paleta.titulo);

    return canvas.encode("png");
}

function desenharRetanguloArredondado(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
}

// ───────────────────────────────────────────────
// 🖤 CARD DO MENU — visual escuro/profissional
// Com foto: a foto entra desfocada/escurecida de fundo, com um brilho
// suave atrás do nome. Sem foto: fundo escuro liso com o mesmo brilho,
// pra nunca ficar "sem nada" quando não há imagem configurada.
// ───────────────────────────────────────────────
async function criarCardMenu({ fotoBuffer, botName, ownerName }) {
    const W = 1000, H = 560;
    const canvas = createCanvas(W, H);
    const ctx = canvas.getContext("2d");

    // ── FUNDO: a foto do menu.png cobrindo o card inteiro, NÍTIDA, sem blur ──
    // Usa o carregador robusto (detecta o formato real do arquivo + tenta
    // de várias formas), porque em alguns ambientes (Termux/Android) uma
    // forma pode falhar mesmo com o arquivo sendo válido.
    let temFoto = false;
    if (fotoBuffer) {
        const img = await carregarImagemComDiagnostico(fotoBuffer, "menu.png (card do menu)");
        if (img) {
            const escala = Math.max(W / img.width, H / img.height);
            const w = img.width * escala;
            const h = img.height * escala;
            ctx.drawImage(img, (W - w) / 2, (H - h) / 2, w, h);
            temFoto = true;
        }
    } else {
        console.error("❌ Nenhum buffer de foto foi passado pro card do menu (menu.png não encontrado).");
    }

    // Se mesmo assim a foto não carregar (caso raríssimo), usa só um fundo
    // escuro liso — nunca mais aquele fundo vermelho gigante com rachaduras/raios
    // cobrindo a tela inteira.
    if (!temFoto) {
        ctx.fillStyle = "#0a0303";
        ctx.fillRect(0, 0, W, H);
    }

    // véu bem leve só embaixo, pra dar contraste pro texto do carimbo sem
    // esconder a foto no resto do card
    const veu = ctx.createLinearGradient(0, H * 0.55, 0, H);
    veu.addColorStop(0, "rgba(0,0,0,0)");
    veu.addColorStop(1, "rgba(0,0,0,0.55)");
    ctx.fillStyle = veu;
    ctx.fillRect(0, H * 0.55, W, H * 0.45);

    // moldura fina vermelha em volta do card inteiro
    ctx.save();
    ctx.strokeStyle = "rgba(255,23,68,0.55)";
    ctx.lineWidth = 3;
    ctx.strokeRect(16, 16, W - 32, H - 32);
    ctx.restore();

    // ── CARTELA/SELO no canto inferior esquerdo com o nome do bot e do criador ──
    const padX = 26, padY = 18;
    ctx.font = `bold 34px ${FONTE_TITULO}`;
    const larguraNome = ctx.measureText(botName.toUpperCase()).width;
    const boxW = Math.max(larguraNome + padX * 2, 300);
    const boxH = 100;
    const boxX = 34;
    const boxY = H - boxH - 34;

    ctx.save();
    ctx.fillStyle = "rgba(10,2,2,0.72)";
    desenharRetanguloArredondado(ctx, boxX, boxY, boxW, boxH, 18);
    ctx.fill();
    ctx.strokeStyle = "#ff1744";
    ctx.lineWidth = 2.5;
    desenharRetanguloArredondado(ctx, boxX, boxY, boxW, boxH, 18);
    ctx.stroke();
    ctx.restore();

    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    ctx.fillStyle = "#ffffff";
    ctx.shadowColor = "rgba(0,0,0,0.8)";
    ctx.shadowBlur = 10;
    ctx.font = `bold 34px ${FONTE_TITULO}`;
    ctx.fillText(botName.toUpperCase(), boxX + padX, boxY + 42);

    ctx.shadowBlur = 0;
    ctx.fillStyle = "#ff5c7a";
    ctx.font = `bold 18px ${FONTE_PRINCIPAL}`;
    ctx.fillText("PAINEL DE COMANDOS ⚡", boxX + padX, boxY + 68);

    ctx.fillStyle = "rgba(255,255,255,0.75)";
    ctx.font = `16px ${FONTE_PRINCIPAL}`;
    ctx.fillText(`👑 criado por ${ownerName}`, boxX + padX, boxY + 90);

    marcaCantoDestaque(ctx, W, H, "#ff1744");
    desenharAssinaturaDVCL(ctx, W, H, "#ff1744");

    return canvas.encode("png");
}

// ───────────────────────────────────────────────
// 💞 CARD DE CASAL — duas fotos quadradas lado a lado + barra de compatibilidade
// ───────────────────────────────────────────────
async function criarCardCasal({ fotoBuffer1, nomeUsuario1, fotoBuffer2, nomeUsuario2, porcentagem }) {
    const W = 1000, H = 560;
    const canvas = createCanvas(W, H);
    const ctx = canvas.getContext("2d");

    const usouFundo = await desenharFundoPadrao(ctx, W, H);
    if (!usouFundo) {
        const gradBase = ctx.createLinearGradient(0, 0, W, H);
        gradBase.addColorStop(0, "#210510");
        gradBase.addColorStop(0.5, "#3a0a1c");
        gradBase.addColorStop(1, "#0a0305");
        ctx.fillStyle = gradBase;
        ctx.fillRect(0, 0, W, H);
    }
    ctx.fillStyle = "rgba(0,0,0,0.4)";
    ctx.fillRect(0, 0, W, H);

    rachaduras(ctx, W, H, 5);

    ctx.save();
    ctx.strokeStyle = "rgba(255,23,90,0.5)";
    ctx.lineWidth = 3;
    ctx.strokeRect(16, 16, W - 32, H - 32);
    ctx.restore();

    // título
    ctx.textAlign = "center";
    ctx.fillStyle = "#ff5c8a";
    ctx.shadowColor = "rgba(0,0,0,0.7)";
    ctx.shadowBlur = 14;
    ctx.font = `bold 42px ${FONTE_TITULO}`;
    ctx.fillText("💘 TESTE DE CASAL 💘", W / 2, 70);
    ctx.shadowBlur = 0;

    // duas fotos quadradas, lado a lado, com coração no meio
    const tamFoto = 260;
    const yFoto = 120;
    const xFoto1 = W / 2 - tamFoto - 40;
    const xFoto2 = W / 2 + 40;

    await desenharAvatarQuadrado(ctx, fotoBuffer1, xFoto1, yFoto, tamFoto, "#ff1744", nomeUsuario1);
    await desenharAvatarQuadrado(ctx, fotoBuffer2, xFoto2, yFoto, tamFoto, "#ff1744", nomeUsuario2);

    // coração no centro, entre as duas fotos
    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `54px ${FONTE_TITULO}`;
    ctx.fillStyle = "#ff1744";
    ctx.shadowColor = "rgba(0,0,0,0.6)";
    ctx.shadowBlur = 12;
    ctx.fillText("💞", W / 2, yFoto + tamFoto / 2);
    ctx.restore();

    // nomes abaixo das fotos
    ctx.fillStyle = "#ffffff";
    ctx.font = `bold 24px ${FONTE_TITULO}`;
    ctx.shadowBlur = 0;
    ctx.fillText(`@${nomeUsuario1}`, xFoto1 + tamFoto / 2, yFoto + tamFoto + 38);
    ctx.fillText(`@${nomeUsuario2}`, xFoto2 + tamFoto / 2, yFoto + tamFoto + 38);

    // barra de compatibilidade
    const barW = 640, barH = 30, barX = (W - barW) / 2, barY = yFoto + tamFoto + 78;
    const progresso = Math.max(0, Math.min(1, porcentagem / 100));
    ctx.save();
    ctx.fillStyle = "rgba(0,0,0,0.4)";
    desenharRetanguloArredondado(ctx, barX, barY, barW, barH, 15);
    ctx.fill();
    if (progresso > 0) {
        const gradBar = ctx.createLinearGradient(barX, 0, barX + barW, 0);
        gradBar.addColorStop(0, "#ff1744");
        gradBar.addColorStop(1, "#ff5c8a");
        ctx.fillStyle = gradBar;
        desenharRetanguloArredondado(ctx, barX, barY, barW * progresso, barH, 15);
        ctx.fill();
    }
    ctx.strokeStyle = "rgba(255,255,255,0.6)";
    ctx.lineWidth = 2;
    desenharRetanguloArredondado(ctx, barX, barY, barW, barH, 15);
    ctx.stroke();
    ctx.restore();

    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "center";
    ctx.font = `bold 22px ${FONTE_PRINCIPAL}`;
    ctx.fillText(`${porcentagem}% de compatibilidade`, W / 2, barY + barH + 34);

    marcaCantoDestaque(ctx, W, H, "#ff1744");
    desenharAssinaturaDVCL(ctx, W, H, "#ff1744");

    return canvas.encode("png");
}

module.exports = {
    criarCardBoasVindas,
    criarCardDespedida,
    criarCardMusica,
    criarCardLevelUp,
    criarCardPerfil,
    criarCardMenu,
    criarCardCasal,
    baixarBuffer,
    detectarFormatoImagem,
    carregarImagemComDiagnostico,
};
