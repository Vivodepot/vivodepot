'use strict';
/* BEFUND VERSION-OHNE-FASSUNGSNUMMER (HOCH, 21.11.2026). Wer beim Support anruft, liest die Nummer vor, die er sieht.
   Die Einstellungen (Abschnitt „Über“) zeigten seit 5378c99cd (17.07.2026) nur den öffentlichen Namen „v1.0“ und das
   Datum; die volle Nummer v1.0.<Fassung> stand in der Fußzeile jedes Schirms (bac9147ef, 30.07.2026) — und seit dem
   Design-Wagen ce7adb1f1 (11.11.2026, erstmals ausgeliefert mit v1.0.1053) nur noch auf der Seite „Über und Hinweise“.
   Gehalten wird:
   (1) Jede Anzeige der Version — Titel, Seite „Über und Hinweise“, Einstellungen (Zeile, Kurzstatus, Stand-Satz),
       PDF-Herkunftsvermerk, Klartext-Export — trägt die volle Nummer, in DE und EN.
   (2) WÄCHTER gegen die Fehlerklasse: im Kern-Code steht `BUILD_VERSION` genau zweimal — in seiner Definition und in
       `fassungAnzeige()`. Jede andere Stelle nimmt `fassungAnzeige()`; wer den Namen ohne Nummer anzeigen will, muss die
       Konstante anfassen, und das macht diese Probe rot. Keine Ausnahmeliste.
   Ausgenommen ist nur der statische <title> im <head>: er wird beim Start durch `document.title` ersetzt
   (tests/versionsname-eine-quelle.test.js hält ihn auf „Vivodepot · “ + BUILD_VERSION). */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { ladeKern } = require('./load-kern.js');
const { ohneFremdbloecke } = require('../tools/lib/html-senken.js');

const KERN = fs.readFileSync(path.join(__dirname, '..', 'vivodepot.html'), 'utf8');

// Code ohne Kommentare (Block- und Zeilenkommentare), Zeile für Zeile mit Zeilennummer.
function codeZeilen(text) {
  const aus = [];
  let imBlock = false;
  text.split('\n').forEach((zeile, i) => {
    let z = zeile;
    if (imBlock) { const e = z.indexOf('*/'); if (e < 0) return; z = z.slice(e + 2); imBlock = false; }
    for (;;) {
      const a = z.indexOf('/*');
      if (a < 0) break;
      const e = z.indexOf('*/', a + 2);
      if (e < 0) { z = z.slice(0, a); imBlock = true; break; }
      z = z.slice(0, a) + z.slice(e + 2);
    }
    z = z.replace(/(^|\s)\/\/.*$/, '$1');
    if (z.trim()) aus.push({ nr: i + 1, z });
  });
  return aus;
}

// Fundstellen von BUILD_VERSION außerhalb der Definition und außerhalb von fassungAnzeige().
function nameOhneNummer(text) {
  const funde = [];
  let inFassungAnzeige = false;
  for (const { nr, z } of codeZeilen(text)) {
    if (/^\s*function fassungAnzeige\s*\(/.test(z)) inFassungAnzeige = true;
    if (/\bBUILD_VERSION\b/.test(z) && !/^\s*const BUILD_VERSION = /.test(z) && !inFassungAnzeige && !/<title>/.test(z)) {
      funde.push(nr + ': ' + z.trim().slice(0, 120));
    }
    if (inFassungAnzeige && /^\}/.test(z)) inFassungAnzeige = false;
  }
  return funde;
}

test('[Version·Wächter] BUILD_VERSION steht nur in der Definition und in fassungAnzeige()', () => {
  assert.deepEqual(nameOhneNummer(ohneFremdbloecke(KERN)), []);
});

test('[Version·Wächter·Rot-Beweis] eine Anzeige mit dem Namen ohne Nummer wird gefunden, Kommentar und Definition nicht', () => {
  const probe = [
    "const BUILD_VERSION = 'v1.0';",
    'function fassungAnzeige() {',
    "  return BUILD_VERSION + '.' + String(SCHALEN_STAND).replace(/^v/, '');",
    '}',
    "  const k = ok ? x : BUILD_VERSION;",
    "  // früher: escapeHTML(BUILD_VERSION)",
    "  s.replace('{version}', BUILD_VERSION);",
  ].join('\n');
  assert.deepEqual(nameOhneNummer(probe).map((f) => f.split(':')[0]), ['5', '7']);
});

test('[Version] fassungAnzeige() ist v1.0.<Fassung>', () => {
  const { V } = ladeKern();
  assert.equal(V.fassungAnzeige(), V.BUILD_VERSION + '.' + String(V.SCHALEN_STAND).replace(/^v/, ''));
  assert.match(V.fassungAnzeige(), /^v1\.0\.\d+$/);
});

