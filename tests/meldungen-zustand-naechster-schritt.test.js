'use strict';
/* Meldungen, die beunruhigen (Abnahme der Privatversion, 12.11.2026). Eine Person ohne Technikkenntnis sah drei Meldungen und
   wusste danach nicht, ob sie etwas tun muss:
     1. direkt nach dem Anlegen „Ihre Datei ist nicht aktuell“ (Meldung über dem Inhalt);
     2. im Kopf die Erklärung „Dieses Gerät kann den internen Speicher jederzeit freiräumen — sichern Sie …“;
     3. nach dem Öffnen „Depot entschlüsselt und geöffnet.“
   Jetzt gilt: jede Stelle nennt einen Zustand und, wo etwas zu tun ist, den nächsten Schritt mit Knopf.
     1. Nach dem Anlegen erscheint keine Meldung. Der Zustand steht im Kopf (ⓘ neben dem Speicherstatus).
     2. Das Blatt hinter dem ⓘ nennt den Stand („Sicherungskopie: noch keine“), einen ruhigen Satz zum Sachverhalt und den Knopf
        „Sicherungskopie erstellen“ — derselbe Weg wie im Menü „Mein Depot“.
     3. Nach dem Öffnen nennt die kurze Meldung den Zustand („Ihr Depot ist geöffnet.“), keinen technischen Vorgang.
   Nachtrag U2-ADR-211 (12.11.2026): der Hinweis ohne bekannten Stand bleibt unbedingt, als Zustand mit Knopf an zwei Stellen —
   (a) im Blatt am Speicherstatus, (b) als Zeile auf der Übersicht, sobald das Depot Angaben trägt (auch der Name aus dem Anlegen). Eine Bedingung für beide:
   exportErinnerungModell().ohneSicherungskopie.
   Wächter gegen die Klasse: keine Erfolgsmeldung (ui.toast(STRINGS.<k>, 'ok')) des Kerns meldet einen Verschlüsselungsvorgang
   als Vollzug, DE und EN.
   Rot-Beweise: ein Kern, der die Erinnerung wieder als Meldung zeigt; die früheren Wortlaute. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { ladeKern } = require('./load-kern.js');

const REPO = path.join(__dirname, '..');
const KERN = fs.readFileSync(path.join(REPO, 'vivodepot.html'), 'utf8');
const TEXTE = {
  DE: JSON.parse(fs.readFileSync(path.join(REPO, 'tools', 'textsatz-de-modul.json'), 'utf8')).texte,
  EN: JSON.parse(fs.readFileSync(path.join(REPO, 'tools', 'textsatz-en-modul.json'), 'utf8')).texte,
};
const ZUSATZ = { indexedDB: {}, zusatzBindungen: ['exportErinnerungHinweisText', 'speicherHinweisOeffnen', 'renderSaveStatus', 'vorschauHatDaten'] };
const FALSCHER_ZUSTAND = /nicht aktuell|not up to date/i;

function classListMitZustand() {
  const s = new Set();
  return { add: (k) => s.add(k), remove: (k) => s.delete(k), toggle: (k, an) => ((an === undefined ? !s.has(k) : an) ? s.add(k) : s.delete(k)), contains: (k) => s.has(k) };
}
const dateiAttrappe = { name: 'probe.vivodepot', createWritable: async () => ({ write: async () => {}, close: async () => {} }) };

/* Ein frisches Depot, wie nach dem Anlegen; die Meldungen werden ab dem ersten Schritt mitgeschnitten. */
async function frischAngelegt(opt) {
  const k = ladeKern(Object.assign({ showSaveFilePicker: async () => dateiAttrappe }, ZUSATZ, opt || {}));
  const toasts = [];
  k.V.ui.toast = (text, art, aktion) => toasts.push({ text: String(text), art, aktion });
  await k.V.depotAnlegen('meldungen-zustand-pw');
  k.V.akteurSelbstErklaeren('Maria');
  return Object.assign(k, { toasts });
}

/* Rein: Funde an den Meldungen nach dem Anlegen. */
function anlegeMeldungsFunde(V, toasts) {
  const aus = [];
  for (const t of toasts) {
    if (t.text === String(V.STRINGS.saveStatusKeineDatei) || FALSCHER_ZUSTAND.test(t.text)) aus.push('Meldung behauptet einen veralteten Stand: ' + t.text);
    for (const k of ['exportErinnerung', 'exportErinnerungRisiko', 'exportErinnerungZustand', 'exportErinnerungWebkit']) {
      const anfang = String(V.STRINGS[k] || '').split('{')[0].slice(0, 30);
      if (anfang.length > 10 && t.text.startsWith(anfang)) aus.push('Erinnerung als Meldung: ' + t.text.slice(0, 40));
    }
  }
  return aus;
}

