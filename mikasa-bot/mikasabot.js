// ==================================================
// 📦 VERIFICAÇÃO BÁSICA DAS BIBLIOTECAS
// ==================================================
const fs = require("fs");

// 📦 Puxa pro lugar novo qualquer arquivo que ainda esteja no layout antigo da src
// (precisa rodar ANTES de carregar qualquer outro módulo).
require("./src/migracao/migracao").migrar();

// 🌐 Site + painel do dono: sobe junto com o bot (não depende do WhatsApp estar conectado)
try { require("./src/site/site").iniciar(); } catch (e) { console.error("🌐 Site não iniciou:", e.message); }

const { execSync } = require("child_process");
const NodeCache = require("node-cache");

const dependencias = [
    "@whiskeysockets/baileys",
    "pino",
    "qrcode-terminal",
    "chalk"
];

console.log("🔍 VERIFICANDO BIBLIOTECAS...");
dependencias.forEach(pacote => {
    try { require.resolve(pacote); }
    catch {
        console.log(`📥 INSTALANDO: ${pacote}`);
        execSync(`npm install ${pacote} --save`, { stdio: "inherit" });
    }
});

// --- DEPENDÊNCIAS DO BOT ---
const {
    default: makeWASocket,
    useMultiFileAuthState,
    fetchLatestBaileysVersion,
    DisconnectReason
} = require("@whiskeysockets/baileys");
const pino = require("pino");
const qrcode = require("qrcode-terminal");
const path = require("path");
const readline = require("readline");

// --- ARQUIVOS DE CONFIGURAÇÃO ---
const config = require("./config");
const startInfo = require("./start");

// 🔹 GERENCIAMENTO DE GRUPO E PERMISSÕES
const {
    grupoHandler,
    groupEvents,
    verificarAntis,
    isAdmin,
    getDB,
    saveDB,
    normalize
} = require("./src/grupo/grupo");

// ✅ SISTEMA DE NÍVEL, MOEDAS E EVOLUÇÃO
const { processLevel } = require("./src/level/level");
const { processarPrimeiraMensagem, verificarAniversarios, cmdEconomia, cmdSocial, cmdRank, cmdPresentes, cmdMissoes, cmdPunição, cmdAutoban, processarEntradaAutoban, cmdMediaFire, cmdConfigAvancada, cmdBackup, cmdMaintenance, cmdHistorico, processarStatusMencionado, processarManutencao, cmdEnquete, cmdBanco, cmdInventario, cmdTopSocial, cmdXpNivel, cmdBonus, processarMute, cmdMute, cmdConquistas, cmdBotStatus, cmdBroadcast } = require("./src/recursos-avancados/recursos-avancados");

// ✅🔑 INTELIGÊNCIA ARTIFICIAL
const { gerenciarModoIA, processarIA, normalizarTexto } = require("./src/mikasa-ia/mikasa-ia.js");

// 🔹 CONTROLES INTERNOS
const aguardandoResposta = new Map();

// 🔒 Só administrador do grupo (ou o dono do bot) passa. Responde avisando quem não pode.
async function exigirAdmin(sock, msg, from) {
    const autor = msg.key.participant || msg.key.remoteJid;
    if (ehDono([autor, msg.key.participantAlt, from], config.OWNER_NUMBER)) return true;
    const admin = String(from).endsWith("@g.us") && await isAdmin(sock, from, autor).catch(() => false);
    if (!admin) {
        await sock.sendMessage(from, { text: "🚫 Apenas administradores podem usar esse comando." }, { quoted: msg }).catch(() => {});
    }
    return !!admin;
}

// ==================================================
// 🛡️ REDE DE SEGURANÇA GLOBAL — ISSO CORRIGE O BOT "REINICIANDO SOZINHO"
// ==================================================
// Antes, qualquer erro não tratado dentro de um comando derrubava o
// processo Node inteiro — e como o bot normalmente roda sob um gerenciador
// de processo (pm2, systemd, nodemon, etc), ele reiniciava sozinho. Isso
// costuma aparecer bem depois que alguém fica um tempo sem usar o bot,
// porque geralmente é a PRÓXIMA mensagem/comando executado que dispara um
// erro que já estava "esperando" a próxima chamada de alguma função. Com
// esses dois handlers, o processo NUNCA morre por causa de um erro de
// comando — ele só loga o erro no console e continua rodando normalmente.
process.on("unhandledRejection", (motivo) => {
    console.error("⚠️ [PROMISE NÃO TRATADA] O bot ia cair aqui, mas foi contido:", motivo);
});
process.on("uncaughtException", (erro) => {
    console.error("⚠️ [EXCEÇÃO NÃO TRATADA] O bot ia cair aqui, mas foi contido:", erro);
});

// 📚 IMPORTAÇÕES DOS MÓDULOS
const { menu } = require("./src/menu/menu");
const {
    sendMenuBotoes,
    extrairIdBotaoClicado,
    sendMenuPrincipal,
    sendMenuLista,
    enviarMenuCategoria,
    enviarBotoesNavegacao,
    sendMenuCanal,
    sendMenuDonoContato,
    sendZoeiraDono,
    enviarNativeFlow,
    enviarListaTexto,
    montarCategorias,
    montarSubcategorias,
    getInteractivePending,
    setInteractivePending,
    clearInteractivePending,
    textoPrompt,
    extrairComandosDoBot,
    enviarListaCategoria,
    enviarListaSubcategoria,
    enviarListaWhatsApp,
    comandoPrecisaEntrada
} = require("./src/menuBotoes/menuBotoes");
const { cachearMensagem, verificarMensagemApagada, gerenciarX9 } = require("./src/antidelete/antidelete");
const { gerenciarViewOnce, processarX9 } = require("./src/x9/x9");
const { verificarRepeticao } = require("./src/antiloop/antiloop");
const { bloquearMenuPV } = require("./src/menu-pv/menu-pv");
const { estaLigado, ligar, desligar } = require("./src/ligado/ligado");
const { ehDono, registrarMeuNumero } = require("./src/utils-validacao/utils-validacao");
const { gerenciarAntiNSFW, processarMidiaNSFW } = require("./src/antinsfw/antinsfw");
const { verificarSaudacao } = require("./src/saudacoes/saudacoes");
const { verificarAntiAmor } = require("./src/antiamor/antiamor");
const antiBot = require("./src/anti-bot/anti-bot");
const { enquete } = require("./src/enquete/enquete");
const { ativacoes } = require("./src/ativacoes/ativacoes");
const { verificarPrefixoErrado, sugerirComandoParecido } = require("./src/dica-prefixo/dica-prefixo");
const { enviarAudioDaPasta } = require("./src/audio-pastas/audio-pastas");
const { meuId } = require("./src/meuid/meuid");
const { ping } = require("./src/ping/ping");
const { configurarBot } = require("./src/configurar-bot/configurar-bot");
const { ativar } = require("./src/ativar/ativar");
const { infobot } = require("./src/infobot/infobot");
const { bootHandler } = require("./src/boot/boot");
const { interacao } = require("./src/interacao/interacao");
const { baixarMusica, setReferenciaEspera, processarEscolhaPlay } = require("./src/musica/musica");
const { gtts } = require("./src/gtts/gtts");
const { tomp3 } = require("./src/tomp3/tomp3");
const { voz } = require("./src/voz/voz");
const { criarFigurinha } = require("./src/figurinha/figurinha");
const { addfigurinha } = require("./src/addfigurinha/addfigurinha");
const { converterParaGif } = require("./src/gif/gif.js");
const { efeitos } = require("./src/efeitos/efeitos");
const { logos } = require("./src/logos/logos");
const { registrar } = require("./src/registrar/registrar");
const { delregistro } = require("./src/delregistro/delregistro");
const { perfil } = require("./src/perfil/perfil");
const { inforegistrar } = require("./src/inforegistrar/inforegistrar");
const { infoperfil } = require("./src/infoperfil/infoperfil");
const { saldo } = require("./src/saldo/saldo");
const { moedas } = require("./src/moedas/moedas");
const { roubar } = require("./src/roubar/roubar");
const { loja } = require("./src/loja/loja");
const { gastar } = require("./src/gastar/gastar");
const { duelo } = require("./src/duelo/duelo");
const { resgatar } = require("./src/resgatar/resgatar");
const { spam } = require("./src/spam/spam");
const { formarCasal } = require("./src/casal/casal.js");
const { sortear } = require("./src/sortear/sortear");
const { roleta } = require("./src/roleta/roleta");
const { rank } = require("./src/rank/rank");
const { Cassi } = require("./src/signo/signo");
const { brincadeiras } = require("./src/brincadeiras/brincadeiras");
const { estaAtiva: brincadeirasAtivas, alterarAtivacao: alterarBrincadeiras, ehBrincadeira } = require("./src/brincadeiras-control/brincadeiras-control");
const { marcar } = require("./src/marcar/marcar");
const { hidetag } = require("./src/hidetag/hidetag");
const { antilink } = require("./src/antilink/antilink");
const { antinota } = require("./src/antinota/antinota");
const { antifake } = require("./src/antifake/antifake");
const { ban } = require("./src/ban/ban");
const { kick } = require("./src/kick/kick");
const { promover } = require("./src/promover/promover");
const { rebaixar } = require("./src/rebaixar/rebaixar");
const { abrir } = require("./src/abrir/abrir");
const { fechar } = require("./src/fechar/fechar");
const { aviso } = require("./src/aviso/aviso");
// (sistema de boas-vindas agora é 100% automático — ver groupEvents em src/grupo.js)
const { adms } = require("./src/adms/adms");
const { convite } = require("./src/convite/convite");
const { advertidos } = require("./src/advertidos/advertidos");
const { mutados } = require("./src/mutados/mutados");
const { infoadv } = require("./src/infoadv/infoadv");
const { infomute } = require("./src/infomute/infomute");
const { menudono } = require("./src/menudono/menudono");
const { menuadm } = require("./src/menuadm/menuadm");
const { menupremium } = require("./src/menupremium/menupremium");
const { alugar } = require("./src/alugar/alugar");
const { meme } = require("./src/meme/meme");
const { artenome, artenomegif } = require("./src/artenome/artenome");
const { menugold } = require("./src/menugold/menugold");
const { menumidias } = require("./src/menumidias/menumidias");
const { limpar } = require("./src/limpar/limpar");
const { forca } = require("./src/forca/forca");
const { adivinha } = require("./src/adivinha/adivinha");
const { quiz } = require("./src/quiz/quiz");
const { jogodavelha } = require("./src/jogodavelha/jogodavelha");
const { aleatory } = require("./src/aleatory/aleatory");
const { adicionarReacao } = require("./src/reacao-sistema/reacao-sistema");
const { reagir } = require("./src/reagir/reagir");
const { tempo } = require("./src/tempo/tempo");
const { celular } = require("./src/celular/celular");
const { resumo } = require("./src/resumo/resumo");
const { registrarMensagemRelatorio, toggleRelatorio, iniciarAgendadorDiario, topAtivos } = require("./src/relatorio/relatorio");
const { comandosAdmin, comandosUtil, tempoGrupo, processarAntiPalavrao, processarBlacklist, processarFigurinhaAutomatica } = require("./src/comandos-solicitados/comandos-solicitados");
const { esporte_noticias } = require("./src/esporte_noticias/esporte_noticias");
const { bug } = require("./src/bug/bug");
const { sugestao } = require("./src/sugestao/sugestao");
const { avalie } = require("./src/avalie/avalie");
const { mensagem: msgTra } = require("./src/tra/tra");
const { mensagem: msgBu } = require("./src/bu/bu");
const { mensagem: msgKill } = require("./src/kill/kill");
const { mensagem: msgGp } = require("./src/gp/gp");


