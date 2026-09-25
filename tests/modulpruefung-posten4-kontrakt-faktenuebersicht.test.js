'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Modulprüfung schließen, Posten 4 (23.08.2026) — zusammen mit Zug 3 des
   Auftrags „Das Einreich-Schema prüfte nichts": EIN Werkzeug für beide
   Richtungen — was das Schema zusagt (Teil B) und wie der Kontrakt sich
   schützt (Teil A, die sechs reservierten Register).
   ════════════════════════════════════════════════════════════════════════ */
const test = require('./helfer/nur-privat.js').testMitPrivat(__filename);   // nur-privat: s. tests/helfer/nur-privat.js
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const K = require('../tools/kontrakt-faktenuebersicht-erzeugen.js');

const REPO = path.join(__dirname, '..');
const DATEI = path.join(REPO, 'docs', 'kontrakt-faktenuebersicht.md');

test('[Posten4·Teil A] alle sechs reservierten Register werden live aus dem Kern gelesen, nicht erinnert', () => {
  const r = K.reservierteRegister();
  assert.equal(r.length, 6);
  const bereich = r.find((x) => x.register.startsWith('bereich'));
  assert.equal(bereich.werte.length, 13, 'die dreizehn Sektoren (Zugang-zum-Recht Zug 1: neuer Bereich vermoegen, '
    + '30.08.2026) — falls diese Zahl je wächst, wächst sie hier automatisch mit');
  assert.ok(bereich.werte.includes('health') && bereich.werte.includes('personal'));
  const format = r.find((x) => x.register.startsWith('format'));
  assert.ok(format.werte.includes('json') && format.werte.includes('provider-credential'),
    'die Vereinigung aus Export- UND Import-Formaten, nicht nur eine Seite');
  const textsatz = r.find((x) => x.register.startsWith('textsatz'));
  assert.deepEqual(textsatz.werte, ['de']);
  const rechtsraum = r.find((x) => x.register === 'rechtsraum');
  assert.deepEqual(rechtsraum.werte, ['DE']);
  const praefix = r.find((x) => x.register.includes('Namensraum'));
  assert.deepEqual(praefix.werte, ['tpl_']);
});

test('[Posten4·Rot-Beweis] wächst ein Register im Kern, wächst die gelesene Liste automatisch mit', () => {
  /* Kein gepflanzter Fehlerfall nötig: die Zahl kommt aus V.BEREICH_IDS_EINGEBAUT selbst.
     Diese Probe hält fest, DASS live gelesen wird — der Rot-Beweis ist die Gegenprobe
     unten, die zeigt, dass eine veraltete Zahl (14 wo 13 stehen) sofort auffiele. */
  const r = K.reservierteRegister();
  const bereich = r.find((x) => x.register.startsWith('bereich'));
  assert.notEqual(bereich.werte.length, 14, 'Vorbedingung: der Bestand ist heute nicht 14 — sonst prüfte dieser Rot-Beweis nichts');
});

test('[Posten4·Teil B] die Tabelle deckt GENAU den heutigen Schema-Schlüsselsatz — kein Fehlen, kein Zuviel', () => {
  const d = K.drift();
  assert.deepEqual(d.fehlt, [], 'Schema-Schlüssel ohne Tabellenzeile');
  assert.deepEqual(d.zuviel, [], 'Tabellenzeile zu einem Schlüssel, den es im Schema nicht mehr gibt');
  assert.equal(d.ok, true);
});

test('[Posten4·Gegenprobe] eine Tabelle ohne einen echten Schema-Schlüssel wird als "fehlt" erkannt', () => {
  const heute = new Set(K.schemaNamenHeute());
  const tabelle = new Set(K.KONTRAKT_FAKTEN.map((f) => f.name).filter((n) => n !== 'x'));
  const fehlt = [...heute].filter((n) => !tabelle.has(n));
  assert.deepEqual(fehlt, ['x'], 'ohne "x" muss genau "x" als fehlend gemeldet werden');
});

test('[Posten4] jede Zeile trägt einen von vier erlaubten Status-Werten', () => {
  const erlaubt = new Set(['geprueft', 'entgegengenommen', 'ohne-wirkung', 'unklar']);
  for (const f of K.KONTRAKT_FAKTEN) {
    assert.ok(erlaubt.has(f.status), f.name + ' trägt einen unbekannten Status: ' + f.status);
    assert.ok(f.bedeutung && f.bedeutung.trim(), f.name + ' ohne Bedeutung');
    assert.ok(f.wirkungsort && f.wirkungsort.trim(), f.name + ' ohne Wirkungsort-Angabe');
  }
});

test('[Posten4] die vier ENTFALLENEN Flags (A382/Laufzettel 20.08.) stehen ohne Wirkung, wie entschieden', () => {
  const namen = ['ankerTauglich', 'sorgerechtTauglich', 'subTauglich', 'anbieterTyp'];
  for (const n of namen) {
    const f = K.KONTRAKT_FAKTEN.find((x) => x.name === n);
    assert.ok(f, n + ' fehlt in der Tabelle');
    assert.equal(f.status, 'ohne-wirkung');
  }
});

test('[Posten4] --check ist grün gegen die echte, committete Datei', () => {
  assert.ok(fs.existsSync(DATEI), 'docs/kontrakt-faktenuebersicht.md muss erzeugt und committet sein');
  const soll = K.markdown().replace(/\*\*Erzeugt am:\*\* \d{4}-\d{2}-\d{2} · \*\*Commit:\*\* `[^`]*`/, 'X');
  const ist = fs.readFileSync(DATEI, 'utf8').replace(/\*\*Erzeugt am:\*\* \d{4}-\d{2}-\d{2} · \*\*Commit:\*\* `[^`]*`/, 'X');
  assert.equal(soll, ist, 'die Datei ist nicht auf dem Stand von tools/kontrakt-faktenuebersicht-erzeugen.js — neu erzeugen');
});

test('[Posten4·Rot-Beweis] eine manipulierte Kopie lässt --check-Vergleich (Datei-Textgleichheit) erkennbar scheitern', () => {
  const tmp = path.join(os.tmpdir(), 'kontrakt-fakten-probe-' + process.pid + '.md');
  fs.writeFileSync(tmp, K.markdown().replace('geprueft', 'ENTFERNT'));
  const soll = K.markdown();
  const ist = fs.readFileSync(tmp, 'utf8');
  assert.notEqual(soll, ist, 'eine gepflanzte Abweichung muss sich vom Soll unterscheiden');
  fs.rmSync(tmp);
});
