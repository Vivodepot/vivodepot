#!/usr/bin/env node
'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   speichermodell-pruefen.js — sagen alle Stellen dasselbe über das Speichern? (U2-ADR-474)

   Anlass: Befund B-01 der heuristischen Evaluation vom 02.10.2026. Schnellstart 4 sagte
   „speichert sich von selbst", Schnellstart 5 „Sichern Sie die Datei", das Bereichsende
   „gesichert erst, wenn Sie gesichert haben", und die Pille verwies auf einen Knopf
   „‚Als Datei sichern'", den es nicht gibt.

   Die Quelle ist der Kern, keine Liste von Sätzen: `SPEICHERMODELL_SAETZE` sagt je Stelle
   und je Modus (intern: die Ablage dieses Geräts speichert still; datei: nichts speichert
   sich selbst), welcher Text gilt. Dieses Werkzeug liest die Tabelle und die Aufrufstellen
   aus dem Quelltext und die Texte aus den Sprachmodulen. So läuft es auch gegen einen
   früheren Stand (`--commit`), dem die Tabelle fehlt; dort gilt, was die Aufrufstelle liest.

   Geprüft wird:
   (a) je Stelle und Modus: ein Satz im internen Modus sagt nicht, dass nichts gespeichert
       wird; ein Satz im Datei-Modus sagt nicht, dass es sich von selbst speichert. DE und EN.
   (b) die Stellen lesen ihren Satz über speicherSatz(), nicht als STRINGS.<schlüssel>.
   (c) jedes in Anführung zitierte Bedienwort eines Modell-Satzes ist eine Beschriftung, die
       es gibt, und kein {beschriftung:…} bleibt offen. Ausgenommen ist nur ein Zitat, das der Satz
       selbst als Beschriftung des Browsers ausweist („…“ des Browsers / browser’s “…”), etwa die
       Warnung vor „Seite speichern“: das ist kein Knopf dieser Anwendung.
   (d) Klassenwächter: kein Text in DE oder EN macht eine Speicher-Zusage, der nicht der
       Tabelle gehört. Neue Sätze dazu entstehen nur über das Modell.

   Aufruf:
     node tools/speichermodell-pruefen.js                 # dieser Baum
     node tools/speichermodell-pruefen.js --commit <rev>  # ein früherer Stand
   Ausgabe: je Befund eine Zeile, Exit 1 bei mindestens einem.
   ════════════════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const REPO = path.join(__dirname, '..');

