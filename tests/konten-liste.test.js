'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Phase 5 (U2-ADR-074) — Konten als LISTE (Verzeichnis, kein Bankzugang).
   finanzen/konto_haupt_bank + konto_haupt_iban (ein Konto, zwei Skalarfelder) →
   Liste `konten` {bank · art (Vorschlagsliste + frei) · iban · bankvollmacht
   (Record-id-Verweis auf eine art:'bank'-Vollmacht in Vorsorge) · notiz}. Geprüft:
     · Feld-Def + Art-Vorschläge (native datalist, frei), Alt-Slots weg.
     · Migration 36→37 verlustfrei (ein Eintrag, leer→entfällt, stabile id, idempotent).
     · Import auf Liste: B16 (konto_bank/konto_iban) + CAMT.053 (bank/iban; Saldo/
       Buchungen verworfen), je EIN konten-Eintrag.
     · Bankvollmacht-Ref-Entität: Vorschlag (nur art:'bank', Bank fehlt → Person·Ort),
       Resolver, Dangling-Toleranz, Select-only-Picker, Speichern via liesEintragAusDOM.
     · VC-Mapping-Bereinigung (bank_name/iban entfielen — VC ruht).
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

function kontenFeld(V) {
  return V.SEKTOR_BY_ID.finance.sektionen.flatMap(s => s.felder || []).find(f => f.id === 'accounts');
}
function sub(V, id) { return (kontenFeld(V).unterFelder || []).find(u => u.id === id); }
function migriere(V, finanzenPatch) {
  const d = V.leeresDepot();
  d.schemaVersion = 36;
  d.sektoren.finanzen = Object.assign({}, d.sektoren.finanzen, finanzenPatch);
  V.depotNormalisieren(d);
  return d;
}
/* C10 (Schema 42→43, 29.07.2026): `konten[].bank` ist eine Institutions-REFERENZ, kein Freitext
   mehr. Der Aufbau oben bleibt, wie er ist — im Alt-Depot IST der String der echte
   Ausgangszustand, und ihn hier durch ein Ref-Objekt zu ersetzen wuerde die Migration an ihrer
   eigenen Ausgabe messen statt an einem Alt-Depot (dieselbe Ueberlegung wie beim `codeListe`-
   Waechter, `vivodepot.html:13432`).

   Was sich aendert, ist die ERWARTUNG. Die Zusage der 36→37-Stufe war nie „der String steht
   woertlich in `bank`", sondern „der Wert geht nicht verloren". Dieser Helfer prueft genau das
   ueber alle drei gueltigen Formen — Ref auf das Register, `override`-Freitext, blanker
   Alt-String —, statt eine davon festzuschreiben. */
function bankName(d, eintrag) {
  const r = eintrag && eintrag.institution;
  if (r == null) return undefined;
  if (typeof r === 'string') return r;
  if (typeof r.override === 'string' && r.override) return r.override;
  return ((d.institutionen || []).find((i) => i.id === r.ref) || {}).name;
}

/* ── Feld-Definition + Art-Vorschläge ────────────────────────────────────── */
test('Feld: konten ist eine liste {bank · art · iban · bankvollmacht · notiz}; Alt-Slots weg', () => {
  const { V } = ladeKern();
  const f = kontenFeld(V);
  assert.ok(f && f.typ === 'liste');
  assert.equal((f.unterFelder || []).map(u => u.id).join(','), 'institution,accountType,iban,bankingPowersOfAttorneyFrom,note,garnishmentProtection'); // 20.09.2026: + garnishmentProtection (U2-ADR-424)
  // U2-ADR-074 Nachtrag (Kardinalität B): mehrere Bankvollmachten pro Konto (refMehrfach, n:m).
  assert.equal(sub(V, 'bankingPowersOfAttorneyFrom').typ, 'refMehrfach');
  assert.equal(sub(V, 'bankingPowersOfAttorneyFrom').entitaet, 'bank-power-of-attorney');
  assert.ok(!V.SEKTOR_BY_ID.finance.sektionen.flatMap(s => s.felder || []).find(x => /konto_haupt/.test(x.id)), 'alte Slots weg');
});

