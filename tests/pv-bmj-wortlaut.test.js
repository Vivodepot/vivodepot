'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Die erzeugte Patientenverfügung steht im Wortlaut der BMJ-Textbausteine — jede Zeile, nicht nur die Festlegungen
   (Befund PV-UEBERLEITUNG, 01.10.2026)
   ────────────────────────────────────────────────────────────────────────
   Für jeden Fall der PV-Golden-Matrix wird das Dokument erzeugt (pvDokumentAbschnitte); jede Zeile wird an den
   Eingaben der Nutzerin geteilt, und jedes übrige Stück muss zeichengleich aus dem amtlichen Text stammen — als
   zusammenhängendes Stück oder als Bezugssatz vor einem Aufzählungspunkt plus Baustein danach, so wie das BMJ selbst
   zusammensetzt (tools/pv-festlegungen-bmj-beleg.js, Referenz tests/fixtures/bmj-patientenverfuegung-textbausteine.txt,
   pdftotext des BMJ-PDF, amtliches Werk § 5 UrhG).
   BEKANNT steht, was heute noch abweicht; die Liste darf nur schrumpfen (ein neues Stück ist ein Fund, ein behobenes
   wird gestrichen).
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');
const { PV_MATRIX } = require('./pv-golden-matrix.js');
const W = require('../tools/pv-festlegungen-bmj-beleg.js');

// Je abweichendem Baustein der Anfang des erzeugten Stücks (BMJ-Abschnitt in Klammern).
// Leer seit 01.10.2026 (U2-ADR-459): jede Zeile steht im BMJ-Wortlaut. Ein neuer Eintrag wäre ein Rückschritt.
const BEKANNT = [];
const bekannt = (st) => BEKANNT.some((b) => st.startsWith(b));

function abweichungen() {
  const ref = W.referenzLesen();
  const { V } = ladeKern();
  const alle = new Set();
  for (const fall of PV_MATRIX) { V.setData(fall.data); for (const st of W.dokumentPruefen(V.pvDokumentAbschnitte(), fall.data, ref)) alle.add(st); }
  return [...alle];
}

test('[PV·Wortlaut] jede Zeile der erzeugten Patientenverfügung stammt zeichengleich aus den BMJ-Textbausteinen, bis auf die bekannten', () => {
  const ab = abweichungen();
  assert.deepEqual(ab.filter((st) => !bekannt(st)), [], 'neue Abweichung vom BMJ-Wortlaut');
  const offen = BEKANNT.filter((b) => !ab.some((st) => st.startsWith(b)));
  assert.deepEqual(offen, [], 'behoben — aus BEKANNT streichen');
  assert.equal(BEKANNT.length, 0, 'die Liste ist leer und bleibt es (Befund PV-UEBERLEITUNG)');
});

test('[PV·Wortlaut·Rot-Beweis] die frühere Überleitung der Anwendungssituationen fällt', () => {
  const ref = W.referenzLesen();
  const abschnitte = [{ titel: '', zeilen: ['Diese Patientenverfügung gilt, wenn', '– ich mich aller Wahrscheinlichkeit nach unabwendbar im unmittelbaren Sterbeprozess befinde,'] }];
  assert.equal(W.dokumentPruefen(abschnitte, {}, ref).length, 2);
  const richtig = [{ titel: '', zeilen: ['Wenn', '– ich mich aller Wahrscheinlichkeit nach unabwendbar im unmittelbaren Sterbeprozess befinde ...'] }];
  assert.deepEqual(W.dokumentPruefen(richtig, {}, ref), []);
});

test('[PV·Wortlaut·Rot-Beweis] die alten Fassungen von Eingangsformel, Beistand, Schweigepflicht und Verbindlichkeit fallen', () => {
  const ref = W.referenzLesen();
  const alt = [
    'Ich (Name, Vorname, geboren am, wohnhaft in) bestimme hiermit für den Fall, dass ich meinen Willen nicht mehr bilden oder verständlich äußern kann:',
    'Ich wünsche Beistand durch folgende Personen:',
    'Ich wünsche Beistand durch eine Vertreterin/einen Vertreter folgender Kirche oder Weltanschauungsgemeinschaft:',
    'Ich wünsche hospizlichen Beistand.',
    'Ich entbinde die behandelnden Ärztinnen und Ärzte gegenüber folgenden Personen von der Schweigepflicht:',
    'Mein(e) Vertreter(in) – z. B. Bevollmächtigte(r)/Betreuer(in) – soll dafür Sorge tragen, dass mein Patientenwille durchgesetzt wird.',
  ];
  for (const z of alt) assert.equal(W.stueckBelegt(W.norm(z), ref), false, 'die alte Fassung fiele nicht: ' + z);
  const neu = [
    'Ich möchte Beistand durch folgende Personen:',
    'Ich möchte hospizlichen Beistand.',
    'Ich entbinde die mich behandelnden Ärztinnen und Ärzte von der Schweigepflicht gegenüber folgenden Personen:',
    'Mein(e) Vertreter(in) – z. B. Bevollmächtigte(r)/ Betreuer(in) – soll dafür Sorge tragen, dass mein Patientenwille durchgesetzt wird.',
  ];
  for (const z of neu) assert.equal(W.stueckBelegt(W.norm(z), ref), true, 'die BMJ-Fassung fiele: ' + z);
});

