'use strict';
/* ════════════════════════════════════════════════════════════════════════
   U2-ADR-124, Zug 3 — Schnellstart (bis 21.11.2026 in den Einstellungen, seitdem in der Hilfe)
   ────────────────────────────────────────────────────────────────────────
   Fünf Schritte, Zuschnitt aus dem Auftrag: Datei öffnen · Passwort setzen
   + Verlust-Folge · Anlass wählen · Feld ausfüllen · speichern + Ablageort.
   Kein eigener Test für DOM-Wiring nötig — der Abschnitt ist reiner Text im
   selben `einstellungenHTML()`-String wie alle anderen Abschnitte, ohne
   eigene Buttons/Handler (anders als Zug 2, das eine eigene Route braucht).
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');
const escapeHtml = (t) => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

// Schritt 4 und 5 kommen seit U2-ADR-474 aus dem Speichermodell (speicherSatz), je nach Modus;
// im Harness gilt der Datei-Modus.
// Seit 21.11.2026 steht der Schnellstart in der Hilfe-Übersicht, nicht mehr in den Einstellungen (dort geht es um
// Einstellungen, nicht um Anleitungen). Er war nur in den Einstellungen erreichbar; er zieht um, er fällt nicht weg.
test('[Zug3] alle fünf Schritte stehen in der Hilfe-Übersicht', () => {
  const { V } = ladeKern();
  const html = V.hilfeUebersichtHTML();
  assert.ok(html.includes(V.STRINGS.einstAbschnittSchnellstart), 'Überschrift Schnellstart in der Hilfe');
  for (const s of [V.STRINGS.schnellstartSchritt1, V.STRINGS.schnellstartSchritt2,
    V.STRINGS.schnellstartSchritt3, V.speicherSatz('schnellstartEintragen'), V.speicherSatz('schnellstartSichern')]) {
    assert.ok(html.includes(escapeHtml(s)), 'fehlt in der Hilfe: ' + s);
  }
});

test('[Zug3] die Einstellungen tragen keinen Schnellstart mehr', () => {
  const { V } = ladeKern();
  const html = V.einstellungenHTML();
  assert.ok(!html.includes(V.STRINGS.einstAbschnittSchnellstart), 'Überschrift Schnellstart steht nicht in den Einstellungen');
  assert.ok(!html.includes(escapeHtml(V.STRINGS.schnellstartSchritt1)), 'Schritt 1 steht nicht in den Einstellungen');
  assert.doesNotMatch(html, /einst-schnellstart-schritte/);
});

test('[Zug3] Schritt 2 nennt die Passwort-Verlust-Folge, mit derselben Ehrlichkeit wie das Notfall-Blatt', () => {
  const { V } = ladeKern();
  // Seit U2-ADR-430 (27.09.2026) mit dem Zusatz zum Wiederherstellungs-Code — derselbe Zusatz wie im Notfall-Blatt-Angebot.
  assert.match(V.STRINGS.schnellstartSchritt2, /lässt sich die Datei später nur noch mit einem Wiederherstellungs-Code öffnen, falls Sie einen eingerichtet haben/);
  // Seit 24.11.2026 (Durchgang C4) als eigener Satz statt „— von uns nicht“; die Aussage bleibt in beiden gleich.
  assert.match(V.STRINGS.schnellstartSchritt2, /Wir selbst können sie nicht öffnen\./,
    'dieselbe Ehrlichkeits-Formel wie STRINGS.nfbAnbietenText — keine abgeschwächte Zweitfassung');
  assert.match(V.STRINGS.nfbAnbietenText, /falls Sie einen eingerichtet haben\. Wir selbst können es nicht öffnen\./);
});

test('[Zug3] in der Hilfe steht der Schnellstart vor der Themenliste', () => {
  const { V } = ladeKern();
  const html = V.hilfeUebersichtHTML();
  const posSchnellstart = html.indexOf(V.STRINGS.einstAbschnittSchnellstart);
  const posThemen = html.indexOf('hilfe-themen-liste');
  assert.ok(posSchnellstart >= 0 && posThemen >= 0);
  assert.ok(posSchnellstart < posThemen, 'Schnellstart steht über den Themen');
});

test('[Zug3] U2-ADR-033: keine Empfehlung, kein Rat-Vokabular in den fünf Schritten', () => {
  const { V } = ladeKern();
  const text = [V.STRINGS.schnellstartSchritt1, V.STRINGS.schnellstartSchritt2, V.STRINGS.schnellstartSchritt3,
    V.STRINGS.schnellstartSchritt4, V.STRINGS.schnellstartSchritt5,
    V.STRINGS.schnellstartSchritt4Datei, V.STRINGS.schnellstartSchritt5Datei].join(' ');
  assert.doesNotMatch(text, /am besten/i);
  assert.doesNotMatch(text, /wir empfehlen/i);
  assert.doesNotMatch(text, /sinnvollerweise/i);
});

test('[Zug3] keine Vollständigkeit behauptet — der Abschnitt bleibt bei fünf Schritten, keine Bereichsliste', () => {
  const { V } = ladeKern();
  assert.doesNotMatch(V.STRINGS.einstSchnellstartIntro, /alle Bereiche|vollständig/i);
});

test('[Zug3] Schritt 5 nennt den Weg zur Sicherungskopie so, wie er zu sehen ist, nicht als Menü „Mein Depot“', () => {
  // Das Depot-Menü oben links trägt den Namen des Depots („Klara“), „Mein Depot“ nur ohne Namen (vivodepot.html, eigenName
  // in _depotWechslerAufbauen und tb-depot-name). Ein Satz „Menü ‚Mein Depot‘“ führte darum meist ins Leere (21.11.2026).
  const { V } = ladeKern();
  for (const k of ['schnellstartSchritt5', 'schnellstartSchritt4Datei', 'schnellstartSchritt5Datei']) {
    assert.ok(!String(V.STRINGS[k]).includes(V.STRINGS.depotPilleEigen), k + ' nennt kein Menü „' + V.STRINGS.depotPilleEigen + '“');
  }
  assert.match(V.STRINGS.schnellstartSchritt5, /oben links neben dem Logo/);
});

// SCHNELLSTART-HANDY-WEG (23.11.2026): am Handy gibt es kein „Menü oben links“; die Einstellungen erreicht man über „Bereiche“
// in der Leiste unten. Schritt 5 im Gerätemodus nennt diesen Weg (im Dateimodus nennt er kein Menü).
test('[Zug3] Schritt 5 nennt den Weg am Handy über „Bereiche“', () => {
  const { V } = ladeKern();
  const satz = V.speicherSatz('schnellstartSichern', 'intern');
  assert.ok(satz.includes('„' + V.STRINGS.gruppeBereiche + '“'), 'Schritt 5 nennt „' + V.STRINGS.gruppeBereiche + '“: ' + satz);
  assert.doesNotMatch(satz, /\{beschriftung:/, 'der Platzhalter ist aufgelöst');
  assert.doesNotMatch(V.speicherSatz('schnellstartSichern', 'datei'), /oben links/, 'der Dateimodus nennt kein Menü, das am Handy fehlt');
});

// Rot-Beweis: der Wortlaut von vorher nennt den Weg am Handy nicht und fällt durch die Prüfung oben.
test('[Zug3·Rot-Beweis] der Wortlaut von vorher nennt „Bereiche“ nicht', () => {
  const { V } = ladeKern();
  const vorher = 'Erstellen Sie von Zeit zu Zeit eine Sicherungskopie über „Sicherungskopie“ (Menü oben links neben dem Logo oder Einstellungen → „Export“). Sie macht Ihr Depot unabhängig von diesem Gerät.';
  assert.equal(vorher.includes('„' + V.STRINGS.gruppeBereiche + '“'), false);
});
