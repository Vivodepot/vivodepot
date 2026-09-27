'use strict';
/* Befund VOLLMACHT-PDF-KAESTCHEN (25.09.2026, HOCH): das Vorsorgevollmacht-PDF brach mit „schrift-luecke" ab, sobald die
   Gesundheitssorge beantwortet war. Der Generator schreibt die Formular-Kästchen selbst (auswahlPaar/auswahlPaarGruppe:
   „☒ ja  ☐ nein"), und die PDF-Schrift trägt sie nicht — Inter 4.1 hat U+2610–U+2612 gar nicht. Der Klassenwächter
   „Textsatz-Zeichen ⊂ PDF-Zuschnitt" sah nur die Moduldateien, nie die Zeichen, die der Generator-Code selbst erzeugt.
   Produktentscheidung: echte Kästchen als Vektor, SCHRIFTUNABHÄNGIG (auch für gebrandete Fassungen mit anderer Schrift).
   Diese Probe (Node, ohne Browser; das echte jsPDF mit Inter und der Bildvergleich stehen in
   tests/e2e/pdf-kaestchen-vektor.spec.js):
   (1) Klasse, Generator-Seite: jedes Nicht-ASCII-Zeichen, das der Generator-Code (MODUL_BLOCK_HANDLER) als Literal trägt,
       ist vom PDF zugesagt ODER wird als Vektor gezeichnet — so fällt ein künftiges Generator-eigenes Zeichen auf;
   (2) Klasse, Ausgabe-Seite: jeder auswahlPaar-/auswahlPaarGruppe-Baustein JEDES Dokument-Moduls der vier Produkte, mit
       JEDEM Auswahlwert, passiert den Torwächter ohne Lücke;
   (3) Engstelle: Umbruch misst Kästchen mit der Stellvertreter-Breite der AKTIVEN Schrift und setzt sie zurück; Zeichnen
       ersetzt sie durch Rahmen (und Kreuz/Haken); Maße aus der Metrik der aktiven Schrift — auch einer Fixture-Schrift mit
       anderer Versalhöhe —, Rückfall 0,7 Geviert ohne Metrik;
   (4) Rot-Beweis: der Zuschnitt trägt die Kästchen wirklich nicht (ohne Vektor-Weg wäre es eine Lücke). */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { ladeKern } = require('./load-kern.js');
const { PRODUKTE, modulDateienFuer } = require('../tools/lib/vier-produkte.js');

const REPO = path.join(__dirname, '..');
const KERN = fs.readFileSync(path.join(REPO, 'vivodepot.html'), 'utf8');

// Ein Fake-jsPDF, das Umbruch, Text und Zeichnung mitschreibt; Metrik und Breiten wählbar (Schrift-Stellvertreter).
function fakeDoc({ metadata = null, mBreite = 8, groesse = 10 } = {}) {
  const log = { text: [], rect: [], line: [], split: [] };
  const doc = {
    _groesse: groesse,
    internal: { scaleFactor: 1, pageSize: { getWidth: () => 600, getHeight: () => 800 } },
    getFontSize: () => doc._groesse, setFontSize: (g) => { doc._groesse = g; return doc; },
    getFont: () => ({ fontName: 'Probe', metadata }),
    getTextWidth: (t) => [...String(t)].reduce((s, c) => s + (c === 'M' ? mBreite : (c === ' ' || c === ' ' ? 2.5 : 5)), 0),
    getLineHeightFactor: () => 1.15,
    getTextColor: () => '#000000', getDrawColor: () => '#111111', setDrawColor: () => doc,
    getLineWidth: () => 0.5, setLineWidth: () => doc,
    rect: (x, y, b, h, stil) => { log.rect.push({ x, y, b, h, stil }); return doc; },
    line: (x1, y1, x2, y2) => { log.line.push({ x1, y1, x2, y2 }); return doc; },
    text: (t, x, y, o) => { log.text.push({ t, x, y, o }); return doc; },
    splitTextToSize: (t, breite) => {
      log.split.push(t);
      // einfacher Wortumbruch nach Breite (wie jsPDF: nur an U+0020)
      const woerter = String(t).split(' '); const zeilen = []; let z = '';
      for (const w of woerter) { const k = z ? z + ' ' + w : w; if (doc.getTextWidth(k) > breite && z) { zeilen.push(z); z = w; } else z = k; }
      if (z) zeilen.push(z);
      return zeilen;
    },
  };
  return { doc, log };
}

