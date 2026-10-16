'use strict';
/* Kern-Testfläche (U2-ADR-494, 09.10.2026). `window.__vdOeffentlich` ist eine Fläche für Proben und Werkzeuge, nicht für das
   Produkt. Damit das ausgelieferte Produkt ohne sie auskommt, darf kein Kern-Code über sie rufen: die Code-Listen und
   Terminologie-Literale (Region CODE-LISTEN, tools/build-code-listen.js) stehen INNERHALB des Kern-Verschlusses, vor der Marke
   `@vd-kern-verschluss-ende`, und rufen codeListeAnmelden / ipsBegriffeAnmelden bare. Bis zum 09.10. waren es eigene
   <script>-Blöcke am Dateiende, die über window.__vdOeffentlich riefen.
   Liest den Kern als Text (kein ladeKern), damit die Probe die Datei selbst prüft, nicht eine zusammengesetzte Quelle. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
// Der Name der Fläche, zusammengesetzt: diese Datei schreibt ihn nur in erfundene Fälle und bedient kein Produkt darüber
// (tools/testflaeche-klasse-pruefen.js läse sonst die Fälle als Bedienung).
const FLAECHE = 'window.' + '__vdOeffentlich';
const fs = require('node:fs');
const path = require('node:path');

const P = require('../tools/lib/produkt-text-erzeugen.js');

const KERN = fs.readFileSync(path.join(__dirname, '..', 'vivodepot.html'), 'utf8');
const VERSCHLUSS_ENDE = '// @vd-kern-verschluss-ende';
const CL_BEGIN = '/* CODE-LISTEN:BEGIN';
const CL_END = '/* CODE-LISTEN:END */';

const istKommentarzeile = (z) => /^\s*(\/\/|\/\*|\*)/.test(z);

/* Was am Kern gegen die Regel steht; leer heißt: eingehalten. */
function codeListenFunde(kern) {
  const funde = [];
  const anfang = kern.indexOf(CL_BEGIN);
  const ende = kern.indexOf(CL_END);
  const verschluss = kern.indexOf(VERSCHLUSS_ENDE);
  if (anfang < 0 || ende < 0 || ende < anfang) return ['Region CODE-LISTEN fehlt oder ist beschädigt'];
  if (kern.indexOf(CL_BEGIN, anfang + 1) >= 0 || kern.indexOf(CL_END, ende + 1) >= 0) funde.push('Region CODE-LISTEN steht mehrfach');
  if (verschluss < 0) return funde.concat('Marke @vd-kern-verschluss-ende fehlt');
  const schluss = kern.indexOf('})();', verschluss);
  if (!(ende < verschluss && verschluss < schluss)) funde.push('Region CODE-LISTEN steht nicht vor @vd-kern-verschluss-ende');
  // Zwischen dem Ende der Fläche und der Region darf kein Skript-Wechsel liegen: sonst stünde sie außerhalb des Verschlusses.
  const flaeche = kern.indexOf('window.__vdOeffentlich = {');
  if (flaeche < 0 || flaeche > anfang || kern.slice(flaeche, anfang).includes('</script>')) funde.push('Region CODE-LISTEN liegt nicht im Skript des Kern-Verschlusses');
  const region = kern.slice(anfang, ende);
  if (region.includes('<script')) funde.push('Region CODE-LISTEN trägt <script>-Blöcke');
  for (const zeile of region.split('\n')) {
    if (!istKommentarzeile(zeile) && zeile.includes('window.')) funde.push('Aufruf über window in der Region: ' + zeile.slice(0, 80));
  }
  // Außerhalb von Kommentaren nennt der Kern die Fläche genau einmal: in ihrer Zuweisung.
  const nennungen = kern.split('\n').filter((z) => !istKommentarzeile(z) && z.includes('__vdOeffentlich'));
  if (nennungen.length !== 1 || !nennungen[0].startsWith('window.__vdOeffentlich = {')) {
    funde.push('der Kern nennt __vdOeffentlich außerhalb ihrer Zuweisung: ' + nennungen.filter((z) => !z.startsWith('window.__vdOeffentlich = {')).map((z) => z.trim().slice(0, 60)).join(' | '));
  }
  return funde;
}

test('[Kern-Testfläche·Code-Listen] die Region CODE-LISTEN steht im Kern-Verschluss und kein Kern-Code ruft über window.__vdOeffentlich', () => {
  assert.deepEqual(codeListenFunde(KERN), []);
});

test('[Kern-Testfläche·Code-Listen·Rot-Beweis] ein Aufruf über die Fläche, eine Region hinter dem Verschluss und ein Aufruf außerhalb werden gefunden', () => {
  const ueberFlaeche = KERN.replace('\ncodeListeAnmelden("atc", {', '\n' + FLAECHE + '.codeListeAnmelden("atc", {');
  assert.notEqual(ueberFlaeche, KERN, 'Vorbedingung: der Aufruf für atc steht in der Region');
  assert.ok(codeListenFunde(ueberFlaeche).some((f) => f.startsWith('Aufruf über window')));

  const a = KERN.indexOf(CL_BEGIN), e = KERN.indexOf(CL_END) + CL_END.length;
  const region = KERN.slice(a, e);
  const ohne = KERN.slice(0, a) + KERN.slice(e);
  const dahinter = ohne.replace('</body>', '<script>\n' + region + '\n</script>\n</body>');
  assert.ok(codeListenFunde(dahinter).includes('Region CODE-LISTEN steht nicht vor @vd-kern-verschluss-ende'));

  const draussen = KERN.replace('</body>', '<script>' + FLAECHE + '.ipsBegriffeAnmelden({});</script>\n</body>');
  assert.ok(codeListenFunde(draussen).some((f) => f.startsWith('der Kern nennt __vdOeffentlich')));
});


