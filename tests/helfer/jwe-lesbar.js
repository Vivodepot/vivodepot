'use strict';
/* Der lesbare Teil einer JWE (Compact), vollständig dekodiert: der geschützte Kopf als JSON und jeder base64url-Parameter
   darin (apu, apv, p2s, kid) noch einmal dekodiert, dazu epk. Eine Probe „X steht NICHT im Klartext der Antwort“ sucht
   HIER, nicht im rohen JWE-Text: dort ist alles base64url, und die Suche wäre still grün, ohne zu prüfen. */
function jweLesbarerTeil(jwe) {
  const kopf = JSON.parse(Buffer.from(String(jwe).trim().split('.')[0], 'base64url').toString('utf8'));
  const teile = [JSON.stringify(kopf)];
  for (const k of ['apu', 'apv', 'p2s', 'kid']) {
    if (typeof kopf[k] === 'string') teile.push(Buffer.from(kopf[k], 'base64url').toString('utf8'));
  }
  if (kopf.epk) teile.push(JSON.stringify(kopf.epk));
  return teile.join('\n');
}
module.exports = { jweLesbarerTeil };
