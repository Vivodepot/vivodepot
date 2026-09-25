'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   pro-modul-eingebaute-bereichs-grenze.test.js — die Probe, die den Zug „White Label bis ins PDF"
   trägt (Auflage, 10.09.2026, nach den vier Funden derselben Nacht:
   Pro ohne Sprachachse, Ersatzweg ohne Rubriken, Modul ohne navUnterzeile,
   jetzt Sektion/Feld ohne Textsatz-Weg)
   ────────────────────────────────────────────────────────────────────────────
   DIE FORM DER KENNUNG IST BREIT GEWORDEN (Sektion `#`, UnterFeld/Option `/`)
   — das ist Absicht, s. Kopf-Kommentare an `_MODULFELD_KENNUNG`/
   `_MODULOPTION_KENNUNG`/`_istSektionLabelKennung`. DIE SICHERHEIT LIEGT NICHT
   IN DER FORM, sondern darin, dass die `bereichId` KEINE eingebaute ist
   (`BEREICH_IDS_EINGEBAUT`). Diese Probe behauptet genau das: ein Modul, das
   über eine der drei NEUEN Kennungsformen eine Kennung eines EINGEBAUTEN
   Bereichs setzen will, wird beim Einlass abgewiesen (`grund: 'unbekannt'`),
   nicht angenommen.

   OHNE DIESE PROBE IST DIE ZUSICHERUNG EINE BEHAUPTUNG — genau die Fehlerklasse,
   die die anderen drei Funde derselben Nacht ausmachte: eine Fähigkeit, die für
   eingebaute Bereiche da war und für modul-gelieferte nicht (oder hier
   umgekehrt: eine Öffnung, die versehentlich auch eingebaute Bereiche träfe).

   GEPRÜFT ÜBER DEN ECHTEN EINLASSWEG (`textsatzModulPruefen`), nicht über die
   internen `_ist…Kennung`-Funktionen direkt — derselbe Weg, den ein echtes
   Sprachmodul beim Andocken nimmt. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

const EIN_EINGEBAUTER_BEREICH = 'identity'; // s. BEREICH_IDS_EINGEBAUT im Kern
// Eine SEKTION, die es unter `identitaet` nicht gibt — echte Sektionen (z. B. `person`) tragen
// oft schon ein natives `identitaet#person.label` in AB_WERK_TEXTSATZ_DE, das den ERSTEN,
// älteren Prüfzweig träfe und die Probe nichts über den NEUEN Zweig aussagen liesse (falsch
// gemessen, selbst gefunden: der erste Anlauf dieser Probe nahm `#person` und wurde grün, weil
// die Kennung schon nativ existierte — nicht, weil die neue Bereichs-Prüfung griff).
const ERFUNDENE_SEKTION = 'voellig-erfundene-sektion-abc99';

/* Umgestellt 22.09.2026 (Textsatz-Einlass meldet den Verlust): ein Modul, von dem JEDE Kennung verworfen wird, ist jetzt `leer` und nicht mehr gültig. Diese Proben
   prüfen, dass die erfundene Kennung eines EINGEBAUTEN Bereichs nicht übernommen wird und namentlich als „unbekannt" verworfen ist — nicht, ob das Modul allein
   daran scheitert. Darum steht neben ihr eine Kennung, die der Kern kennt (BEKANNT), und die Erwartung ist „genau diese kommt an, die erfundene nicht" —
   strenger als vorher („keine kommt an"), nicht leerer. Die erfundene Kennung ist keinem Katalog hinzugefügt, die Ablehnung nicht gelockert. */
const BEKANNT = 'strings:depotPilleEigen.text';
function modulMit(kennung, wert) {
  return { modulTyp: 'textsatz', sprache: 'en', moduleVersion: 1, texte: { [kennung]: wert, [BEKANNT]: 'Known' } };
}

test('[Grenze·Sektion] `<eingebauterBereich>#<erfundeneSektion>.label` wird abgewiesen', () => {
  const { V } = ladeKern();
  const kennung = EIN_EINGEBAUTER_BEREICH + '#' + ERFUNDENE_SEKTION + '.label';
  const r = V.textsatzModulPruefen(modulMit(kennung, 'Sneaked in'));
  assert.equal(r.gueltig, true, 'ein einzelner unbekannter Schlüssel verwirft nicht das ganze Modul');
  assert.deepEqual(Object.keys(r.texte), [BEKANNT], 'ROT ERWARTET: die Kennung darf NICHT übernommen werden — sie träfe einen eingebauten Bereich');
  assert.ok(r.verworfene.some((v) => v.kennung === kennung && v.grund === 'unbekannt'),
    'die Kennung muss NAMENTLICH als "unbekannt" verworfen werden, nicht nur fehlen');
});

