'use strict';
/* U2-ADR-473 W2 — das Token-Profil eines Branding-v2-Moduls erreicht die Lese-App: nur Farben der Ebene basis, über
   die feste Zuordnung Kern-Token → Lese-App-Token, mit derselben Ablehnung als Ganzes. Die Sperrliste der Lese-App ist eine
   byte-gleiche Kopie der Kern-Fassung (Bedingung der Gegenlesung Krypto 2): die Probe unten vergleicht den Quelltext beider
   Listen Zeichen für Zeichen, mit Rot-Beweis. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { ladeLesen } = require('./load-lesen.js');
const { ladeKern } = require('./load-kern.js');

const LESEN = fs.readFileSync(path.join(__dirname, '..', 'vivodepot-lesen.html'), 'utf8');
const v2 = (tokens, extra) => ({ modulTyp: 'branding', moduleVersion: 2, herkunft: 'x', erscheinung: { tokens: { basis: tokens } }, ...(extra || {}) });
const gesetzt = (document, n) => document.documentElement.style.getPropertyValue(n);

function oeffnen(V, modul) {
  V.setData({ sektoren: {}, menschen: [], brandingModule: modul ? [modul] : [] });
  V._markeErscheinungRaeumen();
  V._markePaletteAnwenden();
  return V._markeErscheinungAnwenden();
}

test('[U2-ADR-473·Lese-App] ein gültiges Profil setzt die zugeordneten Farben dieser App', () => {
  const { V, document } = ladeLesen();
  const r = oeffnen(V, v2({ '--ink': '#111111', '--papier-bereich': '#fafafa', '--radius-sm': '6px' }));
  assert.equal(r.gueltig, true);
  assert.equal(gesetzt(document, '--tinte'), '#111111');
  assert.equal(gesetzt(document, '--flaeche-warm'), '#fafafa');
  assert.equal(gesetzt(document, '--radius-sm'), '', 'Längen erreichen diese App nicht');
});

test('[U2-ADR-473·Lese-App·Rot-Beweis] Text #999999 auf Weiß: das ganze Profil wird nicht angewandt', () => {
  const { V, document } = ladeLesen();
  const r = oeffnen(V, v2({ '--ink': '#999999', '--papier-bereich': '#fafafa' }));
  assert.equal(r.grund, 'erscheinung-kontrast');
  assert.equal(gesetzt(document, '--tinte'), '');
  assert.equal(gesetzt(document, '--flaeche-warm'), '', 'auch der für sich unbedenkliche Wert daneben nicht');
});

test('[U2-ADR-473·Lese-App·Rot-Beweis] ein gesperrter Bedeutungs-Token lehnt das Profil ab, auch in einer anderen Ebene', () => {
  const { V, document } = ladeLesen();
  const r = oeffnen(V, v2({ '--ink': '#111111', '--fehler-flaeche': '#ffffff' }));
  assert.equal(r.grund, 'erscheinung-token-gesperrt');
  assert.equal(gesetzt(document, '--tinte'), '');
  const nachts = { modulTyp: 'branding', moduleVersion: 2, herkunft: 'x', erscheinung: { tokens: { basis: { '--ink': '#111111' }, dunkel: { '--error': '#ff0000' } } } };
  assert.equal(oeffnen(V, nachts).grund, 'erscheinung-token-gesperrt');
});

test('[U2-ADR-473·Lese-App] erscheinung in Fassung 1 und ungültiger Hex werden abgelehnt', () => {
  const { V } = ladeLesen();
  assert.equal(V._lesenErscheinungPruefen({ moduleVersion: 1, erscheinung: { tokens: { basis: { '--ink': '#111111' } } } }).grund, 'erscheinung-erst-ab-fassung-2');
  assert.equal(V._lesenErscheinungPruefen(v2({ '--ink': 'black' })).grund, 'erscheinung-token-verworfen');
});

test('[U2-ADR-473·Lese-App] das Profil gewinnt gegen die Palette und geht beim Schließen mit', () => {
  const { V, document } = ladeLesen();
  oeffnen(V, v2({ '--ink': '#111111' }, { farbePrimaer: '#1f4068' }));
  assert.equal(gesetzt(document, '--tinte'), '#111111', 'nach der Palette gesetzt');
  assert.notEqual(gesetzt(document, '--leer'), '', 'die Palette setzt, was das Profil nicht setzt');
  oeffnen(V, null);
  assert.equal(gesetzt(document, '--tinte'), '');
  // Ein Depot mit Palette ohne Profil: das Räumen nimmt der Palette nichts weg.
  oeffnen(V, v2({ '--ink': '#111111' }, { farbePrimaer: '#1f4068' }));
  oeffnen(V, { modulTyp: 'branding', moduleVersion: 1, herkunft: 'x', farbePrimaer: '#1f4068' });
  assert.notEqual(gesetzt(document, '--tinte'), '#111111');
  assert.notEqual(gesetzt(document, '--tinte'), '', 'die Palette des zweiten Depots steht');
});

/* Byte-Gleichheit der Sperrliste: der Text zwischen `Object.freeze([` und `]);` der beiden Deklarationen. */
const KERN_TEXT = fs.readFileSync(path.join(__dirname, '..', 'vivodepot.html'), 'utf8');
function listenText(text, name) {
  const kopf = 'const ' + name + ' = Object.freeze([';
  const a = text.indexOf(kopf);
  if (a < 0 || text.indexOf(kopf, a + 1) >= 0) return null;   // genau eine Deklaration
  const b = text.indexOf(']);', a);
  return b < 0 ? null : text.slice(a + kopf.length, b);
}
function sperrlisteAbweichung(kern, lesen) {
  const k = listenText(kern, 'ERSCHEINUNG_PROFIL_GESPERRT');
  const l = listenText(lesen, '_LESEN_ERSCHEINUNG_GESPERRT');
  if (k == null || l == null) return 'Deklaration fehlt oder steht doppelt';
  if (Buffer.compare(Buffer.from(k, 'utf8'), Buffer.from(l, 'utf8')) !== 0) return 'Sperrliste weicht ab';
  return null;
}
// Diskriminante: die Abweichung als Verletzungsliste.
function sperrlisteVerstoesse(kern, lesen) { const a = sperrlisteAbweichung(kern, lesen); return a == null ? [] : [a]; }
test('[U2-ADR-473·Lese-App·Sperrliste] die Sperrliste der Lese-App ist byte-gleich zur Kern-Fassung', () => {
  assert.deepEqual(sperrlisteVerstoesse(KERN_TEXT, LESEN), []);
  // Und sie ist dieselbe Liste, die beide Apps zur Laufzeit lesen (Positivkontrolle gegen eine tote Kopie).
  const { V } = ladeLesen();
  const K = ladeKern({ zusatzBindungen: ['ERSCHEINUNG_PROFIL_GESPERRT'] }).V.__zusatz;
  assert.deepEqual([...V._LESEN_ERSCHEINUNG_GESPERRT], [...K.ERSCHEINUNG_PROFIL_GESPERRT]);
  assert.ok(K.ERSCHEINUNG_PROFIL_GESPERRT.length >= 20, 'Vorbedingung: die Liste ist nicht leer gelaufen');
});
test('[U2-ADR-473·Lese-App·Sperrliste·Rot-Beweis] ein fehlender, ein umgestellter oder ein anders geschriebener Eintrag macht die Probe rot', () => {
  const lesenOhne = LESEN.replace("'--ampel-rot-hc',\n]);", "\n]);");
  assert.notEqual(lesenOhne, LESEN, 'Vorbedingung: der letzte Eintrag steht in der Lese-App');
  assert.equal(sperrlisteAbweichung(KERN_TEXT, lesenOhne), 'Sperrliste weicht ab', 'fehlender Eintrag');
  const umgestellt = LESEN.replace("'--error', '--warning',", "'--warning', '--error',");
  assert.equal(sperrlisteAbweichung(KERN_TEXT, umgestellt), 'Sperrliste weicht ab', 'gleiche Menge, andere Folge');
  const leerzeichen = LESEN.replace("'--error', '--warning',", "'--error',  '--warning',");
  assert.equal(sperrlisteAbweichung(KERN_TEXT, leerzeichen), 'Sperrliste weicht ab', 'gleicher Wert, andere Bytes');
  const zweiteKopie = LESEN + '\nconst _LESEN_ERSCHEINUNG_GESPERRT = Object.freeze([]);';
  assert.equal(sperrlisteAbweichung(KERN_TEXT, zweiteKopie), 'Deklaration fehlt oder steht doppelt');
});

