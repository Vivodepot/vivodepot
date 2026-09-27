'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   produkt-text-erzeugen.js — der fs-freie Backschritt, ausgelagert (Auftrag
   „den letzten Bauabschnitt zusammenführen", 12.09.2026)
   ────────────────────────────────────────────────────────────────────────────
   DIESE DATEI WIRD BYTE-FÜR-BYTE (der Abschnitt zwischen den beiden PRODUKT_TEXT_ERZEUGEN-
   Markern unten) IN DEN SCHWESTERREPO KOPIERT (vivodepot-download-gateway, `src/
   produkt-text-erzeugen.js`) — der Worker bündelt beim Deploy nur seinen eigenen Baum, kann
   also nichts von hier zur Laufzeit lesen (dieselbe Begründung, mit der U2-ADR-405 eine
   Ableitung fürs Rezeptbuch verworfen hat). EINE KOPIERTE FUNKTION, DIE STILL VOM ORIGINAL
   ABWEICHT, IST GEFÄHRLICHER ALS EINE KOPIERTE DATENLISTE — sie baut Produkte, die niemand
   geprüft hat. Darum: eine gepinnte Prüfsumme über GENAU DEN MARKIERTEN ABSCHNITT, wortgleich
   in BEIDEN Repositorien gehalten (`tools/lib/produkt-text-erzeugen-pruefsumme.js` hier,
   `tools/lib/produkt-text-erzeugen-pruefsumme.js` dort — U2-ADR-406).

   WARUM AUSGELAGERT, NICHT NUR MARKIERT INNERHALB VON produkt-konfektionieren.js: der
   restliche Teil dieser Datei (CLI, `main()`, `vorbedingungenPruefen`, alles was `node:fs`
   braucht) hat KEINE Entsprechung im Worker und darf nicht mitkopiert werden — eine eigene
   Datei macht die Grenze baulich sichtbar, nicht nur behauptet. `produkt-konfektionieren.js`
   requiret diese Datei jetzt, statt die Funktionen selbst zu definieren — reine Verschiebung,
   keine Verhaltensänderung (geprüft: die volle Suite bleibt grün). */

/* ==PRODUKT_TEXT_ERZEUGEN:BEGIN== */
/* Reihenfolge dieses Arrays ist für das BACKEN selbst irrelevant (jede Region wird unabhängig
   per Marker-Suche ersetzt) — die tatsächlich scharfe Reihenfolge (Bereich VOR Logikmodul, s.
   Kern-Kommentar an _alleModulRegisterAusDepotAnmelden im Kern) ist zur LAUFZEIT im Kern
   verdrahtet, nicht hier. */
