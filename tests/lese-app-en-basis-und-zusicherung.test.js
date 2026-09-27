'use strict';
/* ═══════════════════════════════════════════════════════
   Lese-App, Englisch: die Datei (Mitschrift) und die App-eigenen Zusicherungssätze (ZS2) zusammen
   ───────────────────────────────────────────────────────
   Zwei getrennte Wege liefern Englisch in der Lese-App: die Mitschrift der Datei (gewöhnliche Beschriftungen, geht durch textsatzModulPruefen)
   und ZUSICHERUNG_TEXTE_EN (ZS2, die Zusicherungssätze, aus dem Quelltext der App). Dass sie einander nicht ins Gehege kommen, hält diese
   Probe: die Datei trägt gewöhnliche Texte, aber NIE einen Zusicherungssatz — den liefert allein die App-eigene Tabelle, auch wenn die
   Mitschrift dieselbe Kennung mit anderem Wortlaut kennt. S1 (21.09.2026): eine eingebackene Basis (B3) gibt es nicht mehr; was die
   Mitschrift nicht trägt, bleibt ohne englischen Text (der deutsche Bereichsname bleibt stehen).
   ═══════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeLesen } = require('./load-lesen.js');

const EN_MODUL = { modulTyp: 'textsatz', sprache: 'en', moduleVersion: 1, anbieterId: 'vivodepot',
  texte: { 'identity#person.label': 'Person', 'strings:klartextHinweis.text': 'This file is securely encrypted.' } };
const depotEn = () => ({ sektoren: {}, textsatzModule: [], abWerkMitschrift: { bereich: [], sprache: JSON.parse(JSON.stringify(EN_MODUL)), logikModul: [] } });

test('[EN·Datei+Zusicherung·Rot-Beweis] eine englische Datei, deren Mitschrift einen Zusicherungssatz umformuliert: gewöhnliche Texte aus der Mitschrift, der Zusicherungssatz bleibt der der App', () => {
  const V = ladeLesen().V;
  V._foldVollmachtenLesen(depotEn());
  assert.equal(V.textsatzSpracheAktiv(), 'en');
  assert.equal(V.textLesen('identity#person.label'), 'Person', 'gewöhnlicher Text aus der Mitschrift');
  assert.equal(V.textLesen('identity.label'), null, 'ohne eingebackene Basis (S1): was die Mitschrift nicht trägt, hat keinen englischen Text');
  assert.equal(V.STRINGS.klartextHinweis, V.ZUSICHERUNG_TEXTE_EN.klartextHinweis, 'der Zusicherungssatz kommt aus der App');
  assert.ok(!/securely encrypted/.test(V.STRINGS.klartextHinweis), 'nicht der des Moduls');
});

test('[EN·Datei+Zusicherung] JEDER Zusicherungsschlüssel liefert in der englischen Datei genau den App-eigenen Satz — keine Mitschrift-Kennung schiebt einen anderen Wortlaut dazwischen', () => {
  const V = ladeLesen().V;
  V._foldVollmachtenLesen(depotEn());
  const abweichend = V.ZUSICHERUNGS_SCHLUESSEL_LESEN.filter((k) => V.STRINGS[k] !== V.ZUSICHERUNG_TEXTE_EN[k]);
  assert.equal(abweichend.length, 0, 'abweichend: ' + abweichend.join(', '));   // Realm-Grenze: Arrays der Lese-App sind keine Arrays dieses Kontexts
  assert.ok(V.ZUSICHERUNGS_SCHLUESSEL_LESEN.length >= 20, 'Ausbeute');
});

test('[EN·Datei+Zusicherung] in einer deutschen Datei bleiben beide unberührt: der deutsche Satz gilt', () => {
  const V = ladeLesen().V;
  V._foldVollmachtenLesen({ sektoren: {}, textsatzModule: [] });
  assert.equal(V.textsatzSpracheAktiv(), 'de');
  assert.match(V.STRINGS.klartextHinweis, /unverschlüsselt/);
});
