'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Der Zuschnitt der Angehörigen-Blätter — was eine fremde Person zu sehen
   bekommt, und was NIE.
   ────────────────────────────────────────────────────────────────────────
   Diese Datei hiess bis zum 21.08.2026 `angehoerigen-cache-stufe2.test.js`
   und prüfte den Stufe-2-Angehörigen-Cache (U2-ADR-062): ein zweites
   Passwort, ein verschlüsselter SCHNAPPSCHUSS der fünf Blätter, ein eigener
   Eintritt „Als Angehörige öffnen".

   F5 ZUG 2 (21.08.2026) HAT DIE ABSCHRIFT ENTFERNT — entschieden am selben
   Tag: nicht löschen, sondern ERSETZEN. Die Empfängerkreise (U2-ADR-156)
   geben keine Kopie, sondern einen Schlüssel auf den lebenden Bestand; ihre
   vier Bausteine ziehen aus denselben Angehörigen-Blättern (A415).

   WAS BLEIBT, IST DIE ZUSAGE, und sie ist der Grund, warum diese Datei nicht
   gelöscht, sondern umgeschrieben wurde: eine fremde Person sieht die
   Blatt-Allowlist und NIE ein Master-only-Feld wie die Steuer-ID. Das ist Z9.
   Der Beleg läuft jetzt über den Weg, den es noch gibt.

   Zusicherung: Z9 (tools/zusicherungen-regeln.js) — diese Marke ist der
   maschinenlesbare Anker, den pruefeNurDurchTest() (tools/zusicherungen-
   kern.js) neben der Datei-Existenz auf Inhalt prüft. Verschwindet die Marke
   (Datei bleibt, Test wird umbenannt/entfernt), wird Z9 rot.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

const PW = 'anker-pw-12345';
const FACH_PW = 'fach-passwort-der-anja-1';

test('Blatt-Zuschnitt = nur die Fünf-Blatt-Allowlist + Identitäts-Name; KEIN Master-Feld', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen(PW);
  V.akteurSelbstErklaeren('B');
  V.sektorFeldSetzen('identity', 'givenName', 'Maria');
  V.sektorFeldSetzen('health', 'bloodType', 'A+');
  V.sektorFeldSetzen('finance', 'companyPensionPolicyNumber', 'DE-GEHEIM');
  /* `angehoerigenCacheModell()` trägt den Namen der entfallenen Abschrift, IST aber nicht sie:
     es ist der ZUSCHNITT und bleibt Maßstab für `w13-ausgabeweg-ohne-sensibel-pruefen`,
     `zuschnitt-messen` und `pro-durchstich-messen` (gemessen 21.08.: 32 von 145 Fundstellen
     überleben den Wegfall des Feldes). */
  const m = V.angehoerigenCacheModell();
  assert.equal(m.sektoren.health.bloodType, 'A+', 'Allowlist-Feld drin');
  assert.equal(m.sektoren.identity.givenName, 'Maria', 'Identität fürs Banner drin');
  assert.ok(!('finance' in m.sektoren), 'Master-Feld finanzen NICHT im Subset');
});

/* Eigene, dateilokale Funktion — nicht Kosmetik: der Prüfstand (`tests/pruefstand-bindung.js`)
   kann einen Wächter nur instrumentieren, wenn sein Rumpf eine Diskriminante DIESER Datei ruft.
   Ohne sie fiele die ADR-062-Bindung aus der Reichweite des Mechanismus und stünde als
   gewachsene Schuld in `STAND.ausserReichweite`. Die Vorgängerdatei hatte dafür `ownerMitCache`. */
async function depotMitFachFuerAnja(V, steuerid) {
  await V.depotAnlegen(PW);
  V.akteurSelbstErklaeren('Maria');
  V.sektorFeldSetzen('identity', 'givenName', 'Maria');
  V.sektorFeldSetzen('health', 'bloodType', 'A+');
  if (steuerid) V.sektorFeldSetzen('finance', 'companyPensionPolicyNumber', steuerid);
  await V.empfaengerkreisSetzen({ name: 'Anja', bausteine: ['notfall'] });
  await V.empfaengerkreisFachEinrichten(V.empfaengerkreiseListe()[0], FACH_PW, 'Tresor im Flur');
  return V.depotSerialisieren();
}

