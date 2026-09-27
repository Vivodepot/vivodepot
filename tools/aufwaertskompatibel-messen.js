#!/usr/bin/env node
'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   ZUG 1 · BESTEHT DER AUFWÄRTSKOMPATIBLE WEG? (Antwort an CC, 21.08.2026)
   ────────────────────────────────────────────────────────────────────────────
   SP Bau hat drei der fünf Fragen als EINE erkannt: Prüfstein 3 (ein Wert oder
   mehrere), Prüfstein 5 (Sprache oder Sprache-plus-Rechtsraum) und Frage 5 (ein
   Feld oder ein Paar) haben dieselbe Form — **ein Schlüssel, der heute eine
   Dimension trägt, müsste zwei tragen.**

   DIE FRAGE, für alle drei dieselbe: Lässt sich der Schlüssel so bauen, dass er
   BEIDES annimmt, **ohne dass ein einziger Bestandswert umzieht?**

   WAS DAVON ABHÄNGT: Geht es, muss die Entscheidung heute nicht fallen — die Tür
   bleibt offen, und der erste Doppelstaatler kostet keine zweite Umstellung.
   Geht es nicht, entscheidet die Produktentscheidung jetzt, mit der Messung in der Hand.

   DIE EHRLICHE GEGENANTWORT GEHÖRT DAZU, und der Auftrag sagt es scharf: **wo
   Aufwärtskompatibilität nur mit einem ZWEITEN LESEPFAD zu haben wäre, ist sie
   keine.** Dann lautet die Meldung: geht nicht.

   KEIN BAU. Gemessen wird, ob der Weg besteht, nicht gegangen.

   POSITIVKONTROLLE JE STELLE: ein gepflanzter Bestandswert alter Form muss
   unverändert gelesen werden — sonst ist „aufwärtskompatibel" behauptet.
   ════════════════════════════════════════════════════════════════════════════ */
const path = require('node:path');
const fs = require('node:fs');

function kernText() {
  return fs.readFileSync(process.env.KERN_HTML_PATH
    || path.join(__dirname, '..', 'vivodepot.html'), 'utf8');
}

/* OHNE KOMMENTARE ZÄHLEN, und der Grund ist ein Fehler des ersten Laufs: die Kommentare
   dieses Hauses zitieren Code — „`data.feldGueltigkeit[…].bis`" steht mehrfach in
   Erklärtexten. Der erste Zähler nahm sie mit und meldete 21 Roh-Zugriffe, wo es weniger
   sind. Eine Zahl aus einem zu weiten Modell ist ein Eindruck, keine Messung (A443).
   Derselbe Entkommentierer wie in `tools/nur-vom-test-erreicht-pruefen.js` — eine Regel,
   nicht zwei. */
const { entkommentiert } = require('./nur-vom-test-erreicht-pruefen.js');
function kernCode() { return entkommentiert(kernText()); }

/* ── a · DER FELDWERT ─────────────────────────────────────────────────────────
   Kann derselbe Feldschlüssel einen EINZELNEN Wert oder MEHRERE tragen, ohne
   dass der Bestand angefasst wird? Gemessen wird nicht die Absicht, sondern was
   die vorhandenen Leser mit beiden Formen tun. */
