#!/usr/bin/env node
'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   produkt-konfektionieren.js — (07.09.2026), direkt aus der Ansage: „VD = VD Privat D/E
   und VD Pro D/E — also 4 Produkte, testbar und potentiell buchbar."
   ────────────────────────────────────────────────────────────────────────────
   NIMMT DAS GERÜST PLUS EINE MODULAUSWAHL, GIBT EIN AUFMACHBARES ARTEFAKT AUS.
   Baut den WEG, nicht den INHALT: entscheidet nicht, was in ein Produkt gehört
   (kein hartkodiertes Privat/Pro/D/E-Wissen im Werkzeug — die Modulauswahl kommt
   als Argument herein), baut keine Sprachmodule.

   KEIN ZWEITER ORT NEBEN BESTEHENDEN WERKZEUGEN — beide wörtlich wiederverwendet,
   nicht nachgebaut:
     `tools/modul-app-packen.js` — DATEISATZ/dateisatzUndIndexAblegen
                                              (byte-identischer Gerüst-Kopiervorgang,
                                              U2-ADR-194-Wurzel-404-Fix inklusive)
                                              und buendelListeAusDatei (Struktur-
                                              prüfung der JWS-Bündel).
     `tools/lib/manifest-konfektionieren.js` — U2-ADR-419/Block D: löst eine
                                              Modulauswahl (Manifest) gegen ein
                                              Register auf. Dieses Werkzeug hier
                                              schließt NICHT an dessen Ausgabe an
                                              (dessen `buendel` ist unsigniert,
                                              roher Inhalt — der Vor-Depot-Weg
                                              braucht signierte Bündel, s. u.),
                                              sondern liegt daneben in derselben
                                              Konfektionierungs-Familie: WAS geht
                                              in ein Depot ist dort entschieden,
                                              WIE ein Artefakt daraus wird, hier.
     `vivodepot-vc-issuer.html` (vorDepotKonfigurationDateiInhalt) — dieselbe
                                              Zeile wie modul-app-packen.js schreibt.

   DIE MODULAUSWAHL IST EIN ARGUMENT, NIE IM WERKZEUG: `--bundle <pfad>` zeigt auf
   eine JSON-Datei — ein Array bereits SIGNIERTER Bündel ({providerCredentialJws,
   modulSignaturJws, ausstellerZertifikatJws?}), wie modul-app-packen.js sie schon
   kennt. ANDERS als dort ist ein LEERES Array hier GÜLTIG — ein Produkt ohne
   Zusatzmodul (heutiger, ehrlicher Stand für ein Produkt, dem noch kein
   passendes Modul zur Seite steht) ist kein Fehler, sondern ein Fall.

   PRÄZISIERT (10.09.2026): dieser Satz gilt weiterhin für
   `konfektionieren()` SELBST — die Bibliotheksfunktion kennt Privat/Pro/D/E nie,
   Bibliotheks-Aufrufer (tools/vier-produkte-erzeugen.js, die E2E-Abnahme,
   tests/produkt-konfektionieren.test.js) liefern `unsignierteModulDateien` immer
   selbst. NUR `main()` — der direkte `--slug`-CLI-Weg, den die Ladenautomatik beim
   Kauf ruft — löst zusätzlich gegen `PRODUKTE` (tools/lib/vier-produkte.js) auf:
   das war die eigentliche Lücke (gemessen, 10.09.2026) — vier `--slug`-Aufrufe
   schrieben `diff -rq`-identische Ordner, weil dieser Default fehlte, obwohl
   `konfektionieren()` den Parameter längst nahm. `--bundle` bleibt daneben
   bestehen, für zusätzliche, vom PRODUKTE-Eintrag unabhängige signierte Module.

   WAS DIESES WERKZEUG NICHT TUT: es signiert nichts (dieselbe Grenze wie
   modul-app-packen.js — die Zertifikatskette ist ein eigener, bereits
   bestehender Schritt), es prüft die Bündel nur STRUKTURELL (drei JWS-Teile),
   die kryptografische Prüfung macht modulEinlassenGeprueft beim Import im
   Browser. Es committet nichts in ein anderes Repo (anders als modul-app-
   packen.js) — reiner Datei-Schreiber, der Aufrufer entscheidet, was mit den
   Dateien geschieht.

   DER WÄCHTER, DEN DIE PRODUKTENTSCHEIDUNG VERLANGT: „byte-gleiches Gerüst, verschiedene
   Module" — mehrere Aufrufe (privat-de/privat-en/pro-de/pro-en) MÜSSEN in
   `vivodepot.html`/`sw.js`/`manifest.webmanifest` byte-identisch bleiben, nur
   `vorabkonfiguration.js` darf sich unterscheiden. Das ist keine Eigenschaft,
   die dieses Werkzeug PRÜFT — es ist eine Eigenschaft, die aus der Bauform
   FOLGT: `dateisatzUndIndexAblegen` kopiert dieselben Quelldateien byte-für-
   byte, ohne Templating, ohne Textersetzung. Geprüft (nicht nur behauptet) in
   tests/produkt-konfektionieren.test.js — inklusive eines Rot-Beweises, der
   eine einzelne Gerüst-Zeile in EINER Konfektion pflanzt und verlangt, dass
   die Probe genau das findet.

   RECHTSRAUM DE GEHT NICHT DURCH `--bundle` — GEPRÜFT, NICHT VERGESSEN
   („Rechtsraum DE als Modul", 07.09.2026): anders als
   Sprache/Bereich/Branding/… liegt das deutsche Rechtsraum-Modul NICHT in
   der per-Produkt-Modulauswahl dieses Werkzeugs, sondern gebacken im
   byte-identischen Gerüst selbst (Weg A, `_rechtsraumGeruestModulLaden` in
   vivodepot.html, U2-ADR-285) — die Cert-Tabelle
   `_RECHTSRAUM_GERUEST_MODUL_CERTS` und die signierte Nutzlast-Konstante
   sind Gerüst-Konstanten, keine `--bundle`-Einträge. Das ist KEINE Lücke
   dieses Werkzeugs, sondern die richtige Folge davon, dass Rechtsraum=
   Deutschland für alle vier geplanten Produkte (Privat/Pro × D/E) GLEICH
   ist — nur Sprache variiert zwischen ihnen, s. `--bundle` mit einem
   Sprachmodul. Ein Rechtsraum-`--bundle`-Eintrag WÄRE hier sogar der
   falsche Weg: er liefe über `modulEinlassenGeprueft`, das denselben
   `EINLASS_REGISTER`-Prüfer bindet, der `rechtsraum:'DE'` ausnahmslos
   ablehnt (s. Kern-Kommentar an `validateRechtsraumModul`) — geprüft in
   tests/u2-adr-285-rechtsraum-geruest-modul.test.js
   ("EINLASS_REGISTER lehnt 'DE' weiterhin ausnahmslos ab"), nicht nur
   hier behauptet.

   Aufruf:
     node tools/produkt-konfektionieren.js --slug privat-de --bundle <pfad-oder-leer.json> --ziel <ordner>
   `--bundle` kann auf eine Datei mit `[]` zeigen — kein Zusatzmodul, gültig.
   `--slug` muss einer der vier `PRODUKTE`-Slugs sein (privat-de/privat-en/pro-de/pro-en) —
   ein unbekannter Slug (Format gültig, aber kein PRODUKTE-Eintrag) wird benannt abgelehnt,
   es wird nichts geschrieben.
   ════════════════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const path = require('node:path');
const {
  slugGueltig, buendelListeAusDatei,
} = require('./modul-app-packen.js');
const { PRODUKTE } = require('./lib/vier-produkte.js');
const { fontInDateiEinbetten, familieAlsVendortRegistrieren } = require('./build-pdf-marke-schrift-einbetten.js');
// „den letzten Bauabschnitt zusammenführen" (12.09.2026): der fs-freie
// Backschritt selbst ist nach tools/lib/produkt-text-erzeugen.js ausgelagert — byte-für-byte
// dieselbe Datei liegt im Schwesterrepo (vivodepot-download-gateway, `src/produkt-text-
// erzeugen.js`), bewacht durch eine gepinnte Prüfsumme (U2-ADR-406). Reine Verschiebung hier,
// keine Verhaltensänderung — die volle Suite bleibt grün.
const {
  AB_WERK_REGIONEN, _regionSpanne, _regionLinksseite,
  _unsigniertesModulKlassifizieren, _abWerkModuleAufText,
  _vorDepotKonfigurationSpanne, _vorDepotKonfigurationAufText,
  _serviceWorkerVorhandenSpanne,
  produktTextErzeugen,
} = require('./lib/produkt-text-erzeugen.js');

const REPO = path.join(__dirname, '..');

// Marke-Achse-Plan §5/§6 Schritt 6 (14.09.2026, Produktentscheidung „Option A"):
// acht Partner-Töne als eigenes Konfektionierungsfeld, additiver Marker um die Konstante —
// genau dasselbe Muster wie AB_WERK_BRANDING_PRODUKT weiter unten. Die AA-Prüfung (min. 1.5:1
// roh gegen Weiß/Papier, dieselbe Regel wie die Haus-Palette implizit erfüllt) sitzt im Kern
// selbst (_subdepotPartnerPaletteGueltig/_subdepotPaletteAktiv, vivodepot.html) — dieses
// Werkzeug schreibt nur den Kandidaten, validiert nicht doppelt (dieselbe Aufgabenteilung wie
// bei AB_WERK_BRANDING_PRODUKT: brandingModulPruefen entscheidet, nicht der Bäcker).
const SUBDEPOT_PALETTE_BEGIN = '/* AB_WERK_SUBDEPOT_PALETTE_PRODUKT:BEGIN */';
const SUBDEPOT_PALETTE_END = '/* AB_WERK_SUBDEPOT_PALETTE_PRODUKT:END */';
function _subdepotPaletteInsDateiSchreiben(zielPfad, palette) {
  const html = fs.readFileSync(zielPfad, 'utf8');
  const anfang = html.indexOf(SUBDEPOT_PALETTE_BEGIN);
  const ende = html.indexOf(SUBDEPOT_PALETTE_END);
  if (anfang < 0 || ende < anfang) throw new Error('AB_WERK_SUBDEPOT_PALETTE_PRODUKT-Marker fehlt in ' + zielPfad);
  const innenStart = anfang + SUBDEPOT_PALETTE_BEGIN.length;
  const neueZeile = '\nconst AB_WERK_SUBDEPOT_PALETTE_PRODUKT = ' + JSON.stringify(palette) + ';\n';
  fs.writeFileSync(zielPfad, html.slice(0, innenStart) + neueZeile + html.slice(ende), 'utf8');
}

// „Produkt ist eine Datei" (10.09.2026, Produktentscheidung: „Ein Produkt ist eine
// html-Datei"): das AUSGELIEFERTE Produkt ist NUR NOCH `vivodepot.html` — anders als
// `modul-app-packen.js`s `DATEISATZ` (drei Dateien, für GEHOSTETE Modul-Apps über GitHub
// Pages, http(s), wo sw.js/manifest.webmanifest echten Nutzen haben). Bewusst eine eigene,
// kleinere Liste hier statt der importierten `DATEISATZ` — die beiden Zwecke sind
// verschieden, seit heute auch in der Dateizahl, nicht nur im Namen.
const PRODUKT_DATEISATZ = ['vivodepot.html'];

/*, Ab-Werk-Rangfolge (08.09.2026, „Antwort ist (d)") — EINBACKEN STATT
   BEGLEITDATEI: `unsignierteModulDateien` (textsatz/logikModul, Vivodepots eigene, unsignierte
   Module) landen seit U2-ADR-387 NICHT mehr als Kopie NEBEN vivodepot.html, sondern ALS
   NUTZLAST IN zwei markierten Regionen DARIN — sonst öffnet die Datei allein (Isolationsprobe,
   tests/e2e/ab-werk-isolationsprobe.spec.js) nie das Modul, das sie tragen soll: eine zweite
   Datei daneben ist keine Isolation.

   DIE MARKER SIND DIE VERTRAGSSCHNITTSTELLE zu vivodepot.html — verschiebt der Kern sie, MUSS
   dieses Werkzeug laut werfen (nicht raten, welche Zeile gemeint war). Zwischen den Markern
   steht NUR ein Literal (Nutzlast, keine Logik) — dieselbe Auflage, die für die
   Kern-Seite gegeben hat, hier durchgesetzt: `_regionIstReineNutzlast` prüft es NACH jedem
   Bake, bevor geschrieben wird.

   WARUM DAS DEN BYTE-GLEICH-WÄCHTER NICHT AUFGIBT, SONDERN SCHÄRFT: vorher hieß die Zusage
   „vivodepot.html ist byte-gleich über alle Produkte". Das galt, WEIL die Module außerhalb
   lagen — mit U2-ADR-387 ist die Prämisse weg. Die neue, schärfere Zusage steht bei
   `gerüstByteGleich()` unten: „außerhalb der Marker-Regionen bleiben alle Produkte
   byte-identisch" — das ist etwas, das nach dem Backen überhaupt noch nachprüfbar ist, die
   alte Formel wäre es nicht mehr. */
// AB_WERK_REGIONEN, _regionSpanne, _regionLinksseite, _regionIstReineNutzlast,
// _regionNutzlastSetzen, _unsigniertesModulKlassifizieren, _abWerkModuleAufText,
// VOR_DEPOT_MARKER_BEGIN/ENDE, _vorDepotKonfigurationSpanne, _vorDepotKonfigurationAufText und
// produktTextErzeugen leben seit dem 12.09.2026 in tools/lib/produkt-text-erzeugen.js (oben
// importiert) — byte-für-byte dieselbe Datei liegt im Schwesterrepo, s. Kopf-Kommentar dort.

/* Liest eine unsignierte Modul-Datei von der Platte UND klassifiziert sie — der einzige Ort in
   dieser Datei, der für ein `unsignierteModulDateien`-Element (ein PFAD) noch `fs` braucht. */
function _unsigniertesModulLesen(quellPfad) {
  let roh;
  try { roh = JSON.parse(fs.readFileSync(quellPfad, 'utf8')); }
  catch (e) { throw new Error('Unsignierte Modul-Datei nicht lesbar/kein JSON: ' + quellPfad + ' — ' + e.message); }
  return _unsigniertesModulKlassifizieren(roh, path.basename(quellPfad));
}


/* DER WÄCHTER, DASS EINE REGION NACH DEM BACKEN NOCH GENAU EINE IST — für gerüstByteGleich():
   liefert die Quelle MIT allen Ab-Werk-Regionen auf ihren jeweiligen nativen Wert zurückgesetzt
   (nicht einfach herausgeschnitten — sonst verschöben sich die Positionen der Marker-Kommentare
   selbst gegen ein Produkt, das nichts gebacken hat, s. u.). Trägt seit heute (10.09.2026) auch
   die Vor-Depot-Konfiguration mit — in der Praxis backen die vier PRODUKTE alle dieselbe leere
   Liste (`modulauswahl: []`, s. tools/vier-produkte-erzeugen.js), diese Region wäre also schon
   ohne Rücksetzen byte-gleich; zurückgesetzt trotzdem, damit die Zusage auch dann noch gilt,
   wenn zwei Produkte künftig verschiedene signierte Bündel mitbringen. */
function _ohneAbWerkNutzlast(quelle, datei) {
  let ergebnis = quelle;
  for (const region of AB_WERK_REGIONEN) {
    const { innenStart, innenEnde } = _regionSpanne(ergebnis, region, datei);
    ergebnis = ergebnis.slice(0, innenStart) + '\n' + _regionLinksseite(region) + ' = ' + region.nativerWert + ';\n' + ergebnis.slice(innenEnde);
  }
  {
    const { innenStart, innenEnde } = _vorDepotKonfigurationSpanne(ergebnis, datei);
    ergebnis = ergebnis.slice(0, innenStart) + '\n<script id="vor-depot-konfiguration">window.__vorDepotKonfiguration = null;</script>\n' + ergebnis.slice(innenEnde);
  }
  {
    // (12.09.2026): dieselbe Rücksetzung wie oben, für die neue
    // AB_WERK_SERVICE_WORKER_VORHANDEN-Region — sonst wäre „byte-gleich" verletzt, sobald zwei
    // Produkte künftig verschiedene Dateisätze tragen (eines mit, eines ohne sw.js).
    const { innenStart, innenEnde } = _serviceWorkerVorhandenSpanne(ergebnis, datei);
    ergebnis = ergebnis.slice(0, innenStart) + '\n<script id="ab-werk-service-worker-vorhanden">window.__abWerkServiceWorkerVorhanden = null;</script>\n' + ergebnis.slice(innenEnde);
  }
  // (23.09.2026): das <html lang> schreibt der Backschritt je Produkt aus dem Sprachmodul (WCAG 3.1.1) — ein
  // gebackener Wert wie die Regionen oben, darum für den Vergleich auf einen festen Platzhalter gesetzt.
  ergebnis = ergebnis.replace(/(<html\b[^>]*\blang=")[^"]*(")/, '$1*$2');
  return ergebnis;
}

/* Liest die Modulauswahl-Datei. Anders als `buendelListeAusDatei` (das ein leeres
   Array als Fehler behandelt — dort ist „kein Modul" nie der Anlass für den Aufruf)
   ist ein leeres Array hier ein GÜLTIGER, benannter Fall: ein Produkt ohne
   Zusatzmodul. Für ein nicht-leeres Array wird dieselbe Strukturprüfung wie beim
   Modul-App-Packen wiederverwendet, nicht neu geschrieben. */
function modulauswahlLesen(bundlePfad) {
  let text;
  try { text = fs.readFileSync(bundlePfad, 'utf8'); }
  catch (e) { return { ok: false, fehler: 'Modulauswahl-Datei nicht lesbar: ' + e.message }; }
  let roh;
  try { roh = JSON.parse(text); }
  catch (e) { return { ok: false, fehler: 'Modulauswahl-Datei ist kein gültiges JSON: ' + e.message }; }
  if (!Array.isArray(roh)) return { ok: false, fehler: 'Modulauswahl-Datei muss ein Array sein (auch ein leeres).' };
  if (roh.length === 0) return { ok: true, liste: [] };
  return buendelListeAusDatei(path.resolve(bundlePfad));
}

/* (10.09.2026), gemessen am laufenden Bestand: die CLI nahm `--slug` bisher
   NUR als Ordnernamen entgegen — vier Aufrufe (privat-de/privat-en/pro-de/pro-en) schrieben
   `diff -rq`-identische Ergebnisse, weil `unsignierteModulDateien` nie aus `PRODUKTE`
   (tools/lib/vier-produkte.js) aufgelöst wurde, obwohl `konfektionieren()` den Parameter
   längst kennt (s. Kopf-Kommentar dort) — `tests/e2e/v515-vier-produkte-a-b-abnahme.spec.js`
   und `tools/vier-produkte-erzeugen.js` bauen ihn schon lange selbst zusammen, als Bibliotheks-
   Aufrufer von `konfektionieren()`, NICHT über diese CLI. `konfektionieren()` SELBST bleibt
   unverändert agnostisch (Bibliotheks-Aufrufer liefern `unsignierteModulDateien` weiterhin
   selbst, s. o.) — nur DIESE CLI (der direkte `--slug`-Weg, den die Ladenautomatik ruft) löst
   jetzt zusätzlich gegen `PRODUKTE` auf, als Default für die vier bekannten Slugs. Ein
   unbekannter Slug (Format gültig, aber kein PRODUKTE-Eintrag) wird darum benannt abgelehnt —
   sonst baute die CLI still einen leeren, ununterscheidbaren Ordner, genau der Fund, der zu
   diesem Nachtrag führte. */
function vorbedingungenPruefen({ slug, bundlePfad }) {
  const funde = [];
  let produkt = null;
  if (!slugGueltig(slug)) funde.push('Ungültiger Slug „' + slug + '" — nur Kleinbuchstaben/Ziffern, einzelne Bindestriche.');
  else {
    produkt = PRODUKTE.find((p) => p.slug === slug) || null;
    if (!produkt) {
      funde.push('Unbekannter Slug „' + slug + '" — kein Eintrag in PRODUKTE (tools/lib/vier-produkte.js). '
        + 'Bekannt: ' + PRODUKTE.map((p) => p.slug).join(', ') + '.');
    }
  }
  let modulauswahl = null;
  if (!bundlePfad) funde.push('--bundle fehlt (auf eine Datei mit `[]` zeigen, wenn kein Zusatzmodul gewünscht ist).');
  else {
    const r = modulauswahlLesen(bundlePfad);
    if (!r.ok) funde.push('Modulauswahl: ' + r.fehler);
    else modulauswahl = r.liste;
  }
  return { funde, modulauswahl, produkt };
}

// `produktTextErzeugen` selbst lebt seit dem 12.09.2026 in tools/lib/produkt-text-erzeugen.js
// (oben importiert) — s. dort für den vollen Kopf-Kommentar. `konfektionieren()` unten bleibt
// die dünne Datei-Hülle darum.

/* Der eigentliche Bauschritt — dünne Datei-Hülle um `produktTextErzeugen` (s. dort), kein Git,
   kein Netz. `vorDepotKonfigurationInhaltFn` kommt als Parameter herein (Dependency statt
   festem `require('../tests/load-issuer.js')` hier oben), damit dieses Modul
   sowohl vom CLI-Einstieg (der die echte Issuer-Sandbox lädt) als auch von der
   Suite (die dieselbe Sandbox einmal je Lauf lädt, nicht pro Test neu) verwendet
   werden kann, ohne die vm-Sandbox zweimal aufzubauen.

   `unsignierteModulDateien` (optional, Vier-Produkte-Auftrag, 07.09.2026):
   ZUSÄTZLICH zum signierten Vor-Depot-Weg (`modulauswahl`) — für Vivodepots
   EIGENE, nicht-nurGeprueft-Module (textsatz/logikModul tragen kein
   `nurGeprueft`, s. EINLASS_REGISTER), die der bestehende, unsignierte
   Andock-Weg (Einstellungen → Module → Einlassen) schon heute ohne
   Zertifikatskette annimmt — genau der Weg, für den `tools/textsatz-en-
   modul-erzeugen.js` sein Modul „UNSIGNIERT, BEWUSST" baut. HIER, an der Dateisystem-Grenze,
   werden die Pfade gelesen und geparst (`_unsigniertesModulLesen`) — `produktTextErzeugen`
   selbst sieht nur noch die fertigen Objekte.

   SEIT U2-ADR-387 (08.09.2026, „Antwort ist (d)"): KEINE Begleitdatei mehr —
   jede Datei in `unsignierteModulDateien` wird nach ihrem eigenen `modulTyp` (nicht nach
   Array-Position) in genau EINE der zwei Marker-Regionen in vivodepot.html eingebacken, s.
   `_abWerkModuleAufText` oben. Der Isolationsprobe (tests/e2e/ab-werk-isolationsprobe.spec.js)
   liegt daran: eine allein geöffnete vivodepot.html muss ihr Modul TRAGEN, nicht daneben
   FINDEN. */
/* Marke-Achse-Plan §2b/§6 Schritt 5 (14.09.2026): `partnerFont` ist NEU und optional —
   `{ slug, familie, regularPfad, boldPfad?, italicPfad?, version, lizenz, spdx, hinweis }`,
   dieselbe Form, die `tools/build-pdf-marke-schrift-einbetten.js` ohnehin verlangt. Baut,
   FALLS gesetzt, NACH dem Gerüst-Schreiben zwei additive, unabhängig geprüfte Dinge in genau
   DIESES Produkt-Exemplar: den vendorten Font-Block (Bytes) und den Eintrag in
   `_PDF_SCHRIFTEN_VENDORT_ZUSAETZLICH` (Vertrauensliste, ohne die `_markeSchriftPdf()` den
   Namen nie zurückgäbe, selbst mit vendorten Bytes). Ob die zugehörige Branding-JSON
   (`schriftart: partnerFont.familie`) tatsächlich mitgegeben wird, ist NICHT Sache dieser
   Funktion — das bleibt, wie bei `unsignierteModulDateien`, Sache des Aufrufers: dieses
   Werkzeug entscheidet nicht, was im Produkt landet (s. Kopf-Kommentar der Datei). Berührt
   KEINES der vier heutigen Produkte, `partnerFont` bleibt dort `undefined`. */
/* `kernQuelle` (optional): der Kern-Text, aus dem gebaut wird. Ohne ihn liest die Funktion die echte
   vivodepot.html — eine Probe, die einen ABWEICHENDEN Kern bauen will, gibt ihn hier mit, statt die echte
   Datei zu überschreiben und wiederherzustellen (dabei sahen parallel laufende Proben den kaputten Kern). */
function konfektionieren({ ziel, slug, modulauswahl, vorDepotKonfigurationInhaltFn, unsignierteModulDateien, partnerFont, subdepotPalette, kernQuelle, mitEntwicklerleiste }) {
  const zielOrdner = path.join(ziel, slug);
  fs.mkdirSync(zielOrdner, { recursive: true });
  const kernZiel = path.join(zielOrdner, 'vivodepot.html');
  const kernText = kernQuelle !== undefined ? kernQuelle : fs.readFileSync(path.join(REPO, 'vivodepot.html'), 'utf8');
  const unsignierteModule = (unsignierteModulDateien || []).map(_unsigniertesModulLesen);
  // (12.09.2026): die Bedingung ist der Dateisatz, nicht das Produkt — abgeleitet
  // aus PRODUKT_DATEISATZ, nicht hart codiert, damit sie mitzieht, sollte sw.js hier je wieder
  // dazukommen.
  const serviceWorkerVorhanden = PRODUKT_DATEISATZ.includes('sw.js');
  const { text, module } = produktTextErzeugen(kernText, { modulauswahl, vorDepotKonfigurationInhaltFn, unsignierteModule, serviceWorkerVorhanden, mitEntwicklerleiste });
  fs.writeFileSync(kernZiel, text, 'utf8');
  if (partnerFont) {
    fontInDateiEinbetten(kernZiel, partnerFont);
    familieAlsVendortRegistrieren(kernZiel, partnerFont.familie);
  }
  if (subdepotPalette) {
    _subdepotPaletteInsDateiSchreiben(kernZiel, subdepotPalette);
  }
  return {
    ordner: zielOrdner,
    dateien: [...PRODUKT_DATEISATZ],
    anzahlModule: modulauswahl.length,
    unsignierteModule: module,
    partnerFont: partnerFont ? partnerFont.familie : null,
    subdepotPalette: !!subdepotPalette,
  };
}

/* DER WÄCHTER — vergleicht das Gerüst (PRODUKT_DATEISATZ) zweier Konfektionen byte-für-byte.
   Eine einzelne abweichende Datei wird BENANNT gemeldet, nicht nur als "ungleich".

   SEIT U2-ADR-387 (08.09.2026, „Antwort ist (d)"): DIE ZUSICHERUNG WIRD
   SCHÄRFER, NICHT AUFGEGEBEN. Vorher: „vivodepot.html ist byte-gleich über alle Produkte" —
   das galt, WEIL Module außerhalb lagen. Mit dem Backen ist die Prämisse weg (vivodepot.html
   TRÄGT jetzt legitim unterschiedliche Nutzlast je Produkt). Die neue Zusicherung ist die,
   die nach dem Backen überhaupt noch etwas behauptet: „AUSSERHALB der Marker-Regionen sind
   alle Produkte byte-identisch" — geprüft über `_ohneAbWerkNutzlast`, das alle Regionen
   (Sprache/Bereich/Logikmodul/BereichsErsatz/Vorlage UND seit heute die Vor-Depot-
   Konfiguration) auf ihren nativen Wert zurücksetzt, bevor verglichen wird.

   SEIT „Produkt ist eine Datei" (10.09.2026): `PRODUKT_DATEISATZ` trägt nur
   noch `vivodepot.html` — sw.js/manifest.webmanifest/index.html/vorabkonfiguration.js sind
   nicht mehr Teil des ausgelieferten Produkts (s. Kopf-Kommentar an `PRODUKT_DATEISATZ`), der
   Vergleich läuft darum nur noch über die eine verbleibende Datei. */
function gerüstByteGleich(ordnerA, ordnerB) {
  const abweichungen = [];
  for (const datei of PRODUKT_DATEISATZ) {
    const pfadA = path.join(ordnerA, datei);
    const pfadB = path.join(ordnerB, datei);
    if (datei === 'vivodepot.html') {
      const a = _ohneAbWerkNutzlast(fs.readFileSync(pfadA, 'utf8'), datei);
      const b = _ohneAbWerkNutzlast(fs.readFileSync(pfadB, 'utf8'), datei);
      if (a !== b) abweichungen.push(datei);
    } else {
      const a = fs.readFileSync(pfadA);
      const b = fs.readFileSync(pfadB);
      if (!a.equals(b)) abweichungen.push(datei);
    }
  }
  return { gleich: abweichungen.length === 0, abweichungen };
}

/* Liest eine `--partnerFont`-JSON-Datei (`{slug, familie, regular, bold?, italic?, version,
   lizenz, spdx, hinweis}`) — Feldnamen wie am CLI von build-pdf-marke-schrift-einbetten.js,
   Font-Pfade relativ zur JSON-Datei selbst aufgelöst (nicht relativ zum CWD), damit die
   Konfiguration portabel bleibt. */
function _partnerFontLesen(konfigPfad) {
  let roh;
  try { roh = JSON.parse(fs.readFileSync(konfigPfad, 'utf8')); }
  catch (e) { throw new Error('--partnerFont nicht lesbar/kein JSON: ' + konfigPfad + ' — ' + e.message); }
  const basis = path.dirname(konfigPfad);
  const aufloesen = (p) => (p ? path.resolve(basis, p) : undefined);
  return {
    slug: roh.slug, familie: roh.familie,
    regularPfad: aufloesen(roh.regular), boldPfad: aufloesen(roh.bold), italicPfad: aufloesen(roh.italic),
    version: roh.version, lizenz: roh.lizenz, spdx: roh.spdx, hinweis: roh.hinweis,
  };
}

function main() {
  const argv = process.argv.slice(2);
  const argWert = (name) => { const i = argv.indexOf(name); return (i >= 0 && argv[i + 1]) ? argv[i + 1] : null; };
  const slug = argWert('--slug');
  const bundlePfad = argWert('--bundle');
  const ziel = path.resolve(argWert('--ziel') || path.join(REPO, 'produkte'));
  const partnerFontPfad = argWert('--partnerFont');
  const partnerFont = partnerFontPfad ? _partnerFontLesen(path.resolve(partnerFontPfad)) : undefined;
  const subdepotPalettePfad = argWert('--subdepotPalette');
  const subdepotPalette = subdepotPalettePfad ? JSON.parse(fs.readFileSync(path.resolve(subdepotPalettePfad), 'utf8')) : undefined;

  const { funde, modulauswahl, produkt } = vorbedingungenPruefen({ slug, bundlePfad });
  if (funde.length) {
    process.stderr.write('produkt-konfektionieren: VORBEDINGUNG NICHT ERFÜLLT — es wird NICHTS geschrieben.\n\n');
    funde.forEach((f) => process.stderr.write('  · ' + f + '\n'));
    process.exit(1);
  }

  const unsignierteModulDateien = require('./lib/vier-produkte.js').modulDateienFuer(produkt);

  const { ladeIssuer } = require(path.join(REPO, 'tests', 'load-issuer.js'));
  const ISSUER = ladeIssuer().V;
  const r = konfektionieren({
    ziel, slug, modulauswahl, unsignierteModulDateien, partnerFont, subdepotPalette,
    vorDepotKonfigurationInhaltFn: ISSUER.vorDepotKonfigurationDateiInhalt,
  });
  process.stdout.write('produkt-konfektionieren: ' + slug + '\n');
  process.stdout.write('  Ordner:  ' + r.ordner + '\n');
  process.stdout.write('  Dateien: ' + r.dateien.join(', ') + '\n');
  process.stdout.write('  Module:  ' + r.anzahlModule + '\n');
  process.stdout.write('  Unsign.: ' + (r.unsignierteModule.join(', ') || '(keins — nativer Rückfall)') + '\n');
  process.stdout.write('  Partner-Font: ' + (r.partnerFont || '(keiner — nativ Inter)') + '\n');
  process.stdout.write('  Sub-Depot-Palette: ' + (r.subdepotPalette ? 'gesetzt (Gültigkeit entscheidet der Kern beim Laden)' : '(keine — native Haus-Palette)') + '\n');
}

if (require.main === module) main();
module.exports = {
  modulauswahlLesen, vorbedingungenPruefen, konfektionieren, gerüstByteGleich, produktTextErzeugen,
  PRODUKT_DATEISATZ, _ohneAbWerkNutzlast,
};
