'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Vor-Umzug-Golden-Master — gemeinsame Bausteine (06.09.2026)
   ────────────────────────────────────────────────────────────────────────
   Ein Konsument, kein zweiter, driftender Nachbau: sowohl der Fixture-
   Erzeuger (tools/dokument-vor-umzug-fixture-ziehen.js) als auch die
   stehenden Tests lesen ihre Extraktions-Logik von HIER, nie zweimal
   geschrieben.

   Zwei Extraktions-Klassen, weil sie sich gegenseitig dort decken, wo die
   andere blind ist (U2-ADR-344, Nachtrag 06.09.2026):

   „immer" — bootzeit-materialisierte Felder (`.einleitung`/`.texte` auf
   *_MODUL.abschnitte, `frage`/`hilfetext`/`feld.label` auf Schritt-Listen).
   Werden UNABHÄNGIG von Depotdaten gesetzt — decken den vollen amtlichen
   Wortlaut ab, aber NICHT die instrumentgetriebene Auswahl-Logik (welcher
   Block bei welcher Auswahl erscheint).

   „depot" — die echte Generator-Funktion (`modulDokumentAbschnitte`) mit
   echten (erfundenen) Depot-Daten. Deckt genau das Umgekehrte ab: welcher
   Block bei welcher Auswahl erscheint, inklusive Namens-/Datums-/Adress-
   Interpolation — aber nur so viele Zweige, wie das jeweilige Depot füllt.
   ════════════════════════════════════════════════════════════════════════ */

function textwerteAusModulAbschnitten(modul) {
  const werte = [];
  for (const abschnitt of modul.abschnitte) {
    if (!Array.isArray(abschnitt.bloecke)) continue;
    for (const blk of abschnitt.bloecke) {
      if (typeof blk.einleitung === 'string' && blk.einleitung) werte.push(blk.einleitung);
      if (Array.isArray(blk.texte)) for (const t of blk.texte) if (t) werte.push(t);
    }
  }
  return werte;
}

function textwerteAusSchritten(steps) {
  const werte = [];
  for (const s of steps || []) {
    if (s.frage) werte.push(s.frage);
    if (s.hilfetext) werte.push(s.hilfetext);
    if (s.feld && s.feld.label) werte.push(s.feld.label);
  }
  return werte;
}

/* „immer" — Achse a3-dokumentmodule (PV_MODUL/KI_MODUL, U2-ADR-344). */
function immerWerteA3(V) {
  const pvwiz = V.WIZARDS.find((w) => w.id === 'pvwiz');
  const kiwiz = V.WIZARDS.find((w) => w.id === 'kiwiz');
  return [].concat(
    textwerteAusModulAbschnitten(V.PV_MODUL),
    textwerteAusModulAbschnitten(V.KI_MODUL),
    textwerteAusSchritten(pvwiz && pvwiz.schritte),
    textwerteAusSchritten(kiwiz && kiwiz.schritte),
    textwerteAusSchritten(V.VOLLMACHT_BMJ.steps),
  );
}

/* „depot" — die vier Dokumentmodule mit injizierten Depot-Daten. `zeilenId`
   für VOLLMACHT_MODUL kommt aus dem Depot selbst (die vorsorgevollmacht-
   Zeile trägt eine eigene `id`) — Aufrufer übergibt sie mit. */
/* Die Depot-Fixtures sind Klartext-Exporte mit eigener `schemaVersion` (75). Die App öffnet
   eine solche Datei über `depotNormalisieren`, nicht über ein nacktes `setData` — seit dem
   Kennungs-Umbau (Stufe 81) liest der Kern eine Vor-Umbau-Datei ohne diesen Weg LEER. Ohne
   `schemaVersion` (Aufrufer von vor diesem Nachtrag) bleibt es beim alten Verhalten. */
