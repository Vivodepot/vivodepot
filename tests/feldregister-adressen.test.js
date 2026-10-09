'use strict';
/* Proben zu U2-ADR-NNN: Lizenz in der Datei, eine feste Adresse je Kennung (feld/<kennung>/), Begriffsschema als
   JSON-LD (SKOS). Die Adresse ist eine Einbahnstraße — darum prüfen die Proben ihre Form, ihre Vollzähligkeit und
   dass eine Seite byte-gleich bleibt, solange sich die Kennung nicht ändert. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const W = require('../tools/feldregister-bauen.js');
const A = require('../tools/lib/feldregister-adressen.js');

const KATALOG = JSON.parse(fs.readFileSync(W.KATALOG_PFAD, 'utf8'));
const KENNUNGEN = KATALOG.felder.map((f) => f.kennung);

function wegwerfOrdner() { return fs.mkdtempSync(path.join(os.tmpdir(), 'feldregister-adressen-')); }

/* Die Lizenz-Zusage, als Funktion — dieselbe Prüfung für die echte Datei und für den Rot-Beweis. */
function lizenzFehler(register) {
  const l = register && register.lizenz;
  if (!l) return 'kein Schlüssel lizenz';
  if (l.spdx !== 'CC0-1.0') return 'spdx ist ' + l.spdx;
  if (l.url !== 'https://creativecommons.org/publicdomain/zero/1.0/') return 'url ist ' + l.url;
  return null;
}

test('[Feldregister·Lizenz] feldregister.json trägt CC0-1.0 mit Rechtstext-Adresse und Herausgeber', () => {
  const register = JSON.parse(W.bauen({ datum: '2026-10-06' }).json);
  assert.equal(lizenzFehler(register), null);
  assert.equal(register.herausgeber, 'Vivodepot GmbH');
  assert.match(register.herkunft.quellenhinweis, /Bundesministeriums der Justiz/);
  assert.ok(!/bedingung|condition/i.test(register.herkunft.quellenhinweis), 'ein Quellenhinweis, keine Lizenzbedingung');
});

test('[Feldregister·Lizenz·Rot-Beweis] ohne lizenz oder mit anderer Lizenz ist die Zusage verletzt', () => {
  const register = JSON.parse(W.bauen({ datum: '2026-10-06' }).json);
  const ohne = { ...register }; delete ohne.lizenz;
  assert.match(lizenzFehler(ohne), /kein Schlüssel/);
  assert.match(lizenzFehler({ ...register, lizenz: { ...register.lizenz, spdx: 'CC-BY-4.0' } }), /spdx/);
});

test('[Feldregister·Adressen] jede Kennung hat Seite und JSON-LD unter feld/<kennung>/, und nichts sonst', () => {
  const ziel = wegwerfOrdner();
  try {
    W.schreiben(ziel, W.bauen({ datum: '2026-10-06' }));
    const soll = new Set(['.htaccess', 'index.html', 'index.jsonld']);
    for (const k of KENNUNGEN) { soll.add(k + '/index.html'); soll.add(k + '/index.jsonld'); }
    const ist = [];
    (function lauf(rel) {
      for (const n of fs.readdirSync(path.join(ziel, 'feld', rel))) {
        const r = rel ? rel + '/' + n : n;
        if (fs.statSync(path.join(ziel, 'feld', r)).isDirectory()) lauf(r); else ist.push(r);
      }
    })('');
    assert.deepEqual(ist.filter((d) => !soll.has(d)), [], 'Dateien ohne Kennung');
    assert.deepEqual([...soll].filter((d) => !ist.includes(d)), [], 'Kennungen ohne Datei');
    const register = JSON.parse(fs.readFileSync(path.join(ziel, 'feldregister.json'), 'utf8'));
    for (const f of register.felder) assert.equal(f.uri, 'https://register.vivodepot.de/feld/' + f.kennung);
  } finally { fs.rmSync(ziel, { recursive: true, force: true }); }
});

