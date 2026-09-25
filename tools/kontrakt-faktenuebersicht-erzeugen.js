#!/usr/bin/env node
'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   kontrakt-faktenuebersicht-erzeugen.js — was der Kontrakt zusagt, und was er
   durchsetzt.
   ────────────────────────────────────────────────────────────────────────────
   „Modulprüfung schließen" (23.08.2026), Posten 4, zusammen mit
   Zug 3 des Auftrags „Das Einreich-Schema prüfte nichts" — beide Aufträge
   nennen dasselbe Werkzeug ausdrücklich als EIN Werkzeug, nicht zwei: „die
   Kontrakt-Faktenübersicht deckt dann beide Richtungen: was das Schema zusagt
   und wie der Kontrakt sich schützt."

   ERZEUGT, NICHT HANDGESCHRIEBEN, wo eine Zahl mechanisch nachprüfbar ist:
   Teil A liest die sechs reservierten Register LIVE aus dem geladenen Kern
   (`tests/load-kern.js`) — keine der Kennungslisten steht hier als erinnerter
   Text, jede stammt aus dem tatsächlich geladenen `vivodepot.html`.

   Teil B (die 77 Schema-Eigenschaften) kann „geprüft vs. entgegengenommen"
   nicht mechanisch entscheiden — das verlangt zu lesen, was ein Code-Zweig
   TUT, nicht nur, ob ein Name vorkommt (genau die Lücke, an der
   `tools/schema-wirkung-pruefen.js` selbst nur „kommt der Name vor?" prüft,
   s. dessen eigenen Kopf). `KONTRAKT_FAKTEN` ist darum eine KURATIERTE
   Tabelle — erhoben am 23.08.2026 gegen den damaligen Quelltext, mit
   Fundstellen, die eine Rot-Probe nachschlagen kann. **Der Wächter-Teil ist
   nicht „stimmt jede Zeile", sondern „ist die Tabelle vollständig und
   aktuell"**: `--check` vergleicht den Namenssatz der Tabelle GENAU gegen
   `schemaSchluessel()` aus dem echten Schema — ein neuer oder entfallener
   Schlüssel wird gefunden, eine veraltete Fundstelle nicht automatisch.

   METHODISCHE EINSCHRÄNKUNG, OFFEN GENANNT: mehrere Schlüssel kommen an
   MEHREREN Stellen im Schema mit unterschiedlichem Gewicht vor (`titel`,
   `code`, `name`, `feld`, `version` u. a.). Die Tabelle zeigt die STÄRKSTE
   gefundene Wirkung (meist einen echten Ablehnungspfad), nicht eine
   erschöpfende Pfad-für-Pfad-Analyse jeder Nennung. Zwei Einträge
   (`publicKeyJwk.kid`, `publicKeyJwk.use`) sind als `unklar` geführt, weil
   die Textkoinzidenz im Kern nicht eindeutig auf den eingereichten Wert
   zurückzuführen war — lieber ehrlich unklar als erraten.

   `--check`: schreibt nichts, meldet Drift (Exit 1).
   Ohne Flag: schreibt `docs/kontrakt-faktenuebersicht.md` neu.
   ════════════════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const path = require('node:path');
const { execSync } = require('node:child_process');

const REPO = path.join(__dirname, '..');
const CHECK = process.argv.includes('--check');
const AUSGABE_ARG_INDEX = process.argv.indexOf('--ausgabe');
const AUSGABE = AUSGABE_ARG_INDEX !== -1
  ? path.resolve(process.argv[AUSGABE_ARG_INDEX + 1])
  : path.join(REPO, 'docs', 'kontrakt-faktenuebersicht.md');

function commitHash() {
  try { return execSync('git rev-parse --short HEAD', { cwd: REPO }).toString().trim(); }
  catch (_) { return '(kein Git-Commit ermittelbar)'; }
}

