'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Die Bedingung reist mit (MyTerms v1-Schnitt, Teil C, 16.09.2026)
   ────────────────────────────────────────────────────────────────────────
   PDF: neben der Datenfassung ein zweiter Anhang `bedingung.json` (AFRelationship Supplement), die
   Datenfassung bleibt das erste EmbeddedFile. Begleitdatei: dieselben Daten. In beiden steht dieselbe
   Prüfsumme wie im Protokoll-Eintrag — das ist der Beleg, dass beide Seiten dasselbe meinen.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { ladeKern } = require('./load-kern.js');
const { datenfassungAusPdfLesenAlsJson } = require('../tools/pdf-anhang-datenfassung-lesen.js');

// Ein doc, das jsPDFs Ereignis-Schnittstelle nachbildet und die Ausgabe als Text sammelt.
function attrappenDoc() {
  const abos = {};
  let naechsteId = 10;
  const zeilen = [];
  return {
    zeilen,
    internal: {
      events: { subscribe: (name, fn) => { (abos[name] = abos[name] || []).push(fn); } },
      newObject: () => { const id = naechsteId++; zeilen.push(id + ' 0 obj'); return id; },
      out: (z) => zeilen.push(z),
    },
    ausloesen: (name) => (abos[name] || []).forEach((fn) => fn()),
  };
}

async function angenommenerEintrag(V) {
  await V.depotAnlegen('reist-mit-probe-lang-genug-2026');
  V._bedingungskatalogModuleAusDepotAnmelden({ bedingungskatalogModule: [] });
  const f = await V.bedingungFestlegen('SD-BASE', 'PDC-AI');
  const e = V.uebergabeProtokollEintragen({ empfaenger: 'Praxis am Markt', zweck: 'Behandlung', umfang: 'Medikation',
    vereinbarung: { angebot: { bevorzugt: f.bevorzugt, ausweich: f.ausweich }, status: 'angeboten' } });
  const r = await V.vereinbarungAntwortAnwenden({ antwort: { art: 'vivodepot-vereinbarung-antwort', version: 1, agreementId: e.kennung,
    entscheidung: 'angenommen', angenommen: 'ausweich', pruefsumme: f.ausweich.pruefsumme, stelle: 'Praxis am Markt' } });
  assert.equal(r.ergebnis, 'angenommen');
  V.vereinbarungPersonGibtFrei(e.kennung);
  return e;
}

test('[Begleitdaten] dieselbe Prüfsumme wie im Protokoll, kein Depot-Feld', async () => {
  const { V } = ladeKern();
  const e = await angenommenerEintrag(V);
  const d = V.vereinbarungBegleitdaten(e);
  assert.equal(d.agreementId, e.kennung);
  assert.equal(d.bedingung.pruefsumme, e.vereinbarung.angebot.ausweich.pruefsumme);
  assert.equal(d.annahme.geprueft, false);
  assert.equal(JSON.stringify(d).includes('Medikation'), false);
  assert.equal(JSON.stringify(d).includes('jws'), false);
});

test('[PDF] zwei Anhänge: Datenfassung zuerst, bedingung.json als Supplement, Namensbaum sortiert', async () => {
  const { V } = ladeKern();
  const e = await angenommenerEintrag(V);
  const doc = attrappenDoc();
  V.pdfDatenfassungEinbetten(doc, { felder: [{ kennung: 'x', wert: 'y' }] }, 'Vivodepot_Auszug.json');
  V._pdfAnhangEinbetten(doc, JSON.stringify(V.vereinbarungBegleitdaten(e)), 'bedingung.json', 'Supplement');
  doc.ausloesen('putAdditionalObjects');
  doc.ausloesen('putCatalog');
  const text = doc.zeilen.join('\n');
  assert.equal((text.match(/\/Type \/EmbeddedFile/g) || []).length, 2);
  assert.ok(text.indexOf('/AFRelationship /Data') < text.indexOf('/AFRelationship /Supplement'));
  assert.deepEqual(datenfassungAusPdfLesenAlsJson(Buffer.from(text, 'latin1')), { felder: [{ kennung: 'x', wert: 'y' }] },
    'der bestehende Leser findet weiterhin die Datenfassung zuerst');
  const namen = text.match(/\/Names \[ (.*) \]/)[1];
  assert.ok(namen.indexOf('(Vivodepot_Auszug.json)') < namen.indexOf('(bedingung.json)'), 'Namensbaum bytegeordnet');
  assert.ok(text.includes('"pruefsumme": "' + e.vereinbarung.angebot.ausweich.pruefsumme + '"') || text.includes(e.vereinbarung.angebot.ausweich.pruefsumme));
});

test('[PDF·Rot-Beweis] ohne freigegebene Vereinbarung kein Bedingungs-Anhang', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen('reist-mit-ohne-lang-genug-2026');
  await V.vereinbarungFreigabeHolen('probe');   // ohne Festlegung: räumt den Lauf und gibt null
  assert.equal(V.vereinbarungPdfAnhang(attrappenDoc()), false);
});

test('[Weitergabe-PDF] jeder gesperrte Weg, der eine Datenfassung einbettet, bettet auch die Bedingung ein — sonst keiner', () => {
  const KERN = fs.readFileSync(path.join(__dirname, '..', 'vivodepot.html'), 'utf8');
  const { AUSGABEWEGE_EINORDNUNG } = require('../tools/lib/ausgabewege-einordnung.js');
  const koerper = (name) => { const m = KERN.match(new RegExp('\\n(?:async\\s+)?function\\s+' + name + '\\s*\\(')); return m ? KERN.slice(m.index, KERN.indexOf('\n}\n', m.index + 1)) : ''; };
  for (const [name, z] of Object.entries(AUSGABEWEGE_EINORDNUNG)) {
    const k = koerper(name);
    if (!/pdfDatenfassungEinbetten\(/.test(k)) continue;
    assert.equal(/vereinbarungPdfAnhang\(/.test(k), z.klasse === 'weitergabe', name + ' (' + z.klasse + ')');
  }
});
