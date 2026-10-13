'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Die Prüfregeln sind öffentlich, und sie sind die der Bürger-App (U2-ADR-496, 10.10.2026)
   ────────────────────────────────────────────────────────────────────────
   docs/pruefregeln/pruefregeln.json nennt je Ablehnungsgrund der App eine Regel mit stabiler Kennung. Die Datei darf
   der App nicht weglaufen: ein neuer Grund im Kern ohne Regel fällt hier, eine Regel, deren Grund der Kern nicht mehr
   kennt, auch. Die lesbare Fassung ist genau das, was der Erzeuger heute schreibt. Jede Regel, die eine Datei abweist,
   hat einen Fall unter tests/fixtures/pruefregeln/ oder steht mit Begründung auf der Liste ohne Fall.

   Dazu die reine Funktion (tools/lib/vorab-pruefung.js) an einem Stellvertreter für die App: vier Urteile, und die
   Fehlrichtung — wirft oder fehlt die Prüfung, heißt das Urteil nie „bestanden“ (U2-ADR-483 Nr. 5).

   Ohne externes Modul. Die Fälle gegen die echte App und das Schema fährt tests/mit-modul/pruefregeln-faelle.test.js.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { pruefeEinreichung, artErkennen, regelFinden, regelIndex, URTEILE } = require('../tools/lib/vorab-pruefung.js');
const { regelnGegenKern } = require('../tools/lib/pruefregeln-gegen-kern.js');
const lesbar = require('../tools/pruefregeln-lesbar-erzeugen.js');

const WURZEL = path.join(__dirname, '..');
const REGELN = JSON.parse(fs.readFileSync(path.join(WURZEL, 'docs', 'pruefregeln', 'pruefregeln.json'), 'utf8'));
const KERN = fs.readFileSync(path.join(WURZEL, 'vivodepot.html'), 'utf8');
const FAELLE_DIR = path.join(WURZEL, 'tests', 'fixtures', 'pruefregeln');
const kopie = (x) => JSON.parse(JSON.stringify(x));

function faelle() {
  const aus = [];
  for (const d of fs.readdirSync(FAELLE_DIR).filter((f) => f.endsWith('.json') && !f.startsWith('_'))) {
    const inhalt = JSON.parse(fs.readFileSync(path.join(FAELLE_DIR, d), 'utf8'));
    for (const f of inhalt.faelle) aus.push(Object.assign({ datei: d, art: inhalt.art }, f));
  }
  return aus;
}

/* ══ Regeldatei ↔ App ═══════════════════════════════════════════════════ */

test('[Prüfregeln] jeder Ablehnungsgrund der App hat eine Regel, und jede Regel hat ihren Grund in der App', () => {
  const r = regelnGegenKern(REGELN, KERN);
  assert.deepEqual(r.fehlend, [], 'Gründe der App ohne Regel');
  assert.deepEqual(r.verwaist, [], 'Regeln, deren Grund die App nicht mehr kennt');
});

test('[Prüfregeln·Rot-Beweis] fehlt eine Regel, fällt der Grund auf; eine erfundene Regel fällt als verwaist auf', () => {
  const ohne = kopie(REGELN);
  ohne.regeln = ohne.regeln.filter((x) => x.kennung !== 'vorlage.verweis-nicht-https' && x.kennung !== 'format.zuordnung-nur-fest');
  const r1 = regelnGegenKern(ohne, KERN);
  assert.ok(r1.fehlend.some((f) => f.startsWith('vorlage · verweis mit unzulässigem Schema')), 'der Satz der Vorlagenprüfung fehlt in ' + JSON.stringify(r1.fehlend));
  assert.ok(r1.fehlend.includes('format · zuordnung-nur-fest'), 'das Kennwort des Format-Prüfers fehlt');
  const mehr = kopie(REGELN);
  mehr.regeln.push({ kennung: 'textsatz.gibt-es-nicht', art: 'textsatz', kernGrund: 'gibt-es-nicht', schwere: 'abweisung', satz: { de: 'x', en: 'x' } });
  assert.deepEqual(regelnGegenKern(mehr, KERN).verwaist, ['textsatz.gibt-es-nicht']);
});

