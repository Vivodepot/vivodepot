'use strict';
/* P03 (04.11.2026): Im Bereich „Unterlagen“ von Pro standen die Auszüge für Erbschein und Beratungshilfe mitten zwischen den
   Auszügen des Betriebs. Ihre Knöpfe hießen nach Bereichen, die Pro gar nicht führt („Vorsorge & Recht ergänzen“,
   „Meine Menschen ergänzen“ …), einer je Bereich. Regel seit diesem Fix, geprüft im gebauten Produkt (pro-de, pro-en):
   (1) die Auszüge, die die Person betreffen (ihr eigener Bereich ist im Produkt ersetzt), stehen nach denen des Betriebs, unter
       der Überschrift „Für Sie persönlich“ mit einem Satz, wofür sie da sind;
   (2) je solcher Karte steht EIN Knopf „ergänzen“, sein Text nennt keinen Bereichsnamen;
   (3) der Knopf öffnet alle Bereiche, aus denen der Auszug liest, und zeigt den ersten.
   Rot-Beweis: ohne die Trennung und mit dem alten Knopf je Bereich fällt die Probe. */
const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { produktHtml, kernAus } = require('./produkt-html-erzeugen.js');
const VP = require('../tools/lib/vier-produkte.js');

const PRO = VP.PRODUKTE.map((p) => p.slug).filter((s) => s.startsWith('pro-'));
const HEIMAT = 'pro-aufbewahrung-ordnung';
const PERSOENLICH = ['erbschein-vorbereitung', 'zugang-zum-recht-beratungshilfe'];
const PW = 'probe-passwort-auszuege-persoenlich-2026-11-04';
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'pro-auszuege-persoenlich-'));
after(() => fs.rmSync(TMP, { recursive: true, force: true }));

const texte = (slug) => JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'tools', 'textsatz-' + slug.slice(-2) + '-modul.json'), 'utf8')).texte;
const inhalt = (k) => String(k.document.getElementById('content').innerHTML);

async function unterlagen(datei) {
  const k = kernAus(datei);
  await k.V.depotAnlegen(PW);
  k.V.renderSektor(HEIMAT);
  return { k, V: k.V, h: inhalt(k) };
}
/* Wo die Karte eines Auszugs im HTML steht: an ihrem Knopf-Attribut. */
function stellen(V, h) {
  const s = {};
  for (const roh of V._logikModuleAlle(V.getData())) {
    const g = V.logikModulPruefen(roh);
    if (!g.gueltig || !g.logik.dokAusgabe.karte) continue;
    const i = h.indexOf('data-' + g.logik.dokAusgabe.knopfAttr + '>');
    if (i >= 0) s[g.logik.id] = i;
  }
  return s;
}
function maengel(V, h, t) {
  const f = [];
  const s = stellen(V, h);
  const titel = h.indexOf('class="auszug-persoenlich-titel"');
  if (titel < 0) f.push('ohne Überschrift „Für Sie persönlich“');
  else if (!h.includes(t['strings:auszuegePersoenlichHinweis.text'])) f.push('ohne Satz, wofür die Auszüge da sind');
  for (const [id, i] of Object.entries(s)) {
    if (PERSOENLICH.includes(id) !== (titel >= 0 && i > titel)) f.push(id + ': auf der falschen Seite der Überschrift');
  }
  for (const id of PERSOENLICH) {
    const knoepfe = [...h.matchAll(new RegExp('data-vorlage-ergaenzen="[^"]+" data-vorlage="' + id + '">([^<]*)<', 'g'))].map((m) => m[1]);
    if (knoepfe.length !== 1) f.push(id + ': ' + knoepfe.length + ' Knöpfe „ergänzen“');
    for (const k of knoepfe) if (k !== t['strings:vorlageErgaenzenEinKnopf.text'].replace(/&/g, '&amp;')) f.push(id + ': Knopftext „' + k + '“');
  }
  return f;
}

