'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Test — Spec-Sektoren 2–11 (Spec 30.05.)
   ────────────────────────────────────────────────────────────────────────
   Sammeltest für die 10 in einem Bauschritt gefüllten Sektoren. Pro Sektor
   prüft er Metadaten, Sektionen-Anzahl, einige Spec-Felder, und dass der
   Render-Pfad lautlos durchläuft. Detail-Tests folgen, sobald ein Sektor
   produktiv genutzt wird.

   Templates (eigener Auftrag U2-ADR-009) und text+code (Andock-Auftrag) sind
   absichtlich NICHT geprüft — diese Felder bleiben heute typ:'text' bzw. fehlen.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

function render(sektorId) {
  const { V, document } = ladeKern();
  return V.depotAnlegen('pw').then(() => {
    V.renderSektor(sektorId);
    return document.getElementById('content').innerHTML;
  }).then(html => ({ V, html }));
}

/* ── 2) Meine Menschen ──────────────────────────────────────────────── */

test('Sektor 2 Meine Menschen: zwei Listen (menschen = Register, U2-ADR-022; kinder vereinheitlicht, U2-ADR-023), unterhalt mit ref:person', () => {
  const { V } = require('./load-kern.js').ladeKern();
  const s = V.SEKTOR_BY_ID['people'];
  assert.ok(s, 'Sektor existiert');
  assert.equal(s.format, V.SEKTOR_FORMATE.GENERISCH);
  assert.match(s.einfuehrungstext, /Menschen, die Ihnen wichtig sind/);
  const listenIds = s.sektionen.flatMap(sek => sek.felder).filter(f => f.typ === 'liste').map(f => f.id);
  // U2-ADR-022: das frühere 'menschen'-Listenfeld ist entfallen (Bereich 2 rendert das Register).
  // U2-ADR-023: kinder + erwachsene_kinder zu EINER kinder-Liste vereinheitlicht (Minderjährigkeit = Filter).
  assert.equal(listenIds.join(','), 'childrenAndDependants,maintenanceObligationsAnd', 'zwei Listen (menschen = Register, kinder vereinheitlicht)');
  // unterhalt hat ref:person Sub-Feld
  const unterhalt = s.sektionen.flatMap(sek => sek.felder).find(f => f.id === 'maintenanceObligationsAnd');
  const personSub = unterhalt.unterFelder.find(u => u.id === 'person');
  assert.equal(personSub.typ, 'ref');
  assert.equal(personSub.entitaet, 'person');
});

test('Sektor 2: Render läuft durch + zeigt Cross-Sektor-Block (Bezugspersonen sind Cross-Refs)', async () => {
  const { html, V } = await render('people');
  assert.ok(html.includes('Meine Menschen'));
  assert.ok(html.includes('Menschen, die Ihnen wichtig sind'));
  // Cross-Sektor-Block sollte präsent sein (hauptpflegeperson + seelsorger + abhaengige_personen)
  assert.ok(html.includes(V.STRINGS.crossSektorTitel), 'Cross-Sektor-Lese-Sicht im Render');
});

/* ── 3) Mobilität & Reise ───────────────────────────────────────────── */

test('Sektor 3 Mobilität: eine Sektion mit ELEFAND-Feldern', () => {
  const { V } = require('./load-kern.js').ladeKern();
  const s = V.SEKTOR_BY_ID.mobility;
  assert.equal(s.format, V.SEKTOR_FORMATE.GENERISCH);   // Rein/Raus-Konzept 03.07.: Tag von ISO_18013 → GENERISCH — mDL ist Import (geparkt), kein Selbst-Export; PDF-only
  assert.equal(s.sektionen.length, 1);
  const felder = s.sektionen[0].felder;
  const ids = felder.map(f => f.id);
  // Schnitt Glied 3 (22.08.2026, A448, U2-ADR-161): elefand_nr/_laender/_gueltig sind zur
  // mehrwertigen Liste `elefand` geworden (Korb 1) — nr/laender jetzt Unterfelder, kein
  // Flachfeld mehr.
  const elefand = felder.find(f => f.id === 'elefandRegistrations');
  assert.equal(elefand.typ, 'liste');
  assert.ok(elefand.unterFelder.some(u => u.id === 'registrationNo'));
  assert.ok(elefand.unterFelder.some(u => u.id === 'countries'));
  assert.ok(ids.includes('embassyContact'));
});

/* ── 4) Finanzen & Zahlungen ────────────────────────────────────────── */

