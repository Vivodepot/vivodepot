'use strict';
/* W0, der Gerüst-Wächter (tools/geruest-waechter-pruefen.js, 20.09.2026): das Gerüst wächst nicht.
   Zwei Teile. (1) Die Messung an kleinen, synthetischen Texten: Strings mit Semikolon, Templates,
   Kommentare, Umlaute, der Namens-Präfix-Fall beim Andockpunkt, doppelte und kaputte Deklarationen.
   (2) Die Grundlinie gegen die ECHTE vivodepot.html — und der Rot-Beweis daran: 1 KB an eine
   Konstante OHNE Andockpunkt muss gefangen werden, nicht nur an eine mit. (3) Die bindende zweite
   Achse in drei Eimern (fremdcode, struktur, satz): die Sortierung an kleinen Zeichenketten, die
   Zerlegung der echten Datei (die Teile ergeben die Gesamtzahl auf das Byte) und je Eimer ein
   Rot-Beweis: 1 KB Satz unter einem Namen, der nicht AB_WERK_ heißt, trifft NUR den Satz-Eimer, 1 KB
   Kennung nur den Struktur-Eimer, 1 KB im Bibliotheksblock nur den Fremdcode-Block. Die Proben
   wählen ihre Ziele aus dem Bestand (größte Konstante ohne Marker, …) statt sie zu benennen: ein
   Schnitt, der eine Konstante entfernt, macht sie nicht rot.
   Die Konstantennamen der Proben werden aus Teilen gefügt, nicht als Literal geschrieben; die
   Prüfdatei selbst ist von nichts ausgenommen. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const {
  konstantenMessen, literaleMessen, messen, pruefen, grundlinieAktualisieren, zuwaechsePruefen, ZUWACHS_HOECHSTENS, ANDOCKPUNKT_HOECHSTENS, eimerVon, regionenPruefen, regionenProbenPruefen, grundlinieLesen, statementEnde, STANDARD_DATEI, GRUNDLINIE_PFAD,
} = require('../tools/geruest-waechter-pruefen.js');

const ab = (rest) => ['AB_WERK', rest].join('_');

/* ── (1) Messung an synthetischen Texten ─────────────────────────────────────────────────── */

test('[Gerüst-Wächter·Messung] Bytes sind UTF-8 des ganzen Statements, Umlaute zählen doppelt', () => {
  const stmt = 'const ' + ab('T') + " = 'Größe';";
  const r = konstantenMessen('var x = 1;\n' + stmt + '\nvar y = 2;\n');
  assert.deepEqual(r.probleme, []);
  assert.equal(r.konstanten.length, 1);
  assert.equal(r.konstanten[0].bytes, Buffer.byteLength(stmt, 'utf8'));
  assert.ok(r.konstanten[0].bytes > stmt.length, 'ö zählt zwei Byte, nicht eins');
});

test('[Gerüst-Wächter·Messung] ein Semikolon in String, Template und Kommentar beendet das Statement nicht', () => {
  const name = ab('KNIFFLIG');
  const stmt = 'const ' + name + ' = Object.freeze({\n'
    + "  a: 'x;y', b: \"p;q\", // Kommentar mit ; darin\n"
    + '  c: `t;${ "}" + `inner;${1}` };u`,\n'
    + '  /* Blockkommentar; */ d: JSON.parse(\'{"k":"v;w"}\'),\n'
    + '});';
  const r = konstantenMessen(stmt + '\nconst danach = 1;\n');
  assert.deepEqual(r.probleme, []);
  assert.equal(r.konstanten[0].bytes, Buffer.byteLength(stmt, 'utf8'), 'gemessen wird bis zum ECHTEN Ende, nicht bis zum ersten Semikolon');
});

test('[Gerüst-Wächter·Messung] Andockpunkt: NAME:BEGIN zählt, ein längerer Name mit demselben Anfang nicht', () => {
  const kurz = ab('BRANDING');
  const text = 'const ' + kurz + ' = {};\n/* ' + kurz + '_PRODUKT:BEGIN */\nconst ' + kurz + '_PRODUKT = null;\n';
  const r = konstantenMessen(text);
  const byName = Object.fromEntries(r.konstanten.map((k) => [k.name, k]));
  assert.equal(byName[kurz].marker, false, 'der Marker der ANDEREN Konstante darf nicht als Andockpunkt dieser gelten');
  assert.equal(byName[kurz + '_PRODUKT'].marker, true);
  const mitEigenem = konstantenMessen(text + '/* ' + kurz + ':BEGIN */\n');
  assert.equal(mitEigenem.konstanten.find((k) => k.name === kurz).marker, true);
});

test('[Gerüst-Wächter·Messung] doppelte und nicht abschließbare Deklarationen werden benannt, nicht verschluckt', () => {
  const name = ab('DOPPELT');
  const doppelt = konstantenMessen('const ' + name + ' = 1;\nlet ' + name + ' = 2;\n');
  assert.match(doppelt.probleme.join('|'), /doppelt deklariert/);
  assert.equal(doppelt.konstanten.length, 1);
  const offen = konstantenMessen('const ' + ab('OFFEN') + ' = Object.freeze({ a: 1 \n');
  assert.match(offen.probleme.join('|'), /Ende des Statements nicht gefunden/);
  assert.equal(statementEnde('const x = (1;', 10), -1, 'Semikolon in offener Klammer ist kein Ende');
});

test('[Gerüst-Wächter·Messung] ein Stück, das kein vollständiges Statement ist, ist ein Problem — kein stilles Falschmessen', () => {
  const r = konstantenMessen('const ' + ab('KAPUTT') + ' = ) ( ;\n'); // Klammern ausgeglichen, Syntax ungültig
  assert.match(r.probleme.join('|'), /kein vollständiges Statement/);
  assert.equal(r.konstanten.length, 0);
});

/* ── (2a) Literal-Messung an synthetischen Texten ───────────────────────────────────────── */

const skript = (koerper) => '<html>\n<script>\n' + koerper + '\n</script>\n</html>\n';

test('[Gerüst-Wächter·Literale] gezählt wird der Inhalt zwischen den Begrenzern; Kommentare, Bezeichner und Ausdrücke nicht', () => {
  const r = literaleMessen(skript(
    "var aaaaaaaaaa = 'abc'; // 'kommentar-text'\n/* \"block-text\" */\nvar b = \"de\" + `fg${ 1 + 2 }hi`;\nvar c = 'ö';"));
  assert.deepEqual(r.probleme, []);
  assert.equal(r.ausserhalb, Buffer.byteLength('abc' + 'de' + 'fg' + 'hi' + 'ö', 'utf8'));
  assert.equal(r.innerhalb, 0);
  assert.equal(r.literale, 5);
});

test('[Gerüst-Wächter·Literale] ein Regex-Literal mit Anführungszeichen bringt die Erkennung nicht aus dem Tritt', () => {
  const r = literaleMessen(skript("var re = /['\"]+/g;\nvar s = 'nach';\nvar q = 6 / 2 + 'x';"));
  assert.deepEqual(r.probleme, []);
  assert.equal(r.ausserhalb, 'nach'.length + 'x'.length);
});

test('[Gerüst-Wächter·Literale] innerhalb einer Marker-Region zählt es zu „innerhalb", außerhalb zu „außerhalb"', () => {
  const r = literaleMessen(skript("var a = 'aussen1';\n/* X_REGION:BEGIN */\nvar b = 'innen22';\n/* X_REGION:END */\nvar c = 'aussen3';"));
  assert.deepEqual(r.probleme, []);
  assert.equal(r.innerhalb, 'innen22'.length);
  assert.equal(r.ausserhalb, 'aussen1'.length + 'aussen3'.length);
});

test('[Gerüst-Wächter·Literale] ein BEGIN ohne END und ein nicht übersetzbarer Block sind Probleme, keine stille Zahl', () => {
  const ohneEnde = literaleMessen(skript("/* Y_REGION:BEGIN */\nvar a = 'x';"));
  assert.match(ohneEnde.probleme.join('|'), /:BEGIN ohne :END/);
  const kaputt = literaleMessen(skript("var a = ) ( ;"));
  assert.match(kaputt.probleme.join('|'), /nicht übersetzbar/);
});

test('[Gerüst-Wächter·Literale] Text außerhalb der Skriptblöcke (Markup) zählt nicht', () => {
  const r = literaleMessen('<p class="grosse-klasse">"Text" \'mehr\'</p>\n' + skript("var a = 'z';"));
  assert.equal(r.ausserhalb, 1);
});

/* ── (2a') Sortierung in die Eimer ──────────────────────────────────────────────────────── */

