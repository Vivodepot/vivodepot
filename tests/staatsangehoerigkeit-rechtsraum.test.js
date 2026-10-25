'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   Staatsangehörigkeit Teil B (04.10.2026) — Befund PID-NATIONALITIES-FREITEXT
   ────────────────────────────────────────────────────────────────────────────
   Vorher: `identity.nationality` war Freitext und ging als `["deutsch"]` in die PID. Jetzt: Auswahl aus der amtlichen Liste
   des Rechtsraum-Templates der Zusammenstellung (DE: DESTATIS, tools/rechtsraum-de-modul.json), gespeichert als
   {liste, code}; in die PID nur geltende ISO-3166-1-Codes oder die PID-Sonderwerte QS/QU, alle oder keine.
   Gehalten wird:
     1  der Template-Vertrag `codeListen`/`felder` (Schema-Bedingungen 1, 2), je Regel ein Rot-Beweis
     2  die Payload in allen vier Produkten; Rot-Beweis mit der alten Abbildung (`["deutsch"]`)
     3  alle oder keine, Sonderwerte, Kosovo/ehemalige Staaten/„ohne Angabe“ nie still in der PID
     4  der Wächter: die Abbildung liest weder Sprache noch Rechtsraum; Rot-Beweis mit gepflanzter Ableitung
     5  Selbst-Einlass (Bedingung der Gegenlesung): ein eingelassenes Modul mit eigener Liste ändert weder Auswahl noch PID; Gegenprobe ab Werk
     6  ohne Rechtsraum der Zusammenstellung: Feld leer mit Hinweis, nichts in der PID
   Der Rechtsraum der Zusammenstellung ist der Code des einzigen Rechtsraum-Moduls der Ab-Werk-Saat (U2-ADR-504 §3); die Bindung
   liest über `_rechtsraumModulDerZusammenstellung`, nie über `data`. Ein Produkt ohne Rechtsraum-Modul bzw. mit einem anderen
   bauen die Proben darum aus den Moduldateien von privat-de ohne bzw. statt tools/rechtsraum-de-modul.json.
     7  Bestand (Gegenlesung B(2)): ein alter Freitext bleibt sichtbar, wird nicht abgebildet, geht nicht in die PID
     8  Oberfläche: Auswahl ohne ehemalige Staaten, gespeicherte bleiben sichtbar, kein Freitext-Eingang; EN mit Lesehilfe
   ════════════════════════════════════════════════════════════════════════════ */
const test = require('./helfer/nur-privat.js').testMitPrivat(__filename);   // nur-privat: s. tests/helfer/nur-privat.js
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { ladeKern } = require('./load-kern.js');
const { PRODUKTE, modulDateienFuer, RECHTSRAUM_DE_PFAD } = require('../tools/lib/vier-produkte.js');
// Der Körper einer benannten Funktion im Quelltext, klammerbalanciert (genügt für die Fassungs- und Wächterproben hier).
function funktionsKoerper(quelltext, name) {
  const m = new RegExp('function\\s+' + name.replace(/\$/g, '\\$') + '\\s*\\([^)]*\\)\\s*\\{').exec(quelltext);
  if (!m) return null;
  let i = m.index + m[0].length, tiefe = 1;
  const start = i;
  while (tiefe > 0 && i < quelltext.length) { if (quelltext[i] === '{') tiefe++; else if (quelltext[i] === '}') tiefe--; i++; }
  return quelltext.slice(start, i - 1);
}

const REPO = path.join(__dirname, '..');
const KERN = fs.readFileSync(path.join(REPO, 'vivodepot.html'), 'utf8');
const L = 'destatis-staatsangehoerigkeit';
const c = (...codes) => codes.map((code) => ({ liste: L, code }));
const Z = ['VC_IDENTITAET_MAPPING', 'rechtsraumFeldBindung', 'pidStaatsangehoerigkeiten', 'rechtsraumCodeEintragText', 'rechtsraumListenEintrag', 'feldZeileHTML', '_rechtsraumListenGrund'];

async function depot(opts) {
  const { V } = ladeKern({ ...opts, zusatzBindungen: Z });
  await V.depotAnlegen('pw');
  V.akteurSelbstErklaeren('Tester');
  return V;
}
/* Ein Produkt wie privat-de, aber mit anderen Rechtsraum-Modulen ab Werk: ohne tools/rechtsraum-de-modul.json und mit `zusatz`
   (Pfade). Ohne Zusatz trägt es kein Rechtsraum-Modul — der Rechtsraum der Zusammenstellung ist dann '' (U2-ADR-504 §3). */
function produktMitRechtsraum(zusatz, slug) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'rr-liste-' + slug + '-'));
  const { konfektionieren } = require('../tools/produkt-konfektionieren.js');
  const dateien = modulDateienFuer(PRODUKTE.find((p) => p.slug === 'privat-de')).filter((p) => p !== RECHTSRAUM_DE_PFAD).concat(zusatz);
  const r = konfektionieren({ ziel: tmp, slug, modulauswahl: [],
    vorDepotKonfigurationInhaltFn: () => 'window.__vorDepotKonfiguration = [];\n', unsignierteModulDateien: dateien });
  return { tmp, htmlPfad: path.join(r.ordner, 'vivodepot.html') };
}
let _ohneRechtsraum = null;
async function depotOhneRechtsraum() {
  if (!_ohneRechtsraum) _ohneRechtsraum = produktMitRechtsraum([], 'ohne-rechtsraum');
  return depot({ htmlPfad: _ohneRechtsraum.htmlPfad });
}
process.on('exit', () => { if (_ohneRechtsraum) fs.rmSync(_ohneRechtsraum.tmp, { recursive: true, force: true }); });
function pid(V, wert) {
  V.sektorFeldSetzen('identity', 'nationality', wert);
  const vc = V.sdJwtVcIdentitaet({ sensibel: true });
  return { nationalities: vc.claims.nationalities, nicht: vc.__nichtUebernommen || [] };
}
const zeile = (V, roh, darf = true) => V.__zusatz.feldZeileHTML(V.feldDefFuer('identity', 'nationality'), roh, 'identity', darf, true);

