'use strict';
/* ═══════════════════════════════════════════════════════════════
   Geteiltes Gerät (Familie): das Depot im Gerätespeicher ist ohne Passwort NICHT lesbar
   ───────────────────────────────────────────────────────────────
   Frage (19.09.2026): sieht ein zweiter Tab im selben Browser den INHALT des Depots ohne Passwort
   oder nur „es gibt ein Depot, bitte entsperren“? Gemessen (Firefox): nur Letzteres. Der Gerätespeicher (IndexedDB
   `vivodepot/depots`) hält einen Chiffre-Umschlag (kryptoVersion 4, cipherBlob), keinen Klartext; localStorage ist leer;
   der zweite Tab und ein Neuladen des ersten zeigen die Passwort-Eingabe. Diese Probe hält das fest.

   Grenze der Aussage: sie gilt für den Ruhezustand (Speicher, zweiter Tab, Neuladen). Ein Depot, das im ersten Tab
   OFFEN ist, liegt dort im Speicher der Seite — das ist der Preis jeder geöffneten Sitzung und nicht Gegenstand hier.
   ═══════════════════════════════════════════════════════════════ */
const { test, expect } = require('@playwright/test');
const { depotAnlegen, oeffneSektor, setzeFeld, KERN_URL } = require('../e2e/helpers');

const GEHEIMNAME = 'Geheimfrau';
const GEHEIMWERT = 'Geheimweg 42';

/* Alles, was der Browser für diese Seite dauerhaft hält, als Text: localStorage + jede IndexedDB. Binärwerte werden
   auf ihre Länge verkürzt; Zeichenketten (auch die im cipherBlob) bleiben lesbar. */
async function rohspeicher(page) {
  return page.evaluate(async () => {
    const out = { ls: JSON.stringify(Object.assign({}, localStorage)), ss: JSON.stringify(Object.assign({}, sessionStorage)), idb: [] };
    const dbs = indexedDB.databases ? await indexedDB.databases() : [];
    for (const d of dbs) {
      await new Promise((res) => {
        const r = indexedDB.open(d.name);
        r.onerror = () => res();
        r.onsuccess = () => {
          const db = r.result; const stores = [...db.objectStoreNames];
          if (!stores.length) { db.close(); return res(); }
          const tx = db.transaction(stores, 'readonly'); let n = stores.length;
          stores.forEach((s) => {
            const g = tx.objectStore(s).getAll();
            const fertig = () => { if (--n === 0) { db.close(); res(); } };
            g.onerror = fertig;
            g.onsuccess = () => {
              out.idb.push({ db: d.name, store: s, text: JSON.stringify(g.result, (k, v) => ((v instanceof ArrayBuffer || ArrayBuffer.isView(v)) ? '[bin ' + v.byteLength + ']' : v)) });
              fertig();
            };
          });
        };
      });
    }
    return out;
  });
}
const alsText = (roh) => roh.ls + roh.ss + roh.idb.map((x) => x.text).join('\n');
const seitenText = (p) => p.evaluate(() => document.body.innerText.replace(/\s+/g, ' '));

test('[Geteiltes Gerät] zweiter Tab und Neuladen zeigen nur „bitte entsperren“; der Speicher hält Chiffre, keinen Klartext', async ({ browser }) => {
  const ctx = await browser.newContext({ acceptDownloads: true });
  const a = await ctx.newPage();
  await a.goto(KERN_URL);
  await a.waitForSelector('#w-anlass', { state: 'visible' });
  await depotAnlegen(a, { name: 'Maria ' + GEHEIMNAME, pw: 'geheim-pw-4711' });
  await oeffneSektor(a, 'identity');
  await setzeFeld(a, 'streetAddress', GEHEIMWERT);
  await a.waitForTimeout(2500);   // die Entprellung des Gerätespeichers (2000 ms) abwarten

  // Zweiter Tab im selben Browser: Passwort verlangt, kein Inhalt, keine geöffnete App.
  const b = await ctx.newPage();
  await b.goto(KERN_URL);
  await b.waitForSelector('input[type=password]', { state: 'visible' });
  const sicht = await seitenText(b);
  expect(sicht, 'der zweite Tab verlangt das Passwort').toContain('Passwort');
  expect(sicht, 'der zweite Tab zeigt keinen Wert').not.toContain(GEHEIMWERT);
  expect(sicht, 'der zweite Tab nennt die Inhaberin nicht').not.toContain(GEHEIMNAME);
  expect(await b.evaluate(() => (document.getElementById('app') || {}).className || ''), 'die App ist nicht geöffnet').not.toMatch(/\ban\b/);

  // Der Speicher: ein Chiffre-Umschlag, kein Klartext.
  const roh = await rohspeicher(b);
  const text = alsText(roh);
  const speicher = roh.idb.find((x) => x.store === 'depots');
  expect(speicher, 'Vorbedingung: der Gerätespeicher hält das Depot').toBeTruthy();
  expect(speicher.text, 'als Chiffre-Umschlag abgelegt').toMatch(/cipherBlob/);
  expect(speicher.text).toMatch(/kryptoVersion/);
  expect(text, 'der Wert steht nirgends im Klartext').not.toContain(GEHEIMWERT);
  expect(text, 'der Name steht nirgends im Klartext').not.toContain(GEHEIMNAME);
  expect(roh.ls, 'localStorage ist leer').toBe('{}');

  // Neuladen des ersten Tabs: wieder gesperrt.
  await a.reload();
  await a.waitForSelector('input[type=password]', { state: 'visible' });
  expect(await seitenText(a)).not.toContain(GEHEIMWERT);
  await ctx.close();
});

test('[Geteiltes Gerät·Positivkontrolle] der Rohspeicher-Leser findet einen Klartext, wenn einer da ist', async ({ browser }) => {
  const ctx = await browser.newContext();
  const p = await ctx.newPage();
  await p.goto(KERN_URL);
  await p.waitForSelector('#w-anlass', { state: 'visible' });
  await p.evaluate(async () => {
    await new Promise((res, rej) => {
      const r = indexedDB.open('positivkontrolle', 1);
      r.onupgradeneeded = () => r.result.createObjectStore('s');
      r.onsuccess = () => { const tx = r.result.transaction('s', 'readwrite'); tx.objectStore('s').put({ klartext: 'Geheimweg 42' }, 'k'); tx.oncomplete = () => { r.result.close(); res(); }; };
      r.onerror = rej;
    });
    localStorage.setItem('klartext', 'Geheimfrau');
  });
  const text = alsText(await rohspeicher(p));
  expect(text, 'ein gepflanzter Wert in IndexedDB wird gefunden').toContain(GEHEIMWERT);
  expect(text, 'ein gepflanzter Wert in localStorage wird gefunden').toContain(GEHEIMNAME);
  await ctx.close();
});
