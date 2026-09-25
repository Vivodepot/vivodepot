'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   pvwiz/kiwiz — der UMSCHLAG (id/icon/ziel/abschluss) verlässt das WIZARDS-
   Array-Literal in eine eigene Ab-Werk-Region (Strang A, Schnitt-Vorbedingung,
   17.09.2026)
   ────────────────────────────────────────────────────────────────────────────
   ANLASS: `WIZARDS` trug bis zu diesem Zug als EINZIGES noch ein Array-Literal
   mit echtem Inhalt — die fünf reinen Wizards sind längst über das eingebettete
   Bündel migriert (U2-ADR-346), aber genau dieser Weg ist für pvwiz/kiwiz
   ausdrücklich verboten (`WIZARD_BUENDEL_VERBOTENE_IDS`): ihre `.schritte`
   entstehen aus `PV_BMJ.steps`/`KI_KORPUS.steps`, deren Array-IDENTITÄT über
   `.splice()` erhalten bleiben muss — ein JSON-Rundlauf (der Weg des Bündels)
   würde sie brechen (real getroffen, 06.09.2026, s. Kommentar an
   `WIZARD_BUENDEL_VERBOTENE_IDS`). Diese Probe hält die drei Bedingungen, unter
   denen der Umzug des UMSCHLAGS (nicht der Schritte-Herleitung, die bleibt
   Code) als abgeschlossen gilt:

   (1) POSITIVKONTROLLE — pvwiz/kiwiz stehen nach dem Umzug STRUKTURELL so da, wie die QUELLE es sagt: der Umschlag
       (id, icon, ziel, abschluss) ist genau der Eintrag der Moduldatei `dokumente`, und die Schritte sind aus
       `PV_BMJ.steps` bzw. `KI_KORPUS.steps` hergeleitet, keiner geht verloren. (Bis 21.09.2026 stand hier ein Vergleich
       gegen `git show HEAD:vivodepot.html`, „der Stand unmittelbar vor diesem Zug“. Das war ein wanderndes Maß: für jeden
       späteren Commit ist HEAD dessen Vorgänger, und ein Vorgänger-Kern, mit den heutigen Werkzeugen gebacken, kennt eine
       neue Region nicht, die das Rezept schon trägt — die Probe fiel bei jedem Commit, der ein Rezept oder eine Region
       ändert, ohne daß am Wizard etwas kaputt war. Umgekehrt, nicht gelöscht: dieselbe Aussage, jetzt gegen die Quelle statt
       gegen die Geschichte.)
   (2) ROTER BEWEIS — die neue Ab-Werk-Region geleert: die zwei Wizards
       verschwinden aus `WIZARDS`, sonst nichts. UND DIE GEGENRICHTUNG: der
       Bündel-Weg lehnt `wizards.pvwiz`/`wizards.kiwiz` weiterhin ab — der
       Riegel ist nicht aufgeweicht, nur um einen zweiten, unabhängigen Weg
       ergänzt (dieselbe Zusicherung wie in
       `tests/wizard-optionen-aus-materialisieren-u2-adr-341.test.js`, hier
       noch einmal direkt neben der Positivkontrolle gehalten, damit ein Leser
       nicht zwei Dateien braucht, um beide Hälften derselben Regel zu sehen).
   (3) DAS LITERAL FÄLLT ERSATZLOS — die `WIZARDS`-Deklaration selbst trägt
       kein einziges `id:`/`icon:`/`ziel:`-Feld mehr, das Abnahmekriterium für
       den Schnitt.

   STAND 21.09.2026: der Umschlag steht nicht mehr als Konstante im Gerüst, sondern in der Moduldatei `dokumente`
   (Schlüssel `korpusWizard`, tools/dokument-module/vivodepot-dokumente-de.json), die jedes Produkt im Rezept führt.
   Ein Gerüst ohne diese Datei hat keinen pvwiz und keinen kiwiz — der Zustand vor dem ersten Modul, den es beim
   Nutzer nicht gibt (ein Korpus wird nie ohne Türen ausgeliefert), keine Lücke.
   ════════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const REPO = path.join(__dirname, '..');