const KEINE = new Set();

test('[Gerüst-Wächter·Eimer] Bezeichner und kleingeschriebene Einzelwörter sind Struktur, großgeschriebene Einzelwörter Satz', () => {
  for (const s of ['string', 'object', 'deriveDepotKeyV2', 'Uint8Array', 'bereich-kopf', 'a.b.c', 'x', 'unbekannt']) assert.equal(eimerVon(s, KEINE), 'struktur', s);
  for (const s of ['Vertretungsregelung', 'Prokura', 'Ort', 'Registernummer']) assert.equal(eimerVon(s, KEINE), 'satz', s);
  assert.equal(eimerVon('Observation', new Set(['Observation'])), 'struktur', 'ein Wort der Liste technischeWoerter ist Struktur');
  assert.equal(eimerVon('Vertretungsregelung', new Set(['Observation'])), 'satz', 'die Liste nimmt nur, was namentlich in ihr steht');
});

test('[Gerüst-Wächter·Eimer] Markup, SVG, Selektoren, Klassenlisten und Style-Werte mit Leerzeichen sind Struktur', () => {
  const struktur = [
    '<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
    '<details class=\\"doku-panel\\"', '<button type=\\"button\\" class=\\"chip-weg\\" data-chip-weg aria-label=\\"',
    '#content .bereich-kopf h1', '#overlay-inhalt .welcome-kopf', 'ampel-zeile ohne-termin', 'btn btn-sek',
    'font-size:var(--fs-sm); color:var(--ink2); text-align:center">',
  ];
  for (const s of struktur) assert.equal(eimerVon(s, KEINE), 'struktur', s);
});

test('[Gerüst-Wächter·Eimer] Sätze und Markup MIT Text sind Satz: nichts, was Text trägt, geht als Struktur durch', () => {
  const satz = [
    'kein Template-Objekt', 'Ich bin Ehepartner oder Lebensgefährte dieser Person',
    '<p class="pv-dok-hinweis"><strong>Zum Wirksamwerden ausdrucken und beilegen:</strong> Diese Verfügung wird erst gültig',
    'Einhängen: der V4-Umschlag braucht genau die sechs Felder', 'nicht verfügbar', 'Kernidentität und Bereiche',
  ];
  for (const s of satz) assert.equal(eimerVon(s, KEINE), 'satz', s);
});

const BIBLIOTHEK = { name: 'lib', erkennung: { lizenzKopf: 'Beispiel-Bibliothek 1.0' }, bytes: 0 };
const BLOCK_ID = { name: 'blob', erkennung: { scriptId: 'beispiel_inline' }, bytes: 0 };

test('[Gerüst-Wächter·Eimer] die Teile ergeben die Gesamtzahl auf das Byte; Fremdcode wird an Block-Identität erkannt, nicht an den Zeichenketten', () => {
  const html = '<html>\n<script>\n/** Beispiel-Bibliothek 1.0 */\nvar l = "fremd fremd fremd";\n</script>\n'
    + '<script id="beispiel_inline">\nvar b = "auch fremd";\n</script>\n'
    + '<script>\nvar k = "kennung"; var s = "ein satzförmiger Text";\n</script>\n</html>\n';
  const r = literaleMessen(html, { fremdcode: [BIBLIOTHEK, BLOCK_ID] });
  assert.deepEqual(r.probleme, []);
  assert.equal(r.fremdcode.lib, Buffer.byteLength('fremd fremd fremd'));
  assert.equal(r.fremdcode.blob, Buffer.byteLength('auch fremd'));
  assert.equal(r.eimer.struktur, Buffer.byteLength('kennung'));
  assert.equal(r.eimer.satz, Buffer.byteLength('ein satzförmiger Text'));
  assert.equal(r.eimer.struktur + r.eimer.satz + r.fremdcode.lib + r.fremdcode.blob, r.ausserhalb);
});

test('[Gerüst-Wächter·Eimer] ein nicht eingetragener Bibliotheksblock ist NICHT still Fremdcode, und ein eingetragener, der fehlt, ist ein Problem', () => {
  const html = '<html>\n<script>\n/** Andere Bibliothek 2.0 */\nvar x = "ein deutscher Satz im fremden Block";\n</script>\n</html>\n';
  const r = literaleMessen(html, { fremdcode: [BIBLIOTHEK] });
  assert.equal(r.eimer.satz, Buffer.byteLength('ein deutscher Satz im fremden Block'), 'unbekannt heißt Inhalt');
  assert.match(r.probleme.join('|'), /Fremdcode "lib": kein Skriptblock erkannt/);
});

/* ── (2b) Grundlinie gegen die echte Datei ────────────────────────────────────────────────── */

const ECHT = fs.readFileSync(STANDARD_DATEI, 'utf8');
const KONSTANTEN = konstantenMessen(ECHT);
const GRUNDLINIE = grundlinieLesen();
const OPT = { fremdcode: GRUNDLINIE.fremdcode, technischeWoerter: GRUNDLINIE.technischeWoerter };
const LITERALE = literaleMessen(ECHT, OPT);
const ECHT_MESSUNG = { ...KONSTANTEN, probleme: [...KONSTANTEN.probleme, ...LITERALE.probleme], literale: LITERALE };
const fremdSumme = (l) => Object.values(l.fremdcode).reduce((a, b) => a + b, 0);

// Das Ergebnis für eine veränderte Datei: beide Achsen, wie die Kommandozeile sie zusammensetzt.
function messenVeraendert(text) {
  return messen(text, GRUNDLINIE);
}

