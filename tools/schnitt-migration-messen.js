#!/usr/bin/env node
'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   Trägt EINE Migration alle fünf Glieder des Schnitts — oder zerfällt sie?
   ────────────────────────────────────────────────────────────────────────────
   Laufzettel „Die Vierunddreißig" (22.08.2026), Strang 1 Posten 1.0:
   *„ZUERST messen, nicht bauen. Eine Messung, keine Entscheidung — aber sie
   gehört vor den ersten Griff."*

   ── WAS EINE MIGRATIONSSTUFE IM KERN IST, gemessen und nicht angenommen ────
   Ein Block in `_depotMigrieren` mit einem Bump `schemaVersion < N → N`. Der
   Bestand liegt bei 73. Mehrere Änderungen dürfen in EINEN Block, solange ihre
   Reihenfolge darin fest schreibbar ist.

   ── DAS KRITERIUM, ausgeschrieben, damit die Antwort nachprüfbar ist ───────
   Die fünf Glieder tragen EINE Stufe, wenn der Abhängigkeitsgraph zwischen
   ihnen ZYKLENFREI ist. Eine Kante A→B entsteht, wenn B eine Stelle LIEST, die
   A SCHREIBT — dann muss A vorher laufen. Ein Zyklus hiesse: zwei Glieder müssen
   jeweils vor dem anderen laufen, und das geht in einem Block nicht.

   AUCH EIN ADDITIVES GLIED KANN EINE KANTE ERZEUGEN. Es braucht selbst keine
   Stufe, aber wer seine neue Stelle liest, muss nach ihm laufen.

   ZERFALL IST NICHT DASSELBE WIE „MEHRERE ÄNDERUNGEN". Fünf unabhängige
   Umformungen in einem Block sind eine Stufe. Erst der Zyklus zwingt zur
   zweiten.

   ── WAS DIESES WERKZEUG NICHT TUT ──────────────────────────────────────────
   Es entscheidet nicht, WIE viele Stufen genommen werden. Es misst, ob eine
   möglich ist. Der Laufzettel sagt für den Ausgang: trägt eine Stufe alles,
   wird zusammengelegt und weitergearbeitet; zerfällt sie, wird gemeldet und
   angehalten — „denn dann ist die Zahl der Stufen eine Entscheidung und keine
   Messung mehr".

   ── DIE STELLEN SIND ERKLÄRT UND WERDEN GEPRÜFT ────────────────────────────
   Welche Stelle zu welchem Glied gehört, ist Auslegung und steht darum als
   benannte Konstante mit Herkunft. WAS NICHT Auslegung ist: ob es die Stelle
   im Kern überhaupt gibt. Jede genannte Stelle wird gegen `vivodepot.html`
   gehalten; eine, die dort fehlt, ist ein BEFUND (die Liste ist veraltet) und
   keine stille Null.

   Aufruf:
     node tools/schnitt-migration-messen.js
     node tools/schnitt-migration-messen.js --kern <pfad> --json
   ════════════════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const path = require('node:path');

const KERN = path.join(__dirname, '..', 'vivodepot.html');

/* ART EINER ÄNDERUNG — der Unterschied, an dem die ganze Frage hängt.
     additiv    ein Schlüssel kommt DAZU; Bestandswerte bleiben, wie sie sind.
                Braucht keine Stufe, nur ein Grundgerüst-Feld.
     umformend  ein vorhandener Wert ändert seine FORM. Braucht eine Stufe,
                weil Bestandsdateien sonst die alte Form weitertragen. */
const ADDITIV = 'additiv';
const UMFORMEND = 'umformend';

/* DIE FÜNF GLIEDER des Schnitts, wörtlich aus Posten 1.0 des Laufzettels.
   `stellen` sind gespeicherte Depot-Stellen; `pruefAnker` ist die Zeichenfolge,
   an der sich im Kern belegen lässt, dass es die Stelle gibt. */
