'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   A479 (Laufzettel Nacht 22./23.08.2026, Posten 8) — die Lese-App trägt die
   Textsatz-REGELN, nicht nur die Texte
   ────────────────────────────────────────────────────────────────────────────
   GEMESSEN gegen den heutigen Kern, nicht die Registerzeile übernommen: die
   Zeile nannte sechs Regeln (Schreibrichtung, Datumsformat, Dezimaltrenner,
   Tausendertrenner, Währung, Sprachkennung) als fehlend. Der Kern selbst WENDET
   davon nur ZWEI tatsächlich an — `schreibrichtung` (dir) und `sprachkennung`
   (lang). `datumsformat`/`dezimaltrenner`/`tausendertrenner`/`waehrung` werden
   im Kern geprüft und gespeichert (`_textsatzRegelnPruefen`, `textsatzRegeln()`),
   aber NIRGENDS gelesen — `_datumDeutsch` im Kern ist so hart auf
   „TT.MM.JJJJ" verdrahtet wie die Lese-App-Fassung. Die ECHTE Parität-Lücke
   sind darum nur die zwei wirksamen Regeln — das prüft diese Datei, nicht die
   vier wirkungslosen (Gegenprobe unten hält das ausdrücklich fest).

   `dir`/`lang` werden wie im Kern-Test (`tests/textsatz-mechanismus.test.js`,
   Zug 2) über einen eigenen `dok` mit trackendem `setAttribute`/`getAttribute`
   geprüft — der generische Proxy-DOM-Stub in `load-lesen.js` liefert für JEDES
   Element immer `getAttribute() → null` (kein State-Tracking), darum reicht der
   Rückgabewert der Funktion + ein eigener `dok` als Nachweis, genau wie im Kern.
   ════════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { ladeLesen } = require('./load-lesen.js');

const lesen = () => { const r = ladeLesen(); return r.V || r; };
const KERN_QUELLE = fs.readFileSync(path.join(__dirname, '..', 'vivodepot.html'), 'utf8');
const LESEN_QUELLE = fs.readFileSync(path.join(__dirname, '..', 'vivodepot-lesen.html'), 'utf8');
const trackendesDok = () => ({ documentElement: { _attr: {},
  setAttribute(k, w) { this._attr[k] = w; }, getAttribute(k) { return this._attr[k]; } } });

/* ══ Vorbedingung — die Gegenprobe zur eigenen Prämisse ═══════════════════ */

test('[A479·Vorbedingung] Gegenprobe: der Kern selbst liest datumsformat/dezimaltrenner/tausendertrenner NIRGENDS', () => {
  // Der Grund, warum diese Datei nur zwei der sechs Regeln nachbaut: die anderen vier
  // haben im Kern keine Leseseite. Bricht diese Probe künftig (der Kern liest eine der
  // drei jetzt doch), gehört die Lese-App an derselben Stelle nachgezogen.
  for (const regel of ['datumsformat', 'dezimaltrenner', 'tausendertrenner']) {
    assert.ok(!new RegExp('\\.' + regel + '\\b').test(KERN_QUELLE),
      'der Kern liest `.' + regel + '` jetzt doch — die A479-Grenze ist überholt');
  }
  assert.ok(!/textsatzRegeln\(\)\.waehrung/.test(KERN_QUELLE),
    'der Kern liest `textsatzRegeln().waehrung` jetzt doch — die A479-Grenze ist überholt');
});

/* ══ Die Verdrahtung — am selben Trichter wie der Kern am selben Ladeschritt ══ */

test('[A479·Verdrahtung] beide Anwenden-Funktionen laufen GENAU EINMAL, direkt nach der Registry-Anmeldung', () => {
  assert.equal((LESEN_QUELLE.match(/\n\s*try \{ textsatzSchreibrichtungAnwenden\(\); \}/g) || []).length, 1);
  assert.equal((LESEN_QUELLE.match(/\n\s*try \{ textsatzSprachkennungAnwenden\(\); \}/g) || []).length, 1);
  const anmelden = LESEN_QUELLE.indexOf('_textsatzModuleAusDepotAnmelden(obj)');
  const dir = LESEN_QUELLE.indexOf('textsatzSchreibrichtungAnwenden();');
  const lang = LESEN_QUELLE.indexOf('textsatzSprachkennungAnwenden();');
  assert.ok(anmelden > 0 && dir > anmelden && lang > dir, 'Reihenfolge: erst die Registry, dann die zwei Wirkungen');
});

/* ══ Der Bau: schreibrichtung + sprachkennung erreichen den Empfänger ═════ */

