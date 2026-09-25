'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Ein Zertifikat aus einer Datei lesen — gleich, welches Werkzeug sie geschrieben hat (16.09.2026)
   ────────────────────────────────────────────────────────────────────────
   Dasselbe Zertifikat (eine JWS in Compact-Form) liegt je nach Erzeuger unter einem anderen Feld:
     certJws                 tools/behoerden-zertifikat-ausstellen.js, tools/kundenzertifikat-ausstellen.js
                             und das Kunden-Bündel des Zertifikators (*.kundenzertifikat.json)
     proof.jws               die VC-Datei des Zertifikators (vivodepot-vc-issuer.html, „VC herunterladen")
     providerCredentialJws   das Auslieferungs-Bündel des Zertifikators (*.bundle.json)
   Die Leser verlangten nur `certJws` — die Ausgabestellen-Zertifikate aus dem Zertifikator hatten es
   nie (Auslieferung v718, Schritt 5: „Die Zertifikatsdatei trägt kein certJws").

   Hier wird NUR gelesen, nicht geprüft: Anker, Typ, Rolle, Ablauf und Schlüsselbindung prüft jeder
   Aufrufer wie bisher. Tragen mehrere Felder eine JWS, müssen sie gleich sein — sonst ist unklar,
   welches Zertifikat gemeint ist, und es wird abgebrochen. */

const FELDER = Object.freeze(['certJws', 'proof.jws', 'providerCredentialJws']);

function _istCompactJws(w) {
  return typeof w === 'string' && w.split('.').length === 3 && w.split('.').every((t) => /^[A-Za-z0-9_-]*$/.test(t)) && w.split('.')[1].length > 0;
}

function _feldWert(datei, feld) {
  return feld === 'proof.jws' ? (datei.proof && typeof datei.proof === 'object' ? datei.proof.jws : undefined) : datei[feld];
}

// Rückgabe { jws, feld }. Wirft mit einer Meldung, die die drei erwarteten Formen nennt.
function zertifikatJwsAusDatei(datei) {
  if (!datei || typeof datei !== 'object') throw new Error('Die Zertifikatsdatei ist kein JSON-Objekt.');
  const funde = FELDER.map((feld) => ({ feld, jws: _feldWert(datei, feld) })).filter((f) => f.jws !== undefined);
  const gueltig = funde.filter((f) => _istCompactJws(f.jws));
  if (!gueltig.length) {
    throw new Error('Die Zertifikatsdatei trägt kein Zertifikat: erwartet eine JWS in „certJws", „proof.jws" (VC-Datei des Zertifikators) oder „providerCredentialJws" (Bündel des Zertifikators)'
      + (funde.length ? '; gefunden, aber keine JWS: ' + funde.map((f) => f.feld).join(', ') : '') + '.');
  }
  if (new Set(gueltig.map((f) => f.jws)).size > 1) {
    throw new Error('Die Zertifikatsdatei trägt verschiedene Zertifikate in ' + gueltig.map((f) => f.feld).join(' und ') + ' — unklar, welches gemeint ist.');
  }
  return { jws: gueltig[0].jws, feld: gueltig[0].feld };
}

module.exports = { zertifikatJwsAusDatei, FELDER };
