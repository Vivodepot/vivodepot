'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Anlegen: Schreibweise (24.11.2026) — wie die sechs Wörter und der Code getippt werden dürfen, steht am Feld; Meldungen nennen
   den Grund; die leeren Blätter lassen sich jederzeit drucken
   ────────────────────────────────────────────────────────────────────────
   (1) Probe beim Anlegen: Sind gar keine sechs Listenwörter zu erkennen, sagt die Meldung das (pwProbeKeineWoerter), statt
       „passen nicht“. Ein abweichendes Wort bleibt benannt.
   (2) Am Probe-Feld (nur beim Vorschlag), am Öffnen-Feld und an jedem Code-Feld steht ein Hinweis zur Schreibweise, mit
       aria-describedby verbunden.
   (3) Ein zu kurzer oder zu langer Code nennt die Zahl der Zeichen; bei richtiger Länge bleibt die allgemeine Meldung.
   (4) Schritt 1 und die Einstellungen (Passwort, Wiederherstellungs-Code) tragen je einen Knopf für das leere Blatt. Die Blätter
       tragen weder die Wörter noch den Code; das Passwort wird nie erneut angezeigt.
   Die Wortlaute sind Vorschläge; die Probe prüft die Stellen über die Schlüssel, nicht über den Wortlaut.
   E2E bei 375 px: tests/e2e/passwort-woerter-wie-angezeigt.spec.js.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

const KANON = 'tinte-wolke-hafen-apfel-geige-birke';
const NEU = ['anlegenPwProbeHinweis', 'pwProbeKeineWoerter', 'oeffnenPwHinweis', 'whcCodeFeldHinweis', 'whcFehlerZuKurz',
  'whcFehlerZuLang', 'whcNichtNochmalSatz'];

test('[Schreibweise·Texte] jeder neue Schlüssel trägt einen Text', () => {
  const { V } = ladeKern();
  for (const k of NEU) assert.ok(typeof V.STRINGS[k] === 'string' && V.STRINGS[k].length > 0 && !V.STRINGS[k].startsWith('strings:'), k);
  assert.match(V.STRINGS.whcFehlerZuKurz, /\{n\}/);
  assert.match(V.STRINGS.whcFehlerZuLang, /\{n\}/);
});

test('[Schreibweise·Probe] keine sechs Wörter erkannt: die Meldung sagt das; ein abweichendes Wort bleibt benannt', () => {
  const { V } = ladeKern();
  const m = V.pwProbeMeldung;
  assert.equal(m(KANON, 'irgend was'), V.STRINGS.pwProbeKeineWoerter);
  assert.equal(m(KANON, 'tinte wolke hafen apfel geige'), V.STRINGS.pwProbeKeineWoerter, 'fünf Wörter');
  // Ohne Trenner wird von vorn gegen die angezeigte Reihe gelesen: das erste abweichende Wort ist benannt.
  assert.equal(m(KANON, 'tintewolkehafenapfelgeigexyz'), V.STRINGS.pwProbeWortWeichtAb.replace('{n}', '6'), 'ohne Trenner, Wort 6');
  assert.equal(m(KANON, 'tinte wolke hafen apfel geige kanne'), V.STRINGS.pwProbeWortWeichtAb.replace('{n}', '6'));
  assert.equal(m(KANON, 'tintewolkehofenapfelgeigebirke'), V.STRINGS.pwProbeWortWeichtAb.replace('{n}', '3'), 'ohne Trenner, Wort 3');
  assert.equal(m('mein-eigenes-passwort', 'x'), V.STRINGS.pwSetzenUngleich, 'eigenes Passwort: wie bisher');
  assert.notEqual(V.STRINGS.pwProbeKeineWoerter, V.STRINGS.pwProbeWoerterUngleich, 'Rot-Beweis: zwei verschiedene Sätze');
});

test('[Schreibweise·Schritt 1] Hinweis am Probe-Feld und Knopf für das leere Passwort-Blatt', () => {
  const { V, document } = ladeKern();
  V.flowDepotAnlegen();
  const html = document.getElementById('modal-inhalt').innerHTML;
  assert.match(html, /id="id-pw2"[^>]*aria-describedby="id-pw2-hinweis"/);
  assert.ok(html.includes('id="id-pw2-hinweis">' + V.escapeHTML(V.STRINGS.anlegenPwProbeHinweis) + '<'), 'Hinweis am Probe-Feld');
  assert.ok(html.includes('id="id-pw-blatt">' + V.escapeHTML(V.STRINGS.nfbDruckenKnopf) + '<'), 'Druckknopf in Schritt 1');
  assert.ok(html.indexOf('id="id-pw-blatt"') > html.indexOf('id="id-pw2"'), 'der Knopf steht bei den Wörtern, unter der Probe');
});

