#!/usr/bin/env node
'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   adr-readme-erzeugen.js — „Die ADRs veröffentlichungsfähig machen"
   (13.08.2026), Zug 3.
   ────────────────────────────────────────────────────────────────────────────
   docs/adr/README.md wird ERZEUGT, nicht von Hand gepflegt: eine Tabelle über
   144+ Zeilen, die jemand nachträgt, ist beim zweiten ADR veraltet (Auftrag,
   Zug 3). Nummer und Datum kommen aus dem Dateinamen (nicht aus dem Titeltext —
   der Titel-Trenner ist im Bestand uneinheitlich, s. faktenbasis-erzeugen.js-
   Fund vom 13.08.: Dateiname ist die verlässliche Quelle). Status kommt aus der
   Zeile "**Status heute:** …", die Zug 1 desselben Auftrags in die einzelnen
   ADR-Dateien einträgt — fehlt sie, ist der Status "ungeprüft" (ehrlich
   eingestanden, nicht erfunden).

   `--check`: schreibt nichts, meldet Drift (Exit 1) — für den Wächter/Hook.
   Ohne Flag: schreibt docs/adr/README.md neu.
   `--ausgabe <pfad>`: schreibt/prüft dort statt docs/adr/README.md — stehende
   Regel „Prüfwerkzeuge nehmen den zu prüfenden Gegenstand als Argument"; hält
   die eigene Testsuite von der committeten Datei fern (Temp-Kopie).
   ════════════════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const path = require('node:path');

const REPO = path.join(__dirname, '..');
const ADR_DIR = path.join(REPO, 'docs', 'adr');
const CHECK = process.argv.includes('--check');
const AUSGABE_ARG_INDEX = process.argv.indexOf('--ausgabe');
const AUSGABE = AUSGABE_ARG_INDEX !== -1
  ? path.resolve(process.argv[AUSGABE_ARG_INDEX + 1])
  : path.join(ADR_DIR, 'README.md');

const AUSGENOMMEN = new Set(['README.md']);

/* U2-ADR-341b (06.09.2026) — GEZÄHLT, ABER NICHT GEZEIGT: die Zahl gemessen (315 Dateien),
   der Anker verfehlt (314 Tabellenzeilen). `\d{3}` allein traf `341b` nicht — die Zifferngruppe
   stoppte nach drei Stellen, der Rest der Regex verlangte danach sofort `-nachtrag` ODER einen
   Bindestrich, fand aber `b`, und die GANZE Regex schlug fehl. `m` wurde `null`, die Zeile bekam
   den rohen Dateinamen statt einer `U2-ADR-…`-Kennung als `nummer` — sie zählte mit, tauchte
   aber nie als `| U2-ADR-…`-Zeile auf. Ein Anker, der bei einem legitimen, bislang nicht
   vorgekommenen Dateinamen schweigend danebengreift, statt zu werfen, ist derselbe Fehler wie
   die raw-Text-Anker vom selben Abend (tools/sichten-erheben.js, tools/waechter-register.js) —
   hier nur nicht auf einen verschobenen Bestand, sondern auf einen neuen Namensraum. Der
   optionale Kleinbuchstabe hinter der Nummer ist jetzt Teil des Musters, nicht mehr ein Fall,
   den es nicht geben durfte. */
const DATEINAME_MUSTER = /^vivodepot-(U2-ADR-(\d{3}[a-z]?))(?:-nachtrag)?-.*-(\d{4}-\d{2}-\d{2})\.md$/i;

function sammleAdrDateien() {
  return fs.readdirSync(ADR_DIR)
    .filter(f => f.endsWith('.md') && !AUSGENOMMEN.has(f))
    .sort();
}

