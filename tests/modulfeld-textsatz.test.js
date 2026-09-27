'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   A491 — EIN ANGEDOCKTES MODULFELD SCHALTET MIT DEM TEXTSATZ MIT
   ────────────────────────────────────────────────────────────────────────────
   Laufzettel „Die Vierunddreißig" (22.08.2026), Strang 1 Posten 1.1. Gegenstand
   ist die Zeile A478: bis heute konnte ein Textsatz die Beschriftung eines
   angedockten Feldes nicht tragen — aus ZWEI Gründen, und eine Sperre allein zu
   öffnen hätte nichts bewegt.

     Sperre 1 (die härtere): `textsatzModulPruefen` verwarf jede Kennung, die
       `AB_WERK_TEXTSATZ_DE` nicht führt. Ein Modulfeld-Schlüssel steht dort NIE —
       das Feld entsteht erst im Depot der Bürgerin.
     Sperre 2 (die sichtbare): `_templateDefAlsFeld` setzte `label: def.label`
       und rief `textLesen` nicht.

   DIESE DATEI BEWACHT DIE FORM, nicht den Durchstich. Den Durchstich misst
   `tests/mitschalt-beleg-textsatz.test.js` über alle Ausgabewege, mit
   Positivkontrolle und Rot-Beleg — das ist der Beleg, dass es WIRKT. Hier steht,
   was die Form aushält und was sie ablehnt: ein geöffneter Schlüsselraum, der
   alles annimmt, wäre schlimmer als der geschlossene, weil die Liste der
   `verworfene` dann für immer leer bliebe.
   ════════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { ladeKern } = require('./load-kern.js');

const KERN_DATEI = process.env.KERN_HTML_PATH
  || path.join(__dirname, '..', 'vivodepot.html');

const SPRACHE = 'zz';
const SEKTOR = 'identitaet';
/* UMGEDREHT 16.09.2026 (U2-ADR-141 Entscheidung 4): `identitaet` ist die ALTE Kennung und bleibt hier
   stehen. Bis heute kam `identitaet.tpl_….label` nur durch, weil das Tor sie für die Beschriftung
   eines angedockten Bereichs hielt — die Probe prüfte die neue Form mit einer Kennung, die kein
   heutiges Depot mehr trägt. Seit das Tor alte Kennungen übersetzt, beweist sie genau das: der
   Text kommt unter der heutigen Kennung an. Verworfen wird daneben weiter, was erfunden ist
   (die Rot-Belege unten, mit derselben alten Kennung). */
const SEKTOR_HEUTE = 'identity';
const FELD = 'tpl_pruefstoff_beschriftung';
/* Umgestellt 22.09.2026 (Textsatz-Einlass meldet den Verlust): ein Modul, von dem JEDE Kennung verworfen wird, ist jetzt `leer`, nicht mehr gültig. Die zwei Rot-Belege
   unten, die „keine Kennung kommt an" prüften, stellen die erfundene Kennung neben eine, die der Kern kennt (BEKANNT), und erwarten „genau diese kommt an, die
   erfundene nicht" — strenger als vorher, nicht leerer. Die erfundene Kennung ist keinem Katalog hinzugefügt, die Ablehnung nicht gelockert. */
const BEKANNT = 'strings:depotPilleEigen.text';

function satzMit(texte) {
  return { modulTyp: 'textsatz', sprache: SPRACHE, moduleVersion: 1, anbieterId: 'pruefstoff', texte };
}

function pruefen(texte) {
  const { V } = ladeKern();
  return V.textsatzModulPruefen(satzMit(texte));
}

/* ── Die Form: was durchkommt ────────────────────────────────────────────── */

test('[A491] eine Modulfeld-Kennung kommt durch — `<sektor>.tpl_<feld>.label`, unter alter Kennung übersetzt', () => {
  const r = pruefen({ [SEKTOR + '.' + FELD + '.label']: 'ZZ-Beschriftung' });
  assert.equal(r.gueltig, true, r.grund);
  assert.deepEqual(r.verworfene, []);
  assert.equal(r.texte[SEKTOR_HEUTE + '.' + FELD + '.label'], 'ZZ-Beschriftung');
  assert.equal(r.texte[SEKTOR + '.' + FELD + '.label'], undefined, 'die alte Kennung bleibt nicht zusätzlich stehen');
});

