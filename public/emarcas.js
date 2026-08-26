/**
 * MarcaFlow - Módulo de Integração com e-Marcas
 * Sincronização bidirecional com sistema oficial do INPI
 */

import { data, client, save } from "./store.js?v=2026.08.29";
import { escapeHtml } from "./utils.js?v=2026.08.29";

const E_MARCAS_BASE_URL = "https://sistema.inpi.gov.br";
const SYNC_STATUS_KEY = "marcaflow-last-sync";

/**
 * Status de sincronização
 */
let syncStatus = loadSyncStatus();

function loadSyncStatus() {
  try {
    const saved = localStorage.getItem(SYNC_STATUS_KEY);
    if (saved) return JSON.parse(saved);
  } catch (error) {
    console.warn("Erro ao carregar status de sync:", error);
  }
  return {
    lastSync: null,
    lastSyncType: null, // "full" ou "incremental"
    totalProcesses: 0,
    updatedProcesses: 0,
    errors: []
  };
}

function saveSyncStatus() {
  localStorage.setItem(SYNC_STATUS_KEY, JSON.stringify(syncStatus));
}

/**
 * Simula sincronização com e-Marcas
 * Em produção, usaria API oficial do INPI
 */
async function syncWithEMarcas(options = {}) {
  const { type = "full", processIds = [] } = options;
  
  syncStatus.lastSyncType = type;
  syncStatus.updatedProcesses = 0;
  syncStatus.errors = [];
  
  try {
    // Simula chamada à API do e-Marcas
    // Em produção: fetch(`${E_MARCAS_BASE_URL}/api/processos`, ...)
    
    if (type === "full") {
      // Sincronização completa
      console.log("Sincronização completa iniciada...");
      
      // Simula delay de rede
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Em produção, buscaria todos os processos do usuário no e-Marcas
      // e atualizaria os dados locais
      
      syncStatus.totalProcesses = data.processes.length;
      syncStatus.updatedProcesses = data.processes.length;
      syncStatus.lastSync = new Date().toISOString();
      
    } else if (type === "incremental" && processIds.length) {
      // Sincronização incremental (apenas processos selecionados)
      console.log(`Sincronização incremental: ${processIds.length} processo(s)...`);
      
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Em produção, buscaria apenas os processos especificados
      
      syncStatus.updatedProcesses = processIds.length;
      syncStatus.lastSync = new Date().toISOString();
    }
    
    saveSyncStatus();
    
    return {
      success: true,
      type,
      totalProcesses: syncStatus.totalProcesses,
      updatedProcesses: syncStatus.updatedProcesses,
      timestamp: syncStatus.lastSync
    };
    
  } catch (error) {
    console.error("Erro na sincronização:", error);
    syncStatus.errors.push({
      timestamp: new Date().toISOString(),
      error: error.message,
      type
    });
    saveSyncStatus();
    
    return {
      success: false,
      error: error.message,
      type
    };
  }
}

/**
 * Busca status de um processo no e-Marcas
 */
async function fetchProcessStatus(processNumber) {
  try {
    // Simula chamada à API
    // Em produção: fetch(`${E_MARCAS_BASE_URL}/api/processos/${processNumber}`)
    
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Retorna dados mock (em produção, dados reais do INPI)
    return {
      number: processNumber,
      status: "Em exame",
      flowStage: "Exame",
      lastDispatch: "IPAS024 - Exigência formal",
      lastPublication: "RPI 2891 de 15/07/2025",
      nextAction: "Responder exigência formal",
      legalDeadline: "2025-08-19",
      internalDeadline: "2025-08-18"
    };
    
  } catch (error) {
    console.error("Erro ao buscar status:", error);
    throw error;
  }
}

/**
 * Atualiza processo local com dados do e-Marcas
 */
