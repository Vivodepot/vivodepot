#!/usr/bin/env node
'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   W-webseite-stand — die Webseite prüfen, ohne sie ins Repo zu holen
   ────────────────────────────────────────────────────────────────────────────
   DIE ENTSCHEIDUNG VOM 12.08. BLEIBT: die Webseite wird nicht ins Repo
   committet. Sie ist bereits versioniert — datierte Ordner `TTMMJJJJ` unter
   `docs/webseite/` im Repo `Vivodepot-intern`, jeder mit eigener
   `HOCHLADEANWEISUNG.txt`, dazu `STAND.txt`, die den Live-Ordner benennt.
   **Was fehlt, ist nicht die Versionierung, sondern die Prüfung.**

   DER PRÜFER KOMMT INS REPO, DIE WEBSEITE NICHT. Bauart wie
   `tools/entscheidungen-abloese-pruefen.js`: mit `--verzeichnis <pfad>` läuft
   er gegen den echten Bestand ausserhalb des Repos, ohne ihn zu verfolgen;
   OHNE Argument gegen die Fixture `tests/fixtures/webseite-beispiel/`, damit
   die Suite ihn selbst prüfen kann — auch auf einer Maschine, die
   `Vivodepot-intern` gar nicht hat.

   DREI PRÜFUNGEN:

   A · SAGT `STAND.txt` DIE WAHRHEIT? Gibt es einen datierten Ordner, der neuer
       ist als der als live benannte, wird das gemeldet.
       WAS DIESE PRÜFUNG NICHT BEHAUPTET, und der Unterschied ist der ganze
       Wert: sie sagt NICHT „STAND.txt lügt". Ein neuerer Ordner ist der
       Regelfall — er entsteht bei jeder Änderung und wartet auf den Upload;
       `STAND.txt` wird laut ihrer eigenen Regel erst DANACH nachgezogen, und
       das ist ein Handgriff der Herausgeberin. Der Befund lautet darum: **die Datei kennt
       zwei Zustände (live / Archiv) und keinen dritten (erzeugt, wartet).**
       Wer einen dritten einführt, macht diese Prüfung nicht falsch — er gibt
       ihr etwas zu lesen (s. `WARTET_MARKE`).

   B · IST JEDER ORDNER VOLLSTÄNDIG IM SINNE DER REGEL? Eigene
       `HOCHLADEANWEISUNG.txt`, und die HTML-Dateien des Live-Ordners auch in
       den neueren. FEHLENDE DAUERHAFTE DATEIEN SIND KEIN BEFUND
       (`style.css`, Schriften, Logos, Fotos) — das steht so in `STAND.txt`,
       und eine Prüfung, die dagegen anschlägt, misst die Regel falsch herum.

   C · TRAGEN DIE FÄHIGKEITSAUSSAGEN NOCH? Der Live-Ordner läuft durch
       denselben Anker-Prüfer wie die Repo-Dokumente
       (`tools/aussagen-abgleich-pruefen.js`) — kein zweiter Mechanismus für
       dieselbe Frage.

   NICHT ÄNDERN. Der Prüfer meldet. Was an der Webseite geändert wird,
   entscheidet die Herausgeberin, und es entsteht nach der Regel vom 12.08. als NEUER
   datierter Ordner — nie durch Änderung eines ausgelieferten.

   Aufruf:
     node tools/webseite-stand-pruefen.js                      Fixture-Selbsttest
     node tools/webseite-stand-pruefen.js --verzeichnis <pfad> echter Bestand
     node tools/webseite-stand-pruefen.js … --gate             Exit 1 bei Fund
   ════════════════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const path = require('node:path');

