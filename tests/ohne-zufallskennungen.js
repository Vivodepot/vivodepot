'use strict';
/* Zufallskennungen aus einem Text nehmen, bevor eine Probe darin nach einer kurzen Ziffernfolge sucht (21.10.2026).
   Ein Auszug trägt UUIDs (je Ressource, je Lauf neu); eine vierstellige Folge wie ein Jahr steht darin gelegentlich zufällig.
   Gemessen: tools/ips-kurzziffer-zufall-messen.js (1 Treffer in 400 Läufen, in einer Kennung). Ein Wächter
   gegen kurze Ziffernfolgen ohne diesen Filter bewacht die Proben. Ersetzt werden UUIDs (auch als urn:uuid) und Hex-Folgen ab 16 Zeichen. */
const UUID = /(?:urn:uuid:)?[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;
const HEX = /\b[0-9a-f]{16,}\b/gi;

function ohneZufallsKennungen(x) {
  const t = typeof x === 'string' ? x : JSON.stringify(x);
  return String(t).replace(UUID, '<kennung>').replace(HEX, '<kennung>');
}

module.exports = { ohneZufallsKennungen, UUID, HEX };
