'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Test — Format-Import (Import-Welle 2): externe EINLESE-Standards
   ────────────────────────────────────────────────────────────────────────
   CAMT.053 (Bank-Kontoauszug, XML) → Finanzen, XMeld (XÖV-Meldewesen, XML) →
   Identität, ELSTER (Steuer-Kernfelder, JSON) → Finanzen. Reine Einlese-Formate
   ohne Export-Gegenstück (nurImport) — daher KEIN Round-Trip, sondern Fixture →
   Import → Felder-korrekt PLUS Konflikt/Merge-Disziplin (nicht still überschreiben),
   Import-Provenienz, Format-Erkennung am Inhalt, Bürger-Sprache, Read-only-Disziplin.
   VdCrypto bleibt byte-identisch (kein Krypto-Pfad angefasst).
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { ladeKern } = require('./load-kern.js');

const PW = 'pw';
const FX = path.join(__dirname, 'fixtures');
const CAMT = fs.readFileSync(path.join(FX, 'camt053.example.xml'), 'utf8');
const XMELD = fs.readFileSync(path.join(FX, 'xmeld.example.xml'), 'utf8');
const ELSTER = fs.readFileSync(path.join(FX, 'elster.example.json'), 'utf8');

async function frischMitDepot() {
  const k = ladeKern();
  await k.V.depotAnlegen(PW);
  k.V.akteurSelbstErklaeren('Tester');
  return k;
}
function felder(V, sektorId, ids) {
  const sd = (V.getData().sektoren[sektorId]) || {};
  const out = {};
  for (const id of ids) out[id] = sd[id];
  return out;
}

/* ── Registry / Bürger-Sprache ───────────────────────────────────────────── */

test('W2-1) Registry kennt camt053/xmeld/elster als nurImport-Sektor-Formate', async () => {
  const { V } = await frischMitDepot();
  for (const id of ['camt053', 'xmeld', 'elster']) {
    const def = V.IMPORT_FORMAT_BY_ID[id];
    assert.ok(def, 'Format fehlt: ' + id);
    assert.equal(def.nurImport, true, 'nurImport-Marker fehlt: ' + id);
    assert.equal(def.kategorie, 'sektor');
    assert.equal(typeof def.erkennen, 'function', 'erkennen() fehlt: ' + id);
  }
  // Kein Export-Gegenstück (reine Einlese-Formate)
  for (const id of ['camt053', 'xmeld', 'elster']) {
    assert.ok(!V.EXPORT_FORMAT_BY_ID[id], 'Welle-2-Format darf KEIN Export-Gegenstück haben: ' + id);
  }
});

test('W2-2) Bürger-Sprache: Welle-2-Labels ohne Format-Abkürzungen', async () => {
  const { V } = await frischMitDepot();
  for (const id of ['camt053', 'xmeld', 'elster']) {
    const lbl = V.IMPORT_FORMAT_BY_ID[id].label;
    assert.ok(!/CAMT|camt\.053|XMeld|XMELD|ELSTER|ERiC|ISO ?20022/.test(lbl), 'Label ohne Kürzel: ' + lbl);
  }
});

test('W2-3) Bereich-Chooser bietet die neuen Formate an', async () => {
  const { V } = await frischMitDepot();
  const finIds = V.importFormateFuerSektor('finance').map(f => f.id);
  assert.ok(finIds.includes('camt053'), 'camt053 im Finanzen-Chooser');
  assert.ok(finIds.includes('elster'), 'elster im Finanzen-Chooser');
  const idIds = V.importFormateFuerSektor('identity').map(f => f.id);
  assert.ok(idIds.includes('xmeld'), 'xmeld im Identität-Chooser');
});

/* ── CAMT.053 ─────────────────────────────────────────────────────────────── */

test('W2-4) CAMT.053: Buchungen (Ntry) vollständig geparst — Amt/CdtDbtInd/BookgDt/Zweck + CLBD-Saldo', async () => {
  const { V } = await frischMitDepot();
  // deshalb wird über JSON verglichen statt referenz-gleich (deepStrictEqual).
  const p = JSON.parse(JSON.stringify(V.parseCamt053(CAMT)));
  assert.equal(p.iban, 'DE89370400440532013000');
  assert.equal(p.bank, 'Commerzbank München');
  assert.equal(p.waehrung, 'EUR');
  assert.deepEqual(p.saldo, { betrag: '2540.55', waehrung: 'EUR', ind: 'CRDT' });
  assert.equal(p.buchungen.length, 2);
  assert.deepEqual(p.buchungen[0], { betrag: '1200.00', waehrung: 'EUR', ind: 'DBIT', datum: '2026-05-02', zweck: 'Miete Mai 2026 Wohnung Lindenweg 4' });
  assert.deepEqual(p.buchungen[1], { betrag: '3200.00', waehrung: 'EUR', ind: 'CRDT', datum: '2026-05-28', zweck: 'Gehalt Mai 2026' });
});

