'use strict';
/* Befund GILT-AB-VOR-BIS (MITTEL, Gestaltungsleitung 03.11.2026, am Bild „Führerschein — gültig bis“ bei 390): an einem Feld mit
   Ablaufmarke stand „gilt ab“ UNTER dem eigenen Datum („gültig bis“), seine drei Felder waren schmaler (die Zeile trug die kleine
   Schrift, die Breiten rechnen in ch), und sein Etikett war klein und fett statt im Etikettenstil des Felds. Entscheidung (A):
   · „<Feld> — gilt ab“ ist eine eigene Feldzeile VOR dem Feld, mit demselben Etikett (.feld-label), parallel zu „<Feld> — gültig bis“;
   · darin kein zweites kleines „gilt ab“, die Gruppe heißt beim Vorlesen wie das Etikett;
   · die Dreifelder beider Zeilen stehen in derselben Schriftgröße, also gleich breit.
   Gilt für jedes Feld mit Ablaufmarke. Rot-Beweis: der Stand davor (Zeile im Feld, hinter dem Datum) fällt durch. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { ladeKern } = require('./load-kern.js');

const ROOT = path.join(__dirname, '..');
const KERN = fs.readFileSync(path.join(ROOT, 'vivodepot.html'), 'utf8');
const GRUNDLAGE = fs.readFileSync(path.join(ROOT, 'tools/erscheinung/stil/grundlage.css'), 'utf8');

function feldVon(V, sid, fid) {
  for (const sek of (V.SEKTOR_BY_ID[sid].sektionen || [])) for (const f of (sek.felder || [])) if (f.id === fid) return f;
  return null;
}

/* Rein: was die gerenderte Zeile eines Felds mit Ablaufmarke über „gilt ab“ sagt. */
function funde(V, html, feld) {
  const aus = [];
  const etikett = feld.label.split(' — ')[0] + ' — ' + V.STRINGS.gueltigkeitVon;
  const ab = html.indexOf('<div class="feld-zeile feld-zeile--gilt-ab"><div class="feld-label">' + V.escapeHTML(etikett) + '</div>');
  const bis = html.indexOf('<div class="feld-label">' + V.escapeHTML(feld.label));
  if (ab < 0) aus.push('keine eigene Zeile „' + etikett + '“');
  else if (bis >= 0 && ab > bis) aus.push('„gilt ab“ steht hinter „gültig bis“');
  if (html.includes('<span>' + V.escapeHTML(V.STRINGS.gueltigkeitVon) + '</span>')) aus.push('ein zweites kleines „gilt ab“ steht da');
  if (!html.includes('aria-label="' + V.escapeHTML(etikett) + '"')) aus.push('die Gruppe heißt beim Vorlesen nicht wie das Etikett');
  return aus;
}

test('[Gilt ab] Führerschein: eigene Zeile „Führerschein — gilt ab“ vor „Führerschein — gültig bis“', () => {
  const { V } = ladeKern();
  const f = feldVon(V, 'mobility', 'drivingLicenceValidUntil');
  assert.ok(f, 'Vorbedingung: das Feld steht im Bereich');
  assert.deepEqual(funde(V, V.feldZeileHTML(f, '', 'mobility', true, true), f), []);
});

test('[Gilt ab] jedes Feld mit Ablaufmarke folgt demselben Muster', () => {
  const { V } = ladeKern();
  const aus = [];
  let zahl = 0;
  for (const s of Object.values(V.SEKTOR_BY_ID)) for (const sek of (s.sektionen || [])) for (const f of (sek.felder || [])) {
    if (!f.label || !V.feldHatMarke(s.id, f.id, 'laeuftAb')) continue;
    zahl++;
    for (const x of funde(V, V.feldZeileHTML(f, '', s.id, true, true), f)) aus.push(s.id + '.' + f.id + ': ' + x);
  }
  assert.ok(zahl >= 5, 'Vorbedingung: Felder mit Ablaufmarke gefunden (' + zahl + ')');
  assert.deepEqual(aus, []);
});

/* Damit „<Feld> — gilt ab“ nie „… bis — gilt ab“ heißt: jedes Etikett eines Felds mit Ablaufmarke hat die Form „<Feld> — …“,
   in beiden Sprachen (Gestaltungsleitung 03.11.2026, Anlass „Pflegegrad befristet bis“). */
test('[Gilt ab] jedes Etikett mit Ablaufmarke hat die Form „<Feld> — …“, de und en', () => {
  const { V } = ladeKern();
  const en = JSON.parse(fs.readFileSync(path.join(ROOT, 'tools/textsatz-en-modul.json'), 'utf8')).texte;
  const de = JSON.parse(fs.readFileSync(path.join(ROOT, 'tools/textsatz-de-modul.json'), 'utf8')).texte;
  const aus = [];
  for (const s of Object.values(V.SEKTOR_BY_ID)) for (const sek of (s.sektionen || [])) for (const f of (sek.felder || [])) {
    if (!f.label || !V.feldHatMarke(s.id, f.id, 'laeuftAb')) continue;
    for (const [sprache, t] of [['de', de], ['en', en]]) {
      const l = t[s.id + '.' + f.id + '.label'];
      if (typeof l === 'string' && !/^[^—]+ — \S/.test(l)) aus.push(sprache + ' ' + s.id + '.' + f.id + ': ' + l);
    }
  }
  assert.deepEqual(aus, []);
  assert.ok(!/^[^—]+ — \S/.test('Pflegegrad befristet bis'), 'Rot-Beweis: das alte Etikett fällt durch');
});

test('[Gilt ab] die Dreifelder stehen in der Schrift des Felds, nicht in der kleinen Zeilenschrift', () => {
  assert.match(GRUNDLAGE, /\.feld-zeile--gilt-ab \.gueltigkeit-zeile \{ margin-top: 0; font-size: inherit; \}/);
});

test('[Gilt ab·Rot-Beweis] der Stand davor (im Feld, hinter dem Datum, kleines „gilt ab“) fällt durch', () => {
  const { V } = ladeKern();
  const f = feldVon(V, 'mobility', 'drivingLicenceValidUntil');
  const alt = '<div class="feld-zeile"><div class="feld-label">' + V.escapeHTML(f.label) + '</div><div class="feld-wert feld-wert--gueltigkeit-verschmolzen">' +
    '<div class="datum-dreifeld"></div><div class="gueltigkeit-zeile ist-offen"><div class="gueltigkeit-feld"><span>' + V.escapeHTML(V.STRINGS.gueltigkeitVon) +
    '</span><div aria-label="' + V.escapeHTML(V.STRINGS.gueltigkeitVon) + '"></div></div></div></div></div>';
  const fu = funde(V, alt, f);
  assert.ok(fu.some((x) => x.startsWith('keine eigene Zeile')) && fu.includes('ein zweites kleines „gilt ab“ steht da'), fu.join(' | '));
  assert.ok(KERN.includes('function feldZeileHTML('), 'Vorbedingung');
});
