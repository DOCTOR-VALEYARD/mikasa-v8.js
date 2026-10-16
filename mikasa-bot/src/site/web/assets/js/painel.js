/* 🔧 Painel do dono: login, visão geral, visitas, erros, downloads, sites, mensagens, bot, conta */
(() => {
  "use strict";
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];

  // cria elementos sem innerHTML (tudo que vem do servidor entra como TEXTO → sem XSS)
  function h(tag, props, ...filhos) {
    const e = document.createElement(tag);
    for (const [k, v] of Object.entries(props || {})) {
      if (v === false || v == null) continue;
      if (k === "class") e.className = v;
      else if (k.startsWith("on")) e.addEventListener(k.slice(2), v);
      else if (v === true) e.setAttribute(k, "");
      else e.setAttribute(k, v);
    }
    for (const f of filhos.flat()) e.append(f && f.nodeType ? f : document.createTextNode(f == null ? "" : String(f)));
    return e;
  }
  const bytes = n => n >= 1073741824 ? (n / 1073741824).toFixed(2) + " GB" : n >= 1048576 ? (n / 1048576).toFixed(1) + " MB" : Math.max(1, Math.round(n / 1024)) + " KB";
  const quando = t => new Date(t).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
  const duracao = s => { const d = Math.floor(s / 86400), hh = Math.floor(s % 86400 / 3600), m = Math.floor(s % 3600 / 60); return `${d ? d + "d " : ""}${hh}h ${m}m`; };

  let toastTimer;
  function aviso(texto, erro) {
    const t = $("#toast"); t.textContent = texto; t.className = "toast mostrar" + (erro ? " erro" : "");
    clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove("mostrar"), 3500);
  }

  async function api(caminho, { metodo = "GET", corpo } = {}) {
    const r = await fetch(caminho, {
      method: metodo, credentials: "same-origin",
      headers: { "X-MK": "1", ...(corpo ? { "Content-Type": "application/json" } : {}) },
      body: corpo ? JSON.stringify(corpo) : undefined
    });
    const j = await r.json().catch(() => ({}));
    if (r.status === 401 && !caminho.endsWith("/login")) { mostrarLogin(); throw new Error("Sessão expirada."); }
    if (!r.ok || j.ok === false) throw new Error(j.erro || "Erro inesperado.");
    return j;
  }

  // envio com barra de progresso (arquivo cru, em streaming)
  function enviar(url, arquivo, nomeArquivo, aoProgresso) {
    return new Promise((resolve, reject) => {
      const x = new XMLHttpRequest();
      x.open("PUT", url);
      x.setRequestHeader("X-MK", "1");
      x.setRequestHeader("X-Nome-Arquivo", encodeURIComponent(nomeArquivo));
      x.upload.onprogress = e => { if (e.lengthComputable) aoProgresso(e.loaded / e.total); };
      x.onload = () => { let j = {}; try { j = JSON.parse(x.responseText); } catch {} (x.status < 300 && j.ok) ? resolve(j) : reject(new Error(j.erro || `Falhou (${x.status})`)); };
      x.onerror = () => reject(new Error("Falha de conexão no envio."));
      x.send(arquivo);
    });
  }

  // ───────── gráficos e blocos ─────────
  function grafico(serie) {
    const ns = "http://www.w3.org/2000/svg", W = 560, H = 160, pad = 22;
    const max = Math.max(1, ...serie.map(s => s.visitas));
    const svg = document.createElementNS(ns, "svg");
    svg.setAttribute("viewBox", `0 0 ${W} ${H + 18}`); svg.setAttribute("class", "grafico"); svg.setAttribute("role", "img");
    svg.setAttribute("aria-label", "Visitas nos últimos 14 dias");
    const larg = (W - pad) / serie.length;
    serie.forEach((s, i) => {
      const alt = Math.round((s.visitas / max) * (H - 24));
      const r = document.createElementNS(ns, "rect");
      r.setAttribute("x", pad + i * larg + 3); r.setAttribute("y", H - alt); r.setAttribute("width", Math.max(4, larg - 6));
      r.setAttribute("height", Math.max(2, alt)); r.setAttribute("rx", 4); r.setAttribute("fill", "#e11d48"); r.setAttribute("opacity", s.visitas ? ".9" : ".25");
      const t = document.createElementNS(ns, "title"); t.textContent = `${s.dia}: ${s.visitas} visitas, ${s.unicos} pessoas`; r.append(t);
      svg.append(r);
      if (i % 2 === 0) { const tx = document.createElementNS(ns, "text"); tx.setAttribute("x", pad + i * larg + larg / 2); tx.setAttribute("y", H + 13); tx.setAttribute("text-anchor", "middle"); tx.textContent = s.dia; svg.append(tx); }
    });
    return svg;
  }

  function barras(lista) {
    if (!lista.length) return h("p", { class: "suave" }, "Sem dados ainda.");
    const max = Math.max(...lista.map(i => i.total));
    return h("div", null, lista.map(i => {
      const fill = h("i"); fill.style.width = Math.max(3, (i.total / max) * 100) + "%";
      return h("div", { class: "barra" }, h("span", { class: "nome", title: i.nome }, i.nome), h("div", { class: "trilho" }, fill), h("b", null, i.total));
    }));
  }

  const kpi = (rotulo, valor, sub) => h("div", { class: "kpi" }, h("span", null, rotulo), h("b", null, valor), sub ? h("small", null, sub) : "");
  const cartao = (titulo, ...c) => h("div", { class: "painel-cartao" }, h("h3", null, titulo), ...c);
  const tabela = (cab, linhas) => h("div", { class: "tabela-box" }, h("table", null, h("thead", null, h("tr", null, cab.map(c => h("th", null, c)))), h("tbody", null, linhas)));

  // ───────── telas ─────────
  const telas = {
    async visao() {
      const d = await api("/api/admin/resumo"), v = d.visitas;
      return h("div", null,
        h("h1", null, "Visão geral"), h("p", { class: "sub" }, "Como está o site e o bot agora."),
        h("div", { class: "kpis" },
          kpi("Visitas hoje", v.hoje.visitas, `${v.hoje.unicos} pessoas`), kpi("Últimos 7 dias", v.dias7.visitas, `${v.dias7.unicos} pessoas`),
          kpi("Últimos 30 dias", v.dias30.visitas, `${v.dias30.unicos} pessoas`), kpi("Total", v.total.visitas, `${v.total.unicos} pessoas • ${v.total.robos} robôs`),
          kpi("Erros hoje", v.errosHoje, "404, 500…"), kpi("Mensagens novas", d.mensagens.naoLidas, `${d.mensagens.total} no total`),
          kpi("Downloads", d.arquivos.baixadas, `${d.arquivos.total} arquivos`), kpi("Sites hospedados", d.sites),
          kpi("Bot", d.bot.conectado ? "Online" : "Offline", d.bot.numero ? String(d.bot.numero).split(":")[0].split("@")[0] : "")),
        h("div", { class: "duas" }, cartao("Visitas — últimos 14 dias", grafico(v.serie)), cartao("Páginas mais vistas (30 dias)", barras(v.paginas))),
        h("div", { class: "duas" }, cartao("De onde vieram", barras(v.origens)), cartao("Aparelhos", barras(v.aparelhos)),
          cartao("Navegadores", barras(v.navegadores)), cartao("Sistemas", barras(v.sistemas)), v.paises.length ? cartao("Países", barras(v.paises)) : ""));
    },

    async visitas() {
      const estado = { pagina: 1, busca: "", robos: false };
      const corpo = h("div"), pag = h("div", { class: "paginacao" });
      const busca = h("input", { type: "search", placeholder: "Buscar por IP, página, origem…", "aria-label": "Buscar" });
      const robos = h("input", { type: "checkbox", id: "chkRobos" });
      async function carregar() {
        const d = await api(`/api/admin/visitas?pagina=${estado.pagina}&busca=${encodeURIComponent(estado.busca)}&robos=${estado.robos ? 1 : 0}`);
        corpo.replaceChildren(tabela(["Quando", "IP", "Página", "Aparelho", "Navegador", "Origem", "País"],
          d.itens.map(r => h("tr", null, h("td", null, quando(r.t)), h("td", null, r.ip), h("td", { class: "quebra" }, r.p), h("td", null, h("span", { class: "tag" + (r.b ? " ouro" : "") }, r.d)), h("td", null, `${r.n} / ${r.o}`), h("td", { class: "quebra" }, r.rh || "direto"), h("td", null, r.pa || "—")))));
        const ultima = Math.max(1, Math.ceil(d.total / d.porPagina));
        pag.replaceChildren(h("button", { class: "btn btn-vidro btn-pequeno", disabled: estado.pagina <= 1, onclick: () => { estado.pagina--; carregar(); } }, "←"),
          h("span", null, `Página ${estado.pagina} de ${ultima} • ${d.total} acessos`),
          h("button", { class: "btn btn-vidro btn-pequeno", disabled: estado.pagina >= ultima, onclick: () => { estado.pagina++; carregar(); } }, "→"));
      }
      let espera; busca.addEventListener("input", () => { clearTimeout(espera); espera = setTimeout(() => { estado.busca = busca.value; estado.pagina = 1; carregar(); }, 300); });
      robos.addEventListener("change", () => { estado.robos = robos.checked; estado.pagina = 1; carregar(); });
      await carregar();
      return h("div", null, h("h1", null, "Quem entrou no site"), h("p", { class: "sub" }, "Cada acesso a uma página ou download: IP, aparelho, origem e horário."),
        h("div", { class: "ferramentas" }, busca, h("label", { for: "chkRobos" }, robos, " mostrar robôs")), corpo, pag);
    },

    async erros() {
      const d = await api("/api/admin/erros");
      return h("div", null, h("h1", null, "Erros e acessos suspeitos"), h("p", { class: "sub" }, `${d.total} respostas de erro registradas (404 página não encontrada, tentativas de login erradas, etc.).`),
        h("div", { class: "duas" }, cartao("Mais frequentes", barras(d.porCaminho))),
        h("h3", null, "Últimos"),
        tabela(["Quando", "IP", "Status", "Caminho", "Aparelho"], d.recentes.map(r => h("tr", null, h("td", null, quando(r.t)), h("td", null, r.ip),
          h("td", null, h("span", { class: "tag " + (r.k === "login" ? "ouro" : "verm") }, r.k === "login" ? "login errado" : r.s)), h("td", { class: "quebra" }, r.p), h("td", null, `${r.d} • ${r.n}`)))));
    },

    async arquivos() {
      const lista = h("div", { class: "painel-cartao" });
      const campo = (id, rotulo, extra = {}) => h("div", null, h("label", { for: id }, rotulo), h("input", { id, ...extra }));
      const titulo = campo("aTitulo", "Título", { maxlength: 100, placeholder: "Ex.: Mikasa Bot v7" });
      const desc = campo("aDesc", "Descrição (opcional)", { maxlength: 300 });
      const cat = campo("aCat", "Categoria (opcional)", { maxlength: 30 });
      const seletor = h("input", { type: "file", id: "aArq", class: "so-leitor" });
      const area = h("div", { class: "envio" }, h("p", null, "Arraste um arquivo aqui ou escolha no aparelho."), h("label", { class: "btn btn-vidro", for: "aArq" }, "📎 Escolher arquivo"), seletor, h("p", { class: "suave", id: "aNome" }, "Nenhum arquivo escolhido"));
      const prog = h("div", { class: "progresso" }, h("i")); const btn = h("button", { class: "btn btn-principal", type: "button" }, "Publicar no site");
      let arquivo = null;
      const escolher = f => { arquivo = f; $("#aNome").textContent = f ? `${f.name} • ${bytes(f.size)}` : "Nenhum arquivo escolhido"; if (f && !titulo.querySelector("input").value) titulo.querySelector("input").value = f.name; };
      seletor.addEventListener("change", () => escolher(seletor.files[0]));
      ["dragover", "dragenter"].forEach(ev => area.addEventListener(ev, e => { e.preventDefault(); area.classList.add("arrastando"); }));
      ["dragleave", "drop"].forEach(ev => area.addEventListener(ev, e => { e.preventDefault(); area.classList.remove("arrastando"); }));
      area.addEventListener("drop", e => escolher(e.dataTransfer.files[0]));
      btn.addEventListener("click", async () => {
        if (!arquivo) return aviso("Escolha um arquivo primeiro.", true);
        btn.disabled = true; prog.style.display = "block";
        try {
          const q = `titulo=${encodeURIComponent(titulo.querySelector("input").value)}&descricao=${encodeURIComponent(desc.querySelector("input").value)}&categoria=${encodeURIComponent(cat.querySelector("input").value)}`;
          await enviar(`/api/admin/arquivos/upload?${q}`, arquivo, arquivo.name, p => { prog.firstChild.style.width = Math.round(p * 100) + "%"; });
          aviso("Arquivo publicado!"); mostrar("arquivos");
        } catch (e) { aviso(e.message, true); btn.disabled = false; prog.style.display = "none"; }
      });
      const d = await api("/api/admin/arquivos");
      lista.append(h("h3", null, `Arquivos publicados (${d.itens.length})`));
      if (!d.itens.length) lista.append(h("p", { class: "suave" }, "Nada publicado ainda."));
      d.itens.forEach(a => lista.append(h("div", { class: "linha-item" },
        h("div", { class: "info" }, h("strong", null, a.titulo), h("div", { class: "suave" }, `${a.nome} • ${bytes(a.tamanho)} • ${a.baixadas || 0} downloads • ${a.publico ? "público" : "oculto"}`)),
        h("div", { class: "ferramentas" },
          h("button", { class: "btn btn-vidro btn-pequeno", onclick: async () => { await navigator.clipboard?.writeText(`${location.origin}/baixar/${a.id}`).catch(() => {}); aviso("Link copiado!"); } }, "🔗 Copiar link"),
          h("button", { class: "btn btn-vidro btn-pequeno", onclick: async () => { await api(`/api/admin/arquivos/${a.id}`, { metodo: "PATCH", corpo: { publico: !a.publico } }); mostrar("arquivos"); } }, a.publico ? "🙈 Ocultar" : "👁 Publicar"),
          h("button", { class: "btn btn-vidro btn-pequeno", onclick: async () => { if (confirm(`Apagar "${a.titulo}"?`)) { await api(`/api/admin/arquivos/${a.id}`, { metodo: "DELETE" }); mostrar("arquivos"); } } }, "🗑 Apagar")))));
      return h("div", null, h("h1", null, "Downloads"), h("p", { class: "sub" }, "Suba arquivos (bot, apps, zips…) para as pessoas baixarem na página Downloads."),
        h("div", { class: "painel-cartao" }, h("div", { class: "formulario" }, area, titulo, desc, cat, btn, prog)), h("div", { class: "mt14" }, lista));
    },

    async sites() {
      const nome = h("input", { id: "sNome", maxlength: 40, placeholder: "meu-site", "aria-label": "Nome do site" });
      const seletor = h("input", { type: "file", id: "sArq", accept: ".zip,.html,.htm", class: "so-leitor" });
      const info = h("p", { class: "suave" }, "Escolha um .zip (com index.html) ou um .html");
      const prog = h("div", { class: "progresso" }, h("i")); const btn = h("button", { class: "btn btn-principal", type: "button" }, "Publicar site");
      seletor.addEventListener("change", () => { info.textContent = seletor.files[0] ? `${seletor.files[0].name} • ${bytes(seletor.files[0].size)}` : ""; });
      btn.addEventListener("click", async () => {
        const f = seletor.files[0], slug = nome.value.trim().toLowerCase();
        if (!f) return aviso("Escolha o arquivo do site.", true);
        if (!/^[a-z0-9][a-z0-9-]{0,38}[a-z0-9]?$/.test(slug)) return aviso("Nome inválido: use letras minúsculas, números e hífen.", true);
        btn.disabled = true; prog.style.display = "block";
        try { const r = await enviar(`/api/admin/sites/upload?nome=${encodeURIComponent(slug)}`, f, f.name, p => { prog.firstChild.style.width = Math.round(p * 100) + "%"; }); aviso(r.temIndex ? "Site publicado!" : "Publicado, mas não achei index.html."); mostrar("sites"); }
        catch (e) { aviso(e.message, true); btn.disabled = false; prog.style.display = "none"; }
      });
      const d = await api("/api/admin/sites"), lista = h("div", { class: "painel-cartao" }, h("h3", null, `Sites no ar (${d.itens.length})`));
      if (!d.itens.length) lista.append(h("p", { class: "suave" }, "Nenhum site hospedado ainda."));
      d.itens.forEach(s => lista.append(h("div", { class: "linha-item" },
        h("div", { class: "info" }, h("strong", null, `/sites/${s.slug}/`), h("div", { class: "suave" }, `${s.arquivos} arquivos • ${bytes(s.tamanho)} • ${s.temIndex ? "ok" : "sem index.html"}`)),
        h("div", { class: "ferramentas" }, h("a", { class: "btn btn-vidro btn-pequeno", href: `/sites/${s.slug}/`, target: "_blank", rel: "noopener" }, "Abrir"),
          h("button", { class: "btn btn-vidro btn-pequeno", onclick: async () => { if (confirm(`Apagar o site "${s.slug}"?`)) { await api(`/api/admin/sites/${s.slug}`, { metodo: "DELETE" }); mostrar("sites"); } } }, "🗑 Apagar")))));
      return h("div", null, h("h1", null, "Hospedar sites"), h("p", { class: "sub" }, "Envie um .zip e ele vira um site em /sites/nome/. Enviar de novo com o mesmo nome atualiza."),
        h("div", { class: "painel-cartao" }, h("div", { class: "formulario" }, h("div", null, h("label", { for: "sNome" }, "Nome do site (endereço)"), nome),
          h("div", { class: "envio" }, h("label", { class: "btn btn-vidro", for: "sArq" }, "📎 Escolher zip/html"), seletor, info), btn, prog)), h("div", { class: "mt14" }, lista));
    },

    async mensagens() {
      const d = await api("/api/admin/mensagens"), caixa = h("div", { class: "painel-cartao" });
      if (!d.itens.length) caixa.append(h("p", { class: "suave" }, "Nenhuma mensagem recebida."));
      d.itens.forEach(m => caixa.append(h("div", { class: "linha-item" },
        h("div", { class: "info" }, h("strong", null, m.nome, " ", m.lida ? "" : h("span", { class: "tag ouro" }, "nova")), h("div", { class: "suave" }, `${m.contato || "sem contato"} • ${quando(m.quando)} • ${m.ip}`), h("p", { class: "msg-caixa" }, m.mensagem)),
        h("div", { class: "ferramentas" }, m.lida ? "" : h("button", { class: "btn btn-vidro btn-pequeno", onclick: async () => { await api(`/api/admin/mensagens/${m.id}`, { metodo: "PATCH" }); mostrar("mensagens"); } }, "✔ Lida"),
          h("button", { class: "btn btn-vidro btn-pequeno", onclick: async () => { if (confirm("Apagar mensagem?")) { await api(`/api/admin/mensagens/${m.id}`, { metodo: "DELETE" }); mostrar("mensagens"); } } }, "🗑")))));
      return h("div", null, h("h1", null, "Mensagens"), h("p", { class: "sub" }, "Enviadas pelo formulário de contato (você também recebe um aviso no WhatsApp)."), caixa);
    },

    async bot() {
      const d = await api("/api/admin/bot");
      return h("div", null, h("h1", null, "Bot e servidor"), h("p", { class: "sub" }, "Situação do Mikasa e do aparelho onde ele roda."),
        h("div", { class: "kpis" }, kpi("WhatsApp", d.status.conectado ? "Conectado" : "Desconectado"), kpi("Grupos", d.contagens.grupos), kpi("Usuários", d.contagens.usuarios),
          kpi("No ar há", duracao(d.status.uptimeProcessoS)), kpi("Memória", d.memoriaMb + " MB"), kpi("Node", d.node), kpi("Carga CPU", d.cargaCpu)),
        cartao("Endereços do site", ...d.ips.map(ip => h("p", null, h("code", null, `http://${ip}:${d.porta}`))), h("p", null, h("code", null, `http://localhost:${d.porta}`)),
          d.urlPublica ? h("p", null, "Público: ", h("code", null, d.urlPublica)) : h("p", { class: "suave" }, "Para abrir o site pra qualquer pessoa na internet, veja o LEIAME (túnel Cloudflare) e coloque o endereço em SITE.URL_PUBLICA no config.js.")));
    },

    async conta() {
      const atual = h("input", { type: "password", id: "pAtual", autocomplete: "current-password" }), nova = h("input", { type: "password", id: "pNova", autocomplete: "new-password", placeholder: "mínimo 10 caracteres" });
      const btn = h("button", { class: "btn btn-principal", type: "button", onclick: async () => {
        try { await api("/api/admin/senha", { metodo: "POST", corpo: { atual: atual.value, nova: nova.value } }); aviso("Senha alterada. Entre de novo."); mostrarLogin(); }
        catch (e) { aviso(e.message, true); } } }, "Alterar senha");
      return h("div", null, h("h1", null, "Minha conta"), h("p", { class: "sub" }, "Troque a senha do painel. Todos os logins serão encerrados."),
        h("div", { class: "painel-cartao formulario" }, h("div", null, h("label", { for: "pAtual" }, "Senha atual"), atual), h("div", null, h("label", { for: "pNova" }, "Nova senha"), nova), btn));
    }
  };

  const MENU = [["visao", "📊 Visão geral"], ["visitas", "👀 Visitas"], ["erros", "⚠️ Erros"], ["arquivos", "📥 Downloads"], ["sites", "🌍 Sites"], ["mensagens", "📩 Mensagens"], ["bot", "🤖 Bot"], ["conta", "🔐 Conta"]];
  let atual = "visao";

  async function mostrar(tela) {
    atual = tela; history.replaceState(null, "", "#" + tela);
    $("#lateral").classList.remove("aberto");
    $$("#navPainel .nav-item").forEach(b => b.getAttribute("data-tela") === tela ? b.setAttribute("aria-current", "page") : b.removeAttribute("aria-current"));
    const alvo = $("#conteudo"); alvo.replaceChildren(h("p", { class: "suave" }, "Carregando…"));
    try { alvo.replaceChildren(await telas[tela]()); } catch (e) { if (e.message !== "Sessão expirada.") alvo.replaceChildren(h("p", { class: "aviso erro" }, e.message)); }
  }

  function mostrarApp() {
    $("#telaLogin").hidden = true; $("#app").style.display = "block";
    $("#navPainel").replaceChildren(...MENU.map(([id, nome]) => h("button", { class: "nav-item", "data-tela": id, onclick: () => mostrar(id) }, nome, id === "mensagens" ? h("span", { class: "contador", id: "contMsg", hidden: true }) : "")));
    api("/api/admin/resumo").then(d => { const c = $("#contMsg"); if (c && d.mensagens.naoLidas) { c.textContent = d.mensagens.naoLidas; c.hidden = false; } }).catch(() => {});
    mostrar(MENU.some(m => m[0] === location.hash.slice(1)) ? location.hash.slice(1) : "visao");
  }
  function mostrarLogin() { $("#app").style.display = "none"; $("#telaLogin").hidden = false; }

  $("#abrirLateral").addEventListener("click", () => $("#lateral").classList.toggle("aberto"));
  $("#btnSair").addEventListener("click", async () => { await api("/api/admin/logout", { metodo: "POST" }).catch(() => {}); mostrarLogin(); });
  $("#formLogin").addEventListener("submit", async e => {
    e.preventDefault(); const av = $("#avisoLogin"); av.className = "aviso";
    try { await api("/api/admin/login", { metodo: "POST", corpo: { usuario: $("#lUsuario").value, senha: $("#lSenha").value } }); $("#lSenha").value = ""; mostrarApp(); }
    catch (err) { av.className = "aviso erro"; av.textContent = err.message; }
  });

  api("/api/admin/eu").then(mostrarApp).catch(mostrarLogin);
})();
