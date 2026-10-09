#!/usr/bin/env node
'use strict';
/* ═══════════════════════════════════════════════════════════════════════════════════════════════
   marker-bestand-pruefen.js — jede Marker-Region im Kern steht in der W0-Positivliste (v894, 02.10.2026, Auflage der Gegenlesung)
   ───────────────────────────────────────────────────────────────────────────────────────────────
   WARUM. Eine Marker-Region (`NAME:BEGIN` … `NAME:END`) nimmt ihren Inhalt aus der zweiten Achse des Gerüst-Wächters W0
   (tools/geruest-waechter-pruefen.js): was darin steht, zählt nicht als Gerüst. Am 02.10.2026 lag genau so ein Regelblock des
   Erscheinungsbilds unbemerkt außerhalb der Zählung — W0 maß +3757 Byte, richtig waren +7987. Eine Region, die niemand
   eingetragen hat, ist ein Versteck. Dieser Wächter verlangt darum für JEDEN Marker-Namen im Kern einen Eintrag in der
   W0-Positivliste (tools/geruest-waechter-grundlinie.json: `konstanten` mit Andockpunkt, `regionen.dauerhaft`,
   `regionen.uebergang`) oder in der eigenen, begründeten Liste `MARKER_AUSSERHALB_W0` unten — einzeln, je mit Grund.

   Gelesen wird wie W0 selbst (indexOf ':BEGIN', Namenszeichen davor), damit beide dieselben Regionen sehen.

     node tools/marker-bestand-pruefen.js            Bestandsaufnahme (je Name: im Kern, in welcher Liste)
     node tools/marker-bestand-pruefen.js --gate     Exit 1 bei einem Namen ohne Eintrag oder einem Eintrag ohne Namen
     node tools/marker-bestand-pruefen.js --dokument <pfad>
   Probe: tests/marker-bestand.test.js
   ═══════════════════════════════════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const path = require('node:path');

const REPO = path.join(__dirname, '..');
const KERN = path.join(REPO, 'vivodepot.html');
const W0 = path.join(REPO, 'tools', 'geruest-waechter-grundlinie.json');

/* Marker, die nicht in der W0-Positivliste stehen — je EINZELN mit Grund, entschieden am 02.10.2026 nach der
   Bestandsaufnahme (Bericht v894). Keine Sammelausnahme: eine neue Region braucht eine eigene Zeile hier oder in W0.
   EINGETEILT NACH INHALT, NICHT NACH NAMEN (Gegenlesung, 02.10.2026: „Übergang bleibt nur, was heute Inhalt trägt"; „jeder
   AB_WERK_*_PRODUKT-Platz ist dauerhaft mit Sollwert leer"):
     DAUERHAFT, art 'leer'      ein Backplatz, den der Bau füllt; im Gerüst LEER — das prüft `leerImGeruest` (Sollwert).
     DAUERHAFT, art 'mechanik'  Code bzw. Zusicherung, die ins Gerüst gehört.
     UEBERGANG                  trägt heute Inhalt, der das Gerüst verlassen muss, je mit Abbaupfad (wer, welche Fassung). Exakt
                                gedeckelt (UEBERGANG_DECKEL), darf nur SINKEN.
   „Befund W0-BLIND" = W0 sieht die Zuweisungsform und Regionen ohne AB_WERK-Präfix nicht; Eigentümer ist die Achsen-Ratsche, Umbau in v892
   (regionenStruktur) — dann wandern die leeren Plätze in die W0-Positivliste. */
