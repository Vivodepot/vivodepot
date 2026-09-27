'use strict';
/* Klassenwächter: kein Steuerzeichen im Wortlaut einer Standardvorlage (23.09.2026). Die Betreuungsverfügung trägt seit der
   Extraktion viermal U+0083 vor Wahlmöglichkeiten („Zu meinem Betreuer…") — das Kästchen-Glyph der BMJ-PDF, das die
   Textextraktion als Steuerzeichen liefert (tests/fixtures/bmj/*.txt). Am Bildschirm unsichtbar, das Kästchen fehlt. Die
   Vorsorgevollmacht trägt an denselben Stellen ☐. Geprüft werden BEIDE Träger des signierten Wortlauts: die
   Standardvorlage-Moduldateien und docs/template-generator/basistemplate-inhalte.json.

   BEKANNTE ABWEICHUNG, benannt und gezählt (Befund-Ratsche BETREUUNGSVERFUEGUNG-C1, offen): der Wortlaut ist signiert
   (templateJws), die Korrektur braucht die Template-Zeremonie mit dem Treuhandschlüssel — vorbereitet in
   tools/zeremonie-entscheidungen-2026-09-23.json, entfällt für diese Fassung. Die Ausnahme deckt GENAU die vier U+0083 der
   Betreuungsverfügung in beiden Trägern; jedes weitere Steuerzeichen, irgendwo, ist rot. Ist die Zeremonie gelaufen, wird
   die Ausnahme selbst rot (der Zähler stimmt nicht mehr) — dann AUSNAHME leeren und die Ratschen-Zeile schließen. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const REPO = path.join(__dirname, '..');
const C0_ERLAUBT = new Set([0x09, 0x0A, 0x0D]);
const AUSNAHME = Object.freeze({ betreuungsverfuegung: Object.freeze({ 'U+0083': 4 }) });

const steuerzeichen = (text) => {
  const funde = [];
  for (const z of text) {
    const cp = z.codePointAt(0);
    if ((cp < 0x20 && !C0_ERLAUBT.has(cp)) || (cp >= 0x7F && cp <= 0x9F)) funde.push('U+' + cp.toString(16).toUpperCase().padStart(4, '0'));
  }
  return funde;
};
const zaehlen = (funde) => funde.reduce((o, f) => Object.assign(o, { [f]: (o[f] || 0) + 1 }), {});

function wortlaute() {
  const raus = [];
  const ordner = path.join(REPO, 'tools', 'dokument-module');
  for (const f of fs.readdirSync(ordner).filter((n) => /^vivodepot-standardvorlage-.+\.json$/.test(n)).sort()) {
    const modul = JSON.parse(fs.readFileSync(path.join(ordner, f), 'utf8'));
    for (const [id, v] of Object.entries(modul.standardVorlagen || {})) raus.push({ wo: f, id, text: v.wortlaut });
  }
  for (const v of JSON.parse(fs.readFileSync(path.join(REPO, 'docs', 'template-generator', 'basistemplate-inhalte.json'), 'utf8'))) {
    raus.push({ wo: 'basistemplate-inhalte.json', id: v.id, text: v.wortlaut });
  }
  return raus;
}

test('[Standardvorlage·Wortlaut·Klasse] kein Steuerzeichen (C0 außer Tab/Umbruch, DEL, C1) im Wortlaut einer Standardvorlage — beide Träger, bis auf die gezählte Ausnahme', () => {
  const alle = wortlaute().filter((w) => typeof w.text === 'string');
  assert.ok(alle.length >= 8, 'Kontrolle: vier Vorlagen in zwei Trägern gelesen (' + alle.length + ')');
  const abweichend = [];
  for (const w of alle) {
    const ist = zaehlen(steuerzeichen(w.text));
    const soll = AUSNAHME[w.id] || {};
    if (JSON.stringify(ist) !== JSON.stringify(soll)) abweichend.push(w.wo + ' ' + w.id + ': ist ' + JSON.stringify(ist) + ', erlaubt ' + JSON.stringify(soll));
  }
  assert.deepEqual(abweichend, [], 'Steuerzeichen im Wortlaut (oder die Ausnahme ist erledigt und zu streichen):\n' + abweichend.join('\n'));
});

test('[Standardvorlage·Wortlaut·Klasse·Positivkontrolle] der Prüfer findet U+0083 und lässt Tab und Umbruch durch', () => {
  assert.deepEqual(steuerzeichen('a\t\u0083 b\nc'), ['U+0083']);
  assert.deepEqual(steuerzeichen('\u007F\u009F\u0001'), ['U+007F', 'U+009F', 'U+0001']);
});

test('[Standardvorlage·Wortlaut·Klasse·Rot-Beweis] ein fünftes Steuerzeichen in der Betreuungsverfügung oder eines in einer anderen Vorlage schlägt an', () => {
  const pruefen = (id, text) => JSON.stringify(zaehlen(steuerzeichen(text))) === JSON.stringify(AUSNAHME[id] || {});
  const bv = wortlaute().find((w) => w.id === 'betreuungsverfuegung').text;
  assert.equal(pruefen('betreuungsverfuegung', bv), true, 'Vorbedingung: der heutige Bestand ist genau die Ausnahme');
  assert.equal(pruefen('betreuungsverfuegung', bv + '\u0083'), false);
  assert.equal(pruefen('vorsorgevollmacht', 'Text\u0083'), false);
  assert.equal(pruefen('betreuungsverfuegung', bv.replace(/\u0083/g, '☐')), false, 'nach der Zeremonie wird die Ausnahme selbst rot');
});
