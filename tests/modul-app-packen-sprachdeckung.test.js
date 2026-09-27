'use strict';
/* ════════════════════════════════════════════════════════════════════════
   modul-app-packen verweigert ein veraltetes Sprachbündel (16.09.2026)
   ────────────────────────────────────────────────────────────────────────
   U2-ADR-416, Entscheidung 3. Ein signiertes Sprachbündel friert den Textstand ein.
   Das englische Bündel vom 16.09., 14:18, zeigte im Kern v712 fünf rohe Kennungen, die neuen
   Stick-Texte. Das Packwerkzeug verweigert jetzt in beiden Wegen: `--slug` mit neuem Bündel und
   `--alle`, wo nur der Kern neu kommt und das alte Bündel liegen bleibt.

   Die Bündel hier tragen eine JWS-FORM mit Blindsignatur: die Deckung liest nur die Nutzlast, die
   Signatur prüft der Kern beim Import (tests/modul-einlassen-geprueft.test.js). Grundlage ist das
   heutige englische Modul, nicht eine Liste von Hand — es wandert mit dem Kern mit, und genau
   daran misst die Probe: was ihm fehlt, fehlt.

   ROT-BEWEIS, GEMESSEN (16.09.2026): ohne die Prüfung in modul-app-packen melden die Vorbedingungen
   das veraltete Bündel nicht (die beiden Werkzeug-Proben rot). Am echten Bündel vom 14:18 gegen
   den Kern v712 (Wegwerf-Baum): genau die fünf Stick-Kennungen, s. Bericht.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { ladeKern } = require('./load-kern.js');
const { sprachbuendelDeckung, deckungsMeldung, modulAusEintrag } = require('../tools/lib/sprachbuendel-deckung.js');
const { vorbedingungenEinzeln, vorbedingungenAlle } = require('../tools/modul-app-packen.js');

const EN = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'tools', 'textsatz-en-modul.json'), 'utf8'));
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
const buendel = (modul) => ({ providerCredentialJws: b64({ alg: 'EdDSA' }) + '.' + b64({ probe: true }) + '.c2ln', modulSignaturJws: b64({ alg: 'EdDSA' }) + '.' + b64(modul) + '.c2ln' });
function ohne(kennungen) {
  const m = JSON.parse(JSON.stringify(EN));
  for (const k of kennungen) delete m.texte[k];
  return m;
}
const FEHLEN = Object.keys(EN.texte).filter((k) => k.startsWith('strings:')).slice(-5);

test('[Sprachdeckung] das heutige englische Modul deckt den Kern vollständig', () => {
  const { V } = ladeKern();
  assert.deepEqual(sprachbuendelDeckung(V, [buendel(EN)]), [{ sprache: 'en', rechtsraum: '', module: 1, fehlend: [], fehlendZusicherung: [] }]);
});

test('[Sprachdeckung·Rot-Beweis] fehlen fünf Texte, nennt die Deckung genau diese fünf', () => {
  const { V } = ladeKern();
  const [fach] = sprachbuendelDeckung(V, [buendel(ohne(FEHLEN))]);
  assert.deepEqual(fach.fehlend, FEHLEN.slice().sort());
  const meldung = deckungsMeldung(fach);
  for (const k of FEHLEN) assert.ok(meldung.includes(k), meldung);
  assert.match(meldung, /5 Kennungen/);
});

test('[Sprachdeckung] eine alte Kennung, die der Kern übersetzt, gilt als getragen — eine erfundene nicht', () => {
  const { V } = ladeKern();
  const alt = ohne(['identity.givenName.label']);
  alt.texte['identitaet.vorname.label'] = 'First name';
  assert.deepEqual(sprachbuendelDeckung(V, [buendel(alt)])[0].fehlend, []);
  const erfunden = ohne(['identity.givenName.label']);
  erfunden.texte['identitaet.gibtEsNicht.label'] = 'First name';
  assert.deepEqual(sprachbuendelDeckung(V, [buendel(erfunden)])[0].fehlend, ['identity.givenName.label']);
});

test('[Sprachdeckung] mehrere Module derselben Sprache ergänzen sich; ein Bereichs-Bündel und Deutsch bleiben außen vor', () => {
  const { V } = ladeKern();
  const teilA = ohne(FEHLEN);
  const teilB = { modulTyp: 'textsatz', sprache: 'en', moduleVersion: 1, anbieterId: 'vivodepot', texte: Object.fromEntries(FEHLEN.map((k) => [k, EN.texte[k]])) };
  assert.deepEqual(sprachbuendelDeckung(V, [buendel(teilA), buendel(teilB)])[0].fehlend, []);
  const bereich = { modulTyp: 'bereich', moduleVersion: 1, herkunft: 'probe', sprache: 'de', bereiche: {} };
  assert.deepEqual(sprachbuendelDeckung(V, [buendel(bereich)]), []);
  assert.deepEqual(sprachbuendelDeckung(V, [buendel(Object.assign({}, EN, { sprache: 'de' }))]), []);
  assert.equal(modulAusEintrag({ modulSignaturJws: 'kaputt' }), null);
});

function mitOrdner(fn) {
  const o = fs.mkdtempSync(path.join(os.tmpdir(), 'packen-sprachdeckung-'));
  try { return fn(o); } finally { fs.rmSync(o, { recursive: true, force: true }); }
}

test('[Sprachdeckung·--slug] die Vorbedingungen nennen ein veraltetes Bündel mit seinen Kennungen', () => mitOrdner((o) => {
  const alt = path.join(o, 'alt.json'); fs.writeFileSync(alt, JSON.stringify([buendel(ohne(FEHLEN))]));
  const neu = path.join(o, 'neu.json'); fs.writeFileSync(neu, JSON.stringify([buendel(EN)]));
  const fundAlt = vorbedingungenEinzeln(o, 'englisch', alt).funde.filter((f) => f.includes('Sprachbündel'));
  assert.equal(fundAlt.length, 1, 'genau eine Verweigerung erwartet: ' + fundAlt.join(' | '));
  for (const k of FEHLEN) assert.ok(fundAlt[0].includes(k));
  assert.deepEqual(vorbedingungenEinzeln(o, 'englisch', neu).funde.filter((f) => f.includes('Sprachbündel')), []);
}));

test('[Sprachdeckung·--alle] der Kern-Abgleich verweigert, wenn im Ziel ein veraltetes Bündel liegt — und nennt den Slug', () => mitOrdner((o) => {
  const ablegen = (slug, liste) => {
    fs.mkdirSync(path.join(o, 'module-apps', slug), { recursive: true });
    fs.writeFileSync(path.join(o, 'module-apps', slug, 'vorabkonfiguration.js'), 'window.__vorDepotKonfiguration = ' + JSON.stringify(liste) + ';\n');
  };
  ablegen('englisch', [buendel(ohne(FEHLEN))]);
  ablegen('frisch', [buendel(EN)]);
  const funde = vorbedingungenAlle(o).funde.filter((f) => f.includes('Sprachbündel'));
  assert.equal(funde.length, 1, funde.join(' | '));
  assert.ok(funde[0].startsWith('englisch: '), funde[0]);
}));

/* ── V-2 (Code-Review vom 16.09.2026, NIEDRIG) ─────────────────────────
   sprachdeckungPruefen() allein hätte ein ERNEUT gepacktes, älteres Bündel nie gefangen: jede
   Kennung ist ja noch da, nur die Texte sind es nicht mehr — „veraltet" hieß bislang nur
   „fehlende Kennung". moduleVersionRegressionPruefen() liest jetzt die moduleVersion, die
   schon im Ziel liegt, und verweigert ein eingehendes Bündel, das für dasselbe Fach eine
   NIEDRIGERE Zahl trägt. */
