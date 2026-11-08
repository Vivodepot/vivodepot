'use strict';
// Der Hinweis in Schritt F-2 des VC-Issuers nennt den Algorithmus so, wie der Kern prüft:
// Regelfall ist Ed25519. Der Anker der Trust-Authority ist nur Ed25519 (_ankerWaehlen lehnt einen
// anderen Wert als EdDSA im Kopf mit anker-alg ab). P-256 (ES256) ist nur als Ausnahme für den
// Ausgabe-Schlüssel einer Zwischenstufe zulässig; deren Zertifikate prüft der Kern gegen ihren publicKeyJwk.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ISSUER = path.join(__dirname, '..', 'vivodepot-vc-issuer.html');

// Liefert den Text des ersten <p class="hint"> im Abschnitt mit der Schrittnummer F-2,
// Leerraum zusammengezogen; null, wenn der Abschnitt oder der Hinweis fehlt.
function f2Hinweis(html) {
  const kopf = html.indexOf('<span class="step-no">F-2</span>');
  if (kopf < 0) return null;
  const ende = html.indexOf('</section>', kopf);
  const abschnitt = html.slice(kopf, ende < 0 ? undefined : ende);
  const m = abschnitt.match(/<p class="hint">([\s\S]*?)<\/p>/);
  return m ? m[1].replace(/\s+/g, ' ').trim() : null;
}

function befunde(hinweis) {
  const fehler = [];
  if (hinweis === null) return ['kein Hinweis in Schritt F-2'];
  if (!hinweis.includes('Regelfall ist Ed25519; der Schlüssel der Trust-Authority muss Ed25519 sein')) {
    fehler.push('nennt Ed25519 nicht als Regelfall und als Pflicht für die Trust-Authority');
  }
  if (!hinweis.includes('P-256 (ES256) ist nur für den Ausgabe-Schlüssel einer Zwischenstufe zulässig')) {
    fehler.push('nennt P-256 nicht als Ausnahme nur für den Ausgabe-Schlüssel einer Zwischenstufe');
  }
  if (/ES256 als Fallback/.test(hinweis)) {
    fehler.push('nennt ES256 als Fallback für die Trust-Authority');
  }
  return fehler;
}

test('[Issuer·F-2] der Hinweis nennt Ed25519 als Regelfall und Pflicht für die Trust-Authority, P-256 nur als Ausnahme für eine Zwischenstufe', () => {
  const html = fs.readFileSync(ISSUER, 'utf8');
  assert.deepEqual(befunde(f2Hinweis(html)), []);
});

test('[Issuer·F-2·Rot-Beweis] der alte Wortlaut und ein fehlender Hinweis fallen auf', () => {
  const alt = '<span class="step-no">F-2</span>x</h2>\n <p class="hint">JWK-Datei (Ed25519 primär, ES256 als Fallback), Rest</p></section>';
  assert.equal(befunde(f2Hinweis(alt)).length, 3);
  assert.deepEqual(befunde(f2Hinweis('<span class="step-no">F-2</span></section>')), ['kein Hinweis in Schritt F-2']);
  assert.deepEqual(befunde(f2Hinweis('<p class="hint">woanders</p>')), ['kein Hinweis in Schritt F-2']);
});
