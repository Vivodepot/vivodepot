'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   Proben zum Ladeweg auf der Erste-Partei-Zone (U2-ADR-282) — U2-ADR-306.
   Wörtlicher Spiegel von tests/buergermodul-sektor-ersetzen.test.js (U2-ADR-292)
   und tests/buergermodul-situation-ersetzen.test.js (U2-ADR-308), für die
   Assistenten-Achse (WIZARDS) statt der Sektor-/Situations-Achse.

   DER MASSSTAB IST DERSELBE: „Als wäre nichts gewesen." Die entscheidende Probe
   vergleicht ECHTES GERENDERTES HTML (`renderWizard`), nicht Datenstrukturen.

   DREI ECHTE STRUKTURELLE ABWEICHUNGEN VOM SITUATIONS-VORBILD, s. Kern-Kommentar
   über `buergermodulWizardErsetzen`:
   1) `w.schritte` ist bei KEINEM der sieben nativen Wizards eine Getter-
      Eigenschaft (anders als `bloecke` bei Situationen) — eine normale
      Zuweisung reicht, kein delete+neu-setzen nötig.
   2) Kein Cross-Verweis-Zug wie bei Situationen ({quelle,feld:string}) — jeder
      Wizard-Schritt trägt immer ein eigenes Feld-Objekt.
   3) Der Sammler (`wizardsSchritteSammeln`) trägt seit einer Korrektur den
      GANZEN Schritt (Rest-Spread: feld, frage, hilfetext, ziel, verborgenWenn,
      verborgenWennKeinVerweis), nicht nur feld+frage — geprüft in
      tests/buergermodul-situationen-wizards-u2-adr-301.test.js.

   OFFEN, BENANNT (nicht Teil dieser Proben): `buergermodulBuendelAnwenden`
   (Zeile ~25000) trägt bewusst NICHT für `wizards` — der Kern-Kommentar dort
   (⚠, U2-ADR-304) nennt den Grund (WIZARDS bindet Katalog-Arrays bei der
   Skript-AUSWERTUNG). Ob `_optionenArrayAngleichen`s Identitätswahrung diesen
   Grund für eine künftige Verdrahtung entkräftet, ist eine EIGENE Entscheidung
   (angefragt) — nicht Teil dieses Auftrags, der nur den Ersetzer selbst
   und seine Erste-Partei-Zone liefert, wie Sektor/Situation es vor ihrer
   jeweiligen Verdrahtung auch taten.
   ════════════════════════════════════════════════════════════════════════════ */
const test = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

async function frischMitDepot(pw) {
  const k = ladeKern();
  await k.V.depotAnlegen(pw);
  k.V.akteurSelbstErklaeren('Tester');
  return k;
}

function htmlAn(k) {
  return String(k.document.getElementById('content').innerHTML || '');
}

// Baut moduleDefs aus dem NATIVEN Bestand selbst — dieselbe Form wie
// `wizardsSchritteSammeln` liefert. `label` NIE mitnehmen (Textsatz-Eigentum,
// wie beim Sektor-/Situations-Vorbild) — `frage`/`hilfetext`/`ziel`/
// `verborgenWenn`/`verborgenWennKeinVerweis` bleiben stehen, sie sind bei
// Wizards STRUKTUR, nicht Sprache (s. Kern-Kommentar über wizardsSchritteSammeln).
function bauModuleDefsAusNativ(V, wizardId) {
  const wizard = V.WIZARD_BY_ID[wizardId];
  return wizard.schritte.map((schritt, index) => {
    const { feld, ...rest } = schritt;
    const feldKopie = Object.assign({}, feld);
    delete feldKopie.label;
    return Object.assign({ wizardId, schrittIndex: index, feldId: feld.id, feld: feldKopie }, rest);
  });
}

// Rendert JEDEN sichtbaren Schritt eines Wizard-Laufs der Reihe nach, sammelt das HTML —
// wörtlicher Spiegel des Navigations-Musters aus tests/wizard-fertig-am-letzten-sichtbaren.test.js.
function wizardLaufHtmlSequenz(V, k, wizardId) {
  V.wizardLauf(wizardId);
  const def = V.WIZARD_BY_ID[wizardId];
  const sichtbar = V.wizardSichtbareIndizes(def);
  const seq = [];
  V.renderWizard();
  seq.push(htmlAn(k));
  for (let i = 1; i < sichtbar.length; i++) {
    V.wizardWeiter();
    V.renderWizard();
    seq.push(htmlAn(k));
  }
  return seq;
}