// Ziele aus dem Bestand, nicht per Namen: ein Schnitt, der eine Konstante entfernt, macht die Probe nicht rot.
const NACH_GROESSE = [...KONSTANTEN.konstanten].sort((a, b) => b.bytes - a.bytes);
function eroeffnung(name) {
  const i = ECHT.indexOf('const ' + name + ' = ');
  const rest = ECHT.slice(i, i + 200);
  const m = /^const \S+ = (?:Object\.freeze\()?([{[])/.exec(rest);
  return m ? { name, klammer: m[1], pos: i + m[0].length } : null;
}
const OHNE_MARKER = NACH_GROESSE.filter((k) => !k.marker).map((k) => eroeffnung(k.name)).find(Boolean);
const MIT_MARKER = NACH_GROESSE.filter((k) => k.marker).map((k) => eroeffnung(k.name)).find(Boolean);
function mitZusatz(ziel, zusatz) {
  const eintrag = ziel.klammer === '{' ? "zz: '" + zusatz + "'," : "'" + zusatz + "',";
  return ECHT.slice(0, ziel.pos) + eintrag + ECHT.slice(ziel.pos);
}
const KENNUNG_1KB = 'k'.repeat(1024);
const SATZ_1KB = 'Ein deutscher Satz, der nicht ins Gerüst gehört. '.repeat(21).slice(0, 1024);
const alsAbschnitt = (js) => ECHT + '\n<script>\n' + js + '\n</script>\n';

test('[Gerüst-Wächter] die echte vivodepot.html entspricht EXAKT der Grundlinie — grün gelandet, Deckel scharf', () => {
  assert.deepEqual(ECHT_MESSUNG.probleme, []);
  assert.deepEqual(pruefen(ECHT_MESSUNG, GRUNDLINIE).fehler, []);
});

test('[Gerüst-Wächter] die drei Eimer der echten Datei ergeben die Gesamtzahl der Zeichenketten außerhalb der Regionen auf das Byte', () => {
  assert.equal(LITERALE.eimer.struktur + LITERALE.eimer.satz + fremdSumme(LITERALE), LITERALE.ausserhalb);
  assert.ok(LITERALE.eimer.struktur > 0 && LITERALE.eimer.satz > 0 && fremdSumme(LITERALE) > 0, 'jeder Eimer ist belegt gemessen');
});

test('[Gerüst-Wächter] die Positivliste hängt an den Konstanten: sie führt auch die ohne Andockpunkt, mit Deckel', () => {
  const ohne = GRUNDLINIE.konstanten.filter((k) => !k.marker);
  // Die Untergrenze war die damals gemessene Zahl (5) und fiel mit jedem Schnitt, der eine markerlose Konstante entfernt (Schema 87: AB_WERK_AUSZUG_BUNDLE_TEXTE).
  // Gemeint ist nur: es gibt mehrere, die zweite Spalte ist eigen — nicht: es müssen so viele bleiben.
  assert.ok(ohne.length >= 2, 'mehrere Konstanten ohne Marker sind gedeckelt: die zweite Spalte ist eigen');
  assert.ok(GRUNDLINIE.konstanten.every((k) => Number.isInteger(k.bytes)), 'jede Konstante trägt einen Deckel, keine Lücke');
  const groesster = NACH_GROESSE[0];
  assert.equal(GRUNDLINIE.konstanten.find((k) => k.name === groesster.name).bytes, groesster.bytes, 'der größte Posten steht mit exaktem Deckel drin');
  assert.ok(Number.isInteger(GRUNDLINIE.eimer.struktur.bytes) && Number.isInteger(GRUNDLINIE.eimer.satz.bytes));
});

test('[Gerüst-Wächter] jeder Fremdcode-Block trägt Herkunft und Erkennung namentlich, und der Grundlinie fehlt kein Eintrag', () => {
  assert.ok(GRUNDLINIE.fremdcode.length >= 3);
  for (const r of GRUNDLINIE.fremdcode) {
    assert.ok(r.name && r.herkunft && r.herkunft.length >= 30, r.name + ': Herkunft');
    assert.ok(r.erkennung && (r.erkennung.scriptId || r.erkennung.lizenzKopf), r.name + ': Erkennung über id oder Lizenzkopf, nie über Zeichenketten');
    assert.ok(Number.isInteger(r.bytes) && r.bytes >= 0);
  }
  assert.ok(Array.isArray(GRUNDLINIE.technischeWoerter) && GRUNDLINIE.technischeWoerter.length > 10);
});

test('[Gerüst-Wächter·Rot-Beweis] 1 KB an eine gedeckelte Konstante OHNE Andockpunkt wird gefangen (an der echten Grundlinie)', () => {
  assert.ok(OHNE_MARKER, 'Vorbedingung: es gibt eine gedeckelte Konstante ohne Marker');
  const r = pruefen(messenVeraendert(mitZusatz(OHNE_MARKER, KENNUNG_1KB)), GRUNDLINIE);
  const fund = r.fehler.find((f) => f.startsWith(OHNE_MARKER.name));
  assert.ok(fund, 'Fängt der Wächter nur Konstanten mit Andockpunkt, ist er nicht fertig. Funde: ' + JSON.stringify(r.fehler));
  assert.match(fund, /wächst um \d+ Byte/);
});

test('[Gerüst-Wächter·Rot-Beweis] dasselbe an einer Konstante MIT Andockpunkt wird ebenfalls gefangen', () => {
  assert.ok(MIT_MARKER, 'Vorbedingung: es gibt eine gedeckelte Konstante mit Marker');
  const r = pruefen(konstantenMessen(mitZusatz(MIT_MARKER, KENNUNG_1KB)), GRUNDLINIE);
  assert.ok(r.fehler.some((f) => f.startsWith(MIT_MARKER.name) && /wächst um/.test(f)), JSON.stringify(r.fehler));
});

test('[Gerüst-Wächter·Rot-Beweis] 1 KB SATZ unter einem Namen, der nicht AB_WERK_ heißt, trifft NUR den Satz-Eimer: die erste Achse schweigt', () => {
  const messung = messenVeraendert(alsAbschnitt('const _zwischenkonstante = "' + SATZ_1KB + '";'));
  assert.deepEqual(messung.probleme, []);
  const r = pruefen(messung, GRUNDLINIE);
  assert.ok(r.fehler.some((f) => f.startsWith('eimer.satz: satzförmige Zeichenketten wachsen um ' + Buffer.byteLength(SATZ_1KB) + ' Byte')), JSON.stringify(r.fehler));
  assert.ok(!r.fehler.some((f) => f.startsWith('eimer.struktur') || f.startsWith('fremdcode.')), 'nur der Satz-Eimer schlägt an');
  assert.ok(!r.fehler.some((f) => f.startsWith('AB_WERK_')), 'die erste Achse schweigt dazu — genau darum gibt es die zweite: ' + JSON.stringify(r.fehler));
});

test('[Gerüst-Wächter·Rot-Beweis] 1 KB KENNUNG trifft NUR den Struktur-Eimer und nennt den Weg des benannten Zuwachses', () => {
  const r = pruefen(messenVeraendert(alsAbschnitt('const _kennungen = "' + KENNUNG_1KB + '";')), GRUNDLINIE);
  const fund = r.fehler.find((f) => f.startsWith('eimer.struktur: wächst um 1024 Byte'));
  assert.ok(fund, JSON.stringify(r.fehler));
  assert.match(fund, /--anhebung struktur --grund/);
  assert.ok(!r.fehler.some((f) => f.startsWith('eimer.satz')), 'der Satz-Eimer bleibt still');
});

test('[Gerüst-Wächter·Rot-Beweis] 1 KB im Bibliotheksblock trifft NUR diesen Fremdcode-Block, und ein NEUER Block ohne Eintrag ist nicht Fremdcode', () => {
  const lib = GRUNDLINIE.fremdcode.find((r) => r.erkennung.lizenzKopf) || GRUNDLINIE.fremdcode[0];
  const marke = lib.erkennung.lizenzKopf || ('id="' + lib.erkennung.scriptId + '"');
  const i = ECHT.indexOf(marke);
  const ende = ECHT.indexOf('\n', ECHT.indexOf('*/', i));
  const veraendert = ECHT.slice(0, ende + 1) + 'var _zz = "' + KENNUNG_1KB + '";\n' + ECHT.slice(ende + 1);
  const r = pruefen(messenVeraendert(veraendert), GRUNDLINIE);
  assert.ok(r.fehler.some((f) => f.startsWith('fremdcode.' + lib.name + ': wächst um 1024 Byte')), JSON.stringify(r.fehler));
  assert.ok(!r.fehler.some((f) => f.startsWith('eimer.')), 'die Eimer bleiben still');
  const neuerBlock = pruefen(messenVeraendert(alsAbschnitt('/** Fremde Bibliothek 9.9 */ const _f = "' + SATZ_1KB + '";')), GRUNDLINIE);
  assert.ok(neuerBlock.fehler.some((f) => f.startsWith('eimer.satz')), 'unbekannt heißt Inhalt, rot statt still');
});

test('[Gerüst-Wächter·Rot-Beweis] Zeichenketten INNERHALB einer Marker-Region heben die zweite Achse nicht (die erste deckelt sie dort)', () => {
  assert.ok(MIT_MARKER);
  const l = literaleMessen(mitZusatz(MIT_MARKER, SATZ_1KB), OPT);
  assert.equal(l.ausserhalb, LITERALE.ausserhalb, 'die Region ist der erlaubte Ort; die erste Achse deckelt sie dort');
});

test('[Gerüst-Wächter·Rot-Beweis] ein Fremdcode-Register mit einem Block, den es nicht gibt, ist ein Problem, keine stille Null', () => {
  const m = messen(ECHT, { fremdcode: [...GRUNDLINIE.fremdcode, { name: 'geist', erkennung: { scriptId: 'gibt_es_nicht' }, bytes: 1 }], technischeWoerter: GRUNDLINIE.technischeWoerter });
  assert.match(m.probleme.join('|'), /Fremdcode "geist": kein Skriptblock erkannt/);
});

test('[Gerüst-Wächter·Rot-Beweis] eine NEUE AB_WERK-Konstante ist ein Fund (die Positivliste wächst nicht von selbst)', () => {
  const neu = ab('NEU_UNBEKANNT');
  const r = pruefen(konstantenMessen(ECHT + '\nconst ' + neu + ' = 1;\n'), GRUNDLINIE);
  assert.ok(r.fehler.some((f) => f.startsWith(neu) && /NEUE AB_WERK-Konstante/.test(f)), JSON.stringify(r.fehler));
});

test('[Gerüst-Wächter·Rot-Beweis] ein verlorener Andockpunkt ist ein Fund', () => {
  const eine = GRUNDLINIE.konstanten.find((k) => k.marker);
  assert.ok(eine, 'Vorbedingung: eine Konstante trägt einen Andockpunkt');
  const ohneMarker = ECHT.split(eine.name + ':BEGIN').join(eine.name + '_BEGIN');
  const r = pruefen(konstantenMessen(ohneMarker), GRUNDLINIE);
  assert.ok(r.fehler.some((f) => f.startsWith(eine.name) && /Andockpunkt .* verloren/.test(f)), JSON.stringify(r.fehler));
});

test('[Gerüst-Wächter·Rot-Beweis] ein zu hoher Deckel ist ein Fund — sonst wäre der Rot-Beweis auslöseunfähig (jeder Eimer und jede Konstante)', () => {
  const ziel = NACH_GROESSE[0].name;
  const zuHoch = { ...GRUNDLINIE, konstanten: GRUNDLINIE.konstanten.map((k) => (k.name === ziel ? { ...k, bytes: k.bytes + 1024 } : k)) };
  assert.ok(pruefen(ECHT_MESSUNG, zuHoch).fehler.some((f) => f.startsWith(ziel) && /Deckel zu hoch/.test(f)));
  for (const art of ['struktur', 'satz']) {
    const g = { ...GRUNDLINIE, eimer: { ...GRUNDLINIE.eimer, [art]: { bytes: GRUNDLINIE.eimer[art].bytes + 1024 } } };
    assert.ok(pruefen(ECHT_MESSUNG, g).fehler.some((f) => f.startsWith('eimer.' + art) && /Deckel zu hoch/.test(f)), art);
  }
  const f0 = GRUNDLINIE.fremdcode[0];
  const g = { ...GRUNDLINIE, fremdcode: GRUNDLINIE.fremdcode.map((r) => (r === f0 ? { ...r, bytes: r.bytes + 1024 } : r)) };
  assert.ok(pruefen(ECHT_MESSUNG, g).fehler.some((f) => f.startsWith('fremdcode.' + f0.name) && /Deckel zu hoch/.test(f)));
});

test('[Gerüst-Wächter·Rot-Beweis] eine Konstante, die aus dem Gerüst verschwunden ist, lässt ihre Zeile in der Positivliste als Fund stehen', () => {
  const mitGeist = { ...GRUNDLINIE, konstanten: [...GRUNDLINIE.konstanten, { name: ab('GEIST'), bytes: 10, marker: false }] };
  const r = pruefen(ECHT_MESSUNG, mitGeist);
  assert.ok(r.fehler.some((f) => f.startsWith(ab('GEIST')) && /nicht mehr im Gerüst/.test(f)), JSON.stringify(r.fehler));
});

test('[Gerüst-Wächter·Rot-Beweis] eine Grundlinie ohne die Eimer ist ein Fund, kein Freibrief', () => {
  const r = pruefen(ECHT_MESSUNG, { konstanten: GRUNDLINIE.konstanten, zuwaechse: [] });
  assert.ok(r.fehler.some((f) => /eimer: die Grundlinie führt/.test(f)), JSON.stringify(r.fehler));
});

/* ── Die Ratsche: die Grundlinie kann nur sinken ────────────────────────────────────────── */

test('[Gerüst-Wächter·Ratsche] die erste Messung ohne alte Grundlinie wird übernommen, alle Eimer', () => {
  const r = grundlinieAktualisieren(ECHT_MESSUNG, null);
  assert.equal(r.ok, true);
  assert.equal(r.konstanten.length, ECHT_MESSUNG.konstanten.length);
  assert.equal(r.eimer.struktur.bytes, LITERALE.eimer.struktur);
  assert.equal(r.eimer.satz.bytes, LITERALE.eimer.satz);
});

// Eine Messung, in der ein Eimer um `mehr` wächst und die größte Konstante um `weniger` sinkt: der Fall,
// der früher die ganze Grundlinie sperrte, obwohl der Bestand netto sank.
const GROESSTE = NACH_GROESSE[0].name;
function messungMit(art, mehr, weniger = 0) {
  return {
    ...ECHT_MESSUNG,
    konstanten: ECHT_MESSUNG.konstanten.map((k) => (k.name === GROESSTE ? { ...k, bytes: k.bytes - weniger } : k)),
    literale: { ...LITERALE, eimer: { ...LITERALE.eimer, [art]: LITERALE.eimer[art] + mehr } },
  };
}
const BASIS = { ...GRUNDLINIE, zuwaechse: [] };
const GRUND = 'Sechs Typ-Kennungen des Namensraum-Schutzes: Struktur, auf die der Kern verzweigt, kein Inhalt.';
const alsGrundlinie = (r) => ({ konstanten: r.konstanten, eimer: r.eimer, fremdcode: r.fremdcode, technischeWoerter: r.technischeWoerter, regionen: r.regionen, zuwaechse: r.zuwaechse });

test('[Gerüst-Wächter·Ratsche] Senken und Streichen sind erlaubt', () => {
  const hoehere = {
    ...BASIS,
    konstanten: [...BASIS.konstanten.map((k) => ({ ...k, bytes: k.bytes + 500 })), { name: ab('GEIST'), bytes: 9, marker: false }],
    eimer: { struktur: { bytes: LITERALE.eimer.struktur + 500 }, satz: { bytes: LITERALE.eimer.satz + 500 } },
    fremdcode: BASIS.fremdcode.map((r) => ({ ...r, bytes: r.bytes + 500 })),
  };
  const r = grundlinieAktualisieren(ECHT_MESSUNG, hoehere);
  assert.equal(r.ok, true, JSON.stringify(r.verweigert));
  assert.deepEqual(r.konstanten.map((k) => k.bytes), ECHT_MESSUNG.konstanten.map((k) => k.bytes));
  assert.equal(r.eimer.satz.bytes, LITERALE.eimer.satz);
  assert.equal(r.eimer.struktur.bytes, LITERALE.eimer.struktur);
  assert.ok(!r.konstanten.some((k) => k.name === ab('GEIST')), 'die verschwundene Konstante ist gestrichen');
});

test('[Gerüst-Wächter·Ratsche·Rot-Beweis] Anheben ohne Schalter, neue Konstante und verlorener Andockpunkt werden VERWEIGERT, auch bei netto sinkendem Bestand', () => {
  const anheben = grundlinieAktualisieren(messungMit('struktur', 59, 5000), BASIS);
  assert.equal(anheben.ok, false);
  assert.match(anheben.verweigert.join('|'), /eimer|struktur/);
  assert.ok(anheben.verweigert.some((v) => v.startsWith('struktur: Deckel würde von')), JSON.stringify(anheben.verweigert));

  const neu = grundlinieAktualisieren(konstantenMessen(ECHT + '\nconst ' + ab('NEU') + ' = 1;\n'), BASIS);
  assert.equal(neu.ok, false);
  assert.match(neu.verweigert.join('|'), /neue Konstante/);

  const eine = BASIS.konstanten.find((k) => k.marker);
  const ohneMarker = konstantenMessen(ECHT.split(eine.name + ':BEGIN').join(eine.name + '_BEGIN'));
  const verloren = grundlinieAktualisieren(ohneMarker, BASIS);
  assert.equal(verloren.ok, false);
  assert.match(verloren.verweigert.join('|'), /Andockpunkt verloren/);
});

/* ── Der benannte Zuwachs ────────────────────────────────────────────────────────────────── */

test('[Gerüst-Wächter·Zuwachs] die echte Grundlinie führt die Zuwächse; ihre Einträge sind vollständig und begründet', () => {
  assert.ok(Array.isArray(GRUNDLINIE.zuwaechse));
  assert.deepEqual(zuwaechsePruefen(GRUNDLINIE), []);
  assert.equal(GRUNDLINIE.anhebungenDeckel, undefined, 'die Zählung der Anhebungen ist entfallen: der Deckel selbst begrenzt');
  assert.equal(GRUNDLINIE.ausserhalbRegionen, undefined, 'die eine Zahl ist in drei Eimer zerlegt');
});

test('[Gerüst-Wächter·Zuwachs·Rot-Beweis] ein Zuwachs OHNE Grund, ein unvollständiger, ein zu großer und einer am Satz-Eimer sind rot', () => {
  const gut = { ziel: 'struktur', von: 100, auf: 159, daneben: { satz: -41 }, grund: GRUND };
  assert.deepEqual(zuwaechsePruefen({ zuwaechse: [gut] }), []);
  assert.match(zuwaechsePruefen({ zuwaechse: [{ ...gut, grund: '' }] }).join('|'), /OHNE Grund/);
  assert.match(zuwaechsePruefen({ zuwaechse: [{ ...gut, grund: 'zu kurz' }] }).join('|'), /OHNE Grund/);
  assert.match(zuwaechsePruefen({ zuwaechse: [{ ziel: 'struktur', grund: GRUND }] }).join('|'), /unvollständig/);
  assert.match(zuwaechsePruefen({ zuwaechse: [{ ...gut, auf: gut.von + ZUWACHS_HOECHSTENS + 1 }] }).join('|'), /erlaubt sind höchstens/);
  assert.match(zuwaechsePruefen({ zuwaechse: [{ ...gut, ziel: 'satz' }] }).join('|'), /keinen Zuwachs, nie/);
  assert.deepEqual(zuwaechsePruefen({ zuwaechse: [{ ...gut, ziel: 'fremdcode:lib', von: 0, auf: 50000 }] }), [], 'eine Bibliotheks-Aktualisierung darf beliebig wachsen, benannt');
  assert.match(zuwaechsePruefen({}).join('|'), /führt die benannten Zuwächse nicht/);
  assert.match(zuwaechsePruefen({ zuwaechse: [{ ziel: 'struktur', von: 100, auf: 159, grund: GRUND }] }).join('|'), /unvollständig.*`daneben`/, 'ohne `daneben` ist der Eintrag unvollständig');
  assert.deepEqual(zuwaechsePruefen({ zuwaechse: [{ ...gut, daneben: {} }] }), [], 'ein Lauf, in dem nur ein Eimer sich bewegt, hat ein leeres `daneben`');
  assert.match(zuwaechsePruefen({ zuwaechse: [{ ...gut, daneben: { struktur: 5 } }] }).join('|'), /nennt das eigene Ziel/);
  assert.match(zuwaechsePruefen({ zuwaechse: [{ ...gut, daneben: { irgendwas: 5 } }] }).join('|'), /unvollständig/, 'ein Schlüssel, der kein Eimer ist, ist kein `daneben`');
  assert.match(zuwaechsePruefen({ zuwaechse: [{ ...gut, daneben: { satz: '-41' } }] }).join('|'), /unvollständig/, 'je Eimer eine Zahl, kein Text');
});

test('[Gerüst-Wächter·Zuwachs·Rot-Beweis] ein Eintrag mit `netto` ist rot: eine Zahl über zwei Eimer ist eine Bilanz, kein Zuwachs und keine Senkung', () => {
  const gut = { ziel: 'struktur', von: 100, auf: 159, daneben: { satz: -41 }, grund: GRUND };
  const fund = zuwaechsePruefen({ zuwaechse: [{ ...gut, netto: 18 }] }).join('|');
  assert.match(fund, /trägt `netto`.*Bilanz/);
  // auch mit einer richtigen Zahl daneben: das Feld selbst ist der Fund, nicht sein Wert.
  assert.match(zuwaechsePruefen({ zuwaechse: [{ ...gut, netto: 59 }] }).join('|'), /trägt `netto`/);
});

test('[Gerüst-Wächter·Zuwachs] KEIN Eintrag der echten Grundlinie trägt `netto`, und die Werkzeug-Ausgabe kennt keine Summe über Eimer', () => {
  for (const [i, e] of GRUNDLINIE.zuwaechse.entries()) {
    assert.equal(Object.prototype.hasOwnProperty.call(e, 'netto'), false, 'zuwaechse[' + i + '] (' + e.ziel + ') trägt netto');
  }
  const r = grundlinieAktualisieren(messungMit('struktur', 59, 5000), BASIS, { anhebungen: [{ ziel: 'struktur', grund: GRUND }] });
  assert.equal(Object.prototype.hasOwnProperty.call(r, 'netto'), false, 'das Ergebnis führt keine Summe');
  for (const e of r.zuwaechse) assert.equal(Object.prototype.hasOwnProperty.call(e, 'netto'), false);
});

test('[Gerüst-Wächter·Zuwachs] mit Schalter und Grund: der Zuwachs wird benannt eingetragen, die Senkungen kommen im selben Lauf mit, die Änderung der anderen Eimer steht je Eimer unter `daneben`', () => {
  const r = grundlinieAktualisieren(messungMit('struktur', 59, 5000), BASIS, { anhebungen: [{ ziel: 'struktur', grund: GRUND }] });
  assert.equal(r.ok, true, JSON.stringify(r.verweigert));
  assert.equal(r.zuwaechse.length, 1);
  assert.deepEqual(r.zuwaechse[0], { ziel: 'struktur', von: LITERALE.eimer.struktur, auf: LITERALE.eimer.struktur + 59, daneben: {}, grund: GRUND });
  assert.equal(r.eimer.struktur.bytes, LITERALE.eimer.struktur + 59);
  assert.equal(r.konstanten.find((k) => k.name === GROESSTE).bytes, BASIS.konstanten.find((k) => k.name === GROESSTE).bytes - 5000, 'die Senkung ist im selben Lauf drin');
  assert.deepEqual(pruefen(messungMit('struktur', 59, 5000), alsGrundlinie(r)).fehler, [], 'mit der neuen Grundlinie ist die Messung grün');
});

test('[Gerüst-Wächter·Zuwachs·Rot-Beweis] wächst struktur und sinkt satz im selben Lauf, steht jeder Eimer für sich da — keine der beiden Zahlen geht in einer Summe unter', () => {
  const messung = {
    ...ECHT_MESSUNG,
    literale: { ...LITERALE, eimer: { struktur: LITERALE.eimer.struktur + 179, satz: LITERALE.eimer.satz - 42 } },
  };
  const r = grundlinieAktualisieren(messung, BASIS, { anhebungen: [{ ziel: 'struktur', grund: GRUND }] });
  assert.equal(r.ok, true, JSON.stringify(r.verweigert));
  assert.deepEqual(r.zuwaechse, [{ ziel: 'struktur', von: LITERALE.eimer.struktur, auf: LITERALE.eimer.struktur + 179, daneben: { satz: -42 }, grund: GRUND }],
    'Zuwachs +179 im Ziel, Senkung −42 unter daneben; die Summe 137 kommt nirgends vor');
  assert.deepEqual(r.aenderung, { struktur: 179, satz: -42 });
  assert.equal(JSON.stringify(r).includes('137'), false, 'die verrechnete Zahl steht nicht im Ergebnis');
  assert.deepEqual(zuwaechsePruefen(alsGrundlinie(r)), []);
  assert.deepEqual(pruefen(messung, alsGrundlinie(r)).fehler, [], 'mit der neuen Grundlinie ist die Messung grün');
  // ein Fremdcode-Block, der im selben Lauf sinkt, steht unter seinem eigenen Namen
  const f0 = BASIS.fremdcode[0];
  const mitFremd = { ...messung, literale: { ...messung.literale, fremdcode: { ...LITERALE.fremdcode, [f0.name]: f0.bytes - 10 } } };
  const r2 = grundlinieAktualisieren(mitFremd, BASIS, { anhebungen: [{ ziel: 'struktur', grund: GRUND }] });
  assert.deepEqual(r2.zuwaechse[0].daneben, { satz: -42, ['fremdcode:' + f0.name]: -10 });
});

test('[Gerüst-Wächter·Zuwachs·Rot-Beweis] am Satz-Eimer wird NIE angehoben, auch nicht mit Schalter und Grund', () => {
  const r = grundlinieAktualisieren(messungMit('satz', 30), BASIS, { anhebungen: [{ ziel: 'satz', grund: GRUND }] });
  assert.equal(r.ok, false);
  assert.match(r.verweigert.join('|'), /nie eine Ausnahme/);
});

test('[Gerüst-Wächter·Zuwachs·Rot-Beweis] ohne Grund, für ein Ziel, das nicht wächst, und über der Größe wird nichts geschrieben', () => {
  const ohneGrund = grundlinieAktualisieren(messungMit('struktur', 59), BASIS, { anhebungen: [{ ziel: 'struktur' }] });
  assert.equal(ohneGrund.ok, false);
  assert.match(ohneGrund.verweigert.join('|'), /ohne Grund/);
  const nichtWachsend = grundlinieAktualisieren(messungMit('struktur', 59), BASIS, {
    anhebungen: [{ ziel: 'struktur', grund: GRUND }, { ziel: GROESSTE, grund: GRUND }],
  });
  assert.equal(nichtWachsend.ok, false);
  assert.match(nichtWachsend.verweigert.join('|'), /wächst nicht/, 'ein Zuwachs, der nichts anhebt, wird nicht eingetragen');
  const zuGross = grundlinieAktualisieren(messungMit('struktur', ZUWACHS_HOECHSTENS + 1), BASIS, { anhebungen: [{ ziel: 'struktur', grund: GRUND }] });
  assert.equal(zuGross.ok, false);
  assert.match(zuGross.verweigert.join('|'), /höchstens/);
});

test('[Gerüst-Wächter·Zuwachs] es gibt keine Anzahl-Grenze: ein zweiter, wieder benannter Zuwachs ist möglich, und die Liste wächst', () => {
  const erste = grundlinieAktualisieren(messungMit('struktur', 59), BASIS, { anhebungen: [{ ziel: 'struktur', grund: GRUND }] });
  assert.equal(erste.ok, true);
  const zweite = grundlinieAktualisieren(messungMit('struktur', 159), alsGrundlinie(erste), { anhebungen: [{ ziel: 'struktur', grund: GRUND }] });
  assert.equal(zweite.ok, true, JSON.stringify(zweite.verweigert));
  assert.equal(zweite.zuwaechse.length, 2);
});

test('[Gerüst-Wächter·Zuwachs] ein Fremdcode-Block darf bei einer Bibliotheks-Aktualisierung wachsen, benannt und ohne Größengrenze', () => {
  const lib = BASIS.fremdcode[0];
  const messung = { ...ECHT_MESSUNG, literale: { ...LITERALE, fremdcode: { ...LITERALE.fremdcode, [lib.name]: lib.bytes + 20000 } } };
  const ohne = grundlinieAktualisieren(messung, BASIS);
  assert.equal(ohne.ok, false);
  const mit = grundlinieAktualisieren(messung, BASIS, { anhebungen: [{ ziel: 'fremdcode:' + lib.name, grund: 'Aktualisierung von ' + lib.name + ' auf eine neuere Version, Herkunft im Register.' }] });
  assert.equal(mit.ok, true, JSON.stringify(mit.verweigert));
  assert.equal(mit.fremdcode.find((r) => r.name === lib.name).bytes, lib.bytes + 20000);
});

/* ── Der Sollwert der Marker-Regionen ────────────────────────────────────────────────────── */

const R = GRUNDLINIE.regionen;
const echterInhalt = (pfad) => { const f = path.join(__dirname, '..', pfad); return fs.existsSync(f) ? fs.readFileSync(f, 'utf8') : null; };
const inListe = (name) => [...R.uebergang, ...R.dauerhaft].some((e) => e.name === name);
const UEBER = { name: 'X_REGION', satz: 100, posten: 'S9', probe: 'tests/synthetisch.test.js' };
const DAUER = { name: 'Y_REGION', satz: 50, grund: 'Ein Lizenztext, den wir führen müssen; das Weglassen wäre falsch.', probe: 'tests/synthetisch.test.js' };
const regionenGrund = (uebergang, dauerhaft, deckel = uebergang.length) => ({ uebergangDeckel: deckel, uebergang, dauerhaft });

test('[Gerüst-Wächter·Regionen] die Messung ordnet die Zeichenketten der Region zu, in dieselben Eimer', () => {
  const html = '<html>\n<script>\n/* R1:BEGIN */\nconst a = "kennung"; const b = "ein satzförmiger Text";\n/* R1:END */\nconst c = "aussen";\n</script>\n</html>\n';
  const r = literaleMessen(html, {});
  assert.deepEqual(r.regionen, { R1: { struktur: Buffer.byteLength('kennung'), satz: Buffer.byteLength('ein satzförmiger Text'), fremdcode: 0 } });
  assert.equal(r.innerhalb, Buffer.byteLength('kennung') + Buffer.byteLength('ein satzförmiger Text'));
  assert.equal(r.ausserhalb, Buffer.byteLength('aussen'));
});

test('[Gerüst-Wächter·Regionen] die echte Grundlinie führt den Sollwert, ihre Einträge sind belegt und die Probe jeder Zeile hängt an ihrer Region', () => {
  assert.deepEqual(pruefen(ECHT_MESSUNG, GRUNDLINIE).fehler, []);
  assert.deepEqual(regionenProbenPruefen(R, echterInhalt), []);
  // Ratschen der Zahlen: sie zu erhöhen heißt, diese Zeilen bewusst zu ändern.
  assert.ok(R.uebergangDeckel <= 2, 'die Zahl der Übergänge kann nur sinken');
  assert.equal(R.uebergangDeckel, R.uebergang.length, 'exakt, kein Puffer');
  // ANGEHOBEN von 1 auf 2 am 21.09.2026, mit Grund: es bleibt EINE Sorte — Lizenz- und Urheberhinweise, Text, den wir führen müssen. Neben den Codelisten (CODE-LISTEN)
  // steht jetzt die Urheberangabe am Herkunftsort (HERKUNFTSORT-ANGABEN: Name der Urheberin und Lizenzkennung, Spezifikation 34.7); beide sind Hinweise, deren Weglassen
  // falsch wäre. Eine dritte Sorte wäre ein neuer Beschluss, kein weiterer Eintrag: die Namen sind darum namentlich festgehalten.
  assert.ok(R.dauerhaft.length <= 2, 'dauerhaft über 0 darf nur die Lizenz- und Urheberhinweise stehen');
  assert.deepEqual(R.dauerhaft.map((e) => e.name).sort(), ['CODE-LISTEN', 'HERKUNFTSORT-ANGABEN'], 'jede dauerhafte Region ist ein Lizenz- oder Urheberhinweis, benannt');
  for (const e of R.dauerhaft) assert.ok(e.satz > 0 && e.grund.length >= 40, e.name);
});

test('[Gerüst-Wächter·Regionen·Rot-Beweis] satzförmiger Inhalt in einer Region, die in keiner Liste steht, ist rot', () => {
  const ziel = NACH_GROESSE.filter((k) => k.marker && !inListe(k.name)).map((k) => eroeffnung(k.name)).find(Boolean);
  assert.ok(ziel, 'Vorbedingung: es gibt eine Region mit Konstante, die nicht in den Listen steht');
  const messung = messenVeraendert(mitZusatz(ziel, SATZ_1KB));
  const r = pruefen(messung, GRUNDLINIE);
  assert.ok(r.fehler.some((f) => f.startsWith('regionen.' + ziel.name + ': trägt') && /Sollwert jeder Region ist 0/.test(f)), JSON.stringify(r.fehler));
  assert.ok(!r.fehler.some((f) => f.startsWith('eimer.')), 'der Satz liegt IN der Region: die zweite Achse sieht ihn nicht, der Sollwert schon');
});

test('[Gerüst-Wächter·Regionen·Rot-Beweis] Wachstum eines Übergangs, ein Übergang bei 0, ein zu hoher Deckel, ein dauerhafter Sollwert ohne Inhalt sind rot', () => {
  const g = regionenGrund([UEBER], [DAUER]);
  assert.deepEqual(regionenPruefen({ X_REGION: { satz: 100 }, Y_REGION: { satz: 50 } }, g), []);
  assert.match(regionenPruefen({ X_REGION: { satz: 130 }, Y_REGION: { satz: 50 } }, g).join('|'), /wächst um 30 Byte über den Deckel.*nie einen Zuwachs/);
  assert.match(regionenPruefen({ X_REGION: { satz: 60 }, Y_REGION: { satz: 50 } }, g).join('|'), /Deckel zu hoch/);
  assert.match(regionenPruefen({ Y_REGION: { satz: 50 } }, g).join('|'), /bei 0 angekommen — Zeile streichen/);
  assert.match(regionenPruefen({ X_REGION: { satz: 100 } }, g).join('|'), /nicht mehr da/);
  assert.match(regionenPruefen({ X_REGION: { satz: 100 }, Y_REGION: { satz: 50 }, Z_REGION: { satz: 7 } }, g).join('|'), /regionen\.Z_REGION: trägt 7 Byte/);
});

test('[Gerüst-Wächter·Regionen·Rot-Beweis] ein Übergang ohne Posten, ohne Probe, ein dauerhafter ohne Grund und eine falsche Zahl sind rot', () => {
  const gem = { X_REGION: { satz: 100 }, Y_REGION: { satz: 50 } };
  assert.match(regionenPruefen(gem, regionenGrund([{ ...UEBER, posten: '' }], [DAUER])).join('|'), /ohne Posten/);
  assert.match(regionenPruefen(gem, regionenGrund([{ ...UEBER, probe: undefined }], [DAUER])).join('|'), /ohne Probe/);
  assert.match(regionenPruefen(gem, regionenGrund([UEBER], [{ ...DAUER, grund: 'kurz' }])).join('|'), /ohne Grund/);
  assert.match(regionenPruefen(gem, regionenGrund([UEBER], [DAUER], 2)).join('|'), /Deckel senken/);
  assert.match(regionenPruefen(gem, regionenGrund([UEBER], [DAUER], 0)).join('|'), /kann nur sinken/);
  assert.match(regionenPruefen(gem, regionenGrund([UEBER], [{ ...DAUER, name: 'X_REGION' }])).join('|'), /UND dauerhaft/);
  assert.match(regionenPruefen(gem, undefined).join('|'), /führt den Sollwert der Marker-Regionen/);
});

test('[Gerüst-Wächter·Regionen·Rot-Beweis] eine Probe, die es nicht gibt oder die die Region nicht nennt, ist rot', () => {
  const g = regionenGrund([UEBER], [DAUER]);
  assert.match(regionenProbenPruefen(g, () => null).join('|'), /gibt es nicht/);
  assert.match(regionenProbenPruefen(g, () => '// prüft etwas ganz anderes').join('|'), /nennt die Region nicht/);
  assert.deepEqual(regionenProbenPruefen(g, () => '// X_REGION und Y_REGION'), []);
});

test('[Gerüst-Wächter·Regionen·Ratsche] Senken und Erreichen von 0 sind erlaubt: die Zeile verschwindet, der Deckel sinkt mit', () => {
  const alt = { ...GRUNDLINIE, regionen: regionenGrund([UEBER, { ...UEBER, name: 'W_REGION', satz: 40 }], [DAUER]) };
  const messung = { ...ECHT_MESSUNG, literale: { ...LITERALE, regionen: { X_REGION: { satz: 60 }, W_REGION: { satz: 0 }, Y_REGION: { satz: 50 } } } };
  const r = grundlinieAktualisieren(messung, alt);
  assert.equal(r.ok, true, JSON.stringify(r.verweigert));
  assert.deepEqual(r.regionen.uebergang.map((e) => [e.name, e.satz]), [['X_REGION', 60]]);
  assert.equal(r.regionen.uebergangDeckel, 1);
  assert.equal(r.regionen.dauerhaft[0].satz, 50);
});

test('[Gerüst-Wächter·Regionen·Ratsche·Rot-Beweis] Anheben, eine neue Region mit Satz und ein verschwundener dauerhafter Inhalt werden VERWEIGERT', () => {
  const alt = { ...GRUNDLINIE, regionen: regionenGrund([UEBER], [DAUER]) };
  const mit = (regionen) => grundlinieAktualisieren({ ...ECHT_MESSUNG, literale: { ...LITERALE, regionen } }, alt);
  assert.match((mit({ X_REGION: { satz: 130 }, Y_REGION: { satz: 50 } }).verweigert || []).join('|'), /Deckel würde von 100 auf 130 steigen/);
  assert.match((mit({ X_REGION: { satz: 100 }, Y_REGION: { satz: 50 }, N_REGION: { satz: 5 } }).verweigert || []).join('|'), /neue Region mit 5 Byte/);
  assert.match((mit({ X_REGION: { satz: 100 } }).verweigert || []).join('|'), /Inhalt ist weg/);
});

/* ── Die Kommandozeile ──────────────────────────────────────────────────────────────────── */

const WERKZEUG = path.join(__dirname, '..', 'tools', 'geruest-waechter-pruefen.js');

test('[Gerüst-Wächter·CLI] ohne Argument prüft sie die Datei im Repo: Exit 0, die Eimer stehen in der Ausgabe', () => {
  const r = spawnSync(process.execPath, [WERKZEUG], { encoding: 'utf8', timeout: 90000 });
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, new RegExp(GRUNDLINIE.konstanten.length + ' AB_WERK-Konstanten'));
  assert.match(r.stdout, /struktur \d+, satz \d+, fremdcode \d+ Byte/);
  assert.match(r.stdout, /OK/);
});

test('[Gerüst-Wächter·CLI·Rot-Beweis] --datei mit einer gewachsenen Konstante ohne Andockpunkt: Exit 1 und der Name im Fund', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'geruest-waechter-'));
  try {
    const datei = path.join(tmp, 'kern.html');
    fs.writeFileSync(datei, mitZusatz(OHNE_MARKER, KENNUNG_1KB));
    const r = spawnSync(process.execPath, [WERKZEUG, '--datei', datei], { encoding: 'utf8', timeout: 90000 });
    assert.equal(r.status, 1);
    assert.ok(r.stderr.includes(OHNE_MARKER.name + ': wächst um'), r.stderr);
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
});

