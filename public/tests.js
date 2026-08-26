// public/tests.js — Test Suite Automatizada MarcaFlow

const tests = [];
let passed = 0;
let failed = 0;

function test(name, fn) {
  tests.push({ name, fn });
}

function expect(value) {
  return {
    toBe(expected) {
      if (value !== expected) throw new Error(`Expected ${expected}, got ${value}`);
    },
    toBeGreaterThan(min) {
      if (value <= min) throw new Error(`Expected > ${min}, got ${value}`);
    },
    toBeLessThan(max) {
      if (value >= max) throw new Error(`Expected < ${max}, got ${value}`);
    },
    toContain(item) {
      if (!Array.isArray(value) || !value.includes(item)) throw new Error(`Expected array to contain ${item}`);
    },
    toBeTruthy() {
      if (!value) throw new Error(`Expected truthy, got ${value}`);
    },
    toBeFalsy() {
      if (value) throw new Error(`Expected falsy, got ${value}`);
    },
    toBeNull() {
      if (value !== null) throw new Error(`Expected null, got ${value}`);
    }
  };
}

// ===== TESTES: DATA LAYER =====

test('loadBrands returns array', () => {
  const result = loadBrands();
  expect(result).toBeInstanceOf(Array);
});

test('loadBrands has correct structure', () => {
  const brands = loadBrands();
  if (brands.length > 0) {
    const brand = brands[0];
    expect(brand).toHaveProperty('name');
    expect(brand).toHaveProperty('classes');
    expect(brand).toHaveProperty('status');
    expect(brand).toHaveProperty('depositDate');
  }
});

test('saveBrand stores correctly', () => {
  const brand = {
    id: 'test-' + Date.now(),
    name: 'TestBrand',
    classes: ['9', '42'],
    status: 'pending',
    depositDate: '2024-01-01',
    createdAt: new Date().toISOString()
  };
  saveBrand(brand);
  const brands = loadBrands();
  expect(brands.some(b => b.id === brand.id)).toBeTruthy();
});

test('deleteBrand removes correctly', () => {
  const brand = {
    id: 'delete-' + Date.now(),
    name: 'DeleteTest',
    classes: ['9'],
    status: 'pending',
    depositDate: '2024-01-01',
    createdAt: new Date().toISOString()
  };
  saveBrand(brand);
  deleteBrand(brand.id);
  const brands = loadBrands();
  expect(brands.some(b => b.id === brand.id)).toBeFalsy();
});

test('updateBrand modifies correctly', () => {
  const brand = {
    id: 'update-' + Date.now(),
    name: 'UpdateTest',
    classes: ['9'],
    status: 'pending',
    depositDate: '2024-01-01',
    createdAt: new Date().toISOString()
  };
  saveBrand(brand);
  brand.status = 'registered';
  updateBrand(brand);
  const brands = loadBrands();
  const updated = brands.find(b => b.id === brand.id);
  expect(updated.status).toBe('registered');
});

// ===== TESTES: BUSINESS LOGIC =====

test('calculateDiscount applies 1% PIX discount', () => {
  const result = calculateDiscount(1000);
  expect(result).toBe(10);
});

test('calculateDiscount returns 0 for non-PIX', () => {
  const result = calculateDiscount(1000, false);
  expect(result).toBe(0);
});

test('getClassFee returns correct fee', () => {
  const result = getClassFee('9');
  expect(result).toBeGreaterThan(0);
});

test('getClassFee returns null for invalid class', () => {
  const result = getClassFee('99');
  expect(result).toBeNull();
});

test('getActivityCode returns valid code', () => {
  const result = getActivityCode('register');
  expect(result).toBeGreaterThan(0);
  expect(result).toBeLessThan(13);
});

test('getActivityCode returns null for invalid type', () => {
  const result = getActivityCode('invalid');
  expect(result).toBeNull();
});

// ===== TESTES: SEARCH =====

test('searchBrands returns array', () => {
  const results = searchBrands('test');
  expect(results).toBeInstanceOf(Array);
});