test('Art: Vorschlagsliste (offen) + freie Eingabe — native datalist, kein festes auswahl', () => {
  const { V } = ladeKern();
  const art = sub(V, 'accountType');
  assert.equal(art.typ, 'text', 'kein auswahl (offene Liste)');
  assert.ok(Array.isArray(art.vorschlaege) && art.vorschlaege.includes('Girokonto') && art.vorschlaege.includes('Depot'));
  // Render: <input list=…> + <datalist> mit den Vorschlägen; data-edit/data-typ bleiben „text".
  const html = V.feldInputHTML(art, 'Eigenes Konto');
  assert.match(html, /<input[^>]+list="vs-accountType"[^>]+data-edit="accountType"[^>]+data-typ="text"/);
  assert.match(html, /<datalist id="vs-accountType">[\s\S]*Girokonto[\s\S]*<\/datalist>/);
  assert.ok(html.includes('value="Eigenes Konto"'), 'freier Wert bleibt erhalten');
});

/* ── Migration 36→37 (verlustfrei) ───────────────────────────────────────── */
test('Migration: zwei Skalarfelder → EIN konten-Eintrag {bank, iban} mit stabiler id; Slots weg', () => {
  const { V } = ladeKern();
  const d = migriere(V, { konto_haupt_bank: 'Sparkasse München', konto_haupt_iban: 'DE89 3704 0044 0532 0130 00' });
  assert.equal(d.schemaVersion, V.SCHEMA_VERSION_AKTUELL);
  const k = d.sektoren.finance.accounts;
  assert.ok(Array.isArray(k) && k.length === 1);
  assert.equal(bankName(d, k[0]), 'Sparkasse München', 'Alt-Text verlustfrei auffindbar (C10: als Ref)');
  assert.equal(k[0].iban, 'DE89 3704 0044 0532 0130 00');
  assert.ok(typeof k[0].id === 'string' && k[0].id.length > 0, 'stabile id');
  assert.ok(!('konto_haupt_bank' in d.sektoren.finance) && !('konto_haupt_iban' in d.sektoren.finance), 'Slots entfernt');
});

test('Migration: nur ein Wert gesetzt → Eintrag mit nur dem Feld; leer → keine Liste; idempotent', () => {
  const { V } = ladeKern();
  const nurBank = migriere(V, { konto_haupt_bank: 'ING' });
  assert.equal(nurBank.sektoren.finance.accounts.length, 1);
  assert.equal(bankName(nurBank, nurBank.sektoren.finance.accounts[0]), 'ING');
  assert.ok(!('iban' in nurBank.sektoren.finance.accounts[0]));
  const leer = migriere(V, { konto_haupt_bank: '', konto_haupt_iban: '   ' });
  assert.ok(!('accounts' in leer.sektoren.finance), 'keine Liste ohne Daten');
  assert.ok(!('konto_haupt_bank' in leer.sektoren.finance), 'leere Slots dennoch entfernt');
  // Idempotenz: bestehende Liste bleibt unberührt.
  const d2 = V.leeresDepot(); d2.schemaVersion = 37;
  d2.sektoren.finanzen = Object.assign({}, d2.sektoren.finanzen, { konten: [{ id: 'k1', bank: 'DKB', iban: 'DE1' }] });
  V.depotNormalisieren(d2);
  assert.equal(d2.sektoren.finance.accounts.length, 1);
  assert.equal(d2.sektoren.finance.accounts[0].id, 'k1', 'id nicht neu vergeben');
});

/* ── Import auf Liste (B16 + CAMT) ───────────────────────────────────────── */
test('B16-Import: konto_bank/konto_iban → EIN konten-Eintrag; kein Skalar-Feld', () => {
  const { V } = ladeKern();
  const out = V._b16Felder({ data: { konto_bank: 'Commerzbank', konto_iban: 'DE89' } });
  const l = out.listen.find(x => x.sektorId === 'finance' && x.feldId === 'accounts');
  assert.ok(l && l.eintraege.length === 1);
  assert.equal(JSON.stringify(l.eintraege[0]), JSON.stringify({ institution: 'Commerzbank', iban: 'DE89' }));
  assert.equal(out.felder.filter(x => /^konto/.test(x.feldId)).length, 0, 'kein Skalar-Ziel');
});

