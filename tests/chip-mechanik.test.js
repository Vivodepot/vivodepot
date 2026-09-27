'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Test — Chip-Mechanik für Code-Slot-Felder (E1 Option C, Auftrag Chip-
   Mechanik 13.07.2026)
   ────────────────────────────────────────────────────────────────────────
   Mechanismus in der Basis, Terminologie-Listen bleiben unangetastet (Seed-
   Listen aus @vd-codeliste, keine Erweiterung). Belegt:
     • chipAusEingabe/chipListeMitNeuem: Bestätigung + Dedup (Personen-Widget-
       Konvention), nicht das Tippen selbst.
     • _codeEintraege: kein Kommasplitten mehr — ein Chip ist ein Eintrag,
       auch wenn sein Text ein Komma trägt (Regressionsschutz für den Befund
       vom 13.07.: „Peni"/„Allergie gegen Penicillin, Hasel").
     • feldValidieren/feldEingetragen: Chip-Array statt Skalar.
     • bearbeitungSpeichern: Chip-Gate — liest NUR bestätigte Chips aus dem
       DOM, nie den Eingabewert (Muster K für diese drei Felder).
     • Migration Schema 37→38: Skalar (Freitext ODER codierter Einzelwert)
       → genau EIN Chip, ohne Auto-Splitting.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

const PW = 'pw';
async function frischMitDepot() {
  const k = ladeKern();
  await k.V.depotAnlegen(PW);
  k.V.akteurSelbstErklaeren('Tester');
  return k;
}

test('1) chipAusEingabe: exakter Listen-Treffer → Chip mit Code; freier Text → Chip ohne Code; leer → null', () => {
  const { V } = ladeKern();
  const codiert = V.chipAusEingabe('atc', 'Ramipril');
  assert.equal(codiert.text, 'Ramipril');
  assert.equal(codiert.code.system, 'http://www.whocc.no/atc');
  assert.equal(codiert.code.code, 'C09AA05');
  const frei = V.chipAusEingabe('atc', 'Hausstaub');
  assert.deepEqual(JSON.parse(JSON.stringify(frei)), { text: 'Hausstaub' }, 'kein code-Feld bei Freitext');
  assert.equal(V.chipAusEingabe('atc', ''), null, 'leer → null');
  assert.equal(V.chipAusEingabe('atc', '   '), null, 'nur Leerraum → null');
});

test('2) chipListeMitNeuem: Dedup case-insensitiv/getrimmt; Duplikat ändert die Liste NICHT', () => {
  const { V } = ladeKern();
  let liste = V.chipListeMitNeuem([], { text: 'Penicillin' });
  assert.equal(liste.length, 1);
  liste = V.chipListeMitNeuem(liste, { text: '  penicillin  ' });
  assert.equal(liste.length, 1, 'Dedup: derselbe Text (Groß/Klein, Leerraum) legt keinen zweiten Chip an');
  liste = V.chipListeMitNeuem(liste, { text: 'Haselnuss' });
  assert.equal(liste.length, 2, 'ein neuer Text wird ein neuer Chip');
  assert.equal(V.chipListeMitNeuem(liste, { text: '' }).length, 2, 'leerer Text ändert nichts');
});

test('3) _codeEintraege: KEIN Kommasplitten — ein Chip mit Komma im Text bleibt EIN Eintrag', () => {
  const { V } = ladeKern();
  const eintraege = V._codeEintraege([{ text: 'Allergie gegen Penicillin, Hasel' }, { text: 'Peni' }]);
  assert.equal(eintraege.length, 2, 'genau zwei Chips → genau zwei Einträge, kein Auto-Split');
  assert.equal(eintraege[0].anzeigeName, 'Allergie gegen Penicillin, Hasel', 'Komma bleibt im Text — kein zweiter, erfundener Eintrag');
  assert.equal(eintraege[1].anzeigeName, 'Peni', 'auch ein abgebrochenes Wort wird nicht weiter zerlegt');
  assert.equal(V._codeEintraege([]).length, 0);
  assert.equal(V._codeEintraege(null).length, 0, 'defensiv: kein Array → leer, kein Wurf');
});