test('Sektor 4 Finanzen: Hauptkonto Basis, Modul-Felder mit ref:person', () => {
  const { V } = require('./load-kern.js').ladeKern();
  const s = V.SEKTOR_BY_ID.finance;
  const felder = s.sektionen[0].felder;
  // Kern: Konten-Liste (U2-ADR-074 — aus konto_haupt_bank/-iban; Bank·Art·IBAN·Bankvollmacht·Notiz je Konto).
  const konten = felder.find(f => f.id === 'accounts');
  assert.ok(konten && konten.typ === 'liste' && (konten.ebene || 'kern') === 'kern', 'konten-Liste kern-level');
  assert.equal((konten.unterFelder || []).map(u => u.id).join(','), 'institution,accountType,iban,bankingPowersOfAttorneyFrom,note,garnishmentProtection'); // 20.09.2026: + garnishmentProtection (U2-ADR-424)
  assert.ok(!felder.find(f => /konto_haupt/.test(f.id)), 'alte Skalar-Slots weg');
  // Modul: Steuerberater als ref:person
  const sb = felder.find(f => f.id === 'taxAdvisor');
  assert.equal(sb.typ, 'ref'); assert.equal(sb.entitaet, 'person'); assert.equal(sb.ebene, 'modul');
});

test('Sektor 4 Finanzen: Kreditkarten sind EINE Liste und leben hier (kk-Trennung 30.05. · U2-ADR-073)', () => {
  const { V } = require('./load-kern.js').ladeKern();
  const felder = V.SEKTOR_BY_ID.finance.sektionen[0].felder;
  // U2-ADR-073 Teil 1: kreditkarte1/2 → EINE Liste `kreditkarten` (mehrere Karten).
  const kk = felder.find(f => f.id === 'creditCards');
  assert.ok(kk, 'kreditkarten-Liste in Finanzen vorhanden');
  assert.equal(kk.typ, 'liste');
  assert.equal((kk.unterFelder || []).map(u => u.id).join(','), 'providerLast4Digits,validUntil');
  assert.ok(!felder.find(f => f.id === 'kreditkarte1' || f.id === 'kreditkarte2'), 'alte Slots kreditkarte1/2 weg');
  // Die alte kk-Fehlbenennung (Kreditkarte unter id kk1/kk2) ist weg — nirgends mehr.
  for (const sid of Object.keys(V.SEKTOR_BY_ID)) {
    for (const sek of V.SEKTOR_BY_ID[sid].sektionen) {
      for (const f of sek.felder) {
        assert.ok(f.id !== 'kk1' && f.id !== 'kk2',
          `id ${f.id} in Sektor ${sid}: kk1/kk2 dürfen als Feld-id nicht mehr existieren`);
      }
    }
  }
});

test('Sektor 4 Finanzen: Cross-Ref-Quellen Bildung sichtbar im Render', async () => {
  const { html, V } = await render('finance');
  assert.ok(html.includes(V.STRINGS.crossSektorTitel));
  // Drei Cross-Ref-Felder aus Bildung
  for (const fid of ['grossMonthlyIncome', 'netMonthlyIncome', 'typeOfIncome']) {
    assert.ok(html.includes(fid) || html.includes('Brutto-Monatseinkommen') || html.includes('Einkommensart'),
      'cross-ref ' + fid + ' sichtbar oder via Label');
  }
});

/* ── 5) Gesundheit ──────────────────────────────────────────────────── */

test('Sektor 5 Gesundheit: eine Sektion, ref:person für Ärzte', () => {
  const { V } = require('./load-kern.js').ladeKern();
  const s = V.SEKTOR_BY_ID.health;
  assert.equal(s.format, V.SEKTOR_FORMATE.FHIR_IPS);
  assert.equal(s.sektionen.length, 1);   // Nur die Haupt-Sektion — labor-Sektion entfernt (E3, Datenmodell-Konzept v1.2 §3); pflegegrad-sek war aufgelöst (U2-ADR-019)
  // E3-Pin: keine labor-Sektion, kein laborwerte-Feld mehr — der konforme Laborweg ist der
  // autoritative Import (U2-ADR-045/048); Multi-Entry kommt künftig per Template, nicht als Basis-Feld.
  assert.ok(!s.sektionen.find(sek => sek.id === 'labor'), 'E3: labor-Sektion entfernt');
  const felder0 = s.sektionen[0].felder;
  assert.ok(!felder0.find(f => f.id === 'laborwerte'), 'E3: kein laborwerte-Feld in der Basis');
  // E2-Pin: impfungen/implantate sind reiner Freitext — Stub-Code-Slots entfernt (Code-Slot nur mit lesendem Generator).
  for (const fid of ['vaccinations', 'implantsProsthesesPacemakers']) {
    const f = felder0.find(x => x.id === fid);
    assert.ok(f && f.typ === 'text' && !f.codeListe, 'E2: ' + fid + ' ohne codeListe-Stub-Slot');
  }
  // E1-Pin: kein BMI-Export-Versprechen mehr im Hint (kein Generator baut ihn).
  for (const fid of ['heightCm', 'bodyWeightKg']) {
    const f = felder0.find(x => x.id === fid);
    assert.ok(f && !(f.hint && f.hint.includes('BMI')), 'E1: ' + fid + ' ohne BMI-Hint');
  }
  // hausarzt = ref:person mit Rolle (facharzt_1/2/3 → fachaerzte-Liste, U2-ADR-072 Teil 2)
  const hausarzt = felder0.find(f => f.id === 'generalPractitioner');
  assert.equal(hausarzt.typ, 'ref');
  assert.equal(hausarzt.entitaet, 'person');
  assert.equal(hausarzt.rolle, V.PERSON_ROLLEN.ARZT);
  // Blutgruppe als auswahl — 8 Werte + 'unbekannt' = 9
  const bg = felder0.find(f => f.id === 'bloodType');
  assert.equal(bg.typ, 'auswahl');
  assert.equal(bg.optionen.length, 9);
  assert.ok(bg.optionen.some(o => o.wert === 'unbekannt'));
});

