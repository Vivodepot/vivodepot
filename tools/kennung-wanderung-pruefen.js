#!/usr/bin/env node
'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   kennung-wanderung-pruefen.js — prueft ein Bereich-Template-Modul
   (modulTyp:'bereich') gegen zwei Fehlerarten der Bereiche→Templates-Achse
   (Strang C, 17.09.2026)
   ────────────────────────────────────────────────────────────────────────────
   DIE REGEL, GEGEN DIE GEPRUEFT WIRD (wörtliche Auflage): "frage und hilfetext
   sind keine gespeicherten Moduldaten, sie entstehen zur Laufzeit aus
   Textsatz-Kennungen. Text kommt immer aus der Sprachachse, nie aus dem Modul.
   Wandert eine Kennung in eine Moduldatei, ist das ein Fehler, kein Sonderfall."
   Belegt an den beiden real existierenden Beispielen (vivodepot-mobility.json,
   die eingebettete housing/wohnen-Nutzlast in BEREICH_QUELLEN_EINGEBAUT):
   keins der beiden traegt eine "label"/"hint"/"frage"/"hilfetext"-Eigenschaft
   als literalen String — nur id/typ/optionen.wert/sichtbarWenn/marken/ebene/
   sensibel. Genau DAS ist die Positivkontrolle dieses Werkzeugs.

   ZWEI FEHLERARTEN:
     'text-in-modul'   — eine Rolle aus dem gemessenen Rollen-Vokabular
                          (label/hint/beispiel/frage/hilfetext/titel/text/
                          einfuehrungstext/navUnterzeile/name/vorschlaege/
                          hinweis/satz/toast/luecke/einleitung/sektion) steht
                          als literaler String IM Modul — die Kennung ist
                          gewandert, statt in der Sprachachse zu bleiben.
     'kennung-fehlt'   — die Textsatz-Kennung, die _bereichsErsatzFelderLebendig
                          Machen (vivodepot.html:23486) zur Laufzeit fuer dieses
                          Feld/diese Sektion/dieses Unterfeld/diese Option lesen
                          WUERDE, existiert in keinem der beiden Sprachmodule
                          (tools/textsatz-de-modul.json, tools/textsatz-en-
                          modul.json) — der quer liegende Textsatz-Teil (65%,
                          Sprachachse-Befund 17.09.2026) ist beim Bereichs-
                          schnitt NICHT automatisch mitgezogen, muss aber vor
                          dem Andocken ergaenzt sein.

   AUSNAHME, GEMESSEN (17.09.2026): standardDokumente[].name/.hinweis sind KEINE
   gewanderte Kennung — eigene, bereits verdrahtete Lesestelle
   `_dokumentTextsatzText(typ, art, rueckfall)` (vivodepot.html:15378), die
   `dokument.<typ>.<art>` liest und auf den Literal-Wert zurueckfaellt — sechs
   Aufrufstellen, alle generisch, nicht an die NATIVE Herkunft eines Bereichs
   gebunden. Ein Bereich-Template, das diese zwei Felder literal deutsch
   mitbringt, tut exakt dasselbe wie der native Bestand.

   Kennungsform (woertlicher Spiegel der Laufzeit-Funktion, NICHT geraten):
     Sektion  <sektorId>#<sektionId>.label
     Feld     <sektorId>.<feldId>.label            [ .hint nur falls feld.hint gesetzt ]
     Unterfeld <sektorId>.<feldId>/<unterfeldId>.label
     Option   <sektorId>.<feldId>/<wert>.label
     Bereich  <sektorId>.navUnterzeile

   Aufruf:
     node tools/kennung-wanderung-pruefen.js --pfad <bereichsmodul.json> [--sektor <id>] [--de-modul <pfad>] [--en-modul <pfad>]
     node tools/kennung-wanderung-pruefen.js            (ohne Argument: Fixtures unten)
   ════════════════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const path = require('node:path');

const REPO = path.join(__dirname, '..');