test('[P03·Vorbedingung] beide Pro-Produkte oder keins', () => {
  assert.ok(PRO.length === 0 || PRO.join() === 'pro-de,pro-en', PRO.join());
});

for (const slug of PRO) {
  test('[P03·' + slug + '] „Für Sie persönlich“ trennt die Auszüge der Person von denen des Betriebs, je Karte ein Knopf ohne Bereichsnamen', async () => {
    const { V, h } = await unterlagen(produktHtml(slug));
    const s = stellen(V, h);
    assert.ok(PERSOENLICH.every((id) => id in s), 'beide Auszüge der Person stehen da');
    // Auszüge des Betriebs stehen, wo vorhanden, vor der Überschrift (maengel prüft die Seite je Karte).
    assert.deepEqual(maengel(V, h, texte(slug)), []);
  });

  test('[P03·' + slug + '] der eine Knopf öffnet alle Bereiche, aus denen der Auszug liest, und zeigt den ersten', async () => {
    const { k, V, h } = await unterlagen(produktHtml(slug));
    const m = /data-vorlage-ergaenzen="([^"]+)" data-vorlage="erbschein-vorbereitung"/.exec(h);
    const ids = m[1].split(',');
    assert.ok(ids.length >= 3, 'Vorbedingung: der Auszug liest aus mehreren Bereichen: ' + m[1]);
    const nichtGefuehrt = ids.filter((id) => !V.bereicheAlle().some((b) => b.id === id));
    assert.ok(nichtGefuehrt.length >= 2, 'Vorbedingung: mehrere davon führt Pro nicht');
    // Wie der Klick-Bauer im Kern: Vorlage und Attributwert des Knopfs, unverändert.
    assert.match(fs.readFileSync(produktHtml(slug), 'utf8'), /vorlageAngabenErgaenzen\(b\.getAttribute\('data-vorlage'\), b\.getAttribute\('data-vorlage-ergaenzen'\)\)/);
    assert.equal(V.vorlageAngabenErgaenzen('erbschein-vorbereitung', m[1]), true);
    for (const id of nichtGefuehrt) assert.ok(V.bereicheAlle().some((b) => b.id === id), id + ': nach dem Klick da');
    const gezeigt = inhalt(k);
    assert.ok(!gezeigt.includes('auszug-persoenlich-titel'), 'die Ansicht hat gewechselt');
    assert.ok(gezeigt.includes('data-sektor-id="' + ids[0] + '"'), 'gezeigt wird der erste Bereich: ' + ids[0]);
  });
}

/* ── Rot-Beweis: am Stand vor dem Fix fällt die Probe ── */
function ohne(slug, stelle, ersatz) {
  const quelle = fs.readFileSync(produktHtml(slug), 'utf8');
  assert.ok(quelle.includes(stelle), 'Mutationsstelle fehlt: ' + stelle.slice(0, 60));
  const kopie = path.join(TMP, 'rot-' + Math.random().toString(36).slice(2) + '.html');
  fs.writeFileSync(kopie, quelle.split(stelle).join(ersatz));
  return kopie;
}
test('[P03·Rot-Beweis] ohne Trennung und mit einem Knopf je Bereich fällt die Probe', async () => {
  if (!PRO.length) return;
  const slug = PRO[0], t = texte(slug);
  const ohneTrennung = await unterlagen(ohne(slug, 'for (const logik of eigene.concat(fremde)) {\n    if (fremde.length && logik === fremde[0]) {',
    'for (const logik of auszuege) {\n    if (false) {'));
  const f1 = maengel(ohneTrennung.V, ohneTrennung.h, t);
  assert.ok(f1.includes('ohne Überschrift „Für Sie persönlich“'), f1.join('; '));
  const jeBereich = await unterlagen(ohne(slug, "data-vorlage-ergaenzen=\"' + escapeAttr(bereiche.sort().join(',')) + '\" data-vorlage=\"' + escapeAttr(logik.id) + '\">'\n      + escapeHTML(STRINGS.vorlageErgaenzenEinKnopf) + '</button></div>';",
    "data-vorlage-ergaenzen=\"' + escapeAttr(bereiche[0]) + '\" data-vorlage=\"' + escapeAttr(logik.id) + '\">x</button>' + bereiche.slice(1).map((b) => '<button data-vorlage-ergaenzen=\"' + b + '\" data-vorlage=\"' + escapeAttr(logik.id) + '\">' + b + ' ergänzen</button>').join('') + '</div>';"));
  const f2 = maengel(jeBereich.V, jeBereich.h, t);
  assert.ok(f2.some((x) => /Knöpfe „ergänzen“/.test(x)) && f2.some((x) => /Knopftext/.test(x)), f2.join('; '));
});

