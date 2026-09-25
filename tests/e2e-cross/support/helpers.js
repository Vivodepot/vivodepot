'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Cross-Component-E2E — gemeinsame Reise-Bausteine
   ────────────────────────────────────────────────────────────────────────
   Drei Bausteingruppen, je eine pro Komponente, plus die Transfer-Simulation
   zwischen Browser-Kontexten.

   TRANSFER-SIMULATION (von der Spec ausdrücklich gesegnet): Ein Test speichert
   eine Datei in ein tmp-Verzeichnis (Download-Auffang aus Kontext A), ein
   anderer Kontext lädt sie von dort (setInputFiles in Kontext B). Das ist die
   ehrliche Nachbildung des „per E-Mail / USB-Stick übergeben“-Schritts, ohne
   tatsächlichen Versand und ohne Netz.

   SELEKTOREN stammen 1:1 aus den vier Single-File-HTMLs (statisch verifiziert).
   Die HTMLs werden NICHT verändert — wo eine Reise einen Wert programmatisch
   braucht (Notfall-QR-Nutzlast, Provenienz nach Anker-Wechsel, Signatur-
   Verifikation), ruft sie über page.evaluate die bereits vorhandenen
   TOP-LEVEL-Funktionen der jeweiligen App auf (sie sind im Browser globale
   window-Funktionen, weil als `function`-Deklaration im Script-Top-Level
   definiert). Das ist ein Test-HELFER in die App hinein, KEIN Eingriff in sie.

   ⚠ Schlüssel-Material: ausschließlich TEST-SENTINEL (siehe unten), nie Produktiv.
   ════════════════════════════════════════════════════════════════════════ */
const path = require('node:path');
const fs = require('node:fs');
const os = require('node:os');

const REPO = path.join(__dirname, '..', '..', '..');

/* ── file://-URLs der vier Komponenten ───────────────────────────────────── */
const { GEBACKENE_PRODUKT_PFADE, gebackeneProdukteSicherstellen } = require('../../e2e/global-setup.js');
// Diese Reisen laufen auch als Konformitäts-Gate im pre-push, VOR dem E2E, das die gebackenen Dateien schreibt — im frischen Baum wären sie nicht da (F3).
gebackeneProdukteSicherstellen();
const URLS = {
  // das GEBACKENE Produkt (support/global-setup.js), nicht das nackte Gerüst der rohen Datei
  kern:      'file://' + GEBACKENE_PRODUKT_PFADE['privat-de'],
  lesen:     'file://' + path.join(REPO, 'vivodepot-lesen.html'),
  issuer:    'file://' + path.join(REPO, 'vivodepot-vc-issuer.html'),
  generator: 'file://' + path.join(REPO, 'vivodepot-template-generator.html'),
};

/* ── TEST-Sentinel-Schlüsselpaar ─────────────────────────────────────────────
   Passt zum in alle vier Komponenten eingebetteten TEST_SENTINEL_PUBLIC_JWK
   (VC-Issuer-Spec F-2). Reines Test-Material, von Produktion isoliert. Derselbe
   Schlüssel wie in tests/e2e/08-vc-issuer.spec.js. */
const SENTINEL_PRIVATE_JWK = Object.freeze({
  kty: 'OKP', crv: 'Ed25519', alg: 'Ed25519',
  d: '-XFGcY2Rd9PBxjiBwWXGsOdiSGj5Vf1L90l09_FW4NE',
  x: 'kmz5gD4oi4pZe0CdR7FhXahRnjZqrAkKCe0VNskNf60',
  key_ops: ['sign'], ext: true,
});
const SENTINEL_PUBLIC_JWK = Object.freeze({
  kty: 'OKP', crv: 'Ed25519', x: 'kmz5gD4oi4pZe0CdR7FhXahRnjZqrAkKCe0VNskNf60',
});

