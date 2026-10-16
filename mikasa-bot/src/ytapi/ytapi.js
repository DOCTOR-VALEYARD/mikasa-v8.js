/* =================================================
   🎵 MIKASA BOT — YTAPI
   📁 src/ytapi.js
   👑 DOCTOR VALEYARD

   Download de ÁUDIO por API (método PRINCIPAL do /play).
   O yt-dlp continua existindo no musica.js como método SECUNDÁRIO:
   se a API falhar, der timeout ou o certificado dela expirar,
   o musica.js cai no yt-dlp sozinho.

   Provedores, nesta ordem:
     1) Savetube  (media.savetube.vip)
     2) Vreden    (api.vreden.my.id)

   ✅ Só usa axios + crypto (já fazem parte do projeto)
   ✅ Não depende da versão do pacote @vreden/youtube_scraper
   ✅ Valida o arquivo baixado (tamanho e tipo) antes de aceitar
   ✅ Nunca ignora certificado SSL: se expirar, falha e vai pro yt-dlp
================================================= */

const axios = require('axios');
const fs = require('fs');
const { createDecipheriv } = require('crypto');

const QUALIDADES_AUDIO = [92, 128, 256, 320];

const UA_MOBILE =
    'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 ' +
    '(KHTML, like Gecko) Chrome/133.0.0.0 Mobile Safari/537.36';

// Tempo máximo de cada etapa (ms). Curto de propósito: se a API
// estiver lenta ou fora do ar, o yt-dlp assume sem demorar.
const TIMEOUT_INFO = 8000;
const TIMEOUT_ARQUIVO = 60000;
// Prazo TOTAL pra um provedor entregar o link (somando todas as etapas).
const PRAZO_LINK_MS = 15000;

// =================================================
// 🩺 SAÚDE DOS PROVEDORES (evita perder tempo toda música)
// =================================================
// Se um provedor falhou agora há pouco, ele é PULADO por um tempo.
//   • Fora do ar de vez (domínio não existe, recusou conexão, certificado):  30 min
//   • Lento / estourou o tempo / erro 5xx:                                    3 min
// Erros ligados ao vídeo específico (4xx, "sem link") não pausam nada.
const emPausa = new Map(); // nome -> timestamp até quando fica pausado

const ERROS_DEFINITIVOS = new Set([
    'ENOTFOUND', 'ECONNREFUSED', 'EAI_AGAIN',
    'CERT_HAS_EXPIRED', 'DEPTH_ZERO_SELF_SIGNED_CERT',
    'UNABLE_TO_VERIFY_LEAF_SIGNATURE', 'ERR_TLS_CERT_ALTNAME_INVALID'
]);
const ERROS_LENTIDAO = new Set(['ECONNABORTED', 'ETIMEDOUT', 'ECONNRESET', 'EPIPE']);

function minutosDePausa(erro) {
    const codigo = erro?.code;
    const status = Number(erro?.response?.status || 0);
    if (ERROS_DEFINITIVOS.has(codigo)) return 30;
    if (ERROS_LENTIDAO.has(codigo) || status >= 500) return 3;
    return 0;
}

function comPrazo(promessa, ms, nome) {
    let timer;
    const limite = new Promise((_, rejeitar) => {
        timer = setTimeout(() => {
            const e = new Error(`${nome} demorou mais de ${Math.round(ms / 1000)}s`);
            e.code = 'ETIMEDOUT';
            rejeitar(e);
        }, ms);
    });
    return Promise.race([promessa, limite]).finally(() => clearTimeout(timer));
}

// Chave pública usada pelo Savetube para criptografar a resposta de /v2/info
const SAVETUBE_CHAVE_HEX = 'C5D58EF67A7584E4A29F6C35BBC4EB12';

// =================================================
// 🔧 UTILITÁRIOS
// =================================================

function extrairIdYoutube(entrada) {
    const texto = String(entrada || '');
    const m = texto.match(
        /(?:youtu\.be\/|youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|v\/|live\/))([A-Za-z0-9_-]{11})/i
    );
    if (m) return m[1];
    return /^[A-Za-z0-9_-]{11}$/.test(texto) ? texto : null;
}

function escolherQualidade(q) {
    return QUALIDADES_AUDIO.includes(Number(q)) ? Number(q) : 128;
}

function descriptografarSavetube(base64) {
    const dados = Buffer.from(base64, 'base64');
    const iv = dados.subarray(0, 16);
    const conteudo = dados.subarray(16);
    const chave = Buffer.from(SAVETUBE_CHAVE_HEX, 'hex');
    const decipher = createDecipheriv('aes-128-cbc', chave, iv);
    const aberto = Buffer.concat([decipher.update(conteudo), decipher.final()]);
    return JSON.parse(aberto.toString());
}

function motivoDoErro(erro) {
    return erro?.code || erro?.response?.status || erro?.message || 'erro desconhecido';
}

// =================================================
// 1️⃣ SAVETUBE → devolve { url, titulo }
// =================================================

