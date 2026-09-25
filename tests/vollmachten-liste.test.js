'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Vollmacht-Record (U2-ADR-064, seit U2-ADR-089/17.07. Teil eines geteilten
   Records) — erteilte Vollmachten als wiederholbarer Datensatz
   {typ='vorsorgevollmacht' · art · bevollmaechtigter · form · stelle · ort}.
   Löst die Flachfelder (vollmacht_person / vollmachtsGrundlage[mehrfachauswahl]
   / vollmachtsTyp / vollmacht_ort / gesundheitsvollmacht_person/-ort) ab; Gate
   vollmacht_vorhanden bleibt. Geprüft: Record-Struktur (jetzt innerhalb der
   geteilten `vorsorge_instrumente`-Liste), feldSichtbar mit Array-Wert (+
   Rückwärtskompatibilität), das „if" im Sub-Feld-Renderer, saubere Anzeige
   (nie roh), und die verlustfreie Migration 28→29 gefolgt von 38→39
   (Umhängung nach vorsorge_instrumente, U2-ADR-089, Verwaisungs-Regel).
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

// U2-ADR-089 Teil A Block 1 (17.07.): die Vollmacht lebt jetzt in der geteilten
// Liste `vorsorge_instrumente` (Sektion 'meine-vorsorge'), nicht mehr in ihrem
// eigenen Feld `vollmachten` (Sektion 'vorsorgevollmacht').
function instrumenteFeld(V) {
  return V.SEKTOR_BY_ID.advanceCare.sektionen.flatMap(s => s.felder).find(f => f.id === 'provisionInstruments');
}
function sub(V, id) {
  return (instrumenteFeld(V).unterFelder || []).find(u => u.id === id);
}
// Migrations-Depot bauen (schemaVersion + vorsorge-Flachfelder), dann normalisieren.
function migriere(V, version, vorsorge) {
  const d = V.leeresDepot();
  d.schemaVersion = version;
  d.sektoren.vorsorge = Object.assign({}, vorsorge);
  V.depotNormalisieren(d);
  return d;
}

/* ── Record-Struktur ─────────────────────────────────────────────────────── */
test('Record: vorsorge_instrumente ist eine liste, Vollmacht-Unterfelder {art, bevollmaechtigter, form, stelle, ort} vorhanden', () => {
  const { V } = ladeKern();
  const feld = instrumenteFeld(V);
  assert.ok(feld, 'vorsorge_instrumente existiert');
  assert.equal(feld.typ, 'liste');
  // Geteilte Liste: NUR die Vollmacht-eigenen + gemeinsamen Felder prüfen, nicht die
  // vollständige (jetzt viel größere) Unterfelder-Menge aller sechs Instrumente.
  const ids = (feld.unterFelder || []).map(u => u.id);
  for (const id of ['instrument', 'form', 'certifyingBody', 'storageLocation', 'dateOfLastChange', 'typeOfPowerOfAttorney', 'authorizedPersons', 'howDoThePeopleRepresentYou']) {
    assert.ok(ids.includes(id), id + ' als Unterfeld vorhanden');
  }
  // F3 Zug 3 (09.08.2026): gesundheit/general sind kein art-Wert mehr (Umfang statt Instrument).
  assert.equal(sub(V, 'typeOfPowerOfAttorney').optionen.map(o => o.wert).join(','), 'vorsorge,bank,betreuung');
  assert.equal(sub(V, 'form').optionen.map(o => o.wert).join(','), 'privat,beglaubigt,beurkundet');
  assert.equal(sub(V, 'authorizedPersons').typ, 'refMehrfach');   // U2-ADR-065: Personen-Mehrfachpick
  assert.equal(sub(V, 'instrument').pflicht, true, 'Diskriminante ist Pflicht (ADR-089)');
  assert.equal(sub(V, 'typeOfPowerOfAttorney').pflicht, true, 'art ist seit ADR-089 Pflicht (Einzigartigkeits-Prüfung braucht sie)');
});

