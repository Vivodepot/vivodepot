'use strict';
/* ═══════════════════════════════════════════════════════════
   „Link senden“ an der Antwort an eine Stelle und am Anlass-Auszug (L1b, 19.10.2026)
   ───────────────────────────────────────────────────────────
   Die Produktverantwortung hat „Link senden“ am 19.10.2026 freigegeben, nach der Vorschau aus dem Kern
   (Spezifikationen-und-Konzepte/…/ZUM-ANSEHEN-2026-10-19-link-senden/). Krypto-Bedingungen aus dem RbB vom 19.10.2026:
   K1  Der Link trägt genau die Datei, die „Herunterladen“ ausgäbe, und nur eine signierte Antwort (Kopf cty JWT).
       Rot-Beweis: ohne die Prüfung ginge eine unsignierte Antwort über den Link.
   K2  Die Antwort reist als Binary mit contentType application/jose, nicht als octet-stream.
   K3  Der Link-Schlüssel steht nur im Link, nie in der Datei für die Ablage.
   K4  Die Abholseite gibt die Antwort unverändert als .jwe weiter und öffnet die innere Hülle nie.
   Dazu die Bedienung: die Wahl „Herunterladen“ / „Link senden“, „Link kopieren“ und QR im Ergebnis, die Knopfleiste bricht
   auf dem Telefon um.
   ═══════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const vm = require('node:vm');
const nodeCrypto = require('node:crypto');
const { ladeKern } = require('./load-kern.js');

const WURZEL = path.join(__dirname, '..');
const KERN = fs.readFileSync(path.join(WURZEL, 'vivodepot.html'), 'utf8');
const PW = 'link-senden-antwort-2026';
const EINMAL = 'Einmal-Link-Probe-7fQ2-kP9x';
const b64uToBuf = (s) => Buffer.from(String(s), 'base64url');
const kopfVon = (jwe) => JSON.parse(b64uToBuf(jwe.split('.')[0]).toString('utf8'));

function jweEntschluesseln(jwe, keyB64u) {
  const [protHdr, , ivB, ctB, tagB] = String(jwe).split('.');
  const d = nodeCrypto.createDecipheriv('aes-256-gcm', b64uToBuf(keyB64u), b64uToBuf(ivB));
  d.setAAD(Buffer.from(protHdr, 'ascii'));
  d.setAuthTag(b64uToBuf(tagB));
  return Buffer.concat([d.update(b64uToBuf(ctB)), d.final()]);
}
function anfrage() {
  return { modulTyp: 'anfrage', anfrageVersion: 1, von: 'Clinica Esempio', anbieterId: 'klinik/esempio', zweck: 'Notaufnahme',
    grundlage: 'Behandlung', vorgang: 'PS-2026-1019', gestelltAm: '2026-10-19', gueltigBis: '2099-12-31',
    felder: [{ kennung: 'identity.givenName', zweck: 'Anrede', pflicht: true }], antwort: { art: 'einmalpasswort' } };
}
async function antwort(V) {
  await V.depotAnlegen(PW);
  V.akteurSelbstErklaeren('Hedwig Brandt');
  V.sektorFeldSetzen('identity', 'givenName', 'Hedwig');
  const a = anfrage();
  return V.antwortVerschluesseln(V.anfrageAntwortDatensatz(a, { sensibel: false }), a, { passwort: EINMAL });
}
function kernVariante(alt, neu) {
  assert.equal(KERN.split(alt).length, 2, 'Vorbedingung: genau einmal: ' + alt);
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'vd-link-senden-antwort-'));
  const p = path.join(dir, 'vivodepot.html');
  fs.writeFileSync(p, KERN.replace(alt, neu));
  process.on('exit', () => { try { fs.rmSync(dir, { recursive: true, force: true }); } catch (_) {} });
  return ladeKern({ Blob, htmlPfad: p, backen: true }).V;
}
const KERN_OHNE_ED25519 = ['async function ed25519Verfuegbar() {', 'async function ed25519Verfuegbar() { return false;'];

test('[Link senden·Antwort·K1/K2] der Link trägt genau die signierte Antwort, als Binary application/jose', async () => {
  const { V } = ladeKern({ Blob });
  const jwe = await antwort(V);
  assert.equal(kopfVon(jwe).cty, 'JWT', 'Vorbedingung: die Antwort ist signiert');
  assert.equal(V.antwortTraegtSignatur(jwe), true);
  const teile = await V.antwortLinkTeile(jwe, { label: 'Notaufnahme' });
  const binary = JSON.parse(jweEntschluesseln(teile.jwe, teile.key).toString('utf8'));
  assert.equal(binary.resourceType, 'Binary');
  assert.equal(binary.contentType, 'application/jose', 'K2');
  assert.equal(Buffer.from(binary.data, 'base64').toString('utf8'), jwe, 'K1: byte-gleich mit der Datei für „Herunterladen“');
});

test('[Link senden·Antwort·K1] eine unsignierte Antwort geht nicht über den Link', async () => {
  const V = kernVariante(...KERN_OHNE_ED25519);
  const jwe = await antwort(V);
  assert.notEqual(kopfVon(jwe).cty, 'JWT', 'Vorbedingung: ohne Ed25519 bleibt die Antwort unsigniert');
  assert.equal(V.antwortTraegtSignatur(jwe), false);
  await assert.rejects(V.antwortLinkTeile(jwe), /antwort-link-unsigniert/);
  assert.equal(V.antwortTraegtSignatur('kein.jwe'), false);
  assert.equal(V.antwortTraegtSignatur('e30.a.b.c.d'), false, 'ein Kopf ohne cty');
});

test('[Link senden·Antwort·K1·Rot-Beweis] ohne die Prüfung ginge die unsignierte Antwort über den Link', async () => {
  const V = kernVariante("  if (!antwortTraegtSignatur(jwe)) throw new Error('antwort-link-unsigniert');\n", '');
  const W = kernVariante(...KERN_OHNE_ED25519);
  const unsigniert = await antwort(W);
  const teile = await V.antwortLinkTeile(unsigniert);
  assert.ok(teile && teile.jwe, 'genau die Lücke: der Link entsteht');
});

test('[Link senden·Antwort·K3] der Schlüssel steht nur im Link, nicht in der Datei für die Ablage', async () => {
  const { V } = ladeKern({ Blob });
  const teile = await V.antwortLinkTeile(await antwort(V));
  assert.equal(teile.key.length, 43);
  // Entpackt gesucht: jeder Teil der kompakten JWE base64url-dekodiert (der Kopf ist JSON), dazu der Text selbst.
  const entpackt = [teile.jwe].concat(teile.jwe.split('.').map((t) => Buffer.from(t, 'base64url').toString('latin1')));
  assert.equal(entpackt.some((t) => t.includes(teile.key)), false, 'nicht in der Datei, auch nicht im dekodierten Kopf');
  const uri = V.shlUriBauen(teile, 'https://share.vivodepot.de/holen.php?t=' + 'a'.repeat(48));
  const payload = JSON.parse(b64uToBuf(uri.slice('shlink:/'.length)).toString('utf8'));
  assert.equal(payload.key, teile.key, 'im Link');
  assert.equal(payload.url.includes(teile.key), false, 'nicht in der Adresse der Ablage');
});

/* K4 an der Abholseite: die Funktion binaerDatei aus share/empfangen.js, in einer leeren Umgebung ausgeführt. */
function abholseite() {
  const quelle = fs.readFileSync(path.join(WURZEL, 'share', 'empfangen.js'), 'utf8');
  const a = quelle.indexOf('const BINAER_ENDUNGEN');
  const e = quelle.indexOf('\n}\n', quelle.indexOf('function binaerDatei(', a)) + 3;
  assert.ok(a > 0 && e > a, 'Vorbedingung: binaerDatei steht in der Abholseite');
  const ctx = { TextDecoder, atob, Uint8Array, Object, JSON };
  vm.runInNewContext(quelle.slice(a, e) + '\nthis.binaerDatei = binaerDatei;', ctx);
  return { binaerDatei: ctx.binaerDatei, quelle };
}