// ==================================================
// MENU DE ESCOLHA
// ==================================================
async function iniciarSistema() {
    if (fs.existsSync("auth_info/creds.json")) {
        return startMikasaBot();
    }

    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

    console.log(`
╭━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╮
   🤖 ${config.BOT_NAME} • ${config.OWNER_NAME} 🤖
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯

📌 ESCOLHA A FORMA DE CONEXÃO:

   [ 1 ] 📲 — USAR QR CODE
   [ 2 ] 🔢 — USAR CÓDIGO DE PAREAMENTO

💡 DIGITE APENAS O NÚMERO E PRESSIONE ENTER:
──────────────────────────────────────────`);

    rl.question("➜ ", (escolha) => {
        rl.close();
        escolha = escolha.trim();

        if (escolha === "1") {
            console.log("\n✅ MODO SELECIONADO: QR CODE");
            return startMikasaBot("qrcode");
        }
        else if (escolha === "2") {
            console.log("\n✅ MODO SELECIONADO: CÓDIGO DE PAREAMENTO");

            const rl2 = readline.createInterface({ input: process.stdin, output: process.stdout });
            console.log("📝 INFORME SEU NÚMERO COMPLETO: 55 + DDD + NÚMERO");
            console.log("💡 EXEMPLO: 5516999998888\n");

            rl2.question("➜ ", (numero) => {
                rl2.close();
                numero = numero.replace(/[^0-9]/g, "");

                if (numero.length < 10 || !numero.startsWith("55")) {
                    console.log("\n❌ NÚMERO INVÁLIDO! REINICIE!");
                    process.exit(1);
                }

                console.log("\n🔄 PREPARANDO CONEXÃO... AGUARDE ⏳\n");
                return startMikasaBot("codigo", numero);
            });
        }
        else {
            console.log("\n❌ OPÇÃO INVÁLIDA!");
            process.exit(0);
        }
    });
}


// ==================================================
// 🗃️ CACHE DE METADADOS DE GRUPO (recomendado pelo Baileys p/ eventos de grupo confiáveis)
// ==================================================
const groupCache = new NodeCache({ stdTTL: 5 * 60, useClones: false });

// ⏰ Controle do agendador de relatório diário (evita duplicar em reconexões)
let intervalRelatorioDiario = null;

// ==================================================
// ⚙️ FUNÇÃO PRINCIPAL — BAILEYS v7-RC9 CORRETO
// ==================================================
async function startMikasaBot(modo = "qrcode", numeroCelular = "") {

    // 🧹 LIMPEZA
    if (aguardandoResposta?.clear) aguardandoResposta.clear();

    const { state, saveCreds } = await useMultiFileAuthState("auth_info");
    const { version } = await fetchLatestBaileysVersion();

    // ✅ CONFIG LIMPA — SEM mobile NEM phoneNumber (não existem no v7-rc9)
    const sock = makeWASocket({
        version,
        logger: pino({ level: "silent" }),
        auth: state,
        markOnlineOnConnect: true,
        printQRInTerminal: false,
        cachedGroupMetadata: async (jid) => groupCache.get(jid)
    });

    // 🤖 Anota tudo que o bot envia (pra não confundir eco com mensagem de outro bot)
    antiBot.instalarRastreio(sock);

    startInfo();
    setReferenciaEspera(aguardandoResposta);

    // ─── CONTROLE DE PAREAMENTO ───
    let pairingJaFeito = false;

    sock.ev.on("connection.update", async (update) => {
        const { connection, lastDisconnect, qr } = update;

        // ── QR CODE chegou: momento certo para pedir o código ──
        if (qr) {
            if (modo === "codigo" && !pairingJaFeito) {
                pairingJaFeito = true;
                try {
                    // No v7-rc9 requestPairingCode() é chamado após o QR ser gerado
                    const codigoGerado = await sock.requestPairingCode(numeroCelular);
                    const codigoFormatado = codigoGerado?.match(/.{1,4}/g)?.join("-") || codigoGerado;

                    console.log(`\n`);
                    console.log(`╭━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╮`);
                    console.log(`   🔑 SEU CÓDIGO DE PAREAMENTO 🔑`);
                    console.log(`╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯`);
                    console.log(``);
                    console.log(`📱 NÚMERO: +${numeroCelular}`);
                    console.log(`🔢 CÓDIGO: 🟩 ${codigoFormatado} 🟩`);
                    console.log(``);
                    console.log(`📖 COMO USAR:`);
                    console.log(`   1. Abra WhatsApp ➜ Dispositivos Conectados`);
                    console.log(`   2. Toque em "Conectar um dispositivo"`);
                    console.log(`   3. Escolha "Inserir código de pareamento"`);
                    console.log(`⚠️  VÁLIDO POR 2 MINUTOS — NÃO DEMORE!`);
                    console.log(`──────────────────────────────────────────\n`);
                } catch (err) {
                    console.error("\n❌ ERRO AO GERAR CÓDIGO:", err.message);
                    console.log("💡 SOLUÇÃO: Tente a opção [1] QR Code ou reinicie o bot.\n");
                }
            } else if (modo === "qrcode") {
                // Modo QR normal
                console.log("\n📲 ESCANIE O QR CODE ABAIXO:\n");
                qrcode.generate(qr, { small: true });
                console.log("\n⚠️ NÃO FECHE O TERMINAL!\n");
            }
        }

        // ── Conectado com sucesso ──
        if (connection === "open") {
            // 🤖 Guarda o número do próprio bot: ele conta como dono em qualquer comando.
            try { registrarMeuNumero(sock.user?.id, sock.user?.lid); } catch {}
            // 🌐 avisa o site que o bot conectou (status no painel + aviso de mensagens ao dono)
            try { const siteApp = require("./src/site/site"); siteApp.vincularSocket(sock); siteApp.definirStatus({ conectado: true, numero: sock.user?.id }); } catch {}
            console.log(`\n✅ ${config.BOT_NAME} CONECTADA COM SUCESSO! 🤖✨`);
            if (intervalRelatorioDiario) clearInterval(intervalRelatorioDiario);
            intervalRelatorioDiario = iniciarAgendadorDiario(sock);

            // 💎 Retoma cobranças Pix que ficaram pendentes caso o bot
            // tenha reiniciado no meio do processo (ex.: pessoa gerou o
            // Pix, pagou, mas o bot caiu antes de confirmar).
            try {
                const { retomarPendentes } = require("./src/pagamento-pix/pagamento-pix");
                const { confirmarPagamentoVip } = require("./src/aluguel-menu/aluguel-menu");
                retomarPendentes({
                    onPago: (pagamento, dados) => confirmarPagamentoVip(sock, dados),
                    onExpirado: () => {}
                });
            } catch (erro) {
                console.error("⚠️ Não consegui retomar cobranças Pix pendentes:", erro.message);
            }
        }

        // ── Conexão fechada ──
        if (connection === "close") {
            try { require("./src/site/site").definirStatus({ conectado: false }); } catch {}
            console.log("\n🔌 CONEXÃO INTERROMPIDA...");
            if (intervalRelatorioDiario) { clearInterval(intervalRelatorioDiario); intervalRelatorioDiario = null; }
            const codigoErro = lastDisconnect?.error?.output?.statusCode;
            const motivo = DisconnectReason[codigoErro] || "ERRO_DESCONHECIDO";
            console.log(`ℹ️ Motivo: ${motivo}`);

            if (aguardandoResposta?.clear) aguardandoResposta.clear();

            const podeReconectar = motivo !== DisconnectReason.loggedOut &&
                                   motivo !== DisconnectReason.badSession &&
                                   motivo !== DisconnectReason.unauthorized;

            if (podeReconectar) {
                console.log("🔄 REINICIANDO EM 3 SEGUNDOS...");
                setTimeout(() => startMikasaBot(modo, numeroCelular), 3000);
            } else {
                console.log("\n🚫 SESSÃO INVALIDADA! EXCLUA PASTA auth_info E REINICIE");
                process.exit(0);
            }
        }
    });

    anexarEventosBot(sock, saveCreds);
}

