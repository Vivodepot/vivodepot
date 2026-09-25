'use strict';
// SPDX-License-Identifier: EUPL-1.2
// Copyright (c) 2026 Vivodepot GmbH, Berlin. Teil des Template-/Trust-Authority-Mechanismus - Lizenz siehe LICENSE, Teil 1.
/* ════════════════════════════════════════════════════════════════════════
   Manifest — Konfektionierung + Wächter (Block D, U2-ADR-419)
   ────────────────────────────────────────────────────────────────────────
   Das Manifest ist ein ZEIGER-DOKUMENT, kein Inhalts-Dokument: je Achse
   `{herkunft, moduleVersion}`, nie der Modul-Inhalt selbst (Abschnitt 2 des
   Entwurfs). Zwei getrennte Register lösen einen Zeiger auf:

     ACHSEN-ERLAUBNIS (selten, von Hand, Vivodepot-gepflegt) — zählt Achsen
     und Sorten Funktionswert, NIE Instanzen (U2-ADR-146-Muster: eine
     Erlaubnisliste über NAMEN, nicht über Code). Ein Achsentyp, den das
     Manifest referenziert, aber der hier nicht steht, wird BENANNT
     verworfen — dasselbe Prinzip wie `DOKUMENT_MODUL_MOTOREN_ERLAUBT`.

     MODUL-REGISTER (wächst automatisch, entsteht beim Signieren, NIEMAND
     gibt einen Eintrag frei — sonst ist der Flaschenhals wieder da, den
     dieser Entwurf gerade vermeiden soll) — bildet `(typ,herkunft,
     moduleVersion)` auf den erwarteten SHA-256 des Modul-Inhalts ab.

   DER WÄCHTER (D2), die eigentliche Sache dieses Bausteins: derselbe
   Aufruf, zweimal, aus demselben Manifest + demselben Modul-Bestand, MUSS
   byte-gleich sein (Positivkontrolle). Ändert sich ein Modul-Byte, OHNE
   dass `moduleVersion` hochgezählt und das Register neu signiert wurde,
   MUSS der Bau abbrechen (Negativkontrolle) — nicht stillschweigend die
   „aktuelle" Fassung ziehen. Das ist keine zusätzliche Prüfung neben dem
   Hash-Vergleich, es IST der Hash-Vergleich: `modulAufloesen` prüft den
   echten Inhalt gegen den registrierten Hash bei JEDER Auflösung, nicht
   nur in einem Testfall.

   WAS DIESE DATEI NICHT TUT (Abschnitt 5 des Entwurfs, unverändert gültig):
   kein Bauskript für die Laufzeit-Oberfläche von `vivodepot.html` — das
   Manifest ist ein Build-/Vertriebs-Artefakt, berührt die ausgelieferte
   Bürger-App nicht. Kein fertiges Signier-Werkzeug (das entsteht erst mit
   der Institutions-Onboarding-Kette) — `modulRegister`/`modulBestand`
   kommen hier als bereits aufgelöste Eingabe, ihre tatsächliche Herkunft
   (Signier-Zeremonie) ist ein eigener, späterer Posten.
   ════════════════════════════════════════════════════════════════════════ */
const crypto = require('crypto');

/* Kanonische JSON-Serialisierung — Objekt-Schlüssel rekursiv sortiert, Arrays behalten
   ihre Reihenfolge. Ohne das würde derselbe INHALT, aus zwei verschiedenen Läufen mit
   zufällig anderer Schlüssel-Einfüge-Reihenfolge zusammengebaut, zwei verschiedene Hashes
   ergeben — die Positivkontrolle (D2, Abschnitt 3) prüfte dann eine Eigenschaft des
   JS-Objektbaus, nicht des Inhalts. Dasselbe Prinzip wie die kanonische Feld-Reihenfolge
   in `V._basisInhaltMatcht` (tests/trust-basistemplate-signatur.test.js, „1b kanonisch"). */
function sortiert(wert) {
  if (Array.isArray(wert)) return wert.map(sortiert);
  if (wert && typeof wert === 'object') {
    const out = {};
    for (const schluessel of Object.keys(wert).sort()) out[schluessel] = sortiert(wert[schluessel]);
    return out;
  }
  return wert;
}
function kanonischesJSON(wert) {
  return JSON.stringify(sortiert(wert));
}
function sha256Hex(text) {
  return crypto.createHash('sha256').update(text, 'utf8').digest('hex');
}

/* Achsen-Erlaubnis: prüft NUR, ob jeder im Manifest referenzierte Achsentyp bekannt ist —
   zählt Achsen, nie Instanzen (Entwurf Abschnitt 2, Korrektur nach `28`s Auflage). Ein
   unbekannter Achsentyp wird benannt verworfen, das ganze Manifest fällt — dieselbe Härte
   wie ein unbekannter Motorname in U2-ADR-146 (§3 „ein Motor, nicht zwei"). */
