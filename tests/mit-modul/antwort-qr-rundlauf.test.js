'use strict';
/* Die Antwort als QR-Serie (U2-ADR-449, Nachtrag 16.11.2026). Der Kern packt die JWE in die Serie „VDQR|gid|i/n|…“ und zeichnet
   jeden Teil mit qrcode-generator 1.4.4 als GIF; jsQR (devDependency, exakt 1.4.0, nur Tests) liest jedes Bild zurück; die Lese-App
   nimmt die Teile über verarbeiteQrText in gemischter Reihenfolge auf. Erwartet: der zusammengesetzte Text ist byte-gleich der
   Datei-JWE, und die Antwort öffnet sich zum selben Datensatz. Hier unter tests/mit-modul/, weil jsQR ein externes Modul ist.
   [Antwort·QR·Krypto-unverändert] hält den ANTWORT-JWE-BLOCK per Abdruck auf dem Stand vor diesem Bau fest. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');
const { ladeKern, webcrypto } = require('../load-kern.js');
const { ladeLesen } = require('../load-lesen.js');
const { gifZuRgba } = require('../helfer/gif-rgba.js');
const { datensatzAusJwe } = require('../helfer/antwort-datensatz.js');

const WURZEL = path.join(__dirname, '..', '..');
const KERN = fs.readFileSync(path.join(WURZEL, 'vivodepot.html'), 'utf8');
const PW_DEPOT = 'Antwort-QR-Probe-2026!';
const EINMAL = 'Einmal-QR-7fQ2-kP9x-Lm4Z';

// Die QR-Bibliothek des Kerns (eigener Skript-Block) in einen eigenen Sandkasten; der Kern ruft sie als window.qrcode.
function qrBibliothek() {
  const a = KERN.indexOf('<script id="qrcode_VivodepotInline">');
  const b = KERN.indexOf('</script>', a);
  const kiste = {};
  vm.createContext(kiste);
  vm.runInContext(KERN.slice(KERN.indexOf('>', a) + 1, b), kiste);
  assert.equal(typeof kiste.qrcode, 'function');
  return kiste.qrcode;
}
async function kernMitDepot() {
  const k = ladeKern();
  k.window.qrcode = qrBibliothek();
  await k.V.depotAnlegen(PW_DEPOT);
  k.V.akteurSelbstErklaeren('Hedwig Brandt');
  k.V.sektorFeldSetzen('identity', 'givenName', 'Hedwig');
  return k;
}
function anfrage(antwort) {
  return {
    modulTyp: 'anfrage', anfrageVersion: 1, von: 'Probe-Heim', zweck: 'Aufnahme', grundlage: 'Heimvertrag', vorgang: 'AUF-2026-1116',
    gestelltAm: '2026-11-16', gueltigBis: '2099-12-31',
    felder: [{ kennung: 'identity.givenName', zweck: 'Anrede', pflicht: true }],
    antwort,
  };
}
async function empfangsPaar() {
  const kp = await webcrypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']);
  return { pub: await webcrypto.subtle.exportKey('jwk', kp.publicKey), priv: await webcrypto.subtle.exportKey('jwk', kp.privateKey) };
}
// Die Bilder aus der gemeinsamen Bilderzeile (qrTeileBilderHTML), je Bild mit jsQR zurückgelesen.
function bilderLesen(html) {
  const jsQR = require('jsqr');
  const quellen = [...html.matchAll(/<img src="(data:image\/gif;base64,[^"]+)"/g)].map((m) => m[1]);
  return quellen.map((q) => {
    const { rgba, breite, hoehe } = gifZuRgba(q);
    const gelesen = jsQR(rgba, breite, hoehe);
    assert.ok(gelesen, 'jsQR findet einen QR in ' + breite + '×' + hoehe);
    return gelesen.data;
  });
}
// Die Lese-App nimmt die Texte über verarbeiteQrText auf; renderAntwortOeffnen fängt die fertige JWE ab.
function leseAppAufnehmen(texte) {
  const { V: L, sandbox } = ladeLesen();
  const funde = [], fortschritt = [], fehler = [];
  sandbox.renderAntwortOeffnen = (u) => { funde.push(u); };
  for (const t of texte) L.verarbeiteQrText(t, (m) => fortschritt.push(m), (m) => fehler.push(m), () => {});
  return { L, funde, fortschritt, fehler };
}
const gemischt = (liste) => liste.map((x, i) => [((i * 7) + 3) % liste.length, x]).sort((a, b) => a[0] - b[0]).map((p) => p[1]);

// Der Rundweg für ein Verfahren; die Titel stehen wörtlich da, weil U2-ADR-449 sie in `konformitaet` nennt.
async function rundweg(bauen) {
  const { V } = await kernMitDepot();
  const f = await bauen();
  const ds = V.anfrageAntwortDatensatz(f.a, { sensibel: false });
  const jwe = await V.antwortVerschluesseln(ds, f.a, f.opt);
  const q = V.antwortQrTeile(jwe, { maxNutzlast: 300 });   // kleinere Teile, damit auch eine kurze JWE mehrteilig wird
  assert.ok(q.anzahl >= 2, 'mehrteilig: ' + q.anzahl);
  assert.equal(q.ueberGrenze, false);
  const gelesen = bilderLesen(V.qrTeileBilderHTML(q.teile, 'Hinweis'));
  assert.equal(gelesen.length, q.anzahl, 'ein Bild je Teil');
  assert.deepEqual(gelesen, q.teile.map((t) => t.rahmen), 'jedes Bild trägt genau seinen Rahmen');
  const { L, funde, fortschritt, fehler } = leseAppAufnehmen(gemischt(gelesen));
  assert.deepEqual(fehler, []);
  assert.equal(fortschritt.length, q.anzahl - 1, 'bis zum letzten Teil meldet die Lese-App den Fortschritt');
  assert.equal(funde.length, 1, 'genau eine Antwort');
  assert.equal(Buffer.compare(Buffer.from(funde[0].jwe, 'utf8'), Buffer.from(jwe, 'utf8')), 0, 'byte-gleich der Datei-JWE');
  assert.deepEqual(await datensatzAusJwe(L, funde[0].jwe, f.schluessel), await datensatzAusJwe(L, jwe, f.schluessel));
}
test('[Antwort·QR] Schlüsselpaar: JWE → Serie → GIF → jsQR → Lese-App, gemischte Reihenfolge, byte-gleich und derselbe Datensatz', () =>
  rundweg(async () => {
    const p = await empfangsPaar();
    return { a: anfrage({ art: 'schluesselpaar', an: 'aufnahme@probe.example', publicKeyJwk: p.pub }), opt: {}, schluessel: { privateJwk: p.priv } };
  }));
test('[Antwort·QR] Einmalpasswort: JWE → Serie → GIF → jsQR → Lese-App, gemischte Reihenfolge, byte-gleich und derselbe Datensatz', () =>
  rundweg(async () => ({ a: anfrage({ art: 'einmalpasswort', an: 'aufnahme@probe.example' }), opt: { passwort: EINMAL }, schluessel: { passwort: EINMAL } })));

test('[Antwort·QR·Rot-Beweis] ein fehlender Teil wird benannt und nichts öffnet sich', async () => {
  const { V } = await kernMitDepot();
  const a = anfrage({ art: 'einmalpasswort', an: 'aufnahme@probe.example' });
  const jwe = await V.antwortVerschluesseln(V.anfrageAntwortDatensatz(a, { sensibel: false }), a, { passwort: EINMAL });
  const q = V.antwortQrTeile(jwe, { maxNutzlast: 300 });
  const ohneZweiten = q.teile.filter((t) => t.index !== 2).map((t) => t.rahmen);
  const { funde, fortschritt } = leseAppAufnehmen(ohneZweiten);
  assert.equal(funde.length, 0, 'nichts öffnet sich');
  assert.match(fortschritt[fortschritt.length - 1], /\b2\b/, 'die Meldung nennt den fehlenden Teil 2');
});

test('[Antwort·QR·Rot-Beweis] ein gekipptes Zeichen im Chiffrat lässt GCM scheitern, nichts öffnet sich', async () => {
  const { V } = await kernMitDepot();
  const a = anfrage({ art: 'einmalpasswort', an: 'aufnahme@probe.example' });
  const jwe = await V.antwortVerschluesseln(V.anfrageAntwortDatensatz(a, { sensibel: false }), a, { passwort: EINMAL });
  const t = jwe.split('.');
  t[3] = (t[3][0] === 'A' ? 'B' : 'A') + t[3].slice(1);   // erstes Zeichen des Chiffrats gekippt
  const q = V.antwortQrTeile(t.join('.'), { maxNutzlast: 300 });
  const { L, funde } = leseAppAufnehmen(q.teile.map((x) => x.rahmen));
  assert.equal(funde.length, 1, 'die Serie setzt sich zusammen');
  await assert.rejects(() => datensatzAusJwe(L, funde[0].jwe, { passwort: EINMAL }), 'GCM weist das gekippte Chiffrat ab');
});

test('[Antwort·QR·Rot-Beweis] ein Teil einer fremden Gruppe wird nicht eingesetzt', async () => {
  const { V } = await kernMitDepot();
  const a = anfrage({ art: 'einmalpasswort', an: 'aufnahme@probe.example' });
  const ds = V.anfrageAntwortDatensatz(a, { sensibel: false });
  const eins = V.antwortQrTeile(await V.antwortVerschluesseln(ds, a, { passwort: EINMAL }), { maxNutzlast: 300 });
  const zwei = V.antwortQrTeile(await V.antwortVerschluesseln(ds, a, { passwort: EINMAL }), { maxNutzlast: 300 });
  assert.notEqual(eins.teile[0].gruppe, zwei.teile[0].gruppe);
  const texte = eins.teile.map((t) => t.rahmen);
  texte[1] = zwei.teile[1].rahmen;   // fremder Teil an der Stelle des zweiten
  const { funde } = leseAppAufnehmen(texte);
  assert.equal(funde.length, 0, 'aus zwei Gruppen öffnet sich nichts');
});

test('[Antwort·QR·Rot-Beweis] über der Grenze: ueberGrenze gesetzt, das Fenster zeigt kein Bild und bietet Datei und Link', async () => {
  const k = await kernMitDepot();
  const { V, document } = k;
  const lang = 'x'.repeat(600 * 13);   // 13 Teile, die Grenze ist ANLASS_QR_TEILE_MAX = 12
  const q = V.antwortQrTeile(lang);
  assert.equal(q.anzahl, 13);
  assert.equal(q.ueberGrenze, true);
  assert.equal(V.antwortQrTeile('x'.repeat(600 * 12)).ueberGrenze, false, 'genau an der Grenze noch als Serie');
  let geladen = 0, gesendet = 0, gezeigt = 0;
  V._antwortQrZeigen(lang, { herunterladen: () => { geladen++; }, linkSenden: () => { gesendet++; }, gezeigt: () => { gezeigt++; } });
  const html = document.getElementById('modal-inhalt').innerHTML;
  assert.doesNotMatch(html, /<img/, 'kein Bild');
  assert.match(html, /id="antwort-qr-anderer-weg">Höchstens 12 QR-Bilder passen in dieses Fenster\. Diese Antwort braucht 13\./);
  assert.match(html, /id="m-ok">Herunterladen</);
  assert.match(html, /id="m-zweit">Link senden</);
  assert.equal(gezeigt, 0, 'nicht als beantwortet vermerkt');
  document.getElementById('m-zweit').onclick();
  assert.deepEqual([geladen, gesendet], [0, 1]);
  // Unsigniert gibt es keinen Link: nur die Datei.
  V._antwortQrZeigen(lang, { herunterladen: () => { geladen++; }, linkSenden: null });
  assert.doesNotMatch(document.getElementById('modal-inhalt').innerHTML, /id="m-zweit"/);
});

test('[Antwort·QR·Fenster] unter der Grenze: Hinweis mit Leseweg, ein Bild je Teil, beantwortet sobald gezeigt', async () => {
  const { V, document } = await kernMitDepot();
  let gezeigt = 0, geschlossen = 0;
  const q = V._antwortQrZeigen('y'.repeat(1300), { herunterladen: () => {}, linkSenden: null, gezeigt: () => { gezeigt++; }, geschlossen: () => { geschlossen++; } });
  assert.equal(q.anzahl, 3);
  const html = document.getElementById('modal-inhalt').innerHTML;
  assert.equal((html.match(/<img /g) || []).length, 3);
  assert.match(html, /Teil 3 von 3/);
  assert.match(html, /<p class="einst-hint">[^<]*Lese-App[^<]*Websuche/, 'der Hinweis nennt den Leseweg und die Websuche der Kamera');
  assert.equal(gezeigt, 1);
  document.getElementById('m-ok').onclick();
  assert.equal(geschlossen, 1);
});

test('[Antwort·QR·Wahl] die dritte Wahl „Als QR zeigen“, auch ohne Link', () => {
  const { V, document } = ladeKern();
  let qr = 0;
  V._ausgabeWegWaehlen('Antworten', 'a.jwe', () => {}, () => {}, () => { qr++; });
  let html = document.getElementById('modal-inhalt').innerHTML;
  assert.match(html, /id="m-zweit">Link senden</);
  assert.match(html, /id="m-dritt">Als QR zeigen</);
  document.getElementById('m-dritt').onclick();
  assert.equal(qr, 1);
  V._ausgabeWegWaehlen('Antworten', 'a.jwe', () => {}, null, () => { qr++; });
  html = document.getElementById('modal-inhalt').innerHTML;
  assert.match(html, /id="m-zweit">Als QR zeigen</);
  assert.doesNotMatch(html, /id="m-dritt"/);
});

/* Der ANTWORT-JWE-BLOCK bleibt zeichengleich zum Stand vor diesem Bau (u2-kanon 943e97d19). Gemessen per Abdruck des Blocks,
   nicht per Wortsuche. Die Spiegel-Probe in tests/antwort-jwe.test.js hält Kern und Lese-App gleich. */
const BLOCK_ABDRUCK = 'b4a2d0647ce8bf270216c32d6b903f71a574cd4f65b332260dd6132dfbfd9718';
function blockAbdruck(text) {
  const A = '/* ══ ANTWORT-JWE-BLOCK (U2-ADR-449)', E = '/* ══ ENDE ANTWORT-JWE-BLOCK ══ */';
  const a = text.indexOf(A), e = text.indexOf(E);
  assert.ok(a >= 0 && e > a, 'der Block steht im Kern');
  return crypto.createHash('sha256').update(text.slice(a, e + E.length)).digest('hex');
}
test('[Antwort·QR·Krypto-unverändert] der ANTWORT-JWE-BLOCK hat seinen Abdruck', () => {
  assert.equal(blockAbdruck(KERN), BLOCK_ABDRUCK);
});
test('[Antwort·QR·Krypto-unverändert·Rot-Beweis] ein geändertes Zeichen im Block ändert den Abdruck', () => {
  assert.notEqual(blockAbdruck(KERN.replace('const ANTWORT_JWE_P2C = 600000;', 'const ANTWORT_JWE_P2C = 600001;')), BLOCK_ABDRUCK);
});