test('[Schreibweise·Öffnen] Hinweis am Passwort-Feld des Öffnen-Schirms', () => {
  const k = ladeKern();
  k.V.renderCryptoOverlay(null, false, false);
  const html = k.document.getElementById('overlay-inhalt').innerHTML || '';
  assert.match(html, /id="co-pw"[^>]*aria-describedby="co-pw-hinweis"/);
  assert.ok(html.includes('id="co-pw-hinweis">' + k.V.escapeHTML(k.V.STRINGS.oeffnenPwHinweis) + '<'));
});

test('[Schreibweise·Code] Hinweis an jedem Code-Feld; zu kurz und zu lang mit Zahl', () => {
  const k = ladeKern();
  const V = k.V;
  // Jede Hinweis-ID ist eindeutig: die vorhandenen Hinweise der Code-Felder heißen <id>-hinweis.
  for (const id of ['whc-code-ein', 'whc-kontrolle', 'pw-wechsel-code']) {
    const h = V._whcCodeFeld(id, 'x');
    assert.ok(!h.includes('id="' + id + '-hinweis"'), id + ': keine zweite ID ' + id + '-hinweis');
  }
  k.V.renderCodeOeffnen(null, false);
  const html = k.document.getElementById('overlay-inhalt').innerHTML || '';
  assert.match(html, /id="whc-code-ein"[^>]*aria-describedby="whc-code-ein-schreibweise"/);
  assert.ok(html.includes('id="whc-code-ein-schreibweise">' + V.escapeHTML(V.STRINGS.whcCodeFeldHinweis) + '<'), 'beim Öffnen');
  const code = V.whcCodeErzeugen();
  const gruppiert = V.whcCodeGruppiert(code);
  assert.equal(V.whcLaengeMeldung(gruppiert), null, 'richtige Länge: keine Längen-Meldung');
  assert.equal(V.whcLaengeMeldung(gruppiert.slice(0, -3)), V.STRINGS.whcFehlerZuKurz.replace('{n}', '3'));
  assert.equal(V.whcLaengeMeldung(gruppiert + ' AB'), V.STRINGS.whcFehlerZuLang.replace('{n}', '2'));
  assert.equal(V.whcLaengeMeldung(''), V.STRINGS.whcFehlerZuKurz.replace('{n}', String(V.WHC_STELLEN + 1)));
});

test('[Schreibweise·Einstellungen] Knöpfe für beide leeren Blätter; die Blätter tragen weder Wörter noch Code', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen(KANON);
  let html = V.einstellungenHTML();
  assert.ok(html.includes('id="einst-pw-blatt"'), 'Passwort-Blatt in den Einstellungen');
  assert.ok(html.includes('id="einst-whc-blatt"'), 'Code-Blatt in den Einstellungen, auch ohne Code');
  assert.ok(!html.includes('id="whc-nicht-nochmal"'), 'ohne Code kein Satz dazu');
  const code = V.whcCodeErzeugen();
  await V.whcHuelleWickeln(KANON, code.slice(0, V.WHC_STELLEN));
  html = V.whcAbschnittHTML();
  assert.ok(html.includes('id="einst-whc-blatt"') && html.includes('id="whc-nicht-nochmal"'), 'mit Code: Knopf und Satz');
  const blaetter = V.notfallblattHTML() + V.codeblattHTML();
  for (const w of KANON.split('-')) assert.ok(!blaetter.toLowerCase().includes(w), 'kein Wort auf dem Blatt: ' + w);
  assert.ok(!blaetter.toUpperCase().includes(code.slice(0, 8)), 'kein Code auf dem Blatt');
  assert.equal(V.notfallblattHTML.length + V.codeblattHTML.length, 0, 'die Blätter nehmen kein Argument (nichts zum Einsetzen)');
});

/* ── Durchgang 24.11.2026 (fremde Nutzerin, v1072): Öffnen und Öffnen mit Code nennen zuerst, was fehlt ─────────────────────── */

const DATEI_KAPUTT = { name: 'probe.vivodepot', text: async () => 'kein Depot' };
const feld = (document, id, wert) => { document.getElementById(id).value = wert; };
/* Das Test-DOM kennt nur IDs, die wörtlich als id="…" in der Quelle stehen; das Code-Feld bekommt seine ID als Argument
   (_whcCodeFeld). Die Probe stellt es darum selbst bereit. */
function codeFeldBereitstellen(document) {
  const el = { value: '' };
  const orig = document.getElementById;
  document.getElementById = (id) => (id === 'whc-code-ein' ? el : orig(id));
}
const fehler = (document, id) => { const el = document.getElementById(id); return el.hidden ? '' : el.textContent; };

