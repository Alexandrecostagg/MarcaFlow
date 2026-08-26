import { data, client, processById, save, ensureCollections, iso } from "./store.js";
import {
  flowStageByStatus, funnelStages, riskLabels,
  formatDate, daysUntil, statusTone, urgentProcesses,
  processRisk, legalRisk, riskTone, formatMoney,
  suggestedDiscountCategory, discountAssessment,
  discountCategoryOptions, discountStatusBadge,
  classByCode, classAffinity, recommendedClasses, calculateEstimate,
  availabilityRisk, parseClasses, filterProcesses, addDays, OFFICIAL_FEES
} from "./business.js";
import { metric, processRows, processTable, deadlineList, alertList, deadlineAlertCards, movementList, knowledgeSources } from "./views.js";
import { escapeHtml, openModal, closeModal, sanitizeAgentInput, showCloudError } from "./utils.js";
import {
  answerQuestion, agentIntro, renderAgentAnswer,
  agentProcessPayload, answerQuestionWithBackend,
  classificationIntakeAnswer, classificationResultAnswer,
  brandOptionsFor, availabilityDecision, feePaymentPlan,
  bindAgentAnswerEvents, clientUpdateForMovement, copyClientUpdate,
  parseAvailabilityCandidates
} from "./agent.js";
import { dispatchRule, importPortfolio, importMonitorReportJson, importRpiXml, exportTrackedPortfolio } from "./imports.js";
import { searchINPI, analyzeResults, renderSearchReport, handleAutomatedSearch, INPI_SEARCH_URL } from "./search.js";
import { checkUpcomingAlerts, renderAlertsPanel, alertsView, requestNotificationPermission, startAlertChecker } from "./alerts.js";
import { calculateGRUForRegistration, calculateGRUForRenewal, renderGRUPanel, handleDownloadGRUPDF, handleCopyGRUDetails } from "./gru.js";
import { analyzeAllAgainstTarget, renderAnteriorityReport } from "./antteriority.js";
import { petitionsView, showPetitionForm, handlePetitionSubmit } from "./petitions.js";
import { generateClientToken, validateClientToken, getClientProcesses, renderClientDashboard, generateClientLink } from "./client-dashboard.js";
import { syncWithEMarcas, renderSyncPanel, handleFullSync, handleIncrementalSync, handleSyncStatus } from "./emarcas.js";
import { addHonorario, addFatura, addGRUPaid, addExpense, calculateFinancialTotals, renderFinancialPanel, financialView, exportFinancialData } from "./financial.js";
import { generateProcessReport, generateClientSummaryReport, saveReportHTML } from "./reports.js";
import A11y from "./a11y.js";
import Analytics from "./analytics.js";
import Backup from "./backup.js";

// Expor para uso global
window.searchINPI = searchINPI;
window.analyzeResults = analyzeResults;
window.renderSearchReport = renderSearchReport;
window.handleAutomatedSearch = handleAutomatedSearch;
window.INPI_SEARCH_URL = INPI_SEARCH_URL;
window.checkUpcomingAlerts = checkUpcomingAlerts;
window.renderAlertsPanel = renderAlertsPanel;
window.alertsView = alertsView;
window.requestNotificationPermission = requestNotificationPermission;
window.startAlertChecker = startAlertChecker;
window.calculateGRUForRegistration = calculateGRUForRegistration;
window.calculateGRUForRenewal = calculateGRUForRenewal;
window.renderGRUPanel = renderGRUPanel;
window.handleDownloadGRUPDF = handleDownloadGRUPDF;
window.handleCopyGRUDetails = handleCopyGRUDetails;
window.analyzeAllAgainstTarget = analyzeAllAgainstTarget;
window.renderAnteriorityReport = renderAnteriorityReport;
window.petitionsView = petitionsView;
window.showPetitionForm = showPetitionForm;
window.handlePetitionSubmit = handlePetitionSubmit;
window.generateClientToken = generateClientToken;
window.validateClientToken = validateClientToken;
window.getClientProcesses = getClientProcesses;
window.renderClientDashboard = renderClientDashboard;
window.generateClientLink = generateClientLink;
window.syncWithEMarcas = syncWithEMarcas;
window.renderSyncPanel = renderSyncPanel;
window.handleFullSync = handleFullSync;
window.handleIncrementalSync = handleIncrementalSync;
window.handleSyncStatus = handleSyncStatus;
window.addHonorario = addHonorario;
window.addFatura = addFatura;
window.addGRUPaid = addGRUPaid;
window.addExpense = addExpense;
window.calculateFinancialTotals = calculateFinancialTotals;
window.renderFinancialPanel = renderFinancialPanel;
window.financialView = financialView;
window.exportFinancialData = exportFinancialData;
window.generateProcessReport = generateProcessReport;
window.generateClientSummaryReport = generateClientSummaryReport;
window.saveReportHTML = saveReportHTML;

let view = "dashboard";
let query = "";
let cloudUser = null;
let cloudSaveTimer = null;
let availabilityPrefill = null;

window.data = data;
window.view = view;
window.query = query;
window.save = save;
window.processById = processById;
window.client = client;
window.flowStageByStatus = flowStageByStatus;
window.FILTER_PROCESSES = filterProcesses;

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
      localStorage.setItem("marcaflow-v1", JSON.stringify(data));
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

let loadingCloudData = false;
let currentGRUProcess = null;
let currentAntteriorityBrand = "";
let currentAntteriorityClasses = [];

function emarcasView() {
  return `
    <div class="page-head"><div><h2>Integração com e-Marcas</h2><p>Sincronize dados com o sistema oficial do INPI.</p></div></div>
    <div class="notice">A integração com e-Marcas permite sincronizar status de processos automaticamente. Em produção, esta funcionalidade se conecta à API oficial do INPI.</div>
    ${renderSyncPanel()}
  `;
}

