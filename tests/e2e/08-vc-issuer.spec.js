'use strict';
/* ════════════════════════════════════════════════════════════════════════
   E2E — VC-Issuer (Komponente 3) — Browser-Verifikation (Schicht 2)
   ────────────────────────────────────────────────────────────────────────
   Lädt vivodepot-vc-issuer.html über file:// (offline, kein Server) und fährt
   den Operations-Workflow durch: Trust-Authority-Private-Key (Test-Sentinel)
   importieren → rote Sentinel-Markierung → Anbieter-Daten setzen → Provider-
   Zertifikat ausstellen → visuelle Verifikation (F-6) erscheint, JWS-Compact
   vorhanden, Schlüssel nach der Operation freigegeben.

   Läuft auf dem Mac / in CI (Browser-Binaries nötig), analog zur restlichen
   Schicht-2-Suite. ⚠ Der genutzte Private-Key ist TEST-Material (Sentinel).
   ════════════════════════════════════════════════════════════════════════ */
const { test, expect } = require('@playwright/test');
const path = require('node:path');

const ISSUER_URL = 'file://' + path.join(__dirname, '..', '..', 'vivodepot-vc-issuer.html');

// TEST-ONLY Sentinel-Private-Key (passt zum eingebetteten TEST_SENTINEL_PUBLIC_JWK).
const SENTINEL_PRIVATE_JWK = {
  kty: 'OKP', crv: 'Ed25519', alg: 'Ed25519',
  d: '-XFGcY2Rd9PBxjiBwWXGsOdiSGj5Vf1L90l09_FW4NE',
  x: 'kmz5gD4oi4pZe0CdR7FhXahRnjZqrAkKCe0VNskNf60',
  key_ops: ['sign'], ext: true,
};
const ANBIETER_PUBLIC_JWK = {
  kty: 'OKP', crv: 'Ed25519', x: 'kmz5gD4oi4pZe0CdR7FhXahRnjZqrAkKCe0VNskNf60',
};

function jwkDatei(name, obj) {
  return { name: name, mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(obj, null, 2)) };
}

test('Issuer lädt offline, zeigt Trust-Authority-Banner ohne Konsolen-Fehler', async ({ page }) => {
  const fehler = [];
  page.on('console', (m) => { if (m.type() === 'error') fehler.push(m.text()); });
  page.on('pageerror', (e) => fehler.push(String(e)));

  await page.goto(ISSUER_URL);
  await expect(page.locator('.ta-banner')).toBeVisible();
  await expect(page.locator('.ta-badge')).toHaveText(/Trust-Authority-Modus/);
  await expect(page.locator('#issuerInput')).toHaveValue('did:web:vivodepot.de');
  expect(fehler, 'keine JS-/Konsolen-Fehler beim Laden').toEqual([]);
});

test('Sentinel-Key-Import zeigt rote Markierung (F-2/T-A-04)', async ({ page }) => {
  await page.goto(ISSUER_URL);
  await page.setInputFiles('#keyFile', jwkDatei('sentinel-private.jwk', SENTINEL_PRIVATE_JWK));
  await expect(page.locator('#keyStatus')).toHaveText(/Algorithmus: EdDSA/);
  await expect(page.locator('#sentinelFlag')).toBeVisible();
  await expect(page.locator('#sentinelFlag')).toHaveText(/Test-Sentinel-Key erkannt/);
});

test('Voller Ausstell-Workflow: VC ausstellen → F-7-Verifikation erscheint', async ({ page }) => {
  await page.goto(ISSUER_URL);

  await page.setInputFiles('#keyFile', jwkDatei('sentinel-private.jwk', SENTINEL_PRIVATE_JWK));
  await expect(page.locator('#keyStatus')).toHaveText(/geladen/);

  await page.fill('#anbieterId', 'institution/sparkasse-musterstadt-de');
  await page.fill('#anbieterName', 'Sparkasse Musterstadt');
  await page.fill('#anbieterTyp', 'institution/sparkasse-de');
  await page.fill('#pubKeyText', JSON.stringify(ANBIETER_PUBLIC_JWK));

  await page.click('#issueBtn');

  await expect(page.locator('#resultCard')).toBeVisible();
  await expect(page.locator('#vcView')).toContainText('Sparkasse Musterstadt');
  await expect(page.locator('#vcView')).toContainText('institution/sparkasse-musterstadt-de');
  await expect(page.locator('#vcView')).toContainText('EdDSA');
  await expect(page.locator('#sentinelResult')).toBeVisible();   // TEST-Markierung
  // JWS-Compact (drei Punkt-getrennte Teile) liegt vor.
  await expect(page.locator('#jwsOut')).toContainText('.');
  const jws = await page.locator('#jwsOut').textContent();
  expect(jws.split('.').length).toBe(3);
  // Audit-Log hat einen Eintrag.
  await expect(page.locator('#auditView')).toContainText('institution/sparkasse-musterstadt-de');
  // Private-Key-Disziplin: nach der Operation freigegeben. Die explizite „entfernt"-Meldung steht
  // im #issueStatus; #keyStatus fällt danach auf „Kein Schlüssel geladen." zurück (kein Key mehr
  // im Speicher). Beides zusammen belegt die Freigabe.
  await expect(page.locator('#issueStatus')).toContainText('aus dem Speicher entfernt');
  await expect(page.locator('#keyStatus')).toHaveText(/Kein Schlüssel geladen/);
});

