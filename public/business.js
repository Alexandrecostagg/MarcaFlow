import { iso, data } from "./store.js?v=2026.08.29";
import { flowStageByStatus } from "./utils.js?v=2026.08.29";

const today = new Date();

const funnelStages = ["Busca prévia", "Depósito", "Publicação", "Exame", "Oposição", "Recurso", "Concessão", "Registro", "Renovação"];

const OFFICIAL_FEES = {
  effectiveFrom: "20/12/2025",
  source: "Tabela de Retribuições do INPI — Marcas",
  sourceUrl: "https://www.gov.br/inpi/pt-br/servicos/marcas/NovaTabeladeRetribuiesINPI_MARCAS_Final_20_dez_25.pdf",
  preApproved: { full: 880, discounted: 440 },
  freeText: { full: 1720, discounted: 860 },
  firstDecade: 0
};

const DISCOUNT_CATEGORIES = {
  "a_confirmar": { label: "Comparar PF e PJ antes de definir", percent: 0, note: "Mostre os cenários, mas não prometa desconto antes de validar o titular." },
  "pessoa_natural": { label: "Pessoa física — 50% se elegível", percent: 50, note: "Só se o titular não participar de empresa do mesmo ramo — salvo se a empresa também tiver direito ao desconto." },
  "mei": { label: "MEI — 50%", percent: 50, note: "Microempreendedor Individual enquadrado na LC 123/2006." },
  "microempresa": { label: "Microempresa (ME) — 50%", percent: 50, note: "Enquadramento de microempresa na LC 123/2006." },
  "epp": { label: "Empresa de Pequeno Porte (EPP) — 50%", percent: 50, note: "Enquadramento de EPP na LC 123/2006." },
  "empresa_simples_inovacao": { label: "Empresa simples de inovação", percent: 50, note: "Conforme LC 167/2019." },
  "cooperativa": { label: "Cooperativa — 50%", percent: 50, note: "Cooperativa constituída nos termos da legislação aplicável." },
  "ict": { label: "ICT / instituição de ensino e pesquisa — 50%", percent: 50, note: "Instituição Científica, Tecnológica e de Inovação ou instituição de ensino e pesquisa, conforme enquadramento aplicável." },
  "sem_fins_lucrativos": { label: "Entidade sem fins lucrativos", percent: 50, note: "Desconto aplicável aos serviços elegíveis." },
  "orgao_publico": { label: "Órgão público nacional", percent: 50, note: "Desconto aplicável a ato próprio e serviço elegível." },
  "hipossuficiente": { label: "Pessoa física hipossuficiente", percent: 100, note: "Nos serviços de entrada elegíveis; nos demais, a regra pode ser diferente." },
  "pcd": { label: "Pessoa com deficiência (PcD)", percent: 100, note: "Nos serviços de entrada elegíveis; nos demais, a regra pode ser diferente." },
  "nao_elegivel": { label: "Pessoa jurídica sem benefício — taxa integral", percent: 0, note: "Use a taxa integral." }
};

