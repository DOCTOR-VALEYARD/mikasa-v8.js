/* =================================================
   🤖 MIKASA BOT — ANTI-BOT (evita loop entre bots)
   📁 Arquivo: anti-bot.js

   Problema: em grupo com mais de um bot usando o MESMO prefixo, um
   responde o outro, o outro responde de volta... e vira spam.

   Como resolve (sem esperar 3 mensagens repetidas):
   1) 🔎 ID da mensagem: bots feitos em Baileys geram IDs com um
      "formato de biblioteca" que celular normal não usa.
        • BAE5 + 12 caracteres      → bot Baileys antigo: ignorado na hora
        • 3EB0 + 18 ou 36 caracteres → "provável bot" (o WhatsApp Web/Desktop
          usa um formato parecido, por isso só marca como bot se o
          passo 2 também bater)
   2) ⏱️ Reação rápida: mensagem de "provável bot" que chega até
      2,5 s depois de uma resposta MINHA no mesmo chat é resposta
      automática de outro bot → ele entra na lista de ignorados.
   3) 📝 A lista de ignorados fica salva (src/dados/outros-bots.json) e
      vale por 2 horas; depois disso a pessoa volta a ser avaliada.
   O DONO do bot nunca é ignorado.

   🔁 Também registra os IDs de tudo que o bot mesmo enviou, pra nunca
   tratar uma mensagem sua como se fosse de outra pessoa.

   Pra desligar tudo: IGNORAR_OUTROS_BOTS: false no config.js.

   🔁 ANTI-REPETIÇÃO (vale pra bot E pra gente):
   Se o bot JÁ respondeu uma mensagem e a MESMA pessoa manda exatamente o mesmo
   texto de novo dentro de 60 s, a segunda é ignorada — não responde de novo.
   Isso corta o ping-pong entre bots ("qual o prefixo?" → resposta → mesma
   pergunta → resposta...). O dono do bot nunca é bloqueado.
   Tempo: ANTI_REPETICAO_SEGUNDOS no config.js (0 = desligado).
================================================= */

const fs = require("fs");
const path = require("path");
const config = require("../../config");
const { DADOS } = require("../caminhos/caminhos");

const ARQUIVO = path.join(DADOS, "outros-bots.json");
const JANELA_REACAO_MS = 2500;
const VALIDADE_MS = 2 * 60 * 60 * 1000;
const GUARDAR_IDS_MS = 15 * 60 * 1000;

// 🔁 Anti-repetição
const entradas = new Map();            // id da mensagem recebida -> { chave, t }
const respondidos = new Map();         // chave (chat|pessoa|texto) -> quando o bot respondeu
const ultimaEntradaNoChat = new Map(); // chat -> { chave, t }

function janelaRepeticaoMs() {
    const seg = Number(config.ANTI_REPETICAO_SEGUNDOS ?? 60);
    return seg > 0 ? seg * 1000 : 0;
}

function normalizarParaRepeticao(texto) {
    return String(texto || "")
        .toLowerCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, " ")
        .trim();
}

function chaveDeRepeticao(msg, texto) {
    const norm = normalizarParaRepeticao(texto);
    if (norm.length < 2 || /^[0-9 ]+$/.test(norm)) return null; // vazio ou só número ("1", "2"...)
    const pessoa = String(msg?.key?.participant || msg?.key?.remoteJid || "").replace(/:\d+@/, "@");
    return `${msg?.key?.remoteJid}|${pessoa}|${norm}`;
}

function limparRepeticoes() {
    const agora = Date.now();
    const limite = Math.max(janelaRepeticaoMs(), 60000) * 2;
    for (const [k, v] of respondidos) if (agora - v > limite) respondidos.delete(k);
    for (const [k, v] of entradas) if (agora - v.t > limite) entradas.delete(k);
}

// A mesma pessoa mandou, de novo, o mesmo texto que o bot já respondeu há pouco?
function ehRepeticao(msg, texto, ehDono = false) {
    const janela = janelaRepeticaoMs();
    if (!janela || ehDono || msg?.key?.fromMe) return false;
    const chave = chaveDeRepeticao(msg, texto);
    if (!chave) return false;
    const quando = respondidos.get(chave);
    return !!quando && Date.now() - quando < janela;
}

// Anota que chegou essa mensagem (pra saber, depois, qual delas o bot respondeu).
function registrarEntrada(msg, texto) {
    const chave = chaveDeRepeticao(msg, texto);
    if (!chave) return;
    const registro = { chave, t: Date.now() };
    if (msg?.key?.id) entradas.set(msg.key.id, registro);
    ultimaEntradaNoChat.set(msg.key.remoteJid, registro);
    if (entradas.size > 800) limparRepeticoes();
}

// O bot respondeu algo: marca a mensagem respondida (pela citação, ou a mais recente do chat).
function marcarRespondido(chatId, idCitado) {
    let registro = idCitado ? entradas.get(idCitado) : null;
    if (!registro) {
        const ultimo = ultimaEntradaNoChat.get(chatId);
        if (ultimo && Date.now() - ultimo.t <= 20000) registro = ultimo;
    }
    if (registro) respondidos.set(registro.chave, Date.now());
}