test('conditional Sub-Feld: stelle trägt sichtbarWenn mit Array-Wert [beurkundet, beglaubigt]', () => {
  const { V } = ladeKern();
  const stelle = sub(V, 'certifyingBody');
  assert.ok(stelle.sichtbarWenn, 'stelle ist conditional');
  assert.equal(stelle.sichtbarWenn.feld, 'form');
  assert.equal((stelle.sichtbarWenn.wert || []).join(','), 'beurkundet,beglaubigt');
});

/* ── feldSichtbar mit Array-Wert + Rückwärtskompatibilität ───────────────── */
test('feldSichtbar: Array-Wert trifft, wenn EINER passt; Rückwärtskompat für String-Wert', () => {
  const { V } = ladeKern();
  const stelle = sub(V, 'certifyingBody');
  assert.equal(V.feldSichtbar(stelle, { form: 'beurkundet' }), true);
  assert.equal(V.feldSichtbar(stelle, { form: 'beglaubigt' }), true);
  assert.equal(V.feldSichtbar(stelle, { form: 'privat' }), false);
  assert.equal(V.feldSichtbar(stelle, {}), false, 'undefined nicht im Array');
  // Rückwärtskompatibilität: klassischer Einzel-Wert (wie organspende_einschraenkung) weiter gültig.
  const single = { id: 'x', sichtbarWenn: { feld: 'g', wert: 'ja' } };
  assert.equal(V.feldSichtbar(single, { g: 'ja' }), true);
  assert.equal(V.feldSichtbar(single, { g: 'nein' }), false);
  // Ohne sichtbarWenn immer sichtbar.
  assert.equal(V.feldSichtbar({ id: 'y' }, {}), true);
});

/* ── „das if" im Sub-Feld-Renderer ───────────────────────────────────────── */
test('listenEintragInputsHTML: stelle-Zeile ist hidden bei privat, sichtbar bei beurkundet (innerhalb typ=vorsorgevollmacht)', () => {
  const { V } = ladeKern();
  const feld = instrumenteFeld(V);
  // U2-ADR-089: `typ` ist jetzt die äußerste Bedingung — art/form/ort sind NICHT mehr
  // unconditional, sie zeigen nur bei typ='vorsorgevollmacht' (bzw. den anderen fünf Typen
  // für die jeweils eigenen Felder). Ohne typ wären sie ALLE ausgeblendet.
  const hPrivat = V.listenEintragInputsHTML(feld, { instrument: 'enduring-power-of-attorney', form: 'privat' });
  assert.match(hPrivat, /data-sub-zeile="certifyingBody"[^>]*hidden/, 'stelle bei privat ausgeblendet');
  const hBeurk = V.listenEintragInputsHTML(feld, { instrument: 'enduring-power-of-attorney', form: 'beurkundet' });
  assert.ok(hBeurk.includes('data-sub-zeile="certifyingBody"'), 'stelle-Zeile vorhanden');
  assert.doesNotMatch(hBeurk, /data-sub-zeile="certifyingBody"[^>]*hidden/, 'stelle bei beurkundet sichtbar');
  // art/ort sind mit gesetztem typ='vorsorgevollmacht' sichtbar (nicht hidden) — sie sind
  // conditional auf `typ`, aber bei passendem typ eben nicht ausgeblendet.
  assert.doesNotMatch(hPrivat, /data-sub-zeile="typeOfPowerOfAttorney"[^>]*hidden/, 'art sichtbar bei typ=vorsorgevollmacht');
  assert.doesNotMatch(hPrivat, /data-sub-zeile="storageLocation"[^>]*hidden/, 'ort sichtbar bei typ=vorsorgevollmacht');
  // Ohne gesetzten typ sind die typ-abhängigen Felder ausgeblendet (Diskriminante wirkt).
  const hOhneTyp = V.listenEintragInputsHTML(feld, { form: 'privat' });
  assert.match(hOhneTyp, /data-sub-zeile="typeOfPowerOfAttorney"[^>]*hidden/, 'art ohne typ ausgeblendet');
});

