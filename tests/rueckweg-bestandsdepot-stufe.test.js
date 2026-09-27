'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Die Rückweg-Probe an einem BESTANDSDEPOT über die Stufe hinweg
   (Auflage A1 des Zerfall-Bauauftrags · A345, 19.08.2026)
   ────────────────────────────────────────────────────────────────────────
   WARUM DIESE PROBE EIGENS STEHT: die Proben aus Zug 1 laufen an einem
   FRISCH ANGELEGTEN Depot. Ein frisches Depot hat nichts zu verlieren. Der
   Fall, der zählt, ist das Depot, das die Bürgerin seit Monaten führt — es
   liegt allein bei ihr, und ein Verlust ist endgültig.

   NACH DIESER STUFE TRÄGT DAS DEPOT ZWEI NEUE DINGE (Nachtrag 3 zum
   Bauauftrag), und die Probe muss BEIDE sehen:
     · die Feld-Einheiten samt Umschlagstabelle (die Form der Datei)
     · den Zertifikat-Slot in `importierteVorlagen[]` (Schema 66)

   DER WEG, den ein echtes Bestandsdepot geht:
     1 · ein Depot im ALTEN Format schreiben (v3-Umschlag, Schema 65,
         Vorlagen-Eintrag OHNE `beleg`) — mit `depotSerialisierenV3`, also
         über den echten Schreibweg von gestern, nicht über ein Handgebilde
     2 · es mit dem HEUTIGEN Kern öffnen
     3 · Feld für Feld vergleichen — nicht als Zahl
     4 · es speichern, wie der Kern heute speichert (v4)
     5 · erneut öffnen und wieder Feld für Feld vergleichen
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

const PW = 'Bestandsdepot-Rueckweg-2026!';

/* Kanonischer Vergleich: die Reihenfolge der Schlüssel folgt nach dem Zerfall den
   Adressen (also dem HMAC) und ist keine Zusicherung. Verglichen wird der INHALT. */
function kanonisch(o) {
  return JSON.stringify(o, (k, v) => {
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      const r = {}; for (const x of Object.keys(v).sort()) r[x] = v[x]; return r;
    }
    return v;
  });
}
function pfadDiff(a, b, p = '', raus = []) {
  const ka = (a && typeof a === 'object') ? Object.keys(a) : [];
  const kb = (b && typeof b === 'object') ? Object.keys(b) : [];
  for (const k of new Set([...ka, ...kb])) {
    const A = a ? a[k] : undefined, B = b ? b[k] : undefined;
    if (A && B && typeof A === 'object' && typeof B === 'object') { pfadDiff(A, B, p + '.' + k, raus); continue; }
    if (!Object.is(A, B)) raus.push(p + '.' + k + ': vorher=' + JSON.stringify(A) + ' nachher=' + JSON.stringify(B));
  }
  return raus;
}

/* Ein Bestandsdepot, wie es vor der Stufe entstanden wäre: reich befüllt, mit einem
   Vorlagen-Eintrag OHNE `beleg` (den gab es damals nicht) und mit Schema 65. */
async function bestandsdepotAlsV3() {
  const { V } = ladeKern();
  await V.depotAnlegen(PW);
  V.akteurSelbstErklaeren('Bestand');
  const d = V.getData();
  d.sektoren.identitaet = { vorname: 'Maria', nachname: 'Mustermann', geburtsdatum: '1954-03-11' };
  d.sektoren.gesundheit = { blutgruppe: '0 negativ', allergien: 'Penicillin', medikamente: 'L-Thyroxin 50' };
  d.sektoren.vorsorge = { organspende: 'ja', patientenverf_ort: 'Ordner Wichtiges, Schrank' };
  d.sektoren.wohnen = { mietvertrag_befristet_bis: '2028-06-30' };
  d.menschen = [{ id: 'p1', name: 'Anna Schmidt' }, { id: 'p2', name: 'Jonas Schmidt' }];
  d.importierteVorlagen = [{
    id: 'alt-vorlage-1', sektorId: 'vorsorge', feldIds: ['tpl_alt'],
    wortlaut: 'Amtlicher Muster-Wortlaut aus einer Zeit ohne Beleg.',
    wortlautQuelle: { behoerde: 'Musterbehörde', titel: 'Muster', lizenz: '§ 5 UrhG' },
    anbieterName: 'Musterbehörde', angelegtAm: '2026-07-01',
  }];
  d.schemaVersion = 65;                      // der Stand VOR dieser Stufe
  V.setData(d);
  const umschlag = await V.depotSerialisierenV3();   // der echte Schreibweg von gestern
  return { umschlag, daten: JSON.parse(JSON.stringify(V.getData())) };
}