const GLIEDER = Object.freeze([
  {
    nr: 1, kennung: 'A445', name: 'Gültigkeitsbeginn',
    art: ADDITIV,
    schreibt: ['dokumente[].gueltigAb'],
    liest: [],
    pruefAnker: ['gueltigAb'],
    grund: 'ein NEUER Schlüssel neben `gueltigBis`/`ablaufDatum`. Kein Bestandswert ändert '
      + 'seine Form; ein Dokument ohne `gueltigAb` ist eines, für das niemand einen Beginn '
      + 'eingetragen hat. Zug 1 ist gebaut.',
  },
  {
    nr: 2, kennung: 'A286', name: 'Bereichsschicht',
    art: ADDITIV,
    schreibt: ['bereichsModule[]'],
    liest: [],
    pruefAnker: ['bereichsModule'],
    grund: 'ein eigenes Register neben den eingebauten Bereichen, wie die vier anderen '
      + 'Einlass-Register. Die gespeicherten Sektor-Werte behalten ihre Schlüssel — ein '
      + 'angedockter Bereich kommt HINZU, er benennt keinen bestehenden um.',
  },
  {
    nr: 3, kennung: 'A448', name: 'die zwanzig Nummern-Felder mehrwertig',
    art: UMFORMEND,
    schreibt: ['sektoren[bereich][feldId]'],
    liest: ['sektoren[bereich][feldId]'],
    pruefAnker: ['aufenthaltstitel_nr', 'ausweis_gueltig'],
    grund: 'ein Wert, der heute ein STRING ist, wird eine Liste — Korb 1 der Erhebung, '
      + '20 Kennungen (`tools/nationale-kennungen-erheben.js`). Das ist die einzige echte '
      + 'Umformung von Bürgerdaten im Schnitt: ohne Stufe trüge eine Bestandsdatei die alte '
      + 'Form weiter, und der Leser fände einen String, wo er eine Liste erwartet.',
  },
  {
    nr: 4, kennung: 'A469', name: 'der Rechtsraum im Textsatz-Schlüssel',
    art: UMFORMEND,
    schreibt: ['textsprache', 'textsatzModule[].sprache'],
    liest: ['textsprache', 'textsatzModule[].sprache'],
    pruefAnker: ['textsprache', '_TEXTSATZ_MODUL_REGISTRY'],
    grund: 'der Registry-Schlüssel ist heute die Sprache allein — Ecuador und Spanien teilen '
      + '`es`, und der zuletzt angemeldete Satz gewinnt samt Währungsregel. Ein Depot mit '
      + 'angedocktem Satz trägt die Sprache GESPEICHERT (`data.textsprache`, '
      + '`textsatzModule[].sprache`); wird der Schlüssel zweiteilig, ändert der Bestandswert '
      + 'seine Form.',
  },
  /* GLIED 5 IST ZWEITEILIG, und das ist kein Zuschnitt, sondern ein Befund.
     Gemessen am 22.08.: WEDER `docs/template-generator/field-model-schema.json`
     NOCH `submission-schema.json` kennt das Wort „sprache" — null Vorkommen.
     Von den fünf Beispielbündeln trägt allein der TEXTSATZ eine Sprache; Bereich,
     Format, Institutions-Art und Feldmodell tragen Beschriftungen ohne jede
     Angabe, in welcher Sprache sie stehen.

     WAS DAS FÜR DIE MIGRATION HEISST: eine Stufe, die `label: "Lagerort"` in
     Sprachvarianten überführt, weiss nicht, unter welcher Sprache sie den
     Bestandswert ablegen soll. Sie kann ihn NICHT aus `data.textsprache` nehmen
     — das ist die Sprache der Bürgerin, das Label gehört dem Anbieter.

     Darum steht die Herkunftssprache als eigenes Glied VOR der Umformung. Sie
     ist additiv (eine neue Angabe am Modul), und sie ist die einzige Kante in
     diesem Graphen. */
  {
    nr: 5, kennung: '1.4a', name: 'die Herkunftssprache am Modul',
    art: ADDITIV,
    schreibt: ['feldDefinitionen[].sprache'],
    liest: [],
    pruefAnker: ['feldDefinitionen'],
    grund: 'eine NEUE Angabe: in welcher Sprache stehen die Beschriftungen, die dieses Modul '
      + 'mitbringt. Heute steht sie nirgends — gemessen: null Vorkommen von „sprache" in '
      + 'beiden Schemata, und von fünf Beispielbündeln trägt nur der Textsatz eine.',
  },
  {
    nr: 6, kennung: 'A491/1.4b', name: 'Modul-Beschriftungen je Sprache',
    art: UMFORMEND,
    schreibt: ['feldDefinitionen[].label'],
    liest: ['feldDefinitionen[].label', 'feldDefinitionen[].sprache'],
    pruefAnker: ['feldDefinitionen', '_templateDefAlsFeld'],
    grund: 'das Einreich-Schema führt `label` als einfachen String, und die Definition liegt '
      + 'GESPEICHERT im Depot (`data.feldDefinitionen[]`). Bekommt `label` Sprachvarianten, '
      + 'ändert ein Bestandswert seine Form — und die Stufe braucht dafür die Herkunftssprache '
      + 'aus 1.4a. **Der Leseweg steht bereits** (A491, 22.08.): `_templateDefAlsFeld` löst '
      + 'über `textLesen` auf. Dieser Zug war rein additiv und hat KEINE Stufe verbraucht.',
  },
  /* DASSELBE NOCH EINMAL, eine Ebene höher: der angedockte BEREICH (Posten 1.1b).
     `bereichsModule[].label` steht ebenso ohne Sprachangabe da. Es ist dieselbe
     Mechanik und dieselbe Kante — darum ein eigenes Glied und keine Fussnote. */
  {
    nr: 7, kennung: '1.1b', name: 'der angedockte Bereich schaltet mit',
    art: UMFORMEND,
    schreibt: ['bereichsModule[].label'],
    liest: ['bereichsModule[].label', 'bereichsModule[].sprache'],
    pruefAnker: ['bereichsModule'],
    grund: 'eine Rubrik ist eine Beschriftung. Bringt ein Bündel eine eigene Rubrik mit, muss '
      + 'ihr Name in der aktiven Sprache erscheinen — sonst steht eine deutsche Rubrik über '
      + 'fremdsprachigen Feldern. Auch hier fehlt die Herkunftssprache.',
  },
  /* NACHGETRAGEN 22.08. mit Posten 1.1c: der Voll-Export gibt BEIDES mit — den
     rohen Namen (er ist der Schlüssel) und daneben die übersetzte Beschriftung
     samt Sprache und Zeitpunkt. Er steht hier, weil die Messung sonst
     unvollständig wäre; er ändert die Antwort NICHT, denn er ist additiv:
     ein alter Leser überspringt den neuen Schlüssel. */
  {
    nr: 9, kennung: '1.1c', name: 'der Voll-Export gibt beides mit',
    art: ADDITIV,
    schreibt: ['export.feldBeschriftung'],
    liest: [],
    pruefAnker: ['vollExportJSON'],
    grund: 'ein NEUER Schlüssel in der Ausgabe neben dem rohen Namen. Gemessene Kosten: '
      + 'Beschriftungen sind im Median 14 Zeichen lang, die längste 80 — ein Depot mit fünfzig '
      + 'angedockten Feldern wächst um rund zwei Kilobyte. Kein Bestandswert ändert seine Form, '
      + 'und eine Sicherungsdatei bleibt vergleichbar, weil der rohe Name bleibt.',
  },
  {
    nr: 8, kennung: '1.1b-a', name: 'die Herkunftssprache am Bereichsmodul',
    art: ADDITIV,
    schreibt: ['bereichsModule[].sprache'],
    liest: [],
    pruefAnker: ['bereichsModule'],
    grund: 'wie 1.4a, andere Stelle. Gemessen: das Beispielbündel BEREICH trägt eine '
      + 'Beschriftung und keine Sprache.',
  },
]);

