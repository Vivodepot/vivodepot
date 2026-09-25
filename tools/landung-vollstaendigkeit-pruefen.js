#!/usr/bin/env node
'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   landung-vollstaendigkeit-pruefen.js — ist jeder Fix der Quell- und Nachtzweige im Landestand? (LS1, LS2)

   Anlass (19.09.2026): ein Fix vom 18.09. (herkunftText markenfrei, Pro-Notfallmappe) lag auf einem
   Quellzweig und fehlte im Landestand — die Landung hatte ihn beim Zusammenstellen verloren, und
   nichts fiel auf, weil jede Landung nur gegen das prüft, was sie mitgenommen hat, nie gegen das,
   was es gab.

   WAS ES TUT (nur lesend, keine Suite, kein Arbeitsbaum): für jeden Kandidaten-Commit (Betreff
   `fix…`/`feat…`/`test…`, LS2), der auf einem Quellzweig seit der Basis liegt und im Landestand
   NICHT als Vorfahr steht, wird festgestellt, ob seine ÄNDERUNG trotzdem drin ist:
     patch-id   — derselbe Diff steht im Landestand (Cherry-pick, Rebase);
     inhalt     — der Diff lässt sich gegen den Landestand rückwärts anwenden, alle Hunks sind drin
                  (die Landung hat ihn angepasst, etwa Etiketten entfernt);
     ueberarbeitet — rückwärts nicht anwendbar, aber ≥ 90 % der hinzugefügten Zeilen stehen im Landestand
                  (spätere Commits haben denselben Fix weiterentwickelt);
     teilweise  — ein Teil der Änderung ist da, ein Teil nicht;
     fehlt      — nichts davon: der Fix ist nicht im Landestand.
   Exit 1, sobald ein Fix `fehlt` oder `teilweise` ist. Der Landende fährt es vor jedem Push.

   LS2 (20.09.2026, Klassenbefund an -3a nach zwei abgebrochenen L2-Pushes): DREI Nachbesserungen.

   1. KANDIDATEN UM feat/test ERWEITERT — nicht nur `fix…`: ein `feat…`/`test…`, der auf einem
      Quellzweig liegt und beim Landen verloren geht, ist derselbe Verlust wie ein `fix…`, nur mit
      anderem Präfix.

   2. SCHNAPPSCHUSS ZUM GATE-BEGINN, GEGEN GENAU DIESEN FUND: `hooks/pre-push` prüfte bis hierher
      IMMER gegen die LEBENDEN Zweigspitzen. Am 19.09.2026 brach dieselbe Prüfung ZWEIMAL einen
      laufenden Landungs-Push ab — nicht weil der Landestand etwas verlor, sondern weil eine ANDERE
      Sitzung WÄHREND des Sammelns einen neuen `fix…`/`feat…`-Commit auf einem fremden Zweig anlegte
      (einmal ein regulärer Commit, einmal — Selbstanzeige — dieses Werkzeug selbst, trotz
      Commit-Stopp). Dieser Commit existierte beim Start des Sammelns noch nicht; er kann in DIESEM
      Landestand unmöglich stehen, und ihn zu verlangen ist kein Vollständigkeits-Befund, sondern ein
      Artefakt der Live-Abfrage. `--schnappschuss-schreiben` friert die Zweigspitzen EINMAL ein, wenn
      das Sammeln beginnt; jeder Prüflauf danach (auch ein zweiter, dritter Push-Versuch derselben
      Landung) läuft mit `--schnappschuss` gegen genau diesen eingefrorenen Stand, nicht gegen die
      dann aktuellen Spitzen. Ein Commit nach dem Schnappschuss gehört zur NÄCHSTEN Landung.

   3. ZWEIGMUSTER-AUSNAHMEN — `tools/landung-zukunftszweige.json` (Bauart wie `landung-bewusst-
      draussen.json`, hier reguläre Ausdrücke statt Commit-Hashes, je mit Grund): ein Kandidat, der
      NUR auf Zweigen liegt, die einem geführten Zukunfts-Zweig-Muster entsprechen (eigene,
      absichtlich noch nicht eingereichte Arbeit für eine SPÄTERE Stufe), zählt nicht — dieselbe
      Ausnahme, die `sicherung-…`-Zweige bereits genießen, hier für benannte, kuratierte Muster statt
      eines einzelnen Präfixes. Erweitert das Auffinden um feat/test zeigte am 19.09. elf solche
      Treffer auf eigenen Zukunfts-Zweigen — kein Verlust, nur die fehlende Ausnahme.

      REGEL FÜR NEUE ZUKUNFTS-ZWEIGE (20.09.2026), damit es niemand raten muss: wer einen
      Zweig für eine spätere Landung anlegt, benennt ihn mit dem Muster `-l4-` (`^l4-` oder `-l4-`
      irgendwo im Namen, z. B. `cf-l4-widerspruch-…`) — oder trägt sein eigenes Präfix selbst, mit
      Grund, in `tools/landung-zukunftszweige.json` nach. Ein Zweig, der weder das Muster trägt noch
      dort steht, gilt als reguläre Quelle für DIESE Landung.

   AUFRUF
     node tools/landung-vollstaendigkeit-pruefen.js --schnappschuss-schreiben <datei> [--quellen <glob,glob>]
       Schreibt die aktuellen Zweigspitzen nach <datei> und beendet sich — kein Prüflauf.
     node tools/landung-vollstaendigkeit-pruefen.js [--landestand <ref>] [--basis <ref>]
       [--quellen <glob,glob>] [--auch <ref,ref>] [--alle-commits] [--schnappschuss <datei>]
       [--seit-basisdatum] [--nur-fehlt] [--ausnahmen <datei>] [--zukunftszweige <datei>]
       [--ausgabe <datei>] [--json]
     Vorgabe: Landestand HEAD, Basis origin/u2-kanon, Quellen refs/heads/*,refs/remotes/origin/*.
     --auch nennt weitere Landestände (z. B. den L2-Stapel), deren Inhalt ebenfalls als gelandet gilt.
     --alle-commits prüft jeden Commit, nicht nur fix/feat/test.
     --schnappschuss liest die Zweigspitzen aus einer zuvor per --schnappschuss-schreiben erzeugten
     Datei statt sie live abzufragen (LS2, Gate-Snapshot).
     --seit-basisdatum nur Commits, die nach dem Stand der Basis entstanden sind; --nur-fehlt blockiert nur bei
     `fehlt`; --ausnahmen (Vorgabe tools/landung-bewusst-draussen.json) ist die Positivliste bewusst draußen
     gelassener Commits mit Grund; --zukunftszweige (Vorgabe tools/landung-zukunftszweige.json) die
     Positivliste kuratierter Zweigmuster für noch nicht eingereichte, spätere Arbeit.
   ════════════════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync, spawnSync } = require('node:child_process');
const { ohneGitUmgebung } = require('./lib/ohne-git-umgebung.js');

function git(args, cwd, extraEnv, eingabe) {
  const r = spawnSync('git', args, {
    cwd, env: { ...ohneGitUmgebung(), ...(extraEnv || {}) }, encoding: 'utf8', input: eingabe, maxBuffer: 512 * 1024 * 1024,
  });
  return { status: r.status, out: r.stdout || '', err: r.stderr || '' };
}

function gitOk(args, cwd) {
  const r = git(args, cwd);
  if (r.status !== 0) throw new Error('git ' + args.join(' ') + ': ' + r.err.split('\n')[0]);
  return r.out;
}

/* patch-id je Commit-Hash für einen Bereich (--stable: unabhängig von der Dateireihenfolge). */
function patchIds(bereich, cwd) {
  const diff = gitOk(['log', '--no-merges', '-p', '--no-color', '--format=commit %H', ...bereich], cwd);
  const pid = git(['patch-id', '--stable'], cwd, null, diff).out;
  const map = new Map();
  for (const z of pid.split('\n').filter(Boolean)) {
    const [id, commit] = z.split(' ');
    map.set(id, commit);
  }
  return map;
}

