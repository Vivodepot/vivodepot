'use strict';
/* ═════════════════════════════════════════════════════════════════
   Studio nach dem freigegebenen Dummy vom 14.11.2026, die übrigen Zeilen der Arbeitsfläche (Wagen Studio nach Dummy, 22.11.2026).
   ─────────────────────────────────────────────────────────────────
   N11  Das Beispiel „Anmeldung in einer Praxis“ trägt Name, Geburtsdatum, Krankenversicherung, Medikamente (ATC) und Allergien (SNOMED);
        es ersetzt „anamnese“, deren Bausteine wählbar bleiben.
   N10  Das Beispiel „Aufnahme in einen Verein“ trägt Name, Anschrift, E-Mail und Bankverbindung (Dummy Z. 159, 249).
   N16  Der Name der Vorlage steht im Kopf, ausgeblendet nur am Telefon.
   N22  Die Bausteinliste zeigt nur Bausteine; der Schalter für technische Begriffe und „Fehlt etwas?“ stehen unter „Weitere“.
   N31, N32, N38  In der Bausteinliste heißen drei Einträge „Personalausweis“, „Foto“ und „Bankverbindung“; die Ausgabe trägt weiter den
        Namen des Kernfelds, damit das Depot das Feld findet.
   N52  Die leere Vorlage sagt breit „Ziehen Sie Bausteine aus „Bausteine“ hierher. Oder wählen Sie „+“ am Baustein.“ (Dummy: „von links“; ohne Richtungswort, tests/studio-texte-ohne-richtungswort.test.js), schmal
        „Noch keine Datenfelder. Wählen Sie „Baustein hinzufügen“.“
   N66  Die Zahl heißt „1 Datenfeld“ / „N Datenfelder“, keine Klammerform „Feld(er)“.
   N71  Fehlt der Name, trägt das Namensfeld einen roten Rahmen.
   ROT-BEWEIS: der letzte Fall setzt jede Zeile auf den Kanon-Stand efb4b7886 zurück und erwartet rot; dazu
   GENERATOR_HTML_PATH=<Kanon efb4b7886> node --test tests/studio-nach-dummy-l4.test.js → alle Fälle außer dem Rot-Beweis rot.
   ═════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { ladeGenerator, GEN_PATH } = require('./load-generator.js');

const HTML = fs.readFileSync(GEN_PATH, 'utf8');
const nativ = (x) => JSON.parse(JSON.stringify(x));

/* Der Name, den die Bausteinliste für eine Kennung zeigt (dieselbe Zuordnung, aus der die Liste ihre Einträge baut). */
function palettenName(g, kennung) {
  const k = g.V.FELDKATALOG.find((x) => x.kennung === kennung);
  return k && typeof g.sandbox.studioBausteinName === 'function' ? g.sandbox.studioBausteinName(k) : null;
}

function befunde(html) {
  const f = [];
  const g = ladeGenerator({ html });
  const V = g.V;
  // N10
  const v = V.BEISPIEL_TEMPLATES.verein;
  const namen = v ? v.felder.map((x) => x.feldname) : [];
  for (const n of ['Vorname', 'Nachname', 'Straße', 'Hausnummer', 'Postleitzahl', 'Ort', 'E-Mail', 'Konten']) if (namen.indexOf(n) < 0) f.push('N10: Verein ohne ' + n);
  if (!v || v.kachel !== 'Name, Anschrift, E-Mail, Bankverbindung') f.push('N10: Kachel des Vereins nicht wie im Dummy');
  // N11 (Entscheidung 22.11.2026: „anamnese“ geht in „praxis“ auf; Körpergröße, Gewicht, Erkrankungen bleiben Bausteine)
  const pr = V.BEISPIEL_TEMPLATES.praxis;
  const pn = pr ? pr.felder.map((x) => x.feldname) : [];
  for (const n of ['Vorname', 'Nachname', 'Geburtsdatum', 'Krankenversicherung', 'Medikamente (laufend)', 'Bekannte Allergien']) if (pn.indexOf(n) < 0) f.push('N11: Praxis ohne ' + n);
  if (!pr || pr.kachel !== 'Name, Geburtsdatum, Krankenversicherung, Medikamente') f.push('N11: Kachel der Praxis nicht wie im Dummy');
  if (!/id="bsp-praxis"/.test(html)) f.push('N11: keine Kachel für die Praxis');
  if (V.BEISPIEL_TEMPLATES.anamnese) f.push('N11: „anamnese“ steht noch als eigenes Beispiel');
  const bausteine = new Set(V.FELDKATALOG.filter((x) => x.kennung.indexOf('/') < 0 && x.kennung.indexOf('[') < 0).map((x) => x.kennung));
  for (const k of ['health.heightCm', 'health.bodyWeightKg', 'health.chronicConditionsDiagnoses']) if (!bausteine.has(k)) f.push('N11: Baustein ' + k + ' fehlt');
  // N16
  if (/\n {2}\.bau-ort \{ display: none; \}/.test(html) || !/@media \(max-width: 760px\) \{ \.bau-ort \{ display: none; \} \}/.test(html)) f.push('N16: Name der Vorlage nicht nur am Telefon ausgeblendet');
  // N22
  const kopf = html.slice(html.indexOf('<aside class="palette"'), html.indexOf('<div id="pal-liste"></div>'));
  const weitere = html.slice(html.indexOf('<details class="pal-frei">'), html.indexOf('</details>', html.indexOf('<details class="pal-frei">')));
  if (/id="pal-kennungen"/.test(kopf) || !/id="pal-kennungen"/.test(weitere)) f.push('N22: Schalter nicht unter „Weitere“');
  if (!/id="pal-vorschlagen"/.test(weitere)) f.push('N22: „Fehlt etwas?“ nicht unter „Weitere“');
  // N31, N32, N38
  const soll = { 'identity.idDocuments': 'Personalausweis', 'identity.profilePhotoCoverPage': 'Foto', 'finance.accounts': 'Bankverbindung' };
  for (const [k, n] of Object.entries(soll)) {
    let ist = null;
    try { ist = palettenName(g, k); } catch (_) { ist = null; }
    if (ist !== n) f.push('N31/N32/N38: ' + k + ' heißt „' + ist + '“');
  }
  try {
    const idx = V.FELDKATALOG.findIndex((x) => x.kennung === 'identity.idDocuments');
    if (V.feldAusKatalog(idx).feldname !== V.FELDKATALOG[idx].label) f.push('N31: die Ausgabe trägt nicht den Namen des Kernfelds');
  } catch (_) { f.push('N31: feldAusKatalog fehlt'); }
  // N52
  if (!html.includes("L('Ziehen Sie Bausteine aus „Bausteine“ hierher. Oder wählen Sie „+“ am Baustein.'")) f.push('N52: Leertext breit nicht wie im Dummy');
  if (!html.includes("L('Noch keine Datenfelder. Wählen Sie „Baustein hinzufügen“.'")) f.push('N52: Leertext schmal nicht wie im Dummy');
  if (!/@media \(max-width: 760px\) \{ \.vorschau-leer \.leer-breit \{ display: none; \} \.vorschau-leer \.leer-schmal \{ display: inline; \} \}/.test(html)) f.push('N52: breit und schmal nicht getrennt');
  // N66
  let t1 = '', t3 = '';
  try { t1 = g.sandbox.datenfelderText(1); t3 = g.sandbox.datenfelderText(3); } catch (_) { /* fehlt */ }
  if (t1 !== '1 Datenfeld' || t3 !== '3 Datenfelder') f.push('N66: Zahl der Datenfelder „' + t1 + '“ / „' + t3 + '“');
  if (/Feld\(er\)/.test(html.slice(html.indexOf('<div id="raum-bau"'), html.indexOf('<aside class="eigenschaften"')))) f.push('N66: „Feld(er)“ auf der Arbeitsfläche');
  // N71
  if (!/\.vorlage-kopf input\[aria-invalid="true"\]/.test(html)) f.push('N71: kein Rahmen am Namensfeld');
  return f;
}

