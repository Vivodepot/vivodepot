'use strict';
/* Notfallkarte und Notfall-Sicht lesen sich auf einen Blick (01.11.2026, Nachtrag U2-ADR-497).
   Anlass: Die Karte war unübersichtlich — lange zweizeilige Beschriftungen mit Klammerzusatz, ein Wert brach mitten in der Angabe
   um („Ramipril 5 / mg“), und die Angaben für die Behandlung standen gleichgewichtet neben denen für die Verwaltung.
   Die Probe misst die KLASSE über jede Ausgabe, die Notfall-Angaben beschriftet: die Karte (zeichneNotfallkarte), die Notfall-Sicht
   im Kern (renderNotfall), die Notfall-Sicht der Lese-App (notfallKernModell, renderNotfall) und die beiden S6-PDFs, die Werte
   umbrechen (Situationsblatt, Gesamt-Depot — dort gilt der Zusammenhalt von Zahl und Einheit). Gemessen am geladenen Kern mit einem
   Zeichenbreiten-Doppelgänger für jsPDF (Helvetica ≈ 0,19 mm je Punkt und Zeichen, großzügig gerechnet); das echte Blatt prüft
   tests/e2e/k3-notfallkarte-a6-passt.spec.js. Rot-Beweis je Aussage unten. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');
const { ladeLesen } = require('./load-lesen.js');

const NB = ' ';
const SB = 105, RAND = 6;
const LABEL_MM = Math.round((SB - 2 * RAND) * 0.44);          // Breite der Beschriftungsspalte auf der Karte
const WERT_X = RAND + LABEL_MM + 2.5, WERT_MM = SB - RAND - WERT_X;

/* jsPDF-Doppelgänger mit Breitenmessung: getTextWidth = Zeichen × Schriftgröße × 0,19 mm; splitTextToSize bricht wie jsPDF nur an
   gewöhnlichen Leerzeichen (geschützte bleiben zusammen). Jeder text()-Aufruf wird mit Ort und Schriftgröße festgehalten. */
function messDoc() {
  let fs = 8;
  const rufe = [];
  const breite = (t) => String(t).length * fs * 0.19;
  return {
    rufe,
    internal: { pageSize: { getWidth: () => SB, getHeight: () => 148 }, getNumberOfPages: () => 1, scaleFactor: 72 / 25.4 },
    setFont() {}, setTextColor() {}, setDrawColor() {}, setLineWidth() {}, line() {}, setPage() {}, addPage() { rufe.push({ seite: true }); },
    setFontSize(n) { fs = n; },
    getTextWidth: breite,
    splitTextToSize(t, w) {
      const zeilen = [];
      let z = '';
      for (const wort of String(t).split(' ')) {
        const probe = z ? z + ' ' + wort : wort;
        if (z && breite(probe) > w) { zeilen.push(z); z = wort; } else z = probe;
      }
      if (z || !zeilen.length) zeilen.push(z);
      return zeilen;
    },
    text(t, x, y) { (Array.isArray(t) ? t : [t]).forEach((s) => rufe.push({ t: String(s), x, y, fs })); },
    addImage() {},
  };
}

const ARZNEI = 'Ramipril 5 mg morgens, Metformin 1000 mg mittags, Marcumar 3 mg täglich';

