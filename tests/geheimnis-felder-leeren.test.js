'use strict';
/* ═══════════════════════════════════════════════════════════════════════════
   Wächter: kein Geheimnis-Feld ohne Leerung (Befund 28.09.2026, HOCH)
   ───────────────────────────────────────────────────────────────────────────
   Der Befund: nach dem Öffnen stand das Passwort im versteckten Öffnen-Schirm weiter im value
   (Probe: tests/e2e-cross/T-CROSS-34-geheimnis-nach-eintritt.spec.js, Code-Weg in
   tests/e2e/wiederherstellungs-code.spec.js). Behoben an der einen Stelle, durch die jeder Weg in die
   App führt (betreteApp → _geheimnisFelderLeeren auf #overlay-inhalt).

   DIE KLASSE: ein NEUES Geheimnis-Feld (type="password" oder data-geheimnis) an einem Ort, der sich
   nicht leert, wäre derselbe Fehler an neuer Stelle. Darum steht jedes solche Feld im Kern in einer
   Funktion, die (a) einen Dialog über ui.modal baut — der leert seinen Inhalt beim Schließen —, oder
   (b) in den Öffnen-Schirm #overlay-inhalt schreibt, den betreteApp leert, oder (c) ein benannter
   Baustein ist, den nur (a)- oder (b)-Funktionen rufen. Alles andere ist rot, mit dem Funktionsnamen.
   Die Lese-App deckt die Laufzeit-Probe T-CROSS-34 ab (sie räumt ihr Formular beim Öffnen ab).
   ═══════════════════════════════════════════════════════════════════════════ */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const KERN = fs.readFileSync(path.join(__dirname, '..', 'vivodepot.html'), 'utf8');
const BAUSTEINE = new Set(['_whcCodeFeld']);   // (c): Feld-Bausteine, deren Aufrufer selbst (a) oder (b) sein müssen

function funktionen(quelle) {
  const zeilen = quelle.split('\n');
  const liste = [];
  zeilen.forEach((z, i) => {
    const m = z.match(/^(?:async )?function ([A-Za-z_$][\w$]*)\s*\(/);
    if (m) liste.push({ name: m[1], von: i });
  });
  liste.forEach((f, k) => { f.bis = k + 1 < liste.length ? liste[k + 1].von : zeilen.length; f.text = zeilen.slice(f.von, f.bis).join('\n'); });
  return liste;
}

function funde(quelle) {
  const fs_ = funktionen(quelle);
  const artVon = (f) => (/\bui\.modal\(/.test(f.text) ? 'dialog'
    : /getElementById\('overlay-inhalt'\)/.test(f.text) ? 'oeffnen-schirm' : null);
  const raus = [];
  for (const f of fs_) {
    if (!/<input[^>]*(?:type="password"|data-geheimnis)/.test(f.text)) continue;   // nur echte Felder, nicht Selektoren
    if (BAUSTEINE.has(f.name)) {
      const rufer = fs_.filter((g) => g.name !== f.name && new RegExp('\\b' + f.name + '\\(').test(g.text));
      if (!rufer.length) raus.push(f.name + ': Baustein ohne Aufrufer');
      for (const g of rufer) if (!artVon(g)) raus.push(f.name + ' ← ' + g.name + ': ruft den Baustein außerhalb eines Dialogs oder des Öffnen-Schirms');
      continue;
    }
    if (!artVon(f)) raus.push(f.name + ': Geheimnis-Feld außerhalb eines Dialogs und des Öffnen-Schirms — nichts leert es');
  }
  return raus;
}

test('[Geheimnis-Felder] jedes Geheimnis-Feld im Kern steht in einem Dialog oder im Öffnen-Schirm; beide werden geleert', () => {
  assert.deepEqual(funde(KERN), []);
  const betrete = funktionen(KERN).find((f) => f.name === 'betreteApp');
  assert.match(betrete.text, /_geheimnisFelderLeeren\(document\.getElementById\('overlay-inhalt'\)\)/, 'betreteApp leert den Öffnen-Schirm');
  assert.match(KERN, /const schliessen = \(\) => \{\s*host\.classList\.remove\('an'\); box\.innerHTML = '';/, 'ui.modal leert seinen Inhalt beim Schließen');
  const anzahl = (KERN.match(/type="password"/g) || []).length;
  assert.ok(anzahl >= 20, 'Ausbeute: die Suche findet die Passwortfelder (' + anzahl + ')');
  const rot = funde(KERN + '\nfunction zeigeNeuenSchirm() {\n  document.body.innerHTML += \'<input id="x" type="password">\';\n}\n');
  assert.ok(rot.length > 0, 'Rot-Beweis im Test: ein Passwortfeld außerhalb von Dialog und Öffnen-Schirm würde gefunden');
});

test('[Negativprobe] [Geheimnis-Felder·Rot-Beweis] ein Baustein, der außerhalb gerufen wird, und ein fehlendes Leeren in betreteApp fallen', () => {
  const baustein = KERN + '\nfunction irgendwoAnders() {\n  return _whcCodeFeld(\'y\', \'z\');\n}\n';
  assert.ok(funde(baustein).some((x) => x.startsWith('_whcCodeFeld ← irgendwoAnders')));
  const ohne = KERN.replace("_geheimnisFelderLeeren(document.getElementById('overlay-inhalt'));", '');
  assert.notEqual(ohne, KERN, 'Vorbedingung: der Aufruf steht im Kern');
  assert.doesNotMatch(funktionen(ohne).find((f) => f.name === 'betreteApp').text, /_geheimnisFelderLeeren\(/);
});