test('CAMT.053: bank/iban → konten-Eintrag; Saldo/Buchungen bewusst verworfen (kein Journal)', () => {
  const { V } = ladeKern();
  /* A250 (16.08.2026): die Platzhalter-IBAN `DE12` steht hier nicht mehr — seit
     `_ibanPlausibel` prüft der Import Länge und Prüfsumme, und ein Platzhalter
     käme zu Recht nicht mehr an. Die Probe misst die ZUORDNUNG (bank/iban →
     Konten-Eintrag, Saldo/Buchungen verworfen), nicht die Prüfung; sie bekommt
     deshalb eine echte, prüfsummenrichtige IBAN statt einer Abschwächung der
     Prüfung. Dass ein Platzhalter NICHT ankommt, misst
     `tests/camt-iban-plausibel.test.js`. */
  const IBAN = 'DE89370400440532013000';
  const l = V._camt053Listen({ bank: 'Sparkasse', iban: IBAN, waehrung: 'EUR', saldo: '1234.56', buchungen: [{ betrag: '10' }] });
  assert.equal(l.length, 1);
  assert.equal(JSON.stringify(l[0].eintraege[0]), JSON.stringify({ institution: 'Sparkasse', iban: IBAN }));
  assert.ok(!('saldo' in l[0].eintraege[0]) && !('buchungen' in l[0].eintraege[0]), 'kein Journal');
  assert.equal(V._camt053Listen({}).length, 0, 'leer → nichts');
});

/* ── Bankvollmacht-Ref-Entität (Teil 2) ──────────────────────────────────── */
// U2-ADR-089 Teil A Block 1 (17.07.): die Vollmacht-Records leben jetzt in der geteilten
// Liste `vorsorge_instrumente`, jeder Record trägt zusätzlich `typ:'enduring-power-of-attorney'`.
function setDepotMitVollmachten(V) {
  const d = V.leeresDepot();
  d.menschen = [{ id: 'pA', name: 'Anna Beispiel' }, { id: 'pB', name: 'Bea Muster' }];
  d.sektoren.advanceCare = { provisionInstruments: [
    { id: 'vb1', instrument: 'enduring-power-of-attorney', typeOfPowerOfAttorney: 'bank', authorizedPersons: [{ ref: 'pA', override: '' }], storageLocation: 'Sparkasse' },
    { id: 'vb2', instrument: 'enduring-power-of-attorney', typeOfPowerOfAttorney: 'bank', authorizedPersons: [{ ref: 'pB', override: '' }], storageLocation: 'DKB' },
    { id: 'vg1', instrument: 'enduring-power-of-attorney', typeOfPowerOfAttorney: 'general', authorizedPersons: [{ ref: 'pA', override: '' }] },
  ] };
  V.setData(d);
  return d;
}

test('Bankvollmacht: Vorschlag listet NUR art:bank (Person·Ort, da Record kein Bank-Feld hat)', () => {
  const { V } = ladeKern();
  setDepotMitVollmachten(V);
  const vs = V.bankvollmachtVorschlag();
  assert.equal(vs.length, 2, 'nur die zwei art:bank');
  assert.deepEqual(vs.map(v => v.id).sort(), ['vb1', 'vb2']);
  assert.ok(vs.find(v => v.id === 'vb1').name.includes('Anna Beispiel') && vs.find(v => v.id === 'vb1').name.includes('Sparkasse'));
});

test('Bankvollmacht: Resolver löst id → „Person · Ort"; single-source; Dangling → ""', () => {
  const { V } = ladeKern();
  setDepotMitVollmachten(V);
  assert.equal(V.bankvollmachtAnzeige({ ref: 'vb2' }), 'Bea Muster · DKB');
  assert.equal(V.bankvollmachtAnzeige({ ref: 'weg' }), '', 'gelöschte/unbekannte id → leer');
  assert.equal(V.bankvollmachtAnzeige({ ref: 'vg1' }), '', 'general-Vollmacht ist keine Bankvollmacht');
  assert.equal(V.entitaetAnzeige({ ref: 'vb1' }, 'bank-power-of-attorney'), 'Anna Beispiel · Sparkasse', 'über entitaetAnzeige');
});

