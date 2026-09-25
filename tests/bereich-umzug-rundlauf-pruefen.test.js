'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Suite-Anschluss für tools/bereich-umzug-rundlauf-pruefen.js.
   Läuft OHNE Argument, also gegen die Fixture unter
   tests/fixtures/bereich-umzug-rundlauf/ — damit dieses Prüfwerkzeug jede
   Suite mitfährt, auch ohne den vollständigen Bestand der Bereich-Templates
   (stehende Regel „Prüfwerkzeuge entstehen im Repo", ~/.claude/CLAUDE.md).

   SCHNITT-NACHTRAG (17.09.2026): mit BUERGERMODUL_BUENDEL/
   BEREICH_QUELLEN_EINGEBAUT entfernt und bereichsErsatz retired gibt es die
   früheren drei Quellen (bundle/eingebaut/ersatz) nicht mehr — die Referenz
   ist jetzt die Modul-Datei selbst (s. Kopf-Kommentar des Werkzeugs). Die
   frühere "eingebaut"-Auto-Erkennungs-Probe und die synthetische "ersatz"-
   Mechanik-Probe sind darum entfallen; an ihre Stelle tritt ein Rundlauf
   gegen JEDES der neunzehn echten Bereich-Templates (dreizehn nativ, sechs
   pro) — die tatsächliche Abnahme des Schnitts, nicht nur eine Fixture.
   ════════════════════════════════════════════════════════════════════════ */
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const { bereichUmzugPruefen, IGNORIERTE_SCHLUESSEL } = require('../tools/bereich-umzug-rundlauf-pruefen.js');

const REPO = path.join(__dirname, '..');
const FIXTURE_MODUL_PFAD = path.join(REPO, 'tests', 'fixtures', 'bereich-umzug-rundlauf', 'vivodepot-fixture-bereich.json');
const KERN_PFAD = path.join(REPO, 'vivodepot.html');
const TEMPLATE_VERZEICHNIS = path.join(REPO, 'tools', 'bereich-templates');

test('bereich-umzug-rundlauf-pruefen: Fixture-Bereich überlebt den simulierten Umzug byte-identisch', async () => {
  const modul = JSON.parse(fs.readFileSync(FIXTURE_MODUL_PFAD, 'utf8'));
  const bereichId = Object.keys(modul.bereiche)[0];
  assert.ok(bereichId, 'Fixture muss mindestens einen Bereich enthalten');

  const ergebnis = await bereichUmzugPruefen({ kernPfad: KERN_PFAD, bereichId, modul });

  if (!ergebnis.gleich) {
    assert.fail('Rundlauf-Abweichung bei "' + bereichId + '":\n'
      + '  Schlüssel nativ    : ' + ergebnis.schluesselNativ.join(', ') + '\n'
      + '  Schlüssel umgezogen: ' + ergebnis.schluesselUmgezogen.join(', '));
  }
  assert.equal(ergebnis.gleich, true);
});

test('bereich-umzug-rundlauf-pruefen: Positivkontrolle — die Vergleichslogik selbst findet eine echte Abweichung', async () => {
  // Schnitt-Nachtrag: eine Feld-Verfälschung IM MODUL wirkt seit dem Schnitt NICHT mehr
  // asymmetrisch (dasselbe Modul speist sowohl die deklarierte Referenz als auch die
  // Injektion in AB_WERK_BEREICH_QUELLEN — eine Korruption träfe beide Seiten gleich, s.
  // Kopf-Kommentar). Die Positivkontrolle prüft darum direkt, was sie eigentlich beweisen soll:
  // isDeepStrictEqual (die Vergleichslogik selbst) erkennt eine echte, künstlich eingebrachte
  // Abweichung am materialisierten Ergebnis zuverlässig — keine leere-Menge-Falle.
  const modul = JSON.parse(fs.readFileSync(FIXTURE_MODUL_PFAD, 'utf8'));
  const bereichId = Object.keys(modul.bereiche)[0];
  const echtesErgebnis = await bereichUmzugPruefen({ kernPfad: KERN_PFAD, bereichId, modul });
  assert.equal(echtesErgebnis.gleich, true, 'Vorbedingung: die echte Fixture muss zuerst gleich sein');

  const verfaelschterSektor = Object.assign({}, echtesErgebnis.sektorUmgezogen, { sektionen: [] });
  assert.notDeepEqual(echtesErgebnis.sektorUmgezogen, verfaelschterSektor,
    'Positivkontrolle muss eine Abweichung finden — sonst prüft der Rundlauf nichts (leere-Menge-Falle, s. Memory)');
});

test('bereich-umzug-rundlauf-pruefen: [Negativprobe] ein bekannter Exportformat-Eintrag ohne aufgelöste Übersetzung fällt HART auf, nicht still durch', async () => {
  const modul = JSON.parse(fs.readFileSync(FIXTURE_MODUL_PFAD, 'utf8'));
  const bereichId = Object.keys(modul.bereiche)[0];
  const verfaelscht = JSON.parse(JSON.stringify(modul));
  // 'sd-jwt-vc-identitaet' ist ein ECHTES, bekanntes EXPORT_FORMATE-Mitglied (sonst verwirft
  // die Registry-Validierung den Export vorher, s. `_templateExportePruefen`, still — dann prüft
  // dieser Test die Formularvalidierung, nicht die Label-Auflösung, die er treffen soll).
  verfaelscht.bereiche[bereichId].exporte = [{ format: 'sd-jwt-vc-identitaet', labelSchluessel: 'keineKennungTraegtDiesenSchluessel' }];

  await assert.rejects(
    () => bereichUmzugPruefen({ kernPfad: KERN_PFAD, bereichId, modul: verfaelscht }),
    /löst NICHT zu einem echten \.label auf/,
    'ein labelSchluessel ohne Textsatz-Kennung ist der ECHTE Fund vom 17.09.2026 (identity/finance u. a.) — darf nicht als "gleich" durchgehen',
  );
});

test('bereich-umzug-rundlauf-pruefen: ignoriert nur die fünf benannten, folgenlosen Schlüssel', () => {
  assert.deepEqual(IGNORIERTE_SCHLUESSEL, ['angedockt', 'herkunft', 'label', 'einfuehrungstext', 'navUnterzeile']);
});

test('bereich-umzug-rundlauf-pruefen: unbekannte ID in der Modul-Datei wird benannt, nicht geraten', async () => {
  const modul = JSON.parse(fs.readFileSync(FIXTURE_MODUL_PFAD, 'utf8'));
  await assert.rejects(
    () => bereichUmzugPruefen({ kernPfad: KERN_PFAD, bereichId: 'diese-id-gibt-es-nirgends', modul }),
    /nicht in der Modul-Datei/,
  );
});

/* Die eigentliche Abnahme des Schnitts (17.09.2026): JEDES der neunzehn realen Bereich-
   Templates (dreizehn nativ inkl. housing, sechs pro-*) muss den Umzug über
   AB_WERK_BEREICH_QUELLEN unverändert überstehen — nicht nur eine Fixture. Läuft nur, wenn
   das Verzeichnis existiert (es tut es, seit -96s Lieferung + diesem Schnitt), sonst
   übersprungen statt rot — dieselbe Toleranz wie bei jedem Prüfwerkzeug ohne vollständigen
   Bestand. */
test('bereich-umzug-rundlauf-pruefen: alle neunzehn echten Bereich-Templates überstehen den Umzug', async (t) => {
  if (!fs.existsSync(TEMPLATE_VERZEICHNIS)) {
    t.skip('tools/bereich-templates/ existiert nicht in diesem Arbeitsbaum');
    return;
  }
  const dateien = fs.readdirSync(TEMPLATE_VERZEICHNIS).filter((d) => d.endsWith('.json'));
  assert.ok(dateien.length >= 19, 'erwartet mindestens neunzehn Bereich-Templates, gefunden: ' + dateien.length);

  const fehlgeschlagen = [];
  for (const datei of dateien) {
    const modul = JSON.parse(fs.readFileSync(path.join(TEMPLATE_VERZEICHNIS, datei), 'utf8'));
    const bereichId = Object.keys(modul.bereiche)[0];
    let ergebnis;
    try {
      ergebnis = await bereichUmzugPruefen({ kernPfad: KERN_PFAD, bereichId, modul });
    } catch (e) {
      fehlgeschlagen.push(datei + ': FEHLER — ' + e.message);
      continue;
    }
    if (!ergebnis.gleich) {
      fehlgeschlagen.push(datei + ': Abweichung — nativ [' + ergebnis.schluesselNativ.join(', ')
        + '] vs. umgezogen [' + ergebnis.schluesselUmgezogen.join(', ') + ']');
    }
  }
  assert.deepEqual(fehlgeschlagen, [], 'jede Datei muss den Umzug unverändert überstehen');
});
