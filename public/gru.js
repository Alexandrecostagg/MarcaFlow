/**
 * MarcaFlow - Módulo de Geração Automatizada de GRU
 * Cálculo de taxas, código de atividade e pré-preenchimento
 */

import { data, client } from "./store.js?v=2026.08.29";
import { OFFICIAL_FEES, discountAssessment, suggestedDiscountCategory } from "./business.js?v=2026.08.29";
import { escapeHtml, downloadJson } from "./utils.js?v=2026.08.29";

const GRU_CODE_MAPPING = {
  "pedido_registro": "0原0001",
  "renovacao": "0原0002",
  "peticao_tramitação": "0原0003",
  "segunda_via": "0原0004",
  "certidao": "0原0005"
};

const DISCOUNT_CODE_MAPPING = {
  "mei": "MEI",
  "microempresa": "ME",
  "epp": "EPP",
  "pessoa_natural": "PF",
  "hipossuficiente": "HIPO",
  "pcd": "PCD",
  "nao_elegivel": "NENHUM"
};

/**
 * Calcula valor da GRU para pedido de registro
 * @param {Object} process - Processo
 * @returns {Object} Detalhes da GRU
 */
function calculateGRUForRegistration(process) {
  const classes = process.classes ? process.classes.split(",").map(c => c.trim()).filter(Boolean) : [];
  const classCount = classes.length;
  
  if (classCount === 0) {
    return { error: "Processo não possui classes informadas." };
  }

  // Determina se é pré-aprovada ou livre
  const isFreeText = !process.specification || process.specification.trim() === "";
  const specificationType = isFreeText ? "free" : "preApproved";
  
  // Calcula desconto
  const clientId = process.clientId;
  const clientData = clientId ? client(clientId) : null;
  
  let discountCategory = "nao_elegivel";
  let discountPercent = 0;
  
  if (clientData) {
    discountCategory = clientData.discountCategory || suggestedDiscountCategory(clientData.profile);
    const assessment = discountAssessment({ discountCategory });
    discountPercent = assessment.percent;
  }

  // Calcula valores
  const rate = specificationType === "free" ? OFFICIAL_FEES.freeText : OFFICIAL_FEES.preApproved;
  const perClass = discountPercent === 100 ? 0 : discountPercent === 50 ? rate.discounted : rate.full;
  const total = perClass * classCount;
  const firstDecade = OFFICIAL_FEES.firstDecade; // Primeiro decênio é gratuito

  return {
    type: "pedido_registro",
    code: GRU_CODE_MAPPING["pedido_registro"],
    processId: process.id,
    brand: process.brand,
    client: clientData ? clientData.name : "Não informado",
    clientDocument: clientData ? clientData.document : "",
    classes: classes,
    classCount,
    specificationType,
    discountCategory,
    discountPercent,
    perClass,
    total,
    firstDecade,
    totalComFirstDecade: total + firstDecade,
    valueFormatted: formatMoney(total),
    url: generateGRULink({
      code: GRU_CODE_MAPPING["pedido_registro"],
      value: total,
      beneficiary: "INPI",
      amount: total,
      description: `Registro de marca ${process.brand} - ${classCount} classe(s)`
    })
  };
}

/**
 * Calcula valor da GRU para renovação
 * @param {Object} process - Processo registrado
 * @returns {Object} Detalhes da GRU
 */
function calculateGRUForRenewal(process) {
  const classes = process.classes ? process.classes.split(",").map(c => c.trim()).filter(Boolean) : [];
  const classCount = classes.length;

  if (classCount === 0) {
    return { error: "Processo não possui classes informadas." };
  }

  // Renovação tem valor fixo por classe (R$ 880 pré-aprovada, R$ 1720 livre)
  const perClass = OFFICIAL_FEES.preApproved.full; // Renovação usa valor pré-aprovado
  const total = perClass * classCount;

  return {
    type: "renovacao",
    code: GRU_CODE_MAPPING["renovacao"],
    processId: process.id,
    brand: process.brand,
    client: client(process.clientId).name,
    classes: classes,
    classCount,
    perClass,
    total,
    valueFormatted: formatMoney(total),
    url: generateGRULink({
      code: GRU_CODE_MAPPING["renovacao"],
      value: total,
      beneficiary: "INPI",
      amount: total,
      description: `Renovação de registro de marca ${process.brand} - ${classCount} classe(s)`
    })
  };
}

/**
 * Gera link para emissão da GRU no portal do INPI
 */
function generateGRULink(params) {
  const baseUrl = "https://www.gov.br/inpi/pt-br/assuntos/marcas/gru";
  const searchParams = new URLSearchParams({
    cdBeneficiario: "1.6.590", // INPI
    cdTipoMovimento: params.code,
    vlValor: String(params.amount),
    dsDescricao: params.description
  });
  
  return `${baseUrl}?${searchParams.toString()}`;
}

/**
 * Gera PDF da GRU (simulado - em produção usaria library PDF)
 */
