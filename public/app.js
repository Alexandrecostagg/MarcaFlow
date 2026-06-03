const STORAGE_KEY = "marcaflow-v1";

const today = new Date();
const iso = (offset = 0) => {
  const date = new Date(today);
  date.setDate(date.getDate() + offset);
  return date.toISOString().slice(0, 10);
};

const seed = {
  clients: [
    { id: "c1", name: "Ateliê Aurora Ltda.", document: "48.725.190/0001-40", email: "contato@aurora.com.br", phone: "(91) 99120-0430", profile: "ME", contact: "Marina Costa" },
    { id: "c2", name: "Norte Vivo Alimentos", document: "52.801.630/0001-18", email: "juridico@nortevivo.com.br", phone: "(91) 98810-7214", profile: "EPP", contact: "Rafael Alves" },
    { id: "c3", name: "Lucas Freire", document: "019.445.872-60", email: "lucas@orbita.digital", phone: "(91) 99221-4400", profile: "Pessoa física", contact: "Lucas Freire" },
    { id: "c4", name: "Verde Rota Turismo", document: "37.530.821/0001-44", email: "contato@verderota.com", phone: "(91) 98402-2201", profile: "MEI", contact: "Isabela Mendes" }
  ],
  processes: [
    { id: "p1", brand: "AURORA ATELIÊ", clientId: "c1", number: "927845610", classes: "25, 35", flowStage: "Publicação", filingDate: iso(-38), presentation: "Mista", status: "Publicado na RPI", owner: "Alexandre", nextAction: "Monitorar prazo de oposição", lastRpi: "RPI 2891", lastDispatchCode: "003", legalDeadline: iso(8), internalDeadline: iso(4), notes: "Pedido publicado. Verificar semanalmente eventual oposição de terceiros." },
    { id: "p2", brand: "NORTE VIVO", clientId: "c2", number: "927701482", classes: "29, 30", flowStage: "Exame", filingDate: iso(-96), presentation: "Mista", status: "Com exigência", owner: "Alexandre", nextAction: "Responder exigência formal", lastRpi: "RPI 2891", lastDispatchCode: "340", legalDeadline: iso(3), internalDeadline: iso(1), notes: "Prazo curto. Conferir especificação dos produtos antes do envio." },
    { id: "p3", brand: "ÓRBITA DIGITAL", clientId: "c3", number: "926941233", classes: "42", flowStage: "Exame", filingDate: iso(-160), presentation: "Nominativa", status: "Em exame", owner: "Alexandre", nextAction: "Aguardar exame de mérito", lastRpi: "", lastDispatchCode: "", legalDeadline: "", internalDeadline: "", notes: "Sem pendências abertas." },
    { id: "p4", brand: "VERDE ROTA", clientId: "c4", number: "", classes: "39", flowStage: "Busca prévia", filingDate: "", presentation: "Mista", status: "Preparação", owner: "Alexandre", nextAction: "Concluir busca de anterioridade", lastRpi: "", lastDispatchCode: "", legalDeadline: iso(12), internalDeadline: iso(9), notes: "Avaliar variações fonéticas e pesquisar radical ROTA na classe 39." },
    { id: "p5", brand: "CASA NORTE", clientId: "c2", number: "925221094", classes: "43", flowStage: "Oposição", filingDate: iso(-260), presentation: "Mista", status: "Com oposição", owner: "Alexandre", nextAction: "Preparar manifestação à oposição", lastRpi: "RPI 2889", lastDispatchCode: "332", legalDeadline: iso(18), internalDeadline: iso(12), notes: "Caso técnico. Separar documentos de uso anterior e avaliar colidência visual." },
    { id: "p6", brand: "LUMI", clientId: "c1", number: "921884702", classes: "3", flowStage: "Registro", filingDate: "2023-04-18", presentation: "Nominativa", status: "Registrado", owner: "Alexandre", nextAction: "Monitorar renovação", lastRpi: "RPI 2780", lastDispatchCode: "400", legalDeadline: "2034-04-18", internalDeadline: "2033-10-18", notes: "Certificado arquivado. Criar alerta antecipado de renovação." }
  ],
  documents: [
    { id: "d1", processId: "p1", type: "Protocolo", name: "protocolo-927845610.pdf", date: iso(-22) },
    { id: "d2", processId: "p2", type: "Despacho", name: "exigencia-formal-927701482.pdf", date: iso(-2) },
    { id: "d3", processId: "p5", type: "RPI", name: "oposicao-casa-norte.pdf", date: iso(-5) },
    { id: "d4", processId: "p6", type: "Certificado", name: "certificado-lumi.pdf", date: "2024-04-18" }
  ],
  movements: [],
  imports: []
};

const flowStageByStatus = {
  Preparação: "Busca prévia",
  Protocolado: "Depósito",
  "Publicado na RPI": "Publicação",
  "Em exame": "Exame",
  Deferido: "Concessão",
  Registrado: "Registro",
  "Com exigência": "Exame",
  "Com oposição": "Oposição",
  Indeferido: "Recurso"
};
const funnelStages = ["Busca prévia", "Depósito", "Publicação", "Exame", "Oposição", "Recurso", "Concessão", "Registro", "Renovação"];
const riskLabels = {
  overdue: "Vencido",
  today: "Hoje",
  critical: "Crítico",
  warning: "Atenção",
  ok: "Em dia"
};

