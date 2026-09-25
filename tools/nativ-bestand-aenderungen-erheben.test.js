'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   Prüfung des Erhebungs-Werkzeugs (U2-ADR-321)
   ────────────────────────────────────────────────────────────────────────────
   Ein Vergleicher, der IMMER „keine Änderung" sagt, färbt in jedem Lauf grün
   und wäre genau darum die gefährlichste Ausgabe dieses Werkzeugs: die Aussage
   „identisch bis auf diese N benannten Änderungen" stünde dann auf einem
   Prüfer, der nie rot werden kann. Diese Datei hält deshalb BEIDE Richtungen:

     1. den Vergleichs-Kern gegen Klarfälle (neu, entfernt, geändert,
        Umbenennungs-Verdacht, Funktionswert) — schnell, ohne Kern-Ladeweg;
     2. eine echte POSITIVKONTROLLE über den ganzen Weg: dieselbe
        vivodepot.html gegen eine Kopie mit GENAU EINER eingebauten Änderung.
        Der Anker wird geprüft und WIRFT, wenn er nicht sitzt — eine Mutation,
        die nichts verändert, sähe sonst aus wie ein bestandener Test.
   ════════════════════════════════════════════════════════════════════════════ */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { aenderungenErheben, bestandLesen, registerVergleichen } = require('./nativ-bestand-aenderungen-erheben.js');
const REPO = path.join(__dirname, '..');
const KERN = path.join(REPO, 'vivodepot.html');

test('registerVergleichen benennt Neues, Entferntes und Geändertes je einzeln', () => {
  const a = { 'x··a': { id: 'a', label: 'Alt' }, 'x··weg': { id: 'weg', label: 'Weg' } };
  const b = { 'x··a': { id: 'a', label: 'Neu' }, 'x··dazu': { id: 'dazu', label: 'Dazu' } };
  const r = registerVergleichen(a, b);
  assert.deepEqual(r.hinzugefuegt.map((h) => h.stelle), ['x··dazu']);
  assert.deepEqual(r.entfernt.map((e) => e.stelle), ['x··weg']);
  assert.deepEqual(r.geaendert.map((g) => g.stelle), ['x··a']);
  assert.deepEqual(r.geaendert[0].eigenschaften, [{ eigenschaft: 'label', alt: 'Alt', neu: 'Neu' }]);
});

test('registerVergleichen meldet nichts, wenn nichts anders ist', () => {
  const gleich = { 'x··a': { id: 'a', label: 'A' } };
  const r = registerVergleichen(gleich, JSON.parse(JSON.stringify(gleich)));
  assert.deepEqual(r, { hinzugefuegt: [], entfernt: [], geaendert: [], umbenennungsVerdacht: [] });
});

test('registerVergleichen legt eine mutmaßliche Umbenennung nebeneinander statt sie zu zerreißen', () => {
  const a = { 'sektor·sektion··alt': { id: 'alt', typ: 'text' } };
  const b = { 'sektor·sektion··neu': { id: 'neu', typ: 'text' } };
  const r = registerVergleichen(a, b);
  assert.deepEqual(r.umbenennungsVerdacht, [{ alt: 'sektor·sektion··alt', neu: 'sektor·sektion··neu' }]);
});

test('registerVergleichen sieht eine geänderte Bedingung, nicht nur ein geändertes Label', () => {
  // `verborgenWenn` ist ein Funktionswert und Bestand — JSON.stringify allein ließe ihn
  // lautlos verschwinden. Der Erheber schreibt ihn als «fn:…»; hier die Wirkung davon.
  const a = { 's·k··f': { id: 'f', verborgenWenn: '«fn:(d) => d.x === 1»' } };
  const b = { 's·k··f': { id: 'f', verborgenWenn: '«fn:(d) => d.x === 2»' } };
  const r = registerVergleichen(a, b);
  assert.deepEqual(r.geaendert.map((g) => g.stelle), ['s·k··f']);
  assert.equal(r.geaendert[0].eigenschaften[0].eigenschaft, 'verborgenWenn');
});

