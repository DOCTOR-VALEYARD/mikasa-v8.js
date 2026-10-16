/* 🌐 Site público: menu, status do bot, comandos, planos, downloads e contato */
(() => {
  "use strict";
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const pagina = document.body.dataset.pagina || "";

  // ---------- menu ----------
  const btnMenu = $("#btnMenu"), menu = $("#menu");
  if (btnMenu && menu) {
    btnMenu.addEventListener("click", () => {
      const aberto = menu.classList.toggle("aberto");
      btnMenu.setAttribute("aria-expanded", String(aberto));
    });
    menu.addEventListener("click", e => { if (e.target.closest("a")) menu.classList.remove("aberto"); });
  }
  $$(".menu a").forEach(a => { if (a.getAttribute("href") === location.pathname) a.setAttribute("aria-current", "page"); });

  // ---------- revelar ao rolar ----------
  const revelar = () => {
    const itens = $$(".revelar");
    if (!("IntersectionObserver" in window)) return itens.forEach(i => i.classList.add("visivel"));
    const obs = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add("visivel"); obs.unobserve(e.target); } }), { threshold: .12 });
    itens.forEach(i => obs.observe(i));
  };

  // ---------- utilidades ----------
  const bytes = n => n >= 1073741824 ? (n / 1073741824).toFixed(2) + " GB" : n >= 1048576 ? (n / 1048576).toFixed(1) + " MB" : Math.max(1, Math.round(n / 1024)) + " KB";
  const dinheiro = v => "R$ " + Number(v).toLocaleString("pt-BR", { minimumFractionDigits: Number.isInteger(Number(v)) ? 0 : 2 });
  const el = (tag, cls, texto) => { const e = document.createElement(tag); if (cls) e.className = cls; if (texto != null) e.textContent = texto; return e; };
  const api = async (url, opcoes) => {
    const r = await fetch(url, opcoes);
    const j = await r.json().catch(() => ({}));
    if (!r.ok || j.ok === false) throw new Error(j.erro || "Algo deu errado.");
    return j;
  };

  function animarNumero(alvo, final) {
    if (!Number.isFinite(final)) { alvo.textContent = "—"; return; }
    if (matchMedia("(prefers-reduced-motion: reduce)").matches || final < 2) { alvo.textContent = final.toLocaleString("pt-BR"); return; }
    const inicio = performance.now(), dur = 900;
    const passo = t => {
      const p = Math.min(1, (t - inicio) / dur);
      alvo.textContent = Math.round(final * (1 - Math.pow(1 - p, 3))).toLocaleString("pt-BR");
      if (p < 1) requestAnimationFrame(passo);
    };
    requestAnimationFrame(passo);
  }

  // ---------- links do canal / criador ----------
  function preencherLinks(d) {
    $$('[data-link="canal"]').forEach(a => { if (d.links.canal) { a.href = d.links.canal; a.target = "_blank"; a.rel = "noopener"; a.hidden = false; } });
    $$('[data-link="criador"]').forEach(a => { if (d.links.criador) { a.href = d.links.criador; a.target = "_blank"; a.rel = "noopener"; a.hidden = false; } });
  }

  // ---------- página inicial ----------
  function iniciarInicio(d) {
    const ponto = $("#statusPonto"), texto = $("#statusTexto");
    if (ponto && texto) { ponto.classList.toggle("on", !!d.online); texto.textContent = d.online ? "Bot online agora" : "Bot reconectando…"; }
    $$("[data-numero]").forEach(n => animarNumero(n, Number(d.stats[n.dataset.numero])));
    const pre = $("#prefixoTexto"); if (pre) pre.textContent = d.prefixo || "/";

    // comandos
    const abas = $("#abasComandos"), lista = $("#listaComandos"), busca = $("#buscaComando");
    let atual = 0;
    const pintar = () => {
      const termo = (busca.value || "").toLowerCase().trim();
      lista.replaceChildren();
      const fonte = termo ? d.categorias.flatMap(c => c.comandos) : (d.categorias[atual]?.comandos || []);
      const itens = [...new Set(fonte)].filter(c => !termo || c.toLowerCase().includes(termo));
      if (!itens.length) return lista.append(el("p", "vazio", "Nenhum comando encontrado."));
      itens.forEach(c => lista.append(el("span", "chip", (d.prefixo || "/") + c)));
    };
    d.categorias.forEach((c, i) => {
      const b = el("button", "aba", c.nome); b.type = "button"; b.setAttribute("role", "tab"); b.setAttribute("aria-selected", String(i === 0));
      b.addEventListener("click", () => { atual = i; busca.value = ""; $$(".aba", abas).forEach((x, j) => x.setAttribute("aria-selected", String(i === j))); pintar(); });
      abas.append(b);
    });
    busca.addEventListener("input", pintar);
    pintar();

    // planos
    const planos = $("#listaPlanos");
    planos.replaceChildren();
    if (!d.planos.length) planos.append(el("p", "vazio", "Fale com o criador para saber os planos."));
    const melhor = d.planos.length > 2 ? 1 : -1;
    d.planos.forEach((p, i) => {
      const c = el("article", "cartao plano" + (i === melhor ? " melhor" : ""));
      if (i === melhor) c.append(el("span", "faixa", "MAIS ESCOLHIDO"));
      c.append(el("h3", null, `${p.dias} dias`));
      const preco = el("div", "preco", dinheiro(p.valor)); c.append(preco);
      const ul = el("ul");
      ul.append(el("li", null, p.grupos > 0 ? `✅ ${p.grupos} grupo${p.grupos > 1 ? "s" : ""}` : "✅ Uso no privado (teste)"));
      ul.append(el("li", null, "✅ Todos os comandos"));
      ul.append(el("li", null, "✅ Suporte do criador"));
      c.append(ul);
      const a = el("a", "btn btn-principal", "Quero este plano");
      a.href = d.links.criadorBase ? `${d.links.criadorBase}?text=${encodeURIComponent(`Olá! Quero alugar o ${d.nome} por ${p.dias} dias.`)}` : "/contato";
      if (d.links.criadorBase) { a.target = "_blank"; a.rel = "noopener"; }
      c.append(a);
      planos.append(c);
    });
  }

  // ---------- downloads ----------
  async function iniciarDownloads() {
    const lista = $("#listaArquivos"), busca = $("#buscaArquivo");
    let itens = [];
    try { itens = (await api("/api/downloads")).itens; } catch (e) { lista.replaceChildren(el("p", "vazio", e.message)); return; }
    const pintar = () => {
      const t = busca.value.toLowerCase().trim();
      lista.replaceChildren();
      const filtrados = itens.filter(a => !t || `${a.titulo} ${a.descricao} ${a.nome} ${a.categoria}`.toLowerCase().includes(t));
      if (!filtrados.length) return lista.append(el("p", "vazio", itens.length ? "Nenhum arquivo encontrado." : "Ainda não há arquivos publicados."));
      filtrados.forEach(a => {
        const c = el("article", "cartao arquivo");
        const info = el("div", "info"); info.append(el("h3", null, a.titulo));
        if (a.descricao) info.append(el("p", "suave sem-margem", a.descricao));
        const meta = el("div", "meta");
        [bytes(a.tamanho), new Date(a.criadoEm).toLocaleDateString("pt-BR"), `${a.baixadas} download${a.baixadas === 1 ? "" : "s"}`, a.categoria].filter(Boolean).forEach(m => meta.append(el("span", null, m)));
        info.append(meta);
        const b = el("a", "btn btn-principal", "⬇ Baixar"); b.href = `/baixar/${a.id}`;
        c.append(info, b); lista.append(c);
      });
    };
    busca.addEventListener("input", pintar);
    pintar();
  }

  // ---------- contato ----------
  function iniciarContato() {
    const form = $("#formContato"), aviso = $("#avisoContato"), btn = $("#btnEnviar");
    form.addEventListener("submit", async e => {
      e.preventDefault();
      aviso.className = "aviso";
      const dados = Object.fromEntries(new FormData(form).entries());
      if ((dados.nome || "").trim().length < 2 || (dados.mensagem || "").trim().length < 5) {
        aviso.className = "aviso erro"; aviso.textContent = "Preencha seu nome e escreva a mensagem."; return;
      }
      btn.disabled = true; btn.textContent = "Enviando…";
      try {
        await api("/api/contato", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(dados) });
        aviso.className = "aviso ok"; aviso.textContent = "Mensagem enviada! O criador vai responder em breve."; form.reset();
      } catch (err) { aviso.className = "aviso erro"; aviso.textContent = err.message; }
      btn.disabled = false; btn.textContent = "Enviar mensagem";
    });
  }

  // ---------- partida ----------
  revelar();
  if (pagina === "downloads") iniciarDownloads();
  if (pagina === "contato") iniciarContato();
  if (pagina === "inicio" || pagina === "contato") {
    api("/api/publico").then(d => { preencherLinks(d); if (pagina === "inicio") iniciarInicio(d); }).catch(() => {});
  }
})();
