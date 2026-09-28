'use strict';
/* ═════════════════════════════════════════════════════════════════
   Die Festlegungen der Patientenverfügung sind Kennungen (27.09.2026, U2-ADR-440).
   Anlass: die Klinik fragt nachts an, wer einwilligen darf und was in der Patientenverfügung steht. Ohne Genehmigung des
   Betreuungsgerichts geht es nur, wenn Bevollmächtigte und Arzt über den Willen der Patientin einig sind (§ 1829 Abs. 4 mit
   § 1827 BGB) — dafür braucht die Klinik die Festlegungen, nicht nur „es gibt eine Patientenverfügung".
   Die Werte stehen längst in data.sektoren.advanceCare (der Assistent schreibt dorthin); gefehlt hat nur die Deklaration.
   Geprüft: EINE Quelle (die Sektion ist aus PV_BMJ.steps abgeleitet, nicht gepflegt), sensibel mit Freigabe einzeln, im Formular
   nur mit Wert, ein Bestandsdepot ohne Migration anfragbar, Englisch über denselben Weg.
   ═════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

const sektion = (V) => V.SEKTOR_BY_ID.advanceCare.sektionen.find((s) => s.id === 'living-will-decisions');
const anfrage = (felder) => ({ modulTyp: 'anfrage', anfrageVersion: 1, von: 'Klinik', zweck: 'Einwilligung in eine Operation',
  grundlage: '§ 1829 Abs. 4 mit § 1827 BGB', vorgang: 'K-1', gestelltAm: '2026-09-27', gueltigBis: '2027-12-31',
  antwort: { art: 'einmalpasswort' }, felder: felder.map((k) => ({ kennung: 'advanceCare.' + k, zweck: 'Wille der Patientin', pflicht: true })) });

test('[PV·eine Quelle] die Sektion trägt genau die Schritte des Assistenten — Id, Typ, Optionswerte, Sichtbarkeit —, jedes Feld sensibel', () => {
  const { V } = ladeKern();
  const s = sektion(V);
  assert.ok(s, 'die Sektion living-will-decisions fehlt');
  assert.equal(s.label, 'Festlegungen der Patientenverfügung');
  assert.deepEqual(s.felder.map((f) => f.id), V.PV_BMJ.steps.map((st) => st.feld.id), 'dieselben Felder in derselben Reihenfolge');
  assert.equal(s.felder.length, 29);
  for (const [i, f] of s.felder.entries()) {
    const q = V.PV_BMJ.steps[i].feld;
    assert.equal(f.typ, q.typ, f.id);
    assert.deepEqual((f.optionen || []).map((o) => o.wert), (q.optionen || []).map((o) => o.wert), f.id + ': Optionswerte');
    assert.deepEqual((f.optionen || []).map((o) => o.label), (q.optionen || []).map((o) => o.label), f.id + ': amtlicher Wortlaut');
    assert.equal(f.label, q.label, f.id + ': Beschriftung');
    assert.deepEqual(f.sichtbarWenn, q.sichtbarWenn, f.id + ': Sichtbarkeit');
    assert.equal(f.sensibel, true, f.id + ': Freigabe einzeln');
    const def = V.kennungFeldDef('advanceCare.' + f.id);
    assert.ok(def && def.sensibel === true, 'Kennung des Kerns: advanceCare.' + f.id);
  }
});

test('[PV·eine Quelle·Rot-Beweis] die Sektion hat keine eigene Fassung: jedes Feld trägt das Merkmal der Ableitung, eine Id außerhalb der Schritte ist keine Kennung', () => {
  const { V } = ladeKern();
  for (const f of sektion(V).felder) {
    const d = Object.getOwnPropertyDescriptor(f, 'pvBmjAbgeleitet');
    assert.ok(d && d.value === true && !d.enumerable, f.id + ': abgeleitet, nicht aufzählbar (geht in keine Datei)');
    assert.ok(!JSON.stringify(f).includes('pvBmjAbgeleitet'), f.id + ': das Merkmal bleibt aus jeder Serialisierung');
  }
  assert.ok(!V.kennungFeldDef('advanceCare.gibtEsNicht'), 'Gegenprobe: eine Id außerhalb der Schritte ist keine Kennung');
});

test('[PV·Textsatz] der Wortlaut der Felder ist in beiden Sprachmodulen der des Assistenten — abgeleitet, nicht gepflegt', () => {
  const fs = require('node:fs');
  const path = require('node:path');
  const { pvFestlegungenAbweichungen, pvFestlegungenTexte, pvFestlegungenIds } = require('../tools/lib/pv-festlegungen-textsatz.js');
  const { V } = ladeKern();
  const ids = pvFestlegungenIds(V);
  assert.equal(ids.length, 29);
  for (const datei of ['textsatz-de-modul.json', 'textsatz-en-modul.json']) {
    const texte = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'tools', datei), 'utf8')).texte;
    assert.deepEqual(pvFestlegungenAbweichungen(texte, ids), [], datei + ': Feld-Wortlaut weicht vom Assistenten ab — Erzeuger laufen lassen');
    // Rot-Beweis: ein abweichender Wert fällt, eine fehlende Kennung ebenso.
    const verfaelscht = Object.assign({}, texte, { 'advanceCare.lifeSustainingMeasures.label': 'von Hand' });
    delete verfaelscht['advanceCare.artificialVentilation.label'];
    assert.deepEqual(pvFestlegungenAbweichungen(verfaelscht, ids).sort(),
      ['advanceCare.artificialVentilation.label', 'advanceCare.lifeSustainingMeasures.label'], datei + ': Rot-Beweis');
  }
  assert.throws(() => pvFestlegungenTexte({}, ['lifeSustainingMeasures']), /nicht raten/, 'fehlt der Wortlaut des Assistenten, wird nicht erfunden');
});

test('[PV·Formular] nur mit Wert sichtbar und nur angezeigt: leer verborgen, vom Assistenten geschrieben sichtbar, keine Eingabe', () => {
  const { V } = ladeKern();
  const f = sektion(V).felder.find((x) => x.id === 'lifeSustainingMeasures');
  assert.equal(V.feldSichtbar(f, {}), false, 'leer: keine 29 leeren Felder im Formular');
  assert.equal(V.feldSichtbar(f, { lifeSustainingMeasures: 'unterlassen' }), true, 'mit Wert: sichtbar');
  // nurAnzeige: auch mit Schreibrecht keine Eingabe — geändert wird im Assistenten. Gegenprobe ohne das Merkmal: eine Eingabe.
  assert.doesNotMatch(V.feldZeileHTML(f, 'unterlassen', 'advanceCare', true, true), /<input|<select|<textarea/, 'nur angezeigt');
  f.nurAnzeige = false;
  try { assert.match(V.feldZeileHTML(f, 'unterlassen', 'advanceCare', true, true), /<select/, 'Gegenprobe: ohne nurAnzeige eine Eingabe'); }
  finally { f.nurAnzeige = true; }
});

test('[PV·Bestand·Anfrage] ein Depot, in das der Assistent geschrieben hat, ist ohne Migration anfragbar — zurück bleibt, was nicht einzeln freigegeben ist', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen('pv-festlegungen-2026-09-27!');
  V.akteurSelbstErklaeren('Gerda Mustermann');
  const d = V.getData();
  const vorher = d.schemaVersion;
  d.sektoren.advanceCare = Object.assign({}, d.sektoren.advanceCare, { lifeSustainingMeasures: 'unterlassen', resuscitationInAllCases: 'nein' });
  V.setData(d);
  const a = anfrage(['lifeSustainingMeasures', 'resuscitationInAllCases']);
  let ds = V.anfrageAntwortDatensatz(a);
  assert.deepEqual(ds.felder.map((f) => f.kennung), [], 'ohne Freigabe geht keine Festlegung hinaus');
  assert.ok(ds.zurueckgehalten && ds.zurueckgehalten.pflicht === 2, 'zurückgehalten und gezählt, nicht benannt');
  V.sensibelFeldSetzen('advanceCare', 'lifeSustainingMeasures', false);
  ds = V.anfrageAntwortDatensatz(a);
  const f = ds.felder.find((x) => x.kennung === 'advanceCare.lifeSustainingMeasures');
  assert.ok(f, 'einzeln freigegeben geht sie mit');
  assert.match(String(f.wert), /^dass alle lebenserhaltenden Maßnahmen unterlassen werden/, 'mit dem amtlichen Wortlaut der gewählten Option');
  assert.ok(!ds.felder.some((x) => x.kennung === 'advanceCare.resuscitationInAllCases'), 'die andere bleibt zurück — Freigabe einzeln');
  assert.equal(V.getData().schemaVersion, vorher, 'keine Schemastufe: nichts verschoben');
});

test('[PV·Englisch] dieselbe Sektion im englischen Produkt, Beschriftung aus dem englischen Satz', () => {
  const { V } = ladeKern({ produkt: 'privat-en' });
  const s = sektion(V);
  assert.equal(s.label, 'Decisions in the advance directive');
  const f = s.felder.find((x) => x.id === 'lifeSustainingMeasures');
  assert.equal(f.label, V.PV_BMJ.steps.find((st) => st.feld.id === 'lifeSustainingMeasures').feld.label);
  assert.doesNotMatch(f.label, /[äöüß]|Maßnahmen/, 'englisch, kein deutscher Rückfall');
});

test('[PV·nach außen] was Dritte statisch lesen, trägt alle Festlegungen: Feldkatalog und Lese-App — das Bürgermodul-Bündel ist Prüfstoff, nicht Auslieferung', () => {
  /* Die Sektion entsteht im Kern beim Start. Ausgeliefert wird sie nie als Bündel-Definition (die dreizehn Bereichs-Templates laufen nur
     in einem Kern, der sie selbst ableitet; tools/buergermodul/vd-privat.json ist seit dem Schnitt vom 18.09.2026 nur Prüfstoff für
     U2-ADR-299). Wer OHNE Kern liest, bekommt die aus dem Kern erzeugten Formen — und die müssen die Festlegungen tragen. */
  const fs = require('node:fs');
  const path = require('node:path');
  const { V } = ladeKern();
  const kennungen = V.PV_BMJ.steps.map((st) => 'advanceCare.' + st.feld.id);
  const wurzel = path.join(__dirname, '..');
  const katalog = new Set(require('../bereiche/feldkatalog.json').felder.map((f) => f.kennung));
  assert.deepEqual(kennungen.filter((k) => !katalog.has(k)), [], 'bereiche/feldkatalog.json');
  for (const datei of ['vivodepot-lesen.html']) {
    const text = fs.readFileSync(path.join(wurzel, datei), 'utf8');
    assert.deepEqual(kennungen.filter((k) => !text.includes('"' + k + '"') && !text.includes('"' + k + '.label"')), [], datei);
  }
});