test('Sektor 5 Gesundheit: codeListe-Marker auf genau drei Feldern, operationen NICHT als Feld', () => {
  const { V } = require('./load-kern.js').ladeKern();
  const s = V.SEKTOR_BY_ID.health;
  const alleFelder = s.sektionen.flatMap(sek => sek.felder);
  // Genau drei text+code-Felder tragen den codeListe-Marker: die IPS-Pflichtsektionen mit lesendem
  // Generator (Frage 11; E2, Datenmodell-Konzept v1.2 §3 zog die Stub-Slots impfungen/implantate).
  const mitCode = alleFelder.filter(f => f.codeListe).map(f => f.id);
  const erwartet = ['allergiesMedicationFoodOther', 'chronicConditionsDiagnoses', 'medicationOngoing'];
  assert.equal(mitCode.length, erwartet.length, 'genau drei codeListe-Felder, ist: ' + mitCode.join(', '));
  for (const id of erwartet) assert.ok(mitCode.includes(id), `codeListe-Feld ${id} vorhanden`);
  // operationen wurde zurückgenommen — kommt als Template-Feld (voroperationen) mit dem Andock-Auftrag.
  assert.ok(!alleFelder.find(f => f.id === 'operationen'),
    'operationen ist kein Modul-Feld mehr');
});

/* ── 6) Bildung & Beruf ─────────────────────────────────────────────── */

test('Sektor 6 Bildung: ein Beruf-Feld (zusammengeführt aus 3 rc1-Feldern)', () => {
  const { V } = require('./load-kern.js').ladeKern();
  const felder = V.SEKTOR_BY_ID.education.sektionen[0].felder;
  const beruf = felder.filter(f => f.id === 'occupationRole' || f.id === 'beruf_hauptberuf' || f.id === 'beruf_aktuell');
  assert.equal(beruf.length, 1, 'genau ein Beruf-Feld');
  assert.equal(beruf[0].id, 'occupationRole');
  // Arbeitgeber als ref:institution
  const ag = felder.find(f => f.id === 'employer');
  assert.equal(ag.typ, 'ref'); assert.equal(ag.entitaet, 'institution');
});

/* ── 7) Sozialversicherung ──────────────────────────────────────────── */

test('Sektor 7 Sozialversicherung: drei Sektionen + GdB Basis', () => {
  const { V } = require('./load-kern.js').ladeKern();
  const s = V.SEKTOR_BY_ID.socialInsurance;
  assert.equal(s.format, V.SEKTOR_FORMATE.SD_JWT_VC);   // U2-ADR-030: Etikett auf den real gebauten Pfad korrigiert (war W3C_VC, totes Etikett)
  // Auftragskette 14.08.2026, Glied 3 (Zug 3): dritte Sektion „Arbeitslosigkeit" hinzugekommen.
  assert.equal(s.sektionen.length, 3);   // Renten-Pflege + Schwerbehinderung + Arbeitslosigkeit
  // GdB ist Kern in Sektion 2
  const gdb = s.sektionen[1].felder.find(f => f.id === 'degreeOfDisabilityGdb');
  assert.ok(gdb && (gdb.ebene || 'kern') === 'kern');
});

