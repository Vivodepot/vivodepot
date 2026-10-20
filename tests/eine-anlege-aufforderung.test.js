'use strict';
/* eine-anlege-aufforderung.test.js — eine Anlege-Aufforderung je Ansicht, überall dasselbe Wort (09.10.2026)
   Die Umschau trug zwei Aufforderungen zugleich: oben den Hinweis „Zum Eintragen richten Sie zuerst …“ mit Warndreieck,
   im Inhalt die Karte „Sie sehen sich gerade um“. Jetzt trägt der Hinweis `data-anlegen-weg`; wo die Karte im Inhalt steht
   (Schalter `_anlegenKarteImInhalt`), fällt er weg, sonst bleibt er der einzige Weg. Die Laufzeitprobe (genau eine je
   Ansicht) steht in tests/e2e/eine-anlege-aufforderung-je-ansicht.spec.js; hier die Bauform im Kern und im Textsatz. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const REPO = path.join(__dirname, '..');
const KERN = fs.readFileSync(path.join(REPO, 'vivodepot.html'), 'utf8');
const text = (datei) => JSON.parse(fs.readFileSync(path.join(REPO, 'tools', datei), 'utf8'));

test('[Eine Aufforderung] der obere Hinweis trägt data-anlegen-weg, die Karte setzt den Schalter, den renderContent zurücksetzt', () => {
  const hinweis = KERN.match(/<button type="button" class="tb-pw-hinweis" id="tb-pw-hinweis" data-anlegen-weg /g) || [];
  assert.equal(hinweis.length, 1, 'statisches Markup: der Hinweis in der Kopfzeile');
  assert.equal((KERN.match(/_anlegenKarteImInhalt = true;/g) || []).length, 2, 'zwei Stellen setzen ihn: die Karte und der Knopf in „Sub-Depots“');
  assert.match(KERN, /_anlegenKarteImInhalt = false;\n\s*renderContentInner\(\);\n\s*try \{ _pwHinweisStellen\(\); \} catch/, 'renderContent setzt zurück, rendert und bewertet den Hinweis neu');
  const stellen = KERN.split('_anlegenKarteImInhalt = true;').slice(1).map((t) => t.slice(0, 520));
  assert.equal(stellen.filter((t) => /data-bereich-leer="vorschau"/.test(t)).length, 1, 'die Karte');
  assert.equal(stellen.filter((t) => /id="sub-pw-link" data-anlegen-weg/.test(t)).length, 1, 'der Knopf in „Sub-Depots“ trägt data-anlegen-weg');
  assert.equal(stellen.filter((t) => /data-bereich-leer="vorschau"|data-anlegen-weg/.test(t)).length, 2, 'jede Stelle, die den Hinweis weichen lässt, stellt selbst einen Weg hin');
});

test('[Eine Aufforderung·Gegenprobe] der Hinweis weicht nur, wenn die Karte steht', () => {
  assert.match(KERN, /el\.hidden = !\(imVorschau\(\) && !_vorfuehrungSchalter\) \|\| _anlegenKarteImInhalt;/);
});

test('[Eine Aufforderung·kein Warndreieck] das Erscheinungsbild blendet das Symbol am Hinweis aus, der Kern erzeugt es weiter', () => {
  const css = fs.readFileSync(path.join(REPO, 'tools', 'erscheinung', 'stil', 'salbei-glas.css'), 'utf8');
  assert.match(css, /\.tb-pw-hinweis \.ico \{ display: none; \}/, 'Salbei mit Glas: das Symbol des Hinweises ist ausgeblendet');
  assert.match(KERN, /<button type="button" class="tb-pw-hinweis" id="tb-pw-hinweis"[^>]*>\s*<span class="ico"/, 'der Kern trägt das Symbol-Element weiter (Entscheidung: im Modul, nicht im Kern)');
});

test('[Eine Aufforderung·ein Wort] Hinweis, Karte und der Knopf in „Sub-Depots“ sagen „Depot anlegen“ / „Create depot“', () => {
  const de = text('textsatz-de-modul.json').texte; const en = text('textsatz-en-modul.json').texte;
  const holen = (m, n) => m['strings:' + n + '.text'];
  assert.equal(holen(de, 'd1TopbarCta'), 'Depot anlegen');
  assert.equal(holen(de, 'umschauAnlegenKnopf'), 'Depot anlegen');
  assert.equal(holen(en, 'd1TopbarCta'), 'Create depot');
  assert.equal(holen(en, 'umschauAnlegenKnopf'), 'Create depot');
  assert.equal(holen(de, 'subVorschauPwLink'), 'Depot anlegen', '„Sub-Depots“: derselbe Weg, dasselbe Wort (vorher „Passwort jetzt setzen →“)');
  assert.equal(holen(en, 'subVorschauPwLink'), 'Create depot');
});

test('[Ohne Eintrag steht nichts] „Meine Vorsorge auf einen Blick“ zeigt kein „keine“: der Kern liest instrumentKeine nirgends mehr', () => {
  assert.ok(!/STRINGS\.instrumentKeine/.test(KERN));
  const fn = KERN.slice(KERN.indexOf('function modulKarteStatus(m) {'), KERN.indexOf('// art-Label eines vorsorge_instrumente-Records'));
  assert.match(fn, /instrumentErteilt/);
  assert.match(fn, /instrumentFestgelegt/);
  assert.match(fn, /instrumentVorhanden/);
  assert.match(fn, /: '';/);
});

/* Der Rückfall: ohne Karte im Inhalt bleibt der obere Hinweis sichtbar. Die Umschau von privat-de hat heute keine Ansicht
   ohne Karte (Wagenbericht 09.10.2026), darum erzwingt die Probe den Zustand: eine Stub-Welt, in der die Karte da ist oder
   fehlt, und die beiden echten Funktionen aus dem Kern. Rot-Beweis: derselbe Aufbau mit einem Hinweis, der immer weicht. */
