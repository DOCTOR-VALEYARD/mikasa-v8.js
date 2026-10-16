/* =================================================
   🎵 MIKASA BOT — MUSICA V6.7
   📁 musica.js
   👑 DOCTOR VALEYARD

   V6.7
   ✅ .play Artista -> escolhe uma música do artista
   ✅ .play Artista Música -> procura a música
   ✅ .play Música -> procura a música
   ✅ Busca vários resultados antes do download
   ✅ SOMENTE 1 download
   ✅ Retry automático trocando de cliente do YouTube (android/default/ios)
      se um estiver bloqueado (403 / "confirme que não é robô")
   ✅ Áudio enviado no formato ORIGINAL (m4a/webm/opus) — sem conversão
      pra MP3, que era a etapa mais lenta (ffmpeg recodificando tudo).
      O WhatsApp toca esses formatos direto, sem perda de qualidade.
   ✅ Vídeo e documento mantidos
   ✅ Card final mantido
================================================= */

const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const https = require('https');
const axios = require('axios');

const config = require('../../config');
const { enviarNativeFlow, botao, botaoUrl } = require('../menuBotoes/menuBotoes');

const { criarCardMusica } =
    require('../cardGenerator/cardGenerator');

const { enviarCardOuAnimado } =
    require('../card-envio/card-envio');

const { buscarFotoContexto } =
    require('../foto-contexto/foto-contexto');

const { baixarAudioApi } =
    require('../ytapi/ytapi');

// youtubei.js é usado somente para pesquisar. O yt-dlp continua sendo o
// fallback automático e também continua responsável pelo download.
let youtubeiInstanciaPromise = null;

function obterYoutubei() {
    if (!youtubeiInstanciaPromise) {
        youtubeiInstanciaPromise = Promise.resolve()
            .then(() => require('youtubei.js'))
            .then(({ Innertube }) => Innertube.create())
            .catch(erro => {
                // Se a dependência ainda não foi instalada ou o YouTube.js
                // não conseguir iniciar, a busca antiga assume imediatamente.
                youtubeiInstanciaPromise = null;
                throw erro;
            });
    }
    return youtubeiInstanciaPromise;
}

// =================================================
// 🎵 CONFIGURAÇÃO
// =================================================

async function baixarTikTokDireto(url, destino) {
    const resposta = await axios.get("https://www.tikwm.com/api/", { params: { url }, timeout: 20000, headers: { "User-Agent": "Mozilla/5.0" } });
    const dados = resposta.data?.data || {};
    const urlVideo = dados.play || dados.wmplay || dados.hdplay;
    if (!urlVideo) throw new Error("TikTok não retornou uma URL de vídeo utilizável");
    const video = await axios.get(urlVideo, { responseType: "arraybuffer", timeout: 60000, headers: { "User-Agent": "Mozilla/5.0" } });
    fs.writeFileSync(destino, Buffer.from(video.data));
    return { titulo: dados.title || "TikTok" };
}

function comandoBase() {

    const extra =
        config.MUSICA?.ARGS_EXTRA
            ? ` ${config.MUSICA.ARGS_EXTRA}`
            : "";

    return `${
        config.MUSICA?.BINARIO || "yt-dlp"
    }${extra}`;
}

// =================================================
// 🔠 BOLD
// =================================================

function toBold(str) {

    const BASE_UPPER = 0x1D400;
    const BASE_LOWER = 0x1D41A;
    const BASE_DIGIT = 0x1D7CE;

    return String(str)
        .normalize('NFD')
        .split('')
        .map(ch => {

            const code =
                ch.charCodeAt(0);

            if (
                code >= 65 &&
                code <= 90
            ) {
                return String.fromCodePoint(
                    BASE_UPPER +
                    code - 65
                );
            }

            if (
                code >= 97 &&
                code <= 122
            ) {
                return String.fromCodePoint(
                    BASE_LOWER +
                    code - 97
                );
            }

            if (
                code >= 48 &&
                code <= 57
            ) {
                return String.fromCodePoint(
                    BASE_DIGIT +
                    code - 48
                );
            }

            return ch;

        })
        .join('');
}

// =================================================
// ⏱️ DURAÇÃO
// =================================================

function formatDuration(s) {

    if (
        isNaN(s) ||
        s < 0
    ) {
        return "00:00";
    }

    const m =
        Math.floor(s / 60);

    const r =
        Math.floor(s % 60);

    return (
        String(m).padStart(2, '0') +
        ":" +
        String(r).padStart(2, '0')
    );
}

// =================================================
// 👁️ VISUALIZAÇÕES
// =================================================

function formatViews(n) {

    if (
        !n ||
        isNaN(n)
    ) {
        return "—";
    }

    return Number(n)
        .toLocaleString('pt-BR');
}

// =================================================
// 📅 DATA
// =================================================

function formatUploadDate(dateStr) {

    if (
        !dateStr ||
        String(dateStr).length !== 8
    ) {
        return "—";
    }

    const ano =
        String(dateStr).slice(0, 4);

    const mes =
        String(dateStr).slice(4, 6);

    const dia =
        String(dateStr).slice(6, 8);

    return `${dia}/${mes}/${ano}`;
}

// =================================================
// 🕐 HORA
// =================================================

function formatUploadTime(timestamp) {

    if (!timestamp) {
        return null;
    }

    try {

        return new Date(
            timestamp * 1000
        ).toLocaleTimeString(
            'pt-BR',
            {
                hour: '2-digit',
                minute: '2-digit'
            }
        );

    } catch {

        return null;
    }
}

// =================================================
// 🖼️ IMAGEM
// =================================================

function baixarImagem(url) {

    return new Promise(
        (resolve, reject) => {

            if (!url) {
                return reject(
                    new Error(
                        "URL da imagem vazia"
                    )
                );
            }

            https.get(
                url,
                res => {

                    if (
                        res.statusCode !== 200
                    ) {
                        return reject(
                            new Error(
                                `HTTP ${res.statusCode}`
                            )
                        );
                    }

                    const chunks = [];

                    res.on(
                        'data',
                        chunk => {
                            chunks.push(chunk);
                        }
                    );

                    res.on(
                        'end',
                        () => {

                            resolve(
                                Buffer.concat(
                                    chunks
                                )
                            );

                        }
                    );

                }
            ).on(
                'error',
                reject
            );
        }
    );
}

// =================================================
// ⏱️ LIMITE PARA OPERAÇÕES AUXILIARES
// =================================================
// Evita que capa, foto de contexto ou metadados do grupo deixem o
// comando pendurado depois que o áudio já foi entregue.
function comTimeout(promessa, tempoMs, valorFallback = null) {
    return Promise.race([
        Promise.resolve(promessa).catch(() => valorFallback),
        new Promise(resolve => {
            setTimeout(() => resolve(valorFallback), tempoMs);
        })
    ]);
}

// =================================================
// ⚙️ EXEC
// =================================================

