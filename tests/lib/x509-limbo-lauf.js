'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   x509-limbo-lauf.js — die gepinnte x509-limbo-Auswahl lesen und einen Fall gegen den X.509-Leser des Kerns fahren
   ────────────────────────────────────────────────────────────────────────────
   Geteilt von tests/x509-limbo.test.js und tools/x509-gegenprobe.js (--mit-leser), damit Probe und Gegenprobe denselben
   Fall gleich fahren. Daten: tests/konformitaet/vectors/x509-limbo/ (erzeugt von tools/x509-limbo-umfang-erzeugen.js).

   x5c ist im Produkt GEORDNET (Blatt, dann die Zwischen-CAs); x509-limbo bietet die Zwischenzertifikate als ungeordneten
   Vorrat an. Der Lauf probiert darum jede Reihenfolge aus höchstens drei Vorratszertifikaten, deren Namen byteweise
   aneinander passen (eine andere weist der Leser ohnehin mit „zertifikat-unbekannt" ab), und nimmt den Fall an, sobald EINE
   trägt — für FAILURE ist das die strengere Lesart. Höchstens VERSUCHE_HOECHSTENS Reihenfolgen je Fall.
   Angenommen heißt: die Kette trägt, und — ist ein DNS-Name verlangt — die Bindung „x509_san_dns:<name>" trägt.
   ════════════════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const path = require('node:path');

const ORDNER = path.join(__dirname, '..', 'konformitaet', 'vectors', 'x509-limbo');
const VERSUCHE_HOECHSTENS = 2000;

function auswahlLesen(datei, ordner = ORDNER) {
  const roh = fs.readFileSync(path.join(ordner, datei));
  return { roh, daten: JSON.parse(roh.toString('utf8')) };
}
const zert = (tabelle, id) => new Uint8Array(Buffer.from(tabelle[id], 'base64'));
const gleich = (a, b) => a.length === b.length && a.every((x, i) => x === b[i]);

/* Die Reihenfolgen aus dem Vorrat: Folgen verschiedener Indizes (Länge 0 bis 3), Glied für Glied namensgleich. */
function reihenfolgen(K, blatt, vorrat) {
  const lesen = (d) => { try { return K._x509Lesen(d); } catch (_) { return null; } };
  const b = lesen(blatt);
  if (!b) return [[]];
  const gelesen = vorrat.map(lesen);
  const aus = [[]];
  const weiter = (kette, letztes) => {
    if (kette.length >= 3 || aus.length >= VERSUCHE_HOECHSTENS) return;
    gelesen.forEach((z, i) => {
      if (!z || kette.includes(i) || aus.length >= VERSUCHE_HOECHSTENS) return;
      if (!gleich(letztes.aussteller, z.inhaber)) return;
      const neu = [...kette, i];
      aus.push(neu);
      weiter(neu, z);
    });
  };
  weiter([], b);
  return aus;
}

/* Einen Fall fahren. Rückgabe { angenommen, versuche, grund } — grund ist der Grund des letzten abgewiesenen Versuchs. */
async function fallFahren(K, tabelle, fall) {
  const anker = fall.anker.map((id) => zert(tabelle, id));
  const vorrat = fall.zwischen.map((id) => zert(tabelle, id));
  const blatt = zert(tabelle, fall.blatt);
  const b64 = (d) => Buffer.from(d).toString('base64');
  let grund = null;
  const liste = reihenfolgen(K, blatt, vorrat);
  for (const folge of liste) {
    const r = await K._x509KettePruefen([blatt, ...folge.map((i) => vorrat[i])].map(b64), anker, fall.zeit);
    if (!r.gueltig) { grund = r.grund + (r.detail ? ' (' + r.detail + ')' : ''); continue; }
    if (fall.namensArt === 'DNS' && fall.name) {
      const bindung = await K._x509ClientIdBinden('x509_san_dns:' + fall.name, r.blatt);
      if (!bindung.gueltig) { grund = bindung.grund; continue; }
    }
    return { angenommen: true, versuche: liste.length, grund: null };
  }
  return { angenommen: false, versuche: liste.length, grund };
}

module.exports = { ORDNER, VERSUCHE_HOECHSTENS, auswahlLesen, zert, reihenfolgen, fallFahren };