function stelleA(V) {
  const BEREICH = 'housing', FELD = 'tpl_nummer';
  const einzeln = 'DE-12345';
  const mehrere = ['DE-12345', 'HU-98765'];
  const feld = { id: FELD, typ: 'text', label: 'Nummer' };

  const bauen = (wert) => {
    const d = V.leeresDepot();
    d.feldDefinitionen = [{ sektorId: BEREICH, feldId: FELD, typ: 'text', label: 'Nummer' }];
    d.sektoren[BEREICH] = { [FELD]: wert };
    V.setData(d);
    return d;
  };

  const messePaar = (wert) => {
    bauen(wert);
    const pdf = V.vollDepotModell({ sensibel: false }).bereiche.find((b) => b.id === BEREICH);
    const zeilen = pdf ? pdf.sektionen.flatMap((s) => s.zeilen) : [];
    const txt = JSON.stringify(V.vollExportJSON({ sensibel: false }));
    return {
      eingetragen: V.feldEingetragen(feld, wert),
      wertText: V.feldWertText(feld, wert),
      aufDemBlatt: zeilen.length ? zeilen[0].wert : null,
      imExport: mehrere.every((w) => txt.includes(w)) || txt.includes(einzeln),
    };
  };

  const alt = messePaar(einzeln);      // POSITIVKONTROLLE: die Bestandsform
  const neu = messePaar(mehrere);      // die zweite Form am SELBEN Schlüssel

  /* Wo verzweigt der Kern auf die FORM des Wertes und wo auf die FELDART? Das ist die
     eigentliche Frage: eine formgetriebene Stelle nimmt beides von selbst, eine
     artgetriebene bräuchte einen zweiten Zweig. */
  const text = kernCode();
  const tuerenWertText = (text.match(/feldWertText\(/g) || []).length;
  const tuerenMenschlich = (text.match(/_wertTextMenschlich\(/g) || []).length;
  const formgetrieben = /if \(Array\.isArray\(wert\)\) \{/.test(text);   // feldEingetragen

  return { alt, neu, einzeln, mehrere, tuerenWertText, tuerenMenschlich, formgetrieben };
}

/* ── b · DER TEXTSATZ-SCHLÜSSEL ───────────────────────────────────────────────
   Heute `registry[sprache]`. Die entscheidende Frage ist nicht, ob man den
   Schlüssel ändern KANN, sondern ob dabei ein gespeicherter Wert umzieht. */
function stelleB(V) {
  const text = kernCode();
  /* FESTE Kennung, kein `find()` (Fund/Auflage 18.09.2026): ein `.find()` über
     `.label`-Kennungen trifft irgendwann eine, die einem NATIVEN Bereich gehört — und die ist
     seit heute geschützt (`_eingebauteBereichsBeschriftungVerwerfen`, Kaperungs-Sperre gegen
     Depot-Module, die eine eingebaute Bereichs-Beschriftung überschreiben wollen). Gemessen: mit
     `.find(k => k.endsWith('.label'))` traf dieser Zug „mobility.label" — die Sperre setzte den
     gepflanzten Wert zurück, ohne dass diese Datei je Bereichs-Beschriftungen prüfen wollte.
     `mobility.einfuehrungstext` ist KEINE Bereichs-Beschriftung (Suffix `einfuehrungstext`,
     nicht in `_BEREICH_ARTEN_OHNE_MODUL` = ['label', 'navUnterzeile']) — die Sperre kann sie
     kategorisch nie greifen, unabhängig davon, welche Bereiche künftig nativ sind. Die Kennung
     ist hier das FAHRZEUG für die eigentliche Frage (wird die Textsatz-Registry gespeichert
     oder abgeleitet?), nicht der Gegenstand — ein anderes Fahrzeug ändert nicht, was gemessen
     wird. Rot-Beweis geführt: mit ausgesetztem Registry-Rebuild bleibt der alte Wert stehen,
     die Probe wird rot (s. Testdatei). */
  const kennung = 'mobility.einfuehrungstext';
  const satz = (anbieterId, txt, extra) => Object.assign({ modulTyp: 'textsatz', moduleVersion: 1,
    herkunft: anbieterId, anbieterId, sprache: 'es', texte: { [kennung]: txt } }, extra || {});

  /* Wird die Registry GESPEICHERT oder bei jedem Laden neu gebaut? Gemessen, indem sie
     geleert und aus dem Depot neu aufgebaut wird. */
  const d = V.leeresDepot();
  d.textsatzModule = [satz('es-es', 'ES-Text')];
  d.textsprache = 'es';
  V.setData(d);
  V._textsatzModuleAusDepotAnmelden(d);
  const nachAufbau = V.textLesen(kennung);
  const e = V.leeresDepot();
  V.setData(e);
  V._textsatzModuleAusDepotAnmelden(e);   // leeres Depot → Registry muss leer sein
  const nachLeeren = V.textLesen(kennung);

  /* Welche Depot-Schlüssel tragen die zwei Dimensionen heute? */
  const leer = V.leeresDepot();
  const slots = Object.keys(leer);
  return {
    abgeleitet: nachAufbau === 'ES-Text' && nachLeeren !== 'ES-Text',
    nachAufbau, nachLeeren,
    depotHatTextsprache: 'textsprache' in leer || text.includes('data.textsprache'),
    depotHatRechtsraumSlot: slots.includes('rechtsraum'),
    rechtsraumModuleSlot: slots.includes('rechtsraumModule'),
    /* Wie oft wird der Rechtsraum im Kern ÜBERHAUPT erfragt — und mit welchem Wert? */
    katalogAufrufe: (text.match(/_rechtsraumKatalogLesen\(/g) || []).length,
    davonMitDeLiteral: (text.match(/_rechtsraumKatalogLesen\([^)]*'DE'/g) || []).length,
  };
}

/* ── c · DER GÜLTIGKEITS-EINTRAG ──────────────────────────────────────────────
   Heute je Feld-Id. Kann ein PAAR einen Zeitraum teilen, ohne dass die
   Einzeleinträge des Bestands umziehen? Entscheidend ist, ob es EINE Tür gibt. */
function stelleC(V) {
  const text = kernCode();
  const BEREICH = 'identitaet';

  /* POSITIVKONTROLLE: ein Bestandseintrag alter Form wird gelesen. */
  const d = V.leeresDepot();
  V.setData(d);
  V.feldGueltigkeitSetzen(BEREICH, 'ausweis_ausgestellt', '2020-05-01', null);
  V.feldGueltigkeitSetzen(BEREICH, 'ausweis_gueltig', null, '2030-04-30');
  const a = V.feldGueltigkeitLesen(BEREICH, 'ausweis_ausgestellt');
  const b = V.feldGueltigkeitLesen(BEREICH, 'ausweis_gueltig');

  /* Wer liest den Topf ROH, an der Tür vorbei? **Die blosse Zahl taugt hier nicht**, und das
     ist der Fund dieser Messung: der erste Zähler meldete 21, davon waren sieben Kommentare;
     nach dem Entkommentieren blieben 14 — und die liegen ganz überwiegend INNERHALB der Tür
     und ihres Schreibers. Eine Zahl ohne ihren Ort hätte hier „geht nicht" gesagt, wo „geht"
     richtig ist. Gezählt wird darum je UMGEBENDER FUNKTION. */
  const zeilen = text.split('\n');
  let funktion = '(Datei-Ebene)';
  const jeFunktion = {};
  for (const z of zeilen) {
    const m = z.match(/^\s*(?:async )?function ([A-Za-z_$][\w$]*)/);
    if (m) funktion = m[1];
    const treffer = (z.match(/(data|q|ziel)\.feldGueltigkeit\[/g) || []).length;
    if (treffer) jeFunktion[funktion] = (jeFunktion[funktion] || 0) + treffer;
  }
  const TUEREN = ['feldGueltigkeitLesen', 'feldGueltigkeitSetzen'];
  const ausserhalb = Object.keys(jeFunktion).filter((f) => !TUEREN.includes(f));

  return {
    paarGetrennt: !!(a && a.von === '2020-05-01' && !a.bis) && !!(b && b.bis === '2030-04-30' && !b.von),
    a, b,
    durchDieTuer: (text.match(/feldGueltigkeitLesen\(/g) || []).length,
    rohZugriffe: Object.values(jeFunktion).reduce((n, x) => n + x, 0),
    jeFunktion, ausserhalb,
  };
}

function messen(V) { return { a: stelleA(V), b: stelleB(V), c: stelleC(V) }; }

function bericht(m) {
  const z = [];
  z.push('a · DER FELDWERT — ein Wert oder mehrere am selben Schlüssel');
  z.push('    POSITIVKONTROLLE (Bestandsform, einzelner Wert):');
  z.push('      eingetragen: ' + m.a.alt.eingetragen + ' · Anzeige: ' + JSON.stringify(m.a.alt.wertText)
    + ' · auf dem Blatt: ' + JSON.stringify(m.a.alt.aufDemBlatt));
  z.push('    ZWEITE FORM (Liste am selben Schlüssel, Feldart bleibt `text`):');
  z.push('      eingetragen: ' + m.a.neu.eingetragen + ' · Anzeige: ' + JSON.stringify(m.a.neu.wertText)
    + ' · auf dem Blatt: ' + JSON.stringify(m.a.neu.aufDemBlatt));
  z.push('    `feldEingetragen` verzweigt auf die FORM (Array.isArray): ' + m.a.formgetrieben);
  z.push('    Türen der Anzeige: feldWertText ' + m.a.tuerenWertText + ' · _wertTextMenschlich ' + m.a.tuerenMenschlich);
  z.push('');
  z.push('b · DER TEXTSATZ-SCHLÜSSEL — Sprache oder Sprache-plus-Rechtsraum');
  z.push('    Registry wird ABGELEITET, nicht gespeichert: ' + m.b.abgeleitet
    + ' (mit Depot: ' + JSON.stringify(m.b.nachAufbau) + ' · mit leerem Depot: ' + JSON.stringify(m.b.nachLeeren) + ')');
  z.push('    Depot-Slot `textsprache` (gespeichert): ' + m.b.depotHatTextsprache);
  z.push('    Depot-Slot `rechtsraum` (aktiver Rechtsraum): ' + m.b.depotHatRechtsraumSlot
    + '   · Slot `rechtsraumModule`: ' + m.b.rechtsraumModuleSlot);
  z.push('    `_rechtsraumKatalogLesen`-Aufrufe: ' + m.b.katalogAufrufe
    + ', davon mit dem Literal \'DE\': ' + m.b.davonMitDeLiteral);
  z.push('');
  z.push('c · DER GÜLTIGKEITS-EINTRAG — ein Feld oder ein Paar');
  z.push('    POSITIVKONTROLLE: zwei Bestandseinträge alter Form, getrennt gelesen: ' + m.c.paarGetrennt);
  z.push('      ' + JSON.stringify(m.c.a) + '  /  ' + JSON.stringify(m.c.b));
  z.push('    Lesen durch die Tür (`feldGueltigkeitLesen`): ' + m.c.durchDieTuer);
  z.push('    ROH-Zugriffe insgesamt: ' + m.c.rohZugriffe + ' — je Funktion:');
  for (const [f, n] of Object.entries(m.c.jeFunktion)) z.push('      ' + f.padEnd(28) + n);
  z.push('    AUSSERHALB der zwei Türen: ' + (m.c.ausserhalb.join(', ') || 'keine'));
  return z.join('\n');
}

function laufen(kernPfad) {
  if (kernPfad) process.env.KERN_HTML_PATH = kernPfad;
  const { ladeKern } = require(path.join(__dirname, '..', 'tests', 'load-kern.js'));
  return messen(ladeKern().V);
}

if (require.main === module) {
  const i = process.argv.indexOf('--kern');
  const m = laufen(i > -1 ? process.argv[i + 1] : null);
  console.log(bericht(m));
  if (!m.a.alt.eingetragen || !m.b.abgeleitet || !m.c.paarGetrennt) {
    console.error('\nABBRUCH: eine Positivkontrolle trägt nicht — die Messung oben ist nicht belastbar.');
    process.exit(2);
  }
}

module.exports = { messen, bericht, laufen, stelleA, stelleB, stelleC };
