'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Klasse-B-Wächter — Proben (Auftrag 19.09.2026, im Zug der 37-rote-
   Proben-Klassifizierung e2e-37-rote-klassen-2026-09-19.md)
   ────────────────────────────────────────────────────────────────────────
   Rot-Beweis: eine GEPFLANZTE Spec mit rohem Pfad wird rot (Wortlaut).
   ════════════════════════════════════════════════════════════════════════ */
const test = require('node:test');
const assert = require('node:assert/strict');
const P = require('../tools/klasse-b-rohes-geruest-pruefen.js');

test('[Klasse-B-Wächter·Rot-Beweis] eine gepflanzte Spec mit `path.join(REPO_ROOT, "vivodepot.html")` wird gefunden', () => {
  const inhalt = [
    "const path = require('node:path');",
    "const REPO_ROOT = path.join(__dirname, '..', '..');",
    "const fp = req.url === '/' ? path.join(REPO_ROOT, 'vivodepot.html') : null;",
  ].join('\n');
  assert.equal(P.rohTrefferInDatei(inhalt), 1, 'die gepflanzte Fundstelle muss als roh zählen');
});

test('[Klasse-B-Wächter·Rot-Beweis] eine gepflanzte Spec mit `__dirname + zwei \'..\' + vivodepot.html` (file://-Mutant) wird gefunden', () => {
  const inhalt = "const KERN = 'file://' + path.join(__dirname, '..', '..', 'vivodepot.html');";
  assert.equal(P.rohTrefferInDatei(inhalt), 1, 'die gepflanzte Fundstelle muss als roh zählen');
});

test('[Klasse-B-Wächter·Gegenprobe] `path.join(r.ordner, "vivodepot.html")` (gebackenes Produkt) ist KEIN Fund', () => {
  const inhalt = "const url = 'file://' + path.join(r.ordner, 'vivodepot.html');";
  assert.equal(P.rohTrefferInDatei(inhalt), 0, 'ein konfektionieren()-Ausgabeordner ist kein Klasse-B-Fund');
});

test('[Klasse-B-Wächter·Gegenprobe] GEBACKENE_PRODUKT_PFADE in derselben Zeile schützt vor Fehlalarm', () => {
  const inhalt = [
    "const { GEBACKENE_PRODUKT_PFADE } = require('./global-setup.js');",
    "const GEBACKENE_KERN_DATEI = GEBACKENE_PRODUKT_PFADE['privat-de'];",
    "const fp = istNav ? GEBACKENE_KERN_DATEI : path.join(REPO_ROOT, url);",
  ].join('\n');
  // Das Fenster um 'vivodepot.html' existiert hier gar nicht mehr (der Pfad heißt
  // GEBACKENE_KERN_DATEI) — dieselbe Probe wie am echten Fix in
  // tests/e2e/u2-adr-224-boot-read-absicherung.spec.js, hier isoliert nachgestellt.
  assert.equal(P.rohTrefferInDatei(inhalt), 0);
});

test('[Klasse-B-Wächter·Gegenprobe] der Marker GERÜST-TEST nimmt eine ganze Datei aus, auch bei rohem Pfad', () => {
  const inhalt = [
    '/* GERÜST-TEST: prüft das nackte Gerüst selbst (bereicheAlle()===0), roh ist hier Absicht. */',
    "const KERN = path.join(__dirname, '..', '..', 'vivodepot.html');",
  ].join('\n');
  assert.equal(P.rohTrefferInDatei(inhalt), 0, 'eine sich selbst erklärende Gerüst-Test-Datei ist keine Klasse-B-Fundstelle');
});

test('[Klasse-B-Wächter·Mechanik] urteil() ist rot bei einer neuen, unbekannten Datei (DRIFT)', () => {
  const grundlinie = { summe: 0, jeDatei: {} };
  const gemessen = { summe: 1, jeDatei: { 'neue-spec.spec.js': 1 } };
  const u = P.urteil(gemessen, grundlinie);
  assert.equal(u.gruen, false);
  assert.ok(u.befunde.some((b) => b.includes('DRIFT') && b.includes('neue-spec.spec.js')));
});

test('[Klasse-B-Wächter·Mechanik] urteil() ist rot, wenn eine BEKANNTE Datei mehr rohe Treffer trägt als vorher', () => {
  const grundlinie = { summe: 1, jeDatei: { 'alte-spec.spec.js': 1 } };
  const gemessen = { summe: 2, jeDatei: { 'alte-spec.spec.js': 2 } };
  const u = P.urteil(gemessen, grundlinie);
  assert.equal(u.gruen, false);
  assert.ok(u.befunde.some((b) => b.includes('alte-spec.spec.js') && b.includes('1 → 2')));
});

test('[Klasse-B-Wächter·Mechanik] urteil() ist GRÜN, wenn eine bekannte Datei WENIGER rohe Treffer trägt (Arbeit erledigt)', () => {
  const grundlinie = { summe: 2, jeDatei: { 'alte-spec.spec.js': 2 } };
  const gemessen = { summe: 1, jeDatei: { 'alte-spec.spec.js': 1 } };
  const u = P.urteil(gemessen, grundlinie);
  assert.equal(u.gruen, true, 'ein Rückgang ist grün — das Sinken selbst ist nicht die Aufgabe dieses Wächters');
});

test('[Klasse-B-Wächter·Grundlinie] der gemessene Bestand deckt sich exakt mit der Grundlinie (Positivliste, kein Anstieg)', () => {
  const grundlinie = P.grundlinieLesen();
  const gemessen = P.messen();
  const u = P.urteil(gemessen, grundlinie);
  assert.ok(u.gruen, 'Klasse-B-Wächter rot:\n' + u.befunde.join('\n'));
});

test('[Klasse-B-Wächter·Selbstbezug] tests/e2e/helpers.js und global-setup.js sind keine Spec — nicht Teil der Messung', () => {
  const grundlinie = P.grundlinieLesen();
  assert.equal(grundlinie.jeDatei['helpers.js'], undefined);
  assert.equal(grundlinie.jeDatei['global-setup.js'], undefined);
});