test('[Prüfregeln] die Kennungen sind eindeutig, tragen ihre Art vorn, und jede Art der Liste hat Regeln', () => {
  const gesehen = new Set();
  for (const r of REGELN.regeln) {
    assert.ok(!gesehen.has(r.kennung), 'doppelt: ' + r.kennung);
    gesehen.add(r.kennung);
    assert.equal(r.kennung.split('.')[0], r.art, r.kennung + ' trägt die Art nicht vorn');
    assert.ok(REGELN.arten.includes(r.art), r.art + ' fehlt in arten');
    assert.ok(r.satz.de.trim() && r.satz.en.trim(), r.kennung + ' ohne Satz in beiden Sprachen');
  }
  for (const a of REGELN.arten) assert.ok(REGELN.regeln.some((r) => r.art === a), 'Art ohne Regel: ' + a);
  assert.deepEqual(Object.keys(REGELN.urteile).sort(), [...URTEILE].sort(), 'die Regeldatei erklärt genau die vier Urteile');
});

test('[Prüfregeln] der Grundsatz steht in der Datei: Form und Regeln, nicht die Richtigkeit des Inhalts', () => {
  assert.match(REGELN.grundsatz.de, /Form und Regeln/);
  assert.match(REGELN.grundsatz.de, /Inhalt[^.]*nicht geprüft/);
  assert.match(REGELN.grundsatz.en, /content[^.]*not checked/);
});

test('[Prüfregeln] die lesbare Fassung ist genau die heute erzeugte', () => {
  assert.equal(fs.readFileSync(lesbar.ZIEL, 'utf8'), lesbar.erzeugen(REGELN),
    'docs/pruefregeln/pruefregeln.md neu erzeugen: node tools/pruefregeln-lesbar-erzeugen.js --schreiben');
});

test('[Prüfregeln·Rot-Beweis] eine geänderte Regel macht die lesbare Fassung ungleich', () => {
  const anders = kopie(REGELN);
  anders.regeln[0].satz.de += ' Zusatz.';
  assert.notEqual(fs.readFileSync(lesbar.ZIEL, 'utf8'), lesbar.erzeugen(anders));
});

/* ══ Fälle decken die Regeln ════════════════════════════════════════════ */

test('[Prüfregeln·Fälle] jede Regel, die abweist, hat einen Fall oder steht begründet auf der Liste ohne Fall', () => {
  const ohneFall = JSON.parse(fs.readFileSync(path.join(FAELLE_DIR, '_ohne-fall.json'), 'utf8'));
  const getroffen = new Set(faelle().filter((f) => f.regel).map((f) => f.regel));
  const kennungen = new Set(REGELN.regeln.map((r) => r.kennung));
  for (const k of getroffen) assert.ok(kennungen.has(k), 'ein Fall nennt eine Regel, die es nicht gibt: ' + k);
  for (const r of REGELN.regeln) {
    const hatFall = getroffen.has(r.kennung), aufListe = Object.prototype.hasOwnProperty.call(ohneFall, r.kennung);
    if (r.schwere === 'abweisung') assert.ok(hatFall || aufListe, 'Regel ohne Fall und ohne Begründung: ' + r.kennung);
    assert.ok(!(hatFall && aufListe), 'Regel hat einen Fall und steht trotzdem auf der Liste ohne Fall: ' + r.kennung);
  }
  for (const [k, grund] of Object.entries(ohneFall)) {
    assert.ok(kennungen.has(k), 'die Liste ohne Fall nennt eine Regel, die es nicht gibt: ' + k);
    assert.ok(typeof grund === 'string' && grund.trim().length > 20, 'Begründung fehlt: ' + k);
  }
});

test('[Prüfregeln·Fälle] jede Art mit eigenem Prüfer hat einen bestandenen Fall', () => {
  const alle = faelle();
  for (const a of REGELN.arten.filter((x) => x !== 'allgemein')) {
    assert.ok(alle.some((f) => f.art === a && f.urteil === 'bestanden'), 'kein bestandener Fall für ' + a);
  }
});