/* ── Anzeige: nie roh (Auflage 1 sinngemäß auf den Record) ───────────────── */
test('Anzeige: Eintrag als Labels „ · "-gefügt, nie rohes JSON/Array', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen('pw');
  V.akteurSelbstErklaeren('T');
  const feld = instrumenteFeld(V);
  const eintrag = { instrument: 'enduring-power-of-attorney', typeOfPowerOfAttorney: 'bank', authorizedPersons: [{ ref: '', override: 'Anna Beispiel' }], form: 'beurkundet', certifyingBody: 'Notar Dr. Sommer', storageLocation: 'Tresor' };
  const z = V.listenEintragZusammenfassung(feld, eintrag);
  assert.ok(z.includes('Bankvollmacht'), 'art-Label');
  assert.ok(z.includes('Anna Beispiel'), 'Person');
  assert.ok(!/[\[\]{}"]/.test(z), 'keine JSON-/Array-Zeichen in der Zusammenfassung');
  // Block-1-Nachtrag (17.07.2026): der Typ-Sammelbegriff „Vorsorgevollmacht" darf NICHT neben
  // der genaueren Art stehen (Geräte-Befund: „Vorsorgevollmacht · Bankvollmacht" verwirrt).
  assert.ok(!z.includes('Vorsorgevollmacht'), 'kein Typ-Oberbegriff neben gesetzter Art');
  // Nachbesserung (20.07.2026): Positivliste (zusammenfassungFelder) — form/stelle/ort/datum
  // gehören NICHT zu den erlaubten Feldern, tauchen also nie in der Zeile auf (Geräte-Befund:
  // die Alles-Iteration erzeugte bei anderen Instrumenten unlesbar lange Zeilen).
  assert.ok(!z.includes('notariell beurkundet'), 'form-Label bleibt draußen (Positivliste)');
  const txt = V.feldWertText(feld, [eintrag]);
  assert.ok(txt.includes('Bankvollmacht') && !/[\[{]/.test(txt), 'feldWertText sauber');
  const html = V.feldWertHTML(feld, [eintrag]);
  assert.ok(html.includes('Bankvollmacht') && !html.includes('['), 'feldWertHTML sauber');
});

/* ── Migration 28→29 (Auflage 2: Verwaisungs-Regel, kein Datenverlust), gefolgt
   von 38→39 (U2-ADR-089: Umhängung nach vorsorge_instrumente, additiv typ) ── */
test('Migration: eine Vollmacht (Skalar-Art) → ein Eintrag {typ, art, person, form, ort}; Gate bleibt', () => {
  const { V } = ladeKern();
  const d = migriere(V, 27, {
    vollmacht_vorhanden: 'ja',
    vollmachtsGrundlage: 'vorsorge',
    vollmacht_person: { ref: 'p1', override: '' },
    vollmachtsTyp: 'beurkundet',
    vollmacht_ort: 'Notar',
  });
  assert.equal(d.schemaVersion, V.SCHEMA_VERSION_AKTUELL, 'auf aktuellen Stand gehoben (28→29 Fold … 51→52 tote Leitfelder)');
  const v = d.sektoren.advanceCare;
  // „Tote Leitfelder" (Schema 52, 11.08.2026) rührt das Gate jetzt an, anders als
  // Block 1 (38→39) es tat — eine bereits vorhandene Zeile desselben Typs (hier aus der
  // 38→39-Umhängung) verhindert eine zweite, das Gate selbst wird trotzdem geräumt: die Zeile
  // ist jetzt der eine Ort, „Gate bleibt" ist überholt.
  assert.equal(v.vollmacht_vorhanden, undefined, 'Gate geräumt (Schema 52) — die Zeile ist jetzt der eine Ort');
  assert.ok(!('vollmachten' in v), 'die alte Liste ist umgehängt, nicht mehr vorhanden');
  assert.equal((v.provisionInstruments || []).length, 1);
  const e0 = v.provisionInstruments[0];
  assert.equal(e0.instrument, 'enduring-power-of-attorney', 'additiv retagged bei der Umhängung');
  assert.equal(e0.typeOfPowerOfAttorney, 'vorsorge');
  assert.equal(e0.authorizedPersons[0].ref, 'p1', 'U2-ADR-065: authorizedPersons ist ein Array');
  assert.equal(e0.form, 'beurkundet');
  assert.equal(e0.storageLocation, 'Notar');
  assert.equal(Object.keys(e0).sort().join(','),
    'authorizedPersons,form,id,instrument,katalogStand,rechtsraum,rechtsraumAngenommen,storageLocation,typeOfPowerOfAttorney',
    'genau diese Schlüssel + stabile id + typ (kein stelle) — seit U2-ADR-121 Zug 4/5 (Schema 45→46) '
    + 'zusätzlich der Rechtsraum-Backfill');
  assert.ok(typeof e0.id === 'string' && e0.id.length > 0, 'Migration 31→32 vergibt eine stabile Record-id');
  // U2-ADR-121 Zug 5 (Schema 45→46): ein Alt-Instrument ohne rechtsraum bekommt den Backfill —
  // 'DE' als einziger bisher ausgelieferte Rechtsraum, EXPLIZIT als Annahme markiert, kein
  // erfundener katalogStand (der beim tatsächlichen Erstellzeitpunkt galt).
  assert.equal(e0.rechtsraum, 'DE', 'Backfill-Annahme: DE, der einzige bisher ausgelieferte Rechtsraum');
  assert.equal(e0.rechtsraumAngenommen, true, 'als Annahme markiert, keine bestätigte Tatsache');
  assert.equal(e0.katalogStand, null, 'nicht rekonstruierbar — ehrliche Lücke statt erfundener Wert');
  // Flachfelder sind gefoldet und entfernt.
  for (const f of ['vollmacht_person', 'vollmachtsGrundlage', 'vollmachtsTyp', 'vollmacht_ort']) {
    assert.ok(!(f in v), f + ' entfernt');
  }
});

test('Migration: mehrere Arten (Array) → ein Eintrag je Art, gemeinsame Person/Form/Ort, alle typ=vorsorgevollmacht', () => {
  // F3 Zug 3 (09.08.2026): die alte 28→32-Migration legt weiterhin einen Eintrag je Art an
  // (art='general' als Zwischenstand) — die NEUE 47→48-Migration (dieselbe depotNormalisieren-
  // Kette, keine zweite Stufe) führt 'general' anschliessend auf 'vorsorge' + Kästchen zurück.
  // 'bank' bleibt unverändert, kein Migrationsbedarf.
  const { V } = ladeKern();
  const d = migriere(V, 28, {
    vollmachtsGrundlage: ['bank', 'general'],
    vollmacht_person: { ref: 'p2', override: '' },
    vollmachtsTyp: 'privat',
  });
  const liste = d.sektoren.advanceCare.provisionInstruments;
  assert.equal(liste.length, 2);
  assert.ok(liste.every(e => e.instrument === 'enduring-power-of-attorney'));
  assert.equal(liste.map(e => e.typeOfPowerOfAttorney).join(','), 'bank,vorsorge');
  const general = liste.find(e => e.artMigriertAus === 'general');
  assert.ok(general, 'general-Eintrag trägt die Herkunfts-Spur');
  assert.equal(general.assetManagementGeneral, 'ja', 'general -> alle 19 ja/nein-Kästchen gesetzt');
  assert.ok(liste.every(e => e.authorizedPersons[0].ref === 'p2' && e.form === 'privat'));
});

test('Migration: getrennte Gesundheitsvollmacht wird eigener Eintrag, dann auf vorsorge+Kästchen zurückgeführt', () => {
  // F3 Zug 3: 'art=gesundheit' war der Zwischenstand der alten Migration — die neue 47→48-Stufe
  // führt ihn in derselben depotNormalisieren-Kette weiter auf 'vorsorge' + die drei
  // Gesundheitssorge-Kästchen zurück (kein zweiter, getrennter Lauf nötig).
  const { V } = ladeKern();
  const d = migriere(V, 28, {
    vollmachtsGrundlage: ['vorsorge'],
    vollmacht_person: { ref: 'p3', override: '' },
    gesundheitsvollmacht_person: { ref: 'arzt', override: '' },
    gesundheitsvollmacht_ort: 'Hausarzt',
  });
  const liste = d.sektoren.advanceCare.provisionInstruments;
  assert.equal(liste.length, 2);
  const g = liste.find(e => e.artMigriertAus === 'gesundheit');
  assert.ok(g, 'Gesundheits-Eintrag, jetzt mit Herkunfts-Spur statt art=gesundheit');
  assert.equal(g.typeOfPowerOfAttorney, 'vorsorge');
  assert.equal(g.instrument, 'enduring-power-of-attorney');
  assert.equal(g.authorizedPersons[0].ref, 'arzt');
  assert.equal(g.storageLocation, 'Hausarzt');
  assert.equal(g.healthCareGeneralDecision, 'ja');
  assert.ok(!('gesundheitsvollmacht_person' in d.sektoren.advanceCare));
});

test('Migration Verwaisungs-Regel: unbekannte Art bleibt erhalten (kein Verlust)', () => {
  const { V } = ladeKern();
  const d = migriere(V, 27, { vollmachtsGrundlage: 'uralt_typ', vollmacht_ort: 'irgendwo' });
  const liste = d.sektoren.advanceCare.provisionInstruments;
  assert.equal(liste.length, 1);
  assert.equal(liste[0].typeOfPowerOfAttorney, 'uralt_typ', 'Waise als Art erhalten');
  assert.equal(liste[0].storageLocation, 'irgendwo');
});

test('Migration: nur Details ohne Art → ein Eintrag ohne art; idempotent bei erneutem Lauf', () => {
  const { V } = ladeKern();
  const d = migriere(V, 28, { vollmacht_person: { ref: 'p9', override: '' }, vollmacht_ort: 'Safe' });
  const liste = d.sektoren.advanceCare.provisionInstruments;
  assert.equal(liste.length, 1);
  assert.ok(!('typeOfPowerOfAttorney' in liste[0]), 'kein art-Schlüssel ohne Grundlage');
  assert.equal(liste[0].storageLocation, 'Safe');
  // Idempotenz: erneutes Normalisieren verändert nichts (keine Flachfelder mehr → kein zweiter Eintrag,
  // `vollmachten` existiert nach dem ersten Lauf nicht mehr → auch der 38→39-Schritt tut nichts mehr).
  V.depotNormalisieren(d);
  assert.equal(d.sektoren.advanceCare.provisionInstruments.length, 1, 'kein Duplikat beim zweiten Lauf');
});

test('Migration: leeres Depot bleibt ohne vorsorge_instrumente (kein Leer-Eintrag)', () => {
  const { V } = ladeKern();
  const d = migriere(V, 28, { vollmacht_vorhanden: 'nein' });
  assert.ok(!('vollmachten' in d.sektoren.advanceCare), 'keine alte Liste ohne Detail-Daten');
  assert.ok(!('provisionInstruments' in d.sektoren.advanceCare), 'keine neue Liste ohne Detail-Daten');
  // „Tote Leitfelder" (Schema 52): 'nein' ist im Zeilen-Modell nicht abbildbar (keine
  // Zeile heißt zugleich „nie gefragt" und „bewusst verneint") — zieht ins Rettungsfeld, das Gate
  // selbst wird geräumt (U2-ADR-050).
  assert.equal(d.sektoren.advanceCare.vollmacht_vorhanden, undefined, 'Gate geräumt (Schema 52)');
  assert.equal(d.sektoren.advanceCare.vollmacht_vorhanden_frueher, 'nein', 'Wert gerettet, nicht verworfen');
});
