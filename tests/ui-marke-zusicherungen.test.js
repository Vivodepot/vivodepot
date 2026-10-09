'use strict';
/* ════════════════════════════════════════════════════════════════════════
   U2-ADR-097 §12 — UI- und Marken-Grenzen.
   ────────────────────────────────────────────────────────────────────────
   Vier Zusicherungen:
   • b16-030  — kein UA-Sniffing: kein navigator.userAgent/platform/vendor-Vergleich
     zur Verhaltenssteuerung; Capability wird per Feature-Detection ermittelt.
   • b16-009b — die Wortmarke „Vivodepot" steht auffindbar im Produkt. NACHGEZOGEN
     10.09.2026 (Auftrag „White Label bis ins PDF", Entscheidung „EIN Ort trägt die
     Herkunft"): der Ort ist nicht mehr die dauerhafte Fußzeile (STRINGS.fussFirma, dort
     entfallen), sondern der Herkunftsort (Einstellungen → Recht, `data-herkunftsort`,
     STRINGS.herkunftPoweredBy) — EIN Ort, nicht mehr auf jeder Seite. Die ID bleibt
     unverändert (U2-ADR-097/U2-ADR-099 nennen sie namentlich, s. tests/pruefstand-bindung.js),
     nur die Diskriminante darunter prüft jetzt den neuen Ort.
   • b16-021  — §12(c), präzisiert: kein Prozent-/Vollständigkeits-Indikator ÜBER DEN
     DEPOT-INHALT (keine Gamification). Ausdrücklich ausgenommen: die sachliche
     Wizard-Schrittanzeige „Schritt X von N" (positionsgebunden, schritt/gesamt),
     der PW-Stärke-Segment-Indikator und der Prüftermin-Ampelstatus.
   • b16-033  — enge D&D-Fassung, PRÄZISIERT (A556, 03.09.2026): die ursprüngliche Fassung
     prüfte nur „existiert IRGENDWO ein Drop-Handler, existiert IRGENDWO ein type="file",
     existiert IRGENDWO ein renderCryptoOverlay(-Aufruf" — OHNE JEDE ZUORDNUNG. Ein neuer
     Ziehbereich ohne eigenen Ersatzweg wäre grün geblieben (Register-Fund A556, aus A555
     Fund „die Probe prüft das Einzelteil, nicht das Verdrahtete"). Jetzt wird die Kette
     wirklich verfolgt: Drop-Handler → aufgerufene Zielfunktion → Zielfunktion rendert bei
     fehlender Vorbelegung einen type="file"-Picker → dieselbe Zielfunktion ist auch OHNE
     Drop erreichbar (mind. ein zweiter Aufruf) → dieser zweite Aufruf hängt an einem
     sichtbaren, nicht versteckten <button>. Gemessen am heutigen Bestand, bevor gebaut wurde
     (s. Bericht): genau EIN Drop-Handler (#overlay in booteEingang), ruft
     renderCryptoOverlay(f); dessen Körper rendert bei fehlender Vorbelegung einen echten,
     sichtbaren Picker (`co-datei`/`co-datei-knopf`); ein zweiter, unabhängiger Aufruf
     renderCryptoOverlay() (ohne Datei) hängt am sichtbaren Welcome-Knopf `w-datei`
     ("Datei öffnen") — kein Vakuum-Grün, ein echter, tastatur-/screenreader-bedienbarer
     Ersatzweg. Kein Beweis einer vollständigen „nirgends D&D-only"-Bedienbarkeit über den
     ganzen restlichen UI-Baum (das bleibt Laufzeit-Vorbehalt, wie zuvor) — geprüft ist die
     STRUKTURELLE Kette an genau dieser Stelle, nicht jede denkbare künftige.

   Geltungsbereich (ehrlich): statische Struktur-Prüfung über die HTMLs. Bindung ans
   Fundament (U2-ADR-098 + Nachtrag) folgt in B3.3 mit der §12-Klausel (pruefung:).
   ════════════════════════════════════════════════════════════════════════ */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const { vendorZeilen } = require('../tools/zusicherungen-kern.js');