/* ── Die Region (TOP-Bedingungen 1–3, 08.10.2026) ─────────────────────────────────────────────────────────────────────────
   Genau eine Region; erste Zeile die Zuweisung, letzte `};`; dazwischen nur `Name,` (auch mehrere) oder reine Weiterleitungen
   `get N() { return N; }` / `set N(v) { N = v; }` mit demselben Namen. Ein Kommentar am Zeilenende und reine Kommentarzeilen
   zählen nicht als Code. */
const [FL_BEGIN, FL_END] = P.KERN_TESTFLAECHE_MARKEN;
const NAME = '[A-Za-z_$][\\w$]*';
const ZEILE_KURZ = new RegExp('^(' + NAME + ',\\s*)+$');
const ZEILE_ZUGRIFF = new RegExp('^get (' + NAME + ')\\(\\) \\{ return \\1; \\},( set \\1\\(v\\) \\{ \\1 = v; \\},)?$');
function codeTeil(zeile) {
  const t = zeile.trim();
  if (t.startsWith('//')) return '';
  const i = t.indexOf(' //');
  return (i >= 0 ? t.slice(0, i) : t).trim();
}
function regionFunde(kern) {
  const funde = [];
  const anzahl = (m) => kern.split(m).length - 1;
  if (anzahl(FL_BEGIN) !== 1 || anzahl(FL_END) !== 1) return ['KERN_TESTFLAECHE: ' + anzahl(FL_BEGIN) + ' Anfangs- und ' + anzahl(FL_END) + ' Endmarken statt je einer'];
  const a = kern.indexOf(FL_BEGIN), e = kern.indexOf(FL_END);
  if (e < a) return ['KERN_TESTFLAECHE: Endmarke vor der Anfangsmarke'];
  const zeilen = kern.slice(a + FL_BEGIN.length, e).split('\n').slice(1, -1);
  if (zeilen[0] !== 'window.__vdOeffentlich = {') funde.push('erste Zeile der Region ist nicht die Zuweisung: ' + zeilen[0]);
  if (zeilen[zeilen.length - 1] !== '};') funde.push('letzte Zeile der Region ist nicht `};`: ' + zeilen[zeilen.length - 1]);
  for (const z of zeilen.slice(1, -1)) {
    const c = codeTeil(z);
    if (c && !ZEILE_KURZ.test(c) && !ZEILE_ZUGRIFF.test(c)) funde.push('Zeile in der Region ist weder Name noch Weiterleitung: ' + c.slice(0, 80));
  }
  return funde;
}

test('[Kern-Testfläche·Region] genau eine Region, sie trägt nur die Zuweisung in zwei Zeilenformen', () => {
  assert.deepEqual(regionFunde(KERN), []);
});

test('[Kern-Testfläche·Region·Rot-Beweis] eine Codezeile in der Region, eine zweite Region und eine Marke ohne Gegenstück werden gefunden', () => {
  const zeile = KERN.replace('window.__vdOeffentlich = {\n', 'window.__vdOeffentlich = {\n  ankerDatenHolen: () => ankerDaten(), // eingeschleust\n');
  assert.ok(regionFunde(zeile).some((f) => f.startsWith('Zeile in der Region')));
  const falscherZugriff = KERN.replace('get SEKTOREN() { return SEKTOREN; }', 'get SEKTOREN() { return SITUATIONEN; }');
  assert.notEqual(falscherZugriff, KERN, 'Vorbedingung: der Zugriff auf SEKTOREN steht in der Region');
  assert.ok(regionFunde(falscherZugriff).some((f) => f.startsWith('Zeile in der Region')));
  const zweite = KERN.replace('</body>', '<script>' + FL_BEGIN + '\nwindow.x = {\n};\n' + FL_END + '</script>\n</body>');
  assert.ok(regionFunde(zweite)[0].startsWith('KERN_TESTFLAECHE: 2 Anfangs-'));
  assert.ok(regionFunde(KERN.replace(FL_END, '/* weg */'))[0].includes('0 Endmarken'));
  assert.ok(regionFunde(KERN.replace(FL_BEGIN, '/* weg */'))[0].startsWith('KERN_TESTFLAECHE: 0 Anfangs-'));
  // Der Backschritt selbst bricht in allen drei Fällen ab (fail-closed), statt zu raten.
  for (const kaputt of [zweite, KERN.replace(FL_END, '/* weg */'), KERN.replace(FL_BEGIN, '/* weg */')]) {
    assert.throws(() => P._kernTestflaecheSchneiden(kaputt, 'vivodepot.html'), /KERN_TESTFLAECHE-Marken/);
  }
});

/* ── Gleichwertigkeit: Testfassung minus Region == ausgeliefertes Produkt ─────────────────────────────────────────────────
   Gebaut über tools/produkt-konfektionieren.js#konfektionieren, denselben Backschritt wie die Auslieferung. Denselben Abgleich über das
   Werkzeug der Auslieferung selbst hält eine zweite, nicht veröffentlichte Probe. */
