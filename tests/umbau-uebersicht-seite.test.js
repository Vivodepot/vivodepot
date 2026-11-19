'use strict';
/* ═════════════════════════════════════════════════════════════════
   Umbau U-3, die Übersicht nach dem Desktop-Dummy (17.11.2026).

   Die Übersicht zeigte nur die Bereichskarten. Nach dem Dummy steht oben der Titel mit der Unterzeile „Depot von … · zuletzt
   geändert …“, darunter „Wartet auf Sie“ mit den offenen Anfragen und „Ansehen“, die Anlässe mit „Alle Anlässe“, „Zuletzt
   geändert“ mit der Herkunft jeder Angabe und die Notfall-Karte mit „Notfallkarte ansehen“; die Bereichskarten bleiben darunter.
   Ohne Zahl der Angaben und ohne Fortschritt an den Anlässen (U2-ADR-097 12(c)). Am Eintrag „Übersicht“ der Seitenleiste steht ein
   Punkt, solange eine Anfrage offen ist.

   Proben (auf Zeichenebene, weil die Test-DOM innerHTML nicht parst):
   [U-3·Übersicht]   die Übersicht trägt jede Dummy-Zeile (D26, D27, D28, D30, D31, D32, D33) und weiter die Bereichskarten.
   [U-3·Ohne Zahl]   keine Zahl der Angaben in der Unterzeile, kein Fortschritt an den Anlässen.
   [U-3·Wartet]      nur offene Anfragen warten; ohne offene Anfrage kein Abschnitt und kein Punkt (D18).
   [U-3·Herkunft]    eine eingelesene Angabe nennt „eingelesen von <Stelle>“, eine eigene „eingetragen von Ihnen“.
   [D32·Zeit]        „Zuletzt geändert“: heute mit Uhrzeit, gestern als „gestern“, sonst Datum mit vollem Jahr (Desktop-Dummy Z. 357–366).
   [D32·Eigen]       eine eigene Zeile trägt keine Initiale, eine eingelesene die der Stelle (Entscheidung 17.11.2026), mit Rot-Beweis.
   [U-3·Wege]        Ansehen, Anlass, „Alle Anlässe“, Zeile und „Notfallkarte ansehen“ rufen die vorhandenen Wege.
   [U-3·Lupe]        das Suchfeld trägt die Lupe des Dummys als Zeichen ohne Text.
   [U-3·Start]       nach dem Öffnen eines vorhandenen Depots startet die App auf der Übersicht (A01), mit Rot-Beweis.
   [U-3·Rot-Beweis]  die Übersicht vor dem Umbau (nur Bereichskarten) fällt an [U-3·Übersicht].
   ═════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { ladeKern } = require('./load-kern.js');

const KERN = path.join(__dirname, '..', 'vivodepot.html');
const MORGEN = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

async function imDepot(mitAnfrage) {
  const k = ladeKern({ backen: true });
  await k.V.depotAnlegen('uebersicht-seite-pw-2026!');
  k.V.betreteApp();
  k.V.sektorFeldSetzen('identity', 'telephone', '0151 0000000');
  k.V.sektorFeldSetzen('identity', 'givenName', 'Erika');
  if (mitAnfrage) {
    k.V.getData().anfragen = [
      { id: 'anf-offen', von: 'Stadtbibliothek Beispielstadt', zweck: 'Bibliotheksausweis', empfangenAm: new Date().toISOString(), beantwortetAm: null, gueltigBis: MORGEN },
      { id: 'anf-beantwortet', von: 'Beispielamt', zweck: 'Ummeldung', empfangenAm: new Date().toISOString(), beantwortetAm: new Date().toISOString() },
      { id: 'anf-abgelaufen', von: 'Beispielkasse', zweck: 'Antrag', empfangenAm: '2026-01-01T10:00:00Z', beantwortetAm: null, gueltigBis: '2026-01-02' },
    ];
  }
  return k;
}

/* Die Dummy-Zeilen der Übersicht; liefert die fehlenden. */
function dummyLuecken(html, S) {
  const marken = [
    ['D26 Titel', '<h1>' + S.navUebersicht + '</h1>'],
    ['D26 Unterzeile', 'uebersicht-unter'],
    ['D27 Wartet auf Sie', S.uebersichtWartet],
    ['D28 Anfrage mit Ansehen', 'data-anfrage-oeffnen="anf-offen"'],
    ['D30 Anlässe', 'class="uebersicht-kachel" data-anlass='],
    ['D31 Alle Anlässe', 'data-uebersicht-alle-anlaesse="1"'],
    ['D32 Zuletzt geändert', 'data-uebersicht-zuletzt="1"'],
    ['D33 Notfall', 'data-uebersicht-notfall-ansehen="1"'],
  ];
  return marken.filter(([, m]) => !html.includes(m)).map(([n]) => n);
}