const CLASS_RULES = [
  { code: "3", title: "Cosméticos e higiene", terms: ["cosmet", "perfume", "maquiagem", "sabonete", "shampoo", "beleza"] },
  { code: "9", title: "Software e produtos digitais", terms: ["aplicativo", "app", "software", "plataforma", "download", "eletron"] },
  { code: "25", title: "Vestuário e calçados", terms: ["roupa", "vestuario", "moda", "calçado", "calcado", "camiseta", "tenis"] },
  { code: "29", title: "Alimentos de origem animal e preparados", terms: ["alimento", "carne", "queijo", "conserva", "congelado", "proteina"] },
  { code: "30", title: "Alimentos à base de vegetais e preparações", terms: ["cafe", "café", "cha", "chá", "bolo", "doce", "biscoito", "farinha", "molho"] },
  { code: "32", title: "Bebidas não alcoólicas", terms: ["bebida", "suco", "refrigerante", "agua", "água", "cerveja sem alcool"] },
  { code: "35", title: "Comércio, varejo e publicidade", terms: ["loja", "varejo", "e-commerce", "ecommerce", "marketplace", "comercio", "comércio", "revenda", "publicidade"] },
  { code: "36", title: "Serviços financeiros e imobiliários", terms: ["financeiro", "credito", "crédito", "seguro", "imovel", "imóvel", "investimento"] },
  { code: "39", title: "Transporte, logística e turismo", terms: ["transporte", "entrega", "logistica", "logística", "turismo", "viagem", "frete"] },
  { code: "41", title: "Educação, cursos e entretenimento", terms: ["curso", "aula", "educacao", "educação", "treinamento", "evento", "entretenimento"] },
  { code: "42", title: "Tecnologia e SaaS", terms: ["saas", "tecnologia", "desenvolvimento", "hospedagem", "programacao", "programação", "ia", "inteligencia artificial"] },
  { code: "43", title: "Restaurantes e hospedagem", terms: ["restaurante", "lanchonete", "cafe", "café", "hotel", "pousada", "alimentacao", "alimentação"] },
  { code: "44", title: "Saúde, estética e cuidados", terms: ["saude", "saúde", "clinica", "clínica", "estetica", "estética", "medico", "médico", "terapia"] },
  { code: "45", title: "Serviços jurídicos e pessoais", terms: ["juridico", "jurídico", "advocacia", "legal", "seguranca", "segurança", "licenciamento"] }
];

const AFFINITY_GROUPS = [["25", "35"], ["9", "42"], ["29", "30", "32", "43"], ["3", "44"], ["36", "45"], ["39", "43"]];

const riskLabels = {
  overdue: "Vencido",
  today: "Hoje",
  critical: "Crítico",
  warning: "Atenção",
  ok: "Em dia"
};

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

function formatMoney(value) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(value || 0));
}

function legacyDiscountCategory(item) {
  if (item.discountEligible === "Sim") return item.profile === "MEI" ? "mei" : "a_confirmar";
  if (item.discountEligible === "Não") return "nao_elegivel";
  return "a_confirmar";
}

function suggestedDiscountCategory(profile) {
  return ({ MEI: "mei", ME: "microempresa", EPP: "epp", "Entidade sem fins lucrativos": "sem_fins_lucrativos", "Órgão público": "orgao_publico" })[profile] || "a_confirmar";
}

function discountAssessment(values = {}) {
  const category = values.discountCategory || legacyDiscountCategory(values);
  const rule = DISCOUNT_CATEGORIES[category] || DISCOUNT_CATEGORIES.a_confirmar;
  if (category === "pessoa_natural" && values.naturalPersonNoSameSectorParticipation !== "Sim") {
    return { category, percent: 0, label: "A confirmar", rateLabel: "taxa integral até a confirmação", note: "Para pessoa natural, confirme que não há participação em empresa do mesmo ramo — ou que a empresa também tem direito ao desconto." };
  }
  if (values.coHoldersEligible === "Não") {
    return { category, percent: 0, label: "Sem desconto", rateLabel: "taxa integral", note: "Em cotitularidade, todos os depositantes precisam fazer jus ao desconto." };
  }
  if (values.coHoldersEligible === "A confirmar") {
    return { category, percent: 0, label: "A confirmar", rateLabel: "taxa integral até a confirmação", note: "Há cotitularidade pendente de validação; use a taxa integral provisoriamente." };
  }
  if (category === "a_confirmar") return { category, percent: 0, label: "A confirmar", rateLabel: "taxa integral provisória", note: rule.note };
  return { category, percent: rule.percent, label: rule.percent ? `${rule.percent}% de desconto` : "Sem desconto", rateLabel: rule.percent ? `${rule.percent}% de desconto` : "taxa integral", note: rule.note };
}