test('[PDF-Kästchen·Rot-Beweis] die PDF-Schrift trägt ☐ ☑ ☒ nicht — ohne Vektor-Weg wären sie eine Schriftlücke', () => {
  const { V } = ladeKern();
  for (const z of ['☐', '☑', '☒']) assert.deepEqual(V.pdfZeichenOhneDeckung(z), [z], z);
  assert.deepEqual(Object.keys(V.PDF_KAESTCHEN).sort(), ['☐', '☑', '☒']);
});

test('[PDF-Kästchen·Klasse·Generator-Code] jedes Nicht-ASCII-Literal der Generator-Bausteine ist PDF-zugesagt oder Vektor', () => {
  const { V } = ladeKern();
  const a = KERN.indexOf('const MODUL_BLOCK_HANDLER = {');
  assert.ok(a > 0, 'MODUL_BLOCK_HANDLER gefunden');
  const rumpf = KERN.slice(a, KERN.indexOf('\n};\n', a));
  const literale = [...rumpf.matchAll(/'((?:[^'\\\n]|\\.)*)'/g)].map((m) => JSON.parse('"' + m[1].replace(/"/g, '\\"') + '"'));
  const zeichen = new Set();
  for (const l of literale) for (const z of l) if (z.codePointAt(0) > 0x7E) zeichen.add(z);
  assert.ok(zeichen.has('☒') && zeichen.has('☐'), 'Kontrolle: der Generator schreibt ☒/☐ selbst');
  const offen = [...zeichen].filter((z) => !V.pdfZeichenUnterstuetzt(z.codePointAt(0)) && !V.PDF_KAESTCHEN[z]);
  assert.deepEqual(offen, [], 'Generator-eigene Zeichen ohne PDF-Weg: ' + offen.join(' '));
});

function dokumentModulDateien() {
  const d = new Set();
  for (const p of PRODUKTE) for (const f of modulDateienFuer(p)) if (f && /dokument|vorlage|template/i.test(f)) d.add(path.resolve(f));
  for (const f of fs.readdirSync(path.join(REPO, 'tools', 'dokument-module'))) if (f.endsWith('.json')) d.add(path.join(REPO, 'tools', 'dokument-module', f));
  return [...d].sort();
}
function paarBausteine(o, raus = []) {
  if (Array.isArray(o)) o.forEach((x) => paarBausteine(x, raus));
  else if (o && typeof o === 'object') {
    if (o.typ === 'auswahlPaar' || o.typ === 'auswahlPaarGruppe') raus.push(o);
    Object.values(o).forEach((x) => paarBausteine(x, raus));
  }
  return raus;
}

test('[PDF-Kästchen·Klasse·Ausgabe] alle Dokument-Module × alle Auswahlwerte: jede Paar-Zeile passiert den Torwächter ohne Lücke', () => {
  const { V } = ladeKern();
  const dateien = dokumentModulDateien();
  let gezaehlt = 0;
  for (const f of dateien) {
    for (const blk of paarBausteine(JSON.parse(fs.readFileSync(f, 'utf8')))) {
      const felder = blk.typ === 'auswahlPaar' ? [blk.feldId] : blk.punkte.map((p) => p.feldId);
      for (const wert of ['ja', 'nein']) {
        const d = Object.fromEntries(felder.map((id) => [id, wert]));
        const zeilen = V.MODUL_BLOCK_HANDLER[blk.typ](blk, { d });
        const { doc } = fakeDoc();
        V._pdfSchriftPruefungInstallieren(doc);
        for (const z of zeilen) for (const zeile of doc.splitTextToSize(z, 495)) doc.text(zeile, 50, 60);
        assert.deepEqual(V._pdfSchriftLueckenBuendeln(doc), [], path.relative(REPO, f) + ' ' + felder[0] + '=' + wert);
        gezaehlt++;
      }
    }
  }
  assert.ok(gezaehlt >= 40, 'Kontrolle: die Paar-Bausteine der Dokument-Module werden durchlaufen (' + gezaehlt + ')');
});

