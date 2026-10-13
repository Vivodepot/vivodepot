'use strict';
/* Kopplung: Sätze, die sagen, eine Vorlage werde „erst/nur mit dem Zertifikat wirksam“, gelten nur, solange der Selbst-Einlass
   gesperrt ist (10.10.2026). Heute stimmt der Satz: Module ohne geprüfte Kette wirken nicht, der unsignierte Einlass ist
   gesperrt (Schalter SELBST_EINLASS_GESPERRT im Kern). Fällt der Schalter (Wahl statt Schalter), wirken unsignierte Module
   nach einer ausdrücklichen Wahl, und jeder solche Satz wird falsch. Diese Probe macht das im selben Zug sichtbar: ist der
   Selbst-Einlass frei und sagt noch ein Text das „erst/nur … wirksam“, ist sie rot.
   Der Schalter wird aus dem Kern gelesen, nicht abgeschrieben. Gelesen werden alle Texte im Repo, die Personen erreichen:
   die Anwendungen im Wurzelverzeichnis, die Dokumente unter docs/ und die Textsätze. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { ohneGitUmgebung } = require('../tools/lib/ohne-git-umgebung.js');

const WURZEL = path.join(__dirname, '..');
const SATZ = [
  /(?:erst|nur)\s+(?:damit|mit|dann)\b[^.\n]{0,100}\bwirksam/i,
  /\bonly\s+(?:then|with)\b[^.\n]{0,100}\b(?:takes?\s+effect|effective)\b/i,
];
const HINWEIS = 'Passen Sie im selben Zug jeden dieser Texte an: er sagt nur, was die Bestätigung bringt (unsigniert dockt an). '
  + 'Außerhalb des Repos gilt dasselbe für das Messeblatt des Herausgeber-Dienstes (Außenentwurf in der internen Ablage).';

function selbstEinlassGesperrt(kernText) {
  const m = /\bvar\s+SELBST_EINLASS_GESPERRT\s*=\s*(true|false)\s*;/.exec(kernText);
  if (!m) throw new Error('Der Schalter SELBST_EINLASS_GESPERRT steht nicht mehr im Kern; diese Probe muss ihren Gegenstand neu finden.');
  return m[1] === 'true';
}
function texteImRepo() {
  const alle = execFileSync('git', ['ls-files'], { cwd: WURZEL, encoding: 'utf8', env: ohneGitUmgebung() }).split('\n').filter(Boolean);
  return alle.filter((d) => /^[^/]+\.html$/.test(d) || /^docs\/.+\.md$/.test(d) || /^tools\/textsatz-[a-z]+-modul\.json$/.test(d))
    .filter((d) => !/^docs\/adr\//.test(d));   // ADRs halten Vergangenheit fest; sie zitieren den alten Satz.
}
function befunde(gesperrt, dateien) {
  if (gesperrt) return [];
  const raus = [];
  for (const [datei, text] of dateien) {
    text.split('\n').forEach((z, i) => { if (SATZ.some((re) => re.test(z))) raus.push(datei + ':' + (i + 1)); });
  }
  return raus;
}
const lies = (d) => [d, fs.readFileSync(path.join(WURZEL, d), 'utf8')];

test('[Zertifikatssatz · Kopplung] ist der Selbst-Einlass frei, sagt kein Text mehr „erst/nur … wirksam“', () => {
  const gesperrt = selbstEinlassGesperrt(fs.readFileSync(path.join(WURZEL, 'vivodepot.html'), 'utf8'));
  const b = befunde(gesperrt, texteImRepo().map(lies));
  assert.deepEqual(b, [], 'Der Selbst-Einlass ist frei, diese Texte sagen noch, eine Vorlage wirke erst mit dem Zertifikat:\n  '
    + b.join('\n  ') + '\n' + HINWEIS);
});
test('[Zertifikatssatz · Kopplung · Rot-Beweis] Sperre aus und alter Satz ist rot; Sperre an und alter Satz ist grün', () => {
  const studio = lies('vivodepot-studio.html');
  assert.ok(befunde(false, [studio]).length >= 2, 'der deutsche und der englische Satz stehen heute im Studio und würden gefunden');
  assert.deepEqual(befunde(true, [studio]), [], 'solange gesperrt, darf der Satz stehen');
  const alterSatz = ['x.html', 'Bei Erfolg stellt Vivodepot ein Zertifikat aus; erst damit wird die Vorlage in der App wirksam.'];
  assert.equal(befunde(false, [alterSatz]).length, 1);
  assert.equal(befunde(true, [alterSatz]).length, 0);
});
test('[Zertifikatssatz · Kopplung] der Schalter wird aus dem Kern gelesen; fehlt er, bricht die Probe benannt ab', () => {
  assert.equal(typeof selbstEinlassGesperrt('var SELBST_EINLASS_GESPERRT = true;'), 'boolean');
  assert.equal(selbstEinlassGesperrt('var SELBST_EINLASS_GESPERRT = false;'), false);
  assert.throws(() => selbstEinlassGesperrt('const ANDERES = 1;'), /steht nicht mehr im Kern/);
});
