'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   antwort-auf-template.test.js — U2-ADR-366 Teil 1: die Ausgabe wird zur
   Antwort auf ein benanntes Template (07.09.2026)
   ────────────────────────────────────────────────────────────────────────────
   VIER Zustände je Schlüssel, nicht zwei und nicht drei: Wert vorhanden ·
   Feld existiert, ist leer · Feld kenne ich nicht · zurückgehalten. Die
   Produktentscheidung hat den vierten selbst nachgetragen: „ein Pflegeheim darf nach
   Phobien fragen; sie darf antworten 'das sage ich nicht', ohne dass ihre
   Antwort dadurch maschinell unlesbar wird." Zurückgehalten ist STRUKTURELL
   vollständig (der Schlüssel MUSS vorkommen) — nur sein Zustand bleibt offen.

   DER WÄCHTER prüft NUR die Struktur, in BEIDEN Richtungen: ein fehlender
   Schlüssel ist ein Fund, ein zusätzlicher (unangefragter) Schlüssel ist ein
   Fund — Letzterer ist der gefährlichere, weil er unangefordert Daten
   preisgäbe.

   AUSBEUTE ZUERST, ROT-BEWEIS in BEIDE Richtungen, GEGENPROBE — dieselbe
   Bauform wie überall in diesem Register.
   ════════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

// Dieselben drei echten Feld-Referenzen wie tests/fixtures/erbschein-vorbereitung-logikmodul.json
// (kein erfundenes Schema) — plus EIN absichtlich unbekanntes Feld für den "kenne ich nicht"-Fall.
function testTemplate() {
  return {
    modulTyp: 'logikModul',
    id: 'test-anamnese-vorlage',
    titel: 'Test-Anamnesebogen',
    sektor: 'identity',
    moduleVersion: 3,
    herkunft: 'radiologie-praxis-test',
    datenSchema: {
      staatsangehoerigkeit: { typ: 'feld', sektor: 'identity', feld: 'nationality' },
      familienstand: { typ: 'feld', sektor: 'identity', feld: 'maritalStatus' },
      lebensmittelpunkt: {
        typ: 'verbinden',
        teile: [{ sektor: 'identity', feld: 'streetAddress' }, { sektor: 'identity', feld: 'postcodeCity' }],
        trenner: ', ',
      },
      herzschrittmacher: { typ: 'feld', sektor: 'identity', feld: 'gibt_es_nicht_erfundenes_feld' },
    },
  };
}

test('[Antwort·Vier-Zustände] Wert · leer · unbekannt · zurückgehalten — alle vier korrekt unterschieden', () => {
  const { V } = ladeKern();
  const tpl = testTemplate();
  const data = { sektoren: { identity: { nationality: 'deutsch' /* familienstand fehlt: leer */ } } };
  // freigegeben: staatsangehoerigkeit, familienstand, herzschrittmacher — NICHT lebensmittelpunkt
  // (der wird zurückgehalten, obwohl die Felder existieren UND einen Wert hätten, s. u.).
  data.sektoren.identity.streetAddress = 'Musterstraße 1';
  data.sektoren.identity.postcodeCity = '80331 München';
  const freigabe = new Set(['staatsangehoerigkeit', 'familienstand', 'herzschrittmacher']);

  const antwort = V.antwortAufTemplateErzeugen(tpl, data, freigabe);

  assert.equal(antwort.antworten.staatsangehoerigkeit.zustand, 'wert');
  assert.equal(antwort.antworten.staatsangehoerigkeit.wert, 'deutsch');

  assert.equal(antwort.antworten.familienstand.zustand, 'leer',
    'das Feld existiert (feldDefFuer), aber die Bürgerin hat es nicht gesetzt');

  assert.equal(antwort.antworten.herzschrittmacher.zustand, 'unbekannt',
    'Vivodepot kennt "gibt_es_nicht_erfundenes_feld" gar nicht — nicht "leer", sondern "unbekannt"');

  assert.equal(antwort.antworten.lebensmittelpunkt.zustand, 'zurueckgehalten',
    'nicht in der Freigabe — bleibt zurückgehalten, OBWOHL beide Teilfelder echte Werte tragen');
  assert.equal(antwort.antworten.lebensmittelpunkt.wert, undefined,
    'ein zurückgehaltener Schlüssel darf keinen Wert transportieren');
});

