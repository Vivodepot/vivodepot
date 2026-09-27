'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   validierung-html-pruefen rotmachbar — „Drei Korrekturen und zwei
   Messungen" (13.08.2026), Zug 1.
   ────────────────────────────────────────────────────────────────────────────
   Fixture-Kopien (nie im Arbeitsbaum, nie die echte validierung.html — die
   liegt außerhalb dieses Repos): eine veraltete Zahl schlägt an → rot,
   frische Zahl → grün. Regel 18.
   ════════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { pruefe, leseFaktenbasisZahlen, leseSbomKomponenten, leseSbomMitPaketKennung } = require('../tools/validierung-html-pruefen.js');

/* Die SBOM-Fixture kam am 15.08. dazu (A245, vierte Zahl). Sie traegt DREI
   Komponenten — bewusst weder 2 (der alte falsche Seitenwert) noch 7 (der echte
   Bestand): eine Probe, die zufaellig mit der Wirklichkeit uebereinstimmt, misst
   nicht, ob der Wächter liest, sondern nur, dass beide Zahlen gleich sind. */
/* NACHTRAG 20.08.2026 (H2/W11): die Fixture trägt jetzt DREI Komponenten, von denen
   genau EINE eine Paket-Kennung hat. Zwei verschiedene Zahlen sind Absicht — der
   berichtigte OSV-Satz nennt beide („X von Y"), und ein Werkzeug, das sie
   verwechselt, bliebe bei 3-von-3 unentdeckt. */
const SBOM_FIXTUR = JSON.stringify({ components: [
  { name: 'a', purl: 'pkg:npm/a@1.0.0' }, { name: 'b' }, { name: 'c' },
] });

function mitFixtures(faktenbasisInhalt, validierungInhalt, fn, sbomInhalt = SBOM_FIXTUR) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'validierung-pruefen-'));
  const faktenbasisPfad = path.join(tmp, 'faktenbasis.md');
  const validierungPfad = path.join(tmp, 'validierung.html');
  const sbomPfad = path.join(tmp, 'sbom.cdx.json');
  fs.writeFileSync(faktenbasisPfad, faktenbasisInhalt, 'utf8');
  fs.writeFileSync(validierungPfad, validierungInhalt, 'utf8');
  fs.writeFileSync(sbomPfad, sbomInhalt, 'utf8');
  try { return fn(faktenbasisPfad, validierungPfad, sbomPfad); } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
}

const FAKTENBASIS_FIXTUR = '## Prüfebene\n\n- Suite (Node-Tests, echter Lauf `node --test`, TAP-Summenzeile): 100\n- E2E (Playwright, `test(`-Aufrufe in `tests/e2e/*.spec.js`, mechanisch gezählt, nicht ausgeführt): 10\n';

/* `libs` ist ein Paar: die Seite traegt die Bibliotheken-Zahl an ZWEI Stellen,
   je zweisprachig. Getrennt setzbar, weil genau das der reale Fall war — eine
   Stelle nachgezogen, die andere vergessen. */
/* `libs` ist seit dem 20.08. ein Paar von PAAREN: die berichtigte Fassung nennt je
   Fundstelle „X abfragbar von Y gesamt". Getrennt setzbar bleibt beides, weil genau
   das der reale Fall war — eine Stelle nachgezogen, die andere vergessen.
   `datum` erlaubt der Probe, den W11-Fall zu bauen: zwei Stände auf einer Seite. */
/* NACHTRAG 14.09.2026 (Befund): kein `standZahl`-Parameter mehr — die
   frühere „Kopfzeile" ist keine eigene Quelle mehr (s. Kommentar im Werkzeug).
   Stattdessen trägt die Fixture jetzt echtes `.zahl-label`-Markup, damit die
   Kachel-Hauptzahl am LABEL hängt, nicht an ihrer Position — UND eine fremde
   Zeile mit demselben Wortlaut („N automatische Tests"), die den real
   gefundenen Kollisionsfall (die K22-Kryptotest-Zeile) nachbildet: ein
   Wächter, der wieder lose auf Text matcht, würde genau HIER erneut anschlagen. */
function validierungFixtur(kachelZahl, schicht1, e2e, libs = [[1, 3], [1, 3]], datum = ['01.01.2026', '01.01.2026']) {
  return `<div>Fremde Zahlenaussage, nicht die Kachel: 15 automatische Tests (K22-01 bis K22-15).</div>\n`
    + `<span class="zahl">${kachelZahl}</span>\n`
    + `<span class="zahl-label"><span lang-de>Automatische Tests</span><span lang-en>Automated tests</span></span>\n`
    + `<span class="zahl-sub">0 Fehler · Schicht 1 (${schicht1}) + e2e (${e2e}), einzeln gezählt · Stand ${datum[0]}</span>\n`
    + `<span lang-de>0 bekannte Schwachstellen · ${libs[0][0]} Bibliotheken mit Paket-Kennung geprüft (von ${libs[0][1]} SBOM-Komponenten)</span>`
    + `<span lang-en>0 known vulnerabilities · ${libs[0][0]} libraries with package identifier checked (of ${libs[0][1]} SBOM components)</span>\n`
    + `<span class="zahl-sub">OSV.dev · <span lang-de>${libs[1][0]} von ${libs[1][1]} SBOM-Komponenten abfragbar</span>`
    + `<span lang-en>${libs[1][0]} of ${libs[1][1]} SBOM components queryable</span> · Stand ${datum[1]}</span>\n`;
}