async function frisch(produkt) {
  const k = ladeKern(produkt ? { produkt } : undefined);
  await k.V.depotAnlegen('pw');
  k.V.akteurSelbstErklaeren('Tester');
  return k.V;
}
async function frischMitDokument(produkt) {
  const k = ladeKern(produkt ? { produkt } : undefined);
  await k.V.depotAnlegen('pw');
  k.V.akteurSelbstErklaeren('Tester');
  return k;
}
function befuellen(V) {
  V.sektorFeldSetzen('identity', 'givenName', 'Marlene');
  V.sektorFeldSetzen('identity', 'familyName', 'Hartwig');
  V.sektorFeldSetzen('identity', 'birthDate', '1958-03-14');
  V.sektorFeldSetzen('health', 'bloodType', 'A+');
  V.sektorFeldSetzen('health', 'allergiesMedicationFoodOther', [{ text: 'Penicillin' }, { text: 'Nüsse' }]);
  V.sektorFeldSetzen('health', 'medicationOngoing', [{ text: ARZNEI }]);
  V.sektorFeldSetzen('health', 'chronicConditionsDiagnoses', [{ text: 'Diabetes mellitus Typ 2' }]);
  V.sektorFeldSetzen('health', 'implantsProsthesesPacemakers', 'Herzschrittmacher seit 2019');
  V.sektorFeldSetzen('health', 'bodyWeightKg', '72');
  V.sektorFeldSetzen('health', 'healthInsurance', { override: 'Techniker Krankenkasse' });
  V.sektorFeldSetzen('health', 'insuranceNumber', 'A123456789');
  V.sektorFeldSetzen('health', 'generalPractitioner', { override: 'Dr. Katrin Lindner, Kiel' });
  V.listenEintragHinzufuegen('advanceCare', 'provisionInstruments', { instrument: 'living-will', storageLocation: 'Ordner Vorsorge' });
}
function karte(V) {
  const doc = messDoc();
  V.zeichneNotfallkarte(doc, V.notfallKernModell(), V.notfallKartenMeta(), null);
  return doc.rufe.filter((r) => r.t !== undefined);
}
/* Die Regeln, als Funktionen, damit der Rot-Beweis dieselbe Messung auf einen verdorbenen Fall anwendet. */
const klammerFrei = (s) => !/[()]/.test(s);
function wertBruchFehler(zeilen) {
  const fehler = [];
  zeilen.forEach((z, i) => {
    if (/\d$/.test(z) && zeilen[i + 1] && /^(mg|kg|ml|g|µg|IE)\b/.test(zeilen[i + 1])) fehler.push(z + ' | ' + zeilen[i + 1]);
    if (/^(mg|kg|ml|g|µg|IE)\b/.test(z)) fehler.push('Zeile beginnt mit Einheit: ' + z);
  });
  return fehler;
}

function pruefeKurzeBeschriftung(produkt) {
  return async () => {
    const { V, document } = await frischMitDokument(produkt);
    befuellen(V);
    const modell = V.notfallKernModell();
    assert.ok(modell.length >= 9, 'Voraussetzung: die Angaben stehen im Modell');
    for (const z of modell) {
      const b = V.notfallZeileBeschriftung(z);
      assert.ok(b, 'jede Zeile hat eine Beschriftung: ' + z.feld);
      assert.ok(klammerFrei(b), 'Klammer in der Ausgabe-Beschriftung: ' + b);
      assert.ok(b.length * 7.5 * 0.19 <= LABEL_MM, 'Beschriftung breiter als die Spalte der Karte (' + LABEL_MM + ' mm): ' + b);
      assert.equal(z.label.length > 0, true, 'die Eingabe-Beschriftung bleibt im Modell');
    }
    // Die Karte selbst: jede gezeichnete Beschriftung (Spalte links, Schriftgrad 7,5) ist ohne Klammer und eine Zeile.
    const labels = karte(V).filter((r) => r.x === RAND && r.fs === 7.5);
    assert.ok(labels.length >= 9, 'Voraussetzung: die Karte zeichnet ihre Beschriftungen, gefunden ' + labels.length);
    for (const r of labels) {
      assert.ok(klammerFrei(r.t), 'Klammer auf der Karte: ' + r.t);
      assert.ok(r.t.length * 7.5 * 0.19 <= LABEL_MM, 'bricht um: ' + r.t);
    }
    // Der Bildschirm zeigt dieselben kurzen Beschriftungen.
    V.renderNotfall();
    const html = document.getElementById('content').innerHTML;
    const feldLabels = [...html.matchAll(/<div class="feld-label">([^<]*)<\/div>/g)].map((m) => m[1]);
    assert.ok(feldLabels.length >= 9, 'Voraussetzung: Zeilen auf dem Bildschirm');
    for (const l of feldLabels) assert.ok(klammerFrei(l), 'Klammer auf dem Bildschirm: ' + l);
  };
}

