'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   A44 — der Typwächter für `codeListe` in `sektorFeldSetzen`
   ────────────────────────────────────────────────────────────────────────────
   DIE ZUSAGE: Ein Feld mit `codeListe` nimmt keinen rohen String an.

   WOZU. `_codeEintraege` liest solche Felder als Chip-Array `[{text, code}]`
   und gibt für einen String `[]` zurück. Der Wert steht dann im Depot, ist am
   Bildschirm sichtbar — und das FHIR-Dokument behauptet „Keine Allergien
   hinterlegt". Das war A43, dreifach, auf dem B16-Umstiegsweg.

   Der Schreibweg selbst ist mit dem `codeListe`-Zweig in `_wertAusText`
   geschlossen. Dieser Wächter schützt die KLASSE dahinter: den nächsten
   Schreibweg, den jemand baut, ohne an die Chip-Form zu denken. Das ist
   dieselbe Bauart wie der Listen-Wächter aus U2-ADR-104 — der schützt „die
   KLASSE, nicht die fünf Felder dieses Umbaus", und genau bei `codeListe`
   griff er nicht, weil die Felder `typ: 'text'` tragen.

   ── WARUM DIESER TEST NICHT DER STOLPERDRAHT IST (Regel 10) ────────────────
   `tests/codeliste-felder-skalar-stolperdraht.test.js` prüft, ob ein MAPPING
   auf ein Code-Listen-Feld zielt — eine Aussage über die Import-Tabellen.
   Dieser Test prüft, ob der SETTER einen String abweist — eine Aussage über
   `sektorFeldSetzen`. Verschiedene Gegenstände; der eine sichert die Grube ab,
   der andere schliesst sie.
   ════════════════════════════════════════════════════════════════════════════ */
const test = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

async function depot() {
  const { V } = ladeKern();
  await V.depotAnlegen('a44-pw');
  V.akteurSelbstErklaeren('T');
  return V;
}

/* Alle Felder mit `codeListe` — aus dem Modell gelesen, damit ein neues Feld
   die Zusage mitträgt, ohne dass jemand diesen Test pflegt. */
function codeListenFelder(V) {
  const raus = [];
  for (const sid of Object.keys(V.SEKTOR_BY_ID)) {
    for (const sek of V.SEKTOR_BY_ID[sid].sektionen || []) {
      for (const f of sek.felder || []) if (f.codeListe) raus.push([sid, f.id]);
    }
  }
  return raus;
}

/* ── PFLICHTEINGANG (Regel 13) ────────────────────────────────────────────── */
test('[A44·Vorprüfung] es gibt Code-Listen-Felder — sonst prüft der Rest nichts', async () => {
  const V = await depot();
  const felder = codeListenFelder(V);
  assert.ok(felder.length >= 3,
    'Nur ' + felder.length + ' Code-Listen-Feld(er) im Modell. Entweder ist die Chip-Mechanik weg '
    + 'oder dieser Test liest das Modell falsch — in beiden Fällen ist sein Grün wertlos.');
});

/* ── DIE ZUSAGE ───────────────────────────────────────────────────────────── */
test('[A44] jedes Code-Listen-Feld weist einen rohen String ab', async () => {
  const V = await depot();
  const durchgerutscht = [];
  for (const [sid, fid] of codeListenFelder(V)) {
    let warf = false;
    try { V.sektorFeldSetzen(sid, fid, 'roher Text'); } catch (_) { warf = true; }
    if (!warf) durchgerutscht.push(sid + '.' + fid);
  }
  assert.equal(durchgerutscht.join(', '), '',
    'Diese Code-Listen-Felder nehmen einen rohen String an. `_codeEintraege` liest daraus `[]` — '
    + 'der Wert steht im Depot und ist sichtbar, während ein Ausgabeweg Abwesenheit behauptet '
    + '(A43):\n' + durchgerutscht.join(', '));
});

test('[A44] die Chip-Form wird angenommen — der Wächter sperrt nicht das Richtige mit', async () => {
  const V = await depot();
  for (const [sid, fid] of codeListenFelder(V)) {
    V.sektorFeldSetzen(sid, fid, [{ text: 'Ein Eintrag' }]);
    const w = (V.getData().sektoren[sid] || {})[fid];
    assert.ok(Array.isArray(w) && w.length === 1 && w[0].text === 'Ein Eintrag',
      'Die Chip-Form kommt bei `' + sid + '.' + fid + '` nicht an: ' + JSON.stringify(w)
      + ' — ein Wächter, der auch den richtigen Weg sperrt, wird abgeschaltet.');
  }
});

test('[A44] ein Feld OHNE codeListe nimmt weiterhin einen String', async () => {
  const V = await depot();
  V.sektorFeldSetzen('identity', 'givenName', 'Maria');
  assert.equal(V.getData().sektoren.identity.givenName, 'Maria',
    'Der Wächter greift zu weit: gewöhnliche Textfelder müssen Strings nehmen, sonst ist er '
    + 'kein Typwächter, sondern ein Verbot.');
});

/* ── DIE GRENZE, die beim Bau gemessen wurde ───────────────────────────────
   Die Migrations-Fixture (Schema 38: Skalar → Chip-Array) schreibt Strings —
   und muss es dürfen, denn dort IST der String der echte Ausgangszustand vor
   der Migration. Sie schreibt direkt ins Datenobjekt, nicht über diesen
   Setter. Diese Prüfung hält fest, dass die Grenze dort verläuft: der Wächter
   sitzt am SETTER, nicht am Datenmodell. */
test('[A44] der Wächter sitzt am Setter — ein Altbestand-Objekt bleibt lesbar', async () => {
  const V = await depot();
  const d = V.getData();
  d.sektoren.health = d.sektoren.health || {};
  d.sektoren.health.allergien = 'Penicillin';        // wie ein Depot VOR Schema 38
  assert.equal(d.sektoren.health.allergien, 'Penicillin',
    'Ein direkt gesetzter Altwert muss lesbar bleiben — sonst könnte die Migration ihren '
    + 'eigenen Ausgangszustand nicht mehr herstellen.');
});
