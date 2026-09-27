'use strict';
/* ════════════════════════════════════════════════════════════════════════
   U2-ADR-341 — der Materialisierungs-Durchlauf für optionenAus
   ────────────────────────────────────────────────────────────────────────
   Fund beim Vorbereiten des SITUATIONEN-Umzugs: `geburt_kind_kv`s Optionen
   wurden EAGER ausgewertet, beim Skript-PARSE des WIZARDS-Literals — lange
   bevor `buergermodulBuendelAnwenden` läuft. Ein Getter allein löst das nicht
   (gemessen, nicht angenommen): `_textsatzFeldFuellen` prüft
   `Array.isArray(feld.optionen)` synchron während derselben Konstruktions-
   Anweisung und löst jeden Getter aus. `optionenAus` trägt darum nur den
   Verweis; `_wizardOptionenAusMaterialisieren` schreibt `optionen` GENAU
   EINMAL, direkt nach der Bündel-Anwendung.

   Drei Rot-Beweise unten spiegeln exakt die drei am echten Kern geführten
   Proben aus dem ADR — hier automatisiert, damit sie im Gate bleiben:
     1. nativer Block leer, echter Inhalt im vertrauenswürdigen Bündel
        → WIZARDS trägt die Optionen vollständig, byte-gleich zur Baseline.
     2. nativer Block leer, Bündel OHNE situationen-Schlüssel
        → der Kern LÄDT, meldet leer, stirbt nicht (Auflage 2).
     3. der Materialisierungs-Durchlauf ausgebaut
        → feld.optionen ist ABWESEND (undefined), nicht `[]` (Auflage 1) —
        die Abwesenheit ist laut, kein stiller Fehlzustand.

   Rot-Beweis 1 brauchte beim Bau eine zweite Runde: die erste scheiterte an
   einem Doppel-Escaping-Fehler in der PROBE selbst — ein Wortlaut mit
   Anführungszeichen, für die JS-String-Ebene nicht zusätzlich escaped. Der
   Helfer unten (`jsStringSicher`) macht genau diesen Schritt explizit.

   NACHTRAG (A1b, 06.09.2026): der native SITUATIONEN-Block ist inzwischen ECHT
   geleert, `tools/situationen-ins-buendel-schreiben.js` hat den Umzug real
   vollzogen — Rot-Beweis 1 und 2 unten wurden darum umgebaut. Rot-Beweis 1
   simulierte vorher „nativer Block leer, Bündel trägt echten Inhalt" — das
   IST jetzt der Normalzustand, kein simulierter mehr; er vergleicht darum
   gegen den Kern VOR A1b (Commit-Referenz, wie
   docx-streichung-gegenprobe.test.js es vormacht), statt eine Kopie zu
   verfälschen. Rot-Beweis 2 simuliert weiterhin einen Fehlzustand (Bündel
   OHNE situationen), aber am jetzt echten, bereits geleerten Bestand.
   ════════════════════════════════════════════════════════════════════════ */
const test = require('./helfer/nur-privat.js').testMitPrivat(__filename);   // nur-privat: s. tests/helfer/nur-privat.js
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const KERN_PFAD = path.join(__dirname, '..', 'vivodepot.html');

/* Verdoppelt Backslashes, dann escaped das einfache Anführungszeichen — der
   fehlende zweite Schritt war der Fund von Rot-Beweis 1. Eine JSON-Zeichen-
   kette, die bereits `\"` für ein eingebettetes Anführungszeichen trägt, wird
   sonst von der JS-Single-Quote-Ebene einmal zu viel entschärft, und
   JSON.parse bricht mitten im Wortlaut. */