test('[Durchgang·O2] „Öffnen“ ohne Datei: die Meldung bittet um die Datei, keine Rede von Entschlüsselung', async () => {
  const { V, document } = ladeKern();
  V.renderCryptoOverlay(null, false, false);
  feld(document, 'co-pw', '');
  await V.cryptoOverlayOeffnen();
  assert.equal(fehler(document, 'crypto-fehler'), V.STRINGS.oeffnenDateiFehlt);
  feld(document, 'co-pw', 'irgendein-passwort');
  await V.cryptoOverlayOeffnen();
  assert.equal(fehler(document, 'crypto-fehler'), V.STRINGS.oeffnenDateiFehlt, 'auch mit Passwort: die Datei fehlt');
  assert.notEqual(V.STRINGS.oeffnenDateiFehlt, V.STRINGS.fehlerFalsch, 'Rot-Beweis: nicht der Entschlüsselungssatz');
});

test('[Durchgang·O3] Datei gewählt, Passwort leer: die alte Meldung verschwindet, die neue bittet um das Passwort', async () => {
  const { V, document } = ladeKern();
  V.renderCryptoOverlay(DATEI_KAPUTT, false, false);
  feld(document, 'co-pw', 'falsch');
  await V.cryptoOverlayOeffnen();
  assert.equal(fehler(document, 'crypto-fehler'), V.STRINGS.dateiNichtLesbar, 'Vorbedingung: eine Meldung steht');
  feld(document, 'co-pw', '');
  await V.cryptoOverlayOeffnen();
  assert.equal(fehler(document, 'crypto-fehler'), V.STRINGS.oeffnenPwFehlt);
});

test('[Durchgang·C2] Öffnen mit Code: ohne Code zuerst der Code, zu kurz mit Zahl — nicht das Passwort', async () => {
  const { V, document } = ladeKern();
  V.renderCodeOeffnen(DATEI_KAPUTT, false);
  codeFeldBereitstellen(document);
  feld(document, 'whc-pw-neu', 'ein-neues-passwort-2026');
  feld(document, 'whc-pw-neu2', 'etwas-anderes');
  feld(document, 'whc-code-ein', '');
  await V.codeOverlayOeffnen(false);
  assert.equal(fehler(document, 'whc-oeffnen-fehler'), V.STRINGS.whcCodeFehlt);
  feld(document, 'whc-code-ein', 'ABCD EFGH');
  await V.codeOverlayOeffnen(false);
  assert.equal(fehler(document, 'whc-oeffnen-fehler'), V.STRINGS.whcFehlerZuKurz.replace('{n}', '20'));
});

test('[Durchgang·C3] Öffnen mit Code: die Probe des neuen Passworts nimmt die Wörter wie beim Anlegen an (PASSWORT-OHNE-TRENNER)', async () => {
  const { V, document } = ladeKern();
  V.renderCodeOeffnen(DATEI_KAPUTT, false);
  codeFeldBereitstellen(document);
  feld(document, 'whc-code-ein', V.whcCodeGruppiert(V.whcCodeErzeugen()));
  feld(document, 'whc-pw-neu', KANON);
  for (const probe of ['tinte wolke hafen apfel geige birke', 'TinteWolkeHafenApfelGeigeBirke', KANON]) {
    feld(document, 'whc-pw-neu2', probe);
    await V.codeOverlayOeffnen(false);
    // Die Probe besteht; danach scheitert erst die (absichtlich kaputte) Datei.
    assert.equal(fehler(document, 'whc-oeffnen-fehler'), V.STRINGS.dateiNichtLesbar, probe);
  }
  feld(document, 'whc-pw-neu2', 'tinte wolke hafen apfel geige kanne');
  await V.codeOverlayOeffnen(false);
  assert.equal(fehler(document, 'whc-oeffnen-fehler'), V.STRINGS.pwProbeWortWeichtAb.replace('{n}', '6'));
  feld(document, 'whc-pw-neu', 'mein-eigenes-passwort-2026');
  feld(document, 'whc-pw-neu2', 'Mein-eigenes-passwort-2026');
  await V.codeOverlayOeffnen(false);
  assert.equal(fehler(document, 'whc-oeffnen-fehler'), V.STRINGS.pwSetzenUngleich, 'eigenes Passwort: zeichengenau');
});

test('[Durchgang·O4] ein Wortlaut für „Passwort stimmt nicht“ in Anwendung und Lese-App', () => {
  const { V } = ladeKern();
  const L = require('./load-lesen.js').ladeLesen().V;
  assert.equal(L.STRINGS.pwFalsch, V.STRINGS.entsperrPasswortFalsch);
  assert.ok(L.STRINGS.pwFalschWiederholt.startsWith(V.STRINGS.entsperrPasswortFalsch), 'auch die Wiederholung beginnt so');
});

test('[Durchgang·C4] das Angebot des Passwort-Blatts endet ohne „— von uns nicht“, die Aussage bleibt', () => {
  const { V } = ladeKern();
  assert.doesNotMatch(V.STRINGS.nfbAnbietenText, /von uns nicht/);
  assert.match(V.STRINGS.nfbAnbietenText, /Wiederherstellungs-Code/);
  assert.match(V.STRINGS.nfbAnbietenText, /Wir selbst können es nicht öffnen\./);
});