/* ══ TEIL A — die sechs reservierten Register, LIVE aus dem Kern ═══════════ */
function reservierteRegister() {
  const { ladeKern } = require(path.join(REPO, 'tests', 'load-kern.js'));
  const { V, src } = ladeKern();
  const dePlatzhalter = (src.match(/rechtsraum\s*===\s*'DE'/g) || []).length;
  return [
    {
      register: 'bereich (Sektoren)',
      konstante: 'BEREICH_IDS_EINGEBAUT',
      werte: V.BEREICH_IDS_EINGEBAUT,
      ablehnung: 'vivodepot.html — bereichsModulPruefen(): verworfene.push({ id, grund: "reserviert" })',
      bedeutung: 'Ein angedocktes Bereichs-Modul ERGÄNZT, es ersetzt nicht — sonst könnte ein Bündel z. B. "gesundheit" umdefinieren und einem Bestandsdepot dessen Bedeutung unter den Werten wegziehen.',
    },
    {
      register: 'institutionsArt',
      konstante: 'INSTITUTION_ART_EINGEBAUT',
      werte: V.INSTITUTION_ART_EINGEBAUT,
      ablehnung: 'vivodepot.html — institutionsArtModulPruefen(): verworfene.push({ kennung, grund: "reserviert" })',
      bedeutung: 'Dieselbe Ergänzt-nicht-ersetzt-Regel wie bei bereich, für die zwölf eingebauten Institutions-Arten (Bank, Krankenkasse, …).',
    },
    {
      register: 'format (Export-/Import-Kanäle)',
      konstante: 'EXPORT_FORMAT_BY_ID ∪ IMPORT_FORMAT_BY_ID',
      werte: [...new Set([...Object.keys(V.EXPORT_FORMAT_BY_ID), ...Object.keys(V.IMPORT_FORMAT_BY_ID)])].sort(),
      ablehnung: 'vivodepot.html — Formatmodul-Prüfer: hasOwnProperty(IMPORT_FORMAT_BY_ID|EXPORT_FORMAT_BY_ID, modul.format) → nein("reserviert")',
      bedeutung: 'Der eingebaute Kanal-Satz ist nicht überschreibbar, in KEINER Richtung — sonst hinge es an der Ladereihenfolge zweier Listen, welcher `json`-Kanal ein Depot tatsächlich wiederherstellt.',
    },
    {
      register: 'textsatz (Sprache)',
      konstante: 'TEXTSATZ_SPRACHE_EINGEBAUT',
      werte: [V.TEXTSATZ_SPRACHE_EINGEBAUT],
      ablehnung: 'vivodepot.html — Textsatz-Prüfer: modul.sprache === TEXTSATZ_SPRACHE_EINGEBAUT → { gueltig:false, grund:"reserviert" }',
      bedeutung: 'Ein angedocktes Sprachmodul darf die eingebaute Sprache (Deutsch) nicht ersetzen, nur weitere Sprachen ergänzen.',
    },
    {
      register: 'rechtsraum',
      konstante: '(literal — kein eigener Name, ' + dePlatzhalter + ' Fundstellen im Kern)',
      werte: ['DE'],
      ablehnung: 'vivodepot.html — validateRechtsraumModul() und der EINLASS_REGISTER-Prüfer: modul.rechtsraum === "DE" → grund:"reserviert"',
      bedeutung: 'Der eingebaute Rechtsraum-Katalog ist der einzige inhaltlich geführte — ein Modul kann weitere Rechtsräume andocken, "DE" nie neu belegen.',
    },
    {
      register: 'Feld-Namensraum-Präfix',
      konstante: '_TEMPLATE_FELDID_PRAEFIX',
      werte: [V._TEMPLATE_FELDID_PRAEFIX],
      ablehnung: 'vivodepot.html — Definitionen-Übersetzung: feldId ohne dieses Präfix → verworfene.push({ ..., grund:"praefix" })',
      bedeutung: 'Jede Template-Feld-/Codelisten-ID MUSS mit diesem Präfix beginnen — eine Kollision mit einem Kern-Katalog-Feld wird dadurch strukturell unmöglich, nicht nur unwahrscheinlich.',
    },
  ];
}

/* ══ TEIL B — die 77 Schema-Eigenschaften, kuratiert (erhoben 23.08.2026) ══
   `status`: 'geprueft' (ein echter Ablehnungs-/Korrektur-Zweig hängt an diesem Wert),
   'entgegengenommen' (gelesen/gespeichert, aber kein Wert wird deswegen abgelehnt),
   'ohne-wirkung' (kein depot-wirksamer Lesezugriff gefunden),
   'unklar' (Textkoinzidenz im Kern, aber keine sichere Zuordnung zum eingereichten Wert). */
