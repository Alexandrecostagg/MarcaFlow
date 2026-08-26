import { data, client, processById } from "./store.js";
import { normalizeKey, valueOf, downloadJson, sanitizeXmlText, validateJsonPayload, validateMonitorReport } from "./utils.js";
import { flowStageByStatus, addDays, brToIso, iso } from "./business.js";
import { openModal, closeModal } from "./utils.js";

const dispatchRule = {
  check(name) {
    const text = name.toLowerCase();
    if (text.includes("publicação de pedido") && text.includes("oposição")) return { status: "Publicado na RPI", stage: "Publicação", action: "Monitorar prazo de oposição", legalDays: 60, internalDays: 55, tone: "blue" };
    if (text.includes("oposição")) return { status: "Com oposição", stage: "Oposição", action: "Preparar manifestação à oposição", legalDays: 60, internalDays: 55, tone: "red" };
    if (text.includes("exigência formal")) return { status: "Com exigência", stage: "Exame", action: "Responder exigência formal", legalDays: 5, internalDays: 4, tone: "red" };
    if (text.includes("exigência")) return { status: "Com exigência", stage: "Exame", action: "Responder exigência", legalDays: 60, internalDays: 55, tone: "amber" };
    if (text.includes("indeferimento")) return { status: "Indeferido", stage: "Recurso", action: "Avaliar recurso contra indeferimento", legalDays: 60, internalDays: 55, tone: "red" };
    if (text.includes("concessão de registro")) return { status: "Registrado", stage: "Registro", action: "Baixar e arquivar certificado", tone: "green" };
    if (text.includes("deferimento do pedido")) return { status: "Deferido", stage: "Concessão", action: "Acompanhar concessão automática", tone: "green" };
    return { action: "Conferir despacho no PDF oficial", tone: "gray" };
  },
  apply(name) { return dispatchRule.check(name); }
};

function severityTone(severity) {
  return ({ critico: "red", atencao: "amber", informativo: "green", revisar: "gray" })[String(severity || "").toLowerCase()] || "gray";
}

function movementIdFromReport(report, movement) {
  return `${report.rpi || movement.rpi}:${movement.processNumber}:${movement.dispatchCode}`;
}

function parseCsv(text) {
  const rows = [];
  let row = [], field = "", quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (char === '"') {
      if (quoted && text[index + 1] === '"') { field += '"'; index += 1; }
      else quoted = !quoted;
    } else if (char === ";" && !quoted) { row.push(field.trim()); field = ""; }
    else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && text[index + 1] === "\n") index += 1;
      row.push(field.trim()); field = "";
      if (row.some(Boolean)) rows.push(row);
      row = [];
    } else field += char;
  }
  row.push(field.trim());
  if (row.some(Boolean)) rows.push(row);
  if (rows.length < 2) return [];
  const headers = rows.shift().map(normalizeKey);
  return rows.map(values => Object.fromEntries(headers.map((header, index) => [header, values[index] || ""])));
}

