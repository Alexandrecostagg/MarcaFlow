/**
 * MarcaFlow - Módulo de Relatórios para Clientes
 * Geração de relatórios HTML/PDF customizáveis
 */

import { data, client } from "./store.js";
import { escapeHtml, downloadJson } from "./utils.js";
import { formatDate, daysUntil, statusTone, processRisk, legalRisk, formatMoney } from "./business.js";

/**
 * Gera relatório HTML de andamento de processo
 */
function generateProcessReport(processId, options = {}) {
  const process = data.processes.find(p => p.id === processId);
  if (!process) return "Processo não encontrado.";
  
  const clientData = client(process.clientId);
  const classes = process.classes ? process.classes.split(",").map(c => c.trim()).filter(Boolean) : [];
  
  const internalRisk = processRisk(process);
  const legalRiskStatus = legalRisk(process);
  
  const html = `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Relatório - ${escapeHtml(process.brand)}</title>
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; color: #333; line-height: 1.6; }
        .header { text-align: center; border-bottom: 3px solid #126b52; padding-bottom: 20px; margin-bottom: 30px; }
        .header h1 { color: #126b52; margin-bottom: 5px; font-size: 24px; }
        .header p { color: #666; font-size: 14px; }
        .card { background: #f8f9fa; border-radius: 8px; padding: 20px; margin-bottom: 20px; border-left: 4px solid #126b52; }
        .card h2 { margin-top: 0; color: #126b52; font-size: 18px; }
        .info-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-top: 15px; }
        .info-item { font-size: 13px; }
        .info-item strong { color: #666; display: block; margin-bottom: 3px; }
        .badge { display: inline-block; padding: 4px 10px; border-radius: 20px; font-size: 12px; font-weight: 700; }
        .badge.green { background: #e5f4ed; color: #126b52; }
        .badge.blue { background: #e9f2f8; color: #2e638d; }
        .badge.amber { background: #fff3d8; color: #a9650b; }
        .badge.red { background: #fbe9e6; color: #a63b34; }
        .alert-item { padding: 12px; border-left: 4px solid; border-radius: 4px; margin-bottom: 8px; background: #fff; }
        .alert-item.overdue { border-color: #a63b34; background: #fbe9e6; }
        .alert-item.critical { border-color: #a63b34; background: #fbe9e6; }
        .alert-item.warning { border-color: #a9650b; background: #fff3d8; }
        .footer { text-align: center; padding: 30px 0; border-top: 1px solid #ddd; color: #666; font-size: 12px; }
        .print-btn { display: block; width: 200px; margin: 20px auto; padding: 12px; background: #126b52; color: white; border: none; border-radius: 6px; font-size: 14px; cursor: pointer; }
        .print-btn:hover { background: #0d513e; }
        @media print { .print-btn { display: none; } }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>📋 Relatório de Andamento</h1>
        <p>MarcaFlow - Gestão de Propriedade Industrial</p>
      </div>
      
      <div class="card">
        <h2>Dados do Processo</h2>
        <div class="info-grid">
          <div class="info-item"><strong>Cliente:</strong> ${escapeHtml(clientData.name)}</div>
          <div class="info-item"><strong>Marca:</strong> ${escapeHtml(process.brand)}</div>
          <div class="info-item"><strong>Processo:</strong> ${escapeHtml(process.number || "Pré-depósito")}</div>
          <div class="info-item"><strong>Classes:</strong> ${classes.join(", ")}</div>
          <div class="info-item"><strong>Status:</strong> <span class="badge ${statusTone(process.status)}">${escapeHtml(process.status)}</span></div>
          <div class="info-item"><strong>Etapa:</strong> ${escapeHtml(process.flowStage)}</div>
          <div class="info-item"><strong>Apresentação:</strong> ${escapeHtml(process.presentation)}</div>
          <div class="info-item"><strong>Data de Depósito:</strong> ${formatDate(process.filingDate)}</div>
        </div>
      </div>
      
      ${process.internalDeadline ? `
        <div class="card">
          <h2>⏰ Prazos</h2>
          <div class="info-grid">
            <div class="info-item"><strong>Prazo Interno:</strong> ${formatDate(process.internalDeadline)} <span class="badge ${internalRisk === 'overdue' ? 'red' : internalRisk === 'critical' ? 'red' : internalRisk === 'warning' ? 'amber' : 'green'}">${internalRisk === 'overdue' ? 'VENCIDO' : internalRisk === 'today' ? 'HOJE' : daysUntil(process.internalDeadline) + ' dias'}</span></div>
            <div class="info-item"><strong>Prazo Legal:</strong> ${formatDate(process.legalDeadline)} <span class="badge ${legalRiskStatus === 'overdue' ? 'red' : legalRiskStatus === 'critical' ? 'red' : legalRiskStatus === 'warning' ? 'amber' : 'green'}">${legalRiskStatus === 'overdue' ? 'VENCIDO' : legalRiskStatus === 'today' ? 'HOJE' : daysUntil(process.legalDeadline) + ' dias'}</span></div>
          </div>
          ${internalRisk !== 'ok' || legalRiskStatus !== 'ok' ? `
            <div style="margin-top: 15px;">
              ${internalRisk !== 'ok' ? `<div class="alert-item ${internalRisk}"><strong>⚠️ Prazo Interno:</strong> ${daysUntil(process.internalDeadline) < 0 ? 'VENCIDO!' : daysUntil(process.internalDeadline) + ' dia(s) restante(s)'}</div>` : ''}
              ${legalRiskStatus !== 'ok' ? `<div class="alert-item ${legalRiskStatus}"><strong>⚠️ Prazo Legal:</strong> ${daysUntil(process.legalDeadline) < 0 ? 'VENCIDO!' : daysUntil(process.legalDeadline) + ' dia(s) restante(s)'}</div>` : ''}
            </div>
          ` : ''}
        </div>
      ` : ''}
      
      <div class="card">
        <h2>📝 Informações Adicionais</h2>
        <div class="info-grid">
          <div class="info-item"><strong>Próxima Ação:</strong> ${escapeHtml(process.nextAction)}</div>
          <div class="info-item"><strong>Responsável:</strong> ${escapeHtml(process.owner || "Não informado")}</div>
          <div class="info-item"><strong>Última RPI:</strong> ${escapeHtml(process.lastRpi || "Não informada")}</div>
          <div class="info-item"><strong>Último Despacho:</strong> ${escapeHtml(process.lastDispatchCode ? `${process.lastDispatchCode} - ${process.lastDispatchName}` : "Não informado")}</div>
          ${process.specification ? `<div class="info-item" style="grid-column: span 2;"><strong>Especificação:</strong> ${escapeHtml(process.specification)}</div>` : ''}
          ${process.salesChannels ? `<div class="info-item"><strong>Canais de Venda:</strong> ${escapeHtml(process.salesChannels)}</div>` : ''}
          ${process.geographicScope ? `<div class="info-item"><strong>Área de Atuação:</strong> ${escapeHtml(process.geographicScope)}</div>` : ''}
        </div>
      </div>
      
      ${process.notes ? `
        <div class="card">
          <h2>📌 Observações</h2>
          <p>${escapeHtml(process.notes)}</p>
        </div>
      ` : ''}
      
      <div class="footer">
        <p>Relatório gerado em ${new Date().toLocaleDateString("pt-BR")} às ${new Date().toLocaleTimeString("pt-BR")}</p>
        <p>MarcaFlow - Tecnologia para Propriedade Industrial</p>
        <p style="margin-top: 10px; font-size: 11px; color: #999;">Este relatório é informativo e não constitui parecer jurídico.</p>
      </div>
      
      <button class="print-btn" onclick="window.print()">🖨️ Imprimir / Salvar PDF</button>
    </body>
    </html>
  `;
  
  return html;
}

