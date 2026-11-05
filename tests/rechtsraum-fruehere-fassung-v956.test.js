'use strict';
/* U2-ADR-507, Nachtrag 29.10.2026 — ein altes Depot nach dem Umzug der Schritte. Seit dem Umzug trägt das deutsche Rechtsraum-Modul
   je Typ `bauplan`; sein Fingerabdruck ist ein anderer als der der Form, die bis v956 ausgeliefert war. Ein Depot aus v956 trägt das
   Modul in der alten Form, im Fach `rechtsraumModule` der Mitschrift und im Modul-Fach. Es öffnet im neuen Kern und in der neuen
   Lese-App ohne „unbekannt“: die alte Form steht in der Menge der früher ausgelieferten Fassungen (Region
   ABWERK-FRUEHERE-FASSUNGEN-KERN bzw. -LESEN, erhoben aus den ausgelieferten Ständen), nicht mehr in der Menge der Rezepte.
   Rot-Beweis: eine Kern- und eine Lese-App-Kopie ohne diesen Abdruck in der Menge früherer Fassungen zählen das Modul als Erweiterung.
   Das Fach `dokumente` der Mitschrift trägt das innere Objekt der Dokumente-Datei, nie die Moduldatei; die Lese-App zählt es nicht,
   und der Kern sät es nicht aus der Mitschrift — dafür steht unten die Gegenprobe. Bekommt die Dokumente-Datei je ein Einlass-Fach
   oder ein gezähltes Mitschrift-Fach, braucht sie eine eigene Probe mit Rot-Beweis wie das Rechtsraum-Modul und ein neues Wort der
   Gegenlesung zur Sperre; diese Gegenprobe genügt dann nicht mehr. Fixture: byte-gleiche Kopie der in v956
   ausgelieferten Datei, beim Fixture-Wächter mit Grund ausgenommen. */
const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { ladeKern } = require('./load-kern.js');
const { ladeLesen, LESEN_PATH } = require('./load-lesen.js');

const KERN_HTML = fs.readFileSync(path.join(__dirname, '..', 'vivodepot.html'), 'utf8');
const LESEN_HTML = fs.readFileSync(LESEN_PATH, 'utf8');
const V956 = () => JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', 'mitschrift-fruehere-fassung-v956-rechtsraum-de.json'), 'utf8'));
const _wegwerf = [];
after(() => { for (const d of _wegwerf) fs.rmSync(d, { recursive: true, force: true }); });

function region(html, name) {
  const a = html.indexOf('/* ' + name + ':BEGIN');
  const b = html.indexOf('/* ' + name + ':END */');
  assert.ok(a > 0 && b > a, 'Vorbedingung: Region ' + name);
  return html.slice(a, b);
}
function ohneAbdruck(html, name, hex) {
  const r = region(html, name);
  const zeile = '  "sha256:' + hex + '",\n';
  assert.equal(r.split(zeile).length, 2, 'Vorbedingung: der Abdruck steht genau einmal in ' + name);
  return html.replace(r, r.replace(zeile, ''));
}
async function abdruck() {
  const { V } = ladeKern({ blank: true });
  return V._modulRezeptFingerabdruck(V956());
}
const leer = () => ({ schemaVersion: 83, menschen: [], urheberschaft: {}, mappe: [], feldDefinitionen: [], sensibelFelder: {}, sektoren: {} });

test('[U2-ADR-507·frühere Fassung·Vorbedingung] die v956-Form des Rechtsraum-Moduls ist eine frühere Fassung, keine laufende', async () => {
  const hex = await abdruck();
  assert.ok(!region(KERN_HTML, 'REZEPT-FINGERABDRUECKE-KERN').includes(hex), 'nicht mehr in der Menge der Rezepte');
  assert.ok(region(KERN_HTML, 'ABWERK-FRUEHERE-FASSUNGEN-KERN').includes(hex), 'Kern: in der Menge früherer Fassungen');
  assert.ok(region(LESEN_HTML, 'ABWERK-FRUEHERE-FASSUNGEN-LESEN').includes(hex), 'Lese-App: in der Menge früherer Fassungen');
});