const { moduleVersionRegressionPruefen } = require('../tools/modul-app-packen.js');

function mitVersion(modul, moduleVersion) {
  return Object.assign({}, modul, { moduleVersion });
}

test('[V-2·Mechanik] moduleVersionenAusBuendel liest je Fach das Maximum', () => {
  const { moduleVersionenAusBuendel } = require('../tools/lib/sprachbuendel-deckung.js');
  const v = moduleVersionenAusBuendel([buendel(mitVersion(EN, 3)), buendel(mitVersion(EN, 7))]);
  assert.equal(v.get('textsatz/en/'), 7);
});

test('[V-2·--slug] ein Bündel mit NIEDRIGERER moduleVersion als im Ziel wird verweigert', () => mitOrdner((o) => {
  fs.mkdirSync(path.join(o, 'module-apps', 'englisch'), { recursive: true });
  fs.writeFileSync(path.join(o, 'module-apps', 'englisch', 'vorabkonfiguration.js'),
    'window.__vorDepotKonfiguration = ' + JSON.stringify([buendel(mitVersion(EN, 5))]) + ';\n');

  const veraltetPfad = path.join(o, 'veraltet.json');
  fs.writeFileSync(veraltetPfad, JSON.stringify([buendel(mitVersion(EN, 3))]));
  const funde = vorbedingungenEinzeln(o, 'englisch', veraltetPfad).funde.filter((f) => f.includes('Veraltetes Bündel'));
  assert.equal(funde.length, 1, funde.join(' | '));
  assert.match(funde[0], /moduleVersion 3.*bereits 5/);
}));

