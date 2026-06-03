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
  "cache-control": "no-store"
};
const FIREBASE_CERTS_URL = "https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com";
const FIREBASE_PROJECT_ID = "marcaflow-inpi";

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
  if (response.output_text) return response.output_text;
  return (response.output || [])
    .flatMap((item) => item.content || [])
    .map((content) => content.text || "")
    .filter(Boolean)
    .join("\n\n");
}

export async function onRequestPost(context) {
  const request = context.request;
  const env = context.env || {};
  const contentLength = Number(request.headers.get("content-length") || "0");
  if (contentLength > 12000) return json({ error: "Payload muito grande." }, 413);
  try {
    await verifyFirebaseToken(request);
  } catch {
    return json({ error: "Autenticacao obrigatoria.", fallback: true, sources: [] }, 401);
  }

  let payload;
  try {
    payload = await request.json();
  } catch {
    return json({ error: "JSON invalido." }, 400);
  }

  const question = String(payload.question || "").trim().slice(0, 1200);
  if (question.length < 4) return json({ error: "Pergunta muito curta." }, 400);

  const sources = retrieveKnowledge(question);
  if (!env.OPENAI_API_KEY) {
    return json({ error: "OPENAI_API_KEY nao configurada.", fallback: true, sources }, 503);
  }

  const model = env.OPENAI_MODEL || "gpt-5.4-mini";
  const process = payload.process || null;
  const prompt = [
    "Pergunta do usuario:",
    question,
    "",
    "Processo selecionado no MarcaFlow:",
    processSummary(process),
    "",
    "Fontes recuperadas:",
    sources.map((item, index) => `[${index + 1}] ${item.title} (${item.source})\nURL: ${item.url}\n${item.text}`).join("\n\n")
  ].join("\n");

  const openaiResponse = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      authorization: `Bearer ${env.OPENAI_API_KEY}`,
      "content-type": "application/json"
    },
    body: JSON.stringify({
      model,
      instructions: [
        "Voce e o Agente INPI do MarcaFlow, um assistente operacional para acompanhamento de marcas no INPI.",
        "Responda em portugues do Brasil, de forma objetiva e pratica.",
        "Use somente as fontes recuperadas e o contexto do processo informado.",
        "Nao de parecer juridico definitivo. Sempre recomende conferir a RPI/PDF oficial e o Manual de Marcas vigente antes de cumprir prazo.",
        "Estruture em: Resposta, Proximos passos, Fontes usadas."
      ].join("\n"),
      input: prompt,
      max_output_tokens: 900
    })
  });

  const result = await openaiResponse.json().catch(() => ({}));
  if (!openaiResponse.ok) {
    return json({ error: result.error?.message || "Falha ao chamar OpenAI.", fallback: true, sources }, openaiResponse.status);
  }

  return json({
    answer: extractText(result),
    model,
    sources,
    fallback: false
  });
}

export function onRequestOptions() {
  return json({});
}