test('[Gerüst-Wächter·CLI·Zuwachs] ohne Schalter Exit 1; mit Schalter und Grund Exit 0 und benannt eingetragen; ein zweiter ist möglich; Satz nie', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'geruest-waechter-zu-'));
  try {
    const gl = path.join(tmp, 'grundlinie.json');
    fs.writeFileSync(gl, JSON.stringify({ ...GRUNDLINIE, zuwaechse: [] }));
    const eine = path.join(tmp, 'eine.html');
    fs.writeFileSync(eine, alsAbschnitt('const _probe_strukturliste = "' + 'x'.repeat(59) + '";'));
    const lauf = (...args) => spawnSync(process.execPath, [WERKZEUG, '--grundlinie-datei', gl, ...args], { encoding: 'utf8', timeout: 90000 });

    const ohne = lauf('--datei', eine, '--grundlinie-schreiben');
    assert.equal(ohne.status, 1);
    assert.match(ohne.stderr, /struktur: Deckel würde von \d+ auf \d+ steigen/);
    assert.deepEqual(JSON.parse(fs.readFileSync(gl, 'utf8')).zuwaechse, [], 'nichts geschrieben');

    const ohneGrund = lauf('--datei', eine, '--grundlinie-schreiben', '--anhebung', 'struktur');
    assert.equal(ohneGrund.status, 1);
    assert.match(ohneGrund.stderr, /ohne Grund/);

    const mit = lauf('--datei', eine, '--grundlinie-schreiben', '--anhebung', 'struktur', '--grund', GRUND);
    assert.equal(mit.status, 0, mit.stderr);
    assert.match(mit.stdout, /Änderung je Eimer in diesem Lauf \(Byte, keine Summe\): struktur \+59/);
    assert.doesNotMatch(mit.stdout, /Nettobilanz/);
    const geschrieben = JSON.parse(fs.readFileSync(gl, 'utf8'));
    assert.deepEqual(geschrieben.zuwaechse[0].daneben, {}, 'nur struktur hat sich bewegt');
    assert.equal(geschrieben.zuwaechse.length, 1);
    assert.equal(geschrieben.zuwaechse[0].auf - geschrieben.zuwaechse[0].von, 59);
    assert.equal(lauf('--datei', eine).status, 0, 'mit der neuen Grundlinie ist die Datei grün');

    const zwei = path.join(tmp, 'zwei.html');
    fs.writeFileSync(zwei, fs.readFileSync(eine, 'utf8') + '\n<script>\nconst _probe_zweite = "' + 'y'.repeat(30) + '";\n</script>\n');
    const zweite = lauf('--datei', zwei, '--grundlinie-schreiben', '--anhebung', 'struktur', '--grund', GRUND);
    assert.equal(zweite.status, 0, zweite.stderr);
    assert.equal(JSON.parse(fs.readFileSync(gl, 'utf8')).zuwaechse.length, 2, 'keine Anzahl-Grenze, jede Zeile benannt');

    const satz = path.join(tmp, 'satz.html');
    fs.writeFileSync(satz, fs.readFileSync(zwei, 'utf8') + '\n<script>\nconst _s = "Ein deutscher Satz im Gerüst.";\n</script>\n');
    const satzLauf = lauf('--datei', satz, '--grundlinie-schreiben', '--anhebung', 'satz', '--grund', GRUND);
    assert.equal(satzLauf.status, 1);
    assert.match(satzLauf.stderr, /nie eine Ausnahme/);
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
});