test('W2-5) CAMT.053: Fixture → Import → Konto-Identität als konten-Eintrag in Finanzen (U2-ADR-074)', async () => {
  const { V } = await frischMitDepot();
  const r = V.kernAPI.importiere('camt053', CAMT, { alleKonflikte: true });
  assert.ok(r.listen >= 1, 'ein Konten-Eintrag importiert');
  const konten = (V.getData().sektoren.finance || {}).accounts || [];
  assert.equal(konten.length, 1);
  assert.equal(konten[0].iban, 'DE89370400440532013000');
  // A55 (30.07.2026): `institution` ist ein ref-Unterfeld — der Import liefert {override}, nicht den rohen
  // String (der Parser `p.bank` oben bleibt roh; die Umwandlung geschieht im Import, nicht im Parser).
  assert.deepEqual(konten[0].institution, { override: 'Commerzbank München' });
});

test('W2-6) CAMT.053: ergänzt einen Konten-Eintrag, bestehende Konten unberührt (Liste, kein Überschreiben)', async () => {
  const { V } = await frischMitDepot();
  // Ein bestehendes Konto — der CAMT-Import darf es NICHT überschreiben, sondern ergänzt (die Liste ADDIERT).
  V.listenEintragHinzufuegen('finance', 'accounts', { institution: { override: 'Bestehende Bank' }, iban: 'DE00 BESTEHEND' });   // A56: ref-Unterfeld als {override}
  const plan = V.kernAPI.importVorschau('camt053', CAMT);
  const kontenPlan = (plan.listen || []).find(l => l.feldId === 'accounts');
  assert.ok(kontenPlan && kontenPlan.eintraege.length === 1, 'CAMT-Konto im Plan');
  V.importAnwenden(plan, {});
  const konten = (V.getData().sektoren.finance || {}).accounts || [];
  assert.equal(konten.length, 2, 'bestehendes Konto bleibt, CAMT-Konto ergänzt');
  assert.ok(konten.some(k => k.iban === 'DE00 BESTEHEND'), 'bestehendes unberührt');
  assert.ok(konten.some(k => k.iban === 'DE89370400440532013000'), 'CAMT-Konto ergänzt');
});

test('W2-7) CAMT.053: importierter Konten-Eintrag trägt Import-Provenienz (Quelle = Bürger-Label)', async () => {
  const { V } = await frischMitDepot();
  V.kernAPI.importiere('camt053', CAMT, { alleKonflikte: true });
  const kette = V.liesUrheberschaft('finance', 'accounts');
  const letzter = kette[kette.length - 1];
  assert.equal(letzter.eingabeArt, 'import');
  assert.ok(/Kontoauszug/.test(letzter.quelle || ''), 'Quelle am Stempel: ' + letzter.quelle);
});

/* ── XMeld ────────────────────────────────────────────────────────────────── */

test('W2-8) XMeld: Fixture → Import → Identitäts-Felder feldweise korrekt', async () => {
  const { V } = await frischMitDepot();
  V.kernAPI.importiere('xmeld', XMELD, { alleKonflikte: true });
  assert.deepEqual(
    felder(V, 'identity', ['givenName', 'familyName', 'birthName', 'birthDate', 'birthPlace', 'nationality', 'streetAddress', 'postcodeCity']),
    { givenName: 'Maria', familyName: 'Mustermann', birthName: 'Müller', birthDate: '1980-05-15',
      birthPlace: 'Augsburg', nationality: 'deutsch', streetAddress: 'Lindenweg 4', postcodeCity: '80331 München' });
});

test('W2-9) XMeld: belegtes Feld bleibt (Konflikt), leeres wird gefüllt (Merge)', async () => {
  const { V } = await frischMitDepot();
  V.sektorFeldSetzen('identity', 'familyName', 'Bestehend');   // belegt, soll bleiben
  const plan = V.kernAPI.importVorschau('xmeld', XMELD);
  assert.equal(plan.zeilen.find(z => z.feldId === 'familyName').status, 'konflikt');
  assert.equal(plan.zeilen.find(z => z.feldId === 'givenName').status, 'neu');
  V.importAnwenden(plan, {});
  assert.equal((V.getData().sektoren.identity || {}).familyName, 'Bestehend', 'belegtes unangetastet');
  assert.equal((V.getData().sektoren.identity || {}).givenName, 'Maria', 'leeres gefüllt');
});

