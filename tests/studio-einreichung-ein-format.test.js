'use strict';
/* ═══════════════════════════════════════════════════════════════════════════
   studio-einreichung-ein-format.test.js — eine Einreichung, ein Format (11.10.2026)
   ───────────────────────────────────────────────────────────────────────────
   Befund STUDIO-EINREICHUNG-ZWEI-FORMATE (HOCH): Das Studio und der Antragsweg des Herausgeber-Dienstes sprechen zwei
   Formate, die sich nicht berühren. Der Antragsweg nimmt für ein Zertifikat eine SCHLÜSSELDATEI an: den öffentlichen
   Schlüssel der Herausgeberin als JWK ohne privaten Teil UND einen Besitznachweis (eine Signatur mit dem zugehörigen
   privaten Schlüssel). Das Studio lässt nach dem Erzeugen des Schlüsselpaars den öffentlichen Schlüssel als nacktes JWK
   herunterladen; einen Besitznachweis bildet es nicht. Den privaten Schlüssel hält nur das Studio, also kann den
   Nachweis niemand sonst bilden. Mit dem Studio lässt sich darum keine Datei erzeugen, die der Antragsweg annimmt.

   WAS DIE PROBE FÄHRT: den echten Studio-Code (tests/load-generator.js), ein echtes Schlüsselpaar, und den Weg, auf dem
   das Studio Dateien hinausgibt (`blobDownload`). Aufgefangen wird, was der Knopf „öffentlichen Schlüssel
   herunterladen“ wirklich hinausgäbe; nichts davon ist von Hand gebaut.

   WAS SIE NICHT FÄHRT: die Annahme selbst (sie liegt in einem anderen Repository) und den Inhalt des Nachweises (über
   welche Bytes er gebildet wird, legt das Schema des Antrags fest und prüft die Signierstelle). Hier steht nur die
   Mindestform, an der die Annahme eine Datei schon abweist. Der ganze Weg (Studio-Einreichung wird angenommen, im
   Browser) ist die Abnahme des Befunds, nicht diese Probe.

   ROT BIS ZUM FIX: die erste Probe trägt `todo`. Der Stolperdraht darunter hält den heutigen Zustand fest und fällt,
   sobald das Studio die Schlüsseldatei erzeugt; dann wird im selben Commit das `todo` entfernt.
   ═══════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const { ladeGenerator } = require('./load-generator.js');

/* Die Mindestform einer Schlüsseldatei, wie der Antragsweg sie annimmt. Rückgabe: Liste der Mängel (leer = Form stimmt). */
const PRIVATE_TEILE = ['d', 'p', 'q', 'dp', 'dq', 'qi', 'oth', 'k'];
function maengelDerSchluesseldatei(text) {
  let inhalt;
  try { inhalt = JSON.parse(text); } catch { return ['kein JSON']; }
  const maengel = [];
  const jwk = inhalt && inhalt.jwk;
  if (!jwk || typeof jwk !== 'object' || Array.isArray(jwk) || typeof jwk.kty !== 'string') maengel.push('kein Feld jwk mit öffentlichem Schlüssel');
  else if (PRIVATE_TEILE.some((t) => Object.prototype.hasOwnProperty.call(jwk, t))) maengel.push('jwk trägt einen privaten Teil');
  if (!inhalt || typeof inhalt.besitznachweis !== 'string' || !/^[A-Za-z0-9_-]{16,2000}$/.test(inhalt.besitznachweis)) maengel.push('kein Besitznachweis');
  return maengel;
}

/* Echtes Studio, echtes Schlüsselpaar; gibt zurück, was „öffentlichen Schlüssel herunterladen“ hinausgäbe:
   [{ text }] je Datei. Aufgefangen wird am Blob, den `blobDownload` baut. */
async function oeffentlicheSchluesselDownloads() {
  const gen = ladeGenerator();
  const paar = await gen.V.erzeugeSchluesselpaarRoh();
  const dateien = [];
  gen.sandbox.Blob = function (teile) { dateien.push({ text: teile.map(String).join('') }); };
  gen.sandbox.__probeJwk = paar.publicJwk;
  vm.runInContext('STATE.publicKeyJwk = __probeJwk; ladePublic();', gen.sandbox);
  return { dateien, publicJwk: paar.publicJwk };
}

