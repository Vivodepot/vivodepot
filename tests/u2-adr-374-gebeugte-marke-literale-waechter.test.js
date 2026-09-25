'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   U2-ADR-374 — Bestands-Wächter gegen gebeugte „Vivodepot"-Literale
   Nachtrag zu U2-ADR-371: ein Muster-Wächter (`/Vivodepot[a-zäöü]+/`)
   wurde geprüft und verworfen — er träfe legitime Code-Kommentare und
   technische Bezeichner ebenso wie echte Bürgerin-Prosa, und eine
   Erlaubnisliste dagegen würde ihn genau dort blind machen, wo ein neuer
   Fall auftaucht. Dieser Test friert stattdessen die MENGE der heutigen
   Fundstellen ein (`tests/fixtures/u2-adr-374-gebeugte-marke-literale-bestand.json`)
   — jede Änderung der Menge ist ein Fund für einen Menschen, nicht automatisch
   gut oder schlecht.

   IDENTITÄT = DATEI + TREFFER, NICHT KONTEXT (Korrektur 08.09.2026, Fund):
   der erste Entwurf nahm ein Kontextfenster um den Treffer als Identität. Das
   brach beim allerersten Konvoi danach — Konvoi 8 fügte Text VOR der
   SCHALEN_STAND-Fundstelle in derselben Zeile ein (jeder Bump tut das), das
   Fenster verschob sich, und derselbe unveränderte Kommentar wäre bei JEDEM
   künftigen Bump als Zuwachs UND Verlust gemeldet worden. Kontext ist jetzt
   reine Beschreibung für die Fehlermeldung, keine Identität mehr.
   ════════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { erheben, vergleichen, schluessel } = require('../tools/gebeugte-marke-literale-erheben.js');

const FIXTURE_PFAD = path.join(__dirname, 'fixtures', 'u2-adr-374-gebeugte-marke-literale-bestand.json');
const FIXTURE = () => JSON.parse(fs.readFileSync(FIXTURE_PFAD, 'utf8'));

function berichtZeile(e) {
  return '    ' + e.datei + '  «' + e.kontext + '»';
}

/* ── Positivkontrolle ─────────────────────────────────────────────────────
   Eine leere Erhebung wäre kein bestandener, sondern ein eingebrochener
   Wächter — der Gang durch die Dateien liefe ins Leere und meldete "nichts
   zu sehen", ohne je etwas gesehen zu haben. */
test('[ADR-374·Ausbeute] die Erhebung findet überhaupt etwas, bevor sie etwas behauptet', () => {
  const live = erheben();
  assert.ok(live.length >= 5,
    'die Erhebung fand fast nichts (' + live.length + ') — Muster oder Dateiliste eingebrochen?');
});

test('[ADR-374·Ausbeute] die eingefrorene Fixture selbst ist nicht leer', () => {
  const fix = FIXTURE();
  assert.ok(Array.isArray(fix.eintraege) && fix.eintraege.length >= 5,
    'die Fixture trägt zu wenige Einträge, um als Maßstab zu taugen');
});

/* ── Hauptprobe: die Menge gegen den eingefrorenen Bestand ───────────────── */
test('[ADR-374] die heutige Menge gebeugter Vivodepot-Literale ist genau die eingefrorene — jede Abweichung ein Fund, kein stilles Grün', () => {
  const live = erheben();
  const eingefroren = FIXTURE().eintraege;
  const { zuwachs, verlust } = vergleichen(live, eingefroren);

  if (zuwachs.length) {
    const bericht = zuwachs.map(berichtZeile).join('\n');
    assert.fail(
      zuwachs.length + ' neue gebeugte „Vivodepot"-Fundstelle(n), die die eingefrorene Liste noch\n'
      + 'nicht kennt — meistens ein harmloser neuer Kommentar, kann aber ein echter Rückfall sein\n'
      + '(wie die zwei Sätze, die U2-ADR-371 behoben hat). Prüfen, dann mit Grund in\n'
      + 'tests/fixtures/u2-adr-374-gebeugte-marke-literale-bestand.json eintragen:\n' + bericht);
  }
  if (verlust.length) {
    const bericht = verlust.map(berichtZeile).join('\n');
    assert.fail(
      verlust.length + ' Fundstelle(n) aus der eingefrorenen Liste sind im Bestand nicht mehr da —\n'
      + 'meistens ein Fix (gut!), aber zu bestätigen, dann die Fixture nachziehen\n'
      + '(node tools/gebeugte-marke-literale-erheben.js --json):\n' + bericht);
  }
});

/* ── Rot-Beweis: der Vergleicher greift wirklich ──────────────────────────
   Direkt gegen die Vergleichsfunktion, mit synthetischen Daten — ohne echte
   Quelldateien zu verändern. Beweist: ein hinzugefügter Treffer UND ein
   entfernter Treffer werden beide erkannt, nicht nur einer der beiden
   Richtungen. */
