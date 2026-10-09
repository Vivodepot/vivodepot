'use strict';
/* Befund ZERLEGER-OHNE-REGEX-LITERALE (06.10.2026): `ohneKommentare` (tools/lib/html-senken.js) kennt keine Regex-Literale. Ein
   Anführungszeichen in einem Regex-Literal öffnet für den Zerleger eine Zeichenkette; sie endet erst am nächsten echten Anführungszeichen,
   und ein `//` dahinter (etwa in einer Adresse) gilt dann als Kommentar — der Rest der Zeile wird leer. Steht dort ein Schreibweg, sehen
   ihn weder der HTML-Senken-Wächter noch der Anordnungs-Wächter (tools/geruest-anordnung-pruefen.js), die denselben Zerleger nutzen.
   Den Fix im Zerleger baut der Eigentümer der beiden Wächter; bis dahin steht die rote Probe als todo, daneben die Gegenprobe. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { senkenIn } = require('../tools/lib/html-senken.js');
const { messen } = require('../tools/geruest-anordnung-pruefen.js');

// Ein echter Schreibweg in einer Zeile, vor der ein Regex-Literal mit Anführungszeichen steht. Erfunden, kein Kerncode.
const MIT = (zeichen) => [
  'function a(t) { return t.replace(/' + zeichen + '/g, ""); }',
  'function b(el, v) { var u = "https://example.invalid"; el.innerHTML = v; }',
].join('\n');
const RAHMEN = (zeichen) => '<script>\n' + [
  'function a(t) { return t.replace(/' + zeichen + '/g, ""); }',
  "function b(v) { var u = \"https://example.invalid\"; document.getElementById('sidebar').innerHTML = v; }",
].join('\n') + '\n</script>';

test('[Zerleger·Gegenprobe] ohne Anführungszeichen im Regex-Literal finden beide Wächter den Schreibweg', () => {
  assert.equal(senkenIn(MIT('\\x22'), 'probe.js').length, 1);
  assert.ok(messen(RAHMEN('\\x22')).funktionen.some((f) => f.name === 'b'));
});

test('[Zerleger·Rot-Beweis] ein Anführungszeichen im Regex-Literal verdeckt den Schreibweg dahinter nicht',
  { todo: 'Befund ZERLEGER-OHNE-REGEX-LITERALE (Ratsche tools/befund-ratsche-eintraege): ohneKommentare kennt keine Regex-Literale' },
  () => {
    assert.equal(senkenIn(MIT('"'), 'probe.js').length, 1, 'HTML-Senken-Wächter: Schreibweg verdeckt');
    assert.ok(messen(RAHMEN('"')).funktionen.some((f) => f.name === 'b'), 'Anordnungs-Wächter: Schreibweg verdeckt');
  });

/* Stolperdraht: schließt der Fix im Zerleger die Lücke, fällt DIESER Test — dann im selben Commit todo oben heraus, diesen Test löschen,
   die Aussetzungs-Obergrenze senken und den Befund schließen. */
test('[Zerleger·Stolperdraht] solange das todo oben steht, verdeckt das Anführungszeichen den Schreibweg noch', () => {
  assert.equal(senkenIn(MIT('"'), 'probe.js').length, 0);
});