// Rollen-Vokabular: gemessen aus tools/textsatz-de-modul.json (Suffix-Verteilung,
// Sprachachse-Befund 17.09.2026) — jede dieser Endungen ist eine TEXT-Rolle, nie
// eine Struktur-Eigenschaft. `wert`/`id`/`typ`/`ebene`/`sensibel`/`marken`/
// `sichtbarWenn`/`entitaet`/`rolle`/`verweisZweck`/`eingabeTyp` sind Struktur,
// bewusst NICHT in dieser Liste.
const TEXT_ROLLEN = Object.freeze([
  'label', 'hint', 'beispiel', 'frage', 'hilfetext', 'titel', 'text',
  'einfuehrungstext', 'navUnterzeile', 'name', 'vorschlaege', 'hinweis',
  'satz', 'toast', 'luecke', 'einleitung', 'sektion', 'einfuehrung',
]);

// Kennungs-Praefixe der quer liegenden 65% (Sprachachse-Befund 17.09.2026) —
// diese duerfen in KEINEM Bereich-Template als eigene texte-Tabelle auftauchen,
// sie gehoeren den gemeinsamen Sprachmodulen, nicht einem einzelnen Bereich.
// MIT TRENNZEICHEN, gemessen gegen echte Kennungen aus tools/textsatz-de-modul.json
// (17.09.2026) — ohne das Trennzeichen faengt z.B. 'wizard' auch die STRUKTUR-
// Eigenschaft `bereich.wizards` (Array von Wizard-IDs, kein Textsatz-Schluessel),
// ein echter Fehlalarm am eigenen Werkzeug, gefunden gegen die housing/wohnen-
// Nutzlast (BEREICH_QUELLEN_EINGEBAUT).
const QUER_LIEGENDE_PRAEFIXE = Object.freeze([
  'strings:', 'wizard:', 'situation:', 'dokument.', 'vollmacht:', 'pro-',
  'feldgruppe.', 'angSituation:', 'anlass:',
]);

