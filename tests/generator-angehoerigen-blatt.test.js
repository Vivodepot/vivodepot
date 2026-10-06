'use strict';
/* ══════════════════════════════════════════════════════════════════════════
   GEN3 — Der Generator erzeugt Angehörigen-Blätter (ANG1: modulTyp 'angehoerigenVorlage')
   ──────────────────────────────────────────────────────────────────────────
   Gehalten wird:
     1 · das Modul hat genau die Form, die der Prüfer des Kerns annimmt, im Umschlag aller Generator-Module, und es wird
         signiert über den Tresor (Schlüsselpaar-Probe: die Signatur verifiziert gegen den Public-Key);
     2 · die Prüfung im Generator lehnt ab, was der Kern ablehnt (wörtlicher Spiegel von angehoerigenVorlagePruefen) — an
         jedem Fall gemessen, mit Rot-Beweis; wo der Kern diese Prüfung trägt (nach ANG1), läuft derselbe Fall gegen ihn;
     3 · jedes Symbol, das der Generator anbietet, kennt der Kern; jeder Zeiger, den er anbietet, löst der Kern auf;
     4 · die Oberfläche: eine Start-Kachel, ein Palette-Zweig, ein Signierweg über den Tresor.
   Der Rundlauf im Browser (Generator → Signatur → Datei → Kern-Einlass → Depot → Lese-App) steht in
   tests/e2e-cross/T-CROSS-33-angehoerigen-blatt-rundlauf.spec.js und läuft, sobald der Einlass (ANG1 Stufe e) im Kanon ist.
   ══════════════════════════════════════════════════════════════════════════ */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { ladeGenerator } = require('./load-generator.js');

const HTML = fs.readFileSync(path.join(__dirname, '..', 'vivodepot-studio.html'), 'utf8');
const klick = (id) => ({ isTrusted: true, currentTarget: { id }, timeStamp: performance.now() });

function blattState(uebers) {
  const blatt = Object.assign({ herkunft: 'institution/testheim-de', sprache: 'de', rechtsraum: 'DE', rechtsraumName: 'Deutschland', berufsstand: '', berufsstandName: '', bereich: '',
    situationen: [{ titel: 'Krankenhaus', icon: 'heartPulse', einfuehrung: 'Aufnahme und Aufenthalt.', bloecke: [
      { id: 'aus-gesundheit', titel: 'Aus Gesundheit', eintraege: [{ quelle: 'health', feld: 'bloodType' }, { quelle: 'health', feld: 'healthInsurance' }] },
      { id: 'menschen', titel: 'Meine Menschen', eintraege: [{ quelle: 'people', feld: 'menschen' }] }] }] }, uebers || {});
  return { blatt, anbieter: { anbieterId: 'institution/testheim-de' } };
}

test('[GEN3 · Blatt] das Modul hat die Form des Kerns: modulTyp, Schlüssel, Blatt-ID aus dem Titel, Blöcke mit Zeigern', () => {
  const { V } = ladeGenerator();
  const m = V.blattModulBauen(blattState());
  assert.equal(m.modulTyp, 'angehoerigenVorlage');
  assert.equal(m.moduleVersion, 1);
  assert.equal(m.herkunft, 'institution/testheim-de');
  assert.equal(m.rechtsraum, 'DE'); assert.equal(m.rechtsraumName, 'Deutschland');
  assert.equal(m.berufsstand, undefined, 'leere optionale Angaben stehen nicht im Modul');
  assert.deepEqual(Object.keys(m.situationen), ['krankenhaus']);
  const s = m.situationen.krankenhaus;
  assert.equal(s.titel, 'Krankenhaus'); assert.equal(s.icon, 'heartPulse');
  assert.equal(s.bloecke.length, 2);
  assert.deepEqual(JSON.parse(JSON.stringify(s.bloecke[0].eintraege[0])), { quelle: 'health', feld: 'bloodType' });
  assert.equal(V.blattModulPruefen(m).gueltig, true);
  assert.equal(V.pruefeBlatt(blattState()).blocker.length, 0);
});

