'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   U2-ADR-313 — Der Produktabnahmebeweis, E4-Assistenten-Interaktion
   ────────────────────────────────────────────────────────────────────────────
   AUFTRAG (05.09.2026, nach U2-ADR-310/312): U2-ADR-310 (Node-Ebene) hat bewiesen,
   dass der Kern mit dem Bündel als Quelle bootet und mit leerem Bündel nicht abstürzt.
   U2-ADR-312 hat den Konstruktions-Absturz behoben, wenn SEKTOREN selbst leer ist. KEINE
   dieser Proben hat je einen echten Bildschirm gesehen — „der Kern bootet" ist nicht das
   Produktabnahmekriterium. Wörtlich: „Am Ende möchte ich 'mein' Bürgerdepot haben.
   Als wäre nichts gewesen." Ein Kern, der lädt und dann eine kaputte Oberfläche zeigt (toter
   Knopf, leere Liste, die wie ein Fehler aussieht), hat das Kriterium nicht erfüllt.

   Drei Proben, ECHTES DOM, ECHTER Klick, ECHTE Eingabe — nicht Ausgabe wie
   `geruest-umbau-helpers.js`, sondern Interaktion:

     1. Depot MIT Bündel — ein Assistent läuft durch: Optionsliste befüllt (die
        WIZARD-EIGENE, gefilterte Menge, nicht die volle native), Auswahl wirkt, der Wert
        landet im Depot. Vehikel: `heirwiz`/`familienstand` — der Katalogfall, den
        U2-ADR-311 gerade erst von seinem Schnappschuss befreit hat, direkt in Schritt 1
        erreichbar (kein `verborgenWennKeinVerweis`-Gate).
     2. `pvwiz` — eigener Durchlauf („es hatte als einziges einen eigenen Guard,
        es ist der Vorsorge-Assistent, der Weg, auf dem eine Bürgerin ihre Vorsorge
        zusammenstellt"). `pv_vollmacht_besprochen` wird erst sichtbar NACH einem echten
        Vorsorgevollmacht-Eintrag (`verborgenWennKeinVerweis`) — die Vorbedingung (eine
        Instrument-Zeile) wird injiziert (derselbe, bereits etablierte Weg wie
        `nachlese-f8-m1-zug4-abnahme.spec.js`s `bauteZeile` — orthogonal zum Gegenstand
        dieser Probe, der die BESPROCHEN-Option selbst ist, nicht das Anlegen der Zeile,
        das `pvwiz-instrument-zeile-abnahme.spec.js` bereits über echte Klicks abdeckt).
        Danach ECHTER Klick auf die Auswahl, ECHTER Wert im Depot.
     3. Depot OHNE Bündel — Gerüst leer: nichts bricht, und jeder Leseweg antwortet
        kulant statt zu werfen.
        NEU GESCHNITTEN am 06.09.2026 (U2-ADR-324) — die alte Fassung verlangte hier
        eine nicht-leere Optionsliste und öffnete dafür `identitaet`. Beides setzt einen
        BESTAND voraus, den es ohne Bündel nicht gibt; sie maß den nativen Bestand,
        getarnt als Robustheits-Zusicherung. Die Optionslisten-Aussage steht schärfer in
        Probe 1 und wurde hier ersatzlos gestrichen. Begründung am Test selbst.
     Gegenprobe — ein Katalogfeld aus dem Ab-Werk-Assistenten-Bestand weglassen:
        `heirwiz`s eigener Schritt muss sichtbar anders reagieren als der gesunde Fall,
        sonst hat Probe 1 keine Zähne.

   NACHTRAG (Auftrag, 19.09.2026, kritischer Pfad der L1-Landung): der Schnitt ist
   jetzt real gelandet — `BUERGERMODUL_BUENDEL` ist ein blankes `const … = null;`, keine
   `JSON.parse('…')`-Zeile mehr, an der `tests/fixtures/buergermodul-buendel-varianten.js`s
   `echtesBuendelLesen`/`ohneBuendel`/`mitBuendel`/`buendelOhneFeld` ansetzen könnten (Marker
   nicht mehr auffindbar, jeder Aufruf wirft). GEPRÜFT, nicht angenommen: die drei Assistenten-
   Interaktionen, die diese Datei beweisen soll, sind im additiven Modell weiterhin LEBENDIG —
   `heirwiz`/`maritalStatus` (samt der gefilterten `['verh','elp']`-Menge aus U2-ADR-311) steht
   heute in `tests/fixtures/buergermodul-wizards-ab-werk.json` (gebacken über
   `_wizardModulAbWerkSeed()`/`AB_WERK_WIZARD_QUELLEN`, denselben Weg wie die dreizehn
   nativen Bereiche über `tools/bereich-templates/*.json`); `pvwiz` war noch nie
   bündelbasiert (`WIZARD_BUENDEL_VERBOTENE_IDS = ['pvwiz','kiwiz']`, eigene Definition im
   Kern) — sein Feld heißt nach der Kennungs-Migration `contentOfTheAdvanceDirective`
   (vormals `pv_vollmacht_besprochen`, s. `KENNUNG_MAPPING`). U2-ADR-313 bleibt darum GÜLTIG,
   der Dateiname bleibt — nur die BÜNDEL-INJEKTION fällt weg:
     • Probe 1/2 („MIT Bündel") öffnen jetzt das echte, gebackene Standardprodukt
       (`KERN_URL`/`oeffneApp()`, wie jede andere E2E-Spec — kein Sonderpfad mehr nötig).
     • Probe 3 („OHNE Bündel") öffnet `KERN_URL_PRIVAT_DE_OHNE_BEREICHE` — das deutsche Produkt
       ohne seine Bereichs-Module. Bis S8 (U2-ADR-428) war das nackte Gerüst dieser Zustand; seither
       trägt es keinen Satz mehr und zeigt keinen Eingangsschirm. `bereicheAlle()` liefert dort `[]`, nicht mehr `['housing']`
       (Stufe-2-Zwischenstand, U2-ADR-398, ist mit dem vollständigen Schnitt selbst
       Geschichte: alle dreizehn, `housing` eingeschlossen, kommen jetzt gleichermaßen aus
       den Bereichs-Vorlagen, keine mehr „eingebaut ohne Bündel").
     • Die Gegenprobe braucht eine ECHTE Mutation am Ab-Werk-Assistenten-Bestand (nicht mehr
       am Bündel) — `_standardProduktBaken(html, { abWerkFixtureVerzeichnis })` (dasselbe,
       bislang ungenutzte Umbiege-Muster wie `opts.bereichTemplateVerzeichnis`,
       tools/lib/vier-produkte.js, 18.09.2026) bäckt gegen eine Wegwerf-Kopie von
       `tests/fixtures/buergermodul-{situationen,wizards}-ab-werk.json`, in der EIN Schritt
       fehlt — die echten, geteilten Dateien bleiben unangetastet.
   ════════════════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { test, expect } = require('@playwright/test');
const {
  oeffneApp, depotAnlegen, oeffneSektor, wizardStarten, KERN_URL_PRIVAT_DE_OHNE_BEREICHE,
} = require('./helpers');
const { _standardProduktBaken } = require('../load-kern.js');

// Das rohe Gerüst ist hier nur der Rohstoff, den `_standardProduktBaken` zum Produkt backt — ausdrücklich über den einen Roh-Leser (tools/lib/kern-lesen.js).
const { kernRohLesen } = require('../../tools/lib/kern-lesen.js');
const HTML_ECHT = kernRohLesen();

const KONSOLE_HARMLOS = /Content-Security-Policy|frame-ancestors/i;

let _variantenZaehler = 0;
function schreibeVariante(html) {
  const tmp = path.join(os.tmpdir(), 'vd-e4-wizard-variante-' + process.pid + '-' + (_variantenZaehler++) + '.html');
  fs.writeFileSync(tmp, html, 'utf8');
  return 'file://' + tmp;
}

/* Bäckt die Standardfassung gegen eine Wegwerf-Kopie von tools/bereich-templates/ (13
   Dateien — `opts.bereichTemplateVerzeichnis` biegt ALLE Bereichs-Vorlagenpfade auf einen
   einzigen Ordner um, s. tools/lib/vier-produkte.js, `modulDateienFuer`) — DIESELBE
   Mutations-Ebene wie die alte `buendelOhneFeld('identity','person','maritalStatus')`: das
   Katalogfeld `identity.maritalStatus` verschwindet aus dem BEREICH (nicht aus dem
   Assistenten-Schritt), genau wie im ursprünglichen Fund. `heirwiz`s eigener Schritt (aus
   der UNVERÄNDERTEN Wizard-Fixture) verlangt das Feld weiterhin — `_katalogOptionen` muss
   darum werfen, nicht der Wizard-Schritt selbst fehlen. */
const BEREICH_TEMPLATE_VERZEICHNIS = path.join(__dirname, '..', '..', 'tools', 'bereich-templates');
function identityOhneMaritalStatusBacken() {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'vd-e4-wizard-bereich-'));
  for (const datei of fs.readdirSync(BEREICH_TEMPLATE_VERZEICHNIS)) {
    fs.copyFileSync(path.join(BEREICH_TEMPLATE_VERZEICHNIS, datei), path.join(tempDir, datei));
  }
  const identityPfad = path.join(tempDir, 'vivodepot-identity.json');
  const identityDaten = JSON.parse(fs.readFileSync(identityPfad, 'utf8'));
  const personSektion = identityDaten.bereiche.identity.sektionen.find((s) => s.id === 'person');
  const vorher = personSektion.felder.length;
  personSektion.felder = personSektion.felder.filter((f) => f.id !== 'maritalStatus');
  if (personSektion.felder.length !== vorher - 1) {
    throw new Error('Gegenprobe: Feld identity.person.maritalStatus nicht gefunden/entfernt — Vorlage geändert?');
  }
  fs.writeFileSync(identityPfad, JSON.stringify(identityDaten, null, 1) + '\n', 'utf8');
  return _standardProduktBaken(HTML_ECHT, { bereichTemplateVerzeichnis: tempDir });
}

function konsoleFehlerSammeln(page) {
  const fehler = [];
  page.on('console', (m) => { if (m.type() === 'error' && !KONSOLE_HARMLOS.test(m.text())) fehler.push(m.text()); });
  return fehler;
}

/* ── Probe 1 ─────────────────────────────────────────────────────────────── */
test('[U2-ADR-313 · Probe 1] Depot MIT Bündel — heirwiz.familienstand: echte, gefilterte Optionsliste, echte Auswahl wirkt', async ({ page }) => {
  const fehler = konsoleFehlerSammeln(page);
  await oeffneApp(page);
  await depotAnlegen(page);
  await oeffneSektor(page, 'identity');
  await wizardStarten(page, 'heirwiz');

  await expect(page.locator('.wizard-frage')).toBeVisible();
  await expect(page.locator('#content')).toContainText('Schritt 1 von');

  // Die WIZARD-EIGENE, gefilterte Menge (['verh','elp']) — NICHT die volle native
  // Sechser-Liste des Sektorfeldes. Genau der Unterschied, den U2-ADR-311 vom
  // Auswertungszeit-Schnappschuss auf Lesezeit-Filterung umgestellt hat.
  const auswahl = page.locator('#content select[data-edit="maritalStatus"]');
  await expect(auswahl).toBeVisible();
  const werte = await auswahl.locator('option').evaluateAll((opts) => opts.map((o) => o.value).filter(Boolean));
  expect(werte.sort()).toEqual(['elp', 'verh']);

  // Echte Auswahl, echter Wert im Depot.
  await auswahl.selectOption('verh');
  await page.click('#wiz-weiter');
  await expect(page.locator('#content')).toContainText('Schritt 2 von');
  const wert = await page.evaluate(() => window.__vdOeffentlich.ankerDaten().sektoren.identity.maritalStatus);
  expect(wert).toBe('verh');

  expect(fehler, 'keine Konsolen-Fehler').toEqual([]);
});

/* ── Probe 2 — pvwiz, eigener Durchlauf ─────────────────────────────────── */
test('[U2-ADR-313 · Probe 2] pvwiz — pv_vollmacht_besprochen wird nach echtem Vorsorgevollmacht-Eintrag sichtbar, echte Auswahl wirkt', async ({ page }) => {
  const fehler = konsoleFehlerSammeln(page);
  await oeffneApp(page);
  await depotAnlegen(page);

  // Vorbedingung für `verborgenWennKeinVerweis` (unterfeld 'authorizedPersons'): eine
  // Vorsorgevollmacht-Zeile mit bevollmächtigter Person — derselbe injizierte Aufbau wie
  // `nachlese-f8-m1-zug4-abnahme.spec.js`s `bauteZeile`. Orthogonal zum Gegenstand dieser
  // Probe (die BESPROCHEN-Auswahl selbst); das Anlegen der Zeile über echte Klicks deckt
  // `pvwiz-instrument-zeile-abnahme.spec.js` bereits ab.
  await page.evaluate(() => {
    window.__vdOeffentlich.ankerDaten().sektoren.advanceCare = Object.assign({}, window.__vdOeffentlich.ankerDaten().sektoren.advanceCare, {
      provisionInstruments: [{ id: 'e2e-adr313', instrument: 'enduring-power-of-attorney',
        authorizedPersons: [{ override: 'Max Mustermann' }] }],
    });
  });

  await oeffneSektor(page, 'advanceCare');
  await wizardStarten(page, 'pvwiz');
  await expect(page.locator('.wizard-frage')).toBeVisible();

  // Durch die Schritte klicken, bis die besprochen-Auswahl sichtbar ist oder der Assistent
  // fertig ist — derselbe Klick-durch-Stil wie `pvwiz-instrument-zeile-abnahme.spec.js`.
  let sicherung = 0;
  let gefunden = false;
  while (sicherung++ < 60) {
    const situationen = page.locator('#content button[data-edit-multi="applicableSituations"]').first();
    if (await situationen.count() && await situationen.isVisible()) await situationen.click();
    const besprochen = page.locator('#content select[data-edit="contentOfTheAdvanceDirective"]');
    if (await besprochen.count()) { gefunden = true; break; }
    const text = (await page.locator('#wiz-weiter').textContent() || '').trim();
    await page.click('#wiz-weiter');
    if (/fertig/i.test(text)) break;
  }
  expect(gefunden, 'der besprochen-Schritt muss mit einer echten Vorsorgevollmacht-Zeile sichtbar werden — sonst greift verborgenWennKeinVerweis fälschlich').toBe(true);

  const auswahl = page.locator('#content select[data-edit="contentOfTheAdvanceDirective"]');
  const werte = await auswahl.locator('option').evaluateAll((opts) => opts.map((o) => o.value).filter(Boolean));
  expect(werte.sort()).toEqual(['ja', 'nein']);
  await auswahl.selectOption('ja');
  await page.click('#wiz-weiter');

  const wert = await page.evaluate(() => window.__vdOeffentlich.ankerDaten().sektoren.advanceCare.contentOfTheAdvanceDirective);
  expect(wert).toBe('ja');

  expect(fehler, 'keine Konsolen-Fehler').toEqual([]);
});

/* ── Probe 3 — Depot ohne Bündel: leer, aber bedienbar ──────────────────── */
/* ── Probe 3 — NEU GESCHNITTEN (U2-ADR-324, 06.09.2026) ───────────────────
   DIE ALTE PROBE MASS DEN NATIVEN BESTAND, GETARNT ALS ROBUSTHEITS-ZUSICHERUNG.
   Sie hiess „der Assistent startet trotzdem, echte Frage, echte (nicht-leere)
   Optionsliste" und oeffnete dafuer den Bereich `identitaet`. Beides setzt einen
   BESTAND voraus — in einer Variante OHNE Buendel gibt es weder den Bereich noch
   ein Katalogfeld, aus dem Optionen kaemen. Solange die dreizehn Bereiche nativ in
   der Datei standen, fiel das nicht auf: die Substitution leerte `BUERGERMODUL_
   BUENDEL`, nicht `SEKTOREN`. Mit U2-ADR-320 verliess der native Bestand die Datei
   — und die Probe fiel, nicht weil etwas kaputtging, sondern weil sie nie das
   geprueft hatte, was ihr Name sagte.

   DIE KLASSE, NICHT NUR DIE AENDERUNG: eine Probe, die eine Zusicherung im Titel
   traegt und im Rumpf etwas anderes misst, ist gruen aus dem falschen Grund.
   Sie faellt erst auf, wenn das Fremde unter ihr weggezogen wird.

   WAS BLEIBT UND WAS GEHT. Die Aussage „nicht-leere Optionsliste" gehoert an einen
   Ort mit Bestand — und dort steht sie bereits: PROBE 1 prueft sie schaerfer, als
   diese es je tat (`werte.sort()` gegen die erwartete gefilterte Menge, nicht bloss
   `length > 0`). Sie wird hier darum ERSATZLOS gestrichen, nicht umgezogen.

   WAS AN IHRE STELLE TRITT, ist wahr, pruefbar und auf Node-Ebene vorgemessen:
   ohne Buendel bricht nichts, und jeder Leseweg antwortet kulant statt zu werfen.
   Vier Aussagen, die die alte Probe nie gemacht hat. */

/* Faehrt die Lesewege im Seitenkontext und meldet je Weg ENTWEDER seinen Wert ODER
   seinen Wurf — ein Wurf beendet die Messung nicht, er ist ihr Gegenstand. Ohne
   diese Form waere ein werfender Leseweg ein Testabbruch statt eines Befundes, und
   die Meldung sagte nicht, WELCHER Weg warf. */
async function lesewegeMessen(page) {
  return page.evaluate(() => {
    const wege = {
      // NICHT MEHR `.length` allein (Auftrag „Vier rote E2E nach Stufe 2",
      // 09.09.2026, seither überholt vom vollen Schnitt 19.09.2026): die IDs sagen, WELCHE
      // Bereiche überleben, nicht nur wie viele — auf dem nackten Gerüst heute keine.
      'bereicheAlle': () => window.__vdOeffentlich.bereicheAlle().map((s) => s.id).sort(),
      '_katalogOptionen': () => window.__vdOeffentlich._katalogOptionen('identity', 'maritalStatus').length,
      '_katalogOptionenFremd': () => window.__vdOeffentlich._katalogOptionen('kein-bereich-dieses-namens', 'x').length,
      'textsatzNeuAnwenden': () => window.__vdOeffentlich.textsatzNeuAnwenden(),
      'buendelBericht': () => ({
        angewandt: window.__vdOeffentlich._BUERGERMODUL_BUENDEL_BERICHT.angewandt,
        grund: window.__vdOeffentlich._BUERGERMODUL_BUENDEL_BERICHT.grund,
        bereiche: window.__vdOeffentlich._BUERGERMODUL_BUENDEL_BERICHT.bereiche,
        dokumente: window.__vdOeffentlich._BUERGERMODUL_BUENDEL_BERICHT.dokumente,
      }),
    };
    const erg = {};
    for (const [name, f] of Object.entries(wege)) {
      try { erg[name] = { wert: f() }; } catch (e) { erg[name] = { wurf: String(e && e.message || e) }; }
    }
    return erg;
  });
}

test('[U2-ADR-313 · Probe 3] Depot OHNE Bündel — nichts bricht, und jeder Leseweg antwortet kulant', async ({ page }) => {
  const fehler = konsoleFehlerSammeln(page);
  const seitenFehler = [];
  page.on('pageerror', (e) => seitenFehler.push(String(e && e.message || e)));

  await oeffneApp(page, { url: KERN_URL_PRIVAT_DE_OHNE_BEREICHE });
  await depotAnlegen(page);

  const wege = await lesewegeMessen(page);

  /* ZUERST: hat ueberhaupt ein Weg geantwortet? Eine Messung, in der jeder Aufruf
     wirft, saehe sonst in den Einzelproben unten aus wie eine Messung, die nichts
     zu beanstanden hat — dieselbe Falle wie eine Probe, die nichts findet. */
  const gewoerfen = Object.entries(wege).filter(([, r]) => r.wurf);
  expect(gewoerfen.map(([n, r]) => n + ': ' + r.wurf),
    'ohne Bündel darf kein Leseweg werfen — die Bürgerin bekäme sonst eine tote Oberfläche').toEqual([]);

  /* Und dann: die Antworten selbst. NEU GESCHNITTEN (Auftrag, 19.09.2026, voller
     Schnitt gelandet): die Stufe-2-Zwischenlage (U2-ADR-398, „housing bleibt ohne Bündel,
     weil es ab Werk in der Registry sitzt") ist selbst Geschichte — seit BUERGERMODUL_BUENDEL
     bedingungslos `null` ist und alle dreizehn nativen Bereiche gleichermaßen aus
     `tools/bereich-templates/*.json` kommen, bleibt auf der ROHEN, ungebackenen Datei KEIN
     Bereich mehr übrig — leer, nicht `['housing']`. */
  expect(wege.bereicheAlle.wert, 'ohne Bündel UND ohne Backen bleibt kein Bereich übrig — das nackte Gerüst')
    .toEqual([]);
  /* NEU GEMESSEN (19.09.2026, nach dem Katalog-Schnitt): `_katalogOptionen` fragt den KATALOG, nicht die
     Anzeige (K3, 16.09.). Der Katalog kennt seit der vierten Quelle in `_sektorAusKatalog`
     (`BEREICHE_NATIV_KATALOG`, produktunabhängig, alle dreizehn nativen Bereiche) `identity` auch auf
     dem nackten Gerüst — Vorhandensein ist eine Datenfrage, Sichtbarkeit eine Anzeigefrage. Die sechs
     Optionen von `maritalStatus` sind darum die richtige Antwort, nicht null; `bereicheAlle()` bleibt
     leer (Anzeige). Der Betriebszustand „nichts da → leere Liste, kein Wurf" gilt weiter für einen
     Bereich, den auch der Katalog nicht kennt. */
  expect(wege._katalogOptionen.wert, 'der Katalog kennt die nativen Bereiche auch ohne Bündel und ohne Backen').toBe(6);
  expect(wege._katalogOptionenFremd.wert, 'ein Bereich, den auch der Katalog nicht kennt, liefert eine leere Liste statt zu werfen').toBe(0);
  // `textsatzNeuAnwenden()` gibt wörtlich `bereicheAlle().length` zurück (s. Kern) — dieselbe
  // Menge wie oben, jetzt 0 statt der Stufe-2-Übergangszahl 1.
  expect(wege.textsatzNeuAnwenden.wert, 'der Textsatz-Lauf begeht null Bereiche und meldet das als Zahl').toBe(0);

  /* Der Bericht sagt die Wahrheit ueber sich selbst. Vor U2-ADR-319 meldete er
     `angewandt: true` bei dreizehn uebersprungenen Bereichen — „Depot vollstaendig
     leer" mit einer Erfolgsmeldung daneben.
     UMGEDREHT (21.09.2026, Gerüst-Schnitt S6): bis dahin war `AB_WERK_DOKUMENTE_DE` nativ im Kern eingebettet und wurde
     auch auf dem nackten Gerüst angewandt (`dokumente > 0`, `angewandt: true`). Das Gerüst trägt die Dokument-Wortlaute nicht
     mehr; sie stehen als Moduldatei im Rezept jedes Produkts (tools/dokument-module/vivodepot-dokumente-de.json). Auf dem
     nackten Gerüst meldet der Bericht darum die Wahrheit: nichts angewandt, Grund `kein-buendel`. Die andere Hälfte der
     Zusicherung — das PRODUKT trägt die Kataloge — steht in tests/geruest-schnitt-dokumente-leer-produkt-voll.test.js (alle
     vier Produkte gebootet, Rot-Beweis ohne die Datei). Gemessen, nicht geraten: angewandt false, grund 'kein-buendel'. */
  expect(wege.buendelBericht.wert.bereiche, 'ohne Bündel wird kein Bereich aus einem Bündel ersetzt').toBe(0);
  /* S8 (U2-ADR-428): gemessen wird das deutsche Produkt OHNE Bereichs-Module, nicht mehr das nackte Gerüst (das zeigt ohne Sprachsatz keinen
     Eingangsschirm). Seine Dokument-Kataloge sind die Moduldatei des Produkts, kein Bündel — sie kommen an (`dokumente > 0`); ein BÜNDEL
     liefert nichts (`bereiche` 0, Grund `kein-buendel`). Das nackte Gerüst selbst prüft tests/geruest-schnitt-dokumente-leer-produkt-voll.test.js. */
  expect(wege.buendelBericht.wert.dokumente, 'das Produkt trägt seine Dokument-Kataloge aus der Moduldatei, nicht aus einem Bündel')
    .toBeGreaterThan(0);
  expect(wege.buendelBericht.wert.angewandt, 'angewandt ist falsch: die Dokument-Kataloge des Produkts sind angekommen').toBe(true);
  expect(wege.buendelBericht.wert.grund, 'ein Bericht mit angewandten Dokumenten meldet nicht „kein Bündel"').not.toBe('kein-buendel');

  expect(seitenFehler, 'keine unbehandelte Ausnahme auf der Seite').toEqual([]);
  expect(fehler, 'keine Konsolen-Fehler').toEqual([]);
});

/* ── Rot-Beweis zu Probe 3 ────────────────────────────────────────────────
   OHNE IHN IST „kein Leseweg wirft" NICHT VON „niemand hat nachgesehen" ZU
   UNTERSCHEIDEN. Ein Leseweg wird absichtlich zum Werfen gebracht; dieselbe
   Messfunktion muss ihn benennen.

   DIE MUTATION SITZT HINTER DEM BOOT, nicht im Quelltext, und das ist gemessen,
   nicht Geschmack: eine Quelltext-Fassung, die `bereicheAlle` werfen laesst,
   bringt die App gar nicht erst hoch — `#w-anlass` erscheint nie, der Lauf
   scheitert am Startbildschirm statt an der Messung. Bewiesen waere dann, dass
   ein kaputter Boot ein kaputter Boot ist, nicht dass die Messfunktion Zaehne hat.
   Ueberschrieben wird darum die LAUFENDE Funktion, nach dem Start. */
test('[U2-ADR-313 · Probe 3 · rot] ein werfender Leseweg wird benannt, nicht überlesen', async ({ page }) => {
  await oeffneApp(page, { url: KERN_URL_PRIVAT_DE_OHNE_BEREICHE });
  await depotAnlegen(page);

  const gesund = await lesewegeMessen(page);
  expect(gesund.bereicheAlle.wert, 'Ausgangslage: der Weg antwortet, bevor er zum Werfen gebracht wird — '
    + 'leer auf dem nackten Gerüst, s. Probe 3 oben').toEqual([]);

  const ersetzt = await page.evaluate(() => {
    if (typeof window.__vdOeffentlich.bereicheAlle !== 'function') return false;
    // nur-oeffentliche-flaeche: lesewegeMessen ruft genau diese öffentliche Fläche, keinen internen Aufrufer.
    window.__vdOeffentlich.bereicheAlle = () => { throw new Error('Rot-Beweis U2-ADR-313 Probe 3'); };
    return true;
  });
  expect(ersetzt, 'die Mutation muss greifen — sonst prüft der Rot-Beweis nichts').toBe(true);

  const mutiert = await lesewegeMessen(page);
  expect(mutiert.bereicheAlle.wurf, 'der Wurf muss als Wurf ankommen, mit seinem Text').toMatch(/Rot-Beweis/);
  expect(mutiert.bereicheAlle.wert, 'und darf nicht als Wert durchgehen').toBeUndefined();
});

/* ── Gegenprobe — ohne die zählt Probe 1 nichts ─────────────────────────── */
/* GESCHICHTE DIESER PROBE (wichtig für den nächsten Leser, der hier etwas „vereinfachen"
   möchte): die ERSTE Fassung ließ `depotAnlegen()` auf der mutierten Seite unbehandelt
   scheitern (hängender Notfall-Blatt-Dialog) und behauptete dann „die Seitenleiste zeigt
   ‚undefined'" — das war der eigentliche Fund dieser Datei, jetzt in vivodepot.html
   BEHOBEN (Entscheidung, s. Kopf-Kommentar): zwei stille `catch`-Blöcke um
   `textsatzNeuAnwenden()` (`vorDepotKonfigurationAnwenden`, `_alleModulRegisterAusDepotAnmelden`)
   sind jetzt laut UND versuchen eine Wiederherstellung (nur der Füll-Lauf, nicht die
   Rücknahme). Diese Fassung prüft die BEHEBUNG, nicht mehr den ursprünglichen Fund. */
test('[U2-ADR-313 · Gegenprobe] maritalStatus aus dem Bereichs-Katalog weglassen — BEHOBEN: Seitenleiste bleibt korrekt beschriftet, der Fehler meldet sich laut', async ({ browser }) => {
  const gesund = await browser.newPage();
  await oeffneApp(gesund);
  await depotAnlegen(gesund);
  const gesundSeitenleiste = await gesund.locator('nav.hauptnav, nav').first().locator('button.nav-item').allTextContents();
  await gesund.close();

  const mutiert = await browser.newPage();
  const mutiertFehler = konsoleFehlerSammeln(mutiert);
  const mutiertPageErrors = [];
  mutiert.on('pageerror', (e) => mutiertPageErrors.push(String(e.message || e)));
  await oeffneApp(mutiert, { url: schreibeVariante(identityOhneMaritalStatusBacken()) });

  // 1 · Depot anlegen darf NICHT MEHR hängen (vorher: Notfall-Blatt-Dialog nie abgeräumt,
  // weil der Vorschau-/Anlege-Weg selbst über den kaputten Textsatz-Lauf stolperte).
  await depotAnlegen(mutiert);

  // 2 · Die Seitenleiste bleibt korrekt beschriftet — der stille Seiteneffekt ist weg.
  const mutiertSeitenleiste = await mutiert.locator('nav.hauptnav, nav').first().locator('button.nav-item').allTextContents();
  expect(mutiertSeitenleiste.some((t) => /undefined/.test(t)),
    'kein „undefined" mehr in der Seitenleiste — die Wiederherstellung im catch muss greifen').toBe(false);
  expect(mutiertSeitenleiste, 'die Seitenleiste bleibt inhaltlich identisch zum gesunden Fall — nur das eine Feld ist betroffen, nicht die Bereichs-Beschriftung').toEqual(gesundSeitenleiste);

  // 3 · Der Fehler meldet sich laut (Konsole) — er wird nicht mehr lautlos verschluckt.
  expect(mutiertFehler.some((t) => t.includes('vorDepotKonfigurationAnwenden') || t.includes('_alleModulRegisterAusDepotAnmelden')),
    'mindestens einer der beiden gefixten catch-Blöcke muss sich in der Konsole melden').toBe(true);

  // 4 · Verbleibende, NICHT behobene Grenze (außerhalb dieses Auftrags, s. ADR-Nachtrag):
  // der Wizard-SCHRITT selbst, der das fehlende Feld direkt anzeigen will, stürzt beim
  // Öffnen weiterhin mit einem echten, UNCAUGHT `pageerror` ab (nicht mehr lautlos, aber
  // auch nicht behoben) — `_katalogOptionen` bleibt bewusst streng (keine Änderung
  // dort). Das ist weiterhin Probe 1s Gegenprobe-Zahn: heirwiz reagiert sichtbar anders.
  await oeffneSektor(mutiert, 'identity');
  await wizardStarten(mutiert, 'heirwiz');
  await mutiert.waitForTimeout(300);
  expect(mutiertPageErrors.some((t) => t.includes('_katalogOptionen: kein Katalogfeld identity.maritalStatus')),
    'der Wizard-Schritt für das fehlende Feld bleibt ein LAUTER Absturz — das ist die verbleibende, bekannte Grenze, kein stiller Ausfall mehr').toBe(true);
  await expect(mutiert.locator('.wizard-frage'), 'der Schritt selbst rendert weiterhin nicht — bekannt, außerhalb dieses Auftrags').toHaveCount(0);

  await mutiert.close();
});