const AB_WERK_REGIONEN = Object.freeze([
  {
    // Das Vor-Depot-Sprachangebot (U2-ADR-428): eine Liste textsatz-förmiger Module unter eigenem modulTyp, damit sie kein Produkt-Sprachmodul sind.
    modulTyp: 'sprachangebot',
    kennung: 'AB_WERK_SPRACHANGEBOT_QUELLEN',
    begin: '/* AB_WERK_SPRACHANGEBOT_QUELLEN:BEGIN */',
    ende: '/* AB_WERK_SPRACHANGEBOT_QUELLEN:END */',
    nativerWert: 'Object.freeze([])',
  },
  {
    modulTyp: 'textsatz',
    kennung: 'AB_WERK_SPRACHE_PRODUKT',
    begin: '/* AB_WERK_SPRACHE_PRODUKT:BEGIN */',
    ende: '/* AB_WERK_SPRACHE_PRODUKT:END */',
    nativerWert: 'null',
  },
  {
    modulTyp: 'bereich',
    kennung: 'AB_WERK_BEREICH_QUELLEN',
    begin: '/* AB_WERK_BEREICH_QUELLEN:BEGIN */',
    ende: '/* AB_WERK_BEREICH_QUELLEN:END */',
    nativerWert: 'Object.freeze([])',
  },
  {
    modulTyp: 'logikModul',
    kennung: 'AB_WERK_LOGIK_MODUL_QUELLEN',
    begin: '/* AB_WERK_LOGIK_MODUL_QUELLEN:BEGIN */',
    ende: '/* AB_WERK_LOGIK_MODUL_QUELLEN:END */',
    nativerWert: 'Object.freeze([])',
  },
  {
    // Register-Ausbau (VDM1-Auftrag, 17.09.2026) — wörtlicher Spiegel von AB_WERK_LOGIK_MODUL_QUELLEN:
    // dieselbe Einlassweg-Prüfung (situationsModulPruefen), dieselbe Listenform, mehrere Quellen
    // dürfen nebeneinander bestehen. Kennung/Slot aus dem bestehenden achten EINLASS_REGISTER-
    // Eintrag ('situation'/situationsModule) übernommen, keine neue Prüfung erfunden.
    modulTyp: 'situation',
    kennung: 'AB_WERK_SITUATIONEN_QUELLEN',
    begin: '/* AB_WERK_SITUATIONEN_QUELLEN:BEGIN */',
    ende: '/* AB_WERK_SITUATIONEN_QUELLEN:END */',
    nativerWert: 'Object.freeze([])',
  },
  {
    // Register-Ausbau (VDM1-Auftrag, 17.09.2026) — wörtlicher Spiegel von AB_WERK_LOGIK_MODUL_QUELLEN/
    // AB_WERK_SITUATIONEN_QUELLEN: dieselbe Einlassweg-Prüfung (wizardsModulPruefen), dieselbe
    // Listenform. Kennung/Slot aus dem neunten EINLASS_REGISTER-Eintrag ('wizard'/wizardsModule)
    // übernommen. pvwiz/kiwiz laufen NICHT hierüber (U2-ADR-344/346, WIZARD_BUENDEL_VERBOTENE_IDS) —
    // dieselbe Grenze wie im nativen `buergermodulBuendelAnwenden`-Zweig.
    modulTyp: 'wizard',
    kennung: 'AB_WERK_WIZARD_QUELLEN',
    begin: '/* AB_WERK_WIZARD_QUELLEN:BEGIN */',
    ende: '/* AB_WERK_WIZARD_QUELLEN:END */',
    nativerWert: 'Object.freeze([])',
  },
  {
    modulTyp: 'bereichsErsatz',
    kennung: 'AB_WERK_BEREICHS_ERSATZ',
    begin: '/* AB_WERK_BEREICHS_ERSATZ:BEGIN */',
    ende: '/* AB_WERK_BEREICHS_ERSATZ:END */',
    bauform: 'zuweisung',
    ziel: 'BUERGERMODUL_BUENDEL.bereichsErsatz',
    nativerWert: 'null',
  },
  {
    modulTyp: 'vorlage',
    kennung: 'AB_WERK_VORLAGEN_QUELLEN',
    begin: '/* AB_WERK_VORLAGEN_QUELLEN:BEGIN */',
    ende: '/* AB_WERK_VORLAGEN_QUELLEN:END */',
    nativerWert: 'Object.freeze([])',
  },
  {
    // U2-ADR-NNN (19.09.2026, „Angehörigen-Blätter sind Template, kein Gerüst") — wörtlicher
    // Spiegel von 'situation'/AB_WERK_SITUATIONEN_QUELLEN: eine Listen-Region, mehrere Quellen
    // dürfen nebeneinander bestehen (Beispielfall aus der Produktentscheidung: mehrere Rechtsraum-Vorlagen + eine
    // Berufs-Vorlage in einem Produkt/Depot). Erstes Produkt, das hier etwas einbackt:
    // privat-de/pro-de mit tools/angehoerigen-vorlagen/vivodepot-angehoerigen-de.json.
    modulTyp: 'angehoerigenVorlage',
    kennung: 'AB_WERK_ANGEHOERIGEN_QUELLEN',
    begin: '/* AB_WERK_ANGEHOERIGEN_QUELLEN:BEGIN */',
    ende: '/* AB_WERK_ANGEHOERIGEN_QUELLEN:END */',
    nativerWert: 'Object.freeze([])',
  },
  {
    // Entscheidung 16.09.2026 (U2-ADR-398): die Bereiche aller Vivodepot-Produkte, in jedes
    // Produkt — dritte Quelle nach laufendem Produkt und Mitschrift (tools/vivodepot-bereiche-bekannt.json).
    modulTyp: 'bereicheBekannt',
    kennung: 'AB_WERK_BEREICHE_BEKANNT',
    begin: '/* AB_WERK_BEREICHE_BEKANNT:BEGIN */',
    ende: '/* AB_WERK_BEREICHE_BEKANNT:END */',
    nativerWert: 'null',
  },
  {
    modulTyp: 'branding',
    kennung: 'AB_WERK_BRANDING_PRODUKT',
    begin: '/* AB_WERK_BRANDING_PRODUKT:BEGIN */',
    ende: '/* AB_WERK_BRANDING_PRODUKT:END */',
    nativerWert: 'null',
  },
  {
    modulTyp: 'rechtsraum',
    kennung: 'AB_WERK_RECHTSRAUM_PRODUKT',
    begin: '/* AB_WERK_RECHTSRAUM_PRODUKT:BEGIN */',
    ende: '/* AB_WERK_RECHTSRAUM_PRODUKT:END */',
    nativerWert: '[]',
  },
  /* U2-ADR-345 (17.09.2026, DoD-Register-Umbau) — Dokumentmodule (PV/KI/Vollmacht/Betreuung)
     und Standardvorlagen verlassen den nativen Kern wie zuvor Bereich/Logikmodul/Vorlage. Kein
     Fremdmodul-Einlassweg vorhanden (EINLASS_REGISTER kennt keinen 'dokumentModul'/
     'standardVorlage'-Typ, gemessen) — beide Regionen sind reine Ab-Werk-Saat, kein Docking.
     LISTEN-Typ wie bereich/logikModul/vorlage (nicht 'zuweisung'): mehrere Dateien mit
     demselben modulTyp duerfen nebeneinander bestehen, jede traegt ihre eigenen Schluessel
     (patientenverfuegung/ki-verfuegung/...); der Merge zu EINEM flachen Namensraum passiert
     nicht hier (reines Text-Splicing), sondern zur Laufzeit im Kern — wortgleicher Spiegel des
     Musters, das Situationen/Wizards fuer denselben Fall etabliert haben. */
  {
    modulTyp: 'dokumentModul',
    kennung: 'AB_WERK_DOKUMENT_MODULE',
    begin: '/* AB_WERK_DOKUMENT_MODULE:BEGIN */',
    ende: '/* AB_WERK_DOKUMENT_MODULE:END */',
    nativerWert: 'Object.freeze([])',
  },
  {
    // Amtliche Dokument-Wortlaute (PV/Vollmacht) und KI-Korpus — EINE Datei, EIN Objekt (kein Listen-Typ):
    // Datei traegt { modulTyp, ..., dokumente: { pvBmj, kiKorpus, vollmachtBmj } }, der Kern liest .dokumente.
    // Nativer Wert null: bei {} wirft _dokumenteAusBuendelMaterialisieren (gefunden === 0).
    modulTyp: 'dokumente',
    kennung: 'AB_WERK_DOKUMENTE_DE',
    begin: '/* AB_WERK_DOKUMENTE_DE:BEGIN */',
    ende: '/* AB_WERK_DOKUMENTE_DE:END */',
    nativerWert: 'null',
  },
  {
    modulTyp: 'standardVorlage',
    kennung: 'AB_WERK_STANDARD_VORLAGEN',
    begin: '/* AB_WERK_STANDARD_VORLAGEN:BEGIN */',
    ende: '/* AB_WERK_STANDARD_VORLAGEN:END */',
    nativerWert: 'Object.freeze([])',
  },
  {
    // Gerüst-Schnitt S7 (21.09.2026): die vollen Definitionen der dreizehn nativen Bereiche (Grundlage der RUHENDEN Bereiche, B12)
    // stehen nicht mehr im Gerüst, sondern in tools/bereiche-nativ-katalog-modul.json. EINE Datei, EIN Objekt (kein Listen-Typ):
    // { modulTyp, ..., bereiche: { <id>: <Definition> } }, der Kern liest .bereiche. Nativer Wert null.
    modulTyp: 'bereicheNativ',
    kennung: 'BEREICHE_NATIV_KATALOG',
    begin: '/* BEREICHE_NATIV_KATALOG:BEGIN */',
    ende: '/* BEREICHE_NATIV_KATALOG:END */',
    nativerWert: 'null',
  },  {
    // Gerüst-Schnitt S9 (22.09.2026, Zielkonflikt Paragraphen-Schnitt/Gerüst-Wächter): der Lebenslagen-Katalog (29 Lagen)
    // stand seit T5 direkt im Kern, nicht mehr — jetzt tools/lebenslagen-katalog-modul.json. EIN Objekt (kein Listen-Typ,
    // dieselbe Bauart wie BEREICHE_NATIV_KATALOG direkt darüber): { modulTyp, ..., bausteine: [ <Lage>, ... ] }, der Kern
    // liest .bausteine (Konstante BAUSTEINE, unverändert benannt). Produktunabhängig, byte-gleich in allen vier Produkten.
    modulTyp: 'lebenslagen',
    kennung: 'LEBENSLAGEN_KATALOG',
    begin: '/* LEBENSLAGEN_KATALOG:BEGIN */',
    ende: '/* LEBENSLAGEN_KATALOG:END */',
    nativerWert: 'null',
  },
]);

