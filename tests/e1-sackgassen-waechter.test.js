'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   E1 — die zwei maschinell feststellbaren Sackgassen-Kriterien, modellweit
   ────────────────────────────────────────────────────────────────────────────
   WOZU. E1 ist die Testerrunde: Menschen gehen Wege und melden Sackgassen.
   A31 hat die drei Sackgassen-Kriterien danach sortiert, was eine Maschine
   feststellen kann. Zwei kann sie — und was sie kann, soll sie tun, damit E1
   auf das schrumpft, was einen Menschen BRAUCHT.

     (1) kein Weg nach vorn              → hier, beide Hälften
     (2) eine falsche Aussage der App    → NICHT hier. Ausdrücklich.
     (3) Pflichtfeld nicht wahrheits-    → hier, plus die Grenze seines
         gemäß füllbar                     Griffbereichs

   ── WARUM (2) HIER FEHLT UND NICHT VERGESSEN WURDE ─────────────────────────
   „Die Anwendung sagt etwas Unwahres" ist nicht mechanisch feststellbar — wer
   es hier einbaute, führte eine Zusage, die kein Werkzeug hält. Der Teil, der
   maschinell geht, ist als 2a gebaut (`erklaerte-paare-abwesenheit.test.js`).
   Der Rest gehört der Testerrunde und bleibt dort.

   ── DIE PRÄMISSEN, VOR DEM BAU ERHOBEN ⟦M⟧ ─────────────────────────────────
   Nicht geraten und nicht aus einer Textsuche:

     Kriterium (1), Wizard-Hälfte   69 Schritte über 7 Wizards, in VIER
                                    Zielformen (A51/A49) · heute 0 Sackgassen
     Kriterium (1), Dialog-Hälfte   52 Dialoge · 18 davon ohne „Abbrechen"
                                    · heute 0 ohne Ausgang
     Kriterium (3)                  342 Feldträger (178 Felder · 95 Unterfelder
                                    · 69 Wizard-Schritte) · GENAU 2 Pflicht-
                                    felder, beide Unterfelder von
                                    `vorsorge_instrumente` · heute 0 unbeant-
                                    wortbar

   ── ZWEI ⟦M⟧-ZAHLEN, DIE BEIM MESSEN GEFALLEN SIND ─────────────────────────
   Beide waren rohe grep-Zähler, und beide zählten etwas anderes, als ihr Name
   sagt — dieselbe Klasse wie A31s „56", die den Wortstamm `pflicht` inklusive
   „Schweigepflicht" zählte:

     „primaerLabel 55×"   ist ein ZEILEN-Zähler. Vorkommen sind es 56, und
                          DIALOGE sind es 52 (49 direkte `ui.modal(`-Aufrufe
                          plus 3 über `_depotIdentitaetUndPasswortAbfragen`).
                          Die übrigen vier sind die Signatur, das Rendering
                          und zwei Lesezugriffe.

     „pflicht: true 3×"   in der Quelle — im MODELL sind es 2. Die dritte
                          Fundstelle steht in einem Kommentar, der sagt, dass
                          es sie nicht gibt.

   ── WARUM DER DIALOG-SCAN NICHT AUFZÄHLT, SONDERN ABLEITET ─────────────────
   Ein Scan, der `ui.modal(` sucht, übersieht jeden Wrapper — und einer
   existiert bereits (`_depotIdentitaetUndPasswortAbfragen`, 3 Aufrufstellen).
   Der zweite fiele niemandem auf. Darum greift der Scan am LITERAL: jedes
   Objekt, das `primaerLabel` zuweist, ist ein Dialog, gleich wer es bekommt.

   Und er prüft sich selbst auf Vollständigkeit: JEDE `ohneAbbrechen`-Zuweisung
   der Quelle muss in einem gefundenen Dialog-Literal liegen. Findet der Scan
   eine daneben, ist er blind geworden und wird ROT — statt still weniger zu
   prüfen. Das ist die Eigenschaft, die einen Text-Scan überhaupt tragfähig
   macht; ohne sie meldet er „nichts gefunden" und meint „nichts gesucht".

   ── ROTLAUF: GEFAHREN, NICHT BEHAUPTET ─────────────────────────────────────
   Alle vier Prüfungen sind heute grün. Ein Wächter, der nie an etwas Rotem
   vorbeikam, belegt nichts — darum je eine gepflanzte Verletzung in einer
   KOPIE der echten Quelle, geladen über `KERN_HTML_PATH` (das Produkt wird
   nicht berührt). Jede traf genau ihre eigene Prüfung, keine eine fremde:

     einem Dialog mit `ohneAbbrechen: true` das `onPrimaer` genommen
       → „kein Dialog sperrt die Nutzerin ein" ROT
     ein `gebwiz`-Ziel auf ein Situationsblatt, das es nicht gibt
       → „jeder Wizard-Schritt zielt auf einen Ort …" ROT
     die Optionsliste von `vorsorge_instrumente.art` geleert
       → „kein Pflichtfeld ohne eine einzige Antwortmöglichkeit" ROT,
         und die Meldung nennt das Feld beim Namen
     ein DRITTES Pflichtfeld mit fester Auswahl eingefügt
       → „der Griffbereich bleibt klein und benannt" ROT

   EIN LAUF BLIEB ZUERST GRÜN, und das gehört hierher: die erste Mutation für
   Kriterium (3) stellte dem Feld ein zweites `optionen: []` VORAN — in JS
   gewinnt der spätere Schlüssel, das Feld behielt seine fünf Optionen. Nicht
   der Wächter war blind, die Mutation war wirkungslos. Ein Rotlauf, der nur
   „ist rot geworden?" fragt und den grünen Fall nicht laut macht, hätte hier
   eine Lücke bescheinigt, die es nicht gibt — oder umgekehrt eine echte
   übersehen.
   ════════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { ladeKern } = require('./load-kern.js');
