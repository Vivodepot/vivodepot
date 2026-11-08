'use strict';
/* Befund ANBIETERPRUEFUNG-STILL-UMGANGEN (HOCH, 06.11.2026).
   Vor jeder Ausstellung eines Anbieterzertifikats steht die Anbieterprüfung; abschalten darf man sie nur mit Vermerk
   im Zertifikat (`anbieterPruefungAbgeschaltet`), nie still (Produktentscheidung 19.09.2026, Kopf von
   tools/lib/anbieterpruefung.js). Zwei Wege stellen ohne Prüfung und ohne Vermerk aus: der Onboarding-Dienst für
   Herausgeber und der Aussteller im Browser (Einzel- und Stapelausstellung). Ein Zertifikat von dort liest
   `anbieterPruefungStatus` als „vor Einführung“, obwohl es danach entstand.

   Die Probe prüft die ganze Klasse, nicht die zwei Fundstellen: Jeder Aufruf von baueProviderVC in den Werkzeugen und
   im Aussteller übergibt `anbieterPruefung` oder `anbieterPruefungAbgeschaltet`. Gemessen 06.11.2026 rot an neun Stellen; seit
   dem Fix grün; das Verhalten prüfen die Proben des Onboarding-Dienstes und [Stapel·Anbieterprüfung] des Ausstellers. Rot-Beweis: der Leser findet einen erfundenen Aufruf ohne das Feld und lässt einen mit dem Feld durch. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const REPO = path.join(__dirname, '..');

// Die Argumente eines Aufrufs, bis zur schließenden Klammer.
function aufrufe(text) {
  const raus = [];
  const re = /\bbaueProviderVC\(/g;
  let m;
  while ((m = re.exec(text))) {
    if (/function\s+$/.test(text.slice(Math.max(0, m.index - 12), m.index))) continue;   // die Definition selbst
    let i = m.index + m[0].length;
    let tiefe = 1;
    while (i < text.length && tiefe) {
      const c = text[i];
      if (c === '(' || c === '{' || c === '[') tiefe++;
      else if (c === ')' || c === '}' || c === ']') tiefe--;
      i++;
    }
    raus.push({ zeile: text.slice(0, m.index).split('\n').length, argumente: text.slice(m.index, i) });
  }
  return raus;
}
function ohnePruefung(text) {
  return aufrufe(text).filter((a) => !/\banbieterPruefung(Abgeschaltet)?\b/.test(a.argumente)).map((a) => a.zeile);
}
function ausstellungsDateien() {
  const js = (ordner) => fs.existsSync(path.join(REPO, ordner))
    ? fs.readdirSync(path.join(REPO, ordner)).filter((n) => n.endsWith('.js')).map((n) => ordner + '/' + n) : [];
  return [...js('tools'), ...js('tools/lib'), 'vivodepot-vc-issuer.html'].filter((d) => fs.existsSync(path.join(REPO, d)));
}

test('[Anbieterprüfung·Klasse] jeder Aufruf von baueProviderVC übergibt die Prüfung oder ihren Abschalt-Vermerk',
  () => {
    const funde = [];
    for (const d of ausstellungsDateien()) {
      for (const z of ohnePruefung(fs.readFileSync(path.join(REPO, d), 'utf8'))) funde.push(d + ':' + z);
    }
    assert.deepEqual(funde, []);
  });

test('[Anbieterprüfung·Klasse] Kontrolle: der Leser findet die Aufrufe der Ausstellungswerkzeuge', () => {
  const alle = ausstellungsDateien().flatMap((d) => aufrufe(fs.readFileSync(path.join(REPO, d), 'utf8')));
  assert.ok(alle.length >= 3, 'mindestens Aussteller und ein Werkzeug rufen baueProviderVC: ' + alle.length);
});

test('[Anbieterprüfung·Rot-Beweis] ein Aufruf ohne das Feld fällt, einer mit Prüfung oder Vermerk nicht', () => {
  const quelle = [
    'function baueProviderVC(opts) { return opts; }',
    'const a = baueProviderVC({ anbieterId: "x", publicKeyJwk: k });',
    'const b = baueProviderVC({ anbieterId: "y", anbieterPruefung: p });',
    'const c = baueProviderVC(Object.assign({ anbieterId: "z" }, { anbieterPruefungAbgeschaltet: true }));',
  ].join('\n');
  assert.deepEqual(ohnePruefung(quelle), [2]);
});
