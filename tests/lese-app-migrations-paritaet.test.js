'use strict';
/* ════════════════════════════════════════════════════════════════════════
   B8-PARITAET (HOCH, nachtlauf-2026-09-19.md): die Lese-App migriert eine alte
   Datei so, wie der Kern sie migriert — aus DERSELBEN Stufenliste geprüft.

   DIE KLASSE: Angehörige öffnen Dateien, die lange vor dem heutigen Datenmodell
   erzeugt wurden. Der Kern hebt sie in `depotNormalisieren()` Stufe um Stufe auf
   den heutigen Stand; die Lese-App hat dafür ihre eigenen Folds. Jede Kern-Stufe,
   die die Lese-App nicht spiegelt, lässt einen Wert unter einem Schlüssel liegen,
   den sie nicht kennt — im Kern sichtbar, bei der Angehörigen unsichtbar, ohne
   Fehler.

   DER WÄCHTER IST ABGELEITET, NICHT GEPFLEGT: jede Stufe aus
   tests/fixtures/migrations-stufen.js (die Kern-Probe jeder Migration) läuft hier
   durch BEIDE Anwendungen. Eine neue Kern-Stufe mit Fixture-Zeile ist damit ohne
   Zutun auch für die Lese-App geprüft — auch die Umbenennung der Personenfelder
   (Schema 88), sobald sie ihre Zeile hat. Zwei Aussagen je Stufe:
     (1) jeder nicht-sensible Text-Wert, den der Kern nach dem Normalisieren in
         einem definierten Feld zeigt, steht auch in der Lese-Sicht;
     (2) die Lese-App trägt keinen Wert unter einem Schlüssel, den sie nicht
         definiert, wenn der Kern denselben Schlüssel verschoben hat.

   GEMESSEN AM KANON b199d0d15 vor dem Fix: rot in Stufe 42 (`schutzbefohlene`),
   44 (`pflegedienst_kontakt`), 50 (`verwaltung.ks_*`), 65 (die Korb-1-Listen des
   Schnitt-Glieds 3 fehlten der Lese-App ganz — `_korb1MehrwertigMigrieren`) und 85
   (`vj_versicherungen`). Behoben mit `_foldStrukturStufenLesen`, `_foldStufe85Lesen` und
   dem bytegleichen Korb-1-Spiegel (vivodepot-lesen.html). Rot-Beweis per Mutation unten.

   GRENZE, benannt: (1) prüft Text-Felder (auswahl/datum/Referenzen rendert die
   Lese-App über Beschriftungen, ein Rohwert-Vergleich wäre dort falsch-rot); die
   Verschiebungen solcher Felder fängt (2). Reale Alt-Depots gibt es nicht
   (migrationsfreies Fenster, U2-ADR-100 §8) — geprüft wird gegen die gebauten Fälle
   der Stufenliste, wie in tests/migration-stufen.test.js.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { STUFEN } = require('./fixtures/migrations-stufen.js');
const { ladeKern } = require('./load-kern.js');

const REPO = path.join(__dirname, '..');
const LESEN = path.join(REPO, 'vivodepot-lesen.html');
/* Die drei Einhängezeilen des Fixes — der Rot-Beweis entfernt alle drei. */
const EINHAENGEZEILEN = Object.freeze([
  '_foldStrukturStufenLesen(obj);   // B8: Kern-Stufen 42, 44, 50 — s. dort',
  '  _foldStufe85Lesen(obj);\n',
  '  _korb1MehrwertigMigrieren(obj);\n',
  '  _foldDokumenttypenLesen(obj);\n',
]);
const TEXT = new Set(['text', 'textarea']);

function leseAus(pfad) {
  const vorher = process.env.LESEN_HTML_PATH;
  if (pfad) process.env.LESEN_HTML_PATH = pfad; else delete process.env.LESEN_HTML_PATH;
  delete require.cache[require.resolve('./load-lesen.js')];
  const x = require('./load-lesen.js').ladeLesen();
  if (vorher === undefined) delete process.env.LESEN_HTML_PATH; else process.env.LESEN_HTML_PATH = vorher;
  delete require.cache[require.resolve('./load-lesen.js')];
  return x.V;
}

const kopie = (o) => JSON.parse(JSON.stringify(o));
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
const gesetzt = (v) => !(v === undefined || v === null || v === '' || (Array.isArray(v) && !v.length));