test('[GEN3 · Blatt] herkunft folgt den Angaben der Institution, wenn das Blatt keine trägt', () => {
  const { V } = ladeGenerator();
  const st = blattState({ herkunft: '' });
  assert.equal(V.blattModulBauen(st).herkunft, 'institution/testheim-de');
  st.anbieter = null;
  assert.ok(V.pruefeBlatt(st).blocker.length > 0, 'ohne Herkunft gibt es keinen Bündel');
});

test('[GEN3 · Blatt] Blatt-IDs sind eindeutig und haben die Form des Kerns (a–z, 0–9, - und _, 2–40 Zeichen)', () => {
  const { V } = ladeGenerator();
  const st = blattState();
  st.blatt.situationen = ['Krankenhaus', 'Krankenhaus', 'Öffentliche Stellen nach dem Tod, geordnet nach Dringlichkeit und Ort', '12 Uhr', 'ä'].map((t) => ({ titel: t, icon: 'users', einfuehrung: '', bloecke: [] }));
  const ids = Object.keys(V.blattModulBauen(st).situationen);
  assert.equal(new Set(ids).size, ids.length, 'eindeutig');
  ids.forEach((id) => assert.match(id, /^[a-z][a-z0-9_-]{1,39}$/, id));
});

test('[GEN3 · Blatt] signiert über den Tresor: die Signatur verifiziert, der Schlüssel ist danach fort', async () => {
  const { V } = ladeGenerator();
  const T = V.SCHLUESSEL_TRESOR;
  const paar = await V.erzeugeSchluesselpaarRoh();
  await T.ausDatei(await V.schuetzeSchluesselJwk(paar.privateJwk, 'probe-passwort-blatt'), 'probe-passwort-blatt');
  const st = Object.assign(blattState(), { publicKeyJwk: paar.publicJwk });
  const umschlag = await V.signiereMitTresor(klick('ab-erzeugen'), (k) => V.baueBlattSigniert(st, k), () => V.baueBlattSigniert(st, null));
  assert.equal(umschlag.format, 'vivodepot-angehoerigenvorlage@1');
  assert.ok(umschlag.modulSignaturJws);
  const pruef = await V._verifyJWS(umschlag.modulSignaturJws, await V._jwsImportVerifyKey(paar.publicJwk), {});
  assert.equal(pruef.gueltig, true);
  assert.equal(T.vorhanden(), false);
  // ohne Schlüssel: ohne Signatur, wie bei den anderen Modul-Arten
  const unsigniert = await V.signiereMitTresor(klick('ab-erzeugen'), (k) => V.baueBlattSigniert(st, k), () => V.baueBlattSigniert(st, null));
  assert.equal(unsigniert.modulSignaturJws, undefined);
});