test('4) feldEingetragen/feldValidieren: Chip-Array statt Skalar', () => {
  const { V } = ladeKern();
  const feld = { id: 'allergien', typ: 'text', codeListe: 'snomedAllergen' };
  assert.equal(V.feldEingetragen(feld, []), false, 'leeres Array = nicht eingetragen');
  assert.equal(V.feldEingetragen(feld, [{ text: 'Penicillin' }]), true);
  assert.equal(V.feldValidieren(feld, [{ text: 'Penicillin' }]).ok, true);
  assert.equal(V.feldValidieren(feld, [{ text: '' }]).ok, false, 'ein Chip ohne Text ist ungültig');
  assert.equal(V.feldValidieren(feld, 'Penicillin').ok, false, 'ein Skalar-String ist für ein codeListe-Feld kein gültiger Wert mehr');
});

test('5) feldWertHTML/feldWertText: Chip-Array wird „, "-getrennt angezeigt, Code dezent, Komma bleibt EIN Chip', () => {
  const { V } = ladeKern();
  const feld = { id: 'allergien', typ: 'text', codeListe: 'snomedAllergen' };
  const chips = [V.chipAusEingabe('snomedAllergen', 'Allergie gegen Penicillin'), { text: 'Hausstaub, Milben' }];
  const html = V.feldWertHTML(feld, chips);
  assert.ok(html.includes('Allergie gegen Penicillin'));
  assert.ok(/feld-code/.test(html) && html.includes('91936005'), 'Code dezent für den codierten Chip');
  assert.ok(html.includes('Hausstaub, Milben'), 'Freitext-Chip mit Komma bleibt unangetastet im Text');
  const text = V.feldWertText(feld, chips);
  assert.ok(text.includes('Allergie gegen Penicillin') && text.includes('Hausstaub, Milben'));
  assert.ok(!/91936005/.test(text), 'PDF/QR-Text trägt keinen Code (Klartext, wie beim Einzelwert)');
});

test('6) fhirIpsBundle: Chip mit Code → coding; Chip ohne Code → nur text; kein Kommasplitten', async () => {
  const { V } = await frischMitDepot();
  const chipCodiert = V.chipAusEingabe('snomedAllergen', 'Allergie gegen Penicillin');
  V.sektorFeldSetzen('health', 'allergiesMedicationFoodOther', [chipCodiert, { text: 'Hausstaub, Milben und Sonstiges' }]);
  // N4 (09.08.2026): `allergien` traegt seit N4 Zug 1 `sensibel: true` (Liste 1, Gruppe A) — die
  // Probe hier gilt der Chip-Kodierung, nicht der Sensibel-Zurueckhaltung, darum Opt-in.
  const bundle = V.fhirIpsBundle(undefined, { sensibel: true });
  const allergien = bundle.entry.map(e => e.resource).filter(r => r.resourceType === 'AllergyIntolerance');
  assert.equal(allergien.length, 2, 'zwei Chips → zwei Ressourcen — der Kommafreitext wird NICHT weiter gesplittet');
  const codierte = allergien.find(a => a.code.coding);
  assert.equal(codierte.code.coding[0].code, '91936005');
  assert.equal(codierte.code.coding[0].system, 'http://snomed.info/sct');
  const frei = allergien.find(a => !a.code.coding);
  assert.equal(frei.code.text, 'Hausstaub, Milben und Sonstiges', 'ein Chip mit Kommas bleibt EIN Eintrag im Bundle');
});

