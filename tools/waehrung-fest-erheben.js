#!/usr/bin/env node
'use strict';
/* ═════════════════════════════════════════════════════════════════════════════════════════════
   waehrung-fest-erheben.js — wo setzt ein ausgelieferter Code eine Währung, die weder aus einem
   Template noch aus einem Register kommt? (Befund S1, 03.10.2026)
   ─────────────────────────────────────────────────────────────────────────────────────────────
   ANLASS: Die Achsen-Erhebung (tools/achsen-kopplung-erheben.js, 03.10.2026, Befund S1 =
   WAEHRUNG-FEST-EUR in der Befund-Ratsche) fand „EUR“ im Gerüst. Nachgemessen schrieb der ELSTER-Import ' EUR'
   hinter jeden Betrag ohne Währung, fest im Code, und die eingebaute Studio-Vorlage „notariat“ trug
   den Feldnamen 'Vermögenswert (EUR)'. Eine Währung gehört zum Rechtsraum bzw. zum Format, nie zum
   Gerüst: es gibt ein Gerüst und Templates, keine Länder-Ausgabe (entschieden am 03.10.2026).

   WAS ES ZÄHLT: jedes Zeichenketten-Literal in einem ausführbaren <script>-Block, das das Wort EUR
   enthält, auch als Teil (' EUR', '(EUR)'), außerhalb der Marker-Regionen NAME:BEGIN … NAME:END,
   ohne Kommentare und ohne JSON-Nutzlast. Dieselbe Literal- und Regionen-Erkennung wie der
   Gerüst-Wächter (tools/geruest-waechter-pruefen.js, literaleMessen). Jeder Fund trägt eine Art:

     fest               zählt — eine Währung im Gerüst oder im Erzeuger, die niemand gewählt hat.
     format-definition  zählt nicht — `waehrung: '…'` an einem Eintrag von IMPORT_FORMATE bzw.
                        EXPORT_FORMATE: die Währung gehört zum Format (ELSTER ist ein deutsches
                        Steuerformat), benannt und registriert, wie `rechtsraum` (U2-ADR-255).
     codeliste          zählt nicht — ein `code:` in der Inline-Kopie des Codelisten-Moduls (VD_CODE_LISTEN im Studio),
                        das in code-listen/iso4217.json steht; Drift gehalten von tests/codeliste-iso4217.test.js.
     template-code      zählt nicht — ein `code:` an einem Feld, dessen Zeile `codeSystem` mit GENAU der ISO-4217-
                        Kennung der Codeliste erklärt, und nur, wenn der Code in der Liste steht. Ein nacktes EUR
                        daneben (Feldname, Anzeige) bleibt fest; eine freie Schreibweise der Kennung ebenso.
     textsatz-regel     zählt nicht — `waehrung` in TEXTSATZ_REGELN_EINGEBAUT. Seit U2-ADR-480 steht
                        dort keiner mehr (Kern und Lese-App); die Probe verlangt 0 Funde dieser Art.

   LESER: jede Stelle, die TEXTSATZ_REGELN_EINGEBAUT.waehrung bzw. textsatzRegeln().waehrung liest
   (direkt, über eine Variable, die eines von beiden hält, als ['waehrung'] oder destrukturiert) —
   außerhalb von `textsatzWaehrung()`, der einzigen Lesestelle (U2-ADR-480). Soll: 0.

   POSITIVKONTROLLE, in jedem Lauf und je Dokument: dasselbe Dokument mit einem gepflanzten festen
   ' EUR' und einem gepflanzten Leser. Beide müssen genau um eins steigen, sonst Exit 2 — „0 Funde“
   hieße sonst womöglich nur, dass das Werkzeug an diesem Dokument nichts mehr sieht.

   Aufruf:
     node tools/waehrung-fest-erheben.js                          die Fixtures (Selbstprobe)
     node tools/waehrung-fest-erheben.js --dokument <pfad> …      ein oder mehrere Dokumente (.html/.js)
     node tools/waehrung-fest-erheben.js --ausgeliefert           die vier Produkte (konfektioniert)
                                                                  und die Erzeuger (ERZEUGER)
     … --aus x.json                                               Ergebnis als JSON in eine Datei
   Probe: tests/waehrung-fest.test.js, Fixture tests/fixtures/waehrung-fest/.
   ═════════════════════════════════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { literaleMessen, grundlinieLesen } = require('./geruest-waechter-pruefen.js');

const REPO = path.join(__dirname, '..');
const FIXTURE_ORDNER = path.join(REPO, 'tests', 'fixtures', 'waehrung-fest');
const GRUNDLINIE = path.join(__dirname, 'waehrung-fest-grundlinie.json');

/* Die Erzeuger: was neben den Produkten ausgeliefert wird bzw. ausgelieferten Inhalt erzeugt. */
const ERZEUGER = Object.freeze([
  'vivodepot-studio.html', 'vivodepot-lesen.html', 'vivodepot-vc-issuer.html',
  'vivodepot-schluessel-teilen.html', 'share/empfangen.html',
]);
/* NICHT gezählt: tools/**.js. Was dort EUR nennt, sind Template-Quellen (tools/textsatz-*-daten.js, aus denen die Module
   entstehen), Mess- und Prüfwerkzeuge und Ausnahmelisten — nichts davon wird ausgeliefert. Gemessen am 03.10.2026: 43 Literale,
   keines in einem Ausgabeweg. Ein Erzeuger, der ausgeliefertes HTML schreibt, gehört in ERZEUGER oder ist ein Produkt. */

