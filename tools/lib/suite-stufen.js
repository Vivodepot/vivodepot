'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   Suite-Stufen — welche Testdateien die Schnellstufe fährt (28.09.2026)
   ────────────────────────────────────────────────────────────────────────────
   DER ANLASS. Der pre-commit fuhr bei jedem Commit die volle Suite (≈ 10 min). Jeder rote Anlauf — eine
   vergessene Grundlinie, ein Zähler — kostete einen weiteren vollen Lauf, auch für Zwischen-Commits auf einem
   Zweig, die nie gepusht werden. Gemessen am 28.09.2026 (Zeit je Datei aus dem jüngsten vollen Lauf): 1 156 von
   1 428 Testdateien brauchen je ≤ 2 s, zusammen 727 s Testzeit; drei Dateien allein 584 s.

   DIE STUFE. Langsam ist, was in der committeten, erzeugten Liste (LISTE unten) steht; schnell ist
   jede andere Testdatei — auch jede neue, bis ein bewusster Schreiblauf sie als langsam einträgt. Die Auswahl
   kommt NIE aus einer Zeitmessung zur Laufzeit: unter Last wäre sonst jede Datei „langsam", und die Stufe
   wackelte (Bedingung der Gegenlesung, 28.09.2026).
   GEMESSEN wird nur im bewussten Schreiblauf des Hook-Werkzeugs: er liest die Zeiten, die
   tools/lib/datei-zeiten-reporter.mjs bei jedem `npm test` im gemeinsamen Git-Verzeichnis ablegt.
   `--check` prüft allein die STRUKTUR der Liste (jeder Eintrag eine getrackte Testdatei, keine Dubletten,
   sortiert) — nie eine Messung.

   DIE GRENZE DER STUFE, ausdrücklich: die Schnellstufe kann eine langsame Datei auslassen, die rot wäre.
   Der Commit bleibt dann grün; der pre-push fährt die volle Suite (kein Voll-Beleg aus der Schnellstufe)
   und fängt es vor dem Push. So ist es gewollt: der Push ist das Einbahntor.
   ANLASS AUS DEM DIFF (04.10.2026, Befund SCHNELLSTUFE-OHNE-DIFF-ANLASS). Die Grenze oben traf ausgerechnet die Proben, die den
   geänderten Text spiegeln: ein Commit an einem Hook ließ die langsame Probe aus, die genau diese Zeile wörtlich prüft, und
   das Rot kam erst vor dem Push. Darum holt anlassDateien aus der Langsam-Liste zurück: (a) jede GEÄNDERTE
   langsame Testdatei, (b) jede langsame Probe, die einen geänderten Pfad nennt — wörtlich oder als
   Join-Folge gequoteter Segmente —, (c) jede Probe, die unter `spiegelt` der Liste für einen geänderten Pfad erklärt ist (für
   Pfade, die eine Textsuche nicht sieht). spiegelBefunde hält die Klasse: wer einen Hook spiegelt, muss zurückkommen.
   (d) NEUE DATEI (08.10.2026, Befund SCHNELLSTUFE-OHNE-NEUE-DATEI): jede Probe, die unter `bei_neuer_datei` der Liste für ein
   Verzeichnis-Präfix erklärt ist, sobald der Diff dort eine Datei NEU anlegt (auch umbenannt). Anlass: ein Commit brachte ein
   neues Werkzeug ohne Zuschnitt-Entscheidung; die Probe des Ausschluss-Wächters ist langsam und lief im pre-commit nicht,
   das Rot kam erst am Zugkopf.
   (e) BAUMWEIT (17.10.2026, Befund SCHNELLSTUFE-OHNE-BAUMWEITE-PROBE): eine langsame Probe, die den ganzen Bestand durchsucht,
   wird von jeder Datei rot — (a)–(d) sehen das nicht, weil sie die geänderte Datei nicht nennt. Anlass: v931 wurde erst auf
   dem Prüfrechner rot (eine Ausnahme der Repo-Adress-Probe zeigte nach einem Commit auf die falsche Zeile). Darum kann die
   Liste je Probe unter `baumweit` einen TEILAUFRUF erklären: { werkzeug, argumente, teil } — dasselbe Werkzeug und dieselbe
   Prüffunktion über die geänderten Dateien des Commits, in Sekunden. Holt (a)–(d) die Probe ohnehin zurück, entfällt er.
   Was sich nicht auf Dateien zerlegen lässt (Querbezüge, Ratschen über Gesamtzahlen, Bau des ganzen Zuschnitts), steht
   mit Grund unter `baumweit_nicht` und bleibt beim Anlass oben; der volle Lauf bleibt im pre-push. Klassenwächter:
   jede langsame Probe, auf die BAUMWEIT_MUSTER passt, steht in einem der beiden Felder (baumweitBefunde).
   ════════════════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const GRENZE_MS = 2000;
