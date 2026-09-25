'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Sicherheits-Rot-Beweis (17.09.2026): vivodepot-lesen.html Zeile ~8566 setzte
   ein Mappen-Bild aus der GEÖFFNETEN FREMDEN DATEI roh in ein src=, nur
   geprüft auf /^data:/ (m.inhalt) und /^image\//; (m.mime) — beides vom
   Angreifer selbst gesetzte Felder derselben Datei, keine echte Schranke.
   escapeHTML allein reicht hier nicht: src= wird vom Browser interpretiert
   (Typ, Protokoll), nicht nur als Attributwert gelesen.

   Wortgleicher Spiegel des Kern-Fixes (vivodepot.html, _mappeInhaltAlsQuelle,
   U2-ADR-Sicherheit 16.09.2026, s. tests/fremde-datei-reiner-text.test.js):
   eine Positivliste statt einer Verneinungsliste. Zugelassen ist nur eine
   data:-URL mit erlaubtem Bildtyp und reiner Base64-Zeichenmenge; alles
   andere ergibt null, und die Stelle zeigt ihr Symbol statt eines Bildes.
   Die Lese-App zeigt keine Mappen-PDFs, darum nur die Bild-Positivliste.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeLesen } = require('./load-lesen.js');

test('[Mappe·Positivliste] _mappeInhaltAlsQuelleLesen lässt nur eine geprüfte Bild-data:-URL durch', () => {
  const { V } = ladeLesen();
  const GUT = 'data:image/png;base64,iVBORw0KGgo=';
  const BOESE = 'data:image/png;base64,iVBORw0KGgo=" onerror="window.__xss=1';
  assert.equal(V._mappeInhaltAlsQuelleLesen(GUT), GUT);
  assert.equal(V._mappeInhaltAlsQuelleLesen(BOESE), null);
  assert.equal(V._mappeInhaltAlsQuelleLesen('data:image/svg+xml;base64,PHN2Zz4='), null, 'SVG ist keine erlaubte Bildquelle');
  assert.equal(V._mappeInhaltAlsQuelleLesen('javascript:alert(1)'), null);
  assert.equal(V._mappeInhaltAlsQuelleLesen('data:text/html;base64,PHNjcmlwdD4='), null, 'nur image/*, kein weiterer MIME-Typ');
  assert.equal(V._mappeInhaltAlsQuelleLesen(null), null);
  assert.equal(V._mappeInhaltAlsQuelleLesen(undefined), null);
});

test('[Mappe·Rot-Beweis] ein Mappen-Bild aus der geöffneten Datei bricht nicht aus dem src-Attribut aus', () => {
  const { V } = ladeLesen();
  const BOESE = 'data:image/png;base64,iVBORw0KGgo=" onerror="window.__xss=1';
  const GUT = 'data:image/png;base64,iVBORw0KGgo=';
  const depot = {
    schemaVersion: 75, menschen: [], urheberschaft: {}, sensibelFelder: {}, logikModule: [], bereichsModule: [],
    mappe: [
      { id: 'm1', beschriftung: 'Ausweis', bereich: 'identity', dateiname: 'x.png', mime: 'image/png', groesse: 3, inhalt: BOESE, hinzugefuegtAm: '2026-09-17' },
      { id: 'm2', beschriftung: 'Foto', bereich: 'identity', dateiname: 'y.png', mime: 'image/png', groesse: 3, inhalt: GUT, hinzugefuegtAm: '2026-09-17' },
    ],
    sektoren: {}, feldDefinitionen: [],
  };
  V.setData(depot);
  const feld = { id: 'profilePhotoCoverPage', typ: 'ref', entitaet: 'mappe', label: 'Profilfoto' };

  const html1 = V.feldZeileHTML('identity', feld, { ref: 'm1' });
  assert.ok(!/onerror="window/.test(html1), 'der Inhalt brach aus dem src-Attribut aus: ' + html1);
  assert.ok(!html1.includes('<img'), 'ein verworfener Inhalt zeigt kein <img> — Symbol/Text statt Bild: ' + html1);

  const html2 = V.feldZeileHTML('identity', feld, { ref: 'm2' });
  assert.ok(html2.includes('src="' + GUT + '"'), 'Gegenprobe: ein gültiges Bild erscheint: ' + html2);
});

test('[Mappe·Rot-Beweis] ein SVG mit onload aus der geöffneten Datei landet nicht als <img src>', () => {
  /* Der schärfere Fall als das Anführungszeichen: SVG braucht kein Ausbrechen aus dem Attribut —
     ein onload-Handler im SVG selbst kann in manchen Einbettungs-Kontexten laufen. escapeHTML
     allein hätte diesen Inhalt unverändert durchgelassen (kein Anführungszeichen darin). Der Kern
     schließt SVG darum bewusst aus der Positivliste aus (s. Kopf-Kommentar an
     _MAPPE_BILD_DATA_URL_LESEN); dieselbe Ausschlussregel gilt hier. */
  const { V } = ladeLesen();
  const SVG_MIT_ONLOAD = 'data:image/svg+xml;base64,PHN2ZyBvbmxvYWQ9ImFsZXJ0KDEpIi8+';
  const depot = {
    schemaVersion: 75, menschen: [], urheberschaft: {}, sensibelFelder: {}, logikModule: [], bereichsModule: [],
    mappe: [{ id: 'm3', beschriftung: 'SVG', bereich: 'identity', dateiname: 'z.svg', mime: 'image/svg+xml', groesse: 3, inhalt: SVG_MIT_ONLOAD, hinzugefuegtAm: '2026-09-17' }],
    sektoren: {}, feldDefinitionen: [],
  };
  V.setData(depot);
  const feld = { id: 'profilePhotoCoverPage', typ: 'ref', entitaet: 'mappe', label: 'Profilfoto' };
  const html = V.feldZeileHTML('identity', feld, { ref: 'm3' });
  assert.ok(!html.includes('<img'), 'ein SVG-Inhalt darf nicht als <img src> erscheinen: ' + html);
});
