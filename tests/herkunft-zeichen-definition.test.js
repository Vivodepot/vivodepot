'use strict';
/* Herkunft A2 (Entscheidung 13.11.2026, präzisiert 17.11.2026): eigene Angaben tragen am Feld kein Zeichen, keine Zeile und keinen
   Satz. Eingelesenes trägt EIN Zeichen und dahinter die Stelle im Wort; Dokument, wer bestätigt hat, und Datum stehen beim Antippen.
   Das Zeichen ist ein Eintrag der Gestaltungsdefinition (--zeichen-herkunft-eingelesen, U2-ADR-525). In der Prüftermine-Zeile trägt
   eine selbst eingetragene Frist keinen Zusatz mehr; ihre Herkunft bleibt im Stempel (Entscheidung 18.08.2026 „mitgeführt“). */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { ladeKern } = require('./load-kern.js');
const GD = require('../tools/gestaltung-definition.js');

const WURZEL = path.join(__dirname, '..');
const DEF = JSON.parse(fs.readFileSync(path.join(WURZEL, 'tools', 'erscheinung', 'definition.json'), 'utf8'));
const GRUNDLAGE = fs.readFileSync(path.join(WURZEL, 'tools', 'erscheinung', 'stil', 'grundlage.css'), 'utf8');

function einleseStempel(V, sektor, feld, stelle, quelle) {
  const d = V.getData();
  d.urheberschaft = d.urheberschaft || {};
  d.urheberschaft[sektor] = d.urheberschaft[sektor] || {};
  d.urheberschaft[sektor][feld] = [{ zeitpunkt: '2026-11-10T09:00:00Z', eingabeArt: 'import', quelle,
    ...(stelle ? { bestaetigtVon: { anbieterId: 'probe', anbieterName: stelle } } : {}) }];
  V.setData(d);
}

test('[Herkunft·A2·Definition] das Zeichen steht als Eintrag in der Definition und als Token im Block der Stilquelle', () => {
  const z = (DEF.grundwerte.zeichen || []).find((e) => e.token === '--zeichen-herkunft-eingelesen');
  assert.ok(z, 'Eintrag --zeichen-herkunft-eingelesen');
  assert.deepEqual(GD.definitionPruefen(DEF), []);
  assert.ok(GRUNDLAGE.includes('--zeichen-herkunft-eingelesen: ' + GD.zeichenDataUrl(z.svg) + ';'), 'Token im erzeugten Block');
  const { src } = ladeKern();
  const schutz = src.slice(src.indexOf('<style id="schutz-stil">'), src.indexOf('</style>', src.indexOf('<style id="schutz-stil">')));
  assert.match(schutz, /\.herkunft-zeichen \{[^}]*mask: var\(--zeichen-herkunft-eingelesen\)/, 'die Regel steht im geschützten Stil des Kerns');
  assert.doesNotMatch(GRUNDLAGE, /\.herkunft-zeichen\s*\{/, 'kein Erscheinungsbild gestaltet das Herkunftszeichen');
});

test('[Herkunft·A2·Definition·Rot-Beweis] ein Zeichen mit Skript, Ereignis oder Verweis fiele auf', () => {
  const gut = DEF.grundwerte.zeichen[0].svg;
  assert.deepEqual(GD.zeichenSvgPruefen('--zeichen-x', gut), []);
  assert.equal(GD.zeichenSvgPruefen('--zeichen-x', gut.replace('<path', '<script>x</script><path')).length, 1);
  assert.equal(GD.zeichenSvgPruefen('--zeichen-x', gut.replace('<path', '<path onload="x()"')).length, 1);
  assert.equal(GD.zeichenSvgPruefen('--zeichen-x', gut.replace('<path', '<use href="#a"/><path')).length, 1);
  assert.equal(GD.zeichenSvgPruefen('--zeichen-x', '<b>kein svg</b>').length, 1);
});

test('[Herkunft·A2] Eingelesenes: ein Zeichen und die Stelle im Wort, Dokument und Datum beim Antippen; Eigenes still', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen('herkunft-a2-probe');
  V.akteurSelbstErklaeren('Maria');
  V.sektorFeldSetzen('health', 'bloodType', 'A+');
  assert.equal(V.urheberschaftZeileHTML('health', 'bloodType'), '', 'eigene Angabe: kein Zeichen, keine Zeile');
  einleseStempel(V, 'health', 'insuranceNumber', 'AOK Bayern', 'Versichertenkarte');
  const html = V.urheberschaftZeileHTML('health', 'insuranceNumber');
  const summary = (/<summary>([\s\S]*?)<\/summary>/.exec(html) || [])[1] || '';
  assert.equal((summary.match(/class="herkunft-zeichen"/g) || []).length, 1, 'genau ein Zeichen: ' + html);
  assert.match(summary, /role="img" aria-label="[^"]+"/, 'Zeichen mit Textalternative');
  assert.ok(summary.endsWith('AOK Bayern'), 'die Stelle im Wort hinter dem Zeichen');
  const detail = (/<span class="herkunft-detail">([\s\S]*?)<\/span>/.exec(html) || [])[1] || '';
  assert.ok(detail.includes(V.STRINGS.urheberBestaetigtVon + ' AOK Bayern') && /\d{2}\.\d{2}\.\d{2}/.test(detail), 'Detail: ' + detail);
  einleseStempel(V, 'health', 'healthInsurance', null, 'Versichertenkarte');
  assert.ok(/<\/span>Versichertenkarte<\/summary>/.test(V.urheberschaftZeileHTML('health', 'healthInsurance')), 'ohne Stelle: die Quelle');
});

