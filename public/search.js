/**
 * MarcaFlow - Módulo de Busca Prévia Automatizada
 * Integração com API de busca do INPI (pePI)
 */

import { data, client } from "./store.js?v=2026.08.29";
import { recommendedClasses, availabilityRisk, parseClasses } from "./business.js?v=2026.08.29";
import { escapeHtml } from "./utils.js?v=2026.08.29";

const INPI_SEARCH_URL = "https://busca.inpi.gov.br/pePI/";
const INPI_API_BASE = "https://busca.inpi.gov.br/svc";

/**
 * Realiza busca de anterioridade na base do INPI
 * @param {string} brand - Nome da marca para buscar
 * @param {string[]} classes - Classes de Nice pretendidas
 * @returns {Promise<Array>} Lista de marcas encontradas
 */
async function searchINPI(brand, classes = []) {
  try {
    const params = new URLSearchParams({
      tp: "MC", // Tipo: Marca de Produto ou Serviço
      ni: classes.join(","), // Classes
      nm: brand, // Nome
      re: "T" // Texto completo
    });

    const response = await fetch(`${INPI_API_BASE}/consulta?${params}`, {
      method: "GET",
      headers: {
        "Accept": "application/json",
        "User-Agent": "MarcaFlow/1.0"
      }
    });

    if (!response.ok) {
      throw new Error(`Erro na busca INPI: ${response.status}`);
    }

    const results = await response.json();
    return parseSearchResults(results);
  } catch (error) {
    console.error("Erro na busca INPI:", error);
    throw error;
  }
}

/**
 * Parse dos resultados da API do INPI
 * @param {Array} rawResults - Resultados brutos da API
 * @returns {Array} Resultados formatados
 */
function parseSearchResults(rawResults) {
  if (!rawResults || !Array.isArray(rawResults)) return [];

  return rawResults.map((item, index) => ({
    id: index,
    number: item.numero || item.processo || "",
    brand: item.marca || item.nome || "",
    classes: parseClasses(item.classe || item.classes || ""),
    status: item.status || item.situacao || "",
    owner: item.titular || item.proprietario || "",
    ownerDocument: item.cpfCnpj || item.documento || "",
    filingDate: item.dataDeposito || item.protocolo || "",
    presentation: item.apresentacao || "",
    specification: item.especificacao || "",
    similarity: calculateSimilarity(item, { brand: "" }) // Será calculado externamente
  }));
}

/**
 * Calcula similaridade entre duas marcas
 * @param {Object} target - Marca alvo
 * @param {Object} candidate - Marca candidata
 * @returns {number} Pontuação de similaridade (0-1)
 */
function calculateSimilarity(target, candidate) {
  const clean = (text) => String(text || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

  const targetClean = clean(target.brand);
  const candidateClean = clean(candidate.brand);

  if (!targetClean || !candidateClean) return 0;

  // Similaridade exata
  if (targetClean === candidateClean) return 1.0;

  // Similaridade de inclusão
  if (targetClean.includes(candidateClean) || candidateClean.includes(targetClean)) {
    return 0.8;
  }

  // Distância de_edit (Levenshtein simplificado)
  const distance = levenshteinDistance(targetClean, candidateClean);
  const maxLength = Math.max(targetClean.length, candidateClean.length);
  const similarity = 1 - (distance / maxLength);

  return Math.round(similarity * 100) / 100;
}

/**
 * Calcula distância de Levenshtein entre duas strings
 * @param {string} str1 - Primeira string
 * @param {string} str2 - Segunda string
 * @returns {number} Distância
 */
function levenshteinDistance(str1, str2) {
  const matrix = [];

  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substituição
          matrix[i][j - 1] + 1,     // inserção
          matrix[i - 1][j] + 1      // deleção
        );
      }
    }
  }

  return matrix[str2.length][str1.length];
}

/**
 * Analisa resultados da busca e gera relatório de risco
 * @param {string} brand - Marca pretendida
 * @param {string[]} classes - Classes pretendidas
 * @param {Array} searchResults - Resultados da busca INPI
 * @returns {Object} Relatório de análise
 */
function analyzeResults(brand, classes, searchResults) {
  const target = { brand, classes };
  const candidates = searchResults.map(result => ({
    ...result,
    risk: availabilityRisk(target, result, window.AFFINITY_GROUPS || [])
  }));

  // Agrupa por risco
  const riskCounts = candidates.reduce((acc, item) => {
    acc[item.risk] = (acc[item.risk] || 0) + 1;
    return acc;
  }, {});

  // Ordena por risco (Alto > Médio > Baixo)
  const riskOrder = { Alto: 3, Médio: 2, Baixo: 1 };
  candidates.sort((a, b) => riskOrder[b.risk] - riskOrder[a.risk]);

  return {
    brand,
    classes,
    candidates,
    riskCounts,
    totalResults: candidates.length,
    highRisk: riskCounts.Alto || 0,
    mediumRisk: riskCounts.Médio || 0,
    lowRisk: riskCounts.Baixo || 0,
    recommendation: getRecommendation(riskCounts)
  };
}

