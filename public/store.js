import { flowStageByStatus, legacyDiscountCategory } from "./utils.js?v=2026.08.29";

const STORAGE_KEY = "marcaflow-v1";

const today = new Date();
const iso = (offset = 0) => {
  const date = new Date(today);
  date.setDate(date.getDate() + offset);
  return date.toISOString().slice(0, 10);
};

const seed = { clients: [], processes: [], documents: [], movements: [], imports: [], diagnoses: [], availabilityChecks: [] };
const legacyDemoBrands = new Set(["AURORA ATELIÊ", "NORTE VIVO", "ÓRBITA DIGITAL", "VERDE ROTA", "CASA NORTE", "LUMI"]);

let data = load();
let loadingCloudData = false;

function load() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) return structuredClone(seed);
  const workspace = JSON.parse(saved);
  const demoIds = new Set((workspace.processes || []).filter(item => legacyDemoBrands.has(item.brand)).map(item => item.id));
  if (!demoIds.size) return workspace;
  workspace.processes = (workspace.processes || []).filter(item => !demoIds.has(item.id));
  workspace.documents = (workspace.documents || []).filter(item => !demoIds.has(item.processId));
  const activeClientIds = new Set(workspace.processes.map(item => item.clientId));
  workspace.clients = (workspace.clients || []).filter(item => activeClientIds.has(item.id));
  localStorage.setItem(STORAGE_KEY, JSON.stringify(workspace));
  return workspace;
}

function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

// Substitui o workspace em memória preservando a referência exportada.
function setData(next) {
  for (const key of Object.keys(data)) delete data[key];
  Object.assign(data, next);
}

function ensureCollections() {
  data.clients ||= [];
  data.processes ||= [];
  data.documents ||= [];
  data.movements ||= [];
  data.imports ||= [];
  data.diagnoses ||= [];
  data.availabilityChecks ||= [];
  data.clients.forEach((item) => {
    item.legalNature ||= "";
    item.businessActivity ||= "";
    item.discountEligible ||= "";
    item.discountCategory ||= legacyDiscountCategory(item);
    item.naturalPersonNoSameSectorParticipation ||= "";
    item.coHoldersEligible ||= "Não se aplica";
    item.discountEvidence ||= "";
  });
  data.processes.forEach((item) => {
    item.flowStage ||= flowStageByStatus[item.status] || "Exame";
    item.filingDate ||= "";
    item.lastRpi ||= "";
    item.lastDispatchCode ||= "";
    item.lastDispatchName ||= "";
    item.lastPublicationDate ||= "";
    item.nextAction ||= "Próxima ação a definir";
    item.nature ||= "";
    item.specification ||= "";
    item.salesChannels ||= "";
    item.geographicScope ||= "";
    item.logoReference ||= "";
    item.priorRisk ||= "Não avaliado";
  });
}

function client(id) { return data.clients.find((item) => item.id === id) || { name: "Cliente não informado" }; }
function processById(id) { return data.processes.find((item) => item.id === id); }

export { data, seed, STORAGE_KEY, iso, client, processById, load, save, setData, ensureCollections };
