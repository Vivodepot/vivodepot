'use strict';
/* ════════════════════════════════════════════════════════════════════════
   F4 — sechs saubere Kataloge (Zug 1). Auftrag „F4 — die siebzehn
   verbliebenen Katalogfelder" (11.08.2026), Entscheidungsvorlage-Gruppe 1.

   Sechs Felder haben eine gesetzlich/amtlich feste Wertemenge und wechseln
   von `typ:'text'` auf `typ:'auswahl'`/`'mehrfachauswahl'`. Jedes Feld
   bekommt hier: den Katalog selbst (Typ + Optionen) UND die Migration
   (Schema 54→55) — ein Bestandswert, der exakt (case-insensitiv) auf einen
   Options-`wert`/`label` passt, wird übernommen; alles andere zieht
   VOLLSTÄNDIG in ein `<feldId>_frueher`-Rettungsfeld (U2-ADR-050), das
   Katalogfeld bleibt leer. Kein Parsen von Bürgerfreitext — nur exakter
   Treffer oder Rettungsfeld, nichts dazwischen.
   ════════════════════════════════════════════════════════════════════════ */
const test = require('node:test');
const assert = require('node:assert');
const { ladeKern } = require('./load-kern.js');

const FELDER = [
  { sektorId: 'identity', feldId: 'taxClass', typ: 'auswahl',
    werte: ['I', 'II', 'III', 'IV', 'IV_faktor', 'V', 'VI'] },
  { sektorId: 'education', feldId: 'typeOfIncome', typ: 'mehrfachauswahl',
    werte: ['angestellt', 'selbststaendig', 'beamtet', 'rente_pension', 'ausbildung_studium', 'arbeitslos', 'ohne_einkommen'] },
  // erb_erbschein/vj_krankenversicherung/geburt_kind_kv: Situationen-/Wizard-Korpus (SITUATIONEN) —
  // bleibt bewusst Deutsch, separat beauftragter Umbau, hier nicht anfassen.
  { sektorId: null, feldId: 'erb_erbschein', typ: 'auswahl',
    werte: ['nicht_noetig', 'noetig', 'beantragt', 'erteilt'] },
  { sektorId: null, feldId: 'vj_krankenversicherung', typ: 'auswahl',
    werte: ['familienversicherung', 'eigene_gesetzlich', 'privat', 'studentisch'] },
  { sektorId: null, feldId: 'geburt_kind_kv', typ: 'auswahl',
    werte: ['familienversicherung_gesetzlich', 'anderer_elternteil', 'eigene_privat'] },
  { sektorId: 'administration', feldId: 'bundidVerificationLevel', typ: 'auswahl',
    werte: ['niedrig', 'substanziell', 'hoch'] },
];

function situationsFeldDef(V, situationId, feldId) {
  const sit = (V.SITUATIONEN || []).find((s) => s.id === situationId);
  if (!sit) return null;
  for (const block of sit.bloecke || []) {
    for (const eintrag of block.eintraege || []) {
      if (eintrag.feld && eintrag.feld.id === feldId) return eintrag.feld;
    }
  }
  return null;
}

test('[F4-Zug1] alle sechs Felder tragen typ + vollständige Optionen', () => {
  const { V } = ladeKern();
  const situationMap = { erb_erbschein: 'erbfall', vj_krankenversicherung: 'volljaehrig', geburt_kind_kv: 'geburt' };
  for (const f of FELDER) {
    const def = f.sektorId ? V.feldDefFuer(f.sektorId, f.feldId) : situationsFeldDef(V, situationMap[f.feldId], f.feldId);
    assert.ok(def, f.feldId + ': Felddefinition nicht gefunden');
    assert.equal(def.typ, f.typ, f.feldId + ': falscher Typ');
    assert.ok(Array.isArray(def.optionen) && def.optionen.length === f.werte.length,
      f.feldId + ': erwartet ' + f.werte.length + ' Optionen, hat ' + (def.optionen || []).length);
    const werte = def.optionen.map((o) => o.wert);
    assert.deepEqual(werte, f.werte, f.feldId + ': Options-Werte weichen ab');
    for (const o of def.optionen) assert.ok(o.label && o.label.length, f.feldId + ': Option ohne Label (' + o.wert + ')');
  }
});

test('[F4-Zug1] bundid_status trägt die amtlichen eIDAS-Bezeichnungen wörtlich (nicht „mittel")', () => {
  const { V } = ladeKern();
  const def = V.feldDefFuer('administration', 'bundidVerificationLevel');
  const labels = def.optionen.map((o) => o.label.toLowerCase());
  assert.ok(labels.some((l) => l.includes('substanziell')), 'die mittlere eIDAS-Stufe heißt amtlich „substanziell", nicht „mittel"');
  assert.ok(!labels.some((l) => l.includes('mittel')), 'keine Umschreibung „mittel" — die amtliche Bezeichnung ist Pflicht');
});

test('[F4-Zug1] Migration 54→55: exakter Treffer wird übernommen, Rest zieht ins Rettungsfeld', () => {
  const { V } = ladeKern();
  const roh = {
    schemaVersion: 54,
    sektoren: {
      identitaet: { steuerklasse: 'IV' },                                        // exakter Treffer (wert)
      bildung: { einkommensart: 'Angestellt, Selbstständig' },                   // zwei Treffer (label, komma-getrennt)
      verwaltung: { bundid_status: 'Niveau hoch (mit eID-Funktion)' },           // KEIN exakter Treffer → Rettungsfeld
    },
  };
  const migriert = V.depotNormalisieren(roh);
  assert.equal(migriert.sektoren.identity.taxClass, 'IV', 'exakter wert-Treffer bleibt erhalten');
  assert.equal(migriert.sektoren.identity.taxClassEarlierEntry, undefined, 'kein Rettungsfeld nötig bei Treffer');
  assert.deepEqual(migriert.sektoren.education.typeOfIncome, ['angestellt', 'selbststaendig'], 'komma-getrennte Label-Treffer werden zu Werten');
  assert.equal(migriert.sektoren.administration.bundidVerificationLevel, '', 'kein Treffer → Katalogfeld bleibt leer');
  assert.equal(migriert.sektoren.administration.bundidVerificationLevelEarlier, 'Niveau hoch (mit eID-Funktion)', 'kompletter Alt-Text landet unverändert im Rettungsfeld');
  assert.ok(migriert.schemaVersion >= 55);
});

test('[F4-Zug1] Migration 54→55: leerer/fehlender Alt-Wert erzeugt kein Rettungsfeld', () => {
  const { V } = ladeKern();
  const roh = { schemaVersion: 54, sektoren: { identitaet: {}, bildung: {}, verwaltung: {} } };
  const migriert = V.depotNormalisieren(roh);
  assert.equal(migriert.sektoren.identity.taxClassEarlierEntry, undefined);
  assert.equal(migriert.sektoren.administration.bundidVerificationLevelEarlier, undefined);
});
