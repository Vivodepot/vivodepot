'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Ein Zertifikat aus einer Datei lesen — gleich, welches Werkzeug sie geschrieben hat (16.09.2026)
   ────────────────────────────────────────────────────────────────────────
   Dasselbe Zertifikat (eine JWS in Compact-Form) liegt je nach Erzeuger unter einem anderen Feld:
     certJws                 tools/behoerden-zertifikat-ausstellen.js, tools/kundenzertifikat-ausstellen.js
                             und das Kunden-Bündel des Zertifikators (*.kundenzertifikat.json)
     id                      die VC-Datei des Zertifikators ab 11.11.2026: ein EnvelopedVerifiableCredential nach VC Data
                             Model 2.0 (W3C Recommendation 15.05.2025, 4.13), `id` = „data:application/vc+jwt,<jws>"
     proof.jws               die VC-Datei des Zertifikators bis 11.11.2026 (Altbestand, `JsonWebSignature2020`)
     providerCredentialJws   das Auslieferungs-Bündel des Zertifikators (*.bundle.json)
   Die Leser verlangten nur `certJws` — die Ausgabestellen-Zertifikate aus dem Zertifikator hatten es
   nie (Auslieferung v718, Schritt 5: „Die Zertifikatsdatei trägt kein certJws").

   Hier wird NUR gelesen, nicht geprüft: Anker, Typ, Rolle, Ablauf und Schlüsselbindung prüft jeder
   Aufrufer wie bisher. Tragen mehrere Felder eine JWS, müssen sie gleich sein — sonst ist unklar,
   welches Zertifikat gemeint ist, und es wird abgebrochen. */

const FELDER = Object.freeze(['certJws', 'id', 'proof.jws', 'providerCredentialJws']);
const UMSCHLAG_PRAEFIX = 'data:application/vc+jwt,';

function _istCompactJws(w) {
  return typeof w === 'string' && w.split('.').length === 3 && w.split('.').every((t) => /^[A-Za-z0-9_-]*$/.test(t)) && w.split('.')[1].length > 0;
}

function _feldWert(datei, feld) {
  if (feld === 'id') {
    // Nur ein Umschlag mit genau diesem Medientyp; jede andere `id` ist kein Zertifikat.
    const typ = Array.isArray(datei.type) ? datei.type : [datei.type];
    if (!typ.includes('EnvelopedVerifiableCredential') || typeof datei.id !== 'string') return undefined;
    return datei.id.startsWith(UMSCHLAG_PRAEFIX) ? datei.id.slice(UMSCHLAG_PRAEFIX.length) : datei.id;
  }
  return feld === 'proof.jws' ? (datei.proof && typeof datei.proof === 'object' ? datei.proof.jws : undefined) : datei[feld];
}

// Rückgabe { jws, feld }. Wirft mit einer Meldung, die die drei erwarteten Formen nennt.
function zertifikatJwsAusDatei(datei) {
  if (!datei || typeof datei !== 'object') throw new Error('Die Zertifikatsdatei ist kein JSON-Objekt.');
  const funde = FELDER.map((feld) => ({ feld, jws: _feldWert(datei, feld) })).filter((f) => f.jws !== undefined);
  const gueltig = funde.filter((f) => _istCompactJws(f.jws));
  if (!gueltig.length) {
    throw new Error('Die Zertifikatsdatei trägt kein Zertifikat: erwartet eine JWS in „certJws", „id" (EnvelopedVerifiableCredential, VC-Datei des Zertifikators), „proof.jws" (ältere VC-Datei) oder „providerCredentialJws" (Bündel des Zertifikators)'
      + (funde.length ? '; gefunden, aber keine JWS: ' + funde.map((f) => f.feld).join(', ') : '') + '.');
  }
  if (new Set(gueltig.map((f) => f.jws)).size > 1) {
    throw new Error('Die Zertifikatsdatei trägt verschiedene Zertifikate in ' + gueltig.map((f) => f.feld).join(' und ') + ' — unklar, welches gemeint ist.');
  }
  return { jws: gueltig[0].jws, feld: gueltig[0].feld };
}

module.exports = { zertifikatJwsAusDatei, FELDER };
