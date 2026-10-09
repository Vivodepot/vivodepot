'use strict';
/* ════════════════════════════════════════════════════════════════════════
   EINE Musterquelle für die KI-Nennung (26.09.2026)
   ────────────────────────────────────────────────────────────────────────
   tests/adr-ohne-ki-nennung.test.js (ADRs) und tests/repo-ohne-ki-nennung.test.js
   (ganzes Repo) lesen dieses eine Muster. Ein neues Werkzeugwort kommt HIER
   dazu, nicht in einer der Proben — sonst prüfen sie verschiedene Dinge.

   Die Wörter stehen zusammengesetzt, damit weder diese Datei noch eine Probe,
   die sie liest, beim Nachsehen mit `git grep -i -E` sich selbst findet.
   Das dritte Wort trägt eine Wortgrenze davor: ohne sie träfe es mitten in
   „Nachfolgeministerium" (docs/fremdquellen.md).

   KI_NENNUNG_GREP ist die grobe Vorauswahl für `git grep -i -E` (ohne
   Wortgrenze, weil sie nicht in jeder git-Regex-Maschine gleich gilt);
   entschieden wird immer mit KI_NENNUNG_MUSTER.
   ════════════════════════════════════════════════════════════════════════ */
const WERKZEUG = ['cla', 'ude'].join('');
const GESPRAECH = ['spar', 'ring'].join('');
const ZWEITES = ['gem', 'ini'].join('');

const KI_NENNUNG_MUSTER = new RegExp(WERKZEUG + '|' + GESPRAECH + '|\\b' + ZWEITES, 'i');
const KI_NENNUNG_GREP = [WERKZEUG, GESPRAECH, ZWEITES].join('|');
// Der Name des Anbieters (08.10.2026): privat erlaubt (Trailer-Prüfung, Geheimnis-Scan), im öffentlichen Zuschnitt nicht —
// darum nicht Teil von KI_NENNUNG_MUSTER, sondern eigens für die Probe am öffentlichen Zuschnitt.
const ANBIETER = ['anthr', 'opic'].join('');

module.exports = { KI_NENNUNG_MUSTER, KI_NENNUNG_GREP, WOERTER: Object.freeze({ WERKZEUG, GESPRAECH, ZWEITES, ANBIETER }) };