const os = require('node:os');
const VP = require('../tools/lib/vier-produkte.js');
const { konfektionieren } = require('../tools/produkt-konfektionieren.js');
const VOR_DEPOT_FN = require('./load-issuer.js').ladeIssuer().V.vorDepotKonfigurationDateiInhalt;
function gebaut(slug, extra = {}) {
  const ordner = fs.mkdtempSync(path.join(os.tmpdir(), 'kern-testflaeche-'));
  try {
    const g = konfektionieren(Object.assign({ ziel: ordner, slug, modulauswahl: [], vorDepotKonfigurationInhaltFn: VOR_DEPOT_FN,
      unsignierteModulDateien: VP.modulDateienFuer(VP.PRODUKTE.find((p) => p.slug === slug)) }, extra));
    return fs.readFileSync(path.join(g.ordner, 'vivodepot.html'), 'utf8');
  } finally { fs.rmSync(ordner, { recursive: true, force: true }); }
}
const AUSGELIEFERT = new Map(VP.PRODUKTE.map((p) => [p.slug, { ausgeliefert: gebaut(p.slug), testfassung: gebaut(p.slug, { mitTestflaeche: true }) }]));
// Für die Rot-Beweise, die vor jedem Modul abbrechen: der Backschritt mit leerer Zutatenliste.
const OPTIONEN_LEER = Object.freeze({ modulauswahl: [], vorDepotKonfigurationInhaltFn: VOR_DEPOT_FN, unsignierteModule: [] });
const _bild = VP.ERSCHEINUNGSBILD_AB_WERK_PFAD;
const OPTIONEN_LEER_MIT_BILD = Object.freeze({ ...OPTIONEN_LEER,
  unsignierteModule: [{ roh: JSON.parse(fs.readFileSync(_bild, 'utf8')), basisname: path.basename(_bild) }] });

for (const p of VP.PRODUKTE) {
  test(`[Kern-Testfläche·Byte] ${p.slug}: Testfassung (mitTestflaeche) minus genau die Region == ausgeliefertes Produkt`, () => {
    const { ausgeliefert, testfassung } = AUSGELIEFERT.get(p.slug);
    assert.notEqual(testfassung, ausgeliefert, 'Vorbedingung: die Testfassung trägt die Fläche');
    assert.equal(P._kernTestflaecheSchneiden(testfassung, 'vivodepot.html'), ausgeliefert, 'jede Abweichung außerhalb der Region ist ein Fund');
  });
}

test('[Kern-Testfläche·Byte·Rot-Beweis] ein Byte außerhalb der Region unterscheidet Testfassung und Auslieferung', () => {
  const { ausgeliefert, testfassung } = AUSGELIEFERT.get('privat-de');
  const kipp = testfassung.replace('<html', '<html ');
  assert.notEqual(kipp, testfassung, 'Vorbedingung: die Stelle steht außerhalb der Region');
  assert.notEqual(P._kernTestflaecheSchneiden(kipp, 'vivodepot.html'), ausgeliefert);
});

/* ── Wächter über jeden Auslieferungsweg (N1, TOP-Wort 09.10.2026) ────────────────────────────────────────────────────────
   Je Weg aus dem Register der Auslieferungsorte das Erzeugnis, mit dem er heute baut (tools/lib/pages-erzeugnis.js), dazu die
   vier Produkte des Auslieferungswegs. Ein Weg, den diese Tabelle nicht kennt, ist rot: wer einen Weg hinzufügt, sagt hier, wie er baut. */
const { AUSLIEFERUNGSORTE } = require('../tools/lib/auslieferungsorte-register.js');
const PE = require('../tools/lib/pages-erzeugnis.js');
const ERZEUGNIS_JE_WEG = Object.freeze({
  WEG_ROH: { gebaut: () => PE.produktFuerPages('privat-de') },
  WEG_B: { gebaut: () => PE.geruestMitErscheinungsbild() },
});
function erzeugnisFunde(text) {
  const funde = [];
  // Kommentare über die Fläche (ihr Kopfkommentar im Kern) bleiben stehen; gesucht ist Code, der sie nennt.
  if (text.split('\n').some((z) => !istKommentarzeile(z) && z.includes('__vdOeffentlich'))) funde.push('trägt __vdOeffentlich');
  if (text.includes('KERN_TESTFLAECHE:')) funde.push('trägt eine KERN_TESTFLAECHE-Marke');
  if (text.includes('ENTWICKLERLEISTE:')) funde.push('trägt die Entwicklerleiste');
  return funde;
}

test('[Kern-Testfläche·Wege] kein Erzeugnis eines Auslieferungswegs trägt die Fläche oder die Entwicklerleiste', () => {
  const wege = [...new Set(AUSLIEFERUNGSORTE.map((o) => o.weg).filter((w) => w !== 'NICHT_VORHANDEN'))];
  assert.ok(wege.length >= 2, 'Vorbedingung: das Register nennt Wege (' + wege.join(', ') + ')');
  for (const w of wege) {
    assert.ok(ERZEUGNIS_JE_WEG[w], 'Weg ' + w + ' steht im Register, aber nicht in ERZEUGNIS_JE_WEG — wie baut er?');
    assert.deepEqual(erzeugnisFunde(ERZEUGNIS_JE_WEG[w].gebaut()), [], w);
  }
  for (const [slug, { ausgeliefert }] of AUSGELIEFERT) assert.deepEqual(erzeugnisFunde(ausgeliefert), [], slug);
});

