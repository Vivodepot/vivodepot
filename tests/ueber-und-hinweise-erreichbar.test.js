'use strict';
/* ═════════════════════════════════════════════════════════════════════
   Seite „Über und Hinweise“ — Impressum, Fassung, Prüfsumme und Lizenzen sind von jeder Seite in EINEM Schritt erreichbar
   ─────────────────────────────────────────────────────────────────────
   Die feste Fußzeile ist entfallen (1.11.2026); was sie trug, steht auf der Seite „Über und Hinweise“. Diese Probe hält die
   Zugänglichkeit fest, die die Fußzeile von selbst hatte (sie stand immer da): von jeder Ansicht aus führt EIN Schritt — der Eintrag am
   Fuß der Seitenleiste, am Handy das Menü, das dieselbe Seitenleiste ist — zu Impressum, Version, Prüfsummen-Ort und Lizenzen.
   Gemessen wird dreifach: (1) die Seitenleiste trägt den Eintrag in jeder Ansicht, (2) der Eintrag ist verdrahtet und das Ziel trägt die vier
   Angaben, (3) das Menü am Handy ist diese Seitenleiste. Die Rot-Beweise ändern den echten Quelltext (Eintrag weg, Prüfsumme weg, Verdrahtung
   weg, Seite weg) und verlangen, dass die Diskriminante jedes Mal anschlägt; die letzte Mutation entspricht dem Stand vor der Seite.
   ═════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { ladeKern } = require('./load-kern.js');

const PW = 'ueber-hinweise-probe-2026!';
const KERN = fs.readFileSync(process.env.KERN_HTML_PATH || path.join(__dirname, '..', 'vivodepot.html'), 'utf8');

/* Die Diskriminante: Verstöße gegen „in einem Schritt von jeder Ansicht erreichbar“, leer = erfüllt. Sie bekommt einen geladenen Kern. */
function erreichbarkeitVerstoesse(V, document) {
  const v = [];
  if (typeof V.oeffneUeberHinweise !== 'function' || typeof V.renderUeberHinweise !== 'function') return ['die Seite „Über und Hinweise“ gibt es nicht'];
  const ansichten = [
    ['Zuhause', () => V.geheZuZuhause()],
    ['Bereich', () => V.oeffneSektor('health')],
    ['Über und Hinweise', () => V.oeffneUeberHinweise()],
  ];
  for (const [name, hin] of ansichten) {
    hin();
    V.renderSidebar();
    const leiste = document.getElementById('sidebar').innerHTML;
    if (!leiste.includes('data-ueber-hinweise="1"')) v.push(name + ': die Seitenleiste trägt den Eintrag „Über und Hinweise“ nicht');
  }
  V.oeffneUeberHinweise();   // der eine Schritt, den der Eintrag auslöst
  const seite = document.getElementById('content').innerHTML;
  const angaben = [
    ['Impressum', 'herkunft-impressum-link'],
    ['Version', '<span class="ueber-version">' + V.BUILD_VERSION + '.' + String(V.SCHALEN_STAND).replace(/^v/, '') + '</span>'],
    ['Stand', 'class="ueber-stand"'],
    ['Ort der Prüfsumme', 'class="ueber-pruefsumme"'],
    ['Lizenz', V.STRINGS.fussLizenz],
    ['Lizenzhinweise der Codelisten', 'data-fremdquelle="loinc"'],
  ];
  for (const [name, spur] of angaben) if (!seite.includes(spur)) v.push('die Seite trägt nicht: ' + name);
  return v;
}

/* Am Quelltext: der Eintrag ist verdrahtet (Klick öffnet die Seite), und das Menü am Handy ist diese Seitenleiste. */
function verdrahtungVerstoesse(quelle) {
  const v = [];
  if (!/querySelectorAll\('\[data-ueber-hinweise\]'\)[\s\S]{0,120}onclick = oeffneUeberHinweise\b/.test(quelle)) v.push('der Eintrag in renderSidebar öffnet die Seite nicht');
  if (!/id="tb-menue"/.test(quelle) || !/<nav class="sidebar" id="sidebar"/.test(quelle) || !/aria-controls="sidebar"/.test(quelle)) v.push('das Menü am Handy ist nicht die Seitenleiste');
  if (!/menue-auf/.test(quelle)) v.push('das Menü am Handy öffnet die Seitenleiste nicht (menue-auf)');
  return v;
}