test('[PV·Wortlaut·Rot-Beweis] eine Bezugssatz-Zusammensetzung gilt nur an einer Aufzählungsgrenze', () => {
  const ref = W.referenzLesen();
  assert.equal(W.stueckBelegt('In den oben beschriebenen Situationen wünsche ich, dass alle lebenserhaltenden Maßnahmen unterlassen werden.', ref), true);
  assert.equal(W.stueckBelegt('Ich wünsche Beistand durch folgende Personen:', ref), false, '„Ich wünsche“ steht im BMJ, aber nicht vor diesem Aufzählungspunkt');
});

/* U2-ADR-459: Ziffer 2.7 und 2.12 — einzeln am erzeugten Dokument. */
function dokument(name) {
  const { V } = ladeKern();
  V.setData(PV_MATRIX.find((f) => f.name === name).data);
  return V.pvDokumentAbschnitte().flatMap((a) => a.zeilen);
}

test('[PV·2.7] die Vorsorgevollmacht steht nur bei bejahter Besprechung — eine Besprechung wird nie erfunden', () => {
  const ja = dokument('weitere-vollmacht-person-besprochen');
  assert.ok(ja.some((z) => z.startsWith('Ich habe zusätzlich zur Patientenverfügung eine Vorsorgevollmacht')), 'bei „ja“ steht der Baustein');
  assert.ok(ja.includes('Name: Paul Beispiel') && ja.includes('Telefon/Telefax/E-Mail: 089 123456, paul@beispiel.example'), 'die Angaben aus der Person');
  const leer = dokument('weitere-vollmacht-person-nicht-besprochen');
  assert.ok(!leer.some((z) => /Vorsorgevollmacht/.test(z)), 'ohne „ja“ kein Baustein und kein eigener Ersatzsatz');
});

test('[PV·2.7] die Betreuungsverfügung trägt den ggf.-Teil nur bei bejahter Besprechung; eine fehlende Angabe bleibt „...“', () => {
  const ja = dokument('weitere-betreuung-person-ohne-anschrift-besprochen');
  assert.ok(ja.some((z) => /erstellt und den Inhalt dieser Patientenverfügung/.test(z)));
  assert.ok(ja.includes('Anschrift: ...'), 'Lücke zum handschriftlichen Ausfüllen');
  const nein = dokument('weitere-betreuung-person-nicht-besprochen');
  assert.ok(nein.includes('Ich habe eine Betreuungsverfügung zur Auswahl der Betreuerin oder des Betreuers erstellt.'));
  assert.ok(!nein.some((z) => /besprochen/.test(z)));
});

test('[PV·2.12] beide Lücken einzeln: „informiert bei/durch …“ und „beraten lassen durch …“', () => {
  const beide = dokument('beratung-beide').find((z) => z.startsWith('Ich habe mich vor der Erstellung'));
  assert.equal(beide, 'Ich habe mich vor der Erstellung dieser Patientenverfügung informiert bei/durch Broschüre des BMJ und beraten lassen durch Hausärztin Dr. Klein');
  const zweite = dokument('beratung-nur-beraten').find((z) => z.startsWith('Ich habe mich vor der Erstellung'));
  assert.equal(zweite, 'Ich habe mich vor der Erstellung dieser Patientenverfügung informiert bei/durch ... und beraten lassen durch Hospizverein');
  const erste = dokument('beratung').find((z) => z.startsWith('Ich habe mich vor der Erstellung'));
  assert.equal(erste, 'Ich habe mich vor der Erstellung dieser Patientenverfügung informiert bei/durch Hausärztin Dr. Klein und beraten lassen durch ...');
});

test('[PV·Wortlaut·Rot-Beweis] die alten Kurzsätze von 2.7 und 2.12 fallen', () => {
  const ref = W.referenzLesen();
  for (const z of ['Ich habe eine Vorsorgevollmacht errichtet.', 'Ich habe eine Betreuungsverfügung errichtet.', 'Ich habe mich vor der Erstellung informiert bzw. beraten lassen:']) {
    assert.equal(W.stueckBelegt(W.norm(z), ref), false, 'die alte Fassung fiele nicht: ' + z);
  }
});