function updateProcessFromEMarcas(processId, eMarcasData) {
  const process = data.processes.find(p => p.id === processId);
  if (!process) {
    console.warn(`Processo ${processId} não encontrado.`);
    return false;
  }
  
  // Atualiza campos
  process.status = eMarcasData.status || process.status;
  process.flowStage = eMarcasData.flowStage || process.flowStage;
  process.lastRpi = eMarcasData.lastPublication || process.lastRpi;
  process.lastDispatchCode = eMarcasData.lastDispatch?.split(" ")[0] || process.lastDispatchCode;
  process.lastDispatchName = eMarcasData.lastDispatch?.split(" - ")[1] || process.lastDispatchName;
  process.nextAction = eMarcasData.nextAction || process.nextAction;
  process.legalDeadline = eMarcasData.legalDeadline || process.legalDeadline;
  process.internalDeadline = eMarcasData.internalDeadline || process.internalDeadline;
  
  save();
  return true;
}

/**
 * Renderiza painel de sincronização
 */
function renderSyncPanel() {
  const lastSync = syncStatus.lastSync ? new Date(syncStatus.lastSync).toLocaleString("pt-BR") : "Nunca";
  
  return `
    <div class="panel" style="margin-top: 15px;">
      <div class="panel-header"><div><h3>Integração com e-Marcas</h3></div></div>
      <div class="panel-body">
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-bottom: 15px;">
          <div><strong>Última sincronização:</strong> ${escapeHtml(lastSync)}</div>
          <div><strong>Total de processos:</strong> ${syncStatus.totalProcesses}</div>
          <div><strong>Último tipo:</strong> ${escapeHtml(syncStatus.lastSyncType || "N/A")}</div>
        </div>
        
        <div class="page-actions">
          <button class="primary-button" id="sync-full">🔄 Sincronizar Completo</button>
          <button class="secondary-button" id="sync-incremental">📋 Sincronização Parcial</button>
          <button class="secondary-button" id="sync-status">📊 Status</button>
        </div>
        
        ${syncStatus.errors.length ? `
          <div class="notice" style="margin-top: 15px;">
            <strong>Erros recentes:</strong>
            ${syncStatus.errors.slice(-3).map(error => `<div>${escapeHtml(error.error)} - ${new Date(error.timestamp).toLocaleString("pt-BR")}</div>`).join("")}
          </div>
        ` : ''}
      </div>
    </div>
  `;
}

/**
 * Handler para sincronização completa
 */
async function handleFullSync() {
  const result = await syncWithEMarcas({ type: "full" });
  if (result.success) {
    alert(`Sincronização completa concluída! ${result.updatedProcesses} processo(s) atualizado(s).`);
    window.render();
  } else {
    alert(`Erro na sincronização: ${result.error}`);
  }
}

/**
 * Handler para sincronização incremental
 */
async function handleIncrementalSync() {
  const selectedProcesses = data.processes.filter(p => p.number).slice(0, 5); // Mock: seleciona primeiros 5
  const ids = selectedProcesses.map(p => p.id);
  
  const result = await syncWithEMarcas({ type: "incremental", processIds: ids });
  if (result.success) {
    alert(`Sincronização parcial concluída! ${result.updatedProcesses} processo(s) atualizado(s).`);
    window.render();
  } else {
    alert(`Erro na sincronização: ${result.error}`);
  }
}

/**
 * Handler para visualização de status
 */
function handleSyncStatus() {
  alert(`Status da Sincronização:\n\n` +
    `Última: ${syncStatus.lastSync ? new Date(syncStatus.lastSync).toLocaleString("pt-BR") : "Nunca"}\n` +
    `Tipo: ${syncStatus.lastSyncType || "N/A"}\n` +
    `Total: ${syncStatus.totalProcesses} processos\n` +
    `Atualizados: ${syncStatus.updatedProcesses}\n` +
    `Erros: ${syncStatus.errors.length}`);
}

// Expor para uso global
window.syncWithEMarcas = syncWithEMarcas;
window.fetchProcessStatus = fetchProcessStatus;
window.updateProcessFromEMarcas = updateProcessFromEMarcas;
window.renderSyncPanel = renderSyncPanel;
window.handleFullSync = handleFullSync;
window.handleIncrementalSync = handleIncrementalSync;
window.handleSyncStatus = handleSyncStatus;
window.syncStatus = syncStatus;

export {
  handleFullSync,
  handleIncrementalSync,
  handleSyncStatus,
  syncWithEMarcas,
  fetchProcessStatus,
  updateProcessFromEMarcas,
  renderSyncPanel,
  E_MARCAS_BASE_URL
};
