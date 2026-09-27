'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   Die Ablaufmarke in der Listenzeile (Kreise-Laufzettel Posten 5)
   ────────────────────────────────────────────────────────────────────────────
   `kreditkarten[].karte_gueltig` und `weitere_wohnungen[].mietvertrag_befristet_bis`
   tragen ihre Marke wieder. Am 18.08. war sie gefallen (A320), weil
   `data.feldGueltigkeit` flach ist: für beliebig viele Karten gäbe es einen
   einzigen Schlüssel, und zwei Wohnungen kollidierten zusätzlich mit dem
   gleichnamigen Sektorfeld.

   WAS SICH GEÄNDERT HAT, ist nicht der Schlüsselraum, sondern die Frage: die
   Marke muss den Wert nicht UMZIEHEN. Die Zeile trägt ihr Datum selbst und seit
   A319 eine stabile `id`; der Prüftermin wird daraus GELESEN.

   **Kein neuer Schlüssel, keine Migrationsstufe** — das ist die Belegpflicht des
   Auftrags („zu belegen, nicht anzunehmen"), und sie hat hier eine eigene Probe.
   ════════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

const PW = 'zeilen-probe-2026';
const HEUTE = new Date('2026-08-21T00:00:00Z');

async function depotMitZeilen() {
  const { V } = ladeKern();
  await V.depotAnlegen(PW);
  V.akteurSelbstErklaeren('Tester');
  V.listenEintragHinzufuegen('finance', 'creditCards', { providerLast4Digits: 'Visa Sparkasse', validUntil: '2026-09-30' });
  V.listenEintragHinzufuegen('finance', 'creditCards', { providerLast4Digits: 'Mastercard', validUntil: '2026-06-01' });
  V.listenEintragHinzufuegen('housing', 'furtherHomes', { streetHouseNumber: 'Lindenweg 4', tenancyAgreementFixedTermUntil: '2027-03-31' });
  return V;
}

/* ══ Die Marke ist zurück — und sie wirkt ══════════════════════════════════ */

test('[Zeile] beide Unterfelder tragen die Marke wieder', () => {
  const { V } = ladeKern();
  const karte = V.SEKTOR_BY_ID.finance.sektionen.flatMap((s) => s.felder || [])
    .find((f) => f.id === 'creditCards').unterFelder.find((u) => u.id === 'validUntil');
  const wohnung = V.SEKTOR_BY_ID.housing.sektionen.flatMap((s) => s.felder || [])
    .find((f) => f.id === 'furtherHomes').unterFelder.find((u) => u.id === 'tenancyAgreementFixedTermUntil');
  assert.deepEqual(karte.marken, ['laeuftAb']);
  assert.deepEqual(wohnung.marken, ['laeuftAb']);
});

test('[Zeile·Rot-Beweis] jede Zeile bekommt IHREN eigenen Prüftermin', async () => {
  const V = await depotMitZeilen();
  const liste = V.prueftermineZeilen(HEUTE);
  assert.equal(liste.length, 3, 'zwei Karten und eine Wohnung — nicht ein Termin für alle');
  const nach = Object.fromEntries(liste.map((r) => [r.name, r]));
  assert.equal(nach['Kreditkarten · Mastercard — Gültig bis'].stufe, 'rot', 'abgelaufen');
  assert.equal(nach['Kreditkarten · Visa Sparkasse — Gültig bis'].stufe, 'gruen', 'noch hin');
  // GENAU DER FALL, an dem die Marke am 18.08. scheiterte: zwei Zeilen, ein flacher Schlüssel.
  assert.notEqual(nach['Kreditkarten · Mastercard — Gültig bis'].faelligAm,
    nach['Kreditkarten · Visa Sparkasse — Gültig bis'].faelligAm);
});

test('[Zeile] die Kennung trägt die ZEILEN-id, nicht die Position', async () => {
  const V = await depotMitZeilen();
  const d = V.getData();
  const ids = d.sektoren.finance.creditCards.map((z) => z.id);
  const vorher = V.prueftermineZeilen(HEUTE).filter((r) => r.id.includes('creditCards'));
  // Umsortieren — der Termin muss bei SEINER Karte bleiben.
  d.sektoren.finance.creditCards.reverse();
  V.setData(d);
  const nachher = V.prueftermineZeilen(HEUTE).filter((r) => r.id.includes('creditCards'));
  const paar = (r) => r.id + '|' + r.faelligAm;
  assert.deepEqual(nachher.map(paar).sort(), vorher.map(paar).sort(),
    'eine umsortierte Liste darf den Termin nicht auf eine andere Karte zeigen lassen');
  assert.ok(vorher.every((r) => ids.some((id) => r.id.includes(id))));
});

test('[Zeile] die Wohnung kollidiert NICHT mit dem gleichnamigen Sektorfeld', async () => {
  const V = await depotMitZeilen();
  V.sektorFeldSetzen('housing', 'tenancyAgreementFixedTermUntil', '2028-12-31');   // die HAUPTwohnung
  const zeilen = V.prueftermineZeilen(HEUTE);
  const felder = V.prueftermineFelder(HEUTE);
  assert.equal(zeilen.filter((r) => r.faelligAm === '2027-03-31').length, 1, 'die Zweitwohnung');
  assert.ok(felder.some((r) => r.ablaufDatum === '2028-12-31'), 'die Hauptwohnung, über feldGueltigkeit');
  // Das war der ZWEITE Grund, aus dem die Marke am 18.08. fiel — er ist gegenstandslos.
});

test('[Zeile] eine Zeile ohne Datum ergibt keinen Termin', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen(PW);
  V.akteurSelbstErklaeren('Tester');
  V.listenEintragHinzufuegen('finance', 'creditCards', { providerLast4Digits: 'Ohne Datum' });
  V.listenEintragHinzufuegen('finance', 'creditCards', { providerLast4Digits: 'Kaputt', validUntil: 'demnächst' });
  assert.deepEqual(V.prueftermineZeilen(HEUTE), []);
});

