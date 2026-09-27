#!/usr/bin/env node
'use strict';
/* ════════════════════════════════════════════════════════════════════════
   englische-kennungen-pruefen.js — Sicherung (a) des Umbauplans „Englisch vor v1"
   ────────────────────────────────────────────────────────────────────────
   U2-ADR-XXX (Entwurf, s. Bericht umbauplan-englisch-vor-v1-2026-09-13.md,
   Abschnitt 4a). Prüft: NACH der Umbenennung darf kein alter deutscher
   Kennungs- oder Format-Schlüssel mehr in den lebenden Dateien vorkommen —
   außer dort, wo er bewusst stehen bleibt (der Migrationscode selbst muss den
   alten Schlüssel NENNEN, um ihn umzuschreiben).

   HEUTE (13.09.2026, vor Commit 3) IST DIESES WERKZEUG NOCH NICHT GRÜN gegen
   den echten Kern — das ist erwartet: die Kennungen sind noch deutsch. Dieses
   Werkzeug wird erst ab Commit 3 zum Abnahme-Gate; bis dahin beweist der
   Selbsttest (ohne Argumente, gegen Fixtures) NUR, dass die Erkennung selbst
   funktioniert — Positiv- UND Negativprobe.

   AUSNAHMEN sind DATEIEN, keine Zeilen (wie tests/fixture-felder-im-modell.
   test.js) — der Migrationscode (die neue depotNormalisieren-Stufe, Schema
   80→81) MUSS die alten Schlüssel nennen, um sie umzuschreiben; das ist die
   einzige vorgesehene Ausnahme, mit Grund geführt, nicht stillschweigend
   gefiltert.

   Aufruf:
     node tools/englische-kennungen-pruefen.js
       → Selbsttest gegen tests/fixtures/englische-kennungen-pruefen/
     node tools/englische-kennungen-pruefen.js --datei <pfad> [--datei <pfad> …]
       → prüft genau diese Dateien gegen die echte Mapping-Tabelle
   ════════════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const path = require('node:path');

const REPO = path.join(__dirname, '..');
const MAPPING_PFAD = path.join(REPO, 'docs', 'umbau-englisch-vor-v1', 'kennung-mapping.json');
const FIXTURES_ORDNER = path.join(REPO, 'tests', 'fixtures', 'englische-kennungen-pruefen');

/* Dateien, in denen ein alter Schlüssel bewusst stehen bleibt, mit Grund.
   Wird eine dieser Dateien geprüft, zählt ein Fund dort NICHT als Verstoß.
   NUR für einen Fund, den weder Kommentar-Maskierung noch Regionen-Ausnahme
   (unten) auffängt -- eine ganze Datei auszunehmen verdeckt echten Code. */
const AUSNAHMEN = Object.freeze({
});

/* Erzeugte Regionen, deren Inhalt PER DEFINITION alte Kennungen als Daten trägt
   (die Alt→Neu-Tabelle selbst) — kein Code, der sie verwendet. Maskiert wie ein
   Kommentar: der Bereich zwischen den Markern zählt nicht als Fund, alles
   ausserhalb (auch direkt daneben) weiterhin schon. */