/* ── Die Messung ──────────────────────────────────────────────────────────── */

function ankerPruefen(quelle, glieder = GLIEDER) {
  const fehlend = [];
  const gefunden = [];
  for (const g of glieder) {
    for (const a of g.pruefAnker) {
      const n = quelle.split(a).length - 1;
      if (n === 0) fehlend.push({ glied: g.nr, anker: a });
      else gefunden.push({ glied: g.nr, anker: a, vorkommen: n });
    }
  }
  return { fehlend, gefunden };
}

/* Eine Kante A→B: B liest eine Stelle, die A SCHREIBT. Ein Glied hängt nicht von
   sich selbst ab — `liest` und `schreibt` desselben Gliedes sind dieselbe
   Umformung, kein Zwang zu einer zweiten Stufe.

   KORRIGIERT AM 22.08.2026, noch vor der ersten Ablieferung: der erste Entwurf
   zählte nur Kanten von UMFORMENDEN Gliedern und meldete darum „keine Kanten",
   obwohl Glied 6 die Angabe liest, die Glied 5 erst anlegt. **Auch ein additives
   Glied erzwingt eine Reihenfolge**, wenn ein anderes seine neue Stelle braucht —
   eine Stufe, die das Label umformt, bevor die Herkunftssprache existiert, liest
   `undefined`. Das Modell war falsch, nicht die Zahl. */
