const config = require('../../config');

async function brincadeiras(sock, msg) {
  const from = msg.key.remoteJid;
  const p = config.PREFIX;
  const resp = `🌸┈┈┈┈┈┈┈┈┈┈🌸
      🎭 *BRINCADEIRAS*
🌸┈┈┈┈┈┈┈┈┈┈🌸

🎲 *INTERAÇÕES*
🌸 ${p}tapa @pessoa
🌸 ${p}matar @pessoa
🌸 ${p}beijar @pessoa
🌸 ${p}abracar @pessoa
🌸 ${p}amizade @pessoa
🌸 ${p}compatibilidade @pessoa
🌸 ${p}dupla @pessoa

💞 *RELACIONAMENTOS*
🌸 ${p}familia [@pessoas] [data]
🌸 ${p}familias
🌸 ${p}casamento @pessoa [data]
🌸 ${p}meucasal
🌸 ${p}divorcio @pessoa
🌸 ${p}topcasais

📊 *ENQUETES*
🌸 ${p}enquete
🌸 ${p}enquete <pergunta>

🎯 *MISSÕES & CONQUISTAS*
🌸 ${p}missao
🌸 ${p}missoes
🌸 ${p}conquistas
🌸 ${p}xp
🌸 ${p}nivel
🌸 ${p}topxp

💰 *GOLD*
🌸 ${p}checkin
🌸 ${p}trabalhar
🌸 ${p}roubar @pessoa
🌸 ${p}bonus
🌸 ${p}transferir @pessoa <gold>
🌸 ${p}presente @pessoa <presente>
🌸 ${p}inventario
🌸 ${p}topgold

🌷 ${config.BOT_NAME} • diversão, resenha e sistema social 🌷`;
  await sock.sendMessage(from, { text: resp }, { quoted: msg });
}
module.exports = { brincadeiras };
