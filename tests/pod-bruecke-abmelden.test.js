'use strict';
/* ═════════════════════════════════════════════════════════════════
   Test — Pod-Brücke: Abmelden verliert keine Ablage still (pod/bruecke.js, Befund POD-ABMELDEN-VERLIERT-ABLAGEN)
   ─────────────────────────────────────────────────────────────────
   WAS DIESE PROBE HÄLT
     Das lokale Verzeichnis ist die einzige Liste der Ablagen; „Abmelden“ löscht es (U2-ADR-512 Nr. 6). Danach setzt die
     Brücke keinen Ablauf mehr durch und kann nichts zurücknehmen. Darum gilt beim Knopf „Abmelden“:
     1. Abgelaufene Ablagen löscht die Brücke vorher, Grant und Ressource, wie nach der Anmeldung.
     2. Liegen danach noch offene Ablagen, meldet sie sich nicht ab, sondern nennt sie und bietet an: alle zurücknehmen und
        abmelden, abmelden und die Ablagen im Pod lassen, oder abbrechen.
     3. „Alle zurücknehmen“ löscht Grant und Ressource jeder offenen Ablage und meldet erst danach ab. Scheitert eine Rücknahme,
        bleibt die Person angemeldet und das Verzeichnis erhalten.
     4. Ohne offene Ablage meldet sie sich gleich ab. Ohne bestätigtes Ziel („Nein, abmelden“) schreibt sie nichts in den Pod.
     5. Rot-Beweis: mit dem Abmelden ohne diese Prüfung bleibt die abgelaufene Ablage im Pod liegen, und das Verzeichnis ist weg.
   bruecke.js läuft in einem vm-Kontext; Anmeldung und Pod sind gestellt.
   ═════════════════════════════════════════════════════════════════ */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { webcrypto } = require('node:crypto');
const C = require('../pod/chiffrat-pruefen.js');

const QUELLE = fs.readFileSync(path.join(__dirname, '..', 'pod', 'bruecke.js'), 'utf8');
const HTML = fs.readFileSync(path.join(__dirname, '..', 'pod', 'bruecke.html'), 'utf8');
const KONFIG = fs.readFileSync(path.join(__dirname, '..', 'pod', 'konfiguration.js'), 'utf8');
// Der einzige Schreibweg (U2-ADR-520) läuft in derselben Seite, wie bruecke.html ihn lädt.
const AUSSENABLAGE = fs.readFileSync(path.join(__dirname, '..', 'pod', 'aussenablage.js'), 'utf8');
const WEBID = 'https://person.example/profile/card#me';
const SPEICHER = 'https://speicher.example/person/';
const TAG = 86400000;
const INTERN = SPEICHER + 'vivodepot/k/';
// Die Felder, die auch im Verzeichnis im Pod stehen (KOPIE_FELDER in bruecke.js).
const ABGELAUFEN = { adresse: SPEICHER + 'vivodepot/freigaben/alt', art: 'stelle', stelle: 'https://stelle.example/#id', bis: Date.now() - TAG, am: 1, grant: SPEICHER + 'vivodepot/grants/alt.json', ueberDienst: false };
const OFFEN = { adresse: SPEICHER + 'vivodepot/links/offen', art: 'link', stelle: null, bis: Date.now() + 30 * TAG, am: 2, grant: null, ueberDienst: null };
const OHNE_ABLAUF = { adresse: SPEICHER + 'vivodepot/sicherungen/eigen', art: 'eigen', stelle: null, bis: null, am: 3, grant: null, ueberDienst: null };

// Die Abmeldung, wie sie vor dem Befund verdrahtet war: sofort abmelden und das Verzeichnis löschen.
const ABMELDEN_ALT = "$('abmelden').onclick = function () {\n" +
  "      A.abmelden().then(function (ergebnis) { document.body.dataset.abmeldung = ergebnis; return A.verzeichnis.loeschen(); })\n" +
  "        .then(function () { angemeldetZeigen(null); });\n" +
  '    };';

