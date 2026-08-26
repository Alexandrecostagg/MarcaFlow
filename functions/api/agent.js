const KNOWLEDGE = [
  {
    id: "inpi-guia-entenda",
    source: "INPI - Guia Básico de Marca",
    url: "https://www.gov.br/inpi/pt-br/servicos/marcas/guia-basico",
    title: "O que a marca protege",
    text: "Marca e um nome e/ou imagem que identifica produto ou servico. Para ter exclusividade sobre ela, e preciso solicitar o registro no INPI. Antes do deposito, a busca e a classificacao correta ajudam a avaliar risco de conflito com marcas anteriores semelhantes."
  },
  {
    id: "inpi-guia-busca",
    source: "INPI - Guia Básico de Marca",
    url: "https://www.gov.br/inpi/pt-br/servicos/marcas/guia-basico",
    title: "Busca e classificacao",
    text: "O INPI recomenda fazer busca na base de marcas antes do pedido. A pesquisa pode considerar palavra-chave, numero do processo e nome do depositante. A classificacao dos produtos e servicos deve ser coerente com a atividade protegida."
  },
  {
    id: "inpi-guia-gru",
    source: "INPI - Guia Básico de Marca",
    url: "https://www.gov.br/inpi/pt-br/servicos/marcas/guia-basico",
    title: "GRU antes do deposito",
    text: "Antes de iniciar o pedido de registro de marca, deve-se pagar a GRU. O numero da guia paga e necessario para preencher e enviar o formulario do pedido no e-Marcas."
  },
  {
    id: "inpi-guia-rpi",
    source: "INPI - Guia Básico de Marca",
    url: "https://www.gov.br/inpi/pt-br/servicos/marcas/guia-basico",
    title: "Acompanhamento pela RPI",
    text: "O acompanhamento do pedido deve considerar a Revista da Propriedade Industrial, publicada as tercas-feiras. Alertas por e-mail em Meus Pedidos sao servico extra e nao substituem a consulta a RPI."
  },
  {
    id: "inpi-guia-concessao",
    source: "INPI - Guia Básico de Marca",
    url: "https://www.gov.br/inpi/pt-br/servicos/marcas/guia-basico",
    title: "Concessao e renovacao",
    text: "Apos o deferimento, a concessao do registro ocorre automaticamente, com posterior emissao do certificado. O registro pode ser renovado a cada dez anos."
  },
  {
    id: "inpi-fluxo-prazos",
    source: "INPI - Guia Básico do Pedido de Marca",
    url: "https://www.gov.br/inpi/pt-br/servicos/marcas/arquivos/guia-basico/Guiabsicodemarcas.pdf",
    title: "Prazos principais do fluxo",
    text: "Exigencia formal deve ser respondida em ate 5 dias. Oposicao e manifestacao a oposicao trabalham com prazo de 60 dias. Exigencia de merito deve ser respondida em ate 60 dias. Recurso contra indeferimento tambem exige controle de prazo de 60 dias."
  },
  {
    id: "inpi-fluxo-merito",
    source: "INPI - Guia Básico do Pedido de Marca",
    url: "https://www.gov.br/inpi/pt-br/servicos/marcas/arquivos/guia-basico/Guiabsicodemarcas.pdf",
    title: "Exame de merito",
    text: "No exame de merito, o INPI avalia se a marca cumpre os requisitos legais e pode ou nao ser registrada. Podem ocorrer exigencias, suspensao temporaria, deferimento ou indeferimento."
  },
  {
    id: "inpi-classificacao-2026",
    source: "INPI - Classificação de Produtos e Serviços",
    url: "https://www.gov.br/inpi/pt-br/servicos/marcas/classificacao-marcas",
    title: "Classes, especificação e descrição livre",
    text: "A Classificação de Nice possui 45 classes: produtos nas classes 1 a 34 e serviços nas classes 35 a 45. A seleção deve refletir os produtos e serviços efetivamente protegidos. Itens pré-aprovados no e-Marcas reduzem o risco de exigência; a especificação livre deve ser usada somente quando necessária e precisa pertencer a uma única classe."
  },
  {
    id: "inpi-tabela-marcas-2025",
    source: "INPI - Tabela de Retribuições de Marcas",
    url: "https://www.gov.br/inpi/pt-br/servicos/marcas/NovaTabeladeRetribuiesINPI_MARCAS_Final_20_dez_25.pdf",
    title: "Taxas por classe e descontos",
    text: "Para o pedido de registro de marca por classe, a tabela vigente indicada prevê R$ 880 com especificação pré-aprovada ou R$ 1.720 com especificação livre. Para categorias elegíveis ao desconto de 50%, os valores são R$ 440 e R$ 860, respectivamente. A elegibilidade ao desconto depende da categoria do titular e deve ser confirmada no canal oficial. Custos de eventos processuais e de renovação são distintos do pedido inicial; a concessão e emissão do certificado do primeiro decênio estão isentas na tabela vigente indicada."
  },
  {
    id: "manual-marcas",
    source: "INPI - Manual de Marcas",
    url: "https://manualdemarcas.inpi.gov.br/projects/manual/wiki/Manual_de_Marcas",
    title: "Manual como referencia",
    text: "O Manual de Marcas consolida diretrizes e procedimentos de analise, instrucoes para formulacao de pedidos e acompanhamento de processos. O proprio manual informa que recebe atualizacoes periodicas."
  },
  {
    id: "marcaflow-regra-triagem",
    source: "MarcaFlow - regra operacional",
    url: "https://marcaflow.pages.dev",
    title: "Triagem nao substitui decisao juridica",
    text: "O XML da RPI e usado para triagem operacional. Antes de cumprir prazo, responder exigencia, manifestar oposicao ou tomar decisao processual, confira o despacho no PDF oficial e no Manual de Marcas vigente."
  }
];

