/**
 * MarcaFlow - Módulo de Análise de Anterioridade com IA
 * Similaridade fonética, visual e conceitual entre marcas
 */

import { data, client } from "./store.js?v=2026.08.29";
import { escapeHtml } from "./utils.js?v=2026.08.29";

/**
 * Algoritmo de similaridade fonética (Portugês)
 * Baseado em regras de fonética portuguesa
 */
function phoneticSimilarity(str1, str2) {
  const clean1 = normalizePhonetic(str1);
  const clean2 = normalizePhonetic(str2);
  
  if (clean1 === clean2) return 1.0;
  
  // Regras de fonética portuguesa
  const phoneticRules = [
    // Sílaba final mudo
    [/ão$/i, "au"],
    [/es$/i, "i"],
    [/ões$/i, "ons"],
    [/ias$/i, "ia"],
    [/us$/i, "us"],
    [/os$/i, "os"],
    [/as$/i, "as"],
    [/is$/i, "is"],
    // Doubling consonants
    [/cc/i, "c"],
    [/ll/i, "l"],
    [/mm/i, "m"],
    [/nn/i, "n"],
    [/rr/i, "r"],
    [/ss/i, "s"],
    // Silent letters
    [/h/i, ""],
    [/q/i, "k"],
    [/x/i, "s"],
    [/z/i, "s"],
    [/cç/i, "s"],
  ];
  
  let normalized1 = clean1;
  let normalized2 = clean2;
  
  for (const [pattern, replacement] of phoneticRules) {
    normalized1 = normalized1.replace(pattern, replacement);
    normalized2 = normalized2.replace(pattern, replacement);
  }
  
  if (normalized1 === normalized2) return 0.9;
  
  // Calcula distância após normalização fonética
  const distance = levenshteinDistance(normalized1, normalized2);
  const maxLength = Math.max(normalized1.length, normalized2.length);
  const similarity = 1 - (distance / maxLength);
  
  return Math.round(similarity * 100) / 100;
}

/**
 * Normaliza string para comparação fonética
 */
function normalizePhonetic(text) {
  return String(text || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z]/g, "");
}

/**
 * Analisa similaridade visual (contorno, letras, tamanho)
 */
function visualSimilarity(str1, str2) {
  const clean1 = str1.replace(/[^a-zA-Z]/g, "").toUpperCase();
  const clean2 = str2.replace(/[^a-zA-Z]/g, "").toUpperCase();
  
  if (clean1 === clean2) return 1.0;
  
  // Same starting letters
  const startMatch = clean1.slice(0, 3) === clean2.slice(0, 3);
  
  // Same length
  const lengthMatch = Math.abs(clean1.length - clean2.length) <= 1;
  
  // Same ending
  const endMatch = clean1.slice(-2) === clean2.slice(-2) || clean1.slice(-3) === clean2.slice(-3);
  
  // Count common letters
  const commonLetters = new Set([...clean1, ...clean2]).size;
  const intersection = clean1.split("").filter(c => clean2.includes(c)).length;
  const jaccard = intersection / commonLetters;
  
  let score = 0;
  if (startMatch) score += 0.3;
  if (lengthMatch) score += 0.2;
  if (endMatch) score += 0.2;
  score += jaccard * 0.3;
  
  return Math.round(score * 100) / 100;
}

/**
 * Analisa similaridade conceitual (mesmo significado, setor)
 */
function conceptualSimilarity(str1, str2, classes1, classes2) {
  // Mesmas classes = alto risco conceitual
  const classOverlap = classes1.some(c => classes2.includes(c));
  if (classOverlap) return 0.7;
  
  // Classes afins
  const affinityGroups = [["25", "35"], ["9", "42"], ["29", "30", "32", "43"], ["3", "44"], ["36", "45"], ["39", "43"]];
  const hasAffinity = affinityGroups.some(group => 
    classes1.some(c => group.includes(c)) && classes2.some(c => group.includes(c))
  );
  if (hasAffinity) return 0.5;
  
  return 0.2;
}

/**
 * Calcula risco combinado de anterioridade
 */
function calculateAnteriorityRisk(target, candidate, targetClasses, candidateClasses) {
  const phoneticScore = phoneticSimilarity(target.brand, candidate.brand);
  const visualScore = visualSimilarity(target.brand, candidate.brand);
  const conceptualScore = conceptualSimilarity(target.brand, candidate.brand, targetClasses, candidateClasses);
  
  // Ponderação: fonética 40%, visual 30%, conceitual 30%
  const totalRisk = (phoneticScore * 0.4) + (visualScore * 0.3) + (conceptualScore * 0.3);
  
  let risk = "Baixo";
  if (totalRisk >= 0.7) risk = "Alto";
  else if (totalRisk >= 0.4) risk = "Médio";
  
  return {
    risk,
    phoneticScore: Math.round(phoneticScore * 100) / 100,
    visualScore: Math.round(visualScore * 100) / 100,
    conceptualScore: Math.round(conceptualScore * 100) / 100,
    totalRisk: Math.round(totalRisk * 100) / 100,
    analysis: generateAnteriorityAnalysis(target, candidate, totalRisk, risk)
  };
}

