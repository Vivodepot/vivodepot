'use strict';
/* anfrage-schalter-je-angabe.test.js — Anfrage-Ansicht nach dem Desktop-Dummy (U-9, 16.11.2026)
   Je vorhandener Angabe steht ein Häkchen mit Label (Entscheidung „Häkchen in Gruppen“, 17.11.2026; vorher ein Schalter). Eine
   abgehakte Angabe geht nicht mit: „Diese Angaben herausgeben“ reicht die Wahl an die Übersicht vor dem Herausgeben, und dort startet sie
   ohne Häkchen; Sensibles startet ohne Häkchen (P4) und geht angehakt als `zuwahl` mit. Das Zurückhalten läuft über die eine ephemere Markierung
   (exportAuswahlEphemerAnwenden); einen zweiten Weg gibt es nicht. „Nicht beantworten“ sendet nichts und vermerkt den Zustand „abgelehnt“
   mit Datum (Schema 103); „Wieder öffnen“ nimmt ihn zurück. Die Brotkrume führt zur Übersicht und speichert nichts. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { ladeKern } = require('./load-kern.js');

const KERN = fs.readFileSync(path.join(__dirname, '..', 'vivodepot.html'), 'utf8');
const { istOeffentlich } = require('./helfer/nur-privat.js');
// Im öffentlichen Zuschnitt fehlen die Pro-Textsätze; dort prüft die Probe die beiden Privat-Textsätze.
const TEXTE = (istOeffentlich() ? ['textsatz-de-modul.json', 'textsatz-en-modul.json']
  : ['textsatz-de-modul.json', 'textsatz-de-pro-modul.json', 'textsatz-en-modul.json', 'textsatz-en-pro-modul.json'])
  .map((d) => JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'tools', d), 'utf8')));

const stueck = (quelle, von, bis) => {
  const a = quelle.indexOf(von);
  const e = quelle.indexOf(bis, a + von.length);
  assert.ok(a >= 0 && e > a, 'Vorbedingung: der Abschnitt ab „' + von + '“ steht im Kern');
  return quelle.slice(a, e);
};

/* Was an der Kette fehlt, als benannte Liste; leer heißt: die Kette steht. */
function luecken(kern) {
  const fehlt = [];
  const ansicht = stueck(kern, 'function renderAnfrage() {', '\n}\n');
  const heraus = stueck(kern, 'async function _anfrageHerausgeben(eintrag) {', '\n}\n');
  const uebersicht = stueck(kern, 'function flowExportUebersicht(opt) {', 'const unstimmig = exportUnstimmigeFelder(sektorId);');
  const liste = stueck(ansicht, 'id="anfrage-vorhanden"', '// 3 · Was fehlt');
  if (!/<input type="checkbox" class="export-haken anfrage-haken" id="' \+ escapeAttr\(hid\) \+ '" data-anfrage-haken=/.test(liste)) fehlt.push('kein Häkchen je vorhandener Angabe');
  if (!/<label class="anfrage-zeile-text" for="' \+ escapeAttr\(hid\) \+ '">/.test(liste)) fehlt.push('das Häkchen hat kein Label');
  if (!/const an = _anfrageHaken\(sk, sens\);/.test(liste)) fehlt.push('die Vorauswahl der Ansicht folgt nicht der Regel (P4)');
  if (!/abwahl: _anfrageAbwahl\.id === eintrag\.id \? \[\.\.\._anfrageAbwahl\.aus\]/.test(heraus)) fehlt.push('„Diese Angaben herausgeben“ reicht die Abwahl nicht weiter');
  if (!/zuwahl: _anfrageAbwahl\.id === eintrag\.id \? \[\.\.\._anfrageAbwahl\.ein\]/.test(heraus)) fehlt.push('„Diese Angaben herausgeben“ reicht angehaktes Sensibles nicht weiter');
  if (!/const gehalten = new Set\(toggelbar\.filter\(\(e\) => abwahl\.has\(e\.kennung\)/.test(uebersicht)) fehlt.push('die Übersicht hält abgewählte Angaben nicht zurück');
  if (!/class="bereich-aktionen anfrage-aktionen"/.test(ansicht)) fehlt.push('die Knöpfe stehen nicht links wie im Dummy (anfrage-aktionen)');
  if (!/id="anfrage-ablehnen"/.test(ansicht)) fehlt.push('kein Knopf „Ablehnen“');
  const ablehnen = stueck(ansicht, "if (abl) abl.onclick =", ';\n');
  if (!/anfrageAblehnen\(eintrag\.id\)/.test(ablehnen) || /flowAnfrage|Herausgeben|herausgeb/.test(ablehnen)) fehlt.push('„Nicht beantworten“ vermerkt nicht oder gibt heraus');
  if (!/id="anfrage-wieder-oeffnen"/.test(ansicht)) fehlt.push('kein Knopf „Wieder öffnen“');
  const zurueck = stueck(ansicht, 'const zurueck = () =>', ';\n');
  if (/speichern|Speichern|anfrageAblehnen|herausgeb/i.test(zurueck)) fehlt.push('die Brotkrume speichert oder gibt heraus');
  return fehlt;
}

test('[U-9] Häkchen je Angabe, Abwahl bis in die Übersicht, Ablehnen und Wieder öffnen', () => {
  assert.deepEqual(luecken(KERN), []);
});

test('[U-9] die neuen Texte stehen in allen vier Textsätzen', () => {
  for (const k of ['anfrageTitelVon', 'anfrageBrotkrumeUebersicht', 'anfrageAntwortSenden', 'anfrageAblehnen',
    'anfrageZustand_abgelehnt', 'anfrageAbgelehntHinweis', 'anfrageWiederOeffnen']) {
    for (const t of TEXTE) assert.ok(JSON.stringify(t).includes('"strings:' + k + '.text"'), k + ' fehlt in einem Textsatz');
  }
});

test('[U-9·Ablehnen] Ablehnen setzt „abgelehnt“ mit Datum, sendet nichts; Wieder öffnen nimmt es zurück', () => {
  const { V } = ladeKern();
  const d = V.getData() || {};
  d.anfragen = [{ id: 'q1', vorgang: 'A-7', von: 'Stadtbibliothek Beispielstadt', anbieterId: null, empfangenAm: '2026-11-01T09:00:00.000Z',
    beantwortetAm: null, anfrage: { gueltigBis: '2099-12-31' } }];
  V.setData(d);
  assert.equal(V.anfrageZustand(d.anfragen[0]), 'offen');
  const r = V.anfrageAblehnen('q1');
  assert.equal(r.ok, true);
  assert.match(String(d.anfragen[0].abgelehntAm), /^\d{4}-\d{2}-\d{2}T/);
  assert.equal(V.anfrageZustand(d.anfragen[0]), 'abgelehnt');
  assert.equal(d.anfragen[0].beantwortetAm, null, 'abgelehnt heißt nicht beantwortet');
  assert.equal(V.anfrageWiederOeffnen('q1').ok, true);
  assert.ok(!('abgelehntAm' in d.anfragen[0]));
  assert.equal(V.anfrageZustand(d.anfragen[0]), 'offen');
  // Eine beantwortete Anfrage wird nicht nachträglich abgelehnt.
  d.anfragen[0].beantwortetAm = '2026-11-02T09:00:00.000Z';
  assert.equal(V.anfrageAblehnen('q1').ok, false);
});

test('[U-9·Rot-Beweis] fehlt ein Glied der Kette, wird es benannt', () => {
  const ohneUebersicht = KERN.replace('toggelbar.filter((e) => abwahl.has(e.kennung) ||', 'toggelbar.filter((e) => false ||');
  assert.ok(luecken(ohneUebersicht).some((z) => z.includes('Übersicht hält')));
  const ohneWeitergabe = KERN.replace('abwahl: _anfrageAbwahl.id === eintrag.id ?', 'abwahlX: _anfrageAbwahl.id === eintrag.id ?');
  assert.ok(luecken(ohneWeitergabe).some((z) => z.includes('reicht die Abwahl')));
  const ablehnenOhneVermerk = KERN.replace('anfrageAblehnen(eintrag.id); renderAnfrage();', 'renderAnfrage();');
  assert.ok(luecken(ablehnenOhneVermerk).some((z) => z.includes('Nicht beantworten')));
  const krumeSpeichert = KERN.replace('const zurueck = () => { _anfrageAbwahl.aus.clear();', 'const zurueck = () => { bearbeitungSpeichern(); _anfrageAbwahl.aus.clear();');
  assert.ok(luecken(krumeSpeichert).some((z) => z.includes('Brotkrume')));
  const ohneLabel = KERN.replace(`'<label class="anfrage-zeile-text" for="' + escapeAttr(hid) + '">'`, `'<span class="anfrage-zeile-text">'`);
  assert.ok(luecken(ohneLabel).some((z) => z.includes('kein Label')));
});

/* ══ Innenabstand der Karten (U-9, 16.11.2026) ══════════════════════════════
   Salbei-Glas legt Abschnitte flach und ohne Seitenabstand an; das Dummy-Erscheinungsbild stellt Fläche und Rahmen wieder her.
   Ohne eigenen Abstand stand der Inhalt der Anfrage-Karten bündig am Rand. Die Probe rendert die Ansicht im Sandkasten und
   verlangt: jede Karte trägt .anfrage-karte, und das Dummy-Bild gibt ihr Innenabstand, nach der flachen Regel. */
const DUMMY = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'tools', 'erscheinung', 'erscheinungsbild-dummy-modul.json'), 'utf8'));