const KERN_PFAD = path.join(REPO, 'vivodepot.html');

function ladeVonPfad(pfad) {
  const zuvor = process.env.KERN_HTML_PATH;
  if (pfad) process.env.KERN_HTML_PATH = pfad; else delete process.env.KERN_HTML_PATH;
  delete require.cache[require.resolve('./load-kern.js')];
  const { V } = require('./load-kern.js').ladeKern();
  if (zuvor === undefined) delete process.env.KERN_HTML_PATH; else process.env.KERN_HTML_PATH = zuvor;
  return V;
}

test('[Korpus-Wizard·Ab-Werk] Positivkontrolle — pvwiz/kiwiz tragen genau den Umschlag der Moduldatei und die Schritte ihres Korpus', () => {
  const V = ladeVonPfad(null);   // der aktuelle Arbeitsbaum, gebacken
  const datei = JSON.parse(fs.readFileSync(path.join(REPO, 'tools', 'dokument-module', 'vivodepot-dokumente-de.json'), 'utf8'));

  assert.deepEqual(V.WIZARDS.map((w) => w.id).slice().sort(), ['anamwiz', 'gebwiz', 'heirwiz', 'kiwiz', 'pflwiz', 'pvwiz', 'umzwiz'],
    'dieselben sieben Wizard-IDs');

  for (const id of ['pvwiz', 'kiwiz']) {
    const soll = datei.korpusWizard.find((e) => e.id === id);
    assert.ok(soll, id + ': Vorbedingung — die Moduldatei führt den Umschlag');
    const n = JSON.parse(JSON.stringify(V.WIZARD_BY_ID[id]));
    for (const schluessel of Object.keys(soll)) {
      /* `abschluss.toast` ist Sprache, nicht Umschlag: der Kern füllt ihn aus dem Textsatz (`wizard:<id>.abschluss.toast`, Kommentar
         am Füller in vivodepot.html). Alles andere am Abschluss ist der Wert der Datei. */
      const ist = schluessel === 'abschluss' ? Object.fromEntries(Object.entries(n.abschluss || {}).filter(([k]) => k !== 'toast')) : n[schluessel];
      assert.deepEqual(ist, soll[schluessel], id + ': `' + schluessel + '` des materialisierten Wizards ist der Wert der Moduldatei, kein eigener des Kerns');
    }
    assert.equal(typeof n.abschluss.toast, 'string', id + ': der Abschluss-Zuruf ist gefüllt (Sprache, nicht Umschlag)');
    const korpus = id === 'pvwiz' ? V.PV_BMJ.steps : V.KI_KORPUS.steps;
    assert.ok(korpus.length > 0, id + ': Vorbedingung — der Korpus trägt Schritte');
    assert.ok(n.schritte.length >= korpus.length, id + ': jeder Schritt des Korpus ist im Wizard angekommen (' + n.schritte.length + ' Schritte aus ' + korpus.length + ' Korpus-Schritten)');
    if (id === 'kiwiz') assert.equal(n.schritte.length, korpus.length, 'kiwiz trägt genau die Schritte seines Korpus, keine eigenen');
  }
});