test('Sektor 7: Cross-Refs Krankenkasse/Versichertennummer/EHIC aus Gesundheit, NICHT Kreditkarte', async () => {
  const { html, V } = await render('socialInsurance');
  assert.ok(html.includes(V.STRINGS.crossSektorTitel));
  // Die Heimat-Felder der Sozialvers.-Sicht sind jetzt kv_art/kv_nummer/ehic_nr (kk-Trennung 30.05.).
  const cs = V.CROSS_SEKTOR_FELDER.filter(e => e.ziel === 'socialInsurance');
  const felder = cs.map(e => e.feld);
  for (const f of ['healthInsurance', 'insuranceNumber', 'ehicCardEuropeanHealth']) {
    assert.ok(felder.includes(f), `${f} → socialInsurance angemeldet`);
    assert.ok(cs.find(e => e.feld === f).quelle === 'health', `${f} Heimat ist health`);
  }
  // Keine Kreditkarte mehr in der Sozialvers.-Sicht — der v1-Mitnahme-Cross-Ref ist weg.
  assert.ok(!felder.includes('kk1') && !felder.includes('kk2') &&
            !felder.includes('kreditkarte1') && !felder.includes('kreditkarte2'),
    'keine Kreditkarte als Cross-Ref nach Sozialversicherung');
});

/* ── 8) Vorsorge & Recht ────────────────────────────────────────────── */

test('Sektor 8 Vorsorge: vier Sektionen — Instrumente leben in der Liste (U2-ADR-096)', () => {
  const { V } = require('./load-kern.js').ladeKern();
  const s = V.SEKTOR_BY_ID.advanceCare;
  assert.equal(s.format, V.SEKTOR_FORMATE.GENERISCH);
  // U2-ADR-096: die fuenf Instrument-Sektionen mit ihren „vorhanden?"-Gates sind aufgeloest.
  // Ein Instrument lebt ausschliesslich als Eintrag in `provisionInstruments`. Was bleibt, sind
  // die Sektionen, die KEIN Instrument beschreiben.
  // `erbschein-vorbereitung` (Auftrag 27.08.2026) ist ebenfalls kein Instrument — ein Auszug,
  // eigener Renderer statt Feld (s. SEKTION_OHNE_FELDER_OK in regal-sprungziele.test.js).
  assert.equal(s.sektionen.map(sek => sek.id).join('|'), 'meine-vorsorge|estate|erbschein-vorbereitung|care-preferences');
  const inSek = (id) => s.sektionen.find(sek => sek.id === id).felder.map(f => f.id);
  assert.equal(inSek('meine-vorsorge').join('|'), 'provisionInstruments', 'genau EIN Ort fuer Instrumente');
  // Sperrliste: bewusst NICHT abgerissen (U2-ADR-067 §3 — gesetzliche Erbfolge gilt ohne Testament).
  assert.ok(inSek('estate').includes('heirsBriefOverview'), 'erben bleibt — kein Instrument-Feld');
  for (const id of ['personalCareDignity', 'dietSpecialRequirements', 'dailyRoutineActivities',
                    'otherWishesNotes', 'aidsEGWalkerHearingAid']) {
    assert.ok(inSek('care-preferences').includes(id), 'Sperrliste: ' + id + ' bleibt');
  }
  // Nachlese F8/M1 Zug 2 (11.08.2026): Ziffer-2.7-Klausel-Felder, bewusst hier statt in einer
  // eigenen Sektion verortet, um diese Drei-Sektionen-Zusicherung nicht anzutasten.
  for (const id of ['contentOfTheAdvanceDirective', 'contentOfTheAdvanceDirective2']) {
    assert.ok(inSek('care-preferences').includes(id), 'Ziffer-2.7-Feld: ' + id + ' liegt in care-preferences');
  }
  // pflege_vorsorge_geprueft ist ein pflwiz-Prozessmarker, kein Instrument-Feld — verortet, nicht gestrichen.
  assert.ok(inSek('care-preferences').includes('provisionDocumentsCheckedIn'));
  // ABRISS-BEDINGUNG: kein Gate, kein abgeloestes Flachfeld mehr im Sektor.
  const alle = s.sektionen.flatMap(sek => sek.felder).map(f => f.id);
  for (const weg of ['vollmacht_vorhanden', 'patientenverf_vorhanden', 'testament_vorhanden',
                     'custodianship-declaration', 'guardian-nomination', 'testament_ort', 'testament_datum',
                     'patientenverf_ort', 'proposedPerson', 'betreuung_ort', 'organDonation',
                     'proposedPerson2', 'centralRegisterOfPowersOf', 'medicalSupervisionBy']) {
    assert.ok(!alle.includes(weg), 'abgerissen, lebt jetzt in der Liste: ' + weg);
  }
});

