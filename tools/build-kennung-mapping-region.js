#!/usr/bin/env node
'use strict';
/* ════════════════════════════════════════════════════════════════════════
   build-kennung-mapping-region.js — bäckt die Kennungs-/Format-Schlüssel-
   Mapping-Tabellen als generierte Region in den Kern (Plan-Commit 3/4/5)
   ────────────────────────────────────────────────────────────────────────
   Nach demselben Muster wie `tools/build-code-listen.js` (Marker-Region,
   `--check` für CI, Quelle sind externe JSON-Dateien): der Kern braucht die
   Alt→Neu-Tabellen zur LAUFZEIT (in `depotNormalisieren()`, Schema 80→81),
   kann aber nichts nachladen (Offline-Garantie, G11) — also werden sie hier
   eingebacken, genau wie CODE-LISTEN und FELDKATALOG.

   Quellen: docs/umbau-englisch-vor-v1/kennung-mapping.json (457 Zeilen,
   Feld-Kennungen) und .../format-schluessel-mapping.json (Format-Schlüssel +
   Werte + VC-Claims). NUR Zeilen mit `status !== "offen-rechtlich"` bzw.
   einem gesetzten `kennungNeu` werden eingebacken — ein noch nicht amtlich
   bestätigter Rechtsbegriff darf nicht in den Kern gelangen und dort
   automatisch angewendet werden (Freigabe Punkt 7).

   Aufruf:
     node tools/build-kennung-mapping-region.js            → schreibt vivodepot.html
     node tools/build-kennung-mapping-region.js --check    → nur Drift melden (Exit 1)
     node tools/build-kennung-mapping-region.js --html <p> → andere Zieldatei (Test)
   ════════════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const path = require('node:path');

const REPO = path.join(__dirname, '..');
const _iH = process.argv.indexOf('--html');
const HTML = _iH >= 0 && process.argv[_iH + 1]
  ? path.resolve(process.argv[_iH + 1]) : path.join(REPO, 'vivodepot.html');
const KENNUNG_QUELLE = path.join(REPO, 'docs', 'umbau-englisch-vor-v1', 'kennung-mapping.json');
const FORMAT_QUELLE = path.join(REPO, 'docs', 'umbau-englisch-vor-v1', 'format-schluessel-mapping.json');

const LESEN = path.join(REPO, 'vivodepot-lesen.html');
/* Zweites Ziel (15.09.2026): die Lese-App öffnet Dateien von VOR dem Umbau und braucht dieselbe
   Umschreibung wie Kern-Stufe 80→81. Eingebacken wird die Tabelle UND der Umschreib-Code — letzterer
   wörtlich aus vivodepot.html geschnitten (Anker: `function _kennungenNachschlageBauen(` bis vor
   `function depotNormalisieren(`), damit es genau eine Fassung gibt. Verfehlt ein Anker, WIRFT das
   Werkzeug, statt eine leere Region zu schreiben. */
const LESE_BEGIN = '/* KENNUNG-MAPPING-LESEN:BEGIN — generierter Bereich (tools/build-kennung-mapping-region.js); '
  + 'Quellen: docs/umbau-englisch-vor-v1/kennung-mapping.json + vivodepot.html (_sektorenKennungenUmschreiben) */';
const LESE_END = '/* KENNUNG-MAPPING-LESEN:END */';

/* MIG3 (19.09.2026): drittes Ziel — U2-ADR-187 (_bereicheVerwaisteRetten,
   _proIdentitaetUebernehmen) fehlte der Lese-App komplett. Ein Bereich, den der Kern nach der
   Umbenennung wieder als bekannt erkennt und aus `bereicheVerwaist` zurück in `sektoren` holt,
   blieb für Angehörige unsichtbar (Lese-App zeigt nur `sektoren`). Wörtlich aus vivodepot.html
   geschnitten, wie beim Umschreib-Code — zwei Anker, weil `_PRO_IDENTITAET_ZUORDNUNG` und die
   beiden Funktionen im Kern nicht zusammenhängend stehen (unrelated Code dazwischen). EINE
   Namens-Anpassung, dokumentiert: `bereichsModulPruefen` heißt in der Lese-App
   `bereichsModulPruefenLesen` (gleiche Signatur bei Aufruf ohne `opt`, gemessen) — alle anderen
   Bezeichner (SEKTOR_BY_ID, KENNUNG_MAPPING) sind bereits identisch benannt. */
