'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Anlass-Kacheln routen auf ein Ziel, das es gibt.
   ────────────────────────────────────────────────────────────────────────
   Reiner Test, kein Produktivcode (Auftrag Phase-3-Kleinteile, Punkt 2).

   WAS GEPRÜFT WIRD, und warum genau das: `waehleAnlass` (vivodepot.html:13141)
   löst ein Anlass-Ziel so auf —
     · `ziel.wizard` + registriert → wizardLauf(wizard)
     · sonst SITUATION_BY_ID[anlassId] → das Blatt öffnen
     · sonst Toast „Modul folgt" (bewusst noch nicht gebaut)
   Gemessen: `ziel.sbl` und `ziel.step` werden NIRGENDS konsumiert — sie sind
   beschreibende Metadaten, nicht der Routing-Schlüssel. Der Schlüssel ist
   `anlassId`.

   Die Grenze zwischen „leer" und „kaputt" liegt an der ZUSAGE:
     · Ein `{wizard}`-Ziel ist die Zusage, geführt zu helfen. Zeigt es auf
       einen Wizard, den es nicht gibt, fällt `waehleAnlass` STILL durch auf
       Blatt/Toast — die Bürgerin hat „geführt" gewählt und bekommt nichts.
       Das ist kaputt und wird geprüft.
     · Ein `{sbl}`-Ziel ist die Zusage eines bestimmten Situationsblatts.
       Fehlt das Blatt, wird geprüft.
     · Ein Anlass, der nur durchfällt und kein Blatt hat, TOASTET „Modul
       folgt" — das ist der bewusste „noch nicht gebaut"-Zustand, also LEER,
       nicht kaputt. Er wird NICHT eingefordert; sonst verböte der Test das
       schrittweise Bauen.

   Aus dem Modell gelesen, nicht gegen eine Liste im Test: Kommt ein Anlass
   hinzu oder fällt ein Ziel weg, greift die Prüfung ohne Pflege.
   ════════════════════════════════════════════════════════════════════════ */
const test = require('node:test');
const assert = require('node:assert');
const { ladeKern } = require('./load-kern.js');

/* ── Diskriminanten, herausgezogen (A46) ─────────────────────────────────────
   Alle vier Kollektor-Form-Pruefungen unten (Liste sammeln, ihre Leere behaupten
   — operating-manual §7.5) waren namenlos inline; der Pruefstand (U2-ADR-099
   Teil B-2, `tests/pruefstand-bindung.js`) instrumentiert nur benannte `function`-
   Diskriminanten. Reine Extraktion, keine Verhaltensaenderung. */
function wizardZielVerstoesse(V) {
  const reg = new Set((V.WIZARDS || []).map(w => w.id));
  return (V.ANLAESSE || [])
    .filter(a => a && a.ziel && a.ziel.wizard && !reg.has(a.ziel.wizard))
    .map(a => a.id + ' → wizard:' + a.ziel.wizard);
}

function sblZielVerstoesse(V) {
  // Routing-Schluessel ist anlassId (nicht ziel.sbl — das ist beschreibend). `waehleAnlass`
  // oeffnet SITUATION_BY_ID[anlassId]; ein {sbl}-Anlass sagt zu, dass es dieses Blatt gibt.
  return (V.ANLAESSE || [])
    .filter(a => a && a.ziel && a.ziel.sbl != null && !V.SITUATION_BY_ID[a.id])
    .map(a => a.id + ' (ziel.sbl=' + JSON.stringify(a.ziel.sbl) + ')');
}

function lageZielVerstoesse(V) {
  // `waehleAnlass` öffnet bei ziel.lage das Lage-Blatt über oeffneLebenslage — aber NUR, wenn
  // BAUSTEIN_BY_ID die Lage kennt; sonst faellt es still auf Blatt/Toast durch. Ein {lage}-Anlass
  // sagt also zu, dass es diese Lage gibt. Dieselbe Zusage-Grenze wie bei {wizard}/{sbl}.
  return (V.ANLAESSE || [])
    .filter(a => a && a.ziel && a.ziel.lage != null && !V.BAUSTEIN_BY_ID[a.ziel.lage])
    .map(a => a.id + ' (ziel.lage=' + JSON.stringify(a.ziel.lage) + ')');
}

function mehrdeutigeZiele(V) {
  const schief = [];
  for (const a of (V.ANLAESSE || [])) {
    const z = a && a.ziel;
    if (!z) { schief.push(a.id + ' (kein Ziel)'); continue; }
    const formen = ['wizard', 'sbl', 'step', 'demo', 'lage', 'zwischenfrage'].filter(k => z[k] != null);   // A50/U2-ADR-117: `lage`; CW-1: `zwischenfrage`
    if (formen.length !== 1) schief.push(a.id + ' → [' + formen.join(',') + ']');
  }
  return schief;
}

