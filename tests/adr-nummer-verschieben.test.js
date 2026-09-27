'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   adr-nummer-verschieben.test.js — Fixture-Proben für das Umbenennungs-
   Werkzeug (17.09.2026, „ein Wächter gegen doppelt vergebene ADR-Nummern",
   Folge-Anordnung: U2-ADR-398 bleibt eine terminierte Ausnahme, das Werkzeug
   zu ihrer späteren Auflösung wird jetzt vorbereitet, nicht ausgeführt)
   ────────────────────────────────────────────────────────────────────────────
   Läuft NIE gegen den echten Bestand — nur gegen die Fixture unter
   tests/fixtures/adr-nummer-verschieben/repo/, in einer Kopie, damit ein
   Testlauf nichts im Repo verändert (Regel 18, dieselbe Bauform wie
   tests/adr-bestand-pruefen.test.js).
   ════════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { ladePlan, pruefePlan, fuehreAus } = require('../tools/adr-nummer-verschieben.js');

const FIXTURE_REPO = path.join(__dirname, 'fixtures', 'adr-nummer-verschieben', 'repo');

function mitKopie(fn) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'adr-nummer-verschieben-'));
  fs.cpSync(FIXTURE_REPO, tmp, { recursive: true });
  try {
    return fn(tmp);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

const GUELTIGER_PLAN = {
  alteDatei: 'vivodepot-U2-ADR-500-zweiter-inhaber-2026-01-01.md',
  neueDatei: 'vivodepot-U2-ADR-501-zweiter-inhaber-2026-01-01.md',
  alteNummer: '500',
  neueNummer: '501',
  verweise: [
    { datei: 'tests/probe-referenz.js', zeile: 1, erwartetTextEnthaelt: 'U2-ADR-500 (zweiter Inhaber)' },
  ],
};

test('[adr-nummer-verschieben] --probe ändert nichts, meldet aber den korrekten Plan', () => {
  mitKopie((tmp) => {
    const befunde = pruefePlan(GUELTIGER_PLAN, tmp);
    assert.deepEqual(befunde, [], 'ein gültiger Plan gegen die unveränderte Fixture darf keine Befunde melden');

    const { eigeneAenderungen, externeAenderungen } = fuehreAus(GUELTIGER_PLAN, { probe: true, repoWurzel: tmp });
    assert.equal(eigeneAenderungen[1].anzahl, 2, 'die alte Datei nennt sich selbst zweimal — H1 und Fließtext');
    assert.equal(externeAenderungen.length, 1);
    assert.equal(externeAenderungen[0].nach, '// Zitiert U2-ADR-501 (zweiter Inhaber) in einem Kommentar.');

    // NICHTS wurde geschrieben — probe ist wirklich folgenlos.
    assert.ok(fs.existsSync(path.join(tmp, 'docs', 'adr', 'vivodepot-U2-ADR-500-zweiter-inhaber-2026-01-01.md')));
    assert.ok(!fs.existsSync(path.join(tmp, 'docs', 'adr', 'vivodepot-U2-ADR-501-zweiter-inhaber-2026-01-01.md')));
    assert.equal(
      fs.readFileSync(path.join(tmp, 'tests', 'probe-referenz.js'), 'utf8'),
      '// Zitiert U2-ADR-500 (zweiter Inhaber) in einem Kommentar.\n',
    );
  });
});

test('[adr-nummer-verschieben] echter Lauf: Datei umbenannt, eigene UND externe Referenzen ersetzt — die Schwester-ADR (500, erster Inhaber) bleibt unberührt', () => {
  mitKopie((tmp) => {
    fuehreAus(GUELTIGER_PLAN, { probe: false, repoWurzel: tmp });

    const adrOrdner = path.join(tmp, 'docs', 'adr');
    assert.ok(!fs.existsSync(path.join(adrOrdner, 'vivodepot-U2-ADR-500-zweiter-inhaber-2026-01-01.md')));
    const neuerText = fs.readFileSync(path.join(adrOrdner, 'vivodepot-U2-ADR-501-zweiter-inhaber-2026-01-01.md'), 'utf8');
    assert.match(neuerText, /^# U2-ADR-501: Zweiter Inhaber, wandert nach 501$/m);
    assert.match(neuerText, /Verweist auf sich selbst als U2-ADR-501 im eigenen Text\./);

    assert.equal(
      fs.readFileSync(path.join(tmp, 'tests', 'probe-referenz.js'), 'utf8'),
      '// Zitiert U2-ADR-501 (zweiter Inhaber) in einem Kommentar.\n',
    );

    // DIE SCHWESTER-ADR (derselbe Nummernkörper 500, „erster Inhaber") ist NICHT betroffen —
    // genau der Fall, den ein blinder repoweiter `sed -i 's/500/501/'` zerstört hätte.
    const ersterInhaber = fs.readFileSync(path.join(adrOrdner, 'vivodepot-U2-ADR-500-erster-inhaber-2026-01-01.md'), 'utf8');
    assert.match(ersterInhaber, /^# U2-ADR-500: Erster Inhaber der Nummer$/m);
    assert.match(ersterInhaber, /pruefung: tests\/probe\.test\.js#U2-ADR-500/);
  });
});

test('[adr-nummer-verschieben·Rot-Beweis] eine verschobene Zeilennummer (Plan veraltet) bricht ab, OHNE etwas zu schreiben', () => {
  mitKopie((tmp) => {
    // Eine zusätzliche Zeile VOR der referenzierten schiebt die echte Fundstelle auf Zeile 2 —
    // der Plan zeigt noch auf Zeile 1, wo jetzt etwas anderes steht.
    const probePfad = path.join(tmp, 'tests', 'probe-referenz.js');
    fs.writeFileSync(probePfad, '// Eine neue Zeile davor.\n' + fs.readFileSync(probePfad, 'utf8'));

    const befunde = pruefePlan(GUELTIGER_PLAN, tmp);
    assert.equal(befunde.length, 1);
    assert.match(befunde[0], /probe-referenz\.js:1/);
    assert.match(befunde[0], /erwarteter Text nicht gefunden/);

    // Nichts verändert — die Datei mit der Nummer existiert unverändert weiter.
    assert.ok(fs.existsSync(path.join(tmp, 'docs', 'adr', 'vivodepot-U2-ADR-500-zweiter-inhaber-2026-01-01.md')));
  });
});

test('[adr-nummer-verschieben·Rot-Beweis] eine bereits existierende Zieldatei bricht ab', () => {
  mitKopie((tmp) => {
    fs.writeFileSync(path.join(tmp, 'docs', 'adr', GUELTIGER_PLAN.neueDatei), '# Kollision\n');
    const befunde = pruefePlan(GUELTIGER_PLAN, tmp);
    assert.ok(befunde.some((b) => b.includes('neueDatei existiert bereits')));
  });
});
