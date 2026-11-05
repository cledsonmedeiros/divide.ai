const test = require('node:test');
const assert = require('node:assert/strict');
const Calc = require('../src/calc.js');
const ShareImage = require('../src/share-image.js');

const BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const money = (cents) => BRL.format((cents || 0) / 100);
// Intl usa espaço não separável entre "R$" e o número.
const plain = (s) => s.replace(/ /g, ' ');

function state(tipEnabled) {
  return {
    people: [
      { id: 'a', name: 'Ana', tipPct: null },
      { id: 'b', name: 'Bruno', tipPct: 0 },
    ],
    items: [{ id: 'i', name: 'Massa', qty: 2, unitPrice: 5000, mode: 'shared', shared: [], units: {} }],
    splitMode: 'equal',
    tip: { enabled: tipEnabled, defaultPct: 10, custom: true },
  };
}

function model(st) {
  return ShareImage.buildModel({ state: st, result: Calc.compute(st), money, fmtQty: Calc.fmtQty, date: '05/11/2026' });
}

test('imagem: uma linha por pessoa, com total e detalhe da gorjeta', () => {
  const m = model(state(true));
  assert.equal(m.subtitle, 'Divisão da conta · igualmente · 05/11/2026');
  assert.deepEqual(m.rows.map((r) => r.name), ['Ana', 'Bruno']);
  assert.equal(plain(m.rows[0].total), 'R$ 55,00');
  assert.equal(plain(m.rows[0].detail), 'Consumo R$ 50,00 · Gorjeta 10% R$ 5,00');
  assert.equal(plain(m.rows[1].detail), 'Consumo R$ 50,00 · Gorjeta 0% R$ 0,00');
});

test('imagem: totais batem com Calc.compute e o Total é o destaque', () => {
  const m = model(state(true));
  assert.deepEqual(m.totals.map((t) => [t.label, plain(t.value), !!t.strong]), [
    ['Subtotal', 'R$ 100,00', false],
    ['Gorjeta', 'R$ 5,00', false],
    ['Total', 'R$ 105,00', true],
  ]);
  assert.equal(m.footer, 'divideai.ctech.foo');
});

test('imagem: sem gorjeta, não mostra a linha nem o detalhe da gorjeta', () => {
  const m = model(state(false));
  assert.deepEqual(m.totals.map((t) => t.label), ['Subtotal', 'Total']);
  assert.equal(plain(m.rows[0].detail), 'Consumo R$ 50,00');
});

test('imagem: altura cresce com o número de pessoas', () => {
  const st = state(true);
  const h2 = ShareImage.height(model(st));
  st.people.push({ id: 'c', name: 'Carla', tipPct: null });
  assert.equal(ShareImage.height(model(st)) - h2, 64);
});
