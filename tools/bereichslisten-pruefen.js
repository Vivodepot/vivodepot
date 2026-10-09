#!/usr/bin/env node
'use strict';
/* ════════════════════════════════════════════════════════════════════════
   W-16 · Es gibt genau EINE Bereichsliste — jede weitere ist rot
   ────────────────────────────────────────────────────────────────────────
   Zug 1 des Auftrags „Die Bereichsliste wird ein andockbares Register"
   (17.08.2026) verlangt ausdrücklich die GEGENRICHTUNG des naheliegenden
   Wächters. Der naheliegende wäre: „eine Kopie weicht von der Quelle ab".
   Nach Zug 1 gibt es die Kopien nicht mehr — er hätte nichts zu vergleichen
   und liefe über eine leere Menge grün (die Fehlerklasse aus A279).

   Dieser hier wird rot, wenn IRGENDWO eine ZWEITE Bereichsliste ENTSTEHT.
   Genau das ist am 10.08.2026 passiert: `krisenvorsorge` kam als zwölfter
   Bereich dazu, `BEREICHE` im Template-Generator und die sechs `bereich`-enums
   blieben bei elf — sieben Tage lang von niemandem bemerkt, und keine
   Institution konnte in dieser Zeit eine Vorlage für den neuen Bereich
   einreichen.

   ERKENNUNGSKRITERIUM, strukturell statt namentlich: eine Aufzählung
   (Array-Literal oder Objekt-Schlüsselmenge), die MINDESTENS `SCHWELLE` der
   bekannten Bereichs-IDs oder der historischen Beschriftungen enthält. Nicht
   „eine Konstante, die BEREICHE heißt" — wer eine neue Liste baut, nennt sie
   anders. Der Fund vom 17.08. belegt das: `_BEREICH_SEKTOR` im Kern war eine
   zehnte Bereichsliste und hiess weder SEKTOREN noch BEREICHE.

   VORBEDINGUNG: findet der Lauf gar keine Liste, ist das ROT und nicht still.
   Ein Wächter, der über eine leere Menge grün läuft, prüft nichts.

   Aufruf:
     node tools/bereichslisten-pruefen.js            → Bericht, Exit 1 bei Fund
     node tools/bereichslisten-pruefen.js --json
     node tools/bereichslisten-pruefen.js --datei <pfad>   (Rot-Beleg: eine Kopie prüfen)
   ════════════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const path = require('node:path');

const REPO = path.join(__dirname, '..');
const SCHWELLE = 6;

/* Die IDs kommen aus dem Kern, nicht aus einer Liste hier — ein Wächter mit
   eigener Bereichsliste wäre selbst der Verstoß, den er sucht. */
const { echteSektorenListe } = require('./lib/sektoren.js');
const ALT_LABEL_WOERTER = Object.freeze([
  'Identität', 'Menschen', 'Mobilität', 'Finanzen', 'Gesundheit', 'Bildung',
  'Sozialversicherung', 'Vorsorge', 'Verwaltung', 'Persönliches', 'Wohnen', 'Krisenvorsorge',
]);

/* ── Das Register der BEKANNTEN Listen ───────────────────────────────────────
   Je Eintrag ein Grund. Wer eine Liste hier einträgt, ohne einen Grund zu
   nennen, hat den Wächter abgeschaltet statt ihn beantwortet. */
