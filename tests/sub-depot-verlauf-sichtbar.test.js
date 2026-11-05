'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Der Verlauf eines Sub-Depots ist sichtbar (25.10.2026)
   ────────────────────────────────────────────────────────────────────────
   `delegationsGeschichte` hält am Anker jeden Vorgang eines Sub-Depots fest (Einhängen, erstes Ansehen, verschlüsselte Datei,
   Kind-Datei, Abgeben, Beiseitelegen, Wiederaufnahme, Widerspruch), anhängend und nie gelöscht. Angezeigt wurde er nirgends.
   Gehalten, an den echt konfektionierten Produkten privat-de und pro-de:
     [Sub·Verlauf] jede Karte unter „Sub-Depots“ trägt den Verlauf, die neuesten Einträge zuerst, mit Datum, Empfänger und
       handelnder Person;
     [Sub·Verlauf·archiviert] auch die Karte eines beiseitegelegten Sub-Depots trägt ihn;
     [Sub·Verlauf·unbekannt] ein unbekannter Vorgang zeigt einen neutralen Text, nie seine interne Kennung;
     [Herausgegeben·aus Sub-Depots] „Herausgegeben“ zeigt nur die zwei Vorgänge, bei denen etwas hinausging, nur lesend, und
       schreibt nichts in data.uebergabeProtokoll (dessen Einträge löscht die Person, den Verlauf nicht).
   Je ein Rot-Beweis: ohne den Block fehlt der Verlauf an der Karte bzw. der Abschnitt in „Herausgegeben“. */
const { after } = require('node:test');
const test = require('./helfer/nur-privat.js').testMitPrivat(__filename);   // nur-privat: s. tests/helfer/nur-privat.js
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { konfektionieren } = require('../tools/produkt-konfektionieren.js');
const { PRODUKTE, modulDateienFuer } = require('../tools/lib/vier-produkte.js');

const LOAD_KERN = path.join(__dirname, 'load-kern.js');
const ANKER_PW = 'verlauf-sichtbar-anker-731';
const SUB_PW = 'verlauf-sichtbar-sub-482';
const PRODUKTE_GEPRUEFT = ['privat-de', 'pro-de'];

const zielOrdner = [];
after(() => { for (const z of zielOrdner) fs.rmSync(z, { recursive: true, force: true }); });
const gebaut = new Map();
function produktPfad(slug) {
  if (!gebaut.has(slug)) {
    const p = PRODUKTE.find((x) => x.slug === slug);
    const ziel = fs.mkdtempSync(path.join(os.tmpdir(), 'vd-sub-verlauf-' + slug + '-'));
    zielOrdner.push(ziel);
    const r = konfektionieren({
      ziel, slug, modulauswahl: [],
      vorDepotKonfigurationInhaltFn: () => 'window.__vorDepotKonfiguration = [];\n',
      unsignierteModulDateien: modulDateienFuer(p),
    });
    gebaut.set(slug, path.join(r.ordner, 'vivodepot.html'));
  }
  return gebaut.get(slug);
}
// Genau das konfektionierte Produkt (oder eine veränderte Kopie davon), ohne den Kern der Umgebung umzulenken.
function kernAus(htmlPfad, backen) {
  delete require.cache[require.resolve(LOAD_KERN)];
  try { return require(LOAD_KERN).ladeKern(backen ? { htmlPfad, backen: true } : { htmlPfad }); } finally {
    delete require.cache[require.resolve(LOAD_KERN)];
  }
}

// Ein Anker mit zwei Sub-Depots: „Depot Klara“ bleibt aktiv, „Depot Otto“ wird abgegeben. Die Vorgänge, die sich ohne Datei
// und ohne zweiten Anker auslösen lassen, laufen über die echten Funktionen; die übrigen stehen so im Verlauf, wie ihre
// Schreiber sie anlegen (Art, Zeitpunkt, Person).
async function anlage(kern) {
  const { V, document } = kern;
  await V.depotAnlegen(ANKER_PW);
  const ich = V.akteurSelbstErklaeren('Verwalterin Vera');
  const klara = await V.subDepotAnlegen({ bezeichnung: 'Depot Klara', inhaberin: 'Klara', verwaltungsTyp: 'verwaltet' }, SUB_PW);
  const otto = await V.subDepotAnlegen({ bezeichnung: 'Depot Otto', inhaberin: 'Otto', verwaltungsTyp: 'verwaltet' }, SUB_PW);
  const k = V.ankerDaten().verwalteteDepots.find((x) => x.depotUUID === klara.depotUUID);
  k.delegationsGeschichte.push(
    { art: 'eingehaengt', zeitpunkt: '2026-10-01T09:00:00.000Z', initiiert_von: 'verwaltend', akteur: ich.personId },
    { art: 'betreten', zeitpunkt: '2026-10-02T09:00:00.000Z', initiiert_von: 'verwaltend', akteur: ich.personId },
    { art: 'kind-datei-eingerichtet', zeitpunkt: '2026-10-03T09:00:00.000Z', initiiert_von: 'verwaltend' },
    { art: 'widerspruch-festgehalten', zeitpunkt: '2026-10-04T09:00:00.000Z', akteur: ich.personId },
    { art: 'widerspruch-entfernt', zeitpunkt: '2026-10-05T09:00:00.000Z', akteur: ich.personId },
    { art: 'kuenftiger-vorgang', zeitpunkt: '2026-10-06T09:00:00.000Z' },
  );
  V.subDepotBlackboxExportieren(klara.depotUUID);
  V.subDepotBlackboxExportieren(otto.depotUUID);
  V.subDepotAushaengen(otto.depotUUID, { empfaenger: 'Otto' });
  V.subDepotReaktivieren(otto.depotUUID);
  V.subDepotAushaengen(otto.depotUUID, { empfaenger: 'Otto', absicht: 'abgeben' });
  return { V, document, klara, otto, ich };
}
function karte(html, depotUUID) {
  const start = html.indexOf('data-sub="' + depotUUID + '"');
  assert.ok(start >= 0, 'die Karte des Sub-Depots fehlt');
  const naechste = html.indexOf('<div class="sektion" data-sub="', start + 10);
  return html.slice(start, naechste < 0 ? html.length : naechste);
}
function verlaufTitel(karteHTML) {
  const block = karteHTML.slice(karteHTML.indexOf('data-sub-verlauf='));
  return [...block.matchAll(/<div class="uebergabe-eintrag-titel">([^<]*)<\/div>/g)].map((m) => m[1]);
}