/* ── tmp-Transfer-Verzeichnis ────────────────────────────────────────────────
   Ein frisches Verzeichnis je Reise. Nach dem Lauf gelöscht (Sicherheits-
   Anforderung: Zwischen-Artefakte nicht stehen lassen). */
function frischerTmp(label) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), `vivodepot-cross-${label}-`));
  return dir;
}
function tmpAufraeumen(dir) {
  try { fs.rmSync(dir, { recursive: true, force: true }); } catch { /* best effort */ }
}

/* Download aus Kontext A auffangen und in tmp ablegen → liefert den Dateipfad. */
async function downloadNachTmp(page, dir, ausloeser) {
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    ausloeser(),
  ]);
  const name = download.suggestedFilename() || 'transfer.bin';
  const ziel = path.join(dir, name);
  await download.saveAs(ziel);
  return ziel;
}

/* Eine JWK/JSON-Struktur als In-Memory-Datei für setInputFiles. */
function jsonDatei(name, obj) {
  return { name, mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(obj, null, 2)) };
}

/* ════════════════════════════════════════════════════════════════════════
   BÜRGER-APP (Kern) — Selektoren wie tests/e2e/helpers.js
   ════════════════════════════════════════════════════════════════════════ */
const kern = {
  // `url` (Fund, 19.09.2026): optionaler Override von `URLS.kern` — die Cross-Suite
  // selbst öffnet weiterhin unverändert die rohe vivodepot.html (kein Verhaltenswechsel für
  // bestehende Aufrufer, kein Argument = alter Pfad). Ein Aufrufer, der eine GEBACKENE Kopie
  // braucht (z. B. tests/konformitaet/offline-garantie.mjs — die rohe Datei trägt seit dem
  // Schnitt-Nachtrag 18.09.2026 kein Bereich mehr, s. tools/lib/kern-lesen.js), reicht seine
  // eigene file://-URL herein statt eine zweite Fassung dieses Helfers zu pflegen.
  async oeffnen(page, url) {
    // Zug 1 (Auftrag „Depot ist Datei", 08.08.2026): FSA-Attrappe VOR der Navigation — der
    // Anlege-Weg holt jetzt ein Dateiziel (showSaveFilePicker) direkt beim Anlegen, headless
    // Chromium zeigt dafür keinen nativen Dialog. Echter Schreibweg (createWritable/write/
    // close), kein App-Bypass. Muss VOR goto() stehen (addInitScript wirkt nur auf künftige Loads).
    await page.addInitScript(() => {
      Object.defineProperty(window, 'showSaveFilePicker', {
        configurable: true,
        value: async () => ({
          name: 'cross-e2e-messung.vivodepot',
          createWritable: async () => ({ write: async () => {}, close: async () => {} }),
        }),
      });
    });
    await page.goto(url || URLS.kern);
    // Lage A (Strang 2 Commit A) — ODER, seit der interne Speicher auch unter file:// gilt, der
    // Entsperr-Schirm eines im Kontext bereits gespeicherten Depots (#co-pw, cryptoInternAufforderung).
    await page.waitForSelector('#w-anlass, #co-pw', { state: 'visible' });
  },
  async depotAnlegen(page, { name = 'Test Anker', pw = 'cross-e2e-pw-123' } = {}) {
    // Setup-first (vivodepot.html:12636): der Klick auf #tb-pw-hinweis ruft flowDepotAnlegen() →
    // Identitäts-Dialog mit Vorname + Nachname (beide Pflicht im Anker) + Passwort + Bestätigung,
    // also die Felder #id-vorname/#id-nachname/#id-pw/#id-pw2, bestätigt über #m-ok.
    // (Früher: name-loses flowPasswortSetzen mit #pw-neu/#pw-neu2. Am 2026-07-03 nachgezogen —
    //  dieselbe Drift wie in tests/e2e/helpers.js; die CI-Probe machte sie als Cross-Timeouts
    //  sichtbar. `name` wird in Vor-/Nachname gesplittet; wo eine Reise den Akteur-Namen später
    //  überschreibt (T-CROSS-01 Identitäts-Sektor, T-CROSS-06 akteurSelbstErklaeren), gewinnt das.)
    const teile = String(name).trim().split(/\s+/);
    const vorname = teile[0] || 'Test';
    const nachname = teile.slice(1).join(' ') || 'Anker';            // Anker verlangt Nachname (Pflicht)
    await page.click('#w-anfangen');
    await page.waitForSelector('#app.an', { state: 'attached' });
    await page.waitForSelector('#tb-pw-hinweis', { state: 'visible' });
    await page.click('#tb-pw-hinweis');
    await page.waitForSelector('#id-pw', { state: 'visible' });
    await page.fill('#id-vorname', vorname);
    await page.fill('#id-nachname', nachname);
    await page.fill('#id-pw', pw);
    await page.fill('#id-pw2', pw);                                  // Bestätigung (Pflicht, == pw)
    await page.click('#m-ok');
    await page.waitForSelector('#tb-pw-hinweis', { state: 'hidden' }); // reale Sitzung: Onboarding-Hinweis weg
    await page.waitForSelector('#app.an', { state: 'attached' });
    await kern.einmalDialogeSchliessen(page);                        // U2-ADR-095 + Wiedereinstieg, s. u.
    return { name, pw, vorname, nachname };
  },
  /* Nach dem Anlegen können EINMAL-Dialoge anfallen, die keine Reise erwartet: der
     Wiedereinstiegs-Hinweis (beim ersten Datei-Sichern) und seit U2-ADR-095 das
     Notfall-Blatt-Angebot. Sie liegen über der Sitzung und fangen jeden folgenden Klick ab
     (Playwright meldet dann „#modal-inhalt intercepts pointer events" an einer Stelle, die
     damit nichts zu tun hat). Bewusst NICHT auf einen bestimmten Dialog verdrahtet: welche
     anfallen und in welcher Reihenfolge, hängt am Speicher-Modus der Umgebung. Der Helfer
     räumt ab, was da ist — „Später" beim Angebot, sonst der Bestätigungs-Knopf. */
  async einmalDialogeSchliessen(page, fristMs = 10000) {
    const ende = Date.now() + fristMs;
    let angebotWeg = false;
    while (Date.now() < ende) {
      // NUR an den festen Griffen entscheiden, nie „irgendeinen offenen Dialog wegklicken":
      // ein blinder Klick auf #m-ok traf schon den Anlege-Dialog (Doppel-Absenden) bzw. das
      // Angebot selbst (dann ging das Druck-Blatt auf und blockierte die Reise erst recht).
      if (await page.locator('#nfb-angebot').isVisible().catch(() => false)) {
        await page.click('#m-zweit');               // „Später"
        angebotWeg = true;
      } else if (await page.locator('#wiedereinstieg-hinweis').isVisible().catch(() => false)) {
        await page.click('#m-ok');
      } else if (angebotWeg && !(await page.locator('#modal-rueck.an').count())) {
        return;
      }
      await page.waitForTimeout(100);
    }
    throw new Error('Einmal-Dialoge nach dem Anlegen nicht abgeräumt (Frist ' + fristMs + ' ms) — '
      + 'erschien das Notfall-Blatt-Angebot (#nfb-angebot) nicht?');
  },
  // U2-ADR-171 (25.08.2026): der Bereichs-Knopf steckt seit heute in einem kollabierbaren
  // <details class="nav-gruppe"> — derselbe Fix wie in tests/e2e/helpers.js oeffneSektor()
  // und tests/e2e/helpers.js wizardStarten(), hier nur für die Cross-App-Suite.
  // Fortsetzen-Fokus (26.08.2026): eine weitere Ebene kam hinzu — der ganze Zwölf-Bereiche-Baum
  // steckt jetzt selbst hinter `<details class="bereiche-umschalter">` ("Alle Bereiche zeigen"),
  // Standard ZU. Erst diesen aufklappen. Der Klick-Locator bleibt auf den Baum verengt
  // (`details.bereiche-umschalter […]`): ein bereits besuchter Bereich steht danach ZUSÄTZLICH
  // flach unter „Weitermachen" — ohne die Verengung träfe der Klick im Strict Mode zwei Elemente
  // (dieselbe Falle wie in tests/e2e/helpers.js).
  async oeffneSektor(page, sektorId) {
    const umschalter = page.locator('details.bereiche-umschalter');
    if (await umschalter.count()) {
      const umschalterOffen = await umschalter.evaluate((el) => el.open);
      if (!umschalterOffen) await umschalter.locator('summary').first().click();
    }
    const knopf = page.locator(`details.bereiche-umschalter [data-sektor="${sektorId}"]`);
    const gruppe = page.locator('details.nav-gruppe', { has: page.locator(`[data-sektor="${sektorId}"]`) });
    if (await gruppe.count()) {
      const offen = await gruppe.evaluate((el) => el.open);
      if (!offen) await gruppe.locator('summary').click();
    }
    await knopf.click();
    await page.waitForSelector('#content .bereich-kopf');
    // Statuskarten (Task B.1ff., 26.08.2026): dieselbe Öffnen-vor-Zugriff-Falle wie beim
    // nav-gruppe-Klick oben, eine Ebene tiefer — s. tests/e2e/helpers.js feldgruppenKartenOeffnen()
    // (inline nachgebaut statt requiriert, damit diese Datei wie im Kopfkommentar beschrieben
    // eigenständig bleibt).
    const karten = page.locator('#content .feldgruppen-karte:not([open]) > summary');
    while (await karten.count()) await karten.first().click();
  },
  // Typ-bewusst: ein Sektor-Feld rendert je nach Definition als
  //   • skalares  [data-edit]        (text/textarea/datum/zahl) → tippen
  //   • Code-Liste [data-edit-code]   (SNOMED/ICD/ATC, ALTE Form) → Anzeige-Name tippen; codeWertAus löst den Code auf
  //   • Chip-Widget [data-chip-liste] (Code-Slot-Felder, Chip-Mechanik E1 Option C, 13.07.2026) →
  //     Eingabe tippen + Enter bestätigt EINEN Chip (Zusatz 2 Chip-Input-Konvention — kein Blur-Anlegen)
  //   • Ref        [data-edit-ref] + [data-edit-override] (Person) → Freitext-Override (legitimer Eingabeweg)
  // Inline-Edit (kein #b-bearb/#b-fertig); Commit über bearbeitungSpeichern()+renderContent() — sektorweit
  // speichern + Stempel mit dem AKTUELLEN Akteur, SOFORT (richtiger Stempel-Zeitpunkt, vgl. T-CROSS-06).
  async setzeFeld(page, feldId, wert) {
    if (await page.locator(`[data-chip-liste="${feldId}"]`).count()) {
      const eingabe = page.locator(`[data-chip-liste="${feldId}"] [data-chip-eingabe]`);
      await eingabe.fill(wert);
      await eingabe.press('Enter');   // Chip-Input-Konvention: Enter bestätigt, kein Blur-Anlegen
    } else if (await page.locator(`[data-edit-code="${feldId}"]`).count()) {
      await page.fill(`[data-edit-code="${feldId}"]`, wert);
    } else if (await page.locator(`[data-edit-ref="${feldId}"]`).count()) {
      await page.fill(`[data-edit-override="${feldId}"]`, wert);
    } else {
      await page.fill(`[data-edit="${feldId}"]`, wert);
    }
    await page.evaluate(() => { window.__vdOeffentlich.bearbeitungSpeichern(); window.__vdOeffentlich.renderContent(); });
    // renderContent() baut die Sektion neu auf — jede zuvor geöffnete Statuskarte kommt darum
    // wieder eingeklappt zurück (s. Kommentar an oeffneSektor). Ein Aufrufer, der mehrere Felder
    // derselben Karte hintereinander setzt, fände das zweite sonst wieder unsichtbar.
    {
      const karten = page.locator('#content .feldgruppen-karte:not([open]) > summary');
      while (await karten.count()) await karten.first().click();
    }
  },
  async setzeAuswahl(page, feldId, wert) {
    await page.selectOption(`[data-edit="${feldId}"]`, wert);
    await page.evaluate(() => { window.__vdOeffentlich.bearbeitungSpeichern(); window.__vdOeffentlich.renderContent(); });
    {
      const karten = page.locator('#content .feldgruppen-karte:not([open]) > summary');
      while (await karten.count()) await karten.first().click();
    }
  },
  async setzeModus(page, modus) {
    // Demo-Umschalter (#tb-modus-select in .dev-leiste) ist normal ausgeblendet (nur ?dev=1);
    // einblenden, dann echter onchange-Pfad (bearbeitungSpeichern → Modus._setzeIntern).
    await page.evaluate(() => { const dl = document.querySelector('.dev-leiste'); if (dl) dl.style.display = 'inline-flex'; });
    await page.selectOption('#tb-modus-select', modus);
  },
  // Voll-Depot als .vivodepot-Datei speichern → tmp.
  //
  // GEÄNDERT (Auftrag „die pauschale file://-Flagge weicht der Probe", 12.09.2026,
  // e2e-Nachzug): dieser Helfer hing bis hierher am Sichern-Knopf der Status-Pille
  // (#tb-save-knopf), der nur sichtbar wird, wenn der DATEI-Weg gilt — vor diesem Auftrag war
  // das in der Playwright-Umgebung IMMER der Fall (file:// erzwang es pauschal). Seit die
  // pauschale Flagge weg ist, funktioniert echte IndexedDB unter file:// (gemessen, Bericht
  // sichern-je-browser-je-lauf-2026-09-12.md) — Feld-Änderungen sichern seither still intern
  // (ADR-237), der Knopf bleibt verborgen, `#tb-save-knopf` wird nie sichtbar, der Helfer lief
  // in einen Timeout.
  //
  // Alle heutigen Aufrufer (geprüft, nicht als Gruppe angenommen — s. tests/e2e-cross/T-CROSS-
  // 01/15/16/17/20) wollen dasselbe: einen ECHTEN, transferierbaren .vivodepot-Export für einen
  // Kontext-Wechsel (Datei in Kontext A erzeugen, in Kontext B wieder öffnen) — keiner von ihnen
  // testet den Download-Fallback-MECHANISMUS selbst als eigenen Prüfgegenstand. Der zutreffende,
  // heute gültige Weg zu genau diesem Ziel ist seit ADR-237 „Sicherungskopie erstellen"
  // (Depot-Menü → #tb-depot-menue-sicherungskopie → depotInDateiSichern() direkt) — nicht mehr
  // der Sichern-Knopf, der Rest des alten Regelfalls ist. Ein Test, der stattdessen ausdrücklich
  // den DATEI-MODUS selbst (keine interne Senke) prüfen will, muss das eigens erzwingen (echt
  // gescheiterte Funktionsprobe, z. B. `indexedDB` vor der Navigation entfernen) — das ist eine
  // andere Absicht als dieser Helfer und gehört in den jeweiligen Aufrufer, nicht hierher.
  //
  // Depot-Speichern nutzt auf Chromium die File-System-Access-API (showSaveFilePicker, „in-place")
  // — Playwright sieht das NICHT als 'download' und ein OS-Picker ist headless nicht bedienbar.
  // showSaveFilePicker bleibt PRÄSENT (so fragt der Save-Handler KEIN Nicht-FSA-Namens-Modal ab,
  // hatDateiSpeichernPicker()===true), wird aber zum Werfen gebracht → _depotBlobSpeichern fällt
  // im catch sauber auf den klassischen Blob-Download (dateiAusgeben) zurück, den Playwright als
  // 'download' fängt. Das ist derselbe reale Fallback-Pfad wie zuvor (Firefox/Safari/
  // nicht-secure-Kontext) — nur der AUSLÖSER (Menüpunkt statt Knopf) hat sich geändert.
  async speichernNachTmp(page, dir) {
    await page.evaluate(() => {
      try {
        Object.defineProperty(window, 'showSaveFilePicker', {
          configurable: true,
          value: () => Promise.reject(new Error('headless: kein OS-Datei-Picker')),
        });
      } catch (_) {}
      if (typeof dateiBindungZuruecksetzen === 'function') dateiBindungZuruecksetzen();
    });
    await page.click('#tb-depot-pille');
    await page.waitForSelector('#tb-depot-menue-sicherungskopie', { state: 'visible' });
    return downloadNachTmp(page, dir, () => page.click('#tb-depot-menue-sicherungskopie'));
  },
};

