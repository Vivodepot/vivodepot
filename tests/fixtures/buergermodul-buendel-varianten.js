'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   U2-ADR-310 — Bündel-Varianten für den E4-Abnahmebeweis
   ────────────────────────────────────────────────────────────────────────────
   `BUERGERMODUL_BUENDEL` (vivodepot.html) ist EIN top-level `const`, gesetzt über
   `JSON.parse('<eine riesige Zeile>')` — ein Boot-Zeit-Wert, keine Laufzeit-Variable.
   Um zu prüfen, was passiert, wenn er FEHLT oder einen ANDEREN Inhalt trägt, braucht es
   eine echte Quelltext-Variante — genau dieselbe Technik wie U2-ADR-304 (SEKTOREN leer):
   Ersatz VOR dem Laden, kein Post-Load-Patch (der Wert ist `const`, und selbst wäre er es
   nicht, würden interne Closures die alte Bindung längst gesehen haben).

   Die eingebettete Zeile ist eine JS-EINFACH-GEQUOTETE Zeichenkette — `new Function('return '+…)`
   nutzt den echten JS-Parser, um sie korrekt zu entschlüsseln (kein selbstgebauter Escaper).
   Der Rückweg braucht KEIN Escaping: gültiges JSON ist eine syntaktische Teilmenge von JS, ein
   `JSON.stringify(...)`-Ergebnis kann darum direkt als Objekt-Literal eingesetzt werden. */
const fs = require('node:fs');

const MARKER = "const BUERGERMODUL_BUENDEL = JSON.parse('";

function _buendelZeileFinden(html) {
  const start = html.indexOf(MARKER);
  if (start < 0) throw new Error('buendel-varianten: Marker-Zeile nicht gefunden — Quelltext hat sich geändert?');
  const zeilenEnde = html.indexOf('\n', start);
  if (zeilenEnde < 0) throw new Error('buendel-varianten: kein Zeilenende nach dem Marker gefunden');
  const zeile = html.slice(start, zeilenEnde);
  if (!zeile.endsWith("');")) throw new Error('buendel-varianten: Zeile endet nicht auf \');  — Quelltext hat sich geändert? Gefunden: ' + zeile.slice(-30));
  return { start, ende: zeilenEnde, zeile };
}

// Liest das ECHTE, im Repo eingebettete Bündel als Objekt (native Wahrheit für Mutationen).
function echtesBuendelLesen(html) {
  const { zeile } = _buendelZeileFinden(html);
  const literal = zeile.slice(MARKER.length - 1, -2);   // ab dem öffnenden ' bis NACH dem schließenden ' (vor `);`)
  // eslint-disable-next-line no-new-func
  const rohJson = new Function('return ' + literal)();
  return JSON.parse(rohJson);
}

// Ersetzt die gesamte Zeile durch eine neue Zuweisung. `wert` ist entweder `null`
// (Depot ohne Bündel) oder ein Objekt (gültiges JSON ist gültiges JS-Objektliteral —
// kein Escaping nötig, JSON.stringify direkt einsetzbar).
function _buendelErsetzen(html, wert) {
  const { start, ende } = _buendelZeileFinden(html);
  const neueZeile = 'const BUERGERMODUL_BUENDEL = ' + (wert === null ? 'null' : JSON.stringify(wert)) + ';';
  return html.slice(0, start) + neueZeile + html.slice(ende);
}

// Variante A: kein Bündel — der Kern fährt seinen eingebauten (nativen) Bestand unverändert.
function ohneBuendel(html) {
  return _buendelErsetzen(html, null);
}

// Variante mit einem BELIEBIGEN, vom Aufrufer gebauten Bündel-Objekt.
function mitBuendel(html, buendelObjekt) {
  return _buendelErsetzen(html, buendelObjekt);
}

/* Gegenprobe 1 — ein Feld weglassen. Nimmt `sektorId`/`sektionId`/`feldId` aus dem
   ECHTEN Bündel (damit die Probe nicht an einer erfundenen Kennung vorbeiläuft) und
   entfernt genau diesen Feld-Eintrag. */
function buendelOhneFeld(buendel, sektorId, sektionId, feldId) {
  const kopie = JSON.parse(JSON.stringify(buendel));
  const sektion = (kopie.bereiche[sektorId].sektionen || []).find((s) => s.id === sektionId);
  if (!sektion) throw new Error('buendel-varianten: Sektion nicht gefunden — ' + sektorId + '.' + sektionId);
  const vorher = sektion.felder.length;
  sektion.felder = sektion.felder.filter((f) => f.id !== feldId);
  if (sektion.felder.length !== vorher - 1) throw new Error('buendel-varianten: Feld nicht (oder mehrfach) gefunden — ' + feldId);
  return kopie;
}

// Gegenprobe 2 — ein Feld umbenennen (nur seine `id`, sonst unverändert). Ein umbenanntes
// Feld trifft `_erstePartieErlaubteIdsFuerSektor` nicht mehr (die erlaubte Menge kommt aus
// dem NATIVEN Gerüst) — die Ersetzung verwirft den Eintrag, s. `erstePartieFeldDefsPruefen`.
function buendelFeldUmbenannt(buendel, sektorId, sektionId, feldId, neueId) {
  const kopie = JSON.parse(JSON.stringify(buendel));
  const sektion = (kopie.bereiche[sektorId].sektionen || []).find((s) => s.id === sektionId);
  if (!sektion) throw new Error('buendel-varianten: Sektion nicht gefunden — ' + sektorId + '.' + sektionId);
  const feld = sektion.felder.find((f) => f.id === feldId);
  if (!feld) throw new Error('buendel-varianten: Feld nicht gefunden — ' + feldId);
  feld.id = neueId;
  return kopie;
}

/* Gegenprobe 3 — zwei Sektionen VERTAUSCHT: die `felder`-Arrays zweier Sektionen im
   selben Bereich tauschen die Plätze. Sektions-REIHENFOLGE/-Identität ist laut
   `buergermodulSektorErsetzen` (Kommentar an der Definition) für den Ladeweg irrelevant
   (Zuordnung läuft über `sektionId`, nie über Array-Position) — ein reiner
   Positionstausch im Bündel wäre darum unsichtbar und bewiese nichts. Der Tausch muss
   den INHALT treffen: welche Felder zu welcher Sektion gehören. */
function buendelSektionenVertauscht(buendel, sektorId, sektionIdA, sektionIdB) {
  const kopie = JSON.parse(JSON.stringify(buendel));
  const sektionen = kopie.bereiche[sektorId].sektionen || [];
  const a = sektionen.find((s) => s.id === sektionIdA);
  const b = sektionen.find((s) => s.id === sektionIdB);
  if (!a || !b) throw new Error('buendel-varianten: Sektion(en) nicht gefunden — ' + sektionIdA + '/' + sektionIdB);
  const tmp = a.felder;
  a.felder = b.felder;
  b.felder = tmp;
  return kopie;
}

module.exports = {
  echtesBuendelLesen,
  ohneBuendel,
  mitBuendel,
  buendelOhneFeld,
  buendelFeldUmbenannt,
  buendelSektionenVertauscht,
};
