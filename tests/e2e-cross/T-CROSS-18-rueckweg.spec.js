'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   T-CROSS-18 — der verschlüsselte Rückweg über die Oberfläche
   (Kette, Auftrag 8, Ebene 2 und 3 des Testkonzepts — 20.08.2026)
   ────────────────────────────────────────────────────────────────────────────
   Die Node-Proben messen die Verfahren; DIESE Reise misst, dass ein Mensch den
   Weg geht: die Bürgerin beantwortet eine Anfrage in ihrer Anwendung, die
   Antwort wird als Datei übergeben, und die INSTITUTION öffnet sie in der
   Lese-App — ohne etwas zu installieren.

   Die Datei-Übergabe ist die ehrliche Nachbildung des „per E-Mail / USB-Stick"
   -Schritts (Transfer-Simulation, s. support/helpers.js) — ohne Versand, ohne
   Netz.
   ════════════════════════════════════════════════════════════════════════════ */
const { test, expect } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');
const { URLS, frischerTmp, tmpAufraeumen, downloadNachTmp, kern, lesen } = require('./support/helpers.js');

const ANFRAGE = {
  modulTyp: 'anfrage', anfrageVersion: 1,
  von: 'Pflegeheim Sonnenhof gGmbH',
  anbieterId: 'heim/sonnenhof',
  zweck: 'Aufnahme in die vollstationäre Pflege ab 01.10.2026',
  grundlage: '§ 630f BGB und der von Ihnen unterzeichnete Heimvertrag',
  vorgang: 'AUF-2026-0815',
  gueltigBis: '2099-12-31',
  felder: [
    { kennung: 'identity.givenName', zweck: 'Anrede im Aufnahmebogen', pflicht: true },
    { kennung: 'health.insuranceNumber', zweck: 'Abrechnung mit der Kasse', pflicht: true },
  ],
  antwort: { art: 'einmalpasswort', an: 'aufnahme@sonnenhof.example.de' },
};
const EINMAL_PW = 'vorgang-einmal-2026';

/* Die Antwort der Bürgerin entsteht über die OBERFLÄCHE der Bürger-App — dieselbe Reise wie in der ersten Probe.
   Früher riefen zwei Proben `antwortVerschluesselnPasswort` am Fenster auf; die Funktion liegt seit dem Kern-Verschluss
   hinter der IIFE, und Krypto-Innenleben steht bewusst nicht auf der öffentlichen Fläche. `mitNummer` = false lässt die
   Versichertennummer aus: dann ist die Antwort eine TEILANTWORT (Pflichtangabe fehlt). Liefert { antwortPfad, b, buerger }. */
async function antwortUeberOberflaeche(browser, tmp, anfrage, { mitNummer = true } = {}) {
  const buerger = await browser.newContext({ acceptDownloads: true });
  const b = await buerger.newPage();
  await kern.oeffnen(b);
  await kern.depotAnlegen(b, { name: 'Hedwig Brandt', pw: 'e2e-passwort-123' });
  if (mitNummer) {
    await kern.oeffneSektor(b, 'health');
    await b.fill('[data-edit="insuranceNumber"]', 'A123456780');
    await b.keyboard.press('Tab');
    await b.waitForTimeout(200);
  }
  await b.click('[data-uebergabe-protokoll]');
  await b.waitForSelector('#anfrage-empfangen', { state: 'visible' });
  await b.click('#anfrage-empfangen');
  await b.fill('#anfrage-text', JSON.stringify(anfrage));
  await b.click('#m-ok');
  await b.waitForSelector('#anfrage-antworten', { state: 'visible' });
  await b.click('#anfrage-antworten');
  await b.waitForSelector('#anfrage-bestaetigt', { state: 'visible' });
  await b.check('#anfrage-bestaetigt');
  await b.click('#m-ok');
  await b.waitForSelector('#modal-inhalt', { state: 'visible' });
  await b.click('#m-ok');
  await b.waitForSelector('#antwort-pw', { state: 'visible' });
  await b.fill('#antwort-pw', EINMAL_PW);
  const antwortPfad = await downloadNachTmp(b, tmp, () => b.click('#m-ok'));
  return { antwortPfad, b, buerger };
}