/* ── 1 · Template-Vertrag ── */
const basis = () => ({
  modulTyp: 'rechtsraum', rechtsraum: 'AT', moduleVersion: 1, typen: { tpl_x: { katalogVersion: 1 } },
  codeListen: [{ systemId: 'at-liste', daten: [{ code: '1', anzeigeName: 'österreichisch', iso3166Alpha2: 'AT' }] }],
  felder: { 'identity.nationality': { codeListe: 'at-liste', mehrfach: true } },
});
test('[Staatsangehörigkeit·Vertrag] das DE-Template und ein sauberes Modul mit Liste und Bindung sind gültig', async () => {
  const V = await depot();
  assert.equal(V.validateRechtsraumModul(basis()), '');
  const de = JSON.parse(fs.readFileSync(path.join(REPO, 'tools', 'rechtsraum-de-modul.json'), 'utf8'));
  assert.equal(V.__zusatz._rechtsraumListenGrund(de), '');
});
const verstoesse = [
  ['doppelte systemId', (m) => { m.codeListen.push(JSON.parse(JSON.stringify(m.codeListen[0]))); }, 'codeListen'],
  ['Eintrag ohne code', (m) => { delete m.codeListen[0].daten[0].code; }, 'codeListen'],
  ['Eintrag ohne anzeigeName', (m) => { m.codeListen[0].daten[0].anzeigeName = ' '; }, 'codeListen'],
  ['leere daten', (m) => { m.codeListen[0].daten = []; }, 'codeListen'],
  ['unbekannter Schlüssel am Eintrag', (m) => { m.codeListen[0].daten[0].fremd = 1; }, 'codeListen'],
  ['iso3166Alpha2 nicht zweistellig groß', (m) => { m.codeListen[0].daten[0].iso3166Alpha2 = 'at'; }, 'codeListen'],
  ['pidSonderwert außerhalb QS/QU', (m) => { m.codeListen[0].daten[0].pidSonderwert = 'XX'; }, 'codeListen'],
  ['Bindung auf eine Liste eines anderen Moduls', (m) => { m.felder['identity.nationality'].codeListe = 'destatis-staatsangehoerigkeit'; }, 'felder'],
  ['Bindung mit fremdem Schlüssel', (m) => { m.felder['identity.nationality'].quelle = 'x'; }, 'felder'],
  ['mehrfach kein Wahrheitswert', (m) => { m.felder['identity.nationality'].mehrfach = 'ja'; }, 'felder'],
];
test('[Staatsangehörigkeit·Vertrag·Rot-Beweis] jeder Verstoß gegen den Vertrag weist das ganze Modul ab, an allen drei Prüfstellen', async () => {
  const V = await depot();
  const reg = V.EINLASS_REGISTER.find((r) => r.typ === 'rechtsraum');
  for (const [name, verderben, grund] of verstoesse) {
    const m = basis(); verderben(m);
    assert.equal(V.__zusatz._rechtsraumListenGrund(m), grund, name);
    assert.match(V.validateRechtsraumModul(m), new RegExp('^' + grund), name);
    assert.equal(reg.pruefen(m).grund, grund, name);
  }
});

/* ── 2 · Payload in allen vier Produkten ── */
test('[Staatsangehörigkeit·PID] in allen vier Produkten trägt nationalities ISO-Codes aus der Liste, nie die Bezeichnung', async () => {
  assert.ok(PRODUKTE.length >= 4);
  for (const p of PRODUKTE) {
    const V = await depot({ produkt: p.slug });
    assert.deepEqual(pid(V, c('000', '163')).nationalities, ['DE', 'TR'], p.slug);
    assert.equal(pid(V, 'deutsch').nationalities, undefined, p.slug);
  }
});

test('[Staatsangehörigkeit·PID·Rot-Beweis] mit der alten Abbildung `(v) => [v]` stünde wieder `["deutsch"]` in der PID', async () => {
  const alt = "  { feld: 'nationality', ziel: 'nationalities', transform: (v) => [v], rueck: (v) => Array.isArray(v) ? (v[0] || '') : v },";
  const neu = KERN.replace(/  \{ feld: 'nationality', ziel: 'nationalities', ausRohwert: true,\n    transform: \(roh, optionen\) => staatsangehoerigkeitFuerPid\(roh, optionen\),\n    rueck: \(v\) => staatsangehoerigkeitAusPid\(v\) \},/, alt);
  assert.notEqual(neu, KERN, 'die Mapping-Zeile wurde nicht gefunden — die Pflanzung beweist sonst nichts');
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'pid-alt-'));
  try {
    fs.writeFileSync(path.join(tmp, 'vivodepot.html'), neu);
    const { V } = ladeKern({ htmlPfad: path.join(tmp, 'vivodepot.html'), backen: true });
    await V.depotAnlegen('pw'); V.akteurSelbstErklaeren('Tester');
    assert.deepEqual(pid(V, 'deutsch').nationalities, ['deutsch']);
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
});

/* Befund PID-NATIONALITIES-FREITEXT, Abnahme (b): ein Wächter gegen jede Ableitung der Staatsangehörigkeit aus der Oberflächensprache.
   Die Probe ist rot, solange es ihn nicht gibt; danach hält sie ihn über den Kern und mit Rot-Beweis an einer gepflanzten Ableitung. */
