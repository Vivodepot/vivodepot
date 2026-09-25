'use strict';
/* SIT1 — welche Dokumenttypen auf einem Angehörigen-Blatt erscheinen, legt das BLATT der Vorlage fest
   (`dokumenttypen`), nicht der Kern. Ausgangsbelegung der Ab-Werk-Vorlage: die Typen, die das Blatt schon
   über `instrument:<typ>` zieht — sichtbar als „Vorschlag" markiert (`dokumenttypenVorschlag`), damit sie im
   Template geändert werden kann. Ein Testament erscheint nie auf dem Krankenhausblatt. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { ladeKern } = require('./load-kern.js');
const { ladeLesen } = require('./load-lesen.js');

const NAMEN = { will: 'Mein Testament (Probe)', 'living-will': 'Meine Patientenverfügung (Probe)', 'enduring-power-of-attorney': 'Meine Vorsorgevollmacht (Probe)', 'custodianship-declaration': 'Meine Betreuungsverfügung (Probe)' };
const DOKUMENTE = Object.keys(NAMEN).map((typ) => ({ typ, name: NAMEN[typ], sektorId: 'advanceCare', gueltigAb: '2025-03-04' }));
const VORLAGE_DE = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'tools', 'angehoerigen-vorlagen', 'vivodepot-angehoerigen-de.json'), 'utf8'));

async function kern(extraDokumente) {
  const K = ladeKern();
  const { V } = K;
  await V.depotAnlegen('pw-blatt-dokumente');
  V.akteurSelbstErklaeren('D');
  for (const d of DOKUMENTE.concat(extraDokumente || [])) V.dokumentAnlegen(d);
  V.betreteApp();
  return K;
}
function blattHtml(K, id) {
  assert.equal(K.V.oeffneAngehoerigenBlatt(id), true, 'Blatt ' + id + ' öffnet');
  return K.document.getElementById('content').innerHTML;
}
function lese(dokumente, vorlage) {
  const { V } = ladeLesen();
  const obj = { schemaVersion: 83, menschen: [], urheberschaft: {}, mappe: [], feldDefinitionen: [], sensibelFelder: {}, sektoren: {},
    dokumente, abWerkMitschrift: { angehoerigen: [vorlage || VORLAGE_DE] } };
  V._foldVollmachtenLesen(obj);
  V.setData(obj);
  return V;
}
const eigenesBlatt = (dokumenttypen, vorschlag) => ({
  modulTyp: 'angehoerigenVorlage', moduleVersion: 1, herkunft: 'test-dok', sprache: 'de',
  situationen: { 'test-blatt': { titel: 'Testblatt', icon: 'users', dokumenttypen, dokumenttypenVorschlag: vorschlag, bloecke: [{ id: 'b', titel: 'B', eintraege: [{ quelle: 'identity', feld: 'givenName' }] }] } },
});

test('[Ausgangsbelegung] die Ab-Werk-Vorlage nennt je Blatt genau die instrument:-Typen, als Vorschlag markiert', () => {
  for (const [id, blatt] of Object.entries(VORLAGE_DE.situationen)) {
    const ist = blatt.bloecke.flatMap((b) => b.eintraege).map((e) => e.feld).filter((f) => f.startsWith('instrument:')).map((f) => f.slice(11));
    if (!ist.length) { assert.equal(blatt.dokumenttypen, undefined, id + ': ohne Instrument keine Dokumenttypen'); continue; }
    assert.deepEqual(blatt.dokumenttypen, ist, id);
    assert.equal(blatt.dokumenttypenVorschlag, true, id + ' ist als Vorschlag markiert');
  }
});

test('[Kern·Negativkontrolle] ein Testament erscheint nie auf dem Krankenhausblatt; die Vorsorgepapiere des Blatts schon, als Vorschlag markiert', async () => {
  const K = await kern();
  const html = blattHtml(K, 'krankenhausakut');
  assert.ok(html.includes(NAMEN['living-will']) && html.includes(NAMEN['enduring-power-of-attorney']));
  assert.ok(!html.includes(NAMEN.will), 'Testament nie auf dem Krankenhausblatt');
  assert.ok(!html.includes(NAMEN['custodianship-declaration']));
  assert.ok(html.includes('Dokumente &amp; Prüftermine (Vorschlag)'), 'Titel trägt die Vorschlags-Marke');
});

test('[Kern] das Blatt „Behörden und Nachlass" zeigt das Testament, das Pflegeheimblatt die Betreuungsverfügung', async () => {
  const K = await kern();
  assert.ok(blattHtml(K, 'behoerden_nachlass').includes(NAMEN.will));
  const pflege = blattHtml(K, 'pflegeheimakut');
  assert.ok(pflege.includes(NAMEN['custodianship-declaration']) && !pflege.includes(NAMEN.will) && !pflege.includes(NAMEN['living-will']));
});

test('[Kern] Situationsblatt-Modell (PDF/JSON): dieselbe Auswahl, kein Testament im Krankenhausblatt', async () => {
  const { V } = await kern();
  const alle = JSON.stringify(V.situationModell(V._angSituationById('krankenhausakut')));
  assert.ok(alle.includes(NAMEN['living-will']) && !alle.includes(NAMEN.will));
});

test('[Kern] ein sensibles Dokument: Name und Freigabe-Satz, nie „nicht hinterlegt"', async () => {
  const K = await kern([{ typ: 'living-will', name: 'Geheime Verfügung (Probe)', sektorId: 'advanceCare', sensibel: true }]);
  const html = blattHtml(K, 'krankenhausakut');
  const zeile = html.match(/<div class="feld-zeile"><div class="feld-label">Geheime Verfügung \(Probe\)<\/div>(.*?)<\/div><\/div>/s);
  assert.ok(zeile && zeile[1].includes(K.V.STRINGS.zurueckgehaltenVorhanden) && zeile[1].includes('zurueckgehalten-marke'));
});

test('[Kern · das Blatt entscheidet] eine Vorlage mit anderer Zuordnung wird befolgt, ohne Dokumenttypen zeigt das Blatt keine', async () => {
  const K = await kern();
  const { V } = K;
  V.ankerDaten().angehoerigenVorlagenModule.push(Object.assign({ ungeprueft: false }, eigenesBlatt(['will'], false)));
  V._angehoerigenVorlagenAusDepotAnmelden(V.ankerDaten());
  const html = blattHtml(K, 'test-blatt');
  assert.ok(html.includes(NAMEN.will), 'das Blatt nennt das Testament — der Kern folgt');
  assert.ok(!html.includes('(Vorschlag)'), 'ohne Vorschlags-Flag keine Marke');
  const ohne = ladeKern();
  await ohne.V.depotAnlegen('pw-ohne'); ohne.V.akteurSelbstErklaeren('E');
  ohne.V.dokumentAnlegen(DOKUMENTE[0]);
  ohne.V.ankerDaten().angehoerigenVorlagenModule.push(Object.assign({ ungeprueft: false }, eigenesBlatt(undefined, undefined)));
  ohne.V._angehoerigenVorlagenAusDepotAnmelden(ohne.V.ankerDaten());
  ohne.V.betreteApp();
  assert.ok(!blattHtml(ohne, 'test-blatt').includes('ang-dokumente'), 'ohne dokumenttypen kein Dokumente-Abschnitt');
});

test('[Prüfer] ungültige dokumenttypen verwerfen das Blatt, benannt — in Kern und Lese-App', () => {
  const { V } = ladeKern();
  const { V: L } = ladeLesen();
  for (const schlecht of [['Testament!'], [1], 'will', ['a'.repeat(50)]]) {
    const rk = V.angehoerigenVorlagePruefen(eigenesBlatt(schlecht, false));
    assert.equal(rk.gueltig, false, JSON.stringify(schlecht));
    assert.ok(rk.verworfene.some((v) => v.id === 'test-blatt' && v.grund === 'dokumenttypen'));
    const rl = L.angehoerigenVorlagePruefenLesen(eigenesBlatt(schlecht, false));
    assert.equal(rl.gueltig, false);
  }
  assert.equal(V.angehoerigenVorlagePruefen(eigenesBlatt(['will'], 'ja')).gueltig, false, 'Vorschlags-Flag muss boolesch sein');
});

test('[Lese-App] dieselbe Auswahl: kein Testament auf dem Krankenhausblatt, Vorschlags-Marke, sensibel zurückgehalten', () => {
  const V = lese(DOKUMENTE.concat([{ typ: 'enduring-power-of-attorney', name: 'Geheime Vollmacht (Probe)', sektorId: 'advanceCare', sensibel: true }]));
  const html = V.angehoerigenBlattHTML('krankenhausakut');
  assert.ok(html.includes(NAMEN['living-will']) && html.includes(NAMEN['enduring-power-of-attorney']));
  assert.ok(!html.includes(NAMEN.will), 'Testament nie auf dem Krankenhausblatt');
  assert.ok(html.includes('Dokumente &amp; Prüftermine (Vorschlag)'));
  assert.ok(html.includes('Gültig ab: 04.03.25') || html.includes('Gültig ab: 04.03.2025'), 'Datum wie im Kern');
  assert.ok(html.includes('zurueckgehalten-marke') && html.includes('Geheime Vollmacht (Probe)'));
  assert.ok(V.angehoerigenBlattHTML('behoerden_nachlass').includes(NAMEN.will));
});

test('[Lese-App] ohne passendes Dokument kein Abschnitt', () => {
  const html = lese([]).angehoerigenBlattHTML('krankenhausakut');
  assert.ok(!html.includes('Prüftermine'));
});