let data = load();
let view = "dashboard";
let query = "";
let cloudUser = null;
let cloudSaveTimer = null;
let loadingCloudData = false;

function load() {
  const saved = localStorage.getItem(STORAGE_KEY);
  return saved ? JSON.parse(saved) : structuredClone(seed);
}
function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  if (!cloudUser || loadingCloudData || !window.marcaFlowCloud) return;
  clearTimeout(cloudSaveTimer);
  cloudSaveTimer = setTimeout(() => window.marcaFlowCloud.saveWorkspace(data).catch(showCloudError), 500);
}
function ensureCollections() {
  data.movements ||= [];
  data.imports ||= [];
  data.processes.forEach((item) => {
    item.flowStage ||= flowStageByStatus[item.status] || "Exame";
    item.filingDate ||= "";
    item.lastRpi ||= "";
    item.lastDispatchCode ||= "";
    item.lastDispatchName ||= "";
    item.lastPublicationDate ||= "";
  });
}
function client(id) { return data.clients.find((item) => item.id === id) || { name: "Cliente não informado" }; }
function processById(id) { return data.processes.find((item) => item.id === id); }
function formatDate(value) {
  if (!value) return "Sem prazo";
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(`${value}T12:00:00`));
}
function daysUntil(value) {
  if (!value) return Infinity;
  const end = new Date(`${value}T12:00:00`);
  const start = new Date(`${iso()}T12:00:00`);
  return Math.ceil((end - start) / 86400000);
}
function statusTone(status) {
  if (["Registrado", "Deferido"].includes(status)) return "green";
  if (["Protocolado", "Publicado na RPI", "Em exame"].includes(status)) return "blue";
  if (["Com exigência", "Preparação"].includes(status)) return "amber";
  if (["Com oposição", "Indeferido"].includes(status)) return "red";
  return "gray";
}
function filterProcesses(items = data.processes) {
  const term = query.trim().toLowerCase();
  if (!term) return items;
  return items.filter((item) => [item.brand, item.number, item.status, item.flowStage, item.classes, item.lastRpi, item.lastDispatchCode, client(item.clientId).name].join(" ").toLowerCase().includes(term));
}
function urgentProcesses() {
  return data.processes.filter((item) => daysUntil(item.internalDeadline) <= 7).sort((a, b) => daysUntil(a.internalDeadline) - daysUntil(b.internalDeadline));
}
function processRisk(item) {
  const days = daysUntil(item.internalDeadline);
  if (days < 0) return "overdue";
  if (days === 0) return "today";
  if (days <= 2) return "critical";
  if (days <= 7) return "warning";
  return "ok";
}
function legalRisk(item) {
  const days = daysUntil(item.legalDeadline);
  if (days < 0) return "overdue";
  if (days <= 2) return "critical";
  if (days <= 7) return "warning";
  return "ok";
}
function riskTone(risk) {
  return ({ overdue: "red", today: "red", critical: "red", warning: "amber", ok: "green" })[risk] || "gray";
}
function openModal(id) { document.getElementById(id).showModal(); }
function closeModal(id) { document.getElementById(id).close(); }
function showCloudError(error) {
  console.error(error);
  alert("Não foi possível sincronizar com o Firebase. Os dados continuam salvos neste navegador.");
}
function updateCloudUi() {
  const label = document.getElementById("cloud-auth-label");
  const dot = document.querySelector(".cloud-dot");
  if (!label || !dot) return;
  label.textContent = cloudUser ? "Sincronizado" : "Modo local";
  dot.classList.toggle("online", Boolean(cloudUser));
}
async function loadCloudWorkspace() {
  if (!cloudUser || !window.marcaFlowCloud) return;
  try {
    const remote = await window.marcaFlowCloud.loadWorkspace();
    if (remote) {
      loadingCloudData = true;
      data = remote;
      ensureCollections();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      loadingCloudData = false;
      render();
      return;
    }
    await window.marcaFlowCloud.saveWorkspace(data);
  } catch (error) {
    loadingCloudData = false;
    showCloudError(error);
  }
}

function metric(label, value, note, icon) {
  return `<article class="metric"><div class="metric-top"><span>${label}</span><span class="metric-icon">${icon}</span></div><strong>${value}</strong><small>${note}</small></article>`;
}
function processRows(items) {
  if (!items.length) return `<tr><td colspan="7" class="empty">Nenhum processo encontrado.</td></tr>`;
  return items.map((item) => {
    const deadlineDays = daysUntil(item.internalDeadline);
    const deadlineClass = deadlineDays < 0 ? "deadline overdue" : "deadline";
    const deadline = item.internalDeadline ? formatDate(item.internalDeadline) : "Sem prazo";
    return `<tr data-id="${item.id}" class="process-row">
      <td><span class="brand-name">${item.brand}</span><br><span class="subtle">${client(item.clientId).name}</span></td>
      <td>${item.number || '<span class="subtle">Pré-depósito</span>'}</td>
      <td>${item.classes}</td>
      <td>${item.flowStage}</td>
      <td><span class="badge ${statusTone(item.status)}">${item.status}</span></td>
      <td>${item.nextAction}</td>
      <td class="${item.internalDeadline ? deadlineClass : ""}">${deadline}</td>
    </tr>`;
  }).join("");
}
function processTable(items) {
  return `<div class="table-wrap"><table><thead><tr><th>Marca / cliente</th><th>Processo</th><th>Classe</th><th>Etapa</th><th>Status</th><th>Próxima ação</th><th>Prazo interno</th></tr></thead><tbody>${processRows(items)}</tbody></table></div>`;
}

