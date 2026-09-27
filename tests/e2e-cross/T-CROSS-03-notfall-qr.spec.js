'use strict';
/* ════════════════════════════════════════════════════════════════════════
   T-CROSS-03 — Notfall-QR: Anti-Leck im echten Browser (U2-ADR-077)
   ────────────────────────────────────────────────────────────────────────
   FRÜHER (überholt): Bürger-App erzeugte einen KLARTEXT-Notfall-QR mit den
   Akut-Feldern (Blutgruppe, Allergien, Dauermedikation, ICD-10-Diagnosen);
   die Lese-App nahm ihn auf und zeigte die Notfall-Sicht. Dieser QR leckte am
   iPhone an die Google-Websuche (die Kamera hat kein Ziel für Klartext).

   JETZT (U2-ADR-077): Der Notfall-QR trägt eine KONTAKTE-vCard — nur Name +
   Telefonnummer der Notfallkontakte, KEIN Gesundheitsdatum. Er geht auf dem
   Telefon nativ in die Kontakte (offline), nicht in die Lese-App; die Gesundheits-
   Angaben stehen ausschließlich GEDRUCKT auf der Notfallkarte. Dieser Test beweist
   im echten Browser: der leckende Klartext-Generator `notfallKernText` ist ENTFERNT,
   und ein Gesundheitsfeld allein (Blutgruppe) erzeugt KEINEN QR-Payload — das Leck
   ist geschlossen. (Positiv-Seite — QR MIT Kontakt trägt Name+Nummer, kein Medizin —
   unit-belegt in export-qr.test.js; `getData/setData` sind bewusst nicht window-global.)

   QR-EXTRAKTION: über die App-eigene `notfallKontakteVcard()` (window-global, da
   `function`-Deklaration) — exakt der String, den der QR im Produktivbetrieb kodiert.
   Läuft am Mac / in CI. HTMLs unverändert. ⚠ nur Test-Daten.
   ════════════════════════════════════════════════════════════════════════ */
const { test, expect } = require('@playwright/test');
const H = require('./support/helpers');

const FIX = require('./fixtures/reise-3-notfall-qr.json');

test.describe('T-CROSS-03 Notfall-QR-Anti-Leck', () => {
  test('Der Notfall-QR trägt Kontakte (vCard), aber KEIN Gesundheitsdatum (U2-ADR-077)', async ({ browser }) => {
    const ctxA = await browser.newContext();
    const a = await ctxA.newPage();
    await H.kern.oeffnen(a);
    await H.kern.depotAnlegen(a, { name: FIX.ankerName, pw: FIX.passwort });

    // Ein Art.-9-Feld (Blutgruppe) im Gesundheits-Bereich setzen — es darf NICHT in den QR.
    await H.kern.oeffneSektor(a, 'health');
    await H.kern.setzeAuswahl(a, 'bloodType', FIX.akut.blutgruppe);

    // Der frühere Klartext-QR-Generator ist ENTFERNT (U2-ADR-077). Nur `function`-Deklarationen
    // liegen auf window; notfallKontakteVcard ist global (wie zuvor der QR-Text), notfallKernText weg.
    const generatorWeg = await a.evaluate(() => typeof window.notfallKernText === 'undefined');
    expect(generatorWeg, 'der leckende Klartext-Generator notfallKernText ist entfernt').toBe(true);

    // Der QR-Payload ist jetzt notfallKontakteVcard(). Blutgruppe ALLEIN (kein Kontakt mit Nummer)
    // → kein QR: das Gesundheitsdatum leckt an KEINEN Payload. (Die Positiv-Seite — QR MIT Kontakt
    // trägt Name+Nummer, aber kein Medizin — ist in export-qr.test.js unit-belegt; getData/setData
    // sind bewusst NICHT window-global, daher hier der UI-erreichbare Anti-Leck-Nachweis.)
    const vcard = await a.evaluate(() => window.__vdOeffentlich.notfallKontakteVcard());
    expect(vcard, 'Blutgruppe allein erzeugt keinen QR — kein Gesundheitsdatum im Payload').toBe('');
    expect(vcard, 'Blutgruppen-Wert taucht nirgends im QR-Payload auf').not.toContain(FIX.erwartet.blutgruppeAnzeige);

    await ctxA.close();
  });
});