/* Die Fälle des Kern-Prüfers (Probe des Angehörigen-Vorlagen-Moduls, ANG1) — hier gegen den Spiegel im Generator. */
function modul(over) {
  return Object.assign({ modulTyp: 'angehoerigenVorlage', moduleVersion: 1, herkunft: 'probe', sprache: 'de',
    situationen: { 'probe-situation': { titel: 'Probe-Situation', bloecke: [] } } }, over);
}
const FAELLE = [
  ['gültig', () => modul(), true, null],
  ['ohne herkunft', () => { const m = modul(); delete m.herkunft; return m; }, false, 'herkunft'],
  ['ohne sprache', () => { const m = modul(); delete m.sprache; return m; }, false, 'sprache'],
  ['leerer rechtsraum', () => modul({ rechtsraum: '  ' }), false, 'rechtsraum'],
  ['leerer rechtsraumName', () => modul({ rechtsraumName: '' }), false, 'rechtsraumName'],
  ['moduleVersion 0', () => modul({ moduleVersion: 0 }), false, 'moduleVersion'],
  ['situationen ist eine Liste', () => modul({ situationen: [] }), false, 'situationen'],
  ['HTML im Titel', () => modul({ situationen: { 'sit-x': { titel: '<b>fett</b>' } } }), false, 'kein-reiner-text'],
  ['Anführungszeichen im Titel', () => modul({ situationen: { 'sit-x': { titel: 'Das "Blatt"' } } }), false, 'kein-reiner-text'],
  ['Und-Zeichen mit Entity', () => modul({ situationen: { 'sit-x': { titel: 'A &amp; B' } } }), false, 'kein-reiner-text'],
  ['Blatt ohne Titel', () => modul({ situationen: { ok: { titel: 'Ok' }, 'ohne-titel': {} } }), true, null],
  ['nur Blätter ohne Titel', () => modul({ situationen: { 'sit-a': {} } }), false, 'leer'],
  ['Eintrag ohne feld', () => modul({ situationen: { 'sit-x': { titel: 'X', bloecke: [{ eintraege: [{ quelle: 'health' }] }] } } }), false, 'leer'],
];
test('[GEN3 · Blatt] der Spiegel lehnt ab, was der Kern ablehnt, und nimmt an, was er annimmt', () => {
  const { V } = ladeGenerator();
  for (const [name, bau, gueltig, grund] of FAELLE) {
    const r = V.blattModulPruefen(bau());
    assert.equal(r.gueltig, gueltig, name);
    if (!gueltig) assert.equal(r.grund, grund, name);
  }
  const r = V.blattModulPruefen(modul({ situationen: { ok: { titel: 'Ok' }, 'ohne-titel': {} } }));
  assert.ok(r.verworfene.some((v) => v.id === 'ohne-titel' && v.grund === 'kein-titel'), 'benannt verworfen, nicht das ganze Modul');
  const u = V.blattModulPruefen(modul({ unbekannt: 1 }));
  assert.equal(u.gueltig, true); assert.ok(u.verworfene.some((v) => v.schluessel === 'unbekannt'));
});

test('[GEN3 · Blatt · Rot-Beweis] ohne die Prüfung des Reintexts oder der Herkunft ließe der Spiegel einen Fall durch', () => {
  const m1 = HTML.replace("if (typeof w === 'string') { if (BLATT_NICHT_REIN.test(w)) stellen.push(pfad || '(wert)'); }", "if (typeof w === 'string') { /* ungeprüft */ }");
  assert.notEqual(m1, HTML, 'Vorbedingung: die Mutation greift');
  const V1 = ladeGenerator({ html: m1 }).V;
  assert.equal(V1.blattModulPruefen(modul({ situationen: { 'sit-x': { titel: '<b>fett</b>' } } })).gueltig, true, 'die Mutation lässt Markup durch — die echte Fassung lehnt es ab');
  const m2 = HTML.replace("if (typeof modul.herkunft !== 'string' || !modul.herkunft.trim()) return { gueltig: false, grund: 'herkunft', situationen: null, verworfene };\n  if (typeof modul.sprache", "if (typeof modul.sprache");
  assert.notEqual(m2, HTML);
  const V2 = ladeGenerator({ html: m2 }).V;
  const ohneHerkunft = modul(); delete ohneHerkunft.herkunft;
  assert.equal(V2.blattModulPruefen(ohneHerkunft).gueltig, true, 'die Mutation lässt ein Modul ohne Herkunft durch');
  const { V } = ladeGenerator();
  assert.equal(V.blattModulPruefen(ohneHerkunft).gueltig, false);
});

test('[GEN3 · Blatt] Warnungen: ein Zeiger, den niemand auflöst, ein Blatt ohne Einträge, ein unbekanntes Symbol', () => {
  const { V } = ladeGenerator();
  const st = blattState();
  st.blatt.situationen[0].bloecke[0].eintraege.push({ quelle: 'health', feld: 'gibtEsNicht' });
  st.blatt.situationen.push({ titel: 'Leer', icon: 'unbekanntes-symbol', einfuehrung: '', bloecke: [{ id: 'b', titel: 'B', eintraege: [] }] });
  const p = V.pruefeBlatt(st);
  assert.equal(p.blocker.length, 0);
  assert.ok(p.warnungen.some((w) => /gibtEsNicht/.test(w)), 'unauflösbarer Zeiger');
  assert.ok(p.warnungen.some((w) => /Leer/.test(w) && /keinen Eintrag/.test(w)), 'leeres Blatt');
  // das Symbol wird beim Bauen auf den Vorgabewert gesetzt, nicht als unbekannt weitergegeben
  assert.equal(V.blattModulBauen(st).situationen.leer.icon, 'users');
});

