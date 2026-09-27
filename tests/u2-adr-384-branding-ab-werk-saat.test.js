'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   U2-ADR-384 — Vivodepots eigene Marke wird Ab-Werk-Saat (Auftrag,
   08.09.2026), wie Sprache (U2-ADR-367) und Rechtsraum. Die Messung, die zu
   diesem Zug führte: kein konfektioniertes Produkt dockte Vivodepots eigenes
   Branding als geprüftes Modul — `_markeName()`/`_markeAnzeigeAnwenden()`
   gaben hartcodiert 'Vivodepot' zurück, ohne je durch `brandingModulPruefen`
   zu laufen. Genau die Sonderbehandlung, die U2-ADR-040 ausschließt.

   „Konfektionieren ist nicht Einlassen": Vivodepot backt seine eigene Marke
   beim Bauen ein, ohne Signatur. Der signierte Einlassweg (EINLASS_REGISTER,
   `nurGeprueft: true` fürs Branding-Register) bleibt für FREMDE Module, die
   eine Bürgerin hinzufügt — UNANGETASTET. „Ohne Signatur" heißt nicht
   "ungeprüft": `brandingModulPruefen` läuft — dieselbe Funktion wie für ein
   fremdes Modul, kein Geruest-Zwilling nötig (anders als bei Sprache/'de':
   `brandingModulPruefen` kennt keine reservierte `herkunft`).
   ════════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

/* ── Der Kern-Wert selbst ─────────────────────────────────────────────────── */

test('[ADR-384] AB_WERK_BRANDING ist ein echter, eingefrorener Branding-Datensatz', () => {
  const { V } = ladeKern();
  assert.ok(V.AB_WERK_BRANDING, 'AB_WERK_BRANDING fehlt im Kern-Export');
  assert.equal(V.AB_WERK_BRANDING.modulTyp, 'branding');
  assert.equal(V.AB_WERK_BRANDING.herkunft, 'vivodepot');
  assert.equal(V.AB_WERK_BRANDING.name, 'Vivodepot');
  assert.ok(Object.isFrozen(V.AB_WERK_BRANDING), 'AB_WERK_BRANDING muss eingefroren sein — dieselbe Bauart wie AB_WERK_TEXTSATZ_DE');
});

/* ── Positivkontrolle: die Saat besteht die ECHTE Prüfung ────────────────────
   „Ohne Signatur heißt nicht ungeprüft" — der Beweis, dass brandingModulPruefen
   auf die Ab-Werk-Saat tatsächlich angewandt wird, nicht nur behauptet. */
test('[ADR-384·Positivkontrolle] AB_WERK_BRANDING besteht brandingModulPruefen ohne einen einzigen Verwurf', () => {
  const { V } = ladeKern();
  const geprueft = V.brandingModulPruefen(V.AB_WERK_BRANDING);
  assert.equal(geprueft.gueltig, true, 'AB_WERK_BRANDING müsste die echte Prüfung bestehen');
  assert.deepEqual(geprueft.verworfene, [], 'kein Feld darf verworfen werden — sonst weicht Anzeige von Daten ab');
  assert.equal(geprueft.branding.name, 'Vivodepot');
  assert.equal(geprueft.branding.domain, 'vivodepot.de');
  assert.equal(geprueft.branding.farbePrimaer, '#4F6539');
  assert.equal(geprueft.branding.farbeSekundaer, '#8a6d3a');
  assert.equal(geprueft.branding.schriftart, 'Inter');
});

test('[ADR-384·Positivkontrolle] _AB_WERK_BRANDING (das Ergebnis der Boot-Prüfung) ist gesetzt, nicht null', () => {
  const { V } = ladeKern();
  assert.ok(V._AB_WERK_BRANDING, '_AB_WERK_BRANDING ist null — die Boot-Prüfung ist am eigenen Datensatz gescheitert');
  assert.equal(V._AB_WERK_BRANDING.name, 'Vivodepot');
});

/* ── Rot-Beweis: ein kaputtes Ab-Werk-Branding wird abgelehnt, nicht angewandt ─
   Der Kern der dritten Auflage: kein Sonderpfad, der Garbage durchließe. */