test('[Feldregister·Adressen] JSON-LD je Kennung: SKOS-Begriff, @id = Adresse, Unterfeld zeigt auf sein Trägerfeld', () => {
  const felder = JSON.parse(W.bauen({ datum: '2026-10-06' }).json).felder;
  const dateien = new Map(A.adressDateien(felder));
  for (const f of felder) {
    const k = JSON.parse(dateien.get('feld/' + f.kennung + '/index.jsonld'));
    assert.equal(k['@id'], A.ADRESS_BASIS + f.kennung);
    assert.equal(k['@type'], 'skos:Concept');
    assert.equal(k['skos:notation'], f.kennung);
    assert.equal(k['skos:inScheme']['@id'], A.ADRESS_BASIS);
    assert.deepEqual(k['skos:prefLabel'].map((l) => l['@language']), ['de', 'en']);
    if (f.kennung.includes('/')) assert.equal(k['skos:broader']['@id'], A.ADRESS_BASIS + f.kennung.split('/')[0]);
  }
  const schema = JSON.parse(W.bauen({ datum: '2026-10-06' }).jsonld);
  assert.equal(schema['@graph'][0]['@type'], 'skos:ConceptScheme');
  assert.equal(schema['@graph'].length, felder.length + 1);
});

test('[Feldregister·Adressen] die Seite je Kennung lädt nichts von außen und trägt keine Fassung', () => {
  const felder = JSON.parse(W.bauen({ datum: '2026-10-06' }).json).felder;
  const seite = A.begriffSeite(felder[0]);
  assert.ok(!/<script/i.test(seite) && !/rel=["']?stylesheet/i.test(seite) && !/@import/.test(seite));
  assert.ok(!/\bv\d{3}\b/.test(seite) && !/2026-\d\d-\d\d/.test(seite), 'keine Kern-Fassung, kein Datum auf der Seite');
});

test('[Feldregister·Adressen] eine neue Kern-Fassung lässt jede Kennungs-Datei byte-gleich', () => {
  const kern = path.join(wegwerfOrdner(), 'kern.html');
  try {
    fs.writeFileSync(kern, "const SCHALEN_STAND = 'v999';\n");
    const a = W.bauen({ datum: '2026-10-06' }).adressDateien;
    const b = W.bauen({ datum: '2027-01-01', kernPfad: kern }).adressDateien;
    assert.deepEqual(a, b);
  } finally { fs.rmSync(path.dirname(kern), { recursive: true, force: true }); }
});

test('[Feldregister·Adressen] eine deaktivierte Kennung behält ihre Seite, mit Status und Nachfolger', () => {
  const [alt, neu] = KENNUNGEN;
  const felder = JSON.parse(W.bauen({ datum: '2026-10-06', inaktiviert: { [alt]: { status: 'obsoleted', nachfolger: neu } } }).json).felder;
  const dateien = new Map(A.adressDateien(felder));
  const k = JSON.parse(dateien.get('feld/' + alt + '/index.jsonld'));
  assert.equal(k['owl:deprecated'], true);
  assert.equal(k['dct:isReplacedBy']['@id'], A.ADRESS_BASIS + neu);
  assert.match(dateien.get('feld/' + alt + '/index.html'), /obsoleted/);
});

test('[Feldregister·Adressen·Rot-Beweis] ein einbuchstabiges Pfadsegment wirft — der Webspace leitet es um', () => {
  assert.throws(() => A.adressenPruefen([{ kennung: 'finance.konten/x' }]), /einbuchstabige Segmente/);
  assert.throws(() => A.adressenPruefen([{ kennung: 'finance.konto mit leer' }]), /kodiert/);
  assert.throws(() => A.adressenPruefen([{ kennung: 'finance.k%C3%B6' }]), /kodiert/);
  A.adressenPruefen(KENNUNGEN.map((kennung) => ({ kennung })));
});

test('[Feldregister·Adressen] .htaccess: Aushandlung nur mit mod_rewrite, sonst HTML', () => {
  const h = A.HTACCESS_INHALT;
  assert.match(h, /^DirectoryIndex index\.html$/m);
  const rewrite = h.split('\n').filter((z) => /Rewrite/.test(z));
  const imModul = h.slice(h.indexOf('<IfModule mod_rewrite.c>'), h.indexOf('</IfModule>'));
  for (const z of rewrite) assert.ok(imModul.includes(z), 'außerhalb von IfModule: ' + z);
});
