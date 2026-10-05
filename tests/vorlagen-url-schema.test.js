'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   TEMPLATE-URL-SCHEMA-UNGEPRUEFT (05.10.2026) — eine Vorlagen-Quelle verlinkt nur auf https:
   ────────────────────────────────────────────────────────────────────────────
   `wortlautVorlageHTML` setzte `wortlautQuelle.url` und `wortlautQuelleBroschuere.url` als `href`.
   `escapeHTML` verhindert den Ausbruch aus dem Attribut, nicht ein `javascript:`-Ziel. `validateTemplate`
   prüfte die URL nur auf „nicht leer“. Heute erreichen nur die vier Ab-Werk-Standardvorlagen
   (tools/dokument-module/vivodepot-standardvorlage-*.json, alle https) die Senke; ein Rechtsraum-Modul oder
   ein wieder geöffneter Einlass brächte fremde dorthin.

   Zwei Stufen, beide geprüft: der Prüfweg (`validateTemplate`, im Studio die erzeugte Kopie) weist jedes
   andere Schema ab, die Senke setzt nur bei https: einen Verweis und sonst den Titel als Text.
   mailto:/tel: sind nicht zugelassen: keine Vorlage im Bestand trägt sie (gemessen 05.10.2026,
   grep nach `"url": "mailto:` bzw. `"tel:` über alle JSON-Dateien des Repos).
   ════════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { ladeKern } = require('./load-kern.js');

const BOESE = Object.freeze([
  'javascript:alert(1)',
  'JaVaScRiPt:alert(1)',
  '   javascript:alert(1)',
  '\njavascript:alert(1)',
  '\u0001javascript:alert(1)',
  'java\tscript:alert(1)',
  'javascript&#58;alert(1)',
  'data:text/html,<script>alert(1)</script>',
  'vbscript:msgbox(1)',
  'http://beispiel.invalid/q',
]);
const GUT = 'https://www.bmj.de/SharedDocs/Publikationen/DE/Broschueren/Patientenverfuegung.html';

function vorlage(url, broschuereUrl) {
  return {
    id: 'url-probe', name: 'URL-Probe', sektor: 'gesundheit',
    felder: [{ feldname: 'Probe', feldtyp: 'text' }],
    wortlaut: 'Wortlaut',
    wortlautQuelle: { behoerde: 'Stelle', titel: 'Titel', lizenz: 'Lizenz', url },
    wortlautQuelleBroschuere: { behoerde: 'Stelle', titel: 'Broschüre', url: broschuereUrl },
  };
}

test('[Vorlagen-URL·Positivkontrolle] eine https-Quelle geht durch und wird verlinkt', () => {
  const { V } = ladeKern();
  assert.equal(V.validateTemplate(vorlage(GUT, GUT)), null);
  const html = V.wortlautVorlageHTML(vorlage(GUT, GUT));
  assert.equal((html.match(/<a href="https:\/\/www\.bmj\.de\//g) || []).length, 2, html);
});

for (const boese of BOESE) {
  test('[Vorlagen-URL·Prüfweg·Rot-Beweis] ' + JSON.stringify(boese) + ' wird abgewiesen', () => {
    const { V } = ladeKern();
    assert.match(String(V.validateTemplate(vorlage(boese, GUT))), /wortlautQuelle\.url/);
    assert.match(String(V.validateTemplate(vorlage(GUT, boese))), /wortlautQuelleBroschuere\.url/);
  });
  test('[Vorlagen-URL·Senke·Rot-Beweis] ' + JSON.stringify(boese) + ' wird nicht verlinkt', () => {
    const { V } = ladeKern();
    const html = V.wortlautVorlageHTML(vorlage(boese, boese));
    const ziele = Array.from(html.matchAll(/href="([^"]*)"/g), (m) => m[1]);
    assert.deepEqual(ziele, [], 'kein Verweis erwartet, gefunden: ' + ziele.join(', '));
    assert.ok(html.includes('Titel') && html.includes('Broschüre'), 'der Titel bleibt als Text stehen');
  });
}

test('[Vorlagen-URL·Prüfweg] eine wortlautQuelle-URL wird auch ohne Wortlaut geprüft', () => {
  const { V } = ladeKern();
  const tpl = { felder: [{ feldname: 'Probe', feldtyp: 'text' }], wortlautQuelle: { url: 'javascript:alert(1)' } };
  assert.match(String(V.validateTemplate(tpl)), /wortlautQuelle\.url/);
});

test('[Vorlagen-URL·Lese-App] die Lese-App rendert keine Vorlagen-Quelle — eine künftige Senke fällt hier auf', () => {
  const lese = fs.readFileSync(path.join(__dirname, '..', 'vivodepot-lesen.html'), 'utf8');
  assert.equal((lese.match(/wortlautQuelle/g) || []).length, 0,
    'die Lese-App liest jetzt wortlautQuelle — dann braucht sie dieselbe https-Prüfung an ihrer Senke und eine Probe hier');
});