async function geladen(opts) {
  const k = ladeKern(opts);
  await k.V.depotAnlegen(PW);
  k.V.betreteApp();
  return k;
}

test('[Über und Hinweise·erreichbar] von jeder Ansicht führt ein Schritt zu Impressum, Version, Prüfsummen-Ort und Lizenzen', async () => {
  const { V, document } = await geladen();
  assert.deepEqual(erreichbarkeitVerstoesse(V, document), []);
});

test('[Über und Hinweise·erreichbar] der Eintrag ist verdrahtet, und das Menü am Handy ist dieselbe Seitenleiste', () => {
  assert.deepEqual(verdrahtungVerstoesse(KERN), []);
});

test('[Über und Hinweise·erreichbar·Rot-Beweis] ohne Eintrag, ohne Prüfsummen-Ort, ohne Verdrahtung und ohne die Seite schlägt die Probe an', async () => {
  const ordner = fs.mkdtempSync(path.join(os.tmpdir(), 'ueber-hinweise-rot-'));
  try {
    const mutiere = (name, alt, neu) => {
      assert.equal(KERN.split(alt).length, 2, 'Vorbedingung: die Stelle steht genau einmal — ' + name);
      const datei = path.join(ordner, name + '.html');
      fs.writeFileSync(datei, KERN.replace(alt, neu));
      return datei;
    };
    // (1) kein Eintrag in der Seitenleiste
    const ohneEintrag = mutiere('eintrag', 'data-ueber-hinweise="1"><span>', 'data-ohne="1"><span>');
    const a = await geladen({ htmlPfad: ohneEintrag, backen: true });
    assert.ok(erreichbarkeitVerstoesse(a.V, a.document).some((x) => /trägt den Eintrag .* nicht/.test(x)), 'Rot-Beweis (1): fehlender Eintrag wird nicht erkannt');
    // (2) die Seite nennt den Ort der Prüfsumme nicht
    const ohneSumme = mutiere('summe', '<span class="ueber-pruefsumme">', '<span class="ueber-ohne">');
    const b = await geladen({ htmlPfad: ohneSumme, backen: true });
    assert.deepEqual(erreichbarkeitVerstoesse(b.V, b.document), ['die Seite trägt nicht: Ort der Prüfsumme']);
    // (3) der Eintrag öffnet nichts
    assert.deepEqual(verdrahtungVerstoesse(KERN.replace(/(querySelectorAll\('\[data-ueber-hinweise\]'\)[\s\S]{0,120}?onclick = )oeffneUeberHinweise\b/, '$1keinSchritt')), ['der Eintrag in renderSidebar öffnet die Seite nicht']);
    // (4) die Seite fehlt ganz (der Stand vor ihr): die typeof-abgesicherten Exporte sind undefined
    const ohneSeite = mutiere('seite', 'function oeffneUeberHinweise() {', 'function oeffneUeberHinweiseEntfallen() {');
    const c = await geladen({ htmlPfad: ohneSeite, backen: true });
    assert.deepEqual(erreichbarkeitVerstoesse(c.V, c.document), ['die Seite „Über und Hinweise“ gibt es nicht']);
  } finally { fs.rmSync(ordner, { recursive: true, force: true }); }
});

/* Proben-Deklaration (U2-ADR-099): die Diskriminante, die der Wächter ruft, und die Liste, die er leer verlangt. */
module.exports = {
  PROBEN: [
    { fuer: '[Über und Hinweise·erreichbar] von jeder Ansicht führt ein Schritt zu Impressum, Version, Prüfsummen-Ort und Lizenzen', diskriminante: erreichbarkeitVerstoesse },
    { fuer: '[Über und Hinweise·erreichbar] der Eintrag ist verdrahtet, und das Menü am Handy ist dieselbe Seitenleiste', diskriminante: verdrahtungVerstoesse },
  ],
};
