'use strict';
/* Die Sicherung wird zur Probe geöffnet (11.10.2026, Befund SICHERUNG-NIE-ZUR-PROBE-GEOEFFNET)
   Die Anwendung schreibt die Sicherungsdatei und liest sie nie zurück: `depotInDateiSichern` und `sicherungskopieErstellen`
   enthalten kein Öffnen der geschriebenen Datei, der Zustand „unbestätigt“ bleibt stehen (U2-ADR-031: „Bewusst nicht gebaut,
   offen zur Abnahme“). Eine abgeschnittene oder nicht angekommene Datei fällt erst beim Wiederherstellen auf.

   Diese Probe ist die ERWARTETE RÖTE des Befunds. Sie beschreibt, was die Rücklese-Funktion leisten muss, und wird grün, sobald
   sie gebaut ist; dann fällt das `todo` und seine Zeile in der Liste der ausgesetzten Proben.
   Vertrag: `sicherungPruefen(text)` öffnet NUR im Speicher mit dem Schlüssel der offenen Sitzung und schreibt nie. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

const PW = 'sicherung-probe-pw';
async function depotMit(name) {
  const { V } = ladeKern();
  await V.depotAnlegen(PW);
  V.akteurSelbstErklaeren(name);
  V.sektorFeldSetzen('identity', 'givenName', name);
  return V;
}

/* Der Text einer Sicherung: die Hülle des offenen Depots als JSON, wie sie in die Datei geht (ohne den Dateikopf davor). */
async function sicherungsText(V) { return JSON.stringify(await V.depotSerialisieren()); }

/* Der Vertrag als Funktion: `pruefen(text)` ist die Rücklese-Funktion, `V` das offene Depot. So misst der Rot-Beweis unten
   dieselben Aussagen an einer Attrappe, die nichts prüft. */
async function vertragPruefen(V, pruefen) {
  const alt = await sicherungsText(V);
  V.sektorFeldSetzen('identity', 'familyName', 'Beispiel');
  const heil = await sicherungsText(V);
  const vorher = await sicherungsText(V);

  const gut = await pruefen(heil);
  assert.equal(gut.gehtAuf, true, 'eine heile Sicherung des offenen Depots geht auf');
  assert.ok(gut.stand, 'und nennt ihren Stand');
  assert.equal(gut.aelter, false);

  const mitte = Math.floor(heil.length / 2);
  const veraendert = heil.slice(0, mitte) + (heil[mitte] === 'A' ? 'B' : 'A') + heil.slice(mitte + 1);
  assert.equal((await pruefen(veraendert)).gehtAuf, false, 'ein verändertes Zeichen: geht nicht auf');
  assert.equal((await pruefen(heil.slice(0, mitte))).gehtAuf, false, 'abgeschnitten: geht nicht auf');
  assert.equal((await pruefen('')).gehtAuf, false, 'leer: geht nicht auf');

  const fremd = await sicherungsText(await depotMit('Fremd'));
  const f = await pruefen(fremd);
  assert.equal(f.gehtAuf, false, 'die Datei eines anderen Depots ist nicht die Sicherung dieses Depots');
  assert.equal(f.grund, 'anderes-depot', 'und das wird gesagt, nicht als Schaden gemeldet');

  const a = await pruefen(alt);
  assert.equal(a.gehtAuf, true, 'eine ältere Sicherung desselben Depots geht auf');
  assert.equal(a.aelter, true, 'und sagt, dass sie einen älteren Stand trägt; das ist kein Fehler');

  assert.equal((await sicherungsText(V)).length, vorher.length, 'das Prüfen hat am offenen Depot nichts geändert');
  assert.equal(V.getData().sektoren.identity.familyName, 'Beispiel', 'und der offene Stand ist derselbe wie vorher');
}

test('[Sicherung·Probe-Öffnen] heil geht auf und nennt den Stand; verändert, abgeschnitten und fremd gehen nicht auf; eine ältere Sicherung nennt ihren Stand',
  { todo: 'Befund SICHERUNG-NIE-ZUR-PROBE-GEOEFFNET (HOCH): die Rücklese-Funktion sicherungPruefen fehlt; Eigentümer Kern-Strang' },
  async () => {
    const V = await depotMit('Erna');
    assert.equal(typeof V.sicherungPruefen, 'function', 'der Kern bietet das Zurücklesen einer geschriebenen Sicherung an');
    await vertragPruefen(V, (text) => V.sicherungPruefen(text));
  });

test('[Sicherung·Probe-Öffnen·Rot-Beweis] eine Funktion, die jede Datei für heil erklärt, besteht den Vertrag nicht', async () => {
  const V = await depotMit('Erna');
  const immerHeil = async () => ({ gehtAuf: true, grund: null, stand: '2026-10-11T00:00:00.000Z', aelter: false });
  await assert.rejects(() => vertragPruefen(V, immerHeil), /geht nicht auf/, 'die Attrappe fällt am ersten beschädigten Fall');
});
