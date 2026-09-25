'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Schema 82 — Vereinbarung am Übergabe-Eintrag (MyTerms, v1-Schnitt, 16.09.2026)
   ────────────────────────────────────────────────────────────────────────
   Ein Übergabe-Eintrag (U2-ADR-120) kann eine Vereinbarung tragen: bevorzugte und Ausweichbedingung,
   den Stand (angeboten, angenommen, abgelehnt, ohne Vereinbarung) und die Annahme der Stelle. Die Bedingung hat KEINEN Wortlaut — nur Kennung aus dem Katalog, Quelle und
   Prüfsumme (Entscheidung 16.09.: kein selbst geschriebener Text, kein Normtext ohne Erlaubnis).
   Geprüft wird: die Form, die Stufe 81→82 an Alt-Depots, und dass eine halbe Bedingung nicht entsteht.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

const QUELLE = 'https://myterms.info/agreements/';

test('[Bedingung] eine vollständige Bedingung wird angenommen und bereinigt', async () => {
  const { V } = ladeKern();
  const pruefsumme = await V.uebergabeBedingungPruefsumme('SD-BASE', QUELLE);
  assert.match(pruefsumme, /^[0-9a-f]{64}$/);
  assert.deepEqual(V.uebergabeBedingungNormalisieren({ kennung: ' SD-BASE ', quelle: QUELLE, pruefsumme: pruefsumme.toUpperCase(), fremd: 'x' }),
    { kennung: 'SD-BASE', quelle: QUELLE, pruefsumme });
});

test('[Bedingung·Rot-Beweis] ohne Kennung, ohne https-Quelle oder ohne Prüfsumme ist es keine Bedingung', async () => {
  const { V } = ladeKern();
  const ps = await V.uebergabeBedingungPruefsumme('SD-BASE', QUELLE);
  assert.equal(V.uebergabeBedingungNormalisieren({ quelle: QUELLE, pruefsumme: ps }), null);
  assert.equal(V.uebergabeBedingungNormalisieren({ kennung: 'SD-BASE', quelle: 'http://myterms.info/', pruefsumme: ps }), null);
  assert.equal(V.uebergabeBedingungNormalisieren({ kennung: 'SD-BASE', quelle: QUELLE, pruefsumme: 'abc' }), null);
  assert.equal(V.uebergabeBedingungNormalisieren({ kennung: 'mit Leerzeichen', quelle: QUELLE, pruefsumme: ps }), null);
  assert.equal(V.uebergabeBedingungNormalisieren('SD-BASE'), null);
});

test('[Bedingung] dieselbe Kennung und Quelle ergeben dieselbe Prüfsumme — eine andere Quelle eine andere', async () => {
  const { V } = ladeKern();
  assert.equal(await V.uebergabeBedingungPruefsumme('SD-BASE', QUELLE), await V.uebergabeBedingungPruefsumme('SD-BASE', QUELLE));
  assert.notEqual(await V.uebergabeBedingungPruefsumme('SD-BASE', QUELLE), await V.uebergabeBedingungPruefsumme('SD-BASE', 'https://example.org/'));
  assert.notEqual(await V.uebergabeBedingungPruefsumme('SD-BASE', QUELLE), await V.uebergabeBedingungPruefsumme('PDC-AI', QUELLE));
});

async function angebot(V) {
  return {
    bevorzugt: { kennung: 'SD-BASE', quelle: QUELLE, pruefsumme: await V.uebergabeBedingungPruefsumme('SD-BASE', QUELLE) },
    ausweich: { kennung: 'PDC-AI', quelle: QUELLE, pruefsumme: await V.uebergabeBedingungPruefsumme('PDC-AI', QUELLE) },
  };
}
const annahmeFuer = (b) => ({ stelle: 'Praxis am Markt', zeitpunkt: '2026-09-16T10:00:00Z', pruefsumme: b.pruefsumme, geprueft: true });

