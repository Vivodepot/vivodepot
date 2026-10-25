'use strict';
/* Vorprüfung im Studio für ein Branding-Modul v2 (U2-ADR-473 W2). Der Bereich EINLASS-REGELN trägt den Kern-Prüfer wörtlich, aber nicht
   das Erscheinungsbild des Produkts; ein Modul mit `erscheinung` warf dort und fiel auf „bei-vivodepot“ zurück. Jetzt prüft das Studio
   das Modul ohne das Profil mit der Prüfung der Bürger-App, zeigt Name und Marke des Partners und nennt das Profil als Punkt, den
   Vivodepot prüft. Auf Zeichenebene: Urteil, Marke und Zeilen aus `einlassUrteil`, die Anzeige am Quelltext von `einlassUrteilZeigen`.
   Privat wie das Studio selbst. */
const test = require('./helfer/nur-privat.js').testMitPrivat(__filename);   // nur-privat: s. tests/helfer/nur-privat.js
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { ladeGenerator } = require('./load-generator.js');

const STUDIO = fs.readFileSync(path.join(__dirname, '..', 'vivodepot-studio.html'), 'utf8');
const PARTNER = 'Musterverein Beispielstadt';
const V2 = Object.freeze({ modulTyp: 'branding', moduleVersion: 2, herkunft: 'musterverein', name: PARTNER, domain: 'musterverein.example',
  farbePrimaer: '#1f4068', poweredByAus: true, erscheinung: { tokens: { basis: { '--radius-karte': '20px' } } } });
const json = (x) => JSON.parse(JSON.stringify(x));

test('[Studio·Branding v2] ein v2-Modul mit erscheinung zeigt den Partnernamen, wirft nicht und fällt nicht auf „bei Vivodepot“', () => {
  const { V } = ladeGenerator();
  const u = json(V.einlassUrteil('branding', json(V2)));
  assert.equal(u.urteil, 'gemeldet', 'nie „bestanden“: das Profil prüft erst Vivodepot');
  assert.deepEqual(u.marke, { name: PARTNER, domain: 'musterverein.example' });
  assert.deepEqual(u.zeilen, [{ grund: 'erscheinung-bei-vivodepot', fundstelle: 'erscheinung', schwere: 'gemeldet', quelle: 'einlass' }]);
  assert.match(V.einlassZeileText(u.zeilen[0]), /gegen das Erscheinungsbild des Produkts/);
  // Die Anzeige schreibt die Marke (Quelltext von einlassUrteilZeigen).
  const a = STUDIO.indexOf('function einlassUrteilZeigen(');
  assert.match(STUDIO.slice(a, STUDIO.indexOf('\n}\n', a)), /u\.marke\.name/);
});

test('[Studio·Branding v2] dieselben Regeln wie die Bürger-App: Fassung 1 mit Profil abgewiesen, nur ein Profil gemeldet, Fassung 1 ohne Profil wie bisher', () => {
  const { V } = ladeGenerator();
  const v1 = json(V.einlassUrteil('branding', Object.assign(json(V2), { moduleVersion: 1, poweredByAus: undefined })));
  assert.equal(v1.urteil, 'abgewiesen');
  assert.ok(v1.zeilen.some((z) => z.grund === 'erscheinung-erst-ab-fassung-2'));
  const nurProfil = json(V.einlassUrteil('branding', { modulTyp: 'branding', moduleVersion: 2, herkunft: 'x', erscheinung: V2.erscheinung }));
  assert.equal(nurProfil.urteil, 'gemeldet');
  const ohne = json(V.einlassUrteil('branding', { modulTyp: 'branding', moduleVersion: 1, herkunft: 'x', name: PARTNER, farbePrimaer: '#1f4068' }));
  assert.equal(ohne.urteil, 'bestanden', 'Gegenprobe: ein Modul ohne Profil urteilt wie bisher');
  assert.equal(ohne.marke.name, PARTNER);
});

test('[Studio·Branding v2·Rot-Beweis] ohne die Behandlung des Profils wirft der Bereich und das Studio fällt auf „bei Vivodepot“ zurück', () => {
  const zeile = '  const ohneErscheinung = _einlassOhneErscheinung(typ, modul);';
  assert.equal(STUDIO.split(zeile).length, 2, 'Vorbedingung: die Zeile steht genau einmal in einlassUrteil');
  const { V } = ladeGenerator({ html: STUDIO.replace(zeile, '  const ohneErscheinung = null;') });
  const u = json(V.einlassUrteil('branding', json(V2)));
  assert.equal(u.urteil, 'bei-vivodepot');
  assert.equal(u.marke, undefined, 'kein Partnername');
});
