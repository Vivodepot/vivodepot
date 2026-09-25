#!/usr/bin/env node
'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   W-aussagen — Außenaussagen gegen den lebenden Code, in BEIDE Richtungen
   ────────────────────────────────────────────────────────────────────────────
   WARUM ES DIESEN PRÜFER GIBT. An EINEM Tag ist derselbe Fall dreimal
   aufgetreten: etwas ist gebaut oder entschieden, und ein Dokument nach aussen
   sagt etwas anderes. Alle drei wurden gefunden, weil ein Mensch von Hand
   nachgesehen hat. Ein viertes Mal wird nicht gefunden, wenn niemand hinsieht.

   ER SUCHT DEN GEGENSTAND, NICHT SEINEN NAMEN — Bauart wie
   `tools/krypto-block-propagation-pruefen.js`. Eine gepflegte Liste von
   Aussagen wäre dieselbe Fehlerklasse in Grün: sie kennt nur, was schon einmal
   gefunden wurde (der Satz steht wörtlich in
   `tools/w15-eine-quelle-statt-kopien-pruefen.js`). Der Prüfer geht darum die
   Aussen-Dokumente ab und liest die ANKER heraus, die sie selbst setzen.

   WAS EIN ANKER IST — vier Sorten, jede aus den Funden vom 20.08. abgeleitet:

     1 · KANAL-KENNUNG    Eine Kennung in Backticks, die ein Import-/Export-
                          Register führen müsste (`fhir-ips`, `camt053` …).
                          Fehlt sie im Register: das Dokument verspricht einen
                          Kanal, den es nicht gibt.  → Richtung A
     2 · KANAL-FLAG       Ein Flag, das dem Kanal in derselben Zeile zugeschrieben
                          wird (`nurImport`, `nurExport`, `signiert`,
                          `ohneAuswahl`). Stimmt es nicht: das Dokument
                          beschreibt den Kanal falsch.                → Richtung C
     3 · ZAHL MIT GEGENSTAND  Eine Zahl, der ein gemessenes Gegenstandswort folgt
                          („257 Felder", „Schema-Version 62").        → Richtung C
     4 · STANDARD-FAMILIE Eine Fähigkeitsklasse im Code, die das Dokument
                          gattungsmässig beschreibt, ohne sie zu nennen.
                          Heute: jeder Kanal mit `signiert: true` beruht auf
                          einer fremden Nachweis-Spezifikation.       → Richtung B

   DER ROT-BEWEIS DIESES PRÜFERS IST W3C VC — und er ist der Grund für Sorte 4.
   Die Kanal-Kennung `provider-credential` STEHT in `STANDARDS.md`; eine Prüfung,
   die nur Kennungen vergleicht, wäre grün geblieben. Das Dokument nennt aber
   die zugrundeliegende Spezifikation nirgends, obwohl es „Standards, die der
   Code tatsächlich erzeugt und liest" heisst. Wer Sorte 4 weglässt, misst
   nicht, was dieser Prüfer zu messen vorgibt.

   DATIERTE STELLEN SIND AUSGENOMMEN, strukturell und nicht heuristisch: eine
   Zeile oder ein Abschnitt mit „Stand: TT.MM.JJJJ" erzählt einen vergangenen
   Tag. `docs/pruefebene.md` nennt Schema 63 und trägt „Stand: 14.08.2026" —
   das war richtig und bleibt es. `STANDARDS.md` nennt Schema 62 unter der
   Überschrift „Umfang der Erhebung", ohne Datum, und behauptet damit einen
   heutigen Stand.

   GRUNDLINIE STATT NULLTOLERANZ, Bauart wie `tools/pages-lockstep-pruefen.js`:
   ein Gate, das ab dem ersten Commit dauerhaft rot steht, wird nicht ernst
   genommen. Gemeldet wird, wenn der Abstand WÄCHST.

   Aufruf:
     node tools/aussagen-abgleich-pruefen.js                 Bericht
     node tools/aussagen-abgleich-pruefen.js --gate          Exit 1 bei Zuwachs
     node tools/aussagen-abgleich-pruefen.js --grundlinie-schreiben
     node tools/aussagen-abgleich-pruefen.js --repo <pfad>   (Rot-Beweis an einer Kopie)
   ════════════════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { suiteDateien } = require('../scripts/suite-dateien-kern.js');

