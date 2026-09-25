'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Teil B · Ein Feld mit Gültigkeit erscheint im Prüfblatt
   ────────────────────────────────────────────────────────────────────────
   Nachtrag „Die vier Häufungen" (17.08.2026), Teil B. Glied 1 hatte
   gemessen: ein angedocktes Datumsfeld SCHWEIGT, weil `data.dokumente[]`
   die einzige Quelle des Prüfblatts war. Seit U2-ADR-144 weiß ein Feldwert,
   von wann bis wann er gilt — hier bekommt er den Weg dorthin.

   Die zwei Gestaltungsfragen sind entschieden (Produktentscheidung, 17.08.):
   der Klick öffnet den Bereich und HEBT DAS FELD HERVOR · den Haken
   „erledigt" gibt es auch beim Feld, er schreibt an dieselbe Stelle wie die
   Gültigkeit und VERLÄNGERT SIE NICHT.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

const JETZT = new Date('2026-08-17T10:00:00Z');

function depotMitAngedocktemFeld() {
  const { V, document } = ladeKern();
  V.setData(V.leeresDepot());
  const d = V.getData();
  d.feldDefinitionen = [{ sektorId: 'wohnen', feldId: 'tpl_ablauf', typ: 'datum', label: 'Ablauf der Bescheinigung' }];
  d.sektoren.housing = { tpl_ablauf: '2026-09-30' };
  V.setData(d);
  return { V, document };
}

/* ══ Die Zahl, die der Auftrag ganz vorn verlangt ═══════════════════════ */

test('[Teil B] ein angedocktes Feld mit Ablaufdatum erscheint im Prüfblatt — vorher 0, jetzt 1', () => {
  const { V } = depotMitAngedocktemFeld();
  // VORBEDINGUNG vor der Zahl (wie in Glied 1): das Feld ist wirklich angedockt und rendert.
  const gruppen = V._templateAbschnitte('wohnen');
  assert.equal(gruppen.length, 1, 'Vorbedingung: das Feld ist angekommen');
  assert.equal(gruppen[0].felder[0].typ, 'datum');
  // OHNE Gültigkeit: null Zeilen — die Zusicherung aus Zug 3 an ihrer sichtbarsten Stelle.
  assert.equal(V.prueftermineFelder(JETZT).length, 0, 'ohne Gültigkeitsangabe schweigt es weiter');
  // MIT Gültigkeit: eine Zeile.
  V.feldGueltigkeitSetzen('wohnen', 'tpl_ablauf', '2025-10-01', '2026-09-30');
  const zeilen = V.prueftermineFelder(JETZT);
  assert.equal(zeilen.length, 1, 'jetzt erscheint es');
  assert.equal(zeilen[0].name, 'Ablauf der Bescheinigung', 'mit seiner Beschriftung, nicht mit seiner Feld-Id');
  assert.equal(zeilen[0].sektorId, 'wohnen');
  assert.equal(zeilen[0].faelligAm, '2026-09-30', 'das „gültig bis" ist die Fälligkeit');
});

test('[Teil B] die Zeile steht in der gerenderten Sicht, nicht nur im Modell', () => {
  const { V } = depotMitAngedocktemFeld();
  V.feldGueltigkeitSetzen('wohnen', 'tpl_ablauf', '2025-10-01', '2026-09-30');
  const html = V.prueftermineSektionHTML();
  assert.ok(html.includes('Ablauf der Bescheinigung'), 'der Wortlaut erscheint');
  assert.ok(html.includes('feld:wohnen:tpl_ablauf'), 'und der Sprung-Anker trägt Bereich UND Feld-Id');
});

/* ══ Rot-Belege ════════════════════════════════════════════════════════ */

