'use strict';
/* Vertrauen und Herkunft nie aus der Selbstauskunft einer Datei — EIN Klassenwächter für Kern und Lese-App (Schutz-Wagen S2,
   04.10.2026; gehärtet 05.10.2026 nach der Zweitlesung, F2–F4, und für die Befunde LESE-APP-VERTRAUEN-AUS-DATEI,
   ANTWORT-VERIFIZIERT-SELBSTAUSKUNFT, VIVODEPOT-MARKE-AUS-SELBSTAUSKUNFT und MITSCHRIFT-AB-WERK-NACH-POSITION).

   Die Felder `ungeprueft`, `pruefstufe`, `abWerk`, `anbieterIdGeprueft`, `signiert`, `beleg`, `verifiziert`, `herkunft` und die Mitschrift
   `abWerkMitschrift` stehen in Dateien, die jeder ändern kann, der sie hat (Modul, Depot, Antwort). Wer daraus Vertrauen ableitet, fragt die Ladeprüfung
   (`modulBelegGeprueft`), den Inhalt (`_abWerkGleich`) oder einen selbst nachgeprüften Nachweis — nie das Feld.

   Gefunden wird JEDE Stelle im ausgeführten Code (tools/vertrauen-lesestellen-pruefen.js): Punkt-, Optional- und Klammerzugriff,
   jede Nennung als Zeichenkette, Destrukturierung und Parameter-Destrukturierung; Kommentare zählen nicht. Die Positivliste steht
   JE STELLE (Datei, Funktion, genauer Code, Anzahl), jede mit Grund. Eine neue Stelle ist rot, bis sie umgestellt oder mit Grund
   und Wort der Gegenlesung eingetragen ist; eine verschwundene ebenso. Ein Eintrag richtet sich nach dem Inhalt der Stelle: wird
   aus einer gelisteten Funktion eine Vertrauensaussage („geprüft“, „von …“), gehört sie heraus, auch wenn die Zeile gleich bleibt. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { lesestellen, DATEIEN, FELDER } = require('../tools/vertrauen-lesestellen-pruefen.js');

const QUELLE = Object.freeze(Object.fromEntries(Object.entries(DATEIEN).map(([k, d]) => [k, fs.readFileSync(path.join(__dirname, '..', d), 'utf8')])));

const G = Object.freeze({
  SCHLUESSEL: 'Feldname in einer Schlüssel- oder Metafeldliste (erlaubte bzw. auszublendende Felder), kein Lesen',
  ANBIETER: '`herkunft` ist hier die Anbieterkennung eines Moduls (wer es herausgibt) bzw. der Fehlergrund ihres Fehlens, kein Vertrauensentscheid',
  ANBIETER_TEXT: 'Anbieterkennung wörtlich als Unterzeile; die Produktmarke „Vivodepot-Auszug“ nur nach Inhalt (_abWerkGleich)',
  ZUORDNUNG: 'Anbieterkennung ordnet einen Wizard der Situation desselben Anbieters zu; erzeugt keine Aussage „geprüft“ oder „von …“',
  SCHREIBER: 'Schreiber der Marke, aus dem geprüften Einlass bzw. nach Inhalt (_abWerkGleich)',
  ABGELEITET: 'liest ein abgeleitetes Ergebnis (Zählung, Blatt oder Eintrag aus der Anmeldung über die Ladeprüfung, Anzeigemodell), kein Feld der Datei',
  EIGENE_SIGNATUR: 'Ergebnis der eigenen Signatur einer Ausgabe bzw. Format-Definition des Produkts, kein Feld der Datei',
  BELEG_AN_PRUEFUNG: 'reicht den Beleg an die Signaturprüfung weiter; entschieden wird allein deren Ergebnis',
  BELEG_SPEICHERN: 'legt den eben in importPlanGeprueft geprüften Beleg ab, kein Lesen aus einer Datei',
  BELEG_ERGEBNIS: 'liest das gemerkte Ergebnis der Belegprüfung (_textsatzZusicherungHerkunft), kein Modul',
  OPTION: 'Wert einer Aufrufer-Option, gesetzt nur nach der Belegprüfung (_textsatzModulBelegtInfo bzw. modulBelegGeprueft)',
  OPTION_ABWERK: 'Aufrufer-Option opt.abWerk des Ab-Werk-Saatwegs, kein Modulfeld',
  STEMPEL_SCHREIBER: 'setzt verifiziert nur nach signiert geprüftem Import (U2-ADR-030)',
  STEMPEL_EINSCHRAENKEND: 'der Stempel wirkt nur einschränkend: er nimmt einen Wert aus selbstauskunft-Exporten, hebt nie',
  STEMPEL_IN_ANTWORT: 'schreibt den Stempel in die Antwort; die Lese-App macht daraus nie „geprüft“ (antwortAngabeHerkunft)',
  ZURUECKGABEWERT: 'Rückgabewert „ungeprueft“ als Ergebnis, kein Lesen eines Felds',
  ABSTUFEN: 'stuft nur ab: aus dem Feld wird höchstens „ungeprüft“, „geprüft“ allein aus modulBelegGeprueft',
  BEHAUPTUNG_UMGEKEHRT: 'liest die Behauptung der Datei; modulHerkunftStand kehrt „geprüft“ immer in „ungeprüft“ um (tests/lese-app-herkunft-nie-aus-selbstauskunft.test.js)',
  NIE_UMSCHREIBEN: 'das Normalisieren überspringt ein Modul mit Beleg, damit signierte Bytes unverändert bleiben (Schutz-Wagen S6); es hebt nichts und entscheidet kein Vertrauen — das tut allein die Ladeprüfung',
  DURCHREICHUNG_OHNE_LESER: 'reicht die behauptete Stufe ins Zählergebnis durch; `module[].stufe` liest niemand',
  MIGRATION: 'Datenmigration eines Altstands (_zug3), schreibt bzw. entfernt, entscheidet kein Vertrauen',
  PROTOKOLL: 'Art eines eigenen Übergabe-Protokolleintrags (z. B. „manuell“), kein Vertrauensentscheid',
  EINGEBAUTE_KARTE: 'liest die eingebaute Tabelle _MODUL_KARTE des Produkts, kein Feld der Datei',
  KORPUS_TEXT: 'Quellenangabe des eingebauten KI-Korpus (Text), kein Modul',
  VORFUEHRUNG: 'Name einer Hervorhebung der Vorführung, kein Feld',
  MITSCHRIFT_NACH_INHALT: 'liest die Mitschrift und nimmt einen Eintrag nur nach Inhalt als ab Werk (_mitschriftNachInhalt bzw. _abWerkGleichLesen)',
  MITSCHRIFT_SCHREIBER: 'schreibt die Mitschrift aus den eigenen Ab-Werk-Konstanten des Produkts (Anlegen, Nachfüllen)',
  MITSCHRIFT_EXPORT: 'hält die Mitschrift aus dem Vollexport heraus bzw. weist sie beim Vollimport ab',
  MITSCHRIFT_PRUEFUNG: 'die Inhaltsprüfung selbst (Fingerabdruck) bzw. die Herkunftszählung, die nicht erkannte Einträge zählt',
  MITSCHRIFT_SPRACHE: 'die Sprache der Mitschrift wählt nur die Anzeigesprache; Vertrauen für Zusicherungen allein aus dem Beleg (bleibt unvertraut)',
  MITSCHRIFT_BEREICH_OFFEN: 'Bereich/Bereichsersatz der Mitschrift — noch ohne Fingerabdruck; OFFEN im Befund MITSCHRIFT-AB-WERK-NACH-POSITION (Eigentümer Schutz-Wagen)',
  BAU_REGION: 'liest herkunft nur an der Bau-Region AB_WERK_BRANDING_PRODUKT (eine Konstante, die der Konfektionierer füllt, nie Datei oder Einlass); die eigene Vivodepot-Marke färbt nicht (tests/white-label-ab-werk-partner.test.js, U2-ADR-297-Nachtrag); Wort der Gegenlesung 05.10.2026',
  MITSCHRIFT_LESE_ANZEIGE: 'die Lese-App zeigt Logikmodule der Mitschrift; nicht erkannte zählt modulHerkunftBerechnen als Erweiterung',
});

/* [Datei, Funktion, genauer Code, Grund, Anzahl (wenn > 1)]. Erzeugt mit `node tools/vertrauen-lesestellen-pruefen.js`, je Stelle
   eingeordnet; Wort der Gegenlesung für die Liste 05.10.2026. */