test('Sektor 8 Vorsorge: Detailfelder haengen am `typ` der Instrument-Zeile (U2-ADR-096)', () => {
  const { V } = require('./load-kern.js').ladeKern();
  const s = V.SEKTOR_BY_ID.advanceCare;
  const liste = s.sektionen.flatMap(sek => sek.felder).find(f => f.id === 'provisionInstruments');
  const uf = (id) => (liste.unterFelder || []).find(u => u.id === id);
  // Die Kopplung lebt weiter — nur nicht mehr am Gate, sondern an der Typ-Diskriminante.
  const sw = (id) => { const f = uf(id); const b = f && f.sichtbarWenn; return b ? b.feld + ':' + (Array.isArray(b.wert) ? b.wert.join(',') : b.wert) : '—'; };
  assert.equal(sw('proposedPerson'), 'instrument:custodianship-declaration');
  assert.equal(sw('proposedPerson2'), 'instrument:guardian-nomination');
  assert.equal(sw('statutorySuccessionOr'), 'instrument:will');
  assert.equal(sw('organDonation'), 'instrument:living-will');
  // Die beiden heimatlosen Flachfelder sind hier verortet (E4 / E1), nicht verloren.
  assert.equal(sw('centralRegisterOfPowersOf'), 'instrument:enduring-power-of-attorney', 'ZVR-Nummer: das einzige „letzte Tor"');
  assert.equal(sw('medicalSupervisionBy'), 'instrument:living-will');
  // Erbe-Inhalt bleibt ungekoppelt und ausserhalb der Liste (U2-ADR-067 §3).
  const erben = s.sektionen.flatMap(sek => sek.felder).find(f => f.id === 'heirsBriefOverview');
  assert.ok(erben && !erben.sichtbarWenn, 'erben nicht an ein Instrument gekoppelt');
  // Verwaiste PV-Reste bleiben aus dem Formular entfernt.
  const alleIds = s.sektionen.flatMap(sek => sek.felder).map(f => f.id)
    .concat((liste.unterFelder || []).map(u => u.id));
  for (const id of ['patientenverf_haltung', 'patientenverf_wunsch', 'palliativ_wunsch']) {
    assert.ok(!alleIds.includes(id), 'verwaister PV-Rest bleibt entfernt: ' + id);
  }
});

test('Sektor 8: Organspende-Einschraenkung als bedingtes Freitextfeld (jetzt Unterfeld)', () => {
  const { V } = require('./load-kern.js').ladeKern();
  const liste = V.SEKTOR_BY_ID.advanceCare.sektionen.flatMap(sek => sek.felder)
    .find(f => f.id === 'provisionInstruments');
  const uf = liste.unterFelder || [];
  const einschr = uf.find(f => f.id === 'whatRestriction');
  assert.ok(einschr, 'organspende_einschraenkung existiert (als Unterfeld der Instrument-Liste)');
  assert.equal(einschr.typ, 'textarea');
  assert.equal(einschr.sichtbarWenn.feld, 'organDonation');
  assert.equal(einschr.sichtbarWenn.wert, 'teil');
  // Guard gegen stillen Drift — unveraendert gueltig, nur eine Ebene tiefer: der sichtbarWenn-Wert
  // MUSS eine reale Auswahl-Option von 'organDonation' sein, sonst erschiene das Freitextfeld nie,
  // und ein unsichtbares Feld faellt im Klick-Test nicht auf. (Befund 30.05.)
  const quelle = uf.find(f => f.id === einschr.sichtbarWenn.feld);
  assert.ok(quelle && Array.isArray(quelle.optionen), 'Quell-Feld organspende hat Optionen');
  assert.ok(quelle.optionen.some(o => o.wert === einschr.sichtbarWenn.wert),
    `sichtbarWenn.wert '${einschr.sichtbarWenn.wert}' ist eine echte Option von organspende`);
});

/* ── 9) Verwaltung & Behörden — KI-Verfügung wizard-getrieben (U2-ADR-069) ───────── */

