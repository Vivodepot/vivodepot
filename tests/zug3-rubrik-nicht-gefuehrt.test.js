'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   ZUG 3 (BERICHTIGTE FASSUNG) · Was geschieht mit den sechs Ausgabewegen an
   `gesundheit`, wenn ein Depot die Rubrik NICHT FÜHRT?
   ────────────────────────────────────────────────────────────────────────────
   Produktentscheidung, 21.08.2026: *„Im Kanzlei-Depot wäre Gesundheit gar
   nicht enthalten."* Ein Bereichssatz FÜHRT eine Rubrik oder führt sie nicht —
   er belegt sie nicht um.

   DAS ERSTE MESSERGEBNIS IST, DASS DER ZUSTAND HEUTE NICHT HERSTELLBAR IST.
   `SEKTOREN` ist eingefroren, und `bereicheAlle()` liefert `SEKTOREN` plus
   angedockte Module — es gibt keinen Weg, eine eingebaute Rubrik WEGZULASSEN.
   Der Bereichssatz als Eigenschaft der DATEI ist genau der Bau, der kommt.

   **Ein „sie entfallen sauber" liesse sich heute also nur behaupten.** Was
   stattdessen gemessen werden kann und die Bauarbeit bestimmt: **woran jeder der
   sechs Wege HÄNGT** — am Bereichs-Objekt (dann entfällt er mit ihm) oder an
   einem Literal in einer eingefrorenen Tabelle (dann bleibt er stehen).

   POSITIVKONTROLLE, wie beauftragt: im Bürgerdepot tragen alle sechs.
   ════════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { ladeKern } = require('./load-kern.js');

const KERN = () => fs.readFileSync(path.join(__dirname, '..', 'vivodepot.html'), 'utf8');

test('[Zug3·Vorbedingung] der Zustand „Rubrik nicht geführt" ist heute NICHT herstellbar', () => {
  /* Das ist kein Nebensatz, sondern das erste Ergebnis: solange `bereicheAlle()` die zwölf
     unverändert liefert, kann niemand messen, was ohne sie geschieht. */
  const { V } = ladeKern();
  const d = V.leeresDepot();
  V.setData(d);
  const ids = V.bereicheAlle().map((s) => s.id);
  assert.ok(ids.includes('health'),
    'ein leeres Depot führt `gesundheit` nicht mehr — dann ist der Bereichssatz gebaut und diese '
    + 'Datei ist neu zu messen');
  /* Stufe 2 (09.09.2026) — die EINGEBAUTE MENGE ist weiterhin dreizehn, liegt aber seit dem
     Umzug in zwei Quellen. Über `bereicheAlle()` gezählt; `SEKTOREN` allein führt zwölf. */
  assert.equal(V.bereicheAlle().length, 13, 'die eingebaute Menge ist nicht mehr dreizehn');
  assert.ok(Object.isFrozen(V.SEKTOREN), '`SEKTOREN` ist nicht mehr eingefroren');
});

test('[Zug3·Positivkontrolle] im Bürgerdepot tragen die Ausgabewege', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen('pw');
  V.akteurSelbstErklaeren('B');
  const chip = V.chipAusEingabe('snomedAllergen', 'Allergie gegen Penicillin');
  V.sektorFeldSetzen('health', 'allergiesMedicationFoodOther', [chip]);

  const typen = (V.fhirIpsBundle(undefined, { sensibel: true }).entry || [])
    .map((e) => e.resource.resourceType);
  assert.ok(typen.includes('AllergyIntolerance'), 'FHIR-IPS-Export trägt nicht: ' + typen.join(', '));

  const g = V.SEKTOREN.find((s) => s.id === 'health');
  assert.equal(g.format, V.SEKTOR_FORMATE.FHIR_IPS, 'das Bereichsformat steht nicht mehr am Bereich');
  assert.deepEqual((g.exporte || []).map((e) => e.format), ['fhir-ips'],
    'der Export-Knopf hängt nicht mehr am Bereich');
});

