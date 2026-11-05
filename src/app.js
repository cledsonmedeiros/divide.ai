/* divide.ai — interface. Depende de window.Calc (src/calc.js). */
(function () {
  'use strict';

  const STORAGE_KEY = 'divide.ai:v1';
  const TIP_PRESETS = [0, 10, 12, 15];
  const BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
  const money = (cents) => BRL.format((cents || 0) / 100);
  const moneyPlain = (cents) => ((cents || 0) / 100).toFixed(2).replace('.', ',');
  const $ = (sel, el = document) => el.querySelector(sel);
  const uid = () => Math.random().toString(36).slice(2, 9);
  const esc = (s) =>
    String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const EXAMPLE_ITEMS = [
    ['Massa', 10, 2500],
    ['Tapioca', 2, 1200],
    ['Copo de suco', 3, 700],
    ['Coca 1L', 3, 1200],
    ['Torre', 1, 5000],
    ['Coca lata', 1, 700],
    ['Sobremesa', 3, 1200],
  ];

  function freshState() {
    return {
      people: [],
      items: [],
      splitMode: 'equal',
      tip: { enabled: true, defaultPct: 10, custom: false },
    };
  }

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return Object.assign(freshState(), JSON.parse(raw));
    } catch (_) { /* armazenamento indisponível */ }
    return exampleState();
  }

  function exampleState(base) {
    const st = base || freshState();
    st.items = EXAMPLE_ITEMS.map(([n, q, p]) => newItem(n, q, p));
    if (!st.people.length) {
      st.people = ['Ana', 'Bruno', 'Carla', 'Diego'].map((name) => ({ id: uid(), name, tipPct: null }));
    }
    return st;
  }

  let state = load();

  function save() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (_) { /* ignora */ }
  }

  function newItem(name, qty, unitPrice) {
    return { id: uid(), name, qty, unitPrice, mode: qty > 1 ? 'units' : 'shared', shared: [], units: {} };
  }

  const findItem = (id) => state.items.find((i) => i.id === id);
  const findPerson = (id) => state.people.find((p) => p.id === id);

  /* ---------------- Render ---------------- */

  function renderPeople() {
    const el = $('#people');
    if (!state.people.length) {
      el.innerHTML = '<p class="empty">Adicione pelo menos uma pessoa.</p>';
      return;
    }
    el.innerHTML = state.people
      .map(
        (p) => `<span class="chip">${esc(p.name)}
          <button type="button" data-remove-person="${p.id}" aria-label="Remover ${esc(p.name)}">×</button></span>`
      )
      .join('');
  }

  function assignStatus(item) {
    if (item.mode !== 'units') return '';
    const { assigned, remaining } = Calc.itemWeights(item, state.people);
    const qty = Calc.parseNumber(item.qty);
    const cls = remaining === 0 ? 'ok' : remaining < 0 ? 'bad' : 'warn';
    const extra =
      remaining > 0 ? ` · ${Calc.fmtQty(remaining)} sem dono (divide entre todos)` : remaining < 0 ? ' · passou do total!' : ' ✓';
    return `<span class="${cls}">${Calc.fmtQty(assigned)} de ${Calc.fmtQty(qty)} atribuídas${extra}</span>`;
  }

  function renderAssign(item) {
    if (state.splitMode !== 'consumption') return '';
    if (!state.people.length) return '<div class="assign"><p class="empty">Adicione pessoas para atribuir o consumo.</p></div>';

    let body;
    if (item.mode === 'units') {
      body = `<div class="units">${state.people
        .map((p) => {
          const v = (item.units || {})[p.id] || 0;
          return `<div class="unit-row">
            <span>${esc(p.name)}</span>
            <div class="stepper">
              <button type="button" data-step="-1" data-person="${p.id}" aria-label="Menos">−</button>
              <input type="number" inputmode="decimal" min="0" step="any" value="${v}" data-units="${p.id}" aria-label="Unidades de ${esc(p.name)}" />
              <button type="button" data-step="1" data-person="${p.id}" aria-label="Mais">+</button>
            </div>
          </div>`;
        })
        .join('')}</div>`;
    } else {
      const sel = new Set(item.shared || []);
      const all = sel.size === 0;
      body = `<div class="chips toggles">
        <button type="button" class="toggle ${all ? 'on' : ''}" data-share-all>Todos</button>
        ${state.people
          .map((p) => `<button type="button" class="toggle ${!all && sel.has(p.id) ? 'on' : ''}" data-share="${p.id}">${esc(p.name)}</button>`)
          .join('')}
      </div>`;
    }

    return `<div class="assign">
      <div class="segmented small">
        <button type="button" data-mode="shared" class="${item.mode !== 'units' ? 'on' : ''}">Dividir entre</button>
        <button type="button" data-mode="units" class="${item.mode === 'units' ? 'on' : ''}">Por unidade</button>
      </div>
      ${body}
      <div class="assign-status">${assignStatus(item)}</div>
    </div>`;
  }

  function renderItems() {
    const el = $('#items');
    if (!state.items.length) {
      el.innerHTML = '<p class="empty">Nenhum item ainda. Toque em “Exemplo” para carregar a conta da foto.</p>';
      return;
    }
    el.innerHTML = state.items
      .map(
        (it) => `<div class="item" data-item="${it.id}">
        <div class="item-head">
          <input class="it-name" type="text" value="${esc(it.name)}" data-field="name" aria-label="Nome do item" />
          <button type="button" class="icon" data-remove-item aria-label="Remover item">×</button>
        </div>
        <div class="item-math">
          <input class="it-qty" type="number" inputmode="decimal" min="0" step="any" value="${it.qty}" data-field="qty" aria-label="Quantidade" />
          <span>×</span>
          <div class="money-input"><span>R$</span>
            <input class="it-price" type="text" inputmode="decimal" value="${moneyPlain(it.unitPrice)}" data-field="price" aria-label="Preço unitário" />
          </div>
          <span>=</span>
          <strong class="it-total">${money(Calc.itemTotal(it))}</strong>
        </div>
        ${renderAssign(it)}
      </div>`
      )
      .join('');
  }

  function renderSplit() {
    document.querySelectorAll('[data-split]').forEach((b) => {
      const on = b.dataset.split === state.splitMode;
      b.classList.toggle('on', on);
      b.setAttribute('aria-checked', on);
    });
    $('#split-hint').textContent =
      state.splitMode === 'equal'
        ? 'O subtotal é dividido igualmente entre todos.'
        : 'Em cada item, escolha quem dividiu (ex.: a torre) ou quantas unidades cada um pegou (ex.: massas).';
  }

  function renderTip() {
    const t = state.tip;
    $('#tip-enabled').checked = t.enabled;
    $('#tip-config').hidden = !t.enabled;
    $('#tip-custom').checked = t.custom;
    const def = $('#tip-default');
    if (document.activeElement !== def) def.value = t.defaultPct;
    $('#tip-quick').innerHTML = TIP_PRESETS.map(
      (p) => `<button type="button" class="toggle ${Number(t.defaultPct) === p ? 'on' : ''}" data-tip-preset="${p}">${p}%</button>`
    ).join('');

    const box = $('#tip-people');
    if (!t.custom) { box.innerHTML = ''; return; }
    if (!state.people.length) { box.innerHTML = '<p class="empty">Adicione pessoas primeiro.</p>'; return; }
    box.innerHTML =
      '<p class="hint">Deixe em branco para usar o padrão. Use 0 para quem não quer dar gorjeta.</p>' +
      state.people
        .map(
          (p) => `<div class="unit-row">
          <span>${esc(p.name)}</span>
          <div class="pct-input">
            <input type="number" inputmode="decimal" min="0" step="any" data-tip-person="${p.id}"
              value="${p.tipPct ?? ''}" placeholder="${esc(t.defaultPct)}" aria-label="Gorjeta de ${esc(p.name)} em %" />
            <span>%</span>
          </div>
        </div>`
        )
        .join('');
  }

  let lastResult = null;

  function renderResult() {
    const r = Calc.compute(state);
    lastResult = r;
    $('#subtotal').textContent = money(r.subtotal);

    $('#warnings').innerHTML =
      state.splitMode === 'consumption'
        ? r.warnings.map((w) => `<div class="warning ${w.type}">${esc(w.message)}</div>`).join('')
        : '';

    const el = $('#result');
    if (!state.people.length) {
      el.innerHTML = '<p class="empty">Adicione as pessoas da mesa para ver a divisão.</p>';
    } else {
      el.innerHTML = r.people
        .map((p) => {
          const details =
            state.splitMode === 'consumption' && p.items.length
              ? `<details><summary>Ver itens</summary><ul>${p.items
                  .map((i) => `<li><span>${esc(Calc.fmtQty(Math.round(i.share * 100) / 100))}× ${esc(i.name)}</span><span>${money(Math.round(i.amount))}</span></li>`)
                  .join('')}</ul></details>`
              : '';
          return `<div class="person-result">
            <div class="pr-head"><span class="pr-name">${esc(p.name)}</span><span class="pr-total">${money(p.total)}</span></div>
            <div class="pr-sub">Consumo ${money(p.base)}${state.tip.enabled ? ` · Gorjeta ${Calc.fmtQty(p.tipPct)}% ${money(p.tip)}` : ''}</div>
            ${details}
          </div>`;
        })
        .join('');
    }

    $('#totals').innerHTML = `
      <div><span>Subtotal</span><span>${money(r.subtotal)}</span></div>
      ${state.tip.enabled ? `<div><span>Gorjeta</span><span>${money(r.tipTotal)}</span></div>` : ''}
      <div class="grand"><span>Total</span><span>${money(r.total)}</span></div>`;
    $('#btn-whatsapp').href = 'https://wa.me/?text=' + encodeURIComponent(summaryText());
    save();
  }

  function renderAll() {
    renderPeople();
    renderItems();
    renderSplit();
    renderTip();
    renderResult();
  }

  /* ---------------- Ações ---------------- */

  function toast(msg) {
    const t = $('#toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toast._t);
    toast._t = setTimeout(() => t.classList.remove('show'), 2200);
  }

  function summaryText() {
    const r = lastResult || Calc.compute(state);
    const lines = ['🧾 Divisão da conta (divide.ai)', ''];
    if (state.items.length) {
      lines.push('Itens:');
      state.items.forEach((it) => {
        const qty = Calc.fmtQty(Calc.parseNumber(it.qty));
        lines.push(`• ${qty}× ${it.name || 'Item'} — ${money(it.unitPrice)} = ${money(Calc.itemTotal(it))}`);
      });
      lines.push('');
    }
    lines.push(`Subtotal: ${money(r.subtotal)}`);
    if (state.tip.enabled) lines.push(`Gorjeta: ${money(r.tipTotal)}`);
    lines.push(`Total: ${money(r.total)}`);
    if (r.people.length) {
      lines.push('', 'Por pessoa:');
      const byConsumption = state.splitMode === 'consumption';
      r.people.forEach((p, idx) => {
        if (idx > 0) lines.push('');
        lines.push(`• ${p.name}: ${money(p.total)}`);
        if (byConsumption) {
          p.items.forEach((i) => {
            const share = Calc.fmtQty(Math.round(i.share * 100) / 100);
            lines.push(`   – ${share}× ${i.name || 'Item'}: ${money(Math.round(i.amount))}`);
          });
        }
        const tip = state.tip.enabled ? ` + gorjeta ${Calc.fmtQty(p.tipPct)}% ${money(p.tip)}` : '';
        lines.push(`   Consumo ${money(p.base)}${tip}`);
      });
    }
    return lines.join('\n');
  }

  async function copy(text) {
    try {
      await navigator.clipboard.writeText(text);
      toast('Resumo copiado!');
    } catch (_) {
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
      toast('Resumo copiado!');
    }
  }

  $('#form-person').addEventListener('submit', (e) => {
    e.preventDefault();
    const input = $('#person-name');
    const names = input.value.split(',').map((s) => s.trim()).filter(Boolean);
    if (!names.length) return input.focus();
    names.forEach((name) => state.people.push({ id: uid(), name, tipPct: null }));
    input.value = '';
    input.focus();
    renderAll();
  });

  $('#people').addEventListener('click', (e) => {
    const id = e.target.dataset.removePerson;
    if (!id) return;
    state.people = state.people.filter((p) => p.id !== id);
    state.items.forEach((it) => {
      it.shared = (it.shared || []).filter((x) => x !== id);
      if (it.units) delete it.units[id];
    });
    renderAll();
  });

  $('#form-item').addEventListener('submit', (e) => {
    e.preventDefault();
    const name = $('#item-name').value.trim();
    const qty = Calc.parseNumber($('#item-qty').value) || 1;
    const price = Calc.parseMoney($('#item-price').value);
    if (!name) return $('#item-name').focus();
    if (!price) return $('#item-price').focus();
    state.items.push(newItem(name, qty, price));
    $('#item-name').value = '';
    $('#item-qty').value = 1;
    $('#item-price').value = '';
    $('#item-name').focus();
    renderItems();
    renderResult();
  });

  const items = $('#items');

  items.addEventListener('input', (e) => {
    const card = e.target.closest('[data-item]');
    if (!card) return;
    const it = findItem(card.dataset.item);
    const t = e.target;
    if (t.dataset.field === 'name') it.name = t.value;
    else if (t.dataset.field === 'qty') it.qty = Calc.parseNumber(t.value);
    else if (t.dataset.field === 'price') it.unitPrice = Calc.parseMoney(t.value);
    else if (t.dataset.units) {
      it.units = it.units || {};
      it.units[t.dataset.units] = Math.max(0, Calc.parseNumber(t.value));
    } else return;
    $('.it-total', card).textContent = money(Calc.itemTotal(it));
    const st = $('.assign-status', card);
    if (st) st.innerHTML = assignStatus(it);
    renderResult();
  });

  items.addEventListener('change', (e) => {
    if (e.target.dataset.field === 'price') {
      const it = findItem(e.target.closest('[data-item]').dataset.item);
      e.target.value = moneyPlain(it.unitPrice);
    }
  });

  items.addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    const card = e.target.closest('[data-item]');
    if (!btn || !card) return;
    const it = findItem(card.dataset.item);
    const d = btn.dataset;

    if ('removeItem' in d) {
      state.items = state.items.filter((x) => x !== it);
    } else if (d.mode) {
      it.mode = d.mode;
    } else if ('shareAll' in d) {
      it.shared = [];
    } else if (d.share) {
      const set = new Set(it.shared || []);
      set.has(d.share) ? set.delete(d.share) : set.add(d.share);
      // Selecionar todo mundo equivale a "Todos".
      it.shared = set.size === state.people.length ? [] : [...set];
    } else if (d.step) {
      it.units = it.units || {};
      const cur = Calc.parseNumber(it.units[d.person]);
      it.units[d.person] = Math.max(0, cur + Number(d.step));
    } else return;
    renderItems();
    renderResult();
  });

  document.querySelectorAll('[data-split]').forEach((b) =>
    b.addEventListener('click', () => {
      state.splitMode = b.dataset.split;
      renderSplit();
      renderItems();
      renderResult();
    })
  );

  $('#tip-enabled').addEventListener('change', (e) => {
    state.tip.enabled = e.target.checked;
    renderTip();
    renderResult();
  });

  $('#tip-custom').addEventListener('change', (e) => {
    state.tip.custom = e.target.checked;
    renderTip();
    renderResult();
  });

  $('#tip-default').addEventListener('input', (e) => {
    state.tip.defaultPct = Math.max(0, Calc.parseNumber(e.target.value));
    $('#tip-quick').querySelectorAll('[data-tip-preset]').forEach((b) =>
      b.classList.toggle('on', Number(b.dataset.tipPreset) === state.tip.defaultPct)
    );
    $('#tip-people').querySelectorAll('[data-tip-person]').forEach((i) => (i.placeholder = state.tip.defaultPct));
    renderResult();
  });

  $('#tip-quick').addEventListener('click', (e) => {
    const p = e.target.dataset.tipPreset;
    if (p === undefined) return;
    state.tip.defaultPct = Number(p);
    renderTip();
    renderResult();
  });

  $('#tip-people').addEventListener('input', (e) => {
    const id = e.target.dataset.tipPerson;
    if (!id) return;
    const v = e.target.value.trim();
    findPerson(id).tipPct = v === '' ? null : Math.max(0, Calc.parseNumber(v));
    renderResult();
  });

  // Confirmação em dois toques (sem confirm(), que alguns navegadores embutidos bloqueiam).
  function armed(btn, label, action, needsConfirm) {
    const original = btn.textContent;
    let timer = null;
    btn.addEventListener('click', () => {
      if (needsConfirm() && !btn.classList.contains('armed')) {
        btn.classList.add('armed');
        btn.textContent = label;
        timer = setTimeout(() => { btn.classList.remove('armed'); btn.textContent = original; }, 3000);
        return;
      }
      clearTimeout(timer);
      btn.classList.remove('armed');
      btn.textContent = original;
      action();
    });
  }

  armed($('#btn-example'), 'Substituir itens?', () => {
    state = exampleState(state);
    renderAll();
    toast('Conta de exemplo carregada');
  }, () => state.items.length > 0);

  armed($('#btn-reset'), 'Apagar tudo?', () => {
    state = freshState();
    renderAll();
    toast('Conta nova');
  }, () => state.items.length > 0 || state.people.length > 0);

  $('#btn-copy').addEventListener('click', () => copy(summaryText()));

  // O menu de compartilhamento do sistema só funciona fora de iframes (ex.: no
  // claude.ai ele é bloqueado). Nesses casos o botão fica escondido e sobram
  // "Enviar no WhatsApp" (link comum) e "Copiar".
  let embedded = true;
  try { embedded = window.self !== window.top; } catch (_) { /* iframe de outra origem */ }
  $('#btn-share').hidden = !(navigator.share && !embedded);

  $('#btn-share').addEventListener('click', async () => {
    const text = summaryText();
    if (navigator.share) {
      try { await navigator.share({ title: 'Divisão da conta', text }); return; } catch (err) {
        if (err && err.name === 'AbortError') return;
      }
    }
    copy(text);
  });

  renderAll();
})();
