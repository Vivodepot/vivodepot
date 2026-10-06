'use strict';
/* Das Passwort der Schlüsseldatei im Studio: beim Erzeugen zweimal abgefragt (Gleichheit, Mindestlänge 8), beim Laden
   einmal; danach steht es nirgends mehr.

   Die Grundprobe, über die echten Handler der Seite (Erzeugen des Signierschlüssels und des Empfangsschlüssels, Laden,
   Neu-Speichern einer Klartext-Datei), je auch auf den Fehlerpfaden (zu kurz, ungleich, falsches Passwort, ohne
   Passwort, Abbruch ohne Datei): kein Passwortfeld behält seinen Wert, keine Meldung wiederholt das Passwort, STATE und
   die Konsole tragen es nicht, keine heruntergeladene Datei trägt es oder ein Klartext-`d`. Das Studio hat im Sandkasten
   kein localStorage, sessionStorage oder IndexedDB — ein Zugriff würde werfen. JavaScript kann einen String nicht
   nullen; geprüft wird, dass kein Verweis über den Aufruf hinaus bleibt.

   Alle Schlüssel und Passwörter erzeugt die Probe selbst. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { ladeGenerator } = require('./load-generator.js');

const HTML = fs.readFileSync(path.join(__dirname, '..', 'vivodepot-studio.html'), 'utf8');
const PW = 'probe-passwort-studio-4K';
const PW_FELDER = ['sk-pw1', 'sk-pw2', 'anf-pw1', 'anf-pw2', 'pr-privkey-pw', 'pr-neu-pw1', 'pr-neu-pw2'];
const MELDUNGEN = ['sk-pw-meldung', 'anf-pw-meldung', 'pr-privkey-status', 'sk-erfolg'];

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
  const s = ladeGenerator(html ? { html } : undefined);
  s.konsole = [];
  const mit = (...a) => { s.konsole.push(a.map((x) => { try { return typeof x === 'string' ? x : JSON.stringify(x); } catch (e) { return String(x); } }).join(' ')); };
  s.sandbox.console = { log: mit, info: mit, warn: mit, error: mit, debug: mit };
  s.speicher = speicherAttrappen([s.sandbox, s.windowStub]);
  s.downloads = [];
  s.sandbox.Blob = function (teile) { s.downloads.push(teile.join('')); };
  s.V.SCHLUESSEL_TRESOR.beimVerwerfen(() => {});
  s.V.EMPFANGS_TRESOR.beimVerwerfen(() => {});
  s.feld = (id) => s.document.getElementById(id);
  return s;
}
function spuren(s, pw) {
  const v = [];
  for (const id of PW_FELDER) if (s.feld(id) && s.feld(id).value !== '') v.push('feld-nicht-geleert:' + id);
  for (const id of MELDUNGEN) if (s.feld(id) && String(s.feld(id).textContent).includes(pw)) v.push('pw-in-meldung:' + id);
  if (JSON.stringify(s.V.STATE).includes(pw)) v.push('pw-in-state');
  if (s.konsole.some((z) => z.includes(pw))) v.push('pw-in-der-konsole');
  if (s.speicher.some((z) => z.includes(pw))) v.push('pw-im-browser-speicher');
  for (const d of s.downloads) {
    if (d.includes(pw)) v.push('pw-in-einer-datei');
    if (/"d"\s*:/.test(d)) v.push('klartext-d-in-einer-datei');
  }
  return v;
}
function zweiFelder(s, a, b, p1, p2) { s.feld(a).value = p1; s.feld(b).value = p2; }
function datei(s, text) { s.feld('pr-privkey').files = text == null ? [] : [{ text: async () => text }]; }

test('[Studio · Passwort] Signierschlüssel erzeugen: zwei gleiche Felder → Schlüssel da, Felder leer, keine Spur', async () => {
  const s = seite();
  zweiFelder(s, 'sk-pw1', 'sk-pw2', PW, PW);
  await s.V.schluesselErzeugen();
  assert.equal(s.V.SCHLUESSEL_TRESOR.vorhanden(), true);
  assert.equal(s.V.SCHLUESSEL_TRESOR.zustand().extractable, false);
  s.V.SCHLUESSEL_TRESOR.privatHerunterladen((t) => s.downloads.push(t));
  assert.deepEqual(spuren(s, PW), []);
  // Nicht-leer-Wache: dieselbe Spurensuche findet ein Passwort, sobald eines dasteht.
  s.konsole.push('x ' + PW); const kontrolle = spuren(s, PW); assert.ok(kontrolle.length > 0, 'die Spurensuche ist nicht blind'); s.konsole.pop();
  s.V.SCHLUESSEL_TRESOR.verwerfen('manuell');
});

test('[Studio · Passwort] zu kurz und ungleich: kein Schlüssel, eine Meldung ohne das Passwort, beide Felder leer', async () => {
  for (const [p1, p2, kennung] of [['kurz7ch', 'kurz7ch', 'zu kurz'], [PW, PW + 'x', 'stimmen nicht']]) {
    for (const [a, b, m, los, T] of [['sk-pw1', 'sk-pw2', 'sk-pw-meldung', 'schluesselErzeugen', 'SCHLUESSEL_TRESOR'],
      ['anf-pw1', 'anf-pw2', 'anf-pw-meldung', 'anfrageSchluesselErzeugen', 'EMPFANGS_TRESOR']]) {
      const s = seite();
      zweiFelder(s, a, b, p1, p2);
      await s.V[los]();
      assert.equal(s.V[T].vorhanden(), false, los + ' ' + kennung);
      assert.ok(s.feld(m).textContent.includes(kennung), los + ': ' + s.feld(m).textContent);
      assert.deepEqual(spuren(s, p1), [], los + ' ' + kennung);
      s.konsole.push('x ' + p1); const kontrolle = spuren(s, p1); assert.ok(kontrolle.length > 0, 'Nicht-leer-Wache: die Spurensuche ist nicht blind'); s.konsole.pop();
    }
  }
});

test('[Studio · Passwort] Empfangsschlüssel erzeugen: Felder leer, Datei verschlüsselt, Speicher nicht herausholbar', async () => {
  const s = seite();
  zweiFelder(s, 'anf-pw1', 'anf-pw2', PW, PW);
  await s.V.anfrageSchluesselErzeugen();
  assert.equal(s.V.EMPFANGS_TRESOR.zustand().extractable, false);
  s.V.EMPFANGS_TRESOR.privatHerunterladen((t) => s.downloads.push(t));
  assert.equal(s.V.istGeschuetzteSchluesseldatei(JSON.parse(s.downloads[0])), true);
  assert.deepEqual(spuren(s, PW), []);
  s.V.EMPFANGS_TRESOR.verwerfen('manuell');
});

test('[Studio · Passwort] Laden: richtig → geladen; falsch, ohne, beschädigt → nicht geladen, dieselbe Meldung ohne Passwort; Abbruch ohne Datei', async () => {
  const roh = await seite().V.erzeugeSchluesselpaarRoh();
  const vdkey = JSON.stringify(await seite().V.schuetzeSchluesselJwk(roh.privateJwk, PW));
  const gut = seite();
  datei(gut, vdkey); gut.feld('pr-privkey-pw').value = PW;
  await gut.V.schluesselDateiLaden();
  assert.equal(gut.V.SCHLUESSEL_TRESOR.vorhanden(), true);
  assert.deepEqual(spuren(gut, PW), []);
  gut.V.SCHLUESSEL_TRESOR.verwerfen('manuell');

  const falsch = seite();
  datei(falsch, vdkey); falsch.feld('pr-privkey-pw').value = PW + 'x';
  await falsch.V.schluesselDateiLaden();
  assert.equal(falsch.V.SCHLUESSEL_TRESOR.vorhanden(), false);
  assert.equal(falsch.feld('pr-privkey-status').textContent, 'Das Passwort passt nicht, oder die Datei ist beschädigt.');
  assert.deepEqual(spuren(falsch, PW), []);

  const kaputt = JSON.parse(vdkey); kaputt.ct = (kaputt.ct[0] === 'A' ? 'B' : 'A') + kaputt.ct.slice(1);
  const besch = seite();
  datei(besch, JSON.stringify(kaputt)); besch.feld('pr-privkey-pw').value = PW;
  await besch.V.schluesselDateiLaden();
  assert.equal(besch.feld('pr-privkey-status').textContent, falsch.feld('pr-privkey-status').textContent, 'AES-GCM unterscheidet nicht — die Meldung auch nicht');

  const ohne = seite();
  datei(ohne, vdkey);
  await ohne.V.schluesselDateiLaden();
  assert.equal(ohne.V.SCHLUESSEL_TRESOR.vorhanden(), false);
  assert.equal(ohne.feld('pr-privkey-status').textContent, 'Passwort der Schlüsseldatei');

  const abbruch = seite();
  datei(abbruch, null); abbruch.feld('pr-privkey-pw').value = PW;
  await abbruch.V.schluesselDateiLaden();
  assert.deepEqual(spuren(abbruch, PW), []);
});

test('[Studio · Passwort] eine Klartext-Datei wird nicht still geladen; neu gespeichert ist sie verschlüsselt und öffnet mit dem neuen Passwort', async () => {
  const s = seite();
  const roh = await s.V.erzeugeSchluesselpaarRoh();
  datei(s, JSON.stringify(roh.privateJwk)); s.feld('pr-privkey-pw').value = '';
  await s.V.schluesselDateiLaden();
  assert.equal(s.V.SCHLUESSEL_TRESOR.vorhanden(), false, 'Klartext wird nicht übernommen');
  assert.equal(s.feld('pr-klartext').hidden, false, 'das Angebot zum Neu-Speichern erscheint');
  zweiFelder(s, 'pr-neu-pw1', 'pr-neu-pw2', PW, PW);
  await s.V.schluesselDateiNeuSpeichern();
  assert.equal(s.downloads.length, 1);
  const neu = JSON.parse(s.downloads[0]);
  assert.equal(s.V.istGeschuetzteSchluesseldatei(neu), true);
  assert.equal((await s.V.entschluesseleSchluesselJwk(neu, PW)).x, roh.privateJwk.x);
  assert.equal(s.V.SCHLUESSEL_TRESOR.vorhanden(), false, 'neu speichern lädt nichts');
  assert.deepEqual(spuren(s, PW), []);
});

test('[Studio · Passwort] scheitert die Hülle beim Erzeugen, bleibt nichts im Tresor', async () => {
  for (const [T, marke] of [['SCHLUESSEL_TRESOR', '        const huelle = await schuetzeSchluesselJwk(r.privateJwk, passwort);\n        await halteAusJwk'],
    ['EMPFANGS_TRESOR', "        const huelle = await schuetzeSchluesselJwk(r.privateJwk, passwort);\n        empfangKey"]]) {
    const ersatz = marke.replace('await schuetzeSchluesselJwk(r.privateJwk, passwort)', "await Promise.reject(new Error('hülle-gescheitert'))");
    assert.equal(HTML.split(marke).length, 2, 'Vorbedingung: die Stelle steht genau einmal (' + T + ')');
    const s = seite(HTML.replace(marke, ersatz));
    let grund = null; s.V[T].beimVerwerfen((g) => { grund = g; });
    await assert.rejects(() => s.V[T].erzeugen({ passwort: PW }), /hülle-gescheitert/);
    assert.equal(s.V[T].vorhanden(), false, T);
    assert.equal(s.V[T].zustand().huelleDa, false, T);
    assert.deepEqual(spuren(s, PW), [], T + ': auch nach dem Fehlschlag keine Passwortspur');
  }
});

test('[Studio · Passwort · Rot-Beweis] eine Fassung, die das Passwort in den Browser-Speicher schreibt, wird gemeldet', async () => {
  const m = HTML.replace("    const r = await SCHLUESSEL_TRESOR.erzeugen({ passwort: passwort });\n", "    localStorage.setItem('merk', passwort);\n    const r = await SCHLUESSEL_TRESOR.erzeugen({ passwort: passwort });\n");
  assert.notEqual(m, HTML, 'Vorbedingung: die Mutation greift');
  const s = seite(m);
  zweiFelder(s, 'sk-pw1', 'sk-pw2', PW, PW);
  await s.V.schluesselErzeugen();
  const funde = spuren(s, PW);
  assert.ok(funde.length > 0, 'Nicht-leer-Wache');
  assert.ok(funde.includes('pw-im-browser-speicher'), funde.join());
  s.V.SCHLUESSEL_TRESOR.verwerfen('manuell');
});

test('[Studio · Passwort · Rot-Beweis] eine Fassung, die die Felder nicht leert oder das Passwort in STATE legt, wird gemeldet', async () => {
  const m1 = HTML.replace("  if (f1) f1.value = ''; if (f2) f2.value = '';\n", '');
  assert.notEqual(m1, HTML, 'Vorbedingung: die Mutation greift');
  const s1 = seite(m1);
  zweiFelder(s1, 'sk-pw1', 'sk-pw2', PW, PW);
  await s1.V.schluesselErzeugen();
  assert.ok(spuren(s1, PW).includes('feld-nicht-geleert:sk-pw1'));
  s1.V.SCHLUESSEL_TRESOR.verwerfen('manuell');
  const m2 = HTML.replace("    const r = await SCHLUESSEL_TRESOR.erzeugen({ passwort: passwort });\n", "    STATE.schluesselPasswort = passwort;\n    const r = await SCHLUESSEL_TRESOR.erzeugen({ passwort: passwort });\n");
  assert.notEqual(m2, HTML);
  const s2 = seite(m2);
  zweiFelder(s2, 'sk-pw1', 'sk-pw2', PW, PW);
  await s2.V.schluesselErzeugen();
  assert.ok(spuren(s2, PW).includes('pw-in-state'));
  s2.V.SCHLUESSEL_TRESOR.verwerfen('manuell');
});

/* PROBEN-Deklaration (Prüfstand, U2-ADR-099): die Diskriminante jeder Probe ist die Spurensuche dieser Datei. Der Prüfstand
   ersetzt sie durch eine, die immer eine Spur meldet — dann muss jede dieser Proben rot werden. */
module.exports = {
  PROBEN: [
    { fuer: '[Studio · Passwort] Signierschlüssel erzeugen: zwei gleiche Felder → Schlüssel da, Felder leer, keine Spur', diskriminante: spuren },
    { fuer: '[Studio · Passwort] zu kurz und ungleich: kein Schlüssel, eine Meldung ohne das Passwort, beide Felder leer', diskriminante: spuren },
    { fuer: '[Studio · Passwort] scheitert die Hülle beim Erzeugen, bleibt nichts im Tresor', diskriminante: spuren },
    { fuer: '[Studio · Passwort · Rot-Beweis] eine Fassung, die die Felder nicht leert oder das Passwort in STATE legt, wird gemeldet', diskriminante: spuren },
  ],
};
