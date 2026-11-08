'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   Die Frage nach einer bisherigen Zeile (Befund ANFRAGE-BISHERIGE-ZEILE-STILL, 05.11.2026; U2-ADR-467)
   ────────────────────────────────────────────────────────────────────────────
   Gemessen: ein Depot mit Straße, Hausnummer, Postleitzahl und Ort bekommt eine Anfrage nach identity.streetAddress und
   identity.postcodeCity (bisherige Zeilen, `nurMitWert`, `ersetztDurch`). Der Abgleich sagte der Bürgerin „vollständig“; die
   Antwort an die Stelle trug keine Anschrift und `zurueckgehalten.pflicht: 2`. Das Feld war leer, `nurMitWert` machte es
   unsichtbar, und die Zusammenstellung ließ es weg — weder in `felder` noch in `fehlend`.

   Jetzt beantwortet die Anfrage eine bisherige Zeile nach der einen Leseregel für Anschriften (`anschriftFuerAusgabe`): die
   bestätigten Teile, sonst die bisherige Zeile. Ist beides leer, steht das Feld als fehlend da — in Abgleich und Antwort gleich.

   Die Klasse: für jedes Feld jedes eingebauten Bereichs sagen Abgleich und Antwort dasselbe über „vollständig“, und ein
   Pflichtfeld zählt nur dann als zurückgehalten, wenn es sensibel ist.
   ════════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

const PW = 'bisherige-zeile-pw';

function anfrage(kennungen) {
  return { modulTyp: 'anfrage', anfrageVersion: 1, von: 'Standesamt Beispielstadt', zweck: 'Sterbeeintrag',
    grundlage: '§ 31 PStG', vorgang: 'S-2026-1', gueltigBis: '2099-12-31',
    felder: kennungen.map((kennung) => ({ kennung, zweck: 'letzter Wohnsitz', pflicht: true })),
    antwort: { art: 'einmalpasswort' } };
}
async function depot(werte) {
  const { V } = ladeKern();
  await V.depotAnlegen(PW);
  V.akteurSelbstErklaeren('Walter Beispiel');
  for (const [k, v] of Object.entries(werte)) V.sektorFeldSetzen('identity', k, v);
  return V;
}
const ZEILEN = ['identity.streetAddress', 'identity.postcodeCity'];
const werteVon = (ds) => Object.fromEntries(ds.felder.map((f) => [f.kennung, f.wert]));

test('[Bisherige Zeile·Messfall] ein Depot mit allen vier Teilen beantwortet die bisherigen Zeilen aus den Teilen', async () => {
  const V = await depot({ street: 'Beispielallee', houseNumber: '12', postalCode: '10000', city: 'Beispielstadt' });
  const ab = V.anfrageAbgleich(anfrage(ZEILEN));
  const ds = V.anfrageAntwortDatensatz(anfrage(ZEILEN), { sensibel: true });
  assert.equal(ds.zurueckgehalten.pflicht, 0, 'nichts zählt als zurückgehalten');
  assert.deepEqual(werteVon(ds), { 'identity.streetAddress': 'Beispielallee 12', 'identity.postcodeCity': '10000 Beispielstadt' });
  assert.equal(ds.vollstaendig, true);
  assert.equal(ab.vollstaendig, ds.vollstaendig, 'Abgleich und Antwort sagen dasselbe');
});

test('[Bisherige Zeile·Altbestand] ein Depot nur mit den bisherigen Zeilen antwortet wie bisher', async () => {
  const V = await depot({ streetAddress: 'Lindenweg 4', postcodeCity: '80331 München' });
  const ds = V.anfrageAntwortDatensatz(anfrage(ZEILEN), { sensibel: true });
  assert.deepEqual(werteVon(ds), { 'identity.streetAddress': 'Lindenweg 4', 'identity.postcodeCity': '80331 München' });
  assert.equal(ds.vollstaendig, true);
});

test('[Bisherige Zeile·Teilweise] nur der Ort eingetragen: die bisherige Zeile bleibt, wie auf dem Blatt', async () => {
  const V = await depot({ streetAddress: 'Lindenweg 4', postcodeCity: '80331 München', city: 'München' });
  const ds = V.anfrageAntwortDatensatz(anfrage(ZEILEN), { sensibel: true });
  assert.deepEqual(werteVon(ds), { 'identity.streetAddress': 'Lindenweg 4', 'identity.postcodeCity': '80331 München' });
});

test('[Bisherige Zeile·Leer] ohne Teile und ohne Zeile steht die Angabe als fehlend da, in Abgleich und Antwort', async () => {
  const V = await depot({});
  const ab = V.anfrageAbgleich(anfrage(ZEILEN));
  const ds = V.anfrageAntwortDatensatz(anfrage(ZEILEN), { sensibel: true });
  assert.deepEqual(ds.fehlend.map((f) => f.kennung), ZEILEN);
  assert.deepEqual(ab.fehlend.map((f) => f.kennung), ZEILEN);
  assert.equal(ds.zurueckgehalten.pflicht, 0);
  assert.equal(ab.vollstaendig, false);
  assert.equal(ds.vollstaendig, false);
});

/* Gegenlesung 05.11.2026 (Bedingung zum Fix): die bisherige Zeile trägt dieselbe Angabe wie ihre Teile. Hat die Person einen Teil
   als sensibel markiert, gilt die Zeile als sensibel — sonst ginge über die Frage nach der Zeile hinaus, was sie zurückhält. */
