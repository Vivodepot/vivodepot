'use strict';
/* Befund S1 (03.10.2026, WAEHRUNG-FEST-EUR): ausgelieferter Code setzt keine Währung fest, die weder aus einem Template
   noch aus einem Register kommt. Eine Zählquelle: tools/waehrung-fest-erheben.js; die Grundlinie
   tools/waehrung-fest-grundlinie.json darf nur sinken. Dazu der Wächter: den eingebauten Wert
   TEXTSATZ_REGELN_EINGEBAUT.waehrung gibt es nicht mehr (Kern und Lese-App, U2-ADR-480), und die Rot-Beweise A/B am
   ELSTER-Import.
   Die Fixture tests/fixtures/waehrung-fest/geruest-ausschnitt.html ist erfunden, jede Zeile ein benannter Fall. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const W = require('../tools/waehrung-fest-erheben.js');
const { ladeKern, HTML_PATH } = require('./load-kern.js');

const REPO = path.join(__dirname, '..');
const FIXTURE = fs.readFileSync(path.join(__dirname, 'fixtures', 'waehrung-fest', 'geruest-ausschnitt.html'), 'utf8');
const erheben = (text) => W.erheben(text, { fremdcode: [] });
const kurz = (r) => r.funde.map((f) => [f.zeile, f.art, f.wert].join(' '));

test('[Währung·Fixture] fest, Format-Definition und Textsatz-Regel werden getrennt; Region, Kommentar, Nutzlast zählen nicht', () => {
  const r = erheben(FIXTURE);
  assert.deepEqual(kurz(r), [
    '12 textsatz-regel EUR',
    '16 format-definition EUR',
    '20 fest  EUR',
    '22 fest Vermögenswert (EUR)',
  ]);
  assert.equal(r.fest, 2);
  assert.deepEqual(r.leser, []);
});

test('[Währung·Rot] aus Region, Kommentar, Nutzlast oder Register herausgelöst zählt ein EUR als fest', () => {
  const basis = erheben(FIXTURE).fest;
  const ohneRegion = FIXTURE.replace('/* SEKTOREN:BEGIN */', '').replace('/* SEKTOREN:END */', '');
  assert.equal(erheben(ohneRegion).fest, basis + 1);
  assert.equal(erheben(FIXTURE.replace("// Ein Kommentar mit ' EUR' zählt nicht.", "const k = ' EUR';")).fest, basis + 1);
  assert.equal(erheben(FIXTURE.replace('<script type="application/json" id="modul-nutzlast">', '<script>const n = ')).fest, basis + 2);
  // Derselbe Schlüssel `waehrung: 'EUR'` außerhalb eines Format-Registers ist keine Format-Definition.
  assert.equal(erheben(FIXTURE.replace('const IMPORT_FORMATE = Object.freeze([', 'const IRGENDWAS = Object.freeze([')).fest, basis + 1);
  assert.equal(erheben(FIXTURE.replace('const TEXTSATZ_REGELN_EINGEBAUT = ', 'const ANDERE_REGELN = ')).fest, basis + 1);
});

test('[Währung·Leser] ein Leser des eingebauten Werts wird gefunden — direkt, über eine Variable, destrukturiert', () => {
  const mit = (zeile) => W.leserFinden(FIXTURE.replace('</script>\n</html>', zeile + '\n</script>\n</html>')).length;
  assert.equal(mit('const w = textsatzRegeln().waehrung;'), 1);
  assert.equal(mit("const w = TEXTSATZ_REGELN_EINGEBAUT['waehrung'];"), 1);
  assert.equal(mit('const r = textsatzRegeln();\nconst w = r.waehrung;'), 1);
  assert.equal(mit('const { waehrung } = textsatzRegeln();'), 1);
  // Kein Leser: ein Kommentar, und die Währung einer Datei.
  assert.equal(mit('// textsatzRegeln().waehrung wird nicht gelesen'), 0);
  assert.equal(mit('const w = lst.waehrung;'), 0);
});

test('[Währung·Positivkontrolle] trägt an der Fixture; eine blinde Erhebung bricht sie', () => {
  assert.deepEqual(W.positivkontrolle(FIXTURE, erheben), []);
  const blindFest = (t) => ({ ...erheben(t), fest: 0 });
  const blindLeser = (t) => ({ ...erheben(t), leser: [] });
  assert.deepEqual(W.positivkontrolle(FIXTURE, blindFest), ['fest']);
  assert.deepEqual(W.positivkontrolle(FIXTURE, blindLeser), ['leser']);
  // Ein Skript, das HTML schreibt, beendet den Block nicht vorzeitig.
  const js = W.alsDokument('x.js', "const html = '<script>' + x + '</script></html>';\nconst b = ' EUR';\n");
  assert.equal(erheben(js).fest, 1);
  assert.deepEqual(W.positivkontrolle(js, erheben), []);
});

