'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Test — flowShlVorbereiten()-Wortlaut (29.08.2026, Auftrag: die
   SHL-Erklärung ist "nicht bürgertauglich")
   ────────────────────────────────────────────────────────────────────────
   Zwei Funde, jetzt behoben (Report-before-Build, der Vorschlag wurde
   bestätigt — mit einer Korrektur: "der Schlüssel ist im Freigabe-Link
   enthalten" statt "reist getrennt davon im Freigabe-Link"):

   1. shlEinfuehrung nannte keinen Sinn ("warum getrennt?") und zeigte einen
      internen Entwicklungshinweis ("Experimentell: die Verschlüsselung
      wartet noch auf eine externe Prüfung.") direkt der Bürgerin.
   2. shlUrlHinweis setzte eigenen Server + SFTP-Kenntnis voraus — komplett
      unrealistisch für eine Bürgerin. Jetzt: ein echter Link zu
      share.vivodepot.de (U2-ADR-183, deployt+verifiziert 29.08.2026),
      `target="_blank"` — Top-Level-Navigation, kein `connect-src`-Vorgang
      (derselbe Grund, aus dem es KEIN `window.open()`/Skript-Aufruf ist).

   Rot-Beweis geführt: vor der Umsetzung schlugen drei der vier Proben am
   unveränderten Wortlaut fehl (SFTP-Erwähnung, fehlender share.vivodepot.de-
   Link, „Experimentell"-Hinweis) — verifiziert, dann erst der Wortlaut/das
   Markup geändert.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { ladeKern } = require('./load-kern.js');

const PW = 'pw';
// Selbst erzeugt seit 12.09.2026 (Produktentscheidung: kein Fremdmaterial in tests/fixtures/) —
// dieser Test prüft reinen UI-Wortlaut, der Bündel-Inhalt spielt keine Rolle.
const FIXTURE = path.join(__dirname, 'fixtures', 'eigenprobe-eu-lab.json');

async function frischMitLabDoc() {
  const { V, document } = ladeKern();
  await V.depotAnlegen(PW);
  const text = fs.readFileSync(FIXTURE, 'utf8');
  const id = V.importAutoritativDokument(text);
  assert.ok(id, 'Vorbedingung: die Fixture wird als autoritativer Eintrag abgelegt');
  return { V, document, id };
}

test('[SHL-Wortlaut] shlEinfuehrung nennt den Sinn der Trennung und zeigt KEINEN internen Entwicklungshinweis', async () => {
  const { V, document, id } = await frischMitLabDoc();
  await V.flowShlVorbereiten(id);
  const html = document.getElementById('modal-inhalt').innerHTML;
  assert.match(html, /Schlüssel ist im Freigabe-Link enthalten/, 'nennt den Mechanismus');
  assert.match(html, /sieht ausschließlich unlesbaren Text/, 'erklärt den SINN — warum die Trennung schützt');
  assert.doesNotMatch(html, /Experimentell/, 'kein interner Entwicklungshinweis für die Bürgerin sichtbar');
});

test('[SHL-Wortlaut] Schritt 2 trägt einen echten Link zu share.vivodepot.de — Top-Level-Navigation, kein Skript-Aufruf', async () => {
  const { V, document, id } = await frischMitLabDoc();
  await V.flowShlVorbereiten(id);
  const html = document.getElementById('modal-inhalt').innerHTML;
  assert.match(html, /<a[^>]+href="https:\/\/share\.vivodepot\.de\/"[^>]*>/, 'echter <a href>, kein Knopf mit window.open');
  assert.match(html, /target="_blank"/);
  assert.match(html, /rel="noopener noreferrer"/, 'kein Reverse-Tabnabbing');
  assert.doesNotMatch(html, /SFTP|eigenen Server/i, 'die alte, unrealistische Server-Annahme ist weg');
});

test('[SHL-Wortlaut] shlUrlHinweis erklärt, woher die Adresse kommt (von share.vivodepot.de, nicht vom eigenen Server)', async () => {
  const { V, document, id } = await frischMitLabDoc();
  await V.flowShlVorbereiten(id);
  const html = document.getElementById('modal-inhalt').innerHTML;
  assert.match(html, /share\.vivodepot\.de nach dem Hochladen/);
});

test('[SHL-Wortlaut] das bestehende Eingabefeld (#shl-url) und der Bauen-Knopf bleiben unverändert erreichbar', async () => {
  const { V, document, id } = await frischMitLabDoc();
  await V.flowShlVorbereiten(id);
  const box = document.getElementById('modal-inhalt');
  assert.ok(box.querySelector('#shl-url'), 'Eingabefeld unverändert vorhanden');
  assert.ok(box.querySelector('#shl-bauen'), 'Bauen-Knopf unverändert vorhanden');
  assert.ok(box.querySelector('#shl-datei'), 'Datei-sichern-Knopf (Schritt 1) unverändert vorhanden');
});