/* Reine Einordnung — für die Rot-Beweise mit fingierten Zählungen. */
function einordnen({ gleichePatchId, dateienGesamt, dateienRueckwaerts, zeilenGesamt = 0, zeilenDa = 0 }) {
  if (gleichePatchId) return 'patch-id';
  if (dateienGesamt === 0) return 'leer';
  if (dateienRueckwaerts === dateienGesamt) return 'inhalt';
  // Rückwärts nicht anwendbar heißt nicht „fehlt": spätere Commits können dieselben Zeilen
  // weiterentwickelt haben. Stehen die hinzugefügten Zeilen fast vollständig im Landestand, ist der
  // Fix da und nur überarbeitet.
  const anteil = zeilenGesamt ? zeilenDa / zeilenGesamt : 0;
  if (anteil >= 0.9) return 'ueberarbeitet';
  if (dateienRueckwaerts > 0 || anteil >= 0.3) return 'teilweise';
  return 'fehlt';
}

/* Wie viele Dateien der Änderung stehen im Landestand schon so da? Je Datei `git apply --check -R`
   gegen einen temporären Index des Landestands (kein Arbeitsbaum nötig, nichts wird geschrieben). */
function dateienRueckwaerts(commit, landestand, cwd, indexDatei) {
  const dateien = gitOk(['diff-tree', '--no-commit-id', '--name-only', '-r', '--no-renames', commit], cwd).split('\n').filter(Boolean);
  let passt = 0;
  for (const d of dateien) {
    const patch = git(['diff-tree', '-p', '--no-color', '--no-renames', '--root', commit, '--', d], cwd).out;
    if (!patch.trim()) continue;
    const r = git(['apply', '--check', '--reverse', '--cached'], cwd, { GIT_INDEX_FILE: indexDatei }, patch);
    if (r.status === 0) passt += 1;
  }
  return { gesamt: dateien.length, passt };
}

