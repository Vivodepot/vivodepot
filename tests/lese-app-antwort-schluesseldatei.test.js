'use strict';
/* Die Lese-App öffnet eine Antwort mit der verschlüsselten Schlüsseldatei (.vdkey) und ihrem Passwort.
   Eine ältere Klartext-Datei öffnet weiter, mit dem Hinweis, sie im Studio verschlüsselt neu zu speichern.

   Gefahren wird der echte Knopf der Seite (der Submit-Handler aus `renderAntwortOeffnen`), nicht eine Nachbildung.
   Die Passwort-Grundprobe: nach Öffnen, falschem Passwort, fehlendem Passwort und Abbruch steht das Passwort in
   keinem Feld, in keiner Meldung, im Markup nicht und in keiner Konsolenausgabe; die Lese-App schreibt nichts in
   localStorage, sessionStorage oder IndexedDB (im Sandkasten gibt es sie nicht — ein Zugriff würde werfen).
   JavaScript kann einen String nicht nullen; geprüft wird, dass kein Verweis über den Aufruf hinaus bleibt.

   Das Schlüsseldatei-Passwort erzeugt die Probe selbst; Umschlag und Empfangsschlüssel stammen aus der v1-Fixture. */
const test = require('node:test');
const assert = require('node:assert/strict');
const { ladeLesen, LESEN_PATH } = require('./load-lesen.js');
const fs = require('node:fs');

const HTML = fs.readFileSync(LESEN_PATH, 'utf8');
const PW = 'probe-passwort-antwort-7Q';


/* Die Seite, mit einem Dateileser, der den Inhalt der „gewählten Datei“ liefert, und einer mitlesenden Konsole. */
/* Aufzeichnende Attrappen für den Browser-Speicher (localStorage, sessionStorage, IndexedDB), an Sandkasten und window:
   jede Schreib- und Öffnungsoperation landet im Protokoll — geprüft wird das Protokoll, nicht ein indirekter Wurf. */
function speicherAttrappen(ziele) {
  const protokoll = [];
  const speicher = (name) => ({
    setItem: (k, v) => { protokoll.push(name + '.setItem ' + k + ' ' + String(v)); },
    getItem: () => null, removeItem: (k) => { protokoll.push(name + '.removeItem ' + k); }, clear: () => {}, key: () => null, length: 0,
  });
  const idb = { open: (...a) => { protokoll.push('indexedDB.open ' + a.map(String).join(' ')); return { set onsuccess(f) {}, set onerror(f) {}, set onupgradeneeded(f) {} }; } };
  for (const z of ziele) if (z) { z.localStorage = speicher('localStorage'); z.sessionStorage = speicher('sessionStorage'); z.indexedDB = idb; }
  return protokoll;
}
function seite(html) {
  const { V, document, sandbox } = ladeLesen(html ? { html } : undefined);
  sandbox.FileReader = function () { const r = this; r.readAsText = (d) => { r.result = d.__text; r.onload(); }; };
  const konsole = [];
  const mit = (...a) => { konsole.push(a.map((x) => { try { return typeof x === 'string' ? x : JSON.stringify(x); } catch (e) { return String(x); } }).join(' ')); };
  sandbox.console = { log: mit, info: mit, warn: mit, error: mit, debug: mit };
  const speicher = speicherAttrappen([sandbox, sandbox.window]);
  const knopf = {};
  document.getElementById('antwort-key-form').addEventListener = (art, fn) => { knopf[art] = fn; };
  const hinweise = [];
  document.getElementById('antwort-blatt').insertBefore = (knoten) => { hinweise.push(knoten); return knoten; };
  return { V, document, sandbox, konsole, knopf, hinweise, speicher };
}

async function oeffnenUeberDenKnopf(s, umschlag, dateiText, passwort) {
  s.V.renderAntwortOeffnen(umschlag);
  const fehler = s.document.getElementById('antwort-fehler');
  fehler.textContent = ''; fehler.hidden = true;
  s.document.getElementById('antwort-key').files = dateiText == null ? [] : [{ __text: dateiText }];
  s.document.getElementById('antwort-key-pw').value = passwort;
  await s.knopf.submit({ preventDefault() {} });
  return { fehler: fehler.hidden ? '' : fehler.textContent, app: s.document.getElementById('app').innerHTML };
}

/* Der Umschlag v1 kommt aus der eingefrorenen Fixture: der Kern schreibt ihn seit 05.10.2026 nicht mehr, die Lese-App
   öffnet ihn weiter (tests/kern-antwort-v1-entfernt.test.js). */
