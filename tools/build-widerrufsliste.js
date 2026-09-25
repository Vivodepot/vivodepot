#!/usr/bin/env node
'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   A405 Zug 2 (21.08.2026) — die Widerrufsliste des Kerns in die Lese-App.
   ────────────────────────────────────────────────────────────────────────────
   DAS PROBLEM, gemessen in A405: Der Kern führt `WIDERRUFS_LISTE` und prüft
   Anbieter-Zertifikate dagegen. Die Lese-App tat es nicht — ein widerrufener
   Anbieter war dort schlicht nicht erkennbar, und die Marke sagte weiterhin
   „Zertifikat gültig".

   WARUM ES BIS HEUTE SO STAND, und warum die Begründung nicht mehr trägt: eine
   zweite, HANDGEPFLEGTE Kopie liefe auseinander, und eine leere Kopie sähe aus
   wie eine Prüfung. Beides stimmt — für eine handgepflegte. Eine ERZEUGTE Kopie
   kann nicht auseinanderlaufen, weil `--check` im `pre-commit` es verbietet.
   Dasselbe Muster wie `bereiche.json`, der Torwächter des Empfängers im Erzeuger
   und der JWS-Block.

   ERZEUGT WIRD DIE LISTE, NICHT DER WEG. `_jwkThumbprint` und die Prüfung selbst
   stehen als Code in der Lese-App — sie sind kein Drift-Gegenstand, sie müssen
   nur wort-für-wort dieselbe Rechnung machen wie der Kern (sonst ergäben sich
   andere Abdrücke, und die Liste ginge ins Leere).

   WELCHE LESE-APP — GEMESSEN, NICHT ENTSCHIEDEN: Es gibt zwei Linien. Die
   veröffentlichte ist b16 (`Vivodepot-intern/code/vivodepot-lesen.html`,
   Dateistand 29.05.2026, 1283 Zeilen). Sie kennt WEDER Anbieter-Zertifikate NOCH
   eine Prüfkette — gemessen: null Vorkommen von `jws`, `credential`, `signatur`
   ausserhalb eines Bild-Blobs. Für sie gibt es keinen Gegenstand, den eine
   Widerrufsliste bewachen könnte. Die u2-Linie in diesem Repo (4883 Zeilen) trägt
   die A318-Prüfkette; sie ist die einzige, in der diese Region etwas bedeutet.
   OB B16 WEITER DIE VERÖFFENTLICHTE BLEIBT, ist eine Produktfrage und
   hier nicht mitentschieden — sie ist im Bericht vorgelegt.
   ════════════════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const path = require('node:path');

const REPO = path.join(__dirname, '..');
const KERN = path.join(REPO, 'vivodepot.html');
const LESEN = path.join(REPO, 'vivodepot-lesen.html');
const BEGIN = '/* WIDERRUFSLISTE:BEGIN — generierter Bereich (tools/build-widerrufsliste.js); Quelle: vivodepot.html WIDERRUFS_LISTE */';
const ENDE = '/* WIDERRUFSLISTE:END */';

/* Die Liste aus dem Kern — als TEXT der Deklaration, nicht als ausgewerteter Wert. Den Kern
   dafür zu laden hiesse, für eine Zeile Text eine ganze Anwendung zu starten; und die Zeile ist
   die Quelle, nicht ihr Ergebnis. Die Form ist bewusst eng: eine Änderung, die sie nicht mehr
   trifft, soll ABBRECHEN und nicht still eine leere Liste erzeugen. */
function listeAusKern(quelle) {
  const m = quelle.match(/^const WIDERRUFS_LISTE = Object\.freeze\((\[[\s\S]*?\])\);/m);
  if (!m) throw new Error('WIDERRUFS_LISTE im Kern nicht gefunden — Form geändert? Nicht raten, nachsehen.');
  return m[1];
}

function region(listeText) {
  return [
    BEGIN,
    'const WIDERRUFS_LISTE = Object.freeze(' + listeText + ');   // RFC-7638-Thumbprints widerrufener Anbieter-Schluessel',
    ENDE,
  ].join('\n');
}

function regionErsetzen(quelle, neu, datei) {
  const a = quelle.indexOf(BEGIN), b = quelle.indexOf(ENDE);
  if (a < 0 || b < 0) throw new Error('WIDERRUFSLISTE-Marker fehlen in ' + datei);
  return quelle.slice(0, a) + neu + quelle.slice(b + ENDE.length);
}

function main() {
  const check = process.argv.includes('--check');
  const neuRegion = region(listeAusKern(fs.readFileSync(KERN, 'utf8')));
  const q = fs.readFileSync(LESEN, 'utf8');
  const neu = regionErsetzen(q, neuRegion, path.basename(LESEN));
  if (neu === q) {
    console.log('build-widerrufsliste: kein Drift — die Lese-App führt dieselbe Liste wie der Kern.');
    return;
  }
  if (check) {
    console.error('build-widerrufsliste: DRIFT — vivodepot-lesen.html (WIDERRUFSLISTE-Region)');
    console.error('  Abhilfe: node tools/build-widerrufsliste.js');
    process.exit(1);
  }
  fs.writeFileSync(LESEN, neu);
  console.log('build-widerrufsliste: Region geschrieben.');
}

if (require.main === module) main();
module.exports = { listeAusKern, region, regionErsetzen, BEGIN, ENDE, KERN, LESEN };
