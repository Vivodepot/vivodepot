#!/usr/bin/env node
'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   A445 · ZUG 0 — WAS KANN DIE ANWENDUNG HEUTE ÜBER EINEN GÜLTIGKEITSBEGINN?
   ────────────────────────────────────────────────────────────────────────────
   ENTSCHIEDEN am 21.08.2026: „Gültigkeitsbeginn bauen." Das
   Entscheidungsblatt sagt dazu: *„Im Depot steht, bis wann etwas gilt, nicht ab
   wann. … Gemessen ist: es gibt nichts nachzuziehen, die Lücke ist leer."*

   DIESES WERKZEUG PRÜFT GENAU DIESEN SATZ, bevor gebaut wird — dieselbe Ordnung
   wie bei A446, wo Zug 0 die halbe Auftragsgrundlage widerlegt hat. Es geht
   Station für Station durch die Kette, die eine Angabe zurücklegen muss:

     1 SPEICHER kann `data.feldGueltigkeit` ein `von` halten?
     2 SCHREIBWEG gibt es einen Weg, der es setzt — und ist er von der
                   Oberfläche aus erreichbar, oder nur aus einer Probe?
     3 EINGABE wird ein Eingabefeld dafür überhaupt gerendert?
     4 LESEWEG kommt es wieder heraus?
     5 ANTWORT kann jemand fragen „gilt das am Stichtag?"
     6 AUFRUFER fragt das im PRODUKT je jemand?
     7 AUSGABE reist die Angabe in den Export?

   OHNE POSITIVKONTROLLE JE STATION wäre „steht" nicht von „gemessen mit einem
   Werkzeug, das nichts sieht" zu unterscheiden. Jede Station prüft darum an
   einem Gegenstand, von dem bekannt ist, dass er existiert.
   ════════════════════════════════════════════════════════════════════════════ */
const path = require('node:path');
const fs = require('node:fs');

const BEREICH = 'wohnen';
const FELD = 'tpl_bescheinigung';          // ein angedocktes Feld, kein eingebautes
const VON = '2026-01-01';
const BIS = '2026-09-30';

function kernText() {
  return fs.readFileSync(process.env.KERN_HTML_PATH
    || path.join(__dirname, '..', 'vivodepot.html'), 'utf8');
}

function depot(V) {
  const d = V.leeresDepot();
  d.feldDefinitionen = [{ sektorId: BEREICH, feldId: FELD, typ: 'datum', label: 'Bescheinigung' }];
  V.setData(d);
  return d;
}

