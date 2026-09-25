'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   `.depot-pille` — die effektive Trefferfläche, nicht die erste Regel
   Auftragskette Abwesenheit (15.08.2026), Glied 1. Registerzeile A247.
   ────────────────────────────────────────────────────────────────────────────
   DER ANLASS. Der Design-System-Abgleich (G7) meldete einen Widerspruch: zwei
   Trefferflächen für dieselbe Klasse im selben Stylesheet, 24 px und 44 px.
   Gemessen war er keiner — beide Selektoren haben dieselbe Spezifität, die
   spätere Regel gewinnt, und `tools/depot-pille-messen.js` hat das über 54
   Lagen (6 Breiten × 3 Themes × 3 Skalen) bestätigt: `min-height` ist überall
   44 px, keine Unterschreitung. Der 24-px-Wert war tot und ist entfernt.

   WAS DIESE PROBE BEWACHT, und warum sie NICHT die Messung wiederholt: die
   empirische Messung braucht einen Browser und ein eingerichtetes Depot — das
   ist ein Werkzeuglauf, kein Suite-Kandidat. Was hier steht, ist die
   CASCADE-Aussage, aus der die Messung folgt: **keine `.depot-pille`-Regel
   ausserhalb einer Media-Query setzt eine Trefferfläche unter 44 px, und die
   A47-Sammelregel führt `.depot-pille` weiterhin.** Fiele eine der beiden
   Bedingungen, wäre die gemessene 44 px am nächsten Tag eine andere Zahl.

   DIE BEWUSSTE GRENZE. Innerhalb `@media (max-width: 760px)` steht
   `.depot-pille { min-width: 0 }`, und das bleibt so — die Pille wird durch
   ihren Inhalt (Depot-Name) ohnehin 95–160 px breit, gemessen. Diese Probe
   prüft darum die HÖHE hart und die BREITE nur ausserhalb der Media-Query;
   eine Probe, die `min-width: 0` als Verstoss meldete, wäre rot aus
   Gewohnheit, nicht aus Befund.
   ════════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const KERN = path.join(__dirname, '..', 'vivodepot.html');
const ZUSAGE = 44;

/* Alle Regelblöcke, deren Selektorliste `.depot-pille` enthält, mit der Angabe,
   ob sie in einer Media-Query stehen. Grobe Cascade-Lesung, kein CSS-Parser —
   dieselbe bewusste Grenze wie in den Nachbar-Wächtern dieses Repos. */