/* ══ Die reine Funktion am Stellvertreter ═══════════════════════════════ */

const stellvertreter = (ueber) => Object.assign({
  fassung: 'Stellvertreter', fingerabdruck: 'x', registerTypen: ['blattformat', 'branding'], nurGeprueft: ['branding'],
  einlassen: () => ({ angenommen: true, grund: null, verworfene: [] }),
  registerPruefen: () => ({ gueltig: true, grund: null, verworfene: [] }),
  vorlagePruefen: () => null,
  anfragePruefen: () => ({ gueltig: true, grund: null, verworfene: [] }),
}, ueber || {});
const BLATT = { modulTyp: 'blattformat', moduleVersion: 1, herkunft: 'probe', format: 'letter' };
const pruefe = (d, kern, mehr) => pruefeEinreichung(d, Object.assign({ regeln: REGELN, kern: stellvertreter(kern) }, mehr || {}));

test('[Vorab-Prüfung] bestanden, gemeldet, abgewiesen: das Urteil folgt der App, die Zeile nennt die Regel', () => {
  assert.equal(pruefe(BLATT).urteil, 'bestanden');
  const g = pruefe(BLATT, { einlassen: () => ({ angenommen: true, grund: null, verworfene: [{ schluessel: 'farbe', grund: 'unbekannt' }] }) });
  assert.equal(g.urteil, 'gemeldet');
  assert.deepEqual([g.zeilen[0].regel, g.zeilen[0].schwere, g.zeilen[0].fundstelle, g.zeilen[0].kernGrund], ['allgemein.teil-verworfen', 'meldung', 'schluessel: farbe', 'unbekannt']);
  const a = pruefe(BLATT, { einlassen: () => ({ angenommen: false, grund: 'format', verworfene: [] }) });
  assert.equal(a.urteil, 'abgewiesen');
  assert.equal(a.zeilen[0].regel, 'blattformat.format');
  assert.equal(a.zeilen[0].quelle, 'modulEinlassen');
  assert.equal(a.art, 'blattformat');
});

test('[Vorab-Prüfung] die Regel der Art geht vor der allgemeinen, die allgemeine greift, wo die Art keine hat', () => {
  const s = pruefe({ modulTyp: 'textsatz' }, { registerTypen: ['textsatz'], einlassen: () => ({ angenommen: false, grund: 'sprache', verworfene: [] }) });
  assert.equal(s.zeilen[0].regel, 'textsatz.sprache');
  const b = pruefe(BLATT, { einlassen: () => ({ angenommen: false, grund: 'sprache-form', verworfene: [] }) });
  assert.equal(b.zeilen[0].regel, 'allgemein.sprache-form');
});

test('[Vorab-Prüfung·Fehlrichtung] wirft die Prüfung, fehlt sie oder liefert sie Unerwartetes, heißt das Urteil nichtGeprueft, nie bestanden', () => {
  const wirft = pruefe(BLATT, { einlassen: () => { throw new Error('kaputt'); } });
  const fehlt = pruefe(BLATT, { einlassen: undefined });
  const unsinn = pruefe(BLATT, { einlassen: () => 'ja' });
  const halb = pruefe(BLATT, { einlassen: () => ({ grund: null }) });
  for (const e of [wirft, fehlt, unsinn, halb]) {
    assert.equal(e.urteil, 'nichtGeprueft');
    assert.ok(e.zeilen.some((z) => z.regel === 'allgemein.pruefung-nicht-moeglich'));
  }
  /* Gründe der App, die nichts über die Datei sagen. */
  for (const grund of ['fehler', 'kein-depot', 'vorfuehrung']) {
    const e = pruefe(BLATT, { einlassen: () => ({ angenommen: false, grund, verworfene: [] }) });
    assert.equal(e.urteil, 'nichtGeprueft', grund);
    assert.equal(e.zeilen[0].regel, 'allgemein.' + grund);
  }
});

/* Für diese Gründe gibt es keinen Fall als Datei (Größe, Zustand eines Depots, Fassung eines Produkts). Geprüft wird hier,
   dass der Grund, käme er von der App, seine Regel findet und die Datei abweist. Die Liste ohne Fall beruft sich darauf. */