function dashboard() {
  const active = data.processes.filter((p) => !["Registrado"].includes(p.status)).length;
  const alerts = urgentProcesses();
  const registered = data.processes.filter((p) => p.status === "Registrado").length;
  const statusCounts = Object.entries(data.processes.reduce((acc, p) => ({ ...acc, [p.status]: (acc[p.status] || 0) + 1 }), {}));
  const legalAlerts = data.processes.filter((item) => ["overdue", "critical", "warning"].includes(legalRisk(item))).length;
  return `
    <div class="page-head"><div><h2>Operação em um só lugar</h2><p>Acompanhe os pedidos, organize prazos e mantenha a carteira sob controle.</p></div><span class="subtle">Atualizado em ${formatDate(iso())}</span></div>
    <section class="metric-grid">
      ${metric("Processos ativos", active, `${data.processes.length} processos na carteira`, "▤")}
      ${metric("Prazos próximos", alerts.length, "Até 7 dias ou vencidos", "◷")}
      ${metric("Risco legal", legalAlerts, "Prazos legais em alerta", "!")}
      ${metric("Clientes", data.clients.length, "Titulares cadastrados", "♙")}
      ${metric("Marcas registradas", registered, "Certificados arquivados", "✓")}
    </section>
    <section class="dashboard-grid">
      <div class="stack">
        <article class="panel"><div class="panel-header"><div><h3>Processos recentes</h3><p>Carteira priorizada por movimentação</p></div><button class="text-button" data-go="processes">Ver todos →</button></div>${processTable(filterProcesses(data.processes).slice(0, 5))}</article>
        <article class="panel"><div class="panel-header"><div><h3>Distribuição da carteira</h3><p>Status atuais dos pedidos</p></div></div><div class="panel-body">${statusCounts.map(([status, count]) => `<div class="progress-row"><span>${status}</span><div class="bar"><span style="width:${Math.max(8, count / data.processes.length * 100)}%"></span></div><strong>${count}</strong></div>`).join("")}</div></article>
      </div>
      <div class="stack">
        <article class="panel"><div class="panel-header"><div><h3>Agenda prioritária</h3><p>Prazos internos mais próximos</p></div><button class="text-button" data-go="deadlines">Agenda →</button></div><div class="panel-body timeline">${deadlineList(alerts.slice(0, 4))}</div></article>
        <article class="panel"><div class="panel-header"><div><h3>Alertas operacionais</h3><p>Itens que pedem atenção</p></div></div><div class="panel-body alert-list">${alertList()}</div></article>
      </div>
    </section>`;
}
function deadlineList(items) {
  if (!items.length) return `<div class="empty">Nenhum prazo próximo.</div>`;
  return items.map((item) => {
    const days = daysUntil(item.internalDeadline);
    const label = days < 0 ? `${Math.abs(days)}d atrasado` : days === 0 ? "Hoje" : `${days}d`;
    return `<div class="timeline-item"><div class="timeline-date ${days <= 2 ? "urgent" : ""}">${label}</div><div><strong>${item.nextAction}</strong><span>${item.brand} · ${formatDate(item.internalDeadline)}</span></div></div>`;
  }).join("");
}
function alertList() {
  const alerts = urgentProcesses();
  if (!alerts.length) return `<div class="empty">Nenhum alerta crítico.</div>`;
  return alerts.slice(0, 3).map((item) => `<div class="alert-item"><div class="alert-icon">!</div><div><strong>${item.brand}</strong><span>${item.nextAction} · prazo interno ${formatDate(item.internalDeadline)}</span></div></div>`).join("");
}
function processes() {
  return `<div class="page-head"><div><h2>Processos de marcas</h2><p>Gerencie depósitos, publicações, exigências, oposições e registros.</p></div><button class="primary-button" id="page-new-process"><span>＋</span>Novo processo</button></div>
    <article class="panel">
      <div class="filters"><div class="filter-row"><select id="status-filter"><option value="">Todos os status</option>${[...new Set(data.processes.map(p => p.status))].map(s => `<option>${s}</option>`).join("")}</select><select id="stage-filter"><option value="">Todas as etapas</option>${[...new Set(data.processes.map(p => p.flowStage))].map(s => `<option>${s}</option>`).join("")}</select><select id="class-filter"><option value="">Todas as classes</option>${[...new Set(data.processes.flatMap(p => p.classes.split(",").map(c => c.trim())))].sort((a,b) => Number(a)-Number(b)).map(c => `<option>${c}</option>`).join("")}</select></div><span class="subtle">${filterProcesses().length} resultados</span></div>
      <div id="process-table">${processTable(filterProcesses())}</div>
    </article>`;
}
function funnel() {
  const columns = funnelStages.map((stage) => {
    const items = filterProcesses(data.processes.filter((item) => item.flowStage === stage));
    const cards = items.map((item) => {
      const risk = processRisk(item);
      return `<button class="funnel-card process-row" data-id="${item.id}">
        <span class="funnel-brand">${item.brand}</span>
        <span>${item.number || "Pré-depósito"} · ${client(item.clientId).name}</span>
        <span>${item.nextAction}</span>
        <strong class="${riskTone(risk)}">${riskLabels[risk]} · ${formatDate(item.internalDeadline)}</strong>
      </button>`;
    }).join("");
    return `<section class="funnel-column"><div class="funnel-head"><strong>${stage}</strong><span>${items.length}</span></div>${cards || '<div class="funnel-empty">Sem processos</div>'}</section>`;
  }).join("");
  return `<div class="page-head"><div><h2>Funil de marcas</h2><p>Visualize a carteira por etapa operacional e priorize o que precisa andar.</p></div><button class="primary-button" id="page-new-process"><span>＋</span>Novo processo</button></div>
    <section class="funnel-board">${columns}</section>`;
}
function clients() {
  const cards = data.clients.filter((c) => !query || [c.name, c.document, c.email, c.contact].join(" ").toLowerCase().includes(query.toLowerCase())).map((item) => {
    const count = data.processes.filter(p => p.clientId === item.id).length;
    return `<article class="client-card"><div class="client-card-top"><div><h3>${item.name}</h3><span class="badge gray">${item.profile}</span></div><button class="icon-button" title="Detalhes do cliente">⋯</button></div><p>${item.document}</p><p>${item.email || "E-mail não informado"}</p><p>${item.phone || "Telefone não informado"}</p><div class="client-card-footer"><span>${count} processo(s)</span><span>${item.contact || "Sem contato"}</span></div></article>`;
  }).join("");
  return `<div class="page-head"><div><h2>Clientes</h2><p>Titulares e contatos vinculados à carteira.</p></div><button class="primary-button" id="page-new-client"><span>＋</span>Novo cliente</button></div><section class="client-grid">${cards || '<div class="empty">Nenhum cliente encontrado.</div>'}</section>`;
}
function deadlines() {
  const sorted = data.processes.filter(p => p.internalDeadline).sort((a,b) => a.internalDeadline.localeCompare(b.internalDeadline));
  const alerts = sorted.filter((item) => processRisk(item) !== "ok" || legalRisk(item) !== "ok");
  return `<div class="page-head"><div><h2>Agenda de prazos</h2><p>Datas internas antecipam a entrega e reduzem risco operacional.</p></div></div>
    <section class="alert-grid">${deadlineAlertCards(alerts)}</section>
    <article class="panel">${processTable(filterProcesses(sorted))}</article>`;
}
function deadlineAlertCards(items) {
  if (!items.length) return `<article class="panel"><div class="empty">Nenhum prazo em alerta.</div></article>`;
  return items.slice(0, 6).map((item) => {
    const internal = processRisk(item);
    const legal = legalRisk(item);
    return `<article class="alert-card ${riskTone(internal)}">
      <div><span class="badge ${riskTone(internal)}">${riskLabels[internal]}</span><h3>${item.brand}</h3><p>${item.nextAction}</p></div>
      <div class="alert-card-dates"><span>Interno: ${formatDate(item.internalDeadline)}</span><span>Legal: ${formatDate(item.legalDeadline)}</span><span>Risco legal: ${riskLabels[legal]}</span></div>
    </article>`;
  }).join("");
}
function documents() {
  const docs = data.documents.filter((d) => {
    const process = processById(d.processId);
    return !query || [d.name, d.type, process?.brand].join(" ").toLowerCase().includes(query.toLowerCase());
  });
  const rows = docs.map(d => `<tr><td><span class="doc-icon">▧</span></td><td><span class="brand-name">${d.name}</span><br><span class="subtle">${processById(d.processId)?.brand || "Sem processo"}</span></td><td>${d.type}</td><td>${formatDate(d.date)}</td><td><button class="text-button">Visualizar</button></td></tr>`).join("");
  return `<div class="page-head"><div><h2>Documentos</h2><p>Central de protocolos, GRUs, despachos e certificados.</p></div><button class="secondary-button">＋ Adicionar documento</button></div><article class="panel"><div class="table-wrap"><table><thead><tr><th></th><th>Arquivo / marca</th><th>Tipo</th><th>Data</th><th></th></tr></thead><tbody>${rows || '<tr><td colspan="5" class="empty">Nenhum documento encontrado.</td></tr>'}</tbody></table></div></article>`;
}
function rpi() {
  const latest = data.imports[0];
  const movements = data.movements.slice(0, 8);
  const trackedCount = data.processes.filter(item => item.number).length;
  return `<div class="page-head"><div><h2>Monitor RPI</h2><p>Importe o XML simplificado da seção de marcas e cruze os despachos com sua carteira.</p></div><div class="page-actions"><a class="link-button" href="https://revistas.inpi.gov.br/rpi/" target="_blank" rel="noreferrer">Abrir portal RPI ↗</a><button class="secondary-button" id="export-tracked-portfolio"><span>⇩</span>Exportar carteira</button><button class="primary-button" id="select-rpi-file"><span>↥</span>Importar XML</button></div></div>
    <div class="notice">O XML facilita a triagem, mas não substitui a publicação oficial. Antes de cumprir prazo ou tomar decisão processual, confira o PDF da seção V de Marcas no portal da RPI.</div>
    <section class="rpi-grid" style="margin-top:15px">
      <div class="stack">
        <article class="panel"><div class="panel-header"><div><h3>Leitura de arquivo</h3><p>Processamento local: nenhum dado é enviado pela internet</p></div></div><div class="panel-body">
          <div class="upload-zone"><div><div class="upload-icon">↥</div><strong>Selecione o XML de Marcas da RPI</strong><span>Use o arquivo RMxxxx.xml extraído do ZIP oficial do INPI. O sistema guarda somente os despachos vinculados aos seus processos.</span><button class="primary-button" id="upload-rpi-file">Escolher arquivo XML</button></div></div>
        </div></article>
        <article class="panel"><div class="panel-header"><div><h3>Movimentações encontradas</h3><p>Despachos recentes vinculados à carteira</p></div></div><div class="panel-body movement-list">${movementList(movements)}</div></article>
      </div>
      <div class="stack">
        <article class="panel"><div class="panel-header"><div><h3>Carteira do robô</h3><p>${trackedCount} processo(s) numerado(s) prontos para monitoramento</p></div></div><div class="panel-body"><div class="notice quiet">A exportação gera o arquivo carteira-monitorada.json com titular, etapa, classes, prazos e último despacho. Use esse arquivo para alimentar a rotina semanal instalada no macOS.</div><button class="secondary-button full-width" id="export-tracked-portfolio-side"><span>⇩</span>Exportar carteira monitorada</button></div></article>
        <article class="panel"><div class="panel-header"><div><h3>Última importação</h3><p>${latest ? `${latest.rpi} · ${formatDate(latest.date)}` : "Nenhum XML processado"}</p></div></div><div class="panel-body">${latest ? `<div class="import-summary"><div><strong>${latest.totalProcesses}</strong><span>Processos no XML</span></div><div><strong>${latest.matches}</strong><span>Na carteira</span></div><div><strong>${latest.movements}</strong><span>Despachos</span></div></div><span class="subtle">${latest.fileName}</span>` : '<div class="empty">Importe um XML para iniciar o monitoramento.</div>'}</div></article>
        <article class="panel"><div class="panel-header"><div><h3>Fluxo recomendado</h3><p>Rotina semanal de conferência</p></div></div><div class="panel-body timeline">
          <div class="timeline-item"><div class="timeline-date">1</div><div><strong>Baixar a seção V</strong><span>Obtenha XML e PDF no portal oficial da RPI.</span></div></div>
          <div class="timeline-item"><div class="timeline-date">2</div><div><strong>Importar o XML</strong><span>O painel cruza automaticamente os processos.</span></div></div>
          <div class="timeline-item"><div class="timeline-date">3</div><div><strong>Conferir o PDF</strong><span>Valide cada despacho encontrado na publicação oficial.</span></div></div>
          <div class="timeline-item"><div class="timeline-date">4</div><div><strong>Executar tarefas</strong><span>Trate prazos internos antes das datas legais.</span></div></div>
        </div></article>
      </div>
    </section>`;
}
function agent() {
  return `<div class="page-head"><div><h2>Agente INPI</h2><p>Consulte a base do guia e transforme respostas em próximos passos operacionais.</p></div><a class="link-button" href="https://manualdemarcas.inpi.gov.br/projects/manual/wiki/Manual_de_Marcas" target="_blank" rel="noreferrer">Manual de Marcas ↗</a></div>
    <section class="agent-grid">
      <article class="panel"><div class="panel-header"><div><h3>Perguntar</h3><p>Busca local em fontes carregadas no MarcaFlow</p></div></div><div class="panel-body">
        <form id="agent-form" class="agent-form">
          <textarea name="question" rows="4" placeholder="Ex.: Recebi exigência formal. Qual prazo e o que devo conferir?"></textarea>
          <button class="primary-button" type="submit">Responder com fontes</button>
        </form>
        <div class="quick-prompts">
          <button type="button" data-agent-question="Qual o fluxo de um pedido de marca no INPI?">Fluxo do pedido</button>
          <button type="button" data-agent-question="Como controlar prazo de oposição e manifestação?">Oposição</button>
          <button type="button" data-agent-question="O que conferir antes de depositar uma marca?">Pré-depósito</button>
          <button type="button" data-agent-question="O que fazer depois do deferimento?">Deferimento</button>
        </div>
      </div></article>
      <article class="panel"><div class="panel-header"><div><h3>Resposta</h3><p>Rascunho operacional, não parecer jurídico</p></div></div><div class="panel-body" id="agent-answer">${agentIntro()}</div></article>
    </section>
    <article class="panel"><div class="panel-header"><div><h3>Fontes carregadas</h3><p>${(window.marcaFlowKnowledge || []).length} bloco(s) indexado(s)</p></div></div><div class="panel-body source-grid">${knowledgeSources()}</div></article>`;
}
function agentIntro() {
  return `<div class="notice quiet">Faça uma pergunta sobre fluxo, prazos, busca, GRU, RPI, oposição, exigência ou deferimento. O agente responde usando os blocos carregados e mostra as fontes usadas.</div>`;
}
function knowledgeSources() {
  return (window.marcaFlowKnowledge || []).map(item => `<a class="source-card" href="${item.url}" target="_blank" rel="noreferrer"><strong>${item.title}</strong><span>${item.source}</span></a>`).join("");
}
function tokenize(text) {
  return String(text || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().split(/[^a-z0-9]+/).filter(token => token.length > 2);
}
function retrieveKnowledge(question) {
  const terms = tokenize(question);
  return (window.marcaFlowKnowledge || []).map((item) => {
    const haystack = tokenize(`${item.title} ${item.text} ${item.source}`);
    const score = terms.reduce((sum, term) => sum + haystack.filter(word => word.includes(term) || term.includes(word)).length, 0);
    return { ...item, score };
  }).filter(item => item.score > 0).sort((a, b) => b.score - a.score).slice(0, 3);
}
function answerQuestion(question) {
  const matches = retrieveKnowledge(question);
  if (!matches.length) {
    return `<div class="empty">Não encontrei base suficiente para responder. Tente mencionar termos como RPI, oposição, exigência, GRU, busca, deferimento ou renovação.</div>`;
  }
  const checklist = buildChecklist(question);
  return `<div class="agent-response"><h3>Resposta operacional</h3><p>${matches[0].text}</p>${checklist}<div class="notice">Confira a publicação oficial e o Manual de Marcas vigente antes de cumprir prazo ou tomar decisão processual.</div><h3>Fontes usadas</h3>${matches.map(item => `<a class="source-card" href="${item.url}" target="_blank" rel="noreferrer"><strong>${item.title}</strong><span>${item.source}</span><p>${item.text}</p></a>`).join("")}</div>`;
}
function buildChecklist(question) {
  const text = question.toLowerCase();
  const items = [];
  if (text.includes("oposi")) items.push("Localizar a publicação da oposição na RPI e conferir o inteiro teor.", "Registrar prazo legal de 60 dias e prazo interno antecipado.", "Separar provas de uso, distintividade e diferenças entre sinais/produtos.");
  if (text.includes("exig")) items.push("Identificar se a exigência é formal ou de mérito.", "Conferir o prazo aplicável antes de protocolar resposta.", "Anexar documentos e justificativas no e-Marcas com GRU quando aplicável.");
  if (text.includes("busca") || text.includes("deposit")) items.push("Classificar produtos e serviços antes da busca.", "Pesquisar marcas semelhantes por palavra-chave, titular e classe.", "Guardar evidências da busca e riscos encontrados.");
  if (text.includes("defer") || text.includes("concess")) items.push("Acompanhar concessão e emissão do certificado.", "Arquivar certificado e atualizar status para registro.", "Criar alerta de renovação para o nono ano de vigência.");
  if (!items.length) items.push("Conferir a etapa atual do processo.", "Validar o despacho no PDF oficial da RPI.", "Registrar próxima ação, prazo legal e prazo interno no MarcaFlow.");
  return `<ul class="agent-checklist">${items.map(item => `<li>${item}</li>`).join("")}</ul>`;
}
function movementList(items) {
  if (!items.length) return `<div class="empty">Nenhuma movimentação importada.</div>`;
  return items.map(item => `<div class="movement"><div class="movement-top"><strong>${item.brand}</strong><span class="badge ${item.tone}">${item.rpi}</span></div><span>${item.dispatchName}</span><span>${item.processNumber} · importado em ${formatDate(item.importedAt)}</span><div class="movement-code">${item.dispatchCode}</div></div>`).join("");
}
function render() {
  document.getElementById("page-title").textContent = ({ dashboard: "Visão geral", processes: "Processos", funnel: "Funil", clients: "Clientes", deadlines: "Agenda", documents: "Documentos", rpi: "Monitor RPI", agent: "Agente INPI" })[view];
  document.getElementById("app-view").innerHTML = ({ dashboard, processes, funnel, clients, deadlines, documents, rpi, agent })[view]();
  document.querySelectorAll(".nav-item[data-view]").forEach((button) => button.classList.toggle("active", button.dataset.view === view));
  document.getElementById("alert-count").textContent = urgentProcesses().length;
  bindViewEvents();
}
function bindViewEvents() {
  document.querySelectorAll(".process-row").forEach(row => row.addEventListener("click", () => showDetails(row.dataset.id)));
  document.querySelectorAll("[data-go]").forEach(button => button.addEventListener("click", () => { view = button.dataset.go; render(); }));
  document.getElementById("page-new-process")?.addEventListener("click", showProcessForm);
  document.getElementById("page-new-client")?.addEventListener("click", () => openModal("client-modal"));
  document.getElementById("status-filter")?.addEventListener("change", applyProcessFilters);
  document.getElementById("stage-filter")?.addEventListener("change", applyProcessFilters);
  document.getElementById("class-filter")?.addEventListener("change", applyProcessFilters);
  document.getElementById("select-rpi-file")?.addEventListener("click", selectRpiFile);
  document.getElementById("upload-rpi-file")?.addEventListener("click", selectRpiFile);
  document.getElementById("export-tracked-portfolio")?.addEventListener("click", exportTrackedPortfolio);
  document.getElementById("export-tracked-portfolio-side")?.addEventListener("click", exportTrackedPortfolio);
  document.getElementById("agent-form")?.addEventListener("submit", handleAgentSubmit);
  document.querySelectorAll("[data-agent-question]").forEach(button => button.addEventListener("click", () => {
    const form = document.getElementById("agent-form");
    form.question.value = button.dataset.agentQuestion;
    document.getElementById("agent-answer").innerHTML = answerQuestion(form.question.value);
  }));
}
function handleAgentSubmit(event) {
  event.preventDefault();
  const question = new FormData(event.currentTarget).get("question");
  document.getElementById("agent-answer").innerHTML = answerQuestion(question);
}
function applyProcessFilters() {
  const status = document.getElementById("status-filter").value;
  const stage = document.getElementById("stage-filter").value;
  const className = document.getElementById("class-filter").value;
  const items = filterProcesses().filter(p => (!status || p.status === status) && (!stage || p.flowStage === stage) && (!className || p.classes.split(",").map(c => c.trim()).includes(className)));
  document.getElementById("process-table").innerHTML = processTable(items);
  document.querySelectorAll(".process-row").forEach(row => row.addEventListener("click", () => showDetails(row.dataset.id)));
}
function showProcessForm() {
  const select = document.getElementById("process-client-select");
  select.innerHTML = data.clients.map(c => `<option value="${c.id}">${c.name}</option>`).join("");
  openModal("process-modal");
}
function showDetails(id) {
  const item = processById(id);
  const relatedDocs = data.documents.filter(d => d.processId === id);
  document.getElementById("detail-content").innerHTML = `<div class="dialog-header"><div><p class="eyebrow">Processo ${item.number || "em preparação"}</p><h2>${item.brand}</h2></div><button class="close-button" id="close-detail" title="Fechar">×</button></div>
    <span class="badge ${statusTone(item.status)}">${item.status}</span>
    <div class="detail-grid">
      <div class="detail-item"><span>Cliente</span><strong>${client(item.clientId).name}</strong></div>
      <div class="detail-item"><span>Classe(s)</span><strong>${item.classes}</strong></div>
      <div class="detail-item"><span>Etapa</span><strong>${item.flowStage}</strong></div>
      <div class="detail-item"><span>Apresentação</span><strong>${item.presentation}</strong></div>
      <div class="detail-item"><span>Data de depósito</span><strong>${formatDate(item.filingDate)}</strong></div>
      <div class="detail-item"><span>Última RPI</span><strong>${item.lastRpi || "Sem RPI vinculada"}</strong></div>
      <div class="detail-item"><span>Último despacho</span><strong>${item.lastDispatchCode || "Sem despacho"}</strong></div>
      <div class="detail-item"><span>Próxima ação</span><strong>${item.nextAction}</strong></div>
      <div class="detail-item"><span>Prazo legal</span><strong>${formatDate(item.legalDeadline)}</strong></div>
      <div class="detail-item"><span>Prazo interno</span><strong>${formatDate(item.internalDeadline)}</strong></div>
    </div>
    <p class="detail-notes">${item.notes || "Sem observações."}</p>
    <div class="panel-header"><div><h3>Documentos vinculados</h3><p>${relatedDocs.length} arquivo(s)</p></div></div>
    <div class="panel-body doc-list">${relatedDocs.map(d => `<div class="doc-item"><div class="doc-icon">▧</div><div><strong>${d.name}</strong><span>${d.type} · ${formatDate(d.date)}</span></div></div>`).join("") || '<span class="subtle">Nenhum documento vinculado.</span>'}</div>`;
  openModal("detail-modal");
  document.getElementById("close-detail").addEventListener("click", () => closeModal("detail-modal"));
}
function selectRpiFile() { document.getElementById("rpi-file-input").click(); }
function downloadJson(payload, fileName) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = Object.assign(document.createElement("a"), { href: url, download: fileName });
  link.click();
  URL.revokeObjectURL(url);
}
function parseClasses(value) {
  return String(value || "").split(",").map(item => item.trim()).filter(Boolean);
}
function exportTrackedPortfolio() {
  const processes = data.processes.filter(item => item.number).map(item => ({
    number: item.number.replace(/\D/g, ""),
    brand: item.brand,
    client: client(item.clientId).name,
    clientDocument: client(item.clientId).document || "",
    classes: item.classes,
    classList: parseClasses(item.classes),
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
    notes: item.notes
  }));
  downloadJson({ exportedAt: new Date().toISOString(), source: "MarcaFlow", processes }, "carteira-monitorada.json");
}
function brToIso(value) {
  if (!value) return iso();
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const [day, month, year] = value.split("/");
  return `${year}-${month}-${day}`;
}
function addDays(value, amount) {
  const date = new Date(`${value}T12:00:00`);
  date.setDate(date.getDate() + amount);
  return date.toISOString().slice(0, 10);
}
function dispatchRule(name) {
  const text = name.toLowerCase();
  if (text.includes("publicação de pedido") && text.includes("oposição")) return { status: "Publicado na RPI", stage: "Publicação", action: "Monitorar prazo de oposição", legalDays: 60, internalDays: 55, tone: "blue" };
  if (text.includes("oposição")) return { status: "Com oposição", stage: "Oposição", action: "Preparar manifestação à oposição", legalDays: 60, internalDays: 55, tone: "red" };
  if (text.includes("exigência formal")) return { status: "Com exigência", stage: "Exame", action: "Responder exigência formal", legalDays: 5, internalDays: 4, tone: "red" };
  if (text.includes("exigência")) return { status: "Com exigência", stage: "Exame", action: "Responder exigência", legalDays: 60, internalDays: 55, tone: "amber" };
  if (text.includes("indeferimento")) return { status: "Indeferido", stage: "Recurso", action: "Avaliar recurso contra indeferimento", legalDays: 60, internalDays: 55, tone: "red" };
  if (text.includes("concessão de registro")) return { status: "Registrado", stage: "Registro", action: "Baixar e arquivar certificado", tone: "green" };
  if (text.includes("deferimento do pedido")) return { status: "Deferido", stage: "Concessão", action: "Acompanhar concessão automática", tone: "green" };
  return { action: "Conferir despacho no PDF oficial", tone: "gray" };
}
function importRpiXml(xmlText, fileName) {
  const xml = new DOMParser().parseFromString(xmlText, "application/xml");
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
      const rule = dispatchRule(dispatchName);
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
  save();
  view = "rpi";
  render();
  alert(`${found} despacho(s) importado(s) para ${matches} processo(s) da carteira. Confira os resultados no PDF oficial.`);
}