const argv = process.argv.slice(2);
const argWert = (n) => { const i = argv.indexOf('--' + n); return i >= 0 && argv[i + 1] ? argv[i + 1] : null; };
const REPO = argWert('repo') ? path.resolve(argWert('repo')) : path.join(__dirname, '..');
const GRUNDLINIE = path.join(__dirname, 'aussagen-abgleich-grundlinie.json');

/* ── DIE TRÄGER — gefunden, nicht aufgezählt ──────────────────────────────────
   Ein Aussen-Dokument ist, was im Repo liegt und nach aussen spricht: die
   mitgelieferten Textdateien der Wurzel und die Dokumente unter `docs/`.
   AUSGENOMMEN, und zwar strukturell:
     · `docs/adr/`        — hält VERGANGENHEIT fest; sie nachzuziehen hiesse,
                            die Historie zu fälschen (dieselbe Ausnahme wie im
                            Krypto-Propagations-Prüfer).
     · `docs/faktenbasis.md`     — ERZEUGT (`tools/faktenbasis-erzeugen.js`) und
                            hat ihr eigenes Gate; sie hier mitzuprüfen hiesse,
                            dieselbe Zahl zweimal zu bewachen.
     · dieser Prüfer und seine Probe — ihr Gegenstand sind Aussagen im Klartext.

   ENTFERNT (U2-ADR-380, 08.09.2026, Auftrag „tote Ausnahmen"): zwei vermeintlich tote
   Einträge — das `.html`-Muster der Spezifikation zu Recht (die Spezifikation liegt heute als
   `.md` unter `docs/spec/`, ein `.html`-Muster an der Wurzel hätte sie nie erreicht).

   NACHTRAG (10.09.2026, Auftrag „Prüfer lesen die Platte statt git"): `docs/
   ARBEITSLISTE-v1.md` war der andere Eintrag NICHT zu Recht entfernt. Die Datei verliess am
   15.08.2026 das TRACKING, nicht das DATEISYSTEM — sie ist seither gitignored
   (`.gitignore:docs/ARBEITSLISTE-v1.md`) und bleibt, wie die `.gitignore` dort selbst sagt,
   lokal bewusst stehen. `traegerFinden()` las mit `fs.readdirSync(docs)` die PLATTE, nicht
   den Git-Index — und fand die 1,7-MB-Datei darum in jedem Baum wieder, der sie lokal liegen
   hat, obwohl die Ausnahme sie ausdrücklich ausschliessen sollte. Befund: derselbe Commit
   `bdeef921` lief im Hauptbaum (Datei lokal vorhanden) rot und in einem frischen Arbeitsbaum
   (Datei fehlt dort strukturell) grün — ein Prüfer, dessen Ergebnis vom Arbeitsbaum abhängt.
   Die Umkehrung von U2-ADR-228: die Trägermenge kommt jetzt aus `git ls-files`, nicht aus
   Nodes eigener Verzeichnis-Suche — dieselbe Bauart wie `scripts/suite-dateien-kern.js`. Die
   `AUSGENOMMEN`-Zeile für `docs/ARBEITSLISTE-v1.md` bleibt darum WEG: eine git-getrackte
   Trägersuche kann die Datei gar nicht mehr finden, gitignored oder nicht. */