const REPO = path.join(__dirname, '..');
const FIXTUR = path.join(REPO, 'tests', 'fixtures', 'webseite-beispiel');
const argv = process.argv.slice(2);
const arg = (n) => { const i = argv.indexOf('--' + n); return i >= 0 && argv[i + 1] ? argv[i + 1] : null; };
const VERZEICHNIS = arg('verzeichnis') ? path.resolve(arg('verzeichnis')) : FIXTUR;
const IST_FIXTUR = !arg('verzeichnis');

/* Dauerhafte Dateien liegen auf dem Server und werden nicht mit jedem Ordner neu
   ausgeliefert — ihr Fehlen ist ausdrücklich KEIN Befund (Regel in STAND.txt). */
const DAUERHAFT = /^(style\.css|.*\.woff2?|logo\.png|stick\.png|favicon\.png|img-.*\.(jpg|png|webp))$/i;
/* Die Marke, mit der ein dritter Zustand in STAND.txt gelesen würde, wenn er je
   eingeführt wird. Heute kommt sie dort nicht vor — der Prüfer sucht sie trotzdem,
   damit er nicht nachgebaut werden muss, sondern nur die Datei ergänzt. */
const WARTET_MARKE = /ERZEUGT,?\s*WARTET|WARTET AUF UPLOAD|NOCH NICHT HOCHGELADEN/i;

const ORDNER = /^\d{8}$/;                       // TTMMJJJJ
/* AB WANN DIE REGEL GILT. Sie gilt seit der Entscheidung vom 12.08.2026; Ordner, die davor
   entstanden sind, tragen keine HOCHLADEANWEISUNG.txt und sind deswegen nicht mangelhaft —
   sie sind älter als die Regel. Eine Prüfung, die rückwirkend anschlägt, misst nicht die
   Regel, sondern die Zeit vor ihr; gemessen am echten Bestand waren das vier von acht
   Befunden, alle unberechtigt.
   ÄLTERE ORDNER MIT VIERSTELLIGEM NAMEN (`0907`, `2605` …) fallen schon durch `ORDNER`
   heraus — sie folgen einem früheren Namensmuster. Das gehört gesagt, damit „acht Ordner"
   nicht wie „alle Ordner" gelesen wird. */
const REGEL_GILT_AB = Date.UTC(2026, 7, 12);   // 12.08.2026
function alsDatum(name) {
  const t = Number(name.slice(0, 2)), m = Number(name.slice(2, 4)), j = Number(name.slice(4));
  return new Date(Date.UTC(j, m - 1, t)).getTime();
}

/* `--stand <pfad>` liest die STAND.txt von woanders, bei unverändertem Verzeichnis. Die
   stehende Schreibregel verlangt den Gegenstand als Argument; hier ist der Gegenstand die
   STEUERDATEI, nicht der Bestand. Ohne sie liesse sich der Rot-Beleg nur führen, indem man
   die echte STAND.txt der Webseite verbiegt — eine Datei, die CC ausdrücklich nicht ändert. */
function bestandLesen(verzeichnis, standErsatz) {
  if (!fs.existsSync(verzeichnis)) throw new Error('Verzeichnis nicht gefunden: ' + verzeichnis);
  const eintraege = fs.readdirSync(verzeichnis, { withFileTypes: true });
  const ordner = eintraege.filter((e) => e.isDirectory() && ORDNER.test(e.name)).map((e) => e.name)
    .sort((a, b) => alsDatum(a) - alsDatum(b));
  const standPfad = standErsatz ? path.resolve(standErsatz) : path.join(verzeichnis, 'STAND.txt');
  const stand = fs.existsSync(standPfad) ? fs.readFileSync(standPfad, 'utf8') : null;
  return { verzeichnis, ordner, stand, standPfad };
}

function liveOrdnerLesen(standText) {
  if (!standText) return null;
  const m = /AKTUELL LIVE:\s*(\d{8})/.exec(standText);
  return m ? m[1] : null;
}

