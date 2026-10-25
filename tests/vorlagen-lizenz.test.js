'use strict';
/* Lizenz der Vorlage (U2-ADR-514, Entscheidung 22.10.2026).
   Hält vier Dinge:
     · die geschlossene Liste steht an EINER Stelle (tools/vorlagen-lizenzen.json), Kern und Einreich-Schema spiegeln sie;
     · der Kern erkennt eine gültige Angabe und sagt bei fehlender oder unbekannter „nicht erkannt“;
     · die Angabe sperrt nie: validateTemplate weist wegen der Lizenz keine Vorlage ab (Register, kein Tor, U2-ADR-258);
     · die Import-Vorschau zeigt die Lizenz bzw. „nicht erkannt“ sichtbar an. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { ladeKern } = require('./load-kern.js');

const WURZEL = path.join(__dirname, '..');
const LISTE = JSON.parse(fs.readFileSync(path.join(WURZEL, 'tools', 'vorlagen-lizenzen.json'), 'utf8')).lizenzen.map((l) => l.spdx);
const SCHEMA = JSON.parse(fs.readFileSync(path.join(WURZEL, 'docs', 'template-generator', 'submission-schema.json'), 'utf8'));
const schemaLizenz = (s) => s.properties.templates.items.properties.lizenz;
const TPL = Object.freeze({ felder: [{ feldname: 'Name', feldtyp: 'text' }] });
const mit = (lizenz) => Object.assign({}, TPL, { lizenz });

/* Gleichheit als Menge UND Reihenfolge: das Studio zeigt die Liste in dieser Reihenfolge an. */
const abweichung = (a, b) => (JSON.stringify(a) === JSON.stringify(b) ? null : JSON.stringify(a) + ' ≠ ' + JSON.stringify(b));

test('[Vorlagen-Lizenz·eine Liste] Kern und Einreich-Schema führen dieselbe Liste wie tools/vorlagen-lizenzen.json', () => {
  const { V } = ladeKern();
  assert.ok(Array.isArray(V.VORLAGEN_LIZENZEN), 'Vorbedingung: VORLAGEN_LIZENZEN steht im Kern');
  assert.equal(abweichung([...V.VORLAGEN_LIZENZEN], LISTE), null, 'Kern');
  assert.equal(abweichung(schemaLizenz(SCHEMA).properties.spdx.enum, LISTE), null, 'Schema');
  assert.deepEqual(schemaLizenz(SCHEMA).required, ['spdx', 'rechteinhaber']);
});
test('[Vorlagen-Lizenz·eine Liste·Rot-Beweis] eine Kennung mehr im Schema als in der Liste fällt auf', () => {
  const s = JSON.parse(JSON.stringify(SCHEMA));
  schemaLizenz(s).properties.spdx.enum.push('CC-BY-NC-4.0');
  assert.notEqual(abweichung(schemaLizenz(s).properties.spdx.enum, LISTE), null);
});

test('[Vorlagen-Lizenz·Angabe] eine Kennung aus der Liste mit Rechteinhaber ist erkannt', () => {
  const { V } = ladeKern();
  for (const spdx of LISTE) {
    const a = V.vorlageLizenzAngabe(mit({ spdx, rechteinhaber: '  Beispielverband  ' }));
    assert.equal(a.erkannt, true, spdx);
    assert.equal(a.spdx, spdx);
    assert.equal(a.rechteinhaber, 'Beispielverband');
  }
});
test('[Vorlagen-Lizenz·Angabe·Rot-Beweis] fehlend, unbekannt, ohne Rechteinhaber oder falsch geformt ist nicht erkannt', () => {
  const { V } = ladeKern();
  const faelle = {
    fehlt: TPL,
    unbekannteKennung: mit({ spdx: 'CC-BY-NC-4.0', rechteinhaber: 'Beispielverband' }),
    ohneRechteinhaber: mit({ spdx: 'CC0-1.0' }),
    leererRechteinhaber: mit({ spdx: 'CC0-1.0', rechteinhaber: '   ' }),
    zuLang: mit({ spdx: 'CC0-1.0', rechteinhaber: 'x'.repeat(201) }),
    alsText: mit('CC0-1.0'),
    alsListe: mit(['CC0-1.0']),
  };
  for (const [name, tpl] of Object.entries(faelle)) assert.equal(V.vorlageLizenzAngabe(tpl).erkannt, false, name);
});

test('[Vorlagen-Lizenz·kein Tor] validateTemplate weist wegen der Lizenz keine Vorlage ab', () => {
  const { V } = ladeKern();
  for (const tpl of [TPL, mit({ spdx: 'CC-BY-NC-4.0', rechteinhaber: 'X' }), mit('frei'), mit({ spdx: 'CC0-1.0', rechteinhaber: 'X' })]) {
    assert.equal(V.validateTemplate(tpl), null, JSON.stringify(tpl.lizenz));
  }
});

/* Die Vorschau: flowImportVorschau öffnet den echten Dialog; gelesen wird sein Inhalt (#modal-inhalt), wie die Bürgerin ihn sieht. */
const vorschau = (vorlageLizenz) => {
  const { V, document } = ladeKern();
  assert.equal(typeof V.flowImportVorschau, 'function', 'Vorbedingung: flowImportVorschau steht im Kern');
  V.flowImportVorschau({ quelleLabel: 'Probe', zeilen: [{ status: 'neu', label: 'Name', neuText: 'Maria' }], listen: [], register: [], feldDefinitionen: [{ label: 'Name' }], verworfeneFelder: [], vorlageLizenz });
  const box = document.getElementById('modal-inhalt');
  assert.ok(box, 'Vorbedingung: der Dialog ist offen');
  return { html: String(box.innerHTML), V };
};
test('[Vorlagen-Lizenz·Vorschau] erkannt nennt Kennung und Rechteinhaber, nicht erkannt sagt es sichtbar', () => {
  const gut = vorschau({ erkannt: true, spdx: 'CC-BY-4.0', rechteinhaber: 'Beispielverband' }).html;
  assert.match(gut, /id="import-vorlage-lizenz"[^>]*>[^<]*CC-BY-4\.0[^<]*Beispielverband/);
  const { html: nicht, V } = vorschau({ erkannt: false });
  assert.match(nicht, /class="export-uebersicht-zurueck" id="import-vorlage-lizenz"/);
  assert.ok(nicht.includes(V.STRINGS.vorlageLizenzNichtErkannt), 'der Satz aus dem Textsatz steht da');
});
test('[Vorlagen-Lizenz·Vorschau·Rot-Beweis] ohne Angabe im Plan steht keine Lizenzzeile da', () => {
  const { html } = vorschau(undefined);
  assert.ok(html.includes('Maria'), 'Vorbedingung: der Dialog trägt die Vorschau');
  assert.equal(html.includes('import-vorlage-lizenz'), false);
});

test('[Vorlagen-Lizenz·Textsatz] beide Sätze stehen deutsch und englisch, der erkannte mit beiden Platzhaltern', () => {
  for (const datei of ['textsatz-de-modul.json', 'textsatz-en-modul.json']) {
    const texte = JSON.parse(fs.readFileSync(path.join(WURZEL, 'tools', datei), 'utf8')).texte;
    const erkannt = String(texte['strings:vorlageLizenz.text'] || '');
    assert.ok(erkannt.includes('{kennung}') && erkannt.includes('{rechteinhaber}'), datei);
    assert.ok(String(texte['strings:vorlageLizenzNichtErkannt.text'] || '').length > 20, datei);
  }
});
