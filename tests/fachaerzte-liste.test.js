'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Phase 3 · Teil 2 (U2-ADR-072) — Fachärzte als LISTE {arzt · fach}.
   Die drei früheren Skalar-Slots gesundheit/facharzt_1/2/3 (je ein Personen-Ref)
   werden EINE `liste` mit Einträgen {arzt (Person-Ref) · fach (Fachgebiet, Text)}.
   Standard-Muster (Skalar→Liste), verwandt mit der Vollmacht-Liste. Geprüft:
     · Feld-Definition: liste, unterFelder [arzt(ref,person,facharzt), fach(text)];
       die drei Alt-Slots existieren nicht mehr.
     · Migration 33→34 verlustfrei: jeder nicht-leere Slot → ein Eintrag (arzt=Ref,
       fach leer) mit stabiler id; leere Slots fallen weg; Slots entfernt; idempotent.
     · B16-Import-Nachzug: die drei beta16-Slots werden zur fachaerzte-Liste in
       Gesundheit aggregiert (kein Skalar-Ziel mehr, nichts in der Sammel-Notiz).

   Umbau „Englisch vor v1" (14.09.2026): der Bereich heisst jetzt `health`, das Feld
   `specialistDoctors`, die Unterfelder `specialistDoctor` (Personen-Ref) und `specialty`
   (Fachgebiet). Die drei B16-ROHSCHLÜSSEL `facharzt_1/2/3` bleiben Deutsch — das ist das
   historische Rohformat des B16-Imports, kein Ziel-Feld dieses Katalogs. Nur das ZIEL wurde
   umbenannt. Live gegen den Katalog geprüft, nicht geraten — `V.SEKTOR_BY_ID` trägt
   inzwischen selbst durchgängig die englischen Registry-Ids (`Object.keys(V.SEKTOR_BY_ID)`
   zeigt `health` statt `gesundheit`), also auch hier `health`.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

function faFeld(V) {
  return V.SEKTOR_BY_ID.health.sektionen.flatMap(s => s.felder || []).find(f => f.id === 'specialistDoctors');
}
function alleGesFelder(V) {
  return V.SEKTOR_BY_ID.health.sektionen.flatMap(s => s.felder || []);
}
function migriere(V, version, gesundheit) {
  const d = V.leeresDepot();
  d.schemaVersion = version;
  d.sektoren.gesundheit = Object.assign({}, d.sektoren.gesundheit, gesundheit);
  V.depotNormalisieren(d);
  return d;
}

/* ── Feld-Definition ─────────────────────────────────────────────────────── */
test('Feld: specialistDoctors ist eine liste {specialistDoctor (ref:person, rolle facharzt) · specialty (text)}', () => {
  const { V } = ladeKern();
  const f = faFeld(V);
  assert.ok(f, 'specialistDoctors existiert');
  assert.equal(f.typ, 'liste');
  assert.equal((f.unterFelder || []).map(u => u.id).join(','), 'specialistDoctor,specialty');
  const arzt = f.unterFelder.find(u => u.id === 'specialistDoctor');
  assert.equal(arzt.typ, 'ref');
  assert.equal(arzt.entitaet, 'person');
  assert.equal(arzt.rolle, 'facharzt');
  assert.equal(f.unterFelder.find(u => u.id === 'specialty').typ, 'text');
});

test('die drei Alt-Slots facharzt_1/2/3 existieren nicht mehr', () => {
  const { V } = ladeKern();
  assert.equal(alleGesFelder(V).filter(f => /^facharzt_/.test(f.id)).length, 0);
  // hausarzt bleibt ein eigenes Feld (nicht Teil der Fachärzte-Liste) — heisst jetzt generalPractitioner.
  assert.ok(alleGesFelder(V).find(f => f.id === 'generalPractitioner'), 'generalPractitioner bleibt separat');
});

/* ── Migration 33→34 (Skalar→Liste, verlustfrei) — läuft bis zum aktuellen Schema (81) durch,
   die Schema-80→81-Stufe schreibt Bereich und Feld-Unterschlüssel danach auf Englisch um. ── */
test('Migration: drei Slots → drei Einträge {specialistDoctor, specialty:""} mit stabiler id; Slots entfernt', () => {
  const { V } = ladeKern();
  const d = migriere(V, 33, {
    facharzt_1: { ref: 'pA', override: '' },
    facharzt_2: { ref: '', override: 'Dr. Neuro' },
    facharzt_3: { ref: 'pC', override: '' },
  });
  assert.equal(d.schemaVersion, V.SCHEMA_VERSION_AKTUELL);
  const g = d.sektoren.health;
  const liste = g.specialistDoctors;
  assert.ok(Array.isArray(liste) && liste.length === 3, 'drei Einträge');
  assert.equal(liste[0].specialistDoctor.ref, 'pA');
  assert.equal(liste[1].specialistDoctor.override, 'Dr. Neuro');
  assert.equal(liste[2].specialistDoctor.ref, 'pC');
  assert.ok(liste.every(e => e.specialty === ''), 'Fach anfangs leer');
  assert.ok(liste.every(e => typeof e.id === 'string' && e.id.length > 0), 'stabile id je Eintrag');
  for (const slot of ['facharzt_1', 'facharzt_2', 'facharzt_3']) {
    assert.ok(!(slot in g), slot + ' entfernt');
  }
});