test('[Korpus-Wizard·Ab-Werk · Rot-Beweis] Umschlag aus der Moduldatei entfernt — pvwiz/kiwiz verschwinden, sonst nichts', () => {
  /* Gebacken VOR der Mutation: „sonst nichts" ist nur beweiskräftig, wenn die fünf bündel-migrierten Wizards
     überhaupt da sind, gegen die „nichts" gilt. Mutiert wird der gebackene Wert von AB_WERK_DOKUMENTE_DE:
     `korpusWizard` weg, `dokumente` (die Texte) bleibt. */
  const { _standardProduktBaken } = require('./load-kern.js');
  const original = _standardProduktBaken(fs.readFileSync(KERN_PFAD, 'utf8'));
  const BEGIN = '/* AB_WERK_DOKUMENTE_DE:BEGIN */';
  const ENDE = '/* AB_WERK_DOKUMENTE_DE:END */';
  const a = original.indexOf(BEGIN), e = original.indexOf(ENDE);
  assert.ok(a >= 0 && e > a, 'Marker AB_WERK_DOKUMENTE_DE nicht gefunden');
  const innen = original.slice(a + BEGIN.length, e).trim();
  const m = /^const AB_WERK_DOKUMENTE_DE = ([\s\S]*);$/.exec(innen);
  assert.ok(m, 'gebackener Wert nicht lesbar — die Region ist nicht gebacken');
  const wert = JSON.parse(m[1]);
  assert.deepEqual(wert.korpusWizard.map((w) => w.id), ['pvwiz', 'kiwiz'], 'Vorbedingung: der Umschlag steht in der Datei');
  delete wert.korpusWizard;
  const geleert = original.slice(0, a + BEGIN.length) + 'const AB_WERK_DOKUMENTE_DE = ' + JSON.stringify(wert) + ';' + original.slice(e);

  const tmp = path.join(os.tmpdir(), 'korpus-wizard-ab-werk-geleert-' + process.pid + '.html');
  fs.writeFileSync(tmp, geleert);
  try {
    const V = ladeVonPfad(tmp);
    assert.deepEqual(V.WIZARDS.map((w) => w.id).sort(), ['anamwiz', 'gebwiz', 'heirwiz', 'pflwiz', 'umzwiz'],
      'ohne den Umschlag bleiben genau die fünf bündel-migrierten Wizards — nicht mehr, nicht weniger');
    assert.equal(V.WIZARD_BY_ID.pvwiz, undefined);
    assert.equal(V.WIZARD_BY_ID.kiwiz, undefined);
  } finally {
    fs.unlinkSync(tmp);
  }
});

test('[Korpus-Wizard·Ab-Werk · Gegenrichtung] der Bündel-Weg lehnt wizards.pvwiz/wizards.kiwiz weiterhin ab — der Riegel ist nicht aufgeweicht', () => {
  const V = ladeVonPfad(null);
  assert.throws(
    () => V.buergermodulBuendelAnwenden({ wizards: { pvwiz: { schritte: [] } } }),
    /wizards. trägt „pvwiz"/,
    'derselbe Riegel wie vor dem Umzug — ein zweiter, unabhängiger Ab-Werk-Weg ist keine Lockerung des Bündel-Riegels',
  );
  assert.throws(
    () => V.buergermodulBuendelAnwenden({ wizards: { kiwiz: { schritte: [] } } }),
    /wizards. trägt „kiwiz"/,
  );
});

test('[Korpus-Wizard·Ab-Werk] der Umschlag steht nicht im Gerüst — kein id:/icon:/ziel: in der WIZARDS-Deklaration, keine Konstante', () => {
  const html = fs.readFileSync(KERN_PFAD, 'utf8');
  const start = html.indexOf('let WIZARDS = Object.freeze(');
  assert.ok(start >= 0, 'Anker "let WIZARDS = Object.freeze(" nicht gefunden');
  const ende = html.indexOf(';', start);
  const deklaration = html.slice(start, ende + 1);
  assert.doesNotMatch(deklaration, /id:\s*'/,
    'die WIZARDS-Deklaration selbst darf kein id:-Feld mehr tragen — das Schnitt-Abnahmekriterium');
  assert.ok(!html.includes('AB_WERK_KORPUS_WIZARD_QUELLEN'), 'die Umschlag-Konstante gibt es im Gerüst nicht mehr');
  const datei = JSON.parse(fs.readFileSync(path.join(REPO, 'tools', 'dokument-module', 'vivodepot-dokumente-de.json'), 'utf8'));
  assert.deepEqual(datei.korpusWizard.map((w) => w.id), ['pvwiz', 'kiwiz'], 'der Umschlag steht in der Moduldatei');
});

