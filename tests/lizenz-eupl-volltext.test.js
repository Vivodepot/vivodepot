'use strict';
/* ═════════════════════════════════════════════════════════════════════════════
   LICENSE trägt den amtlichen Volltext der EUPL-1.2, wortgleich (23.09.2026).

   Vergleichspunkt ist die englische Fassung im Anhang des Durchführungsbeschlusses (EU) 2017/863,
   ABl. L 128 vom 19.5.2017, S. 59 (EUR-Lex, CELEX 32017D0863). Verglichen wird der Wortlaut ohne
   Leerraum und mit vereinheitlichten Anführungszeichen — der Satz des Amtsblatts (Tabellen,
   Umbrüche) ist kein Teil des Wortlauts. Der Hash wurde gegen die EUR-Lex-Seite selbst gebildet,
   nicht gegen eine Abschrift; eine Abschrift aus der SPDX-Liste wich an zwei Gedankenstrichen im
   Anhang ab.

   Nachsehen: EUR-Lex-Seite öffnen, den Text von „EUROPEAN UNION PUBLIC LICENCE v. 1.2" bis
   „…require the production of a new EUPL version." nehmen, `normalisieren()` unten anwenden,
   SHA-256 bilden.
   ═════════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const AMTLICH_SHA256 = '8b67a889822fac1676b7ccdbf971e85dc3f491ef0c8671362cd09be9075d8e77';
const ANFANG = 'EUROPEAN UNION PUBLIC LICENCE v. 1.2';
const ENDE = 'require the production of a new EUPL version.';

function normalisieren(text) {
  return text.replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/\s+/g, '');
}

function volltextHash(text) {
  const a = text.indexOf(ANFANG);
  const e = text.lastIndexOf(ENDE);
  if (a < 0 || e < a) return null;
  return crypto.createHash('sha256').update(normalisieren(text.slice(a, e + ENDE.length))).digest('hex');
}

test('[EUPL-Volltext] LICENSE trägt den amtlichen Wortlaut der EUPL-1.2', () => {
  const text = fs.readFileSync(path.join(__dirname, '..', 'LICENSE'), 'utf8');
  assert.equal(volltextHash(text), AMTLICH_SHA256,
    'der Volltext in LICENSE weicht vom amtlichen Wortlaut ab (oder fehlt) — s. Kopfkommentar, wie nachzusehen ist');
});

test('[EUPL-Volltext·Rot-Beweis] ein einziges geändertes Wort fällt auf', () => {
  const text = fs.readFileSync(path.join(__dirname, '..', 'LICENSE'), 'utf8');
  const verfaelscht = text.replace('exclusive appropriation', 'exclusive use');
  assert.notEqual(volltextHash(verfaelscht), AMTLICH_SHA256);
});

test('[EUPL-Volltext·Rot-Beweis] ohne Volltext gibt es keinen Hash, nicht einen zufällig passenden', () => {
  assert.equal(volltextHash('Licensed under the EUPL, Version 1.2 only.'), null);
});

/* Seit 24.09.2026 trägt LICENSE NUR den Volltext: mit einer Vorrede davor erkannte GitHub die Lizenz nicht
   (Anzeige „NOASSERTION"). Die Zusammenfassung in einfacher Sprache steht in LICENSING.md. */
function ganzeDateiHash(text) {
  return crypto.createHash('sha256').update(normalisieren(text)).digest('hex');
}

test('[EUPL-Volltext] LICENSE besteht allein aus dem amtlichen Wortlaut, ohne Vorrede oder Nachsatz', () => {
  const text = fs.readFileSync(path.join(__dirname, '..', 'LICENSE'), 'utf8');
  assert.equal(ganzeDateiHash(text), AMTLICH_SHA256,
    'LICENSE trägt mehr als den Volltext — eine Zusammenfassung gehört nach LICENSING.md');
});

test('[EUPL-Volltext·Rot-Beweis] eine Vorrede vor dem Volltext fällt auf', () => {
  const text = fs.readFileSync(path.join(__dirname, '..', 'LICENSE'), 'utf8');
  assert.notEqual(ganzeDateiHash('Vivodepot — Lizenzen\n\n' + text), AMTLICH_SHA256);
  assert.equal(volltextHash('Vivodepot — Lizenzen\n\n' + text), AMTLICH_SHA256, 'der Ausschnitt allein bliebe gleich — darum braucht es die Ganz-Datei-Probe');
});