/* ── DREI STILLE AUSLASSER, gemessen 15.08.2026 (A245) ──────────────────────
   Die README meldete 10 × „ungeprüft". Sechs davon waren falsch, und zwar auf
   drei verschiedene Weisen — keine davon wurde je rot:

   (1) DIE AUFZAEHLUNGSFORM. U2-ADR-122 traegt seine Zeile als Listenpunkt
   (`- **Status heute:** gilt — Beleg …`). Der alte Anker `^\*\*` verlangte den
   Zeilenanfang und lief daran vorbei; die README behauptete „ungeprüft" ueber
   einen ADR, der einen benannten Test als Beleg fuehrt. Der Anker erlaubt jetzt
   den fuehrenden Listenstrich.

   (2) `abgelöst` ALS FUENFTES WORT. Vier ADRs (042, 046, 058, 064) sagen
   „abgelöst durch U2-ADR-x" bzw. „teilweise abgelöst durch …" — dieselbe
   Aussage wie „überholt durch", nur ein anderes Wort. Die Kategorie kannte es
   nicht, also fielen alle vier auf den Rueckfall „ungeprüft". Das ist die
   schlimmere Sorte Fehler: nicht „wir wissen es nicht", sondern „wir wissen es,
   und die Uebersicht sagt das Gegenteil". `abgelöst` ist jetzt als SYNONYM
   erfasst und wird auf das kanonische `überholt` normalisiert — die
   ADR-Texte bleiben unangetastet, die erzeugte Tabelle wird richtig.

   (3) `ungeprüft` WAR KEINE KATEGORIE, nur der Rueckfall. Vier ADRs schreiben
   ausdruecklich „ungeprüft — <Begruendung>" und landeten zufaellig richtig,
   weil der Rueckfall dasselbe Wort traegt. Ein Ergebnis, das nur deshalb
   stimmt, weil zwei verschiedene Wege zufaellig zusammenfallen, ist nicht
   geprueft. `ungeprüft` steht jetzt als eigene Kategorie in der Liste.

   Was der Rueckfall weiterhin bedeutet, und nur das: die Zeile FEHLT. Dass das
   auffaellt, prueft `tools/adr-readme-uebereinstimmung.js` (dritte Richtung) —
   hier bleibt es beim ehrlichen „ungeprüft", damit die Tabelle erzeugbar
   bleibt, auch waehrend eine neue ADR-Datei noch unfertig im Baum liegt. */
const DURCH = '(?:\\s+durch\\s+U2-ADR-\\d+(?:-Nachtrag)?)?';
const STATUS_KATEGORIE = new RegExp(
  '^(gilt'
  + `|teilweise (?:überholt|abgelöst)${DURCH}`
  + `|(?:überholt|abgelöst)${DURCH}`
  + '|gegenstandslos'
  + '|ungeprüft'
  + ')\\s*(\\([^)]*\\))?');

/* `abgelöst` und `überholt` sagen dasselbe; die README-Kopfzeile fuehrt nur
   `überholt`. Normalisiert wird darum die Ausgabe, nicht die Quelle. */
function kanonisch(wert) {
  return wert.replace(/\babgelöst\b/, 'überholt');
}

function statusHeute(dateiInhalt) {
  /* Der fuehrende `- ` ist erlaubt: eine Zeile als Listenpunkt ist dieselbe
     Aussage, und ein Wächter, der an der Einrueckung scheitert, misst Form
     statt Inhalt. */
  const treffer = dateiInhalt.match(/^(?:-\s+)?\*\*Status heute:\*\*\s*(.+)$/m);
  if (!treffer) return 'ungeprüft';
  const wert = treffer[1].trim();
  const kat = wert.match(STATUS_KATEGORIE);
  if (!kat) return 'ungeprüft';
  return kanonisch(kat[2] ? `${kat[1]} ${kat[2]}` : kat[1]);
}

