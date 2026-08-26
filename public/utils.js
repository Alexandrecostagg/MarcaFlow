const flowStageByStatus = {
  Preparação: "Busca prévia",
  Protocolado: "Depósito",
  "Publicado na RPI": "Publicação",
  "Em exame": "Exame",
  Deferido: "Concessão",
  Registrado: "Registro",
  "Com exigência": "Exame",
  "Com oposição": "Oposição",
  Indeferido: "Recurso"
};

function legacyDiscountCategory(item) {
  if (item.discountEligible === "Sim") return item.profile === "MEI" ? "mei" : "a_confirmar";
  if (item.discountEligible === "Não") return "nao_elegivel";
  return "a_confirmar";
}

function escapeHtml(value) {
  return String(value || "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[char]);
}

function openModal(id) { document.getElementById(id).showModal(); }
function closeModal(id) { document.getElementById(id).close(); }

function sanitizeXmlText(xmlText) {
  if (typeof xmlText !== "string") throw new Error("XML inválido: texto não é string.");
  if (xmlText.length > 10485760) throw new Error("XML muito grande: limite de 10MB excedido.");
  const dangerous = [
    /<!ENTITY\s+/gi,
    /<!DOCTYPE\s+/gi,
    /<!\[CDATA\b/gi,
    /<script\b[\s\S]*?<\/script>/gi,
    /javascript\s*:/gi,
    /on\w+\s*=/gi
  ];
  for (const pattern of dangerous) {
    if (pattern.test(xmlText)) {
      throw new Error("XML bloqueado: conteúdo potencialmente perigoso detectado.");
    }
  }
  return xmlText;
}

function validateJsonPayload(text) {
  if (typeof text !== "string") throw new Error("Payload inválido: não é string.");
  if (text.length > 5242880) throw new Error("Arquivo muito grande: limite de 5MB excedido.");
  try {
    const parsed = JSON.parse(text);
    if (parsed === null) throw new Error("JSON vazio ou nulo.");
    if (Array.isArray(parsed) && parsed.length > 5000) throw new Error("Arquivo com mais de 5000 registros.");
    if (typeof parsed === "object" && !Array.isArray(parsed) && parsed.processes && Array.isArray(parsed.processes) && parsed.processes.length > 5000) {
      throw new Error("Arquivo com mais de 5000 registros.");
    }
    return parsed;
  } catch (error) {
    if (error instanceof SyntaxError) throw new Error("JSON inválido: formato incorreto.");
    throw error;
  }
}

function validateMonitorReport(text) {
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("JSON inválido: formato incorreto.");
  }
  if (!parsed || typeof parsed !== "object") throw new Error("Relatório inválido: objeto esperado.");
  if (!Array.isArray(parsed.movements)) throw new Error("Relatório inválido: campo 'movements' ausente ou inválido.");
  if (parsed.movements.length > 2000) throw new Error("Relatório com mais de 2000 movimentos.");
  for (const movement of parsed.movements) {
    if (!movement || typeof movement !== "object") throw new Error("Relatório inválido: movimento inválido.");
    if (movement.processNumber && !/^\d+$/.test(String(movement.processNumber))) {
      throw new Error("Relatório inválido: número de processo contém caracteres não numéricos.");
    }
  }
  return parsed;
}

function sanitizeAgentInput(text) {
  return String(text || "")
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<\/?script\b/gi, "")
    .replace(/javascript:/gi, "")
    .replace(/on\w+\s*=/gi, "")
    .replace(/[`\\"'\\n\\r]/g, "")
    .replace(/\u0000-\u001F/g, "")
    .trim();
}

function normalizeKey(value) {
  return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

function valueOf(record, ...keys) {
  for (const key of keys) {
    const value = record[normalizeKey(key)];
    if (value !== undefined && value !== "") return value;
  }
  return "";
}

function showCloudError(error) {
  console.error(error);
  alert("Não foi possível sincronizar com o Firebase. Os dados continuam salvos neste navegador.");
}

function downloadJson(payload, fileName) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = Object.assign(document.createElement("a"), { href: url, download: fileName });
  link.click();
  URL.revokeObjectURL(url);
}

export { escapeHtml, openModal, closeModal, sanitizeXmlText, validateJsonPayload, validateMonitorReport, sanitizeAgentInput, normalizeKey, valueOf, showCloudError, downloadJson, flowStageByStatus, legacyDiscountCategory };
