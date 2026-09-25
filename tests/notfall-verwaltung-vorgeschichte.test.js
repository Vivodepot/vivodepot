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
   `'A+'` löst über die Optionen-Tabelle auf das Label `'A +'` (mit
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

// Klassenattribut ist "notfall-verwaltung feldgruppen-karte" (Schritt 4: BEIDE Klassen am
// selben Element, damit die bestehende .feldgruppen-karte-Statuskarten-CSS greift) — die
// Suche toleriert beide Reihenfolgen/Nachbarklassen, verlangt aber die Klasse als eigenes Wort.
const DETAILS_RE = /<details class="[^"]*\bnotfall-verwaltung\b[^"]*"[^>]*>[\s\S]*?<\/details>/;

describe('[renderNotfall] Verwaltung & Vorgeschichte hinter <details>, akute Felder bleiben offen', () => {
  test('Krankenkasse+Nummer und Hausarzt stehen INNERHALB eines details-Blocks', async () => {
    const k = ladeKern();
    await k.V.depotAnlegen('pw');
    k.V.akteurSelbstErklaeren('Tester');
    k.V.sektorFeldSetzen('health', 'healthInsurance', { override: 'Gesetzlich' });
    k.V.sektorFeldSetzen('health', 'insuranceNumber', 'A123456789');
    k.V.sektorFeldSetzen('health', 'generalPractitioner', { override: 'Dr. Beispiel' });
    k.V.renderNotfall();
    const html = k.document.getElementById('content').innerHTML;
    const detailsBlock = html.match(DETAILS_RE);
    assert.ok(detailsBlock, 'kein details-Block für Verwaltung & Vorgeschichte gefunden');
    assert.match(detailsBlock[0], /Gesetzlich/);
    assert.match(detailsBlock[0], /A123456789/);
    assert.match(detailsBlock[0], /Dr\. Beispiel/);
  });

  test('Blutgruppe/Allergien/Notfallkontakt bleiben AUSSERHALB des details-Blocks, direkt sichtbar', async () => {
    const k = ladeKern();
    await k.V.depotAnlegen('pw');
    k.V.akteurSelbstErklaeren('Tester');
    k.V.sektorFeldSetzen('health', 'bloodType', 'A+');
    k.V.renderNotfall();
    const html = k.document.getElementById('content').innerHTML;
    const vorDemDetails = html.split(/<details class="[^"]*\bnotfall-verwaltung\b/)[0];
    assert.match(vorDemDetails, /A \+/, 'Blutgruppe muss vor/außerhalb des details-Blocks stehen, ohne Extra-Klick sichtbar');
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