/* ── Ein NEUER, leerer Andockpunkt kommt benannt herein (21.09.2026) ─────────────────────────────────────────────────────────────────────────
   Der Fund: `--grundlinie-schreiben` verweigerte JEDE neue AB_WERK-Konstante und kannte keinen Weg, sie zuzulassen — obwohl die Architektur neue Andockpunkte verlangt
   (jeder ist ein Loch mehr im Lochbild, das Konfektionierung möglich macht). Der einzige Ausweg wäre ein Hand-Eintrag in `konstanten` gewesen: eine Ratsche, deren einziger
   Ausweg von Hand geht, wird von Hand bedient, und dann bewacht sie nichts mehr.
   Die Trennung ist gemessen, nicht geraten: alle Konstanten MIT Andockpunkt (marker) sind höchstens 65 Byte groß (der Kanon am 21.09.2026: 19 Stück, 29–65), alle OHNE
   sind mindestens 157 Byte groß (4 Stück, 157–2417). Eine Konstante mit Inhalt ist das Wachstum, das die Regel verhindern soll; ein leerer Andockpunkt ist Wachstum des Lochbilds. */
const LEER_NAME = ab('NEUER_ANDOCKPUNKT_QUELLEN');
const leer = (name = LEER_NAME) => konstantenMessen(ECHT + '\n/* ' + name + ':BEGIN */\nconst ' + name + ' = Object.freeze([]);\n/* ' + name + ':END */\n');
const GRUND_ANDOCKPUNKT = 'Neuer leerer Andockpunkt für die Quellen des Sprachangebots: ein Loch im Lochbild, das die Konfektionierung füllt — kein Inhalt im Gerüst.';

