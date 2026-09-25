'use strict';
/* ═══════════════════════════════════════════════════════════════════════
   Klassenwächter: jedes Depot im Gerätespeicher bleibt über die Oberfläche erreichbar
   ───────────────────────────────────────────────────────────────────────
   Befund (19.09.2026): „Doch neu anfangen“ auf einem geteilten Gerät ließ ein zweites Depot entstehen; der Sperrschirm
   öffnete nur den neuesten Record, das ältere blieb verschlüsselt unerreichbar. Die Tiefe (drei Depots, Passwörter,
   Rot-Beweis am Produkt) liegt in tests/e2e/mehrere-depots-im-geraetespeicher.spec.js. Dieser Wächter hält die Bauart:
     (1) das Laden aus dem Gerätespeicher geht über ALLE eigenen Records, nicht über `liste[0]`;
     (2) der Gerätespeicher wird an genau EINER Stelle gelöscht (das Depot der eigenen Sitzung, nachgelesen) und an genau
         EINER Stelle geschrieben — ein neuer Lösch- oder Überschreibweg fiele hier auf und brauchte eine bewusste Prüfung.
   ═══════════════════════════════════════════════════════════════════════ */
const test = require('node:test');
const assert = require('node:assert/strict');
const { kernRohLesen } = require('../tools/lib/kern-lesen.js');

function funktionsRumpf(quelle, kopf) {
  const a = quelle.indexOf(kopf);
  if (a < 0) throw new Error('Funktion nicht gefunden: ' + kopf);
  const e = quelle.indexOf('\n}\n', a);
  return quelle.slice(a, e + 3);
}
function befunde(quelle) {
  const f = [];
  const rumpf = funktionsRumpf(quelle, 'async function depotAusIdbLaden(');
  if (!/for \(const \w+ of liste\)/.test(rumpf)) f.push('depotAusIdbLaden geht nicht über alle Records');
  if (/liste\[0\]/.test(rumpf)) f.push('depotAusIdbLaden wählt liste[0]');
  const loeschen = (quelle.match(/VdStore\.loeschen\(/g) || []).length;
  if (loeschen !== 1) f.push('VdStore.loeschen an ' + loeschen + ' Stellen (erwartet: 1, browserKopieRaeumen)');
  const schreiben = (quelle.match(/VdStore\.setzen\(/g) || []).length;
  if (schreiben < 1 || schreiben > 2) f.push('VdStore.setzen an ' + schreiben + ' Stellen (erwartet: die eine Sicherung, plus Kommentar)');
  return f;
}

test('[Interne Depots erreichbar] das Laden geht über alle Records; Löschen und Schreiben haben je einen Ort', () => {
  assert.deepEqual(befunde(kernRohLesen()), []);
});

test('[Interne Depots erreichbar·Rot-Beweis] liste[0], eine Schleife ohne Records und ein zweiter Löschweg werden gemeldet', () => {
  const q = kernRohLesen();
  const nurErster = q.replace('for (const record of liste) {', 'for (const record of liste.slice(0, 1)) {');
  assert.notEqual(nurErster, q);
  const a = q.replace('for (const record of liste) {', 'const record = liste[0]; for (const _ of [1]) {');
  assert.ok(befunde(a).some((x) => /liste\[0\]|alle Records/.test(x)), 'liste[0] wird gemeldet: ' + JSON.stringify(befunde(a)));
  const b = q.replace('await VdStore.loeschen(aktuelleDepotUUID);', 'await VdStore.loeschen(aktuelleDepotUUID); await VdStore.loeschen("x");');
  assert.ok(befunde(b).some((x) => /loeschen/.test(x)), 'ein zweiter Löschweg wird gemeldet');
  const c = q.replace('await VdStore.setzen(record);', 'await VdStore.setzen(record); await VdStore.setzen({ id: "y" }); await VdStore.setzen({ id: "z" });');
  assert.ok(befunde(c).some((x) => /setzen/.test(x)), 'ein weiterer Schreibweg wird gemeldet');
});