const KONTRAKT_FAKTEN = [
  { name: 'abschnitte', bedeutung: 'Abschnitte des Anbieter-Ausgabedokuments', wirkungsort: 'vivodepot.html:35770 (Array/Length-Gate)', status: 'geprueft' },
  { name: 'adresse', bedeutung: 'Container: Anschrift der Institution', wirkungsort: 'kein eigener Lesezugriff (nur Kind-Felder)', status: 'ohne-wirkung' },
  { name: 'alg', bedeutung: 'Signatur-Algorithmus des Institutions-Schlüssels', wirkungsort: 'vivodepot.html:3705 (unbekannter alg wirft), :3759 (alg-Mismatch abgelehnt)', status: 'geprueft' },
  { name: 'anbieter', bedeutung: 'Stammdaten der Institution (Container)', wirkungsort: 'nur vivodepot-vc-issuer.html — NICHT der Wirkungsort im Kern', status: 'ohne-wirkung' },
  { name: 'anbieterId', bedeutung: 'Technische Kennung der Institution', wirkungsort: 'vivodepot.html:20957 (Namensraum-Kollision), :22755 (ältere-Fassung-Ablehnung)', status: 'geprueft' },
  { name: 'anbieterName', bedeutung: 'Klartext-Name der Institution', wirkungsort: 'vivodepot.html:19486, :22792 (Übernahme/Anzeige)', status: 'entgegengenommen' },
  { name: 'anbieterTyp', bedeutung: 'Strukturierte Institutions-Kategorie', wirkungsort: 'kein Treffer im Kern', status: 'ohne-wirkung' },
  { name: 'ankerTauglich', bedeutung: 'ENTFALLEN (Produktentscheidung, 20.08.2026)', wirkungsort: 'kein Treffer', status: 'ohne-wirkung' },
  { name: 'anzeige', bedeutung: 'Anzeigetext eines Code-Werts', wirkungsort: 'vivodepot.html:21635 (Pflicht in validateTemplate)', status: 'geprueft' },
  { name: 'art', bedeutung: 'Art der Institution für den Verweis-Vorschlag (16.09.2026, Kern-Feldeigenschaften im Einreich-Schema)', wirkungsort: '_templateFeldZuModell (vivodepot.html): übernommen, Vorschlagsliste filtert danach', status: 'entgegengenommen' },
  { name: 'ausFeld', bedeutung: 'Unterschlüssel von gueltigkeitVorschlag: Feld, aus dem die Gültigkeit vorgeschlagen wird', wirkungsort: '_templateFeldZuModell (vivodepot.html): Pflicht für gueltigkeitVorschlag, sonst nicht übernommen', status: 'entgegengenommen' },
  { name: 'begruendung', bedeutung: 'Freitext-Begründung eines Kennungs-Vorschlags (U2-ADR-409 Punkt 3)', wirkungsort: 'kein Treffer — an die Freigabe im Postfach gerichtet, nicht an den Kern', status: 'ohne-wirkung' },
  { name: 'behoerde', bedeutung: 'Herausgebende Behörde des amtlichen Wortlauts', wirkungsort: 'vivodepot.html:21713 (Pflicht bei wortlaut)', status: 'geprueft' },
  { name: 'beispiel', bedeutung: 'Platzhaltertext am Feld (16.09.2026, Kern-Feldeigenschaften im Einreich-Schema)', wirkungsort: '_templateFeldZuModell (vivodepot.html): Übernahme, keine Prüfung', status: 'entgegengenommen' },
  { name: 'bereich', bedeutung: 'Bereichs-Zuordnung eines Template-Felds', wirkungsort: 'vivodepot.html:21082 (Sektor-Ablehnung), :21674', status: 'geprueft' },
  { name: 'code', bedeutung: 'Code-Wert-Kennung (LOINC/ICD-10/ATC/…)', wirkungsort: 'vivodepot.html:21635 (Pflicht)', status: 'geprueft' },
  { name: 'codeListe', bedeutung: 'Name einer Code-Liste für die Eingabehilfe (16.09.2026, Kern-Feldeigenschaften im Einreich-Schema)', wirkungsort: '_templateFeldZuModell (vivodepot.html): Übernahme, keine Prüfung', status: 'entgegengenommen' },
  { name: 'codeListen', bedeutung: 'Mitgelieferte Code-Listen des Templates', wirkungsort: 'vivodepot.html:21684-21702 (Form-/Herkunftsprüfung)', status: 'geprueft' },
  { name: 'codeSystem', bedeutung: 'Verweis auf Code-System/mitgebrachte Liste', wirkungsort: 'vivodepot.html:21618-21631', status: 'geprueft' },
  { name: 'codeWerte', bedeutung: 'Erlaubte Codes eines Auswahlfelds', wirkungsort: 'vivodepot.html:21618-21635, :21662-21664', status: 'geprueft' },
  { name: 'crv', bedeutung: 'Elliptische Kurve des Schlüssels', wirkungsort: 'vivodepot.html:3710-3714 (unbekannte kty/crv wirft)', status: 'geprueft' },
  { name: 'datumJahrMin', bedeutung: 'Kleinstes zulässiges Jahr eines Datums (16.09.2026, Kern-Feldeigenschaften im Einreich-Schema)', wirkungsort: '_templateFeldZuModell (vivodepot.html): Übernahme nur als ganze Zahl', status: 'entgegengenommen' },
  { name: 'dauer', bedeutung: 'Unterschlüssel von fristRegel: Dauer der Frist', wirkungsort: '_templateFeldZuModell (vivodepot.html): Pflicht für fristRegel, sonst nicht übernommen', status: 'entgegengenommen' },
  { name: 'de', bedeutung: 'Deutsche Beschriftung eines Kennungs-Vorschlags (label.de, U2-ADR-409 Punkt 12)', wirkungsort: 'kein Treffer — entsteht erst NACH Freigabe im Feldkatalog/Sprachmodul, nicht am eingereichten Wert', status: 'ohne-wirkung' },
  { name: 'depotSchema', bedeutung: 'Container: woher der Feldwert kommt, wenn quelle=depot — dieselbe Selektor-Form wie datenSchema im Kern (LOGIK_DATEN_TYPEN)', wirkungsort: 'noch keiner — Konsum-/Ausfüll-Laufzeit ist eigener, ausdrücklich geparkter Auftrag (30.08.2026, s. tools/schema-wirkung-grundlinie.json)', status: 'ohne-wirkung' },
  { name: 'diskriminante', bedeutung: 'Unterschlüssel von depotSchema: welche Listen-Zeile (Feld+Wert) bei typ:listenfeld/listenfeldPersonenNamen gemeint ist', wirkungsort: 'kein eigener Lesezugriff (nur Kind von depotSchema, s. dort)', status: 'ohne-wirkung' },
  { name: 'dokument', bedeutung: 'Ausgabedokument-Definition (Container)', wirkungsort: 'vivodepot.html:19484, :35770', status: 'geprueft' },
  { name: 'ebene', bedeutung: 'Anzeige-Ebene des Felds (16.09.2026, Kern-Feldeigenschaften im Einreich-Schema)', wirkungsort: '_templateFeldZuModell (vivodepot.html): Übernahme, keine Prüfung', status: 'entgegengenommen' },
  { name: 'eingabeTyp', bedeutung: 'Eingabeform im Formular (16.09.2026, Kern-Feldeigenschaften im Einreich-Schema)', wirkungsort: '_templateFeldZuModell (vivodepot.html): Übernahme, keine Prüfung', status: 'entgegengenommen' },
  { name: 'einheit', bedeutung: 'Einheit des Feldwerts', wirkungsort: 'vivodepot.html:21129, :35793 (Übernahme/Anzeige)', status: 'entgegengenommen' },
  { name: 'eintraege', bedeutung: 'Einträge einer Code-Liste', wirkungsort: 'vivodepot.html:21690-21692 (Pflicht + Form)', status: 'geprueft' },
  { name: 'email', bedeutung: 'E-Mail der Ansprechperson (Zertifikatsantrag)', wirkungsort: 'kein Treffer im Institutions-Pfad — grober Wächter sieht "email" nur als unrelated Wort andernorts', status: 'ohne-wirkung' },
  { name: 'en', bedeutung: 'Englische Beschriftung eines Kennungs-Vorschlags (label.en, U2-ADR-409 Punkt 12)', wirkungsort: 'kein Treffer — s. de', status: 'ohne-wirkung' },
  { name: 'entitaet', bedeutung: 'Verweis-Art: person, institution, mappe, bankvollmacht (U2-ADR-253) (16.09.2026, Kern-Feldeigenschaften im Einreich-Schema)', wirkungsort: '_templateFeldZuModell (vivodepot.html): unbekannter Wert → ganzes Feld verworfen', status: 'geprueft' },
  { name: 'feld', bedeutung: 'Feldbezug bei Werte-Übergabe/verborgenWenn', wirkungsort: 'vivodepot.html:19457 (ohne .feld verworfen)', status: 'geprueft' },
  { name: 'felder', bedeutung: 'Liste der Template-Felder', wirkungsort: 'vivodepot.html:21581 (leer → Ablehnung)', status: 'geprueft' },
  { name: 'feldname', bedeutung: 'Feldbezeichnung', wirkungsort: 'vivodepot.html:21588-21595 (leer/zu lang → Ablehnung)', status: 'geprueft' },
  { name: 'feldtyp', bedeutung: 'Datentyp des Feldes', wirkungsort: 'vivodepot.html:21601 (unbekannter feldtyp → Ablehnung)', status: 'geprueft' },
  { name: 'fristRegel', bedeutung: 'Frist-Regel am Feld (U2-ADR-284) (16.09.2026, Kern-Feldeigenschaften im Einreich-Schema)', wirkungsort: '_templateFeldZuModell (vivodepot.html): ohne dauer nicht übernommen', status: 'entgegengenommen' },
  { name: 'funktion', bedeutung: 'Funktion der Ansprechperson', wirkungsort: 'kein Treffer', status: 'ohne-wirkung' },
  { name: 'generatorVersion', bedeutung: 'Version des Template-Generators', wirkungsort: 'kein Treffer', status: 'ohne-wirkung' },
  { name: 'grund', bedeutung: 'Widerrufsgrund', wirkungsort: 'vivodepot.html:22776 (nur bei vorhandenem grund wirksam)', status: 'entgegengenommen' },
  { name: 'gruppe', bedeutung: 'Abschnitts-Überschrift zur Gruppierung', wirkungsort: 'vivodepot.html:21109 (Label, keine Prüfung)', status: 'entgegengenommen' },
  { name: 'gueltigBis', bedeutung: 'Ablaufdatum der Vorlage', wirkungsort: 'vivodepot.html:35733-35737 (echter Datumsvergleich)', status: 'geprueft' },
  { name: 'gueltigkeitVorschlag', bedeutung: 'Vorschlag für eine Gültigkeit aus einem anderen Feld (16.09.2026, Kern-Feldeigenschaften im Einreich-Schema)', wirkungsort: '_templateFeldZuModell (vivodepot.html): ohne ausFeld nicht übernommen', status: 'entgegengenommen' },
  { name: 'hilfetext', bedeutung: 'Eingabe-Hinweis am Feld', wirkungsort: 'vivodepot.html:21598-21599 (Typ/Länge → Ablehnung)', status: 'geprueft' },
  { name: 'inputmode', bedeutung: 'Tastatur-Hinweis der Eingabe (16.09.2026, Kern-Feldeigenschaften im Einreich-Schema)', wirkungsort: '_templateFeldZuModell (vivodepot.html): Übernahme, keine Prüfung', status: 'entgegengenommen' },
  { name: 'keineZukunft', bedeutung: 'Datum darf nicht in der Zukunft liegen (16.09.2026, Kern-Feldeigenschaften im Einreich-Schema)', wirkungsort: '_templateFeldZuModell (vivodepot.html): Gate auf === true', status: 'entgegengenommen' },
  { name: 'kennung', bedeutung: 'Die vorgeschlagene Feld-Kennung (U2-ADR-409 Punkt 3)', wirkungsort: 'kein Treffer im eingereichten Paket — die Prüfung gegen den Katalog leistet tools/kennung-vorschlag-pruefen.js, nicht der Kern', status: 'ohne-wirkung' },
  { name: 'kennungVorschlaege', bedeutung: 'Container: ein oder mehrere Kennungs-Vorschläge, ohne Vorlage (U2-ADR-409 Punkt 3/5)', wirkungsort: 'kein eigener Lesezugriff im Kern — die Freigabe ist ein redaktioneller Akt im Postfach', status: 'ohne-wirkung' },
  { name: 'kid', bedeutung: 'Schlüssel-Kennung im JWK', wirkungsort: 'Kern-Treffer nur bei JWS-Header-Erzeugung, nicht beim eingereichten Wert', status: 'unklar' },
  { name: 'kontakt', bedeutung: 'Container: Ansprechperson', wirkungsort: 'kein eigener Lesezugriff', status: 'ohne-wirkung' },
  { name: 'kty', bedeutung: 'Schlüsseltyp (OKP/EC)', wirkungsort: 'vivodepot.html:3710-3714 (unbekannte Kombination wirft)', status: 'geprueft' },
  { name: 'kuerzel', bedeutung: 'Kurzbezeichnung einer Code-Liste', wirkungsort: 'vivodepot.html:21044 (Übernahme, keine Prüfung)', status: 'entgegengenommen' },
  { name: 'label', bedeutung: 'Beschriftung je Sprache eines Kennungs-Vorschlags (Container: de/en, U2-ADR-409 Punkt 12)', wirkungsort: 'kein eigener Lesezugriff (nur Kind-Felder de/en)', status: 'ohne-wirkung' },
  { name: 'land', bedeutung: 'Land der Institutionsanschrift', wirkungsort: 'kein Treffer', status: 'ohne-wirkung' },
  { name: 'lizenz', bedeutung: 'Lizenz des Wortlauts/der Code-Liste', wirkungsort: 'vivodepot.html:21715 (Pflicht bei wortlautQuelle)', status: 'geprueft' },
  { name: 'marken', bedeutung: 'Feld-Marken (z. B. laeuftAb/giltAb)', wirkungsort: 'vivodepot.html:25959 (feldHatMarke-Abgleich, echter Effekt)', status: 'geprueft' },
  { name: 'mehrzeilig', bedeutung: 'Mehrzeilige Eingabe (16.09.2026, Kern-Feldeigenschaften im Einreich-Schema)', wirkungsort: '_templateFeldZuModell (vivodepot.html): Übernahme bei wahrem Wert', status: 'entgegengenommen' },
  { name: 'minAnzahl', bedeutung: 'Unterschlüssel von sichtbarWenn: Mindestzahl an Listeneinträgen', wirkungsort: '_templateFeldZuModell (vivodepot.html): nur als ganze Zahl übernommen', status: 'entgegengenommen' },
  { name: 'mitGeburt', bedeutung: 'Personen-Verweis mit Geburtsdatum (16.09.2026, Kern-Feldeigenschaften im Einreich-Schema)', wirkungsort: '_templateFeldZuModell (vivodepot.html): Gate auf === true', status: 'entgegengenommen' },
  { name: 'mitMessdatum', bedeutung: 'Feldwert trägt ein Messdatum', wirkungsort: 'vivodepot.html:21132 (Übernahme, keine Prüfung)', status: 'entgegengenommen' },
  { name: 'name', bedeutung: 'Name der Ansprechperson', wirkungsort: 'kein Treffer im Institutions-Pfad — grober Wächter sieht "name" nur als unrelated Wort andernorts', status: 'ohne-wirkung' },
  { name: 'ort', bedeutung: 'Ort der Institutionsanschrift', wirkungsort: 'kein Treffer', status: 'ohne-wirkung' },
  { name: 'pflicht', bedeutung: 'Pflichtfeld-Kennzeichen', wirkungsort: 'vivodepot.html:21112 (Coercion, keine Prüfung)', status: 'entgegengenommen' },
  { name: 'plz', bedeutung: 'PLZ der Institutionsanschrift', wirkungsort: 'kein Treffer', status: 'ohne-wirkung' },
  { name: 'provenienzPflichtig', bedeutung: 'Provenienz-Stempel-Pflicht (F-6)', wirkungsort: 'vivodepot.html:21064 nur als bekannter Schlüssel geführt, Wert nie gelesen (A345)', status: 'ohne-wirkung' },
  { name: 'pruefIntervallMonate', bedeutung: 'Prüfintervall in Monaten (U2-ADR-167) (16.09.2026, Kern-Feldeigenschaften im Einreich-Schema)', wirkungsort: '_templateFeldZuModell (vivodepot.html): nur als positive ganze Zahl übernommen', status: 'entgegengenommen' },
  { name: 'publicKeyJwk', bedeutung: 'Öffentlicher Schlüssel der Institution', wirkungsort: 'vivodepot.html:3845-3846 (Thumbprint), :22298/:22322 (Signaturprüfung)', status: 'geprueft' },
  { name: 'quelle', bedeutung: 'Herkunft des Feldwerts: neu (Formular, Default) oder depot (automatisch aus einem Depot-Feld gelesen, s. depotSchema)', wirkungsort: 'noch keiner — s. depotSchema', status: 'ohne-wirkung' },
  { name: 'rechtsform', bedeutung: 'Rechtsform der Institution', wirkungsort: 'kein Treffer', status: 'ohne-wirkung' },
  { name: 'referenzbereich', bedeutung: 'Referenzbereich eines Messwerts', wirkungsort: 'vivodepot.html:21130, :35795 (Übernahme/Anzeige)', status: 'entgegengenommen' },
  { name: 'regel', bedeutung: 'Unterschlüssel von gueltigkeitVorschlag: Regel des Vorschlags', wirkungsort: '_templateFeldZuModell (vivodepot.html): Übernahme als Text', status: 'entgegengenommen' },
  { name: 'rolle', bedeutung: 'Freie Rolle eines Verweises (U2-ADR-253) (16.09.2026, Kern-Feldeigenschaften im Einreich-Schema)', wirkungsort: '_templateFeldZuModell (vivodepot.html): Übernahme, offenes Vokabular', status: 'entgegengenommen' },
  { name: 'sektor', bedeutung: 'Unterschlüssel von depotSchema (und dessen teile[]): welcher der zwölf Sektoren gemeint ist', wirkungsort: 'kein eigener Lesezugriff (nur Kind von depotSchema, s. dort)', status: 'ohne-wirkung' },
  { name: 'sensibel', bedeutung: 'Feld ist von sich aus sensibel', wirkungsort: 'vivodepot.html:21128 (Gate auf === true, keine Fehlerbehandlung)', status: 'entgegengenommen' },
  { name: 'sichtbarWenn', bedeutung: 'Bedingte Sichtbarkeit, positive Form (16.09.2026, Kern-Feldeigenschaften im Einreich-Schema)', wirkungsort: '_templateFeldZuModell (vivodepot.html): ohne feld nicht übernommen', status: 'entgegengenommen' },
  { name: 'situation', bedeutung: 'Situation statt Bereich (U2-ADR-246) (16.09.2026, Kern-Feldeigenschaften im Einreich-Schema)', wirkungsort: '_templateFeldZuModell (vivodepot.html): unbekannte Situation → Feld verworfen', status: 'geprueft' },
  { name: 'sorgerechtTauglich', bedeutung: 'ENTFALLEN (Produktentscheidung, 20.08.2026)', wirkungsort: 'kein Treffer', status: 'ohne-wirkung' },
  { name: 'stand', bedeutung: 'Stand/Datum des Wortlauts', wirkungsort: 'vivodepot.html:22269 (Anzeige, keine Prüfung)', status: 'entgegengenommen' },
  { name: 'stelle', bedeutung: 'Unterschlüssel von fristRegel: Bezugsstelle (U2-ADR-284)', wirkungsort: '_templateFeldZuModell (vivodepot.html): Übernahme als Text', status: 'entgegengenommen' },
  { name: 'strasse', bedeutung: 'Straße der Institutionsanschrift', wirkungsort: 'kein Treffer der Eigenschaft (Kern-eigenes Adressfeld gleichen Namens verfälscht den groben Scan)', status: 'ohne-wirkung' },
  { name: 'subTauglich', bedeutung: 'ENTFALLEN (Produktentscheidung, 20.08.2026)', wirkungsort: 'kein Treffer', status: 'ohne-wirkung' },
  { name: 'submissionId', bedeutung: 'Kennung der Einreichung', wirkungsort: 'kein Treffer', status: 'ohne-wirkung' },
  { name: 'submissionTimestamp', bedeutung: 'Erzeugungszeitpunkt der Einreichung', wirkungsort: 'kein Treffer', status: 'ohne-wirkung' },
  { name: 'synonym', bedeutung: 'Synonym eines Code-Werts', wirkungsort: 'vivodepot.html:21032/21170 (Übernahme, keine Prüfung)', status: 'entgegengenommen' },
  { name: 'systemId', bedeutung: 'Kennung einer Code-Liste', wirkungsort: 'vivodepot.html:21688-21689 (leer/zu lang → Ablehnung)', status: 'geprueft' },
  { name: 'teile', bedeutung: 'Unterschlüssel von depotSchema bei typ:verbinden: mehrere Sektor/Feld-Paare, die zusammengesetzt werden', wirkungsort: 'kein eigener Lesezugriff (nur Kind von depotSchema, s. dort)', status: 'ohne-wirkung' },
  { name: 'telefon', bedeutung: 'Telefonnummer der Ansprechperson', wirkungsort: 'kein Treffer der Eigenschaft (Kern-eigenes Telefonfeld gleichen Namens verfälscht den groben Scan)', status: 'ohne-wirkung' },
  { name: 'templates', bedeutung: 'Definierte Daten-Templates (Array, Schnitt 24.08.2026/A523 — vormals `template`, ein einzelnes)', wirkungsort: 'vivodepot.html:22322-22328 (validateTemplate-Torwächter, je Eintrag einzeln)', status: 'geprueft' },
  { name: 'templatesJws', bedeutung: 'JWS-signierte Templates (Array, index-gleich zu templates — vormals `templateJws`, ein einzelnes)', wirkungsort: 'vivodepot.html:21736-21764 (zweistufige Signaturprüfung, je Eintrag einzeln)', status: 'geprueft' },
  { name: 'text', bedeutung: 'Erklärender Satz vor Abschnitts-Feldern', wirkungsort: 'vivodepot.html:35801 (Übernahme, keine Prüfung)', status: 'entgegengenommen' },
  { name: 'titel', bedeutung: 'Titel (Wortlautquelle/Broschüre/Abschnitt)', wirkungsort: 'vivodepot.html:21714 (Pflicht bei wortlautQuelle), :21722', status: 'geprueft' },
  { name: 'trenner', bedeutung: 'Unterschlüssel von depotSchema.teile: Trennzeichen beim Zusammensetzen (typ:verbinden)', wirkungsort: 'kein eigener Lesezugriff (nur Kind von depotSchema, s. dort)', status: 'ohne-wirkung' },
  { name: 'typ', bedeutung: 'Unterschlüssel von depotSchema: welche der fünf Selektor-Formen (feld/verbinden/listenfeld/personenNamen/listenfeldPersonenNamen)', wirkungsort: 'noch keiner — s. depotSchema', status: 'ohne-wirkung' },
  { name: 'unterFelder', bedeutung: 'Unterfelder einer Liste', wirkungsort: 'vivodepot.html:21652-21664 (Form-Pflicht → Ablehnung)', status: 'geprueft' },
  { name: 'unterdrueckeInZusammenfassungWennGesetzt', bedeutung: 'Feld in der Zusammenfassung unterdrücken, wenn ein anderes gesetzt ist (16.09.2026, Kern-Feldeigenschaften im Einreich-Schema)', wirkungsort: '_templateFeldZuModell (vivodepot.html): Übernahme, keine Prüfung', status: 'entgegengenommen' },
  { name: 'unterfeld', bedeutung: 'Unterschlüssel von depotSchema: welches Unterfeld einer Listen-Zeile bzw. Personen-Angabe gelesen wird (typ:listenfeld/personenNamen/listenfeldPersonenNamen)', wirkungsort: 'kein eigener Lesezugriff (nur Kind von depotSchema, s. dort)', status: 'ohne-wirkung' },
  { name: 'uri', bedeutung: 'URI einer Code-Liste', wirkungsort: 'vivodepot.html:21701-21702 (Herkunftsprüfung → Ablehnung)', status: 'geprueft' },
  { name: 'url', bedeutung: 'URL der Wortlautquelle (Broschüre)', wirkungsort: 'vivodepot.html:21723 (Pflicht)', status: 'geprueft' },
  { name: 'use', bedeutung: 'Verwendungszweck des JWK (z. B. "sig")', wirkungsort: 'kein fachlicher Treffer gefunden — evtl. nur an WebCrypto-Import durchgereicht', status: 'unklar' },
  { name: 'useCase', bedeutung: 'Freitext-Begründung im Antrag', wirkungsort: 'kein Treffer', status: 'ohne-wirkung' },
  { name: 'ustId', bedeutung: 'USt-ID der Institution', wirkungsort: 'kein Treffer', status: 'ohne-wirkung' },
  { name: 'verborgenWenn', bedeutung: 'Bedingte Sichtbarkeit eines Feldes', wirkungsort: 'vivodepot.html:21140-21143 (Form-Gate, ohne .feld ignoriert)', status: 'entgegengenommen' },
  { name: 'version', bedeutung: 'Fassung der Vorlage', wirkungsort: 'vivodepot.html:22755 (ältere Fassung → Ablehnung)', status: 'geprueft' },
  { name: 'verweisKontextFeld', bedeutung: 'Koppelndes Kontextfeld eines Verweises (16.09.2026, Kern-Feldeigenschaften im Einreich-Schema)', wirkungsort: '_templateFeldZuModell (vivodepot.html): Übernahme, keine Prüfung', status: 'entgegengenommen' },
  { name: 'verweisZweck', bedeutung: 'Freier Zweck eines Verweises, steuert den Export (U2-ADR-253) (16.09.2026, Kern-Feldeigenschaften im Einreich-Schema)', wirkungsort: '_templateFeldZuModell (vivodepot.html): Übernahme, unbekannter Zweck exportiert nichts', status: 'entgegengenommen' },
  { name: 'vorlageId', bedeutung: 'Stabile Kennung der Vorlage beim Anbieter', wirkungsort: 'vivodepot.html:22740-22755 (Identität/Aktualisierung)', status: 'geprueft' },
  { name: 'vorschlaege', bedeutung: 'Eingabe-Vorschläge (16.09.2026, Kern-Feldeigenschaften im Einreich-Schema)', wirkungsort: '_templateFeldZuModell (vivodepot.html): Übernahme als Text-Liste', status: 'entgegengenommen' },
  { name: 'warnWennJa', bedeutung: 'Ja bedeutet Warnung', wirkungsort: 'vivodepot.html:21131, :35797-35798 (Übernahme/Anzeige)', status: 'entgegengenommen' },
  { name: 'wert', bedeutung: 'Feldwert aus geprüftem Claim', wirkungsort: 'vivodepot.html:19458 (direkte Übernahme)', status: 'entgegengenommen' },
  { name: 'widerruf', bedeutung: 'Widerruf einer Vorlage', wirkungsort: 'vivodepot.html:19483/22774-22776 (nur bei .grund wirksam)', status: 'entgegengenommen' },
  { name: 'wortlaut', bedeutung: 'Amtlicher Wortlaut', wirkungsort: 'vivodepot.html:21709-21710 (Typ/Länge → Ablehnung)', status: 'geprueft' },
  { name: 'wortlautQuelle', bedeutung: 'Herkunft/Lizenz des Wortlauts', wirkungsort: 'vivodepot.html:21712-21715 (Pflicht wenn wortlaut gesetzt)', status: 'geprueft' },
  { name: 'wortlautQuelleBroschuere', bedeutung: 'Zweite Quelle (Broschüre/Portal)', wirkungsort: 'vivodepot.html:21720-21723 (Form-Pflicht)', status: 'geprueft' },
  { name: 'x', bedeutung: 'JWK-Koordinate (Public-Key-Material)', wirkungsort: 'vivodepot.html:3845-3846 (Thumbprint/Verify)', status: 'geprueft' },
  { name: 'y', bedeutung: 'JWK-Koordinate (EC-Fall)', wirkungsort: 'vivodepot.html:3846 (nur bei kty=EC)', status: 'geprueft' },
  { name: 'ziel', bedeutung: 'Nur feldtyp=verweis: externe Adresse (nur https:), auf die das Feld zeigt — fixer Definitions-Wert, kein Bürgerin-Eintrag (12.09.2026)', wirkungsort: 'vivodepot.html:24824-24829 (Pflicht + https-Form → Ablehnung), :46151/:49386 (Anzeige, erneut geprüft)', status: 'geprueft' },
  { name: 'zusammenfassungFelder', bedeutung: 'Positivliste der Unterfelder in der Zusammenfassung (16.09.2026, Kern-Feldeigenschaften im Einreich-Schema)', wirkungsort: '_templateFeldZuModell (vivodepot.html): Übernahme als Text-Liste', status: 'entgegengenommen' },
];