const idsEnviados = new Map();    // id da mensagem -> quando enviei
const ultimoEnvioNoChat = new Map(); // chat -> quando enviei algo (sem contar reação)
let marcados = {};

try {
    if (fs.existsSync(ARQUIVO)) marcados = JSON.parse(fs.readFileSync(ARQUIVO, "utf8")) || {};
} catch { marcados = {}; }

function salvar() {
    try {
        fs.mkdirSync(path.dirname(ARQUIVO), { recursive: true });
        fs.writeFileSync(ARQUIVO, JSON.stringify(marcados, null, 2), "utf8");
    } catch {}
}

function ligado() {
    return config.IGNORAR_OUTROS_BOTS !== false;
}

function limparAntigos() {
    const agora = Date.now();
    for (const [id, t] of idsEnviados) if (agora - t > GUARDAR_IDS_MS) idsEnviados.delete(id);
    let mudou = false;
    for (const [jid, expira] of Object.entries(marcados)) {
        if (expira <= agora) { delete marcados[jid]; mudou = true; }
    }
    if (mudou) salvar();
}

function registrarEnvio(chatId, idMensagem, ehReacao = false) {
    if (idMensagem) idsEnviados.set(idMensagem, Date.now());
    if (chatId && !ehReacao) ultimoEnvioNoChat.set(chatId, Date.now());
    if (idsEnviados.size > 500) limparAntigos();
}

// Envolve sendMessage/relayMessage do socket pra anotar tudo que o bot manda.
function instalarRastreio(sock) {
    if (!sock || sock.__antiBotInstalado) return;
    sock.__antiBotInstalado = true;

    // 🏷️ Figurinha enviada sem etiqueta (nome do pacote/autor) ganha a etiqueta padrão do bot.
    try { require("../figurinha-meta/figurinha-meta").instalar(sock); } catch {}

    const enviarOriginal = sock.sendMessage.bind(sock);
    sock.sendMessage = async (jid, conteudo, ...resto) => {
        const resultado = await enviarOriginal(jid, conteudo, ...resto);
        try {
            const ehReacao = !!conteudo?.react;
            registrarEnvio(jid, resultado?.key?.id, ehReacao);
            if (!ehReacao && !conteudo?.delete) marcarRespondido(jid, resto[0]?.quoted?.key?.id);
        } catch {}
        return resultado;
    };

    if (typeof sock.relayMessage === "function") {
        const retransmitirOriginal = sock.relayMessage.bind(sock);
        sock.relayMessage = async (jid, mensagem, opcoes = {}) => {
            try { registrarEnvio(jid, opcoes?.messageId); marcarRespondido(jid, null); } catch {}
            return retransmitirOriginal(jid, mensagem, opcoes);
        };
    }
}

// Mensagem que veio do MESMO número do bot (eco do que ele mesmo enviou)?
function ehEcoDoBot(msg) {
    return idsEnviados.has(msg?.key?.id);
}

function tipoDeId(id) {
    const v = String(id || "");
    if (/^BAE5[0-9A-F]{12}$/i.test(v)) return "certo";
    if (/^3EB0[0-9A-F]{18}$/i.test(v) || /^3EB0[0-9A-F]{36}$/i.test(v)) return "provavel";
    return "humano";
}

function chaveDoRemetente(msg) {
    return String(msg?.key?.participant || msg?.key?.remoteJid || "").replace(/:\d+@/, "@");
}

/**
 * true  → a mensagem é de outro bot: ignore por completo (sem comando, sem reação).
 * false → trata normal.
 * ehDono: se quem mandou é o dono do bot, nunca é ignorado.
 */
function ehOutroBot(msg, ehDono = false) {
    if (!ligado() || ehDono || msg?.key?.fromMe) return false;
    if (!String(msg?.key?.remoteJid || "").endsWith("@g.us")) return false; // só faz sentido em grupo

    limparAntigos();
    const chave = chaveDoRemetente(msg);
    if (marcados[chave] && marcados[chave] > Date.now()) return true;

    const tipo = tipoDeId(msg.key.id);
    let ehBot = tipo === "certo";

    if (!ehBot && tipo === "provavel") {
        const ultimo = ultimoEnvioNoChat.get(msg.key.remoteJid);
        ehBot = !!ultimo && Date.now() - ultimo <= JANELA_REACAO_MS;
    }

    if (ehBot) {
        marcados[chave] = Date.now() + VALIDADE_MS;
        salvar();
        console.log(`🤖 Outro bot detectado em ${msg.key.remoteJid}: ${chave} — ignorando por 2h.`);
        return true;
    }
    return false;
}

module.exports = { instalarRastreio, registrarEnvio, ehEcoDoBot, ehOutroBot, tipoDeId, ehRepeticao, registrarEntrada, marcarRespondido };