test('[Studio·Einreichung·ein Format] das Studio gibt eine Schlüsseldatei hinaus, die der Antragsweg annimmt: öffentlicher Schlüssel und Besitznachweis',
  { todo: 'STUDIO-EINREICHUNG-ZWEI-FORMATE (HOCH): das Studio gibt den öffentlichen Schlüssel als nacktes JWK hinaus und bildet keinen Besitznachweis; Rückkehr mit dem Wagen, der Studio-Einreichung und Antragsweg auf ein Format bringt' },
  async () => {
    const { dateien } = await oeffentlicheSchluesselDownloads();
    assert.ok(dateien.length >= 1, 'das Studio gibt keine Datei hinaus');
    const passend = dateien.filter((d) => maengelDerSchluesseldatei(d.text).length === 0);
    assert.equal(passend.length, 1, 'keine der hinausgegebenen Dateien ist eine Schlüsseldatei: ' + dateien.map((d) => maengelDerSchluesseldatei(d.text).join(' + ')).join(' | '));
  });

/* Stolperdraht: ein todo-Test, der grün wird, meldet das sonst nirgends. Erzeugt das Studio die Schlüsseldatei, fällt
   DIESE Probe; dann oben das todo entfernen und diese Probe streichen. */
test('[Studio·Einreichung·ein Format·Stolperdraht] solange das todo steht: genau eine Datei, ein nacktes JWK ohne Besitznachweis', async () => {
  const { dateien, publicJwk } = await oeffentlicheSchluesselDownloads();
  assert.equal(dateien.length, 1);
  assert.deepEqual(JSON.parse(dateien[0].text), JSON.parse(JSON.stringify(publicJwk)), 'hinaus geht das nackte JWK des erzeugten Schlüssels');
  assert.deepEqual(maengelDerSchluesseldatei(dateien[0].text), ['kein Feld jwk mit öffentlichem Schlüssel', 'kein Besitznachweis']);
  assert.ok(!PRIVATE_TEILE.some((t) => Object.prototype.hasOwnProperty.call(publicJwk, t)), 'der öffentliche Schlüssel trägt keinen privaten Teil');
});

test('[Studio·Einreichung·ein Format·Rot-Beweis] die Mindestform erkennt eine richtige Schlüsseldatei und jede der drei falschen', () => {
  const jwk = { kty: 'OKP', crv: 'Ed25519', x: 'x'.repeat(43) };
  const nachweis = 'n'.repeat(86);
  assert.deepEqual(maengelDerSchluesseldatei(JSON.stringify({ jwk, besitznachweis: nachweis })), []);
  assert.deepEqual(maengelDerSchluesseldatei(JSON.stringify(jwk)), ['kein Feld jwk mit öffentlichem Schlüssel', 'kein Besitznachweis'], 'nacktes JWK');
  assert.deepEqual(maengelDerSchluesseldatei(JSON.stringify({ jwk })), ['kein Besitznachweis']);
  assert.deepEqual(maengelDerSchluesseldatei(JSON.stringify({ jwk: { ...jwk, d: 'geheim' }, besitznachweis: nachweis })), ['jwk trägt einen privaten Teil']);
  assert.deepEqual(maengelDerSchluesseldatei(JSON.stringify({ jwk, besitznachweis: 'zu kurz' })), ['kein Besitznachweis']);
  assert.deepEqual(maengelDerSchluesseldatei('kein json'), ['kein JSON']);
});

/* Die gemeinsamen Fälle für die Formprüfung der Antragsdatei (tests/helfer/formpruefung-faelle.js): eine Quelle, reines
   ASCII, je Grund mindestens ein Fall. Was die Fälle prüfen, fahren die Stellen, die die Regeln anwenden. */
