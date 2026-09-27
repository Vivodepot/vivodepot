'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Test — Feldtyp `verweis` (externe Adresse, 12.09.2026, Auftrag)
   ────────────────────────────────────────────────────────────────────────
   Fund: „Ein Template kann heute auf keine Adresse verweisen" — kein Feldtyp dafür,
   `ref`/`refMehrfach` zeigen auf eine im eigenen Depot eingetragene Person/Institution,
   nie auf eine externe Adresse. Konkreter Anlass: ein Vorbereitungsblatt soll auf ein
   amtliches Register zeigen (vorsorgeregister.de).

   ARCHITEKTUR: `verweis` ist ein DISPLAY-ONLY-Feldtyp wie `hinweis` — die Adresse (`f.ziel`)
   ist ein FIXER Bestandteil der Feld-DEFINITION (vom Template-Anbieter gesetzt und beim
   Einlass auf `https:` geprüft), keine Bürgerin trägt hier einen eigenen Wert ein.
   `feldInputHTML` zeigt darum kein Eingabefeld, sondern denselben Link wie `feldWertHTML`.

   NAMENS-WARNUNG: „verweis" ist ANDERS als der bestehende `ref`/`refMehrfach`-„Verweis"
   (zeigt auf eine EINGETRAGENE Person/Institution). Beide heißen im Deutschen „Verweis",
   sind aber zwei verschiedene Dinge — diese Datei prüft ausdrücklich, dass sie nicht
   ineinanderlaufen (letzter Test unten).
   ════════════════════════════════════════════════════════════════════════ */
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

