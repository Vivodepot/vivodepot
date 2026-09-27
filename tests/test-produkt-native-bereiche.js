'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Gemeinsamer Helfer: die dreizehn nativen Bereichs-Module für ein
   SYNTHETISCHES Test-Produkt (18.09.2026, Schnitt-Nachtrag)
   ────────────────────────────────────────────────────────────────────────
   DIE STILLE PRÄMISSE, DIE NICHT MEHR GILT: bis zum heutigen Schnitt trug
   `BEREICH_QUELLEN_EINGEBAUT` die dreizehn nativen Bereiche UNBEDINGT, unab-
   hängig vom Produkt — ein Kern ohne jedes Bereichs-Modul zeigte sie trotzdem.
   Der Schnitt hat diese unbedingte Grundlage ENTFERNT (s. Kopf-Kommentar an
   `BUERGERMODUL_BUENDEL`/`BEREICH_QUELLEN_EINGEBAUT`-Entfernung, vivodepot.html):
   ein Produkt ist seither Gerüst PLUS Modul — nichts kommt mehr umsonst. Ein
   ECHTES Produkt (privat-de/en, pro-de/en) trägt die dreizehn über sein
   eigenes `modulDateienFuer(p)`; ein SYNTHETISCHES Test-Produkt (kein Eintrag
   in `PRODUKTE`, z. B. ein Wegwerf-Slug für eine einzelne Probe) bekommt sie
   NICHT geschenkt und muss sie sich selbst mitgeben.

   ZWEI FUNDE, DIE DIESELBE URSACHE HATTEN (18.09.2026, gemessen — nicht ver-
   mutet): `tests/wallet-selbstauskunft-vorlage.test.js` (Abnahme-Proben) und
   `tests/zug2-erzeuger-leseart.test.js` (Erzeuger-Rundlauf) konfektionierten
   je ein eigenes Minimal-Produkt OHNE Bereichs-Modul und maßen `bereicheAlle().
   length === 0` statt 13 — nicht weil ihr eigentlicher Gegenstand kaputt war,
   sondern weil die alte, unbedingte Grundlage fehlte. EIN Helfer statt zwei
   Kopien, die auseinanderlaufen könnten.

   WAS DIE DREIZEHN TATSÄCHLICH LIEFERT (gemessen, nicht das Namens-naheliegende
   `BEREICHE_BEKANNT_PFAD`/`vivodepot-bereiche-bekannt.json` — das ist ein
   ANDERER Gegenstand, modulTyp `bereicheBekannt`, keine Bereichs-INHALTE):
   `tools/lib/vier-produkte.js`s `BEREICH_TEMPLATE_PFADE_PRIVAT_13` — dreizehn
   einzelne `modulTyp:'bereich'`-Dateien (administration/advanceCare/assets/…),
   dieselben, die jedes echte Privat-Produkt über `modulDateienFuer(p)` trägt.
   Gegengeprüft: ein Test-Produkt mit NUR diesen dreizehn Dateien liefert
   `bereicheAlle().length === 13`, mit den erwarteten dreizehn IDs.

   ZWEI FORMEN, WEIL ZWEI VERSCHIEDENE EINSPEISEWEGE BESTEHEN:
   • `nativeBereichsModulPfade()` — Dateipfade, für `konfektionieren()`s
     `unsignierteModulDateien` (der Weg über den echten Konfektionierer).
   • `nativeBereichsModuleAlsJSON()` — dieselben Dateien bereits geparst, für
     einen Weg, der die Region direkt in eine Kern-Kopie schreibt (kein
     `konfektionieren()`-Aufruf, s. `zug2-erzeuger-leseart.test.js`s
     `mitGesaetemBereich`). */
const fs = require('node:fs');
const { BEREICH_TEMPLATE_PFADE_PRIVAT_13 } = require('../tools/lib/vier-produkte.js');

function nativeBereichsModulPfade() {
  return BEREICH_TEMPLATE_PFADE_PRIVAT_13.slice();
}

function nativeBereichsModuleAlsJSON() {
  return BEREICH_TEMPLATE_PFADE_PRIVAT_13.map((pfad) => JSON.parse(fs.readFileSync(pfad, 'utf8')));
}

module.exports = { nativeBereichsModulPfade, nativeBereichsModuleAlsJSON };
