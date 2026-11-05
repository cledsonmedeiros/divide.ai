/*
 * divideaí — gera a imagem (PNG) do resultado para compartilhar.
 * buildModel é puro (testável no Node); draw/toFile usam <canvas> no navegador.
 * A imagem sai sempre no tema claro, para ficar igual em qualquer aparelho.
 */
(function (root) {
  'use strict';

  const SITE = 'divideai.ctech.foo';

  /**
   * Monta os textos da imagem a partir do estado e do resultado de Calc.compute.
   * `money` formata centavos; `fmtQty` formata percentuais/quantidades.
   */
  function buildModel({ state, result, money, fmtQty, date }) {
    const tipOn = !!(state.tip && state.tip.enabled);
    const mode = state.splitMode === 'consumption' ? 'pelo consumo' : 'igualmente';
    return {
      subtitle: `Divisão da conta · ${mode} · ${date}`,
      rows: result.people.map((p) => ({
        name: p.name || 'Pessoa',
        total: money(p.total),
        detail: `Consumo ${money(p.base)}` + (tipOn ? ` · Gorjeta ${fmtQty(p.tipPct)}% ${money(p.tip)}` : ''),
      })),
      totals: [
        { label: 'Subtotal', value: money(result.subtotal) },
        ...(tipOn ? [{ label: 'Gorjeta', value: money(result.tipTotal) }] : []),
        { label: 'Total', value: money(result.total), strong: true },
      ],
      footer: SITE,
    };
  }

  /* ---------------- Desenho (navegador) ---------------- */

  const C = {
    page: '#f4f6f5',
    card: '#ffffff',
    border: '#dde3e1',
    text: '#17201e',
    muted: '#64716e',
    accent: '#0f766e',
    accentSoft: '#e0f2ef',
    coin: '#fbbf24',
  };
  const FONT = '"Inter Variable", Inter, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
  const W = 540;          // largura lógica (px CSS)
  const SCALE = 2;        // sai com 1080 px de largura
  const M = 20;           // margem externa
  const P = 24;           // margem interna do cartão
  const HEADER = 104;
  const ROW = 64;
  const TOTAL_ROW = 30;
  const GRAND_ROW = 38;
  const FOOTER = 52;

  function height(model) {
    const totals = model.totals.reduce((h, t) => h + (t.strong ? GRAND_ROW : TOTAL_ROW), 0);
    return M + HEADER + 8 + model.rows.length * ROW + 20 + totals + FOOTER + M;
  }

  const font = (weight, size) => `${weight} ${size}px ${FONT}`;

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  // Corta o texto com reticências para caber em maxWidth.
  function fit(ctx, text, maxWidth) {
    if (ctx.measureText(text).width <= maxWidth) return text;
    let t = text;
    while (t.length > 1 && ctx.measureText(t + '…').width > maxWidth) t = t.slice(0, -1);
    return t.trimEnd() + '…';
  }

  function drawHeader(ctx, x, y, w, subtitle) {
    ctx.fillStyle = C.accent;
    ctx.fillRect(x, y, w, HEADER);

    // Símbolo ÷ com as moedas, como no ícone.
    const cx = x + P + 16;
    ctx.fillStyle = C.coin;
    ctx.beginPath(); ctx.arc(cx, y + 34, 6, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(cx, y + 66, 6, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ffffff';
    roundRect(ctx, cx - 17, y + 46.5, 34, 7, 3.5); ctx.fill();

    // Wordmark "divide" + "aí".
    const tx = x + P + 48;
    ctx.textBaseline = 'alphabetic';
    ctx.textAlign = 'left';
    ctx.font = font(700, 28);
    ctx.fillStyle = '#ffffff';
    ctx.fillText('divide', tx, y + 52);
    ctx.fillStyle = C.coin;
    ctx.fillText('aí', tx + ctx.measureText('divide').width, y + 52);

    ctx.font = font(500, 14);
    ctx.fillStyle = C.accentSoft;
    ctx.fillText(fit(ctx, subtitle, w - (tx - x) - P), tx, y + 76);
  }

  function draw(model, canvas) {
    const H = height(model);
    canvas.width = W * SCALE;
    canvas.height = H * SCALE;
    const ctx = canvas.getContext('2d');
    ctx.scale(SCALE, SCALE);

    ctx.fillStyle = C.page;
    ctx.fillRect(0, 0, W, H);

    const x = M;
    const w = W - 2 * M;
    const cardH = H - 2 * M;
    ctx.save();
    roundRect(ctx, x, M, w, cardH, 24);
    ctx.fillStyle = C.card;
    ctx.fill();
    ctx.clip();
    drawHeader(ctx, x, M, w, model.subtitle);
    ctx.restore();

    let y = M + HEADER + 8;
    const left = x + P;
    const right = x + w - P;

    model.rows.forEach((r, i) => {
      if (i > 0) {
        ctx.fillStyle = C.border;
        ctx.fillRect(left, y, right - left, 1);
      }
      ctx.textAlign = 'right';
      ctx.font = font(700, 22);
      ctx.fillStyle = C.accent;
      ctx.fillText(r.total, right, y + 38);
      const totalW = ctx.measureText(r.total).width;

      ctx.textAlign = 'left';
      ctx.font = font(600, 17);
      ctx.fillStyle = C.text;
      ctx.fillText(fit(ctx, r.name, right - left - totalW - 16), left, y + 28);
      ctx.font = font(400, 13);
      ctx.fillStyle = C.muted;
      ctx.fillText(fit(ctx, r.detail, right - left - totalW - 16), left, y + 48);
      y += ROW;
    });

    y += 12;
    ctx.fillStyle = C.border;
    ctx.fillRect(left, y, right - left, 1);
    y += 8;

    model.totals.forEach((t) => {
      const h = t.strong ? GRAND_ROW : TOTAL_ROW;
      const base = y + (t.strong ? 28 : 21);
      ctx.font = t.strong ? font(700, 20) : font(400, 15);
      ctx.fillStyle = t.strong ? C.text : C.muted;
      ctx.textAlign = 'left';
      ctx.fillText(t.label, left, base);
      ctx.textAlign = 'right';
      ctx.fillText(t.value, right, base);
      y += h;
    });

    ctx.textAlign = 'center';
    ctx.font = font(500, 12);
    ctx.fillStyle = C.muted;
    ctx.fillText(model.footer, W / 2, M + cardH - 20);
    return canvas;
  }

  // Síncrono de propósito: navigator.share exige o gesto do usuário "recente",
  // e esperar um toBlob() assíncrono pode fazer o navegador recusar.
  function toFile(model, filename) {
    const canvas = draw(model, document.createElement('canvas'));
    const bin = atob(canvas.toDataURL('image/png').split(',')[1]);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new File([bytes], filename, { type: 'image/png' });
  }

  const ShareImage = { buildModel, height, draw, toFile };
  if (typeof module !== 'undefined' && module.exports) module.exports = ShareImage;
  else root.ShareImage = ShareImage;
})(typeof window !== 'undefined' ? window : globalThis);
