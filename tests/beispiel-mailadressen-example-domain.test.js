'use strict';
/* Befund BEISPIEL-ECHTE-DOMAIN (24.09.2026): Feldhilfen zeigten Beispieladressen bei echten Anbietern (Freemail- und
   Praxis-Domains). Eine Beispieladresse bei einer echten Domain kann einer echten Person
   gehören und lädt dazu ein, sie abzuschreiben. Beispiele stehen darum auf der reservierten Beispiel-Domain (RFC 2606), und zwar
   auf der, die Kern und Demo-Depots für die Persona Maria Mustermann schon nutzen: example.de (samt Unterdomänen).
   Klassenwächter: jeder Wert eines Beispiel-Textschlüssels (`….beispiel` oder ein JSON-Feld `beispiel`) in Kern, Lese-App und
   tools/, der eine Mailadresse trägt, steht auf example.de. Die Autorenadressen in den Lizenzköpfen eingebetteter Bibliotheken
   sind keine Beispiele und bleiben. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const REPO = path.join(__dirname, '..');
const ERLAUBT = /(^|\.)example\.de$/i;
const MAIL = /[A-Za-z0-9._%+-]+@([A-Za-z0-9.-]+\.[A-Za-z]{2,})/g;
/* `"schluessel.beispiel": "wert"`, `'schluessel.beispiel': 'wert'` oder `"beispiel": "wert"` */
const BEISPIEL = /["']([^"'\n]*\.beispiel|beispiel)["']\s*:\s*(["'])((?:(?!\2)[^\\\n]|\\.)*)\2/g;

function dateien() {
  const raus = [path.join(REPO, 'vivodepot.html'), path.join(REPO, 'vivodepot-lesen.html')];
  const lauf = (ordner) => {
    for (const e of fs.readdirSync(ordner, { withFileTypes: true })) {
      const p = path.join(ordner, e.name);
      if (e.isDirectory()) { if (e.name !== 'node_modules') lauf(p); }
      else if (/\.(json|js)$/.test(e.name)) raus.push(p);
    }
  };
  lauf(path.join(REPO, 'tools'));
  return raus;
}
function funde(text, wo) {
  const raus = [];
  for (const m of text.matchAll(BEISPIEL)) {
    for (const a of m[3].matchAll(MAIL)) if (!ERLAUBT.test(a[1])) raus.push(wo + ' ' + m[1] + ': ' + a[0]);
  }
  return raus;
}

test('[Beispiel-Domain·Klasse] jede Mailadresse in einem Beispiel-Textschlüssel steht auf example.de', () => {
  const alle = dateien();
  let beispiele = 0;
  const f = [];
  for (const p of alle) {
    const text = fs.readFileSync(p, 'utf8');
    beispiele += [...text.matchAll(BEISPIEL)].length;
    f.push(...funde(text, path.relative(REPO, p)));
  }
  assert.ok(beispiele > 100, 'Kontrolle: Beispiel-Schlüssel werden gefunden (' + beispiele + ')');
  assert.deepEqual(f, []);
});

test('[Beispiel-Domain·Klasse·Rot-Beweis] die drei früheren Beispiele würden gefunden, die Persona-Adressen nicht', () => {
  // Die früheren Adressen aus Teilen gebaut, damit diese Datei selbst den Klassenwächter über tests/ besteht.
  const alt = (lokal, domain) => [lokal, domain].join('@');
  assert.equal(funde('"administration.furtherEmailAddress.beispiel": "' + alt('mariam', 'gmx.de') + ' (alte Adresse)"', 'x').length, 1);
  assert.equal(funde("'administration.protonMailEncryptedEmail.beispiel': '" + alt('maria.mustermann', 'proton.me') + "'", 'x').length, 1);
  assert.equal(funde('"beispiel": "' + alt('kontakt', 'praxis.de') + '"', 'x').length, 1);
  assert.deepEqual(funde('"identity.email.beispiel": "maria.mustermann@example.de"', 'x'), []);
  assert.deepEqual(funde('"institutionsFeld/email.beispiel": "kontakt@praxis.example.de"', 'x'), []);
});

/* ── Ausgedehnt auf tests/ und Fixtures (24.09.2026) ──────────────────────────────────────────────────────
   Dieselbe Klasse in den Proben: Persona- und Platzhalter-Adressen standen bei echten Anbietern (Freemail, erfundene
   Praxis- und Firmendomains, die es geben kann). Jede Mailadresse in tests/ steht jetzt auf einer reservierten Domain
   (RFC 2606/6761: example.*, .example, .invalid, .test) oder ist benannt ausgenommen. Die Ausnahmen tragen je einen Grund
   und sind so eng wie möglich: fremde Musterdateien werden unverändert geprüft, nicht umgeschrieben. */
const RESERVIERT = /(^|\.)(example|invalid|test|localhost)$|(^|\.)example\.(de|org|com|net)$/i;
const ADRESSE = /[A-Za-z0-9_%+-](?:[A-Za-z0-9._%+-]*[A-Za-z0-9_%+-])?@([A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,})/g;
const AUSNAHMEN_TESTS = [
  { praefix: 'tests/fixtures/edci-europass-', grund: 'amtliche Europass-Musterdateien der EU, unverändert als Eingabe geprüft' },
  { adresse: 'bestellung@bzga.de', grund: 'Bestelladresse einer Bundesbehörde im amtlichen Wortlaut (BMJ-Textbausteine)' },
  { domain: 'vivodepot.de', grund: 'eigene Funktionsadressen' },
];
function ausgenommen(rel, adresse, domain) {
  return AUSNAHMEN_TESTS.some((a) => (a.praefix && rel.startsWith(a.praefix))
    || (a.adresse && a.adresse === adresse.toLowerCase()) || (a.domain && a.domain === domain.toLowerCase()));
}
function adressFunde(text, rel) {
  const raus = [];
  for (const m of text.matchAll(ADRESSE)) {
    if (RESERVIERT.test(m[1]) || ausgenommen(rel, m[0], m[1])) continue;
    raus.push(rel + ': ' + m[0]);
  }
  return raus;
}
function probenDateien() {
  const raus = [];
  const lauf = (ordner) => {
    for (const e of fs.readdirSync(ordner, { withFileTypes: true })) {
      const p = path.join(ordner, e.name);
      if (e.isDirectory()) { if (e.name !== 'node_modules') lauf(p); }
      else if (/\.(js|mjs|cjs|json|jsonld|html|md|txt|xml|csv|vcf|ics|yml|yaml)$/.test(e.name)) raus.push(p);
    }
  };
  lauf(path.join(REPO, 'tests'));
  return raus;
}

test('[Beispiel-Domain·Klasse·Proben] jede Mailadresse in tests/ steht auf einer reservierten Domain oder ist benannt ausgenommen', () => {
  const dateien = probenDateien();
  assert.ok(dateien.length > 1000, 'Kontrolle: der Proben-Bestand wird gelesen (' + dateien.length + ')');
  const f = [];
  for (const p of dateien) f.push(...adressFunde(fs.readFileSync(p, 'utf8'), path.relative(REPO, p).split(path.sep).join('/')));
  assert.deepEqual(f, []);
});

test('[Beispiel-Domain·Klasse·Proben·Rot-Beweis] eine Persona bei einem echten Anbieter wird gefunden, reservierte und ausgenommene nicht', () => {
  const echt = ['elisabeth.ews', 'proton.me'].join('@');
  assert.deepEqual(adressFunde('mail: "' + echt + '"', 'tests/fixtures/x.json'), ['tests/fixtures/x.json: ' + echt]);
  assert.equal(adressFunde('a@' + ['b', 'de'].join('.'), 'tests/x.test.js').length, 1);
  assert.deepEqual(adressFunde('elisabeth.ews@example.de a@b.example.de x@y.invalid', 'tests/x.test.js'), []);
  assert.deepEqual(adressFunde(echt, 'tests/fixtures/edci-europass-muster.xml'), []);
  assert.deepEqual(adressFunde("ziel: 'Person.@art.tief'", 'tests/x.test.js'), [], 'kein gültiger Lokalteil, keine Adresse');
});
