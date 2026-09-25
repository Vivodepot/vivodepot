#!/usr/bin/env node
'use strict';
/* ════════════════════════════════════════════════════════════════════════
   dokument-vor-umzug-fixture-ziehen — Golden Master gegen einen echten Beleg
   ────────────────────────────────────────────────────────────────────────
   Zieht, fuer eine registrierte Achse (tools/lib/vor-umzug-achsen.js), den
   amtlichen Wortlaut UND die Depot-getriebene Generator-Ausgabe aus einem
   benannten Git-Commit — nie von Hand abgetippt, dieselbe Regel wie beim
   BMJ-Wortlaut selbst.

   Nutzung:
     node tools/dokument-vor-umzug-fixture-ziehen.js --achse a3-dokumentmodule --commit 37038011

   Ohne Argumente listet es die bekannten Achsen. Die laufende Suite braucht
   dieses Werkzeug NICHT — sie liest nur die bereits committeten Fixtures in
   tests/fixtures/ (Prüfwerkzeug-Schreibregel: "ohne Argument gegen Fixtures
   im Repo" gilt für den PRÜFER, tests/vor-umzug-a3-dokumentmodule.test.js;
   dieses Werkzeug hier ist der ERZEUGER und braucht zwingend einen Commit-
   Bezug, das ist sein Zweck).
   ════════════════════════════════════════════════════════════════════════ */
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const ACHSEN = require('./lib/vor-umzug-achsen');
const REPO = path.join(__dirname, '..');
const FIXTURES = path.join(REPO, 'tests', 'fixtures');

function argLesen(name) {
  const i = process.argv.indexOf('--' + name);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

const achse = argLesen('achse');
const commit = argLesen('commit');

if (!achse || !commit) {
  console.error('Nutzung: node tools/dokument-vor-umzug-fixture-ziehen.js --achse <name> --commit <hash>');
  console.error('Bekannte Achsen:');
  for (const [name, eintrag] of Object.entries(ACHSEN)) {
    console.error('  ' + name + ' — ' + eintrag.beschreibung);
  }
  process.exit(1);
}

const eintrag = ACHSEN[achse];
if (!eintrag) {
  console.error('Unbekannte Achse: ' + achse + '. Bekannt: ' + Object.keys(ACHSEN).join(', '));
  process.exit(1);
}

const inhalt = execFileSync('git', ['show', commit + ':vivodepot.html'], {
  cwd: REPO, encoding: 'utf8', maxBuffer: 1024 * 1024 * 64,
});
const commitDatum = execFileSync('git', ['show', '-s', '--format=%cI', commit], {
  cwd: REPO, encoding: 'utf8',
}).trim();
const commitBetreff = execFileSync('git', ['show', '-s', '--format=%s', commit], {
  cwd: REPO, encoding: 'utf8',
}).trim();

const tmp = path.join(os.tmpdir(), 'vor-umzug-quelle-' + process.pid + '-' + Date.now() + '.html');
fs.writeFileSync(tmp, inhalt, 'utf8');

const vorher = process.env.KERN_HTML_PATH;
process.env.KERN_HTML_PATH = tmp;
try {
  delete require.cache[require.resolve('../tests/load-kern.js')];
  const { ladeKern } = require('../tests/load-kern.js');
  const { V } = ladeKern();

  const immerWerte = eintrag.immerWerte(V);

  const depotErgebnisse = {};
  for (const depotEintrag of eintrag.depotFixturen) {
    delete require.cache[require.resolve('../tests/load-kern.js')];
    const { ladeKern: ladeErneut } = require('../tests/load-kern.js');
    const { V: frischeV } = ladeErneut();
    const depotDatei = JSON.parse(fs.readFileSync(path.join(FIXTURES, depotEintrag.datei), 'utf8'));
    depotErgebnisse[depotEintrag.name] = eintrag.depotErgebnis(
      frischeV, depotDatei.depot.sektoren, depotDatei.depot.menschen, depotEintrag.vmZeilenId,
      depotDatei.depot.schemaVersion,
    );
  }

  const fixture = {
    achse,
    beschreibung: eintrag.beschreibung,
    quelleCommit: commit,
    quelleCommitDatum: commitDatum,
    quelleCommitBetreff: commitBetreff,
    erzeugtAm: new Date().toISOString(),
    erzeugtVon: 'tools/dokument-vor-umzug-fixture-ziehen.js',
    immerWerte: { anzahl: immerWerte.length, werte: immerWerte },
    depotErgebnisse,
  };

  const ausgabe = path.join(FIXTURES, 'vor-umzug-' + achse + '.json');
  fs.writeFileSync(ausgabe, JSON.stringify(fixture, null, 2) + '\n', 'utf8');
  console.log('Fixture geschrieben: ' + ausgabe);
  console.log('  Achse: ' + achse + ' | Commit: ' + commit + ' (' + commitDatum + ') "' + commitBetreff + '"');
  console.log('  immerWerte: ' + immerWerte.length);
  for (const [name, erg] of Object.entries(depotErgebnisse)) {
    // Formfrei über die Achsen hinweg (07.09.2026, A1/A2): A3 liefert {PV,KI,VM,BV} (Listen),
    // andere Achsen liefern andere Schlüssel (z. B. A1: eine Situations-Id je Schlüssel, Wert
    // ein HTML-String). Statt die A3-Form anzunehmen und bei jeder abweichenden Form zu werfen,
    // zaehlt die Zusammenfassung nur noch, was JEDE Form hat: ihre eigenen Schlüssel.
    const teile = Object.keys(erg).map((k) => {
      const w = erg[k];
      const mass = Array.isArray(w) ? w.length + ' Eintraege' : (typeof w === 'string' ? w.length + ' Zeichen' : '1');
      return k + ' ' + mass;
    });
    console.log('  depot ' + name + ': ' + (teile.length ? teile.join(', ') : '(leer)'));
  }
} finally {
  if (vorher === undefined) delete process.env.KERN_HTML_PATH; else process.env.KERN_HTML_PATH = vorher;
  delete require.cache[require.resolve('../tests/load-kern.js')];
  fs.unlinkSync(tmp);
}