function titelAusH1(dateiInhalt) {
  const treffer = dateiInhalt.match(/^#\s+(.+)$/m);
  if (!treffer) return '(kein H1-Titel gefunden)';
  return treffer[1]
    .replace(/^U2-ADR-\d{3}[a-z]?(?:-Nachtrag)?\s*/i, '')
    .replace(/^[\s:·—-]+/, '')
    .trim();
}

function baueZeile(datei) {
  const inhalt = fs.readFileSync(path.join(ADR_DIR, datei), 'utf8');
  const m = datei.match(DATEINAME_MUSTER);
  const istNachtrag = /-nachtrag-/i.test(datei);
  const nummer = m ? m[1] + (istNachtrag ? '-Nachtrag' : '') : datei;
  const datum = m ? m[3] : '(Datum nicht aus Dateiname ableitbar)';
  const titel = titelAusH1(inhalt);
  const status = statusHeute(inhalt);
  return { nummer, sortNummer: m ? parseInt(m[2], 10) : 9999, istNachtrag, datum, titel, status, datei };
}

function erzeugeMarkdown(zeilen) {
  const statusZaehlung = {};
  for (const z of zeilen) statusZaehlung[z.status] = (statusZaehlung[z.status] || 0) + 1;
  const zaehlungText = Object.entries(statusZaehlung)
    .sort((a, b) => b[1] - a[1])
    .map(([status, n]) => `${n} × ${status}`)
    .join(' · ');

  const kopf = `# ADR-Namensraum — kurz

Zwei disjunkte Nummernräume, unterschieden durch Präfix: **\`B16-ADR-NNN\`** (alte Linie, im
früheren internen Repo, beendet und eingefroren) und **\`U2-ADR-NNN\`** (diese Linie, aktiv).

Eine unpräfigierte Referenz in einem vor dem 20.07.2026 entstandenen Dokument meint B16 — U2
ist jünger, die Zuordnung ist damit eindeutig. Neue Referenzen tragen ab sofort immer ein
Präfix. Ein Nachtrag trägt die Nummer des ADRs, auf das er sich bezieht, plus \`-Nachtrag\` —
kein eigener Nummernschlitz.

Volle Begründung, verworfene Alternative und drei ausdrücklich benannte Zustände (Lücke
U2-ADR-007, U2-ADR-015, U2-ADR-077-Nachtrag): siehe **U2-ADR-090**
(\`vivodepot-U2-ADR-090-praefix-benennungsregel-2026-07-20.md\`).

## Versionierungs-Regel

- Monotone Nummernfolge, beginnend bei \`U2-ADR-001\`.
- **Keine \`v\`-Suffixe.** Wird eine Entscheidung iteriert, bekommt sie eine **neue Nummer** mit explizitem Vorgänger-Verweis; die alte erhält den Nachfolger-Verweis und den Status \`Ersetzt durch …\`.
- Das ist die bewusste Abweichung vom Produktiv-Vorbild, wo Doppel-Belegungen (v1/v2 auf gleicher Nummer) als Drift entstanden sind.

## Datei-Konventionen

- Eine Datei pro Entscheidung, keine erneute Belegung einer Nummer.
- Header-Block: \`# U2-ADR-NNN: Titel\`, \`**Status:**\`, \`**Datum:**\`, \`**Kategorie:**\`.
- Implementations-Verweis (Commit-Hash oder Sprint-Bericht), sobald umgesetzt.
- Vorgänger-/Nachfolger-Beziehung explizit nennen; Cross-Referenzen auf den Produktiv-Kanon mit nacktem \`ADR-NNN\`.
- Ein ADR nennt die Entscheidung, ihre Gründe, Folgen und Prüfungen — nicht, wer entschieden, gemessen, gefunden oder beauftragt hat, und keine beteiligten Arbeitssitzungen (Wortliste \`tools/lib/adr-entscheider-muster.js\`, gehalten von der Ratsche \`tools/oeffentlicher-zuschnitt-spuren-pruefen.js\`).

(Beide Abschnitte wortgleich übernommen aus dem abgelösten \`vivodepot-U2-INDEX-2026-05-29.md\`
— Festlegungen, keine Beschreibungen, darum nicht neu formuliert. Datei aus \`docs/adr/\`
entfernt, liegt als Zeitzeuge außerhalb des Repos.)

## Interne Quellen in \`Grundlage:\` und \`Bezug:\`

Historische ADRs nennen in ihren \`Grundlage:\`- und \`Bezug:\`-Feldern zum Teil interne
Arbeitsdokumente, die nicht Teil dieses Repos sind (etwa ein Krypto-Gutachten oder eine frühere
Krypto-Architektur-Fassung). Die Verweise bleiben stehen — sie belegen, worauf die Entscheidung
damals beruhte, und das bleibt wahr, auch wenn die Quelle selbst nicht einsehbar ist. Die
Entscheidungen tragen sich ohne diese Quellen: Was gilt, steht in der ADR selbst, und was davon
geprüft ist, steht im \`konformitaet\`-Block der Datei (\`pruefung:\`-Zeile).

## Status je ADR

Vier Zustände: **gilt** (Beleg am Code geführt) · **teilweise überholt** / **überholt** durch ein
anderes U2-ADR · **gegenstandslos** (der Gegenstand existiert nicht mehr) · **ungeprüft** (noch
nicht durchgesehen — ehrlich offen, nicht erfunden). Diese Tabelle wird erzeugt
(\`tools/adr-readme-erzeugen.js\`), nicht von Hand gepflegt.

**Stand:** ${zeilen.length} Dateien — ${zaehlungText}.

| Nummer | Titel | Status | Datum |
| --- | --- | --- | --- |
`;
  const rumpf = zeilen
    .sort((a, b) => a.sortNummer - b.sortNummer || (a.istNachtrag ? 1 : -1))
    .map(z => `| ${z.nummer} | ${z.titel} | ${z.status} | ${z.datum} |`)
    .join('\n');

  return kopf + rumpf + '\n' + erzeugeIndexNachStatus(zeilen);
}

/* „367 ADRs — prüfen, sortieren, indexieren" (10.09.2026), Teil 3
   (Indexieren). BEWUSST KEINE zweite Pipe-Tabelle: `tools/adr-readme-uebereinstimmung.js`
   liest jede Zeile, die mit `| U2-ADR-` beginnt, als Bestandseintrag
   (`readmeEintraege()`) — eine zweite Tabelle im selben Format würde jede ADR
   doppelt zählen und den Wächter zu Unrecht rot werden lassen. Eine Aufzählung
   ohne führendes `|` ist für jenen Wächter unsichtbar, für eine Leserin nicht.

   NUR NACH STATUS, NICHT NACH THEMA: das bestehende `**Kategorie:**`-Feld
   (189 von 366 Dateien, Stand 10.09.2026) ist freier Text, uneinheitlich
   geschrieben (`WERKZEUG`/`WERKZEUGE`, `PRÜF-ARCHITEKTUR`/`PRÜFARCHITEKTUR`,
   `Gerüst`/`GERÜST`) und zu 46 % auf eine einzige Kategorie (ARCHITEKTUR)
   verdichtet — ein Index, der das ungeprüft übernähme, wäre eine Behauptung
   von Ordnung, die der Bestand nicht trägt. Eine saubere Themen-Gruppierung
   ist Inhaltsarbeit über 366 Dateien, keine mechanische Ableitung — Befund
   und Empfehlung dazu stehen im Bericht dieses Auftrags, nicht hier gebaut. */
function erzeugeIndexNachStatus(zeilen) {
  const BUCKETS = ['gilt', 'teilweise überholt', 'überholt', 'gegenstandslos', 'ungeprüft'];
  const bucketVon = (status) => BUCKETS.find((b) => status === b || status.startsWith(b + ' ') || status.startsWith(b + '(')) || 'ungeprüft';
  const jeBucket = {};
  for (const b of BUCKETS) jeBucket[b] = [];
  for (const z of zeilen) jeBucket[bucketVon(z.status)].push(z.nummer);

  let out = '\n## Index nach Status\n\n'
    + 'Dieselben Dateien wie oben, nach `**Status heute:**`-Grundwert gruppiert — zum '
    + 'Überfliegen, nicht als zweite Quelle (die Tabelle oben trägt Titel und Datum).\n\n';
  for (const b of BUCKETS) {
    const nummern = jeBucket[b];
    out += `**${b}** (${nummern.length}): ${nummern.length ? nummern.join(', ') : '—'}\n\n`;
  }
  return out;
}

function main() {
  const zeilen = sammleAdrDateien().map(baueZeile);
  const markdown = erzeugeMarkdown(zeilen);

  if (CHECK) {
    const bestehend = fs.existsSync(AUSGABE) ? fs.readFileSync(AUSGABE, 'utf8') : null;
    if (bestehend !== markdown) {
      console.error('[adr-readme-erzeugen] Drift: docs/adr/README.md ist nicht aktuell — `node tools/adr-readme-erzeugen.js` laufen lassen.');
      process.exit(1);
    }
    console.log('[adr-readme-erzeugen] docs/adr/README.md ist aktuell.');
    return;
  }

  fs.writeFileSync(AUSGABE, markdown, 'utf8');
  console.log(`[adr-readme-erzeugen] ${AUSGABE} geschrieben — ${zeilen.length} ADR-Dateien erfasst.`);
}

main();