test('[PV·Aufzählung] eine Mehrfachauswahl, deren amtliche Optionen auf ein Komma enden, zeigt kein doppeltes Komma', () => {
  /* Gefunden 28.09.2026 in der Abnahme gegen das Nativ: das PDF zeigte „… befinde,, ich mich im Endstadium …". Die amtlichen
     Situationen enden selbst auf ein Komma (sie sind Glieder eines Satzes), die Aufzählung setzte ein zweites. */
  const { V } = ladeKern();
  const f = sektion(V).felder.find((x) => x.id === 'applicableSituations');
  assert.ok(f.optionen.some((o) => /,\s*$/.test(o.label)), 'Vorbedingung: mindestens eine amtliche Option endet auf ein Komma');
  const text = V.feldWertText(f, ['sterbeprozess', 'endstadium']);
  assert.doesNotMatch(text, /,\s*,/, 'kein doppeltes Komma: ' + text.slice(0, 120));
  assert.match(text, /befinde, ich mich/, 'genau ein Komma zwischen den Gliedern');
  // Gegenprobe: die Optionstexte selbst bleiben unverändert (amtlicher Wortlaut).
  assert.ok(f.optionen.find((o) => o.wert === 'sterbeprozess').label.trim().endsWith(','), 'der Wortlaut der Option ist nicht gekürzt');
});

