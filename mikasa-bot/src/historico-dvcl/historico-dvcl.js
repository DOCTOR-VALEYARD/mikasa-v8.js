const fs = require("fs");

module.exports.historicoDVCL = async function(sock, msg) {

const from = msg.key.remoteJid;
const caminho = __dirname + "/../dados/historico-spam.json";

if (!fs.existsSync(caminho)) {
return sock.sendMessage(from,{ text:"📜 Nenhum histórico encontrado." },{ quoted: msg });
}

const dados = JSON.parse(fs.readFileSync(caminho));

if (dados.length === 0) {
return sock.sendMessage(from,{ text:"📜 Nenhum spam registrado ainda." },{ quoted: msg });
}

let texto = "╭━━━〔 📜 HISTÓRICO SPAM \n\n";

dados.slice(-20).reverse().forEach((item,i)=>{

texto += `${i+1}️⃣ Número: ${item.numero}
📅 Data: ${item.data}
⏰ Hora: ${item.hora}
🔢 Quantidade: ${item.quantidade}

`;

});

texto += "╰━━━━━━━━━━━━━━━━━━━";

await sock.sendMessage(from,{ text: texto },{ quoted: msg });

}