test('[Vereinbarung] alle vier Stände haben eine Form; angenommen nennt, welche der beiden', async () => {
  const { V } = ladeKern();
  assert.deepEqual([...V.UEBERGABE_VEREINBARUNG_STAENDE], ['angeboten', 'angenommen', 'abgelehnt', 'ohne-vereinbarung']);
  const a = await angebot(V);
  for (const status of ['angeboten', 'abgelehnt', 'ohne-vereinbarung']) {
    const v = V.uebergabeVereinbarungNormalisieren({ angebot: a, status });
    assert.equal(v.status, status); assert.equal(v.annahme, null); assert.equal(v.angenommen, null);
  }
  const nurBevorzugt = V.uebergabeVereinbarungNormalisieren({ angebot: { bevorzugt: a.bevorzugt }, status: 'angeboten' });
  assert.equal(nurBevorzugt.angebot.ausweich, null, 'Ausweichbedingung ist optional');
  const aus = V.uebergabeVereinbarungNormalisieren({ angebot: a, status: 'angenommen', angenommen: 'ausweich', annahme: annahmeFuer(a.ausweich) });
  assert.equal(aus.angenommen, 'ausweich'); assert.equal(aus.annahme.pruefsumme, a.ausweich.pruefsumme);
});

test('[Vereinbarung·Rot-Beweis] eine Annahme mit fremder Prüfsumme, ohne Annahme oder mit Annahme bei Ablehnung wird abgewiesen', async () => {
  const { V } = ladeKern();
  const a = await angebot(V);
  // angenommen „bevorzugt", aber gegengezeichnet wurde die Ausweichbedingung
  assert.equal(V.uebergabeVereinbarungNormalisieren({ angebot: a, status: 'angenommen', angenommen: 'bevorzugt', annahme: annahmeFuer(a.ausweich) }), null);
  assert.equal(V.uebergabeVereinbarungNormalisieren({ angebot: a, status: 'angenommen', angenommen: 'bevorzugt', annahme: { ...annahmeFuer(a.bevorzugt), pruefsumme: 'f'.repeat(64) } }), null);
  assert.equal(V.uebergabeVereinbarungNormalisieren({ angebot: a, status: 'angenommen', angenommen: 'bevorzugt' }), null);
  assert.equal(V.uebergabeVereinbarungNormalisieren({ angebot: a, status: 'angenommen', annahme: annahmeFuer(a.bevorzugt) }), null);
  assert.equal(V.uebergabeVereinbarungNormalisieren({ angebot: a, status: 'abgelehnt', annahme: annahmeFuer(a.bevorzugt) }), null);
  assert.equal(V.uebergabeVereinbarungNormalisieren({ angebot: { bevorzugt: a.bevorzugt, ausweich: a.bevorzugt }, status: 'angeboten' }), null, 'Ausweich = bevorzugt');
  assert.equal(V.uebergabeVereinbarungNormalisieren({ angebot: { ausweich: a.ausweich }, status: 'angeboten' }), null, 'ohne bevorzugte Bedingung');
  assert.equal(V.uebergabeVereinbarungNormalisieren({ angebot: a, status: 'offen' }), null);
});

test('[Vereinbarung·Rot-Beweis] eine ungeprüfte Annahme gibt nie von selbst frei — nur das Ja der Person', async () => {
  const { V } = ladeKern();
  const a = await angebot(V);
  const ungeprueft = { ...annahmeFuer(a.bevorzugt), geprueft: false };
  assert.equal(V.uebergabeVereinbarungNormalisieren({ angebot: a, status: 'angenommen', angenommen: 'bevorzugt', annahme: ungeprueft, freigabe: 'annahme' }), null);
  assert.equal(V.uebergabeVereinbarungNormalisieren({ angebot: a, status: 'angenommen', angenommen: 'bevorzugt', annahme: ungeprueft, freigabe: 'person' }).freigabe, 'person');
  assert.equal(V.uebergabeVereinbarungNormalisieren({ angebot: a, status: 'angenommen', angenommen: 'bevorzugt', annahme: annahmeFuer(a.bevorzugt), freigabe: 'person' }), null, 'geprüft braucht kein Ja');
  assert.equal(V.uebergabeVereinbarungNormalisieren({ angebot: a, status: 'abgelehnt', freigabe: 'person' }), null, 'abgelehnt gibt nichts frei');
  assert.equal(V.uebergabeVereinbarungNormalisieren({ angebot: a, status: 'ohne-vereinbarung' }).freigabe, 'person');
});