test('T-CROSS-18 die Bürgerin beantwortet, die Institution öffnet — verschlüsselt, über beide Oberflächen', async ({ browser }) => {
  const tmp = frischerTmp('rueckweg');
  try {
    /* ── 1 · Bürger-App: Depot anlegen, Anfrage annehmen, antworten ───────── */
    const buerger = await browser.newContext({ acceptDownloads: true });
    const b = await buerger.newPage();
    await kern.oeffnen(b);
    await kern.depotAnlegen(b, { name: 'Hedwig Brandt', pw: 'e2e-passwort-123' });

    // Die gefragte Gesundheits-Angabe eintragen (der Vorname steht schon aus der Anlage).
    await kern.oeffneSektor(b, 'health');
    await b.fill('[data-edit="insuranceNumber"]', 'A123456780');
    await b.keyboard.press('Tab');
    await b.waitForTimeout(200);

    // Die Anfrage annehmen — über den Ort aus Auftrag 4, kein neuer Menüpunkt.
    await b.click('[data-uebergabe-protokoll]');
    await b.waitForSelector('#anfrage-empfangen', { state: 'visible' });
    await b.click('#anfrage-empfangen');
    await b.fill('#anfrage-text', JSON.stringify(ANFRAGE));
    await b.click('#m-ok');
    await b.waitForSelector('#anfrage-antworten', { state: 'visible' });

    // Antworten: erst der Bestätigungsschritt (ungeprüft), dann das Einmalpasswort.
    await b.click('#anfrage-antworten');
    await b.waitForSelector('#anfrage-bestaetigt', { state: 'visible' });
    await expect(b.locator('#anfrage-bestaetigt')).not.toBeChecked();
    await b.check('#anfrage-bestaetigt');
    await b.click('#m-ok');
    // Übersicht „das wird herausgegeben" → fortfahren
    await b.waitForSelector('#modal-inhalt', { state: 'visible' });
    await b.click('#m-ok');
    // Der eigene Schritt für das Einmalpasswort.
    await b.waitForSelector('#antwort-pw', { state: 'visible' });
    await b.fill('#antwort-pw', EINMAL_PW);
    const antwortPfad = await downloadNachTmp(b, tmp, () => b.click('#m-ok'));

    /* ── 2 · Die Datei ist ein CHIFFRAT — nichts Lesbares steht darin ─────── */
    const roh = fs.readFileSync(antwortPfad, 'utf8');
    const umschlag = JSON.parse(roh);
    expect(umschlag.dateiTyp, 'die Antwort trägt ihren Typ').toBe('vivodepot-antwort');
    expect(umschlag.verfahren).toBe('einmalpasswort');
    expect(umschlag.vorgang, 'der Empfänger sieht, worauf das die Antwort ist').toBe('AUF-2026-0815');
    for (const w of ['Hedwig', 'A123456780']) {
      expect(roh.includes(w), 'kein Feldwert steht im Klartext: ' + w).toBe(false);
    }
    await buerger.close();

    /* ── 3 · Lese-App: die Institution öffnet, ohne etwas zu installieren ─── */
    const institution = await browser.newContext({ acceptDownloads: true });
    const l = await institution.newPage();
    await lesen.oeffnen(l);
    await l.setInputFiles('#datei-input', antwortPfad);
    await l.waitForSelector('#antwort-pw', { state: 'visible' });

    // Zuerst der Fehlerfall — und danach die Gegenprobe im selben Lauf.
    await l.fill('#antwort-pw', 'falsches-passwort');
    await l.click('#antwort-form button[type="submit"]');
    await expect(l.locator('#antwort-fehler')).toBeVisible();

    await l.fill('#antwort-pw', EINMAL_PW);
    await l.click('#antwort-form button[type="submit"]');
    await l.waitForSelector('#antwort-blatt', { state: 'visible' });

    // Das Blatt trägt die Angaben, den Vorgang UND die Grundlage.
    await expect(l.locator('#antwort-meta')).toContainText('AUF-2026-0815');
    await expect(l.locator('#antwort-grundlage')).toContainText('§ 630f BGB');
    await expect(l.locator('#antwort-felder')).toContainText('Hedwig');
    await expect(l.locator('#antwort-felder')).toContainText('Anrede im Aufnahmebogen');

    /* UND DER FUND DIESER REISE, gemessen statt vermutet: die Versichertennummer ist
       schema-sensibel. Die Bürgerin hat sie im Opt-out-Dialog NICHT ausdrücklich
       freigegeben — also geht sie nicht mit. Das Blatt sagt beides: dass es eine
       Teilantwort ist, und dass eine Angabe zurückgehalten wurde. Vor Auftrag 8 sah eine
       so beschnittene Antwort VOLLSTÄNDIG aus, weil ein zurückgehaltenes Feld weder in
       `felder` noch in `fehlend` stand. */
    await expect(l.locator('#antwort-felder')).not.toContainText('A123456780');
    await expect(l.locator('#antwort-teilantwort')).toBeVisible();
    await expect(l.locator('#antwort-zurueckgehalten')).toBeVisible();

    // Weitergeben als Datensatz — die Fachanwendung liest JSON, keinen Bildschirm.
    const klarPfad = await downloadNachTmp(l, tmp, () => l.click('#btn-antwort-weiter'));
    const klar = JSON.parse(fs.readFileSync(klarPfad, 'utf8'));
    expect(klar.anfrage.vorgang).toBe('AUF-2026-0815');
    expect(klar.vollstaendig, 'eine zurückgehaltene Pflichtangabe macht die Antwort unvollständig').toBe(false);
    expect(klar.zurueckgehalten.pflicht, 'und der Empfänger erfährt, dass es eine war').toBe(1);
    await institution.close();
  } finally {
    tmpAufraeumen(tmp);
  }
});

