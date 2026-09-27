'use strict';
/* ═══════════════════════════════════════════════════════════════════════════════════════════
   Der Textsatz-Einlass meldet einen Verlust (22.09.2026) — ZWEI Befunde, zwei getrennte Fälle, keine Angleichung des Registers.
   ───────────────────────────────────────────────────────────────────────────────────────────
   GEMESSEN (Weg: node-Skript gegen `V.modulEinlassen`, frischer Kern je Fall): ein Sprachmodul (`modulTyp: 'textsatz'`), von dem JEDE Kennung
   unbekannt ist, kam mit `angenommen: true, grund: null` zurück; die Oberfläche zeigte „Erweiterung eingelesen: textsatz · fr", schaltete die
   Sprache um, und sie blieb deutsch. Ein Modul mit einer unbekannten Kennung UND einer bekannten kam ebenso als Erfolg zurück, der Verlust stand
   nur im API-Ergebnis (`verworfene`), nicht bei der Person.

   BEFUND 1 — ALLES VERWORFEN. Vier Geschwister (bereich, situation ×2, wizard) melden das mit `gueltig: false, grund: 'leer'` und dem Hinweis aus
   `_einlassHinweisFuerLeer` (U2-ADR-303, seit 05.09.2026). Das Textsatz-Register ruft den Helfer nicht. Die Angleichung ist EIN Aufruf.
   BEFUND 2 — TEILWEISE. Der Einlass kennt die Warnung `moduleEinlassenUnvollstaendig` (Prüfer setzt `unvollstaendig`, B3 Kette Auftrag 3 Zug 6);
   `textsatzModulPruefen` setzt es nicht. Die Warnung zeigt die Zahl der verlorenen Zuordnungen; die erste Kennung nennt sie nicht (dafür bräuchte es
   einen neuen Text, und der Zug trägt KEINE neuen Textkennungen).

   Was hier NICHT geprüft wird: dass die Bürgerin die Meldung versteht. Geprüft ist, dass die Meldung, die der Kern schon hat, an dieser Stelle
   ausgelöst wird und dass der Erfolgs-Toast dann nicht mehr erscheint.
   ═══════════════════════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

const BEKANNT = 'strings:depotPilleEigen.text';
const modul = (texte, sprache = 'fr') => ({ modulTyp: 'textsatz', sprache, moduleVersion: 1, texte });

async function frischOffenesDepot() {
  const { V, document } = ladeKern();
  await V.depotAnlegen('pw');
  V.akteurSelbstErklaeren('T');
  V.betreteApp();
  const toasts = [];
  V.ui.toast = (text, art) => { toasts.push({ text, art }); };
  return { V, document, toasts };
}

/* ── Positivkontrolle: der Weg selbst funktioniert ────────────────────────────────────────── */

test('[Textsatz-Einlass·Positivkontrolle] ein Modul, dessen Kennungen alle bekannt sind, wird angenommen und meldet Erfolg — der Fix darf das nicht ändern', async () => {
  const { V, toasts } = await frischOffenesDepot();
  const r = V.modulEinlassen(JSON.stringify(modul({ [BEKANNT]: 'Mon coffre' })));
  assert.equal(r.angenommen, true, r.grund || '');
  assert.deepEqual(r.verworfene, []);
  V._moduleEinlassWirken(r);
  assert.equal(toasts.length, 1);
  assert.equal(toasts[0].art, 'ok', 'Erfolg bleibt Erfolg');
  assert.ok(toasts[0].text.includes('textsatz') && toasts[0].text.includes('fr'));
});

/* ── BEFUND 1 — ALLES VERWORFEN ───────────────────────────────────────────────────────────── */

test('[Textsatz-Einlass·alles verworfen] der Prüfer sagt gueltig:false, grund:"leer" mit dem Hinweis des gemeinsamen Helfers — wie bereich, situation und wizard', async () => {
  const { V } = await frischOffenesDepot();
  const g = V.textsatzModulPruefen(modul({ 'strings:gibtEsNicht.text': 'Inconnu', 'strings:auchNicht.text': 'Aussi' }));
  assert.equal(g.gueltig, false, 'Erfolg für einen Fehlschlag');
  assert.equal(g.grund, 'leer');
  assert.ok(typeof g.hinweis === 'string' && g.hinweis.startsWith(V.STRINGS.einlassHinweisLeer), 'derselbe Hinweis wie bei den Geschwistern: ' + g.hinweis);
  assert.ok(g.hinweis.includes('unbekannt'), 'der echte Grund steht im Hinweis');
  assert.equal(g.verworfene.length, 2);
});

