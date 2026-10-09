'use strict';
/* umschau-eintragen-klasse.test.js — keine Eintrage-Stelle schweigt in der Umschau (06.10.2026)
   Hält tools/umschau-schreibrecht-pruefen.js: der Kern entspricht der Grundlinie, und eine neue Funktion, die über
   Schreibrecht entscheidet, ohne an die Umschau zu denken, ist rot. Dazu am Modul-Text des Kerns: der Feldwert wird in
   der Umschau eine Schaltfläche zu „Depot anlegen“, und der Delegat führt in umschauEinrichten. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const W = require('../tools/umschau-schreibrecht-pruefen.js');

const REPO = path.join(__dirname, '..');
const KERN = fs.readFileSync(path.join(REPO, 'vivodepot.html'), 'utf8');
const GL = JSON.parse(fs.readFileSync(path.join(REPO, 'tools', 'umschau-schreibrecht-grundlinie.json'), 'utf8'));

test('[Umschau·Klasse] der Kern entspricht der Grundlinie genau', () => {
  assert.deepEqual(W.abgleichen(W.messen(KERN), GL), []);
});

test('[Umschau·Klasse·Rot-Beweis] eine neue Eintrage-Stelle ohne Umschau-Zweig ist rot, mit Zweig nicht', () => {
  const ohne = KERN.replace('</body>', '<script>\nfunction probeEintragKnopf() {\n  return Modus.darfBearbeiten() ? \'<button>x</button>\' : \'\';\n}\n</script>\n</body>');
  assert.ok(W.abgleichen(W.messen(ohne), GL).includes('neu: probeEintragKnopf liest Modus.darfBearbeiten() ohne imVorschau()-Zweig'));
  const mit = KERN.replace('</body>', '<script>\nfunction probeEintragKnopf() {\n  return (Modus.darfBearbeiten() || imVorschau()) ? \'<button>x</button>\' : \'\';\n}\n</script>\n</body>');
  assert.deepEqual(W.abgleichen(W.messen(mit), GL), []);
});

test('[Umschau·Klasse·Rot-Beweis] ein Eintrag, der nicht mehr zutrifft, steht als Luft da; ein Eintrag ohne Grund ist rot', () => {
  const gl = JSON.parse(JSON.stringify(GL)); gl.funktionen.push({ name: 'gibtEsNicht', grund: 'Probe für die Luft-Meldung' });
  assert.ok(W.abgleichen(W.messen(KERN), gl).some((f) => f.startsWith('Luft: gibtEsNicht')));
  const ohneGrund = JSON.parse(JSON.stringify(GL)); ohneGrund.funktionen[0].grund = '';
  assert.ok(W.abgleichen(W.messen(KERN), ohneGrund).some((f) => f.startsWith('ohne Grund:')));
});

test('[Umschau] der Feldwert ist in der Umschau eine Schaltfläche, der Delegat führt zu umschauEinrichten', () => {
  assert.match(KERN, /else if \(imVorschau\(\) && !imVorfuehrung\(\) && feld\.nurAnzeige !== true\) \{[\s\S]{0,900}data-umschau-eintragen="1"/);
  assert.match(KERN, /closest\('\[data-umschau-eintragen\]'\)[\s\S]{0,200}umschauEinrichten\(/);
  assert.match(KERN, /function umschauEinrichten\(sektorId, feldId\) \{[\s\S]{0,200}flowDepotAnlegen\(/);
});

test('[Einstieg] „Depot anlegen“ steht auf der Startseite und liest seinen Text über vorDepotText; „Erst umsehen“ bleibt der Umschau-Eingang', () => {
  assert.match(KERN, /id="w-anlegen">' \+ svgIcon\(ICONS\.shield, 16\) \+ ' ' \+ escapeHTML\(vorDepotText\('welcomeDepotAnlegen'\)\)/);
  assert.match(KERN, /id="w-anfangen">' \+ escapeHTML\(vorDepotText\('welcomeHierAnfangen'\)\)/);
  assert.match(KERN, /verdrahteEintritt\('w-anlegen', \(\) => \{ flowVorschauBetreten\(\); flowDepotAnlegen\(\); \}\)/);
  // Rot-Beweis: ohne den vorDepotText-Aufruf griffe die Probe nicht — der Eintrag in der tote-strings-Liste deckte dann einen toten Schlüssel.
  const ohne = KERN.replace("vorDepotText('welcomeDepotAnlegen')", "'Depot anlegen'");
  assert.doesNotMatch(ohne, /vorDepotText\('welcomeDepotAnlegen'\)/);
});

/* Die Startseite setzt „Depot anlegen“ und „Erst umsehen“ über innerHTML. Beide Texte kommen aus dem Textsatz bzw. einem
   Sprachmodul; sie gehen escaped hinein. Probe: eine Kern-Kopie, deren vorDepotText für beide Kennungen HTML liefert (steht
   für jede Textquelle, auch ein fremdes Sprachmodul). Rot-Beweis: dieselbe Kopie ohne escapeHTML. */