test('[U2-ADR-507·frühere Fassung·Kern] ein Depot mit dem Rechtsraum-Modul in der v956-Form ist ab Werk für die Herkunft', async () => {
  const { V } = ladeKern({ blank: true });
  const d = Object.assign(leer(), { rechtsraumModule: [V956()], abWerkMitschrift: { rechtsraumModule: [V956()] } });
  await V._depotModuleAbWerkPruefen(d, true);
  assert.equal(V._abWerkHerkunft(d.rechtsraumModule[0]), true);
  assert.equal(V._abWerkHerkunft(d.abWerkMitschrift.rechtsraumModule[0]), true);
  assert.equal(V._mitschriftNachInhalt(d.abWerkMitschrift.rechtsraumModule).length, 1);
  const h = V.modulHerkunftBerechnen(d);
  assert.equal(h.geprueft + h.ungeprueft + h.unbekannt, 0, JSON.stringify(h.module));
});

test('[U2-ADR-507·frühere Fassung·Lese-App] dasselbe Depot öffnet in der Lese-App ohne „unbekannt“', async () => {
  const { V } = ladeLesen();
  V.setData(await V._depotUebernehmenGeprueft(Object.assign(leer(), { rechtsraumModule: [V956()], abWerkMitschrift: { rechtsraumModule: [V956()] } })));
  const h = V.modulHerkunftBerechnen(V.getData());
  assert.equal(h.geprueft + h.ungeprueft + h.unbekannt, 0, JSON.stringify(h.module));
});

test('[U2-ADR-507·frühere Fassung·Rot-Beweis] ohne den Abdruck in der Menge früherer Fassungen zählen Kern und Lese-App das Modul', async () => {
  const hex = await abdruck();
  const ordner = fs.mkdtempSync(path.join(os.tmpdir(), 'rechtsraum-v956-'));
  _wegwerf.push(ordner);
  const p = path.join(ordner, 'vivodepot.html');
  fs.writeFileSync(p, ohneAbdruck(KERN_HTML, 'ABWERK-FRUEHERE-FASSUNGEN-KERN', hex));
  const { V: K } = ladeKern({ htmlPfad: p });
  const d = Object.assign(leer(), { rechtsraumModule: [V956()], abWerkMitschrift: { rechtsraumModule: [V956()] } });
  await K._depotModuleAbWerkPruefen(d, true);
  assert.equal(K._abWerkHerkunft(d.abWerkMitschrift.rechtsraumModule[0]), false, 'ROT ERWARTET: ohne Beleg nicht ab Werk');
  const hk = K.modulHerkunftBerechnen(d);
  assert.ok(hk.ungeprueft + hk.unbekannt >= 1, 'der Kern zählt das Modul als Erweiterung: ' + JSON.stringify(hk));
  const { V: L } = ladeLesen({ html: ohneAbdruck(LESEN_HTML, 'ABWERK-FRUEHERE-FASSUNGEN-LESEN', hex) });
  L.setData(await L._depotUebernehmenGeprueft(Object.assign(leer(), { rechtsraumModule: [V956()], abWerkMitschrift: { rechtsraumModule: [V956()] } })));
  const hl = L.modulHerkunftBerechnen(L.getData());
  assert.ok(hl.ungeprueft + hl.unbekannt >= 1, 'die Lese-App zählt das Modul als Erweiterung: ' + JSON.stringify(hl));
});

test('[U2-ADR-507·frühere Fassung·Dokumente] das Fach `dokumente` der Mitschrift zählt in der Lese-App nicht, gleich in welcher Form', async () => {
  const { V } = ladeLesen();
  const fremd = { pvBmj: { steps: [{ id: 'erfunden', label: 'Erfunden' }] }, vollmachtBmj: { steps: [] } };
  V.setData(await V._depotUebernehmenGeprueft(Object.assign(leer(), { abWerkMitschrift: { dokumente: fremd } })));
  const h = V.modulHerkunftBerechnen(V.getData());
  assert.equal(h.geprueft + h.ungeprueft + h.unbekannt, 0, JSON.stringify(h.module));
  assert.ok(!/['"]dokumente['"]/.test(LESEN_HTML.slice(LESEN_HTML.indexOf('const MITSCHRIFT_ARTEN_NACH_INHALT_LESEN'),
    LESEN_HTML.indexOf('function modulHerkunftBerechnen(depot)'))), 'das Fach steht nicht unter den gezählten Arten');
});