test('[Textsatz-Einlass·alles verworfen] der Einlass lehnt ab, und die Person sieht die Ablehnung statt „Erweiterung eingelesen" — die Sprache schaltet nicht um', async () => {
  const { V, toasts } = await frischOffenesDepot();
  const r = V.modulEinlassen(JSON.stringify(modul({ 'strings:gibtEsNicht.text': 'Inconnu' })));
  assert.equal(r.angenommen, false);
  assert.equal(r.grund, 'leer');
  assert.equal(r.verworfene.length, 1, 'die Kennung steht im Ergebnis');
  V._moduleEinlassWirken(r);
  assert.equal(toasts.length, 1);
  assert.equal(toasts[0].art, 'warn', 'eine Ablehnung ist keine Erfolgsmeldung');
  assert.ok(!toasts[0].text.startsWith(V.STRINGS.moduleEinlassenOk.split('{')[0]), 'nicht der Erfolgstext: ' + toasts[0].text);
  assert.equal(V.getData().textsprache || '', '', 'die Sprache wurde nicht auf ein Modul umgeschaltet, das nichts trägt');
});

test('[Textsatz-Einlass·alles verworfen·Gegenprobe] die Geschwister verhalten sich genauso: derselbe Grund an einem bereich-Modul mit lauter ungültigen Einträgen', async () => {
  const { V } = await frischOffenesDepot();
  const b = V.bereichsModulPruefen({ modulTyp: 'bereich', moduleVersion: 1, herkunft: 'x', sprache: 'fr', bereiche: { 'Ungültig!': { label: 'A' } } });
  assert.equal(b.gueltig, false);
  assert.equal(b.grund, 'leer', 'Vorbedingung: das ist das Muster, dem das Textsatz-Register angeglichen wird');
});

test('[Textsatz-Einlass·Grenze] ein Modul OHNE einen einzigen Text und OHNE etwas Verworfenes bleibt, wie es war (gültig, leer) — der Zug ändert nur „alles verworfen"', async () => {
  const { V } = await frischOffenesDepot();
  const g = V.textsatzModulPruefen(modul({}));
  assert.equal(g.gueltig, true);
  assert.deepEqual(g.verworfene, []);
});

/* ── BEFUND 2 — TEILWEISE ─────────────────────────────────────────────────────────────────── */

test('[Textsatz-Einlass·teilweise] der Prüfer meldet den Verlust: unvollstaendig und die Zahl der verworfenen', async () => {
  const { V } = await frischOffenesDepot();
  const g = V.textsatzModulPruefen(modul({ [BEKANNT]: 'Mon coffre', 'strings:gibtEsNicht.text': 'Inconnu', 'strings:auchNicht.text': 'Aussi' }));
  assert.equal(g.gueltig, true, 'ein Rest-Modul nützt mehr als eine pauschale Ablehnung: es wird angenommen');
  assert.equal(g.unvollstaendig, true);
  assert.equal(g.verloreneZuordnungen, 2);
  assert.equal(g.texte[BEKANNT], 'Mon coffre', 'der übernommene Text ist da');
});

test('[Textsatz-Einlass·teilweise] die Person sieht die Warnung mit der Zahl statt der Erfolgsmeldung', async () => {
  const { V, toasts } = await frischOffenesDepot();
  const r = V.modulEinlassen(JSON.stringify(modul({ [BEKANNT]: 'Mon coffre', 'strings:gibtEsNicht.text': 'Inconnu', 'strings:auchNicht.text': 'Aussi' })));
  assert.equal(r.angenommen, true);
  assert.equal(r.unvollstaendig, true);
  assert.equal(r.verloreneZuordnungen, 2);
  V._moduleEinlassWirken(r);
  assert.equal(toasts.length, 1);
  assert.equal(toasts[0].art, 'warn', 'mit Verlust ist es keine Erfolgsmeldung');
  assert.ok(toasts[0].text.includes('2'), 'die Zahl steht in der Meldung: ' + toasts[0].text);
  assert.ok(toasts[0].text.includes('textsatz') && toasts[0].text.includes('fr'));
  assert.equal(V.getData().textsprache, 'fr', 'angenommen bleibt angenommen: das Modul wirkt, der Verlust ist benannt');
});