function discountCategoryOptions(selected = "a_confirmar") {
  return Object.entries(DISCOUNT_CATEGORIES).map(([value, rule]) => `<option value="${value}" ${value === selected ? "selected" : ""}>${rule.label}</option>`).join("");
}

function discountStatusBadge(values) {
  const assessment = discountAssessment(values);
  const tone = assessment.percent === 100 ? "green" : assessment.percent === 50 ? "blue" : assessment.label === "A confirmar" ? "amber" : "gray";
  return `<span class="badge ${tone}">${assessment.label}</span>`;
}

function classByCode(code) { return CLASS_RULES.find((item) => item.code === String(code)); }
function classAffinity(first, second) {
  return AFFINITY_GROUPS.some((group) => group.includes(String(first)) && group.includes(String(second)));
}

function recommendedClasses(values) {
  const searchText = [values.currentOffer, values.channels, values.expansion].join(" ").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const matched = CLASS_RULES.filter((rule) => rule.terms.some((term) => searchText.includes(term.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase())));
  return matched.map((rule) => ({ ...rule, scope: values.expansion && rule.terms.some((term) => values.expansion.toLowerCase().includes(term.toLowerCase())) ? "expansion" : "atual" }));
}

function calculateEstimate(classCount, specificationType, discountInput) {
  const rate = specificationType === "free" ? OFFICIAL_FEES.freeText : OFFICIAL_FEES.preApproved;
  const assessment = typeof discountInput === "object" ? discountAssessment(discountInput) : { percent: discountInput === "Sim" ? 50 : 0 };
  const perClass = assessment.percent === 100 ? 0 : assessment.percent === 50 ? rate.discounted : rate.full;
  return { perClass, total: perClass * classCount, firstDecade: OFFICIAL_FEES.firstDecade, assessment };
}

function availabilityRisk(target, candidate) {
  const clean = (value) => String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");
  const left = clean(target.brand); const right = clean(candidate.brand);
  const overlap = target.classes.some((code) => candidate.classes.includes(code));
  const affinity = target.classes.some((code) => candidate.classes.some((other) => classAffinity(code, other)));
  if (left === right && (overlap || affinity)) return "Alto";
  if ((left.includes(right) || right.includes(left)) && (overlap || affinity)) return "Alto";
  if ((overlap || affinity) && (left.slice(0, 4) === right.slice(0, 4) || right.includes(left.slice(0, 5)))) return "Médio";
  if (overlap || affinity) return "Médio";
  return "Baixo";
}

function parseClasses(value) {
  return String(value || "").split(",").map(item => item.trim()).filter(Boolean);
}

function filterProcesses(items = data.processes) {
  const query = window.query || "";
  const term = query.trim().toLowerCase();
  if (!term) return items;
  return items.filter((item) => [item.brand, item.number, item.status, item.flowStage, item.classes, item.lastRpi, item.lastDispatchCode, client(item.clientId).name].join(" ").toLowerCase().includes(term));
}

function addDays(value, amount) {
  const date = new Date(`${value}T12:00:00`);
  date.setDate(date.getDate() + amount);
  return date.toISOString().slice(0, 10);
}

function brToIso(value) {
  if (!value) return iso();
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const [day, month, year] = value.split("/");
  return `${year}-${month}-${day}`;
}

export {
  flowStageByStatus, funnelStages, OFFICIAL_FEES, DISCOUNT_CATEGORIES,
  CLASS_RULES, AFFINITY_GROUPS, riskLabels,
  formatDate, daysUntil, statusTone, urgentProcesses,
  processRisk, legalRisk, riskTone, formatMoney,
  legacyDiscountCategory, suggestedDiscountCategory, discountAssessment,
  discountCategoryOptions, discountStatusBadge,
  classByCode, classAffinity, recommendedClasses, calculateEstimate,
  availabilityRisk, parseClasses, filterProcesses,
  addDays, brToIso, iso
};