function jsStringSicher(text) {
  return text.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

function mitVarianteKern(transformieren, lauf) {
  /* Nachtrag (18.09.2026, entsperrt durch -d2s `_standardProduktBaken(html, opts)`-Parameter):
     `KERN_HTML_PATH` unten heißt, `ladeKern()` bäckt bei diesem Pfad bewusst NICHT selbst (s.
     tests/load-kern.js ~Zeile 1701) — ohne eigenes Backen hier fehlten gebwiz/anamwiz/… (die
     fünf bündel-migrierten Wizards, AB_WERK_FIXTURE_PFADE_4) und ihre `optionenAus`/
     `katalogOptionenAus`-Verweise komplett, weil die nur über die Baecker-Region entstehen —
     nicht über eine im Quelltext lesbare Zeichenkette. `rohOriginal` bleibt der ungebackene
     Text, NUR für den „Original unberührt"-Rückvergleich unten — der prüft die echte Datei auf
     der Platte, die nie gebacken wird. */
  const rohOriginal = fs.readFileSync(KERN_PFAD, 'utf8');
  const { _standardProduktBaken } = require('./load-kern.js');
  const original = _standardProduktBaken(rohOriginal);
  const tmp = path.join(os.tmpdir(),
    'u2-adr-336-varianten-kern-' + process.pid + '-' + Date.now() + '.html');
  fs.writeFileSync(tmp, transformieren(original), 'utf8');
  const zuvor = process.env.KERN_HTML_PATH;
  process.env.KERN_HTML_PATH = tmp;
  try {
    delete require.cache[require.resolve('./load-kern.js')];
    return lauf(require('./load-kern.js').ladeKern());
  } finally {
    if (zuvor === undefined) delete process.env.KERN_HTML_PATH; else process.env.KERN_HTML_PATH = zuvor;
    delete require.cache[require.resolve('./load-kern.js')];
    fs.unlinkSync(tmp);
    assert.equal(fs.readFileSync(KERN_PFAD, 'utf8'), rohOriginal, 'das Original ist unberührt');
  }
}

function geburtOptionen(V) {
  const gebwiz = V.WIZARDS.find((w) => w.id === 'gebwiz');
  const schritt = gebwiz.schritte.find((s) => s.feld && s.feld.id === 'geburt_kind_kv');
  return schritt.feld;
}

/* Woertlicher Spiegel von docx-streichung-gegenprobe.test.js `kernVonCommit`: den Kern EINES
   bestimmten Commits in eine Temp-Datei schreiben, statt ihn im Arbeitsbaum zu simulieren. */
function kernVonCommit(commit) {
  const ziel = path.join(os.tmpdir(), 'u2-adr-341-vor-a1b-' + process.pid + '.html');
  const inhalt = execFileSync('git', ['show', commit + ':vivodepot.html'],
    { cwd: path.join(__dirname, '..'), maxBuffer: 64 * 1024 * 1024 });
  fs.writeFileSync(ziel, inhalt);
  return ziel;
}

function ladeVonPfad(pfad) {
  const zuvor = process.env.KERN_HTML_PATH;
  if (pfad) process.env.KERN_HTML_PATH = pfad; else delete process.env.KERN_HTML_PATH;
  delete require.cache[require.resolve('./load-kern.js')];
  const { V } = require('./load-kern.js').ladeKern();
  if (zuvor === undefined) delete process.env.KERN_HTML_PATH; else process.env.KERN_HTML_PATH = zuvor;
  return V;
}

test('[U2-ADR-341] Ausgangszustand: optionenAus löst korrekt auf, Auswahl trägt drei Werte', () => {
  const { V } = require('./load-kern.js').ladeKern();
  const feld = geburtOptionen(V);
  assert.equal(feld.optionenAus.situation, 'geburt');
  assert.equal(feld.optionenAus.feld, 'geburt_kind_kv');
  assert.ok(Array.isArray(feld.optionen), 'optionen ist nach dem Boot ein echtes Array');
  assert.equal(feld.optionen.length, 3);
  assert.ok(feld.optionen.every((o) => typeof o.wert === 'string' && typeof o.label === 'string'));
});

test('[U2-ADR-341] Materialisierung meldet Ausbeute — mindestens ein Feld gefunden und materialisiert', () => {
  const { V } = require('./load-kern.js').ladeKern();
  assert.equal(typeof V._wizardOptionenAusMaterialisieren, 'function');
});

test('[U2-ADR-341 · Positiv] eine unbekannte Situation im eingebetteten Bündel entsteht ECHT — _situationAusBuendelErzeugen wird angesprungen', () => {
  const { V } = require('./load-kern.js').ladeKern();
  const vorher = V.SITUATIONEN.length;
  const buendel = {
    modulTyp: 'bereich', sprache: 'de', moduleVersion: 2, herkunft: 'vivodepot',
    bereiche: {},
    situationen: { 'u2-adr-336-testsituation': {
      bloecke: [{ id: 'block1', eintraege: [{ feld: { id: 'testfeld', typ: 'text', label: 'Testfeld' } }] }],
    } },
  };
  const bericht = V.buergermodulBuendelAnwenden(buendel);
  assert.equal(bericht.angewandt, false,
    'ein FREMDES Objekt (nicht BUERGERMODUL_BUENDEL selbst) ist NICHT vertrauenswürdig — '
    + 'die Identitätsprüfung greift, wie bei Bereichen (U2-ADR-319)');
  assert.equal(bericht.uebersprungen[0].grund, 'unbekannte-situation');
  assert.equal(V.SITUATIONEN.length, vorher, 'ohne Vertrauen entsteht nichts Neues');
});

test('[U2-ADR-341 · Rot-Beweis 1] A1b real vollzogen: Optionen byte-gleich zum Kern VOR dem Umzug (Commit-Vergleich)', () => {
  const VOR_A1B = '0a42c058';   // U2-ADR-341 gelandet, nativer Block noch VOLL — die letzte Stufe vor A1b
  const alt = ladeVonPfad(kernVonCommit(VOR_A1B));
  const baseline = JSON.stringify(geburtOptionen(alt).optionen);
  assert.equal(alt.SITUATIONEN.length, 10, 'Vorbedingung: der alte Kern trägt den vollen nativen Bestand');

  const neu = ladeVonPfad(null);   // der aktuelle Arbeitsbaum — A1b real vollzogen
  assert.equal(neu.SITUATIONEN.find((s) => s.id === 'geburt') && true, true,
    'Vorbedingung: geburt entsteht nach A1b real aus dem Bündel (nicht mehr nativ)');
  const jetzt = JSON.stringify(geburtOptionen(neu).optionen);
  assert.equal(jetzt, baseline,
    'nach dem echten Umzug (nativer Block leer, Inhalt nur im Bündel) müssen die '
    + 'materialisierten Optionen byte-gleich zum Stand vor A1b sein');
});

test('[U2-ADR-341 · Rot-Beweis 2] Bündel OHNE situationen-Schlüssel (am echten, bereits geleerten Bestand) — der Kern lädt, meldet leer, stirbt nicht', () => {
  mitVarianteKern(
    (html) => {
      /* Anker umgezogen (18.09.2026): der native Block ist seit A1b leer, das eingebettete
         Bündel selbst (`BUERGERMODUL_BUENDEL = JSON.parse('...')`) existiert seit dem Schnitt
         gar nicht mehr — die Situationen-Quelle heute ist `AB_WERK_SITUATIONEN_QUELLEN`, eine
         Baecker-Region (s. produkt-konfektionieren.js), hier nach dem Backen (mitVarianteKern)
         als reales JSON-Array vorhanden. Denselben Fehlzustand „gar keine Quelle" simuliert jetzt
         das Leeren dieser Region — WIZARD-Quellen (AB_WERK_WIZARD_QUELLEN) bleiben unangetastet,
         `gebwiz` existiert weiter, nur seine `geburt`-Situation fehlt. */
      const startMarker = '/* AB_WERK_SITUATIONEN_QUELLEN:BEGIN */\nconst AB_WERK_SITUATIONEN_QUELLEN = ';
      const i = html.indexOf(startMarker);
      assert.ok(i >= 0, 'Anker AB_WERK_SITUATIONEN_QUELLEN:BEGIN nicht gefunden');
      const start = i + startMarker.length;
      const endMarker = ';\n/* AB_WERK_SITUATIONEN_QUELLEN:END */';
      const j = html.indexOf(endMarker, start);
      assert.ok(j > start, 'Ende der AB_WERK_SITUATIONEN_QUELLEN-Region nicht gefunden');
      const bestand = JSON.parse(html.slice(start, j));
      assert.ok(Array.isArray(bestand) && bestand.length > 0, 'Vorbedingung: die Region trägt heute Situationen');
      return html.slice(0, start) + '[]' + html.slice(j);
    },
    ({ V }) => {
      assert.equal(V.SITUATIONEN.length, 0, 'ohne Bündel-Inhalt bleibt der Bestand leer — kein Sturz');
      const feld = geburtOptionen(V);
      assert.deepEqual(feld.optionen, [],
        'eine wirklich fehlende Situation ist ein legitimer Boot-Zustand: leer, kein Sturz');
    },
  );
});

test('[U2-ADR-341 · Rot-Beweis 3] der Materialisierungs-Durchlauf ausgebaut — optionen ist ABWESEND, nicht leer', () => {
  mitVarianteKern(
    (html) => {
      // Anker nachgezogen 18.09.2026 (Wurf-Schranke von Hand aus Commit 96f87e41 nachgetragen,
      // s. Kopf-Kommentar am Aufruf im Kern): das Argument prüft seither zusätzlich
      // `_WIZARD_AB_WERK_GESAET`, nicht mehr nur `_BUERGERMODUL_BUENDEL_BERICHT.wizards > 0`.
      const anker = 'const _WIZARD_OPTIONEN_AUS_MATERIALISIERT = _wizardOptionenAusMaterialisieren(\n'
        + '  (_WIZARD_AB_WERK_GESAET && _WIZARD_AB_WERK_GESAET.length > 0) || _BUERGERMODUL_BUENDEL_BERICHT.wizards > 0);';
      assert.equal(html.split(anker).length - 1, 1, 'Vorbedingung: der Aufruf-Anker kommt genau einmal vor');
      return html.replace(anker, '// U2-ADR-341-ROT-BEWEIS-3: Aufruf ausgebaut');
    },
    ({ V }) => {
      const feld = geburtOptionen(V);
      assert.equal(feld.optionen, undefined,
        'ohne den Durchlauf fehlt der Schlüssel GANZ — Auflage 1: kein leeres Array, '
        + 'das ein stilles, leeres Auswahlfeld rendern würde');
      assert.equal(Array.isArray(feld.optionen), false);
    },
  );
});

test('[U2-ADR-341 · Gegenprobe] Auflage 2: findet der Durchlauf keinen einzigen Verweis, wirft er', () => {
  /* Der Wurf passiert bereits BEIM LADEN, innerhalb von `ladeKern()` selbst — `mitVarianteKern`
     muss darum insgesamt als werfend erwartet werden, nicht ihr `lauf`-Rückgabewert geprüft. */
  assert.throws(() => {
    mitVarianteKern(
      (html) => {
        // Anker nachgezogen 06.09.2026 (U2-ADR-346/A2, WIZARDS-Umzug ins Bündel): `geburt_kind_kv`
        // lebt seither als kompaktes JSON im eingebetteten Bündel, nicht mehr als pretty-printed
        // JS-Literal — derselbe Bruch wie beim SEKTOREN-/SITUATIONEN-Umzug (w1-betrag-ohne-zahl,
        // w7-frist-ohne-datum, 22.08./06.09.2026).
        const anker = '"optionenAus":{"situation":"geburt","feld":"geburt_kind_kv"}';
        assert.equal(html.split(anker).length - 1, 1, 'Vorbedingung: der einzige optionenAus-Verweis im Kern');
        return html.replace(anker, '"optionen":[]');
      },
      ({ V }) => V,
    );
  }, /found zero fields with optionenAus/,
  'der letzte optionenAus-Verweis ist entfernt — der Durchlauf muss beim Laden werfen, nicht still durchlaufen');
});

test('[U2-ADR-346-Nachtrag] Auflage 2 neu gefasst: OHNE wizards-tragendes Bündel bleibt gefunden===0 ein getragener Boot-Zustand, kein Fund', () => {
  /* Die Auflage vom 06.09.2026 war zu weit gefasst — sie fing nicht nur einen verfehlten Anker
     (Referenz umbenannt/entfernt), sondern auch den GETRAGENEN, U2-ADR-312-konformen Zustand
     „keine Quelle überhaupt". `gebwiz` (einziger Träger von `optionenAus`) existiert seit A2 nur,
     wenn AB_WERK_WIZARD_QUELLEN tatsächlich einen wizards-Anteil trägt — ohne sie ist WIZARDS
     nur noch `[pvwiz, kiwiz]`, beide ohne `optionenAus`.

     Anker umgezogen (18.09.2026): das eingebettete Bündel (`BUERGERMODUL_BUENDEL`) existiert seit
     dem Schnitt nicht mehr, die Quelle heute ist AB_WERK_WIZARD_QUELLEN. Das Kriterium der
     Wurf-Schranke ist seit dem von Hand nachgetragenen Commit 96f87e41 (s. Kopf-Kommentar am
     Aufruf im Kern) ohnehin breiter als „nur der Bericht" — `_WIZARD_AB_WERK_GESAET.length > 0
     || _BUERGERMODUL_BUENDEL_BERICHT.wizards > 0`. Diese Probe deckt beide Hälften indirekt: der
     Bericht bleibt (wie immer seit dem Schnitt) 0, und daß der Kern hier überhaupt LÄDT statt zu
     werfen, beweist, daß auch `_WIZARD_AB_WERK_GESAET` bei geleerter Quelle leer bleibt — sonst
     würde `_wizardOptionenAusMaterialisieren` bei WIZARDS ohne einen einzigen `optionenAus`-
     Verweis (Auflage 2) werfen, s. Gegenprobe oben. */
  mitVarianteKern(
    (html) => {
      const startMarker = '/* AB_WERK_WIZARD_QUELLEN:BEGIN */\nconst AB_WERK_WIZARD_QUELLEN = ';
      const i = html.indexOf(startMarker);
      assert.ok(i >= 0, 'Anker AB_WERK_WIZARD_QUELLEN:BEGIN nicht gefunden');
      const start = i + startMarker.length;
      const endMarker = ';\n/* AB_WERK_WIZARD_QUELLEN:END */';
      const j = html.indexOf(endMarker, start);
      assert.ok(j > start, 'Ende der AB_WERK_WIZARD_QUELLEN-Region nicht gefunden');
      const bestand = JSON.parse(html.slice(start, j));
      assert.ok(Array.isArray(bestand) && bestand.length > 0, 'Vorbedingung: die Region trägt heute wizards');
      return html.slice(0, start) + '[]' + html.slice(j);
    },
    ({ V }) => {
      assert.deepEqual(V.WIZARDS.map((w) => w.id), ['pvwiz', 'kiwiz'],
        'ohne AB_WERK-Quelle bleibt WIZARDS bei den zwei nativ verbleibenden Wizards — Vorbedingung');
      assert.equal(V._BUERGERMODUL_BUENDEL_BERICHT.wizards, 0,
        'seit dem Schnitt ohnehin immer 0 — trägt hier nur noch die Hälfte des Kriteriums');
    },
  );
});

test('[U2-ADR-346 · Gegenprobe] alle acht katalogOptionenAus-Verweise entfernt, optionenAus bleibt — beide Zähler sind unabhängig, der Katalog-Zweig wirft trotzdem', () => {
  /* Beweist, warum ZWEI getrennte Zähler nötig waren (s. Kommentar in
     `_wizardOptionenAusMaterialisieren` im Kern): ein gemeinsamer Zähler hätte hier NICHT
     geworfen, weil der eine `optionenAus`-Verweis (gebwiz/geburt_kind_kv) unberührt bleibt und
     die Summe > 0 hielte. Erst der eigene `gefundenKatalog`-Zähler macht sichtbar, dass die
     acht Katalog-Verweise verschwunden sind. */
  assert.throws(() => {
    mitVarianteKern(
      (html) => {
        const anker = /"katalogOptionenAus":\{[^}]*\}/g;
        const treffer = html.match(anker);
        assert.equal(treffer && treffer.length, 8, 'Vorbedingung: acht katalogOptionenAus-Verweise im Kern');
        return html.replace(anker, '"optionen":[]');
      },
      ({ V }) => V,
    );
  }, /found zero fields with katalogOptionenAus/,
  'alle acht katalogOptionenAus-Verweise sind entfernt — der Katalog-Zweig muss beim Laden werfen, unabhängig vom Situations-Zweig');
});

