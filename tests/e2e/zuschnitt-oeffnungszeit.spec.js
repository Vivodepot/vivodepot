'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   Erhebung Verschlüsselungs-Zuschnitt, Zug 2 — die Öffnungszeit, GEMESSEN
   ────────────────────────────────────────────────────────────────────────────
   WARUM E2E UND NICHT GERECHNET: Der Auftrag verlangt es wörtlich — „gemessen am
   echten Browser, nicht gerechnet. Und einmal unter gedrosselter CPU." Der Grund
   steht im Auftrag daneben: die Zielgruppe hat keine neuen Geräte, und eine Datei,
   die auf altem Gerät mehrere Sekunden zum Öffnen braucht, ist keine Lösung, egal
   wie sauber die Krypto ist.

   WAS GEMESSEN WIRD: dasselbe Klartext-Volumen, einmal als EIN Ciphertext (heute)
   und einmal als 290 Einheiten (Feld-Stufe am Referenzdepot — die einzige Stufe,
   die Zug 1 besteht). Gemessen wird das ENTSCHLÜSSELN, denn das ist das Öffnen.

   WAS DIESE PROBE NICHT IST: sie misst nicht Vivodepot, sondern die WebCrypto-
   Kosten des Zuschnitts. Das ist Absicht — der Zerfall ist noch nicht gebaut, und
   eine Messung an einem nicht gebauten Ding wäre keine. Die Zahlen tragen darum
   genau eine Aussage: was 290 statt einem AES-GCM-Aufruf kosten, im selben Browser,
   auf demselben Gerät.

   KEINE SCHWELLE, KEIN FEHLSCHLAG. Die Probe bewertet nicht — der Auftrag verbietet
   eine Empfehlung ausdrücklich. Sie schlägt nur an, wenn die Messung selbst nicht
   zustandekommt (Ergebnis unplausibel oder Krypto nicht verfügbar).
   ════════════════════════════════════════════════════════════════════════════ */
const { test, expect } = require('@playwright/test');
const { KERN_URL } = require('./helpers.js');

/* Aus dem Referenzdepot gemessen (tools/zuschnitt-messen.js --zug2):
   24695 B Klartext, 290 Einheiten, 18845 B Nutzlast in den Einheiten. */
const KLARTEXT_BYTES = 24695;
const EINHEITEN = 290;
const RUNDEN = 20;   // je Messung, Median statt Einzelwert

async function messeImBrowser(page, drosselung) {
  if (drosselung > 1) {
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: drosselung });
  }
  return page.evaluate(async ({ klartextBytes, einheiten, runden }) => {
    const key = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
    const enc = new TextEncoder();

    const machChiffrat = async (text) => {
      const iv = crypto.getRandomValues(new Uint8Array(12));
      const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(text));
      return { iv, ct };
    };

    // EIN Ciphertext über das ganze Volumen.
    const ganz = await machChiffrat('x'.repeat(klartextBytes));

    // N Einheiten, zusammen dasselbe Volumen.
    const proEinheit = Math.max(1, Math.floor(klartextBytes / einheiten));
    const teile = [];
    for (let i = 0; i < einheiten; i++) teile.push(await machChiffrat('x'.repeat(proEinheit)));

    const median = (a) => { const s = a.slice().sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };

    /* `performance.now()` ist im Browser aus Sicherheitsgründen grob aufgelöst — ein
       einzelnes Entschlüsseln von 24 KB liegt darunter und misst sich als 0. Darum
       wird der heutige Fall WIEDERHOLT gemessen und geteilt; das ist dieselbe Arbeit,
       nur oft genug, um über der Auflösung zu liegen. */
    const WIEDERHOLUNGEN = 200;
    const einmal = [];
    for (let r = 0; r < runden; r++) {
      const t0 = performance.now();
      for (let k = 0; k < WIEDERHOLUNGEN; k++) {
        await crypto.subtle.decrypt({ name: 'AES-GCM', iv: ganz.iv }, key, ganz.ct);
      }
      einmal.push((performance.now() - t0) / WIEDERHOLUNGEN);
    }

    // Der Reihe nach — so öffnet ein Ladepfad, der jede Einheit braucht.
    const seriell = [];
    for (let r = 0; r < runden; r++) {
      const t0 = performance.now();
      for (const t of teile) await crypto.subtle.decrypt({ name: 'AES-GCM', iv: t.iv }, key, t.ct);
      seriell.push(performance.now() - t0);
    }

    // Alle auf einmal — die günstigste Bauart, die überhaupt möglich wäre.
    const parallel = [];
    for (let r = 0; r < runden; r++) {
      const t0 = performance.now();
      await Promise.all(teile.map(t => crypto.subtle.decrypt({ name: 'AES-GCM', iv: t.iv }, key, t.ct)));
      parallel.push(performance.now() - t0);
    }

    return {
      einCiphertextMs: median(einmal),
      einheitenSeriellMs: median(seriell),
      einheitenParallelMs: median(parallel),
    };
  }, { klartextBytes: KLARTEXT_BYTES, einheiten: EINHEITEN, runden: RUNDEN });
}