const POSITIVLISTE = Object.freeze([
  ["kern", "_abWerkPartnerBranding", "return (AB_WERK_BRANDING_PRODUKT.herkunft !== 'vivodepot') ? _AB_WERK_BRANDING : null;", G.BAU_REGION],
  ["kern", "_textsatzAbWerkRegistrySeed", "try { mitschrift = (d && d.abWerkMitschrift && d.abWerkMitschrift.sprache) || null; } catch (_) { mitschrift = null; }", G.MITSCHRIFT_SPRACHE],
  ["kern", "_logikModulAbWerkSeed", "try { if (d && Array.isArray(d.abWerkMitschrift && d.abWerkMitschrift.logikModul)) quelle = _mitschriftNachInhalt(d.abWerkMitschrift.logikModul); } catch (_) {                                            }", G.MITSCHRIFT_NACH_INHALT],
  ["kern", "textsatzSpracheAktiv", "const ms = data.abWerkMitschrift && data.abWerkMitschrift.sprache;", G.MITSCHRIFT_SPRACHE],
  ["kern", "_bereichModulAbWerkSeed", "if (d && Array.isArray(d.abWerkMitschrift && d.abWerkMitschrift.bereich)) mitschrift = d.abWerkMitschrift.bereich;", G.MITSCHRIFT_BEREICH_OFFEN],
  ["kern", "_bereichModulAbWerkSeed", "const e = d && d.abWerkMitschrift && d.abWerkMitschrift.bereichsErsatz;", G.MITSCHRIFT_BEREICH_OFFEN],
  ["kern", "_bereichModulAbWerkSeed", "const s = d.abWerkMitschrift.sprache;", G.MITSCHRIFT_BEREICH_OFFEN],
  ["kern", "_bereichModulAbWerkSeed", "if (!d.abWerkMitschrift || typeof d.abWerkMitschrift !== 'object') d.abWerkMitschrift = {};", G.MITSCHRIFT_BEREICH_OFFEN],
  ["kern", "_bereichModulAbWerkSeed", "const fach = d.abWerkMitschrift.bereichsErsatz;", G.MITSCHRIFT_BEREICH_OFFEN],
  ["kern", "_bereichModulAbWerkSeed", "d.abWerkMitschrift.bereichsErsatz = { modulTyp: 'bereichsErsatz', ersetzt: [], neu: JSON.parse(JSON.stringify(bereiche)) };", G.MITSCHRIFT_BEREICH_OFFEN],
  ["kern", "_angehoerigenVorlagenAusDepotAnmelden", "try { if (ziel && ziel.abWerkMitschrift && Array.isArray(ziel.abWerkMitschrift.angehoerigen)) abWerk = _mitschriftNachInhalt(ziel.abWerkMitschrift.angehoerigen, mitschriftVerworfen); } catch (_) {                                 }", G.MITSCHRIFT_NACH_INHALT],
  ["kern", "_abWerkStrukturInsDepot", "if (!d.abWerkMitschrift || typeof d.abWerkMitschrift !== 'object') d.abWerkMitschrift = {};", G.MITSCHRIFT_SCHREIBER],
  ["kern", "_abWerkStrukturInsDepot", "d.abWerkMitschrift.bereich = m.bereich;", G.MITSCHRIFT_SCHREIBER],
  ["kern", "_abWerkStrukturInsDepot", "d.abWerkMitschrift.logikModul = m.logikModul;", G.MITSCHRIFT_SCHREIBER],
  ["kern", "_abWerkStrukturInsDepot", "d.abWerkMitschrift.sprache = m.sprache;", G.MITSCHRIFT_SCHREIBER],
  /* Pro-Stapel (06.10.2026, Wort der Gegenlesung je Stelle): Nachtragen hängt nur Sektionen und Felder aus den eigenen Konstanten des
     Produkts an (_abWerkMitschriftErzeugen), ändert nichts Vorhandenes (tests/mitschrift-felder-nachtragen.test.js, „Nur aus dem Produkt“). */
  ["kern", "_abWerkMitschriftFelderNachtragen", "if (!reinesObjekt(d) || !reinesObjekt(d.abWerkMitschrift) || !Array.isArray(d.abWerkMitschrift.bereich)) return nachgetragen;", G.MITSCHRIFT_SCHREIBER],
  ["kern", "_abWerkMitschriftFelderNachtragen", "const mitschrift = d.abWerkMitschrift.bereich;", G.MITSCHRIFT_SCHREIBER],
  /* Geweckt wird nur nach Inhalt (tests/anlass-kacheln-rezept.test.js, „Wecken·Rot-Beweis“). */
  ["kern", "_ruhendeSituationenWecken", "const mitschrift = (d && d.abWerkMitschrift && Array.isArray(d.abWerkMitschrift.situationen)) ? _mitschriftNachInhalt(d.abWerkMitschrift.situationen, SITUATIONEN_MODUL_VERWORFEN) : [];", G.MITSCHRIFT_NACH_INHALT],
  /* „geprüft“ erst, wenn jedes Bündel die Ladeprüfung bestanden hat (tests/modul-buendel-liste-einlassen.test.js, „keine Teilannahme“). */
  ["kern", "modulBuendelListeEinlassenGeprueft", "raus.ungeprueft = false;", G.ZURUECKGABEWERT],
  ["kern", "_abWerkStrukturInsDepot", "d.abWerkMitschrift.bereichsErsatz = m.bereichsErsatz;", G.MITSCHRIFT_SCHREIBER],
  ["kern", "_abWerkStrukturInsDepot", "d.abWerkMitschrift.rechtsraumKatalogQuelle = m.rechtsraumKatalogQuelle;", G.MITSCHRIFT_SCHREIBER],
  ["kern", "_abWerkStrukturInsDepot", "d.abWerkMitschrift.dokumente = m.dokumente;", G.MITSCHRIFT_SCHREIBER],
  ["kern", "_abWerkStrukturInsDepot", "d.abWerkMitschrift.basistemplate = m.basistemplate;", G.MITSCHRIFT_SCHREIBER],
  ["kern", "_abWerkStrukturInsDepot", "d.abWerkMitschrift.situationen = m.situationen;", G.MITSCHRIFT_SCHREIBER],
  ["kern", "_abWerkStrukturInsDepot", "d.abWerkMitschrift.dokumentModule = m.dokumentModule;", G.MITSCHRIFT_SCHREIBER],
  ["kern", "_abWerkStrukturInsDepot", "d.abWerkMitschrift.wizards = m.wizards;", G.MITSCHRIFT_SCHREIBER],
  ["kern", "_abWerkStrukturInsDepot", "d.abWerkMitschrift.angehoerigen = m.angehoerigen;", G.MITSCHRIFT_SCHREIBER],
  ["kern", "_abWerkStrukturInsDepot", "d.abWerkMitschrift.rechtsraumModule = m.rechtsraumModule;", G.MITSCHRIFT_SCHREIBER],
  ["kern", "_abWerkStrukturInsDepot", "d.abWerkMitschrift.standardVorlagen = m.standardVorlagen;", G.MITSCHRIFT_SCHREIBER],
  ["kern", "_abWerkMitschriftAusLebendemTemplateFuellen", "const vorhanden = ziel.abWerkMitschrift && typeof ziel.abWerkMitschrift === 'object' ? ziel.abWerkMitschrift[fach] : undefined;", G.MITSCHRIFT_SCHREIBER],
  ["kern", "_abWerkMitschriftAusLebendemTemplateFuellen", "if (!ziel.abWerkMitschrift || typeof ziel.abWerkMitschrift !== 'object') ziel.abWerkMitschrift = {};", G.MITSCHRIFT_SCHREIBER],
  ["kern", "_abWerkMitschriftAusLebendemTemplateFuellen", "ziel.abWerkMitschrift[fach] = lebend;", G.MITSCHRIFT_SCHREIBER],
  ["kern", "VOLLEXPORT_ZURUECKHALTEN_SCHLUESSEL", "'abWerkMitschrift',", G.MITSCHRIFT_EXPORT],
  ["kern", "vollExportJSON", "if (k === 'abWerkMitschrift') continue;", G.MITSCHRIFT_EXPORT],
  ["kern", "vollExportJSON", "if (kopie && kopie.abWerkMitschrift) {", G.MITSCHRIFT_EXPORT],
  ["kern", "vollExportJSON", "const m = kopie.abWerkMitschrift;", G.MITSCHRIFT_EXPORT],
  ["kern", "vollExportJSON", "if (anzahl) (zurueckgehalten || (zurueckgehalten = {}))['abWerkMitschrift'] = anzahl;", G.MITSCHRIFT_EXPORT],
  ["kern", "vollExportJSON", "kopie.abWerkMitschrift = { bereich: [], sprache: null, logikModul: [], bereichsErsatz: null, rechtsraumKatalogQuelle: null, dokumente: null, basistemplate: null, situationen: [], dokumentModule: [], wizards: [], angehoerigen: [], rechtsraumModule: [], standardVorlagen: [] };", G.MITSCHRIFT_EXPORT],
  ["kern", "VOLLIMPORT_DRAUSSEN_SCHLUESSEL", "'abWerkMitschrift',", G.MITSCHRIFT_EXPORT],
  ["kern", "_situationModulAbWerkSeed", "try { if (d && Array.isArray(d.abWerkMitschrift && d.abWerkMitschrift.situationen)) mitschrift = _mitschriftNachInhalt(d.abWerkMitschrift.situationen, SITUATIONEN_MODUL_VERWORFEN); } catch (_) {                                            }", G.MITSCHRIFT_NACH_INHALT],
  ["kern", "_wizardModulAbWerkSeed", "try { if (d && Array.isArray(d.abWerkMitschrift && d.abWerkMitschrift.wizards)) mitschrift = _mitschriftNachInhalt(d.abWerkMitschrift.wizards, WIZARDS_MODUL_VERWORFEN); } catch (_) {                                            }", G.MITSCHRIFT_NACH_INHALT],
  ["kern", "_depotModuleAbWerkPruefen", "const ms = d.abWerkMitschrift;", G.MITSCHRIFT_PRUEFUNG],
  ["kern", "_proIdentitaetUebernehmen", "const fach = ziel.abWerkMitschrift && ziel.abWerkMitschrift.bereichsErsatz;", G.MITSCHRIFT_BEREICH_OFFEN],
  ["lesen", "_depotModuleAbWerkPruefenLesen", "try { for (const m of ((d.abWerkMitschrift && Array.isArray(d.abWerkMitschrift.logikModul)) ? d.abWerkMitschrift.logikModul : [])) if (m && typeof m.id === 'string') mitschriftIds.add(m.id); } catch (_) {            }", G.MITSCHRIFT_PRUEFUNG],
  ["lesen", "_depotModuleAbWerkPruefenLesen", "const ms = d.abWerkMitschrift;", G.MITSCHRIFT_PRUEFUNG],
  ["lesen", "_textsatzModuleAusDepotAnmelden", "try { abWerkSprache = (ziel && ziel.abWerkMitschrift && ziel.abWerkMitschrift.sprache) || null; } catch (_) { abWerkSprache = null; }", G.MITSCHRIFT_SPRACHE],
  ["lesen", "modulHerkunftBerechnen", "const ms = (d.abWerkMitschrift && typeof d.abWerkMitschrift === 'object') ? d.abWerkMitschrift : null;", G.MITSCHRIFT_PRUEFUNG],
  ["lesen", "_mitschriftBereichsQuellenLesen", "const m = ziel && ziel.abWerkMitschrift;", G.MITSCHRIFT_BEREICH_OFFEN],
  ["lesen", "_angehoerigenVorlagenAusDepotAnmeldenLesen", "try { if (ziel && ziel.abWerkMitschrift && Array.isArray(ziel.abWerkMitschrift.angehoerigen)) mitschrift = ziel.abWerkMitschrift.angehoerigen; } catch (_) { mitschrift = []; }", G.MITSCHRIFT_NACH_INHALT],
  ["lesen", "_situationenAusDepotAnmeldenLesen", "try { if (ziel && ziel.abWerkMitschrift && Array.isArray(ziel.abWerkMitschrift.situationen)) mitschrift = ziel.abWerkMitschrift.situationen; } catch (_) { mitschrift = []; }", G.MITSCHRIFT_NACH_INHALT],
  ["lesen", "_proIdentitaetUebernehmen", "const fach = ziel.abWerkMitschrift && ziel.abWerkMitschrift.bereichsErsatz;", G.MITSCHRIFT_BEREICH_OFFEN],
  ["lesen", "_logikModuleAlleLesen", "const m = ziel && ziel.abWerkMitschrift;", G.MITSCHRIFT_LESE_ANZEIGE],
  ["kern", "_mitschriftNachInhalt", "else if (Array.isArray(verworfen)) verworfen.push({ herkunft: (m && m.herkunft) || null, grund: 'mitschrift-nicht-ab-werk' });", G.ANBIETER],
  ["kern", "TEXTSATZ_MODUL_SCHLUESSEL", "'texte', 'regeln', 'rechtsraum', 'ungeprueft', 'eingelassenAm', 'anbieterId', 'anbieterIdGeprueft', 'originaleSumme']);", G.SCHLUESSEL],
  ["kern", "_textsatzModuleBelegPruefen", "const k = await _belegKettePruefen(m && m.beleg, opts);", G.BELEG_AN_PRUEFUNG],
  ["kern", "_textsatzZusicherungMitHerkunft", "const stufe = String(STRINGS.modulPruefstufeGeprueftZusatz).replace('{rolle}', h.pruefstufe === 'intern' ? 'intern' : 'pruefer');", G.BELEG_ERGEBNIS],
  ["kern", "_textsatzTexteUebernehmen", "if (_istZusicherungsKennung(kennung) && (vertrauenswuerdig === 'signiert' || vertrauenswuerdig === 'intern') && !_textsatzZusicherungFormOk(kennung, wert)) {", G.OPTION],
  ["kern", "_textsatzTexteUebernehmen", "if (_istZusicherungsKennung(neu) && (vertrauenswuerdig === 'signiert' || vertrauenswuerdig === 'intern') && !_textsatzZusicherungFormOk(neu, wert)) {", G.OPTION],
  ["kern", "_textsatzModuleAusDepotAnmelden", "const geprueft = textsatzModulPruefen(m, _intern ? { vertrauenswuerdig: 'intern' } : (vertrauen ? { vertrauenswuerdig: 'signiert' } : undefined));", G.OPTION],
  ["kern", "BEREICH_MODUL_SCHLUESSEL", "const BEREICH_MODUL_SCHLUESSEL = Object.freeze(['modulTyp', 'moduleVersion', 'herkunft', 'bereiche',", G.SCHLUESSEL],
  ["kern", "BEREICH_MODUL_SCHLUESSEL", "'sprache', 'appVersion', 'ungeprueft', 'eingelassenAm', 'anbieterId', 'anbieterIdGeprueft',", G.SCHLUESSEL],
  ["kern", "_bereichsModulKennung", "const h = (modul && typeof modul.herkunft === 'string') ? modul.herkunft.trim() : '';", G.ANBIETER],
  ["kern", "bereichsModulPruefen", "const abWerk = !!(opt && opt.abWerk);", G.OPTION_ABWERK],
  ["kern", "bereichsModulPruefen", "if (typeof modul.herkunft !== 'string' || !modul.herkunft.trim()) {", G.ANBIETER],
  ["kern", "bereichsModulPruefen", "return { gueltig: false, grund: 'herkunft', bereiche: null, verworfene };", G.ANBIETER],
  ["kern", "bereichsModulPruefen", "angedockt: true, herkunft: modul.herkunft,", G.ANBIETER],
  ["kern", "situationsModulEinbetten", "return _einbettenMitFassung(bestehende, neu, (m) => m && m.herkunft === neu.herkunft);", G.ANBIETER],
  ["kern", "_bereichModulAbWerkSeed", "BEREICHS_MODUL_VERWORFEN.push({ herkunft: (roh && roh.herkunft) || null, grund: geprueft.grund || 'ungueltig' });", G.ANBIETER],
  ["kern", "_bereichsModuleAusDepotAnmelden", "BEREICHS_MODUL_VERWORFEN.push({ herkunft: (m && m.herkunft) || null, grund: geprueft.grund || 'ungueltig' });", G.ANBIETER],
  ["kern", "_bereichsModuleAusDepotAnmelden", "herkunftById[b.id] = m.herkunft || null;", G.ANBIETER],
  ["kern", "SITUATION_MODUL_SCHLUESSEL", "const SITUATION_MODUL_SCHLUESSEL = Object.freeze(['modulTyp', 'moduleVersion', 'herkunft', 'situationen',", G.SCHLUESSEL],
  ["kern", "SITUATION_MODUL_SCHLUESSEL", "'sprache', 'appVersion', 'ungeprueft', 'eingelassenAm', 'anbieterId', 'anbieterIdGeprueft']);", G.SCHLUESSEL],
  ["kern", "situationsModulPruefen", "if (typeof modul.herkunft !== 'string' || !modul.herkunft.trim()) {", G.ANBIETER],
  ["kern", "situationsModulPruefen", "return { gueltig: false, grund: 'herkunft', situationen: null, verworfene };", G.ANBIETER],
  ["kern", "situationsModulPruefen", "bloecke: Object.freeze(bloecke), angedockt: true, herkunft: modul.herkunft,", G.ANBIETER],
  ["kern", "_situationsModuleAusDepotAnmelden", "SITUATIONEN_MODUL_VERWORFEN.push({ herkunft: (m && m.herkunft) || null, grund: geprueft.grund || 'ungueltig' });", G.ANBIETER],
  ["kern", "ANGEHOERIGEN_VORLAGE_MODUL_SCHLUESSEL", "const ANGEHOERIGEN_VORLAGE_MODUL_SCHLUESSEL = Object.freeze(['modulTyp', 'moduleVersion', 'herkunft',", G.SCHLUESSEL],
  ["kern", "ANGEHOERIGEN_VORLAGE_MODUL_SCHLUESSEL", "'ungeprueft', 'eingelassenAm', 'anbieterId', 'anbieterIdGeprueft', 'pruefstufe', 'beleg']);", G.SCHLUESSEL],
  ["kern", "angehoerigenVorlagePruefen", "if (typeof modul.herkunft !== 'string' || !modul.herkunft.trim()) {", G.ANBIETER],
  ["kern", "angehoerigenVorlagePruefen", "return { gueltig: false, grund: 'herkunft', situationen: null, verworfene };", G.ANBIETER],
  ["kern", "angehoerigenVorlagePruefen", "herkunft: modul.herkunft, sprache: modul.sprache,", G.ANBIETER],
  ["kern", "_angehoerigenVorlagenAusDepotAnmelden", "ANGEHOERIGEN_VORLAGEN_MODUL_VERWORFEN.push({ herkunft: (m && m.herkunft) || null, grund: geprueft.grund || 'ungueltig' });", G.ANBIETER],
  ["kern", "angehoerigenVorlageEinbetten", "return _einbettenMitFassung(bestehende, neu, (m) => m && m.herkunft === neu.herkunft);", G.ANBIETER],
  ["kern", "WIZARD_MODUL_SCHLUESSEL", "const WIZARD_MODUL_SCHLUESSEL = Object.freeze(['modulTyp', 'moduleVersion', 'herkunft', 'wizards',", G.SCHLUESSEL],
  ["kern", "WIZARD_MODUL_SCHLUESSEL", "'sprache', 'appVersion', 'ungeprueft', 'eingelassenAm', 'anbieterId', 'anbieterIdGeprueft']);", G.SCHLUESSEL],
  ["kern", "_wizardZielSituationFeldErlaubt", "return typeof situation.herkunft === 'string' && situation.herkunft === modulHerkunft;", G.ZUORDNUNG],
  ["kern", "wizardsModulPruefen", "if (typeof modul.herkunft !== 'string' || !modul.herkunft.trim()) {", G.ANBIETER],
  ["kern", "wizardsModulPruefen", "return { gueltig: false, grund: 'herkunft', wizards: null, verworfene };", G.ANBIETER],
  ["kern", "wizardsModulPruefen", "if (roh.ziel.situation && !_wizardZielSituationFeldErlaubt(roh.ziel.situation, s.feld.id, modul.herkunft)) {", G.ZUORDNUNG],
  ["kern", "wizardsModulPruefen", "angedockt: true, herkunft: modul.herkunft,", G.ANBIETER],
  ["kern", "wizardsModulEinbetten", "return _einbettenMitFassung(bestehende, neu, (m) => m && m.herkunft === neu.herkunft);", G.ANBIETER],
  ["kern", "_wizardsModuleAusDepotAnmelden", "WIZARDS_MODUL_VERWORFEN.push({ herkunft: (m && m.herkunft) || null, grund: geprueft.grund || 'ungueltig' });", G.ANBIETER],
  ["kern", "INSTITUTIONSART_MODUL_SCHLUESSEL", "'sprache', 'herkunft', 'appVersion', 'ungeprueft', 'eingelassenAm', 'anbieterId', 'anbieterIdGeprueft']);", G.SCHLUESSEL],
  ["kern", "institutionsArtModulEinbetten", "return _einbettenMitFassung(bestehende, neu, (m) => m && m.herkunft === neu.herkunft);", G.ANBIETER],
  ["kern", "BLATTFORMAT_MODUL_SCHLUESSEL", "'herkunft', 'appVersion', 'ungeprueft', 'eingelassenAm', 'anbieterId', 'anbieterIdGeprueft']);", G.SCHLUESSEL],
  ["kern", "blattformatModulPruefen", "if (typeof modul.herkunft !== 'string' || !modul.herkunft.trim()) {", G.ANBIETER],
  ["kern", "blattformatModulPruefen", "return { gueltig: false, grund: 'herkunft', blattformat: null, verworfene };", G.ANBIETER],
  ["kern", "blattformatModulPruefen", "format: modul.format.trim().toLowerCase(), herkunft: modul.herkunft.trim(),", G.ANBIETER],
  ["kern", "blattformatModulEinbetten", "return _einbettenMitFassung(bestehende, neu, (m) => m && m.herkunft === neu.herkunft);", G.ANBIETER],
  ["kern", "BEDINGUNGSKATALOG_MODUL_SCHLUESSEL", "const BEDINGUNGSKATALOG_MODUL_SCHLUESSEL = Object.freeze(['modulTyp', 'moduleVersion', 'herkunft', 'eintraege',", G.SCHLUESSEL],
  ["kern", "BEDINGUNGSKATALOG_MODUL_SCHLUESSEL", "'appVersion', 'ungeprueft', 'eingelassenAm', 'anbieterId', 'anbieterIdGeprueft']);", G.SCHLUESSEL],
  ["kern", "bedingungskatalogModulPruefen", "if (typeof modul.herkunft !== 'string' || !modul.herkunft.trim()) return { gueltig: false, grund: 'herkunft', katalog: null, verworfene };", G.ANBIETER],
  ["kern", "bedingungskatalogModulPruefen", "const katalog = Object.freeze({ herkunft: modul.herkunft.trim(), eintraege: Object.freeze(eintraege) });", G.ANBIETER],
  ["kern", "bedingungskatalogModulEinbetten", "return _einbettenMitFassung(bestehende, neu, (m) => m && m.herkunft === neu.herkunft);", G.ANBIETER],
  ["kern", "BRANDING_MODUL_SCHLUESSEL", "'schriftart', 'logo', 'name', 'domain', 'kontakt', 'aktualisierungen', 'herkunft', 'appVersion', 'ungeprueft', 'eingelassenAm', 'anbieterId', 'anbieterIdGeprueft']);", G.SCHLUESSEL],
  ["kern", "brandingModulEinbetten", "return _einbettenMitFassung(bestehende, neu, (m) => m && m.herkunft === neu.herkunft);", G.ANBIETER],
  ["kern", "_ERSCHEINUNG_MODUL_SCHLUESSEL", "'gruppe', 'abschnitt', 'titel', 'herkunft', 'appVersion', 'ungeprueft', 'eingelassenAm',", G.SCHLUESSEL],
  ["kern", "_ERSCHEINUNG_MODUL_SCHLUESSEL", "'anbieterId', 'anbieterIdGeprueft']);", G.SCHLUESSEL],
  ["kern", "erscheinungModulEinbetten", "return _einbettenMitFassung(bestehende, neu, (m) => m && m.herkunft === neu.herkunft);", G.ANBIETER],
  ["kern", "LOGIK_MODUL_SCHLUESSEL", "'abschnitte', 'dokAusgabe', 'herkunft', 'appVersion', 'ungeprueft', 'eingelassenAm', 'anbieterId', 'anbieterIdGeprueft',", G.SCHLUESSEL],
  ["kern", "LOGIK_MODUL_SCHLUESSEL", "'pruefstufe', 'sprache', 'beleg', 'pruefIntervallMonate', 'bezugsquelle']);", G.SCHLUESSEL],
  ["kern", "logikModulPruefen", "if (typeof modul.herkunft !== 'string' || !modul.herkunft.trim()) {", G.ANBIETER],
  ["kern", "logikModulPruefen", "return { gueltig: false, grund: 'herkunft', logik: null, verworfene };", G.ANBIETER],
  ["kern", "logikModulPruefen", "herkunft: (typeof modul.herkunft === 'string' && modul.herkunft.trim()) || '',", G.ANBIETER],
  ["kern", "formatAusgabeErzeugen", "return r.signiert", G.EIGENE_SIGNATUR],
  ["kern", "_formatExportDownload", "if (!aus.signiert && def.kompakt && ui && ui.toast) ui.toast(STRINGS.eudiwNichtSigniert, 'info');", G.EIGENE_SIGNATUR],
  ["kern", "FORMAT_MODUL_SCHLUESSEL", "'ungeprueft', 'eingelassenAm', 'rechtsraum', 'namensraum', 'wurzel', 'hinweis']);", G.SCHLUESSEL],
  ["kern", "empfaengerBausteineAlle", "raus.push(Object.freeze({ id: b.id, blatt: s.id, weit: b.weit === true, label: b.label, hint: b.hint || '', ungeprueft: s.ungeprueft === true }));", G.ABGELEITET],
  ["kern", "_situationModulAbWerkSeed", "SITUATIONEN_MODUL_VERWORFEN.push({ herkunft: (roh && roh.herkunft) || null, grund: 'situationen' });", G.ANBIETER],
  ["kern", "_wizardModulAbWerkSeed", "WIZARDS_MODUL_VERWORFEN.push({ herkunft: (roh && roh.herkunft) || null, grund: 'wizards' });", G.ANBIETER],
  ["kern", "blattVorschlaege", "label: def.label, herkunft: def.herkunft || null,", G.ANBIETER],
  ["kern", "blattGehobeneEintraege", "raus.push({ quelle: v.sektorId, feld: v.feldId, herkunft: v.herkunft });", G.ANBIETER],
  ["kern", "_blattVorschlagZeileHTML", ".replace('{anbieter}', (def.herkunft || STRINGS.blattVorschlagOhneAnbieter))", G.ANBIETER, 2],
  ["kern", "_planAusRoh", "const basis = { formatId, quelleLabel: def.quelle || def.label, sektorId: def.sektor || null, signiert: !!def.signiert };", G.EIGENE_SIGNATUR],
  ["kern", "importPlan", "if (def.signiert) {", G.EIGENE_SIGNATUR],
  ["kern", "_RECHTSRAUM_MODUL_SCHLUESSEL", "'sprache', 'appVersion', 'ungeprueft', 'eingelassenAm', 'anbieterId', 'anbieterIdGeprueft']);", G.SCHLUESSEL],
  ["kern", "EINLASS_REGISTER", "kennung: (m) => (m && m.herkunft) || null,", G.ANBIETER, 9],
  ["kern", "_EINLASS_META_FELDER", "const _EINLASS_META_FELDER = Object.freeze(['ungeprueft', 'eingelassenAm', 'anbieterIdGeprueft', 'beleg', 'abWerk', 'pruefstufe', 'anbieterId']);", G.SCHLUESSEL],
  ["kern", "_modulBelegNachpruefen", "const k = await _belegKettePruefen(m.beleg, opts);", G.BELEG_AN_PRUEFUNG],
  ["kern", "_zug3TrennenAuswahl57", "if (_m70.beleg) continue;", G.NIE_UMSCHREIBEN],
  ["kern", "_depotModuleBelegPruefen", "if (!m || typeof m !== 'object' || !m.beleg || modulBelegGeprueft(m)) continue;", G.BELEG_AN_PRUEFUNG],
  ["kern", "modulEinlassen", "delete markiert.abWerk;", G.SCHREIBER],
  ["kern", "modulEinlassen", "if (einlassArt === 'ab-werk') markiert.abWerk = true;", G.SCHREIBER],
  ["kern", "modulEinlassen", "markiert.anbieterIdGeprueft = true;", G.SCHREIBER],
  ["kern", "modulEinlassen", "markiert.ungeprueft = false;", G.SCHREIBER],
  ["kern", "modulEinlassen", "if (typeof pruefstufe === 'string' && pruefstufe) markiert.pruefstufe = pruefstufe;", G.SCHREIBER],
  ["kern", "modulEinlassen", "markiert.beleg = Object.freeze(Object.assign({ providerCredentialJws: beleg.providerCredentialJws, modulSignaturJws: beleg.modulSignaturJws },", G.SCHREIBER],
  ["kern", "modulEinlassen", "raus.bestehendeHerkunft = (d[reg.slot][d[reg.slot].length - 1] && d[reg.slot][d[reg.slot].length - 1].herkunft) || null;", G.ANBIETER],
  ["kern", "eingelasseneModule", "const stand = gesperrt ? 'ungeprueft' : modulHerkunftStand(m);", G.ZURUECKGABEWERT],
  ["kern", "modulHerkunftStand", "return beleg.stufe === 'extern-ungeprueft' ? 'ungeprueft' : 'geprueft';", G.ABSTUFEN],
  ["kern", "modulHerkunftStand", "if (m.ungeprueft === true || m.ungeprueft === false || m.beleg) return 'ungeprueft';", G.ABSTUFEN],
  ["kern", "modulHerkunftBerechnen", "const stand = _depotModulGesperrt(reg.slot, m) ? 'ungeprueft' : modulHerkunftStand(m);", G.ZURUECKGABEWERT],
  ["kern", "modulHerkunftGiltAlsGeprueft", "return h.ungeprueft === 0 && h.unbekannt === 0;", G.ABGELEITET],
  ["kern", "modulHerkunftOhnePruefung", "return (Number.isInteger(h.ungeprueft) ? h.ungeprueft : 0) + (Number.isInteger(h.unbekannt) ? h.unbekannt : 0);", G.ABGELEITET],
  ["kern", "importPlanGeprueft", "if (!def.signiert) return importPlan(formatId, text);", G.EIGENE_SIGNATUR],
  ["kern", "importPlanGeprueft", "_plan.beleg = Object.freeze({ templateJws: String(opts.templateJws), providerCredentialJws: String(text) });", G.BELEG_SPEICHERN],
  ["kern", "importAnwenden", "if (plan && plan.signiert) extra.verifiziert = true;", G.STEMPEL_SCHREIBER],
  ["kern", "_vorlagenZertifikatPlanAnwenden", "alt.beleg = plan.beleg || alt.beleg || null;", G.BELEG_SPEICHERN],
  ["kern", "_vorlagenZertifikatPlanAnwenden", "beleg: plan.beleg || null,", G.BELEG_SPEICHERN],
  ["kern", "bedingungFestlegen", "if (katalog.herkunft) b.katalog = katalog.herkunft;", G.ANBIETER],
  ["kern", "vereinbarungAntwortAnwenden", "return { ergebnis: 'angenommen', grund: pruef.geprueft ? null : 'ungeprueft', frei: pruef.geprueft, kennung: eintrag.kennung };", G.ZURUECKGABEWERT],
  ["kern", "uebergabeProtokollEintragen", "function uebergabeProtokollEintragen({ empfaenger, zweck, umfang, herkunft, vereinbarung } = {}) {", G.PROTOKOLL],
  ["kern", "uebergabeProtokollZeileHTML", "const badge = ((e.herkunft === 'manuell')", G.PROTOKOLL],
  ["kern", "_feldVerifiziertStaemmig", "return !!(st && st.verifiziert === true);", G.STEMPEL_EINSCHRAENKEND],
  ["kern", "EREIGNIS_ACHSE_MODUL_SCHLUESSEL", "const EREIGNIS_ACHSE_MODUL_SCHLUESSEL = Object.freeze(['modulTyp', 'moduleVersion', 'herkunft', 'eintraege',", G.SCHLUESSEL],
  ["kern", "EREIGNIS_ACHSE_MODUL_SCHLUESSEL", "'sprache', 'appVersion', 'ungeprueft', 'eingelassenAm', 'anbieterId', 'anbieterIdGeprueft']);", G.SCHLUESSEL],
  ["kern", "ereignisAchseModulPruefen", "if (typeof modul.herkunft !== 'string' || !modul.herkunft.trim()) {", G.ANBIETER],
  ["kern", "ereignisAchseModulPruefen", "return { gueltig: false, grund: 'herkunft', eintraege: null, verworfene };", G.ANBIETER],
  ["kern", "ereignisAchseModulPruefen", "eintrag = { sektorId, feldId, ausgenommen: roh.ausgenommen, angedockt: true, herkunft: modul.herkunft };", G.ANBIETER],
  ["kern", "ereignisAchseModulPruefen", "eintrag = { sektorId, feldId, ereignisse: Object.freeze(ereignisse.slice()), angedockt: true, herkunft: modul.herkunft };", G.ANBIETER],
  ["kern", "ereignisAchseModulEinbetten", "return _einbettenMitFassung(bestehende, neu, (m) => m && m.herkunft === neu.herkunft);", G.ANBIETER],
  ["kern", "_ereignisAchseModuleAusDepotAnmelden", "EREIGNIS_ACHSE_MODUL_VERWORFEN.push({ herkunft: (m && m.herkunft) || null, grund: geprueft.grund || 'ungueltig' });", G.ANBIETER],
  ["kern", "FORMAT_SCHLUESSEL_MAPPING", "objektSchluessel: Object.freeze([{\"alt\":\"sektionen\",\"neu\":\"sections\"},{\"alt\":\"felder\",\"neu\":\"fields\"},{\"alt\":\"feldname\",\"neu\":\"fieldName\"},{\"alt\":\"typ\",\"neu\":\"type\"},{\"alt\":\"optionen\",\"neu\":\"options\"},{\"alt\":\"wert\",\"neu\":\"value\"},{\"alt\":\"unterFelder\",\"neu\":\"subFields\"},{\"alt\":\"entitaet\",\"neu\":\"entity\"},{\"alt\":\"sensibel\",\"neu\":\"sensitive\"},{\"alt\":\"pflicht\",\"neu\":\"required\"},{\"alt\":\"label\",\"neu\":\"label\"},{\"alt\":\"gruppe\",\"neu\":\"group\"},{\"alt\":\"hilfetext\",\"neu\":\"helpText\"},{\"alt\":\"quelle\",\"neu\":\"source\"},{\"alt\":\"bereich\",\"neu\":\"area\"},{\"alt\":\"sektor\",\"neu\":\"area\"},{\"alt\":\"sektoren\",\"neu\":\"areas\"},{\"alt\":\"stellensatz\",\"neu\":\"officeRegistry\"},{\"alt\":\"stelle\",\"neu\":\"office\"},{\"alt\":\"kennung\",\"neu\":\"identifier\"},{\"alt\":\"kennungVorschlaege\",\"neu\":\"identifierProposals\"},{\"alt\":\"begruendung\",\"neu\":\"justification\"},{\"alt\":\"anbieter\",\"neu\":\"provider\"},{\"alt\":\"anbieterId\",\"neu\":\"providerId\"},{\"alt\":\"anbieterName\",\"neu\":\"providerName\"},{\"alt\":\"anbieterTyp\",\"neu\":\"providerType\"},{\"alt\":\"modulTyp\",\"neu\":\"moduleType\"},{\"alt\":\"sprache\",\"neu\":\"language\"},{\"alt\":\"herkunft\",\"neu\":\"provenance\"},{\"alt\":\"texte\",\"neu\":\"texts\"},{\"alt\":\"schluesselraum\",\"neu\":\"keyNamespace\"},{\"alt\":\"anzahl\",\"neu\":\"count\"},{\"alt\":\"hinweis\",\"neu\":\"notice\"},{\"alt\":\"rechtsraum\",\"neu\":\"jurisdiction\"},{\"alt\":\"wortlaut\",\"neu\":\"officialWording\"},{\"alt\":\"wortlautQuelle\",\"neu\":\"wordingSource\"},{\"alt\":\"verborgenWenn\",\"neu\":\"hiddenWhen\"},{\"alt\":\"codeWerte\",\"neu\":\"codeValues\"},{\"alt\":\"codeListen\",\"neu\":\"codeLists\"},{\"alt\":\"teile\",\"neu\":\"parts\"},{\"alt\":\"trenner\",\"neu\":\"separator\"},{\"alt\":\"diskriminante\",\"neu\":\"discriminantField\"}]),", G.SCHLUESSEL],
  ["kern", "_zug3TrennenAuswahl57", "if (Object.prototype.hasOwnProperty.call(_v66, 'beleg')) continue;", G.MIGRATION],
  ["kern", "_zug3TrennenAuswahl57", "_v66.beleg = null;", G.MIGRATION],
  ["kern", "_zug3TrennenAuswahl57", "if (typeof _u67.herkunft !== 'string' || !_u67.herkunft.startsWith('export:')) continue;", G.MIGRATION],
  ["kern", "_zug3TrennenAuswahl57", "const _weg67 = _u67.herkunft.slice('export:'.length);", G.MIGRATION],
  ["kern", "_zug3TrennenAuswahl57", "if (_def67) _u67.herkunft = 'export:' + formatKennung(_def67);", G.MIGRATION],
  ["kern", "_zug3TrennenAuswahl57", "ziel.logikModule = ziel.logikModule.filter((m) => !(m && m.id === zugangId && m.herkunft === 'vivodepot'));", G.MIGRATION],
  ["kern", "_zug3TrennenAuswahl57", "ziel.logikModule = ziel.logikModule.filter((m) => !(m && m.id === erbscheinId && m.herkunft === 'vivodepot'));", G.MIGRATION],
  ["kern", "_kreisBausteinZeileHTML", "const hint = ((baustein && baustein.hint) || '') + ((baustein && baustein.ungeprueft) ? ' ' + STRINGS.angehoerigenUngeprueft : '');", G.ABGELEITET],
  ["kern", "einstellungenHTML", "const _hatUngeprueftes = _eingelassen.some((m) => !m.ausgefallen && !m.abWerk && m.herkunft === 'ungeprueft' && !m.pruefstufe);", G.ABGELEITET],
  ["kern", "einstellungenHTML", "const _hatUnbekannte = _eingelassen.some((m) => !m.ausgefallen && m.herkunft === 'unbekannt');", G.ABGELEITET],
  ["kern", "einstellungenHTML", "if (!m.ausgefallen && m.abWerk && m.titel) {", G.ABGELEITET],
  ["kern", "einstellungenHTML", ": m.herkunft === 'unbekannt'", G.ABGELEITET],
  ["kern", "einstellungenHTML", ": !m.pruefstufe", G.ABGELEITET],
  ["kern", "einstellungenHTML", ": m.pruefstufe.indexOf('extern-geprueft:') === 0", G.ABGELEITET],
  ["kern", "einstellungenHTML", ".replace('{rolle}', _rolleLabel(m.pruefstufe.slice('extern-geprueft:'.length)))) + '</span>'", G.ABGELEITET],
  ["kern", "antwortAufTemplateErzeugen", "herkunft: (typeof logikModul.herkunft === 'string' && logikModul.herkunft) || null,", G.ANBIETER],
  ["kern", "_abWerkMerkmalNeuSetzen", "if (typeof m.id === 'string' && ids.has(m.id) && _istAbWerkModulInhalt(m)) m.abWerk = true;", G.SCHREIBER],
  ["kern", "_abWerkMerkmalNeuSetzen", "else delete m.abWerk;", G.SCHREIBER],
  ["kern", "VORSORGE_MODULE", "get herkunftText() { return KI_KORPUS.herkunft; },", G.KORPUS_TEXT],
  ["kern", "modulKarteHerkunft", "const eigene = roh && roh.herkunft;", G.ANBIETER_TEXT],
  ["kern", "modulKarteHerkunft", "if (km.herkunft === 'amtlich') return STRINGS.amtlicherWortlautBadge;", G.EINGEBAUTE_KARTE],
  ["kern", "modulKarteHerkunft", "if (km.herkunft === 'eigenhaendig') return STRINGS.eigenhaendigBadge;", G.EINGEBAUTE_KARTE],
  ["kern", "modulKarteHerkunft", "return km.herkunft;", G.EINGEBAUTE_KARTE],
  ["kern", "renderAngehoerigenBlatt", "if (blatt.ungeprueft === true) html += '<p class=\"sektor-intro ang-ungeprueft\">' + escapeHTML(STRINGS.angehoerigenUngeprueft) + '</p>';", G.ABGELEITET],
  ["kern", "_datensatzAusEintraegen", "if (st) eintrag.herkunft = { art: st.eingabeArt || 'eingetragen', verifiziert: st.verifiziert === true };", G.STEMPEL_IN_ANTWORT],
  ["kern", "_eudiwAusgeben", "(res.signiert ? '' : '<p class=\"einst-hint\">' + escapeHTML(STRINGS.eudiwNichtSigniert) + '</p>') +", G.EIGENE_SIGNATUR],
  ["kern", "_eudiwAusgeben", "const mime = res.signiert ? EUDIW_MIME : EUDIW_SELBSTAUSKUNFT_MIME;", G.EIGENE_SIGNATUR],
  ["kern", "_eudiwAusgeben", "dateiAusgeben(blob, _eudiwDateiname(def.dateibasis.replace(/^Vivodepot_/, () => _dateiNamePraefix() + '_') + '_EUDIW', res.signiert ? 'sd-jwt' : 'jwt'), mime).then((weg) => {", G.EIGENE_SIGNATUR],
  ["lesen", "vorlagenPruefstandBerechnen", "if (!v.beleg || !v.beleg.providerCredentialJws || !v.beleg.templateJws) {", G.BELEG_AN_PRUEFUNG],
  ["lesen", "vorlagenPruefstandBerechnen", "try { r = await verifiziereTemplateKette(v.beleg.providerCredentialJws, v.beleg.templateJws, opts); }", G.BELEG_AN_PRUEFUNG],
  ["lesen", "logikModulPruefstandBerechnen", "if (!m.beleg || !m.beleg.providerCredentialJws || !m.beleg.modulSignaturJws) {", G.BELEG_AN_PRUEFUNG],
  ["lesen", "logikModulPruefstandBerechnen", "try { r = await verifiziereTemplateKette(m.beleg.providerCredentialJws, m.beleg.modulSignaturJws, opts); }", G.BELEG_AN_PRUEFUNG],
  ["lesen", "_EINLASS_META_FELDER", "const _EINLASS_META_FELDER = Object.freeze(['ungeprueft', 'eingelassenAm', 'anbieterIdGeprueft', 'beleg', 'abWerk', 'pruefstufe', 'anbieterId']);", G.SCHLUESSEL],
  ["lesen", "_textsatzModuleBelegPruefen", "const b = m && m.beleg;", G.BELEG_AN_PRUEFUNG],
  ["lesen", "textsatzModulPruefen", "if (_istZusicherungsKennung(kennung) && vertrauenswuerdig !== 'signiert') { verworfene.push({ kennung, grund: 'zusicherung' }); continue; }", G.OPTION],
  ["lesen", "_textsatzModuleAusDepotAnmelden", "try { geprueft = textsatzModulPruefen(m, Object.assign(vertrauen ? { vertrauenswuerdig: 'signiert' } : {}, { schutzVertraut: _textsatzSchutzVertraut(m) })); } catch (e) { geprueft = null; }", G.OPTION],
  ["lesen", "_textsatzZusicherungMitHerkunft", "return text + ' [' + (h.pruefstufe === 'intern' ? 'intern' : 'pruefer') + (h.anbieterId ? ' · ' + h.anbieterId : '') + ']';", G.BELEG_ERGEBNIS],
  ["lesen", "_modulHerkunftBehauptung", "if (m.ungeprueft === false) {", G.BEHAUPTUNG_UMGEKEHRT],
  ["lesen", "_modulHerkunftBehauptung", "if (m.pruefstufe === 'extern-ungeprueft') return 'ungeprueft';", G.BEHAUPTUNG_UMGEKEHRT],
  ["lesen", "_modulHerkunftBehauptung", "if (m.ungeprueft === true) return 'ungeprueft';", G.BEHAUPTUNG_UMGEKEHRT],
  ["lesen", "modulHerkunftStand", "return behauptet === 'geprueft' ? 'ungeprueft' : behauptet;", G.ABSTUFEN],
  ["lesen", "modulHerkunftBerechnen", "stufe: (typeof m.pruefstufe === 'string' ? m.pruefstufe : null) });", G.DURCHREICHUNG_OHNE_LESER],
  ["lesen", "modulHerkunftGiltAlsGeprueft", "return h.ungeprueft === 0 && h.unbekannt === 0;", G.ABGELEITET],
  ["lesen", "modulHerkunftOhnePruefung", "return (Number.isInteger(h.ungeprueft) ? h.ungeprueft : 0) + (Number.isInteger(h.unbekannt) ? h.unbekannt : 0);", G.ABGELEITET],
  ["lesen", "BEREICH_MODUL_SCHLUESSEL_LESEN", "const BEREICH_MODUL_SCHLUESSEL_LESEN = Object.freeze(['modulTyp', 'moduleVersion', 'herkunft',", G.SCHLUESSEL],
  ["lesen", "BEREICH_MODUL_SCHLUESSEL_LESEN", "'bereiche', 'sprache', 'ungeprueft', 'eingelassenAm', 'anbieterId', 'anbieterIdGeprueft']);", G.SCHLUESSEL],
  ["lesen", "_verwuerfeLesen", "raus.push({ art, id: (v && (v.id || v.herkunft || v.schluessel || v.kennung)) || null, grund, verlust: VERWURF_GRUND_OHNE_VERLUST_LESEN.indexOf(grund) < 0 });", G.ANBIETER],
  ["lesen", "bereichsModulPruefenLesen", "if (typeof modul.herkunft !== 'string' || !modul.herkunft.trim()) {", G.ANBIETER],
  ["lesen", "bereichsModulPruefenLesen", "return { gueltig: false, grund: 'herkunft', bereiche: null, verworfene };", G.ANBIETER],
  ["lesen", "bereichsModulPruefenLesen", "id, sektionen: _templateSektionenPruefenLesen(id, roh.sektionen, verworfene), angedockt: true, herkunft: modul.herkunft,", G.ANBIETER],
  ["lesen", "_bereichsModuleAusDepotAnmeldenLesen", "BEREICHS_MODUL_VERWORFEN_LESEN.push({ herkunft: (m && m.herkunft) || null, grund: geprueft.grund || 'ungueltig' });", G.ANBIETER],
  ["lesen", "angehoerigenVorlagePruefenLesen", "if (typeof modul.herkunft !== 'string' || !modul.herkunft.trim()) return { gueltig: false, grund: 'herkunft', situationen: null, verworfene };", G.ANBIETER],
  ["lesen", "angehoerigenVorlagePruefenLesen", "herkunft: modul.herkunft, sprache: modul.sprache,", G.ANBIETER],
  ["lesen", "_angehoerigenVorlagenAusDepotAnmeldenLesen", "if (!geprueft.gueltig) { ANGEHOERIGEN_VORLAGEN_VERWORFEN_LESEN.push({ herkunft: (m && m.herkunft) || null, grund: geprueft.grund || 'ungueltig' }); continue; }", G.ANBIETER],
  ["lesen", "_situationenAusDepotAnmeldenLesen", "SITUATIONEN_VERWORFEN_LESEN.push({ herkunft: (m && m.herkunft) || null, grund: 'situationen' });", G.ANBIETER],
  ["lesen", "_situationenAusDepotAnmeldenLesen", "const r = _situationAusModulLesen(id, m.situationen[id], !istAbWerk, (m && m.herkunft) || null);", G.ANBIETER],
  ["lesen", "logikModulPruefenLesen", "if (typeof modul.herkunft !== 'string' || !modul.herkunft.trim()) return { gueltig: false, grund: 'herkunft' };", G.ANBIETER],
  ["lesen", "situationContentHTML", "const ungeprueftMarke = (si0 && si0.ungeprueft === true) ? '<p class=\"bereich-intro angehoerigen-ungeprueft\">' + escapeHTML(STRINGS.angehoerigenUngeprueft) + '</p>' : '';", G.ABGELEITET],
  ["lesen", "angehoerigenBlattHTML", "const marke = blatt.ungeprueft === true ? '<p class=\"bereich-intro angehoerigen-ungeprueft\">' + escapeHTML(STRINGS.angehoerigenUngeprueft) + '</p>' : '';", G.ABGELEITET],
  ["lesen", "antwortHerkunftHTML", "const geprueft = f.herkunft === 'geprueft';", G.ABGELEITET],
  ["lesen", "antwortHerkunftAbweichung", "const n = felder.filter((f) => f.herkunft === 'geprueft').length;", G.ABGELEITET],
  ["lesen", "antwortHerkunftZeileHTML", "const n = felder.filter((f) => f.herkunft === 'geprueft').length;", G.ABGELEITET],
  ["lesen", "renderAntwort", "'<h1 id=\"antwort-absender\">' + escapeHTML(antwortAbsenderSatz(m)) + antwortHerkunftHTML({ herkunft: m.absender ? m.absender.herkunft : 'eingetragen' },", G.ABGELEITET],
  ["lesen", "renderAntwort", "(abweichung && f.herkunft === abweichung ? antwortHerkunftHTML(f) : '') +", G.ABGELEITET],
  ["lesen", "renderAnlass", "(abweichung && f.herkunft === abweichung ? antwortHerkunftHTML(f) : '') +", G.ABGELEITET],
  ["lesen", "_vorfuehrungLesenZeigen", "if (blatt && st.hervorheben === 'herkunft') blatt.classList.add('vorfuehrung-herkunft');", G.VORFUEHRUNG],
  ["lesen", "_vorfuehrungLesenZeigen", "const erste = st.fokus ? null : (document.querySelector('#antwort-blatt .vorfuehrung-hervor') || (st.hervorheben === 'herkunft' ? document.querySelector('#antwort-blatt .antwort-herkunft') : null));", G.VORFUEHRUNG],
]);