const AUSGENOMMEN = [/^docs\/adr\//, /^docs\/faktenbasis\.md$/];

/* GIT STATT PLATTE — U2-ADR-228 auf diesen Prüfer angewandt. `GIT_*`-Umgebung wird gestrippt
   wie in `scripts/suite-dateien-kern.js`: während eines echten Hook-Laufs setzt git `GIT_DIR`/
   `GIT_INDEX_FILE`, und die gewinnen gegen `cwd` — ein `git ls-files` gegen EIN Repo würde
   sonst für ein anderes antworten. */
function ohneGitUmgebung() {
  const e = { ...process.env };
  for (const k of Object.keys(e)) if (k.startsWith('GIT_')) delete e[k];
  return e;
}
function gitGetrackt(repo, unter) {
  const roh = execFileSync('git', ['ls-files', unter], { cwd: repo, encoding: 'utf8', env: ohneGitUmgebung() });
  return roh.split('\n').filter(Boolean);
}
/* Nur die UNMITTELBAREN Kinder von `unter` — kein Abstieg in Unterordner, dieselbe Tiefe wie
   das vorherige `fs.readdirSync(unter)` (nicht rekursiv). */
function gitGetracktFlach(repo, unter) {
  const praefix = unter + '/';
  return gitGetrackt(repo, unter)
    .filter((p) => p.startsWith(praefix) && !p.slice(praefix.length).includes('/'));
}

function traegerFinden(repo) {
  const raus = [];
  const wurzelDateien = gitGetrackt(repo, '.').filter((p) => !p.includes('/'));
  for (const n of wurzelDateien) {
    if (/\.(md|cff)$/.test(n) || n === 'THIRD_PARTY_LICENSES') raus.push(n);
  }
  for (const p of gitGetracktFlach(repo, 'docs')) {
    if (/\.md$/.test(p)) raus.push(p);
  }
  /* DIE KLASSE, DIE AM LEICHTESTEN VERGESSEN WIRD: die Anwendungen selbst. Sie tragen Aussagen
     im Bedientext, in Erklärtexten und in PDF-Fusszeilen — und sie sehen nicht wie ein Dokument
     aus. Sie werden hier NICHT aufgezählt, sondern gefunden: jede `.html` der Wurzel plus alles
     unter `pages/`. Eine achte Anwendung, die niemand einträgt, wird damit trotzdem gelesen. */
  for (const n of wurzelDateien) {
    if (/\.html$/.test(n)) raus.push(n);
  }
  for (const p of gitGetracktFlach(repo, 'pages')) {
    if (/\.(html|md|webmanifest|js)$/.test(p)) raus.push(p);
  }
  return raus.filter((p) => !AUSGENOMMEN.some((re) => re.test(p))).sort();
}

/* ── DER LEBENDE STAND — gemessen, nie aus einem Dokument gelesen ─────────── */
function standMessen(repo, opt) {
  const mitSuite = !!(opt && opt.mitSuite);
  const { ladeKern } = require(path.join(repo, 'tests', 'load-kern.js'));
  const { V } = ladeKern();
  const kern = fs.readFileSync(path.join(repo, 'vivodepot.html'), 'utf8');
  const zahl = (re) => { const m = re.exec(kern); return m ? Number(m[1]) : null; };

  let felder = 0, unterfelder = 0;
  for (const s of V.bereicheAlle()) {
    for (const sek of (s.sektionen || [])) {
      for (const f of (sek.felder || [])) { felder++; unterfelder += (f.unterFelder || []).length; }
    }
  }
  const kanaele = new Map();
  const merke = (def, richtung) => {
    const e = kanaele.get(def.id) || { id: def.id, richtungen: new Set(), flags: new Set(), signiert: false };
    e.richtungen.add(richtung);
    for (const f of ['nurImport', 'nurExport', 'ohneAuswahl', 'signiert', 'fachpfad', 'eingelassen']) {
      if (def[f] === true) e.flags.add(f);
    }
    if (def.signiert === true) e.signiert = true;
    /* „hat einen ausführbaren Lese-Pfad" ist nicht dasselbe wie „hat `parse`":
       ein signierter Kanal wird über `importPlanGeprueft`/`felderAusClaims`
       gelesen. Genau diese Verwechslung steht heute in STANDARDS.md. */
    e.hatLesePfad = typeof def.parse === 'function'
      || (def.signiert === true && typeof def.felderAusClaims === 'function');
    kanaele.set(def.id, e);
  };
  for (const d of V.IMPORT_FORMATE) merke(d, 'import');
  for (const d of V.EXPORT_FORMATE) merke(d, 'export');

  return {
    kanaele,
    zahlen: {
      'Sektoren': V.bereicheAlle().length,
      'Felder': felder,
      'Unterfelder': unterfelder,
      'Situationen': (V.SITUATIONEN || []).length,
      'Schema-Version': zahl(/const SCHEMA_VERSION_AKTUELL = (\d+);/),
      /* Die geführte Sensibel-Liste ist die Quelle, nicht ein Katalogzähler: sie enthält auch
         Unterfelder, und W-3 hält sie bereits an ihrer Zahl fest. */
      'sensible Felder': (() => {
        try { return require(path.join(repo, 'tools', 'w3-schema-sensibel-pruefen.js')).LISTE.length; }
        catch (e) { return null; }
      })(),
      'SCHALEN_STAND': zahl(/const SCHALEN_STAND = 'v(\d+)'/),
      /* UNGEMESSEN ohne `--mit-suite`: die Suite zu fahren kostet Minuten, und ein Slot, der
         nicht gemessen wurde, wird ausgewiesen statt geraten (dieselbe Regel wie im
         Briefing-Prüfer). `null` heisst hier: nicht beurteilt, nicht „passt". */
      // U2-ADR-228/234: explizite Dateiliste aus `git ls-files`, nicht ein nacktes `npm test` —
      // Nodes eigene Muster-Suche zählt sonst einen gitignorierten, nie committeten Testfund im
      // Arbeitsbaum mit, den ein frischer Checkout nicht kennt. Und `tests`, nicht `pass`: `pass`
      // verschweigt einen Fehlschlag, indem es ihn aus der Zahl herausrechnet — derselbe Grund wie
      // in den beiden bereits reparierten Erzeugern.
      'Tests': mitSuite ? (() => {
        const dateien = suiteDateien(repo);
        try {
          const roh = execFileSync('node', ['--test', ...dateien], { cwd: repo, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
          const m = roh.match(/^ℹ tests (\d+)$/m);
          return m ? Number(m[1]) : null;
        } catch (e) {
          const roh = (e.stdout || '').toString();
          const m = roh.match(/^ℹ tests (\d+)$/m);
          return m ? Number(m[1]) : null;
        }
      })() : null,
    },
    kryptoVersionen: (() => {
      const a = zahl(/const CRYPTO_VERSION_AKTUELL = (\d+);/);
      const z = zahl(/const CRYPTO_VERSION_ZERFALL = (\d+);/);
      return [a, z].filter((x) => x != null);
    })(),
  };
}

/* ── DATIERTE STELLEN — die eine strukturelle Ausnahme ────────────────────── */
/* `**Stand:** 14.08.2026` — die Sterne gehören zur Auszeichnung, nicht zum Wort. Ohne sie im
   Muster lief die Ausnahme an `docs/pruefebene.md` vorbei, das sein Datum ausdrücklich trägt:
   zwei Falschmeldungen im ersten Lauf, beide berechtigt datiert. */
const DATUM = /\*{0,2}Stand:?\*{0,2}\s*\d{1,2}\.\d{1,2}\.\d{4}/;
function datierteZeilen(zeilen) {
  /* Ein Datum wirkt bis zur nächsten Überschrift: „Stand: 14.08.2026" in Zeile 9
     deckt den Abschnitt, nicht nur seine eigene Zeile. */
  const gedeckt = new Set();
  let aktiv = false;
  zeilen.forEach((z, i) => {
    if (/^#{1,6}\s/.test(z)) aktiv = false;
    if (DATUM.test(z)) aktiv = true;
    if (aktiv) gedeckt.add(i);
  });
  return gedeckt;
}

/* ── DIE VIER ANKER-SORTEN ────────────────────────────────────────────────── */
const FLAGS = ['nurImport', 'nurExport', 'ohneAuswahl', 'signiert'];
const ZAHL_GEGENSTAENDE = ['Sektoren', 'Felder', 'Unterfelder', 'Situationen'];

/* NACHTRAG (03.09.2026, kein eigenes ADR — Bugfix an Regeln aus U2-ADR-228/U2-ADR-098,
   abgestimmt): eine Zahl mit optionalem Tausender-Trenner — Punkt, Komma, schmales
   Leerzeichen U+202F oder geschütztes Leerzeichen U+00A0. „6.589" ist EINE Zahl, nicht „6" gefolgt
   von „.589": das alte Muster `(\d+)` traf hier nur den Rest hinter dem Trenner und meldete „589"
   statt „6589" — zwei falsche Abweichungen im echten Lauf, aus einem Prüfer, dessen einziger Zweck
   es ist, Abweichungen zu melden (gemessen, `ankerLesen()` gegen „Heute laufen 6.589 Tests grün."
   mit korrekt gemessenem `Tests: 6589` — meldete vor diesem Fix einen Fund, „589" ≠ „6589"). Alle
   Anker hier sind Ganzzahl-Bestände (Feld-/Test-/Versions-Zählungen): „." und „," sind in diesem
   Kontext nie Dezimaltrenner, immer Gruppierung. Ein Vorzeichen kommt bei keinem der Gegenstände
   vor (nichts hier kann negativ sein) und wird darum bewusst NICHT unterstützt — eine Zahlenform,
   die kein Anker dieser Datei je trägt, wäre eine erfundene Absicherung, keine gemessene.
   `\d(?:[\d.,  ]*\d)?`: eine Ziffer, optional gefolgt von einem Rumpf aus Ziffern/
   Trennern, der selbst wieder auf einer Ziffer endet — ein einzelnes Trennzeichen am Rand (z. B.
   ein Satzpunkt direkt nach der Zahl) gehört darum nie zum Treffer. */
const ZAHL_QUELLE = '\\d(?:[\\d.,\\u202f\\u00a0]*\\d)?';
function zahlAusFund(roh) { return Number(roh.replace(/[.,\u202f\u00a0]/g, '')); }

function ankerLesen(datei, text, stand) {
  const funde = [];
  /* DIE ZAHL-ANKER GELTEN NUR IN DOKUMENTEN, und das ist eine Zuordnung, keine Ausblendung:
     „N Felder" ist in einer Standard-Übersicht eine BESTANDSBEHAUPTUNG, in einem Quelltext-
     Kommentar aber fast nie („die zwölf Felder dieses Blatts", „vier Felder im Editor").
     Gemessen: acht Falschmeldungen aus vier Anwendungen im ersten Lauf mit Klasse 2, null
     echte. Die ÜBRIGEN Anker-Sorten laufen in den Anwendungen weiter — dort sind sie
     aussagekräftig, und die Klasse gilt damit als geprüft, nicht als übersprungen. */
  const istDokument = /\.(md|cff)$/.test(datei) || datei === 'THIRD_PARTY_LICENSES';
  const zeilen = text.split('\n');
  const gedeckt = datierteZeilen(zeilen);
  const bekannt = stand.kanaele;

  zeilen.forEach((zeile, i) => {
    if (gedeckt.has(i)) return;
    const ort = datei + ':' + (i + 1);

    /* 1 · Kanal-Kennungen in Backticks.
       DAS FALSCHMELDUNGS-RISIKO, gemessen im ersten Lauf statt vermutet: ohne Kontext-Bedingung
       meldete diese Sorte `vivodepot-cleanslate` (ein Repo-Name),
       `vivodepot-trust-authority-v1-11052026` (eine Schlüssel-kid) und `xoev-rollencode` (eine
       CODE-LISTE, kein Kanal) — drei Backtick-Bezeichner, die zufällig mit einem Kanal-Präfix
       beginnen. Eine Kennung ist erst dann eine KANAL-Behauptung, wenn die Zeile von Kanälen
       spricht. Dieselbe Lehre wie beim Briefing-Prüfer: ein Muster ohne Kontext erzeugt vierzig
       Falschmeldungen gegen einen Fund. */
    const kanalKontext = /Kanal|Export|Import|Register|Format|Erzeuger|nurImport|nurExport/.test(zeile);
    for (const m of zeile.matchAll(/`([a-z0-9][a-z0-9-]{2,})`/g)) {
      const id = m[1];
      if (!/^(json|fhir|sd-jwt|vcard|ics|xoev|fim|edci|camt|xmeld|elster|vivodepot|provider)/.test(id)) continue;
      if (!bekannt.has(id) && !kanalKontext) continue;
      if (bekannt.has(id)) {
        // 2 · Flags, die dem Kanal in DERSELBEN Zeile zugeschrieben werden
        for (const f of FLAGS) {
          if (!new RegExp('`' + f + '`').test(zeile)) continue;
          if (!bekannt.get(id).flags.has(f)) {
            funde.push({ art: 'flag', richtung: 'C', ort, anker: id, gesagt: f,
              gemessen: [...bekannt.get(id).flags].join(',') || '(keins)',
              satz: 'Das Dokument schreibt dem Kanal ein Flag zu, das das Register nicht führt.' });
          }
        }
        // „kein ausführbarer Lese-Pfad" ist eine prüfbare Behauptung über den Code
        if (/kein(en)?\s+ausführbaren\s+Lese-Pfad|keinen hinterlegten Parser/i.test(zeile) && bekannt.get(id).hatLesePfad) {
          funde.push({ art: 'lesepfad', richtung: 'C', ort, anker: id, gesagt: 'kein ausführbarer Lese-Pfad',
            gemessen: 'liest über felderAusClaims/importPlanGeprueft',
            satz: 'Ein signierter Kanal wird nicht über `parse` gelesen — er hat trotzdem einen Lese-Pfad.' });
        }
      } else {
        funde.push({ art: 'kanal', richtung: 'A', ort, anker: id, gesagt: 'Kanal existiert',
          gemessen: 'nicht im Register', satz: 'Das Dokument nennt einen Kanal, den kein Register führt.' });
      }
    }

    // 3 · Zahlen mit Gegenstandswort — nur in Dokumenten, s. Kopf dieser Funktion
    if (!istDokument) return;
    /* DIE ZWEI SORTEN von Feld-Zahlen, und beide werden geprüft — die zweite auszublenden
       wäre eine stille Auswahl. `FAQ.md` und `SOVEREIGNTY.md` nennen 204 und meinen die
       SENSIBLEN (geführte Liste, gewächtert von W-3); `STANDARDS.md` nennt 257 und meint den
       Katalog. Ein Muster ohne diese Unterscheidung meldete die richtige Zahl als falsch —
       gemessen im ersten Lauf. */
    /* DER KONTEXT IST DER ABSATZ, NICHT DIE ZEILE. `FAQ.md` schreibt „sensible Felder werden
       zurückgehalten" in Zeile 78 und „Heute betrifft das 204 Felder" in Zeile 79 — ein
       zeilenweiser Blick trennt, was zusammengehört, und meldete die richtige Zahl als falsch.
       Gemessen im zweiten Lauf. */
    const absatz = zeilen.slice(Math.max(0, i - 3), i + 1).join(' ');
    const sensibelZeile = /sensib/i.test(absatz);
    for (const g of ZAHL_GEGENSTAENDE) {
      if (g === 'Felder' && sensibelZeile) {
        const ms = new RegExp('(' + ZAHL_QUELLE + ')\\s+Felder').exec(zeile);
        if (ms && stand.zahlen['sensible Felder'] != null && zahlAusFund(ms[1]) !== stand.zahlen['sensible Felder']) {
          funde.push({ art: 'zahl', richtung: 'C', ort, anker: 'sensible Felder', gesagt: ms[1],
            gemessen: String(stand.zahlen['sensible Felder']),
            satz: 'Die Zahl der zurückgehaltenen Felder weicht von der geführten Liste ab.' });
        }
        continue;
      }
      const m = new RegExp('(' + ZAHL_QUELLE + ')\\s+' + g + '\\b').exec(zeile);
      if (m && stand.zahlen[g] != null && zahlAusFund(m[1]) !== stand.zahlen[g]) {
        funde.push({ art: 'zahl', richtung: 'C', ort, anker: g, gesagt: m[1],
          gemessen: String(stand.zahlen[g]), satz: 'Eine Zahl behauptet einen Stand, den die Messung nicht trägt.' });
      }
    }
    // „Schema 24 bis zum heutigen 63" (SOVEREIGNTY.md, 25.09.2026 gefunden: der Kern stand auf 88) — dieselbe Behauptung
    // über die heutige Schema-Version in anderer Form.
    for (const [wort, muster] of [['Schema-Version', 'Schema-Version\\s+(' + ZAHL_QUELLE + ')'],
                                   ['Schema-Version', 'Schema\\b[^.\\n]{0,40}\\bheutigen\\s+(' + ZAHL_QUELLE + ')'],
                                   ['SCHALEN_STAND', 'SCHALEN_STAND`?\\s+v(' + ZAHL_QUELLE + ')']]) {
      const m = new RegExp(muster).exec(zeile);
      if (m && stand.zahlen[wort] != null && zahlAusFund(m[1]) !== stand.zahlen[wort]) {
        funde.push({ art: 'zahl', richtung: 'C', ort, anker: wort, gesagt: m[1],
          gemessen: String(stand.zahlen[wort]), satz: 'Eine Zahl behauptet einen Stand, den die Messung nicht trägt.' });
      }
    }
    /* Eine Testzahl in einem Aussen-Dokument ist eine Behauptung über den heutigen Lauf —
       der Fall der vier Testzahlen aus dem Auftrag, Richtung C. Der Slot bleibt UNGEMESSEN,
       wenn keine Suite gefahren wurde, und wird dann nicht beurteilt: nie stillschweigend
       als „passt" gezählt. */
    const tm = new RegExp('(' + ZAHL_QUELLE + ')\\s+Tests?\\s+grün').exec(zeile);
    if (tm && stand.zahlen['Tests'] != null && zahlAusFund(tm[1]) !== stand.zahlen['Tests']) {
      funde.push({ art: 'zahl', richtung: 'C', ort, anker: 'Tests', gesagt: tm[1],
        gemessen: String(stand.zahlen['Tests']),
        satz: 'Eine Testzahl behauptet einen Lauf, den die Suite heute nicht mehr hat.' });
    }
    const km = new RegExp('Krypto-Version:?\\s*(' + ZAHL_QUELLE + ')').exec(zeile);
    if (km && stand.kryptoVersionen.length > 1 && !zeile.includes(String(stand.kryptoVersionen[1]))) {
      funde.push({ art: 'zahl', richtung: 'C', ort, anker: 'Krypto-Version', gesagt: km[1],
        gemessen: stand.kryptoVersionen.join(' und '),
        satz: 'Der Kern führt mehr als eine Krypto-Generation; das Dokument nennt nur eine.' });
    }
  });
  return funde;
}

/* 4 · STANDARD-FAMILIEN — die Richtung, in der alle drei Funde vom 20.08. lagen.
   Ein Kanal mit `signiert: true` beruht auf einer fremden Nachweis-Spezifikation.
   Nennt das Dokument, das sich als Standard-Übersicht ausgibt, sie nicht, ist das
   „zu wenig gesagt". Die Wörter kommen aus dem CODE (den Typ-Namen), nicht aus
   einer Handliste — darum wächst die Prüfung mit, wenn ein zweiter Nachweis-Typ
   dazukommt. */
function standardFamilienPruefen(repo, stand) {
  const kern = fs.readFileSync(path.join(repo, 'vivodepot.html'), 'utf8');
  const funde = [];
  const signierte = [...stand.kanaele.values()].filter((k) => k.signiert);
  if (!signierte.length) return funde;

  // Der Typ-Name, den der Code selbst prüft — er benennt die Spezifikation.
  const typen = [...new Set([...kern.matchAll(/'([A-Za-z]*Credential)'/g)].map((m) => m[1]))];
  const uebersicht = path.join(repo, 'STANDARDS.md');
  if (!fs.existsSync(uebersicht) || !typen.length) return funde;
  const text = fs.readFileSync(uebersicht, 'utf8');

  // Wird die Spezifikationsfamilie überhaupt benannt?
  const nennt = /Verifiable\s?Credential|W3C\s*VC|\bW3C\b/i.test(text);
  if (!nennt) {
    funde.push({ art: 'standard-familie', richtung: 'B', ort: 'STANDARDS.md',
      anker: typen.join(', '),
      gesagt: '(nicht genannt)',
      gemessen: signierte.map((k) => k.id).join(', ') + ' — signierte Nachweis-Kanäle im Register',
      satz: 'Der Code prüft einen Nachweis-Typ dieser Familie; die Standard-Übersicht nennt die Familie nicht.' });
  }
  return funde;
}

/* ── Lauf ─────────────────────────────────────────────────────────────────── */
/* UMLENKBAR — die stehende Schreibregel für Prüfwerkzeuge verlangt den zu prüfenden Gegenstand
   als Argument. `--dokument <pfad>` liest EINE Kopie STATT ihres gleichnamigen Originals; alles
   andere bleibt unberührt. Ohne sie liesse sich der Rot-Beleg zu diesem Gate nur führen, indem
   man die echte Auslieferungsdatei verbiegt. */
function pruefen(repo = REPO, opt) {
  const stand = standMessen(repo, opt);
  const traeger = traegerFinden(repo);
  const ersatz = (opt && opt.dokument) ? path.resolve(opt.dokument) : null;
  /* WELCHEN Träger die Kopie ersetzt, sagt ihr Dateiname: er ENDET auf den Trägernamen.
     `.waechterprobe-tmp-aussagen-STANDARDS.md` ersetzt `STANDARDS.md`. Ein Präfix ist nötig,
     weil die Selbstprobe ihre Fixture nicht so nennen darf wie die Auslieferungsdatei. */
  const ersatzName = ersatz ? path.basename(ersatz) : null;
  let funde = [];
  for (const t of traeger) {
    const p = (ersatzName && ersatzName.endsWith(path.basename(t))) ? ersatz : path.join(repo, t);
    if (!fs.existsSync(p)) continue;
    funde = funde.concat(ankerLesen(t, fs.readFileSync(p, 'utf8'), stand));
  }
  funde = funde.concat(standardFamilienPruefen(repo, stand));
  return { traeger, funde, stand };
}

function grundlinieLesen() {
  try { return JSON.parse(fs.readFileSync(GRUNDLINIE, 'utf8')); }
  catch (e) { return { anzahl: 0, stand: null, hinweis: 'noch keine Grundlinie geschrieben' }; }
}

function main() {
  const r = pruefen(REPO, { mitSuite: argv.includes('--mit-suite'), dokument: argWert('dokument') });
  const gl = grundlinieLesen();
  console.log('aussagen-abgleich: ' + r.traeger.length + ' Aussen-Dokumente geprüft, '
    + r.funde.length + ' Abweichung(en).');
  console.log('  Suchraum: ' + r.traeger.join(' · '));
  if (r.stand.zahlen['Tests'] == null) {
    console.log('  UNGEMESSEN: Testzahlen (ohne --mit-suite). Nicht beurteilt — nicht „passt".');
  }
  for (const f of r.funde) {
    console.log('  [' + f.richtung + '/' + f.art + '] ' + f.ort + '  „' + f.anker + '"');
    console.log('        gesagt: ' + f.gesagt + '   ·   gemessen: ' + f.gemessen);
    console.log('        ' + f.satz);
  }
  if (argv.includes('--grundlinie-schreiben')) {
    fs.writeFileSync(GRUNDLINIE, JSON.stringify({
      anzahl: r.funde.length,
      stand: new Date().toISOString().slice(0, 10),
      hinweis: 'Grundlinie statt Nulltoleranz: ein neuer Fund gegen diesen Stand ist ein echter '
        + 'Zuwachs (das Gate meldet, wenn der Abstand WÄCHST), kein bereits bekannter, auf eine '
        + 'Entscheidung wartender Rest. Wer einen Fund hier sieht, prüft ihn wie einen neuen — '
        + 'nicht wie eine bekannte, geduldete Lücke.',
      funde: r.funde.map((f) => f.richtung + '/' + f.art + ' ' + f.ort + ' ' + f.anker),
    }, null, 1) + '\n');
    console.log('  Grundlinie geschrieben: ' + r.funde.length);
    return;
  }
  if (argv.includes('--gate')) {
    if (r.funde.length > gl.anzahl) {
      console.error('aussagen-abgleich: DER ABSTAND IST GEWACHSEN — ' + gl.anzahl + ' → ' + r.funde.length + '.');
      console.error('  Eine Aussage nach aussen sagt etwas, das der Code nicht trägt (oder umgekehrt).');
      process.exit(1);
    }
    console.log('  Gate: kein Zuwachs gegen die Grundlinie (' + gl.anzahl + ').');
  }
}

if (require.main === module) main();
module.exports = { pruefen, traegerFinden, standMessen, ankerLesen, standardFamilienPruefen, grundlinieLesen, GRUNDLINIE };
