'use strict';
/* Der Rückweg eines Auslieferungslaufs (tools/lib/rezept-rueckweg.js) gegen eine erfundene Ablage. Der erfundene Worker
   nimmt ein Paar an, wenn die Signatur genau die Bytes des Rezepts deckt — dieselbe Frage wie rezeptKettePruefen im
   Gateway, ohne Schlüssel. Nach JEDEM einzelnen PUT wird der Zustand jedes Produkts festgehalten. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const { rezepteSichern, rezepteZurueckspielen } = require('../tools/lib/rezept-rueckweg.js');

const SLUGS = ['privat-de', 'privat-en'];
const sha = (b) => crypto.createHash('sha256').update(b).digest('hex');
const signatur = (json) => Buffer.from('sig:' + sha(json));
const paarGueltig = async (slug, json, jws) => jws.toString() === 'sig:' + sha(json);

function ablageAlt() {
  const a = new Map();
  for (const slug of SLUGS) {
    const produkt = Buffer.from('<html>' + slug + ' v751</html>');
    a.set('kern/v751.html', Buffer.from('kern v751'));
    a.set('produkte/v751/' + slug + '.html', produkt);
    const json = Buffer.from(JSON.stringify({
      slug, kernStand: 'kern/v751.html', kernPruefsumme: sha(Buffer.from('kern v751')), bereichsmodule: [], templates: [],
      lieferart: 'vorgebaut', produktPfad: 'produkte/v751/' + slug + '.html', produktPruefsumme: sha(produkt),
    }));
    a.set('rezepte/' + slug + '.json', json);
    a.set('rezepte/' + slug + '.jws', signatur(json));
  }
  return a;
}

function werkzeug(ablage) {
  const zustaende = [];
  const gueltig = (slug) => {
    const j = ablage.get('rezepte/' + slug + '.json');
    const s = ablage.get('rezepte/' + slug + '.jws');
    return !!(j && s && s.toString() === 'sig:' + sha(j));
  };
  return {
    zustaende,
    gueltig,
    holen: async (p) => (ablage.has(p) ? Buffer.from(ablage.get(p)) : null),
    schreiben: async (p, inhalt) => {
      ablage.set(p, Buffer.from(inhalt));
      zustaende.push({ nach: p, gueltig: Object.fromEntries(SLUGS.map((s) => [s, gueltig(s)])) });
    },
  };
}

function schritt4(ablage) {
  for (const slug of SLUGS) ablage.set('rezepte/' + slug + '.json', Buffer.from('{"slug":"' + slug + '","neu":true}'));
}
function schritt5Teilweise(ablage, slug) {
  ablage.set('rezepte/' + slug + '.jws', signatur(ablage.get('rezepte/' + slug + '.json')));
}
const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'rezept-rueckweg-'));

test('[Rückweg] Schritt 4 durch, Schritt 5 rot: je Produkt genau EIN PUT (.json), und nach jedem PUT ist das Produkt wieder gültig', async () => {
  const ablage = ablageAlt();
  const w = werkzeug(ablage);
  const ordner = tmp();
  try {
    await rezepteSichern({ slugs: SLUGS, holen: w.holen, ordner });
    schritt4(ablage);
    for (const s of SLUGS) assert.equal(w.gueltig(s), false, 'Kontrolle: nach Schritt 4 liefert der Worker ' + s + ' nicht aus');
    const r = await rezepteZurueckspielen({ ordner, holen: w.holen, schreiben: w.schreiben, paarGueltig });
    assert.deepEqual(r.map((x) => x.geschrieben), [['rezepte/privat-de.json'], ['rezepte/privat-en.json']]);
    assert.deepEqual(w.zustaende, [
      { nach: 'rezepte/privat-de.json', gueltig: { 'privat-de': true, 'privat-en': false } },
      { nach: 'rezepte/privat-en.json', gueltig: { 'privat-de': true, 'privat-en': true } },
    ]);
    assert.deepEqual(new Map([...ablage].sort()), new Map([...ablageAlt()].sort()), 'die Ablage ist byte-gleich mit dem Zustand vor dem Lauf');
  } finally { fs.rmSync(ordner, { recursive: true, force: true }); }
});

test('[Rückweg] Schritt 5 hat privat-de schon signiert: dort geht das PAAR zurück, mit genau einem Zwischenzustand', async () => {
  const ablage = ablageAlt();
  const w = werkzeug(ablage);
  const ordner = tmp();
  try {
    await rezepteSichern({ slugs: SLUGS, holen: w.holen, ordner });
    schritt4(ablage);
    schritt5Teilweise(ablage, 'privat-de');
    assert.equal(w.gueltig('privat-de'), true, 'Kontrolle: das neue Paar von privat-de ist gültig');
    const r = await rezepteZurueckspielen({ ordner, holen: w.holen, schreiben: w.schreiben, paarGueltig });
    assert.deepEqual(r[0].geschrieben, ['rezepte/privat-de.json', 'rezepte/privat-de.jws']);
    assert.deepEqual(w.zustaende.map((z) => z.gueltig['privat-de']), [false, true, true],
      'nach .json nicht gültig (die neue Signatur deckt die alten Bytes nicht), nach .jws wieder gültig');
    assert.deepEqual(new Map([...ablage].sort()), new Map([...ablageAlt()].sort()));
  } finally { fs.rmSync(ordner, { recursive: true, force: true }); }
});

test('[Rückweg·Rot-Beweis] eine Datei, auf die das alte Rezept zeigt, ist nach der Sicherung verändert: nichts geschrieben', async () => {
  const ablage = ablageAlt();
  const w = werkzeug(ablage);
  const ordner = tmp();
  try {
    await rezepteSichern({ slugs: SLUGS, holen: w.holen, ordner });
    schritt4(ablage);
    ablage.set('produkte/v751/privat-en.html', Buffer.from('<html>überschrieben</html>'));
    await assert.rejects(rezepteZurueckspielen({ ordner, holen: w.holen, schreiben: w.schreiben, paarGueltig }),
      /NICHT gefahren[\s\S]*privat-en: produkte\/v751\/privat-en\.html weicht vom alten Rezept ab/);
    assert.deepEqual(w.zustaende, [], 'kein einziger PUT — auch nicht für privat-de, dessen Dateien stimmen');
  } finally { fs.rmSync(ordner, { recursive: true, force: true }); }
});

test('[Rückweg·Rot-Beweis] eine verfälschte Sicherung oder ein Paar ohne gültige Signatur: nichts geschrieben', async () => {
  for (const verderben of [
    (ordner) => fs.writeFileSync(path.join(ordner, 'privat-de.json'), '{"slug":"privat-de","verfaelscht":true}'),
    (ordner) => {
      const f = path.join(ordner, 'sicherung.json');
      const s = JSON.parse(fs.readFileSync(f, 'utf8'));
      fs.writeFileSync(path.join(ordner, 'privat-de.jws'), 'sig:falsch');
      s.rezepte[0].jws = sha(Buffer.from('sig:falsch'));
      fs.writeFileSync(f, JSON.stringify(s));
    },
  ]) {
    const ablage = ablageAlt();
    const w = werkzeug(ablage);
    const ordner = tmp();
    try {
      await rezepteSichern({ slugs: SLUGS, holen: w.holen, ordner });
      schritt4(ablage);
      verderben(ordner);
      await assert.rejects(rezepteZurueckspielen({ ordner, holen: w.holen, schreiben: w.schreiben, paarGueltig }), /NICHT gefahren[\s\S]*privat-de/);
      assert.deepEqual(w.zustaende, []);
    } finally { fs.rmSync(ordner, { recursive: true, force: true }); }
  }
});

test('[Rückweg·Gegenprobe] vor dem ersten Lauf lag kein Rezept oben: nichts zurückzuspielen, kein Fehler', async () => {
  const ablage = new Map();
  const w = werkzeug(ablage);
  const ordner = tmp();
  try {
    await rezepteSichern({ slugs: SLUGS, holen: w.holen, ordner });
    schritt4(ablage);
    const r = await rezepteZurueckspielen({ ordner, holen: w.holen, schreiben: w.schreiben, paarGueltig });
    assert.deepEqual(r, []);
    assert.deepEqual(w.zustaende, []);
  } finally { fs.rmSync(ordner, { recursive: true, force: true }); }
});
