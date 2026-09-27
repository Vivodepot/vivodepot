#!/usr/bin/env node
'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   leere-messung-suchen — woran wurde eigentlich gemessen?
   ────────────────────────────────────────────────────────────────────────────
   DER ANLASS IST EIN EIGENER FEHLER (A397, 20.08.2026): `katalogbindung-messen.js`
   meldete „die Lese-App kennt `feldDefinitionen` nicht". Sie kennt sie seit
   A276/A277. Gemessen wurde gegen ein Depot **ohne** `feldDefinitionen` — ein
   angedocktes Feld ohne seine Definition ist im Depot gar nicht vorhanden.

   **Eine Messung an einem Gegenstand, der das gesuchte Merkmal nicht tragen
   kann, ist keine negative Messung — sie ist leer.** Und sie sieht aus wie ein
   Fund.

   ── WAS ZWEI ANLÄUFE GEKOSTET HAT, UND WARUM DAS HIER STEHT ───────────────
   Der erste Anlauf suchte nach Abwesenheits-BEHAUPTUNGEN im Code und prüfte,
   ob die Datei den Trägerschlüssel setzt. **Seine Positivkontrolle war rot** —
   er fand den eigenen Anlassfall nicht, aus zwei Gründen: die Behauptung stand
   im KOMMENTAR (dieses Projekt begründet in Prosa, nicht in Bezeichnern), und
   die Datei setzte den Schlüssel an anderer Stelle sehr wohl. Leer war EIN
   Prüfstoff-Objekt darin.

   **Daraus folgt der Zuschnitt dieses Werkzeugs:** es urteilt NICHT. Es legt
   offen, woran gemessen wird — jedes Prüfstoff-Depot mit den Trägerschlüsseln,
   die es NICHT setzt. Wer eine Abwesenheits-Aussage prüfen will, findet hier
   in einer Zeile, ob ihr Gegenstand das Merkmal überhaupt tragen konnte.

   Ein Urteil bräuchte zu wissen, was eine Messung MEINT. Das steht in Prosa,
   und eine Heuristik darüber hätte entweder Falsch-Positive oder eine
   Ausnahmeliste, die genau die Fälle verschluckt, die sie finden soll.

   KEIN WÄCHTER, und aus demselben Grund: ein leeres Prüfstoff-Depot ist meistens
   richtig — die Probe für den Leer-Zustand BRAUCHT eines.

   Aufruf:
     node tools/leere-messung-suchen.js                  # Übersicht je Datei
     node tools/leere-messung-suchen.js --traeger feldDefinitionen
     node tools/leere-messung-suchen.js --datei <pfad>
     node tools/leere-messung-suchen.js --json
   ════════════════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const path = require('node:path');

const REPO = path.join(__dirname, '..');

/* Die Trägerschlüssel: Depot-Schlüssel, deren Abwesenheit ein Merkmal unmöglich
   macht. Ein angedocktes Feld OHNE `feldDefinitionen` existiert nicht; eine
   angedockte Code-Liste ohne `codeListen` ebenso wenig. */
const TRAEGER = Object.freeze([
  'feldDefinitionen', 'codeListen', 'formatModule', 'bereichsModule', 'textsatzModule',
  'rechtsraumModule', 'institutionsArten', 'importierteVorlagen', 'dokumente',
  'sensibelFelder', 'feldGueltigkeit', 'verwalteteDepots', 'angehoerigenCache',
  'menschen', 'institutionen', 'anfragen', 'zusammenstellungen',
]);

function ohneKommentare(q) {
  return q.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:])\/\/[^\n]*/g, '$1 ');
}

/* Ein Prüfstoff-Depot erkennt man an `sektoren:` — der einzige Schlüssel, den
   jedes Depot-Literal dieses Projekts führt. Von der öffnenden Klammer bis zur
   passenden schliessenden, Klammern gezählt. */