/* Die Kette der umschließenden <div id> eines Elements in der Seite: Ist eines davon verborgen, sieht die Person das Element
   nicht, auch wenn es selbst nicht verborgen ist. */
function vorfahren(html, id) {
  const stapel = [];
  const re = /<div\b([^>]*)>|<\/div>|<[a-z]+\b[^>]*\bid="([^"]+)"/g;
  let m;
  while ((m = re.exec(html))) {
    if (m[0] === '</div>') { stapel.pop(); continue; }
    const eigene = m[1] !== undefined ? (m[1].match(/\bid="([^"]+)"/) || [])[1] : m[2];
    if (eigene === id) return stapel.filter(Boolean);
    if (m[1] !== undefined) stapel.push(eigene || null);
  }
  throw new Error('nicht in der Seite: ' + id);
}
function anfangsVerborgen(html, id) { return new RegExp('id="' + id + '"[^>]*\\bhidden\\b').test(html); }

async function seite({ quelle = QUELLE, html = HTML, eintraege = [], zielBestaetigen = true, deleteStatus = () => 204 } = {}) {
  const elemente = {};
  const el = (id) => (elemente[id] = elemente[id] || { id, hidden: anfangsVerborgen(html, id), textContent: '', value: '', onclick: null, onchange: null, files: [], appendChild() {} });
  const ablauf = [];
  let gespeichert = eintraege.slice();
  let abgemeldet = false;
  // Dateien unter intern/ (Ablaufliste, verschlüsseltes Verzeichnis; U2-ADR-520) mit ETag. Ohne Kern (kein Öffner) schreibt die
  // Brücke nur die Ablaufliste.
  const intern = new Map();
  let etag = 0;
  const A = {
    ruecksprungVerarbeiten: async () => WEBID,
    sitzung: async () => ({ webid: WEBID }),
    speicherSetzen: async () => {},
    abmelden: async () => { abgemeldet = true; ablauf.push('abmelden'); return 'lokal-geloescht'; },
    podFetch: async (adresse, o = {}) => {
      const methode = (o.method || 'GET').toUpperCase();
      ablauf.push(methode + ' ' + adresse);
      if (adresse.startsWith(INTERN) && adresse !== INTERN && !adresse.endsWith('.acl')) {
        const h = (o.headers || {});
        const r = intern.get(adresse);
        const antwort = (status, x) => ({ ok: status < 300, status, headers: { get: (k) => (k === 'ETag' && x ? x.etag : null) },
          json: async () => JSON.parse(x.koerper), text: async () => x.koerper });
        if (methode === 'GET') return r ? antwort(200, r) : antwort(404, null);
        if (methode === 'PUT') {
          if ((h['If-Match'] && (!r || h['If-Match'] !== r.etag)) || (h['If-None-Match'] === '*' && r)) return antwort(412, null);
          const neu = { koerper: o.body, etag: '"' + (++etag) + '"' }; intern.set(adresse, neu); return antwort(201, neu);
        }
      }
      const status = methode === 'DELETE' ? deleteStatus(adresse) : 200;
      return { ok: status < 300, status, headers: { get: () => null }, json: async () => null, text: async () => '' };
    },
    verzeichnis: {
      lesen: async () => (gespeichert ? gespeichert.slice() : undefined),
      schreiben: async (v) => { gespeichert = v.slice(); },
      loeschen: async () => { gespeichert = undefined; ablauf.push('verzeichnis-geloescht'); }
    }
  };
  const kontext = {
    vdPodAnmeldung: A, vdPodChiffrat: C, vdPodLws: require('../pod/lws.js'),
    document: { readyState: 'complete', getElementById: el, querySelector: () => null, createElement: () => el('neu-' + Math.random()), body: { dataset: {} } },
    window: { opener: null, addEventListener: () => {} },
    fetch: async () => ({ ok: true, text: async () => '<#me> <http://www.w3.org/ns/pim/space#storage> <' + SPEICHER + '>.\n' }),
    crypto: webcrypto, btoa: (s) => Buffer.from(s, 'binary').toString('base64'), Blob, URL, Promise, Date, Number, String, Error, Uint8Array, JSON,
    ArrayBuffer, TextDecoder, Object
  };
  kontext.self = kontext;
  vm.createContext(kontext);
  vm.runInContext(KONFIG, kontext);
  vm.runInContext(AUSSENABLAGE, kontext);
  vm.runInContext(quelle, kontext);
  const warten = () => new Promise((r) => setTimeout(r, 20));
  await warten();
  // Ein abgelaufener Eintrag soll den Knopf erreichen: das Verzeichnis kommt erst nach dem Zeigen hinzu, wie bei einer
  // Ablage, deren Frist während der Sitzung abläuft.
  if (zielBestaetigen) { el('ziel-ja').onclick(); await warten(); }
  ablauf.length = 0;
  return {
    el, ablauf, warten,
    sichtbar: (id) => [id].concat(vorfahren(html, id)).every((x) => !el(x).hidden),
    verzeichnisSetzen: (v) => { gespeichert = v.slice(); },
    ablaufliste: () => (intern.has(INTERN + 'a1.json') ? JSON.parse(intern.get(INTERN + 'a1.json').koerper) : null),
    verzeichnis: () => gespeichert,
    abgemeldet: () => abgemeldet,
    deletes: () => ablauf.filter((a) => a.startsWith('DELETE ')).map((a) => a.slice(7))
  };
}