function schemaNamenHeute() {
  const S = require(path.join(REPO, 'tools', 'schema-wirkung-pruefen.js'));
  const schema = JSON.parse(fs.readFileSync(S.SCHEMA, 'utf8'));
  return S.schemaSchluessel(schema).sort();
}

function drift() {
  const heute = new Set(schemaNamenHeute());
  const tabelle = new Set(KONTRAKT_FAKTEN.map((f) => f.name));
  const fehlt = [...heute].filter((n) => !tabelle.has(n));
  const zuviel = [...tabelle].filter((n) => !heute.has(n));
  return { fehlt, zuviel, ok: fehlt.length === 0 && zuviel.length === 0 };
}

function markdown() {
  const register = reservierteRegister();
  const z = [];
  z.push('# Kontrakt-Faktenübersicht — erzeugt, nicht handgepflegt');
  z.push('');
  z.push('**Erzeugt am:** ' + new Date().toISOString().slice(0, 10) + ' · **Commit:** `' + commitHash()
    + '` · **Werkzeug:** `tools/kontrakt-faktenuebersicht-erzeugen.js`');
  z.push('');
  z.push('Ein Kontrakt, der nicht durchgesetzt wird, ist eine Beschreibung, keine Spezifikation. '
    + 'Diese Übersicht sagt für jede zugesagte Eigenschaft, ob sie geprüft wird oder nur '
    + 'entgegengenommen — bei Abweichung schlägt `node tools/kontrakt-faktenuebersicht-erzeugen.js '
    + '--check` an.');
  z.push('');
  z.push('---');
  z.push('');
  z.push('## Teil A — Reservierte Kennungen (sechs Register)');
  z.push('');
  z.push('Ein Modul ERGÄNZT den eingebauten Bestand, es ersetzt ihn nicht (U2-ADR-145 Punkt 5). '
    + 'Live aus dem geladenen Kern gelesen, nicht aus dem Gedächtnis.');
  z.push('');
  for (const r of register) {
    z.push('### ' + r.register);
    z.push('');
    z.push('- **Konstante:** `' + r.konstante + '`');
    z.push('- **Reservierte Werte (' + r.werte.length + '):** ' + r.werte.map((w) => '`' + w + '`').join(', '));
    z.push('- **Ablehnungsstelle:** ' + r.ablehnung);
    z.push('- **Bedeutung:** ' + r.bedeutung);
    z.push('');
  }
  z.push('---');
  z.push('');
  z.push('## Teil B — Kontrakt-Faktenübersicht (Einreich-Schema)');
  z.push('');
  z.push('**' + KONTRAKT_FAKTEN.length + ' Schema-Eigenschaften.** `geprüft` = ein echter '
    + 'Ablehnungs-/Korrektur-Zweig hängt am Wert. `entgegengenommen` = gelesen/gespeichert, aber '
    + 'kein Wert wird deswegen abgelehnt. `ohne Wirkung` = kein depot-wirksamer Lesezugriff '
    + 'gefunden. `unklar` = Textkoinzidenz im Kern, keine sichere Zuordnung.');
  z.push('');
  z.push('**Methodische Einschränkung:** mehrere Schlüssel kommen an mehreren Stellen im Schema '
    + 'mit unterschiedlichem Gewicht vor. Gezeigt wird die stärkste gefundene Wirkung, keine '
    + 'erschöpfende Pfad-für-Pfad-Analyse jeder Nennung.');
  z.push('');
  z.push('| Eigenschaft | Bedeutung | Wirkungsort | Status |');
  z.push('|---|---|---|---|');
  for (const f of KONTRAKT_FAKTEN) {
    z.push('| `' + f.name + '` | ' + f.bedeutung + ' | ' + f.wirkungsort + ' | ' + f.status + ' |');
  }
  z.push('');
  const zaehl = KONTRAKT_FAKTEN.reduce((acc, f) => { acc[f.status] = (acc[f.status] || 0) + 1; return acc; }, {});
  z.push('**Summe:** ' + Object.entries(zaehl).map(([k, v]) => v + ' ' + k).join(' · ') + '.');
  z.push('');
  return z.join('\n') + '\n';
}