/**
 * Gera análise detalhada de anterioridade
 */
function generateAnteriorityAnalysis(target, candidate, totalRisk, risk) {
  const parts = [];
  
  if (totalRisk >= 0.7) {
    parts.push("⚠️ <strong>Risco ALTO:</strong> Marcas muito semelhantes fonética e visualmente.");
  } else if (totalRisk >= 0.4) {
    parts.push("🟡 <strong>Risco MODERADO:</strong> Alguma similaridade detectada. Analisar cuidadosamente.");
  } else {
    parts.push("✅ <strong>Risco BAIXO:</strong> Marcas distintamente diferentes.");
  }
  
  if (phoneticSimilarity(target.brand, candidate.brand) >= 0.8) {
    parts.push("🔊 <strong>Fonética:</strong> Sons semelhantes - risco de confusão oral.");
  }
  
  if (visualSimilarity(target.brand, candidate.brand) >= 0.7) {
    parts.push("👁️ <strong>Visual:</strong> Aspecto semelhante - risco de confusão visual.");
  }
  
  if (target.classes.some(c => candidate.classes.includes(c))) {
    parts.push("📦 <strong>Classes:</strong> Mesmas classes de Nice - maior probabilidade de conflito.");
  }
  
  return parts.join("<br>");
}

/**
 * Levenshtein distance
 */
function levenshteinDistance(str1, str2) {
  const matrix = [];
  for (let i = 0; i <= str2.length; i++) matrix[i] = [i];
  for (let j = 0; j <= str1.length; j++) matrix[0][j] = j;
  
  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  return matrix[str2.length][str1.length];
}

/**
 * Analisa todas as marcas da carteira contra uma marca alvo
 */
function analyzeAllAgainstTarget(targetBrand, targetClasses, processId = null) {
  const processes = processId 
    ? data.processes.filter(p => p.id === processId)
    : data.processes.filter(p => p.number); // Apenas processos numerados
  
  if (!processes.length) return { risk: "Baixo", candidates: [], message: "Nenhum processo na carteira para comparação." };
  
  const candidates = processes.map(process => {
    const classes = process.classes ? process.classes.split(",").map(c => c.trim()).filter(Boolean) : [];
    const risk = calculateAnteriorityRisk(
      { brand: targetBrand },
      { brand: process.brand, classes },
      targetClasses,
      classes
    );
    return {
      processId: process.id,
      brand: process.brand,
      classes,
      client: client(process.clientId).name,
      status: process.status,
      ...risk
    };
  }).sort((a, b) => b.totalRisk - a.totalRisk);
  
  const maxRisk = candidates.reduce((max, c) => c.totalRisk > max ? c.totalRisk : max, 0);
  const overallRisk = maxRisk >= 0.7 ? "Alto" : maxRisk >= 0.4 ? "Médio" : "Baixo";
  
  return { risk: overallRisk, candidates, totalChecked: candidates.length };
}

/**
 * Renderiza relatório de análise de anterioridade
 */
function renderAnteriorityReport(analysis) {
  const tone = { Alto: "red", Médio: "amber", Baixo: "green" };
  
  return `
    <div class="proposal-summary">
      <span class="badge ${tone[analysis.risk]}">Risco ${analysis.risk}</span>
      <h3>Análise de Anterioridade</h3>
      <p class="subtle">Marca alvo analisada contra ${analysis.totalChecked} processo(s) na carteira</p>
      
      ${analysis.candidates.length ? `
        <div class="candidate-list" style="margin-top: 15px;">
          ${analysis.candidates.map(candidate => `
            <div class="candidate-item">
              <div>
                <strong>${escapeHtml(candidate.brand)}</strong>
                <span>Classes ${escapeHtml(candidate.classes.join(", ") || "N/A")} · ${escapeHtml(candidate.status)}</span>
                <small>Titular: ${escapeHtml(candidate.client)}</small>
              </div>
              <div style="text-align: right;">
                <span class="badge ${tone[candidate.risk]}">${escapeHtml(candidate.risk)}</span>
                <div style="font-size: 11px; color: var(--muted); margin-top: 4px;">
                  Fonética: ${Math.round(candidate.phoneticScore * 100)}% | 
                  Visual: ${Math.round(candidate.visualScore * 100)}% | 
                  Conceitual: ${Math.round(candidate.conceptualScore * 100)}%
                </div>
              </div>
            </div>
          `).join("")}
        </div>
      ` : ''}
      
      <div class="notice quiet" style="margin-top: 15px;">
        ${escapeHtml(analysis.message)}
      </div>
    </div>
  `;
}

// Expor para uso global
window.phoneticSimilarity = phoneticSimilarity;
window.visualSimilarity = visualSimilarity;
window.conceptualSimilarity = conceptualSimilarity;
window.calculateAnteriorityRisk = calculateAnteriorityRisk;
window.analyzeAllAgainstTarget = analyzeAllAgainstTarget;
window.renderAnteriorityReport = renderAnteriorityReport;

export {
  phoneticSimilarity,
  visualSimilarity,
  conceptualSimilarity,
  calculateAnteriorityRisk,
  analyzeAllAgainstTarget,
  renderAnteriorityReport
};