async function klick(s, id) { await s.el(id).onclick(); await s.warten(); }

test('[Pod·Abmelden] abgelaufene Ablage wird vor dem Abmelden gelöscht, eine offene hält die Abmeldung an', async () => {
  const s = await seite();
  s.verzeichnisSetzen([ABGELAUFEN, OFFEN]);
  await klick(s, 'abmelden');
  assert.deepEqual(s.deletes(), [ABGELAUFEN.grant, ABGELAUFEN.adresse], 'Grant und Ressource der abgelaufenen Ablage gelöscht');
  assert.equal(s.abgemeldet(), false, 'mit offener Ablage meldet sich die Brücke nicht still ab');
  assert.equal(s.el('abmelden-pruefen').hidden, false, 'die Rückfrage erscheint');
  assert.match(s.el('abmelden-satz').textContent, /eine Ablage/);
  // Ohne Kern (Datei-Weg) gibt es kein verschlüsseltes Verzeichnis; die Ablaufliste setzt den Ablauf weiter durch. Den Satz mit
  // Verzeichnis hält tests/pod-bruecke-verzeichnis-pod.test.js.
  assert.match(s.el('abmelden-satz').textContent, /kennt die Seite sie nicht mehr/);
  assert.match(s.el('abmelden-satz').textContent, /Ablaufdaten setzt die Seite nach jeder Anmeldung durch/);
  assert.deepEqual(s.verzeichnis().map((e) => e.adresse), [OFFEN.adresse]);
});

test('[Pod·Abmelden] „Alle zurücknehmen“ löscht jede offene Ablage und meldet erst danach ab', async () => {
  const s = await seite();
  s.verzeichnisSetzen([OFFEN, OHNE_ABLAUF]);
  await klick(s, 'abmelden');
  assert.match(s.el('abmelden-satz').textContent, /2 Ablagen/);
  await klick(s, 'abmelden-alle');
  assert.deepEqual(s.deletes(), [OFFEN.adresse, OHNE_ABLAUF.adresse]);
  const abmelden = s.ablauf.indexOf('abmelden');
  assert.ok(abmelden > s.ablauf.lastIndexOf('DELETE ' + OHNE_ABLAUF.adresse), 'abgemeldet wird nach der letzten Rücknahme');
  assert.equal(s.verzeichnis(), undefined, 'das lokale Verzeichnis ist danach gelöscht');
  assert.equal(s.el('abmelden-pruefen').hidden, true);
});