const REGIONEN_AUSNAHMEN = Object.freeze({
  /* Gerüst-Schnitt S7 (21.09.2026): der Katalog der 13 nativen Bereiche steht nicht mehr im Kern, sondern in dieser Moduldatei
     (aus tools/bereich-templates/*.json erzeugt). Dieselbe WERTRAUM-AUSNAHME wie zuvor im Kern, jetzt für die Datei: verweisZweck,
     Optionswert, Rolle, Art, Entität sind Werte, die eine Person liest oder die einen festen Wertraum benennen. Sektions-Ids,
     Feld-Ids und Dokumenttyp-Codes (`"id"`, `"typ"`) bleiben geprüft, denn sie SIND Kennungen. */
  'bereiche-nativ-katalog-modul.json': [
    { beginn: '"bereiche": {', ende: '\n  }\n}',
      nurMuster: /"(?:verweisZweck|wert|rolle|art|entitaet)":\s*"[^"]*"/g,
      grund: 'Wertraum-Werte des Katalogs (verweisZweck, Optionswert, Rolle, Art, Entität): Oberflächen-/Wertraumtext, keine Kennung.' },
  ],
  'vivodepot.html': [
    /* WERTRAUM-AUSNAHME (19.09.2026, Entscheidung DoD-Punkt 2): im Katalog der 13 nativen Bereiche
       (aus tools/bereich-templates/*.json erzeugt) stehen Werte, die eine Person in der Oberfläche liest oder
       die einen festen Wertraum benennen: verweisZweck, Options-`wert`, `rolle`, `art`, `entitaet`. Sie sind
       KEINE Kennungen und werden nicht englisch. `nurMuster` maskiert NUR diese Eigenschaftswerte innerhalb der
       Region — Sektions-Ids, Feld-Ids und Dokumenttyp-Codes (`"id"`, `"typ"`) bleiben geprüft, denn sie SIND Kennungen. */
    { beginn: '/* AB_WERK_DOKUMENTE_DE:BEGIN */', ende: '/* AB_WERK_DOKUMENTE_DE:END */',
      grund: 'Eingebackener Formulartext (Patientenverfügung, Vollmachten, Klauseln): Fließtext und Optionswerte, die eine Person liest — Template-Inhalt, kein Feldname.' },
    { beginn: '/* AB_WERK_LOGIK_MODUL_AUSZUEGE_QUELLEN:BEGIN', ende: '/* AB_WERK_LOGIK_MODUL_AUSZUEGE_QUELLEN:END */',
      nurMuster: /"[A-Za-z_]+"(?=\s*:\s*\{)|"feldId"\s*:\s*"[^"]*"/g,
      grund: 'Auszug-Quellen: die SCHLÜSSEL des datenSchema und die feldId der Fragen sind Auszug-eigene Frageschlüssel (z. B. unterhalt), die per "feld" auf englische Sektorfelder zeigen — Sektor- und Feldwerte darin bleiben geprüft.' },
    { beginn: '/* KENNUNG-MAPPING:BEGIN', ende: '/* KENNUNG-MAPPING:END */', grund: 'Alt→Neu-Tabelle selbst -- muss die alten Kennungen als Daten tragen, um sie umzuschreiben (Plan-Commit 3).' },
    { beginn: 'const _BEREICH_ALT_LABEL = Object.freeze({', ende: '});',
      grund: 'Eingefrorenes Archiv historischer Vorlagen-Einreichungen unter ihrer DAMALIGEN Bereichs-Id -- eigener Kopf-Kommentar: "wächst nicht mehr … darf hinter SEKTOREN zurückbleiben" (14.09.2026 geprüft, kein Bug).' },
    { beginn: 'function depotNormalisieren(d) {', ende: 'ziel.schemaVersion = 80;\n  }',
      grund: 'depotNormalisieren-Stufen VOR Schema 80→81 lesen/schreiben `ziel.sektoren[...]` in der Gestalt, die das Depot AN JENER historischen Stufe hatte -- die Umschreibung auf englische Bereichs-/Feld-Namen passiert strukturell erst in Stufe 80→81 (_sektorenKennungenUmschreiben). Ein Depot unterhalb Schema 81 traegt an diesen Stufen noch die deutschen Schluessel; sie hier auf englisch umzuschreiben wuerde jede dieser Migrationen fuer echte Bestandsdepots stumm leerlaufen lassen (real geprueft: eine erste automatisierte Fassung tat genau das, 14.09.2026, s. Bericht -- Kern lud noch, aber Dutzende ADR-Migrationen haetten nie mehr gegriffen). Bewusst NICHT umbenannt, wie _BEREICH_ALT_LABEL oben.' },
    /* B16-AUSNAHME (22.09.2026, DoD-Punkt 2 nachgemessen). B16_IGNORE/B16_FELD_MAPPING/B16_INSTRUMENT_IMPORT/
       B16_ERKANNTE_SCHLUESSEL erkennen eine Datei der VORGÄNGER-APP „B16" und migrieren ihre gespeicherten
       Felder -- dieselbe Lage wie KENNUNG_MAPPING oben, nur ohne deren Region-Markierung. Die ZIELSEITE bleibt
       bewusst UNGEMASKIERT: `nurMuster` trifft nur einwortige/snake_case Kleinschreibungs-Literale (die
       B16-QUELLSCHLÜSSEL-Form) -- ein kamelCase-Zielname (`feldId`/`sektorId`-Werte wie `maritalStatus`,
       `birthDate`) enthält einen Großbuchstaben und fällt NICHT unters Muster, bleibt also geprüft, falls dort
       je ein unenglischer Zielname einträfe. Einwortige englische Zielwerte ohne Großbuchstaben (`email`,
       `gender`, `telephone`, `health`, `housing` u. ä.) fallen zwar mit unters Muster, waren aber nie ein Fund
       (sie stehen nicht in der Alt-Kennungen-Liste) -- das Maskieren ändert dort nichts Prüfbares. */
    { beginn: "const B16_IGNORE = new Set([", ende: '\n]));',
      nurMuster: /'[a-z][a-z0-9_]*'/g,
      grund: 'B16-Alt-Format-Erkennung + Skalarfeld-Migration (B16_IGNORE, B16_FELD_MAPPING, B16_INSTRUMENT_IMPORT, B16_ERKANNTE_SCHLUESSEL): die deutschen Schlüssel der Vorgänger-App MÜSSEN hier stehen, um Bestandsdepots zu erkennen und umzuschreiben -- eine Umbenennung würde diese Erkennung zerstören. Gemessen 22.09.2026: 111 von 119 heute im Bestand gemeldeten Fundstellen in vivodepot.html gehören zu dieser Klasse (105 in B16_FELD_MAPPING, 6 weitere Kennungen nur im Set-Literal/B16_IGNORE) -- kein Feldnamen-Rückstand, sondern notwendige Migrationsdaten.' },
    { beginn: 'function _b16Felder(parsed) {', ende: "furtherDetails'), notizWert) });\n  return { felder, listen };",
      // ACHTUNG (22.09.2026, beim Bau selbst gemessen): eine frühe Wächter-Zeile
      // `if (!parsed || !parsed.data || typeof parsed.data !== 'object') return { felder, listen };`
      // trägt DENSELBEN Wortlaut wie der echte Funktions-Schluss -- ein `ende: 'return { felder, listen };'`
      // träfe DORT zuerst und maskierte nur zwei Zeilen statt der ganzen Funktion. Der längere,
      // eindeutige Anker (geprüft: genau ein Vorkommen im ganzen Dokument) umgeht das.
      nurMuster: /'[a-z][a-z0-9_]*'/g,
      grund: 'Zweite Hälfte derselben B16-Migration (_b16Felder): liest dieselben deutschen Alt-Schlüssel (u. a. voroperationen, familienanamnese, wohnungsschluessel_ort, vermieter_tel, abhaengige_personen) ein zweites Mal, in einer eigenen Funktion außerhalb der B16-Tabellen-Region oben -- gleicher Grund, gleiche Notwendigkeit. Deckt die restlichen Fundstellen derselben sechs Schlüssel, die im Tabellen-Block nur je einmal (im Set-Literal) stehen, hier aber ein zweites/drittes Mal beim tatsächlichen Auslesen (`hasOwnProperty`, `d.<schlüssel>`, `verbraucht.add`). Bericht: s. o.' },
    // Die folgenden sieben Fundstellen tragen KEINE Bereichs-Id, sondern einen eigenständigen,
    // zufällig gleich benannten Wertraum -- je einzeln gegen die konsumierende Stelle geprüft
    // (14.09.2026), nicht vermutet. Positionsgenau, weil `art:`/`wert:` (s. o.) diese Form
    // (Vergleich/Positions-Argument, kein `schluessel: 'wert'`-Objektliteral) nicht erfasst.
    { beginn: "_instrumentVorhanden('enduring-power-of-attorney', 'vorsorge')", ende: "_instrumentVorhanden('enduring-power-of-attorney', 'vorsorge')",
      grund: "_instrumentVorhanden(typ, art) -- zweites Argument ist derselbe Vollmacht-Umfang wie `art:`/`wert:` oben (RECHTSGRUNDLAGEN_VERTRETUNG-Vokabular), keine Bereichs-Id." },
    { beginn: "eintrag.basisOfRepresentation === 'vorsorgevollmacht' ? 'vorsorge' : ''", ende: "eintrag.basisOfRepresentation === 'vorsorgevollmacht' ? 'vorsorge' : ''",
      // Anker war bis 22.09.2026 `eintrag.vertretung_art === …` — die Variable heißt inzwischen
      // `basisOfRepresentation` (Feld selbst schon umbenannt), der Anker fand daher nichts mehr
      // und die Ausnahme griff STILL nicht mehr (beim DoD-2-Nachzug gemessen, kein Verhaltenswechsel).
      grund: "Schlüssel aus RECHTSGRUNDLAGEN_VERTRETUNG (eigener, unabhängiger Wertraum: vorsorge/bank/gesundheit/general/betreuung/…), keine Bereichs-Id -- s. Objekt-Definition." },
    { beginn: "if (s.ansicht === 'verwaltung') oeffneVerwaltung();", ende: "if (s.ansicht === 'verwaltung') oeffneVerwaltung();",
      grund: "`ansicht`/`aktiveAnsicht` ist der UI-Ansichtsmodus ('sektor'|'verwaltung'|'situation'|…, s. Deklaration `let aktiveAnsicht`), NICHT die Bereichs-Id -- 'verwaltung' meint hier die Verwaltete-Depots-Ansicht (oeffneVerwaltung/renderVerwalteteDepots)." },
    { beginn: "btVerwaltet.classList.toggle('aktiv', aktiveAnsicht === 'verwaltung');", ende: "btVerwaltet.classList.toggle('aktiv', aktiveAnsicht === 'verwaltung');",
      grund: "Derselbe UI-Ansichtsmodus wie oben (s. dortige Begründung), kein Bereichs-Bezug." },
    { beginn: `(aktiveAnsicht === 'verwaltung' ? ' aktiv' : '') + '" data-verwaltete-depots="1">`,
      ende: `(aktiveAnsicht === 'verwaltung' ? ' aktiv' : '') + '" data-verwaltete-depots="1">`,
      grund: "Derselbe UI-Ansichtsmodus (aktiveAnsicht === 'verwaltung'), kein Bereichs-Bezug -- s. Begründung oben." },
    { beginn: "aktiveAnsicht = 'verwaltung';", ende: "aktiveAnsicht = 'verwaltung';",
      grund: "Derselbe UI-Ansichtsmodus, kein Bereichs-Bezug -- s. Begründung oben." },
    { beginn: "if (aktiveAnsicht === 'verwaltung') { renderVerwalteteDepots(); return; }", ende: "if (aktiveAnsicht === 'verwaltung') { renderVerwalteteDepots(); return; }",
      grund: "Derselbe UI-Ansichtsmodus, kein Bereichs-Bezug -- s. Begründung oben." },
    { beginn: "return _identitaetLuecken(['name', 'geburtsdatum']).length === 0;",
      ende: "return _identitaetLuecken(['name', 'geburtsdatum']).length === 0;",
      grund: "`geburtsdatum` ist hier kein Kennungs-Zugriff, sondern der interne, frei gewählte Gruppierungs-Schlüssel von `_identitaetLuecken`/`vorhanden{}`/`LABEL{}` (dort als bare Objekt-Property, vom Wächter ohnehin nicht erfasst) -- der eigentliche Sektor-Feld-Zugriff im Funktionsrumpf (`id.birthDate`) ist bereits umgeschrieben, 14.09.2026 geprüft." },
    { beginn: "const BUERGERMODUL_BUENDEL = JSON.parse('", ende: "');",
      grund: "Eingebettetes Boot-Zeit-Bündel (ADR-310), bis 14.09.2026 fuer diesen Waechter unsichtbar (die Zeile war doppelquotiert, das Muster unten greift nur einfachquotiert -- s. Requote-Fix desselben Tages, tests/fixtures/buergermodul-buendel-varianten.js verlangt genau diese Form). Beim Sichtbarmachen gefunden UND SOFORT BEHOBEN: 72 stehengebliebene deutsche `quelle`/`feld`-Paare in `situationen` (10 Lebenslage-Blaetter) -- kern-load-geprueft, 0 unbekannt (14.09.2026). ZUSAETZLICH sichtbar geworden, NICHT behoben: dieselbe Klasse wie der bereits gemeldete, mit eigenem Auftrag versehene Fund 'Wizard-Korpora 66 stale Feld-Ids' (dokumente.{pvBmj,kiKorpus,vollmachtBmj} + weitere Assistenten-Schritte wie umzwiz/betreuwiz, `{sektor,feld:{id}}`-Form) -- gehoert in jenen Auftrag, nicht hierher gepatcht. Ganze Zeile ausgenommen statt einzeln, weil eine Positions-Ausnahme in einem einzigen ~200KB-JSON-Einzeiler nicht sinnvoll granular ist; der Waechter war vor dem Requote ohnehin blind fuer den gesamten Inhalt." },
    { beginn: "const XMELD_IDENTITAET_MAPPING = Object.freeze([", ende: "]);\nfunction _xmeldFelder(parsed)",
      grund: "`ziel` in dieser Tabelle ist keine Kennung, sondern der Name der lokalen JS-Variable, die `parseXMeld` beim Einlesen befuellt (`const nachname = …`, `const geburtsdatum = …`, s. Funktionsrumpf oben) -- `_ausMappingZurueck` liest `quelle[m.ziel]` gegen genau dieses Objekt (`{ vorname, nachname, geburtsname, geburtsdatum, geburtsort, nationalitaet, strasse, plz_ort, familienstand, ausweis_nr }`), das seine deutschen Variablennamen unveraendert traegt. `feld` in derselben Zeile IST die neue englische Kennung und wurde umgeschrieben. Ein frueherer automatisierter Durchlauf hatte `ziel` faelschlich mitgezogen und damit sechs von neun XMeld-Importfeldern (Nachname, Geburtsname, Geburtsdatum, Geburtsort, Staatsangehoerigkeit, Familienstand) stumm unbrauchbar gemacht -- `hasOwnProperty.call(quelle, m.ziel)` griff nie, der Eintrag wurde couragelos uebersprungen (real gefunden und behoben, 14.09.2026)." },
    /* DoD-2-Nachzug (23.09.2026, Schlussmessung auf d6a09060f: 12 Schluessel/45 Treffer).
       Alle folgenden Regionen wurden einzeln gegen die konsumierende Stelle gelesen (nicht
       vermutet) -- jede traegt eine eigene, unabhaengige Wertraum-/Namensraum-Begruendung wie
       die bereits bestehenden Eintraege oben, keine pauschale Ausnahme. */
    { beginn: "{ id: 'krisenvorsorge', klasse: 1, icon: 'package',       ziel: { lage: 'ausst-krisenvorsorge' } },",
      ende: "{ id: 'krisenvorsorge', klasse: 1, icon: 'package',       ziel: { lage: 'ausst-krisenvorsorge' } },",
      grund: "Kachel-Id der Startseite (BAUSTEINE), kein Bereichs-Bezug -- eigener Kopf-Kommentar direkt darueber: \"Gleiches Wort fuer Kachel und Bereich bewusst\" (11.08.2026 entschieden, s. dort). Die Kachel oeffnet ueber `ziel.lage` dieselbe Lebenslage-Maschine wie die uebrigen Kacheln -- kein Bereichs-Feld-Zugriff." },
    { beginn: "function parseXMeld(text) {", ende: "  return { vorname, nachname, geburtsname, geburtsdatum, geburtsort, nationalitaet, strasse, plz_ort, familienstand, ausweis_nr };\n}",
      grund: "Funktionsrumpf VOR der bereits ausgenommenen XMELD_IDENTITAET_MAPPING: liest die eigenen, deutschen Tag-Namen der externen XÖV/XMeld-Nachricht (`_xTief(person, 'geburtsname')`/`'geburtsdatum'`/`'geburtsort'`/`'familienstandsangabe'`/`'familienstand'` u.a.) -- das amtliche XÖV-Schema selbst benennt seine Elemente deutsch, keine Vivodepot-Kennung. Umbenennen wuerde den Parser gegen echte XMeld-Nachrichten brechen. Ganze Funktion ausgenommen statt einzeln, weil alle Tag-Reads derselben Quelle (die eingehende XML) und demselben Grund folgen." },
    /* Nicht ausgenommen: die Schluessellisten von personHinzufuegen/personAktualisieren und die Ids in
       MENSCHEN_REGISTER_FELD.unterFelder. Sie sind Property-Namen auf `data.menschen[]`, das ins Depot
       serialisiert wird -- Namen, also englisch (Schema 88, 23.09.2026). */
    { beginn: "const PERSONEN_SCHLUESSEL_ALT_ZU_NEU_88 = Object.freeze([", ende: "Object.freeze(['geburtsort', 'birthPlace']),\n]);",
      grund: "Alt->Neu-Tabelle der Stufe 87->88 (Personenregister): muss die alten Namen als Daten tragen, um Bestandsdepots umzuschreiben -- dieselbe Lage wie KENNUNG-MAPPING. Auch b16-Import und Textkennungs-Rueckweg lesen sie von hier, statt die alten Namen erneut zu nennen." },
    { beginn: "      kernGate: true, lueckenFelder: ['geburtsort', 'adresse', 'kontakt'], knopfAttr: 'vm-dokument', dateiBasis: 'Vollmacht',",
      ende: "      kernGate: true, lueckenFelder: ['geburtsort', 'adresse', 'kontakt'], knopfAttr: 'vm-dokument', dateiBasis: 'Vollmacht',",
      grund: "`lueckenFelder` wird wortwoertlich an `_identitaetLuecken`/`_identitaetLueckenHinweisHTML` gereicht -- `geburtsort` ist dort (wie `name`/`geburtsdatum` in der bereits ausgenommenen Zeile `_identitaetLuecken(['name', 'geburtsdatum'])` oben) ein interner, frei gewaehlter Gruppierungs-Schluessel der Funktion selbst (`vorhanden{}`/`LABEL{}`), nicht die Bereichs-Kennung -- der echte Feldzugriff im Funktionsrumpf laeuft bereits ueber `id.birthPlace`." },
    { beginn: "      kernGate: true, lueckenFelder: ['geburtsort', 'adresse', 'kontakt'], knopfAttr: 'bv-dokument', dateiBasis: 'Betreuungsverfuegung',",
      ende: "      kernGate: true, lueckenFelder: ['geburtsort', 'adresse', 'kontakt'], knopfAttr: 'bv-dokument', dateiBasis: 'Betreuungsverfuegung',",
      grund: "Zweite Fundstelle derselben `_identitaetLuecken`-Gruppierungs-Schluessel wie in der Vollmacht-Zeile direkt oberhalb, s. dortige Begruendung." },
    { beginn: "const INSTITUTION_ART = Object.freeze({", ende: "  'bank', 'versicherung', 'standesamt', 'meldebehoerde', 'behoerde', 'arbeitgeber',\n]);",
      nurMuster: /'[a-z][a-z0-9_]*'/g,
      grund: "INSTITUTION_ART + INSTITUTION_ART_EINGEBAUT (U2-ADR-142, 17.08.2026, s. der ausfuehrliche Kopf-Kommentar dort): zwoelf Institutions-ARTEN, ein bewusst geschlossener, bewusst deutscher Wertraum (\"Standesamt, Meldebehoerde, Pflegekasse sind deutsche Institutionen\") -- kein Bereichs-/Feld-Kennung, sondern der gespeicherte `art`-Wert auf `data.institutionen[]`. `nurMuster` maskiert nur die Kennwort-Literale der beiden Listen; der lange ADR-Kommentar dazwischen ist ohnehin schon durch die Kommentar-Maskierung unsichtbar." },
    { beginn: "const SITUATION_IDS_EINGEBAUT = Object.freeze([", ende: "  'pflegeheim', 'erbfall', 'todesfall-uebernahme',\n]);",
      grund: "Lebenslagen-Ids (SITUATIONEN) -- eigener, DURCHGAENGIG deutscher Namensraum, abweichend von den (englischen) BEREICH_IDS_EINGEBAUT/WIZARD_IDS_EINGEBAUT: kein Praezedenzfall, sondern der Gegenfall (geprueft 23.09.2026 -- alle zehn Werte 'geburt'/'volljaehrig'/'hauskauf'/'notar'/'arzt'/'einfach-so'/'krankenhaus'/'pflegeheim'/'erbfall'/'todesfall-uebernahme' sind deutsch, 34.8 gilt fuer diesen Namensraum faktisch nicht). `pflegeheim` ist hier eine Lebenslage, keine Bereichs-/Feld-Kennung." },
    { beginn: "  if (bereichFeldHatRolle(sektorId, feldId, 'familienstandFeld')\n      && _familienstandVorher && _familienstandVorher !== wert) {",
      ende: "    if (ehePersonId) ereignisMarkieren('familienstand', ehePersonId, new Date());",
      nurMuster: /ereignisMarkieren\('familienstand'/g,
      grund: "ereignisMarkieren('familienstand', …) -- `familienstand` ist hier die Ereignis-ART aus EREIGNIS_ARTEN (s. dortige, weiter unten ausgenommene Definition), nicht die Bereichs-Kennung. Erste von zwei textgleichen Fundstellen (sektorFeldSetzen); eigener Anker noetig, weil `indexOf` sonst nur die erste faende." },
    { beginn: "  const _fsFeld = geaendert.find(f => bereichFeldHatRolle(stempelNs, f, 'familienstandFeld'));",
      ende: "    if (ehePersonId) ereignisMarkieren('familienstand', ehePersonId, new Date());",
      nurMuster: /ereignisMarkieren\('familienstand'/g,
      grund: "Zweite, textgleiche Fundstelle von ereignisMarkieren('familienstand', …) (Bulk-Write-Pfad) -- derselbe Grund wie die erste oberhalb (sektorFeldSetzen), eigener Anker aus demselben Grund (Text-Duplikat)." },
    { beginn: "const EREIGNIS_ARTEN = Object.freeze(['familienstand', 'tod', 'betreuung', 'geburt']);",
      ende: "const EREIGNIS_ARTEN = Object.freeze(['familienstand', 'tod', 'betreuung', 'geburt']);",
      grund: "Die vier Ereignis-ARTEN selbst: ein eigener, unabhaengiger Wertraum (Trigger-Kategorien fuer die Vorsorge-Achse), keine Bereichs-Kennung -- strukturell derselbe Fall wie `art`/`wert` (s. WERT_SCHLUESSEL_OHNE_BEREICHSBEZUG oben), hier aber als Array-Elemente statt Objekt-Werte, darum eigene Ausnahme noetig." },
    { beginn: "const EREIGNIS_ACHSE_FELDER = Object.freeze([",
      ende: "  { sektorId: 'geburt', feldId: 'geburt_hebamme', situationsfeld: true, ausgenommen: 'Kontakt' },\n  { sektorId: 'erbfall', feldId: 'erb_notar', situationsfeld: true, ausgenommen: 'Kontakt' },\n]);",
      nurMuster: /ereignisse:\s*\[[^\]]*\]/g,
      grund: "`ereignisse: [...]`-Werte in dieser Tabelle sind Elemente aus EREIGNIS_ARTEN (s. dortige Begruendung direkt oberhalb), keine Bereichs-/Feld-Kennungen. `nurMuster` maskiert nur die `ereignisse`-Listen; `sektorId`/`feldId`/`unterFeldId` derselben Tabelle SIND Kennungen und bleiben geprueft (bis 23.09.2026 maskierte das Muster jedes einfachquotierte Literal der Tabelle, also auch diese)." },
    { beginn: "const EREIGNIS_ACHSE_ANGEDOCKT_STANDARD = Object.freeze(['familienstand', 'tod']);",
      ende: "const EREIGNIS_ACHSE_ANGEDOCKT_STANDARD = Object.freeze(['familienstand', 'tod']);",
      grund: "Dritte Fundstelle derselben EREIGNIS_ARTEN-Werte (Default-Andockung fuer Module), s. Begruendung bei EREIGNIS_ARTEN oberhalb." },
    { beginn: "function ereignisBetreuungsbeginnMarkieren(neueZeilenId, jetzt) {",
      ende: "    markiert.push(..._ereignisZeileMarkieren(zeile.id, 'betreuung', jetzt));",
      nurMuster: /'betreuung'/g,
      grund: "`'betreuung'` als Ereignis-ART (EREIGNIS_ARTEN, s. dortige Begruendung) -- Funktions-Name und -Kommentar (\"Betreuungsbeginn\") bestaetigen denselben Wertraum, kein Bereichs-Bezug." },
    { beginn: "  'finance.taxIdsTaxNumbers.taxNumber': 'steuerid',", ende: "  'finance.taxIdsTaxNumbers.taxNumber': 'steuerid',",
      grund: "PRUEFZIFFER_FELDER-Wert: `'steuerid'` ist hier die interne Pruefziffer-ART (wie `'iban'`/`'kvnr'`/`'rvnr'` in derselben Tabelle), gegen die `pruefzifferHinweis`/`pruefzifferArtFuer` per `art === …` vergleichen -- keine Bereichs-Kennung, derselbe Wertraum-Charakter wie `art`/`wert` oben, hier aber Objekt-WERT statt -Schluessel." },
    { beginn: "    : art === 'steuerid' ? _steueridPlausibel(wert)", ende: "    : art === 'steuerid' ? _steueridPlausibel(wert)",
      grund: "Zweite Fundstelle derselben Pruefziffer-ART `'steuerid'` (Vergleich in pruefzifferHinweis), s. Begruendung bei PRUEFZIFFER_FELDER oberhalb." },
    { beginn: "    + _erbscheinXmlFeld('familienstand', d.familienstand)", ende: "    + _erbscheinXmlFeld('familienstand', d.familienstand)",
      grund: "Erster Parameter von `_erbscheinXmlFeld(tag, wert)` ist ein selbstgewaehlter XML-Tag-Name fuer Vivodepots EIGENES, ausdruecklich nicht-amtliches Erbschein-Vorbereitungs-Exportformat (s. Kommentar direkt darueber: \"keine amtliche XJustiz-Konformitaet. Nicht an service.justiz.de uebermittelt.\") -- die Nachbar-Tags in derselben Funktion (`staatsangehoerigkeit`, `lebensmittelpunkt`, `grundeigentum`, `unternehmen`, `bankVerlangt`) sind ebenso deutsch und nicht Teil der Bereichs-Kennungen-Tabelle; `familienstand` faellt nur zufaellig mit der Bereichs-Kennung zusammen. Eigenes, von der Rename-Kampagne unabhaengiges Vokabular." },
    { beginn: "  const grundlageDefault = eintrag.basisOfRepresentation === 'betreuung' ? 'gesetzliche_betreuung'",
      ende: "  const grundlageDefault = eintrag.basisOfRepresentation === 'betreuung' ? 'gesetzliche_betreuung'",
      grund: "`'betreuung'` ist hier ein Schluessel aus RECHTSGRUNDLAGEN_VERTRETUNG (eigener, unabhaengiger Wertraum: vorsorge/bank/gesundheit/general/betreuung/…, s. dortige Objekt-Definition) -- derselbe Fall wie die bereits bestehende Ausnahme fuer `_instrumentVorhanden('enduring-power-of-attorney', 'vorsorge')` weiter oben, hier eine weitere, bisher nicht angankerte Fundstelle desselben Wertraums." },
  ],
  'vivodepot-template-generator.html': [
    { beginn: '/* BEREICHE:BEGIN', ende: '/* BEREICHE:END */',
      grund: 'Generierte Region (tools/build-bereiche.js) -- enthält BEREICH_ALT_LABEL, dieselbe eingefrorene Archiv-Kopie wie im Kern (s. dortige Begründung), sowie den frisch generierten, bereits korrekten Rest der Region.' },
  ],
  'vivodepot-lesen.html': [
    /* Kennungs-Umbau 15.09.2026 (Vorgabe: „die Lese-App muss alte Dateien öffnen"): dieselben zwei
       Sorten wie im Kern. Die eingebackene Region trägt die Alt→Neu-Tabelle samt Umschreib-Code
       (eine Quelle, s. tools/build-kennung-mapping-region.js); die Folds davor spiegeln die
       Kern-Stufen VOR 80→81 und arbeiten darum bewusst auf den deutschen Kennungen — genau wie
       `depotNormalisieren` im Kern, der hier mit derselben Begründung ausgenommen ist. */
    { beginn: '/* KENNUNG-MAPPING-LESEN:BEGIN', ende: '/* KENNUNG-MAPPING-LESEN:END */',
      grund: 'Alt→Neu-Tabelle + Umschreib-Code, wörtlich aus dem Kern erzeugt (s. dortige Begründung).' },
    { beginn: '// U2-ADR-064: read-only Fold der Vollmacht-Flachfelder',
      ende: '  if (liste.length) v.vorsorge_instrumente = liste;\n  delete v.vollmachten;\n}',
      grund: 'Lese-Spiegel der Kern-Stufen vor 80→81 (Flachfeld→Liste, KI-Ort, Slot→Liste): sie lesen und schreiben die Gestalt, die eine Datei an jener Stufe HATTE — deutsch. Danach läuft die Umschreibung.' },
    { beginn: 'function _foldVollmachtenLesenVorUmbau(obj) {', ende: '  _foldInstrumenteLesen(v);\n  return obj;\n}',
      grund: 'Derselbe Grund wie die Fold-Helfer darüber: die Vollmacht-Flachfelder existierten nur unter den alten Kennungen.' },
    { beginn: "const PERSONEN_SCHLUESSEL_ALT_ZU_NEU_88 = Object.freeze([", ende: "Object.freeze(['geburtsort', 'birthPlace']),\n]);",
      grund: "Dieselbe Alt->Neu-Tabelle wie die Stufe 87->88 im Kern: die Lese-App migriert nicht, sie liest alte und neue Namen des Personenregisters." },
    // krisenvorsorge-SEKTION-Id-Ausnahme GESTRICHEN (23.09.2026, zweiter Blick,
    // gegen Kanon d3dbe6082 gemessen): die Vergleichsbasis (BUERGERMODUL_BUENDEL.bereiche.
    // emergencyPreparedness.sektionen[0].id) ist null, weil dort keine Sektions-Id existiert,
    // nicht weil eine verlorenging -- 'emergencyPreparedness' kommt in
    // tools/buergermodul/vd-de-sprache.json gar nicht vor. 'krisenvorsorge' lebt im Kern in drei
    // anderen Rollen (Kachel-Id vivodepot.html:11852, Ausstattungs-Id vivodepot.html:11736,
    // alter Bereichsname), bewusst gleichlautend seit 11.08.2026 ("Gleiches Wort fuer Kachel und
    // Bereich bewusst") -- aber in keiner davon als Sektions-Id. Die Ausnahme schützte damit eine
    // Stelle, die es nie gab; gestrichen statt repariert.
    // UMBAU_RUECKSTAND (tests/paritaet-kern-lese.test.js, U2-ADR-096 Phase 2): 23 flache
    // Vorsorge-Altfelder, die der Kern beim Vorsorge-Umbau ENTFERNT hat. ANKER NACHGEZOGEN
    // (22.09.2026): die alte Feld-Literal-Zeile je Feld gibt es nicht mehr -- der SEKTOREN-Generator (17.09.2026) hat sie
    // ersetzt. Die sieben Feldnamen leben jetzt NICHT mehr im generierten Katalog, sondern in
    // `_foldVorsorgeWeitereInstrumenteLesen`/`_foldZvrUndVollmachtGateLesen` (Kennungs-Umbau
    // „Englisch vor v1", 15./17.09.2026): transiente Zwischen-Kennung beim Öffnen
    // einer VOR dem Umbau erzeugten Datei, danach von `_sektorenKennungenUmschreiben` umgeschrieben
    // -- derselbe Code/dieselbe Tabelle wie Kern-Stufe 80→81 (roter Beweis:
    // tests/lese-app-altdatei-kennungen.test.js). Kein Rückstand, sondern der Umbau selbst, beim
    // Arbeiten beobachtet. Fünf statt sieben Regionen: die neue Fassung gruppiert die Felder nach
    // `bau()`-Aufruf, nicht mehr einzeln je Feld-Literal -- inhaltlich sind weiterhin alle sieben
    // erfasst (s. je Region unten, welche der alten sieben sie abdeckt).
    { beginn: 'function _foldZvrUndVollmachtGateLesen(v) {',
      ende: '  delete v.zvr_nummer; delete v.vollmacht_vorhanden;\n}',
      grund: 'UMBAU_RUECKSTAND-Altfeld zvr_nummer (vormals eigenes Literal), s. Kopf-Kommentar oben.' },
    { beginn: "  bau('will', 'testament_vorhanden', {",
      ende: "    erbfolge_hinweis: 'erbfolge_hinweis', vermaechtnisse: 'vermaechtnisse',\n  });",
      grund: 'UMBAU_RUECKSTAND-Altfelder erbfolge_hinweis + vermaechtnisse (vormals zwei Literale), s. Kopf-Kommentar oben.' },
    { beginn: "  bau('living-will', 'patientenverf_vorhanden', {",
      ende: "    organspende: 'organspende', organspende_einschraenkung: 'organspende_einschraenkung',\n  });",
      grund: 'UMBAU_RUECKSTAND-Altfelder patientenverf_arzt + organspende + organspende_einschraenkung (vormals zwei Literale), s. Kopf-Kommentar oben.' },
    { beginn: "  bau('custodianship-declaration', 'betreuungsverfuegung', {",
      ende: "    betreuung_ausschluss: 'betreuung_ausschluss',\n  });",
      grund: 'Vier UMBAU_RUECKSTAND-Altfelder am Stück (betreuung_person/_ersatz/_wuensche/_ausschluss), s. Kopf-Kommentar oben.' },
    { beginn: "  bau('guardian-nomination', 'sorgerechtsverfuegung', {",
      ende: "    sorgerechtsverfuegung_wuensche: 'sorgerechtsverfuegung_wuensche',\n  });",
      grund: 'Drei UMBAU_RUECKSTAND-Altfelder am Stück (sorgerechtsverfuegung_person/_ersatz/_wuensche), s. Kopf-Kommentar oben.' },
  ],
});

