'use strict';
/* Anlass als Aufgabenliste (U-5 Schritt 1, 16.11.2026, Dummy des Anlasses).
   · Über dem Anlass die Brotkrumen „Anlässe ›“ (D53).
   · Je Block eine Aufgabe mit Haken: „vorhanden“, sobald ein Eintrag des Blocks einen Wert hat, sonst „fehlt“ mit „Eintragen“ (D55, D56).
     Liegt der fehlende Eintrag in einem Bereich, springt „Eintragen“ dorthin (data-klick-sektor/-feld), sonst zum Block auf diesem Blatt.
   · Rechts der Kasten „Herausgeben“ mit An, Inhalt, Format und dem Knopf (D57, D58). Bei „An“ steht die Stelle der letzten Herausgabe
     dieses Anlasses als Vorschlag; bestätigt wird sie im Fenster. Bei Fehlendem steht der Satz zum Nachreichen (D59).
   · Im Druck keine Aufgabenliste; die Feldgruppen stehen unverändert darunter.
   Rot-Beweis: am Stand vor U-5 fehlen Brotkrumen, Aufgabenliste und Kasten. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

async function depot() {
  const { V, document } = ladeKern();
  await V.depotAnlegen('pw');
  V.akteurSelbstErklaeren('Tester');
  const html = () => String(document.getElementById('content').innerHTML);
  return { V, document, html };
}
const aufgaben = (h) => [...h.matchAll(/<div class="aufgabe" data-aufgabe="(vorhanden|fehlt)">[\s\S]*?<span class="aufgabe-titel">([^<]*)<\/span>/g)].map((m) => m[2] + ':' + m[1]);

test('[U-5·Aufgaben] je Block eine Aufgabe, ohne Daten „fehlt“ mit „Eintragen“, Brotkrumen und Kasten', async () => {
  const { V, html } = await depot();
  V.renderSituation('geburt');
  const h = html();
  assert.ok(h.includes('data-anlass-uebersicht="1"'), 'Brotkrumen „Anlässe ›“');
  const titel = V.SITUATION_BY_ID.geburt.bloecke.map((b) => b.titel);
  assert.deepEqual(aufgaben(h), titel.map((t) => t + ':fehlt'));
  assert.match(h, /data-klick-sektor="identity" data-klick-feld="givenName">Eintragen</, 'ein fehlender Bereichseintrag springt in seinen Bereich');
  assert.match(h, /data-aufgabe-block="1">Eintragen</, 'ein fehlender Eintrag des Blatts springt zum Block');
  assert.ok(h.includes('data-anlass-block="1"'), 'der Block trägt sein Sprungziel');
  const kasten = /<aside class="anlass-herausgeben">([\s\S]*?)<\/aside>/.exec(h);
  assert.ok(kasten, 'Kasten „Herausgeben“');
  assert.ok(kasten[1].includes('id="b-anlass-herausgeben"') && kasten[1].includes('Zusammenstellen und herausgeben'));
  // B2 (17.11.2026): ohne frühere Herausgabe steht keine Zeile „An“ und kein Anleitungssatz.
  assert.ok(!kasten[1].includes('<dt>An</dt>') && !kasten[1].includes('Wählen Sie beim Herausgeben'), 'ohne frühere Herausgabe keine Zeile „An“');
  assert.ok(kasten[1].includes('0 von 2 vorhanden'));
  assert.ok(kasten[1].includes('Es fehlt noch etwas. Sie können jetzt schon herausgeben und später nachreichen.'));
  assert.equal((h.match(/id="b-anlass-herausgeben"/g) || []).length, 1, 'der Knopf steht nur einmal, nicht mehr zusätzlich unten');
});

test('[U-5·Aufgaben] ein Eintrag macht seine Aufgabe „vorhanden“; bei einer Lücke nennt der Satz sie', async () => {
  const { V, html } = await depot();
  V.sektorFeldSetzen('identity', 'givenName', 'Lena');
  V.renderSituation('geburt');
  const h = html();
  const titel = V.SITUATION_BY_ID.geburt.bloecke.map((b) => b.titel);
  assert.deepEqual(aufgaben(h), [titel[0] + ':vorhanden', titel[1] + ':fehlt']);
  assert.ok(h.includes('1 von 2 vorhanden'));
  assert.ok(h.includes('„' + titel[1] + '“ fehlt noch.'), 'eine Lücke wird beim Namen genannt');
});

test('[U-5·An] die Stelle der letzten Herausgabe dieses Anlasses steht unter „An“ (B2: nur die Stelle)', async () => {
  const { V, html } = await depot();
  const titel = V.SITUATION_BY_ID.geburt.titel;
  V.uebergabeProtokollEintragen({ empfaenger: 'Standesamt Beispielstadt', zweck: 'Anzeige', umfang: titel });
  V.uebergabeProtokollEintragen({ empfaenger: 'Andere Stelle', zweck: 'x', umfang: 'Anderer Anlass' });
  V.renderSituation('geburt');
  assert.ok(html().includes('<dt>' + V.STRINGS.anlassAnLabel + '</dt><dd>Standesamt Beispielstadt</dd>'));
  assert.ok(!html().includes('Vorschlag:') && !html().includes('(zuletzt)'), 'B2: kein Zusatz zur Stelle');
  assert.equal(V.anlassLetzteStelle(V.SITUATION_BY_ID.geburt), 'Standesamt Beispielstadt');
});

test('[U-5·Aufgaben] im Druck keine Aufgabenliste, die Blöcke bleiben', async () => {
  const { V, html } = await depot();
  V.renderSituation('geburt', { druck: true });
  const h = html();
  assert.ok(!h.includes('anlass-aufgaben') && !h.includes('anlass-herausgeben') && !h.includes('data-anlass-uebersicht'));
  assert.ok(h.includes('Rund um die Geburt'));
});

/* Für dieselben Situationen und Depots wie die zeichengenaue Probe des Vor-Umzugs (die dort Aufgabenliste und Kasten
   ausnimmt): je Situation Inhalt von Aufgabenliste und Kasten. Keine Situation fällt aus der Prüfung. */