function execPromise(
    comando,
    timeoutMs,
    ctl = null
) {

    return new Promise(
        (resolve, reject) => {

            console.log(
                `▶️ Comando: ${comando}`
            );

            // Com "ctl", o comando roda com "exec" na frente: o shell é
            // substituído pelo yt-dlp, então cancelar mata o processo de verdade.
            const filho = exec(
                ctl ? `exec ${comando}` : comando,
                {
                    maxBuffer:
                        1024 * 1024 * 30,

                    timeout:
                        timeoutMs
                },

                (
                    err,
                    stdout,
                    stderr
                ) => {

                    if (err) {

                        const detalhe =
                            (
                                stderr ||
                                err.message ||
                                ""
                            )
                            .trim()
                            .split('\n')
                            .filter(Boolean)
                            .slice(-3)
                            .join(' | ')
                            .slice(0, 800);

                        return reject(
                            new Error(
                                detalhe ||
                                "Falha no comando."
                            )
                        );
                    }

                    resolve({
                        stdout:
                            stdout || "",

                        stderr:
                            stderr || ""
                    });
                }
            );
            if (ctl) ctl.filho = filho;
        }
    );
}

// =================================================
// 🧹 LIMPEZA
// =================================================

function limparArquivos(
    template
) {

    // Igual ao encontrarArquivo: limpa QUALQUER arquivo com esse nome de
    // template, seja qual for a extensão que o yt-dlp tenha usado —
    // assim não sobra lixo de tentativas que falharam no meio do caminho.
    const pasta =
        path.dirname(template);

    const prefixo =
        path.basename(template);

    let arquivos = [];

    try {
        arquivos =
            fs.readdirSync(pasta);
    } catch {
        return;
    }

    for (
        const nome of arquivos
    ) {

        if (
            !nome.startsWith(prefixo)
        ) continue;

        try {
            fs.unlinkSync(
                path.join(pasta, nome)
            );
        } catch {}
    }
}

// =================================================
// ✂️ GARANTE QUE SÓ VAI ÁUDIO (sem vídeo grudado)
// =================================================
//
// Alguns clientes do YouTube (o "android"/"ios" usados aqui pra driblar
// bloqueio) às vezes não expõem uma trilha de áudio separada — nesse
// caso o fallback de formato escolhido baixe o VÍDEO inteiro junto
// (muito mais pesado, é por isso que às vezes a música demora mais pra
// enviar: o arquivo é maior do que precisa). Aqui a gente confere se
// veio vídeo junto e, se vier, tira só o áudio com cópia direta (sem
// recodificar — é rápido) antes de mandar pro WhatsApp.
async function garantirSoAudio(caminho) {
    // O WhatsApp/Baileys aceita os formatos de áudio entregues pelo yt-dlp
    // (m4a/webm/opus/mp3). Não recodificar: isso elimina a espera extra do
    // ffmpeg e preserva o arquivo original.
    if (!caminho || !fs.existsSync(caminho)) throw new Error("Arquivo de áudio não encontrado.");
    if (fs.statSync(caminho).size < 5000) throw new Error("Arquivo de áudio baixado está vazio ou incompleto.");
    return caminho;
}

// =================================================
// 🔎 ACHA ARQUIVO
// =================================================

function encontrarArquivo(
    template,
    modo
) {

    // Em vez de só procurar uma lista fixa de extensões (que pode não
    // bater com o container que aquele cliente específico do YouTube
    // devolveu), procura QUALQUER arquivo gerado com esse nome de
    // template, ignorando só os arquivos que sabemos que não são mídia
    // final (.part, .ytdl, .json, .description são sobras do yt-dlp).
    const pasta =
        path.dirname(template);

    const prefixo =
        path.basename(template);

    const IGNORAR = [
        '.part',
        '.ytdl',
        '.json',
        '.description',
        '.info.json',
        '.jpg',
        '.jpeg',
        '.png',
        '.webp',
        '.vtt',
        '.ass',
        '.srt'
    ];

    let arquivos = [];

    try {
        arquivos =
            fs.readdirSync(pasta);
    } catch {
        return null;
    }

    for (
        const nome of arquivos
    ) {

        if (
            !nome.startsWith(prefixo)
        ) continue;

        if (
            IGNORAR.some(
                ext => nome.endsWith(ext)
            )
        ) continue;

        const caminho =
            path.join(pasta, nome);

        try {

            if (
                fs.statSync(caminho).size >= 5000
            ) {

                return caminho;
            }

        } catch {}
    }

    return null;
}

// =================================================
// 🔠 RÓTULOS
// =================================================

const L = {

    erroSemBusca:
        toBold("ERRO — SEM BUSCA"),

    motivo:
        toBold("MOTIVO"),

    comoUsar:
        toBold("COMO USAR"),

    video:
        toBold("VÍDEO"),

    documento:
        toBold("DOCUMENTO"),

    erroDownload:
        toBold("ERRO NO DOWNLOAD"),

    busca:
        toBold("BUSCA"),

    solicitadoPor:
        toBold("SOLICITADO POR"),

    info:
        toBold("INFO"),

    musicaEncontrada:
        toBold("MÚSICA ENCONTRADA"),

    musica:
        toBold("MÚSICA"),

    cantor:
        toBold("CANTOR"),

    canal:
        toBold("CANAL"),

    visualizacoes:
        toBold("VISUALIZAÇÕES"),

    publicadoEm:
        toBold("PUBLICADO EM"),

    musicaEnviada:
        toBold("MÚSICA ENVIADA"),

    mikasaBot:
        toBold("MIKASA BOT")
};

const LINHA =
    "━━━━━━━━━━━━━━━━━━━━";

// =================================================
// CONTROLE DE REFERÊNCIA
// =================================================

let aguardandoReferencia = null;

exports.setReferenciaEspera =
    ref => {

        aguardandoReferencia =
            ref;
    };

// =================================================
// 🔗 RESOLVE LINK CURTO DO TIKTOK
// =================================================

function resolverIdentidadeSolicitante(msg) {
    const pushName = String(msg?.pushName || "").trim();
    const key = msg?.key || {};
    const candidatos = [
        key.participantAlt,
        key.remoteJidAlt,
        key.participant,
        key.remoteJid
    ].filter(Boolean);

    const jidNumero = candidatos.find(jid =>
        /@(s\.whatsapp\.net|c\.us)$/i.test(String(jid))
    );

    const numero = jidNumero
        ? String(jidNumero).split("@")[0].replace(/\D/g, "")
        : "";

    const nome = pushName || (numero ? `+${numero}` : "Usuário");
    const exibicao = numero && pushName
        ? `${pushName} (+${numero})`
        : nome;

    return {
        nome,
        exibicao,
        numero,
        jid: jidNumero || candidatos[0] || ""
    };
}

