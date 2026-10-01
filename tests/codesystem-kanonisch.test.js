'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Code-System-URIs: kanonisch an jedem Einlass und auf jedem Exportweg (28.09.2026)
   ────────────────────────────────────────────────────────────────────────
   Befund: ICD-10-GM ging unter `…/sid/icd-10-gm` hinaus — eine URI, die weder
   HL7 Terminology (THO 7.4.0) noch das IPS noch das Basisprofil DE kennt. Das
   Basisprofil DE 1.6.0 legt `http://fhir.de/CodeSystem/bfarm/icd-10-gm` fest
   (CodingICD10GM) und für ATC `http://fhir.de/CodeSystem/bfarm/atc` (CodingATC);
   unsere ATC-Liste ist die amtliche GM-Fassung und trug die WHO-URI. Beide mit
   Pflicht-Coding.version.

   Die KLASSE dahinter: der Migrationsbeleg (paket0) sah keinen codierten Wert —
   eine still getauschte URI in irgendeiner Liste rutschte durch. Diese Probe hält
   darum jede Liste, nicht nur ICD und ATC:
     1. jede eingebaute Liste gegen eine EINGEFRORENE URI (tests/fixtures/
        codelisten-uris-eingefroren.json); eine frühere URI muss als aliasUris
        der Liste weiterleben, sonst schreibt niemand gespeicherte Werte um;
     2. jede Liste mit einem Feld schickt einen codierten Wert durch JEDES
        Format in EXPORT_FORMATE — mit der ALTEN URI gespeichert, wie ein Depot
        vor Schema 90 —, und keine Ausgabe trägt eine frühere URI; die
        kanonische kommt an;
     3. frühere URIs stehen im Produktcode nur als aliasUris (Ratsche);
     4. Coding.version: die Fassung der Liste bei neuer Eingabe, bei einem Altwert
        ausdrücklich offen (data-absent-reason), nie geraten.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { ohneGitUmgebung } = require('../tools/lib/ohne-git-umgebung.js');
const { ladeKern } = require('./load-kern.js');

const REPO = path.join(__dirname, '..');
const EINGEFROREN = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', 'codelisten-uris-eingefroren.json'), 'utf8')).listen;
const LISTEN = fs.readdirSync(path.join(REPO, 'code-listen')).filter((d) => d.endsWith('.json'))
  .map((d) => JSON.parse(fs.readFileSync(path.join(REPO, 'code-listen', d), 'utf8')));
const FRUEHER = [...new Set(Object.values(EINGEFROREN).flatMap((e) => e.frueher))];
const DAR = 'http://hl7.org/fhir/StructureDefinition/data-absent-reason';

/* Listen ohne Feld im Katalog haben keinen Exportweg für einen eingegebenen Wert. Benannt, damit ein neues Feld die
   Ausnahme tot macht und die Probe es merkt. */
const OHNE_EXPORTWEG = Object.freeze({
  loinc: 'nur Import (Laborbefund); kein Katalogfeld trägt die Liste',
  esco: 'Stub ohne Daten; kein Katalogfeld',
  'xoev-rollencode': 'Stub ohne Daten; kein Katalogfeld',
});

function listenBefund(listen, eingefroren) {
  const f = [];
  for (const l of listen) {
    const e = eingefroren[l.systemId];
    if (!e) { f.push(l.systemId + ': nicht eingefroren'); continue; }
    if (l.uri !== e.uri) f.push(l.systemId + ': uri ' + l.uri + ' statt eingefroren ' + e.uri);
    for (const alt of e.frueher) if (!(l.aliasUris || []).includes(alt)) f.push(l.systemId + ': frühere URI ' + alt + ' fehlt in aliasUris');
  }
  for (const id of Object.keys(eingefroren)) if (!listen.some((l) => l.systemId === id)) f.push(id + ': eingefroren, aber keine Liste');
  return f;
}

function ausgabeBefund(texte) {
  const f = [];
  for (const [weg, t] of Object.entries(texte)) for (const alt of FRUEHER) if (t.includes(alt)) f.push(weg + ': trägt die frühere URI ' + alt);
  return f;
}

function felderMitListe(V) {
  const aus = []; const gesehen = new Set();
  const gehe = (o, sektor) => {
    if (!o || typeof o !== 'object' || gesehen.has(o)) return;
    gesehen.add(o);
    if (typeof o.codeListe === 'string' && typeof o.id === 'string' && sektor) aus.push({ sektor, feld: o.id, liste: o.codeListe });
    for (const k of Object.keys(o)) gehe(o[k], sektor || k);
  };
  gehe(V.SEKTOR_BY_ID, '');
  return aus;
}

