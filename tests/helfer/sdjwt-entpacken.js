'use strict';
/* Entpackt eine kompakte SD-JWT-Ausgabe (JWT ~ Offenlegungen ~) in lesbaren Text. Seit U2-ADR-457 schreiben die
   sd-jwt-vc-*-Exporte diese Form; Kopf, Nutzlast und Offenlegungen stehen dort base64url-kodiert. Eine Textsuche auf den
   rohen Bytes fände darum nichts — und eine Probe „X steht NICHT in der Datei“ wäre still grün, ohne zu prüfen.
   `lesbar(text)` liefert für eine kompakte Form Kopf, Nutzlast und jede Offenlegung als JSON-Text, für alles andere den
   Text unverändert. `entpackt(text)` liefert die Teile als Objekte; `mitOffenlegungen(text, fn)` baut die Form mit
   veränderten Offenlegungen neu (die Signatur bleibt die alte und passt dann nicht mehr — gewollt für Rot-Beweise). */
const b64 = (t) => Buffer.from(t, 'base64url').toString('utf8');

function istKompakt(text) {
  return typeof text === 'string' && /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]*~/.test(text.trim());
}
function entpackt(text) {
  const teile = text.trim().split('~');
  const [h, p, sig] = teile[0].split('.');
  const offenlegungen = teile.slice(1).filter(Boolean).map((d) => JSON.parse(b64(d)));
  const claims = {};
  for (const o of offenlegungen) if (Array.isArray(o) && o.length === 3) claims[o[1]] = o[2];
  return { kopf: JSON.parse(b64(h)), nutzlast: JSON.parse(b64(p)), signatur: sig, offenlegungen, claims };
}
function lesbar(text) {
  if (!istKompakt(text)) return text;
  const e = entpackt(text);
  return JSON.stringify({ kopf: e.kopf, nutzlast: e.nutzlast, offenlegungen: e.offenlegungen }, null, 2);
}
function mitOffenlegungen(text, fn) {
  const teile = text.trim().split('~');
  const neu = teile.slice(1).map((d) => (d ? Buffer.from(JSON.stringify(fn(JSON.parse(b64(d))))).toString('base64url') : d));
  return [teile[0], ...neu].join('~');
}
module.exports = { istKompakt, entpackt, lesbar, mitOffenlegungen };
