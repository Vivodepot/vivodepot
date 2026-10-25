'use strict';
/* ═══════════════════════════════════════════════════════════════════════════
   Klassenprobe zum Befund SDJWT-COUNTRY-CODE-DE (Wort TOP 03.10.2026, Bedingung 3): kein Ausgabeformat schreibt ein Land, das die
   Person nicht eingetragen hat.
   ────────────────────────────────────────────────────────────────────────────
   Gemessen an der AUSGABE, nicht am Literal: jedes Format aus EXPORT_FORMATE, in allen vier Produkten, über `kernAPI.exportiere`. Das
   Depot trägt eine Anschrift und KEINE Länderangabe. Rot ist
     · ein Schlüssel, der /country/i heißt und einen Wert trägt, und
     · ein Wert, der EXAKT ein Landescode ist (`DE`, `DEU` — Groß- und Kleinschreibung zählt; die Sprachkennung `de` ist nicht rot).
   Was heute noch auftritt, steht in GRUNDLINIE mit Grund; sie kann nur sinken. Die Zahl wird vor dem Schreiben gemeldet (eigenes Wort).
   ═══════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');
const { PRODUKTE } = require('../tools/lib/vier-produkte.js');

const LANDESCODES = new Set(['DE', 'DEU']);
// Format-Kennung → Fundpfade, die heute noch auftreten dürfen, je mit Grund. Am ersten Lauf gemessen und mit Wort geschrieben.
const GRUNDLINIE = Object.freeze({});

/* Alle Funde in einer Ausgabe: Pfad je Fund. Objekte werden durchlaufen; eine Zeichenkette (vCard, XML, CSV) wird in Felder zerlegt. */
function landFunde(wert, pfad = '', aus = []) {
  if (wert == null) return aus;
  if (typeof wert === 'string') {
    if (LANDESCODES.has(wert)) aus.push(pfad);
    else if (wert.length > 3) {
      for (const teil of wert.split(/[\s;:,<>"=/\\|]+/)) if (LANDESCODES.has(teil)) { aus.push(pfad + '~' + teil); break; }
    }
    return aus;
  }
  if (Array.isArray(wert)) { wert.forEach((w, i) => landFunde(w, pfad + '.' + i, aus)); return aus; }
  if (typeof wert === 'object') {
    for (const [k, w] of Object.entries(wert)) {
      if (/country/i.test(k) && w != null && w !== '') aus.push(pfad + '.' + k);
      landFunde(w, pfad + '.' + k, aus);
    }
  }
  return aus;
}

/* PRODID (RFC 5545 §3.7.3): die letzte Stelle der FPI ist die Sprache der Produktkennung, kein Land. Statt einer Ausnahme
   prüft die Probe sie ausdrücklich gegen die Sprache des Produkts und nimmt erst danach die Zeile aus der Ländersuche. */
const PRODID = /^PRODID:.*\/\/([^/\r\n]*)\r?$/m;
function prodidPruefen(text, sprache) {
  if (typeof text !== 'string') return { text, fund: null };
  const m = text.match(PRODID);
  if (!m) return { text, fund: null };
  const fund = m[1] === String(sprache).toUpperCase() ? null : 'PRODID-Sprache ' + m[1] + ' statt ' + String(sprache).toUpperCase();
  return { text: text.replace(PRODID, 'PRODID:'), fund };
}

// Formate, die erst mit Einträgen bauen, die diese Probe nicht setzt (gemessen 24.10.2026, in allen Produkten ohne Ausgabe).
const OHNE_EINTRAEGE_LEER = Object.freeze(['isik', 'kbv-pka']);

async function depot(V) {
  await V.depotAnlegen('ausgaben-land-probe-2026!');
  V.akteurSelbstErklaeren('Maria Mustermann');
  for (const [k, w] of Object.entries({ givenName: 'Maria', familyName: 'Mustermann', birthDate: '1950-03-14',
    street: 'Lindenweg', houseNumber: '4a', postalCode: '80331', city: 'München' })) V.sektorFeldSetzen('identity', k, w);
}

for (const p of PRODUKTE) {
  test('[Ausgaben·Land·' + p.slug + '] kein Format schreibt ein Land, das die Person nicht eingetragen hat', async () => {
    const { V } = ladeKern({ produkt: p.slug });
    await depot(V);
    const formate = V.alleExportFormate().map((f) => f.id);
    assert.ok(formate.includes('sd-jwt-vc-identitaet') && formate.length > 5, p.slug + ': Positivkontrolle — die Formate stehen');
    const funde = {};
    const nichtGebaut = [];
    let gebaut = 0;
    for (const id of formate) {
      let r;
      try { r = await V.kernAPI.exportiere(id, { sensibel: true }); } catch (_) { nichtGebaut.push(id); continue; }   // ein Tor ohne Ausgabe ist kein Fund
      if (r == null) { nichtGebaut.push(id); continue; }
      gebaut++;
      const pr = prodidPruefen(r, p.sprache);
      const f = landFunde(pr.text).filter((x) => !((GRUNDLINIE[id] || []).includes(x)));
      if (pr.fund) f.push(pr.fund);
      if (f.length) funde[id] = f;
    }
    /* Positivkontrolle (24.10.2026): ein Bereichs-Format baut nur, wenn das Produkt seinen Bereich anzeigt (Befund PRO-IPS-LEER).
       Jedes Format, das hier nichts liefert, ist darum entweder nicht angeboten oder braucht Einträge, die diese Probe nicht setzt. */
    const gezeigt = new Set(V.bereicheAlle().map((b) => b.id));
    const ungeprueft = nichtGebaut.filter((id) => { const def = V.alleExportFormate().find((f) => f.id === id);
      return !OHNE_EINTRAEGE_LEER.includes(id) && !(def && def.sektor && !gezeigt.has(def.sektor)); });
    assert.deepEqual(ungeprueft, [], p.slug + ': Positivkontrolle — jedes angebotene Format liefert eine Ausgabe');
    assert.ok(gebaut >= 2, p.slug + ': Positivkontrolle — mehrere Formate liefern eine Ausgabe (' + gebaut + ')');
    assert.deepEqual(funde, {}, p.slug + ': Ausgaben mit einem Land, das niemand eingetragen hat');
  });
}

test('[Ausgaben·Land·Rot-Beweis] ein fest gesetzter Code, ein country-Schlüssel und ein Code im Text werden gefunden, „de“ nicht', () => {
  assert.deepEqual(landFunde({ claims: { address: { country_code: 'DE' } } }), ['.claims.address.country_code', '.claims.address.country_code']);
  assert.deepEqual(landFunde({ land: 'DEU' }), ['.land']);
  assert.deepEqual(landFunde('ADR:;;Lindenweg 4a;München;;80331;DE'), ['~DE']);
  assert.deepEqual(landFunde({ sprache: 'de', text: 'Deutschland' }), []);
});

test('[Ausgaben·Land·PRODID·Rot-Beweis] die letzte Stelle der PRODID muss die Produktsprache sein; ein festes „DE“ im EN-Produkt fällt', () => {
  const ics = (s) => 'BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//Vivodepot//Termine//' + s + '\r\nEND:VCALENDAR\r\n';
  assert.equal(prodidPruefen(ics('DE'), 'en').fund, 'PRODID-Sprache DE statt EN');
  assert.equal(prodidPruefen(ics('EN'), 'en').fund, null);
  assert.equal(prodidPruefen(ics('DE'), 'de').fund, null);
  // erst nach der Prüfung fällt die Zeile aus der Ländersuche; ein Land daneben bleibt ein Fund
  assert.deepEqual(landFunde(prodidPruefen(ics('DE') + 'ADR:;;Lindenweg 4a;München;;80331;DE', 'de').text), ['~DE']);
  assert.deepEqual(landFunde(prodidPruefen(ics('DE'), 'de').text), []);
});