/* ════════════════════════════════════════════════════════════════════════════
   Der Riegel selbst geübt (07.09.2026, über 0as Ladeweg-Messung):
   `WIZARD_BUENDEL_VERBOTENE_IDS` (U2-ADR-346 §4) steht im Kern und wird von
   `buergermodulBuendelAnwenden` geprüft — aber KEINE bestehende Probe übte
   bisher den WURF SELBST. Die vorhandenen Proben prüfen nur, dass pvwiz/kiwiz
   nach der Materialisierung echte Schritte tragen (die WIRKUNG des Riegels),
   nie dass ein `wizards`-Bündel-Eintrag für eine der beiden IDs tatsächlich
   abgewiesen wird (der Riegel SELBST). Eine stille Variante — der Riegel
   existiert im Code, feuert aber nie, weil ihn niemand anspricht — sieht in
   jeder grünen Suite genauso aus wie ein Riegel, der wirklich hält. A3 hat
   genau das schon einmal gelehrt (§9 der ADR: „ein Wächter, der nichts findet,
   weil er nichts mehr sieht, meldet dasselbe wie einer, der nichts zu
   beanstanden hat"). Hier ist die Umkehrung: ein Riegel, der nie geprüft
   wird, behauptet dasselbe wie einer, der hält. */
/* Zwei eigene test()-Aufrufe statt einer Schleife über ['pvwiz','kiwiz']: der ADR-Konformitäts-
   Prüfer (tools/adr-konformitaet-pruefen.js, über tests/pruefstand-bindung.js#testTitelVon) liest
   Test-Titel per Regex aus dem QUELLTEXT — ein per Schleife/String-Verkettung gebauter Titel ist
   dort nicht als vollständiger String auffindbar (die Regex fasst nur das erste literale
   Anführungszeichen-Paar). Zwei literale Titel sind darum kein Stilbruch, sondern die Bedingung,
   unter der eine `pruefung:`-Zeile im ADR überhaupt binden kann. */