/* Rein: Funde an einem Satz, der einen Zustand nennen soll (Ton: kein Alarm, kein „nur“, keine Aufforderung als Befehl). */
const UNRUHE = [/jederzeit/i, /at any time/i, /damit nichts verloren/i, /nothing gets lost/i, /^sichern Sie\b/i, /—\s*sichern Sie/i, /—\s*back up\b/i, /\bnur\b/i, /\bonly\b/i, /!/];
function zustandsSatzFunde(text) {
  return UNRUHE.filter((r) => r.test(String(text))).map((r) => 'unruhig (' + r + '): ' + String(text).slice(0, 60));
}

/* Rein: Funde an einer Erfolgsmeldung, die einen technischen Vorgang als Vollzug meldet. */
const VORGANG = /entschlüssel|verschlüssel|decrypt|encrypt/i;
function erfolgsMeldungsKennungen(kern) {
  const re = /ui\.toast\(STRINGS\.([A-Za-z0-9_]+), 'ok'/g;
  const aus = new Set(); let m;
  while ((m = re.exec(kern))) aus.add(m[1]);
  return [...aus];
}
function vorgangsFunde(kern, texte) {
  const aus = [];
  for (const k of erfolgsMeldungsKennungen(kern)) {
    for (const [sprache, satz] of Object.entries(texte)) {
      const v = satz['strings:' + k + '.text'];
      if (typeof v === 'string' && VORGANG.test(v)) aus.push(sprache + ' ' + k + ': „' + v + '“');
    }
  }
  return aus;
}

/* ── 1 · Nach dem Anlegen ───────────────────────────────────────────────────── */

test('[Meldungen·1] nach dem Anlegen erscheint keine Meldung, die einen veralteten Stand behauptet; der Speicherstatus steht nicht auf Fehler', async () => {
  const { V, document, toasts } = await frischAngelegt();
  document.getElementById('tb-save-status').classList = classListMitZustand();
  assert.equal(V.exportErinnerungVielleichtZeigen(), true, 'Vorbedingung: die Erinnerung ist fällig (noch keine Sicherungskopie)');
  V.__zusatz.renderSaveStatus();
  assert.deepEqual(anlegeMeldungsFunde(V, toasts), []);
  assert.deepEqual(toasts.filter((t) => t.art === 'info' || t.art === 'warn'), [], 'überhaupt keine Hinweis-Meldung nach dem Anlegen');
  assert.equal(V.saveStatusModell().zustand, 'intern-aktuell', 'der Zustand ist ruhig: auf diesem Gerät gespeichert');
  assert.equal(document.getElementById('tb-save-status').classList.contains('ist-fehlgeschlagen'), false, 'kein Fehler-Zustand (rote Fläche)');
});

test('[Meldungen·1·Rot-Beweis] ein Kern, der die Erinnerung wieder als Meldung zeigt, fällt durch', async () => {
  const anker = "    try { renderSaveStatus(); } catch (_) { /* Hinweis ist optional, nie blockierend */ }";
  assert.equal(KERN.split(anker).length - 1, 1, 'Vorbedingung: Anker');
  const tmp = path.join(os.tmpdir(), 'meldungen-zustand-rot-' + process.pid + '.html');
  fs.writeFileSync(tmp, KERN.replace(anker, "    ui.toast(STRINGS.saveStatusKeineDatei, 'info');\n" + anker));
  try {
    const { V, toasts } = await frischAngelegt({ htmlPfad: tmp, backen: true });
    V.exportErinnerungVielleichtZeigen();
    assert.ok(anlegeMeldungsFunde(V, toasts).length > 0, 'die Probe oben wäre rot: ' + JSON.stringify(toasts));
  } finally { fs.unlinkSync(tmp); }
});

/* ── 2 · Der Zustand im Kopf ────────────────────────────────────────────────── */

test('[Meldungen·2] das ⓘ öffnet den Zustand mit dem nächsten Schritt: „Sicherungskopie: noch keine“ und der Knopf „Sicherungskopie erstellen“', async () => {
  const { V, document, toasts } = await frischAngelegt();
  V.__zusatz.renderSaveStatus();
  const info = document.getElementById('tb-save-info');
  assert.equal(info.hidden, false, 'das ⓘ steht da, solange keine Sicherungskopie besteht');
  info.onclick();
  const b = info._infoBlatt;
  assert.ok(b && b.hidden === false, 'das Blatt ist offen');
  assert.equal(b._titel.textContent, 'Auf diesem Gerät aktuell', 'der Titel ist der Zustand');
  assert.equal(b._stand.hidden, false);
  assert.equal(b._stand.textContent, 'Sicherungskopie: noch keine');
  assert.deepEqual(zustandsSatzFunde(b._text.textContent), [], 'der Satz nennt den Sachverhalt ruhig');
  assert.equal(b._aktion.textContent, 'Sicherungskopie erstellen', 'der nächste Schritt als Knopf, Beschriftung wie im Menü');
  assert.equal(b._aktion.className, 'btn');
  const vorher = toasts.length;
  b._aktion.onclick();
  assert.equal(b.hidden, true, 'der Knopf schließt das Blatt');
  assert.ok(toasts.slice(vorher).some((t) => t.text === String(V.STRINGS.sicherungskopieErstelltToast) || t.text === String(V.STRINGS.sicherungskopieErstelltToastVerwaltete)),
    'der Knopf geht denselben Weg wie der Menüpunkt (sicherungskopieErstellen meldet „wird erstellt“)');
  const quelle = KERN.slice(KERN.indexOf('function speicherHinweisOeffnen()'), KERN.indexOf('\n}\n', KERN.indexOf('function speicherHinweisOeffnen()')));
  assert.match(quelle, /b\._aktion\.onclick = function \(\) \{[^\n]*sicherungskopieErstellen\(\); \};/);
  assert.ok(!/innerHTML/.test(quelle), 'das Blatt setzt nur Text, kein HTML');
});

test('[Meldungen·2·Gegenprobe] mit Sicherungskopie: kein ⓘ, nichts zu tun; mit altem Stand: Tage und Änderungen statt „noch keine“', async () => {
  const k1 = await frischAngelegt();
  k1.V.markiereAlsDateiGesichert();
  k1.V.__zusatz.renderSaveStatus();
  assert.equal(k1.document.getElementById('tb-save-info').hidden, true, 'frisch gesichert: kein ⓘ');
  assert.equal(k1.V.__zusatz.exportErinnerungHinweisText(), null);

  const k2 = await frischAngelegt();
  k2.V.markiereAlsDateiGesichert();
  k2.V.getData().sicherungsStand.letzteDateiIso = new Date(Date.now() - 20 * 86400000).toISOString();
  k2.V.getData().sicherungsStand.aenderungenDanach = 3;
  assert.ok(k2.V.__zusatz.exportErinnerungHinweisText(), 'Vorbedingung: nach 20 Tagen ist die Erinnerung fällig');
  k2.V.__zusatz.speicherHinweisOeffnen();
  const b = k2.document.getElementById('tb-save-info')._infoBlatt;
  assert.ok(b && b.hidden === false, 'das Blatt ist offen');
  assert.equal(b._stand.hidden, true, 'mit bekanntem Stand kein „noch keine“');
  assert.match(b._text.textContent, /20/, 'der Satz nennt die Tage');
  assert.equal(b._aktion.textContent, 'Sicherungskopie erstellen');
});

test('[Meldungen·2] der Satz zum Speicher und der Stand sind ruhig gefasst, DE und EN; „noch keine“ steht in beiden Sprachen', () => {
  for (const [sprache, satz] of Object.entries(TEXTE)) {
    for (const k of ['exportErinnerung', 'exportErinnerungRisiko', 'sicherungskopieNochKeine', 'geoeffnet']) {
      const v = satz['strings:' + k + '.text'];
      assert.equal(typeof v, 'string', sprache + ' ' + k + ' fehlt');
      assert.deepEqual(zustandsSatzFunde(v), [], sprache + ' ' + k);
    }
  }
  assert.equal(TEXTE.DE['strings:sicherungskopieNochKeine.text'], 'Sicherungskopie: noch keine');
  assert.equal(TEXTE.EN['strings:sicherungskopieNochKeine.text'], 'Backup copy: none yet');
});

test('[Meldungen·2·Rot-Beweis] die früheren Wortlaute fallen durch', () => {
  assert.ok(zustandsSatzFunde('Dieses Gerät kann den internen Speicher jederzeit freiräumen — sichern Sie Ihr Depot als Datei, damit nichts verloren geht.').length > 0);
  assert.ok(zustandsSatzFunde('This device can clear its internal storage at any time — back up your depot as a file so nothing gets lost.').length > 0);
});

/* ── 2b · Die Zeile auf der Übersicht (Nachtrag U2-ADR-211) ───────────────────── */

/* Rein: Funde an der Übersicht, gemessen am HTML von renderErledigen. `erwartet` sagt, ob die Zeile stehen soll. */
function uebersichtFunde(V, html, erwartet) {
  const zeile = /<div class="erledigen-whc" data-erledigen-sicherung="1" role="note"><p>([^<]*)<\/p><button type="button" class="btn btn-sek" id="erledigen-sicherungskopie">([^<]*)<\/button><\/div>/.exec(html);
  if (!erwartet) return zeile ? ['die Zeile steht, obwohl nichts zu tun ist'] : [];
  if (!zeile) return ['die Zeile „Sicherungskopie: noch keine“ fehlt auf der Übersicht'];
  const aus = [];
  if (zeile[1] !== String(V.STRINGS.sicherungskopieNochKeine)) aus.push('Zustand: ' + zeile[1]);   // ohne Download; nach einem Download: tests/meldungen-erster-weg.test.js [P1]
  if (zeile[2] !== String(V.STRINGS.sicherungskopieMenuepunkt)) aus.push('Knopf: ' + zeile[2]);
  return aus;
}
async function uebersichtStufen(opt) {
  const k = ladeKern(Object.assign({ showSaveFilePicker: async () => dateiAttrappe }, ZUSATZ, opt || {}));
  await k.V.depotAnlegen('meldungen-uebersicht-pw');
  const html = () => { k.V.renderErledigen(); return String(k.document.getElementById('content').innerHTML); };
  return Object.assign(k, { html });
}

test('[Meldungen·2b] Übersicht: im leeren Depot keine Zeile; sobald das Depot Angaben trägt „Sicherungskopie: noch keine“ mit Knopf; nach der Sicherungskopie keine Zeile', async () => {
  const { V, document, html } = await uebersichtStufen();
  assert.equal(V.__zusatz.vorschauHatDaten(V.getData()), false, 'Vorbedingung: das frisch angelegte Depot trägt noch keinen Eintrag');
  assert.deepEqual(uebersichtFunde(V, html(), false), [], 'leeres Depot: keine Zeile (Gegenprobe)');
  V.akteurSelbstErklaeren('Maria');
  V.sektorFeldSetzen('identity', 'givenName', 'Maria');
  assert.equal(V.__zusatz.vorschauHatDaten(V.getData()), true, 'Vorbedingung: ein Eintrag');
  assert.deepEqual(uebersichtFunde(V, html(), true), []);
  const sk = document.getElementById('erledigen-sicherungskopie');
  assert.equal(typeof sk.onclick, 'function', 'der Knopf ist verdrahtet');
  await sk.onclick();
  assert.equal(V.exportErinnerungModell().ohneSicherungskopie, false, 'Vorbedingung: die Sicherungskopie ist entstanden');
  assert.deepEqual(uebersichtFunde(V, html(), false), [], 'nach der Sicherungskopie: keine Zeile (Gegenprobe)');
});

test('[Meldungen·2b] angelegt mit Namen: die Zeile steht gleich nach dem Anlegen (der Name zählt als Angabe)', async () => {
  const k = ladeKern(Object.assign({ showSaveFilePicker: async () => dateiAttrappe }, ZUSATZ));
  // Derselbe Weg wie das Anlege-Fenster: Name und Passwort, danach stehen Vor- und Nachname in den Angaben.
  await k.V._ankerAusIdentitaetFinalisieren('Maria', 'Muster', 'meldungen-name-pw');
  k.V.akteurSelbstErklaeren('Maria');
  assert.equal(k.V.__zusatz.vorschauHatDaten(k.V.getData()), true, 'Vorbedingung: der Name zählt als Angabe');
  k.V.renderErledigen();
  assert.deepEqual(uebersichtFunde(k.V, String(k.document.getElementById('content').innerHTML), true), []);
});

test('[Meldungen·2b] beide Stellen lesen dieselbe Bedingung, die Zeile ist maskiert und zeichnet die Übersicht nach der Sicherungskopie neu', () => {
  const a = KERN.indexOf('function renderErledigen()');
  const rumpf = KERN.slice(a, KERN.indexOf('\n}\n', a));
  assert.match(rumpf, /if \(data && !imVorschau\(\) && Modus\.darfBearbeiten\(\) && exportErinnerungModell\(\)\.ohneSicherungskopie && vorschauHatDaten\(data\)\) \{/);
  assert.match(rumpf, /escapeHTML\(sicherungskopieStandSatz\(STRINGS\.sicherungskopieNochKeine\)\)/);   // „noch keine“ oder der Satz nach einem unbestätigten Download (24.11.2026)
  assert.match(rumpf, /escapeHTML\(STRINGS\[SPEICHERMODELL_HANDGRIFF\]\)/);
  assert.match(rumpf, /sk\.onclick = \(\) => Promise\.resolve\(sicherungskopieErstellen\(\)\)\.then\(\(\) => \{ if \(aktiveAnsicht === 'erledigen'\) renderErledigen\(\); \}\);/);
  const b = KERN.indexOf('function speicherHinweisOeffnen()');
  assert.ok(KERN.slice(b, KERN.indexOf('\n}\n', b)).includes('exportErinnerungModell().ohneSicherungskopie'), 'das Blatt liest dieselbe Bedingung');
  assert.equal((KERN.match(/ohneSicherungskopie: faellig && !jeExportiert/g) || []).length, 1, 'die Bedingung steht genau einmal');
});

test('[Meldungen·2b·Rot-Beweis] eine Kern-Fassung ohne die Zeile auf der Übersicht fällt durch', async () => {
  const anker = 'exportErinnerungModell().ohneSicherungskopie && vorschauHatDaten(data)) {';
  assert.equal(KERN.split(anker).length - 1, 1, 'Vorbedingung: Anker');
  const tmp = path.join(os.tmpdir(), 'meldungen-uebersicht-rot-' + process.pid + '.html');
  fs.writeFileSync(tmp, KERN.replace(anker, 'false) {'));
  try {
    const { V, html } = await uebersichtStufen({ htmlPfad: tmp, backen: true });
    V.akteurSelbstErklaeren('Maria');
    V.sektorFeldSetzen('identity', 'givenName', 'Maria');
    assert.ok(uebersichtFunde(V, html(), true).length > 0, 'die Probe oben wäre rot');
  } finally { fs.unlinkSync(tmp); }
});

/* ── 3 · Nach dem Öffnen ────────────────────────────────────────────────────── */

test('[Meldungen·3] nach dem Öffnen nennt die Meldung den Zustand, keinen Vorgang; die Stelle bleibt dieselbe', () => {
  const { V } = ladeKern();
  assert.equal(V.STRINGS.geoeffnet, 'Ihr Depot ist geöffnet.');
  assert.equal(TEXTE.EN['strings:geoeffnet.text'], 'Your depot is open.');
  assert.equal((KERN.match(/ui\.toast\(STRINGS\.geoeffnet, 'ok'\)/g) || []).length, 1, 'eine Erfolgsmeldung beim Öffnen aus der Datei');
});

/* ── Wächter gegen die Klasse ───────────────────────────────────────────────── */

test('[Meldungen·Wächter] keine Erfolgsmeldung des Kerns meldet einen Verschlüsselungsvorgang als Vollzug, DE und EN', () => {
  const kennungen = erfolgsMeldungsKennungen(KERN);
  assert.ok(kennungen.length > 20 && kennungen.includes('geoeffnet'), 'Vorbedingung: der Wächter sieht die Erfolgsmeldungen (' + kennungen.length + ')');
  assert.deepEqual(vorgangsFunde(KERN, TEXTE), []);
});

test('[Meldungen·Wächter·Rot-Beweis] der frühere Wortlaut „Depot entschlüsselt und geöffnet.“ fällt durch, DE und EN', () => {
  const DE = Object.assign({}, TEXTE.DE, { 'strings:geoeffnet.text': 'Depot entschlüsselt und geöffnet.' });
  const EN = Object.assign({}, TEXTE.EN, { 'strings:geoeffnet.text': 'Depot decrypted and opened.' });
  const funde = vorgangsFunde(KERN, { DE, EN });
  assert.ok(funde.some((f) => f.startsWith('DE geoeffnet')) && funde.some((f) => f.startsWith('EN geoeffnet')), funde.join(' | '));
});

/* ── Proben-Deklaration (U2-ADR-099): die Diskriminante, die der Wächter ruft, und die Liste, die er leer verlangt. */
module.exports = {
  PROBEN: [
    { fuer: '[Meldungen·1] nach dem Anlegen erscheint keine Meldung, die einen veralteten Stand behauptet', diskriminante: anlegeMeldungsFunde },
    { fuer: '[Meldungen·2] das ⓘ öffnet den Zustand mit dem nächsten Schritt', diskriminante: zustandsSatzFunde },
    { fuer: '[Meldungen·2b] Übersicht: im leeren Depot keine Zeile', diskriminante: uebersichtFunde },
    { fuer: '[Meldungen·2b] angelegt mit Namen: die Zeile steht gleich nach dem Anlegen', diskriminante: uebersichtFunde },
  ],
};