test('[Zeile] generisch über die Marke, nicht über zwei Feldnamen', () => {
  const { V } = ladeKern();
  /* Ein drittes Listen-Unterfeld mit der Marke erschiene von selbst. Geprüft wird das an der
     Auswahlregel: `prueftermineZeilen` liest die Marken der Unterfelder, nicht eine Liste
     von Kennungen. Namenswissen im Kern ist die Häufung, die A294 aufgelöst hat. */
  const quelle = require('node:fs').readFileSync(require('./load-kern.js').HTML_PATH || 'vivodepot.html', 'utf8');
  const block = quelle.slice(quelle.indexOf('function prueftermineZeilen'));
  const kopf = block.slice(0, block.indexOf('\n}'));
  assert.ok(!/kreditkarten|weitere_wohnungen/.test(kopf),
    'die Funktion darf die zwei Felder NICHT beim Namen kennen');
  assert.ok(/marken.*laeuftAb/.test(kopf), 'sie wählt über die Marke');
});

test('[Zeile] die Zeilen-Termine stehen in DERSELBEN Liste wie die übrigen', async () => {
  const V = await depotMitZeilen();
  const alle = V.prueftermineAlle(HEUTE);
  assert.equal(alle.filter((r) => r.ausZeile).length, 3);
});

/* ══ Die Belegpflicht des Auftrags ═════════════════════════════════════════ */

test('[Zeile·Beleg] KEIN neuer Schlüssel in data.feldGueltigkeit, keine Schemaänderung', async () => {
  const { V } = ladeKern();
  const vorher = V.leeresDepot().schemaVersion;
  const V2 = await depotMitZeilen();
  const d = V2.getData();
  assert.equal(d.schemaVersion, vorher, 'die Schemaversion ist NICHT zu heben — belegt, nicht angenommen');
  const g = d.feldGueltigkeit || {};
  assert.equal(typeof (g.finance || {}).creditCards, 'undefined',
    'der Wert bleibt in der Zeile; der flache Schlüsselraum wird gar nicht betreten');
  assert.equal(Object.keys((g.housing || {})).length, 0,
    'auch für die Wohnungen entsteht kein Schlüssel');
});

test('[Zeile·Beleg] der Wert steht weiterhin in der Zeile, wo die Bürgerin ihn eingetragen hat', async () => {
  const V = await depotMitZeilen();
  const zeilen = V.getData().sektoren.finance.creditCards;
  assert.equal(zeilen.find((z) => z.providerLast4Digits === 'Visa Sparkasse').validUntil, '2026-09-30');
});