const schluessel = (datei, s) => JSON.stringify([datei, s.funktion, s.code]);
function zaehlen(quelle) {
  const ist = new Map();
  for (const datei of Object.keys(DATEIEN)) {
    for (const s of lesestellen(quelle[datei])) ist.set(schluessel(datei, s), (ist.get(schluessel(datei, s)) || 0) + 1);
  }
  return ist;
}
const soll = new Map(POSITIVLISTE.map(([d, f, c, , n]) => [JSON.stringify([d, f, c]), n || 1]));
function unerlaubt(quelle) {
  const raus = [];
  for (const [k, n] of zaehlen(quelle)) if ((soll.get(k) || 0) < n) raus.push(k);
  return raus;
}

test('[Vertrauen·Klasse] keine Stelle in Kern oder Lese-App liest ein Vertrauensfeld außerhalb der Positivliste (je Stelle)', () => {
  assert.deepEqual(unerlaubt(QUELLE), []);
});

test('[Vertrauen·Klasse] jeder Eintrag der Positivliste hat seinen Gegenstand, in genau der Anzahl, und einen Grund', () => {
  const ist = zaehlen(QUELLE);
  assert.deepEqual([...soll].filter(([k, n]) => ist.get(k) !== n).map(([k]) => k), []);
  assert.deepEqual(POSITIVLISTE.filter((e) => typeof e[3] !== 'string' || !e[3]).map((e) => e[2]), []);
});

