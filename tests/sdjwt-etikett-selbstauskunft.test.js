'use strict';
/* ════════════════════════════════════════════════════════════════════════
   SD-JWT-Etikett: „Selbstauskunft“, nicht „Nachweis“ (Entscheidung 10.09.2026, Variante A; Fassung ohne
   „unsigniert, experimentell“ nach dem Wort vom 22.10.2026)
   ────────────────────────────────────────────────────────────────────────
   Vivodepot hält die Angaben als Halterin, es stellt keinen Nachweis aus. Die drei SD-JWT-Ausgaben (Person, Finanzen,
   Sozialversicherung) laufen alle über denselben signierenden Weg (formatAusgabeErzeugen → eudiwSdJwtVcSerialisieren,
   U2-ADR-457); „unsigniert“ wäre darum eine falsche Sachaussage. Die Probe hält jede Zeichenkette fest, die ein
   SD-JWT-Format benennt, deutsch und englisch, als Klasse über alle Kennungen mit „sd-jwt-vc“ und die Export-Etiketten.

   ROT-BEWEIS, GEMESSEN (22.10.2026, u2-kanon a8243ba7e): „Identitätsnachweis (maschinenlesbar)“, „ein digitaler Nachweis
   über …“ und „(unsigniert, experimentell)“ standen im Modul; beide Proben unten waren rot.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const REPO = path.join(__dirname, '..');
const lies = (n) => JSON.parse(fs.readFileSync(path.join(REPO, 'tools', n), 'utf8')).texte;
const ETIKETTEN = ['exportIdentitaetLabel', 'exportIdentitaetFertig', 'exportFinanzenLabel', 'exportSozialversicherungLabel'];

function sdJwtTexte(texte) {
  return Object.entries(texte).filter(([k]) => /sd-jwt-vc-/.test(k) || ETIKETTEN.some((e) => k === 'strings:' + e + '.text'));
}

test('[SD-JWT·Etikett] deutsch: jede SD-JWT-Zeichenkette sagt Selbstauskunft, keine Nachweis, keine unsigniert', () => {
  const t = sdJwtTexte(lies('textsatz-de-modul.json'));
  assert.ok(t.length >= 7, 'Vorbedingung: der Suchraum ist besetzt (' + t.length + ')');
  for (const [k, v] of t) {
    assert.doesNotMatch(v, /Nachweis|unsigniert|experimentell/, k);
    assert.match(v, /Selbstauskunft/, k);
  }
});

test('[SD-JWT·Etikett] englisch: jede SD-JWT-Zeichenkette sagt self-declaration, keine proof, keine unsigned', () => {
  const t = sdJwtTexte(lies('textsatz-en-modul.json'));
  assert.ok(t.length >= 7, 'Vorbedingung: der Suchraum ist besetzt (' + t.length + ')');
  for (const [k, v] of t) {
    assert.doesNotMatch(v, /proof|unsigned|experimental/i, k);
    assert.match(v, /self-declaration/i, k);
  }
});
