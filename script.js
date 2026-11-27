/* ==========================================================
   1) CONFIGURAÇÕES — edite aqui
   ========================================================== */
const CONFIG = {
  whatsapp: "5538900000000",   // seu número com 55 + DDD, só números
  loja: "MSN Doces Gourmet",
  diasAntecedencia: 2,         // antecedência mínima para encomendas
  horario: { abre: 8, fecha: 20 },              // horário de atendimento (horas)
  diasFechados: [0],                            // 0 = domingo, 1 = segunda...
  datasBloqueadas: ["2026-12-25", "2027-01-01"], // AAAA-MM-DD (feriados, folgas)
  limiteDia: 10,               // máx. de pedidos por data (precisa da planilha)
  pix: { chave: "SUA-CHAVE-PIX", nome: "MSN DOCES GOURMET", cidade: "MONTES CLAROS", sinal: 0.5 }, // sem acentos, maiúsculas
  frete: { padrao: 8, bairros: { "Centro": 5, "Ibituruna": 10 } },  // R$ por bairro
  cupons: { MSN10: 0.10, BEMVINDO: 0.05 },      // código: desconto (0.10 = 10%)
  planilhaUrl: ""              // URL do Apps Script (veja apps-script/Code.gs)
};

/* ==========================================================
   2) PRODUTOS — adicione, edite ou apague blocos { ... }
   - nome:      nome do doce (não repita nomes)
   - categoria: cria o filtro automaticamente
   - preco:     use ponto, ex.: 4.5
   - unidade:   "unidade", "pote", "caixa com 12"...
   - minimo:    quantidade mínima por pedido (opcional)
   - imagem:    caminho da foto, ex.: "img/brigadeiro.jpg" (opcional)
   - bio:       descrição curta do produto
   ========================================================== */