const EUR = /\bEUR\b/;
const FORMAT_REGISTER = ['IMPORT_FORMATE', 'EXPORT_FORMATE'];
const REGELN = 'TEXTSATZ_REGELN_EINGEBAUT';
/* Die Inline-Kopie des Codelisten-Moduls im Studio (im Kern ist es die generierte Region CODE-LISTEN, die schon als
   Region zählt). Drift gegen die Quelle: tests/codeliste-iso4217.test.js. */
const CODELISTEN_KOPIE = 'VD_CODE_LISTEN';
/* Die ISO-4217-Kennung, die das Codelisten-Modul führt — aus der Quelle gelesen, nie hier geschrieben. */
const ISO4217 = (() => {
  const q = JSON.parse(fs.readFileSync(path.join(REPO, 'code-listen', 'iso4217.json'), 'utf8'));
  return { uri: q.uri, codes: new Set((q.daten || []).map((d) => d.code)) };
})();

function zeilenIndex(text) {
  const anfang = [0];
  for (let i = text.indexOf('\n'); i >= 0; i = text.indexOf('\n', i + 1)) anfang.push(i + 1);
  return (ort) => {
    let lo = 0; let hi = anfang.length - 1;
    while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (anfang[mid] <= ort) lo = mid; else hi = mid - 1; }
    return lo + 1;
  };
}

function nutzlastBloecke(text) {
  const raus = [];
  for (let pos = 0; ;) {
    const a = text.indexOf('<script', pos);
    if (a < 0) break;
    const g = text.indexOf('>', a);
    if (g < 0) break;
    let e = text.indexOf('</script', g);
    if (e < 0) e = text.length;
    if (/type\s*=\s*["'](application\/(ld\+)?json|text\/plain)/.test(text.slice(a, g + 1))) raus.push([g + 1, e]);
    pos = e + 1;
  }
  return raus;
}

/* Spanne einer Top-Level-Konstante `const NAME = …` bis zur ersten Zeile, die mit `]);` bzw. `});` beginnt. */
function konstantenSpanne(text, name) {
  const m = new RegExp('\\n(const|let|var)\\s+' + name + '\\s*=').exec(text);
  if (!m) return null;
  const ende = /\n(\]\)|\}\));?/g;
  ende.lastIndex = m.index + 1;
  const e = ende.exec(text);
  return [m.index, e ? e.index + e[0].length : text.length];
}

