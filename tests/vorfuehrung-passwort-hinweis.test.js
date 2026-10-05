'use strict';
/* Der Passwort-Hinweis in der Vorführung (Einzelwort der Gegenlesung, 04.10.2026)
   ─────────────────────────────────────────────────────────────────────────
   #tb-pw-hinweis trägt data-schutz. Die Vorführung zeigt fiktive Depots ohne Passwort-Feld und blendet ihn aus; nur per CSS
   ausgeblendet hielt ihn die Laufzeitprobe des Erscheinungsbilds für versteckt, und jede Demo fiel auf den Browser-Standard
   zurück. Darum setzt der Kern hidden — an genau EINER Stelle (_pwHinweisStellen), gebunden an den Vorführungsschalter.
   Gehalten wird: außerhalb der Vorführung ist der Hinweis im passwortlosen Zustand nie hidden, in der Vorführung immer. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { ladeKern } = require('./load-kern.js');

const KERN = fs.readFileSync(path.join(__dirname, '..', 'vivodepot.html'), 'utf8');

/* Der Verstoß, den die Probe sucht: passwortloser Zustand, keine Vorführung — und der Hinweis trotzdem hidden. */
function verborgenAusserhalbDerVorfuehrung(V, document, inVorfuehrung) {
  const h = document.getElementById('tb-pw-hinweis');
  return !inVorfuehrung && V.imVorschau() && h.hidden === true;
}

test('[Vorführung·Passwort-Hinweis] im Normalmodus sichtbar, in der Vorführung hidden — auch nach erneutem Zeichnen der Kopfzeile', () => {
  const { V, document } = ladeKern();
  V.vorschauDepotErzeugen();
  V.renderTopbar();
  const h = document.getElementById('tb-pw-hinweis');
  assert.equal(h.hidden, false, 'Normalmodus, passwortlos: der Hinweis ist sichtbar');
  assert.equal(verborgenAusserhalbDerVorfuehrung(V, document, false), false);
  V._vorfuehrungStreifenSetzen();
  assert.equal(h.hidden, true, 'mit dem Vorführungsschalter hidden');
  V.renderTopbar();
  assert.equal(h.hidden, true, 'die Kopfzeile blendet ihn in der Vorführung nicht wieder ein');
});

test('[Vorführung·Passwort-Hinweis·Rot-Beweis] hidden im Normalmodus gesetzt — die Probe meldet es', () => {
  const { V, document } = ladeKern();
  V.vorschauDepotErzeugen();
  V.renderTopbar();
  document.getElementById('tb-pw-hinweis').hidden = true;   // so, als hätte eine zweite Stelle ihn ohne Vorführung verborgen
  assert.equal(verborgenAusserhalbDerVorfuehrung(V, document, false), true);
  V._pwHinweisStellen();
  assert.equal(verborgenAusserhalbDerVorfuehrung(V, document, false), false, 'die eine Stelle stellt ihn richtig');
});

test('[Vorführung·Passwort-Hinweis] hidden setzt der Kern an genau einer Stelle, und sie fragt den Vorführungsschalter', () => {
  const stellen = KERN.split('\n').filter((z) => z.includes("getElementById('tb-pw-hinweis')"));
  assert.equal(stellen.length, 1, 'genau ein Zugriff auf den Hinweis im Kern: ' + stellen.join(' | '));
  const m = /function _pwHinweisStellen\(\) \{([\s\S]*?)\n\}/.exec(KERN);
  assert.ok(m, '_pwHinweisStellen fehlt');
  assert.match(m[1], /getElementById\('tb-pw-hinweis'\)/);
  assert.match(m[1], /\.hidden = !\(imVorschau\(\) && !_vorfuehrungSchalter\)/);
  assert.ok(!/pwHinweis\.hidden\s*=/.test(KERN), 'kein zweites Setzen über die Kopfzeile');
});
