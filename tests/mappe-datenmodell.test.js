'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Test — Dokumenten-Mappe Schritt 1 (U2-ADR-013): Datenmodell + ref:mappe
   ────────────────────────────────────────────────────────────────────────
   data.mappe[] (krypto-agnostisch, inline in `data`), Maschine zum Anlegen/
   Lesen/Entfernen, ref:mappe als dritter Entitätstyp mit Auflösung und
   Dereferenzierung beim Löschen. Urheberschaft schlank: nur `hinzugefuegtAm`,
   kein „wer" (Freigabe 30.05.).
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

const PW = 'pw';

test('leeresDepot trägt data.mappe als leeres Array', () => {
  const { V } = ladeKern();
  const d = V.leeresDepot();
  assert.ok(Array.isArray(d.mappe), 'mappe ist ein Array');
  assert.equal(d.mappe.length, 0);
});

test('mappeEintragHinzufuegen: legt Eintrag an, nur Datum (kein „wer"), Default-Bereich', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen(PW);
  const id = V.mappeEintragHinzufuegen({ dateiname: 'ausweis.jpg', mime: 'image/jpeg', groesse: 12345, inhalt: 'data:image/jpeg;base64,AAA' });
  const e = V.mappeEintrag(id);
  assert.ok(e, 'Eintrag gefunden');
  assert.equal(e.dateiname, 'ausweis.jpg');
  assert.equal(e.beschriftung, 'ausweis.jpg', 'Beschriftung fällt auf den Dateinamen zurück');
  assert.equal(e.bereich, V.MAPPE_BEREICH_DEFAULT, 'Default-Bereich „allgemein"');
  assert.equal(e.bereich, 'allgemein');
  assert.equal(e.sensibel, false, 'sensibel default false');
  // Urheberschaft schlank: nur das Datum, KEIN „wer".
  assert.ok(/^\d{4}-\d{2}-\d{2}$/.test(e.hinzugefuegtAm), 'hinzugefuegtAm ist ein Datum');
  assert.equal(e.akteur, undefined, 'kein Akteur/„wer" am Eintrag');
  assert.equal(e.urheber, undefined, 'kein Urheber-Stempel am Eintrag');
});

test('mappeEintragHinzufuegen: Beschriftung, Bereich und sensibel werden übernommen', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen(PW);
  const id = V.mappeEintragHinzufuegen({ beschriftung: 'Patientenverfügung', bereich: 'vorsorge', sensibel: true, dateiname: 'pv.pdf', mime: 'application/pdf' });
  const e = V.mappeEintrag(id);
  assert.equal(e.beschriftung, 'Patientenverfügung');
  assert.equal(e.bereich, 'vorsorge');
  assert.equal(e.sensibel, true);
});

test('mappeName: override > Beschriftung > leer; fehlender Eintrag → leer (kein toter Verweis)', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen(PW);
  const id = V.mappeEintragHinzufuegen({ beschriftung: 'Testament-Scan' });
  assert.equal(V.mappeName({ ref: id }), 'Testament-Scan', 'Auflösung über Beschriftung');
  assert.equal(V.mappeName({ ref: id, override: 'Eigener Name' }), 'Eigener Name', 'override hat Vorrang');
  assert.equal(V.mappeName({ ref: 'gibtsnicht' }), '', 'fehlender Eintrag → leer');
  assert.equal(V.mappeName(null), '', 'kein Ref → leer');
});

test('entitaetAnzeige dispatcht mappe (dritter Entitätstyp)', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen(PW);
  const id = V.mappeEintragHinzufuegen({ beschriftung: 'Vollmacht.pdf' });
  assert.equal(V.entitaetAnzeige({ ref: id }, 'mappe'), 'Vollmacht.pdf');
});

test('mappeEntfernen: entfernt + dereferenziert Sektor-Felder, die darauf zeigen', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen(PW);
  V.akteurSelbstErklaeren('B');
  const id = V.mappeEintragHinzufuegen({ beschriftung: 'Ausweis-Kopie' });
  // ein Sektor-Feld referenziert den Mappen-Eintrag (ref:mappe).
  V.sektorFeldSetzen('identity', 'profilePhotoCoverPage', { ref: id });
  const d1 = V.getData();
  assert.deepEqual(d1.sektoren.identity.profilePhotoCoverPage, { ref: id }, 'Ref gesetzt');
  // Löschen dereferenziert.
  assert.equal(V.mappeEntfernen(id), true);
  assert.equal(V.mappeEintrag(id), null, 'Eintrag weg');
  const d2 = V.getData();
  assert.equal(d2.sektoren.identity.profilePhotoCoverPage, null, 'Sektor-Ref dereferenziert (kein toter Verweis)');
});

test('depotGroesseBytes wächst mit einem Mappen-Eintrag; groesseLesbar formatiert', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen(PW);
  const vorher = V.depotGroesseBytes();
  V.mappeEintragHinzufuegen({ dateiname: 'x.bin', inhalt: 'data:;base64,' + 'A'.repeat(5000) });
  const nachher = V.depotGroesseBytes();
  assert.ok(nachher > vorher + 4000, 'Größe wächst mit dem Inhalt');
  // U2-ADR-024: unter 1 KB menschenlesbar „< 1 KB" statt Roh-Bytes (Bytes sind keine Bürger-Einheit).
  assert.equal(V.groesseLesbar(500), '< 1 KB');
  assert.equal(V.groesseLesbar(0), '< 1 KB');
  assert.equal(V.groesseLesbar(2048), '2 KB');
  assert.equal(V.groesseLesbar(3 * 1024 * 1024), '3.0 MB');
});

test('Persistenz-Rundlauf: Mappe fährt mit encryptDepot/decryptDepot (krypto-agnostisch)', async () => {
  const { V } = ladeKern();
  const umschlag = await V.depotAnlegen(PW);
  V.mappeEintragHinzufuegen({ beschriftung: 'Befund', bereich: 'gesundheit', inhalt: 'data:image/png;base64,XYZ' });
  const ser = await V.depotSerialisieren();
  // frischer Kontext: laden und prüfen, dass der Mappen-Eintrag zurückkommt.
  const { V: V2 } = ladeKern();
  await V2.depotLaden(ser, PW);
  const mappe = V2.getData().mappe;
  assert.equal(mappe.length, 1);
  assert.equal(mappe[0].beschriftung, 'Befund');
  assert.equal(mappe[0].inhalt, 'data:image/png;base64,XYZ', 'Datei-Bytes byte-gleich zurück');
});