test('[Kern-Testfläche·Wege·Rot-Beweis] je Weg: ein Erzeugnis, das die Fläche trägt, wird gefunden', () => {
  // WEG_ROH und die vier Produkte: fehlt EINE Marke, wird nicht gebacken (fail-closed). Ein Kern ganz ohne Marken (Bauform vor
  // U2-ADR-494) baut wie früher — MIT der Fläche; der Wächter findet sie dann im Erzeugnis, und die Regions-Probe oben hält fest,
  // dass der heutige Kern beide Marken trägt.
  assert.throws(() => PE.produktFuerPages('privat-de', { kernText: KERN.replace(FL_END + '\n', '') }), /KERN_TESTFLAECHE-Marken/);
  assert.throws(() => P.produktTextErzeugen(KERN.replace(FL_BEGIN + '\n', ''), OPTIONEN_LEER), /KERN_TESTFLAECHE-Marken/);
  // Ein Kern ganz ohne Marken baut im Backschritt mit Fläche — der Auslieferungsweg verweigert das Erzeugnis (Wort 10.10.2026).
  const ohneMarken = KERN.replace(FL_BEGIN + '\n', '').replace(FL_END + '\n', '');
  assert.ok(P.testflaecheImErzeugnis(P.produktTextErzeugen(ohneMarken, OPTIONEN_LEER_MIT_BILD).text), 'der Backschritt allein ließe sie stehen');
  assert.throws(() => PE.produktFuerPages('privat-de', { kernText: ohneMarken }), /trägt die Test-Fläche/);
  assert.throws(() => PE.geruestMitErscheinungsbild({ kernText: ohneMarken }), /trägt die Test-Fläche/);
  assert.throws(() => gebaut('pro-de', { kernQuelle: ohneMarken }), /trägt die Test-Fläche/);
  assert.doesNotThrow(() => gebaut('pro-de', { kernQuelle: ohneMarken, mitTestflaeche: true }), 'die Testfassung darf sie tragen');
  // … und die Testfassung, als Erzeugnis genommen, ist rot.
  assert.ok(erzeugnisFunde(AUSGELIEFERT.get('privat-de').testfassung).includes('trägt __vdOeffentlich'));
  // WEG_B: dieselbe Datei ohne die beiden Schnitte (so baute Weg B bis zum 09.10.2026) ist rot.
  const region = P.AB_WERK_REGIONEN.find((r) => r.modulTyp === 'erscheinungsbild');
  const modul = JSON.parse(fs.readFileSync(VP.ERSCHEINUNGSBILD_AB_WERK_PFAD, 'utf8'));
  const wegBAlt = P._regionNutzlastSetzen(KERN, region, modul, 'vivodepot.html');
  assert.deepEqual(erzeugnisFunde(wegBAlt).sort(), ['trägt __vdOeffentlich', 'trägt die Entwicklerleiste', 'trägt eine KERN_TESTFLAECHE-Marke']);
});

/* ── Nachlade-Zweig der Vor-Depot-Konfiguration, in beide Richtungen (N2, TOP-Wort 09.10.2026) ─────────────────────────── */
const NACHLADEN = 'function _vorDepotSkriptNachladen(';
test('[Vor-Depot·Nachladen] die vier Produkte tragen die Konfiguration eingebacken und den Nachlade-Zweig nicht; Weg B trägt ihn und lädt nach', () => {
  for (const [slug, { ausgeliefert }] of AUSGELIEFERT) {
    assert.ok(ausgeliefert.includes(P.VOR_DEPOT_EINGEBACKEN), slug + ': Konfiguration eingebacken');
    assert.ok(!ausgeliefert.includes(NACHLADEN) && !ausgeliefert.includes('VOR_DEPOT_NACHLADEN:'), slug + ': kein Nachlade-Zweig');
    assert.ok(ausgeliefert.includes("typeof _vorDepotSkriptNachladen === 'function'"), slug + ': der Aufruf fällt auf „keine Konfiguration“ zurück');
  }
  const wegB = PE.geruestMitErscheinungsbild();
  assert.ok(wegB.includes(NACHLADEN), 'Weg B trägt den Nachlade-Zweig');
  assert.ok(wegB.includes('<script id="vor-depot-konfiguration">window.__vorDepotKonfiguration = null;</script>'), 'Weg B bäckt keine Konfiguration ein');
});

test('[Vor-Depot·Nachladen·Rot-Beweis] ein Produkt ohne eingebackene Konfiguration wird nicht gebaut; ein Erzeugnis mit Zweig fällt auf', () => {
  assert.throws(() => P.produktTextErzeugen(KERN, { ...OPTIONEN_LEER, vorDepotKonfigurationInhaltFn: () => 'window.__vorDepotKonfiguration = null;\n' }),
    /nicht als Array eingebacken/);
  const mitZweig = P._vorDepotKonfigurationAufText(KERN, [], VOR_DEPOT_FN, 'vivodepot.html');
  assert.ok(mitZweig.includes(NACHLADEN), 'ohne den Schnitt bliebe der Zweig stehen');
  assert.throws(() => P._vorDepotNachladenSchneiden(KERN, 'vivodepot.html'), /nicht als Array eingebacken/);
});

/* ── Testfassung unverwechselbar (Wort der Gegenlesung 10.10.2026, Auflage 1) ──────────────────────────────────────────────────
   tools/vier-produkte-erzeugen.js --mit-testflaeche baut nach produkte-testfassung/<slug>-testfassung/ und setzt einen Kopfvermerk.
   Wer eine solche Datei weitergibt — als Produkt oder als Kern —, wird auf dem Auslieferungsweg verweigert. */