test('[Währung·Grundlinie] ausgeliefert: feste Währungen höchstens die Grundlinie, und genau sie; kein Leser', () => {
  const g = JSON.parse(fs.readFileSync(W.GRUNDLINIE, 'utf8'));
  const e = W.lauf(W.ausgelieferteDokumente());
  const stellen = e.dokumente.flatMap((d) => d.funde.filter((f) => f.art === 'fest').map((f) => d.name + ':' + f.zeile + ' ' + JSON.stringify(f.wert)));
  assert.ok(e.fest <= g.fest, 'neue feste Währung im Ausgelieferten (' + e.fest + ' > Grundlinie ' + g.fest + '):\n  ' + stellen.join('\n  '));
  assert.equal(e.fest, g.fest, 'gesunken auf ' + e.fest + ' — Grundlinie in tools/waehrung-fest-grundlinie.json nachziehen (nur sinkend)');
  assert.equal(e.leser, 0, 'textsatzRegeln().waehrung wird außerhalb von textsatzWaehrung() gelesen (U2-ADR-480)');
});

test('[Währung·Wächter] den eingebauten Wert gibt es in keiner Kopie mehr, und niemand außer textsatzWaehrung() liest die Regel', () => {
  // U2-ADR-480 (ADR-Entwurf FREIGEGEBEN): strenger als die Abnahme (3) — nicht „niemand liest“, sondern
  // „es gibt ihn nicht“. Die eine Lesestelle ist textsatzWaehrung() (Modul → Template → null).
  for (const datei of ['vivodepot.html', 'vivodepot-lesen.html']) {
    const text = fs.readFileSync(path.join(REPO, datei), 'utf8');
    const r = erheben(text);
    assert.equal(r.funde.filter((f) => f.art === 'textsatz-regel').length, 0, datei + ': TEXTSATZ_REGELN_EINGEBAUT trägt wieder eine Währung');
    assert.deepEqual(r.leser, [], datei + ': Leser von textsatzRegeln().waehrung außerhalb von textsatzWaehrung()');
  }
  const kern = fs.readFileSync(path.join(REPO, 'vivodepot.html'), 'utf8');
  assert.match(kern, /\nfunction textsatzWaehrung\(\) \{\n  const ausModul = textsatzRegeln\(\)\.waehrung;/, 'Vorbedingung: die Lesestelle liest selbst');
  assert.equal(W.leserFinden(kern.replace('function textsatzWaehrung()', 'function andereStelle()')).length, 1,
    'Rot-Beweis: dieselbe Zeile außerhalb von textsatzWaehrung() ist ein Leser');
});

/* ── Rot-Beweise am Verhalten: die ELSTER-Währung kommt aus der Format-Definition ── */
const ELSTER_OHNE_WAEHRUNG = JSON.stringify({
  steuerpflichtiger: { finanzamt: 'Finanzamt Erfunden' },
  lohnsteuerbescheinigung: { bruttoarbeitslohn: '100.00', lohnsteuer: '10.00' },
});
const FORMAT_ZEILE = "    waehrung: 'EUR',";

async function notizNachImport(htmlPfad, format, inhalt) {
  const { V } = ladeKern(htmlPfad ? { htmlPfad, backen: true } : {});
  await V.depotAnlegen('Waehrung-Probe-2026!');
  V.akteurSelbstErklaeren('Tester');
  V.kernAPI.importiere(format, inhalt, { alleKonflikte: true });
  return JSON.stringify(V.getData().sektoren.finance || {});
}
function kernMit(ersetzen) {
  const text = fs.readFileSync(HTML_PATH, 'utf8');
  assert.equal(text.split(FORMAT_ZEILE).length, 2, 'die Format-Definition trägt genau eine Währungszeile');
  const pfad = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'vd-waehrung-kern-')), 'vivodepot.html');
  fs.writeFileSync(pfad, ersetzen(text));
  return pfad;
}

test('[Währung·A] ELSTER ohne Währung trägt die Währung der Format-Definition — und genau die', async () => {
  const notiz = await notizNachImport(null, 'elster', ELSTER_OHNE_WAEHRUNG);
  assert.match(notiz, /Bruttoarbeitslohn: 100\.00 EUR/);
  assert.match(notiz, /Lohnsteuer: 10\.00 EUR/);
  const pfad = kernMit((t) => t.replace(FORMAT_ZEILE, "    waehrung: 'CHF',"));
  try {
    const anders = await notizNachImport(pfad, 'elster', ELSTER_OHNE_WAEHRUNG);
    assert.match(anders, /Lohnsteuer: 10\.00 CHF/, 'die Währung folgt der Format-Definition, nicht einem Literal im Gerüst');
    assert.doesNotMatch(anders, /EUR/);
  } finally { const dir = path.dirname(pfad); fs.rmSync(dir, { recursive: true, force: true }); }
});

