'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Wortlaut-Findings aus dem iOS/Desktop-Test 04.07. (Findings 1 / 8 / 3 / 13)
   ────────────────────────────────────────────────────────────────────────
   Reine Text-/Transparenz-Änderungen — kein Krypto, keine Datenmodell-Änderung.
   Pinnen den neuen Wortlaut + die Zielbereich-Ableitung, damit ein späterer
   Umbau sie nicht still zurückdreht.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

test('[Finding 1] Speichernachricht: „Fenster offen" + ehrlich, dass RAM nicht die Datei ist', () => {
  const { V } = ladeKern();
  const s = V.STRINGS.pausenErlaubnis;
  assert.match(s, /Solange dieses Fenster offen ist/, 'ehrlich: Sitzung ≠ Datei');
  // Nr. 3 (Wortlaute zur Freigabe, 09.08.2026): KEIN Knopfname mehr im Text — er würde bei jeder
  // Umbenennung falsch. Ersetzt durch eine knopf-neutrale Aussage ("gesichert sind sie erst, wenn…").
  assert.ok(!/Speichern-Knopf/.test(s), 'kein Knopfname mehr im Text (Nr. 3)');
  assert.match(s, /Gesichert sind sie erst/, 'sagt weiterhin ehrlich, dass die Eingaben noch nicht gesichert sind');
  assert.ok(!/jederzeit pausieren/.test(s), 'die alte „pausieren"-Formulierung ist ersetzt');
});

test('[Finding 8] Provider-Import bürgernah: „Geprüftes Dokument einer Einrichtung einlesen"', () => {
  const { V } = ladeKern();
  assert.equal(V.STRINGS.importProviderLabel, 'Geprüftes Dokument einer Einrichtung einlesen');
  assert.ok(!/Zertifikat/.test(V.STRINGS.importProviderLabel), 'kein „Zertifikat"-Fachwort mehr');
});

test('[Finding 3, nachgezogen 12.09.2026] Zwei Türen, zwei Wortlaute: zentral „Daten einlesen", bereichslokal „Datei in diesen Bereich einlesen"', () => {
  // Nutzer-Rückmeldung (v1.0-rc.501, 12.09.2026): „In diesen Bereich einlesen" wurde als „mehr
  // erfahren" gelesen — die Handlung fehlte, nur der Ort stand da. Der alte Wortlaut war hier
  // seit dem 04.07.-Finding gepinnt (ausdrücklich als „sagt WOHIN" begründet) — genau die
  // Eigenschaft, die sich jetzt als das Problem erwies. Neu: die Handlung („Datei … einlesen")
  // UND der Ort bleiben beide im Satz, die zwei Türen bleiben unterscheidbar.
  const { V } = ladeKern();
  assert.equal(V.STRINGS.einlesenKnopf, 'Daten einlesen', 'zentrale Sidebar-Tür unverändert');
  assert.equal(V.STRINGS.einlesenBereichKnopf, 'Datei in diesen Bereich einlesen', 'bereichslokale Tür nennt jetzt die Handlung (Datei einlesen), nicht nur den Ort');
  assert.notEqual(V.STRINGS.einlesenKnopf, V.STRINGS.einlesenBereichKnopf, 'die beiden Türen sind unterscheidbar');
});

test('[Finding 13] Zielbereiche eines Wizards: distinkt, in Reihenfolge, Bürger-Labels', () => {
  const { V } = ladeKern();
  // umzwiz schreibt fest nach identitaet (Standard) + verwaltung (Schritt 4) + wohnen (Schritt 5).
  const namen = V.wizardZielBereichNamen(V.WIZARD_BY_ID.umzwiz);
  assert.equal(namen.join(' | '), [
    V.SEKTOR_BY_ID.identity.label,
    V.SEKTOR_BY_ID.administration.label,
    V.SEKTOR_BY_ID.housing.label,
  ].join(' | '), 'genau die drei Zielbereiche, distinkt + in Schritt-Reihenfolge');
  // heirwiz: identitaet (Standard) + meine-menschen. U2-ADR-096: vorsorge ist entfallen —
  // die zwei B8-Schritte hingen an den abgerissenen Gates und schrieben danach ins Nichts.
  const h = V.wizardZielBereichNamen(V.WIZARD_BY_ID.heirwiz);
  assert.ok(h.includes(V.SEKTOR_BY_ID.identity.label) && h.includes(V.SEKTOR_BY_ID['people'].label));
  assert.ok(!h.includes(V.SEKTOR_BY_ID.advanceCare.label), 'kein Vorsorge-Ziel mehr in heirwiz');
  // Ein-Ziel-Wizard (anamwiz → nur gesundheit): genau ein Eintrag.
  assert.deepEqual(Array.from(V.wizardZielBereichNamen(V.WIZARD_BY_ID.anamwiz)), [V.SEKTOR_BY_ID.health.label]);
});

test('[Finding 13] deutsche Aufzählung: A / A und B / A, B und C', () => {
  const { V } = ladeKern();
  assert.equal(V._wizZieleSatz(['A']), 'A');
  assert.equal(V._wizZieleSatz(['A', 'B']), 'A ' + V.STRINGS.wizZieleUnd + ' B');
  assert.equal(V._wizZieleSatz(['A', 'B', 'C']), 'A, B ' + V.STRINGS.wizZieleUnd + ' C');
});