function resolverRedirect(url, tentativas = 0) {
    return new Promise((resolve, reject) => {
        if (tentativas > 5) return resolve(url);

        let req;
        try {
            req = https.get(url, {
                headers: {
                    "user-agent": "Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36 Chrome/120 Mobile Safari/537.36"
                }
            }, res => {
                const codigo = res.statusCode || 0;
                const destino = res.headers.location;
                res.resume();

                if (codigo >= 300 && codigo < 400 && destino) {
                    const proximo = new URL(destino, url).toString();
                    return resolverRedirect(proximo, tentativas + 1)
                        .then(resolve)
                        .catch(reject);
                }

                resolve(url);
            });
            req.on("error", () => resolve(url));
            req.setTimeout(12000, () => {
                req.destroy();
                resolve(url);
            });
        } catch {
            resolve(url);
        }
    });
}

// =================================================
// 🎵 COMANDO PRINCIPAL
// =================================================


// =================================================
// 🧠 RESULTADOS PENDENTES DO /PLAY
// =================================================
// Guarda somente os dados necessários para que o callback saiba qual
// resultado foi escolhido. Expira sozinho para não acumular memória.
const resultadosPlay = new Map();
const TEMPO_RESULTADO_PLAY = 10 * 60 * 1000;

function criarTokenPlay() {
    return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
}

function salvarResultadoPlay(dados) {
    const token = criarTokenPlay();
    resultadosPlay.set(token, {
        ...dados,
        criadoEm: Date.now()
    });

    setTimeout(() => {
        resultadosPlay.delete(token);
    }, TEMPO_RESULTADO_PLAY);

    return token;
}

