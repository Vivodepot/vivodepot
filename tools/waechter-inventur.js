'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   Wächter-Inventur — wer bewacht hier eigentlich etwas?
   ────────────────────────────────────────────────────────────────────────────
   DER ANLASS. Das Prüfarchitektur-Konzept vom 27.07.2026 spricht von „zwölf
   bestehenden Wächtern". Diese Zahl stammt aus einem Bericht, nicht aus einer
   Messung. Ein Register, das aus ihr abgeleitet wird, kann genau den Wächter
   auslassen, den beim Zählen niemand mitgezählt hat — und das fiele nicht auf,
   weil ein fehlender Eintrag nichts meldet.

   Also wird die Liste ERHOBEN, nicht geführt: aus den Hooks, den CI-Workflows
   und den npm-Skripten. Wer dort aufgerufen wird und über Grün oder Rot
   entscheidet, ist ein Wächter — unabhängig davon, ob ihn jemand in eine Liste
   geschrieben hat.

   DAS IST DER MECHANISMUS HINTER DER EINTRITTSBEDINGUNG (Bauauftrag Block 1):
   ein neuer Wächter kommt nur mit seinen zwei Beispielen in den Kreislauf. Das
   lässt sich nicht als Regel aufschreiben — eine Regel, die niemand liest, ist
   keine. Erhoben wird stattdessen, und der Abgleich gegen das Register ist die
   Bedingung. Wer einen Aufruf in einen Hook schreibt, ohne einen Registereintrag
   anzulegen, macht `tests/waechter-selbsttest.test.js` rot.

   GRENZE DES GELTUNGSBEREICHS — ausdrücklich, damit grün-weil-geprüft und
   grün-weil-nicht-hingesehen nicht gleich aussehen:
     · Ein WÄCHTER entscheidet über etwas anderes als sich selbst und blockiert
       damit einen Commit, einen Push oder einen CI-Lauf.
     · Die 1878 Beispielprüfungen sind KEINE Wächter — sie sind der gemessene
       Gegenstand. `node --test` als Ganzes ist einer (es hängt im pre-commit).
     · Was nur von Hand aufgerufen wird, ist ein MESSGERÄT, kein Wächter. Es
       taucht hier nicht auf und darf es nicht: sonst verwässert die Zahl.

   Aufruf:
     node tools/waechter-inventur.js            → Liste auf die Konsole
     node tools/waechter-inventur.js --json     → maschinenlesbar
   ════════════════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const path = require('node:path');

const REPO = path.join(__dirname, '..');

/* Sonder-Marken für Wächter, die keine einzelne Datei sind. Sie tragen denselben
   Namensraum wie Pfade, damit das Register nur EINE Schlüsselart kennt. */
const MARKE_SUITE = '<node --test>';
const MARKE_E2E = '<playwright test>';
const MARKE_E2E_CROSS = '<playwright test --config=playwright.config.cross.js>';

/** Alle Aufruf-Zeilen einer Shell-Datei — Kommentare und Leerzeilen raus. */
function shellZeilen(datei) {
  if (!fs.existsSync(datei)) return [];
  return fs.readFileSync(datei, 'utf8').split('\n')
    .map((z) => z.trim())
    .filter((z) => z && !z.startsWith('#'));
}

/** Alle `run:`-Blöcke einer Workflow-Datei. Mehrzeilige `run: |` werden mitgenommen. */
function workflowZeilen(datei) {
  const raus = [];
  const zeilen = fs.readFileSync(datei, 'utf8').split('\n');
  for (let i = 0; i < zeilen.length; i++) {
    const m = zeilen[i].match(/^(\s*)-?\s*run:\s*(.*)$/);
    if (!m) continue;
    const [, einzug, rest] = m;
    if (rest.trim() && rest.trim() !== '|' && rest.trim() !== '>') { raus.push(rest.trim()); continue; }
    for (let j = i + 1; j < zeilen.length; j++) {
      const z = zeilen[j];
      if (!z.trim()) continue;
      if ((z.match(/^\s*/) || [''])[0].length <= einzug.length) break;
      raus.push(z.trim());
    }
  }
  return raus;
}

