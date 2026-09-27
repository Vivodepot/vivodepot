'use strict';
/* Bereiche als Bausteine der Empfängerkreis-Fächer (U2-ADR-156, V4-Umschlag; Auftrag 23.09.2026): neben den
   Anlass-Bausteinen ist JEDER Bereich des Produkts ein Baustein — in jedem Depot gleich, für Anker und Sub. Ein Fach
   mit [Gesundheit, Wohnen] trägt genau deren Werte und KEINEN Wert eines dritten Bereichs. Geprüft wird der WERT,
   nicht der Schlüssel; die Marker sind je Bereich einmalig. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

const PW = 'Bereiche-2026!';

async function depotMitMarkern() {
  const { V } = ladeKern();
  await V.depotAnlegen(PW);
  const d = V.getData();
  d.sektoren.identity = { givenName: 'Anna', familyName: 'Muster' };
  d.sektoren.health = { bloodType: 'MARKER-GESUNDHEIT' };
  d.sektoren.housing = { residenceType: 'MARKER-WOHNEN' };
  d.sektoren.finance = { bankName: 'MARKER-FINANZEN' };
  return { V, d };
}
const werte = (subset) => JSON.stringify(subset);

test('[Bereichsbausteine·Klasse·Rot-Beweis] jeder Bereich des Produkts ist als Baustein wählbar — abgeleitet aus bereicheAlle()', async () => {
  const { V } = await depotMitMarkern();
  const bereiche = V.bereicheAlle().map((s) => s.id);
  assert.ok(bereiche.length >= 7, 'Kontrolle: das Produkt trägt Bereiche (' + bereiche.length + ')');
  const bausteine = new Set(V.empfaengerBausteineAlle().map((b) => b.id));
  const fehlt = bereiche.filter((id) => !bausteine.has('bereich:' + id));
  assert.deepEqual(fehlt, [], 'Bereiche ohne Baustein');
});

test('[Bereichsbausteine·Rot-Beweis] ein Fach mit [Gesundheit, Wohnen] trägt deren Werte und keinen Wert aus Finanzen', async () => {
  const { V } = await depotMitMarkern();
  const w = werte(V.empfaengerZuschnittModell({ id: 'k1', name: 'Vertretung', bausteine: ['bereich:health', 'bereich:housing'] }));
  assert.match(w, /MARKER-GESUNDHEIT/);
  assert.match(w, /MARKER-WOHNEN/);
  assert.doesNotMatch(w, /MARKER-FINANZEN/);
});

test('[Bereichsbausteine·Gegenprobe] ein Fach nur mit Finanzen trägt Finanzen und weder Gesundheit noch Wohnen', async () => {
  const { V } = await depotMitMarkern();
  const w = werte(V.empfaengerZuschnittModell({ id: 'k2', name: 'Steuerberatung', bausteine: ['bereich:finance'] }));
  assert.match(w, /MARKER-FINANZEN/);
  assert.doesNotMatch(w, /MARKER-GESUNDHEIT|MARKER-WOHNEN/);
});

test('[Bereichsbausteine] ein beim Anlegen leerer Bereich gibt frei, was später in ihm steht — der Zuschnitt folgt dem Inhalt', async () => {
  const { V, d } = await depotMitMarkern();
  const kreis = { id: 'k3', name: 'Vertretung', bausteine: ['bereich:assets'] };
  assert.doesNotMatch(werte(V.empfaengerZuschnittModell(kreis)), /MARKER-VERMOEGEN/);
  d.sektoren.assets = { realEstateDescription: 'MARKER-VERMOEGEN' };
  assert.match(werte(V.empfaengerZuschnittModell(kreis)), /MARKER-VERMOEGEN/);
});

test('[Bereichsbausteine] die harte Sperre gilt auch für Bereichsbausteine: nichts aus EMPFAENGER_NIE', async () => {
  const { V } = await depotMitMarkern();
  const alle = V.bereicheAlle().map((s) => 'bereich:' + s.id);
  const subset = V.empfaengerZuschnittModell({ id: 'k4', name: 'Alles', bausteine: alle });
  for (const schluessel of Object.keys(subset)) assert.ok(!V.EMPFAENGER_NIE.has(schluessel), schluessel);
  assert.equal(subset.empfaengerkreise, undefined);
});

/* ══ Die Abnahme: das Fach in der Datei, geöffnet mit dem Fachpasswort, gegen jede Ausgabe ══════════════════════
   Gesammelt wird mit tests/lib/ausgaben-sammeln.js (Seitenleiste, jede Bereichs- und Situationsansicht, Modelle,
   Vollexport, alle Exportformate). Positivkontrolle je Marker: dieselbe Datei mit dem Passwort der Inhaberin findet ihn. */
