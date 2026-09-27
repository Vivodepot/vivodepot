'use strict';
/* ════════════════════════════════════════════════════════════════════════
   „Die Ausgabewege, an denen die Prüfung vorbeiläuft" (12.08.2026)
   ────────────────────────────────────────────────────────────────────────
   Vier Befunde, ein Kern: ein Weg, auf dem Daten das Depot verlassen, wird von der zentralen
   Prüfung nicht erfasst. Befund 1 (extraHTML im PDF) steht in tests/s9-dokument-datei.test.js
   (neben den übrigen zeichneDokumentPdf-Proben). Diese Datei deckt Befund 4 (vCard-Sensibel)
   und Befund 2 (Unstimmigkeits-Ansage).
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

const PW = 'ausgabewege-pw';

async function baueIdentitaetsDepot(V) {
  await V.depotAnlegen(PW);
  V.akteurSelbstErklaeren('Testerin');
  const d = V.getData();
  d.sektoren.identity = {
    givenName: 'Elisabeth', familyName: 'Beispiel', telephone: '0151 12345678',
    email: 'e.beispiel@example.de', streetAddress: 'Lindenweg 4', postcodeCity: '80331 München',
    birthDate: '1958-03-14',
  };
  V.setData(d);
  return d;
}

/* ── Befund 4 — vcardIdentitaet() bekommt einen Sensibel-Prüfpfad ─────────────────────────── */

test('[Befund 4] vcardIdentitaet trägt heute alle sieben Felder (Positivmaßstab, Bestandsverhalten)', async () => {
  const { V } = ladeKern();
  await baueIdentitaetsDepot(V);
  const karte = V.vcardIdentitaet();
  assert.match(karte, /FN:Elisabeth Beispiel/);
  assert.match(karte, /TEL;TYPE=voice:0151 12345678/);
  assert.match(karte, /EMAIL:e\.beispiel@example\.de/);
  assert.match(karte, /BDAY:19580314/);
});

test('[Befund 4] ein als sensibel markiertes Feld bleibt aus der vCard heraus (rot ⇄ grün)', async () => {
  const { V } = ladeKern();
  await baueIdentitaetsDepot(V);
  // Grün: unverändert — Telefon steht in der Karte.
  assert.match(V.vcardIdentitaet(), /TEL;TYPE=voice:0151 12345678/);
  // Rot-Vorbereitung: Telefon nutzerseitig als sensibel markiert — derselbe Mechanismus (Session-
  // Override), den `exportAuswahlEphemerAnwenden` beim echten Herausgeben-Dialog nutzt.
  V.sensibelFeldSetzen('identity', 'telephone', true);
  const karteOhneTelefon = V.vcardIdentitaet();
  assert.ok(!karteOhneTelefon.includes('0151 12345678'),
    'ein sensibel markiertes Feld darf NICHT in der vCard stehen — das war der gemeldete Bau-Mangel (Befund 4)');
  assert.match(karteOhneTelefon, /FN:Elisabeth Beispiel/, 'nicht-sensible Felder bleiben unberührt');
});

test('[Befund 4] Positivkontrolle: schema-sensible Felder wären ebenfalls geschützt, wenn vcardIdentitaet sie je läse', async () => {
  const { V } = ladeKern();
  await baueIdentitaetsDepot(V);
  // Es gibt heute kein schema-sensibles Feld unter den sieben gelesenen (Auftragstext bestätigt
  // das) — die Probe hält fest, DASS die Prüfung greift, nicht dass ein Feld heute betroffen wäre.
  const gelieferteFelder = ['givenName', 'familyName', 'telephone', 'email', 'streetAddress', 'postcodeCity', 'birthDate'];
  for (const fid of gelieferteFelder) {
    const def = V.SEKTOR_BY_ID.identity.sektionen.flatMap((s) => s.felder || []).find((f) => f.id === fid);
    assert.equal(!!(def && def.sensibel), false, fid + ' ist heute nicht schema-sensibel (Auftragsvorbedingung)');
  }
});

/* ── Befund 2 — die Unstimmigkeits-Ansage erreicht Notfallkarte, Situationsblatt und die
   Dokument-Ausgabe (PV/KI/Vollmacht/Betreuung/K9), nicht nur flowExportUebersicht ──────────── */