test('[Kern-Testfläche·Testfassung] --mit-testflaeche baut unverwechselbar, und kein Auslieferungsweg nimmt die Datei an', () => {
  const ziel = fs.mkdtempSync(path.join(os.tmpdir(), 'kern-testfassung-'));
  try {
    execFileSync(process.execPath, ['tools/vier-produkte-erzeugen.js', '--ziel', ziel, '--mit-testflaeche'],
      { cwd: path.join(__dirname, '..'), env: ohneGitUmgebung(), encoding: 'utf8', stdio: 'pipe' });
    assert.deepEqual(fs.readdirSync(ziel).filter((n) => !n.startsWith('.')).sort(), VP.PRODUKTE.map((p) => p.slug + '-testfassung').sort());
    const text = fs.readFileSync(path.join(ziel, 'privat-de-testfassung', 'vivodepot.html'), 'utf8');
    assert.ok(text.startsWith('<!DOCTYPE html>\n' + P.TESTFASSUNG_VERMERK + '\n'), 'Kopfvermerk direkt nach dem Doctype');
    assert.throws(() => P.testflaecheVerweigern(text, 'probe'), /trägt die Test-Fläche/);
    // Als Kern eingespeist: der Schnitt entfernt die Fläche, der Vermerk bleibt — der Weg verweigert trotzdem.
    assert.throws(() => gebaut('privat-de', { kernQuelle: text }), /trägt die Test-Fläche/);
    assert.throws(() => PE.produktFuerPages('privat-de', { kernText: text }), /trägt die Test-Fläche/);
  } finally { fs.rmSync(ziel, { recursive: true, force: true }); }
});

/* ── Rückfall ohne Nachlade-Zweig (Wort der Gegenlesung 10.10.2026, Bedingung 2) ─────────────────────────────────────────────
   Ohne Nachlade-Zweig wartet _vorDepotSkriptLaden den Zeit-Deckel ab. Im ausgelieferten Produkt darf dieser Weg nie laufen: dort ist
   die Konfiguration eingebacken, und die Funktion gibt das Array sofort zurück. Die Probe führt die Funktion aus dem gebauten Produkt
   selbst aus, mit dem eingebackenen Wert auf window und einem setTimeout, das jeden Aufruf zählt. */
function vorDepotLadenAus(produkt) {
  const fn = /^function _vorDepotSkriptLaden\(ladeFn\) \{\n[\s\S]*?\n\}$/m.exec(produkt);
  const pfad = /^const VOR_DEPOT_KONFIGURATION_PFAD = [^\n]*$/m.exec(produkt);
  const glob = /^const VOR_DEPOT_KONFIGURATION_GLOBAL = [^\n]*$/m.exec(produkt);
  const deckel = /^const VOR_DEPOT_NACHLADEN_DECKEL_MS = [^\n]*$/m.exec(produkt);
  assert.ok(fn && pfad && glob && deckel, 'Vorbedingung: Funktion und Konstanten stehen im Produkt');
  const baked = /<script id="vor-depot-konfiguration">window\.__vorDepotKonfiguration = ([\s\S]*?);<\/script>/.exec(produkt);
  assert.ok(baked, 'Vorbedingung: die Konfiguration ist eingebacken');
  return { quelle: [pfad[0], glob[0], deckel[0], fn[0]].join('\n'), wert: JSON.parse(baked[1]) };
}
async function laufen(produkt) {
  const { quelle, wert } = vorDepotLadenAus(produkt);
  const zeitgeber = [];
  const window = { __vorDepotKonfiguration: wert };
  const laden = new Function('window', 'setTimeout', 'document', 'location', quelle + '\nreturn _vorDepotSkriptLaden;')(window, (f, ms) => zeitgeber.push(ms), undefined, undefined);
  return { ergebnis: await laden(), zeitgeber };
}
test('[Vor-Depot·Rückfall] das gebackene Produkt gibt die eingebackene Konfiguration sofort zurück und durchläuft den Rückfall nicht', async () => {
  for (const [slug, { ausgeliefert }] of AUSGELIEFERT) {
    const { ergebnis, zeitgeber } = await laufen(ausgeliefert);
    assert.ok(Array.isArray(ergebnis), slug + ': das eingebackene Array');
    assert.deepEqual(zeitgeber, [], slug + ': kein Zeit-Deckel, kein Rückfall');
  }
});
test('[Vor-Depot·Rückfall·Rot-Beweis] ohne eingebackenes Array liefe der Rückfall und wartete den Deckel ab', async () => {
  const ohne = AUSGELIEFERT.get('privat-de').ausgeliefert.replace(/(<script id="vor-depot-konfiguration">window\.__vorDepotKonfiguration = )\[[\s\S]*?\](;<\/script>)/, '$1null$2');
  const { quelle } = vorDepotLadenAus(ohne.replace('window.__vorDepotKonfiguration = null;', 'window.__vorDepotKonfiguration = [];'));
  const zeitgeber = [];
  const laden = new Function('window', 'setTimeout', 'document', 'location', quelle + '\nreturn _vorDepotSkriptLaden;')({ __vorDepotKonfiguration: null }, (f, ms) => { zeitgeber.push(ms); f(); }, undefined, undefined);
  assert.equal(await laden(), undefined);
  assert.deepEqual(zeitgeber, [3000], 'der Rückfall wartet den Deckel ab');
});

/* ── Ratsche (i), TOP-Wort 08.10.2026: die Zahl der Specs, die die Fläche brauchen, kann nur sinken ──────────────────────────
   Erhebungsweg: Spec-Dateien in den E2E-Ordnern (git ls-files tests/e2e…), die `__vdOeffentlich` nennen. Sinkt die Zahl, wird der Deckel im
   selben Commit auf den Ist-Wert gesenkt; steigen darf er nur mit dem Wort der Gegenlesung (Register der gegengelesenen Zähler). Eine
   Spec, die eine Oberfläche prüft, prüft sie über die Oberfläche. */