test('[Code-System·eingefroren] jede eingebaute Liste trägt ihre eingefrorene URI; eine frühere lebt als aliasUris weiter', () => {
  assert.deepEqual(listenBefund(LISTEN, EINGEFROREN), []);
});

test('[Code-System·eingefroren·Rot-Beweis] eine still getauschte URI und eine vergessene frühere fallen', () => {
  const kopie = LISTEN.map((l) => Object.assign({}, l));
  const snomed = kopie.find((l) => l.systemId === 'snomedAllergen');
  snomed.uri = 'http://snomed.info/sct/still-getauscht';
  const icd = kopie.find((l) => l.systemId === 'icd10');
  icd.aliasUris = [];
  const f = listenBefund(kopie, EINGEFROREN);
  assert.ok(f.some((x) => x.startsWith('snomedAllergen: uri')), f.join('\n'));
  assert.ok(f.some((x) => x.startsWith('icd10: frühere URI')), f.join('\n'));
});

async function depotMitAltwerten() {
  const { V } = ladeKern();
  await V.depotAnlegen('codesystem-kanonisch-2026!');
  V.akteurSelbstErklaeren('Maria Mustermann');
  V.sektorFeldSetzen('identity', 'givenName', 'Maria'); V.sektorFeldSetzen('identity', 'familyName', 'Mustermann');
  V.sektorFeldSetzen('identity', 'birthDate', '1950-03-14');
  const felder = felderMitListe(V);
  for (const { sektor, feld, liste } of felder) {
    const l = LISTEN.find((x) => x.systemId === liste);
    const e = l.daten[0];
    const alt = (l.aliasUris || [])[0];
    // der erste Chip wie vor Schema 90 gespeichert (frühere URI, ohne Version), der zweite frisch über die Liste eingegeben
    const chips = [{ text: e.anzeigeName, code: { system: alt || l.uri, code: e.code } }];
    const neu = V.chipAusEingabe(liste, l.daten[1] ? l.daten[1].anzeigeName : e.anzeigeName);
    if (neu && neu.text !== chips[0].text) chips.push(neu);
    V.sektorFeldSetzen(sektor, feld, chips);
  }
  return { V, felder };
}

async function alleAusgaben(V) {
  const texte = {};
  for (const f of V.EXPORT_FORMATE) {
    const r = await f.baue({ sensibel: true });
    texte[f.id] = typeof r === 'string' ? r : JSON.stringify(r);
  }
  return texte;
}

test('[Code-System·Exportwege] jede Liste mit Feld: ein Altwert mit früherer URI geht auf keinem Weg als frühere URI hinaus, die kanonische kommt an', async () => {
  const { V, felder } = await depotMitAltwerten();
  const mitFeld = new Set(felder.map((x) => x.liste));
  const ohne = LISTEN.map((l) => l.systemId).filter((id) => !mitFeld.has(id)).sort();
  assert.deepEqual(ohne, Object.keys(OHNE_EXPORTWEG).sort(), 'die Ausnahmeliste ohne Exportweg ist genau die Listen ohne Feld — keine tote, keine fehlende');
  assert.ok(mitFeld.has('icd10') && mitFeld.has('atc'), 'Vorbedingung: ICD und ATC haben ein Feld');
  const texte = await alleAusgaben(V);
  assert.ok(Object.keys(texte).length >= 5, 'Vorbedingung: die Formate liefen');
  assert.deepEqual(ausgabeBefund(texte), []);
  const alles = Object.values(texte).join('\n');
  for (const id of mitFeld) {
    const uri = EINGEFROREN[id].uri;
    assert.ok(alles.includes(uri), id + ': die kanonische URI ' + uri + ' kommt auf keinem Weg an — die Probe wäre blind');
  }
});

test('[Negativprobe] Code-System·Exportwege: eine Ausgabe mit früherer URI fällt (Rot-Beweis des Kollektors)', () => {
  assert.equal(ausgabeBefund({ x: '{"system":"' + FRUEHER[0] + '","code":"I10.90"}' }).length, 1);
  assert.ok(FRUEHER.length >= 2, 'Vorbedingung: die frühere ICD- und ATC-URI stehen in der eingefrorenen Tabelle');
});