function kantenBauen(glieder = GLIEDER) {
  const kanten = [];
  for (const a of glieder) {
    for (const b of glieder) {
      if (b.nr === a.nr) continue;
      const gemeinsam = b.liest.filter((s) => a.schreibt.includes(s));
      if (gemeinsam.length) kanten.push({ von: a.nr, nach: b.nr, ueber: gemeinsam });
    }
  }
  return kanten;
}

/* Zyklensuche über die Kanten. Ohne Zyklus gibt es eine Reihenfolge, in der ein
   einziger Block alle Glieder trägt. */
function zyklenSuchen(glieder, kanten) {
  const nachfolger = new Map(glieder.map((g) => [g.nr, []]));
  for (const k of kanten) nachfolger.get(k.von).push(k.nach);
  const zyklen = [];
  const weiss = new Set(glieder.map((g) => g.nr));
  const grau = new Set();
  const pfad = [];
  function gehe(n) {
    weiss.delete(n); grau.add(n); pfad.push(n);
    for (const m of nachfolger.get(n) || []) {
      if (grau.has(m)) zyklen.push([...pfad.slice(pfad.indexOf(m)), m]);
      else if (weiss.has(m)) gehe(m);
    }
    grau.delete(n); pfad.pop();
  }
  for (const g of glieder) if (weiss.has(g.nr)) gehe(g.nr);
  return zyklen;
}

/* Topologische Reihenfolge — die Antwort auf „und in welcher Folge dann?".
   Ohne Kanten ist jede Reihenfolge zulässig; das Werkzeug nennt trotzdem eine,
   damit im Bericht keine erfunden werden muss. */
function reihenfolge(glieder, kanten) {
  const eingang = new Map(glieder.map((g) => [g.nr, 0]));
  for (const k of kanten) eingang.set(k.nach, eingang.get(k.nach) + 1);
  const bereit = glieder.filter((g) => eingang.get(g.nr) === 0).map((g) => g.nr).sort((a, b) => a - b);
  const raus = [];
  while (bereit.length) {
    const n = bereit.shift();
    raus.push(n);
    for (const k of kanten.filter((x) => x.von === n)) {
      eingang.set(k.nach, eingang.get(k.nach) - 1);
      if (eingang.get(k.nach) === 0) { bereit.push(k.nach); bereit.sort((a, b) => a - b); }
    }
  }
  return raus.length === glieder.length ? raus : null;
}