test('[Gerüst-Wächter·Andockpunkt·Messung] die Schwelle trägt die Trennung: alle heutigen Andockpunkte darunter, alle Konstanten mit Inhalt darüber', () => {
  const mit = GRUNDLINIE.konstanten.filter((k) => k.marker).map((k) => k.bytes);
  const ohne = GRUNDLINIE.konstanten.filter((k) => !k.marker).map((k) => k.bytes);
  assert.ok(mit.length >= 10 && ohne.length >= 3, 'beide Gruppen sind besetzt: ' + mit.length + ' / ' + ohne.length);
  assert.ok(Math.max(...mit) <= ANDOCKPUNKT_HOECHSTENS, 'der größte leere Andockpunkt (' + Math.max(...mit) + ' Byte) liegt unter der Schwelle ' + ANDOCKPUNKT_HOECHSTENS);
  assert.ok(Math.min(...ohne) > ANDOCKPUNKT_HOECHSTENS, 'die kleinste Konstante mit Inhalt (' + Math.min(...ohne) + ' Byte) liegt über der Schwelle');
});

test('[Gerüst-Wächter·Andockpunkt·Messung] die Namenslänge steckt in den Bytes: das Statement ist Name plus 12–29 Byte, die Schwelle trägt Namen bis 67 Zeichen — der längste heutige hat 36', () => {
  const andockpunkte = GRUNDLINIE.konstanten.filter((k) => k.marker);
  const zusatz = andockpunkte.map((k) => k.bytes - k.name.length);
  const groesster = Math.max(...zusatz);
  assert.ok(groesster <= 29, 'gemessen am Kanon: höchstens 29 Byte über der Namenslänge, heute ' + groesster);
  const laengsterName = Math.max(...andockpunkte.map((k) => k.name.length));
  assert.ok(ANDOCKPUNKT_HOECHSTENS - groesster >= laengsterName + 25,
    'die Schwelle trägt Namen bis ' + (ANDOCKPUNKT_HOECHSTENS - groesster) + ' Zeichen — Luft gegen den längsten heutigen (' + laengsterName + ')');
});

