/* =================================================
   🎬 CONVERSOR UNIVERSAL — TUDO PARA GIF / VÍDEO
   📁 Arquivo: converterParaGif.js
   🤖 ${config.BOT_NAME} • ${config.OWNER_NAME}
   💡 FUNCIONA COM: IMAGEM • VÍDEO • FIGURINHA (ESTÁTICA OU ANIMADA)
   ================================================= */

const { downloadContentFromMessage } = require("@whiskeysockets/baileys");
const { exec, spawn } = require("child_process");
const fs = require("fs");
const path = require("path");
const config = require("../../config");

// 🧹 LIMPEZA TOTAL — NÃO DEIXA NADA SOBRANDO
function limparArquivos(caminhoEntrada, caminhoSaida, pastaQuadros = null) {
    try {
        if (caminhoEntrada && fs.existsSync(caminhoEntrada)) fs.unlinkSync(caminhoEntrada);
        if (caminhoSaida && fs.existsSync(caminhoSaida)) fs.unlinkSync(caminhoSaida);
        if (pastaQuadros && fs.existsSync(pastaQuadros)) fs.rmSync(pastaQuadros, { recursive: true, force: true });
    } catch {}
}

// 📤 ENVIO FINAL PADRÃO
function executarFfmpegArquivo(argumentos) {
    return new Promise((resolve, reject) => {
        const processo = spawn("ffmpeg", argumentos, { stdio: ["ignore", "ignore", "pipe"] });
        let erro = "";
        processo.stderr.on("data", parte => { erro += String(parte); });
        processo.once("error", reject);
        processo.once("close", codigo => {
            if (codigo === 0) resolve();
            else reject(new Error(erro.slice(-1200) || `FFmpeg encerrou com código ${codigo}`));
        });
    });
}

function executarComando(comando, argumentos) {
    return new Promise((resolve, reject) => {
        const processo = spawn(comando, argumentos, { stdio: ["ignore", "pipe", "pipe"] });
        let saida = "", erro = "";
        processo.stdout.on("data", p => { saida += String(p); });
        processo.stderr.on("data", p => { erro += String(p); });
        processo.once("error", e => {
            if (e.code === "ENOENT") reject(new Error(`comando "${comando}" não encontrado (rode: pkg install libwebp)`));
            else reject(e);
        });
        processo.once("close", codigo => {
            if (codigo === 0) resolve(saida);
            else reject(new Error(erro.slice(-500) || `${comando} encerrou com código ${codigo}`));
        });
    });
}

// 🎴 Extrai cada frame do WebP animado com webpmux + dwebp e monta o vídeo
// a partir da sequência de PNGs. Contorna o bug do decoder de WebP ANIMADO
// embutido no FFmpeg (que em vários builds — incluindo Termux — lê o
// container mas não acha os dados de imagem: "image data not found").
async function converterWebpAnimadoViaFrames(tempEntrada, tempSaida, pastaQuadros) {
    fs.mkdirSync(pastaQuadros, { recursive: true });

    const info = await executarComando("webpmux", ["-info", tempEntrada]);
    const match = info.match(/Number of frames:\s*(\d+)/i);
    const totalFrames = match ? parseInt(match[1], 10) : 0;
    if (!totalFrames) throw new Error(`webpmux não encontrou frames no arquivo (saída: ${info.slice(0, 200)})`);

    // ⚡ CORREÇÃO DE VELOCIDADE: antes cada frame rodava webpmux+dwebp em
    // SEQUÊNCIA (um de cada vez) — numa figurinha com muitos frames isso
    // é o que mais pesava no tempo total. Agora extrai em LOTES paralelos
    // (4 por vez), usando os núcleos do celular em vez de um só.
    const CONCORRENCIA = 4;

    async function extrairFrame(i) {
        const numero = String(i).padStart(4, "0");
        const frameWebp = path.join(pastaQuadros, `f_${numero}.webp`);
        const framePng = path.join(pastaQuadros, `frame_${numero}.png`);
        await executarComando("webpmux", ["-get", "frame", String(i), tempEntrada, "-o", frameWebp]);
        await executarComando("dwebp", [frameWebp, "-o", framePng]);
    }

    const indices = Array.from({ length: totalFrames }, (_, idx) => idx + 1);
    for (let inicio = 0; inicio < indices.length; inicio += CONCORRENCIA) {
        const lote = indices.slice(inicio, inicio + CONCORRENCIA);
        await Promise.all(lote.map(extrairFrame));
    }

    await executarFfmpegArquivo([
        "-y", "-threads", "0", "-loglevel", "error", "-framerate", "15",
        "-i", path.join(pastaQuadros, "frame_%04d.png"),
        "-c:v", "libx264", "-pix_fmt", "yuv420p",
        "-vf", "scale=trunc(iw/2)*2:trunc(ih/2)*2,fps=12",
        "-t", "6", "-crf", "24", "-preset", "ultrafast", "-an", tempSaida
    ]);
}