function pilleRegeln(css) {
  const zeilen = css.split('\n');
  const raus = [];
  /* Ein Stapel der offenen Blöcke, je mit der Angabe, ob es ein `@media` ist.
     Der erste Entwurf zählte Klammern mit zwei Zählern nebeneinander und hat
     die Media-Zugehörigkeit der `min-width: 0`-Regel verloren — die Gegenprobe
     unten wurde prompt rot. Ein Stapel ist die ehrliche Form: er weiß, WAS
     offen ist, nicht nur WIE VIELE. */
  const stapel = [];
  const inMedia = () => stapel.some((s) => s === 'media');
  for (let i = 0; i < zeilen.length; i++) {
    const z = zeilen[i];
    const ohneKommentar = z.replace(/\/\*.*?\*\//g, '');
    const trefferHier = /\.depot-pille\b/.test(ohneKommentar) && /\{/.test(ohneKommentar);
    const medienKopf = /@media/.test(ohneKommentar);
    const warInMedia = inMedia();

    if (trefferHier) {
      let block = ohneKommentar;
      let j = i;
      while (!/\}/.test(block) && j < zeilen.length - 1) { j++; block += ' ' + zeilen[j]; }
      raus.push({ zeile: i + 1, inMedia: warInMedia, block });
    }

    /* Klammern dieser Zeile in Reihenfolge abarbeiten. */
    for (const zeichen of ohneKommentar) {
      if (zeichen === '{') stapel.push(medienKopf && stapel.every((s) => s !== 'media') ? 'media' : 'regel');
      else if (zeichen === '}') stapel.pop();
    }
  }
  return raus;
}

function zahlAus(block, eigenschaft) {
  const m = new RegExp(eigenschaft + '\\s*:\\s*([0-9.]+)px').exec(block);
  return m ? parseFloat(m[1]) : null;
}

const CSS = fs.readFileSync(KERN, 'utf8');

test('[A247·Glied1·Vorbedingung] die Sammelregel führt `.depot-pille` weiterhin mit 44 px', () => {
  const regeln = pilleRegeln(CSS);
  assert.ok(regeln.length >= 2,
    'weniger als zwei `.depot-pille`-Regelblöcke gefunden — die Lesung greift nicht mehr, '
    + 'und eine Probe, die nichts sieht, ist grün aus Blindheit');
  const sammel = regeln.find((r) => !r.inMedia && zahlAus(r.block, 'min-height') === ZUSAGE);
  assert.ok(sammel,
    'Keine Regel ausserhalb einer Media-Query setzt `.depot-pille` mehr auf min-height: 44px. '
    + 'Genau darauf beruht die Messung vom 15.08. (54 Lagen, überall 44 px).');
});

test('[A247·Glied1] keine `.depot-pille`-Regel unterschreitet die 44-px-Höhe', () => {
  const zuKlein = pilleRegeln(CSS)
    .map((r) => ({ ...r, h: zahlAus(r.block, 'min-height') }))
    .filter((r) => r.h !== null && r.h < ZUSAGE)
    .map((r) => `Zeile ${r.zeile}: min-height ${r.h}px`);
  assert.deepEqual(zuKlein, [],
    'Eine Regel setzt die Trefferfläche der Depot-Pille unter die 44-px-Zusage. Der 24-px-Wert '
    + 'an dieser Stelle war bis zum 15.08.2026 tot (spätere Regel gewann) und ist entfernt — '
    + 'ein neuer Wert wäre nicht automatisch ebenso tot, sondern könnte gewinnen.');
});

test('[A247·Glied1] ausserhalb der Media-Query unterschreitet keine Regel die 44-px-Breite', () => {
  /* Innerhalb `@media (max-width: 760px)` ist `min-width: 0` gewollt und
     gemessen unschädlich — die Pille trägt dort ihren Inhalt. */
  const zuSchmal = pilleRegeln(CSS)
    .filter((r) => !r.inMedia)
    .map((r) => ({ ...r, w: zahlAus(r.block, 'min-width') }))
    .filter((r) => r.w !== null && r.w < ZUSAGE)
    .map((r) => `Zeile ${r.zeile}: min-width ${r.w}px`);
  assert.deepEqual(zuSchmal, []);
});

test('[A247·Glied1·Rot] eine wieder eingefügte 24-px-Regel wird gefunden', () => {
  const gepflanzt = CSS.replace(
    '.depot-pille:hover',
    '.depot-pille { min-height: 24px; }\n  .depot-pille:hover');
  assert.notEqual(gepflanzt, CSS, 'Vorbedingung: die Mutation greift');
  const zuKlein = pilleRegeln(gepflanzt)
    .map((r) => zahlAus(r.block, 'min-height'))
    .filter((h) => h !== null && h < ZUSAGE);
  assert.deepEqual(zuKlein, [24],
    'Die Probe muss genau die gepflanzte 24-px-Regel finden — nicht mehr und nicht weniger.');
});

test('[A247·Glied1·Gegenprobe] `min-width: 0` in der Media-Query ist KEIN Fund', () => {
  const inMedia = pilleRegeln(CSS).filter((r) => r.inMedia && /min-width\s*:\s*0/.test(r.block));
  assert.ok(inMedia.length >= 1,
    'Vorbedingung: die `min-width: 0`-Regel steht noch in der Media-Query — sie ist der Grund, '
    + 'aus dem diese Gegenprobe existiert');
  const zuSchmal = pilleRegeln(CSS)
    .filter((r) => !r.inMedia)
    .map((r) => zahlAus(r.block, 'min-width'))
    .filter((w) => w !== null && w < ZUSAGE);
  assert.deepEqual(zuSchmal, [], 'die Media-Query-Regel darf nicht als Verstoss gezählt werden');
});
