'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Test — Die Anwendung wählt nicht zwischen Erben (U2-ADR-122, Nachtrag 31.10.2026)
   ────────────────────────────────────────────────────────────────────────
   U2-ADR-122 legt fest: die neue Anker-Person eines Sub-Depots bestimmen die
   vertretenen Personen oder ihre gesetzlichen Vertreter; die Empfehlung der
   Anker-Person ist ein Hinweis, kein Diktat. Über Streit entscheiden Testament,
   gesetzliche Erbfolge und Gericht. Im Kern stehen dafür zwei Felder am Anker,
   `todUebergangsWege` und `ankerWechselEmpfehlung`. Der Kern HÄLT sie nur (Vorgabe
   leer, mitnehmen beim Vollimport, zurückhalten vor Empfängern, benennen beim
   Überspringen). Diese Probe hält das fest: keine Stelle im Kern oder in der
   Lese-App liest eines der beiden Felder, um daraus etwas zu tun — etwa eine
   Anker-Person zu setzen. Kommt der Übergangsweg einmal als Bau, ist diese Probe
   die Stelle, an der der neue Zugriff ausdrücklich benannt wird.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { ladeKern } = require('./load-kern.js');

const FELDER = ['todUebergangsWege', 'ankerWechselEmpfehlung'];
const DATEIEN = ['vivodepot.html', 'vivodepot-lesen.html'];

/* Erlaubt ist je Vorkommen genau eine der haltenden Formen:
   - Vorgabe im leeren Depot:        `ankerWechselEmpfehlung: null,`
   - Eintrag in einer Schlüsselliste: `'ankerWechselEmpfehlung'`
   - Benennen beim Überspringen:      `uebersprungen.has('ankerWechselEmpfehlung')`
     samt dem zugehörigen STRINGS-Label (`importVollLabelAnkerWechselEmpfehlung`)
   Alles andere — Punkt- oder Klammerzugriff, Zuweisung — ist ein Zugriff auf den Inhalt. */
function zugriffe(quelle) {
  const funde = [];
  quelle.split('\n').forEach((zeile, i) => {
    for (const feld of FELDER) {
      if (!zeile.includes(feld)) continue;
      // Klammerzugriff mit Zeichenkette sieht aus wie ein Listeneintrag — vorher abfangen.
      if (new RegExp(`\\[\\s*'${feld}'\\s*\\]`).test(zeile)) { funde.push({ zeile: i + 1, feld, text: zeile.trim().slice(0, 160) }); continue; }
      const rest = zeile
        .replace(new RegExp(`(^|[\\s{,])${feld}:\\s*null\\b`, 'g'), '$1')
        .replace(new RegExp(`\\.has\\('${feld}'\\)`, 'g'), '')
        .replace(new RegExp(`'${feld}'`, 'g'), '')
        .replace(new RegExp(`importVollLabel${feld[0].toUpperCase()}${feld.slice(1)}`, 'g'), '');
      if (rest.includes(feld)) funde.push({ zeile: i + 1, feld, text: zeile.trim().slice(0, 160) });
    }
  });
  return funde;
}

const KOPPLUNG = { PROBEN: [
  { fuer: '[Erben·wählt nicht] Kern und Lese-App lesen die Übergangsfelder nur, um sie zu halten', diskriminante: zugriffe },
] };
void KOPPLUNG;

test('[Erben·wählt nicht] Kern und Lese-App lesen die Übergangsfelder nur, um sie zu halten', () => {
  for (const datei of DATEIEN) {
    const quelle = fs.readFileSync(path.join(__dirname, '..', datei), 'utf8');
    const funde = zugriffe(quelle);
    assert.deepEqual(funde, [], `${datei}: Zugriff auf den Inhalt eines Übergangsfelds — die Anwendung wählt nicht zwischen Erben (U2-ADR-122):\n`
      + funde.map((f) => `  Z. ${f.zeile} ${f.feld}: ${f.text}`).join('\n'));
  }
});

test('[Erben·wählt nicht] die Probe trifft überhaupt etwas — beide Felder stehen im Kern', () => {
  const quelle = fs.readFileSync(path.join(__dirname, '..', 'vivodepot.html'), 'utf8');
  for (const feld of FELDER) assert.ok(quelle.includes(feld), `${feld} steht nicht mehr im Kern — Probe neu zuschneiden`);
});

test('[Erben·wählt nicht] das leere Depot gibt keinen Übergangsweg und keine Empfehlung vor', () => {
  const { V } = ladeKern();
  const d = V.leeresDepot();
  assert.equal(d.todUebergangsWege, null);
  assert.equal(d.ankerWechselEmpfehlung, null);
});

test('[Negativprobe] [Erben·wählt nicht·Rot-Beweis] ein Zugriff auf den Inhalt fällt auf, die haltenden Formen nicht', () => {
  const haltend = [
    '    ankerWechselEmpfehlung: null,',
    "  'bevollmaechtigte', 'todUebergangsWege', 'ankerWechselEmpfehlung',",
    "  if (uebersprungen.has('ankerWechselEmpfehlung') && STRINGS.importVollLabelAnkerWechselEmpfehlung) namen.push(STRINGS.importVollLabelAnkerWechselEmpfehlung);",
  ].join('\n');
  assert.deepEqual(zugriffe(haltend), []);
  const faelle = [
    'depot.ankerPerson = depot.ankerWechselEmpfehlung.erbe;',
    "const weg = d['todUebergangsWege'];",
    'if (d.todUebergangsWege && d.todUebergangsWege.weg1) ankerZuSub(d);',
    'const { ankerWechselEmpfehlung } = depot;',
  ];
  for (const fall of faelle) assert.equal(zugriffe(fall).length > 0, true, `nicht erkannt: ${fall}`);
});