const MARKER_DAUERHAFT = Object.freeze({
  'ENTWICKLERLEISTE': { art: 'mechanik', grund: 'Code der Entwicklerleiste (?dev=1), keine Nutzlast; produktTextErzeugen schneidet die vier Spannen aus jedem Produkt (der Schnitt-Probe der Entwicklerleiste). Vermerkt: 77 B struktur darin zählt W0 nicht.' },
  'ZUSICHERUNGS-SCHLUESSEL-KERN': { art: 'mechanik', grund: 'Die Zusicherungs-Schlüssel des Kerns — die Versprechen sitzen im Gerüst (Entscheidung 03.09.2026, U2-ADR-423).' },
  'SCHUTZ-SCHLUESSEL-KERN': { art: 'mechanik', grund: 'Die Kennungen, die nur die Anwendung selbst setzt (Haftung, amtlicher Wortlaut), erzeugt von tools/schutz-schluessel-erheben.js — gehört wie die Zusicherungs-Schlüssel ins Gerüst (04.10.2026).' },
  'ABWERK-SCHUTZ-ZURUECKGEZOGEN-KERN': { art: 'mechanik', grund: 'Fingerabdrücke früher ausgelieferter Sprach-Fassungen, deren geschützte Texte nicht mehr gelten; ihnen vertraut der Kern für den Schutz nicht, es gilt der Rückfall mit Sprachangabe (HAFTUNG-SPRACHGRENZE, 07.10.2026).' },
  'ABWERK-FRUEHERE-FASSUNGEN-KERN': { art: 'mechanik', grund: 'Fingerabdrücke früher ausgelieferter Ab-Werk-Logikmodule, erzeugt aus den ausgelieferten Ständen; daran erkennt der Kern eine alte Ab-Werk-Kopie, die er beim Öffnen ersetzt (E4, 04.10.2026).' },
  'REZEPT-FINGERABDRUECKE-KERN': { art: 'mechanik', grund: 'Fingerabdrücke der Nutzlasten aller Vivodepot-Rezepte, erzeugt von tools/rezept-fingerabdruecke-erheben.js; daran erkennt der Kern Ab-Werk-Inhalt (04.10.2026).' },
  'AB_WERK_VOR_DEPOT_KONFIGURATION': { art: 'leer', grund: 'HTML-Backplatz: window.__vorDepotKonfiguration = null; produktTextErzeugen füllt ihn beim Bau. W0 kennt nur JS-Konstanten (Befund W0-BLIND, Achsen-Ratsche v892).' },
  'AB_WERK_SERVICE_WORKER_VORHANDEN': { art: 'leer', grund: 'HTML-Backplatz: window.__abWerkServiceWorkerVorhanden = null; produktTextErzeugen setzt ihn beim Bau. W0 kennt nur JS-Konstanten (Befund W0-BLIND, Achsen-Ratsche v892).' },
  'AB_WERK_BEREICHS_ERSATZ': { art: 'leer', grund: 'Backplatz des Bereichsersatzes in Zuweisungsform, im Gerüst ohne Zeile; W0 sieht ihn als Konstante nicht (Befund W0-BLIND, Achsen-Ratsche v892).' },
  'BEREICHE_NATIV_KATALOG': { art: 'leer', grund: 'Backplatz des nativen Bereichskatalogs (= null), gefüllt aus tools/bereiche-nativ-katalog-modul.json; Region ohne AB_WERK-Präfix (Befund W0-BLIND, Achsen-Ratsche v892).' },
  'LEBENSLAGEN_KATALOG': { art: 'leer', grund: 'Backplatz des Lebenslagen-Katalogs (= null), gefüllt aus tools/lebenslagen-katalog-modul.json; Region ohne AB_WERK-Präfix (Befund W0-BLIND, Achsen-Ratsche v892).' },
});
const MARKER_UEBERGANG = Object.freeze({
  'KENNUNG-MAPPING': 'Trägt Inhalt der Achse Felder (97 KB) — Abbaupfad bei der Achsen-Ratsche (Achsen-Ratsche tools/geruest-achsen-halter.json, ab v892).',
  'FIM-BEZUEGE': 'Trägt Inhalt der Achse Felder (2 KB) — Abbaupfad bei der Achsen-Ratsche (Achsen-Ratsche tools/geruest-achsen-halter.json, ab v892).',
});
const UEBERGANG_DECKEL = 2;   // v896: PDF-INTER-B64 ist ins Erscheinungsbild-Modul gezogen
const MARKER_AUSSERHALB_W0 = Object.freeze({ ...Object.fromEntries(Object.entries(MARKER_DAUERHAFT).map(([n, e]) => [n, e.grund])), ...MARKER_UEBERGANG });

/* Sollwert „leer im Gerüst" eines Backplatzes: zwischen den Markern, ohne Kommentare, nur nichts oder EINE Zuweisung eines
   leeren Werts (null, [], {}, Object.freeze([])) — auch in einer <script>-Hülle. */