test('[Code-System·Version] neue Eingabe trägt die Fassung der Liste; ein Altwert steht ausdrücklich offen; ohne Pflicht keine', async () => {
  const { V } = await depotMitAltwerten();
  const b = await V.fhirIpsBundle(undefined, { sensibel: true });
  const codings = [];
  const gehe = (o) => { if (!o || typeof o !== 'object') return; if (Array.isArray(o.coding)) codings.push(...o.coding); for (const v of Object.values(o)) gehe(v); };
  gehe(b);
  for (const id of ['icd10', 'atc']) {
    const l = LISTEN.find((x) => x.systemId === id);
    const alle = codings.filter((c) => c.system === l.uri);
    const alt = alle.find((c) => c.code === l.daten[0].code);
    const neu = alle.find((c) => c.code === (l.daten[1] || l.daten[0]).code && c !== alt);
    assert.ok(alt, id + ': Altwert im Bundle');
    assert.equal(alt.version, undefined, id + ': die Fassung eines Altwerts wird nicht geraten');
    assert.equal(alt._version && alt._version.extension[0].url, DAR, id + ': Altwert-Fassung als offen markiert');
    assert.ok(neu, id + ': neue Eingabe im Bundle');
    assert.equal(neu.version, l.codingVersion, id + ': neue Eingabe trägt die Fassung der Liste');
  }
  const snomed = codings.find((c) => c.system === 'http://snomed.info/sct');
  assert.ok(snomed && snomed.version === undefined && snomed._version === undefined, 'ein System ohne Versionspflicht trägt keine');
});

test('[Code-System·Einlass] FHIR-Import, Vorlagen-Prüfung und Codesystem-Prüfung schreiben die frühere URI auf die kanonische um', () => {
  const { V } = ladeKern();
  for (const alt of FRUEHER) {
    const k = V.kanonischesCodeSystem(alt);
    assert.notEqual(k, alt, alt + ' wird umgeschrieben');
    assert.ok(Object.values(EINGEFROREN).some((e) => e.uri === k));
    assert.deepEqual(V.codeSystemPruefen(alt), { ok: true, grund: null, system: k });
  }
  assert.equal(V.kanonischesCodeSystem('http://example.org/unbekannt'), 'http://example.org/unbekannt', 'Unbekanntes bleibt');
});

function aliasFundstellen(dateien) {
  const f = [];
  for (const [datei, text] of dateien) {
    text.split('\n').forEach((z, i) => {
      if (FRUEHER.some((a) => z.includes(a)) && !/aliasUris/.test(z)) f.push(datei + ':' + (i + 1));
    });
  }
  return f;
}

test('[Code-System·Ratsche] eine frühere URI steht im Produktcode nur als aliasUris', () => {
  const liste = execFileSync('git', ['ls-files'], { cwd: REPO, encoding: 'utf8', env: ohneGitUmgebung() }).split('\n')
    .filter((d) => d && !/^(tests|docs|code-listen)\//.test(d) && /\.(html|js|mjs|json)$/.test(d));
  const dateien = liste.filter((d) => fs.existsSync(path.join(REPO, d))).map((d) => [d, fs.readFileSync(path.join(REPO, d), 'utf8')]);
  assert.ok(dateien.some(([d]) => d === 'vivodepot.html'), 'Vorbedingung: der Kern ist im Suchraum');
  assert.deepEqual(aliasFundstellen(dateien), []);
  assert.equal(aliasFundstellen([['x.js', "const s = '" + FRUEHER[0] + "';"]]).length, 1, 'Rot-Beweis: eine gepflanzte Zeile fällt');
});

test('[Code-System·Jeder Eintrag] jeder Eintrag der Listen mit Versionspflicht geht mit kanonischer URI und Fassung hinaus — auch neu hinzugekommene', () => {
  const { V } = ladeKern();
  let geprueft = 0;
  for (const l of LISTEN.filter((x) => x.codingVersion)) {
    for (const e of l.daten) {
      const chip = V.chipAusEingabe(l.systemId, e.anzeigeName);
      assert.ok(chip && chip.code, l.systemId + ' ' + e.code + ': über die Liste eingegeben ergibt einen Code');
      assert.equal(chip.code.system, EINGEFROREN[l.systemId].uri, l.systemId + ' ' + e.code);
      assert.equal(chip.code.version, l.codingVersion, l.systemId + ' ' + e.code);
      geprueft++;
    }
  }
  assert.ok(LISTEN.find((x) => x.systemId === 'icd10').daten.some((e) => e.code === 'C56'), 'Vorbedingung: C56 steht in der Liste');
  assert.ok(geprueft >= 10, 'Vorbedingung: die Probe sieht Einträge');
});

/* ── Konvention (B-1): Deklaration per REFERENZ — der Prüfstand ersetzt den Rumpf der Diskriminante durch eine, die immer
   einen Fund meldet, und verlangt, dass der Wächter dann fällt. */
module.exports = {
  PROBEN: [
    { fuer: '[Code-System·Exportwege] jede Liste mit Feld: ein Altwert mit früherer URI geht auf keinem Weg als frühere URI hinaus, die kanonische kommt an', diskriminante: ausgabeBefund },
  ],
};