function pruefeReihenfolge(produkt) {
  return async () => {
    const { V, document } = await frischMitDokument(produkt);
    befuellen(V);
    const reihenfolge = ['allergiesMedicationFoodOther', 'medicationOngoing', 'chronicConditionsDiagnoses', 'implantsProsthesesPacemakers',
      'generalPractitioner', 'healthInsurance', 'insuranceNumber', 'bodyWeightKg', 'liste:provisionInstruments:living-will:storageLocation'];
    const modell = V.notfallKernModell();
    const beschriftungen = reihenfolge.map((f) => V.notfallZeileBeschriftung(modell.find((z) => z.feld === f)));
    // Karte: Reihenfolge der gezeichneten Beschriftungen
    const auf = karte(V).filter((r) => r.x === RAND && r.fs === 7.5).map((r) => r.t);
    const posKarte = beschriftungen.map((b) => auf.indexOf(b));
    assert.ok(posKarte.every((p) => p >= 0), 'alle neun Beschriftungen stehen auf der Karte: ' + JSON.stringify(auf));
    assert.deepEqual(posKarte.slice().sort((a, b) => a - b), posKarte, 'Karte: kritisch vor Verwaltung ' + JSON.stringify(auf));
    // Bildschirm
    V.renderNotfall();
    const html = document.getElementById('content').innerHTML;
    const posBild = beschriftungen.map((b) => html.indexOf('<div class="feld-label">' + b + '</div>'));
    assert.ok(posBild.every((p) => p >= 0), 'alle neun stehen auf dem Bildschirm');
    assert.deepEqual(posBild.slice().sort((a, b) => a - b), posBild, 'Bildschirm: dieselbe Reihenfolge');
    // Zielbild 06 (05.11.2026): die Angaben zur Behandlung stehen oben in der Gruppe „Gesundheit“, Hausarzt, Krankenkasse,
    // Versichertennummer und Gewicht offen darunter (kein eingeklappter Block); der Ort der Patientenverfügung in der Gruppe „Vorsorge“.
    const gruppe = (g) => (html.match(new RegExp('<section class="notfall-gruppe" data-notfall-gruppe="' + g + '"[\\s\\S]*?</section>')) || [''])[0];
    const gesundheit = gruppe('akut');
    assert.ok(gesundheit, 'eigene Gruppe für die Gesundheit');
    for (const f of reihenfolge.slice(0, 8)) assert.ok(gesundheit.includes('<div class="feld-label">' + V.notfallZeileBeschriftung(modell.find((z) => z.feld === f)) + '</div>'), f + ' in der Gruppe Gesundheit');
    assert.ok(gruppe('verfuegungen').includes(V.notfallZeileBeschriftung(modell.find((z) => z.feld === reihenfolge[8]))), 'der Ort der Patientenverfügung steht in der Gruppe Vorsorge');
    assert.ok(!/<details/.test(html), 'nichts ist eingeklappt');
  };
}

function pruefeLeerePflichtzeile(produkt) {
  return async () => {
    const V = await frisch(produkt);
    V.sektorFeldSetzen('health', 'bloodType', '0+');
    const leer = V._notfallKartePflichtZeilen(V.notfallKernModell());
    const feldIds = leer.map((z) => z.feld);
    for (const f of ['allergiesMedicationFoodOther', 'medicationOngoing', 'chronicConditionsDiagnoses', 'implantsProsthesesPacemakers', 'generalPractitioner']) {
      assert.ok(feldIds.includes(f), f + ' steht leer als Pflichtzeile');
    }
    const auf = karte(V).filter((r) => r.x === RAND && r.fs === 7.5).map((r) => r.t);
    assert.ok(auf.length >= 6, auf.join(' | '));
    assert.ok(leer.every((z) => z.ausgabeLabel && klammerFrei(z.ausgabeLabel)), 'auch die leeren Zeilen tragen die kurze Beschriftung');
  };
}