test('T-CROSS-18 eine TEILANTWORT sagt es dem Empfänger auf dem Blatt', async ({ browser }) => {
  const tmp = frischerTmp('rueckweg-teil');
  try {
    // Der Umschlag entsteht über die Oberfläche der Bürger-App. Gefragt sind Vorname und Telefon (Pflicht); das Telefon
    // hat die Bürgerin nicht eingetragen — es steht in der Antwort unter „fehlend“. (Die Versichertennummer taugt hier nicht:
    // sie ist sensibel und wird zurückgehalten, nicht als fehlend gemeldet.)
    const anfrageTeil = Object.assign({}, ANFRAGE, { felder: [ANFRAGE.felder[0], { kennung: 'identity.telephone', zweck: 'Rückruf', pflicht: true }] });
    const { antwortPfad, buerger } = await antwortUeberOberflaeche(browser, tmp, anfrageTeil, { mitNummer: false });
    await buerger.close();
    const umschlag = JSON.parse(fs.readFileSync(antwortPfad, 'utf8'));

    const datei = path.join(tmp, 'antwort-teil.json');
    fs.writeFileSync(datei, JSON.stringify(umschlag, null, 2));

    const institution = await browser.newContext();
    const l = await institution.newPage();
    await lesen.oeffnen(l);
    await l.setInputFiles('#datei-input', datei);
    await l.waitForSelector('#antwort-pw', { state: 'visible' });
    await l.fill('#antwort-pw', EINMAL_PW);
    await l.click('#antwort-form button[type="submit"]');
    await l.waitForSelector('#antwort-blatt', { state: 'visible' });

    // DIE TEURERE HÄLFTE: der Empfänger erfährt, dass es keine ganze Auskunft ist.
    await expect(l.locator('#antwort-teilantwort')).toBeVisible();
    await expect(l.locator('#antwort-fehlend')).toContainText('Telefon');
    await institution.close();
  } finally {
    tmpAufraeumen(tmp);
  }
});

test('T-CROSS-18 der Kamera-Weg ist da — und sagt ehrlich, wenn dieser Browser ihn nicht tragen kann', async ({ browser }) => {
  const institution = await browser.newContext();
  const l = await institution.newPage();
  await lesen.oeffnen(l);
  // Der Weg steht auf dem Eingangsschirm — er kam mit Auftrag 8 zurück (U2-ADR-085 §5).
  await expect(l.locator('#weg-kamera')).toBeVisible();
  await l.click('#weg-kamera');
  await l.waitForSelector('#btn-kamera-start', { state: 'visible' });
  // Die Kamera wird NUR auf Klick geöffnet — vor dem Klick läuft nichts.
  const vorher = await l.evaluate(() => !!kameraStrom);
  expect(vorher, 'keine Kamera ohne ausdrücklichen Klick').toBe(false);

  const kannLesen = await l.evaluate(() => typeof BarcodeDetector !== 'undefined');
  await l.click('#btn-kamera-start');
  if (!kannLesen) {
    // EHRLICHKEIT STATT STILLE: fehlt der Browser-Leser, wird das GESAGT und der
    // Einfüge-Weg bleibt. Kein Nachladen aus dem Netz, nie.
    await expect(l.locator('#kamera-fehler')).toBeVisible();
    await expect(l.locator('#kamera-fehler')).toContainText('einfügen');
  } else {
    await l.waitForTimeout(500);
  }
  await institution.close();
});

