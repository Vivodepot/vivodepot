'use strict';
/* grund.js — der Grund eines Fehlers in einer Zeile (08.11.2026).

   Ein catch, das den Fehler verwirft und einen Ersatzwert zurückgibt, nimmt der Meldung danach ihren Grund: aus „Datei
   unlesbar (EACCES)“ oder „JSON kaputt“ wurde „kein festgehaltener Teil 1“, aus einer Zeitgrenze „nicht erreichbar“.
   grundVon(e) macht den Grund kurz genug für eine HALT-Zeile: der Fehlercode (ENOENT, EACCES, ETIMEDOUT …), dann die erste
   Zeile der Meldung, höchstens 160 Zeichen.
   Geprüft von der Probe des catch-Wächters, mit den Stellen, die es benutzen. */

const GRENZE = 160;

function grundVon(e) {
  if (e === null || e === undefined) return 'unbekannter Fehler';
  const code = e && e.code ? String(e.code) : '';
  const meldung = String((e && e.message) || e).split('\n')[0].trim();
  const text = code && !meldung.includes(code) ? (meldung ? code + ': ' + meldung : code) : meldung || code || 'unbekannter Fehler';
  return text.length > GRENZE ? text.slice(0, GRENZE - 1) + '…' : text;
}

/* Fehlt die Datei (ENOENT), ist das oft erlaubt; jeder andere Fehler hat einen Grund, der in die Meldung gehört. */
const fehlt = (e) => Boolean(e && e.code === 'ENOENT');

module.exports = { grundVon, fehlt, GRENZE };