function executarFfmpegPipe(buffer, argumentos) {
    return new Promise((resolve, reject) => {
        const processo = spawn("ffmpeg", argumentos, { stdio: ["pipe", "ignore", "pipe"] });
        let erro = "";
        processo.stderr.on("data", parte => { erro += String(parte); });
        processo.once("error", reject);
        processo.once("close", codigo => {
            if (codigo === 0) resolve();
            else reject(new Error(erro.slice(-1200) || `FFmpeg encerrou com código ${codigo}`));
        });
        processo.stdin.end(buffer);
    });
}

async function enviarResultado(sock, dados) {
    const { from, remetente, arquivoFinal, msg, modoSaida } = dados;

    try {
        if (modoSaida === "imagem") {
            await sock.sendMessage(from, {
                image: fs.readFileSync(arquivoFinal),
                caption: `✅ Convertido, @${remetente.split('@')[0]}!`,
                mentions: [remetente]
            }, { quoted: msg });
        } else {
            await sock.sendMessage(from, {
                video: fs.readFileSync(arquivoFinal),
                mimetype: 'video/mp4',
                caption: `✅ Convertido, @${remetente.split('@')[0]}!`,
                mentions: [remetente],
                gifPlayback: true // ✅ Aparece direto como GIF no WhatsApp
            }, { quoted: msg });
        }

    } catch (erroEnvio) {
        console.error("❌ Erro envio:", erroEnvio);
        await sock.sendMessage(from, { text: "⚠️ Converti certo, mas deu problema ao enviar! Tente novamente." }, { quoted: msg });
    } finally {
        limparArquivos(dados.tempEntrada, arquivoFinal, dados.pastaQuadros);
    }
}

// 🖼️ Extrai só o PRIMEIRO frame de um webp animado (usando webpmux+dwebp,
// mesmo contorno de bug do converterWebpAnimadoViaFrames) e converte pra
// JPG — usado pelo modo "imagem" quando a entrada é figurinha animada.
async function extrairPrimeiroFrameWebp(tempEntrada, tempSaidaJpg, pastaQuadros) {
    fs.mkdirSync(pastaQuadros, { recursive: true });
    const frameWebp = path.join(pastaQuadros, "f_0001.webp");
    const framePng = path.join(pastaQuadros, "frame_0001.png");
    await executarComando("webpmux", ["-get", "frame", "1", tempEntrada, "-o", frameWebp]);
    await executarComando("dwebp", [frameWebp, "-o", framePng]);
    await executarFfmpegArquivo(["-y", "-loglevel", "error", "-i", framePng, tempSaidaJpg]);
}