/* ── Lebendigkeit der REGIONEN_AUSNAHMEN (22.09.2026, Fund beim DoD-2-Nachzug) ────────────────
   DER FUND: eine Region mit totem `beginn`/`ende`-Anker verschwindet LAUTLOS -- `roh.indexOf(...)`
   liefert -1, `dateiPruefen` überspringt die Region (`if (start < 0) continue;`) und prüft den
   betroffenen Text-Abschnitt WIEDER VOLL, ohne Fehler, ohne Meldung. Zwei solcher Anker (einer aus
   dieser Datei selbst, frisch gebaut; einer bereits bestehend, durch eine spätere Umbenennung
   `vertretung_art` → `basisOfRepresentation` verwaist) haben die gemeldete Fundstellen-Zahl von 18
   auf 12 verändert, OHNE dass sich eine Produktzeile geändert hätte -- die Zahl war eine
   Eigenschaft des ANKERS, nicht des Codes. Ebenso lautlos: ein `nurMuster`, das innerhalb seiner
   Region null Treffer hat, maskiert (potenziell absichtlich) nichts -- auch das fällt nie auf,
   solange niemand es misst.
   WAS DIESER WÄCHTER PRÜFT, für jede Region in `REGIONEN_AUSNAHMEN`: `beginn` UND `ende` müssen
   eine Stelle in der (injizierbaren) Datei finden; trägt die Region ein `nurMuster`, muss es
   INNERHALB der gefundenen Spanne mindestens einmal treffen. Ein Anker, der nichts findet, ist ROT
   -- nicht "Ausnahme überflüssig geworden", sondern "sie beschreibt einen Zustand, den es nicht
   mehr gibt" (dieselbe Unterscheidung wie bei einer veralteten Grundlinien-Begründung).
   `dateiTextLeser(datei)`: eine Funktion, die für den Dateinamen-Schlüssel aus `REGIONEN_AUSNAHMEN`
   den Dateiinhalt liefert (oder `null`, wenn nicht lesbar) -- Standardimplementierung liest ab
   REPO; Proben können eine erfundene Zuordnung injizieren, ohne Dateien anzulegen. */
