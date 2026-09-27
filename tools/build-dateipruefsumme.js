#!/usr/bin/env node
'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   build-dateipruefsumme.js — `vivodepot.html.sha256` ERZEUGEN, nicht von Hand
   nachziehen
   ────────────────────────────────────────────────────────────────────────────
   AUFTRAG vom 03.09.2026 (v1-Dokumente-Audit, Frage 3). `vivodepot.html.sha256`
   ist der einzige Nachweisweg, mit dem jemand ohne Netz und ohne Zertifikat prüfen
   kann, ob die eigene Datei die echte ist. Bis heute wurde er ausschließlich von
   Hand nachgezogen — Dutzende ADRs (Mai bis August) tragen den Vermerk „nachgezogen",
   aber kein Skript, kein Test, kein CI-Workflow hat je gegengeprüft, dass es auch
   geschah. Gemessen (03.09.2026, `git log`): der eingecheckte Wert ist seit Commit
   `78e37824` (19.08.2026) nicht mehr aktualisiert worden — 239 Commits haben
   `vivodepot.html` seither inhaltlich verändert, keiner hat die Prüfsumme nachgezogen.

   ENGER ZUSCHNITT, ENTSCHIEDEN: nur `vivodepot.html`. Was ein Mensch ohne
   Netz und Zertifikat von Hand prüfen will, ist die Datei, die die Bürgerin in der
   Hand hat — nicht `sw.js`/`manifest.webmanifest` (Infrastruktur, niemand prüft sie
   von Hand). Die Lese-App (`vivodepot-lesen.html`) ist ein Grenzfall, der
   ausdrücklich zur Entscheidung vorgelegt ist statt hier entschieden — bewusst nicht Teil
   dieses Werkzeugs.

   BAUFORM, wie überall sonst im Repo (`build-standzahlen.js`, `sbom-pflegen.js`):
   ein Werkzeug, EIN Paar Befehle — einer schreibt, einer prüft. Der Prüfteil hängt
   im pre-commit-Hook (dieselbe Stelle wie `sbom:check`); der Erzeuger schreibt NUR
   auf ausdrücklichen Aufruf. KEIN STILLES NACHZIEHEN: Der Hook darf die Prüfsumme
   nicht bei jedem Commit heimlich neu schreiben — dann wäre sie immer richtig und
   nie eine Aussage. Er meldet; wer sie ändert, tut es bewusst mit `--build`.

   DIREKTER VERGLEICH, NICHT ÜBER `schalen-lockstep-kern.js`s ÄNDERUNGSERKENNUNG
   (Präzisierung): Dieses Werkzeug berechnet den SHA-256 von `vivodepot.html`
   IMMER frisch aus der Datei und vergleicht ihn direkt gegen den eingecheckten Wert —
   unabhängig davon, ob `istSchaleInhaltlich()` eine Änderung meldet. Sonst erbt es
   dessen blinden Fleck: die dort bewusst ausgenommene `SCHALEN_STAND`-Stempelzeile
   zählt hier mit, weil die Prüfsumme die GANZE Datei deckt, nicht nur ihren
   inhaltlichen Kern. `schalen-lockstep-kern.js` liefert nur den Anlass (läuft bei
   jedem Commit/Push), nicht die Bedingung.

   ROHE BYTES, NICHT UTF-8-TEXT: `fs.readFileSync` ohne Encoding liefert einen
   Buffer — genau das, was `shasum -a 256` hasht. Eine Text-Dekodierung könnte bei
   ungültigen UTF-8-Sequenzen unbemerkt normalisieren und einen anderen Hash ergeben
   als das Kommandozeilen-Werkzeug, mit dem jede Bürgerin tatsächlich nachprüft.

   FORMAT: `<hex-sha256>␣␣vivodepot.html\n` — exakt die Ausgabeform von
   `shasum -a 256 vivodepot.html`, damit ein Abgleich per Hand (`shasum -c
   vivodepot.html.sha256`) weiterhin funktioniert.

   `--html <pfad>` lenkt NUR die gehashte Seite um (Waechter-Register-Fixturen-Konvention,
   vgl. `sbom-pflegen.js --html`): `vivodepot.html.sha256` bleibt in JEDEM Lauf die echte,
   unveraendert gelesene Datei — nur welche Bytes gehasht werden, variiert. `--repo <pfad>`
   lenkt beide Seiten gemeinsam um (fuer isolierte Tests gegen ein Wegwerf-Verzeichnis).

   Aufruf:
     node tools/build-dateipruefsumme.js                 schreibt vivodepot.html.sha256
     node tools/build-dateipruefsumme.js --check          meldet Abweichung (Exit 1)
     node tools/build-dateipruefsumme.js --check --html <pfad>   prueft <pfad> statt vivodepot.html
   ════════════════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const REPO = path.join(__dirname, '..');