test('Migration: leere Slots fallen weg — nur nicht-leere werden Einträge', () => {
  const { V } = ladeKern();
  const d = migriere(V, 33, {
    facharzt_1: { ref: 'pA', override: '' },
    facharzt_2: { ref: '', override: '' },     // leer → kein Eintrag
    facharzt_3: { ref: '', override: '   ' },  // whitespace → kein Eintrag
  });
  const liste = d.sektoren.health.specialistDoctors;
  assert.equal(liste.length, 1, 'nur der gefüllte Slot');
  assert.equal(liste[0].specialistDoctor.ref, 'pA');
});

test('Migration: nur leere Slots → keine specialistDoctors-Liste (kein Leer-Eintrag), Slots entfernt', () => {
  const { V } = ladeKern();
  const d = migriere(V, 33, { facharzt_1: { ref: '', override: '' } });
  const g = d.sektoren.health;
  assert.ok(!('specialistDoctors' in g), 'keine Liste ohne Daten');
  assert.ok(!('facharzt_1' in g), 'leerer Slot dennoch entfernt');
  assert.equal(d.schemaVersion, V.SCHEMA_VERSION_AKTUELL);
});

test('Migration: Alt-String (Klartext-Name) im Slot → Eintrag mit Override', () => {
  const { V } = ladeKern();
  const d = migriere(V, 30, { facharzt_1: 'Dr. Herz' });
  const liste = d.sektoren.health.specialistDoctors;
  assert.equal(liste.length, 1);
  assert.equal(liste[0].specialistDoctor.override, 'Dr. Herz');
  assert.equal(liste[0].specialistDoctor.ref, '');
});

test('Migration: idempotent — bestehende specialistDoctors-Liste bleibt unberührt', () => {
  const { V } = ladeKern();
  const bestehend = [{ id: 'x1', specialistDoctor: { ref: 'pA', override: '' }, specialty: 'Kardiologie' }];
  const d = migriere(V, 34, { fachaerzte: bestehend.map(e => Object.assign({}, e)) });
  const liste = d.sektoren.health.specialistDoctors;
  assert.equal(liste.length, 1);
  assert.equal(liste[0].specialty, 'Kardiologie', 'Fach nicht zurückgesetzt');
  assert.equal(liste[0].id, 'x1', 'id nicht neu vergeben');
});

/* ── B16-Import-Nachzug (Roh-B16-Schlüssel facharzt_1/2/3 bleiben Deutsch — historisches
   Rohformat; nur das Ziel sektorId/feldId/unterfeldId ist Englisch) ──────────────────── */
test('B16-Import: drei Slots → specialistDoctors-Liste in Gesundheit; leerer Slot weg', () => {
  const { V } = ladeKern();
  const out = V._b16Felder({ data: { facharzt_1: 'Dr. Herz (Kardiologie)', facharzt_2: 'Dr. Kopf', facharzt_3: '' } });
  const fae = out.listen.find(l => l.sektorId === 'health' && l.feldId === 'specialistDoctors');
  assert.ok(fae, 'specialistDoctors-Liste im Import-Plan');
  assert.equal(fae.eintraege.length, 2, 'zwei nicht-leere Slots');
  assert.equal(fae.eintraege[0].specialistDoctor.override, 'Dr. Herz (Kardiologie)');
  assert.equal(fae.eintraege[1].specialistDoctor.override, 'Dr. Kopf');
  assert.ok(fae.eintraege.every(e => e.specialty === ''), 'Fach leer beim Import');
});

test('B16-Import: kein facharzt-Skalar-Feld, nichts in der Sammel-Notiz', () => {
  const { V } = ladeKern();
  const out = V._b16Felder({ data: { facharzt_1: 'Dr. Herz', facharzt_2: 'Dr. Kopf' } });
  assert.equal(out.felder.filter(f => /facharzt/.test(f.feldId)).length, 0, 'kein Skalar-Ziel mehr');
  const notiz = out.felder.find(f => f.feldId === 'furtherDetails');
  assert.ok(!notiz || !/Dr\. Herz|Dr\. Kopf|facharzt/i.test(String(notiz.wert)), 'nicht in die Sammel-Notiz gefallen');
});

/* ── Anzeige: nie roh ────────────────────────────────────────────────────── */
test('Anzeige: Eintrag zeigt Fach + Person sauber, nie rohes JSON/Array', () => {
  const { V } = ladeKern();
  const feld = faFeld(V);
  const eintrag = { id: 'x', specialistDoctor: { ref: '', override: 'Dr. Herz' }, specialty: 'Kardiologie' };
  const z = V.listenEintragZusammenfassung(feld, eintrag);
  assert.ok(z.includes('Dr. Herz'), 'Person');
  assert.ok(z.includes('Kardiologie'), 'Fach');
  assert.ok(!/[\[\]{}"]/.test(z), 'keine JSON-/Array-Zeichen');
});
