'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   Guard für tests/e2e/sichten-erfassen.js — die Namens-Ableitung (Klassen 1-3
   + `oeffne`/`render`/`flow`) muß ERSETZT, nicht nur VERLÄNGERT werden können
   (Auflage, Auftrag „B6a", 06.09.2026).

   Zwei Dinge werden hier bewiesen, nicht nur behauptet:

   1. ROT-BEWEIS auf einem FIXTURE: eine Sicht, die weder ins Namensmuster
      noch in die benannte Klasse-4-Liste fällt, wird von der Heuristik
      gefunden — und bleibt trotzdem außerhalb, solange sie nicht benannt ist.
      Das ist die Lücke selbst, sichtbar gemacht statt versteckt.

   2. DER LEBENDE GUARD gegen den echten Kanon: taucht im Kern ein SECHSTER
      Fall auf — ein Kandidat, der weder dem Namensmuster noch
      `WEITERE_SICHTEN_NAMENTLICH` (tests/e2e/sichten-erfassen.js) entspricht —
      geht DIESER Test rot. Die Reaktion darauf ist NICHT, den Test zu
      lockern, sondern von Hand zu prüfen, ob der Kandidat eine echte
      zusätzliche Sicht ist (dann in die Liste aufnehmen, mit Begründung wie
      dort) oder ein Fehlalarm (dann hier in AUSGESCHLOSSENE_FEHLALARME mit
      Begründung, wie `betreteApp`/`verdrahteEinstellungen`/
      `schliesseAnlassAuswahl` es schon sind).
   ════════════════════════════════════════════════════════════════════════════ */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { heuristikKandidaten } = require('../tools/sichten-heuristik-erheben.js');

const KERN = fs.readFileSync(path.join(__dirname, '..', 'vivodepot.html'), 'utf8');

// Aus tests/e2e/sichten-erfassen.js übernommen (dort die einzige Quelle) — hier
// dupliziert statt importiert, weil der Import einen Playwright-Kontext mitzöge,
// den dieser reine Node-Test nicht braucht. Beide Listen MÜSSEN übereinstimmen;
// die dritte Kontrolle unten prüft genau das.
const WEITERE_SICHTEN_NAMENTLICH = [
  'wiedereinstiegHinweisZeigen', 'zeigeInternenWiedereintritt',
  'passwortWechselAbschlussZeigen', 'notfallblattOeffnen', 'zeigeSchlussSicht',
];

// Von Hand geprüft (06.09.2026) und ausdrücklich KEINE zusätzliche Sicht — jede ruft nur eine
// bereits gezählte oeffne/render/flow-Funktion auf oder ist reine Wiring-/Zustands-Buchhaltung
// ohne eigenen Inhalt. Grund je Gruppe, nicht je Zeile (derselbe Grund für alle in der Gruppe):
const AUSGESCHLOSSENE_FEHLALARME = [
  // Orchestrator/Schließer/Navigation — Ziel ist ausschließlich eine schon gezählte Sicht:
  'betreteApp', 'schliesseAnlassAuswahl', 'geheZuZuhause', 'vorschauVerwerfenUndZuhause',
  'akutZurueck', 'angehoerigenBlattZurueck', 'booteEingang',
  // Wizard-Schrittsteuerung — bewegt sich INNERHALB des schon über `fn:renderWizard` gezählten
  // Wizard-Renderers, öffnet keine eigene Sicht (a5/B6b zählt die Wizard-Schritte selbst, über
  // die WIZARDS-Registry statt über diese Klasse):
  'wizardWeiter', 'wizardZurueck', 'wizardAbschluss',
  // Reine Event-Verdrahtung, kein Rendering:
  'verdrahteEinstellungen', 'blattVorschlagVerdrahten', 'depotMenueVerdrahten',
  // Reine Zustands-/Zähler-Buchhaltung (Speicher-Status); der sichtbare Effekt läuft über
  // `renderSaveStatus`, das schon in Klasse 3 (nullstellige render*) gezählt ist:
  'markiereBasislinieOhneVorherigeSitzung', 'markiereGespeichert', 'markiereAlsDateiGesichert',
  'markiereDateiSicherungUnbestaetigt',
];

test('[Heuristik] findet eine Sicht außerhalb des Namensmusters — auf einem Fixture, nicht behauptet', () => {
  const fixture = `
    function oeffneEcht() { document.getElementById('x').innerHTML = 'echt, im Muster'; }
    function zeigeUnbenannteSicht() { document.getElementById('y').innerHTML = 'echt, AUSSERHALB des Musters'; }
    function _internerHelfer() { document.getElementById('z').innerHTML = 'intern, ausgenommen'; }
    function keinRendern() { return 1 + 1; }
  `;
  const kandidaten = heuristikKandidaten(fixture);
  assert.deepEqual(kandidaten, ['zeigeUnbenannteSicht'],
    'die Heuristik muss die außerhalb des Musters liegende Sicht finden — und NUR sie');
});

test('[Rot-Beweis] ein unbenannter Kandidat bleibt außerhalb der Klassen 1-4, bis er benannt ist', () => {
  const fixture = 'function zeigeGanzNeueSicht() { document.getElementById("q").innerHTML = "neu"; }';
  const kandidaten = heuristikKandidaten(fixture);
  assert.equal(kandidaten.includes('zeigeGanzNeueSicht'), true);
  assert.equal(WEITERE_SICHTEN_NAMENTLICH.includes('zeigeGanzNeueSicht'), false,
    'Beweis der Lücke: die Ableitung (Klassen 1-3 + Klasse 4) würde diese Sicht NICHT tragen, '
    + 'solange niemand sie benennt — genau die Grenze, die dieser Guard gegen den echten Kanon '
    + 'unten wachhält.');
});

test('[Guard] der echte Kanon trägt KEINEN sechsten unbenannten Fall', () => {
  const roh = heuristikKandidaten(KERN);
  const unbenannt = roh.filter((n) => !WEITERE_SICHTEN_NAMENTLICH.includes(n)
    && !AUSGESCHLOSSENE_FEHLALARME.includes(n));
  assert.deepEqual(unbenannt, [],
    'neue(r) Kandidat(en) außerhalb des Namensmusters, weder als Sicht noch als Fehlalarm '
    + 'benannt: ' + unbenannt.join(', ') + ' — von Hand prüfen und in WEITERE_SICHTEN_NAMENTLICH '
    + '(tests/e2e/sichten-erfassen.js) oder AUSGESCHLOSSENE_FEHLALARME (hier) aufnehmen, mit Grund.');
});

test('[Deckung] jeder in WEITERE_SICHTEN_NAMENTLICH benannte Fall ist auch ein echter Heuristik-Treffer', () => {
  // Gegenprobe zur Guard-Probe oben: eine Liste, die einen Namen führt, den die Heuristik gar
  // nicht mehr findet (z. B. nach einer Umbenennung im Kern), würde etwas benennen, das nicht
  // mehr existiert — ein stiller, unbemerkter Drift der Liste weg vom Bestand.
  const roh = heuristikKandidaten(KERN);
  for (const name of WEITERE_SICHTEN_NAMENTLICH) {
    assert.ok(roh.includes(name), name + ' steht in WEITERE_SICHTEN_NAMENTLICH, aber die '
      + 'Heuristik findet ihn im Kern nicht mehr — Name geändert oder Funktion entfernt?');
  }
});
