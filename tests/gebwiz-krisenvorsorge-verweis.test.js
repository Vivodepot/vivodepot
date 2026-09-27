'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Test — gebwiz verweist auf Krisenvorsorge (Auftrag „Krisenvorsorge
   Sichtbarkeit", Zug 3, 10.08.2026)
   ────────────────────────────────────────────────────────────────────────
   „die Personenzahl ändert sich, und damit die Rechnung" — ein Satz, keine
   Wiederholung der BBK-Systematik.

   AMENDIERT („Gebwiz Kind und Sub-Depot", 11.08.2026): bis dahin
   trug der LETZTE Schritt (Kindergeld) den Verweis und bat die Bürgerin,
   das Kind SELBST unter „Meine Menschen" einzutragen — der Assistent legte
   noch keinen Eintrag an. Seit drei neuen Schritten (Name/Geburtsdatum/Art,
   NACH Kindergeld) übernimmt gebwiz das bei genanntem Namen selbst
   (`_gebwizKindEintragErstellen`) — der Hinweis am Kindergeld-Schritt
   nennt darum die automatische Anpassung, NICHT mehr „Meine Menschen" als
   manuellen Weg (der Weg bleibt für den Fall, dass kein Name genannt wird,
   ist aber nicht mehr Gegenstand DIESES Hinweises). Der Schritt ist nicht
   mehr der letzte im Array — das Krisenvorsorge-Kriterium bleibt an
   „Kindergeld" gebunden (dort ergibt der Satz weiterhin Sinn: Kindergeld
   und Notvorrat-Bedarf hängen beide an der Personenzahl), nicht mehr an
   „der letzte Schritt". */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

test('gebwiz-kindergeld-schritt verweist auf Krisenvorsorge — automatische Anpassung, kein zweiter Rechenweg', () => {
  const { V } = ladeKern();
  const def = V.WIZARD_BY_ID.gebwiz;
  assert.ok(def, 'gebwiz registriert');
  const schritt = def.schritte.find((s) => s.feld && s.feld.id === 'geburt_kindergeld');
  assert.ok(schritt, 'Kindergeld-Schritt existiert weiterhin');
  assert.ok(/Krisenvorsorge/.test(schritt.hilfetext), 'Hilfetext nennt den Bereich Krisenvorsorge');
  assert.ok(/automatisch/.test(schritt.hilfetext),
    'nennt die automatische Anpassung — der Assistent trägt das Kind seit diesem Auftrag selbst ein');
  assert.ok(!/Liter|BBK/.test(schritt.hilfetext), 'keine Wiederholung der BBK-Systematik im Hilfetext');
});

test('gebwiz endet auf drei neue, optionale Kind-Schritte NACH dem Krisenvorsorge-Hinweis', () => {
  const { V } = ladeKern();
  const def = V.WIZARD_BY_ID.gebwiz;
  const ids = def.schritte.map((s) => s.feld && s.feld.id);
  const kindergeldIdx = ids.indexOf('geburt_kindergeld');
  assert.deepEqual(ids.slice(kindergeldIdx + 1), ['guidedBirthEntryChildsNameNot', 'guidedBirthEntryDateOfBirthNot', 'guidedBirthEntryRelationship'],
    'die drei neuen Schritte folgen direkt auf Kindergeld, in dieser Reihenfolge');
});