test('Bankvollmacht: Mehrfachauswahl als Ankreuz-Liste (mehrere pro Konto; kein Freitext/Neu; gewählte angehakt)', () => {
  const { V } = ladeKern();
  setDepotMitVollmachten(V);
  // Zwei Bankvollmachten für DIESES Konto angehakt (Regelfall: mehrere Bevollmächtigte).
  const html = V.feldInputHTML(sub(V, 'bankingPowersOfAttorneyFrom'), [{ ref: 'vb1' }, { ref: 'vb2' }]);
  assert.match(html, /data-refm-check="bankingPowersOfAttorneyFrom"[^>]+data-entitaet="bank-power-of-attorney"/);
  assert.equal((html.match(/data-refm-opt="bankingPowersOfAttorneyFrom"/g) || []).length, 2, 'eine Checkbox je art:bank-Vollmacht');
  assert.equal((html.match(/ checked/g) || []).length, 2, 'beide gewählten angehakt');
  assert.ok(html.includes('Anna Beispiel · Sparkasse') && html.includes('Bea Muster · DKB'), 'beide Kandidaten beschriftet');
  assert.ok(!html.includes('__neu__') && !html.includes('data-refm-add'), 'kein Neu/Hinzufügen (nur Ankreuzen)');
  // Nur eine angehakt → genau eine checked.
  assert.equal((V.feldInputHTML(sub(V, 'bankingPowersOfAttorneyFrom'), [{ ref: 'vb2' }]).match(/ checked/g) || []).length, 1);
  // Keine Bankvollmacht vorhanden → Leer-Hinweis.
  V.setData(V.leeresDepot());
  assert.ok(V.feldInputHTML(sub(V, 'bankingPowersOfAttorneyFrom'), []).includes('Noch keine Bankvollmacht'), 'Leer-Hinweis');
});

