/* =================================================
   🔗 MIKASA BOT — MULTISSESSÃO (conectar o bot em outro WhatsApp)
   📁 Arquivo: multisessao.js

   Permite que qualquer pessoa (no PV) peça pro bot gerar um QR Code ou
   um código de pareamento pra conectar uma CÓPIA INDEPENDENTE do bot no
   WhatsApp dela — com sua própria sessão, separada da sessão principal.

   Uso:
     .conectar qr                  -> manda um QR Code (imagem) pra escanear
     .conectar codigo 5511999999999 -> manda um código de pareamento (8 dígitos)

   ⚠️ Cada sessão conectada fica rodando ao mesmo tempo que a principal —
   em aparelhos fracos, várias sessões simultâneas podem pesar bastante.
================================================= */

const path = require("path");
const fs = require("fs");
const QRCode = require("qrcode");
const {
    default: makeWASocket,
    useMultiFileAuthState,
    fetchLatestBaileysVersion,
    DisconnectReason,
} = require("@whiskeysockets/baileys");
const pino = require("pino");

const pastaSessoesExtras = path.join(__dirname, "auth_info_users");
if (!fs.existsSync(pastaSessoesExtras)) fs.mkdirSync(pastaSessoesExtras, { recursive: true });

// remetenteId -> { sock, tentativasReconexao }
const sessoesAtivas = new Map();

function normalizarId(id) {
    return (id || "").split("@")[0].split(":")[0].replace(/[^0-9]/g, "");
}

async function iniciarSessaoExtra({ sockPrincipal, chatId, remetenteId, modo, numeroTelefone, anexarEventosBot }) {
    const chaveSessao = normalizarId(remetenteId);

    if (sessoesAtivas.has(chaveSessao)) {
        return sockPrincipal.sendMessage(chatId, {
            text: `┅┄┅┄『 ✦ 』┄┅┄┅┄\n ⚠️ *JÁ TEM UMA SESSÃO ATIVA*\n┅┄┅┄『 ✦ 』┄┅┄┅┄\nVocê já conectou (ou tá tentando conectar)\numa sessão antes. Espera concluir ou\ntenta de novo em alguns minutos.\n┅┄┅┄『 ✦ 』┄┅┄┅┄`
        });
    }

    const pastaDessaSessao = path.join(pastaSessoesExtras, chaveSessao);
    const { state, saveCreds } = await useMultiFileAuthState(pastaDessaSessao);
    const { version } = await fetchLatestBaileysVersion();

    const sockNovo = makeWASocket({
        version,
        logger: pino({ level: "silent" }),
        auth: state,
        markOnlineOnConnect: true,
        printQRInTerminal: false,
    });

    sessoesAtivas.set(chaveSessao, { sock: sockNovo, tentativasReconexao: 0 });

    let qrJaEnviado = false;
    let pareamentoJaPedido = false;

    sockNovo.ev.on("connection.update", async (update) => {
        const { connection, lastDisconnect, qr } = update;

        // ── MODO QR: manda a imagem assim que o primeiro QR chegar ──
        if (qr && modo === "qr" && !qrJaEnviado) {
            qrJaEnviado = true;
            try {
                const qrBuffer = await QRCode.toBuffer(qr, { width: 512, margin: 2 });
                await sockPrincipal.sendMessage(chatId, {
                    image: qrBuffer,
                    caption: `┅┄┅┄『 ✦ 』┄┅┄┅┄\n 📲 *ESCANEIE ESSE QR CODE*\n┅┄┅┄『 ✦ 』┄┅┄┅┄\n1️⃣ Abra o WhatsApp\n2️⃣ Vá em *Dispositivos conectados*\n3️⃣ Toque em *Conectar um dispositivo*\n4️⃣ Aponte a câmera pra essa imagem\n┅┄┅┄『 ✦ 』┄┅┄┅┄\n⚠️ Expira rápido — se demorar,\npeça um novo com *.conectar qr*\n┅┄┅┄『 ✦ 』┄┅┄┅┄`
                });
            } catch (erro) {
                console.error("❌ Erro ao gerar/enviar QR da sessão extra:", erro);
                await sockPrincipal.sendMessage(chatId, { text: "❌ Deu erro ao gerar o QR Code. Tenta de novo mais tarde." });
            }
        }

        // ── MODO CÓDIGO: pede o código assim que possível ──
        if (modo === "codigo" && !pareamentoJaPedido && !sockNovo.authState.creds.registered) {
            pareamentoJaPedido = true;
            try {
                const codigo = await sockNovo.requestPairingCode(numeroTelefone);
                const codigoFormatado = codigo?.match(/.{1,4}/g)?.join("-") || codigo;
                await sockPrincipal.sendMessage(chatId, {
                    text: `┅┄┅┄『 ✦ 』┄┅┄┅┄\n 🔑 *SEU CÓDIGO DE PAREAMENTO*\n┅┄┅┄『 ✦ 』┄┅┄┅┄\n📱 Número: +${numeroTelefone}\n🔢 Código: *${codigoFormatado}*\n┅┄┅┄『 ✦ 』┄┅┄┅┄\n1️⃣ Abra o WhatsApp\n2️⃣ Vá em *Dispositivos conectados*\n3️⃣ Toque em *Conectar um dispositivo*\n4️⃣ Escolha *Inserir código*\n┅┄┅┄『 ✦ 』┄┅┄┅┄\n⚠️ Válido por poucos minutos!\n┅┄┅┄『 ✦ 』┄┅┄┅┄`
                });
            } catch (erro) {
                console.error("❌ Erro ao gerar código de pareamento da sessão extra:", erro);
                await sockPrincipal.sendMessage(chatId, { text: "❌ Deu erro ao gerar o código de pareamento. Confere se o número tá certo (com DDI+DDD, só números) e tenta de novo." });
                sessoesAtivas.delete(chaveSessao);
            }
        }

        if (connection === "open") {
            await sockPrincipal.sendMessage(chatId, {
                text: `┅┄┅┄『 ✦ 』┄┅┄┅┄\n ✅ *CONECTADO COM SUCESSO!*\n┅┄┅┄『 ✦ 』┄┅┄┅┄\nSeu WhatsApp agora tem sua própria\ncópia do bot rodando! 🤖✨\n┅┄┅┄『 ✦ 』┄┅┄┅┄`
            });
            // 🔌 a partir daqui, essa sessão nova passa a responder
            // a TODOS os comandos, igual o bot principal.
            anexarEventosBot(sockNovo, saveCreds);
        }

        if (connection === "close") {
            const codigoErro = lastDisconnect?.error?.output?.statusCode;
            const motivo = DisconnectReason[codigoErro] || "ERRO_DESCONHECIDO";
            const podeReconectar = motivo !== DisconnectReason.loggedOut &&
                                   motivo !== DisconnectReason.badSession &&
                                   motivo !== DisconnectReason.unauthorized;

            const info = sessoesAtivas.get(chaveSessao);
            if (podeReconectar && info && info.tentativasReconexao < 5) {
                info.tentativasReconexao++;
                setTimeout(() => {
                    sessoesAtivas.delete(chaveSessao);
                    iniciarSessaoExtra({ sockPrincipal, chatId, remetenteId, modo, numeroTelefone, anexarEventosBot });
                }, 3000);
            } else {
                sessoesAtivas.delete(chaveSessao);
                if (motivo === DisconnectReason.loggedOut) {
                    try { fs.rmSync(pastaDessaSessao, { recursive: true, force: true }); } catch {}
                }
            }
        }
    });

    sockNovo.ev.on("creds.update", saveCreds);
}