const { execFileSync } = require('node:child_process');
const { ohneGitUmgebung } = require('../tools/lib/ohne-git-umgebung.js');
function specsMitTestflaeche() {
  const repo = path.join(__dirname, '..');
  const specs = execFileSync('git', ['ls-files', '-z', '--', 'tests/e2e*'], { cwd: repo, encoding: 'utf8', env: ohneGitUmgebung() }).split('\0').filter((f) => f.endsWith('.spec.js'));
  return specs.filter((f) => fs.existsSync(path.join(repo, f)) && fs.readFileSync(path.join(repo, f), 'utf8').includes('__vdOeffentlich'));
}
test('[Kern-Testfläche·Ratsche] die Zahl der Specs mit Testfläche steht genau auf ihrem Deckel', (t) => {
  // Der Deckel zählt den Kanon-Baum; der öffentliche Zuschnitt hält Specs zurück (tools/lib/wurzel-kopfzeile.js).
  const W = require('../tools/lib/wurzel-kopfzeile.js');
  if (W.imOeffentlichenZuschnitt(path.join(__dirname, '..'))) { t.skip(W.IM_ZUSCHNITT_GRUND); return; }
  assert.equal(specsMitTestflaeche().length, 137); // 09.10.2026, Kanon 7c916762c, erhoben mit specsMitTestflaeche()
});

/* ── Klasse: kein Produkt ohne Fläche wird über die Fläche bedient (Befund TESTFLAECHE-AUF-ECHTEM-PRODUKT, 10.10.2026) ────────────
   Seit U2-ADR-494 fehlt window.__vdOeffentlich im ausgelieferten Produkt. Baut eine Probe oder ein Werkzeug ein echtes Produkt
   und bedient es dann über die Fläche, bricht der Schritt oder wartet auf einen Wert, der nie kommt (gemessen: eine Probe 600 s
   und mehr). Die erste Fassung dieses Wächters sah je Datei hin und ließ die E2E-Ordner aus; die Wege 4 bis 6 bauten aber im
   gemeinsamen Helfer tests/weg-hilfen.js und bedienten in der Probe (Air-Lauf 38052952127, elf rote Proben). Die Prüfung folgt
   darum der require-Kette je Funktion, über Proben, E2E-Ordner und Werkzeuge: tools/testflaeche-klasse-pruefen.js.
   Tiefe: die Prüfung läuft jede Kette bis zu ihrem Ende ab und bricht ab, wenn eine Kette TIEFEN_GRENZE erreicht. Am Baum
   gemessen läuft sie neun Helfer tief (10.10.2026, `node tools/testflaeche-klasse-pruefen.js --tiefe`). */
const KLASSE = require('../tools/testflaeche-klasse-pruefen.js');
const { imOeffentlichenZuschnitt, IM_ZUSCHNITT_GRUND } = require('../tools/lib/wurzel-kopfzeile.js');
const IM_ZUSCHNITT = imOeffentlichenZuschnitt(path.join(__dirname, '..'));
const BAU = 'konfektionieren' + "({ slug: 'privat-de' })";
const BAU_TESTFASSUNG = 'konfektionieren' + "({ slug: 'privat-de', mitTestflaeche: true })";
function erfunden(dateien) {
  return KLASSE.klassePruefen({ dateien: Object.keys(dateien), lesen: (f) => dateien[f] }).map((f) => f.datei);
}
/* Eine Kette aus `tiefe` Helfern: die Probe ruft h1(), jeder Helfer ruft den nächsten, der letzte führt `ende` aus. */
function kette(tiefe, ende, probe = `await seite.evaluate(() => ${FLAECHE}.oeffneSektor('x'));`) {
  const dateien = { 'tests/e2e/probe.spec.js': `const { h1 } = require('../h1.js');\nh1();\n${probe}\n` };
  for (let i = 1; i <= tiefe; i++) {
    const weiter = i < tiefe ? `const { h${i + 1} } = require('./h${i + 1}.js');\n` : '';
    dateien[`tests/h${i}.js`] = `${weiter}function h${i}() {\n  ${i < tiefe ? `return h${i + 1}();` : ende}\n}\nfunction ungenutzt() {\n  return 1;\n}\nmodule.exports = { h${i}, ungenutzt };\n`;
  }
  return dateien;
}

