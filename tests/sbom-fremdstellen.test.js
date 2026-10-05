'use strict';
/* sbom-fremdstellen.test.js — eingebettete Fremdbestandteile stehen in SBOM, NOTICE und THIRD_PARTY_LICENSES (02.10.2026)
   ────────────────────────────────────────────────────────────────────────────
   Klassensuche nach dem Lucide-Befund: die Wortlisten (dys2p, EFF) und die IHE-Value-Sets for XDS standen in NOTICE
   und THIRD_PARTY_LICENSES, aber nicht in der SBOM; der xShare-Button stand in SBOM und NOTICE, nicht in
   THIRD_PARTY_LICENSES. Die HL7-Terminologie (elf Systeme, CC0) und IHE formatcode (CC BY 4.0) standen nirgends.
   tools/sbom-pflegen.js erzeugt die fehlenden Komponenten jetzt aus ihren Quellen und bricht ab, sobald ein
   HL7-Codesystem ohne Lizenzbeleg in den Kern kommt.
   ROT-BEWEISE: ein neues HL7-System im Kern bricht die Erzeugung ab; fehlt der Terminologie-Block, bricht sie ab;
   eine leere Wortliste bricht ab. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const S = require('../tools/sbom-pflegen.js');

const REPO = path.join(__dirname, '..');
const lies = (f) => fs.readFileSync(path.join(REPO, f), 'utf8');
const SBOM = JSON.parse(lies('vivodepot.sbom.cdx.json'));
const KERN = lies('vivodepot.html');
const komponente = (name) => SBOM.components.find((c) => c.name === name);
const lizenz = (k) => k.licenses.map((l) => (l.license && l.license.id) || l.expression).join('|');

test('[SBOM·Fremdstellen] Wortlisten, IHE-Value-Sets, HL7-Terminologie und IHE formatcode stehen in der SBOM, mit Hash und Lizenz', () => {
  const soll = { 'wortliste-de-dys2p': 'CC0-1.0', 'wortliste-en-eff': 'CC-BY-4.0', 'terminologie-ihe-xds-value-sets': 'CC-BY-4.0',
    'terminologie-hl7-tho': 'CC0-1.0', 'terminologie-ihe-formatcode': 'CC-BY-4.0', 'terminologie-kbv-nfd-runaway-risk': 'Apache-2.0' };
  for (const [name, id] of Object.entries(soll)) {
    const k = komponente(name);
    assert.ok(k, name + ' fehlt in der SBOM');
    assert.equal(lizenz(k), id, name);
    assert.deepEqual(k.hashes.map((h) => h.alg), ['SHA-256', 'SHA-512'], name);
  }
  const systeme = komponente('terminologie-hl7-tho').properties.filter((p) => p.name === 'vivodepot:codesystem').map((p) => p.value.split('/').pop());
  assert.deepEqual(systeme.sort(), [...S.HL7_THO_CC0].sort());
  assert.ok(!systeme.includes('iso-21089-lifecycle'), 'iso-21089-lifecycle ist offen, nicht CC0');
});

test('[SBOM·Fremdstellen] jedes HL7-System im Kern ist belegt (CC0) oder steht als offen', () => {
  const genutzt = [...S.hl7SystemeImKern(KERN).keys()];
  assert.ok(genutzt.length >= 12, 'Positivkontrolle: der Kern nennt die HL7-Systeme');
  for (const id of genutzt) assert.ok(S.HL7_THO_CC0.includes(id) || S.HL7_THO_OFFEN.includes(id), id);
});

test('[SBOM·Fremdstellen] NOTICE nennt IHE formatcode und THO, THIRD_PARTY_LICENSES nennt den xShare-Button', () => {
  const notice = lies('NOTICE.md');
  const tpl = lies('THIRD_PARTY_LICENSES');
  assert.match(notice, /Copyright © 2015 IHE International, Inc\., lizenziert unter der Creative Commons Attribution 4\.0/);
  assert.match(notice, /made available under the CC0 designation/);
  assert.match(notice, /EFF Short Wordlist 1[\s\S]{0,300}CC BY 4\.0/);
  assert.match(tpl, /xShare Yellow Button — Visual Identity Kit/);
  assert.match(tpl, /IHE formatcode — ein Code/);
});

test('[SBOM·Fremdstellen·Rot-Beweis] ein neues HL7-System ohne Lizenzbeleg bricht die Erzeugung ab', () => {
  const bisherig = SBOM;
  const neu = KERN.replace('</body>', "<script>const x = { system: 'http://terminology.hl7.org/CodeSystem/v3-ActCode', code: 'X' };</script></body>");
  assert.throws(() => S.erzeugeSBOM(neu, bisherig, REPO), /HL7-Codesystem ohne Lizenzbeleg im Kern: v3-ActCode/);
  assert.doesNotThrow(() => S.erzeugeSBOM(KERN, bisherig, REPO), 'Gegenprobe: der echte Kern erzeugt');
});

test('[SBOM·Fremdstellen·Rot-Beweis] ohne Terminologie-Block oder mit leerer Wortliste bricht die Erzeugung ab', () => {
  const ohneBlock = KERN.replace('<!-- @vd-terminologie isik -->', '<!-- entfernt -->');
  assert.throws(() => S.erzeugeSBOM(ohneBlock, SBOM, REPO), /@vd-terminologie isik/);
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'vd-sbom-fremd-'));
  try {
    fs.mkdirSync(path.join(tmp, 'tools'));
    const modul = JSON.parse(lies('tools/textsatz-de-modul.json'));
    modul.texte['strings:passwortWortliste.text'] = ' ';
    fs.writeFileSync(path.join(tmp, 'tools', 'textsatz-de-modul.json'), JSON.stringify(modul));
    assert.throws(() => S.wortlisteAusModul('de', tmp), /passwortWortliste\.text fehlt/);
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
});
