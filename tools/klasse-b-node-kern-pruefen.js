#!/usr/bin/env node
'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   Klasse-B-Wächter, Node-Seite — kein Test lädt die ROHE vivodepot.html als Kern, ohne zu backen
   (19.09.2026; Schwester von tools/klasse-b-rohes-geruest-pruefen.js, das die E2E-Specs bewacht)
   ────────────────────────────────────────────────────────────────────────────
   DER FUND: seit dem Schnitt trägt die rohe Datei keine nativen Bereiche mehr (bereicheAlle() === 0,
   gewollt). `ladeKern()` backt darum standardmäßig das Standardprodukt (tests/load-kern.js,
   `_standardProduktBaken`) — ABER NUR, solange kein `KERN_HTML_PATH` gesetzt ist. Ein Test, der eine
   (mutierte) Kopie der rohen Datei schreibt und `process.env.KERN_HTML_PATH` darauf zeigt, umgeht das
   Backen und prüft ein bereichsloses Gerüst, wo er ein Produkt meint. Dasselbe passiert umgekehrt bei
   Tests, die `ladeKern()` rufen und „nativ leer" erwarten (u2-adr-398-gekuendigtes-zimmer, 19.09.2026:
   vier Proben rot) — diese Richtung fängt tests/nacktes-geruest-null-bereiche.test.js an der Hülle.

   WAS DIESER WÄCHTER MISST: je Testdatei unter tests/ (rekursiv, ohne e2e und fixtures), die `process.env.KERN_HTML_PATH`
   ZUWEIST (ein `delete` zählt nicht), ohne dass die Datei selbst ein strukturelles Signal trägt, dass
   sie ein Produkt baut oder das Gerüst ausdrücklich meint: `_standardProduktBaken`, `konfektionieren(`,
   `PRODUKTE.find`, `produkt-text-erzeugen`, `vier-produkte` (ein Produkt wird gebacken), oder den
   wörtlichen Marker `GERÜST-TEST` (Selbstauskunft, wie beim E2E-Wächter). GRENZE, benannt: die Messung
   ist dateiweit, nicht je Fundstelle — ein Signal an einer Stelle nimmt die ganze Datei aus; und ein
   Test, der KEIN Bereichswissen braucht (Service-Worker, Style-Guide), steht trotzdem in der Grundlinie,
   weil kein Text-Wächter das unterscheiden kann.

   ZWEITE ACHSE, DIESELBE URSACHE (Fund 19.09.2026, 145 Proben): Code, der eine Zuweisung an
   `BUERGERMODUL_BUENDEL.<feld>` schreibt (z. B. `.bereichsErsatz = …`), setzt ein Bündel voraus, das seit dem
   Schnitt `null` ist — „Cannot set properties of null". Vier Stellen waren betroffen (pro-geplante-uebergabe-
   vorlage, tools/pro-vorlage-en-kennungen-erzeugen.js, das Bekannt-Bereiche-Werkzeug, pro-vorlage-weg-messen).
   Gemessen wird je Datei in tests/ (ohne e2e, fixtures) und tools/ (rekursiv): eine Zeile mit dieser Zuweisung, vor
   der auf derselben Zeile KEIN Anführungszeichen steht (Text in einem Literal ist kein Schreibzugriff).
   Grenze: zeilenweise Heuristik, mehrzeilige Literale werden nicht erkannt.

   RATSCHEN-KONVENTION (Positivliste in der Grundlinie): rot bei steigender Summe, steigender
   Datei-Zahl oder NEUER Datei; sinkend oder gleich ist grün. Das Sinken ist nicht Aufgabe dieses
   Wächters — ein Test, der backt oder sich als GERÜST-TEST erklärt, fällt aus der Messung heraus, und
   die Grundlinie darf dann nachgezogen werden. tools/*.js zählen nicht (Messwerkzeuge, keine Proben).
   ════════════════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const path = require('node:path');

const REPO = path.join(__dirname, '..');
const TESTS = path.join(REPO, 'tests');
const GRUNDLINIE_PFAD = path.join(__dirname, 'klasse-b-node-kern-grundlinie.json');
const GERUEST_TEST_MARKER = 'GERÜST-TEST';
// Bausteine getrennt, damit diese Datei die Zuweisung nicht selbst als Muster trägt.
const ZUWEISUNG = new RegExp('process\\.env\\.KERN_HTML' + '_PATH\\s*=(?!=)', 'g');
const BACK_SIGNALE = [
  /_standardProduktBaken/, /konfektionieren\(/, /PRODUKTE\.find/, /produkt-text-erzeugen/, /vier-produkte/,
];

function testDateien(verz = TESTS) {
  const out = [];
  for (const e of fs.readdirSync(verz, { withFileTypes: true })) {
    const p = path.join(verz, e.name);
    if (e.isDirectory()) { if (e.name !== 'fixtures' && e.name !== 'e2e') out.push(...testDateien(p)); }
    else if (e.name.endsWith('.test.js')) out.push(p);
  }
  return out.sort();
}

/* Fundstellen einer Datei: Zuweisungen von KERN_HTML_PATH, wenn kein Backen-/Gerüst-Signal da ist. */
function rohTrefferInDatei(inhalt) {
  if (inhalt.includes(GERUEST_TEST_MARKER)) return 0;
  if (BACK_SIGNALE.some((re) => re.test(inhalt))) return 0;
  return (inhalt.match(ZUWEISUNG) || []).length;
}