describe('[verweis] Typmengen kennen den neuen Feldtyp', () => {
  test('_TEMPLATE_FELDTYPEN (Torwächter) enthält verweis', () => {
    const { html } = ladeKern();
    assert.match(html, /const _TEMPLATE_FELDTYPEN = new Set\(\[[^\]]*'verweis'/s);
  });
  test('_TEMPLATE_RENDER_TYPEN enthält verweis — sonst käme das Feld an, würde aber nie angezeigt', () => {
    const { html } = ladeKern();
    assert.match(html, /const _TEMPLATE_RENDER_TYPEN = new Set\(\[[^\]]*'verweis'/s);
  });
  test('_TEMPLATE_UNTERFELD_TYPEN enthält verweis NICHT — eine externe Adresse ist kein Listen-Unterfeld', () => {
    const { html } = ladeKern();
    const m = html.match(/const _TEMPLATE_UNTERFELD_TYPEN = new Set\(\[([^\]]*)\]\)/s);
    assert.ok(m, 'Konstante gefunden');
    assert.ok(!m[1].includes("'verweis'"), 'verweis steht nicht in der Unterfeld-Menge');
  });
});

describe('[verweis] validateTemplate — Form geprüft, nicht Zugehörigkeit', () => {
  const feldBasis = { feldname: 'Register', feldtyp: 'verweis', bereich: 'vorsorge', pflicht: false };

  test('eine gültige https-Adresse wird angenommen', () => {
    const { V } = ladeKern();
    const grund = V.validateTemplate({ felder: [{ ...feldBasis, ziel: 'https://vorsorgeregister.de' }] });
    assert.equal(grund, null, grund);
  });
  test('JEDE syntaktisch gültige https-Adresse geht durch — keine Positivliste erlaubter Domains', () => {
    const { V } = ladeKern();
    for (const ziel of ['https://example.org', 'https://a.b.c.de/pfad?x=1#anker', 'https://vorsorgeregister.de:443/']) {
      assert.equal(V.validateTemplate({ felder: [{ ...feldBasis, ziel }] }), null, ziel);
    }
  });
  test('ohne ziel wird abgewiesen, benannt', () => {
    const { V } = ladeKern();
    const grund = V.validateTemplate({ felder: [{ ...feldBasis }] });
    assert.match(grund, /verweis ohne ziel/);
  });
  test('leeres ziel wird abgewiesen wie fehlendes', () => {
    const { V } = ladeKern();
    const grund = V.validateTemplate({ felder: [{ ...feldBasis, ziel: '   ' }] });
    assert.match(grund, /verweis ohne ziel/);
  });
  test('[Tor zu] javascript: wird abgewiesen — kein Ausführungsschema als „Adresse"', () => {
    const { V } = ladeKern();
    const grund = V.validateTemplate({ felder: [{ ...feldBasis, ziel: 'javascript:alert(1)' }] });
    assert.match(grund, /unzulässigem Schema/);
  });
  test('[Tor zu] data: wird abgewiesen', () => {
    const { V } = ladeKern();
    const grund = V.validateTemplate({ felder: [{ ...feldBasis, ziel: 'data:text/html,<script>alert(1)</script>' }] });
    assert.match(grund, /unzulässigem Schema/);
  });
  test('[Tor zu] file: wird abgewiesen — kein Lokal-Schema als „Adresse"', () => {
    const { V } = ladeKern();
    const grund = V.validateTemplate({ felder: [{ ...feldBasis, ziel: 'file:///etc/passwd' }] });
    assert.match(grund, /unzulässigem Schema/);
  });
  test('[Tor zu] http: (ohne s) wird abgewiesen — das Schema ist auf https: geschlossen', () => {
    const { V } = ladeKern();
    const grund = V.validateTemplate({ felder: [{ ...feldBasis, ziel: 'http://vorsorgeregister.de' }] });
    assert.match(grund, /unzulässigem Schema/);
  });
  test('ein syntaktisch kaputter Wert (kein URL-Parse) wird namentlich abgewiesen, nicht mit einem generischen Wurf', () => {
    const { V } = ladeKern();
    const grund = V.validateTemplate({ felder: [{ ...feldBasis, ziel: 'nicht-mal-ansatzweise-eine-url' }] });
    assert.match(grund, /ungültiger Adresse/);
  });
  test('verweis mit codeWerte wird abgewiesen — ein Verweis ist keine Auswahl', () => {
    const { V } = ladeKern();
    const grund = V.validateTemplate({ felder: [{ ...feldBasis, ziel: 'https://vorsorgeregister.de', codeWerte: [{ code: 'x', anzeige: 'X' }] }] });
    assert.match(grund, /verweis mit codeWerte/);
  });
});

describe('[verweis] Render — Link entsteht aus geprüften Feldern, nicht aus Markup im Text', () => {
  const feld = { id: 'zvr', typ: 'verweis', label: 'Zentrales Vorsorgeregister', ziel: 'https://vorsorgeregister.de' };

  test('feldWertHTML: <a> mit target=_blank, rel=noopener noreferrer, sichtbarem Ziel', () => {
    const { V } = ladeKern();
    const html = V.feldWertHTML(feld, undefined);
    assert.equal(html, '<a href="https://vorsorgeregister.de" target="_blank" rel="noopener noreferrer">https://vorsorgeregister.de</a>');
  });
  test('feldInputHTML liefert DENSELBEN Link wie feldWertHTML — kein Eingabefeld, kein zweiter Link-Aufbau', () => {
    const { V } = ladeKern();
    assert.equal(V.feldInputHTML(feld, undefined), V.feldWertHTML(feld, undefined));
  });
  test('feldWertText (PDF/Docx-Klartext-Zwilling): nackte Adresse, kein <a>', () => {
    const { V } = ladeKern();
    assert.equal(V.feldWertText(feld, undefined), 'https://vorsorgeregister.de');
  });
  test('feldEingetragen: „eingetragen" bemisst sich an der Definition (feld.ziel), nicht an roh', () => {
    const { V } = ladeKern();
    assert.equal(V.feldEingetragen(feld, undefined), true, 'roh ist immer leer, trotzdem eingetragen');
    assert.equal(V.feldEingetragen(feld, 'irgendwas'), true, 'ein evtl. vorhandenes roh ändert nichts');
    assert.equal(V.feldEingetragen({ ...feld, ziel: '' }, undefined), false, 'ohne ziel: nicht eingetragen');
  });
  test('[Fail-closed·Rot-Beweis] ein Feld mit ungeprüft-ungültigem ziel (Verteidigung in der Tiefe) rendert Leer, NIE einen Link', () => {
    // Simuliert eine Definition, die die Import-Prüfung irgendwie umgangen hat (älterer Stand,
    // manipulierte Depot-Datei) — der RENDERER muss trotzdem fail-closed bleiben, nicht dem
    // Einlass blind vertrauen.
    const { V } = ladeKern();
    const boese = { id: 'x', typ: 'verweis', label: 'Böse', ziel: 'javascript:alert(1)' };
    assert.equal(V.feldWertHTML(boese, undefined), '<span class="leer">' + V.STRINGS.leerZustand + '</span>');
    assert.equal(V.feldWertText(boese, undefined), V.STRINGS.leerZustand);
    assert.equal(V.feldInputHTML(boese, undefined), V.feldWertHTML(boese, undefined));
  });
  test('ohne ziel: feldWertHTML zeigt den normalen Leer-Zustand, wie jedes andere unausgefüllte Feld', () => {
    const { V } = ladeKern();
    assert.equal(V.feldWertHTML({ ...feld, ziel: '' }, undefined), '<span class="leer">' + V.STRINGS.leerZustand + '</span>');
  });
});

describe('[verweis] Ende zu Ende über feldZeileHTML — dieselbe Zeile in Lese- UND Bearbeitungs-Modus', () => {
  test('darf=true (Bearbeitungs-Modus) und darf=false (Lese-Modus) zeigen denselben Link', () => {
    const { V } = ladeKern();
    const feld = { id: 'zvr', typ: 'verweis', label: 'Zentrales Vorsorgeregister', ziel: 'https://vorsorgeregister.de' };
    const zeileBearbeiten = V.feldZeileHTML(feld, undefined, null, true, false);
    const zeileLesen = V.feldZeileHTML(feld, undefined, null, false, false);
    assert.match(zeileBearbeiten, /<a href="https:\/\/vorsorgeregister\.de"/);
    assert.match(zeileLesen, /<a href="https:\/\/vorsorgeregister\.de"/);
    // Kein `feld-zeile--leer` (die "leichteres Leerfeld"-Optik) — das Feld IST eingetragen.
    assert.doesNotMatch(zeileLesen, /feld-zeile--leer/);
  });
  test('_templateDefAlsFeld reicht ziel aus der rohen Definition durch', () => {
    const { V } = ladeKern();
    const def = { feldId: 'zvr', typ: 'verweis', ziel: 'https://vorsorgeregister.de' };
    const feld = V._templateDefAlsFeld(def);
    assert.equal(feld.ziel, 'https://vorsorgeregister.de');
  });
  test('_templateDefAlsFeld ohne ziel: die Eigenschaft fehlt am Feld, kein leerer String', () => {
    const { V } = ladeKern();
    const def = { feldId: 'zvr', typ: 'verweis' };
    const feld = V._templateDefAlsFeld(def);
    assert.equal('ziel' in feld, false);
  });
});

test('[verweis · Namens-Warnung] verweis und ref sind zwei verschiedene Feldtypen, keine Kollision', () => {
  const { V } = ladeKern();
  // Ein `ref`-Feld mit demselben Wortlaut im Label bleibt ein ref — verweis-Logik greift nicht.
  const refFeld = { id: 'x', typ: 'ref', label: 'Verweis', entitaet: 'person' };
  assert.equal(V.feldWertHTML(refFeld, { ref: null, override: 'Max Mustermann' }), 'Max Mustermann');
  // Ein `verweis`-Feld mit `entitaet` gesetzt (Verwechslungs-Versuch) ignoriert es — es rendert
  // trotzdem den Link aus `ziel`, nicht einen Personennamen.
  const verweisFeld = { id: 'y', typ: 'verweis', label: 'Verweis', entitaet: 'person', ziel: 'https://vorsorgeregister.de' };
  assert.equal(V.feldWertHTML(verweisFeld, undefined), '<a href="https://vorsorgeregister.de" target="_blank" rel="noopener noreferrer">https://vorsorgeregister.de</a>');
});