// Die Nummer kommt in beiden Sprachen aus demselben Code; die Sprache stellt nur den Satz um sie herum (Probe unten).
{
  test('[Version] Einstellungen, Titel, „Über und Hinweise“ und Export zeigen die volle Nummer', async () => {
    const { V, document } = ladeKern();
    const voll = V.fassungAnzeige();
    V._markeAnzeigeAnwenden(null, { querySelector: () => null });
    assert.ok(document.title.endsWith(' · ' + voll), 'Titel: ' + document.title);
    await V.depotAnlegen('version-fassung-pw-2026');
    V.betreteApp();
    V.oeffneUeberHinweise();
    assert.ok(document.getElementById('content').innerHTML.includes(voll), '„Über und Hinweise“');
    V.flowEinstellungen();
    const einst = (document.getElementById('modal-inhalt') || {}).innerHTML || '';
    const wert = /<span class="einst-label">[^<]*<\/span><span class="einst-wert">([^<]*)<\/span>/.exec(
      einst.slice(einst.indexOf(V.STRINGS.einstVersion + '</span>') - 40));
    assert.ok(wert, 'Zeile Version gefunden');
    assert.equal(wert[1], voll, 'Zeile Version');
    const satz = V.STRINGS.einstVersionStandSatz.split('{version}')[0];
    assert.ok(einst.includes(satz + voll), 'Stand-Satz trägt die volle Nummer');
    // Kurzstatus im Kopf des Abschnitts „Über“: entweder der Hinweis auf ein fälliges Update oder die volle Nummer.
    const ohneNummer = new RegExp('>' + V.BUILD_VERSION.replace('.', '\\.') + '<');
    assert.ok(!ohneNummer.test(einst), 'nirgends nur „' + V.BUILD_VERSION + '“ als Anzeige');
    assert.equal(V.vollExportJSON({ sensibel: true })._version, voll, 'Klartext-Export');
  });
}

test('[Version] DE und EN: Stand-Satz und PDF-Vermerk setzen die Nummer über {version} ein, keine Sprache nennt sie fest', () => {
  // Die Sprachmodule der Pro-Produkte prüft die zurückgehaltene Drift-Probe der Pro-Module (gleiche Schlüssel, gleiche Regel).
  for (const d of ['tools/textsatz-de-modul.json', 'tools/textsatz-en-modul.json']) {
    const t = JSON.parse(fs.readFileSync(path.join(__dirname, '..', d), 'utf8'));
    const texte = t.texte || t;
    // oeffnenFassungSatz: der Öffnen-Schirm einer Datei-Fassung nennt die Nummer ebenfalls (zweiter Schritt, 21.11.2026).
    for (const k of ['strings:einstVersionStandSatz.text', 'strings:pdfHerkunftVersion.text', 'strings:oeffnenFassungSatz.text']) {
      assert.match(String(texte[k]), /\{version\}/, d + ' ' + k);
      assert.ok(!/v1\.0/.test(String(texte[k])), d + ' ' + k + ' nennt eine Nummer fest');
    }
  }
});

test('[Version] das englische Vor-Depot-Modul setzt die Nummer im Öffnen-Schirm ebenfalls über {version} ein', () => {
  for (const d of ['tools/sprachangebot-en-vordepot-modul.json']) {
    const t = JSON.parse(fs.readFileSync(path.join(__dirname, '..', d), 'utf8'));
    assert.match(String((t.texte || t)['strings:oeffnenFassungSatz.text']), /\{version\}/, d);
  }
});

test('[Version] der Öffnen-Schirm setzt {version} mit fassungAnzeige() ein', () => {
  const zeile = KERN.split('\n').find((z) => z.includes("vorDepotText('oeffnenFassungSatz')"));
  assert.ok(zeile, 'Zeile gefunden');
  assert.match(zeile, /replace\('\{version\}', fassungAnzeige\(\)\)/);
});

test('[Version] der PDF-Herkunftsvermerk nimmt die volle Nummer', () => {
  const zeile = KERN.split('\n').find((z) => z.includes("pdfHerkunftVersion || '').replace('{version}'"));
  assert.ok(zeile, 'Vermerk-Zeile gefunden');
  assert.match(zeile, /replace\('\{version\}', fassungAnzeige\(\)\)/);
});

test('[Version] ein langer Wert der Einstellungen (Lizenzzeile) bricht um, in jedem Erscheinungsbild', () => {
  // Gesehen im Bild der Einstellungen (21.11.2026): die Lizenzzeile lief rechts aus dem Fenster. Die Werte-Rolle
  // .einst-wert steht in tools/erscheinung/stil/grundlage.css; jedes Modul bäckt diese Grundlage ein.
  for (const p of ['heute', 'salbei-glas', 'dummy']) {
    const m = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'tools', 'erscheinung', 'erscheinungsbild-' + p + '-modul.json'), 'utf8'));
    const regel = /\.einst-wert \{([^}]*)\}/.exec(m.stil.grundlage);
    assert.ok(regel, p + ': Regel .einst-wert vorhanden');
    assert.match(regel[1], /overflow-wrap: anywhere/, p + ': .einst-wert bricht um');
  }
});
