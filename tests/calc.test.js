const test = require('node:test');
const assert = require('node:assert/strict');
const Calc = require('../src/calc.js');

const sum = (arr) => arr.reduce((a, b) => a + b, 0);

// Conta da foto (pedido de restaurante): subtotal R$ 424,00.
function receipt() {
  const item = (id, name, qty, price) => ({ id, name, qty, unitPrice: Calc.parseMoney(price), mode: 'units', units: {}, shared: [] });
  return [
    item('massa', 'Massa', 10, '25'),
    item('tapioca', 'Tapioca', 2, '12'),
    item('suco', 'Copo de suco', 3, '7'),
    item('coca1l', 'Coca 1L', 3, '12'),
    item('torre', 'Torre', 1, '50'),
    item('lata', 'Coca lata', 1, '7'),
    item('sobremesa', 'Sobremesa', 3, '12'),
  ];
}

test('parseMoney entende formatos brasileiros', () => {
  assert.equal(Calc.parseMoney('25'), 2500);
  assert.equal(Calc.parseMoney('25,5'), 2550);
  assert.equal(Calc.parseMoney('R$ 1.234,56'), 123456);
  assert.equal(Calc.parseMoney('7.90'), 790);
  assert.equal(Calc.parseMoney(''), 0);
});

test('allocate sempre fecha a soma exata', () => {
  assert.deepEqual(Calc.allocate(100, [1, 1, 1]), [34, 33, 33]);
  assert.equal(sum(Calc.allocate(46640, [1, 1, 1, 1, 1, 1, 1])), 46640);
  assert.deepEqual(Calc.allocate(10, [0, 0]), [5, 5]);
});

test('divisão igual da conta da foto com 10%', () => {
  const people = Array.from({ length: 4 }, (_, i) => ({ id: 'p' + i, name: 'P' + i, tipPct: null }));
  const r = Calc.compute({ people, items: receipt(), splitMode: 'equal', tip: { enabled: true, defaultPct: 10, custom: false } });
  assert.equal(r.subtotal, 42400);
  assert.equal(r.tipTotal, 4240);
  assert.equal(r.total, 46640);
  r.people.forEach((p) => {
    assert.equal(p.base, 10600);
    assert.equal(p.total, 11660);
  });
});

test('divisão igual com gorjeta individual', () => {
  const people = [
    { id: 'a', name: 'Ana', tipPct: null },
    { id: 'b', name: 'Bia', tipPct: 0 },
    { id: 'c', name: 'Caio', tipPct: 15 },
  ];
  const items = [{ id: 'x', name: 'X', qty: 1, unitPrice: 30000, mode: 'shared', shared: [] }];
  const r = Calc.compute({ people, items, splitMode: 'equal', tip: { enabled: true, defaultPct: 10, custom: true } });
  assert.deepEqual(r.people.map((p) => p.tip), [1000, 0, 1500]);
  assert.deepEqual(r.people.map((p) => p.total), [11000, 10000, 11500]);
  assert.equal(r.total, 32500);
});

test('sem gorjeta', () => {
  const people = [{ id: 'a', name: 'A' }, { id: 'b', name: 'B' }];
  const items = [{ id: 'x', name: 'X', qty: 1, unitPrice: 1001, mode: 'shared' }];
  const r = Calc.compute({ people, items, splitMode: 'equal', tip: { enabled: false, defaultPct: 10 } });
  assert.equal(r.tipTotal, 0);
  assert.equal(sum(r.people.map((p) => p.total)), 1001);
});

test('por consumo: unidades e itens compartilhados', () => {
  const people = [
    { id: 'a', name: 'Ana' },
    { id: 'b', name: 'Bia' },
  ];
  const items = [
    { id: 'm', name: 'Massa', qty: 3, unitPrice: 2500, mode: 'units', units: { a: 2, b: 1 } },
    { id: 't', name: 'Torre', qty: 1, unitPrice: 5000, mode: 'shared', shared: ['a', 'b'] },
    { id: 'l', name: 'Lata', qty: 1, unitPrice: 700, mode: 'shared', shared: ['b'] },
  ];
  const r = Calc.compute({ people, items, splitMode: 'consumption', tip: { enabled: true, defaultPct: 10, custom: false } });
  assert.equal(r.people[0].base, 5000 + 2500);
  assert.equal(r.people[1].base, 2500 + 2500 + 700);
  assert.equal(r.people[0].tip, 750);
  assert.equal(r.people[1].tip, 570);
  assert.equal(r.warnings.length, 0);
});

test('por consumo: unidades sem dono são divididas entre todos', () => {
  const people = [{ id: 'a', name: 'Ana' }, { id: 'b', name: 'Bia' }];
  const items = [{ id: 's', name: 'Sobremesa', qty: 3, unitPrice: 1200, mode: 'units', units: { a: 1 } }];
  const r = Calc.compute({ people, items, splitMode: 'consumption', tip: { enabled: false } });
  assert.equal(r.people[0].base, 1200 + 1200);
  assert.equal(r.people[1].base, 1200);
  assert.equal(r.warnings[0].type, 'unassigned');
});

test('por consumo: excesso de unidades rateia proporcionalmente e avisa', () => {
  const people = [{ id: 'a', name: 'Ana' }, { id: 'b', name: 'Bia' }];
  const items = [{ id: 's', name: 'Suco', qty: 2, unitPrice: 700, mode: 'units', units: { a: 3, b: 1 } }];
  const r = Calc.compute({ people, items, splitMode: 'consumption', tip: { enabled: false } });
  assert.equal(r.subtotal, 1400);
  assert.equal(sum(r.people.map((p) => p.base)), 1400);
  assert.equal(r.warnings[0].type, 'over');
});

test('por consumo: centavos fecham mesmo com divisão em 3', () => {
  const people = ['a', 'b', 'c'].map((id) => ({ id, name: id }));
  const items = [{ id: 't', name: 'Torre', qty: 1, unitPrice: 5000, mode: 'shared', shared: [] }];
  const r = Calc.compute({ people, items, splitMode: 'consumption', tip: { enabled: false } });
  assert.deepEqual(r.people.map((p) => p.base), [1667, 1667, 1666]);
});
