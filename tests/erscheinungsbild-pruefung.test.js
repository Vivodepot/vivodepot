'use strict';
/* erscheinungsbild-pruefung.test.js — das Erscheinungsbild als Modul (U2-ADR-473 Nachtrag, v894, 02.10.2026)
   ───────────────────────────────────────────────────────────────────────────────────────────────
   Seit v894 trägt das Gerüst keine Erscheinungswerte. Sie kommen als Modul (tools/erscheinung/heute.css →
   erscheinungsbild-heute-modul.json) über produktTextErzeugen in die Region AB_WERK_ERSCHEINUNGSBILD_PRODUKT.
   Geprüft wird ZWEIMAL, mit denselben Regeln (Block ERSCHEINUNGSBILD_REGELN im Kern):
     · im Kern beim Anwenden — erscheinungsbildPruefen im <script id="erscheinungsbild"> (Auflage B),
     · beim Bauen — _erscheinungsbildPruefen in tools/lib/produkt-text-erzeugen.js, das auch im Gateway läuft, wo sich
       Kern-Code nicht ausführen läßt (Auflage D: ein Verstoß baut kein Produkt).
   Dieser Test hält beide Umsetzungen an EINEM Satz von Fällen gleich und trägt die Rot-Beweise. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { ladeKern } = require('./load-kern.js');
const P = require('../tools/lib/produkt-text-erzeugen.js');
const { cssZuModul, modulText, stilBauen, QUELLE_HEUTE, ZIEL_HEUTE } = require('../tools/erscheinungsbild-modul.js');

const REPO = path.join(__dirname, '..');
const KERN = fs.readFileSync(path.join(REPO, 'vivodepot.html'), 'utf8');
const HEUTE = JSON.parse(fs.readFileSync(ZIEL_HEUTE, 'utf8'));

/* Das Kopf-Skript des Kerns, ohne DOM ausgeführt — genau der Code, der im Browser vor dem ersten Bild läuft. */
function kopfSkript(kernText = KERN) {
  const anfang = '<script id="erscheinungsbild">';
  const a = kernText.indexOf(anfang);
  const e = kernText.indexOf('</script>', a);
  const ctx = vm.createContext({});
  return vm.runInContext(kernText.slice(a + anfang.length, e)
    + '\n;({ pruefen: erscheinungsbildPruefen, css: erscheinungsbildCss, regeln: ERSCHEINUNGSBILD_REGELN, ergebnis: ERSCHEINUNGSBILD })', ctx);
}
const K = kopfSkript();
const R = P.erscheinungsbildRegelnLesen(KERN);

const OPT = (module) => ({ modulauswahl: [], vorDepotKonfigurationInhaltFn: () => '[]', unsignierteModule: module, serviceWorkerVorhanden: true });
const ALS_ZUTAT = (roh) => ({ roh, basisname: 'erscheinungsbild-probe.json' });
const mit = (fn) => { const m = JSON.parse(JSON.stringify(HEUTE)); fn(m); return m; };
// Ein Urteil auf das Vergleichbare verkürzt: Gründe/Regeln je Schlüssel, sortiert (die Kern-Fassung trägt zusätzlich `ebenen`).
const kurz = (u) => ({
  gueltig: u.gueltig,
  funde: [...u.verworfene.map((v) => (v.ebene || '-') + ':' + (v.schluessel || '-') + ':' + v.grund),
    ...u.verstoesse.map((v) => v.ebene + ':' + v.schluessel + ':' + v.regel)].sort(),
});

test('[Erscheinungsbild] das Modul ist der Bau aus der Quelle (tools/erscheinungsbild-modul.js --check)', () => {
  assert.equal(fs.readFileSync(ZIEL_HEUTE, 'utf8'), modulText(cssZuModul(fs.readFileSync(QUELLE_HEUTE, 'utf8'), 'heute', { stil: stilBauen() })));
});