function antteriorityView() {
  return `
    <div class="page-head"><div><h2>Análise de Anterioridade</h2><p>Compare uma marca contra todas as outras da carteira.</p></div></div>
    <div class="notice">Esta análise usa algoritmos de similaridade fonética, visual e conceitual para identificar riscos de conflito entre marcas na sua carteira.</div>
    <section class="diagnosis-grid" style="margin-top:15px">
      <article class="panel"><div class="panel-header"><div><h3>Marca para analisar</h3><p>Informe a marca e classes que deseja comparar</p></div></div><div class="panel-body">
        <form id="antteriority-form" class="agent-form" onsubmit="handleAntterioritySearch(event)">
          <div class="form-grid">
            <label><span>Marca alvo</span><input required name="brand" placeholder="Ex.: AURORA" /></label>
            <label><span>Classes alvo</span><input required name="classes" placeholder="Ex.: 25, 35" /></label>
          </div>
          <button class="primary-button" type="submit">Analisar contra carteira</button>
        </form>
      </div></article>
      <article class="panel"><div class="panel-header"><div><h3>Resultado</h3><p>Análise de risco e similaridades</p></div></div><div class="panel-body" id="antteriority-result"><div class="empty">Realize uma análise para ver os resultados.</div></div></article>
    </section>
  `;
}

function handleAntterioritySearch(event) {
  event.preventDefault();
  const formData = new FormData(event.currentTarget);
  const brand = formData.get("brand");
  const classes = formData.get("classes") ? formData.get("classes").split(",").map(c => c.trim()).filter(Boolean) : [];
  
  const resultContainer = document.getElementById("antteriority-result");
  resultContainer.innerHTML = '<div class="empty">Analisando...</div>';
  
  const analysis = analyzeAllAgainstTarget(brand, classes);
  resultContainer.innerHTML = renderAntteriorityReport(analysis);
}

function gruView() {
  if (!currentGRUProcess) {
    return `
      <div class="page-head"><div><h2>Gerar GRU</h2><p>Emita a Guia da Receita Federal para pagamento de taxas no INPI.</p></div></div>
      <div class="notice">Selecione um processo na lista de Processos para gerar a GRU.</div>
      <div class="page-actions" style="margin-top: 15px;">
        <button class="primary-button" data-go="processes">Ir para Processos →</button>
      </div>
    `;
  }

  return `
    <div class="page-head"><div><h2>Gerar GRU</h2><p>Marca: ${escapeHtml(currentGRUProcess.brand)}</p></div><button class="secondary-button" data-go="processes">← Voltar</button></div>
    <div class="notice quiet">
      <strong>Processo:</strong> ${escapeHtml(currentGRUProcess.brand)} | 
      <strong>Cliente:</strong> ${escapeHtml(client(currentGRUProcess.clientId).name)} |
      <strong>Status:</strong> ${escapeHtml(currentGRUProcess.status)}
    </div>
    ${renderGRUPanel(currentGRUProcess)}
    <div id="gru-details-container"></div>
  `;
}

