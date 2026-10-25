'use strict';
/* Concat KDF der Antwort-JWE: nach dem Gebrauch liegt kein Schlüsselmaterial ungenullt im Speicher (Befund
   JWE-KDF-ZWISCHENPUFFER, MITTEL, geschlossen mit dieser Probe)

   `_jweConcatKdf` (ANTWORT-JWE-BLOCK, zeichengleich in vivodepot.html, vivodepot-lesen.html und vivodepot-studio.html)
   rechnet nach RFC 7518 §4.6.2 einen SHA-256 über Zähler ‖ Z ‖ OtherInfo. Der Eingabepuffer enthält das gemeinsame
   ECDH-Geheimnis Z, der volle Hash `h` bei 256 Bit den CEK selbst. Beide werden im `finally` überschrieben; zurück geht nur
   die Kopie, die der Aufrufer (`antwortJweSchluessel` im Kern, `antwortJweOeffnen` in Lese-App und Studio) im `finally` nullt.

   GEMESSEN wird am geladenen Fenster, nicht am Quelltext, mit tests/helfer/puffer-mitschnitt.js: jeder Puffer, der während
   EINES Aufrufs entsteht oder beschrieben wird, wird danach nach Z und nach dem Ergebnis als Teilfolge durchsucht.
   Ausgenommen sind genau die zwei Puffer, die der Aufrufer selbst hält: das übergebene Z und die zurückgegebene Kopie.

   ROT-BEWEIS: dieselbe Messung an der alten Fassung (ohne Überschreiben) meldet Z und das Ergebnis; eine Fassung, die nur
   den Eingabepuffer überschreibt, meldet nur noch das Ergebnis. Eine Gegenprobe ohne Produkt zeigt, dass die Hülle
   überhaupt sieht. Die Klasse dahinter (vier Stellen außerhalb des Krypto-Pins) prüft
   tests/krypto-zwischenpuffer-klasse.test.js. Alle Werte erzeugt die Probe selbst. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const vm = require('node:vm');
const { ladeKern } = require('./load-kern.js');
const { ladeLesen } = require('./load-lesen.js');
const { ladeGenerator } = require('./load-generator.js');
const { mitgeschnitten, stelle } = require('./helfer/puffer-mitschnitt.js');

const REPO = path.join(__dirname, '..');
const TRAEGER = Object.freeze({ kern: 'vivodepot.html', lesen: 'vivodepot-lesen.html', studio: 'vivodepot-studio.html' });

// Ein Z, das zufällig nirgends sonst steht: 32 feste, voneinander verschiedene Bytes.
const Z_MUSTER = Object.freeze(Array.from({ length: 32 }, (_, i) => (i * 73 + 29) & 0xff));

/* ── Laden: die Funktion und der Realm, in dem sie ihre Puffer baut ───────────────────────────────────────────────── */
function kernLauf(htmlPfad) {
  const opts = { zusatzBindungen: ['_jweConcatKdf'] };
  if (htmlPfad) Object.assign(opts, { htmlPfad, backen: true });
  const { V } = ladeKern(opts);
  return { kdf: V.__zusatz._jweConcatKdf, global: globalThis, U8: globalThis.Uint8Array };
}
function vmLauf(sandbox) {
  return { kdf: vm.runInContext('_jweConcatKdf', sandbox), global: sandbox, U8: vm.runInContext('Uint8Array', sandbox) };
}
const LADER = Object.freeze({
  kern: (html) => {
    if (html == null) return { lauf: kernLauf(null), aufraeumen: () => {} };
    const ordner = fs.mkdtempSync(path.join(os.tmpdir(), 'jwe-kdf-zwischenpuffer-'));
    const pfad = path.join(ordner, TRAEGER.kern);
    fs.writeFileSync(pfad, html);
    try {
      return { lauf: kernLauf(pfad), aufraeumen: () => fs.rmSync(ordner, { recursive: true, force: true }) };
    } catch (e) {
      fs.rmSync(ordner, { recursive: true, force: true });
      throw e;
    }
  },
  lesen: (html) => ({ lauf: vmLauf(ladeLesen(html == null ? {} : { html }).sandbox), aufraeumen: () => {} }),
  studio: (html) => ({ lauf: vmLauf(ladeGenerator(html == null ? {} : { html }).sandbox), aufraeumen: () => {} }),
});

/* Misst einen Träger: ruft die Ableitung mit einem bekannten Z und meldet jeden gesammelten Puffer, der danach Z oder das
   Ergebnis noch trägt. Liefert { verletzungen, gesehen } — `gesehen` als Beleg, dass die Hülle überhaupt mitgehört hat. */
async function messen(name, lauf, kdf) {
  const z = Uint8Array.from(Z_MUSTER);
  const apu = new Uint8Array(0);
  const apv = new TextEncoder().encode('probe-vorgang');
  const { ergebnis, gesehen } = await mitgeschnitten(lauf, () => kdf(z, 'A256GCM', apu, apv, 256));
  assert.ok(ergebnis && ergebnis.length === 32, name + ': Vorbedingung — die Ableitung liefert 32 Byte');
  const cek = Uint8Array.from(ergebnis);
  const eigene = new Set([z.buffer, ergebnis.buffer]);
  const puffer = new Set();
  for (const a of gesehen) if (a && a.buffer && !eigene.has(a.buffer)) puffer.add(a.buffer);
  const verletzungen = [];
  for (const b of puffer) {
    if (!b.byteLength) continue;
    const bytes = new Uint8Array(b);
    const beiZ = stelle(bytes, z);
    if (beiZ >= 0) verletzungen.push(name + ': Z liegt ungenullt in einem Puffer von ' + bytes.length + ' Byte (ab Byte ' + beiZ + ')');
    const beiCek = stelle(bytes, cek);
    if (beiCek >= 0) verletzungen.push(name + ': das Ergebnis liegt ein zweites Mal ungenullt in einem Puffer von ' + bytes.length + ' Byte');
  }
  return { verletzungen, gesehen: gesehen.length, groesster: Math.max(0, ...gesehen.map((a) => (a && a.byteLength) || 0)) };
}