test('[Vereinbarung] ein Übergabe-Eintrag trägt sie bereinigt; eine widersprüchliche wirft, statt still zu fehlen', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen('bedingung-probe-lang-genug-2026');
  const a = await angebot(V);
  const e = V.uebergabeProtokollEintragen({ empfaenger: 'Praxis', zweck: 'Behandlung', umfang: 'Medikation', vereinbarung: { angebot: a, status: 'abgelehnt' } });
  assert.equal(e.vereinbarung.status, 'abgelehnt', 'eine Ablehnung steht im Protokoll');
  assert.deepEqual(e.vereinbarung.angebot.bevorzugt, a.bevorzugt);
  const ohne = V.uebergabeProtokollEintragen({ empfaenger: 'Praxis', zweck: 'Behandlung', umfang: 'Medikation' });
  assert.equal('vereinbarung' in ohne, false, 'ohne Vereinbarung kein leeres Feld');
  assert.throws(() => V.uebergabeProtokollEintragen({ empfaenger: 'Praxis', zweck: 'Behandlung', umfang: 'Medikation', vereinbarung: { angebot: a, status: 'angenommen', angenommen: 'bevorzugt', annahme: annahmeFuer(a.ausweich) } }),
    /Vereinbarung ist unvollständig oder widersprüchlich/);
});

test('[Annahme] Form: Stelle, Zeitpunkt, Prüfsumme sind Pflicht; geprueft ist nur true, wenn ausdrücklich so gesetzt', () => {
  const { V } = ladeKern();
  const ps = 'a'.repeat(64);
  assert.deepEqual(V.uebergabeAnnahmeNormalisieren({ stelle: 'Praxis am Markt', zeitpunkt: '2026-09-16T10:00:00Z', pruefsumme: ps, geprueft: 'ja' }),
    { stelle: 'Praxis am Markt', zeitpunkt: '2026-09-16T10:00:00Z', pruefsumme: ps, geprueft: false });
  assert.equal(V.uebergabeAnnahmeNormalisieren({ stelle: '', zeitpunkt: '2026-09-16T10:00:00Z', pruefsumme: ps }), null);
  assert.equal(V.uebergabeAnnahmeNormalisieren({ stelle: 'X', zeitpunkt: 'kein Datum', pruefsumme: ps }), null);
});

test('[Stufe 82] ein Alt-Depot behält seine Einträge unverändert; eine kaputte Vereinbarung wird entfernt, eine gültige bleibt', async () => {
  const { V } = ladeKern();
  const a = await angebot(V);
  const eintragOhne = { kennung: 'k1', empfaenger: 'A', zweck: 'B', umfang: 'C', zeitpunkt: '2026-01-01T00:00:00Z', herkunft: 'manuell' };
  const eintragKaputt = { ...eintragOhne, kennung: 'k2', vereinbarung: { angebot: a, status: 'angenommen' } };
  const eintragGut = { ...eintragOhne, kennung: 'k3', vereinbarung: { angebot: a, status: 'ohne-vereinbarung' } };
  const d = V.depotNormalisieren({ schemaVersion: 81, menschen: [], sektoren: {}, uebergabeProtokoll: [eintragOhne, eintragKaputt, eintragGut] });
  assert.equal(d.schemaVersion >= 82, true);
  assert.deepEqual(JSON.parse(JSON.stringify(d.uebergabeProtokoll[0])), eintragOhne, 'Bestandseintrag verändert');
  assert.equal('vereinbarung' in d.uebergabeProtokoll[1], false);
  assert.equal(d.uebergabeProtokoll[2].vereinbarung.status, 'ohne-vereinbarung');
});
