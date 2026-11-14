/**
 * Planilha de pedidos — MSN Doces Gourmet (grátis)
 * 1) Crie uma planilha no Google Sheets
 * 2) Extensões > Apps Script > cole este código
 * 3) Implantar > Nova implantação > App da Web
 *    Executar como: Eu | Quem tem acesso: Qualquer pessoa
 * 4) Copie a URL e cole em CONFIG.planilhaUrl (script.js)
 * Para cancelar um pedido (e liberar a data), troque o Status para "Cancelado".
 */
const ABA = "Pedidos";
const CAB = ["Data/hora","Pedido","Cliente","Receber","Endereço","Data desejada","Itens","Subtotal","Desconto","Frete","Total","Sinal Pix","Status","Obs"];

function aba_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const a = ss.getSheetByName(ABA) || ss.insertSheet(ABA);
  if (a.getLastRow() === 0) a.appendRow(CAB);
  return a;
}
// evita fórmulas maliciosas digitadas por clientes
const txt_ = v => { v = String(v == null ? "" : v).slice(0, 500); return /^[=+\-@]/.test(v) ? "'" + v : v; };
const num_ = v => Number(v) || 0;

// recebe o pedido do site
function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const p = JSON.parse(e.postData.contents);
    aba_().appendRow([new Date(), txt_(p.numero), txt_(p.cliente), txt_(p.tipo), txt_(p.endereco), txt_(p.data),
      txt_(p.itens), num_(p.subtotal), num_(p.desconto), num_(p.frete), num_(p.total), num_(p.sinal),
      "Aguardando pagamento", txt_(p.obs)]);
    MailApp.sendEmail(Session.getEffectiveUser().getEmail(), "Novo pedido " + p.numero,
      `Cliente: ${p.cliente}\nEntrega/retirada: ${p.tipo} ${p.endereco || ""}\nData: ${p.data}\nItens: ${p.itens}\nTotal: R$ ${num_(p.total).toFixed(2)}\nSinal Pix: R$ ${num_(p.sinal).toFixed(2)}`);
    return ContentService.createTextOutput("ok");
  } finally { lock.releaseLock(); }
}

// devolve quantos pedidos existem por data (o site bloqueia as datas lotadas)
function doGet() {
  const a = aba_();
  const tz = SpreadsheetApp.getActiveSpreadsheet().getSpreadsheetTimeZone();
  const dados = a.getLastRow() > 1 ? a.getRange(2, 1, a.getLastRow() - 1, CAB.length).getValues() : [];
  const datas = {};
  dados.forEach(l => {
    if (l[12] === "Cancelado") return;
    const d = l[5] instanceof Date ? Utilities.formatDate(l[5], tz, "yyyy-MM-dd") : String(l[5]);
    datas[d] = (datas[d] || 0) + 1;
  });
  return ContentService.createTextOutput(JSON.stringify({ datas })).setMimeType(ContentService.MimeType.JSON);
}