const PRODUTOS = [
  { nome: "Brigadeiro Gourmet", categoria: "Brigadeiros", preco: 4.5, unidade: "unidade", minimo: 10, imagem: "", bio: "Chocolate belga cremoso, enrolado no granulado fino." },
  { nome: "Beijinho de Coco", categoria: "Brigadeiros", preco: 4.0, unidade: "unidade", minimo: 10, imagem: "", bio: "Coco fresco, leite condensado e cravo por cima." },
  { nome: "Bolo no Pote Ninho", categoria: "Bolos no pote", preco: 12.0, unidade: "pote", minimo: 1, imagem: "", bio: "Massa fofinha, creme de leite ninho." },
  { nome: "Bolo de Pote de Chocolate", categoria: "Bolos no pote", preco: 10.0, unidade: "pote", minimo: 1, imagem: "", bio: "Bolo de chocolate fofinho e cremoso, servido em pote." },


/* ==========================================================
   3) CÓDIGO DO SITE — não precisa mexer daqui para baixo
   ========================================================== */
const $ = s => document.querySelector(s);
const R = v => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const esc = t => String(t ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const CHAVE = "msn_carrinho";
const minimo = p => p.minimo || 1;

let filtro = "Todos";
let cart = (() => { try { return JSON.parse(localStorage.getItem(CHAVE)) || {}; } catch { return {}; } })();

function salvar() {
  try { localStorage.setItem(CHAVE, JSON.stringify(cart)); } catch {}
  desenharCarrinho();
}

function aviso(texto) {
  const a = $("#aviso");
  a.textContent = texto;
  a.classList.add("on");
  clearTimeout(aviso.t);
  aviso.t = setTimeout(() => a.classList.remove("on"), 2200);
}

/* ---------- produtos ---------- */
function desenharProdutos() {
  const cats = ["Todos", ...new Set(PRODUTOS.map(p => p.categoria).filter(Boolean))];
  $("#filtros").innerHTML = cats.map(c =>
    `<button class="${c === filtro ? "ativo" : ""}" data-cat="${esc(c)}">${esc(c)}</button>`).join("");

  $("#grade").innerHTML = PRODUTOS
    .map((p, i) => ({ p, i }))
    .filter(({ p }) => filtro === "Todos" || p.categoria === filtro)
    .map(({ p, i }) => `
      <article class="card">
        <div class="foto">${p.imagem
          ? `<img src="${esc(p.imagem)}" alt="${esc(p.nome)}" loading="lazy">`
          : `<span>MSN</span>`}</div>
        <div class="info">
          <h3>${esc(p.nome)}</h3>
          <p class="bio">${esc(p.bio)}</p>
          <div class="linha">
            <span class="preco">${R(p.preco)}</span>
            <small>${esc(p.unidade || "")}${minimo(p) > 1 ? ` · mín. ${minimo(p)}` : ""}</small>
          </div>
          <div class="compra">
            <div class="qtd">
              <button data-menos="${i}" aria-label="Diminuir">−</button>
              <output id="q${i}">${minimo(p)}</output>
              <button data-mais="${i}" aria-label="Aumentar">+</button>
            </div>
            <button class="btn" data-add="${i}">Adicionar</button>
          </div>
        </div>
      </article>`).join("");
}

desenharProdutos(); // mostra o catálogo logo de cara

$("#filtros").addEventListener("click", e => {
  const b = e.target.closest("button[data-cat]");
  if (b) { filtro = b.dataset.cat; desenharProdutos(); }
});

$("#grade").addEventListener("click", e => {
  const b = e.target.closest("button");
  if (!b) return;
  const d = b.dataset, q = i => $("#q" + i);
  if (d.mais !== undefined) q(d.mais).textContent = +q(d.mais).textContent + 1;
  if (d.menos !== undefined) q(d.menos).textContent = Math.max(minimo(PRODUTOS[d.menos]), +q(d.menos).textContent - 1);
  if (d.add !== undefined) {
    const p = PRODUTOS[d.add], n = +q(d.add).textContent;
    cart[p.nome] = (cart[p.nome] || 0) + n;
    salvar();
    aviso(`${n}x ${p.nome} no pedido`);
  }
});

/* ---------- carrinho ---------- */
function itensDoCarrinho() {
  return Object.entries(cart)
    .map(([nome, q]) => ({ p: PRODUTOS.find(x => x.nome === nome), q }))
    .filter(x => x.p && x.q > 0);
}
const totalCarrinho = () => itensDoCarrinho().reduce((s, { p, q }) => s + p.preco * q, 0);

function desenharCarrinho() {
  const itens = itensDoCarrinho();
  $("#itens").innerHTML = itens.length
    ? itens.map(({ p, q }) => `
      <div class="item">
        <div><strong>${esc(p.nome)}</strong><small>${R(p.preco)} / ${esc(p.unidade || "un.")}</small></div>
        <div class="qtd">
          <button data-c="-" data-n="${esc(p.nome)}" ${q <= minimo(p) ? "disabled" : ""} aria-label="Diminuir">−</button>
          <output>${q}</output>
          <button data-c="+" data-n="${esc(p.nome)}" aria-label="Aumentar">+</button>
        </div>
        <button class="x" data-c="x" data-n="${esc(p.nome)}" aria-label="Remover">×</button>
        <b>${R(p.preco * q)}</b>
      </div>`).join("")
    : `<p class="vazio">Seu pedido está vazio. Escolha um doce para começar.</p>${ultimoPedido() ? `<button class="btn btn-linha" data-c="repetir">Repetir último pedido</button>` : ""}`;
  const c = calc();
  $("#resumo").innerHTML = c.desc || c.f
    ? `<div><span>Subtotal</span><span>${R(c.sub)}</span></div>`
      + (c.desc ? `<div><span>Cupom ${esc(cupom)}</span><span>− ${R(c.desc)}</span></div>` : "")
      + (c.f ? `<div><span>Frete${bairro ? " · " + esc(bairro) : ""}</span><span>${R(c.f)}</span></div>` : "")
    : "";
  $("#total").textContent = R(c.total);
  $("#contador").textContent = itens.reduce((s, { q }) => s + q, 0);
}

$("#itens").addEventListener("click", e => {
  const b = e.target.closest("button[data-c]");
  if (!b) return;
  if (b.dataset.c === "repetir") { cart = { ...ultimoPedido() }; return salvar(); }
  const n = b.dataset.n, p = PRODUTOS.find(x => x.nome === n);
  if (b.dataset.c === "+") cart[n]++;
  if (b.dataset.c === "-") cart[n] = Math.max(minimo(p), cart[n] - 1);
  if (b.dataset.c === "x") delete cart[n];
  salvar();
});

const abrir = () => document.body.classList.add("aberto");
const fechar = () => document.body.classList.remove("aberto");
$("#abrirCarrinho").addEventListener("click", abrir);
$("#fechar").addEventListener("click", fechar);
$("#fundo").addEventListener("click", fechar);
document.addEventListener("keydown", e => { if (e.key === "Escape") fechar(); });

/* ---------- regras automáticas: cupom, frete, datas, horário ---------- */
let cupom = null, frete = 0, bairro = "", datasCheias = new Set(), pedido = null;
const ULT = "msn_ultimo";
const ultimoPedido = () => { try { return JSON.parse(localStorage.getItem(ULT)); } catch { return null; } };

function calc() {
  const sub = totalCarrinho();
  const desc = cupom ? sub * CONFIG.cupons[cupom] : 0;
  const f = sub && $("#tipo").value === "Entrega" ? frete : 0;
  return { sub, desc, f, total: sub - desc + f };
}

const dataIndisponivel = iso =>
  CONFIG.diasFechados.includes(new Date(iso + "T12:00:00").getDay()) ||
  CONFIG.datasBloqueadas.includes(iso) || datasCheias.has(iso);

$("#data").addEventListener("change", e => {
  const ruim = dataIndisponivel(e.target.value);
  e.target.setCustomValidity(ruim ? "Data indisponível. Escolha outra." : "");
  if (ruim) { aviso("Essa data não está disponível"); e.target.reportValidity(); }
});

$("#aplicarCupom").addEventListener("click", () => {
  const cod = $("#cupom").value.trim().toUpperCase();
  cupom = CONFIG.cupons[cod] ? cod : null;
  aviso(cupom ? `Cupom ${cod} aplicado` : "Cupom inválido");
  desenharCarrinho();
});

$("#tipo").addEventListener("change", e => {
  const entrega = e.target.value === "Entrega";
  $("#campoEndereco").hidden = !entrega;
  $("#endereco").required = entrega;
  desenharCarrinho();
});

$("#cep").addEventListener("input", async e => {
  const cep = e.target.value.replace(/\D/g, "");
  e.target.value = cep.replace(/^(\d{5})(\d)/, "$1-$2");
  if (cep.length !== 8) return;
  try {
    const r = await (await fetch(`https://viacep.com.br/ws/${cep}/json/`)).json();
    if (r.erro) return aviso("CEP não encontrado");
    bairro = r.bairro;
    frete = CONFIG.frete.bairros[bairro] ?? CONFIG.frete.padrao;
    $("#endereco").value = `${r.logradouro}, `;
    $("#endereco").focus();
    desenharCarrinho();
  } catch { aviso("Não consegui buscar o CEP. Digite o endereço."); }
});

function verHorario() {
  const agora = new Date(), { abre, fecha } = CONFIG.horario;
  $("#faixa").hidden = !CONFIG.diasFechados.includes(agora.getDay()) && agora.getHours() >= abre && agora.getHours() < fecha;
}

async function carregarDatasCheias() {
  if (!CONFIG.planilhaUrl) return;
  try {
    const { datas } = await (await fetch(CONFIG.planilhaUrl)).json();
    datasCheias = new Set(Object.keys(datas).filter(d => datas[d] >= CONFIG.limiteDia));
  } catch {}
}

/* ---------- Pix "copia e cola" (BR Code estático) ---------- */
const tlv = (id, v) => id + String(v.length).padStart(2, "0") + v;
function crc16(s) {
  let c = 0xFFFF;
  for (const ch of s) {
    c ^= ch.charCodeAt(0) << 8;
    for (let i = 0; i < 8; i++) c = c & 0x8000 ? ((c << 1) ^ 0x1021) & 0xFFFF : (c << 1) & 0xFFFF;
  }
  return c.toString(16).toUpperCase().padStart(4, "0");
}
function codigoPix(valor, txid) {
  const p = CONFIG.pix;
  const base = tlv("00", "01") + tlv("26", tlv("00", "br.gov.bcb.pix") + tlv("01", p.chave)) +
    tlv("52", "0000") + tlv("53", "986") + tlv("54", valor.toFixed(2)) + tlv("58", "BR") +
    tlv("59", p.nome.slice(0, 25)) + tlv("60", p.cidade.slice(0, 15)) + tlv("62", tlv("05", txid)) + "6304";
  return base + crc16(base);
}

function mostrarPix() {
  const codigo = codigoPix(pedido.sinal, pedido.numero);
  $("#pixValor").textContent = `Sinal de ${R(pedido.sinal)} · pedido ${pedido.numero}`;
  $("#pixCodigo").value = codigo;
  $("#qr").innerHTML = "";
  if (window.QRCode) new QRCode($("#qr"), { text: codigo, width: 190, height: 190, colorDark: "#1c1b1a", colorLight: "#ffffff" });
  document.body.classList.add("pagando");
}

$("#copiarPix").addEventListener("click", async () => {
  try { await navigator.clipboard.writeText($("#pixCodigo").value); aviso("Código Pix copiado"); }
  catch { $("#pixCodigo").select(); aviso("Selecione e copie o código"); }
});

/* ---------- pedido: planilha + Pix + WhatsApp ---------- */
$("#formPedido").addEventListener("submit", e => {
  e.preventDefault();
  const itens = itensDoCarrinho();
  if (!itens.length) return aviso("Adicione ao menos um doce ao pedido");
  const f = new FormData(e.target), c = calc();
  if (dataIndisponivel(f.get("data"))) return aviso("Escolha outra data de entrega");
  const entrega = f.get("tipo") === "Entrega";
  pedido = {
    numero: "MSN" + Date.now().toString(36).toUpperCase().slice(-6),
    cliente: f.get("nome"), tipo: f.get("tipo"),
    endereco: entrega ? f.get("endereco") + (bairro ? ` (${bairro})` : "") : "",
    data: f.get("data"), obs: f.get("obs").trim(),
    itens: itens.map(({ p, q }) => `${q}x ${p.nome}`),
    subtotal: c.sub, desconto: c.desc, frete: c.f, total: c.total,
    sinal: Math.round(c.total * CONFIG.pix.sinal * 100) / 100
  };
  if (CONFIG.planilhaUrl)
    fetch(CONFIG.planilhaUrl, { method: "POST", mode: "no-cors", headers: { "Content-Type": "text/plain" },
      body: JSON.stringify({ ...pedido, itens: pedido.itens.join("; ") }) }).catch(() => {});
  try { localStorage.setItem(ULT, JSON.stringify(cart)); } catch {}
  mostrarPix();
});

$("#jaPaguei").addEventListener("click", () => {
  const [a, m, d] = pedido.data.split("-");
  const linhas = [
    `*Novo pedido ${pedido.numero} — ${CONFIG.loja}*`, "",
    `*Cliente:* ${pedido.cliente}`,
    pedido.tipo === "Entrega" ? `*Entrega em:* ${pedido.endereco}` : "*Retirada no local*",
    `*Data desejada:* ${d}/${m}/${a}`, "",
    "*Itens:*", ...pedido.itens.map(i => `• ${i}`), "",
    `*Total:* ${R(pedido.total)}` + (pedido.desconto ? ` (cupom ${cupom}: −${R(pedido.desconto)})` : "") + (pedido.frete ? ` (frete ${R(pedido.frete)})` : ""),
    `*Sinal Pix:* ${R(pedido.sinal)} — comprovante em anexo`
  ];
  if (pedido.obs) linhas.push("", `*Observações:* ${pedido.obs}`);
  window.open(`https://wa.me/${CONFIG.whatsapp}?text=${encodeURIComponent(linhas.join("\n"))}`, "_blank");
  cart = {}; cupom = null; salvar();
  document.body.classList.remove("pagando", "aberto");
  aviso("Pedido enviado! Anexe o comprovante no WhatsApp.");
});

/* ---------- início ---------- */
(function iniciar() {
  const min = new Date();
  min.setDate(min.getDate() + CONFIG.diasAntecedencia);
  $("#data").min = min.toLocaleDateString("sv-SE");
  $("#diasMin").textContent = CONFIG.diasAntecedencia;
  $("#linkZap").href = `https://wa.me/${CONFIG.whatsapp}`;
  desenharProdutos();
  desenharCarrinho();
  verHorario();
  carregarDatasCheias();
})();