function pruefen(verzeichnis = VERZEICHNIS, standErsatz) {
  const b = bestandLesen(verzeichnis, standErsatz);
  const funde = [];
  if (!b.stand) {
    funde.push({ pruefung: 'A', art: 'kein-stand', ort: 'STAND.txt',
      satz: 'Es gibt keine STAND.txt — niemand kann sagen, welcher Ordner live ist.' });
    return { bestand: b, live: null, funde };
  }
  const live = liveOrdnerLesen(b.stand);
  if (!live) {
    funde.push({ pruefung: 'A', art: 'kein-live', ort: 'STAND.txt',
      satz: 'STAND.txt nennt keinen Live-Ordner („AKTUELL LIVE: TTMMJJJJ").' });
  }

  // A · neuere Ordner als der als live benannte
  if (live) {
    const neuere = b.ordner.filter((o) => alsDatum(o) > alsDatum(live));
    const kenntWarten = WARTET_MARKE.test(b.stand);
    for (const o of neuere) {
      if (kenntWarten && new RegExp(o).test(b.stand)) continue;   // ausdrücklich als wartend geführt
      funde.push({ pruefung: 'A', art: 'neuerer-ordner', ort: o,
        satz: 'Der Ordner ist neuer als der als live benannte (' + live + ') und steht in STAND.txt '
          + (new RegExp(o).test(b.stand) ? 'ohne Zustand.' : 'gar nicht.')
          + ' Die Datei kennt live und Archiv — einen dritten Zustand („erzeugt, wartet auf Upload") nicht.' });
    }
  }

  // B · Vollständigkeit im Sinne der Regel
  const htmlVon = (o) => fs.readdirSync(path.join(b.verzeichnis, o)).filter((n) => /\.html$/i.test(n));
  const liveHtml = live && b.ordner.includes(live) ? htmlVon(live) : [];
  for (const o of b.ordner) {
    const dateien = fs.readdirSync(path.join(b.verzeichnis, o));
    if (alsDatum(o) < REGEL_GILT_AB) continue;      // älter als die Regel — kein Befund
    if (!dateien.includes('HOCHLADEANWEISUNG.txt')) {
      funde.push({ pruefung: 'B', art: 'ohne-anweisung', ort: o,
        satz: 'Der Ordner trägt keine eigene HOCHLADEANWEISUNG.txt — die Regel vom 12.08. verlangt sie.' });
    }
    if (!live || o === live || alsDatum(o) < alsDatum(live)) continue;   // Archiv wird nicht nachgeprüft
    for (const h of liveHtml) {
      if (!dateien.includes(h)) {
        funde.push({ pruefung: 'B', art: 'unvollstaendig', ort: o + '/' + h,
          satz: 'Ein neuerer Ordner ist unvollständig: die Regel verlangt VOLLSTÄNDIGE Ordner, '
            + 'nicht nur die geänderte Datei.' });
      }
    }
    for (const d of dateien) {
      if (DAUERHAFT.test(d)) continue;   // dauerhafte Server-Dateien: ausdrücklich kein Befund
    }
  }

  /* C · TRAGEN DIE FÄHIGKEITSAUSSAGEN DES LIVE-ORDNERS NOCH?
     ZU WENIG GESAGT ist hier die scharfe Richtung, und der bekannte Fall zeigt warum: die
     Webseite sagt, die Lese-Begleitdatei lese „übergebene Dateien und eingefügten QR-Text".
     Seit dem 20.08. setzt sie mehrteilige QR-Serien zusammen und liest über den QR-Leser des
     Browsers. DIE AUSSAGE IST NICHT FALSCH, SIE IST ZU KLEIN — und eine Prüfung, die nur nach
     Falschem sucht, findet das nie.
     GEMESSEN WIRD AM CODE, nicht an einer Wortliste: die Fähigkeit heisst im Empfänger
     `qrTeileZusammensetzen` bzw. `renderKamera`. Trägt die Lese-App sie und nennt die Webseite
     sie nicht, ist das der Befund. */
  const zuWenig = [
    { faehigkeit: 'qrTeileZusammensetzen', datei: 'vivodepot-lesen.html',
      wort: /mehrteilig|zusammen(setz|gesetzt)|Serie/i,
      satz: 'Die Lese-App setzt mehrteilige QR-Serien zusammen; die Seite sagt es nicht.' },
    { faehigkeit: 'renderKamera', datei: 'vivodepot-lesen.html',
      wort: /Kamera[ -]?(lesen|Scan)|mit der Kamera|scannen/i,
      satz: 'Die Lese-App liest QR über den Browser-QR-Leser; die Seite nennt nur eingefügten Text.' },
  ];
  if (live && b.ordner.includes(live)) {
    const liveTexte = fs.readdirSync(path.join(b.verzeichnis, live))
      .filter((n) => /\.html$/i.test(n))
      .map((n) => fs.readFileSync(path.join(b.verzeichnis, live, n), 'utf8')).join('\n');
    const nenntLeseApp = /vivodepot-lesen\.html/.test(liveTexte);
    for (const z of zuWenig) {
      const quelle = path.join(REPO, z.datei);
      if (!fs.existsSync(quelle)) continue;
      const kannEs = fs.readFileSync(quelle, 'utf8').includes('function ' + z.faehigkeit);
      if (kannEs && nenntLeseApp && !z.wort.test(liveTexte)) {
        funde.push({ pruefung: 'C', art: 'zu-wenig-gesagt', ort: live + ' (Fähigkeit ' + z.faehigkeit + ')',
          satz: z.satz + ' Nicht falsch — zu klein. Ändern entscheidet die Herausgeberin, und es entsteht '
            + 'als NEUER datierter Ordner.' });
      }
    }
  }
  return { bestand: b, live, funde };
}