test('Sektor 9 Verwaltung: zwei Sektionen; die KI-Verfügung ist ausgezogen (Block H), Krisenvorsorge ausgezogen (F6)', () => {
  const { V } = require('./load-kern.js').ladeKern();
  const s = V.SEKTOR_BY_ID.administration;
  assert.equal(s.format, V.SEKTOR_FORMATE.XOEV);
  // Block H (23.07.2026): Die Sektion `ki-verfuegung` ist entfallen. Sie trug seit Block E KEIN
  // Feld mehr — die zwölf ki_*-Werte housing in der Vorsorge-Instrument-Liste. Zurück blieb eine
  // Überschrift, auf die die Regal-Karte sprang: ein Sprungziel ohne Inhalt. Der Test prüfte
  // vorher genau diesen leeren Zustand als Soll („trägt keine manuellen Felder mehr") — er hielt
  // eine Zwischenstufe fest, die inzwischen aufgelöst ist.
  // F6 (10.08.2026): Krisenvorsorge (war die dritte Sektion, Templates-Trio Baustein 2,
  // 02.08.2026) ist ein eigenständiger Bereich geworden (`V.SEKTOR_BY_ID.emergencyPreparedness`) —
  // die Drei-Sektionen-Zählung war ein Schnappschuss des vorigen Standes, kein Deckel.
  assert.equal(s.sektionen.length, 2);   // BundID + Geräte
  assert.equal(s.sektionen.map(x => x.id).join(','),
    'bundid-vorgaenge,geraete-digitale-zugaenge');
  assert.ok(!s.sektionen.some(x => x.id === 'ki-verfuegung'),
    'die leere KI-Sektion ist entfallen — die Regal-Karte führt an den einen Ort');
  const kiwiz = V.WIZARDS.find(w => w.id === 'kiwiz');
  assert.ok(kiwiz, 'kiwiz treibt die KI-Verfügung');
  // U2-ADR-096 Block E: kiwiz zielt auf die KI-ZEILE der Instrument-Liste, nicht mehr flach auf
  // administration. Geprueft wird das ganze Ziel, nicht nur der Sektor — ein halb umgestelltes Ziel
  // (richtiger Sektor, fehlende Liste) schriebe wieder flach und saehe hier trotzdem richtig aus.
  assert.equal(JSON.stringify(kiwiz.ziel),
    JSON.stringify({ sektor: 'advanceCare', liste: 'provisionInstruments', instrument: 'ki-verfuegung' }),
    'kiwiz zielt auf die KI-Zeile der Vorsorge-Instrument-Liste');
});

test('Sektor 9: KI-Eingang — Feld 1 (Grundentscheidung) trägt Untersagung + Erlaubnis', () => {
  const { V } = require('./load-kern.js').ladeKern();
  const grund = V.KI_KORPUS.steps.find(s => s.feld.id === 'basicDecision');
  assert.ok(grund, 'basicDecision ist ein Schritt');
  assert.equal(grund.feld.optionen.map(o => o.wert).join(','), 'untersagung,erlaubnis');
  // Das Gate lebt im Generator (KI_MODUL): Bedingungs-Bausteine sind auf 'erlaubnis' gated (s. ki-generator.test.js).
});

test('Sektor 9: KI-Nachlassverwalter läuft über den Personen-Mechanismus (refMehrfach, wie Erben)', () => {
  const { V } = require('./load-kern.js').ladeKern();
  const nv = V.KI_KORPUS.steps.find(s => s.feld.id === 'digitalEstateAdministration2');
  assert.ok(nv, 'digitalEstateAdministration2 existiert');
  assert.equal(nv.feld.typ, 'refMehrfach');
  assert.equal(nv.feld.entitaet, 'person');
});

/* ── 10) Persönliches (id-Umbenennung von vivo) ─────────────────────── */

test('Sektor 10 Persönliches: id ist personal (nicht vivo); zwei Sektionen', () => {
  const { V } = require('./load-kern.js').ladeKern();
  assert.equal(V.SEKTOR_BY_ID.vivo, undefined, 'vivo gibt es nicht mehr');
  const s = V.SEKTOR_BY_ID.personal;
  assert.ok(s);
  assert.equal(s.label, 'Persönliches');
  assert.equal(s.sektionen.length, 2);   // Erinnerungen + Bestattung
  // Szenario-Briefe in Erinnerungen
  const briefe = s.sektionen[0].felder.map(f => f.id);
  for (const k of ['letterForTheEmergencyDoctor', 'letterForTheHospitalScenario', 'letterForTheCareHomeAdmission', 'letterForTheDeathScenario']) {
    assert.ok(briefe.includes(k), 'brief ' + k);
  }
});

/* ── 11) Wohnen & Eigentum (neu) ────────────────────────────────────── */

test('Sektor 11 Wohnen: neuer Sektor, vermieter als ref:person', () => {
  const { V } = require('./load-kern.js').ladeKern();
  const s = V.SEKTOR_BY_ID.housing;
  assert.ok(s, 'Sektor housing existiert (neu in U2)');
  assert.equal(s.format, V.SEKTOR_FORMATE.GENERISCH);
  assert.equal(s.icon, 'home');
  // Zwei Sektionen: Hauptwohnung + Zweitwohnung (Frage 8, Entscheidung 30.05.)
  assert.equal(s.sektionen.length, 2);
  const felderHaupt = s.sektionen[0].felder;
  const vermieter = felderHaupt.find(f => f.id === 'landlordPropertyManagement');
  assert.equal(vermieter.typ, 'ref');
  assert.equal(vermieter.entitaet, 'person');
  assert.equal(vermieter.rolle, V.PERSON_ROLLEN.VERMIETER);
});