test('[Vorab-Prüfung] Gründe der App, die keine Datei herbeiführt, finden ihre Regel', () => {
  for (const grund of ['kein-json', 'unbekannter-typ', 'zu-gross', 'nicht-serialisierbar', 'kennung-ab-werk', 'aeltere-fassung', 'zweite-herkunft', 'ungueltig']) {
    const e = pruefe(BLATT, { einlassen: () => ({ angenommen: false, grund, verworfene: [] }) });
    assert.equal(e.urteil, 'abgewiesen', grund);
    assert.equal(e.zeilen[0].regel, 'allgemein.' + grund);
  }
  assert.equal(regelFinden(regelIndex(REGELN), 'allgemein', 'kein-objekt').kennung, 'allgemein.kein-objekt');
  const ang = pruefe({ modulTyp: 'angehoerigenVorlage' }, { registerTypen: ['angehoerigenVorlage'],
    einlassen: () => ({ angenommen: false, grund: 'modulTyp', verworfene: [] }) });
  assert.equal(ang.zeilen[0].regel, 'angehoerigenVorlage.modulTyp');
  for (const [satz, regel] of [['Template nicht serialisierbar', 'vorlage.nicht-serialisierbar'], ['Template zu groß (99999 Byte)', 'vorlage.zu-gross'],
    ['wortlaut zu lang (70000)', 'vorlage.wortlaut-zu-lang']]) {
    const e = pruefe({ felder: [{}] }, { vorlagePruefen: () => satz });
    assert.equal(e.urteil, 'abgewiesen', satz);
    assert.equal(e.zeilen[0].regel, regel);
  }
});

test('[Vorab-Prüfung] keine erkennbare Art: nichtGeprueft; ein unbekannter Grund der App: abgewiesen ohne Regelkennung', () => {
  for (const d of [null, 7, [1], {}, { modulTyp: 'zz-gibt-es-nicht' }]) {
    const e = pruefe(d);
    assert.equal(e.urteil, 'nichtGeprueft');
    assert.equal(e.zeilen[0].regel, 'allgemein.unbekannte-art');
  }
  const u = pruefe(BLATT, { einlassen: () => ({ angenommen: false, grund: 'zz-neuer-grund', verworfene: [] }) });
  assert.equal(u.urteil, 'abgewiesen');
  assert.equal(u.zeilen[0].regel, null);
  assert.equal(u.zeilen[0].kernGrund, 'zz-neuer-grund');
});

test('[Vorab-Prüfung] ein Register nur für signierte Module: die Form wird geprüft, der Hinweis steht daneben', () => {
  const kern = { einlassen: () => ({ angenommen: false, grund: 'nur-signiert-erlaubt', verworfene: [] }) };
  const gut = pruefe({ modulTyp: 'branding', moduleVersion: 1 }, kern);
  assert.equal(gut.urteil, 'bestanden');
  assert.deepEqual(gut.zeilen.map((z) => [z.regel, z.schwere]), [['allgemein.nur-signiert-erlaubt', 'hinweis']]);
  const schlecht = pruefe({ modulTyp: 'branding', moduleVersion: 1 }, Object.assign({}, kern,
    { registerPruefen: () => ({ gueltig: false, grund: 'nichts-gueltiges-gesetzt', verworfene: [] }) }));
  assert.equal(schlecht.urteil, 'abgewiesen');
  assert.ok(schlecht.zeilen.some((z) => z.regel === 'branding.nichts-gueltiges-gesetzt'));
});