const jsonHeaders = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store",
  "x-content-type-options": "nosniff",
  "x-frame-options": "DENY"
};
const FIREBASE_CERTS_URL = "https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com";
const FIREBASE_PROJECT_ID = "marcaflow-inpi";

const RATE_LIMIT_WINDOW_MS = 60000;
const RATE_LIMIT_MAX = 20;
const rateLimitStore = new Map();

function json(payload, status = 200) {
  return new Response(JSON.stringify(payload), { status, headers: jsonHeaders });
}

function base64UrlToBytes(value) {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  const binary = atob(base64);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

function decodeJwtPart(value) {
  return JSON.parse(new TextDecoder().decode(base64UrlToBytes(value)));
}

async function verifyFirebaseToken(request) {
  const auth = request.headers.get("authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!token) throw new Error("missing-token");

  const [headerPart, payloadPart, signaturePart] = token.split(".");
  if (!headerPart || !payloadPart || !signaturePart) throw new Error("malformed-token");

  const header = decodeJwtPart(headerPart);
  const payload = decodeJwtPart(payloadPart);
  const now = Math.floor(Date.now() / 1000);
  const issuer = `https://securetoken.google.com/${FIREBASE_PROJECT_ID}`;

  if (payload.aud !== FIREBASE_PROJECT_ID) throw new Error("invalid-audience");
  if (payload.iss !== issuer) throw new Error("invalid-issuer");
  if (!payload.sub || typeof payload.sub !== "string") throw new Error("invalid-subject");
  if (payload.exp <= now || payload.iat > now + 60) throw new Error("invalid-time");

  const response = await fetch(FIREBASE_CERTS_URL, {
    headers: { accept: "application/json" },
    cf: { cacheTtl: 3600, cacheEverything: true }
  });
  if (!response.ok) throw new Error("jwks-unavailable");
  const jwks = await response.json();
  const jwk = (jwks.keys || []).find((key) => key.kid === header.kid);
  if (!jwk) throw new Error("unknown-key");

  const cryptoKey = await crypto.subtle.importKey("jwk", jwk, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["verify"]);
  const verified = await crypto.subtle.verify(
    "RSASSA-PKCS1-v1_5",
    cryptoKey,
    base64UrlToBytes(signaturePart),
    new TextEncoder().encode(`${headerPart}.${payloadPart}`)
  );
  if (!verified) throw new Error("invalid-signature");
  return payload;
}

function checkRateLimit(userId) {
  const now = Date.now();
  const windowStart = now - RATE_LIMIT_WINDOW_MS;
  const userEntries = rateLimitStore.get(userId) || [];
  const validEntries = userEntries.filter(t => t > windowStart);
  if (validEntries.length >= RATE_LIMIT_MAX) {
    throw new Error("rate-limit");
  }
  validEntries.push(now);
  rateLimitStore.set(userId, validEntries);
  if (rateLimitStore.size > 1000) {
    const entries = [...rateLimitStore.entries()].filter(([_, times]) => times.some(t => t > windowStart));
    rateLimitStore.clear();
    for (const [uid, times] of entries) rateLimitStore.set(uid, times);
  }
}

function sanitizeText(value) {
  return String(value || "")
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<\/?script\b/gi, "")
    .replace(/javascript:/gi, "")
    .replace(/on\w+\s*=/gi, "")
    .replace(/data:text\/html/gi, "")
    .replace(/[`\\"']/g, "")
    .replace(/\u0000-\u001F\u007F-\u009F/g, "")
    .trim();
}

function sanitizeProcessData(process) {
  if (!process || typeof process !== "object") return null;
  const safe = {};
  for (const [key, value] of Object.entries(process)) {
    if (typeof value === "string") {
      safe[key] = sanitizeText(value).slice(0, 500);
    } else {
      safe[key] = value;
    }
  }
  return safe;
}

function tokenize(text) {
  return String(text || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length > 2);
}

function retrieveKnowledge(question) {
  const terms = tokenize(question);
  return KNOWLEDGE.map((item) => {
    const haystack = tokenize(`${item.title} ${item.text} ${item.source}`);
    const score = terms.reduce((sum, term) => sum + haystack.filter((word) => word.includes(term) || term.includes(word)).length, 0);
    return { ...item, score };
  }).filter((item) => item.score > 0).sort((a, b) => b.score - a.score).slice(0, 4);
}

function processSummary(process) {
  if (!process || typeof process !== "object") return "Nenhum processo específico selecionado.";
  return [
    `Marca: ${process.brand || "nao informada"}`,
    `Processo: ${process.number || "pre-deposito"}`,
    `Cliente: ${process.client || "nao informado"}`,
    `Classe(s): ${process.classes || "nao informadas"}`,
    `Etapa: ${process.flowStage || "nao informada"}`,
    `Status: ${process.status || "nao informado"}`,
    `Proxima acao: ${process.nextAction || "nao informada"}`,
    `Prazo legal: ${process.legalDeadline || "sem prazo"}`,
    `Prazo interno: ${process.internalDeadline || "sem prazo"}`,
    `Ultima RPI: ${process.lastRpi || "sem RPI"}`,
    `Ultimo despacho: ${process.lastDispatchCode || "sem despacho"} ${process.lastDispatchName || ""}`.trim()
  ].join("\n");
}

function extractText(response) {
  return String(response?.choices?.[0]?.message?.content || "").trim();
}

export async function onRequestPost(context) {
  const request = context.request;
  const env = context.env || {};
  const contentLength = Number(request.headers.get("content-length") || "0");
  if (contentLength > 12000) return json({ error: "Payload muito grande." }, 413);
  try {
    const tokenPayload = await verifyFirebaseToken(request);
    checkRateLimit(tokenPayload.sub);
  } catch (error) {
    if (error.message === "rate-limit") {
      return json({ error: "Limite de requisições excedido. Aguarde 1 minuto.", fallback: true, sources: [] }, 429);
    }
    return json({ error: "Autenticacao obrigatoria.", fallback: true, sources: [] }, 401);
  }

  let payload;
  try {
    payload = await request.json();
  } catch {
    return json({ error: "JSON invalido." }, 400);
  }

  const rawQuestion = String(payload.question || "").trim();
  if (rawQuestion.length < 4) return json({ error: "Pergunta muito curta.", fallback: true, sources: [] }, 400);
  const question = sanitizeText(rawQuestion).slice(0, 1200);
  if (question.length < 4) return json({ error: "Pergunta vazia apos sanitizacao.", fallback: true, sources: [] }, 400);

  const sanitizedProcess = sanitizeProcessData(payload.process || null);

  const sources = retrieveKnowledge(question);
  if (!env.DEEPSEEK_API_KEY) {
    return json({ error: "DEEPSEEK_API_KEY nao configurada.", fallback: true, sources }, 503);
  }

  const model = env.DEEPSEEK_MODEL || "deepseek-v4-flash";
  const prompt = [
    "Pergunta do usuario:",
    question,
    "",
    "Processo selecionado no MarcaFlow:",
    processSummary(sanitizedProcess),
    "",
    "Fontes recuperadas:",
    sources.map((item, index) => `[${index + 1}] ${item.title} (${item.source})\nURL: ${item.url}\n${item.text}`).join("\n\n")
  ].join("\n");

  const deepseekResponse = await fetch("https://api.deepseek.com/chat/completions", {
    method: "POST",
    headers: {
      authorization: `Bearer ${env.DEEPSEEK_API_KEY}`,
      "content-type": "application/json"
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: "system",
          content: [
            "Voce e o Agente INPI do MarcaFlow, um assistente operacional para acompanhamento de marcas no INPI.",
            "Responda em portugues do Brasil, de forma humana, clara e pratica; nao entregue um texto generico de manual.",
            "Use somente as fontes recuperadas e o contexto do processo informado.",
            "Quando a pergunta envolver classe, categoria, enquadramento, protecao ou custo: comece explicando que o enquadramento nasce da atividade real, nao do nome da marca. Se faltarem dados, conduza a conversa e peça: produtos/servicos atuais, se fabrica/vende/presta servico, canais de venda, expansao em 12-24 meses e perfil do titular para desconto. Diga que a entrega sera classes essenciais, classes de expansao e soma do custo por classe. Se houver dados suficientes, apresente classes candidatas, a justificativa curta de cada uma e a estimativa usando os valores recuperados; separe taxa oficial de honorarios e de eventos futuros.",
            "Nao de parecer juridico definitivo. Sempre recomende conferir a RPI/PDF oficial e o Manual de Marcas vigente antes de cumprir prazo.",
            "Estruture naturalmente com titulos curtos: O que vamos proteger, O que preciso confirmar, Estimativa inicial e Proximo passo."
          ].join("\n")
        },
        { role: "user", content: prompt }
      ],
      thinking: { type: "disabled" },
      max_tokens: 900,
      stream: false
    })
  });

  const result = await deepseekResponse.json().catch(() => ({}));
  if (!deepseekResponse.ok) {
    return json({ error: result.error?.message || "Falha ao chamar DeepSeek.", fallback: true, sources }, deepseekResponse.status);
  }

  const answer = extractText(result);
  if (!answer) return json({ error: "DeepSeek nao retornou texto.", fallback: true, sources }, 502);

  return json({
    answer,
    model,
    sources,
    fallback: false
  });
}

export function onRequestOptions() {
  return json({});
}
