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
/* LIZENZ-WORTLAUT (27.09.2026): die Pflicht-Quellenangaben, die der Lizenzgeber IM weitergegebenen Exemplar
   verlangt (LOINC § 10, BfArM-Downloadbedingungen ICD-10-GM § 1 und ATC-GM § 1), stehen als eigene Region im
   Hauptskript, byte-gleich aus code-listen/wortlaut/<datei>. Eine Liste mit `lizenzWortlaut` bettet in CODE-LISTEN
   nur den Verweis ein; ihr `lizenz`-Feld muss mit der Datei übereinstimmen, sonst bricht der Bau ab. Eine Liste
   ohne Daten trägt keine Hinweispflicht und bettet ihre Lizenzzeile nicht ein. */
const WORTLAUT = path.join(QUELLEN, 'wortlaut');
// Der BEGIN-Marker ist ein einzeiliger Kommentar (tools/herkunftsort-pruefen.js paart Regionen zeilenweise), die Erläuterung folgt getrennt.
const W_BEGIN = '/* LIZENZ-WORTLAUT:BEGIN — DAUERHAFT, ERZEUGT aus code-listen/wortlaut/<datei> (node tools/build-code-listen.js), byte-gleich, nicht von Hand ändern. */\n'
  + '/* Die Quellenangaben, die der Lizenzgeber im weitergegebenen Exemplar verlangt (tools/geruest-waechter-grundlinie.json, regionen.dauerhaft;\n'
  + '   Probe tests/lizenz-wortlaut-im-kern.test.js). */';
const W_END = '/* LIZENZ-WORTLAUT:END */';

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
  for (const l of listen) {
    if (!l.lizenzWortlaut) continue;
    const datei = path.join(WORTLAUT, l.lizenzWortlaut);
    const wortlaut = fs.readFileSync(datei, 'utf8');
    if (l.lizenz !== wortlaut) throw new Error(l.systemId + ': lizenz weicht vom Wortlaut in code-listen/wortlaut/' + l.lizenzWortlaut + ' ab.');
  }
  return listen;
}

function generiereWortlaut(listen) {
  const eintraege = listen.filter((l) => l.lizenzWortlaut).map((l) => '  ' + (/^[A-Za-z_$][\w$]*$/.test(l.systemId) ? l.systemId : JSON.stringify(l.systemId)) + ': ' + JSON.stringify(l.lizenz));
  return '\nconst LIZENZ_WORTLAUT = Object.freeze({\n' + eintraege.join(',\n') + '\n});\n';
}

function blockFuer(liste) {
  const j = (v) => JSON.stringify(v);
  const eintraege = (liste.daten || []).map(e => '    ' + j(e)).join(',\n');
  const datenJs = (liste.daten && liste.daten.length) ? '[\n' + eintraege + '\n  ]' : '[]';
  return [
    // Ohne `hinweis` (27.09.2026): codeListeAnmelden übernimmt das Feld nicht, es war im Kern nur Kommentartext, zweimal je
    // Liste. Es bleibt in code-listen/<id>.json, der Quelle. Die Markierung selbst liest tests/load-kern.js (Blockanfang).
    `<!-- @vd-codeliste systemId="${liste.systemId}" -->`,
    '<script>',
    `/* @vd-codeliste ${liste.systemId} */`,
    // U2-ADR-NNN (18.09.2026, Kern-Verschluss): codeListeAnmelden ist kein bare Top-Level-Name
    // mehr, sondern liegt unter dem Namensraum window.__vdOeffentlich — derselbe Grund wie für
    // jeden anderen der 60 dort geführten Namen (Konvention: „keine Sonderlocken").
    `window.__vdOeffentlich.codeListeAnmelden(${j(liste.systemId)}, {`,
    `  uri: ${j(liste.uri || '')}, version: ${j(liste.version || '')}, kuerzel: ${j(liste.kuerzel || liste.systemId)},`,
    // teilliste (C2): Ausschnitt eines größeren Systems — vom Oberbegriff-Matching ausgenommen.
    ...(liste.teilliste ? ['  teilliste: true,'] : []),
    // anzeigeNameEigen (26.09.2026, SNOMED GPS): die Anzeige ist eine eigene Bezeichnung, kein Begriff des Systems;
    // der unveränderte Begriff steht je Eintrag in quellBegriff und allein er geht als coding.display hinaus.
    ...(liste.anzeigeNameEigen ? ['  anzeigeNameEigen: true,'] : []),
    // herkunftPflicht (06.10.2026, ICD-Anzeige): jeder angezeigte Text ist amtlich oder gekennzeichnet; die Belege (Nummer im
    // amtlichen Verzeichnis) bleiben in der JSON-Quelle unter `alphabet`, der Kern braucht nur die Texte.
    ...(liste.herkunftPflicht ? ['  herkunftPflicht: true,'] : []),
    // codingVersion (28.09.2026): die Fassung, die als Coding.version hinausgeht (Basisprofil DE: Pflicht für ICD-10-GM und
    // ATC, die Jahreszahl). aliasUris: frühere System-URIs derselben Liste; sie werden an jedem Einlass und im Export auf
    // `uri` umgeschrieben (kanonischesCodeSystem im Kern) und dürfen im Produktcode nur hier stehen.
    ...(liste.codingVersion ? [`  codingVersion: ${j(liste.codingVersion)},`] : []),
    ...(Array.isArray(liste.aliasUris) && liste.aliasUris.length ? [`  aliasUris: ${j(liste.aliasUris)},`] : []),
    // lizenzSichtbar (04.10.2026): der Lizenzgeber verlangt den Hinweis SICHTBAR dort, wo das Produkt geholt wird; die
    // Einstellungen zeigen ihn (Abschnitt Anbieter), ohne dass der Kern ein System beim Namen nennt.
    ...(liste.lizenzWortlaut && liste.lizenzSichtbar ? ['  lizenzSichtbar: true,'] : []),
    ...(liste.lizenzWortlaut ? [`  lizenzWortlaut: ${j(liste.systemId)},`]
      : (liste.daten && liste.daten.length) ? [`  lizenz: ${j(liste.lizenz || '')},`] : []),
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
    '     SNOMED: zwei Konzepte aus dem Global Patient Set (CC BY-ND 4.0, siehe THIRD_PARTY_LICENSES). ════ -->',
  ].join('\n');
  return '\n' + kopf + '\n\n' + listen.map(blockFuer).concat(terminologieBloecke()).join('\n\n') + '\n';
}

