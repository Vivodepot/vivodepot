'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Test — Patientenverfügung-Wizard (pvwiz) + Geburt-Muster (Teil 2, Schnitt 2.4)
   ────────────────────────────────────────────────────────────────────────
   pvwiz ist die zweite Sektor-Ziel-Definition (Bereich 8) — Volltext-Bausteine
   (BMJ-orientiert) als Schritt-Auswahl, schreibt in dieselben Felder wie die
   manuelle Eingabe. Geburt (gebwiz) ist das Situations-Ziel-Muster: reine
   Registry-Definition, KEIN neuer Maschinen-Code — sie füllt das bereits
   existierende Situationsblatt 'geburt'.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { ladeKern } = require('./load-kern.js');

const PW = 'pw';
async function frischMitDepot() {
  const k = ladeKern();
  await k.V.depotAnlegen(PW);
  k.V.akteurSelbstErklaeren('Tester');
  return k;
}

/* ── pvwiz ──────────────────────────────────────────────────────────────── */

// PV-Bau 10.07.: pvwiz ist auf die amtlichen BMJ-Textbausteine umgestellt. Die BMJ-Schritte stammen
// aus der EINEN Quelle PV_BMJ (dieselbe, aus der der Dokument-Generator schöpft → Wizard = Dokument 1:1).
// Die PV-Felder sind additiv (kein Schema-Bump; sektorFeldSetzen hat keine Whitelist) und schreiben in
// denselben Store data.sektoren.advanceCare wie die manuelle/Rahmen-Eingabe — kein paralleles Modell.
function stepIdx(def, fid) { return def.schritte.findIndex(s => s.feld.id === fid); }

test('1) pvwiz registriert; Ziel vorsorge; Rahmen-Felder in Bereich 8; BMJ-Schritte aus PV_BMJ (eine Quelle)', async () => {
  const { V } = await frischMitDepot();
  const def = V.WIZARD_BY_ID.pvwiz;
  assert.ok(def, 'pvwiz registriert');
  assert.equal(def.ziel.sektor, 'advanceCare');
  // U2-ADR-096: Die Rahmen-Metadaten sind keine Sektor-Flachfelder mehr — sie leben als
  // Unterfelder an der Instrument-Zeile (typ='living-will'). Das Gate ist ganz entfallen:
  // ein Eintrag IST die Aussage „vorhanden".
  const liste = V.SEKTOR_BY_ID.advanceCare.sektionen.flatMap(s => s.felder)
    .find(f => f.id === 'provisionInstruments');
  const ufIds = (liste.unterFelder || []).map(u => u.id);
  for (const rid of ['storageLocation', 'medicalSupervisionBy'])
    assert.ok(ufIds.includes(rid), 'Rahmen-Feld als Unterfeld der Instrument-Liste: ' + rid);
  const sektorIds = V.SEKTOR_BY_ID.advanceCare.sektionen.flatMap(s => s.felder).map(f => f.id);
  assert.ok(!sektorIds.includes('patientenverf_vorhanden'), 'das Gate ist entfallen, nicht verschoben');
  // Und der Wizard schreibt in KEIN Feld mehr, das es nicht gibt (stiller Waisen-Write).
  const zielLos = def.schritte.map(st => st.feld.id)
    .filter(id => !sektorIds.includes(id) && !ufIds.includes(id)
                  && !V.PV_BMJ.steps.some(b => b.feld.id === id));
  assert.equal(zielLos.join(','), '', 'kein pvwiz-Schritt schreibt ins Nichts');
  // Jeder amtliche BMJ-Schritt aus PV_BMJ taucht als Wizard-Schritt auf (eine Quelle).
  const wizIds = def.schritte.map(s => s.feld.id);
  for (const s of V.PV_BMJ.steps) assert.ok(wizIds.includes(s.feld.id), 'BMJ-Schritt im Wizard: ' + s.feld.id);
});

test('2) BMJ-Baustein als Schritt-Auswahl: Maßnahme schreibt ihr Feld (amtlicher Volltext)', async () => {
  const { V } = await frischMitDepot();
  const def = V.WIZARD_BY_ID.pvwiz;
  const feld = V.PV_BMJ.steps.find(s => s.feld.id === 'artificialNutritionAndHydration').feld;
  assert.equal(feld.optionen.map(o => o.wert).join(','), 'ja,palliativ,nein');
  assert.ok(feld.optionen.every(o => o.label.length > 25), 'Optionen sind amtliche Volltext-Bausteine');
  const r = V.wizardSchrittSetzen('pvwiz', stepIdx(def, 'artificialNutritionAndHydration'), 'nein');
  assert.equal(r.ok, true);
  assert.equal(V.getData().sektoren.advanceCare.artificialNutritionAndHydration, 'nein');
});

