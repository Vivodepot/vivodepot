'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Klassenwächter: jede Abweisung beim Öffnen nennt ihren echten Grund (13.10.2026)
   ────────────────────────────────────────────────────────────────────────
   Aus dem Befund KRYPTO-FASSUNG-HEISST-FALSCHES-PASSWORT: eine Datei einer
   anderen Krypto-Fassung meldete „Das Passwort stimmt nicht.“ Wer das liest,
   hält sein Passwort für falsch oder die Datei für verloren.

   Zwei Hälften:
   1. Am Quelltext: die Meldung zum falschen Passwort steht im Kern genau an
      EINER Stelle, in oeffnenAbweisungText. Jede Öffnen-Stelle reicht ihre
      Abweisung dorthin; dort entscheidet der Code des Wurfs. Eine neue Stelle,
      die die Meldung selbst setzt, fällt hier auf.
   2. Am Verhalten: jeder Wurf vor der Entschlüsselung trägt einen Code, und
      der Code führt zu einer Meldung, die nicht vom Passwort spricht. Nur der
      Wurf ohne Code — die Entschlüsselung scheitert — heißt falsches Passwort.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { ladeKern } = require('./load-kern.js');

const KERN = path.join(__dirname, '..', 'vivodepot.html');
const PW = 'oeffnen-abweisung-pw-913';

// Wo im Text die Meldung zum falschen Passwort gesetzt wird, und in welcher Funktion.
function passwortMeldungsStellen(quelle) {
  const stellen = [];
  const re = /(?:vorDepotText\(\s*|STRINGS\.)['"]?entsperrPasswortFalsch/g;
  let t;
  while ((t = re.exec(quelle))) {
    const davor = quelle.slice(0, t.index);
    // Die Funktion, in der die Stelle steht: die letzte Funktionskopfzeile davor.
    const letzte = [...davor.matchAll(/\n(?:async\s+)?function\s+([A-Za-z0-9_$]+)\s*\(/g)].pop();
    stellen.push(letzte ? letzte[1] : '?');
  }
  return stellen;
}

test('[Öffnen·Abweisung·Klasse] die Meldung zum falschen Passwort steht nur in oeffnenAbweisungText', () => {
  const stellen = passwortMeldungsStellen(fs.readFileSync(KERN, 'utf8'));
  assert.deepEqual(stellen, ['oeffnenAbweisungText'], 'jede Öffnen-Stelle reicht ihre Abweisung an oeffnenAbweisungText');
});

test('[Öffnen·Abweisung·Klasse·Rot-Beweis] eine zweite Stelle, die die Meldung selbst setzt, fällt auf', () => {
  const quelle = fs.readFileSync(KERN, 'utf8')
    + "\nasync function neueOeffnenStelle() { zeigeFehler(vorDepotText('entsperrPasswortFalsch')); }\n";
  assert.deepEqual(passwortMeldungsStellen(quelle), ['oeffnenAbweisungText', 'neueOeffnenStelle']);
});

test('[Öffnen·Abweisung·Klasse] eine Datei einer anderen Krypto-Fassung wird mit Code abgewiesen und heißt nicht falsches Passwort', async () => {
  const a = ladeKern();
  await a.V.depotAnlegen(PW);
  const umschlag = Object.assign({}, await a.V.depotSerialisieren(), { kryptoVersion: 99 });
  const { V } = ladeKern();
  let wurf = null;
  try { await V.depotLaden(umschlag, PW); } catch (e) { wurf = e; }
  assert.ok(wurf, 'die Datei geht nicht auf');
  assert.equal(wurf.code, 'krypto-fassung');
  const text = V.oeffnenAbweisungText(wurf);
  assert.equal(text, V.STRINGS.dateiFassungUnbekannt);
  assert.notEqual(text, V.STRINGS.entsperrPasswortFalsch);
});

test('[Öffnen·Abweisung·Klasse] jeder Code führt zu einer eigenen Meldung, keine davon ist die zum Passwort', () => {
  const { V } = ladeKern();
  for (const code of ['krypto-fassung', 'datei-defekt', 'kein-stand']) {
    const text = V.oeffnenAbweisungText({ code });
    assert.ok(typeof text === 'string' && text.length > 10 && !text.startsWith('strings:'), code + ': eine Meldung aus dem Textsatz');
    assert.notEqual(text, V.STRINGS.entsperrPasswortFalsch, code + ' ist kein falsches Passwort');
  }
});

test('[Öffnen·Abweisung·Klasse·Gegenprobe] ein falsches Passwort heißt weiter falsches Passwort', async () => {
  const a = ladeKern();
  await a.V.depotAnlegen(PW);
  const umschlag = await a.V.depotSerialisieren();
  const { V } = ladeKern();
  let wurf = null;
  try { await V.depotLaden(umschlag, 'ganz-falsches-passwort-7'); } catch (e) { wurf = e; }
  assert.ok(wurf, 'mit falschem Passwort geht die Datei nicht auf');
  assert.equal(V.oeffnenAbweisungText(wurf), V.STRINGS.entsperrPasswortFalsch);
});
