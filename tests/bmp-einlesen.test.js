'use strict';
/* Probe — Bundeseinheitlichen Medikationsplan (BMP 2.8) einlesen.
   Der Carrier eines BMP ist XML in ISO-8859-1 ohne Prolog (Anlage 3, Kap. 7). Diese Probe liest
   ERFUNDENE Pläne im Muster der Spezifikation; keine Beispieldatei der KBV liegt im Repo
   (deren Nutzung ist ungeklärt, sie dürfen nur als Prüfgegenstand außerhalb gelesen werden).
   Belegt:
     • bmpXmlLesen: Kopf, Patient, Einträge mit Wirkstoff/Stärke, Viererschema oder Freitextdosis,
       Hinweis und Grund; Entitäten; abgewiesen wird, was kein BMP ist, mit einer Kennung.
     • bmpSeitenZusammenfuehren: ein mehrseitiger Plan kommt nur vollständig und mit gleicher
       Instanz-ID zusammen.
     • bmpPlanUebernehmen: jeder Eintrag wird ein Chip in health.medicationOngoing; ein zweites
       Einlesen desselben Plans legt nichts doppelt an.
     • Rot-Beweis außerhalb der Gesundheit: ein Plan geht nie in ein anderes Feld. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

async function frischMitDepot(optionen) {
  const k = ladeKern(optionen);
  await k.V.depotAnlegen('pw');
  k.V.akteurSelbstErklaeren('Tester');
  return k;
}

// Erfunden: Namen, PZN, Wirkstoffe und Instanz-ID stammen aus keinem echten Plan.
const PLAN_EINSEITIG = '<MP v="026" U="00112233445566778899AABBCCDDEEFF" l="de-DE">'
  + '<P g="Erika" f="Musterfrau" b="19600101"/>'
  + '<A n="Praxis Beispielweg" s="Lindenallee 3" z="12345" c="Musterstadt" t="20261106"/>'
  + '<S>'
  + '<M p="1234567" a="Beispielol 5 mg" m="1" v="1" du="1" i="nüchtern einnehmen" r="Blutdruck"><W w="Beispielwirkstoff" s="5 mg"/></M>'
  + '<M t="bei Bedarf bis 3x täglich" r="Schmerzen"><W w="Musterprofen" s="400 mg"/></M>'
  + '</S>'
  + '<S t="Selbstmedikation"><M a="Teebeutel &quot;Ruhe&quot; &amp; Schlaf" h="1"/></S>'
  + '</MP>';

test('[BMP·a] bmpXmlLesen liest Kopf, Patient und Einträge eines erfundenen Plans', async () => {
  const { V } = await frischMitDepot();
  const r = V.bmpXmlLesen(PLAN_EINSEITIG);
  assert.equal(r.ok, true, JSON.stringify(r));
  assert.equal(r.plan.version, '026');
  assert.equal(r.plan.instanz, '00112233445566778899AABBCCDDEEFF');
  assert.deepEqual({ ...r.plan.patient }, { vorname: 'Erika', nachname: 'Musterfrau', geburtsdatum: '19600101' });
  assert.equal(r.plan.aussteller, 'Praxis Beispielweg');
  assert.equal(r.plan.eintraege.length, 3);
  const [e1, e2, e3] = r.plan.eintraege;
  assert.equal(e1.name, 'Beispielol 5 mg');
  assert.equal(e1.pzn, '01234567', 'PZN achtstellig mit führender Null');
  assert.deepEqual(e1.wirkstoffe.map(w => ({ ...w })), [{ wirkstoff: 'Beispielwirkstoff', staerke: '5 mg' }]);
  assert.equal(e1.dosis, '1-0-1-0');
  assert.equal(e1.hinweis, 'nüchtern einnehmen');
  assert.equal(e1.grund, 'Blutdruck');
  assert.equal(e2.name, '', 'ohne Handelsnamen bleibt der Name leer');
  assert.equal(e2.dosis, 'bei Bedarf bis 3x täglich');
  assert.equal(e3.name, 'Teebeutel "Ruhe" & Schlaf', 'Entitäten werden aufgelöst');
  assert.equal(e3.dosis, '0-0-0-1');
});

test('[BMP·b] bmpEintragText setzt einen lesbaren Chip-Text zusammen', async () => {
  const { V } = await frischMitDepot();
  const [e1, e2] = V.bmpXmlLesen(PLAN_EINSEITIG).plan.eintraege;
  assert.equal(V.bmpEintragText(e1), 'Beispielol 5 mg · 1-0-1-0 · nüchtern einnehmen · Blutdruck');
  assert.equal(V.bmpEintragText(e2), 'Musterprofen 400 mg · bei Bedarf bis 3x täglich · Schmerzen',
    'ohne Handelsnamen tragen Wirkstoff und Stärke den Namen');
});

test('[BMP·c] bmpXmlLesen weist ab, was kein BMP ist — mit Kennung', async () => {
  const { V } = await frischMitDepot();
  const fall = (xml) => V.bmpXmlLesen(xml).fehler;
  assert.equal(fall(''), 'bmp:leer');
  assert.equal(fall('<html><body/></html>'), 'bmp:keine-wurzel-mp');
  assert.equal(fall('<MP U="X"><S/></MP>'), 'bmp:version-fehlt');
  assert.equal(fall('<MP v="026"><S><M a="x"></S></MP>'), 'bmp:xml-unvollstaendig');
  assert.equal(fall('<!DOCTYPE MP [<!ENTITY a "b">]><MP v="026"/>'), 'bmp:doctype-unzulaessig');
  assert.equal(fall('<MP v="026"><S><M a="&unbekannt;"/></S></MP>'), 'bmp:entitaet-unbekannt');
  assert.equal(fall('<MP v="026"><S></S></MP>'), 'bmp:keine-eintraege');
  assert.equal(fall('<MP v="026">' + 'x'.repeat(30000) + '</MP>'), 'bmp:zu-gross');
});

test('[BMP·d] mehrseitig: nur vollständig und mit gleicher Instanz-ID', async () => {
  const { V } = await frischMitDepot();
  const seite = (a, U, name) => V.bmpXmlLesen('<MP v="026" U="' + U + '" a="' + a + '" z="2"><S><M a="' + name + '" m="1"/></S></MP>').plan;
  const s1 = seite(1, 'AA', 'Erstens'), s2 = seite(2, 'AA', 'Zweitens');
  const ganz = V.bmpSeitenZusammenfuehren([s2, s1]);
  assert.equal(ganz.ok, true);
  assert.deepEqual(ganz.plan.eintraege.map(e => e.name), ['Erstens', 'Zweitens'], 'Reihenfolge nach Seitenzahl');
  assert.equal(V.bmpSeitenZusammenfuehren([s1]).fehler, 'bmp:seiten-fehlen');
  assert.deepEqual([...V.bmpSeitenZusammenfuehren([s1]).fehlend], [2]);
  assert.equal(V.bmpSeitenZusammenfuehren([s1, seite(2, 'BB', 'Fremd')]).fehler, 'bmp:seiten-anderer-plan');
});

test('[BMP·e] bmpPlanUebernehmen legt Chips in der laufenden Medikation an, ohne Doppel', async () => {
  const k = await frischMitDepot();
  const { V } = k;
  const plan = V.bmpXmlLesen(PLAN_EINSEITIG).plan;
  const r1 = V.bmpPlanUebernehmen(plan);
  assert.deepEqual({ ...r1 }, { neu: 3, schonDa: 0 });
  const chips = k.V.getData().sektoren.health.medicationOngoing;
  assert.equal(chips.length, 3);
  assert.equal(chips[0].text, 'Beispielol 5 mg · 1-0-1-0 · nüchtern einnehmen · Blutdruck');
  const r2 = V.bmpPlanUebernehmen(plan);
  assert.deepEqual({ ...r2 }, { neu: 0, schonDa: 3 }, 'zweites Einlesen legt nichts doppelt an');
  assert.equal(k.V.getData().sektoren.health.medicationOngoing.length, 3);
});

test('[BMP·f] Rot-Beweis: ein Plan schreibt in kein anderes Feld als die laufende Medikation', async () => {
  const k = await frischMitDepot();
  const vorher = JSON.stringify(k.V.getData().sektoren);
  k.V.bmpPlanUebernehmen(k.V.bmpXmlLesen(PLAN_EINSEITIG).plan);
  const nachher = JSON.parse(JSON.stringify(k.V.getData().sektoren));
  delete nachher.health.medicationOngoing;
  if (!Object.keys(nachher.health).length) delete nachher.health;
  const vorherOhne = JSON.parse(vorher);
  if (vorherOhne.health) delete vorherOhne.health.medicationOngoing;
  if (vorherOhne.health && !Object.keys(vorherOhne.health).length) delete vorherOhne.health;
  assert.deepEqual(nachher, vorherOhne);
  assert.throws(() => k.V.bmpPlanUebernehmen({ eintraege: 'kein Array' }), /bmp:plan-ungueltig/);
});

test('[BMP·Oberfläche] Knopf nur an der laufenden Medikation und nur mit Schreibrecht', async () => {
  const { V } = await frischMitDepot();
  const feldDef = (id) => V.feldDefFuer('health', id);
  const mit = V.feldZeileHTML(feldDef('medicationOngoing'), [], 'health', true, true);
  assert.match(mit, /data-bmp-einlesen="1"/);
  assert.ok(mit.includes(V.STRINGS.bmpKnopf), 'der Knopf trägt den Text aus dem Textsatz');
  assert.doesNotMatch(V.feldZeileHTML(feldDef('medicationOngoing'), [], 'health', false, true), /data-bmp-einlesen/, 'ohne Schreibrecht kein Knopf');
  assert.doesNotMatch(V.feldZeileHTML(feldDef('allergiesMedicationFoodOther'), [], 'health', true, true), /data-bmp-einlesen/, 'nicht an einem anderen Feld');
});

test('[BMP·Datei] bmpDateienLesen liest ISO-8859-1 und UTF-8, ein Bild ohne Bildleser wird abgewiesen', async () => {
  const { V } = await frischMitDepot();
  const datei = (buf, type) => ({ type, size: buf.byteLength, arrayBuffer: async () => buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) });
  const latin1 = Buffer.from(PLAN_EINSEITIG, 'latin1'), utf8 = Buffer.from(PLAN_EINSEITIG, 'utf8');
  for (const b of [latin1, utf8]) {
    const r = await V.bmpDateienLesen([datei(b, 'text/xml')]);
    assert.equal(r.ok, true);
    assert.equal(r.plan.eintraege[0].hinweis, 'nüchtern einnehmen', 'Umlaut richtig aus beiden Kodierungen');
  }
  await assert.rejects(V.bmpDateienLesen([datei(latin1, 'image/png')]), /bmp:bildleser-fehlt/);
});

test('[BMP·Größe] eine zu große Datei wird vor dem Lesen abgewiesen, ohne Größe ebenso; Rot-Beweis ohne die Prüfung', async () => {
  const { V } = await frischMitDepot();
  let gelesen = 0;
  const datei = (size, type) => ({ type, size, arrayBuffer: async () => { gelesen++; return new ArrayBuffer(0); } });
  assert.deepEqual(await V.bmpDateienLesen([datei(V.BMP_DATEI_MAX_BYTES + 1, 'text/xml')]), { ok: false, fehler: 'bmp:zu-gross' });
  assert.deepEqual(await V.bmpDateienLesen([datei(V.BMP_BILD_MAX_BYTES + 1, 'image/png')]), { ok: false, fehler: 'bmp:zu-gross' });
  assert.deepEqual(await V.bmpDateienLesen([datei(undefined, 'text/xml')]), { ok: false, fehler: 'bmp:zu-gross' }, 'ohne Größe kein Lesen');
  assert.equal(gelesen, 0, 'nichts wurde gelesen');
  const fs = require('node:fs'), path = require('node:path'), os = require('node:os');
  const kern = fs.readFileSync(path.join(__dirname, '..', 'vivodepot.html'), 'utf8');
  const zeile = "    if (!(Number(d.size) <= (bild ? BMP_BILD_MAX_BYTES : BMP_DATEI_MAX_BYTES))) return { ok: false, fehler: 'bmp:zu-gross' };\n";
  assert.equal(kern.split(zeile).length, 2, 'Vorbedingung: die Prüfung steht genau einmal im Kern');
  const ordner = fs.mkdtempSync(path.join(os.tmpdir(), 'bmp-groesse-'));
  const kopie = path.join(ordner, 'vivodepot.html');
  fs.writeFileSync(kopie, kern.replace(zeile, ''));
  const ohne = await frischMitDepot({ htmlPfad: kopie, backen: true });
  gelesen = 0;
  await ohne.V.bmpDateienLesen([datei(V.BMP_DATEI_MAX_BYTES + 1, 'text/xml')]).catch(() => {});
  assert.equal(gelesen, 1, 'Rot-Beweis: ohne die Prüfung wird die zu große Datei gelesen');
  fs.rmSync(ordner, { recursive: true, force: true });
});

test('[BMP·Pixel] ein Bild mit zu vielen Pixeln wird vor der Leinwand geschlossen und abgewiesen; Rot-Beweis ohne die Prüfung', async () => {
  const { V } = await frischMitDepot();
  let geschlossen = 0;
  const bild = (width, height) => ({ width, height, close: () => { geschlossen++; } });
  const klein = bild(400, 400);
  assert.equal(V._bmpBildPixelPruefen(klein), klein, 'ein Code-Bild geht durch');
  assert.equal(geschlossen, 0);
  assert.equal(V._bmpBildPixelPruefen(bild(5000, 5000)).width, 5000, 'genau an der Grenze geht es noch');
  for (const [w, h] of [[5001, 5000], [20000, 20000], [0, 10], [NaN, 10]]) {
    assert.throws(() => V._bmpBildPixelPruefen(bild(w, h)), /bmp:zu-gross/, w + ' × ' + h);
  }
  assert.equal(geschlossen, 4, 'jedes abgewiesene Bild wird geschlossen');
  const fs = require('node:fs'), path = require('node:path'), os = require('node:os');
  const kern = fs.readFileSync(path.join(__dirname, '..', 'vivodepot.html'), 'utf8');
  const aufruf = '  const bild = _bmpBildPixelPruefen(await createImageBitmap(datei));\n';
  assert.equal(kern.split(aufruf).length, 2, 'Vorbedingung: das Lesen eines Bilds geht genau einmal durch die Prüfung');
  // Wächter gegen die Klasse: jedes dekodierte Bild in Kern und Lese-App geht durch die Pixelprüfung, bevor es gezeichnet wird.
  for (const datei of ['vivodepot.html', 'vivodepot-lesen.html']) {
    const text = fs.readFileSync(path.join(__dirname, '..', datei), 'utf8');
    const alle = text.split('createImageBitmap(').length - 1;
    const geprueft = text.split('_bmpBildPixelPruefen(await createImageBitmap(').length - 1;
    assert.equal(alle, geprueft, datei + ': jedes createImageBitmap geht durch _bmpBildPixelPruefen');
  }
  const zeile = '  if (breite > 0 && hoehe > 0 && breite * hoehe <= BMP_BILD_MAX_PIXEL) return bild;\n';
  assert.equal(kern.split(zeile).length, 2, 'Vorbedingung: die Grenze steht genau einmal im Kern');
  const ordner = fs.mkdtempSync(path.join(os.tmpdir(), 'bmp-pixel-'));
  const kopie = path.join(ordner, 'vivodepot.html');
  fs.writeFileSync(kopie, kern.replace(zeile, '  return bild;\n'));
  const ohne = await frischMitDepot({ htmlPfad: kopie, backen: true });
  assert.equal(ohne.V._bmpBildPixelPruefen(bild(20000, 20000)).width, 20000, 'Rot-Beweis: ohne die Grenze ginge ein Bild mit 400 Megapixeln auf die Leinwand');
  fs.rmSync(ordner, { recursive: true, force: true });
});

test('[BMP·Data Matrix] der eingebettete Auszug liest einen erfundenen Code bytegenau, mit gedämpftem Kontrast und Rauschen', async () => {
  const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
  const { blockAusKern } = require('../tools/datamatrix-auszug-bauen.js');
  const { TEXT, ZEILEN } = require('./fixtures/bmp-datamatrix-erfunden.js');
  const kernPfad = path.join(__dirname, '..', 'vivodepot.html');   // der Block dieses Baums; der Auszug lädt keinen Kern
  const block = blockAusKern(fs.readFileSync(kernPfad, 'utf8'));
  assert.ok(block, 'der Kern trägt den Data-Matrix-Block');
  const kontext = vm.createContext({ Uint8ClampedArray, Int32Array, Uint8Array, TextDecoder, Map, Error, Math, Object, Array });
  vm.runInContext(block + '\nthis.__dm = vdDataMatrix;', kontext);
  const k = await frischMitDepot();
  // Das Bild: 3 Pixel je Modul, Ruhezone, Kontrast gedämpft, Rauschen fest (kein Zufall, wiederholbar).
  const px = 3, rand = 12, n = ZEILEN.length, b = n * px + 2 * rand;
  const rgba = new Uint8ClampedArray(b * b * 4);
  let saat = 7;
  for (let y = 0; y < b; y++) for (let x = 0; x < b; x++) {
    const my = Math.floor((y - rand) / px), mx = Math.floor((x - rand) / px);
    const dunkel = my >= 0 && my < n && mx >= 0 && mx < n && ZEILEN[my][mx] === '1';
    saat = (saat * 1103515245 + 12345) % 2147483648;
    const v = Math.max(0, Math.min(255, (dunkel ? 60 : 210) + ((saat % 41) - 20)));
    const o = 4 * (y * b + x); rgba[o] = rgba[o + 1] = rgba[o + 2] = v; rgba[o + 3] = 255;
  }
  global.vdDataMatrix = kontext.__dm;
  try {
    assert.equal(k.V.bmpDataMatrixLesen(rgba, b, b), TEXT, 'bytegenau, Umlaut aus ISO-8859-1 richtig');
    const r = k.V.bmpXmlLesen(TEXT);
    assert.equal(r.ok, true);
    assert.equal(r.plan.eintraege[0].hinweis, 'nüchtern einnehmen');
    assert.equal(k.V.bmpDataMatrixLesen(new Uint8ClampedArray(64 * 64 * 4).fill(255), 64, 64), null, 'ein leeres Bild ergibt null, keinen Wurf');
  } finally { delete global.vdDataMatrix; }
  assert.equal(k.V.bmpDataMatrixLesen(rgba, b, b), null, 'ohne eingebetteten Auszug liest der Kern kein Bild');
});

/* Befunde der Gegenlesung zur Einbettung (06.11.2026): DM-HERKUNFT-OHNE-ANKER und DM-GLOBAL-UEBERSCHREIBBAR.
   Den echten Nachbau aus dem npm-Paket fährt `node tools/datamatrix-auszug-bauen.js --pruefen --paket <library-0.23.0.tgz>`;
   die Probe hält die Mechanik ohne das Paket: Integrität vor jedem gelesenen Byte, Byte-Gleichheit, nicht beschreibbare Bindung. */