test('Positivkontrolle: eine einzige eingebaute Änderung wird gefunden — und nur sie', { timeout: 120_000 }, () => {
  /* DER ANKER SITZT SEIT DEM SCHNITT (18.09.2026) IN DER EXTERNEN VORLAGE, NICHT MEHR IM
     NATIVEN LITERAL DES KERNS — die zweite Fassung dieser Erkenntnis, nach derselben Lehre
     wie am 06.09.2026 (U2-ADR-321, damals: der Anker sass im eingebetteten Bündel, nicht im
     nativen Literal). `givenName` lebt seit dem Schnitt in
     `tools/bereich-templates/vivodepot-identity.json`, nicht mehr in `vivodepot.html` selbst
     — eine Mutation an der Roh-HTML fände dort nichts mehr (gemessen: 0 statt 1 Treffer).

     ISO1-NACHTRAG (19.09.2026): vorher wurde die ECHTE, geteilte Vorlage im
     Arbeitsbaum mutiert und in einem `finally` zurückgeschrieben — ein Isolationsleck.
     `node --test` startet jede Testdatei als eigenen Prozess; ein zeitgleicher Lauf von
     `tools/vd-privat-struktur-bundle-erzeugen.test.js` (bäckt über einen anderen Ladeweg
     dieselbe Datei) konnte mit Pech genau die mutierte Zwischenversion lesen —
     reproduziert: beide Testdateien parallel gestartet, 3/3 Mal rot mit `givenName_probe`
     statt `givenName` im Bundle. Jetzt: die GANZE Vorlagen-Verzeichnis-Kopie (19 Dateien)
     in ein `mkdtempSync`-Verzeichnis, NUR die Kopie mutiert,
     `bestandLesen(KERN, { bereichTemplateVerzeichnis: … })` liest gezielt daraus (Parameter
     existierte in `tools/lib/vier-produkte.js` bereits seit dem 18.09., aber kein Aufrufer
     nutzte ihn — bis zu diesem Nachtrag). Die Baseline `a` braucht keinen Override mehr,
     sie liest die echte, nie angefasste Vorlage. Kein `finally`-Zurückschreiben mehr nötig:
     was nie angefasst wurde, muss nicht wiederhergestellt werden.

     ANKER-FORM NACHGEZOGEN (18.09.2026): die Vorlage ist pretty-printed (2-Leerzeichen-
     Einzug, `JSON.stringify(…, null, 2)`-Form) — `"id": "givenName",` mit Leerzeichen nach
     dem Doppelpunkt und `"typ"` in einer eigenen Zeile, nicht `"id":"givenName","typ":"text"`
     kompakt in einer Zeile. Gemessen (nicht angenommen): der kompakte Anker traf 0x, der
     Zeilen-Anker unten trifft genau 1x. */
  const VORLAGEN_VERZEICHNIS = path.join(REPO, 'tools', 'bereich-templates');
  const ANKER = '"id": "givenName",';
  const ERSATZ = '"id": "givenName_probe",';
  const vorlageOriginal = fs.readFileSync(path.join(VORLAGEN_VERZEICHNIS, 'vivodepot-identity.json'), 'utf8');
  assert.equal(vorlageOriginal.split(ANKER).length - 1, 1,
    'Anker für die Positivkontrolle sitzt nicht genau einmal in der Vorlage — die Mutation träfe '
    + 'sonst nichts oder zu viel, und der Test bewiese nichts (Anker: ' + ANKER + ')');
  const vorlageMutiert = vorlageOriginal.replace(ANKER, ERSATZ);
  assert.notEqual(vorlageMutiert, vorlageOriginal, 'die Mutation hat die Vorlage nicht verändert');

  const tempVerzeichnis = fs.mkdtempSync(path.join(os.tmpdir(), 'vd-bereich-templates-probe-'));
  let a, b;
  try {
    fs.cpSync(VORLAGEN_VERZEICHNIS, tempVerzeichnis, { recursive: true });
    fs.writeFileSync(path.join(tempVerzeichnis, 'vivodepot-identity.json'), vorlageMutiert, 'utf8');
    a = bestandLesen(KERN);   // Baseline: die echte, nie angefasste Vorlage — kein Override.
    b = bestandLesen(KERN, { bereichTemplateVerzeichnis: tempVerzeichnis });
  } finally {
    fs.rmSync(tempVerzeichnis, { recursive: true, force: true });
  }
  const register = {};
  for (const name of Object.keys(a.register)) register[name] = registerVergleichen(a.register[name], b.register[name]);
  const erg = { register };
  assert.equal(erg.register.bereiche.entfernt.length, 1, 'die weggefallene Kennung fehlt im Bericht');
  assert.equal(erg.register.bereiche.hinzugefuegt.length, 1, 'die neue Kennung fehlt im Bericht');
  assert.match(erg.register.bereiche.entfernt[0].stelle, /·givenName$/);
  assert.match(erg.register.bereiche.hinzugefuegt[0].stelle, /·givenName_probe$/);
  // Und NUR sie: kein anderes Register darf von einer Kennungs-Änderung berührt sein.
  for (const name of ['situationen', 'wizards', 'ereignisAchse', 'institutionsArt', 'textsatz']) {
    const r = erg.register[name];
    assert.equal(r.hinzugefuegt.length + r.entfernt.length + r.geaendert.length, 0,
      'Register „' + name + '" meldet Änderungen, obwohl nur eine Feld-Kennung mutiert wurde');
  }
});

