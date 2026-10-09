'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   Reisen-Registry — je Reise EIN Eintrag, dieselbe Form wie
   das Register aller Wächter und tests/fixtures/migrations-stufen.js
   (Schema-Sprünge): reine Daten, keine Logik. Die Logik liegt in
   tools/lib/reisen-kern.js und im Läufer der Reisen.

   Grundlage: „UX-Reisen automatisch protokollieren" (26.07.2026),
   Standard `cognitive-walkthrough-prozess-v1-28052026`, interner
   UX-Durchgangsplan vom 26.07.2026.

   REISE 1 ZUERST, ALLEIN (Auftrag §1). Die übrigen vier (Petra, Anja/VP,
   Thomas, Anja/Übergang) sind spätere Einträge in genau dieser Liste, kein
   Umbau — aber erst nach der Abnahme von Reise 1 durch die Produktverantwortung.

   Jeder Schritt ist entweder
     · eine Aktion: { id, titel, veraendernd, aktion(seite, htmlUrl) }
       `veraendernd: true` markiert Schritte, die etwas ändern/anlegen/
       löschen — nur DIESE müssen eine Rückmeldung zeigen (Auftrag §4).
     · ein Gerätepunkt: { id, titel, geraetepunkt: { grund } } — die Reise
       bricht dort ehrlich benannt ab, statt den Schritt still zu überspringen
       oder am Gerät vorbeizumessen (Auftrag §5).

   KEIN BYPASS (Auftrag §5): das Depot entsteht über den echten Anlege-Dialog
   (#tb-pw-hinweis → #id-vorname/#id-nachname/#id-pw/#id-pw2/#m-ok), denselben
   Weg, den depotEinrichten() der Prüfkampagnen-Steuerung und tests/e2e/helpers.js::
   depotAnlegen() bereits fahren — hier nur in einzelne Schritte aufgelöst,
   damit jeder für sich ein Protokoll-Eintrag wird, statt einer opaken
   Sammelfunktion.
   ════════════════════════════════════════════════════════════════════════════ */
const path = require('node:path');
const { einmalDialogeSchliessen, feldgruppenKartenOeffnen } = require('../tests/e2e/helpers.js');

const PW = 'Reise-2026!';

/* Unter dem Breakpoint liegt die Seitenleiste als Off-canvas-Drawer (#tb-menue öffnet
   ihn per Klasse `menue-auf` an #app) — ohne das ist `[data-sektor]` „outside of the
   viewport" (gemessen 02.08. bei 390px). Die Navigation selbst schließt den Drawer
   wieder (renderContent() → schliesseMenue()), das übernimmt hier niemand von Hand. */
/* `voroperationen` u. a. tragen `ebene: 'modul'` — liegen also, sobald ihre Sektion auch
   Kern-Felder hat, unter einem <details class="mehr-block">, geschlossen, solange nichts
   darin steht. Ein Klick auf ein Kind eines geschlossenen <details> trifft nichts (gemessen
   02.08. bei 390px: „element is not visible"). Erst das <summary> öffnen, wie eine Bürgerin. */
async function oeffneMehrBlockFuer(seite, feldId) {
  const block = seite.locator('details.mehr-block:has([data-feld-liste="' + feldId + '"])');
  if (!(await block.count())) return;
  const offen = await block.first().getAttribute('open');
  if (offen === null) await block.first().locator('summary').click({ timeout: 5000 });
}

async function oeffneSektorMobil(seite, sektorId) {
  const hamburger = seite.locator('#tb-menue');
  if (await hamburger.isVisible().catch(() => false)) {
    await hamburger.click({ timeout: 5000 });
    await seite.waitForSelector('#app.menue-auf', { timeout: 5000 });
  }
  // U2-ADR-171 (25.08.2026): der Bereichs-Knopf steckt seit heute in einem kollabierbaren
  // <details class="nav-gruppe"> — derselbe Fix wie in tests/e2e/helpers.js oeffneSektor().
  // Navigation A (05.10.2026): Umschalter „Alle Bereiche zeigen“ entfallen, die Cluster stehen direkt in der
  // Seitenleiste. Klick-Locator auf `#sidebar` verengt (wie tests/e2e/helpers.js oeffneSektor), damit die
  // Karten der Übersicht (auch `data-sektor`) nie treffen.
  const knopf = seite.locator('#sidebar [data-sektor="' + sektorId + '"]');
  const gruppe = seite.locator('details.nav-gruppe', { has: seite.locator('[data-sektor="' + sektorId + '"]') });
  if (await gruppe.count()) {
    const offen = await gruppe.evaluate((el) => el.open);
    if (!offen) await gruppe.locator('summary').click({ timeout: 5000 });
  }
  await knopf.click({ timeout: 5000 });
  await seite.waitForSelector('#content .bereich-kopf', { timeout: 5000 });
  // Statuskarten (Task B.1ff., 26.08.2026): dieselbe Öffnen-vor-Zugriff-Falle wie beim
  // nav-gruppe-Klick oben, eine Ebene tiefer — s. tests/e2e/helpers.js feldgruppenKartenOeffnen.
  await feldgruppenKartenOeffnen(seite);
}

/* Dasselbe Hamburger-Muster wie oeffneSektorMobil, für den Sidebar-Knopf „Für einen Anlass"
   (data-anlass-auswahl, öffnet erneut die Anlass-Auswahl-Kachelsicht) — Reise 5 braucht ihn, weil
   sie NACH dem Passwort-Setzen zum Erbfall-Blatt zurück muss (betreteApp() landet auf einem
   Sektor, nicht auf dem vorher offenen Situationsblatt). */
async function oeffneAnlassAuswahlMobil(seite) {
  const hamburger = seite.locator('#tb-menue');
  if (await hamburger.isVisible().catch(() => false)) {
    await hamburger.click({ timeout: 5000 });
    await seite.waitForSelector('#app.menue-auf', { timeout: 5000 });
  }
  await seite.click('[data-anlass-auswahl]', { timeout: 5000 });
}

/* CW-1 (24.08.2026): `erbfall` ist keine eigene Kachel mehr im Raster — die Kachelsicht
   zeigt die zusammengelegte „Ein Todesfall ist eingetreten"-Kachel (`data-anlass="todesfall"`),
   die eine Zwischenfrage öffnet (`waehleAnlass`, `ziel.zwischenfrage`). `erbfall` bleibt als Ziel
   hinter der Option „Ich kümmere mich um den Nachlass …" (`data-zwischenfrage-anlass="erbfall"`)
   erreichbar. Reise 5 muss darum über die Kachel „todesfall" gehen, nicht mehr direkt auf
   „erbfall" klicken — dieselbe Route, die eine echte Bürgerin heute geht. */
async function oeffneErbfallUeberZwischenfrage(seite) {
  await seite.click('[data-anlass="todesfall"]', { timeout: 5000 });
  await seite.waitForSelector('[data-zwischenfrage-anlass="erbfall"]', { state: 'visible', timeout: 10000 });
  await seite.click('[data-zwischenfrage-anlass="erbfall"]', { timeout: 5000 });
  await seite.waitForSelector('#content .bereich-kopf', { timeout: 5000 });
  // D.2 (Rest-Sichten, 26.08.2026): fünf der sieben Blöcke im erbfall-Blatt stecken seither
  // hinter `<details class="situation-block">` (renderSituation) — dieselbe Öffnen-vor-Zugriff-
  // Falle wie bei den Statuskarten (`feldgruppenKartenOeffnen`, jetzt auch für diese Klasse
  // erweitert). Ohne diesen Aufruf bleiben `erb_konten`/`erb_vertraege_kuendigen`/
  // `erb_zu_informieren` (S7-S9) unsichtbar für Playwright, egal ob echtes oder Vorschau-Depot.
  await feldgruppenKartenOeffnen(seite);
}

const REISE_1_MARLIES = {
  id: 'reise-1-marlies',
  persona: { name: 'Marlies', alter: 72, profil: 'Rentnerin, Erstnutzerin, kein technisches Vorwissen, iPhone' },
  ziel: 'Vivodepot anlegen und erstes Dokument eintragen',
  viewport: { width: 390, height: 844 },
  schritte: [
    {
      id: 'S0-landing',
      titel: 'Landing-Seite, Erststart',
      veraendernd: false,
      aktion: async (seite, htmlUrl) => {
        await seite.goto(htmlUrl);
        await seite.waitForSelector('#w-anlass', { state: 'visible', timeout: 15000 });
      },
    },
    {
      id: 'S1-einstieg-vorschau',
      titel: 'Klick „Hier anfangen — ohne festes Ziel"',
      veraendernd: false,
      aktion: async (seite) => {
        await seite.click('#w-anfangen', { timeout: 5000 });
        await seite.waitForSelector('#app.an', { state: 'attached', timeout: 10000 });
        await seite.waitForSelector('#tb-pw-hinweis', { state: 'visible', timeout: 10000 });
      },
    },
    {
      id: 'S2-anlege-dialog-oeffnen',
      titel: 'Klick auf den Passwort-Hinweis in der Kopfzeile',
      veraendernd: false,
      aktion: async (seite) => {
        await seite.click('#tb-pw-hinweis', { timeout: 5000 });
        await seite.waitForSelector('#id-pw', { state: 'visible', timeout: 5000 });
      },
    },
    {
      id: 'S3-depot-anlegen',
      titel: 'Name, Passwort eintragen, „Anlegen" bestätigen',
      veraendernd: true,
      aktion: async (seite) => {
        await seite.fill('#id-vorname', 'Marlies', { timeout: 5000 });
        await seite.fill('#id-nachname', 'Beispiel', { timeout: 5000 });
        await seite.fill('#id-pw', PW, { timeout: 5000 });
        await seite.fill('#id-pw2', PW, { timeout: 5000 });
        await seite.click('#m-ok', { timeout: 5000 });
        // PBKDF2-Ableitung — großzügige Frist, keine feste Wartezeit erraten.
        await seite.waitForSelector('#id-pw', { state: 'hidden', timeout: 20000 });
      },
      wartenMs: 500,
    },
    {
      id: 'S4-notfallblatt-angebot',
      titel: 'Einmal-Angebot nach dem Anlegen (Notfallblatt) — „Später" wählen',
      veraendernd: false,
      aktion: async (seite) => {
        // Robuster gemeinsamer Helfer statt eigener Kopie — U2-ADR-095, tests/e2e/helpers.js.
        await einmalDialogeSchliessen(seite);
      },
    },
    {
      id: 'S5-gesundheit-oeffnen',
      titel: 'Bereich „Gesundheit" über die Seitenleiste öffnen',
      veraendernd: false,
      aktion: async (seite) => { await oeffneSektorMobil(seite, 'health'); },
    },
    {
      // Zwei Schritte, kein zusammengesetzter (02.08. gemessen): eine Aktion, die INNERHALB
      // ihrer eigenen Ausführung einen Dialog öffnet UND wieder schließt, ist für die
      // Vorher/Nachher-Rückmeldungs-Erfassung unsichtbar — vor und nach dem GANZEN Schritt
      // war kein Dialog offen, der Unterschied dazwischen fällt durchs Raster. Getrennt wird
      // daraus zugleich echter Ertrag: der Dialog-Wortlaut selbst (Feldbeschriftungen der
      // Liste) wird ein eigener Protokoll-Eintrag statt unsichtbar zu bleiben.
      // Konvention „Hinzufügen“ (07.10.2026): bei leerer Liste steht der erste Eintrag mit seinen Beschriftungen direkt im Bereich
      // (eigener Namensraum data-eintrag-edit); der Wortlaut, den dieser Schritt festhält, ist derselbe wie vorher im Dialog.
      id: 'S6-liste-eintrag-dialog-oeffnen',
      titel: '„Operationen / Eingriffe" — der erste Eintrag steht im Bereich',
      veraendernd: false,
      aktion: async (seite) => {
        await oeffneMehrBlockFuer(seite, 'operationsProcedures');
        await seite.waitForSelector('[data-liste-inline="operationsProcedures"] [data-eintrag-edit="procedure"]', { state: 'visible', timeout: 5000 });
      },
    },
    {
      // Auftrag Reise-1-Inhalt-Korrektur (03.08.2026): dieser Schritt lässt den Eintrag jetzt
      // bewusst STEHEN — er ist Marlies' „erstes Dokument" (Persona-Zielsatz, Cognitive-
      // Walkthrough-Standard, bindend). Bis 03.08. folgten hier S8/S9 (Entfernen +
      // Rückfrage-Bestätigung) und löschten genau diesen Eintrag wieder — die Reise endete leer,
      // ein Konstruktionsfehler (derselbe Eintrag diente als Beleg für „Hinzufügen" UND als
      // Wegwerf-Material für „Rückfrage vor dem Löschen", ohne gegen den Zielsatz zu prüfen).
      // Die Rückfrage-vor-dem-Löschen-Prüfung (UX-Durchgang-Plan, „Neu seit Mai") ist damit aus
      // Reise 1 entfernt, nicht ersetzt — engere Lesung von „keine Löschung im selben Durchlauf".
      // Alternative (nicht gebaut): ein ZWEITER, eigens wegwerfbarer Eintrag für die
      // Rückfrage-Prüfung, während dieser hier stehen bleibt — eine Produktentscheidung, keine des Werkzeugs.
      id: 'S7-liste-eintrag-speichern',
      titel: 'Eingriff und Jahr eintragen, die Gruppe verlassen (der Eintrag entsteht)',
      veraendernd: true,
      aktion: async (seite) => {
        await seite.fill('[data-liste-inline="operationsProcedures"] [data-eintrag-edit="procedure"]', 'Blinddarm-Entfernung', { timeout: 5000 });
        await seite.fill('[data-liste-inline="operationsProcedures"] [data-eintrag-edit="year"]', '2008', { timeout: 5000 });
        await seite.evaluate(() => document.activeElement && document.activeElement.blur());
        await seite.waitForSelector('[data-feld-liste="operationsProcedures"] .liste-eintraege li', { timeout: 5000 });
      },
    },
    {
      id: 'S8-vorsorge-regal-oeffnen',
      titel: 'Bereich „Vorsorge & Recht" öffnen (Vorsorge-Regal)',
      veraendernd: false,
      aktion: async (seite) => { await oeffneSektorMobil(seite, 'advanceCare'); },
    },
    {
      id: 'S9-sperre-app-wechsel',
      titel: 'Sperre beim App-Wechsel (Politik A)',
      geraetepunkt: {
        grund: 'Echter Hintergrundwechsel (App verlassen und zurückkehren) lässt sich in einem ' +
          'headless-Playwright-Lauf über file:// nicht herstellen — das ist ein OS-Ereignis, kein ' +
          'DOM-Zustand. Braucht ein reales iOS-Gerät (interner UX-Durchgangsplan vom 26.07.2026, ' +
          '„Nur am Gerät").',
      },
    },
  ],
};

/* REISE 2 (Petra) — „Reise 2: Notfallkarte/QR-PDF-Pfad" (03.08.2026), Zug 1.
   Persona-Korrektur gegenüber dem Prozess-Standard vom 28.05.2026 (interner Nachtrag vom
   03.08.2026): „Notfall-Sicht ohne Passwort" ist seit U2-ADR-078 (12.07.2026) nicht mehr baubar — der
   passwortlose In-App-Zugang wurde ersatzlos gestrichen. Einziger heute realer passwortloser Weg
   ist die gedruckte Notfallkarte/QR-PDF (`flowNotfallkartePdf`, U2-ADR-097). Petra selbst — eine
   Fremde am Gerät einer Bürgerin — lässt sich nicht automatisiert fahren (kein DOM-Zustand für
   „eine andere Person hält die gedruckte Karte in der Hand"). Automatisiert geprüft wird darum der
   EIGENTÜMERINNEN-Weg: Akutdaten hinterlegen, die Notfall-Sicht öffnen (DOM-Protokoll,
   erfasseZustandBrowser deckt „Notfall-Sicht-Inhalt und -Reihenfolge",
   interner UX-Durchgangsplan vom 26.07.2026), dann die Notfallkarte als PDF herunterladen
   (`dateiExport`-Baustein, tools/lib/reisen-kern.js — kein DOM-Ertrag, ein echter Download).
   `voroperationen` bewusst NICHT befüllt: das Feld steht nicht in `NOTFALL_KERN_FELDER`
   (vivodepot.html) und hätte keinerlei Wirkung auf Notfall-Sicht oder Notfallkarte — nur
   `blutgruppe` befüllen, echte Akutdaten-Wirkung, ohne die fragile Chip-UI der codeListe-Felder
   (allergien/krankheiten) anzufassen. */
const REISE_2_PETRA = {
  id: 'reise-2-petra',
  persona: {
    name: 'Petra', alter: 38,
    profil: 'Sanitäterin, findet die gedruckte Notfallkarte eines fremden Gerätebesitzers, ' +
      'Zeitdruck. Automatisiert geprüft wird der Eigentümerinnen-Weg zur Karte, nicht Petras ' +
      'eigener Fund am fremden Gerät (kein DOM-Zustand dafür, s. Kopfkommentar).',
  },
  ziel: 'Akutdaten hinterlegen, Notfall-Sicht öffnen, Notfallkarte als PDF herunterladen — mit den richtigen Daten drauf',
  viewport: { width: 390, height: 844 },
  schritte: [
    {
      id: 'S0-landing',
      titel: 'Landing-Seite, Erststart',
      veraendernd: false,
      aktion: async (seite, htmlUrl) => {
        await seite.goto(htmlUrl);
        await seite.waitForSelector('#w-anlass', { state: 'visible', timeout: 15000 });
      },
    },
    {
      id: 'S1-einstieg-vorschau',
      titel: 'Klick „Hier anfangen — ohne festes Ziel"',
      veraendernd: false,
      aktion: async (seite) => {
        await seite.click('#w-anfangen', { timeout: 5000 });
        await seite.waitForSelector('#app.an', { state: 'attached', timeout: 10000 });
        await seite.waitForSelector('#tb-pw-hinweis', { state: 'visible', timeout: 10000 });
      },
    },
    {
      id: 'S2-anlege-dialog-oeffnen',
      titel: 'Klick auf den Passwort-Hinweis in der Kopfzeile',
      veraendernd: false,
      aktion: async (seite) => {
        await seite.click('#tb-pw-hinweis', { timeout: 5000 });
        await seite.waitForSelector('#id-pw', { state: 'visible', timeout: 5000 });
      },
    },
    {
      id: 'S3-depot-anlegen',
      titel: 'Name, Passwort eintragen, „Anlegen" bestätigen',
      veraendernd: true,
      aktion: async (seite) => {
        await seite.fill('#id-vorname', 'Petra', { timeout: 5000 });
        await seite.fill('#id-nachname', 'Beispiel', { timeout: 5000 });
        await seite.fill('#id-pw', PW, { timeout: 5000 });
        await seite.fill('#id-pw2', PW, { timeout: 5000 });
        await seite.click('#m-ok', { timeout: 5000 });
        // PBKDF2-Ableitung — großzügige Frist, keine feste Wartezeit erraten.
        await seite.waitForSelector('#id-pw', { state: 'hidden', timeout: 20000 });
      },
      wartenMs: 500,
    },
    {
      id: 'S4-notfallblatt-angebot',
      titel: 'Einmal-Angebot nach dem Anlegen (Notfallblatt) — „Später" wählen',
      veraendernd: false,
      aktion: async (seite) => {
        await einmalDialogeSchliessen(seite);
      },
    },
    {
      id: 'S5-gesundheit-oeffnen',
      titel: 'Bereich „Gesundheit" über die Seitenleiste öffnen',
      veraendernd: false,
      aktion: async (seite) => { await oeffneSektorMobil(seite, 'health'); },
    },
    {
      id: 'S6-blutgruppe-eintragen',
      titel: 'Blutgruppe eintragen (Akutdatum, speist die Notfall-Sicht)',
      veraendernd: true,
      aktion: async (seite) => {
        await seite.selectOption('[data-edit="bloodType"]', 'A+', { timeout: 5000 });
      },
      // Auftrag Sektorfeld-Autosave-Rückmeldung (03.08.2026): die aria-live-Ansage ist mit
      // 600ms entprellt (vivodepot.html, _feldAutosaveSignalisieren) — unter dem Standard-Wartezeit
      // (350ms) gemessen, sähe reiseAusfuehren die Rückmeldung nicht, weil sie noch gar nicht
      // angesagt wurde. 800ms liegt sicher darüber.
      wartenMs: 800,
    },
    {
      id: 'S7-notfall-sicht-oeffnen',
      titel: 'Notfall-Sicht über die Seitenleiste öffnen (Wortlaut + Reihenfolge, DOM-Protokoll)',
      veraendernd: false,
      aktion: async (seite) => {
        const hamburger = seite.locator('#tb-menue');
        if (await hamburger.isVisible().catch(() => false)) {
          await hamburger.click({ timeout: 5000 });
          await seite.waitForSelector('#app.menue-auf', { timeout: 5000 });
        }
        await seite.click('[data-notfall="1"]', { timeout: 5000 });
        await seite.waitForSelector('#n-karte', { state: 'visible', timeout: 10000 });
      },
    },
    {
      id: 'S8-notfallkarte-pdf',
      titel: 'Notfallkarte als PDF herunterladen',
      veraendernd: false,
      dateiExport: {
        dateinameMuster: /^Vivodepot_Notfallkarte\.pdf$/,
        mindestBytes: 2000,
        aktion: async (seite) => { await seite.click('#n-karte', { timeout: 5000 }); },
        bekannteFluechtigeWerte: async (seite) => {
          const meta = await seite.evaluate(() => window.__vdOeffentlich.notfallKartenMeta());
          return [meta.datum];
        },
      },
    },
  ],
};

/* REISE 3 (Anja) — Vertrauensperson, „fremdes Depot" (U2-ADR-062). Zug 0 (03.08.2026)
   korrigiert eine Annahme aus dem SP-Befund vom 01.08.2026: dort galt „kein Dateiauswahl-Dialog
   abfangbar" als methodische Grenze. Tatsächlich ist `#co-datei`
   (`vivodepot.html:15721`) ein simples `<input type="file">`, kein natives
   OS-Picker — Playwright bedient das über `setInputFiles()` ohne jede
   Dialog-Interzeption. Die eigentliche Lücke war nie der Dialog, sondern eine
   ECHTE Datei mit gesetztem Vertrauens-Passwort; die baut diese Reise selbst.

   ZWEI PHASEN, KEIN BYPASS. Phase 1 (S0–S11) ist NICHT Anjas eigene Handlung
   — sie steht für das, was ihre Mutter VORHER auf ihrem eigenen Gerät getan
   hat (eigenes Depot, Vertrauensperson einrichten, Datei sichern). Genau wie
   bei Reise 2 (Petras eigener Fund am fremden Gerät ist nicht automatisierbar,
   gemessen wird der Eigentümerinnen-Weg zur Karte) wird hier der
   Eigentümerinnen-Weg zur DATEI gemessen, nicht Anjas Herkunft der Datei.
   Phase 2 (S12–S15) ist Anjas eigene, gemessene Handlung: frisches Gerät
   (neuer `seite.goto`), „Als Angehörige öffnen", echte Datei + echtes
   Vertrauens-Passwort, ein Situationsblatt öffnen.

   INHALTS-MARKER STATT LEERES DEPOT: `blutgruppe` (Gesundheit) steht in der
   Fünf-Blatt-Allowlist des Blatts „Krankenhaus" (die Angehörigen-Blätter,
   `vivodepot.html:6494`, id `krankenhausakut`) — Anja muss ihn sehen.
   `steuerid` (Finanzen) steht in KEINEM Angehörigen-Blatt — er darf NICHT
   erscheinen. `blutgruppe` ist ein flacher Skalar; `steuerid` ist es seit
   Schnitt Glied 3 (22.08.2026, A448, U2-ADR-161) NICHT MEHR — er ist eine
   mehrwertige Liste geworden (Unterfelder `system`/`nr`), S8 trägt darum über
   den echten `listenEintrag`-Dialog ein (wie `konten.iban`, das schon vorher
   ein Listen-Unterfeld war) — dieselbe
   Kontrollfeld-Idee wie `tests/angehoerigen-blaetter-zuschnitt.test.js`, hier zum
   ersten Mal an der echten UI geprüft statt nur am Kern-API. Zusicherung
   dazu: Zusicherung Z9 im Regelwerk der Zusicherungen.

   DER SPEICHER-WEG (S0 + S10). Playwrights Chromium HAT `showSaveFilePicker`
   als Funktion (anders als z. B. auf `about:blank`) — aber der Aufruf
   scheitert headless IMMER mit `AbortError` (kein OS-Picker, keine Anzeige),
   und `_depotBlobSpeichern` behandelt das wie einen echten Nutzer-Abbruch:
   NICHTS wird gespeichert, ganz ohne Fehlermeldung (geprüft, 03.08.2026).
   S0 entfernt darum `window.showSaveFilePicker` per `addInitScript`, VOR dem
   ersten Laden — die App nimmt danach ihren eigenen, echten Nicht-FSA-Pfad
   (derselbe, den Safari/Firefox/ältere Chromium-Stände ohnehin gehen). Kein
   Bypass der App-Logik: nur eine Browser-Fähigkeit auf „nicht vorhanden"
   gesetzt, `hatDateiSpeichernPicker()` entscheidet mit ihrer eigenen, echten
   Prüfung weiter selbst.

   DECKUNGSGRENZE DIESES EINGRIFFS (Nachtrag der Produktverantwortung, 03.08.2026 spät): diese
   Reise prüft damit AUSSCHLIESSLICH den Nicht-FSA-Weg (`dateiAusgeben` /
   klassischer Blob-Download) — den Chromium-In-Place-Pfad über einen
   ECHTEN `showSaveFilePicker`-Dialog (Datei-Handle, `createWritable`,
   Überschreiben derselben Datei über mehrere Speicherungen hinweg) deckt
   sie NICHT ab. Der Pfad bleibt UNGEMESSEN, nicht „geprüft und grün" — ein
   nativer OS-Dialog lässt sich mit Playwright grundsätzlich nicht fernsteuern
   (dieselbe Geräte-Grenze wie Reise 1s `S9-sperre-app-wechsel`). Sollte der
   In-Place-Pfad je automatisiert geprüft werden müssen, braucht das ein
   anderes Werkzeug (z. B. OS-Ebene/CDP-Erweiterung), nicht diese Reise.

   `vertrauenspersonEinrichten()` (S10) ruft selbst `depotPersistieren()` auf,
   das auf `file://`-Herkunft (keine verlässliche IndexedDB dort) DIREKT
   `depotInDateiSichern()` nimmt — ein Download läuft darum schon INNERHALB
   von S10, mit Standard-Dateinamen, kein Dateiname-Dialog nötig (der gehört
   zum expliziten Knopf-Klick-Pfad, nicht zu `depotInDateiSichern()` selbst).
   Kein `dateiExport`-Baustein (der Mechanismus aus `reisen-kern.js` gibt den
   Datei-PFAD nicht nach aussen) — S10 fängt Klick und Download selbst per
   `Promise.all` und legt den Pfad in der Modul-Closure `_anjaGesicherteDatei`
   ab (S13 braucht ihn), NIE in `data`/im Protokoll selbst.

   NEBENWIRKUNG FÜR DEN UX-MITLAUF DER M1-MESSUNG (nicht Teil dieses Auftrags,
   hier nur benannt): `ALLE_QUELLEN` dort iteriert `REISEN` generisch — jede
   der 16 Schritte dieser Reise läuft künftig auch dort mehrfach (trunkierte
   Läufe), inklusive echter PBKDF2-Ableitung. Das macht `--alle` spürbar
   langsamer; keine Korrektheits-Frage, nur eine Laufzeit-Notiz für später. */
const VERTRAUENS_PW = 'Vertrauen-2026!';
let _anjaGesicherteDatei = null;   // Modul-Closure: Phase-1-Ausgabe → Phase-2-Eingabe, NIE im Protokoll

const REISE_3_ANJA = {
  id: 'reise-3-anja',
  persona: {
    name: 'Anja', alter: 51,
    profil: 'Vertrauensperson für ihre Mutter, eigenes Gerät, kein eigenes Depot. ' +
      'S0–S12 stehen für den vorherigen Eigentümerinnen-Weg (Mutter richtet ein, sichert ' +
      'die Datei) — automatisiert geprüft, weil Anjas eigener Erhalt der Datei kein DOM-' +
      'Zustand ist (analog Reise 2, Kopfkommentar). S13–S16 sind Anjas eigene Handlung.',
  },
  ziel: 'Patientenverfügung der Mutter lesen — als Vertrauensperson, mit echter Datei und echtem Vertrauens-Passwort',
  viewport: { width: 390, height: 844 },
  schritte: [
    {
      id: 'S0-landing',
      titel: 'Landing-Seite, Erststart (Mutters Gerät)',
      veraendernd: false,
      aktion: async (seite, htmlUrl) => {
        // Gemessen (03.08.2026): Playwrights Chromium HAT `window.showSaveFilePicker` als
        // Funktion (anders als z. B. auf about:blank), aber das Aufrufen scheitert headless
        // IMMER mit `AbortError` (kein OS-Picker, keine Anzeige) — `_depotBlobSpeichern`
        // behandelt AbortError als „Nutzerin hat abgebrochen" und speichert NICHTS, ganz ohne
        // Fehlermeldung. Das ist keine App-Lücke, sondern dieselbe Grenze wie bei jedem
        // nativen OS-Dialog, den kein Test-Framework fernsteuert. Der reale
        // Nicht-FSA-Fallback-Pfad (`dateiAusgeben`/Download) ist ECHTES, bereits gebautes
        // Produktverhalten für Safari/Firefox/ältere Chromium-Stände — kein Bypass der
        // App-Logik, nur eine Browser-Fähigkeit VOR dem ersten Laden auf „nicht vorhanden"
        // gesetzt, damit `hatDateiSpeichernPicker()` denselben Weg nimmt wie auf diesen
        // echten Plattformen.
        await seite.addInitScript(() => { try { delete window.showSaveFilePicker; } catch (_) { window.showSaveFilePicker = undefined; } });
        await seite.goto(htmlUrl);
        await seite.waitForSelector('#w-anlass', { state: 'visible', timeout: 15000 });
      },
    },
    {
      id: 'S1-einstieg-vorschau',
      titel: 'Klick „Hier anfangen — ohne festes Ziel"',
      veraendernd: false,
      aktion: async (seite) => {
        await seite.click('#w-anfangen', { timeout: 5000 });
        await seite.waitForSelector('#app.an', { state: 'attached', timeout: 10000 });
        await seite.waitForSelector('#tb-pw-hinweis', { state: 'visible', timeout: 10000 });
      },
    },
    {
      id: 'S2-anlege-dialog-oeffnen',
      titel: 'Klick auf den Passwort-Hinweis in der Kopfzeile',
      veraendernd: false,
      aktion: async (seite) => {
        await seite.click('#tb-pw-hinweis', { timeout: 5000 });
        await seite.waitForSelector('#id-pw', { state: 'visible', timeout: 5000 });
      },
    },
    {
      id: 'S3-depot-anlegen',
      titel: 'Mutters eigenes Depot anlegen',
      veraendernd: true,
      aktion: async (seite) => {
        await seite.fill('#id-vorname', 'Mutter', { timeout: 5000 });
        await seite.fill('#id-nachname', 'Beispiel', { timeout: 5000 });
        await seite.fill('#id-pw', PW, { timeout: 5000 });
        await seite.fill('#id-pw2', PW, { timeout: 5000 });
        await seite.click('#m-ok', { timeout: 5000 });
        // Zug 1 (Auftrag „Depot ist Datei", 08.08.2026): FSA ist oben (S0) bewusst abgeschaltet
        // — der Nicht-FSA-Weg fragte früher VOR dem Anlegen immer einmalig den Dateinamen
        // (derselbe Dialog wie zuvor erst beim laufenden Speichern).
        // GEÄNDERT („die pauschale file://-Flagge weicht der Probe",
        // 12.09.2026): U2-ADR-244 überspringt diesen Dialog bereits, sobald
        // internerSpeicherModus() true ist — vorher unter file:// nie der Fall, seit dem
        // Wegfall der pauschalen Flagge (echte IndexedDB funktioniert unter file:// gemessen,
        // s. Bericht sichern-je-browser-je-lauf-2026-09-12.md) kann das JETZT auch hier
        // eintreten. Beide Ausgänge sind also gültig — auf den zuerst eintreffenden warten,
        // statt einen davon als einzig möglichen anzunehmen.
        const dateiDialogErschien = await seite.waitForSelector('#datei-name', { state: 'visible', timeout: 5000 })
          .then(() => true).catch(() => false);
        if (dateiDialogErschien) await seite.click('#m-ok', { timeout: 5000 });
        await seite.waitForSelector('#id-pw', { state: 'hidden', timeout: 20000 });
      },
      wartenMs: 500,
    },
    {
      id: 'S4-notfallblatt-angebot',
      titel: 'Einmal-Angebot nach dem Anlegen (Notfallblatt) — „Später" wählen',
      veraendernd: false,
      aktion: async (seite) => { await einmalDialogeSchliessen(seite); },
    },
    {
      id: 'S5-gesundheit-oeffnen',
      titel: 'Bereich „Gesundheit" über die Seitenleiste öffnen',
      veraendernd: false,
      aktion: async (seite) => { await oeffneSektorMobil(seite, 'health'); },
    },
    {
      id: 'S6-blutgruppe-eintragen',
      titel: 'Blutgruppe eintragen (Allowlist-Feld — muss Anja später sichtbar sein)',
      veraendernd: true,
      aktion: async (seite) => { await seite.selectOption('[data-edit="bloodType"]', 'A+', { timeout: 5000 }); },
      wartenMs: 800,   // Autosave-Ansage entprellt bei 600ms, s. Reise-2-Kopfkommentar
    },
    {
      id: 'S7-finanzen-oeffnen',
      titel: 'Bereich „Finanzen & Zahlungen" über die Seitenleiste öffnen',
      veraendernd: false,
      aktion: async (seite) => { await oeffneSektorMobil(seite, 'finance'); },
    },
    {
      id: 'S8-steuerid-eintragen',
      titel: 'Steuer-ID eintragen (Master-Feld — darf Anja NIE sehen, in keinem Angehörigen-Blatt gelistet)',
      veraendernd: true,
      aktion: async (seite) => {
        /* F5 Zug 2 (21.08.2026): NICHT mehr „12 345 678 901" — das ist der eingebaute
           Platzhalter dieses Feldes und steht damit auf JEDER Seite, auch ohne einen Wert.
           Die Suche „steht der Wert irgendwo auf Anjas Seite" traf ihn und meldete ein Leck,
           das keines war. Ein Kontrollwert muss im Produkt sonst nirgends vorkommen.
           Schnitt Glied 3 (22.08.2026, A448, U2-ADR-161): `steuerid` ist eine Liste geworden —
           derselbe `listenEintrag`-Modal-Weg wie bei `konten.iban` (data-eintrag-hinzufuegen
           öffnet #modal-inhalt, die Unterfelder tragen dort data-edit=<unterfeldId>, #m-ok
           speichert). Das Unterfeld `nr` trägt den Wert, den Anja nie sehen darf. */
        // Konvention „Hinzufügen“ (07.10.2026): die leere Liste zeigt den ersten Eintrag im Bereich; er entsteht beim Verlassen.
        await seite.fill('[data-liste-inline="taxIdsTaxNumbers"] [data-eintrag-edit="taxNumber"]', '99 887 766 554', { timeout: 5000 });
        await seite.evaluate(() => document.activeElement && document.activeElement.blur());
        await seite.waitForSelector('[data-feld-liste="taxIdsTaxNumbers"] .liste-eintraege li', { timeout: 5000 });
      },
      wartenMs: 800,
    },
    {
      /* F5 Zug 2 (21.08.2026): S9–S15 sind vom Vertrauenspersonen-Weg auf den
         EMPFÄNGERKREIS-Weg umgeschrieben. Der Vertrauens-Zugang (U2-ADR-062) ist mit der
         Abschrift entfallen; Anja bekommt jetzt ein FACH in Mutters eigener Datei
         (U2-ADR-156), dessen Baustein „Notfall" aus demselben Blatt zieht.
         DIE ZUSAGE DIESER REISE IST UNVERÄNDERT — Blutgruppe sichtbar, Steuer-ID nie. Nur der
         Weg dorthin ist ein anderer. Das ist der Grund, warum die Reise umgeschrieben und nicht
         gestrichen wurde: sie belegt Z9 an der echten UI. */
      id: 'S9-einstellungen-oeffnen',
      titel: 'Einstellungen über das Zahnrad in der Kopfzeile öffnen',
      veraendernd: false,
      aktion: async (seite) => {
        await seite.click('#tb-einstellungen', { timeout: 5000 });
        /* D.4 (Rest-Sichten, 26.08.2026): Empfängerkreise liegt jetzt hinter <details>
           (Abschnitte kollabiert, kurzer Klartext-Status statt vollem Erklärsatz) — die
           summary muss einmal aufgeklappt werden, bevor „Personen hinzufügen" sichtbar wird.
           Danach bleibt der Abschnitt über die gesamte Reise offen: verdrahteEinstellungen()
           merkt sich offen/zu je Abschnitt (_einstOffenSchluessel), weil jede
           Empfängerkreis-Handlung flowEinstellungen() erneut aufruft und sonst den gerade
           benutzten Abschnitt bei jedem Schritt wieder zuklappen würde. */
        await seite.click('#modal-inhalt details:has(#einst-kreis-anlegen) > summary', { timeout: 5000 });
        await seite.waitForSelector('#einst-kreis-anlegen', { state: 'visible', timeout: 5000 });
      },
    },
    {
      id: 'S10a-kreis-anlegen',
      titel: 'Empfängerkreis „Anja" anlegen — Baustein „Notfall"',
      veraendernd: true,
      aktion: async (seite) => {
        await seite.click('#einst-kreis-anlegen', { timeout: 5000 });
        await seite.waitForSelector('#kreis-name', { state: 'visible', timeout: 5000 });
        await seite.fill('#kreis-name', 'Anja', { timeout: 5000 });
        await seite.check('#kreis-b-notfall', { timeout: 5000 });
        await seite.click('#m-ok', { timeout: 5000 });
        await seite.waitForSelector('[data-kreis-fach]', { state: 'visible', timeout: 10000 });
      },
      wartenMs: 500,
    },
    {
      /* GEMESSEN (03.08.2026, gilt unverändert): der Einrichten-Weg ruft selbst
         `depotPersistieren()`, das auf `file://`-Herkunft (keine verlässliche IndexedDB, s.
         `_istDateiHerkunft`) DIREKT `depotInDateiSichern()` nimmt — ganz ohne den „Jetzt als
         Datei sichern"-Knopf. Ein Klartext-Download läuft darum bereits INNERHALB dieses
         Schritts, mit einem Standard-Dateinamen. Kein `dateiExport`-Baustein (reisen-kern.js
         gibt den Pfad nicht nach aussen) — S13 braucht ihn roh, darum Download + Klick hier
         direkt per Promise.all. */
      id: 'S10-fach-einrichten',
      titel: '„Fach in meiner Datei" — Fach-Passwort + Ort setzen (sichert die Datei automatisch mit)',
      veraendernd: true,
      aktion: async (seite) => {
        await seite.click('[data-kreis-fach]', { timeout: 5000 });
        await seite.waitForSelector('#kreis-fach-pw', { state: 'visible', timeout: 5000 });
        await seite.fill('#kreis-fach-pw', VERTRAUENS_PW, { timeout: 5000 });
        await seite.fill('#kreis-fach-pw2', VERTRAUENS_PW, { timeout: 5000 });
        await seite.fill('#kreis-fach-ort', 'Tresor im Flur', { timeout: 5000 });
        const [download] = await Promise.all([
          seite.waitForEvent('download'),
          seite.click('#m-ok', { timeout: 5000 }),
        ]);
        _anjaGesicherteDatei = await download.path();
        /* Der Fach-Flow schliesst sein eigenes Sub-Modal und ruft danach SOFORT
           flowEinstellungen() wieder auf (Einstellungen-Modal neu gerendert, dieselbe
           #modal-rueck-Hülle bleibt „an"). Der Entfernen-Knopf des Fachs ist sichtbar =
           wir stehen wieder im aktualisierten Einstellungen-Modal, NICHT „geschlossen". */
        await seite.waitForSelector('[data-kreis-fach-weg]', { state: 'visible', timeout: 10000 });
      },
      wartenMs: 500,
    },
    {
      // Eigener Schritt, weil flowEinstellungen() ein ECHTES zweites Modal ist (ui.modal, Titel
      // „Einstellungen", primaerLabel „Schließen") — S10 schließt nur das Fach-Sub-Modal, dieses
      // hier schließt Einstellungen selbst. Ohne ihn bleibt #modal-rueck.an stehen und blockiert
      // jeden folgenden Klick im Hintergrund (gemessen: der nächste Schritt lief sonst in einen
      // Timeout, „<div class=modal> … intercepts pointer events").
      id: 'S11-einstellungen-schliessen',
      titel: 'Einstellungen-Modal schließen',
      veraendernd: false,
      aktion: async (seite) => {
        await seite.click('#m-ok', { timeout: 5000 });
        await seite.waitForSelector('#einst-kreis-anlegen', { state: 'hidden', timeout: 10000 });
      },
    },
    {
      id: 'S12-anja-eigenes-geraet',
      titel: 'Frisches Gerät (Anjas eigenes) — App neu geladen, keine Vorgeschichte',
      veraendernd: false,
      aktion: async (seite, htmlUrl) => {
        await seite.goto(htmlUrl);
        await seite.waitForSelector('#w-anlass', { state: 'visible', timeout: 15000 });
      },
    },
    {
      id: 'S13-datei-oeffnen',
      titel: 'Klick „Datei öffnen" auf der Landing-Seite — derselbe Weg wie für die Inhaberin',
      veraendernd: false,
      aktion: async (seite) => {
        await seite.click('#w-datei', { timeout: 5000 });
        await seite.waitForSelector('#co-datei', { state: 'visible', timeout: 5000 });
      },
    },
    {
      id: 'S14-datei-und-passwort-eingeben',
      titel: 'Mutters Datei auswählen, Ort-Hinweis lesen, Fach-Passwort eingeben, eintreten',
      veraendernd: false,
      aktion: async (seite) => {
        if (!_anjaGesicherteDatei) throw new Error('S14: keine gesicherte Datei aus S10 — Reise nicht ab S0 gelaufen?');
        await seite.setInputFiles('#co-datei', _anjaGesicherteDatei, { timeout: 5000 });
        /* F5 Zug 1 (21.08.2026): der Ort-Hinweis steht VOR der Passwort-Eingabe und ohne jede
           Ableitung. Hier ist er zum ersten Mal an der echten UI belegt — im REGULÄREN
           Anmeldeschirm, dem Ort, an dem ein Fach-Empfänger wirklich tippt. */
        await seite.waitForSelector('#co-ang-ort:not([hidden])', { timeout: 5000 });
        await seite.fill('#co-pw', VERTRAUENS_PW, { timeout: 5000 });
        await seite.click('#w-oeffnen', { timeout: 5000 });
        await seite.waitForSelector('#app.an', { state: 'attached', timeout: 15000 });
      },
      wartenMs: 500,
    },
    {
      id: 'S15-gesundheit-oeffnen',
      titel: 'Bereich „Gesundheit" öffnen — Blutgruppe lesen',
      veraendernd: false,
      aktion: async (seite) => {
        await oeffneSektorMobil(seite, 'health');
        await seite.waitForSelector('#content .bereich-kopf', { timeout: 5000 });
      },
    },
  ],
};

/* REISE 4 (Thomas) — Sub-Depot für Vater Heinrich (U2-ADR-003). Weg, Selektoren
   und Findings aus `cognitive-walkthrough-reise-4-thomas-20260801.md` (kein
   Drift laut ADR-Abgleich 03.08.) + `tests/e2e-cross/T-CROSS-13-sub-anlegen.spec.js`.

   EINE LÜCKE GEGENÜBER DEM CROSS-TEST: der füllt `#sub-grundlage` nicht —
   Thomas hat aber ausdrücklich eine Vollmacht („Vorsorgevollmacht"), das
   gehört für seine Persona in die Reise (S6 unten).

   ÜBER DEN URSPRÜNGLICHEN SP-BEFUND HINAUS (wie Reise 1/2 es tun): der Befund
   vom 01.08. stoppte bei „Versiegelt" — offen blieb „das erste tatsächliche
   Dokument-Eintragen im Sub-Depot" (GESAMT-Dokument). S7–S10 schließen das:
   entsiegeln, den Sub-Kontext betreten (`#tb-sub-name` zeigt „Geöffnet: Heinrich"
   neben der unveränderten Depot-Pille, Palettentausch Zug 2), ein echtes Feld
   eintragen. */
const SUB_PW = 'Sub-2026!';
const REISE_4_THOMAS = {
  id: 'reise-4-thomas',
  persona: { name: 'Thomas', alter: 48, profil: 'Sohn mit Vollmacht, legt Sub-Depot für Vater Heinrich an' },
  ziel: 'Sub-Depot anlegen, entsiegeln, erste Daten für Heinrich eintragen',
  viewport: { width: 390, height: 844 },
  schritte: [
    {
      id: 'S0-landing',
      titel: 'Landing-Seite, Erststart',
      veraendernd: false,
      aktion: async (seite, htmlUrl) => {
        await seite.goto(htmlUrl);
        await seite.waitForSelector('#w-anlass', { state: 'visible', timeout: 15000 });
      },
    },
    {
      id: 'S1-einstieg-vorschau',
      titel: 'Klick „Hier anfangen — ohne festes Ziel"',
      veraendernd: false,
      aktion: async (seite) => {
        await seite.click('#w-anfangen', { timeout: 5000 });
        await seite.waitForSelector('#app.an', { state: 'attached', timeout: 10000 });
        await seite.waitForSelector('#tb-pw-hinweis', { state: 'visible', timeout: 10000 });
      },
    },
    {
      id: 'S2-anlege-dialog-oeffnen',
      titel: 'Klick auf den Passwort-Hinweis in der Kopfzeile',
      veraendernd: false,
      aktion: async (seite) => {
        await seite.click('#tb-pw-hinweis', { timeout: 5000 });
        await seite.waitForSelector('#id-pw', { state: 'visible', timeout: 5000 });
      },
    },
    {
      id: 'S3-depot-anlegen',
      titel: 'Eigenes (Anker-)Depot anlegen',
      veraendernd: true,
      aktion: async (seite) => {
        await seite.fill('#id-vorname', 'Thomas', { timeout: 5000 });
        await seite.fill('#id-nachname', 'Beispiel', { timeout: 5000 });
        await seite.fill('#id-pw', PW, { timeout: 5000 });
        await seite.fill('#id-pw2', PW, { timeout: 5000 });
        await seite.click('#m-ok', { timeout: 5000 });
        await seite.waitForSelector('#id-pw', { state: 'hidden', timeout: 20000 });
      },
      wartenMs: 500,
    },
    {
      id: 'S4-notfallblatt-angebot',
      titel: 'Einmal-Angebot nach dem Anlegen (Notfallblatt) — „Später" wählen',
      veraendernd: false,
      aktion: async (seite) => { await einmalDialogeSchliessen(seite); },
    },
    {
      id: 'S5-verwaltete-depots-oeffnen',
      titel: 'Depot-Pille → Menü → „Depots, die ich aufbewahre" → „Neues Depot anlegen"',   // Zug 5 (Auftrag „Speicherweg ohne Datei-Picker", 09.08.2026): die Pille öffnet jetzt ein Menü statt direkt zu navigieren
      veraendernd: false,
      aktion: async (seite) => {
        await seite.click('#tb-depot-pille', { timeout: 5000 });
        await seite.waitForSelector('#tb-depot-menue-verwaltung', { state: 'visible', timeout: 5000 });
        await seite.click('#tb-depot-menue-verwaltung', { timeout: 5000 });
        await seite.waitForSelector('#sub-neu', { state: 'visible', timeout: 5000 });
        await seite.click('#sub-neu', { timeout: 5000 });
        await seite.waitForSelector('#id-vorname', { state: 'visible', timeout: 5000 });
      },
    },
    {
      id: 'S6-sub-depot-anlegen',
      titel: 'Heinrich, Grundlage „Vorsorgevollmacht", eigenes Sub-Passwort — „Anlegen"',
      veraendernd: true,
      aktion: async (seite) => {
        await seite.fill('#id-vorname', 'Heinrich', { timeout: 5000 });
        await seite.selectOption('#sub-grundlage', 'vorsorge', { timeout: 5000 });
        await seite.fill('#id-pw', SUB_PW, { timeout: 5000 });
        await seite.fill('#id-pw2', SUB_PW, { timeout: 5000 });
        await seite.click('#m-ok', { timeout: 5000 });
        await seite.waitForSelector('#id-vorname', { state: 'detached', timeout: 10000 });
      },
      wartenMs: 500,
    },
    {
      id: 'S7-sub-depot-entsiegeln',
      titel: '„Mit Passwort öffnen" — Heinrichs Sub-Depot entsiegeln',
      veraendernd: true,
      aktion: async (seite) => {
        await seite.click('[data-entsiegeln]', { timeout: 5000 });
        await seite.waitForSelector('#sub-auf', { state: 'visible', timeout: 5000 });
        await seite.fill('#sub-auf', SUB_PW, { timeout: 5000 });
        await seite.click('#m-ok', { timeout: 5000 });
        await seite.waitForSelector('[data-betreten]', { state: 'visible', timeout: 10000 });
      },
      wartenMs: 500,
    },
    {
      id: 'S8-sub-kontext-betreten',
      titel: 'Heinrichs Sub-Depot betreten („Geöffnet: Heinrich" neben der unveränderten Depot-Pille)',
      veraendernd: false,
      aktion: async (seite) => {
        await seite.click('[data-betreten]', { timeout: 5000 });
        // Palettentausch Zug 2 (04.08.2026): die Depot-Pille (#tb-depot-name) zeigt jetzt IMMER
        // „Mein Depot" — der Sub-Depot-Name steht separat daneben in #tb-sub-name.
        await seite.waitForSelector('#tb-sub-name >> text=Heinrich', { timeout: 10000 });
      },
    },
    {
      id: 'S9-gesundheit-oeffnen',
      titel: 'Bereich „Gesundheit" (in Heinrichs Sub-Depot) öffnen',
      veraendernd: false,
      aktion: async (seite) => { await oeffneSektorMobil(seite, 'health'); },
    },
    {
      id: 'S10-blutgruppe-eintragen',
      titel: 'Erstes echtes Feld für Heinrich eintragen (schließt die im GESAMT-Dokument offene Lücke)',
      veraendernd: true,
      aktion: async (seite) => { await seite.selectOption('[data-edit="bloodType"]', 'A+', { timeout: 5000 }); },
      wartenMs: 800,
    },
  ],
};

/* REISE 5 (Renate) — Vorsorge für den Erbfall, zu Lebzeiten (U2-ADR-062-fern, kein
   Vertrauenspersonen-Bezug). Grundlage: „Reise 5 — Vorsorge für den Todesfall,
   Situationsblatt und Erbe-Kurzübersicht" (03.08.2026) + Nachtrag nach Zug 0.

   ZUG-0-KORREKTUR AM AUFTRAG SELBST: der Auftrag nannte `todesfall-uebernahme` als Ziel-Blatt —
   das trägt null `erb_*`-Felder und keinen `erben`-Verweis, es ist ein reines Hinweisblatt für die
   ERBIN, die ein fremdes Depot übernimmt (Reise-3-Territorium). Die 23 `erb_*`-Felder und die
   „Erbe — Kurzübersicht" liegen im eigenständigen Blatt `erbfall` (`vivodepot.html:6112`) — das
   ist die vorsorgende Bürgerin zu Lebzeiten, per Nachtrag (03.08.) das bestätigte Ziel.

   PERSONA: P4 aus dem Testerrunde-Zuschnitt vom 28.07. („Vorsorge ohne Anlass"). Auflage aus dem
   Zuschnitt, nicht Farbgebung: „die einzige Einzelperson, niemand öffnet ihr die Tür, sie klickt
   selbst" — kein begleiteter Einstieg, kein vorbereitetes Depot. Reise beginnt darum auf der
   Startseite wie Reise 1/2/4, aber über `#w-anlass` statt `#w-anfangen` — DAS ist der Unterschied,
   der unten die Mechanik verkompliziert (nicht der Klick selbst, s. u.).

   GEMESSEN (03.08.2026, gegen den echten Quelltext, bevor gebaut wurde — s. Zug-0-Bericht):
   `#w-anlass` UND `#w-anfangen` laufen auf denselben Boden-Mechanismus hinaus —
   `vorschauDepotErzeugen()`, ein passwortloses, `_vorschau`-markiertes Depot ohne Sitzungs-Akteur.
   `Modus.darfBearbeiten()` verlangt zwingend einen Sitzungs-Akteur (`vivodepot.html:7421`) — in der
   Vorschau ist er `null`, jede Eintrags-Affordanz rendert read-only. Klickt Renate direkt auf die
   „Erbfall"-Kachel, sieht sie das Blatt also zunächst NUR LESEND (kein `data-edit="erb_*"` im DOM),
   weil `waehleAnlass()` den existierenden (Vorschau-)`data` NICHT durch `flowDepotAnlegen()`
   ersetzt (`!data` ist zu diesem Zeitpunkt bereits falsch). Erst der Topbar-Knopf `#tb-pw-hinweis`
   (sichtbar, solange `imVorschau()`) öffnet den echten Anlege-Dialog — danach `betreteApp()` landet
   auf einem SEKTOR, nicht wieder auf dem Erbfall-Blatt (kein „zurück zur vorherigen Ansicht"). S6
   navigiert darum bewusst ein zweites Mal über die Anlass-Auswahl zum selben Blatt, jetzt mit
   echtem, editierbarem Depot. Dieser Umweg ist keine Umgehung, sondern der einzige Weg, den die
   App für genau diesen Einstieg vorsieht — Zug-0-Bericht §0/Nachtrag-Recherche, nicht Annahme.

   DECKUNGSGRENZEN DIESER REISE, in den Kopf statt in den Bericht (Auftrags-Auflage, Muster wie
   Reise 3):
   · Von 23 `erb_*`-Feldern werden 3 gefüllt, über drei verschiedene Abschnitte (Konten &
     Vermögen, Verträge & laufende Zahlungen, Kontakte fürs Erbe) — absichtlich nicht erschöpfend,
     der Auftrag verlangt „mehrere … nicht nur einen Block", keine Vollzählung.
   · Für „Erbe — Kurzübersicht" (Feld `erben`, `refMehrfach`) deckt diese Reise NUR den
     Chip-Input-Neuanlage-Pfad ab (Namen tippen, Enter bestätigt über `personFindenOderAnlegen`) —
     NICHT den Auswahl-Pfad über einen Vorschlag aus der Live-Trefferliste
     (`vorschlaegeFuer()`/`waehleZeile()`). Beide Pfade schreiben strukturell gleich (dieselbe
     `{ref,override}`-Form), aber nur einer ist hier gemessen.
   · `erb_notar` (einziges `ref`-Feld unter den 23) wird nicht angefasst — dieselbe Widget-Klasse
     wie `erben`, hier nicht doppelt geprüft. */
const REISE_5_RENATE = {
  id: 'reise-5-renate',
  persona: { name: 'Renate', alter: 63, profil: 'Einzelperson ohne Anlass — will die eigene Vorsorge für den Erbfall endlich regeln, kein Türöffner' },
  ziel: 'Situationsblatt „Erbfall" ausfüllen, einen Erben eintragen, „Erbe — Kurzübersicht" danach prüfen',
  viewport: { width: 390, height: 844 },
  schritte: [
    {
      id: 'S0-landing',
      titel: 'Landing-Seite, Erststart',
      veraendernd: false,
      aktion: async (seite, htmlUrl) => {
        await seite.goto(htmlUrl);
        await seite.waitForSelector('#w-anlass', { state: 'visible', timeout: 15000 });
      },
    },
    {
      id: 'S1-anlass-auswahl-oeffnen',
      titel: 'Klick „Was bringt Sie heute hierher?" (kein „Hier anfangen" — Renate hat einen Anlass)',
      veraendernd: false,
      aktion: async (seite) => {
        await seite.click('#w-anlass', { timeout: 5000 });
        await seite.waitForSelector('[data-anlass="todesfall"]', { state: 'visible', timeout: 10000 });
      },
    },
    {
      id: 'S2-erbfall-blatt-vorschau',
      titel: 'Kachel „Ein Todesfall ist eingetreten" → Zwischenfrage → „Ich kümmere mich um den Nachlass" — Blatt öffnet sich zunächst nur lesend (passwortlose Vorschau)',
      veraendernd: false,
      aktion: async (seite) => {
        await oeffneErbfallUeberZwischenfrage(seite);
        await seite.waitForSelector('#content .bereich-kopf', { timeout: 5000 });
        await seite.waitForSelector('#tb-pw-hinweis', { state: 'visible', timeout: 5000 });
      },
    },
    {
      id: 'S3-depot-anlegen',
      titel: 'Passwort-Hinweis in der Kopfzeile — Name + Passwort setzen (macht das Depot real)',
      veraendernd: true,
      aktion: async (seite) => {
        await seite.click('#tb-pw-hinweis', { timeout: 5000 });
        await seite.waitForSelector('#id-pw', { state: 'visible', timeout: 5000 });
        await seite.fill('#id-vorname', 'Renate', { timeout: 5000 });
        await seite.fill('#id-nachname', 'Beispiel', { timeout: 5000 });
        await seite.fill('#id-pw', PW, { timeout: 5000 });
        await seite.fill('#id-pw2', PW, { timeout: 5000 });
        await seite.click('#m-ok', { timeout: 5000 });
        await seite.waitForSelector('#id-pw', { state: 'hidden', timeout: 20000 });
      },
      wartenMs: 500,
    },
    {
      id: 'S4-notfallblatt-angebot',
      titel: 'Einmal-Angebot nach dem Anlegen (Notfallblatt) — „Später" wählen',
      veraendernd: false,
      aktion: async (seite) => { await einmalDialogeSchliessen(seite); },
    },
    {
      id: 'S5-anlass-auswahl-erneut',
      titel: '„Für einen Anlass" in der Seitenleiste — zurück zur Kachelsicht (betreteApp landet sonst auf einem Sektor)',
      veraendernd: false,
      aktion: async (seite) => {
        await oeffneAnlassAuswahlMobil(seite);
        await seite.waitForSelector('[data-anlass="todesfall"]', { state: 'visible', timeout: 10000 });
      },
    },
    {
      id: 'S6-erbfall-blatt-real',
      titel: 'Kachel „Ein Todesfall ist eingetreten" → Zwischenfrage → Nachlass erneut — jetzt echtes Depot, Felder sind editierbar',
      veraendernd: false,
      aktion: async (seite) => {
        await oeffneErbfallUeberZwischenfrage(seite);
        await seite.waitForSelector('[data-edit="erb_konten"]', { state: 'visible', timeout: 10000 });
      },
    },
    {
      id: 'S7-konten-eintragen',
      titel: '„Konten & Vermögen" — Konten & Depots eintragen',
      veraendernd: true,
      aktion: async (seite) => {
        await seite.fill('[data-edit="erb_konten"]', 'Sparkasse Musterstadt, IBAN endet auf 4711', { timeout: 5000 });
        await seite.locator('[data-edit="erb_konten"]').blur();
      },
      wartenMs: 800,
    },
    {
      id: 'S8-vertraege-eintragen',
      titel: '„Verträge & laufende Zahlungen" — zu kündigende Verträge eintragen',
      veraendernd: true,
      aktion: async (seite) => {
        await seite.fill('[data-edit="erb_vertraege_kuendigen"]', 'Zeitschriften-Abo, Fitnessstudio', { timeout: 5000 });
        await seite.locator('[data-edit="erb_vertraege_kuendigen"]').blur();
      },
      wartenMs: 800,
    },
    {
      id: 'S9-kontakte-eintragen',
      titel: '„Kontakte fürs Erbe" — wer zu informieren ist eintragen',
      veraendernd: true,
      aktion: async (seite) => {
        await seite.fill('[data-edit="erb_zu_informieren"]', 'Steuerberater, Vermieter', { timeout: 5000 });
        await seite.locator('[data-edit="erb_zu_informieren"]').blur();
      },
      wartenMs: 800,
    },
    {
      id: 'S10-vorsorge-oeffnen',
      titel: 'Bereich „Vorsorge & Recht" über die Seitenleiste öffnen (trägt das Feld „Erben")',
      veraendernd: false,
      aktion: async (seite) => { await oeffneSektorMobil(seite, 'advanceCare'); },
    },
    {
      id: 'S11-erbe-eintragen',
      titel: 'Einen Erben eintragen (Chip-Input: Name tippen, Enter bestätigt)',
      veraendernd: true,
      aktion: async (seite) => {
        await seite.waitForSelector('[data-edit-refm-override="heirsBriefOverview"]', { state: 'visible', timeout: 5000 });
        await seite.fill('[data-edit-refm-override="heirsBriefOverview"]', 'Katrin Beispiel', { timeout: 5000 });
        await seite.press('[data-edit-refm-override="heirsBriefOverview"]', 'Enter', { timeout: 5000 });
      },
      wartenMs: 800,
    },
    {
      id: 'S12-anlass-auswahl-erneut',
      titel: '„Für einen Anlass" in der Seitenleiste — zurück zur Kachelsicht',
      veraendernd: false,
      aktion: async (seite) => {
        await oeffneAnlassAuswahlMobil(seite);
        await seite.waitForSelector('[data-anlass="todesfall"]', { state: 'visible', timeout: 10000 });
      },
    },
    {
      id: 'S13-erbfall-blatt-kurzuebersicht-pruefen',
      titel: 'Kachel „Ein Todesfall ist eingetreten" → Zwischenfrage → Nachlass ein drittes Mal — Zustand von „Erbe — Kurzübersicht" nach dem Eintrag erfassen',
      veraendernd: false,
      aktion: async (seite) => {
        await oeffneErbfallUeberZwischenfrage(seite);
        await seite.waitForSelector('#content .bereich-kopf', { timeout: 5000 });
      },
    },
  ],
};

const REISEN = [REISE_1_MARLIES, REISE_2_PETRA, REISE_3_ANJA, REISE_4_THOMAS, REISE_5_RENATE];

module.exports = { REISEN, PW, oeffneSektorMobil };