const V1 = JSON.parse(fs.readFileSync(require('node:path').join(__dirname, 'fixtures', 'antwort-v1-umschlaege.json'), 'utf8'));
async function fall() {
  const priv = V1.schluesselpaar.testPrivateJwk;
  const umschlag = JSON.parse(JSON.stringify(V1.schluesselpaar.umschlag));
  /* verpackt mit der Hülle der Lese-App selbst; dass sie byte-gleich mit Studio und Issuer ist, hält der Propagationsprüfer */
  return { umschlag, priv, vdkey: JSON.stringify(await ladeLesen().V.schuetzeSchluesselJwk(priv, PW)) };
}

/* Die Grundprobe, als Liste von Verletzungen: das Passwort darf nach dem Aufruf nirgends mehr stehen. */
function passwortSpuren(s, erg) {
  const v = [];
  if (s.document.getElementById('antwort-key-pw').value !== '') v.push('pw-feld-nicht-geleert');
  if (erg.fehler.includes(PW)) v.push('pw-in-der-meldung');
  if (erg.app.includes(PW)) v.push('pw-im-markup');
  if (s.konsole.some((z) => z.includes(PW))) v.push('pw-in-der-konsole');
  if (s.speicher.some((z) => z.includes(PW))) v.push('pw-im-browser-speicher');
  if (s.V.data && JSON.stringify(s.V.data).includes(PW)) v.push('pw-in-data');
  return v;
}

test('[Lese-App · Schlüsseldatei] die verschlüsselte Datei mit dem richtigen Passwort öffnet die Antwort; kein Klartext-Hinweis', async () => {
  const f = await fall();
  const s = seite();
  const erg = await oeffnenUeberDenKnopf(s, f.umschlag, f.vdkey, PW);
  assert.equal(erg.fehler, '');
  assert.match(erg.app, /id="antwort-blatt"/, 'das Antwortblatt steht');
  assert.deepEqual(s.hinweise, []);
  assert.deepEqual(passwortSpuren(s, erg), []);
  // Nicht-leer-Wache: dieselbe Spurensuche findet ein Passwort, sobald eines dasteht.
  const kontrolle = passwortSpuren(s, { fehler: 'x ' + PW, app: '' });
  assert.ok(kontrolle.length > 0, 'die Spurensuche ist nicht blind');
});

test('[Lese-App · Schlüsseldatei] ein falsches Passwort öffnet nichts und sagt nur, dass Passwort oder Datei nicht passen', async () => {
  const f = await fall();
  const s = seite();
  const erg = await oeffnenUeberDenKnopf(s, f.umschlag, f.vdkey, PW + 'x');
  assert.equal(erg.fehler, s.V.STRINGS.antwortKeyFalsch);
  assert.doesNotMatch(erg.app, /id="antwort-blatt"/);
  assert.deepEqual(passwortSpuren(s, erg), []);
  assert.equal(erg.fehler.includes(PW + 'x'), false);
  // Nicht-leer-Wache: dieselbe Spurensuche findet ein Passwort, sobald eines dasteht.
  const kontrolle = passwortSpuren(s, { fehler: 'x ' + PW, app: '' });
  assert.ok(kontrolle.length > 0, 'die Spurensuche ist nicht blind');
});

test('[Lese-App · Schlüsseldatei] eine beschädigte Datei bekommt dieselbe Meldung wie ein falsches Passwort', async () => {
  const f = await fall();
  const d = JSON.parse(f.vdkey);
  assert.equal(typeof d.ct, 'string', 'Vorbedingung: die Hülle trägt einen Geheimtext');
  d.ct = (d.ct[0] === 'A' ? 'B' : 'A') + d.ct.slice(1);
  const s = seite();
  const erg = await oeffnenUeberDenKnopf(s, f.umschlag, JSON.stringify(d), PW);
  assert.equal(erg.fehler, s.V.STRINGS.antwortKeyFalsch);
});

test('[Lese-App · Schlüsseldatei] ohne Passwort fragt die Seite danach, statt zu raten', async () => {
  const f = await fall();
  const s = seite();
  const erg = await oeffnenUeberDenKnopf(s, f.umschlag, f.vdkey, '');
  assert.equal(erg.fehler, s.V.STRINGS.antwortKeyPw);
  assert.doesNotMatch(erg.app, /id="antwort-blatt"/);
});

test('[Lese-App · Schlüsseldatei] eine ältere Klartext-Datei öffnet weiter, mit dem Hinweis auf das Neu-Speichern im Studio', async () => {
  const f = await fall();
  const s = seite();
  const erg = await oeffnenUeberDenKnopf(s, f.umschlag, JSON.stringify(f.priv), PW);
  assert.equal(erg.fehler, '');
  assert.match(erg.app, /id="antwort-blatt"/);
  assert.equal(s.hinweise.length, 1);
  assert.equal(s.hinweise[0].id, 'antwort-klartext-hinweis');
  assert.equal(s.hinweise[0].textContent, s.V.STRINGS.antwortKeyKlartext);
  assert.deepEqual(passwortSpuren(s, erg), []);
});