test('[A491] auch `.hint` — der Hilfetext ist Beschriftung wie das Label', () => {
  const r = pruefen({ [SEKTOR + '.' + FELD + '.hint']: 'ZZ-Hinweis' });
  assert.deepEqual(r.verworfene, []);
  assert.equal(r.texte[SEKTOR_HEUTE + '.' + FELD + '.hint'], 'ZZ-Hinweis');
});

/* ── Die Form: was NICHT durchkommt ──────────────────────────────────────── */

test('[A491·Rot-Beleg] ein erfundener Kern-Schlüssel wird weiter verworfen', () => {
  /* Der Raum ist um eine FORM geöffnet, nicht freigegeben. Ohne diese Probe wäre
     nicht zu unterscheiden, ob die Prüfung noch prüft. */
  const r = pruefen({ 'strings:speichern.text': 'ZZ-Speichern-erfunden', [BEKANNT]: 'ZZ-bekannt' });
  assert.deepEqual(r.verworfene.map((v) => v.grund), ['unbekannt']);
  assert.deepEqual(Object.keys(r.texte), [BEKANNT], 'die bekannte kommt an, die erfundene nicht');
});

test('[A491·Rot-Beleg] ein Feld OHNE `tpl_`-Präfix ist kein Modulfeld', () => {
  /* `identity.givenName.label` ist ein eingebautes Feld — es steht ohnehin im
     Satz und braucht die neue Form nicht. `identity.erfunden.label` dagegen
     wäre ein Kern-Feld, das es nicht gibt, und muss durchfallen. */
  const r = pruefen({ 'identity.erfunden.label': 'ZZ-erfunden', [BEKANNT]: 'ZZ-bekannt' });
  assert.deepEqual(r.verworfene.map((v) => v.kennung), ['identity.erfunden.label']);
  assert.deepEqual(Object.keys(r.texte), [BEKANNT], 'die bekannte kommt an, die erfundene nicht');
});

/* NACHGEZOGEN 05.09.2026 (U2-ADR-290) — DIE ENTSCHEIDUNG IST UNVERÄNDERT, DAS BEISPIEL NICHT.
   Diese Probe bewachte nie „nur label und hint", sondern den Satz aus dem Kopf dieser Datei:
   ein geöffneter Schlüsselraum, der ALLES annimmt, wäre schlimmer als der geschlossene, weil
   die `verworfene`-Liste dann für immer leer bliebe. Sie hatte dafür `beispiel` als dritte Art
   gewählt — und genau die ist seit U2-ADR-290 legitim: ein Modul darf sein eigenes Feld nicht
   nur benennen, sondern auch erklären, und `beispiel` wird am Feld abgeholt.
   Die Probe behält ihren Gegenstand und wechselt ihr Beispiel auf eine Art, die WIRKLICH
   niemand abholt. Die drei übrigen Rot-Belege dieser Datei — erfundener Kern-Schlüssel,
   fehlender `tpl_`-Präfix, fehlender Sektor-Teil — sind unberührt geblieben. */
test('[A491·Rot-Beleg] eine Art, die niemand abholt, fällt durch — der Raum bleibt geschlossen', () => {
  const r = pruefen({ [SEKTOR + '.' + FELD + '.erfundeneArt']: 'ZZ-Wert' });
  assert.deepEqual(r.verworfene.map((v) => v.grund), ['unbekannt'],
    'ein Modul, das eine unbekannte Art erklärt, muss es BENANNT zurückbekommen — '
    + 'sonst hört es „angenommen" und hat nichts bewirkt');
});

test('[A491·Rot-Beleg] auch eine Art, die es IM REGISTER gibt, aber am Feld niemand abholt', () => {
  // `hinweis` ist übersetzbar, aber über `dokument.<typ>.hinweis` — eine ANDERE Schlüsselform als
  // die des Knoten-Füllers (`<sektorId>.<feldId>.<art>`). An einem FELD bleibt er darum wirkungslos,
  // und genau das hält diese Probe fest.
  // Sie anzunehmen hiesse: durch jede Prüfung gegangen, nie erschienen.
  const r = pruefen({ [SEKTOR + '.' + FELD + '.hinweis']: 'ZZ-Hinweis' });
  assert.deepEqual(r.verworfene.map((v) => v.grund), ['unbekannt'],
    'eine Art aus dem Register, die am Feld niemand abholt, darf nicht durchkommen');
});

