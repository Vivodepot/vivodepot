#!/usr/bin/env node
'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   abdeckung-auswerten.js — Auftrag „Belegkette und Lücken"/„Auftragskette
   Nacht", Glied 2 (14./15.08.2026)
   ────────────────────────────────────────────────────────────────────────────
   Fasst V8-Coverage-Rohdaten (aus einem Lauf mit `NODE_V8_COVERAGE=<ordner>
   KERN_ABDECKUNG_TEMPDATEI=1 node --test`) zu Kern-Zeilen zusammen, die NIE
   ausgeführt wurden — über ALLE Coverage-Dateien im Ordner gemergt (deckt
   IRGENDEIN Testprozess die Zeile ab, zählt sie als ausgeführt).

   ERSTER LAUF MIT VORBEHALT (Auftragsvorgabe, wortgleich): dies ist eine
   GRUNDLINIE, kein vollständiger Beweis, dass eine Zeile für immer tot ist —
   nur, dass sie in DIESEM Lauf der Suite nicht lief. Kein Ziel-Prozentsatz,
   kein Gate — eine Prozentzahl, an der ein Gate hängt, erzeugt Tests, die die
   Zahl heben statt Fehler zu finden (Auftragsvorgabe).

   DREI GRUPPEN (mechanisch zugeordnet, nicht bewertet):
     - "toter-code": eine ganze Funktion ohne jeden Aufruf (0 Aufrufe laut
       V8-Function-Coverage für die Funktion selbst, nicht nur einzelne Zeilen
       darin).
     - "unerreichter-fehlerpfad": eine nie ausgeführte Zeile, die mit `throw`
       beginnt oder in einem `if`-Block direkt vor einem `throw`/`return`
       steht, dessen Bedingung eine Fehler-/Ausnahmebehandlung nahelegt
       (heuristisch an Schlüsselwörtern wie `throw`, `Fehler`, `error`,
       `!== null`, `catch`).
     - "sonst-ungeprobt": alles andere.

   Aufruf:
     node tools/abdeckung-auswerten.js --coverage-ordner <pfad>
     node tools/abdeckung-auswerten.js --coverage-ordner <pfad> --json
   ════════════════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const path = require('node:path');

const argv = process.argv.slice(2);
const arg = (n) => { const i = argv.indexOf('--' + n); return i >= 0 && argv[i + 1] ? argv[i + 1] : null; };
const COV_ORDNER = arg('coverage-ordner');
const ALS_JSON = argv.includes('--json');
const REPO = path.join(__dirname, '..');
const HTML_PATH = path.join(REPO, 'vivodepot.html');

function sammleCoverageDateien(ordner) {
  return fs.readdirSync(ordner).filter((f) => f.startsWith('coverage-') && f.endsWith('.json')).map((f) => path.join(ordner, f));
}

// Liefert für die Abdeckungs-Temp-Datei je Coverage-Lauf das `functions`-Array (V8-Rohform).
function sammleFunktionslisten(dateien) {
  const listen = [];
  for (const d of dateien) {
    let cov;
    try { cov = JSON.parse(fs.readFileSync(d, 'utf8')); } catch (_) { continue; }
    for (const entry of cov.result || []) {
      if (entry.url && entry.url.includes('vivodepot-kern-abdeckung')) listen.push(entry.functions);
    }
  }
  return listen;
}

// Mergt Ausführungszahlen über alle Läufe: ein Byte-Offset gilt als
// AUSGEFÜHRT, wenn IRGENDEIN Lauf dort count>0 hatte.
//
// FUND (14./15.08.2026, beim ersten Lauf): V8 legt für jede Datei EINE
// Pseudo-„Funktion" mit `functionName: ''` an, deren Range die GESAMTE Datei
// deckt (count = Zahl der Kompilierungen/Aufrufe des Skripts selbst, nicht
// der enthaltenen Funktionen) — ungefiltert übernommen, hätte sie JEDEN
// Offset als „ausgeführt" erscheinen lassen (100% bei einer Grundlinie mit
// bekannt toten Funktionen — ein Wächter, der nie rot werden kann, ist
// keiner). Ausschluss-Regel: eine Range, die mehr als die Hälfte der beiden
// Skript-Körper deckt, ist die Ganze-Datei-Pseudo-Range, keine reale
// Funktion — in einer 34.000-Zeilen-Datei deckt keine einzelne echte
// Funktion auch nur annähernd so viel.
//
// Granularität: NODE_V8_COVERAGE liefert hier durchgehend GENAU EINE Range
// je Funktion (kein Block-/Branch-Coverage innerhalb einer Funktion) — die
// Auswertung ist darum auf Funktions-Ebene genau (ganze Funktion ausgeführt
// oder nicht), nicht auf Verzweigungs-Ebene innerhalb einer ausgeführten
// Funktion.
function baueOffsetKarte(funktionslisten, skriptGesamtLaenge) {
  const SCHWELLE = skriptGesamtLaenge * 0.5;
  const ausgefuehrt = [];
  const alleFunktionen = new Map();
  for (const funktionen of funktionslisten) {
    for (const fn of funktionen) {
      const r0 = fn.ranges[0];
      if (!r0) continue;
      const spanne = r0.endOffset - r0.startOffset;
      if (spanne > SCHWELLE) continue;   // Ganze-Datei-Pseudo-Range — kein Funktionsfund
      const key = fn.functionName + '@' + r0.startOffset;
      const bisher = alleFunktionen.get(key) || { aufrufe: 0, startOffset: r0.startOffset, endOffset: r0.endOffset, name: fn.functionName };
      bisher.aufrufe += r0.count;
      alleFunktionen.set(key, bisher);
      if (r0.count > 0) ausgefuehrt.push([r0.startOffset, r0.endOffset]);
    }
  }
  return { ausgefuehrt, alleFunktionen };
}