const BEKANNT = Object.freeze([
  {
    datei: 'vivodepot.html', anker: 'const BEREICH_IDS_EINGEBAUT',
    grund: 'U2-ADR-253 (Paket 3, Commit A, 04.09.2026): kein Duplikat der LEBENDEN Bereichsliste, '
      + 'sondern ein bewusst EINGEFRORENER reservierter Namensraum — bis auf den ersten Bau (dieser '
      + 'Commit) unveränderlich. Vorher aus `SEKTOREN.map(s => s.id)` abgeleitet; musste entkoppelt '
      + 'werden, WEIL `SEKTOREN` sich in Paket 3 leert (die 13 nativen Sektoren ziehen ins Modul '
      + '`buergerdepot`) — eine weiter abgeleitete Sperre liefe in genau dem Moment ins Leere, in dem '
      + 'sie am wichtigsten ist. Wert gegen den früheren `SEKTOREN.map(...)`-Stand geprüft, s. '
      + 'tests/paket3-commitA-entkopplung.test.js.',
  },
  {
    datei: 'vivodepot.html', anker: '_BEREICH_ALT_LABEL',
    grund: 'Archiv, kein Register: die deutschen Beschriftungen, unter denen bis zum 17.08.2026 '
      + 'eingereicht wurde. Wird nur beim LESEN befragt und wächst nicht mehr. Sie MUSS bleiben — '
      + 'die vier eingebetteten, SIGNIERTEN Basis-Vorlagen tragen sie im JWS-Payload und sind ohne '
      + 'neuen Trust-Authority-Schlüssel nicht neu zu signieren.',
  },
  {
    datei: 'vivodepot-studio.html', anker: 'BEREICHE:BEGIN',
    grund: 'GENERIERTE Region (tools/build-bereiche.js). Kein zweiter Bestand — Drift ist ein '
      + 'Fehlschlag von `--check`, kein stiller Zustand.',
  },
  { datei: 'bereiche/bereiche.json', anker: '"bereiche"', grund: 'GENERIERTER Transport (tools/build-bereiche.js).' },
  {
    datei: 'bereiche/bereiche.json', anker: 'ERZEUGT von tools/build-bereiche.js',
    grund: 'Die Wurzel desselben erzeugten Transports — dieselbe Datei, von der Dichte-Messung '
      + 'zusätzlich als Ganzes erfasst.',
  },
  {
    datei: 'vivodepot-studio.html', anker: 'BEREICH_ALT_LABEL',
    grund: 'Archiv, kein Register — dieselbe geschlossene Beschriftungs-Zuordnung wie im Kern, '
      + 'nur zum LESEN alter Einreichungen, und ebenfalls generiert.',
  },
  { datei: 'docs/template-generator/submission-schema.json', anker: '"bereich"', grund: 'GENERIERTES enum (tools/build-bereiche.js).' },
  { datei: 'vivodepot-vc-issuer.html', anker: '"bereich"', grund: 'GENERIERTES enum (tools/build-bereiche.js), Kopie des Einreich-Schemas.' },
  { datei: 'vivodepot-studio.html', anker: '"bereich"', grund: 'GENERIERTES enum (tools/build-bereiche.js), Kopie des Einreich-Schemas.' },
  {
    datei: 'tools/bereichslisten-pruefen.js', anker: 'ALT_LABEL_WOERTER',
    grund: 'Der Suchbegriff dieses Wächters selbst. Er beschreibt, wonach gesucht wird, und ist '
      + 'kein Bestand, aus dem etwas gelesen würde.',
  },
]);

const GEGENSTAND = Object.freeze([
  'vivodepot.html', 'vivodepot-lesen.html', 'vivodepot-studio.html',
  'vivodepot-vc-issuer.html', 'vivodepot-schluessel-teilen.html',
  'docs/template-generator/submission-schema.json', 'bereiche/bereiche.json',
]);

/* Aufzählungen finden — auf DEKLARATIONS-Ebene, nicht auf Klammer-Ebene.
   Der erste Anlauf suchte Klammerpaare mit einer Größenschranke und übersah damit
   ausgerechnet die grösste echte Liste: der `SEKTOREN`-Block der Lese-App ist über
   1400 Zeilen lang und fiel durch jedes vernünftige Fenster. Gemessen statt vermutet
   — der Lauf meldete 16 Aufzählungen und keine einzige davon war die Lese-App.

   Jetzt: jede Deklaration auf Zeilenanfang (`const X = …`) bis zur nächsten, und in
   JSON-Dateien die Datei als Ganzes. Der Name der Deklaration steht im Fund — wer
   eine neue Liste baut, muss sie benennen, und der Bericht nennt sie mit. */