test('[A491·Rot-Beleg] ohne Sektor-Teil fällt die Kennung durch', () => {
  const r = pruefen({ [FELD + '.label']: 'ZZ-ohne-Sektor' });
  assert.deepEqual(r.verworfene.map((v) => v.kennung), [FELD + '.label']);
});

/* ── Die Kopplung, die im Kern nicht verdrahtet werden konnte ────────────── */

test('[A491] das `tpl_`-Präfix im Kennungs-Muster stimmt mit `_TEMPLATE_FELDID_PRAEFIX`', () => {
  /* Im Kern steht `tpl_` LITERAL im Muster: `_TEMPLATE_FELDID_PRAEFIX` entsteht
     rund 11 500 Zeilen weiter unten, und ein `const` in der temporalen Totzone
     wirft schon beim Lesen — der Kern lud nicht. Die Kopplung ist darum hier
     bewacht statt dort verdrahtet, und diese Probe ist der Grund, warum das
     zulässig ist. Ändert jemand das Präfix, wird sie rot. */
  const quelle = fs.readFileSync(KERN_DATEI, 'utf8');
  const praefix = /_TEMPLATE_FELDID_PRAEFIX\s*=\s*'([^']+)'/.exec(quelle);
  assert.ok(praefix, '`_TEMPLATE_FELDID_PRAEFIX` steht nicht mehr in der erwarteten Form');
  const muster = /const _MODULFELD_KENNUNG = \/\^\[a-z\]\[a-zA-Z0-9_-\]\*\\\.([a-z_]+)\[/.exec(quelle);
  assert.ok(muster, '`_MODULFELD_KENNUNG` steht nicht mehr in der erwarteten Form');
  assert.equal(muster[1], praefix[1],
    'das Muster prüft auf „' + muster[1] + '", das Präfix lautet „' + praefix[1] + '" — '
    + 'ab jetzt nimmt der Satz keine Modulfeld-Kennung mehr an, und niemand merkt es');
});

/* ── Die Auflösung am Feld ───────────────────────────────────────────────── */

test('[A491] die Übersetzung greift, und der Rückfall bleibt der Wert des Moduls', () => {
  /* Ein Textsatz ÜBERSETZT, er erfindet nicht: fehlt der Schlüssel, steht dort
     weiter `def.label` — kein leeres Feld und kein Platzhalter. */
  const { V } = ladeKern();
  const d = V.leeresDepot();
  // Die Definition liegt, wo ein heutiges Depot sie trägt (die Normalisierung zieht sie um); der Satz trägt die alte Kennung.
  d.feldDefinitionen = [{ sektorId: SEKTOR_HEUTE, feldId: FELD, typ: 'text', label: 'Fristensystem' }];
  V.setData(d);
  assert.equal(V._templateDefAlsFeld(d.feldDefinitionen[0]).label, 'Fristensystem',
    'ohne Satz gilt der Wert des Moduls');

  d.textsatzModule = [satzMit({ [SEKTOR + '.' + FELD + '.label']: 'ZZ-Fristensystem' })];
  d.textsprache = SPRACHE;
  V.setData(d);
  V._textsatzModuleAusDepotAnmelden(d);
  V.textsatzNeuAnwenden();
  assert.equal(V._templateDefAlsFeld(d.feldDefinitionen[0]).label, 'ZZ-Fristensystem',
    'mit Satz gilt die Übersetzung');
});

test('[A491] eine Definition ohne `sektorId` fällt auf ihren eigenen Wert zurück', () => {
  /* Ohne Sektor gibt es keinen Schlüssel. Sie darf deswegen nicht leer werden —
     eine Beschriftung, die verschwindet, wäre schlimmer als eine, die nicht
     übersetzt ist. */
  const { V } = ladeKern();
  const d = V.leeresDepot();
  V.setData(d);
  assert.equal(V._templateDefAlsFeld({ feldId: FELD, typ: 'text', label: 'Ohne Sektor' }).label,
    'Ohne Sektor');
});