test('[Gerüst-Wächter·Andockpunkt] ein neuer leerer Andockpunkt wird MIT benanntem Antrag angenommen und steht mit Grund im Register', () => {
  const m = leer();
  const k = m.konstanten.find((x) => x.name === LEER_NAME);
  assert.ok(k && k.marker === true && k.bytes <= ANDOCKPUNKT_HOECHSTENS, 'der Prüfling ist ein leerer Andockpunkt: ' + JSON.stringify(k));
  const r = grundlinieAktualisieren(m, BASIS, { anhebungen: [{ ziel: LEER_NAME, grund: GRUND_ANDOCKPUNKT }] });
  assert.equal(r.ok, true, JSON.stringify(r.verweigert));
  const neuK = r.konstanten.find((x) => x.name === LEER_NAME);
  assert.deepEqual(neuK, { name: LEER_NAME, bytes: k.bytes, marker: true }, 'die Konstante steht in der Positivliste, mit Andockpunkt');
  const eintrag = r.zuwaechse[r.zuwaechse.length - 1];
  assert.equal(eintrag.ziel, LEER_NAME); assert.equal(eintrag.von, 0); assert.equal(eintrag.auf, k.bytes);
  assert.equal(eintrag.grund, GRUND_ANDOCKPUNKT, 'der Grund steht im Register — der Weg ist benannt, nicht still');
  assert.deepEqual(zuwaechsePruefen({ zuwaechse: r.zuwaechse }), [], 'das Register bleibt in sich stimmig');
});

