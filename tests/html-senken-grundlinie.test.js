'use strict';
/* Die Klasse hinter den drei Fundstellen von v842: jede Stelle, an der Code HTML aus einem Wert in die Seite setzt,
   steht mit Grund in tools/html-senken-grundlinie.json. Eine neue oder geänderte Senke ist rot, bis ihr Grund
   geprüft und mit Grund eingetragen ist. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { senken, senkenIn, grundlinieLesen, abgleichen, OFFEN } = require('../tools/lib/html-senken.js');
const G = { abgleichen, OFFEN, lesen: grundlinieLesen };

const REPO = path.join(__dirname, '..');

test('[HTML-Senken] jede Senke der Anwendungen steht mit Grund in der Grundlinie', () => {
  const ist = senken(REPO);
  assert.ok(ist.length >= 80, 'Positivkontrolle: die Senken werden gefunden (' + ist.length + ')');
  const { neu, weg, ohneGrund } = G.abgleichen(ist, G.lesen(REPO));
  assert.deepEqual(neu.map((s) => `${s.datei}:${s.zeile} (${s.funktion}) ${s.code}`), [], 'neue oder geänderte Senke — Grund prüfen und eintragen');
  assert.deepEqual(weg.map((e) => `${e.datei} (${e.funktion})`), [], 'Senke verschwunden — Liste neu schreiben');
  assert.deepEqual(ohneGrund.map((e) => `${e.datei}:${e.zeile}`), [], 'Senke ohne Grund');
});

test('[HTML-Senken·Rot-Beweis] eine neue Senke mit einem Wert wird gefunden, fester Text und Kommentare nicht', () => {
  const text = [
    'function zeigen(d) {',
    '  el.innerHTML = d.name;',
    '  el.innerHTML = \'<p>fest</p>\';',
    '  // el.innerHTML = d.kommentar;',
    '  el.insertAdjacentHTML(\'beforeend\', d.mehr);',
    '  el.innerHTML = \'<b>\' +',
    '    d.fortsetzung;',
    '}',
  ].join('\n');
  const s = senkenIn(text, 'probe.js');
  assert.deepEqual(s.map((x) => x.zeile), [2, 5, 6]);
  assert.ok(s.every((x) => x.funktion === 'zeigen'));
  const gl = { eintraege: s.slice(0, 2).map((x) => ({ datei: x.datei, abdruck: x.abdruck, anzahl: 1, grund: 'g' })) };
  assert.equal(G.abgleichen(s, gl).neu.length, 1, 'die dritte ist neu');
  assert.equal(G.abgleichen(s, { eintraege: [...gl.eintraege, { datei: 'probe.js', abdruck: 'x', anzahl: 1, grund: G.OFFEN }] }).ohneGrund.length, 1);
});

/* Senken ohne Probe (13.10.2026, Befund FREMDTEXT-KLASSE-NUR-EIN-REGISTER): der Grund einer Senke ist Prosa. Wo eine Probe
   die Senke mit fremdem Text fährt, steht sie im Feld `probe` des Eintrags. Die Zahl der Einträge ohne Probe steht als
   `ohneProbeDeckel` in tools/html-senken-grundlinie.json und darf nur sinken: genau gleich, nicht kleiner-gleich, damit
   eine neue Probe den Deckel im selben Commit senkt. */
const fs = require('node:fs');
function ohneProbe(eintraege) { return eintraege.filter((e) => !(Array.isArray(e.probe) && e.probe.length)); }
function probenFehlen(eintraege, repo) {
  return eintraege.flatMap((e) => (e.probe || []).filter((p) => !/^tests\/.+\.(test|spec)\.js$/.test(p) || !fs.existsSync(path.join(repo, p))).map((p) => e.funktion + ': ' + p));
}
test('[HTML-Senken·Probe] der Deckel der Senken ohne Probe ist genau ihre Zahl, jede genannte Probe gibt es', () => {
  const gl = G.lesen(REPO);
  const deckel = JSON.parse(fs.readFileSync(path.join(REPO, 'tools', 'html-senken-grundlinie.json'), 'utf8')).ohneProbeDeckel;
  assert.ok(Number.isInteger(deckel), 'Vorbedingung: ohneProbeDeckel steht in der Grundlinie');
  assert.equal(ohneProbe(gl.eintraege).length, deckel, 'Senken ohne Probe: Deckel und Bestand weichen ab (sinkt der Bestand, den Deckel im selben Commit senken)');
  assert.deepEqual(probenFehlen(gl.eintraege, REPO), [], 'genannte Probe fehlt');
});
test('[HTML-Senken·Probe·Rot-Beweis] eine Senke mehr ohne Probe und eine Probe, die es nicht gibt, fallen auf', () => {
  const e = [{ funktion: 'a', probe: ['tests/html-senken-grundlinie.test.js'] }, { funktion: 'b' }, { funktion: 'c', probe: ['tests/gibt-es-nicht.test.js'] }];
  assert.equal(ohneProbe(e).length, 1);
  assert.deepEqual(probenFehlen(e, REPO), ['c: tests/gibt-es-nicht.test.js']);
});
