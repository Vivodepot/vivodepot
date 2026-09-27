'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   CAMT.053 — eine unplausible IBAN wird nicht übernommen
   „Der CAMT-Fund nach CC-02" (15.08.2026), Zug 1. Registerzeile A250.
   ────────────────────────────────────────────────────────────────────────────
   DER FUND (Fuzzing 15.08.2026, A239): eine abgeschnittene CAMT.053-Datei
   liefert kein `null`, sondern ein Objekt mit `"DE00"` als IBAN — ein valide
   AUSSEHENDER Treffer. `_camt053Listen` prüfte nur auf Nicht-Leere.

   PRODUKTENTSCHEIDUNG (15.08.2026): derselbe Fall wie CC-02, es gilt die
   dortige Entscheidung. Unplausibel importiert nichts, **die Datei wird nicht
   abgelehnt.** U2-ADR-076 ist nicht berührt — es regelt den Parser-Modus, nicht
   die Feldübernahme.

   DIE UNTERSCHEIDUNG, die diese Datei prüft: **tolerant lesen, streng
   übernehmen.** Beide Hälften müssen halten. Eine Probe, die nur die erste
   prüft, ließe eine Verschärfung durchgehen, die unsaubere Bank-Dateien
   komplett ablehnt — und das wäre gegen die Entscheidung.
   ════════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

/* Eine CAMT.053-Datei, mitten in der IBAN abgeschnitten — der reale Fuzzing-Fall. */
const CAMT_ABGESCHNITTEN = `<?xml version="1.0" encoding="UTF-8"?>
<Document xmlns="urn:iso:std:iso:20022:tech:xsd:camt.053.001.02">
  <BkToCstmrStmt><Stmt>
    <Acct><Id><IBAN>DE00`;

const CAMT_VOLLSTAENDIG = `<?xml version="1.0" encoding="UTF-8"?>
<Document xmlns="urn:iso:std:iso:20022:tech:xsd:camt.053.001.02">
  <BkToCstmrStmt><Stmt>
    <Acct>
      <Id><IBAN>DE89370400440532013000</IBAN></Id>
      <Svcr><FinInstnId><Nm>Beispielbank</Nm></FinInstnId></Svcr>
    </Acct>
  </Stmt></BkToCstmrStmt>
</Document>`;

function listenAus(V, xml) {
  const geparst = V.parseCamt053(xml);
  return { geparst, listen: V._camt053Listen(geparst) };
}

test('[A250·Rot] die abgeschnittene Datei setzt das IBAN-Feld NICHT mehr', () => {
  const { V } = ladeKern();
  const { geparst, listen } = listenAus(V, CAMT_ABGESCHNITTEN);

  /* Vorbedingung: der Parser liest weiterhin tolerant und liefert den Rohwert.
     Ohne sie prüfte die Probe vielleicht nur, dass der Parser jetzt abstürzt —
     und das wäre die falsche Reparatur. */
  assert.ok(geparst, 'der leniente XML-Modus liefert weiterhin ein Objekt, kein null');
  assert.equal(geparst.iban, 'DE00',
    'Vorbedingung: der Parser liest „DE00" — genau der Fuzzing-Fund. Liest er etwas anderes, '
    + 'misst diese Probe nicht mehr den Fall, für den sie geschrieben wurde.');

  const eintraege = listen.flatMap((l) => l.eintraege || []);
  for (const e of eintraege) {
    assert.equal('iban' in e, false,
      'Die unplausible IBAN „DE00" ist im Konten-Eintrag gelandet. Genau das ist der Fund '
      + 'aus A239: ein valide aussehender Treffer, den nur eine Prüfsumme entlarvt.');
  }
});

test('[A250] eine vollständige, prüfsummenrichtige IBAN kommt weiterhin an', () => {
  const { V } = ladeKern();
  const { listen } = listenAus(V, CAMT_VOLLSTAENDIG);
  const eintraege = listen.flatMap((l) => l.eintraege || []);
  assert.equal(eintraege.length, 1, 'ein Konten-Eintrag');
  assert.equal(eintraege[0].iban, 'DE89370400440532013000',
    'Die gültige IBAN muss unverändert ankommen — sonst hat die Prüfung zu viel abgeschnitten.');
});