test('[Notfall·Übersicht·privat-de] keine Beschriftung der Ausgaben trägt eine Klammer oder bricht auf der Karte um', pruefeKurzeBeschriftung('privat-de'));
test('[Notfall·Übersicht·privat-de] Kritisches steht vor Verwaltung: auf der Karte, im Bildschirm und in der Lese-App dieselbe Reihenfolge', pruefeReihenfolge('privat-de'));
test('[Notfall·Übersicht·privat-de] eine leere Angabe für die Behandlung steht weiter als Zeile da (Pflichtangabe)', pruefeLeerePflichtzeile('privat-de'));
test('[Notfall·Übersicht·privat-en] keine Beschriftung der Ausgaben trägt eine Klammer oder bricht auf der Karte um', pruefeKurzeBeschriftung('privat-en'));
test('[Notfall·Übersicht·privat-en] Kritisches steht vor Verwaltung: auf der Karte, im Bildschirm und in der Lese-App dieselbe Reihenfolge', pruefeReihenfolge('privat-en'));
test('[Notfall·Übersicht·privat-en] eine leere Angabe für die Behandlung steht weiter als Zeile da (Pflichtangabe)', pruefeLeerePflichtzeile('privat-en'));

test('[Notfall·Übersicht] Zahl und Einheit bleiben auf der Karte zusammen, der Umbruch fällt nach dem Komma', async () => {
  const V = await frisch();
  befuellen(V);
  const rufe = karte(V);
  const wert = rufe.filter((r) => r.x === WERT_X && r.fs === 8.5).map((r) => r.t);
  assert.ok(wert.some((t) => t.includes('Ramipril 5' + NB + 'mg')), 'Ramipril 5 mg in EINER Zeile: ' + JSON.stringify(wert));
  assert.ok(wert.some((t) => t.includes('1000' + NB + 'mg')), '1000 mg zusammen');
  assert.ok(wert.some((t) => t.includes('3' + NB + 'mg')), '3 mg zusammen („3 mg täglich“ behält „3 mg“)');
  assert.deepEqual(wertBruchFehler(wert), [], 'Zahl und Einheit auf verschiedenen Zeilen');
  const arznei = wert.filter((t) => /Ramipril|Metformin|Marcumar/.test(t));
  assert.ok(arznei.length >= 2, 'der lange Eintrag bricht um: ' + JSON.stringify(arznei));
  assert.ok(arznei.slice(0, -1).every((t) => /[,;]$/.test(t)), 'der Umbruch fällt nach „, “: ' + JSON.stringify(arznei));
});

test('[Notfall·Übersicht·Rot-Beweis] ohne den Schutz bricht „5 mg“ — dieselbe Messung schlägt an', async () => {
  const V = await frisch();
  const doc = messDoc();
  doc.setFontSize(8.5);
  // Das Verhalten vor der Änderung: nur die Telefonnummern waren geschützt.
  const alt = doc.splitTextToSize(V.pdfTelefonGeschuetzt('Ramipril 5 mg morgens'), 18);
  assert.ok(wertBruchFehler(alt).length > 0 || alt.some((z) => /^mg/.test(z)) || alt.some((z) => /5$/.test(z)),
    'Voraussetzung: ohne Schutz bricht die Zahl von der Einheit: ' + JSON.stringify(alt));
  const neu = V.pdfWertZeilen(doc, 'Ramipril 5 mg morgens', 18);
  assert.deepEqual(wertBruchFehler(neu), [], JSON.stringify(neu));
  assert.ok(neu.some((z) => z.includes('5' + NB + 'mg')));
});

test('[Notfall·Übersicht] der Schutz: Zahl und Einheit; Telefon und Datum bleiben, wie sie sind', async () => {
  const V = await frisch();
  assert.equal(V.pdfWertEinheitGeschuetzt('Ramipril 5 mg'), 'Ramipril 5' + NB + 'mg');
  assert.equal(V.pdfWertEinheitGeschuetzt('Metformin 1000 mg mittags'), 'Metformin 1000' + NB + 'mg mittags');
  assert.equal(V.pdfWertEinheitGeschuetzt('Marcumar 3 mg täglich'), 'Marcumar 3' + NB + 'mg täglich');
  assert.equal(V.pdfWertEinheitGeschuetzt('2,5 ml abends'), '2,5' + NB + 'ml abends');
  assert.equal(V.pdfWertEinheitGeschuetzt('Typ 2 seit 2019'), 'Typ 2 seit 2019', 'keine Einheit, kein Schutz');
  assert.equal(V.pdfWertEinheitGeschuetzt('5 mgx'), '5 mgx', 'nur die ganze Einheit');
  assert.equal(V.pdfWertEinheitGeschuetzt('Dr. Lindner'), 'Dr. Lindner', 'ein Titel bleibt, wie er ist');
  assert.equal(V.pdfTelefonGeschuetzt('Ramipril 5 mg, 2 mal'), 'Ramipril 5 mg, 2 mal', 'pdfTelefonGeschuetzt bleibt unverändert');
});