test('[Herkunft·A2·Rot-Beweis] ein Zeichen an eigener Angabe oder ein zweites Zeichen fiele auf', () => {
  const { src } = ladeKern();
  const koerper = src.slice(src.indexOf('\nfunction urheberschaftZeileHTML('), src.indexOf('\n}\n', src.indexOf('\nfunction urheberschaftZeileHTML(')));
  assert.match(koerper, /if \(!abweichend\) return '';/, 'eigene Eingabe kehrt still zurück');
  assert.equal((koerper.match(/class="herkunft-zeichen"/g) || []).length, 1, 'genau eine Stelle setzt das Zeichen');
  const kaputt = koerper.replace("if (!abweichend) return '';", 'if (!abweichend) return zeichen;');
  assert.notEqual(kaputt, koerper);
  assert.doesNotMatch(kaputt, /if \(!abweichend\) return '';/);
});

test('[Herkunft·A2·Frist] eigene Frist ohne Zusatz, Stempel bleibt; eingelesene Frist mit Zeichen und Stelle', async () => {
  const { V } = ladeKern();
  V.setData(V.leeresDepot());
  await V.akteurSelbstErklaeren('Testerin');
  V.feldGueltigkeitSetzen('identity', 'ausweis_gueltig', null, '2027-09-30');
  const kette = V.liesUrheberschaft('identity', 'gueltigkeit:ausweis_gueltig');
  assert.equal(kette.length, 1, 'der Stempel der eigenen Frist bleibt in den Daten');
  assert.equal(V.feldGueltigkeitHerkunft('identity', 'ausweis_gueltig').selbst, true);
  const d = V.getData();
  d.feldGueltigkeit.mobility = { passportValidUntil: { bis: '2027-09-30' } };
  V.setData(d);
  einleseStempel(V, 'mobility', 'passportValidUntil', 'Bürgeramt Mitte', 'Reisepass');
  const html = V.prueftermineSektionHTML();
  assert.ok(!html.includes('von Ihnen eingetragen') && !html.includes('entered by you'), 'kein Zusatz an der eigenen Frist');
  assert.equal((html.match(/class="herkunft-zeichen"/g) || []).length, 1, 'genau die eingelesene Frist trägt das Zeichen');
  assert.ok(html.includes('</span>Bürgeramt Mitte</span>'), 'und die Stelle im Wort');
});
