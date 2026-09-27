'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   Zerfall Zug 0b — liegen Kreis-Name und Ort-Hinweis im Klartext?
   ────────────────────────────────────────────────────────────────────────────
   DER BEFUND (A333 + Nachtrag zur Entscheidung, N4): `angehoerigen_passwort_ort`
   liegt heute im Klartext neben `ct`, damit die Vertrauensperson ihn VOR der
   Passwort-Eingabe lesen kann. Überträgt man das Vorbild auf sechs Kreise, stehen
   sechs Namen im Klartext in der Datei — „Erben", „Steuerberater", „Bestatter".
   Wer sie findet, weiss ohne jedes Passwort, dass eine Nachlassplanung besteht und
   wer beteiligt ist. Das ist dasselbe Leck, das die pseudonymen Adressen gerade
   geschlossen haben, an anderer Stelle wieder geöffnet.

   WAS HIER GEMESSEN WIRD, ist der Preis der Alternative: Liegen die Slots
   VERSCHLÜSSELT, findet ein Empfänger sein Fach nur, indem er sein Passwort gegen
   die Einträge probiert — jeder Versuch eine PBKDF2-Ableitung mit 600 000 Runden
   (`ANG_PBKDF2_ITERATIONEN`, `vivodepot.html:16517`).

   Gemessen wird am echten Browser und auf sechsfach gedrosselter CPU, wie in
   A331/A332 — die Zielgruppe hat keine neuen Geräte.

   KEINE SCHWELLE, KEINE EMPFEHLUNG. Der Auftrag verlangt drei Formen und drei
   Zahlen; die Wahl ist eine Produktentscheidung.
   ════════════════════════════════════════════════════════════════════════════ */
const { test, expect } = require('@playwright/test');
const { KERN_URL } = require('./helpers.js');

const ITERATIONEN = 600000;   // = ANG_PBKDF2_ITERATIONEN, fest seit 06.07.2026
const EINTRAEGE = 6;          // sechs Kreise — die Zahl aus der C2-Anforderung

for (const drossel of [1, 6]) {
  test('[Zerfall·Zug0b] Fach-Suche über PBKDF2 bei CPU-Drosselung ×' + drossel, async ({ page }) => {
    await page.goto(KERN_URL);
    if (drossel > 1) {
      const cdp = await page.context().newCDPSession(page);
      await cdp.send('Emulation.setCPUThrottlingRate', { rate: drossel });
    }
    const r = await page.evaluate(async ({ iterationen, runden }) => {
      const enc = new TextEncoder();
      const basis = await crypto.subtle.importKey('raw', enc.encode('ein-vertrauens-passwort'), 'PBKDF2', false, ['deriveKey']);
      const salt = crypto.getRandomValues(new Uint8Array(16));
      const median = (a) => { const s = a.slice().sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };

      const messe = [];
      for (let i = 0; i < runden; i++) {
        const t0 = performance.now();
        await crypto.subtle.deriveKey(
          { name: 'PBKDF2', salt, iterations: iterationen, hash: 'SHA-256' },
          basis, { name: 'AES-GCM', length: 256 }, false, ['decrypt']);
        messe.push(performance.now() - t0);
      }
      return { einVersuchMs: median(messe) };
    }, { iterationen: ITERATIONEN, runden: 5 });

    const schlechtester = r.einVersuchMs * EINTRAEGE;
    // eslint-disable-next-line no-console
    console.log('\n  ── Fach-Suche, CPU ×' + drossel + ' — PBKDF2 ' + ITERATIONEN + ' Runden'
      + '\n     ein Versuch (= ein Eintrag):        ' + r.einVersuchMs.toFixed(0) + ' ms'
      + '\n     bester Fall (Fach ist der erste):   ' + r.einVersuchMs.toFixed(0) + ' ms'
      + '\n     schlechtester Fall (' + EINTRAEGE + ' Einträge):  ' + schlechtester.toFixed(0) + ' ms'
      + '   = ' + (schlechtester / 1000).toFixed(1) + ' s\n');

    expect(r.einVersuchMs, 'die Messung muss zustandekommen').toBeGreaterThan(0);
  });
}