test('searchBrands filters correctly', () => {
  saveBrand({ id: 'search1', name: 'TestBrand', classes: ['9'], status: 'pending', depositDate: '2024-01-01', createdAt: new Date().toISOString() });
  const results = searchBrands('Test');
  expect(results.length).toBeGreaterThan(0);
});

test('searchBrands case insensitive', () => {
  const results = searchBrands('TEST');
  expect(results.length).toBeGreaterThan(0);
});

// ===== TESTES: ALERTS =====

test('addAlert creates alert', () => {
  const alert = {
    id: 'alert-' + Date.now(),
    brandId: 'test-brand',
    type: 'vigencia',
    date: '2024-12-31',
    channel: 'push',
    createdAt: new Date().toISOString()
  };
  addAlert(alert);
  const alerts = loadAlerts();
  expect(alerts.some(a => a.id === alert.id)).toBeTruthy();
});

test('deleteAlert removes alert', () => {
  const alert = {
    id: 'delete-alert-' + Date.now(),
    brandId: 'test-brand',
    type: 'vigencia',
    date: '2024-12-31',
    channel: 'push',
    createdAt: new Date().toISOString()
  };
  addAlert(alert);
  deleteAlert(alert.id);
  const alerts = loadAlerts();
  expect(alerts.some(a => a.id === alert.id)).toBeFalsy();
});

// ===== TESTES: GRU =====

test('generateGRU returns valid structure', () => {
  const gru = generateGRU({
    brandName: 'TestBrand',
    activityCode: 1,
    holderName: 'Test Holder',
    holderDoc: '12345678900'
  });
  expect(gru).toHaveProperty('code');
  expect(gru).toHaveProperty('value');
  expect(gru).toHaveProperty('barcode');
});

test('generateGRU barcode has correct format', () => {
  const gru = generateGRU({
    brandName: 'TestBrand',
    activityCode: 1,
    holderName: 'Test Holder',
    holderDoc: '12345678900'
  });
  expect(gru.barcode.length).toBe(44);
});

// ===== TESTES: ANTERIORITY =====

test('analyzeAnteriority returns results', () => {
  const results = analyzeAnteriority('TestBrand', ['9', '42']);
  expect(results).toBeInstanceOf(Array);
});

test('analyzeAnteriority has risk percentage', () => {
  const results = analyzeAnteriority('TestBrand', ['9', '42']);
  if (results.length > 0) {
    expect(results[0]).toHaveProperty('risk');
    expect(results[0].risk).toBeGreaterThanOrEqual(0);
    expect(results[0].risk).toBeLessThanOrEqual(100);
  }
});

// ===== TESTES: REPORTS =====

test('generateReport creates HTML', () => {
  const html = generateReport('overview', { brands: [], alerts: [] });
  expect(html).toContain('<html');
  expect(html).toContain('</html>');
});

test('generateReport PDF is valid', () => {
  const pdf = generateReport('overview', { brands: [], alerts: [] }, 'pdf');
  expect(pdf).toBeInstanceOf(ArrayBuffer);
});

// ===== TESTES: UTILS =====

test('sanitizeString removes XSS', () => {
  const result = sanitizeString('<script>alert("xss")</script>');
  expect(result).not.toContain('<script>');
});

test('sanitizeString preserves safe content', () => {
  const result = sanitizeString('Hello World');
  expect(result).toBe('Hello World');
});

test('formatDate formats correctly', () => {
  const result = formatDate('2024-12-31');
  expect(result).toBe('31/12/2024');
});

test('formatCurrency formats correctly', () => {
  const result = formatCurrency(1000);
  expect(result).toBe('R$ 1.000,00');
});

// ===== EXECUTION =====

async function runTests() {
  const results = [];
  
  for (const test of tests) {
    try {
      test.fn();
      passed++;
      results.push({ name: test.name, status: 'passed' });
    } catch (error) {
      failed++;
      results.push({ name: test.name, status: 'failed', error: error.message });
    }
  }
  
  return { passed, failed, results };
}

export { tests, runTests, passed, failed };
