'use strict';
/* Kopf und Fuß des Vorlagen-Generators (26.09.2026, Fund auf register.vivodepot.de):
   - Im Kopf stand ein Schild-Symbol statt des Vivodepot-Logos. Jetzt dasselbe Logo wie in der App: das Symbol `vd-logo`,
     byte-gleich aus vivodepot.html, mit derselben Wortmarke. Byte-gleich heißt: ändert sich das Logo in der App, wird diese
     Probe rot, bis der Generator es auch trägt.
   - Das eingebaute Impressum trug Platzhalter („Name vor der Freigabe einsetzen"). Es ist gestrichen; der Fuß verlinkt das
     Impressum und die Datenschutzerklärung auf vivodepot.de, in der Sprache des Werkzeugs.
   Die Breiten (Logo sichtbar, keine Navigation außerhalb des Bilds bei 1440/1280/390) prüft
   tests/e2e-cross/T-CROSS-30-generator-arbeitsflaeche.spec.js im Browser. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const REPO = path.join(__dirname, '..');
const GEN = fs.readFileSync(path.join(REPO, 'vivodepot-studio.html'), 'utf8');
const KERN = fs.readFileSync(path.join(REPO, 'vivodepot.html'), 'utf8');
const symbol = (t) => { const a = t.indexOf('<symbol id="vd-logo" viewBox'); return a < 0 ? null : t.slice(a, t.indexOf('</symbol>', a) + 9); };

test('[Generator·Kopf] das Logo ist das der App — Symbol byte-gleich, im Kopf verwendet, kein Schild mehr', () => {
  const s = symbol(GEN);
  assert.ok(s, 'der Generator trägt das Symbol vd-logo');
  assert.equal(s, symbol(KERN), 'das Symbol weicht von vivodepot.html ab');
  const kopf = GEN.slice(GEN.indexOf('<header class="app">'), GEN.indexOf('</header>'));
  assert.match(kopf, /<use href="#vd-logo"\/>/);
  assert.match(kopf, /<span class="lw-vivo"[^>]*>VIVO<\/span><span class="lw-depot"[^>]*>DEPOT<\/span>/);
  assert.ok(!/marke-schild/.test(GEN), 'das Schild-Symbol ist fort');
});

test('[Generator·Fuß] kein eigenes Impressum; Impressum und Datenschutzerklärung auf vivodepot.de, je Sprache', () => {
  assert.ok(!/impressum: \{ titel:/.test(GEN), 'kein eingebauter Impressumstext');
  assert.ok(!/data-recht="impressum"/.test(GEN), 'kein Knopf auf einen eingebauten Impressumstext');
  const fuss = GEN.slice(GEN.indexOf('<footer class="app">'), GEN.indexOf('</footer>'));
  // Seit v847 stehen die Adressen nur in MARKEN_ADRESSEN (Befund STUDIO-MARKE); der Fuß trägt den Schlüssel, der Start setzt die Adresse.
  assert.match(fuss, /id="fuss-impressum" href="#" data-marke-href="impressum"/);
  assert.match(fuss, /id="fuss-datenschutzerklaerung" href="#" data-marke-href="datenschutz"/);
  assert.match(GEN, /impressum: Object\.freeze\(\{ de: 'https:\/\/vivodepot\.de\/impressum\.html', en: 'https:\/\/vivodepot\.de\/impressum\.html\?lang=en' \}\)/);
  assert.match(GEN, /datenschutz: Object\.freeze\(\{ de: 'https:\/\/vivodepot\.de\/datenschutz\.html', en: 'https:\/\/vivodepot\.de\/datenschutz\.html\?lang=en' \}\)/);
  assert.match(GEN, /querySelectorAll\('\[data-marke-href\]'\)/, 'der Sprachschalter stellt die Links um');
});

// Rot-Beweis: dieselben Prüfungen an veränderten Kopien — ein abweichendes Logo und das alte, eingebaute Impressum werden gefunden.
test('[Generator·Kopf·Rot-Beweis] ein abweichendes Logo-Symbol und ein zurückgekehrtes Impressum werden gefunden', () => {
  const s = symbol(GEN);
  const anders = GEN.replace(s, s.replace('viewBox="575 75 1850 1850"', 'viewBox="0 0 24 24"'));
  assert.notEqual(anders, GEN);
  assert.notEqual(symbol(anders), symbol(KERN), 'ein verändertes Symbol fällt auf');
  const mitImpressum = GEN.replace("  lizenz: { titel: ['Lizenz', 'Licence']", "  impressum: { titel: ['Impressum', 'Legal notice'], entwurf: false, kennung: 'RT-IMPRESSUM-1', stand: '19.09.2026', text: [[], []] },\n  lizenz: { titel: ['Lizenz', 'Licence']");
  assert.notEqual(mitImpressum, GEN);
  assert.ok(/impressum: \{ titel:/.test(mitImpressum), 'die Prüfung auf einen eingebauten Impressumstext schlägt an');
});