test('[A250] die Datei wird NICHT abgelehnt — nur das eine Feld fehlt', () => {
  /* Die zweite Hälfte der Entscheidung, und die leicht zu verlierende: wer eine
     unsaubere Bank-Datei mitbringt, bekommt weiterhin alles Plausible daraus. */
  const mitBankOhneIban = `<?xml version="1.0" encoding="UTF-8"?>
<Document xmlns="urn:iso:std:iso:20022:tech:xsd:camt.053.001.02">
  <BkToCstmrStmt><Stmt><Acct>
    <Id><IBAN>DE00</IBAN></Id>
    <Svcr><FinInstnId><Nm>Beispielbank</Nm></FinInstnId></Svcr>
  </Acct></Stmt></BkToCstmrStmt>
</Document>`;
  const { V } = ladeKern();
  const { geparst, listen } = listenAus(V, mitBankOhneIban);
  assert.ok(geparst, 'die Datei wird gelesen, nicht abgelehnt');
  const eintraege = listen.flatMap((l) => l.eintraege || []);
  assert.equal(eintraege.length, 1, 'der Konten-Eintrag kommt trotzdem');
  assert.equal(eintraege[0].institution, 'Beispielbank', 'der plausible Teil kommt mit');
  assert.equal('iban' in eintraege[0], false, 'nur der unplausible Teil fehlt');
});

test('[A250] `_ibanPlausibel` gegen bekannte Vektoren — Länge UND Prüfsumme', () => {
  const { V } = ladeKern();
  const faelle = [
    ['DE89370400440532013000', true, 'die amtliche Beispiel-IBAN'],
    ['DE89 3704 0044 0532 0130 00', true, 'mit Leerzeichen, wie eine Bürgerin sie schreibt'],
    ['GB82WEST12345698765432', true, 'ein zweiter Ländercode mit anderer Länge'],
    ['DE00', false, 'der Fuzzing-Fund'],
    ['DE89370400440532013001', false, 'richtige Länge, falsche Prüfsumme'],
    ['DE8937040044053201300', false, 'richtige Prüfziffern-Form, eine Stelle zu kurz'],
    ['XX82WEST12345698765432', false, 'unbekannter Ländercode und Prüfsumme falsch'],
    ['', false, 'leer'],
  ];
  for (const [wert, erwartet, warum] of faelle) {
    assert.equal(V._ibanPlausibel(wert), erwartet, `${warum}: ${JSON.stringify(wert)}`);
  }
});

test('[A250] Länge allein reicht nicht, Prüfsumme allein auch nicht', () => {
  /* Beide Stufen sind nötig, und diese Probe sagt warum: eine zu kurze IBAN
     kann eine zufällig passende Prüfsumme tragen. */
  const { V } = ladeKern();
  assert.equal(V.IBAN_LAENGE.DE, 22, 'die Längentabelle trägt DE');
  assert.equal(V._ibanPlausibel('DE22'), false,
    'vier Zeichen, egal welche Prüfsumme — die Längenstufe muss greifen');
  assert.equal(V._ibanPlausibel('DE89370400440532013009'), false,
    'richtige Länge, verfälschte letzte Stelle — die Prüfsummenstufe muss greifen');
});

test('[A250] ein unbekannter Ländercode wird nicht pauschal abgelehnt', () => {
  /* Die Tabelle deckt den SEPA-Raum, nicht die Welt. Ein Ländercode, den sie
     nicht kennt, ist kein Grund zur Ablehnung — sonst verlöre eine Bürgerin mit
     einem Auslandskonto ihre Daten an einer Tabellenlücke. Dann trägt allein
     die Prüfsumme. */
  const { V } = ladeKern();
  assert.equal(V.IBAN_LAENGE.BR, undefined, 'Vorbedingung: BR steht nicht in der Tabelle');
  assert.equal(V._ibanPlausibel('BR9700360305000010009795493P1'), true,
    'eine prüfsummenrichtige brasilianische IBAN muss durchkommen');
});
