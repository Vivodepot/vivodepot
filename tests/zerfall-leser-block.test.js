'use strict';
/* ═══════════════════════════════════════════════════════════
   Der ZERFALL-LESER-BLOCK: ein Leser der Krypto-Generation 4 für Kern und Lese-App (19.10.2026)
   ───────────────────────────────────────────────────────────
   Befund LESEAPP-FACH-NUR-ANKER (HOCH): die Lese-App las nur Platz 0 der Umschlagstabelle, an beiden Wegen
   (`leseDepotUmschlag`, Datei der Inhaberin, und `leseSubUmschlag`, Sub-Depot). Befund LESEAPP-ZERFALL-ALTER-VERGLEICH
   (MITTEL, beim Messen gefunden): auch am Anker fuhr sie noch den alten Vergleich „gleich viele Umschläge wie
   Einheiten“, den U2-ADR-156 §1c im Kern ersetzt hat, weil er ein entferntes PAAR nicht fängt.
   Beide entstanden, weil der Kern einen neuen Leser bekam und die Lese-App ihre eigene Kopie behielt. Die Klasse wird
   geschlossen, indem es den Leser nur noch einmal gibt, in beiden Dateien zeichengleich.
   Gehalten wird:
   · der Block steht in Kern und Lese-App genau einmal und zeichengleich; der alte Leser der Lese-App ist fort;
   · Klasse: Kern und Lese-App öffnen dieselbe Datei mit jedem Passwort gleich (Inhaberin, Fach, falsches Passwort,
     abgelaufenes Fach), an beiden Lese-App-Wegen; Rot-Beweis: eine Lese-App, deren Leser nur Platz 0 liest, fällt;
   · ein entferntes Paar (Einheit und Umschlag zusammen) wirft auch in der Lese-App;
   · ein abgelaufenes Fach zeigt in der Lese-App den eigenen Satz, nicht „Passwort falsch“;
   · ein Fach-Passwort mit Umlaut geht in der Lese-App in jeder Unicode-Form auf (Muster LESE-APP-PASSWORT-OHNE-NFC).
   ═══════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { ladeKern } = require('./load-kern.js');

const KERN = path.join(__dirname, '..', 'vivodepot.html');
const LESEN = path.join(__dirname, '..', 'vivodepot-lesen.html');
const ANFANG = '/* ══ ZERFALL-LESER-BLOCK';
const ENDE = '/* ══ ENDE ZERFALL-LESER-BLOCK ══ */';

const PW = 'Inhaberin-Zerfall-2026!';
const PW_FACH = 'Vertretung-Größe-2026!';      // mit Umlaut und ß: NFC und NFD unterscheiden sich
const PW_FALSCH = 'Gar-nicht-dieses-2026!';
const MARKER = 'MARKER-ZERFALL-BLOCK';
const VERGANGEN = '2020-01-31';
const kopie = (o) => JSON.parse(JSON.stringify(o));

function block(text) {
  const a = text.indexOf(ANFANG);
  const e = text.indexOf(ENDE);
  return { a, e, n: text.split(ANFANG).length - 1, inhalt: (a >= 0 && e > a) ? text.slice(a, e + ENDE.length) : null };
}

const _dateien = new Map();
function datei(giltBis) {
  const schluessel = giltBis || '';
  if (!_dateien.has(schluessel)) {
    _dateien.set(schluessel, (async () => {
      const { V } = ladeKern();
      await V.depotAnlegen(PW);
      const d = V.getData();
      d.sektoren.identity = { givenName: MARKER, familyName: 'Muster' };
      V.setData(d);
      await V.empfaengerkreisSetzen({ name: 'Vertretung', bausteine: ['bereich:identity'] });
      await V.empfaengerkreisFachEinrichten(V.empfaengerkreiseListe()[0], PW_FACH, undefined, giltBis || '');
      return kopie(await V.depotSerialisierenV4());
    })());
  }
  return _dateien.get(schluessel);
}

