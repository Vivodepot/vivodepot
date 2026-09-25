'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   sprachbuendel-deckung.js — trägt ein Sprachbündel jede Kennung seines Kerns? (16.09.2026)
   ────────────────────────────────────────────────────────────────────────────
   ANLASS: Das englische Bündel, am 16.09. um 14:18 signiert, zeigte im Kern v712 fünf rohe
   Kennungen — die Stick-Texte, die nach der Signatur landeten. Ein signiertes Bündel friert den
   Textstand ein; jeder spätere Kern, der Texte hinzufügt, läuft ihm davon. Gemessen mit
   tools/altbestand-vier-produkte-messen.js, U2-ADR-416.

   WAS GEFRAGT WIRD: Jede Kennung aus `AB_WERK_TEXTSATZ_DE.texte` des Kerns, der gepackt wird, muss
   je Sprache (und Rechtsraum) in den Textsatz-Modulen des Bündel-Stapels einen Text haben. Die
   Texte laufen dafür durch `textsatzModulPruefen` DESSELBEN Kerns — damit gilt eine alte Kennung,
   die der Kern beim Einlesen übersetzt (U2-ADR-141 Entscheidung 4), als getragen, und eine, die er
   verwirft, als fehlend. Kein zweiter Prüfer.

   WAS NICHT GEFRAGT WIRD: die Signatur (die prüft `modulEinlassenGeprueft` beim Import) und
   Deutsch (`sprache: 'de'` bleibt im Einlassweg reserviert, U2-ADR-285). Ein Stapel ohne
   Textsatz-Modul liefert eine leere Liste — ein Bereichs-Bündel hat keine Sprache zu decken.

   Gemeinsam benutzt von tools/modul-app-packen.js (Teil 2: verweigern) und dem künftigen
   Auslieferungslauf (Teil 1: vor der Signatur abbrechen).
   ════════════════════════════════════════════════════════════════════════════ */

// Die Nutzlast eines Bündel-Eintrags: signiert (JWS, zweiter Teil) oder ein nacktes Modul.
const { deTexte } = require('./textsatz-de-quelle.js');
function modulAusEintrag(eintrag) {
  if (eintrag && typeof eintrag.modulSignaturJws === 'string') {
    const teile = eintrag.modulSignaturJws.split('.');
    if (teile.length !== 3) return null;
    try { return JSON.parse(Buffer.from(teile[1], 'base64url').toString('utf8')); } catch (_) { return null; }
  }
  return (eintrag && typeof eintrag === 'object' && typeof eintrag.modulTyp === 'string') ? eintrag : null;
}

/* V: ein über tests/load-kern.js geladener Kern. Rückgabe: je Sprachfach
   { sprache, rechtsraum, module, fehlend: [Kennung …] } — sortiert, stabil. */
function sprachbuendelDeckung(V, eintraege) {
  /* OHNE die Zusicherungs-Kennungen (ZS2, 19.09.2026, U2-ADR-331 im Kern): die zwölf Sätze, mit
     denen der Kern über Herkunft/Stand eingelassener Erweiterungen spricht, deckt der gepackte
     Kern selbst — über seine EIGENE, gebackene Ab-Werk-Saat (AB_WERK_TEXTSATZ_EN/DE), nicht über
     ein begleitendes Sprachbündel. Ein Sprachbündel ist ein GELADENES Modul (nicht Teil des
     Kern-Quelltexts) und darf diese Kennungen seit ZS2 gar nicht mehr setzen —
     `textsatzModulPruefen` weist sie ungetrustet als `zusicherung` ab. Sie hier weiter zu
     VERLANGEN hieße, ein Bündel für etwas zu rügen, das es nicht (mehr) tun darf. */
  const soll = Object.keys(deTexte()).filter((k) => !V._istZusicherungsKennung(k));
  /* ZUSICHERUNGSSÄTZE, WIEDER VERLANGT (19.09.2026, Entwurf U2-ADR-NNN): ein SIGNIERTES Sprachmodul darf sie in einer Sprache setzen, die
     die Anwendung nicht selbst trägt (nicht `de`, nicht `en`). Wer signiert, bürgt — ein Modul mit dem Stempel der Prüferin soll nicht
     stillschweigend Lücken in genau diesen Sätzen tragen. Gefragt wird nach den Kennungen des Kerns UND der Lese-App (eigene Liste, eigene
     Sätze); die Lese-App-Schlüssel stehen für den Kern als „unbekannt", darum zählt hier der ROHE Modultext. */
  const zusicherungen = new Set(Object.keys(deTexte()).filter((k) => V._istZusicherungsKennung(k)));
  try {
    const L = require('../../tests/load-lesen.js').ladeLesen().V;
    for (const k of (L.ZUSICHERUNGS_SCHLUESSEL_LESEN || [])) zusicherungen.add('strings:' + k + '.text');
  } catch (_) { /* ohne Lese-App-Liste: nur die Kern-Sätze */ }
  const faecher = new Map();
  for (const e of Array.isArray(eintraege) ? eintraege : []) {
    const m = modulAusEintrag(e);
    if (!m || m.modulTyp !== 'textsatz' || typeof m.sprache !== 'string' || m.sprache === 'de') continue;
    const geprueft = V.textsatzModulPruefen(m);
    if (!geprueft || !geprueft.gueltig) continue;
    const schluessel = m.sprache + '/' + (geprueft.rechtsraum || '');
    if (!faecher.has(schluessel)) faecher.set(schluessel, { sprache: m.sprache, rechtsraum: geprueft.rechtsraum || '', module: 0, texte: new Set(), roh: new Set() });
    const f = faecher.get(schluessel);
    f.module++;
    for (const k of Object.keys(geprueft.texte)) f.texte.add(k);
    for (const k of Object.keys(m.texte || {})) f.roh.add(k);
  }
  return [...faecher.values()]
    .sort((a, b) => (a.sprache + '/' + a.rechtsraum).localeCompare(b.sprache + '/' + b.rechtsraum))
    .map((f) => ({
      sprache: f.sprache, rechtsraum: f.rechtsraum, module: f.module, fehlend: soll.filter((k) => !f.texte.has(k)).sort(),
      fehlendZusicherung: f.sprache === 'en' ? [] : [...zusicherungen].filter((k) => !f.roh.has(k)).sort(),
    }));
}