/* Rot-Beweise: jede Zugriffsform, in beiden Dateien, in einer neuen Funktion. */
const FORMEN = Object.freeze([
  ['Punkt', (f) => 'return m.' + f + ' === false;'],
  ['Optional', (f) => 'return m?.' + f + ' === false;'],
  ['Klammer', (f) => 'return m["' + f + '"] === false;'],
  ['in', (f) => "return '" + f + "' in m;"],
  ['Destrukturierung', (f) => 'const { ' + f + ' } = m; return ' + f + ' === false;'],
  ['Parameter', (f) => 'const g = ({ ' + f + ' }) => ' + f + ' === false; return g(m);'],
]);
const ANKER = Object.freeze({ kern: 'function modulBelegGeprueft(m) {', lesen: 'function modulHerkunftStand(m) {' });
for (const datei of Object.keys(DATEIEN)) {
  for (const [form, bau] of FORMEN) {
    test('[Vertrauen·Klasse·Rot-Beweis] ' + datei + ' · ' + form + ': jedes Feld in einer neuen Funktion wird gefunden', () => {
      assert.equal(QUELLE[datei].split(ANKER[datei]).length, 2, 'Vorbedingung: der Anker steht genau einmal');
      for (const feld of FELDER) {
        const schlecht = QUELLE[datei].replace(ANKER[datei], 'function _probeVertrautDemFeld(m) { ' + bau(feld) + ' }\n' + ANKER[datei]);
        const funde = unerlaubt(Object.assign({}, QUELLE, { [datei]: schlecht }));
        assert.ok(funde.some((k) => k.includes('_probeVertrautDemFeld')), form + ' / ' + feld + ': ' + funde.join(' '));
      }
    });
  }
}