test('Positivkontrolle Textsatz: ein geänderter Text wird als geändert gemeldet, nicht als neu', { timeout: 120_000 }, () => {
  /* S8 (U2-ADR-428): der deutsche Satz steht im Sprachmodul, nicht mehr im Kern — der Anker sitzt in `tools/textsatz-de-modul.json`. Wie bei den Bereichs-
     Vorlagen (ISO1) wird NUR eine Kopie mutiert und über `opts.textsatzDeModulPfad` gelesen; die geteilte Datei im Arbeitsbaum bleibt unberührt. */
  const MODUL = path.join(REPO, 'tools', 'textsatz-de-modul.json');
  const ANKER = '"strings:fussQuellcode.text": "Quellcode auf GitHub",';
  const ERSATZ = '"strings:fussQuellcode.text": "Quellcode auf GitHub (Probe)",';
  const original = fs.readFileSync(MODUL, 'utf8');
  assert.equal(original.split(ANKER).length - 1, 1, 'Anker für die Textsatz-Positivkontrolle sitzt nicht genau einmal im Modul: ' + ANKER);
  const mutiert = original.replace(ANKER, ERSATZ);
  assert.notEqual(mutiert, original, 'die Textsatz-Mutation verändert nichts');
  const kopie = path.join(os.tmpdir(), 'vd-bestand-textprobe-' + process.pid + '.json');
  fs.writeFileSync(kopie, mutiert, 'utf8');
  try {
    const a = bestandLesen(KERN);
    const b = bestandLesen(KERN, { textsatzDeModulPfad: kopie });
    assert.ok(Object.keys(a.register.textsatz).length > 3000, 'der Stand trägt den deutschen Satz — sonst vergliche der Test leer gegen leer');
    const t = registerVergleichen(a.register.textsatz, b.register.textsatz);
    assert.equal(t.geaendert.length, 1, 'genau eine Textänderung erwartet');
    assert.equal(t.geaendert[0].stelle, 'strings:fussQuellcode.text');
    assert.equal(t.hinzugefuegt.length + t.entfernt.length, 0, 'ein geänderter Text ist kein neuer und kein weggefallener');
  } finally {
    fs.rmSync(kopie, { force: true });
  }
});

test('Negativkontrolle: derselbe Stand gegen sich selbst meldet keine einzige Änderung', { timeout: 120_000 }, () => {
  const erg = aenderungenErheben(KERN, KERN);
  assert.equal(erg.summe, 0, 'derselbe Stand gegen sich selbst darf nichts melden');
});