/**
 * Gera recomendação baseada nos riscos encontrados
 * @param {Object} riskCounts - Contagem por risco
 * @returns {string} Recomendação
 */
function getRecommendation(riskCounts) {
  if (riskCounts.Alto > 0) {
    return "Risco alto detectado. Recomenda-se analisar alternativas de nome antes de proceder com o depósito.";
  }
  if (riskCounts.Médio > 0) {
    return "Risco moderado. Considere analisar as marcas semelhantes encontradas e avaliar estratégias de diferenciação.";
  }
  return "Risco baixo. A marca parece disponível nas classes analisadas. Prosiga com a busca oficial detalhada.";
}

/**
 * Gera HTML do relatório de busca automatizada
 * @param {Object} analysis - Análise dos resultados
 * @returns {string} HTML do relatório
 */
function renderSearchReport(analysis) {
  const tone = { Alto: "red", Médio: "amber", Baixo: "green" };

  return `
    <div class="proposal-summary">
      <span class="badge violet">Busca Automatizada INPI</span>
      <h3>${escapeHtml(analysis.brand)}</h3>
      <p class="subtle">Classes: ${escapeHtml(analysis.classes.join(", "))}</p>
      
      <div class="risk-summary" style="margin: 15px 0;">
        <span class="badge red">${analysis.highRisk} alto</span>
        <span class="badge amber">${analysis.mediumRisk} médio</span>
        <span class="badge green">${analysis.lowRisk} baixo</span>
        <span class="badge gray">${analysis.totalResults} total</span>
      </div>

      <div class="notice ${analysis.highRisk > 0 ? '' : 'quiet'}">
        <strong>Recomendação:</strong> ${escapeHtml(analysis.recommendation)}
      </div>

      <div class="candidate-list" style="margin-top: 15px;">
        ${analysis.candidates.map(item => `
          <div class="candidate-item">
            <div>
              <strong>${escapeHtml(item.brand)}</strong>
              <span>Classes ${escapeHtml(item.classes.join(", ") || "não informadas")} · ${escapeHtml(item.status || "status não informado")}</span>
              <small>Processo: ${escapeHtml(item.number || "N/A")} · Titular: ${escapeHtml(item.owner || "N/A")}</small>
            </div>
            <span class="badge ${tone[item.risk]}">${escapeHtml(item.risk)}</span>
          </div>
        `).join("")}
      </div>

      <div class="page-actions" style="margin-top: 15px;">
        <button class="secondary-button" data-go="availability">Triar disponibilidade</button>
        <a class="link-button" href="${INPI_SEARCH_URL}" target="_blank" rel="noreferrer">Abrir busca oficial ↗</a>
      </div>
    </div>
  `;
}

/**
 * Handler para formulário de busca automatizada
 */
function handleAutomatedSearch(event) {
  event.preventDefault();
  const formData = new FormData(event.currentTarget);
  const brand = formData.get("brand");
  const classesText = formData.get("classes");
  const classes = parseClasses(classesText);

  if (!brand || !classes.length) {
    alert("Informe a marca e pelo menos uma classe.");
    return;
  }

  const searchForm = document.getElementById("automated-search-form");
  const resultContainer = document.getElementById("automated-search-result");

  if (searchForm) searchForm.style.display = "none";
  if (resultContainer) {
    resultContainer.innerHTML = '<div class="empty">Realizando busca na base do INPI...</div>';
  }

  searchINPI(brand, classes)
    .then(results => {
      const analysis = analyzeResults(brand, classes, results);
      if (resultContainer) {
        resultContainer.innerHTML = renderSearchReport(analysis);
        // Bind events para botões de ação
        resultContainer.querySelectorAll("[data-go]").forEach(button => {
          button.addEventListener("click", () => {
            window.view = button.dataset.go;
            window.render();
          });
        });
      }
    })
    .catch(error => {
      if (resultContainer) {
        resultContainer.innerHTML = `
          <div class="notice">
            <strong>Erro na busca:</strong> ${escapeHtml(error.message)}
            <p class="subtle">Tente novamente ou utilize a busca oficial diretamente no INPI.</p>
          </div>
        `;
      }
    });
}

export {
  searchINPI,
  parseSearchResults,
  calculateSimilarity,
  levenshteinDistance,
  analyzeResults,
  renderSearchReport,
  handleAutomatedSearch,
  INPI_SEARCH_URL
};
