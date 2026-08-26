import { escapeHtml } from "./utils.js";
import { recommendedClasses, calculateEstimate, suggestedDiscountCategory, discountAssessment, discountCategoryOptions, discountStatusBadge, availabilityRisk, parseClasses } from "./business.js";
import { data, client } from "./store.js";
import { openModal, closeModal } from "./utils.js";

function tokenize(text) {
  return String(text || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().split(/[^a-z0-9]+/).filter(token => token.length > 2);
}

function retrieveKnowledge(question) {
  const terms = tokenize(question);
  return (window.marcaFlowKnowledge || []).map((item) => {
    const haystack = tokenize(`${item.title} ${item.text} ${item.source}`);
    const score = terms.reduce((sum, term) => sum + haystack.filter(word => word.includes(term) || term.includes(word)).length, 0);
    return { ...item, score };
  }).filter(item => item.score > 0).sort((a, b) => b.score - a.score).slice(0, 3);
}

function answerQuestion(question) {
  if (isClassificationQuestion(question)) return classificationIntakeAnswer();
  const matches = retrieveKnowledge(question);
  if (!matches.length) {
    return `<div class="empty">Não encontrei base suficiente para responder. Tente mencionar termos como RPI, oposição, exigência, GRU, busca, deferimento ou renovação.</div>`;
  }
  const checklist = buildChecklist(question);
  return `<div class="agent-response"><h3>Resposta operacional</h3><p>${matches[0].text}</p>${checklist}<div class="notice">Confira a publicação oficial e o Manual de Marcas vigente antes de cumprir prazo ou tomar decisão processual.</div><h3>Fontes usadas</h3>${matches.map(item => `<a class="source-card" href="${escapeHtml(item.url)}" target="_blank" rel="noreferrer"><strong>${escapeHtml(item.title)}</strong><span>${escapeHtml(item.source)}</span><p>${escapeHtml(item.text)}</p></a>`).join("")}</div>`;
}

function isClassificationQuestion(question) {
  const text = String(question || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  return ["classe", "categoria", "enquadr", "classific", "quanto custa", "custo", "valor", "proteger minha marca", "protecao da marca"].some((term) => text.includes(term));
}

function buildChecklist(question) {
  const text = question.toLowerCase();
  const items = [];
  if (text.includes("oposi")) items.push("Localizar a publicação da oposição na RPI e conferir o inteiro teor.", "Registrar prazo legal de 60 dias e prazo interno antecipado.", "Separar provas de uso, distintividade e diferenças entre sinais/produtos.");
  if (text.includes("exig")) items.push("Identificar se a exigência é formal ou de mérito.", "Conferir o prazo aplicável antes de protocolar resposta.", "Anexar documentos e justificativas no e-Marcas com GRU quando aplicável.");
  if (text.includes("busca") || text.includes("deposit")) items.push("Classificar produtos e serviços antes da busca.", "Pesquisar marcas semelhantes por palavra-chave, titular e classe.", "Guardar evidências da busca e riscos encontrados.");
  if (text.includes("defer") || text.includes("concess")) items.push("Acompanhar concessão e emissão do certificado.", "Arquivar certificado e atualizar status para registro.", "Criar alerta de renovação para o nono ano de vigência.");
  if (!items.length) items.push("Conferir a etapa atual do processo.", "Validar o despacho no PDF oficial da RPI.", "Registrar próxima ação, prazo legal e prazo interno no MarcaFlow.");
  return `<ul class="agent-checklist">${items.map(item => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`;
}

function parseAvailabilityCandidates(value) {
  return String(value || "").split(/\n+/).map((line) => line.trim()).filter(Boolean).map((line) => {
    const [brand, classText = "", status = "", notes = ""] = line.split("|").map((item) => item.trim());
    return { brand, classes: parseClasses(classText), status, notes };
  }).filter((item) => item.brand);
}

function handleClassificationIntake(event) {
  event.preventDefault();
  const values = Object.fromEntries(new FormData(event.currentTarget));
  values.currentOffer = `${values.currentOffer} ${values.operation}`;
  const record = { id: crypto.randomUUID(), createdAt: new Date().toISOString(), ...values, suggestions: recommendedClasses(values) };
  data.diagnoses.unshift(record);
  window.save();
  const answer = document.getElementById("agent-answer");
  answer.innerHTML = classificationResultAnswer(record);
  bindAgentAnswerEvents(answer);
}

function renderAgentAnswer(answer, sources, meta = "") {
  const paragraphs = String(answer || "").split(/\n{2,}/).map((part) => part.trim()).filter(Boolean);
  return `<div class="agent-response">${meta ? `<span class="badge gray">${escapeHtml(meta)}</span>` : ""}${paragraphs.map((part) => `<p>${escapeHtml(part).replace(/\n/g, "<br>")}</p>`).join("")}<div class="notice">Confira a publicação oficial e o Manual de Marcas vigente antes de cumprir prazo ou tomar decisão processual.</div><h3>Fontes usadas</h3>${sources.map(item => `<a class="source-card" href="${escapeHtml(item.url)}" target="_blank" rel="noreferrer"><strong>${escapeHtml(item.title)}</strong><span>${escapeHtml(item.source)}</span><p>${escapeHtml(item.text)}</p></a>`).join("")}</div>`;
}

function agentProcessPayload(id) {
  const item = window.processById(id);
  if (!item) return null;
  const safe = {};
  for (const [key, value] of Object.entries(item)) {
    if (typeof value === "string") {
      safe[key] = value.slice(0, 500).replace(/<[^>]*>/g, "").replace(/[`\\"'\\n\\r]/g, "");
    } else {
      safe[key] = value;
    }
  }
  return safe;
}

async function answerQuestionWithBackend(question, processId = "") {
  const localMatches = retrieveKnowledge(question);
  if (!localMatches.length) return answerQuestion(question);
  const token = await window.marcaFlowCloud?.getIdToken?.();
  if (!token) return answerQuestion(question);
  try {
    const response = await fetch("/api/agent", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
      body: JSON.stringify({ question, process: agentProcessPayload(processId) })
    });
    const payload = await response.json();
    if (!response.ok || payload.fallback || !payload.answer) return answerQuestion(question);
    return renderAgentAnswer(payload.answer, payload.sources || localMatches, `DeepSeek · ${payload.model || "modelo configurado"}`);
  } catch (error) {
    console.warn("Agente backend indisponível, usando resposta local.", error);
    return answerQuestion(question);
  }
}

function agentIntro() {
  return `<div class="notice quiet"><strong>Primeiro, defina o que será protegido.</strong><br>Conte o que o negócio vende ou presta, como vende, o que pretende oferecer em seguida e quem será o titular. A partir disso, o MarcaFlow separa classes essenciais de expansão e mostra a estimativa oficial por classe.<div class="page-actions"><button class="secondary-button" type="button" data-go="diagnosis">Fazer diagnóstico de classes e custo</button></div></div>`;
}

function classificationIntakeAnswer() {
  const source = window.marcaFlowKnowledge?.find((item) => item.id === "inpi-classificacao-2026");
  const pricingSource = window.marcaFlowKnowledge?.find((item) => item.id === "inpi-tabela-marcas-2025");
  return `<div class="agent-response"><h3>Vamos definir a proteção antes de falar em depósito</h3><p>O nome da marca, por si só, não define a classe. Conte sobre o negócio abaixo e eu organizo a cobertura inicial e a estimativa por classe.</p><form id="class-intake-form" class="agent-form"><div class="form-grid"><label><span>Marca que será protegida</span><input required name="brand" placeholder="Ex.: Marca Flow" /></label><label><span>Apresentação</span><select name="presentation"><option>Nominativa (somente nome)</option><option>Mista (nome e logo)</option><option>Figurativa (somente logo)</option></select></label></div><label><span>1. O que a empresa vende ou presta hoje?</span><textarea required name="currentOffer" rows="3" placeholder="Ex.: plataforma online para escritórios gerenciarem processos de marcas e venderem esse serviço aos clientes."></textarea></label><label><span>Outras opções de nome para o cliente comparar</span><textarea name="alternativeBrands" rows="2" placeholder="Uma por linha. Ex.: MarcaFlux&#10;FluxoMarca"></textarea></label><div class="form-grid"><label><span>2. Como opera?</span><select name="operation"><option value="presta serviços">Presta serviços</option><option value="vende produtos próprios">Vende produtos próprios</option><option value="vende produtos de terceiros">Vende produtos de terceiros</option><option value="combina produtos e serviços">Combina produtos e serviços</option></select></label><label><span>3. Canais de atendimento ou venda</span><input name="channels" placeholder="Ex.: plataforma, loja, e-commerce, presencial" /></label><label><span>4. Expansão em 12–24 meses</span><input name="expansion" placeholder="Ex.: cursos, franquias, novos produtos" /></label><label><span>Quem deve ser o titular? (simule o cenário real)</span><select name="discountCategory">${discountCategoryOptions()}</select></label><label><span>Se for pessoa física: participa de empresa no mesmo ramo?</span><select name="naturalPersonNoSameSectorParticipation"><option value="">Não se aplica / não informado</option><option>Sim</option><option>Não</option></select></label><label><span>Cotitulares também são elegíveis ao desconto?</span><select name="coHoldersEligible"><option>Não se aplica</option><option>Sim</option><option>Não</option><option>A confirmar</option></select></label></div><button class="primary-button" type="submit">Gerar mapa de proteção</button></form><div class="notice">As fontes usadas são o guia de classificação do INPI e a tabela de retribuições vigente. A entrega é triagem operacional e não substitui a análise do Manual de Marcas.</div>${source ? `<a class="source-card" href="${escapeHtml(source.url)}" target="_blank" rel="noreferrer"><strong>${escapeHtml(source.title)}</strong><span>${escapeHtml(source.source)}</span></a>` : ""}${pricingSource ? `<a class="source-card" href="${escapeHtml(pricingSource.url)}" target="_blank" rel="noreferrer"><strong>${escapeHtml(pricingSource.title)}</strong><span>${escapeHtml(pricingSource.source)}</span></a>` : ""}</div>`;
}

function classificationResultAnswer(record) {
  const suggestions = record.suggestions || [];
  const preApproved = calculateEstimate(suggestions.length, "preApproved", record);
  const freeText = calculateEstimate(suggestions.length, "free", record);
  const fullScenario = calculateEstimate(suggestions.length, "preApproved", { discountCategory: "nao_elegivel" });
  const discountedScenario = calculateEstimate(suggestions.length, "preApproved", { discountCategory: "mei" });
  return `<div class="agent-response"><span class="badge violet">Mapa inicial de proteção</span><h3>${escapeHtml(record.brand)}</h3><p>Estas são classes candidatas a partir do que foi informado. A revisão da especificação e a busca de anterioridade vêm antes do depósito.</p><div class="coverage-list">${suggestions.length ? suggestions.map((item) => `<div class="coverage-item"><div><strong>Classe ${escapeHtml(item.code)}</strong><span>${escapeHtml(item.title)}</span></div><span class="badge ${item.scope === "expansion" ? "blue" : "green"}">${escapeHtml(item.scope === "expansion" ? "Expansão" : "Essencial")}</span></div>`).join("") : '<div class="notice">Não encontrei correspondência automática suficiente. Refine a descrição do que a empresa oferece ou revise a Classificação de Nice.</div>'}</div>${availabilityDecision(record)}<h3>Quem será o titular?</h3><p class="subtle">Troque o cenário abaixo para recalcular. A definição final deve refletir quem realmente será o titular no pedido.</p><label><span>Cenário de titularidade</span><select data-classification-discount="${escapeHtml(record.id)}">${discountCategoryOptions(record.discountCategory)}</select></label><h3>Estimativa oficial no cenário escolhido</h3><div class="estimate-grid"><div><span>Especificação pré-aprovada</span><strong>${formatMoney(preApproved.total)}</strong><small>${formatMoney(preApproved.perClass)} por classe</small></div><div><span>Especificação livre</span><strong>${formatMoney(freeText.total)}</strong><small>${formatMoney(freeText.perClass)} por classe</small></div></div><p>${discountStatusBadge(record)} <span class="subtle">${escapeHtml(preApproved.assessment.note)}</span></p><div class="notice quiet"><strong>Comparação por ${suggestions.length} classe(s), com especificação pré-aprovada:</strong> pessoa jurídica sem benefício: ${formatMoney(fullScenario.total)} · PF/MEI/ME/EPP elegível: ${formatMoney(discountedScenario.total)}. A pessoa física só entra no segundo cenário se não participar de empresa do mesmo ramo — salvo se a empresa também tiver direito ao desconto.</div><p class="subtle">Valores oficiais por classe, sem honorários e sem eventos futuros. Primeiro decênio/certificado: ${formatMoney(preApproved.firstDecade)}. A taxa de 100% é estimada apenas para os serviços de entrada elegíveis e exige confirmação no e-INPI. Fontes: <a href="${escapeHtml(window.OFFICIAL_FEES.sourceUrl)}" target="_blank" rel="noreferrer">${escapeHtml(window.OFFICIAL_FEES.source)}</a>.</p><div class="page-actions"><button class="secondary-button" type="button" data-restart-classification="true">Recomeçar classificação</button></div></div>`;
}

function brandOptionsFor(record) {
  return [...new Set([record.brand, ...String(record.alternativeBrands || "").split(/\n|,/).map((item) => item.trim())].filter(Boolean))];
}

function availabilityDecision(record) {
  const options = brandOptionsFor(record);
  const classes = (record.suggestions || []).map((item) => item.code).join(", ");
  return `<section class="notice"><h3>Antes de fechar preço: pesquisar disponibilidade</h3><p>Faça a busca oficial do nome principal e das alternativas nas classes ${escapeHtml(classes || "a confirmar")}, incluindo termos idênticos, fonética, radicais e segmentos afins. Se o risco for alto, o cliente decide entre as opções antes de qualquer GRU.</p><label><span>Nome para pesquisar primeiro</span><select data-availability-brand="${escapeHtml(record.id)}">${options.map((name) => `<option value="${escapeHtml(name)}">${escapeHtml(name)}</option>`).join("")}</select></label><div class="page-actions"><button class="secondary-button" type="button" data-start-availability="${escapeHtml(record.id)}">Abrir triagem de disponibilidade</button></div></section>`;
}

function feePaymentPlan(record) {
  const flow = {
    client_direct: "Cliente paga a GRU diretamente no ambiente oficial e envia o comprovante.",
    office_reimbursement: "Escritório pode antecipar a GRU somente após combinar o reembolso e registrar separadamente taxa oficial e honorários.",
    to_define: "Definir na proposta se a GRU será paga diretamente pelo cliente ou antecipada pelo escritório com reembolso."
  }[record.feePaymentFlow] || "Definir na proposta quem pagará a GRU.";
  return `<section class="notice quiet"><h3>Taxa oficial: quando informar e como pagar</h3><ol class="agent-checklist"><li><strong>Agora:</strong> envie esta estimativa, com cenários de titularidade, e apresente honorários em linha separada.</li><li><strong>Antes de emitir a GRU:</strong> confirme o titular, seu enquadramento no e-INPI e a especificação/classe. Este é o momento de comunicar a <strong>taxa oficial confirmada</strong>.</li><li><strong>Antes do protocolo:</strong> a GRU deve estar efetivamente paga; guarde o número e o comprovante para vincular ao pedido.</li></ol><p><strong>Responsabilidade escolhida:</strong> ${escapeHtml(flow)}</p><p class="subtle">A GRU pode ser paga pela rede bancária, PIX ou cartão de crédito no pagamento online disponível ao perfil Cliente; não se faz PIX direto para a conta do INPI. Para pagamento online, o cartão pode ter parcelamento conforme a opção disponibilizada. <a href="https://www.gov.br/inpi/pt-br/pagamento-de-gru" target="_blank" rel="noreferrer">Orientação oficial de pagamento ↗</a></p></section>`;
}

function bindAgentAnswerEvents(container) {
  container?.querySelectorAll("[data-go]").forEach((button) => button.addEventListener("click", () => { window.view = button.dataset.go; window.render(); }));
  container?.querySelector("#class-intake-form")?.addEventListener("submit", handleClassificationIntake);
  container?.querySelectorAll("[data-classification-discount]").forEach((select) => select.addEventListener("change", (event) => {
    const record = data.diagnoses.find((item) => item.id === event.target.dataset.classificationDiscount);
    if (!record) return;
    record.discountCategory = event.target.value;
    window.save();
    container.innerHTML = classificationResultAnswer(record);
    bindAgentAnswerEvents(container);
  }));
  container?.querySelectorAll("[data-start-availability]").forEach((button) => button.addEventListener("click", () => {
    const record = data.diagnoses.find((item) => item.id === button.dataset.startAvailability);
    const brand = container.querySelector(`[data-availability-brand="${button.dataset.startAvailability}"]`)?.value || record?.brand || "";
    if (!record) return;
    window.availabilityPrefill = { brand, classes: (record.suggestions || []).map((item) => item.code).join(", ") };
    window.view = "availability";
    window.render();
  }));
  container?.querySelector("[data-restart-classification]")?.addEventListener("click", () => {
    container.innerHTML = classificationIntakeAnswer();
    bindAgentAnswerEvents(container);
  });
}

function clientUpdateForMovement(id) {
  const movement = data.movements.find((item) => item.id === id);
  const process = movement && window.processById(movement.processId);
  if (!movement || !process) return "Não foi possível localizar os dados do processo para este despacho.";
  const clientName = client(process.clientId).name;
  return [
    `Olá, ${escapeHtml(clientName)}.`,
    "",
    `Atualização da marca ${escapeHtml(process.brand)}${process.number ? ` (processo ${escapeHtml(process.number)})` : ""}.`,
    `A RPI publicou o despacho: ${escapeHtml(movement.dispatchName)} (${escapeHtml(movement.dispatchCode)}).`,
    `Situação atual: ${escapeHtml(process.status)}.`,
    `Próxima ação: ${escapeHtml(process.nextAction)}.`,
    process.legalDeadline ? `Prazo legal registrado: ${formatDate(process.legalDeadline)}.` : "",
    process.internalDeadline ? `Prazo interno de acompanhamento: ${formatDate(process.internalDeadline)}.` : "",
    "",
    "Esta é uma atualização operacional. A publicação oficial da RPI será conferida antes de qualquer providência."
  ].filter(Boolean).join("\n");
}

async function copyClientUpdate(id) {
  const text = clientUpdateForMovement(id);
  try {
    await navigator.clipboard.writeText(text);
    alert("Atualização pronta e copiada para a área de transferência.");
  } catch {
    window.prompt("Copie a atualização abaixo:", text);
  }
}

export {
  tokenize, retrieveKnowledge, answerQuestion, isClassificationQuestion,
  buildChecklist, parseAvailabilityCandidates,
  renderAgentAnswer, agentProcessPayload, answerQuestionWithBackend,
  agentIntro, classificationIntakeAnswer, classificationResultAnswer,
  brandOptionsFor, availabilityDecision, feePaymentPlan,
  bindAgentAnswerEvents, clientUpdateForMovement, copyClientUpdate
};