test('[validierung-html] leseFaktenbasisZahlen liest Suite+E2E korrekt', () => {
  mitFixtures(FAKTENBASIS_FIXTUR, validierungFixtur(110, 100, 10), (faktenbasisPfad) => {
    const z = leseFaktenbasisZahlen(faktenbasisPfad);
    assert.deepEqual(z, { suiteZahl: 100, e2eZahl: 10, summe: 110 });
  });
});

test('[validierung-html] frische, übereinstimmende Zahlen sind grün', () => {
  mitFixtures(FAKTENBASIS_FIXTUR, validierungFixtur(110, 100, 10), (faktenbasisPfad, validierungPfad, sbomPfad) => {
    const { abweichungen } = pruefe(validierungPfad, faktenbasisPfad, sbomPfad);
    assert.deepEqual(abweichungen, []);
  });
});

test('[14.09.2026] eine fremde „N automatische Tests"-Zeile löst KEINE Abweichung aus', () => {
  /* Der real gefundene Fall: die frühere „Kopfzeile"-Prüfung fand keine echte
     Kopfzeile mehr, sondern zufällig die K22-Kryptotest-Zeile, und meldete sie
     als falsche Suite-Zahl. Die Fixture trägt diese Zeile immer (s.
     `validierungFixtur`) — hier wird geprüft, dass sie bei stimmigen echten
     Zahlen spurlos bleibt. */
  mitFixtures(FAKTENBASIS_FIXTUR, validierungFixtur(110, 100, 10), (faktenbasisPfad, validierungPfad, sbomPfad) => {
    const { abweichungen } = pruefe(validierungPfad, faktenbasisPfad, sbomPfad);
    assert.deepEqual(abweichungen, [], 'die fremde Zeile darf unter keinen Umständen als Abweichung zählen');
  });
});

test('[validierung-html] rot⇄grün: eine veraltete Kachel-Summe (der zweimal echte Stolperstein) schlägt an', () => {
  mitFixtures(FAKTENBASIS_FIXTUR, validierungFixtur(942, 100, 10), (faktenbasisPfad, validierungPfad, sbomPfad) => {
    const { abweichungen } = pruefe(validierungPfad, faktenbasisPfad, sbomPfad);
    assert.equal(abweichungen.length, 1);
    assert.match(abweichungen[0], /Kachel-Hauptzahl/);
  });
});