const { bindungPruefen } = require('./bindung-pruefen.js');
const { funktionsKoerper } = require('../tools/krypto-block-propagation-pruefen.js');

/* ── b16-033-Diskriminante (A556) — die Drop→Ziel→Ersatzweg-Kette wirklich verfolgen ──────
   Jeder gefundene Drop-Handler wird einzeln geprüft (heute genau einer; ein künftiger
   zweiter Ziehbereich fiele hier als eigener Fund auf, nicht als stiller Nicht-Treffer). */
function dropZonenLuecken(html) {
  const luecken = [];
  const dropMuster = /addEventListener\('drop',\s*\(e\)\s*=>\s*\{/g;
  let dm, gefunden = 0;
  while ((dm = dropMuster.exec(html))) {
    gefunden++;
    // Körper des Drop-Handlers selbst brace-matchen — derselbe Mechanismus wie
    // `funktionsKoerper`, hier auf den Pfeilfunktions-Rumpf direkt angewandt (kein
    // `function NAME(...)`-Kopf vor dieser Stelle, an dem `funktionsKoerper` ansetzen könnte).
    let i = dm.index + dm[0].length, tiefe = 1, start = i;
    while (tiefe > 0 && i < html.length) {
      if (html[i] === '{') tiefe++; else if (html[i] === '}') tiefe--;
      i++;
    }
    if (tiefe !== 0) { luecken.push('Drop-Handler bei Zeichen ' + dm.index + ': Rumpf nicht klammer-balanciert'); continue; }
    const koerper = html.slice(start, i);
    const ruf = /([A-Za-z_$][\w$]*)\(f\)/.exec(koerper);
    if (!ruf) { luecken.push('Drop-Handler bei Zeichen ' + dm.index + ': ruft keine erkennbare Funktion mit der fallengelassenen Datei auf'); continue; }
    const ziel = ruf[1];
    const zielKoerper = funktionsKoerper(html, ziel);
    if (!zielKoerper) { luecken.push('Ziel-Funktion „' + ziel + '" (aus dem Drop-Handler) ist nicht auffindbar'); continue; }
    if (!/type="file"/.test(zielKoerper)) {
      luecken.push('„' + ziel + '" rendert keinen type="file"-Picker — der Drop wäre der einzige Weg');
      continue;
    }
    // Muss auch OHNE Drop erreichbar sein — NICHT durch blosses Zaehlen aller Aufrufe im
    // ganzen Dokument (Rot-Beweis, 03.09.2026: `renderCryptoOverlay(` haengt auch am
    // ?datei-URL-Marker und am PWA-launchQueue-Pfad, keiner davon tastatur-/screenreader-
    // bedienbar von der normalen Startseite aus — ein Zaehler >= 2 waere trotz entferntem
    // Knopf gruen geblieben, live geprueft). Stattdessen: ein `verdrahteEintritt('<id>', () =>
    // ZIEL(...))`-Aufruf, dessen Knopf-ID als echter, sichtbarer <button> existiert.
    const wireMuster = new RegExp("verdrahteEintritt\\('([a-z0-9-]+)',\\s*\\(\\)\\s*=>\\s*" + ziel + '\\(', 'g');
    const knoepfe = [...html.matchAll(wireMuster)].map((m) => m[1]);
    const sichtbar = knoepfe.filter((id) => knopfIstSichtbar(html, id));
    if (!sichtbar.length) {
      luecken.push('„' + ziel + '" hat keinen an einen sichtbaren <button> verdrahteten Aufruf ohne Drop'
        + (knoepfe.length ? ' (Knöpfe gefunden, aber versteckt/sr-only: ' + knoepfe.join(', ') + ')' : ' (keine verdrahteEintritt-Stelle gefunden)'));
    }
  }
  return { luecken, gefunden };
}
// Ist ein Knopf mit dieser ID ein ECHTER, sichtbarer <button> — nicht versteckt, nicht
// sr-only? Ein solcher Knopf wäre kein tastatur-/screenreader-bedienbarer Ersatzweg.
function knopfIstSichtbar(html, id) {
  const m = new RegExp('<button[^>]*\\bid="' + id + '"[^>]*>').exec(html);
  if (!m) return false;
  return !/\bhidden\b/.test(m[0]) && !/sr-only/.test(m[0]);
}

const HTML  = fs.readFileSync(path.join(__dirname, '..', 'vivodepot.html'), 'utf8');
const LESEN = fs.readFileSync(path.join(__dirname, '..', 'vivodepot-lesen.html'), 'utf8');

// Bindung an U2-ADR-097 §12 über das Fundament (U2-ADR-098 + Nachtrag). Zwei quelle-Klassen:
// §12(b) Wortmarke = entscheidung (gesetzte Marken-Entscheidung), der Rest = invariante.
const ADR = 'U2-ADR-097';
const PRUEFUNGEN = [
  'b16-030-kein-ua-sniffing-nur-feature-detection',
  'b16-021-kein-prozent-vollstaendigkeit-indikator',
  'b16-033-jeder-drop-hat-nicht-dnd-pfad',
];
const PRUEFUNGEN_ENTSCHEIDUNG = ['b16-009b-wortmarke-im-footer'];

// Eigen-Code: vendorte Bibliotheksblöcke (SBOM-belegt, U2-ADR-097 §1-Ausnahme, z. B. jsPDFs
// eigener UA-Shim) und Kommentare raus — die Zusicherungen gelten für Vivodepots eigenen Code.
function eigenerCode(src) {
  const vendor = vendorZeilen(src);
  return src.split('\n').filter((z, i) => !vendor.has(i + 1)).join('\n')
    .replace(/\/\*[\s\S]*?\*\//g, '').replace(/([^:])\/\/.*$/gm, '$1');
}

/* ── Die Diskriminanten (je EINE Stelle, von Wächter UND Negativprobe genutzt) ────────────
   Feuerbarkeit bewiesen (25.07., Sweep-Nachtrag): die Probe ruft denselben Code wie der
   Wächter (nicht eine Kopie) und misst PAARWEISE — Mutation rein → rot, raus → grün. */
const UA_MUSTER = [/navigator\.userAgent/, /navigator\.platform/,
                   /navigator\.vendor/, /navigator\.appVersion/, /userAgentData/];
function uaVerstoesse(code) {
  return UA_MUSTER.filter(m => m.test(code)).map(m => 'UA-Sniffing: ' + m);
}
const VOLLSTAENDIGKEIT_MUSTER = [/%\s*vollständig/i, /%\s*ausgefüllt/i, /%\s*komplett/i,
                                 /\d+\s*von\s*\d+\s*Feldern/i, /ausfüllgrad/i, /befüllungsgrad/i];
function vollstaendigkeitVerstoesse(text) {
  return VOLLSTAENDIGKEIT_MUSTER.filter(m => m.test(text)).map(m => 'Vollständigkeits-Indikator: ' + m);
}
function prozentZeilenVon(src) {
  const vendor = vendorZeilen(src);
  return src.split('\n').filter((z, i) => !vendor.has(i + 1))
            .filter(z => /Math\.round\(/.test(z) && /\*\s*100/.test(z));
}
const Angaben = require('../tools/lib/herkunftsort-angaben.js');
function wortmarkeVerstoesse(src) {
  const v = [];
  /* NACHGEZOGEN 10.09.2026 (Auftrag „White Label bis ins PDF") — der Ort wechselte von der
     Fußzeile (`function renderFooter()`/`ff-firma`/STRINGS.fussFirma, alle drei entfallen) zum
     Herkunftsort (Einstellungen → Recht, `data-herkunftsort`, STRINGS.herkunftPoweredBy). Die
     Diskriminante fragt jetzt genau dort, dieselbe Form wie vorher (Element + Kennung + Wert). */
  if (!/data-herkunftsort=/.test(src)) v.push('Herkunftsort-Element fehlt');
  if (!/herkunft-powered[\s\S]{0,40}herkunftPoweredBy/.test(src)) v.push('Herkunftsort rendert herkunftPoweredBy nicht');
  /* Zwei Formen gelten wie beim Vorgänger — die Negativprobe unten fährt die Tabellenform, der
     echte Kern die Satzform, und der Wächter muss beide finden. */
  const m = src.match(/(?:herkunftPoweredBy:|'strings:herkunftPoweredBy\.text':|"strings:herkunftPoweredBy\.text":)\s*"([^"]*)"/);
  if (!m) v.push('herkunftPoweredBy-String fehlt');
  else {
    /* Seit 34.7 (Angaben am Herkunftsort in EINER Quelle) trägt der Text den Platzhalter `{urheberin}`, der aus dem erzeugten Block HERKUNFTSORT_ANGABEN im Träger auflöst:
       die Wortmarke steht im AUFGELÖSTEN Text. Fehlt der Block, bleibt der Platzhalter stehen und die Diskriminante schlägt an. */
    const block = Angaben.angabenLesen(src);
    const aufgeloest = m[1].split('{urheberin}').join(block ? block.urheberin.marke : '{urheberin}');
    if (!/Vivodepot/.test(aufgeloest)) v.push('Wortmarke fehlt in herkunftPoweredBy="' + m[1] + '"');
  }
  return v;
}

test('b16-030-kein-ua-sniffing-nur-feature-detection', () => {
  for (const [name, src] of [['vivodepot.html', HTML], ['vivodepot-lesen.html', LESEN]]) {
    const verstoesse = uaVerstoesse(eigenerCode(src));
    assert.deepEqual(verstoesse, [], name + ': ' + verstoesse.join(' · ') + ' — Capability gehört per Feature-Detection');
  }
  // Positiv-Beleg (die Negativassertion trägt nicht leer): Crypto-Fähigkeit per Feature-Detection.
  assert.ok(/window\.crypto\s*&&\s*window\.crypto\.subtle/.test(HTML),
    'CRYPTO_AVAILABLE-Feature-Detection fehlt — Negativassertion hätte keinen Gegenstand');
});

test('b16-009b-wortmarke-im-footer', () => {
  // Seit S8 (U2-ADR-428) steht der deutsche Satz in der Moduldatei: Kern-Quelltext und Modul zusammen.
  const verstoesse = wortmarkeVerstoesse(HTML + '\n' + fs.readFileSync(path.join(__dirname, '..', 'tools', 'textsatz-de-modul.json'), 'utf8'));
  assert.deepEqual(verstoesse, [], 'Wortmarke im Footer: ' + verstoesse.join(' · '));
});

test('[Negativprobe] b16-030 + b16-009b feuern auf die Mutation — und nur auf sie (rot ⇄ grün)', () => {
  // b16-030: sauberer Ausschnitt → grün; UA-Verzweigung rein → rot; raus → wieder grün.
  const sauberUA = 'if (window.matchMedia && window.matchMedia("(pointer: coarse)").matches) return true;';
  assert.deepEqual(uaVerstoesse(sauberUA), [], 'Feature-Detection fälschlich als UA-Sniffing gewertet');
  for (const mutation of ['if (/iPhone/.test(navigator.userAgent)) tuWas();',
                          'const p = navigator.platform;',
                          'if (navigator.userAgentData.mobile) x();']) {
    const rot = uaVerstoesse(sauberUA + '\n' + mutation);
    assert.ok(rot.length > 0, 'Wächter blind: „' + mutation.slice(0, 40) + '…" wurde NICHT erkannt');
  }
  assert.deepEqual(uaVerstoesse(sauberUA), [], 'nach Rücknahme der Mutation nicht wieder grün');

  // b16-009b: Wortmarke entfernen → rot; wieder rein → grün.
  const sauberHerkunftsort = '<div class="herkunftsort" data-herkunftsort="1"><p class="herkunft-powered">+escapeHTML(STRINGS.herkunftPoweredBy)</p></div>\nherkunftPoweredBy: "Bereitgestellt mit Vivodepot",';
  assert.deepEqual(wortmarkeVerstoesse(sauberHerkunftsort), [], 'sauberer Herkunftsort meldet Verstöße — Diskriminante zu grob');
  const ohneMarke = sauberHerkunftsort.replace('"Bereitgestellt mit Vivodepot"', '"Bereitgestellt mit dieser App"');
  assert.ok(wortmarkeVerstoesse(ohneMarke).some(x => /Wortmarke fehlt/.test(x)),
    'Wächter blind: fehlende Wortmarke in herkunftPoweredBy wurde NICHT erkannt');
  assert.ok(wortmarkeVerstoesse(sauberHerkunftsort.replace('data-herkunftsort="1"', '')).length > 0,
    'Wächter blind: fehlendes Herkunftsort-Element wurde NICHT erkannt');
  assert.deepEqual(wortmarkeVerstoesse(sauberHerkunftsort), [], 'nach Rücknahme der Mutation nicht wieder grün');
  // Der Platzhalter-Text ist nur mit dem Block sauber: MIT Block grün, OHNE Block (die Wortmarke steht nirgends) rot.
  const block = Angaben.blockErzeugen(Angaben.quelleLesen());
  const platzhalter = sauberHerkunftsort.replace('"Bereitgestellt mit Vivodepot"', '"Bereitgestellt mit {urheberin}"');
  assert.deepEqual(wortmarkeVerstoesse(platzhalter + '\n' + block), [], 'Platzhalter MIT Block muss die Wortmarke tragen');
  assert.ok(wortmarkeVerstoesse(platzhalter).some((x) => /Wortmarke fehlt/.test(x)), 'Platzhalter OHNE Block trägt keine Wortmarke');
});

test('b16-021-kein-prozent-vollstaendigkeit-indikator', () => {
  // (a) Die einzige „* 100"-Prozent-Rechnung im Eigen-Code (Vendor raus — jsPDF u. a. rechnen intern
  //     mit * 100), die eine Anzeige treibt, ist der Wizard-Schrittbalken.
  const prozentZeilen = prozentZeilenVon(HTML);
  assert.equal(prozentZeilen.length, 1,
    'Unerwartete Prozent-Rechnung(en) — nur der Wizard-Schrittbalken ist erlaubt:\n' + prozentZeilen.join('\n'));
  assert.ok(/fort\.schritt\s*\/\s*fort\.gesamt/.test(prozentZeilen[0]),
    'die Prozent-Rechnung ist nicht der Wizard-Schrittbalken (schritt/gesamt): ' + prozentZeilen[0]);
  // (b) Keine Vollständigkeits-Anzeige über den Depot-Inhalt.
  const verstoesse = vollstaendigkeitVerstoesse(HTML);
  assert.deepEqual(verstoesse, [], verstoesse.join(' · '));
});

test('[Negativprobe] b16-021 + b16-033 feuern auf die Mutation — und nur auf sie (rot ⇄ grün)', () => {
  // b16-021 (a): eine ZWEITE Prozent-Anzeige einspeisen → Zähler steigt; raus → wieder 1.
  const istZahl = prozentZeilenVon(HTML).length;
  assert.equal(istZahl, 1, 'Ausgangslage nicht 1 Prozent-Zeile — Probe misst gegen falschen Stand');
  const mutiert = HTML + '\n  const voll = Math.round((gefuellt / felderGesamt) * 100);\n';
  assert.equal(prozentZeilenVon(mutiert).length, 2,
    'Wächter blind: eine zweite Math.round(…*100)-Anzeige wurde NICHT mitgezählt');
  assert.equal(prozentZeilenVon(HTML).length, 1, 'nach Rücknahme der Mutation nicht wieder 1');

  // b16-021 (b): Vollständigkeits-Text einspeisen → rot; raus → grün.
  assert.deepEqual(vollstaendigkeitVerstoesse('Ihre Angaben sind gespeichert.'), [],
    'harmloser Text fälschlich als Vollständigkeits-Indikator gewertet');
  for (const mutation of ['Ihr Depot ist zu 60 % vollständig.', 'Ausfüllgrad: hoch', '7 von 12 Feldern ausgefüllt']) {
    assert.ok(vollstaendigkeitVerstoesse(mutation).length > 0,
      'Wächter blind: „' + mutation + '" wurde NICHT erkannt');
  }
  assert.deepEqual(vollstaendigkeitVerstoesse('Ihre Angaben sind gespeichert.'), [],
    'nach Rücknahme der Mutation nicht wieder grün');

  // b16-033: die Härtung greift, wenn eine draggable-Reihung OHNE ↑/↓-Pfad eingeführt wird.
  const mitDnDohnePfad = '<li draggable="true">Eintrag</li>';
  assert.ok(/\bdraggable\b|addEventListener\(['"]dragstart['"]|ondragstart/.test(mitDnDohnePfad),
    'Wächter blind: draggable-Reihung würde nicht erkannt');
  assert.ok(!(/data-eintrag-hoch/.test(mitDnDohnePfad) && /data-refm-hoch/.test(mitDnDohnePfad)),
    'Härtung greift nicht: fehlender ↑/↓-Pfad würde nicht auffallen');
  // Gegenrichtung: heutiger Zustand (kein draggable) → Zweig inaktiv, kein Fehlalarm.
  assert.ok(!/\bdraggable\b|addEventListener\(['"]dragstart['"]|ondragstart/.test(eigenerCode(HTML)),
    'unerwartet: draggable im Eigen-Code — Ausgangslage der Probe stimmt nicht');
});

test('[Negativprobe] b16-033 (A556-Kette) feuert auf drei unabhängige Mutationen — und nur auf sie (rot ⇄ grün)', () => {
  // Kleine, kontrollierte Fassung derselben Form wie das echte #overlay — dieselbe Diskriminante,
  // gegen ein Fixture statt gegen 50000 Zeilen HTML (schnell, und die drei Fälle isoliert).
  const basis =
    "ov.addEventListener('drop', (e) => {\n" +
    '  const f = e.dataTransfer.files[0];\n' +
    '  if (f) zielFunktion(f);\n' +
    '});\n' +
    'function zielFunktion(vorbelegteDatei) {\n' +
    '  if (!vorbelegteDatei) {\n' +
    '    return \'<input id="x-datei" type="file">\';\n' +
    '  }\n' +
    '}\n' +
    "verdrahteEintritt('x-knopf', () => zielFunktion());\n" +
    '<button type="button" id="x-knopf">Datei öffnen</button>\n';

  // Positivkontrolle: die Basis selbst ist sauber — sonst prüften die Mutationen unten gegen
  // ein Fixture, das nie hätte grün sein können.
  assert.deepEqual(dropZonenLuecken(basis).luecken, [], 'Ausgangslage nicht sauber — Fixture prüft falschen Stand');
  assert.ok(knopfIstSichtbar(basis, 'x-knopf'), 'Ausgangslage: Knopf müsste sichtbar sein');

  // Mutation A: die Zielfunktion verliert ihren Picker (wie live gegen den echten Kern geprüft,
  // renderCryptoOverlay ohne co-datei-input).
  const mutA = basis.replace('type="file"', 'type="etwas-anderes"');
  assert.ok(dropZonenLuecken(mutA).luecken.length > 0, 'Wächter blind: Picker-Entfernung aus der Zielfunktion würde nicht auffallen');

  // Mutation B: die Nicht-Drop-Verdrahtung fehlt — nur noch per Drop erreichbar (genau der Fund,
  // den die erste Fassung dieser Probe selbst noch übersah, s. Bericht).
  const mutB = basis.replace("verdrahteEintritt('x-knopf', () => zielFunktion());\n", '');
  assert.ok(dropZonenLuecken(mutB).luecken.length > 0, 'Wächter blind: fehlende Nicht-Drop-Verdrahtung würde nicht auffallen');

  // Mutation C: der Knopf existiert, ist aber versteckt.
  const mutC = basis.replace('<button type="button" id="x-knopf">', '<button type="button" id="x-knopf" hidden>');
  assert.ok(!knopfIstSichtbar(mutC, 'x-knopf'), 'Wächter blind: ein versteckter Knopf würde als sichtbar durchgehen');

  // Rückstellung: die unveränderte Basis bleibt sauber.
  assert.deepEqual(dropZonenLuecken(basis).luecken, []);
  assert.ok(knopfIstSichtbar(basis, 'x-knopf'));
});

test('b16-033-jeder-drop-hat-nicht-dnd-pfad', () => {
  const { luecken, gefunden } = dropZonenLuecken(HTML);
  assert.ok(gefunden >= 1,
    'kein Drop-Handler gefunden — die Assertion hätte keinen Gegenstand (Struktur geändert?)');
  // Präzisierte Fassung (A556): jeder gefundene Drop-Handler trägt selbst eine erreichbare
  // Ziel-Funktion, DIESE Funktion rendert bei fehlender Vorbelegung einen echten Picker, UND
  // dieselbe Funktion ist nachweislich auch ohne Drop erreichbar — nicht nur „existiert irgendwo".
  assert.deepEqual(luecken, [], luecken.join(' / '));
  // Positivkontrolle: der heute konkret bekannte Ersatzweg (Welcome-Knopf „Datei öffnen")
  // muss unter den gefundenen sichtbaren Knöpfen sein — sonst prüfte die Kette oben zufällig
  // gegen einen anderen Knopf und der bekannte Fall selbst bliebe ungeprüft.
  assert.ok(knopfIstSichtbar(HTML, 'w-datei'),
    'Welcome-Knopf „w-datei" (Datei öffnen) fehlt oder ist versteckt/sr-only — kein sichtbarer Ersatzweg');

  // Härtung (§12d) — kein Vakuum-Grün: eine draggable-/dragstart-Reihung ist nur erlaubt, wenn der
  // bediente ↑/↓-Pfad (data-eintrag-hoch/data-refm-hoch, tastatur-/screenreader-fähig) existiert.
  // Heute existiert keine draggable-Reihung → Zweig inaktiv (grün); führt jemand später eine ein,
  // ohne die ↑/↓-Knöpfe mitzunehmen, wird der Test rot. Situations-Katalog bleibt fester Katalog.
  const hatReihungsDnD = /\bdraggable\b|addEventListener\(['"]dragstart['"]|ondragstart/.test(eigenerCode(HTML));
  if (hatReihungsDnD) {
    assert.ok(/data-eintrag-hoch/.test(HTML) && /data-refm-hoch/.test(HTML),
      'draggable-Reihung eingeführt, aber kein erreichbarer ↑/↓-Pfad (data-eintrag-hoch/data-refm-hoch)');
  }
});

test('[Klausel] Bindung §12 an ' + ADR + ' über das Fundament', () => {
  bindungPruefen(ADR, 'invariante', PRUEFUNGEN, __filename);
  bindungPruefen(ADR, 'entscheidung', PRUEFUNGEN_ENTSCHEIDUNG, __filename);
});

/* ── Proben-Deklaration (U2-ADR-099 B-2, Konvention aus B-1) ─────────────────
   Diese Waechter TRUGEN bereits eine Negativprobe — nur nicht maschinenlesbar. Der
   Pruefstand konnte deshalb nur sehen, dass irgendwo in der Datei eine [Negativprobe]
   steht, nicht ob sie DIESEM Waechter gilt: ein schwacher Beleg. Mit der Deklaration
   entscheidet der Aufruf-Nachweis es mechanisch — Diskriminante instrumentieren,
   Waechter im Kindprozess fahren, rot erwarten. REFERENZ, nicht Zeichenkette. */
module.exports = {
  PROBEN: [
    { fuer: 'b16-030-kein-ua-sniffing-nur-feature-detection', diskriminante: uaVerstoesse },
    { fuer: 'b16-009b-wortmarke-im-footer',                   diskriminante: wortmarkeVerstoesse },
  ],
};
