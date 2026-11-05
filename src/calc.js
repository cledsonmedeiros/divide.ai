/*
 * divide.ai — núcleo de cálculo (sem dependências de DOM).
 * Todos os valores monetários são tratados em CENTAVOS (inteiros) para evitar
 * erros de ponto flutuante. Funciona no navegador (window.Calc) e no Node
 * (module.exports) para os testes.
 */
(function (root) {
  'use strict';

  /**
   * Distribui `total` centavos proporcionalmente aos `weights`, garantindo que
   * a soma das partes seja exatamente igual ao total (método do maior resto).
   * Se todos os pesos forem zero, divide igualmente.
   */
  function allocate(total, weights) {
    const n = weights.length;
    if (n === 0) return [];
    let w = weights.map((x) => (Number.isFinite(x) && x > 0 ? x : 0));
    let sum = w.reduce((a, b) => a + b, 0);
    if (sum <= 0) {
      w = new Array(n).fill(1);
      sum = n;
    }
    const exact = w.map((x) => (total * x) / sum);
    const parts = exact.map((x) => Math.floor(x));
    let rest = total - parts.reduce((a, b) => a + b, 0);
    const order = exact
      .map((x, i) => ({ i, frac: x - Math.floor(x) }))
      .sort((a, b) => b.frac - a.frac || a.i - b.i);
    for (let k = 0; rest > 0; k = (k + 1) % n, rest--) parts[order[k].i] += 1;
    return parts;
  }

  /** "1.234,56" | "25,5" | "25.50" | 25.5 -> centavos (inteiro). */
  function parseMoney(value) {
    if (typeof value === 'number') return Math.round(value * 100);
    let s = String(value || '').trim().replace(/[R$\s]/g, '');
    if (!s) return 0;
    if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.');
    const n = parseFloat(s);
    return Number.isFinite(n) ? Math.round(n * 100) : 0;
  }

  function parseNumber(value) {
    if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
    const n = parseFloat(String(value || '').replace(',', '.'));
    return Number.isFinite(n) ? n : 0;
  }

  function itemTotal(item) {
    return Math.round((item.unitPrice || 0) * Math.max(0, parseNumber(item.qty)));
  }

  /**
   * Para um item no modo "por consumo", retorna o peso (fração do item) de cada
   * pessoa, além de avisos sobre unidades não atribuídas/excedentes.
   */
  function itemWeights(item, people) {
    const ids = people.map((p) => p.id);
    const qty = Math.max(0, parseNumber(item.qty));
    if (item.mode === 'units') {
      const units = ids.map((id) => Math.max(0, parseNumber((item.units || {})[id])));
      const assigned = units.reduce((a, b) => a + b, 0);
      const remaining = Math.round((qty - assigned) * 1000) / 1000;
      let weights = units.slice();
      if (remaining > 0) {
        // Sobrou unidade sem dono: divide o restante igualmente entre todos.
        weights = weights.map((u) => u + remaining / ids.length);
      }
      return { weights, assigned, remaining };
    }
    // Modo compartilhado: divide igualmente entre as pessoas selecionadas.
    const selected = (item.shared || []).filter((id) => ids.includes(id));
    const set = new Set(selected.length ? selected : ids);
    return { weights: ids.map((id) => (set.has(id) ? 1 : 0)), assigned: qty, remaining: 0 };
  }

  function tipPctFor(person, tip) {
    if (!tip || !tip.enabled) return 0;
    if (tip.custom && person.tipPct !== null && person.tipPct !== undefined && person.tipPct !== '') {
      return Math.max(0, parseNumber(person.tipPct));
    }
    return Math.max(0, parseNumber(tip.defaultPct));
  }

  /**
   * Calcula a divisão completa.
   * state = {
   *   people: [{ id, name, tipPct }],
   *   items:  [{ id, name, unitPrice (centavos), qty, mode: 'shared'|'units', shared: [ids], units: {id: n} }],
   *   splitMode: 'equal' | 'consumption',
   *   tip: { enabled, defaultPct, custom }
   * }
   */
  function compute(state) {
    const people = state.people || [];
    const items = state.items || [];
    const n = people.length;
    const warnings = [];

    const subtotal = items.reduce((acc, it) => acc + itemTotal(it), 0);
    const breakdown = people.map(() => []);
    let bases;

    if (n === 0) {
      return { people: [], subtotal, tipTotal: 0, total: subtotal, warnings };
    }

    if (state.splitMode === 'consumption') {
      const exact = new Array(n).fill(0);
      items.forEach((it) => {
        const total = itemTotal(it);
        if (total <= 0) return;
        const { weights, assigned, remaining } = itemWeights(it, people);
        const qty = Math.max(0, parseNumber(it.qty));
        if (it.mode === 'units') {
          if (remaining > 0) {
            warnings.push({
              type: 'unassigned',
              itemId: it.id,
              message: `${it.name || 'Item'}: ${fmtQty(remaining)} de ${fmtQty(qty)} sem dono — dividido entre todos.`,
            });
          } else if (remaining < 0) {
            warnings.push({
              type: 'over',
              itemId: it.id,
              message: `${it.name || 'Item'}: ${fmtQty(assigned)} unidades atribuídas, mas a conta tem ${fmtQty(qty)}. Valor rateado proporcionalmente.`,
            });
          }
        }
        const wsum = weights.reduce((a, b) => a + b, 0) || 1;
        weights.forEach((w, i) => {
          if (w <= 0) return;
          const amount = (total * w) / wsum;
          exact[i] += amount;
          breakdown[i].push({ itemId: it.id, name: it.name, share: (qty * w) / wsum, amount });
        });
      });
      bases = allocate(subtotal, exact);
    } else {
      bases = allocate(subtotal, new Array(n).fill(1));
    }

    const result = people.map((p, i) => {
      const pct = tipPctFor(p, state.tip);
      const tip = Math.round((bases[i] * pct) / 100);
      return {
        id: p.id,
        name: p.name,
        base: bases[i],
        tipPct: pct,
        tip,
        total: bases[i] + tip,
        items: breakdown[i],
      };
    });

    const tipTotal = result.reduce((a, r) => a + r.tip, 0);
    return { people: result, subtotal, tipTotal, total: subtotal + tipTotal, warnings };
  }

  function fmtQty(q) {
    return Number.isInteger(q) ? String(q) : q.toFixed(2).replace(/\.?0+$/, '').replace('.', ',');
  }

  const Calc = { allocate, parseMoney, parseNumber, itemTotal, itemWeights, tipPctFor, compute, fmtQty };
  if (typeof module !== 'undefined' && module.exports) module.exports = Calc;
  else root.Calc = Calc;
})(typeof window !== 'undefined' ? window : globalThis);
