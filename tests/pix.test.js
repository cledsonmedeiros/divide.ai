const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

// O código Pix de doação fica em index.html (data-pix do botão). Um código com
// CRC errado é recusado pelo banco, então este teste protege contra edições acidentais.
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const code = (html.match(/data-pix="([^"]+)"/) || [])[1];

function tlv(s) {
  const out = {};
  for (let i = 0; i < s.length; ) {
    const tag = s.slice(i, i + 2);
    const len = Number(s.slice(i + 2, i + 4));
    out[tag] = s.slice(i + 4, i + 4 + len);
    i += 4 + len;
  }
  return out;
}

// CRC16-CCITT (polinômio 0x1021, início 0xFFFF), como no padrão BR Code do Pix.
function crc16(str) {
  let crc = 0xffff;
  for (const byte of Buffer.from(str, 'utf8')) {
    crc ^= byte << 8;
    for (let k = 0; k < 8; k++) crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

test('pix: index.html tem o código de doação', () => {
  assert.ok(code, 'data-pix não encontrado em index.html');
});

test('pix: CRC confere', () => {
  assert.equal(code.slice(-8, -4), '6304');
  assert.equal(crc16(code.slice(0, -4)), code.slice(-4));
});

test('pix: é um Pix estático em reais, sem valor fixo', () => {
  const f = tlv(code);
  assert.equal(f['00'], '01');
  assert.equal(f['01'], '11'); // estático
  assert.equal(tlv(f['26'])['00'], 'br.gov.bcb.pix');
  assert.equal(f['53'], '986'); // BRL
  assert.equal(f['58'], 'BR');
  assert.equal(f['54'], undefined); // quem doa escolhe o valor
});

test('pix: o QR Code existe', () => {
  assert.ok(fs.existsSync(path.join(__dirname, '..', 'icons', 'pix-qr.svg')));
});