function _regionSpanne(quelle, region, datei) {
  const a = quelle.indexOf(region.begin);
  const b = quelle.indexOf(region.ende);
  if (a < 0 || b < 0 || b < a) {
    throw new Error('Ab-Werk-Region ' + region.kennung + ' fehlt/beschädigt in ' + datei + ' — Kern-Marker verschoben? Nicht raten, nachsehen.');
  }
  return { innenStart: a + region.begin.length, innenEnde: b, aussenEnde: b + region.ende.length };
}

// Der linksseitige Bezeichner zwischen den Markern — `const <kennung>` normalerweise, bei
// `bauform: 'zuweisung'` stattdessen das benannte `ziel` (eine bereits bestehende Eigenschaft,
// kein neuer Bezeichner). Beide Formen sind GENAU EIN Statement, keine Logik dazwischen.
function _regionLinksseite(region) {
  return region.bauform === 'zuweisung' ? region.ziel : ('const ' + region.kennung);
}

// NUR ein `<Linksseite> = <Literal>;` zwischen den Markern zugelassen — der Beleg, dass das
// Einbacken Nutzlast trägt, keine Logik (Auflage, 08.09.2026).
function _regionIstReineNutzlast(innenText, region) {
  const links = _regionLinksseite(region).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const muster = new RegExp('^\\s*' + links + ' = (null|Object\\.freeze\\(\\[[\\s\\S]*\\]\\)|\\{[\\s\\S]*\\}|\\[[\\s\\S]*\\]|"[^"]*"|-?\\d+(\\.\\d+)?|true|false);\\s*$');
  return muster.test(innenText);
}