/* Ergebnis eines Öffnens als vergleichbare Form: 'offen' (mit Marker), 'abgelaufen', 'zu' (falsches Passwort), 'struktur'. */
function form(p) {
  return p.then(
    (d) => (JSON.stringify(d || {}).includes(MARKER) ? 'offen' : 'offen-ohne-marker'),
    (e) => (e && e.code === 'fach-abgelaufen') ? 'abgelaufen' : (e && e.__vdStruktur) ? 'struktur' : 'zu');
}
const imKern = (u, pw) => form((async () => { const { V } = ladeKern(); await V.depotLaden(kopie(u), pw); return V.getData(); })());
const imKernSub = (u, pw) => form(ladeKern().V.subDepotEntsiegeln(kopie(u), pw).then((r) => r.inhalt));
function leseApp(ladeLesen) {
  return {
    datei: (u, pw) => form(ladeLesen().V.leseDepotUmschlag(kopie(u), pw)),
    sub: (u, pw) => form(ladeLesen().V.leseSubUmschlag(kopie(u), pw)),
  };
}
const L = leseApp((o) => require('./load-lesen.js').ladeLesen(o));

/* Die Lese-App aus einem geänderten Quelltext laden (Rot-Beweise). */
async function mitLeseApp(quelltext, fn) {
  const tmp = path.join(os.tmpdir(), 'zerfall-leser-block-' + process.pid + '-' + Math.random().toString(36).slice(2) + '.html');
  fs.writeFileSync(tmp, quelltext);
  const zuvor = process.env.LESEN_HTML_PATH;
  process.env.LESEN_HTML_PATH = tmp;
  delete require.cache[require.resolve('./load-lesen.js')];
  try {
    const lade = require('./load-lesen.js').ladeLesen;
    return await fn(leseApp(lade));
  } finally {
    if (zuvor === undefined) delete process.env.LESEN_HTML_PATH; else process.env.LESEN_HTML_PATH = zuvor;
    delete require.cache[require.resolve('./load-lesen.js')];
    fs.rmSync(tmp, { force: true });
  }
}

test('[Zerfall-Block·Spiegel] der Block steht in Kern und Lese-App genau einmal und zeichengleich', () => {
  const k = block(fs.readFileSync(KERN, 'utf8'));
  const l = block(fs.readFileSync(LESEN, 'utf8'));
  assert.equal(k.n, 1, 'Kern: der Block steht nicht genau einmal');
  assert.equal(l.n, 1, 'Lese-App: der Block steht nicht genau einmal');
  assert.ok(k.inhalt && l.inhalt, 'Anfang oder Ende des Blocks fehlt');
  assert.equal(l.inhalt, k.inhalt, 'die Kopien sind nicht zeichengleich');
});

test('[Zerfall-Block·Spiegel] die Lesefunktionen stehen nur im Block, der alte Leser der Lese-App ist fort', () => {
  for (const [name, datei] of [['Kern', KERN], ['Lese-App', LESEN]]) {
    const text = fs.readFileSync(datei, 'utf8');
    const b = block(text);
    const aussen = text.slice(0, b.a) + text.slice(b.e);
    for (const fn of ['_zerfallLesen', '_zerfallEintragLesen', '_zerfallZusammensetzen', '_fachTuerSchluessel',
      '_fachSchluesselAusRoh', 'fachAbgelaufen']) {
      assert.equal(new RegExp('function ' + fn + '\\(').test(aussen), false, name + ': ' + fn + ' steht außerhalb des Blocks');
    }
  }
  const lesen = fs.readFileSync(LESEN, 'utf8');
  assert.equal(/_zerfallLesenLeseApp|_zerfallZusammensetzenLesen/.test(lesen), false, 'der alte Leser der Lese-App steht noch da');
});

test('[Zerfall-Block·Klasse] Kern und Lese-App öffnen dieselbe Datei mit jedem Passwort gleich, an beiden Wegen', async () => {
  const offen = await datei();
  const alt = await datei(VERGANGEN);
  const faelle = [
    ['Inhaberin', offen, PW, 'offen'],
    ['Fach', offen, PW_FACH, 'offen'],
    ['falsches Passwort', offen, PW_FALSCH, 'zu'],
    ['abgelaufenes Fach', alt, PW_FACH, 'abgelaufen'],
    ['Inhaberin bei abgelaufenem Fach', alt, PW, 'offen'],
  ];
  for (const [name, u, pw, soll] of faelle) {
    assert.equal(await imKern(u, pw), soll, 'Kern, Datei: ' + name);
    assert.equal(await L.datei(u, pw), soll, 'Lese-App, Datei: ' + name);
    assert.equal(await imKernSub(u, pw), soll, 'Kern, Sub-Depot: ' + name);
    assert.equal(await L.sub(u, pw), soll, 'Lese-App, Sub-Depot: ' + name);
  }
});