test('[Vertrauen·Klasse·Rot-Beweis] ein Kommentar ist keine Stelle; eine zweite gleiche Zeile in einer gelisteten Funktion ist eine', () => {
  const a = ANKER.kern;
  const kommentar = QUELLE.kern.replace(a, '/* m.ungeprueft === false */\n// m.pruefstufe\n' + a);
  assert.deepEqual(unerlaubt(Object.assign({}, QUELLE, { kern: kommentar })), []);
  const zeile = '  return h.ungeprueft === 0 && h.unbekannt === 0;';
  assert.equal(QUELLE.kern.split(zeile).length, 2, 'Vorbedingung');
  const doppelt = QUELLE.kern.replace(zeile, zeile + '\n' + zeile);
  assert.equal(unerlaubt(Object.assign({}, QUELLE, { kern: doppelt })).length, 1, 'Positivliste je Stelle, nicht je Funktion (F3)');
});

/* Die drei Befunde dieser Klasse am alten Stand: der Wächter findet jede Stelle. */
const ALTE_STAENDE = Object.freeze([
  ['LESE-APP-VERTRAUEN-AUS-DATEI', 'lesen',
    '      const sit = Object.freeze(Object.assign({}, s0, { ungeprueft: !istAbWerk }));',
    '      const sit = Object.freeze(Object.assign({}, s0, { ungeprueft: istAbWerk ? false : m.ungeprueft !== false }));'],
  ['ANTWORT-VERIFIZIERT-SELBSTAUSKUNFT', 'lesen',
    '      herkunft: antwortAngabeHerkunft(),',
    "      herkunft: (f.herkunft && f.herkunft.verifiziert === true) ? 'geprueft' : 'eingetragen',"],
  ['MITSCHRIFT-AB-WERK-NACH-POSITION', 'kern',
    "  try { if (d && Array.isArray(d.abWerkMitschrift && d.abWerkMitschrift.wizards)) mitschrift = _mitschriftNachInhalt(d.abWerkMitschrift.wizards, WIZARDS_MODUL_VERWORFEN); } catch (_) { /* Mitschrift nicht lesbar, bleibt leer */ }",
    "  try { if (d && Array.isArray(d.abWerkMitschrift && d.abWerkMitschrift.wizards)) mitschrift = d.abWerkMitschrift.wizards; } catch (_) { /* Mitschrift nicht lesbar, bleibt leer */ }"],
  ['VIVODEPOT-MARKE-AUS-SELBSTAUSKUNFT', 'kern',
    "    if (eigeneText.toLowerCase() === 'vivodepot') return abWerk ? STRINGS.vivodepotAuszugBadge : '';",
    "    if (roh.herkunft === 'vivodepot') return STRINGS.vivodepotAuszugBadge;"],
]);
for (const [befund, datei, neu, alt] of ALTE_STAENDE) {
  test('[Vertrauen·Klasse·Rot-Beweis] der alte Stand von ' + befund + ' wird gefunden', () => {
    assert.equal(QUELLE[datei].split(neu).length, 2, 'Vorbedingung: die neue Stelle steht genau einmal');
    const funde = unerlaubt(Object.assign({}, QUELLE, { [datei]: QUELLE[datei].replace(neu, alt) }));
    assert.ok(funde.length >= 1, befund);
  });
}