test('Sektor 11 Wohnen: Hauptwohnung ohne wohnung_adresse (Cross-Ref aus Identität)', () => {
  const { V } = require('./load-kern.js').ladeKern();
  const haupt = V.SEKTOR_BY_ID.housing.sektionen[0];
  // Adresse wird per Cross-Ref aus Identität (strasse, plz_ort) gezeigt — kein eigenes Adressfeld mehr.
  assert.ok(!haupt.felder.find(f => f.id === 'wohnung_adresse'),
    'wohnung_adresse entfernt — Adresse kommt per Cross-Ref aus Identität');
  // Cross-Sektor-Anmeldung für strasse + plz_ort → housing
  const cs = V.CROSS_SEKTOR_FELDER.filter(e => e.ziel === 'housing');
  assert.ok(cs.some(e => e.quelle === 'identity' && e.feld === 'streetAddress'),
    'identity.streetAddress → housing angemeldet');
  assert.ok(cs.some(e => e.quelle === 'identity' && e.feld === 'postcodeCity'),
    'identity.postcodeCity → housing angemeldet');
});

test('Sektor 11 Wohnen: weitere Wohnungen als Liste, je mit eigener Adresse (U2-ADR-073 Hybrid)', () => {
  const { V } = require('./load-kern.js').ladeKern();
  const zweit = V.SEKTOR_BY_ID.housing.sektionen[1];
  assert.equal(zweit.id, 'wohnen-zweit');
  // U2-ADR-073 Teil 1 (Hybrid): die zw_*-Flachfelder → EINE Liste `weitere_wohnungen`; Hauptwohnung bleibt Singleton.
  assert.equal(zweit.felder.length, 1);
  const liste = zweit.felder[0];
  assert.equal(liste.id, 'furtherHomes');
  assert.equal(liste.typ, 'liste');
  const uids = (liste.unterFelder || []).map(u => u.id);
  assert.ok(uids.includes('streetHouseNumber'),   'eigene Adresse: Straße');
  assert.ok(uids.includes('postcodeCity'),   'eigene Adresse: PLZ/Ort');
  assert.ok(uids.includes('ownedOrRented'),       'Sachdaten: Eigentum/Miete');
  assert.ok(uids.includes('propertyManagement'), 'Sachdaten: Vermieter');
  assert.ok(uids.includes('serviceCharges'),     'Sachdaten: Miete');
  assert.ok(uids.includes('rentalDepositBankAmount'),   'Sachdaten: Kaution');
  assert.ok(!zweit.felder.find(f => /^zw_/.test(f.id)), 'alte zw_*-Slots weg');
});

/* ── Sammelte Beispiele-Prüfung ─────────────────────────────────────── */

test('Beispiele-Disziplin: alle text/textarea-Kern-Felder der neuen Sektoren tragen ein beispiel', () => {
  const { V } = require('./load-kern.js').ladeKern();
  const sektoren = ['people', 'mobility', 'finance', 'health', 'education',
                    'socialInsurance', 'advanceCare', 'administration', 'housing', 'personal'];
  const ohne = [];
  for (const sid of sektoren) {
    const s = V.SEKTOR_BY_ID[sid];
    for (const sek of s.sektionen) {
      for (const f of (sek.felder || [])) {
        // Skalare Text-Felder mit Kern-Ebene erwarten ein beispiel; Auswahl/Datum/Ref/Liste ausgenommen
        if ((f.typ === 'text' || f.typ === 'textarea') && !f.beispiel) {
          ohne.push(sid + '.' + f.id);
        }
      }
    }
  }
  assert.equal(ohne.length, 0, 'Felder ohne beispiel: ' + ohne.join(', '));
});

/* ── Render-Smoke für alle 10 Sektoren ──────────────────────────────── */

test('Render-Smoke: alle 10 Sektoren rendern ohne Crash', async () => {
  const { V, document } = require('./load-kern.js').ladeKern();
  await V.depotAnlegen('pw');
  for (const sid of ['people', 'mobility', 'finance', 'health', 'education',
                     'socialInsurance', 'advanceCare', 'administration', 'housing', 'personal']) {
    V.renderSektor(sid);
    const html = document.getElementById('content').innerHTML;
    assert.ok(html.length > 0, sid + ' rendert');
    assert.ok(html.includes('pause-erlaubnis'), sid + ' hat Pausen-Zeile');
  }
});