// ==================================================
// 🔌 ANEXA TODO O COMPORTAMENTO DO BOT A UM SOCK QUALQUER
// ==================================================
// Extraído da startMikasaBot pra poder ser reaproveitado em sessões extras
// (ver src/multisessao.js) — qualquer sock que passar por aqui passa a
// responder a TODOS os comandos, exatamente como o bot principal.
function anexarEventosBot(sock, saveCreds) {
    sock.ev.on("creds.update", saveCreds);
    groupEvents(sock);

    // 🗃️ Mantém o cache de metadados de grupo sempre atualizado
    sock.ev.on('groups.update', async ([evento]) => {
        try {
            const metadata = await sock.groupMetadata(evento.id);
            groupCache.set(evento.id, metadata);
        } catch {}
    });
    sock.ev.on('group-participants.update', async (evento) => {
        try {
            const metadata = await sock.groupMetadata(evento.id);
            groupCache.set(evento.id, metadata);
        } catch {}
    });
    sock.ev.on('group-participants.update', async (evento) => {
        try { await processarEntradaAutoban(sock, evento); } catch (e) { console.error("AutoBan entrada:", e?.message || e); }
    });


    // ==================================================
    // 💬 PROCESSAMENTO DE MENSAGENS — TUDO ORIGINAL
    // ==================================================
    sock.ev.on("messages.upsert", async ({ messages, type }) => {

        if (type !== "notify") return;

        const msg = messages[0];

        if (!msg.message) return;

        const from = msg.key.remoteJid;
        const isGroup = from.endsWith("@g.us");

        // 👤 Mensagem enviada pelo PRÓPRIO número do bot (ex.: o dono digitando no celular
        // onde o bot está conectado). Só vale se for COMANDO — e nunca eco do que o
        // bot mesmo mandou (isso viraria loop).
        if (msg.key.fromMe) {
            if (antiBot.ehEcoDoBot(msg)) return;
            const conteudoProprio = msg.message.conversation || msg.message.extendedTextMessage?.text || "";
            if (!String(conteudoProprio).trim().startsWith(config.PREFIX)) return;
            if (isGroup && !msg.key.participant && sock.user?.id) {
                msg.key.participant = String(sock.user.id).replace(/:\d+@/, "@");
            }
        } else if (isGroup) {
            // 🤖 Outro bot no grupo (mesmo prefixo, respondendo junto): ignora por completo.
            const donoDaMsg = ehDono([msg.key.participant, msg.key.participantAlt], config.OWNER_NUMBER);
            if (antiBot.ehOutroBot(msg, donoDaMsg)) return;
        }

        // 📢 STATUS: uma marcação de grupo chega em status@broadcast, não em @g.us.
        // Processamos antes do bloqueio de PV para encaminhar a ocorrência ao grupo marcado.
        if (from === "status@broadcast") {
            try { await processarStatusMencionado(sock, msg); } catch (e) { console.error("Status mention:", e?.message || e); }
            return;
        }

        // 🔇 PV — o bot simplesmente IGNORA qualquer mensagem privada de
        // quem não é o dono. Sem resposta, sem bloqueio automático — é
        // como se a mensagem nunca tivesse chegado.
        if (!isGroup) {
            const remetentePV = msg.key.participant || from;
            const candidatosBloqueio = [
                msg.key.participantAlt,
                msg.key.remoteJidAlt,
                remetentePV,
                from
            ].filter(Boolean).map(jid => {
                const valor = String(jid);
                return valor.endsWith("@c.us")
                    ? valor.replace("@c.us", "@s.whatsapp.net")
                    : valor;
            });
            const jidTelefone = candidatosBloqueio.find(jid =>
                /@s\.whatsapp\.net$/i.test(jid)
            );

            if (!ehDono([remetentePV, jidTelefone, from], config.OWNER_NUMBER)) {
                return; // ignora completamente — nenhuma resposta, nenhum bloqueio
            }
        }

        // 🎲 REAÇÃO AUTOMÁTICA: vem DESLIGADA. Só reage nos grupos onde um admin ligou
        // com <prefixo>reacao on (cada grupo é independente).
        try {
            if (!(isGroup && getDB()[from]?.reacao === true)) throw new Error("reacao-off");
            const reacoesGlobais = ["🔥", "❤️", "😂", "😍", "😎", "👏", "✨", "😮", "🤝", "💯", "🥰", "🤣"];
            const reacaoAleatoria = reacoesGlobais[Math.floor(Math.random() * reacoesGlobais.length)];
            await sock.sendMessage(from, { react: { text: reacaoAleatoria, key: msg.key } });
        } catch (e) {
            if (e?.message !== "reacao-off") console.error("⚠️ Falha ao reagir:", e?.message || e);
        }

      try { // 🛡️ tudo daqui pra baixo protegido — erro em 1 comando não derruba o bot

        // 🔑 PREFIXO DINÂMICO: alterações feitas no painel entram em vigor
        // na próxima mensagem, sem encerrar nem exigir reinicialização do processo.
        try {
            const dbConfigPath = path.join(__dirname, "database", "botconfig.json");
            if (fs.existsSync(dbConfigPath)) {
                const dbAtual = JSON.parse(fs.readFileSync(dbConfigPath, "utf8"));
                if (typeof dbAtual.PREFIX === "string" && dbAtual.PREFIX.trim()) config.PREFIX = dbAtual.PREFIX.trim();
            }
        } catch {}

        // 📥 PEGA CONTEÚDO
        let body = "";
        if (msg.message.conversation) body = msg.message.conversation;
        else if (msg.message.extendedTextMessage?.text) body = msg.message.extendedTextMessage.text;
        else if (msg.message.imageMessage?.caption) body = msg.message.imageMessage.caption;
        else if (msg.message.videoMessage?.caption) body = msg.message.videoMessage.caption;
        else if (msg.message.documentMessage?.caption) body = msg.message.documentMessage.caption;

        const lowerBody = body.toLowerCase().trim();

        // 🔘 FLUXO INTERATIVO DOS BOTÕES
        // Um botão pode selecionar um comando e pedir apenas o dado que falta.
        // O comando digitado tradicional continua funcionando normalmente.
        const pendenteBotao = getInteractivePending(msg);
        // 🗑️ Se a pessoa tocou em algo de APAGAR enquanto o bot esperava uma mídia
        // ("SUBIR OUTRO"), abandona essa espera — senão o toque seria engolido
        // pelo fluxo de upload e o apagar não funcionaria.
        if (pendenteBotao && String(extrairIdBotaoClicado(msg) || "").startsWith("cfg_del_")) {
            clearInteractivePending(msg);
        } else if (pendenteBotao) {
            try {
                clearInteractivePending(msg);
                if (pendenteBotao.tipo === "config-media") {
                    return await configurarBot(sock, msg, pendenteBotao.args || []);
                }
                if (pendenteBotao.tipo === "config-texto") {
                    const entrada = body.trim();
                    if (!entrada) return sock.sendMessage(from, { text: "❌ Envie o valor solicitado." }, { quoted: msg });
                    return await configurarBot(sock, msg, [...(pendenteBotao.args || []), ...entrada.split(/\s+/)]);
                }
                // Para comandos comuns, reutilizamos exatamente o roteador original.
                body = `${config.PREFIX}${pendenteBotao.command}${body ? " " + body.trim() : ""}`;
            } catch (e) {
                console.error("❌ Erro no fluxo interativo:", e?.message || e);
            }
        }

        // 🚀 SISTEMAS AVANÇADOS AUTOMÁTICOS
        if (isGroup) {
            try {
                if (await processarManutencao(sock, msg, body)) return;
                if (await processarMute(sock, msg)) return;
                await processarPrimeiraMensagem(sock, msg, body);
                await verificarAniversarios(sock, from);
            } catch (e) { console.error("Recursos avançados automáticos:", e?.message || e); }
        }

        // ==================================================
        // 🔌 LIGA/DESLIGA GERAL DO BOT
        // ==================================================
        // Enquanto desligado, o bot ignora TUDO — nenhum comando, nenhuma
        // resposta, nada. A única exceção é o próprio comando de ligar,
        // e só o número do dono pode usá-lo. Como isso acontece ANTES de
        // qualquer outro processamento, nada do que rolou enquanto estava
        // desligado é processado depois — o bot só volta a agir a partir
        // da primeira mensagem que chegar DEPOIS de ser ligado de novo.
        if (!estaLigado()) {
            const remetenteAtual = msg.key.participant || msg.key.remoteJid;
            const ehComandoLigar = lowerBody === `${config.PREFIX}ligar`.toLowerCase();
            if (ehComandoLigar && ehDono([remetenteAtual, from], config.OWNER_NUMBER)) {
                ligar();
                await sock.sendMessage(from, {
                    text: `🟢 *BOT LIGADO!*\n\nVoltando a atender todos os comandos normalmente.\n\n🤍 ${config.BOT_NAME}`
                }, { quoted: msg });
            }
            return; // desligado: ignora completamente qualquer outra coisa
        }

        // ==================================================
        // 💰 SISTEMA DE ALUGUEL — DESATIVADO. O bot agora responde
        // normalmente em qualquer grupo, sem precisar rodar ".alugar"
        // antes. (Bloco de bloqueio removido de propósito.)
        // ==================================================

        // 🔞 ANTI-PORNOGRAFIA — roda antes dos comandos para remover também
        // mídias sem legenda e não deixar que outro processamento as ignore.
        if (isGroup && await processarMidiaNSFW(sock, msg).catch(() => false)) return;

        // 🚫 LISTA NEGRA — apaga mensagens de números bloqueados
        if (isGroup && await processarBlacklist(sock, msg).catch(() => false)) return;

        // 🛡️ ANTI-PALAVRÃO — apaga e avisa quando o módulo estiver ativo
        if (isGroup && await processarAntiPalavrao(sock, msg, body).catch(() => false)) return;

        // 🎨 FIGURINHA AUTOMÁTICA — desligada por padrão e ativada por admin
        if (isGroup && await processarFigurinhaAutomatica(sock, msg).catch(() => false)) return;

        // 📢 Menções de grupo em Status são tratadas acima, em status@broadcast.

        // 📊 CONTADOR PARA O RELATÓRIO DIÁRIO (ver src/relatorio.js)
        if (isGroup) { try { registrarMensagemRelatorio(from, msg.key.participantAlt || msg.key.participant || msg.key.remoteJid, { body, msg }); } catch {} }

        // 🗑️ ANTI-DELETE — se for um aviso de mensagem apagada, trata e para por aqui
        const foiTratadoComoDelete = await verificarMensagemApagada(sock, msg).catch(() => false);
        if (foiTratadoComoDelete) return;
        cachearMensagem(msg).catch(() => {}); // guarda essa mensagem pro caso de ser apagada depois

        // 🕵️ X9 — se for visualização única e o X9 estiver ativo aqui, já intercepta
        const foiTratadoPeloX9 = await processarX9(sock, msg, from).catch(() => false);
        if (foiTratadoPeloX9) return;

        // 🔁 ANTI-LOOP — mensagem repetida 3x seguidas da mesma pessoa/bot
        if (body) {
            const remetenteRepeticao = msg.key.participant || msg.key.remoteJid;
            const { ignorar, avisar } = verificarRepeticao(from, remetenteRepeticao, body);
            if (avisar) {
                await sock.sendMessage(from, {
                    text: `🔁 Detectei uma mensagem se repetindo — isso tem cara de automatização/bot, então vou *ignorar* esse remetente por aqui até ele mandar algo diferente.`,
                    mentions: [remetenteRepeticao]
                }).catch(() => {});
                return;
            }
            if (ignorar) return;
        }

        // 🔁 ANTI-REPETIÇÃO: o bot já respondeu esse MESMO texto dessa MESMA pessoa há
        // pouco? Então não responde de novo (evita ping-pong entre bots e spam).
        const ehDonoMsg = !!msg.key.fromMe || ehDono([msg.key.participant, msg.key.participantAlt, isGroup ? null : from], config.OWNER_NUMBER);
        const repeticao = antiBot.ehRepeticao(msg, body, ehDonoMsg);
        antiBot.registrarEntrada(msg, body);

        // ☀️ SAUDAÇÕES AUTOMÁTICAS + PALAVRA "PREFIXO"
        // (só faz sentido checar isso em mensagens que NÃO são comando)
        if (!body.startsWith(config.PREFIX) && !repeticao) {
            // 💡 Comando do bot com prefixo errado (ex.: !menu em vez de /menu)
            try { if (await verificarPrefixoErrado(sock, msg, body)) return; } catch {}

            try {
                const foiSaudacao = await verificarSaudacao(sock, msg, body);
                if (foiSaudacao) return;
            } catch {}

            // 💘 ANTI-AMOR — palavra carinhosa → áudio marcando a pessoa
            try {
                const foiAntiAmor = await verificarAntiAmor(sock, msg, body);
                if (foiAntiAmor) return;
            } catch {}

            // 📋 MENU SEM PREFIXO — somente a palavra "menu"
            if (String(body).trim().toLowerCase() === "menu") {
                return menu(sock, from, { texto: true, quoted: msg });
            }

            if (/\bprefixo\b/i.test(body)) {
                try {
                    await enviarAudioDaPasta(sock, from, "prefixo", { quoted: msg });
                    await sock.sendMessage(from, {
                        text: `🔑 Meu prefixo aqui é: *${config.PREFIX}*`
                    }, { quoted: msg });
                } catch {}
                return;
            }
        }

        // 🔘 CLIQUE EM BOTÃO DO MENU (nativeFlowMessage)
        // Usa a MESMA extração de callback já existente; aqui apenas
        // direcionamos cada ID para o conteúdo correspondente.
        const idBotao = extrairIdBotaoClicado(msg);
        if (idBotao) {
            // 📋 LISTA NATIVA DO WHATSAPP — sem Próxima/Anterior.
            if (String(idBotao).startsWith("cat:")) {
                const nome = decodeURIComponent(String(idBotao).slice(4));

                if (nome === "🛡️ ADMIN") {
                    const autorAdmin = msg.key.participant || msg.key.participantAlt || from;
                    const admin = isGroup && await isAdmin(sock, from, autorAdmin).catch(() => false);
                    if (!admin) {
                        return sock.sendMessage(from, {
                            text: `🛡️ @${String(autorAdmin).split("@")[0]}\n\n❌ A área de ADMIN é exclusiva para administradores do grupo.`,
                            mentions: [autorAdmin]
                        }, { quoted: msg });
                    }
                }

                if (nome === "👑 DONO") {
                    const autorDono = msg.key.participant || msg.key.participantAlt || from;
                    if (!ehDono([autorDono, from], config.OWNER_NUMBER)) {
                        return sock.sendMessage(from, {
                            text: `👑 @${String(autorDono).split("@")[0]}\n\n❌ Esta área é exclusiva para o dono do bot.`,
                            mentions: [autorDono]
                        }, { quoted: msg });
                    }
                }

                return enviarListaCategoria(sock, from, msg, nome);
            }

            if (idBotao === "sub:configuracoes") {
                // CONFIGURAÇÕES abre diretamente o painel completo.
                // Não existe mais a sequência CONFIGURAÇÕES → CONFIGURAÇÕES.
                return configurarBot(sock, msg, []);
            }

            // ⚙️ ALTERAÇÕES DE IDENTIDADE — o clique pede somente o valor
            // necessário e o próximo texto é enviado ao mesmo handler
            // configurarBot(), preservando a lógica existente dos comandos.
            if (["cfg_prefixo", "cfg_nome", "cfg_criador", "cfg_numero"].includes(idBotao)) {
                const mapaConfig = {
                    cfg_prefixo: { args: ["prefixo"], texto: `🔑 *MUDAR PREFIXO*\n\nEnvie agora o novo prefixo.\nExemplo: *!* ou */*` },
                    cfg_nome: { args: ["nome"], texto: `🤖 *MUDAR NOME DO BOT*\n\nEnvie agora o novo nome do bot.` },
                    cfg_criador: { args: ["criador"], texto: `👑 *MUDAR NOME DO CRIADOR*\n\nEnvie agora o novo nome do criador.` },
                    cfg_numero: { args: ["numero"], texto: `📱 *MUDAR NÚMERO DO CRIADOR*\n\nEnvie agora o número completo com DDD e código do país.\nExemplo: *5516999999999*` }
                };
                const escolha = mapaConfig[idBotao];
                setInteractivePending(msg, { tipo: "config-texto", args: escolha.args });
                return sock.sendMessage(from, { text: escolha.texto }, { quoted: msg });
            }

            if (idBotao === "brincadeiras_ligar" || idBotao === "brincadeiras_desligar") {
                const autor = msg.key.participant || msg.key.participantAlt || from;
                const admin = isGroup && await isAdmin(sock, from, autor).catch(() => false);
                const autorizado = ehDono([autor, from], config.OWNER_NUMBER) || admin;
                if (!autorizado) {
                    return sock.sendMessage(from, {
                        text: `❌ @${String(autor).split("@")[0]}, somente o dono ou um administrador pode ativar/desativar as brincadeiras.`,
                        mentions: [autor]
                    }, { quoted: msg });
                }
                const ativa = idBotao === "brincadeiras_ligar";
                alterarBrincadeiras(ativa);
                return sock.sendMessage(from, {
                    text: ativa
                      ? `🟢 *BRINCADEIRAS ATIVADAS!*\n\n🎮 Os comandos de brincadeira estão liberados.`
                      : `🔴 *BRINCADEIRAS DESATIVADAS!*\n\n🎮 Os comandos de brincadeira ficarão bloqueados até serem ligados novamente.`
                }, { quoted: msg });
            }

            if (String(idBotao).startsWith("textcat:")) {
                const nome = decodeURIComponent(String(idBotao).slice(8));
                return enviarListaTexto(sock, from, msg, nome);
            }

            if (idBotao === "menu_lista_texto") return enviarListaTexto(sock, from, msg);

            // 🗑️ APAGAR ÁUDIO/GIF — listar, conferir e apagar sem abrir arquivo.
            if (String(idBotao).startsWith("cfg_del_")) {
                const { processarBotaoApagar } = require("./src/gerenciar-midia/gerenciar-midia");
                const tratado = await processarBotaoApagar(sock, msg, idBotao);
                if (tratado) return;
            }

            // ➕ SUBIR OUTRO — mantém a categoria selecionada e pede a próxima mídia.
            // Isso evita obrigar o usuário a voltar por toda a configuração.
            if (String(idBotao).startsWith("cfg_gif_outro:")) {
                const categoria = String(idBotao).slice("cfg_gif_outro:".length).toLowerCase();
                setInteractivePending(msg, { tipo: "config-media", args: ["subirgif", categoria] });
                return await sock.sendMessage(from, {
                    text: `🎬 *${categoria.toUpperCase()}*\n\n📤 Envie agora o próximo GIF/vídeo.\n\n💾 Ele será salvo automaticamente nesta mesma categoria.`,
                });
            }

            if (String(idBotao).startsWith("cfg_audio_outro:")) {
                const categoria = String(idBotao).slice("cfg_audio_outro:".length).toLowerCase();
                setInteractivePending(msg, { tipo: "config-media", args: ["subiraudio", categoria] });
                return await sock.sendMessage(from, {
                    text: `🎵 *${categoria.toUpperCase()}*\n\n📤 Envie agora o próximo áudio.\n\n💾 Ele será salvo automaticamente nesta mesma categoria.`,
                });
            }

            // 🖼️ FOTO DO MENU — imagem, GIF ou vídeo.
            if (idBotao === "cfg_upload_menu") {
                setInteractivePending(msg, { tipo: "config-media", args: ["foto"] });
                return await sock.sendMessage(from, {
                    text: `🖼️ *SUBIR FOTO DO MENU*\n\n📤 Envie agora uma *imagem, GIF ou vídeo*.\n\nA nova mídia substituirá a atual do menu automaticamente.`
                }, { quoted: msg });
            }

            // 🌌 FOTO DO FUNDO — imagem, GIF ou vídeo.
            if (idBotao === "cfg_upload_fundo") {
                setInteractivePending(msg, { tipo: "config-media", args: ["fundo"] });
                return await sock.sendMessage(from, {
                    text: `🌌 *SUBIR FOTO DO FUNDO*\n\n📤 Envie agora uma *imagem, GIF ou vídeo*.\n\nA nova mídia substituirá o fundo atual automaticamente.`
                }, { quoted: msg });
            }

            // 🎬 CONFIGURAÇÃO VISUAL DE GIFS — escolhe a categoria e espera a mídia.
            if (idBotao === "cfg_upload_gif") {
                return enviarListaWhatsApp(sock, from, {
                    text: `〔 🎬 SUBIR GIF 〕\n\nEscolha a categoria do GIF.\nDepois é só enviar ou marcar o GIF/vídeo.\n\n💾 O nome será criado automaticamente e nada anterior será apagado.`,
                    title: '🎬 CATEGORIA DO GIF',
                    sections: [{
                        title: 'INTERAÇÕES',
                        rows: [
                            { id: 'cfg_gif:matar', title: '💀 MATAR', description: 'GIFs do comando matar' },
                            { id: 'cfg_gif:tapa', title: '🖐️ TAPA', description: 'GIFs do comando tapa' },
                            { id: 'cfg_gif:chute', title: '🦵 CHUTE', description: 'GIFs do comando chute' },
                            { id: 'cfg_gif:beijar', title: '💋 BEIJAR', description: 'GIFs do comando beijar' },
                            { id: 'cfg_gif:abracar', title: '🫂 ABRAÇAR', description: 'GIFs do comando abraçar' }
                        ]
                    }],
                    quoted: msg
                });
            }

            if (idBotao === "cfg_upload_audio") {
                return enviarListaWhatsApp(sock, from, {
                    text: `〔 🎵 SUBIR ÁUDIO 〕\n\nEscolha onde esse áudio será usado.\nDepois é só enviar o arquivo de áudio.\n\n💾 O nome será criado automaticamente e os anteriores serão preservados.`,
                    title: '🎵 CATEGORIA DO ÁUDIO',
                    sections: [{
                        title: 'CATEGORIAS',
                        rows: [
                            { id: 'cfg_audio:menu', title: '🏠 MENU', description: 'Áudios do menu principal' },
                            { id: 'cfg_audio:menupv', title: '💬 MENU PV', description: 'Áudios do menu privado' },
                            { id: 'cfg_audio:entrada', title: '🟢 ENTRADA', description: 'Áudio de entrada' },
                            { id: 'cfg_audio:saida', title: '🔴 SAÍDA', description: 'Áudio de saída' },
                            { id: 'cfg_audio:prefixo', title: '🔑 PREFIXO', description: 'Áudio ao detectar prefixo' },
                            { id: 'cfg_audio:bomdia', title: '🌅 BOM DIA', description: 'Saudação de bom dia' },
                            { id: 'cfg_audio:boatarde', title: '☀️ BOA TARDE', description: 'Saudação de boa tarde' },
                            { id: 'cfg_audio:boanoite', title: '🌙 BOA NOITE', description: 'Saudação de boa noite' },
                            { id: 'cfg_audio:antiamor', title: '💘 ANTI-AMOR', description: 'Áudio p/ palavras carinhosas' }
                        ]
                    }],
                    quoted: msg
                });
            }

            if (String(idBotao).startsWith("cfg_gif:")) {
                const categoria = String(idBotao).slice(8).toLowerCase();
                setInteractivePending(msg, { tipo: "config-media", args: ["subirgif", categoria] });
                return sock.sendMessage(from, {
                    text: `🎬 *${categoria.toUpperCase()}* selecionado.\n\nAgora envie ou marque o GIF/vídeo que deseja cadastrar.\n\n💾 O bot vai salvar automaticamente e gerar o nome do arquivo.`
                }, { quoted: msg });
            }

            if (String(idBotao).startsWith("cfg_audio:")) {
                const categoria = String(idBotao).slice(10).toLowerCase();
                setInteractivePending(msg, { tipo: "config-media", args: ["subiraudio", categoria] });
                return sock.sendMessage(from, {
                    text: `🎵 *${categoria.toUpperCase()}* selecionado.\n\nAgora envie o áudio que deseja cadastrar.\n\n💾 O bot vai salvar automaticamente e gerar o nome do arquivo.`
                }, { quoted: msg });
            }

            if (String(idBotao).startsWith("cmd:")) {
                const commandSelecionado = String(idBotao).slice(4).toLowerCase();
                const comandosComEntrada = comandoPrecisaEntrada(commandSelecionado);
                if (commandSelecionado === "configurar-bot") {
                    // O botão CONFIGURAÇÕES abre o painel visual imediatamente.
                    // Não transforma o clique em um prompt de texto.
                    return configurarBot(sock, msg, []);
                }
                if (comandosComEntrada) {
                    setInteractivePending(msg, { command: commandSelecionado });
                    return sock.sendMessage(from, { text: textoPrompt(commandSelecionado) }, { quoted: msg });
                }
                // Sem parâmetros: deixa o switch original executar o comando.
                body = `${config.PREFIX}${commandSelecionado}`;
            }

            // 🎲 MÚSICA ALEATÓRIA — categorias e artistas.
            if (String(idBotao).startsWith("musica_random_") || idBotao === "musica_random_menu") {
                const { processarMusicaAleatoriaBotao } = require("./src/musica/musica");
                const processado = await processarMusicaAleatoriaBotao(sock, msg, idBotao);
                if (processado) return;
            }

            // 🏘️ ALUGUEL — a pessoa escolheu um plano na lista.
            if (String(idBotao).startsWith("vip_plano:")) {
                const { processarEscolhaVip } = require("./src/aluguel-menu/aluguel-menu");
                const processado = await processarEscolhaVip(sock, msg, idBotao);
                if (processado) return;
            }

            // 🎵 /play — o callback carrega o token do resultado pesquisado.
            if (String(idBotao).startsWith("play_")) {
                const processado = await processarEscolhaPlay(sock, msg, idBotao);
                if (processado) return;
            }

            switch (idBotao) {
                case "zoar_dono":
                    return sendZoeiraDono(sock, from, msg);

                case "vip_planos": {
                    const { enviarPlanosVip } = require("./src/aluguel-menu/aluguel-menu");
                    return enviarPlanosVip(sock, from, msg);
                }

                case "menu_home":
                    return sendMenuBotoes(sock, from);

                case "menu_principal":
                    return sendMenuLista(sock, from, msg);

                case "menu_lista":
                    return sendMenuLista(sock, from, msg);

                case "menu_midias":
                case "menu_downloads":
                    await menumidias(sock, msg);
                    return enviarBotoesNavegacao(sock, from, {
                        text: "〔 ↩️ NAVEGAÇÃO 〕",
                        quoted: msg,
                        buttons: [
                            { text: "↩️ VOLTAR", id: "menu_home" },
                            { text: "📋 LISTA", id: "menu_lista" },
                            { text: "🏠 PRINCIPAL", id: "menu_principal" }
                        ]
                    });

                case "menu_admin":
                    await menuadm(sock, msg);
                    return enviarBotoesNavegacao(sock, from, {
                        text: "〔 ↩️ NAVEGAÇÃO ADMIN 〕",
                        quoted: msg,
                        buttons: [
                            { text: "↩️ VOLTAR", id: "menu_lista" },
                            { text: "🏠 PRINCIPAL", id: "menu_principal" }
                        ]
                    });

                case "menu_dono":
                    await sendMenuDonoContato(sock, from, msg);
                    return enviarBotoesNavegacao(sock, from, {
                        text: "〔 ↩️ NAVEGAÇÃO 〕",
                        quoted: msg,
                        buttons: [
                            { text: "↩️ VOLTAR", id: "menu_home" },
                            { text: "📋 LISTA", id: "menu_lista" }
                        ]
                    });

                case "menu_canal":
                    return sendMenuCanal(sock, from, msg);

                case "menu_extras": {
                    const { linkFalarComCriador } = require("./src/menuBotoes/menuBotoes");
                    const linkCanal = config.CHANNEL_URL;
                    const linkCriador = linkFalarComCriador();
                    return enviarNativeFlow(sock, from, {
                        text: `〔 📢 LINKS DIRETOS 〕\n\nEscolha um destino. O clique abre diretamente, sem menu intermediário.`,
                        footer: config.BOT_NAME,
                        quoted: msg,
                        buttons: [
                            ...(linkCanal ? [{ name: "cta_url", buttonParamsJson: JSON.stringify({ display_text: "📢 ENTRAR NO CANAL", url: linkCanal }) }] : []),
                            ...(linkCriador ? [{ name: "cta_url", buttonParamsJson: JSON.stringify({ display_text: "💬 FALAR COM O CRIADOR", url: linkCriador }) }] : [])
                        ]
                    });
                }

                case "menu_musica":
                    return sock.sendMessage(from, {
                        text: `🎵 Para pesquisar uma música:\n*${config.PREFIX}play nome da música*`
                    }, { quoted: msg });

                case "menu_video":
                    return sock.sendMessage(from, {
                        text: `🎬 Para pesquisar e baixar vídeo:\n*${config.PREFIX}play nome do vídeo*`
                    }, { quoted: msg });

                case "menu_fig":
                    return sock.sendMessage(from, {
                        text: `🎨 Para figurinha, responda uma imagem/vídeo e use:\n*${config.PREFIX}s*\n\nPara converter em GIF/vídeo:\n*${config.PREFIX}f* ou *${config.PREFIX}gif*`
                    }, { quoted: msg });

                case "menu_brincadeiras": {
                    const { brincadeiras } = require("./src/brincadeiras/brincadeiras");
const { estaAtiva: brincadeirasAtivas, alterarAtivacao: alterarBrincadeiras, ehBrincadeira } = require("./src/brincadeiras-control/brincadeiras-control");
                    await brincadeiras(sock, msg);
                    return enviarBotoesNavegacao(sock, from, {
                        text: "〔 ↩️ NAVEGAÇÃO 〕",
                        quoted: msg,
                        buttons: [
                            { text: "↩️ VOLTAR", id: "menu_lista" },
                            { text: "🏠 PRINCIPAL", id: "menu_principal" }
                        ]
                    });
                }

                case "menu_membros":
                    return enviarMenuCategoria(sock, from, msg, "👥 MEMBROS", `
🌸 ${config.PREFIX}registrar
🌸 ${config.PREFIX}delregistro
🌸 ${config.PREFIX}perfil
🌸 ${config.PREFIX}inforegistrar
🌸 ${config.PREFIX}infoperfil
🌸 ${config.PREFIX}advertidos
🌸 ${config.PREFIX}mutados
🌸 ${config.PREFIX}infoadv
🌸 ${config.PREFIX}infomute
🌸 ${config.PREFIX}infobot
🌸 ${config.PREFIX}bug
🌸 ${config.PREFIX}sugestao
🌸 ${config.PREFIX}avalie
🌸 ${config.PREFIX}reagir
🌸 ${config.PREFIX}adms
🌸 ${config.PREFIX}convite
🌸 ${config.PREFIX}forca
🌸 ${config.PREFIX}adivinha
🌸 ${config.PREFIX}quiz
🌸 ${config.PREFIX}jogodavelha
🌸 ${config.PREFIX}aleatory
🌸 ${config.PREFIX}resumo
🌸 ${config.PREFIX}historico
🌸 ${config.PREFIX}conquistas
🌸 ${config.PREFIX}botstatus`);

                case "menu_economia":
                    return enviarMenuCategoria(sock, from, msg, "💰 ECONOMIA / GOLD", `
🌸 ${config.PREFIX}gold
🌸 ${config.PREFIX}saldo
🌸 ${config.PREFIX}moedas
🌸 ${config.PREFIX}checkin
🌸 ${config.PREFIX}daily
🌸 ${config.PREFIX}trabalhar
🌸 ${config.PREFIX}roubar @pessoa
🌸 ${config.PREFIX}bonus
🌸 ${config.PREFIX}transferir @pessoa <gold>
🌸 ${config.PREFIX}depositar <gold>
🌸 ${config.PREFIX}sacar <gold>
🌸 ${config.PREFIX}extrato
🌸 ${config.PREFIX}inventario
🌸 ${config.PREFIX}presente @pessoa
🌸 ${config.PREFIX}topgold
🌸 ${config.PREFIX}topxp
🌸 ${config.PREFIX}topamizade
🌸 ${config.PREFIX}xp
🌸 ${config.PREFIX}nivel`);

                case "menu_infos":
                    return enviarMenuCategoria(sock, from, msg, "📚 INFOS", `
🌸 ${config.PREFIX}rank
🌸 ${config.PREFIX}tabela
🌸 ${config.PREFIX}rankativo
🌸 ${config.PREFIX}rankinativos
🌸 ${config.PREFIX}atividades
🌸 ${config.PREFIX}moedas
🌸 ${config.PREFIX}esporte_noticias
🌸 ${config.PREFIX}celular (ex: Xiaomi)
🌸 ${config.PREFIX}tempo (cidade)`);

                case "menu_comandos":
                    return enviarMenuCategoria(sock, from, msg, "⚡ COMANDOS", `
🌸 ${config.PREFIX}gtts (idioma+texto)
🌸 ${config.PREFIX}artenome (nome na foto)
🌸 ${config.PREFIX}artenomegif (nome animado na foto)
🌸 ${config.PREFIX}meme (busca meme por descrição)
🌸 ${config.PREFIX}tomp3
🌸 ${config.PREFIX}gif / f / toimg
🌸 ${config.PREFIX}s / sticker / figurinha
🌸 ${config.PREFIX}roubar
🌸 ${config.PREFIX}signo
🌸 ${config.PREFIX}casal
🌸 ${config.PREFIX}saldo
🌸 ${config.PREFIX}loja
🌸 ${config.PREFIX}duelo
🌸 ${config.PREFIX}roleta
🌸 ${config.PREFIX}play / musica
🌸 ${config.PREFIX}sortear
🌸 ${config.PREFIX}spam
🌸 ${config.PREFIX}resgatar
🌸 ${config.PREFIX}mediafire`);

                case "menu_moderacao":
                    return enviarMenuCategoria(sock, from, msg, "🛡️ MODERAÇÃO AVANÇADA", `
🌸 ${config.PREFIX}warn @pessoa
🌸 ${config.PREFIX}unwarn @pessoa
🌸 ${config.PREFIX}autoban 1/0
🌸 ${config.PREFIX}mute @pessoa
🌸 ${config.PREFIX}unmute @pessoa
🌸 ${config.PREFIX}manutencao 1/0
🌸 ${config.PREFIX}backup
🌸 ${config.PREFIX}configaniversario <mensagem>
🌸 ${config.PREFIX}conquistas
🌸 ${config.PREFIX}botstatus
🌸 ${config.PREFIX}restart (dono)
🌸 ${config.PREFIX}broadcast <mensagem> (dono)`);

                default:
                    // cmd:* já preparou "body" acima. Não encerre aqui:
                    // deixe o roteador normal executar o comando selecionado.
                    if (String(idBotao).startsWith("cmd:")) break;
                    return;
            }
        }

        // ✅ COMANDOS
        if (body.startsWith(config.PREFIX)) {
            if (repeticao) return; // mesmo comando, mesma pessoa, já respondido há pouco

            const args = body.slice(config.PREFIX.length).trim().split(/ +/);
            const command = args.shift().toLowerCase();

            // 📢 DISPAROS
            const comandosEnvio = { tra: msgTra, bu: msgBu, kill: msgKill, gp: msgGp };
            if (comandosEnvio[command]) {
                const texto = comandosEnvio[command];
                if (args.length < 2) return sock.sendMessage(from, { text: `╭━⚠️━━━━━━━━━━━━⚠️━╮\n❌ *USO INCORRETO*\n╰━━━━━━━━━━━━━━━━━━━╯\nEx: ${config.PREFIX}${command} 5511999999999 5` }, { quoted: msg });

                const numero = args[0].replace(/[^0-9]/g, "");
                const qtd = parseInt(args[1]);
                if (!numero || isNaN(qtd) || qtd < 1 || qtd > 20) return;

                const jidAlvo = `${numero}@s.whatsapp.net`;
                try {
                    for (let i = 0; i < qtd; i++) {
                        await sock.sendMessage(jidAlvo, { text: texto });
                        await new Promise(r => setTimeout(r, 600));
                    }
                } catch {}
                return;
            }

            const comandosConhecidos = new Set([
                ...extrairComandosDoBot(),
                "menu", "menubotoes", "menudono", "menuadm", "menupremium", "menugold", "menumidias", "menubrinquedos",
                "configuração", "configuracao", "config", "configglobal", "statusbot"
            ]);

            if (!comandosConhecidos.has(command)) {
                const autorComando = msg.key.participant || msg.key.participantAlt || from;
                return sock.sendMessage(from, {
                    text: `❌ @${String(autorComando).split("@")[0]}, o comando *${config.PREFIX}${command}* não foi encontrado.\n\n📋 Use *${config.PREFIX}menu* para visualizar os comandos disponíveis.`,
                    mentions: [autorComando]
                }, { quoted: msg });
            }

            if (ehBrincadeira(command) && !brincadeirasAtivas()) {
                const autorBrincadeira = msg.key.participant || msg.key.participantAlt || from;
                return sock.sendMessage(from, {
                    text: `🎮 @${String(autorBrincadeira).split("@")[0]}\n\n🔴 As brincadeiras estão desativadas neste momento.\n\nUm administrador pode abrir *${config.PREFIX}menu* → *BRINCADEIRAS* → *🟢 LIGAR BRINCADEIRAS*.`,
                    mentions: [autorBrincadeira]
                }, { quoted: msg });
            }

            // 📜 LISTA DE COMANDOS
            // 💡 Digitou o comando errado? Sugere o parecido.
            try { if (await sugerirComandoParecido(sock, msg, command)) return; } catch {}

            switch (command) {
                case "menu": return sendMenuLista(sock, from, msg);
                case "menubotoes": return sendMenuLista(sock, from, msg);
                case "matar":
                case "tapa":
                case "chute":
                case "beijar":
                case "abracar":
                    return interacao(sock, from, msg, command, args);
                case "ping": return ping(sock, msg);
                case "configurar-bot": case "configuracao": case "configuração": case "config": case "configglobal": return configurarBot(sock, msg, args);
                case "ativar": return ativar(sock, msg);
                case "antinsfw": {
                    const remetenteAnti = msg.key.participant || msg.key.remoteJid;
                    const adminAnti = !isGroup || await isAdmin(sock, from, remetenteAnti).catch(() => false);
                    return sock.sendMessage(from, { text: gerenciarAntiNSFW(from, adminAnti) }, { quoted: msg });
                }
                case "meuid": return meuId(sock, msg);
                case "vip": case "meuvip": case "meualuguel": case "aluguel": { const { statusVip } = require("./src/aluguel-menu/aluguel-menu"); return statusVip(sock, msg); }
                case "comprarvip": case "vipplanos": case "adquirirvip": case "alugarbot": case "planosaluguel": { const { enviarPlanosVip } = require("./src/aluguel-menu/aluguel-menu"); return enviarPlanosVip(sock, from, msg); }
                case "ligar": return sock.sendMessage(from, { text: `🟢 Já tô ligado! Pra desligar: *${config.PREFIX}desligar*` }, { quoted: msg });
                case "desligar": {
                    const remetenteAtual = msg.key.participant || msg.key.remoteJid;
                    if (!ehDono([remetenteAtual, from], config.OWNER_NUMBER)) {
                        return sock.sendMessage(from, { text: "🚫 Só o dono do bot pode desligar ele." }, { quoted: msg });
                    }
                    desligar();
                    return sock.sendMessage(from, {
                        text: `🔴 *BOT DESLIGADO*\n\nNão vou responder mais nada até alguém me ligar de novo com *${config.PREFIX}ligar*.\n\n🤍 ${config.BOT_NAME}`
                    }, { quoted: msg });
                }
                case "ia": case "inteligencia": return sock.sendMessage(from, { text: gerenciarModoIA(from) }, { quoted: msg });
                case "x9": return sock.sendMessage(from, { text: gerenciarX9(from) }, { quoted: msg });
                case "viewonce": case "vo": return sock.sendMessage(from, { text: gerenciarViewOnce(from) }, { quoted: msg });
                case "boot": return bootHandler(sock, msg, body.slice(config.PREFIX.length + command.length).trim() || body);
                case "musica-aleatoria": { const { menuMusicaAleatoria } = require("./src/musica/musica"); return menuMusicaAleatoria(sock, msg); }
                case "play": case "musica": return baixarMusica(sock, msg, args);
                case "dvcl-yt": return baixarMusica(sock, msg, ["mp3", ...(args || [])]);
                case "video": case "baixarvideo": case "tiktok": case "instagram": case "kwai": return baixarMusica(sock, msg, ["mp4", ...(args || [])]);
                case "gtts": return gtts(sock, msg, args);
                case "voz": case "efeitovoz": case "masculino": case "feminino": case "crianca": case "bebe": case "idoso": case "gigante": case "esquilo": case "grave": case "demonio": case "caverna": case "banheiro": case "igreja": case "estadio": case "tunel": case "agua": case "megafone": case "walkie": case "telefone": case "eco": case "radio": case "alien": case "fantasma": case "bebado": case "8bit": case "distorcao": case "reverso": case "coral": case "dueto": case "robo": case "vaporwave": case "nightcore": case "rapido": case "lento": return voz(sock, msg, command, args);
                case "tomp3": return tomp3(sock, msg, args);
                case "s": case "sticker": case "figurinha": return criarFigurinha(sock, msg);
                case "addfigurinha": case "mikasa-fig": return addfigurinha(sock, msg, args);
                case "gif": case "f": return converterParaGif(sock, msg, "gif");
                case "toimg": return converterParaGif(sock, msg, "imagem");
                case "efeitos": return efeitos(sock, msg, args);
                case "logos": return logos(sock, msg, args);
                case "registrar": return registrar(sock, msg, args);
                case "delregistro": return delregistro(sock, msg, args);
                case "perfil": return perfil(sock, msg, args);
                case "inforegistrar": return inforegistrar(sock, msg);
                case "infoperfil": return infoperfil(sock, msg);
                case "saldo": return saldo(sock, msg);
                case "moedas": return moedas(sock, msg);
                case "gold": case "checkin": case "daily": case "trabalhar": case "checkinauto": case "checkin-auto": return cmdEconomia(sock, msg, command, args);
                case "roubar": return (msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0]) ? cmdEconomia(sock, msg, command, args) : roubar(sock, msg, args);
                case "transferir": case "depositar": case "sacar": case "extrato": return cmdBanco(sock, msg, command, args);
                case "inventario": return cmdInventario(sock, msg);
                case "bonus": case "premio": return cmdBonus(sock, msg, command);
                case "xp": case "nivel": return cmdXpNivel(sock, msg, command);
                case "loja": return loja(sock, msg);
                case "duelo": return duelo(sock, msg, args);
                case "resgatar": case "token": return resgatar(sock, msg, args);
                case "gastar": return gastar(sock, msg, args);
                case "spam": return spam(sock, msg, args);
                case "casal": return formarCasal(sock, msg);
                case "amizade": case "compatibilidade": case "dupla": case "familia": case "familias": case "casamento": case "meucasal": case "divorcio": return cmdSocial(sock, msg, command, args);
                case "topgold": case "topxp": return cmdRank(sock, msg, command);
                case "topamizade": case "topcasais": return cmdTopSocial(sock, msg, command);
                case "enquete": case "esquete": case "poll": return enquete(sock, msg, command, args);
                case "mute": case "unmute": return cmdMute(sock, msg, command);
                case "presente": case "presentes": return command === "presentes" ? cmdInventario(sock, msg) : cmdPresentes(sock, msg, args);
                case "missoes": case "missao": return cmdMissoes(sock, msg, command);
                case "warn": case "unwarn": return cmdPunição(sock, msg, command, args);
                case "autoban": return cmdAutoban(sock, msg, args);
                case "configaniversario": return cmdConfigAvancada(sock, msg, ["aniversario", ...args]);
                case "configaniversario-reset": return cmdConfigAvancada(sock, msg, ["aniversario-reset"]);
                case "backup": return cmdBackup(sock, msg);
                case "conquistas": return cmdConquistas(sock, msg);
                case "botstatus": case "statusbot": return cmdBotStatus(sock, msg);
                case "broadcast": return cmdBroadcast(sock, msg, args);
                case "restart": { const uid=remetente(msg); if(String(uid).split("@")[0]!==String(config.OWNER_NUMBER).replace(/\D/g,"")) return sock.sendMessage(from,{text:"🚫 Apenas o dono pode reiniciar o bot."},{quoted:msg}); await sock.sendMessage(from,{text:`🔄 Reiniciando ${config.BOT_NAME}...`},{quoted:msg}); setTimeout(()=>{ try { sock.ws?.close(); } catch { try { process.kill(process.pid, "SIGTERM"); } catch {} } },1000); return; }
                case "manutencao": case "modo": return cmdMaintenance(sock, msg, args);
                case "historico": return cmdHistorico(sock, msg);
                case "mediafire": case "media-fire": return cmdMediaFire(sock, msg, args);
                case "familias": return cmdSocial(sock, msg, command, args);
                case "sortear": return sortear(sock, msg, args);
                case "roleta": await roleta(sock, msg, args); return;
                case "rank": return rank(sock, msg, args);
                case "signo":
                    if (!args.length) return sock.sendMessage(from, { text: `✨ *ERRO:* Ex: ${config.PREFIX}signo Áries` }, { quoted: msg });
                    return Cassi.getHoroscope(sock, from, msg, args[0]);
                case "marcar": case "hidetag": case "citar": case "cita": return grupoHandler(sock, msg, command, args);
                case "level": case "reacao": case "reação": return ativacoes(sock, msg, command, args);
                case "site": return require("./src/site/site").comandoSite(sock, msg, args);
                case "regras": case "grupo": case "convite": return grupoHandler(sock, msg, command, args);
                case "promover": case "rebaixar": return grupoHandler(sock, msg, command, args);
                case "antilink": return grupoHandler(sock, msg, command, args);
                case "antinota": return grupoHandler(sock, msg, command, args);
                case "antinudes": return grupoHandler(sock, msg, command, args);
                case "antifake": { if (!(await exigirAdmin(sock, msg, from))) return; return antifake(sock, msg, args); }
                case "ban": case "kick": return grupoHandler(sock, msg, command, args);
                case "abrir": case "fechar": return grupoHandler(sock, msg, command, args);
                case "aviso": { if (!(await exigirAdmin(sock, msg, from))) return; return aviso(sock, msg, args); }
                case "bemvindo": case "sair": case "saudacao": case "antiamor": case "aceitar": case "mencao": return grupoHandler(sock, msg, command, args);
                case "limpar": return limpar(sock, msg);
                case "membros": {
                    if (!isGroup) return sock.sendMessage(from, { text: "👥 Esse comando só funciona em grupos." }, { quoted: msg });
                    try {
                        const meta = await sock.groupMetadata(from);
                        const participantes = meta?.participants || [];
                        const mencoes = participantes.map(p => p.id).filter(Boolean);
                        const linhas = participantes.map((p, i) => {
                            const jid = p.id || p.lid || '';
                            const numero = String(jid).split('@')[0];
                            const cargo = p.admin ? (p.admin === 'superadmin' ? ' 👑' : ' 🛡️') : '';
                            return `${i + 1}. @${numero}${cargo}`;
                        });
                        return sock.sendMessage(from, {
                            text: `👥 *MEMBROS DO GRUPO*\n\n🏷️ *${meta.subject || 'Grupo'}*\n📊 Total: *${participantes.length}* membros\n🛡️ Administradores: *${participantes.filter(p => !!p.admin).length}*\n\n${linhas.join('\n') || 'Nenhum membro encontrado.'}`,
                            mentions: mencoes
                        }, { quoted: msg });
                    } catch (e) {
                        console.error('Erro membros:', e);
                        return sock.sendMessage(from, { text: "❌ Não consegui consultar os membros agora." }, { quoted: msg });
                    }
                }
                case "adms": return grupoHandler(sock, msg, command, args);
                case "advertidos": return advertidos(sock, msg);
                case "mutados": return mutados(sock, msg);
                case "infoadv": return infoadv(sock, msg);
                case "infomute": return infomute(sock, msg);
                case "menudono": return menudono(sock, msg);
                case "menuadm": return menuadm(sock, msg);
                case "menupremium": return menupremium(sock, msg);
                case "alugar": return alugar(sock, msg, args);
                case "meme": return meme(sock, msg, args);
                case "artenome": return artenome(sock, msg, args);
                case "artenomegif": return artenomegif(sock, msg, args);
                case "menugold": return menugold(sock, msg);
                case "menumidias": return menumidias(sock, msg);
                case "brincadeiras": case "menubrinquedos": return brincadeiras(sock, msg);
                case "forca": return forca(sock, from, msg, args);
                case "adivinha": return adivinha(sock, from, msg, args);
                case "quiz": return quiz(sock, from, msg, args);
                case "jogodavelha": return jogodavelha(sock, msg, args);
                case "aleatory": return aleatory(sock, msg);
                case "infobot": return infobot(sock, msg);
                case "bug": return bug(sock, msg);
                case "sugestao": return sugestao(sock, msg);
                case "avalie": return avalie(sock, msg);
                case "reagir": return reagir(sock, msg);
                case "tempo": { const temAlvo = !!(msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0] || msg.message?.extendedTextMessage?.contextInfo?.participant); return temAlvo ? tempoGrupo(sock, msg) : tempo(sock, msg, args); }
                case "celular": return celular(sock, msg, args);
                case "resumo": return resumo(sock, msg);
                case "top10": return topAtivos(sock, msg);
                case "rankativo": return topAtivos(sock, msg);
                case "relatorio": case "relatoriodiario": return toggleRelatorio(sock, msg);
                case "antipalavrao": case "dvcl-antipalavrao": case "dvcl-auto": case "dvcl1": case "dvcl0": case "lista": case "listra": case "blacklist": case "dvcl-lista": case "tirarlista": case "removerlista": case "delblacklist": case "add": case "mikasa-add": case "modulos": case "limparbot": case "logban": case "historico-ban": return comandosAdmin(sock, msg, command, args);
                case "atividades": case "atividade": case "calc": case "calculadora": case "base64": case "md5": case "hashmd5": case "spoiler": case "encurtar": case "encurtador": case "encurtarlink": case "wiki": case "traduzir": case "tradutor": case "qrcode": case "qr": case "qr-code": case "dvcl-prt": case "dvcl-ptr": case "pinterest": case "caca": case "caça": case "daily": case "me": case "tang": return comandosUtil(sock, msg, command, args);
                case "esporte_noticias": return esporte_noticias(sock, msg);
                case "info": return grupoHandler(sock, msg, "info", args);
            }

            return;
        }

        // 🔑 PALAVRA "PREFIXO" — sempre responde, não importa como a pessoa escreveu
        // (maiúscula, minúscula, com ou sem acento), avisando qual o prefixo do bot
        if (!repeticao && normalizarTexto(body).includes("prefixo")) {
            await sock.sendMessage(from, {
                text: `❀────────────────────❀\n   🔑 PREFIXO DO BOT\n❀────────────────────❀\n\nMeu prefixo atual é: *${config.PREFIX}*\nExemplo de uso: *${config.PREFIX}menu*\n\n❀────────────────────❀\n🤖 ${config.BOT_NAME}\n❀────────────────────❀`
            }, { quoted: msg });
            return;
        }

        // ✅ INTELIGÊNCIA ARTIFICIAL (respostas naturais, sem palavra-chave)
        const botId = sock.user?.id || "0@c.us";
        if (!repeticao) {
            const iaRespondeu = await processarIA(sock, msg, from, botId);
            if (iaRespondeu) return;
        }

        // 🎴 FIGURINHAS SALVAS
        const pastaStickers = path.join(__dirname, "src/midias/stickers");
        if (!repeticao && fs.existsSync(pastaStickers)) {
            for (const arquivo of fs.readdirSync(pastaStickers)) {
                const nome = arquivo.split(".")[0].toLowerCase().trim();
                if (nome && lowerBody === nome) {
                    const buffer = fs.readFileSync(path.join(pastaStickers, arquivo));
                    return sock.sendMessage(from, { sticker: buffer }, { quoted: msg });
                }
            }
        }

        // 👥 REGRAS E XP
        if (isGroup) {
            try { await verificarAntis(sock, msg); await processLevel(sock, msg); } catch {}
        }

        // 🎴 FIGURINHA AUTOMÁTICA NO GRUPO — já é tratada lá em cima, perto do
        // início (bloco "FIGURINHA AUTOMÁTICA", que chama processarFigurinhaAutomatica).
        // Esse bloco daqui foi removido porque convertia a mídia em figurinha
        // sempre, ignorando o interruptor .dvcl1/.dvcl0 do grupo.
      } catch (erroComando) {
        // Isso é o que faz um comando com bug apenas FALHAR (com log no
        // console), em vez de reiniciar o bot inteiro.
        console.error("⚠️ Erro ao processar mensagem/comando (bot continua rodando normalmente):", erroComando);
      }
    });
}

// 🚀 INICIA TUDO!
iniciarSistema();
