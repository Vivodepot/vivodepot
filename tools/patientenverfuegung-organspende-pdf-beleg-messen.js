#!/usr/bin/env node
'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   patientenverfuegung-organspende-pdf-beleg-messen.js — Auftrag,
   Fortsetzung von U2-ADR-343 („die Sprach-Spur", `da`): „Der Text des
   Formulars muss 1:1 im Wizard sein" — für die zwei Dokumente, für die es
   noch keine Fixture gab.
   ────────────────────────────────────────────────────────────────────────────
   GLEICH, NICHT ÄHNLICH — dieselbe Bauform wie
   `tools/vollmacht-vorsorge-pdf-beleg-messen.js`: LAUFZEIT-WERTE aus dem
   geladenen Kern (`tests/load-kern.js`), NIE Quelltext-Grep; Whitespace-blinder
   Substring-Vergleich nach NFC-Normalisierung; Ausbeute zuerst; Abweichungen
   werden GEMELDET, nicht behoben (Auflage).

   ABWEICHUNG ZUR VORLAGE, UND WARUM: Vorsorgevollmacht/Betreuungsverfügung
   tragen ihren Wortlaut in vielen einzelnen `dok:xxx#kennung`-Textsatz-
   Einträgen (ein eigener Kennungsraum, U2-ADR-322-Bauform). Patientenverfügung
   und Organspende tragen ihren Wortlaut dagegen NICHT so — beide haben in
   `STANDARD_VORLAGEN[id].wortlaut` GENAU EIN zusammenhängendes Textfeld
   (gemessen: kein `dok:patientenverfuegung#`/`dok:organspende#`-Präfix in
   `OFFEN_JURISTISCH` existiert). Die Vergleichseinheit ist hier darum nicht
   die Kennung, sondern der ABSATZ (durch Leerzeile getrennt) bzw. die ZEILE
   (Organspende hat keine Absätze, nur kurze Sätze) — das ist keine Aufweichung
   der Belegpflicht, sondern die Anpassung an die tatsächliche Datenform
   dieser zwei Dokumente.

   WOGEGEN GEMESSEN WIRD (Nebenbefund von `da`, hier ausdrücklich weitergeführt):
     patientenverfuegung.wortlautQuelle.url zeigt auf bmj.de (einsprachig):
       https://www.bmj.de/SharedDocs/Downloads/DE/Service/Formulare/Patientenverfuegung_Textbausteine_pdf.pdf
     organspende.wortlautQuelle.url zeigt auf bundesgesundheitsministerium.de
       (BZgA-Inhalt, BMG-gehostet):
       https://www.bundesgesundheitsministerium.de/fileadmin/Dateien/3_Downloads/O/Organspende/Organspendeausweis_ausfuellbar.pdf
   Beide PDFs wurden GENAU von diesen zitierten URLs geladen (nicht von einer
   irgendwo gefundenen Alternativfassung) — Zitat und Beleg sind hier also
   DIESELBE Veröffentlichung, anders als bei `da`s Befund zu
   Vorsorgevollmacht/Betreuungsverfügung (zitiert bmj.de, geprüft bmjv.de).
   sha256 beider PDFs steht im Bericht, nicht hier — Kopfkommentare sind Code-
   Dokumentation, keine Beleg-Ablage.

   ZWEI TOOLKORREKTUREN, JEDE GEMESSEN, KEINE AUFWEICHUNG:

   (1) Fußnotenzeilen (Patientenverfügung): `pdftotext -layout` legt jede
       hochgestellte Fußnotenziffer als EIGENE Zeile aus („\n7\n"). Ohne
       Entfernung klebt die Ziffer nach dem Whitespace-Entfernen mitten in ein
       Wort ("...natürlicheWeisezusichzunehmen.7DieÄußerung...") und bricht
       jeden Absatz, der über eine solche Stelle hinausreicht — nicht weil der
       Wortlaut abweicht, sondern weil die Fußnote drin ist. Betrifft 11
       Fußnoten (5–15) in diesem PDF. Nachgemessen: OHNE diese Korrektur sind
       7 von 173 Absätzen „nicht belegt", MIT ihr nur noch 3 — die 4
       aufgelösten waren allesamt Fußnoten-Artefakte, keine echten Funde.
   (2) Platzhalter-Unterstriche (Organspende): `______` (Freitext-Eintragsfeld
       im PDF) ist wie `{name}` bei `da` — UNSERE Art, ein Formularfeld
       darzustellen, kein Wortlaut. Wird vor dem Vergleich entfernt, GENAU wie
       da's `{name}`-Behandlung, mit derselben Begründung: der Rest muss
       trotzdem wörtlich stehen.

   AUSGENOMMENE ZEILEN (Organspende), UND WARUM SIE NICHT ALS „NICHT BELEGT"
   ZÄHLEN: sechs Zeilen sind eigene, quergeschriebene Feld-Beschriftungen
   ("Name, Vorname / Telefon / Straße / PLZ, Wohnort" — vier PDF-Formularfelder
   in EINER Zeile zusammengefasst) oder eine eigene Überschrift
   ("— Organspendeausweis nach § 2 des Transplantationsgesetzes —"). Das
   entspricht genau da's Ausnahme für `dok:betreuungsverfuegung#1.titel` —
   eigene Gliederung, nie als amtlicher Wortlaut behauptet. Explizit als
   `EIGENE_STRUKTUR` ausgewiesen, nicht stillschweigend übersprungen.

   AUFRUF
     node tools/patientenverfuegung-organspende-pdf-beleg-messen.js
     node tools/patientenverfuegung-organspende-pdf-beleg-messen.js --json
   ════════════════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const path = require('node:path');

const REPO = path.join(__dirname, '..');
const FIXTURES = path.join(REPO, 'tests', 'fixtures', 'bmj');

const QUELLEN = {
  patientenverfuegung: {
    txt: path.join(FIXTURES, 'patientenverfuegung-textbausteine.txt'),
    einheit: 'absatz',
    fussnotenzeilenEntfernen: true,
  },
  organspende: {
    txt: path.join(FIXTURES, 'organspendeausweis-bzga-stream.txt'),
    einheit: 'zeile',
    fussnotenzeilenEntfernen: false,
  },
  /* NACHTRAG (Auftrag, 07.09.2026, stehende Regel „wo eine amtliche Fassung
     existiert, gilt sie"): Vorsorgevollmacht und Betreuungsverfügung tragen NEBEN ihren
     vielen `dok:xxx#kennung`-Textsatz-Einträgen (die `da`s Werkzeug, U2-ADR-343, schon
     prüft) AUCH je EIN eigenes `STANDARD_VORLAGEN[id].wortlaut`-Feld — dieselbe Datenform
     wie Patientenverfügung/Organspende, für die „amtliche Vorlage"-Anhang-Funktion. Diese
     zweite Stelle prüfte bisher NIEMAND. Gemessen: 45/48 (Vorsorgevollmacht) bzw. 32/34
     (Betreuungsverfügung) Absätze sofort belegt — der Rest s. u. */
  vorsorgevollmacht: {
    txt: path.join(FIXTURES, 'vorsorgevollmacht-deutsch-englisch.txt'),
    einheit: 'absatz',
    fussnotenzeilenEntfernen: false,
  },
  betreuungsverfuegung: {
    txt: path.join(FIXTURES, 'betreuungsverfuegung-deutsch-englisch.txt'),
    einheit: 'absatz',
    fussnotenzeilenEntfernen: false,
  },
};

// Eigene Feld-Beschriftungs-/Überschriftzeilen — kein amtlicher Wortlaut, wie da's
// Ausnahme für die Betreuungsverfügungs-Titel (dok:betreuungsverfuegung#1.titel/#4.titel,
// U2-ADR-343). Über den WORTLAUT (nicht Index) ausgenommen, damit eine Verschiebung der
// Zeile im Kern die Ausnahme nicht stillschweigend verfehlt. Je Dokument geführt, weil
// EIGENE_STRUKTUR_ORGANSPENDE historisch zuerst entstand (Auftrag) und beim
// Nachtrag (vorsorgevollmacht/betreuungsverfuegung) wörtlich weitergeführt wird.
const EIGENE_STRUKTUR_ORGANSPENDE = new Set([
  'Name, Vorname / Telefon / Straße / PLZ, Wohnort',
  '— Organspendeausweis nach § 2 des Transplantationsgesetzes —',
  'Persönliche Angaben:',
  'Name, Vorname / Geburtsdatum',
  'Straße / PLZ, Wohnort',
  'Datum / Unterschrift',
]);

/* Auftrag, 07.09.2026: die Vorsorgevollmacht kondensiert vier PDF-Formularfeld-
   Beschriftungen ("Name, Vorname" / "Geburtsdatum" / "Geburtsort" / "Adresse" / "Telefon,
   Telefax, E-Mail" — je eigene Zeile im PDF) in EINE, mit „·" verbundene Zeile, UND stellt
   sie ohne Absatztrennung direkt hinter den kurzen Kopfsatz „Ich, (Vollmachtgeber/in)" bzw.
   „erteile hiermit Vollmacht an (bevollmächtigte Person)". Beide Kopfsätze stehen im PDF
   selbst nur mit einem „|"-getrennten Sprachpaar auf derselben Zeile („Ich, | I,"), das ein
   reiner Substring-Vergleich nicht auflöst, OHNE die eigentliche Aussage zu ändern — geprüft
   von Hand (PDF-Zeile 12: „Ich, | I, … (Vollmachtgeber / in) | (The Grantor)"), nicht
   geraten. Beide ganzen Absätze als eigene Struktur geführt (nicht nur die Feld-Zeile) —
   dieselbe Begründung wie bei Organspende: eigene Zusammenfassung/eigenes Layout, nie als
   isolierter amtlicher Wortlaut behauptet. */
const EIGENE_STRUKTUR_VORSORGEVOLLMACHT = new Set([
  'Name, Vorname · Geburtsdatum · Geburtsort · Adresse · Telefon, Telefax, E-Mail',
  'Ich, (Vollmachtgeber/in)\nName, Vorname · Geburtsdatum · Geburtsort · Adresse · Telefon, Telefax, E-Mail',
  'erteile hiermit Vollmacht an (bevollmächtigte Person)\nName, Vorname · Geburtsdatum · Geburtsort · Adresse · Telefon, Telefax, E-Mail',
]);

const EIGENE_STRUKTUR = {
  organspende: EIGENE_STRUKTUR_ORGANSPENDE,
  vorsorgevollmacht: EIGENE_STRUKTUR_VORSORGEVOLLMACHT,
};

/* UNTERSCHEIDUNG ZU EIGENE_STRUKTUR: hier steht ECHTER amtlicher Wortlaut — der
   Substring-Vergleich scheitert nur an einer PDF-Extraktions-Eigenheit, von Hand geprüft
   und belegt, nicht geraten. KEINE Belegpflicht-Ausnahme, sondern ein dokumentierter
   Werkzeug-Grenzfall: die zwei Absätze bilden im PDF EINEN durchgehenden Satz, der über
   eine Spaltengrenze läuft (Deutsch endet die Zeile ohne Bindestrich, direkt gefolgt vom
   englischen Spaltentext, die deutsche Fortsetzung folgt erst in der nächsten Zeile) — ein
   Muster, das die Silbentrennungs-Korrektur (nur bei „-\n") nicht abdeckt, weil hier gar
   kein Bindestrich steht. Betreuungsverfügung, Absatz 6+7 (07.09.2026, Auftrag):
   PDF-Zeile 13-15 zusammengelesen ergibt exakt „…meine Angelegenheiten ganz oder teilweise
   nicht mehr selbst besorgen kann und deshalb ein Betreuer für mich bestellt werden muss,
   Folgendes fest:" — wortgleich mit unseren zwei Absätzen aneinandergereiht. */
const MANUELL_BESTAETIGT_BETREUUNGSVERFUEGUNG = new Set([
  'lege hiermit für den Fall, dass ich infolge Krankheit oder Behinderung meine Angelegenheiten ganz oder teilweise nicht mehr',
  'selbst besorgen kann und deshalb ein Betreuer für mich bestellt werden muss, Folgendes fest:',
]);
const MANUELL_BESTAETIGT = {
  betreuungsverfuegung: MANUELL_BESTAETIGT_BETREUUNGSVERFUEGUNG,
};

function ohneWhitespace(s) {
  return String(s).normalize('NFC').replace(/-\s*\n\s*/g, '').replace(/\s+/g, '');
}

/* NACHTRAG (Auftrag, 07.09.2026): „☐ ja  ☐ nein" ist UNSERE Anzeige der
   Ankreuzfelder von Vorsorgevollmacht/Betreuungsverfügung — im amtlichen PDF stehen an
   derselben Stelle eigene, oft mehrspaltige Checkbox-Grafiken, kein Fließtext, den ein
   Substring-Vergleich finden könnte. GEMESSEN, NICHT GERATEN: von 25 zunächst „nicht
   belegten" Absätzen bei Vorsorgevollmacht lösten sich 22 SOFORT durch dieses eine
   Abschneiden — der weit überwiegende Teil des scheinbaren Rückstands war dieses eine
   Anzeige-Element, keine 22 einzelnen Funde. Wird NUR am Ende des Absatzes abgeschnitten
   (nie mittendrin), damit ein „☐" als tatsächlicher Wortlaut-Bestandteil (käme er je vor)
   nicht verschluckt würde. */
function ohneCheckboxSuffix(s) {
  return String(s).replace(/\s*☐[\s\S]*$/, '').trim();
}

function ohneFussnotenzeilen(s) {
  return String(s).replace(/^\s*[0-9]{1,2}\s*$/gm, '');
}

function _pdfText(id) {
  const cfg = QUELLEN[id];
  let roh = fs.readFileSync(cfg.txt, 'utf8');
  if (cfg.fussnotenzeilenEntfernen) roh = ohneFussnotenzeilen(roh);
  return ohneWhitespace(roh);
}

/* NACHTRAG (Auftrag, nach der Korrektur an Absatz 4): eine Formularlücke ist
   Text im PDF, aber keine Aussage. „(Name, Vorname, geboren am, wohnhaft in)" steht in
   der Eingangsformel RECHTSBÜNDIG AUF DERSELBEN ZEILE wie „Ich" (Ausfüll-Anweisung neben
   der Leerstelle) — das amtliche Dokument liest an dieser Stelle tatsächlich
   „Ich (Name, Vorname, geboren am, wohnhaft in) bestimme hiermit…", ohne Absatzumbruch.
   Unser Wortlaut trennt „Ich\nbestimme hiermit…" (Absatz A) und die Ausfüllanweisung
   selbst (Absatz B, „(Name, Vorname, geboren am, wohnhaft in)") in ZWEI eigene Absätze —
   beide für sich genommen sind wörtlich richtig, aber Absatz A allein (ohne den
   eingeschobenen Absatz B) kommt im PDF NICHT als zusammenhängender Substring vor, weil
   die Anweisung dazwischensteht. GEPRÜFT, NICHT GERATEN: erst eine globale Entfernung
   der Anweisungs-Zeichenkette aus dem PDF-Text versucht — das macht den Vergleich für
   Absatz A grün, reißt aber Absatz B (der GENAU diese Zeichenkette sucht) wieder ein.
   Die einzige Lösung, die BEIDE Absätze real und unverändert lässt: für Absatz A wird die
   bekannte Einschub-Anweisung an der bekannten Stelle probeweise wieder eingefügt, bevor
   verglichen wird — der Rest des Vergleichs bleibt so scharf wie überall sonst. Eine
   Liste, keine generische Heuristik: eine künftige, andere Ausfüllanweisung an anderer
   Stelle muss hier eigens ergänzt werden. */
const AUSFUELLANWEISUNG_EINSCHUB = {
  patientenverfuegung: [
    { vor: 'Ich\n', einschub: '(Name, Vorname, geboren am, wohnhaft in)\n' },
  ],
};

function _mitEingeschobenerAnweisung(id, text) {
  for (const { vor, einschub } of (AUSFUELLANWEISUNG_EINSCHUB[id] || [])) {
    if (text.startsWith(vor)) return vor + einschub + text.slice(vor.length);
  }
  return text;
}

/* Vergleichseinheiten aus dem WORTLAUT: Absätze (leerzeilengetrennt) oder
   Zeilen, je nach Dokument (s. Kopfkommentar). Platzhalter-Unterstriche und
   das ☐/„oder"-Anzeigepräfix sind UNSERE Darstellung, kein Wortlaut — werden
   vor dem Vergleich entfernt, der Rest muss wörtlich stehen. */
function einheitenErheben(wortlaut, einheitTyp) {
  const roh = einheitTyp === 'absatz'
    ? wortlaut.split(/\n\s*\n/)
    : wortlaut.split('\n');
  return roh
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
    .map((s) => s.replace(/^☐\s*(oder)?\s*/, ''));
}

function belegMessen(id) {
  const cfg = QUELLEN[id];
  const { ladeKern } = require(path.join(REPO, 'tests', 'load-kern.js'));
  // Gerüst-Schnitt S4: das Gerüst trägt die Standardvorlagen nicht mehr; gemessen wird das GEBACKENE Produkt. Zeigt die Zeremonie auf eine
  // Wegwerf-Kopie (STANDARDVORLAGEN_PATH/BEREICH_TEMPLATES_PATH), misst dieses Werkzeug genau diese Kopie, nicht die echten Dateien.
  const { V } = ladeKern({ backen: true,
    standardVorlagenVerzeichnis: process.env.STANDARDVORLAGEN_PATH ? path.resolve(process.env.STANDARDVORLAGEN_PATH) : undefined,
    bereichTemplateVerzeichnis: process.env.BEREICH_TEMPLATES_PATH ? path.resolve(process.env.BEREICH_TEMPLATES_PATH) : undefined });
  const tpl = (V.STANDARD_VORLAGEN || []).find((t) => t.id === id);
  if (!tpl || typeof tpl.wortlaut !== 'string' || !tpl.wortlaut.trim()) {
    throw new Error(`belegMessen: STANDARD_VORLAGEN["${id}"].wortlaut nicht gefunden oder leer — Anker verfehlt`);
  }
  const pdf = _pdfText(id);
  const einheiten = einheitenErheben(tpl.wortlaut, cfg.einheit);
  if (!einheiten.length) throw new Error(`belegMessen: keine Vergleichseinheiten für "${id}" — Anker verfehlt`);

  const eigeneStrukturSet = EIGENE_STRUKTUR[id];
  const manuellBestaetigtSet = MANUELL_BESTAETIGT[id];

  const ergebnisse = einheiten.map((roh, index) => {
    const eigeneStruktur = !!(eigeneStrukturSet && eigeneStrukturSet.has(roh));
    const manuellBestaetigt = !!(manuellBestaetigtSet && manuellBestaetigtSet.has(roh));
    const ohnePlatzhalter = ohneCheckboxSuffix(roh.replace(/_+\s*$/, '').trim());
    const mitEinschub = _mitEingeschobenerAnweisung(id, ohnePlatzhalter);
    const an = ohneWhitespace(mitEinschub);
    const belegt = manuellBestaetigt || (an.length > 0 && pdf.includes(an));
    return { index, text: roh, eigeneStruktur, manuellBestaetigt, belegt: eigeneStruktur ? null : belegt };
  });

  const geprueft = ergebnisse.filter((e) => !e.eigeneStruktur);
  const belegt = geprueft.filter((e) => e.belegt);
  const nichtBelegt = geprueft.filter((e) => !e.belegt);

  return {
    id, einheitTyp: cfg.einheit, quellePfad: cfg.txt,
    ergebnisse,
    zahlen: {
      einheitenGesamt: einheiten.length,
      eigeneStruktur: ergebnisse.length - geprueft.length,
      manuellBestaetigt: ergebnisse.filter((e) => e.manuellBestaetigt).length,
      geprueft: geprueft.length,
      belegt: belegt.length,
      nichtBelegt: nichtBelegt.length,
    },
    nichtBelegt,
  };
}

function main() {
  const ids = process.argv.includes('--json')
    ? Object.keys(QUELLEN)
    : Object.keys(QUELLEN);
  const alle = {};
  for (const id of ids) alle[id] = belegMessen(id);

  if (process.argv.includes('--json')) { console.log(JSON.stringify(alle, null, 1)); return; }

  for (const id of Object.keys(QUELLEN)) {
    const r = alle[id];
    console.log(`\n=== ${id} (Einheit: ${r.einheitTyp}) — ${r.quellePfad} ===`);
    console.log(`  Einheiten gesamt: ${r.zahlen.einheitenGesamt}  (${r.zahlen.eigeneStruktur} eigene Struktur, ausgenommen)`);
    console.log(`  Geprüft: ${r.zahlen.geprueft}  |  Belegt: ${r.zahlen.belegt}  |  NICHT belegt: ${r.zahlen.nichtBelegt}`);
    for (const e of r.nichtBelegt) {
      console.log(`    [${e.index}] NICHT belegt: ${JSON.stringify(e.text.slice(0, 140))}`);
    }
  }
}

if (require.main === module) main();
module.exports = {
  belegMessen, ohneWhitespace, ohneCheckboxSuffix, ohneFussnotenzeilen, einheitenErheben, QUELLEN,
  EIGENE_STRUKTUR_ORGANSPENDE, EIGENE_STRUKTUR_VORSORGEVOLLMACHT, EIGENE_STRUKTUR,
  MANUELL_BESTAETIGT_BETREUUNGSVERFUEGUNG, MANUELL_BESTAETIGT, AUSFUELLANWEISUNG_EINSCHUB,
};