test('[Währung·B] ohne Währung in Datei und Format hängt kein Import EUR an', async () => {
  const pfad = kernMit((t) => t.replace(FORMAT_ZEILE + '\n', ''));
  try {
    const notiz = await notizNachImport(pfad, 'elster', ELSTER_OHNE_WAEHRUNG);
    assert.match(notiz, /Lohnsteuer: 10\.00(?! EUR)/);
    assert.doesNotMatch(notiz, /EUR/);
  } finally { const dir = path.dirname(pfad); fs.rmSync(dir, { recursive: true, force: true }); }
  const camt = fs.readFileSync(path.join(__dirname, 'fixtures', 'camt053.example.xml'), 'utf8')
    .replace(/<Ccy>[A-Z]{3}<\/Ccy>/g, '').replace(/ Ccy="[A-Z]{3}"/g, '');
  const { V } = ladeKern();
  const p = V.parseCamt053(camt);
  assert.ok(p && p.buchungen.length > 0, 'die Probe-Datei wird gelesen');
  assert.doesNotMatch(JSON.stringify(p), /EUR/, 'CAMT ohne Ccy: keine Währung erfunden');
});

/* ── Studio bei fehlender Währung (Gegenlesung, 04.10.2026, Abnahme (1)) ──
   Die Vorlage `notariat` nennt im Feldnamen keine Währung; der Betrag trägt seinen Code allein über codeSystem ISO 4217 und
   codeWerte aus der mitgelieferten Liste. Ohne codeWerte gibt es keinen Code — nie still EUR. */
test('[Währung·Studio] „Vermögenswert“ nennt keine Währung im Namen; der Code kommt nur aus der Liste ISO 4217', () => {
  const { ladeGenerator } = require('./load-generator.js');
  const { V } = ladeGenerator();
  const felder = Object.values(V.BEISPIEL_TEMPLATES).flatMap((t) => (t && t.felder) || []);
  const betrag = felder.filter((f) => /^Vermögenswert/.test(f.feldname));
  assert.equal(betrag.length, 1, 'Vorbedingung: das Feld steht in genau einer Vorlage');
  const f = betrag[0];
  assert.ok(!/\b[A-Z]{3}\b|€/.test(f.feldname), 'der Feldname nennt eine Währung: ' + f.feldname);
  assert.equal(f.codeSystem, 'urn:iso:std:iso:4217');
  const liste = new Set(V.VD_CODE_LISTEN.iso4217.daten.map((e) => e.code));
  const nichtInListe = (codes) => [...codes].filter((c) => !liste.has(c.code)).map((c) => String(c.code));   // Array aus dem Generator-Kontext: neu anlegen
  assert.deepEqual(nichtInListe(f.codeWerte), []);
  assert.deepEqual(nichtInListe([{ code: 'XXX' }]), ['XXX'], 'Rot-Beweis: ein Code außerhalb der Liste fällt auf');
  for (const andere of felder.filter((x) => x !== f)) assert.ok(!/\((EUR|USD|GBP|CHF)\)/.test(andere.feldname), 'Währung im Feldnamen: ' + andere.feldname);
});

test('[Währung·CAMT] eine Kontoauszugsdatei ohne Währung ergibt keine — nie still EUR', () => {
  const { V } = ladeKern();
  const roh = fs.readFileSync(path.join(__dirname, 'fixtures', 'camt053.example.xml'), 'utf8');
  assert.ok(/Ccy/.test(roh), 'Vorbedingung: die Fixture trägt Währungen');
  const mit = JSON.stringify(V.parseCamt053(roh));
  assert.match(mit, /"waehrung":"EUR"/, 'Gegenprobe: mit Währung in der Datei kommt sie an');
  const ohne = roh.replace(/\s+Ccy="[A-Z]{3}"/g, '').replace(/<Ccy>[A-Z]{3}<\/Ccy>/g, '');
  const r = JSON.stringify(V.parseCamt053(ohne));
  assert.ok(r && r !== 'null', 'Vorbedingung: die Datei ohne Währung wird gelesen');
  assert.ok(!/EUR/.test(r), 'ohne Währung in der Datei steht EUR im Ergebnis: ' + r.slice(0, 200));
});