test('[Kern-Testfläche·Klasse] keine Probe und kein Werkzeug bedient ein ausgeliefertes Produkt über die Fläche, auch nicht über Helfer', (t) => {
  const funde = KLASSE.amRepo();
  assert.deepEqual(funde.filter((f) => !f.ausnahme).map((f) => `${f.datei} (baut: ${f.baut.join(' > ')}; bedient: ${f.bedient.join(' > ')})`), []);
  // Die Tiefe ist am Kanon-Baum gemessen; im öffentlichen Zuschnitt fehlen zurückgehaltene Helfer.
  if (IM_ZUSCHNITT) t.diagnostic('Tiefe nicht geprüft — ' + IM_ZUSCHNITT_GRUND);
  else assert.ok(funde.abgelaufen.tiefe >= 9, 'die Prüfung ist am Baum mindestens die gemessenen neun Helfer tief gelaufen, nicht nur je Datei');
});
test('[Kern-Testfläche·Klasse·Ausnahme·Rot-Beweis] die Marke nimmt nur aus, wer den Auslieferungs-Backschritt selbst ruft, und nur mit Grund', () => {
  const marke = '@testflaeche-klasse-' + 'ausnahme:';
  const grund = 'klickt eine Testfassung, die byte-genau gegen die Auslieferung geprüft ist';
  const fall = (kopf, bau) => {
    const d = { 'tools/lauf.js': `${kopf}const g = ${bau};\nawait seite.evaluate(() => ${FLAECHE}.ankerDaten());\n` };
    return KLASSE.klassePruefen({ dateien: Object.keys(d), lesen: (f) => d[f] })[0].ausnahme;
  };
  const backschritt = `K.${KLASSE.AUSNAHME_NUR_BEI}(argumente)`;
  assert.equal(fall('', backschritt), null);
  assert.equal(fall(`/* ${marke} zu kurz */\n`, backschritt), null, 'ein Grund unter vierzig Zeichen ist keiner');
  assert.equal(fall(`/* ${marke} */\n`, backschritt), null);
  assert.equal(fall(`/* ${marke} ${grund} */\n`, backschritt), grund);
  // Jede Datei, die hinausgeht, baut über eine der anderen Baufunktionen: dort wirkt die Marke nicht, auch nicht mit Grund.
  for (const name of KLASSE.BAUT_AUSSER_TESTFASSUNG) assert.equal(fall(`/* ${marke} ${grund} */\n`, `${name}(kern, { slug: 'privat-de' })`), null, name);
  assert.equal(fall(`/* ${marke} ${grund} */\n`, `${KLASSE.SCHNITT}(kern)`), null);
});
test('[Kern-Testfläche·Klasse·Rot-Beweis] an der tiefsten Kette: der Bau neun Helfer unter der Probe fällt auf; als Testfassung nicht', () => {
  assert.deepEqual(erfunden(kette(9, `return ${BAU};`)), ['tests/e2e/probe.spec.js']);
  assert.deepEqual(erfunden(kette(9, `return ${BAU_TESTFASSUNG};`)), []);
});
test('[Kern-Testfläche·Klasse·Rot-Beweis] der umgekehrte Fall: die Probe baut, ein Helfer neun Ebenen tiefer bedient', () => {
  assert.deepEqual(erfunden(kette(9, `return ${FLAECHE}.ankerDaten();`, `${BAU};`)), ['tests/e2e/probe.spec.js']);
  assert.deepEqual(erfunden(kette(9, `return ${FLAECHE}.ankerDaten();`, `${BAU_TESTFASSUNG};`)), []);
});
test('[Kern-Testfläche·Klasse·Rot-Beweis] je Funktion: ein Helfer, der in einer NICHT gerufenen Funktion baut, ist kein Fund; im Modulrumpf ist er einer', () => {
  const still = kette(1, 'return 1;');
  still['tests/h1.js'] = still['tests/h1.js'].replace('return 1;\n}\nmodule', `return ${BAU};\n}\nmodule`);   // der Bau steht in ungenutzt()
  assert.deepEqual(erfunden(still), []);
  const rumpf = kette(1, 'return 1;');
  rumpf['tests/h1.js'] = `const gebacken = ${BAU};\n` + rumpf['tests/h1.js'];
  assert.deepEqual(erfunden(rumpf), ['tests/e2e/probe.spec.js']);
});
/* Woran die Prüfung einen Bau erkennt: an den Aufrufen der Baufunktionen und am Schnitt der Region. Ein Produkt ohne Fläche
   entsteht an genau einer Stelle, dem Schnitt (KLASSE.SCHNITT); die Byte-Proben oben belegen, dass Testfassung minus Region das
   ausgelieferte Produkt ist. GRENZE: wer die Fläche auf einem anderen Weg entfernt, fällt nicht auf. */
