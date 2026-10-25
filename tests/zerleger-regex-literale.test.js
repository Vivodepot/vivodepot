'use strict';
/* Befund ZERLEGER-OHNE-REGEX-LITERALE (06.10.2026, geschlossen 24.10.2026): `ohneKommentare` (tools/lib/html-senken.js) und
   `blockEnde` (tools/geruest-anordnung-pruefen.js) kannten keine Regex-Literale. Ein Anführungszeichen in einem Regex-Literal öffnete
   für den Zerleger eine Zeichenkette; ab dort lasen der HTML-Senken-Wächter und der Anordnungs-Wächter Kommentare als Code und Code
   als Text. Am 24.10.2026 brachte Branding v2 ein solches Literal in den Kern (_BRANDING_AKTUALISIERUNGEN_MUSTER): die Funktion
   dahinter fehlte in der Zerlegung, eine Fassung später verschluckte sie den Rest des Kerns.
   Der frühere Stolperdraht prüfte nur einen erfundenen Ausschnitt, nie den echten Kern; ein neues Literal im Kern fiel ihm darum
   nicht auf. Diese Lücke schließt die Vollständigkeitsprobe unten: sie zählt die Funktionen jeder Kerndatei unabhängig vom Zerleger. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { senkenIn } = require('../tools/lib/html-senken.js');
const { messen, vollstaendigkeit } = require('../tools/geruest-anordnung-pruefen.js');

const REPO = path.join(__dirname, '..');

// Ein echter Schreibweg in einer Zeile, vor der ein Regex-Literal mit Anführungszeichen steht. Erfunden, kein Kerncode.
const MIT = (zeichen) => [
  'function a(t) { return t.replace(/' + zeichen + '/g, ""); }',
  'function b(el, v) { var u = "https://example.invalid"; el.innerHTML = v; }',
].join('\n');
const RAHMEN = (zeichen) => '<script>\n' + [
  'function a(t) { return t.replace(/' + zeichen + '/g, ""); }',
  "function b(v) { var u = \"https://example.invalid\"; document.getElementById('sidebar').innerHTML = v; }",
].join('\n') + '\n</script>';

// Das Literal aus Branding v2, wörtlich, und eine Kontrollfunktion dahinter, die in den Rahmen schreibt. Ihr Kommentar trägt einen
// Apostroph und danach steht kein „"“ mehr, wie im Kern: der alte Zerleger hielt alles nach dem „"“ im Literal für eine Zeichenkette,
// ließ den Kommentar stehen, und die Klammersuche verlor sich im Apostroph.
const W13_LITERAL = String.raw`const _BRANDING_AKTUALISIERUNGEN_MUSTER = /^https:\/\/[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)+(\/[^\s"'<>]*)?$/i;`;
const W13 = '<script>\n' + [
  W13_LITERAL,
  "function kontrolle(v) { /* it's the frame */ document.getElementById('sidebar').innerHTML = v; }",
  'function danach() { return 1; }',
].join('\n') + '\n</script>';

// Der Zerleger, wie er bis 24.10.2026 war (ohne Regex-Literale), für den Rot-Beweis.
function ohneKommentareAlt(t) {
  let aus = ''; let q = null;
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (q) { aus += c; if (c === '\\') { aus += t[++i] || ''; continue; } if (c === q) q = null; continue; }
    if (c === '\'' || c === '"' || c === '`') { q = c; aus += c; continue; }
    if (c === '/' && t[i + 1] === '/') { while (i < t.length && t[i] !== '\n') { aus += ' '; i++; } aus += t[i] || ''; continue; }
    if (c === '/' && t[i + 1] === '*') {
      const e = t.indexOf('*/', i + 2); const ende = e < 0 ? t.length : e + 2;
      aus += t.slice(i, ende).replace(/[^\n]/g, ' '); i = ende - 1; continue;
    }
    aus += c;
  }
  return aus;
}

test('[Zerleger·Gegenprobe] ohne Anführungszeichen im Regex-Literal finden beide Wächter den Schreibweg', () => {
  assert.equal(senkenIn(MIT('\\x22'), 'probe.js').length, 1);
  assert.ok(messen(RAHMEN('\\x22')).funktionen.some((f) => f.name === 'b'));
});

test('[Zerleger] ein Anführungszeichen im Regex-Literal verdeckt den Schreibweg dahinter nicht', () => {
  for (const z of ['"', "'", '`', '[\\"\']', '\\/\\/']) {
    assert.equal(senkenIn(MIT(z), 'probe.js').length, 1, 'HTML-Senken-Wächter, Literal /' + z + '/');
    assert.ok(messen(RAHMEN(z)).funktionen.some((f) => f.name === 'b'), 'Anordnungs-Wächter, Literal /' + z + '/');
  }
});

test('[Zerleger·Division] ein Schrägstrich nach Wert oder Klammer bleibt eine Division', () => {
  const t = '<script>\nfunction a(x, y) { return (x) / 2 + y / 3; }\n' +
    "function b(v) { const s = 'a/b'; document.getElementById('sidebar').innerHTML = v; }\n</script>";
  assert.deepEqual(messen(t).funktionen.map((f) => f.name), ['b']);
  assert.deepEqual(vollstaendigkeit(t).fehlt, []);
});

test('[Zerleger·Branding-v2-Literal] die Kontrollfunktion hinter dem Literal wird gelesen, die Zerlegung ist vollständig', () => {
  assert.ok(messen(W13).funktionen.some((f) => f.name === 'kontrolle'), 'Kontrollfunktion fehlt in der Zerlegung');
  const v = vollstaendigkeit(W13);
  assert.equal(v.roh, 2);
  assert.deepEqual(v.fehlt, []);
  assert.deepEqual(v.unlesbar, []);
});

test('[Zerleger·Branding-v2-Literal·Rot-Beweis] mit dem alten Zerleger fehlt die Kontrollfunktion, und die Vollständigkeit meldet es', () => {
  const v = vollstaendigkeit(W13, { ohne: ohneKommentareAlt });
  assert.ok(v.fehlt.includes('kontrolle') || v.unlesbar.length > 0, 'die Vollständigkeitsprobe sieht den Taktverlust nicht: ' + JSON.stringify(v));
});

test('[Zerleger·Kern-Vollständigkeit] jede Funktion jeder Kerndatei steht in der Zerlegung, und jede gelesene Funktion ist richtig begrenzt', () => {
  for (const d of ['vivodepot.html', 'vivodepot-lesen.html', 'vivodepot-studio.html', 'vivodepot-vc-issuer.html']) {
    const v = vollstaendigkeit(fs.readFileSync(path.join(REPO, d), 'utf8'));
    assert.ok(v.roh > 0, d + ': keine Funktion gezählt');
    assert.deepEqual(v.fehlt, [], d + ': vom Zerleger verschluckt');
    assert.deepEqual(v.unlesbar, [], d + ': an der falschen Klammer begrenzt');
  }
});
