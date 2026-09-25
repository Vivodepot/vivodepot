'use strict';
/* ═══════════════════════════════════════════════════════
   Wächter „ein Test, dem sein Fremdparser fehlt, wird rot statt übersprungen" (19.09.2026)
   ───────────────────────────────────────────────────────
   Der Fund: die Fremdparser-Ausgabetests (vcard-parser, ical.js) liefen in einem Arbeitsbaum ohne
   `npm ci` nicht — mit einer Modul-Fehlermeldung mitten in den Testtiteln, in einem Baum, dessen
   node_modules ein älterer Stand war. Dass sie rot wurden, war Glück der Bauart (require ohne
   try). Dieser Wächter macht es zur Regel und benennt die Ursache:
     1. Jedes externe Modul, das eine Test- oder Werkzeugdatei lädt, ist in package.json DEKLARIERT.
     2. Es ist in DIESEM Baum INSTALLIERT — sonst rot, mit dem Satz „npm ci / einsatzbereit machen".
     3. Keine Datei entzieht sich bei fehlendem Modul (MODULE_NOT_FOUND-Behandlung, Laden im
        try-Block, require.resolve, das ein skip steuert). Ein übersprungener Test sieht in der
        Zusammenfassung aus wie ein bestandener.
   Gehört nach tests/mit-modul/: er prüft gerade die externen Module (schicht-1).
   ═══════════════════════════════════════════════════════ */
const test = require('../helfer/nur-privat.js').testMitPrivat(__filename);   // nur-privat: s. tests/helfer/nur-privat.js
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { externeModule, entziehtSichBeiFehlendemModul, dateien } = require('../../tools/lib/fremdparser-fehlt.js');

const REPO = path.join(__dirname, '..', '..');
const PAKET = JSON.parse(fs.readFileSync(path.join(REPO, 'package.json'), 'utf8'));
const DEKLARIERT = new Set(Object.keys(PAKET.dependencies || {}).concat(Object.keys(PAKET.devDependencies || {})));
// Diese Datei und ihre Bibliothek enthalten gepflanzte Beispiele im Wortlaut.
const SELBST = /fremdparser-fehlt/;
const ALLE = dateien([path.join(REPO, 'tests'), path.join(REPO, 'tools')]).filter((p) => !SELBST.test(p));
const NUTZER = new Map();   // Modul → [Dateien]
for (const p of ALLE) {
  for (const n of externeModule(fs.readFileSync(p, 'utf8'))) NUTZER.set(n, (NUTZER.get(n) || []).concat(path.relative(REPO, p)));
}

test('[Fremdmodul·Ausbeute] die Suche findet die bekannten Fremdparser und ihre Nutzer', () => {
  assert.ok(NUTZER.has('vcard-parser') && NUTZER.has('ical.js'), 'die zwei Fremdparser müssen gefunden werden: ' + [...NUTZER.keys()].join(', '));
  assert.ok(NUTZER.size >= 4, 'Ausbeute: ' + NUTZER.size);
});

test('[Fremdmodul] jedes von Tests oder Werkzeugen geladene externe Modul ist in package.json deklariert', () => {
  const nichtDeklariert = [...NUTZER.keys()].filter((n) => !DEKLARIERT.has(n));
  assert.deepEqual(nichtDeklariert, [], 'Nicht in package.json (dependencies/devDependencies) — ein Baum mit npm ci hätte es nie: ' + nichtDeklariert.join(', '));
});

test('[Fremdmodul] jedes davon ist in DIESEM Baum installiert — sonst rot, nicht übersprungen', () => {
  const fehlend = [];
  for (const [n, nutzer] of NUTZER) {
    try { require.resolve(n + '/package.json', { paths: [REPO] }); } catch (e1) {
      try { require.resolve(n, { paths: [REPO] }); } catch (e2) { fehlend.push(n + ' (gebraucht von ' + nutzer.slice(0, 2).join(', ') + ')'); }
    }
  }
  assert.deepEqual(fehlend, [], 'Nicht installiert: ' + fehlend.join('; ')
    + '\nDen Baum einsatzbereit machen: `node tools/arbeitsbaum-einsatzbereit-machen.js` (führt `npm ci` aus). '
    + 'Ein Test, dem sein Fremdmodul fehlt, ist ein roter Befund, keine Auslassung.');
});

test('[Fremdmodul] keine Datei entzieht sich bei fehlendem Modul (kein Laden im try, kein MODULE_NOT_FOUND, kein skip über require.resolve)', () => {
  const entziehen = ALLE.filter((p) => entziehtSichBeiFehlendemModul(fs.readFileSync(p, 'utf8'))).map((p) => path.relative(REPO, p));
  assert.deepEqual(entziehen, [], 'Diese Dateien überspringen oder verschlucken ein fehlendes Modul: ' + entziehen.join(', '));
});

test('[Fremdmodul·Rot-Beweis] gepflanzte Ausweichmuster werden gefunden, ein gerades require nicht', () => {
  const gerade = "const P = require('vcard-parser');\ntest('x', () => P.parse('a'));";
  const imTry = "let P; try { P = require('vcard-parser'); } catch (e) { P = null; }";
  const fangen = "try { load(); } catch (e) { if (e.code === 'MODULE_NOT_FOUND') return; }\nconst P = require('ical.js');";
  const skipResolve = "const da = (() => { try { require.resolve('ical.js'); return true; } catch (_) { return false; } })();\ntest('x', { sk" + "ip: !da }, () => {});\nrequire('ical.js');";
  assert.equal(entziehtSichBeiFehlendemModul(gerade), false, 'ein gerades require entzieht sich nicht');
  assert.equal(entziehtSichBeiFehlendemModul(imTry), true, 'Laden im try-Block');
  assert.equal(entziehtSichBeiFehlendemModul(fangen), true, 'MODULE_NOT_FOUND-Behandlung');
  assert.equal(entziehtSichBeiFehlendemModul(skipResolve), true, 'skip über require.resolve');
  assert.deepEqual(externeModule("require('node:fs'); require('./x.js'); require('vcard-parser'); import('ical.js');"), ['ical.js', 'vcard-parser'], 'eingebaute und relative Module zählen nicht');
});

test('[Fremdmodul·Rot-Beweis] ein nicht installiertes Modul wird von der Auflösung als fehlend erkannt', () => {
  let gefunden = true;
  try { require.resolve('vd-nicht-installiertes-fremdmodul-probe', { paths: [REPO] }); } catch (_) { gefunden = false; }
  assert.equal(gefunden, false, 'die Auflösung, auf die der Installiert-Test baut, muss ein fehlendes Modul melden');
});