test('[Bisherige Zeile·Sensibel] Straße als sensibel markiert: die Frage nach der bisherigen Zeile hält sie zurück, PLZ und Ort nicht', async () => {
  const V = await depot({ street: 'Beispielallee', houseNumber: '12', postalCode: '10000', city: 'Beispielstadt' });
  V.sensibelFeldSetzen('identity', 'street', true);
  const ds = V.anfrageAntwortDatensatz(anfrage(ZEILEN), {});
  assert.deepEqual(Object.keys(werteVon(ds)), ['identity.postcodeCity'], 'die Straße geht nicht hinaus');
  assert.ok(!JSON.stringify(ds).includes('Beispielallee'), 'auch nicht in einer anderen Angabe');
  assert.equal(ds.zurueckgehalten.pflicht, 1);
  const ab = V.anfrageAbgleich(anfrage(ZEILEN));
  assert.deepEqual(ab.sensibelBetroffen, ['identity.streetAddress'], 'die Bürgerin sieht es vor der Freigabe');
  assert.equal(ab.vollstaendigMitVorgaben, ds.vollstaendig);
  // mit ausdrücklicher Freigabe geht sie mit
  assert.equal(werteVon(V.anfrageAntwortDatensatz(anfrage(ZEILEN), { sensibel: true }))['identity.streetAddress'], 'Beispielallee 12');
});

test('[Bisherige Zeile·Sensibel·Gegenprobe] nichts markiert: die bisherige Zeile ist nicht sensibel', async () => {
  const V = await depot({ street: 'Beispielallee', houseNumber: '12', postalCode: '10000', city: 'Beispielstadt' });
  const ds = V.anfrageAntwortDatensatz(anfrage(ZEILEN), {});
  assert.equal(ds.zurueckgehalten.pflicht, 0);
  assert.equal(werteVon(ds)['identity.streetAddress'], 'Beispielallee 12');
});

/* Die Klasse. `widerspruch` vergleicht, was die Bürgerin vor dem Senden liest, mit dem, was die Stelle bekommt: mit Freigabe
   des Sensiblen `vollstaendig`, mit den Vorgaben `vollstaendigMitVorgaben` (ein sensibles Pflichtfeld bleibt dann zurück, gewollt).
   Mit Freigabe des Sensiblen ist nichts zurückgehalten. */
function widerspruch(kennung, ab, ds, mitVorgaben) {
  if (!ab || !ab.ok || !ds) return null;
  const soll = mitVorgaben ? ab.vollstaendigMitVorgaben : ab.vollstaendig;
  if (soll !== ds.vollstaendig) return kennung + (mitVorgaben ? ' (Vorgaben)' : '') + ': Abgleich ' + soll + ', Antwort ' + ds.vollstaendig;
  if (!mitVorgaben && ds.zurueckgehalten && ds.zurueckgehalten.pflicht) return kennung + ': zurückgehalten trotz Freigabe';
  return null;
}
function alleFeldKennungen(V) {
  const aus = [];
  for (const s of V.SEKTOREN) for (const f of V.bereichFelder(s.id) || []) {
    if (f && typeof f.id === 'string' && !Array.isArray(f.unterFelder)) aus.push(s.id + '.' + f.id);
  }
  return aus;
}

test('[Bisherige Zeile·Klasse] für jedes Feld jedes eingebauten Bereichs sagen Abgleich und Antwort dasselbe — leer und gefüllt', async () => {
  const leer = await depot({});
  const voll = await depot({ street: 'Beispielallee', houseNumber: '12', postalCode: '10000', city: 'Beispielstadt' });
  const v = [];
  const kennungen = alleFeldKennungen(leer);
  assert.ok(kennungen.length > 100, 'die Klasse misst viele Felder: ' + kennungen.length);
  for (const V of [leer, voll]) for (const k of kennungen) {
    const a = anfrage([k]);
    const ab = V.anfrageAbgleich(a);
    // mit Freigabe des Sensiblen und mit den Vorgaben: ein sensibel zurückgehaltenes Pflichtfeld ist gewollt, sonst nichts
    for (const mitVorgaben of [false, true]) {
      const w = widerspruch(k, ab, V.anfrageAntwortDatensatz(a, mitVorgaben ? {} : { sensibel: true }), mitVorgaben);
      if (w) v.push(w);
    }
  }
  assert.deepEqual(v, [], v.slice(0, 10).join('\n'));
});

test('[Bisherige Zeile·Klasse·Rot-Beweis] ein vollständiger Abgleich gegen eine Antwort mit zurückgehaltenem Pflichtfeld fällt auf', () => {
  // der gemessene Fall vom 05.11.2026: Abgleich vollständig, Antwort mit zurueckgehalten.pflicht 2
  assert.match(widerspruch('x.y', { ok: true, vollstaendig: true }, { vollstaendig: false, zurueckgehalten: { pflicht: 2 } }, false), /Abgleich true, Antwort false/);
  assert.match(widerspruch('x.y', { ok: true, vollstaendig: false }, { vollstaendig: false, zurueckgehalten: { pflicht: 1 } }, false), /zurückgehalten trotz Freigabe/);
  assert.match(widerspruch('x.y', { ok: true, vollstaendigMitVorgaben: true }, { vollstaendig: false, zurueckgehalten: { pflicht: 1 } }, true), /Vorgaben/);
  assert.equal(widerspruch('x.y', { ok: true, vollstaendig: true, vollstaendigMitVorgaben: false }, { vollstaendig: false, zurueckgehalten: { pflicht: 1 } }, true), null, 'sensibel zurückgehalten mit den Vorgaben ist gewollt');
});