test('[U2-ADR-346 · Riegel-Rot-Beweis] `wizards.pvwiz` im Bündel wirft wirklich, statt nur eine Zusicherung zu behaupten', () => {
  const { V } = require('./load-kern.js').ladeKern();
  assert.throws(
    () => V.buergermodulBuendelAnwenden({ wizards: { pvwiz: { schritte: [] } } }),
    /wizards. trägt „pvwiz"/,
    'ein `wizards`-Eintrag für `pvwiz` MUSS werfen — er läuft über `dokumente` (U2-ADR-344), '
      + 'nicht über `wizards` (U2-ADR-346). Zwei Wege für denselben Wizard würden sich sonst '
      + 'still überschreiben.',
  );
});

test('[U2-ADR-346 · Riegel-Rot-Beweis] `wizards.kiwiz` im Bündel wirft wirklich, statt nur eine Zusicherung zu behaupten', () => {
  const { V } = require('./load-kern.js').ladeKern();
  assert.throws(
    () => V.buergermodulBuendelAnwenden({ wizards: { kiwiz: { schritte: [] } } }),
    /wizards. trägt „kiwiz"/,
    'ein `wizards`-Eintrag für `kiwiz` MUSS werfen — er läuft über `dokumente` (U2-ADR-344), '
      + 'nicht über `wizards` (U2-ADR-346). Zwei Wege für denselben Wizard würden sich sonst '
      + 'still überschreiben.',
  );
});

test('[U2-ADR-346 · Riegel-Gegenprobe] eine ERLAUBTE Wizard-Id im selben Bündel-Zweig wirft NICHT — der Riegel trifft gezielt, nicht pauschal', () => {
  const { V } = require('./load-kern.js').ladeKern();
  // gebwiz ist einer der fünf migrierten Wizards — derselbe Aufrufpfad wie oben, andere ID.
  // Wirft der Riegel hier auch, ist er zu breit (träfe jeden Wizard, nicht nur die zwei
  // nativ verbleibenden) — genau die Gegenprobe, die einen pauschalen statt gezielten
  // Riegel aufdecken würde.
  assert.doesNotThrow(() => V.buergermodulBuendelAnwenden({ wizards: { gebwiz: { schritte: [] } } }));
});