/* ════════════════════════════════════════════════════════════════════════
   LESE-APP — Welcome (weg-datei/weg-einfuegen) · datei-input · pw-form
   (weg-qr/Kamera-Tür entfernt, U2-ADR-085 §5, 14.07.2026)
   ════════════════════════════════════════════════════════════════════════ */
const lesen = {
  async oeffnen(page) {
    await page.goto(URLS.lesen);
    await page.waitForSelector('#weg-datei', { state: 'visible' });
  },
  // Datei wählen (verstecktes #datei-input direkt befüllen) + Passwort eingeben + öffnen.
  async dateiOeffnen(page, dateiPfad, pw) {
    await page.setInputFiles('#datei-input', dateiPfad);
    await page.waitForSelector('#pw-feld', { state: 'visible' });
    await page.fill('#pw-feld', pw);
    // Gezielt „Öffnen" klicken, NICHT Enter: die Passwort-Form hat einen zweiten Submit
    // (#btn-notfall-cache „Notfall ohne Passwort", typ-loser Default-Submit) VOR dem Öffnen-Knopf —
    // Enter löste den zuerst aus → Notfall-Render statt Voll-Sicht. Nur „Öffnen" trägt type="submit".
    await page.click('#pw-form button[type="submit"]');
    await page.waitForSelector('#content', { state: 'visible' });
  },
  // QR-Text einfügen (weg-einfuegen → Textarea #qr-text → #btn-qr-lesen).
  async qrTextEinfuegen(page, text) {
    await page.click('#weg-einfuegen');
    await page.waitForSelector('#qr-text', { state: 'visible' });
    await page.fill('#qr-text', text);
    await page.click('#btn-qr-lesen');
  },
};