/* REGIONEN_AUSNAHMEN trägt Dateinamen als Schlüssel (Basisname wie in `dateiPruefen`s Nachschlage-
   Reihenfolge `relPfad || basisname`) -- nicht jede Datei liegt am Repo-Root. Dieselbe kleine,
   bekannte Menge wie `ECHTE_DATEIEN` im Abnahme-Test (tests/englische-kennungen-pruefen.test.js). */
const BEKANNTE_DATEIORTE = Object.freeze({
  'bereiche-nativ-katalog-modul.json': 'tools/bereiche-nativ-katalog-modul.json',
});

function regionenAusnahmenLebendigkeit(regionenAusnahmen, dateiTextLeser) {
  const leser = dateiTextLeser || ((datei) => {
    const rel = BEKANNTE_DATEIORTE[datei] || datei;
    try { return fs.readFileSync(path.join(REPO, rel), 'utf8'); } catch (e) { return null; }
  });
  const befunde = [];
  for (const [datei, regionen] of Object.entries(regionenAusnahmen || {})) {
    const text = leser(datei);
    if (text == null) { befunde.push({ datei, index: null, beginn: null, fehler: 'Datei nicht lesbar' }); continue; }
    (regionen || []).forEach((region, index) => {
      const start = text.indexOf(region.beginn);
      if (start < 0) { befunde.push({ datei, index, beginn: region.beginn, fehler: '`beginn` nicht gefunden: ' + region.beginn.slice(0, 70) }); return; }
      const endeIdx = text.indexOf(region.ende, start);
      if (endeIdx < 0) { befunde.push({ datei, index, beginn: region.beginn, fehler: '`ende` nicht gefunden (nach `beginn`): ' + region.ende.slice(0, 70) }); return; }
      if (region.nurMuster) {
        const ende = endeIdx + region.ende.length;
        const spanne = text.slice(start, ende);
        const flags = region.nurMuster.flags.includes('g') ? region.nurMuster.flags : region.nurMuster.flags + 'g';
        const muster = new RegExp(region.nurMuster.source, flags);
        const treffer = spanne.match(muster);
        if (!treffer || !treffer.length) befunde.push({ datei, index, beginn: region.beginn, fehler: '`nurMuster` trifft 0 Zeilen innerhalb der Region — maskiert nichts' });
      }
    });
  }
  return befunde;
}