function main() {
  let r;
  try { r = pruefen(VERZEICHNIS, arg('stand')); }
  catch (e) { console.error('webseite-stand: ' + e.message); process.exit(1); }
  const wo = IST_FIXTUR ? 'Fixture (tests/fixtures/webseite-beispiel)' : r.bestand.verzeichnis;
  console.log('webseite-stand: ' + r.bestand.ordner.length + ' datierte Ordner, live: '
    + (r.live || '—') + ', ' + r.funde.length + ' Befund(e).');
  console.log('  Suchraum: ' + wo);
  for (const f of r.funde) console.log('  [' + f.pruefung + '] ' + f.ort + ' — ' + f.satz);
  if (argv.includes('--gate') && r.funde.length) process.exit(1);
  /* `--selbstprobe`: die POSITIVKONTROLLE, und sie ist der Grund, warum dieser Prüfer im
     `pre-commit` hängen kann, obwohl sein eigentlicher Gegenstand in einem anderen Repo liegt.
     Die Fixture trägt den Fall ABSICHTLICH (ein neuerer Ordner als der als live benannte).
     Findet der Prüfer ihn nicht mehr, ist ER kaputt — und das ist es, was hier gated.
     Ohne diese Kontrolle wäre der Eintrag im Hook ein Zettel: ein Lauf, der nie rot wird,
     ist von einem Lauf, der nichts misst, nicht zu unterscheiden. */
  if (argv.includes('--selbstprobe')) {
    const a = r.funde.filter((f) => f.pruefung === 'A');
    if (a.length !== 1) {
      console.error('webseite-stand: SELBSTPROBE FEHLGESCHLAGEN — die Fixture trägt genau EINEN '
        + 'A-Fall, gefunden: ' + a.length + '. Der Prüfer misst nicht mehr, was er messen soll.');
      process.exit(1);
    }
    console.log('  Selbstprobe: der eingebaute Fall wird gefunden (1 A-Befund).');
  }
}

if (require.main === module) main();
module.exports = { pruefen, bestandLesen, liveOrdnerLesen, alsDatum, FIXTUR, DAUERHAFT, WARTET_MARKE };