function main() {
  const d = drift();
  if (CHECK) {
    if (!fs.existsSync(AUSGABE)) { console.error('kontrakt-faktenuebersicht-erzeugen --check: ' + AUSGABE + ' existiert nicht.'); process.exit(1); }
    const soll = markdown().replace(/\*\*Erzeugt am:\*\* \d{4}-\d{2}-\d{2} · \*\*Commit:\*\* `[^`]*`/, 'ERZEUGT_AM_UND_COMMIT');
    const ist = fs.readFileSync(AUSGABE, 'utf8').replace(/\*\*Erzeugt am:\*\* \d{4}-\d{2}-\d{2} · \*\*Commit:\*\* `[^`]*`/, 'ERZEUGT_AM_UND_COMMIT');
    if (soll !== ist) { console.error('kontrakt-faktenuebersicht-erzeugen --check: Drift gegen ' + AUSGABE + '.'); process.exit(1); }
    if (!d.ok) {
      console.error('kontrakt-faktenuebersicht-erzeugen --check: Schema-Schlüssel-Drift.');
      if (d.fehlt.length) console.error('  fehlt in der Tabelle: ' + d.fehlt.join(', '));
      if (d.zuviel.length) console.error('  nicht mehr im Schema: ' + d.zuviel.join(', '));
      process.exit(1);
    }
    console.log('kontrakt-faktenuebersicht-erzeugen --check: kein Drift.');
    return;
  }
  if (!d.ok) {
    console.error('WARNUNG — die Tabelle deckt den heutigen Schema-Schlüsselsatz nicht mehr genau:');
    if (d.fehlt.length) console.error('  fehlt in der Tabelle: ' + d.fehlt.join(', '));
    if (d.zuviel.length) console.error('  nicht mehr im Schema: ' + d.zuviel.join(', '));
  }
  fs.writeFileSync(AUSGABE, markdown(), 'utf8');
  console.log('kontrakt-faktenuebersicht-erzeugen: ' + path.relative(REPO, AUSGABE) + ' geschrieben ('
    + KONTRAKT_FAKTEN.length + ' Schema-Eigenschaften, ' + reservierteRegister().length + ' reservierte Register).');
}

if (require.main === module) main();
module.exports = { reservierteRegister, KONTRAKT_FAKTEN, schemaNamenHeute, drift, markdown };
