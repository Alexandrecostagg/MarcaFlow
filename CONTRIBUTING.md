# 🤝 Contribuindo com o MarcaFlow

## Primeiros Passos

### 1. Fork o Repositório
```bash
git clone https://github.com/seu-usuario/marcaflow.git
cd marcaflow
```

### 2. Instalar Dependências
```bash
npm install
```

### 3. Criar Branch
```bash
git checkout -b feature/nome-da-feature
```

---

## Estrutura do Projeto

```
marcaflow/
├── public/              # Frontend (HTML, JS, CSS)
│   ├── index.html       # Página principal
│   ├── data.js          # Camada de dados
│   ├── business.js      # Lógica de negócio
│   ├── views.js         # Renderização UI
│   ├── agent.js         # Agente INPI
│   ├── search.js        # Busca automatizada
│   ├── alerts.js        # Alertas proativos
│   ├── gru.js           # Geração GRU
│   ├── antteriority.js  # Análise de anterioridade
│   ├── petitions.js     # Petições template
│   ├── client-dashboard.js      # Dashboard cliente
│   ├── emarcas.js       # Integração e-Marcas
│   ├── financial.js     # Faturamento
│   ├── reports.js       # Relatórios
│   ├── utils.js         # Utilitários
│   ├── main.js          # Coordenação
│   ├── service-worker.js # PWA
│   ├── manifest.json    # Config PWA
│   ├── firebase-config.js # Firebase
│   └── _headers         # Segurança headers
├── functions/           # Backend (Cloudflare)
│   ├── api/
│   │   └── agent.js     # Cloudflare Function
│   └── wrangler.toml    # Config Cloudflare
├── scripts/             # Scripts Python
│   ├── monitor-rpi.py   # Monitoramento RPI
│   ├── monitor-petitions.py # Monitoramento petições
│   └── requirements.txt
├── firestore.rules      # Regras Firestore
├── firebase.json        # Config Firebase
└── package.json         # Dependências

```

---

## Padrões de Código

### JavaScript (ES6+)
```javascript
// ✅ Correto
export function loadBrands() {
  return brands;
}

// ❌ Incorreto
function loadBrands() {
  return brands;
}
```

### Modularização
- **Um arquivo = Uma responsabilidade**
- **Import/Export** para comunicação entre módulos
- **Não usar variáveis globais** (exceto `window`)

### Nomenclatura
```javascript
// Funções: verbo + objeto
loadBrands()
saveAlerts()
renderDashboard()

// Variáveis: nome claro
const brandName = 'TechFlow';
const deadlineDate = '2024-12-31';

// Constantes: UPPER_SNAKE_CASE
const MAX_RECORDS = 5000;
const RATE_LIMIT = 20;
```

---

## Testes

### Testes Unitários
```javascript
// public/tests.html
// Abra no navegador para executar suite de testes

// Para adicionar novo teste:
export function testNovaFeature() {
  const result = novaFeature();
  return result === esperado;
}
```

### Testes CI/CD
```bash
# GitHub Actions rodará automaticamente
# Configuração em .github/workflows/
```

---

## Commits

### Formato
```
tipo: descrição curta

detalhes (opcional)
```

### Tipos
- `feat:` — Nova funcionalidade
- `fix:` — Correção de bug
- `docs:` — Documentação
- `style:` — Formatação (spaces, indentation)
- `refactor:` — Refatoração (sem mudança de comportamento)
- `test:` — Adição de testes
- `chore:` — Manutenção (build, deps)

### Exemplos
```bash
feat: adiciona busca prévia automatizada

- Implementa busca na base do INPI
- Adiciona análise de similaridade
- Renderiza resultados no dashboard

fix: corrige cálculo de desconto GRU

- Ajusta fórmula para 1% de desconto PIX
- Atualiza testes unitários
```

---

## Pull Requests

### Checklist
- [ ] Código segue padrões do projeto
- [ ] Testes unitários passam
- [ ] Documentação atualizada
- [ ] Commits atômicos e descritivos
- [ ] Sem código sensível (API keys, senhas)
- [ ] Funcionalidade testada localmente

### Descrição do PR
```markdown
## O que
Adiciona busca prévia automatizada

## Por que
Permite análise de similaridade antes de depositar marca

## Como
- Implementa módulo `search.js`
- Adiciona análise fonética, visual e conceitual
- Renderiza resultados no dashboard

## Screenshots
[Inserir screenshots se aplicável]

## Testes
- [x] Testes unitários passam
- [x] Testado localmente
```

---

## Reportando Bugs

### Template
```markdown
## Descriçao
Descreva o bug

## Passos para Reproduzir
1. Acesse [URL]
2. Clique em [botão]
3. Observe [comportamento inesperado]

## Comportamento Esperado
O que deveria acontecer

## Comportamento Real
O que está acontecendo

## Screenshots
[Inserir screenshots]

## Ambiente
- Navegador: [Chrome, Firefox, Safari]
- Versão: [120.0]
- OS: [Windows 10, macOS 14]
```

---

## Sugerindo Melhorias

### Template
```markdown
## Problema
Descreva o problema que a melhoria resolve

## Solução Sugerida
Descreva como gostaria que fosse

## Benefícios
- Benefício 1
- Benefício 2
- Benefício 3

## Referências
[Links úteis, inspirações]
```

---

## Código de Conduta

### Respeito
- Tratamento respeitoso entre contribuidores
- Feedback construtivo
- Discurso inclusivo

### Qualidade
- Código testado antes de submeter
- Documentação atualizada
- Commits significativos

### Segurança
- Nunca commitar secrets (API keys, senhas)
- Reportar vulnerabilidades via email
- Seguir princípios de segurança

---

## Reconhecimento

Contribuidores ativos serão reconhecidos em:
- README.md (lista de contribuidores)
- Site oficial (créditos)
- Versões do projeto (changelog)

---

## Perguntas Frequentes

### Posso usar o MarcaFlow comercialmente?
Sim, licença MIT permite uso comercial.

### Posso contribuir sem programar?
Sim, você pode:
- Reportar bugs
- Sugerir melhorias
- Melhorar documentação
- Testar funcionalidades

### Como reportar vulnerabilidades de segurança?
Envie email para: security@marcaflow.com

---

<div align="center">

**Obrigado por contribuir com o MarcaFlow! 🙏**

</div>
