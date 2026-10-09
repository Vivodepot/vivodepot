#!/usr/bin/env node
'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   abgeloeste-farben-pruefen.js — „Die abgelöste Farbe, und
   SITUATIONEN zu Ende" (17.08.2026), Zug 1a.
   ────────────────────────────────────────────────────────────────────────────
   DER ZÄHLGEGENSTAND (§7): **Hex-Farbwerte, die eine Entscheidung abgelöst hat**
   und die in einer der AUSGELIEFERTEN ANWENDUNGEN noch im CODE stehen (seit dem
   17.08.2026 sind es vier — s. die Liste unten).

   WARUM NACH DEM WERT UND NICHT NACH DEM NAMEN GESUCHT WIRD — das ist der ganze
   Grund für dieses Werkzeug: `vivodepot-lesen.html` trug `--akzent: #3d5a2a`,
   bitgenau den abgelösten `--forest`-Wert, elf Tage lang unbemerkt. Jede Suche
   nach „forest" ging daran vorbei, weil der Wert unter einem ANDEREN NAMEN
   überlebt hatte. Ein Name kann umbenannt werden; der Wert bleibt derselbe.

   KOMMENTARE ZÄHLEN NICHT. Ein Kommentar, der einen abgelösten Wert NENNT
   („trug bis 17.08. #3d5a2a"), ist Dokumentation und genau erwünscht — er ist
   die Erklärung, warum der Wert fort ist. Kommentare werden vor der Suche
   längentreu maskiert (`tools/textsatz-umstellen.js#_maskiereKommentare`,
   dieselbe Mechanik wie bei der Textsatz-Ratsche).

   WAS BIS 02.10.2026 OHNE TOKEN BLIEB (Nachtrag „Alles anpassbar", 17.08.2026) — drei
   Literale galten als RUECKFALLWERTE INNERHALB von `var()` und darum als tokenisiert:
   `var(--bg, #f4f6f4)`, `var(--card, #fff)` und `var(--line, #d8ddd6)` an den Dokument-
   Overlays. Gemessen am 02.10.2026 (U2-ADR-473, v894): `--bg` und `--card` definiert der Kern
   NIRGENDS — der Rueckfall war also der gelebte Wert, kein Schutz. Sie heissen jetzt
   `--dok-grund` und `--dok-leiste`; der `--line`-Rueckfall ist entfallen, weil `--line` in
   :root steht und er nie griff. Die Grundlinie steht damit auf 0. Nachsehen:
   `grep -n -- "--bg:" vivodepot.html` (kein Treffer).

   NICHT hierunter faellt der Wert in einem CSS-KOMMENTAR (`:321`, die gemessene
   Aufhellung #8eab77): er steht als gemessene Zahl in einer Begruendung und ist
   keine Regel. Der Zaehler sieht ihn ohnehin nicht mehr, seit der Wert ein Token
   hat — er ist hier nur genannt, damit ein spaeterer Leser nicht danach sucht.

   AUFRUFE
     node tools/abgeloeste-farben-pruefen.js          Bericht
     node tools/abgeloeste-farben-pruefen.js --gate   Exit 1 bei jedem Fund
   ════════════════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const path = require('node:path');
const { _maskiereKommentare } = require('./textsatz-umstellen.js');

const REPO = path.join(__dirname, '..');

/* DIE AUSGELIEFERTEN ANWENDUNGEN. Nicht mehr und nicht weniger — was eine
   Bürgerin oder eine Beitragende in die Hand bekommt. `vivodepot-style-guide.html`
   steht bewusst NICHT dabei: er DOKUMENTIERT die abgelösten Werte („Salbei —
   vormals --forest") und wäre dauerhaft rot, obwohl er genau das Richtige tut. */
const ANWENDUNGEN = [
  'vivodepot.html',
  'vivodepot-lesen.html',
  'vivodepot-studio.html',
  'vivodepot-vc-issuer.html',
  /* `vivodepot-STARTSEITE.html` ist am 17.08.2026 entfallen (Zug 1b desselben Auftrags) —
     eine statische Vorschau in der abgeloesten Farbwelt, die keine Probe mehr las. Damit
     entfaellt auch die einzige Ausnahme, die dieses Werkzeug je hatte. */
];

/* Die abgelösten Werte, je mit der Entscheidung, die sie abgelöst hat, und dem
   Wert, der an ihre Stelle getreten ist. **Kein Wert steht hier ohne beides.** */
const ABGELOEST = [
  { wert: '#3d5a2a', war: '--forest',      heute: '#4F6539 (--salbei-dunkel)', quelle: 'Entscheidung 05.08.2026 (Forest → Salbei)' },
  { wert: '#5a7842', war: '--forest-mid',  heute: '#7B9A6A (--salbei-mid)',    quelle: 'Entscheidung 05.08.2026 (Forest → Salbei)' },
  { wert: '#ede4cf', war: '--cream (alt)', heute: '#f6f5f1 (--cream)',         quelle: 'Entscheidung 05.08.2026 (Cremeton widerrufen)' },
  { wert: '#9aa0a6', war: '--leer (Lese-App)', heute: '#637568 (--ink3)',      quelle: 'Befund 13.08.2026 — 2.64:1, unter AA' },
];

/* AUSNAHMEN — benannt, datiert, mit Grund. Eine Ausnahme ohne Ablaufbedingung
   wäre eine stille Auslassung mit Etikett; jede hier trägt, wann sie entfällt. */
const AUSNAHMEN = [
  /* LEER, und das ist ein Ergebnis, kein Anfangszustand: die einzige Ausnahme galt
     `vivodepot-STARTSEITE.html` und trug ihre Ablaufbedingung („ENTFAELLT MIT ZUG 1b")
     von Anfang an im Text. Zug 1b ist gelaufen, die Datei ist fort, die Ausnahme mit ihr.
     Eine Ausnahme, die ihr Ende nicht nennt, bleibt fuer immer — diese hat es genannt. */
];

/* ══ DIE GEGENRICHTUNG (Zug 4, 17.08.2026) ═══════════════════════════════════
   Die Pruefung oben fragt: steht ein ABGELOESTER Wert noch im Code? Sie faengt
   den Rueckfall — aber nicht den Neuzugang. Ein frei erfundener Farbwert, der nie
   Teil des Systems war, ist ihr gleichgueltig. Genau so ist `--akzent: #3d5a2a`
   in die Lese-App gekommen: nicht als Rueckfall, sondern als Handgriff.

   DER ZAEHLGEGENSTAND, und er ist enger gefasst, als es zunaechst aussieht:
   **Hex-Farbwerte in den `<style>`-Bloecken der ausgelieferten Anwendungen, die
   kein Gegenstueck unter den Token-Definitionen haben.** Drei Dinge sind bewusst
   DRAUSSEN, weil sie den Zaehler bedeutungslos machen wuerden:

     · das eingebettete jsPDF-Bundle (`#000000`/`#ffffff` in fremdem Minifikat) —
       kein Gestaltungswert, und niemand wird es umfaerben;
     · die Inline-SVG-Grafiken (allein die Logo-Verlaeufe stellen dreimal 48
       Treffer) — Bildmaterial, keine Oberflaechenentscheidung;
     · die Token-DEFINITIONEN selbst (`--salbei-dunkel: #4F6539`) — sie SIND das
       System, sie koennen ihm nicht widersprechen.

   Gemessen bleiben damit die Stellen, an denen eine Oberflaeche eine Farbe
   NENNT, statt sie zu beziehen. Das sind am 17.08.2026 vierundachtzig.

   WARUM RATSCHE UND NICHT ROT: der Auftrag sagt es vorweg — „erst messen; ist die
   Zahl gross, melden statt umfaerben". Vierundachtzig Stellen umzufaerben ist eine
   Gestaltungsentscheidung ueber vier Anwendungen, keine Angleichung. Die Ratsche
   haelt den Stand und laesst ihn nur fallen. */
const GEGENSTUECK_GRUNDLINIE = path.join(REPO, 'tools', 'farben-ohne-gegenstueck-grundlinie.json');

/* DIE ERSCHEINUNGSBILD-QUELLEN (v894, 02.10.2026). Seit v894 trägt das Gerüst keine Token-Werte mehr; sie stehen in
   tools/erscheinung/*.css und reisen als Modul in JEDES Produkt (U2-ADR-473 Nachtrag). Für dieses Werkzeug sind sie
   darum Code einer ausgelieferten Anwendung: ein abgelöster Wert, der dort zurückkehrt, ist ein Fund, und ihre
   Token-Definitionen sind die Gegenstücke. Gelesen als reines CSS (keine <style>-Hülle). */
function erscheinungsbildQuellen() {
  const ordner = path.join(REPO, 'tools', 'erscheinung');
  if (!fs.existsSync(ordner)) return [];
  const stil = path.join(ordner, 'stil');   // Lesart B (v894): das Stylesheet selbst, je Teil
  return [...fs.readdirSync(ordner).filter((n) => n.endsWith('.css')).sort().map((n) => path.join('tools', 'erscheinung', n)),
    ...(fs.existsSync(stil) ? fs.readdirSync(stil).filter((n) => n.endsWith('.css')).sort().map((n) => path.join('tools', 'erscheinung', 'stil', n)) : [])];
}

function _stilBloecke(roh) {
  return [...roh.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)].map((m) => m[1]).join('\n');
}

function tokenWerte() {
  const werte = new Set();
  for (const datei of [...ANWENDUNGEN, ...erscheinungsbildQuellen()]) {
    const pfad = path.join(REPO, datei);
    if (!fs.existsSync(pfad)) continue;
    const roh = _maskiereKommentare(fs.readFileSync(pfad, 'utf8'));
    const stil = datei.endsWith('.css') ? roh : _stilBloecke(roh);
    for (const m of stil.matchAll(/--[a-z0-9-]+\s*:\s*([^;{}]*);/gi)) {
      for (const h of (m[1].match(/#[0-9a-fA-F]{3,8}\b/g) || [])) werte.add(h.toLowerCase());
    }
  }
  return werte;
}

/* Eine Datei zählen. Studio S0 (08.10.2026, Wort der Gegenlesung): die Region STUDIO-ERSCHEINUNG (Farben des App-Moduls,
   gebacken) zählt nicht mit, aber NUR, wenn sie genau einmal da ist und der frisch erzeugten gleicht
   (tools/studio-erscheinung-backen.js regionGeprueftAusblenden); sonst zählt jede Farbe darin, und der Grund zählt als Fund. */
// Ohne den Erzeuger (etwa in einer verworfenen Kopie mit wenigen Dateien) wird nichts ausgeblendet: dann zählt jede Farbe.
function regionGeprueftAusblenden(text, modul) {
  let f = null;
  try { f = require('./studio-erscheinung-backen.js').regionGeprueftAusblenden; } catch (_) { return { text, ausgeblendet: false, fehler: null }; }
  return f(text, modul);
}
function ohneGegenstueckImText(datei, text, werte, opts = {}) {
  const r = regionGeprueftAusblenden(text, opts.modul);
  let stil = _stilBloecke(_maskiereKommentare(r.text));
  // Die Token-Definitionen laengentreu ausblenden: gezaehlt werden VERWENDUNGEN.
  stil = stil.replace(/--[a-z0-9-]+\s*:\s*[^;{}]*;/gi, (x) => ' '.repeat(x.length));
  const treffer = (stil.match(/#[0-9a-fA-F]{3,8}\b/g) || [])
    .map((x) => x.toLowerCase()).filter((h) => !werte.has(h));
  const funde = [...new Set(treffer)].map((h) => ({ datei, wert: h, treffer: treffer.filter((x) => x === h).length }));
  if (r.fehler) funde.push({ datei, wert: r.fehler, treffer: 1 });
  return { anzahl: treffer.length + (r.fehler ? 1 : 0), funde };
}
function ohneGegenstueck() {
  const werte = tokenWerte();
  const jeDatei = {};
  const funde = [];
  for (const datei of ANWENDUNGEN) {
    const pfad = path.join(REPO, datei);
    if (!fs.existsSync(pfad)) continue;
    const z = ohneGegenstueckImText(datei, fs.readFileSync(pfad, 'utf8'), werte);
    jeDatei[datei] = z.anzahl;
    funde.push(...z.funde);
  }
  const summe = Object.values(jeDatei).reduce((a, b) => a + b, 0);
  return { summe, jeDatei, funde, tokenAnzahl: werte.size };
}

function pruefen() {
  const funde = [];
  const geprueft = [];
  for (const datei of [...ANWENDUNGEN, ...erscheinungsbildQuellen()]) {
    const pfad = path.join(REPO, datei);
    if (!fs.existsSync(pfad)) continue;   // eine entfernte Anwendung ist kein Fund
    geprueft.push(datei);
    const ausnahme = AUSNAHMEN.find((a) => a.datei === datei);
    const code = _maskiereKommentare(fs.readFileSync(pfad, 'utf8')).toLowerCase();
    for (const a of ABGELOEST) {
      let n = 0, i = 0;
      const w = a.wert.toLowerCase();
      while ((i = code.indexOf(w, i)) >= 0) { n++; i += w.length; }
      if (n) funde.push({ datei, ...a, treffer: n, ausgenommen: !!ausnahme });
    }
  }
  return { funde, geprueft };
}

function main() {
  const argv = process.argv.slice(2);

  if (argv.includes('--gegenstueck') || argv.includes('--gegenstueck-grundlinie-schreiben')) {
    const g = ohneGegenstueck();
    console.log(`[farben-gegenstueck] ${g.tokenAnzahl} Token-Werte; ${g.summe} CSS-Farbwerte ohne Gegenstück.`);
    for (const [d, n] of Object.entries(g.jeDatei)) console.log(`  ${d}: ${n}`);
    for (const f of g.funde.slice().sort((a, b) => b.treffer - a.treffer).slice(0, 15)) {
      console.log(`    ${f.datei}: ${f.wert} ×${f.treffer}`);
    }
    if (argv.includes('--gegenstueck-grundlinie-schreiben')) {
      fs.writeFileSync(GEGENSTUECK_GRUNDLINIE, JSON.stringify({
        // Nur Dateien mit Fund (27.09.2026): die Grundlinie geht hinaus und nennt keine Datei, die drinnen bleibt — der
        // Generator (0 Funde) stand sonst darin (tests/zuschnitt-datenlisten-ohne-interne-pfade.test.js). Geprüft wird die Summe.
        summe: g.summe, jeDatei: Object.fromEntries(Object.entries(g.jeDatei).filter(([, n]) => n > 0)),
        gegenstand: 'Hex-Farbwerte in <style>-Bloecken der ausgelieferten Anwendungen, '
          + 'die kein Gegenstueck unter den Token-Definitionen haben. Ohne jsPDF-Bundle, '
          + 'ohne Inline-SVG, ohne die Token-Definitionen selbst.',
        stichtag: (() => { const d = new Date(); const p = (n) => String(n).padStart(2, '0');
          return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()); })(),
      }, null, 1) + '\n');
      console.log(`[farben-gegenstueck] Grundlinie geschrieben: ${g.summe}.`);
    }
    return;
  }

  const { funde, geprueft } = pruefen();
  const echt = funde.filter((f) => !f.ausgenommen);
  const bekannt = funde.filter((f) => f.ausgenommen);

  console.log(`[abgeloeste-farben] ${geprueft.length} Anwendungen geprüft, ${ABGELOEST.length} abgelöste Werte gesucht.`);
  for (const a of AUSNAHMEN) console.log(`  Ausnahme seit ${a.seit}: ${a.datei} — ${a.grund.split('.')[0]}.`);
  for (const f of bekannt) console.log(`  (bekannt) ${f.datei}: ${f.wert} ×${f.treffer} — war ${f.war}`);

  if (echt.length) {
    console.error('\nABGELÖSTE FARBWERTE IM CODE:');
    for (const f of echt) {
      console.error(`  ${f.datei}: ${f.wert} ×${f.treffer} — war ${f.war}, heute ${f.heute} (${f.quelle})`);
    }
    if (argv.includes('--gate')) process.exit(1);
    return;
  }
  console.log('  Keine abgelöste Farbe im Code der ausgelieferten Anwendungen.');

  /* Die Gegenrichtung als Ratsche im selben Gate: der Stand darf fallen, nicht steigen. */
  if (fs.existsSync(GEGENSTUECK_GRUNDLINIE)) {
    const g = ohneGegenstueck();
    const basis = JSON.parse(fs.readFileSync(GEGENSTUECK_GRUNDLINIE, 'utf8'));
    if (g.summe > basis.summe) {
      console.error(`[farben-gegenstueck] ROT — ${g.summe} CSS-Farbwerte ohne Gegenstück `
        + `(Grundlinie vom ${basis.stichtag}: ${basis.summe}). Eine neue Farbe gehört als Token `
        + 'in das System, nicht als Wert in eine Regel.');
      if (argv.includes('--gate')) process.exit(1);
      return;
    }
    if (g.summe < basis.summe) {
      console.log(`[farben-gegenstueck] neuer Tiefstand: ${g.summe} (Grundlinie ${basis.summe}) — `
        + 'mit `--gegenstueck-grundlinie-schreiben` festschreiben.');
      return;
    }
    console.log(`[farben-gegenstueck] ${g.summe} CSS-Farbwerte ohne Gegenstück, unverändert zur Grundlinie.`);
  }
}

if (require.main === module) main();
module.exports = { ohneGegenstueckImText, pruefen, ohneGegenstueck, tokenWerte, erscheinungsbildQuellen, ABGELOEST, ANWENDUNGEN, AUSNAHMEN, GEGENSTUECK_GRUNDLINIE };
