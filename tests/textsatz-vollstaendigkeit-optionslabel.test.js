'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   Modul-Vollständigkeit, Optionswerte (27.08.2026) — 405 inline `optionen[].label`-
   Werte gehoben (tools/textsatz-optionslabel-heben.js), Vorbereitung eines
   englischen Bürgermoduls (U2-ADR-112-Nachtrag). 359 in Zug 1
   (SEKTOREN/SITUATIONEN/WIZARDS, inkl. PV_BMJ/KI_KORPUS über pvwiz/kiwiz-
   Objektreferenz) + 46 in Zug 2 (VOLLMACHT_BMJ, erst seither über die eigens
   gebaute `_textsatzAufVollmachtBmjAnwenden` erreichbar, da kein Wizard seinen
   Katalog referenziert, U2-ADR-096).
   ────────────────────────────────────────────────────────────────────────────
   BEFUND, DEN DIESE PROBEN HALTEN: `_textsatzKnotenFuellenOhnePflicht` überspringt
   jeden Knoten, dessen `label` bereits ein nicht-leerer String ist — ein
   Optionswert mit inline `label:` erreichte `textLesen` nie und war für ein
   angedocktes Sprachmodul nie überschreibbar (Kommentar an `_textsatzFeldFuellen`,
   vivodepot.html). Nach der Hebung tragen die betroffenen Objekte KEIN `label`
   mehr im Quelltext — der Text lebt ausschließlich in `AB_WERK_TEXTSATZ_DE` und
   wird beim Bau der Struktur aus dem Satz gefüllt.

   Rot-Beweis/Gegenprobe: jede Probe unten schlägt fehl, sobald die Hebung
   rückgängig gemacht oder ein Override NICHT mehr wirkt — mindestens eine Probe
   je betroffenem Mechanismus (Sektorfeld, Wizard-Feld, geteilter Katalog
   PV_BMJ/KI_KORPUS über den Dokument-Generator, eigens verdrahteter Katalog
   VOLLMACHT_BMJ).
   ════════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

test('[Optionslabel·1] Sektorfeld identity.maritalStatus: alle Optionen kommen aus dem Satz, kein inline label mehr im Quelltext', () => {
  const { V, src } = ladeKern();
  const feld = V.SEKTOR_BY_ID.identity.sektionen.flatMap((s) => s.felder).find((f) => f.id === 'maritalStatus');
  assert.equal(feld.optionen.find((o) => o.wert === 'verh').label, 'verheiratet', 'aus dem Satz gefüllt');
  assert.equal(feld.optionen.find((o) => o.wert === 'ledig').label, 'ledig', 'der Referenzfall bleibt korrekt');
  // Gegenprobe: kein `label: 'verheiratet'` mehr an der Deklarationsstelle des Felds.
  // Anker nachgezogen 07.09.2026 (U2-ADR-320, SEKTOREN real ins Bündel): die einzige pretty-
  // printed Fundstelle `id: 'maritalStatus'` lag seit dem WIZARDS-Umzug (U2-ADR-346) nur noch in
  // heirwiz' nativer Deklaration — die ist jetzt ebenfalls weg, kompakte JSON-Form im Bündel.
  const stelle = src.indexOf('"id":"maritalStatus"');
  assert.ok(stelle > 0, 'Feld-Deklaration nicht gefunden');
  const block = src.slice(stelle, stelle + 400);
  assert.doesNotMatch(block, /"label":"verheiratet"/, 'inline label wäre stehen geblieben — Hebung hätte nicht gegriffen');
});

test('[Optionslabel·2·Rot] ein Sprachmodul überschreibt eine gehobene Sektorfeld-Option — und der Rückweg gibt sie frei', async () => {
  const { V } = ladeKern();
  const opt = () => V.SEKTOR_BY_ID.identity.sektionen.flatMap((s) => s.felder)
    .find((f) => f.id === 'maritalStatus').optionen.find((o) => o.wert === 'verh');
  assert.equal(opt().label, 'verheiratet');

  await V.depotAnlegen('optionslabel-zug2-pw');
  V.getData().textsprache = 'en';
  V.getData().textsatzModule = [{ sprache: 'en', moduleVersion: 1,
    texte: { 'identity.maritalStatus/verh.label': 'married' } }];
  assert.equal(V._textsatzModuleAusDepotAnmelden(V.getData()), 1);
  V.textsatzNeuAnwenden();
  assert.equal(opt().label, 'married');

  V.getData().textsprache = 'de';
  V.textsatzNeuAnwenden();
  assert.equal(opt().label, 'verheiratet', 'der Rückweg gibt den eingebauten Text frei');
});

test('[Optionslabel·3] Wizard-Feld (heirwiz.familienstand) teilt dasselbe Objekt wie das Sektorfeld — EIN Text, kein zweiter Raum', () => {
  const { V } = ladeKern();
  const heirwiz = V.WIZARDS.find((w) => w.id === 'heirwiz');
  const schritt = heirwiz.schritte.find((s) => s.feld && s.feld.id === 'maritalStatus');
  const sektorOpt = V.SEKTOR_BY_ID.identity.sektionen.flatMap((s) => s.felder)
    .find((f) => f.id === 'maritalStatus').optionen.find((o) => o.wert === 'verh');
  const wizardOpt = schritt.feld.optionen.find((o) => o.wert === 'verh');
  assert.equal(wizardOpt, sektorOpt, '_katalogOptionen gibt dieselbe Objekt-Referenz zurück ("Eine Quelle statt Kopien")');
});

