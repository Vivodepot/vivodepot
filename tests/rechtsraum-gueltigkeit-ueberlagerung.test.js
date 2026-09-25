'use strict';
/* U2-ADR-314 — die Rechtsraum-Überlagerung für den Gültigkeits-Vorschlag.

   Wörtlicher Spiegel von U2-ADR-307 (Fristen), aus DEMSELBEN Slot gelesen: ein Rechtsraum
   ist eine Sache, nicht zwei Module.

   DAS MODUL TRÄGT DIE ZAHL, DER KERN RECHNET. Ein Regelname aus einer geschlossenen
   Ein-Eintrags-Liste wäre für ein neues Land wirkungslos — dann wäre der Rechtsraum kein
   Andockpunkt, sondern ein Antragsformular. `monate` ist darum eine Zahl, keine Kennung.

   QUELLE IST PFLICHT. Der Schutzzweck der geschlossenen Liste bleibt: sie schützte gegen
   RATEN, und eine Zahl mit Fundstelle rät nicht.

   OHNE MODUL BYTE-GLEICH WIE HEUTE. Das ist die nicht verhandelbare Auflage, und die erste
   Probe hält sie fest. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

const KENNUNG = 'mobility.passportValidUntil';

/* Dasselbe Vorgehen wie tests/m1-gueltigkeit-eingabe.test.js: ein leeres Depot, dann die
   zwei Daten setzen, von denen die eingebaute Regel rechnet. Bei Ausstellung 29 Jahre alt
   → zehn Jahre. */
function frischMitPass() {
  const { V } = ladeKern();
  V.setData(V.leeresDepot());
  const d = V.getData();
  d.sektoren.identity = Object.assign({}, d.sektoren.identity, { birthDate: '1990-05-04' });
  d.sektoren.mobility = Object.assign({}, d.sektoren.mobility, { passportIssuedOn: '2020-03-02' });
  V.setData(d);
  return V;
}

test('[Gültigkeit·LEERFALL] ohne Modul rechnet der eingebaute Weg unverändert', () => {
  const V = frischMitPass();
  V.rechtsraumFristUeberlagerungSetzen(null);
  assert.equal(V.feldGueltigkeitVorschlag('mobility', 'passportValidUntil'), '2030-03-02',
    'der eingebaute Vorschlag hat sich geändert. Ohne geladenes Rechtsraum-Modul muss er '
    + 'byte-gleich zu heute bleiben — das ist die nicht verhandelbare Auflage');
});

test('[Gültigkeit·Überlagerung] ein Modul mit `monate` ändert den Vorschlag', () => {
  const V = frischMitPass();
  V.rechtsraumFristUeberlagerungSetzen({
    felder: { [KENNUNG]: { gueltigkeitVorschlag: { ausFeld: 'passportIssuedOn', monate: 60, quelle: 'PRÜF-FIXTURE' } } },
  });
  const nachher = V.feldGueltigkeitVorschlag('mobility', 'passportValidUntil');
  V.rechtsraumFristUeberlagerungSetzen(null);
  assert.equal(nachher, '2025-03-02',
    'fünf Jahre ab 2020-03-02 ergeben 2025-03-02 — der Kern rechnet die Zahl des Moduls, '
    + 'nicht seine eigene');
});

test('[Gültigkeit·Rückweg] nach dem Entladen gilt wieder der eingebaute Stand', () => {
  const V = frischMitPass();
  V.rechtsraumFristUeberlagerungSetzen(null);
  const vorher = V.feldGueltigkeitVorschlag('mobility', 'passportValidUntil');
  V.rechtsraumFristUeberlagerungSetzen({
    felder: { [KENNUNG]: { gueltigkeitVorschlag: { ausFeld: 'passportIssuedOn', monate: 60, quelle: 'PRÜF-FIXTURE' } } },
  });
  V.rechtsraumFristUeberlagerungSetzen(null);
  assert.equal(V.feldGueltigkeitVorschlag('mobility', 'passportValidUntil'), vorher,
    'nach dem Entladen bleibt etwas vom Modul stehen');
});

test('[Gültigkeit·ROT] ohne `quelle` wird die Angabe verworfen, der eingebaute Stand bleibt', () => {
  const V = frischMitPass();
  const eingebaut = V.feldGueltigkeitVorschlag('mobility', 'passportValidUntil');
  V.rechtsraumFristUeberlagerungSetzen({
    felder: { [KENNUNG]: { gueltigkeitVorschlag: { ausFeld: 'passportIssuedOn', monate: 60 } } },
  });
  const nachher = V.feldGueltigkeitVorschlag('mobility', 'passportValidUntil');
  V.rechtsraumFristUeberlagerungSetzen(null);
  assert.equal(nachher, eingebaut,
    'eine Dauer OHNE Fundstelle hat gegriffen. Der Schutzzweck der geschlossenen Regel-Liste '
    + 'war, gegen Raten zu schützen — eine Zahl ohne Quelle ist geraten, und sie ist gefährlicher '
    + 'als der Regelname, den sie ablöst: sie sieht aus wie eine Aussage');
});