test('[Antwort·Kein stiller Standard] ohne Freigabe-Parameter ist JEDER Schlüssel zurückgehalten', () => {
  const { V } = ladeKern();
  const tpl = testTemplate();
  const data = { sektoren: { identity: { nationality: 'deutsch', maritalStatus: 'ledig' } } };
  const antwort = V.antwortAufTemplateErzeugen(tpl, data, undefined);
  for (const k of Object.keys(tpl.datenSchema)) {
    assert.equal(antwort.antworten[k].zustand, 'zurueckgehalten', k + ' muss ohne Freigabe zurückgehalten sein');
  }
});

test('[Antwort·Kopf] templateId, templateVersion, herkunft, anfrageId(optional) korrekt gesetzt', () => {
  const { V } = ladeKern();
  const tpl = testTemplate();
  const data = { sektoren: { identity: {} } };

  const ohneAnfrage = V.antwortAufTemplateErzeugen(tpl, data, []);
  assert.equal(ohneAnfrage.templateId, 'test-anamnese-vorlage');
  assert.equal(ohneAnfrage.templateVersion, 3);
  assert.equal(ohneAnfrage.herkunft, 'radiologie-praxis-test');
  assert.equal(ohneAnfrage.anfrageId, null, 'keine Anfrage angegeben → die Bürgerin handelte von sich aus');

  const mitAnfrage = V.antwortAufTemplateErzeugen(tpl, data, [], { anfrageId: 'vorgang-123' });
  assert.equal(mitAnfrage.anfrageId, 'vorgang-123');
});

test('[Wächter·Gegenprobe] eine vollständige Antwort (auch mit zurückgehaltenen Schlüsseln) passt', () => {
  const { V } = ladeKern();
  const tpl = testTemplate();
  const data = { sektoren: { identity: { nationality: 'deutsch' } } };
  const antwort = V.antwortAufTemplateErzeugen(tpl, data, ['staatsangehoerigkeit']); // Rest zurueckgehalten
  const pruef = V.antwortPasstZuTemplate(antwort, tpl);
  assert.equal(pruef.passt, true, 'zurückgehaltene Schlüssel sind STRUKTURELL vollständig');
  assert.deepEqual(pruef.fehlend, []);
  assert.deepEqual(pruef.zusaetzlich, []);
});

test('[Wächter·Rot-Beweis 1/2] ein FEHLENDER Schlüssel wird erkannt', () => {
  const { V } = ladeKern();
  const tpl = testTemplate();
  const data = { sektoren: { identity: { nationality: 'deutsch' } } };
  const antwort = V.antwortAufTemplateErzeugen(tpl, data, ['staatsangehoerigkeit']);
  delete antwort.antworten.familienstand; // Verfälschung: ein angefragter Schlüssel fehlt

  const pruef = V.antwortPasstZuTemplate(antwort, tpl);
  assert.equal(pruef.passt, false);
  assert.deepEqual(pruef.fehlend, ['familienstand']);
  assert.deepEqual(pruef.zusaetzlich, []);
});

test('[Wächter·Rot-Beweis 2/2] ein ZUSÄTZLICHER (unangefragter) Schlüssel wird erkannt — die gefährlichere Richtung', () => {
  const { V } = ladeKern();
  const tpl = testTemplate();
  const data = { sektoren: { identity: { nationality: 'deutsch' } } };
  const antwort = V.antwortAufTemplateErzeugen(tpl, data, ['staatsangehoerigkeit']);
  // Verfälschung: ein Schlüssel, den das Template nie genannt hat — genau der Fall, der
  // unangefordert Daten preisgeben würde.
  antwort.antworten.blutgruppe = { zustand: 'wert', wert: 'A+' };

  const pruef = V.antwortPasstZuTemplate(antwort, tpl);
  assert.equal(pruef.passt, false);
  assert.deepEqual(pruef.fehlend, []);
  assert.deepEqual(pruef.zusaetzlich, ['blutgruppe']);
});

test('[Anker verfehlt] antwortAufTemplateErzeugen ohne datenSchema wirft, statt still ein leeres Ergebnis zu liefern', () => {
  const { V } = ladeKern();
  assert.throws(() => V.antwortAufTemplateErzeugen({ id: 'x' }, {}, []), /datenSchema/);
});