test('[Studio·Einreichung·Formfälle] die gemeinsame Fall-Datei ist reines ASCII, trägt je Grund einen Fall und Fälle mit zwei Gründen', () => {
  const fs = require('node:fs');
  const path = require('node:path');
  const pfad = path.join(__dirname, 'helfer', 'formpruefung-faelle.js');
  const bytes = fs.readFileSync(pfad);
  assert.deepEqual([...bytes].filter((b) => b > 126 || (b < 32 && b !== 10)), [], 'ein Zeichen außerhalb von ASCII oder ein Steuerzeichen steht roh in der Datei');
  const text = bytes.toString('latin1');
  assert.equal(text.split('==FORMPRUEFUNG_FAELLE:BEGIN==').length, 2);
  assert.equal(text.split('==FORMPRUEFUNG_FAELLE:END==').length, 2);
  const { FORMPRUEFUNG_FAELLE: F } = require('./helfer/formpruefung-faelle.js');
  assert.deepEqual([F.fenster.zurueckTage, F.fenster.vorausTage], [30, 1]);
  assert.deepEqual(F.reihenfolgeDerGruende, ['leer', 'zeilenvorschub', 'steuerzeichen', 'randleerraum', 'nicht-nfc', 'spitze-klammer']);
  const sollAusstelltag = new Set(F.ausstelltag.map((x) => x.soll));
  assert.deepEqual([...sollAusstelltag].sort(), ['gilt', 'in-der-zukunft', 'zu-alt']);
  const sollGebunden = new Set(F.gebunden.map((x) => x.soll));
  assert.deepEqual([...sollGebunden].sort(), ['gilt', ...F.reihenfolgeDerGruende].sort());
  assert.ok(F.gebunden.filter((x) => /zwei Gr/.test(x.was)).length >= 5, 'Fälle mit zwei Gründen legen die Reihenfolge fest');
  assert.ok(F.keinKalendertag.length >= 10);
  // Das feste Beispiel der Zeilen: Länge und Abdruck stimmen mit den Zeilen überein, und der Abdruck der Angaben steht als
  // vierte Zeile im Nachweis. Signiert wird hier nichts.
  const sha = (text) => require('node:crypto').createHash('sha256').update(Buffer.from(text, 'utf8')).digest('hex');
  const N = F.nachweisZeilen;
  assert.equal(sha(N.angaben.zeilen.join('\n')), N.angaben.sha256);
  for (const art of ['zertifikat', 'vorlage']) {
    const text = N[art].zeilen.join('\n');
    assert.equal(N[art].zeilen.length, 7, art);
    assert.equal(Buffer.byteLength(text, 'utf8'), N[art].laengeBytes, art);
    assert.equal(sha(text), N[art].sha256, art);
    assert.equal(N[art].zeilen[3], N.angaben.sha256, art);
  }
  assert.equal(N.zertifikat.zeilen[6], 'ohne-vorlage');
  // Zehn Angaben-Zeilen: die letzte ist der Rechtsraum oder sein Platzhalter. Mit USt-IdNr. und Rechtsraum ein anderer Abdruck.
  assert.deepEqual([N.angaben.zeilen.length, N.angaben.bedeutung.length, N.angaben.zeilen[9]], [10, 10, F.rechtsraum.platzhalter]);
  const M = N.angaben.mitUstIdNrUndRechtsraum;
  assert.equal(sha([...N.angaben.zeilen.slice(0, 8), M.ustIdNr, M.rechtsraum].join('\n')), M.sha256);
  assert.notEqual(M.sha256, N.angaben.sha256);
  // Rechtsraum: die Regel in einer Zeile nachgerechnet; beide Ausgaenge kommen vor, der Platzhalter selbst faellt.
  for (const f of F.rechtsraum.faelle) assert.equal(/^[A-Z]{2,8}$/.test(f.wert) ? 'gilt' : 'faellt', f.soll, f.was);
  assert.deepEqual([...new Set(F.rechtsraum.faelle.map((f) => f.soll))].sort(), ['faellt', 'gilt']);
  assert.ok(F.rechtsraum.faelle.some((f) => f.wert === F.rechtsraum.platzhalter && f.soll === 'faellt'));
  // Nutzlastgrenze: gemessen an der ganzen Datei; genau an der Grenze gilt, ein Byte darueber faellt.
  assert.equal(F.nutzlast.hoechstBytes, 1048576);
  for (const f of F.nutzlast.faelle) assert.equal(f.bytes <= F.nutzlast.hoechstBytes ? 'gilt' : 'faellt', f.soll, f.was);
  // Das Konto im Beispiel ist das der genannten Adresse; rohe und bereinigte Eingabe ergeben dasselbe.
  const konto = (eingabe) => sha(eingabe.trim().toLowerCase()).slice(0, 24);
  for (const f of F.konto.faelle) assert.equal(konto(f.eingabe), f.konto, f.was);
  assert.equal(F.konto.faelle[0].konto, F.konto.faelle[1].konto);
  assert.notEqual(F.konto.faelle[2].konto, F.konto.faelle[0].konto);
  assert.equal(N.zertifikat.zeilen[4], F.konto.faelle[0].konto, 'das Konto des Beispiels steht als fünfte Zeile im Nachweis');
  assert.match(N.vorlage.zeilen[6], /^[a-f0-9]{64}$/);
  // Die Escape-Folgen sind wirklich die gemeinten Zeichen, nicht ihr Text.
  assert.ok(F.gebunden.some((x) => x.wert.includes(String.fromCharCode(0x2028))) && F.gebunden.some((x) => x.wert.includes(String.fromCharCode(0x301))));
});
