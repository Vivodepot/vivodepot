'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Gemeinsame ADR-Bindungsprüfung — U2-ADR-098 + Nachtrag (Punkt 1/2/4)
   ────────────────────────────────────────────────────────────────────────
   EINE Stelle statt in jede Datei kopiert; jede gebundene Testdatei ruft sie
   mit ihren drei Konstanten (ADR, HERKUNFT, PRUEFUNGEN). Löst den 098-Nachtrag ein:

   • Punkt 1 — Jeder PRUEFUNGEN-Name IST ein ausgeführter Test: der Name kommt im
     test()-Titel derselben Datei vor, nicht nur als String im ADR. Beide Richtungen
     echt geprüft (Name↔Klausel via `pruefung:` UND Name↔Testlauf via Titel).
   • Punkt 2 — Die ADR-Klausel nennt die Bindung als „pruefung: <testdatei>#<name>"
     (auflösbarer Pfad#Name), nicht als bloßen Namen.
   • Punkt 4 — Die Auflösung von der ADR-Nummer auf die Datei ist eindeutig: ein
     Nachtrag wird als solcher erkannt und NICHT anstelle der Haupt-ADR gelesen
     (die schwache `.find()`-Form las bei 062/077/089 die falsche Datei).
   ════════════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');

const HERKUENFTE = ['entscheidung', 'invariante', 'metamorph', 'generator', 'orakel', 'regression'];
const REPO_WURZEL = path.join(__dirname, '..');
const ADR_VERZ = path.join(REPO_WURZEL, 'docs', 'adr');

// Zwei Testdateien binden noch im Vor-Nachtrag-Format an U2-ADR-096 (altes Klausel-Format
// status/pruefungen). Ihre Umstellung aufs Fundament erzwingt den U2-ADR-096/090-§8-Angleich und
// ist ausdrücklich EIGENER Vorgang — hier als benannte Ausnahme geführt, damit der Universalitäts-
// Check (unten) nicht falsch anschlägt und die Ausnahme sichtbar/zählbar bleibt.
const LEGACY_096 = ['tests/alt-label-register.test.js', 'tests/migration-keine-neuen-waisen.test.js'];

// Punkt 4: ADR-Kennung → GENAU eine Datei. 'U2-ADR-077' → Haupt-Datei (nicht -nachtrag);
// 'U2-ADR-098-nachtrag' → die Nachtrag-Datei. Mehrdeutigkeit ist ein Befund (assert).
function adrDateiFuer(ADR) {
  const istNachtrag = /-nachtrag$/.test(ADR);
  const basis = istNachtrag ? ADR.replace(/-nachtrag$/, '') : ADR;
  const praefix = 'vivodepot-' + basis + '-';
  const dateien = fs.readdirSync(ADR_VERZ).filter(f => f.indexOf(praefix) === 0 && f.endsWith('.md'));
  const passt = dateien.filter(f => {
    const rest = f.slice(praefix.length);              // z. B. 'nachtrag-…md' | 'notfall-…md'
    const istNachtragDatei = /^nachtrag(-|\.)/.test(rest);
    return istNachtrag ? istNachtragDatei : !istNachtragDatei;
  });
  assert.equal(passt.length, 1,
    'Punkt 4: ADR „' + ADR + '" muss auf genau eine Datei auflösen — gefunden: ' + passt.join(', '));
  return path.join(ADR_VERZ, passt[0]);
}

// Alle test('…')-Titel einer Quelldatei (Literal-Titel; interpolierte werden bis zum ersten
// Literal-Ende erfasst — für die geprüften Namen genügt der Literal-Anteil).
function testTitel(quelle) {
  const titel = [];
  const re = /\btest\s*\(\s*(['"`])((?:\\.|(?!\1)[\s\S])*?)\1/g;
  let m;
  while ((m = re.exec(quelle))) titel.push(m[2]);
  return titel;
}

function bindungPruefen(ADR, HERKUNFT, PRUEFUNGEN, testdateiAbs) {
  assert.ok(HERKUENFTE.includes(HERKUNFT), 'HERKUNFT ungültig: „' + HERKUNFT + '"');
  assert.ok(Array.isArray(PRUEFUNGEN) && PRUEFUNGEN.length, 'PRUEFUNGEN muss nicht-leer sein');
  const adrText = fs.readFileSync(adrDateiFuer(ADR), 'utf8');
  assert.match(adrText, /##\s*Konformität/, ADR + ' trägt keine ## Konformität-Klausel');
  const rel = path.relative(REPO_WURZEL, testdateiAbs).split(path.sep).join('/');
  const titel = testTitel(fs.readFileSync(testdateiAbs, 'utf8'));
  for (const name of PRUEFUNGEN) {
    assert.ok(titel.some(t => t.includes(name)),
      'Punkt 1: PRUEFUNGEN-Name „' + name + '" ist kein ausgeführter Test-Titel in ' + rel);
    assert.ok(adrText.includes('pruefung:') && adrText.includes(rel + '#' + name),
      'Punkt 2: ' + ADR + ' nennt die Bindung nicht als „pruefung:  ' + rel + '#' + name + '"');
  }
}

// Punkt 4, universell: jede Testdatei, die eine Bindung TRÄGT (const ADR + const PRUEFUNGEN), muss
// das Fundament aufrufen — statt die schwache Kopie zu tragen. Ausgenommen: die zwei Legacy-096-Dateien
// (eigener §8-Angleich). Gibt die Verstöße zurück (leer = sauber).
function bindungenOhneFundament() {
  const tv = path.join(REPO_WURZEL, 'tests');
  const dateien = fs.readdirSync(tv).filter(f => f.endsWith('.test.js'));
  const verstoesse = [];
  for (const f of dateien) {
    const rel = 'tests/' + f;
    if (LEGACY_096.includes(rel)) continue;
    const q = fs.readFileSync(path.join(tv, f), 'utf8');
    const traegtBindung = /const\s+ADR\s*=/.test(q) && /const\s+PRUEFUNGEN\s*=/.test(q);
    if (traegtBindung && !/bindungPruefen\s*\(/.test(q)) verstoesse.push(rel);
  }
  return verstoesse;
}

module.exports = { bindungPruefen, adrDateiFuer, bindungenOhneFundament, LEGACY_096, HERKUENFTE };