const { ohneWegNachVorn } = require('./wizard-zielraum.js');

/* DIESELBE Umlenkung wie `load-kern.js`. Nicht aus Ordnungsliebe: die
   Dialog-Hälfte liest die QUELLE, die Kriterium-(3)-Hälfte das MODELL. Läsen
   beide aus verschiedenen Dateien, prüfte ein Gate-Nachweis über
   `KERN_HTML_PATH` zwei verschiedene Stände und bewiese nichts. */
const HTML_PATH = process.env.KERN_HTML_PATH
  ? path.resolve(process.env.KERN_HTML_PATH)
  : path.join(__dirname, '..', 'vivodepot.html');
const QUELLE = fs.readFileSync(HTML_PATH, 'utf8');

async function kern() {
  const { V } = ladeKern();
  await V.depotAnlegen('e1-waechter-pw');
  V.akteurSelbstErklaeren('Tester');
  return V;
}

/* ── DER LITERAL-GREIFER ────────────────────────────────────────────────────
   Bilanziert Klammern und überspringt dabei Strings, Template-Literale sowie
   Zeilen- und Blockkommentare — sonst zählte eine `}` in einem Text mit.
   Nimmt die Quelle als ARGUMENT, damit die Positivkontrolle ihn gegen eine
   fingierte Quelle fahren kann. */
function literalUm(quelle, fundIdx) {
  let tiefe = 0, i = fundIdx;
  while (i > 0) {                                   // rückwärts zur öffnenden Klammer
    const c = quelle[i];
    if (c === '}') tiefe++;
    else if (c === '{') { if (tiefe === 0) break; tiefe--; }
    i--;
  }
  const von = i;
  tiefe = 0; i = von;
  while (i < quelle.length) {                       // vorwärts zur schließenden
    const c = quelle[i];
    if (c === '/' && quelle[i + 1] === '/') { i = quelle.indexOf('\n', i); if (i < 0) return null; continue; }
    if (c === '/' && quelle[i + 1] === '*') { i = quelle.indexOf('*/', i); if (i < 0) return null; i += 2; continue; }
    if (c === "'" || c === '"' || c === '`') {
      const q = c; i++;
      while (i < quelle.length && quelle[i] !== q) { if (quelle[i] === '\\') i++; i++; }
      i++; continue;
    }
    if (c === '{') tiefe++;
    else if (c === '}') { tiefe--; if (tiefe === 0) return { von, bis: i + 1, text: quelle.slice(von, i + 1) }; }
    i++;
  }
  return null;
}

/** Jedes Objekt-Literal der Quelle, das `primaerLabel` zuweist — ein Dialog. */
function dialogLiterale(quelle) {
  const raus = [];
  for (const m of quelle.matchAll(/primaerLabel\s*:/g)) {
    const lit = literalUm(quelle, m.index);
    if (lit && !raus.some((d) => d.von === lit.von)) raus.push(lit);
  }
  return raus;
}

