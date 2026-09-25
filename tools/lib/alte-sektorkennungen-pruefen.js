'use strict';
/* ═════════════════════════════════════════════════════════════════════════
   alte-sektorkennungen-pruefen — kein Code liest einen Bereichs-Schlüssel, den
   kennung-mapping.json als umbenannt führt (Nebenfund subBannerHTML, 19.09.2026)
   ─────────────────────────────────────────────────────────────────────────
   DER FUND: `subBannerHTML()` in vivodepot-lesen.html las `data.sektoren.identitaet` — die
   ALTE deutsche Schlüsselform. Der Bereich heißt seit dem Kennungs-Umbau `identity`
   (kennung-mapping.json). Der Ausschnitts-Banner bekam den Namen der Inhaberin darum NIE zu
   sehen, unabhängig davon, ob einer gesetzt war — ein stiller Rückfall, kein Absturz, darum lief
   er lange unbemerkt.

   MASSSTAB IST DIE MAPPING-DATEI, KEINE HANDLISTE: jedes bereichAlt/bereichNeu-Paar aus
   docs/umbau-englisch-vor-v1/kennung-mapping.json ist ein verbotenes Muster (`sektoren.<alt>`,
   `sektoren['<alt>']`, `sektoren["<alt>"]`) — außer in einer NAMENTLICH GEFÜHRTEN,
   funktionsscharfen Ausnahme: Code, der ausdrücklich eine ROHE, VOR-UMBAU-Datei liest, um sie zu
   migrieren oder zu falten (Kern: `depotNormalisieren`; Lese-App: die `_fold…Lesen`-Kette für
   Vollmachten/KI-Ort, die die Lücke „keine eigene Migrationskette für rohe alte Dateien"
   schließt). Diese Funktionen MÜSSEN die alten Schlüssel lesen können — sie sind der Grund, warum
   das Muster nicht einfach verboten werden kann.

   Ein Treffer außerhalb der Allowlist ist ein Fund. Verschwindet eine gelistete Funktion aus der
   Datei (umbenannt/entfernt), bricht die Probe ebenfalls ab — die Allowlist referenziert echten
   Code, keine Vermutung. */
const fs = require('node:fs');
const path = require('node:path');

const REPO = path.join(__dirname, '..', '..');
const MAPPING_PFAD = path.join(REPO, 'docs', 'umbau-englisch-vor-v1', 'kennung-mapping.json');

function alteBereiche() {
  const roh = JSON.parse(fs.readFileSync(MAPPING_PFAD, 'utf8'));
  const liste = Array.isArray(roh) ? roh : (roh.eintraege || roh.mapping || Object.values(roh).find(Array.isArray) || []);
  const paare = new Map();
  for (const e of liste) {
    if (e && e.bereichAlt && e.bereichNeu && e.bereichAlt !== e.bereichNeu) paare.set(e.bereichAlt, e.bereichNeu);
  }
  return paare;
}

function ohneKommentare(text) {
  return text.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
    .replace(/([^:])\/\/.*$/gm, '$1');
}
function funktionsIndex(quelle) {
  return [...quelle.matchAll(/^(?:async )?function ([A-Za-z_$][A-Za-z0-9_$]*)/gm)].map((m) => ({ name: m[1], idx: m.index }));
}
function funktionAn(index, pos) {
  let letzte = '(top-level)';
  for (const f of index) { if (f.idx < pos) letzte = f.name; else break; }
  return letzte;
}

// → [{ funktion, zeile, kennung }] — jeder Treffer außerhalb der übergebenen Allowlist.
function pruefeDatei(pfad, allowlist) {
  const roh = fs.readFileSync(pfad, 'utf8');
  const quelle = ohneKommentare(roh);
  const index = funktionsIndex(quelle);
  const alte = [...alteBereiche().keys()];
  // Zwischen `sektoren` und der Eigenschaft steht oft ein defensiver Rückfall wie
  // `(data.sektoren || {}).identitaet` — genau die Form des Funds. Der Zwischenraum ist darum
  // optional-locker gefasst, nicht auf direkte Nachbarschaft `sektoren.<alt>` verengt.
  const LUECKE = '(?:\\s*\\|\\|\\s*\\{\\s*\\})?\\s*\\)?\\s*';
  const muster = new RegExp('sektoren' + LUECKE + '(?:\\.\\s*(' + alte.join('|') + ')\\b|\\[\\s*[\'"](' + alte.join('|') + ')[\'"]\\s*\\])', 'g');
  const funde = [];
  let treffer;
  while ((treffer = muster.exec(quelle))) {
    const fn = funktionAn(index, treffer.index);
    if (allowlist.includes(fn)) continue;
    const zeile = quelle.slice(0, treffer.index).split('\n').length;
    funde.push({ funktion: fn, zeile, kennung: treffer[1] || treffer[2] });
  }
  return funde;
}

function allowlisteVorhanden(pfad, allowlist) {
  const namen = new Set(funktionsIndex(ohneKommentare(fs.readFileSync(pfad, 'utf8'))).map((f) => f.name));
  return allowlist.filter((n) => !namen.has(n));
}

module.exports = { alteBereiche, pruefeDatei, allowlisteVorhanden };
