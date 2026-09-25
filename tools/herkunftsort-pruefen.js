'use strict';
/* ═════════════════════════════════════════════════════════════════
   herkunftsort-pruefen.js — Invariante 34.7, zweiter Absatz (Urheberschaft), als Prüfung nach 36.1
   ─────────────────────────────────────────────────────────────────
   WAS SIE PRÜFT, je weitere Anwendung des Verzeichnisses (tools/herkunftsort-register.json):
     1. Der Herkunftsort EXISTIERT, und zwar nach dem Herausschneiden aller Marker-Regionen (`NAME:BEGIN` …
        `NAME:END`): was ein Schnitt aus der Datei holt, darf ihn nicht mitnehmen (34.7: „DARF NICHT
        entfernbar sein“). Der Anker `data-herkunftsort="1"` steht in einem Markup-Literal, nicht in einem
        Kommentar.
     2. Er trägt die Urheberangabe: mindestens eine unersetzbare Kennung der Art „name“ (Register `angaben`).
     3. Jede Kennung an ihm — `STRINGS.<schluessel>` und Konstanten — steht in GENAU einer der zwei Gruppen
        des Registers (34.7: „Eine Kennung am Herkunftsort, die in keiner der beiden Gruppen steht, erfüllt
        diesen Absatz NICHT“).
     4. Die Gruppe hält, was sie sagt: eine unersetzbare Kennung ist NICHT durch ein Modul ersetzbar (ein
        Schlüssel steht in der Zusicherungsliste `ZUSICHERUNGS_SCHLUESSEL_*` der Datei; eine Konstante steht
        außerhalb jeder Region), eine ersetzbare Kennung IST es (kein Schlüssel der Zusicherungsliste, keine
        Konstante).
     5. Der Kopfkommentar trägt SPDX-Zeile und Copyright (30.3, „Urheberschaft am Herkunftsort nennen“).
   UND, damit sie nicht grün ist, weil ihr Gegenstand fehlt:
     6. Jedes `*.html` im Wurzelverzeichnis steht im Verzeichnis, als Anwendung oder als „keine Anwendung“
        MIT Grund und Probe (30.1b, 36.3). Ein fünftes Artefakt, das niemand einträgt, macht die Prüfung rot.
     7. Ein Verzeichnis ohne Anwendung, eine Anwendung ohne Datei, ein Herkunftsort ohne lesbares Ende, unpaarige
        Marker und ein Herkunftsort, der seine Inhalte über einen Funktionsaufruf statt über `STRINGS.<k>`/Konstanten
        bezieht (außer `escapeHTML`), sind Verstöße, keine stillen Nullen: was die Prüfung nicht lesen kann, darf
        sie nicht als sauber melden.

   GELTUNGSBEREICH (36.1a): die `*.html` im Wurzelverzeichnis des geprüften Depots. NICHT gemessen: Begleitdateien
   (Manifest, sw.js), Unterverzeichnisse (`pages/`, `firefox-erweiterung/`), und der ERSTE Absatz von 34.7
   („Marke, Name, Beschreibung, Sprache und Farben MÜSSEN aus dem Rezept stammen“) — der bleibt beim
   Bestands-Wächter `tools/marke-nur-herkunftsort-pruefen.js`, der eine eingefrorene Menge zählt, keine Null
   verlangt und darum diese Invariante nicht entlastet (36.5).

   ANDERE FRAGE ALS DIE NACHBARN: `tests/lese-app-herkunftsort.test.js` prüft, dass EINE Datei ihren Herkunftsort
   trägt und ihn überlebt (Herstellung). Diese Datei prüft die ZUSICHERUNG über alle Anwendungen; kommt ein
   fünftes Artefakt dazu, fällt sie, und seine Probe bliebe grün.

   AUFRUF
     node tools/herkunftsort-pruefen.js                       ohne Argument: gegen die Fixture im Repo
     node tools/herkunftsort-pruefen.js --depot <pfad>        das Wurzelverzeichnis eines Depots (Repo: `--depot .`)
                                       [--register <datei>]   Standard: <depot>/tools/herkunftsort-register.json,
                                                              sonst <depot>/register.json
                                       [--json]
   Exit 0 = kein Verstoß, 1 = Verstöße, 2 = nicht lesbar. DER EXIT-CODE IST DAS ERGEBNIS: die Test-Datei fährt
   dieses Werkzeug als Prozess, nicht per `require`, damit ein ✗ ohne Exit 1 auffällt.
   ═════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const path = require('node:path');
const Angaben = require('./lib/herkunftsort-angaben.js');

const REPO = path.join(__dirname, '..');
const FIXTURE_GUT = path.join(REPO, 'tests', 'fixtures', 'herkunftsort-invariante', 'gut');

const ANKER = 'data-herkunftsort="1"';
// Marker-Regionen wie in den Trägern: `/* NAME:BEGIN … */ … /* NAME:END … */`, Namen mit Bindestrich erlaubt
// (`ZUSICHERUNGS-SCHLUESSEL-KERN`).
const REGION = /\/\* ([A-Z0-9_-]+):BEGIN\b[^\n]*\*\/[\s\S]*?\/\* \1:END\b[^\n]*\*\//g;
const KOPF_LAENGE = 3000;
// Die Ausgangsprüfung des Kerns (`_herkunftsortAusgabe(schluessel, STRINGS.schluessel)`) ist keine Umleitung: sie ergänzt nur; der Schlüssel steht weiter als `STRINGS.<k>` im Aufruf.
const AUSGANGSPRUEFUNG = '_herkunftsortAusgabe';
const LITERAL = /'(?:[^'\\\n]|\\.)*'|"(?:[^"\\\n]|\\.)*"|`(?:[^`\\]|\\.)*`/g;

// Die Regionen fallen heraus, ihre Zeilenumbrüche bleiben: so stimmen Zeilennummern im Rest mit denen der Datei überein.
// DAUERHAFTE Regionen (`NAME:BEGIN — DAUERHAFT …`, die Sorte `regionen.dauerhaft` der Gerüst-Wächter-Grundlinie: Text, den wir führen MÜSSEN) nimmt
// kein Schnitt mit und die Prüfung darum nicht heraus — dort steht die Urheberin.
const dauerhaft = (region) => /^\/\* [A-Z0-9_-]+:BEGIN\b[^\n]*DAUERHAFT/.test(region);
function ohneRegionen(text) {
  return text.replace(REGION, (region) => (dauerhaft(region) ? region : region.replace(/[^\n]/g, '')));
}

function regionenGeschnitten(text) {
  return (text.match(REGION) || []).filter((r) => !dauerhaft(r)).length;
}

function beginZahl(text) {
  return (text.match(/\/\* [A-Z0-9_-]+:BEGIN\b/g) || []).length;
}

// Die Zusicherungsliste der Datei (`const ZUSICHERUNGS_SCHLUESSEL_KERN = Object.freeze([...])`) — sie steht in einer
// Region, darum aus dem ganzen Text gelesen. null, wenn die Datei keine führt.
function zusicherungsListe(text) {
  const m = /const ZUSICHERUNGS_SCHLUESSEL_[A-Z]+ = Object\.freeze\(\[([\s\S]*?)\]\)/.exec(text);
  if (!m) return null;
  return [...m[1].matchAll(/'([A-Za-z0-9_]+)'/g)].map((x) => x[1]);
}

// Die Stellen des Herkunftsorts im Text ohne Regionen: von einem Anker in einem Markup-Literal bis zum ersten
// schließenden `</div>`-Literal. Kommentarzeilen zählen nicht (ein Kommentar über den Anker ist kein Anker).
function herkunftsortStellen(rest) {
  const stellen = [];
  const muster = /<[a-z][a-z0-9]*\b[^>\n]*\bdata-herkunftsort="1"[^>\n]*>/g;
  let m;
  while ((m = muster.exec(rest)) !== null) {
    const zeilenAnfang = rest.lastIndexOf('\n', m.index) + 1;
    if (/^\s*(\/\/|\/\*|\*)/.test(rest.slice(zeilenAnfang, m.index))) continue;
    const enden = ["'</div>'", '"</div>"', '`</div>`'].map((s) => rest.indexOf(s, m.index)).filter((i) => i >= 0);
    stellen.push({ start: m.index, ende: enden.length ? Math.min(...enden) : -1, zeile: rest.slice(0, m.index).split('\n').length });
  }
  return stellen;
}

// Kennungen im Code-Anteil der Stelle: Zeichenketten-Literale herausgenommen, dann `STRINGS.<k>` und Konstanten.
function kennungen(fenster) {
  const code = fenster.replace(LITERAL, "''");
  const raus = new Set();
  for (const m of code.matchAll(/(?<![.\w$])([A-Za-z_$][\w$]*)\s*\(/g)) if (m[1] !== 'escapeHTML' && m[1] !== AUSGANGSPRUEFUNG) raus.add('()' + m[1]);
  for (const m of code.matchAll(/\bSTRINGS\.([A-Za-z0-9_]+)/g)) raus.add('STRINGS.' + m[1]);
  for (const m of code.matchAll(/(?<![A-Za-z0-9_.$])([A-Z][A-Z0-9_]{3,})(?![A-Za-z0-9_])/g)) if (m[1] !== 'STRINGS') raus.add(m[1]);
  return [...raus].sort();
}

function pruefenTexte({ dateien, register, dateisatz }) {
  const verstoesse = [];
  const v = (traeger, regel, text, kennung) => verstoesse.push({ traeger, regel, text, ...(kennung ? { kennung } : {}) });
  const gemessen = { anwendungen: 0, herkunftsorte: 0, kennungen: 0, regionenGeschnitten: 0 };
  const anwendungen = register.anwendungen || [];
  const keine = register.keineAnwendung || [];
  // Die Gruppen heißen nach dem, was in der Sache liegt, nicht nach der Rolle (34.7, Fassung md5 4373a8f1): die Rolle erklärt,
  // WARUM eine Kennung in ihrer Gruppe steht.
  const unersetzbar = (register.gruppen && register.gruppen.unersetzbar) || [];
  const ersetzbar = (register.gruppen && register.gruppen.ersetzbar) || [];
  const angaben = register.angaben || {};

  if (!anwendungen.length) v('(Verzeichnis)', 'keine-anwendung', 'das Verzeichnis führt keine Anwendung — eine Prüfung ohne Gegenstand ist nicht grün');
  for (const k of unersetzbar) if (ersetzbar.includes(k)) v('(Verzeichnis)', 'gruppe-doppelt', k + ' steht in beiden Gruppen', k);

  // 6. Vollständigkeit des Verzeichnisses gegen die Dateien
  const verzeichnet = new Set([...anwendungen, ...keine].map((a) => a.datei));
  for (const datei of Object.keys(dateien).sort()) {
    if (!verzeichnet.has(datei)) v(datei, 'artefakt-nicht-verzeichnet', 'ein Artefakt im Wurzelverzeichnis, das weder Anwendung noch begründete Ausnahme ist (30.1b)');
  }
  for (const a of [...anwendungen, ...keine]) {
    if (!(a.datei in dateien)) v(a.datei, 'verzeichnis-datei-fehlt', 'das Verzeichnis nennt eine Datei, die es nicht gibt');
  }
  for (const a of keine) {
    if (!(a.datei in dateien)) continue;
    if (!a.grund) v(a.datei, 'ausnahme-ohne-grund', 'eine Ausnahme ohne Grund (30.1b)');
    if (a.probe === 'ohne-skript') {
      if (/<script\b/i.test(dateien[a.datei])) v(a.datei, 'ausnahme-probe-rot', "die Probe 'ohne-skript' schlägt an: die Datei trägt ein <script>");
    } else if (a.probe === 'nicht-im-dateisatz') {
      if (!Array.isArray(dateisatz)) v(a.datei, 'ausnahme-probe-nicht-lesbar', "die Probe 'nicht-im-dateisatz' braucht scripts/ausgeliefertes-dateiset.js im Depot");
      else if (dateisatz.includes(a.datei)) v(a.datei, 'ausnahme-probe-rot', "die Probe 'nicht-im-dateisatz' schlägt an: die Datei steht im Auslieferungssatz");
    } else {
      v(a.datei, 'ausnahme-ohne-probe', 'eine Ausnahme, die auf keine Probe verweist, ist nicht prüfbar und darf nicht eingetragen sein (36.3)');
    }
  }

  // 1-5. je Anwendung
  for (const a of anwendungen) {
    const text = dateien[a.datei];
    if (text === undefined) continue;
    gemessen.anwendungen += 1;
    const rest = ohneRegionen(text);
    gemessen.regionenGeschnitten += regionenGeschnitten(text);
    if (beginZahl(text) !== (text.match(REGION) || []).length) v(a.datei, 'region-unpaarig', 'BEGIN-Marker ohne passendes END: die Prüfung sieht diese Datei nur teilweise');

    const kopf = text.slice(0, KOPF_LAENGE);
    if (!/SPDX-License-Identifier: \S+/.test(kopf)) v(a.datei, 'kopfzeile-fehlt', 'keine SPDX-Zeile im Kopfkommentar', 'SPDX');
    if (!/Copyright \(c\) \d{4} \S/.test(kopf)) v(a.datei, 'kopfzeile-fehlt', 'kein Copyright im Kopfkommentar', 'Copyright');

    const stellen = herkunftsortStellen(rest);
    if (!stellen.length) {
      const inRegion = herkunftsortStellen(text).length > 0;
      v(a.datei, 'anker-fehlt', inRegion ? 'der Anker steht nur INNERHALB einer Marker-Region — ein Schnitt nimmt ihn mit' : 'kein Herkunftsort (`' + ANKER + '`)');
      continue;
    }
    gemessen.herkunftsorte += stellen.length;
    const liste = zusicherungsListe(text);
    // Die Art einer Angabe: aus dem Register, sonst aus dem Block HERKUNFTSORT_ANGABEN des Trägers (EINE Quelle, 34.7): trägt der Satz `{urheberin}`, ist es der Name.
    const block = Angaben.angabenLesen(text);
    const artVon = (k) => (angaben[k] || {}).art || (block && k.startsWith('STRINGS.') && block.schluessel[k.slice(8)] ? (block.schluessel[k.slice(8)].includes('{urheberin}') ? 'name' : 'lizenz') : undefined);
    for (const s of stellen) {
      if (s.ende < 0) { v(a.datei, 'herkunftsort-nicht-lesbar', 'Zeile ' + s.zeile + ': kein schließendes </div>-Literal — die Kennungen sind nicht bestimmbar'); continue; }
      const ks = kennungen(rest.slice(s.start, s.ende));
      gemessen.kennungen += ks.filter((k) => !k.startsWith('()')).length;
      if (!ks.length) v(a.datei, 'herkunftsort-leer', 'Zeile ' + s.zeile + ': der Herkunftsort trägt keine Kennung');
      if (!ks.some((k) => unersetzbar.includes(k) && artVon(k) === 'name')) v(a.datei, 'urheberangabe-fehlt', 'Zeile ' + s.zeile + ': keine unersetzbare Kennung der Art „name“ am Herkunftsort — die Lizenzkennung allein nennt keine Urheberin');
      for (const k of ks) {
        if (k.startsWith('()')) { v(a.datei, 'herkunftsort-indirekt', 'Zeile ' + s.zeile + ': der Herkunftsort ruft ' + k.slice(2) + '() auf — dessen Kennungen sind hier nicht lesbar; inline schreiben oder die Prüfung erweitern', k.slice(2)); continue; }
        const istU = unersetzbar.includes(k);
        const istA = ersetzbar.includes(k);
        if (!istU && !istA) { v(a.datei, 'gruppe-fehlt', 'Zeile ' + s.zeile + ': ' + k + ' steht in keiner der beiden Gruppen (34.7)', k); continue; }
        if (istU && istA) continue;   // schon als gruppe-doppelt gemeldet
        const schluessel = k.startsWith('STRINGS.') ? k.slice('STRINGS.'.length) : null;
        if (schluessel) {
          const gesperrt = Array.isArray(liste) && liste.includes(schluessel);
          if (istU && !gesperrt) v(a.datei, 'unersetzbar-nicht-gesperrt', k + ' ist unersetzbar, steht aber nicht in der Zusicherungsliste der Datei — ein Modul könnte sie ersetzen', k);
          if (istA && gesperrt) v(a.datei, 'ersetzbar-gesperrt', k + ' ist ersetzbar, steht aber in der Zusicherungsliste — sie wäre nicht ersetzbar (der Weißmarken-Fall bräche)', k);
        } else {
          if (istA) { v(a.datei, 'ersetzbar-konstante', k + ' ist ersetzbar, aber eine Konstante — kein Modul ersetzt sie', k); continue; }
          const deklariert = new RegExp('\\bconst ' + k + '\\s*=').test(text);
          const ausserhalb = new RegExp('\\bconst ' + k + '\\s*=').test(rest);
          if (!deklariert) v(a.datei, 'konstante-nicht-deklariert', k + ' wird am Herkunftsort gelesen, aber nirgends deklariert', k);
          else if (!ausserhalb) v(a.datei, 'unersetzbar-in-region', k + ' ist innerhalb einer Marker-Region deklariert — ein Schnitt nimmt die Angabe mit', k);
        }
      }
    }
  }
  return { verstoesse, gemessen };
}

function registerPfadFuer(depot, explizit) {
  if (explizit) return explizit;
  for (const p of [path.join(depot, 'tools', 'herkunftsort-register.json'), path.join(depot, 'register.json')]) if (fs.existsSync(p)) return p;
  return null;
}

function dateisatzLesen(depot) {
  const p = path.join(depot, 'scripts', 'ausgeliefertes-dateiset.js');
  if (!fs.existsSync(p)) return null;
  const m = /const DATEISATZ = \[([^\]]*)\]/.exec(fs.readFileSync(p, 'utf8'));
  return m ? [...m[1].matchAll(/'([^']+)'/g)].map((x) => x[1]) : null;
}

function pruefen(depot, registerPfad) {
  const rp = registerPfadFuer(depot, registerPfad);
  if (!rp) throw new Error('kein Register gefunden (tools/herkunftsort-register.json oder register.json in ' + depot + ')');
  const register = JSON.parse(fs.readFileSync(rp, 'utf8'));
  const dateien = {};
  for (const n of fs.readdirSync(depot)) if (n.endsWith('.html')) dateien[n] = fs.readFileSync(path.join(depot, n), 'utf8');
  return pruefenTexte({ dateien, register, dateisatz: dateisatzLesen(depot) });
}

function main(argv) {
  const arg = (n) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : undefined; };
  const json = argv.includes('--json');
  const depotArg = arg('--depot');
  const depot = depotArg ? path.resolve(depotArg) : FIXTURE_GUT;
  let r;
  try { r = pruefen(depot, arg('--register') ? path.resolve(arg('--register')) : undefined); } catch (e) { process.stderr.write('[herkunftsort] nicht lesbar: ' + e.message + '\n'); return 2; }
  const g = r.gemessen;
  if (json) process.stdout.write(JSON.stringify(r, null, 2) + '\n');
  else {
    process.stdout.write('[herkunftsort] ' + (depotArg ? 'Depot ' + depot : 'FIXTURE (ohne --depot): ' + path.relative(REPO, depot)) + ' — ' + g.anwendungen + ' Anwendungen, ' + g.herkunftsorte + ' Herkunftsorte, ' + g.kennungen + ' Kennungen, ' + g.regionenGeschnitten + ' Regionen herausgeschnitten\n');
    for (const x of r.verstoesse) process.stdout.write('  ✗ ' + x.traeger + ' · ' + x.regel + ' — ' + x.text + '\n');
    process.stdout.write(r.verstoesse.length ? '[herkunftsort] ROT — ' + r.verstoesse.length + ' Verstoß/Verstöße\n' : '[herkunftsort] OK — kein Verstoß\n');
  }
  return r.verstoesse.length ? 1 : 0;
}

if (require.main === module) process.exit(main(process.argv.slice(2)));

module.exports = { pruefen, pruefenTexte, ohneRegionen, herkunftsortStellen, kennungen, zusicherungsListe, FIXTURE_GUT };