function ladeJson(p) {
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

const DOKUMENT_LITERAL_AUSNAHME = /(^|\.)standardDokumente\[\d+\]\.(name|hinweis)$/;

/* Sucht rekursiv nach Eigenschaften, deren NAME eine Text-Rolle ist UND deren
   WERT ein nichtleerer String ist — genau das waere eine gewanderte Kennung.
   `pfad` sammelt die Fundstelle fuer eine lesbare Meldung. */
function textInModulSuchen(knoten, pfad, funde) {
  if (Array.isArray(knoten)) {
    knoten.forEach((k, i) => textInModulSuchen(k, pfad + '[' + i + ']', funde));
    return;
  }
  if (!knoten || typeof knoten !== 'object') return;
  for (const key of Object.keys(knoten)) {
    const wert = knoten[key];
    const eigenerPfad = pfad + '.' + key;
    if (TEXT_ROLLEN.includes(key) && typeof wert === 'string' && wert.trim()) {
      if (!DOKUMENT_LITERAL_AUSNAHME.test(eigenerPfad)) funde.push({ pfad: eigenerPfad, wert });
    } else {
      textInModulSuchen(wert, eigenerPfad, funde);
    }
  }
}

/* Baut die Kennungsmenge, die _bereichsErsatzFelderLebendigMachen zur Laufzeit
   lesen WUERDE — Sektion/Feld/Unterfeld/Option/navUnterzeile, wortgleiche Form. */
function benoetigteKennungen(sektorId, sektorObjekt) {
  const raus = [];
  for (const sek of (sektorObjekt.sektionen || [])) {
    raus.push(sektorId + '#' + sek.id + '.label');
    for (const feld of (sek.felder || [])) {
      raus.push(sektorId + '.' + feld.id + '.label');
      if (typeof feld.hint === 'string' && feld.hint.trim()) {
        raus.push(sektorId + '.' + feld.id + '.hint');
      }
      for (const uf of (feld.unterFelder || [])) {
        raus.push(sektorId + '.' + feld.id + '/' + uf.id + '.label');
      }
      for (const o of (feld.optionen || [])) {
        if (o && typeof o.wert === 'string') raus.push(sektorId + '.' + feld.id + '/' + o.wert + '.label');
      }
    }
  }
  raus.push(sektorId + '.navUnterzeile');
  return [...new Set(raus)];
}

function querLiegendePraefixeImModul(knoten, funde, gesehen) {
  gesehen = gesehen || new Set();
  if (Array.isArray(knoten)) {
    knoten.forEach((k) => querLiegendePraefixeImModul(k, funde, gesehen));
    return;
  }
  if (!knoten || typeof knoten !== 'object') return;
  for (const key of Object.keys(knoten)) {
    if (typeof key === 'string' && !gesehen.has(key)) {
      gesehen.add(key);
      for (const praefix of QUER_LIEGENDE_PRAEFIXE) {
        if (key.startsWith(praefix)) { funde.push(key); break; }
      }
    }
    querLiegendePraefixeImModul(knoten[key], funde, gesehen);
  }
}

/* STAMM-PARAMETER (17.09.2026, -40-Auftrag): 'text-in-modul' und 'quer-liegend' sind
   struktur-agnostisch — sie durchsuchen ein Objekt rekursiv, unabhaengig davon, ob es
   unter modul.bereiche, modul.situationen oder modul.wizards haengt. 'kennung-fehlt'
   ist es NICHT: sie spiegelt _bereichsErsatzFelderLebendigMachen woertlich, das nur
   fuer Bereiche gilt. Situation/Wizard lesen ueber einen ANDEREN Mechanismus
   (_situationAusBuendelErzeugen/_wizardAusBuendelErzeugen +
   _textsatzAufSituationenAnwenden/_textsatzAufWizardsAnwenden, -40s eigene Messung,
   17.09.2026, nicht hier nachgebaut) — darum laeuft 'kennung-fehlt' NUR fuer
   stamm==='bereiche', sonst bliebe sie leer und taeuschte eine Vollstaendigkeit vor,
   die niemand gemessen hat. */
function pruefeBereichsModul(modul, opt) {
  opt = opt || {};
  const stamm = opt.stamm || 'bereiche';
  const ergebnis = { textInModul: [], querLiegendGefunden: [], kennungFehlt: [] };
  const container = modul[stamm] || {};
  const ids = opt.sektor ? [opt.sektor] : Object.keys(container);

  for (const id of ids) {
    const objekt = container[id];
    if (!objekt) continue;
    textInModulSuchen(objekt, id, ergebnis.textInModul);
    querLiegendePraefixeImModul(objekt, ergebnis.querLiegendGefunden);

    if (stamm === 'bereiche' && (opt.deTexte || opt.enTexte)) {
      const benoetigt = benoetigteKennungen(id, objekt);
      for (const kennung of benoetigt) {
        const fehltDe = opt.deTexte && typeof opt.deTexte[kennung] !== 'string';
        const fehltEn = opt.enTexte && typeof opt.enTexte[kennung] !== 'string';
        if (fehltDe || fehltEn) {
          ergebnis.kennungFehlt.push({ kennung, fehltDe: !!fehltDe, fehltEn: !!fehltEn });
        }
      }
    }
  }
  return ergebnis;
}

function bericht(ergebnis, quelle) {
  const zeilen = [];
  zeilen.push('=== ' + quelle + ' ===');
  zeilen.push('text-in-modul (Kennung gewandert): ' + ergebnis.textInModul.length);
  for (const f of ergebnis.textInModul.slice(0, 20)) zeilen.push('  FEHLER ' + f.pfad + ' = ' + JSON.stringify(f.wert).slice(0, 80));
  zeilen.push('quer-liegende Praefixe im Modul (duerfen dort nicht stehen): ' + ergebnis.querLiegendGefunden.length);
  for (const k of ergebnis.querLiegendGefunden.slice(0, 20)) zeilen.push('  FEHLER Kennung ' + k + ' steht im Bereichs-Modul, gehoert den Sprachmodulen');
  zeilen.push('kennung-fehlt (Sprachachse hat die Laufzeit-Kennung nicht): ' + ergebnis.kennungFehlt.length);
  for (const f of ergebnis.kennungFehlt.slice(0, 20)) {
    zeilen.push('  FEHLER ' + f.kennung + (f.fehltDe ? ' [DE fehlt]' : '') + (f.fehltEn ? ' [EN fehlt]' : ''));
  }
  return zeilen.join('\n');
}

function main() {
  const argv = process.argv.slice(2);
  const pfadIdx = argv.indexOf('--pfad');
  const sektorIdx = argv.indexOf('--sektor');
  const deIdx = argv.indexOf('--de-modul');
  const enIdx = argv.indexOf('--en-modul');
  const stammIdx = argv.indexOf('--stamm');
  const sektor = sektorIdx >= 0 ? argv[sektorIdx + 1] : null;
  const stamm = stammIdx >= 0 ? argv[stammIdx + 1] : 'bereiche';

  // KEIN stilles Weiterlaufen ohne Sprachmodul (17.09.2026, Fund am eigenen Werkzeug):
  // tools/textsatz-de-modul.json/-en-modul.json sind GENERIERTE, aber GETRACKTE Dateien.
  // Ein try/catch, das ein Fehlen stillschweigend uebergeht, meldet "kennung-fehlt: 0"
  // OHNE je geprueft zu haben — genau der Fehlschlag-wird-Ergebnis-Fall. Darum: explizite
  // Pfade via --de-modul/--en-modul, oder laut warnen statt still 0 zu melden.
  const deModulPfad = deIdx >= 0 ? argv[deIdx + 1] : path.join(REPO, 'tools', 'textsatz-de-modul.json');
  const enModulPfad = enIdx >= 0 ? argv[enIdx + 1] : path.join(REPO, 'tools', 'textsatz-en-modul.json');
  let deTexte = null, enTexte = null, deFehler = null, enFehler = null;
  try { deTexte = ladeJson(deModulPfad).texte; } catch (e) { deFehler = e.message; }
  try { enTexte = ladeJson(enModulPfad).texte; } catch (e) { enFehler = e.message; }
  if (deFehler) console.warn('WARNUNG: DE-Sprachmodul nicht geladen (' + deModulPfad + '): ' + deFehler + ' — kennung-fehlt-Pruefung fuer DE ausgelassen, kein Befund.');
  if (enFehler) console.warn('WARNUNG: EN-Sprachmodul nicht geladen (' + enModulPfad + '): ' + enFehler + ' — kennung-fehlt-Pruefung fuer EN ausgelassen, kein Befund.');

  if (pfadIdx >= 0) {
    const modul = ladeJson(argv[pfadIdx + 1]);
    const ergebnis = pruefeBereichsModul(modul, { sektor, stamm, deTexte, enTexte });
    console.log(bericht(ergebnis, argv[pfadIdx + 1]));
    const rot = ergebnis.textInModul.length || ergebnis.querLiegendGefunden.length || ergebnis.kennungFehlt.length;
    process.exitCode = rot ? 1 : 0;
    return;
  }

  // Ohne Argument: zwei eingebaute Fixtures (sauber / verworfen), s. Kopf-Kommentar.
  const sauber = {
    modulTyp: 'bereich', kennung: 'vivodepot/fixture-sauber', sprache: 'de',
    bereiche: { fixtureSauber: { id: 'fixtureSauber', sektionen: [
      { id: 'block-1', felder: [{ id: 'feldA', typ: 'text' }] },
    ] } },
  };
  const verworfen = {
    modulTyp: 'bereich', kennung: 'vivodepot/fixture-verworfen', sprache: 'de',
    bereiche: { fixtureVerworfen: { id: 'fixtureVerworfen', sektionen: [
      { id: 'block-1', felder: [{ id: 'feldA', typ: 'text', label: 'Feld A (literal, falsch)' }] },
    ], 'wizard:irgendwas.frage': 'darf hier nicht stehen' } },
  };
  console.log(bericht(pruefeBereichsModul(sauber, {}), 'Fixture: sauber (erwartet 0 Funde)'));
  console.log();
  console.log(bericht(pruefeBereichsModul(verworfen, {}), 'Fixture: verworfen (erwartet Funde)'));
}

if (require.main === module) main();
module.exports = { pruefeBereichsModul, benoetigteKennungen, TEXT_ROLLEN, QUER_LIEGENDE_PRAEFIXE };
