'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Kein FIM-Schema-Inhalt im Kern (tools/fim-schema-inhalt-pruefen.js)
   ────────────────────────────────────────────────────────────────────────
   Bauregel Gerüst und Modul: Struktur und Feldnamen eines FIM-Schemas stehen im FIM-Modul, nicht im Kern. Seit 08.11.2026
   ist die Nutzung frei (U2-ADR-465, U2-ADR-456, Nachträge); geprüft werden nur noch die Kern-Dateien, ein Modul außerhalb
   des Kerns ist grün. Die Probe läuft gegen den echten Kern und trägt Rot-Beweise je Art. Die Kennungen der Rot-Beweise werden zur Laufzeit gebaut,
   damit diese Datei selbst keinen Fund trägt; der Nummernkreis 99 ist die Kennzeichnung erfundener Fixtures.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const W = require('../tools/fim-schema-inhalt-pruefen.js');

const id = (art, n) => art + String(n).padStart(8, '0');   // id('F', 13) → eine Kennung außerhalb des Nummernkreises 99

test('[FIM-Inhalt] die Kern-Dateien tragen keinen Schema-Inhalt', () => {
  const dateien = W.kernDateien();
  assert.deepEqual(dateien, ['vivodepot.html', 'vivodepot-lesen.html'], 'geprüft werden genau die Kern-Dateien');
  assert.deepEqual(W.pruefen({ dateien }), []);
});

test('[FIM-Inhalt·Modul] ein Modul außerhalb des Kerns mit Schema-Inhalt ist grün, derselbe Inhalt im Kern ist rot', () => {
  const fs = require('node:fs');
  const os = require('node:os');
  const path = require('node:path');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'fim-inhalt-'));
  const inhalt = '<xs:element name="' + id('F', 13) + '">\nconst S = { "' + id('G', 855) + '": ["' + id('F', 13) + '"] };\n';
  const modul = path.join(dir, 'fim-modul.json');
  fs.writeFileSync(modul, inhalt);
  const kern = path.join(dir, 'vivodepot.html');
  fs.writeFileSync(kern, '<script>\n' + inhalt + '</script>\n');
  try {
    assert.ok(!W.kernDateien().some((d) => /modul/i.test(d)), 'kein Modul in der Standard-Menge');
    assert.deepEqual(W.pruefen({ dateien: W.kernDateien() }), [], 'der Standard-Lauf sieht das Modul nicht und bleibt grün');
    const rot = W.pruefen({ dateien: [kern] }).map((f) => f.art).sort();
    assert.deepEqual(rot, ['markup', 'struktur'], 'Rot-Beweis: derselbe Inhalt in einer Kern-Datei fällt');
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('[FIM-Inhalt·Rot-Beweis] Markup und Verschachtelung fallen, auch ohne das echte Schema', () => {
  const xsd = '<xs:element name="' + id('F', 13) + '">';
  assert.deepEqual(W.textPruefen(xsd).map((f) => f.art), ['markup']);
  const literal = "const S = { '" + id('G', 855) + "': ['" + id('F', 13) + "', '" + id('F', 35) + "'] };";
  assert.deepEqual(W.textPruefen(literal).map((f) => f.art), ['struktur']);
  assert.deepEqual(W.textPruefen('<ns0:xdatenfelder.stammdatenschema.0102>').map((f) => f.art), ['markup']);
});

test('[FIM-Inhalt·Rot-Beweis] mit Schema: eine Kennung außerhalb der Region und ein langer Feldname fallen; die Region selbst nicht', () => {
  const name = 'Ein ausgedachter, langer Feldname (Probe)';
  const inhalt = W.schemaInhalt('<x:id>' + id('F', 13) + '</x:id><x:name>' + name + '</x:name><x:name>Ort</x:name>');
  assert.equal(inhalt.namen.size, 1, 'kurze Namen sind Alltagswörter und werden nicht geprüft');
  assert.deepEqual(W.textPruefen('feld: "' + id('F', 13) + '"', inhalt).map((f) => f.art), ['kennung']);
  assert.deepEqual(W.textPruefen('label: "' + name + '"', inhalt).map((f) => f.art), ['name']);
  const region = '/* FIM-BEZUEGE:BEGIN */\n{ id: "' + id('F', 13) + '" }\n/* FIM-BEZUEGE:END */';
  assert.deepEqual(W.textPruefen(region, inhalt), [], 'die Bezüge-Region führt Kennungen einzeln, das ist erlaubt (U2-ADR-456)');
});

test('[FIM-Inhalt] der Nummernkreis 99 ist erfunden und wird nicht gemeldet', () => {
  assert.deepEqual(W.textPruefen('<xs:element name="F99000003">'), []);
  assert.equal(W.textPruefen('<xs:element name="F99000003"> <xs:element name="' + id('F', 13) + '">').length, 1, 'eine echte Kennung daneben bleibt ein Fund');
});