function depotLiterale(code) {
  const raus = [];
  const re = /\{[^{}]*\bsektoren\s*:/g;
  let m;
  while ((m = re.exec(code))) {
    let tiefe = 0, ende = -1;
    for (let i = m.index; i < code.length && i < m.index + 40000; i++) {
      if (code[i] === '{') tiefe++;
      else if (code[i] === '}') { tiefe--; if (!tiefe) { ende = i; break; } }
    }
    if (ende < 0) continue;
    const text = code.slice(m.index, ende + 1);
    const fehlt = TRAEGER.filter((t) => !new RegExp('\\b' + t + '\\s*:').test(text));
    raus.push({ zeile: code.slice(0, m.index).split('\n').length, laenge: text.length, fehlt });
    re.lastIndex = ende;
  }
  return raus;
}

function dateienSammeln() {
  const raus = [];
  for (const ordner of ['tools', 'tests', path.join('tests', 'fixtures'), path.join('tests', 'mit-modul')]) {
    const p = path.join(REPO, ordner);
    if (!fs.existsSync(p)) continue;
    for (const name of fs.readdirSync(p)) {
      if (name.endsWith('.js')) raus.push(path.join(ordner, name));
    }
  }
  return raus.sort();
}

function erhebe(dateien) {
  const raus = [];
  for (const rel of dateien) {
    let roh;
    /* `resolve` statt `join`: ein absoluter Pfad (Probe im Temp-Ordner, `--datei`) bleibt
       damit absolut. Mit `join` haette die Probe im eigenen Baum gesucht und NICHTS gefunden —
       eine gruene Positivkontrolle waere dann nur der Beweis, dass die Datei fehlt. */
    try { roh = fs.readFileSync(path.resolve(REPO, rel), 'utf8'); } catch (e) { continue; }
    const code = ohneKommentare(roh);
    const literale = depotLiterale(code);
    if (!literale.length) continue;
    /* Nennt die Datei einen Träger IRGENDWO — auch im Kommentar? Dann ist sie ein
       Kandidat für die Frage „konnte der Prüfstoff das tragen?". Der Kommentar zählt
       mit, weil dieses Projekt seine Aussagen dort begründet. */
    const genannt = TRAEGER.filter((t) => new RegExp('\\b' + t + '\\b').test(roh));
    raus.push({ datei: rel, literale, genannt });
  }
  return raus;
}

function main() {
  const argv = process.argv.slice(2);
  const iD = argv.indexOf('--datei');
  const iT = argv.indexOf('--traeger');
  const nurTraeger = (iT >= 0 && argv[iT + 1]) ? argv[iT + 1] : null;
  const dateien = (iD >= 0 && argv[iD + 1]) ? [path.relative(REPO, path.resolve(argv[iD + 1]))] : dateienSammeln();
  const erhebung = erhebe(dateien);

  /* Der interessante Fall: die Datei SPRICHT von einem Träger, und mindestens ein
     Prüfstoff trägt ihn NICHT. Das ist keine Anklage — es ist die Stelle, an der
     die Frage „konnte das Merkmal überhaupt da sein?" beantwortet gehört. */
  const fragen = [];
  for (const e of erhebung) {
    for (const t of e.genannt) {
      if (nurTraeger && t !== nurTraeger) continue;
      const ohne = e.literale.filter((l) => l.fehlt.indexOf(t) >= 0);
      if (!ohne.length || ohne.length === 0) continue;
      fragen.push({ datei: e.datei, traeger: t, ohne: ohne.length, gesamt: e.literale.length,
        zeilen: ohne.map((l) => l.zeile).slice(0, 5) });
    }
  }
  if (argv.includes('--json')) {
    process.stdout.write(JSON.stringify({ dateien: dateien.length, mitPruefstoff: erhebung.length,
      fragen: fragen.length, erhebung, fragenListe: fragen }, null, 2) + '\n');
    return;
  }
  process.stdout.write('[leere-messung] ' + dateien.length + ' Dateien · '
    + erhebung.length + ' mit Prüfstoff-Depot · ' + fragen.length + ' Stelle(n) zum Ansehen'
    + (nurTraeger ? ' (nur ' + nurTraeger + ')' : '') + '.\n\n');
  const nachDatei = new Map();
  for (const f of fragen) {
    if (!nachDatei.has(f.datei)) nachDatei.set(f.datei, []);
    nachDatei.get(f.datei).push(f);
  }
  for (const [datei, liste] of nachDatei) {
    process.stdout.write('  ' + datei + '\n');
    for (const f of liste) {
      process.stdout.write('    ' + f.traeger.padEnd(20) + f.ohne + ' von ' + f.gesamt
        + ' Prüfstoff-Depots ohne ihn — Z' + f.zeilen.join(', Z') + '\n');
    }
  }
  process.stdout.write('\n  KEINE ANKLAGE, EINE FRAGE: ein Prüfstoff ohne Trägerschlüssel ist meistens\n'
    + '  richtig — die Probe für den Leer-Zustand BRAUCHT eines. Nachzusehen ist, wo eine\n'
    + '  ABWESENHEIT behauptet wird, deren Träger im Prüfstoff fehlte.\n');
}

if (require.main === module) main();
module.exports = { erhebe, depotLiterale, dateienSammeln, ohneKommentare, TRAEGER };
