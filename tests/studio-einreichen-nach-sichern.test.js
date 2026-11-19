'use strict';
/* ═════════════════════════════════════════════════════════════════
   Studio · Einreichen und Veröffentlichen stehen hinter dem Sichern (S-5, 16.11.2026)
   ─────────────────────────────────────────────────────────────────
   (1) Vor dem Sichern ist „Vorlage sichern“ der Hauptknopf der Arbeitsfläche; „Fertigstellen und einreichen“ bleibt
       erreichbar, ist aber kein Hauptknopf mehr. Der Abschnitt der nächsten Schritte ist im Markup verborgen.
   (2) Nach „Entwurf sichern“ und „Vorlage sichern“ erscheint er; er trägt „Einreichen“ (fertigOeffnen, derselbe Weg wie
       zuvor) und „Veröffentlichen“ (der Anfrage-Assistent).
   (3) Link und QR-Code der signierten Anfrage entstehen über die vorhandenen Bausteine (anfrageAlsLink,
       anfrageQrTeilAnhaengen, kurzlinkQrDataUrl); nur eine signierte Anfrage kommt auf die Seite. Die Seite berührt weder
       Passwort noch Schlüssel noch Signatur.
   Gelesen wird der Quelltext; STUDIO_HTML nennt für den Rot-Beweis eine andere Fassung der Datei.
   ═════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const REPO = path.join(__dirname, '..');
const HTML = fs.readFileSync(process.env.STUDIO_HTML || path.join(REPO, 'vivodepot-studio.html'), 'utf8');

const knopf = (id) => { const m = HTML.match(new RegExp('<button[^>]*\\bid="' + id + '"[^>]*>')); return m ? m[0] : null; };
function funktion(name) {
  const i = HTML.search(new RegExp('(?:async )?function ' + name + '\\('));
  if (i < 0) return '';
  const k = HTML.indexOf('\n}\n', i);
  return HTML.slice(i, k < 0 ? i + 4000 : k + 2);
}

test('[Nach dem Sichern · vorher] „Vorlage sichern“ ist der Hauptknopf, „Fertigstellen und einreichen“ nicht', () => {
  assert.match(knopf('vorlage-sichern') || '', /class="[^"]*haupt-knopf/, 'Vorlage sichern ist kein Hauptknopf');
  assert.ok(knopf('fertig-oeffnen'), 'der bisherige Weg „Fertigstellen und einreichen“ fehlt');
  assert.doesNotMatch(knopf('fertig-oeffnen'), /haupt-knopf/, 'Einreichen steht als Hauptweg vor dem Sichern');
});

test('[Nach dem Sichern · vorher] der Abschnitt der nächsten Schritte ist zu Beginn verborgen', () => {
  assert.match(HTML, /<section[^>]*\bid="nach-sichern"[^>]*\bhidden\b/, 'kein verborgener Abschnitt nach dem Sichern');
});

test('[Nach dem Sichern · nachher] Einreichen und Veröffentlichen sind dort erreichbar', () => {
  const abschnitt = (HTML.match(/<section[^>]*\bid="nach-sichern"[\s\S]*?<\/section>/) || [''])[0];
  assert.ok(/id="ns-einreichen"/.test(abschnitt) && /id="ns-veroeffentlichen"/.test(abschnitt), 'Knöpfe fehlen im Abschnitt');
  assert.match(HTML, /an\('ns-einreichen', 'click', fertigOeffnen\)/, 'Einreichen führt nicht in den bisherigen Dialog');
  assert.match(HTML, /an\('ns-veroeffentlichen', 'click', \(\) => \{ anfrageAssistentEintreten\(\); zeigeSchritt\('anfrage'\); \}\)/);
  assert.match(HTML, /an\('entwurf-sichern', 'click', async \(\) => \{ await entwurfSichern\(\); nachSichernZeigen\(\); \}\)/);
  assert.match(HTML, /an\('vorlage-sichern', 'click', async \(\) => \{ if \(await vorlageSichern\(\) !== false\) nachSichernZeigen\(\); \}\)/,
    'nach dem Sichern der Vorlage, nicht wenn der Name fehlt und nichts hinausging');
});

test('[Nach dem Sichern · nachher] Link und QR-Code kommen aus den vorhandenen Bausteinen, nur für eine signierte Anfrage', () => {
  const rendern = funktion('nachSichernAnfrageRendern'), merken = funktion('nachSichernAnfrageMerken');
  assert.match(rendern, /anfrageAlsLink\(/); assert.match(rendern, /anfrageQrTeilAnhaengen\(/);
  assert.match(merken, /anfrageJws/, 'auch eine unsignierte Anfrage käme auf die Seite');
  assert.match(funktion('anfrageQrTeilAnhaengen'), /kurzlinkQrDataUrl\(/, 'der QR-Code entsteht nicht mehr über kurzlinkQrDataUrl');
  assert.match(funktion('anfrageErzeugen'), /nachSichernAnfrageMerken\(umschlag, state\)/, 'Weg der Expertensicht meldet die Anfrage nicht');
  assert.match(funktion('anfrageAssistentErzeugenMitPaar'), /nachSichernAnfrageMerken\(umschlag, qrState\)/, 'Hauptweg meldet die Anfrage nicht');
});

test('[Nach dem Sichern · Grenze] die neue Seite berührt weder Passwort noch Schlüssel noch Signatur', () => {
  const code = ['nachSichernZeigen', 'nachSichernAbgleichen', 'nachSichernAnfrageRendern', 'nachSichernAnfrageMerken'].map(funktion).join('\n');
  assert.ok(code.length > 200, 'die Funktionen fehlen');
  assert.doesNotMatch(code, /passwort|Passwort|pw1|privJwk|signiere|Tresor|TRESOR|\.vdkey|baueAnfrageSigniert/);
});