test('3) pvwiz schreibt mehrere Bereich-8-Felder gestempelt (kein paralleles Modell)', async () => {
  const { V } = await frischMitDepot();
  const def = V.WIZARD_BY_ID.pvwiz;
  V.wizardSchrittSetzen('pvwiz', stepIdx(def, 'lifeSustainingMeasures'), 'unterlassen');
  V.wizardSchrittSetzen('pvwiz', stepIdx(def, 'artificialNutritionAndHydration'), 'nein');
  const d = V.getData();
  assert.equal(d.sektoren.advanceCare.lifeSustainingMeasures, 'unterlassen');
  assert.equal(d.sektoren.advanceCare.artificialNutritionAndHydration, 'nein');
  assert.equal(d.urheberschaft.advanceCare.lifeSustainingMeasures.length, 1, 'gestempelt');
});

test('3b) alte Grundhaltung-Felder verwaisen: pvwiz schreibt sie nicht mehr', async () => {
  const { V } = await frischMitDepot();
  const wizIds = V.WIZARD_BY_ID.pvwiz.schritte.map(s => s.feld.id);
  for (const alt of ['patientenverf_haltung', 'patientenverf_wunsch', 'palliativ_wunsch', 'organDonation'])
    assert.ok(!wizIds.includes(alt), 'verwaist, nicht mehr im Wizard: ' + alt);
});

test('3c) Dokument-Generator ist Zusammensteller: gewählte Bausteine 1:1, Bezugssatz, Sentinel raus', async () => {
  const { V } = await frischMitDepot();
  const def = V.WIZARD_BY_ID.pvwiz;
  V.wizardSchrittSetzen('pvwiz', stepIdx(def, 'applicableSituations'), ['sterbeprozess']);
  V.wizardSchrittSetzen('pvwiz', stepIdx(def, 'artificialNutritionAndHydration'), 'nein');
  V.wizardSchrittSetzen('pvwiz', stepIdx(def, 'acceptsLifeShorteningFromPain'), 'nein'); // Sentinel „(kein Zusatz)"
  const text = V.pvDokumentAbschnitte().flatMap(a => a.zeilen).join('\n');
  // Wortlaut 1:1 aus PV_BMJ (Wizard = Dokument)
  const ernLabel = V.PV_BMJ.steps.find(s => s.feld.id === 'artificialNutritionAndHydration').feld.optionen.find(o => o.wert === 'nein').label;
  assert.ok(text.includes(ernLabel), 'Ernährungs-Baustein 1:1 im Dokument');
  assert.ok(text.includes('In den oben beschriebenen Situationen wünsche ich, ' + ernLabel), 'Bezugssatz vorangestellt');
  assert.ok(!text.includes('(kein Zusatz)'), 'Sentinel-Option nicht im Dokument');
  assert.ok(text.includes(V.PV_BMJ.eingangsformel), 'Eingangsformel steht im Dokument');
  // Der Generator erfindet nichts: jede Maßnahmen-/Situations-Zeile stammt wörtlich aus PV_BMJ.
  const alleLabels = new Set(V.PV_BMJ.steps.flatMap(s => (s.feld.optionen || []).map(o => o.label)));
  const sitZeilen = V.pvDokumentAbschnitte().find(a => /Situationen/.test(a.titel)).zeilen.filter(z => z.startsWith('– '));
  for (const z of sitZeilen) assert.ok(alleLabels.has(z.slice(2)), 'Situations-Zeile wörtlich aus PV_BMJ: ' + z);
});