test('Bankvollmacht: mehrere Verweise werden alle aufgelöst (n:m — Regelfall mehrere Bevollmächtigte)', () => {
  const { V } = ladeKern();
  setDepotMitVollmachten(V);
  const feld = kontenFeld(V);
  const z = V.listenEintragZusammenfassung(feld, { id: 'k', institution: 'Sparkasse München', bankingPowersOfAttorneyFrom: [{ ref: 'vb1' }, { ref: 'vb2' }] });
  assert.ok(z.includes('Anna Beispiel · Sparkasse') && z.includes('Bea Muster · DKB'), 'beide Bankvollmachten aufgelöst');
  assert.ok(!/[\[\]{}"]/.test(z), 'keine JSON-/Array-Zeichen');
});

test('Bankvollmacht: Speicher-Logik hält das refMehrfach-Array {ref} (liesEintragAusWerten)', () => {
  const { V } = ladeKern();
  const feld = kontenFeld(V);
  // Die reine Werte→Eintrag-Logik. Der DOM-Ankreuz-Weg (liesEintragAusDOM → _refmCheckSammeln) wird im
  // Browser verifiziert — der Harness-DOM-Stub hält Checkbox-Zustände über querySelectorAll nicht zuverlässig.
  const gewaehlt = V.liesEintragAusWerten(feld, { institution: '', accountType: '', iban: '', note: '', bankingPowersOfAttorneyFrom: [{ ref: 'vb1' }, { ref: 'vb2' }] });
  assert.equal(JSON.stringify(gewaehlt.bankingPowersOfAttorneyFrom), JSON.stringify([{ ref: 'vb1' }, { ref: 'vb2' }]), 'mehrere Verweise als Array erhalten');
  assert.ok(!('institution' in gewaehlt) && !('iban' in gewaehlt), 'leere Text-Unterfelder verworfen');
});

/* ── K2 (Phase 6): Vorsorgevollmacht-Hinweis am Bankvollmacht-Picker ─────────
   Wenn eine Vorsorgevollmacht existiert, aber für DIESES Konto keine Bankvollmacht gewählt ist, blendet der
   Picker den Hinweis „Manche Banken verlangen zusätzlich …" ein. Bedingte Anzeige (Vorsorgevollmacht deckt
   das Konto global, doch manche Banken wollen zusätzlich eine eigene Bankvollmacht). Reine Anzeige, keine
   Struktur — getestet über den echten Render-Pfad feldInputHTML → _refmBankvollmachtHTML. */
const VV_HINWEIS = 'Manche Banken verlangen';

test('K2: Vorsorgevollmacht + keine art:bank vorhanden → Leer-Hinweis + Vorsorge-Hinweis', () => {
  const { V } = ladeKern();
  const d = V.leeresDepot();
  d.sektoren.advanceCare = { provisionInstruments: [{ id: 'vv1', instrument: 'enduring-power-of-attorney', typeOfPowerOfAttorney: 'vorsorge', authorizedPersons: [] }] };
  V.setData(d);
  const html = V.feldInputHTML(sub(V, 'bankingPowersOfAttorneyFrom'), []);
  assert.ok(html.includes('Noch keine Bankvollmacht'), 'Leer-Hinweis (keine art:bank)');
  assert.ok(html.includes(VV_HINWEIS), 'Vorsorge-Hinweis erscheint');
});

test('K2: Vorsorgevollmacht + art:bank vorhanden, aber für dieses Konto keine gewählt → Checkboxen + Hinweis', () => {
  const { V } = ladeKern();
  const d = setDepotMitVollmachten(V);   // vb1/vb2 = art:bank
  d.sektoren.advanceCare.provisionInstruments.push({ id: 'vv1', instrument: 'enduring-power-of-attorney', typeOfPowerOfAttorney: 'vorsorge', authorizedPersons: [] });
  V.setData(d);
  const html = V.feldInputHTML(sub(V, 'bankingPowersOfAttorneyFrom'), []);   // roh leer → keine gewählt
  assert.equal((html.match(/data-refm-opt="bankingPowersOfAttorneyFrom"/g) || []).length, 2, 'Checkboxen bleiben');
  assert.ok(html.includes(VV_HINWEIS), 'Hinweis, weil für dieses Konto keine gewählt');
});

test('K2: Vorsorgevollmacht + eine Bankvollmacht FÜR DIESES Konto gewählt → KEIN Hinweis', () => {
  const { V } = ladeKern();
  const d = setDepotMitVollmachten(V);
  d.sektoren.advanceCare.provisionInstruments.push({ id: 'vv1', instrument: 'enduring-power-of-attorney', typeOfPowerOfAttorney: 'vorsorge', authorizedPersons: [] });
  V.setData(d);
  const html = V.feldInputHTML(sub(V, 'bankingPowersOfAttorneyFrom'), [{ ref: 'vb1' }]);
  assert.ok(!html.includes(VV_HINWEIS), 'gewählt → kein Hinweis');
});

test('K2: keine Vorsorgevollmacht → KEIN Hinweis (auch bei leerer Auswahl)', () => {
  const { V } = ladeKern();
  setDepotMitVollmachten(V);   // nur art:bank + general, keine vorsorge
  const html = V.feldInputHTML(sub(V, 'bankingPowersOfAttorneyFrom'), []);
  assert.ok(!html.includes(VV_HINWEIS), 'ohne Vorsorgevollmacht kein Hinweis');
});

test('K2: Gate vollmacht_vorhanden==="ja" (ohne Record) zählt als Vorsorgevollmacht → Hinweis', () => {
  const { V } = ladeKern();
  const d = V.leeresDepot();
  d.sektoren.advanceCare = { vollmacht_vorhanden: 'ja' };
  V.setData(d);
  const html = V.feldInputHTML(sub(V, 'bankingPowersOfAttorneyFrom'), []);
  assert.ok(html.includes(VV_HINWEIS), 'Gate „ja" → Hinweis');
});

/* ── Situationsblatt + VC-Bereinigung ────────────────────────────────────── */
test('Situationsblatt „notar" zieht jetzt konten (nicht mehr konto_haupt_bank)', () => {
  const { V } = ladeKern();
  const notar = V.SITUATIONEN ? V.SITUATIONEN.find(s => s.id === 'notar') : null;
  const si = notar || (V.SITUATION_BY_ID && V.SITUATION_BY_ID.notar);
  assert.ok(si, 'notar-Situation existiert');
  const pulls = si.bloecke.flatMap(b => b.eintraege).filter(e => e && e.quelle === 'finance');
  assert.ok(pulls.some(e => e.feld === 'accounts'), 'zieht die konten-Liste');
  assert.ok(!pulls.some(e => e.feld === 'konto_haupt_bank'), 'kein Alt-Feld mehr');
});

test('VC-Bereinigung: der Finanz-VC mappt bank_name/iban NICHT mehr (VC ruht, U2-ADR-074)', () => {
  const { V } = ladeKern();
  const ziele = V.VC_FINANZEN_MAPPING.map(m => m.ziel);
  assert.ok(!ziele.includes('bank_name') && !ziele.includes('iban'), 'bank_name/iban entfielen');
  // Schnitt Glied 3 (22.08.2026, A448, U2-ADR-161): `tax_id` (steuerid) ist inzwischen SELBST
  // entfallen (steuerid ist jetzt eine Liste, s. tests/import-formate.test.js Test 10b) —
  // `pension_provider` (private_av_institut) ist der unveränderte Zeuge für „übrige Claims bleiben".
  assert.ok(ziele.includes('pension_provider'), 'übrige Skalar-Claims bleiben');
});