async function traegerMessen(name, html) {
  const { lauf, aufraeumen } = LADER[name](html);
  try {
    assert.equal(typeof lauf.kdf, 'function', name + ': Vorbedingung — _jweConcatKdf ist im geladenen Fenster erreichbar');
    const m = await messen(name, lauf, lauf.kdf);
    // Positivkontrolle der Hülle: der Eingabepuffer (4 + 32 + OtherInfo Byte) muss mitgeschnitten sein, sonst misst die
    // Probe nichts und meldete grün, ohne hingesehen zu haben.
    assert.ok(m.groesster >= 4 + Z_MUSTER.length, name + ': Vorbedingung — die Hülle hat den Eingabepuffer gesehen (' + m.gesehen + ' Puffer, größter ' + m.groesster + ' Byte)');
    return m.verletzungen;
  } finally {
    aufraeumen();
  }
}

/* ── Die Fassungen für den Rot-Beweis: im Produkt steht NEU; ALT ist die Fassung vor dem Fix ───────────────────────── */
const NEU = "  // Eingabe (Zähler ‖ Z ‖ OtherInfo) und voller Hash tragen Schlüsselmaterial: beide im finally überschreiben, zurück geht\n"
  + '  // nur die Kopie, die der Aufrufer nullt (Befund JWE-KDF-ZWISCHENPUFFER).\n'
  + '  const eingabe = _jweVerbinden([_jweLaenge32(1), z, other]);\n'
  + '  let h = null;\n'
  + '  try {\n'
  + "    h = new Uint8Array(await crypto.subtle.digest('SHA-256', eingabe));\n"
  + '    return h.slice(0, bits / 8);\n'
  + '  } finally { eingabe.fill(0); if (h) h.fill(0); }\n}';
const ALT = "  const h = new Uint8Array(await crypto.subtle.digest('SHA-256', _jweVerbinden([_jweLaenge32(1), z, other])));\n"
  + '  return h.slice(0, bits / 8);\n}';
const NUR_EINGABE = '  const eingabe = _jweVerbinden([_jweLaenge32(1), z, other]);\n'
  + '  try {\n'
  + "    const h = new Uint8Array(await crypto.subtle.digest('SHA-256', eingabe));\n"
  + '    return h.slice(0, bits / 8);\n'
  + '  } finally { eingabe.fill(0); }\n}';
function geaendert(name, ersatz) {
  const html = fs.readFileSync(path.join(REPO, TRAEGER[name]), 'utf8');
  assert.equal(html.split(NEU).length, 2, name + ': Vorbedingung — die Stelle in _jweConcatKdf steht genau einmal');
  return html.replace(NEU, ersatz);
}

/* ── Proben ──────────────────────────────────────────────────────────────────────────────────────────────────────────── */
test('[JWE · Concat KDF] nach _jweConcatKdf liegt in Kern, Lese-App und Studio weder Z noch das Ergebnis ein zweites Mal ungenullt',
  async () => {
    const verletzungen = [];
    for (const name of Object.keys(TRAEGER)) verletzungen.push(...await traegerMessen(name, null));
    assert.deepEqual(verletzungen, []);
  });

test('[JWE · Concat KDF · Rot-Beweis] die alte Fassung ohne Überschreiben meldet in allen drei Trägern Z und das Ergebnis', async () => {
  for (const name of Object.keys(TRAEGER)) {
    const v = await traegerMessen(name, geaendert(name, ALT));
    assert.ok(v.some((s) => s.includes(': Z liegt ungenullt')), name + ': ' + v.join(' | '));
    assert.ok(v.some((s) => s.includes('das Ergebnis')), name + ': ' + v.join(' | '));
  }
});

test('[JWE · Concat KDF · Rot-Beweis] eine Fassung, die nur den Eingabepuffer überschreibt, meldet nur noch das Ergebnis, nicht mehr Z', async () => {
  for (const name of Object.keys(TRAEGER)) {
    const v = await traegerMessen(name, geaendert(name, NUR_EINGABE));
    assert.ok(v.length > 0, name + ': der volle Hash wird weiter gemeldet');
    assert.ok(v.every((s) => s.includes('das Ergebnis')), name + ': ' + v.join(' | '));
  }
});

test('[JWE · Concat KDF · Gegenprobe] die Hülle sieht eine Ableitung, die Z in einen eigenen Puffer kopiert und liegen lässt', async () => {
  const lauf = { global: globalThis, U8: globalThis.Uint8Array };
  const leckend = async (z) => {
    const kopie = new Uint8Array(z.length + 4);
    kopie.set(z, 4);
    return new Uint8Array(32).fill(7);
  };
  const { verletzungen } = await messen('gegenprobe', lauf, leckend);
  assert.equal(verletzungen.length, 1, verletzungen.join(' | '));
  assert.match(verletzungen[0], /^gegenprobe: Z liegt ungenullt in einem Puffer von 36 Byte \(ab Byte 4\)$/);
});