function _regionNutzlastSetzen(quelle, region, wert, datei) {
  const { innenStart, innenEnde } = _regionSpanne(quelle, region, datei);
  const neuerInnenText = '\n' + _regionLinksseite(region) + ' = ' + JSON.stringify(wert) + ';\n';
  if (!_regionIstReineNutzlast(neuerInnenText, region)) {
    throw new Error('Region ' + region.kennung + ': gebackener Inhalt ist keine reine Nutzlast — nicht geschrieben.');
  }
  return quelle.slice(0, innenStart) + neuerInnenText + quelle.slice(innenEnde);
}

/* Klassifiziert ein BEREITS GEPARSTES Modul-Objekt gegen seinen eigenen, deklarierten `modulTyp`
   (nicht über Array-Position) — reine Objekt-Prüfung, kein `fs`. */
function _unsigniertesModulKlassifizieren(roh, basisname) {
  const region = AB_WERK_REGIONEN.find((r) => r.modulTyp === roh.modulTyp);
  if (!region) throw new Error('Unbekannter modulTyp „' + roh.modulTyp + '" in ' + basisname + ' — keine Ab-Werk-Region dafür definiert.');
  return { region, roh, basisname };
}

/* DER BACKSCHRITT SELBST — reiner Text-Ersetzer auf BEREITS KLASSIFIZIERTEN Modul-Objekten,
   kein `fs`, kein Pfad. `dateiname` ist nur die Bezeichnung in einer Fehlermeldung (s.
   `_regionSpanne`), kein Lesevorgang. */
function _abWerkModuleAufText(quelle, klassifiziert, dateiname) {
  const ergebnis = { module: [] };
  for (const region of AB_WERK_REGIONEN) {
    const treffer = klassifiziert.filter((m) => m.region === region);
    if (!treffer.length) continue;
    // textsatz/bereichsErsatz sind Aktiv-Konzepte (genau eine Sprache bzw. genau ein Bündel-
    // Ersatz) — Bereich/Logikmodul/Vorlage sind flache Listen, mehrere Quellen dürfen
    // nebeneinander bestehen (s. AB_WERK_RANGFOLGE_TABELLE).
    const istListenTyp = region.modulTyp === 'logikModul' || region.modulTyp === 'bereich' || region.modulTyp === 'vorlage'
      || region.modulTyp === 'situation' || region.modulTyp === 'wizard'
      || region.modulTyp === 'dokumentModul' || region.modulTyp === 'standardVorlage'
      || region.modulTyp === 'angehoerigenVorlage' || region.modulTyp === 'rechtsraum' || region.modulTyp === 'sprachangebot';
    const wert = istListenTyp ? treffer.map((m) => m.roh) : treffer[0].roh;
    if (!istListenTyp && treffer.length > 1) {
      throw new Error('Mehr als ein ' + region.modulTyp + '-Modul in unsignierteModulDateien — ' + region.kennung + ' trägt genau eines.');
    }
    quelle = _regionNutzlastSetzen(quelle, region, wert, dateiname);
    for (const m of treffer) ergebnis.module.push(m.basisname);
  }
  return { quelle, ergebnis };
}