function aufzaehlungenMitBereichen(quelle, ids, istJson) {
  const woerter = ids.concat(ALT_LABEL_WOERTER);
  /* ZWEI Bedingungen, und die zweite ist der eigentliche Fund dieses Baus.
     Die erste allein — „mindestens sechs verschiedene Bereiche kommen vor" —
     meldete 26 Treffer, von denen 17 keine Bereichslisten waren, sondern
     REGISTRIES, deren ZEILEN eine sektorId tragen: SITUATIONEN, WIZARDS,
     B16_FELD_MAPPING, EXPORT_FORMATE. Das ist genau die Klasse, die der
     Auftrag ausdrücklich stehen lässt (die 565 Daten-Stellen), und ein
     Wächter, der sie meldet, wäre nach dem dritten Lauf abgeschaltet.

     Die zweite Bedingung trennt sie sauber: eine BEREICHSLISTE besteht
     ÜBERWIEGEND aus Bereichsnamen (Dichte), eine Registry erwähnt sie
     zwischen vielem anderen. Gemessen statt geschätzt — `BEREICHE` und die
     enums liegen bei 1.0, `SITUATIONEN` unter 0.05. */
  const zaehle = (stueck) => {
    let n = 0;
    for (const w of woerter) {
      if (stueck.includes("'" + w + "'") || stueck.includes('"' + w + '"')) n++;
    }
    return n;
  };
  const dichte = (stueck) => {
    const alle = stueck.match(/'[^'\n]*'|"[^"\n]*"/g) || [];
    if (!alle.length) return 0;
    const treffer = alle.filter(s => woerter.includes(s.slice(1, -1))).length;
    return treffer / alle.length;
  };
  const MINDESTDICHTE = 0.5;
  if (istJson) {
    // In JSON zählt nicht die Datei als Ganzes (ein Schema enthält hundert andere
    // Zeichenketten), sondern die `bereich`-Eigenschaft und die Wurzel eines reinen
    // Bereichs-Transports.
    const raus = [];
    if (dichte(quelle) >= MINDESTDICHTE && zaehle(quelle) >= SCHWELLE) {
      raus.push({ zeile: 1, name: '(ganze Datei)', anzahl: zaehle(quelle), dichte: dichte(quelle), auszug: quelle.replace(/\s+/g, ' ').slice(0, 120) });
    }
    let j = -1;
    while ((j = quelle.indexOf('"bereich"', j + 1)) >= 0) {
      const zu = quelle.indexOf('}', j);
      const stueck = quelle.slice(j, zu < 0 ? j + 800 : zu);
      if (zaehle(stueck) >= SCHWELLE && dichte(stueck) >= MINDESTDICHTE) {
        raus.push({ zeile: quelle.slice(0, j).split('\n').length, name: '"bereich" (Schema-enum)', anzahl: zaehle(stueck), dichte: dichte(stueck), auszug: stueck.replace(/\s+/g, ' ').slice(0, 120) });
      }
    }
    return raus;
  }
  // Deklarationsgrenzen: `const NAME =` bzw. `let NAME =` auf Zeilenanfang (bis zu 2 Leerzeichen
  // Einrückung, damit auch eingerückte Blöcke im HTML-<script> erfasst werden).
  const re = /\n {0,2}(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=/g;
  const marken = []; let m;
  while ((m = re.exec(quelle)) !== null) marken.push({ index: m.index, name: m[1] });
  const treffer = [];
  for (let i = 0; i < marken.length; i++) {
    const von = marken[i].index;
    const bis = (i + 1 < marken.length) ? marken[i + 1].index : quelle.length;
    const stueck = quelle.slice(von, bis);
    const n = zaehle(stueck), d = dichte(stueck);
    if (n >= SCHWELLE && d >= MINDESTDICHTE) {
      treffer.push({ zeile: quelle.slice(0, von).split('\n').length + 1, name: marken[i].name, anzahl: n, dichte: d, auszug: stueck.replace(/\s+/g, ' ').slice(0, 120) });
    }
  }
  // Schema-enums stehen in JSON-Literalen INNERHALB des Skripts (Issuer/Generator) und
  // gehören keiner Deklaration — sie werden zusätzlich an ihrem Eigenschaftsnamen erfasst.
  let idx = -1;
  while ((idx = quelle.indexOf('"bereich"', idx + 1)) >= 0) {
    const zu = quelle.indexOf('}', idx);
    const stueck = quelle.slice(idx, zu < 0 ? idx + 800 : zu);
    const n = zaehle(stueck), d = dichte(stueck);
    if (n >= SCHWELLE && d >= MINDESTDICHTE) {
      const zeile = quelle.slice(0, idx).split('\n').length;
      if (!treffer.some(t => Math.abs(t.zeile - zeile) <= 3)) {
        treffer.push({ zeile, name: '"bereich" (Schema-enum)', anzahl: n, dichte: d, auszug: stueck.replace(/\s+/g, ' ').slice(0, 120) });
      }
    }
  }
  return treffer.sort((a, b) => a.zeile - b.zeile);
}

function kontextZeilen(quelle, zeile, spanne) {
  const z = quelle.split('\n');
  return z.slice(Math.max(0, zeile - 1 - spanne), zeile + spanne).join('\n');
}

/* Im `--datei`-Modus liegt der Gegenstand als KOPIE irgendwo im Temp-Verzeichnis
   (der Rot-Beleg darf das Produkt nicht anfassen). Das Register schlüsselt nach
   Repo-Pfad — darum wird auf den Dateinamen zurückgefallen, sonst wäre jede
   erlaubte Liste in der Kopie ein Fund und der Wächter „einer, der alles anschlägt". */
function registerPfad(relPfad) {
  const bekannteNamen = new Set(BEKANNT.map(b => b.datei));
  if (bekannteNamen.has(relPfad)) return relPfad;
  const basis = path.basename(relPfad);
  for (const n of bekannteNamen) if (path.basename(n) === basis) return n;
  return relPfad;
}

function istBekannt(relPfad, quelle, treffer) {
  // Der Anker darf im NAMEN der Deklaration oder im Kontext um sie herum stehen —
  // generierte Regionen tragen ihn im Marker-Kommentar, Deklarationen im Namen.
  const kontext = kontextZeilen(quelle, treffer.zeile, 14) + '\n' + String(treffer.name || '');
  const schluessel = registerPfad(relPfad);
  return BEKANNT.some(b => b.datei === schluessel && kontext.includes(b.anker));
}

/* Die beiden SEKTOREN-Blöcke fallen NICHT unter das Dichte-Kriterium — sie tragen
   Sektionen und Felder, ihre Bereichsnamen gehen in Hunderten anderer Zeichenketten
   unter. Sie deshalb ungeprüft zu lassen wäre die grössere Lücke, denn genau dort
   sass der Fehler aus Zug 2b: die Lese-App führte `wohnen` und `persoenliches`
   vertauscht, und die Paritätsprobe Kern/Lese-App prüft Felder, Typen,
   Unterfelder und Sensibel-Flags — aber nicht die REIHENFOLGE.
   Darum hier eine eigene, gleichrangige Prüfung: gleiche Menge UND gleiche Folge. */
function reihenfolgePruefen() {
  const { bereichsIdsAusBlock } = require('./bereichs-ids-erheben.js');
  const kern = bereichsIdsAusBlock(fs.readFileSync(path.join(REPO, 'vivodepot.html'), 'utf8'));
  const lese = bereichsIdsAusBlock(fs.readFileSync(path.join(REPO, 'vivodepot-lesen.html'), 'utf8'));
  // VORBEDINGUNG: leere Listen heissen, dass der Leser nicht mehr greift — rot, nicht still.
  if (!kern.length || !lese.length) {
    return { ok: false, grund: 'VORBEDINGUNG: Bereichsliste leer gelesen (Kern ' + kern.length + ', Lese-App ' + lese.length + ')', kern, lese };
  }
  if (kern.join(',') !== lese.join(',')) {
    return { ok: false, grund: 'Kern und Lese-App führen die Bereiche verschieden', kern, lese };
  }
  return { ok: true, kern, lese };
}

/* ── Die zwei fixierten Positionen (U2-ADR-041) ──────────────────────────────────────
   Auftrag „Persönliches wieder zuletzt" (18.08.2026), Zug 2. ADR-041 legt zwei Positionen
   fest: die Liste beginnt mit `identitaet` und endet mit `persoenliches`. Am 10.08. kam
   `krisenvorsorge` als zwölfter Bereich ANS ENDE — das ADR war nicht abgelöst, sondern
   UNTERLAUFEN, und niemandem fiel es auf, weil es keinen Wächter gab.

   ES SIND ZWEI POSITIONEN, KEINE REIHENFOLGE. Was dazwischen steht, ist frei; ein
   angedockter dreizehnter Bereich soll sich einreihen dürfen, ohne dass dieser Wächter
   ihn verwirft. Eine Prüfung der GANZEN Liste wäre eine feste Bereichsliste im Wächter —
   genau das, was `bereichslisten-pruefen` sonst meldet. */
const FIXIERT_ANFANG = 'identity';
const FIXIERT_ENDE = 'personal';

function fixiertePositionenPruefen(quelle, herkunft) {
  const { bereichsIdsAusBlock } = require('./bereichs-ids-erheben.js');
  const ids = bereichsIdsAusBlock(quelle);
  // VORBEDINGUNG: eine leer gelesene Liste ist ein Fehlschlag, kein Ergebnis.
  if (!ids.length) return { ok: false, herkunft, ids, grund: 'VORBEDINGUNG: Bereichsliste leer gelesen' };
  const fehler = [];
  if (ids[0] !== FIXIERT_ANFANG) fehler.push('beginnt mit `' + ids[0] + '` statt `' + FIXIERT_ANFANG + '`');
  if (ids[ids.length - 1] !== FIXIERT_ENDE) fehler.push('endet auf `' + ids[ids.length - 1] + '` statt `' + FIXIERT_ENDE + '`');
  return { ok: !fehler.length, herkunft, ids, grund: fehler.join(' und ') };
}

function pruefe(dateien) {
  const ids = echteSektorenListe();
  const funde = [], alle = [];
  for (const rel of dateien) {
    const abs = path.join(REPO, rel);
    if (!fs.existsSync(abs)) continue;
    const quelle = fs.readFileSync(abs, 'utf8');
    for (const t of aufzaehlungenMitBereichen(quelle, ids, rel.endsWith('.json'))) {
      const eintrag = { datei: rel, zeile: t.zeile, name: t.name, treffer: t.anzahl, dichte: Number(t.dichte.toFixed(2)), auszug: t.auszug };
      alle.push(eintrag);
      if (!istBekannt(rel, quelle, t)) funde.push(eintrag);
    }
  }
  return { ids, alle, funde };
}

function main() {
  const argv = process.argv.slice(2);
  const iD = argv.indexOf('--datei');
  const dateien = (iD >= 0 && argv[iD + 1]) ? [path.relative(REPO, path.resolve(argv[iD + 1]))] : GEGENSTAND;
  const r = pruefe(dateien);
  const rf = (iD >= 0) ? { ok: true, uebersprungen: true } : reihenfolgePruefen();

  /* `--positionen <pfad>` prüft NUR die zwei fixierten Positionen, an EINER Datei. Der
     eigene Schalter ist nötig, weil `--datei` die Reihenfolge-Prüfung ausdrücklich
     überspringt — der Wächter-Selbsttest könnte diesen Zug sonst an keiner Fixtur ansetzen,
     und ein Wächter ohne ansetzbare Probe zählt in diesem Projekt nicht (A279). */
  const iP = argv.indexOf('--positionen');
  if (iP >= 0 && argv[iP + 1]) {
    const abs = path.resolve(argv[iP + 1]);
    const fp = fixiertePositionenPruefen(fs.readFileSync(abs, 'utf8'), path.relative(REPO, abs));
    if (!fp.ok) {
      console.error('ROT — die Bereichsliste verletzt U2-ADR-041: ' + fp.grund);
      console.error('  ' + fp.herkunft + ': ' + fp.ids.join(', '));
      process.exit(1);
    }
    console.log('bereichs-positionen: OK — ' + fp.herkunft + ' beginnt mit `' + FIXIERT_ANFANG
      + '` und endet auf `' + FIXIERT_ENDE + '` (' + fp.ids.length + ' Bereiche).');
    process.exit(0);
  }
  // Ohne Argument gilt der Zug für BEIDE ausgelieferten Listen — Kern und Lese-App.
  const positionen = (iD >= 0) ? [] : ['vivodepot.html', 'vivodepot-lesen.html']
    .map((rel) => fixiertePositionenPruefen(fs.readFileSync(path.join(REPO, rel), 'utf8'), rel));

  if (argv.includes('--json')) {
    console.log(JSON.stringify(Object.assign({}, r, { reihenfolge: rf }), null, 2));
    process.exit((r.funde.length || !rf.ok) ? 1 : 0);
  }

  /* VORBEDINGUNG — eine leere Suche ist ein Fehlschlag, kein Ergebnis.
     Im `--datei`-Modus wird sie gegen den REPO-BESTAND gemessen, nicht gegen die
     eine geprüfte Datei: eine einzelne Datei DARF null Bereichslisten tragen (die
     Lese-App tut das seit der Dichte-Schärfung), und das als Vorbedingungsbruch zu
     werten machte den gezielten Lauf unbrauchbar. Gemessen: der erste Anlauf tat
     genau das und liess den Wächter-Selbsttest am ERLAUBTEN Beispiel anschlagen. */
  const vorbedingung = (iD >= 0) ? pruefe(GEGENSTAND).alle : r.alle;
  if (!vorbedingung.length) {
    console.error('bereichslisten-pruefen: VORBEDINGUNG VERLETZT — keine einzige Bereichsliste gefunden.');
    console.error('  Der Bestand trägt mindestens die Quelle in vivodepot.html. Null Funde heisst,');
    console.error('  dass die Suche nicht mehr greift — nicht, dass alles in Ordnung ist.');
    process.exit(2);
  }

  console.log('bereichslisten-pruefen: ' + r.ids.length + ' Bereiche, ' + r.alle.length + ' Aufzählung(en) gefunden.');
  for (const a of r.alle) console.log('  ' + (r.funde.includes(a) ? 'NEU  ' : 'bekannt ') + a.datei + ':' + a.zeile + '  ' + (a.name || '') + '  (' + a.treffer + ' Bereiche, Dichte ' + a.dichte + ')');

  if (r.funde.length) {
    console.error('');
    console.error('ROT — eine zweite Bereichsliste ist entstanden:');
    for (const f of r.funde) console.error('  ' + f.datei + ':' + f.zeile + '  ' + f.auszug);
    console.error('');
    console.error('Entweder sie leitet sich aus der Quelle ab (dann über tools/build-bereiche.js erzeugen),');
    console.error('oder sie gehört mit einem GRUND in das Register in tools/bereichslisten-pruefen.js.');
    process.exit(1);
  }
  if (!rf.ok) {
    console.error('');
    console.error('ROT — ' + rf.grund + ':');
    console.error('  Kern:     ' + rf.kern.join(', '));
    console.error('  Lese-App: ' + rf.lese.join(', '));
    process.exit(1);
  }
  const positionsFehler = positionen.filter((p2) => !p2.ok);
  if (positionsFehler.length) {
    console.error('');
    console.error('ROT — die Bereichsliste verletzt U2-ADR-041 (die zwei fixierten Positionen):');
    for (const f of positionsFehler) console.error('  ' + f.herkunft + ': ' + f.grund + '\n    ' + f.ids.join(', '));
    process.exit(1);
  }
  if (!rf.uebersprungen) console.log('Reihenfolge Kern === Lese-App: ' + rf.kern.join(', '));
  if (positionen.length) console.log('U2-ADR-041: beginnt mit `' + FIXIERT_ANFANG + '`, endet auf `' + FIXIERT_ENDE + '` — in beiden Listen.');
  console.log('OK — genau eine Quelle, alles Übrige erzeugt oder mit Grund geführt.');
}

if (require.main === module) main();
module.exports = { pruefe, reihenfolgePruefen, fixiertePositionenPruefen, FIXIERT_ANFANG, FIXIERT_ENDE, aufzaehlungenMitBereichen, BEKANNT, GEGENSTAND, SCHWELLE, ALT_LABEL_WOERTER };