test('[validierung-html] veralteter E2E-Anteil in der Kachel-Unterzeile schlägt an', () => {
  mitFixtures(FAKTENBASIS_FIXTUR, validierungFixtur(110, 100, 16), (faktenbasisPfad, validierungPfad, sbomPfad) => {
    const { abweichungen } = pruefe(validierungPfad, faktenbasisPfad, sbomPfad);
    assert.equal(abweichungen.length, 1);
    assert.match(abweichungen[0], /e2e \(/);
  });
  // dieselbe Mutation, aber die Kachel-Hauptzahl NICHT nachgezogen (der reale 13.08.-Fehler:
  // die Summe blieb stehen, obwohl ein Teil sich änderte) — beide Stellen schlagen an.
  mitFixtures(FAKTENBASIS_FIXTUR, validierungFixtur(110, 94, 16), (faktenbasisPfad, validierungPfad, sbomPfad) => {
    const { abweichungen } = pruefe(validierungPfad, faktenbasisPfad, sbomPfad);
    assert.equal(abweichungen.length, 2);
  });
});

/* ════════════════════════════════════════════════════════════════════════════
   A245 — DIE VIERTE ZAHL: DER OSV-BLOCK
   ────────────────────────────────────────────────────────────────────────────
   „0 bekannte Schwachstellen · 2 Bibliotheken geprüft" stand am 15.08. an zwei
   Stellen der Seite, zweisprachig, gegen sieben SBOM-Komponenten — vier falsche
   Angaben, die dieser Wächter nicht sah, weil er die Zahl nicht kannte.
   ════════════════════════════════════════════════════════════════════════════ */

test('[A245] leseSbomKomponenten zählt die Komponenten der SBOM', () => {
  mitFixtures(FAKTENBASIS_FIXTUR, validierungFixtur(110, 100, 10), (f, v, sbomPfad) => {
    assert.equal(leseSbomKomponenten(sbomPfad), 3);
  });
});

test('[H2] leseSbomMitPaketKennung zählt nur, was OSV.dev überhaupt kennt', () => {
  mitFixtures(FAKTENBASIS_FIXTUR, validierungFixtur(110, 100, 10), (f, v, sbomPfad) => {
    assert.equal(leseSbomMitPaketKennung(sbomPfad), 1, 'eine von drei trägt eine purl');
    assert.notEqual(leseSbomMitPaketKennung(sbomPfad), leseSbomKomponenten(sbomPfad),
      'zwei verschiedene Zählgegenstände — sonst prüfte die Probe nichts');
  });
});

test('[A245·Rot] eine veraltete OSV-Zahl schlägt an — an BEIDEN Stellen, beide Sprachen', () => {
  mitFixtures(FAKTENBASIS_FIXTUR, validierungFixtur(110, 100, 10, [[2, 7], [2, 7]]),
    (faktenbasisPfad, validierungPfad, sbomPfad) => {
      const { abweichungen } = pruefe(validierungPfad, faktenbasisPfad, sbomPfad);
      /* Vier Fundstellen (zwei Stellen × zwei Sprachen) × zwei falsche Zahlen je
         Fundstelle = acht Meldungen. Die alte Fassung sah nur eine Zahl je Stelle. */
      assert.equal(abweichungen.length, 8);
      assert.ok(abweichungen.every((a) => /OSV-Fundstelle/.test(a)));
    });
});

test('[A245·Rot] nur EINE der zwei Stellen nachgezogen — der halbe Fix fällt auf', () => {
  mitFixtures(FAKTENBASIS_FIXTUR, validierungFixtur(110, 100, 10, [[1, 3], [2, 7]]),
    (faktenbasisPfad, validierungPfad, sbomPfad) => {
      const { abweichungen } = pruefe(validierungPfad, faktenbasisPfad, sbomPfad);
      assert.equal(abweichungen.length, 4, 'die zweite Stelle, beide Sprachen, beide Zahlen');
    });
});

test('[H2·Rot] die ABFRAGBAR-Zahl allein falsch — die Gesamtzahl deckt sie nicht zu', () => {
  /* Der Fall, den die alte Fassung strukturell nicht sehen konnte: sie kannte nur
     EINE Zahl je Stelle. „7 von 7 abfragbar" wäre ihr als richtig durchgegangen. */
  mitFixtures(FAKTENBASIS_FIXTUR, validierungFixtur(110, 100, 10, [[3, 3], [3, 3]]),
    (faktenbasisPfad, validierungPfad, sbomPfad) => {
      const { abweichungen } = pruefe(validierungPfad, faktenbasisPfad, sbomPfad);
      assert.equal(abweichungen.length, 4, 'vier Fundstellen, je die abfragbar-Zahl');
      assert.ok(abweichungen.every((a) => /abfragbar/.test(a)));
    });
});

test('[A245·Grün] stimmen alle Zahlen, meldet der Wächter nichts', () => {
  mitFixtures(FAKTENBASIS_FIXTUR, validierungFixtur(110, 100, 10),
    (faktenbasisPfad, validierungPfad, sbomPfad) => {
      assert.deepEqual(pruefe(validierungPfad, faktenbasisPfad, sbomPfad).abweichungen, []);
    });
});

test('[W11·Rot] zwei verschiedene Stände auf EINER Seite schlagen an', () => {
  /* Genau der Befund von W11: dieselbe Angabe stand zweimal auf der Seite und wurde
     nur an einer Stelle nachgezogen. Gemessen wird die Seite gegen SICH SELBST — ein
     Soll von aussen wäre am Folgetag rot, ohne dass sich etwas verschlechtert hätte. */
  mitFixtures(FAKTENBASIS_FIXTUR, validierungFixtur(110, 100, 10, undefined, ['20.06.2026', '17.08.2026']),
    (faktenbasisPfad, validierungPfad, sbomPfad) => {
      const { abweichungen } = pruefe(validierungPfad, faktenbasisPfad, sbomPfad);
      assert.equal(abweichungen.length, 1);
      assert.match(abweichungen[0], /Standdatum widersprüchlich/);
      assert.match(abweichungen[0], /20\.06\.2026/);
    });
});

test('[W11·Gegenprobe] EIN Stand an beiden Stellen ist grün', () => {
  mitFixtures(FAKTENBASIS_FIXTUR, validierungFixtur(110, 100, 10, undefined, ['17.08.2026', '17.08.2026']),
    (faktenbasisPfad, validierungPfad, sbomPfad) => {
      assert.deepEqual(pruefe(validierungPfad, faktenbasisPfad, sbomPfad).abweichungen, []);
    });
});

test('[A245] fehlt der OSV-Block ganz, wirft der Wächter — er meldet nicht grün', () => {
  const ohneOsv = '<span class="zahl">110</span>\n'
    + '<span class="zahl-label"><span lang-de>Automatische Tests</span><span lang-en>Automated tests</span></span>\n'
    + '<span class="zahl-sub">0 Fehler · Schicht 1 (100) + e2e (10), einzeln gezählt</span>\n';
  mitFixtures(FAKTENBASIS_FIXTUR, ohneOsv, (faktenbasisPfad, validierungPfad, sbomPfad) => {
    assert.throws(() => pruefe(validierungPfad, faktenbasisPfad, sbomPfad), /OSV-Zahlen fehlen/);
  });
});
