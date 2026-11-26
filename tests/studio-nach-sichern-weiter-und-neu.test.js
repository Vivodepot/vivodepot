'use strict';
/* ═════════════════════════════════════════════════════════════════
   Studio nach dem Sichern wie der freigegebene Dummy vom 14.11.2026
   ─────────────────────────────────────────────────────────────────
   (1) Ohne Namen der Vorlage sichert „Vorlage sichern“ nichts: am Feld „Name der Vorlage“ steht
       „Geben Sie der Vorlage einen Namen.“, die Ansicht springt auf „Vorlage“. Danach gilt die Prüfung der Stelle wie bisher.
       Ein Beispiel trägt wie im Dummy seinen Namen ins Feld, wenn dort noch keiner steht.
   (2) Nach dem Sichern steht unter „Vorlage gesichert“ der Name der Vorlage und „N Datenfelder, für <Stelle>“
       (bei einem Feld „Ein Datenfeld, für <Stelle>“).
   (3) Oben „‹ Weiter bearbeiten“: die Seite nach dem Sichern schließt sich, die Felder bleiben.
   (4) Unten „Weitere Vorlage beginnen“: zurück auf den Start.
   (5) Wortlaut der Wege: „Für E-Mail, Brief oder Ihre Website“, „Zum Aushängen oder Vorzeigen am Schalter“, „Als Datei speichern“ mit
       „Zum späteren Öffnen und Ändern im Studio“, „Als PDF“ mit „Die Vorlage zum Lesen und Ablegen“.
       Oben steht seit 18.11.2026 die Anfrage für Personen, den QR-Code der Vorlage zeigt die Seite nicht (Probe tests/studio-nach-sichern-anfrage-oben.test.js).
   ROT-BEWEIS: GENERATOR_HTML_PATH=<Fassung vor diesem Wagen> node --test tests/studio-nach-sichern-weiter-und-neu.test.js → alle rot.
   ═════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { ladeGenerator, GEN_PATH } = require('./load-generator.js');

const HTML = fs.readFileSync(GEN_PATH, 'utf8');
function funktion(name) {
  const i = HTML.search(new RegExp('(?:async )?function ' + name + '\\('));
  if (i < 0) return '';
  const k = HTML.indexOf('\n}\n', i);
  return HTML.slice(i, k < 0 ? i + 4000 : k + 2);
}

/* Ein Studio mit Stelle und Feldern; jedes Element, das das Ergebnis baut, wird mitgeschrieben (der DOM-Stub hat keine Kinder). */
function studio(o) {
  const g = ladeGenerator();
  const anbieter = g.sandbox.baueAnbieter({ anbieterName: 'Stadtbibliothek Probestadt', kontaktEmail: 'a@probe.example' });
  Object.assign(g.V.STATE, { felder: o.felder, dokument: { titel: 'Probe' }, vorlageName: o.name, vorlageId: 'probe', version: 1, anbieter });
  g.sandbox.blobDownload = () => {};
  const gebaut = [];
  const el = g.sandbox.el;
  g.sandbox.el = (tag, attrs, kinder) => { const e = el(tag, attrs, kinder); gebaut.push({ tag, attrs: attrs || {}, kinder: kinder || [] }); return e; };
  return { g, gebaut };
}
const FELD = (feldname) => ({ feldname, feldtyp: 'text', pflicht: false, bereich: 'identity', gruppe: 'Angaben' });
const text = (b) => String(b.attrs.text != null ? b.attrs.text : b.kinder.filter((k) => typeof k === 'string').join(''));
const knopf = (gebaut, id) => gebaut.find((b) => b.tag === 'button' && b.attrs.id === id);

test('[Nach Sichern · 1] ohne Namen der Vorlage: nichts gesichert, Satz aus dem Dummy am Feld, Ansicht „Vorlage“', async () => {
  const { g } = studio({ felder: [FELD('Vorname')], name: '' });
  const hinaus = [];
  g.sandbox.blobDownload = (n) => hinaus.push(n);
  let ansicht = null;
  g.sandbox.ansichtSetzen = (p) => { ansicht = p; };
  assert.equal(await g.sandbox.vorlageSichern(), false, 'ohne Namen der Vorlage darf nichts gesichert werden');
  assert.equal(hinaus.length, 0, 'es ging eine Datei hinaus: ' + hinaus.join(', '));
  assert.equal(g.document.getElementById('tpl-name-meldung').hidden, false, 'der Satz am Feld „Name der Vorlage“ ist nicht zu sehen');
  assert.equal(ansicht, false, 'die Ansicht springt nicht auf „Vorlage“');
  assert.match(HTML, /id="tpl-name-meldung"[^>]*>Geben Sie der Vorlage einen Namen\.<\/p>/, 'der Dummy-Wortlaut am Feld fehlt');
  assert.match(funktion('vorlageSichern'), /Bitte tragen Sie zuerst den Namen Ihrer Stelle ein\./, 'die Prüfung der Stelle fehlt');
});

