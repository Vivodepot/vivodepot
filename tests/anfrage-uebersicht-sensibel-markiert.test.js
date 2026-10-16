'use strict';
/* Die Übersicht einer Anfrage zeigt, was sensibel ist und was als nötig bezeichnet war (12.10.2026, Befund
   ANFRAGE-SENSIBEL-ERST-IM-EINZELSCHRITT)
   Mit v929 rechnet die Übersicht mit den Voreinstellungen der Person und sagt, wenn dadurch eine als nötig bezeichnete Angabe
   zurückbleibt. Zwei Teile fehlen noch: die Liste „Was habe ich“ markiert eine sensible Angabe nicht, und der Kasten
   „Nicht mitgeschickt“ sagt nicht, welche der zurückgehaltenen Angaben die Stelle als nötig bezeichnet hat.

   Diese Probe ist die ERWARTETE RÖTE des Befunds. Sie wird grün, sobald beide Teile gebaut sind; dann fällt das `todo` und
   seine Zeile in der Liste der ausgesetzten Proben. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const KERN = fs.readFileSync(path.join(__dirname, '..', 'vivodepot.html'), 'utf8');
const A_LISTE = 'id="anfrage-vorhanden"';
const E_LISTE = '// 3 · Was fehlt';
const A_KASTEN = 'const nichtMitgeschicktHTML = () => {';
const E_KASTEN = 'const normalwegHTML = () => {';
const stueck = (quelle, von, bis) => {
  const a = quelle.indexOf(von);
  const e = quelle.indexOf(bis, a);
  assert.ok(a >= 0 && e > a, 'Vorbedingung: der Abschnitt zwischen „' + von + '“ und „' + bis + '“ steht im Kern');
  return quelle.slice(a, e);
};
/* Was der Übersicht fehlt, als benannte Liste. */
const luecken = (quelle) => {
  const fehlt = [];
  if (!/f\.sensibel/.test(stueck(quelle, A_LISTE, E_LISTE))) fehlt.push('die Liste „Was habe ich“ liest die Sensibel-Markierung nicht');
  if (!/pflicht/.test(stueck(quelle, A_KASTEN, E_KASTEN))) fehlt.push('der Kasten „Nicht mitgeschickt“ kennt nicht, was als nötig bezeichnet war');
  return fehlt;
};

test('[Anfrage·offen] die Übersicht markiert sensible Angaben, und „Nicht mitgeschickt“ sagt, was die Stelle als nötig bezeichnet hat',
  { todo: 'Befund ANFRAGE-SENSIBEL-ERST-IM-EINZELSCHRITT (MITTEL): die Markierung in der Übersicht und der Zusatz im Kasten fehlen' },
  () => {
    assert.deepEqual(luecken(KERN), []);
  });

test('[Anfrage·Rot-Beweis] die Messung unterscheidet: fehlt ein Teil, wird er benannt; sind beide da, bleibt die Liste leer', () => {
  const mitListe = KERN.replace(A_LISTE, A_LISTE + ' data-probe="${f.sensibel}"');
  const mitBeidem = mitListe.replace(A_KASTEN, A_KASTEN + ' /* pflicht */');
  assert.deepEqual(luecken(mitBeidem), []);
  assert.equal(luecken(mitListe).length, luecken(mitBeidem).length + (/pflicht/.test(stueck(KERN, A_KASTEN, E_KASTEN)) ? 0 : 1));
  const ohneListe = KERN.replace(stueck(KERN, A_LISTE, E_LISTE), stueck(KERN, A_LISTE, E_LISTE).split('f.sensibel').join('f.anderes'));
  assert.ok(luecken(ohneListe).some((z) => z.includes('Was habe ich')), 'ohne die Markierung in der Liste wird sie benannt');
});