/* Hinzugefügte Zeilen (ohne leere und rein-syntaktische), die im Landestand in derselben Datei stehen. */
function zeilenAnteil(commit, landestand, cwd, dateiCache) {
  const diff = git(['diff-tree', '-p', '-U0', '--no-color', '--no-renames', '--root', commit], cwd).out;
  let datei = null;
  let gesamt = 0;
  let da = 0;
  for (const z of diff.split('\n')) {
    if (z.startsWith('+++ ')) { datei = z.slice(4).replace(/^b\//, ''); continue; }
    if (!z.startsWith('+') || z.startsWith('+++') || !datei || datei === '/dev/null') continue;
    const t = z.slice(1).trim();
    if (t.length < 4 || /^[\]\[{}()`;,]*$/.test(t)) continue;
    if (!dateiCache.has(datei)) {
      const r = git(['show', landestand + ':' + datei], cwd);
      dateiCache.set(datei, r.status === 0 ? new Set(r.out.split('\n').map((x) => x.trim())) : null);
    }
    const menge = dateiCache.get(datei);
    gesamt += 1;
    if (menge && menge.has(t)) da += 1;
  }
  return { gesamt, da };
}

// LS2: nicht mehr nur `fix…` — ein verlorenes `feat…`/`test…` ist derselbe Verlust.
const KANDIDAT_MUSTER = /^(fix|feat|test)(\(|:|\s)/i;

/* LS2 — Schnappschuss der Zweigspitzen zum Gate-Beginn: { erzeugt, quellen, refs: {refname: sha} }.
   Schreiben und Lesen sind bewusst symmetrisch zur Positivliste unten (eine erzeugt, geprüft
   dagegen), aber ohne Grund-Pflicht — ein Schnappschuss behauptet nichts, er hält nur einen
   Zeitpunkt fest. */
function schnappschussSchreiben(datei, quellen, cwd) {
  const zeilen = gitOk(['for-each-ref', '--format=%(refname) %(objectname)', ...quellen], cwd).split('\n').filter(Boolean);
  const refs = {};
  for (const z of zeilen) { const i = z.lastIndexOf(' '); refs[z.slice(0, i)] = z.slice(i + 1); }
  const daten = { erzeugt: new Date().toISOString(), quellen, refs };
  fs.writeFileSync(datei, JSON.stringify(daten, null, 1) + '\n');
  return daten;
}

function schnappschussLesen(datei) {
  const roh = JSON.parse(fs.readFileSync(datei, 'utf8'));
  if (!roh || typeof roh.refs !== 'object' || !roh.refs) throw new Error('Schnappschuss ' + datei + ' hat kein "refs"-Feld');
  return roh;
}

/* LS2 — Positivliste kuratierter Zweigmuster (Bauart wie ausnahmenLesen unten, hier regulaere
   Ausdruecke statt Commit-Hashes): { "muster": [ { "regex": "…", "grund": "…" } ] }. Ein Muster ohne
   Grund oder mit ungueltigem regulaerem Ausdruck ist ein Fehler, kein stilles Weglassen. */
function zukunftsZweigeLesen(datei) {
  if (!datei || !fs.existsSync(datei)) return { muster: [], fehler: [] };
  const roh = JSON.parse(fs.readFileSync(datei, 'utf8'));
  const muster = [];
  const fehler = [];
  for (const e of roh.muster || []) {
    if (!e || typeof e.regex !== 'string' || !e.regex) { fehler.push('Zukunfts-Zweig-Muster ohne "regex": ' + JSON.stringify(e)); continue; }
    if (typeof e.grund !== 'string' || !e.grund.trim()) { fehler.push('Zukunfts-Zweig-Muster ' + e.regex + ' ohne Grund — ein Muster ohne Begruendung ist ein Verlust, der als Absicht durchgeht'); continue; }
    let re;
    try { re = new RegExp(e.regex); } catch (fehlerObj) { fehler.push('Zukunfts-Zweig-Muster ' + e.regex + ' ist kein gueltiger regulaerer Ausdruck: ' + fehlerObj.message); continue; }
    muster.push({ regex: re, grund: e.grund.trim(), quelle: e.regex });
  }
  return { muster, fehler };
}

/* Positivliste bewusst draußen gelassener Commits: { "eintraege": [ { "commit": "<hash>", "grund": "…" } ] }.
   Ein Eintrag ohne Grund ist ungültig (Fehler), ein Commit, der nicht (mehr) existiert, ebenfalls. */
function ausnahmenLesen(datei, cwd) {
  if (!datei || !fs.existsSync(datei)) return { map: new Map(), fehler: [] };
  const roh = JSON.parse(fs.readFileSync(datei, 'utf8'));
  const map = new Map();
  const fehler = [];
  for (const e of roh.eintraege || []) {
    if (!e || typeof e.commit !== 'string' || !/^[0-9a-f]{7,40}$/i.test(e.commit)) { fehler.push('Ausnahme ohne gültigen Commit-Hash: ' + JSON.stringify(e)); continue; }
    if (typeof e.grund !== 'string' || !e.grund.trim()) { fehler.push('Ausnahme ' + e.commit + ' ohne Grund — eine Ausnahme ohne Begründung ist ein Verlust, der als Absicht durchgeht'); continue; }
    const r = git(['rev-parse', '--verify', '-q', e.commit + '^{commit}'], cwd);
    if (r.status !== 0) { fehler.push('Ausnahme ' + e.commit + ' zeigt auf keinen Commit dieses Repos'); continue; }
    map.set(r.out.trim(), e.grund.trim());
  }
  return { map, fehler };
}

const RANG = { 'bewusst-draussen': 2, 'patch-id': 5, inhalt: 4, ueberarbeitet: 3, leer: 2, teilweise: 1, fehlt: 0 };

function pruefen(opt) {
  const cwd = opt.cwd || process.cwd();
  const landestand = gitOk(['rev-parse', opt.landestand], cwd).trim();
  const basis = gitOk(['rev-parse', opt.basis], cwd).trim();
  const gemeinsam = basis;
  // LS2: mit --schnappschuss werden die zum Gate-Beginn eingefrorenen Zweigspitzen als
  // Rev-list-Startpunkte genutzt (SHAs), statt die Zweige jetzt, live, erneut abzufragen — sonst
  // reisst ein Commit, der NACH dem Schnappschuss auf einem fremden Zweig entstand, einen laufenden
  // Push ab, obwohl er zur naechsten Landung gehoert, nicht zu dieser.
  const refStartpunkte = opt.schnappschuss
    ? Object.values(schnappschussLesen(opt.schnappschuss).refs)
    : gitOk(['for-each-ref', '--format=%(objectname)', ...opt.quellen], cwd).split('\n').filter(Boolean);
  // `zweige` (Bericht/Zukunftszweig-Filter) bleibt bewusst gegen die LEBENDEN Namen berechnet —
  // rein informativ fuer bereits als Kandidat feststehende Commits, keine neue Kandidatenquelle.
  const refs = gitOk(['for-each-ref', '--format=%(refname)', ...opt.quellen], cwd).split('\n').filter(Boolean);
  // Weitere Landestände (z. B. der L2-Stapel): was dort steht, gilt als gelandet.
  const weitere = (opt.auch || []).map((r) => gitOk(['rev-parse', r], cwd).trim());
  const landungen = [landestand, ...weitere];

  // Kandidaten: auf einem Quellzweig, in KEINEM Landestand als Vorfahr, nicht in der Basis.
  const roh = refStartpunkte.length
    ? gitOk(['rev-list', '--no-merges', '--format=%H%x09%s', ...refStartpunkte, ...landungen.map((l) => '^' + l), '^' + basis], cwd)
    : '';
  const kandidaten = [];
  for (const z of roh.split('\n')) {
    if (!z.includes('\t')) continue;
    const [hash, betreff] = z.split('\t');
    if (opt.alleCommits || KANDIDAT_MUSTER.test(betreff)) kandidaten.push({ hash, betreff });
  }
  // Nur Commits, die NACH dem Stand der Basis entstanden sind: ältere Zweige, die nie gelandet wurden, sind
  // ein anderes Thema (ihr Inhalt landete meist umgeschrieben) und würden das Tor dauerhaft rot halten.
  if (opt.seitBasisdatum) {
    const grenze = Number(gitOk(['log', '-1', '--format=%ct', basis], cwd).trim());
    for (let i = kandidaten.length - 1; i >= 0; i--) {
      if (Number(gitOk(['log', '-1', '--format=%ct', kandidaten[i].hash], cwd).trim()) <= grenze) kandidaten.splice(i, 1);
    }
  }
  const ausnahmen = ausnahmenLesen(opt.ausnahmen, cwd);

  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'landung-index-'));
  const ergebnis = [];
  try {
    const ids = new Map();
    if (kandidaten.length) {
      const diff = gitOk(['log', '--no-merges', '-p', '--no-color', '--no-walk=unsorted', '--format=commit %H', ...kandidaten.map((k) => k.hash)], cwd);
      for (const z of git(['patch-id', '--stable'], cwd, null, diff).out.split('\n').filter(Boolean)) {
        const [id, commit] = z.split(' ');
        ids.set(commit, id);
      }
    }
    const je = landungen.map((l, i) => {
      const indexDatei = path.join(tmp, 'index' + i);
      git(['read-tree', l], cwd, { GIT_INDEX_FILE: indexDatei });
      const geaendert = new Set(gitOk(['diff', '--name-only', gemeinsam, l], cwd).split('\n').filter(Boolean));
      return { l, indexDatei, geaendert, patchIds: patchIds([basis + '..' + l], cwd), dateiCache: new Map() };
    });
    for (const k of kandidaten) {
      let bester = null;
      // Ein Landestand, der keine der Dateien des Commits gegenüber der Basis verändert hat, kann den Fix
      // nicht tragen — er wird nicht Stück für Stück geprüft (das macht den Lauf über viele Landestände
      // erst bezahlbar), nur die patch-id zählt dort.
      const dateienDesCommits = gitOk(['diff-tree', '--no-commit-id', '--name-only', '-r', '--no-renames', k.hash], cwd).split('\n').filter(Boolean);
      for (const L of je) {
        const gleiche = ids.has(k.hash) && L.patchIds.has(ids.get(k.hash));
        if (!gleiche && L.l !== landestand && !dateienDesCommits.some((d) => L.geaendert.has(d))) continue;
        let d = { gesamt: 0, passt: 0 };
        let z = { gesamt: 0, da: 0 };
        if (!gleiche) {
          // Rückwärts anwenden (teuer: ein git apply je Datei) nur gegen den Hauptlandestand; gegen weitere
          // Landestände genügen patch-id und Zeilenanteil.
          if (L.l === landestand) d = dateienRueckwaerts(k.hash, L.l, cwd, L.indexDatei);
          else d = { gesamt: dateienDesCommits.length, passt: 0 };
          if (d.passt < d.gesamt) z = zeilenAnteil(k.hash, L.l, cwd, L.dateiCache);
        }
        const urteil = einordnen({ gleichePatchId: gleiche, dateienGesamt: d.gesamt, dateienRueckwaerts: d.passt, zeilenGesamt: z.gesamt, zeilenDa: z.da });
        if (!bester || RANG[urteil] > RANG[bester.urteil]) bester = { urteil, d, z, landung: L.l };
        if (urteil === 'patch-id') break;
      }
      const grundDraussen = ausnahmen.map.get(k.hash);
      ergebnis.push({
        ...k,
        urteil: grundDraussen && (bester.urteil === 'fehlt' || bester.urteil === 'teilweise') ? 'bewusst-draussen' : bester.urteil,
        grund: grundDraussen || null, landung: bester.landung.slice(0, 8),
        dateien: bester.d.gesamt, dateienImLandestand: bester.d.passt, zeilen: bester.z.gesamt, zeilenImLandestand: bester.z.da,
        zweige: gitOk(['for-each-ref', '--contains', k.hash, '--format=%(refname:short)', ...refs], cwd).split('\n').filter(Boolean),
        datum: gitOk(['log', '-1', '--format=%cs', k.hash], cwd).trim(),
      });
    }
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
  return { landestand, basis, geprueft: kandidaten.length, ergebnis, ausnahmenFehler: ausnahmen.fehler };
}

function main() {
  const argv = process.argv.slice(2);
  const arg = (n, s) => { const i = argv.indexOf('--' + n); return i >= 0 && argv[i + 1] ? argv[i + 1] : s; };

  // LS2: Schnappschuss-Modus schreibt nur die Zweigspitzen und beendet sich — kein Prüflauf.
  const schreibZiel = arg('schnappschuss-schreiben', null);
  if (schreibZiel) {
    const quellen = arg('quellen', 'refs/heads/*,refs/remotes/origin/*').split(',');
    const daten = schnappschussSchreiben(schreibZiel, quellen, process.cwd());
    console.log(`landung-vollstaendigkeit: Schnappschuss geschrieben nach ${schreibZiel} — ${Object.keys(daten.refs).length} Zweigspitzen, ${daten.erzeugt}`);
    return;
  }

  const opt = {
    landestand: arg('landestand', 'HEAD'),
    basis: arg('basis', 'origin/u2-kanon'),
    quellen: arg('quellen', 'refs/heads/*,refs/remotes/origin/*').split(','),
    alleCommits: argv.includes('--alle-commits'),
    auch: arg('auch', '').split(',').filter(Boolean),
    seitBasisdatum: argv.includes('--seit-basisdatum'),
    ausnahmen: arg('ausnahmen', path.join(__dirname, 'landung-bewusst-draussen.json')),
    schnappschuss: arg('schnappschuss', null),
  };
  const nurFehlt = argv.includes('--nur-fehlt');
  const r = pruefen(opt);
  const zukunft = zukunftsZweigeLesen(arg('zukunftszweige', path.join(__dirname, 'landung-zukunftszweige.json')));
  const kurzname = (z) => z.replace(/^origin\//, '');
  // Sicherungszweige (`sicherung-…`) sind Rückfallnetze, keine Quellen: ein Commit, der NUR dort liegt,
  // zählt nicht — dieselbe Ausnahme gilt (LS2) fuer jeden kuratierten Zukunfts-Zweig aus der Positivliste.
  const zweigAusgenommen = (z) => /^sicherung-/.test(kurzname(z)) || zukunft.muster.some((m) => m.regex.test(kurzname(z)));
  const nurAusgenommen = (e) => e.zweige.every(zweigAusgenommen);
  const { zeilen, fehlend } = ausgabeZeilen(r, { nurFehlt, nurAusgenommen, zweigAusgenommen });
  if (argv.includes('--json')) process.stdout.write(JSON.stringify(r, null, 1) + '\n');
  else console.log(zeilen.join('\n'));
  const ausgabe = arg('ausgabe', null);
  if (ausgabe) fs.writeFileSync(ausgabe, zeilen.join('\n') + '\n');
  for (const f of r.ausnahmenFehler) console.error('landung-bewusst-draussen.json: ' + f);
  for (const f of zukunft.fehler) console.error('landung-zukunftszweige.json: ' + f);
  const meldung = argv.includes('--json') ? console.error : console.log;   // --json: stdout bleibt reines JSON
  const draussen = r.ergebnis.filter((e) => e.urteil === 'bewusst-draussen');
  if (draussen.length) meldung(`(${draussen.length} bewusst draußen: ${draussen.map((e) => e.hash.slice(0, 8)).join(', ')})`);
  process.exitCode = fehlend.length || r.ausnahmenFehler.length || zukunft.fehler.length ? 1 : 0;
}

/* Ausgabe des Gates. Die Zusicherung: die Zahlen im Kopf sind die Zahlen der gedruckten Zeilen. Der Kopf zählt NACH dem
   Ausschluss (Sicherungs-/Zukunftszweige) und nennt JEDES Urteil, damit die Summe aufgeht; jede gezählte teilweise-/fehlt-Zeile
   steht einzeln da, jede ausgeschlossene mit Hash und Urteil unter AUSGESCHLOSSEN. `teilweise` und `fehlt` sind getrennte Zahlen. */
const URTEILE = ['patch-id', 'inhalt', 'ueberarbeitet', 'leer', 'bewusst-draussen', 'teilweise', 'fehlt'];

/* DIE URSACHE STATT DES SYMPTOMS (22.09.2026). Ein Commit auf einem Zweig, der weder `-l4-` im Namen trägt noch in tools/landung-zukunftszweige.json steht, gilt als Quelle DIESER Landung
   und „fehlt“ dann im Landestand — auch wenn der Zweig für eine spätere Landung gedacht war. Die Zeile FEHLT nannte nur den Commit; wer den Zweig angelegt hat, sah die Konvention nie (sie steht im
   Kopf dieses Werkzeugs) und der Fehler zeigte sich beim Push einer ANDEREN Sitzung. Jetzt steht unter jedem FEHLT/TEILWEISE der Zweig, der es zur Quelle macht, mit beiden Auswegen. Die Prüfung
   selbst ändert sich nicht; wer die Zweige nicht kennt (ältere Aufrufer), bekommt die Zeile ohne Zweig nicht. */
function ursachenZeile(e, zweigAusgenommen) {
  if (typeof zweigAusgenommen !== 'function') return null;
  const quellen = e.zweige.filter((z) => !zweigAusgenommen(z));
  if (!quellen.length) return null;
  return '  ↳ Ursache prüfen: Zweig ' + quellen.join(', ') + ' gilt als Quelle DIESER Landung (Name ohne „-l4-“, nicht in tools/landung-zukunftszweige.json). '
    + 'Gehört seine Arbeit zu einer SPÄTEREN Landung: Zweig mit „-l4-“ im Namen umbenennen (git branch -m) oder mit Grund in tools/landung-zukunftszweige.json eintragen. '
    + 'Gehört der Commit in DIESE Landung: aufnehmen, oder mit Grund in tools/landung-bewusst-draussen.json eintragen.';
}

function ausgabeZeilen(r, { nurFehlt, nurAusgenommen, zweigAusgenommen }) {
  const unbekannt = r.ergebnis.filter((e) => !URTEILE.includes(e.urteil));
  if (unbekannt.length) throw new Error('unbekanntes Urteil ' + [...new Set(unbekannt.map((e) => e.urteil))].join(', ') + ' — der Kopf würde weniger zählen, als die Ausgabe zeigt');
  const ausgeschlossen = r.ergebnis.filter((e) => (e.urteil === 'fehlt' || e.urteil === 'teilweise') && nurAusgenommen(e));
  const gezaehlt = r.ergebnis.filter((e) => !ausgeschlossen.includes(e));
  const blockt = (e) => e.urteil === 'fehlt' || (!nurFehlt && e.urteil === 'teilweise');
  const fehlend = gezaehlt.filter(blockt);
  const zeile = (marke, e) => `${marke} ${e.hash.slice(0, 8)} ${e.datum} ${e.betreff.slice(0, 90)}  [${e.dateienImLandestand}/${e.dateien} Dateien, ${e.zeilenImLandestand}/${e.zeilen} Zeilen; ${e.zweige.slice(0, 3).join(', ')}]`;
  const zaehlung = URTEILE.map((u) => `${u} ${gezaehlt.filter((e) => e.urteil === u).length}`).join(', ');
  const zeilen = [
    `landung-vollstaendigkeit: Landestand ${r.landestand.slice(0, 8)}, Basis ${r.basis.slice(0, 8)}, ${gezaehlt.length} Commits gezählt, ${ausgeschlossen.length} ausgeschlossen — ${zaehlung}`,
  ];
  for (const e of gezaehlt.filter((x) => x.urteil === 'fehlt')) { zeilen.push(zeile('FEHLT    ', e)); const u = ursachenZeile(e, zweigAusgenommen); if (u) zeilen.push(u); }
  for (const e of gezaehlt.filter((x) => x.urteil === 'teilweise')) { zeilen.push(zeile('TEILWEISE', e) + (nurFehlt ? '  (blockiert mit --nur-fehlt nicht)' : '')); const u = ursachenZeile(e, zweigAusgenommen); if (u) zeilen.push(u); }
  for (const e of ausgeschlossen) zeilen.push(zeile(`AUSGESCHLOSSEN ${e.urteil}`, e) + '  (nur auf Sicherungs-/Zukunftszweigen)');
  return { zeilen, fehlend };
}

if (require.main === module) main();

module.exports = {
  pruefen, einordnen, patchIds, ausnahmenLesen, zukunftsZweigeLesen,
  schnappschussSchreiben, schnappschussLesen, KANDIDAT_MUSTER, ausgabeZeilen, ursachenZeile, URTEILE,
};