test('[Notfall·Übersicht] die PDFs der Ausgabewege, die Werte umbrechen, schützen Zahl und Einheit ebenso', () => {
  const KERN = require('node:fs').readFileSync(require('node:path').join(__dirname, '..', 'vivodepot.html'), 'utf8');
  // Die Karte, das Situationsblatt und das Gesamt-PDF brechen Werte über pdfWertZeilen um; der Aufruf von pdfTelefonGeschuetzt steht nur
  // noch in der Funktion selbst (und in ihrer Definition).
  assert.equal((KERN.match(/pdfWertZeilen\(doc, /g) || []).length, 5, 'drei Ausgabewege umbrechen Werte über pdfWertZeilen, das Gesamt-PDF an zwei Stellen (Einträge und Wert); dazu die Definition');
  assert.equal((KERN.match(/pdfTelefonGeschuetzt\(/g) || []).length, 2, 'Definition und der Aufruf in pdfWertZeilen — kein Wertumbruch daneben');
  // Rot-Beweis: ein Wertumbruch in alter Form (nur Telefon geschützt) zählt als dritter Treffer und fällt auf.
  const verdorben = KERN + '\nwl.push(...doc.splitTextToSize(pdfTelefonGeschuetzt(teil), WERT_BREITE));\n';
  assert.equal((verdorben.match(/pdfTelefonGeschuetzt\(/g) || []).length, 3);
});

test('[Notfall·Übersicht·Lese-App] kurze Beschriftungen, dieselbe Reihenfolge, Zahl und Einheit zusammen', () => {
  const { V, document } = ladeLesen();
  V.setData({ sektoren: { identity: { givenName: 'Marlene' }, health: {
    allergiesMedicationFoodOther: [{ text: 'Penicillin' }],
    medicationOngoing: [{ text: ARZNEI }],
    chronicConditionsDiagnoses: [{ text: 'Diabetes' }],
    implantsProsthesesPacemakers: 'Herzschrittmacher',
    healthInsurance: { override: 'TK' }, generalPractitioner: { override: 'Dr. Lindner' }, insuranceNumber: 'A1',
    bodyWeightKg: '72' } }, personen: [], institutionen: [] });
  const modell = V.notfallKernModell();
  assert.ok(modell.length >= 8, JSON.stringify(modell.map((z) => z.label)));
  for (const z of modell) {
    assert.ok(z.ausgabeLabel, 'Beschriftung für Ausgaben: ' + z.label);
    assert.ok(klammerFrei(V.notfallZeileBeschriftung(z)), 'Klammer in der Lese-App: ' + V.notfallZeileBeschriftung(z));
  }
  V.renderNotfall();
  const html = document.getElementById('app').innerHTML;
  const labels = [...html.matchAll(/<div class="feld-label">([^<]*)<\/div>/g)].map((m) => m[1]);
  const pos = ['Allergien', 'Medikamente', 'Erkrankungen', 'Implantate', 'Hausarzt', 'Krankenkasse', 'Versichertennummer', 'Gewicht in kg'].map((l) => labels.indexOf(l));
  assert.ok(pos.every((p) => p >= 0), 'kurze Beschriftungen in der Lese-App: ' + JSON.stringify(labels));
  assert.deepEqual(pos.slice().sort((a, b) => a - b), pos, 'Reihenfolge wie auf der Karte');
  assert.ok(html.includes('Ramipril 5' + NB + 'mg'), 'Zahl und Einheit zusammen');
  assert.ok(!html.includes('Ramipril 5 mg'), 'keine ungeschützte Stelle');
});

test('[Notfall·Übersicht·Rot-Beweis] die Ordnung stellt Verwaltung hinter Kritisches, auch wenn das Modell sie davor hat', async () => {
  const V = await frisch();
  const verkehrt = [{ feld: 'insuranceNumber' }, { feld: 'generalPractitioner' }, { feld: 'medicationOngoing' }, { feld: 'allergiesMedicationFoodOther' }];
  assert.deepEqual(V.notfallZeilenGeordnet(verkehrt).map((z) => z.feld), ['allergiesMedicationFoodOther', 'medicationOngoing', 'generalPractitioner', 'insuranceNumber']);
});

test('[Notfall·Übersicht·Rot-Beweis] eine Beschriftung mit Klammer oder zu lang für die Spalte schlägt an', () => {
  assert.equal(klammerFrei('Allergien (Medikamente, Nahrung, Sonstiges)'), false);
  assert.equal(klammerFrei('Allergien'), true);
  assert.ok('Implantate / Prothesen / Schrittmacher'.length * 7.5 * 0.19 > LABEL_MM, 'die alte Beschriftung wäre umgebrochen');
});

/* Die Blutgruppe liest sich überall gleich: „A+“ ohne Leerzeichen, in Deutsch wie in Englisch (Ursache war das Options-Label
   „A +“ im deutschen Textsatz; das englische trug „A+“). */
const BLUTGRUPPEN = ['0+', '0-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'];
const mitLeerzeichen = (s) => /(^|[^A-Za-z0-9])(0|A|B|AB)\s[+−-]/.test(s);
function pruefeBlutgruppeKarteUndSicht(produkt) {
  return async () => {
    const { V, document } = await frischMitDokument(produkt);
    befuellen(V);
    const kopf = karte(V).map((r) => r.t).join('\n');
    assert.ok(/Blutgruppe|Blood type/.test(kopf) && kopf.includes('A+'), 'Karte: Blutgruppe „A+“ ' + kopf.slice(0, 200));
    assert.ok(!mitLeerzeichen(kopf), 'Karte: kein Leerzeichen in der Blutgruppe');
    const zeile = V.notfallKernModell().find((z) => z.feld === 'bloodType');
    assert.equal(zeile.wert, 'A+', 'Modell');
    V.renderNotfall();
    const html = document.getElementById('app').innerHTML;
    assert.ok(!mitLeerzeichen(html), 'Notfallsicht: kein Leerzeichen in der Blutgruppe');
    for (const g of BLUTGRUPPEN) {
      V.sektorFeldSetzen('health', 'bloodType', g);
      const w = V.notfallKernModell().find((z) => z.feld === 'bloodType').wert;
      assert.ok(!/\s/.test(w), 'Blutgruppe ohne Leerzeichen: ' + JSON.stringify(w));
    }
  };
}
test('[Notfall·Blutgruppe·privat-de] „A+“ ohne Leerzeichen auf der Karte, in der Notfallsicht und im Modell', pruefeBlutgruppeKarteUndSicht('privat-de'));
test('[Notfall·Blutgruppe·privat-en] „A+“ ohne Leerzeichen auf der Karte, in der Notfallsicht und im Modell', pruefeBlutgruppeKarteUndSicht('privat-en'));
test('[Notfall·Blutgruppe·Lese-App] „A+“ ohne Leerzeichen in der Notfallsicht', () => {
  const { V, document } = ladeLesen();
  V.setData({ sektoren: { identity: { givenName: 'Marlene' }, health: { bloodType: 'A+', allergiesMedicationFoodOther: [{ text: 'Penicillin' }] } }, personen: [], institutionen: [] });
  const w = V.notfallKernModell().find((z) => z.feld === 'bloodType').wert;
  assert.equal(w, 'A+');
  V.renderNotfall();
  const html = document.getElementById('app').innerHTML;
  assert.ok(html.includes('A+') && !mitLeerzeichen(html), 'Lese-App: Blutgruppe ohne Leerzeichen');
});
test('[Notfall·Blutgruppe·Rot-Beweis] die Messung schlägt bei „A +“ an und lässt „A+“ und „A−“ durch', () => {
  assert.equal(mitLeerzeichen('Blutgruppe A +'), true);
  assert.equal(mitLeerzeichen('Blutgruppe AB −'), true);
  assert.equal(mitLeerzeichen('Blutgruppe A+'), false);
  assert.equal(mitLeerzeichen('Blutgruppe 0−'), false);
});