/* ── Aus einer Befehlszeile die bewachenden Gegenstände ziehen ──────────────
   Rekursiv, weil `npm run x` selbst wieder Befehle enthält. Ohne die Auflösung
   verschwänden die sechs Konformitäts-Gates hinter einem einzigen npm-Namen. */
function ausBefehl(zeile, skripte, tiefe = 0) {
  const raus = new Set();
  if (tiefe > 4) return raus;

  /* LADER SIND KEINE WÄCHTER: `node --test --require ./tests/x.js` lädt x.js in jeden Testprozess (Umgebung, Vorbelegung),
     es prüft nichts. Das Muster unten würde den Pfad sonst als Hook-Werkzeug ohne Registereintrag zählen. */
  zeile = zeile.replace(/(?:--require|--import)(?:=|\s+)\S+|\s-r\s+\S+/g, ' ');

  /* OPTIONEN ÜBERSPRINGEN — gemessener Fund vom 17.08.2026 (Zug 1 „Bereichsschicht").
     Vorher lautete das Muster `\bnpm\s+(?:run\s+)?([\w:-]+)` und fing bei
     `npm run --silent sbom:check` die Zeichenkette `--silent` statt `sbom:check`.
     JEDES Gate in `hooks/pre-commit` ist in dieser Form geschrieben. Gefunden wurden
     sie trotzdem — aber nur ZUFÄLLIG, über die eigene Fehlermeldung zwei Zeilen
     darunter („Beheben mit: npm run sbom:build"), weil `shellZeilen` auch echo-Zeilen
     liefert. Ein Gate ohne solche Meldung wäre für die Inventur unsichtbar gewesen und
     hätte damit keine Nachweispflicht gehabt — genau die Lücke, die diese Inventur
     schliessen soll. */
  for (const m of zeile.matchAll(/\bnpm\s+(?:run\s+)?(?:--?[\w-]+(?:=\S+)?\s+)*([\w:-]+)/g)) {
    const name = m[1] === 'test' ? 'test' : m[1];
    if (name === 'install' || name === 'ci') continue;
    if (skripte[name]) for (const t of ausBefehl(skripte[name], skripte, tiefe + 1)) raus.add(t);
  }
  for (const m of zeile.matchAll(/\b((?:tools|scripts|tests)\/[\w./-]+\.(?:js|mjs|py))(?![\w])/g)) {
    raus.add(m[1]);
  }
  if (/\bnode\s+--test\b/.test(zeile) && raus.size === 0) raus.add(MARKE_SUITE);
  if (/playwright\.config\.cross\.js/.test(zeile)) raus.add(MARKE_E2E_CROSS);
  else if (/\bplaywright\s+test\b/.test(zeile)) raus.add(MARKE_E2E);
  return raus;
}

/* ── Die Gegenfrage: was liegt im Repo und hängt in NICHTS? ────────────────
   Ein Prüfwerkzeug ohne Aufrufer ist Dokumentation, keine Prüfung — der Satz
   steht seit dem 23.07. im Kopf von `zusicherungen-pruefen.js`, damals über
   `suite-gate.js` geschrieben. Hier wird er messbar statt bemerkt.

   Zwei Wege in den Kreislauf zählen: ein Hook/Workflow (dann steht das Werkzeug
   oben in der Inventur) ODER ein Test, der es `require`t (dann läuft es unter
   `node --test` mit). Wer keinen von beiden hat, läuft nur, wenn jemand ihn
   tippt — und das ist kein Kreislauf. */