test('3d) SP-Wortlaut-Korrekturen (BMJ 1:1): Organspende-Vorrang, Verbindlichkeit-Rollen, Aktualisierung', async () => {
  const { V } = await frischMitDepot();
  const def = V.WIZARD_BY_ID.pvwiz;
  const setz = (fid, wert) => V.wizardSchrittSetzen('pvwiz', def.schritte.findIndex(s => s.feld.id === fid), wert);

  // Organspende (2.9): Zustimmungs-Baustein endet amtlich auf „…, dann"; die selbst formulierte
  // Vorrang-Einleitung ist ENTFERNT; die Vorrang-Option schließt direkt an.
  const zu = V.PV_BMJ.steps.find(s => s.feld.id === 'organDonationDecision').feld.optionen.find(o => o.wert === 'zustimmung').label;
  assert.ok(/, dann$/.test(zu), 'Zustimmungs-Baustein endet auf „, dann"');
  assert.ok(zu.includes('Organspendeausweis ausgefüllt') && zu.includes('sich abzeichnenden Hirntod'), 'voller amtlicher Zustimmungstext');
  assert.equal(V.PV_BMJ.organspendeVorrangEinleitung, undefined, 'keine selbst formulierte Vorrang-Einleitung mehr');
  setz('organDonationDecision', 'zustimmung');
  setz('priorityIfOrganDonationConflict', 'patientenverfuegung');   // Auswahlwert eines anderen Feldes, nicht der Typ-Code
  let text = V.pvDokumentAbschnitte().flatMap(a => a.zeilen).join('\n');
  assert.ok(text.includes(zu), 'Zustimmungs-Baustein im Dokument');
  assert.ok(text.includes('gehen die Bestimmungen in meiner Patientenverfügung vor.'), 'Vorrang-Option schließt an');
  assert.ok(!text.includes('Sollten für eine Organspende Maßnahmen'), 'alte erfundene Einleitung ist raus');

  // Vorrang-Option NUR bei Zustimmung, nicht bei Ablehnung.
  const { V: V2 } = await frischMitDepot();
  const def2 = V2.WIZARD_BY_ID.pvwiz;
  const setz2 = (fid, wert) => V2.wizardSchrittSetzen('pvwiz', def2.schritte.findIndex(s => s.feld.id === fid), wert);
  setz2('organDonationDecision', 'ablehnung');
  setz2('priorityIfOrganDonationConflict', 'living-will');
  const t2 = V2.pvDokumentAbschnitte().flatMap(a => a.zeilen).join('\n');
  assert.ok(!t2.includes('gehen die Bestimmungen in meiner Patientenverfügung vor.'), 'kein Vorrang bei Ablehnung');

  // Verbindlichkeit (2.6): amtliche Rollen-Wortlaute; Option-Label == Dokument-Text (kein Drift).
  for (const wert of ['bevollmaechtigt', 'betreuer', 'arzt']) {
    const optLabel = V.PV_BMJ.steps.find(s => s.feld.id === 'whoseViewMattersIfUnregulated').feld.optionen.find(o => o.wert === wert).label;
    assert.equal(V._pvRolleLabel(wert), optLabel, 'Rollen-Label 1:1 Wizard==Dokument: ' + wert);
  }
  assert.equal(V._pvRolleLabel('arzt'), 'der behandelnden Ärztin oder dem behandelnden Arzt.', 'amtlich „oder", mit Punkt');
  assert.equal(V._pvRolleLabel('andere', 'Frau Muster'), 'anderer Person: Frau Muster', 'amtlich „anderer Person: …"');
  // beide Vorkommen (reichweite + widerruf) identisch amtlich
  const wr = V.PV_BMJ.steps.find(s => s.feld.id === 'whoseViewMattersIfDeviatingWill').feld.optionen.map(o => o.label).join('|');
  assert.ok(wr.includes('der behandelnden Ärztin oder dem behandelnden Arzt.') && wr.includes('anderer Person: …'), 'Widerruf-Rollen amtlich');

  // Aktualisierung (2.14): amtlicher Platzhalter „(Zeitangabe)".
  const bef = V.PV_BMJ.steps.find(s => s.feld.id === 'validityDuration').feld.optionen.find(o => o.wert === 'befristet').label;
  assert.ok(bef.includes('nach Ablauf von (Zeitangabe)'), 'amtlicher Platzhalter (Zeitangabe)');
  assert.ok(!bef.includes('einer bestimmten Zeit'), 'alte Formulierung raus');
});