function hinweisSichtbar(quelleStellen, karteDa) {
  const a = KERN.indexOf('let _anlegenKarteImInhalt = false;');
  const b = KERN.indexOf('function _vorfuehrungStreifenSetzen()');
  assert.ok(a > 0 && b > a);
  const text = quelleStellen(KERN.slice(a, b));
  const el = { hidden: true };
  const welt = {
    document: { getElementById: (id) => (id === 'tb-pw-hinweis' ? el : null) },
    imVorschau: () => true,
    _vorfuehrungSchalter: false,
  };
  const lauf = new Function('document', 'imVorschau', 'karteDa', 'topbarPlatzAnpassen', 'let _vorfuehrungSchalter = false;\n' + text + '\n_anlegenKarteImInhalt = karteDa;\n_pwHinweisStellen();');
  lauf(welt.document, welt.imVorschau, karteDa, () => {});
  return !el.hidden;
}

test('[Eine Aufforderung·Rückfall] ohne Karte im Inhalt ist der obere Hinweis sichtbar, mit Karte nicht', () => {
  const echt = (q) => q;
  assert.equal(hinweisSichtbar(echt, false), true, 'ohne Karte: der Hinweis ist der Weg');
  assert.equal(hinweisSichtbar(echt, true), false, 'mit Karte: der Hinweis weicht');
});

test('[Eine Aufforderung·Rückfall·Rot-Beweis] ein Hinweis, der immer weicht, fällt an der Probe durch', () => {
  const immerWeg = (q) => q.replace('|| _anlegenKarteImInhalt', '|| true');
  assert.notEqual(immerWeg(KERN.slice(KERN.indexOf('function _pwHinweisStellen()'))), KERN.slice(KERN.indexOf('function _pwHinweisStellen()')), 'die Mutation greift');
  assert.equal(hinweisSichtbar(immerWeg, false), false, 'ohne Rückfall bliebe der Hinweis auch ohne Karte weg: die Probe oben wäre rot');
});

/* Die Platzanpassung zieht nach (10.10.2026): der Hinweis erscheint oder weicht in renderContent, die Kopfleiste wird dort nicht neu
   aufgebaut. Ohne erneute Messung stand er in „Sub-Depots“ in voller Breite in einer Leiste, die für ihn nie gemessen wurde (13 px
   Überlauf bei 375 px, 68 px bei 320 px). Hier die Bauform: `_pwHinweisStellen` ist die eine Stelle, die hidden setzt, und sie ruft
   `topbarPlatzAnpassen`, sobald sich hidden ändert. Die Laufzeitprobe über alle Ansichten steht in
   die Cross-Probe T-CROSS-11 (Lesbarkeit bei 375/320 px). */