test('[ADR-384·Rot-Beweis] _abWerkBrandingErmitteln lehnt ein strukturell kaputtes Branding ab — liefert null, keine Teilwerte', () => {
  const { V } = ladeKern();
  const kaputt = Object.assign({}, V.AB_WERK_BRANDING, { farbePrimaer: 'kein-hex-wert' });
  // Erste Hälfte: brandingModulPruefen selbst verwirft nur das kaputte Feld (bestehende, geprüfte
  // Nachsicht) — das Modul AN SICH bleibt gültig, weil name/domain/… weiterhin gesetzt sind.
  const geprueft = V.brandingModulPruefen(kaputt);
  assert.equal(geprueft.gueltig, true, 'ein einzelnes kaputtes Feld verwirft nicht das ganze Modul (bestehende Regel)');
  assert.equal(geprueft.branding.farbePrimaer, null, 'die kaputte Farbe darf NICHT durchrutschen');
  assert.ok(geprueft.verworfene.some((v) => v.schluessel === 'farbePrimaer'),
    'der Verwurf muss benannt sein, nicht nur still fehlen');

  // Zweite Hälfte: ein VOLLSTÄNDIG unbrauchbares Ab-Werk-Branding (kein einziges gültiges Feld)
  // liefert null aus _abWerkBrandingErmitteln — der Ab-Werk-Pfad wendet dann NICHTS an, statt
  // ein leeres oder halbes Objekt anzuwenden.
  const vollstaendigKaputt = { modulTyp: 'branding', moduleVersion: 1, herkunft: 'vivodepot',
    farbePrimaer: 'x', farbeSekundaer: 'y', schriftart: '', logo: 'kein-data-uri', name: '', domain: 'nicht_eine_domain' };
  const ergebnis = V._abWerkBrandingErmitteln(vollstaendigKaputt);
  assert.equal(ergebnis, null,
    'ein vollständig kaputtes Ab-Werk-Branding muss null liefern — nicht angewandt, nicht halb angewandt');
});

test('[ADR-384·Rot-Beweis] _abWerkBrandingErmitteln lehnt ein Nicht-Objekt ab, statt zu werfen', () => {
  const { V } = ladeKern();
  assert.equal(V._abWerkBrandingErmitteln(null), null);
  assert.equal(V._abWerkBrandingErmitteln(undefined), null);
  assert.equal(V._abWerkBrandingErmitteln('kein-objekt'), null);
});

/* ── Der hartcodierte Literal-Rückfall existiert nur noch als LETZTES Sicherheitsnetz ──
   Er darf nicht mehr die einzige Quelle sein — geprüft, indem AB_WERK_BRANDING selbst
   der Weg ist, den _markeName ohne offenes Depot tatsächlich nimmt. */
test('[ADR-384] _markeName() ohne offenes Depot liest über die geprüfte Ab-Werk-Saat, nicht nur ein Literal', () => {
  const { V } = ladeKern();
  assert.equal(V._markeName(), V._AB_WERK_BRANDING.name);
  assert.equal(V._markeDomain(), V._AB_WERK_BRANDING.domain);
});

/* ── Kein zweiter Weg an modulEinlassen vorbei ────────────────────────────────
   Auflage 1: `nurGeprueft:true` fürs Branding-Register bleibt unangetastet — die
   Saat hat keinen Aufrufer im signierten Einlassweg. Ratsche wie bei U2-ADR-285
   (Sprache 'de'): tests/u2-adr-285-textsatz-geruest-modul.test.js hält dasselbe
   Muster für Sprache fest — hier dieselbe Prüfung für AB_WERK_BRANDING. */
test('[ADR-384] AB_WERK_BRANDING hat keinen Aufrufer im Kern außer der eigenen Ab-Werk-Stelle', () => {
  const fs = require('node:fs');
  const path = require('node:path');
  const quelle = fs.readFileSync(path.join(__dirname, '..', 'vivodepot.html'), 'utf8');
  const treffer = quelle.split('AB_WERK_BRANDING').length - 1;
  // Erwartete Stellen: die Konstante selbst (Definition + Kopf-Kommentar-Erwähnung),
  // `_abWerkBrandingErmitteln(AB_WERK_BRANDING)` und `_AB_WERK_BRANDING` (Ergebnis-Variable,
  // dreimal gelesen: _markeName, _markeDomain, _markeAnzeigeAnwenden). Kein Treffer darf in
  // modulEinlassen/EINLASS_REGISTER liegen.
  assert.ok(treffer >= 5, 'AB_WERK_BRANDING scheint gar nicht mehr verdrahtet zu sein — Erhebung eingebrochen?');
  const einlassBereich = quelle.slice(quelle.indexOf('function modulEinlassen'), quelle.indexOf('function modulEinlassen') + 6000);
  assert.equal(einlassBereich.indexOf('AB_WERK_BRANDING'), -1,
    'AB_WERK_BRANDING taucht im modulEinlassen-Bereich auf — der signierte Weg darf sie nie sehen');
});