function achsenErlaubnisPruefen(manifest, achsenErlaubnis) {
  const bekannt = new Set(achsenErlaubnis.achsen);
  for (const typ of Object.keys(manifest.achsen || {})) {
    if (!bekannt.has(typ)) {
      throw new Error('achsenErlaubnisPruefen: unbekannte Achse "' + typ + '" — nicht in der '
        + 'Achsen-Erlaubnisliste ' + achsenErlaubnis.version + '. Eine neue Achse ist eine '
        + 'Produktentscheidung, kein Bau-Detail.');
    }
  }
}

/* Löst EINEN Manifest-Eintrag (Achse oder Template) gegen das Modul-Register auf. Das ist
   der Reproduzierbarkeits-Riegel: fehlt die Kombination im Register, oder weicht der ECHTE
   Inhalt vom registrierten Hash ab, wird geworfen — nie eine "nächstbeste" Fassung gezogen. */
function modulAufloesen(typ, eintrag, modulBestand, modulRegister) {
  const { herkunft, moduleVersion } = eintrag;
  if (!herkunft || typeof moduleVersion !== 'number') {
    throw new Error('modulAufloesen("' + typ + '"): Eintrag ohne herkunft/moduleVersion — '
      + 'kein gültiger Manifest-Zeiger.');
  }
  const schluessel = typ + '::' + herkunft + '::' + moduleVersion;
  const registrierterHash = modulRegister[schluessel];
  if (!registrierterHash) {
    throw new Error('modulAufloesen: (' + typ + ', ' + herkunft + ', v' + moduleVersion + ') steht '
      + 'nicht im Modul-Register — unbekannte Kombination, kein stiller Rückfall.');
  }
  const inhalt = modulBestand[schluessel];
  if (inhalt === undefined) {
    throw new Error('modulAufloesen: (' + typ + ', ' + herkunft + ', v' + moduleVersion + ') ist '
      + 'registriert, aber kein Modul-Inhalt im Bestand gefunden.');
  }
  const echterHash = sha256Hex(kanonischesJSON(inhalt));
  if (echterHash !== registrierterHash) {
    throw new Error('modulAufloesen: (' + typ + ', ' + herkunft + ', v' + moduleVersion + ') — '
      + 'Inhalt weicht vom registrierten Hash ab (erwartet ' + registrierterHash + ', echt '
      + echterHash + '). Ein verändertes Modul OHNE moduleVersion-Sprung wird NICHT '
      + 'stillschweigend als aktuelle Fassung gezogen — genau der Fall, den D2 (Negativkontrolle) '
      + 'verlangt.');
  }
  return inhalt;
}

/* Der eigentliche Bauschritt: löst jede Achse + jedes Template gegen den Modul-Bestand auf
   und baut daraus ein Bündel nach demselben Schema wie `BUERGERMODUL_BUENDEL` (gleichrangige
   Schlüssel je Achse). Rein deterministisch bei gleicher Eingabe — der Aufrufer entscheidet,
   was mit `ergebnis.buendel`/`ergebnis.sha256` geschieht (Datei schreiben, vergleichen, …),
   diese Funktion selbst schreibt nichts auf Platte („Daten, kein Bauskript" gilt auch hier). */
function konfektionierenAusManifest(manifest, kontext) {
  const { modulBestand, modulRegister, achsenErlaubnis } = kontext;
  achsenErlaubnisPruefen(manifest, achsenErlaubnis);
  const buendel = {};
  for (const [typ, eintrag] of Object.entries(manifest.achsen || {})) {
    buendel[typ] = modulAufloesen(typ, eintrag, modulBestand, modulRegister);
  }
  if (Array.isArray(manifest.templates) && manifest.templates.length) {
    buendel.templates = manifest.templates.map((eintrag) => modulAufloesen('template', eintrag, modulBestand, modulRegister));
  }
  const json = kanonischesJSON(buendel);
  return { buendel, json, sha256: sha256Hex(json) };
}

/* Diff auf Feldebene zwischen zwei Manifesten — lädt KEINE referenzierten Module (Vorteil
   des Zeiger-Formats, Entwurf Abschnitt 3 Punkt 4). Vergleicht nur, WELCHE Achse sich
   unterscheidet und wie (herkunft/moduleVersion), nicht den Modul-Inhalt selbst. */
function manifestDiff(a, b) {
  const unterschiede = [];
  const achsenTypen = new Set([...Object.keys(a.achsen || {}), ...Object.keys(b.achsen || {})]);
  for (const typ of [...achsenTypen].sort()) {
    const von = (a.achsen && a.achsen[typ]) || null;
    const nach = (b.achsen && b.achsen[typ]) || null;
    if (kanonischesJSON(von) !== kanonischesJSON(nach)) {
      unterschiede.push({ achse: typ, von, nach });
    }
  }
  const templatesA = kanonischesJSON((a.templates || []).slice().sort((x, y) => (x.herkunft > y.herkunft ? 1 : -1)));
  const templatesB = kanonischesJSON((b.templates || []).slice().sort((x, y) => (x.herkunft > y.herkunft ? 1 : -1)));
  if (templatesA !== templatesB) {
    unterschiede.push({ achse: 'templates', von: a.templates || [], nach: b.templates || [] });
  }
  return unterschiede;
}

module.exports = {
  sortiert, kanonischesJSON, sha256Hex,
  achsenErlaubnisPruefen, modulAufloesen, konfektionierenAusManifest, manifestDiff,
};
