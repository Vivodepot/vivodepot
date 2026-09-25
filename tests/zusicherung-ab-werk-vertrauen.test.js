'use strict';
/* ════════════════════════════════════════════════════════════════════════
   ZS1 (Auftrag, 19.09.2026) — U2-ADR-331-Nachtrag: wer darf
   einen Zusicherungs-Satz in eine andere Sprache setzen?
   ────────────────────────────────────────────────────────────────────────
   U2-ADR-331 liess die Frage offen: „Wie ein solcher Satz vertrauenswürdig
   in eine andere Sprache kommt, ist eine eigene, offene Frage." Gemessen
   (19.09.2026): 24 Zusicherungs-Schlüssel, alle in EN-Produkten heute
   deutsch, weil `textsatzModulPruefen` JEDE Quelle gleich behandelte —
   auch `AB_WERK_TEXTSATZ_EN` (B3), obwohl diese Konstante in DIESES HTML
   gebacken ist und keine Depot-Datei sie ändern kann, ohne die Anwendung
   selbst zu ändern.

   DIE ANTWORT: `textsatzModulPruefen(modul, { vertrauenswuerdig: true })`
   — ein zweites, ausdrückliches Argument, das NUR am `AB_WERK_TEXTSATZ_EN`-
   Aufruf in `_textsatzModuleAusDepotAnmelden` gesetzt wird. Jeder andere
   Aufruf (Mitschrift, Depot-Module) bleibt ohne dieses Argument — beide
   liegen in der Depot-DATEI, änderbar von jedem, der die Datei besitzt.
   Der Unterschied ist WO der Text liegt, nicht WER ihn ursprünglich baute.

   ZWEI ROT-BEWEISE, eine Richtung je Vertrauensstufe:
   1) die vertrauenswürdige Saat DARF jetzt einen Zusicherungs-Satz auf
      Englisch setzen (vorher: KEINER der 24 Schlüssel kam durch).
   2) ein fremdes/geladenes Modul darf es WEITERHIN nicht — auch nicht,
      wenn es sich als `AB_WERK_TEXTSATZ_EN` ausgibt (kein Vertrauen über
      den Inhalt, nur über den WEG, wie er ins Programm kam). */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeLesen } = require('./load-lesen.js');

// Die Soll-Übersetzung kommt aus dem Katalog der Lese-App selbst, nicht aus einem zweiten Wortlaut hier.
const EN_KEINE = ladeLesen().V.ZUSICHERUNG_TEXTE_EN.herkunftSatzKeine;

test('[ZS1·Rot-Beweis 1] die Ab-Werk-Saat DARF jetzt einen Zusicherungs-Satz auf Englisch setzen', () => {
  const { V: L } = ladeLesen();
  L.setData({ sektoren: { identity: {} }, textsprache: 'en' });
  L._foldVollmachtenLesen(L.getData());
  assert.equal(L.STRINGS.herkunftSatzKeine,
    EN_KEINE,
    'die englische Ab-Werk-Übersetzung muss jetzt ankommen, nicht mehr die deutsche Zusicherung');
});

test('[ZS1·Rot-Beweis 1·Gegenrichtung] ohne Vertrauens-Flag bleibt derselbe Aufruf abgewiesen', () => {
  const { V: L } = ladeLesen();
  const r = L.textsatzModulPruefen({
    modulTyp: 'textsatz', sprache: 'en', moduleVersion: 1,
    texte: { 'strings:herkunftSatzKeine.text': 'This information comes entirely from Vivodepot itself. No extension has been added.' },
  });
  const verworfen = r.verworfene.find((v) => v.kennung === 'strings:herkunftSatzKeine.text');
  assert.ok(verworfen && verworfen.grund === 'zusicherung',
    'derselbe Text, aber ohne { vertrauenswuerdig: true } — muss weiterhin als Zusicherung abgewiesen werden');
});

test('[ZS1·Rot-Beweis 2] ein fremdes Modul darf einen Zusicherungs-Satz WEITERHIN nicht überschreiben, auch auf Englisch', () => {
  const { V: L } = ladeLesen();
  L.setData({
    sektoren: { identity: {} }, textsprache: 'en',
    textsatzModule: [{
      modulTyp: 'textsatz', sprache: 'en', moduleVersion: 1,
      texte: { 'strings:herkunftSatzKeine.text': 'FAKE — trust me, nothing is added.' },
    }],
  });
  L._foldVollmachtenLesen(L.getData());
  assert.notEqual(L.STRINGS.herkunftSatzKeine, 'FAKE — trust me, nothing is added.',
    'ein Depot-eigenes Modul darf die Zusicherung nicht überschreiben — auch nicht auf Englisch');
  assert.equal(L.STRINGS.herkunftSatzKeine, EN_KEINE,
    'stattdessen gilt weiterhin die vertrauenswürdige Ab-Werk-Übersetzung');
});

test('[ZS1·Rot-Beweis 2·Gegenrichtung] ein Modul, das sich als AB_WERK_TEXTSATZ_EN ausgibt, bekommt KEIN Vertrauen geschenkt', () => {
  const { V: L } = ladeLesen();
  // Dieselbe Form wie die echte Ab-Werk-Saat (modulTyp/sprache/moduleVersion/texte), aber über
  // den GEWÖHNLICHEN, ungetrusteten Aufrufweg geprüft — das Vertrauen hängt am AUFRUF, nicht am
  // Inhalt oder an einer behaupteten Herkunft im Modul selbst (es gibt kein "ich bin Ab-Werk"-Feld).
  const nachgeahmt = { modulTyp: 'textsatz', sprache: 'en', moduleVersion: 1,
    texte: { 'strings:herkunftSatzKeine.text': 'A pretend Ab-Werk translation.' } };
  const r = L.textsatzModulPruefen(nachgeahmt);
  const verworfen = r.verworfene.find((v) => v.kennung === 'strings:herkunftSatzKeine.text');
  assert.ok(verworfen && verworfen.grund === 'zusicherung',
    'ohne das { vertrauenswuerdig: true }-Argument am Aufruf wird IMMER abgewiesen, egal wie das Modul aussieht');
});

test('[ZS1·Deckung] alle sechs bereits übersetzten Zusicherungs-Sätze kommen jetzt auf Englisch an', () => {
  const { V: L } = ladeLesen();
  L.setData({ sektoren: { identity: {} }, textsprache: 'en' });
  L._foldVollmachtenLesen(L.getData());
  const bereitsUebersetzt = [
    'herkunftSatzAlleGeprueft', 'herkunftSatzKeine', 'herkunftSatzTeilweise',
    'standSatzBekannt', 'standSatzKeine', 'standSatzTeilweise',
  ];
  for (const schluessel of bereitsUebersetzt) {
    const wert = L.STRINGS[schluessel];
    assert.ok(typeof wert === 'string' && wert.length > 0, schluessel + ' fehlt');
    assert.doesNotMatch(wert, /[äöüßÄÖÜ]/, schluessel + ' sieht noch deutsch aus: ' + wert);
  }
});