test('[Gültigkeit·ROT] eine unsinnige Monatszahl wird verworfen', () => {
  const V = frischMitPass();
  const eingebaut = V.feldGueltigkeitVorschlag('mobility', 'passportValidUntil');
  for (const monate of [0, -12, 1.5, '60', null, 99999]) {
    V.rechtsraumFristUeberlagerungSetzen({
      felder: { [KENNUNG]: { gueltigkeitVorschlag: { ausFeld: 'passportIssuedOn', monate, quelle: 'PRÜF-FIXTURE' } } },
    });
    assert.equal(V.feldGueltigkeitVorschlag('mobility', 'passportValidUntil'), eingebaut,
      'die Monatszahl ' + JSON.stringify(monate) + ' hat gegriffen');
  }
  V.rechtsraumFristUeberlagerungSetzen(null);
});

test('[Gültigkeit·Gegenprobe] eine Überlagerung unter der falschen Kennungsform greift nicht', () => {
  /* Derselbe Rot-Beweis wie bei den Fristen: wäre der Leser gegenüber der Kennung
     gleichgültig, träfen die 17 doppelt vergebenen UnterFeld-IDs einander gegenseitig. */
  const V = frischMitPass();
  const eingebaut = V.feldGueltigkeitVorschlag('mobility', 'passportValidUntil');
  V.rechtsraumFristUeberlagerungSetzen({
    felder: { 'passportValidUntil': { gueltigkeitVorschlag: { ausFeld: 'passportIssuedOn', monate: 60, quelle: 'PRÜF-FIXTURE' } } },
  });
  const nachher = V.feldGueltigkeitVorschlag('mobility', 'passportValidUntil');
  V.rechtsraumFristUeberlagerungSetzen(null);
  assert.equal(nachher, eingebaut,
    'eine Überlagerung unter der bloßen `feldId` hat gegriffen — dann ist die Kennungsform '
    + 'wirkungslos und zwei Felder gleichen Namens überschreiben einander');
});

test('[Gültigkeit·Positivkontrolle] der Prüfer nimmt eine vollständige Angabe wirklich an', () => {
  /* Ohne diese Probe wären die vier Rot-Beweise oben auch dann grün, wenn der Prüfer
     ALLES verwürfe — dann prüften sie nichts als ihre eigene Wirkungslosigkeit. */
  const { V } = ladeKern();
  const r = V.feldGueltigkeitVorschlagPruefen({ ausFeld: 'x', monate: 60, quelle: '§ Prüf' });
  assert.ok(r.regel, 'der Prüfer verwirft eine vollständige Angabe');
  assert.equal(r.verworfen, null);
  const ohne = V.feldGueltigkeitVorschlagPruefen({ ausFeld: 'x', monate: 60 });
  assert.equal(ohne.regel, null);
  assert.equal(ohne.verworfen, '(ohne quelle)', 'das Verworfene wird BENANNT, nicht verschluckt');
});

test('[Gültigkeit·Befund] die deutsche Regel ist BEDINGT und bleibt darum im Kern', () => {
  /* Kein Verhaltenstest, sondern ein festgehaltener Befund: `monate` als eine Zahl kann die
     eingebaute Regel nicht ausdrücken, weil sie vom Alter bei Ausstellung abhängt. Wer sie
     später doch nach `vd-de-rechtsraum.json` schieben will, muss zuerst diese Bedingung
     abbilden — sonst verlöre die Bürgerin unter 24 vier Jahre Gültigkeit. */
  const V = frischMitPass();
  V.rechtsraumFristUeberlagerungSetzen(null);
  const ueber24 = V.feldGueltigkeitVorschlag('mobility', 'passportValidUntil');

  const d = V.getData();
  d.sektoren.identity = Object.assign({}, d.sektoren.identity, { birthDate: '2005-01-10' });
  d.sektoren.mobility = Object.assign({}, d.sektoren.mobility, { passportIssuedOn: '2024-06-01' });
  V.setData(d);
  const unter24 = V.feldGueltigkeitVorschlag('mobility', 'passportValidUntil');

  assert.equal(ueber24, '2030-03-02', 'zehn Jahre ab 2020-03-02');
  assert.equal(unter24, '2030-06-01', 'sechs Jahre ab 2024-06-01 — dieselbe Regel, andere Dauer');
});