test('[V-2·--slug·Gegenprobe] eine GLEICHE oder HÖHERE moduleVersion wird angenommen', () => mitOrdner((o) => {
  fs.mkdirSync(path.join(o, 'module-apps', 'englisch'), { recursive: true });
  fs.writeFileSync(path.join(o, 'module-apps', 'englisch', 'vorabkonfiguration.js'),
    'window.__vorDepotKonfiguration = ' + JSON.stringify([buendel(mitVersion(EN, 5))]) + ';\n');

  const gleichPfad = path.join(o, 'gleich.json');
  fs.writeFileSync(gleichPfad, JSON.stringify([buendel(mitVersion(EN, 5))]));
  assert.deepEqual(vorbedingungenEinzeln(o, 'englisch', gleichPfad).funde.filter((f) => f.includes('Veraltetes Bündel')), []);

  const hoeherPfad = path.join(o, 'hoeher.json');
  fs.writeFileSync(hoeherPfad, JSON.stringify([buendel(mitVersion(EN, 6))]));
  assert.deepEqual(vorbedingungenEinzeln(o, 'englisch', hoeherPfad).funde.filter((f) => f.includes('Veraltetes Bündel')), []);
}));

test('[V-2] kein Ziel-Bündel am Pfad → nichts zu vergleichen, kein Fund (erstes Packen)', () => mitOrdner((o) => {
  const funde = [];
  moduleVersionRegressionPruefen([buendel(mitVersion(EN, 1))], o, 'noch-nie-gepackt', funde);
  assert.deepEqual(funde, []);
}));

/* Zusicherungssätze wieder verlangt (19.09.2026): ein Sprachbündel in einer Sprache, die die Anwendung nicht selbst trägt, muss sie tragen. */
const { deckungsUrteil } = require('../tools/lib/sprachbuendel-deckung.js');
function alsSprache(sprache, ohneZusicherung) {
  const { V } = ladeKern();
  const texte = {};
  for (const [k, v] of Object.entries(EN.texte)) {
    if (ohneZusicherung && V._istZusicherungsKennung(k)) continue;
    texte[k] = v;
  }
  if (!ohneZusicherung) {   // die Sätze der Lese-App stehen nicht im Kern-Modul, ein vollständiges Sprachbündel trägt sie mit
    const L = require('./load-lesen.js').ladeLesen().V;
    for (const [k, v] of Object.entries(L.ZUSICHERUNG_TEXTE_EN)) texte['strings:' + k + '.text'] = v;
  }
  return Object.assign({}, EN, { sprache, texte });
}
test('[Sprachdeckung·Zusicherung] eine Sprache ohne App-Fassung ohne Zusicherungssätze: hart, keine Ausnahme — auch mit Bestätigung', () => {
  const { V } = ladeKern();
  const [fach] = sprachbuendelDeckung(V, [buendel(alsSprache('hu', true))]);
  assert.ok(fach.fehlendZusicherung.length >= 30, 'Kern-Sätze fehlen: ' + fach.fehlendZusicherung.length);
  assert.equal(deckungsUrteil(fach, false).hart.length >= 1, true);
  assert.ok(deckungsUrteil(fach, true).hart.some((m) => m.includes('keine Ausnahme')), 'die Bestätigung hebt die Sperre für Zusicherungssätze nicht auf');
});
test('[Sprachdeckung·Zusicherung] mit allen Zusicherungssätzen ist die Sprache gedeckt; fehlen nur andere Texte: Sperre ohne Bestätigung, Warnung mit', () => {
  const { V } = ladeKern();
  const voll = sprachbuendelDeckung(V, [buendel(alsSprache('hu', false))])[0];
  assert.deepEqual(voll.fehlendZusicherung, []);
  assert.deepEqual(deckungsUrteil(voll, false).hart, []);
  const luecke = sprachbuendelDeckung(V, [buendel(Object.assign(alsSprache('hu', false), { texte: Object.fromEntries(Object.entries(alsSprache('hu', false).texte).filter(([k]) => !FEHLEN.includes(k))) }))])[0];
  assert.deepEqual(luecke.fehlendZusicherung, []);
  assert.equal(deckungsUrteil(luecke, false).hart.length, 1, 'ohne Bestätigung gesperrt');
  const mit = deckungsUrteil(luecke, true);
  assert.equal(mit.hart.length, 0);
  assert.match(mit.warnung[0], /ausdrücklich bestätigt/);
});
test('[Sprachdeckung·Zusicherung] Englisch braucht keine Zusicherungssätze im Modul — die trägt die Anwendung selbst', () => {
  const { V } = ladeKern();
  const [fach] = sprachbuendelDeckung(V, [buendel(alsSprache('en', true))]);
  assert.deepEqual(fach.fehlendZusicherung, []);
});
