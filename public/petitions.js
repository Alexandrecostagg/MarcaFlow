/**
 * MarcaFlow - Módulo de Petições Template
 * Biblioteca de petições padronizadas com preenchimento automático
 */

import { data, client, save } from "./store.js";
import { escapeHtml } from "./utils.js";

const PETITION_TYPES = {
  "manifestacao_oposicao": {
    name: "Manifestação à Oposição",
    category: "Oposição",
    description: "Resposta à oposição de terceiros contra registro de marca",
    fields: ["opositor", "processo_oposicao", "marca", "classes", "fundamentos"]
  },
  "recurso_indeferimento": {
    name: "Recurso contra Indeferimento",
    category: "Recurso",
    description: "Recurso administrativo contra decisão de indeferimento do INPI",
    fields: ["marca", "processo", "indeferimento", "fundamentos"]
  },
  "resposta_exigencia": {
    name: "Resposta a Exigência",
    category: "Exigência",
    description: "Manifestação técnica respondendo exigência do INPI",
    fields: ["marca", "processo", "exigencia", "documentos", "fundamentos"]
  },
  "renunciacao_oposicao": {
    name: "Desistência de Oposição",
    category: "Oposição",
    description: "Manifestação de desistência da oposição formulada",
    fields: ["oposto", "processo_oposicao", "marca", "motivo"]
  },
  "cessao": {
    name: "Cessão de Direitos",
    category: "Transferência",
    description: "Instrumento de cessão de direitos de marca",
    fields: ["cedente", "cessionario", "marca", "processo", "valor"]
  },
  "licenciamento": {
    name: "Contrato de Licenciamento",
    category: "Transferência",
    description: "Contrato de licença de uso de marca",
    fields: ["licenciante", "licenciado", "marca", "processo", "terreno", "valor", "prazo"]
  }
};

/**
 * Gera texto da petição com base no template e dados preenchidos
 */
function generatePetition(type, formData) {
  const template = PETITIONS_TEMPLATES[type];
  if (!template) return "Tipo de petição inválido.";

  let text = template.header;
  
  // Preenche campos
  for (const [key, value] of Object.entries(formData)) {
    const placeholder = `{{${key}}}`;
    text = text.replace(new RegExp(escapeRegExp(placeholder), "g"), value || "");
  }
  
  text += template.footer;
  
  return text;
}

/**
 * Escapa regex
 */
function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Templates de petições
 */
