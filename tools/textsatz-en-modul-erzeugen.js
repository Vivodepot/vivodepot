'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   textsatz-en-modul-erzeugen.js — baut das echte, andockbare englische
   Sprachmodul („Bürgersatz englisch andocken", 27.08.2026)
   ────────────────────────────────────────────────────────────────────────────
   BEFUND: der reguläre Andock-Weg (Einstellungen → Module → Einlassen,
   vivodepot.html:34997/35159-35186) erwartet eine `.json`-Datei, deren
   Inhalt GENAU dem `modulEinlassen`-Vertrag entspricht — ein flaches Objekt
   `{modulTyp, sprache, moduleVersion, texte:{...}}`, keine Hülle, keine
   Signatur nötig (der `textsatz`-Eintrag im `EINLASS_REGISTER`,
   vivodepot.html:23282-23287, trägt kein `nurGeprueft` — anders als
   `branding`).

   DREI QUELLEN (Strang 3, 27.08.2026, „volle Abdeckung"): `tools/textsatz-en-
   daten.js` (Sektor-Texte), `tools/textsatz-en-optionswerte-daten.js`
   (Optionswerte), `tools/textsatz-en-vollabdeckung-daten.js` (restliche
   Kennungen: STRINGS-Bedienfluss-Text, Situationsblätter, Wizards,
   institutionsArt/institutionsFeld/menschenRegister/anlass/angSituation) —
   zusammen alle Kennungen aus AB_WERK_TEXTSATZ_DE.texte, kein benannter Rest mehr.
   Die genauen Zahlen NICHT hier hardcodiert (drifteten sonst lautlos, s.
   Fund 28.08.2026 unten bei `main()`) — `node tools/textsatz-en-modul-
   erzeugen.js` gibt den aktuellen Stand aus.

   UNSIGNIERT, BEWUSST: dies ist Vivodepots EIGENES Modul (kein Fremdmodul),
   für den ersten Testerlauf. `anbieterId: 'vivodepot'` markiert die Herkunft
   im Klartext — der volle Zertifikatsweg (U2-ADR-172/181) bliebe verfügbar,
   ist hier aber unnötige Fläche für denselben Beleg: Produktentscheidung testet ihr
   eigenes Modul, niemand muss sich gegenüber sich selbst ausweisen.

   SICHERHEITSNETZ: die zusammengeführte `texte` läuft vor dem Schreiben durch
   `textsatzModulPruefen` (derselbe Kern-Weg, den ein echter Upload nimmt) —
   ein Kennungs- oder Größenfehler bricht den Bau ab, statt eine kaputte Datei
   auszuliefern.

   Aufruf:
     node tools/textsatz-en-modul-erzeugen.js [ausgabepfad.json]
     (Standard-Ausgabepfad: tools/textsatz-en-modul.json)
   ════════════════════════════════════════════════════════════════════════════ */
const { deTexte } = require('./lib/textsatz-de-quelle.js');
const fs = require('node:fs');
const path = require('node:path');

const REPO = path.join(__dirname, '..');

function baueModul() {
  const { ladeKern } = require(path.join(REPO, 'tests', 'load-kern.js'));
  const { TEXTSATZ_EN_TEXTE } = require(path.join(__dirname, 'textsatz-en-daten.js'));
  const { TEXTSATZ_EN_OPTIONSWERTE } = require(path.join(__dirname, 'textsatz-en-optionswerte-daten.js'));
  const { TEXTSATZ_EN_VOLLABDECKUNG } = require(path.join(__dirname, 'textsatz-en-vollabdeckung-daten.js'));
  const { OFFEN_JURISTISCH } = require(path.join(__dirname, 'textsatz-en-juristisch-offen.js'));
  const { TEXTSATZ_EN_PRO_BEREICH } = require(path.join(__dirname, 'textsatz-en-pro-bereich-daten.js'));
  const { TEXTSATZ_EN_PRO_FELDER } = require(path.join(__dirname, 'textsatz-en-pro-felder-daten.js'));

  const quellen = { sektorTexte: TEXTSATZ_EN_TEXTE, optionswerte: TEXTSATZ_EN_OPTIONSWERTE, vollabdeckung: TEXTSATZ_EN_VOLLABDECKUNG,
    proBereich: TEXTSATZ_EN_PRO_BEREICH, proFelder: TEXTSATZ_EN_PRO_FELDER };
  const gesehen = new Map();
  for (const [name, obj] of Object.entries(quellen)) {
    for (const k of Object.keys(obj)) {
      if (gesehen.has(k)) throw new Error('Überschneidung zwischen ' + gesehen.get(k) + ' und ' + name + ' (sollte es nicht geben): ' + k);
      gesehen.set(k, name);
    }
  }

  /* U2-ADR-363 (07.09.2026, Zug 2, die Produktentscheidung über, wörtlich): „IMMER amtliche
     Fassungen. Wir liefern keinen Content." Die 151 OFFEN_JURISTISCH-Kennungen (amtlicher
     Wortlaut mit Rechtsfolge — Patientenverfügung/Vorsorgevollmacht/Betreuungsverfügung/
     KI-Verfügung) trägt das EN-Modul jetzt EBENFALLS, mit dem DEUTSCHEN amtlichen Original,
     byte-gleich aus AB_WERK_TEXTSATZ_DE.texte — NICHT mit einer selbst angefertigten Übersetzung.
     Eine selbst übersetzte amtliche Urkunde wäre eigener Content in einem amtlichen
     Dokument, genau das Verbot. Eine englischsprachige Bürgerin bekommt darum das amtliche
     deutsche Original, sichtbar gekennzeichnet (s. `AMTLICHE_UEBERSETZUNG_FESTSTELLUNG`,
     vivodepot.html) — keine Lücke, sondern die Rechtslage: eine amtliche englische Fassung
     existiert nicht (oder ist nicht belegt geprüft, s. dort).
     GERADE DESHALB DÜRFEN DIESE 151 NICHT IN `quellen` OBEN LANDEN — die
     Überschneidungs-Prüfung darüber gälte sonst auch für sie, obwohl ihre Quelle eine
     GANZ ANDERE ist (der Kern, nicht eine von Hand gepflegte Übersetzungstabelle). */
  const amtlicherWortlautDe = {};
  {
    const { V } = ladeKern();
    const fehlend = [];
    for (const k of OFFEN_JURISTISCH) {
      const w = deTexte()[k];
      if (typeof w !== 'string') { fehlend.push(k); continue; }
      amtlicherWortlautDe[k] = w;
    }
    if (fehlend.length) {
      throw new Error('EN-Erzeuger: ' + fehlend.length + ' OFFEN_JURISTISCH-Kennung(en) stehen nicht (mehr) in '
        + 'dem deutschen Sprachmodul — Kern und Rückstands-Liste sind auseinandergelaufen, nicht raten: '
        + fehlend.slice(0, 10).join(', '));
    }
    for (const k of Object.keys(amtlicherWortlautDe)) {
      if (gesehen.has(k)) throw new Error('OFFEN_JURISTISCH-Kennung ' + k + ' steht bereits in ' + gesehen.get(k)
        + ' — eine übersetzte Fassung existiert schon, aus der Rückstands-Liste streichen, nicht hier überschreiben.');
    }
  }

  const texte = Object.assign({}, TEXTSATZ_EN_TEXTE, TEXTSATZ_EN_OPTIONSWERTE, TEXTSATZ_EN_VOLLABDECKUNG, TEXTSATZ_EN_PRO_BEREICH, TEXTSATZ_EN_PRO_FELDER, amtlicherWortlautDe);
  return {
    modulTyp: 'textsatz',
    sprache: 'en',
    moduleVersion: 1,
    anbieterId: 'vivodepot',
    texte,
    /* U2-ADR-337 (06.09.2026, „die Sprach-Spur"): das Modul trug bislang
       KEINEN `regeln`-Kopf — ein Modul ohne ihn erbt den vollständig deutschen eingebauten
       Satz (TEXTSATZ_REGELN_EINGEBAUT), `datumsformat`/`dezimaltrenner`/`tausendertrenner`
       eingeschlossen.

       DATUMSFORMAT/TRENNER: britisches statt US-amerikanisches Englisch — belegt am
       eigenen Wortschatz der drei Quelldateien (licence/colour/favourite/Naturalisation,
       nicht license/color/favorite), nicht erfunden. `TT/MM/JJJJ` ist die britische
       Reihenfolge (Tag vor Monat, wie Deutsch) und steht in TEXTSATZ_REGELN_ERLAUBT.

       WAEHRUNG ABSICHTLICH AUSGELASSEN: sie haengt am RECHTSRAUM, nicht an der Sprache
       (dieselbe Achse, an der `es`/Ecuador vs. `es`/Spanien bereits EUR/USD unterscheiden,
       Schnitt Glied 4, A469 — s. tests/persona-p19-p20.test.js). Dieses Modul traegt keinen
       `rechtsraum` (der Normalfall fuer einen Anbieter, der genau einen Rechtsraum bedient,
       s. Kommentar an textsatzRechtsraumAktiv) und landet damit im rechtsraumlosen `''`-Fach
       — es bleibt beim eingebauten `EUR`, korrekt fuer eine englischsprachige Buergerin, die
       weiterhin in Deutschland lebt und in Euro rechnet. Ein rechtsraum-eigenes Modul (z. B.
       fuer die USA) bekaeme eine EIGENE `rechtsraum`+`regeln.waehrung`-Kombination ueber
       dieselbe Registry, nicht eine geaenderte Waehrung an diesem Modul.

       NICHT BEHAUPTET: dass eine englischsprachige Buergerin dadurch heute englisch
       formatierte Daten/Zahlen sieht. Gemessen (tests/a479-lese-app-textsatz-regeln.test.js,
       weiterhin gruen): der Kern liest `datumsformat`/`dezimaltrenner`/`tausendertrenner`
       NIRGENDS — Daten laufen ausnahmslos ueber das hart verdrahtete `_datumDeutsch`. Dieser
       Kopf schliesst die STRUKTURELLE Luecke des Moduls (und ist bereit, sobald der Kern die
       vier Regeln je einmal konsumiert), aendert am sichtbaren Ergebnis heute nichts — das
       ist ein eigener, hier nicht angefasster Bau. */
    regeln: {
      datumsformat: 'TT/MM/JJJJ',
      dezimaltrenner: '.',
      tausendertrenner: ',',
    },
  };
}

function main() {
  const { ladeKern } = require(path.join(REPO, 'tests', 'load-kern.js'));
  const { V } = ladeKern();
  const modul = baueModul();

  // Derselbe Prüf-Weg wie beim echten Upload — ein Fehler hier heißt, ein echter
  // Upload würde ihn ebenso ablehnen.
  // { vertrauenswuerdig: true }: dieses Modul IST die eingebackene Ab-Werk-Saat (AB_WERK_TEXTSATZ_EN).
  const r = V.textsatzModulPruefen(modul, { vertrauenswuerdig: true });
  if (!r.gueltig) {
    console.error('ABBRUCH: Modul ungültig — ' + r.grund);
    process.exit(1);
  }
  if (r.verworfene.length) {
    console.error('ABBRUCH: ' + r.verworfene.length + ' Kennung(en) wurden verworfen — Modul würde unvollständig ankommen:');
    for (const v of r.verworfene.slice(0, 20)) console.error('  ' + JSON.stringify(v));
    // Kein reiner Text: den Grund benennen, damit Übersetzende ihn beim Erstellen sehen (16.09.2026).
    const hinweise = require('./lib/textsatz-reiner-text-hinweis.js').reinerTextHinweise(r.verworfene, modul.texte, 'en');
    if (hinweise.length) console.error('Kein reiner Text:\n  ' + hinweise.join('\n  '));
    process.exit(1);
  }

  const roh = JSON.stringify(modul);
  const bytes = Buffer.byteLength(roh, 'utf8');
  const MAX = 512 * 1024; // _MODUL_EINLASS_MAX_BYTES, vivodepot.html
  if (bytes > MAX) {
    console.error('ABBRUCH: ' + bytes + ' Bytes überschreitet die Einlass-Obergrenze (' + MAX + ' Bytes).');
    process.exit(1);
  }

  const ausgabepfad = process.argv[2] || path.join(__dirname, 'textsatz-en-modul.json');
  fs.writeFileSync(ausgabepfad, JSON.stringify(modul, null, 2) + '\n', 'utf8');
  console.log('Modul geschrieben: ' + ausgabepfad);
  // Je-Quelle-Zahlen NICHT hardcodiert (drifteten sonst lautlos, wie hier am 28.08.2026
  // gefunden — "1726 Vollabdeckung" stand im Text, obwohl die Datei längst 1734 trug):
  // dieselben drei Quellen wie baueModul() erneut angefordert (require() cached), nur zum Zählen.
  const { TEXTSATZ_EN_TEXTE } = require(path.join(__dirname, 'textsatz-en-daten.js'));
  const { TEXTSATZ_EN_OPTIONSWERTE } = require(path.join(__dirname, 'textsatz-en-optionswerte-daten.js'));
  const { TEXTSATZ_EN_VOLLABDECKUNG } = require(path.join(__dirname, 'textsatz-en-vollabdeckung-daten.js'));
  const { OFFEN_JURISTISCH } = require(path.join(__dirname, 'textsatz-en-juristisch-offen.js'));
  const { TEXTSATZ_EN_PRO_BEREICH } = require(path.join(__dirname, 'textsatz-en-pro-bereich-daten.js'));
  const { TEXTSATZ_EN_PRO_FELDER } = require(path.join(__dirname, 'textsatz-en-pro-felder-daten.js'));
  console.log('Kennungen: ' + Object.keys(modul.texte).length + ' (' + Object.keys(TEXTSATZ_EN_TEXTE).length
    + ' Sektor-Texte + ' + Object.keys(TEXTSATZ_EN_OPTIONSWERTE).length + ' Optionswerte + '
    + Object.keys(TEXTSATZ_EN_VOLLABDECKUNG).length + ' Vollabdeckung + ' + Object.keys(TEXTSATZ_EN_PRO_BEREICH).length
    + ' Pro-Bereich (aus betriebssatz-inhalte.js) + ' + Object.keys(TEXTSATZ_EN_PRO_FELDER).length
    + ' Pro-Felder (aus der Vorlage) + ' + OFFEN_JURISTISCH.length
    + ' amtlicher Wortlaut auf Deutsch, U2-ADR-363)');
  console.log('Größe: ' + bytes + ' Bytes von ' + MAX + ' erlaubt.');
  console.log('Alle Kennungen von textsatzModulPruefen angenommen, 0 verworfen.');
}

if (require.main === module) main();
module.exports = { baueModul };