test('[Zerfall-Block·Klasse·Rot-Beweis] eine Lese-App, deren Leser nur Platz 0 liest, öffnet das Fach nicht', async () => {
  const original = fs.readFileSync(LESEN, 'utf8');
  const anker = "    if (!opt || typeof opt.passwort !== 'string' || tabelle.length < 2) throw e;";
  assert.equal(original.split(anker).length - 1, 1, 'Vorbedingung: der Übergang zu den Fächern steht genau einmal');
  const u = await datei();
  await mitLeseApp(original.replace(anker, '    throw e;'), async (R) => {
    assert.equal(await R.datei(u, PW), 'offen', 'Positivkontrolle: die Inhaberin kommt weiter hinein');
    assert.equal(await R.datei(u, PW_FACH), 'zu', 'genau die Lücke: Datei der Inhaberin, Fach-Passwort');
    assert.equal(await R.sub(u, PW_FACH), 'zu', 'genau die Lücke: Sub-Depot, Fach-Passwort');
  });
});

test('[Zerfall-Block·Paar] ein entferntes Paar (Einheit und Umschlag) wirft auch in der Lese-App', async () => {
  const u = kopie(await datei());
  const adresse = Object.keys(u.umschlagTabelle[0].umschlaege)[0];
  delete u.umschlagTabelle[0].umschlaege[adresse];
  delete u.einheiten[adresse];
  assert.equal(Object.keys(u.umschlagTabelle[0].umschlaege).length, Object.keys(u.einheiten).length,
    'Vorbedingung: die Zahlen stimmen weiter — genau das sah der alte Vergleich nicht');
  assert.equal(await imKern(u, PW), 'struktur', 'Gegenprobe Kern');
  assert.equal(await L.datei(u, PW), 'struktur', 'Lese-App, Datei');
  assert.equal(await L.sub(u, PW), 'struktur', 'Lese-App, Sub-Depot');
});

test('[Zerfall-Block·Paar·Rot-Beweis] mit dem alten Vergleich nimmt die Lese-App die gekürzte Datei an', async () => {
  const original = fs.readFileSync(LESEN, 'utf8');
  const anker = "  const verzeichnis = (geheimKlar && Array.isArray(geheimKlar.adressen)) ? geheimKlar.adressen : null;";
  assert.equal(original.split(anker).length - 1, 1, 'Vorbedingung: das Verzeichnis wird genau einmal gelesen');
  const u = kopie(await datei());
  const adresse = Object.keys(u.umschlagTabelle[0].umschlaege)[0];
  delete u.umschlagTabelle[0].umschlaege[adresse];
  delete u.einheiten[adresse];
  await mitLeseApp(original.replace(anker, '  const verzeichnis = null;'), async (R) => {
    assert.notEqual(await R.datei(u, PW), 'struktur', 'genau die Lücke: das Paar fehlt still');
  });
});

test('[Zerfall-Block·abgelaufen] die Lese-App zeigt für ein abgelaufenes Fach den eigenen Satz, nicht „Passwort falsch“', () => {
  const text = fs.readFileSync(LESEN, 'utf8');
  const { ladeLesen } = require('./load-lesen.js');
  const S = ladeLesen().V.STRINGS || null;
  const de = /fachAbgelaufen: 'Dieses Fach galt bis \{datum\}/.test(text);
  const en = /fachAbgelaufen: "This compartment was valid until \{datum\}/.test(text);
  assert.ok(de && en, 'der Satz steht nicht in beiden Sprachen der Lese-App');
  assert.match(text, /istAbgelaufen \? STRINGS\.fachAbgelaufen\.replace\('\{datum\}'/, 'das Passwort-Formular wählt den Satz nicht');
  assert.match(text, /if \(e1 && e1\.code === 'fach-abgelaufen'\) throw e1;/, 'nach einem abgelaufenen Fach folgt ein zweiter Versuch (NFD)');
  if (S) assert.notEqual(S.fachAbgelaufen, S.pwFalsch);
});

test('[Zerfall-Block·NFC] ein Fach-Passwort mit Umlaut geht in der Lese-App in jeder Unicode-Form auf', async () => {
  const u = await datei();
  assert.notEqual(PW_FACH.normalize('NFD'), PW_FACH.normalize('NFC'), 'Vorbedingung: die Formen unterscheiden sich');
  for (const f of ['NFC', 'NFD']) {
    assert.equal(await L.datei(u, PW_FACH.normalize(f)), 'offen', 'Lese-App, Datei, ' + f);
    assert.equal(await L.sub(u, PW_FACH.normalize(f)), 'offen', 'Lese-App, Sub-Depot, ' + f);
  }
});