function depotUeberLadeweg(V, depotSektoren, depotMenschen, schemaVersion) {
  const quelle = {
    sektoren: JSON.parse(JSON.stringify(depotSektoren || {})),
    menschen: JSON.parse(JSON.stringify(depotMenschen || [])),
  };
  const geladen = (typeof schemaVersion === 'number' && typeof V.depotNormalisieren === 'function')
    ? V.depotNormalisieren(Object.assign({ schemaVersion }, quelle)) : quelle;
  const leer = V.leeresDepot();
  leer.menschen = geladen.menschen || [];
  Object.assign(leer.sektoren, geladen.sektoren || {});
  return leer;
}

function depotErgebnisA3(V, depotSektoren, depotMenschen, vmZeilenId, schemaVersion) {
  V.setData(depotUeberLadeweg(V, depotSektoren, depotMenschen, schemaVersion));
  return {
    PV: V.modulDokumentAbschnitte(V.PV_MODUL),
    KI: V.modulDokumentAbschnitte(V.KI_MODUL),
    VM: V.modulDokumentAbschnitte(V.VOLLMACHT_MODUL, vmZeilenId),
    BV: V.modulDokumentAbschnitte(V.BETREUUNG_MODUL),
  };
}

/* Registrierte Depot-Fixtures für die a3-Achse — Pfad relativ zu tests/fixtures/,
   plus die vmZeilenId, die im jeweiligen Depot die vorsorgevollmacht-Zeile trägt
   (`undefined`, wenn das Depot keine solche Zeile hat — `_vmZeile(undefined)`
   liefert dann `{}`, das ist der gewollte „leer, aber funktionsfähig"-Fall). */
const A3_DEPOT_FIXTUREN = [
  { name: 'marlene-hoffmann', datei: 'vor-umzug-depot-marlene-hoffmann.json', vmZeilenId: undefined,
    beschreibung: 'nur skalare Felder (text/textarea/datum/auswahl), vorsorge_instrumente LEER — ' +
      'deckt Klardaten-Interpolation (Name/Geburtsdatum/Adresse) ab, keine instrumentgetriebenen Bloecke' },
  { name: 'instrumente-breit', datei: 'vor-umzug-depot-instrumente-breit-anton-reindl.json', vmZeilenId: 'zeile-vv',
    beschreibung: 'vorsorge_instrumente gefuellt (vorsorgevollmacht/patientenverfuegung/ki-verfuegung/' +
      'betreuungsverfuegung) — deckt die instrumentgetriebene Auswahl-Logik ab (PV: 11 Abschnitte statt 3, ' +
      'VM: 11 statt 1). NICHT abgedeckt: pv_organspende_vorrang, "andere"-Zweig von pv_reichweite_person/' +
      'pv_widerruf_person, testament/sorgerechtsverfuegung/betreuerbestellung-Zeilen, negative(nein)-Sentinel-' +
      'Zweige durchgaengig (mehrere Felder stehen bewusst auf "ja", um den positiven Text zu zeigen)' },
];

function multiset(arr) {
  const m = new Map();
  for (const w of arr) m.set(w, (m.get(w) || 0) + 1);
  return m;
}

function verlorene(altWerte, neuWerte) {
  // Anführungszeichen gelten als gleich (tools/lib/anfuehrung-gleich.js): die Belege tragen ASCII ", der Satz seit 16.09.2026 „…“.
  const { anfuehrungGleich } = require('./anfuehrung-gleich.js');
  const alt = multiset(anfuehrungGleich(altWerte));
  const neu = multiset(anfuehrungGleich(neuWerte));
  const verloren = [];
  for (const [w, n] of alt) {
    const fehl = n - (neu.get(w) || 0);
    for (let i = 0; i < fehl; i++) verloren.push(w);
  }
  return verloren;
}

module.exports = {
  textwerteAusModulAbschnitten,
  textwerteAusSchritten,
  immerWerteA3,
  depotErgebnisA3,
  depotUeberLadeweg,
  A3_DEPOT_FIXTUREN,
  multiset,
  verlorene,
};