function kernSichtbareTexte(K, d) {
  const raus = [];
  for (const b of K.bereicheAlle()) {
    const werte = d.sektoren && d.sektoren[b.id];
    if (!werte) continue;
    for (const s of b.sektionen || []) for (const f of s.felder || []) {
      if (f.sensibel) continue;
      const w = werte[f.id];
      if (TEXT.has(f.typ) && typeof w === 'string' && w.trim()) raus.push({ pfad: b.id + '.' + f.id, wert: w });
      if (f.typ === 'liste' && Array.isArray(w)) for (const e of w) for (const u of f.unterFelder || []) {
        if (u.sensibel || !TEXT.has(u.typ)) continue;
        const x = e && e[u.id];
        if (typeof x === 'string' && x.trim()) raus.push({ pfad: b.id + '.' + f.id + '/' + u.id, wert: x });
      }
    }
  }
  return raus;
}

/* Beide Aussagen für EINE Stufe; liefert die Abweichungen als lesbare Zeilen. */
function stufePruefen(K, L, st) {
  const roh = bauer(st)();
  const neu = K.depotNormalisieren(kopie(roh));
  L.setData(L._foldVollmachtenLesen(kopie(roh)));
  const ld = L.getData();
  const raus = [];
  const sicht = L.bereicheAlleLesen().map((b) => String(L.sektorHTML(b.id) || '')).join('\n');
  const soll = kernSichtbareTexte(K, neu);
  for (const s of soll) if (!sicht.includes(esc(s.wert)) && !sicht.includes(s.wert)) raus.push('(1) ' + s.pfad + ' fehlt in der Lese-Sicht');
  const bereiche = new Set(L.bereicheAlleLesen().map((b) => b.id));
  const bekannt = new Set();
  for (const b of L.bereicheAlleLesen()) for (const sek of (b.sektionen || [])) for (const f of (sek.felder || [])) bekannt.add(b.id + '.' + f.id);
  for (const [bid, werte] of Object.entries(ld.sektoren || {})) {
    if (!werte || typeof werte !== 'object') continue;
    for (const k of Object.keys(werte)) {
      if (!gesetzt(werte[k]) || (bereiche.has(bid) && bekannt.has(bid + '.' + k))) continue;
      const imKern = neu.sektoren && neu.sektoren[bid] && neu.sektoren[bid][k] !== undefined;
      if (!imKern) raus.push('(2) ' + bid + '.' + k + ' liegt in der Lese-App ohne Definition, der Kern hat es verschoben');
    }
  }
  // (3) Codes, die kein Sektor-Feld sind, aber Anzeige und Blatt-Zuordnung steuern: Dokumenttyp und
  //     Vorsorge-Instrument. Die Lese-App muss dieselben Codes tragen wie der Kern nach dem Normalisieren.
  const codes = (d) => ({
    dokumente: (Array.isArray(d.dokumente) ? d.dokumente : []).map((x) => x && x.typ).filter(Boolean).sort(),
    instrumente: Object.keys(d.sektoren || {}).flatMap((s) => {
      const l = d.sektoren[s] && d.sektoren[s].provisionInstruments;
      return Array.isArray(l) ? l.map((z) => z && z.instrument).filter(Boolean) : [];
    }).sort(),
  });
  const ck = codes(neu), cl = codes(ld);
  // (4) Das Personenregister (`data.menschen[]`, seit Schema 88 mit englischen Geburtsangaben) liegt außerhalb
  //     von `sektoren`. Jeder Text-Wert, den der Kern dort nach dem Normalisieren trägt, steht in der Lese-Sicht
  //     von „Meine Menschen" — geprüft an den Text-Feldern des Registers (Datum rendert formatiert, s. (1)).
  const peopleSicht = String(L.sektorHTML('people') || '');
  for (const m of (Array.isArray(neu.menschen) ? neu.menschen : [])) {
    if (!m || m.nichtMitgeben === true) continue;
    for (const k of ['birthPlace', 'yearOfBirthIfTheExactDayIs']) {
      const w = m[k];
      if (typeof w === 'string' && w.trim() && !peopleSicht.includes(esc(w)) && !peopleSicht.includes(w)) raus.push('(4) menschen[' + m.id + '].' + k + ' fehlt in der Lese-Sicht');
    }
  }
  if (JSON.stringify(ck.dokumente) !== JSON.stringify(cl.dokumente)) raus.push('(3) dokumente[].typ: Kern ' + ck.dokumente.join(',') + ' · Lese-App ' + cl.dokumente.join(','));
  if (JSON.stringify(ck.instrumente) !== JSON.stringify(cl.instrumente)) raus.push('(3) provisionInstruments[].instrument: Kern ' + ck.instrumente.join(',') + ' · Lese-App ' + cl.instrumente.join(','));
  return { abweichungen: raus, textWerte: soll.length };
}

/* Eine Alt-Datei trägt eine Stufe über `baue()` ODER `basis()` — beide Formen stehen in der Stufenliste
   (ab Stufe 64 heißt der Bauer `basis`). */
