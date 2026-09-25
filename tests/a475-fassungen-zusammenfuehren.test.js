'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   A475 (Laufzettel Nacht 22./23.08.2026, Posten 5) — zwei Fassungen desselben
   Depots zusammenführen
   ────────────────────────────────────────────────────────────────────────────
   Stresstest 9 (21.08.2026, tools/gbr-fassungen-modulumfang-messen.js) hat
   gemessen: die App merkt eine Gabelung heute nicht, obwohl `depotUUID` und
   `urheberschaft[sektorId][feldId][].zeitpunkt` das Material dafür schon
   tragen. ENTSCHEIDUNG (ARBEITSLISTE A475, dritter Nachtrag): Erkennen UND
   Zusammenführen, beides v1. Verschiedene Felder geändert → ohne Rückfrage
   zusammenführen. Dasselbe Feld beidseitig geändert → echter Konflikt.
   Löschen verliert gegen Ändern — der geänderte Wert bleibt, die Bürgerin
   wird trotzdem gefragt (vorbelegte Antwort, keine stille Entscheidung).

   NAMEN, WIE IM PRODUKT: `vorher` ist die Fassung, die schon offen war, BEVOR
   die zweite Datei geöffnet wurde (`fassungenVergleichen`s erstes Argument,
   `cryptoOverlayOeffnen`s `_fassungVorher`). `datei` ist die soeben geöffnete
   Datei — NACH depotLaden() identisch mit dem, was `data` jetzt ist, und
   darum das Ziel jeder Schreibung in fassungenZusammenfuehren().

   WARUM PRÄFIX-VERGLEICH UND NICHT NUR „hat der Schlüssel einen Eintrag":
   Stresstest 9s eigenes Rechenbeispiel funktionierte nur, weil die beiden
   geänderten Felder VOR der Gabelung noch nie beschrieben worden waren (der
   Schlüssel existierte auf keiner Seite). Ein Feld, das VOR der Gabelung
   schon einmal gesetzt wurde und NACHHER nur auf einer Seite ein zweites Mal,
   hätte die einfache Schlüssel-Prüfung nicht als „automatisch" erkannt — auf
   beiden Seiten steht ja ein Eintrag. Der erste Test unten („Fund") ist genau
   diese Probe.
   ════════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

// Baut eine gemeinsame Ausgangsfassung und liefert deren Umschlag (serialisiert).
async function gemeinsameAusgangsfassung() {
  const { V } = ladeKern();
  await V.depotAnlegen('a475-pw');
  V.akteurSelbstErklaeren('Anna');
  V.sektorFeldSetzen('identity', 'givenName', 'Anna');
  V.sektorFeldSetzen('identity', 'telephone', '0301 000000');   // VOR der Gabelung schon einmal gesetzt
  return V.depotSerialisieren();
}
// Lädt eine FRISCHE, unabhängige Kern-Instanz aus dem gemeinsamen Umschlag und wendet
// optional eine eigene Änderung an ("was diese Fassung seither geschrieben hat").
async function fassungAus(gemeinsam, aendern) {
  const { V } = ladeKern();
  await V.depotLaden(await gemeinsam, 'a475-pw');
  V.akteurSelbstErklaeren('Anna');
  if (aendern) aendern(V);
  return V;
}

/* ══ Der Präfix-Vergleich selbst ═══════════════════════════════════════════ */

test('[A475·Fund] ein VOR der Gabelung gesetztes Feld, NACHHER nur bei `vorher` geändert, gilt als automatisch', async () => {
  const gemeinsam = gemeinsameAusgangsfassung();
  const vorher = await fassungAus(gemeinsam, (V) => V.sektorFeldSetzen('identity', 'telephone', '0301 111111'));   // zweite Änderung
  const datei = await fassungAus(gemeinsam, null);   // unverändert seit der Gabelung
  const vergleich = datei.fassungenVergleichen(vorher.getData(), datei.getData());
  const treffer = vergleich.automatisch.find(z => z.feldId === 'telephone');
  assert.ok(treffer, 'telefon hätte als automatisch erkannt werden müssen — beide Seiten trugen bereits einen Eintrag vor der Gabelung');
  assert.equal(treffer.uebernehmen, 'alt');
  assert.equal(treffer.altWert, '0301 111111', 'der Wert, der übernommen werden soll, ist `vorher`s neuerer Stand');
  assert.equal(treffer.neuWert, '0301 000000', 'Gegenprobe: der naive Schlüssel-Vergleich hätte hier gar keinen Unterschied gesehen');
});

test('[A475] verschiedene Felder auf beiden Seiten geändert -> die Änderung von `vorher` ist automatisch, die von `datei` ist bereits da', async () => {
  const gemeinsam = gemeinsameAusgangsfassung();
  const vorher = await fassungAus(gemeinsam, (V) => V.sektorFeldSetzen('identity', 'familyName', 'Weber'));
  const datei = await fassungAus(gemeinsam, (V) => V.sektorFeldSetzen('identity', 'email', 'anna@datei.example'));
  const vergleich = datei.fassungenVergleichen(vorher.getData(), datei.getData());
  assert.equal(vergleich.konflikte.length, 0);
  assert.equal(vergleich.geloeschtVerliertGegenAendern.length, 0);
  const felder = vergleich.automatisch.map(z => z.feldId);
  assert.deepEqual(felder, ['familyName'], '`vorher`s Änderung fehlt in `datei` -> automatisch übernehmen');
  assert.ok(vergleich.gleich.some(z => z.feldId === 'email'), '`datei`s eigene Änderung ist bereits `neu` selbst -> gleich, nicht automatisch');
});

test('[A475] dasselbe Feld beidseitig auf verschiedene, nicht-leere Werte geändert -> echter Konflikt', async () => {
  const gemeinsam = gemeinsameAusgangsfassung();
  const vorher = await fassungAus(gemeinsam, (V) => V.sektorFeldSetzen('identity', 'email', 'anna@vorher.example'));
  const datei = await fassungAus(gemeinsam, (V) => V.sektorFeldSetzen('identity', 'email', 'anna@datei.example'));
  const vergleich = datei.fassungenVergleichen(vorher.getData(), datei.getData());
  assert.equal(vergleich.konflikte.length, 1);
  assert.equal(vergleich.konflikte[0].feldId, 'email');
  assert.equal(vergleich.konflikte[0].altText, 'anna@vorher.example');
  assert.equal(vergleich.konflikte[0].neuText, 'anna@datei.example');
});

test('[A475] Löschen verliert gegen Ändern -- der geänderte, nicht-leere Wert ist vorbelegt', async () => {
  const gemeinsam = gemeinsameAusgangsfassung();
  const vorher = await fassungAus(gemeinsam, (V) => V.sektorFeldSetzen('identity', 'email', 'anna@vorher.example'));
  const datei = await fassungAus(gemeinsam, (V) => V.sektorFeldSetzen('identity', 'email', ''));   // löscht
  const vergleich = datei.fassungenVergleichen(vorher.getData(), datei.getData());
  assert.equal(vergleich.konflikte.length, 0, 'kein offener Konflikt -- eine Seite ist eindeutig leer');
  assert.equal(vergleich.geloeschtVerliertGegenAendern.length, 1);
  assert.equal(vergleich.geloeschtVerliertGegenAendern[0].uebernehmen, 'alt', '`vorher` trägt hier den geänderten (nicht-leeren) Wert');

  // Umgekehrte Rollen: jetzt trägt `datei` (=neu) den geänderten Wert -> uebernehmen bleibt 'neu' (nichts zu schreiben).
  const vergleichUmgekehrt = vorher.fassungenVergleichen(datei.getData(), vorher.getData());
  assert.equal(vergleichUmgekehrt.geloeschtVerliertGegenAendern[0].uebernehmen, 'neu');
});

test('[A475] beide Seiten löschen dasselbe Feld -> gilt als gleich, kein Konflikt', async () => {
  const gemeinsam = gemeinsameAusgangsfassung();
  const vorher = await fassungAus(gemeinsam, (V) => V.sektorFeldSetzen('identity', 'telephone', ''));
  const datei = await fassungAus(gemeinsam, (V) => V.sektorFeldSetzen('identity', 'telephone', ''));
  const vergleich = datei.fassungenVergleichen(vorher.getData(), datei.getData());
  assert.ok(!vergleich.konflikte.some(z => z.feldId === 'telephone'));
  assert.ok(!vergleich.geloeschtVerliertGegenAendern.some(z => z.feldId === 'telephone'));
  assert.ok(vergleich.gleich.some(z => z.feldId === 'telephone'));
});

test('[A475] identische Fassung erneut geladen -> keine Abweichung', async () => {
  const gemeinsam = gemeinsameAusgangsfassung();
  const datei = await fassungAus(gemeinsam, null);
  const vergleich = datei.fassungenVergleichen(datei.getData(), datei.getData());
  assert.equal(datei.fassungenHabenAbweichung(vergleich), false);
});

/* ══ Die v1-Grenze: nur flache Sektorfelder, keine Listen ══════════════════ */

test('[A475·Grenze] ein Listenfeld (finance.accounts) hat eine Kette, aber typ:liste -> bleibt trotzdem aus dem Vergleich', async () => {
  const gemeinsam = gemeinsameAusgangsfassung();
  const vorher = await fassungAus(gemeinsam, (V) => V.listenEintragHinzufuegen('finance', 'accounts', { accountType: 'Girokonto Vorher' }));
  const datei = await fassungAus(gemeinsam, (V) => V.listenEintragHinzufuegen('finance', 'accounts', { accountType: 'Girokonto Datei' }));
  // Gegenprobe: eine Kette existiert sehr wohl (listenEintragHinzufuegen stempelt) --
  // der Ausschluss kommt gezielt vom typ:'liste'-Filter, nicht vom Fehlen einer Kette.
  assert.ok((vorher.getData().urheberschaft.finance || {}).accounts, 'Gegenprobe: die Kette existiert');
  const vergleich = datei.fassungenVergleichen(vorher.getData(), datei.getData());
  const alleFelder = [].concat(vergleich.gleich, vergleich.automatisch, vergleich.konflikte, vergleich.geloeschtVerliertGegenAendern);
  assert.ok(!alleFelder.some(z => z.sektorId === 'finance' && z.feldId === 'accounts'),
    'finance.accounts ist typ:liste -- v1 führt es nicht zusammen (eigener Schreibweg, s. Dateikopf-Grenze)');
});

/* ══ Anwenden ════════════════════════════════════════════════════════════ */

test('[A475·Anwenden] automatische Zeilen werden gestempelt in `datei` (=neu, das aktuell offene Depot) geschrieben', async () => {
  const gemeinsam = gemeinsameAusgangsfassung();
  const vorher = await fassungAus(gemeinsam, (V) => V.sektorFeldSetzen('identity', 'email', 'anna@vorher.example'));
  const datei = await fassungAus(gemeinsam, null);
  const vergleich = datei.fassungenVergleichen(vorher.getData(), datei.getData());
  const r = datei.fassungenZusammenfuehren(vergleich, {});
  assert.equal(r.uebernommen, 1);
  assert.equal(datei.getData().sektoren.identity.email, 'anna@vorher.example');
  const kette = datei.liesUrheberschaft('identity', 'email');
  assert.equal(kette[kette.length - 1].eingabeArt, 'fassungs-merge');
});

test('[A475·Anwenden] ein Konflikt bleibt ohne Entscheidung unverändert (der Wert von `datei` bleibt stehen)', async () => {
  const gemeinsam = gemeinsameAusgangsfassung();
  const vorher = await fassungAus(gemeinsam, (V) => V.sektorFeldSetzen('identity', 'email', 'anna@vorher.example'));
  const datei = await fassungAus(gemeinsam, (V) => V.sektorFeldSetzen('identity', 'email', 'anna@datei.example'));
  const vergleich = datei.fassungenVergleichen(vorher.getData(), datei.getData());
  const r = datei.fassungenZusammenfuehren(vergleich, {});   // keine Entscheidung getroffen
  assert.equal(r.uebernommen, 0);
  assert.equal(datei.getData().sektoren.identity.email, 'anna@datei.example', 'unverändert -- die Bürgerin wurde nicht überfahren');
});

test('[A475·Anwenden] eine ausdrückliche Entscheidung "alt" übernimmt den Wert von `vorher`', async () => {
  const gemeinsam = gemeinsameAusgangsfassung();
  const vorher = await fassungAus(gemeinsam, (V) => V.sektorFeldSetzen('identity', 'email', 'anna@vorher.example'));
  const datei = await fassungAus(gemeinsam, (V) => V.sektorFeldSetzen('identity', 'email', 'anna@datei.example'));
  const vergleich = datei.fassungenVergleichen(vorher.getData(), datei.getData());
  const r = datei.fassungenZusammenfuehren(vergleich, { 'identity/email': 'alt' });
  assert.equal(r.uebernommen, 1);
  assert.equal(datei.getData().sektoren.identity.email, 'anna@vorher.example');
});

test('[A475·Anwenden] Löschen-verliert-gegen-Ändern greift auch OHNE ausdrückliche Entscheidung (Vorbelegung)', async () => {
  const gemeinsam = gemeinsameAusgangsfassung();
  const vorher = await fassungAus(gemeinsam, (V) => V.sektorFeldSetzen('identity', 'email', 'anna@vorher.example'));
  const datei = await fassungAus(gemeinsam, (V) => V.sektorFeldSetzen('identity', 'email', ''));
  const vergleich = datei.fassungenVergleichen(vorher.getData(), datei.getData());
  const r = datei.fassungenZusammenfuehren(vergleich, {});
  assert.equal(r.uebernommen, 1);
  assert.equal(datei.getData().sektoren.identity.email, 'anna@vorher.example', 'der geänderte Wert überlebt die Löschung, ohne Rückfrage-Antwort nötig');
});

test('[A475·Anwenden] die Bürgerin kann die Löschen-verliert-Vorbelegung im Dialog umkehren', async () => {
  const gemeinsam = gemeinsameAusgangsfassung();
  const vorher = await fassungAus(gemeinsam, (V) => V.sektorFeldSetzen('identity', 'email', 'anna@vorher.example'));
  const datei = await fassungAus(gemeinsam, (V) => V.sektorFeldSetzen('identity', 'email', ''));
  const vergleich = datei.fassungenVergleichen(vorher.getData(), datei.getData());
  const r = datei.fassungenZusammenfuehren(vergleich, { 'identity/email': 'neu' });   // ausdrücklich umgekehrt
  assert.equal(r.uebernommen, 0);
  assert.equal(datei.getData().sektoren.identity.email, '', 'die ausdrückliche Bürger-Wahl schlägt die Vorbelegung');
});

/* ══ Rot-Beweis: der Präfix-Vergleich, nicht nur „hat einen Eintrag" ═══════ */

test('[A475·Rot-Beweis] ein naiver "hat-die-andere-Seite-diesen-Schlüssel"-Vergleich hätte den Fund oben verpasst', async () => {
  const gemeinsam = gemeinsameAusgangsfassung();
  const vorher = await fassungAus(gemeinsam, (V) => V.sektorFeldSetzen('identity', 'telephone', '0301 111111'));
  const datei = await fassungAus(gemeinsam, null);
  const zVorher = Object.keys(vorher.getData().urheberschaft.identity || {});
  const zDatei = Object.keys(datei.getData().urheberschaft.identity || {});
  const nurVorher = zVorher.filter(f => !zDatei.includes(f));
  assert.equal(nurVorher.length, 0, 'Gegenprobe: der Schlüssel `telefon` existiert auf BEIDEN Seiten -- die naive Prüfung sähe keine Gabelung');
  // ... während der echte Präfix-Vergleich sie sieht (bereits im ersten Test oben bewiesen).
});
