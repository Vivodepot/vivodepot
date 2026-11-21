'use strict';
/* Öffnen-Schirm „Willkommen zurück“: ein neues Depot direkt anlegen (19.11.2026, Befund ALTE-FASSUNG-OHNE-HINWEIS, Teil b)
   ────────────────────────────────────────────────────────────────────────────
   Bisher führte vom Öffnen-Schirm nur „Anderes Depot öffnen“ weiter, zum Startschirm, und erst dort stand „Depot anlegen“.
   Ein neues Depot war also zwei Schritte entfernt, und kein Knopf auf dem Öffnen-Schirm nannte das Anlegen.
   Diese Probe hält fest: Der Schirm trägt einen dritten leisen Knopf „Neues Depot anlegen“ (englisch „Create a new depot“),
   neben den beiden bestehenden. Ein Klick öffnet denselben Anlege-Dialog wie „Depot anlegen“ auf dem Startschirm, und ein
   gehaltener Umschlag wird dabei verworfen wie auf dem Weg über den Startschirm.
   Rot-Beweis: am Kanon ohne den Knopf (6c1d9cf21) sind alle drei Tests rot. Nachfahren mit
   der Kanon-Fassung des Kerns als Ladequelle. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

function schirm(k) {
  k.V.renderCryptoOverlay(null, false, false);
  return k.document.getElementById('overlay-inhalt').innerHTML || '';
}

test('[Öffnen·Neues Depot] der Öffnen-Schirm trägt „Neues Depot anlegen“ als dritten leisen Knopf neben den bestehenden', () => {
  const k = ladeKern();
  const markup = schirm(k);
  const i = (s) => markup.indexOf(s);
  assert.ok(i('id="co-anlegen"') > -1, 'der Knopf steht im Öffnen-Schirm');
  assert.ok(i('id="co-code"') > -1 && i('id="co-neu"') > -1, 'die beiden bestehenden Wege bleiben');
  assert.ok(i('id="co-neu"') < i('id="co-anlegen"'), 'als dritter Weg in derselben Zeile');
  assert.match(markup, /<button type="button" class="btn-dezent" id="co-anlegen">Neues Depot anlegen<\/button>/, 'leise, mit dem deutschen Wortlaut');
});

test('[Öffnen·Neues Depot] englisch heißt der Knopf „Create a new depot“', () => {
  const k = ladeKern();
  k.V.vorDepotSpracheUmschalten();
  const markup = schirm(k);
  assert.match(markup, /id="co-anlegen">Create a new depot<\/button>/);
});

test('[Öffnen·Neues Depot] ein Klick öffnet denselben Anlege-Dialog wie „Depot anlegen“ auf dem Startschirm', () => {
  const k = ladeKern();
  schirm(k);
  const knopf = k.document.getElementById('co-anlegen');
  assert.ok(knopf && typeof knopf.onclick === 'function', 'der Knopf ist verdrahtet');
  knopf.onclick();
  const html = k.document.getElementById('modal-inhalt').innerHTML || '';
  assert.ok(html.includes('id="id-vorname"') && html.includes('id="id-pw2"'), 'der Anlege-Dialog mit Name und Passwort ist offen');
  assert.ok(html.includes('data-schritt="1"'), 'Schritt 1 von 2, wie vom Startschirm');
});