function ohneAufrufer(waechter) {
  const bewacht = new Set(waechter.map((w) => w.deckt));
  const testTexte = [];
  const sammleTests = (unter) => {
    const p = path.join(REPO, unter);
    if (!fs.existsSync(p)) return;
    for (const e of fs.readdirSync(p, { withFileTypes: true })) {
      if (e.isDirectory()) sammleTests(path.join(unter, e.name));
      else if (/\.(test\.js|mjs|spec\.js)$/.test(e.name)) testTexte.push(fs.readFileSync(path.join(p, e.name), 'utf8'));
    }
  };
  sammleTests('tests');

  const raus = [];
  for (const ordner of ['tools', 'scripts']) {
    const p = path.join(REPO, ordner);
    if (!fs.existsSync(p)) continue;
    for (const name of fs.readdirSync(p).sort()) {
      if (!/\.(js|py)$/.test(name) || name.startsWith('_')) continue;
      const rel = ordner + '/' + name;
      if (bewacht.has(rel)) continue;
      const ueberTest = testTexte.some((t) => t.includes(rel) || t.includes('../' + rel));
      raus.push({ datei: rel, ueberTest });
    }
  }
  return raus;
}

/** Erhebt alle Wächter mit den Orten, an denen sie hängen. */
function erheben() {
  const skripte = JSON.parse(fs.readFileSync(path.join(REPO, 'package.json'), 'utf8')).scripts || {};
  const quellen = [];

  for (const name of ['pre-commit', 'pre-push']) {
    const p = path.join(REPO, 'hooks', name);
    if (fs.existsSync(p)) quellen.push({ wo: 'hooks/' + name, zeilen: shellZeilen(p) });
  }
  const wfOrdner = path.join(REPO, '.github', 'workflows');
  if (fs.existsSync(wfOrdner)) {
    for (const f of fs.readdirSync(wfOrdner).filter((f) => /\.ya?ml$/.test(f)).sort()) {
      quellen.push({ wo: '.github/workflows/' + f, zeilen: workflowZeilen(path.join(wfOrdner, f)) });
    }
  }

  const gefunden = new Map();   // deckt → Set(orte)
  for (const q of quellen) {
    for (const z of q.zeilen) {
      for (const t of ausBefehl(z, skripte)) {
        if (!gefunden.has(t)) gefunden.set(t, new Set());
        gefunden.get(t).add(q.wo);
      }
    }
  }
  return [...gefunden.entries()]
    .map(([deckt, orte]) => ({ deckt, orte: [...orte].sort() }))
    .sort((a, b) => a.deckt.localeCompare(b.deckt));
}

if (require.main === module) {
  const liste = erheben();
  const lose = ohneAufrufer(liste);
  if (process.argv.includes('--json')) { console.log(JSON.stringify({ waechter: liste, ohneAufrufer: lose }, null, 1)); }
  else {
    console.log(`Wächter-Inventur — ${liste.length} bewachende Gegenstände, erhoben aus Hooks und CI\n`);
    for (const e of liste) console.log(`  ${e.deckt.padEnd(46)} ← ${e.orte.join(', ')}`);
    console.log('\n(Erhoben, nicht geführt. Wer hier fehlt, hängt in keinem Hook und in keinem Workflow.)');

    const nurTest = lose.filter((l) => l.ueberTest);
    const gar = lose.filter((l) => !l.ueberTest);
    console.log(`\nMESSGERÄTE, keine Wächter (${lose.length}):`);
    if (nurTest.length) {
      console.log('  über einen Test im Kreislauf — läuft unter `node --test` mit:');
      for (const l of nurTest) console.log(`    · ${l.datei}`);
    }
    if (gar.length) {
      console.log('  in KEINEM Kreislauf — läuft nur, wenn jemand es tippt:');
      for (const l of gar) console.log(`    ✖ ${l.datei}`);
    }
  }
}

module.exports = { erheben, ausBefehl, ohneAufrufer, MARKE_SUITE, MARKE_E2E, MARKE_E2E_CROSS, REPO };