function standardizeImportedProcess(record) {
  const clientName = valueOf(record, "client", "cliente", "titular", "razao social", "nome titular");
  const brand = valueOf(record, "brand", "marca");
  const classes = valueOf(record, "classes", "classes nice", "classe", "classlist");
  if (!brand || !clientName || !classes) throw new Error("Cada linha precisa informar marca, titular/cliente e classes.");
  const clientDocument = valueOf(record, "clientdocument", "cpf cnpj", "documento", "cpf/cnpj");
  let currentClient = data.clients.find(item => normalizeKey(item.name) === normalizeKey(clientName) || (clientDocument && item.document === clientDocument));
  if (!currentClient) {
    currentClient = {
      id: crypto.randomUUID(), name: clientName, document: clientDocument,
      email: valueOf(record, "email"), phone: valueOf(record, "telefone", "phone"), contact: valueOf(record, "responsavel", "contato"),
      profile: valueOf(record, "perfil") || "Empresa", legalNature: valueOf(record, "natureza juridica"), businessActivity: valueOf(record, "atividade", "atividade compativel", "cnae"),
      discountCategory: valueOf(record, "categoria desconto inpi", "categoria desconto", "enquadramento desconto") || window.suggestedDiscountCategory(valueOf(record, "perfil")),
      naturalPersonNoSameSectorParticipation: valueOf(record, "pf sem participacao no ramo", "pessoa natural sem empresa no ramo"),
      coHoldersEligible: valueOf(record, "cotitulares elegiveis", "cotitulares desconto") || "Não se aplica",
      discountEvidence: valueOf(record, "comprovante desconto", "validacao desconto"), discountEligible: valueOf(record, "elegivel desconto", "desconto inpi")
    };
    currentClient.discountEligible = window.discountAssessment(currentClient).percent ? "Sim" : currentClient.discountCategory === "nao_elegivel" ? "Não" : "";
    data.clients.push(currentClient);
  }
  const number = valueOf(record, "number", "numero processo", "processo").replace(/\D/g, "");
  const existing = number && data.processes.find(item => item.number.replace(/\D/g, "") === number);
  const process = {
    id: existing?.id || crypto.randomUUID(), brand, clientId: currentClient.id, number,
    classes: Array.isArray(record.classList) ? record.classList.join(", ") : classes,
    flowStage: valueOf(record, "flowstage", "etapa") || "Exame", filingDate: valueOf(record, "filingdate", "data deposito", "data de deposito"),
    presentation: valueOf(record, "presentation", "apresentacao") || "Nominativa", status: valueOf(record, "status") || "Em exame",
    owner: valueOf(record, "owner", "responsavel processo") || "", nextAction: valueOf(record, "nextaction", "proxima acao") || "Conferir situação no INPI",
    legalDeadline: valueOf(record, "legaldeadline", "prazo legal"), internalDeadline: valueOf(record, "internaldeadline", "prazo interno"),
    lastRpi: valueOf(record, "lastrpi", "ultima rpi"), lastDispatchCode: valueOf(record, "lastdispatchcode", "codigo despacho"), lastDispatchName: valueOf(record, "lastdispatchname", "nome despacho"), lastPublicationDate: valueOf(record, "lastpublicationdate", "data publicacao"),
    nature: valueOf(record, "nature", "natureza"), specification: valueOf(record, "specification", "especificacao", "produtos servicos"), salesChannels: valueOf(record, "saleschannels", "canais venda"), geographicScope: valueOf(record, "geographicscope", "area atuacao"), logoReference: valueOf(record, "logoreference", "logo arquivo"), priorRisk: valueOf(record, "priorrisk", "risco anterioridade") || "Não avaliado", notes: valueOf(record, "notes", "observacoes")
  };
  if (existing) Object.assign(existing, process); else data.processes.unshift(process);
}

function importPortfolio(text, fileName) {
  const parsed = fileName.toLowerCase().endsWith(".csv") ? parseCsv(text) : validateJsonPayload(text);
  const records = Array.isArray(parsed) ? parsed : (parsed.processes || []);
  if (!records.length) throw new Error("O arquivo não contém processos para importar.");
  records.forEach(standardizeImportedProcess);
  window.ensureCollections();
  window.save();
  window.view = "processes";
  window.render();
  alert(`${records.length} processo(s) importado(s). Revise os campos de prazo e a publicação oficial da RPI antes de qualquer providência.`);
}

function importMonitorReportJson(jsonText, fileName) {
  const report = validateMonitorReport(jsonText);
  const tracked = new Map(data.processes.filter(p => p.number).map(p => [p.number.replace(/\D/g, ""), p]));
  let matches = 0;
  let found = 0;
  report.movements.forEach((movement) => {
    const number = String(movement.processNumber || "").replace(/\D/g, "");
    const process = tracked.get(number);
    if (!process) return;
    matches += 1;
    const id = movementIdFromReport(report, movement);
    process.status = movement.status || process.status;
    process.flowStage = movement.flowStage || process.flowStage;
    process.nextAction = movement.nextAction || process.nextAction;
    process.lastRpi = `RPI ${report.rpi || movement.rpi || ""}`.trim();
    process.lastDispatchCode = movement.dispatchCode || process.lastDispatchCode;
    process.lastDispatchName = movement.dispatchName || process.lastDispatchName;
    process.lastPublicationDate = movement.publicationDate || report.publicationDate || process.lastPublicationDate;
    process.legalDeadline = movement.legalDeadline || process.legalDeadline;
    process.internalDeadline = movement.internalDeadline || process.internalDeadline;
    if (data.movements.some(item => item.id === id)) return;
    data.movements.unshift({
      id,
      rpi: `RPI ${report.rpi || movement.rpi || ""}`.trim(),
      publicationDate: movement.publicationDate || report.publicationDate,
      importedAt: iso(),
      processId: process.id,
      processNumber: number,
      brand: process.brand,
      dispatchCode: movement.dispatchCode || "Sem código",
      dispatchName: movement.dispatchName || "Despacho sem nome",
      tone: severityTone(movement.severity)
    });
    found += 1;
  });
  data.imports.unshift({
    id: crypto.randomUUID(),
    rpi: `RPI ${report.rpi || ""}`.trim(),
    date: report.publicationDate || iso(),
    importedAt: iso(),
    fileName,
    totalProcesses: report.totalProcesses || 0,
    matches,
    movements: found,
    source: "monitor-json"
  });
  window.save();
  window.view = "rpi";
  window.render();
  alert(`${found} novo(s) despacho(s) importado(s) do relatório para ${matches} processo(s) da carteira.`);
}