for (const drossel of [1, 6]) {
  test('[Zuschnitt·Zug2] Öffnungszeit bei CPU-Drosselung ×' + drossel, async ({ page }) => {
    /* Die Messung braucht `crypto.subtle`, und das gibt es nur im sicheren Kontext —
       `about:blank` hat keinen. Geladen wird darum dieselbe Datei wie im Alltag; die
       Seite selbst wird nicht bedient, sie liefert nur den Kontext. */
    await page.goto(KERN_URL);
    const r = await messeImBrowser(page, drossel);

    // eslint-disable-next-line no-console
    console.log('\n  ── Öffnungszeit, CPU ×' + drossel + ' — ' + KLARTEXT_BYTES + ' B, ' + EINHEITEN + ' Einheiten'
      + '\n     EIN Ciphertext (heute):     ' + r.einCiphertextMs.toFixed(2) + ' ms'
      + '\n     ' + EINHEITEN + ' Einheiten, seriell:      ' + r.einheitenSeriellMs.toFixed(2) + ' ms'
      + '   (×' + (r.einheitenSeriellMs / r.einCiphertextMs).toFixed(0) + ')'
      + '\n     ' + EINHEITEN + ' Einheiten, parallel:     ' + r.einheitenParallelMs.toFixed(2) + ' ms'
      + '   (×' + (r.einheitenParallelMs / r.einCiphertextMs).toFixed(0) + ')\n');

    expect(r.einCiphertextMs, 'die Messung muss überhaupt zustandekommen').toBeGreaterThan(0);
    expect(r.einheitenSeriellMs, 'N Einheiten können nicht schneller sein als eine').toBeGreaterThan(r.einCiphertextMs);
  });
}

/* ════════════════════════════════════════════════════════════════════════════
   Nachmessung Zug 3.1 — trägt die Anker-Sitzung die Ableitung aller Adressen?
   ────────────────────────────────────────────────────────────────────────────
   Die Idee, die gemessen wird: statt des Klartext-Feldnamens trägt jede Einheit
   ein Pseudonym — ein HMAC-SHA256 über `sektorId.feldId` unter einem aus dem
   Anker-Schlüssel abgeleiteten Adress-Schlüssel. Wer die Datei ohne Passwort
   findet, sähe Hex-Adressen und sonst nichts.

   Die Bürgerin muss dafür bei JEDEM Öffnen alle 528 Adressen ableiten können.
   Gemessen wird genau das — an derselben gedrosselten CPU wie die Öffnungszeit.
   ════════════════════════════════════════════════════════════════════════════ */

const ADRESSEN = 528;

