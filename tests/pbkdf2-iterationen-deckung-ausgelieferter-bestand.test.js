'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   Deckungs-Wächter über den ganzen ausgelieferten Bestand (U2-ADR-271, Nachtrag
   nach der Gegenlesung, 04.09.2026 — nachgetragen 28.09.2026)
   ────────────────────────────────────────────────────────────────────────────
   Die ursprüngliche Auflage prüfte nur VERSTÖSSE gegen `PBKDF2_ITERATIONEN_JE_KRYPTOVERSION`
   in `vivodepot.html` — das sieht sieben von acht Stellen strukturell nicht: Sie sind kein
   Verstoß, sondern eigene, unangeschlossene Konstanten in den vier separat ausgelieferten
   Dateien. Der gefährliche Fall ist nicht ein zweiter Wert, sondern eine STILLE DIVERGENZ —
   `PBKDF2_ITERATIONS` hebt sich im Kern, eine der anderen Stellen bleibt stehen, kein
   Allowlist-Verstoß entsteht, aber der Kern leitet danach anders ab als die Lese-App.

   WAS DIESE PROBE PRÜFT: jedes Vorkommen einer benannten PBKDF2-Iterationszahl-Konstante über
   die fünf Träger-Dateien hinweg trägt DENSELBEN Wert wie die lebende `PBKDF2_ITERATIONS` aus
   dem Kern — nicht als zweite, separat gepflegte Literal-Liste hier, sondern gegen den echten
   Dateitext gegrept.

   WAS DIESE PROBE NICHT TUT: sie reduziert die acht Stellen nicht auf eine — das wäre ein
   eigener Bau (vivodepot-lesen.html ist eine eigenständig ausgelieferte Datei, ihre Konstante
   zu entfernen ist keine Aufräumarbeit dieses Auftrags). Sie liest auch `eintrag.kdf.iterationen`
   nirgends zurück — das ist bewusst so (U2-ADR-230). */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { ladeKern } = require('./load-kern.js');

const REPO = path.join(__dirname, '..');

// Jede ausgelieferte Seite im Wurzelverzeichnis (vivodepot*.html) — nicht als feste Liste, damit eine
// neue Seite von selbst mitzählt und eine im öffentlichen Zuschnitt zurückgehaltene Seite dort einfach
// fehlt, statt die Probe zu brechen.
const TRAEGER_DATEIEN = fs.readdirSync(REPO).filter((n) => /^vivodepot[\w-]*\.html$/.test(n)).sort();

// Benannte Konstanten — `const <NAME> = <ZAHL>;`, NAME trägt sowohl PBKDF2 als auch
// ITERATION(EN) (unabhängig von Reihenfolge/Präfix: PBKDF2_ITERATIONS, ANG_PBKDF2_ITERATIONEN,
// ANTWORT_PBKDF2_ITERATIONEN — alle drei Formen bereits im Bestand).
const KONSTANTEN_MUSTER = /const\s+(\w*PBKDF2\w*ITERATION\w*)\s*=\s*(\d+)\s*;/g;

function funde(dateiText) {
  const raus = [];
  let treffer;
  while ((treffer = KONSTANTEN_MUSTER.exec(dateiText)) !== null) {
    raus.push({ name: treffer[1], wert: Number(treffer[2]) });
  }
  return raus;
}

function alleFundeEinsammeln() {
  const gesamt = [];
  for (const datei of TRAEGER_DATEIEN) {
    const text = fs.readFileSync(path.join(REPO, datei), 'utf8');
    for (const f of funde(text)) gesamt.push(Object.assign({ datei }, f));
  }
  return gesamt;
}

test('[PBKDF2-Deckung·Positivkontrolle] die Probe findet überhaupt etwas — sonst misst sie blind', () => {
  const gesamt = alleFundeEinsammeln();
  const dateien = new Set(gesamt.map((f) => f.datei));
  assert.ok(dateien.has('vivodepot.html') && dateien.has('vivodepot-lesen.html') && gesamt.length >= 5,
    'Kern und Lese-App tragen je eine Konstante, zusammen mindestens fünf Fundstellen — sonst ist das Muster kaputt '
    + 'oder eine Konstante verschwunden. Beides ist ein eigener Befund, keine bestandene Probe.');
});