test('[Vertrauen·Fall A] ein Modul mit selbst gesetztem ungeprueft:false und pruefstufe zählt nie als geprüft', () => {
  const { V } = require('./load-kern.js').ladeKern();
  for (const pruefstufe of ['intern', 'extern-geprueft:pruefer', 'extern-geprueft:herausgeber']) {
    const m = { modulTyp: 'textsatz', sprache: 'fr', moduleVersion: 1, texte: {}, ungeprueft: false, pruefstufe, anbieterIdGeprueft: 'x' };
    assert.equal(V.modulHerkunftStand(m), 'ungeprueft', pruefstufe);
  }
});

/* Die Lexer-Tabelle des Wächters (Zeichen, nach denen ein `/` einen Regex-Literal beginnt) heißt bewusst nicht wie eine Ausnahmeliste.
   Damit aus ihr nie still eine wird: jeder Eintrag ist genau ein Zeichen, kein Buchstabe, keine Ziffer, kein Pfad. */
function lexerTabelleFehler(quelltext) {
  const m = quelltext.match(/const REGEX_KANN_FOLGEN_AUF = new Set\(\[([^\]]*)\]\)/);
  if (!m) return ['REGEX_KANN_FOLGEN_AUF nicht gefunden'];
  const eintraege = [...m[1].matchAll(/'((?:\\.|[^'\\])*)'/g)].map((x) => JSON.parse('"' + x[1].replace(/"/g, '\\"') + '"'));
  if (!eintraege.length) return ['leer'];
  return eintraege.filter((e) => e.length !== 1 || /[A-Za-z0-9_./]/.test(e)).map((e) => JSON.stringify(e));
}
test('[Vertrauen·Lexer-Tabelle] REGEX_KANN_FOLGEN_AUF enthält nur einzelne Satzzeichen — keine Ausnahmeliste unter anderem Namen', () => {
  const quelle = require('node:fs').readFileSync(require('node:path').join(__dirname, '..', 'tools', 'vertrauen-lesestellen-pruefen.js'), 'utf8');
  assert.deepEqual(lexerTabelleFehler(quelle), []);
});
test('[Vertrauen·Lexer-Tabelle·Rot-Beweis] ein Eintrag wie \'foo\' wird gefunden', () => {
  assert.deepEqual(lexerTabelleFehler("const REGEX_KANN_FOLGEN_AUF = new Set(['(', 'foo', '\\n']);"), ['"foo"']);
});