/* ── Reste nach der Abnahme (04.11.2026), je Kennung eine Regel ──
   P03-HINWEIS     unter der Karte steht kein Hinweissatz mehr; der Knopf sagt, was er tut.
   P03-KNOPF-1440  der Knopf steht in der Karte links unter ihren Knöpfen, nicht in der rechtsbündigen Leiste .bereich-aktionen.
   P03-EN-REST     kein englischer Text trägt den deutschen Namen in Klammern („Access to Justice (Zugang zum Recht)“). */
const ALT_HINWEIS = { de: 'Für diesen Auszug brauchen Sie auch Angaben aus Bereichen', en: 'Some details for this extract belong in areas' };
function restMaengel(h, sprache, enTexte) {
  const f = [];
  if (h.includes(ALT_HINWEIS[sprache])) f.push('P03-HINWEIS: Hinweissatz unter der Karte');
  if (/<div class="bereich-aktionen"><button[^>]*data-vorlage-ergaenzen=/.test(h)) f.push('P03-KNOPF-1440: Knopf in der rechtsbündigen Leiste');
  if (!/<div class="auszug-karte-ergaenzen"><button[^>]*data-vorlage-ergaenzen=/.test(h)) f.push('P03-KNOPF-1440: Knopf nicht in der Karte');
  if (enTexte) for (const [k, t] of Object.entries(enTexte)) if (typeof t === 'string' && /\(Zugang zum Recht\)/.test(t)) f.push('P03-EN-REST: ' + k);
  return f;
}
for (const slug of PRO) {
  test('[P03·Rest·' + slug + '] kein Hinweissatz, Knopf in der Karte, kein deutscher Rest im englischen Namen', async () => {
    const { h } = await unterlagen(produktHtml(slug));
    const sprache = slug.slice(-2);
    assert.deepEqual(restMaengel(h, sprache, sprache === 'en' ? texte(slug) : null), []);
    if (sprache === 'en') assert.ok(h.includes('Access to Justice · '), 'der englische Name steht an der Karte');
  });
}
test('[P03·Rest·Rot-Beweis] der Stand vor den Resten fällt an allen drei Kennungen', async () => {
  if (!PRO.length) return;
  const alt = await unterlagen(ohne(PRO[0], "return '<div class=\"auszug-karte-ergaenzen\">' +",
    "return '<p class=\"sektion-hint\">" + ALT_HINWEIS.de + ".</p><div class=\"bereich-aktionen\">' +"));
  const f = restMaengel(alt.h, 'de', { 'dokument.erbschein-vorbereitung.gruppe': 'Access to Justice (Zugang zum Recht) · Certificate of inheritance' });
  assert.deepEqual(f, ['P03-HINWEIS: Hinweissatz unter der Karte', 'P03-KNOPF-1440: Knopf in der rechtsbündigen Leiste',
    'P03-KNOPF-1440: Knopf nicht in der Karte', 'P03-EN-REST: dokument.erbschein-vorbereitung.gruppe']);
});
