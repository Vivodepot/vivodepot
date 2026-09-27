'use strict';
/* ════════════════════════════════════════════════════════════════════════
   build-code-listen.js (Paket 3) — generiert die inline @vd-codeliste-Blöcke
   ────────────────────────────────────────────────────────────────────────
   Quelle der Wahrheit sind die JSON-Dateien unter code-listen/<systemId>.json.
   Dieses Skript wandelt sie in die inline-<script>-Blöcke der HTML zwischen den
   Markern CODE-LISTEN:BEGIN … CODE-LISTEN:END (analog zum byte-identischen
   Krypto-Block-Pattern: EINE generierte Region, deterministisch).

   Update einer Liste: code-listen/<systemId>.json bearbeiten (oder neue Datei
   anlegen / alte löschen), dann `node tools/build-code-listen.js` — die HTML wird
   neu geschrieben. `--check` schreibt nichts, sondern meldet Drift (Exit 1) — für CI.

   Der VdCrypto-Block und der App-Block werden NICHT berührt; nur die Region
   zwischen den Markern wird ersetzt.
   ════════════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const path = require('node:path');

const REPO = path.join(__dirname, '..');
/* Umlenkbar (`--html <pfad>`, A60/29.07.2026) — die stehende Schreibregel verlangt, dass ein
   Prüfwerkzeug seinen Gegenstand als Argument nimmt. Ohne die Umlenkung liesse sich die
   Wächter-Probe zu diesem Check nur führen, indem man das Produkt verändert. Nulleingriff:
   ohne das Argument dieselbe Datei wie zuvor. */
const _iH = process.argv.indexOf('--html');
const HTML = _iH >= 0 && process.argv[_iH + 1]
  ? path.resolve(process.argv[_iH + 1]) : path.join(REPO, 'vivodepot.html');
const QUELLEN = path.join(REPO, 'code-listen');
const BEGIN = '<!-- CODE-LISTEN:BEGIN — generierter Bereich (tools/build-code-listen.js); Quellen: code-listen/<systemId>.json -->';
const END = '<!-- CODE-LISTEN:END -->';

// Stabile Reihenfolge (sonst alphabetisch) — hält den Diff klein.
// snomedImpfstoff/snomedImplantat entfernt (U2-ADR-051): Impf-/Implantat-Codes kommen künftig
// als mitgereiste Template-Code-Listen (Reise-als-Daten), nicht als App-Stubs.
const REIHENFOLGE = ['atc', 'snomedAllergen', 'icd10', 'loinc', 'esco', 'xoev-rollencode'];

function ladeQuellen() {
  const dateien = fs.readdirSync(QUELLEN).filter(f => f.endsWith('.json'));
  const listen = dateien.map(f => JSON.parse(fs.readFileSync(path.join(QUELLEN, f), 'utf8')));
  listen.sort((a, b) => {
    const ia = REIHENFOLGE.indexOf(a.systemId), ib = REIHENFOLGE.indexOf(b.systemId);
    if (ia !== ib) return (ia < 0 ? 999 : ia) - (ib < 0 ? 999 : ib);
    return a.systemId.localeCompare(b.systemId);
  });
  return listen;
}

function blockFuer(liste) {
  const j = (v) => JSON.stringify(v);
  const eintraege = (liste.daten || []).map(e => '    ' + j(e)).join(',\n');
  const datenJs = (liste.daten && liste.daten.length) ? '[\n' + eintraege + '\n  ]' : '[]';
  return [
    `<!-- @vd-codeliste systemId="${liste.systemId}" — ${liste.hinweis || ''} -->`,
    '<script>',
    `/* @vd-codeliste ${liste.systemId} — ${liste.hinweis || ''} */`,
    // U2-ADR-NNN (18.09.2026, Kern-Verschluss): codeListeAnmelden ist kein bare Top-Level-Name
    // mehr, sondern liegt unter dem Namensraum window.__vdOeffentlich — derselbe Grund wie für
    // jeden anderen der 60 dort geführten Namen (Konvention: „keine Sonderlocken").
    `window.__vdOeffentlich.codeListeAnmelden(${j(liste.systemId)}, {`,
    `  uri: ${j(liste.uri || '')}, version: ${j(liste.version || '')}, kuerzel: ${j(liste.kuerzel || liste.systemId)},`,
    // teilliste (C2): Ausschnitt eines größeren Systems — vom Oberbegriff-Matching ausgenommen.
    ...(liste.teilliste ? ['  teilliste: true,'] : []),
    `  lizenz: ${j(liste.lizenz || '')},`,
    `  daten: ${datenJs}`,
    '});',
    '</script>',
  ].join('\n');
}

function generiereRegion() {
  const listen = ladeQuellen();
  const kopf = [
    '<!-- ════════════════════════════════════════════════════════════════════════',
    '     CODE-LISTEN (Paket 3) — öffentliche Daten, KEINE Krypto. Je ein Block pro System,',
    '     registriert über window.__vdOeffentlich.codeListeAnmelden() (in Script 2 definiert,',
    '     U2-ADR-NNN Kern-Verschluss). SEED/STUB-Stand —',
    '     generiert aus code-listen/<systemId>.json. NICHT von Hand editieren; stattdessen die',
    '     JSON-Quellen ändern und `node tools/build-code-listen.js` laufen lassen.',
    '     SNOMED nur als kleines Sample (Lizenz — siehe THIRD_PARTY_LICENSES). ═══════════════ -->',
  ].join('\n');
  return '\n' + kopf + '\n\n' + listen.map(blockFuer).join('\n\n') + '\n';
}

function aktuelleRegion(html) {
  const b = html.indexOf(BEGIN);
  const e = html.indexOf(END);
  if (b < 0 || e < 0 || e < b) throw new Error('CODE-LISTEN:BEGIN/END-Marker nicht gefunden.');
  return { vor: html.slice(0, b + BEGIN.length), inhalt: html.slice(b + BEGIN.length, e), nach: html.slice(e) };
}

function main() {
  const check = process.argv.includes('--check');
  const html = fs.readFileSync(HTML, 'utf8');
  const { vor, inhalt, nach } = aktuelleRegion(html);
  const neu = generiereRegion();
  if (inhalt === neu) {
    console.log('Code-Listen inline aktuell (kein Drift). Systeme: ' + ladeQuellen().map(l => l.systemId).join(', '));
    return 0;
  }
  if (check) {
    console.error('DRIFT: die inline Code-Listen weichen von code-listen/*.json ab. `node tools/build-code-listen.js` ausführen.');
    return 1;
  }
  fs.writeFileSync(HTML, vor + neu + nach);
  console.log('Code-Listen inline neu geschrieben. Systeme: ' + ladeQuellen().map(l => l.systemId).join(', '));
  return 0;
}

process.exit(main());