test('[Pod·Abmelden] scheitert eine Rücknahme, bleibt die Person angemeldet und das Verzeichnis erhalten', async () => {
  const s = await seite({ deleteStatus: (a) => (a === OHNE_ABLAUF.adresse ? 500 : 204) });
  s.verzeichnisSetzen([OFFEN, OHNE_ABLAUF]);
  await klick(s, 'abmelden');
  await klick(s, 'abmelden-alle');
  assert.equal(s.abgemeldet(), false);
  assert.deepEqual(s.verzeichnis().map((e) => e.adresse), [OHNE_ABLAUF.adresse], 'die gescheiterte bleibt im Verzeichnis');
  assert.match(s.el('fehler').textContent, /loeschen-500/);
});

test('[Pod·Abmelden] „Ablagen im Pod lassen“ meldet ab, ohne zurückzunehmen; „Abbrechen“ tut nichts', async () => {
  const a = await seite();
  a.verzeichnisSetzen([OFFEN]);
  await klick(a, 'abmelden');
  await klick(a, 'abmelden-abbrechen');
  assert.equal(a.abgemeldet(), false);
  assert.equal(a.el('abmelden-pruefen').hidden, true);
  assert.deepEqual(a.deletes(), []);
  const b = await seite();
  b.verzeichnisSetzen([OFFEN]);
  await klick(b, 'abmelden');
  await klick(b, 'abmelden-lassen');
  assert.equal(b.abgemeldet(), true);
  assert.deepEqual(b.deletes(), [], 'nichts zurückgenommen');
  assert.equal(b.verzeichnis(), undefined);
});

test('[Pod·Abmelden] ohne offene Ablage gleich abgemeldet', async () => {
  const a = await seite();
  a.verzeichnisSetzen([ABGELAUFEN]);
  await klick(a, 'abmelden');
  assert.deepEqual(a.deletes(), [ABGELAUFEN.grant, ABGELAUFEN.adresse]);
  assert.equal(a.abgemeldet(), true);
  const b = await seite({ zielBestaetigen: false });
  await klick(b, 'ziel-nein');
  assert.equal(b.abgemeldet(), true, 'leeres Verzeichnis, unbestätigtes Ziel: gleich abgemeldet');
});

test('[Pod·Abmelden] neu geladen, Ziel unbestätigt, offene Ablage: keine stille Abmeldung, kein Schreiben im Pod', async () => {
  const s = await seite({ zielBestaetigen: false });
  s.verzeichnisSetzen([ABGELAUFEN, OFFEN]);
  await klick(s, 'ziel-nein');
  assert.equal(s.abgemeldet(), false, 'die Rückfrage hält die Abmeldung an');
  assert.equal(s.el('ablage-bereich').hidden, true, 'vor dem Bestätigen ist der Ablagebereich verborgen');
  assert.ok(s.sichtbar('abmelden-pruefen'), 'die Rückfrage ist sichtbar, kein umschließender Bereich ist verborgen');
  assert.ok(s.sichtbar('abmelden-lassen'), 'der Knopf zum Abmelden ist erreichbar');
  assert.equal(s.el('abmelden-alle').hidden, true, 'ohne bestätigtes Ziel keine Rücknahme');
  assert.match(s.el('abmelden-satz').textContent, /2 Ablagen[\s\S]*Speicher bestätigt/);
  assert.match(s.el('abmelden-satz').textContent, /Pod-Anbieter/, 'ohne gelesene Kopie gilt der Satz aus Teil 1');
  assert.deepEqual(s.ablauf.filter((a) => !a.startsWith('GET ')), [], 'ein unbestätigter Speicher wird nicht beschrieben');
  await klick(s, 'abmelden-lassen');
  assert.equal(s.abgemeldet(), true);
  assert.deepEqual(s.deletes(), []);
});

