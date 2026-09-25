'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   PDF-Titel-Pflicht — Proben für tools/pdf-titel-pflicht-pruefen.js (18.09.2026)
   ════════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { pruefeDatei } = require('../tools/pdf-titel-pflicht-pruefen.js');
const REPO = path.join(__dirname, '..');

function fixture(inhalt, fn) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pdf-titel-pflicht-probe-'));
  const p = path.join(dir, 'probe.html');
  fs.writeFileSync(p, inhalt);
  try { return fn(p); } finally { fs.rmSync(dir, { recursive: true, force: true }); }
}

test('[PDF-Titel-Pflicht] der echte Bestand ist grün — jede jsPDF-Erzeugung trägt einen Titel-Aufruf', () => {
  const funde = pruefeDatei(path.join(REPO, 'vivodepot.html'));
  assert.deepEqual(funde, [], `Unerwarteter Fund — Meldungen: ${JSON.stringify(funde)}`);
});

test('[PDF-Titel-Pflicht·Rot-Beweis] eine jsPDF-Erzeugung ohne Titel-Aufruf wird gefunden', () => {
  const html = `
function flowProbePdf() {
  const doc = new window.jspdf.jsPDF({ unit: 'pt', format: 'a4' });
  doc.text('Hallo', 10, 10);
  doc.save('probe.pdf');
}
`;
  fixture(html, (p) => {
    const funde = pruefeDatei(p);
    assert.equal(funde.length, 1, `Die fehlende Titel-Vergabe wurde nicht gefunden — Meldungen: ${JSON.stringify(funde)}`);
    assert.equal(funde[0].varName, 'doc');
  });
});

test('[PDF-Titel-Pflicht·Gegenprobe] eine jsPDF-Erzeugung MIT setProperties-Titel bleibt grün', () => {
  const html = `
function flowProbePdf() {
  const doc = new window.jspdf.jsPDF({ unit: 'pt', format: 'a4' });
  doc.setProperties({ title: 'Probe' });
  doc.text('Hallo', 10, 10);
  doc.save('probe.pdf');
}
`;
  fixture(html, (p) => {
    const funde = pruefeDatei(p);
    assert.deepEqual(funde, [], `Unerwarteter Fund trotz gesetztem Titel — Meldungen: ${JSON.stringify(funde)}`);
  });
});

test('[PDF-Titel-Pflicht·Gegenprobe] setTitle statt setProperties zählt ebenfalls', () => {
  const html = `
function flowProbePdf() {
  const doc = new window.jspdf.jsPDF({ unit: 'pt', format: 'a4' });
  doc.setTitle('Probe');
  doc.save('probe.pdf');
}
`;
  fixture(html, (p) => {
    const funde = pruefeDatei(p);
    assert.deepEqual(funde, [], `Unerwarteter Fund trotz setTitle — Meldungen: ${JSON.stringify(funde)}`);
  });
});

test('[PDF-Titel-Pflicht·Rot-Beweis] ein Titel-Aufruf auf einer ANDEREN Variable schützt nicht', () => {
  // Zwei Erzeugungen, nur die zweite bekommt einen Titel — die erste bleibt ein echter Fund.
  const html = `
function flowEinsPdf() {
  const doc = new window.jspdf.jsPDF({ unit: 'pt', format: 'a4' });
  doc.text('Eins', 10, 10);
}
function flowZweiPdf() {
  const zweiterDoc = new window.jspdf.jsPDF({ unit: 'pt', format: 'a4' });
  zweiterDoc.setProperties({ title: 'Zwei' });
}
`;
  fixture(html, (p) => {
    const funde = pruefeDatei(p);
    assert.equal(funde.length, 1, `Erwartet genau einen Fund (flowEinsPdf) — Meldungen: ${JSON.stringify(funde)}`);
    assert.equal(funde[0].varName, 'doc');
  });
});

test('[PDF-Titel-Pflicht·Gegenprobe] ein Titel-Aufruf AUSSERHALB der umschließenden Funktion zählt nicht', () => {
  // Der Titel-Aufruf steht zwar im Dateitext, aber in einer anderen (späteren) Funktion —
  // die Zuordnung ist Klammertiefe, nicht "irgendwo in der Datei".
  const html = `
function flowEinsPdf() {
  const doc = new window.jspdf.jsPDF({ unit: 'pt', format: 'a4' });
  doc.text('Eins', 10, 10);
}
function irgendwoAnders() {
  doc.setProperties({ title: 'gehört nicht hierher' });
}
`;
  fixture(html, (p) => {
    const funde = pruefeDatei(p);
    assert.equal(funde.length, 1, `Der Titel-Aufruf außerhalb der Funktion darf nicht schützen — Meldungen: ${JSON.stringify(funde)}`);
  });
});

test('[PDF-Titel-Pflicht] keine jsPDF-Erzeugung in der Datei ergibt keine Funde (nicht: Anker nicht gefunden)', () => {
  fixture('function ohnePdf() { return 1; }\n', (p) => {
    assert.deepEqual(pruefeDatei(p), []);
  });
});
