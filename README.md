# MarcaFlow MVP

Painel local para organizar clientes, processos de marcas, prazos e documentos relacionados ao INPI.

## Abrir

Abra `public/index.html` diretamente no navegador:

```text
file:///Users/alexandregomesdacosta/Documents/Projetos_DEV/MarcaFlow/public/index.html
```

Nao e necessario instalar dependencias ou iniciar servidor.

## Funcionalidades atuais

- dashboard com metricas e alertas;
- carteira de processos com busca e filtros;
- cadastro de processos;
- cadastro de clientes;
- agenda de prazos internos e legais;
- central de documentos;
- visualizacao dos detalhes de cada processo;
- exportacao de backup em JSON;
- persistencia local no navegador por `localStorage`.
- monitor RPI com importacao do XML simplificado de marcas;
- cruzamento dos despachos com os processos cadastrados;
- atualizacao automatica de status, proxima acao e prazos sugeridos;
- historico de importacoes e movimentacoes encontradas.

## Monitor semanal da RPI

Baixe e extraia o XML de marcas mais recente:

```bash
cd "/Users/alexandregomesdacosta/Documents/Projetos_DEV/MarcaFlow"
python3 baixar_rpi.py
```

Depois, no app:

1. acesse `Monitor RPI`;
2. clique em `Importar XML`;
3. selecione o arquivo em `importacoes/RMxxxx.xml`;
4. confira os despachos encontrados no PDF oficial da secao V de Marcas.

## Monitoramento automatico

Na tela `Monitor RPI`, use `Exportar carteira` e substitua o arquivo:

```text
carteira-monitorada.json
```

Para testar a rotina completa manualmente:

```bash
cd "/Users/alexandregomesdacosta/Documents/Projetos_DEV/MarcaFlow"
./rodar_monitoramento.sh
```

Ela baixa a RPI mais recente, cruza os processos em streaming, gera relatorios em `relatorios/` e exibe uma notificacao local no macOS.

Para instalar o agendamento semanal nativo do macOS:

```bash
cd "/Users/alexandregomesdacosta/Documents/Projetos_DEV/MarcaFlow"
./instalar_agendamento_macos.sh
```

O agendamento roda toda terca-feira as 11:00 no horario local do Mac.

Para remover o agendamento:

```bash
cd "/Users/alexandregomesdacosta/Documents/Projetos_DEV/MarcaFlow"
./remover_agendamento_macos.sh
```

O downloader conserva somente as quatro edicoes mais recentes para evitar crescimento continuo da pasta de importacoes.

Para testar sem baixar a revista completa, importe:

```text
amostras/RM-DEMO.xml
```

## Dados demonstrativos

Na primeira abertura, o app carrega dados ficticios para demonstrar os fluxos. Cadastros novos sao salvos no navegador utilizado.

## Proxima etapa

Substitua a carteira demonstrativa pela carteira real:

1. cadastre os processos reais no painel;
2. acesse `Monitor RPI`;
3. clique em `Exportar carteira`;
4. substitua `carteira-monitorada.json` pelo arquivo exportado.

Depois disso, a rotina semanal instalada passa a acompanhar os processos reais. Uma evolucao futura sera sincronizar automaticamente o relatorio gerado pelo monitor com o painel e enviar alertas por e-mail ou WhatsApp.

O XML e usado para triagem. A publicacao oficial deve ser conferida no PDF da RPI.

## Infraestrutura

- Frontend estatico: Cloudflare Pages.
- Dados compartilhados: Firebase Firestore.
- Login: Firebase Authentication por e-mail e senha.
- Fallback: `localStorage` no navegador quando o usuario nao estiver autenticado.
- Versionamento: Git local.

Aplicacao publicada:

```text
https://marcaflow.pages.dev
```

Console Firebase:

```text
https://console.firebase.google.com/project/marcaflow-inpi/overview
```

O provedor `E-mail/senha` ja esta habilitado em:

```text
https://console.firebase.google.com/project/marcaflow-inpi/authentication/providers
```

Depois crie pelo menos um usuario autorizado na aba `Users`.

## Deploy Cloudflare Pages

```bash
cd "/Users/alexandregomesdacosta/Documents/Projetos_DEV/MarcaFlow"
npx wrangler pages deploy public --project-name marcaflow
```
