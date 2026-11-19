'use strict';
/* Studio-Arbeitsfläche wie im Vorgabe-Dummy vom 14.11.2026, auf allen Breiten: eine Kopfzeile mit „‹ Studio“ und „Vorlage sichern“
   als einzigem Hauptknopf. Der Schalter „Bearbeiten | Vorschau“ und das Wegband stehen unter den Reitern, „Entwurf sichern“ und
   „Fertigstellen und einreichen“ unter der Vorlage; die Statuszeile erscheint kurz als Meldung unten und bleibt
   eine aria-live-Region (role=status). Am Telefon bricht
   „Vorlage sichern“ nicht um, und die Knöpfe unter der Vorlage messen mindestens 44 px.
   Geprüft am Text von vivodepot-studio.html; das Bild im Browser liefern die Rundgang-Ansichten studio:flaeche und studio:telefon.
   ROT-BEWEIS: der letzte Test pflanzt einen zweiten Hauptknopf, einen Einreichen-Link und den Schalter zurück in den Kopf und
   eine feste Schriftgröße in den Telefon-Block und nimmt der Meldung die aria-live-Region. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const HTML = fs.readFileSync(path.join(__dirname, '..', 'vivodepot-studio.html'), 'utf8');

function telefonBlock(html) {
  const von = html.indexOf('@media (max-width: 760px) {');
  if (von < 0) return '';
  let tiefe = 0;
  for (let i = html.indexOf('{', von); i < html.length; i++) {
    if (html[i] === '{') tiefe++;
    else if (html[i] === '}' && --tiefe === 0) return html.slice(von, i + 1);
  }
  return '';
}
function bauLeiste(html) {
  const von = html.indexOf('<div class="bau-leiste">');
  const bis = html.indexOf('<section class="nach-sichern"', von);
  return von < 0 || bis < 0 ? '' : html.slice(von, bis);
}
function abschnitt(html, anfang, ende) {
  const von = html.indexOf(anfang);
  const bis = html.indexOf(ende, von);
  return von < 0 || bis < 0 ? '' : html.slice(von, bis);
}

function befunde(html) {
  const t = telefonBlock(html), k = bauLeiste(html), f = [];
  const haupt = (k.match(/class="haupt-knopf"[^>]*id="([^"]+)"/g) || []).map((m) => m.match(/id="([^"]+)"/)[1]);
  /* #blatt-fertig gehört zum Blatt-Modus und steht sonst nicht; außerhalb davon ist #vorlage-sichern der einzige Hauptknopf. */
  if (haupt.filter((id) => id !== 'blatt-fertig').join() !== 'vorlage-sichern') f.push('Hauptknöpfe im Kopf: ' + haupt.join(', '));
  for (const id of ['entwurf-sichern', 'fertig-oeffnen', 'ansicht-bauen', 'wb-angaben']) if (k.includes('id="' + id + '"')) f.push('im Kopf: ' + id);
  if (!/\n {2}\.bau-ort \{ display: none; \}/.test(html)) f.push('Name der Vorlage steht im Kopf');
  const reiter = abschnitt(html, 'id="reiter-wortlaut"', 'id="tafel-felder"');
  if (!/class="ansicht-zeile"[\s\S]*id="ansicht-bauen"/.test(reiter)) f.push('der Schalter steht nicht unter den Reitern');
  if (/class="weg-band"/.test(html.slice(html.indexOf('<div id="raum-bau"')))) f.push('das Weg-Band steht wieder in der Arbeitsfläche (Dummy 14.11.2026)');
  const unten = abschnitt(html, '<div class="vorlage-unten">', '<aside class="eigenschaften"');
  if (!/id="entwurf-sichern"/.test(unten) || !/id="fertig-oeffnen"/.test(unten)) f.push('Entwurf oder Einreichen fehlt unter der Vorlage');
  if (html.indexOf('id="tafel-wortlaut"') > html.indexOf('<div class="vorlage-unten">')) f.push('Knöpfe unter der Vorlage stehen in einer Reiter-Tafel');
  if (!/\n {2}\.bau-links > \.status-chip \{ position: fixed;[^}]*opacity: 0;/.test(html) || !/\n {2}\.bau-links > \.status-chip\.toast-an \{ opacity: 1; \}/.test(html)) f.push('Statuszeile nicht als Meldung');
  if (!/<span class="status-chip" id="bau-status" role="status" aria-live="polite"><\/span>/.test(k)) f.push('Meldung steht nicht in einer aria-live-Region');
  if (!/function statusAlsMeldung\(\)/.test(html) || !/\n {2}statusAlsMeldung\(\);\n/.test(html) || /matchMedia\('\(max-width: 760px\)'\)\.matches \|\| !chip/.test(html)) f.push('Meldung nicht auf allen Breiten');
  if (!/\.bau-rechts \.haupt-knopf \{ white-space: nowrap; min-height: 44px; \}/.test(t)) f.push('Vorlage sichern bricht um oder ist unter 44 px');
  if (!/\.vorlage-unten > button \{ min-height: 44px; \}/.test(t)) f.push('Knöpfe unter der Vorlage am Telefon unter 44 px');
  if (/font-size: \d+px/.test(t.slice(t.indexOf('Telefon wie im Vorgabe-Dummy')))) f.push('feste Schriftgröße statt Leiter');
  return f;
}

test('[Studio·Kopf] eine Kopfzeile mit einem Hauptknopf, Schalter und Wegband unter den Reitern, Entwurf und Einreichen unter der Vorlage', () => {
  assert.deepEqual(befunde(HTML), []);
});

test('[Studio·Kopf·Rot-Beweis] ein zweiter Hauptknopf, ein Einreichen-Link oder der Schalter im Kopf, eine feste Schriftgröße und eine Meldung ohne aria-live werden rot', () => {
  const kopfRechts = '<button type="button" class="haupt-knopf" id="vorlage-sichern"';
  assert.ok(HTML.includes(kopfRechts), 'Vorbedingung: Vorlage sichern im Kopf');
  const zweiter = HTML.replace(kopfRechts, '<button type="button" class="haupt-knopf" id="entwurf-x">x</button>' + kopfRechts);
  assert.ok(befunde(zweiter).some((b) => b.startsWith('Hauptknöpfe im Kopf')));
  const link = HTML.replace(kopfRechts, '<button type="button" id="fertig-oeffnen" class="link-knopf">x</button>' + kopfRechts);
  assert.ok(befunde(link).includes('im Kopf: fertig-oeffnen'));
  const schalter = HTML.replace(kopfRechts, '<button type="button" id="ansicht-bauen">x</button>' + kopfRechts);
  assert.ok(befunde(schalter).includes('im Kopf: ansicht-bauen'));
  const stumm = HTML.replace('id="bau-status" role="status" aria-live="polite"', 'id="bau-status"');
  assert.notEqual(stumm, HTML, 'Vorbedingung: die Mutation greift');
  assert.ok(befunde(stumm).includes('Meldung steht nicht in einer aria-live-Region'));
  const fest = HTML.replace('.weg-band ol { gap: 4px; }', '.weg-band ol { gap: 4px; font-size: 13px; }');
  assert.notEqual(fest, HTML, 'Vorbedingung: die Mutation greift');
  assert.ok(befunde(fest).includes('feste Schriftgröße statt Leiter'));
});