test('[Kern-Testfläche·Klasse·Rot-Beweis] je Bauweg: jeder Aufruf, der zum Schnitt führt, ist ein Bau; mit wörtlicher Testfassung nicht', () => {
  const mit = (bau) => erfunden(kette(2, `return ${bau};`));
  for (const name of KLASSE.BAUT_AUSSER_TESTFASSUNG) {
    assert.deepEqual(mit(`${name}(kern, { slug: 'privat-de' })`), ['tests/e2e/probe.spec.js'], name);
    assert.deepEqual(mit(`${name}(kern, { slug: 'privat-de', mitTestflaeche: true })`), [], name + ' als Testfassung');
    assert.deepEqual(mit(`${name}(kern, { slug: 'privat-de', mitTestflaeche })`), ['tests/e2e/probe.spec.js'], name + ': eine durchgereichte Variable ist keine wörtliche Testfassung');
  }
  for (const name of KLASSE.BAUT_IMMER) assert.deepEqual(mit(`${name}(kern)`), ['tests/e2e/probe.spec.js'], name);
  assert.deepEqual(mit("execFileSync('node', ['tools/vier-produkte-erzeugen.js', '--ziel', ziel])"), ['tests/e2e/probe.spec.js']);
  assert.deepEqual(mit("execFileSync('node', ['tools/vier-produkte-erzeugen.js', '--ziel', ziel, '--mit-testflaeche'])"), []);
  assert.deepEqual(mit('andererBau(kern)'), [], 'Gegenprobe und benannte Grenze: ein Bauweg unter anderem Namen, der keine dieser Funktionen ruft, fällt nicht auf');
});
test('[Kern-Testfläche·Klasse·Rot-Beweis] in ein Bauwerkzeug hinein folgt die Kette nicht: wer dort eine Testfassung bestellt, ist kein Fund', () => {
  for (const name of [...KLASSE.BAUT_AUSSER_TESTFASSUNG, ...KLASSE.BAUT_IMMER]) {
    const dateien = kette(1, `return bauen({ mitTestflaeche: true });`);
    dateien['tests/h1.js'] = "const { bauen } = require('./werkzeug.js');\n" + dateien['tests/h1.js'];
    dateien['tests/werkzeug.js'] = `function ${name}(a) {\n  return ${KLASSE.SCHNITT === name ? 'a' : KLASSE.SCHNITT + '(a)'};\n}\nfunction bauen(a) {\n  return ${KLASSE.SCHNITT}(a);\n}\nmodule.exports = { bauen };\n`;
    assert.deepEqual(erfunden(dateien), [], name + ': das Modul, das die Funktion erklärt, ist ein Bauwerkzeug');
    dateien['tests/werkzeug.js'] = dateien['tests/werkzeug.js'].replace(`function ${name}(`, 'function irgendwas(');
    if (name !== KLASSE.SCHNITT) assert.deepEqual(erfunden(dateien), ['tests/e2e/probe.spec.js'], name + ': ohne die Erklärung ist es ein gewöhnlicher Helfer, und sein Schnitt ist ein Bau');
  }
});
test('[Kern-Testfläche·Klasse·Schnitt] die Region der Fläche schneiden außerhalb der Proben nur die bekannten Stellen', () => {
  const repo = path.join(__dirname, '..');
  const rufer = execFileSync('git', ['ls-files', '-z', '--', 'tools'], { cwd: repo, encoding: 'utf8', env: ohneGitUmgebung() }).split('\0')
    .filter((f) => /\.js$/.test(f) && fs.existsSync(path.join(repo, f)) && fs.readFileSync(path.join(repo, f), 'utf8').includes(KLASSE.SCHNITT + '('));
  // Der Backschritt selbst, der Bau der Vorschau-Seiten (er bedient nichts) und die Dateien mit Ausnahme-Marke.
  const bekannt = new Set(['tools/lib/produkt-text-erzeugen.js', 'tools/lib/pages-erzeugnis.js', ...KLASSE.amRepo().filter((f) => f.ausnahme).map((f) => f.datei)]);
  assert.deepEqual(rufer.filter((f) => !bekannt.has(f)), [], 'ein neuer Rufer des Schnitts ist ein neuer Bauweg: die Prüfung sieht ihn als Bau, diese Liste nennt ihn');
});
/* Die Konformitäts-Proben und einige Werkzeuge sind Module (.mjs). Ihre Einfuhr trägt die Kette wie require: eine Probe, die
   über createRequire einen Bau-Helfer lud und das Produkt über die Fläche bediente, sah die erste Fassung der Prüfung nicht. */
test('[Kern-Testfläche·Klasse·Rot-Beweis] Modul-Einfuhr: import, import() und createRequire tragen die Kette wie require', () => {
  const probe = (einfuhr) => erfunden({
    'tests/konformitaet/probe.mjs': `${einfuhr}\nconst html = bauen();\nawait page.evaluate(() => ${FLAECHE}.geheZuZuhause());\n`,
    'tests/helfer.js': `function bauen() {\n  return ${BAU};\n}\nmodule.exports = { bauen };\n`,
    'tests/helfer.mjs': `export function bauen() {\n  return ${BAU};\n}\n`,
  });
  const formen = [
    "import { bauen } from '../helfer.mjs';",
    "const { bauen } = await import('../helfer.mjs');",
    "import { createRequire } from 'node:module';\nconst { bauen } = createRequire(import.meta.url)('../helfer.js');",
    "import { createRequire } from 'node:module';\nconst require_ = createRequire(import.meta.url);\nconst { bauen } = require_('../helfer.js');",
  ];
  for (const einfuhr of formen) assert.deepEqual(probe(einfuhr), ['tests/konformitaet/probe.mjs'], einfuhr);
  assert.deepEqual(probe('const bauen = () => null;'), [], 'Gegenprobe: ohne Einfuhr eines Bau-Helfers kein Fund');
});
test('[Kern-Testfläche·Klasse·Rot-Beweis] eine Kette, die tiefer ist, als die Prüfung abläuft, bricht die Prüfung ab', () => {
  assert.throws(() => erfunden(kette(KLASSE.TIEFEN_GRENZE, 'return 1;')), /tiefer, als die Prüfung abläuft/);
  assert.doesNotThrow(() => erfunden(kette(KLASSE.TIEFEN_GRENZE - 1, 'return 1;')));
});
test('[Kern-Testfläche·Klasse·Rot-Beweis] am Baum: ohne die Testfassung im gemeinsamen Helfer fallen die Wege 4 bis 6 und die E2E-Abnahme auf', () => {
  const repo = path.join(__dirname, '..');
  const ohne = (helfer) => KLASSE.klassePruefen({
    dateien: execFileSync('git', ['ls-files', '-z', '--', 'tests', 'tools'], { cwd: repo, encoding: 'utf8', env: ohneGitUmgebung() }).split('\0').filter((f) => /\.js$/.test(f) && fs.existsSync(path.join(repo, f))),
    lesen: (f) => { const t = fs.readFileSync(path.join(repo, f), 'utf8'); return f === helfer ? t.replace(/mitTestflaeche: true,/, '') : t; },
  }).map((f) => f.datei);
  const wege = ohne('tests/weg-hilfen.js');
  for (const w of ['weg-4-exportieren', 'weg-5-angehoerigen-eintragen', 'weg-6-abgeben']) assert.ok(wege.includes(`tests/mit-modul/${w}.test.js`), w);
  assert.ok(ohne('tests/e2e/durchklick-abnahme-helpers.js').includes('tests/e2e/durchklick-abnahme-geburtsdatum-schreibwege.spec.js'), 'E2E-Ordner sind eingeschlossen');
});

module.exports = { codeListenFunde, regionFunde, erzeugnisFunde, specsMitTestflaeche };