const VOR_DEPOT_MARKER_BEGIN = '<!-- AB_WERK_VOR_DEPOT_KONFIGURATION:BEGIN -->';
const VOR_DEPOT_MARKER_ENDE = '<!-- AB_WERK_VOR_DEPOT_KONFIGURATION:END -->';

function _vorDepotKonfigurationSpanne(quelle, datei) {
  const a = quelle.indexOf(VOR_DEPOT_MARKER_BEGIN);
  const b = quelle.indexOf(VOR_DEPOT_MARKER_ENDE);
  if (a < 0 || b < 0 || b < a) {
    throw new Error('Ab-Werk-Region AB_WERK_VOR_DEPOT_KONFIGURATION fehlt/beschädigt in ' + datei + ' — Kern-Marker verschoben? Nicht raten, nachsehen.');
  }
  return { innenStart: a + VOR_DEPOT_MARKER_BEGIN.length, innenEnde: b, aussenEnde: b + VOR_DEPOT_MARKER_ENDE.length };
}

// Reiner Text-Ersetzer, kein `fs` — der Backschritt für die Vor-Depot-Konfiguration selbst.
// `vorDepotKonfigurationInhaltFn` liefert `'window.__vorDepotKonfiguration = […];\n'` — im Kern-
// Repositorium dieselbe Funktion wie `vorDepotKonfigurationDateiInhalt` in vivodepot-vc-
// issuer.html (reine Serialisierung, kein Funktionsaufruf, kein dynamischer Code — Sicherheits-
// bedingung von U2-ADR-182 dort).
function _vorDepotKonfigurationAufText(quelle, modulauswahl, vorDepotKonfigurationInhaltFn, datei) {
  const { innenStart, innenEnde } = _vorDepotKonfigurationSpanne(quelle, datei);
  const zuweisung = vorDepotKonfigurationInhaltFn(modulauswahl).trim();   // 'window.__vorDepotKonfiguration = […];'
  const neuerInnenText = '\n<script id="vor-depot-konfiguration">' + zuweisung + '</script>\n';
  return quelle.slice(0, innenStart) + neuerInnenText + quelle.slice(innenEnde);
}

/* Auftrag (12.09.2026) — Korrektur eines echten 404: `serviceWorkerRegistrieren()` im
   Kern versucht `sw.js` unbedingt zu registrieren, sobald nicht `file://` — unabhängig davon, ob
   DIESER Dateisatz überhaupt ein `sw.js` mitbringt. Seit „Produkt ist eine Datei" (10.09.2026,
   PRODUKT_DATEISATZ = ['vivodepot.html']) trifft das auf JEDES konfektionierte Produkt zu: eine
   Prüferin, die die Datei über HTTP(S) statt `file://` öffnet, sieht einen Konsolen-404, den kein
   Fehlerpfad braucht (empirisch gemessen, nicht nur gelesen — Befund vom 12.09.2026).

   DIESELBE FAMILIE WIE AB_WERK_VOR_DEPOT_KONFIGURATION, nicht die generische AB_WERK_REGIONEN-
   Liste (die bildet Modul-DATEIEN auf Regionen ab, hier gibt es keine Modul-Datei, nur ein
   true/false/null-Tatbestand). Nativer Wert im ungebackenen Kern: `null` — „unbekannt, alter Weg
   gilt" (Bestandsschutz für JEDEN Dateisatz, der diese Region nie gebacken hat, allen voran die
   GEHOSTETE Fassung über `tools/modul-app-packen.js`/`dateisatzUndIndexAblegen`, die weiterhin
   ein echtes `sw.js` mitliefert und die Registrierung braucht). NUR wer explizit weiß, dass sein
   Dateisatz KEIN `sw.js` trägt, backt `false` — das ist der einzige Fall, den dieser Bau ändert. */
const SERVICE_WORKER_MARKER_BEGIN = '<!-- AB_WERK_SERVICE_WORKER_VORHANDEN:BEGIN -->';
const SERVICE_WORKER_MARKER_ENDE = '<!-- AB_WERK_SERVICE_WORKER_VORHANDEN:END -->';