const hatSchluessel = (text, name) => new RegExp('(^|[\\s{,])' + name + '\\s*:').test(text);
const zeileVon = (quelle, i) => quelle.slice(0, i).split('\n').length;

/* Ein Dialog ohne Ausgang: „Abbrechen" unterdrückt UND kein `onPrimaer`.
   Warum genau das die Sackgasse ist — aus dem Quelltext von `ui.modal`:
   „Abbrechen" ist der EINZIGE Schließ-Pfad neben dem Primär-Knopf (kein X,
   kein Backdrop, kein Escape). Fehlt `onPrimaer`, wirft der Klick auf den
   Primär-Knopf, wird gefangen, der Knopf wieder freigegeben — und der Dialog
   bleibt stehen. Beides zusammen: die Nutzerin kommt nicht mehr heraus. */
function dialogeOhneAusgang(quelle) {
  return dialogLiterale(quelle)
    .filter((d) => /ohneAbbrechen\s*:\s*true/.test(d.text) && !hatSchluessel(d.text, 'onPrimaer'))
    .map((d) => 'Zeile ' + zeileVon(quelle, d.von));
}

/* ── DIE FELDTRÄGER DES MODELLS ─────────────────────────────────────────────
   Sektorfelder samt Unterfeldern, Situationsfelder, Wizard-Schritt-Felder.
   Aus dem MODELL gesammelt, nicht aus der Quelle gegrept — genau der
   Unterschied, an dem A31s „56" gescheitert ist. */
function feldTraeger(V) {
  const raus = [];
  const nimm = (feld, ort, ebene) => {
    if (!feld || !feld.id) return;
    raus.push({ feld, ort, ebene, name: ort + '.' + feld.id });
    for (const uf of (feld.unterFelder || [])) nimm(uf, ort + '.' + feld.id, 'unterfeld');
  };
  for (const sek of Object.values(V.SEKTOR_BY_ID)) {
    for (const sektion of (sek.sektionen || [])) for (const f of (sektion.felder || [])) nimm(f, sek.id, 'feld');
  }
  for (const sit of Object.values(V.SITUATION_BY_ID)) {
    for (const f of (sit.felder || [])) nimm(f, 'situation:' + sit.id, 'situationsfeld');
  }
  for (const w of V.WIZARDS) {
    for (const [i, s] of (w.schritte || []).entries()) nimm(s.feld, 'wizard:' + w.id + '#' + i, 'wizardschritt');
  }
  return raus;
}

/* Die einzige maschinell ENTSCHEIDBARE Form von Kriterium (3): ein Pflichtfeld
   mit fester Auswahl, unter der nichts steht. Ob unter fünf ANGEBOTENEN
   Optionen die wahre fehlt, kann nur ein Mensch sagen — das bleibt E1. */
function pflichtOhneWahreOption(traeger) {
  return traeger
    .filter((x) => x.feld.pflicht && Array.isArray(x.feld.optionen) && x.feld.optionen.length === 0)
    .map((x) => x.name + ' [' + x.ebene + ']');
}

/* Der GRIFFBEREICH von Kriterium (3): jedes Pflichtfeld mit fester Auswahl.
   Benannt, weil genau diese Felder die Testerrunde beschäftigen können. */
function griffbereich(traeger) {
  return traeger
    .filter((x) => x.feld.pflicht && Array.isArray(x.feld.optionen))
    .map((x) => x.name)
    .sort();
}

const GRIFFBEREICH_ERWARTET = Object.freeze([
  'advanceCare.provisionInstruments.instrument',
  'advanceCare.provisionInstruments.typeOfPowerOfAttorney',
]);

/* ══════════════════════════════════════════════════════════════════════════
   PFLICHTEINGANG (Regel 13) — ein leerer Suchraum ist grün und belegt nichts
   ══════════════════════════════════════════════════════════════════════════ */
test('[E1·Vorprüfung] die drei Suchräume sind nichtleer', async () => {
  const V = await kern();
  assert.ok((V.WIZARDS || []).length >= 5,
    'Nur ' + (V.WIZARDS || []).length + ' Wizards — Kriterium (1) prüfte fast nichts.');

  const traeger = feldTraeger(V);
  assert.ok(traeger.length >= 300,
    'Nur ' + traeger.length + ' Feldträger gefunden (erhoben waren 342). Der Sammler erreicht das '
    + 'Modell nicht mehr — Kriterium (3) liefe über einen Bruchteil und wäre grün, weil es nicht '
    + 'hinsieht.');

  const dialoge = dialogLiterale(QUELLE);
  assert.ok(dialoge.length >= 40,
    'Nur ' + dialoge.length + ' Dialog-Literale gefunden (erhoben waren 52). Der Greifer hat den '
    + 'Anschluss an die Quelle verloren.');
});

