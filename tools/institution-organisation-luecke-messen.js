#!/usr/bin/env node
'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   A468 (Laufzettel Nacht 22./23.08.2026, Posten 14) — Schicht 3: kein Feldtyp
   `organisation`, keine Institutions-Art für Stiftung oder Verein
   ────────────────────────────────────────────────────────────────────────────
   GEMESSEN 21.08.2026 (Herkunft A452): keine der zwölf Institutions-Arten passt
   auf eine Stiftung/einen gemeinnützigen Verein; keine der zehn Template-
   Feldtypen kennt eine juristische Person; `verwaltung`/`finanzen` hätten kein
   Freitextfeld.

   NEU GEMESSEN (23.08.2026, dieses Werkzeug): DER ERSTE TEIL HÄLT, ABER ER IST
   KEIN OFFENER FEHLER — ER IST EINE ENTSCHIEDENE ARCHITEKTUR (U2-ADR-142,
   17.08.2026, VOR dem A468-Fund selbst): die zwölf Institutions-Arten sind
   ausdrücklich eine geschlossene, deutsche, minimale Liste mit
   Nachreich-Politik — „keine weiteren Werte, was fehlt, kommt, wenn jemand es
   vermisst" (wörtliches Auftragswort). Der Andock-Mechanismus
   dafür ist gebaut und verdrahtet (`institutionsArtenAlle()` speist die
   Auswahlmaske, `_institutionsArtenAusDepotAnmelden` hebt ein angedocktes
   Modul). Eine Stiftungsaufsicht/ein Vereinsregister-Anbieter, der „Stiftung"/
   „Verein" braucht, dockt sie — das ist der vorgesehene Weg, kein Mangel.

   DIE ZWEITE FREITEXT-BEHAUPTUNG HÄLT, PRÄZISER GEFASST: `verwaltung` und
   `finanzen` führen viele `typ:'text'`/`'textarea'`-Felder — aber JEDES ist
   eng auf einen NAMEN Zweck zugeschnitten (`pw_manager`, `schulden`,
   `steuer_besonders`, `konten[].notiz` …), keines ist ein ALLGEMEINES
   Auffangfeld. Nur `identitaet` (`notizen_start`) und `persoenliches`
   (`sonstiges_persoenlich`) tragen ein Feld dieser Art — geprüft über den
   Namen (`notiz|bemerkung|sonstiges|anmerkung|freitext` am Feldanfang), nicht
   über den Typ allein (der wäre zu weit gefasst und hätte die eng benannten
   Felder faelschlich mitgezaehlt). Die Gründungsurkunde einer Stiftung hat
   darum wirklich keinen naheliegenden Platz außerhalb dieser zwei Sektoren.

   `kein Feldtyp organisation` bleibt eine ANDERE, GRÖSSERE Frage: eine neue
   Template-Feldart ist eine Architektur-Entscheidung quer durch Kern, Erzeuger
   und Aussteller — kein Andock-Fall wie bei den Institutions-Arten. NICHT
   GEGENSTAND dieses Werkzeugs oder dieses Postens, wie A464/A465 (Grenzwerte)
   nur der Befund, keine Zahl gesetzt.

   ZUG 0, READ-ONLY. Dieses Werkzeug MISST und ändert keine Zeile Produktcode.
   ════════════════════════════════════════════════════════════════════════════ */
const path = require('node:path');
const { ladeKern } = require('../tests/load-kern.js');

const JURISTISCHE_PERSON_MUSTER = /stiftung|verein|gGmbH|genossenschaft|koerperschaft|körperschaft/i;
// Ein „Auffangfeld" wird über den NAMEN erkannt, nicht über den Typ: jeder Sektor führt
// viele eng benannte typ:'text'-Felder (`schulden`, `pw_manager`, …) — die zählen nicht.
// Umbauplan „Englisch vor v1": die beiden gemessenen Auffangfelder selbst tragen seit dem
// Umbau englische Kennungen (identitaet.notizen_start -> identity.furtherDetails,
// persoenliches.sonstiges_persoenlich -> personal.whatElseIWantToSayWhatElse) — der deutsche
// Präfix-Regex allein trifft sie nicht mehr. EXAKT diese zwei bekannten Kennungen ergänzt
// (kein loser `^further`-Präfix: `furtherHomes` z. B. ist ein eng benanntes Feld, kein
// Auffangfeld, und würde sonst falsch mitgezählt), 14.09.2026.
const AUFFANGFELD_MUSTER = /^(notiz|bemerkung|sonstiges|anmerkung|freitext)|^(furtherDetails|whatElseIWantToSayWhatElse)$/i;

