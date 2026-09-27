'use strict';
/* Befund VERSIONSTOR-UI-SCHREIBWEG (MITTEL), 23.09.2026, Journey (b) der Durchklick-Abnahme.
   Im echten Browser (tests/e2e/journey-versionstor-anker.spec.js) hält das Versionstor auf der
   PLATTE: nichts wird geschrieben, die Datei bleibt byte-gleich, der Hinweis ist sichtbar. Aber der
   Bearbeitungsweg der Oberfläche (bearbeitungSpeichern → kernAPI.schreibBereich, ein Bulk-Write) läuft
   NICHT durch das Tor: kernAPI.schreibBereich prüft nur Modus.darfBearbeiten, nicht
   _schreibenErlaubtPruefen. Ergebnis: in einer Datei aus einer neueren Fassung nimmt der Kern die
   Eingabe im Arbeitsspeicher an (gemessen: identity.givenName 'Vorher' → 'Veraendert'), obwohl er sie nie
   speichert — die Person sieht ihre Änderung, sie geht beim Schließen still verloren. Die Node-Probe in
   tests/versionsschraege-tor.test.js deckt sektorFeldSetzen/personAktualisieren, nicht diesen Weg.
   Fix-Richtung (Entscheidung beim Eigentümer): _schreibenErlaubtPruefen() in kernAPI.schreibBereich, und die
   Felder im Nur-Lesen-Zustand nicht bearbeitbar zeigen. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');
const { depotImProduktAnlegen, depotImProduktLaden } = require('./produkt-html-erzeugen.js');

const PW = 'versionstor-ui-weg-2026!';

test('[Versionsschräge·UI-Schreibweg·Rot-Beweis] kernAPI.schreibBereich (Bulk-Write der Oberfläche) verweigert in einer neueren Datei',
  { todo: 'Befund VERSIONSTOR-UI-SCHREIBWEG (MITTEL, Ratsche tools/befund-ratsche-eintraege): schreibBereich läuft nicht durch das Versionstor' },
  async () => {
    const { umschlag } = await depotImProduktAnlegen('privat-de', PW, (V) => {
      V.akteurSelbstErklaeren('Ilse');
      V.sektorFeldSetzen('identity', 'givenName', 'Vorher');
      V.getData().schemaVersion = V.SCHEMA_VERSION_AKTUELL + 1;
    });
    const erst = await depotImProduktLaden('privat-de', umschlag, PW);
    assert.equal(erst.V.neuereFassungNurLesen(), true, 'Testaufbau: die Datei ist neuer, der Kern liest nur');
    try { erst.V.akteurSelbstErklaeren('Ilse'); } catch (_) { /* Akteur gesetzt oder gate: nur Bearbeitungserlaubnis herstellen */ }
    const vorher = JSON.stringify(erst.V.getData());
    let geworfen = null;
    try { erst.V.kernAPI.schreibBereich('identity', Object.assign({}, erst.V.getData().sektoren.identity, { givenName: 'Veraendert' })); }
    catch (e) { geworfen = e; }
    assert.ok(geworfen && geworfen.code === 'neuere-fassung-nur-lesen',
      'schreibBereich hat nicht verweigert (' + (geworfen ? geworfen.message : 'kein Wurf') + ')');
    assert.equal(JSON.stringify(erst.V.getData()), vorher, 'der Bulk-Write hat das Depot im Arbeitsspeicher verändert');
  });