test('[Z9·am Lauf] ein Fach-Empfänger sieht die Blutgruppe und NIE die Steuer-ID', async () => {
  const { V } = ladeKern();
  const u = await depotMitFachFuerAnja(V, '99 887 766 554');

  const frisch = ladeKern().V;
  const inhalt = await frisch.depotLaden(u, FACH_PW);
  assert.equal(inhalt.sektoren.health.bloodType, 'A+', 'das Allowlist-Feld kommt an');
  assert.equal((inhalt.sektoren.finance || {}).companyPensionPolicyNumber, undefined,
    'das Master-Feld kommt NICHT an — dieselbe Zusage wie zur Cache-Zeit, anderer Weg');
});

test('[Z9·Entschärfungs-Kontrolle] die Probe oben erkennt einen tatsächlich mitgegebenen Wert', async () => {
  // Ohne diese Gegenprobe wäre „steuerid ist undefined" auch dann grün, wenn GAR NICHTS ankäme.
  const { V } = ladeKern();
  const u = await depotMitFachFuerAnja(V, null);
  const inhalt = await ladeKern().V.depotLaden(u, FACH_PW);
  assert.equal(inhalt.sektoren.health.bloodType, 'A+',
    'BELEG: der Weg gibt überhaupt etwas heraus — die Null-Prüfung oben misst also Abwesenheit, nicht Leere');
});

test('[Zug 1] Blocktext nennt die Sub-Depot-Grenze VOR dem zweiten Weg, wörtlich', () => {
  const { V } = ladeKern();
  const s = V.SITUATION_BY_ID['todesfall-uebernahme'];
  const block = s.bloecke.find((b) => b.titel === 'Zugang zu den Daten');
  assert.ok(block, 'Block muss unter diesem Titel stehen — Rename hier nachziehen, falls gewollt');
  assert.match(block.hint, /Sub-Depot der einzige Weg/,
    'die Grenze muss ausdrücklich benannt sein, nicht nur implizit aus der Reihenfolge folgen');
  const posGrenze = block.hint.indexOf('der einzige Weg');
  /* F5 Zug 2: der zweite Weg heisst seit dem 21.08.2026 „Datei öffnen" mit dem Passwort eines
     FACHS; „Als Angehörige öffnen" gibt es nicht mehr. Die Reihenfolge-Zusage ist unverändert. */
  const posZweiterWeg = block.hint.indexOf('Datei öffnen');
  assert.ok(posGrenze > 0 && posZweiterWeg > posGrenze,
    'die Grenze muss VOR der Beschreibung des zweiten Wegs stehen, nicht als Nachtrag danach');
  assert.equal(block.hint.includes('Als Angehörige öffnen'), false,
    'der Text darf keinen Weg mehr nennen, den es nicht gibt');
});

test('[Zug 1·Positivkontrolle] eine Sub-Depot-Blackbox-Datei trägt keine fremden Fächer — der zweite Weg bricht wie vom Text behauptet', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen('anker-pw-zug1');
  const eintrag = await V.subDepotAnlegen(
    { bezeichnung: 'Depot Vater', inhaberin: 'Vater', verwaltungsTyp: 'verwaltet' },
    'sub-pw-zug1'
  );
  const datei = V.subDepotBlackboxExportieren(eintrag.depotUUID);
  const tabelle = (datei.umschlag && datei.umschlag.umschlagTabelle) || [];
  assert.ok(tabelle.length <= 1,
    'ROT ERWARTET, wenn falsch: trüge die Blackbox-Datei doch ein zweites Fach, wäre der korrigierte '
    + 'Text selbst falsch — genau das muss dieser Test fangen, nicht nur behaupten.');
});

