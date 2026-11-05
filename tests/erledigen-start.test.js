'use strict';
/* Start nach dem ersten Anlegen (Zielbild S3/S4, Abnahme der Gestaltungsleitung zum Design-Zug v979, Nr. 4; Vorgabe 4.8).
   Ohne eigenes Ziel öffnet das Anlegen „Was möchten Sie erledigen?“ im App-Rahmen (Ansicht `erledigen` in #content), nicht
   „Identität“. Fehlt der Wiederherstellungs-Code, steht über den Kacheln der Satz aus den Einstellungen mit dem Knopf, der ihn
   einrichtet. Die Kacheln kommen aus derselben Quelle wie die Auswahl über dem Overlay (_anlassKachelnHTML).
   Rot-Beweis: mit eingerichtetem Code fehlt der Hinweis; ein Anlegen MIT eigenem Ziel (Umschau-Karte, Anfrage) geht weiter
   an sein Ziel. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { ladeKern } = require('./load-kern.js');

const KERN = fs.readFileSync(path.join(__dirname, '..', 'vivodepot.html'), 'utf8');

test('[Erledigen·Start] das Anlegen ohne eigenes Ziel öffnet die Ansicht „erledigen“, mit Ziel bleibt es beim Ziel', () => {
  assert.match(KERN, /if \(typeof nach === 'function'\) nach\(\); else \{ betreteApp\(\); aktiveAnsicht = 'erledigen'; renderSidebar\(\); renderContent\(\); \}/);
  assert.match(KERN, /if \(aktiveAnsicht === 'erledigen'\) \{ renderErledigen\(\); return; \}/);
});

test('[Erledigen·Seite] Titel, Einleitung, Kacheln aus der gemeinsamen Quelle; Hinweis, solange kein Code eingerichtet ist', async () => {
  const { V, document } = ladeKern();
  await V.depotAnlegen('pw');
  V.akteurSelbstErklaeren('Tester');
  V.renderErledigen();
  const html = document.getElementById('content').innerHTML;
  assert.match(html, /data-ansicht="erledigen"/);
  assert.ok(html.includes(V.STRINGS.anlassFrageHerausholen), 'Titel');
  assert.ok(html.includes(V.STRINGS.erledigenEinleitung), 'Einleitung');
  assert.ok(html.includes(V._anlassKachelnHTML()), 'dieselben Kacheln wie über dem Overlay');
  assert.match(html, /data-anlass="/);
  assert.equal(V.whcHuelleVorhanden(), false);
  assert.match(html, /data-erledigen-whc="1"/);
  assert.ok(html.includes(V.STRINGS.whcStatusFehlt));
  assert.match(html, /id="erledigen-whc-einrichten"/);
});

test('[Erledigen·Seite·Rot-Beweis] mit eingerichtetem Code steht kein Hinweis da, die Kacheln bleiben', async () => {
  const { V, document } = ladeKern();
  await V.depotAnlegen('pw');
  V.akteurSelbstErklaeren('Tester');
  await V.whcHuelleWickeln('pw', V.whcCodeErzeugen().slice(0, V.WHC_STELLEN));
  assert.equal(V.whcHuelleVorhanden(), true);
  V.renderErledigen();
  const html = document.getElementById('content').innerHTML;
  assert.doesNotMatch(html, /data-erledigen-whc/);
  assert.match(html, /data-anlass="/);
});

test('[Erledigen·Rubriken] die Abschnittstitel der Seite stehen in Tinte, Gold bleibt im Logo', () => {
  const css = fs.readFileSync(path.join(__dirname, '..', 'tools', 'erscheinung', 'stil', 'grundlage.css'), 'utf8');
  assert.match(css, /\.erledigen \.klasse-titel \{ color: var\(--ink2, var\(--ink\)\); \}/);
});

/* Fremder Text in der Senke c.innerHTML von renderErledigen: der Markenname aus einem fremden Depot steht über {marke} in der
   Einleitung. Ein reiner Name mit HTML-Sonderzeichen kommt maskiert an, ein Name, der kein reiner Text ist, gar nicht. */
async function fremdesDepotMitMarke(name) {
  const A = ladeKern().V;
  await A.depotAnlegen('fremd-marke-pw');
  A.akteurSelbstErklaeren('B');
  A.getData().brandingModule = [{ modulTyp: 'branding', moduleVersion: 1, herkunft: 'x', name }];
  const umschlag = await A.depotSerialisieren();
  const { V, document } = ladeKern();
  await V.depotLaden(umschlag, 'fremd-marke-pw');
  V.depotModuleWaehlen(V.nichtGewaehlteDepotModule().map((g) => g.modul));
  return { V, document };
}

test('[Erledigen·Fremdtext] ein fremder Markenname steht maskiert in der Einleitung, nie als HTML', async () => {
  const { V, document } = await fremdesDepotMitMarke('Bank & Co');
  assert.equal(V._markeName(), 'Bank & Co', 'Vorbedingung: der fremde Name wirkt');
  V.renderErledigen();
  const html = document.getElementById('content').innerHTML;
  assert.match(html, /<p class="sektor-intro">[^<]*Bank &amp; Co zeigt Ihnen/);
  const fremd = await fremdesDepotMitMarke('<img src=q onerror=1>');
  fremd.V.renderErledigen();
  assert.doesNotMatch(fremd.document.getElementById('content').innerHTML, /<img src=q /);
  // Rot-Beweis: derselbe Name ohne Maskieren in denselben Satz gesetzt, stünde als Element in der Seite.
  assert.match('<p>' + V.textLesen('strings:erledigenEinleitung.text').replace('Bank & Co', '<img src=q onerror=1>') + '</p>', /<img src=q /);
});
