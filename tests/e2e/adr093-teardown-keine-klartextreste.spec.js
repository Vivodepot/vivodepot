'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   U2-ADR-093 — Teardown-Architektur: keine Klartext-Reste nach dem Verlassen.
   ────────────────────────────────────────────────────────────────────────────
   DIE ZUSICHERUNG, WÖRTLICH AUS DEM ADR (§7 Konformität):
     „Beim Verlassen einer echten Sitzung über den Eingangsschirm bleiben keine
      Klartext-Reste im DOM oder in `data` — geprüft am Referenzdepot."
   Ihr `zustand` stand seit dem 20.07.2026 auf `nicht_pruefbar`, mit dieser
   Begründung (05.08., per grep belegt): `_eingangsschirmDomAufraeumen` wird von
   keinem Test referenziert, und eine Node-Probe bräuchte „eine echte
   Browser-DOM-Sitzung mit gerendertem `#content`/Modal, die die aktuelle
   Test-Infrastruktur nicht aufbaut".

   DIE INFRASTRUKTUR BAUT SIE INZWISCHEN AUF. Gemessen am 17.08.2026 (Glied 10a
   der Nachtkette): `tests/e2e/zug5-persistenz-rauchtest.spec.js` fährt den Pfad
   `#tb-marke → geheZuZuhause → flowSchliessenWarnungEchteSitzung → #m-ok` in
   einem echten Browser. **Was fehlte, war nicht die Sitzung, sondern die
   Zusicherung** — keine Probe schaute nach, was danach noch dasteht.

   DIE POSITIVKONTROLLE IST DER HALBE TEST: geprüft wird zuerst, dass der Marker
   VOR dem Verlassen wirklich im DOM UND in `data` steht. Ohne sie wäre „nicht
   gefunden" nicht von „nie dagewesen" zu unterscheiden — und eine Probe, die
   auch bei kaputtem Aufbau grün bleibt, ist keine.

   DIE ABGRENZUNG, DIE DER ADR SELBST ZIEHT: eine passwortlose VORSCHAU-Sitzung
   wird bewusst NICHT abgeräumt (sonst ginge ungesicherte Eingabe beim blossen
   „zurück" verloren). Die zweite Probe hält genau diese Grenze fest — sonst
   liesse sich die erste erfüllen, indem man pauschal alles löscht.
   ════════════════════════════════════════════════════════════════════════════ */
const { test, expect } = require('@playwright/test');
const { oeffneApp, depotAnlegen, oeffneSektor, setzeFeld } = require('./helpers');

// Ein Wert, der in keiner Beschriftung, keinem Beispiel und keinem Hinweis vorkommt —
// sonst fände die Suche ihn auch nach vollständigem Abräumen wieder. Getragen wird er von
// `identity.givenName`: ein Feld, das nach dem Anlegen sicher gerendert ist (drei andere
// Specs benutzen es) und zusätzlich in der Depot-Pille der Topbar erscheint.
const MARKER = 'ADR093-KLARTEXT-4711';

async function markerSetzen(page) {
  await oeffneSektor(page, 'identity');
  await setzeFeld(page, 'givenName', MARKER);
}

test('nach dem Verlassen einer ECHTEN Sitzung steht der Klartext weder im DOM noch in data', async ({ page }) => {
  await oeffneApp(page);
  await depotAnlegen(page, { pw: 'adr093-passwort-123' });
  await markerSetzen(page);

  // ── Positivkontrolle: ohne sie prüft der Rest nichts ──────────────────────
  const vorher = await page.evaluate((m) => ({
    imDom: document.body.innerHTML.includes(m),
    imData: !!(typeof window.__vdOeffentlich.ankerDaten() !== 'undefined' && window.__vdOeffentlich.ankerDaten() && JSON.stringify(window.__vdOeffentlich.ankerDaten()).includes(m)),
  }), MARKER);
  expect(vorher.imDom, 'Aufbau: der Marker muss vor dem Verlassen im DOM stehen').toBe(true);
  expect(vorher.imData, 'Aufbau: der Marker muss vor dem Verlassen in `data` stehen').toBe(true);

  // ── Der Weg der Bürgerin: über die Wortmarke zurück zum Eingangsschirm ────
  await page.click('#tb-marke');
  await page.locator('#m-ok').waitFor({ state: 'visible' });
  await page.click('#m-ok');
  await page.waitForSelector('#w-anlass', { state: 'visible', timeout: 10000 });

  // ── Die Zusicherung selbst ────────────────────────────────────────────────
  const nachher = await page.evaluate((m) => ({
    imDom: document.body.innerHTML.includes(m),
    imData: !!(typeof window.__vdOeffentlich.ankerDaten() !== 'undefined' && window.__vdOeffentlich.ankerDaten() && JSON.stringify(window.__vdOeffentlich.ankerDaten()).includes(m)),
    contentLeer: (document.getElementById('content') || {}).innerHTML === '',
    modalLeer: (document.getElementById('modal-inhalt') || {}).innerHTML === '',
  }), MARKER);

  expect(nachher.imDom, 'Klartext-Rest im DOM nach dem Verlassen').toBe(false);
  expect(nachher.imData, 'Klartext-Rest in `data` nach dem Verlassen').toBe(false);
  // Die beiden Stellen, die `_eingangsschirmDomAufraeumen` ausdrücklich leert.
  expect(nachher.contentLeer, '#content ist geleert').toBe(true);
  expect(nachher.modalLeer, '#modal-inhalt ist geleert').toBe(true);
});

test('eine gefüllte VORSCHAU wird nicht still verworfen — die Grenze, die der ADR zieht', async ({ page }) => {
  /* Ohne diese Probe liesse sich die erste erfüllen, indem beim Verlassen pauschal alles
     gelöscht wird. Genau das darf nicht passieren.

     WAS DIE GRENZE WIRKLICH IST — gemessen, nicht aus dem ADR-Text übernommen: eine LEERE
     Vorschau wird beim Verlassen ohne Rückfrage verworfen (kein Passwort, keine Datei, nichts
     zu verlieren). Eine GEFÜLLTE nicht: `geheZuZuhause` faltet erst die offenen Eingaben,
     prüft `vorschauHatDaten(data)` und zeigt die Warnung. Erst „Vorschau verlassen" verwirft.

     Der ADR-Satz „eine Vorschau-Sitzung bleibt bewusst erhalten" beschreibt das Verhalten von
     `renderWelcome` (dort greift `if (data && !imVorschau())`) — nicht den Ausgang des ganzen
     Weges. Beides stimmt; die Probe hält die Stelle fest, an der es sich entscheidet.

     Der Wert wird direkt in `data` gesetzt, und das ist begründet: die Bereichs-Sicht rendert
     in der Vorschau KEINE Eingabefelder (gemessen: null `[data-edit]`), und der gestempelte
     Schreibweg `sektorFeldSetzen` wirft dort „Kein Sitzungs-Akteur gesetzt" — in der Vorschau
     gibt es bewusst keinen Akteur. Das Setzen ist AUFBAU; geprüft wird der KLICKWEG. */
  await oeffneApp(page);
  await page.click('#w-anfangen');
  await page.waitForSelector('#app.an', { state: 'attached' });

  await page.evaluate((m) => { window.__vdOeffentlich.ankerDaten().sektoren.identity = window.__vdOeffentlich.ankerDaten().sektoren.identity || {}; window.__vdOeffentlich.ankerDaten().sektoren.identity.givenName = m; }, MARKER);
  const gefuellt = await page.evaluate(() => window.__vdOeffentlich.imVorschau() && window.__vdOeffentlich.vorschauHatDaten(window.__vdOeffentlich.ankerDaten()));
  expect(gefuellt, 'Aufbau: eine GEFÜLLTE Vorschau-Sitzung').toBe(true);

  // Verlassen versuchen → die Warnung muss kommen, nicht der stille Verwurf.
  await page.click('#tb-marke');
  await expect(page.locator('#modal-rueck.an')).toHaveCount(1);
  await expect(page.locator('#modal-inhalt')).toContainText(/Vorschau|gespeichert/i);

  // Abbrechen → die Eingabe ist noch da. Das ist die eigentliche Zusicherung.
  await page.click('#m-abbr');
  const nochDa = await page.evaluate((m) => !!(window.__vdOeffentlich.ankerDaten() && JSON.stringify(window.__vdOeffentlich.ankerDaten()).includes(m)), MARKER);
  expect(nochDa, 'nach dem Abbrechen bleibt die ungesicherte Vorschau-Eingabe erhalten').toBe(true);
});