test('[Korpus-Wizard·Ab-Werk · Isolation] das Gerüst ohne Moduldatei hat keinen pvwiz und keinen kiwiz — das ist der Sollzustand, kein Fund', () => {
  /* Der Zustand vor dem ersten Modul gibt es beim Nutzer nicht: ein Korpus wird nie ohne Türen ausgeliefert
     (jedes Produkt-Rezept führt die Datei `dokumente`). Wer diesen Test rot sieht, hat dem Gerüst wieder
     Inhalt gegeben. */
  const V = ladeVonPfad(KERN_PFAD);
  assert.equal(V.WIZARD_BY_ID.pvwiz, undefined);
  assert.equal(V.WIZARD_BY_ID.kiwiz, undefined);
});

test('[Korpus-Wizard·Ab-Werk · Rot-Beweis] jedes der vier Produkte trägt den Umschlag — nicht nur „die Region ist nicht null"', () => {
  const { PRODUKTE, modulDateienFuer } = require('../tools/lib/vier-produkte.js');
  assert.equal(PRODUKTE.length, 4);
  for (const p of PRODUKTE) {
    const dateien = modulDateienFuer(p);
    const dokumente = dateien.filter((d) => /vivodepot-dokumente-de\.json$/.test(String(d)));
    assert.equal(dokumente.length, 1, p.slug + ': das Rezept führt die Moduldatei dokumente genau einmal');
  }
});

test('[Korpus-Wizard·Ab-Werk · Rechtsraum] ein Modul mit anderem Umschlag ergibt einen Wizard mit DIESEM Umschlag — der Kern hält keinen eigenen bereit', () => {
  /* Die Zusicherung hinter der Ablage neben `dokumente`: der Umschlag gehört zum Rechtsraum-Wortlaut, nicht zum
     Gerüst. Ein Modul für einen anderen Rechtsraum bringt seinen eigenen mit; das Produkt bekommt den seines
     Moduls, nicht den deutschen. Gemessen mit einem zweiten, künstlichen Umschlag im gebackenen Wert. */
  const { _standardProduktBaken } = require('./load-kern.js');
  const original = _standardProduktBaken(fs.readFileSync(KERN_PFAD, 'utf8'));
  const BEGIN = '/* AB_WERK_DOKUMENTE_DE:BEGIN */';
  const ENDE = '/* AB_WERK_DOKUMENTE_DE:END */';
  const a = original.indexOf(BEGIN), e = original.indexOf(ENDE);
  assert.ok(a >= 0 && e > a, 'Marker AB_WERK_DOKUMENTE_DE nicht gefunden');
  const m = /^const AB_WERK_DOKUMENTE_DE = ([\s\S]*);$/.exec(original.slice(a + BEGIN.length, e).trim());
  assert.ok(m, 'gebackener Wert nicht lesbar');
  const wert = JSON.parse(m[1]);
  const deutsch = wert.korpusWizard.find((w) => w.id === 'pvwiz');
  const anderer = { id: 'pvwiz', icon: 'shield', ziel: { sektor: 'advanceCare', liste: 'provisionInstruments', instrument: 'zz-anderer-typ' }, abschluss: { dokument: 'zz-anderer-typ' } };
  assert.notDeepEqual(anderer.ziel, deutsch.ziel, 'Vorbedingung: der künstliche Umschlag unterscheidet sich');
  wert.korpusWizard = wert.korpusWizard.map((w) => (w.id === 'pvwiz' ? anderer : w));
  const gebaut = original.slice(0, a + BEGIN.length) + 'const AB_WERK_DOKUMENTE_DE = ' + JSON.stringify(wert) + ';' + original.slice(e);

  const tmp = path.join(os.tmpdir(), 'korpus-wizard-ab-werk-anderer-' + process.pid + '.html');
  fs.writeFileSync(tmp, gebaut);
  try {
    const V = ladeVonPfad(tmp);
    const w = V.WIZARD_BY_ID.pvwiz;
    assert.equal(w.icon, 'shield');
    assert.equal(w.ziel.instrument, 'zz-anderer-typ');
    assert.equal(w.abschluss.dokument, 'zz-anderer-typ');
    assert.equal(V.WIZARD_BY_ID.kiwiz.ziel.instrument, 'ki-verfuegung', 'der unveränderte zweite Umschlag bleibt wie er ist');
  } finally {
    fs.unlinkSync(tmp);
  }
});