/* TERMINOLOGIE-LITERALE (29.09.2026, v835): Begriffe fremder Code-Systeme und IPS-Sektionstitel, die der Export braucht,
   die aber weder Produkttext (Textsatz) noch eine Eingabeliste sind. Quelle code-listen/terminologie/<name>.json; je
   Datei ein Block, der sie über window.__vdOeffentlich.ipsBegriffeAnmelden in den Kern hebt. Felder mit `_` (Zweck,
   Herkunft) bleiben in der Quelle; die Herkunft steht als Kommentar im Block. */
function terminologieBloecke() {
  const dir = path.join(QUELLEN, 'terminologie');
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter((f) => f.endsWith('.json')).sort().map((f) => {
    const roh = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
    const herkunft = [];
    const ohne = (o) => {
      const r = {};
      for (const [k, v] of Object.entries(o)) {
        if (k.startsWith('_')) { if (k === '_herkunft') herkunft.push(v); continue; }
        r[k] = (v && typeof v === 'object' && !Array.isArray(v)) ? ohne(v) : v;
      }
      return r;
    };
    const daten = ohne(roh);
    const name = f.replace(/\.json$/, '');
    return [
      `<!-- @vd-terminologie ${name} -->`,
      '<script>',
      `/* @vd-terminologie ${name} — Herkunft: ${herkunft.join(' · ').replace(/\*\//g, '* /')} */`,
      `window.__vdOeffentlich.ipsBegriffeAnmelden(${JSON.stringify(daten)});`,
      '</script>',
    ].join('\n');
  });
}

function aktuelleRegion(html) {
  const b = html.indexOf(BEGIN);
  const e = html.indexOf(END);
  if (b < 0 || e < 0 || e < b) throw new Error('CODE-LISTEN:BEGIN/END-Marker nicht gefunden.');
  return { vor: html.slice(0, b + BEGIN.length), inhalt: html.slice(b + BEGIN.length, e), nach: html.slice(e) };
}

function wortlautRegion(html) {
  const b = html.indexOf(W_BEGIN);
  const e = html.indexOf(W_END);
  if (b < 0 || e < 0 || e < b) return null;
  return { vor: html.slice(0, b + W_BEGIN.length), inhalt: html.slice(b + W_BEGIN.length, e), nach: html.slice(e) };
}

function main() {
  const check = process.argv.includes('--check');
  let html = fs.readFileSync(HTML, 'utf8');
  const w = wortlautRegion(html);
  // Fehlen die Marker, ist das Drift wie jede andere Abweichung (--check meldet sie, Exit 1); schreiben lässt sich ohne Marker nicht.
  if (!w && !check) throw new Error('LIZENZ-WORTLAUT:BEGIN/END-Marker nicht gefunden.');
  const wNeu = generiereWortlaut(ladeQuellen());
  const wortlautDrift = !w || w.inhalt !== wNeu;
  if (wortlautDrift && !check) html = w.vor + wNeu + w.nach;
  const { vor, inhalt, nach } = aktuelleRegion(html);
  const neu = generiereRegion();
  if (inhalt === neu && !wortlautDrift) {
    console.log('Code-Listen inline aktuell (kein Drift). Systeme: ' + ladeQuellen().map(l => l.systemId).join(', '));
    return 0;
  }
  if (check) {
    console.error('DRIFT: die inline Code-Listen weichen von code-listen/*.json ab. `node tools/build-code-listen.js` ausführen.');
    return 1;
  }
  fs.writeFileSync(HTML, vor + (inhalt === neu ? inhalt : neu) + nach);
  console.log('Code-Listen inline neu geschrieben. Systeme: ' + ladeQuellen().map(l => l.systemId).join(', '));
  return 0;
}

process.exit(main());