test('[Zug3·DIE MESSUNG] woran jeder der sechs Wege hängt — am Bereich oder an einem Literal', () => {
  /* Die Aufteilung ist die Bauarbeit: was am Bereich hängt, entfällt mit ihm von selbst; was in
     einer eingefrorenen Tabelle an `sektor: 'gesundheit'` hängt, bleibt stehen und muss beim
     Bereichssatz-Bau eigens behandelt werden. */
  const { V } = ladeKern();
  const text = KERN();
  const g = V.SEKTOREN.find((s) => s.id === 'health');

  /* 1 · Bereichsformat — AM BEREICH. */
  assert.equal(g.format, V.SEKTOR_FORMATE.FHIR_IPS);
  /* 2 · Export-Knopf — AM BEREICH (`s.exporte`, gelesen in der Bereichsansicht). */
  assert.ok((g.exporte || []).some((e) => e.format === 'fhir-ips'));
  assert.ok(/\(Array\.isArray\(s\.exporte\) \? s\.exporte : \[\]\)/.test(text),
    'die Knopfliste kommt nicht mehr aus `s.exporte` — dann ist die Aussage neu zu messen');

  /* 3–6 · die vier Literale in eingefrorenen Tabellen. */
  const literale = [
    ["Export-Registry `fhir-ips`", /id: 'fhir-ips', kategorie: 'sektor', sektor: 'health'/],
    ["Import-Registry `fhir-ips`", /id: 'fhir-ips'[\s\S]{0,120}sektor: 'health'/],
    ["Import-Registry `fhir-lab`", /id: 'fhir-lab'[\s\S]{0,120}sektor: 'health'/],
    ["Notfallkern-Allowlist", /\{ sektor: 'health', feld: 'emergencyContacts' \}/],
    ["Notfallkarte-Altnamen", /sektorId: 'health', feldId: 'emergencyCardPatientId'/],
  ];
  for (const [name, muster] of literale) {
    assert.ok(muster.test(text), name + ' ist nicht mehr an einem `gesundheit`-Literal gebunden — '
      + 'dann ist der Weg umgebaut und die Messung überholt');
  }
});

test('[Zug3·Gegenprobe] die Literale hängen NICHT am Bereichs-Objekt — sie überleben es', () => {
  /* Ohne diese Gegenprobe wäre „vier Literale" nur eine Textsuche. Gemessen: die Export-Registry
     führt ihren `fhir-ips`-Eintrag unabhängig davon, ob die Bereichsliste ihn kennt — sie ist
     eingefroren und wird nirgends gegen `bereicheAlle()` gefiltert. */
  const { V } = ladeKern();
  const eintrag = V.EXPORT_FORMAT_BY_ID['fhir-ips'];
  assert.ok(eintrag, 'der Registry-Eintrag fehlt');
  assert.equal(eintrag.sektor, 'health');
  assert.ok(Object.isFrozen(V.EXPORT_FORMATE), 'die Registry ist nicht mehr eingefroren');
  const text = KERN();
  assert.ok(!/EXPORT_FORMATE\.filter\([^)]*SEKTOR_BY_ID/.test(text),
    'die Registry wird jetzt gegen die Bereichsliste gefiltert — dann entfielen die Wege doch von '
    + 'selbst, und der Befund ist überholt');
});

test('[Zug3·Nebenbefund] eine VORLAGE kann kein Feld in die eigene Rubrik eines Moduls legen', () => {
  /* GEMESSEN beim Versuch, den Anwalts-Prüfstoff wie beauftragt auf eine eigene Kennung
     umzustellen: `_templateFelderUebersetzen` verwirft `bereich: 'obhut'` mit `grund: 'bereich'`,
     und das Einreich-Schema führt für `bereich` einen geschlossenen enum der zwölf. Mit `obhut`
     kamen 49 statt 56 Definitionen an.

     DIE UMSTELLUNG GEHÖRT DAMIT IN DEN BEREICHSSATZ-BAU, nicht in eine Fixture-Änderung — sonst
     entstünde ein Prüfstoff, der durch den Vorlagen-Weg nicht mehr passt. Gemeldet statt
     aufgelöst; der Grund steht auch im Fixture. */
  const { V } = ladeKern();
  const r = V._templateFelderUebersetzen({ felder: [
    { feldname: 'Fristensystem', feldtyp: 'text', bereich: 'obhut' },
    { feldname: 'Blutgruppe', feldtyp: 'text', bereich: 'health' },
  ] });
  assert.equal(r.feldDefinitionen.length, 1, 'beide Felder kommen an — dann ist die Schranke gefallen');
  assert.deepEqual(r.verworfeneFelder, [{ name: 'Fristensystem', grund: 'bereich' }]);
});