const NUTZLAST = '<img src=x onerror=alert(7)>';
const KERN_TEXT = fs.readFileSync(path.join(__dirname, '..', 'vivodepot.html'), 'utf8');
function kernMitNutzlast(ohneEscape) {
  const kopf = 'function vorDepotText(schluessel) {\n';
  assert.equal(KERN_TEXT.split(kopf).length, 2, 'Voraussetzung: vorDepotText steht genau einmal im Kern');
  let k = KERN_TEXT.replace(kopf, kopf + "  if (schluessel === 'welcomeDepotAnlegen' || schluessel === 'welcomeHierAnfangen') return " + JSON.stringify(NUTZLAST) + ';\n');
  if (ohneEscape) {
    for (const s of ['welcomeDepotAnlegen', 'welcomeHierAnfangen']) {
      const mit = "escapeHTML(vorDepotText('" + s + "'))";
      assert.ok(k.includes(mit), 'Voraussetzung: ' + s + ' geht über escapeHTML');
      k = k.replace(mit, "vorDepotText('" + s + "')");
    }
  }
  return k;
}
function startseite(kernText) {
  const os = require('node:os');
  const { ladeKern } = require('./load-kern.js');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'einstieg-escape-'));
  try {
    const p = path.join(dir, 'kern.html');
    fs.writeFileSync(p, kernText);
    const k = ladeKern({ htmlPfad: p });
    let geschrieben = '';
    const orig = k.document.getElementById.bind(k.document);
    k.document.getElementById = (id) => {
      const el = orig(id);
      if (id !== 'overlay-inhalt' || !el) return el;
      return new Proxy(el, {
        set(t, key, v) { if (key === 'innerHTML') geschrieben = String(v); t[key] = v; return true; },
        get(t, key) { const v = t[key]; return typeof v === 'function' ? v.bind(t) : v; },
      });
    };
    try { k.V.renderWelcome(); } catch { /* Verdrahtung am Stub-DOM ist hier nicht Gegenstand */ }
    return geschrieben;
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
}

test('[Einstieg·Escape] HTML in welcomeDepotAnlegen/welcomeHierAnfangen landet als Text, nicht als Markup', () => {
  const html = startseite(kernMitNutzlast(false));
  assert.ok(html.includes('id="w-anlegen"') && html.includes('id="w-anfangen"'), 'Voraussetzung: die Startseite wurde gerendert');
  assert.equal(html.includes('<img src=x'), false, 'die Nutzlast steht unescaped im Markup');
  assert.equal((html.match(/&lt;img src=x/g) || []).length, 2, 'beide Texte erscheinen escaped');
});

test('[Einstieg·Escape·Rot-Beweis] ohne escapeHTML stünde die Nutzlast roh im Markup', () => {
  assert.equal((startseite(kernMitNutzlast(true)).match(/<img src=x/g) || []).length, 2, 'ohne Escape muss die Probe rot werden');
});