/* ══════════════════════════════════════════════════════════════════════════
   KRITERIUM (1) — kein Weg nach vorn
   ══════════════════════════════════════════════════════════════════════════ */
test('[E1·(1)] jeder Wizard-Schritt zielt auf einen Ort, den das Modell kennt', async () => {
  const V = await kern();
  const befunde = [];
  for (const w of V.WIZARDS) {
    for (const zeile of ohneWegNachVorn(V, w)) befunde.push('`' + w.id + '` ' + zeile);
  }
  assert.equal(befunde.join('\n'), '',
    'Diese Schritte führen die Bürgerin ins Leere — die Eingabe hätte keinen Ort:\n'
    + befunde.join('\n')
    + '\nDrei der vier Schreib-Zweige sind NACHSICHTIG: `sektorFeldSetzen`, `situationFeldSetzen` '
    + 'und `_listeOder` legen einen unbekannten Ort wortlos an. Der Wert stünde danach im Depot '
    + 'und in keiner Sicht.');
});

/* „Register-Reste", Zug 4 (12./13.08.2026) — der fehlende Gate-Nachweis der
   Wizard-Hälfte von Kriterium (1). Stand vom 31.07.2026 (`Standing_Hinweise_Rueckstellungen.md`):
   „Auf Anweisung nur bestätigt, nicht gebaut." Der Kopf-Kommentar dieser Datei (Zeile 69-70)
   dokumentiert eine EINMALIGE, manuelle Rücknahme desselben Rotlaufs — das ist kein Ersatz für
   einen wiederholbaren Test. Vier Zielformen (ZIELFORMEN, `wizard-zielraum.js`), je eine gepflanzte
   Sackgasse — derselbe Diskriminant wie die echte Prüfung oben, gegen synthetische Wizard-Defs statt
   gegen `V.WIZARDS`, damit nichts an einer heute zufällig fehlenden Kombination vorbeiläuft. */
test('[E1] Gate-Nachweis: der Wizard-Erkenner findet eine Sackgasse in jeder der vier Zielformen', async () => {
  const V = await kern();
  const schritt = (ziel) => ({ frage: 'Testfrage', ziel });

  const SACKGASSEN = [
    ['sektor', { sektor: 'kein-solcher-sektor' }],
    ['situation', { situation: 'kein-solches-situationsblatt' }],
    ['instrument+liste+sektor', { sektor: 'advanceCare', liste: 'keine-solche-liste', instrument: 'x' }],
    ['liste+sektor+unterfeld', { sektor: 'advanceCare', liste: 'provisionInstruments', unterfeld: 'kein-solches-unterfeld' }],
  ];
  for (const [form, ziel] of SACKGASSEN) {
    const def = { id: 'gepflanzt', schritte: [schritt(ziel)] };
    const funde = ohneWegNachVorn(V, def);
    assert.equal(funde.length, 1,
      'Zielform ' + form + ': eine gepflanzte Sackgasse wurde NICHT gefunden — die echte Prüfung '
      + 'oben würde denselben blinden Fleck tragen.');
  }

  /* Gegenprobe: dieselben vier Formen, aber auf einen ECHTEN Ort gezielt — dürfen NICHT anschlagen.
     Ein Erkenner, der auch Gesundes meldet, macht die Prüfung unbrauchbar, nicht strenger. */
  const HEIL = [
    ['sektor', { sektor: 'identity' }],
    ['situation', { situation: (V.SITUATIONEN[0] || {}).id }],
    ['instrument+liste+sektor', { sektor: 'advanceCare', liste: 'provisionInstruments', instrument: 'will' }],
    ['liste+sektor+unterfeld', { sektor: 'advanceCare', liste: 'provisionInstruments', unterfeld: 'storageLocation' }],
  ];
  for (const [form, ziel] of HEIL) {
    const def = { id: 'heil', schritte: [schritt(ziel)] };
    assert.equal(ohneWegNachVorn(V, def).length, 0,
      'Zielform ' + form + ': ein echter Ort wurde fälschlich als Sackgasse gemeldet.');
  }
});

