'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   Wie viele Felder trügen die Fristen-Marke? — die Vollerhebung
   ────────────────────────────────────────────────────────────────────────────
   Kreise-Laufzettel Posten 3, Zug 0. Sechs Felder sind im Auftrag benannt
   (Nachprüfung, Umzug-Kündigung, Auszug, Übergabe, zwei Meldefristen) — **sie
   stammen aus einem Nachtrag, nicht aus einer Vollerhebung.** Dieses Werkzeug
   zählt ALLE Datumsfelder des Katalogs, damit die Zahl aus dem Bestand kommt.

   DER UNTERSCHIED, um den es geht, ist die FOLGE, nicht das Datum:
     · `laeuftAb` — eine Gültigkeit endet, die Sache besteht weiter. Man erneuert.
     · `frist`    — eine Frist verstreicht, und sie NIMMT ETWAS WEG.

   Das Werkzeug ZÄHLT und legt die Belege daneben (Kennung, Beschriftung, Hinweis,
   heutige Marke). **Es entscheidet nicht** — welche Sorte ein Feld ist, steht im
   Bericht, weil es eine fachliche Frage ist und keine mechanische.

     node tools/frist-kandidaten-erheben.js [--json <pfad>]
   ════════════════════════════════════════════════════════════════════════════ */
const path = require('node:path');
const fs = require('node:fs');
const { ladeKern } = require(path.join(__dirname, '..', 'tests', 'load-kern.js'));

const args = process.argv.slice(2);
const jsonZiel = (() => { const i = args.indexOf('--json'); return (i >= 0 && args[i + 1]) ? args[i + 1] : null; })();

/* Wörter, die auf eine FRIST deuten, und Wörter, die auf eine GÜLTIGKEIT deuten.
   Sie sind ein Suchraster, kein Urteil — jeder Treffer wird im Bericht einzeln
   gelesen. Die Trennung „bis" gegen „Frist" trägt allein nicht: „gültig bis" ist
   eine Gültigkeit, „Kündigung bis" eine Frist, und beide tragen dasselbe Wort. */
const WORT_FRIST = ['frist', 'kündigung', 'kuendigung', 'auszug', 'übergabe', 'uebergabe',
  'meldung', 'melden', 'spätestens', 'spaetestens', 'innerhalb', 'nachprüfung', 'nachpruefung',
  'antrag', 'einspruch', 'widerspruch', 'ausschlagung', 'kenntnis'];
const WORT_GUELTIG = ['gültig', 'gueltig', 'befristet', 'ablauf', 'haltbar', 'läuft ab', 'laeuft ab'];
const WORT_RUECKBLICK = ['zuletzt', 'geprüft', 'geprueft', 'ausgestellt', 'seit', 'bescheid vom'];

function treffer(text, woerter) {
  const t = String(text || '').toLowerCase();
  return woerter.filter((w) => t.includes(w));
}

