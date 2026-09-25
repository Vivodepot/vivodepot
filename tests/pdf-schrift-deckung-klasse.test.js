'use strict';
/* PDF-Schriftdeckung als Klasse (U2-ADR-263; Befund PDF-MINUS-BLUTGRUPPE, 23.09.2026): die Notfallkarte fiel für jede
   Rh-negative Blutgruppe aus, weil das Sprachmodul „−" (U+2212) trägt und der PDF-Zuschnitt es nicht deckt. Zwei Hälften:
   (1) jedes Zeichen, das in einem Sprachmodul oder einer Ab-Werk-Datei eines Produkts steht, sagt der Kern als
       PDF-darstellbar zu — abgeleitet aus den Moduldateien, nicht aus einer Handliste;
   (2) jede Zusage des Kerns liegt wirklich in allen drei eingebetteten Schnitten (tools/schrift-pdf-quellen/*.ttf, deren
       Bytes tests/pdf-inter-einbetten.test.js gegen den Kern hält) — sonst würde eine erweiterte Zusage ohne neue Schrift
       still leere Kästchen drucken. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { ladeKern } = require('./load-kern.js');
const { PRODUKTE, modulDateienFuer } = require('../tools/lib/vier-produkte.js');

const REPO = path.join(__dirname, '..');
const QUELLEN = path.join(REPO, 'tools', 'schrift-pdf-quellen');

/* Nicht geprüft: Steuerzeichen unter U+0020 (Zeilenumbruch, Tabulator) — sie erreichen doc.text nie, splitTextToSize bricht
   an ihnen; und jedes Zeichen, das NUR im Wortlaut der Vorlagen steht (das weiche Trennzeichen, ein C1-Steuerzeichen) —
   den zeichnet kein PDF-Erzeuger, die Gegenprobe unten hält genau das fest. Die Formular-Kästchen ☐ ☑ ☒ (PDF_KAESTCHEN)
   gelten als gedeckt: sie werden seit 25.09.2026 als Vektor gezeichnet, nicht geschrieben (Befund VOLLMACHT-PDF-KAESTCHEN,
   tests/pdf-kaestchen-vektor.test.js). Weitere Ausnahmen nur benannt in AUSNAHMEN. */
const AUSNAHMEN = new Map();

function moduldateien() {
  const d = new Set([path.join(REPO, 'tools', 'textsatz-de-modul.json'), path.join(REPO, 'tools', 'textsatz-en-modul.json')]);
  for (const p of PRODUKTE) for (const f of modulDateienFuer(p)) if (f) d.add(path.resolve(f));
  return [...d].sort();
}
function zeichenMitOrt(dateien) {
  const raus = new Map();
  const lauf = (o, wo) => {
    if (typeof o === 'string') {
      for (const z of o) {
        const cp = z.codePointAt(0);
        if (!raus.has(cp)) raus.set(cp, new Set());
        raus.get(cp).add(wo);
      }
    } else if (o && typeof o === 'object') {
      for (const [k, v] of Object.entries(o)) lauf(v, wo + '.' + k);
    }
  };
  for (const f of dateien) lauf(JSON.parse(fs.readFileSync(f, 'utf8')), path.relative(REPO, f));
  return raus;
}
const hex = (cp) => 'U+' + cp.toString(16).toUpperCase().padStart(4, '0');