const PETITIONS_TEMPLATES = {
  manifestacao_oposicao: {
    header: `EXCELENTÍSSIMO SENHOR DOUTOR DIRETOR-GERAL DO INSTITUTO NACIONAL DA PROPRIEDADE INDUSTRIAL

À Secretaria de Marcas

**MANIFESTAÇÃO À OPOSIÇÃO**

Processo: {{processo_oposicao}}
Marca Oposta: {{marca}}
Classes: {{classes}}

O(A) {{opositor}}, nacional, estado civil, profissional, portador do RG {{rg}} e inscrito no CPF sob o nº {{cpf}}, residente e domiciliado na {{endereco}}, vem, respeitosamente, à presença de Vossa Senhoria, apresentar MANIFESTAÇÃO À OPOSIÇÃO formulada contra o pedido de registro da marca {{marca}}, pelas razões a seguir expostas:

**DOS FATOS**

O pedido de registro da marca {{marca}, registrado sob o nº {{processo}}, foi publicado para oposição na RPI nº {{rpi}}, em {{data_publicacao}}.

A oposente {{opositor}} alega que a marca postulada é semelhante à sua marca registrada {{marca_oposente}, registro nº {{registro_oposente}},Classes {{classes_oposente}}.

**DOS FUNDAMENTOS JURÍDICOS**

A manifestação à oposição deve ser fundamentada e apresentar provas que demonstrem:

1. **Semelhança entre as marcas:** {{fundamentos}}

2. **Provas de uso:** 
{{provas_uso}}

3. **Reputação da marca:**
{{reputacao}}

**DOS PEDIDOS**

Diante do exposto, requer:

a) O recebimento e análise da presente manifestação;
b) A improcedência da oposição formulada;
c) O deferimento do registro da marca {{marca}};
d) A intimação do interessado para, querendo, contra-maniifestar no prazo legal.

Nestes termos,
Pede deferimento.

{{cidade}}, {{data}}.

___________________________
{{advogado}}
OAB/{{estado}} nº {{oab}}`,
    footer: `\n\n**DOCUMENTOS ANEXOS:**\n- Procuração\n- QG do oposente\n- Comprovante de pagamento da GRU\n- Provas de uso da marca\n- Contrarrazões (se aplicável)`
  },
  
  recurso_indeferimento: {
    header: `EXCELENTÍSSIMO SENHOR DOUTOR DIRETOR-GERAL DO INSTITUTO NACIONAL DA PROPRIEDADE INDUSTRIAL

À Secretaria de Marcas

**RECURSO CONTRA INDEFERIMENTO**

Processo: {{processo}}
Marca: {{marca}}
Classes: {{classes}}

O(A) {{titular}}, nacional, estado civil, profissional, portador do RG {{rg}} e inscrito no CPF sob o nº {{cpf}}, vem, respeitosamente, à presença de Vossa Senhoria, interpor **RECURSO CONTRA INDEFERIMENTO** do pedido de registro da marca {{marca}, pelas razões a seguir:

**DO INDEFERIMENTO**

O pedido de registro da marca {{marca} foi indeferido mediante despacho de código {{codigo_despacho}, publicado na RPI nº {{rpi}, em {{data_publicacao}}.

O indeferimento fundamentou-se em: {{fundamentos_indeferimento}}

**DOS FUNDAMENTOS DO RECURSO**

O(A) recorrente impugna o indeferimento pelas razões a seguir:

1. **Distintividade da marca:** {{fundamentos_distintividade}}

2. **Ausência de similaridade:** {{fundamentos_similaridade}}

3. **Provas de uso e reputação:**
{{provas_uso}}

4. **Fundamentação legal:**
A marca {{marca} é distintiva e não guarda similaridade com anterioridades que justifiquem o indeferimento. Conforme art. 124 da Lei da Propriedade Industrial (Lei nº 9.279/96), são sinais visualmente perceptíveis suscetíveis de representação gráfica...

**DOS PEDIDOS**

Diante do exposto, requer:

a) O conhecimento e provimento do recurso;
b) A reversalão do ato de indeferimento;
c) O deferimento do registro da marca {{marca};
d) A intimação do interessado para, querendo, apresentar contrarrazões.

Nestes termos,
Pede deferimento.

{{cidade}}, {{data}}.

___________________________
{{advogado}}
OAB/{{estado}} nº {{oab}}`,
    footer: `\n\n**DOCUMENTOS ANEXOS:**\n- Procuração\n- QG do recorrente\n- Comprovante de pagamento da GRU do recurso\n- Provas de uso\n- Documentos suplementares`
  },
  
  resposta_exigencia: {
    header: `EXCELENTÍSSIMO SENHOR DOUTOR DIRETOR-GERAL DO INSTITUTO NACIONAL DA PROPRIEDADE INDUSTRIAL

À Secretaria de Marcas

**RESPOSTA À EXIGÊNCIA**

Processo: {{processo}}
Marca: {{marca}}
Classes: {{classes}}
Exigência: {{exigencia}}

O(A) {{titular}}, nacional, estado civil, profissional, portador do RG {{rg}} e inscrito no CPF sob o nº {{cpf}}, vem, respeitosamente, à presença de Vossa Senhoria, apresentar **RESPOSTA À EXIGÊNCIA** formulada no processo em epígrafe, pelas razões a seguir:

**DA EXIGÊNCIA**

A exigência foi formulada em {{data_exigencia}, mediante despacho de código {{codigo_exigencia}}, solicitando: {{exigencia}}

**DA MANIFESTAÇÃO**

O(A) depositante manifesta-se acerca da exigência da seguinte forma:

{{fundamentos_resposta}}

**DOS DOCUMENTOS COMPROBATORIOS:**
{{documentos}}

**DOS PEDIDOS**

Diante do exposto, requer:

a) O recebimento da presente manifestação;
b) O acolhimento dos argumentos apresentados;
c) O prosseguimento do feito;
d) A intimação do interessado, se necessário.

Nestes termos,
Pede deferimento.

{{cidade}}, {{data}}.

___________________________
{{advogado}}
OAB/{{estado}} nº {{oab}}`,
    footer: `\n\n**DOCUMENTOS ANEXOS:**\n- Procuração\n- QG do depositante\n- Comprovante de pagamento da GRU\n- Documentos solicitados na exigência`
  },
  
  cessao: {
    header: `**INSTRUMENTO PARTICULAR DE CESSÃO DE DIREITOS DE MARCA**

**CEDENTE:** {{cedente}}, nacional, estado civil, profissional, portador do RG {{rg_cedente}} e inscrito no CPF sob o nº {{cpf_cedente}}, residente e domiciliado na {{endereco_cedente}}.

**CESSIONÁRIO:** {{cessionario}}, nacional, estado civil, profissional, portador do RG {{rgcessionario}} e inscrito no CPF sob o nº {{cpfcessionario}}, residente e domiciliado na {{enderecocessionario}}.

**OBJETO:** Cessão dos direitos relativos à marca {{marca}, registro nº {{registro}, Classes {{classes}}, objeto do processo de registro nº {{processo}}.

**CLÁUSULA PRIMEIRA - DO OBJETO**

O(A) CEDENTE é titular dos direitos relativos à marca {{marca}, registrada sob o nº {{registro}, junto ao INPI,Classes {{classes}}.

**CLÁUSULA SEGUNDA - DA CESSÃO**

O(A) CEDENTE cede, por este instrumento, todos os direitos relativos à marca objeto deste contrato ao(à) CESSIONÁRIO(A), incluindo:
- Direitos de uso
- Direitos de licença
- Direitos de cessão
- Direitos de ação judicial

**CLÁUSULA TERCEIRA - DO VALOR**

A presente cessão é realizada pelo valor de R$ {{valor}, que será pago pelo CESSIONÁRIO ao CEDENTE da seguinte forma: {{forma_pagamento}}.

**CLÁUSULA QUARTA - DAS OBRIGAÇÕES**

O(A) CEDENTE declara que:
- É legítimo titular da marca
- A marca está livre de ônus
- Não há litígios relativos à marca

**CLÁUSULA QUINTA - DO REGISTRO**

A presente cessão deverá ser registrada junto ao INPI, em até 30 dias, mediante apresentação deste instrumento.

**CLÁUSULA SEXTA - DO FORO**

Fica eleito o foro de {{cidade}} para dirimir quaisquer dúvidas oriundas deste contrato.

{{cidade}}, {{data}}.

___________________________
{{cedente}}

___________________________
{{cessionario}}

Testemunhas:

___________________________
{{testemunha1}}

___________________________
{{testemunha2}}`,
    footer: `\n\n**ASSINATURAS:**\n- CEDENTE: {{cedente}}\n- CESSIONÁRIO: {{cessionario}}\n- TESTEMUNHAS: {{testemunha1}}, {{testemunha2}}`
  }
};

