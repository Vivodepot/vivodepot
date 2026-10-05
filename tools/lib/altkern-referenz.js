'use strict';
/* Der zuletzt AUSGELIEFERTE Kern eines Produkts, aus dem Fassungsregister (v894, U2-ADR-473 Nachtrag).
   ───────────────────────────────────────────────────────────────────────────────────────────────
   Der Shop baut mit dem jeweils neuen produktTextErzeugen auch aus hochgeladenen ALTEN Kernen. Die Probe dafür
   (tests/e2e/altkern-shop-bau.spec.js) soll nicht an einem festen Stand hängen bleiben, sondern mit jeder Auslieferung
   mitwandern: sie nimmt die höchste Fassung des Produkts im Register und deren kanonCommit.

   Fehlt der kanonCommit in dieser Zeile, bricht die Auswahl ab — sie fällt NICHT still auf eine ältere Zeile zurück, die
   einen trägt; sonst prüfte die Probe unbemerkt einen alten Stand. Probe: tests/altkern-referenz.test.js. */
const fs = require('node:fs');
const path = require('node:path');

const REGISTER = path.join(__dirname, '..', '..', 'docs', 'fassungen-register.json');
const nummer = (f) => Number(String(f).replace(/^v/, ''));

function referenzWaehlen(zeilen, produkt = 'privat-de') {
  const eigene = zeilen.filter((z) => z.produkt === produkt);
  if (!eigene.length) throw new Error('altkern-referenz: keine Auslieferung von ' + produkt + ' im Register');
  const letzte = eigene.reduce((a, b) => (nummer(b.fassung) > nummer(a.fassung) ? b : a));
  if (!/^[0-9a-f]{7,40}$/.test(letzte.kanonCommit || '')) {
    throw new Error('altkern-referenz: die zuletzt ausgelieferte Fassung ' + letzte.fassung + ' von ' + produkt
      + ' trägt keinen kanonCommit — ohne ihn ist der ausgelieferte Kern nicht bestimmbar (kein Rückfall auf eine ältere Zeile).');
  }
  return { fassung: letzte.fassung, kanonCommit: letzte.kanonCommit, produkt };
}

function referenzLesen(produkt, registerPfad = REGISTER) {
  // Das Fassungsregister ist intern (Zuschnitt: ZURÜCK). Im öffentlichen Repo fehlt es: ein benannter Abbruch statt ENOENT.
  if (!fs.existsSync(registerPfad)) throw new Error('altkern-referenz: nur im privaten Repo — das Fassungsregister liegt nicht vor');
  return referenzWaehlen(JSON.parse(fs.readFileSync(registerPfad, 'utf8')).zeilen, produkt);
}

module.exports = { referenzWaehlen, referenzLesen, REGISTER };