// Diskriminante: die Zuordnungen, die in :root nicht ausgewiesen sind, einen anderen Ab-Werk-Wert tragen oder kein Kern-Vokabular sind.
function zuordnungVerstoesse(V, K) {
  const root = LESEN.slice(LESEN.indexOf(':root {'), LESEN.indexOf('}', LESEN.indexOf(':root {')));
  const v = [];
  for (const [kernName, leseName] of Object.entries(V._LESEN_ERSCHEINUNG_ZUORDNUNG)) {
    const m = new RegExp(leseName.replace(/-/g, '\\-') + ':\\s*(#[0-9a-fA-F]{6});\\s*/\\* Kern ' + kernName.replace(/-/g, '\\-') + ' \\*/').exec(root);
    if (!m) { v.push(leseName + ' ist in :root nicht als Gegenstück von ' + kernName + ' ausgewiesen'); continue; }
    if (V._LESEN_ERSCHEINUNG_AB_WERK[leseName].toLowerCase() !== m[1].toLowerCase()) v.push(leseName + ': Ab-Werk-Wert weicht von :root ab');
    if (!K.ERSCHEINUNGSBILD_REGELN.token.includes(kernName)) v.push(kernName + ' ist kein Vokabular des Kerns');
  }
  return v;
}
test('[U2-ADR-473·Lese-App·Wächter] Zuordnung und Ab-Werk-Werte stimmen mit Kern und :root überein', () => {
  const { V } = ladeLesen();
  const { V: KV } = ladeKern({ zusatzBindungen: ['ERSCHEINUNGSBILD_REGELN'] });
  assert.deepEqual(zuordnungVerstoesse(V, KV.__zusatz), []);
});