test('[PBKDF2-Deckung·Wächter] jede benannte Konstante im ausgelieferten Bestand trägt denselben Wert', () => {
  const { V } = ladeKern();
  const gesamt = alleFundeEinsammeln();

  for (const f of gesamt) {
    assert.equal(f.wert, V.PBKDF2_ITERATIONS,
      f.datei + ':' + f.name + ' trägt ' + f.wert + ', der Kern (PBKDF2_ITERATIONS) trägt '
      + V.PBKDF2_ITERATIONEN_JE_KRYPTOVERSION[V.CRYPTO_VERSION_ZERFALL] + ' — genau die stille '
      + 'Divergenz, die U2-ADR-230s Vor-Ort-Regel im Kern allein nicht verhindert: eine erhöhte '
      + 'Konstante hier, eine stehengebliebene dort, kein Allowlist-Verstoß, aber ein Depot, das '
      + 'die eine Seite anders liest als die andere.');
  }
});

test('[PBKDF2-Deckung·Rot-Beweis] eine abweichende Zahl in einer ANDEREN Datei als vivodepot.html wird real erkannt', () => {
  // Gegenkontrolle, ausdrücklich verlangt: prüft NICHT nur vivodepot.html — sonst wäre die
  // Probe selbst der nächste schmale Fall. Verändert die Datei nicht, baut nur denselben
  // Scan gegen einen manipulierten Text derselben Fremd-Datei nach.
  const zielDatei = 'vivodepot-lesen.html';
  const echterText = fs.readFileSync(path.join(REPO, zielDatei), 'utf8');
  const verfaelscht = echterText.replace('const PBKDF2_ITERATIONS = 600000;', 'const PBKDF2_ITERATIONS = 700000;');
  assert.notEqual(verfaelscht, echterText, 'die Ersetzung hat nichts getroffen — Muster in ' + zielDatei + ' hat sich verändert');

  const { V } = ladeKern();
  const gefundeneAbweichung = funde(verfaelscht).find((f) => f.wert !== V.PBKDF2_ITERATIONS);
  assert.ok(gefundeneAbweichung,
    'ROT VOR DER PROBE-ABNAHME: eine abweichende Konstante in ' + zielDatei
    + ' (NICHT vivodepot.html) muss dieselbe Prüfung real durchfallen lassen');
  assert.equal(gefundeneAbweichung.wert, 700000);
});

test('[PBKDF2-Deckung·benannter Rest] der Literal-Wert in vivodepot-vc-issuer.html (Format-Beschreibung, kein Konstantenname)', () => {
  // Gemessen, nicht entschieden: erfasst das Konstanten-Namen-Muster oben den Literal-Wert in
  // der .vdkey-Formatbeschreibung (Kommentar, kein `const`)? Das Ergebnis wird berichtet, nicht
  // stillschweigend übergangen — ob ein "Nein" hier ein Mangel ist, entscheidet nicht diese Probe.
  const text = fs.readFileSync(path.join(REPO, 'vivodepot-vc-issuer.html'), 'utf8');
  const zeileMitLiteral = text.split('\n').find((z) => /iterationen:\s*600000/.test(z));

  assert.ok(zeileMitLiteral,
    'der Literal-Wert selbst ist im Text nicht mehr da — das wäre ein anderer, eigener Befund');

  const trifftAufDieseZeile = funde(zeileMitLiteral).length > 0;
  assert.equal(trifftAufDieseZeile, false,
    'DOKUMENTIERT, KEIN FEHLSCHLAG DIESER PROBE: das Konstanten-Namen-Muster (`const NAME = ZAHL;`) '
    + 'sieht den Literal-Wert in der .vdkey-Formatbeschreibung nicht — er steht als Zahl in einem '
    + 'Kommentar, nicht als eigene Konstante. Ein benannter Rest (s. ADR-Text), keine stillschweigend '
    + 'übergangene Lücke.');
});
