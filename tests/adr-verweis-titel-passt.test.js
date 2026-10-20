'use strict';
/* ADR-Verweis passt zum Titel (17.10.2026).

   Befund: Im Kern und in Werkzeugen stand „U2-ADR-425“ (Hilfe in der Datei) auch für drei andere Entscheidungen —
   signierte Sprachmodule übersetzen Zusicherungssätze (423), Angehörigen-Blätter sind Template (435), der offene
   JSON-Vollexport ist entfernt (508). Die Nummer war eine Zeit lang Platzhalter und wurde beim Landen nicht nachgezogen.

   Regel dieser Probe: Für jede Zeile in vivodepot.html, vivodepot-lesen.html, vivodepot-studio.html, sw.js und in den
   Textdateien unter tools/ gilt — nennt die Zeile ein STICHWORT aus der Liste unten und verweist sie auf U2-ADR-NNN,
   dann muss mindestens eine der genannten ADRs zum Stichwort passen: entweder die ADR, der das Stichwort gehört,
   oder eine ADR, deren Titelzeile (`# U2-ADR-…` in docs/adr) das Stichwort selbst trägt, oder eine ADR aus `auch`
   (gemessene Nachbar-ADRs, die das Stichwort sachlich verwenden). Sonst lautet der Fund:
   „Zeile nennt Stichwort X, das zu U2-ADR-Y gehört, verweist aber auf U2-ADR-Z“.

   GRENZE: Die Probe fängt nur Verweise, bei denen ein Stichwort der Liste in derselben Zeile steht, höchstens
   NAEHE Zeichen vom Verweis entfernt. Ein falscher
   Verweis ohne Stichwort in der Zeile (etwa ein umbrochener Kommentar, dessen Stichwort eine Zeile tiefer steht)
   bleibt unsichtbar. Die Liste ist bewusst klein: nur prägnante, gezielt gewählte Begriffe, nicht jedes Titelwort.
   Platzhalter wie `U2-ADR-NNN` sind keine Nummer und werden nicht beurteilt. Eine genannte ADR, deren Datei fehlt
   (im öffentlichen Zuschnitt zurückgehalten), hat keinen lesbaren Titel und gilt nicht als passend.

   Weg zum Nachsehen: node -e "const P=require('./tests/adr-verweis-titel-passt.test.js'); console.log(P.bestandFunde())" */
const fs = require('node:fs');
const path = require('node:path');

const REPO = path.join(__dirname, '..');

// Stichwort → ADR, der es gehört. `auch`: Nachbar-ADRs, die das Stichwort sachlich tragen (gemessen 17.10.2026).
const STICHWOERTER = Object.freeze([
  { wort: 'Hilfe in der Datei', muster: /Hilfe in der Datei|Bedienungsanleitung|Hilfe-(?:Overlay|Kapitel|Knopf)/iu, adr: '425', auch: [] },
  // Nicht in Dateipfaden (`tests/angehoerigen-vorlage-…`): ein Pfad nennt eine Datei, nicht die Entscheidung.
  { wort: 'Angehörigen', muster: /(?<![/-])Angeh(?:ö|oe)rigen-?(?:Bl(?:ä|ae)tt|Vorlage)/iu, adr: '435', auch: [] },
  { wort: 'Vollexport', muster: /Vollexport/iu, adr: '508', auch: [] },
  // 331 „Zusicherungen sind kein Inhalt“, 428 „Deutsch ist ein Sprachmodul“ (Prüfsumme der Zusicherungssätze je Basissprache).
  { wort: 'Zusicherungssätze', muster: /Zusicherungss(?:ä|ae)tz/iu, adr: '423', auch: ['331', '428'] },
  // 494 „Kern-Testfläche im Produkt verschlossen“: ihre Regionen stehen innerhalb des Kern-Verschlusses.
  { wort: 'Kern-Verschluss', muster: /Kern-Verschlu(?:ss|ß)/iu, adr: '509', auch: ['494'] },
]);

const OBERSTE = ['vivodepot.html', 'vivodepot-lesen.html', 'vivodepot-studio.html', 'sw.js'];
const ENDUNGEN = /\.(?:js|mjs|cjs|json|py|sh|md|txt)$/;