test('[U-3·Übersicht] die Übersicht trägt jede Dummy-Zeile und weiter die Bereichskarten', async () => {
  const { V } = await imDepot(true);
  const S = V.STRINGS;
  const html = V._uebersichtHTML();
  assert.deepEqual(dummyLuecken(html, S), []);
  assert.ok(html.includes(S.uebersichtDepotVon.replace('{name}', '')), 'Depot von …');
  assert.ok(html.includes(S.uebersichtZuletztGeaendert.replace('{datum}', '')), 'zuletzt geändert …');
  assert.ok(html.includes('Stadtbibliothek Beispielstadt</b> ' + S.uebersichtFragtAn), 'Absender fragt Angaben an');
  assert.ok(html.includes(S.uebersichtAnsehen) && html.includes(S.uebersichtAlleAnlaesse) && html.includes(S.uebersichtNotfallAnsehen));
  assert.ok(html.includes('class="bereich-karte"'), 'die Bereichskarten bleiben');
});

test('[U-3·Ohne Zahl] keine Zahl der Angaben, kein Fortschritt an den Anlässen', async () => {
  const { V } = await imDepot(true);
  const html = V._uebersichtHTML();
  const unter = (html.match(/<p class="sektor-intro uebersicht-unter">([^<]*)<\/p>/) || [])[1] || '';
  assert.ok(unter, 'Vorbedingung: die Unterzeile steht');
  assert.ok(!/\d+ (Angaben|Dokumente)/.test(unter), 'keine Zahl der Angaben: ' + unter);
  const kacheln = html.split('class="uebersicht-kachel"').slice(1).join('');
  assert.ok(kacheln.length > 0, 'Vorbedingung: Anlass-Kacheln');
  assert.ok(!/\d+ von \d+/.test(kacheln) && !kacheln.includes('leiste-fort'), 'kein „x von y“, kein Balken');
});

test('[U-3·Wartet] nur offene Anfragen warten; ohne offene Anfrage kein Abschnitt und kein Punkt', async () => {
  const mit = await imDepot(true);
  assert.deepEqual(mit.V.uebersichtOffeneAnfragen().map((a) => a.id), ['anf-offen']);
  const h = mit.V._uebersichtHTML();
  assert.ok(!h.includes('data-anfrage-oeffnen="anf-beantwortet"') && !h.includes('data-anfrage-oeffnen="anf-abgelaufen"'));
  assert.ok(h.includes('<span class="uebersicht-marke warten">1</span>'), 'Zähler');
  mit.V.renderSidebar();
  assert.ok(mit.document.getElementById('sidebar').innerHTML.includes('data-uebersicht-punkt="1"'), 'Punkt an „Übersicht“');

  const ohne = await imDepot(false);
  assert.ok(!ohne.V._uebersichtHTML().includes('data-uebersicht-wartet'), 'kein Abschnitt');
  ohne.V.renderSidebar();
  assert.ok(!ohne.document.getElementById('sidebar').innerHTML.includes('data-uebersicht-punkt'), 'kein Punkt');
});

test('[U-3·Herkunft] eingelesen von der Stelle, eine eigene Angabe ohne Herkunftssatz (A2)', async () => {
  const { V } = await imDepot(false);
  const S = V.STRINGS;
  const u = V.getData().urheberschaft;
  u.identity = u.identity || {};
  u.identity.email = [{ zeitpunkt: '2099-01-01T10:00:00Z', eigenschaft: 'selbst', eingabeArt: 'import', quelle: 'Praxis Beispiel' }];
  const z = V.uebersichtZuletztGeaendert(3);
  assert.equal(z[0].feldId, 'email', 'die jüngste zuerst');
  const html = V._uebersichtHTML();
  assert.ok(html.includes(S.urheberEingelesen + ' ' + S.urheberVon + ' Praxis Beispiel'), 'eingelesen von der Stelle');
  u.identity.firstName = [{ zeitpunkt: '2098-01-01T10:00:00Z', eigenschaft: 'selbst', eingabeArt: 'manuell' }];
  const zeilen = [...V._uebersichtHTML().matchAll(/<span class="uebersicht-rechts">([^<]*)<\/span>/g)].map((m) => m[1]);
  assert.ok(zeilen.length >= 2, 'zwei Zeilen');
  assert.ok(zeilen[1] && !zeilen[1].includes('·'), 'die eigene Angabe trägt nur das Datum, keinen Herkunftssatz: ' + zeilen[1]);
  assert.ok(!/undefined/.test(V._uebersichtHTML()), 'kein leerer Text');
});