/* Ratsche über `regionenAusnahmenLebendigkeit`s Funde (22.09.2026): ein Gate, das beim Landen rot
   ist, blockiert die Suite für alle -- also dieselbe Bauform wie die übrigen Ratschen dieser Nacht.
   `grundlinie.tote_anker`: EINE Positivliste von NAMEN (`datei` + Anfang von `beginn`), nicht eine
   Zahl -- eine Obergrenze könnte man hineinwachsen lassen, in eine Namensliste nicht. Ein Fund, der
   NICHT in der Liste steht, ist NEU und rot. Ein Listen-Eintrag, zu dem KEIN Fund mehr passt, ist
   wieder lebendig geworden und MUSS aus der Liste -- sonst hielte sie einen Stand, den es nicht
   mehr gibt (dieselbe Regel wie bei jeder anderen Grundlinie hier). Der Abgleich verwendet
   `datei` + die ersten 40 Zeichen von `beginn` als stabilen Schlüssel (unabhängig vom `index`, der
   sich verschiebt, sobald jemand eine Region einfügt/entfernt). */
function regionenAusnahmenRatsche(grundlinie, befunde) {
  const schluessel = (b) => (b.datei || '') + ' ' + String(b.beginn || '').slice(0, 40);
  const eintraege = (grundlinie && grundlinie.tote_anker) || [];
  const bekannt = new Map(eintraege.map((e) => [(e.datei || '') + ' ' + String(e.beginn || '').slice(0, 40), e]));
  const gefunden = new Set(befunde.map(schluessel));
  const neu = befunde.filter((b) => !bekannt.has(schluessel(b)));
  const wiederLebendig = eintraege.filter((e) => !gefunden.has((e.datei || '') + ' ' + String(e.beginn || '').slice(0, 40)));
  return { neu, wiederLebendig, gueltig: neu.length === 0 && wiederLebendig.length === 0 };
}