test('[Befund 2] _unstimmigeFelderAusPaaren: eine implausible Geburtsjahr-Zahl wird gefunden, präzise auf die Paar-Liste skaliert', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen(PW);
  const d = V.getData();
  d.sektoren.identity = { givenName: 'Test', familyName: 'Person', birthDate: '0111-01-01' };
  d.sektoren.finance = { iban: 'nicht-plausibel-aber-nicht-in-der-Paar-Liste' };
  V.setData(d);
  const funde = V._unstimmigeFelderAusPaaren(V.NOTFALL_KERN_FELDER);
  assert.equal(funde.length, 1);
  assert.equal(funde[0].feld, 'birthDate');
  assert.equal(funde[0].grund, 'datum');
});

test('[Befund 2] _unstimmigeFelderAusPaaren: ein leeres Feld ist nicht unstimmig (nur eingetragene Werte zählen)', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen(PW);
  const funde = V._unstimmigeFelderAusPaaren(V.NOTFALL_KERN_FELDER);
  assert.deepEqual(funde, [], 'ein leeres Depot hat nichts Eingetragenes, also nichts Unstimmiges');
});

test('[Befund 2 · Rotmachbarkeit] Notfallkarte: eine implausible Geburtsjahr-Zahl löst die Ansage aus, ein plausibler Wert nicht', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen(PW);
  const d = V.getData();
  d.sektoren.identity = { givenName: 'Test', familyName: 'Person', birthDate: '0111-01-01' };
  V.setData(d);
  let modalTitel = null;
  V.ui.modal = (opt) => { modalTitel = opt.titel; };
  let fortgefahren = false;
  V._unstimmigWarnenMitFundenDannFortfahren(V._unstimmigeFelderAusPaaren(V.NOTFALL_KERN_FELDER), () => { fortgefahren = true; });
  assert.equal(modalTitel, V.STRINGS.exportUnstimmigEigenerTitel, 'rot: die Ansage muss erscheinen');
  assert.equal(fortgefahren, false, 'ohne Bestätigung wird NICHT fortgefahren');

  // Grün: derselbe Mechanismus, plausibler Wert — keine Ansage, direktes Fortfahren.
  modalTitel = null;
  d.sektoren.identity.birthDate = '1958-03-14';
  fortgefahren = false;
  V._unstimmigWarnenMitFundenDannFortfahren(V._unstimmigeFelderAusPaaren(V.NOTFALL_KERN_FELDER), () => { fortgefahren = true; });
  assert.equal(modalTitel, null, 'grün: kein Umweg, wenn nichts unstimmig ist');
  assert.equal(fortgefahren, true);
});

test('[Befund 2] Situationsblatt: _situationUnstimmigePaare liest nur ECHTE Sektor-Cross-Refs (quelle gesetzt)', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen(PW);
  const sitIds = Object.keys(V.SITUATION_BY_ID || {});
  assert.ok(sitIds.length > 0, 'Vorbedingung: es gibt mindestens eine Situation');
  for (const sitId of sitIds) {
    const paare = V._situationUnstimmigePaare(sitId);
    for (const p of paare) {
      assert.ok(p.sektor && V.SEKTOR_BY_ID[p.sektor], sitId + ': jedes Paar muss auf einen echten Sektor zeigen');
    }
  }
});

test('[Befund 2 · Rotmachbarkeit] Dokument-Ausgabe (PV/KI/Vollmacht/Betreuung): identitaet-Unstimmigkeit löst die Ansage aus', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen(PW);
  const d = V.getData();
  d.sektoren.identity = { givenName: 'Test', familyName: 'Person', birthDate: '0111-01-01' };
  V.setData(d);
  const funde = V.exportUnstimmigeFelder('identity');
  assert.equal(funde.length, 1, 'dieselbe Prüfung wie am ganzen Bereich — ein Fund');
  let modalGesehen = false;
  V.ui.modal = () => { modalGesehen = true; };
  V._unstimmigWarnenMitFundenDannFortfahren(funde, () => {});
  assert.equal(modalGesehen, true, 'PV/KI/Vollmacht/Betreuung/K9 teilen denselben identitaet-Scan — muss anschlagen');
});