const DATEINAME = 'vd-suite-dateizeiten.json';

function ohneGitUmgebung(env = process.env) {
  const e = { ...env };
  for (const k of ['GIT_DIR', 'GIT_WORK_TREE', 'GIT_INDEX_FILE', 'GIT_COMMON_DIR']) delete e[k];
  return e;
}

/** Pfad der Zeiten-Datei: VD_DATEI_ZEITEN, sonst im gemeinsamen Git-Verzeichnis des Repos. */
function zeitenPfad(repo, env = process.env) {
  if (env.VD_DATEI_ZEITEN) return path.resolve(env.VD_DATEI_ZEITEN);
  try {
    const gemeinsam = execFileSync('git', ['rev-parse', '--path-format=absolute', '--git-common-dir'],
      { cwd: repo, env: ohneGitUmgebung(env), encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
    return path.join(gemeinsam, DATEINAME);
  } catch (_) { return null; }
}

function zeitenLesen(pfad) {
  try { const j = JSON.parse(fs.readFileSync(pfad, 'utf8')); return j && typeof j.zeiten === 'object' ? j : null; }
  catch (_) { return null; }
}

/* ZEIT JE TESTDATEI, NICHT JE AUFRUFORT (26.10.2026). Der Läufer meldet je Test die Datei, in der test() aufgerufen wurde.
   Rufen Testdateien test() über einen Helfer auf (am 26.10.2026: 99 Dateien über einen Helfer für Tests, die nur privat laufen), landete die Zeit aller dieser
   Tests beim Helfer: er stand mit 308 s als drittlangsamste „Testdatei“ in der Messung, die Dateien selbst fehlten.
   Jetzt zählt nur, was eine Testdatei ist (*.test.js); eine Datei ohne eigene Testzeit bekommt ihre Wanduhrzeit aus dem
   Dateiereignis des Läufers. Alte Einträge, die keine Testdatei sind, fallen beim Zusammenführen heraus.
   Probe: [Reporter·Aufrufort] in der Probe der Schnellstufe. */
const IST_TESTDATEI = /\.test\.js$/;
function dateiZeitenZuordnen(je = {}, wand = {}) {
  const aus = {};
  for (const [k, v] of Object.entries(je)) if (IST_TESTDATEI.test(k)) aus[k] = Math.round(v);
  for (const [k, v] of Object.entries(wand)) if (IST_TESTDATEI.test(k) && !(k in aus)) aus[k] = Math.round(v);
  return aus;
}
/** Neue Messung in die alte einarbeiten: gemessene Dateien überschreiben, ungemessene bleiben; nur Testdateien. */
function zusammenfuehren(alt, neu, jetzt = new Date().toISOString()) {
  const zeiten = { ...((alt && alt.zeiten) || {}), ...neu };
  for (const k of Object.keys(zeiten)) if (!IST_TESTDATEI.test(k)) delete zeiten[k];
  return { erhoben: jetzt, zeiten };
}

/** Aus einer Messung die Liste der langsamen Dateien (sortiert, nur getrackte Testdateien). */
/* NIE LANGSAM (29.09.2026): Ratschen und Deckel gegen den echten Bestand prüfen genau das, was ein Commit ändert, und
   sind billig im Verhältnis zu dem, was sie verhindern. Fielen sie in die Langsam-Liste, liefen sie erst im pre-push —
   Anlass: ein Gerüst-Deckel, der erst dort rot wurde. Sie stehen mit Grund im Feld `nie_langsam` der Liste; der
   Schreiblauf nimmt sie nie auf, und eine Datei in beiden Feldern ist ein Strukturfehler. */
function langsamAusZeiten(zeiten, testDateienListe, grenzeMs = GRENZE_MS, nieLangsam = {}) {
  const z = (zeiten && zeiten.zeiten) || {};
  const bekannt = new Set(testDateienListe);
  return Object.keys(z).filter((d) => bekannt.has(d) && z[d] > grenzeMs && !(d in nieLangsam)).sort();
}

/** Die Liste liegt beim Hook-Werkzeug; wer sie liest, nennt den Pfad. */
function listeLesen(repo, rel) {
  try { return JSON.parse(fs.readFileSync(path.join(repo, rel), 'utf8')); } catch (_) { return null; }
}

/** Struktur der Liste — keine Messung. Leer = in Ordnung. */
function listePruefen(liste, testDateienListe) {
  const f = [];
  if (!liste || !Array.isArray(liste.langsam)) return ['die Liste fehlt oder hat kein Feld „langsam"'];
  if (typeof liste.grenze_ms !== 'number') f.push('grenze_ms fehlt');
  const bekannt = new Set(testDateienListe);
  for (const d of liste.langsam) if (!bekannt.has(d)) f.push('Eintrag ohne getrackte Testdatei: ' + d);
  const doppelt = liste.langsam.filter((d, i, a) => a.indexOf(d) !== i);
  for (const d of new Set(doppelt)) f.push('Dublette: ' + d);
  const nie = liste.nie_langsam || {};
  for (const d of Object.keys(nie)) {
    if (!bekannt.has(d)) f.push('nie_langsam ohne getrackte Testdatei: ' + d);
    if (liste.langsam.includes(d)) f.push('steht in langsam UND nie_langsam: ' + d);
    if (typeof nie[d] !== 'string' || nie[d].length < 10) f.push('nie_langsam ohne Grund: ' + d);
  }
  const sp = liste.spiegelt || {};
  if (typeof sp !== 'object' || Array.isArray(sp)) f.push('spiegelt ist kein Objekt');
  else {
    for (const [d, pfade] of Object.entries(sp)) {
      if (!liste.langsam.includes(d)) f.push('spiegelt nennt eine Datei, die nicht langsam ist: ' + d);
      if (!Array.isArray(pfade) || !pfade.length || pfade.some((p) => typeof p !== 'string' || !p)) f.push('spiegelt ohne Pfade: ' + d);
    }
  }
  const nd = liste.bei_neuer_datei || {};
  if (typeof nd !== 'object' || Array.isArray(nd)) f.push('bei_neuer_datei ist kein Objekt');
  else {
    for (const [d, praefixe] of Object.entries(nd)) {
      if (!liste.langsam.includes(d)) f.push('bei_neuer_datei nennt eine Datei, die nicht langsam ist: ' + d);
      if (!Array.isArray(praefixe) || !praefixe.length || praefixe.some((p) => typeof p !== 'string' || !p.endsWith('/'))) f.push('bei_neuer_datei ohne Verzeichnis-Präfixe (mit „/“ am Ende): ' + d);
    }
  }
  const bw = liste.baumweit || {};
  const nicht = liste.baumweit_nicht || {};
  for (const [d, e] of Object.entries(bw)) {
    if (!liste.langsam.includes(d)) f.push('baumweit nennt eine Datei, die nicht langsam ist: ' + d);
    if (!e || typeof e.werkzeug !== 'string' || !e.werkzeug.endsWith('.js')) f.push('baumweit ohne Werkzeug: ' + d);
    if (!e || typeof e.teil !== 'string' || e.teil.length < 20) f.push('baumweit ohne Erklärung des Teilaufrufs (teil): ' + d);
    if (e && e.argumente !== undefined && !Array.isArray(e.argumente)) f.push('baumweit: argumente ist keine Liste: ' + d);
    if (nicht[d]) f.push('steht in baumweit UND baumweit_nicht: ' + d);
  }
  for (const [d, g] of Object.entries(nicht)) {
    if (!liste.langsam.includes(d)) f.push('baumweit_nicht nennt eine Datei, die nicht langsam ist: ' + d);
    if (typeof g !== 'string' || g.length < 20) f.push('baumweit_nicht ohne Grund: ' + d);
  }
  const sortiert = [...liste.langsam].sort();
  if (sortiert.join('\n') !== liste.langsam.join('\n')) f.push('nicht sortiert');
  return f;
}

/** Nennt `quelle` den Pfad wörtlich oder als Folge gequoteter Segmente ('a', 'b', 'c.js')? */
function nenntPfad(quelle, pfad) {
  if (quelle.includes(pfad)) return 'wörtlich';
  const teile = pfad.split('/');
  if (teile.length < 2) return null;
  const esc = (t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(teile.map((t) => '[\'"`]' + esc(t) + '[\'"`]').join('\\s*,\\s*'));
  return re.test(quelle) ? 'Join' : null;
}

/** Langsame Dateien, die der Diff zurück in die Schnellstufe holt: [{ datei, grund }]. */
function anlassDateien(liste, geaendert, lesen, neu = []) {
  const langsam = (liste && liste.langsam) || [];
  const spiegelt = (liste && liste.spiegelt) || {};
  const beiNeu = (liste && liste.bei_neuer_datei) || {};
  const aus = [];
  for (const d of langsam) {
    if (geaendert.includes(d)) { aus.push({ datei: d, grund: 'selbst geändert' }); continue; }
    const erklaert = (spiegelt[d] || []).find((p) => geaendert.includes(p));
    if (erklaert) { aus.push({ datei: d, grund: erklaert + ' (spiegelt)' }); continue; }
    const neuDa = (neu || []).find((p) => (beiNeu[d] || []).some((v) => p.startsWith(v)));
    if (neuDa) { aus.push({ datei: d, grund: neuDa + ' (neue Datei)' }); continue; }
    let quelle = null;
    for (const p of geaendert) {
      if (p === d) continue;
      if (quelle === null) { try { quelle = lesen(d); } catch (_) { quelle = ''; } }
      const art = nenntPfad(quelle, p);
      if (art) { aus.push({ datei: d, grund: p + ' (' + art + ')' }); break; }
    }
  }
  return aus;
}

/* Spiegelt eine Probe einen Hook? (i) sie enthält eine kennzeichnende Zeile des Hooks wörtlich (≥ 30 Zeichen, kein Kommentar,
   keine bloße Klammer- oder Kontrollzeile), oder (ii) sie nennt den Ordner hooks und den Hook-Namen als Zeichenkette. */
const KONTROLLE = /^(?:fi|then|else|esac|done|do|;;|\{|\}|exit \d+|set -e)$/;
/* Ein Durchlauf über den Bestand: git ls-files, ein Baum- oder Zuschnitt-Durchlauf. */
const BAUMWEIT_MUSTER = /pruefeBaum\(|ls-files|vollerBestand\(|zuschnittDateien\(|alleDateien\(/;

/** Teilaufrufe der baumweiten Proben, die nicht schon als Ganzes laufen: [{ probe, befehl: [werkzeug, ...argumente, ...dateien], teil }]. */
function baumweitSchritte(liste, geaendert, imPlan) {
  const bw = (liste && liste.baumweit) || {};
  if (!geaendert || !geaendert.length) return [];
  return Object.entries(bw).filter(([probe]) => !imPlan.includes(probe))
    .map(([probe, e]) => ({ probe, befehl: [e.werkzeug, ...(e.argumente || []), ...geaendert], dateien: geaendert.length, teil: e.teil }));
}

/** Klassenwächter: jede langsame Probe mit Bestands-Durchlauf steht unter baumweit oder baumweit_nicht. */
function baumweitBefunde(liste, lesen) {
  const f = [];
  const bw = liste.baumweit || {};
  const nicht = liste.baumweit_nicht || {};
  for (const d of liste.langsam || []) {
    let q = '';
    try { q = lesen(d); } catch (_) { continue; }
    if (BAUMWEIT_MUSTER.test(q) && !bw[d] && !nicht[d]) f.push('langsam mit Bestands-Durchlauf, weder baumweit noch baumweit_nicht: ' + d);
  }
  return f;
}

function kennzeichnendeZeilen(hookText) {
  return [...new Set(String(hookText).split('\n').map((z) => z.trim())
    .filter((z) => z.length >= 30 && !z.startsWith('#') && !KONTROLLE.test(z) && !/^echo\s/.test(z)))];
}
// `andere`: die übrigen Hooks { pfad: text }. Eine Zeile, die auch in einem Hook steht, den die Probe beim Pfad nennt, gehört zu
// jenem (pre-push und pre-commit teilen Zeilen; eine pre-push-Probe spiegelt den pre-commit nicht).
function spiegeltHook(quelle, hookPfad, hookText, andere = {}) {
  const name = hookPfad.split('/').pop();
  if (/['"`/]hooks['"`/]/.test(quelle) && new RegExp('[\'"`/]' + name.replace(/[-.]/g, '\\$&') + '[\'"`]').test(quelle)) return 'nennt den Hook';
  const genannt = Object.entries(andere).filter(([h]) => h !== hookPfad && nenntPfad(quelle, h)).map(([, t]) => t);
  const z = kennzeichnendeZeilen(hookText).find((l) => quelle.includes(l) && !genannt.some((t) => t.includes(l)));
  return z ? 'enthält die Zeile „' + z.slice(0, 60) + '“' : null;
}
/** Langsame Proben, die einen Hook spiegeln, aber bei dessen Änderung NICHT zurückgeholt würden. Leer = in Ordnung. */
function spiegelBefunde(liste, lesen, hooks) {
  const b = [];
  for (const d of (liste && liste.langsam) || []) {
    let quelle;
    try { quelle = lesen(d); } catch (_) { continue; }
    for (const [h, text] of Object.entries(hooks)) {
      const wie = spiegeltHook(quelle, h, text, hooks);
      if (!wie) continue;
      if (!anlassDateien({ langsam: [d], spiegelt: (liste.spiegelt || {}) }, [h], () => quelle).length) {
        b.push(d + ' spiegelt ' + h + ' (' + wie + '), wird bei dessen Änderung aber nicht zurückgeholt — Pfad nennen oder unter „spiegelt“ erklären');
      }
    }
  }
  return b;
}

/** Die Schnellstufe: alle Testdateien außer den langsamen der Liste. */
function schnelleDateien(dateien, liste) {
  const langsam = new Set((liste && liste.langsam) || []);
  return dateien.filter((d) => !langsam.has(d));
}

/** Alle Testdateien, die `npm test` sammelt (dieselben zwei Muster wie in package.json). */
function testDateien(repo) {
  return execFileSync('git', ['ls-files', 'tests/**/*.test.js', 'tools/**/*.test.js', 'tests/*.test.js', 'tools/*.test.js'],
    { cwd: repo, env: ohneGitUmgebung(), encoding: 'utf8', maxBuffer: 64 << 20 }).split('\n').filter(Boolean)
    .filter((d, i, a) => a.indexOf(d) === i).sort();
}

module.exports = { ohneGitUmgebung, GRENZE_MS, DATEINAME, zeitenPfad, zeitenLesen, zusammenfuehren, dateiZeitenZuordnen, IST_TESTDATEI, langsamAusZeiten, listeLesen, listePruefen, schnelleDateien, testDateien, nenntPfad, anlassDateien, BAUMWEIT_MUSTER, baumweitSchritte, baumweitBefunde, kennzeichnendeZeilen, spiegeltHook, spiegelBefunde };