test('[Grenze·UnterFeld] `<eingebauterBereich>.tpl_x/tpl_y.label` wird abgewiesen', () => {
  const { V } = ladeKern();
  const kennung = EIN_EINGEBAUTER_BEREICH + '.tpl_x/tpl_y.label';
  const r = V.textsatzModulPruefen(modulMit(kennung, 'Sneaked in'));
  assert.deepEqual(Object.keys(r.texte), [BEKANNT], 'ROT ERWARTET: ein eingebauter Bereich darf über die UnterFeld-Form nie getroffen werden');
  assert.ok(r.verworfene.some((v) => v.kennung === kennung && v.grund === 'unbekannt'));
});

test('[Grenze·Option] `<eingebauterBereich>.tpl_x/wert.label` wird abgewiesen', () => {
  const { V } = ladeKern();
  const kennung = EIN_EINGEBAUTER_BEREICH + '.tpl_x/einzel.label';
  const r = V.textsatzModulPruefen(modulMit(kennung, 'Sneaked in'));
  assert.deepEqual(Object.keys(r.texte), [BEKANNT], 'ROT ERWARTET: ein eingebauter Bereich darf über die Options-Form nie getroffen werden');
  assert.ok(r.verworfene.some((v) => v.kennung === kennung && v.grund === 'unbekannt'));
});

/* `.navUnterzeile` selbst ist an dieser Stelle NICHT schwarzkastig prüfbar: alle dreizehn
   eingebauten Bereiche tragen bereits ein echtes `<bereichId>.navUnterzeile` in
   AB_WERK_TEXTSATZ_DE („Bereichsschnitt und Unterzeilen", 09.09.2026) — der ERSTE
   Prüfzweig (native Kennung) akzeptiert die Kennung darum so oder so, unabhängig davon, ob die
   neue Bereichs-Prüfung in `_istBereichLabelKennung` korrekt griffe. Ein Modul konnte
   `identitaet.navUnterzeile` schon VOR diesem Auftrag überschreiben — dieselbe Berechtigung,
   nicht durch diesen Zug erweitert. Die Bereichs-Prüfung selbst steht trotzdem im Quelltext,
   wortgleich neben der von `.label`: `_BEREICH_ARTEN_OHNE_MODUL`-Zweig in
   `_istBereichLabelKennung`, `BEREICH_IDS_EINGEBAUT.indexOf(id) < 0` — dieselbe Zeile, die die
   drei Proben oben für Sektion/UnterFeld/Option bereits belegen. */

/* GEGENPROBE: dieselben vier Formen an einem ANGEDOCKTEN (nicht eingebauten) Bereich
   werden angenommen — sonst wäre die Grenze zu eng gezogen und die Öffnung selbst
   wirkungslos (dieselbe Art Gegenprobe wie bei jedem anderen Wächter dieser Suite). */
test('[Grenze·Gegenprobe] dieselben vier Formen an einem ANGEDOCKTEN Bereich werden angenommen', () => {
  const { V } = ladeKern();
  const angedockt = 'pro-vertretung-vollmachten'; // nicht in BEREICH_IDS_EINGEBAUT
  const modul = {
    modulTyp: 'textsatz', sprache: 'en', moduleVersion: 1,
    texte: {
      [angedockt + '#block-1.label']: 'Block 1',
      [angedockt + '.tpl_x.label']: 'X',
      [angedockt + '.tpl_x/tpl_y.label']: 'Y',
      [angedockt + '.tpl_x/einzel.label']: 'Sole',
      [angedockt + '.navUnterzeile']: 'A subtitle',
    },
  };
  const r = V.textsatzModulPruefen(modul);
  assert.deepEqual(r.verworfene, [], 'kein einziger Schlüssel darf hier verworfen werden — sonst ist die Grenze zu eng, nicht nur sicher');
  assert.equal(Object.keys(r.texte).length, 5);
});