/* Die cmap einer TrueType-Datei, ohne externes Modul: Unterformat 12 (volle Unicode-Tabelle) oder 4 (BMP). */
function cmapCodepunkte(datei) {
  const b = fs.readFileSync(datei);
  const tabellen = b.readUInt16BE(4);
  let cmap = -1;
  for (let i = 0; i < tabellen; i++) {
    const e = 12 + i * 16;
    if (b.toString('ascii', e, e + 4) === 'cmap') cmap = b.readUInt32BE(e + 8);
  }
  if (cmap < 0) throw new Error('keine cmap in ' + datei);
  const unter = [];
  for (let i = 0; i < b.readUInt16BE(cmap + 2); i++) {
    const e = cmap + 4 + i * 8;
    unter.push({ plattform: b.readUInt16BE(e), kodierung: b.readUInt16BE(e + 2), ort: cmap + b.readUInt32BE(e + 4) });
  }
  const cps = new Set();
  const f12 = unter.find((u) => b.readUInt16BE(u.ort) === 12);
  if (f12) {
    const n = b.readUInt32BE(f12.ort + 12);
    for (let i = 0; i < n; i++) {
      const g = f12.ort + 16 + i * 12;
      for (let c = b.readUInt32BE(g); c <= b.readUInt32BE(g + 4); c++) cps.add(c);
    }
    return cps;
  }
  const f4 = unter.find((u) => b.readUInt16BE(u.ort) === 4 && u.plattform !== 1);
  if (!f4) throw new Error('weder Format 12 noch 4 in ' + datei);
  const segX2 = b.readUInt16BE(f4.ort + 6);
  const enden = f4.ort + 14, anfaenge = enden + segX2 + 2, deltas = anfaenge + segX2, offsets = deltas + segX2;
  for (let s = 0; s < segX2 / 2; s++) {
    const ende = b.readUInt16BE(enden + s * 2), anfang = b.readUInt16BE(anfaenge + s * 2);
    const delta = b.readInt16BE(deltas + s * 2), offset = b.readUInt16BE(offsets + s * 2);
    for (let c = anfang; c <= ende && c !== 0xFFFF; c++) {
      let glyph;
      if (offset === 0) glyph = (c + delta) & 0xFFFF;
      else { const g = b.readUInt16BE(offsets + s * 2 + offset + (c - anfang) * 2); glyph = g === 0 ? 0 : (g + delta) & 0xFFFF; }
      if (glyph !== 0) cps.add(c);
    }
  }
  return cps;
}

test('[PDF-Schrift·Klasse·Rot-Beweis] jedes Zeichen der Sprach- und Ab-Werk-Module ist vom PDF-Zuschnitt zugesagt — bis auf die benannten Ausnahmen', () => {
  const { V } = ladeKern();
  const dateien = moduldateien();
  assert.ok(dateien.length > 10, 'Kontrolle: die Moduldateien der vier Produkte werden gelesen (' + dateien.length + ')');
  const fehlt = [];
  for (const [cp, orte] of zeichenMitOrt(dateien)) {
    if (cp < 0x20 || AUSNAHMEN.has(cp)) continue;
    if ([...orte].every((wo) => /\.wortlaut$/.test(wo))) continue;   // nur im Wortlaut der Vorlagen: erreicht kein PDF (Gegenprobe unten)
    if (!V.pdfZeichenUnterstuetzt(cp) && !(V.PDF_KAESTCHEN && V.PDF_KAESTCHEN[String.fromCodePoint(cp)])) fehlt.push(hex(cp) + ' ' + String.fromCodePoint(cp) + ' ← ' + [...orte].slice(0, 2).join(', '));
  }
  assert.deepEqual(fehlt, [], 'nicht zugesagte Zeichen:\n' + fehlt.join('\n'));
});

test('[PDF-Schrift·Klasse·Gegenprobe] kein PDF-Erzeuger zeichnet einen Wortlaut — die Wortlaut-Ausnahme (C1, weiches Trennzeichen) trägt', () => {
  // Früher hielt diese Probe auch fest, ☐ stehe nur im Wortlaut. Das war zu eng gedacht: der Generator selbst schreibt
  // ☒/☐ (auswahlPaar) — genau das übersah die Klasse (VOLLMACHT-PDF-KAESTCHEN). Die Kästchen sind jetzt Vektor.
  const kern = fs.readFileSync(path.join(REPO, 'vivodepot.html'), 'utf8');
  for (const name of ['zeichneDokumentPdf', 'zeichneNotfallkarte', 'zeichneSituationPdf', 'zeichneVollDepotPdf', 'zeichneWiderrufPdf']) {
    const a = kern.indexOf('function ' + name + '(');
    assert.ok(a >= 0, name + ' gefunden');
    const rumpf = kern.slice(a, kern.indexOf('\n}\n', a));
    assert.doesNotMatch(rumpf, /wortlaut/, name + ' zeichnet einen Wortlaut — dann trägt die Wortlaut-Ausnahme nicht mehr');
  }
});