test('Submission-Paket-Import füllt Anbieter-Felder (F-4/T-A-05)', async ({ page }) => {
  const beispiel = require(path.join(__dirname, '..', '..', 'docs', 'template-generator', 'beispiel-submission.json'));
  await page.goto(ISSUER_URL);
  await page.setInputFiles('#submissionFile', jwkDatei('beispiel-submission.json', beispiel));
  await expect(page.locator('#submissionStatus')).toHaveText(/Paket übernommen/);
  await expect(page.locator('#anbieterId')).toHaveValue('institution/pflegeheim-musterstadt-de');
  await expect(page.locator('#anbieterName')).toHaveValue('Seniorenresidenz Musterstadt');
  await expect(page.locator('#anbieterTyp')).toHaveValue('institution/pflegeheim-de');
});

/* ── Stapel-Ausstellung (F-8, Auftrag „Der neue Anker" Zug 4) ──────────────
   Genau der Teil, den der Node-Harnisch NICHT prüfen kann: die Bestätigung je
   Eintrag ist eine Checkbox, und ohne einen echten Klick darauf sagt die
   Funktion nichts über die Oberfläche aus. */
function stapelPaket(nr, ueberschreiben) {
  const beispiel = JSON.parse(JSON.stringify(
    require(path.join(__dirname, '..', '..', 'docs', 'template-generator', 'beispiel-submission.json'))));
  // Das Schema verlangt eine UUID für submissionId.
  beispiel.submissionId = '3f2504e0-4f89-41d3-9a0c-03050000000' + (nr % 10);
  beispiel.anbieter.anbieterId = 'institution/stapel-' + nr + '-de';
  beispiel.anbieter.anbieterName = 'Stapel-Anbieter ' + nr;
  return Object.assign(beispiel, ueberschreiben || {});
}

test('Stapel: nur bestätigte Einträge werden ausgestellt, der Rest steht benannt im Ergebnis (F-8)', async ({ page }) => {
  const fehler = [];
  page.on('pageerror', (e) => fehler.push(String(e)));
  await page.goto(ISSUER_URL);
  await page.setInputFiles('#keyFile', jwkDatei('sentinel-private.jwk', SENTINEL_PRIVATE_JWK));
  await expect(page.locator('#keyStatus')).toHaveText(/geladen|importiert/i);

  await page.setInputFiles('#stapelDatei', [
    jwkDatei('sub-1.json', stapelPaket(1)),
    jwkDatei('sub-2.json', stapelPaket(2)),
    jwkDatei('sub-3.json', { voellig: 'kaputt' }),
  ]);
  await expect(page.locator('#stapelStatus')).toHaveText(/3 Pakete geladen, 2 prüfbar/);
  // Der Sentinel-Stolperdraht warnt über den ganzen Stapel, nicht nur über den ersten.
  await expect(page.locator('#stapelSentinel')).toContainText(/alle 3 Einträge/);
  // Das kaputte Paket steht schon vor der Ausstellung als übersprungen in der Liste.
  await expect(page.locator('#stapelListe')).toContainText(/3 · wird übersprungen/);

  // F-6 je Eintrag: nur der erste wird bestätigt.
  await page.locator('#stapel-ok-1').check();
  await page.locator('#stapelAusstellenBtn').click();

  await expect(page.locator('#stapelStatus')).toHaveText(/1 ausgestellt, 2 übersprungen/);
  await expect(page.locator('#stapelErgebnis')).toContainText(/1 ausgestellt, 2 übersprungen, 3 insgesamt/);
  await expect(page.locator('#stapelErgebnis')).toContainText(/Nicht bestätigt \(F-7\)/);
  await expect(page.locator('#stapelErgebnis')).toContainText(/\[TEST-SENTINEL\]/);
  // Die Zwangsfreigabe gilt auch am Ende eines Stapels.
  await expect(page.locator('#stapelStatus')).toHaveText(/Schlüssel wurde aus dem Speicher entfernt/);
  expect(fehler, 'keine JS-Fehler im Stapel-Weg').toEqual([]);
});
