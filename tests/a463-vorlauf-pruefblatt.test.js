'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   A463 · Ein Vorlauf am Prüfblatt, nicht nur der Ablauftag
   ────────────────────────────────────────────────────────────────────────────
   Alle abgelaufsbasierten Ampeln teilten sich EIN festes 30-Tage-Fenster
   (`ERINNERUNG_TERMIN_FENSTER_TAGE`) für die Gelb-Schwelle. Ein
   Aufenthaltstitel, der drei Monate vor Ablauf verlängert werden muss, sah
   das elf Wochen zu spät gelb.

   `vorlaufTage` ist eine Katalog-Eigenschaft (SEKTOREN.identitaet.
   standardDokumente[typ:'residencePermit']), live nachgeschlagen an beiden
   Prüfblatt-Quellen (Dokument-Registrierung UND generisches Gültigkeits-
   Feld) — kein Depotwert, keine Migration, gilt auch für Bestandsdaten.
   Der Ablauftag selbst bleibt hart (rot bei Überschreiten), unabhängig vom
   Vorlauf.
   ════════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

const PW = 'pw-a463';
const HEUTE = new Date('2026-08-22T10:00:00Z');

// Schnitt Glied 3 (22.08.2026, A448, U2-ADR-161): `aufenthaltstitel_gueltig` ist als Skalarfeld
// entfallen — `aufenthaltstitel` ist jetzt eine Liste, und `prueftermineFelder` liest deren
// `gueltig`-Unterfeld direkt aus dem Eintrag (nicht mehr über `feldGueltigkeit`), s.
// tests/korb1-mehrwertig-pruefermine.test.js. Der Vorlauf (`vorlaufTage`) hängt weiterhin am
// Katalog-Eintrag `felder[0] = {feldId:'residencePermit', unterfeldId:'gueltig'}`.
async function depotMitAufenthaltstitel(gueltigBis) {
  const { V } = ladeKern();
  await V.depotAnlegen(PW);
  V.akteurSelbstErklaeren('Prüfung');
  V.listenEintragHinzufuegen('identity', 'residencePermit', { system: '', validUntil: gueltigBis });
  return V;
}

test('[A463] der Katalog trägt den Vorlauf am Aufenthaltstitel, sonst nirgends an identitaet', () => {
  const { V } = ladeKern();
  const kat = V.SEKTOR_BY_ID.identity.standardDokumente;
  const at = kat.find((k) => k.typ === 'residence-permit');
  const pa = kat.find((k) => k.typ === 'national-id-card');
  assert.equal(at.vorlaufTage, 90);
  assert.equal(pa.vorlaufTage, undefined, 'Gegenprobe: der Personalausweis bleibt beim globalen Fenster');
});

test('[A463·Rot-Beweis] 89 Tage vor Ablauf ist gelb (vorher, mit 30-Tage-Fenster, wäre es grün gewesen)', async () => {
  const V = await depotMitAufenthaltstitel('2026-11-19');   // 89 Tage nach HEUTE
  const zeile = V.prueftermineFelder(HEUTE).find((z) => z.sektorId === 'identity' && /Aufenthaltstitel/.test(z.name));
  assert.ok(zeile, 'keine Prüfblatt-Zeile gefunden');
  assert.equal(zeile.stufe, 'gelb');
});

test('[A463·Gegenprobe] 91 Tage vor Ablauf ist noch grün — der Vorlauf hat eine Grenze', async () => {
  const V = await depotMitAufenthaltstitel('2026-11-21');   // 91 Tage nach HEUTE
  const zeile = V.prueftermineFelder(HEUTE).find((z) => z.sektorId === 'identity' && /Aufenthaltstitel/.test(z.name));
  assert.ok(zeile, 'keine Prüfblatt-Zeile gefunden');
  assert.equal(zeile.stufe, 'gruen');
});

test('[A463·Gegenprobe] ein abgelaufener Aufenthaltstitel bleibt rot, unabhängig vom Vorlauf', async () => {
  const V = await depotMitAufenthaltstitel('2026-07-01');   // in der Vergangenheit
  const zeile = V.prueftermineFelder(HEUTE).find((z) => z.sektorId === 'identity' && /Aufenthaltstitel/.test(z.name));
  assert.ok(zeile);
  assert.equal(zeile.stufe, 'rot');
});

test('[A463] derselbe Vorlauf gilt über die Dokument-Registrierung (standardDokumente-Weg)', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen(PW);
  V.akteurSelbstErklaeren('Prüfung');
  const doc = V.dokumentAusStandard('residence-permit', 'identity', HEUTE);
  V.dokumentSetzen(doc.id, 'gueltigAb', '2026-01-01');
  V.dokumentSetzen(doc.id, 'ablaufDatum', '2026-11-19');   // 89 Tage
  const zeile = V.prueftermineDokumente(HEUTE).find((z) => z.id === doc.id);
  assert.ok(zeile);
  assert.equal(zeile.stufe, 'gelb');
});