test('[Pod·Abmelden·Rot-Beweis] läge die Rückfrage im Ablagebereich, sähe die Person sie vor dem Bestätigen nicht', async () => {
  const rueckfrage = HTML.match(/\n<div id="abmelden-pruefen"[\s\S]*?\n<\/div>\n/);
  assert.ok(rueckfrage, 'die Rückfrage steht als eigener Block in der Seite');
  const ohne = HTML.replace(rueckfrage[0], '\n');
  const ende = ohne.indexOf('<div id="ablage-bereich"');
  const schluss = ohne.indexOf('\n</div>\n', ende);
  assert.ok(ende > 0 && schluss > ende);
  const drinnen = ohne.slice(0, schluss) + rueckfrage[0] + ohne.slice(schluss);
  assert.deepEqual(vorfahren(drinnen, 'abmelden-pruefen'), ['ablage-bereich']);
  const s = await seite({ html: drinnen, zielBestaetigen: false });
  s.verzeichnisSetzen([ABGELAUFEN, OFFEN]);
  await klick(s, 'ziel-nein');
  assert.equal(s.el('abmelden-pruefen').hidden, false, 'für sich nicht verborgen');
  assert.equal(s.sichtbar('abmelden-pruefen'), false, 'aber im verborgenen Ablagebereich');
});

test('[Pod·Abmelden] scheitert das Löschen der abgelaufenen, erscheint die Rückfrage ohne Rücknahme', async () => {
  const s = await seite({ deleteStatus: (a) => (a === ABGELAUFEN.grant ? 503 : 204) });
  s.verzeichnisSetzen([ABGELAUFEN, OFFEN]);
  await klick(s, 'abmelden');
  assert.match(s.el('fehler').textContent, /loeschen-503/);
  assert.equal(s.abgemeldet(), false);
  assert.equal(s.el('abmelden-pruefen').hidden, false);
  assert.equal(s.el('abmelden-alle').hidden, true);
  assert.match(s.el('abmelden-satz').textContent, /nicht löschen/);
  await klick(s, 'abmelden-abbrechen');
  assert.equal(s.el('abmelden-pruefen').hidden, true);
  assert.deepEqual(s.verzeichnis().map((e) => e.adresse), [ABGELAUFEN.adresse, OFFEN.adresse]);
});

test('[Pod·Abmelden·Rot-Beweis] ohne die Rückfrage bei unbestätigtem Ziel meldet sich die Brücke still ab', async () => {
  const stelle = /if \(!zielBestaetigt\) \{[\s\S]*?\n    \}\n/;
  assert.match(QUELLE, stelle);
  const s = await seite({ quelle: QUELLE.replace(stelle, 'if (!zielBestaetigt) return abmeldenLokal();\n'), zielBestaetigen: false });
  s.verzeichnisSetzen([OFFEN]);
  await klick(s, 'ziel-nein');
  assert.equal(s.abgemeldet(), true);
  assert.equal(s.verzeichnis(), undefined, 'das Verzeichnis ist ohne Rückfrage weg');
});

test('[Pod·Abmelden] die Seite trägt die Rückfrage mit drei Knöpfen', () => {
  for (const id of ['abmelden-pruefen', 'abmelden-satz', 'abmelden-alle', 'abmelden-lassen', 'abmelden-abbrechen']) {
    assert.match(HTML, new RegExp('id="' + id + '"'), id);
  }
  assert.match(HTML, /<div id="abmelden-pruefen"[^>]*\bhidden\b/, 'die Rückfrage ist zu Beginn verborgen');
});

test('[Pod·Abmelden·Rot-Beweis] mit der alten Abmeldung bleibt die abgelaufene Ablage liegen und das Verzeichnis ist weg', async () => {
  const neu = /\$\('abmelden'\)\.onclick = [^\n]*\n/;
  assert.match(QUELLE, neu, 'die Abmeldung ist an einer Zeile verdrahtet');
  const s = await seite({ quelle: QUELLE.replace(neu, ABMELDEN_ALT + '\n') });
  s.verzeichnisSetzen([ABGELAUFEN, OFFEN]);
  await klick(s, 'abmelden');
  assert.deepEqual(s.deletes(), [], 'nichts gelöscht');
  assert.equal(s.verzeichnis(), undefined, 'das Verzeichnis ist weg');
  assert.equal(s.abgemeldet(), true);
});