function _serviceWorkerVorhandenSpanne(quelle, datei) {
  const a = quelle.indexOf(SERVICE_WORKER_MARKER_BEGIN);
  const b = quelle.indexOf(SERVICE_WORKER_MARKER_ENDE);
  if (a < 0 || b < 0 || b < a) {
    throw new Error('Ab-Werk-Region AB_WERK_SERVICE_WORKER_VORHANDEN fehlt/beschädigt in ' + datei + ' — Kern-Marker verschoben? Nicht raten, nachsehen.');
  }
  return { innenStart: a + SERVICE_WORKER_MARKER_BEGIN.length, innenEnde: b, aussenEnde: b + SERVICE_WORKER_MARKER_ENDE.length };
}

// Reiner Text-Ersetzer, kein `fs` — `vorhanden` ist ausdrücklich true/false, NIE aus dem Kern
// selbst ableitbar (der kennt seine eigenen Nachbardateien nicht). Der Aufrufer (Konfektionierer,
// Worker) kennt seinen eigenen Dateisatz — nur er darf das behaupten.
function _serviceWorkerVorhandenAufText(quelle, vorhanden, datei) {
  const { innenStart, innenEnde } = _serviceWorkerVorhandenSpanne(quelle, datei);
  const neuerInnenText = '\n<script id="ab-werk-service-worker-vorhanden">window.__abWerkServiceWorkerVorhanden = '
    + JSON.stringify(!!vorhanden) + ';</script>\n';
  return quelle.slice(0, innenStart) + neuerInnenText + quelle.slice(innenEnde);
}

/* Spezifikation 34.7 (md5 aa468bfa): die Angaben der Urheberin am Herkunftsort, BEIM ERZEUGEN geprüft. SELBSTENTHALTEN — kein require, kein fs: dieser Abschnitt wird byte-für-byte
   in den Worker kopiert und läuft dort ohne eine zweite Datei. Der Block HERKUNFTSORT_ANGABEN steht im Kern-Text (erzeugt aus tools/herkunftsort-angaben.json, in jedem Träger
   byte-gleich); der Konfektionierer, die Prüfung (tools/herkunftsort-pruefen.js) und der Kern lesen dieselbe Stelle. tools/lib/herkunftsort-angaben.js führt diese Funktionen
   unter ihren alten Namen weiter (Erzeuger und Tests), eine Umsetzung, nicht zwei. */
const HERKUNFTSORT_BLOCK_ANFANG = '/* HERKUNFTSORT-ANGABEN:BEGIN — DAUERHAFT';
const HERKUNFTSORT_BLOCK_ENDE = '/* HERKUNFTSORT-ANGABEN:END */';
// Der Block im Text, samt Grenzen; null, wenn er fehlt.
function herkunftsortBlockFinden(text) {
  const a = text.indexOf(HERKUNFTSORT_BLOCK_ANFANG);
  if (a < 0) return null;
  const e = text.indexOf(HERKUNFTSORT_BLOCK_ENDE, a);
  if (e < 0) return null;
  return { start: a, ende: e + HERKUNFTSORT_BLOCK_ENDE.length, text: text.slice(a, e + HERKUNFTSORT_BLOCK_ENDE.length) };
}
// Die Konstante aus dem Block-Text lesen (der Block ist erzeugt: `Object.freeze` und Zeichenketten-Literale in fester Form, keine Ausführung).
function herkunftsortAngabenLesen(text) {
  const b = herkunftsortBlockFinden(text);
  if (!b) return null;
  const marke = /marke: '([^']+)'/.exec(b.text);
  const name = /name: '([^']+)'/.exec(b.text);
  const lizenz = /lizenz: '([^']+)'/.exec(b.text);
  const kopf = /schluessel: Object\.freeze\(\{(.*)\}\) \}\);/.exec(b.text);
  if (!marke || !name || !lizenz || !kopf) return null;
  const schluessel = {};
  for (const m of kopf[1].matchAll(/([A-Za-z0-9_]+): Object\.freeze\(\[([^\]]*)\]\)/g)) schluessel[m[1]] = [...m[2].matchAll(/'([^']+)'/g)].map((x) => x[1]);
  return { urheberin: { name: name[1], marke: marke[1] }, lizenz: lizenz[1], schluessel };
}
/* Ein Sprachmodul, das einen Herkunftsort-Schlüssel setzt, MUSS die Platzhalter tragen und DARF `{marke}`/`{marke_domain}` dort nicht führen. Liefert die Verstöße als Zeilen; leer = in
   Ordnung. Ein Modul, das den Schlüssel nicht setzt, ist hier kein Verstoß (das nackte Gerüst trägt keine Sprache, 36.4) — die Anzeige ergänzt dann die Angabe. Ohne Sprachmodul im
   Rezept gibt es nichts zu prüfen; MIT Sprachmodul und ohne Block im Kern-Text ist es NICHT prüfbar — das ist ein Fehler, kein Grün. */