/* Was ein Fach am Ende heißt: fehlt ein ZUSICHERUNGSSATZ, gibt es keine Ausnahme (hart); fehlen andere Texte, gilt dasselbe, außer die Signierende
   bestätigt die Lücke ausdrücklich (`bestaetigt`) — dann steht sie als Warnung da. Rückgabe { hart: [Meldung], warnung: [Meldung] }. */
function deckungsUrteil(fach, bestaetigt) {
  const hart = []; const warnung = [];
  if (fach.fehlendZusicherung && fach.fehlendZusicherung.length) {
    hart.push('Sprachbündel „' + fach.sprache + (fach.rechtsraum ? '/' + fach.rechtsraum : '') + '" trägt ' + fach.fehlendZusicherung.length
      + ' Zusicherungssatz(-sätze) nicht — dafür gibt es keine Ausnahme: ' + fach.fehlendZusicherung.slice(0, 8).join(', ')
      + (fach.fehlendZusicherung.length > 8 ? ' … (+' + (fach.fehlendZusicherung.length - 8) + ')' : ''));
  }
  if (fach.fehlend.length) (bestaetigt ? warnung : hart).push(deckungsMeldung(fach) + (bestaetigt ? ' [ausdrücklich bestätigt]' : ' (mit --unvollstaendig-bestaetigt trotzdem, wenn das gewollt ist)'));
  return { hart, warnung };
}

// Eine Zeile für eine Verweigerung: benennt die fehlenden Kennungen, bis `grenze`, und zählt den Rest.
function deckungsMeldung(fach, grenze = 20) {
  const liste = fach.fehlend.slice(0, grenze).join(', ') + (fach.fehlend.length > grenze ? ' … (+' + (fach.fehlend.length - grenze) + ')' : '');
  return 'Sprachbündel „' + fach.sprache + (fach.rechtsraum ? '/' + fach.rechtsraum : '') + '" trägt ' + fach.fehlend.length
    + (fach.fehlend.length === 1 ? ' Kennung' : ' Kennungen') + ' des gepackten Kerns nicht — neu signieren: ' + liste;
}

// Fach-Schlüssel für die moduleVersion-Zählung — dieselbe Form wie in
// tools/sprachmodule-ausliefern.js (dort lokal `modulFach`, hier geteilt für V-2, s. u.).
function modulFach(m) {
  return m.modulTyp + '/' + (m.sprache || '') + '/' + (m.rechtsraum || '');
}

/* V-2 (Code-Review vom 16.09.2026, NIEDRIG): sprachbuendelDeckung() prüft
   nur, ob jede Kennung DA ist — ein Bündel, das jede Kennung trägt, aber mit älteren Texten (aus
   einem früheren --vorbereiten-Lauf erneut gepackt), gilt darum als „frisch". moduleVersion je
   Fach aus einem Bündel-Stapel lesen (roh, ungeprüft — dieselbe Nutzlast wie modulAusEintrag,
   OHNE Signaturprüfung: das Gegenstück in modul-app-packen.js vergleicht nur Zahlen, es
   vertraut den Texten nicht). */
function moduleVersionenAusBuendel(eintraege) {
  const raus = new Map();
  for (const e of Array.isArray(eintraege) ? eintraege : []) {
    const m = modulAusEintrag(e);
    if (!m || !Number.isInteger(m.moduleVersion)) continue;
    const fach = modulFach(m);
    raus.set(fach, Math.max(raus.get(fach) || 0, m.moduleVersion));
  }
  return raus;
}

module.exports = { modulAusEintrag, sprachbuendelDeckung, deckungsMeldung, deckungsUrteil, modulFach, moduleVersionenAusBuendel };
