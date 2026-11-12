'use strict';
/* ════════════════════════════════════════════════════════════════════════
   D.1 (Rest-Sichten) — Notfall: Verwaltung & Vorgeschichte hinter <details>
   ────────────────────────────────────────────────────────────────────────
   Krankenkasse+Nummer (kv_art/kv_nummer) und Hausarzt sind Verwaltungs-/
   Vorgeschichte-Angaben, keine akuten Ernstfall-Angaben — sie wandern hinter
   ein <details> (Statuskarten-Stil aus Gruppe B, feldgruppenStatusText/
   .feldgruppen-karte wiederverwendet). Blutgruppe/Allergien/Notfallkontakt
   etc. bleiben unverändert flach sichtbar, ohne Extra-Klick.

   API-Abweichung von der ursprünglichen Vorlage: `kv_art` und `hausarzt` sind
   `typ: 'ref'`-Felder (institution/person) — `sektorFeldSetzen` mit einem
   rohen String wirft dort seit A43/U2-ADR-116 (Typ-Wächter). Geschrieben wird
   darum über `{ override: '<Text>' }`, wie an jeder anderen ref-Schreibstelle
   der Suite auch. `blutgruppe` ist `typ: 'auswahl'` — der gespeicherte Wert
   `'A+'` löst über die Optionen-Tabelle auf das Label `'A+'` (ohne
   Leerzeichen) auf; die Probe prüft entsprechend auf das gerenderte Label,
   nicht auf den rohen Schreibwert (dieselbe Konvention wie in
   tests/notfall-cache.test.js, Test 6).

   ROT-BEWEIS (gemessen VOR dem Fix, über KERN_HTML_PATH gegen eine unveränderte
   Kopie von vivodepot.html aus HEAD): der erste Test unten schlug dort fehl mit
   „kein details-Block für Verwaltung & Vorgeschichte gefunden" — renderNotfall()
   rendert am Vorher-Stand ALLE Felder flach, ohne <details class="notfall-
   verwaltung">. Die beiden anderen Tests waren an diesem Stand bereits grün
   (kein zufälliges Rot).
   ════════════════════════════════════════════════════════════════════════ */
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

/* Zielbild 06 (05.11.2026) löst den eingeklappten Block ab: die leere Karte „Krankenkasse & Hausarzt“ war eine der Abweichungen der
   Notfall-Sicht vom Zielbild. Krankenkasse, Nummer und Hausarzt stehen jetzt offen in der Gruppe „Gesundheit“, hinter den Angaben
   zur Behandlung; nichts ist eingeklappt. Rot-Beweis: am Kern vor dem Umbau (KERN_HTML_PATH auf den alten Stand) schlagen die
   beiden ersten Proben an (dort gibt es keine Gruppe „gesundheit“, und der details-Block steht noch da). */
const DETAILS_RE = /<details\b/;
const gruppe = (html, g) => (html.match(new RegExp('<section class="notfall-gruppe" data-notfall-gruppe="' + g + '"[\\s\\S]*?</section>')) || [''])[0];

describe('[renderNotfall] Krankenkasse & Hausarzt offen in der Gruppe Gesundheit, nichts eingeklappt', () => {
  test('Krankenkasse+Nummer und Hausarzt stehen offen in der Gruppe Gesundheit, kein details-Block', async () => {
    const k = ladeKern();
    await k.V.depotAnlegen('pw');
    k.V.akteurSelbstErklaeren('Tester');
    k.V.sektorFeldSetzen('health', 'healthInsurance', { override: 'Gesetzlich' });
    k.V.sektorFeldSetzen('health', 'insuranceNumber', 'A123456789');
    k.V.sektorFeldSetzen('health', 'generalPractitioner', { override: 'Dr. Beispiel' });
    k.V.renderNotfall();
    const html = k.document.getElementById('content').innerHTML;
    assert.ok(!DETAILS_RE.test(html), 'kein eingeklappter Block');
    const g = gruppe(html, 'akut');
    assert.ok(g, 'Gruppe Gesundheit gefunden');
    assert.match(g, /Gesetzlich/);
    assert.match(g, /A123456789/);
    assert.match(g, /Dr\. Beispiel/);
  });

  test('Blutgruppe und Allergien stehen in der Gruppe Gesundheit, vor Krankenkasse und Hausarzt', async () => {
    const k = ladeKern();
    await k.V.depotAnlegen('pw');
    k.V.akteurSelbstErklaeren('Tester');
    k.V.sektorFeldSetzen('health', 'bloodType', 'A+');
    k.V.sektorFeldSetzen('health', 'allergiesMedicationFoodOther', [{ text: 'Penicillin' }]);
    k.V.sektorFeldSetzen('health', 'generalPractitioner', { override: 'Dr. Beispiel' });
    k.V.renderNotfall();
    const g = gruppe(k.document.getElementById('content').innerHTML, 'akut');
    assert.match(g, /A\+/, 'Blutgruppe in der Gruppe Gesundheit');
    assert.ok(g.indexOf('Penicillin') >= 0 && g.indexOf('Penicillin') < g.indexOf('Dr. Beispiel'), 'Allergien vor dem Hausarzt');
    assert.ok(g.indexOf('A+') < g.indexOf('Dr. Beispiel'), 'Blutgruppe vor dem Hausarzt');
  });

  test('NOTFALL_KERN_FELDER bleibt unverändert (nur die Darstellung splittet, nicht die Datentabelle)', async () => {
    const k = ladeKern();
    const felder = k.V.NOTFALL_KERN_FELDER.map((e) => e.sektor + '.' + e.feld);
    assert.ok(felder.includes('health.healthInsurance'));
    assert.ok(felder.includes('health.insuranceNumber'));
    assert.ok(felder.includes('health.generalPractitioner'));
    assert.ok(felder.includes('health.bloodType'));
  });
});