test('[AnlassRouting] jedes {wizard}-Ziel zeigt auf einen registrierten Wizard', () => {
  const { V } = ladeKern();
  const tot = wizardZielVerstoesse(V);
  assert.equal(tot.join('\n'), '',
    'Diese Anlass-Kacheln versprechen einen geführten Einstieg, aber der Wizard existiert nicht. '
    + '`waehleAnlass` faellt dann STILL durch auf Blatt oder „Modul folgt" — die Buergerin waehlt '
    + '„geführt" und bekommt nichts:\n' + tot.join('\n'));
});

test('[AnlassRouting] jedes {sbl}-Ziel zeigt auf ein existierendes Situationsblatt', () => {
  const { V } = ladeKern();
  const fehlt = sblZielVerstoesse(V);
  assert.equal(fehlt.join('\n'), '',
    'Diese Anlass-Kacheln versprechen ein Situationsblatt, aber SITUATION_BY_ID kennt es nicht — '
    + 'Antippen landet auf dem „Modul folgt"-Toast statt am zugesagten Blatt:\n' + fehlt.join('\n'));
});

test('[AnlassRouting] jedes {lage}-Ziel zeigt auf eine existierende Lebenslage (A50/U2-ADR-117)', () => {
  const { V } = ladeKern();
  const fehlt = lageZielVerstoesse(V);
  assert.equal(fehlt.join('\n'), '',
    'Diese Anlass-Kacheln versprechen ein Lage-Blatt, aber der Katalog (BAUSTEINE) kennt die Lage '
    + 'nicht — Antippen landet auf dem „Modul folgt"-Toast statt am zugesagten Blatt:\n' + fehlt.join('\n'));
});

test('[AnlassRouting] jeder Anlass hat GENAU EINE Zielform (wizard | sbl | step | demo | lage)', () => {
  const { V } = ladeKern();
  const schief = mehrdeutigeZiele(V);
  assert.equal(schief.join('\n'), '',
    'Ein Anlass mit zwei Zielformen oder ohne Ziel ist mehrdeutig — welcher Weg zaehlt, waere '
    + 'Zufall der Reihenfolge in waehleAnlass:\n' + schief.join('\n'));
});

test('[AnlassRouting] das Demo-Ziel bleibt ohne Blatt und ohne Wizard — bewusst', () => {
  const { V } = ladeKern();
  const demo = (V.ANLAESSE || []).filter(a => a && a.ziel && a.ziel.demo);
  assert.ok(demo.length >= 1, 'es gibt mindestens einen Demo-Anlass („umsehen")');
  for (const a of demo) {
    assert.ok(!a.ziel.wizard && a.ziel.sbl == null,
      a.id + ': Demo führt bewusst nur in die passwortlose Vorschau, nicht in ein Blatt/Wizard');
  }
});

/* ── Proben-Deklaration (U2-ADR-099, §7.5) — A46 ──────────────────────────────
   Bewusst OHNE eigene `konformitaet`-Klausel/`pruefung:`-Zeile (U2-ADR-115) — das
   bliebe Fix-CCs Gegenstand und ginge in `fundstellen` ein. Die Kopplung hier
   greift unabhängig davon: `probenDeklarationen()` liest jede `tests/*.test.js`,
   nicht nur klausel-gebundene. Die „genau eine Zielform"-Pruefung bleibt drinnen —
   auch sie ist Kollektor-Form (§7.5 greift, nicht nur bei {wizard}/{sbl}/{lage}).
   Das Demo-Ziel bleibt draussen: es ist KONSTRUKTIONS-Form (`assert.ok(length>=1)`
   ist die Nicht-leer-Wache selbst, kein Leerraum-Kollektor). */
module.exports = {
  PROBEN: [
    { fuer: '[AnlassRouting] jedes {wizard}-Ziel zeigt auf einen registrierten Wizard', diskriminante: wizardZielVerstoesse },
    { fuer: '[AnlassRouting] jedes {sbl}-Ziel zeigt auf ein existierendes Situationsblatt', diskriminante: sblZielVerstoesse },
    { fuer: '[AnlassRouting] jedes {lage}-Ziel zeigt auf eine existierende Lebenslage (A50/U2-ADR-117)', diskriminante: lageZielVerstoesse },
    { fuer: '[AnlassRouting] jeder Anlass hat GENAU EINE Zielform (wizard | sbl | step | demo | lage)', diskriminante: mehrdeutigeZiele },
  ],
};