/**
 * Renderiza formulário de petição
 */
function renderPetitionForm(type) {
  const template = PETITION_TYPES[type];
  if (!template) return '<div class="empty">Tipo de petição inválido.</div>';

  const fields = template.fields.map(field => {
    const labels = {
      "opositor": "Nome do Oposente",
      "processo_oposicao": "Número do Processo de Oposição",
      "marca": "Marca em questão",
      "classes": "Classes de Nice",
      "fundamentos": "Fundamentos da manifestação",
      "processo": "Número do Processo",
      "indeferimento": "Descrição do indeferimento",
      "exigencia": "Descrição da exigência",
      "documentos": "Documentos comprobatórios",
      "oposto": "Nome do Oposto",
      "motivo": "Motivo da desistência",
      "cedente": "Nome do Cedente",
      "cessionario": "Nome do Cessionário",
      "valor": "Valor da cessão",
      "licenciante": "Nome do Licenciante",
      "licenciado": "Nome do Licenciado",
      "terreno": "Territorio de vigência",
      "prazo": "Prazo do licenciamento"
    };
    
    return `<label><span>${labels[field] || field}</span><input required name="${field}" placeholder="${labels[field] || field}" /></label>`;
  }).join("");

  return `
    <form id="petition-form-${type}" class="agent-form" onsubmit="handlePetitionSubmit(event, '${type}')">
      ${fields}
      <button class="primary-button" type="submit">Gerar Petição</button>
    </form>
  `;
}

