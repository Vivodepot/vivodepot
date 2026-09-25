'use strict';
/* ════════════════════════════════════════════════════════════════════════
   B17 — Import-Plan kennt jetzt Listen-Selektoren
   ────────────────────────────────────────────────────────────────────────
   `_importPlanZeile` (`_planAusRoh`, geteilt von `importPlan` und
   `importPlanGeprueft`) löste eine `feldId` bis dahin über `_feldDef` auf —
   die sucht ausschliesslich in `sektor.sektionen[].felder`, also nur FLACHE
   Sektorfelder. Eine `feldId` der Form `liste:<liste>:<typ>:<unterfeld>`
   (U2-ADR-096, Selektor auf ein Unterfeld einer Listen-Zeile) fand dort
   nichts und fiel auf `{ id: feldId, typ: 'text', label: feldId }` zurück —
   die Bürgerin hätte im Import-Plan den technischen Selektor als
   Feldbeschriftung gesehen, etwa
   „liste:provisionInstruments:enduring-power-of-attorney:centralRegisterOfPowersOf" statt
   „Zentrales Vorsorgeregister — Eintragungsnummer".

   `feldDefFuer` löst BEIDE Formen auf (Kommentar an ihrer Definition: „fünf
   Kopien einer Regel sind fünf Gelegenheiten, dass eine davon den Selektor
   NICHT kennt") — sie steht bereits an fünf Stellen, `_importPlanZeile` ist
   jetzt die sechste Konsumentin statt einer siebten `_feldDef`-Kopie.

   ── ROTMACHBAR OHNE MUTIERTE KOPIE ─────────────────────────────────────
   Die Reparatur ist ein einzeiliger Funktionstausch in einer bereits real
   erreichbaren Funktion (`_planAusRoh`, exportiert über `ladeKern`) — eine
   zusätzliche `KERN_HTML_PATH`-Mutation würde denselben Code ein zweites Mal
   laden, ohne eine andere Aussage zu treffen. Rotmachbar ist die Probe hier
   direkt an der Voraussetzung: sie zeigt ERST, dass `_feldDef` (die alte
   Auflösung) für genau diese `feldId`-Form `undefined` liefert — DAS ist der
   Mechanismus, der den Fehler erzeugt hätte, wäre `_importPlanZeile` dabei
   geblieben —, und DANN, dass der tatsächliche Plan trotzdem das echte Label
   trägt. Ein Rückbau von `feldDefFuer` auf `_feldDef` in `_importPlanZeile`
   macht die zweite Prüfung sofort rot (Label fiele auf den rohen Selektor
   zurück), ohne dass die erste sich ändert.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

const LISTEN_FELD_ID = 'liste:provisionInstruments:enduring-power-of-attorney:centralRegisterOfPowersOf';
const ERWARTETES_LABEL = 'Zentrales Vorsorgeregister — Eintragungsnummer';

test('[B17·Voraussetzung] _feldDef (die alte Auflösung) kennt Listen-Selektoren NICHT', () => {
  const { V } = ladeKern();
  const def = V._feldDef('advanceCare', LISTEN_FELD_ID);
  assert.equal(def, undefined,
    'wäre `_feldDef` hier NICHT undefined, hätte der alte Rückfall auf den rohen Selektor nie ' +
    'gegriffen, und die Reparatur unten prüfte eine Voraussetzung, die gar nicht besteht.');
});

test('[B17] der Import-Plan zeigt für eine Listen-feldId das echte Unterfeld-Label, nicht den Selektor', () => {
  const { V } = ladeKern();
  const plan = V._planAusRoh('b17-test', { label: 'Test' }, {
    felder: [{ sektorId: 'advanceCare', feldId: LISTEN_FELD_ID, wert: '12345' }],
  });
  assert.equal(plan.zeilen.length, 1);
  const zeile = plan.zeilen[0];
  assert.equal(zeile.label, ERWARTETES_LABEL,
    'die Bürgerin sähe „' + LISTEN_FELD_ID + '" als Feldbeschriftung statt „' + ERWARTETES_LABEL +
    '" — genau der B17-Befund. Gemessen: "' + zeile.label + '".');
  assert.notEqual(zeile.label, LISTEN_FELD_ID,
    'das Label ist der rohe technische Selektor geblieben — der Rückfall aus `_planAusRoh` greift, ' +
    'obwohl das Unterfeld existiert.');
});

test('[B17·Negativkontrolle] ein flaches Sektorfeld bleibt unverändert korrekt aufgelöst', () => {
  /* Regressionsschutz: der Tausch darf den weit häufigeren Fall — eine gewöhnliche flache
     feldId — nicht anfassen. feldDefFuer fällt für Nicht-Listen-Selektoren auf genau dieselbe
     Suche zurück, die _feldDef vorher allein war. */
  const { V } = ladeKern();
  const plan = V._planAusRoh('b17-test', { label: 'Test' }, {
    felder: [{ sektorId: 'identity', feldId: 'givenName', wert: 'Maria' }],
  });
  assert.equal(plan.zeilen[0].label, 'Vorname');
});

test('[B17·Negativkontrolle] eine wirklich unbekannte feldId bleibt beim Selektor-Rückfall', () => {
  /* feldDefFuer liefert `undefined`, "wenn es die Kennung wirklich nirgends gibt — das bleibt ein
     Befund" (Kommentar an ihrer Definition). _planAusRoh muss diesen Fall weiter sauber auffangen,
     nicht werfen. */
  const { V } = ladeKern();
  const plan = V._planAusRoh('b17-test', { label: 'Test' }, {
    felder: [{ sektorId: 'advanceCare', feldId: 'liste:provisionInstruments:enduring-power-of-attorney:erfundenes_feld', wert: 'x' }],
  });
  assert.equal(plan.zeilen[0].label, 'liste:provisionInstruments:enduring-power-of-attorney:erfundenes_feld');
});