function erfundenerTarball(dateien) {
  const zlib = require('node:zlib');
  const teile = [];
  for (const [name, text] of Object.entries(dateien)) {
    const inhalt = Buffer.from(text, 'utf8');
    const kopf = Buffer.alloc(512);
    kopf.write(name, 0, 'utf8');
    kopf.write('0000644\0', 100); kopf.write('0000000\0', 108); kopf.write('0000000\0', 116);
    kopf.write(inhalt.length.toString(8).padStart(11, '0') + '\0', 124);
    kopf.write('00000000000\0', 136);
    kopf.write('        ', 148); kopf.write('0', 156); kopf.write('ustar\u000000', 257);
    let summe = 0; for (const b of kopf) summe += b;
    kopf.write(summe.toString(8).padStart(6, '0') + '\0 ', 148);
    teile.push(kopf, inhalt, Buffer.alloc((512 - (inhalt.length % 512)) % 512));
  }
  teile.push(Buffer.alloc(1024));
  return zlib.gzipSync(Buffer.concat(teile));
}

test('[BMP·Herkunft] gebaut wird nur aus einem Tarball mit der Integrität des Registry-Eintrags', () => {
  const W = require('../tools/datamatrix-auszug-bauen.js');
  assert.match(W.PAKET.integritaet, /^sha512-[A-Za-z0-9+/]{86}==$/, 'Integrität als SHA-512 aus dem Registry-Eintrag');
  assert.equal(W.PAKET.name, '@zxing/library');
  assert.equal(W.PAKET.version, W.VERSION);
  const tgz = erfundenerTarball({ 'package/package.json': JSON.stringify({ name: 'erfunden', version: '0.0.1', license: 'MIT' }) });
  const dateien = W.tarballLesen(tgz, W.integritaet(tgz));
  assert.deepEqual([...dateien.keys()], ['package.json'], 'liest den Tarball, ohne das führende package/');
  assert.throws(() => W.bauen(tgz, W.integritaet(tgz)), /Paket passt nicht/, 'ein anderes Paket mit passender Integrität baut nicht');
  assert.throws(() => W.bauen(tgz), /Paket-Integrität weicht ab/, 'ohne die Integrität des echten Pakets baut nichts');
});

