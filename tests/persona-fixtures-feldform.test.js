'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   persona-fixtures-feldform.test.js — Klassenwächter (Auftrag, 23.09.2026,
   Durchklick-Abnahme): jede persona-p*.js-Fixture muss für jedes gesetzte Feld die
   FORM tragen, die der Feldkatalog für dessen Typ verlangt — insbesondere die
   Unterscheidung `ref` (bares Objekt `{ref:…}`/`{override:…}` oder String) gegen
   `refMehrfach` (Array solcher Objekte).

   FUND, DER DIESEN WÄCHTER AUSLÖSTE: mindestens 10 der 20 Personas (P1, P2, P4,
   P6, P7, P8, P10, P11, P12, P15, P17) setzten `generalPractitioner`/
   `healthInsurance` (beide Katalogtyp `ref`, tools/bereich-templates/
   vivodepot-health.json) als Array — `ref(x) => [{ref:…}]`, kopiert aus einem
   Muster, das eigentlich für `refMehrfach`-Felder gedacht war. `feldValidieren()`
   (vivodepot.html, `case 'ref':`) erwartet ein bares Objekt; mit dem Array bestand
   `typeof wert === 'object'`, aber `wert.ref`/`wert.override` sind auf einem Array
   `undefined` — die Notfallkarte-Erzeugung zeigte darum bei jeder betroffenen
   Persona einen „Unstimmigkeits"-Dialog vor dem PDF. P3 zeigt die RICHTIGE Form
   (`generalPractitioner: { ref: p.hausarzt }`) als Vorbild.

   GEGENPROBE VOR DIESEM WÄCHTER (Auflage): geprüft, ob irgendein
   Schreibweg des KERNS selbst (Formular-Sammlung, `_listeOder`, Import, Migration)
   eine Array-Form für ein `ref`-Feld erzeugen kann — `grep` nach `[{ ref`/
   `[{ override` im Kern zeigt an JEDER Stelle eine EXPLIZITE Verzweigung nach
   `typ === 'refMehrfach'` (vivodepot.html:17293, 30496, 53219-53222) — kein Weg
   erzeugt die falsche Form für ein einfaches `ref`-Feld. Der Fund ist darum
   AUSSCHLIESSLICH in den Fixtures, kein Produktbefund.

   GRENZE DIESES WÄCHTERS: `feldValidieren()` selbst ist NICHT auf dem
   `window.__vdOeffentlich`-Kanal exportiert (nur über Kern-interne Closures
   erreichbar) — dieser Wächter prüft darum die FORM-REGEL direkt gegen den
   Feldkatalog (ref = kein Array, refMehrfach = Array), nicht die volle
   `feldValidieren`-Logik (Datum-Plausibilität, Zahlenbereiche, etc.). Das deckt
   genau die hier gefundene Fehlerklasse, keine andere.
   ════════════════════════════════════════════════════════════════════════════ */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { ladeKern } = require('./load-kern.js');

const REPO = path.join(__dirname, '..');
const TEMPLATE_ORDNER = path.join(REPO, 'tools', 'bereich-templates');
const FIXTURES_ORDNER = path.join(__dirname, 'fixtures');

/* Flacher Katalog { "sektorId.feldId": typ } — aus ALLEN bereich-templates/*.json gebaut,
   Pro-Bereiche eingeschlossen (schadet nicht, keine Persona-Fixture setzt sie). */
function feldTypKatalogBauen() {
  const katalog = new Map();
  for (const datei of fs.readdirSync(TEMPLATE_ORDNER).filter((d) => d.endsWith('.json'))) {
    const inhalt = JSON.parse(fs.readFileSync(path.join(TEMPLATE_ORDNER, datei), 'utf8'));
    const bereiche = inhalt.bereiche || {};
    for (const sektorId of Object.keys(bereiche)) {
      const sektionen = bereiche[sektorId].sektionen || [];
      for (const sek of sektionen) {
        for (const f of (sek.felder || [])) {
          katalog.set(sektorId + '.' + f.id, f.typ);
          // Listen-Unterfelder ebenfalls, mit demselben Schlüsselmuster (feldId für die
          // Fixture-Prüfung reicht der TOP-Level-Zugriffspfad, Unterfelder werden separat
          // ausgewertet, falls eine Fixture sie direkt als Top-Level-Wert setzt — unwahrscheinlich,
          // aber billig mit abzudecken).
          for (const uf of (f.unterFelder || [])) katalog.set(sektorId + '.' + uf.id, uf.typ);
        }
      }
    }
  }
  return katalog;
}