/**
 * Handler para submit de petição
 */
function handlePetitionSubmit(event, type) {
  event.preventDefault();
  const formData = Object.fromEntries(new FormData(event.currentTarget));
  const petitionText = generatePetition(type, formData);
  
  const resultContainer = document.getElementById("petition-result");
  if (resultContainer) {
    resultContainer.innerHTML = `
      <div class="panel" style="margin-top: 15px;">
        <div class="panel-header"><div><h3>Petição Gerada</h3></div></div>
        <div class="panel-body">
          <textarea rows="20" style="width: 100%; font-family: monospace; font-size: 12px; padding: 10px; border: 1px solid var(--line); border-radius: 5px;" readonly>${escapeHtml(petitionText)}</textarea>
          <div class="page-actions" style="margin-top: 10px;">
            <button class="secondary-button" id="copy-petition-${type}">📋 Copiar</button>
            <button class="secondary-button" id="download-petition-${type}">📄 Baixar TXT</button>
          </div>
        </div>
      </div>
    `;
    
    // Bind copy button
    setTimeout(() => {
      const copyBtn = document.getElementById(`copy-petition-${type}`);
      const downloadBtn = document.getElementById(`download-petition-${type}`);
      
      if (copyBtn) {
        copyBtn.addEventListener("click", () => {
          navigator.clipboard.writeText(petitionText).then(() => {
            alert("Petição copiada!");
          }).catch(() => {
            window.prompt("Copie a petição:", petitionText);
          });
        });
      }
      
      if (downloadBtn) {
        downloadBtn.addEventListener("click", () => {
          const blob = new Blob([petitionText], { type: "text/plain" });
          const url = URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.href = url;
          link.download = `peticao_${type}_${Date.now()}.txt`;
          link.click();
          URL.revokeObjectURL(url);
        });
      }
    }, 100);
  }
}

/**
 * Renderiza view de petições
 */
function petitionsView() {
  const types = Object.entries(PETITION_TYPES).map(([key, value]) => `
    <article class="panel" style="margin-bottom: 15px;">
      <div class="panel-header"><div><h3>${escapeHtml(value.name)}</h3><span class="badge blue">${escapeHtml(value.category)}</span></div></div>
      <div class="panel-body">
        <p>${escapeHtml(value.description)}</p>
        <button class="primary-button" onclick="showPetitionForm('${key}')">Usar Template</button>
        <div id="petition-form-container-${key}" style="margin-top: 15px;"></div>
      </div>
    </article>
  `).join("");

  return `
    <div class="page-head"><div><h2>Petições Template</h2><p>Biblioteca de petições padronizadas para processos de marcas.</p></div></div>
    <div class="notice">Selecione um tipo de petição e preencha os campos para gerar o documento pronto para assinatura.</div>
    ${types}
    <div id="petition-result"></div>
  `;
}

/**
 * Exibe formulário de petição
 */
function showPetitionForm(type) {
  const container = document.getElementById(`petition-form-container-${type}`);
  if (container) {
    container.innerHTML = renderPetitionForm(type);
  }
}

// Expor para uso global
window.PETITION_TYPES = PETITION_TYPES;
window.generatePetition = generatePetition;
window.renderPetitionForm = renderPetitionForm;
window.handlePetitionSubmit = handlePetitionSubmit;
window.petitionsView = petitionsView;
window.showPetitionForm = showPetitionForm;

export {
  PETITION_TYPES,
  PETITIONS_TEMPLATES,
  generatePetition,
  renderPetitionForm,
  handlePetitionSubmit,
  petitionsView,
  showPetitionForm
};
