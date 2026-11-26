'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Lese-App: Benutzbarkeit zum Launch (22.11.2026) — je Befund eine Probe
   ────────────────────────────────────────────────────────────────────────
   Die Prüfung der Lese-App vom 22.11.2026 fand Stellen, an denen eine Empfängerin hängen bleibt. Je Befund steht hier eine
   Probe, mit der Kennung aus der Prüfung im Namen. Was nur im Browser zu sehen ist (Bereichswechsel bei 375 px, Druck,
   eingefügter Link), prüft dazu tests/e2e/lese-app-benutzbarkeit-launch.spec.js.
     H-1 Hilfe legt sich über die Sicht, mit Rückweg      M-1 Drucken / als PDF sichern     M-5 Passwortfeld
     H-2 Bereichswechsel sichtbar (Menü, Fokus, aria)     M-2 Fassung sichtbar              M-6 eingefügter Freigabe-Link
     H-3 beschädigte Datei ≠ falsches Passwort            M-3 Satz zum Wiederherstellungs-Code   M-9 Wörter
     M-4 Fehler mit Ausweg und Ansage                     N-1 44 px  N-3 „Neu öffnen“  N-4 Fokusring
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { ladeLesen } = require('./load-lesen.js');

const REPO = path.join(__dirname, '..');
const Q = fs.readFileSync(path.join(REPO, 'vivodepot-lesen.html'), 'utf8');
const KERN = fs.readFileSync(path.join(REPO, 'vivodepot.html'), 'utf8');

/* Der Körper einer Funktion der Lese-App, bis zur nächsten Funktion auf oberster Ebene. */
function koerper(name) {
  const a = Q.indexOf('\nfunction ' + name + '(');
  assert.ok(a >= 0, name + ' fehlt');
  const e = Q.indexOf('\nfunction ', a + 10);
  return Q.slice(a, e < 0 ? undefined : e);
}

test('[Lese-Benutzbarkeit·H-1] „Hilfe“ ersetzt #content nicht mehr; die Hilfe trägt „Zurück zu den Angaben“ und blendet die Sicht nur aus', () => {
  const w = koerper('wireTopbar');
  assert.match(w, /addEventListener\('click', hilfeUmschalten\)/);
  assert.doesNotMatch(w, /innerHTML\s*=\s*hilfeEmpfaengerinHTML\(\)/, 'Rot-Beweis: der alte Weg überschrieb die Sicht');
  const u = koerper('hilfeUmschalten');
  assert.doesNotMatch(u, /c\.innerHTML\s*=/, 'die Sicht bleibt stehen');
  assert.match(u, /k\.hidden = true/);
  assert.match(u, /id="btn-hilfe-zurueck"/);
  assert.match(koerper('hilfeSchliessen'), /k\.hidden = false/);
  const { V } = ladeLesen();
  assert.equal(V.STRINGS.hilfeZurueck, 'Zurück zu den Angaben');
  assert.ok(V.LESE_TEXTE_EN.hilfeZurueck, 'englische Fassung');
});