const bauer = (st) => (typeof st.baue === 'function' ? st.baue : (typeof st.basis === 'function' ? st.basis : null));
const MIT_FIXTURE = STUFEN.filter((st) => bauer(st));

/* DIE GRENZE DER ABLEITUNG, als Ratsche statt als Satz: eine Stufe mit `geprueftIn` statt `baue`
   hat keine Alt-Datei, die hier durch beide Anwendungen laufen könnte — für sie prüft dieser
   Wächter NICHTS. Gemessen am 23.09.2026: 32 von 65 Stufen; 20 davon trugen schon `basis()`, sechs
   datenverschiebende (40, 41, 48, 49, 63, 85) bekamen im B8-Commit eine gebaute Alt-Datei, 84 und 86
   (Dokumenttyp-Codes) im Folge-Commit — es bleiben 4, keine davon verschiebt Bürgerwerte. Die Liste kann nur schrumpfen:
   eine NEUE Stufe ohne `baue` ist rot (auch Schema 88 muss mit einer gebauten Alt-Datei kommen),
   und eine Stufe, die inzwischen `baue` trägt, muss hier gestrichen werden. */
const OHNE_ALTDATEI_GRUNDLINIE = Object.freeze([28, 46, 59, 87]);

test('[B8·Grundlinie] Stufen ohne gebaute Alt-Datei: nur die bekannten, und die Liste schrumpft nur', () => {
  const ohne = STUFEN.filter((st) => !bauer(st)).map((st) => st.nach);
  const neu = ohne.filter((n) => !OHNE_ALTDATEI_GRUNDLINIE.includes(n));
  assert.deepEqual(neu, [], 'Diese Stufen kamen ohne baue() dazu — die Lese-App-Parität ist für sie ungeprüft. '
    + 'Eine Alt-Datei in tests/fixtures/migrations-stufen.js bauen: ' + neu.join(', '));
  const erledigt = OHNE_ALTDATEI_GRUNDLINIE.filter((n) => !ohne.includes(n));
  assert.deepEqual(erledigt, [], 'Diese Stufen tragen jetzt baue() — aus OHNE_ALTDATEI_GRUNDLINIE streichen: ' + erledigt.join(', '));
});

test('[B8·Vakuum] die Stufenliste trägt gebaute Alt-Dateien, und (1) vergleicht wirklich Werte', () => {
  assert.ok(MIT_FIXTURE.length >= 62, 'nur ' + MIT_FIXTURE.length + ' Stufen mit Alt-Datei (gemessen 62 am 23.09.2026, mit Stufe 88)');
  const { V: K } = ladeKern();
  let werte = 0;
  for (const st of MIT_FIXTURE) werte += kernSichtbareTexte(K, K.depotNormalisieren(kopie(bauer(st)()))).length;
  assert.ok(werte >= 10, 'nur ' + werte + ' Text-Werte über alle Stufen — Aussage (1) wäre leer');
});

test('[B8] jede Kern-Stufe der Stufenliste kommt in der Lese-App an', () => {
  const { V: K } = ladeKern();
  const fehler = [];
  for (const st of MIT_FIXTURE) {
    const { abweichungen } = stufePruefen(K, leseAus(null), st);
    for (const a of abweichungen) fehler.push('Stufe ' + st.nach + ': ' + a);
  }
  assert.deepEqual(fehler, [], 'Die Lese-App spiegelt diese Kern-Migrationen nicht:\n' + fehler.join('\n'));
});

/* 48, 53 und 62 sind rot, obwohl sie selbst nichts Neues migrieren: ihre Alt-Dateien tragen Vorsorge-Zeilen
   mit dem alten Code `vorsorgevollmacht`, den erst der Spiegel von Stufe 86 übersetzt — Aussage (3). */