function leerImGeruest(text, name) {
  const a = text.indexOf(name + ':BEGIN');
  const e = text.indexOf(name + ':END', a);
  if (a < 0 || e < 0) return false;
  let innen = text.slice(text.indexOf('\n', a) + 1, text.lastIndexOf('\n', e));
  innen = innen.replace(/\/\*[\s\S]*?\*\//g, '').replace(/<!--[\s\S]*?-->/g, '').replace(/<script[^>]*>|<\/script>/g, '').trim();
  return innen === '' || /^(const\s+[A-Za-z_$][\w$]*|[A-Za-z_$][\w$.]*)\s*=\s*(null|\[\]|\{\}|Object\.freeze\(\[\]\))\s*;?$/.test(innen);
}

function markerImText(text) {
  const namenszeichen = /[A-Za-z0-9_-]/;
  const funde = new Map();
  for (let i = text.indexOf(':BEGIN'); i >= 0; i = text.indexOf(':BEGIN', i + 1)) {
    let von = i;
    while (von > 0 && namenszeichen.test(text[von - 1])) von -= 1;
    const name = text.slice(von, i);
    if (!name) continue;
    const zeile = text.slice(0, von).split('\n').length;
    const e = funde.get(name) || { name, begin: 0, ende: text.indexOf(name + ':END', i) >= 0, zeilen: [] };
    e.begin += 1;
    e.zeilen.push(zeile);
    funde.set(name, e);
  }
  return [...funde.values()].sort((a, b) => a.zeilen[0] - b.zeilen[0]);
}

function positivliste(grundlinie = JSON.parse(fs.readFileSync(W0, 'utf8'))) {
  const liste = new Map();
  for (const k of grundlinie.konstanten || []) if (k.marker) liste.set(k.name, 'W0 konstanten');
  for (const r of (grundlinie.regionen && grundlinie.regionen.dauerhaft) || []) liste.set(r.name, 'W0 regionen.dauerhaft');
  for (const r of (grundlinie.regionen && grundlinie.regionen.uebergang) || []) liste.set(r.name, 'W0 regionen.uebergang');
  for (const [name, e] of Object.entries(MARKER_DAUERHAFT)) liste.set(name, 'dauerhaft (' + e.art + ') außerhalb W0: ' + e.grund);
  for (const [name, grund] of Object.entries(MARKER_UEBERGANG)) liste.set(name, 'Übergang: ' + grund);
  return liste;
}

function bestand({ text = fs.readFileSync(KERN, 'utf8'), grundlinie } = {}) {
  const liste = positivliste(grundlinie);
  const marker = markerImText(text);
  const imKern = new Set(marker.map((m) => m.name));
  return {
    marker: marker.map((m) => ({ ...m, liste: liste.get(m.name) || null })),
    ohneEintrag: marker.filter((m) => !liste.has(m.name)).map((m) => m.name),
    eintragOhneMarker: [...liste.keys()].filter((n) => !imKern.has(n)),
    ohneEnde: marker.filter((m) => !m.ende).map((m) => m.name),
    nichtLeer: Object.entries(MARKER_DAUERHAFT).filter(([n, e]) => e.art === 'leer' && imKern.has(n) && !leerImGeruest(text, n)).map(([n]) => n),
  };
}

function main(argv) {
  const dok = argv.includes('--dokument') ? argv[argv.indexOf('--dokument') + 1] : null;
  const b = bestand(dok ? { text: fs.readFileSync(path.resolve(dok), 'utf8') } : {});
  console.log('[marker-bestand] ' + b.marker.length + ' Marker-Namen im Kern; ohne Eintrag: ' + b.ohneEintrag.length
    + '; Eintrag ohne Marker: ' + b.eintragOhneMarker.length + '; ohne :END: ' + b.ohneEnde.length);
  for (const m of b.marker) console.log('  ' + (m.liste ? '✓' : '✗') + ' ' + m.name + '  (Zeile ' + m.zeilen.join(', ') + (m.begin > 1 ? ', ' + m.begin + '× BEGIN' : '') + ')  ' + (m.liste || 'KEIN EINTRAG'));
  for (const n of b.eintragOhneMarker) console.log('  ✗ ' + n + '  (in der Liste, aber kein Marker im Kern)');
  for (const n of b.nichtLeer) console.log('  ✗ ' + n + '  (Backplatz trägt im Gerüst Inhalt — Sollwert leer)');
  const rot = b.ohneEintrag.length || b.eintragOhneMarker.length || b.ohneEnde.length || b.nichtLeer.length;
  return argv.includes('--gate') && rot ? 1 : 0;
}

module.exports = { markerImText, positivliste, bestand, leerImGeruest, MARKER_AUSSERHALB_W0, MARKER_DAUERHAFT, MARKER_UEBERGANG, UEBERGANG_DECKEL };

if (require.main === module) process.exit(main(process.argv.slice(2)));
