/**
 * MarcaFlow - Módulo de Alertas Proativos
 * Notificações push, email e integração com Google Calendar
 */

import { data, client, iso, save } from "./store.js?v=2026.08.29";
import { daysUntil, processRisk, legalRisk, riskLabels, formatDate } from "./business.js?v=2026.08.29";
import { escapeHtml } from "./utils.js?v=2026.08.29";

const ALERT_THRESHOLDS = [55, 50, 45, 40, 30, 21, 14, 7, 5, 3, 2, 1, 0];
const ALERT_STORAGE_KEY = "marcaflow-alerts-config";

/**
 * Configuração de alertas do usuário
 */
let alertConfig = loadAlertConfig();

function loadAlertConfig() {
  try {
    const saved = localStorage.getItem(ALERT_STORAGE_KEY);
    if (saved) return JSON.parse(saved);
  } catch (error) {
    console.warn("Erro ao carregar config de alertas:", error);
  }
  return {
    enabled: true,
    channels: { push: true, email: false, calendar: true },
    thresholds: [...ALERT_THRESHOLDS],
    processIds: [] // Vazio = todos os processos
  };
}

function saveAlertConfig() {
  localStorage.setItem(ALERT_STORAGE_KEY, JSON.stringify(alertConfig));
}

/**
 * Verifica processos com prazos próximos e gera alertas
 * @returns {Array} Lista de alertas gerados
 */
function checkUpcomingAlerts() {
  if (!alertConfig.enabled) return [];

  const alerts = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  data.processes.forEach(process => {
    // Verifica se deve monitorar este processo
    if (alertConfig.processIds.length > 0 && 
        !alertConfig.processIds.includes(process.id)) {
      return;
    }

    // Verifica prazo interno
    if (process.internalDeadline) {
      const daysLeft = daysUntil(process.internalDeadline);
      const risk = processRisk(process);
      
      if (ALERT_THRESHOLDS.includes(daysLeft) || risk !== "ok") {
        alerts.push({
          type: "internal",
          processId: process.id,
          brand: process.brand,
          client: client(process.clientId).name,
          deadline: process.internalDeadline,
          daysLeft,
          risk,
          action: process.nextAction,
          message: generateInternalAlertMessage(process, daysLeft, risk)
        });
      }
    }

    // Verifica prazo legal
    if (process.legalDeadline) {
      const daysLeft = daysUntil(process.legalDeadline);
      const risk = legalRisk(process);
      
      if (ALERT_THRESHOLDS.includes(daysLeft) || risk !== "ok") {
        alerts.push({
          type: "legal",
          processId: process.id,
          brand: process.brand,
          client: client(process.clientId).name,
          deadline: process.legalDeadline,
          daysLeft,
          risk,
          action: process.nextAction,
          message: generateLegalAlertMessage(process, daysLeft, risk)
        });
      }
    }
  });

  // Ordena por urgência (menor daysLeft primeiro)
  alerts.sort((a, b) => a.daysLeft - b.daysLeft);
  return alerts;
}

/**
 * Gera mensagem de alerta para prazo interno
 */
function generateInternalAlertMessage(process, daysLeft, risk) {
  const riskLabel = riskLabels[risk] || "Em dia";
  
  if (daysLeft < 0) {
    return `⚠️ PRAZO VENCIDO! Prazo interno da marca ${process.brand} venceu há ${Math.abs(daysLeft)} dia(s). Ação: ${process.nextAction}.`;
  }
  if (daysLeft === 0) {
    return `🔴 PRAZO HOJE! Prazo interno da marca ${process.brand} vence hoje. Ação: ${process.nextAction}.`;
  }
  if (daysLeft <= 2) {
    return `🔴 PRAZO CRÍTICO! Prazo interno da marca ${process.brand} vence em ${daysLeft} dia(s). Ação: ${process.nextAction}.`;
  }
  if (daysLeft <= 7) {
    return `🟡 PRAZO ATENÇÃO! Prazo interno da marca ${process.brand} vence em ${daysLeft} dias. Ação: ${process.nextAction}.`;
  }
  return `📅 PRAZO LEMBRETE! Prazo interno da marca ${process.brand} vence em ${daysLeft} dias. Ação: ${process.nextAction}.`;
}