test('[Klasse-A][A1] ein BESTANDSDEPOT (v3, Schema 65) öffnet über die Stufe hinweg — Feld für Feld, ohne Verlust', async () => {
  const { umschlag, daten } = await bestandsdepotAlsV3();
  assert.equal(umschlag.kryptoVersion, 3, 'Anker: die Datei liegt wirklich in der ALTEN Form vor');
  assert.equal(daten.schemaVersion, 65, 'Anker: und wirklich mit dem Schema von gestern');
  assert.ok(Array.isArray(daten.importierteVorlagen) && daten.importierteVorlagen.length === 1,
    'Anker: mit einem Vorlagen-Eintrag aus der Zeit vor dem Slot');
  assert.equal('beleg' in daten.importierteVorlagen[0], false,
    'Anker: der Vorlagen-Eintrag trägt den Slot noch NICHT — sonst prüfte die Stufe nichts');

  const { V } = ladeKern();
  const geladen = await V.depotLaden(JSON.parse(JSON.stringify(umschlag)), PW);

  // Die Stufe ist gefahren: beide neuen Dinge sind da.
  // >= 67, nicht == 67: spätere Stufen laufen im selben Durchgang mit (Schema 68, Auftrag 7).
  assert.ok(geladen.schemaVersion >= 67, 'Schema mindestens auf 67 gehoben (Kette Auftrag 2 — die eine Migrationsstufe)');
  assert.ok(Object.prototype.hasOwnProperty.call(geladen.importierteVorlagen[0], 'beleg'),
    'der Zertifikat-Slot ist angelegt');
  assert.equal(geladen.importierteVorlagen[0].beleg, null,
    'und er ist null — ein nachträglich erfundener Beleg wäre eine Fälschung');

  // Und NICHTS ist verloren gegangen. Feld für Feld, nicht als Zahl.
  assert.equal(geladen.sektoren.identity.givenName, 'Maria');
  assert.equal(geladen.sektoren.identity.birthDate, '1954-03-11');
  assert.equal(geladen.sektoren.health.bloodType, '0 negativ');
  /* `allergiesMedicationFoodOther`/`medicationOngoing` normalisiert der Kern beim Laden von einer Zeichenkette
     zu `[{text}]` — eine VORBESTEHENDE Normalisierung, unabhängig vom Zerfall (über
     beide Wege gleich gemessen). Geprüft wird darum der Inhalt, nicht die Hülle. */
  assert.equal(JSON.stringify(geladen.sektoren.health.medicationOngoing).includes('L-Thyroxin 50'), true);
  /* `patientenverf_ort`/`organspende` ZIEHEN beim Laden in die Vorsorge-Instrument-Liste
     um (U2-ADR-089/067) — eine VORBESTEHENDE Migration, unabhängig vom Zerfall; über
     beide Wege gleich gemessen. „Ohne Verlust" heisst darum: der Wert ist da, wo die
     Kette ihn hinlegt, nicht dort, wo er herkam. */
  const instr = geladen.sektoren.advanceCare.provisionInstruments;
  assert.ok(Array.isArray(instr) && instr.length === 1, 'das Instrument ist entstanden');
  assert.equal(instr[0].storageLocation, 'Ordner Wichtiges, Schrank', 'der Ort ist erhalten');
  assert.equal(instr[0].organDonation, 'ja', 'und die Organspende-Angabe auch');
  assert.equal(geladen.menschen.length, 2);
  assert.equal(geladen.menschen[1].name, 'Jonas Schmidt');
  assert.equal(geladen.importierteVorlagen[0].wortlaut, 'Amtlicher Muster-Wortlaut aus einer Zeit ohne Beleg.');
});