test('[D32·Zeit] heute mit Uhrzeit, gestern, sonst Datum mit vollem Jahr; ein Kalendertag ohne erfundene Uhrzeit', async () => {
  const { V } = await imDepot(false);
  const S = V.STRINGS;
  const jetzt = new Date(2026, 10, 17, 19, 5);
  assert.equal(V.uebersichtZeitpunkt(new Date(2026, 10, 17, 18, 20).toISOString(), jetzt), S.uebersichtZeitHeute.replace('{zeit}', '18:20'));
  assert.equal(V.uebersichtZeitpunkt(new Date(2026, 10, 16, 8, 0).toISOString(), jetzt), S.uebersichtZeitGestern);
  assert.equal(V.uebersichtZeitpunkt(new Date(2026, 10, 2, 9, 30).toISOString(), jetzt), '02.11.2026');
  assert.equal(V.uebersichtZeitpunkt('2026-11-17', jetzt), '17.11.2026', 'ein reiner Kalendertag bekommt keine Uhrzeit');
  assert.equal(V.uebersichtZeitpunkt(new Date(2026, 0, 1, 0, 10).toISOString(), new Date(2026, 0, 1, 23, 59)), S.uebersichtZeitHeute.replace('{zeit}', '00:10'));
  assert.equal(V.uebersichtZeitpunkt(new Date(2025, 11, 31, 23, 50).toISOString(), new Date(2026, 0, 1, 0, 5)), S.uebersichtZeitGestern, 'über den Jahreswechsel');
  const u = V.getData().urheberschaft;
  u.identity = u.identity || {};
  u.identity.email = [{ zeitpunkt: new Date().toISOString(), eigenschaft: 'selbst', eingabeArt: 'import', quelle: 'Praxis Beispiel' }];
  const erste = [...V._uebersichtHTML().matchAll(/<span class="uebersicht-rechts">([^<]*)<\/span>/g)].map((m) => m[1])[0];
  assert.ok(erste.startsWith(S.uebersichtZeitHeute.split('{zeit}')[0]), 'die Zeile von heute nennt „heute, …“: ' + erste);
});

