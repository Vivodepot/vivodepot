'use strict';
/* ═════════════════════════════════════════════════════════════════
   UEBERSICHT-NOTFALL-KOMMA (23.11.2026)

   Die Karte „Notfall“ der Übersicht reihte die ersten drei Angaben der Notfallkarte mit Komma: „Maria, Mustermann, 01.02.1960“.
   Vor- und Nachname gehören zusammen: „Maria Mustermann · 01.02.1960“.

   Proben:
   [Notfall·Kurz]      Vor- und Nachname mit Leerzeichen, die übrigen Angaben mit „ · “; leere Angaben fallen weg.
   [Notfall·Übersicht] die Übersicht eines Depots zeigt den Namen ohne Komma.
   [Notfall·Rot-Beweis] ein Kern mit der Reihung von vorher zeigt „Maria, Mustermann“.
   ═════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { ladeKern } = require('./load-kern.js');

const PW = 'uebersicht-notfall-pw-2026!';
async function mitName(opts) {
  const k = ladeKern(Object.assign({ backen: true }, opts || {}));
  await k.V.depotAnlegen(PW);
  const d = k.V.getData();
  d.sektoren.identity = { ...d.sektoren.identity, givenName: 'Maria', familyName: 'Mustermann' };
  return k;
}

test('[Notfall·Kurz] Name zusammen, übrige Angaben mit Mittelpunkt', () => {
  const { V } = ladeKern();
  const z = (sektor, feld, wert) => ({ sektor, feld, wert });
  assert.equal(V._uebersichtNotfallKurz([z('identity', 'givenName', 'Maria'), z('identity', 'familyName', 'Mustermann'), z('identity', 'birthDate', '01.02.1960')]),
    'Maria Mustermann · 01.02.1960');
  assert.equal(V._uebersichtNotfallKurz([z('identity', 'familyName', 'Mustermann'), z('health', 'bloodType', 'A+')]), 'Mustermann · A+');
  assert.equal(V._uebersichtNotfallKurz([z('identity', 'givenName', ''), z('health', 'bloodType', 'A+')]), 'A+');
  assert.equal(V._uebersichtNotfallKurz([]), '');
});

test('[Notfall·Übersicht] die Übersicht zeigt den Namen ohne Komma', async () => {
  const { V } = await mitName();
  const h = V._uebersichtHTML();
  assert.ok(h.includes('data-uebersicht-notfall="1"'), 'die Karte Notfall steht da');
  assert.ok(h.includes('Maria Mustermann'), 'Vor- und Nachname zusammen');
  assert.ok(!h.includes('Maria, Mustermann'), 'kein Komma im Namen');
});

/* Rot-Beweis: die Reihung von vorher (alle Angaben mit Komma) fällt durch [Notfall·Übersicht]. */
test('[Notfall·Rot-Beweis] ein Kern mit der Reihung von vorher zeigt das Komma', async () => {
  const quelle = fs.readFileSync(path.join(__dirname, '..', 'vivodepot.html'), 'utf8');
  const neu = 'const kurz = _uebersichtNotfallKurz(notfallKernModell().slice(0, 3));';
  assert.equal(quelle.split(neu).length, 2, 'Vorbedingung: der Anker steht genau einmal');
  const alt = "const kurz = notfallKernModell().slice(0, 3).map((z) => String(z.wert || '')).filter(Boolean).join(', ');";
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'notfall-komma-rot-'));
  const datei = path.join(dir, 'vivodepot.html');
  fs.writeFileSync(datei, quelle.replace(neu, alt));
  try {
    const { V } = await mitName({ htmlPfad: datei });
    assert.ok(V._uebersichtHTML().includes('Maria, Mustermann'), 'mit der alten Reihung steht das Komma da');
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});
