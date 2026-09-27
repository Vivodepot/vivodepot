'use strict';
/* ════════════════════════════════════════════════════════════════════════
   STANDARDVORLAGE-NUR-DE (Fund 23.09.2026, Durchklick-Abnahme privat-en).

   DER FUND: die vier Standardvorlagen-Dateien
   (tools/dokument-module/vivodepot-standardvorlage-{patientenverfuegung,
   vorsorgevollmacht,betreuungsverfuegung,organspende}.json) tragen `"sprache": "de"`
   und haben kein englisches Gegenstück. Der Bake nimmt sie ohne Sprachfilter in
   jedes Produkt; ein englisches Produkt zeigte den deutschen amtlichen Wortlaut
   OHNE Hinweis. Die Sprache stand nur an der Datei und ging beim Zusammenführen
   (`_dokumentModuleUndVorlagenAbWerkSeed`) verloren.

   ENTSCHIEDEN (23.09.2026): der Rechtstext wird NICHT übersetzt — er beruht auf
   deutschem Recht. Ein englisches Produkt sagt sichtbar, dass die Vorlage nur
   deutsch vorliegt; der Satz ist ein Textschlüssel (`standardVorlageNurDeutsch`),
   Wortlaut bestätigt. Die Sprache der Vorlage lebt NEBEN den signierten
   Vorlagen-Objekten (`_standardVorlageSprache`), nicht in ihnen.

   Rot-Beweis per Mutation: ohne die Hinweis-Zeile in `wortlautVorlageHTML` zeigt
   dasselbe englische Produkt den deutschen Wortlaut wieder stumm.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const REPO = path.join(__dirname, '..');
const DOKUMENT_MODUL_ORDNER = path.join(REPO, 'tools', 'dokument-module');
const STANDARDVORLAGE_IDS = ['patientenverfuegung', 'vorsorgevollmacht', 'betreuungsverfuegung', 'organspende'];
const EN_HINWEIS = JSON.parse(fs.readFileSync(path.join(REPO, 'tools', 'textsatz-en-modul.json'), 'utf8'))
  .texte['strings:standardVorlageNurDeutsch.text'];
const HINWEISZEILE = '    sprachHinweis +\n';

// Die Mutante (Rot-Beweis unten) ist die rohe Datei, geladen wird aber ein gebackenes Produkt: `ladeKern({ backen: true })` backt über
// `_standardProduktBaken` — der Klasse-B-Wächter (tools/klasse-b-node-kern-pruefen.js) liest genau diesen Namen.
function laden(produkt, kernPfad) {
  const vorher = process.env.KERN_HTML_PATH;
  if (kernPfad) process.env.KERN_HTML_PATH = kernPfad;
  delete require.cache[require.resolve('./load-kern.js')];
  try {
    return require('./load-kern.js').ladeKern(kernPfad ? { produkt, backen: true } : { produkt }).V;
  } finally {
    if (vorher === undefined) delete process.env.KERN_HTML_PATH; else process.env.KERN_HTML_PATH = vorher;
    delete require.cache[require.resolve('./load-kern.js')];
  }
}

test('[Standardvorlage·Vorbedingung] alle vier Standardvorlagen liegen nur deutsch vor — darum braucht ein englisches Produkt den Hinweis', () => {
  for (const id of STANDARDVORLAGE_IDS) {
    const datei = 'vivodepot-standardvorlage-' + id + '.json';
    const modul = JSON.parse(fs.readFileSync(path.join(DOKUMENT_MODUL_ORDNER, datei), 'utf8'));
    assert.equal(modul.sprache, 'de', datei);
    assert.ok(!fs.existsSync(path.join(DOKUMENT_MODUL_ORDNER, datei.replace('.json', '-en.json'))), datei + ': kein englisches Gegenstück');
  }
  assert.equal(typeof EN_HINWEIS, 'string', 'der englische Hinweis steht im Sprachmodul');
});

for (const produkt of ['privat-en', 'pro-en']) {
  test('[Standardvorlage] im Produkt ' + produkt + ' steht an jeder deutschen Standardvorlage der Hinweis, der Wortlaut bleibt deutsch', () => {
    const V = laden(produkt);
    let geprueft = 0;
    for (const id of STANDARDVORLAGE_IDS) {
      const v = V._standardVorlage(id);
      if (!v || typeof v.wortlaut !== 'string') continue;
      geprueft++;
      assert.equal(V._standardVorlageSprache(id), 'de', id);
      const html = V.wortlautVorlageHTML(v);
      assert.ok(html.includes(EN_HINWEIS), id + ': der Hinweis fehlt');
      assert.ok(html.indexOf(EN_HINWEIS) < html.indexOf('wortlaut-block'), id + ': der Hinweis steht vor dem Wortlaut');
    }
    assert.ok(geprueft >= 1, 'Vorbedingung: das Produkt trägt Standardvorlagen mit Wortlaut');
    const pv = V._standardVorlage('patientenverfuegung');
    if (pv) assert.ok(V.wortlautVorlageHTML(pv).includes('Formulierungshilfen hierzu unter'), 'der amtliche Wortlaut bleibt deutsch, unverändert');
  });
}

test('[Standardvorlage·Gegenprobe] im deutschen Produkt steht kein Sprach-Hinweis', () => {
  const V = laden('privat-de');
  for (const id of STANDARDVORLAGE_IDS) {
    const v = V._standardVorlage(id);
    if (!v || typeof v.wortlaut !== 'string') continue;
    assert.ok(!V.wortlautVorlageHTML(v).includes('wortlaut-sprache'), id);
  }
});

test('[Standardvorlage·Rot-Beweis] ohne die Hinweis-Zeile zeigt das englische Produkt den deutschen Wortlaut stumm', () => {
  const quelle = fs.readFileSync(path.join(REPO, 'vivodepot.html'), 'utf8');
  assert.equal(quelle.split(HINWEISZEILE).length, 2, 'die Hinweis-Zeile steht genau einmal — sonst trifft die Mutation nichts');
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'standardvorlage-sprache-'));
  const mutant = path.join(tmp, 'vivodepot.html');
  fs.writeFileSync(mutant, quelle.replace(HINWEISZEILE, '    /* MUTATION */\n'));
  try {
    const V = laden('privat-en', mutant);
    const html = V.wortlautVorlageHTML(V._standardVorlage('patientenverfuegung'));
    assert.ok(html.includes('Formulierungshilfen hierzu unter'), 'Vorbedingung: der deutsche Wortlaut steht da');
    assert.ok(!html.includes(EN_HINWEIS), 'ohne die Zeile fehlt der Hinweis — die Probe misst den Fix');
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});