const VERWAISTE_BEGIN = '/* BEREICHE-VERWAISTE-RETTEN-LESEN:BEGIN — generierter Bereich '
  + '(tools/build-kennung-mapping-region.js); Quelle: vivodepot.html '
  + '(_proIdentitaetUebernehmen, _bereicheVerwaisteRetten, U2-ADR-187) */';
const VERWAISTE_END = '/* BEREICHE-VERWAISTE-RETTEN-LESEN:END */';
const BEGIN = '/* KENNUNG-MAPPING:BEGIN — generierter Bereich (tools/build-kennung-mapping-region.js); '
  + 'Quellen: docs/umbau-englisch-vor-v1/kennung-mapping.json + format-schluessel-mapping.json */';
const END = '/* KENNUNG-MAPPING:END */';

function ladeKennungMapping() {
  const alle = JSON.parse(fs.readFileSync(KENNUNG_QUELLE, 'utf8'));
  // Nur vollständig entschiedene Zeilen -- ein offener Rechtsbegriff hat hier ohnehin nie
  // ein kennungNeu (s. kennung-mapping-erzeugen.js), diese Prüfung ist die zweite, benannte
  // Sperre, nicht die einzige.
  return alle.filter((z) => z.kennungNeu)
    .map((z) => ({
      kennungAlt: z.kennungAlt, kennungNeu: z.kennungNeu,
      bereichAlt: z.bereichAlt, bereichNeu: z.bereichNeu,
      istUnterfeld: z.istUnterfeld,
    }));
}

function ladeFormatMapping() {
  const roh = JSON.parse(fs.readFileSync(FORMAT_QUELLE, 'utf8'));
  const nurEntschieden = (liste) => (liste || [])
    .filter((z) => z.status === 'entschieden' && z.neu)
    .map((z) => ({ alt: z.alt, neu: z.neu }));
  return {
    objektSchluessel: nurEntschieden(roh.objektSchluessel),
    werte: nurEntschieden(roh.werte),
    vcClaims: nurEntschieden(roh.vcClaims),
  };
}

function generiereRegion() {
  const kennungZeilen = ladeKennungMapping();
  const format = ladeFormatMapping();
  const j = (v) => JSON.stringify(v);
  const z = [];
  z.push(BEGIN);
  z.push('/* Reine Entscheidungsdaten (keine Kern-Logik) -- s. docs/umbau-englisch-vor-v1/ für');
  z.push('   Namensregeln, Ausnahmeliste und die (leere) Liste der noch nicht amtlich bestätigten');
  z.push('   Rechtsbegriffe. Object.freeze auf jeder Ebene, wie FELDKATALOG/CODE-LISTEN. */');
  z.push('const KENNUNG_MAPPING = Object.freeze([');
  z.push(kennungZeilen.map((zeile) => '  Object.freeze(' + j(zeile) + ')').join(',\n'));
  z.push(']);');
  z.push('const FORMAT_SCHLUESSEL_MAPPING = Object.freeze({');
  z.push('  objektSchluessel: Object.freeze(' + j(format.objektSchluessel) + '),');
  z.push('  werte: Object.freeze(' + j(format.werte) + '),');
  z.push('  vcClaims: Object.freeze(' + j(format.vcClaims) + '),');
  z.push('});');
  z.push(END);
  return z.join('\n');
}

function umschreibCodeAusKern(kernHtml) {
  const start = kernHtml.indexOf('function _kennungenNachschlageBauen(');
  const ende = kernHtml.indexOf('function depotNormalisieren(');
  if (start < 0 || ende < 0 || ende < start) {
    throw new Error('build-kennung-mapping-region: Anker für den Umschreib-Code im Kern verfehlt '
      + '(function _kennungenNachschlageBauen / function depotNormalisieren) — nichts geschrieben.');
  }
  const code = kernHtml.slice(start, ende).replace(/\s+$/, '');
  if (!code.includes('function _sektorenKennungenUmschreiben(')) {
    throw new Error('build-kennung-mapping-region: _sektorenKennungenUmschreiben liegt nicht zwischen den Ankern.');
  }
  return code;
}

