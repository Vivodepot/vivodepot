'use strict';
/* Ein ausgeliefertes Sprachmodul gilt als ab Werk und wird von der Schutzliste darum NICHT gefiltert
   (vertrauenswuerdig: true). Eine Übersetzung, die von außen kommt (Gemeinschaftsübersetzung der Oberfläche), darf
   deshalb vor der Auslieferung keine Kennung der Schutzliste tragen — den Wortlaut der Dokumente zum Unterschreiben,
   die Haftung und die Sperrmeldungen liefert Vivodepot selbst (deutsches und englisches Modul) oder eine amtliche
   Quelle mit Feststellung. Gemessen über die Rezepte der vier Produkte (tools/lib/vier-produkte.js), nicht über eine
   Liste von Hand. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { PRODUKTE, modulDateienFuer } = require('../tools/lib/vier-produkte.js');
const S = require('../tools/schutz-schluessel-erheben.js');

const EIGENE = new Set([path.resolve(__dirname, '..', 'tools', 'textsatz-de-modul.json'), path.resolve(__dirname, '..', 'tools', 'textsatz-en-modul.json')]);

function schutzListe() {
  return new Set(S.erheben(fs.readFileSync(S.KERN, 'utf8'), JSON.parse(fs.readFileSync(S.TEXTSATZ_DE, 'utf8')).texte).schluessel);
}
function fremdeSchutztexte(dateien, schutz) {
  const funde = [];
  for (const datei of dateien) {
    if (!datei || EIGENE.has(path.resolve(datei)) || !fs.existsSync(datei)) continue;
    let m;
    try { m = JSON.parse(fs.readFileSync(datei, 'utf8')); } catch (e) { continue; }
    if (!m || m.modulTyp !== 'textsatz' || !m.texte || typeof m.texte !== 'object') continue;
    for (const k of Object.keys(m.texte)) if (schutz.has(k)) funde.push(path.basename(datei) + ' · ' + k);
  }
  return funde;
}

test('[Übersetzung·Auslieferung] kein ausgeliefertes fremdes Sprachmodul trägt eine Kennung der Schutzliste', () => {
  const schutz = schutzListe();
  const funde = [];
  for (const p of PRODUKTE) funde.push(...fremdeSchutztexte(modulDateienFuer(p).filter(Boolean), schutz).map((f) => p.slug + ': ' + f));
  assert.deepEqual(funde, []);
});

test('[Übersetzung·Auslieferung·Rot-Beweis] ein Gemeinschaftsmodul mit Haftungssatz im Rezept wird gefunden', () => {
  const os = require('node:os');
  const ordner = fs.mkdtempSync(path.join(os.tmpdir(), 'uebersetzung-schutz-'));
  try {
    const datei = path.join(ordner, 'textsatz-fr-modul.json');
    fs.writeFileSync(datei, JSON.stringify({ modulTyp: 'textsatz', sprache: 'fr', moduleVersion: 1, anbieterId: 'gemeinschaft',
      texte: { 'strings:fussQuellcode.text': 'Code source', 'strings:dokFussHaftung.text': 'Brouillon' } }));
    assert.deepEqual(fremdeSchutztexte([datei], schutzListe()), ['textsatz-fr-modul.json · strings:dokFussHaftung.text']);
  } finally {
    fs.rmSync(ordner, { recursive: true, force: true });
  }
});