test('[Zug 1·Entschärfungs-Kontrolle] eine Anker-Datei MIT Fach urteilt tatsächlich anders', async () => {
  // Beweist, dass die vorige Probe wirklich unterscheidet — nicht einfach immer „kein Fach" sagt.
  const { V } = ladeKern();
  await V.depotAnlegen('anker-pw-zug1b');
  V.akteurSelbstErklaeren('B');
  await V.empfaengerkreisSetzen({ name: 'Tante Renate', bausteine: [] });
  await V.empfaengerkreisFachEinrichten(V.empfaengerkreiseListe()[0], 'fach-pw-zug1b');
  const u = await V.depotSerialisieren();
  assert.equal(u.umschlagTabelle.length, 2,
    'BELEG: eine Anker-Datei MIT eingerichtetem Fach trägt zwei Einträge — die vorige Prüfung misst '
    + 'also wirklich die Abwesenheit, nicht ein Werkzeug, das immer dasselbe sagt.');
});

/* ══════════════════════════════════════════════════════════════════════════
   Aus dem Auftrag Vertrauens_Passwort_Proben (03.08.2026). Die Zusage „das
   zweite Passwort steht in KEINER Form in data noch im Umschlag" galt dem
   Vertrauens-Passwort; sie gilt unverändert für das Fach-Passwort, und der
   Grund ist derselbe: gespeichert wird ein Schlüssel, nie das Passwort.
   ══════════════════════════════════════════════════════════════════════════ */

test('[Fach-Passwort] das zweite Passwort steht in KEINER Form in data noch im Umschlag', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen(PW);
  V.akteurSelbstErklaeren('B');
  V.sektorFeldSetzen('health', 'bloodType', 'A+');
  await V.empfaengerkreisSetzen({ name: 'Anja', bausteine: ['notfall'] });
  await V.empfaengerkreisFachEinrichten(V.empfaengerkreiseListe()[0], FACH_PW, 'Tresor');
  const umschlag = await V.depotSerialisieren();
  const entferneChiffrate = (t) => String(t).replace(/[A-Za-z0-9+/=]{40,}/g, '');
  assert.equal(entferneChiffrate(JSON.stringify(V.getData())).includes(FACH_PW), false, 'nicht in data');
  assert.equal(entferneChiffrate(JSON.stringify(umschlag)).includes(FACH_PW), false, 'nicht im Umschlag');
});

test('[Fach-Passwort·Entschärfungs-Kontrolle] die String-Suche oben erkennt ein tatsächlich geleaktes Passwort', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen(PW);
  V.akteurSelbstErklaeren('B');
  const umschlag = await V.depotSerialisieren();
  umschlag.__leck = FACH_PW;
  const entferneChiffrate = (t) => String(t).replace(/[A-Za-z0-9+/=]{40,}/g, '');
  assert.equal(entferneChiffrate(JSON.stringify(umschlag)).includes(FACH_PW), true,
    'BELEG: ein wirklich geleaktes Passwort wird gefunden — die Prüfung oben ist keine leere Geste');
});

test('[Fach-Passwort] falsches Passwort: Ablehnung ohne Teil-Laden, ohne Feld-/Inhalts-Leak in der Meldung', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen(PW);
  V.akteurSelbstErklaeren('B');
  V.sektorFeldSetzen('health', 'bloodType', 'A+');
  await V.empfaengerkreisSetzen({ name: 'Anja', bausteine: ['notfall'] });
  await V.empfaengerkreisFachEinrichten(V.empfaengerkreiseListe()[0], FACH_PW);
  const u = await V.depotSerialisieren();

  const frisch = ladeKern().V;
  let fehler = null;
  try { await frisch.depotLaden(u, 'das-ist-das-falsche-passwort'); } catch (e) { fehler = e; }
  assert.ok(fehler, 'ein falsches Passwort öffnet nichts');
  const txt = String(fehler.message || '');
  for (const verraeter of ['A+', 'bloodType', 'Anja']) {
    assert.equal(txt.includes(verraeter), false, 'die Meldung verrät „' + verraeter + '"');
  }
});