test('[D32·Eigen] eine eigene Zeile ohne Initiale, eine eingelesene mit der Initiale der Stelle', async () => {
  const { V } = await imDepot(false);
  const u = V.getData().urheberschaft;
  u.identity = u.identity || {};
  u.identity.email = [{ zeitpunkt: '2099-01-01T10:00:00Z', eigenschaft: 'selbst', eingabeArt: 'import', quelle: 'Praxis Beispiel' }];
  u.identity.firstName = [{ zeitpunkt: '2098-01-01T10:00:00Z', eigenschaft: 'selbst', eingabeArt: 'manuell' }];
  const zeichen = (html) => [...html.matchAll(/<span class="uebersicht-quelle" aria-hidden="true">([^<]*)<\/span>/g)].map((m) => m[1]);
  const z = zeichen(V._uebersichtHTML());
  assert.equal(z[0], 'P', 'eingelesen: Initiale der Stelle');
  assert.equal(z[1], '', 'eigene Angabe: kein Zeichen');
  // Rot-Beweis: die Fassung vor D32 (Initiale aus dem eigenen Namen) fällt hier.
  const vorher = (her) => V._uebersichtKuerzel(her.wer).charAt(0);
  assert.notEqual(vorher(V.uebersichtHerkunft(u.identity.firstName[0])), '', 'die alte Regel setzte ein Zeichen an die eigene Zeile');
  const css = fs.readFileSync(path.join(__dirname, '..', 'tools', 'erscheinung', 'stil', 'grundlage.css'), 'utf8');
  assert.ok(/\.uebersicht-quelle:empty\s*\{\s*background:\s*transparent;/.test(css), 'das leere Feld trägt keine Fläche');
});

test('[U-3·Wege] jeder Knopf der Übersicht ruft einen vorhandenen Weg', () => {
  const src = fs.readFileSync(KERN, 'utf8');
  const i = src.indexOf('function renderEintragenUebersicht() {');
  assert.ok(i >= 0);
  const rumpf = src.slice(i, src.indexOf('\n}\n', i));
  for (const ruf of ["oeffneAnfrage(b.getAttribute('data-anfrage-oeffnen'))", "waehleAnlass(b.getAttribute('data-anlass'))", 'oeffneErledigen()',
    'oeffneSektorFeld(sektorId, feldId)', 'geheZuNotfall()', "oeffneSektor(b.getAttribute('data-sektor'))"]) {
    assert.ok(rumpf.includes(ruf), ruf);
  }
});

test('[U-3·Lupe] das Suchfeld trägt die Lupe als Zeichen ohne Text (D87)', () => {
  const src = fs.readFileSync(KERN, 'utf8');
  const i = src.indexOf("const sucheHtml = '<div class=\"suche-feld\">' +");
  assert.ok(i >= 0, 'Vorbedingung: das Suchfeld steht im Kern');
  const feld = src.slice(i, src.indexOf("'<input type=\"text\" id=\"suche-eingabe\"", i));
  assert.match(feld, /<svg class="suche-lupe"[^>]*aria-hidden="true"/, 'Lupe vor dem Eingabefeld, für Vorlesehilfen verborgen');
});

/* Start nach dem Öffnen (A01): jeder Weg, der ein vorhandenes Depot öffnet, ruft nach dem Eintritt den Start auf der Übersicht;
   das Anlegen bleibt bei „Erledigen“, ein Wiedereintritt nach dem Wipe bei seiner Stelle. Liefert die Wege ohne den Start. */
function startLuecken(src) {
  const wege = [
    ['Datei öffnen', 'markiereAlsDateiGesichert();\n    betreteApp();\n    _startNachOeffnen();'],
    ['interner Stand', "_ablageortGemerktUebernehmen(); } catch (_) {}   // U2-ADR-031 Nachtrag: gemerkter Ort wird das Ziel\n      _startNachOeffnen();"],
    ['Konflikt: Gerät', "// interner Stand wird Wahrheit; Datei unberührt\n      schliessen(); if (typeof betreteApp === 'function') { betreteApp(); _startNachOeffnen(); }"],
    ['Konflikt: Datei', "// data ist bereits die Datei → interner Stand\n        schliessen(); if (typeof betreteApp === 'function') { betreteApp(); _startNachOeffnen(); }"],
  ];
  return wege.filter(([, m]) => !src.includes(m)).map(([n]) => n);
}

test('[U-3·Start] nach dem Öffnen eines vorhandenen Depots startet die App auf der Übersicht', () => {
  const src = fs.readFileSync(KERN, 'utf8');
  assert.deepEqual(startLuecken(src), []);
  assert.match(src, /function _startNachOeffnen\(\) \{\n  if \(_wipeStelle \|\| !data\) return;\n  oeffneEintragenUebersicht\(\);\n\}/, 'Wiedereintritt behält seine Stelle');
  assert.ok(src.includes("betreteApp(); aktiveAnsicht = 'erledigen'; renderSidebar(); renderContent(); }"), 'das Anlegen bleibt bei „Erledigen“');
  assert.deepEqual(startLuecken(src.replace('markiereAlsDateiGesichert();\n    betreteApp();\n    _startNachOeffnen();', 'markiereAlsDateiGesichert();\n    betreteApp();')), ['Datei öffnen'], 'Rot-Beweis');
});

/* Rot-Beweis: die Übersicht vor dem Umbau (nur die Bereichskarten) fällt an der Dummy-Zeilen-Probe. */
test('[U-3·Rot-Beweis] die Übersicht aus nur Bereichskarten fällt auf', async () => {
  const { V } = await imDepot(true);
  const vorher = '<div class="content-narrow">' + V.renderEintragenKartenraster() + '</div>';
  assert.equal(dummyLuecken(vorher, V.STRINGS).length, 8);
});