const fs = require('node:fs');
const path = require('node:path');
const { depotErgebnis } = require('../tools/lib/vor-umzug-achse-a1-situationen');
const entMaskiert = (t) => String(t == null ? '' : t).replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
function aufgabenPruefen(sitId, h, bloeckeTitel, darf) {
  const raster = /<div class="anlass-raster">(?:<div class="anlass-aufgaben"><h3 class="sektion-titel anlass-teil-titel">[^<]*<\/h3>((?:<div class="aufgabe" data-aufgabe="(?:vorhanden|fehlt)">(?:(?!<\/div>)[\s\S])*<\/div>)+)<\/div>)?(?:<aside class="anlass-herausgeben">((?:(?!<\/aside>)[\s\S])*)<\/aside>)?<\/div>/.exec(h);
  const kasten = raster && raster[2] !== undefined ? raster[2] : null;
  const zeilen = [...h.matchAll(/<div class="aufgabe" data-aufgabe="(vorhanden|fehlt)">([\s\S]*?)<\/div>/g)]
    .map((m) => ({ stand: m[1], titel: entMaskiert((/<span class="aufgabe-titel">([^<]*)<\/span>/.exec(m[2]) || [])[1]), knopf: /Eintragen</.test(m[2]) }));
  const bloeckeImBlatt = (h.match(/ data-anlass-block="\d+"/g) || []).length;
  if (!zeilen.length) {
    /* Ohne zählbare Aufgabe: keine Liste; der Kasten steht genau dann, wenn bearbeitet werden darf (darf). */
    assert.equal(!!(raster && kasten != null), darf, sitId + ': ohne Aufgabe steht der Kasten genau dort, wo bearbeitet werden darf');
    return 'ohne';
  }
  assert.ok(raster, sitId + ': Aufgabenliste fehlt');
  assert.ok(zeilen.length <= bloeckeImBlatt, sitId + ': höchstens eine Aufgabe je Block');
  for (const z of zeilen) {
    assert.ok(bloeckeTitel.includes(z.titel), sitId + ': „' + z.titel + '“ ist kein Block des Anlasses');
    assert.equal(z.knopf, kasten != null && z.stand === 'fehlt', sitId + ': „Eintragen“ steht genau bei fehlenden Aufgaben, und nur wer bearbeiten darf');
  }
  if (kasten == null) return 'ohne-kasten';
  const da = zeilen.filter((z) => z.stand === 'vorhanden').length;
  assert.ok(kasten.includes(da + ' von ' + zeilen.length + ' vorhanden'), sitId + ': Inhalt im Kasten zählt die Aufgaben');
  assert.equal((kasten.match(/id="b-anlass-herausgeben"/g) || []).length, 1, sitId + ': ein Knopf im Kasten');
  const fehlt = zeilen.filter((z) => z.stand === 'fehlt');
  const satz = /<p class="einst-hint">([^<]*)<\/p>/.exec(kasten);
  assert.equal(!!satz, fehlt.length > 0, sitId + ': der Satz zum Nachreichen steht genau bei Fehlendem');
  if (fehlt.length === 1) assert.ok(entMaskiert(satz[1]).includes(fehlt[0].titel), sitId + ': eine Lücke wird beim Namen genannt');
  return 'mit';
}
/* Die Titel der Blöcke, wie renderSituation sie gezeichnet hat (auch Blöcke, die erst mit den Daten des Depots erscheinen):
   je Sprungziel `data-anlass-block` der erste Titel danach. Dazu die Titel der Definition. */