test('3e) Aktualisierung (2.14): Frist wird INLINE in „(Zeitangabe)" eingesetzt, kein Zusatzsatz', async () => {
  // Mit Eingabe: Frist ersetzt den Platzhalter im EINEN amtlichen Satz.
  const { V } = await frischMitDepot();
  const def = V.WIZARD_BY_ID.pvwiz;
  const setz = (fid, wert) => V.wizardSchrittSetzen('pvwiz', def.schritte.findIndex(s => s.feld.id === fid), wert);
  setz('validityDuration', 'befristet');
  setz('validityDurationDeadline', 'zwei Jahren');
  let text = V.pvDokumentAbschnitte().flatMap(a => a.zeilen).join('\n');
  assert.ok(text.includes('nach Ablauf von zwei Jahren ihre Gültigkeit verlieren'), 'Frist inline im Satz');
  assert.ok(!text.includes('(Zeitangabe)'), 'Platzhalter ist ersetzt');
  assert.ok(!text.includes('Die bestimmte Zeit beträgt'), 'kein nachgestellter Zusatzsatz mehr');

  // Ohne Eingabe: der amtliche Platzhalter „(Zeitangabe)" bleibt stehen (zum Ausfüllen auf Papier).
  const { V: V2 } = await frischMitDepot();
  const def2 = V2.WIZARD_BY_ID.pvwiz;
  V2.wizardSchrittSetzen('pvwiz', def2.schritte.findIndex(s => s.feld.id === 'validityDuration'), 'befristet');
  const t2 = V2.pvDokumentAbschnitte().flatMap(a => a.zeilen).join('\n');
  assert.ok(t2.includes('nach Ablauf von (Zeitangabe)'), 'ohne Eingabe bleibt der Platzhalter');
});

test('3f) Eingangsformel-Prefill aus Personendaten (Bereich 1), Platzhalter als Fallback', async () => {
  // Ohne Personendaten: der amtliche Klammer-Platzhalter bleibt stehen.
  const { V: V0 } = await frischMitDepot();
  assert.ok(V0._pvEingangsformel().includes('(Name, Vorname, geboren am, wohnhaft in)'), 'Fallback-Platzhalter ohne Daten');

  // Mit vollständigen Daten: Platzhalter ist ersetzt, Datum lesbar (TT.MM.JJJJ), Wohnort zusammengesetzt.
  const { V } = await frischMitDepot();
  const d = V.getData();
  d.sektoren.identity = { givenName: 'Maria', familyName: 'Mustermann', birthDate: '1970-01-15', streetAddress: 'Lindenweg 4', postcodeCity: '80331 München' };
  const ef = V._pvEingangsformel();
  assert.ok(!ef.includes('(Name, Vorname'), 'Platzhalter ist ersetzt');
  assert.ok(ef.includes('Maria Mustermann, geboren am 15.01.1970, wohnhaft in Lindenweg 4, 80331 München'), 'Prefill vollständig + Datum lesbar');
  assert.ok(ef.startsWith('Ich Maria Mustermann'), 'im amtlichen Satz eingesetzt');
  // Der Generator nimmt die geprefillte Eingangsformel als erste Zeile.
  const erste = V.pvDokumentAbschnitte()[0].zeilen[0];
  assert.equal(erste, ef, 'Dokument nutzt die geprefillte Eingangsformel');

  // Teil-Daten (nur Vorname): füllt das Vorhandene, kein voller Platzhalter mehr.
  const { V: V2 } = await frischMitDepot();
  V2.getData().sektoren.identity = { givenName: 'Anna' };
  const ef2 = V2._pvEingangsformel();
  assert.ok(ef2.includes('Ich Anna bestimme hiermit'), 'Teil-Prefill (nur Name)');
  assert.ok(!ef2.includes('(Name, Vorname'), 'kein voller Platzhalter bei Teildaten');
});

test('3g) Dokument aus der Vorsorge-Sektor-Sicht erreichbar, sobald PV-Angaben vorliegen', async () => {
  // Ohne PV-Angaben: kein Dokument-Knopf.
  const { V: V0, document: doc0 } = await frischMitDepot();
  V0.betreteApp();
  V0.oeffneSektor('advanceCare');
  assert.ok(!doc0.getElementById('content').innerHTML.includes('data-pv-dokument'), 'kein Knopf ohne PV-Daten');
  assert.equal(V0._pvHatDaten(), false);

  // Mit einer PV-Angabe: der „als Dokument ansehen/drucken"-Knopf erscheint in der Sektor-Sicht.
  const { V, document } = await frischMitDepot();
  const def = V.WIZARD_BY_ID.pvwiz;
  V.wizardSchrittSetzen('pvwiz', def.schritte.findIndex(s => s.feld.id === 'applicableSituations'), ['sterbeprozess']);
  assert.equal(V._pvHatDaten(), true);
  V.betreteApp();
  V.oeffneSektor('advanceCare');
  assert.ok(document.getElementById('content').innerHTML.includes('data-pv-dokument'), 'Dokument-Knopf mit PV-Daten');
});

