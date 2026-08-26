/**
 * MarcaFlow - Módulo de Faturamento + Honorários
 * Controle financeiro de processos e clientes
 */

import { data, client, save } from "./store.js?v=2026.08.29";
import { escapeHtml, downloadJson } from "./utils.js?v=2026.08.29";
import { formatMoney } from "./business.js?v=2026.08.29";

const FINANCIAL_DATA_KEY = "marcaflow-financial-data";

/**
 * Dados financeiros
 */
let financialData = loadFinancialData();

function loadFinancialData() {
  try {
    const saved = localStorage.getItem(FINANCIAL_DATA_KEY);
    if (saved) return JSON.parse(saved);
  } catch (error) {
    console.warn("Erro ao carregar dados financeiros:", error);
  }
  return {
    honorarios: [],
    faturas: [],
    grus: [],
    expenses: []
  };
}

function saveFinancialData() {
  localStorage.setItem(FINANCIAL_DATA_KEY, JSON.stringify(financialData));
}

/**
 * Adiciona honorário a um processo
 */
function addHonorario(processId, details) {
  const honorario = {
    id: crypto.randomUUID(),
    processId,
    clientId: data.processes.find(p => p.id === processId)?.clientId,
    type: details.type || "honorarios", // honorarios, consultoria, petition
    value: Number(details.value) || 0,
    description: details.description || "",
    date: details.date || new Date().toISOString().slice(0, 10),
    status: details.status || "pending" // pending, paid, cancelled
  };
  
  financialData.honorarios.push(honorario);
  saveFinancialData();
  return honorario;
}

/**
 * Adiciona fatura
 */
function addFatura(clientId, items = [], details = {}) {
  const fatura = {
    id: crypto.randomUUID(),
    clientId,
    clientName: client(clientId).name,
    items,
    total: items.reduce((sum, item) => sum + (Number(item.value) || 0), 0),
    dueDate: details.dueDate || "",
    status: details.status || "pending", // pending, paid, overdue
    issueDate: new Date().toISOString().slice(0, 10)
  };
  
  financialData.faturas.push(fatura);
  saveFinancialData();
  return fatura;
}

/**
 * Adiciona GRU paga
 */
function addGRUPaid(processId, details) {
  const gru = {
    id: crypto.randomUUID(),
    processId,
    clientId: data.processes.find(p => p.id === processId)?.clientId,
    code: details.code || "",
    value: Number(details.value) || 0,
    paymentDate: details.paymentDate || new Date().toISOString().slice(0, 10),
    receipt: details.receipt || "",
    status: "paid"
  };
  
  financialData.grus.push(gru);
  saveFinancialData();
  return gru;
}

/**
 * Adiciona despesa
 */
function addExpense(details) {
  const expense = {
    id: crypto.randomUUID(),
    type: details.type || "other",
    description: details.description || "",
    value: Number(details.value) || 0,
    date: details.date || new Date().toISOString().slice(0, 10),
    category: details.category || "other"
  };
  
  financialData.expenses.push(expense);
  saveFinancialData();
  return expense;
}

/**
 * Calcula totais financeiros
 */
function calculateFinancialTotals() {
  const honorariosTotal = financialData.honorarios
    .filter(h => h.status === "paid")
    .reduce((sum, h) => sum + h.value, 0);
  
  const faturasTotal = financialData.faturas
    .filter(f => f.status === "paid")
    .reduce((sum, f) => sum + f.total, 0);
  
  const grusTotal = financialData.grus
    .reduce((sum, g) => sum + g.value, 0);
  
  const expensesTotal = financialData.expenses
    .reduce((sum, e) => sum + e.value, 0);
  
  const receivable = financialData.honorarios
    .filter(h => h.status === "pending")
    .reduce((sum, h) => sum + h.value, 0) +
    financialData.faturas
    .filter(f => f.status === "pending")
    .reduce((sum, f) => sum + f.total, 0);
  
  return {
    honorariosPaid: honorariosTotal,
    honorariosPending: receivable,
    faturasPaid: faturasTotal,
    grusPaid: grusTotal,
    expenses: expensesTotal,
    netIncome: honorariosTotal + faturasTotal - expensesTotal
  };
}

/**
 * Renderiza painel financeiro
 */
function renderFinancialPanel() {
  const totals = calculateFinancialTotals();
  
  return `
    <div class="metric-grid" style="margin-top: 15px;">
      <div class="metric">
        <div class="metric-top"><span>Honorários Recebidos</span><span class="metric-icon">💰</span></div>
        <strong>${formatMoney(totals.honorariosPaid)}</strong>
        <small>Pending: ${formatMoney(totals.honorariosPending)}</small>
      </div>
      <div class="metric">
        <div class="metric-top"><span>Faturas Recebidas</span><span class="metric-icon">📄</span></div>
        <strong>${formatMoney(totals.faturasPaid)}</strong>
      </div>
      <div class="metric">
        <div class="metric-top"><span>GRUs Pagas</span><span class="metric-icon">🧾</span></div>
        <strong>${formatMoney(totals.grusPaid)}</strong>
      </div>
      <div class="metric">
        <div class="metric-top"><span>Despesas</span><span class="metric-icon">📉</span></div>
        <strong>${formatMoney(totals.expenses)}</strong>
      </div>
    </div>
    
    <div class="panel" style="margin-top: 15px;">
      <div class="panel-header"><div><h3>Renda Líquida</h3></div></div>
      <div class="panel-body">
        <strong style="font-size: 24px; color: #126b52;">${formatMoney(totals.netIncome)}</strong>
        <p class="subtle" style="margin-top: 5px;">Honorários + Faturas - Despesas</p>
      </div>
    </div>
    
    <div class="page-actions" style="margin-top: 15px;">
      <button class="primary-button" id="add-honorario">➕ Adicionar Honorário</button>
      <button class="secondary-button" id="add-fatura">📄 Nova Fatura</button>
      <button class="secondary-button" id="add-gru">🧾 Registrar GRU</button>
      <button class="secondary-button" id="add-expense">📉 Despesa</button>
      <button class="secondary-button" id="export-financial">⇩ Exportar Dados</button>
    </div>
    
    <div id="financial-forms"></div>
  `;
}

/**
 * Renderiza view financeira
 */
function financialView() {
  return `
    <div class="page-head"><div><h2>Faturamento & Honorários</h2><p>Controle financeiro de processos e clientes.</p></div></div>
    ${renderFinancialPanel()}
  `;
}

/**
 * Exporta dados financeiros
 */
function exportFinancialData() {
  downloadJson(financialData, `marcaflow-financial-${new Date().toISOString().slice(0, 10)}.json`);
  alert("Dados financeiros exportados!");
}

// Expor para uso global
window.addHonorario = addHonorario;
window.addFatura = addFatura;
window.addGRUPaid = addGRUPaid;
window.addExpense = addExpense;
window.calculateFinancialTotals = calculateFinancialTotals;
window.renderFinancialPanel = renderFinancialPanel;
window.financialView = financialView;
window.exportFinancialData = exportFinancialData;

export {
  addHonorario,
  addFatura,
  addGRUPaid,
  addExpense,
  calculateFinancialTotals,
  renderFinancialPanel,
  financialView,
  exportFinancialData
};