function verwaisteRettenCodeAusKern(kernHtml) {
  const zuordnungStart = kernHtml.indexOf('const _PRO_IDENTITAET_ZUORDNUNG = Object.freeze(');
  if (zuordnungStart < 0) {
    throw new Error('build-kennung-mapping-region: Anker _PRO_IDENTITAET_ZUORDNUNG im Kern verfehlt — nichts geschrieben.');
  }
  const zuordnungEnde = kernHtml.indexOf(';\n', zuordnungStart);
  if (zuordnungEnde < 0) {
    throw new Error('build-kennung-mapping-region: Ende der _PRO_IDENTITAET_ZUORDNUNG-Zeile nicht gefunden.');
  }
  const zuordnungZeile = kernHtml.slice(zuordnungStart, zuordnungEnde + 1);

  const start = kernHtml.indexOf('function _proIdentitaetUebernehmen(ziel) {');
  const ende = kernHtml.indexOf('function _bereichAnzeigenameAusId(');
  if (start < 0 || ende < 0 || ende < start) {
    throw new Error('build-kennung-mapping-region: Anker für _proIdentitaetUebernehmen/_bereicheVerwaisteRetten '
      + 'im Kern verfehlt (function _proIdentitaetUebernehmen / function _bereichAnzeigenameAusId) — nichts geschrieben.');
  }
  let code = kernHtml.slice(start, ende).replace(/\s+$/, '');
  if (!code.includes('function _bereicheVerwaisteRetten(')) {
    throw new Error('build-kennung-mapping-region: _bereicheVerwaisteRetten liegt nicht zwischen den Ankern.');
  }
  // Einzige Namens-Anpassung (dokumentiert im Kommentar an VERWAISTE_BEGIN oben): die Lese-App
  // nennt ihre bereichsModulPruefen-Entsprechung bereichsModulPruefenLesen.
  if (!code.includes('bereichsModulPruefen(')) {
    throw new Error('build-kennung-mapping-region: erwarteter Aufruf bereichsModulPruefen(...) nicht im geschnittenen Code — '
      + 'Namens-Ersetzung würde nichts treffen, Anker vermutlich verschoben.');
  }
  code = code.replace(/\bbereichsModulPruefen\(/g, 'bereichsModulPruefenLesen(')
    .replace(/typeof bereichsModulPruefen ===/g, "typeof bereichsModulPruefenLesen ===");
  return zuordnungZeile + '\n' + code;
}

function generiereVerwaisteRegion(kernHtml) {
  const z = [];
  z.push(VERWAISTE_BEGIN);
  z.push('/* Wörtlich aus dem Kern — hier NICHT von Hand ändern, sondern im Kern, dann');
  z.push('   `node tools/build-kennung-mapping-region.js`. Eine Namens-Anpassung: bereichsModulPruefen');
  z.push('   heißt hier bereichsModulPruefenLesen (s. Kommentar an VERWAISTE_BEGIN im Werkzeug).');
  z.push('   ABWEICHUNG ZUM KERN (U2-ADR-187, dort benannt): _bereicheVerwaisteRetten formuliert einen');
  z.push('   Vorrang-Fall als „Bürgerin war schneller — nicht überschreiben" — ein Szenario laufender,');
  z.push('   konkurrierender Bearbeitung, die es in einer read-only Lese-App PER DEFINITION nicht gibt');
  z.push('   (eine Sitzung, ein Laderaum, kein Schreibweg). Der Code bleibt unverändert (harmlos: der');
  z.push('   Zweig kann hier nie zwei widersprüchliche Werte vorfinden), nur das Szenario selbst tritt');
  z.push('   in der Lese-App nie ein. Zweitens: die Rettung wird bei JEDEM Öffnen neu berechnet, nie in');
  z.push('   eine Datei zurückgeschrieben (keine Schreibfähigkeit) — anders als im Kern, wo ein');
  z.push('   nachfolgendes Sichern den geretteten Zustand dauerhaft macht. */');
  z.push(verwaisteRettenCodeAusKern(kernHtml));
  z.push(VERWAISTE_END);
  return z.join('\n');
}

function generiereLeseRegion(kernHtml) {
  const kennungZeilen = ladeKennungMapping();
  const j = (v) => JSON.stringify(v);
  const z = [];
  z.push(LESE_BEGIN);
  z.push('/* Wörtlich aus dem Kern (Stufe 80→81) — hier NICHT von Hand ändern, sondern im Kern, dann');
  z.push('   `node tools/build-kennung-mapping-region.js`. */');
  z.push('const KENNUNG_MAPPING = Object.freeze([');
  z.push(kennungZeilen.map((zeile) => '  Object.freeze(' + j(zeile) + ')').join(',\n'));
  z.push(']);');
  z.push(umschreibCodeAusKern(kernHtml));
  z.push(LESE_END);
  return z.join('\n');
}

function aktuelleRegion(html, begin, end) {
  begin = begin || BEGIN; end = end || END;
  const b = html.indexOf(begin);
  const e = html.indexOf(end);
  if (b < 0 || e < 0 || e < b) return null; // Region existiert noch nicht (erster Lauf)
  return { vor: html.slice(0, b), inhalt: html.slice(b, e + end.length), nach: html.slice(e + end.length) };
}

function main() {
  const check = process.argv.includes('--check');
  const html = fs.readFileSync(HTML, 'utf8');
  const region = aktuelleRegion(html);
  const neu = generiereRegion();

  /* Lese-App: nur, wenn das Standard-Ziel läuft (kein --html), sonst prüfte ein Test mit einer
     Kern-Kopie die echte Lese-App mit. */

  if (_iH < 0) {
    let lese = fs.readFileSync(LESEN, 'utf8');
    let leseGeaendert = false;

    const leseRegion = aktuelleRegion(lese, LESE_BEGIN, LESE_END);
    const leseNeu = generiereLeseRegion(html);
    if (!leseRegion) {
      console.error('build-kennung-mapping-region: KEIN Marker-Paar in vivodepot-lesen.html (KENNUNG-MAPPING-LESEN).');
      return 1;
    }
    if (leseRegion.inhalt !== leseNeu) {
      if (check) {
        console.error('DRIFT: die Lese-App-Region (KENNUNG-MAPPING-LESEN) weicht von Tabelle/Kern-Code ab. '
          + '`node tools/build-kennung-mapping-region.js` ausführen.');
        return 1;
      }
      lese = leseRegion.vor + leseNeu + leseRegion.nach;
      leseGeaendert = true;
    }

    // Zwei Regionen in DERSELBEN Datei — jede Aenderung auf `lese` weiterreichen, nie auf die
    // urspruenglich eingelesene Zeichenkette zurueckfallen, sonst ueberschriebe der zweite
    // Schreibvorgang den ersten.
    const verwaisteRegion = aktuelleRegion(lese, VERWAISTE_BEGIN, VERWAISTE_END);
    const verwaisteNeu = generiereVerwaisteRegion(html);
    if (!verwaisteRegion) {
      console.error('build-kennung-mapping-region: KEIN Marker-Paar in vivodepot-lesen.html (BEREICHE-VERWAISTE-RETTEN-LESEN).');
      return 1;
    }
    if (verwaisteRegion.inhalt !== verwaisteNeu) {
      if (check) {
        console.error('DRIFT: die Lese-App-Region (BEREICHE-VERWAISTE-RETTEN-LESEN) weicht vom Kern-Code ab. '
          + '`node tools/build-kennung-mapping-region.js` ausführen.');
        return 1;
      }
      lese = verwaisteRegion.vor + verwaisteNeu + verwaisteRegion.nach;
      leseGeaendert = true;
    }

    if (leseGeaendert) {
      fs.writeFileSync(LESEN, lese);
      console.log('build-kennung-mapping-region: Lese-App-Region(en) aktualisiert.');
    }
  }

  if (region && region.inhalt === neu) {
    console.log('build-kennung-mapping-region: kein Drift. '
      + ladeKennungMapping().length + ' Kennungs-Zeilen, '
      + ladeFormatMapping().objektSchluessel.length + ' Format-Schlüssel, '
      + ladeFormatMapping().werte.length + ' Werte, '
      + ladeFormatMapping().vcClaims.length + ' VC-Claims eingebacken.');
    return 0;
  }
  if (check) {
    console.error('DRIFT: die eingebackene Kennung-Mapping-Region weicht von den JSON-Quellen ab '
      + '(oder existiert noch nicht). `node tools/build-kennung-mapping-region.js` ausführen.');
    return 1;
  }
  if (region) {
    fs.writeFileSync(HTML, region.vor + neu + region.nach);
    console.log('build-kennung-mapping-region: Region aktualisiert.');
  } else {
    console.error('build-kennung-mapping-region: KEIN Marker-Paar gefunden -- die Region muss '
      + 'einmalig von Hand an der gewünschten Stelle angelegt werden (BEGIN/END-Kommentare '
      + 'einfügen), danach schreibt dieses Werkzeug den Inhalt dazwischen.');
    return 1;
  }
  return 0;
}

if (require.main === module) process.exit(main());
module.exports = { ladeKennungMapping, ladeFormatMapping, generiereRegion, generiereLeseRegion, umschreibCodeAusKern,
  generiereVerwaisteRegion, verwaisteRettenCodeAusKern, aktuelleRegion,
  BEGIN, END, LESE_BEGIN, LESE_END, VERWAISTE_BEGIN, VERWAISTE_END, HTML, LESEN };