test('[Nach Sichern · 1b] ein Beispiel bringt seinen Namen mit; ein schon eingetragener Name bleibt', () => {
  const { g } = studio({ felder: [], name: '' });
  g.sandbox.zeigeSchritt = () => {};
  g.sandbox.ladeBeispiel('bibliothek');
  assert.ok(String(g.V.STATE.vorlageName).trim().length > 0, 'das Beispiel bringt keinen Namen mit');
  g.V.STATE.vorlageName = 'Eigener Name';
  g.sandbox.ladeBeispiel('verein');
  assert.equal(g.V.STATE.vorlageName, 'Eigener Name', 'ein eingetragener Name wurde überschrieben');
});

test('[Nach Sichern · 2] Name der Vorlage und „N Datenfelder, für <Stelle>“ unter „Vorlage gesichert“', async () => {
  const { g, gebaut } = studio({ felder: [FELD('Vorname'), FELD('Nachname')], name: 'Bibliotheksausweis' });
  await g.sandbox.vorlageSichern();
  const name = gebaut.find((b) => b.attrs.id === 'ns-vorlage-name'), zahl = gebaut.find((b) => b.attrs.id === 'ns-vorlage-zahl');
  assert.ok(name && text(name) === 'Bibliotheksausweis', 'der Name der Vorlage steht nicht da');
  assert.ok(zahl && text(zahl) === '2 Datenfelder, für Stadtbibliothek Probestadt', 'die Zahl-Zeile fehlt oder weicht ab: ' + (zahl && text(zahl)));
  assert.equal(g.sandbox.vorlageZahlZeile(1, 'X'), 'Ein Datenfeld, für X');
});

test('[Nach Sichern · 3/4] oben „‹ Weiter bearbeiten“, unten „Weitere Vorlage beginnen“', async () => {
  const { g, gebaut } = studio({ felder: [FELD('Vorname')], name: 'Bibliotheksausweis' });
  await g.sandbox.vorlageSichern();
  const weiter = knopf(gebaut, 'ns-weiter-bearbeiten'), neu = knopf(gebaut, 'ns-weitere-vorlage');
  assert.ok(weiter && text(weiter) === '‹ Weiter bearbeiten', '„‹ Weiter bearbeiten“ fehlt');
  assert.ok(neu && text(neu) === 'Weitere Vorlage beginnen', '„Weitere Vorlage beginnen“ fehlt');
  const im = gebaut.filter((b) => b.tag !== 'button' || b.attrs.id);
  assert.ok(gebaut.indexOf(weiter) < gebaut.findIndex((b) => text(b) === 'Vorlage gesichert'), '„Weiter bearbeiten“ steht nicht oben');
  assert.equal(gebaut.indexOf(neu), Math.max(...im.map((b) => gebaut.indexOf(b))), '„Weitere Vorlage beginnen“ steht nicht unten');
  // Weiter bearbeiten: die Seite nach dem Sichern geht zu, die Felder bleiben.
  const box = g.document.getElementById('sichern-ergebnis'), ns = g.document.getElementById('nach-sichern');
  box.hidden = false; ns.hidden = false;
  weiter.attrs.onclick();
  assert.equal(box.hidden, true); assert.equal(ns.hidden, true);
  assert.equal(g.V.STATE.felder.length, 1, 'die Felder sind weg');
  // Weitere Vorlage: zurück auf den Start.
  let schritt = null;
  g.sandbox.zeigeSchritt = (s) => { schritt = s; };
  box.hidden = false;
  neu.attrs.onclick();
  assert.equal(schritt, 'willkommen', 'nicht zurück auf den Start');
  assert.equal(box.hidden, true);
});

test('[Nach Sichern · 5] Wortlaut der Wege wie im Dummy', () => {
  const f = funktion('vorlageErgebnisZeigen');
  /* N74/N75 (22.11.2026): Link und QR-Code wortgleich zum Dummy Z. 202–203. */
  assert.match(f, /L\('Für E-Mail, Brief oder Ihre Website', /);
  assert.match(f, /L\('Zum Aushängen oder Vorzeigen am Schalter', /);
  assert.match(f, /L\('Als Datei speichern'/);
  assert.match(f, /L\('Zum späteren Öffnen und Ändern im Studio', /);   // wortgleich zum Dummy Z. 209 (18.11.2026)
  assert.match(f, /L\('Die Vorlage zum Lesen und Ablegen', /);   // wortgleich zum Dummy Z. 210
});