function searchView() {
  const latest = data.availabilityChecks[0];
  return `
    <div class="page-head"><div><h2>Busca Prévia Automatizada</h2><p>Pesquisa automática na base do INPI com análise de risco.</p></div><a class="link-button" href="${INPI_SEARCH_URL}" target="_blank" rel="noreferrer">Abrir busca oficial ↗</a></div>
    <div class="notice">A busca automatizada utiliza a API do INPI para encontrar marcas semelhantes. Os resultados são uma triagem operacional e não substituem a análise especializada.</div>
    <section class="diagnosis-grid" style="margin-top:15px">
      <article class="panel"><div class="panel-header"><div><h3>Pesquisar marca</h3><p>Informe a marca e as classes de Nice pretendidas</p></div></div><div class="panel-body">
        <form id="automated-search-form" class="agent-form" onsubmit="window.handleAutomatedSearch(event)">
          <div class="form-grid">
            <label><span>Marca pretendida</span><input required name="brand" placeholder="Ex.: AURORA" /></label>
            <label><span>Classes pretendidas</span><input required name="classes" placeholder="Ex.: 25, 35" /></label>
          </div>
          <button class="primary-button" type="submit">Buscar no INPI</button>
        </form>
      </div></article>
      <article class="panel"><div class="panel-header"><div><h3>Resultado da busca</h3><p>Análise de risco e recomendação</p></div></div><div class="panel-body" id="automated-search-result">${latest ? latest.brand ? `Última busca: ${escapeHtml(latest.brand)}` : '' : '<div class="empty">Realize uma busca para ver os resultados.</div>'}</div></article>
    </section>
  `;
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
        <article class="panel"><div class="panel-header"><div><h3>Distribuição da carteira</h3><p>Status atuais dos pedidos</p></div></div><div class="panel-body">${statusCounts.map(([status, count]) => `<div class="progress-row"><span>${escapeHtml(status)}</span><div class="bar"><span style="width:${Math.max(8, count / data.processes.length * 100)}%"></span></div><strong>${count}</strong></div>`).join("")}</div></article>
      </div>
      <div class="stack">
        <article class="panel"><div class="panel-header"><div><h3>Agenda prioritária</h3><p>Prazos internos mais próximos</p></div><button class="text-button" data-go="deadlines">Agenda →</button></div><div class="panel-body timeline">${deadlineList(alerts.slice(0, 4))}</div></article>
        <article class="panel"><div class="panel-header"><div><h3>Alertas operacionais</h3><p>Itens que pedem atenção</p></div></div><div class="panel-body alert-list">${alertList()}</div></article>
      </div>
    </section>`;
}

function diagnosis() {
  const latest = data.diagnoses[0];
  return `<div class="page-head"><div><h2>Diagnóstico de proteção</h2><p>Transforme a conversa com o cliente em escopo, classes candidatas e estimativa inicial.</p></div><a class="link-button" href="https://www.gov.br/inpi/pt-br/servicos/marcas/classificacao-marcas" target="_blank" rel="noreferrer">Classificação oficial ↗</a></div>
    <div class="notice">As sugestões são uma triagem operacional. Confirme itens e classes na lista vigente do INPI e submeta risco de colidência, estratégia ou descrição livre à revisão especializada.</div>
    <section class="diagnosis-grid" style="margin-top:15px">
      <article class="panel"><div class="panel-header"><div><h3>Briefing inteligente</h3><p>Fale do negócio; o MarcaFlow organiza a cobertura possível.</p></div></div><div class="panel-body">
        <form id="diagnosis-form" class="agent-form">
          <div class="form-grid">
            <label><span>Marca pretendida</span><input required name="brand" placeholder="Ex.: Nome da marca" /></label>
            <label><span>Titular já cadastrado</span><select name="clientId"><option value="">Ainda não cadastrado</option>${data.clients.map((item) => `<option value="${escapeHtml(item.id)}">${escapeHtml(item.name)}</option>`).join("")}</select></label>
            <label><span>Apresentação</span><select name="presentation"><option>Nominativa</option><option>Mista</option><option>Figurativa</option><option>Tridimensional</option><option>Posição</option></select></label>
            <label><span>Enquadramento de desconto INPI</span><select name="discountCategory">${discountCategoryOptions()}</select></label>
            <label><span>Pessoa natural sem empresa no mesmo ramo?</span><select name="naturalPersonNoSameSectorParticipation"><option value="">Não se aplica / não informado</option><option>Sim</option><option>Não</option></select></label>
            <label><span>Cotitulares também são elegíveis?</span><select name="coHoldersEligible"><option>Não se aplica</option><option>Sim</option><option>Não</option><option>A confirmar</option></select></label>
          </div>
          <label><span>O que o negócio oferece hoje?</span><textarea required name="currentOffer" rows="3" placeholder="Ex.: roupas autorais vendidas em loja física e e-commerce."></textarea></label>
          <div class="form-grid">
            <label><span>Canais de venda</span><input name="channels" placeholder="Ex.: varejo, marketplace, atendimento online" /></label>
            <label><span>Expansão em 12–24 meses</span><input name="expansion" placeholder="Ex.: cosméticos, cursos, franquias" /></label>
          </div>
          <label><span>Marcas semelhantes já conhecidas</span><textarea name="knownSimilar" rows="2" placeholder="Informe nomes, concorrentes ou deixe em branco."></textarea></label>
          <button class="primary-button" type="submit">Gerar mapa de proteção</button>
        </form>
      </div></article>
      <article class="panel"><div class="panel-header"><div><h3>Última proposta</h3><p>Classes, custo oficial e próximos passos.</p></div></div><div class="panel-body" id="diagnosis-result">${latest ? diagnosisResult(latest) : '<div class="empty">Preencha o briefing para criar a primeira proposta.</div>'}</div></article>
    </section>`;
}

function diagnosisResult(record) {
  const suggestions = record.suggestions || [];
  const codes = suggestions.map((item) => item.code);
  const preApproved = calculateEstimate(codes.length, "preApproved", record);
  const freeText = calculateEstimate(codes.length, "free", record);
  const clientName = record.clientId ? client(record.clientId).name : "Titular ainda não vinculado";
  return `<div class="proposal-summary"><span class="badge violet">Triagem operacional</span><h3>${escapeHtml(record.brand)}</h3><p class="subtle">${escapeHtml(clientName)} · ${escapeHtml(record.presentation)}</p>
    <div class="coverage-list">${suggestions.length ? suggestions.map((item) => `<div class="coverage-item"><div><strong>Classe ${escapeHtml(item.code)}</strong><span>${escapeHtml(item.title)}</span></div><span class="badge ${item.scope === "expansion" ? "blue" : "green"}">${escapeHtml(item.scope === "expansion" ? "Expansão" : "Atual")}</span></div>`).join("") : '<div class="notice">Não houve correspondência automática suficiente. Consulte a classificação oficial e faça revisão humana.</div>'}</div>
    <div class="estimate-grid"><div><span>Pré-aprovada</span><strong>${formatMoney(preApproved.total)}</strong><small>${formatMoney(preApproved.perClass)} por classe</small></div><div><span>Especificação livre</span><strong>${formatMoney(freeText.total)}</strong><small>${formatMoney(freeText.perClass)} por classe</small></div></div>
    <p>${discountStatusBadge(record)} <span class="subtle">${escapeHtml(preApproved.assessment.note)}</span></p>
    <p class="subtle">Valores oficiais estimados para ${codes.length || 0} classe(s), sem honorários e sem eventos futuros. Primeiro decênio/certificado: ${formatMoney(preApproved.firstDecade)}. A taxa de 100% é estimada apenas para os serviços de entrada elegíveis e exige confirmação no e-INPI. Fonte: <a href="${escapeHtml(OFFICIAL_FEES.sourceUrl)}" target="_blank" rel="noreferrer">${escapeHtml(OFFICIAL_FEES.source)}</a>.</p>
    <div class="notice quiet">Próximo passo: revise a descrição dos produtos/serviços, valide as classes e execute a triagem de disponibilidade. A classe diferente, isoladamente, não elimina risco de conflito.</div>
    <div class="page-actions"><button class="secondary-button" data-diagnosis-ai="${escapeHtml(record.id)}">Explicar com IA</button><button class="secondary-button" data-use-diagnosis="${escapeHtml(record.id)}">Criar pré-processo</button><button class="secondary-button" data-go="availability">Triar disponibilidade</button></div><div id="diagnosis-ai-answer"></div></div>`;
}

function availability() {
  const latest = data.availabilityChecks[0];
  const prefill = availabilityPrefill || {};
  return `<div class="page-head"><div><h2>Triagem de disponibilidade</h2><p>Pesquise as opções de nome antes de fechar a proposta, a taxa e a GRU.</p></div><a class="link-button" href="https://busca.inpi.gov.br/pePI/" target="_blank" rel="noreferrer">Abrir busca INPI ↗</a></div>
    <div class="notice">Faça a busca oficial por palavra-chave, variações, titulares e classes. Cole os resultados relevantes abaixo; o MarcaFlow apenas prioriza a revisão e não declara disponibilidade ou registrabilidade.</div>
    <section class="diagnosis-grid" style="margin-top:15px"><article class="panel"><div class="panel-header"><div><h3>Resultados da busca</h3><p>Uma linha por resultado: marca | classes | status | observação.</p></div></div><div class="panel-body"><form id="availability-form" class="agent-form"><div class="form-grid"><label><span>Marca pesquisada</span><input required name="brand" value="${escapeHtml(prefill.brand || "")}" placeholder="Ex.: AURORA" /></label><label><span>Classes pretendidas</span><input required name="classes" value="${escapeHtml(prefill.classes || "")}" placeholder="Ex.: 25, 35" /></label></div><label><span>Resultados relevantes da busca oficial</span><textarea required name="candidates" rows="7" placeholder="AURORA MODA | 25, 35 | Registro em vigor | Encontrada na busca&#10;AURORA CAFÉ | 43 | Pedido em exame | Segmento distinto"></textarea></label><button class="primary-button" type="submit">Gerar relatório de risco</button></form></div></article><article class="panel"><div class="panel-header"><div><h3>Última triagem</h3><p>Prioridade para revisão humana.</p></div></div><div class="panel-body" id="availability-result">${latest ? availabilityResult(latest) : '<div class="empty">Cole resultados de uma busca oficial para analisar a primeira triagem.</div>'}</div></article></section>`;
}

function availabilityResult(record) {
  const counts = record.candidates.reduce((acc, item) => ({ ...acc, [item.risk]: (acc[item.risk] || 0) + 1 }), {});
  const tone = { Alto: "red", "Médio": "amber", Baixo: "green" };
  return `<div class="proposal-summary"><span class="badge violet">Revisão necessária</span><h3>${escapeHtml(record.brand)}</h3><p class="subtle">Classes pretendidas: ${escapeHtml(record.classes.join(", "))}</p><div class="risk-summary"><span class="badge red">${counts.Alto || 0} alto</span><span class="badge amber">${counts.Médio || 0} médio</span><span class="badge green">${counts.Baixo || 0} baixo</span></div><div class="candidate-list">${record.candidates.map((item) => `<div class="candidate-item"><div><strong>${escapeHtml(item.brand)}</strong><span>Classes ${escapeHtml(item.classes.join(", ") || "não informadas")} · ${escapeHtml(item.status || "status não informado")}</span><small>${escapeHtml(item.notes || "Sem observação")}</small></div><span class="badge ${tone[item.risk]}">${escapeHtml(item.risk)}</span></div>`).join("")}</div><div class="notice quiet">Reveja sinais idênticos ou semelhantes em classes iguais, afins ou complementares. Considere também titular, status, apresentação e eventuais marcas de alto renome antes de decidir pelo depósito.</div><div class="page-actions"><button class="secondary-button" data-availability-ai="${escapeHtml(record.id)}">Resumir com IA</button></div><div id="availability-ai-answer"></div></div>`;
}

function processes() {
  return `<div class="page-head"><div><h2>Processos de marcas</h2><p>Gerencie depósitos, publicações, exigências, oposições e registros.</p></div><div class="page-actions"><button class="secondary-button" id="import-portfolio"><span>↥</span>Importar carteira</button><button class="primary-button" id="page-new-process"><span>＋</span>Novo processo</button></div></div>
    <div class="notice quiet">Para importar em lote, use o modelo CSV ou JSON da pasta <code>importacoes/</code>. O arquivo deve ter ao menos marca, titular/cliente, classes e, para monitoramento automático, número do processo.</div>
    <article class="panel">
      <div class="filters"><div class="filter-row"><select id="status-filter"><option value="">Todos os status</option>${[...new Set(data.processes.map(p => p.status))].map(s => `<option>${escapeHtml(s)}</option>`).join("")}</select><select id="stage-filter"><option value="">Todas as etapas</option>${[...new Set(data.processes.map(p => p.flowStage))].map(s => `<option>${escapeHtml(s)}</option>`).join("")}</select><select id="class-filter"><option value="">Todas as classes</option>${[...new Set(data.processes.flatMap(p => p.classes.split(",").map(c => c.trim())))].sort((a,b) => Number(a)-Number(b)).map(c => `<option>${escapeHtml(c)}</option>`).join("")}</select></div><span class="subtle">${filterProcesses().length} resultados</span></div>
      <div id="process-table">${processTable(filterProcesses())}</div>
    </article>`;
}

function funnel() {
  const columns = funnelStages.map((stage) => {
    const items = filterProcesses(data.processes.filter((item) => item.flowStage === stage));
    const cards = items.map((item) => {
      const risk = processRisk(item);
      return `<button class="funnel-card process-row" data-id="${escapeHtml(item.id)}">
        <span class="funnel-brand">${escapeHtml(item.brand)}</span>
        <span>${escapeHtml(item.number || "Pré-depósito")} · ${escapeHtml(client(item.clientId).name)}</span>
        <span>${escapeHtml(item.nextAction)}</span>
        <strong class="${riskTone(risk)}">${escapeHtml(riskLabels[risk])} · ${formatDate(item.internalDeadline)}</strong>
      </button>`;
    }).join("");
    return `<section class="funnel-column"><div class="funnel-head"><strong>${escapeHtml(stage)}</strong><span>${items.length}</span></div>${cards || '<div class="funnel-empty">Sem processos</div>'}</section>`;
  }).join("");
  return `<div class="page-head"><div><h2>Funil de marcas</h2><p>Visualize a carteira por etapa operacional e priorize o que precisa andar.</p></div><button class="primary-button" id="page-new-process"><span>＋</span>Novo processo</button></div>
    <section class="funnel-board">${columns}</section>`;
}

function clients() {
  const cards = data.clients.filter((c) => !query || [c.name, c.document, c.email, c.contact].join(" ").toLowerCase().includes(query.toLowerCase())).map((item) => {
    const count = data.processes.filter(p => p.clientId === item.id).length;
    return `<article class="client-card"><div class="client-card-top"><div><h3>${escapeHtml(item.name)}</h3><span class="badge gray">${escapeHtml(item.profile)}</span> ${discountStatusBadge(item)}</div><button class="icon-button" title="Detalhes do cliente">⋯</button></div><p>${escapeHtml(item.document)}</p><p>${escapeHtml(item.email || "E-mail não informado")}</p><p>${escapeHtml(item.phone || "Telefone não informado")}</p><div class="client-card-footer"><span>${count} processo(s)</span><span>${escapeHtml(item.contact || "Sem contato")}</span></div></article>`;
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

function documents() {
  const docs = data.documents.filter((d) => {
    const process = processById(d.processId);
    return !query || [d.name, d.type, process?.brand].join(" ").toLowerCase().includes(query.toLowerCase());
  });
  const rows = docs.map(d => `<tr><td><span class="doc-icon">▧</span></td><td><span class="brand-name">${escapeHtml(d.name)}</span><br><span class="subtle">${escapeHtml(processById(d.processId)?.brand || "Sem processo")}</span></td><td>${escapeHtml(d.type)}</td><td>${formatDate(d.date)}</td><td><button class="text-button">Visualizar</button></td></tr>`).join("");
  return `<div class="page-head"><div><h2>Documentos</h2><p>Central de protocolos, GRUs, despachos e certificados.</p></div><button class="secondary-button">＋ Adicionar documento</button></div><article class="panel"><div class="table-wrap"><table><thead><tr><th></th><th>Arquivo / marca</th><th>Tipo</th><th>Data</th><th></th></tr></thead><tbody>${rows || '<tr><td colspan="5" class="empty">Nenhum documento encontrado.</td></tr>'}</tbody></table></div></article>`;
}

function rpi() {
  const latest = data.imports[0];
  const movements = data.movements.slice(0, 8);
  const trackedCount = data.processes.filter(item => item.number).length;
  return `<div class="page-head"><div><h2>Monitor RPI</h2><p>Importe XML oficial ou relatório JSON gerado pelo robô semanal.</p></div><div class="page-actions"><a class="link-button" href="https://revistas.inpi.gov.br/rpi/" target="_blank" rel="noreferrer">Abrir portal RPI ↗</a><button class="secondary-button" id="import-portfolio"><span>↥</span>Importar carteira</button><button class="secondary-button" id="export-tracked-portfolio"><span>⇩</span>Exportar carteira</button><button class="secondary-button" id="select-monitor-report"><span>↧</span>Importar relatório</button><button class="primary-button" id="select-rpi-file"><span>↥</span>Importar XML</button></div></div>
    <div class="notice">O XML facilita a triagem, mas não substitui a publicação oficial. Antes de cumprir prazo ou tomar decisão processual, confira o PDF da seção V de Marcas no portal da RPI.</div>
    <section class="rpi-grid" style="margin-top:15px">
      <div class="stack">
        <article class="panel"><div class="panel-header"><div><h3>Leitura de arquivo</h3><p>Processamento local: nenhum dado é enviado pela internet</p></div></div><div class="panel-body">
          <div class="upload-zone"><div><div class="upload-icon">↥</div><strong>Selecione XML ou relatório do monitor</strong><span>Use RMxxxx.xml do INPI para triagem manual ou relatorios/monitoramento-RPI-xxxx.json gerado pelo robô semanal.</span><div class="upload-actions"><button class="secondary-button" id="upload-monitor-report">Escolher relatório JSON</button><button class="primary-button" id="upload-rpi-file">Escolher arquivo XML</button></div></div></div>
        </div></article>
        <article class="panel"><div class="panel-header"><div><h3>Movimentações encontradas</h3><p>Despachos recentes vinculados à carteira</p></div></div><div class="panel-body movement-list">${movementList(movements)}</div></article>
      </div>
      <div class="stack">
        <article class="panel"><div class="panel-header"><div><h3>Carteira do robô</h3><p>${trackedCount} processo(s) numerado(s) prontos para monitoramento</p></div></div><div class="panel-body"><div class="notice quiet">A exportação gera o arquivo carteira-monitorada.json com titular, etapa, classes, prazos e último despacho. Use esse arquivo para alimentar a rotina semanal instalada no macOS.</div><button class="secondary-button full-width" id="export-tracked-portfolio-side"><span>⇩</span>Exportar carteira monitorada</button></div></article>
        <article class="panel"><div class="panel-header"><div><h3>Última importação</h3><p>${latest ? `${escapeHtml(latest.rpi)} · ${formatDate(latest.date)}` : "Nenhum XML processado"}</p></div></div><div class="panel-body">${latest ? `<div class="import-summary"><div><strong>${latest.totalProcesses}</strong><span>Processos no XML</span></div><div><strong>${latest.matches}</strong><span>Na carteira</span></div><div><strong>${latest.movements}</strong><span>Despachos</span></div></div><span class="subtle">${escapeHtml(latest.fileName)}</span>` : '<div class="empty">Importe um XML para iniciar o monitoramento.</div>'}</div></article>
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
  return `<div class="page-head"><div><h2>Agente INPI</h2><p>Comece pela proteção necessária, estime o investimento e só então avance para a busca.</p></div><a class="link-button" href="https://manualdemarcas.inpi.gov.br/projects/manual/wiki/Manual_de_Marcas" target="_blank" rel="noreferrer">Manual de Marcas ↗</a></div>
    <section class="agent-grid">
      <article class="panel"><div class="panel-header"><div><h3>Perguntar</h3><p>Busca local em fontes carregadas no MarcaFlow</p></div></div><div class="panel-body">
        <form id="agent-form" class="agent-form">
          <label><span>Processo relacionado</span><select name="processId"><option value="">Sem processo específico</option>${data.processes.map((item) => `<option value="${escapeHtml(item.id)}">${escapeHtml(item.brand)} · ${escapeHtml(item.number || "pré-depósito")}</option>`).join("")}</select></label>
          <textarea name="question" rows="4" placeholder="Ex.: Tenho uma marca de roupas vendidas online. Quais classes preciso proteger e quanto custa?"></textarea>
          <button class="primary-button" type="submit">Responder com fontes</button>
        </form>
        <div class="quick-prompts">
          <button type="button" data-agent-question="Quero entender quais classes preciso proteger e qual será o custo inicial.">Classes e custo</button>
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

function handleDiagnosis(event) {
  event.preventDefault();
  const values = Object.fromEntries(new FormData(event.currentTarget));
  if (values.clientId) {
    const holder = client(values.clientId);
    values.discountCategory = holder.discountCategory || suggestedDiscountCategory(holder.profile);
    values.naturalPersonNoSameSectorParticipation = holder.naturalPersonNoSameSectorParticipation || "";
    values.coHoldersEligible = holder.coHoldersEligible || "Não se aplica";
  }
  const suggestions = recommendedClasses(values);
  const record = { id: crypto.randomUUID(), createdAt: new Date().toISOString(), ...values, suggestions };
  data.diagnoses.unshift(record);
  save();
  document.getElementById("diagnosis-result").innerHTML = diagnosisResult(record);
  document.querySelector("[data-use-diagnosis]")?.addEventListener("click", () => startProcessFromDiagnosis(record.id));
  document.querySelector("[data-diagnosis-ai]")?.addEventListener("click", () => requestDiagnosisInsight(record.id));
  document.querySelector("#diagnosis-result [data-go]")?.addEventListener("click", () => { view = "availability"; render(); });
}

function syncDiagnosisDiscountFromClient(event) {
  const holder = event.target.value ? client(event.target.value) : null;
  const form = event.target.form;
  if (!holder || !form) return;
  form.elements.discountCategory.value = holder.discountCategory || suggestedDiscountCategory(holder.profile);
  form.elements.naturalPersonNoSameSectorParticipation.value = holder.naturalPersonNoSameSectorParticipation || "";
  form.elements.coHoldersEligible.value = holder.coHoldersEligible || "Não se aplica";
}

function handleAvailability(event) {
  event.preventDefault();
  const values = Object.fromEntries(new FormData(event.currentTarget));
  const target = { brand: values.brand, classes: parseClasses(values.classes) };
  const candidates = parseAvailabilityCandidates(values.candidates).map((item) => ({ ...item, risk: availabilityRisk(target, item) }));
  const record = { id: crypto.randomUUID(), createdAt: new Date().toISOString(), ...target, candidates };
  data.availabilityChecks.unshift(record);
  availabilityPrefill = null;
  save();
  document.getElementById("availability-result").innerHTML = availabilityResult(record);
  document.querySelector("[data-availability-ai]")?.addEventListener("click", () => requestAvailabilityInsight(record.id));
}

async function requestDiagnosisInsight(id) {
  const record = data.diagnoses.find((item) => item.id === id);
  const answer = document.getElementById("diagnosis-ai-answer");
  if (!record || !answer) return;
  answer.innerHTML = '<div class="empty">A IA está organizando os pontos de revisão...</div>';
  const question = `Para a marca ${record.brand}, cujo negócio oferece ${record.currentOffer}, com canais ${record.channels || "não informados"} e expansão ${record.expansion || "não informada"}, explique os cuidados para revisar as classes ${record.suggestions.map((item) => item.code).join(", ") || "ainda não definidas"}. Não conclua que a marca pode ser registrada; indique dados faltantes, próxima ação e fontes oficiais.`;
  answer.innerHTML = await answerQuestionWithBackend(question);
}

async function requestAvailabilityInsight(id) {
  const record = data.availabilityChecks.find((item) => item.id === id);
  const answer = document.getElementById("availability-ai-answer");
  if (!record || !answer) return;
  answer.innerHTML = '<div class="empty">A IA está preparando a síntese da triagem...</div>';
  const candidates = record.candidates.map((item) => `${item.brand} (${item.classes.join(", ") || "sem classe"}; ${item.status || "sem status"}; risco ${item.risk})`).join("; ");
  const question = `Resuma a triagem de disponibilidade para a marca ${record.brand}, pretendida nas classes ${record.classes.join(", ")}. Resultados relevantes: ${candidates}. Não declare disponibilidade ou registrabilidade. Informe risco principal, dados faltantes, próxima ação e a necessidade de conferir a base e o Manual de Marcas.`;
  answer.innerHTML = await answerQuestionWithBackend(question);
}

function startProcessFromDiagnosis(id) {
  const record = data.diagnoses.find((item) => item.id === id);
  if (!record) return;
  if (!record.clientId) {
    alert("Vincule ou cadastre o titular antes de criar o pré-processo.");
    view = "clients";
    render();
    return;
  }
  showProcessForm({ brand: record.brand, clientId: record.clientId, classes: record.suggestions.map((item) => item.code).join(", "), presentation: record.presentation, nature: "Produto e serviço", flowStage: "Busca prévia", status: "Preparação", nextAction: "Validar classes e concluir busca de anterioridade", specification: record.currentOffer, salesChannels: record.channels, geographicScope: "Brasil", priorRisk: record.knownSimilar ? "Médio" : "Não avaliado", notes: `Diagnóstico criado em ${formatDate(record.createdAt.slice(0, 10))}. Expansão: ${record.expansion || "não informada"}. Marcas semelhantes informadas: ${record.knownSimilar || "nenhuma"}.` });
}

function showProcessForm(prefill = {}) {
  const select = document.getElementById("process-client-select");
  if (!data.clients.length) {
    alert("Cadastre o titular em Clientes antes de criar um processo.");
    view = "clients";
    render();
    return;
  }
  select.innerHTML = data.clients.map(c => `<option value="${escapeHtml(c.id)}">${escapeHtml(c.name)}</option>`).join("");
  const form = document.getElementById("process-form");
  form.reset();
  Object.entries(prefill).forEach(([key, value]) => {
    if (form.elements[key]) form.elements[key].value = value || "";
  });
  openModal("process-modal");
}

function showDetails(id) {
  const item = processById(id);
  const relatedDocs = data.documents.filter(d => d.processId === id);
  document.getElementById("detail-content").innerHTML = `<div class="dialog-header"><div><p class="eyebrow">Processo ${escapeHtml(item.number || "em preparação")}</p><h2>${escapeHtml(item.brand)}</h2></div><button class="close-button" id="close-detail" title="Fechar">×</button></div>
    <span class="badge ${statusTone(item.status)}">${escapeHtml(item.status)}</span>
    <div class="detail-grid">
      <div class="detail-item"><span>Cliente</span><strong>${escapeHtml(client(item.clientId).name)}</strong></div>
      <div class="detail-item"><span>Classe(s)</span><strong>${escapeHtml(item.classes)}</strong></div>
      <div class="detail-item"><span>Etapa</span><strong>${escapeHtml(item.flowStage)}</strong></div>
      <div class="detail-item"><span>Apresentação</span><strong>${escapeHtml(item.presentation)}</strong></div>
      <div class="detail-item"><span>Data de depósito</span><strong>${formatDate(item.filingDate)}</strong></div>
      <div class="detail-item"><span>Última RPI</span><strong>${escapeHtml(item.lastRpi || "Sem RPI vinculada")}</strong></div>
      <div class="detail-item"><span>Último despacho</span><strong>${escapeHtml(item.lastDispatchCode || "Sem despacho")}</strong></div>
      <div class="detail-item"><span>Próxima ação</span><strong>${escapeHtml(item.nextAction)}</strong></div>
      <div class="detail-item"><span>Prazo legal</span><strong>${formatDate(item.legalDeadline)}</strong></div>
      <div class="detail-item"><span>Prazo interno</span><strong>${formatDate(item.internalDeadline)}</strong></div>
    </div>
    <p class="detail-notes">${escapeHtml(item.notes || "Sem observações.")}</p>
    <div class="panel-header"><div><h3>Documentos vinculados</h3><p>${relatedDocs.length} arquivo(s)</p></div></div>
    <div class="panel-body doc-list">${relatedDocs.map(d => `<div class="doc-item"><div class="doc-icon">▧</div><div><strong>${escapeHtml(d.name)}</strong><span>${escapeHtml(d.type)} · ${formatDate(d.date)}</span></div></div>`).join("") || '<span class="subtle">Nenhum documento vinculado.</span>'}</div>
    <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid var(--line); display: flex; gap: 8px; flex-wrap: wrap;">
      ${item.status === "Preparação" || item.status === "Protocolado" ? `<button class="primary-button" id="open-gru-modal">🧾 Gerar GRU</button>` : ""}
      <button class="secondary-button" id="open-client-dashboard">👤 Dashboard Cliente</button>
      <button class="secondary-button" id="open-report-modal">📄 Gerar Relatório</button>
    </div>`;
  openModal("detail-modal");
  document.getElementById("close-detail").addEventListener("click", () => closeModal("detail-modal"));
  
  // Handler para botão de GRU
  const gruButton = document.getElementById("open-gru-modal");
  if (gruButton) {
    gruButton.addEventListener("click", () => {
      closeModal("detail-modal");
      window.view = "gru";
      window.currentGRUProcess = item;
      window.render();
    });
  }
  
  // Handler para botão de dashboard do cliente
  const dashboardButton = document.getElementById("open-client-dashboard");
  if (dashboardButton) {
    dashboardButton.addEventListener("click", () => {
      const clientData = client(item.clientId);
      const link = generateClientLink(item.clientId);
      closeModal("detail-modal");
      navigator.clipboard.writeText(link).then(() => {
        alert("Link do dashboard copiado! Envie ao cliente.");
      }).catch(() => {
        window.prompt("Copie o link do dashboard:", link);
      });
    });
  }
  
  // Handler para botão de relatório
  const reportButton = document.getElementById("open-report-modal");
  if (reportButton) {
    reportButton.addEventListener("click", () => {
      const reportHTML = generateProcessReport(item.id);
      const filename = `relatorio-${item.brand}-${Date.now()}.html`;
      saveReportHTML(reportHTML, filename);
      alert("Relatório gerado! Abra no navegador para imprimir/salvar PDF.");
    });
  }
}

async function submitAgentQuestion(form) {
  const answer = document.getElementById("agent-answer");
  answer.innerHTML = `<div class="empty">Consultando agente...</div>`;
  const values = Object.fromEntries(new FormData(form));
  const sanitizedQuestion = sanitizeAgentInput(values.question);
  if (sanitizedQuestion.length < 4) {
    answer.innerHTML = `<div class="empty">Pergunta muito curta. Digite pelo menos 4 caracteres.</div>`;
    return;
  }
  answer.innerHTML = await answerQuestionWithBackend(sanitizedQuestion, values.processId);
  bindAgentAnswerEvents(answer);
}

async function handleAgentSubmit(event) {
  event.preventDefault();
  await submitAgentQuestion(event.currentTarget);
}

function applyProcessFilters() {
  const status = document.getElementById("status-filter").value;
  const stage = document.getElementById("stage-filter").value;
  const className = document.getElementById("class-filter").value;
  const items = filterProcesses().filter(p => (!status || p.status === status) && (!stage || p.flowStage === stage) && (!className || p.classes.split(",").map(c => c.trim()).includes(className)));
  document.getElementById("process-table").innerHTML = processTable(items);
  document.querySelectorAll(".process-row").forEach(row => row.addEventListener("click", () => showDetails(row.dataset.id)));
}

function render() {
  document.getElementById("page-title").textContent = ({ dashboard: "Visão geral", diagnosis: "Diagnóstico", availability: "Disponibilidade", search: "Busca Prévia", alerts: "Alertas", gru: "GRU", antteriority: "Anterioridade", petitions: "Petições", emarcas: "e-Marcas", financial: "Financeiro", processes: "Processos", funnel: "Funil", clients: "Clientes", deadlines: "Agenda", documents: "Documentos", rpi: "Monitor RPI", agent: "Agente INPI" })[view];
  document.getElementById("app-view").innerHTML = ({ dashboard, diagnosis, availability, search: searchView, alerts: alertsView, gru: gruView, antteriority: antteriorityView, petitions: petitionsView, emarcas: emarcasView, financial: financialView, processes, funnel, clients, deadlines, documents, rpi, agent })[view]();
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
  document.getElementById("select-monitor-report")?.addEventListener("click", selectMonitorReport);
  document.getElementById("upload-monitor-report")?.addEventListener("click", selectMonitorReport);
  document.getElementById("export-tracked-portfolio")?.addEventListener("click", exportTrackedPortfolio);
  document.getElementById("export-tracked-portfolio-side")?.addEventListener("click", exportTrackedPortfolio);
  document.getElementById("import-portfolio")?.addEventListener("click", selectPortfolioImport);
  document.getElementById("diagnosis-form")?.addEventListener("submit", handleDiagnosis);
  document.querySelector("#diagnosis-form [name='clientId']")?.addEventListener("change", syncDiagnosisDiscountFromClient);
  document.getElementById("availability-form")?.addEventListener("submit", handleAvailability);
  document.querySelectorAll("[data-use-diagnosis]").forEach((button) => button.addEventListener("click", () => startProcessFromDiagnosis(button.dataset.useDiagnosis)));
  document.querySelectorAll("[data-diagnosis-ai]").forEach((button) => button.addEventListener("click", () => requestDiagnosisInsight(button.dataset.diagnosisAi)));
  document.querySelectorAll("[data-availability-ai]").forEach((button) => button.addEventListener("click", () => requestAvailabilityInsight(button.dataset.availabilityAi)));
  document.querySelectorAll("[data-copy-client-update]").forEach((button) => button.addEventListener("click", () => copyClientUpdate(button.dataset.copyClientUpdate)));
  document.getElementById("agent-form")?.addEventListener("submit", handleAgentSubmit);
  document.querySelectorAll("[data-agent-question]").forEach(button => button.addEventListener("click", () => {
    const form = document.getElementById("agent-form");
    form.question.value = button.dataset.agentQuestion;
    submitAgentQuestion(form);
  }));
}

function selectRpiFile() { document.getElementById("rpi-file-input").click(); }
function selectMonitorReport() { document.getElementById("monitor-report-input").click(); }
function selectPortfolioImport() { document.getElementById("portfolio-import-input").click(); }

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
document.getElementById("monitor-report-input").addEventListener("change", async event => {
  const file = event.target.files[0];
  if (!file) return;
  try { importMonitorReportJson(await file.text(), file.name); }
  catch (error) { alert(`Não foi possível importar o relatório: ${error.message}`); }
  event.target.value = "";
});
document.getElementById("portfolio-import-input").addEventListener("change", async event => {
  const file = event.target.files[0];
  if (!file) return;
  try { importPortfolio(await file.text(), file.name); }
  catch (error) { alert(`Não foi possível importar a carteira: ${error.message}`); }
  event.target.value = "";
});
document.getElementById("export-data").addEventListener("click", () => {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = Object.assign(document.createElement("a"), { href: url, download: `marcaflow-backup-${iso()}.json` });
  link.click();
  URL.revokeObjectURL(url);
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
  if (values.discountCategory === "a_confirmar") values.discountCategory = suggestedDiscountCategory(values.profile);
  const assessment = discountAssessment(values);
  values.discountEligible = assessment.percent ? "Sim" : values.discountCategory === "nao_elegivel" ? "Não" : "";
  data.clients.push({ id: crypto.randomUUID(), ...values });
  save();
  event.currentTarget.reset();
  closeModal("client-modal");
  view = "clients";
  render();
});

ensureCollections();
render();
A11y.init();
A11y.addAriaLabels();
A11y.enableKeyboardShortcuts();
Analytics.init();
Backup.init();

// Mobile menu toggle
document.getElementById('mobile-menu-toggle')?.addEventListener('click', () => {
  const sidebar = document.querySelector('.sidebar');
  sidebar.classList.toggle('open');
});

// Close menu when clicking outside
document.addEventListener('click', (e) => {
  const sidebar = document.querySelector('.sidebar');
  const toggle = document.getElementById('mobile-menu-toggle');
  
  if (sidebar.classList.contains('open') && 
      !sidebar.contains(e.target) && 
      !toggle.contains(e.target)) {
    sidebar.classList.remove('open');
  }
});

window.render = render;
window.view = view;
window.query = query;

// Register Service Worker for PWA
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./service-worker.js")
      .then((registration) => {
        console.log("PWA: Service Worker registrado com sucesso", registration.scope);
        
        // Check for updates
        registration.addEventListener("updatefound", () => {
          const newWorker = registration.installing;
          newWorker.addEventListener("statechange", () => {
            if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
              console.log("PWA: Nova versão disponível! Atualize a página.");
              // Could show a notification here
            }
          });
        });
      })
      .catch((error) => {
        console.error("PWA: Erro ao registrar Service Worker:", error);
      });
  });
}
