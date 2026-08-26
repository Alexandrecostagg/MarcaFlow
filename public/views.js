import {
  data, client, processById
} from "./store.js";
import {
  flowStageByStatus, funnelStages, riskLabels,
  formatDate, daysUntil, statusTone, urgentProcesses,
  processRisk, legalRisk, riskTone, formatMoney,
  suggestedDiscountCategory, discountAssessment,
  discountCategoryOptions, discountStatusBadge,
  classByCode, recommendedClasses, calculateEstimate,
  availabilityRisk, parseClasses, filterProcesses,
  addDays
} from "./business.js";
import { escapeHtml } from "./utils.js";

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
      <td><span class="brand-name">${escapeHtml(item.brand)}</span><br><span class="subtle">${escapeHtml(client(item.clientId).name)}</span></td>
      <td>${item.number || '<span class="subtle">Pré-depósito</span>'}</td>
      <td>${escapeHtml(item.classes)}</td>
      <td>${escapeHtml(item.flowStage)}</td>
      <td><span class="badge ${statusTone(item.status)}">${escapeHtml(item.status)}</span></td>
      <td>${escapeHtml(item.nextAction)}</td>
      <td class="${item.internalDeadline ? deadlineClass : ""}">${deadline}</td>
    </tr>`;
  }).join("");
}

function processTable(items) {
  return `<div class="table-wrap"><table><thead><tr><th>Marca / cliente</th><th>Processo</th><th>Classe</th><th>Etapa</th><th>Status</th><th>Próxima ação</th><th>Prazo interno</th></tr></thead><tbody>${processRows(items)}</tbody></table></div>`;
}

function deadlineList(items) {
  if (!items.length) return `<div class="empty">Nenhum prazo próximo.</div>`;
  return items.map((item) => {
    const days = daysUntil(item.internalDeadline);
    const label = days < 0 ? `${Math.abs(days)}d atrasado` : days === 0 ? "Hoje" : `${days}d`;
    return `<div class="timeline-item"><div class="timeline-date ${days <= 2 ? "urgent" : ""}">${label}</div><div><strong>${escapeHtml(item.nextAction)}</strong><span>${escapeHtml(item.brand)} · ${formatDate(item.internalDeadline)}</span></div></div>`;
  }).join("");
}

function alertList() {
  const alerts = urgentProcesses();
  if (!alerts.length) return `<div class="empty">Nenhum alerta crítico.</div>`;
  return alerts.slice(0, 3).map((item) => `<div class="alert-item"><div class="alert-icon">!</div><div><strong>${escapeHtml(item.brand)}</strong><span>${escapeHtml(item.nextAction)} · prazo interno ${formatDate(item.internalDeadline)}</span></div></div>`).join("");
}

function deadlineAlertCards(items) {
  if (!items.length) return `<article class="panel"><div class="empty">Nenhum prazo em alerta.</div></article>`;
  return items.slice(0, 6).map((item) => {
    const internal = processRisk(item);
    const legal = legalRisk(item);
    return `<article class="alert-card ${riskTone(internal)}">
      <div><span class="badge ${riskTone(internal)}">${riskLabels[internal]}</span><h3>${escapeHtml(item.brand)}</h3><p>${escapeHtml(item.nextAction)}</p></div>
      <div class="alert-card-dates"><span>Interno: ${formatDate(item.internalDeadline)}</span><span>Legal: ${formatDate(item.legalDeadline)}</span><span>Risco legal: ${riskLabels[legal]}</span></div>
    </article>`;
  }).join("");
}

function movementList(items) {
  if (!items.length) return `<div class="empty">Nenhuma movimentação importada.</div>`;
  return items.map(item => `<div class="movement"><div class="movement-top"><strong>${escapeHtml(item.brand)}</strong><span class="badge ${item.tone}">${escapeHtml(item.rpi)}</span></div><span>${escapeHtml(item.dispatchName)}</span><span>${escapeHtml(item.processNumber)} · importado em ${formatDate(item.importedAt)}</span><div class="movement-footer"><div class="movement-code">${escapeHtml(item.dispatchCode)}</div><button class="text-button" data-copy-client-update="${item.id}">Copiar atualização ao cliente</button></div></div>`).join("");
}

function knowledgeSources() {
  return (window.marcaFlowKnowledge || []).map(item => `<a class="source-card" href="${escapeHtml(item.url)}" target="_blank" rel="noreferrer"><strong>${escapeHtml(item.title)}</strong><span>${escapeHtml(item.source)}</span></a>`).join("");
}

export { metric, processRows, processTable, deadlineList, alertList, deadlineAlertCards, movementList, knowledgeSources };