test('[Erscheinungsbild] die Anzeige-Mechanik im Gerüst ist genau die display-Mechanik der stil-Quellen', () => {
  const { anzeigeMechanik } = require('../tools/lib/css-zerlegen.js');
  const ordner = path.join(REPO, 'tools', 'erscheinung');
  // Die Mechanik-Pflicht gilt für die Teile, die das Gerüst selbst ausmachen (grundlage, navigation) — nicht für Profil-Teile:
  // ein Profil darf zusätzlich verstecken oder umformen, aber nichts Geschütztes verdrängen (das hält die Laufzeitprobe).
  const MECHANIK_TEILE = ['grundlage', 'navigation'];
  const soll = JSON.parse(fs.readFileSync(path.join(ordner, 'stil-reihenfolge.json'), 'utf8')).filter((teil) => MECHANIK_TEILE.includes(teil))
    .flatMap((teil) => anzeigeMechanik(fs.readFileSync(path.join(ordner, 'stil', teil + '.css'), 'utf8')));
  const a = KERN.indexOf('\n<style id="design-system">\n');
  const geruest = KERN.slice(a, KERN.indexOf('\n</style>', a + 10));
  assert.ok(geruest.includes(soll.join('\n')), 'die display-Mechanik im Gerüst weicht von den stil-Quellen ab — neu erzeugen');
  assert.ok(soll.some((z) => /#app\.an \{ display:/.test(z)), 'Testvoraussetzung: die Einblende-Regel der App gehört dazu');
});

test('[Erscheinungsbild] die Regeln stehen einmal: der Bauweg liest denselben Block, den das Kopf-Skript benutzt', () => {
  assert.ok(R, 'Block ERSCHEINUNGSBILD_REGELN nicht lesbar');
  assert.deepEqual(JSON.parse(JSON.stringify(K.regeln)), R);
});

test('[Erscheinungsbild] das Vokabular des Gerüsts ist genau die Menge, die „heute" setzt', () => {
  assert.deepEqual([...R.token].sort(), Object.keys(HEUTE.basis).sort(),
    'ein neuer Token-Name braucht einen Ab-Werk-Wert in tools/erscheinung/heute.css, und jeder Wert dort einen Namen im Gerüst');
});

test('[Erscheinungsbild] geschützt ist genau DESIGN_TOKEN_RESERVIERT', () => {
  const { V } = ladeKern();
  assert.deepEqual([...R.geschuetzt].sort(), [...V.DESIGN_TOKEN_RESERVIERT].sort());
});

test('[Erscheinungsbild] „heute" besteht beide Prüfungen; ohne Modul bleibt das Gerüst nackt', () => {
  assert.deepEqual(kurz(K.pruefen(HEUTE)), { gueltig: true, funde: [] });
  assert.deepEqual(kurz(P._erscheinungsbildPruefen(HEUTE, R)), { gueltig: true, funde: [] });
  assert.equal(K.ergebnis.gueltig, false);
  assert.equal(K.ergebnis.grund, 'kein-modul');
});

/* Der gemeinsame Satz: jeder Fall mit dem erwarteten Fund. Beide Umsetzungen müssen ihn genau so finden. */
const FAELLE = [
  ...require('./helfer/erscheinungsbild-grammatik-faelle.js')
    .map(([name, ebene, token, wert]) => [name, mit((m) => { m[ebene][token] = wert; }), ebene + ':' + token + ':grammatik']),
  ['unbekannter Token-Name (Auflage B)', mit((m) => { m.basis['--frei-erfunden'] = '#000000'; }), 'basis:--frei-erfunden:unbekannt'],
  ['geschütztes Token', mit((m) => { m.dunkel['--akzent'] = '#000000'; }), 'dunkel:--akzent:geschuetzt'],
  ['unbekannter Modul-Schlüssel', mit((m) => { m.skript = 'x'; }), '-:skript:unbekannter-schluessel'],
  ['layout mit Inhalt, bevor v897 seine Prüfung einhängt', mit((m) => { m.layout = { menue: 'kopf' }; }), '-:layout:layout-ungeprueft'],
  ['Verweis auf einen unbekannten Namen', mit((m) => { m.basis['--line'] = 'var(--gibt-es-nicht)'; }), 'basis:--line:unbekannter-verweis'],
  ['Text-Kontrast unter 4,5:1 (Auflage D)', mit((m) => { m.basis['--ink3'] = '#a0a0a0'; }), 'basis:--ink3/--cream:kontrast'],
  ['Notfall ausgeblendet: Schrift = Fläche im Nachtmodus (Auflage D)', mit((m) => { m.dunkel['--modus-notfall'] = 'var(--auf-akzent)'; }), 'dunkel:--auf-akzent/--modus-notfall:kontrast'],
  ['Mindestgröße Schrift', mit((m) => { m.basis['--fs-xs'] = '0.3rem'; }), 'basis:--fs-xs:mindestgroesse'],
  ['Mindestgröße Ziel (WCAG 2.5.8)', mit((m) => { m.hochkontrast['--ziel'] = '12px'; }), 'hochkontrast:--ziel:mindestgroesse'],
  // `stil` (Lesart B, Auflagen der Gegenlesung 1–3)
  ['stil: url( zu fremder Adresse', mit((m) => { m.stil.grundlage += '.x{background:url(https://x.invalid/a.png)}'; }), 'stil:grundlage:stil-url'],
  ['stil: @import', mit((m) => { m.stil.grundlage = '@import "x.css";' + m.stil.grundlage; }), 'stil:grundlage:stil-at-regel'],
  ['stil: @font-face', mit((m) => { m.stil.grundlage += '@font-face{font-family:x}'; }), 'stil:grundlage:stil-at-regel'],
  ['stil: !important', mit((m) => { m.stil.grundlage += '.x{color:red!important}'; }), 'stil:grundlage:stil-verboten'],
  ['stil: spitze Klammer', mit((m) => { m.stil.grundlage += '.x{color:red}</style><script>'; }), 'stil:grundlage:stil-verboten'],
  ['stil: erfundener Text über content (Auflage der Gegenlesung 3)', mit((m) => { m.stil.grundlage += '.sig::before{content:"Signatur gültig"}'; }), 'stil:grundlage:stil-content'],
  ['stil: Häkchen über content', mit((m) => { m.stil.grundlage += '.x::after{content:"\u2713"}'; }), 'stil:grundlage:stil-content'],
  ['stil: Selektor auf den Notfall (Auflage der Gegenlesung 2)', mit((m) => { m.stil.grundlage += '.btn-notfall{opacity:0}'; }), 'stil:grundlage:stil-geschuetzt'],
  ['stil: Selektor auf die Sicherungsanzeige', mit((m) => { m.stil.grundlage += '#app .tb-save-status{visibility:hidden}'; }), 'stil:grundlage:stil-geschuetzt'],
  ['stil: Fokus abschalten', mit((m) => { m.stil.grundlage += 'button:focus-visible{outline:none}'; }), 'stil:grundlage:stil-geschuetzt'],
  ['stil: offene Klammer', mit((m) => { m.stil.grundlage += '.x{color:red'; }), 'stil:grundlage:stil-klammern'],
  ['Kontrastfarbe nicht auflösbar', mit((m) => { m.basis['--cream'] = 'color-mix(in srgb, var(--ink) 6%, var(--white))'; }), 'basis:--ink/--cream:kontrast-unbestimmbar'],
];

/* Die zwei Auflagen der Gegenlesung zu `stil` mit festem Titel — der Konformitätsblock der ADR verankert seine Klauseln an
   wörtlichen Titeln (tools/adr-konformitaet-pruefen.js), die Schleife unten setzt ihre zusammen. Dieselben Fälle, aus FAELLE. */
const fallAus = (kennung) => FAELLE.find(([name]) => name.startsWith(kennung));
const kernUndBauwegWeisenAb = (kennung) => {
  const [, modul, fund] = fallAus(kennung);
  assert.ok(kurz(K.pruefen(modul)).funde.includes(fund), 'Kern');
  assert.ok(kurz(P._erscheinungsbildPruefen(modul, R)).funde.includes(fund), 'Bauweg');
};
test('[Erscheinungsbild·Rot-Beweis] kein erfundener Text über content in stil — Kern und Bauweg weisen ab', () => {
  kernUndBauwegWeisenAb('stil: erfundener Text über content');
});
test('[Erscheinungsbild·Rot-Beweis] kein Selektor auf eine geschützte Anzeige in stil — Kern und Bauweg weisen ab', () => {
  kernUndBauwegWeisenAb('stil: Selektor auf den Notfall');
});

for (const [name, modul, fund] of FAELLE) {
  test('[Erscheinungsbild·Rot-Beweis] ' + name + ' — beide Umsetzungen weisen ab, mit demselben Fund', () => {
    const imKern = kurz(K.pruefen(modul));
    const beimBauen = kurz(P._erscheinungsbildPruefen(modul, R));
    assert.equal(imKern.gueltig, false);
    assert.ok(imKern.funde.includes(fund), 'Kern fand ' + JSON.stringify(imKern.funde));
    assert.deepEqual(beimBauen, imKern, 'Kern und Bauweg urteilen verschieden');
  });
}

test('[Erscheinungsbild·Rot-Beweis] ein Verstoß baut kein Produkt (produktTextErzeugen wirft, Auflage D)', () => {
  const schlecht = mit((m) => { m.dunkel['--modus-notfall'] = 'var(--auf-akzent)'; });
  assert.throws(() => P.produktTextErzeugen(KERN, OPT([ALS_ZUTAT(schlecht)])), /verletzt die Regeln des Kerns[\s\S]*--modus-notfall: kontrast/);
});

test('[Erscheinungsbild] mit „heute" gebacken: die Region trägt das Modul, und das Kopf-Skript nimmt es an', () => {
  const { text } = P.produktTextErzeugen(KERN, OPT([ALS_ZUTAT(HEUTE)]));
  const k = kopfSkript(text);
  assert.equal(k.ergebnis.gueltig, true);
  assert.equal(k.css(k.ergebnis).slice(0, 7), ':root{-');
});

/* Die vier Fälle (mit dem Gateway-Eigentümer abgestimmt) und die Rückwärtsverträglichkeit (Gegenlesung-Bedingung 1): derselbe produktTextErzeugen
   baut einen Kern von VOR v894 weiter vollständig. */
const kernOhneRegion = () => require('./helfer/kern-mit-erscheinungsbild.js').kernOhneErscheinungsbildRegion(KERN);

test('[Erscheinungsbild·Rezept] Kern mit Region ohne Modul wirft — kein still nacktes Produkt', () => {
  assert.throws(() => P.produktTextErzeugen(KERN, OPT([])), /das Produkt wäre nackt/);
});

test('[Erscheinungsbild·Rezept] Kern ohne Region: ohne Modul wie bisher, mit Modul wirft', () => {
  const alt = kernOhneRegion();
  assert.ok(!alt.includes('/* AB_WERK_ERSCHEINUNGSBILD_PRODUKT:BEGIN */') && alt.length < KERN.length, 'Testvoraussetzung');
  assert.doesNotThrow(() => P.produktTextErzeugen(alt, OPT([])));
  assert.throws(() => P.produktTextErzeugen(alt, OPT([ALS_ZUTAT(HEUTE)])), /Rezept und Kern passen nicht zusammen/);
});

/* Rückwärts ohne git und ohne Fixture: ein Kern in der Bauform VOR v894 — Werte und Stylesheet inline, keine Region — wird aus dem
   heutigen hergeleitet („Gerüst + heute", dann das Kopf-Skript heraus). Der Kanon-Kern selbst wäre eine 5-MB-Kopie und fehlt im
   öffentlichen Zuschnitt; geprüft wird dieselbe Bauform, in jeder Umgebung. */
test('[Erscheinungsbild·Rückwärts] ein Kern in der Bauform vor v894 baut mit dem neuen Werkzeug vollständig wie zuvor', () => {
  const H = require('./helfer/kern-mit-erscheinungsbild.js');
  const alt = H.kernOhneErscheinungsbildRegion(H.kernMitHeute(KERN));
  assert.ok(!alt.includes('<script id="erscheinungsbild">'), 'Vorbedingung: das Kopf-Skript samt Region ist heraus');
  const { text } = P.produktTextErzeugen(alt, OPT([]));
  assert.ok(text.includes('--salbei-dunkel: #4F6539;'), 'der alte Kern trägt seine Werte selbst und bleibt vollständig');
  assert.throws(() => P.produktTextErzeugen(alt, OPT([ALS_ZUTAT(HEUTE)])), /trägt keine Region/);
});

/* Die Werte des Moduls „heute“ sind die Werte vor dem Umzug, je Ebene (v894). Der Umzug darf keinen Wert verschieben; eine gewollte
   Änderung zieht die Fixture bewusst nach. Den Pixelvergleich gegen die Basis vor dem Umzug belegt ein einmaliger Werkzeuglauf
   (tools/design-bildvergleich.js --basis), keine Dauerprobe: er würde bei jeder gewollten Gestaltungsänderung rot. */
const VOR_DEM_UMZUG = JSON.parse(fs.readFileSync(path.join(REPO, 'tests', 'fixtures', 'erscheinungsbild-werte-vor-dem-umzug.json'), 'utf8'));
const werteAbweichung = (modul, soll) => ['basis', 'hochkontrast', 'dunkel'].flatMap((ebene) => {
  const ist = modul[ebene] || {};
  const namen = new Set([...Object.keys(ist), ...Object.keys(soll[ebene])]);
  return [...namen].filter((n) => ist[n] !== soll[ebene][n]).map((n) => ebene + ':' + n);
});

test('[Erscheinungsbild·Werte] jeder Token-Wert des Moduls „heute“ ist in allen drei Ebenen der Wert vor dem Umzug', () => {
  const crypto = require('node:crypto');
  const { basis, hochkontrast, dunkel } = VOR_DEM_UMZUG;
  assert.equal(crypto.createHash('sha256').update(JSON.stringify({ basis, hochkontrast, dunkel })).digest('hex'), VOR_DEM_UMZUG.pruefsumme,
    'Vorbedingung: die Fixture ist unverändert gegenüber ihrer Prüfsumme');
  assert.ok(Object.keys(basis).length > 200, 'Vorbedingung: die Werte werden gefunden');
  assert.deepEqual(werteAbweichung(HEUTE, VOR_DEM_UMZUG), []);
});

test('[Erscheinungsbild·Werte·Rot-Beweis] ein verschobener Wert in einer Ebene und ein fehlender Name werden gefunden', () => {
  const geaendert = mit((m) => { m.dunkel['--auf-akzent'] = '#ffffff'; delete m.hochkontrast[Object.keys(m.hochkontrast)[0]]; });
  const funde = werteAbweichung(geaendert, VOR_DEM_UMZUG);
  assert.ok(funde.includes('dunkel:--auf-akzent'), JSON.stringify(funde));
  assert.equal(funde.length, 2);
});
