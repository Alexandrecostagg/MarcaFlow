/**
 * MarcaFlow - Módulo de Dashboard do Cliente
 * Portal de acompanhamento para clientes
 */

import { data, client, iso } from "./store.js?v=2026.08.29";
import { formatDate, daysUntil, statusTone, processRisk, legalRisk, riskLabels, formatMoney } from "./business.js?v=2026.08.29";
import { escapeHtml } from "./utils.js?v=2026.08.29";

/**
 * Gera token de acesso público para cliente
 */
function generateClientToken(clientId) {
  return `mf-client-${clientId}-${Date.now().toString(36)}`;
}

/**
 * Verifica se token é válido
 */
function validateClientToken(token) {
  if (!token || !token.startsWith("mf-client-")) return false;
  const clientId = token.split("-")[2];
  return !!data.clients.find(c => c.id === clientId);
}

/**
 * Obtém processos de um cliente
 */
function getClientProcesses(clientId) {
  return data.processes.filter(p => p.clientId === clientId);
}

/**
 * Obtém alertas de um cliente
 */
function getClientAlerts(clientId) {
  const processes = getClientProcesses(clientId);
  const alerts = [];
  
  processes.forEach(process => {
    if (process.internalDeadline) {
      const daysLeft = daysUntil(process.internalDeadline);
      const risk = processRisk(process);
      if (risk !== "ok") {
        alerts.push({
          type: "internal",
          brand: process.brand,
          deadline: process.internalDeadline,
          daysLeft,
          risk,
          action: process.nextAction
        });
      }
    }
    
    if (process.legalDeadline) {
      const daysLeft = daysUntil(process.legalDeadline);
      const risk = legalRisk(process);
      if (risk !== "ok") {
        alerts.push({
          type: "legal",
          brand: process.brand,
          deadline: process.legalDeadline,
          daysLeft,
          risk,
          action: process.nextAction
        });
      }
    }
  });
  
  alerts.sort((a, b) => a.daysLeft - b.daysLeft);
  return alerts;
}

/**
 * Gera HTML do dashboard do cliente
 */
function renderClientDashboard(client, processes) {
  const riskTone = {
    overdue: "red",
    today: "red",
    critical: "red",
    warning: "amber",
    ok: "green"
  };
  
  return `
    <div style="max-width: 800px; margin: 0 auto; padding: 20px; font-family: system-ui, sans-serif;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #126b52; margin-bottom: 5px;">MarcaFlow</h1>
        <p style="color: #66736e;">Acompanhamento de Processo</p>
      </div>
      
      <div style="background: white; border-radius: 8px; padding: 20px; margin-bottom: 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
        <h2 style="margin-top: 0; color: #1d2925;">📋 ${escapeHtml(client.name)}</h2>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-top: 15px;">
          <div><strong>CPF/CNPJ:</strong> ${escapeHtml(client.document || "Não informado")}</div>
          <div><strong>E-mail:</strong> ${escapeHtml(client.email || "Não informado")}</div>
          <div><strong>Processos:</strong> ${processes.length}</div>
        </div>
      </div>
      
      ${processes.length ? `
        <div style="background: white; border-radius: 8px; padding: 20px; margin-bottom: 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <h3 style="margin-top: 0; color: #1d2925;">📑 Processos</h3>
          ${processes.map(process => {
            const classes = process.classes ? process.classes.split(",").map(c => c.trim()).filter(Boolean) : [];
            const statusToneClass = statusTone(process.status);
            return `
              <div style="border: 1px solid #dce5e1; border-radius: 6px; padding: 15px; margin-bottom: 10px;">
                <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 10px;">
                  <div>
                    <h4 style="margin: 0; color: #1d2925;">${escapeHtml(process.brand)}</h4>
                    <p style="margin: 5px 0 0; color: #66736e; font-size: 12px;">Processo: ${escapeHtml(process.number || "Pré-depósito")} · Classes: ${classes.join(", ")}</p>
                  </div>
                  <span class="badge ${statusToneClass}" style="font-size: 11px; padding: 4px 8px;">${escapeHtml(process.status)}</span>
                </div>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 10px; font-size: 12px; color: #66736e;">
                  <div>Etapa: ${escapeHtml(process.flowStage)}</div>
                  <div>Próxima ação: ${escapeHtml(process.nextAction)}</div>
                  ${process.internalDeadline ? `<div>Prazo interno: ${formatDate(process.internalDeadline)} (${daysUntil(process.internalDeadline) < 0 ? "VENCIDO" : daysUntil(process.internalDeadline) + "d"})</div>` : ""}
                  ${process.legalDeadline ? `<div>Prazo legal: ${formatDate(process.legalDeadline)} (${daysUntil(process.legalDeadline) < 0 ? "VENCIDO" : daysUntil(process.legalDeadline) + "d"})</div>` : ""}
                </div>
              </div>
            `;
          }).join("")}
        </div>
      ` : '<div style="background: white; border-radius: 8px; padding: 20px; text-align: center; color: #66736e;">Nenhum processo encontrado.</div>'}
      
      <div style="text-align: center; padding: 20px; color: #66736e; font-size: 12px;">
        <p>MarcaFlow - Gestão de Propriedade Industrial</p>
        <p>Última atualização: ${new Date().toLocaleDateString("pt-BR")} às ${new Date().toLocaleTimeString("pt-BR")}</p>
      </div>
    </div>
  `;
}

/**
 * Gera link de acesso público para cliente
 */
function generateClientLink(clientId) {
  const token = generateClientToken(clientId);
  const baseUrl = window.location.origin;
  return `${baseUrl}/client-dashboard.html?token=${token}`;
}

/**
 * Expor para uso global
 */
window.generateClientToken = generateClientToken;
window.validateClientToken = validateClientToken;
window.getClientProcesses = getClientProcesses;
window.getClientAlerts = getClientAlerts;
window.renderClientDashboard = renderClientDashboard;
window.generateClientLink = generateClientLink;

export {
  generateClientToken,
  validateClientToken,
  getClientProcesses,
  getClientAlerts,
  renderClientDashboard,
  generateClientLink
};