/* Reine Form-Regel, KEIN voller feldValidieren()-Nachbau (s. Kopfkommentar „Grenze"). */
function formPasstZuTyp(typ, wert) {
  if (typ === 'ref') return !Array.isArray(wert);
  if (typ === 'refMehrfach') return Array.isArray(wert);
  return true;   // andere Typen sind nicht Gegenstand dieses Wächters
}

function allePersonaKennungen() {
  return fs.readdirSync(FIXTURES_ORDNER)
    .map((f) => /^persona-(p[0-9]+)\.js$/.exec(f))
    .filter(Boolean)
    .map((m) => m[1].toUpperCase())
    .sort((a, b) => Number(a.slice(1)) - Number(b.slice(1)));
}

/* Baut EINE Persona in einem frischen Node-Kern und liefert deren gesetzte Sektor-Felder
   (rein, für die Rot-Beweis-Probe unten mit einem fingierten Katalog wiederverwendbar). */
async function personaFeldWerte(personaId) {
  const { V } = ladeKern({ kennungsPruefungAus: true });
  const Fixture = require(path.join(FIXTURES_ORDNER, 'persona-' + personaId.toLowerCase() + '.js'));
  await Fixture.baueDepot(V);
  return V.ankerDaten().sektoren;
}

/* Reine Prüf-Funktion (Katalog + Sektor-Werte → Fundliste), für den Rot-Beweis ohne Kern-Ladung. */
function formFundeFuer(katalog, sektorenDaten) {
  const funde = [];
  for (const sektorId of Object.keys(sektorenDaten || {})) {
    const sektor = sektorenDaten[sektorId] || {};
    for (const feldId of Object.keys(sektor)) {
      const typ = katalog.get(sektorId + '.' + feldId);
      if (!typ) continue;   // kein Katalog-Feld dieses Namens (z. B. interne Verwaltungsfelder) — nicht Gegenstand
      const wert = sektor[feldId];
      if (wert == null || wert === '') continue;
      if (!formPasstZuTyp(typ, wert)) funde.push({ sektorId, feldId, typ, wert });
    }
  }
  return funde;
}

test('[Persona-Fixturen·Feldform] jede gesetzte ref/refMehrfach-Form passt zum Katalogtyp, für alle 20 Personas', async () => {
  const katalog = feldTypKatalogBauen();
  const alleFunde = [];
  for (const personaId of allePersonaKennungen()) {
    const sektoren = await personaFeldWerte(personaId);
    const funde = formFundeFuer(katalog, sektoren);
    for (const f of funde) alleFunde.push({ personaId, ...f });
  }
  assert.deepEqual(alleFunde, [],
    'Falsche Feld-Form (ref als Array oder refMehrfach ohne Array):\n'
    + alleFunde.map((f) => f.personaId + ': ' + f.sektorId + '.' + f.feldId + ' (typ ' + f.typ + ') = ' + JSON.stringify(f.wert)).join('\n'));
});

test('[Persona-Fixturen·Feldform·Rot-Beweis] eine alte Array-Form für ein ref-Feld wird erkannt', () => {
  const katalog = new Map([['health.generalPractitioner', 'ref'], ['health.emergencyContacts', 'refMehrfach']]);
  const alt = { health: { generalPractitioner: [{ ref: 'p1' }] } };   // die frühere, falsche P1-Form
  const funde = formFundeFuer(katalog, alt);
  assert.equal(funde.length, 1, 'die Array-Hülle um ein ref-Feld muss als Fund erscheinen');
  assert.equal(funde[0].feldId, 'generalPractitioner');

  const richtig = { health: { generalPractitioner: { ref: 'p1' }, emergencyContacts: [{ ref: 'p2' }] } };
  assert.deepEqual(formFundeFuer(katalog, richtig), [], 'Gegenprobe: beide korrekten Formen sind grün');
});
