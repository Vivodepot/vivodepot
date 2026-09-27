#!/usr/bin/env node
'use strict';
/* ═════════════════════════════════════════════════════════════════════
   invarianten-register-pruefen.js — Nachweis der Zuordnung „Invariante ↔ Prüfung" (Spezifikation 36.1d, 36.1e)
   ─────────────────────────────────────────────────────────────────────
   DIE FRAGE: welche Prüfung hält welche Invariante aus Abschnitt 34? 36.1 verlangt für jede Invariante eine maschinelle Prüfung,
   aber keinen Träger, der sagt, WELCHE. 36.1d verlangt ihn („an der Prüfung, an der Invariante oder in einem Register"); dieses Werkzeug
   ist der Wächter dazu: das Register (tools/invarianten-register.json) trägt je Invariante eine Zeile, und das Werkzeug prüft die Zeilen.

   DIE REGEL FÜR JEDE ZEILE (wörtlich): eine Zeile trägt eine Probe nur, wenn jemand sie GEÖFFNET hat und sagen kann, WELCHEN
   Satz der Invariante sie hält. Sonst trägt sie `ungeprueft`, und der Kandidat kommt als Hinweis DANEBEN, nie in die Probenspalte. Eine
   Stichwortsuche nennt Kandidaten, keine Belege („plausibler Kandidat" ist kein Beleg, 36.1c); ein Register, das sie überträgt, wäre eine
   Abdeckung, die niemand geprüft hat.

   DREI STATUS, nicht zwei (36.1a: eine Prüfung, die nur einen Teil ihres Geltungsbereichs kennt, erzeugt Deckung statt Nachweis):
     geprueft     mindestens eine geöffnete Probe hält die Invariante in einem benannten Geltungsbereich.
     teilweise    eine geöffnete Probe hält einen NAMENTLICH beschriebenen Teil; `luecke` sagt, was sie nicht hält.
     ungeprueft   keine geöffnete Probe hält einen Satz. `grund` sagt warum; `hinweise` nennen Kandidaten, die NICHT als Beleg gelten.
   Die Zahl der `ungeprueft` UND die der `teilweise` kann nur SINKEN: die Grundlinie im Register ist exakt (Ratsche). Wächst eine Zahl, ist das ein
   Fund; sinkt sie, MUSS die Grundlinie mitsinken, sonst hält sie einen Stand, den es nicht mehr gibt (36.2).

   WAS DAS WERKZEUG PRÜFT (ohne Argument, gegen die Dateien im Repo):
     · jede Zeile hat Status, Name und Satz; `geprueft`/`teilweise` haben Proben, `ungeprueft` hat keine und einen Grund;
     · jede Probe nennt Datei, Titel, den gehaltenen Satz (`haelt`), ihren Geltungsbereich und wer sie geöffnet hat; die Datei existiert und der
       Titel steht als test()/it() in ihr (eine umbenannte Probe macht die Zeile rot, nicht still veraltet);
     · die Zahlen stimmen mit der Grundlinie überein.
   WAS ES NUR MIT `--spezifikation <pfad>` ODER DER UMGEBUNGSVARIABLEN `SPEZIFIKATION_PFAD` PRÜFT: dass jede Invariante aus Abschnitt 34 der
   Spezifikation eine Zeile hat und keine Zeile ohne Invariante steht (dieselbe Bauform wie KAMPAGNE_AUS beim Kampagne-Gate). Die Spezifikation
   liegt außerhalb des Repos; ohne den Pfad meldet das Werkzeug diese Hälfte als UNGEMESSEN und sagt es in der Ausgabe. Ein Pfad, der nicht
   lesbar ist oder keinen Abschnitt 34 trägt, ist Exit 2 („nicht meßbar", 36.1b), nie grün. Solange die Spezifikation nicht im Repo liegt, kann
   diese Hälfte in jeder Umgebung ohne den Pfad (CI, fremde Maschine) nie mehr als UNGEMESSEN sein: der Gegenstand fehlt dort. Eine Kopie der
   Invariantenliste als Fixture wäre keine Abhilfe, sie könnte von der Spezifikation abdriften, und das soll der Wächter gerade prüfen.
   OFFENE FRAGEN (`offeneFrage` an einer Zeile) werden gezählt und genannt; sie sind kein Fund und kein Beleg.
   VERLETZT (`verletzt` an einer Zeile, Objekt mit `messung` und `nachsehen`): eine GEMESSENE Verletzung der Invariante im Kanon. Sie ist ein Befund über das
   Gerüst, kein Fehler des Registers: der Status bleibt `ungeprueft`/`teilweise` (keine Probe hält den Satz), eine `geprueft`-Zeile darf sie nicht tragen (das
   wäre ein Widerspruch). Die Zahl steht in der Grundlinie (`verletzt`, fehlt = 0) und kann nur SINKEN; ein neuer Befund ist ZUWACHS, ein behobener senkt die
   Grundlinie mit. `nachsehen` nennt den Befehl, der die Messung wiederholt (ein Ergebnis veraltet, ein Weg bleibt gültig).

   AUFRUF
     node tools/invarianten-register-pruefen.js                            → Register gegen das Repo; die Zeilen-Vollständigkeit ungemessen
     node tools/invarianten-register-pruefen.js --spezifikation <pfad>     → dazu: jede Invariante aus §34 hat eine Zeile (oder SPEZIFIKATION_PFAD=<pfad>)
     node tools/invarianten-register-pruefen.js --register <pfad> [--repo <ordner>]   → anderes Register (Proben)
     --json                                                                → maschinenlesbar
   Exit 0 = eingehalten · 1 = Fund · 2 = nicht meßbar. Die Suite fährt das Werkzeug zusätzlich gegen Fixtures (tests/fixtures/invarianten-register/),
   damit es nicht still blind wird.
   ═════════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const path = require('node:path');

const REPO = path.join(__dirname, '..');
const STANDARD_REGISTER = path.join(__dirname, 'invarianten-register.json');
const STATUS = Object.freeze(['geprueft', 'teilweise', 'ungeprueft']);
const MIN_SATZ = 30;       // `haelt`: ein Satz, kein Stichwort
const MIN_GRUND = 40;      // `grund`/`luecke`: eine Begründung, kein Wort
const MIN_BEREICH = 20;    // `geltungsbereich`

/* Die Invarianten aus dem Abschnitt der Spezifikation: `**34.1 Leer** — …`. Liefert [{ id, name }] oder null, wenn der Abschnitt fehlt. */
function invariantenAusSpezifikation(text, abschnitt) {
  const nr = String(abschnitt || '34');
  const kopf = new RegExp('^## ' + nr + ' ', 'm').exec(text);
  if (!kopf) return null;
  const rest = text.slice(kopf.index + kopf[0].length);
  const ende = rest.search(/^## /m);
  const abschnittText = ende < 0 ? rest : rest.slice(0, ende);   // nur dieser Abschnitt, bis zur nächsten Überschrift der obersten Ebene
  const re = new RegExp('^\\*\\*(' + nr + '\\.\\d+)\\s+([^*\\n]+?)\\*\\*', 'gm');
  const raus = [];
  let m;
  while ((m = re.exec(abschnittText))) raus.push({ id: m[1], name: m[2].trim() });
  return raus.length ? raus : null;
}

function testTitelInDatei(text, titel) {
  for (const q of ['\'', '"', '`']) {
    if (text.includes('test(' + q + titel) || text.includes('it(' + q + titel)) return true;
  }
  return false;
}

const nichtLeer = (s, min) => typeof s === 'string' && s.trim().length >= (min || 1);

function zeilePruefen(z, repo, fehler) {
  const wo = 'Zeile ' + (z && z.id);
  if (!z || typeof z !== 'object') { fehler.push('eine Zeile ist kein Objekt'); return; }
  if (!/^\d+\.\d+$/.test(String(z.id))) fehler.push(wo + ': `id` fehlt oder hat nicht die Form 34.7');
  if (!nichtLeer(z.name)) fehler.push(wo + ': `name` fehlt');
  if (!nichtLeer(z.satz, MIN_SATZ)) fehler.push(wo + ': `satz` fehlt (die Invariante in einem Satz, mindestens ' + MIN_SATZ + ' Zeichen)');
  if (!STATUS.includes(z.status)) { fehler.push(wo + ': `status` muss eines von ' + STATUS.join('/') + ' sein'); return; }
  if (z.verletzt !== undefined) {
    if (z.status === 'geprueft') fehler.push(wo + ': `verletzt` an einer `geprueft`-Zeile — eine gemessene Verletzung und ein Beleg schließen sich aus');
    if (!z.verletzt || typeof z.verletzt !== 'object' || !nichtLeer(z.verletzt.messung, MIN_GRUND)) fehler.push(wo + ': `verletzt.messung` fehlt (was wurde gemessen, mindestens ' + MIN_GRUND + ' Zeichen)');
    if (!z.verletzt || typeof z.verletzt !== 'object' || !nichtLeer(z.verletzt.nachsehen, 10)) fehler.push(wo + ': `verletzt.nachsehen` fehlt (der Befehl, der die Messung wiederholt)');
  }
  const proben = Array.isArray(z.proben) ? z.proben : [];
  if (z.status === 'ungeprueft') {
    if (proben.length) fehler.push(wo + ': `ungeprueft` trägt keine Probe in der Probenspalte — ein Kandidat gehört in `hinweise`');
    if (!nichtLeer(z.grund, MIN_GRUND)) fehler.push(wo + ': `ungeprueft` braucht einen `grund` (mindestens ' + MIN_GRUND + ' Zeichen)');
    return;
  }
  if (!proben.length) fehler.push(wo + ': `' + z.status + '` braucht mindestens eine Probe');
  if (z.status === 'teilweise' && !nichtLeer(z.luecke, MIN_GRUND)) fehler.push(wo + ': `teilweise` braucht eine `luecke` — was die Probe NICHT hält (mindestens ' + MIN_GRUND + ' Zeichen)');
  if (!nichtLeer(z.geoeffnet, 10)) fehler.push(wo + ': `geoeffnet` fehlt (wer hat die Probe wann geöffnet)');
  proben.forEach((p, i) => {
    const pw = wo + ' Probe ' + (i + 1);
    if (!p || typeof p !== 'object') { fehler.push(pw + ': kein Objekt'); return; }
    if (!nichtLeer(p.pfad) || !nichtLeer(p.test)) { fehler.push(pw + ': `pfad` und `test` (Titel) fehlen'); return; }
    if (!nichtLeer(p.haelt, MIN_SATZ)) fehler.push(pw + ': `haelt` fehlt — WELCHEN Satz der Invariante hält sie? (mindestens ' + MIN_SATZ + ' Zeichen)');
    if (!nichtLeer(p.geltungsbereich, MIN_BEREICH)) fehler.push(pw + ': `geltungsbereich` fehlt (36.1a)');
    const datei = path.join(repo, p.pfad);
    if (!fs.existsSync(datei)) { fehler.push(pw + ': ' + p.pfad + ' existiert nicht'); return; }
    if (!testTitelInDatei(fs.readFileSync(datei, 'utf8'), p.test)) fehler.push(pw + ': der Titel „' + p.test + '" steht nicht als test()/it() in ' + p.pfad + ' — umbenannt oder entfernt?');
  });
}

/* pruefen(register, opts) → { fehler, zaehlung, ungemessen }
   opts.repo               Wurzel, gegen die die Probendateien aufgelöst werden (Vorgabe: dieses Repo)
   opts.spezifikationText  Text der Spezifikation, oder undefined (dann bleibt die Zeilen-Vollständigkeit ungemessen)
   opts.abschnitt          Abschnittsnummer (Vorgabe '34') */
function pruefen(register, opts) {
  const o = opts || {};
  const repo = o.repo || REPO;
  const fehler = [];
  const ungemessen = [];
  const zeilen = register && Array.isArray(register.invarianten) ? register.invarianten : null;
  if (!zeilen || !zeilen.length) {
    return { fehler: ['das Register trägt keine `invarianten`'], zaehlung: { geprueft: 0, teilweise: 0, ungeprueft: 0 }, ungemessen, offeneFragen: [], verletzt: [] };
  }
  const ids = new Set();
  for (const z of zeilen) {
    if (z && ids.has(z.id)) fehler.push('Zeile ' + z.id + ' steht zweimal im Register');
    if (z) ids.add(z.id);
    zeilePruefen(z, repo, fehler);
  }
  const zaehlung = { geprueft: 0, teilweise: 0, ungeprueft: 0 };
  for (const z of zeilen) if (z && zaehlung[z.status] !== undefined) zaehlung[z.status] += 1;
  const verletzt = zeilen.filter((z) => z && z.verletzt !== undefined).map((z) => z.id);

  /* Die Ratsche: exakt, nicht „höchstens" (36.2 — eine Obergrenze oberhalb des Standes sichert nichts zu). */
  const g = register.grundlinie;
  if (!g || !Number.isInteger(g.ungeprueft) || !Number.isInteger(g.teilweise)) {
    fehler.push('die `grundlinie` fehlt oder trägt keine ganzen Zahlen für `ungeprueft` und `teilweise`');
  } else {
    for (const k of ['ungeprueft', 'teilweise']) {
      if (zaehlung[k] > g[k]) fehler.push('ZUWACHS bei `' + k + '`: ' + zaehlung[k] + ' Zeilen, Grundlinie ' + g[k] + ' — die Zahl kann nur sinken');
      else if (zaehlung[k] < g[k]) fehler.push('`' + k + '` ist auf ' + zaehlung[k] + ' gesunken, die Grundlinie steht bei ' + g[k] + ' — Grundlinie senken (sonst hält sie einen Stand, den es nicht mehr gibt)');
    }
    const gv = g.verletzt === undefined ? 0 : g.verletzt;
    if (!Number.isInteger(gv)) fehler.push('`grundlinie.verletzt` ist keine ganze Zahl');
    else if (verletzt.length > gv) fehler.push('ZUWACHS bei `verletzt`: ' + verletzt.length + ' Zeilen (' + verletzt.join(', ') + '), Grundlinie ' + gv + ' — ein neuer Befund; er wird in der Grundlinie bewusst geführt oder behoben');
    else if (verletzt.length < gv) fehler.push('`verletzt` ist auf ' + verletzt.length + ' gesunken, die Grundlinie steht bei ' + gv + ' — Grundlinie senken (sonst hält sie einen Stand, den es nicht mehr gibt)');
  }

  if (o.spezifikationText === undefined) {
    ungemessen.push('Zeilen-Vollständigkeit gegen §' + (o.abschnitt || '34') + ': UNGEMESSEN (weder --spezifikation noch SPEZIFIKATION_PFAD) — ob jede Invariante der Spezifikation eine Zeile hat, ist nicht geprüft');
  } else {
    const inv = invariantenAusSpezifikation(o.spezifikationText, o.abschnitt);
    if (!inv) {
      fehler.push('NICHT MESSBAR: die Spezifikation trägt keinen Abschnitt ' + (o.abschnitt || '34') + ' mit Invarianten');
    } else {
      const inReg = new Map(zeilen.filter(Boolean).map((z) => [z.id, z]));
      const inSpez = new Map(inv.map((i) => [i.id, i]));
      for (const i of inv) {
        const z = inReg.get(i.id);
        if (!z) fehler.push('die Invariante ' + i.id + ' („' + i.name + '") hat keine Zeile im Register');
        else if (String(z.name).trim() !== i.name) fehler.push('Zeile ' + i.id + ' heißt „' + z.name + '", die Spezifikation nennt sie „' + i.name + '"');
      }
      for (const id of inReg.keys()) if (!inSpez.has(id)) fehler.push('Zeile ' + id + ' steht im Register, die Spezifikation kennt diese Invariante nicht');
    }
  }
  const offeneFragen = zeilen.filter((z) => z && nichtLeer(z.offeneFrage)).map((z) => z.id);
  return { fehler, zaehlung, ungemessen, offeneFragen, verletzt };
}

function main(argv) {
  const arg = (n) => { const i = argv.indexOf('--' + n); return i >= 0 ? argv[i + 1] : undefined; };
  const json = argv.includes('--json');
  const registerPfad = arg('register') ? path.resolve(arg('register')) : STANDARD_REGISTER;
  const repo = arg('repo') ? path.resolve(arg('repo')) : REPO;
  const spezPfad = arg('spezifikation') ? path.resolve(arg('spezifikation'))
    : (process.env.SPEZIFIKATION_PFAD ? path.resolve(process.env.SPEZIFIKATION_PFAD) : null);
  let register;
  try { register = JSON.parse(fs.readFileSync(registerPfad, 'utf8')); } catch (e) {
    console.log('ROT — NICHT MESSBAR: das Register ist nicht lesbar (' + registerPfad + '): ' + e.message);
    return 2;
  }
  let spezifikationText;
  if (spezPfad) {
    try { spezifikationText = fs.readFileSync(spezPfad, 'utf8'); } catch (e) {
      console.log('ROT — NICHT MESSBAR: die Spezifikation ist nicht lesbar (' + spezPfad + '): ' + e.message);
      return 2;
    }
  }
  const r = pruefen(register, { repo, spezifikationText });
  const nichtMessbar = r.fehler.some((f) => f.startsWith('NICHT MESSBAR'));
  if (json) console.log(JSON.stringify(r, null, 2));
  else {
    console.log('invarianten-register: ' + (register.invarianten || []).length + ' Zeilen · Achse Probe (jede Zeile genau einmal): geprueft ' + r.zaehlung.geprueft + ' · teilweise ' + r.zaehlung.teilweise + ' · ungeprueft ' + r.zaehlung.ungeprueft + ' = ' + (r.zaehlung.geprueft + r.zaehlung.teilweise + r.zaehlung.ungeprueft));
    for (const u of r.ungemessen) console.log('  ' + u);
    if (r.offeneFragen.length) console.log('  offene Fragen (kein Fund, kein Beleg): ' + r.offeneFragen.join(', '));
    if (r.verletzt.length) console.log('  Achse Befund (quer zur Achse Probe, keine vierte Sorte): verletzt ' + r.verletzt.length + ' — ' + r.verletzt.map((id) => id + ' (auf der Achse Probe: ' + (register.invarianten.find((z) => z.id === id) || {}).status + ')').join(', '));
    for (const f of r.fehler) console.log('  ROT ' + f);
    if (!r.fehler.length) console.log('  OK — jede Zeile trägt eine geöffnete Probe oder `ungeprueft` mit Grund; die Zahlen stehen auf der Grundlinie.');
  }
  return r.fehler.length ? (nichtMessbar ? 2 : 1) : 0;
}

if (require.main === module) process.exitCode = main(process.argv.slice(2));

module.exports = { pruefen, invariantenAusSpezifikation, testTitelInDatei, STANDARD_REGISTER, STATUS };