test('[PDF-Kästchen·Engstelle] Umbruch mit Stellvertreter-Breite, Kästchen an ihren Platz zurück, Text ohne Kästchen gezeichnet', () => {
  const { V } = ladeKern();
  const { doc, log } = fakeDoc({ mBreite: 8 });
  V._pdfSchriftPruefungInstallieren(doc);
  const zeilen = doc.splitTextToSize('Behandlung  ☒ ja  ☐ nein', 60);
  assert.ok(log.split[0].indexOf('☒') < 0 && log.split[0].indexOf('M') > 0, 'gemessen mit Stellvertreter');
  assert.equal(zeilen.join(' ').replace(/\s+/g, ' '), 'Behandlung ☒ ja ☐ nein'.replace(/\s+/g, ' '), 'Kästchen an ihrem Platz');
  assert.ok(zeilen.every((z) => !/M/.test(z)), 'kein Stellvertreter bleibt stehen');
  doc.text('A  ☒ ja  ☐ nein  ☑ ok', 50, 100);
  assert.ok(log.text.every((e) => !/[☐-☒]/.test(e.t)), 'kein Kästchen als Zeichen geschrieben');
  assert.equal(log.rect.length, 3, 'drei Rahmen');
  assert.equal(log.line.length, 2 + 2, 'Kreuz (2 Linien) und Haken (2 Linien)');
  assert.deepEqual(V._pdfSchriftLueckenBuendeln(doc), [], 'keine Lücke');
});

test('[PDF-Kästchen·Schriftunabhängig] Maße aus der aktiven Schrift: Versalhöhe aus der Metrik, Rückfall 0,7 Geviert', () => {
  const { V } = ladeKern();
  const inter = { capHeight: 1490, head: { unitsPerEm: 2048 } };
  const probeKlein = { capHeight: 1100, head: { unitsPerEm: 2048 } };   // tests/fixtures/pdf-schrift-probe-klein.ttf
  const fall = (metadata, groesse, mBreite) => {
    const { doc, log } = fakeDoc({ metadata, groesse, mBreite });
    V._pdfSchriftPruefungInstallieren(doc);
    doc.text('☐', 50, 100);
    return log.rect[0];
  };
  const a = fall(inter, 10, 20), b = fall(probeKlein, 10, 20), c = fall(null, 10, 20), d = fall(inter, 20, 40);
  assert.ok(Math.abs(a.h - 10 * 1490 / 2048) < 1e-9, 'Inter: Seite = Versalhöhe');
  assert.ok(Math.abs(b.h - 10 * 1100 / 2048) < 1e-9, 'Fixture-Schrift: Seite folgt IHRER Versalhöhe');
  assert.ok(Math.abs(c.h - 7) < 1e-9, 'ohne Metrik: 0,7 Geviert');
  assert.ok(Math.abs(d.h - 2 * a.h) < 1e-9, 'wächst mit der Schriftgröße');
  for (const r of [a, b, c, d]) {
    assert.equal(r.b, r.h, 'quadratisch');
    assert.ok(Math.abs(r.y + r.h - 100) < 1e-9, 'steht auf der Grundlinie');
  }
  const schmal = fall(inter, 10, 5);
  assert.ok(schmal.h <= 5 * 0.86 + 1e-9, 'nie breiter als der Vorschub der Schrift');
});

test('[PDF-Kästchen·Engstelle] rechtsbündig und Array-Zeilen: Lage aus Gesamtbreite und Zeilenhöhe', () => {
  const { V } = ladeKern();
  const { doc, log } = fakeDoc({ mBreite: 8 });
  V._pdfSchriftPruefungInstallieren(doc);
  doc.text('☒ ja', 300, 100, { align: 'right' });
  const gesamt = 8 + doc.getTextWidth(' ja');
  assert.ok(Math.abs(log.rect[0].x - (300 - gesamt + (8 - log.rect[0].b) / 2)) < 1e-9, 'rechtsbündig endet bei x');
  doc.text(['☐ a', '☐ b'], 50, 200);
  assert.ok(Math.abs((log.rect[2].y - log.rect[1].y) - 10 * 1.15) < 1e-9, 'Zeilenabstand = Größe × Zeilenhöhenfaktor');
});