test('[Lese-Benutzbarkeit·H-2] ein Bereichswechsel setzt aria-current, schließt das Menü, gibt dem Inhalt den Fokus; am Handy ein Menüknopf', () => {
  const z = koerper('inhaltZeigen');
  for (const muss of [/setAttribute\('aria-current', 'page'\)/, /navMenueSetzen\(false\)/, /c\.focus\(/, /scrollIntoView/]) assert.match(z, muss);
  const w = koerper('wireSidebar');
  assert.equal((w.match(/inhaltZeigen\(/g) || []).length, 3, 'Bereich, Situation und Angehörigen-Blatt gehen alle über inhaltZeigen');
  assert.doesNotMatch(w, /el\('content'\)\.innerHTML\s*=/, 'Rot-Beweis: kein stiller Tausch mehr');
  assert.match(koerper('renderVollExport'), /navMenueKnopfHTML\(\)/);
  assert.match(koerper('sidebarHTML'), /aria-current="page"/);
  assert.match(Q, /@media \(max-width: 720px\) \{[\s\S]{0,900}\.sidebar \{ display: none;[\s\S]{0,200}\.sidebar\.offen \{ display: block; \}/);
  assert.match(koerper('navMenueKnopfHTML'), /aria-expanded="false" aria-controls="sidebar"/);
});

test('[Lese-Benutzbarkeit·H-3] nur ein Fehlschlag der Entschlüsselung heißt „Passwort passt nicht“; eine kaputte Datei bekommt ihre eigene Meldung', async () => {
  const { V } = ladeLesen();
  // echter Fall: falscher Schlüssel → WebCrypto wirft OperationError
  const k1 = await globalThis.crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
  const k2 = await globalThis.crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
  const iv = globalThis.crypto.getRandomValues(new Uint8Array(12));
  const ct = new Uint8Array(await globalThis.crypto.subtle.encrypt({ name: 'AES-GCM', iv }, k1, new TextEncoder().encode('{"a":1}')));
  const b64 = (u) => Buffer.from(u).toString('base64');
  let falsch = null;
  try { await V.VdCrypto.decryptDepot({ iv: b64(iv), ct: b64(ct) }, k2); } catch (e) { falsch = e; }
  assert.ok(falsch, 'falscher Schlüssel muss werfen');
  assert.equal(V._pwFehlerText(falsch, 1), V.STRINGS.pwFalsch);
  assert.equal(V._pwFehlerText(falsch, 3), V.STRINGS.pwFalschWiederholt, 'ab dem dritten Versuch der Hinweis auf eine beschädigte Datei');
  // echter Fall: beschädigtes Base64 im Umschlag → kein Passwortfehler
  let kaputt = null;
  // decryptDepot liest iv/ct mit atob; der Browser wirft dort InvalidCharacterError. Die Hülle der Proben ersetzt atob durch
  // ein nachsichtiges Buffer-Decode, darum hier das atob von Node, das wie der Browser wirft.
  try { atob('!!!'); } catch (e) { kaputt = e; }
  assert.ok(kaputt, 'kaputtes Base64 muss werfen');
  assert.notEqual(kaputt.name, 'OperationError');
  assert.equal(V._pwFehlerText(kaputt, 1), V.STRINGS.dateiBeschaedigt);
  // Strukturfehler des Zerfall-Lesers und fehlende Felder
  const s = new Error('Laden: zu einem Umschlag fehlt die Einheit.'); s.__vdStruktur = true;
  assert.equal(V._pwFehlerText(s, 1), V.STRINGS.dateiBeschaedigt);
  assert.equal(V._pwFehlerText(new TypeError("Cannot read properties of undefined (reading 'salt')"), 1), V.STRINGS.dateiBeschaedigt);
  // eine Datei mit veränderten Einheiten (kein Base64): Strukturfehler vor jeder Ableitung, nicht „Passwort passt nicht“.
  // Im Browser probierte der Leser sonst nach dem Anker die Fächer, und deren Fehlschlag erschien als falsches Passwort.
  let form = null;
  try { V._umschlagFormPruefen({ einheiten: { a: { iv: '!!!', ct: 'AAAA' } } }); } catch (e) { form = e; }
  assert.ok(form && form.__vdStruktur, 'veränderte Einheit ist ein Strukturfehler');
  assert.equal(V._pwFehlerText(form, 1), V.STRINGS.dateiBeschaedigt);
  assert.doesNotThrow(() => V._umschlagFormPruefen({ einheiten: { a: { iv: 'NacREZzonwPYhV9i', ct: 'caQS+JqyN64xAWtN82f9o4f3/w==' } } }));
  assert.match(fs.readFileSync(path.join(REPO, 'vivodepot-lesen.html'), 'utf8'), /_versionsGate\(umschlag\);[^\n]*\n  _umschlagFormPruefen\(umschlag\);/, 'leseDepotUmschlag prüft die Form vor der Ableitung');
  // beide Passwort-Schirme gehen über dieselbe Wahl; die Entschlüsselung ist unverändert
  assert.match(koerper('renderPasswort'), /_pwFehlerText\(err, versuche\)/);
  assert.match(koerper('renderEmpfaengerQrPasswort'), /_pwFehlerText\(err, versuche\)/);
  assert.match(V.STRINGS.dateiBeschaedigt, /Am Passwort liegt es nicht/);
});

test('[Lese-Benutzbarkeit·M-1] Sichten mit Angaben tragen „Drucken“; der Druck nimmt im vollen Depot alle Bereiche, ohne Bedienung', () => {
  const { V } = ladeLesen();
  assert.match(V.topbarHTML('x', true), /id="btn-drucken"/);
  assert.doesNotMatch(V.topbarHTML('x', false), /id="btn-drucken"/, 'nur, wo Angaben stehen');
  const d = koerper('drucken');
  assert.match(d, /window\.print\(\)/);
  assert.match(d, /for \(const b of bereicheSichtbarLesen\(\)\)/);
  assert.match(d, /afterprint/);
  assert.match(Q, /@media print \{[\s\S]{0,300}\.topbar, \.sprunglink, \.sidebar, \.nav-menue-knopf, #hilfe-ansicht, \.btn/);
  assert.equal(V.STRINGS.druckenTitel, 'Drucken oder als PDF sichern');
});

test('[Lese-Benutzbarkeit·M-2] die Fassung steht am Herkunftsort und folgt dem Kern (BUILD_VERSION, SCHALEN_STAND, BUILD_DATUM)', () => {
  const W = require('../tools/lese-fassung-schreiben.js');
  const soll = W.fassungAusKern(KERN);
  const { V } = ladeLesen();
  assert.deepEqual({ name: V.LESE_FASSUNG.name, datum: V.LESE_FASSUNG.datum }, soll,
    'Region LESE-FASSUNG weicht vom Kern ab — node tools/lese-fassung-schreiben.js');
  assert.match(soll.name, /^v\d+\.\d+\.\d+$/);
  assert.match(V.leseFassungHTML(), new RegExp('Fassung ' + soll.name.replace(/\./g, '\\.') + ' vom '));
  assert.doesNotMatch(V.herkunftsortHTML(), /Fassung/, 'die Fassung steht unter dem Herkunftsort, nicht darin (34.7)');
  // Rot-Beweis: ein anderer SCHALEN_STAND ergibt eine andere Fassung
  const anders = W.fassungAusKern(KERN.replace(/^const SCHALEN_STAND = 'v(\d+)'/m, (m, n) => "const SCHALEN_STAND = 'v" + (Number(n) + 1) + "'"));
  assert.notEqual(anders.name, soll.name);
});

test('[Lese-Benutzbarkeit·M-3] der Passwortschirm sagt der Inhaberin, welches Passwort gilt und wo der Wiederherstellungs-Code hilft', () => {
  const { V } = ladeLesen();
  assert.match(V.STRINGS.pwHintVoll, /Wiederherstellungs-Code/);
  assert.match(V.LESE_TEXTE_EN.pwHintVoll, /recovery code/);
});

test('[Lese-Benutzbarkeit·M-4] Fehlerschirm und Fehlerblöcke werden angesagt und nennen den nächsten Schritt', () => {
  const { V } = ladeLesen();
  assert.match(koerper('renderHinweisMitZurueck'), /role="alert"/);
  assert.match(koerper('renderHinweisMitZurueck'), /\.focus\(\)/);
  assert.match(V._pwFeldHTML(), /id="pw-fehler" role="alert"/);
  assert.match(koerper('renderEinfuegen'), /id="qr-fehler" role="alert"/);
  for (const k of ['dateiUnlesbar', 'qrUnlesbar', 'formatUnbekannt']) assert.match(V.STRINGS[k], /Bitten Sie|Prüfen Sie/, k + ' nennt den nächsten Schritt');
});

test('[Lese-Benutzbarkeit·M-5] das Passwortfeld hat eine Beschriftung, einen Schalter zum Anzeigen und behält die Eingabe nach einem Fehlversuch', () => {
  const { V } = ladeLesen();
  const h = V._pwFeldHTML();
  assert.match(h, /<label class="pw-label" for="pw-feld">/);
  assert.match(h, /aria-describedby="pw-fehler"/);
  assert.match(h, /id="pw-anzeigen"/);
  assert.equal((Q.match(/_pwFeldHTML\(\) \+/g) || []).length, 2, 'beide Passwort-Schirme');
  for (const f of ['renderPasswort', 'renderEmpfaengerQrPasswort']) {
    const c = koerper(f).split('} catch (err) {')[1] || '';
    assert.ok(c, f + ': catch fehlt');
    assert.doesNotMatch(c, /el\('pw-feld'\)\.value = ''/, f + ': Rot-Beweis — die Eingabe wurde nach jedem Fehler geleert');
  }
  assert.match(koerper('_pwFehlerZeigen'), /feld\.select\(\)/);
});

test('[Lese-Benutzbarkeit·M-6] ein eingefügter Freigabe-Link führt zur Passwortabfrage; der Text bleibt nach einem Fehler stehen', () => {
  const v = koerper('verarbeiteQrText');
  const re = /#eqr=([A-Za-z0-9_\-+/=]+)\s*$/;
  assert.ok(v.includes('/#eqr=([A-Za-z0-9_\\-+/=]+)\\s*$/'), 'Link-Erkennung in verarbeiteQrText, dieselbe Form wie hier');
  assert.match(v, /renderEmpfaengerQrPasswort\(link\[1\]\)/);
  assert.equal(re.exec('https://beispiel.invalid/vivodepot-lesen.html#eqr=eyJ2IjoyfQ')[1], 'eyJ2IjoyfQ');
  assert.equal(re.exec('VIVODEPOT NOTFALL\nName: A'), null);
  const r = koerper('renderEinfuegen');
  assert.doesNotMatch(r.split("addEventListener('click', () => {\n    const text")[1] || '', /\n    el\('qr-text'\)\.value = '';\n/, 'Rot-Beweis: das Feld wurde nach jedem Versuch geleert');
});

test('[Lese-Benutzbarkeit·M-9] der Eingang und die Fehlersätze sprechen ohne Dateiformat-Namen', () => {
  const { V } = ladeLesen();
  const texte = ['wegDatei', 'wegDateiHint', 'wegEinfuegen', 'wegEinfuegenHint', 'pwHintSub', 'fachAbgelaufen', 'formatUnbekannt'].map((k) => V.STRINGS[k]).join(' | ');
  for (const wort of ['QR-Text', 'Sub-Depot-Export', 'Vivodepot-JSON', 'übergebenes Sub-Depot', 'Fach galt', 'Zwischenablage']) {
    assert.ok(!texte.includes(wort), '„' + wort + '“ steht noch im Text: ' + texte);
  }
  for (const k of ['wegDatei', 'wegEinfuegen', 'pwHintSub', 'fachAbgelaufen', 'formatUnbekannt']) assert.ok(V.LESE_TEXTE_EN[k], k + ' englisch');
});

test('[Lese-Benutzbarkeit·N-1/N-3/N-4] Schaltflächen 44 px hoch, sichtbarer Tastaturfokus, nach dem Schließen „Neu öffnen“', () => {
  const { V } = ladeLesen();
  assert.match(Q, /\.btn, \.nav-item \{ min-height: 44px; \}/);
  assert.match(Q, /\.btn:focus-visible, \.nav-item:focus-visible/);
  assert.match(koerper('onSchliessen'), /STRINGS\.neuOeffnen/);
  assert.equal(V.STRINGS.neuOeffnen, 'Neu öffnen');
});

test('[Lese-Benutzbarkeit·Bild] der Rückweg aus der Hilfe ist neutral, die Links am Herkunftsort tragen die Farbe des Produkts', () => {
  // Bildbefund 22.11.2026: in der Notfall-Sicht erbte „Zurück zu den Angaben“ deren Rot und las sich wie eine Meldung;
  // „Impressum“ und „Datenschutzerklärung“ standen in Browser-Blau. Die berechneten Farben misst tests/e2e/lese-app-benutzbarkeit-launch.spec.js.
  assert.match(Q, /\.hilfe-zurueck \{[^}]*color: var\(--tinte\);[^}]*border-color: var\(--tinte-weich\);/);
  assert.match(Q, /\.herkunftsort a \{ color: var\(--akzent\);/);
});