test('[U2-ADR-306] buergermodulWizardErsetzen ist exportiert', async () => {
  const kern = await ladeKern();
  assert.equal(typeof kern.V.buergermodulWizardErsetzen, 'function');
  assert.equal(typeof kern.V._erstePartieErlaubteIdsFuerWizard, 'function');
  assert.equal(typeof kern.V.erstePartieWizardSchritteDefsPruefen, 'function');
});

test('[U2-ADR-306] "als waere nichts gewesen" — gebwiz: jeder sichtbare Schritt ist byte-identisch, nachdem der native Bestand durch denselben Bestand via Ladeweg ersetzt wurde', async () => {
  const kVorher = await frischMitDepot('pw-vorher');
  const seqVorher = wizardLaufHtmlSequenz(kVorher.V, kVorher, 'gebwiz');
  assert.ok(seqVorher.length > 0, 'Vorbedingung: gebwiz rendert wirklich einen Schritt');
  assert.ok(seqVorher.length > 1, 'Vorbedingung: gebwiz hat mehr als einen sichtbaren Schritt');

  const kNachher = await frischMitDepot('pw-nachher');
  const ergebnis = kNachher.V.buergermodulWizardErsetzen('gebwiz', bauModuleDefsAusNativ(kNachher.V, 'gebwiz'));
  assert.equal(ergebnis.angewandt, true);
  assert.equal(ergebnis.verworfen.length, 0, 'der native Bestand gegen sich selbst darf nichts verwerfen');
  const seqNachher = wizardLaufHtmlSequenz(kNachher.V, kNachher, 'gebwiz');

  assert.equal(seqNachher.length, seqVorher.length, 'gleiche Anzahl sichtbarer Schritte');
  for (let i = 0; i < seqVorher.length; i++) {
    assert.equal(seqNachher[i], seqVorher[i], 'Schritt ' + i + ' muss byte-identisch sein');
  }
});

test('[U2-ADR-306·E2] alle sieben nativen Wizards: byte-identischer erster Schritt, null Verwerfungen', async () => {
  const kSonde = await ladeKern();
  const alleWizardIds = kSonde.V.WIZARD_IDS_EINGEBAUT;
  assert.equal(alleWizardIds.length, 7, 'Vorbedingung: sieben native Wizards');

  const abweichungen = [];
  for (const wizardId of alleWizardIds) {
    const kVorher = await frischMitDepot('e2-vorher-' + wizardId);
    kVorher.V.wizardLauf(wizardId);
    kVorher.V.renderWizard();
    const htmlVorher = htmlAn(kVorher);

    const kNachher = await frischMitDepot('e2-nachher-' + wizardId);
    const ergebnis = kNachher.V.buergermodulWizardErsetzen(wizardId, bauModuleDefsAusNativ(kNachher.V, wizardId));
    kNachher.V.wizardLauf(wizardId);
    kNachher.V.renderWizard();
    const htmlNachher = htmlAn(kNachher);

    if (ergebnis.verworfen.length > 0) {
      abweichungen.push(wizardId + ': ' + ergebnis.verworfen.length + ' Verwerfung(en) — ' + JSON.stringify(ergebnis.verworfen));
    }
    if (htmlVorher !== htmlNachher) {
      let i = 0;
      while (i < htmlVorher.length && i < htmlNachher.length && htmlVorher[i] === htmlNachher[i]) i++;
      abweichungen.push(wizardId + ': Rendering weicht ab bei Zeichen ' + i);
    }
  }
  assert.deepEqual(abweichungen, [], 'jeder native Wizard muss byte-identisch und ohne Verwerfung durch den Ladeweg passen');
});

test('[U2-ADR-306·E2·ROT-BEWEIS] die Sonde selbst findet einen echten Unterschied — sonst prueft die Sammelprobe nichts', async () => {
  const kern = await frischMitDepot('e2-rot-gekuerzt');
  const alle = bauModuleDefsAusNativ(kern.V, 'gebwiz');
  assert.ok(alle.length > 0, 'Vorbedingung: gebwiz hat wirklich Schritte, sonst ist ein Weglassen bedeutungslos');
  const gekuerzt = alle.filter((d) => d.feldId !== 'geburt_klinik');
  assert.equal(gekuerzt.length, alle.length - 1, 'Vorbedingung: genau ein Schritt weniger');
  const ergebnis = kern.V.buergermodulWizardErsetzen('gebwiz', gekuerzt);
  assert.equal(ergebnis.verworfen.length, 0, 'Vorbedingung: kein Verwerfen, nur ein weggelassener Schritt');
  kern.V.wizardLauf('gebwiz');
  kern.V.renderWizard();
  const htmlGekuerzt = htmlAn(kern);

  const kVoll = await frischMitDepot('e2-rot-voll');
  kVoll.V.wizardLauf('gebwiz');
  kVoll.V.renderWizard();
  const htmlVoll = htmlAn(kVoll);
  assert.notEqual(htmlGekuerzt, htmlVoll, 'ein wirklich fehlender erster Schritt muss die Sammelprobe faerben — tut er das nicht, ist sie blind');
});

