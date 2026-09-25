'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   textsatz-de-modul-erzeugen.js — baut das echte, andockbare deutsche
   Sprachmodul (Auftrag über, 07.09.2026, Zug 1 von zwei)
   ────────────────────────────────────────────────────────────────────────────
   DER BEFUND, AUS DEM DIESER ZUG ENTSTEHT: „Englisch und Deutsch müssen in
   eigenen Modulen und mit Privat und Pro kombinierbar sein" (die Produktentscheidung,
   wörtlich) — die Abnahme für vier Produkte, Privat/Pro × DE/EN. Gemessen:
   `tools/textsatz-en-modul.json` existierte, `tools/textsatz-de-modul.json`
   NICHT. Deutsch war kein Modul, sondern der eingebaute Rückfall im Kern
   (`AB_WERK_TEXTSATZ_DE`) — „Sprache" damit keine Achse, sondern ein Sockel
   mit Überschreibung. Für ein englisches Produkt, dem irgendwo eine Kennung
   fehlt, ist der deutsche Rückfall kein Komfort, sondern ein Mangel.

   KORREKTUR AN DER ERSTEN FASSUNG DIESES AUFTRAGS (die Produktentscheidung über,
   07.09.2026): Schritt eins — deutschen Text aus dem Kern herausziehen — ist
   LÄNGST getan. Gemessen (`tools/inline-texte-messen.js`): 270 Felder tragen
   praktisch keinen Inline-Text mehr (12 gesamt), die zentrale Schicht steht
   als `_STRINGS_EINGEBAUT` (1190 Einträge, vivodepot.html:4426) hinter dem
   `STRINGS`-Proxy (vivodepot.html:11049, „Textsatz zuerst, sonst der eingebaute
   Satz" seit 17.08.2026) — plus 411 Optionswerte. Was fehlt, ist NICHT ein
   Erzeuger, der den Kern durchsucht, sondern DIESE bereits zentralisierte
   Schicht als eigenes, andockbares Modul statt als impliziten Rückfall
   sichtbar zu machen. `_STRINGS_EINGEBAUT` läuft längst progressiv IN
   `AB_WERK_TEXTSATZ_DE` ein (s. `_stringsAusSatz`, vivodepot.html) — ein
   gehobener Schlüssel verschwindet aus `_STRINGS_EINGEBAUT` und steht dafür
   in `AB_WERK_TEXTSATZ_DE`. `AB_WERK_TEXTSATZ_DE` ist darum die EINE Lesestelle
   für beide Anteile (Proxy-Rückfall UND bereits gehobene Kennungen) — kein
   zweiter Lese-Pfad nötig, keine Nachbildung von `_STRINGS_EINGEBAUT`s eigener
   Struktur.

   SPIEGEL DES EN-ERZEUGERS (tools/textsatz-en-modul-erzeugen.js), NICHT SEIN
   GEGENTEIL: dieselbe Form (modulTyp/sprache/moduleVersion/anbieterId/texte/
   regeln), derselbe Prüf-Weg vor dem Schreiben (textsatzModulPruefen), dieselbe
   Größen-/Verwerfungs-Kontrolle. EIN Unterschied in der Herkunft der Werte:
   das EN-Modul MISCHT drei von Hand gepflegte Übersetzungs-Tabellen; das
   DE-Modul ERFINDET NICHTS — es liest jede Kennung, die das EN-Modul trägt,
   direkt aus `AB_WERK_TEXTSATZ_DE` im Kern (die eine Lesestelle für
   `_STRINGS_EINGEBAUT` + Optionswerte + alles bereits Gehobene, s. o.).
   Deutsch steht dort bereits als Wortlaut; dieser Erzeuger macht nur sichtbar,
   was längst da ist.

   FALLS SICH BEIM HEBEN ZEIGT, DASS DER PROXY-RÜCKFALL GEBRAUCHT WIRD (eine
   Kennung, die das EN-Modul trägt, aber NICHT in `AB_WERK_TEXTSATZ_DE` steht):
   dieser Erzeuger MELDET das (wirft mit den betroffenen Kennungen benannt),
   statt den Rückfall wegzubauen — das Abschaffen des Rückfalls ist Zug 2,
   ausdrücklich NICHT Teil dieses Zugs.

   EIN ZWEITER, GRÖSSERER BEFUND BEIM BAUEN (nicht vermutet, gemessen): `sprache:'de'`
   ist im normalen Einlassweg genauso reserviert wie `rechtsraum:'DE'` (U2-ADR-121/285)
   — `textsatzModulPruefen({sprache:'de', …})` liefert `grund:'reserviert'`, wörtlich
   dieselbe Zeile wie bei der Rechtsraum-Reservierung. Das ist KEIN Fehler dieses Zugs,
   sondern dieselbe, bewusste ADR-285-Entscheidung, hier zum ersten Mal praktisch
   sichtbar: „Textsatz 'de' bleibt bewusst schlafend … ob und wie ein echtes deutsches
   Textsatz-Modul je geladen wird, ist eine eigene, spätere Entscheidung." ADR-285 hat
   dafür bereits einen zweiten, aufruferlosen Prüfweg gebaut —
   `_textsatzModulPruefenGeruest` (identisch zu `textsatzModulPruefen`, bis auf die eine
   Zeile, die 'de' zulässt) — GENAU für diesen Fall, mit einer Ratsche
   (`tests/u2-adr-285-textsatz-geruest-modul.test.js`), die nur den KERN-Quelltext
   scannt: ein Aufruf von HIER AUSSEN (ein Tool-Skript, niemals Teil von
   `vivodepot.html`) berührt sie nicht. Dieser Erzeuger nutzt sie darum für die eigene
   Validierung vor dem Schreiben — der EINLASSWEG selbst (`EINLASS_REGISTER`,
   Einstellungen → Module → Einlassen) bleibt unverändert und lehnt `'de'` weiterhin
   ausnahmslos ab; dieses Modul ist heute NICHT über den normalen Bürgerinnen-Weg
   einlassbar. Ob/wie es das je wird, ist — wie bei Rechtsraum DE — eine eigene,
   spätere Produktentscheidung, nicht Teil dieses Zugs.

   KORREKTUR NR. 2 (die Produktentscheidung über, 07.09.2026, Zug 2): DIE KENNUNGSMENGE
   IST JETZT ALLE VON AB_WERK_TEXTSATZ_DE, NICHT NUR DIE DES EN-MODULS. Grund: sobald
   `textLesen()` seinen Rückfall auf `AB_WERK_TEXTSATZ_DE` verliert (Zug 2, vivodepot.html),
   ist DIESES Modul die EINZIGE Quelle deutschen Texts zur Laufzeit — auch für die 151
   OFFEN_JURISTISCH-Kennungen (amtlicher Wortlaut mit Rechtsfolge, U2-ADR-333/338), die das
   EN-Modul bewusst ausklammert (keine geprüfte englische Übersetzung). Ein DE-Modul ohne
   sie hätte eine Vorsorgevollmacht ohne Wortlaut gebaut. Das EN-Modul trägt dieselben 151
   Kennungen jetzt EBENFALLS — mit demselben deutschen amtlichen Wortlaut, byte-gleich (die
   Produktentscheidung, wörtlich: „IMMER amtliche Fassungen. Wir liefern keinen Content." — eine
   selbst übersetzte amtliche Urkunde wäre eigener Content in einem amtlichen Dokument).
   Die Symmetrie der vier Produkte (Privat/Pro × DE/EN, dieselbe Kennungsmenge) bleibt
   dadurch erhalten; für diese 151 tragen beide Module nur denselben Inhalt, und das ist
   die Rechtslage, kein Kompromiss (s. `tools/textsatz-en-modul-erzeugen.js`, Abschnitt
   OFFEN_JURISTISCH-Aufnahme, und `tests/textsatz-offen-juristisch-parität.test.js`).

   WAS DIESER ZUG TUT (Zug 2, Auftrag über, voller Radius): der
   Rückfall in `textLesen()` auf `AB_WERK_TEXTSATZ_DE` fällt komplett weg — fehlt eine
   Kennung in JEDEM aktiven Modul (inkl. dem Ab-Werk-Modul unten), kommt die KENNUNG
   selbst zurück, kein Deutsch, kein Englisch. `AB_WERK_TEXTSATZ_DE` BLEIBT im Kern stehen
   — als Bau-Quelle für DIESEN Erzeuger, nicht als Laufzeit-Rückfall. Das deutsche Produkt
   ändert sich für die Bürgerin NICHT: `vivodepot.html`s `AB_WERK_TEXTSATZ_DE` IST das
   Modul (kein Ableiten mehr zur Laufzeit — eine erste Fassung bettete
   `tools/textsatz-de-modul.json` als Konstante ein und verdoppelte damit jeden deutschen
   Wortlaut im Kern; Zug 2 vermied das über eine Ableitungsfunktion, Zug 3 (U2-ADR-367,
   Besitz-Zug) macht die Ableitung selbst überflüssig — s. Kopf-Kommentar an
   `AB_WERK_TEXTSATZ_DE` in vivodepot.html), sie sieht exakt denselben Text wie vorher —
   nur über den echten Modul-Weg, nicht über einen impliziten Sockel.

   KORREKTUR NR. 3 (07.09.2026, Zug 3, U2-ADR-367, Besitz-Zug): `AB_WERK_TEXTSATZ_DE`
   heißt jetzt `AB_WERK_TEXTSATZ_DE` und ist selbst ein Modul (`modulTyp`/`sprache`/
   `moduleVersion`/`anbieterId`/`regeln`/`texte`) — dieser Erzeuger liest seine Werte darum
   über `deTexte()`, nicht mehr über den flachen Bezeichner. Der Bau-Zweck
   dieses Werkzeugs (ein eigenständiges, andockbares JSON-Modul erzeugen) ist davon unberührt.

   DER WÄCHTER, DER DIESEN ZUG TRÄGT (tests/textsatz-de-modul-erzeugen.test.js):
   DE- und EN-Modul tragen DIESELBE Kennungsmenge. Eine Prüfung, die nur „das
   DE-Modul ist wohlgeformt" fragt, bewacht nichts — die GLEICHHEIT der beiden
   Mengen ist die Eigenschaft, an der die vier Produkte hängen. Rot-Beweis dort:
   eine Kennung im DE-Modul fehlt → der Wächter wird rot, nicht nur „ungewöhnlich".
   ZWEITER WÄCHTER (tests/textsatz-offen-juristisch-paritaet.test.js): die 151
   OFFEN_JURISTISCH-Kennungen sind in BEIDEN Modulen vorhanden und byte-gleich zum
   deutschen amtlichen Original — Rot-Beweis: eine davon im EN-Modul übersetzen → rot.

   Aufruf:
     node tools/textsatz-de-modul-erzeugen.js [ausgabepfad.json]
     (Standard-Ausgabepfad: tools/textsatz-de-modul.json)
   ════════════════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const path = require('node:path');
const { deTexte } = require('./lib/textsatz-de-quelle.js');

const REPO = path.join(__dirname, '..');

/* S8 (U2-ADR-428) — DIE QUELLE HAT SICH UMGEKEHRT. Bis S8 stand der deutsche Satz als Konstante im Kern, und dieser Erzeuger las ihn von dort in die Moduldatei.
   Seit S8 ist die Moduldatei tools/textsatz-de-modul.json die QUELLE des deutschen Satzes (das Gerüst trägt keinen); der Erzeuger liest sie über
   tools/lib/textsatz-de-quelle.js, legt die beiden von Hand gepflegten Pro-Tabellen darüber, prüft das Ergebnis über den Gerüst-eigenen Prüfweg und schreibt es
   zurück — er ist damit Prüfer und Normalisierer, nicht mehr Ableiter. Ein neuer deutscher Text wird in der Moduldatei (oder in einer der Pro-Tabellen) geschrieben. */
function baueModul() {
  const texte = {};
  for (const k of Object.keys(deTexte())) {
    const w = deTexte()[k];
    if (typeof w === 'string') texte[k] = w;
  }

  // Strang C (17.09.2026), Befund: 0 von 206 EN-pro-*-
  // Kennungen standen bislang auf Deutsch — Pro lief ausschließlich über den
  // literalen Rückfall. Wörtlicher Spiegel des EN-Erzeugers (TEXTSATZ_EN_PRO_
  // BEREICH/TEXTSATZ_EN_PRO_FELDER, dort Zeile 96).
  // KORRIGIERT (Schnitt-Reparatur, 18.09.2026): diese Kennungen stehen inzwischen AUCH in
  // AB_WERK_TEXTSATZ_DE selbst — DE dockt kein Sprachmodul an, also müssen die deutschen
  // Pro-Texte im Kern stehen, das ist kein Versehen, sondern der einzige Weg, auf dem `pro-de`
  // sie zur Laufzeit je liest. Der `Object.assign` unten bleibt trotzdem bestehen (keine
  // zweite Quelle mehr, nur ein no-op-Überschreiben mit identischem Wert) — die eine benannte
  // Quelle für den Wortlaut sind weiterhin diese beiden Dateien, nicht der Kern.
  const { TEXTSATZ_DE_PRO_BEREICH } = require(path.join(__dirname, 'textsatz-de-pro-bereich-daten.js'));
  const { TEXTSATZ_DE_PRO_FELDER } = require(path.join(__dirname, 'textsatz-de-pro-felder-daten.js'));
  Object.assign(texte, TEXTSATZ_DE_PRO_BEREICH, TEXTSATZ_DE_PRO_FELDER);

  return {
    modulTyp: 'textsatz',
    sprache: 'de',
    moduleVersion: 1,
    anbieterId: 'vivodepot',
    texte,
    /* Wörtlicher Spiegel von TEXTSATZ_REGELN_EINGEBAUT im Kern (vivodepot.html). WAEHRUNG
       ausgelassen — sie hängt am Rechtsraum, nicht an der Sprache (dieselbe Begründung wie im
       EN-Modul, dort ausführlich).

       SPRACHKENNUNG MUSS HIER STEHEN — Fund U2-ADR-363 (Zug 2, 07.09.2026), gemessen über
       tests/textsatz-mechanismus.test.js: textsatzRegeln() setzt `raus.sprachkennung = sprache`
       ('de') UNBEDINGT, sobald irgendein Modul für die aktive Sprache in der Registry steht —
       VOR dem Merge von `modul._regeln`. Vor Zug 2 stand nie ein 'de'-Modul in der Registry
       (Deutsch lief allein über den jetzt entfernten AB_WERK_TEXTSATZ_DE-Rückfall in textLesen),
       darum blieb der eingebaute Grundwert 'de-DE' unangetastet. Seit dieses Modul AB WERK
       gesät wird (_textsatzAbWerkRegistrySeed), MUSS sein `regeln` die volle Locale zurückgeben,
       sonst überschreibt die generische Sprachkennungs-Logik 'de-DE' mit dem bloßen 'de' — exakt
       die Fehlerklasse, die U2-ADR-208/278 für ein FREMDES Modul ohne eigene Sprachkennung schon
       einmal beschrieben haben, hier zum ersten Mal am eingebauten Fall selbst ausgelöst. */
    regeln: {
      datumsformat: 'TT.MM.JJJJ',
      dezimaltrenner: ',',
      tausendertrenner: '.',
      sprachkennung: 'de-DE',
    },
  };
}

function main() {
  const { ladeKern } = require(path.join(REPO, 'tests', 'load-kern.js'));
  const { V } = ladeKern();
  const modul = baueModul();

  // NICHT textsatzModulPruefen (der Einlassweg): der lehnt sprache:'de' ausnahmslos ab
  // (U2-ADR-121/285, wörtlich dieselbe Reservierung wie rechtsraum:'DE'). Dieses Modul
  // ist heute NICHT über den normalen Bürgerinnen-Weg einlassbar — s. Kopf-Kommentar.
  // _textsatzModulPruefenGeruest ist der dafür gebaute, aufruferlose Prüfweg (identisch
  // bis auf die 'de'-Zeile); ein Aufruf von hier außen (Tool-Skript, nie vivodepot.html)
  // rührt die Ratsche in tests/u2-adr-285-textsatz-geruest-modul.test.js nicht an.
  // { vertrauenswuerdig: true }: dieses Modul IST die eingebackene Ab-Werk-Saat (der Kern nimmt es
  // mit demselben Argument an); ohne es verwirft die Prüfung die Zusicherungs-Kennungen.
  const r = V._textsatzModulPruefenGeruest(modul, { vertrauenswuerdig: true });
  if (!r.gueltig) {
    console.error('ABBRUCH: Modul ungültig — ' + r.grund);
    process.exit(1);
  }
  if (r.verworfene.length) {
    console.error('ABBRUCH: ' + r.verworfene.length + ' Kennung(en) wurden verworfen — Modul würde unvollständig ankommen:');
    for (const v of r.verworfene.slice(0, 20)) console.error('  ' + JSON.stringify(v));
    // Kein reiner Text: den Grund benennen, damit Übersetzende ihn beim Erstellen sehen (16.09.2026).
    const hinweise = require('./lib/textsatz-reiner-text-hinweis.js').reinerTextHinweise(r.verworfene, modul.texte, 'de');
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

  const ausgabepfad = process.argv[2] || path.join(__dirname, 'textsatz-de-modul.json');
  fs.writeFileSync(ausgabepfad, JSON.stringify(modul, null, 2) + '\n', 'utf8');
  console.log('Modul geschrieben: ' + ausgabepfad);
  console.log('Kennungen: ' + Object.keys(modul.texte).length + ' (dieselbe Menge wie das EN-Modul).');
  console.log('Größe: ' + bytes + ' Bytes von ' + MAX + ' erlaubt.');
  console.log('Alle Kennungen vom Gerüst-eigenen Prüfweg angenommen, 0 verworfen.');
}

if (require.main === module) main();
module.exports = { baueModul };