// Eine Zusage, dass das Eingetragene von selbst gespeichert wird.
const MUSTER_AUTOMATISCH = [
  /speichert sich/i, /von selbst gespeichert/i, /wird (dort|sofort|automatisch) gespeichert/i,
  /kein eigener Sichern-Schritt/i, /automatisch gespeichert/i,
  /saves itself/i, /is stored there/i, /no separate save step/i, /saved automatically/i, /automatically saved/i,
];
// Eine Aussage, dass nichts von selbst gespeichert wird oder die Datei Pflicht ist.
const MUSTER_NICHT_AUTOMATISCH = [
  /solange dieses Fenster/i, /bis Sie das Fenster schließen/i, /until you close the window/i, /gesichert sind sie erst/i, /^Sichern Sie (die|Ihr)\b/i, /nicht selbst speichern/i,
  /as long as this window/i, /only saved once/i, /^Save (the|your)\b/i, /cannot save\b.*\bby itself/i,
];
// (c) Ein Zitat, das der Satz ausdrücklich dem Browser zuschreibt, ist keine Beschriftung dieser Anwendung.
const BROWSER_ZITAT_DAVOR = /browser[’']s\s*$/i;
const BROWSER_ZITAT_DANACH = /^\s*des Browsers\b/;
const ZITAT = /„([^“”"]+)[“”]|‚([^‘’']+)[‘’']|“([^”]+)”|‘([^’]+)’/g;

function kennung(schluessel) { return schluessel.indexOf(':') >= 0 ? schluessel : 'strings:' + schluessel + '.text'; }

function aufloesen(text, texte, tiefe) {
  if (typeof text !== 'string') return text;
  return text.replace(/\{beschriftung:([A-Za-z0-9_]+)\}/g, (voll, s) => {
    const ziel = texte['strings:' + s + '.text'];
    return (typeof ziel === 'string' && (tiefe || 0) < 3) ? aufloesen(ziel, texte, (tiefe || 0) + 1) : voll;
  }).replace(/\{marke\}/g, 'Vivodepot');
}

// SPEICHERMODELL_SAETZE aus dem Quelltext: { stelle: { intern, internRisiko?, datei } } oder null.
function tabelleLesen(quelle) {
  const a = quelle.indexOf('const SPEICHERMODELL_SAETZE = Object.freeze({');
  if (a < 0) return null;
  const e = quelle.indexOf('\n});', a);
  const tabelle = {};
  const zeile = /^\s*([A-Za-z]+):\s*Object\.freeze\(\{([^}]*)\}\)/gm;
  const block = quelle.slice(a, e);
  let m;
  while ((m = zeile.exec(block))) {
    const eintrag = {};
    for (const t of m[2].matchAll(/([A-Za-z]+):\s*'([^']+)'/g)) eintrag[t[1]] = t[2];
    tabelle[m[1]] = eintrag;
  }
  // Ein Schlüssel für beide Modi: `stelle: _speicherSatzBeide('schlüssel')`.
  for (const b of block.matchAll(/^\s*([A-Za-z]+):\s*_speicherSatzBeide\('([^']+)'\)/gm)) tabelle[b[1]] = { intern: b[2], datei: b[2] };
  return tabelle;
}

// Ein Ausdruck an einer Aufrufstelle → { intern: [schlüssel], datei: [schlüssel], direkt }.
function ausdruckAufloesen(ausdruck, tabelle) {
  const ss = /speicherSatz\('([A-Za-z]+)'\)/.exec(ausdruck);
  if (ss) {
    const t = tabelle && tabelle[ss[1]];
    if (!t) return { fehlt: ss[1] };
    return { intern: [t.intern, t.internRisiko].filter(Boolean), datei: [t.datei], direkt: false };
  }
  const st = /STRINGS\.([A-Za-z0-9_]+)/.exec(ausdruck);
  if (st) return { intern: [st[1]], datei: [st[1]], direkt: true };
  return null;
}

// Die Aufrufstellen, aus dem Quelltext. Jede Stelle trägt die Ausdrücke, die dort einen Satz lesen.
function stellenLesen(quelle) {
  const stellen = [];
  const ss = quelle.indexOf("'<ol class=\"einst-schnellstart-schritte\">'");
  if (ss >= 0) {
    const li = quelle.slice(ss, quelle.indexOf("'</ol>'", ss)).split('\n').filter((z) => z.indexOf("'<li>'") >= 0);
    if (li[3]) stellen.push({ stelle: 'Schnellstart 4', ausdruecke: [li[3]] });
    if (li[4]) stellen.push({ stelle: 'Schnellstart 5', ausdruecke: [li[4]] });
  }
  for (const m of quelle.matchAll(/class="pause-erlaubnis">' \+ ([^\n]+)/g)) stellen.push({ stelle: 'Bereichsende', ausdruecke: [m[1]] });
  const fw = /m\.wiederholt \? ([^:]+):/.exec(quelle);
  if (fw) stellen.push({ stelle: 'Pille, wiederholter Fehlschlag', ausdruecke: [fw[1]] });
  const an = /function anlegenSpeicherHinweis\(\) \{([\s\S]*?)\n\}/.exec(quelle);
  if (an) {
    const koerper = an[1];
    if (/speicherSatz\('anlegen'\)/.test(koerper)) stellen.push({ stelle: 'Anlegen', ausdruecke: ["speicherSatz('anlegen')"] });
    else {
      // Vor U2-ADR-474: if (!internerSpeicherModus()) return STRINGS.<datei>; return … ? STRINGS.<risiko> : STRINGS.<ruhig>;
      const d = /if \(!internerSpeicherModus\(\)\) return STRINGS\.([A-Za-z0-9_]+)/.exec(koerper);
      const rest = [...koerper.slice(d ? d.index + d[0].length : 0).matchAll(/STRINGS\.([A-Za-z0-9_]+)/g)].map((x) => x[1]);
      stellen.push({ stelle: 'Anlegen', fest: { intern: rest, datei: d ? [d[1]] : rest }, direkt: true });
    }
  }
  return stellen;
}

function pruefe({ quelle, de, en }) {
  const befunde = [];
  const tabelle = tabelleLesen(quelle);
  if (!tabelle) befunde.push('(b) Kein Speichermodell im Kern: SPEICHERMODELL_SAETZE fehlt, jede Stelle liest ihren Satz selbst.');
  const sprachen = [['DE', de], ['EN', en]];
  const modellSchluessel = new Set();

  for (const st of stellenLesen(quelle)) {
    let zuordnung = st.fest ? { intern: st.fest.intern, datei: st.fest.datei, direkt: true } : null;
    for (const a of st.ausdruecke || []) {
      const z = ausdruckAufloesen(a, tabelle);
      if (z && z.fehlt) { befunde.push(`(b) ${st.stelle}: speicherSatz('${z.fehlt}') hat keine Zeile in SPEICHERMODELL_SAETZE.`); continue; }
      if (z) zuordnung = z;
    }
    if (!zuordnung) { befunde.push(`(b) ${st.stelle}: Ausdruck nicht erkannt.`); continue; }
    if (zuordnung.direkt && tabelle) befunde.push(`(b) ${st.stelle} liest STRINGS.${zuordnung.intern[0]} direkt statt über speicherSatz().`);
    for (const [modus, verboten, wort] of [['intern', MUSTER_NICHT_AUTOMATISCH, 'nichts speichere sich selbst'], ['datei', MUSTER_AUTOMATISCH, 'es speichere sich von selbst']]) {
      for (const s of zuordnung[modus]) {
        modellSchluessel.add(kennung(s));
        for (const [sprache, texte] of sprachen) {
          const text = aufloesen(texte[kennung(s)], texte);
          if (typeof text !== 'string') { befunde.push(`(a) ${st.stelle}, ${modus}, ${sprache}: ${kennung(s)} fehlt im Sprachmodul.`); continue; }
          if (verboten.some((r) => r.test(text))) befunde.push(`(a) ${st.stelle}, Modus ${modus}, ${sprache}: ${kennung(s)} sagt, ${wort}: „${text.slice(0, 90)}“`);
        }
      }
    }
  }
  if (tabelle) for (const t of Object.values(tabelle)) for (const s of Object.values(t)) modellSchluessel.add(kennung(s));

  // (c) Zitate und offene Platzhalter in allen Modell-Sätzen.
  for (const [sprache, texte] of sprachen) {
    const beschriftungen = new Set(Object.entries(texte).filter(([k, v]) => /^strings:.*\.text$/.test(k) && typeof v === 'string').map(([, v]) => aufloesen(v, texte)));
    for (const k of modellSchluessel) {
      const text = aufloesen(texte[k], texte);
      if (typeof text !== 'string') continue;
      if (/\{beschriftung:/.test(text)) befunde.push(`(c) ${sprache} ${k}: Platzhalter ohne Ziel: „${text.slice(0, 90)}“`);
      for (const m of text.matchAll(ZITAT)) {
        const wort = (m[1] || m[2] || m[3] || m[4]).trim();
        if (BROWSER_ZITAT_DAVOR.test(text.slice(0, m.index)) || BROWSER_ZITAT_DANACH.test(text.slice(m.index + m[0].length))) continue;
        if (!beschriftungen.has(wort)) befunde.push(`(c) ${sprache} ${k}: zitiert „${wort}“, eine Beschriftung dieses Wortlauts gibt es nicht.`);
      }
    }
  }

  // (d) Klassenwächter: Speicher-Zusagen nur in Sätzen des Modells.
  if (tabelle) {
    for (const [sprache, texte] of sprachen) {
      for (const [k, v] of Object.entries(texte)) {
        if (typeof v !== 'string' || modellSchluessel.has(k)) continue;
        if (MUSTER_AUTOMATISCH.concat(MUSTER_NICHT_AUTOMATISCH).some((r) => r.test(v))) {
          befunde.push(`(d) ${sprache} ${k} macht eine Speicher-Zusage außerhalb des Modells: „${v.slice(0, 90)}“`);
        }
      }
    }
  }
  return { befunde, tabelle, modellSchluessel: [...modellSchluessel].sort() };
}

function ausBaum(repo) {
  return {
    quelle: fs.readFileSync(path.join(repo, 'vivodepot.html'), 'utf8'),
    de: JSON.parse(fs.readFileSync(path.join(repo, 'tools', 'textsatz-de-modul.json'), 'utf8')).texte,
    en: JSON.parse(fs.readFileSync(path.join(repo, 'tools', 'textsatz-en-modul.json'), 'utf8')).texte,
  };
}
function ausCommit(rev, repo) {
  const { ohneGitUmgebung } = require('./lib/ohne-git-umgebung.js');
  const zeigen = (p) => execFileSync('git', ['show', rev + ':' + p], { cwd: repo || REPO, env: ohneGitUmgebung(), encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  return {
    quelle: zeigen('vivodepot.html'),
    de: JSON.parse(zeigen('tools/textsatz-de-modul.json')).texte,
    en: JSON.parse(zeigen('tools/textsatz-en-modul.json')).texte,
  };
}

module.exports = { pruefe, ausBaum, ausCommit, tabelleLesen, stellenLesen, MUSTER_AUTOMATISCH, MUSTER_NICHT_AUTOMATISCH };

if (require.main === module) {
  const argv = process.argv.slice(2);
  const i = argv.indexOf('--commit');
  const eingabe = i >= 0 ? ausCommit(argv[i + 1]) : ausBaum(REPO);
  const { befunde } = pruefe(eingabe);
  for (const b of befunde) console.log(b);
  console.log(befunde.length ? `${befunde.length} Befund(e).` : 'Speichermodell: alle Stellen stimmen überein.');
  process.exitCode = befunde.length ? 1 : 0;
}