test('[Studio nach Dummy] N10, N11, N16, N22, N31, N32, N38, N52, N66, N71 wie im Dummy', () => {
  assert.deepEqual(befunde(HTML), []);
});

test('[Studio nach Dummy] die Beispiele Verein und Praxis bestehen die Vorprüfung und das Einreich-Schema', () => {
  const { V } = ladeGenerator();
  for (const id of ['verein', 'praxis']) {
  const b = V.BEISPIEL_TEMPLATES[id];
  const felder = nativ(V.felderAngleichungen(b.felder.map((x) => Object.assign({}, x, { bereich: V.normBereich(x.bereich) }))).felder);
  const state = { felder, anbieter: V.baueAnbieter({ anbieterName: 'Beispielverein', strasse: 'Am Markt 2', plz: '99999', ort: 'Beispielstadt', land: 'Deutschland',
    kontaktName: 'Ansprechperson', kontaktEmail: 'kontakt@beispielstadt.example' }), publicKeyJwk: { kty: 'OKP', crv: 'Ed25519', x: 'a' } };
  assert.notEqual(V.vorabUrteilVorlage(state).urteil, 'abgewiesen', id);
  assert.deepEqual(nativ(V.validiereSubmission(V.baueSubmission(state))), [], id);
  }
});

test('[Studio nach Dummy · Rot-Beweis] jede Zeile auf dem Kanon-Stand wird rot', () => {
  const mut = (a, b) => { assert.ok(HTML.includes(a), 'Vorbedingung: ' + a.slice(0, 60)); return HTML.replace(a, b); };
  const fall = (html, muster) => assert.ok(befunde(html).some((x) => x.startsWith(muster)), muster + ': ' + befunde(html).join(' | '));
  fall(mut("kachel: 'Name, Anschrift, E-Mail, Bankverbindung',", "kachel: 'Name',"), 'N10');
  fall(mut('id="bsp-praxis"', 'id="bsp-anamnese"'), 'N11');
  fall(mut('  @media (max-width: 760px) { .bau-ort { display: none; } }', '  .bau-ort { display: none; }'), 'N16');
  fall(mut('<input type="checkbox" id="pal-kennungen">', '<input type="checkbox" id="pal-kennungen-weg">'), 'N22');
  fall(mut("  'identity.profilePhotoCoverPage': { de: 'Foto', en: 'Photo' },", ''), 'N31/N32/N38');
  fall(mut("L('Noch keine Datenfelder. Wählen Sie „Baustein hinzufügen“.'", "L('Hier entsteht Ihre Vorlage'"), 'N52');
  fall(mut("function datenfelderText(n) { return n === 1 ? L('1 Datenfeld', '1 data field') : L(n + ' Datenfelder', n + ' data fields'); }",
    "function datenfelderText(n) { return L(n + ' Feld(er)', n + ' field(s)'); }"), 'N66');
  fall(mut(', .vorlage-kopf input[aria-invalid="true"] {', ' {'), 'N71');
});