document.querySelectorAll(".nav-item[data-view]").forEach(button => button.addEventListener("click", () => { view = button.dataset.view; render(); }));
document.querySelectorAll("[data-close]").forEach(button => button.addEventListener("click", () => closeModal(button.dataset.close)));
document.getElementById("open-process-modal").addEventListener("click", showProcessForm);
document.getElementById("global-search").addEventListener("input", event => { query = event.target.value; render(); });
document.getElementById("notification-button").addEventListener("click", () => { view = "deadlines"; render(); });
document.getElementById("cloud-auth-button").addEventListener("click", async () => {
  if (cloudUser && window.marcaFlowCloud) {
    await window.marcaFlowCloud.logout();
    return;
  }
  openModal("login-modal");
});
document.getElementById("login-form").addEventListener("submit", async event => {
  event.preventDefault();
  const error = document.getElementById("login-error");
  const values = Object.fromEntries(new FormData(event.currentTarget));
  error.textContent = "";
  try {
    await window.marcaFlowCloud.login(values.email, values.password);
    event.currentTarget.reset();
    closeModal("login-modal");
  } catch (loginError) {
    console.error(loginError);
    error.textContent = "Não foi possível entrar. Confira e-mail, senha e se o acesso foi autorizado.";
  }
});
window.addEventListener("marcaflow:auth", async event => {
  cloudUser = event.detail.user;
  updateCloudUi();
  if (cloudUser) await loadCloudWorkspace();
});
window.addEventListener("marcaflow:cloud-ready", updateCloudUi);
document.getElementById("rpi-file-input").addEventListener("change", async event => {
  const file = event.target.files[0];
  if (!file) return;
  try { importRpiXml(await file.text(), file.name); }
  catch (error) { alert(`Não foi possível importar: ${error.message}`); }
  event.target.value = "";
});
document.getElementById("export-data").addEventListener("click", () => {
  downloadJson(data, `marcaflow-backup-${iso()}.json`);
});
document.getElementById("process-form").addEventListener("submit", event => {
  event.preventDefault();
  const values = Object.fromEntries(new FormData(event.currentTarget));
  values.flowStage ||= flowStageByStatus[values.status] || "Busca prévia";
  values.lastDispatchName = "";
  values.lastPublicationDate = "";
  data.processes.unshift({ id: crypto.randomUUID(), ...values });
  save();
  event.currentTarget.reset();
  closeModal("process-modal");
  view = "processes";
  render();
});
document.getElementById("client-form").addEventListener("submit", event => {
  event.preventDefault();
  const values = Object.fromEntries(new FormData(event.currentTarget));
  data.clients.push({ id: crypto.randomUUID(), ...values });
  save();
  event.currentTarget.reset();
  closeModal("client-modal");
  view = "clients";
  render();
});

ensureCollections();
render();