/**
 * Gera relatório resumido de todos os processos de um cliente
 */
function generateClientSummaryReport(clientId) {
  const clientData = client(clientId);
  const processes = data.processes.filter(p => p.clientId === clientId);
  
  if (!processes.length) return "Nenhum processo encontrado para este cliente.";
  
  const html = `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Resumo - ${escapeHtml(clientData.name)}</title>
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 900px; margin: 0 auto; padding: 20px; color: #333; line-height: 1.6; }
        .header { text-align: center; border-bottom: 3px solid #126b52; padding-bottom: 20px; margin-bottom: 30px; }
        .header h1 { color: #126b52; margin-bottom: 5px; font-size: 24px; }
        .card { background: #f8f9fa; border-radius: 8px; padding: 20px; margin-bottom: 20px; }
        .card h2 { margin-top: 0; color: #126b52; font-size: 18px; }
        table { width: 100%; border-collapse: collapse; margin-top: 15px; }
        th, td { padding: 10px; text-align: left; border-bottom: 1px solid #ddd; font-size: 13px; }
        th { background: #126b52; color: white; font-weight: 600; }
        tr:hover { background: #f5f5f5; }
        .badge { display: inline-block; padding: 3px 8px; border-radius: 12px; font-size: 11px; font-weight: 700; }
        .badge.green { background: #e5f4ed; color: #126b52; }
        .badge.blue { background: #e9f2f8; color: #2e638d; }
        .badge.amber { background: #fff3d8; color: #a9650b; }
        .badge.red { background: #fbe9e6; color: #a63b34; }
        .badge.gray { background: #edf1ef; color: #59645f; }
        .footer { text-align: center; padding: 30px 0; border-top: 1px solid #ddd; color: #666; font-size: 12px; }
        .print-btn { display: block; width: 200px; margin: 20px auto; padding: 12px; background: #126b52; color: white; border: none; border-radius: 6px; font-size: 14px; cursor: pointer; }
        .print-btn:hover { background: #0d513e; }
        @media print { .print-btn { display: none; } }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>📊 Resumo de Processos</h1>
        <p>Cliente: ${escapeHtml(clientData.name)}</p>
      </div>
      
      <div class="card">
        <h2>Processos (${processes.length})</h2>
        <table>
          <thead>
            <tr>
              <th>Marca</th>
              <th>Processo</th>
              <th>Classes</th>
              <th>Status</th>
              <th>Etapa</th>
              <th>Prazo Interno</th>
              <th>Próxima Ação</th>
            </tr>
          </thead>
          <tbody>
            ${processes.map(process => {
              const classes = process.classes ? process.classes.split(",").map(c => c.trim()).filter(Boolean) : [];
              const internalRisk = processRisk(process);
              return `
                <tr>
                  <td><strong>${escapeHtml(process.brand)}</strong></td>
                  <td>${escapeHtml(process.number || "Pré-depósito")}</td>
                  <td>${classes.join(", ")}</td>
                  <td><span class="badge ${statusTone(process.status)}">${escapeHtml(process.status)}</span></td>
                  <td>${escapeHtml(process.flowStage)}</td>
                  <td>${process.internalDeadline ? `<span class="badge ${internalRisk === 'overdue' ? 'red' : internalRisk === 'warning' ? 'amber' : 'green'}">${formatDate(process.internalDeadline)}</span>` : "Sem prazo"}</td>
                  <td>${escapeHtml(process.nextAction)}</td>
                </tr>
              `;
            }).join("")}
          </tbody>
        </table>
      </div>
      
      <div class="footer">
        <p>Relatório gerado em ${new Date().toLocaleDateString("pt-BR")} às ${new Date().toLocaleTimeString("pt-BR")}</p>
        <p>MarcaFlow - Tecnologia para Propriedade Industrial</p>
      </div>
      
      <button class="print-btn" onclick="window.print()">🖨️ Imprimir / Salvar PDF</button>
    </body>
    </html>
  `;
  
  return html;
}

/**
 * Salva relatório como HTML
 */
function saveReportHTML(html, filename) {
  const blob = new Blob([html], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

/**
 * Expor para uso global
 */
window.generateProcessReport = generateProcessReport;
window.generateClientSummaryReport = generateClientSummaryReport;
window.saveReportHTML = saveReportHTML;

export {
  generateProcessReport,
  generateClientSummaryReport,
  saveReportHTML
};