test('[Staatsangehörigkeit·PID·Wächter] keine Ableitung aus der Oberflächensprache: der Wächter ist über den Kern grün und schlägt bei einer gepflanzten Ableitung an', { todo: 'Befund PID-NATIONALITIES-FREITEXT (MITTEL): der Wächter gegen die Ableitung aus der Oberflächensprache fehlt (Abnahme b); Eigentümer Rechtsraum-Strang' }, () => {
  const pfad = path.join(REPO, 'tools', 'pid-' + 'sprachableitung-pruefen.js');
  assert.ok(fs.existsSync(pfad), 'der Wächter fehlt noch');
  const W = require(pfad);
  assert.deepEqual(W.funde(KERN), [], 'der Kern leitet die Staatsangehörigkeit nicht aus der Oberflächensprache ab');
  const gepflanzt = KERN.replace('staatsangehoerigkeitFuerPid(roh, optionen)', 'staatsangehoerigkeitFuerPid(textsatzSpracheAktiv(), optionen)');
  assert.notEqual(gepflanzt, KERN, 'die Pflanzung trifft die Mapping-Zeile nicht — sie beweist sonst nichts');
  assert.ok(W.funde(gepflanzt).length > 0, 'Rot-Beweis: eine Ableitung aus der Oberflächensprache fällt');
});

/* ── 3 · alle oder keine, Sonderwerte ── */
test('[Staatsangehörigkeit·PID] Sonderwerte und Ausschlüsse nach dem PID-Rulebook v1.7 §2.2', async () => {
  const V = await depot();
  assert.deepEqual(pid(V, c('997')).nationalities, ['QS']);
  assert.deepEqual(pid(V, c('998')).nationalities, ['QU']);
  for (const [code, name] of [['150', 'kosovarisch'], ['999', 'ohne Angabe'], ['120', 'jugoslawisch'], ['459', 'Palästinensische Gebiete']]) {
    const r = pid(V, c(code));
    assert.equal(r.nationalities, undefined, code);
    assert.deepEqual(r.nicht, [{ bezeichnung: name, grund: 'kein-iso-code' }], code);
  }
});

test('[Staatsangehörigkeit·PID] alle oder keine: ein Eintrag ohne geltenden Code nimmt die ganze Angabe heraus', async () => {
  const V = await depot();
  const r = pid(V, c('000', '150'));
  assert.equal(r.nationalities, undefined);
  assert.deepEqual(r.nicht, [{ bezeichnung: 'kosovarisch', grund: 'kein-iso-code' }]);
});

test('[Staatsangehörigkeit·PID] der Rückweg bildet je Code genau einen geltenden Eintrag ab, sonst nichts', async () => {
  const V = await depot();
  const rueck = V.__zusatz.VC_IDENTITAET_MAPPING.find((m) => m.feld === 'nationality').rueck;
  assert.deepEqual(rueck(['DE', 'QS']), c('000', '997'));
  assert.equal(rueck(['XK']), '');
  assert.equal(rueck(['YU']), '');
});

/* ── 4 · Wächter ── */
const ABLEITUNG = /\b(textsprache|sprache|rechtsraum\w*|textsatzSpracheAktiv|_rechtsraumDerZusammenstellung|data)\b/i;
test('[Staatsangehörigkeit·Wächter] die Abbildung liest weder Oberflächensprache noch Rechtsraum noch Depot', () => {
  const k = funktionsKoerper(KERN, 'pidStaatsangehoerigkeiten');
  assert.ok(k && k.length > 100);
  assert.equal(ABLEITUNG.exec(k), null);
});
test('[Staatsangehörigkeit·Wächter·Rot-Beweis] eine gepflanzte Ableitung aus der Sprache wird erkannt', () => {
  const gepflanzt = KERN.replace('function pidStaatsangehoerigkeiten(werte, liste) {',
    "function pidStaatsangehoerigkeiten(werte, liste) {\n  if (!Array.isArray(werte) && textsatzSpracheAktiv() === 'de' && werte === 'deutsch') return { nationalities: ['DE'], nichtUebernommen: [] };");
  assert.match(funktionsKoerper(gepflanzt, 'pidStaatsangehoerigkeiten'), ABLEITUNG);
});

/* ── 5 · Selbst-Einlass ── */
const fremdeListe = (rr) => ({
  modulTyp: 'rechtsraum', rechtsraum: rr, moduleVersion: 9, sprache: 'de', typen: { tpl_x: { katalogVersion: 1 } },
  codeListen: [{ systemId: 'destatis-staatsangehoerigkeit', daten: [{ code: '000', anzeigeName: 'gefälscht', iso3166Alpha2: 'FR' }] }],
  felder: { 'identity.nationality': { codeListe: 'destatis-staatsangehoerigkeit', mehrfach: false } },
});
test('[Staatsangehörigkeit·Selbst-Einlass] ein eingelassenes Modul mit eigener Liste ändert weder Auswahl noch PID', async () => {
  const V = await depot();
  const vorher = V.__zusatz.rechtsraumFeldBindung('identity.nationality');
  const d = V.getData();
  d.rechtsraumModule = [fremdeListe('DE'), fremdeListe('AT')];
  V.modulEinlassen(JSON.stringify(fremdeListe('AT')), d);
  V._rechtsraumModuleAusDepotAnmelden(d);
  const nachher = V.__zusatz.rechtsraumFeldBindung('identity.nationality');
  assert.equal(nachher.liste, vorher.liste);
  assert.equal(nachher.mehrfach, true);
  assert.equal(V.__zusatz.rechtsraumListenEintrag(L, '000').anzeigeName, 'deutsch');
  assert.deepEqual(pid(V, c('000')).nationalities, ['DE']);
});
test('[Staatsangehörigkeit·Selbst-Einlass·Gegenprobe] dasselbe Modul AB WERK als einziges Rechtsraum-Modul ändert beides — die Probe sieht den Weg', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'rr-liste-at-modul-'));
  const datei = path.join(dir, 'at.json');
  fs.writeFileSync(datei, JSON.stringify(fremdeListe('AT')));
  const p = produktMitRechtsraum([datei], 'at-probe');
  try {
    const V = await depot({ htmlPfad: p.htmlPfad });
    assert.equal(V._rechtsraumDerZusammenstellung(), 'AT', 'Vorbedingung: AT ist der Rechtsraum der Zusammenstellung');
    assert.equal(V.__zusatz.rechtsraumFeldBindung('identity.nationality').mehrfach, false);
    assert.deepEqual(pid(V, c('000')).nationalities, ['FR']);
  } finally { fs.rmSync(p.tmp, { recursive: true, force: true }); fs.rmSync(dir, { recursive: true, force: true }); }
});