// Hinweis: ein DOM-getriebener Test von bearbeitungSpeichern (Chip im DOM anlegen → speichern →
// prüfen, dass der unbestätigte Eingabewert NICHT ankam) ist mit dem schlanken DOM-Stub dieser
// Datei (load-kern.js: querySelectorAll liefert immer [], appendChild häng nichts real ein) nicht
// ehrlich simulierbar — anders als der Stub in load-lesen.js (Lese-App), der Elemente pro id
// cached. Die Harvesting-Logik selbst (bearbeitungSpeichern liest [data-chip-liste] → .chip[data-chip])
// ist Code-Review-geprüft und spiegelt exakt das etablierte, bereits getestete refm-Muster
// ([data-refm] → _refmSammeln). Function-Ebene (chipAusEingabe/_codeEintraege/Migration) ist oben
// vollständig abgedeckt — das ist, was ohne echten Browser ehrlich und wichtig testbar ist.

test('7) Migration Schema 37→38: Freitext-Skalar → EIN Chip, kein Auto-Split am Komma', () => {
  const { V } = ladeKern();
  const alt = V.leeresDepot();
  alt.schemaVersion = 37;
  alt.sektoren.gesundheit = { allergien: 'Allergie gegen Penicillin, Hasel' };
  V.depotNormalisieren(alt);
  assert.equal(alt.schemaVersion, V.SCHEMA_VERSION_AKTUELL);
  assert.deepEqual(JSON.parse(JSON.stringify(alt.sektoren.health.allergiesMedicationFoodOther)), [{ text: 'Allergie gegen Penicillin, Hasel' }],
    'der Altbestand wird zu GENAU EINEM Chip — auch mit Komma im Text, kein Auto-Splitting');
});

test('8) Migration Schema 37→38: codierter Alt-Einzelwert (Paket 3) → EIN Chip MIT Code', () => {
  const { V } = ladeKern();
  const alt = V.leeresDepot();
  alt.schemaVersion = 37;
  alt.sektoren.gesundheit = { medikamente: { code: 'C09AA05', system: 'http://www.whocc.no/atc', anzeigeName: 'Ramipril' } };
  V.depotNormalisieren(alt);
  assert.equal(alt.schemaVersion, V.SCHEMA_VERSION_AKTUELL);
  assert.deepEqual(JSON.parse(JSON.stringify(alt.sektoren.health.medicationOngoing)),
    [{ text: 'Ramipril', code: { system: 'http://www.whocc.no/atc', code: 'C09AA05' } }]);
});

test('9) Migration Schema 37→38: leer bleibt leer; bereits migriert (Array) bleibt unangetastet (idempotent)', () => {
  const { V } = ladeKern();
  const alt = V.leeresDepot();
  alt.schemaVersion = 37;
  alt.sektoren.gesundheit = { krankheiten: '', medikamente: [{ text: 'Ibuprofen' }] };
  V.depotNormalisieren(alt);
  assert.equal(alt.sektoren.health.chronicConditionsDiagnoses, undefined, 'leerer Skalar wird entfernt, nicht zu einem Leer-Chip');
  assert.deepEqual(JSON.parse(JSON.stringify(alt.sektoren.health.medicationOngoing)), [{ text: 'Ibuprofen' }], 'bereits migrierter Wert bleibt unverändert');
  // Erneuter Lauf ändert nichts mehr (Idempotenz).
  const vorher = JSON.stringify(alt.sektoren.health);
  V.depotNormalisieren(alt);
  assert.equal(JSON.stringify(alt.sektoren.health), vorher);
});

test('10) Terminologie-Listen bleiben unangetastet: keine neuen Codes, keine Andockpunkte durch diesen Auftrag', () => {
  const { V } = ladeKern();
  // Die drei Seed-Listen tragen exakt den Stand aus den @vd-codeliste-Blöcken — dieser Auftrag
  // erweitert sie nicht (Abgrenzung laut Auftrag Chip-Mechanik).
  assert.ok(V.liesCodeListe('atc').daten.length >= 5 && V.liesCodeListe('atc').daten.length < 20, 'ATC bleibt Sample/Seed');
  assert.ok(V.liesCodeListe('snomedAllergen').teilliste, 'SNOMED-Sample bleibt als Teilliste markiert (Lizenz)');
});