function anpassungenBeimStellen(quelleStellen, verlauf) {
  const a = KERN.indexOf('let _anlegenKarteImInhalt = false;');
  const b = KERN.indexOf('function _vorfuehrungStreifenSetzen()');
  const el = { hidden: true };
  const rufe = [];
  const dok = { getElementById: (id) => (id === 'tb-pw-hinweis' ? el : null) };
  const lauf = new Function('document', 'imVorschau', 'topbarPlatzAnpassen', 'verlauf', 'rufe', 'el',
    'let _vorfuehrungSchalter = false;\n' + quelleStellen(KERN.slice(a, b)) + '\nfor (const karteDa of verlauf) { _anlegenKarteImInhalt = karteDa; _pwHinweisStellen(); rufe.push({ karteDa, hidden: el.hidden }); }');
  let gezaehlt = 0;
  lauf(dok, () => true, () => { gezaehlt += 1; rufe.push({ anpassung: true, hidden: el.hidden }); }, verlauf, rufe, el);
  return { gezaehlt, rufe };
}

test('[Eine Aufforderung·Platz] jeder Wechsel von hidden zieht die Platzanpassung nach, und zwar nach dem Stellen', () => {
  // Karte da (verborgen bleibt verborgen), Karte weg (erscheint), Karte weg (bleibt), Karte da (weicht)
  const r = anpassungenBeimStellen((q) => q, [true, false, false, true]);
  assert.equal(r.gezaehlt, 2, 'zwei Wechsel, zwei Messungen; ohne Wechsel keine');
  const wechsel = r.rufe.filter((x) => x.anpassung).map((x) => x.hidden);
  assert.deepEqual(wechsel, [false, true], 'gemessen wird mit dem neuen Zustand: erst sichtbar, dann verborgen');
});

test('[Eine Aufforderung·Platz·Rot-Beweis] der Wagenstand vom 10.10.2026 (hidden setzen ohne Messung) fällt an der Probe durch', () => {
  const ohne = (q) => q.replace('if (el.hidden !== vorher) topbarPlatzAnpassen();', '');
  assert.notEqual(ohne(KERN), KERN, 'die Mutation greift');
  assert.equal(anpassungenBeimStellen(ohne, [true, false, false, true]).gezaehlt, 0, 'ohne die Zeile misst niemand: die Probe oben wäre rot');
});

/* Zeilen außerhalb von _pwHinweisStellen, die den Hinweis nennen und sein hidden schreiben (Zuweisung oder Attribut). */
function fremdeHiddenSetzer(kern) {
  const ohneKommentare = kern.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  const fn = ohneKommentare.slice(ohneKommentare.indexOf('function _pwHinweisStellen() {'), ohneKommentare.indexOf('function _vorfuehrungStreifenSetzen()'));
  const rest = ohneKommentare.replace(fn, '');
  assert.notEqual(rest, ohneKommentare, 'die Funktion ist gefunden und ausgenommen');
  return rest.split('\n').filter((z) => /tb-pw-hinweis|pwHinweis\b/.test(z) && /\.hidden\s*=[^=]|toggleAttribute\(\s*['"]hidden|(set|remove)Attribute\(\s*['"]hidden/.test(z));
}

test('[Eine Aufforderung·Platz·Klasse] nur _pwHinweisStellen setzt das hidden des Hinweises', () => {
  assert.deepEqual(fremdeHiddenSetzer(KERN), [], 'eine zweite Stelle, die hidden setzt, umginge die Platzanpassung');
});

test('[Eine Aufforderung·Platz·Klasse·Rot-Beweis] eine zweite Stelle, die hidden setzt, wird gefunden', () => {
  const zweite = "function renderContent(springeNachOben) {\n  document.getElementById('tb-pw-hinweis').hidden = false;";
  const mutiert = KERN.replace('function renderContent(springeNachOben) {', zweite);
  assert.notEqual(mutiert, KERN, 'die Mutation greift');
  assert.equal(fremdeHiddenSetzer(mutiert).length, 1);
});
