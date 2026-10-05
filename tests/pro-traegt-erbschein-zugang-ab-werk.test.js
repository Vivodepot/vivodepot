'use strict';
/* Pro trägt die Vorlagen für Erbschein und Zugang ab Werk (Entscheidung der Geschäftsführung, 04.10.2026).
   Bis dahin standen beide Templates (`erbschein-vorbereitung`, `zugang-zum-recht-beratungshilfe`) nur im Rezept von
   privat-de/privat-en (tools/lib/vier-produkte.js). Eine Privat-Datei mit beiden Auszügen behielt in Pro zwar ihre Kopie,
   aber Pro kannte sie nicht als eigene: die Kopie stand als fremdes Modul in den Einstellungen.
   Diese Probe hält:
   · jedes Pro-Produkt trägt beide als Ab-Werk-Saat;
   · eine Privat-Datei mit beiden Auszügen öffnet in Pro ohne Meldung (kein Auszug unter den fremden Modulen) und ohne
     Verlust (Bereiche, Auszüge, Rundlauf zurück nach privat-de);
   · Herkunft nur über den Fingerabdruck: ein Modul mit derselben Kennung, aber anderem Inhalt, ist nicht ab Werk —
     die Kennung allein ist eine Selbstauskunft der Datei. */
const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { konfektionieren } = require('../tools/produkt-konfektionieren.js');
const { PRODUKTE, modulDateienFuer } = require('../tools/lib/vier-produkte.js');

const LOAD_KERN = path.join(__dirname, 'load-kern.js');
const FIXTURE = path.join(__dirname, 'fixtures', 'vorfuehrung-zugang-zum-recht', 'demo-de.vivodepot');
const PASSWORT = 'zugang-zum-recht-vorfuehrung-2026';   // steht im README der Fixture
const AUSZUEGE = ['erbschein-vorbereitung', 'zugang-zum-recht-beratungshilfe'];
const PRO = PRODUKTE.map((p) => p.slug).filter((s) => s.startsWith('pro-'));

const gebaut = new Map();
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'vd-pro-abwerk-'));
after(() => fs.rmSync(TMP, { recursive: true, force: true }));
function produktKern(slug) {
  if (!gebaut.has(slug)) {
    const p = PRODUKTE.find((x) => x.slug === slug);
    const ziel = path.join(TMP, slug);
    const r = konfektionieren({
      ziel, slug, modulauswahl: [],
      vorDepotKonfigurationInhaltFn: () => 'window.__vorDepotKonfiguration = [];\n',
      unsignierteModulDateien: modulDateienFuer(p),
    });
    gebaut.set(slug, path.join(r.ordner, 'vivodepot.html'));
  }
  // Der gebaute Produktkern wird ausdrücklich übergeben (htmlPfad), nicht über die Umgebung umgelenkt.
  return require(LOAD_KERN).ladeKern({ htmlPfad: gebaut.get(slug) });
}
const umschlagAusFixture = () => { const roh = fs.readFileSync(FIXTURE, 'utf8'); return JSON.parse(roh.slice(roh.indexOf('{'))); };
const sichtbar = (V) => V._logikModuleAlle(V.getData()).map((m) => m && m.id).filter((id) => AUSZUEGE.includes(id)).sort();
const fremdGelistet = (V) => V.eingelasseneModule().filter((m) => AUSZUEGE.includes(m.kennung) && !m.abWerk).map((m) => m.kennung).sort();
const kopie = (x) => JSON.parse(JSON.stringify(x));

// Eine heutige Privat-Datei: die Fixture einmal in privat-de geöffnet und gesichert.
let PRIVAT_UMSCHLAG = null;
async function privatDatei() {
  if (!PRIVAT_UMSCHLAG) {
    const { V } = produktKern('privat-de');
    await V.depotLaden(umschlagAusFixture(), PASSWORT);
    PRIVAT_UMSCHLAG = { umschlag: await V.depotSerialisieren(), sektoren: kopie(V.getData().sektoren) };
  }
  return { umschlag: kopie(PRIVAT_UMSCHLAG.umschlag), sektoren: PRIVAT_UMSCHLAG.sektoren };
}

for (const slug of PRO) {
  test('[Pro·Ab-Werk·' + slug + '] trägt Erbschein und Zugang als Saat des Produkts', async () => {
    const { V } = produktKern(slug);
    await V.depotAnlegen('pro-ab-werk-probe');
    assert.deepEqual(sichtbar(V), AUSZUEGE, 'ein frisches Pro-Depot sieht beide');
    assert.deepEqual((V.getData().logikModule || []).map((m) => m && m.id).filter((id) => AUSZUEGE.includes(id)), [], 'als Saat des Produkts, nicht als Kopie im Depot');
  });

  test('[Pro·Ab-Werk·' + slug + '] eine Privat-Datei mit beiden Auszügen öffnet ohne Meldung und ohne Verlust', async () => {
    const { umschlag, sektoren } = await privatDatei();
    const { V } = produktKern(slug);
    await V.depotLaden(umschlag, PASSWORT);
    assert.deepEqual(sichtbar(V), AUSZUEGE, 'beide Auszüge sichtbar');
    assert.deepEqual(fremdGelistet(V), [], 'kein Auszug steht unter den fremden Modulen — sonst meldet Pro sie');
    assert.deepEqual(kopie(V.getData().sektoren), sektoren, 'die Bereiche der Datei kommen unverändert an');
    const zurueck = await V.depotSerialisieren();
    const { V: P } = produktKern('privat-de');
    await P.depotLaden(zurueck, PASSWORT);
    assert.deepEqual(sichtbar(P), AUSZUEGE, 'nach dem Sichern in Pro sieht privat-de wieder beide');
    assert.deepEqual(kopie(P.getData().sektoren), sektoren, 'Rundlauf ohne Verlust');
  });

  test('[Pro·Ab-Werk·' + slug + '·Fingerabdruck] gleiche Kennung, anderer Inhalt: nicht ab Werk', async () => {
    const { V } = produktKern(slug);
    await V.depotAnlegen('pro-ab-werk-probe');
    const saat = V._logikModuleAlle(V.getData()).find((m) => m && m.id === AUSZUEGE[0]);
    assert.ok(saat, 'Vorbedingung: das Produkt trägt die Saat');
    const gleich = kopie(saat);
    const anders = { ...kopie(saat), titel: String(saat.titel || '') + ' (verändert)' };
    const ziel = V._abWerkMerkmalNeuSetzen({ logikModule: [gleich, anders] });
    assert.equal(ziel.logikModule[0].abWerk, true, 'Positivkontrolle: Zeichen für Zeichen gleich ist ab Werk');
    assert.notEqual(ziel.logikModule[1].abWerk, true, 'die Kennung allein ist eine Selbstauskunft der Datei');
  });
}
