# 🏢 MarcaFlow — Gestão de Marcas INPI

**Ferramenta completa para gestão de processos de marcas no Instituto Nacional da Propriedade Industrial (INPI)**

[![Deploy](https://img.shields.io/badge/deploy-Cloudflare%20Pages-green)](https://marcaflow.pages.dev)
[![License](https://img.shields.io/badge/license-MIT-blue)](LICENSE)
[![Version](https://img.shields.io/badge/version-2.0.0-orange)](https://github.com/seu-usuario/marcaflow/releases)

---

## 📋 Sumário

- [Funcionalidades](#-funcionalidades)
- [Demo](#-demo)
- [Instalação](#-instalação)
- [Uso](#-uso)
- [Arquitetura](#-arquitetura)
- [Segurança](#-segurança)
- [Contribuição](#-contribuição)
- [Licença](#-licença)

---

## ✨ Funcionalidades

### 🤖 Automação Core
- ✅ **Busca Prévia Automatizada** — Pesquisa na base do INPI com análise de similaridade
- ✅ **Alertas Proativos** — Notificações push, Google Calendar, exportação de prazos
- ✅ **GRU Automatizada** — Cálculo de taxas, código de atividade, pré-preenchimento

### 🧠 Inteligência
- ✅ **Análise de Anterioridade** — Similaridade fonética, visual e conceitual
- ✅ **Petições Template** — 6 tipos (manifestação, recurso, exigência, cessão)
- ✅ **Agent INPI** — Assistente com RAG + DeepSeek

### 🌐 Ecossistema
- ✅ **Dashboard do Cliente** — Portal público com token de acesso
- ✅ **Integração e-Marcas** — Sincronização full/incremental
- ✅ **Faturamento** — Controle de honorários, faturas, GRUs
- ✅ **Relatórios** — Geração HTML/PDF customizáveis

### 🔒 Segurança
- ✅ CSP Headers, X-Frame-Options, X-Content-Type-Options
- ✅ XML sanitization (XXE/XXS protection)
- ✅ Rate limiting (20 req/min)
- ✅ Audit logging no Firebase
- ✅ Firestore rules escopadas por usuário

### 📱 PWA
- ✅ Installable (add to home screen)
- ✅ Offline support
- ✅ Background sync
- ✅ Service worker com cache strategy

---

## 🎮 Demo

**Acesse a versão online:** https://marcaflow.pages.dev

**Funcionalidades ativas:**
- Visão geral da carteira
- Busca prévia automatizada
- Alertas de prazos
- Geração de GRU
- Análise de anterioridade
- Petições template
- Dashboard do cliente
- Integração e-Marcas
- Faturamento
- Relatórios

---

## 🚀 Instalação

### Pré-requisitos
- Node.js 18+
- npm ou yarn
- Git

### Clonar o repositório
```bash
git clone https://github.com/seu-usuario/marcaflow.git
cd marcaflow
```

### Instalar dependências
```bash
npm install
```

### Configurar Firebase (opcional)
1. Crie um projeto no [Firebase Console](https://console.firebase.google.com)
2. Adicione app web e copie a configuração
3. Atualize `public/firebase-config.js`

### Configurar Cloudflare (opcional)
```bash
npm install -g wrangler
wrangler login
```

---

## 📖 Uso

### Modo Local (sem Firebase)
```bash
# Abrir diretamente no navegador
open public/index.html

# Ou usar servidor local
npx serve public
```

### Modo Cloud (com Firebase)
```bash
# Login Firebase
firebase login

# Deploy Firestore rules
firebase deploy --only firestore:rules

# Deploy Cloudflare
wrangler pages deploy public/
```

### Testes
```bash
# Abrir suite de testes
open public/tests.html
```

---

## 🏗️ Arquitetura

### Estrutura de Módulos
```
public/
├── data.js          # Camada de dados (load/save/seed)
├── business.js      # Lógica de negócio (descontos, classes, risco)
├── views.js         # Renderização de componentes UI
├── agent.js         # Agente INPI, RAG local, respostas
├── search.js        # Busca automatizada INPI
├── alerts.js        # Alertas proativos (push, calendar)
├── gru.js           # Geração GRU (cálculo, pré-preenchimento)
├── antteriority.js  # Análise de anterioridade
├── petitions.js     # Petições template
├── client-dashboard.js      # Dashboard cliente
├── emarcas.js       # Integração e-Marcas
├── financial.js     # Faturamento + honorários
├── reports.js       # Relatórios HTML/PDF
├── utils.js         # Utilitários + sanitização
├── main.js          # Coordenação e event binding
└── service-worker.js # PWA support
```

### Fluxo de Dados
```
User Input → main.js → [data | business | views] → Render
                                    ↓
                            Firebase Cloud (optional)
                                    ↓
                            Audit Logs
```

---

## 🔐 Segurança

### Headers de Segurança
- `Content-Security-Policy` — Previene XSS
- `X-Frame-Options: DENY` — Previene clickjacking
- `X-Content-Type-Options: nosniff` — Previene MIME sniffing

### Sanitização
- XML: Bloqueia `<!ENTITY>`, `<!DOCTYPE>`, `<script>`, `javascript:`
- JSON: Validação de tamanho (5MB), max 5000 registros
- Agent: Anti-prompt injection, remoção de aspas/backticks

### Rate Limiting
- Cloudflare Function: 20 req/min por UID Firebase
- Firebase: Audit logging de todas as operações

---

## 🤝 Contribuição

### Reportar Bugs
```bash
github.com/seu-usuario/marcaflow/issues
```

### Pull Requests
1. Fork o repositório
2. Crie branch (`git checkout -b feature/nova-feature`)
3. Commit (`git commit -m 'feat: adiciona nova feature'`)
4. Push (`git push origin feature/nova-feature`)
5. Abra Pull Request

### Diretrizes
- Commits atômicos e descritivos
- Seguir padrões do projeto (ES6+, módulos)
- Adicionar testes para novas funcionalidades
- Atualizar documentação

---

## 📄 Licença

MIT License — veja [LICENSE](LICENSE) para detalhes.

---

## 🙏 Agradecimentos

- **INPI** — Por fornecer a base de dados de marcas
- **Cloudflare** — Por hosting e edge functions
- **Firebase** — Por backend as a service
- **DeepSeek** — Por IA para agente INPI

---

## 📞 Contato

- **Website:** https://marcaflow.pages.dev
- **Email:** contato@marcaflow.com
- **LinkedIn:** /in/marcaflow

---

<div align="center">

**Feito com ❤️ para profissionais de Propriedade Industrial**

</div>
