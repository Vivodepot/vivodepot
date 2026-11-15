'use strict';
/* Probe: das Einlesen erkennt die Verwaltungs-Stammdaten (`xoev-verwaltung`) und das FIM-JSON (`fim-json`) selbst.
   Vorher gingen beide nur mit Zielwahl: kein Erkenner beanspruchte sie (gemessen auf 33632bee7).
   Regel wie bei `elster` und `xmeld`: ein Erkenner beansprucht nur, was sein Parser lesen kann. Er prüft das geparste
   Objekt, nie den Volltext.
   Merkmale: Verwaltung = `nachrichtentyp` vivodepot.verwaltung.NNNN und ein Objekt `datensatz`. FIM = ein Objekt
   `stammdaten` und dazu `bezugsdatensatz: fim-baukasten` (ab v838) oder `fimSchema: fim-stammdaten-0001` (Fassung davor,
   liegt bei Menschen und muss weiter gelesen werden).
   Gemessen am geladenen Kern, kein Quelltext-Grep. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { ladeKern } = require('./load-kern.js');

const KONTEXTE = [undefined, 'administration', 'identity', 'health'];

async function frisch(gefuellt) {
  const k = ladeKern();
  await k.V.depotAnlegen('pw');
  k.V.akteurSelbstErklaeren('Tester');
  if (gefuellt) {
    k.V.sektorFeldSetzen('administration', 'bundidVerificationLevel', 'hoch');
    k.V.sektorFeldSetzen('administration', 'mainEmailAddress', 'maria@example.de');
  }
  return k;
}
const text = (o) => JSON.stringify(o, null, 2);
const erkenner = (V, id) => V.IMPORT_FORMAT_BY_ID[id].erkennen;

for (const [id, name] of [['xoev-verwaltung', 'xoev'], ['fim-json', 'fim']]) {
  test(`[ERKENNUNG·${name}] der eigene Export wird in jedem Kontext erkannt, gefüllt und leer`, async () => {
    for (const gefuellt of [true, false]) {
      const { V } = await frisch(gefuellt);
      const t = text(V.kernAPI.exportiere(id, { sensibel: true }));
      for (const s of KONTEXTE) assert.equal(V.importFormatErkennen(t, s), id, `${gefuellt ? 'gefüllt' : 'leer'}, Kontext ${s}`);
    }
  });
}

test('[ERKENNUNG·fim-alt] die FIM-Datei von vor v838 (fimSchema, ohne bezugsdatensatz) wird erkannt und gelesen', async () => {
  const { V } = await frisch(true);
  const neu = V.kernAPI.exportiere('fim-json', { sensibel: true });
  const alt = {
    fimSchema: 'fim-stammdaten-0001', standard: neu.standard, erstelltAm: neu.erstelltAm,
    _hinweis: 'Verwaltungs-Stammdaten im FIM-orientierten JSON.', stammdaten: neu.stammdaten,
  };
  const t = text(alt);
  for (const s of KONTEXTE) assert.equal(V.importFormatErkennen(t, s), 'fim-json', `Kontext ${s}`);
  const felder = JSON.parse(JSON.stringify(V.IMPORT_FORMAT_BY_ID['fim-json'].parse(t).felder));
  assert.ok(felder.some((f) => f.feldId === 'bundidVerificationLevel' && f.wert === 'hoch'), JSON.stringify(felder));
});

test('[ERKENNUNG·Kreislauf] Werte gehen über Export, Erkennung und Lesen unverändert zurück', async () => {
  for (const id of ['xoev-verwaltung', 'fim-json']) {
    const { V } = await frisch(true);
    const t = text(V.kernAPI.exportiere(id, { sensibel: true }));
    const erkannt = V.importFormatErkennen(t);
    assert.equal(erkannt, id);
    const felder = JSON.parse(JSON.stringify(V.IMPORT_FORMAT_BY_ID[erkannt].parse(t).felder));
    const wert = (f) => (felder.find((z) => z.feldId === f) || {}).wert;
    assert.equal(wert('bundidVerificationLevel'), 'hoch', id);
    assert.equal(wert('mainEmailAddress'), 'maria@example.de', id);
  }
});

test('[ERKENNUNG·fremd] Rot-Beweis: kein anderer Export, keine Sicherung, kein Fixture und keine Fast-Form wird beansprucht', async () => {
  const { V } = await frisch(true);
  const eigene = ['xoev-verwaltung', 'fim-json'].map((id) => [id, erkenner(V, id)]);
  for (const [, e] of eigene) assert.equal(typeof e, 'function', 'beide tragen einen Erkenner');
  const fremde = [];
  for (const f of V.EXPORT_FORMATE) {
    if (f.id === 'xoev-verwaltung' || f.id === 'fim-json') continue;
    let r;
    try { r = await f.baue({ sensibel: true }); } catch (e) { continue; }
    fremde.push([f.id, typeof r === 'string' ? r : JSON.stringify(r)]);
  }
  fremde.push(['vollExportJSON', JSON.stringify(V.vollExportJSON({ sensibel: true }))]);
  const FX = path.join(__dirname, 'fixtures');
  for (const n of fs.readdirSync(FX).filter((n) => /\.(json|jsonld|xml|vcf|ics)$/.test(n))) {
    fremde.push(['fixture ' + n, fs.readFileSync(path.join(FX, n), 'utf8')]);
  }
  // Fast-Formen: das Merkmal fehlt zur Hälfte.
  fremde.push(['datensatz mit fremdem nachrichtentyp', text({ nachrichtentyp: 'andere.verwaltung.0001', datensatz: {} })]);
  fremde.push(['nachrichtentyp ohne datensatz', text({ nachrichtentyp: 'vivodepot.verwaltung.0001' })]);
  fremde.push(['datensatz als Text', text({ nachrichtentyp: 'vivodepot.verwaltung.0001', datensatz: 'x' })]);
  fremde.push(['stammdaten ohne FIM-Merkmal', text({ standard: 'FIM', stammdaten: {} })]);
  fremde.push(['FIM-Merkmal ohne stammdaten', text({ bezugsdatensatz: 'fim-baukasten', felder: [] })]);
  fremde.push(['Wort im Text, kein Objekt', '"vivodepot.verwaltung.0001 fim-baukasten stammdaten datensatz"']);
  assert.ok(fremde.length > 20, 'die Gegenprobe hat Material');
  // Bestandsfixtures, die genau diese beiden Exporte enthalten, sind eigene Dateien und zählen nicht als fremd.
  const beansprucht = [];
  for (const [n, t] of fremde) {
    for (const [id, e] of eigene) {
      let ja = false;
      try { ja = e(t); } catch (x) { ja = false; }
      if (ja && !(n.startsWith('fixture ') && istEigenerExport(t))) beansprucht.push(`${id} ← ${n}`);
    }
  }
  assert.deepEqual(beansprucht, []);
});

function istEigenerExport(t) {
  try {
    const o = JSON.parse(t);
    return !!o && (o.nachrichtentyp === 'vivodepot.verwaltung.0001' || o.bezugsdatensatz === 'fim-baukasten');
  } catch (e) { return false; }
}