test('[U2-ADR-306·Identität·ROT] sensibel:true verschwindet, wenn das Modul es nicht mehr trägt — Überschreiben allein reicht nicht', async () => {
  const kern = await ladeKern();
  assert.ok(kern.V.WIZARD_BY_ID.gebwiz.schritte.length > 0, 'Vorbedingung: gebwiz hat wirklich Schritte');
  assert.equal(kern.V.WIZARD_BY_ID.gebwiz.schritte.find((s) => s.feld.id === 'geburt_urkunde').feld.sensibel, true,
    'Vorbedingung: das native Feld traegt sensibel:true, bevor ersetzt wird');
  const defs = bauModuleDefsAusNativ(kern.V, 'gebwiz').map((d) => {
    if (d.feldId !== 'geburt_urkunde') return d;
    const feld = Object.assign({}, d.feld);
    delete feld.sensibel;
    return Object.assign({}, d, { feld });
  });
  const ergebnis = kern.V.buergermodulWizardErsetzen('gebwiz', defs);
  assert.equal(ergebnis.verworfen.length, 0);
  const nachher = kern.V.WIZARD_BY_ID.gebwiz.schritte.find((s) => s.feld.id === 'geburt_urkunde').feld;
  assert.equal(nachher.sensibel, undefined,
    'sensibel:true darf nicht stehen bleiben, nur weil das alte Feld-Objekt es einmal trug — die Eigenschaft muss verschwinden');
});

test('[U2-ADR-306·Identität·ROT] codeListe verschwindet, wenn das Modul es nicht mehr trägt (anamwiz.krankheiten, echtes Beispiel)', async () => {
  const kern = await ladeKern();
  assert.ok(kern.V.WIZARD_BY_ID.anamwiz.schritte.length > 0, 'Vorbedingung: anamwiz hat wirklich Schritte');
  assert.equal(kern.V.WIZARD_BY_ID.anamwiz.schritte.find((s) => s.feld.id === 'chronicConditionsDiagnoses').feld.codeListe, 'icd10',
    'Vorbedingung: das native Feld traegt codeListe:icd10, bevor ersetzt wird');
  const defs = bauModuleDefsAusNativ(kern.V, 'anamwiz').map((d) => {
    if (d.feldId !== 'chronicConditionsDiagnoses') return d;
    const feld = Object.assign({}, d.feld);
    delete feld.codeListe;
    return Object.assign({}, d, { feld });
  });
  const ergebnis = kern.V.buergermodulWizardErsetzen('anamwiz', defs);
  assert.equal(ergebnis.verworfen.length, 0);
  const nachher = kern.V.WIZARD_BY_ID.anamwiz.schritte.find((s) => s.feld.id === 'chronicConditionsDiagnoses').feld;
  assert.equal(nachher.codeListe, undefined,
    'codeListe darf nicht stehen bleiben, nur weil das alte Feld-Objekt sie einmal trug — die Eigenschaft muss verschwinden');
});

test('[U2-ADR-306·Identität] das Feld-Objekt selbst bleibt dieselbe Referenz — kein Neubau', async () => {
  const kern = await ladeKern();
  const vorher = kern.V.WIZARD_BY_ID.gebwiz.schritte.find((s) => s.feld.id === 'geburt_hebamme').feld;
  kern.V.buergermodulWizardErsetzen('gebwiz', bauModuleDefsAusNativ(kern.V, 'gebwiz'));
  const nachher = kern.V.WIZARD_BY_ID.gebwiz.schritte.find((s) => s.feld.id === 'geburt_hebamme').feld;
  assert.equal(nachher, vorher, 'ein Aufrufer, der VOR dem Ersetzen eine Feld-Referenz genommen hat, darf danach nicht ins Leere zeigen');
});

test('[U2-ADR-306·Identität] ein Options-Objekt bleibt dieselbe Referenz — auch über eine gefilterte Kopie des Arrays hinweg', async () => {
  const kern = await ladeKern();
  const feld = kern.V.WIZARD_BY_ID.gebwiz.schritte.find((s) => s.feld.id === 'guidedBirthEntryRelationship').feld;
  assert.ok(Array.isArray(feld.optionen) && feld.optionen.length > 0, 'Vorbedingung: gebwiz_kind_art traegt Optionen');
  const optVorher = feld.optionen[0];
  const gefiltertVorher = feld.optionen.filter((o) => o.wert === optVorher.wert);
  kern.V.buergermodulWizardErsetzen('gebwiz', bauModuleDefsAusNativ(kern.V, 'gebwiz'));
  const optNachher = feld.optionen.find((o) => o.wert === optVorher.wert);
  assert.equal(optNachher, optVorher, 'die Options-Referenz muss dieselbe bleiben, sonst zeigt eine vor dem Ersetzen gezogene gefilterte Kopie ins Leere');
  assert.equal(gefiltertVorher[0], optVorher, 'Vorbedingung: die gefilterte Kopie enthält dieselbe Referenz, kein Klon');
});