function importRpiXml(xmlText, fileName) {
  const sanitized = sanitizeXmlText(xmlText);
  const xml = new DOMParser().parseFromString(sanitized, "application/xml");
  if (xml.querySelector("parsererror")) throw new Error("O arquivo XML não pôde ser interpretado.");
  const magazine = xml.querySelector("revista");
  if (!magazine) throw new Error("O arquivo não contém a raiz <revista> esperada.");
  const rpiNumber = magazine.getAttribute("numero") || "RPI";
  const publicationDate = brToIso(magazine.getAttribute("data"));
  const tracked = new Map(data.processes.filter(p => p.number).map(p => [p.number.replace(/\D/g, ""), p]));
  let matches = 0;
  let found = 0;
  xml.querySelectorAll("processo").forEach(node => {
    const number = (node.getAttribute("numero") || "").replace(/\D/g, "");
    const process = tracked.get(number);
    if (!process) return;
    matches += 1;
    node.querySelectorAll(":scope > despachos > despacho").forEach(dispatch => {
      const dispatchName = dispatch.getAttribute("nome") || "Despacho sem nome";
      const dispatchCode = dispatch.getAttribute("codigo") || "Sem código";
      const movementId = `${rpiNumber}:${number}:${dispatchCode}`;
      if (data.movements.some(item => item.id === movementId)) return;
      const rule = dispatchRule.apply(dispatchName);
      process.status = rule.status || process.status;
      process.flowStage = rule.stage || process.flowStage;
      process.nextAction = rule.action;
      process.lastRpi = `RPI ${rpiNumber}`;
      process.lastDispatchCode = dispatchCode;
      process.lastDispatchName = dispatchName;
      process.lastPublicationDate = publicationDate;
      if (rule.legalDays) process.legalDeadline = addDays(publicationDate, rule.legalDays);
      if (rule.internalDays) process.internalDeadline = addDays(publicationDate, rule.internalDays);
      data.movements.unshift({ id: movementId, rpi: `RPI ${rpiNumber}`, publicationDate, importedAt: iso(), processId: process.id, processNumber: number, brand: process.brand, dispatchCode, dispatchName, tone: rule.tone });
      found += 1;
    });
  });
  data.imports.unshift({ id: crypto.randomUUID(), rpi: `RPI ${rpiNumber}`, date: publicationDate, importedAt: iso(), fileName, totalProcesses: xml.querySelectorAll("processo").length, matches, movements: found });
  window.save();
  window.view = "rpi";
  window.render();
  alert(`${found} despacho(s) importado(s) para ${matches} processo(s) da carteira. Confira os resultados no PDF oficial.`);
}

function exportTrackedPortfolio() {
  const processes = data.processes.filter(item => item.number).map(item => ({
    number: item.number.replace(/\D/g, ""),
    brand: item.brand,
    client: client(item.clientId).name,
    clientDocument: client(item.clientId).document || "",
    classes: item.classes,
    classList: window.parseClasses(item.classes),
    presentation: item.presentation,
    flowStage: item.flowStage,
    status: item.status,
    owner: item.owner,
    nextAction: item.nextAction,
    filingDate: item.filingDate,
    legalDeadline: item.legalDeadline,
    internalDeadline: item.internalDeadline,
    lastRpi: item.lastRpi,
    lastDispatchCode: item.lastDispatchCode,
    lastDispatchName: item.lastDispatchName,
    lastPublicationDate: item.lastPublicationDate,
    nature: item.nature,
    specification: item.specification,
    salesChannels: item.salesChannels,
    geographicScope: item.geographicScope,
    logoReference: item.logoReference,
    priorRisk: item.priorRisk,
    notes: item.notes
  }));
  downloadJson({ exportedAt: new Date().toISOString(), source: "MarcaFlow", processes }, "carteira-monitorada.json");
}

export { dispatchRule, severityTone, movementIdFromReport, parseCsv, standardizeImportedProcess, importPortfolio, importMonitorReportJson, importRpiXml, exportTrackedPortfolio };