async function obterLinkSavetube(videoUrl, qualidade) {
    const cdn = (await axios.get('https://media.savetube.vip/api/random-cdn', {
        timeout: TIMEOUT_INFO,
        headers: { 'User-Agent': UA_MOBILE }
    })).data?.cdn;

    if (!cdn) throw new Error('Savetube não informou o servidor (cdn).');

    const info = (await axios.post(`https://${cdn}/v2/info`, { url: videoUrl }, {
        timeout: TIMEOUT_INFO,
        headers: {
            'User-Agent': UA_MOBILE,
            'Referer': 'https://media.savetube.vip/1kejjj1?id=362796039'
        }
    })).data;

    if (!info?.data) throw new Error('Savetube não retornou informações do vídeo.');
    const detalhes = descriptografarSavetube(info.data);
    if (!detalhes?.key) throw new Error('Savetube não retornou a chave de download.');

    const resposta = (await axios.post(`https://${cdn}/download`, {
        downloadType: 'audio',
        quality: String(qualidade),
        key: detalhes.key
    }, {
        timeout: TIMEOUT_INFO,
        headers: {
            'Content-Type': 'application/json',
            'User-Agent': UA_MOBILE,
            'Referer': 'https://media.savetube.vip/start-download?from=1kejjj1%3Fid%3D362796039'
        }
    })).data;

    const url = resposta?.data?.downloadUrl;
    if (!url) throw new Error('Savetube não gerou o link de download.');

    return { url, titulo: detalhes.title || null };
}

// =================================================
// 2️⃣ VREDEN → devolve { url, titulo }
// =================================================

function acharUrlNaResposta(r) {
    if (!r || typeof r !== 'object') return null;
    const candidatos = [
        r.download?.url,
        r.download?.downloadUrl,
        r.download_url,
        r.downloadUrl,
        r.url,
        r.link,
        r.data?.download?.url,
        r.data?.url
    ];
    return candidatos.find(v => typeof v === 'string' && /^https?:\/\//i.test(v)) || null;
}

async function obterLinkVreden(videoUrl, qualidade) {
    const resposta = await axios.get(
        'https://api.vreden.my.id/api/v1/download/youtube/audio',
        {
            timeout: TIMEOUT_INFO,
            params: { url: videoUrl, quality: qualidade },
            headers: {
                'user-agent':
                    'VredenCloud/1.0 (+https://api.vreden.my.id; vreden@stayhome.li)'
            }
        }
    );

    const resultado = resposta.data?.result;
    const url = acharUrlNaResposta(resultado);
    if (!url) throw new Error('Vreden não retornou link de download.');

    return {
        url,
        titulo: resultado?.metadata?.title || resultado?.title || null
    };
}

// =================================================
// ⬇️ BAIXA O ARQUIVO DO LINK E SALVA NO DISCO
// =================================================

async function baixarParaArquivo(url, destino) {
    const resposta = await axios.get(url, {
        responseType: 'arraybuffer',
        timeout: TIMEOUT_ARQUIVO,
        maxRedirects: 5,
        headers: { 'User-Agent': UA_MOBILE },
        validateStatus: s => s >= 200 && s < 300
    });

    const tipo = String(resposta.headers?.['content-type'] || '').toLowerCase();
    if (tipo.includes('text/html') || tipo.includes('application/json')) {
        throw new Error(`O link devolveu "${tipo}" em vez de áudio.`);
    }

    const buffer = Buffer.from(resposta.data);
    if (buffer.length < 10000) {
        throw new Error('O áudio baixado veio vazio ou incompleto.');
    }

    fs.writeFileSync(destino, buffer);
    return buffer.length;
}

// =================================================
// 🎯 FUNÇÃO PRINCIPAL
// =================================================
// baixarAudioApi(videoUrlOuId, destinoSemExtensao, { qualidade })
//   → { arquivo, titulo, provedor }   (sucesso)
//   → lança Error com o motivo de cada provedor (falha total)

async function baixarAudioApi(videoUrlOuId, destinoSemExtensao, opcoes = {}) {
    const id = extrairIdYoutube(videoUrlOuId);
    if (!id) throw new Error('Link do YouTube inválido para a API.');

    const videoUrl = `https://www.youtube.com/watch?v=${id}`;
    const qualidade = escolherQualidade(opcoes.qualidade);
    const destino = `${destinoSemExtensao}.mp3`;

    const provedores = [
        { nome: 'Savetube', obter: obterLinkSavetube },
        { nome: 'Vreden', obter: obterLinkVreden }
    ];

    const falhas = [];

    for (const p of provedores) {
        const ate = emPausa.get(p.nome) || 0;
        if (ate > Date.now()) {
            falhas.push(`${p.nome}: em pausa (${Math.ceil((ate - Date.now()) / 60000)} min)`);
            continue; // pulado sem perder tempo
        }
        try {
            console.log(`🎵 [YTAPI] Tentando ${p.nome}...`);
            const { url, titulo } = await comPrazo(p.obter(videoUrl, qualidade), PRAZO_LINK_MS, p.nome);
            const bytes = await baixarParaArquivo(url, destino);
            console.log(`🎵 [YTAPI] ✅ ${p.nome} entregou ${(bytes / 1024 / 1024).toFixed(2)} MB`);
            return { arquivo: destino, titulo, provedor: p.nome };
        } catch (erro) {
            const motivo = motivoDoErro(erro);
            const minutos = minutosDePausa(erro);
            if (minutos > 0) emPausa.set(p.nome, Date.now() + minutos * 60000);
            console.log(`🎵 [YTAPI] ❌ ${p.nome} falhou: ${motivo}${minutos ? ` (pulando por ${minutos} min)` : ''}`);
            falhas.push(`${p.nome}: ${motivo}`);
            try { if (fs.existsSync(destino)) fs.unlinkSync(destino); } catch {}
        }
    }

    throw new Error(`API de áudio indisponível (${falhas.join(' | ')})`);
}

module.exports = { baixarAudioApi, extrairIdYoutube };