/**
 * Gera mensagem de alerta para prazo legal
 */
function generateLegalAlertMessage(process, daysLeft, risk) {
  const riskLabel = riskLabels[risk] || "Em dia";
  
  if (daysLeft < 0) {
    return `⚠️ PRAZO LEGAL VENCIDO! Prazo legal da marca ${process.brand} venceu há ${Math.abs(daysLeft)} dia(s). Risco de preclusão!`;
  }
  if (daysLeft === 0) {
    return `🔴 PRAZO LEGAL HOJE! Prazo legal da marca ${process.brand} vence hoje. Decida imediatamente!`;
  }
  if (daysLeft <= 2) {
    return `🔴 PRAZO LEGAL CRÍTICO! Prazo legal da marca ${process.brand} vence em ${daysLeft} dia(s). Preclusão iminente!`;
  }
  if (daysLeft <= 7) {
    return `🟡 PRAZO LEGAL ATENÇÃO! Prazo legal da marca ${process.brand} vence em ${daysLeft} dias.`;
  }
  return `📅 PRAZO LEGAL LEMBRETE! Prazo legal da marca ${process.brand} vence em ${daysLeft} dias.`;
}

/**
 * Envia notificação push (se suportado)
 */
async function sendPushNotification(alert) {
  if (!alertConfig.channels.push) return false;
  if (!("Notification" in window)) return false;
  if (Notification.permission !== "granted") return false;

  try {
    const notification = new Notification(`MarcaFlow: ${alert.risk === "overdue" ? "VENCIDO" : alert.daysLeft + " dias"}`, {
      body: alert.message,
      icon: "/favicon.ico",
      tag: `marcaflow-${alert.processId}-${alert.type}`
    });

    notification.onclick = () => {
      window.focus();
      window.view = "deadlines";
      window.render();
    };

    return true;
  } catch (error) {
    console.error("Erro ao enviar notificação push:", error);
    return false;
  }
}

/**
 * Gera link para Google Calendar
 */