function alteKennungenLesen(mappingPfad) {
  const zeilen = JSON.parse(fs.readFileSync(mappingPfad || MAPPING_PFAD, 'utf8'));
  return zeilen.map((z) => z.kennungAlt).filter(Boolean);
}

/* KEINE Funktions-Whitelist mehr (Korrektur, 14.09.2026): eine benannte Liste wie
   `feldDefFuer`/`renderSektor` meldet 0, sobald irgendeine ANDERE Funktion (real gefunden:
   `_feldDef('vorsorge', …)`, gar nicht in der ursprünglichen Liste) eine Bereichs-Id genauso
   bloss entgegennimmt — die Lücke ist unsichtbar, bis sie den Kern beim Laden zum Werfen bringt
   (real passiert, 14.09.2026). Der Wächter meldet darum JEDES quotierte Bereichs-Id-Literal im
   Code, unabhängig vom Aufruf-Kontext — Ausnahmen laufen über eine POSITIONSGENAUE, begründete
   Liste (unten), nie über einen Funktionsnamen.

   Dieselbe Stopliste/Mindestlänge wie das Umbenennungs-Werkzeug der Kampagne (kennungen-string-literale-umbenennen.js, nach der Landung entfernt, Stand bis c24fbb7f) — ein blosser
   Feld-/Unterfeld-Name ohne Bereichs-Präfix ist nur dann ein verlässliches Signal, wenn er GLOBAL
   EINDEUTIG (ein Ziel über die ganze Tabelle) UND nicht generisch-kurz ist. */
const STOPLISTE_BLOSSE_NAMEN = new Set(['wert', 'typ', 'text', 'hinweis', 'sonstiges', 'notiz', 'referenz', 'bank',
  'betrag', 'richtung', 'empfaenger', 'anmerkung', 'stelle', 'zusatz', 'fach', 'karte_gueltig',
  'notizen_start', 'bestellt_seit', 'ausgestellt']);

function zusatzMusterLesen(mappingPfad) {
  const zeilen = JSON.parse(fs.readFileSync(mappingPfad || MAPPING_PFAD, 'utf8'));
  const bereichAlt = [...new Set(zeilen.map((z) => z.bereichAlt).filter(Boolean))];
  const eindeutigeNamen = {};
  const konflikt = new Set();
  for (const z of zeilen) {
    if (!z.kennungAlt || !z.kennungNeu || !z.bereichAlt || !z.bereichNeu) continue;
    const lokalAlt = z.kennungAlt.slice(z.bereichAlt.length + 1);
    const lokalNeu = z.kennungNeu.slice(z.bereichNeu.length + 1);
    const alt = z.istUnterfeld ? lokalAlt.split('/')[1] : lokalAlt;
    const neu = z.istUnterfeld ? lokalNeu.split('/')[1] : lokalNeu;
    if (!alt || !neu || alt === neu) continue;
    if (eindeutigeNamen[alt] !== undefined && eindeutigeNamen[alt] !== neu) konflikt.add(alt);
    eindeutigeNamen[alt] = neu;
  }
  for (const k of konflikt) delete eindeutigeNamen[k];
  for (const k of Object.keys(eindeutigeNamen)) {
    if (STOPLISTE_BLOSSE_NAMEN.has(k) || k.length < 8) delete eindeutigeNamen[k];
  }
  return { bereichAlt, blosseNamen: Object.keys(eindeutigeNamen) };
}