test('[GEN3 · Blatt] jeder Zeiger, den die Palette anbietet, ist ein bekannter; die Sonderzeiger haben die Formen des Kerns', () => {
  const { V } = ladeGenerator();
  const eintraege = V.paletteEintraege();
  assert.ok(eintraege.length > 200);
  for (const e of eintraege) { const i = e.kennung.indexOf('.'); assert.equal(V.blattZeigerBekannt(e.kennung.slice(0, i), e.kennung.slice(i + 1)), true, e.kennung); }
  for (const z of V.blattSonderzeiger()) {
    assert.ok(z.feld === 'menschen' || /^instrument:[a-z-]+$/.test(z.feld) || /^liste:[A-Za-z]+:[a-z-]+:[A-Za-z]+$/.test(z.feld), 'Form: ' + z.feld);
    assert.ok(z.de && z.en);
  }
  assert.equal(V.blattZeigerBekannt('health', 'gibtEsNicht'), false);
});

test('[GEN3 · Blatt] die Oberfläche: Start-Kachel, Palette im Blatt-Modus, Signierweg über den Tresor, Entwurf mit Blatt', () => {
  assert.match(HTML, /id="start-blatt"/);
  assert.match(HTML, /id="ab-erzeugen"/);
  assert.match(HTML, /id="blatt-meta"/);
  assert.match(HTML, /id="blatt-eig"/);
  assert.match(HTML, /signiereMitTresor\(ev, \(k\) => baueBlattSigniert\(state, k\)/);
  const { V } = ladeGenerator();
  const roh = V.entwurfBauen();
  assert.equal(roh.art, undefined, 'ein Formular-Entwurf trägt keine Blatt-Art');
});

test('[GEN3 · Blatt] die Symbole des Generators kennt der Kern (Kern-Objekt ICONS)', () => {
  const kernPfad = path.join(__dirname, '..', 'vivodepot.html');
  const kern = fs.readFileSync(kernPfad, 'utf8');
  const i = kern.indexOf('const ICONS = Object.freeze({');
  assert.ok(i > 0, 'Vorbedingung: ICONS im Kern');
  const seg = kern.slice(i, kern.indexOf('\n});', i));
  const { V } = ladeGenerator();
  for (const ic of V.BLATT_ICONS) assert.ok(new RegExp('\\n\\s{2}' + ic + ':').test(seg), 'der Kern kennt das Symbol nicht: ' + ic);
});

/* Der Kern trägt den Prüfer der Angehörigen-Vorlagen seit ANG1. Bis zum 04.10.2026 setzte der Fall ohne ihn still aus; der
   Zweig war tot (der Prüfer steht im Kern) und ist ersetzt: fehlt der Prüfer, ist das jetzt rot. */
test('[GEN3 · Blatt] Parität mit dem Prüfer des Kerns an jedem Fall', () => {
  const V = require('./load-kern.js').ladeKern({ blank: true }).V;
  assert.equal(typeof V.angehoerigenVorlagePruefen, 'function', 'der Kern trägt angehoerigenVorlagePruefen');
  const G = ladeGenerator().V;
  for (const [name, bau, gueltig, grund] of FAELLE) {
    const k = V.angehoerigenVorlagePruefen(bau()); const g = G.blattModulPruefen(bau());
    assert.equal(g.gueltig, k.gueltig, name + ': gültig');
    assert.equal(g.grund, k.grund, name + ': Grund');
  }
  const st = blattState(); const m = G.blattModulBauen(st);
  assert.equal(V.angehoerigenVorlagePruefen(m).gueltig, true, 'der Kern nimmt das Modul des Generators an');
  for (const ic of G.BLATT_ICONS) assert.equal(V.angehoerigenVorlagePruefen(modul({ situationen: { 'sit-x': { titel: 'X', icon: ic } } })).verworfene.some((v) => v.grund === 'icon-unbekannt'), false, ic);
});