const { ausgabenSammeln, geworfen, fundstellen } = require('./lib/ausgaben-sammeln.js');
const PW_FACH = 'Vertretung-2026!';
const M = { gesundheit: 'MARKER-ABN-GESUNDHEIT', wohnen: 'MARKER-ABN-WOHNEN', finanzen: 'MARKER-ABN-FINANZEN', vermoegen: 'MARKER-ABN-VERMOEGEN' };

async function dateiMitFach(bausteine, fuellen) {
  const { V } = ladeKern();
  await V.depotAnlegen(PW);
  const d = V.getData();
  d.sektoren.identity = { givenName: 'Anna', familyName: 'Muster' };
  fuellen(d);
  V.setData(d);
  await V.empfaengerkreisSetzen({ name: 'Vertretung', bausteine });
  await V.empfaengerkreisFachEinrichten(V.empfaengerkreiseListe()[0], PW_FACH);
  return { V, datei: async () => JSON.parse(JSON.stringify(await V.depotSerialisierenV4())) };
}
async function geoeffnet(datei, pw) {
  const { V, document } = ladeKern();
  await V.depotLaden(datei, pw);
  const aus = ausgabenSammeln(V, document);
  assert.deepEqual(geworfen(aus), [], 'keine Ausgabe wirft — sonst wäre der Scanner auf ihr blind');
  assert.ok(Object.keys(aus).length > 10, 'Kontrolle: der Scanner sieht die Ausgaben (' + Object.keys(aus).length + ')');
  return aus;
}
const alleVier = (d) => {
  d.sektoren.health = { chronicConditionsDiagnoses: M.gesundheit };
  d.sektoren.housing = { streetHouseNumber: M.wohnen };
  d.sektoren.finance = { taxNumber: M.finanzen };
};

test('[Bereichsbausteine·Abnahme·Rot-Beweis] Fach [Gesundheit, Wohnen], mit dem Fachpasswort geöffnet: Finanzen in keiner Ausgabe, Gesundheit sichtbar', async () => {
  const { datei } = await dateiMitFach(['bereich:health', 'bereich:housing'], alleVier);
  const u = await datei();
  const inhaberin = await geoeffnet(u, PW);
  for (const [name, marker] of Object.entries({ gesundheit: M.gesundheit, wohnen: M.wohnen, finanzen: M.finanzen })) {
    assert.ok(fundstellen(inhaberin, marker).length > 0, 'Positivkontrolle: die Inhaberin sieht ' + name + ' in mindestens einer Ausgabe');
  }
  const fach = await geoeffnet(u, PW_FACH);
  assert.deepEqual(fundstellen(fach, M.finanzen), [], 'Finanzen in 0 von ' + Object.keys(fach).length + ' Ausgaben');
  assert.ok(fundstellen(fach, M.gesundheit).length > 0, 'Gesundheit sichtbar');
  assert.ok(fundstellen(fach, M.wohnen).length > 0, 'Wohnen sichtbar');
});

test('[Bereichsbausteine·Abnahme] ein beim Einrichten leerer Bereich steht nach dem nächsten Schreiben im Fach — gemessen am V4-Schreibweg', async () => {
  const { V, datei } = await dateiMitFach(['bereich:assets'], (d) => { d.sektoren.health = { chronicConditionsDiagnoses: M.gesundheit }; });
  const vorher = await geoeffnet(await datei(), PW_FACH);
  assert.deepEqual(fundstellen(vorher, M.vermoegen), [], 'Kontrolle: vorher steht nichts darin');
  const d = V.getData();
  d.sektoren.assets = { homeSize: M.vermoegen };
  V.setData(d);
  const nachher = await geoeffnet(await datei(), PW_FACH);
  assert.ok(fundstellen(nachher, M.vermoegen).length > 0, 'nach dem nächsten Schreiben trägt das Fach den neuen Inhalt');
  assert.deepEqual(fundstellen(nachher, M.gesundheit), [], 'und weiterhin nichts aus einem nicht gewählten Bereich');
});


test('[Bereichsbausteine·Dialog] die Häkchenliste zeigt genau die Bereiche der Seitenleiste — und jeden schon gewählten, auch einen ausgeblendeten', async () => {
  const { V } = await depotMitMarkern();
  const seitenleiste = V.bereicheNachClusterSichtbar().flatMap((g) => g.bereiche.map((s) => 'bereich:' + s.id)).sort();
  assert.ok(seitenleiste.length > 0, 'Kontrolle: die Seitenleiste zeigt Bereiche');
  assert.deepEqual(V._kreisBereichsbausteineSichtbar(new Set()).sort(), seitenleiste);
  const alle = V.bereicheAlle().map((s) => 'bereich:' + s.id).sort();
  assert.deepEqual(V._kreisBereichsbausteineSichtbar(new Set(alle)).sort(), alle, 'ein gewähltes Häkchen verschwindet nie aus dem Dialog');
});
