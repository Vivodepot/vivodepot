#!/usr/bin/env node
'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   testflaeche-klasse-pruefen.js — Befund TESTFLAECHE-AUF-ECHTEM-PRODUKT (10.10.2026)
   ────────────────────────────────────────────────────────────────────────────
   Seit U2-ADR-494 fehlt window.__vdOeffentlich im ausgelieferten Produkt. Eine Probe oder ein
   Werkzeug, das ein echtes Produkt baut und es über die Fläche bedient, bricht oder wartet auf
   einen Wert, der nie kommt. Die erste Fassung des Wächters sah nur je Datei hin und ließ die
   E2E-Ordner aus; die Wege 4 bis 6 bauten aber in einem gemeinsamen Helfer und bedienten in der
   Probe. Darum folgt diese Prüfung der require-Kette, und zwar je Funktion:

     BAUT      eine Funktion (oder der Modulrumpf), die konfektionieren(…) oder produktTextErzeugen(…) ohne die
               wörtliche Angabe `mitTestflaeche: true` ruft, tools/vier-produkte-erzeugen.js ohne
               --mit-testflaeche startet, den Auslieferungs-Backschritt _produktBauen ruft oder die Region der
               Fläche selbst schneidet.
     BEDIENT   eine Funktion (oder der Modulrumpf), die window.__vdOeffentlich liest.
     ERREICHT  eine Datei erreicht den Modulrumpf jedes Helfers, den sie lädt, und jede seiner
               Funktionen, deren Namen sie nennt; von dort geht es ebenso weiter.

   Auffällig ist eine Datei, die sowohl ein BAUT als auch ein BEDIENT erreicht. Die Prüfung ist
   statisch: sie sieht nicht, ob beides dieselbe Seite trifft. Eine Datei, die ein ausgeliefertes
   Produkt nur vermisst und die Fläche an einer Testfassung bedient, trägt
   selbst die Marke `@testflaeche-klasse-ausnahme:` mit ihrem Grund (mindestens vierzig Zeichen, in einer Zeile). Die Marke
   gilt nur, wo die Datei den Auslieferungs-Backschritt selbst ruft.

   AUFRUF
     node tools/testflaeche-klasse-pruefen.js            Funde am Baum, Exit 1 bei Funden ohne Ausnahme-Marke
     node tools/testflaeche-klasse-pruefen.js --alle     auch die ausgenommenen, mit beiden Ketten
     node tools/testflaeche-klasse-pruefen.js --tiefe    die tiefste Helferkette, die die Prüfung am Baum abgelaufen ist
     node tools/testflaeche-klasse-pruefen.js --warum <datei>   die beiden Ketten je Funktion (datei#funktion)
   ════════════════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { ohneGitUmgebung } = require('./lib/ohne-git-umgebung.js');

const REPO = path.join(__dirname, '..');
/* Die Ausnahme steht in der Datei selbst, mit Grund. Ohne Grund ist die Marke keine Ausnahme. Sie gilt nur für eine Datei, die
   selbst den Auslieferungs-Backschritt ruft: das Produkt, das sie baut, ist dann das ausgelieferte, und sie belegt die
   Testfassung dagegen. Wer über eine der anderen Baufunktionen baut, kann die Testfassung bestellen; dort ist eine Marke ein
   Fund wie ohne sie. Die Marke ist eine Selbstauskunft: welche Dateien sie tragen dürfen, hält eine Probe beim Namen fest. */
const AUSNAHME_NUR_BEI = '_produktBauen';
const AUSNAHME_MARKE = /@testflaeche-klasse-ausnahme:[ \t]*(\S[^\n]{39,})/;
const RUMPF = '<modul>';
/* So tief läuft die Prüfung einer require-Kette nach. Erreicht eine Kette diese Länge, bricht sie ab, statt den Rest ungeprüft zu
   lassen. Gemessene Tiefe am Baum: `node tools/testflaeche-klasse-pruefen.js --tiefe`. */
const TIEFEN_GRENZE = 16;
/* Die Bauwerkzeuge selbst: wer sie ruft, baut — an der Rufstelle erkannt. In sie hinein folgt die Kette nicht, sonst gälte jeder
   Bau einer Testfassung als Bau ohne Fläche. Ein Bauwerkzeug ist ein Modul, das eine der Baufunktionen oder den Schnitt erklärt,
   und das Werkzeug, das die vier Produkte auf die Platte schreibt. GRENZE: ein Bauweg unter einem anderen Funktionsnamen fällt
   nur auf, soweit er eine dieser Funktionen ruft; tests/kern-testflaeche.test.js hält die Rufer des Schnitts gegen den Baum. */
const BAUFUNKTION_ERKLAERT = /^function (konfektionieren|_produktBauen|produktTextErzeugen|_kernTestflaecheSchneiden)\(/m;
function istBauwerkzeug(datei, text) {
  return datei === 'tools/vier-produkte-erzeugen.js' || BAUFUNKTION_ERKLAERT.test(text);
}

function ohneKommentare(text) {
  return text.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' ')).replace(/(^|[^:'"`\\])\/\/.*$/gm, '$1');
}

/* Für die Frage, ob ein Text eine Funktion NENNT: ohne einzeilige Zeichenketten. Ein Funktionsname in einer Meldung
   („…-lauf: abgebrochen") ist kein Aufruf. */
function ohneZeichenketten(text) {
  return text.replace(/'(?:[^'\\\n]|\\.)*'|"(?:[^"\\\n]|\\.)*"/g, "''");
}
function nennt(text, name) {
  return new RegExp('(?<![\\w$.])' + name.replace(/\$/g, '\\$') + '\\b').test(ohneZeichenketten(text)) || new RegExp('\\.' + name.replace(/\$/g, '\\$') + '\\(').test(text);
}

/* Jeder Aufruf einer Funktion samt Argumenten, über Klammerzählung. Die Erklärung der Funktion zählt nicht. */
function aufrufe(text, name) {
  const gefunden = [];
  const muster = new RegExp('(?<!function )(?<![\\w$])' + name + '\\(', 'g');
  for (let m; (m = muster.exec(text));) {
    let tiefe = 1; let i = m.index + m[0].length;
    for (; i < text.length && tiefe > 0; i++) { if (text[i] === '(') tiefe++; else if (text[i] === ')') tiefe--; }
    gefunden.push(text.slice(m.index, i));
  }
  return gefunden;
}
/* Ein Produkt ohne Fläche entsteht an genau einer Stelle: wo die Region der Fläche geschnitten wird (SCHNITT). Dorthin führen
   die Baufunktionen, sofern ihr Aufruf nicht wörtlich die Testfassung verlangt, der Auslieferungs-Backschritt und das Werkzeug,
   das die vier Produkte auf die Platte schreibt. */
const SCHNITT = '_kernTestflaecheSchneiden';
const BAUT_AUSSER_TESTFASSUNG = ['konfektionieren', 'produktTextErzeugen'];
const BAUT_IMMER = ['_produktBauen', SCHNITT];
function baut(text) {
  if (BAUT_AUSSER_TESTFASSUNG.some((n) => aufrufe(text, n).some((a) => !/\bmitTestflaeche:\s*true\b/.test(a)))) return true;
  if (BAUT_IMMER.some((n) => aufrufe(text, n).length > 0)) return true;
  return /vier-produkte-erzeugen\.js['"]/.test(text) && !/--mit-testflaeche/.test(text);
}
/* Lesen der Fläche: Zugriff auf ein Mitglied, Rückfall (`|| window`) oder Weiterreichen als Wert. Die bloße Frage, ob es sie
   gibt (typeof, Vergleich), und ihr Name in einer Zeichenkette zählen nicht. */
function bedient(text) {
  return /window\.__vdOeffentlich\s*(\.|\[|\|\|)/.test(text) || /[=(,]\s*window\.__vdOeffentlich\s*[;,)]/.test(ohneZeichenketten(text));
}

/* Zerlegt ein Modul in seine Funktionen auf oberster Ebene; alles übrige ist der Modulrumpf. Eine Funktion reicht von ihrer
   Erklärung in Spalte 0 bis zu der Zeile, an deren Ende alle ihre Klammern wieder geschlossen sind (schlicht gezählt). */
function abschnitte(text) {
  const teile = new Map([[RUMPF, '']]);
  let name = RUMPF; let tiefe = 0;
  for (const zeile of text.split('\n')) {
    if (name === RUMPF) {
      const m = /^(?:export\s+)?(?:async\s+)?function\s*\*?\s*([A-Za-z_$][\w$]*)\s*\(/.exec(zeile)
        || /^(?:export\s+)?(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?(?:function\b|\([^)]*\)\s*=>|[A-Za-z_$][\w$]*\s*=>)/.exec(zeile);
      if (m) { name = m[1]; tiefe = 0; }
    }
    teile.set(name, (teile.get(name) || '') + zeile + '\n');
    if (name !== RUMPF) {
      for (const z of zeile) { if ('({['.includes(z)) tiefe++; else if (')}]'.includes(z)) tiefe--; }
      if (tiefe <= 0) name = RUMPF;
    }
  }
  // Die Ausfuhrliste nennt jede Funktion, ruft aber keine: sie zählt nicht als Nennung.
  teile.set(RUMPF, teile.get(RUMPF).replace(/module\.exports\s*=\s*\{[^}]*\}/g, ''));
  return teile;
}
/* Der Rumpf eines GELADENEN Moduls, soweit er beim Laden läuft: ohne den Hauptlauf (`if (require.main === module) …`)
   und ohne die Einfuhrzeilen. */
function ohneHauptlauf(rumpf) {
  const zeilen = rumpf.split('\n'); const raus = []; let tiefe = 0; let drin = false;
  for (const zeile of zeilen) {
    if (!drin && /^if \(require\.main === module\)/.test(zeile)) { drin = true; tiefe = 0; }
    if (!drin) { raus.push(zeile); continue; }
    for (const z of zeile) { if ('({['.includes(z)) tiefe++; else if (')}]'.includes(z)) tiefe--; }
    if (tiefe <= 0) drin = false;
  }
  // Eine Einfuhrzeile nennt Funktionen, ruft sie aber nicht.
  return raus.join('\n').replace(/(?:const|let|var)\s*\{[^}]*\}\s*=\s*require\([^)]*\)(?:\([^)]*\))?;?/g, '')
    .replace(/(?:^|\n)import\s*[^'"()]*?\sfrom\s*['"][^'"]+['"];?/g, '\n');
}

/* Die Helfer, die eine Datei lädt: require(…) samt createRequire(…)(…) und einem so erzeugten require unter anderem Namen,
   und die Modul-Einfuhr (import … from '…', import '…', import('…')). Nur Pfade im Repo. */
function geladeneHelfer(datei, text, vorhanden) {
  const helfer = [];
  const aufnehmen = (stuecke, vonRepo) => {
    if (!vonRepo && !/^\.{1,2}\//.test(stuecke[0]) && stuecke.length === 1) return;
    const p = path.posix.normalize(vonRepo ? stuecke.join('/') : path.posix.join(path.posix.dirname(datei), ...stuecke));
    for (const endung of ['', '.js', '.mjs', '.cjs', '/index.js']) if (vorhanden.has(p + endung)) { helfer.push(p + endung); break; }
  };
  const eigeneRequire = [...text.matchAll(/(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*createRequire\(/g)].map((m) => m[1].replace(/\$/g, '\\$'));
  const lader = ['require', 'createRequire\\([^)]*\\)', ...eigeneRequire].join('|');
  for (const m of text.matchAll(new RegExp('(?<![\\w$.])(?:' + lader + ')\\(\\s*(?:path\\.join\\(\\s*(?:__dirname|REPO)\\s*,\\s*)?((?:[\'"][^\'"]+[\'"]\\s*,?\\s*)+)\\)', 'g'))) {
    aufnehmen([...m[1].matchAll(/['"]([^'"]+)['"]/g)].map((s) => s[1]), /path\.join\(\s*REPO/.test(m[0]));
  }
  for (const m of text.matchAll(/(?:^|[\s;])import\s*(?:[^'"()]*?\sfrom\s*)?['"]([^'"]+)['"]|(?<![\w$.])import\(\s*['"]([^'"]+)['"]\s*\)/g)) aufnehmen([m[1] || m[2]], false);
  return [...new Set(helfer)];
}

/* Liefert je Datei die kürzeste Kette zu einem BAUT und zu einem BEDIENT (oder null). `lesen` und
   `dateien` sind einsetzbar, damit der Rot-Beweis an erfundenen Ketten läuft. */
function klassePruefen({ dateien, lesen, grenze = TIEFEN_GRENZE }) {
  let abgelaufen = { tiefe: 0, kette: [] };
  const vorhanden = new Set(dateien);
  const zerlegt = new Map();
  const modul = (f) => {
    if (!zerlegt.has(f)) {
      const text = ohneKommentare(lesen(f));
      // Von außen erreichbar ist nur, was das Modul ausführt; ohne lesbare Ausfuhrliste gilt jede Funktion als ausgeführt.
      const liste = /module\.exports\s*=\s*\{([^}]*)\}/.exec(text);
      const modulAusfuhr = [...text.matchAll(/^export\s+(?:async\s+)?(?:function\s*\*?|const|let|var)\s+([A-Za-z_$][\w$]*)/gm)].map((m) => m[1])
        .concat([...text.matchAll(/^export\s*\{([^}]*)\}/gm)].flatMap((m) => m[1].split(',').map((n) => n.split(/\sas\s/)[0].trim()).filter(Boolean)));
      const ausfuhr = liste ? new Set(liste[1].split(',').map((n) => n.split(':').pop().trim()).filter(Boolean)) : (modulAusfuhr.length ? new Set(modulAusfuhr) : null);
      zerlegt.set(f, { text, teile: abschnitte(text), helfer: geladeneHelfer(f, text, vorhanden), ausfuhr, bauwerkzeug: istBauwerkzeug(f, text) });
    }
    return zerlegt.get(f);
  };
  function ketten(start) {
    // Knoten: [datei, abschnitt]; die Startdatei zählt als Ganzes.
    const gesehen = new Set([start + '#*']);
    const schlange = [{ datei: start, text: modul(start).text, kette: [start], spur: [start] }];
    const fund = { baut: null, bedient: null, bautSpur: null, bedientSpur: null };
    while (schlange.length) {
      const k = schlange.shift();
      if (k.kette.length - 1 > abgelaufen.tiefe) abgelaufen = { tiefe: k.kette.length - 1, kette: k.kette };
      if (k.kette.length - 1 >= grenze) throw new Error('testflaeche-klasse-pruefen: die Helferkette ' + k.kette.join(' > ') + ' ist tiefer, als die Prüfung abläuft (' + grenze + ').');
      if (!fund.baut && baut(k.text)) { fund.baut = k.kette; fund.bautSpur = k.spur; }
      if (!fund.bedient && bedient(k.text)) { fund.bedient = k.kette; fund.bedientSpur = k.spur; }
      const ziele = [];
      if (k.abschnitt) { // innerhalb desselben Helfers: genannte Geschwisterfunktionen
        for (const [name, text] of modul(k.datei).teile) if (name !== RUMPF && name !== k.abschnitt && nennt(k.text, name)) ziele.push({ datei: k.datei, abschnitt: name, text, kette: k.kette, spur: [...k.spur, k.datei + '#' + name] });
      }
      for (const h of modul(k.datei).helfer) {
        if (modul(h).bauwerkzeug) continue;
        for (const [name, roh] of modul(h).teile) {
          const text = name === RUMPF ? ohneHauptlauf(roh) : roh;
          if (name !== RUMPF && modul(h).ausfuhr && !modul(h).ausfuhr.has(name)) continue;
          if (name === RUMPF || nennt(k.text, name)) ziele.push({ datei: h, abschnitt: name, text, kette: k.kette[k.kette.length - 1] === h ? k.kette : [...k.kette, h], spur: [...k.spur, h + '#' + name] });
        }
      }
      for (const z of ziele) { const schluessel = z.datei + '#' + z.abschnitt; if (!gesehen.has(schluessel)) { gesehen.add(schluessel); schlange.push(z); } }
    }
    return fund;
  }
  const funde = [];
  for (const f of dateien) {
    if (modul(f).bauwerkzeug) continue;
    const r = ketten(f);
    const marke = r.baut && r.bedient && aufrufe(modul(f).text, AUSNAHME_NUR_BEI).length ? AUSNAHME_MARKE.exec(lesen(f)) : null;
    if (r.baut && r.bedient) funde.push({ datei: f, ausnahme: marke ? marke[1].replace(/\s*\*\/\s*$/, '').trim() : null, baut: r.baut, bedient: r.bedient, bautSpur: r.bautSpur, bedientSpur: r.bedientSpur, tiefe: Math.max(r.baut.length, r.bedient.length) - 1 });
  }
  funde.abgelaufen = abgelaufen;
  return funde;
}

function repoDateien() {
  return execFileSync('git', ['ls-files', '-z', '--', 'tests', 'tools'], { cwd: REPO, encoding: 'utf8', env: ohneGitUmgebung() })
    .split('\0').filter((f) => /\.(js|mjs|cjs)$/.test(f) && fs.existsSync(path.join(REPO, f)));
}
function amRepo() {
  return klassePruefen({ dateien: repoDateien(), lesen: (f) => fs.readFileSync(path.join(REPO, f), 'utf8') });
}

if (require.main === module) {
  const alle = process.argv.includes('--alle');
  const funde = amRepo();
  const offen = funde.filter((f) => !f.ausnahme);
  for (const f of alle ? funde : offen) {
    process.stdout.write(`${f.ausnahme ? 'ausgenommen' : 'FUND'}\t${f.datei}\tbaut: ${f.baut.join(' > ')}\tbedient: ${f.bedient.join(' > ')}\n`);
  }
  const warum = process.argv.indexOf('--warum');
  if (warum > 0) for (const f of funde.filter((x) => x.datei === process.argv[warum + 1])) process.stdout.write(`baut über:    ${f.bautSpur.join(' → ')}\nbedient über: ${f.bedientSpur.join(' → ')}\n`);
  if (process.argv.includes('--tiefe')) process.stdout.write(`tiefste abgelaufene Helferkette ${funde.abgelaufen.tiefe} (Grenze ${TIEFEN_GRENZE}): ${funde.abgelaufen.kette.join(' > ')}\n`);
  process.stdout.write(`Funde ${funde.length}, davon ausgenommen ${funde.length - offen.length}\n`);
  process.exit(offen.length ? 1 : 0);
}

module.exports = { TIEFEN_GRENZE, SCHNITT, BAUT_AUSSER_TESTFASSUNG, BAUT_IMMER, AUSNAHME_MARKE, AUSNAHME_NUR_BEI, aufrufe, klassePruefen, amRepo, baut, bedient, abschnitte, ohneHauptlauf, RUMPF };