/* ── ELSTER ───────────────────────────────────────────────────────────────── */

// Schnitt Glied 3 (22.08.2026, A448, U2-ADR-161): `steuerid` ist zu einer Liste geworden
// (mehrwertig). _elsterFelder schreibt die Steuer-ID seither NICHT mehr in ein eigenes Feld —
// sie landet unverändert (verlustfrei, nur nicht mehr strukturiert) in derselben Sammel-Notiz
// wie Finanzamt/Steuernummer/Veranlagung. Ein eigener Konflikt-Status für die Steuer-ID entfällt
// darum (offener Punkt, s. Registerzeile) — W2-11 prüfte genau den, ist jetzt Teil von W2-10.
test('W2-10) ELSTER: Fixture → Import → Sammel-Notiz in Finanzen (inkl. Steuer-ID)', async () => {
  const { V } = await frischMitDepot();
  V.kernAPI.importiere('elster', ELSTER, { alleKonflikte: true });
  const sd = V.getData().sektoren.finance || {};
  assert.equal(sd.taxIdsTaxNumbers, undefined, 'kein eigenes Feld mehr — steuerid ist eine Liste, ELSTER füllt sie nicht');
  assert.ok(/Steuer-ID: 12 345 678 901/.test(sd.taxParticulars), 'Steuer-ID in Notiz');
  assert.ok(/Finanzamt München/.test(sd.taxParticulars), 'Finanzamt in Notiz');
  assert.ok(/Lohnsteuer: 7200\.00 EUR/.test(sd.taxParticulars), 'Lohnsteuer in Notiz');
  assert.ok(/Einkommensteuer 2024/.test(sd.taxParticulars), 'Veranlagung in Notiz');
});

/* ── Format-Erkennung am Inhalt ───────────────────────────────────────────── */

test('W2-12) Format-Erkennung am Inhalt (nicht an der Dateiendung)', async () => {
  const { V } = await frischMitDepot();
  assert.equal(V.importFormatErkennen(CAMT, 'finanzen'), 'camt053');
  assert.equal(V.importFormatErkennen(XMELD, 'identitaet'), 'xmeld');
  assert.equal(V.importFormatErkennen(ELSTER, 'finanzen'), 'elster');
  // Unbekannter Inhalt → null (kein Fehlgriff)
  assert.equal(V.importFormatErkennen('Hallo Welt, einfach Text.'), null);
});

/* ── Robustheit / Read-only / Krypto ──────────────────────────────────────── */

test('W2-13) Ungültiges XML → ungueltig-Plan, kein Wurf, keine Mutation', async () => {
  const { V } = await frischMitDepot();
  const vorher = JSON.stringify(V.getData());
  const plan = V.kernAPI.importVorschau('camt053', '<das ist <<< kein gueltiges xml');
  assert.equal(plan.ungueltig, true);
  const r = V.importAnwenden(plan, { alleKonflikte: true });
  assert.equal(r.gesetzt, 0);
  assert.equal(JSON.stringify(V.getData()), vorher, 'keine Mutation bei ungültiger Datei');
});

test('W2-14) Parser/Vorschau mutieren `data` nicht (reine Lese-Schicht)', async () => {
  const { V } = await frischMitDepot();
  const vorher = JSON.stringify(V.getData());
  V.parseCamt053(CAMT);
  V.parseXMeld(XMELD);
  V.kernAPI.importVorschau('camt053', CAMT);
  V.kernAPI.importVorschau('xmeld', XMELD);
  V.kernAPI.importVorschau('elster', ELSTER);
  assert.equal(JSON.stringify(V.getData()), vorher, 'Parsen/Vorschau ohne Mutation');
});

test('W2-15) VdCrypto-Block bleibt unberührt (Hash byte-identisch)', async () => {
  const { extrahiereScripts, kryptoBlock, sha256, BLOCK_HASH_ERWARTET, HTML_PATH } = require('./load-kern.js');
  const html = fs.readFileSync(HTML_PATH, 'utf8');
  const { script1 } = extrahiereScripts(html);
  assert.equal(sha256(kryptoBlock(script1)), BLOCK_HASH_ERWARTET, 'Krypto-Block-Hash unverändert');
});