function titelLesen(adrDir) {
  const titel = new Map();
  let namen = [];
  try { namen = fs.readdirSync(adrDir); } catch { return titel; }
  for (const name of namen) {
    if (!/^vivodepot-U2-ADR-\d+[a-z]?-.*\.md$/.test(name)) continue;
    const kopf = fs.readFileSync(path.join(adrDir, name), 'utf8').split('\n').find((z) => /^# U2-ADR-/.test(z));
    const m = kopf && /^# U2-ADR-(\d+[a-z]?)\b/.exec(kopf);
    if (m) titel.set(m[1], kopf);
  }
  return titel;
}

// Höchstabstand zwischen Stichwort und Verweis in Zeichen: lange Prosazeilen (JSON-Gründe, Versionshinweise) tragen
// viele Verweise und Stichwörter nebeneinander, die nichts miteinander zu tun haben.
const NAEHE = 160;

// Rein: prüft EINE Zeile. Liefert die Fund-Sätze (leer = passt).
function zeilePruefen(zeile, titel, stichwoerter = STICHWOERTER) {
  const alle = [...zeile.matchAll(/U2-ADR-(\d+[a-z]?)(?![0-9A-Za-z])/g)].map((m) => ({ n: m[1], pos: m.index }));
  if (alle.length === 0) return [];
  const aus = [];
  for (const s of stichwoerter) {
    const g = new RegExp(s.muster.source, s.muster.flags.includes('g') ? s.muster.flags : s.muster.flags + 'g');
    for (const m of zeile.matchAll(g)) {
      const verweise = [...new Set(alle.filter((v) => Math.abs(v.pos - m.index) <= NAEHE).map((v) => v.n))];
      if (verweise.length === 0) continue;
      const passt = verweise.some((n) => n === s.adr || s.auch.includes(n) || (titel.has(n) && s.muster.test(titel.get(n))));
      if (passt) continue;
      const satz = 'Zeile nennt Stichwort „' + s.wort + '“, das zu U2-ADR-' + s.adr + ' gehört, verweist aber auf '
        + verweise.map((n) => 'U2-ADR-' + n).join(', ');
      if (!aus.includes(satz)) aus.push(satz);
    }
  }
  return aus;
}

function dateienSammeln(repo) {
  const aus = OBERSTE.filter((d) => fs.existsSync(path.join(repo, d)));
  const gehen = (rel) => {
    for (const e of fs.readdirSync(path.join(repo, rel), { withFileTypes: true })) {
      const r = rel + '/' + e.name;
      if (e.isDirectory()) { if (e.name !== 'node_modules') gehen(r); }
      else if (ENDUNGEN.test(e.name)) aus.push(r);
    }
  };
  if (fs.existsSync(path.join(repo, 'tools'))) gehen('tools');
  return aus;
}

function bestandFunde(repo = REPO) {
  const titel = titelLesen(path.join(repo, 'docs', 'adr'));
  const aus = [];
  for (const datei of dateienSammeln(repo)) {
    const zeilen = fs.readFileSync(path.join(repo, datei), 'utf8').split('\n');
    zeilen.forEach((z, i) => { for (const f of zeilePruefen(z, titel)) aus.push(datei + ':' + (i + 1) + ': ' + f); });
  }
  return aus;
}

module.exports = { STICHWOERTER, titelLesen, zeilePruefen, bestandFunde };

if (require.main === module) {
  const test = require('node:test');
  const assert = require('node:assert/strict');
  const TITEL = titelLesen(path.join(REPO, 'docs', 'adr'));

  // Die alte Kern-Zeile (vor dem 17.10.2026), wörtlich, und ihre Berichtigung.
  const ALT = '/* U2-ADR-425 (19.09.2026, „Angehörigen-Blätter sind Template, kein Gerüst") — Inhalt statt';
  const NEU = '/* U2-ADR-435 (19.09.2026, „Angehörigen-Blätter sind Template, kein Gerüst") — Inhalt statt';
  const HILFE = '  // „Hilfe" (Bedienungsanleitung, U2-ADR-425, 20.09.2026) — Overlay-/Druckmechanik wie Notfall,';

  test('die Titel der genannten ADRs sind lesbar (sonst prüft die Probe ins Leere)', () => {
    for (const s of STICHWOERTER) {
      assert.ok(TITEL.has(s.adr), 'U2-ADR-' + s.adr + ': keine Titelzeile in docs/adr');
      assert.ok(s.muster.test(TITEL.get(s.adr)),
        'Stichwort „' + s.wort + '“ steht nicht im Titel von U2-ADR-' + s.adr + ': ' + TITEL.get(s.adr));
    }
  });

  test('Rot-Beweis: die alte Angehörigen-Zeile mit 425 ist rot, mit genauem Satz', () => {
    assert.deepEqual(zeilePruefen(ALT, TITEL),
      ['Zeile nennt Stichwort „Angehörigen“, das zu U2-ADR-435 gehört, verweist aber auf U2-ADR-425']);
  });

  test('die berichtigte Zeile mit 435 ist grün, eine echte Hilfe-Zeile mit 425 ebenso', () => {
    assert.deepEqual(zeilePruefen(NEU, TITEL), []);
    assert.deepEqual(zeilePruefen(HILFE, TITEL), []);
  });

  test('Bestand: kein Verweis widerspricht einem Stichwort derselben Zeile', () => {
    const f = bestandFunde();
    assert.deepEqual(f, [], f.length + ' Fund(e):\n' + f.join('\n'));
  });
}
