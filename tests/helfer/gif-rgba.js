'use strict';
/* Ein GIF der QR-Bibliothek (qrcode-generator 1.4.4) in Bildpunkte (RGBA), damit jsQR es zurücklesen kann. Gemeinsam für die
   QR-Rundläufe unter tests/mit-modul/, darunter die Antwort als QR-Serie (tests/mit-modul/antwort-qr-rundlauf.test.js). */
const assert = require('node:assert/strict');

// Das GIF des Studios in Bildpunkte (RGBA), ohne weitere Abhängigkeit: ein Bild, globale Farbtafel, LZW. Mehr erzeugt die
// QR-Bibliothek nicht; alles andere wirft.
function gifZuRgba(daten) {
  const b = Buffer.from(daten.replace(/^data:image\/gif;base64,/, ''), 'base64');
  assert.equal(b.toString('latin1', 0, 6).slice(0, 3), 'GIF');
  const breite = b.readUInt16LE(6), hoehe = b.readUInt16LE(8), packed = b[10];
  if (!(packed & 0x80)) throw new Error('GIF ohne globale Farbtafel');
  const farben = 2 << (packed & 7);
  const tafel = b.subarray(13, 13 + 3 * farben);
  let i = 13 + 3 * farben;
  while (b[i] === 0x21) { i += 2; while (b[i]) i += b[i] + 1; i++; }
  if (b[i] !== 0x2c) throw new Error('kein Bildblock');
  if (b[i + 9] & 0xc0) throw new Error('lokale Farbtafel oder Zeilensprung');
  i += 10;
  const minBits = b[i++];
  const teile = [];
  while (b[i]) { teile.push(b.subarray(i + 1, i + 1 + b[i])); i += b[i] + 1; }
  const lzw = Buffer.concat(teile);
  const clear = 1 << minBits, ende = clear + 1;
  let bits = minBits + 1, tab = [], vorher = null, pos = 0;
  const reset = () => { tab = []; for (let k = 0; k < clear; k++) tab[k] = [k]; tab[clear] = []; tab[ende] = []; bits = minBits + 1; vorher = null; };
  reset();
  const index = [];
  while (pos + bits <= lzw.length * 8) {
    let code = 0;
    for (let k = 0; k < bits; k++, pos++) code |= ((lzw[pos >> 3] >> (pos & 7)) & 1) << k;
    if (code === clear) { reset(); continue; }
    if (code === ende) break;
    let eintrag;
    if (code < tab.length) eintrag = tab[code];
    else if (code === tab.length && vorher) eintrag = vorher.concat(vorher[0]);
    else throw new Error('LZW-Code außerhalb der Tafel');
    index.push(...eintrag);
    if (vorher && tab.length < 4096) tab.push(vorher.concat(eintrag[0]));
    vorher = eintrag;
    if (tab.length === 1 << bits && bits < 12) bits++;
  }
  assert.equal(index.length, breite * hoehe, 'Bildpunkte vollständig');
  const rgba = new Uint8ClampedArray(breite * hoehe * 4);
  index.forEach((f, k) => { rgba.set([tafel[3 * f], tafel[3 * f + 1], tafel[3 * f + 2], 255], 4 * k); });
  return { rgba, breite, hoehe };
}

module.exports = { gifZuRgba };
