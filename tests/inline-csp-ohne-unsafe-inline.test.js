'use strict';
/* ═════════════════════════════════════════════════════════════════
   Jede HTML-Anwendung erlaubt nur ihre eigenen Inline-Skripte (U2-ADR-470, 17.10.2026)
   ─────────────────────────────────────────────────────────────────
   Befunde STUDIO-UNSAFE-INLINE (vivodepot-studio.html, MITTEL) und KERN-CSP-UNSAFE-INLINE-NAVIGATION (Kern, Lese-App und
   Nebenanwendungen): script-src ohne 'unsafe-inline', je ausführbarem Inline-Block genau sein sha256 (geschrieben von
   tools/csp-bauen.js, in der Landungs-Vorbereitung). Der Entwurf eines eigenen Studio-Werkzeugs vom 02.10.2026 ist im
   einen Werkzeug für alle Anwendungen aufgegangen; seine Probe steht hier, auf alle Anwendungen erweitert.
   Inline-Handler (onclick= u. ä.) liefen ohne 'unsafe-inline' stumm nicht mehr; darum verlangt die Probe auch, dass es
   keine gibt — weder im Markup noch in Zeichenketten, die das Skript als HTML einsetzt. Dasselbe für javascript:-Adressen.
   Die ausgelieferte Studio-Seite (register-ausliefern: Kopie der Datei als studio.html) trägt dieselben Bytes.
   ROT-BEWEISE: ein neuer Block ohne Hash fällt; ein Inline-Handler fällt (auch in einer Zeichenkette); unsafe-inline fällt.
   ═════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { cspPruefen, cspHashesNachziehen, inlineSkripte } = require('../tools/lib/csp-hashes.js');
const { anwendungen } = require('../tools/csp-bauen.js');

const lies = (d) => fs.readFileSync(path.join(__dirname, '..', d), 'utf8');
// Ein Inline-Handler im Markup oder in einer Zeichenkette, die als HTML eingesetzt wird: ` onclick="…"`, ` onload='…'`.
const HANDLER = /<[a-z][^<>]*\son[a-z]+\s*=\s*["']/i;
const JS_ADRESSE = /<[a-z][^<>]*\s(href|src|action|formaction)\s*=\s*["']\s*javascript:/i;
// Positivkontrolle je Anwendung: so viele ausführbare Inline-Blöcke stehen mindestens darin (gemessen 17.10.2026 nach dem Bau).
const MINDESTENS = { 'vivodepot.html': 10, 'vivodepot-lesen.html': 4, 'vivodepot-studio.html': 5, 'vivodepot-vc-issuer.html': 4, 'vivodepot-schluessel-teilen.html': 4 };

function befunde(html) {
  const p = cspPruefen(html);
  const b = [];
  if (p.grund) b.push(p.grund);
  if (p.unsafeInline) b.push("'unsafe-inline' in script-src");
  if (p.fehlend.length) b.push(p.fehlend.length + ' Block/Blöcke ohne Hash');
  if (p.ueberzaehlig.length) b.push(p.ueberzaehlig.length + ' Hash/Hashes ohne Block');
  if (HANDLER.test(html)) b.push('Inline-Handler: ' + HANDLER.exec(html)[0].slice(0, 60));
  if (JS_ADRESSE.test(html)) b.push('javascript:-Adresse: ' + JS_ADRESSE.exec(html)[0].slice(0, 60));
  return b;
}

test('[Inline-CSP] die Anwendungen sind die erwarteten fünf', () => {
  assert.deepEqual(anwendungen().sort(), Object.keys(MINDESTENS).sort());
});

for (const [datei, mindestens] of Object.entries(MINDESTENS)) {
  test('[' + datei + '·CSP] script-src ohne unsafe-inline, jeder Inline-Block mit genau seinem Hash, kein Inline-Handler', () => {
    const html = lies(datei);
    assert.ok(inlineSkripte(html).length >= mindestens, 'Positivkontrolle: Inline-Blöcke vorhanden');
    assert.deepEqual(befunde(html), [], 'node tools/csp-bauen.js');
  });
}

test('[Inline-CSP·Rot-Beweis] ein neuer Block ohne Hash, ein Inline-Handler, unsafe-inline: rot', () => {
  const STUDIO = lies('vivodepot-studio.html');
  const neuerBlock = STUDIO.replace('</body>', '<script>window.x = 1;</script></body>');
  assert.match(befunde(neuerBlock).join(' | '), /ohne Hash/);
  const handler = STUDIO.replace('</body>', '<button onclick="x()">x</button></body>');
  assert.match(befunde(handler).join(' | '), /Inline-Handler/);
  const imString = STUDIO.replace('</body>', '<script>el.innerHTML = \'<a href="#" onclick="y()">y</a>\';</script></body>');
  assert.match(befunde(cspHashesNachziehen(imString)).join(' | '), /Inline-Handler/, 'auch in einer Zeichenkette, die als HTML eingesetzt wird');
  const adresse = STUDIO.replace('</body>', '<a href="javascript:void 0">x</a></body>');
  assert.match(befunde(adresse).join(' | '), /javascript:-Adresse/);
  const unsicher = STUDIO.replace(/script-src 'self'/, "script-src 'self' 'unsafe-inline'");
  assert.notEqual(unsicher, STUDIO, 'Vorbedingung: script-src steht im Studio');
  assert.match(befunde(unsicher).join(' | '), /unsafe-inline/);
});