function herkunftsortRezeptPruefen(kernText, module) {
  if (!(module || []).some((m) => m && m.modulTyp === 'textsatz' && m.texte)) return [];
  const angaben = herkunftsortAngabenLesen(kernText);
  if (!angaben) return ['der Kern trägt keinen Block HERKUNFTSORT_ANGABEN — die Angaben des Herkunftsorts sind nicht prüfbar'];
  const fehler = [];
  for (const m of module || []) {
    if (!m || m.modulTyp !== 'textsatz' || !m.texte) continue;
    for (const [k, platzhalter] of Object.entries(angaben.schluessel)) {
      const wert = m.texte['strings:' + k + '.text'];
      if (typeof wert !== 'string') continue;
      const wo = 'Sprachmodul ' + (m.kennung || m.sprache || '?') + ', ' + k;
      for (const p of platzhalter) if (!wert.includes(p)) fehler.push(wo + ': der Text trägt den Platzhalter ' + p + ' nicht — die Angabe der Urheberin darf nicht ersetzt werden (34.7)');
      if (/\{marke(_domain)?\}/.test(wert)) fehler.push(wo + ': {marke} ist am Herkunftsort nicht zulässig — er löst aus dem Branding auf, nicht aus der Urheberin (34.7)');
    }
  }
  return fehler;
}

/* DIE FUNKTION OHNE DATEISYSTEM — Voraussetzung für einen Worker (Cloudflare o. ä.), der beim
   Kauf konfektioniert statt vorab auf Platte — dort gibt es kein `node:fs`. Nimmt den Kern-TEXT
   (nicht einen Pfad) und bereits GEPARSTE Modul-Objekte (nicht Datei-Pfade), gibt den fertigen
   Produkt-TEXT zurück (schreibt ihn nicht).

   WAS DIESE FUNKTION NICHT KANN, WEIL SIE KEINE PFADE KENNT: sie lädt keine Modulquellen nach.
   `unsignierteModule` MUSS bereits die geparsten Modul-Objekte tragen ({modulTyp, roh,
   basisname} je Eintrag — `basisname` ist nur eine Bezeichnung für die Rückgabe/
   Fehlermeldungen, kein Lesevorgang). Wer sie im Worker aufruft, muss diese Objekte selbst
   beschaffen (WebDAV, KV, R2 — was auch immer dort „Datei" ersetzt). `modulauswahl` (der
   signierte Vor-Depot-Weg) war ohnehin nie an einen Pfad gebunden.

   `serviceWorkerVorhanden` (Default `false`, Auftrag 12.09.2026): JEDER heutige Aufrufer
   dieser Funktion baut ein Einzeldatei-Produkt ohne `sw.js` — `false` ist darum der ehrliche
   Default hier, nicht `null` (das wäre die alte, 404-erzeugende Zusage, für die es unter dieser
   Funktion heute keinen einzigen echten Fall gibt). Ein künftiger Aufrufer mit echtem `sw.js`
   im Dateisatz übergibt `true` ausdrücklich. */