function main() {
  const { V } = ladeKern();
  const felder = [];

  const aufnehmen = (kennung, def, ort) => {
    if (!def || def.typ !== 'datum') return;
    const text = [def.id, def.label, def.hint, def.hilfetext].filter(Boolean).join(' ');
    felder.push({
      kennung, ort,
      label: def.label || null,
      hinweis: def.hint || null,
      markenHeute: Array.isArray(def.marken) ? def.marken.slice() : [],
      wortFrist: treffer(text, WORT_FRIST),
      wortGueltigkeit: treffer(text, WORT_GUELTIG),
      wortRueckblick: treffer(text, WORT_RUECKBLICK),
      gueltigkeitVorschlag: !!def.gueltigkeitVorschlag,
    });
  };

  for (const sek of V.bereicheAlle()) {
    for (const abschnitt of (sek.sektionen || [])) {
      for (const f of (abschnitt.felder || [])) {
        aufnehmen(sek.id + '.' + f.id, f, 'Bereichsfeld');
        for (const uf of (f.unterFelder || [])) {
          aufnehmen(sek.id + '.' + f.id + '[].' + uf.id, uf, 'Listen-Unterfeld');
        }
      }
    }
  }
  // Die situations-EIGENEN Felder (`sit:`-Namensraum) — sie stehen in keinem Bereich.
  for (const s of (V.SITUATIONEN || [])) {
    for (const b of (s.bloecke || [])) {
      for (const e of (b.eintraege || [])) {
        if (e && e.feld && typeof e.feld === 'object') aufnehmen('sit:' + s.id + '.' + e.feld.id, e.feld, 'Situationsfeld');
      }
    }
  }

  const mitMarke = felder.filter((f) => f.markenHeute.length);
  const ohneMarke = felder.filter((f) => !f.markenHeute.length);
  const kandidaten = ohneMarke.filter((f) => f.wortFrist.length && !f.wortGueltigkeit.length);
  const gueltigkeitOhneMarke = ohneMarke.filter((f) => f.wortGueltigkeit.length);
  const rueckblickend = ohneMarke.filter((f) => f.wortRueckblick.length && !f.wortFrist.length && !f.wortGueltigkeit.length);

  /* Darf ein MODUL die Marke mitbringen? Gemessen, nicht angenommen: die Marken sind eine
     geschlossene Werteliste, und `feldMarkenPruefen` verwirft Unbekanntes NAMENTLICH. Eine
     neue Marke `frist` wäre damit für Module automatisch erlaubt, sobald sie in der Liste
     steht — und vorher wird sie benannt verworfen, nicht verschluckt. */
  const modulProbe = {
    erlaubteMarkenHeute: V.FELD_MARKEN_ERLAUBT.slice(),
    fristHeuteErlaubt: V.FELD_MARKEN_ERLAUBT.includes('frist'),
    unbekannteWirdBenannt: V.feldMarkenPruefen(['frist', 'laeuftAb']),
  };

  /* WAS SCHON GEBAUT IST, und es stand in keinem Auftrag: `_fristHinweisFuerFeld` rechnet
     HEUTE Fristen — hart verdrahtet, als `switch` über die Feld-Kennung. Vier echte Fristen
     (§ 28 PStG, § 1944 BGB, zwei Monate KV-Anmeldung, § 84 SGG) und zwei Ausweis-Vorschläge.
     Aus dem QUELLTEXT gelesen, nicht aus dem Gedächtnis. */
  const quelle = fs.readFileSync(path.join(__dirname, '..', 'vivodepot.html'), 'utf8');
  const block = quelle.slice(quelle.indexOf('function _fristHinweisFuerFeld'));
  const kopf = block.slice(0, block.indexOf('\n}'));
  const faelle = Array.from(kopf.matchAll(/case '([^']+)':/g)).map((m) => m[1]);
  // Kommt eine dieser Kennungen mehr als einmal im Katalog vor, träfe der `switch` das
  // falsche Feld — er unterscheidet nur die Kennung, nicht den Bereich.
  const vorkommen = Object.create(null);
  const zaehl = (id, ort) => { (vorkommen[id] || (vorkommen[id] = [])).push(ort); };
  for (const sek of V.bereicheAlle()) {
    for (const abschnitt of (sek.sektionen || [])) {
      for (const f of (abschnitt.felder || [])) {
        zaehl(f.id, sek.id);
        for (const uf of (f.unterFelder || [])) zaehl(uf.id, sek.id + '.' + f.id + '[]');
      }
    }
  }
  for (const s of (V.SITUATIONEN || [])) {
    for (const b of (s.bloecke || [])) {
      for (const e of (b.eintraege || [])) if (e && e.feld && typeof e.feld === 'object') zaehl(e.feld.id, 'sit:' + s.id);
    }
  }
  const hartVerdrahtet = {
    faelle,
    anzahl: faelle.length,
    jeFallVorkommen: Object.fromEntries(faelle.map((f) => [f, vorkommen[f] || []])),
    mehrdeutigHeute: faelle.filter((f) => (vorkommen[f] || []).length > 1),
    kennungenDieMehrfachVorkommen: Object.keys(vorkommen).filter((k) => vorkommen[k].length > 1).length,
  };

  const bericht = {
    erzeugt: new Date().toISOString(),
    datumsfelderGesamt: felder.length,
    mitMarkeHeute: mitMarke.length,
    ohneMarke: ohneMarke.length,
    kandidatenFrist: kandidaten.length,
    gueltigkeitOhneMarke: gueltigkeitOhneMarke.length,
    rueckblickend: rueckblickend.length,
    modulProbe,
    hartVerdrahtet,
    listen: {
      mitMarkeHeute: mitMarke.map((f) => f.kennung),
      kandidatenFrist: kandidaten.map((f) => ({ kennung: f.kennung, ort: f.ort, label: f.label, worte: f.wortFrist })),
      gueltigkeitOhneMarke: gueltigkeitOhneMarke.map((f) => ({ kennung: f.kennung, ort: f.ort, label: f.label })),
      rueckblickend: rueckblickend.map((f) => ({ kennung: f.kennung, label: f.label })),
      restOhneSignal: ohneMarke.filter((f) => !f.wortFrist.length && !f.wortGueltigkeit.length && !f.wortRueckblick.length)
        .map((f) => ({ kennung: f.kennung, label: f.label })),
    },
    alleFelder: felder,
  };

  const j = JSON.stringify(bericht, null, 2);
  if (jsonZiel) { fs.writeFileSync(jsonZiel, j); console.log('geschrieben: ' + jsonZiel); }
  console.log('frist-hart-verdrahtet: ' + hartVerdrahtet.anzahl + ' Faelle im switch · '
    + hartVerdrahtet.mehrdeutigHeute.length + ' davon mehrdeutig · '
    + hartVerdrahtet.kennungenDieMehrfachVorkommen + ' Kennungen kommen im Katalog mehrfach vor');
  console.log('frist-kandidaten: ' + felder.length + ' Datumsfelder · ' + mitMarke.length + ' mit Marke · '
    + kandidaten.length + ' Frist-Kandidaten · ' + gueltigkeitOhneMarke.length + ' Gültigkeit ohne Marke · '
    + rueckblickend.length + ' rückblickend');
  if (!jsonZiel) console.log(j);
}
main();
