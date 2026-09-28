'use strict';
/* Vor dem ersten Test (`npm test`, --require): erfüllt node_modules den Lockfile nicht, bricht der
   Lauf mit EINER Meldung und dem Befehl zum Beheben ab, statt an Folgefehlern zu scheitern
   (Befund NODE-MODULES-LOCKFILE, 27.09.2026; Prüffunktion tools/lib/node-modules-lockfile-pruefen.js).
   Einmal je Lauf: die Test-Prozesse erben die Umgebungsmarke und prüfen nicht erneut. */
const path = require('node:path');

if (!process.env.VD_NODE_MODULES_GEPRUEFT) {
  const { pruefen } = require('./node-modules-lockfile-pruefen.js');
  const r = pruefen(path.join(__dirname, '..', '..'));
  if (!r.ok) {
    process.stderr.write('\n[node_modules] ABBRUCH vor dem ersten Test — ' + r.grund + '\n\n');
    process.exit(1);
  }
  process.env.VD_NODE_MODULES_GEPRUEFT = '1';
}
