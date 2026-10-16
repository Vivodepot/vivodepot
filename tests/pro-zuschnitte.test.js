'use strict';
/* Pro mit Berufsmodul ab Werk: die Zuschnitte (U2-ADR-489, 12.10.2026)
   Die Kundin wählt ihr Berufsmodul beim Kauf; geliefert wird ein Pro, das dieses Modul im Rezept trägt. Diese Probe hält die
   Liste der Zuschnitte: je Berufsmodul und Sprache einer, mit einer Kennung, die an jeder Stelle dieselbe ist und als
   DNS-Name taugt; die vier Grundprodukte bleiben vier. Gebaut und geöffnet wird ein Zuschnitt in
   tests/pro-berufsmodul-ab-werk-sperre.test.js (dort mit demselben Konfektionierer). */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const VP = require('../tools/lib/vier-produkte.js');

const dateienImBestand = fs.readdirSync(VP.BERUFSMODUL_VERZEICHNIS).filter((n) => n.endsWith('.json'));

test('[Pro·Zuschnitt] jedes Berufsmodul im Bestand ergibt je Sprache genau einen Zuschnitt, und jede Moduldatei gehört zu einem', () => {
  const berufe = VP.berufsmoduleImBestand();
  assert.ok(berufe.length >= 2, 'Vorbedingung: Steuerberatung und Kanzlei liegen im Bestand');
  const pro = VP.PRODUKTE.filter((p) => p.proModulPfad);
  assert.deepEqual(VP.PRODUKT_ZUSCHNITTE.map((z) => z.slug).sort(), berufe.flatMap((b) => pro.map((p) => p.slug + '-' + b)).sort());
  const benutzt = new Set(VP.PRODUKT_ZUSCHNITTE.flatMap((z) => z.berufsmodulPfade.map((p) => path.basename(p))));
  assert.deepEqual(dateienImBestand.filter((n) => !benutzt.has(n)), [], 'eine Moduldatei ohne Zuschnitt: sie würde nie ausgeliefert');
});
test('[Pro·Zuschnitt] die Kennung hat die Form <produkt>-<sprache>-<zuschnitt>, taugt als DNS-Name und fällt mit keinem Grundprodukt zusammen', () => {
  const grund = new Set(VP.PRODUKTE.map((p) => p.slug));
  for (const z of VP.PRODUKT_ZUSCHNITTE) {
    assert.match(z.slug, VP.ZUSCHNITT_KENNUNG, z.slug);
    assert.ok(z.slug.length <= 63, z.slug);
    assert.equal(z.slug, z.basis + '-' + z.zuschnitt);
    assert.ok(grund.has(z.basis) && !grund.has(z.slug), z.slug);
    assert.doesNotMatch(z.zuschnitt, /^(de|en|at|ch|eu)$|-(de|en|at|ch)$/, z.slug + ': der Zuschnitt nennt den Beruf, kein Land und keine Sprache');
  }
  assert.equal(new Set(VP.PRODUKT_ZUSCHNITTE.map((z) => z.slug)).size, VP.PRODUKT_ZUSCHNITTE.length, 'keine Kennung doppelt');
});
test('[Pro·Zuschnitt] die Grundprodukte bleiben vier; ein Zuschnitt ist sein Grundprodukt plus genau die zwei Dateien des Berufsmoduls', () => {
  assert.equal(VP.PRODUKTE.length, 4);
  for (const z of VP.PRODUKT_ZUSCHNITTE) {
    const basis = VP.PRODUKTE.find((p) => p.slug === z.basis);
    const mehr = VP.modulDateienFuer(z).filter((d) => !VP.modulDateienFuer(basis).includes(d));
    assert.deepEqual(mehr.map((d) => path.basename(d)).sort(),
      ['bereich', 'logikmodul'].map((t) => 'vivodepot-pro-' + z.zuschnitt + '-' + t + '-' + z.sprache + '.json').sort(), z.slug);
    assert.equal(VP.modulDateienFuer(z).length, VP.modulDateienFuer(basis).length + 2, z.slug);
    for (const d of VP.modulDateienFuer(z)) assert.ok(fs.existsSync(d), z.slug + ': ' + path.basename(d));
    assert.equal(z.sprache, basis.sprache);
    for (const d of z.berufsmodulPfade) assert.ok(['bereich', 'logikModul'].includes(JSON.parse(fs.readFileSync(d, 'utf8')).modulTyp), path.basename(d) + ': Bereich oder Auszug');
  }
});
test('[Pro·Zuschnitt·Rezeptkopf] ohne eigene Artikelnummer gibt es keinen Rezeptkopf; mit ihr trägt er Zugangsart und Namen des Grundprodukts', () => {
  const z = VP.PRODUKT_ZUSCHNITTE.find((x) => x.slug === 'pro-de-kanzlei');
  assert.equal(VP.zuschnittRezeptKopf(z, {}), null, 'lieber kein Rezept als eines mit der Nummer eines anderen Artikels');
  assert.equal(VP.zuschnittRezeptKopf(z, { 'pro-de-kanzlei': '36' }), null, 'eine Nummer als Text zählt nicht');
  const kopf = VP.zuschnittRezeptKopf(z, { 'pro-de-kanzlei': 9001 });
  assert.equal(kopf.zugangsart, 'verkauft');
  assert.equal(kopf.odooProduktVorlageId, 9001);
  assert.match(kopf.anzeigename.de, /^VD Pro — Deutsch · Kanzlei$/);
  for (const [slug, nr] of Object.entries(VP.ZUSCHNITT_ODOO_PRODUKT_VORLAGE)) {
    assert.ok(VP.PRODUKT_ZUSCHNITTE.some((x) => x.slug === slug), slug + ': Artikelnummer für einen Zuschnitt, den es nicht gibt');
    assert.ok(Number.isInteger(nr) && !Object.values(VP.REZEPT_KOEPFE).some((k) => k.odooProduktVorlageId === nr), slug + ': eigener Artikel, nicht der eines Grundprodukts');
  }
  const nummern = Object.values(VP.ZUSCHNITT_ODOO_PRODUKT_VORLAGE);
  assert.equal(new Set(nummern).size, nummern.length, 'jeder Zuschnitt hat seinen eigenen Artikel');
});
test('[Pro·Zuschnitt·Rot-Beweis] ein Berufsmodul mit nur einem Teil ergibt keinen Zuschnitt; eine Kennung, die kein DNS-Name ist, bricht den Bau', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pro-zuschnitt-probe-'));
  try {
    fs.writeFileSync(path.join(dir, 'vivodepot-pro-halb-bereich-de.json'), '{}');
    assert.deepEqual(VP.zuschnitteAus(dir).map((z) => z.slug), [], 'ohne Auszug kein Zuschnitt');
    fs.writeFileSync(path.join(dir, 'vivodepot-pro-halb-logikmodul-de.json'), '{}');
    assert.deepEqual(VP.zuschnitteAus(dir).map((z) => z.slug), ['pro-de-halb'], 'beide Teile in einer Sprache: ein Zuschnitt, in der anderen Sprache keiner');
    const lang = 'x'.repeat(60);
    fs.writeFileSync(path.join(dir, 'vivodepot-pro-' + lang + '-bereich-de.json'), '{}');
    fs.writeFileSync(path.join(dir, 'vivodepot-pro-' + lang + '-logikmodul-de.json'), '{}');
    assert.throws(() => VP.zuschnitteAus(dir), /DNS-Namens/);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

/* Die Abdrücke der Berufsmodule stehen NICHT in der gemeinsamen Liste des Kerns (12.10.2026). Diese Liste gilt für jedes
   Produkt: stünde ein Berufsmodul darin, gälte es als Datei in einem gewöhnlichen Pro oder Privat als ab Werk, und die Sperre
   ließe das gekaufte Modul ohne Kauf durch. Ein Zuschnitt erkennt sein Modul über die eigene Saat des Produkts
   (tests/pro-berufsmodul-ab-werk-sperre.test.js); in einem Produkt ohne dieses Modul bleibt es gesperrt
   (tests/pro-berufsmodule.test.js). */
const { fingerabdruck, rezeptDateien } = require('../tools/rezept-fingerabdruecke-erheben.js');
const abdruckVon = (datei) => fingerabdruck(JSON.parse(fs.readFileSync(datei, 'utf8')));
// Welche dieser Moduldateien stehen mit ihrem Abdruck in einem Text (Kern oder Lese-App)?
const imText = (text, dateien) => dateien.filter((d) => text.includes(abdruckVon(d))).map((d) => path.basename(d));
const KERN_TEXT = fs.readFileSync(path.join(__dirname, '..', 'vivodepot.html'), 'utf8');
const LESE_TEXT = fs.readFileSync(path.join(__dirname, '..', 'vivodepot-lesen.html'), 'utf8');
const BERUFSDATEIEN = VP.PRODUKT_ZUSCHNITTE.flatMap((z) => z.berufsmodulPfade);

test('[Pro·Zuschnitt·Sperre·Positivkontrolle] für die Moduldateien, die die Erhebung liest, steht genau dieser gerechnete Abdruck im Kern und in der Lese-App', () => {
  assert.match(KERN_TEXT, /REZEPT_FINGERABDRUECKE_KERN = new Set\(\[/, 'Vorbedingung: die Liste steht im Kern');
  const erhoben = rezeptDateien().filter((f) => f.endsWith('.json'));
  assert.ok(erhoben.length >= 20, 'Vorbedingung: die Erhebung liest die Moduldateien der Grundprodukte');
  // Ohne diese Kontrolle wäre „kein Abdruck im Kern“ auch dann wahr, wenn der Abdruck hier falsch gerechnet würde.
  assert.deepEqual(erhoben.filter((d) => !KERN_TEXT.includes(abdruckVon(d))).map((d) => path.basename(d)), [], 'jede erhobene Datei steht mit diesem Abdruck im Kern');
  assert.deepEqual(erhoben.filter((d) => !LESE_TEXT.includes(abdruckVon(d))).map((d) => path.basename(d)), [], 'und in der Lese-App');
});
test('[Pro·Zuschnitt·Sperre] kein Abdruck eines Berufsmoduls steht in der gemeinsamen Abdruck-Liste des Kerns oder der Lese-App', () => {
  assert.ok(BERUFSDATEIEN.length >= 8, 'Vorbedingung: acht Moduldateien');
  for (const d of BERUFSDATEIEN) assert.match(abdruckVon(d), /^[a-f0-9]{64}$/);
  assert.deepEqual(imText(KERN_TEXT, BERUFSDATEIEN), [], 'Abdruck eines Berufsmoduls im Kern');
  assert.deepEqual(imText(LESE_TEXT, BERUFSDATEIEN), [], 'Abdruck eines Berufsmoduls in der Lese-App');
  const erhoben = new Set(rezeptDateien().map((f) => path.resolve(f)));
  assert.deepEqual(BERUFSDATEIEN.filter((d) => erhoben.has(path.resolve(d))).map((d) => path.basename(d)), [], 'die Erhebung der gemeinsamen Liste liest ein Berufsmodul');
});
test('[Pro·Zuschnitt·Sperre·Rot-Beweis] ein Kern, in dessen Liste der Abdruck eines Berufsmoduls steht, wird gefunden', () => {
  const eines = BERUFSDATEIEN[0];
  const marke = 'const REZEPT_FINGERABDRUECKE_KERN = new Set([';
  assert.ok(KERN_TEXT.includes(marke), 'Vorbedingung: die Stelle der Liste');
  const kernMitAbdruck = KERN_TEXT.replace(marke, marke + '\n  "sha256:' + abdruckVon(eines) + '",');
  assert.notEqual(kernMitAbdruck, KERN_TEXT);
  assert.deepEqual(imText(kernMitAbdruck, BERUFSDATEIEN), [path.basename(eines)], 'derselbe Vergleich wie oben ist an diesem Kern rot');
  assert.deepEqual(imText(KERN_TEXT, BERUFSDATEIEN), [], 'und am echten Kern grün');
});

/* KLASSE (12.10.2026): jede Stelle der Auslieferungskette nimmt die Produkte aus EINER Stelle, `auslieferbareProdukte()`.
   Der Fall dahinter: mit eingetragenen Artikelnummern baute die Auslieferung acht Produkte, der Release-Lauf listete und
   prüfte aber nur vier Rezepte, weil er noch über die vier Grundprodukte lief. Wer in einem dieser Werkzeuge wieder
   `PRODUKTE` liest, lässt die Zuschnitte still aus. Benannte Ausnahmen mit Grund; eine Ausnahme ohne Fundstelle fällt auf. */
const KETTE = Object.freeze(['kern-ausliefern.js', 'rezepte-signieren.js', 'ablage-pruefen.js', 'auslieferung-je-version-lauf.js', 'release.js',
  'rezepte-pruefen.js', 'fassungen-register.js', 'register-ausliefern.js', 'rezepte-schnitt-kern-heben.js', 'rezept-fingerabdruecke-erheben.js']);
const NUR_GRUNDPRODUKTE = Object.freeze({
  'rezepte-schnitt-kern-heben.js': 'hebt die eingefrorenen Rezept-Fixtures der vier Grundprodukte; ein Zuschnitt hat dort keine Fixture',
  'rezept-fingerabdruecke-erheben.js': 'die gemeinsame Abdruck-Liste trägt bewusst nur die Grundprodukte (Probe [Pro·Zuschnitt·Sperre])',
});
const ohneKommentare = (text) => text.replace(/\/\*[\s\S]*?\*\//g, '').split('\n').map((z) => z.replace(/(^|\s)\/\/.*$/, '')).join('\n');
const liestNurGrundprodukte = (text) => /\bPRODUKTE\b/.test(ohneKommentare(text));
/* Der öffentliche Zuschnitt hält sieben Werkzeuge der Kette zurück (15.10.2026, öffentlicher Lauf v929, Wort der Gegenlesung
   einzeln). Nur genau diese dürfen dort fehlen; jede andere fehlende Ketten-Datei bleibt rot, und mindestens drei werden dort
   geprüft. Im Kanon hält eine Probe, die selbst drinnen bleibt, die Liste gegen die Entscheidung des Zuschnitts. */
const KETTE_IM_ZUSCHNITT_ZURUECK = Object.freeze(['kern-ausliefern.js', 'rezepte-signieren.js', 'ablage-pruefen.js',
  'auslieferung-je-version-lauf.js', 'release.js', 'rezepte-pruefen.js', 'register-ausliefern.js']);
function kettePruefen({ werkzeuge, imZuschnitt, existiert = (n) => fs.existsSync(path.join(werkzeuge, n)),
  lesen = (n) => fs.readFileSync(path.join(werkzeuge, n), 'utf8') }) {
  const geprueft = [], uebergangen = [];
  for (const n of KETTE) {
    if (imZuschnitt && KETTE_IM_ZUSCHNITT_ZURUECK.includes(n) && !existiert(n)) { uebergangen.push(n); continue; }
    const text = lesen(n);
    geprueft.push(n);
    if (NUR_GRUNDPRODUKTE[n]) { assert.ok(liestNurGrundprodukte(text), n + ': als Ausnahme geführt, liest aber PRODUKTE nicht mehr — Ausnahme streichen'); continue; }
    assert.ok(!liestNurGrundprodukte(text), n + ': liest PRODUKTE; die Zuschnitte blieben dort aus');
    assert.match(text, /auslieferbareProdukte\(/, n + ': nimmt die Produkte nicht aus der einen Stelle');
  }
  assert.ok(geprueft.length >= 3, 'geprüft nur ' + geprueft.length + ' Werkzeuge der Kette');
  return { geprueft, uebergangen };
}
test('[Pro·Zuschnitt·Klasse] jedes Werkzeug der Auslieferungskette nimmt die Produkte aus auslieferbareProdukte(); Ausnahmen stehen benannt da', (t) => {
  const werkzeuge = path.join(__dirname, '..', 'tools');
  const { imOeffentlichenZuschnitt, IM_ZUSCHNITT_GRUND } = require('../tools/lib/wurzel-kopfzeile.js');
  const { uebergangen } = kettePruefen({ werkzeuge, imZuschnitt: imOeffentlichenZuschnitt(path.join(__dirname, '..')) });
  for (const n of uebergangen) t.diagnostic(n + ' nicht geprüft — ' + IM_ZUSCHNITT_GRUND);
  for (const [n, grund] of Object.entries(NUR_GRUNDPRODUKTE)) assert.ok(KETTE.includes(n) && grund.length > 30, n + ': Ausnahme mit Grund, für ein Werkzeug der Kette');
  // Kein weiteres Werkzeug mit „ausliefer“ oder „rezept“ im Namen läuft unbemerkt über PRODUKTE.
  const weitere = fs.readdirSync(werkzeuge).filter((n) => /^(.*ausliefer.*|rezepte?-.*|release)\.js$/.test(n) && !KETTE.includes(n))
    .filter((n) => liestNurGrundprodukte(fs.readFileSync(path.join(werkzeuge, n), 'utf8')));
  assert.deepEqual(weitere, [], 'ein Werkzeug der Auslieferung außerhalb der Liste liest PRODUKTE');
});
test('[Pro·Zuschnitt·Klasse·Zuschnitt·Rot-Beweis] im Zuschnitt bleibt eine nicht benannte fehlende Ketten-Datei rot, und weniger als drei geprüfte auch', () => {
  const da = (fehlt) => (n) => !fehlt.includes(n);
  const lesen = () => 'const x = auslieferbareProdukte();';
  // gültig: genau die sieben fehlen
  assert.equal(kettePruefen({ werkzeuge: '/x', imZuschnitt: true, existiert: da(KETTE_IM_ZUSCHNITT_ZURUECK), lesen: (n) => NUR_GRUNDPRODUKTE[n] ? 'PRODUKTE' : lesen() }).uebergangen.length, 7);
  // eine nicht benannte fehlt: der Lesezugriff wirft
  const leer = (fehlt) => (n) => { if (fehlt.includes(n)) throw new Error('ENOENT ' + n); return NUR_GRUNDPRODUKTE[n] ? 'PRODUKTE' : lesen(); };
  assert.throws(() => kettePruefen({ werkzeuge: '/x', imZuschnitt: true, existiert: da(['fassungen-register.js']), lesen: leer(['fassungen-register.js']) }), /ENOENT fassungen-register/);
  // im Kanon fehlt eine benannte: auch rot
  assert.throws(() => kettePruefen({ werkzeuge: '/x', imZuschnitt: false, existiert: da(['release.js']), lesen: leer(['release.js']) }), /ENOENT release/);
});
test('[Pro·Zuschnitt·Klasse·Rot-Beweis] ein Werkzeug, das wieder über PRODUKTE läuft, wird gefunden; ein Kommentar mit dem Wort nicht', () => {
  assert.equal(liestNurGrundprodukte("const { PRODUKTE } = require('./lib/vier-produkte.js');\nfor (const p of PRODUKTE) {}"), true);
  assert.equal(liestNurGrundprodukte('// früher: PRODUKTE\n/* PRODUKTE */\nconst x = auslieferbareProdukte();'), false);
});

/* ── Die Artikelnummer je Zuschnitt: zwei Stellen, die dasselbe sagen müssen ──
   Eine vertauschte Zeile lieferte einer Käuferin still das Produkt eines anderen Berufs. Die Tabelle im Verzeichnis und der
   Beleg (mit der Artikelreferenz des Shops) werden gegeneinander gehalten. Was das NICHT hält: dass der Beleg dem Shop
   entspricht; das sagt sein Feld `abgleich`, und das setzt eine zweite Stelle nach einer gemessenen Liste. */
test('[Pro·Zuschnitt·Artikel-Beleg] Tabelle und Beleg nennen je Kennung dieselbe Artikelnummer, mit der Artikelreferenz vd-<kennung>', () => {
  assert.deepEqual(VP.zuschnittArtikelAbweichungen(), []);
  const beleg = VP.zuschnittArtikelBelegLesen();
  assert.equal(beleg.artikel.length, Object.keys(VP.ZUSCHNITT_ODOO_PRODUKT_VORLAGE).length);
  assert.ok(beleg.abgleich === null || /^\d{4}-\d{2}-\d{2}$/.test(beleg.abgleich), 'abgleich ist null oder ein Datum');
});
test('[Pro·Zuschnitt·Artikel-Beleg·Rot-Beweis] eine vertauschte, fehlende, zusätzliche oder falsch bezeichnete Zeile wird gemeldet', () => {
  const tabelle = Object.assign({}, VP.ZUSCHNITT_ODOO_PRODUKT_VORLAGE);
  const beleg = () => JSON.parse(JSON.stringify(VP.zuschnittArtikelBelegLesen()));
  const [a, b] = Object.keys(tabelle);
  assert.ok(a && b && tabelle[a] !== tabelle[b], 'Vorbedingung: mindestens zwei Zuschnitte mit verschiedenen Nummern');
  // vertauscht in der Tabelle
  const vertauscht = Object.assign({}, tabelle, { [a]: tabelle[b], [b]: tabelle[a] });
  assert.equal(VP.zuschnittArtikelAbweichungen(vertauscht, beleg()).length, 2);
  // vertauscht im Beleg
  const bv = beleg(); const za = bv.artikel.find((z) => z.kennung === a), zb = bv.artikel.find((z) => z.kennung === b);
  [za.odooProduktVorlageId, zb.odooProduktVorlageId] = [zb.odooProduktVorlageId, za.odooProduktVorlageId];
  assert.equal(VP.zuschnittArtikelAbweichungen(tabelle, bv).length, 2);
  // fehlt im Beleg, zusätzlich im Beleg, falsche Artikelreferenz, doppelte Nummer
  const bf = beleg(); bf.artikel = bf.artikel.filter((z) => z.kennung !== a);
  assert.ok(VP.zuschnittArtikelAbweichungen(tabelle, bf).some((f) => f.includes('nicht im Beleg')));
  const bz = beleg(); bz.artikel.push({ kennung: 'pro-de-erfunden', artikelreferenz: 'vd-pro-de-erfunden', odooProduktVorlageId: 9001 });
  assert.ok(VP.zuschnittArtikelAbweichungen(tabelle, bz).some((f) => f.includes('nicht in der Tabelle')));
  const br = beleg(); br.artikel[0].artikelreferenz = 'vd-' + br.artikel[1].kennung;
  assert.ok(VP.zuschnittArtikelAbweichungen(tabelle, br).some((f) => f.includes('Artikelreferenz')));
  const bd = beleg(); bd.artikel[0].odooProduktVorlageId = bd.artikel[1].odooProduktVorlageId;
  assert.ok(VP.zuschnittArtikelAbweichungen(tabelle, bd).some((f) => f.includes('bei zwei Kennungen')));
  // Positivkontrolle: unverändert ist es leer
  assert.deepEqual(VP.zuschnittArtikelAbweichungen(tabelle, beleg()), []);
});

/* ── Ohne Abgleich geht kein Zuschnitt hinaus ──
   Die Artikelnummern im Verzeichnis und im Beleg stammen aus derselben Hand, bis eine zweite Stelle sie gegen eine gemessene
   Liste aus dem Shop gehalten und das Datum in den Beleg geschrieben hat. Bis dahin liefert die Kette die vier Grundprodukte. */
test('[Pro·Zuschnitt·Abgleich] ohne Abgleich-Datum im Beleg steht kein Zuschnitt in der Auslieferung; mit Datum stehen alle darin', () => {
  const tabelle = VP.ZUSCHNITT_ODOO_PRODUKT_VORLAGE;
  const beleg = (abgleich) => Object.assign(JSON.parse(JSON.stringify(VP.zuschnittArtikelBelegLesen())), { abgleich });
  const grund = VP.PRODUKTE.map((p) => p.slug);
  const alle = [...grund, ...VP.PRODUKT_ZUSCHNITTE.map((z) => z.slug)];
  assert.ok(alle.length > grund.length, 'Vorbedingung: es gibt Zuschnitte');

  // abgleich null: nur die Grundprodukte, in Liste UND Rezeptköpfen, und der Grund steht als Satz da
  assert.deepEqual(VP.auslieferbareProdukte(tabelle, beleg(null)).map((p) => p.slug), grund);
  assert.deepEqual(Object.keys(VP.rezeptKoepfeAlle(tabelle, beleg(null))), Object.keys(VP.REZEPT_KOEPFE));
  assert.match(VP.zuschnittZurueckhaltung(tabelle, beleg(null)), /noch nicht gegen den Shop abgeglichen/);
  // kein Datum ist kein Abgleich
  for (const wert of [undefined, '', 'ja', true, 20261012, '12.10.2026', '2026-13-40', '2026-02-30']) {
    assert.deepEqual(VP.auslieferbareProdukte(tabelle, beleg(wert)).map((p) => p.slug), grund, 'abgleich = ' + JSON.stringify(wert));
  }
  // mit Datum: alle, und nichts wird zurückgehalten (Positivkontrolle)
  assert.deepEqual(VP.auslieferbareProdukte(tabelle, beleg('2026-10-12')).map((p) => p.slug), alle);
  assert.deepEqual(Object.keys(VP.rezeptKoepfeAlle(tabelle, beleg('2026-10-12'))).sort(), [...alle].sort());
  assert.equal(VP.zuschnittZurueckhaltung(tabelle, beleg('2026-10-12')), null);
  // mit Datum, aber Tabelle und Beleg weichen ab: wieder keiner
  const [a, b] = Object.keys(tabelle);
  const vertauscht = Object.assign({}, tabelle, { [a]: tabelle[b], [b]: tabelle[a] });
  assert.deepEqual(VP.auslieferbareProdukte(vertauscht, beleg('2026-10-12')).map((p) => p.slug), grund);
  assert.match(VP.zuschnittZurueckhaltung(vertauscht, beleg('2026-10-12')), /weichen ab/);
  // ohne Artikelnummern gibt es nichts zurückzuhalten
  assert.equal(VP.zuschnittZurueckhaltung({}, beleg(null)), null);
});
test('[Pro·Zuschnitt·Abgleich] der Stand im Repo: Liste und Beleg sagen dasselbe darüber, ob Zuschnitte hinausgehen', () => {
  const beleg = VP.zuschnittArtikelBelegLesen();
  const mitZuschnitten = VP.auslieferbareProdukte().some((p) => p.zuschnitt);
  assert.equal(mitZuschnitten, typeof beleg.abgleich === 'string', 'Zuschnitte in der Auslieferung genau dann, wenn der Beleg ein Abgleich-Datum trägt');
  assert.equal(VP.zuschnittZurueckhaltung() === null, mitZuschnitten);
});