test('[Gerüst-Wächter·Andockpunkt·Rot-Beweis] OHNE Antrag wird verweigert, und die Meldung nennt den Weg', () => {
  const r = grundlinieAktualisieren(leer(), BASIS);
  assert.equal(r.ok, false);
  const t = r.verweigert.join('|');
  assert.match(t, /neue Konstante/);
  assert.ok(t.includes('--anhebung ' + LEER_NAME), 'die Meldung sagt, welcher Weg zugelassen ist: ' + t);
});

test('[Gerüst-Wächter·Andockpunkt·Rot-Beweis] eine neue Konstante mit INHALT wird auch mit Antrag verweigert — ohne Andockpunkt oder über der Schwelle', () => {
  const antrag = { anhebungen: [{ ziel: LEER_NAME, grund: GRUND_ANDOCKPUNKT }] };
  // (a) klein, aber ohne Andockpunkt: ein Wert im Gerüst, kein Loch
  const ohneMarker = grundlinieAktualisieren(konstantenMessen(ECHT + '\nconst ' + LEER_NAME + " = 'Text';\n"), BASIS, antrag);
  assert.equal(ohneMarker.ok, false);
  assert.match(ohneMarker.verweigert.join('|'), /trägt Inhalt/);
  // (b) mit Andockpunkt, aber größer als jeder leere: Inhalt zwischen den Markern
  const inhalt = "'" + 'x'.repeat(ANDOCKPUNKT_HOECHSTENS) + "'";
  const zuGross = grundlinieAktualisieren(konstantenMessen(ECHT + '\n/* ' + LEER_NAME + ':BEGIN */\nconst ' + LEER_NAME + ' = Object.freeze([' + inhalt + ']);\n/* ' + LEER_NAME + ':END */\n'), BASIS, antrag);
  assert.equal(zuGross.ok, false);
  assert.match(zuGross.verweigert.join('|'), /trägt Inhalt/);
});

test('[Gerüst-Wächter·Andockpunkt] ein Antrag ohne ausreichenden Grund wird verweigert, und ein Antrag für eine andere Konstante nimmt diese nicht mit', () => {
  const kurz = grundlinieAktualisieren(leer(), BASIS, { anhebungen: [{ ziel: LEER_NAME, grund: 'neu' }] });
  assert.equal(kurz.ok, false);
  assert.match(kurz.verweigert.join('|'), /ohne Grund/);
  const fremd = grundlinieAktualisieren(leer(), BASIS, { anhebungen: [{ ziel: ab('ANDERE'), grund: GRUND_ANDOCKPUNKT }] });
  assert.equal(fremd.ok, false, 'ein Antrag gilt nur für die Konstante, die er nennt');
});

test('[Gerüst-Wächter·Andockpunkt·Prozess] die Kommandozeile: ohne Antrag Exit 1, mit Antrag geschrieben, danach prüft der Wächter grün — an Wegwerf-Kopien, nie an der echten Grundlinie', { timeout: 120000 }, () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'andockpunkt-'));
  try {
    const kern = path.join(dir, 'kern.html');
    const gl = path.join(dir, 'grundlinie.json');
    fs.writeFileSync(kern, ECHT + '\n/* ' + LEER_NAME + ':BEGIN */\nconst ' + LEER_NAME + ' = Object.freeze([]);\n/* ' + LEER_NAME + ':END */\n', 'utf8');
    fs.copyFileSync(GRUNDLINIE_PFAD, gl);
    const env = Object.assign({}, process.env); delete env.NODE_TEST_CONTEXT;
    const lauf = (...args) => spawnSync(process.execPath, [path.join(__dirname, '..', 'tools', 'geruest-waechter-pruefen.js'), '--datei', kern, '--grundlinie-datei', gl, ...args], { env, encoding: 'utf8' });

    const vorher = lauf();
    assert.equal(vorher.status, 1, 'Positivkontrolle: der Wächter kennt die neue Konstante nicht und ist ROT');
    assert.match(vorher.stderr, /NEUE AB_WERK-Konstante/);

    const ohne = lauf('--grundlinie-schreiben');
    assert.equal(ohne.status, 1, 'ohne Antrag wird nichts geschrieben');
    assert.ok(ohne.stderr.includes('--anhebung ' + LEER_NAME), 'die Meldung nennt den zugelassenen Weg: ' + ohne.stderr);
    assert.equal(fs.readFileSync(gl, 'utf8'), fs.readFileSync(GRUNDLINIE_PFAD, 'utf8'), 'die Grundlinie ist byte-identisch geblieben');

    const mit = lauf('--grundlinie-schreiben', '--anhebung', LEER_NAME, '--grund', GRUND_ANDOCKPUNKT);
    assert.equal(mit.status, 0, mit.stderr);
    const geschrieben = JSON.parse(fs.readFileSync(gl, 'utf8'));
    assert.ok(geschrieben.konstanten.some((k) => k.name === LEER_NAME && k.marker === true));
    assert.ok(geschrieben.zuwaechse.some((z) => z.ziel === LEER_NAME && z.von === 0 && z.grund === GRUND_ANDOCKPUNKT));

    const nachher = lauf();
    assert.equal(nachher.status, 0, 'danach ist der Wächter grün: ' + nachher.stderr);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});
