'use strict';
/* Rot-Beweis: je Richtung im Helfer (gleichlaufProben, Test „·Rot-Beweis“) an einem verfälschten Schema. */
/* Gleichlauf docs/bereich-modul/bereich-modul-schema.json ↔ bereichsModulPruefen.
   Regeln und Begründung: tests/mit-modul/helfer/modul-schema-gleichlauf.js.

   Echte Positivfälle: die sechs Pro-Bereichs-Templates aus tools/bereich-templates/ (Kennungen,
   die das Produkt nicht selbst führt, Rubriken aus dem Textsatz) und ein Ab-Werk-Bereich des
   Kerns (AB_WERK_BEREICH_QUELLEN) unter fremder Kennung mit Inline-Rubrik. Unverändert fällt der
   Ab-Werk-Bereich über den Einlassweg als `reserviert` — das ist der nur-Kern-Fall unten. */
const fs = require('node:fs');
const path = require('node:path');
const { gleichlaufProben } = require('./helfer/modul-schema-gleichlauf.js');
const { ladeKern } = require('../load-kern.js');

const kopie = (x) => JSON.parse(JSON.stringify(x));
const TEMPLATES = path.join(__dirname, '..', '..', 'tools', 'bereich-templates');
const PRO = fs.readdirSync(TEMPLATES).filter((f) => /^vivodepot-pro-.*\.json$/.test(f)).sort();
const proModul = (f) => JSON.parse(fs.readFileSync(path.join(TEMPLATES, f), 'utf8'));

const ABWERK = kopie(ladeKern().V.AB_WERK_BEREICH_QUELLEN.find((m) => m.bereiche && m.bereiche.administration));
const abWerkUmbenannt = (() => {
  const m = kopie(ABWERK);
  m.bereiche = { 'probe-verwaltung': { ...m.bereiche.administration, id: 'probe-verwaltung', label: 'Verwaltung (Probe)' } };
  m.kennung = 'probe/verwaltung';
  return m;
})();

const basis = { modulTyp: 'bereich', moduleVersion: 1, herkunft: 'probe', sprache: 'de', bereiche: { zzprobe: { label: 'Probe' } } };
const mit = (x) => ({ ...basis, ...x });
const ohne = (k) => { const m = { ...basis }; delete m[k]; return m; };
const bereich = (x) => mit({ bereiche: { zzprobe: { label: 'Probe', ...x } } });

