'use strict';
/* Die Lese-App hat keinen Auflöser für `{beschriftung:…}`-Platzhalter (der steht nur im Kern). Bis S1 (21.09.2026) trug sie englische Sätze mit diesen
   Platzhaltern (Daten aus der Region AB_WERK_TEXTSATZ_EN) und durfte keinen davon VERBRAUCHEN: sonst stünde der rohe Platzhalter auf dem Schirm der
   Empfängerin. Seit S1 trägt sie keinen mehr; der Wächter hält beides fest: solange sie keinen Auflöser hat, steht kein Satz mit Platzhalter in
   ihren Daten (Suchraum leer), und ein gepflanzter Satz samt Verbrauch wird gefunden. Ein eigener Auflöser in der Lese-App macht ihn grün
   (dann gehört der Weg in eine eigene Probe). */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const LESEN = path.join(__dirname, '..', 'vivodepot-lesen.html');
const DATENZEILE = /^\s*"strings:([A-Za-z0-9_]+)\.text":\s*"/;

function befund(quelle) {
  const zeilen = quelle.split('\n');
  const schluessel = new Set();
  for (const z of zeilen) {
    const m = z.match(DATENZEILE);
    if (m && z.includes('{beschriftung:')) schluessel.add(m[1]);
  }
  const hatAufloeser = /function\s+_beschriftungPlatzhalterAufloesen\s*\(/.test(quelle);
  const verbraucher = [];
  for (const k of schluessel) {
    const wort = new RegExp('(?<![A-Za-z0-9_])' + k + '(?![A-Za-z0-9_])');
    zeilen.forEach((z, i) => { if (!DATENZEILE.test(z) && wort.test(z)) verbraucher.push(k + ' (Zeile ' + (i + 1) + ')'); });
  }
  return { schluessel: [...schluessel], hatAufloeser, verbraucher };
}

test('[Lese-App·Platzhalter] kein Satz mit {beschriftung:…} steht in den Daten der Lese-App oder wird verbraucht, solange sie keinen Auflöser hat', () => {
  const b = befund(fs.readFileSync(LESEN, 'utf8'));
  if (b.hatAufloeser) return;
  assert.deepEqual(b.schluessel, [], 'Die Lese-App trägt wieder englische Sätze mit {beschriftung:…} (aus dem Kern-EN-Modul) — ohne Auflöser bleibt der rohe Platzhalter auf dem Schirm');
  assert.deepEqual(b.verbraucher, [],
    'Die Lese-App verbraucht einen Satz mit rohem {beschriftung:…}-Platzhalter, ohne ihn aufzulösen — entweder einen Auflöser einbauen (wie im Kern) oder den Satz nicht verbrauchen');
});

test('[Lese-App·Platzhalter·Rot-Beweis] ein Verbrauch ohne Auflöser wird gefunden, mit Auflöser nicht', () => {
  const quelle = fs.readFileSync(LESEN, 'utf8');
  const mit = quelle + '\n  "strings:probeSatz.text": "Erster Teil {beschriftung:identity.label} Rest",\nconst _probe = STRINGS.probeSatz;\n';
  const rot = befund(mit);
  assert.equal(rot.hatAufloeser, false, 'Vorbedingung: die echte Lese-App hat (noch) keinen Auflöser');
  assert.ok(rot.schluessel.includes('probeSatz'), 'der gepflanzte Satz im Datenraum wird gefunden');
  assert.ok(rot.verbraucher.some((v) => v.startsWith('probeSatz ')), 'der gepflanzte Verbrauch wird gefunden: ' + rot.verbraucher.join(', '));
  const gruen = befund(mit + '\nfunction _beschriftungPlatzhalterAufloesen(t) { return t; }\n');
  assert.equal(gruen.hatAufloeser, true, 'ein Auflöser wird erkannt');
});