for (const slug of PRODUKTE_GEPRUEFT) {
  test(`[Sub·Verlauf] ${slug}: die Karte trägt den Verlauf, die neuesten zuerst, mit Datum und handelnder Person`, async () => {
    const { V, document, klara } = await anlage(kernAus(produktPfad(slug)));
    V.renderVerwalteteDepots();
    const k = karte(document.getElementById('content').innerHTML, klara.depotUUID);
    assert.ok(k.includes('data-sub-verlauf="' + klara.depotUUID + '"'), 'der Verlauf fehlt an der Karte');
    const n = V.ankerDaten().verwalteteDepots.find((x) => x.depotUUID === klara.depotUUID).delegationsGeschichte.length;
    assert.ok(k.includes('<summary>' + V.STRINGS.subVerlaufTitel + ' (' + n + ')</summary>'), 'die Überschrift nennt nicht die Zahl der Einträge');
    assert.equal(verlaufTitel(k).length, n, 'nicht jeder Eintrag steht im Verlauf');
    assert.deepEqual(verlaufTitel(k).slice(0, 7), [
      V.STRINGS.subVerlaufBlackboxExport, V.STRINGS.subVerlaufUnbekannt, V.STRINGS.subVerlaufWiderspruchEntfernt,
      V.STRINGS.subVerlaufWiderspruchFestgehalten, V.STRINGS.subVerlaufKindDatei, V.STRINGS.subVerlaufBetreten,
      V.STRINGS.subVerlaufEingehaengt,
    ], 'Vorgänge nicht in der Reihenfolge „neueste zuerst“');
    assert.ok(k.includes(V.STRINGS.subVerlaufVon.replace('{name}', 'Verwalterin Vera')), 'die handelnde Person fehlt');
    assert.match(k, /02\.10\.(20)?26/, 'das Datum des ersten Ansehens fehlt');
    assert.ok(!/data-uebergabe-(loeschen|zuruecknehmen)/.test(k.slice(k.indexOf('data-sub-verlauf='))), 'der Verlauf trägt einen Knopf');
  });

  test(`[Sub·Verlauf·archiviert] ${slug}: auch die Karte eines abgegebenen Sub-Depots trägt den Verlauf, mit Empfänger`, async () => {
    const { V, document, otto } = await anlage(kernAus(produktPfad(slug)));
    V.renderVerwalteteDepots();
    const k = karte(document.getElementById('content').innerHTML, otto.depotUUID);
    assert.deepEqual(verlaufTitel(k).slice(0, 4), [
      V.STRINGS.subVerlaufAbgegeben, V.STRINGS.subVerlaufWiederAufgenommen, V.STRINGS.subVerlaufBeiseitegelegt, V.STRINGS.subVerlaufBlackboxExport,
    ]);
    assert.ok(k.includes(V.STRINGS.empfaengerLabel + ': Otto'), 'der Empfänger fehlt im Verlauf');
  });

  test(`[Sub·Verlauf·unbekannt] ${slug}: ein unbekannter Vorgang zeigt einen neutralen Text, nie seine Kennung`, async () => {
    const { V, document, klara } = await anlage(kernAus(produktPfad(slug)));
    V.renderVerwalteteDepots();
    const k = karte(document.getElementById('content').innerHTML, klara.depotUUID);
    assert.ok(verlaufTitel(k).includes(V.STRINGS.subVerlaufUnbekannt));
    assert.ok(!k.includes('kuenftiger-vorgang'), 'die interne Kennung steht in der Karte');
    for (const art of ['eingehaengt', 'blackbox-export', 'widerspruch-entfernt']) {
      assert.notEqual(V.subDepotVorgangText(art), V.STRINGS.subVerlaufUnbekannt, art + ' hat keinen eigenen Text');
    }
  });

  test(`[Herausgegeben·aus Sub-Depots] ${slug}: nur die zwei hinausgehenden Vorgänge, nur lesend, ohne Eintrag im Protokoll`, async () => {
    const { V, document } = await anlage(kernAus(produktPfad(slug)));
    const vorher = JSON.stringify(V.getData().uebergabeProtokoll || []);
    V.renderUebergabeProtokoll();
    const html = document.getElementById('content').innerHTML;
    const teil = V.subDepotHerausgegebenHTML();
    assert.ok(teil.startsWith('<div id="uebergabe-aus-sub-depots"><h3>' + V.STRINGS.uebergabeAusSubDepotsTitel + '</h3>'), 'der Abschnitt hat nicht seine eigene Überschrift');
    assert.ok(html.includes(teil), 'der Abschnitt „Aus Sub-Depots“ fehlt in „Herausgegeben“');
    const modell = V.subDepotHerausgegebenModell();
    assert.deepEqual(modell.map((z) => z.art).sort(), ['abgegeben', 'blackbox-export', 'blackbox-export']);
    assert.ok(modell.every((z) => z.depot === 'Depot Klara' || z.depot === 'Depot Otto'), 'eine Zeile nennt ihr Sub-Depot nicht');
    assert.ok(modell.every((z, i) => i === 0 || modell[i - 1].zeitpunkt >= z.zeitpunkt), 'nicht die neuesten zuerst');
    assert.ok(!/data-uebergabe-(loeschen|zuruecknehmen|bedingung)/.test(teil), 'der Abschnitt trägt einen Knopf');
    assert.ok(!teil.includes(V.STRINGS.subVerlaufWiderspruchFestgehalten), 'ein Vorgang ohne Hinausgehen steht in „Herausgegeben“');
    assert.equal(JSON.stringify(V.getData().uebergabeProtokoll || []), vorher, 'etwas wurde in data.uebergabeProtokoll gespiegelt');
  });
}

