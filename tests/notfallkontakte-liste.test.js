'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Phase 3 · Teil 1 (U2-ADR-072) — Notfallkontakte als PERSONEN-LISTE.
   `gesundheit/emergencyContacts` war ein einzelner Personen-Ref; jetzt refMehrfach
   (mehrere Kontakte). Geprüft:
     · Feld-Definition: typ refMehrfach, Label „Notfallkontakte", entitaet person.
     · Migration 32→33 verlustfrei: Einzel-Ref → [Ref]; Alt-String → [{ref:'',override}];
       leer → entfällt; schemaVersion auf 33 gehoben; idempotent.
     · Der NOTFALL-QR (die kritischste Bürger-Funktion) löst die Liste TYP-GENERISCH
       zu „Name1, Name2" auf — der harte Kontrollpunkt dieses Blocks (Unit-Ebene).
     · B16-Import-Alias-Nachzug: ein Klartext-Name → EIN Listen-Eintrag {override}.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

function hpFeld(V) {
  return V.SEKTOR_BY_ID.health.sektionen.flatMap(s => s.felder || []).find(f => f.id === 'emergencyContacts');
}
// Migrations-Depot bauen (schemaVersion + gesundheit-Feld), dann normalisieren.
// Der Input bleibt bewusst im ALTEN Schema (sektor 'gesundheit', feld 'hauptpflegeperson') —
// genau das trägt ein echtes Alt-Depot dieser schemaVersion, lange vor dem Sektor-Rename.
function migriere(V, version, emergencyContacts) {
  const d = V.leeresDepot();
  d.schemaVersion = version;
  d.sektoren.gesundheit = Object.assign({}, d.sektoren.gesundheit, { hauptpflegeperson: emergencyContacts });
  V.depotNormalisieren(d);
  return d;
}

/* ── Feld-Definition ─────────────────────────────────────────────────────── */
test('Feld: emergencyContacts ist refMehrfach „Notfallkontakte" (Personen-Liste)', () => {
  const { V } = ladeKern();
  const f = hpFeld(V);
  assert.ok(f, 'emergencyContacts existiert');
  assert.equal(f.typ, 'refMehrfach', 'Personen-Mehrfachpick (U2-ADR-072)');
  assert.equal(f.entitaet, 'person');
  assert.equal(f.label, 'Notfallkontakte');
});

/* ── Migration 32→33 (Verwaisungs-Regel wie erben 30→31) ─────────────────── */
test('Migration: Einzel-Ref → [Ref]; schemaVersion auf aktuellen Stand; verlustfrei', () => {
  const { V } = ladeKern();
  const d = migriere(V, 32, { ref: 'p1', override: '' });
  assert.equal(d.schemaVersion, V.SCHEMA_VERSION_AKTUELL, 'Normalisierung hebt bis zum aktuellen Schema (32→33 Notfallkontakte, 33→34 Fachärzte)');
  const hp = d.sektoren.health.emergencyContacts;
  assert.ok(Array.isArray(hp), 'jetzt ein Array');
  assert.equal(hp.length, 1);
  assert.equal(hp[0].ref, 'p1', 'Ref erhalten');
});

test('Migration: Alt-String (Klartext) → [{ref:"",override:String}] (kein Verlust)', () => {
  const { V } = ladeKern();
  const d = migriere(V, 30, 'Frau Meier');
  const hp = d.sektoren.health.emergencyContacts;
  assert.ok(Array.isArray(hp) && hp.length === 1);
  assert.equal(hp[0].ref, '');
  assert.equal(hp[0].override, 'Frau Meier', 'Klartext als Override erhalten');
});

test('Migration: leerer Einzelwert → Feld entfällt (kein Leer-Eintrag)', () => {
  const { V } = ladeKern();
  const d = migriere(V, 32, { ref: '', override: '' });
  assert.ok(!('emergencyContacts' in d.sektoren.health), 'leeres Feld gestrichen');
});