test('[Optionslabel·3b·ROT] der Wizard-Schritt filtert bei JEDEM Lesen frisch, nicht einmalig beim Laden — U2-ADR-311', () => {
  /* Gemessen (05.09.2026): _katalogOptionen gibt mit erlaubteWerte ein NEUES gefiltertes
     Array zurück, nicht dieselbe Referenz wie das Sektorfeld (6 von 8 Aufrufen teilen sie, dieser
     nicht). Vor dem Getter-Umbau band `optionen: _katalogOptionen(...)` dieses Array EINMALIG bei
     der Skript-Auswertung. Eine echte NEUE `erlaubteWerte`-Option ließe sich für dieses konkrete
     Feld nicht vorführen (die Auswahl `['verh','elp']` ist hier hart im Wizard verdrahtet, nicht
     datengetrieben) — die scharfe Probe ist darum die Kehrseite: ein bestehender, gefilterter Wert
     wird am nativen Feld ENTFERNT (wie ein Modul, das buergermodulSektorErsetzen ohne diesen Wert
     aufruft), und der Wizard-Schritt muss die Entfernung sehen. Ein einmalig gebundenes Array
     hielte die verwaiste Referenz weiter für gültig. */
  const { V } = ladeKern();
  const sektorFeld = V.SEKTOR_BY_ID.identity.sektionen.flatMap((s) => s.felder)
    .find((f) => f.id === 'maritalStatus');
  const heirwiz = V.WIZARDS.find((w) => w.id === 'heirwiz');
  const schritt = heirwiz.schritte.find((s) => s.feld && s.feld.id === 'maritalStatus');
  assert.ok(schritt.feld.optionen.some((o) => o.wert === 'verh'), 'Vorbedingung: "verh" ist heute sichtbar');

  const idx = sektorFeld.optionen.findIndex((o) => o.wert === 'verh');
  sektorFeld.optionen.splice(idx, 1);

  assert.ok(!schritt.feld.optionen.some((o) => o.wert === 'verh'),
    'der Wizard-Schritt zeigt "verh" weiterhin — `optionen` filtert noch einmalig beim Laden, '
    + 'nicht bei jedem Lesen frisch aus dem aktuellen Sektorfeld-Bestand');
});

test('[Optionslabel·4] PV_BMJ-Optionen sind über pvwiz textsatz-gefüllt — dieselbe Objekt-Referenz, kein inline label mehr', () => {
  const { V, src } = ladeKern();
  const pvwiz = V.WIZARDS.find((w) => w.id === 'pvwiz');
  const schritt = pvwiz.schritte.find((s) => s.feld && s.feld.id === 'lifeSustainingMeasures');
  assert.ok(schritt, 'pvwiz-Schritt für lifeSustainingMeasures nicht gefunden');
  assert.equal(schritt.feld.optionen.find((o) => o.wert === 'ausschoepfen').label,
    'dass alles medizinisch Mögliche und Sinnvolle getan wird, um mich am Leben zu erhalten.');
  // U2-ADR-344: PV_BMJ.steps steht seither nicht mehr nativ im Quelltext — der amtliche
  // Wortlaut kommt aus BUERGERMODUL_BUENDEL.dokumente, `id: 'lifeSustainingMeasures'` erscheint
  // darum gar nicht mehr in `src` (nicht einmal ohne Label). Die stärkere Zusicherung ("kein
  // inline label im Quelltext") gilt darum erst recht — es gibt dort gar keine Deklaration
  // mehr, in der eines stehen könnte.
  const stelle = src.indexOf("id: 'lifeSustainingMeasures'");
  assert.equal(stelle, -1, 'PV_BMJ.steps sollte seit U2-ADR-344 nicht mehr nativ im Quelltext stehen');
});

test('[Optionslabel·5·Rot] ein Sprachmodul überschreibt eine PV_BMJ-Option — UND das erzeugte Dokument trägt den neuen Text (_pvOptLabel liest dieselbe Objekt-Referenz)', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen('optionslabel-zug2-pv'); V.akteurSelbstErklaeren('Tester');
  V.getData().textsprache = 'en';
  V.getData().textsatzModule = [{ sprache: 'en', moduleVersion: 1,
    texte: { 'wizard:pvwiz.lifeSustainingMeasures/ausschoepfen.label': 'that everything medically possible is done to keep me alive.' } }];
  assert.equal(V._textsatzModuleAusDepotAnmelden(V.getData()), 1);
  V.textsatzNeuAnwenden();

  const eintrag = V.listenEintragHinzufuegen('advanceCare', 'provisionInstruments', { instrument: 'living-will' });
  V.getData().sektoren.advanceCare.lifeSustainingMeasures = 'ausschoepfen';
  const html = V.dokumentHTML('patientenverfuegung', eintrag.id);
  assert.match(html, /that everything medically possible is done to keep me alive\./, 'Dokument trägt nicht den übersetzten Text');
  assert.doesNotMatch(html, /dass alles medizinisch Mögliche/, 'Dokument trägt noch den deutschen Text');

  V.getData().textsprache = 'de';
  V.textsatzNeuAnwenden();
});