test('[Vorab-Prüfung] Vorlage und Paket: der Satz der App wird zur Regel, die Fundstelle nennt die Vorlage im Paket', () => {
  const v = pruefe({ felder: [{}] }, { vorlagePruefen: () => 'verweis mit unzulässigem Schema (nur https: erlaubt): Formular' });
  assert.equal(v.urteil, 'abgewiesen');
  assert.equal(v.zeilen[0].regel, 'vorlage.verweis-nicht-https');
  const q = pruefe({ felder: [{}] }, { vorlagePruefen: () => 'wortlautQuelleBroschuere.url:ungueltig' });
  assert.equal(q.zeilen[0].regel, 'vorlage.quelle-url-ungueltig');
  const paket = { anbieter: {}, templates: [{ felder: [{}] }, { felder: [] }] };
  const p = pruefe(paket, { vorlagePruefen: (t) => (t.felder.length ? null : 'felder fehlt oder ist leer') }, { schemaPruefen: () => [] });
  assert.equal(p.urteil, 'abgewiesen');
  assert.deepEqual([p.zeilen[0].regel, p.zeilen[0].fundstelle], ['vorlage.felder', 'templates[1]']);
  const ohneSchema = pruefe({ anbieter: {}, templates: [{ felder: [{}] }] }, {}, { schemaPruefen: () => null });
  assert.equal(ohneSchema.urteil, 'nichtGeprueft');
  assert.ok(ohneSchema.zeilen.some((z) => z.regel === 'allgemein.schema-nicht-geprueft'));
  assert.equal(pruefe({ anbieter: {}, templates: [] }).zeilen[0].regel, 'einreichung.ohne-vorlage');
});

test('[Vorab-Prüfung] das Schema nennt die Stelle und kippt das Urteil nicht; eine sichere Abweisung wiegt mehr als ein ungeprüfter Teil', () => {
  const e = pruefe(BLATT, {}, { schemaPruefen: () => [{ fundstelle: '/format', text: 'must be equal to one of the allowed values' }] });
  assert.equal(e.urteil, 'bestanden');
  assert.deepEqual([e.zeilen[0].regel, e.zeilen[0].schwere, e.zeilen[0].fundstelle], ['allgemein.schema', 'hinweis', '/format']);
  const beides = pruefe({ anbieter: {}, templates: [{ felder: [] }] }, { vorlagePruefen: () => 'felder fehlt oder ist leer' }, { schemaPruefen: () => null });
  assert.equal(beides.urteil, 'abgewiesen');
});

test('[Vorab-Prüfung] der Umschlag wird ausgepackt, die Signatur ausdrücklich nicht geprüft; der Fingerabdruck kommt vom Aufrufer', () => {
  const umschlag = { format: 'zz', modul: BLATT, modulSignaturJws: 'a.b.c' };
  assert.deepEqual(artErkennen(umschlag, ['blattformat']), { art: 'blattformat', dokument: BLATT, umschlag: true });
  const e = pruefe(umschlag, {}, { fingerabdruck: (d) => 'fp:' + d.modulTyp, regelnFingerabdruck: 'rf' });
  assert.equal(e.urteil, 'bestanden');
  assert.equal(e.zeilen[0].regel, 'allgemein.signatur-nicht-geprueft');
  assert.equal(e.inhaltsFingerabdruck, 'fp:blattformat');
  assert.equal(e.pruefregelnFingerabdruck, 'rf');
  assert.equal(e.regelFassung, REGELN.fassung);
  assert.equal(e.kernFassung, 'Stellvertreter');
  assert.equal(pruefe(BLATT).inhaltsFingerabdruck, null, 'ohne Funktion kein Fingerabdruck, keine eigene Kanonisierung');
});

test('[Vorab-Prüfung] die Sätze gibt es auf Englisch, die Kennung bleibt dieselbe', () => {
  const kern = { einlassen: () => ({ angenommen: false, grund: 'format', verworfene: [] }) };
  const de = pruefe(BLATT, kern), en = pruefe(BLATT, kern, { sprache: 'en' });
  assert.equal(de.zeilen[0].regel, en.zeilen[0].regel);
  assert.notEqual(de.zeilen[0].grund, en.zeilen[0].grund);
});

test('[Vorab-Prüfung] die reine Funktion lädt keine Datei, kein Netz und keinen Schlüssel', () => {
  const quelle = fs.readFileSync(path.join(WURZEL, 'tools', 'lib', 'vorab-pruefung.js'), 'utf8');
  assert.equal(/\brequire\(/.test(quelle), false, 'kein require in der reinen Funktion');
  assert.equal(/\b(fetch|XMLHttpRequest|process\.env|readFileSync)\b/.test(quelle), false);
});
