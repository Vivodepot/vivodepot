'use strict';
/* Befund PLATZHALTER-WIE-WERT (03.11.2026, gefunden am Bild der Anfrage-Ansicht): Beispielwerte standen als Platzhalter ohne Kennzeichen in
   den Feldern („A123456780“, „Penicillin“) und sahen aus wie eingetragene Werte, auch in Notfallfeldern. Zuschnitt der Gestaltung:
   · jeder Platzhalter mit einem Beispielwert beginnt mit „z. B. “ / „e.g. “;
   · der Platzhalter ist kursiv und bleibt in der hellen Mischfarbe (Kontrast und Abstand zum Wert prüft tests/platzhalter-leer-sichtbar.test.js);
   · die Regel greift für jedes Eingabefeld, auch für die Editoren in der Anfrage-Ansicht.
   Rot-Beweis: der Kern vor dem Fix (Beispiel ohne Vorsatz, Platzhalter nicht kursiv) fällt durch. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { ladeKern } = require('./load-kern.js');

const ROOT = path.join(__dirname, '..');
const KERN = fs.readFileSync(path.join(ROOT, 'vivodepot.html'), 'utf8');
const GRUNDLAGE = fs.readFileSync(path.join(ROOT, 'tools/erscheinung/stil/grundlage.css'), 'utf8');
const TEXTSATZ = { de: 'tools/textsatz-de-modul.json', en: 'tools/textsatz-en-modul.json' };
const VORSATZ = { de: 'z. B. ', en: 'e.g. ' };
/* Feste Platzhalter der Oberfläche, die einen Beispielwert zeigen (Anweisungen wie „Suchen“ oder „Mindestens 12 Zeichen“ nicht). */
const BEISPIEL_SCHLUESSEL = ['kreiseNamePlaceholder', 'vpOrtPlaceholder', 'dokumentNamePlatzhalter', 'dokumentAdressePlatzhalter',
  'dokumentParteiPlatzhalter', 'zusSuchePlatzhalter'];

const text = (sprache) => JSON.parse(fs.readFileSync(path.join(ROOT, TEXTSATZ[sprache]), 'utf8'));
const eintrag = (j, schluessel) => {
  const t = j.texte || j.eintraege || j;
  return t['strings:' + schluessel + '.text'];
};

/* Rein: alle Felder mit Beispiel, gerendert; die Platzhalter, die nicht mit dem Vorsatz beginnen. */
function felderOhneVorsatz(V) {
  const felder = [];
  for (const s of Object.values(V.SEKTOR_BY_ID)) {
    for (const sek of (s.sektionen || [{ felder: s.felder }])) for (const f of (sek.felder || [])) if (f && f.beispiel) felder.push([s.id, f]);
  }
  const aus = [];
  for (const [sid, f] of felder) {
    let html = '';
    try { html = V.feldInputHTML(f, '', undefined, sid); } catch (_) { continue; }
    for (const m of html.matchAll(/placeholder="([^"]*)"/g)) {
      if (m[1] === V.escapeHTML(V.STRINGS.refFreitextPlatzhalter)) continue;   // „oder Freitext“ am Verweis ist eine Anweisung, kein Beispiel
      if (!m[1].startsWith(V.escapeHTML(V.STRINGS.beispielVorsatz || '\u0000'))) aus.push(sid + '.' + f.id + ': ' + m[1]);
    }
  }
  return { zahl: felder.length, aus };
}

function cssFunde(css) {
  const r = /\n  input::placeholder, textarea::placeholder \{([^}]*)\}/.exec(css);
  if (!r) return ['keine Platzhalter-Regel für alle Felder'];
  const aus = [];
  if (!/font-style: italic;/.test(r[1])) aus.push('Platzhalter nicht kursiv');
  return aus;
}

test('[Platzhalter·Vorsatz] jedes Feld mit Beispiel zeigt „z. B. …“ als Platzhalter', () => {
  const { V } = ladeKern();
  assert.equal(V.STRINGS.beispielVorsatz, VORSATZ.de);
  const { zahl, aus } = felderOhneVorsatz(V);
  assert.ok(zahl >= 100, 'Vorbedingung: die Felder mit Beispiel sind gefunden (' + zahl + ')');
  assert.deepEqual(aus, []);
});

test('[Platzhalter·Vorsatz] der Vorsatz steht in beiden Sprachen, auch vor den festen Beispiel-Platzhaltern', () => {
  for (const sprache of ['de', 'en']) {
    const j = text(sprache);
    assert.equal(eintrag(j, 'beispielVorsatz'), VORSATZ[sprache], sprache + ': beispielVorsatz');
    for (const k of BEISPIEL_SCHLUESSEL) {
      const t = eintrag(j, k);
      assert.ok(typeof t === 'string' && t.startsWith(VORSATZ[sprache]), sprache + ' ' + k + ': ' + t);
    }
  }
});

test('[Platzhalter·Stil] kursiv, für jedes Feld (die Farbe bleibt --ink3 des Kanons)', () => {
  assert.deepEqual(cssFunde(GRUNDLAGE), []);
});

test('[Platzhalter·Rot-Beweis] Beispiel ohne Vorsatz und ein gerader Platzhalter fallen durch', () => {
  const alt = KERN.replace(/escapeAttr\(_beispielPlatzhalter\(feld\.beispiel\)\)/, 'escapeAttr(feld.beispiel)');
  assert.notEqual(alt, KERN, 'Vorbedingung: die Stelle steht im Kern');
  const tmp = path.join(require('node:os').tmpdir(), 'platzhalter-rot-' + process.pid + '.html');
  fs.writeFileSync(tmp, alt);
  try {
    const { V } = ladeKern({ htmlPfad: tmp, backen: true });
    assert.ok(felderOhneVorsatz(V).aus.length >= 100, 'ohne Vorsatz fallen die Felder auf');
  } finally { fs.rmSync(tmp, { force: true }); }
  const altCss = GRUNDLAGE.replace(/(\n  input::placeholder, textarea::placeholder \{[^}]*?)font-style: italic;/, '$1font-style: normal;');
  assert.ok(cssFunde(altCss).includes('Platzhalter nicht kursiv'));
});