test('[Klasse-A][A1] der Zerfall ändert am INHALT nichts, was der alte Weg nicht auch änderte', async () => {
  /* DIE FRAGE RICHTIG GESTELLT, und das ist hier die halbe Arbeit. Ein Speicher-/
     Ladezyklus ist NICHT inhaltsneutral, und das war er auch vor dem Zerfall nicht:
     `depotNormalisieren` stempelt beim zweiten Durchgang den Rechtsraum an ein
     Vorsorge-Instrument (`rechtsraum`, `rechtsraumAngenommen`, `katalogStand`).
     Gemessen am 19.08.2026 über BEIDE Wege: dreimal derselbe Pfad, v3 wie v4.

     Ein Test, der „nach dem Zyklus identisch" verlangte, hätte diesen vorbestehenden
     Effekt dem Zerfall zugeschrieben. Die tragende Zusicherung ist eine andere und eine
     schärfere: DERSELBE Bestand, einmal über den alten und einmal über den neuen Weg
     geführt, kommt IDENTISCH heraus. */
  const { umschlag } = await bestandsdepotAlsV3();

  // Weg von gestern: v3 speichern, v3 laden.
  const { V: A } = ladeKern();
  await A.depotLaden(JSON.parse(JSON.stringify(umschlag)), PW);
  const altGespeichert = await A.depotSerialisierenV3();
  assert.equal(altGespeichert.kryptoVersion, 3, 'der alte Weg schreibt v3');
  const { V: A2 } = ladeKern();
  const ueberV3 = await A2.depotLaden(JSON.parse(JSON.stringify(altGespeichert)), PW);

  // Weg von heute: v4 speichern, v4 laden.
  const { V: B } = ladeKern();
  await B.depotLaden(JSON.parse(JSON.stringify(umschlag)), PW);
  const neuGespeichert = await B.depotSerialisieren();
  assert.equal(neuGespeichert.kryptoVersion, 4, 'der neue Weg schreibt die zerfallene Form');
  assert.ok(neuGespeichert.einheiten && Object.keys(neuGespeichert.einheiten).length > 0, 'mit Feld-Einheiten');
  const { V: B2 } = ladeKern();
  const ueberV4 = await B2.depotLaden(JSON.parse(JSON.stringify(neuGespeichert)), PW);

  const diff = pfadDiff(ueberV3, ueberV4);
  assert.deepEqual(diff, [], 'kein einziger Pfad weicht zwischen altem und neuem Weg ab:\n  ' + diff.join('\n  '));
  assert.equal(kanonisch(ueberV3), kanonisch(ueberV4), 'kanonisch identisch');
  // Und beide tragen, was die Stufe hinzufügt.
  assert.ok(ueberV4.schemaVersion >= 67);
  assert.equal(ueberV4.importierteVorlagen[0].beleg, null);
});

test('[Rot-Beleg][A1] die Probe misst etwas — ein fehlendes Feld fiele auf', async () => {
  /* Ohne diesen Beleg wäre „kein Pfad weicht ab" von „die Probe vergleicht nichts"
     nicht zu unterscheiden. */
  const a = { sektoren: { identitaet: { vorname: 'Maria', nachname: 'Mustermann' } } };
  const b = { sektoren: { identitaet: { vorname: 'Maria' } } };
  const diff = pfadDiff(a, b);
  assert.equal(diff.length, 1, 'ein fehlendes Feld ergibt genau einen abweichenden Pfad');
  assert.match(diff[0], /nachname/, 'und zwar den richtigen');
});

test('[Klasse-A][A1] der v3-RÜCKWEG bleibt: eine alte Datei ist nach der Stufe weiterhin lesbar', async () => {
  /* Auflage A2: v3 ist nicht nur der Migrationsweg, sondern der Rückweg. Eine Bürgerin,
     die eine ältere Sicherung hervorholt, muss sie öffnen können — auch nachdem ihr
     laufendes Depot längst in der neuen Form liegt. */
  const { umschlag, daten } = await bestandsdepotAlsV3();
  const { V } = ladeKern();
  const geladen = await V.depotLaden(JSON.parse(JSON.stringify(umschlag)), PW);
  assert.ok(JSON.stringify(geladen.sektoren.health.allergiesMedicationFoodOther).includes('Penicillin'),
    'der Inhalt der alten Datei ist nach der Stufe unverändert da');
  assert.deepEqual(Array.from(V.KRYPTO_VERSION_ALLOWLIST), [3, 4], 'die Allowlist trägt beide');
});
