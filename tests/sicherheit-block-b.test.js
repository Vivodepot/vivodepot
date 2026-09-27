'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Test — Sicherheit Block B: Passphrase-Stärke-Rückmeldung (Krypto-Gutachten-Befund 1.7)
   ────────────────────────────────────────────────────────────────────────
   Negativ-Tests im Muster „Angriff konstruieren → ausführen → beweisen, dass er
   scheitert". Der „Angriff" ist hier ein schwaches/triviales Passwort, das versucht,
   vom Stärke-Balken belohnt oder an der harten Mindestlänge-Schranke vorbeizukommen.
   Die Stärke-Anzeige ist rein hinweisend (blockiert nichts — B2-Entscheidung Zwang/
   Empfehlung offen); die Mindestlänge-8 bleibt die getrennte, harte Pflichtprüfung.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

// Befund 1.7 — eine triviale Ziffernfolge darf NIE als „stark" durchgehen.
test('B-Negativ-1: „12345678" wird als schwach eingestuft (Trivial-Ziffernfolge)', () => {
  const { V } = ladeKern();
  const s = V.passwortStaerke('12345678');   // genau 8 Zeichen — bestünde die Mindestlänge, aber trivial
  assert.equal(s.stufe, 'schwach', 'reine Ziffernfolge MUSS schwach sein — der Balken belohnt sie nicht');
  assert.ok(s.bekannt, 'als verbreitetes/triviales Muster erkannt');
});

// Befund 1.7 — ein Wörterbuch-/Blocklisten-Passwort darf NIE belohnt werden.
test('B-Negativ-2: „passwort"/„password" landen über die Blockliste auf schwach', () => {
  const { V } = ladeKern();
  for (const pw of ['passwort', 'password', 'Passwort', 'PASSWORD']) {
    const s = V.passwortStaerke(pw);
    assert.equal(s.stufe, 'schwach', '„' + pw + '" steht in der Blockliste → schwach (Groß/Klein egal)');
    assert.ok(s.bekannt, '„' + pw + '" ist als verbreitet markiert');
  }
});

// Gegenprobe: der Balken ist nicht „immer schwach" — eine echte Passphrase erreicht stark.
test('B-Negativ-3: eine lange, gemischte Passphrase wird als stark eingestuft', () => {
  const { V } = ladeKern();
  const s = V.passwortStaerke('Korrekt-Pferd-Batterie-7!');   // lang, 4 Zeichenklassen, nicht in der Liste
  assert.equal(s.stufe, 'stark', 'lange, vielfältige Passphrase MUSS stark erreichen (sonst wäre der Balken nutzlos)');
  assert.ok(!s.bekannt, 'nicht als verbreitet markiert');
});

// Befund 1.7 — die harte Mindestlänge-8 bleibt nach dem Umbau eine echte Schranke
// (die hinweisende Stärke darf sie NICHT ersetzen).
test('B-Negativ-4: Mindestlänge-8 wird weiter erzwungen; kurzes PW kommt nicht durch', () => {
  const { V } = ladeKern();
  // Angriff a): ein 7-Zeichen-Passwort am Setz-Tor → muss zurückgewiesen werden.
  assert.equal(V.pwGrundFehler('1234567'), 'pwMin8Fehler', '7 Zeichen → harte Schranke greift (Setzen blockiert)');
  assert.equal(V.pwGrundFehler(''), 'pwSetzenLeer', 'leeres PW → eigene Meldung');
  assert.equal(V.pwGrundFehler('12345678'), null, 'ab 8 Zeichen lässt die Grund-Schranke durch (Stärke ist davon getrennt)');
  // Angriff b): ein kurzes, aber zeichen-reiches PW darf vom Balken NICHT als mittel/stark belohnt werden.
  assert.equal(V.passwortStaerke('aB3$x').stufe, 'schwach',
    '5 Zeichen mit allen Klassen → bleibt schwach (Längen-Untergrenze, der Balken überspringt sie nie)');
});

// Befund 1.7 — die Rückmeldung ist SICHTBAR: der DOM-Helfer schreibt die Stufe unter das Feld.
test('B-Negativ-5: die Stärke-Anzeige wird sichtbar in den DOM geschrieben (nicht still)', () => {
  const { V, document } = ladeKern();
  // getElementById im Stub cached pro id — Helfer und Test sehen dasselbe Element.
  document.getElementById('id-pw').value = 'passwort';
  V.pwStaerkeAnzeigeVerdrahten('id-pw', 'id-pw-staerke');
  const anz = document.getElementById('id-pw-staerke');
  assert.equal(anz.hidden, false, 'Anzeige ist nach Eingabe sichtbar (nicht hidden)');
  assert.ok(/pw-staerke-schwach/.test(anz.className), 'Stufen-Klasse schwach gesetzt');
  assert.ok(anz.innerHTML.includes(V.STRINGS.pwStaerkeSchwach), 'das Wort „schwach" steht sichtbar im Hinweis');
  assert.ok(anz.innerHTML.includes(V.STRINGS.pwStaerkeBekannt), 'der Blocklisten-Hinweis ist sichtbar');
});