/* Zwei Schlüssel tragen NIE eine Bereichs-Id, sondern einen eigenen, unabhängigen Wertraum, der
   zufällig dieselben Wörter benutzt -- real geprüft, nicht vermutet (14.09.2026):
   `art: 'vorsorge'|'gesundheit'|'bank'|…` ist der VOLLMACHT-UMFANG (Schema 47→48, „art=
   'gesundheit'/'general' waren nie eigene Instrumente, sondern UMFANG"), `wert: 'vorsorge'|
   'bildung'|…` sind Options-WERTE eines Auswahlfelds (z. B. `{wert:'bildung', label:'zu
   Bildungs- oder Dokumentationszwecken'}` — der Verwendungszweck einer digitalen Nachbildung,
   nichts mit dem Bereich Bildung zu tun). Ein strukturelles Ausschlussmuster (Schlüsselname),
   keine positionsgenaue Liste -- trägt für JEDEN Bereichsnamen an dieser Stelle, nicht nur die
   heute beobachteten. */
const WERT_SCHLUESSEL_OHNE_BEREICHSBEZUG = ['art', 'wert'];

/** JEDES quotierte Bereichs-Id-Literal im Code, unabhängig davon, in welchem Aufruf-Kontext
    es steht (kein Funktions-Whitelist, s. Kopf-Kommentar) -- ausser den beiden oben genannten,
    strukturell bereichsfremden Schlüsseln. */
function bloBereichsLiteralFinden(text, bereichAlt) {
  const funde = [];
  for (const b of bereichAlt) {
    const eb = b.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    for (const anf of ["'", '"']) {
      const ausschlussPraefix = WERT_SCHLUESSEL_OHNE_BEREICHSBEZUG
        .map((s) => '(?<!' + s + ':\\s{0,3})').join('');
      const re = new RegExp(ausschlussPraefix + anf + eb + anf, 'g');
      const t = text.match(re);
      if (t) funde.push({ schluessel: anf + b + anf, anzahl: t.length });
    }
  }
  return funde;
}

/** Blosse Feld-/Unterfeld-Namen als eigenständiges quotiertes Literal (kein Bereichs-Präfix
    davor) -- nur global eindeutige, ausreichend lange Namen, s. zusatzMusterLesen(). */
function blosseFeldnamenFinden(text, blosseNamen) {
  const funde = [];
  for (const alt of blosseNamen) {
    const e = alt.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp('[\'"]' + e + '[\'"]', 'g');
    const t = text.match(re);
    if (t) funde.push({ schluessel: "'" + alt + "'", anzahl: t.length });
  }
  return funde;
}

/* Ersetzt jedes Zeichen in [start,ende) durch ein Leerzeichen -- Zeilen-/Spalten-
   Zählung (für Fehlermeldungen anderer Werkzeuge) bleibt dadurch unverändert,
   Zeilenumbrüche werden bewusst NICHT überschrieben. */
function bereichLeeren(text, start, ende) {
  let out = text.slice(0, start);
  for (let i = start; i < ende; i++) out += text[i] === '\n' ? '\n' : ' ';
  return out + text.slice(ende);
}

/* Maskiert NUR `//…`- und `/*…*​/`-Kommentare -- String-Literale bleiben UNANGETASTET,
   denn genau dort steht der Grossteil der echten Verstösse (ein Objekt-Schlüssel wie
   `quelle: 'identitaet'` oder `'finanzen.steuerid.nr'` IST ein String-Literal; ihn zu
   maskieren würde den Wächter für genau die Fund-Klasse blind machen, die er finden soll
   -- gemessen an PRUEFZIFFER_FELDER/crossSektorAnmelden, real gefundenen Bugs). String-
   Grenzen werden trotzdem verfolgt (Zustand), damit ein `//` oder `/*` INNERHALB eines
   Strings nicht fälschlich als Kommentar-Beginn zählt. Ein simpler char-Scan statt Regex,
   weil diese Unterscheidung Zustand über die ganze Zeile hinweg braucht. */
function kommentareMaskieren(text) {
  let out = '';
  let i = 0;
  const n = text.length;
  while (i < n) {
    const c = text[i];
    const c2 = text[i + 1];
    if (c === '/' && c2 === '/') {
      let j = i;
      while (j < n && text[j] !== '\n') j++;
      out += text.slice(i, j).replace(/[^\n]/g, ' ');
      i = j;
      continue;
    }
    if (c === '/' && c2 === '*') {
      let j = i + 2;
      while (j < n && !(text[j] === '*' && text[j + 1] === '/')) j++;
      j = Math.min(j + 2, n);
      out += text.slice(i, j).replace(/[^\n]/g, ' ');
      i = j;
      continue;
    }
    if (c === "'" || c === '"' || c === '`') {
      const anfuehrer = c;
      let j = i + 1;
      /* `'` und `"` beginnen keinen mehrzeiligen String — nur der Backtick darf über Zeilen laufen. Ein Anführungszeichen,
         das in Wahrheit in einem Regex-Literal oder einem Apostroph steht (das der Scan nicht als solches erkennt), ließ
         den „String" sonst bis zum nächsten Anführungszeichen laufen und verschluckte dabei die Kommentare dazwischen
         (gemessen: ein vorsorge_instrumente-Treffer aus einem //-Kommentar in vivodepot.html). */
      while (j < n && text[j] !== anfuehrer && (anfuehrer === '`' || text[j] !== '\n')) { if (text[j] === '\\') j++; j++; }
      j = text[j] === anfuehrer ? Math.min(j + 1, n) : Math.min(j, n);
      out += text.slice(i, j); // String-Inhalt bleibt stehen -- s. Kopf-Kommentar
      i = j;
      continue;
    }
    out += c;
    i++;
  }
  return out;
}

/** Findet Vorkommen alter Kennungen in einem Text, wortgrenzen-bewusst
    (Kennungen können `.`/`/`/`_` enthalten, kein Wortzeichen im Sinne von \b). */
function altSchluesselFinden(text, alteSchluessel) {
  const funde = [];
  for (const alt of alteSchluessel) {
    const escaped = alt.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp('(?<![A-Za-z0-9_.\\/-])' + escaped + '(?![A-Za-z0-9_.\\/-])', 'g');
    const treffer = text.match(re);
    if (treffer) funde.push({ schluessel: alt, anzahl: treffer.length });
  }
  return funde;
}

function dateiPruefen(dateiPfad, alteSchluessel, ausnahmen, zusatzMuster) {
  const basisname = path.basename(dateiPfad);
  const relPfad = path.relative(REPO, dateiPfad);
  if ((ausnahmen || AUSNAHMEN)[relPfad] || (ausnahmen || AUSNAHMEN)[basisname]) {
    return { datei: dateiPfad, ausgenommen: true, grund: (ausnahmen || AUSNAHMEN)[relPfad] || (ausnahmen || AUSNAHMEN)[basisname], funde: [] };
  }
  const roh = fs.readFileSync(dateiPfad, 'utf8');
  const spannen = regionenSpannenFinden(roh, REGIONEN_AUSNAHMEN[relPfad] || REGIONEN_AUSNAHMEN[basisname] || [])
    .flatMap((r) => r.spannen);
  let text = kommentareMaskieren(roh);
  for (const [start, ende] of spannen) text = bereichLeeren(text, start, ende);
  return { datei: dateiPfad, ausgenommen: false, funde: fundeImText(text, alteSchluessel, zusatzMuster) };
}

function fundeImText(text, alteSchluessel, zusatzMuster) {
  let funde = altSchluesselFinden(text, alteSchluessel);
  if (zusatzMuster) {
    funde = funde
      .concat(bloBereichsLiteralFinden(text, zusatzMuster.bereichAlt))
      .concat(blosseFeldnamenFinden(text, zusatzMuster.blosseNamen));
  }
  return funde;
}