// Bausteine getrennt, damit diese Datei die Zuweisung nicht selbst als Fund trägt.
const BUENDEL_ZUWEISUNG = new RegExp('BUERGERMODUL_BUENDEL' + '\\.[A-Za-z_]+\\s*=(?!=)');

function buendelSchreiberInDatei(inhalt) {
  let n = 0;
  for (const zeile of inhalt.split('\n')) {
    const m = BUENDEL_ZUWEISUNG.exec(zeile);
    if (m && !/['"`]/.test(zeile.slice(0, m.index))) n++;
  }
  return n;
}

function alleDateien(verz, ohne) {
  const out = [];
  for (const e of fs.readdirSync(verz, { withFileTypes: true })) {
    const p = path.join(verz, e.name);
    if (e.isDirectory()) { if (!ohne.has(e.name)) out.push(...alleDateien(p, ohne)); }
    else if (e.name.endsWith('.js')) out.push(p);
  }
  return out.sort();
}

function messen() {
  const jeDatei = {};
  for (const p of testDateien()) {
    const n = rohTrefferInDatei(fs.readFileSync(p, 'utf8'));
    if (n > 0) jeDatei[path.relative(TESTS, p).split(path.sep).join('/')] = n;
  }
  const buendelJeDatei = {};
  for (const wurzel of [TESTS, path.join(REPO, 'tools')]) {
    for (const p of alleDateien(wurzel, new Set(['e2e', 'fixtures', 'node_modules']))) {
      const n = buendelSchreiberInDatei(fs.readFileSync(p, 'utf8'));
      if (n > 0) buendelJeDatei[path.relative(REPO, p).split(path.sep).join('/')] = n;
    }
  }
  return {
    summe: Object.values(jeDatei).reduce((a, b) => a + b, 0), jeDatei,
    buendel: { summe: Object.values(buendelJeDatei).reduce((a, b) => a + b, 0), jeDatei: buendelJeDatei },
  };
}

function grundlinieLesen() { return JSON.parse(fs.readFileSync(GRUNDLINIE_PFAD, 'utf8')); }

function achseUrteil(gemessen, grundlinie, name, befunde) {
  if (gemessen.summe > grundlinie.summe) befunde.push(name + ': Summe steigt: ' + grundlinie.summe + ' → ' + gemessen.summe);
  for (const [f, n] of Object.entries(gemessen.jeDatei)) {
    if (!(f in grundlinie.jeDatei)) befunde.push(name + ' DRIFT: neue Datei ' + f + ' schreibt in BUERGERMODUL_BUENDEL (null seit dem Schnitt) — ein gebackenes Pro-Produkt laden statt ein Bündel zu beschreiben');
    else if (n > grundlinie.jeDatei[f]) befunde.push(name + ': ' + f + ': ' + grundlinie.jeDatei[f] + ' → ' + n);
  }
}

function urteil(gemessen, grundlinie) {
  const befunde = [];
  if (gemessen.buendel) achseUrteil(gemessen.buendel, grundlinie.buendel || { summe: 0, jeDatei: {} }, 'Bündel-Route', befunde);
  if (gemessen.summe > grundlinie.summe) befunde.push('Summe steigt: ' + grundlinie.summe + ' → ' + gemessen.summe);
  for (const [f, n] of Object.entries(gemessen.jeDatei)) {
    if (!(f in grundlinie.jeDatei)) befunde.push('DRIFT: neue Datei ' + f + ' lädt die rohe Datei als Kern (' + n + ' Zuweisung/en) — backen (`_standardProduktBaken`/`konfektionieren`) oder als GERÜST-TEST erklären');
    else if (n > grundlinie.jeDatei[f]) befunde.push(f + ': ' + grundlinie.jeDatei[f] + ' → ' + n);
  }
  return { gruen: befunde.length === 0, befunde };
}

if (require.main === module) {
  const gemessen = messen();
  if (process.argv.includes('--grundlinie-schreiben')) {
    fs.writeFileSync(GRUNDLINIE_PFAD, JSON.stringify({
      stand: '19.09.2026', summe: gemessen.summe, jeDatei: gemessen.jeDatei, buendel: gemessen.buendel,
    }, null, 2) + '\n');
    console.log('Grundlinie geschrieben: ' + gemessen.summe + ' Fundstellen in ' + Object.keys(gemessen.jeDatei).length + ' Dateien.');
  } else {
    const u = urteil(gemessen, grundlinieLesen());
    console.log(u.gruen ? 'Klasse-B (Node) grün: ' + gemessen.summe + ' Fundstellen.' : u.befunde.join('\n'));
    process.exit(u.gruen ? 0 : 1);
  }
}
module.exports = { buendelSchreiberInDatei, rohTrefferInDatei, messen, urteil, grundlinieLesen, testDateien };