test('4) Bereich 8 zeigt den pvwiz-Startknopf — und keinen toten vvwiz', async () => {
  const { V, document } = await frischMitDepot();
  V.betreteApp();
  V.oeffneSektor('advanceCare');
  const html = document.getElementById('content').innerHTML;
  // U2-ADR-096: vvwiz ist entfallen (spiegelte nur Felder). In Vorsorge bleibt pvwiz der
  // einzige Instrument-Wizard — er erzeugt ein Dokument und hat damit eine Berechtigung.
  assert.ok(html.includes('data-wizard-start="pvwiz"'), 'Patientenverfügung-Startknopf');
  assert.ok(!html.includes('data-wizard-start="vvwiz"'), 'kein toter vvwiz-Einstieg');
});

test('5) pvwiz lässt sich vom Bereich-Startknopf-Pfad starten (wizardLauf)', async () => {
  const { V } = await frischMitDepot();
  V.betreteApp();
  assert.equal(V.wizardLauf('pvwiz'), true);
  assert.equal(V.getWizardState().aktiverWizardId, 'pvwiz');
  assert.equal(V.getViewState().aktiveAnsicht, 'wizard');
});

test('6) Bürger-Sprache: keine Paragrafen/Codes in den Fragen', async () => {
  const { V } = await frischMitDepot();
  for (const s of V.WIZARD_BY_ID.pvwiz.schritte) {
    assert.ok(!/§|LOINC|ICD|SNOMED/i.test(s.frage), 'klare Frage: ' + s.frage);
  }
});

test('6b) refMehrfach-Schritte (Beistand/Schweigepflicht): Personen-Entität, Chip-Input im Wizard verdrahtet', async () => {
  const { V } = await frischMitDepot();
  for (const fid of ['supportFromThesePersons', 'confidentialityWaiverFor']) {
    const st = V.PV_BMJ.steps.find(s => s.feld.id === fid);
    assert.ok(st, fid + ' als Schritt');
    assert.equal(st.feld.typ, 'refMehrfach');
    assert.equal(st.feld.entitaet, 'person');
  }
  // Der Browser-Pfad (Verdrahtung + Speichern) ist headless nicht direkt fahrbar — Quell-Guard,
  // dass renderWizard das Chip-Input verdrahtet und _wizardAktuellerWert refMehrfach liest.
  const html = fs.readFileSync(path.join(__dirname, '..', 'vivodepot.html'), 'utf8');
  assert.ok(html.includes('_refMehrfachVerdrahten(c, (fid) => (fid === schritt.feld.id'), 'renderWizard verdrahtet das refMehrfach-Chip-Input');
  assert.ok(html.includes('_refmInsRegister(_refmSammeln(c, feld.id))'), '_wizardAktuellerWert liest die refMehrfach-Zeilen');
});

/* ── Geburt-Muster (gebwiz, Situations-Ziel) ─────────────────────────────── */

test('7) gebwiz ist reine Definition: Situations-Ziel auf das existierende Blatt „geburt"', async () => {
  const { V } = await frischMitDepot();
  const def = V.WIZARD_BY_ID.gebwiz;
  assert.equal(def.ziel.situation, 'geburt');
  assert.ok(V.SITUATION_BY_ID.geburt, 'das Situationsblatt geburt existiert bereits');
});

test('8) gebwiz füllt das Situationsblatt (situationen-Namespace), nicht einen Sektor', async () => {
  const { V } = await frischMitDepot();
  V.wizardSchrittSetzen('gebwiz', 0, 'Klinikum München');
  const d = V.getData();
  assert.equal(d.situationen.geburt.geburt_klinik, 'Klinikum München');
  assert.equal(d.sektoren.geburt, undefined, 'kein Sektor-Übergriff');
  assert.equal(d.urheberschaft['sit:geburt'].geburt_klinik.length, 1, 'Stempel im sit-Namespace');
});

test('9) Anlass „Geburt" startet gebwiz; Abschluss öffnet das gefüllte Blatt', async () => {
  const { V } = await frischMitDepot();
  V.waehleAnlass('geburt');
  assert.equal(V.getWizardState().aktiverWizardId, 'gebwiz', 'Anlass → geführter Einstieg');
  // bis zum Ende blättern → Abschluss öffnet die Ziel-Situation
  const def = V.WIZARD_BY_ID.gebwiz;
  for (let i = 0; i < def.schritte.length; i++) V.wizardWeiter();
  const vs = V.getViewState();
  assert.equal(vs.aktiveAnsicht, 'situation');
  assert.equal(vs.aktiveSituationId, 'geburt');
});