// Je Region die Zeichenspannen, die sie verdeckt (ohne `nurMuster` die ganze Region, sonst nur dessen Treffer darin).
// Marker-Suche GEGEN DEN ROHTEXT: die Marker stehen selbst in einem `/* … */`-Kommentar -- nach der
// Kommentar-Maskierung wären sie schon Leerzeichen und nie mehr auffindbar. Länge und Zeichenpositionen
// bleiben zwischen roh und maskiert identisch (Maskierung ersetzt Zeichen 1:1).
function regionenSpannenFinden(roh, regionen) {
  const out = [];
  for (const region of regionen) {
    const start = roh.indexOf(region.beginn);
    if (start < 0) continue;
    const endeIdx = roh.indexOf(region.ende, start);
    if (endeIdx < 0) continue;
    const ende = endeIdx + region.ende.length;
    const spannen = [];
    if (region.nurMuster) {
      const m = new RegExp(region.nurMuster.source, region.nurMuster.flags.includes('g') ? region.nurMuster.flags : region.nurMuster.flags + 'g');
      const stueck = roh.slice(start, ende);
      let x;
      while ((x = m.exec(stueck)) !== null) spannen.push([start + x.index, start + x.index + x[0].length]);
    } else {
      spannen.push([start, ende]);
    }
    out.push({ region, start, ende, spannen });
  }
  return out;
}

/* Was jede Region verdeckt (23.09.2026, DoD-Punkt 2): Zeilen von beginn bis ende und die alten Kennungen, die
   ohne sie ein Fund wären. Liefert „offen: N · ausgenommen: M" -- eine Null, die durch Ausnahmen entsteht,
   wird nie allein berichtet -- und macht die beginn/ende-Grenzen lesbar: greift eine Region nur, was ihr
   `grund` nennt? Aufruf: --datei <pfad> --regionen-spannen */
function regionenSpannenBericht(dateiPfad, alteSchluessel, zusatzMuster) {
  const basisname = path.basename(dateiPfad);
  const relPfad = path.relative(REPO, dateiPfad);
  const roh = fs.readFileSync(dateiPfad, 'utf8');
  const regionen = regionenSpannenFinden(roh, REGIONEN_AUSNAHMEN[relPfad] || REGIONEN_AUSNAHMEN[basisname] || []);
  const zeileVon = (i) => roh.slice(0, i).split('\n').length;
  const summe = (funde) => funde.reduce((n, f) => n + f.anzahl, 0);
  const maskiert = kommentareMaskieren(roh);
  const ohneRegionen = fundeImText(maskiert, alteSchluessel, zusatzMuster);
  let alle = maskiert;
  for (const r of regionen) for (const [a, b] of r.spannen) alle = bereichLeeren(alle, a, b);
  const offen = fundeImText(alle, alteSchluessel, zusatzMuster);
  const zeilen = regionen.map((r) => {
    // Nur der Text unter der Region, je Spanne eine eigene Zeile: was dort ein Fund wäre, verdeckt sie.
    const verdeckt = fundeImText(r.spannen.map(([a, b]) => maskiert.slice(a, b)).join('\n'), alteSchluessel, zusatzMuster);
    return { beginn: r.region.beginn.slice(0, 60), von: zeileVon(r.start), bis: zeileVon(r.ende), nurMuster: !!r.region.nurMuster, verdeckt };
  });
  return { datei: dateiPfad, offen: summe(offen), ausgenommen: summe(ohneRegionen) - summe(offen), regionen: zeilen };
}

function pruefe(dateiPfade, alteSchluessel, ausnahmen, zusatzMuster) {
  const ergebnisse = dateiPfade.map((d) => dateiPruefen(d, alteSchluessel, ausnahmen, zusatzMuster));
  const rot = ergebnisse.filter((e) => !e.ausgenommen && e.funde.length > 0);
  return { ergebnisse, gueltig: rot.length === 0, rot };
}

function bericht(ergebnis) {
  for (const e of ergebnis.ergebnisse) {
    if (e.ausgenommen) { console.log('  ' + e.datei + ': AUSGENOMMEN — ' + e.grund); continue; }
    if (!e.funde.length) { console.log('  ' + e.datei + ': OK'); continue; }
    console.log('  ' + e.datei + ': ABGELEHNT');
    for (const f of e.funde) console.log('    - "' + f.schluessel + '" × ' + f.anzahl);
  }
  console.log(ergebnis.gueltig ? 'Ergebnis: gültig — kein alter Schlüssel gefunden.'
    : 'Ergebnis: UNGÜLTIG — alte Schlüssel gefunden, s. o.');
}

/* ── Selbsttest gegen Fixtures ────────────────────────────────────────── */
function selbsttest() {
  const alt = ['bereich.altesFeld', 'bereich.zweitesAltesFeld'];
  const sauber = path.join(FIXTURES_ORDNER, 'sauber.js');
  const schmutzig = path.join(FIXTURES_ORDNER, 'schmutzig.js');
  const ausnahmeDatei = path.join(FIXTURES_ORDNER, 'migrationscode.js');

  const testAusnahmen = { 'migrationscode.js': 'Test-Fixture: simuliert den Migrationscode, der den alten Schlüssel nennen darf.' };

  const r1 = pruefe([sauber], alt, {});
  const r2 = pruefe([schmutzig], alt, {});
  const r3 = pruefe([ausnahmeDatei], alt, testAusnahmen);

  const ok1 = r1.gueltig === true;
  const ok2 = r2.gueltig === false && r2.rot.length === 1 && r2.rot[0].funde.some((f) => f.schluessel === 'bereich.altesFeld');
  const ok3 = r3.gueltig === true; // ausgenommen, obwohl der Schlüssel drinsteht

  console.log('[Selbsttest] saubere Fixture bleibt grün: ' + (ok1 ? 'OK' : 'FEHL'));
  console.log('[Selbsttest] schmutzige Fixture wird erkannt: ' + (ok2 ? 'OK' : 'FEHL'));
  console.log('[Selbsttest] Ausnahme-Datei bleibt trotz altem Schlüssel grün: ' + (ok3 ? 'OK' : 'FEHL'));

  const alleOk = ok1 && ok2 && ok3;
  console.log(alleOk ? 'Selbsttest: alle drei Proben wie erwartet.' : 'Selbsttest: FEHLGESCHLAGEN.');
  return alleOk;
}

/* ── CLI ──────────────────────────────────────────────────────────────── */
function main() {
  const argv = process.argv.slice(2);
  const dateien = [];
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--datei' && argv[i + 1]) { dateien.push(path.resolve(argv[i + 1])); i++; }
  }
  if (!dateien.length) {
    const ok = selbsttest();
    process.exit(ok ? 0 : 1);
  } else {
    const alt = alteKennungenLesen();
    const zusatzMuster = zusatzMusterLesen();
    if (argv.includes('--regionen-spannen')) {
      for (const d of dateien) {
        const b = regionenSpannenBericht(d, alt, zusatzMuster);
        console.log(b.datei + ' — offen: ' + b.offen + ' · ausgenommen: ' + b.ausgenommen);
        for (const r of b.regionen) {
          console.log('  Z. ' + r.von + '–' + r.bis + (r.nurMuster ? ' (nurMuster)' : '') + '  ' + JSON.stringify(r.beginn)
            + '  verdeckt: ' + (r.verdeckt.map((f) => f.schluessel + ' ×' + f.anzahl).join(', ') || '—'));
        }
      }
    }
    const ergebnis = pruefe(dateien, alt, AUSNAHMEN, zusatzMuster);
    bericht(ergebnis);
    process.exit(ergebnis.gueltig ? 0 : 1);
  }
}

if (require.main === module) main();
module.exports = {
  altSchluesselFinden, dateiPruefen, pruefe, alteKennungenLesen, AUSNAHMEN, MAPPING_PFAD, FIXTURES_ORDNER,
  zusatzMusterLesen, bloBereichsLiteralFinden, blosseFeldnamenFinden,
  REGIONEN_AUSNAHMEN, regionenAusnahmenLebendigkeit, regionenAusnahmenRatsche, regionenSpannenBericht,
};