function limparNomeArquivo(nome, fallback = "arquivo") {
    const limpo = String(nome || fallback)
        .replace(/[<>:"/\\|?*]/g, "")
        .replace(/\s+/g, " ")
        .trim();

    return limpo || fallback;
}

function extrairJsonsYtDlp(stdout) {
    const saida = [];
    const linhas = String(stdout || "")
        .split("\n")
        .map(l => l.trim())
        .filter(Boolean);

    for (const linha of linhas) {
        try {
            const obj = JSON.parse(linha);
            if (obj && typeof obj === "object") saida.push(obj);
        } catch {}
    }
    return saida;
}

function extrairJsonYtDlp(stdout) {
    const lista = extrairJsonsYtDlp(stdout);
    return lista.length ? lista[lista.length - 1] : null;
}

// =================================================
// 🖼️ CAPA DA MÚSICA (thumbnail)
// =================================================
// Com --flat-playlist o yt-dlp quase sempre devolve só a lista "thumbnails"
// (e não o campo "thumbnail"), então a capa nunca aparecia. Aqui a gente
// monta uma lista de endereços possíveis e tenta um por um, sempre
// terminando na miniatura oficial do YouTube (i.ytimg.com), que existe
// para qualquer vídeo.
function listarUrlsCapa(info) {
    const urls = [];
    const add = (u) => {
        if (typeof u === 'string' && /^https?:\/\//i.test(u) && !urls.includes(u)) urls.push(u);
    };

    add(info?.thumbnail);

    if (Array.isArray(info?.thumbnails)) {
        const jpgs = info.thumbnails
            .filter(t => t && typeof t.url === 'string' && /\.jpe?g(\?|$)/i.test(t.url))
            .sort((a, b) => (Number(b.width || 0) * Number(b.height || 0)) - (Number(a.width || 0) * Number(a.height || 0)));
        jpgs.forEach(t => add(t.url));
    }

    const id = info?.id || info?.display_id;
    if (id && /^[A-Za-z0-9_-]{11}$/.test(String(id))) {
        add(`https://i.ytimg.com/vi/${id}/hqdefault.jpg`);
        add(`https://i.ytimg.com/vi/${id}/mqdefault.jpg`);
    }

    return urls;
}

async function baixarCapaMusica(info) {
    for (const url of listarUrlsCapa(info)) {
        const buffer = await comTimeout(baixarImagem(url), 3000, null);
        if (Buffer.isBuffer(buffer) && buffer.length > 2000) return buffer;
    }
    return null;
}

function textoYoutubei(valor, fallback = '') {
    if (valor == null) return fallback;
    try {
        const texto = String(valor).trim();
        return texto || fallback;
    } catch {
        return fallback;
    }
}

function numeroVisualizacoesYoutubei(valor) {
    const texto = textoYoutubei(valor).toLowerCase().replace(/\s/g, '');
    if (!texto) return 0;

    const sufixos = { k: 1e3, m: 1e6, b: 1e9, mil: 1e3, mi: 1e6, bi: 1e9 };
    const encontrado = texto.replace(/visualizações?|views?|devisualizações?/g, '')
        .replace(',', '.').match(/([\d.]+)(mil|mi|bi|k|m|b)?/);
    if (!encontrado) return 0;

    const base = Number(encontrado[1]);
    return Number.isFinite(base) ? Math.round(base * (sufixos[encontrado[2]] || 1)) : 0;
}

function segundosYoutubei(item) {
    const duracao = item?.duration;
    if (duracao && typeof duracao === 'object' && duracao.seconds != null) {
        return Number(duracao.seconds) || 0;
    }
    const texto = textoYoutubei(duracao || item?.length_text);
    const partes = texto.split(':').map(Number);
    if (!partes.length || partes.some(Number.isNaN)) return 0;
    return partes.length === 3
        ? partes[0] * 3600 + partes[1] * 60 + partes[2]
        : partes.length === 2 ? partes[0] * 60 + partes[1] : partes[0] || 0;
}

function normalizarResultadoYoutubei(item, busca) {
    const videoId = item?.video_id || item?.videoId || item?.id;
    if (!videoId) return null;

    const pagina = `https://www.youtube.com/watch?v=${videoId}`;
    const thumbnail = item?.best_thumbnail?.url || item?.thumbnails?.[0]?.url || null;
    const titulo = textoYoutubei(item?.title, busca);
    const autor = textoYoutubei(item?.author?.name || item?.author, '—');
    const publicado = textoYoutubei(item?.published, '');
    const visualizacoes = numeroVisualizacoesYoutubei(item?.view_count || item?.short_view_count);

    return {
        id: videoId,
        webpage_url: pagina,
        title: titulo,
        uploader: autor,
        channel: autor,
        duration: segundosYoutubei(item),
        view_count: visualizacoes,
        thumbnail,
        upload_date: null,
        timestamp: null,
        // Mantém a informação textual disponível sem interferir no download.
        description: publicado
    };
}

async function pesquisarResultadoYoutubei(busca, limite = 5) {
    const yt = await obterYoutubei();
    const pesquisa = await yt.search(busca, { type: 'video' });
    const maximo = Math.max(1, Math.min(Number(limite) || 5, 30));
    const candidatos = Array.from(pesquisa?.results || [])
        .map(item => normalizarResultadoYoutubei(item, busca))
        .filter(Boolean)
        .slice(0, maximo);

    if (!candidatos.length) {
        throw new Error('youtubei.js não retornou vídeos válidos.');
    }
    return { ...candidatos[0], candidatos };
}

async function pesquisarResultadoYtDlp(busca, limite = 5) {
    const link = busca.match(/https?:\/\/[^\s]+/i)?.[0]?.replace(/[),.;]+$/, "");
    const alvo = link
        ? link
        : `ytsearch${Math.max(1, Math.min(Number(limite) || 5, 30))}:${busca.replace(/"/g, '\\"')}`;

    const comando =
        `${comandoBase()} "${alvo}" ` +
        `--flat-playlist --playlist-end ${Math.max(1, Math.min(Number(limite) || 5, 30))} --skip-download ` +
        `--no-warnings --print-json`;

    const { stdout } = await execPromise(comando, 30000);
    const infos = extrairJsonsYtDlp(stdout);
    if (!infos.length) {
        throw new Error("Não encontrei informações para esse resultado.");
    }

    const candidatos = infos.map(info => {
        const videoId = info.id || info.display_id;
        const pagina = info.webpage_url ||
            (videoId ? `https://www.youtube.com/watch?v=${videoId}` : null);
        if (!pagina) return null;
        return {
            ...info,
            webpage_url: pagina,
            title: info.title || busca,
            uploader: info.uploader || info.channel || "—",
            channel: info.channel || info.uploader || "—",
            duration: Number(info.duration || 0),
            view_count: Number(info.view_count || 0),
            thumbnail: listarUrlsCapa({ ...info, id: videoId })[0] || null,
            upload_date: info.upload_date || null,
            timestamp: info.timestamp || null
        };
    }).filter(Boolean);

    if (!candidatos.length) {
        throw new Error("Os resultados não possuem endereços de mídia válidos.");
    }

    return { ...candidatos[0], candidatos };
}

async function pesquisarResultado(busca, limite = 5) {
    // URLs já informadas continuam sendo resolvidas pelo fluxo original.
    if (!/https?:\/\/[^\s]+/i.test(busca)) {
        try {
            const resultado = await Promise.race([
                pesquisarResultadoYoutubei(busca, limite),
                new Promise((_, rejeitar) => setTimeout(
                    () => rejeitar(new Error('youtubei.js demorou demais.')),
                    12000
                ))
            ]);
            console.log('🔎 [youtubei.js] Busca concluída.');
            return resultado;
        } catch (erroYoutubei) {
            console.log(`🔎 [youtubei.js] Falhou, usando yt-dlp: ${erroYoutubei.message}`);
        }
    }

    return pesquisarResultadoYtDlp(busca, limite);
}

function formatarInfoPlay(info) {
    const duracao = formatDuration(info.duration);
    const visualizacoes = formatViews(info.view_count);

    let data = "";
    if (info.upload_date) {
        data = formatUploadDate(info.upload_date);
        if (info.timestamp) {
            const hora = formatUploadTime(info.timestamp);
            if (hora) data += ` às ${hora}`;
        }
    }

    return [
        `🎵 *${info.title || "Sem título"}*`,
        `👤 ${info.uploader || info.channel || "—"}`,
        `📺 ${info.channel || info.uploader || "—"}`,
        `⏱️ ${duracao || "—"}`,
        visualizacoes && visualizacoes !== "0" ? `👁️ ${visualizacoes}` : null,
        data ? `📅 ${data}` : null
    ].filter(Boolean).join("\n");
}


// =================================================
// 🎲 MÚSICA ALEATÓRIA — categorias + artistas
// =================================================
const RANDOM_MUSIC_FILE = path.join(__dirname, "../dados/musicas-aleatorias.json");

// 12 estilos para deixar o sorteio realmente variado.
// Os artistas são usados como fonte da pesquisa; o histórico evita
// que a mesma música seja entregue novamente para o mesmo artista.
const RANDOM_MUSIC_CATEGORIES = {
    sertanejo: {
        nome: '🎤 SERTANEJO',
        artistas: [
            'Chitãozinho & Xororó', 'Zezé Di Camargo & Luciano', 'Leonardo',
            'Bruno & Marrone', 'Jorge & Mateus', 'Henrique & Juliano',
            'Maiara & Maraisa', 'Gusttavo Lima', 'Luan Santana', 'Marília Mendonça',
            'Eduardo Costa', 'Murilo Huff', 'Zé Neto & Cristiano', 'Panda',
            'Danilo & Davi', 'Diego & Victor Hugo', 'Felipe & Rodrigo',
            'Gustavo Mioto', 'Ana Castela', 'Léo Foguete'
        ]
    },
    modao: {
        nome: '🤠 MODÃO',
        artistas: [
            'Milionário & José Rico', 'Trio Parada Dura', 'Tião Carreiro & Pardinho',
            'Barrerito', 'Mato Grosso & Mathias', 'Chrystian & Ralf',
            'João Mineiro & Marciano', 'Liu & Léu', 'Pedro Bento & Zé da Estrada',
            'Zilo & Zalo'
        ]
    },
    funk: {
        nome: '🔥 FUNK',
        artistas: [
            'MC Ryan SP', 'MC IG', 'MC Hariel', 'MC PH', 'MC Kevin',
            'MC Livinho', 'MC Poze do Rodo', 'MC Cabelinho', 'MC Paiva',
            'MC Daniel', 'MC Meno K', 'MC Negão Original', 'MC Tuto',
            'MC Luuky', 'MC GP', 'MC Don Juan', 'MC Leozinho ZS',
            'MC Joãozinho VT', 'MC GW', 'MC Lele JP'
        ]
    },
    pagode: {
        nome: '🥁 PAGODE',
        artistas: [
            'Sorriso Maroto', 'Ferrugem', 'Dilsinho', 'Menos é Mais',
            'Grupo Revelação', 'Pixote', 'Turma do Pagode', 'Péricles',
            'Thiaguinho', 'Belo'
        ]
    },
    samba: {
        nome: '🎶 SAMBA',
        artistas: [
            'Zeca Pagodinho', 'Martinho da Vila', 'Beth Carvalho', 'Arlindo Cruz',
            'Jorge Aragão', 'Paulinho da Viola', 'Alcione', 'Diogo Nogueira',
            'Neguinho da Beija-Flor', 'Clara Nunes'
        ]
    },
    forro: {
        nome: '🪗 FORRÓ',
        artistas: [
            'Luiz Gonzaga', 'Dominguinhos', 'Wesley Safadão', 'Calcinha Preta',
            'Limão com Mel', 'Aviões do Forró', 'Mastruz com Leite',
            'Solange Almeida', 'Zé Vaqueiro', 'Tarcísio do Acordeon',
            'Mulekes de Brasília', 'Nattan', 'Mari Fernandez'
        ]
    },
    piseiro: {
        nome: '🎹 PISEIRO',
        artistas: [
            'João Gomes', 'Vitor Fernandes', 'Barões da Pisadinha',
            'Felipe Amorim', 'Zé Felipe', 'Iguinho e Lulinha',
            'Guilherme Silva', 'Thiago Paredão', 'Manu Bahtidão',
            'Lauana Prado'
        ]
    },
    mpb: {
        nome: '🎼 MPB',
        artistas: [
            'Djavan', 'Tim Maia', 'Caetano Veloso', 'Gilberto Gil',
            'Milton Nascimento', 'Jorge Ben Jor', 'Elis Regina',
            'Cássia Eller', 'Ana Carolina', 'Marisa Monte'
        ]
    },
    rock: {
        nome: '🎸 ROCK BR',
        artistas: [
            'Legião Urbana', 'Charlie Brown Jr.', 'Capital Inicial',
            'Titãs', 'Engenheiros do Hawaii', 'Skank', 'Raimundos',
            'O Rappa', 'Detonautas', 'Pitty'
        ]
    },
    rap_trap: {
        nome: '🎤 RAP / TRAP',
        artistas: [
            'Racionais MCs', 'Emicida', 'Criolo', 'Matuê', 'Orochi',
            'L7NNON', 'Filipe Ret', 'Xamã', 'Veigh', 'KayBlack',
            'Oruam', 'WIU', 'TZ da Coronel', 'Yunk Vino', 'J. Eskine',
            'Froid', 'Major RD', 'Borges'
        ]
    },
    pop: {
        nome: '✨ POP',
        artistas: [
            'Michael Jackson', 'Bruno Mars', 'The Weeknd', 'Ed Sheeran',
            'Adele', 'Rihanna', 'Taylor Swift', 'Lady Gaga',
            'Justin Bieber', 'Shakira'
        ]
    },
    hits_jovens: {
        nome: '🎧 HITS JOVENS',
        artistas: [
            'Jão', 'Simone Mendes', 'Luan Pereira', 'Grelo',
            'Matheus Fernandes', 'Manu', 'Duda Beat', 'Mumuzinho',
            'Pedro Sampaio', 'MC Kako', 'MC Vine7', 'MC Jvila',
            'MC Rodrigo do CN', 'Mc Paiva ZS'
        ]
    },
    ninar: {
        nome: '🌙 MÚSICA PARA NINAR',
        artistas: [
            'Canções de Ninar', 'Músicas para Bebê', 'Instrumental para Dormir',
            'Piano para Dormir', 'Lullaby', 'Música Relaxante'
        ]
    },
    francildo: {
        nome: '🎙️ FRANCILDO SILVA',
        artistas: ['Francildo Silva']
    },
    gospel: {
        nome: '🙏 GOSPEL',
        artistas: [
            'Aline Barros', 'Fernandinho', 'Anderson Freire', 'Gabriela Rocha',
            'Bruna Karla', 'Thalles Roberto', 'Damares', 'Isadora Pompeo',
            'Kemuel', 'Preto no Branco'
        ]
    }
};

function lerHistoricoMusicaAleatoria() {
    try {
        if (!fs.existsSync(RANDOM_MUSIC_FILE)) return {};
        const dados = JSON.parse(fs.readFileSync(RANDOM_MUSIC_FILE, 'utf8'));
        return dados && typeof dados === 'object' ? dados : {};
    } catch {
        return {};
    }
}

function salvarHistoricoMusicaAleatoria(db) {
    try {
        fs.writeFileSync(RANDOM_MUSIC_FILE, JSON.stringify(db, null, 2));
    } catch (erro) {
        console.error('⚠️ Não consegui salvar histórico da música aleatória:', erro.message);
    }
}

function normalizarHistoricoAleatorio(historico, chave) {
    const valor = historico[chave];
    if (Array.isArray(valor)) return valor;
    if (valor && typeof valor === 'object' && Array.isArray(valor.musicas)) {
        return valor.musicas;
    }
    return [];
}

function registrarMusicaAleatoriaBaixada(historico, chave, info) {
    const anteriores = normalizarHistoricoAleatorio(historico, chave);
    const url = String(info?.webpage_url || info?.url || '').trim();
    if (!url) return;
    const registro = {
        url,
        id: info?.id || info?.display_id || null,
        titulo: info?.title || 'Sem título',
        baixadaEm: new Date().toISOString()
    };
    historico[chave] = [
        ...anteriores.filter(item => {
            const antigoUrl = typeof item === 'string' ? item : item?.url;
            return antigoUrl !== url;
        }),
        registro
    ].slice(-200);
    salvarHistoricoMusicaAleatoria(historico);
}


exports.menuMusicaAleatoria = async function(sock, msg) {
    const { enviarListaWhatsApp } = require('../menuBotoes/menuBotoes');
    const entradas = Object.entries(RANDOM_MUSIC_CATEGORIES);
    const rows = entradas.map(([id, cat]) => ({
        id: `musica_random_cat:${id}`,
        title: cat.nome,
        description: `${cat.artistas.length} artistas disponíveis`
    }));
    return enviarListaWhatsApp(sock, msg.key.remoteJid, {
        text: `🎲 *MÚSICAS ALEATÓRIAS*\n\nEscolha um estilo. Depois escolha o cantor e o bot sorteia a música.\n📚 ${entradas.length} categorias disponíveis`,
        title: '🎵 MÚSICAS ALEATÓRIAS',
        footer: config.BOT_NAME || 'Mikasa Bot',
        quoted: msg,
        sections: [{ title: 'ESTILOS MUSICAIS', rows }]
    });
};

exports.processarMusicaAleatoriaBotao = async function(sock, msg, idBotao) {
    const id = String(idBotao || '');

    if (id.startsWith('musica_random_cat:')) {
        const categoria = id.split(':')[1];
        const cat = RANDOM_MUSIC_CATEGORIES[categoria];
        if (!cat) return false;

        const { enviarListaWhatsApp } = require('../menuBotoes/menuBotoes');
        const rows = cat.artistas.map((artista, i) => ({
            id: `musica_random_artist:${categoria}:${i}`,
            title: `🎵 ${artista}`,
            description: 'Sortear uma música desse cantor'
        }));
        rows.push({ id: 'musica_random_menu', title: '↩️ CATEGORIAS', description: 'Voltar aos estilos' });
        return enviarListaWhatsApp(sock, msg.key.remoteJid, {
            text: `${cat.nome}\n\nEscolha o cantor para sortear uma música:\n📚 ${cat.artistas.length} artistas disponíveis`,
            title: cat.nome, footer: config.BOT_NAME || 'Mikasa Bot', quoted: msg,
            sections: [{ title: 'CANTORES', rows }]
        });
    }

    if (id === 'musica_random_menu') return exports.menuMusicaAleatoria(sock, msg);

    if (id.startsWith('musica_random_artist:')) {
        const [, categoria, indiceStr] = id.split(':');
        const cat = RANDOM_MUSIC_CATEGORIES[categoria];
        const indice = Number(indiceStr);
        const artista = cat?.artistas?.[indice];
        if (!artista) return false;

        const remetente = msg.key.participant || msg.key.remoteJid;

        try {
            // 🌙 NINAR: nunca procurar/baixar vídeos longos de horas.
            // Esse era o motivo das canções de ninar demorarem vários minutos:
            // buscas genéricas retornavam vídeos de 1h/2h e o yt-dlp baixava
            // todo o áudio antes de enviar. Para essa categoria usamos
            // pesquisas focadas em faixas curtas e limitamos a duração.
            const ehNinar = categoria === 'ninar';
            const consultaArtista = ehNinar
                ? `${artista} 5 minutos curta`
                : artista;
            const pesquisa = await pesquisarResultado(consultaArtista, ehNinar ? 30 : 20);
            let candidatos = (pesquisa.candidatos || [pesquisa])
                .filter(x => x?.webpage_url);

            if (ehNinar) {
                candidatos = candidatos.filter(x => {
                    const duracao = Number(x.duration || 0);
                    return duracao > 0 && duracao <= 12 * 60;
                });
            }

            const historico = lerHistoricoMusicaAleatoria();
            const chave = `artista:${String(artista).trim().toLowerCase()}`;
            const usados = new Set(
                normalizarHistoricoAleatorio(historico, chave).map(item =>
                    typeof item === 'string' ? item : item?.url
                ).filter(Boolean)
            );

            let disponiveis = candidatos.filter(x => !usados.has(x.webpage_url));

            // Se a busca trouxe apenas músicas já baixadas, faz uma segunda
            // busca mais ampla antes de considerar que não há novidade.
            if (!disponiveis.length) {
                const buscaAmpla = ehNinar
                    ? `${artista} canção de ninar 5 minutos`
                    : `${artista} músicas`;
                const pesquisaAmpla = await pesquisarResultado(buscaAmpla, 30);
                const extras = (pesquisaAmpla.candidatos || [])
                    .filter(x => x?.webpage_url && !candidatos.some(c => c.webpage_url === x.webpage_url));
                disponiveis = extras.filter(x => !usados.has(x.webpage_url));
                if (ehNinar) {
                    disponiveis = disponiveis.filter(x => {
                        const duracao = Number(x.duration || 0);
                        return duracao > 0 && duracao <= 12 * 60;
                    });
                }
            }

            if (!disponiveis.length) {
                throw new Error(`Não encontrei uma música nova de *${artista}* que ainda não tenha sido baixada.`);
            }

            const escolhido = disponiveis[Math.floor(Math.random() * disponiveis.length)];

            await enviarMensagemMusical(
                sock,
                msg.key.remoteJid,
                `🎲 *MÚSICA ALEATÓRIA*\n\n🎤 Artista: *${artista}*\n🎵 Música: *${escolhido.title || 'Sem título'}*\n👤 Pedido por: @${String(remetente).split('@')[0]}`,
                msg,
                [remetente]
            );

            const token = salvarResultadoPlay({
                jid: msg.key.remoteJid,
                solicitante: remetente,
                url: escolhido.webpage_url,
                info: escolhido,
                // O sorteado vai primeiro; se o vídeo estiver indisponível/bloqueado,
                // o download tenta sozinho outros do mesmo artista (até 4 reservas).
                candidatos: [
                    escolhido,
                    ...disponiveis
                        .filter(x => x.webpage_url !== escolhido.webpage_url)
                        .sort(() => Math.random() - 0.5)
                        .slice(0, 4)
                ],
                randomMusic: {
                    categoria,
                    artista,
                    historicoChave: chave,
                    maxDuration: ehNinar ? 12 * 60 : null
                }
            });

            // O histórico NÃO é salvo aqui. Ele só é confirmado dentro do
            // download depois que o áudio foi realmente entregue.
            await baixarResultadoPlay(sock, msg, token, 'audio', { silencioso: true });
        } catch (erro) {
            console.error('❌ Música aleatória:', erro);
            await enviarMensagemMusical(
                sock,
                msg.key.remoteJid,
                `〔 ❌ MÚSICA ALEATÓRIA 〕\n\n🎤 Artista: *${artista}*\n⚠️ ${erro.message || 'Não foi possível concluir a busca.'}`,
                msg
            );
        }
        return true;
    }

    return false;
};

function obterLinkCanalMusica() {
    const candidatos = [
        config.CHANNEL_URL, config.CHANNEL_LINK, config.CHANNEL,
        config.CANAL_URL, config.CANAL_LINK, config.CANAL,
        config.CHANNEL_USERNAME, config.CANAL_USERNAME
    ];
    const valor = candidatos.find(v => typeof v === 'string' && v.trim());
    if (!valor) return null;
    const limpo = valor.trim();
    if (/^https?:\/\//i.test(limpo)) return limpo;
    if (/^(whatsapp\.com\/channel\/|wa\.me\/)/i.test(limpo)) return `https://${limpo}`;
    if (/^[A-Za-z0-9._-]+$/.test(limpo)) return `https://whatsapp.com/channel/${limpo}`;
    return null;
}

function obterLinkCriadorMusica() {
    const numero = String(config.OWNER_NUMBER || '').replace(/\D/g, '');
    return numero ? `https://wa.me/${numero}` : null;
}

async function enviarMensagemMusical(sock, jid, text, quoted, mentions) {
    const linkCanal = obterLinkCanalMusica();
    const buttons = [];
    if (linkCanal) buttons.push(botaoUrl("📢 ENTRAR NO CANAL", linkCanal));
    if (buttons.length) {
        return enviarNativeFlow(sock, jid, {
            text,
            footer: config.BOT_NAME || "LOBA KRYSSA - BOT",
            buttons,
            quoted,
            mentions
        });
    }
    return sock.sendMessage(jid, { text, mentions }, { quoted });
}

exports.baixarMusica = async function(sock, msg, args = []) {
    const from = msg?.key?.remoteJid;
    if (!from) return;

    let busca = [...args].join(" ").trim();

    // Compatibilidade: .play mp4 nome e .play video nome continuam
    // sendo aceitos, mas agora NÃO iniciam download automaticamente.
    busca = busca.replace(/^(mp4|video|vídeo|doc|documento)\s+/i, "").trim();

    if (!busca || busca.length < 2) {
        return enviarMensagemMusical(
            sock,
            from,
`〔 ❌ ${L.erroSemBusca} 〕\n\nUse:\n${config.PREFIX}play nome da música\n\nDepois escolha o formato:\n🎵 ÁUDIO\n🎬 VÍDEO\n📄 DOCUMENTO`,
            msg
        );
    }

    try {
        const info = await pesquisarResultado(busca);
        const token = salvarResultadoPlay({
            jid: from,
            solicitante: msg?.key?.participant || msg?.key?.remoteJid,
            url: info.webpage_url,
            info,
            candidatos: info.candidatos || [info]
        });

        const capaBuffer = await baixarCapaMusica(info);

        const texto = [
            `〔 🎵 RESULTADO 〕`,
            formatarInfoPlay(info),
            "Escolha o formato abaixo:"
        ].join("\n");

        const buttons = [
            botao("🎵 ÁUDIO", `play_audio:${token}`),
            botao("🎬 VÍDEO", `play_video:${token}`),
            botao("📄 DOCUMENTO", `play_doc:${token}`)
        ];

        // Em toda mensagem do fluxo musical, o canal fica disponível
        // diretamente, sem abrir outro menu.
        const linkCanal = obterLinkCanalMusica();
        if (linkCanal) buttons.push(botaoUrl("📢 ENTRAR NO CANAL", linkCanal));

        await enviarNativeFlow(sock, from, {
            text: texto,
            footer: config.BOT_NAME || "Mikasa Bot",
            buttons,
            imageBuffer: capaBuffer,
            quoted: msg
        });

    } catch (erro) {
        console.error("❌ /play pesquisa:", erro);
        await enviarMensagemMusical(
            sock,
            from,
`〔 ❌ ${L.erroDownload} 〕\n\nNão consegui pesquisar esse resultado.\n\n🔍 Busca: *${busca}*\n⚠️ ${erro.message || "Erro desconhecido."}`,
            msg
        );
    }
};

// =================================================
// 📥 DOWNLOAD APÓS ESCOLHA DO BOTÃO
// =================================================

async function baixarResultadoPlay(sock, msg, token, modo, opcoes = {}) {
    const silencioso = !!opcoes.silencioso;
    const from = msg?.key?.remoteJid;
    const resultado = resultadosPlay.get(token);

    if (!from || !resultado) {
        return enviarMensagemMusical(sock, from, "⚠️ Esse resultado do /play expirou. Faça a pesquisa novamente.", msg);
    }

    // Evita que outra pessoa use o callback de um resultado privado/grupo.
    const autor = msg?.key?.participant || msg?.key?.remoteJid;
    if (resultado.jid !== from || (resultado.solicitante && autor && resultado.solicitante !== autor)) {
        return enviarMensagemMusical(sock, from, "⚠️ Esse resultado foi solicitado por outro usuário.", msg);
    }

    const info = resultado.info || {};
    const id = `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const template = path.join(__dirname, id);

    const titulo = limparNomeArquivo(info.title || "resultado");
    const candidatos = Array.isArray(resultado.candidatos) && resultado.candidatos.length
        ? resultado.candidatos
        : [info];

    let arquivoReal = null;

    try {
        if (!silencioso) {
            await enviarMensagemMusical(
                sock,
                from,
                `〔 ⏳ PREPARANDO 〕\n\n🎵 *${info.title || "resultado"}*\n📦 ${modo === "audio" ? "ÁUDIO" : modo === "video" ? "VÍDEO" : "DOCUMENTO"}\n\nAguarde o envio...`,
                msg
            );
        }

        const ehAudio = modo === "audio";
        const formato = ehAudio
            ? `-f "bestaudio/best"`
            : `-f "best[ext=mp4]/best"`;

        let ultimoErro = null;

        // Mostra "gravando áudio..." / "digitando..." enquanto baixa.
        try { await sock.sendPresenceUpdate(ehAudio ? "recording" : "composing", from); } catch {}

        // =========================================================
        // 🔒 CLIENTES DO yt-dlp
        // =========================================================
        // Nenhum dos fluxos converte o áudio para MP3/AAC/Opus: o arquivo
        // baixado é enviado no formato original.
        const clientes = resultado.randomMusic
            ? [
                '--extractor-args "youtube:player_client=android,ios"'
              ]
            : [
                '--extractor-args "youtube:player_client=android,ios"',
                '--js-runtimes node --extractor-args "youtube:player_client=android"',
                ''
              ];

        // /play: baixa SÓ o que apareceu no card (não troca por outra música).
        // Aleatória: pode usar as reservas se o sorteado estiver indisponível.
        const alvosYt = resultado.randomMusic ? candidatos.slice(0, 5) : [candidatos[0] || info];
        const TIMEOUT_YT = ehAudio ? 50000 : 120000;
        const dormir = ms => new Promise(r => setTimeout(r, ms));

        // Erros que são do VÍDEO (indisponível, privado, bloqueado...): trocar de
        // cliente não adianta, então pula direto pro próximo vídeo.
        const erroDoVideo = e => /unavailable|private video|has been removed|terminated|not available in your country|blocked it|copyright|confirm your age|members-only|live event|premiere/i
            .test(String(e?.message || ''));

        const matarFilho = ctl => { try { ctl?.filho?.kill('SIGKILL'); } catch {} };

        // ---------- yt-dlp ----------
        const rodarYtDlp = async (tmpl, ctl) => {
            for (const candidato of alvosYt) {
                if (ctl?.cancelado) return null;
                const alvo = String(candidato.webpage_url || candidato.url || resultado.url || "").replace(/"/g, '\\"');
                if (!alvo) continue;

                for (const cliente of clientes) {
                    if (ctl?.cancelado) return null;
                    const filtroDuracao = resultado.randomMusic?.maxDuration
                        ? `--match-filter "duration <= ${Number(resultado.randomMusic.maxDuration)}" `
                        : '';
                    const comando =
                        `${comandoBase()} "${alvo}" ` +
                        `${formato} --no-playlist --no-warnings ` +
                        `${filtroDuracao}` +
                        `${cliente} --retries 1 --fragment-retries 1 --concurrent-fragments 8 ` +
                        `--socket-timeout 10 --extractor-retries 1 ` +
                        `--print-json -o "${tmpl}.%(ext)s"`;
                    try {
                        const { stdout } = await execPromise(comando, TIMEOUT_YT, ctl);
                        const achado = encontrarArquivo(tmpl, modo);
                        if (!achado) throw new Error("O download terminou, mas o arquivo não foi encontrado.");
                        const baixadoInfo = extrairJsonYtDlp(stdout);
                        return { arquivo: achado, titulo: baixadoInfo?.title || null, alvo: candidato, origem: 'yt-dlp' };
                    } catch (erro) {
                        if (ctl?.cancelado) return null;
                        ultimoErro = erro;
                        limparArquivos(tmpl);
                        if (erroDoVideo(erro)) break; // próximo vídeo
                        if (/429|too many requests/i.test(String(erro.message))) await dormir(1200);
                    }
                }
            }
            return null;
        };

        // ---------- API (só áudio) ----------
        const usarApi = ehAudio && config.MUSICA?.USAR_API !== false;

        const rodarApi = async (tmpl, ctl) => {
            const duracaoMax = Number(config.MUSICA?.API_MAX_DURACAO ?? 1200);
            const alvosApi = resultado.randomMusic
                ? candidatos.slice(0, 3)
                : [{ ...info, webpage_url: info.webpage_url || info.url || resultado.url }];

            for (const alvoApi of alvosApi) {
                if (ctl.cancelado) return null;
                const linkApi = alvoApi.webpage_url || alvoApi.url;
                const duracao = Number(alvoApi.duration || 0);
                if (!linkApi) continue;
                if (duracaoMax > 0 && duracao > duracaoMax) {
                    console.log(`🎵 [API] Pulada: duração ${duracao}s acima do limite (${duracaoMax}s).`);
                    continue;
                }
                try {
                    const via = await baixarAudioApi(linkApi, tmpl, { qualidade: config.MUSICA?.API_QUALIDADE || 128 });
                    const achado = encontrarArquivo(tmpl, modo);
                    if (!achado) throw new Error("O download pela API terminou, mas o arquivo não foi encontrado.");
                    return { arquivo: achado, titulo: via.titulo || null, alvo: alvoApi, origem: 'api' };
                } catch (erroApi) {
                    console.log(`🎵 [API] Falhou: ${erroApi.message}`);
                    limparArquivos(tmpl);
                    if (/em pausa/i.test(String(erroApi.message))) break; // API toda fora: nem insiste
                }
            }
            return null;
        };

        // Aplica o resultado de quem GANHOU (título e, na aleatória, o vídeo certo no histórico).
        const aplicarVencedor = v => {
            arquivoReal = v.arquivo;
            if (v.titulo && (v.origem === 'yt-dlp' || !info.title)) info.title = v.titulo;
            if (resultado.randomMusic && v.alvo?.webpage_url && v.alvo.webpage_url !== info.webpage_url) {
                Object.assign(info, {
                    webpage_url: v.alvo.webpage_url,
                    url: v.alvo.url || v.alvo.webpage_url,
                    title: v.titulo || v.alvo.title || info.title
                });
            }
        };

        if (usarApi) {
            // ⚡ CORRIDA: a API começa na hora; se ela não entregar em HEDGE_MS
            // (ou falhar), o yt-dlp entra em paralelo. Vence quem terminar primeiro
            // e o outro é cancelado. Assim a espera é a do mais rápido, não a soma.
            const hedgeMs = Number(config.MUSICA?.HEDGE_MS ?? 3500);
            const ctlApi = { cancelado: false };
            const ctlYt = { cancelado: false, filho: null };
            const tmplApi = `${template}_api`;
            const tmplYt = `${template}_yt`;

            const apiP = rodarApi(tmplApi, ctlApi).catch(() => null);
            const ytP = (async () => {
                let apiRes = null;
                await Promise.race([apiP.then(r => { apiRes = r; }), dormir(hedgeMs)]);
                if (apiRes) return null; // API já entregou
                return rodarYtDlp(tmplYt, ctlYt);
            })().catch(() => null);

            const vencedor = await new Promise(resolve => {
                let restantes = 2;
                const fim = () => { if (--restantes === 0) resolve(null); };
                apiP.then(r => { if (r) resolve(r); }).finally(fim);
                ytP.then(r => { if (r) resolve(r); }).finally(fim);
            });

            if (vencedor?.origem === 'api') {
                ctlYt.cancelado = true; matarFilho(ctlYt);
                ytP.finally(() => limparArquivos(tmplYt));
            } else {
                ctlApi.cancelado = true;
                apiP.finally(() => limparArquivos(tmplApi));
            }
            if (vencedor) {
                console.log(`⚡ [MÚSICA] Entregue por: ${vencedor.origem}`);
                aplicarVencedor(vencedor);
            }
        } else {
            const r = await rodarYtDlp(template, null);
            if (r) aplicarVencedor(r);
        }

        if (!arquivoReal) {
            throw ultimoErro || new Error("Não foi possível baixar o resultado.");
        }

        if (ehAudio) {
            // NÃO converter, NÃO recodificar e NÃO extrair novamente.
            // O yt-dlp já baixou a faixa de áudio que será enviada.
            arquivoReal = await garantirSoAudio(arquivoReal);
        }

        const buffer = fs.readFileSync(arquivoReal);
        if (!buffer.length) throw new Error("O arquivo baixado está vazio.");

        const ext = path.extname(arquivoReal).toLowerCase();

        if (modo === "audio") {
            const mimetype =
                ext === ".webm" ? "audio/ogg; codecs=opus" :
                ext === ".opus" ? "audio/ogg; codecs=opus" :
                ext === ".mp3" ? "audio/mpeg" :
                "audio/mp4";

            await sock.sendMessage(from, {
                audio: buffer,
                mimetype,
                fileName: `${titulo}${ext || ".m4a"}`,
                ptt: false
            }, { quoted: msg });

        } else if (modo === "video") {
            await sock.sendMessage(from, {
                video: buffer,
                mimetype: ext === ".webm" ? "video/webm" : "video/mp4",
                fileName: `${titulo}${ext || ".mp4"}`
            }, { quoted: msg });

        } else {
            await sock.sendMessage(from, {
                document: buffer,
                mimetype: ext === ".webm" ? "video/webm" : "video/mp4",
                fileName: `${titulo}${ext || ".mp4"}`
            }, { quoted: msg });
        }

        // Confirma o histórico SOMENTE depois que o arquivo foi entregue.
        // Assim um erro de download não "gasta" a música sorteada.
        if (resultado.randomMusic?.historicoChave) {
            const historico = lerHistoricoMusicaAleatoria();
            registrarMusicaAleatoriaBaixada(
                historico,
                resultado.randomMusic.historicoChave,
                info
            );
        }

        if (!silencioso) {
            await enviarMensagemMusical(
                sock,
                from,
`〔 ✅ CONCLUÍDO 〕\n\n🎵 *${info.title || titulo}*\n📦 ${modo === "audio" ? "Áudio" : modo === "video" ? "Vídeo" : "Documento"}\n\n✨ Enviado com sucesso!`,
                msg
            );
        }

    } catch (erro) {
        console.error("❌ /play download:", erro);
        await enviarMensagemMusical(
            sock,
            from,
`〔 ❌ ERRO NO DOWNLOAD 〕\n\n🎵 *${info.title || "Resultado"}*\n⚠️ ${erro.message || "Não foi possível concluir o download."}`,
            msg
        );
    } finally {
        limparArquivos(template);
        resultadosPlay.delete(token);
    }
}

exports.processarEscolhaPlay = async function(sock, msg, idBotao) {
    const match = String(idBotao || "").match(/^play_(audio|video|doc):(.+)$/);
    if (!match) return false;

    const modo = match[1];
    const token = match[2];

    // Silencioso: o único comentário do /play é o card do resultado (com a
    // capa). Depois do clique só chega a mídia — igual à música aleatória.
    await baixarResultadoPlay(sock, msg, token, modo, { silencioso: true });
    return true;
};