test('[U2-ADR-306·Sicherheit] ein Modul, das ein FREMDES natives Feld (aus einem ANDEREN Wizard) behauptet, bekommt es nicht — die Erlaubnis kommt aus dem Geruest, nie aus dem Modul', async () => {
  const kern = await frischMitDepot('sicherheit');
  const defs = bauModuleDefsAusNativ(kern.V, 'gebwiz');
  // `familienstand` gehoert nativ zu `heirwiz`, nicht zu `gebwiz` — ein Modul, das gebwiz
  // ersetzt, darf sich den Schritt eines ANDEREN Wizards nicht aneignen.
  defs.push({ wizardId: 'gebwiz', feldId: 'maritalStatus', feld: { id: 'maritalStatus', typ: 'auswahl' }, frage: 'Familienstand?' });
  const ergebnis = kern.V.buergermodulWizardErsetzen('gebwiz', defs);
  assert.ok(ergebnis.verworfen.some((v) => v.name === 'maritalStatus' && v.grund === 'nicht-erlaubt'),
    'ein fremder Schritt wird abgelehnt, nicht stillschweigend uebernommen');
  const seq = wizardLaufHtmlSequenz(kern.V, kern, 'gebwiz');
  assert.ok(!seq.some((html) => html.includes('data-feld="maritalStatus"')), 'das abgelehnte Feld darf in keinem Schritt des Renderings auftauchen');
});

test('[U2-ADR-306·Sicherheit] ein Schritt ohne frage wird strukturell abgelehnt — ein Schritt ohne Frage ist fuer den Assistenten kein Schritt', async () => {
  const kern = await ladeKern();
  const defs = bauModuleDefsAusNativ(kern.V, 'gebwiz').map((d) => (d.feldId === 'geburt_klinik' ? Object.assign({}, d, { frage: '' }) : d));
  const ergebnis = kern.V.buergermodulWizardErsetzen('gebwiz', defs);
  assert.ok(ergebnis.verworfen.some((v) => v.name === 'geburt_klinik' && v.grund === 'form'));
});

test('[U2-ADR-306·Sicherheit·Gegenkontrolle] eine reservierte Wizard-ID wird ueber den SIGNIERTEN Weg weiterhin mit reserviert abgewiesen — die Erste-Partei-Zone oeffnet den Einlassweg nicht', async () => {
  const kern = await ladeKern();
  const geprueft = kern.V.wizardsModulPruefen({
    modulTyp: 'wizard', moduleVersion: 1, herkunft: 'fremd', sprache: 'de',
    wizards: { gebwiz: { titel: 'Fremde Geburt', ziel: { situation: 'geburt' }, schritte: [{ feld: { id: 'x' }, frage: 'y' }] } },
  });
  assert.equal(geprueft.gueltig, false, 'nichts Gueltiges bleibt, wenn der einzige Wizard reserviert ist');
  assert.ok(geprueft.verworfene.some((v) => v.id === 'gebwiz' && v.grund === 'reserviert'),
    'eine reservierte ID wird ueber den Einlassweg weiterhin abgewiesen, unabhaengig von der Erste-Partei-Zone');
});

test('[U2-ADR-306] unbekannter Wizard wird benannt, nicht stillschweigend uebergangen', async () => {
  const kern = await ladeKern();
  const ergebnis = kern.V.buergermodulWizardErsetzen('gibt-es-nicht', []);
  assert.equal(ergebnis.angewandt, false);
  assert.equal(ergebnis.grund, 'unbekannter-wizard');
});

test('[U2-ADR-306] _erstePartieErlaubteIdsFuerWizard deckt exakt den nativen Bestand dieses EINEN Wizards', async () => {
  const kern = await ladeKern();
  const ids = kern.V._erstePartieErlaubteIdsFuerWizard('gebwiz');
  assert.equal(ids.length, kern.V.WIZARD_BY_ID.gebwiz.schritte.length);
  assert.ok(ids.includes('gebwiz.geburt_klinik'));
  assert.ok(!ids.includes('heirwiz.familienstand'), 'ein anderer Wizard gehoert nicht zur Erlaubnisliste dieses Wizards');
});
