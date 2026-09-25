#!/usr/bin/env node
'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   vier-produkte-erzeugen.js — erzeugt VD Privat DE/EN und VD Pro DE/EN,
   jedes einzeln im Browser aufmachbar (Auftrag, 07.09.2026)
   ────────────────────────────────────────────────────────────────────────────
   "Bau jetzt die vier Produkte. Nicht vorbereiten — erzeugen." Nutzt
   tools/produkt-konfektionieren.js (der Weg) mit der Zusammensetzung aus
   tools/lib/vier-produkte.js (der Inhalt, entschieden). Prüft
   danach Wächter 1 (Gerüst byte-gleich) und Wächter 2 (genau EIN Sprachmodul je
   Produkt — seit S8, U2-ADR-428, ist Deutsch ein Sprachmodul wie Englisch).

   EXIT-CODE (21.09.2026): schlägt ein Wächter an, endet der Lauf mit 1. Bis dahin druckte
   dieses Werkzeug „✗" und endete mit 0 — nach S8 stand dort für privat-de und pro-de
   „erwartet 0", und niemand erfuhr es, weil nichts danach fragte. Gebunden ist es durch
   tests/erzeuger-exit-bindung.test.js (fährt den Prozess) — ohne eigenen Hook.

   GESTRICHEN, NICHT REPARIERT (08.09.2026, Fund, nach e2s Einbacken
   cdb84407/a10fa882): der frühere, hier informative Wächter 3 ("deutsche
   Zeilen im englischen Produkt") las die Begleitdatei
   `<ordner>/privat-en/textsatz-en-modul.json` — die gibt es seit dem Einbacken
   nicht mehr, das Modul steckt als Nutzlast in vivodepot.html. Kein Reparieren
   auf den neuen Ort, weil U2-ADR-369 die scharfe Abnahme längst woanders
   verankert: `node tools/deutsch-leck-pruefen.js` prüft dieselbe Zahl gegen
   eine benannte Erlaubnisliste (nicht nur informativ) UND liest die
   Quelldateien direkt (nie den Bau-Output) — zwei Implementierungen derselben
   Messung wären eine Drift-Quelle, keine zweite Absicherung. Dieses Werkzeug
   hängt nicht in `hooks/pre-push` oder `package.json` (geprüft: kein
   Aufrufer außer `node tools/vier-produkte-erzeugen.js` von Hand) — der Fund
   blockierte keinen Push, nur den manuellen CLI-Lauf.

   Aufruf:
     node tools/vier-produkte-erzeugen.js [--ziel <ordner>]
     (Standard-Ziel: produkte/, gitignored)
   ════════════════════════════════════════════════════════════════════════════ */
const path = require('node:path');
const { konfektionieren, gerüstByteGleich } = require('./produkt-konfektionieren.js');
const { PRODUKTE, modulDateienFuer } = require('./lib/vier-produkte.js');

const REPO = path.join(__dirname, '..');

// Wächter 2, rein: je Produkt genau EIN Sprachmodul (Deutsch wie Englisch, das Gerüst trägt keinen Satz).
const ERWARTETE_SPRACHMODUL_DATEIEN = 1;
function sprachmodulUrteil(slug, unsignierteModule) {
  const anzahl = unsignierteModule.filter((d) => d.startsWith('textsatz-')).length;
  return { slug, anzahl, erwartet: ERWARTETE_SPRACHMODUL_DATEIEN, ok: anzahl === ERWARTETE_SPRACHMODUL_DATEIEN };
}
function exitCodeFuer(ergebnis) { return ergebnis && ergebnis.ok === true ? 0 : 1; }

function main() {
  const argv = process.argv.slice(2);
  const argWert = (name) => { const i = argv.indexOf(name); return (i >= 0 && argv[i + 1]) ? argv[i + 1] : null; };
  const ziel = path.resolve(argWert('--ziel') || path.join(REPO, 'produkte'));

  const { ladeIssuer } = require(path.join(REPO, 'tests', 'load-issuer.js'));
  const ISSUER = ladeIssuer().V;

  const ergebnisse = {};
  for (const p of PRODUKTE) {
    const unsignierteModulDateien = modulDateienFuer(p);
    ergebnisse[p.slug] = konfektionieren({
      ziel, slug: p.slug, modulauswahl: [],
      vorDepotKonfigurationInhaltFn: ISSUER.vorDepotKonfigurationDateiInhalt,
      unsignierteModulDateien,
    });
    process.stdout.write('erzeugt: ' + p.slug + ' — ' + ergebnisse[p.slug].ordner + '\n');
    process.stdout.write('  Module: ' + (ergebnisse[p.slug].unsignierteModule.join(', ') || '(keins — nativer Rückfall)') + '\n');
  }

  process.stdout.write('\n── Wächter 1: Gerüst byte-gleich über alle vier ──\n');
  const slugs = PRODUKTE.map((p) => p.slug);
  let gerüstOk = true;
  for (let i = 0; i < slugs.length; i++) {
    for (let j = i + 1; j < slugs.length; j++) {
      const w = gerüstByteGleich(ergebnisse[slugs[i]].ordner, ergebnisse[slugs[j]].ordner);
      if (!w.gleich) { gerüstOk = false; process.stdout.write('  ✗ ' + slugs[i] + ' vs ' + slugs[j] + ': ' + w.abweichungen.join(',') + '\n'); }
    }
  }
  process.stdout.write(gerüstOk ? '  ✓ alle sechs Paare byte-gleich\n' : '  ROT — s. o.\n');

  process.stdout.write('\n── Wächter 2: je Produkt genau ein Sprachmodul ──\n');
  const urteile = PRODUKTE.map((p) => sprachmodulUrteil(p.slug, ergebnisse[p.slug].unsignierteModule));
  for (const u of urteile) {
    process.stdout.write('  ' + (u.ok ? '✓' : '✗') + ' ' + u.slug + ': ' + u.anzahl + ' Sprachmodul-Datei(en) (erwartet ' + u.erwartet + ')\n');
  }

  process.stdout.write('\nDeutsch-Leck im EN-Produkt: node tools/deutsch-leck-pruefen.js (die scharfe Abnahme, U2-ADR-369).\n');
  const ok = gerüstOk && urteile.every((u) => u.ok);
  process.stdout.write('\nErgebnis: ' + (ok ? '4 Produkte erzeugt unter ' + ziel : 'ROT — 4 Produkte erzeugt unter ' + ziel + ', aber ein Wächter hat angeschlagen (Exit 1)') + '\n');
  return { ok };
}

if (require.main === module) process.exitCode = exitCodeFuer(main());
module.exports = { main, sprachmodulUrteil, exitCodeFuer };