test('[E1·(1)] kein Dialog sperrt die Nutzerin ein', () => {
  const ohne = dialogeOhneAusgang(QUELLE);
  assert.equal(ohne.join('\n'), '',
    'Diese Dialoge unterdrücken „Abbrechen" UND haben kein `onPrimaer` — die Nutzerin kommt aus '
    + 'ihnen nicht heraus:\n' + ohne.join('\n'));
});

test('[E1·(1)] der Dialog-Scan ist vollständig — keine Zuweisung liegt außerhalb', () => {
  const literale = dialogLiterale(QUELLE);
  const daneben = [];
  for (const m of QUELLE.matchAll(/ohneAbbrechen\s*:/g)) {
    if (!literale.some((d) => m.index >= d.von && m.index < d.bis)) {
      daneben.push('Zeile ' + zeileVon(QUELLE, m.index));
    }
  }
  assert.equal(daneben.join('\n'), '',
    'Eine `ohneAbbrechen`-Zuweisung liegt in KEINEM gefundenen Dialog-Literal:\n' + daneben.join('\n')
    + '\nDann greift der Scan nicht mehr überall, wo Dialoge entstehen — und sein „nichts gefunden" '
    + 'hieße „nicht gesucht". Entweder ist ein neuer Weg entstanden, Dialoge zu bauen, oder der '
    + 'Greifer kommt mit der Schreibweise nicht zurecht. Beides gehört angesehen, nicht übergangen.');
});

/* ══════════════════════════════════════════════════════════════════════════
   KRITERIUM (3) — Pflichtfeld nicht wahrheitsgemäß füllbar
   ══════════════════════════════════════════════════════════════════════════ */
test('[E1·(3)] kein Pflichtfeld ohne eine einzige Antwortmöglichkeit', async () => {
  const V = await kern();
  const eng = pflichtOhneWahreOption(feldTraeger(V));
  assert.equal(eng.join('\n'), '',
    'Diese Pflichtfelder bieten keine einzige Option an — die Bürgerin käme ohne eine unwahre '
    + 'Angabe nicht weiter, und auch mit keiner:\n' + eng.join('\n'));
});

test('[E1·(3)] der Griffbereich bleibt klein und benannt', async () => {
  const V = await kern();
  const ist = griffbereich(feldTraeger(V));
  assert.deepEqual(ist, [...GRIFFBEREICH_ERWARTET],
    'Die Menge der Pflichtfelder mit FESTER Auswahl hat sich geändert.\n'
    + '  erwartet: ' + GRIFFBEREICH_ERWARTET.join(', ') + '\n'
    + '  ist     : ' + (ist.join(', ') || '—') + '\n'
    + 'Das ist kein Defekt, sondern eine Zuschnitts-Frage: nur bei DIESEN Feldern kann Kriterium '
    + '(3) überhaupt greifen, und nur sie muss die Testerrunde daraufhin ansehen („trifft unter '
    + 'den angebotenen Antworten eine zu?"). Kommt eines dazu, wächst E1 — das gehört gesehen und '
    + 'hier bewusst eingetragen, nicht stillschweigend geerbt.');
});

/* ══════════════════════════════════════════════════════════════════════════
   POSITIVKONTROLLE — jeder Erkenner an einer gepflanzten Verletzung
   ──────────────────────────────────────────────────────────────────────────
   Alle vier Prüfungen oben sind heute grün und keine ist je an etwas Rotem
   vorbeigekommen. Erfundene Quellen und erfundene Feldträger, ausdrücklich
   als Wächter-Prüfung gekennzeichnet (Regel 13, zweite Hälfte).
   ══════════════════════════════════════════════════════════════════════════ */