test('T-CROSS-18 der QR wird als BILD gelesen — echte QR-Grafik, echter Browser-Leser, mehrteilig', async ({ browser }) => {
  /* ══ SO WEIT TRÄGT DIE MASCHINE, UND DIE GRENZE GEHÖRT GENANNT ══════════════════════════
     Was hier läuft: eine ECHTE QR-GRAFIK (die inline qrcode-generator-Bibliothek der
     Bürger-App zeichnet sie, derselbe Weg wie für die Notfallkarte), gelesen vom ECHTEN
     QR-Leser des Browsers (`BarcodeDetector`, dieselbe Klasse, die der Kamera-Pfad benutzt) —
     mehrteilig, in falscher Reihenfolge, bis zum entschlüsselten Datensatz.

     Was hier NICHT läuft und in keiner Maschine laufen kann: Optik. Kameraschärfe, Papier,
     Tageslicht, eine zitternde Hand. Die Geräte-Probe mit einer gewöhnlichen Handykamera
     bleibt eine Auflage des Auftrags und ist NICHT durch diese Probe erfüllt — sie ist im
     Bericht als offen geführt. */
  /* Die Antwort entsteht über die Oberfläche der Bürger-App (nur der Vorname wird gefragt, er steht aus der Anlage);
     die QR-GRAFIK zeichnet die inline-Bibliothek der Bürger-App (window.qrcode) — derselbe Weg wie für die Notfallkarte.
     Das Zerlegen in Rahmen „VDQR|gruppe|i/n|nutzlast“ ist das Format von `qrTeilePacken` (Kern-intern, hinter dem
     Verschluss); es wird hier in wenigen Zeilen nachgebaut — dieselbe Form, die die Lese-App liest. */
  const tmp = frischerTmp('rueckweg-qr');
  const anfrageVorname = Object.assign({}, ANFRAGE, { felder: [ANFRAGE.felder[0]] });
  const { antwortPfad, b, buerger } = await antwortUeberOberflaeche(browser, tmp, anfrageVorname);
  const umschlagText = JSON.stringify(JSON.parse(fs.readFileSync(antwortPfad, 'utf8')));
  const bilder = await b.evaluate((text) => {
    const teile = [];
    for (let i = 0; i < text.length; i += 400) teile.push(text.slice(i, i + 400));
    return teile.map((t, idx) => {
      const qr = window.qrcode(0, 'M');
      qr.addData('VDQR|test01|' + (idx + 1) + '/' + teile.length + '|' + t);
      qr.make();
      return qr.createDataURL(6, 8);          // echte QR-Grafik als data:image/gif
    });
  }, umschlagText);
  expect(bilder.length, 'die Antwort zerfällt in mehrere QR-Bilder').toBeGreaterThan(1);
  await buerger.close();

  const institution = await browser.newContext();
  const l = await institution.newPage();
  await lesen.oeffnen(l);
  const ergebnis = await l.evaluate(async ([datenUrls, pw]) => {
    if (typeof BarcodeDetector === 'undefined') return { uebersprungen: 'kein BarcodeDetector' };
    const leser = new BarcodeDetector({ formats: ['qr_code'] });
    const gelesen = [];
    for (const url of datenUrls.slice().reverse()) {          // RÜCKWÄRTS gescannt
      const bild = new Image();
      bild.src = url;
      await bild.decode();
      const treffer = await leser.detect(bild);
      for (const t of treffer) gelesen.push(String(t.rawValue || ''));
    }
    const z = qrTeileZusammensetzen(gelesen);
    if (!z.fertig) return { fertig: false, grund: z.grund, fehlend: z.fehlend, gelesen: gelesen.length };
    const ds = await antwortEntschluesselnPasswort(JSON.parse(z.text), pw);
    return { fertig: true, gelesen: gelesen.length, felder: ds.felder.length, wert: ds.felder[0].wert, vorgang: ds.anfrage.vorgang };
  }, [bilder, EINMAL_PW]);

  expect(ergebnis.uebersprungen, 'dieser Browser trägt den QR-Leser').toBeUndefined();
  expect(ergebnis.fertig, 'die Serie setzt sich aus echten QR-Grafiken zusammen: ' + JSON.stringify(ergebnis)).toBe(true);
  expect(ergebnis.gelesen).toBe(bilder.length);
  expect(ergebnis.felder).toBe(1);
  expect(ergebnis.wert).toBe('Hedwig');
  expect(ergebnis.vorgang).toBe('AUF-2026-0815');
  await institution.close();
});
