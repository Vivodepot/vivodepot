'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Persona — Berufsbetreuerin mit mehreren Depots (Track A Punkt 3, Laufzettel
   Nacht 2026-08-29 „v1-Freigabe-Vorbereitung")
   ────────────────────────────────────────────────────────────────────────
   Eine gesetzliche Berufsbetreuerin führt für mehrere Betreute je ein EIGENES
   Depot (eigene Datei, eigenes Passwort) — sie selbst ist nicht Bürgerin des
   Depots, sondern Verwalterin mehrerer fremder. Die Frage ist nicht "geht
   Anlegen zweimal", sondern: bleiben zwei Depots im selben Browser-Tab, im
   selben Prozess, WIRKLICH getrennt, wenn zwischen ihnen gewechselt wird?
   Ein Datenaustausch zwischen zwei Betreuten wäre nicht nur ein Bug, sondern
   ein Vertrauensbruch mit Aufsichtspflicht-Konsequenz für die Betreuerin.

   Geprüft, echter Browser (Playwright), kein Node/jsdom-Mock:
   1) Depot A anlegen, Identität + eine Vorsorge-Angabe eintragen, sichern+schließen.
   2) Depot B anlegen (eigenes Passwort, andere Werte), dieselben zwei Felder,
      sichern+schließen.
   3) Depot A wieder öffnen — NUR A-Werte da, keine Spur von B.
   4) Depot B wieder öffnen — NUR B-Werte da, keine Spur von A.
   5) Fremdmodul (dieselbe Anker→Ausgabestelle→Kunde-Kette wie
      pilot-externe-herausgeberin-comunita-energetica.spec.js, U2-ADR-172) wird
      NUR in Depot A angedockt — Depot B kennt es nie, auch nach dem Speichern
      beider Dateien.

   Wechsel-Mechanik: derselbe Weg wie tests/e2e/zug5-persistenz-rauchtest.spec.js
   ("Sichern und schließen" über #tb-marke → #m-ok → zurück zu #w-anlass, dann
   #w-datei/#co-datei/#co-pw/#w-oeffnen für den Wiedereinstieg). EIN Tab, EINE
   Page-Instanz für den ganzen Test — genau das bildet ab, was eine Betreuerin
   am eigenen Rechner tatsächlich tut (Datei zu, andere Datei auf), nicht zwei
   isolierte Browser-Kontexte, die das interessante Risiko (geteilter
   In-Memory-Zustand derselben Seite) gar nicht stellen könnten.

   TDD/Härtung — kein Report-before-Build (reines Testen, kein UI-Neubau).
   ════════════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { test, expect } = require('@playwright/test');
const { oeffneApp, depotAnlegen, oeffneSektor, setzeFeld, browserEd25519SchluesselpaarErzeugen, browserJwsSignieren } = require('./helpers');

const BETREUTE_A = {
  pw: 'betreute-anna-pw-741',
  strasse: 'Rosenweg 3',
  ort: '86720 Nördlingen',
  pflege: 'Anna mag es, wenn morgens zuerst das Fenster geöffnet wird.',
};
const BETREUTE_B = {
  pw: 'betreuter-bruno-pw-852',
  strasse: 'Lindenallee 9',
  ort: '73728 Esslingen',
  pflege: 'Bruno trägt grundsätzlich nur Hemden ohne Kragen, wegen einer alten Narbe.',
};

const BEREICH_ID = 'betreuungsverband-vorlage';
const LABEL = 'Betreuungsverband — Musterordner';
const ANBIETER_ID = 'bvfb/musterordner-pilot';
const ANBIETER_NAME = 'Bundesverband der Berufsbetreuer:innen (Pilot)';

// Derselbe Capture-Mechanismus wie zug5-persistenz-rauchtest.spec.js: echter Schreibweg
// (createWritable/write/close), nur ohne nativen OS-Dialog. NACH oeffneApp() einrichten —
// überschreibt dessen Default-Attrappe (Registrierungsreihenfolge, s. dortiger Kommentar.
async function fsaAttrappeEinrichten(page) {
  await page.evaluate(() => {
    window.__betreuerinBytes = null;
    Object.defineProperty(window, 'showSaveFilePicker', {
      configurable: true,
      value: async () => ({
        name: 'betreuerin-depot.vivodepot',
        createWritable: async () => {
          let stueck = '';
          return {
            write: async (chunk) => {
              if (typeof chunk === 'string') { stueck += chunk; }
              else if (chunk && typeof chunk.text === 'function') { stueck += await chunk.text(); }
            },
            close: async () => { window.__betreuerinBytes = stueck; },
          };
        },
      }),
    });
  });
}

async function identitaetUndVorsorgeEintragen(page, { strasse, ort, pflege }) {
  await oeffneSektor(page, 'identity');
  await setzeFeld(page, 'streetAddress', strasse);
  await setzeFeld(page, 'postcodeCity', ort);
  await oeffneSektor(page, 'advanceCare');
  await setzeFeld(page, 'personalCareDignity', pflege);
}

async function identitaetUndVorsorgePruefen(page, { strasse, ort, pflege }) {
  await oeffneSektor(page, 'identity');
  await expect(page.locator('[data-edit="streetAddress"]')).toHaveValue(strasse);
  await expect(page.locator('[data-edit="postcodeCity"]')).toHaveValue(ort);
  await oeffneSektor(page, 'advanceCare');
  await expect(page.locator('[data-edit="personalCareDignity"]')).toHaveValue(pflege);
}

// Nach Hause (Welcome-Screen) — funktioniert sowohl dirty (Bestätigungs-Modal kommt) als auch
// clean (geheZuZuhause navigiert ohne Rückfrage direkt). #tb-marke ist derselbe Knopf in
// beiden Fällen (s. zug5-persistenz-rauchtest.spec.js sichernUndSchliessen für den dirty-Fall).
async function depotSchliessen(page) {
  await page.click('#tb-marke');
  const bestaetigen = page.locator('#m-ok');
  const kamModal = await bestaetigen.waitFor({ state: 'visible', timeout: 2000 }).then(() => true).catch(() => false);
  if (kamModal) await bestaetigen.click();
  await page.waitForSelector('#w-anlass', { state: 'visible', timeout: 10000 });
}

async function depotSchliessenUndBytesHolen(page) {
  await depotSchliessen(page);
  const bytes = await page.evaluate(() => window.__betreuerinBytes);
  expect(bytes, 'FSA-Attrappe muss beim Schließen geschrieben haben').toBeTruthy();
  return bytes;
}

function alsTmpDatei(bytes, name) {
  const tmp = path.join(os.tmpdir(), name + '-' + Date.now() + '-' + Math.random().toString(36).slice(2) + '.vivodepot');
  fs.writeFileSync(tmp, bytes, 'utf8');
  return tmp;
}

// GEÄNDERT (Auftrag, 12.09.2026): seit internerSpeicherModus() unter file:// echt greift,
// liegt im selben Tab oft noch ein interner Stand des VORHERIGEN Depots in der IndexedDB, wenn
// jetzt eine ANDERE Datei geöffnet wird — der Kern fragt dafür den Konflikt-Dialog „Welchen
// Stand möchten Sie verwenden?" ab (flowStandKonfliktDialog, vivodepot.html:16710), GEMESSEN
// per Debug-Lauf an tests/e2e/uebergang-depot-a-nach-b.spec.js (identisches Muster: EIN Tab,
// wechselnde Depots). Dieser Test will ausdrücklich den Inhalt der GEÖFFNETEN DATEI —
// „Aus der Datei" (#m-zweit), falls der Dialog erscheint.
async function depotOeffnen(page, dateiPfad, pw) {
  await page.click('#w-datei');
  await page.setInputFiles('#co-datei', dateiPfad);
  await page.fill('#co-pw', pw);
  await page.click('#w-oeffnen');
  const konfliktDatei = page.locator('#m-zweit');
  const kamKonflikt = await konfliktDatei.waitFor({ state: 'visible', timeout: 3000 }).then(() => true).catch(() => false);
  if (kamKonflikt) await konfliktDatei.click();
  await page.waitForSelector('#app.an', { state: 'attached' });
}

/* Dieselbe Anker→Ausgabestelle→Kunde-Kette wie tests/e2e/pilot-externe-herausgeberin-
   comunita-energetica.spec.js (U2-ADR-172) — hier nur EIN Bereichsmodul, kein Sprachpaar.

   Kern-Verschluss (19.09.2026): `_jwsImportSignKey`/`_signJWS` sind seither NICHT mehr bare im
   Browser erreichbar (Krypto-Primitive bleiben bewusst außerhalb von window.__vdOeffentlich).
   Signiert wird darum über `browserJwsSignieren` (tests/e2e/helpers.js) — dieselbe RFC-7515-
   Schnittstelle, die ein echter externer Aussteller nutzen würde. `data` ist aus demselben
   Grund nicht mehr bare erreichbar (Zustands-Innenschau) — `window.__vdOeffentlich.ankerDaten()`
   ist der seit dem Verschluss gültige Lesezugriff (wörtlich wie a497-vier-pruefdurchgaenge.spec.js
   und persona-pro-nutzerin-kompletter-weg.spec.js es bereits nutzen). */
async function bereichModulAndocken(page) {
  const ankerKp = await page.evaluate(browserEd25519SchluesselpaarErzeugen);
  const ausgabeKp = await page.evaluate(browserEd25519SchluesselpaarErzeugen);
  const ausstellerCert = {
    '@context': ['https://www.w3.org/ns/credentials/v2'],
    type: ['VerifiableCredential', 'VivodepotProviderCredential'],
    issuer: 'did:web:vivodepot.de', issuanceDate: '2026-08-29T00:00:00Z', expirationDate: '2027-08-29T00:00:00Z',
    credentialSubject: { anbieterId: 'vivodepot/ausgabestelle-pilot', anbieterName: 'Vivodepot Ausgabestelle (Pilot)', anbieterTyp: 'vivodepot/ausgabestelle', publicKeyJwk: ausgabeKp.pubJwk },
  };
  const ausstellerZertifikatJws = await page.evaluate(browserJwsSignieren, { payload: ausstellerCert, privJwk: ankerKp.privJwk });

  const kundeKp = await page.evaluate(browserEd25519SchluesselpaarErzeugen);
  const kundenCert = {
    '@context': ['https://www.w3.org/ns/credentials/v2'],
    type: ['VerifiableCredential', 'VivodepotProviderCredential'],
    issuer: 'did:web:vivodepot.de', issuanceDate: '2026-08-29T00:00:00Z', expirationDate: '2028-02-29T00:00:00Z',
    credentialSubject: { anbieterId: ANBIETER_ID, anbieterName: ANBIETER_NAME, anbieterTyp: 'verband/betreuung', publicKeyJwk: kundeKp.pubJwk },
  };
  const providerCredentialJws = await page.evaluate(browserJwsSignieren, { payload: kundenCert, privJwk: ausgabeKp.privJwk });
  const ankerJwk = { kty: 'OKP', crv: 'Ed25519', alg: 'Ed25519', x: ankerKp.pubJwk.x };

  const bereichModul = {
    modulTyp: 'bereich', moduleVersion: 1,
    herkunft: 'urn:bvfb:musterordner:pilot-v1',
    sprache: 'de', bereiche: { [BEREICH_ID]: { label: LABEL, icon: 'folder' } },
  };
  const modulSignaturJws = await page.evaluate(browserJwsSignieren, { payload: bereichModul, privJwk: kundeKp.privJwk });

  return page.evaluate(async ({ providerCredentialJws, modulSignaturJws, ausstellerZertifikatJws, ankerJwk }) => {
    const bundle = JSON.stringify({ providerCredentialJws, modulSignaturJws, ausstellerZertifikatJws });
    const einlass = await window.__vdOeffentlich.modulEinlassenGeprueft(bundle, window.__vdOeffentlich.ankerDaten(), { ankerJwk });
    window.__vdOeffentlich._bereichsModuleAusDepotAnmelden(window.__vdOeffentlich.ankerDaten());

    return {
      angenommen: einlass.angenommen,
      grund: einlass.grund,
      anzahlBereichsModule: (window.__vdOeffentlich.ankerDaten().bereichsModule || []).length,
    };
  }, { providerCredentialJws, modulSignaturJws, ausstellerZertifikatJws, ankerJwk });
}

// Kern-Verschluss (19.09.2026): `data` bare lieferte hier `typeof data !== 'undefined'` seit der
// Kapselung IMMER false, ohne zu werfen — derselbe tückische Fund wie bei `sessionHkdfKey` in
// tests/e2e/zug5-persistenz-rauchtest.spec.js (die Probe wäre still verwässert, nicht rot,
// geworden). Ersetzt durch den seit dem Verschluss gültigen Lesezugriff.
async function bereichsModulAnzahl(page) {
  return page.evaluate(() => {
    const d = window.__vdOeffentlich.ankerDaten();
    return (d && Array.isArray(d.bereichsModule)) ? d.bereichsModule.length : 0;
  });
}

test('[Persona·Berufsbetreuerin] zwei unabhängige Depots — kein Datenaustausch beim Wechsel', async ({ page }) => {
  await oeffneApp(page);
  await fsaAttrappeEinrichten(page);

  // ── Depot A anlegen, eintragen, Fremdmodul andocken, sichern+schließen ──────
  await depotAnlegen(page, { name: 'Anna Beispiel', pw: BETREUTE_A.pw });
  await identitaetUndVorsorgeEintragen(page, BETREUTE_A);

  const modulErgebnis = await bereichModulAndocken(page);
  expect(modulErgebnis.angenommen, 'Fremdmodul wird angenommen: ' + modulErgebnis.grund).toBe(true);
  expect(modulErgebnis.anzahlBereichsModule).toBe(1);

  const bytesA1 = await depotSchliessenUndBytesHolen(page);
  const dateiA = alsTmpDatei(bytesA1, 'betreuerin-a');

  // ── Depot B anlegen, ANDERE Werte, sichern+schließen ────────────────────────
  await depotAnlegen(page, { name: 'Bruno Muster', pw: BETREUTE_B.pw });
  await identitaetUndVorsorgeEintragen(page, BETREUTE_B);

  // Vorbedingung, direkt im laufenden In-Memory-Zustand: Depot B kennt das Fremdmodul aus
  // Depot A nicht — derselbe Prozess, derselbe Tab, aber `data` ist mit dem Anlegen von B
  // NEU aufgesetzt worden, nicht um A's Zustand herum weitergeschleppt.
  expect(await bereichsModulAnzahl(page), 'Depot B (frisch angelegt) darf das Fremdmodul aus Depot A nicht im Speicher tragen').toBe(0);

  const bytesB = await depotSchliessenUndBytesHolen(page);
  const dateiB = alsTmpDatei(bytesB, 'betreuerin-b');

  try {
    // ── Depot A wieder öffnen — NUR A-Werte, KEINE Spur von B ───────────────
    await depotOeffnen(page, dateiA, BETREUTE_A.pw);
    await identitaetUndVorsorgePruefen(page, BETREUTE_A);

    await page.evaluate(() => { window.__vdOeffentlich.renderSidebar(); });
    await expect(page.locator(`[data-sektor="${BEREICH_ID}"]`), 'Fremdmodul bleibt nach Sichern+Wiederöffnen in Depot A erhalten').toHaveCount(1);
    expect(await bereichsModulAnzahl(page)).toBe(1);

    // ── Zurück nach Hause, OHNE erneut zu speichern (nichts geändert) ───────
    await depotSchliessen(page);

    // ── Depot B wieder öffnen — NUR B-Werte, KEINE Spur von A, KEIN Fremdmodul ──
    await depotOeffnen(page, dateiB, BETREUTE_B.pw);
    await identitaetUndVorsorgePruefen(page, BETREUTE_B);

    await page.evaluate(() => { window.__vdOeffentlich.renderSidebar(); });
    await expect(page.locator(`[data-sektor="${BEREICH_ID}"]`), 'Depot B kennt das nur in A angedockte Fremdmodul nie').toHaveCount(0);
    expect(await bereichsModulAnzahl(page), 'Depot B: kein Fremdmodul im geladenen Modell').toBe(0);
  } finally {
    fs.rmSync(dateiA, { force: true });
    fs.rmSync(dateiB, { force: true });
  }
});