test('[A479] ein Modul ohne regeln ändert nichts — dir bleibt ltr, lang bleibt de-DE', () => {
  const L = lesen();
  L._foldVollmachtenLesen({ sektoren: {}, textsatzModule: [] });
  const dok = trackendesDok();
  assert.equal(L.textsatzSchreibrichtungAnwenden(dok), 'ltr');
  assert.equal(L.textsatzSprachkennungAnwenden(dok), 'de-DE');
});

test('[A479·Rot 1] ein Modul mit regeln.schreibrichtung=rtl setzt "dir" auf rtl', () => {
  const L = lesen();
  L._foldVollmachtenLesen({
    sektoren: {},
    textsatzModule: [{ modulTyp: 'textsatz', sprache: 'ar', moduleVersion: 1,
      texte: {}, regeln: { schreibrichtung: 'rtl', sprachkennung: 'ar' } }],
  });
  assert.equal(L.textsatzSpracheAktiv(), 'ar');
  const dok = trackendesDok();
  assert.equal(L.textsatzSchreibrichtungAnwenden(dok), 'rtl');
  assert.equal(dok.documentElement.getAttribute('dir'), 'rtl');
  assert.equal(L.textsatzSprachkennungAnwenden(dok), 'ar');
  assert.equal(dok.documentElement.getAttribute('lang'), 'ar');
});

test('[A479·Rot 2] textsatzRegeln() liefert die Modul-Regel gemischt mit dem eingebauten Rest', () => {
  const L = lesen();
  L._foldVollmachtenLesen({
    sektoren: {},
    textsatzModule: [{ modulTyp: 'textsatz', sprache: 'fr', moduleVersion: 1,
      texte: {}, regeln: { sprachkennung: 'fr-FR' } }],
  });
  const regeln = L.textsatzRegeln();
  assert.equal(regeln.sprachkennung, 'fr-FR', 'die Modul-Regel gewinnt');
  assert.equal(regeln.schreibrichtung, 'ltr', 'ungenannte Regeln bleiben eingebaut');
  assert.equal(regeln.waehrung, 'EUR', 'auch die vier wirkungslosen Regeln bleiben im Objekt (wie im Kern)');
});

test('[A479] eine ungültige regeln-Zeile verwirft NUR sich selbst, nicht das Modul', () => {
  const L = lesen();
  const geprueft = L.textsatzModulPruefen({
    modulTyp: 'textsatz', sprache: 'es', moduleVersion: 1, texte: {},
    regeln: { schreibrichtung: 'diagonal', sprachkennung: 'es-ES' },
  });
  assert.equal(geprueft.gueltig, true, 'das Modul bleibt gültig');
  assert.equal(geprueft.regeln.sprachkennung, 'es-ES');
  assert.equal(geprueft.regeln.schreibrichtung, undefined, 'der unerlaubte Wert ist verworfen, nicht übernommen');
  assert.ok(geprueft.verworfene.some((v) => v.kennung === 'regeln.schreibrichtung' && v.grund === 'unerlaubter-wert'));
});

test('[A479] der Satz geht MIT dem Depot — nach dem Schliessen gilt wieder ltr/de-DE', () => {
  const L = lesen();
  L._foldVollmachtenLesen({
    sektoren: {},
    textsatzModule: [{ modulTyp: 'textsatz', sprache: 'ar', moduleVersion: 1,
      texte: {}, regeln: { schreibrichtung: 'rtl', sprachkennung: 'ar' } }],
  });
  assert.equal(L.textsatzSchreibrichtungAnwenden(trackendesDok()), 'rtl');
  L._foldVollmachtenLesen({ sektoren: {}, textsatzModule: [] });
  const dok = trackendesDok();
  assert.equal(L.textsatzSchreibrichtungAnwenden(dok), 'ltr', 'der Rückweg gilt auch für Regeln');
  assert.equal(L.textsatzSprachkennungAnwenden(dok), 'de-DE');
});

/* ══ Gegenprobe — die vier wirkungslosen Regeln bleiben bewusst unangetastet ══ */

test('[A479·Gegenprobe] datumKurz bleibt unverändert deutsch, auch mit einer abweichenden datumsformat-Regel', () => {
  // Bewusst KEIN Bau: siehe Dateikopf. Diese Probe hält fest, dass die Grenze auch
  // wirklich gezogen wurde, nicht nur behauptet.
  const L = lesen();
  L._foldVollmachtenLesen({
    sektoren: {},
    textsatzModule: [{ modulTyp: 'textsatz', sprache: 'en', moduleVersion: 1,
      texte: {}, regeln: { datumsformat: 'MM/TT/JJJJ' } }],
  });
  assert.equal(L.textsatzRegeln().datumsformat, 'MM/TT/JJJJ', 'die Regel selbst IST übernommen …');
  assert.equal(L.datumKurz('2026-08-23'), '23.08.26', '… aber datumKurz liest sie nicht, wie im Kern');
});