/* ── 6 · ohne Rechtsraum der Zusammenstellung ── */
test('[Staatsangehörigkeit·ohne Vorgabe] keine Bindung: Feld leer mit Hinweis, keine Auswahl, nichts in der PID', async () => {
  // Kein Rechtsraum-Modul ab Werk: der Rechtsraum der Zusammenstellung ist '' — kein Rückfall auf „DE“.
  const V = await depotOhneRechtsraum();
  assert.equal(V.__zusatz.rechtsraumFeldBindung('identity.nationality'), null);
  const h = zeile(V, undefined);
  assert.match(h, /data-rr-ohne-bindung/);
  assert.doesNotMatch(h, /<select|<input/);
  const r = pid(V, c('000'));
  assert.equal(r.nationalities, undefined);
  assert.deepEqual(r.nicht, [{ bezeichnung: '000', grund: 'unbekannt' }]);
});

/* ── 7 · Bestand ── */
test('[Staatsangehörigkeit·Bestand] ein alter Freitext bleibt sichtbar, wird nicht abgebildet und geht nicht in die PID', async () => {
  const V = await depot();
  const h = zeile(V, 'deutsch');
  assert.match(h, /data-rr-altwert/);
  assert.ok(h.includes('deutsch'));
  assert.doesNotMatch(h, /data-chip="/, 'kein Chip aus dem Freitext geraten');
  const r = pid(V, 'deutsch');
  assert.equal(r.nationalities, undefined);
  assert.deepEqual(r.nicht, [{ bezeichnung: 'deutsch', grund: 'altwert' }]);
});

/* ── 8 · Oberfläche ── */
test('[Staatsangehörigkeit·Oberfläche] Auswahl ohne ehemalige Staaten; ein gespeicherter ehemaliger bleibt sichtbar; kein Freitext', async () => {
  const V = await depot();
  const h = zeile(V, c('120', '000'));
  assert.doesNotMatch(h, /<option value="120">/);
  assert.doesNotMatch(h, /<option value="000">/, 'schon gewählt');
  assert.match(h, /<option value="163">/);
  assert.match(h, /jugoslawisch/);
  assert.doesNotMatch(h, /<input/);
  assert.match(h, /data-chip-liste="nationality"/);
  assert.doesNotMatch(zeile(V, c('000'), false), /<select/);
});

test('[Staatsangehörigkeit·EN] englische Oberfläche: deutsche Bezeichnung gilt, Ländername als Lesehilfe nur für geltende ISO-Codes', async () => {
  const V = await depot({ produkt: 'privat-en' });
  assert.equal(V.textsatzSpracheAktiv(), 'en');
  const t = (code) => V.__zusatz.rechtsraumCodeEintragText(V.__zusatz.rechtsraumListenEintrag(L, code), code);
  assert.equal(t('000'), 'deutsch (Germany)');
  assert.equal(t('150'), 'kosovarisch (Kosovar)');
  assert.equal(t('120'), 'jugoslawisch (Yugoslav, until 1992)');
  assert.equal(t('997'), 'staatenlos (stateless)');
  assert.equal(t('998'), 'ungeklärt (not determined)');
  assert.match(zeile(V, c('000')), /data-rr-amtlich/);
  const de = await depot();
  assert.equal(de.__zusatz.rechtsraumCodeEintragText(de.__zusatz.rechtsraumListenEintrag(L, '000'), '000'), 'deutsch');
});

/* ── 10 · Lesehilfe für jeden Eintrag jeder Codeliste des DE-Moduls (Gegenlesung, 04.10.2026) ──
   Regel: in einem Nicht-de-Produkt trägt jeder Eintrag mit Buchstaben eine Lesehilfe in Klammern. „Reine Zeichen“ (kein
   Buchstabe, \p{L}) brauchen keine. Gemessen über ALLE codeListen des DE-Moduls, in jedem englischen Produkt. */
const REINE_ZEICHEN = (name) => !/\p{L}/u.test(name);
function lesehilfeFunde(V, listen) {
  const funde = [];
  for (const l of listen) {
    for (const e of l.daten) {
      const text = V.__zusatz.rechtsraumCodeEintragText(e, e.code);
      if (REINE_ZEICHEN(e.anzeigeName)) { if (text !== e.anzeigeName) funde.push(l.systemId + '/' + e.code + ': reine Zeichen mit Zusatz'); continue; }
      if (!(text.startsWith(e.anzeigeName + ' (') && text.endsWith(')'))) funde.push(l.systemId + '/' + e.code + ' „' + e.anzeigeName + '“: ohne Lesehilfe');
    }
  }
  return funde;
}
const DE_MODUL_LISTEN = () => JSON.parse(fs.readFileSync(path.join(REPO, 'tools', 'rechtsraum-de-modul.json'), 'utf8')).codeListen;

test('[Staatsangehörigkeit·Lesehilfe] jeder Eintrag jeder Codeliste des DE-Moduls trägt in jedem englischen Produkt eine Lesehilfe', async () => {
  const listen = DE_MODUL_LISTEN();
  assert.ok(listen.length >= 1);
  for (const p of PRODUKTE.filter((x) => x.sprache !== 'de')) {
    const V = await depot({ produkt: p.slug });
    assert.deepEqual(lesehilfeFunde(V, listen), [], p.slug);
  }
});

test('[Staatsangehörigkeit·Lesehilfe·Rot-Beweis] ein Eintrag ohne Schlüssel und ohne geltenden ISO-Code ist rot; reine Zeichen nur ohne Buchstaben', async () => {
  const V = await depot({ produkt: 'privat-en' });
  const kunst = [{ systemId: 'probe', daten: [
    { code: '1', anzeigeName: 'jugoslawisch', iso3166Alpha2: 'YU', gueltigBis: '1992-04-26' },
    { code: '2', anzeigeName: '–' },
    { code: '3', anzeigeName: 'x' },
  ] }];
  assert.deepEqual(lesehilfeFunde(V, kunst), ['probe/1 „jugoslawisch“: ohne Lesehilfe', 'probe/3 „x“: ohne Lesehilfe']);
});

function cldrFunde(V, listen) {
  const funde = [];
  const name = (iso) => { try { return new Intl.DisplayNames(['en'], { type: 'region' }).of(iso); } catch (_) { return null; } };
  for (const l of listen) for (const e of l.daten) {
    if (!e.gueltigBis || !e.iso3166Alpha2) continue;
    const text = V.__zusatz.rechtsraumCodeEintragText(e, e.code);
    const cldr = name(e.iso3166Alpha2);
    if (cldr && text === e.anzeigeName + ' (' + cldr + ')') funde.push(l.systemId + '/' + e.code + ': CLDR-Name „' + cldr + '“');
  }
  return funde;
}
test('[Staatsangehörigkeit·Lesehilfe] ehemalige Staaten tragen nie den CLDR-Namen ihres Codes (YU ist nicht „Serbia“)', async () => {
  const V = await depot({ produkt: 'privat-en' });
  assert.deepEqual(cldrFunde(V, DE_MODUL_LISTEN()), []);
});
test('[Staatsangehörigkeit·Lesehilfe·Rot-Beweis] ohne Schlüssel des Templates bekäme ein ehemaliger Staat den CLDR-Namen — die Probe sieht das', async () => {
  const V = await depot({ produkt: 'privat-en' });
  const L0 = DE_MODUL_LISTEN()[0];
  const ohneSchluessel = [{ systemId: L0.systemId, daten: L0.daten.filter((e) => e.gueltigBis).map((e) => { const k = Object.assign({}, e); delete k.lesehilfeSchluessel; delete k.gueltigBis; return Object.assign(k, { gueltigBis: undefined }); }) }];
  // Rot: ohne gueltigBis und ohne Schlüssel greift CLDR; mit wiederhergestelltem gueltigBis zeigt der Prüfer den Fund.
  const gepflanzt = ohneSchluessel[0].daten.map((e, i) => ({ ...e, gueltigBis: L0.daten.filter((x) => x.gueltigBis)[i].gueltigBis }));
  const pflanzText = (e) => e.anzeigeName + ' (' + new Intl.DisplayNames(['en'], { type: 'region' }).of(e.iso3166Alpha2) + ')';
  const Vfalsch = { __zusatz: { rechtsraumCodeEintragText: (e) => pflanzText(e) } };
  assert.ok(cldrFunde(Vfalsch, [{ systemId: L0.systemId, daten: gepflanzt }]).some((f) => f.includes('„Serbia“')));
});

test('[Staatsangehörigkeit·Lesehilfe·Rot-Beweis] ein Schlüssel ohne Text wird nie roh gezeigt — es gilt die nächste Stufe', async () => {
  const V = await depot({ produkt: 'privat-en' });
  const t = V.__zusatz.rechtsraumCodeEintragText;
  // geltender ISO-Code: weiter zu CLDR
  assert.equal(t({ code: 'x', anzeigeName: 'deutsch', iso3166Alpha2: 'DE', lesehilfeSchluessel: 'gibtEsNichtLesehilfe' }, 'x'), 'deutsch (Germany)');
  // ehemaliger Staat: keine Hilfe statt des Schlüssels oder des CLDR-Namens
  assert.equal(t({ code: 'y', anzeigeName: 'jugoslawisch', iso3166Alpha2: 'YU', gueltigBis: '1992-04-26', lesehilfeSchluessel: 'gibtEsNichtLesehilfe' }, 'y'), 'jugoslawisch');
});

/* ── Ausgabewege mit gespeicherten Codes (06.10.2026) ── Seit Schema 93 ist der Wert [{liste, code}]. Kein Ausgabeweg darf das
   rohe Array oder „[object Object]“ ausgeben; der Erbschein-Auszug trägt die amtliche Bezeichnung, ein Altwert bleibt wörtlich.
   Gefunden, als _erbscheinSektorDaten den Rohwert durchreichte. */
const ROH_SPUR = /\[object Object\]|"liste":"destatis-staatsangehoerigkeit"/;
async function ausgabenMitCodes(produkt, htmlPfad) {
  const V = await depot({ produkt, ...(htmlPfad ? { htmlPfad } : {}) });
  V.sektorFeldSetzen('identity', 'nationality', c('000', '163'));
  const aus = { erbschein: V.erbscheinAuszugXML() };
  for (const def of V.EXPORT_FORMATE) {
    if (def.id === 'json') continue;   // die Depot-Datei selbst trägt den Rohwert zu Recht
    const t = def.baue({ sensibel: true });
    aus[def.id] = typeof t === 'string' ? t : JSON.stringify(t);
  }
  return aus;
}
test('[Staatsangehörigkeit·Ausgabewege] in allen vier Produkten gibt kein Weg das rohe Array aus; der Erbschein trägt die Bezeichnung', async () => {
  for (const p of PRODUKTE) {
    const aus = await ausgabenMitCodes(p.slug);
    for (const [weg, text] of Object.entries(aus)) assert.doesNotMatch(text, ROH_SPUR, p.slug + ' · ' + weg);
    assert.match(aus.erbschein, /<staatsangehoerigkeit erfasst="ja">deutsch, türkisch<\/staatsangehoerigkeit>/, p.slug);
  }
  const V = await depot();
  V.sektorFeldSetzen('identity', 'nationality', 'deutsch');
  assert.match(V.erbscheinAuszugXML(), /<staatsangehoerigkeit erfasst="ja">deutsch<\/staatsangehoerigkeit>/, 'ein Altwert bleibt wörtlich');
});
test('[Staatsangehörigkeit·Ausgabewege·Rot-Beweis] mit dem alten Durchreichen stünde „[object Object]“ im Erbschein-Auszug', async () => {
  const neu = /  \/\* U2-ADR-482: seit Schema 93 ist der Wert \[\{liste, code\}\]\. In den Auszug[\s\S]*?else if \(typeof id\.nationality === 'string' && id\.nationality\.trim\(\)\) out\.staatsangehoerigkeit = id\.nationality;\n/;
  assert.ok(neu.test(KERN), 'Vorbedingung: die Stelle steht im Kern');
  const pfad = path.join(os.tmpdir(), 'staatsangehoerigkeit-erbschein-rot-' + process.pid + '.html');
  fs.writeFileSync(pfad, KERN.replace(neu, '  if (id.nationality) out.staatsangehoerigkeit = id.nationality;\n'));
  try {
    const aus = await ausgabenMitCodes('privat-de', pfad);
    assert.match(aus.erbschein, /\[object Object\]/, 'die Probe oben sähe den alten Fehler');
  } finally { fs.rmSync(pfad, { force: true }); }
});

/* ── Import mit Schlüsseln: XMeld (06.10.2026, Wort der Gegenlesung) ── XMeld führt die Staatsangehörigkeit als DESTATIS-Schlüssel (Element
   `code`), eine Person auch mit mehreren. Steht jeder Schlüssel in der gebundenen Liste, wird daraus [{liste, code}]; sonst bleibt
   der Text ein Altwert (lesbar, nie PID). Geraten wird nie, auch nicht über die Bezeichnung. Ein B16-Altfeld bleibt Altwert
   (Schema-93-Linie). Ein Import-Altwert ist kein Eingabeweg: die Oberfläche zeichnet das Feld nur als Auswahl (Abschnitt 8). */
const XMELD = fs.readFileSync(path.join(REPO, 'tests', 'fixtures', 'xmeld.example.xml'), 'utf8');
const XMELD_SA = '<xmeld:staatsangehoerigkeit>deutsch</xmeld:staatsangehoerigkeit>';
const xmeldMit = (ersatz) => { assert.ok(XMELD.includes(XMELD_SA), 'Vorbedingung: die Fixture trägt die Zeile'); return XMELD.replace(XMELD_SA, ersatz); };
const saCode = (code) => '<xmeld:staatsangehoerigkeit><xmeld:code listURI="urn:de:bund:destatis:bevoelkerungsstatistik:schluessel:staatsangehoerigkeit">' + code + '</xmeld:code></xmeld:staatsangehoerigkeit>';
function xmeldEinlesen(V, xml) {
  V.kernAPI.importiere('xmeld', xml, { alleKonflikte: true });
  return (V.getData().sektoren.identity || {}).nationality;
}
// Was ein Import mit Schlüsseln liefern muss — als Prüfer, damit der Rot-Beweis ihn gegen eine falsche Fassung stellen kann.
async function xmeldFunde(V) {
  const funde = [];
  const fall = (name, xml, erwartet) => {
    V.sektorFeldSetzen('identity', 'nationality', '');   // kein Rest aus dem vorigen Fall
    const ist = xmeldEinlesen(V, xml);
    if (JSON.stringify(ist) !== JSON.stringify(erwartet)) funde.push(name + ': ' + JSON.stringify(ist));
  };
  fall('code-Kind', xmeldMit(saCode('000')), c('000'));
  fall('Schlüssel als Text', xmeldMit('<xmeld:staatsangehoerigkeit>163</xmeld:staatsangehoerigkeit>'), c('163'));
  fall('zwei Schlüssel', xmeldMit(saCode('000') + saCode('163')), c('000', '163'));
  fall('Text nicht in der Liste', xmeldMit(XMELD_SA), 'deutsch');
  fall('ein Schlüssel fehlt in der Liste', xmeldMit(saCode('000') + saCode('XYZ')), '000, XYZ');
  return funde;
}
test('[Staatsangehörigkeit·XMeld] in allen vier Produkten wird ein Schlüssel der Liste ein Code; Text bleibt Altwert und geht nie in die PID', async () => {
  for (const p of PRODUKTE) {
    const V = await depot({ produkt: p.slug });
    assert.deepEqual(await xmeldFunde(V), [], p.slug);
    xmeldEinlesen(V, xmeldMit(XMELD_SA));
    const vc = V.sdJwtVcIdentitaet({ sensibel: true });
    assert.equal(vc.claims.nationalities, undefined, p.slug + ': der Altwert ist in der PID');
  }
});
test('[Staatsangehörigkeit·XMeld] ohne Rechtsraum der Zusammenstellung bleibt auch ein Schlüssel Altwert — nichts wird geraten', async () => {
  const V = await depotOhneRechtsraum();
  assert.equal(V.__zusatz.rechtsraumFeldBindung('identity.nationality'), null, 'Vorbedingung: keine Bindung');
  assert.equal(xmeldEinlesen(V, xmeldMit(saCode('000'))), '000');
});
test('[Staatsangehörigkeit·XMeld·Rot-Beweis] Raten über die Bezeichnung und der alte Leser fielen der Probe auf', async () => {
  const stelle = "if (b.liste.daten.filter((e) => e.code === c).length === 1)";
  const leser = "  const nationalitaet = _xAlleTief(person, 'staatsangehoerigkeit').concat(_xAlleTief(person, 'staatsangehörigkeit'))\n    .map((n) => _xTextPfad(n, 'code') || _xText(n)).filter(Boolean);\n";
  assert.ok(KERN.includes(stelle) && KERN.includes(leser), 'Vorbedingung: beide Stellen stehen im Kern');
  for (const [name, neu, erwartet] of [
    ['Raten über die Bezeichnung', KERN.replace(stelle, "if (b.liste.daten.filter((e) => e.code === c || e.anzeigeName === c).length === 1)"), ['Text nicht in der Liste']],
    ['alter Leser (nur der Text des ersten Elements)', KERN.replace(leser, "  const nationalitaet = _xText(_xTief(person, 'staatsangehoerigkeit')) || _xText(_xTief(person, 'staatsangehörigkeit'));\n"),
      ['code-Kind', 'zwei Schlüssel', 'ein Schlüssel fehlt in der Liste']],
  ]) {
    const pfad = path.join(os.tmpdir(), 'staatsangehoerigkeit-xmeld-rot-' + process.pid + '.html');
    fs.writeFileSync(pfad, neu);
    try {
      const V = await depot({ produkt: 'privat-de', htmlPfad: pfad, backen: true });
      // Genau die erwarteten Fälle fallen; fielen alle, bewiese die Pflanzung nichts.
      assert.deepEqual((await xmeldFunde(V)).map((f) => f.slice(0, f.indexOf(':'))), erwartet, name);
    } finally { fs.rmSync(pfad, { force: true }); }
  }
});
// Ein B16-Altfeld (Beta-Depot) bleibt Altwert, auch wenn es wie ein Schlüssel aussieht: die Schema-93-Linie bildet nie ab.
const b16Funde = (V) => ['000', 'deutsch'].filter((w) => {
  const e = V._b16Felder({ data: { nationalitaet: w, vorname: 'Anna' } }).felder.find((x) => x.feldId === 'nationality');
  return !e || e.wert !== w;
});
test('[Staatsangehörigkeit·B16] ein Altfeld bleibt wörtlicher Altwert, in allen vier Produkten', async () => {
  for (const p of PRODUKTE) assert.deepEqual(b16Funde(await depot({ produkt: p.slug })), [], p.slug);
});
test('[Staatsangehörigkeit·B16·Rot-Beweis] eine B16-Abbildung auf den Code fiele der Probe auf', async () => {
  const V = await depot({ produkt: 'privat-de' });
  const gepflanzt = { _b16Felder: (parsed) => {
    const r = V._b16Felder(parsed);
    return { ...r, felder: r.felder.map((e) => (e.feldId === 'nationality' && e.wert === '000') ? { ...e, wert: c('000') } : e) };
  } };
  assert.deepEqual(b16Funde(gepflanzt), ['000']);
});

/* ── Kein Freitext-Eingabeweg (06.10.2026, Bedingung der Gegenlesung zu Posten 1) ── In allen vier Produkten zeichnet die Bereichsansicht das
   Feld als Auswahl aus der gebundenen Liste, ohne Textfeld und ohne Vorschlagsliste. Ein eingelassener Assistent, der das Feld
   abfragt, würde es mit feldInputHTML als Freitext zeichnen — er wird benannt verworfen. Ein Import-Altwert ist kein Eingabeweg
   (Schema-93-Linie, Abschnitt 7). */
function nationalitaetZeile(V, document) {
  V.renderSektor('identity');
  const html = document.getElementById('content').innerHTML;
  const i = html.indexOf('data-feld="nationality"');
  assert.ok(i >= 0, 'die Zeile fehlt in der Bereichsansicht');
  return html.slice(i, html.indexOf('data-feld=', i + 10) > 0 ? html.indexOf('data-feld=', i + 10) : i + 4000);
}
test('[Staatsangehörigkeit·Eingabeweg] in allen vier Produkten zeichnet die Bereichsansicht das Feld als Codefeld, ohne Freitext', async () => {
  for (const p of PRODUKTE) {
    const { V, document } = ladeKern({ produkt: p.slug, zusatzBindungen: Z });
    await V.depotAnlegen('pw'); V.akteurSelbstErklaeren('Tester');
    // Pro bietet die Staatsangehörigkeit seit Pro P2 nicht an (ruhendes Feld, U2-ADR-421 §8); mit einem Wert in der Datei steht sie da
    // und muss dann ebenso ein Codefeld sein.
    if (p.slug.startsWith('pro-')) V.sektorFeldSetzen('identity', 'nationality', c('000'));
    const h = nationalitaetZeile(V, document);
    assert.match(h, /data-rr-liste="destatis-staatsangehoerigkeit"/, p.slug);
    assert.doesNotMatch(h, /<input|<textarea|<datalist/, p.slug);
    assert.equal(V.feldDefFuer('identity', 'nationality').vorschlaege, undefined, p.slug);
  }
});
const assistent = (schrittZiel) => ({
  modulTyp: 'wizard', moduleVersion: 1, herkunft: 'fremd', sprache: 'de',
  wizards: { sawiz: { titel: 'Staatsangehörigkeit', ziel: { sektor: 'identity' },
    schritte: [{ feld: { id: 'nationality', typ: 'text' }, frage: 'Welche?', ...(schrittZiel ? { ziel: schrittZiel } : {}) }] } },
});
test('[Staatsangehörigkeit·Eingabeweg] ein eingelassener Assistent, der das Codefeld abfragt, wird benannt verworfen', async () => {
  const V = await depot({ produkt: 'privat-de' });
  for (const m of [assistent(), assistent({ sektor: 'identity' })]) {
    const g = V.wizardsModulPruefen(m);
    assert.equal(g.gueltig, false);
    assert.ok(g.verworfene.some((v) => v.id === 'sawiz' && v.grund === 'codefeld'), JSON.stringify(g.verworfene));
  }
  const gegen = assistent(); gegen.wizards.sawiz.schritte[0].feld.id = 'birthPlace';
  assert.equal(V.wizardsModulPruefen(gegen).gueltig, true, 'Gegenprobe: ein Textfeld bleibt erlaubt');
});
test('[Staatsangehörigkeit·Eingabeweg·Rot-Beweis] ohne die Weiche nähme der Einlass den Assistenten an', async () => {
  const stelle = "if (_sz && typeof _sz.sektor === 'string' && !_sz.liste && rechtsraumCodefeld(_sz.sektor, s.feld.id)) {";
  assert.ok(KERN.includes(stelle), 'Vorbedingung: die Weiche steht im Kern');
  const pfad = path.join(os.tmpdir(), 'staatsangehoerigkeit-wizard-rot-' + process.pid + '.html');
  fs.writeFileSync(pfad, KERN.replace(stelle, 'if (false) {'));
  try {
    const V = await depot({ produkt: 'privat-de', htmlPfad: pfad, backen: true });
    assert.equal(V.wizardsModulPruefen(assistent()).gueltig, true);
  } finally { fs.rmSync(pfad, { force: true }); }
});

/* ── Lese-App (06.10.2026, Befund LESE-APP-CODEWERT, Wort der Gegenlesung) ── Die Lese-App zeigte einen gespeicherten Code [{liste, code}] als
   „[object Object]“ (Rückfall String(roh) in feldWertText), sobald die Bürgerin das Feld freigegeben hatte. Gehalten wird:
     (a) Klasse: KEIN Feld der Lese-App zeigt einen Code-Wert (einzeln oder als Liste) roh — nicht nur die Codefelder des Kerns
     (b) die Bezeichnung kommt aus dem Modul, das das Depot trägt, und wird escaped (fremder Inhalt)
     (c) ohne Freigabe bleibt das Feld zurückgehalten; der Code fließt in keinen Ausgabeweg
     (d) gemessen: das volle Depot trägt die Liste in der Mitschrift; der Vollexport hält die Mitschrift immer zurück (U2-ADR-398),
         beim Empfänger eines Exports ist „<code> (<liste>)“ darum der Normalfall, kein Fehler. */
const { ladeLesen } = require('./load-lesen.js');
const LESEN = fs.readFileSync(path.join(REPO, 'vivodepot-lesen.html'), 'utf8');
const CODEFELDER = JSON.parse(/const RECHTSRAUM_CODEFELDER = Object\.freeze\((\[[^\]]*\])\)/.exec(KERN)[1].replace(/'/g, '"'));
function leseDepot(V, sektoren, extra) {
  V.setData(Object.assign({ schemaVersion: 93, menschen: [], urheberschaft: {}, mappe: [], sektoren, sensibelFelder: {} }, extra || {}));
}
function leseRohFunde(V) {
  const funde = [];
  for (const wert of [{ liste: L, code: '163' }, c('000', '163')]) {
    for (const s of V.SEKTOREN) for (const sek of s.sektionen || []) for (const f of sek.felder || []) {
      const t = String(V.feldWertText(f, wert, s.id));
      if (ROH_SPUR.test(t)) funde.push(s.id + '.' + f.id + ': ' + t);
    }
  }
  return funde;
}
test('[Staatsangehörigkeit·Lese-App] (a) kein Feld der Lese-App zeigt einen Code-Wert roh; die Codefelder des Kerns sind darunter', () => {
  const { V } = ladeLesen();
  leseDepot(V, {});
  assert.ok(CODEFELDER.length >= 1);
  for (const k of CODEFELDER) {
    const [s, f] = k.split('.');
    assert.ok(V.SEKTOR_BY_ID[s] && V.SEKTOR_BY_ID[s].sektionen.some((x) => (x.felder || []).some((y) => y.id === f)), k + ' fehlt in der Lese-App');
  }
  assert.deepEqual(leseRohFunde(V), []);
});
test('[Staatsangehörigkeit·Lese-App·Rot-Beweis] ohne den Code-Zweig fiele jedes Textfeld in „[object Object]“', () => {
  const zweig = "  if (rechtsraumCodeWertIstLesen(roh)) return rechtsraumCodeWertTextLesen(roh);   // U2-ADR-482, Befund LESE-APP-CODEWERT\n";
  assert.ok(LESEN.includes(zweig), 'Vorbedingung: der Zweig steht in der Lese-App');
  const { V } = ladeLesen({ html: LESEN.replace(zweig, '') });
  leseDepot(V, {});
  assert.ok(leseRohFunde(V).some((f) => f.startsWith('identity.nationality: [object Object]')));
});
const mitschriftMit = (daten) => ({ abWerkMitschrift: { rechtsraumModule: [{ modulTyp: 'rechtsraum', rechtsraum: 'DE', moduleVersion: 1,
  codeListen: [{ systemId: L, daten }] }] } });
test('[Staatsangehörigkeit·Lese-App] (b) freigegeben: Bezeichnung aus der Mitschrift, escaped; ohne Liste der Code mit Liste', () => {
  const { V } = ladeLesen();
  const frei = { sensibelFelder: { identity: { nationality: false } } };
  leseDepot(V, { identity: { nationality: c('000', '163') } }, Object.assign({}, frei, mitschriftMit([
    { code: '000', anzeigeName: 'deutsch' }, { code: '163', anzeigeName: '<img src=x onerror=alert(1)>' }])));
  const h = V.sektorHTML('identity');
  assert.match(h, /deutsch, &lt;img src=x onerror=alert\(1\)&gt;/);
  assert.doesNotMatch(h, /<img src=x/);
  leseDepot(V, { identity: { nationality: c('163') } }, frei);
  assert.match(V.sektorHTML('identity'), />163 \(destatis-staatsangehoerigkeit\)</, 'ohne Liste im Depot: Code mit Liste, nie roh');
});
test('[Staatsangehörigkeit·Lese-App] (c) ohne Freigabe zurückgehalten: der Code fließt in keinen Ausgabeweg', () => {
  const { V } = ladeLesen();
  leseDepot(V, { identity: { givenName: 'Erika', nationality: c('163') } }, mitschriftMit([{ code: '163', anzeigeName: 'türkisch' }]));
  const aus = [];
  for (const s of V.SEKTOREN) aus.push(V.sektorHTML(s.id));
  for (const s of V.SITUATIONEN) aus.push(JSON.stringify(V.situationModell(s.id)));
  aus.push(JSON.stringify(V.notfallKernModell()));
  const alles = aus.join('\n');
  assert.match(alles, /Hinterlegt, nur mit Freigabe sichtbar/, 'Vorbedingung: das Feld steht zurückgehalten in der Ansicht');
  assert.doesNotMatch(alles, /türkisch|"163"|>163|destatis-staatsangehoerigkeit|\[object Object\]/);
});
