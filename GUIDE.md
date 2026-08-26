# 🎓 Guia de Uso do MarcaFlow

## Visão Geral

O MarcaFlow é uma ferramenta completa para gestão de marcas no INPI. Este guia cobre os principais fluxos de uso.

---

## 🚀 Primeiros Passos

### 1. Acessar o Sistema
```
URL: https://marcaflow.pages.dev
```

### 2. Visão Geral (Home)
Ao abrir, você verá:
- **Carreira de Marcas** — Todas as marcas cadastradas
- **Prazos Críticos** — Alertas de prazos vencendo
- **GRUs Pendentes** — Pagamentos a realizar
- **Estatísticas** — Status geral da carteira

---

## 📋 Gerenciando Marcas

### Adicionar Nova Marca
1. Clique em **"Adicionar Marca"** (botão laranja)
2. Preencha:
   - **Nome da marca**
   - **Classes de Nice** (selecione 1+ classes)
   - **Titular** (PF ou PJ)
   - **Data de depósito**
   - **Número do processo** (se já existente)
3. Clique em **"Salvar"**

### Editar Marca
1. Clique no **lápis** na linha da marca
2. Edite os campos desejados
3. Clique em **"Salvar"**

### Excluir Marca
1. Clique no **lixeira** na linha da marca
2. Confirme a exclusão

---

## 🔍 Busca Prévia Automatizada

### Como Usar
1. Na **Barra de Busca Global** (topo), digite o nome da marca
2. Pressione **Enter** ou clique no **lupa**
3. Aguarde a análise (3-5 segundos)

### Resultados
- **Similaridades fonéticas** — Marcas com sons parecidos
- **Similaridades visuais** — Marcas com grafias parecidas
- **Similaridades conceituais** — Marcas com significados similares
- **Risco estimado** — % de chance de conflito

### Exemplo
```
Busca: "Natura"
Classes: 3, 5, 44

Resultados:
- NATURA (classe 3) — Risco: 85%
- NATTURA (classe 3) — Risco: 70%
- NATTAR (classe 5) — Risco: 60%
```

---

## ⚠️ Alertas de Prazos

### Tipos de Alertas
| Tipo | Descrição | Urgência |
|------|-----------|----------|
| **Vigência** | Renovação de marca | Alta |
| **Petição** | Resposta a exigência | Alta |
| **GRU** | Pagamento de taxa | Média |
| **RPI** | Publicação em revista | Baixa |

### Configurando Alertas
1. Acesse **"Alertas Proativos"** no menu
2. Selecione a marca
3. Ative os canais:
   - [x] Notificações push
   - [x] Google Calendar
   - [x] Exportação de prazos
4. Configure dias de antecedência

---

## 💰 Geração de GRU

### Fluxo Completo
1. Acesse **"Geração de GRU"**
2. Selecione a marca
3. Selecione o tipo de serviço:
   - **Registro de marca**
   - **Renovação**
   - **Petição**
   - **Cessão**
4. Preencha:
   - **Código de atividade**
   - **Dados do titular**
5. Clique em **"Gerar GRU"**
6. **Baixe o PDF** ou **copie o código de barras**

### Cálculo Automático
O sistema calcula automaticamente:
- Valor da taxa (R$)
- Código de atividade (01-12)
- Desconto para pagamento via PIX (1%)

---

## 🧠 Análise de Anterioridade

### Como Funciona
1. Acesse **"Análise de Anterioridade"**
2. Digite o nome da marca e classes
3. O sistema analisa:
   - **Similaridade fonética** (sons)
   - **Similaridade visual** (grafia)
   - **Similaridade conceitual** (significado)
4. Gera relatório com:
   - Marcas semelhantes
   - Nível de risco
   - Recomendação

### Exemplo de Relatório
```
Marca: "TechFlow"
Classes: 9, 42

Risco Total: 78% (ALTO)

Marcas conflitantes:
- TECHFLOW (classe 9) — Similaridade: 95%
- TECH FLOW (classe 42) — Similaridade: 80%
- TECHFLOWER (classe 9) — Similaridade: 65%

Recomendação: Alterar nome antes de depositar
```

---

## 📄 Petições Template

### Tipos de Petições
| Tipo | Quando usar |
|------|-------------|
| **Manifestação** | Responder exigência |
| **Recurso** | Recorrer decisão negativa |
| **Exigência** | Responder pedido de emenda |
| **Cessão** | Transferir marca |
| **Licença** | Autorizar uso |
| **Alteração** | Mudar dados |

### Como Usar
1. Acesse **"Petições Template"**
2. Selecione o tipo
3. Preencha os dados da marca
4. Clique em **"Gerar Petição"**
5. **Baixe o PDF** para assinatura

---

## 🌐 Dashboard do Cliente

### Acesso
1. No menu, clique em **"Dashboard Cliente"**
2. Insira o **token de acesso** (fornecido pelo advogado)
3. O cliente vê:
   - Status do processo
   - Prazos próximos
   - Documentos disponíveis
   - Histórico de atos

### Configuração
1. No menu principal, selecione a marca
2. Clique em **"Compartilhar"**
3. Gere o token
4. Envie ao cliente via email/WhatsApp

---

## 📊 Relatórios

### Tipos de Relatórios
| Relatório | Conteúdo |
|-----------|----------|
| **Visão Geral** | Resumo da carteira |
| **Prazos** | Todos os prazos futuros |
| **Faturamento** | Honorários e GRUs |
| **Marcas** | Status de todas as marcas |
| **Anterioridade** | Análises de risco |

### Como Gerar
1. Acesse **"Relatórios"**
2. Selecione o tipo
3. Configure período (opcional)
4. Clique em **"Gerar"**
5. **Baixe HTML ou PDF**

---

## 💡 Dicas e Boas Práticas

### Organização
- ✅ Use **classes de Nice** corretamente
- ✅ Mantenha **documentação atualizada**
- ✅ Configure **alertas de prazos**
- ✅ Faça **backup periódico**

### Busca Prévia
- ✅ Sempre faça busca prévia antes de depositar
- ✅ Analise **similaridades fonéticas e visuais**
- ✅ Considere **classes correlatas**

### GRU
- ✅ Pague em até **15 dias** (vencimento)
- ✅ Guarde **comprovante de pagamento**
- ✅ Atualize **número do protocolo** após pagamento

### Alertas
- ✅ Configure alertas com **30 dias de antecedência**
- ✅ Use **Google Calendar** para sincronização
- ✅ Ative **notificações push**

---

## ❓ Troubleshooting

### Problema: Busca não retorna resultados
**Solução:** Verifique conexão com internet. A busca é simulada localmente.

### Problema: GRU não é gerada
**Solução:** Verifique se todos os campos obrigatórios estão preenchidos.

### Problema: Alertas não aparecem
**Solução:** Ative notificações push nas configurações do navegador.

### Problema: Dashboard cliente não abre
**Solução:** Verifique se o token de acesso está correto.

---

## 📞 Suporte

- **Email:** suporte@marcaflow.com
- **WhatsApp:** +55 (11) 99999-9999
- **Horário:** Seg-Sex, 9h-18h

---

<div align="center">

**MarcaFlow — Simplificando a gestão de marcas**

</div>