test('[Link senden·Antwort·K4] die Abholseite gibt die Antwort unverändert als .jwe weiter und öffnet sie nicht', async () => {
  const { V } = ladeKern({ Blob });
  const jwe = await antwort(V);
  const teile = await V.antwortLinkTeile(jwe);
  const { binaerDatei, quelle } = abholseite();
  const d = binaerDatei(new Uint8Array(jweEntschluesseln(teile.jwe, teile.key)));
  assert.equal(d.typ, 'application/jose');
  assert.equal(d.endung, 'jwe');
  assert.equal(Buffer.from(d.inhalt).toString('utf8'), jwe, 'dieselbe Datei wie „Herunterladen“');
  assert.equal((quelle.match(/subtle\.decrypt\(/g) || []).length, 1, 'die Seite entschlüsselt genau einmal: die Hülle des Links');
  assert.equal(binaerDatei(new TextEncoder().encode(JSON.stringify({ resourceType: 'Binary', contentType: 'text/html', data: 'PGI+' }))),
    null, 'ein Typ außerhalb der Liste bleibt die Hülle');
  assert.equal(binaerDatei(new TextEncoder().encode('{"resourceType":"Bundle"}')), null, 'FHIR bleibt FHIR');
});

test('[Link senden·Wahl] nach „Antworten“: „Herunterladen“ und „Link senden“, im Körper nur der Dateiname', () => {
  const { V, document } = ladeKern();
  assert.equal(V.LINK_SENDEN_FUER_AUSZUEGE, true);
  let geladen = 0, gesendet = 0;
  V._ausgabeWegWaehlen('Antworten', 'Vivodepot_Antwort_PS-2026-1019.jwe', () => { geladen++; }, () => { gesendet++; });
  const box = document.getElementById('modal-inhalt');
  const html = box.innerHTML;
  assert.match(html, /<p class="einst-hint" id="ausgabe-datei">Vivodepot_Antwort_PS-2026-1019\.jwe<\/p>/);
  assert.match(html, /id="m-zweit">Link senden</);
  assert.match(html, /id="m-ok">Herunterladen</);
  assert.match(html, /id="m-abbr">/, 'Abbrechen bleibt');
  document.getElementById('m-zweit').onclick();
  assert.deepEqual([geladen, gesendet], [0, 1]);
});

test('[Link senden·Wege] Antwort und Anlass-Auszug fragen nach dem Weg, die Antwort nur signiert', () => {
  const rumpf = (name) => { const a = KERN.indexOf('function ' + name + '('); return KERN.slice(a, KERN.indexOf('\n}\n', a)); };
  const antwortWeg = rumpf('_anfrageAntwortSchreiben');
  assert.match(antwortWeg, /if \(!LINK_SENDEN_FUER_AUSZUEGE \|\| !antwortTraegtSignatur\(jwe\)\) return herunterladen\(\);/);
  assert.match(antwortWeg, /_ausgabeWegWaehlen\(STRINGS\.anfrageAntwortenCta, name, herunterladen,/);
  assert.match(antwortWeg, /flowLinkSenden\(\(o\) => antwortLinkTeile\(jwe, o\)/);
  const anlassWeg = rumpf('flowAnlassExport');
  assert.match(anlassWeg, /_ausgabeWegWaehlen\(def\.titel \|\| def\.id, dateiBasis \+ '\.json', herunterladen,/);
  assert.match(anlassWeg, /flowLinkSenden\(\(o\) => auszugLinkTeile\(blob,/);
});

test('[Link senden·Ergebnis] der Dialog: kurzer Gültig-Satz, kein Einführungssatz; nach dem Bauen „Link kopieren“, der QR desselben Links und der Link nur eingeklappt', async () => {
  const { V, document } = ladeKern({ Blob });
  const teile = await V.auszugLinkTeile(new Blob(['{"a":1}'], { type: 'application/json' }), { label: 'Krankenhaus' });
  V._shlDialogZeigen(teile, { titel: 'Link senden', gueltigBis: V.STRINGS.linkSendenGueltigBis });
  const html = document.getElementById('modal-inhalt').innerHTML;
  assert.doesNotMatch(html, /Schlüssel/, 'kein Einführungssatz mit „Schlüssel“ (Vorschau 19.10.2026)');
  assert.match(html, /Gültig bis \d{4}-\d{2}-\d{2}\.</, 'der kurze Gültig-Satz');
  assert.match(html, /id="shl-url"/); assert.match(html, /id="shl-bauen"/);
  /* Das Klicken (Bauen → Host bestätigen → Ergebnis) braucht einen echten DOM; der Test-DOM liefert für querySelector je Aufruf
     ein leeres Element. Geprüft im Browser beim Bilderlauf (Bericht); hier hält die Probe den Quelltext des Ergebnisses. */
  const a = KERN.indexOf('function _shlLinkKopierenUndQr(');
  const rumpf = KERN.slice(a, KERN.indexOf('\n}\n', a));
  assert.match(rumpf, /\.id = 'shl-kopieren'/);
  assert.match(rumpf, /\.textContent = String\(STRINGS\.linkKopierenKnopf/);
  assert.match(rumpf, /\.id = 'shl-qr'/);
  assert.match(rumpf, /addData\(uri\)/, 'der QR trägt denselben Link');
  assert.doesNotMatch(KERN, /<textarea id="shl-uri"/, 'kein rohes Textfeld mehr (Freigabe 19.10.2026)');
  assert.match(rumpf, /createElement\('details'\)/, 'der Link nur eingeklappt');
  assert.match(rumpf, /\.textContent = String\(STRINGS\.linkAnzeigen/, '„Link anzeigen“ aus dem Textsatz');
  assert.match(rumpf, /ui\.toast\(STRINGS\.linkKopiert, 'ok'\)/, 'nach dem Kopieren der Toast');
  assert.doesNotMatch(rumpf, /innerHTML/, 'Knoten mit textContent, keine HTML-Senke');
});

test('[Link senden·Telefon] die Knopfleiste eines Dialogs bricht unter 460 px um (sonst ist „Herunterladen“ abgeschnitten)', () => {
  const css = fs.readFileSync(path.join(WURZEL, 'tools', 'erscheinung', 'stil', 'grundlage.css'), 'utf8');
  const a = css.indexOf('@media (max-width: 460px) {');
  assert.ok(a > 0, 'Vorbedingung: der Telefon-Abschnitt');
  const abschnitt = css.slice(a, css.indexOf('\n  }\n', a));
  assert.match(abschnitt, /\.modal-aktionen \{ flex-wrap: wrap; \}/);
});