function messen(V) {
  const text = kernText();
  const st = [];
  const d = depot(V);

  /* 1 · SPEICHER */
  V.feldGueltigkeitSetzen(BEREICH, FELD, VON, BIS);
  const gelesen = V.feldGueltigkeitLesen(BEREICH, FELD);
  st.push({ station: '1 SPEICHER', frage: 'hält `data.feldGueltigkeit` ein `von`?',
    befund: (gelesen && gelesen.von === VON) ? 'JA' : 'nein',
    kontrolle: (gelesen && gelesen.bis === BIS) ? '`bis` kommt ebenfalls an' : 'ROT: auch `bis` fehlt' });

  /* 2 · SCHREIBWEG — von der Oberfläche aus, nicht nur aus einer Probe. */
  const handler = /_gueltigSchreiben\s*=\s*\(bezug, welche, wert\)/.test(text);
  const verdrahtet = /data-gueltig-von/.test(text) && /\[data-gueltig-von\]/.test(text);
  st.push({ station: '2 SCHREIBWEG', frage: 'setzt ein Bedien-Handler das `von`?',
    befund: (handler && verdrahtet) ? 'JA — `_gueltigSchreiben(…, \'von\', …)` an `[data-gueltig-von]`' : 'nein',
    kontrolle: /\[data-gueltig-bis\]/.test(text) ? 'der `bis`-Zwilling ist ebenso verdrahtet' : 'ROT: auch `bis` nicht verdrahtet' });

  /* 3 · EINGABE — für welche Felder entsteht die Zeile überhaupt? */
  // 16.09.2026: der Feldbezug steht seit dem Sicherheits-Fix maskiert im Attribut (escapeAttr).
  const zeileFuerJedesDatum = /if \(feld\.typ !== 'datum' && !mitMarke\) return '';/.test(text);
  st.push({ station: '3 EINGABE', frage: 'wird ein Eingabefeld gerendert?',
    befund: zeileFuerJedesDatum ? 'JA — für JEDES Datumsfeld, nicht nur für markierte' : 'nein',
    kontrolle: /data-gueltig-von="' \+ (?:escapeAttr\()?bezug/.test(text) ? 'das Eingabefeld trägt den Feldbezug' : 'ROT: kein Bezug am Eingabefeld' });

  /* 4 · LESEWEG */
  st.push({ station: '4 LESEWEG', frage: 'kommt das `von` wieder heraus?',
    befund: (V.feldGueltigkeitLesen(BEREICH, FELD) || {}).von === VON ? 'JA' : 'nein',
    kontrolle: V.feldGueltigkeitLesen(BEREICH, 'ein_feld_ohne_alles') === null
      ? 'ein Feld ohne Angabe liefert `null`, nicht einen erfundenen Wert' : 'ROT' });

  /* 5 · ANTWORT */
  const innerhalb = V.feldGiltAm(BEREICH, FELD, '2026-06-01');
  const davor = V.feldGiltAm(BEREICH, FELD, '2025-12-31');
  const danach = V.feldGiltAm(BEREICH, FELD, '2026-10-01');
  st.push({ station: '5 ANTWORT', frage: '„gilt das am Stichtag?"',
    befund: (innerhalb === true && davor === false && danach === false)
      ? 'JA — `feldGiltAm` unterscheidet davor / innerhalb / danach' : 'nein',
    kontrolle: V.feldGiltAm(BEREICH, 'ein_feld_ohne_alles', '2026-06-01') === true
      ? 'unbekannt heisst „wie bisher", nicht „ungültig"' : 'ROT: unbekannt wird als ungültig gewertet' });

  /* 6 · AUFRUFER — die Station, an der es hakt. */
  const aufrufe = (text.match(/feldGiltAm\(/g) || []).length;
  const leseApp = (fs.readFileSync(path.join(__dirname, '..', 'vivodepot-lesen.html'), 'utf8')
    .match(/feldGiltAm\(/g) || []).length;
  st.push({ station: '6 AUFRUFER', frage: 'fragt das im PRODUKT je jemand?',
    befund: (aufrufe <= 1 && leseApp === 0)
      ? ('NEIN — ' + aufrufe + ' Vorkommen im Kern (nur die Definition), ' + leseApp + ' in der Lese-App')
      : ('ja — ' + aufrufe + ' im Kern, ' + leseApp + ' in der Lese-App'),
    kontrolle: (text.match(/feldGueltigkeitLesen\(/g) || []).length > 3
      ? 'Gegenprobe: `feldGueltigkeitLesen` hat sehr wohl Aufrufer — die Zählweise sieht welche' : 'ROT: die Zählweise findet nirgends Aufrufer' });

  /* 7 · AUSGABE */
  const imExport = /VOLLEXPORT_FELDWEISE_SCHLUESSEL[\s\S]{0,120}feldGueltigkeit/.test(text);
  st.push({ station: '7 AUSGABE', frage: 'reist die Angabe in den Export?',
    befund: imExport ? 'JA — `feldGueltigkeit` steht in den feldweisen Export-Schlüsseln' : 'nein',
    kontrolle: /ausdruecklichKeine/.test(text) ? 'derselbe Schlüsselsatz führt auch `ausdruecklichKeine`' : 'ROT' });

  /* Der Bestand: welche Felder tragen heute welche Marke? */
  const marken = { laeuftAb: [], giltAb: [] };
  for (const s of V.bereicheAlle()) {
    for (const sek of (s.sektionen || [])) {
      for (const f of (sek.felder || [])) {
        for (const m of (f.marken || [])) if (marken[m]) marken[m].push(s.id + '.' + f.id);
        for (const u of (f.unterFelder || [])) {
          for (const m of (u.marken || [])) if (marken[m]) marken[m].push(s.id + '.' + f.id + '/' + u.id);
        }
      }
    }
  }
  return { stationen: st, marken };
}

function bericht(m) {
  const z = [];
  for (const s of m.stationen) {
    z.push(s.station + ' · ' + s.frage);
    z.push('      Befund     : ' + s.befund);
    z.push('      Kontrolle  : ' + s.kontrolle);
  }
  z.push('');
  z.push('Bestand der Marken:');
  z.push('  laeuftAb (' + m.marken.laeuftAb.length + '): ' + m.marken.laeuftAb.join(' · '));
  z.push('  giltAb   (' + m.marken.giltAb.length + '): ' + (m.marken.giltAb.join(' · ') || '(kein Feld)'));
  return z.join('\n');
}

function laufen(kernPfad) {
  if (kernPfad) process.env.KERN_HTML_PATH = kernPfad;
  const { ladeKern } = require(path.join(__dirname, '..', 'tests', 'load-kern.js'));
  return messen(ladeKern().V);
}

if (require.main === module) {
  const i = process.argv.indexOf('--kern');
  const m = laufen(i > -1 ? process.argv[i + 1] : null);
  console.log(bericht(m));
  const kaputt = m.stationen.filter((s) => s.kontrolle.startsWith('ROT'));
  if (kaputt.length) { console.error('\nABBRUCH: ' + kaputt.length + ' Station(en) ohne tragende Positivkontrolle.'); process.exit(2); }
}

module.exports = { messen, bericht, laufen, BEREICH, FELD, VON, BIS };