// 🎛️ Comando .conectar
async function comandoConectar(sockPrincipal, msg, args, anexarEventosBot) {
    const chatId = msg.key.remoteJid;
    const remetenteId = msg.key.participant || msg.key.remoteJid;
    const isGroup = chatId.endsWith("@g.us");

    if (isGroup) {
        return sockPrincipal.sendMessage(chatId, {
            text: `┅┄┅┄『 ✦ 』┄┅┄┅┄\n ⚠️ *SÓ NO PRIVADO*\n┅┄┅┄『 ✦ 』┄┅┄┅┄\nPor segurança, esse comando só\nfunciona no meu privado, não em grupo.\n┅┄┅┄『 ✦ 』┄┅┄┅┄`
        }, { quoted: msg });
    }

    const modoEscolhido = (args[0] || "").toLowerCase();

    if (modoEscolhido !== "qr" && modoEscolhido !== "codigo") {
        return sockPrincipal.sendMessage(chatId, {
            text: `┅┄┅┄『 ✦ 』┄┅┄┅┄\n 🔗 *CONECTAR SUA PRÓPRIA CÓPIA DO BOT*\n┅┄┅┄『 ✦ 』┄┅┄┅┄\nEscolha como quer conectar:\n┅┄┅┄『 ✦ 』┄┅┄┅┄\n📲 *.conectar qr*\n(manda uma imagem de QR Code)\n┅┄┅┄『 ✦ 』┄┅┄┅┄\n🔢 *.conectar codigo 5511999999999*\n(manda um código de pareamento —\ntroque pelo SEU número, com DDI+DDD)\n┅┄┅┄『 ✦ 』┄┅┄┅┄`
        }, { quoted: msg });
    }

    if (modoEscolhido === "codigo") {
        const numeroTelefone = (args[1] || "").replace(/[^0-9]/g, "");
        if (!numeroTelefone || numeroTelefone.length < 10) {
            return sockPrincipal.sendMessage(chatId, {
                text: `❌ Manda o número certinho, com DDI+DDD, só números.\nExemplo: *.conectar codigo 5511999999999*`
            }, { quoted: msg });
        }
        await sockPrincipal.sendMessage(chatId, { text: "⏳ Gerando seu código de pareamento..." }, { quoted: msg });
        return iniciarSessaoExtra({ sockPrincipal, chatId, remetenteId, modo: "codigo", numeroTelefone, anexarEventosBot });
    }

    await sockPrincipal.sendMessage(chatId, { text: "⏳ Gerando seu QR Code..." }, { quoted: msg });
    return iniciarSessaoExtra({ sockPrincipal, chatId, remetenteId, modo: "qr", numeroTelefone: null, anexarEventosBot });
}

module.exports = { comandoConectar };