function kartenMaengel(html, stil) {
  const f = [];
  const karten = html.match(/<div class="sektion[^"]*"/g) || [];
  if (karten.length < 3) f.push('die Ansicht zeigt weniger als drei Karten');
  if (karten.some((k) => !/\banfrage-karte\b/.test(k))) f.push('eine Karte der Anfrage trägt nicht .anfrage-karte');
  const dummy = String(stil.dummy || '');
  const regel = /html:not\(\.high-contrast\) #app \.sektion\.anfrage-karte \{ padding: var\(--space-\d\) var\(--space-\d\);/.exec(dummy);
  if (!regel) f.push('das Dummy-Bild gibt den Anfrage-Karten keinen Innenabstand');
  const flach = String(stil['salbei-glas'] || '');
  if (!/\.sektion, \.sektion--eingabe \{[^}]*padding: var\(--space-4\) 0 0;/.test(flach)) f.push('Vorbedingung: die flache Regel steht nicht mehr in Salbei-Glas (Probe nachziehen)');
  return f;
}

test('[U-9·Karten] die Anfrage-Ansicht rendert ihre Karten mit Innenabstand im Dummy-Bild', async () => {
  const { V, document } = ladeKern();
  await V.depotAnlegen('anfrage-karten-pw');
  V.akteurSelbstErklaeren('B');
  V.zusammenstellungZuruecksetzen();
  const anfrage = { modulTyp: 'anfrage', anfrageVersion: 1, von: 'Stadtbibliothek Beispielstadt', zweck: 'Bibliotheksausweis', grundlage: 'Benutzungsordnung',
    vorgang: 'KARTE-1', gestelltAm: '2026-11-16', gueltigBis: '2099-12-31',
    felder: [{ kennung: 'health.allergiesMedicationFoodOther', zweck: 'Probe', pflicht: true }],
    antwort: { art: 'einmalpasswort', an: 'ausweis@bibliothek.example.invalid' } };
  const m = V.anfrageMerken(V.anfrageAusText(JSON.stringify(anfrage)), null);
  assert.equal(m.ok, true, 'Vorbedingung: die Anfrage ist angenommen (' + JSON.stringify(m.grund || m.fehler || '') + ')');
  V.oeffneAnfrage(m.eintrag.id);
  const html = document.getElementById('content').innerHTML;
  assert.deepEqual(kartenMaengel(html, DUMMY.stil), []);
  // Rot-Beweis: ohne die Klasse an einer Karte, ohne die Regel im Dummy-Bild.
  assert.ok(kartenMaengel(html.replace('class="sektion anfrage-karte"', 'class="sektion"'), DUMMY.stil).some((z) => z.includes('trägt nicht')));
  const ohneRegel = Object.assign({}, DUMMY.stil, { dummy: String(DUMMY.stil.dummy).split('.sektion.anfrage-karte {').join('.sektion.anders {') });
  assert.ok(kartenMaengel(html, ohneRegel).some((z) => z.includes('keinen Innenabstand')));
});