for (const drossel of [1, 6]) {
  test('[Zuschnitt·Zug3] Adress-Ableitung (HMAC) bei CPU-Drosselung ×' + drossel, async ({ page }) => {
    await page.goto(KERN_URL);
    if (drossel > 1) {
      const cdp = await page.context().newCDPSession(page);
      await cdp.send('Emulation.setCPUThrottlingRate', { rate: drossel });
    }
    const r = await page.evaluate(async ({ adressen, runden }) => {
      const roh = crypto.getRandomValues(new Uint8Array(32));
      const enc = new TextEncoder();
      const namen = [];
      for (let i = 0; i < adressen; i++) namen.push('bereich' + (i % 12) + '.feld_' + i);
      const median = (a) => { const s = a.slice().sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };

      const messe = [];
      for (let r0 = 0; r0 < runden; r0++) {
        const t0 = performance.now();
        // Der Adress-Schlüssel wird EINMAL je Sitzung importiert, dann N-mal benutzt.
        const key = await crypto.subtle.importKey('raw', roh, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
        for (const n of namen) await crypto.subtle.sign('HMAC', key, enc.encode(n));
        messe.push(performance.now() - t0);
      }
      return { alleAdressenMs: median(messe) };
    }, { adressen: ADRESSEN, runden: 10 });

    // eslint-disable-next-line no-console
    console.log('\n  ── Adress-Ableitung, CPU ×' + drossel + ' — ' + ADRESSEN + ' Pseudonyme (HMAC-SHA256)'
      + '\n     einmal je Sitzung: ' + r.alleAdressenMs.toFixed(2) + ' ms\n');

    expect(r.alleAdressenMs, 'die Messung muss zustandekommen').toBeGreaterThan(0);
  });
}

/* ════════════════════════════════════════════════════════════════════════════
   DIE SCHARFE FASSUNG (Zug 3 des Zerfall-Bauauftrags · A345, 19.08.2026)
   ────────────────────────────────────────────────────────────────────────────
   Die Messungen oben sind SYNTHETISCH: sie stellen ein Chiffrat gegen N Chiffrate
   und beantworten damit die Frage aus A331/A332, ob die Zerlegung an sich teuer
   ist. Sie sagen nichts über den Weg, den die Bürgerin geht.

   Seit dem 19.08. ist der Schreibweg scharf. Gemessen wird darum, was jetzt
   wirklich passiert: `depotLaden` über einen echten v4-Umschlag, gegen `depotLaden`
   über einen echten v3-Umschlag desselben Depots — beide an derselben CPU.

   DER VORBEHALT AUS A334 GILT UNVERÄNDERT UND GEHÖRT DAZUGESAGT: die
   CPU-Drosselung greift bei PBKDF2 NICHT (gemessen 38 ms ungedrosselt gegen 39 ms
   bei ×6). Sie verlangsamt die JavaScript-Ausführung, nicht die native Krypto. Was
   die Drosselung hier zeigt, ist also der ANTEIL, den der Zerfall an JavaScript
   hinzufügt — und genau der ist die Frage. Die absolute Zahl auf einem echten
   alten Gerät sagt sie nicht.
   ════════════════════════════════════════════════════════════════════════════ */
for (const drossel of [1, 6]) {
  test('Öffnungszeit an der SCHARFEN Fassung, CPU ×' + drossel + ' — v4 gegen v3, echtes depotLaden', async ({ page }) => {
    test.setTimeout(180_000);
    await page.goto(KERN_URL, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => typeof window.__vdOeffentlich.depotAnlegen === 'function' && typeof window.__vdOeffentlich.depotSerialisierenV3 === 'function');

    if (drossel > 1) {
      const cdp = await page.context().newCDPSession(page);
      await cdp.send('Emulation.setCPUThrottlingRate', { rate: drossel });
    }

    const r = await page.evaluate(async () => {
      const PW = 'Oeffnungszeit-scharf-2026!';
      await window.__vdOeffentlich.depotAnlegen(PW);
      /* Ein Depot in realistischer Fülle — sonst misst man einen leeren Umschlag. */
      window.__vdOeffentlich.ankerDaten().sektoren.identity = { givenName: 'Maria', familyName: 'Mustermann', birthDate: '1954-03-11' };
      window.__vdOeffentlich.ankerDaten().sektoren.health = { bloodType: '0 negativ' };
      window.__vdOeffentlich.ankerDaten().sektoren.housing = { tenancyAgreementFixedTermUntil: '2028-06-30' };
      window.__vdOeffentlich.ankerDaten().menschen = [{ id: 'p1', name: 'Anna Schmidt' }, { id: 'p2', name: 'Jonas Schmidt' }];

      const v4 = await window.__vdOeffentlich.depotSerialisieren();
      const v3 = await window.__vdOeffentlich.depotSerialisierenV3();

      const median = (a) => { const s = a.slice().sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };
      const messe = async (umschlag, runden) => {
        const werte = [];
        for (let i = 0; i < runden; i++) {
          const kopie = JSON.parse(JSON.stringify(umschlag));
          const t0 = performance.now();
          await window.__vdOeffentlich.depotLaden(kopie, PW);
          werte.push(performance.now() - t0);
        }
        return median(werte);
      };

      // Wenige Runden: jede kostet eine volle PBKDF2-Ableitung (600 000 Runden).
      const v3Ms = await messe(v3, 5);
      const v4Ms = await messe(v4, 5);
      return {
        v3Ms, v4Ms,
        einheiten: Object.keys(v4.einheiten).length,
        v3Bytes: JSON.stringify(v3).length,
        v4Bytes: JSON.stringify(v4).length,
      };
    });

    // eslint-disable-next-line no-console
    console.log('\n  ── Öffnungszeit an der scharfen Fassung, CPU ×' + drossel
      + '\n     v3 (ein Chiffrat):        ' + r.v3Ms.toFixed(1) + ' ms'
      + '\n     v4 (' + r.einheiten + ' Feld-Einheiten): ' + r.v4Ms.toFixed(1) + ' ms'
      + '\n     Aufschlag:                ' + (r.v4Ms - r.v3Ms).toFixed(1) + ' ms'
      + '  (Faktor ' + (r.v4Ms / r.v3Ms).toFixed(2) + ')'
      + '\n     Dateigröße v3 → v4:       ' + r.v3Bytes + ' B → ' + r.v4Bytes + ' B'
      + '  (Faktor ' + (r.v4Bytes / r.v3Bytes).toFixed(2) + ')'
      + '\n     Vorbehalt A334: die Drosselung greift bei PBKDF2 nicht — gezeigt ist der JavaScript-Anteil.\n');

    expect(r.v3Ms, 'die v3-Messung muss zustandekommen').toBeGreaterThan(0);
    expect(r.v4Ms, 'die v4-Messung muss zustandekommen').toBeGreaterThan(0);
    expect(r.einheiten, 'der v4-Umschlag muss Einheiten tragen').toBeGreaterThan(0);
  });
}
