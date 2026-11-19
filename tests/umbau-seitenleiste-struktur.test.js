'use strict';
/* Umbau nach dem Desktop-Dummy, Plan U-3 Schritt 2: der Aufbau der Seitenleiste.
   Oben Übersicht, „Herausgegeben“ und die Sprachwahl (nur bei mindestens zwei vollen Sprachen), dann die Bereiche (mit der Zahl der Angaben),
   die Anlässe, „Mehr“, unten sichtbar Notfall, Hilfe, „Einstellungen“, „Depot verlassen“ (D13) und „Über und Hinweise“. Jede Kennung steht genau einmal; keine fällt weg.
   Rot-Beweis: wird ein Eintrag aus renderSidebar genommen, meldet die Probe genau seine Kennung. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { ladeKern } = require('./load-kern.js');
const KERN = path.join(__dirname, '..', 'vivodepot.html');

const KENNUNGEN = ['data-uebersicht', 'data-uebergabe-protokoll', 'data-sektor', 'data-anlass-auswahl', 'data-einlesen-schmal',
  'data-weitergeben-schmal', 'data-mappe', 'data-prueftermine', 'data-verwaltete-depots', 'data-hilfe', 'data-einstellungen', 'data-ueber-hinweise', 'data-verlassen'];

async function leiste() {
  const k = ladeKern();
  await k.V.depotAnlegen('pw');
  k.V.akteurSelbstErklaeren('Tester');
  k.V.betreteApp();
  k.V.renderSidebar();
  return k.document.getElementById('sidebar').innerHTML;
}
const pos = (html, anker) => html.indexOf(anker);

test('[Umbau U-3 Seitenleiste] jede Kennung steht, und in der Reihenfolge des Dummys', async () => {
  const html = await leiste();
  for (const k of KENNUNGEN) assert.ok(pos(html, k + '=') >= 0, 'fehlt in der Seitenleiste: ' + k);
  const r = (a) => pos(html, a);
  assert.ok(r('data-uebersicht=') < r('data-uebergabe-protokoll='), 'Übersicht vor Herausgegeben');
  assert.ok(r('data-uebergabe-protokoll=') < r('data-sektor='), 'Herausgegeben vor den Bereichen');
  assert.ok(r('data-sektor=') < r('data-anlass-auswahl='), 'Bereiche vor den Anlässen');
  assert.ok(r('data-anlass-auswahl=') < r('data-mappe='), 'Anlässe vor „Mehr“');
  assert.ok(r('data-mappe=') < r('data-hilfe='), '„Mehr“ (Mappe) vor Hilfe');
  assert.ok(r('data-hilfe=') < r('data-einstellungen='), 'Hilfe vor „Einstellungen“');
  assert.ok(r('data-einstellungen=') < r('data-verlassen='), '„Einstellungen“ vor „Depot verlassen“');
});

/* D13 (17.11.2026): Hilfe, der Knopf „Einstellungen“ (wie im Desktop-Dummy) und „Depot verlassen“ stehen sichtbar unten neben Notfall,
   in keiner Gruppe und unter keinem Aufklapper; „Über und Hinweise“ bleibt am Fuß. */
function untenLuecken(html) {
  const out = [];
  const a = html.indexOf('<div class="nav-unten">');
  if (a < 0) return ['der Fußbereich fehlt'];
  const unten = html.slice(a, html.indexOf('</div>', a));
  for (const k of ['data-hilfe="1"', 'data-einstellungen="1"', 'data-verlassen="1"']) if (!unten.includes(k)) out.push('nicht sichtbar unten: ' + k);
  if (html.includes('nav-gruppe-einstellungen')) out.push('Aufklapper „Einstellungen“ steht noch');
  const re = /<details[\s\S]*?<\/details>/g; let m;
  while ((m = re.exec(html))) for (const k of ['data-hilfe=', 'data-verlassen=', 'data-einstellungen=']) if (m[0].includes(k)) out.push('unter einem Aufklapper: ' + k);
  return out;
}
test('[Umbau U-3 Seitenleiste] Hilfe, „Einstellungen“ und „Depot verlassen“ stehen sichtbar unten, „Über und Hinweise“ bleibt am Fuß', async () => {
  const html = await leiste();
  assert.deepEqual(untenLuecken(html), []);
  assert.ok(html.indexOf('data-ueber-hinweise=') > html.indexOf('data-verlassen='), '„Über und Hinweise“ steht danach');
});

test('[Umbau U-3 Seitenleiste] Rot-Beweis: Hilfe in einem Aufklapper fällt auf', async () => {
  const html = await leiste();
  const hilfe = html.match(/<button class="nav-item" data-hilfe="1">[\s\S]*?<\/button>/)[0];
  const versteckt = html.replace(hilfe, '').replace('</details>', hilfe + '</details>');
  assert.deepEqual(untenLuecken(versteckt), ['nicht sichtbar unten: data-hilfe="1"', 'unter einem Aufklapper: data-hilfe=']);
});

/* D13: „Einstellungen“ ist ohne das Zahnrad #tb-einstellungen erreichbar — der Knopf der Seitenleiste (am Handy das Menü) öffnet flowEinstellungen. */
const EINST_BINDUNG = "sb.querySelectorAll('[data-einstellungen]').forEach((b) => { b.onclick = () => { schliesseMenue(); flowEinstellungen(); }; });";
test('[Umbau U-3 Seitenleiste] Einstellungen ohne #tb-einstellungen erreichbar', async () => {
  const html = await leiste();
  assert.ok(html.includes('<button class="nav-item" data-einstellungen="1">'), 'Knopf in der Seitenleiste');
  assert.ok(fs.readFileSync(KERN, 'utf8').includes(EINST_BINDUNG), 'der Knopf öffnet flowEinstellungen');
});
test('[Umbau U-3 Seitenleiste] Rot-Beweis: ein Knopf ohne Bindung fällt auf', () => {
  const src = fs.readFileSync(KERN, 'utf8').replace(EINST_BINDUNG, '');
  assert.ok(!src.includes(EINST_BINDUNG));
});

test('[Umbau U-3 Kopfleiste] Suche, Einlesen und Herausgeben stehen oben in der Kopfleiste, in „Mehr“ nur die schmalen Einträge fürs Handy', async () => {
  const k = ladeKern();
  await k.V.depotAnlegen('pw');
  k.V.akteurSelbstErklaeren('Tester');
  k.V.betreteApp();
  k.V.renderSidebar();
  const aktionen = k.document.getElementById('tb-aktionen').innerHTML;
  assert.ok(aktionen.includes('data-einlesen-zentral="1"') && aktionen.includes('data-weitergeben-zentral="1"'), 'beide Handlungen oben');
  assert.ok(aktionen.indexOf('data-einlesen-zentral=') < aktionen.indexOf('data-weitergeben-zentral='), 'Einlesen vor Herausgeben');
  const leiste = k.document.getElementById('sidebar').innerHTML;
  assert.ok(!leiste.includes('data-einlesen-zentral=') && !leiste.includes('data-weitergeben-zentral='), 'nicht noch einmal mit derselben Kennung in der Seitenleiste');
  assert.ok(leiste.includes('data-einlesen-schmal=') && leiste.includes('data-weitergeben-schmal='), 'schmale Einträge in „Mehr“');
  assert.ok(leiste.includes('id="suche-eingabe"') || k.document.getElementById('tb-suche-platz').innerHTML.includes('id="suche-eingabe"'), 'die Suche steht (oben oder auf dem Handy in der Seitenleiste)');
});
