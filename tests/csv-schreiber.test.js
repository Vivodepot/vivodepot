'use strict';
/* ════════════════════════════════════════════════════════════════════════
   csv@1 schreibt eine Tabelle (Nachtrag zu U2-ADR-257, 04.11.2026; Übernahme ohne Abtippen W2)
   ────────────────────────────────────────────────────────────────────────
   Gehalten wird die entschiedene Konvention:
   · Kopfzeile mit den `ziel`-Namen in der Folge der Zuordnung, eine Datenzeile, Trennzeichen `;`, Zeilenende CRLF.
   · Feste Spalten: ein Ziel ohne Wert ist eine leere Zelle, die Spalte bleibt.
   · RFC 4180: ein Wert mit `;`, `"` oder Zeilenumbruch steht in Anführungszeichen, `"` verdoppelt — und der eigene Leser
     liest die Datei zurück (Rundlauf).
   · Formelschutz: `=`, `+`, `@`, Tabulator und `-` vor Nicht-Ziffer bekommen ein `'` vorangestellt; `-5` bleibt.
   · Beim Andocken abgewiesen: Umschlag (`quelle`; `wurzel` weist schon die allgemeine Prüfung ab), `alsListe`, Anhang.
   ROT-BEWEIS: die Abweisungen unten; ohne Formelschutz stünde `=HYPERLINK(…)` roh in der Zelle (geprüft am Zellwert).
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

const MODUL = { modulTyp: 'format', moduleVersion: 1, sprache: 'de', format: 'bibliothek-probe', richtung: 'export',
  sektor: 'identity', label: 'Bibliothek Probe', schreiber: 'csv@1',
  zuordnung: [{ feld: 'givenName', ziel: 'vorname' }, { feld: 'familyName', ziel: 'nachname' }, { feld: 'birthPlace', ziel: 'person.geburtsort' }] };

async function kern(identity) {
  const { V } = ladeKern();
  await V.depotAnlegen('csv-schreiber-pw-2026');
  const d = V.getData();
  d.sektoren.identity = Object.assign({}, d.sektoren.identity, identity);
  d.formatModule = (Array.isArray(d.formatModule) ? d.formatModule : []).concat([MODUL]);
  V.setData(d);
  return V;
}

test('[csv@1] Kopfzeile in der Folge der Zuordnung, eine Datenzeile, ; und CRLF, leere Zelle für fehlenden Wert', async () => {
  const V = await kern({ givenName: 'Walter', familyName: 'Beispiel' });
  const k = V.exportFormatFuerId('bibliothek-probe');
  assert.equal(k.mime, 'text/csv');
  assert.equal(k.endung, 'csv');
  assert.equal(k.baue({}), 'vorname;nachname;person.geburtsort\r\nWalter;Beispiel;\r\n');
});

test('[csv@1] Anführungszeichen nach RFC 4180, und der eigene Leser liest die Datei zurück', async () => {
  const V = await kern({ givenName: 'Anna; Maria', familyName: 'Meier "die Ältere"', birthPlace: 'Köln\nNippes' });
  const text = V.exportFormatFuerId('bibliothek-probe').baue({});
  assert.equal(text, 'vorname;nachname;person.geburtsort\r\n"Anna; Maria";"Meier ""die Ältere""";"Köln\nNippes"\r\n');
  const zurueck = V.FORMAT_LESER['csv@1'].lies(text);
  const zeile = Array.isArray(zurueck) ? zurueck[0] : (zurueck.zeilen ? zurueck.zeilen[0] : zurueck);
  assert.equal(zeile.vorname, 'Anna; Maria');
  assert.equal(zeile.nachname, 'Meier "die Ältere"');
});

test('[csv@1·Rot-Beweis] Formelschutz: =, +, @ und - vor Nicht-Ziffer bekommen ein Hochkomma, -5 nicht', async () => {
  const V = await kern({ givenName: '=HYPERLINK("http://x")', familyName: '-Strich', birthPlace: '-5' });
  const zeile = V.exportFormatFuerId('bibliothek-probe').baue({}).split('\r\n')[1];
  assert.equal(zeile, '"\'=HYPERLINK(""http://x"")";\'-Strich;-5');
  for (const [roh, erwartet] of [['+1', "'+1"], ['@a', "'@a"], ['\tx', "'\tx"], ['a=b', 'a=b']]) {
    assert.equal(V._csvZelle(roh), erwartet, JSON.stringify(roh));
  }
});

test('[csv@1·Rot-Beweis] Umschlag, Liste und Anhang werden beim Andocken abgewiesen', () => {
  const { V } = ladeKern();
  assert.equal(V.formatModulPruefen(MODUL).gueltig, true, 'Positivkontrolle');
  for (const [fall, x, grund] of [['quelle', { quelle: 'antrag' }, 'schreiber-csv-umschlag'], ['wurzel', { wurzel: 'antrag' }, 'wurzel-ohne-xml'],
    ['alsListe', { zuordnung: [{ feld: 'givenName', ziel: 'vorname', alsListe: true }] }, 'schreiber-csv-liste']]) {
    const g = V.formatModulPruefen(Object.assign({}, MODUL, x));
    assert.equal(g.gueltig, false, fall);
    assert.equal(g.grund, grund, fall);
  }
  assert.equal(V._csvKanalGrund({ quelle: null, wurzel: null, zuordnung: [{ feld: 'a', ziel: 'b', anhang: 'bescheid' }] }), 'schreiber-csv-anhang');
});