const ENTWICKLERLEISTE_MARKEN = Object.freeze([
  ['/* ENTWICKLERLEISTE:BEGIN */', '/* ENTWICKLERLEISTE:END */'],
  ['<!-- ENTWICKLERLEISTE:BEGIN -->', '<!-- ENTWICKLERLEISTE:END -->'],
]);
function _entwicklerleisteSchneiden(text, datei) {
  let out = text;
  for (const [anfang, ende] of ENTWICKLERLEISTE_MARKEN) {
    for (let i = out.indexOf(anfang); i >= 0; i = out.indexOf(anfang)) {
      const j = out.indexOf(ende, i);
      if (j < 0) throw new Error('ENTWICKLERLEISTE-Marker ohne Ende in ' + datei);
      out = out.slice(0, i) + out.slice(j + ende.length);
    }
  }
  if (out.indexOf('ENTWICKLERLEISTE:') >= 0) throw new Error('ENTWICKLERLEISTE-Marker ohne Anfang in ' + datei);
  return out;
}
const SPRACHKENNUNG_MUSTER = /^[A-Za-z]{2,3}(?:-[A-Za-z0-9]{1,8})*$/;
function _htmlLangAufText(text, module, datei) {
  const kennungen = [...new Set((module || [])
    .filter((m) => m && m.modulTyp === 'textsatz')
    .map((m) => (m.regeln && m.regeln.sprachkennung) || m.sprache))];
  if (kennungen.length === 0) return text;
  if (kennungen.length > 1) throw new Error('Mehr als eine Sprachkennung für ' + datei + ': ' + kennungen.join(', '));
  const kennung = kennungen[0];
  if (typeof kennung !== 'string' || !SPRACHKENNUNG_MUSTER.test(kennung)) throw new Error('Sprachkennung ist kein Sprach-Tag: ' + JSON.stringify(kennung));
  const m = /<html\b([^>]*)\blang="[^"]*"/.exec(text);
  if (m) return text.slice(0, m.index) + '<html' + m[1] + 'lang="' + kennung + '"' + text.slice(m.index + m[0].length);
  const ohne = /<html\b/.exec(text);
  if (!ohne) return text;
  return text.slice(0, ohne.index) + '<html lang="' + kennung + '"' + text.slice(ohne.index + ohne[0].length);
}
function produktTextErzeugen(kernText, { modulauswahl, vorDepotKonfigurationInhaltFn, unsignierteModule, serviceWorkerVorhanden, mitEntwicklerleiste }) {
  const datei = 'vivodepot.html';
  kernText = mitEntwicklerleiste === true ? kernText : _entwicklerleisteSchneiden(kernText, datei);
  // Spezifikation 34.7 (md5 aa468bfa): BEIM ERZEUGEN abweisen. Ein Rezept, dessen Sprachmodul einen Herkunftsort-Schlüssel ohne die Angabe der Urheberin setzt, bringt
  // kein Produkt hervor: der Mangel ist hier sichtbar, wo er behoben werden kann. Die Schlüsselmenge liest der Konfektionierer aus DEMSELBEN Kern-Text (Block
  // HERKUNFTSORT_ANGABEN), aus dem er baut — dieselbe Quelle wie Kern und tools/herkunftsort-pruefen.js. Die Ergänzung beim Anzeigen ist nicht die einzige Prüfung.
  const angabenFehler = herkunftsortRezeptPruefen(kernText, (unsignierteModule || []).map((m) => m.roh));
  if (angabenFehler.length) throw new Error('Das Rezept trägt die Angabe der Urheberin nicht (Spezifikation 34.7):\n  ' + angabenFehler.join('\n  '));
  const nachVorDepot = _vorDepotKonfigurationAufText(kernText, modulauswahl, vorDepotKonfigurationInhaltFn, datei);
  const nachServiceWorker = _serviceWorkerVorhandenAufText(nachVorDepot, serviceWorkerVorhanden !== undefined ? serviceWorkerVorhanden : false, datei);
  const klassifiziert = (unsignierteModule || []).map((m) => _unsigniertesModulKlassifizieren(m.roh, m.basisname));
  const { quelle, ergebnis } = _abWerkModuleAufText(nachServiceWorker, klassifiziert, datei);
  return { text: _htmlLangAufText(quelle, (unsignierteModule || []).map((m) => m.roh), datei), module: ergebnis.module };
}
/* ==PRODUKT_TEXT_ERZEUGEN:END== */

module.exports = {
  AB_WERK_REGIONEN, _regionSpanne, _regionLinksseite, _regionIstReineNutzlast, _regionNutzlastSetzen,
  _unsigniertesModulKlassifizieren, _abWerkModuleAufText,
  VOR_DEPOT_MARKER_BEGIN, VOR_DEPOT_MARKER_ENDE, _vorDepotKonfigurationSpanne, _vorDepotKonfigurationAufText,
  SERVICE_WORKER_MARKER_BEGIN, SERVICE_WORKER_MARKER_ENDE, _serviceWorkerVorhandenSpanne, _serviceWorkerVorhandenAufText,
  produktTextErzeugen, ENTWICKLERLEISTE_MARKEN, _entwicklerleisteSchneiden,
  HERKUNFTSORT_BLOCK_ANFANG, HERKUNFTSORT_BLOCK_ENDE, herkunftsortBlockFinden, herkunftsortAngabenLesen, herkunftsortRezeptPruefen,
};