test('[PDF-Schrift·Zusage = Schrift] jede Zusage von pdfZeichenUnterstuetzt liegt in allen drei eingebetteten Schnitten', () => {
  const { V } = ladeKern();
  const schnitte = fs.readdirSync(QUELLEN).filter((f) => f.endsWith('.ttf')).sort();
  assert.deepEqual(schnitte.length, 3, 'Kontrolle: drei Schnitte (' + schnitte.join(', ') + ')');
  const zusagen = [];
  for (let cp = 0x20; cp <= 0x2FFF; cp++) if (V.pdfZeichenUnterstuetzt(cp)) zusagen.push(cp);
  assert.ok(zusagen.length > 500, 'Kontrolle: Zusagen gelesen (' + zusagen.length + ')');
  for (const s of schnitte) {
    const cps = cmapCodepunkte(path.join(QUELLEN, s));
    const fehlt = zusagen.filter((cp) => !cps.has(cp)).map(hex);
    assert.deepEqual(fehlt, [], s + ': zugesagt, aber nicht in der Schrift');
  }
});

/* Der gemeinsame Torwächter aller PDF-Erzeuger (_pdfSchriftPruefungInstallieren + _pdfSchriftLueckenBuendeln), an einem
   Stellvertreter-Dokument ohne jsPDF: was er meldet, wird nicht erzeugt (Notfallkarte: keine Karte). */
function torwaechterFunde(V, texte) {
  const doc = { text: () => doc, splitTextToSize: (t) => [t], getTextWidth: () => 10, internal: { pageSize: { getWidth: () => 600, getHeight: () => 800 } } };
  V._pdfSchriftPruefungInstallieren(doc);
  for (const t of texte) doc.text(t, 10, 10);
  return V._pdfSchriftLueckenBuendeln(doc).flatMap((f) => f.zeichen);
}

test('[PDF-Schrift·Torwächter·Rot-Beweis] eine Rh-negative Blutgruppe passiert den Torwächter der PDF-Erzeuger, in DE und EN', () => {
  const { V } = ladeKern();
  assert.deepEqual(torwaechterFunde(V, ['0 −', 'A −', 'B −', 'AB −', 'O−', 'A−', 'B−', 'AB−', 'Weiter →', '✓ gespeichert', 'Łukasz Öztürk']), []);
});

test('[PDF-Schrift·Torwächter·heutiges Verhalten] ein Name außerhalb des Zuschnitts (Kyrillisch, Griechisch) wird gemeldet — keine Karte; offene Produktfrage, hier nur festgehalten', () => {
  const { V } = ladeKern();
  assert.ok(torwaechterFunde(V, ['Олена Коваленко']).length > 0, 'Kyrillisch wird gemeldet');
  assert.ok(torwaechterFunde(V, ['Ελένη Παπαδοπούλου']).length > 0, 'Griechisch wird gemeldet');
});

test('[PDF-Schrift·Weiches Trennzeichen·Rot-Beweis] U+00AD passiert den Torwächter und wird nicht gezeichnet — in doc.text und im Umbruch', () => {
  const { V } = ladeKern();
  const gezeichnet = [];
  const umbrochen = [];
  const doc = { text: (t) => { gezeichnet.push(t); return doc; }, splitTextToSize: (t) => { umbrochen.push(t); return [t]; }, internal: { pageSize: { getWidth: () => 600, getHeight: () => 800 } } };
  V._pdfSchriftPruefungInstallieren(doc);
  doc.splitTextToSize('Haus\u00ADarzt', 100);
  doc.text('Haus\u00ADarzt', 10, 10);
  doc.text(['Ver\u00ADtrag', 'ohne'], 10, 20);
  assert.deepEqual(V._pdfSchriftLueckenBuendeln(doc), [], 'keine Lücke gemeldet');
  assert.deepEqual(gezeichnet, ['Hausarzt', ['Vertrag', 'ohne']], 'gezeichnet ohne weiches Trennzeichen');
  assert.deepEqual(umbrochen, ['Hausarzt'], 'umbrochen ohne weiches Trennzeichen');
});

test('[PDF-Schrift·C1·Rot-Beweis] ein C1-Steuerzeichen wird gemeldet statt als leeres Kästchen gedruckt', () => {
  const { V } = ladeKern();
  assert.equal(V.pdfZeichenUnterstuetzt(0x85), false);
  assert.ok(torwaechterFunde(V, ['Name\u0085']).length > 0);
});