function ohne(slug, zeile) {
  const text = fs.readFileSync(produktPfad(slug), 'utf8');
  assert.ok(text.includes(zeile), 'Rot-Beweis ohne Anker: die Zeile steht nicht in der erwarteten Form im Produkt');
  const v = fs.mkdtempSync(path.join(os.tmpdir(), 'vd-sub-verlauf-rot-'));
  zielOrdner.push(v);
  const kopie = path.join(v, 'vivodepot.html');
  fs.writeFileSync(kopie, text.split(zeile).join(''), 'utf8');
  return kernAus(kopie, true);
}

test('[Herausgegeben·aus Sub-Depots·Maskierung] ein Depotname mit Markup steht als Text, nie als Tag', async () => {
  /* Die Zeilen entstehen in _subVerlaufZeileHTML, das Titel und Angabe mit escapeHTML maskiert. Der Textknoten-Wächter
     zählt den Aufruf als HTML-Bauer; diese Probe belegt die Maskierung am Ergebnis. */
  const kern = kernAus(produktPfad(PRODUKTE_GEPRUEFT[0]));
  const { V } = await anlage(kern);
  const roh = '<img src=x onerror=alert(1)>';
  for (const e of V.ankerDaten().verwalteteDepots) e.bezeichnung = roh;
  const teil = V.subDepotHerausgegebenHTML();
  assert.ok(teil.length > 0, 'Vorbedingung: der Abschnitt hat Zeilen');
  assert.ok(!teil.includes(roh), 'der Depotname steht roh im HTML');
  assert.ok(teil.includes('&lt;img src=x onerror=alert(1)&gt;'), 'der Depotname steht nicht maskiert als Text');
});

test('[Sub·Verlauf·Rot-Beweis] ohne den Block fehlt der Verlauf an der Karte', async () => {
  const { V, document, klara, otto } = await anlage(ohne('privat-de', '    html += subDepotVerlaufHTML(e);\n'));
  V.renderVerwalteteDepots();
  const html = document.getElementById('content').innerHTML;
  // Die Zeile steht an beiden Karten (die archivierte zwei Leerzeichen tiefer); ohne sie fehlt der Verlauf an beiden.
  assert.ok(!karte(html, klara.depotUUID).includes('data-sub-verlauf='), 'ohne den Block hätte der Verlauf an der aktiven Karte fehlen müssen');
  assert.ok(!karte(html, otto.depotUUID).includes('data-sub-verlauf='), 'ohne den Block hätte der Verlauf an der archivierten Karte fehlen müssen');
});

test('[Herausgegeben·aus Sub-Depots·Rot-Beweis] ohne den Block fehlt der Abschnitt in „Herausgegeben“', async () => {
  const { V, document } = await anlage(ohne('privat-de', '  html += subDepotHerausgegebenHTML();\n'));
  V.renderUebergabeProtokoll();
  assert.ok(!document.getElementById('content').innerHTML.includes('id="uebergabe-aus-sub-depots"'));
});
