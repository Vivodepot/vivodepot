'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Notfall-Sicht nach Zielbild 06 — jeder Wert kommt maskiert heraus (07.11.2026).
   ────────────────────────────────────────────────────────────────────────
   Die Sicht (renderNotfall, notfallPersonHTML) setzt ihre Teile aus Bausteinen zusammen: Nummer, Rolle und Adresse
   unter dem Namen, das Geburtsdatum im Kopf, den Verweis zur Eingabe im Gruppenkopf, die Gruppen im Raster und die
   Zeilen jeder Gruppe. Die Ratsche der Textknoten (tools/textknoten-verkettung-pruefen.js) zählt diese
   Zusammensetzungen nur; ob die Werte darin maskiert sind, zeigt diese Probe.

   Weg: ein Depot, in dem JEDER Wert, der in die Sicht fließt, eine eigene Nutzlast trägt (<script>, ", & und <):
   Name, Geburtsdatum, eine Person mit Nummer und Adresse als Notfallkontakt und als Bevollmächtigte, eine Allergie
   und ein Ablageort. Erwartet: keine Nutzlast steht roh im Inhalt, jede steht maskiert darin.
   Rot-Beweis: derselbe Durchlauf gegen eine Kern-Kopie, in der escapeHTML, escapeAttr und escapeTextknoten nichts
   maskieren, fällt.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { ladeKern } = require('./load-kern.js');

const HTML_PATH = path.join(__dirname, '..', 'vivodepot.html');
const roh = (n) => '<script>N' + n + '</script>"&<';
const maskiert = (n) => '&lt;script&gt;N' + n + '&lt;/script&gt;&quot;&amp;&lt;';

// Die Werte, die über die zusammengesetzten Stellen in die Sicht fließen, je mit eigener Kennung. Rolle und Feldbeschriftungen
// kommen aus dem Textsatz, nicht aus dem Depot; sie tragen darum keine Nutzlast.
const WERTE = {
  geburt: 1,         // Geburtsdatum im Kopf
  kontaktName: 2,    // Name der Person (Gruppe „anrufen“ und Zeile der Vollmacht)
  kontaktTel: 3,     // Nummer der Person (Text des Links)
  kontaktAdresse: 4, // Adresse unter dem Namen
  allergie: 6,       // Wert einer Zeile der Gruppe Gesundheit
  ablage: 8,         // Wert einer Zeile der Gruppe Vorsorge
  name: 9,           // Name im Titel
};

async function sichtMitNutzlast(htmlPfad) {
  const { V, document } = await ladeKern(htmlPfad ? { htmlPfad, backen: true } : undefined);
  await V.depotAnlegen('pw-maskierung-probe');
  V.akteurSelbstErklaeren('Tester');
  V.betreteApp();
  const id = V.personHinzufuegen({ name: 'Anna ' + roh(WERTE.kontaktName), tel: '0151 ' + roh(WERTE.kontaktTel), adresse: 'Weg ' + roh(WERTE.kontaktAdresse) });
  assert.equal(typeof id, 'string', 'Vorbedingung: Person angelegt');
  V.sektorFeldSetzen('identity', 'givenName', 'Maria ' + roh(WERTE.name));
  V.sektorFeldSetzen('identity', 'birthDate', roh(WERTE.geburt));
  V.sektorFeldSetzen('health', 'emergencyContacts', [{ ref: id }]);
  V.sektorFeldSetzen('health', 'allergiesMedicationFoodOther', [{ text: roh(WERTE.allergie) }]);
  V.listenEintragHinzufuegen('advanceCare', 'provisionInstruments',
    { instrument: 'enduring-power-of-attorney', authorizedPersons: [{ ref: id }], storageLocation: roh(WERTE.ablage) });
  V.geheZuNotfall();
  V.renderNotfall();
  return document.getElementById('content').innerHTML;
}

function befund(html) {
  return {
    roh: Object.entries(WERTE).filter(([, n]) => html.includes('N' + n + '</script>')).map(([k]) => k),
    fehlt: Object.entries(WERTE).filter(([, n]) => !html.includes(maskiert(n))).map(([k]) => k),
  };
}

test('[Notfall·Maskierung] jeder Wert der Notfall-Sicht kommt maskiert heraus, keiner roh', async () => {
  const html = await sichtMitNutzlast();
  for (const teil of ['notfall-person', 'notfall-wer-rolle', 'notfall-einleitung', 'data-notfall-gruppe="anrufen"', 'data-notfall-gruppe="akut"', 'data-notfall-gruppe="verfuegungen"', 'notfall-raster']) {
    assert.ok(html.includes(teil), 'Positivkontrolle: ' + teil + ' gezeichnet');
  }
  const b = befund(html);
  assert.deepEqual(b.roh, [], 'roh in der Notfall-Sicht: ' + b.roh.join(', '));
  assert.deepEqual(b.fehlt, [], 'nicht maskiert angekommen (ungeprüft): ' + b.fehlt.join(', '));
  assert.ok(!/<script/i.test(html), 'kein <script> im Inhalt');
});

test('[Notfall·Maskierung·Rot-Beweis] ohne Maskierung steht jede Nutzlast roh in der Sicht', async () => {
  const src = fs.readFileSync(HTML_PATH, 'utf8');
  let n = 0;
  const neu = src.replace(/^function (escapeHTML|escapeAttr|escapeTextknoten)\(s\) \{/gm, (z) => { n++; return z + ' return String(s == null ? \'\' : s);'; });
  assert.equal(n, 3, 'Vorbedingung Rot-Beweis: die drei Maskierfunktionen gefunden');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'vd-notfall-maskierung-'));
  try {
    const kopie = path.join(dir, 'vivodepot.html');
    fs.writeFileSync(kopie, neu);
    const b = befund(await sichtMitNutzlast(kopie));
    assert.deepEqual(b.roh.sort(), Object.keys(WERTE).sort(), 'jede Nutzlast muss ohne Maskierung roh ankommen — sonst prüft die Probe oben nichts');
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