/* ── id-Kollisions-Guard (kk-Trennung 30.05.) ──────────────────────────
   Eine Feld-id darf nicht zwei verschiedene Labels über zwei Sektoren tragen.
   Genau dieser Fehler steckte hinter der kk-Doppelbelegung (kk = Kreditkarte
   hier, Krankenkasse dort). Der Guard fängt jeden künftigen stillen Drift. */

test('id-Guard: keine Feld-id trägt zwei verschiedene Labels in zwei Sektoren', () => {
  const { V } = require('./load-kern.js').ladeKern();
  // id -> Set { 'sektorId|label' }. Nur Top-Level-Sektor-Felder; unterFelder sind
  // listen-lokal (z. B. 'name' wiederholt sich legitim) und bleiben außen vor.
  const belegung = new Map();
  for (const sid of Object.keys(V.SEKTOR_BY_ID)) {
    for (const sek of V.SEKTOR_BY_ID[sid].sektionen) {
      for (const f of (sek.felder || [])) {
        if (!belegung.has(f.id)) belegung.set(f.id, new Set());
        belegung.get(f.id).add(f.label);
      }
    }
  }
  const kollisionen = [];
  for (const [id, labels] of belegung) {
    if (labels.size > 1) kollisionen.push(`${id}: ${[...labels].join(' / ')}`);
  }
  assert.equal(kollisionen.length, 0,
    'id-Kollision (eine id, mehrere Labels): ' + kollisionen.join('  |  '));
});

/* ── U2-ADR-046 ②③: Herausgeben-Chooser Gesundheit (Durchstich-Aufräumen) ── */

test('[U2-ADR-046 ②③] Gesundheit-Chooser: nur fhir-ips mit Kurz-Label; self-erzeugter fhir-lab-Laborbericht gezogen', () => {
  const { V } = require('./load-kern.js').ladeKern();
  const exp = V.SEKTOR_BY_ID.health.exporte || [];
  const formate = exp.map(e => e.format);
  assert.ok(formate.includes('fhir-ips'), 'fhir-ips (Gesundheitsdaten) bleibt im Chooser');
  assert.ok(!formate.includes('fhir-lab'), '③ self-erzeugter fhir-lab (nicht eu-lab-konform) NICHT mehr im Chooser — der konforme Weg ist der autoritative Import (U2-ADR-045/047)');
  const ips = exp.find(e => e.format === 'fhir-ips');
  assert.equal(ips.label, 'Gesundheitsdaten', '② Kurz-Label (keine „…als maschinenlesbare Datei"-Dopplung; Präfix „Maschinenlesbar —" kommt aus flowHerausgeben)');
});

/* ── mehr-Block: kein „mehr"-Toggle, wenn die Sektion nur Modul-Felder hat ──
   Eine Sektion ohne Kern-Felder (z. B. „Verfügung zur digitalen Nachbildung") darf ihren
   ganzen Inhalt NICHT hinter einem „mehr"-Toggle verstecken — das klappt das
   Einzige zu statt Zusätzliches auf (missverständlich, 30.05.). */

test('mehr-Block: Sektion ohne Kern-Felder rendert Modul-Felder direkt (kein mehr-Toggle)', async () => {
  const { V, document } = ladeKern();
  await V.depotAnlegen('pw');
  V.renderSektor({
    id: 'tmehr', label: 'Test', format: V.SEKTOR_FORMATE.GENERISCH, icon: 'star',
    sektionen: [{ id: 'allmodul', label: 'Nur Modul', felder: [
      { id: 'm1', label: 'Modulfeld A', typ: 'text', ebene: 'modul' },
      { id: 'm2', label: 'Modulfeld B', typ: 'text', ebene: 'modul' },
    ] }],
  });
  const html = document.getElementById('content').innerHTML;
  assert.ok(!html.includes('mehr-block'), 'kein mehr-Block, wenn die Sektion nur Modul-Felder trägt');
  assert.ok(html.includes('Modulfeld A') && html.includes('Modulfeld B'), 'Modul-Felder direkt sichtbar');
});

test('mehr-Block: Sektion mit Kern UND Modul behält den mehr-Block', async () => {
  const { V, document } = ladeKern();
  await V.depotAnlegen('pw');
  V.renderSektor({
    id: 'tmehr2', label: 'Test', format: V.SEKTOR_FORMATE.GENERISCH, icon: 'star',
    sektionen: [{ id: 'mix', label: 'Gemischt', felder: [
      { id: 'k1', label: 'Kernfeld', typ: 'text' },
      { id: 'm1', label: 'Modulfeld', typ: 'text', ebene: 'modul' },
    ] }],
  });
  const html = document.getElementById('content').innerHTML;
  assert.ok(html.includes('mehr-block'), 'mehr-Block bleibt, wenn Kern-Felder vorhanden sind');
});