test('[E1] Gate-Nachweis: der Dialog-Erkenner findet die Sackgasse — und nur sie', () => {
  const SACKGASSE = `
    ui.modal({ titel: 'x', koerperHTML: k, primaerLabel: 'Weiter', ohneAbbrechen: true });
  `;
  assert.equal(dialogeOhneAusgang(SACKGASSE).length, 1,
    'Ein Dialog ohne „Abbrechen" UND ohne `onPrimaer` wurde NICHT gefunden. Dann belegt das Grün '
    + 'über der echten Quelle nichts.');

  const HEIL = [
    ['mit onPrimaer', "ui.modal({ titel: 'x', primaerLabel: 'Weiter', onPrimaer: (s) => s(), ohneAbbrechen: true });"],
    ['mit Abbrechen', "ui.modal({ titel: 'x', primaerLabel: 'Weiter' });"],
    ['ohneAbbrechen: false', "ui.modal({ titel: 'x', primaerLabel: 'W', ohneAbbrechen: false });"],
  ];
  for (const [name, q] of HEIL) {
    assert.equal(dialogeOhneAusgang(q).join(''), '',
      'Der Erkenner meldet einen Dialog MIT Ausgang (' + name + '). Ein Erkenner, der Gesundes '
      + 'meldet, macht die Prüfung unbrauchbar, nicht strenger.');
  }

  /* Der Greifer darf sich an einer `}` in einem Text nicht verzählen — genau
     daran scheitern Klammer-Bilanzen zuerst. */
  const MIT_KLAMMER_IM_TEXT = `
    ui.modal({ titel: 'ein } im Text', koerperHTML: '</div>}', primaerLabel: 'W', ohneAbbrechen: true });
  `;
  assert.equal(dialogeOhneAusgang(MIT_KLAMMER_IM_TEXT).length, 1,
    'Eine geschweifte Klammer IN EINEM STRING hat den Greifer aus dem Tritt gebracht. Dann ist '
    + 'jede Aussage über die echte Quelle Zufall.');
});

test('[E1] Gate-Nachweis: die Vollständigkeitsprobe schlägt an, wenn der Scan blind wird', () => {
  /* Eine `ohneAbbrechen`-Zuweisung in einem Objekt, das KEIN `primaerLabel`
     führt — der Greifer findet dieses Literal nicht, und genau das muss die
     Probe melden. */
  const BLIND = "const opts = { titel: 'x', ohneAbbrechen: true };";
  const literale = dialogLiterale(BLIND);
  const daneben = [...BLIND.matchAll(/ohneAbbrechen\s*:/g)]
    .filter((m) => !literale.some((d) => m.index >= d.von && m.index < d.bis));
  assert.equal(daneben.length, 1,
    'Die Vollständigkeitsprobe hat eine `ohneAbbrechen`-Zuweisung außerhalb jedes gefundenen '
    + 'Dialog-Literals NICHT bemerkt. Dann kann der Scan blind werden, ohne dass es auffällt — '
    + 'und sein Schweigen belegte nichts.');
});

test('[E1] Gate-Nachweis: die zwei Kriterium-(3)-Erkenner werden an gepflanzten Feldern ROT', () => {
  const GEPFLANZT = [
    { ort: 'fingiert', ebene: 'feld', name: 'fingiert.leer',
      feld: { id: 'leer', pflicht: true, typ: 'auswahl', optionen: [] } },
    { ort: 'fingiert', ebene: 'feld', name: 'fingiert.gefuellt',
      feld: { id: 'gefuellt', pflicht: true, typ: 'auswahl', optionen: [{ wert: 'a' }] } },
    { ort: 'fingiert', ebene: 'feld', name: 'fingiert.frei',
      feld: { id: 'frei', pflicht: true, typ: 'text' } },
    { ort: 'fingiert', ebene: 'feld', name: 'fingiert.kuer',
      feld: { id: 'kuer', typ: 'auswahl', optionen: [] } },
  ];

  assert.deepEqual(pflichtOhneWahreOption(GEPFLANZT), ['fingiert.leer [feld]'],
    'Der Erkenner für Kriterium (3) trifft nicht genau: das Pflichtfeld mit LEERER Auswahl muss '
    + 'er melden — ein Pflichtfeld MIT Optionen, ein freies Pflichtfeld (jederzeit wahr füllbar) '
    + 'und ein Kür-Feld dürfen ihn nicht auslösen.');

  assert.deepEqual(griffbereich(GEPFLANZT), ['fingiert.gefuellt', 'fingiert.leer'],
    'Der Griffbereich zählt die falschen Felder: hinein gehören genau die Pflichtfelder mit '
    + 'FESTER Auswahl — ein freies Pflichtfeld kann die Falle nie stellen, ein Kür-Feld auch nicht.');
});

test('[E1] Gate-Nachweis: der Feldträger-Sammler erreicht alle vier Ebenen', async () => {
  const V = await kern();
  const traeger = feldTraeger(V);
  for (const ebene of ['feld', 'unterfeld', 'wizardschritt']) {
    assert.ok(traeger.some((x) => x.ebene === ebene),
      'Der Sammler findet auf der Ebene `' + ebene + '` nichts. Kriterium (3) prüfte dort nicht — '
      + 'und die zwei einzigen Pflichtfelder des Modells liegen genau auf der Ebene `unterfeld`. '
      + 'Ein Sammler, der sie verfehlt, ist grün, weil er wegsieht.');
  }
});