function artVon(text, ort, spannen, wert) {
  const zeilenAnfang = text.lastIndexOf('\n', ort) + 1;
  const zeile = text.slice(zeilenAnfang, text.indexOf('\n', ort) < 0 ? text.length : text.indexOf('\n', ort));
  /* Ein Code ist nur der Wert eines `code:`-Schlüssels — ein nacktes 'EUR' daneben (anzeige, feldname) bleibt fest. */
  const istCode = /\bcode\s*:\s*['"]?$/.test(text.slice(zeilenAnfang, ort).replace(/['"]$/, '')) || /\bcode\s*:\s*$/.test(text.slice(zeilenAnfang, ort - 1));
  const kopie = spannen.find(([n]) => n === CODELISTEN_KOPIE);
  /* In der Kopie des Codelisten-Moduls ist die Anzeige der Code selbst (Option iii, 04.10.2026): ein Eintrag
     `{ code: 'EUR', anzeige: 'EUR' }` zählt mit beiden Literalen als Codeliste — der Name kommt aus dem Sprachmodul. */
  if (ISO4217.codes.has(wert) && kopie && kopie[1] && ort >= kopie[1][0] && ort <= kopie[1][1]
    && new RegExp('\\bcode\\s*:\\s*[\'"]' + wert + '[\'"]').test(zeile)) return 'codeliste';
  if (istCode && ISO4217.codes.has(wert)) {
    /* Template-Code: dieselbe Zeile erklärt genau die ISO-4217-Kennung der Codeliste. Eine freie Schreibweise zählt nicht. */
    const cs = /\bcodeSystem\s*:\s*['"]([^'"]*)['"]/.exec(zeile);
    if (cs && cs[1] === ISO4217.uri) return 'template-code';
  }
  const istWaehrungsSchluessel = /^\s*waehrung\s*:\s*['"][A-Z]{3}['"]\s*,?\s*(\/\/.*)?$/.test(zeile);
  if (istWaehrungsSchluessel) {
    for (const [name, s] of spannen) {
      if (s && ort >= s[0] && ort <= s[1]) return name === REGELN ? 'textsatz-regel' : 'format-definition';
    }
  }
  return 'fest';
}

/* Leser von TEXTSATZ_REGELN_EINGEBAUT.waehrung — auf Code-Zeilen, Kommentarzeilen ausgenommen. */
function leserFinden(text) {
  const zeilen = text.split('\n');
  const code = zeilen.map((z) => (/^\s*(\/\/|\/\*|\*)/.test(z) ? '' : z.replace(/\/\/.*$/, '')));
  const quelle = '(?:textsatzRegeln\\(\\)|' + REGELN + '|Object\\.assign\\(\\{\\},\\s*' + REGELN + '\\))';
  const aliase = new Set();
  const aliasRe = new RegExp('\\b(?:const|let|var)\\s+(\\w+)\\s*=\\s*' + quelle);
  for (const z of code) { const m = aliasRe.exec(z); if (m) aliase.add(m[1]); }
  const ziele = [quelle].concat([...aliase].map((a) => '\\b' + a));
  const direkt = new RegExp('(?:' + ziele.join('|') + ')\\s*(?:\\.\\s*waehrung\\b|\\[\\s*[\'"]waehrung[\'"]\\s*\\])');
  const destrukt = new RegExp('\\{[^}]*\\bwaehrung\\b[^}]*\\}\\s*=\\s*(?:' + ziele.join('|') + ')');
  /* Die eine Lesestelle (U2-ADR-480): innerhalb von `function textsatzWaehrung() { … }` ist das Lesen der Zweck. */
  const erlaubt = [];
  const kopf = /^\s*function\s+textsatzWaehrung\s*\(/;
  code.forEach((z, i) => {
    if (!kopf.test(z)) return;
    let j = i; while (j < code.length && !/^\}/.test(code[j])) j++;
    erlaubt.push([i, j]);
  });
  const raus = [];
  code.forEach((z, i) => {
    if (erlaubt.some(([a, b]) => i >= a && i <= b)) return;
    if (direkt.test(z) || destrukt.test(z)) raus.push({ zeile: i + 1, auszug: zeilen[i].trim().slice(0, 160) });
  });
  return raus;
}

/**
 * @param {string} text  ein HTML-Dokument (oder ein Skript, in <script> gehüllt)
 * @returns {{funde:object[], fest:number, leser:object[]}}
 */
function erheben(text, optionen = {}) {
  const fremdcode = optionen.fremdcode !== undefined ? optionen.fremdcode : (grundlinieLesen().fremdcode || []);
  const alle = [];
  literaleMessen(text, { fremdcode, sammeln: (x) => alle.push(x) });
  const nutzlast = nutzlastBloecke(text);
  const zeileVon = zeilenIndex(text);
  const spannen = [REGELN, CODELISTEN_KOPIE].concat(FORMAT_REGISTER).map((n) => [n, konstantenSpanne(text, n)]);
  const funde = [];
  for (const l of alle) {
    if (l.region || !EUR.test(l.wert)) continue;
    if (nutzlast.some(([a, b]) => l.ort >= a && l.ort <= b)) continue;
    funde.push({ zeile: zeileVon(l.ort), wert: l.wert, art: artVon(text, l.ort, spannen, l.wert) });
  }
  return { funde, fest: funde.filter((f) => f.art === 'fest').length, leser: leserFinden(text) };
}

/* Ein Skript wird in einen <script>-Block gehüllt. Ein '<script', '</script' oder '</html>' IM Skript (Erzeuger schreiben
   HTML) würde den Block für die Erkennung beenden bzw. die Positivkontrolle in ein Literal pflanzen — darum großgeschrieben;
   der Code bleibt übersetzbar, Zeilen und das Wort EUR bleiben unberührt. */
function alsDokument(datei, text) {
  if (!/\.m?js$/.test(datei)) return text;
  return '<script>\n' + text.replace(/<(\/?)script/g, '<$1Script').replace(/<\/html>/g, '</Html>') + '\n</script>\n';
}

/* Liefert, was am gepflanzten Fall NICHT um genau eins steigt — leer heißt: die Kontrolle trägt. */
function positivkontrolle(text, erhebenFn = erheben) {
  const vorher = erhebenFn(text);
  const block = '\n<script>\nfunction positivkontrolleWaehrung() {\n  const pkBetrag = 1 + \' EUR\';\n'
    + '  return textsatzRegeln().waehrung;\n}\n</script>\n';
  const i = text.lastIndexOf('</html>');
  const nachher = erhebenFn(i < 0 ? text + block : text.slice(0, i) + block + text.slice(i));
  const raus = [];
  if (nachher.fest !== vorher.fest + 1) raus.push('fest');
  if (nachher.leser.length !== vorher.leser.length + 1) raus.push('leser');
  return raus;
}

function ausgelieferteDokumente() {
  const { konfektionieren } = require('./produkt-konfektionieren.js');
  const { PRODUKTE, modulDateienFuer } = require('./lib/vier-produkte.js');
  const raus = [];
  for (const p of PRODUKTE) {
    const ziel = fs.mkdtempSync(path.join(os.tmpdir(), 'vd-waehrung-' + p.slug + '-'));
    try {
      const r = konfektionieren({
        ziel, slug: p.slug, modulauswahl: [],
        vorDepotKonfigurationInhaltFn: () => 'window.__vorDepotKonfiguration = [];\n',
        unsignierteModulDateien: modulDateienFuer(p),
      });
      for (const f of fs.readdirSync(r.ordner).filter((x) => x.endsWith('.html')).sort()) {
        raus.push({ name: p.slug + '/' + f, text: fs.readFileSync(path.join(r.ordner, f), 'utf8') });
      }
    } finally { fs.rmSync(ziel, { recursive: true, force: true }); }
  }
  for (const e of ERZEUGER) raus.push({ name: e, text: fs.readFileSync(path.join(REPO, e), 'utf8') });
  return raus;
}

function fixtureDokumente() {
  return fs.readdirSync(FIXTURE_ORDNER).filter((f) => f.endsWith('.html')).sort()
    .map((f) => ({ name: path.relative(REPO, path.join(FIXTURE_ORDNER, f)), text: fs.readFileSync(path.join(FIXTURE_ORDNER, f), 'utf8') }));
}

/* Ein Lauf über eine Menge Dokumente. Wirft, wenn die Positivkontrolle an einem Dokument nicht trägt. */
function lauf(dokumente, optionen = {}) {
  /* Gezählt wird je STELLE, nicht je Kopie: dieselbe Zeile im selben Dokument (die vier Produkte tragen denselben Kern)
     ist eine Stelle. Schlüssel: Dateiname ohne Produkt-Ordner, Literal, Zeileninhalt. */
  const festStellen = new Set(); const leserStellen = new Set();
  const ergebnis = { dokumente: [], fest: 0, leser: 0 };
  for (const d of dokumente) {
    const traegtNicht = positivkontrolle(d.text, (t) => erheben(t, optionen));
    if (traegtNicht.length) {
      const err = new Error('Positivkontrolle trägt nicht an ' + d.name + ' für ' + traegtNicht.join(', '));
      err.positivkontrolle = true;
      throw err;
    }
    const r = erheben(d.text, optionen);
    const datei = path.basename(d.name);
    const zeilen = d.text.split('\n');
    for (const f of r.funde) if (f.art === 'fest') festStellen.add(datei + '\u0000' + f.wert + '\u0000' + zeilen[f.zeile - 1].trim());
    for (const l of r.leser) leserStellen.add(datei + '\u0000' + l.auszug);
    if (r.funde.length || r.leser.length) ergebnis.dokumente.push({ name: d.name, funde: r.funde, leser: r.leser });
  }
  ergebnis.fest = festStellen.size;
  ergebnis.leser = leserStellen.size;
  return ergebnis;
}

function argumente(name) {
  const raus = [];
  process.argv.forEach((a, i) => { if (a === name && process.argv[i + 1]) raus.push(process.argv[i + 1]); });
  return raus;
}

function main() {
  const genannt = argumente('--dokument');
  let dokumente;
  if (process.argv.includes('--ausgeliefert')) dokumente = ausgelieferteDokumente();
  else if (genannt.length) dokumente = genannt.map((p) => ({ name: p, text: alsDokument(p, fs.readFileSync(p, 'utf8')) }));
  else dokumente = fixtureDokumente();
  let e;
  try { e = lauf(dokumente); } catch (err) {
    if (!err.positivkontrolle) throw err;
    console.error('[waehrung-fest] ABBRUCH: ' + err.message + ' — die Zahlen sagen nichts.');
    process.exit(2);
  }
  const aus = argumente('--aus')[0];
  if (aus) fs.writeFileSync(aus, JSON.stringify(e, null, 2) + '\n');
  console.log('[waehrung-fest] ' + dokumente.length + ' Dokumente: fest ' + e.fest + ', Leser des eingebauten Werts '
    + e.leser + '; Positivkontrolle trägt' + (aus ? ' → ' + aus : ''));
  for (const d of e.dokumente) {
    for (const f of d.funde) console.log('  ' + d.name + ':' + f.zeile + '  ' + f.art + '  ' + JSON.stringify(f.wert));
    for (const l of d.leser) console.log('  ' + d.name + ':' + l.zeile + '  leser  ' + l.auszug);
  }
}

if (require.main === module) main();

module.exports = { erheben, lauf, positivkontrolle, leserFinden, alsDokument, ausgelieferteDokumente, fixtureDokumente, ERZEUGER, GRUNDLINIE };