test('Migration: idempotent — bereits Array bleibt unberührt, kein Doppel-Wrap', () => {
  const { V } = ladeKern();
  const bestehend = [{ ref: 'p1', override: '' }, { ref: '', override: 'Ben Klein' }];
  const d = migriere(V, 33, bestehend.map(e => Object.assign({}, e)));
  const hp = d.sektoren.health.emergencyContacts;
  assert.equal(hp.length, 2, 'kein zusätzlicher Wrap');
  assert.equal(hp[0].ref, 'p1');
  assert.equal(hp[1].override, 'Ben Klein');
});

/* ── Kartenmodell + QR-vCard: die harten Kontrollpunkte (Unit-Ebene) ──────── */
test('Kartenmodell (N2 Zug 3): trägt Name UND Telefon je Kontakt, nicht nur den Namen; QR-vCard trägt Namen + Nummern (U2-ADR-077)', () => {
  const { V } = ladeKern();
  const d = V.leeresDepot();
  // Nummern am Register — der QR trägt sie als tappbare TEL (U2-ADR-077).
  d.menschen = [{ id: 'p1', name: 'Anna Schulz', tel: '+49 151 111' }, { id: 'p2', name: 'Ben Klein', tel: '+49 151 222' }];
  d.sektoren.health = Object.assign({}, d.sektoren.health, {
    emergencyContacts: [{ ref: 'p1', override: '' }, { ref: 'p2', override: '' }],
  });
  V.setData(d);
  // N2 Zug 3 („Drei Verdrahtungen", 08.08.2026): eine gedruckte Karte mit Namen ohne
  // Nummer ist im Ernstfall wertlos — das Kartenmodell reichert jetzt über `_verweisExportZeile`
  // an (denselben Pfad, den der docx-Export für Verweisfelder schon nutzt), statt nur den Namen
  // über `personName()` zu zeigen.
  const modell = V.notfallKernModell();
  const zeile = modell.find(z => z.label === 'Notfallkontakte');
  assert.ok(zeile, 'Notfallkontakte-Zeile im Kartenmodell');
  assert.equal(zeile.wert, 'Anna Schulz · +49 151 111; Ben Klein · +49 151 222', 'Name UND Telefon je Kontakt im Kartentext');
  // Der QR (U2-ADR-077) ist unverändert eine Kontakte-vCard: Namen als X-ABLabel, Nummern als TEL.
  const vcard = V.notfallKontakteVcard();
  assert.ok(vcard.includes('Anna Schulz') && vcard.includes('Ben Klein'), 'beide Namen (X-ABLabel) im QR');
  assert.ok(vcard.includes('+49 151 111') && vcard.includes('+49 151 222'), 'beide Nummern (TEL) im QR');
  assert.ok(!/VIVODEPOT NOTFALL/.test(vcard), 'kein alter Klartext-Kopf');
});

test('Notfall-Kartenmodell: Override-Freitext (ref-lose Person) bleibt bei der reinen Namensdarstellung (kein Register, keine Nummer)', () => {
  const { V } = ladeKern();
  const d = V.leeresDepot();
  d.menschen = [{ id: 'p1', name: 'Anna Schulz', tel: '+49 151 111' }];
  d.sektoren.health = Object.assign({}, d.sektoren.health, {
    emergencyContacts: [{ ref: 'p1', override: '' }, { ref: '', override: 'Nachbarin Frau Klein' }],
  });
  V.setData(d);
  const zeile = V.notfallKernModell().find(z => z.label === 'Notfallkontakte');
  // Der registrierte Kontakt bekommt seine Telefonnummer; der Freitext-Override hat kein Register,
  // also keine Anreicherung möglich — `_verweisExportZeile` liefert für ihn nur den Freitext selbst.
  assert.equal(zeile.wert, 'Anna Schulz · +49 151 111; Nachbarin Frau Klein');
});

/* ── B16-Import-Alias-Nachzug ────────────────────────────────────────────── */
test('B16-Import: ein Klartext-Name → EIN Listen-Eintrag {override} (Array)', () => {
  const { V } = ladeKern();
  const f = hpFeld(V);
  const wert = V._wertAusText(f, 'Frau Meier');
  assert.ok(Array.isArray(wert) && wert.length === 1, 'refMehrfach → Array mit einem Eintrag');
  assert.equal(wert[0].override, 'Frau Meier');
  assert.ok(!wert[0].ref, 'kein erfundenes ref (nur Override)');
});