const blockTitel = (V, si, h) => [...String(h || '').matchAll(/ data-anlass-block="\d+"[^>]*>(?:<summary>)?<(?:span class="feldgruppen-karte-titel"|h3 class="sektion-titel")>([^<]*)</g)]
  .map((m) => entMaskiert(m[1])).concat((si.bloecke || []).map((b) => b.titel));
for (const [depotName, datei] of [['marlene-hoffmann', 'vor-umzug-depot-marlene-hoffmann.json'], ['instrumente-breit', 'vor-umzug-depot-instrumente-breit-anton-reindl.json']]) {
  test('[U-5·Aufgaben·' + depotName + '] jede Situation: Aufgabenliste und Kasten stimmen mit den Blöcken überein', () => {
    const d = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', datei), 'utf8')).depot;
    const { V } = ladeKern();
    const ergebnis = depotErgebnis(V, d.sektoren, d.menschen, undefined, d.schemaVersion);
    assert.deepEqual(Object.keys(ergebnis).sort(), V.SITUATIONEN.map((s) => s.id).sort(), 'keine Situation fällt aus der Prüfung');
    const art = {};
    /* Der Ladeweg der zeichengenauen Probe zeichnet ohne Bearbeiten (kein Kasten); beides prüft der Fall mit Bearbeiten unten. */
    for (const si of V.SITUATIONEN) art[si.id] = aufgabenPruefen(si.id, ergebnis[si.id], blockTitel(V, si, ergebnis[si.id]), false);
    assert.ok(Object.values(art).filter((x) => x !== 'ohne').length > 0, 'mindestens eine Situation trägt die Aufgabenliste');
  });
}
test('[U-5·Aufgaben·Rot-Beweis] falscher Stand, fehlender Kasten oder fremder Titel werden gefunden', () => {
  const gut = '<details data-anlass-block="0"></details><div class="anlass-raster"><div class="anlass-aufgaben"><h3 class="sektion-titel anlass-teil-titel">Dazu gehört</h3><div class="aufgabe" data-aufgabe="fehlt"><span class="aufgabe-titel">Kind</span><button>Eintragen</button></div></div>' +
    '<aside class="anlass-herausgeben"><dd>0 von 1 vorhanden</dd><button id="b-anlass-herausgeben"></button><p class="einst-hint">„Kind“ fehlt noch.</p></aside></div>';
  assert.equal(aufgabenPruefen('x', gut, ['Kind'], true), 'mit');
  assert.throws(() => aufgabenPruefen('x', gut.replace('0 von 1', '1 von 1'), ['Kind'], true));
  assert.throws(() => aufgabenPruefen('x', gut.replace('<div class="anlass-raster">', '<div>'), ['Kind'], true));
  assert.throws(() => aufgabenPruefen('x', gut, ['Anderes'], true));
  assert.throws(() => aufgabenPruefen('x', gut.replace('<button>Eintragen</button>', ''), ['Kind'], true));
  assert.throws(() => aufgabenPruefen('x', gut.replace(/<p class="einst-hint">[^<]*<\/p>/, ''), ['Kind'], true));
});

test('[U-5·Aufgaben·Bearbeiten] jede Situation im eigenen Depot: Liste und Kasten, der Knopf an jedem Blatt', async () => {
  const { V, html } = await depot();
  V.sektorFeldSetzen('identity', 'givenName', 'Lena');
  const geprueft = [];
  for (const si of V.SITUATIONEN) {
    V.renderSituation(si.id);
    const h = html();
    const blatt = !si._lageId;   // ein Lage-Blatt ist ein Eingabe-Blatt ohne Herausgeben, wie vor U-5
    aufgabenPruefen(si.id, h, blockTitel(V, si, h), blatt);
    assert.equal((h.match(/id="b-anlass-herausgeben"/g) || []).length, blatt ? 1 : 0, si.id + ': der Knopf steht an jedem Anlass-Blatt genau einmal');
    geprueft.push(si.id);
  }
  assert.deepEqual(geprueft, V.SITUATIONEN.map((s) => s.id), 'keine Situation fällt aus der Prüfung');
});
test('[U-5·Aufgaben·Rot-Beweis] ohne Aufgabe: fehlender Kasten trotz Bearbeiten ist rot', () => {
  assert.equal(aufgabenPruefen('x', '<div class="anlass-raster"><aside class="anlass-herausgeben"><button id="b-anlass-herausgeben"></button></aside></div>', [], true), 'ohne');
  assert.throws(() => aufgabenPruefen('x', '<p>nichts</p>', [], true));
  assert.throws(() => aufgabenPruefen('x', '<div class="anlass-raster"><aside class="anlass-herausgeben"></aside></div>', [], false));
});