function messen(quelle, glieder = GLIEDER) {
  const anker = ankerPruefen(quelle, glieder);
  const kanten = kantenBauen(glieder);
  const zyklen = zyklenSuchen(glieder, kanten);
  const folge = reihenfolge(glieder, kanten);
  const umformend = glieder.filter((g) => g.art === UMFORMEND);
  return {
    glieder: glieder.map((g) => ({ nr: g.nr, kennung: g.kennung, name: g.name, art: g.art })),
    umformend: umformend.map((g) => g.nr),
    additiv: glieder.filter((g) => g.art === ADDITIV).map((g) => g.nr),
    kanten,
    zyklen,
    reihenfolge: folge,
    ankerFehlend: anker.fehlend,
    ankerGefunden: anker.gefunden,
    /* DIE ANTWORT. Sie hängt an zwei Dingen, und beide sind gemessen: kein
       Zyklus, und keine genannte Stelle fehlt im Kern. Fehlt eine, ist die
       Liste veraltet und die Antwort trägt nicht. */
    eineStufeTraegt: zyklen.length === 0 && anker.fehlend.length === 0,
  };
}

module.exports = { GLIEDER, ADDITIV, UMFORMEND, messen, kantenBauen, zyklenSuchen, reihenfolge, ankerPruefen };

/* ── CLI ──────────────────────────────────────────────────────────────────── */
if (require.main === module) {
  const argv = process.argv.slice(2);
  const arg = (n) => { const i = argv.indexOf('--' + n); return i >= 0 && argv[i + 1] ? argv[i + 1] : null; };
  const datei = arg('kern') ? path.resolve(arg('kern')) : KERN;
  const r = messen(fs.readFileSync(datei, 'utf8'));

  if (argv.includes('--json')) { console.log(JSON.stringify({ datei, ...r }, null, 2)); process.exit(0); }

  console.log('Trägt EINE Migration alle fünf Glieder? — ' + datei + '\n');
  for (const g of GLIEDER) {
    console.log('Glied ' + g.nr + ' · ' + g.kennung + ' · ' + g.name);
    console.log('   Art        : ' + g.art.toUpperCase());
    console.log('   schreibt   : ' + (g.schreibt.join(' · ') || '—'));
    console.log('   liest      : ' + (g.liest.join(' · ') || '—'));
    console.log('   Grund      : ' + g.grund.replace(/\s+/g, ' ').slice(0, 300));
    console.log('');
  }
  console.log('ADDITIV (keine Stufe nötig) : Glied ' + r.additiv.join(', '));
  console.log('UMFORMEND (Stufe nötig)     : Glied ' + r.umformend.join(', '));
  console.log('');
  console.log('Kanten „muss vorher laufen": ' + (r.kanten.length
    ? r.kanten.map((k) => k.von + '→' + k.nach + ' über ' + k.ueber.join('/')).join(' · ')
    : 'keine — kein Glied liest, was ein anderes umformt'));
  console.log('Zyklen                     : ' + (r.zyklen.length
    ? r.zyklen.map((z) => z.join('→')).join(' · ') : 'keine'));
  console.log('Reihenfolge in EINEM Block : ' + (r.reihenfolge ? r.reihenfolge.join(' → ') : 'nicht bestimmbar'));
  console.log('');
  if (r.ankerFehlend.length) {
    console.log('BEFUND — diese Stellen gibt es im Kern NICHT (die Liste ist veraltet):');
    for (const f of r.ankerFehlend) console.log('   Glied ' + f.glied + ': „' + f.anker + '"');
    console.log('');
  }
  console.log(r.eineStufeTraegt
    ? '► EINE STUFE TRÄGT ALLE. Der Graph ist zyklenfrei — es gibt eine Reihenfolge,\n'
      + '  in der ein einziger Block (Schema 73 → 74) alle Glieder abarbeitet.'
    : '► SIE ZERFÄLLT. Melden und anhalten — die Zahl der Stufen ist dann eine Entscheidung.');
  process.exit(0);
}