test('[ADR-374·Rot-Beweis] ein neu hinzugekommener gebeugter Treffer färbt die Probe rot', () => {
  const eingefroren = [{ datei: 'x.html', treffer: 'Vivodepots', kontext: 'a' }];
  const live = [
    { datei: 'x.html', treffer: 'Vivodepots', kontext: 'a' },
    { datei: 'x.html', treffer: 'Vivodepotes', kontext: 'Vivodepotes NEU' },
  ];
  const { zuwachs, verlust } = vergleichen(live, eingefroren);
  assert.equal(zuwachs.length, 1, 'der neue Treffer muss als Zuwachs auffallen');
  assert.equal(zuwachs[0].treffer, 'Vivodepotes');
  assert.equal(verlust.length, 0);
});

test('[ADR-374·Rot-Beweis] ein aus dem Bestand verschwundener Treffer färbt die Probe ebenso rot', () => {
  const eingefroren = [
    { datei: 'x.html', treffer: 'Vivodepots', kontext: 'a' },
    { datei: 'x.html', treffer: 'Vivodepotes', kontext: 'Vivodepotes ALT' },
  ];
  const live = [{ datei: 'x.html', treffer: 'Vivodepots', kontext: 'a' }];
  const { zuwachs, verlust } = vergleichen(live, eingefroren);
  assert.equal(verlust.length, 1, 'der verschwundene Treffer muss als Verlust auffallen');
  assert.equal(verlust[0].treffer, 'Vivodepotes');
  assert.equal(zuwachs.length, 0);
});

/* Die Zwillings-Falle: zwei Treffer mit demselben Datei+Treffer-Schlüssel (der
   Erbschein-Wortlaut steht dreifach — Kennung, Bündel, Lese-App-Kopie, alle
   „Vivodepots") dürfen NICHT in einer Menge zu einem verschmelzen. Verschwände
   einer der Zwillinge, muss das auffallen. */
test('[ADR-374·Rot-Beweis] ZWEI Treffer mit identischem Schlüssel — der Vergleicher zählt, verschmilzt nicht', () => {
  const eingefroren = [
    { datei: 'x.html', treffer: 'Vivodepots', kontext: 'gleicher text' },
    { datei: 'x.html', treffer: 'Vivodepots', kontext: 'gleicher text' },
  ];
  const liveNochBeide = [
    { datei: 'x.html', treffer: 'Vivodepots', kontext: 'gleicher text' },
    { datei: 'x.html', treffer: 'Vivodepots', kontext: 'gleicher text' },
  ];
  assert.deepEqual(vergleichen(liveNochBeide, eingefroren), { zuwachs: [], verlust: [], unveraendert: 2 },
    'zwei identische Treffer bleiben zwei — kein stilles Verschmelzen');

  const liveNurEiner = [{ datei: 'x.html', treffer: 'Vivodepots', kontext: 'gleicher text' }];
  const { verlust } = vergleichen(liveNurEiner, eingefroren);
  assert.equal(verlust.length, 1,
    'verschwindet EINER von zwei Zwillingen, muss das als Verlust auffallen — nicht als "Menge unverändert"');
});

/* DER FEHLALARM, DEN KONVOI 8 GEFUNDEN HAT: eine Fundstelle wird innerhalb ihrer
   Datei verschoben (eine Zeile davor eingefügt, der Kontext ändert sich komplett),
   die Zeichenkette selbst bleibt aber dieselbe. Der Wächter MUSS grün bleiben —
   eine verschobene Zeile ist kein Befund. Ohne diese Probe wäre die Korrektur
   nur eine Behauptung. */
test('[ADR-374·Rot-Beweis] eine innerhalb der Datei VERSCHOBENE Fundstelle (neuer Kontext, gleicher Treffer) bleibt GRÜN', () => {
  const eingefroren = [{ datei: 'x.html', treffer: 'Vivodepots', kontext: 'alter Kontext vor der Zeile' }];
  const verschoben = [{ datei: 'x.html', treffer: 'Vivodepots', kontext: 'GANZ ANDERER Kontext, neue Zeile davor eingefügt' }];
  assert.deepEqual(vergleichen(verschoben, eingefroren), { zuwachs: [], verlust: [], unveraendert: 1 },
    'derselbe Treffer mit verschobenem Kontext ist KEIN Fund — nur die Zeichenkette zählt zur Identität');
});

/* Schlüssel-Funktion selbst — Datei UND Treffer tragen die Identität, Kontext NICHT. */
test('[ADR-374] schluessel() unterscheidet nach Datei UND Treffer, ignoriert den Kontext', () => {
  assert.notEqual(
    schluessel({ datei: 'a.html', treffer: 'Vivodepots', kontext: 'x' }),
    schluessel({ datei: 'b.html', treffer: 'Vivodepots', kontext: 'x' }),
    'derselbe Treffer in verschiedenen Dateien ist eine andere Fundstelle');
  assert.notEqual(
    schluessel({ datei: 'a.html', treffer: 'Vivodepots', kontext: 'x' }),
    schluessel({ datei: 'a.html', treffer: 'Vivodepotes', kontext: 'x' }),
    'eine andere gebeugte Form in derselben Datei ist eine andere Fundstelle');
  assert.equal(
    schluessel({ datei: 'a.html', treffer: 'Vivodepots', kontext: 'x' }),
    schluessel({ datei: 'a.html', treffer: 'Vivodepots', kontext: 'GANZ ANDERS' }),
    'derselbe Treffer in derselben Datei ist DIESELBE Fundstelle, unabhängig vom Kontext');
});
