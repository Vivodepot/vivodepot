'use strict';
/* Schema 87 (21.09.2026): der Erbschein-Auszug ist kein Kern-Auszug mehr, das Produkt trägt ihn als Template. Ein Depot auf Schema 86
   trägt eine Kopie von damals (die Stufen 79/81 haben sie eingelassen; alte Kennungen). Eigene Module gewinnen bei gleicher Kennung
   immer (`_logikModuleAlle`), die alte Kopie würde also das Modul des Produkts verdecken — dauerhaft und lautlos in den Daten der
   Bürgerin. Stufe 87 räumt sie ab, wenn das öffnende Produkt das Modul trägt; sonst bleibt sie (der Bürgerin bliebe keines).
   Das Modul wird hier über die bestehende Fixture als Stand-in-Template ins Produkt gebacken. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { konfektionieren } = require('../tools/produkt-konfektionieren.js');
const { PRODUKTE, modulDateienFuer } = require('../tools/lib/vier-produkte.js');
const { ladeIssuer } = require('./load-issuer.js');

const ID = 'erbschein-vorbereitung';
const TEMPLATE = path.join(__dirname, 'fixtures', 'erbschein-vorbereitung-logikmodul.json');

function kernMit(zusatz) {
  const p = PRODUKTE.find((x) => x.slug === 'privat-de');
  const ziel = fs.mkdtempSync(path.join(os.tmpdir(), 'erbschein-87-'));
  try {
    const dateien = modulDateienFuer(p).filter((f) => !/erbschein-vorbereitung/.test(f)).concat(zusatz);
    const r = konfektionieren({ ziel, slug: 'privat-de', modulauswahl: [],
      vorDepotKonfigurationInhaltFn: ladeIssuer().V.vorDepotKonfigurationDateiInhalt, unsignierteModulDateien: dateien });
    const vorher = process.env.KERN_HTML_PATH;
    process.env.KERN_HTML_PATH = path.join(r.ordner, 'vivodepot.html');
    const lade = path.join(__dirname, 'load-kern.js');
    delete require.cache[require.resolve(lade)];
    try { return require(lade).ladeKern({ blank: true }).V; } finally {
      if (vorher === undefined) delete process.env.KERN_HTML_PATH; else process.env.KERN_HTML_PATH = vorher;
      delete require.cache[require.resolve(lade)];
    }
  } finally { fs.rmSync(ziel, { recursive: true, force: true }); }
}

const alteKopie = () => Object.assign(JSON.parse(fs.readFileSync(TEMPLATE, 'utf8')), { titel: 'ALTE KOPIE MIT KENNUNGEN VON DAMALS' });
const depotAufSchema86 = () => ({ schemaVersion: 86, logikModule: [alteKopie()], sektoren: {} });

test('[Stufe 87] trägt das Produkt das Template, wird die alte Kopie entfernt und das Modul des Produkts greift', () => {
  const V = kernMit([TEMPLATE]);
  const d = depotAufSchema86();
  V.depotNormalisieren(d);
  assert.equal(d.logikModule.filter((m) => m.id === ID).length, 0, 'die alte Kopie ist aus dem Depot entfernt');
  // Der Laufzeit-Seed des Produkts (beim Öffnen eines Depots neu aufgebaut) liefert das Modul; im Depot steht nichts mehr, das es verdeckt.
  const wirksam = V._logikModulAbWerkSeed(d).find((m) => m.id === ID);
  assert.ok(wirksam, 'das Modul des Produkts greift');
  assert.notEqual(wirksam.titel, 'ALTE KOPIE MIT KENNUNGEN VON DAMALS');
});

test('[Stufe 87·Rot-Beweis] trägt das Produkt das Template nicht, bleibt die alte Kopie stehen — der Bürgerin bliebe sonst keines', () => {
  const V = kernMit([]);
  const d = depotAufSchema86();
  V.depotNormalisieren(d);
  assert.equal(d.logikModule.filter((m) => m.id === ID).length, 1);
});

test('[Stufe 87·Rot-Beweis] eine Kopie, die nicht von Vivodepot stammt, bleibt auch bei tragendem Produkt unangetastet', () => {
  const V = kernMit([TEMPLATE]);
  const d = depotAufSchema86();
  d.logikModule[0].herkunft = 'jemand-anders';
  V.depotNormalisieren(d);
  assert.equal(d.logikModule.filter((m) => m.id === ID).length, 1);
});

// Offener Restfall: Schema 86, zuerst in einem Produkt OHNE das Template geöffnet (Kopie bleibt), später in einem Produkt MIT
// dem Template. Stufe 87 kommt nicht wieder, die alte Kopie verdeckt dann das Modul des Produkts. Saubere Lösung: eine Bereinigung
// beim Öffnen (dort ist das Produkt bekannt) statt beim Migrieren — ein eigener Eingriff. Bis dahin sichtbar, bricht nichts.
test('[Stufe 87·Restfall] Schema 86, erst Produkt ohne Template, dann Produkt mit Template: die alte Kopie darf das Modul nicht verdecken', { todo: 'Bereinigung beim Öffnen fehlt' }, () => {
  const d = depotAufSchema86();
  kernMit([]).depotNormalisieren(d);
  const V = kernMit([TEMPLATE]);
  V.depotNormalisieren(d);
  assert.equal(d.logikModule.filter((m) => m.id === ID).length, 0);
});