function generateCalendarLink(alert) {
  const startDate = new Date(`${alert.deadline}T09:00:00`);
  const endDate = new Date(`${alert.deadline}T17:00:00`);
  
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: `MarcaFlow: ${alert.action} - ${alert.brand}`,
    details: `Processo: ${alert.processId}\nCliente: ${alert.client}\nTipo: ${alert.type === "internal" ? "Prazo Interno" : "Prazo Legal"}\nRisco: ${alert.riskLabels[alert.risk]}\n\nPrazo: ${formatDate(alert.deadline)}\n\n${alert.message}`,
    dates: `${formatCalendarDate(startDate)}/${formatCalendarDate(endDate)}`,
    location: "MarcaFlow - Gestão INPI"
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

/**
 * Formata data para URL do Google Calendar
 */
function formatCalendarDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}${month}${day}T090000`;
}

/**
 * Gera HTML do painel de alertas
 */
function renderAlertsPanel() {
  const alerts = checkUpcomingAlerts();
  
  if (!alerts.length) {
    return '<div class="empty">Nenhum alerta pendente. Todos os prazos estão em dia!</div>';
  }

  const riskTone = {
    overdue: "red",
    today: "red",
    critical: "red",
    warning: "amber",
    ok: "green"
  };

  return `
    <div class="alert-grid" style="margin-top: 15px;">
      ${alerts.slice(0, 6).map(alert => `
        <article class="alert-card ${riskTone[alert.risk] || 'gray'}">
          <div>
            <span class="badge ${riskTone[alert.risk] || 'gray'}">${alert.risk === "overdue" ? "VENCIDO" : alert.daysLeft + "d"}</span>
            <h3>${escapeHtml(alert.brand)}</h3>
            <p>${escapeHtml(alert.action)}</p>
          </div>
          <div class="alert-card-dates">
            <span>${alert.type === "internal" ? "Interno" : "Legal"}: ${formatDate(alert.deadline)}</span>
            <span>${escapeHtml(alert.client)}</span>
            <button class="text-button" data-calendar-alert="${alert.processId}-${alert.type}">📅 Google Calendar</button>
            <button class="text-button" data-copy-alert="${alert.processId}-${alert.type}">📋 Copiar</button>
          </div>
        </article>
      `).join("")}
    </div>
    <div class="notice quiet" style="margin-top: 15px;">
      <strong>Total:</strong> ${alerts.length} alerta(s) | 
      <strong>Urgentes:</strong> ${alerts.filter(a => ["overdue", "today", "critical"].includes(a.risk)).length} |
      <strong>Atenção:</strong> ${alerts.filter(a => a.risk === "warning").length}
    </div>
  `;
}

/**
 * Handler para botões de ação de alertas
 */
function bindAlertActions() {
  document.querySelectorAll("[data-calendar-alert]").forEach(button => {
    button.addEventListener("click", (event) => {
      const [processId, type] = button.dataset.calendarAlert.split("-");
      const alerts = checkUpcomingAlerts();
      const alert = alerts.find(a => a.processId === processId && a.type === type);
      if (alert) {
        const calendarUrl = generateCalendarLink(alert);
        window.open(calendarUrl, "_blank");
      }
    });
  });

  document.querySelectorAll("[data-copy-alert]").forEach(button => {
    button.addEventListener("click", (event) => {
      const [processId, type] = button.dataset.copyAlert.split("-");
      const alerts = checkUpcomingAlerts();
      const alert = alerts.find(a => a.processId === processId && a.type === type);
      if (alert) {
        navigator.clipboard.writeText(alert.message).then(() => {
          alert("Alerta copiado para a área de transferência!");
        }).catch(() => {
          window.prompt("Copie o alerta:", alert.message);
        });
      }
    });
  });
}

/**
 * Renderiza view de alertas
 */
function alertsView() {
  return `
    <div class="page-head"><div><h2>Alertas Proativos</h2><p>Monitore prazos internos e legais com antecedência.</p></div></div>
    <div class="notice quiet">
      <strong>Configuração ativa:</strong> 
      Push: ${alertConfig.channels.push ? "✅" : "❌"} | 
      Email: ${alertConfig.channels.email ? "✅" : "❌"} | 
      Calendar: ${alertConfig.channels.calendar ? "✅" : "❌"}
    </div>
    ${renderAlertsPanel()}
    <div class="page-actions" style="margin-top: 15px;">
      <button class="secondary-button" id="configure-alerts">⚙️ Configurar alertas</button>
      <button class="secondary-button" id="request-notification-permission">🔔 Ativar notificações</button>
    </div>
  `;
}

/**
 * Handler para solicitar permissão de notificações
 */
function requestNotificationPermission() {
  if (!("Notification" in window)) {
    alert("Este navegador não suporta notificações push.");
    return;
  }
  if (Notification.permission === "granted") {
    alert("Notificações já estão ativadas!");
    return;
  }
  if (Notification.permission !== "denied") {
    Notification.requestPermission().then(permission => {
      if (permission === "granted") {
        alert("Notificações ativadas! Você receberá alertas no navegador.");
        alertConfig.channels.push = true;
        saveAlertConfig();
      }
    });
  }
}

/**
 * Verifica alertas periodicamente
 */
function startAlertChecker() {
  // Verifica a cada 5 minutos
  setInterval(() => {
    const alerts = checkUpcomingAlerts();
    if (alerts.length > 0 && alertConfig.channels.push) {
      // Envia o alerta mais urgente
      sendPushNotification(alerts[0]);
    }
  }, 5 * 60 * 1000);

  // Verifica imediatamente ao carregar
  const initialAlerts = checkUpcomingAlerts();
  if (initialAlerts.length > 0 && alertConfig.channels.push) {
    sendPushNotification(initialAlerts[0]);
  }
}

// Expor para uso global
window.checkUpcomingAlerts = checkUpcomingAlerts;
window.renderAlertsPanel = renderAlertsPanel;
window.alertsView = alertsView;
window.requestNotificationPermission = requestNotificationPermission;
window.startAlertChecker = startAlertChecker;

export {
  checkUpcomingAlerts,
  renderAlertsPanel,
  alertsView,
  requestNotificationPermission,
  startAlertChecker,
  generateCalendarLink,
  alertConfig,
  saveAlertConfig
};