test('[B8·Rot-Beweis] ohne die B8-Aufrufe sind genau die Stufen 42, 44, 48, 50, 53, 62, 65, 84, 85 und 86 rot', () => {
  let quelle = fs.readFileSync(LESEN, 'utf8');
  for (const z of EINHAENGEZEILEN) {
    assert.equal(quelle.split(z).length, 2, 'die Einhängezeile steht genau einmal — sonst trifft die Mutation nichts: ' + z);
    quelle = quelle.replace(z, '/* MUTATION: B8-Aufruf entfernt */\n');
  }
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'b8-paritaet-'));
  const mutant = path.join(tmp, 'vivodepot-lesen.html');
  fs.writeFileSync(mutant, quelle);
  try {
    const { V: K } = ladeKern();
    const rot = [];
    for (const st of MIT_FIXTURE) if (stufePruefen(K, leseAus(mutant), st).abweichungen.length) rot.push(st.nach);
    assert.deepEqual(rot, [42, 44, 48, 50, 53, 62, 65, 84, 85, 86], 'die Probe misst, was der Fix leistet');
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

/* Der Korb-1-Spiegel ist bytegleich zum Kern — sonst wäre er eine Nachpflege-Stelle, die still veraltet. */
function korb1Block(datei) {
  const t = fs.readFileSync(path.join(REPO, datei), 'utf8');
  const s = t.indexOf('const _KORB1_GRUPPEN = Object.freeze([');
  const f = t.indexOf('function _korb1MehrwertigMigrieren(d) {');
  assert.ok(s >= 0 && f > s, datei + ': Korb-1-Deklarationen nicht gefunden');
  return t.slice(s, t.indexOf('\n}\n', f) + 3);
}

test('[B8·Drift] _KORB1_GRUPPEN und _korb1MehrwertigMigrieren sind in Kern und Lese-App Zeichen für Zeichen gleich', () => {
  assert.equal(korb1Block('vivodepot-lesen.html'), korb1Block('vivodepot.html'));
});

/* Die Dokumenttyp-Tabellen sind bytegleich zum Kern — dieselbe Begründung wie beim Korb-1-Spiegel. */
function tabellenBlock(datei, name) {
  const t = fs.readFileSync(path.join(REPO, datei), 'utf8');
  const s = t.indexOf('const ' + name + ' = Object.freeze(');
  assert.ok(s >= 0, datei + ': ' + name + ' nicht gefunden');
  const enden = ['\n});\n', '\n]);\n'].map((e) => t.indexOf(e, s)).filter((i) => i > 0);
  return t.slice(s, Math.min(...enden) + 4);
}

test('[B8·Drift] DOKUMENTTYP_ALT_ZU_NEU_84/_L4 und PERSONEN_SCHLUESSEL_ALT_ZU_NEU_88 sind in Kern und Lese-App Zeichen für Zeichen gleich', () => {
  for (const name of ['DOKUMENTTYP_ALT_ZU_NEU_84', 'DOKUMENTTYP_ALT_ZU_NEU_L4', 'PERSONEN_SCHLUESSEL_ALT_ZU_NEU_88']) {
    assert.equal(tabellenBlock('vivodepot-lesen.html', name), tabellenBlock('vivodepot.html', name), name);
  }
});

/* Stufe 52, Gate-Regel: nur 'ja' (oder Details) trägt eine Instrument-Zeile. Rot-Beweis per Mutation der
   einen Zeile in `_foldVorsorgeWeitereInstrumenteLesen`, die 'ja' verlangt — zurück auf „jeder Wert". */
test('[B8·Rot-Beweis·52] ein verneintes Gate ohne die Ja-Regel zeigt eine Verfügung, die es nicht gibt', () => {
  const quelle = fs.readFileSync(LESEN, 'utf8');
  const ZEILE = "    const gateJa = gateRoh === 'ja';\n";
  assert.equal(quelle.split(ZEILE).length, 2, 'die Ja-Regel steht genau einmal — sonst trifft die Mutation nichts');
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'b8-gate-'));
  const mutant = path.join(tmp, 'vivodepot-lesen.html');
  fs.writeFileSync(mutant, quelle.replace(ZEILE, "    const gateJa = gateRoh != null && gateRoh !== '';   /* MUTATION */\n"));
  try {
    const st = MIT_FIXTURE.find((s) => s.nach === 52 && /patientenverf_vorhanden/.test(s.was));
    assert.ok(st, 'Vorbedingung: die Stufe-52-Probe mit verneintem Gate');
    const L = leseAus(mutant);
    const roh = bauer(st)();
    roh.sektoren.vorsorge.patientenverf_vorhanden = 'nein';
    delete roh.sektoren.vorsorge.patientenverf_ort; delete roh.sektoren.vorsorge.organspende;
    L.setData(L._foldVollmachtenLesen(kopie(roh)));
    const zeilen = (L.getData().sektoren.advanceCare || {}).provisionInstruments || [];
    assert.ok(zeilen.some((z) => z && z.instrument === 'living-will'), 'die Mutation erzeugt die falsche Zeile — die Probe misst die Regel');
    const LOk = leseAus(null);
    LOk.setData(LOk._foldVollmachtenLesen(kopie(roh)));
    const ok = (LOk.getData().sektoren.advanceCare || {}).provisionInstruments || [];
    assert.ok(!ok.some((z) => z && z.instrument === 'living-will'), 'mit der Ja-Regel: keine Patientenverfügungs-Zeile für „nein"');
    assert.equal(LOk.getData().sektoren.advanceCare.patientenverf_vorhanden_frueher, 'nein', 'das „nein" bleibt im Rettungsfeld, wie im Kern');
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});