function offsetAusgefuehrt(ausgefuehrt, off) {
  for (const [a, b] of ausgefuehrt) if (off >= a && off < b) return true;
  return false;
}

function klassifiziere(zeileText) {
  const t = zeileText.trim();
  if (/^throw\b/.test(t)) return 'unerreichter-fehlerpfad';
  if (/\b(Fehler|error|catch)\b/i.test(t) && /throw|return/.test(t)) return 'unerreichter-fehlerpfad';
  return 'sonst-ungeprobt';
}

function main() {
  if (!COV_ORDNER) {
    console.error('Aufruf: node tools/abdeckung-auswerten.js --coverage-ordner <pfad> [--json]');
    process.exitCode = 2;
    return;
  }
  const dateien = sammleCoverageDateien(COV_ORDNER);
  if (!dateien.length) {
    console.error('Keine Coverage-Dateien in ' + COV_ORDNER + ' gefunden.');
    process.exitCode = 2;
    return;
  }
  const funktionslisten = sammleFunktionslisten(dateien);
  if (!funktionslisten.length) {
    console.error('Keine Abdeckungs-Temp-Datei-Einträge in den Coverage-Dateien gefunden — lief der Lauf mit KERN_ABDECKUNG_TEMPDATEI=1?');
    process.exitCode = 2;
    return;
  }
  const html = fs.readFileSync(HTML_PATH, 'utf8');
  const { ausgefuehrt, alleFunktionen } = baueOffsetKarte(funktionslisten, html.length);

  const zeilen = html.split('\n');
  let off = 0;
  const zeilenOffsets = zeilen.map((z) => { const start = off; off += z.length + 1; return start; });

  // Nur die beiden <script>-Körper betrachten (Zeilen mit echtem Kern-Code) — script1/script2-Grenzen
  // aus vivodepot.html selbst ableiten (dieselbe Logik wie tests/load-kern.js extrahiereScripts).
  const o1 = html.indexOf('<script>');
  const c1 = html.indexOf('</script>', o1 + 8);
  const o2 = html.indexOf('<script>', c1);
  const c2 = html.indexOf('</script>', o2 + 8);

  const totListe = { 'toter-code': [], 'unerreichter-fehlerpfad': [], 'sonst-ungeprobt': [] };
  let geprueft = 0;
  let ausgefuehrtAnzahl = 0;

  // Ganze Funktionen ohne jeden Aufruf (V8-Function-Coverage, aufsummiert über alle Läufe).
  const toteFunktionen = new Set();
  const funktionsBereiche = []; // ALLE Funktions-Spannen (ausgeführt oder nicht) — für die
  // Top-Level-vs-Funktionskörper-Unterscheidung unten.
  for (const [, fn] of alleFunktionen) {
    if (fn.startOffset >= o1 && fn.startOffset < c2) {
      funktionsBereiche.push([fn.startOffset, fn.endOffset]);
      if (fn.aufrufe === 0 && fn.name && fn.name.length > 0) toteFunktionen.add(fn.name);
    }
  }
  // Wurde die Datei überhaupt geladen? (mind. ein Lauf mit dem Skript-Compile — jede Zeile
  // AUSSERHALB eines Funktionskörpers, also Top-Level-Deklarationen/Objektliterale, läuft beim
  // Laden linear mit und ist damit trivial "ausgeführt", sobald das Skript irgendwann lief.)
  const skriptGeladen = funktionslisten.length > 0;

  function innerhalbEinerFunktion(off) {
    for (const [a, b] of funktionsBereiche) if (off >= a && off < b) return true;
    return false;
  }

  for (let i = 0; i < zeilen.length; i++) {
    const start = zeilenOffsets[i];
    const inScript = (start >= o1 && start < c1) || (start >= o2 && start < c2);
    if (!inScript) continue;
    const t = zeilen[i].trim();
    if (!t || t.startsWith('//') || t.startsWith('/*') || t === '*/' || t.startsWith('*')) continue; // Kommentar/Leerzeile — keine ausführbare Zeile
    geprueft++;

    const inFunktion = innerhalbEinerFunktion(start);
    if (!inFunktion) {
      // Top-Level-Zeile (kein Funktionskörper) — läuft mit, sobald das Skript geladen wurde.
      if (skriptGeladen) { ausgefuehrtAnzahl++; continue; }
    } else if (offsetAusgefuehrt(ausgefuehrt, start)) {
      ausgefuehrtAnzahl++; continue;
    }

    const funktionsMatch = t.match(/^(?:async\s+)?function\s+([A-Za-z_$][A-Za-z0-9_$]*)\s*\(/);
    if (funktionsMatch && toteFunktionen.has(funktionsMatch[1])) {
      totListe['toter-code'].push({ zeile: i + 1, text: t.slice(0, 120), funktion: funktionsMatch[1] });
    } else {
      const klasse = klassifiziere(t);
      totListe[klasse].push({ zeile: i + 1, text: t.slice(0, 120) });
    }
  }

  const gesamtTot = totListe['toter-code'].length + totListe['unerreichter-fehlerpfad'].length + totListe['sonst-ungeprobt'].length;

  const ergebnis = {
    vorbehalt: 'ERSTER LAUF MIT VORBEHALT — Grundlinie aus einem Suite-Durchlauf, kein Beweis dauerhafter Totheit, kein Gate.',
    kernZeilenGeprueft: geprueft,
    ausgefuehrt: ausgefuehrtAnzahl,
    nieAusgefuehrt: gesamtTot,
    gruppen: {
      'toter-code': totListe['toter-code'].length,
      'unerreichter-fehlerpfad': totListe['unerreichter-fehlerpfad'].length,
      'sonst-ungeprobt': totListe['sonst-ungeprobt'].length,
    },
    funde: totListe,
  };

  const MARKDOWN_PFAD = arg('markdown-schreiben');
  if (MARKDOWN_PFAD) {
    const zeilenListe = (arr, n) => arr.slice(0, n).map((f) => `- Zeile ${f.zeile}${f.funktion ? ' (`' + f.funktion + '`)' : ''}: \`${f.text.replace(/`/g, "'")}\``).join('\n');
    const md = `# Abdeckungs-Grundlinie — Kern (vivodepot.html)

ERSTER LAUF MIT VORBEHALT. Gemessen mit \`node tools/abdeckung-auswerten.js\` gegen einen
vollständigen \`npm test\`-Durchlauf (${dateien.length} Coverage-Dateien, \`KERN_ABDECKUNG_TEMPDATEI=1\`).
Kein Ziel-Prozentsatz, kein Gate — eine Grundlinie zum Nachschlagen, ob eine spätere Änderung neue
tote Flächen aufreißt oder bestehende schließt. Erzeugt, nicht von Hand gepflegt: bei Bedarf mit
\`node tools/abdeckung-auswerten.js --coverage-ordner <ordner> --markdown-schreiben <datei>\`
neu erzeugen.

## Zahlen

- Kern-Zeilen geprüft (script1+script2, ohne Kommentare/Leerzeilen): **${geprueft}**
- Ausgeführt: **${ausgefuehrtAnzahl}**
- Nie ausgeführt: **${gesamtTot}**
  - toter-code (ganze Funktion nie aufgerufen): **${totListe['toter-code'].length}**
  - unerreichter-fehlerpfad (Zeile mit \`throw\`/Fehlerbehandlung, nie erreicht): **${totListe['unerreichter-fehlerpfad'].length}**
  - sonst-ungeprobt (alles andere): **${totListe['sonst-ungeprobt'].length}**

## Gruppe „toter-code" — vollständig (${totListe['toter-code'].length})

${zeilenListe(totListe['toter-code'], totListe['toter-code'].length)}

## Gruppe „unerreichter-fehlerpfad" — vollständig (${totListe['unerreichter-fehlerpfad'].length})

${zeilenListe(totListe['unerreichter-fehlerpfad'], totListe['unerreichter-fehlerpfad'].length)}

## Gruppe „sonst-ungeprobt" — erste 200 von ${totListe['sonst-ungeprobt'].length}

${zeilenListe(totListe['sonst-ungeprobt'], 200)}
`;
    fs.writeFileSync(MARKDOWN_PFAD, md, 'utf8');
    console.error(`[abdeckung-auswerten] Markdown geschrieben: ${MARKDOWN_PFAD}`);
    return;
  }

  if (ALS_JSON) {
    console.log(JSON.stringify(ergebnis, null, 1));
    return;
  }
  console.error(ergebnis.vorbehalt);
  console.error(`Kern-Zeilen geprüft: ${geprueft} — ausgeführt: ${ausgefuehrtAnzahl} — nie ausgeführt: ${gesamtTot}`);
  console.error(`  toter-code: ${totListe['toter-code'].length} · unerreichter-fehlerpfad: ${totListe['unerreichter-fehlerpfad'].length} · sonst-ungeprobt: ${totListe['sonst-ungeprobt'].length}`);
}

if (require.main === module) main();
module.exports = { sammleCoverageDateien, sammleFunktionslisten, baueOffsetKarte, klassifiziere };