test('[Optionslabel·6] KI_KORPUS-Optionen sind über kiwiz textsatz-gefüllt, kein inline label mehr im Quelltext', () => {
  const { V, src } = ladeKern();
  const kiwiz = V.WIZARDS.find((w) => w.id === 'kiwiz');
  const schritt = kiwiz.schritte.find((s) => s.feld && s.feld.id === 'basicDecision');
  assert.ok(schritt, 'kiwiz-Schritt für basicDecision nicht gefunden');
  const beliebigeOption = schritt.feld.optionen[0];
  assert.ok(beliebigeOption.label && beliebigeOption.label.trim() !== '', 'Option ohne Text — Satz hätte nicht gegriffen');
  // U2-ADR-344: KI_KORPUS.steps kommt seither aus BUERGERMODUL_BUENDEL.dokumente, nicht mehr
  // nativ aus dem Quelltext — dieselbe Begründung wie bei PV_BMJ (Optionslabel·4).
  const stelle = src.indexOf("id: 'basicDecision'");
  assert.equal(stelle, -1, 'KI_KORPUS.steps sollte seit U2-ADR-344 nicht mehr nativ im Quelltext stehen');
});

test('[Optionslabel·7] VOLLMACHT_BMJ: eigens verdrahteter Katalog (kein Wizard), kein inline label mehr im Quelltext', () => {
  const { V, src } = ladeKern();
  const st = V.VOLLMACHT_BMJ.steps.find((s) => s.feld.id === 'healthCareGeneralDecision');
  assert.ok(st, 'VOLLMACHT_BMJ-Schritt für healthCareGeneralDecision nicht gefunden');
  assert.equal(st.feld.optionen.find((o) => o.wert === 'ja').label, 'ja');
  assert.equal(st.feld.optionen.find((o) => o.wert === 'nein').label, '(nicht erteilt)');
  // U2-ADR-344: VOLLMACHT_BMJ.steps kommt seither aus BUERGERMODUL_BUENDEL.dokumente, nicht
  // mehr nativ aus dem Quelltext — dieselbe Begründung wie bei PV_BMJ (Optionslabel·4).
  const stelle = src.indexOf("id: 'healthCareGeneralDecision'");
  assert.equal(stelle, -1, 'VOLLMACHT_BMJ.steps sollte seit U2-ADR-344 nicht mehr nativ im Quelltext stehen');
});

test('[Optionslabel·8·Rot] ein Sprachmodul überschreibt eine VOLLMACHT_BMJ-Option unter ihrer EIGENEN Kennung — und der Rückweg gibt sie frei', async () => {
  const { V } = ladeKern();
  const opt = () => V.VOLLMACHT_BMJ.steps.find((s) => s.feld.id === 'healthCareGeneralDecision')
    .feld.optionen.find((o) => o.wert === 'nein');
  assert.equal(opt().label, '(nicht erteilt)');

  await V.depotAnlegen('optionslabel-vollmacht-zug2-pw');
  V.getData().textsprache = 'en';
  V.getData().textsatzModule = [{ sprache: 'en', moduleVersion: 1,
    texte: { 'vollmacht:healthCareGeneralDecision/nein.label': '(not granted)' } }];
  assert.equal(V._textsatzModuleAusDepotAnmelden(V.getData()), 1);
  V.textsatzNeuAnwenden();
  assert.equal(opt().label, '(not granted)');

  V.getData().textsprache = 'de';
  V.textsatzNeuAnwenden();
  assert.equal(opt().label, '(nicht erteilt)', 'der Rückweg gibt den eingebauten Text frei');
});

test('[Optionslabel·9] VOLLMACHT_BMJ und das Sektorfeld advanceCare.provisionInstruments/healthCareGeneralDecision tragen EIGENE, unabhängige Kennungen — kein geteiltes Objekt, kein geteilter Text', () => {
  const { V } = ladeKern();
  const bmjOpt = V.VOLLMACHT_BMJ.steps.find((s) => s.feld.id === 'healthCareGeneralDecision')
    .feld.optionen.find((o) => o.wert === 'nein');
  const feld = V.SEKTOR_BY_ID.advanceCare.sektionen.flatMap((s) => s.felder)
    .find((f) => f.id === 'provisionInstruments');
  const sektorOpt = feld.unterFelder.find((u) => u.id === 'healthCareGeneralDecision')
    .optionen.find((o) => o.wert === 'nein');
  assert.notEqual(bmjOpt, sektorOpt, 'zwei unabhängige Objekte, keine geteilte Referenz wie bei heirwiz/PV_BMJ');
  assert.equal(sektorOpt.label, 'nein', 'generisches UI-Label');
  assert.equal(bmjOpt.label, '(nicht erteilt)', 'amtliche Dokument-Klausel — bewusst ein anderer Text');
});