/* ════════════════════════════════════════════════════════════════════════
   VC-ISSUER — wie tests/e2e/08-vc-issuer.spec.js
   ════════════════════════════════════════════════════════════════════════ */
const issuer = {
  async oeffnen(page) {
    await page.goto(URLS.issuer);
    await page.waitForSelector('.ta-banner', { state: 'visible' });
  },
  async sentinelImportieren(page) {
    await page.setInputFiles('#keyFile', jsonDatei('sentinel-private.jwk', SENTINEL_PRIVATE_JWK));
    await page.waitForSelector('#sentinelFlag', { state: 'visible' });
  },
  async submissionImportieren(page, submissionPfad) {
    await page.setInputFiles('#submissionFile', submissionPfad);
    await page.waitForSelector('#submissionStatus');
  },
  // VC ausstellen → JWS-Compact (signiertes Provider-Zertifikat) aus #jwsOut lesen.
  async ausstellenUndJws(page) {
    await page.click('#issueBtn');
    await page.waitForSelector('#resultCard', { state: 'visible' });
    const jws = (await page.locator('#jwsOut').textContent() || '').trim();
    return jws;
  },
};

/* ════════════════════════════════════════════════════════════════════════
   TEMPLATE-GENERATOR — drei Räume (GEN1): Start → Arbeitsfläche → Fertigstellen (Dialog)
   Die Reihenfolge der Aufrufe ist unverändert (oeffnen, stammdaten, schluesselErzeugen,
   dreiFelder, submissionNachTmp); der Weg dahinter ist der neue: gebaut wird auf der
   Arbeitsfläche, Angaben und Schlüssel liegen im Fertigstellen-Dialog.
   ════════════════════════════════════════════════════════════════════════ */