test('[BMP·Herkunft·Rot-Beweis] ein geändertes Byte im Tarball bricht vor dem Lesen ab', () => {
  const W = require('../tools/datamatrix-auszug-bauen.js');
  const tgz = erfundenerTarball({ 'package/package.json': '{}' });
  const erwartet = W.integritaet(tgz);
  const falsch = Buffer.from(tgz); falsch[falsch.length - 5] ^= 1;
  assert.throws(() => W.tarballLesen(falsch, erwartet), /Paket-Integrität weicht ab/);
});

function bindungImKontext(block) {
  const vm = require('node:vm');
  const kontext = vm.createContext({ Uint8ClampedArray, Int32Array, Uint8Array, TextDecoder, Map, Error, Math, Object, Array });
  vm.runInContext(block, kontext);
  const vorher = vm.runInContext('vdDataMatrix', kontext);
  vm.runInContext('vdDataMatrix = { fremd: true };', kontext);
  return { d: vm.runInContext('Object.getOwnPropertyDescriptor(globalThis, "vdDataMatrix")', kontext),
    bleibt: vm.runInContext('vdDataMatrix', kontext) === vorher };
}

test('[BMP·Global] der eingebettete Auszug bindet vdDataMatrix nicht beschreibbar und nicht umkonfigurierbar', () => {
  const fs = require('node:fs'), path = require('node:path');
  const { blockAusKern } = require('../tools/datamatrix-auszug-bauen.js');
  const kernPfad = path.join(__dirname, '..', 'vivodepot.html');   // der Block dieses Baums; der Auszug lädt keinen Kern
  const { d, bleibt } = bindungImKontext(blockAusKern(fs.readFileSync(kernPfad, 'utf8')));
  assert.equal(d.writable, false);
  assert.equal(d.configurable, false);
  assert.equal(bleibt, true, 'eine Zuweisung tauscht den Leser nicht aus');
});

test('[BMP·Global·Rot-Beweis] als var gebunden wäre der Leser austauschbar', () => {
  const fs = require('node:fs'), path = require('node:path');
  const { blockAusKern } = require('../tools/datamatrix-auszug-bauen.js');
  const block = blockAusKern(fs.readFileSync(path.join(__dirname, '..', 'vivodepot.html'), 'utf8'));
  const kopf = "Object.defineProperty(globalThis, 'vdDataMatrix', { writable: false, configurable: false, value: (function () {";
  assert.equal(block.split(kopf).length, 2, 'der Kopf der Bindung ist auffindbar');
  const alt = block.replace(kopf, 'var vdDataMatrix = (function () {').replace(/\}\)\(\) \}\);\n(\/\/ @zxing\/library [^\n]*Ende\n)$/, '})();\n$1');
  const { d, bleibt } = bindungImKontext(alt);
  assert.equal(d.writable, true);
  assert.equal(bleibt, false);
});