test('[Lese-App · Schlüsseldatei] Abbruch ohne Datei: das eingegebene Passwort ist trotzdem fort', async () => {
  const f = await fall();
  const s = seite();
  const erg = await oeffnenUeberDenKnopf(s, f.umschlag, null, PW);
  assert.deepEqual(passwortSpuren(s, erg), []);
});

test('[Lese-App · Schlüsseldatei] unlesbare Datei: eigene Meldung, nichts geöffnet', async () => {
  const f = await fall();
  const s = seite();
  const erg = await oeffnenUeberDenKnopf(s, f.umschlag, '{kein json', PW);
  assert.equal(erg.fehler, s.V.STRINGS.antwortKeyUnlesbar);
  assert.deepEqual(passwortSpuren(s, erg), []);
});

test('[Lese-App · Schlüsseldatei] die Texte stehen deutsch und englisch, die Dateiwahl nimmt .vdkey an', () => {
  const { V } = ladeLesen();
  for (const k of ['antwortKeyPw', 'antwortKeyFalsch', 'antwortKeyKlartext']) assert.ok(V.STRINGS[k], k);
  const en = HTML.slice(HTML.indexOf('antwortKeyPw: "'));
  assert.match(en, /^antwortKeyPw: "Key file password"/);
  assert.match(HTML, /id="antwort-key" accept="\.vdkey,/);
});

test('[Lese-App · Schlüsseldatei · Rot-Beweis] eine Fassung, die das Feld nicht leert oder das Passwort in die Meldung schreibt, wird gemeldet', async () => {
  const f = await fall();
  const m1 = HTML.replace("      let passwort = pwFeld.value;\n      pwFeld.value = '';\n", '      let passwort = pwFeld.value;\n');
  assert.notEqual(m1, HTML, 'Vorbedingung: die Mutation greift');
  const s1 = seite(m1);
  assert.ok(passwortSpuren(s1, await oeffnenUeberDenKnopf(s1, f.umschlag, f.vdkey, PW)).includes('pw-feld-nicht-geleert'));
  const m2 = HTML.replace("      catch (e) { fehler(STRINGS.antwortKeyFalsch); return false; }", "      catch (e) { fehler(STRINGS.antwortKeyFalsch + ' ' + passwort); return false; }");
  assert.notEqual(m2, HTML);
  const s2 = seite(m2);
  assert.ok(passwortSpuren(s2, await oeffnenUeberDenKnopf(s2, f.umschlag, f.vdkey, PW + 'x')).includes('pw-in-der-meldung'));   // der Pfad des falschen Passworts
  const m4 = HTML.replace('async function antwortMitSchluesseldateiOeffnen(umschlag, datei, passwort, fehler) {\n', 'async function antwortMitSchluesseldateiOeffnen(umschlag, datei, passwort, fehler) {\n  sessionStorage.setItem(\'k\', passwort);\n');
  assert.notEqual(m4, HTML);
  const s4 = seite(m4);
  assert.ok(passwortSpuren(s4, await oeffnenUeberDenKnopf(s4, f.umschlag, f.vdkey, PW)).includes('pw-im-browser-speicher'));
  const m3 = HTML.replace('async function antwortMitSchluesseldateiOeffnen(umschlag, datei, passwort, fehler) {\n', 'async function antwortMitSchluesseldateiOeffnen(umschlag, datei, passwort, fehler) {\n  console.log(passwort);\n');
  assert.notEqual(m3, HTML);
  const s3 = seite(m3);
  assert.ok(passwortSpuren(s3, await oeffnenUeberDenKnopf(s3, f.umschlag, f.vdkey, PW)).includes('pw-in-der-konsole'));
});

/* Die HTML-Senke dieser Seite (renderAntwortOeffnen, wrap.innerHTML): jede Interpolation ist escapeHTML über einen festen
   Text (STRINGS), kein Wert aus der Datei oder der Antwort kommt ins Markup — der Vorgang geht über textContent.
   Bedingung der Gegenlesung für den Eintrag in tools/html-senken-grundlinie.json. */
function senkenVerstoesse(quelle) {
  const start = quelle.indexOf('function renderAntwortOeffnen(');
  if (start < 0) return ['renderAntwortOeffnen fehlt'];
  const a = quelle.indexOf('wrap.innerHTML =', start);
  const e = quelle.indexOf(';\n', a);
  const ausdruck = quelle.slice(a + 'wrap.innerHTML ='.length, e);
  const teile = [];
  let tiefe = 0, anfang = 0, q = null;
  for (let i = 0; i < ausdruck.length; i++) {
    const c = ausdruck[i];
    if (q) { if (c === '\\') i++; else if (c === q) q = null; continue; }
    if (c === "'" || c === '"' || c === '`') { q = c; continue; }
    if (c === '(' || c === '[' || c === '{') tiefe++;
    else if (c === ')' || c === ']' || c === '}') tiefe--;
    else if (c === '+' && tiefe === 0) { teile.push(ausdruck.slice(anfang, i).trim()); anfang = i + 1; }
  }
  teile.push(ausdruck.slice(anfang).trim());
  const v = [];
  for (const teil of teile) {
    if (/^'[^']*'$/.test(teil) || /^"[^"]*"$/.test(teil)) continue;              // fester Markup-Text
    if (/^\(perPasswort$/.test(teil) || /^\(perPasswort\b/.test(teil)) {        // die zwei Formular-Fassungen: rekursiv
      for (const unter of teil.replace(/^\(perPasswort\s*\?/, '').replace(/\)$/, '').split(':')) {
        for (const stueck of unter.split('+').map((x) => x.trim()).filter(Boolean)) {
          if (/^'[^']*'$/.test(stueck) || /^escapeHTML\(STRINGS\.\w+\)$/.test(stueck)) continue;
          v.push('nicht fest/escaped: ' + stueck);
        }
      }
      continue;
    }
    if (/^escapeHTML\(STRINGS\.\w+\)$/.test(teil)) continue;
    if (/^escapeHTML\(perPasswort \? STRINGS\.\w+ : STRINGS\.\w+\)$/.test(teil)) continue;
    v.push('nicht fest/escaped: ' + teil);
  }
  return v;
}

test('[Lese-App · Senke] renderAntwortOeffnen setzt nur feste, maskierte Texte ins Markup; der Vorgang kommt als Text', () => {
  assert.deepEqual(senkenVerstoesse(HTML), []);
  const { V, document } = ladeLesen();
  V.renderAntwortOeffnen({ verfahren: 'schluesselpaar', vorgang: '<img src=x onerror=1>' });
  assert.ok(!document.getElementById('app').innerHTML.includes('<img'), 'der Vorgang steht nicht im Markup');
  assert.equal(document.getElementById('antwort-vorgang').textContent, '<img src=x onerror=1>');
  const pw = HTML.match(/<input type="password" id="antwort-key-pw"[^>]*>/);
  assert.ok(pw && /autocomplete="off"/.test(pw[0]), 'das Passwortfeld trägt autocomplete="off"');
});

test('[Lese-App · Senke · Rot-Beweis] ein Vorgang im Markup oder ein unmaskierter Text wird gemeldet', () => {
  const a = "' <span id=\"antwort-vorgang\"></span></p>' +";
  assert.equal(HTML.split(a).length, 2, 'Vorbedingung: die Stelle steht genau einmal');
  const m1 = HTML.replace(a, "' ' + escapeHTML(String(umschlag.vorgang)) + '</p>' +");
  const f1 = senkenVerstoesse(m1);
  assert.ok(f1.length > 0, 'Nicht-leer-Wache');
  assert.ok(f1.some((x) => x.includes('umschlag.vorgang')), f1.join('\n'));
  const m2 = HTML.replace("'<h1>' + escapeHTML(STRINGS.antwortTitel) + '</h1>'", "'<h1>' + STRINGS.antwortTitel + '</h1>'");
  assert.notEqual(m2, HTML);
  assert.ok(senkenVerstoesse(m2).some((x) => x.includes('STRINGS.antwortTitel')));
});

/* PROBEN-Deklaration (Prüfstand, U2-ADR-099): die Diskriminante ist die Passwort-Spurensuche dieser Datei. */
module.exports = {
  PROBEN: [
    { fuer: '[Lese-App · Schlüsseldatei] die verschlüsselte Datei mit dem richtigen Passwort öffnet die Antwort; kein Klartext-Hinweis', diskriminante: passwortSpuren },
    { fuer: '[Lese-App · Schlüsseldatei] ein falsches Passwort öffnet nichts und sagt nur, dass Passwort oder Datei nicht passen', diskriminante: passwortSpuren },
    { fuer: '[Lese-App · Schlüsseldatei · Rot-Beweis] eine Fassung, die das Feld nicht leert oder das Passwort in die Meldung schreibt, wird gemeldet', diskriminante: passwortSpuren },
  ],
};
