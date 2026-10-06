'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   pdf-schrift-tueren.js — die statische Hälfte der Offline-Garantie für PDF-Schriften (U2-ADR-097, Nachtrag v896)
   ────────────────────────────────────────────────────────────────────────────
   Die Zusicherung bleibt: jsPDF lädt nie nach (loadFile ist seine einzige XHR-Tür). Erreichbar wäre sie über addFont für eine
   Schrift, die nicht im VFS liegt. Bis v895 lag die PDF-Inter in einem vendorten Block; seit v896 kommen die TTF-Bytes aus dem
   geprüften Erscheinungsbild, registriert in GENAU EINEM Gerüst-Block (<script id="pdf-schriften-registrieren">). Geprüft:
     (a) eigener Code (die beiden Kern-Skripte) nennt addFont / addFileToVFS / loadFile / loadImageFile NIE;
     (b) der Registrier-Block ist da, genau einmal, registriert über jsPDFs addFonts-Ereignis, nennt loadFile/loadImageFile nie,
         und jedem addFont(X, …) geht ein addFileToVFS(X, …) derselben Datei voraus;
     (c) setFont nimmt nur Standardschriften als Literal oder _PDF_MARKE_SCHRIFT — und die ist nicht als Literal gesetzt.
   Liefert die Mängel als Liste (leer = gut). Rot-Beweise: tests/pdf-schrift-tueren.test.js.
   ════════════════════════════════════════════════════════════════════════════ */
const STANDARD = new Set(['helvetica', 'times', 'courier', 'symbol', 'zapfdingbats']);
const BLOCK_ANFANG = '<script id="pdf-schriften-registrieren">';

function pdfSchriftTuerenPruefen(html, extrahiereScripts) {
  const m = [];
  const { script1, script2 } = extrahiereScripts(html);
  const eigen = script1 + '\n' + script2;
  for (const tuer of ['addFont', 'addFileToVFS', 'loadFile', 'loadImageFile']) {
    const n = eigen.split(tuer).length - 1;
    if (n) m.push('eigener Code nennt ' + tuer + ' (' + n + '×)');
  }
  const anzahl = html.split(BLOCK_ANFANG).length - 1;
  if (anzahl !== 1) m.push('Registrier-Block ' + anzahl + '× statt genau einmal');
  if (anzahl >= 1) {
    const a = html.indexOf(BLOCK_ANFANG) + BLOCK_ANFANG.length;
    const block = html.slice(a, html.indexOf('</script>', a));
    if (!/jsPDFAPI\.events\.push\(\s*\[\s*'addFonts'/.test(block)) m.push('Registrier-Block registriert nicht über das addFonts-Ereignis');
    for (const tuer of ['loadFile', 'loadImageFile']) if (block.includes(tuer)) m.push('Registrier-Block nennt ' + tuer);
    const vfs = [...block.matchAll(/addFileToVFS\(\s*([^,]+),/g)].map((x) => ({ arg: x[1].trim(), pos: x.index }));
    for (const f of block.matchAll(/addFont\(\s*([^,]+),/g)) {
      if (!vfs.some((v) => v.arg === f[1].trim() && v.pos < f.index)) m.push('addFont(' + f[1].trim() + ') ohne vorangehendes addFileToVFS derselben Datei');
    }
  }
  const literale = [...eigen.matchAll(/setFont\(\s*'([^']+)'/g)].map((x) => x[1].toLowerCase()).filter((f) => !STANDARD.has(f));
  if (literale.length) m.push('setFont mit Nicht-Standard-Literal: ' + [...new Set(literale)].join(', '));
  // Jede Zuweisung zählt (const, let, und die Wahl je Dokument in der Rückfallkette), nicht nur die Deklaration.
  if (/(?:^|[^.\w])_PDF_MARKE_SCHRIFT\s*=\s*['"`]/m.test(eigen)) m.push('_PDF_MARKE_SCHRIFT ist ein Literal statt der Schrift aus dem Erscheinungsbild');
  return m;
}

module.exports = { pdfSchriftTuerenPruefen, BLOCK_ANFANG };
