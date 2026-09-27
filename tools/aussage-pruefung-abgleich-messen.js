#!/usr/bin/env node
'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   aussage-pruefung-abgleich-messen.js — folgt die `aussage` wirklich aus der
   `pruefung`, die neben ihr im selben Konformitäts-Block steht?
   „Vier Zusicherungen, die mehr behaupteten als ihre Prüfung deckt"
   (01.09.2026, Zug 0 — messen, nicht reparieren).
   ────────────────────────────────────────────────────────────────────────────
   ANLASS. Vier gemessene Fälle desselben Musters: die Messung stimmte, aber sie
   trug die danebenstehende Aussage nicht — ein Datum prüfte nur eine Zahl statt
   der Veröffentlichung, eine Abdeckungs-Prozentzahl zählte übersetzt statt
   richtig, ein Struktur-Wächter prüfte Form statt Aktualität, eine Verweis-Probe
   fand nur zitierte Verweise, kein umschriebener.

   `tests/pruefstand-bindung.js` prüft bereits STRUKTUR: löst `pruefung:` auf
   einen echten Testtitel auf, trägt der Wächter eine PROBEN-Deklaration, ist er
   Kollektor- oder Konstruktions-Form. Was es AUSDRÜCKLICH NICHT prüft (eigener
   Kommentar dort): „dass die Einspeisepunkte den Geltungsbereich eines Wächters
   decken" — genau die Lücke, in der alle vier Funde saßen. Dieses Werkzeug
   prüft SEMANTISCH: deckt das, was die Probe tatsächlich misst, das, was die
   Aussage behauptet? Reine Ergänzung, kein Ersatz — beide Fragen sind
   unterschiedlich und beide nötig.

   ZWEI ACHSEN, mechanisch nur so weit wie ehrlich möglich:

   ACHSE 1 — Aussage/Probe-Abgleich, drei mechanische Signale je Block:
     · pruefungFehlt      — jede `pruefung:`-Zeile MUSS auf einen echten Test-
                             titel auflösen (wiederverwendet klassifiziere() aus
                             pruefstand-bindung.js — der schwerste Fall, laut
                             Auftrag rein mechanisch zu finden).
     · absoluteSprache     — die Aussage nennt ein Wort wie „nur"/„ausschließ-
                             lich"/„genau"/„nie"/„immer"/„ersatzlos"/„keine".
                             Signal, kein Urteil: genau an diesen Stellen saß
                             der U2-ADR-002-Fund („genau [3]", während die Probe
                             längst [3, 4] prüft) — absolute Sprache ist am
                             brüchigsten gegen Code-Drift.
     · fehlendeBegriffe    — benannte Bezeichner (Backtick-Code) oder Zahlen aus
                             der Aussage, die im GESAMTEN Testkörper (alle
                             gebundenen `pruefung:`-Zeilen zusammen) kein
                             einziges Mal vorkommen. Eine Abwesenheit ist ein
                             starkes Signal; ihre Anwesenheit beweist NICHTS
                             (das ist die Grenze, s. u.) — deshalb nur als
                             Vorsortierung, nie als Freispruch.
   Jeder Block mit mindestens einem Signal geht in den Bericht — GELESEN wird er
   von einem Menschen (oder einer gelesenen Erhebung), nicht automatisch
   verurteilt. Reine Vorsortierung, wie der Auftrag verlangt.

   ACHSE 2 — Rotmachbarkeit-Näherung (nur Größenordnung, s. Auftrag: „nicht
   vollständig, nur die Größenordnung, bevor Du die 67 von Hand durchliest"):
     rotBelegProxy — trägt die TESTDATEI irgendeine erkennbare Rot-Beweis-Spur
     für die gebundene Probe (ein `[Negativprobe]`-Titel, ein Kommentar mit
     „Positivkontrolle"/„Rotmachbarkeit"/„rot" in der Nähe der Probe)? Eine
     GROBE Näherung, kein Beweis — dieselbe Grenze wie pruefstand-bindung.js's
     eigener `negProbeInDatei`-Heuristik (dateiweit, nicht zeilenscharf): eine
     Datei mit fünf Proben und einer einzigen Negativprobe zählt hier für ALLE
     fünf als „belegt", auch wenn nur eine davon wirklich geprüft wurde. Für
     eine echte Aufruf-Nachweis-Instrumentierung je Probe s. pruefstand-
     bindung.js's `aufrufNachweis()` — das leistet dieses Werkzeug NICHT, dafür
     ist es hier zu teuer (ein Kindprozess je Probe) und nicht der Auftrag
     („Größenordnung", nicht Vollbeweis).

   WAS DIESES WERKZEUG NICHT SIEHT (Auflage 4 des Auftrags, wörtlich zu nennen):
     · Ob eine Aussage OHNE absolute Sprache und OHNE fehlenden Begriff trotzdem
       semantisch danebenliegt (der Sprache-Fall aus dem Auftrag — „abgedeckt"
       heißt nicht „richtig" — wäre hier NICHT gefunden worden: kein absolutes
       Wort, kein fehlender Begriff, nur eine falsche Wortbedeutung).
     · Ob eine Probe, die alle Begriffe nennt, sie auch RICHTIG verknüpft
       (könnte einen Begriff im Kommentar erwähnen, aber nie assertieren).
     · Ob `zustand: offen` ehrlich offen ist — die zählen bewusst NICHT als
       Fund (sie behaupten nichts, was ihre Prüfung nicht deckt — sie behaupten
       gerade, ungeprüft zu sein).
     · Alles, was reines Lesen des vollen Testkörpers durch einen Menschen
       verlangt — genau dafür ist dieses Werkzeug eine Vorsortierung, keine
       Ersetzung (Auflage 1 des Auftrags).

   MISST UND ÄNDERT NICHTS. Read-only, wie beauftragt.

   Aufruf:
     node tools/aussage-pruefung-abgleich-messen.js            (Bericht, lesbar)
     node tools/aussage-pruefung-abgleich-messen.js --json     (maschinenlesbar)
     node tools/aussage-pruefung-abgleich-messen.js --achse2   (nur die grobe
                                                                  Rotmachbarkeits-
                                                                  Größenordnung)
   ════════════════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const path = require('node:path');

const REPO = path.join(__dirname, '..');
const ADR_VERZ = path.join(REPO, 'docs', 'adr');
const TESTS = path.join(REPO, 'tests');
const P = require(path.join(TESTS, 'pruefstand-bindung.js'));
// WIEDERVERWENDET, NICHT ZWEITE IMPLEMENTIERUNG (Nachtrag 17.09.2026, s. eigener ADR): die
// YAML-Form (seit U2-ADR-323, 06.09.2026) hat hier gefehlt — derselbe blinde Fleck wie in
// adr-konformitaet-pruefen.js, unabhängig entstanden. Statt eine zweite eigene Extraktion für
// dieselbe YAML-Grammatik zu schreiben (genau die Fehlerklasse, die den blinden Fleck erst
// zweimal entstehen ließ), wird hier die dort bereits gebaute und gegen den echten Bestand
// geprüfte Extraktion/Auflösung importiert. Die EIGENEN, semantischen Prüfungen dieser Datei
// (absolute Sprache, fehlende Begriffe, Rot-Beleg-Näherung) bleiben unverändert eigenständig.
const K = require(path.join(REPO, 'tools', 'adr-konformitaet-pruefen.js'));

const ALS_JSON = process.argv.includes('--json');
const NUR_ACHSE2 = process.argv.includes('--achse2');

/* ── Grundmenge: alle Konformitäts-Blöcke, nicht nur die aufgelösten ────────
   Anders als pruefstand-bindung.js: das hier will JEDEN Block sehen, auch die
   mit `zustand: offen` (zur Einordnung) und die mit nicht auflösenden
   `pruefung:`-Zeilen (Achse-1-Fund „pruefungFehlt" selbst). */
// Zeilenweise, an Zeilenanfängen verankert (`^\s*<feld>:`) — NICHT ein Blockweiter
// Regex über den ganzen Text. Grund, am eigenen Bestand gemessen: der Block zu
// U2-ADR-099 selbst trägt eine `aussage:`, die WÖRTLICH von „`pruefung:`-Zeile"
// spricht (das Klausel-Format erklärend) — ein unverankertes `/pruefung:\s*(.+)/g`
// träfe diese Erwähnung MITTEN in der Aussage als eigene, falsche Pruefung-Zeile.
// pruefstand-bindung.js löste genau dieses Problem schon (eigener Kommentar dort:
// „Gefunden vom eigenen ADR-Text") — hier dieselbe Lösung, nicht dieselbe Falle
// zweimal gebaut.
function alleBloecke() {
  const raus = [];
  for (const f of fs.readdirSync(ADR_VERZ).filter((x) => x.endsWith('.md'))) {
    const inhalt = fs.readFileSync(path.join(ADR_VERZ, f), 'utf8');
    const re = /```konformitaet\n([\s\S]*?)\n```/g;
    let m;
    while ((m = re.exec(inhalt))) {
      const zeilen = m[1].split('\n');
      let aussage = '', zustand = '';
      const pruefungRoh = [];
      let inAussage = false;
      for (const z of zeilen) {
        if (/^\s*aussage:\s/.test(z)) { inAussage = true; aussage = z.replace(/^\s*aussage:\s*/, ''); continue; }
        if (/^\s*(zustand|herkunft|pruefung):/.test(z)) inAussage = false;
        if (inAussage) { aussage += ' ' + z.trim(); continue; }
        if (/^\s*zustand:\s/.test(z)) { zustand = z.replace(/^\s*zustand:\s*/, '').trim(); continue; }
        if (/^\s*pruefung:\s/.test(z)) { pruefungRoh.push(z.replace(/^\s*pruefung:\s*/, '').trim()); continue; }
      }
      aussage = aussage.replace(/\s+/g, ' ').trim();
      raus.push({ adr: f, aussage, zustand, pruefungRoh, form: 'fenced' });
    }
    // YAML-FORM (seit U2-ADR-323, 06.09.2026) — Extraktion/Zeilen-Split wiederverwendet aus
    // adr-konformitaet-pruefen.js (s. Kopf-Kommentar oben), nur die `aussage:`-Faltung ist hier
    // neu, weil jenes Werkzeug `aussage:` selbst nicht braucht (es prüft nur die Kette, nicht die
    // Semantik). Dieselbe Faltungslogik wie oben bei der eingezäunten Form, nur an den YAML-
    // Feldnamen verankert, die auf derselben Einrückungsstufe wie `aussage:` stehen.
    for (const block of K.yamlBloeckeAusDatei(f, inhalt)) {
      const zeilen = block.text.split('\n');
      let aussage = '';
      let inAussage = false;
      for (const z of zeilen) {
        if (/^\s*-\s*aussage:\s/.test(z)) { inAussage = true; aussage = z.replace(/^\s*-\s*aussage:\s*/, ''); continue; }
        if (/^\s*(zustand|herkunft|pruefung):/.test(z)) inAussage = false;
        if (inAussage) { aussage += ' ' + z.trim(); continue; }
      }
      aussage = aussage.replace(/^>-\s*/, '').replace(/\s+/g, ' ').trim();
      const zustand = K.zeilenwert(block.text, 'zustand') || '';
      const pruefungRoh = K.yamlPruefungsEintraege(block.text);
      raus.push({ adr: f, aussage, zustand, pruefungRoh, form: 'yaml' });
    }
  }
  return raus;
}

// Löst EINE `pruefung:`-Zeile gegen den echten Testbestand auf — BEIDE Formen (Nachtrag
// 17.09.2026): „Pfad#Name" (eingezäunt, hier direkt gehalten, dieselbe Form wie klassifiziere()
// in pruefstand-bindung.js) oder „Pfad" / „Pfad \"Titel\"" (YAML-Liste, Auflösung wiederverwendet
// aus adr-konformitaet-pruefen.js — keine zweite Implementierung derselben Grammatik, s. Kopf-
// Kommentar oben).
function loeseAuf(rohZeile) {
  const m = rohZeile.match(/^([\w./-]+\.(?:js|mjs|cjs))#(.+)$/);
  if (m) {
    const [, rel] = m; const name = m[2].trim();
    const abs = path.join(REPO, rel);
    if (!fs.existsSync(abs)) return { ok: false, grund: 'Pfad existiert nicht: ' + rel, datei: rel, name };
    const quelle = fs.readFileSync(abs, 'utf8');
    if (!P.testTitelVon(quelle).some((t) => t.includes(name))) {
      return { ok: false, grund: 'kein Test-Titel „' + name + '" in ' + rel, datei: rel, name };
    }
    return { ok: true, datei: rel, name };
  }
  const y = K.pruefeEineYamlPruefungsZeile(rohZeile);
  const yM = rohZeile.match(/^([\w./-]+\.(?:js|mjs|cjs))(?:\s+"(.*)")?\s*$/);
  const datei = yM ? yM[1] : null;
  const name = yM && yM[2] !== undefined ? yM[2].replace(/\\"/g, '"').replace(/\\\\/g, '\\') : null;
  return { ok: y.ok, grund: y.ok ? undefined : y.grund, datei, name };
}

/* ── Achse 1, Signal 2: absolute Sprache ─────────────────────────────────── */
const ABSOLUTE_MARKER = [
  /\bnur\b/i, /\bausschlie(ß|ss)lich\b/i, /\bgenau\b/i, /\bnie\b/i, /\bniemals\b/i,
  /\bimmer\b/i, /\bstets\b/i, /\bersatzlos\b/i, /\bkeine[rsm]?\b/i, /\bausdrücklich\s+nicht\b/i,
  /\bjed(e|er|es|em|en)\b/i,
];
function absoluteSprache(aussage) {
  const treffer = [];
  for (const m of ABSOLUTE_MARKER) { const t = m.exec(aussage); if (t) treffer.push(t[0]); }
  return treffer;
}

/* ── Achse 1, Signal 3: benannte Begriffe aus der Aussage fehlen im Testkörper ──
   Nur Backtick-Code (`identifier`) und eigenständige Zahlen ≥ 2-stellig oder in
   eckigen Klammern — Wörter allein wären zu unscharf (jedes „nicht" träfe).

   ERSTER LAUF, BEFUND: fast ein Drittel der ersten Funde (9 von 26) waren die
   eigene ADR-Nummer der Aussage selbst („U2-002:"/„U2-ADR-043" als Label oder
   Querverweis) — die taucht im Testkörper natürlich nie auf, sie ist ein
   Bezeichner für DIESE Klausel, kein behaupteter Wert. Vor der Zahlen-Suche
   entfernt, sonst zählt das Werkzeug seine eigene Beschriftung als Fund gegen
   sich selbst. Ebenso „[X]" (ein Platzhalter in Prosa, keine Werte-Liste). */
function benannteBegriffe(aussage) {
  const ohneAdrEigenname = aussage.replace(/\bU2(-ADR)?-\d+\b/g, '');
  const begriffe = new Set();
  for (const m of aussage.matchAll(/`([^`]+)`/g)) begriffe.add(m[1]);
  for (const m of ohneAdrEigenname.matchAll(/\[[\w,\s]+\]/g)) { if (!/^\[[A-Z]\]$/.test(m[0])) begriffe.add(m[0]); }
  for (const m of ohneAdrEigenname.matchAll(/\b\d{2,}\b/g)) begriffe.add(m[0]);
  return [...begriffe];
}
function fehlendeBegriffe(aussage, testkoerper) {
  return benannteBegriffe(aussage).filter((b) => !testkoerper.includes(b));
}

/* ── Achse 2: grobe Rotmachbarkeits-Näherung (dateiweit, s. Kopf-Kommentar) ── */
const ROT_BELEG_MUSTER = /\[Negativprobe\]|Positivkontrolle|Rotmachbarkeit|Gegenprobe|rot⇄grün|rot->grün|wurde ROT|wird ROT/i;
function hatRotBelegProxy(datei) {
  const abs = path.join(REPO, datei);
  if (!fs.existsSync(abs)) return false;
  return ROT_BELEG_MUSTER.test(fs.readFileSync(abs, 'utf8'));
}

function erhebe() {
  const bloecke = alleBloecke();
  const ergebnis = [];
  for (const b of bloecke) {
    const aufloesungen = b.pruefungRoh.map(loeseAuf);
    const pruefungFehlt = aufloesungen.filter((a) => !a.ok);
    const gueltige = aufloesungen.filter((a) => a.ok);
    // Testkörper ALLER gebundenen Proben zusammen (eine Aussage kann an mehreren Zeilen hängen).
    let testkoerper = '';
    for (const g of gueltige) {
      // Ein YAML-Eintrag ohne Titel (bloßer Werkzeug-Pfad, z. B. U2-ADR-323s
      // `tools/lese-app-bereichsluecke-messen.js`) hat keinen test()-Titel zum Aufsuchen —
      // `waechterRumpf` verlangt einen; ohne Titel gibt es keinen Testkörper zu diesem Eintrag.
      if (g.name == null) continue;
      const r = P.waechterRumpf(g.datei, g.name);
      if (r) testkoerper += r + '\n';
    }
    const absSprache = absoluteSprache(b.aussage);
    const fehlend = testkoerper ? fehlendeBegriffe(b.aussage, testkoerper) : [];
    const rotBeleg = gueltige.length ? gueltige.some((g) => hatRotBelegProxy(g.datei)) : null;
    const signale = [];
    if (pruefungFehlt.length) signale.push('pruefungFehlt');
    if (absSprache.length) signale.push('absoluteSprache');
    if (fehlend.length) signale.push('fehlendeBegriffe');
    ergebnis.push({
      adr: b.adr, aussage: b.aussage, zustand: b.zustand,
      pruefung: b.pruefungRoh, pruefungFehlt: pruefungFehlt.map((p) => p.grund),
      absoluteSprache: absSprache, fehlendeBegriffe: fehlend,
      rotBelegProxy: rotBeleg, signale,
    });
  }
  return ergebnis;
}

function bericht(ergebnis) {
  // YAML-Vokabular (erfuellt/teilweise-erfuellt/bekannte-grenze) ergänzt, seit dieses Werkzeug
  // auch die YAML-Form sieht (Nachtrag 17.09.2026) — sonst zählt jede YAML-Klausel für Achse 1/2
  // nie als „relevant", obwohl sie eine pruefung:-Liste trägt.
  const relevantZustaende = new Set(['geprüft', 'prüfbar', 'erfuellt', 'teilweise-erfuellt', 'bekannte-grenze']);
  const relevant = ergebnis.filter((e) => relevantZustaende.has(e.zustand));
  const mitSignal = relevant.filter((e) => e.signale.length);
  const ohneRotBeleg = relevant.filter((e) => e.rotBelegProxy === false);
  const zeilen = [];
  zeilen.push('aussage-pruefung-abgleich-messen — ' + ergebnis.length + ' Konformitäts-Blöcke gesamt, '
    + relevant.length + ' mit zustand geprüft/prüfbar (die Zielmenge dieses Auftrags).');
  zeilen.push('');
  zeilen.push('ACHSE 1 — mit mindestens einem mechanischen Signal: ' + mitSignal.length + ' / ' + relevant.length);
  for (const e of mitSignal) {
    zeilen.push('');
    zeilen.push('· ' + e.adr + ' [' + e.zustand + '] Signale: ' + e.signale.join(', '));
    zeilen.push('  Aussage: ' + e.aussage.slice(0, 160) + (e.aussage.length > 160 ? '…' : ''));
    zeilen.push('  Pruefung: ' + JSON.stringify(e.pruefung));
    if (e.pruefungFehlt.length) zeilen.push('  → LÖST NICHT AUF: ' + e.pruefungFehlt.join(' | '));
    if (e.absoluteSprache.length) zeilen.push('  → absolute Sprache: ' + e.absoluteSprache.join(', '));
    if (e.fehlendeBegriffe.length) zeilen.push('  → im Testkörper nicht gefunden: ' + e.fehlendeBegriffe.join(', '));
  }
  zeilen.push('');
  zeilen.push('ACHSE 2 (grobe Näherung, dateiweit) — geprüft/prüfbar OHNE erkennbare Rot-Beweis-Spur: '
    + ohneRotBeleg.length + ' / ' + relevant.length);
  return zeilen.join('\n');
}

if (require.main === module) {
  const ergebnis = erhebe();
  if (ALS_JSON) {
    process.stdout.write(JSON.stringify(ergebnis, null, 2) + '\n');
  } else if (NUR_ACHSE2) {
    const relevant = ergebnis.filter((e) => ['geprüft', 'prüfbar', 'erfuellt', 'teilweise-erfuellt', 'bekannte-grenze'].includes(e.zustand));
    const ohne = relevant.filter((e) => e.rotBelegProxy === false);
    process.stdout.write('Achse 2 (grobe Näherung): ' + ohne.length + ' / ' + relevant.length
      + ' geprüft/prüfbar-Blöcke ohne erkennbare Rot-Beweis-Spur in der gebundenen Testdatei.\n');
  } else {
    process.stdout.write(bericht(ergebnis) + '\n');
  }
}

module.exports = { alleBloecke, loeseAuf, absoluteSprache, benannteBegriffe, fehlendeBegriffe, hatRotBelegProxy, erhebe };
