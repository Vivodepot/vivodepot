'use strict';
/* ═════════════════════════════════════════════════════════════════
   sprachmodul-texte-zaehlen (29.10.2026) — der Umfang einer weiteren Sprache, gemessen am englischen Satz.
   Die Vorlage tests/fixtures/sprachmodul-texte-zaehlen ist klein und erfunden; ihre Zahlen stehen hier fest:
     · Textsatz: drei verschiedene Werte über beide Module (doppelte zählen einmal), 8 Wörter;
     · Begleitmodule: „A sample template“ und „Who keeps the key“ — „Save the file“ steht schon im Textsatz,
       „Name“ ist ein einzelnes Wort ohne Zwischenraum —, 7 Wörter;
     · Studio: ein data-en und zwei L(de, en), 6 Wörter.
   Rot-Beweis: [Texte zählen·Rot-Beweis] legt eine Kopie der Vorlage an, fügt dem Textsatz einen neuen Text hinzu und verlangt
   genau einen Text mehr; ein Zähler, der die Module nicht liest, bliebe bei 8 und fiele.
   ═════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { zaehlen, VORLAGE } = require('../tools/sprachmodul-texte-zaehlen.js');

test('[Texte zählen] die Vorlage ergibt genau ihre Zahlen', () => {
  assert.deepEqual(zaehlen(VORLAGE), {
    textsatz: { texte: 3, woerter: 8 },
    begleitmodule: { dateien: 1, texte: 2, woerter: 7 },
    studio: { texte: 3, woerter: 6 },
    gesamt: { texte: 8, woerter: 21 },
  });
});

test('[Texte zählen·Rot-Beweis] ein neuer Text im Textsatz zählt eins mehr, ein doppelter nicht', () => {
  const ordner = fs.mkdtempSync(path.join(os.tmpdir(), 'sprachmodul-zaehlen-'));
  try {
    fs.cpSync(VORLAGE, ordner, { recursive: true });
    const datei = path.join(ordner, 'tools', 'textsatz-en-modul.json');
    const modul = JSON.parse(fs.readFileSync(datei, 'utf8'));
    const erster = Object.values(modul.texte)[0];
    modul.texte['strings:rotBeweisNeu.text'] = 'One more text';
    modul.texte['strings:rotBeweisDoppelt.text'] = erster;
    fs.writeFileSync(datei, JSON.stringify(modul));
    const z = zaehlen(ordner);
    assert.deepEqual(z.textsatz, { texte: 4, woerter: 11 });
    assert.equal(z.gesamt.texte, 9);
  } finally { fs.rmSync(ordner, { recursive: true, force: true }); }
});

test('[Texte zählen] die Kommandozeile nennt „Texte gesamt“, ohne Argument für die Vorlage', () => {
  const r = spawnSync(process.execPath, [path.join(__dirname, '..', 'tools', 'sprachmodul-texte-zaehlen.js')], { encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /^Texte gesamt: 8 \(21 Wörter\)$/m);
});

test('[Texte zählen] der Stand des Repos hat in jedem Teil Texte', () => {
  const z = zaehlen(path.join(__dirname, '..'));
  for (const teil of ['textsatz', 'begleitmodule', 'studio']) assert.ok(z[teil].texte > 0, teil);
  assert.equal(z.gesamt.texte, z.textsatz.texte + z.begleitmodule.texte + z.studio.texte);
});