const generator = {
  async oeffnen(page, sprache) {
    await page.goto(URLS.generator);
    await page.waitForSelector('#start-leer', { state: 'visible' });
    await page.click(sprache === 'en' ? '#sp-en' : '#sp-de');   // die Sprache des Browsers soll nicht mitspielen
  },
  async dialogSchliessen(page) {
    if (await page.locator('#dlg-fertig[open]').count()) await page.click('#dlg-fertig .dlg-zu');
  },
  async stammdaten(page, sd) {
    await page.click('#start-leer');                     // Start → Arbeitsfläche
    await page.click('#fertig-oeffnen');                 // ohne Angaben öffnet der Dialog bei den Angaben
    await page.waitForSelector('#sd-name', { state: 'visible' });
    await page.fill('#sd-name', sd.anbieterName);
    await page.selectOption('#sd-rechtsform', sd.rechtsform);
    await page.fill('#sd-strasse', sd.strasse);
    await page.fill('#sd-plz', sd.plz);
    await page.fill('#sd-ort', sd.ort);
    await page.fill('#sd-land', sd.land);
    await page.fill('#sd-k-name', sd.kontaktName);
    await page.fill('#sd-k-funktion', sd.kontaktFunktion);
    await page.fill('#sd-k-email', sd.kontaktEmail);
    await page.fill('#sd-k-telefon', sd.kontaktTelefon);
    await page.selectOption('#sd-bereich', sd.bereich);
    await page.fill('#sd-usecase', sd.useCase);
    await page.click('#sd-weiter');                      // Angaben → Schlüssel
  },
  async schluesselErzeugen(page) {
    await page.waitForSelector('#sk-erzeugen', { state: 'visible' });
    await page.click('#sk-erzeugen');
    await page.waitForSelector('#sk-downloads:not([hidden])');
    // #sk-weiter ist bewusst gesperrt, bis BEIDE Schlüssel heruntergeladen sind. #sk-pub / #sk-priv lösen
    // über blobDownload ECHTE Datei-Downloads aus, die hier abgefangen werden.
    await Promise.all([ page.waitForEvent('download'), page.click('#sk-pub') ]);
    await Promise.all([ page.waitForEvent('download'), page.click('#sk-priv') ]);
    await page.waitForSelector('#sk-weiter:not([disabled])', { state: 'visible' });
    await page.click('#sk-weiter');                      // Schlüssel → Prüfen und absenden
  },
  // Drei einfache Felder auf der Arbeitsfläche anlegen (Palette „eigenes Feld", Eigenschaften live).
  async dreiFelder(page, felder) {
    await generator.dialogSchliessen(page);
    await page.waitForSelector('#palette', { state: 'visible' });
    await page.click('.pal-frei > summary');
    for (const f of felder) {
      await page.click('.pal-eintrag[data-typ="' + f.feldtyp + '"] .pal-plus');
      await page.waitForSelector('#feld-editor:not([hidden])');
      await page.fill('#ed-name', f.feldname);
      await page.evaluate(() => { document.querySelector('.eig-erweitert').open = true; });
      await page.selectOption('#ed-bereich', f.bereich);
      if (f.pflicht) await page.check('#ed-pflicht');
    }
    await page.click('#fertig-oeffnen');                 // Angaben und Schlüssel stehen → der Dialog öffnet bei „Prüfen und absenden"
  },
  // Prüfen + Submission-Paket erzeugen → Download nach tmp.
  async submissionNachTmp(page, dir) {
    await page.waitForSelector('#pr-pruefen', { state: 'visible' });
    await page.click('#pr-pruefen');
    await page.waitForSelector('#pr-submit:not([disabled])');
    return downloadNachTmp(page, dir, () => page.click('#pr-submit'));
  },
};