test('[Teil B·Rot] ein Feld OHNE Gültigkeitsangabe erscheint nicht', () => {
  const { V } = depotMitAngedocktemFeld();
  // Wert vorhanden, Definition vorhanden — nur die Gültigkeit fehlt.
  assert.equal(V.getData().sektoren.housing.tpl_ablauf, '2026-09-30', 'Vorbedingung: der Wert steht da');
  assert.equal(V.prueftermineFelder(JETZT).length, 0);
  assert.ok(!V.prueftermineSektionHTML().includes('Ablauf der Bescheinigung'));
});

test('[Teil B·Rot] ein abgelaufenes Feld steht auf ROT, ein fernes auf grün', () => {
  const { V } = depotMitAngedocktemFeld();
  V.feldGueltigkeitSetzen('wohnen', 'tpl_ablauf', '2020-01-01', '2026-01-01');
  assert.equal(V.prueftermineFelder(JETZT)[0].stufe, 'rot', 'abgelaufen');
  V.feldGueltigkeitSetzen('wohnen', 'tpl_ablauf', '2020-01-01', '2029-01-01');
  assert.equal(V.prueftermineFelder(JETZT)[0].stufe, 'gruen', 'weit in der Zukunft');
});

test('[Teil B·Rot] der Haken entfernt die Zeile — und das Prüfdatum steht danach im Depot', () => {
  const { V } = depotMitAngedocktemFeld();
  V.feldGueltigkeitSetzen('wohnen', 'tpl_ablauf', '2020-01-01', '2026-01-01');
  assert.equal(V.prueftermineFelder(JETZT).length, 1, 'Vorbedingung: die Zeile ist da');
  const r = V.feldAlsGeprueft('wohnen', 'tpl_ablauf', JETZT);
  assert.ok(r && r.geprueftAm, 'der Haken schreibt ein Prüfdatum');
  assert.equal(V.prueftermineFelder(JETZT).length, 0, 'die Zeile ist weg');
  assert.equal(V.getData().feldGueltigkeit.wohnen.tpl_ablauf.geprueftAm, r.geprueftAm,
    'und das Prüfdatum steht an DERSELBEN Stelle wie die Gültigkeit, nicht in einer zweiten Tabelle');
});

test('[Teil B] der Haken verlängert die Gültigkeit ausdrücklich NICHT', () => {
  const { V } = depotMitAngedocktemFeld();
  V.feldGueltigkeitSetzen('wohnen', 'tpl_ablauf', '2020-01-01', '2026-01-01');
  V.feldAlsGeprueft('wohnen', 'tpl_ablauf', JETZT);
  assert.deepEqual(V.feldGueltigkeitLesen('wohnen', 'tpl_ablauf'), { von: '2020-01-01', bis: '2026-01-01' },
    'das „gültig bis" ist eine Tatsache über das Dokument und gehört der Bürgerin, nicht dem Haken');
  assert.equal(V.feldGiltAm('wohnen', 'tpl_ablauf', '2026-08-17'), false, 'es gilt weiterhin nicht mehr');
});

test('[Teil B·Rot] „einmal abgehakt" heisst nicht „für immer still" — eine neue Gültigkeit holt die Zeile zurück', () => {
  const { V } = depotMitAngedocktemFeld();
  V.feldGueltigkeitSetzen('wohnen', 'tpl_ablauf', '2020-01-01', '2026-01-01');
  V.feldAlsGeprueft('wohnen', 'tpl_ablauf', JETZT);
  assert.equal(V.prueftermineFelder(JETZT).length, 0, 'Vorbedingung: still');
  // Die Bürgerin trägt ein neues „gültig bis" ein — die Bestätigung von gestern gilt nicht dafür.
  V.feldGueltigkeitSetzen('wohnen', 'tpl_ablauf', '2020-01-01', '2026-02-01');
  assert.equal(V.prueftermineFelder(JETZT).length, 1,
    'die Zeile kommt zurück, sonst wäre ein einziger Klick eine dauerhafte Stummschaltung');
});

