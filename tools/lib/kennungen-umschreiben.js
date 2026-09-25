'use strict';
/* ════════════════════════════════════════════════════════════════════════
   kennungen-umschreiben.js — die Schlüssel-Umschreibung für Plan-Commit 3
   (Depot-Migration Schema 80→81), NICHT-KERN-VORARBEIT
   ────────────────────────────────────────────────────────────────────────
   U2-ADR-XXX (Entwurf). Reine, ungetestete-am-echten-Depot Funktion: nimmt
   `data.sektoren` (das Objekt, das JEDE Bürgerin-Angabe hält,
   `{ <bereichAlt>: { <feldAlt>: wert, ... }, ... }`) und die Kennungs-
   Mapping-Tabelle (docs/umbau-englisch-vor-v1/kennung-mapping.json) und
   liefert ein NEUES Objekt mit umbenannten Schlüsseln zurück — reine
   Funktion, keine Mutation, kein Dateizugriff, kein Kern-Bezug. Erst die
   EINBINDUNG in `depotNormalisieren()` (Schema 80→81) ist Kern-Arbeit und
   damit Teil von Plan-Commit 3, nicht dieser Datei.

   REGEL, wortgleich zum Mapping-Erzeuger: ein TOP-LEVEL-Feld ist entweder
   (a) direkt in der Tabelle als `kennungAlt = <bereich>.<feld>` (kein „/")
   gefuehrt -> Schluessel wird umbenannt, WERT bleibt unangetastet — oder
   (b) ein LISTENFELD: es gibt KEINE eigene Zeile ohne „/", aber Zeilen mit
   `kennungAlt = <bereich>.<feld>/<unterfeld>` -> der Container-Schluessel
   wird auf den GEMEINSAMEN `listenfeldNeu`-Praefix umbenannt (aus JEDER
   Unterfeld-Zeile gleich ableitbar), und JEDES Element des Arrays wird
   selbst umgeschrieben (seine eigenen Schluessel: unterfeldAlt -> unterfeldNeu).
   (c) UNBEKANNT (kein Treffer, weder (a) noch (b)): Schluessel bleibt
   UNVERAENDERT — additiv-tolerant, wie der Kern selbst mit unbekannten
   Schluesseln umgeht ("Vokabulare oeffnen"). Kein Datenverlust, niemals.
   ════════════════════════════════════════════════════════════════════════ */

/** Baut die drei Nachschlage-Strukturen einmal aus der flachen Mapping-Liste:
    - bereichAltZuNeu: 'identitaet' -> 'identity'
    - topLevel: 'identitaet.vorname' -> 'firstName' (lokaler Name OHNE Bereichs-Praefix)
    - listenfelder: 'identitaet.ausweis' -> { neuerName: 'idDocuments',
        unterfelder: { system: 'system', nr: 'documentNumber', ... } } */
function baueNachschlage(kennungMapping) {
  const bereichAltZuNeu = new Map();
  const topLevel = new Map();
  const listenfelder = new Map();

  for (const zeile of kennungMapping) {
    if (!zeile.kennungNeu) continue; // z.B. Rechtsbegriffe ohne Kandidat -- niemals umschreiben
    if (zeile.bereichNeu) bereichAltZuNeu.set(zeile.bereichAlt, zeile.bereichNeu);

    if (!zeile.istUnterfeld) {
      const lokalNeu = zeile.kennungNeu.slice(zeile.bereichNeu.length + 1);
      topLevel.set(zeile.kennungAlt, lokalNeu);
      continue;
    }
    const nachPunkt = zeile.kennungAlt.slice(zeile.bereichAlt.length + 1);
    const [listenfeldAlt, unterfeldAlt] = nachPunkt.split('/');
    const listenfeldAltVoll = zeile.bereichAlt + '.' + listenfeldAlt;
    const [listenfeldNeuTeil, unterfeldNeuTeil] = zeile.kennungNeu
      .slice(zeile.bereichNeu.length + 1).split('/');
    if (!listenfelder.has(listenfeldAltVoll)) {
      listenfelder.set(listenfeldAltVoll, { neuerName: listenfeldNeuTeil, unterfelder: new Map() });
    }
    listenfelder.get(listenfeldAltVoll).unterfelder.set(unterfeldAlt, unterfeldNeuTeil);
  }
  return { bereichAltZuNeu, topLevel, listenfelder };
}

/** Schreibt EIN Element eines Listenfelds um (z.B. ein Ausweis-Eintrag). Unbekannte
    Unterschlüssel bleiben unangetastet -- additiv, kein Datenverlust. */
function elementUmschreiben(element, unterfelder) {
  if (!element || typeof element !== 'object' || Array.isArray(element)) return element;
  const raus = {};
  for (const [k, v] of Object.entries(element)) {
    raus[unterfelder.has(k) ? unterfelder.get(k) : k] = v;
  }
  return raus;
}

/** Schreibt `data.sektoren` um. REINE FUNKTION -- `sektorenAlt` wird nicht verändert,
    das Ergebnis ist ein neues Objekt. `kennungMapping` ist der Inhalt von
    kennung-mapping.json (Array). */
function sektorenUmschreiben(sektorenAlt, kennungMapping) {
  const { bereichAltZuNeu, topLevel, listenfelder } = baueNachschlage(kennungMapping);
  const sektorenNeu = {};

  for (const [bereichAlt, inhaltAlt] of Object.entries(sektorenAlt || {})) {
    const bereichNeu = bereichAltZuNeu.get(bereichAlt) || bereichAlt; // unbekannter Bereich: unverändert
    if (!inhaltAlt || typeof inhaltAlt !== 'object') { sektorenNeu[bereichNeu] = inhaltAlt; continue; }

    const inhaltNeu = {};
    for (const [feldAlt, wert] of Object.entries(inhaltAlt)) {
      const kennungAltVoll = bereichAlt + '.' + feldAlt;
      /* REIHENFOLGE ABSICHTLICH: `listenfelder` zuerst geprüft. Ein Listenfeld wie
         `identitaet.ausweis` hat OFT zusätzlich eine eigene Top-Level-Zeile (das
         Feldkatalog-Label des Containers selbst, z.B. für die Registerseite) --
         diese redundante Zeile darf die REKURSION in die Array-Elemente nicht
         verdecken. Ein echtes Fund beim ersten Testlauf dieser Datei: ohne diese
         Reihenfolge wurde `ausweis` umbenannt, aber `system`/`nr`/... blieben
         deutsch in jedem Array-Element stehen. */
      if (listenfelder.has(kennungAltVoll)) {
        const def = listenfelder.get(kennungAltVoll);
        inhaltNeu[def.neuerName] = Array.isArray(wert)
          ? wert.map((el) => elementUmschreiben(el, def.unterfelder))
          : wert; // unerwartete Form (kein Array): unangetastet durchreichen, nicht werfen
      } else if (topLevel.has(kennungAltVoll)) {
        inhaltNeu[topLevel.get(kennungAltVoll)] = wert;
      } else {
        inhaltNeu[feldAlt] = wert; // unbekanntes Feld: additiv-tolerant unverändert
      }
    }
    sektorenNeu[bereichNeu] = inhaltNeu;
  }
  return sektorenNeu;
}

module.exports = { baueNachschlage, elementUmschreiben, sektorenUmschreiben };