test('[Textsatz-Einlass·teilweise·Grenze] ein verworfener Text ohne Inhalt zählt ebenso als Verlust (nicht nur eine unbekannte Kennung)', async () => {
  const { V } = await frischOffenesDepot();
  const g = V.textsatzModulPruefen(modul({ [BEKANNT]: 'Mon coffre', 'strings:fussHaftung.text': '   ' }));
  assert.equal(g.unvollstaendig, true);
  assert.equal(g.verloreneZuordnungen, 1);
});

/* ── Zusicherungssätze sind KEIN Verlust ─────────────────────────────────────────────────────
   Ein Zusicherungssatz ohne Vertrauen ist bekannt, aber bis zur Prüfung der Signaturkette beim Öffnen aufgeschoben (`grund: 'zusicherung'`). Ein Modul aus
   lauter Zusicherungssätzen ist ein vorgesehener Fall (tests/sprachmodul-zusicherungen-signiert.test.js); der Zug darf es nicht abweisen, und ein vollständiges
   Modul mit Zusicherungssätzen darf keine Verlust-Warnung auslösen. Das fand sich erst, als die 44 bestehenden Tests rot wurden: neun davon meldeten diesen Fall. */
const ZUSICHERUNG = 'strings:herkunftSatzKeine.text';

test('[Textsatz-Einlass·Zusicherung] ein Modul aus lauter Zusicherungssätzen wird weiter angenommen — sie sind aufgeschoben, nicht verloren', async () => {
  const { V, toasts } = await frischOffenesDepot();
  const g = V.textsatzModulPruefen(modul({ [ZUSICHERUNG]: 'Ces données viennent de {marke}.' }));
  assert.equal(g.gueltig, true, g.grund || '');
  assert.deepEqual(g.verworfene.map((v) => v.grund), ['zusicherung']);
  assert.equal(g.unvollstaendig, undefined, 'ein aufgeschobener Satz ist kein Verlust');
  const r = V.modulEinlassen(JSON.stringify(modul({ [ZUSICHERUNG]: 'Ces données viennent de {marke}.' })));
  assert.equal(r.angenommen, true, r.grund || '');
  V._moduleEinlassWirken(r);
  assert.equal(toasts[0].art, 'ok');
});

test('[Textsatz-Einlass·Zusicherung] ein Modul mit bekanntem Text UND einem Zusicherungssatz meldet keinen Verlust', async () => {
  const { V } = await frischOffenesDepot();
  const g = V.textsatzModulPruefen(modul({ [BEKANNT]: 'Mon coffre', [ZUSICHERUNG]: 'Ces données viennent de {marke}.' }));
  assert.equal(g.gueltig, true);
  assert.equal(g.unvollstaendig, undefined);
});

test('[Textsatz-Einlass·Zusicherung·Grenze] neben einem Zusicherungssatz zählt ein unbekannter Text als Verlust, das Modul ist dann nicht „leer"', async () => {
  const { V } = await frischOffenesDepot();
  const g = V.textsatzModulPruefen(modul({ 'strings:gibtEsNicht.text': 'Inconnu', [ZUSICHERUNG]: 'Ces données viennent de {marke}.' }));
  assert.equal(g.gueltig, true, 'der aufgeschobene Satz kann nach der Prüfung der Kette noch Text werden: das Modul ist nicht leer');
  assert.equal(g.unvollstaendig, true);
  assert.equal(g.verloreneZuordnungen, 1, 'nur der unbekannte zählt');
});

/* ── Null neue Textkennungen: der Zug ruft vorhandene Helfer und Texte, er schreibt keine ─────── */

test('[Textsatz-Einlass·Bedingung] beide Meldungen sind Texte, die der Kern seit langem hat — der Zug hat keine neue Textkennung eingeführt', async () => {
  const { V } = await frischOffenesDepot();
  for (const k of ['einlassHinweisLeer', 'moduleEinlassenUnvollstaendig', 'moduleEinlassenFehler', 'moduleEinlassenOk']) {
    assert.ok(typeof V.STRINGS[k] === 'string' && V.STRINGS[k].length > 10, k + ' existiert');
  }
});