gleichlaufProben({
  typ: 'bereich',
  positiv: [
    ...PRO.map((f) => [`Pro-Template ${f}`, proModul(f)]),
    ['Ab-Werk-Bereich unter fremder Kennung', abWerkUmbenannt],
    ['ohne modulTyp', ohne('modulTyp')],
    ['Kennung mit Großbuchstaben und Bindestrich', mit({ bereiche: { 'z-Z9': { label: 'x' } } })],
    ['Sprache mit Leerraum und Region', mit({ sprache: ' en-GB ' })],
    ['ohne Inline-Rubrik: Sprache ungeprüft', { moduleVersion: 1, herkunft: 'probe', bereiche: { 'pro-betrieb-zugaenge': { icon: 'lock' } } }],
    ['Zeichen < und & ohne Markup', bereich({ label: 'a < b & c', einfuehrungstext: 'x' })],
    ['voller Bereich', bereich({ icon: 'user', format: 'GENERISCH', navUnterzeile: 'u', merkmale: ['stellenRegister'],
      rollen: { stellenListe: 'institutionen', adresseFelder: ['a', 'b'] }, exporte: [{ format: 'fhir-ips', label: 'L' }],
      wizards: ['umzwiz'], wizardId: null, standardDokumente: [{ typ: 't' }], deckblatt: { fotoFeld: 'f' },
      cluster: 'meins', clusterTitel: 'Meins', clusterRang: 2,
      sektionen: [{ id: 's1', label: 'S', hint: 'h', felder: [{ id: 'f', typ: 'text', label: 'F' }] }, { id: 's2' }] })],
    ['mit Kennung, Fassung und Einlass-Marken', mit({ kennung: 'probe/a', fassung: 2, appVersion: 'v1', ungeprueft: true,
      eingelassenAm: '2026-09-26T00:00:00Z', anbieterId: 'a', anbieterIdGeprueft: false })],
  ],
  negativ: [
    ['kein Objekt', null, 'kein-objekt'],
    ['ohne moduleVersion', ohne('moduleVersion'), 'moduleVersion'],
    ['moduleVersion 0', mit({ moduleVersion: 0 }), 'moduleVersion'],
    ['moduleVersion 1.5', mit({ moduleVersion: 1.5 }), 'moduleVersion'],
    ['ohne herkunft', ohne('herkunft'), 'herkunft'],
    ['herkunft leer', mit({ herkunft: '  ' }), 'herkunft'],
    ['ohne bereiche', ohne('bereiche'), 'bereiche'],
    ['bereiche als Liste', mit({ bereiche: [{ label: 'x' }] }), 'bereiche'],
    ['bereiche als Text', mit({ bereiche: 'x' }), 'bereiche'],
    ['Inline-Rubrik ohne sprache', ohne('sprache'), 'sprache'],
    ['Inline-Rubrik, sprache leer', mit({ sprache: ' ' }), 'sprache'],
    ['Inline-Rubrik, sprache keine Zeichenkette', mit({ sprache: 5 }), 'sprache'],
    ['Inline-Rubrik, sprache großgeschrieben', mit({ sprache: 'DE' }), 'sprache-form'],
    ['Inline-Rubrik an einem verworfenen Bereich zählt mit', { ...ohne('sprache'), bereiche: { Zz: { label: 'x' } } }, 'sprache'],
    ['bereiche leer', mit({ bereiche: {} }), 'leer'],
    ['Bereich null', mit({ bereiche: { zzprobe: null } }), 'leer'],
    ['Bereichs-Kennung großgeschrieben', mit({ bereiche: { Zz: { label: 'x' } } }), 'leer'],
    ['Bereichs-Kennung zu kurz', mit({ bereiche: { z: { label: 'x' } } }), 'leer'],
    ['Markup in der Rubrik', bereich({ label: '<b>x</b>' }), 'leer'],
    ['Anführungszeichen in der Rubrik', bereich({ label: 'a"b' }), 'leer'],
    ['Zeichenreferenz in der Rubrik', bereich({ label: 'a &amp; b' }), 'leer'],
    ['Markup tief in einem Feld', bereich({ sektionen: [{ id: 's', felder: [{ id: 'f', label: '<i>x</i>' }] }] }), 'leer'],
  ],
  nurKern: {
    leer: 'Ob eine Bereichs-Kennung dem Produkt gehört (reserviert) und ob der Textsatz eine Rubrik `<id>.label` für einen Bereich ohne Inline-Rubrik kennt, hängt am laufenden Bestand (Sektoren des Produkts, geladener Textsatz) — das Schema kennt beides nicht. Bleibt so kein Bereich übrig, lehnt der Kern mit `leer` ab.',
  },
  nurKernFaelle: [
    ['Ab-Werk-Modul unverändert: Kennung reserviert', kopie(ABWERK), 'leer'],
    ['eingebaute Kennung mit Rubrik', mit({ bereiche: { identity: { label: 'x' } } }), 'leer'],
    ['fremde Kennung ohne Rubrik, Textsatz kennt sie nicht', { moduleVersion: 1, herkunft: 'probe', bereiche: { zzprobe: {} } }, 'leer'],
    ['leere Inline-Rubrik, Textsatz kennt die Kennung nicht', { moduleVersion: 1, herkunft: 'probe', bereiche: { zzprobe: { label: '  ' } } }, 'leer'],
  ],
});