function messen() {
  const { V } = ladeKern();

  const feldtypen = Array.from(V._TEMPLATE_FELDTYPEN || []);
  const institutionArten = V.INSTITUTION_ART_EINGEBAUT.slice();
  const passendeArt = institutionArten.filter((a) => JURISTISCHE_PERSON_MUSTER.test(a));

  // Auffangfelder je Sektor — nur TOP-LEVEL zählt (ein Listen-Zeilen-Notizfeld ist an die
  // Zeile gebunden, kein allgemeiner Ablageort für „was diese Institution ist").
  const auffangfeldJeSektor = {};
  for (const s of V.bereicheAlle()) {
    const treffer = [];
    for (const sek of (s.sektionen || [])) {
      for (const f of (sek.felder || [])) {
        if ((f.typ === 'text' || f.typ === 'textarea') && AUFFANGFELD_MUSTER.test(f.id)) treffer.push(f.id);
      }
    }
    auffangfeldJeSektor[s.id] = treffer;
  }
  const sektorenMitAuffangfeld = Object.entries(auffangfeldJeSektor)
    .filter(([, t]) => t.length > 0).map(([id]) => id);

  // Andock-Mechanismus (U2-ADR-142) — strukturell bestätigt, nicht simuliert.
  const einlassRegister = (V.EINLASS_REGISTER || []).map((r) => r.typ);
  const institutionsArtDockbar = einlassRegister.includes('institutionsArt')
    && typeof V.institutionsArtenAlle === 'function'
    && typeof V._institutionsArtenAusDepotAnmelden === 'function';

  return {
    feldtypen, feldtypenAnzahl: feldtypen.length,
    organisationsFeldtyp: feldtypen.some((t) => /organisation/i.test(t)),
    institutionArten, institutionArtenAnzahl: institutionArten.length,
    passendeArtFuerStiftungOderVerein: passendeArt,
    auffangfeldJeSektor, sektorenMitAuffangfeld,
    verwaltungHatAuffangfeld: (auffangfeldJeSektor.administration || []).length > 0,
    finanzenHatAuffangfeld: (auffangfeldJeSektor.finance || []).length > 0,
    institutionsArtDockbar,
  };
}

if (require.main === module) {
  const m = messen();
  if (process.argv.includes('--json')) {
    console.log(JSON.stringify(m, null, 2));
  } else {
    console.log('Institution/Organisation-Lücke (A468)\n');
    console.log('Template-Feldtypen (' + m.feldtypenAnzahl + '): ' + m.feldtypen.join(', '));
    console.log('  Feldtyp für Organisation/juristische Person: ' + (m.organisationsFeldtyp ? 'JA' : 'NEIN'));
    console.log('\nInstitutions-Arten (' + m.institutionArtenAnzahl + '): ' + m.institutionArten.join(', '));
    console.log('  Passend für Stiftung/Verein: '
      + (m.passendeArtFuerStiftungOderVerein.length ? m.passendeArtFuerStiftungOderVerein.join(', ') : 'KEINE'));
    console.log('  Andock-Mechanismus (U2-ADR-142) verdrahtet: ' + (m.institutionsArtDockbar ? 'JA' : 'NEIN'));
    console.log('\nSektoren mit einem Auffangfeld (' + m.sektorenMitAuffangfeld.length + '): '
      + m.sektorenMitAuffangfeld.join(', '));
    console.log('  verwaltung: ' + (m.verwaltungHatAuffangfeld ? 'JA' : 'NEIN')
      + ' · finanzen: ' + (m.finanzenHatAuffangfeld ? 'JA' : 'NEIN'));
  }
}

module.exports = { messen, JURISTISCHE_PERSON_MUSTER, AUFFANGFELD_MUSTER };