const ZIEL_DATEI = 'vivodepot.html';
const PRUEFSUMMEN_DATEI = ZIEL_DATEI + '.sha256';

function aktuellerHash(repo, htmlPfad) {
  const bytes = fs.readFileSync(htmlPfad || path.join(repo, ZIEL_DATEI));
  return crypto.createHash('sha256').update(bytes).digest('hex');
}

function zeile(hash) {
  return hash + '  ' + ZIEL_DATEI + '\n';
}

/** Liest den eingecheckten Wert; { hash, roh } oder null (Datei fehlt/leer), nie wirft es. */
function eingecheckterWert(repo) {
  const p = path.join(repo, PRUEFSUMMEN_DATEI);
  if (!fs.existsSync(p)) return null;
  const roh = fs.readFileSync(p, 'utf8');
  const m = /^([0-9a-f]{64})\s/.exec(roh);
  return m ? { hash: m[1], roh } : null;
}

function main() {
  const argv = process.argv.slice(2);
  const CHECK = argv.includes('--check');

  const iRepo = argv.indexOf('--repo');
  const repo = (iRepo >= 0 && argv[iRepo + 1]) ? path.resolve(argv[iRepo + 1]) : REPO;
  const iHtml = argv.indexOf('--html');
  const htmlPfad = iHtml >= 0 ? path.resolve(argv[iHtml + 1]) : null;

  const aktuell = aktuellerHash(repo, htmlPfad);
  const eingecheckt = eingecheckterWert(repo);

  if (CHECK) {
    if (!eingecheckt) {
      console.error('build-dateipruefsumme: ' + PRUEFSUMMEN_DATEI + ' fehlt oder ist unlesbar.');
      console.error('  Abhilfe: node tools/build-dateipruefsumme.js');
      process.exit(1);
    }
    if (eingecheckt.hash !== aktuell) {
      console.error('build-dateipruefsumme: DRIFT — ' + PRUEFSUMMEN_DATEI + ' = '
        + eingecheckt.hash.slice(0, 8) + '… != aktueller SHA-256 von ' + ZIEL_DATEI + ' = '
        + aktuell.slice(0, 8) + '….');
      console.error('  Abhilfe: node tools/build-dateipruefsumme.js');
      process.exit(1);
    }
    console.log('build-dateipruefsumme: kein Drift (' + aktuell.slice(0, 8) + '…).');
    return;
  }

  const neu = zeile(aktuell);
  const unveraendert = eingecheckt && eingecheckt.roh === neu;
  fs.writeFileSync(path.join(repo, PRUEFSUMMEN_DATEI), neu);
  console.log('build-dateipruefsumme: ' + PRUEFSUMMEN_DATEI + ' '
    + (unveraendert ? 'bereits aktuell (' : 'neu geschrieben (') + aktuell.slice(0, 8) + '…).');
}

if (require.main === module) main();
module.exports = { aktuellerHash, zeile, eingecheckterWert, ZIEL_DATEI, PRUEFSUMMEN_DATEI };