// ⚙️ FUNÇÃO PRINCIPAL — ACEITA TUDO E SE ADAPTA SOZINHA
// modoSaida: "gif" (padrão, vídeo com gifPlayback) ou "imagem" (JPG parado)
async function converterParaGif(sock, msg, modoSaida = "gif") {
    const from = msg.key.remoteJid;
    const remetente = msg.key.participant || msg.key.remoteJid;

    // 📥 PEGA QUALQUER TIPO DE MÍDIA — DIRETA OU RESPONDIDA
    const dir = msg.message;
    const res = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;

    let midia, tipo;

    if (res?.stickerMessage) { midia = res.stickerMessage; tipo = res.stickerMessage.isAnimated ? "sticker_animado" : "sticker_estatico"; }
    else if (dir?.stickerMessage) { midia = dir.stickerMessage; tipo = dir.stickerMessage.isAnimated ? "sticker_animado" : "sticker_estatico"; }
    else if (res?.imageMessage) { midia = res.imageMessage; tipo = "imagem"; }
    else if (dir?.imageMessage) { midia = dir.imageMessage; tipo = "imagem"; }
    else if (res?.videoMessage) { midia = res.videoMessage; tipo = "video"; }
    else if (dir?.videoMessage) { midia = dir.videoMessage; tipo = "video"; }
    else {
        // ❌ NÃO TEM NENHUMA MÍDIA
        const rotuloModo = modoSaida === "imagem" ? "imagem" : "gif";
        return sock.sendMessage(from, { 
            text: `❌ *NÃO ENCONTREI NADA!*\n\nEnvie ou RESPONDA em cima de:\n🖼️ Imagem | 🎥 Vídeo | 🎴 Figurinha\nCom: ${config.PREFIX}${modoSaida === "imagem" ? "toimg" : "gif"} (converte pra ${rotuloModo})` 
        }, { quoted: msg });
    }

    try {
        // ✅ AVISO INICIAL — simples, só marcando quem pediu (igual o .figurinha)
        await sock.sendMessage(from, { text: `⏳ Convertendo pra ${modoSaida === "imagem" ? "imagem" : "gif"}, @${remetente.split('@')[0]}...`, mentions: [remetente] }, { quoted: msg });

        // ⬇️ BAIXA O ARQUIVO
        const stream = await downloadContentFromMessage(midia, tipo.includes("sticker") ? "sticker" : tipo);
        let buffer = Buffer.from([]);
        for await (const pedaco of stream) buffer = Buffer.concat([buffer, pedaco]);

        // 🔍 DIAGNÓSTICO — confirma se o que baixamos é um WebP de verdade
        // antes de gastar tempo chamando o ffmpeg. Se o mediaKey/URL da
        // mensagem citada vier incompleto, o buffer sai corrompido e o
        // ffmpeg trava com "image data not found" — isso pega esse caso
        // cedo e com um log muito mais claro.
        console.log(`📦 Buffer baixado: ${buffer.length} bytes | assinatura: ${buffer.subarray(0, 12).toString('hex')}`);
        if (tipo.includes("sticker")) {
            const assinaturaValida = buffer.length > 12 &&
                buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
                buffer.subarray(8, 12).toString("ascii") === "WEBP";
            if (!assinaturaValida) {
                throw new Error(
                    `Download da figurinha veio corrompido/incompleto (${buffer.length} bytes, ` +
                    `assinatura "${buffer.subarray(0, 12).toString('hex')}" ≠ RIFF....WEBP). ` +
                    `Provável falha na descriptografia da mídia (mediaKey/URL da mensagem citada). ` +
                    `Verifique a versão do @whiskeysockets/baileys e se a figurinha ainda está ` +
                    `acessível (mensagens de mídia expiram/são removidas do servidor do WhatsApp).`
                );
            }
        }

        // 📁 ARQUIVOS ÚNICOS
        const idUnico = Date.now() + "_" + Math.floor(Math.random() * 9999);
        const extensaoEntrada = tipo === "sticker_animado" ? "webp" : "tmp";
        const tempEntrada = path.join(__dirname, `ent_${idUnico}.${extensaoEntrada}`);
        const tempSaida = path.join(__dirname, modoSaida === "imagem" ? `sai_${idUnico}.jpg` : `sai_${idUnico}.mp4`);
        const pastaQuadros = path.join(__dirname, `quadros_${idUnico}`);

        fs.writeFileSync(tempEntrada, buffer);

        // 🎯 AQUI DECIDE O CAMINHO CERTO DE CONVERSÃO
        // ⚡ preset veryfast (era "medium") = codifica bem mais rápido com o
        // mesmo CRF, ou seja, mesma qualidade visual, arquivo levemente maior
        // — ótima troca pra quem tá rodando isso num celular via Termux.
        // -threads 0 deixa o ffmpeg usar todos os núcleos disponíveis.
        if (tipo === "sticker_animado" && modoSaida === "imagem") {
            // 🖼️ FIGURINHA ANIMADA → IMAGEM: pega só o primeiro frame
            try {
                await extrairPrimeiroFrameWebp(tempEntrada, tempSaida, pastaQuadros);
            } catch (erroFrame) {
                console.warn("⚠️ extração de 1 frame via webpmux/dwebp falhou; tentando ffmpeg direto:", erroFrame.message);
                await executarFfmpegArquivo(["-y", "-loglevel", "error", "-i", tempEntrada, "-frames:v", "1", tempSaida]);
            }
            if (!fs.existsSync(tempSaida) || fs.statSync(tempSaida).size < 512) {
                throw new Error("FFmpeg não gerou uma imagem válida a partir da figurinha.");
            }
            await enviarResultado(sock, { from, remetente, tempEntrada, arquivoFinal: tempSaida, pastaQuadros, msg, modoSaida });
        }
        else if (tipo === "sticker_animado") {
            // 🎴 WEBP ANIMADO → GIF: método principal: extrai cada frame com
            // webpmux+dwebp e monta o vídeo a partir dos PNGs. Isso contorna
            // um bug do decoder de WebP animado embutido no FFmpeg (lê o
            // container mas não acha os dados de imagem). Se webpmux/dwebp
            // não estiverem instalados (pkg install libwebp), cai pro
            // método antigo (ffmpeg direto) como última tentativa.
            const saidaComum = [
                "-c:v", "libx264", "-pix_fmt", "yuv420p",
                "-vf", "scale=trunc(iw/2)*2:trunc(ih/2)*2,fps=12",
                "-t", "6", "-crf", "24", "-preset", "ultrafast", "-an", tempSaida
            ];
            let erroFrames;
            try {
                await converterWebpAnimadoViaFrames(tempEntrada, tempSaida, pastaQuadros);
            } catch (falhaFrames) {
                erroFrames = falhaFrames;
                console.warn("⚠️ extração via webpmux/dwebp falhou; tentando ffmpeg direto:", falhaFrames.message);
                limparArquivos(null, tempSaida, pastaQuadros);
                let erroArquivo;
                try {
                    await executarFfmpegArquivo([
                        "-y", "-threads", "0", "-loglevel", "error",
                        "-max_error_rate", "1.0", "-err_detect", "ignore_err",
                        "-i", tempEntrada, ...saidaComum
                    ]);
                } catch (falhaArquivo) {
                    erroArquivo = falhaArquivo;
                    limparArquivos(null, tempSaida, null);
                    try {
                        await executarFfmpegPipe(buffer, [
                            "-y", "-threads", "0", "-loglevel", "error",
                            "-max_error_rate", "1.0", "-err_detect", "ignore_err",
                            "-f", "webp_pipe", "-i", "pipe:0", ...saidaComum
                        ]);
                    } catch (falhaPipe) {
                        throw new Error(`frames: ${erroFrames.message} | arquivo: ${erroArquivo.message} | webp_pipe: ${falhaPipe.message}`);
                    }
                }
            }
            if (!fs.existsSync(tempSaida) || fs.statSync(tempSaida).size < 1024) {
                throw new Error("FFmpeg não gerou um vídeo válido a partir da figurinha.");
            }
            await enviarResultado(sock, { from, remetente, tempEntrada, arquivoFinal: tempSaida, pastaQuadros, msg, modoSaida });
        } 
        else if (modoSaida === "imagem") {
            // 🖼️ FIGURINHA ESTÁTICA / IMAGEM / VÍDEO → IMAGEM: pega só 1 frame
            const cmd = `ffmpeg -y -threads 0 -loglevel error -i "${tempEntrada}" -frames:v 1 "${tempSaida}"`;
            exec(cmd, (erroExec) => {
                if (erroExec || !fs.existsSync(tempSaida) || fs.statSync(tempSaida).size < 512) {
                    console.error("❌ Erro ao extrair imagem:", erroExec);
                    limparArquivos(tempEntrada, tempSaida, null);
                    return sock.sendMessage(from, { text: "😵 Não consegui gerar a imagem a partir disso." }, { quoted: msg });
                }
                enviarResultado(sock, { from, remetente, tempEntrada, arquivoFinal: tempSaida, pastaQuadros: null, msg, modoSaida });
            });
        }
        else if (tipo === "sticker_estatico" || tipo === "imagem") {
            // 🖼️ ESTÁTICA/IMAGEM → CRIA VÍDEO COM DURAÇÃO PARA FICAR COMO GIF
            const cmd = `ffmpeg -y -threads 0 -loop 1 -i "${tempEntrada}" -t 3 -c:v libx264 -pix_fmt yuv420p -vf "scale=trunc(iw/2)*2:trunc(ih/2)*2,fps=15" -crf 23 -preset ultrafast -an "${tempSaida}"`;
            
            exec(cmd, () => enviarResultado(sock, { from, remetente, tempEntrada, arquivoFinal: tempSaida, pastaQuadros: null, msg, modoSaida }));
        } 
        else {
            // 🎥 VÍDEO → OTIMIZA E ENVIA DIRETO COMO GIF
            const cmd = `ffmpeg -y -threads 0 -i "${tempEntrada}" -t 3 -c:v libx264 -pix_fmt yuv420p -vf "scale=trunc(iw/2)*2:trunc(ih/2)*2,fps=15" -crf 23 -preset ultrafast -an "${tempSaida}"`;
            
            exec(cmd, () => enviarResultado(sock, { from, remetente, tempEntrada, arquivoFinal: tempSaida, pastaQuadros: null, msg, modoSaida }));
        }

    } catch (erroGeral) {
        console.error("Erro:", erroGeral);
        await sock.sendMessage(from, { text: "😵 Erro inesperado ao processar arquivo!" }, { quoted: msg });
    }
}

module.exports = { converterParaGif };