function generateGRUPDF(gruDetails) {
  const template = `
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
        .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 10px; margin-bottom: 20px; }
        .field { margin: 10px 0; }
        .label { font-weight: bold; color: #555; }
        .value { color: #000; }
        .total { font-size: 18px; font-weight: bold; color: #126b52; margin-top: 20px; padding: 10px; background: #f0f4f2; border-radius: 5px; }
        .footer { margin-top: 30px; font-size: 12px; color: #777; border-top: 1px solid #ddd; padding-top: 10px; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>GUIA DA RECEITA FEDERAL (GRU)</h1>
        <p>Instituto Nacional da Propriedade Industrial</p>
      </div>

      <div class="field"><span class="label">Tipo de Serviço:</span> <span class="value">${escapeHtml(gruDetails.type === "pedido_registro" ? "Registro de Marca" : "Renovação de Marca")}</span></div>
      <div class="field"><span class="label">Código de Atividade:</span> <span class="value">${escapeHtml(gruDetails.code)}</span></div>
      <div class="field"><span class="label">Marca:</span> <span class="value">${escapeHtml(gruDetails.brand)}</span></div>
      <div class="field"><span class="label">Titular:</span> <span class="value">${escapeHtml(gruDetails.client)}</span></div>
      <div class="field"><span class="label">Documento do Titular:</span> <span class="value">${escapeHtml(gruDetails.clientDocument || "Não informado")}</span></div>
      <div class="field"><span class="label">Classes de Nice:</span> <span class="value">${escapeHtml(gruDetails.classes.join(", "))}</span></div>
      <div class="field"><span class="label">Quantidade de Classes:</span> <span class="value">${gruDetails.classCount}</span></div>
      
      ${gruDetails.discountPercent ? `<div class="field"><span class="label">Desconto Aplicado:</span> <span class="value">${gruDetails.discountPercent}% (${escapeHtml(gruDetails.discountCategory)})</span></div>` : ""}
      
      <div class="field"><span class="label">Valor por Classe:</span> <span class="value">R$ ${gruDetails.perClass.toFixed(2)}</span></div>
      
      <div class="total">
        <span class="label">VALOR TOTAL:</span> <span class="value">R$ ${gruDetails.total.toFixed(2)}</span>
      </div>

      <div class="footer">
        <p>Gerado em: ${new Date().toLocaleDateString("pt-BR")} às ${new Date().toLocaleTimeString("pt-BR")}</p>
        <p>MarcaFlow - Gestão de Propriedade Industrial</p>
        <p><strong>Importante:</strong> Esta é uma simulação. A GRU oficial deve ser emitida no portal do INPI.</p>
      </div>
    </body>
    </html>
  `;

  return template;
}

/**
 * Gera HTML do painel de GRU
 */
function renderGRUPanel(process) {
  if (!process) {
    return '<div class="empty">Selecione um processo para gerar a GRU.</div>';
  }

  const gruDetails = calculateGRUForRegistration(process);
  
  if (gruDetails.error) {
    return `<div class="notice">${escapeHtml(gruDetails.error)}</div>`;
  }

  return `
    <div class="panel" style="margin-top: 15px;">
      <div class="panel-header"><div><h3>GRU para Registro</h3><p>Marca: ${escapeHtml(gruDetails.brand)}</p></div></div>
      <div class="panel-body">
        <div class="field"><span class="label">Código de Atividade:</span> <span class="value">${escapeHtml(gruDetails.code)}</span></div>
        <div class="field"><span class="label">Classes:</span> <span class="value">${escapeHtml(gruDetails.classes.join(", "))} (${gruDetails.classCount} classe(s))</span></div>
        ${gruDetails.discountPercent ? `<div class="field"><span class="label">Desconto:</span> <span class="value">${gruDetails.discountPercent}% (${escapeHtml(gruDetails.discountCategory)})</span></div>` : ""}
        <div class="total">
          <span class="label">VALOR TOTAL:</span> <span class="value">R$ ${gruDetails.total.toFixed(2)}</span>
        </div>
        
        <div class="page-actions" style="margin-top: 15px;">
          <a class="primary-button" href="${escapeHtml(gruDetails.url)}" target="_blank" rel="noreferrer">Emitir GRU no INPI ↗</a>
          <button class="secondary-button" id="download-gru-pdf">📄 Baixar PDF</button>
          <button class="secondary-button" id="copy-gru-details">📋 Copiar detalhes</button>
        </div>
      </div>
    </div>
  `;
}

/**
 * Handler para botão de download PDF
 */
function handleDownloadGRUPDF(gruDetails) {
  const pdfContent = generateGRUPDF(gruDetails);
  const blob = new Blob([pdfContent], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `GRU-${gruDetails.brand}-${Date.now()}.html`;
  link.click();
  URL.revokeObjectURL(url);
}

/**
 * Handler para copiar detalhes da GRU
 */
function handleCopyGRUDetails(gruDetails) {
  const text = `GRU - Registro de Marca ${gruDetails.brand}\n` +
    `Código: ${gruDetails.code}\n` +
    `Classes: ${gruDetails.classes.join(", ")}\n` +
    `Valor: R$ ${gruDetails.total.toFixed(2)}\n` +
    `Link: ${gruDetails.url}`;
  
  navigator.clipboard.writeText(text).then(() => {
    alert("Detalhes da GRU copiados!");
  }).catch(() => {
    window.prompt("Copie os detalhes:", text);
  });
}

// Expor para uso global
window.calculateGRUForRegistration = calculateGRUForRegistration;
window.calculateGRUForRenewal = calculateGRUForRenewal;
window.renderGRUPanel = renderGRUPanel;
window.handleDownloadGRUPDF = handleDownloadGRUPDF;
window.handleCopyGRUDetails = handleCopyGRUDetails;

export {
  handleDownloadGRUPDF,
  handleCopyGRUDetails,
  calculateGRUForRegistration,
  calculateGRUForRenewal,
  generateGRUPDF,
  renderGRUPanel,
  GRU_CODE_MAPPING,
  DISCOUNT_CODE_MAPPING
};