/* Ein Angehörigen-Blatt im Generator bauen, signieren und als Datei erzeugen (GEN3). `blatt`: titel, icon, einfuehrung, block1, block2,
   rechtsraum, rechtsraumName. Es entstehen zwei Blöcke: der erste bekommt die ersten zwei Felder der Palette (per +), der zweite das vierte
   (per Ziehen) und das Register der Menschen (per Ziehen). Liefert { datei, umschlag, publicJwk }. */
generator.blattBauenUndErzeugen = async function blattBauenUndErzeugen(page, tmp, blatt, sd) {
  const fs = require('node:fs');
  await page.click('#start-blatt');
  await page.click('.bk-kopf >> nth=0');
  await page.fill('#ab-s-titel', blatt.titel);
  await page.selectOption('#ab-s-icon', blatt.icon || 'heartPulse');
  await page.fill('#ab-s-einfuehrung', blatt.einfuehrung || '');
  await page.click('.bk-block-kopf >> nth=0');
  await page.fill('#ab-b-titel', blatt.block1);
  await page.click('.pal-eintrag[data-kat] .pal-plus >> nth=0');
  await page.click('.pal-eintrag[data-kat] .pal-plus >> nth=1');
  await page.click('.bk-fuss >> nth=0 >> button >> nth=0');
  await page.fill('#ab-b-titel', blatt.block2);
  await page.locator('.pal-eintrag[data-kat]').nth(3).dragTo(page.locator('.bk-block').nth(1));
  await page.locator('.pal-eintrag[data-sq="people"]').dragTo(page.locator('.bk-block').nth(1));
  await page.fill('#ab-rechtsraum', blatt.rechtsraum || 'DE');
  await page.fill('#ab-rechtsraumname', blatt.rechtsraumName || 'Deutschland');
  await page.fill('#ab-sprache', blatt.sprache || 'de');
  await page.click('#blatt-fertig');
  await page.waitForSelector('#sd-name', { state: 'visible' });
  await page.fill('#sd-name', sd.anbieterName); await page.selectOption('#sd-rechtsform', sd.rechtsform);
  await page.fill('#sd-strasse', sd.strasse); await page.fill('#sd-plz', sd.plz); await page.fill('#sd-ort', sd.ort);
  await page.fill('#sd-k-name', sd.kontaktName); await page.fill('#sd-k-funktion', sd.kontaktFunktion);
  await page.fill('#sd-k-email', sd.kontaktEmail); await page.fill('#sd-k-telefon', sd.kontaktTelefon);
  await page.selectOption('#sd-bereich', sd.bereich); await page.fill('#sd-usecase', sd.useCase);
  await page.click('#sd-weiter');
  await page.click('#sk-erzeugen');
  await page.waitForSelector('#sk-downloads:not([hidden])');
  const [pubDl] = await Promise.all([page.waitForEvent('download'), page.click('#sk-pub')]);
  const publicJwk = JSON.parse(fs.readFileSync(await pubDl.path(), 'utf8'));
  await Promise.all([page.waitForEvent('download'), page.click('#sk-priv')]);
  await page.click('#sk-weiter');
  const datei = await downloadNachTmp(page, tmp, () => page.click('#ab-erzeugen'));
  return { datei, umschlag: JSON.parse(fs.readFileSync(datei, 'utf8')), publicJwk };
};

module.exports = {
  REPO, URLS,
  SENTINEL_PRIVATE_JWK, SENTINEL_PUBLIC_JWK,
  frischerTmp, tmpAufraeumen, downloadNachTmp, jsonDatei,
  kern, lesen, issuer, generator,
};
