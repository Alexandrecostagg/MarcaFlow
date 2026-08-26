// tests/run.js — Script de teste Node.js para CI/CD
// Testa a API real dos módulos ES atuais (store.js, business.js, utils.js).

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Mock do window e localStorage para Node.js
global.window = {};
global.localStorage = {
  store: {},
  getItem(key) { return this.store[key] || null; },
  setItem(key, value) { this.store[key] = value; },
  removeItem(key) { delete this.store[key]; },
  get length() { return Object.keys(this.store).length; }
};

(async () => {
  const store = await import('../public/store.js');
  const business = await import('../public/business.js');
  const utils = await import('../public/utils.js');

  // Testes
  let passed = 0;
  let failed = 0;
  const results = [];

  function test(name, fn) {
    try {
      fn();
      passed++;
      results.push({ name, status: 'passed' });
      console.log(`✓ ${name}`);
    } catch (error) {
      failed++;
      results.push({ name, status: 'failed', error: error.message });
      console.log(`✗ ${name}: ${error.message}`);
    }
  }

  // ===== TESTES: DATA LAYER (store.js) =====

  test('load retorna workspace com coleções esperadas', () => {
    const data = store.load();
    for (const key of ['clients', 'processes', 'documents', 'movements', 'imports', 'diagnoses', 'availabilityChecks']) {
      if (!Array.isArray(data[key])) throw new Error(`Falta coleção ${key}`);
    }
  });

  test('ensureCollections normaliza processos', () => {
    const data = store.data;
    data.processes.push({ id: 'x', status: 'Registrado' });
    store.ensureCollections();
    const item = data.processes.find(p => p.id === 'x');
    if (item.flowStage !== 'Registro') throw new Error(`Etapa esperada "Registro", obtida "${item.flowStage}"`);
    if (!('nextAction' in item)) throw new Error('nextAction não inicializado');
  });

  test('save persiste no localStorage', () => {
    store.data.clients.push({ id: 'c-save', name: 'Teste' });
    store.save();
    const reloaded = store.load();
    if (!reloaded.clients.some(c => c.id === 'c-save')) throw new Error('Cliente não persistiu');
  });

  test('client retorna fallback para id inexistente', () => {
    const result = store.client('nao-existe');
    if (!result || typeof result.name !== 'string') throw new Error('Fallback ausente');
  });

  test('processById encontra processo existente', () => {
    const target = store.data.processes[0];
    if (!target) return;
    if (store.processById(target.id) !== target) throw new Error('processById não encontrou o processo');
  });

  test('setData substitui o workspace preservando a referência', () => {
    const before = store.data;
    store.setData({ clients: [], processes: [{ id: 'p1', brand: 'X' }], documents: [], movements: [], imports: [] });
    if (before !== store.data) throw new Error('Referência exportada mudou');
    if (store.data.processes[0].brand !== 'X') throw new Error('Coleção não substituída');
  });

  // ===== TESTES: BUSINESS LOGIC (business.js) =====

  test('formatDate formata data pt-BR', () => {
    const result = business.formatDate('2024-12-31');
    if (!result.includes('31')) throw new Error(`Esperava dia 31, obtido ${result}`);
    if (!result.includes('2024')) throw new Error(`Esperava 2024, obtido ${result}`);
  });

  test('formatDate retorna "Sem prazo" para vazio', () => {
    if (business.formatDate('') !== 'Sem prazo') throw new Error('Fallback de data inválido');
  });

  test('processRisk marca atrasado como overdue', () => {
    const result = business.processRisk({ internalDeadline: '2020-01-01' });
    if (result !== 'overdue') throw new Error(`Esperava overdue, obtido ${result}`);
  });

  test('processRisk marca prazo distante como ok', () => {
    const result = business.processRisk({ internalDeadline: '2099-01-01' });
    if (result !== 'ok') throw new Error(`Esperava ok, obtido ${result}`);
  });

  test('formatMoney formata BRL', () => {
    const result = business.formatMoney(1000);
    if (!result.includes('R$')) throw new Error(`Faltou símbolo R$: ${result}`);
    if (!result.includes('1.000,00')) throw new Error(`Esperava 1.000,00, obtido ${result}`);
  });

  test('parseClasses normaliza lista', () => {
    const result = business.parseClasses('25, 35 ,9');
    if (JSON.stringify(result) !== JSON.stringify(['25', '35', '9'])) throw new Error(`Esperava ["25","35","9"], obtido ${JSON.stringify(result)}`);
  });

  test('filterProcesses retorna array', () => {
    if (!Array.isArray(business.filterProcesses())) throw new Error('Esperava array');
  });

  test('classByCode resolve classe válida', () => {
    if (!business.classByCode('9')) throw new Error('Classe 9 deveria existir');
  });

  test('classByCode retorna vazio para classe inválida', () => {
    if (business.classByCode('99') != null) throw new Error('Classe 99 não deveria existir');
  });

  test('calculateEstimate retorna totais numéricos', () => {
    const result = business.calculateEstimate(2, 'preApproved', {});
    if (typeof result.total !== 'number' || result.total <= 0) throw new Error('Total inválido');
    if (typeof result.perClass !== 'number' || result.perClass <= 0) throw new Error('Per-class inválido');
  });

  test('availabilityRisk classifica candidato', () => {
    const target = { brand: 'AURORA', classes: ['25', '35'] };
    const candidate = { brand: 'AURORA MODA', classes: ['25'], status: 'Registro em vigor' };
    const result = business.availabilityRisk(target, candidate);
    if (!['Alto', 'Médio', 'Baixo'].includes(result)) throw new Error(`Risco inválido: ${result}`);
  });

  // ===== TESTES: UTILS (utils.js) =====

  test('escapeHtml escapa tags', () => {
    const result = utils.escapeHtml('<script>alert(1)</script>');
    if (result.includes('<script>')) throw new Error('HTML não escapado');
  });

  test('sanitizeXmlText bloqueia script', () => {
    let threw = false;
    try { utils.sanitizeXmlText('<script>alert(1)</script>'); } catch (_) { threw = true; }
    if (!threw) throw new Error('XML perigoso não bloqueado');
  });

  test('sanitizeXmlText aceita XML seguro', () => {
    const safe = '<revista><despachos></despachos></revista>';
    if (utils.sanitizeXmlText(safe) !== safe) throw new Error('XML seguro foi alterado');
  });

  test('validateJsonPayload rejeita JSON inválido', () => {
    let threw = false;
    try { utils.validateJsonPayload('{not json'); } catch (_) { threw = true; }
    if (!threw) throw new Error('JSON inválido não rejeitado');
  });

  test('validateJsonPayload rejeita mais de 5000 registros', () => {
    const big = JSON.stringify({ processes: Array.from({ length: 5001 }, (_, i) => ({ id: String(i) })) });
    let threw = false;
    try { utils.validateJsonPayload(big); } catch (_) { threw = true; }
    if (!threw) throw new Error('Payload grande não rejeitado');
  });

  test('sanitizeAgentInput remove script', () => {
    const result = utils.sanitizeAgentInput('oi <script>alert(1)</script> mundo');
    if (result.includes('<script>') || result.includes('</script>')) throw new Error('Input não sanitizado');
  });

  // ===== RESULTADO FINAL =====

  console.log('\n' + '='.repeat(50));
  console.log(`Total: ${passed + failed} | Passed: ${passed} | Failed: ${failed}`);
  console.log('='.repeat(50));

  // Salvar resultados para CI/CD
  const resultDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'test-results');
  if (!fs.existsSync(resultDir)) {
    fs.mkdirSync(resultDir);
  }

  fs.writeFileSync(
    path.join(resultDir, 'test-results.json'),
    JSON.stringify({ passed, failed, total: passed + failed, results }, null, 2)
  );

  if (failed > 0) {
    console.log('\n❌ Tests failed!\n');
    process.exit(1);
  } else {
    console.log('\n✅ All tests passed!\n');
    process.exit(0);
  }
})();