test('[Teil B·Rot] ein Dokument-Termin verhält sich unverändert — Ampel und Reihenfolge', () => {
  const { V } = ladeKern();
  V.setData(V.leeresDepot());
  const d = V.getData();
  d.dokumente = [
    { id: 'a', typ: 'x', sektorId: 'wohnen', name: 'Ein rotes Dokument', gueltigAb: '2020-01-01', ablaufDatum: '2026-01-01', quelle: 'manuell' },
    { id: 'b', typ: 'y', sektorId: 'wohnen', name: 'Ein grünes Dokument', gueltigAb: '2020-01-01', ablaufDatum: '2029-01-01', quelle: 'manuell' },
  ];
  V.setData(d);
  const nurDoks = V.prueftermineDokumente(JETZT);
  assert.deepEqual(nurDoks.map(x => x.name), ['Ein rotes Dokument', 'Ein grünes Dokument'], 'rot vor grün, wie bisher');
  assert.deepEqual(nurDoks.map(x => x.stufe), ['rot', 'gruen']);
  // Und mit einer Feld-Zeile dazwischen bleibt die Ordnung dieselbe Regel, nicht eine zweite.
  V.feldGueltigkeitSetzen('wohnen', 'ein_feld', '2020-01-01', '2026-06-01');
  const alle = V.prueftermineAlle(JETZT);
  assert.equal(alle.length, 3, 'beide Quellen in EINER Liste');
  assert.equal(alle[alle.length - 1].name, 'Ein grünes Dokument', 'grün steht hinten, egal aus welcher Quelle');
  assert.equal(alle.filter(x => x.ausFeld).length, 1, 'die Feld-Zeile ist als solche erkennbar');
});

/* ══ Der Sprung ════════════════════════════════════════════════════════ */

test('[Teil B·Rot] der Klick landet am FELD, nicht nur im Bereich', () => {
  const { V } = depotMitAngedocktemFeld();
  const zerlegt = V._feldTerminZerlegen('feld:wohnen:tpl_ablauf');
  assert.deepEqual(zerlegt, { sektorId: 'wohnen', feldId: 'tpl_ablauf' },
    'die Kennung trägt Bereich UND Feld — ein Feld hat keine Dokument-Id');
  assert.equal(V._feldTerminZerlegen('irgendeine-dokument-id'), null, 'eine Dokument-Id ist keine Feld-Kennung');
  assert.equal(V._feldTerminId('wohnen', 'tpl_ablauf'), 'feld:wohnen:tpl_ablauf');
});

test('[Teil B] ein Feld ohne Beschriftung verliert seine Zeile nicht — es zeigt seine Id', () => {
  const { V } = ladeKern();
  V.setData(V.leeresDepot());
  V.feldGueltigkeitSetzen('wohnen', 'ein_namenloses_feld', null, '2026-09-30');
  const z = V.prueftermineFelder(JETZT);
  assert.equal(z.length, 1);
  assert.equal(z[0].name, 'ein_namenloses_feld',
    'eine Zeile ohne Namen wäre schlimmer als eine mit einem technischen');
});

test('[Teil B] ein EINGEBAUTES Feld trägt seine echte Beschriftung', () => {
  const { V } = ladeKern();
  V.setData(V.leeresDepot());
  // Schnitt Glied 3 (22.08.2026, A448, U2-ADR-161): `ausweis_gueltig` ist Unterfeld der Liste
  // `ausweis` geworden und existiert als Sektorfeld-Kennung nicht mehr — `reisepass_gueltig`
  // bleibt unverändert ein eingebautes Flachfeld mit echter Beschriftung, dieselbe Kategorie.
  V.feldGueltigkeitSetzen('mobility', 'passportValidUntil', null, '2029-05-04');
  const z = V.prueftermineFelder(JETZT);
  assert.equal(z.length, 1);
  assert.notEqual(z[0].name, 'passportValidUntil', 'nicht die Id, sondern die Beschriftung aus der Definition');
  assert.ok(z[0].name.length > 0);
});