/* Parität (Auflage der Gegenlesung 05.10.2026): was die Lese-App selbst beurteilen kann — Fassung, Form, Bedeutungs-Tokens in jeder
   Ebene —, lehnen Kern und Lese-App gleich ab. Kontrast rechnet jede App auf ihren eigenen Werten; dort ist der Kern strenger. */
test('[U2-ADR-473·Lese-App·Parität] Kern und Lese-App lehnen dasselbe ab', () => {
  const { V } = ladeLesen();
  const K = ladeKern().V;
  const modul = (tokens, extra) => ({ modulTyp: 'branding', moduleVersion: 2, herkunft: 'x', erscheinung: { tokens }, ...(extra || {}) });
  const faelle = [
    ['gültig', modul({ basis: { '--ink': '#111111' } }), true],
    ['Bedeutungs-Token hell', modul({ basis: { '--error': '#123456' } }), false],
    ['Bedeutungs-Token nachts', modul({ basis: { '--ink': '#111111' }, dunkel: { '--notfall-flaeche': '#123456' } }), false],
    ['Fassung 1', { ...modul({ basis: { '--ink': '#111111' } }), moduleVersion: 1 }, false],
    ['Ebene keine Liste', modul({ basis: [] }), false],
  ];
  for (const [name, m, erwartet] of faelle) {
    assert.equal(K.brandingModulPruefen(m).gueltig, erwartet, 'Kern: ' + name);
    assert.equal(V._lesenErscheinungPruefen(m).gueltig, erwartet, 'Lese-App: ' + name);
  }
});

/* ── Proben-Deklaration (U2-ADR-099): je Wächter die Diskriminante, die er ruft und deren Liste er leer verlangt.
   Die übrigen Titel und die Parität sind Konstruktions-Form (feste Module gegen erwartete Urteile), keine Verletzungsliste. */
module.exports = {
  PROBEN: [
    { fuer: '[U2-ADR-473·Lese-App·Sperrliste] die Sperrliste der Lese-App ist byte-gleich zur Kern-Fassung', diskriminante: sperrlisteVerstoesse },
    { fuer: '[U2-ADR-473·Lese-App·Wächter] Zuordnung und Ab-Werk-Werte stimmen mit Kern und :root überein', diskriminante: zuordnungVerstoesse },
  ],
};