test('[PV·Ersetzen] wird der Vorsorge-Bereich nach dem Start durch seine Moduldatei ersetzt, stehen die Festlegungen wieder da', () => {
  /* Gefunden 28.09.2026 in der E2E-Abnahme „alle dreizehn Bereiche als Modul geladen":
     buergermodulSektorErsetzen verteilt die Felder jeder Sektion neu; die Moduldatei trägt die abgeleitete Sektion nie, sie blieb leer. */
  const path = require('node:path');
  const { V } = ladeKern();
  const roh = require(path.join(__dirname, '..', 'tools', 'bereich-templates', 'vivodepot-advanceCare.json')).bereiche.advanceCare;
  const r = V.buergermodulSektorErsetzen('advanceCare', V._buendelBereichZuFeldDefs('advanceCare', roh), false);
  assert.equal(r.angewandt, true, r.grund || '');
  const s = sektion(V);
  assert.ok(s, 'die Sektion steht nach dem Ersetzen');
  assert.equal(s.felder.length, 29, 'alle Festlegungen, nicht eine leere Hülle');
  assert.equal(s.label, 'Festlegungen der Patientenverfügung');
  assert.ok(s.felder.every((f) => f.pvBmjAbgeleitet === true && typeof f.label === 'string' && f.label.trim()), 'abgeleitet und beschriftet');
  assert.ok(V.kennungFeldDef('advanceCare.lifeSustainingMeasures'), 'weiter eine Kennung des Kerns');
});
