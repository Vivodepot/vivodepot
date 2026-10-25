'use strict';
/* Pod-Brücke — Tür für Chiffrat (U2-ADR-512, Punkt 3).

   Die Brücke legt nur ab, was der Kern selbst schon verschlüsselt hat. Diese Datei entscheidet das, bevor irgendetwas
   ins Netz geht, und zwar nur an der Form, ohne Schlüssel: die Brücke kennt weder Passwort noch Schlüssel und soll sie nie
   kennen. Angenommen werden drei Formen, alle drei vom Kern erzeugt:

   - `shl`        JWE in kompakter Form mit Kopf { alg: "dir", enc: "A256GCM" } (Freigabe-Link, U2-ADR-047)
   - `antwort`    JWE in kompakter Form mit Kopf alg PBES2-HS512+A256KW oder ECDH-ES, enc A256GCM (U2-ADR-449, -156 1b)
   - `depot`      Depot-Datei (Sicherungskopie oder Ausschnitt je Empfänger, U2-ADR-156 1b): Präfix „VIVODEPOT“ + Fassungsbyte, danach JSON mit pbkdf2, depotSalt, depotUUID und genau
                  einer der Formen v3 (iv, ct) oder v4 (einheiten, umschlagTabelle); dieselbe Prüfung wie istGueltigerUmschlag
                  im Kern

   Alles andere wird abgewiesen, auch eine Depot-Datei, die neben der Hülle Felder trägt, die der Kern nicht schreibt: dort
   könnte Lesbares stehen. Die Prüfung ist eine Formprüfung. Dass im Chiffrat nichts Lesbares steht, belegt die Probe am
   Kern, nicht diese Tür. */

(function (wurzel, fabrik) {
  if (typeof module === 'object' && module.exports) module.exports = fabrik();
  else wurzel.vdPodChiffrat = fabrik();
})(typeof self !== 'undefined' ? self : this, function () {
  var B64URL = /^[A-Za-z0-9_-]+$/;
  var DATEI_MAGIC = 'VIVODEPOT';
  // Wie UMSCHLAG_FELDER_BEKANNT im Kern, dazu die zwei Klartext-Stempel, die depotHerunterladen neben die Hülle schreibt.
  var HUELLE = ['kryptoVersion', 'depotUUID', 'pbkdf2', 'depotSalt', 'iv', 'ct', 'einheiten', 'umschlagTabelle',
    'angehoerigenOrt', 'wiederherstellung', 'stand_marke', 'gespeichert_am'];
  /* Geschlossene Kopffelder je Form, wie der Kern sie schreibt (Krypto 15.10.): der Kopf ist lesbar, darum darf darin nichts
     stehen, was der Kern nicht selbst hineinlegt. Verfahren ebenso geschlossen: der Kern erzeugt ECDH-ES direkt (verschlüsselter
     Schlüssel leer) und PBES2-HS512+A256KW (verschlüsselter Schlüssel nicht leer), nichts anderes. */
  var KOPF = {
    shl: ['alg', 'enc', 'cty'],
    'ECDH-ES': ['alg', 'typ', 'cty', 'enc', 'vorgang', 'anbieter', 'epk', 'apv'],
    'PBES2-HS512+A256KW': ['alg', 'typ', 'cty', 'enc', 'vorgang', 'anbieter', 'p2s', 'p2c']
  };
  /* Größengrenze je Art, abgeleitet aus dem, was der Kern selbst höchstens erzeugt (Sec 16.10.), plus Rand:
     - link:  ein Mappe-Eintrag höchstens MAPPE_MAX_BYTES = 5 MB, als JWE in base64url etwa 6,7 MB → 8 MB.
     - eigen: Mappe höchstens MAPPE_GESAMT_HARTE_GRENZE_BYTES = 200 MB, der Umschlag verdoppelt (Kommentar dort) → 400 MB;
              Rand bis 450 MB, unter dem gemessenen Kipppunkt der Zeichenkette (etwa 510 MB, ebenda).
     - stelle: Antwort-JWE (nur freigegebene Felder) oder Ausschnitt-Datei; ein Ausschnitt ist höchstens eine Depot-Datei → wie eigen.
     Weg: grep -n "MAPPE_MAX_BYTES =\|MAPPE_GESAMT_HARTE_GRENZE_BYTES =" vivodepot.html */
  var MB = 1024 * 1024;
  var GRENZE = { link: 8 * MB, stelle: 450 * MB, eigen: 450 * MB };
  /* Je Art genau die erwartete Form (Sec 16.10.). */
  var FORM_JE_ART = { link: ['shl'], stelle: ['antwort', 'depot'], eigen: ['depot'] };
  function passtZurArt(text, art, bytes) {
    if (!GRENZE[art] || !(bytes <= GRENZE[art])) return false;
    var b = pruefen(text);
    return !b.fehler && FORM_JE_ART[art].indexOf(b.art) >= 0;
  }

  function nurFelder(kopf, erlaubt) { return Object.keys(kopf).every(function (k) { return erlaubt.indexOf(k) >= 0; }); }

  function b64urlText(s) {
    var b = s.replace(/-/g, '+').replace(/_/g, '/');
    while (b.length % 4) b += '=';
    if (typeof atob === 'function') return decodeURIComponent(escape(atob(b)));
    return Buffer.from(b, 'base64').toString('utf8');
  }

  function jweKompakt(text) {
    var teile = text.split('.');
    if (teile.length !== 5) return null;
    // Kopf, IV, Chiffrat und Tag sind nie leer; der verschlüsselte Schlüssel ist bei „dir“ leer.
    if (!B64URL.test(teile[0]) || !B64URL.test(teile[2]) || !B64URL.test(teile[3]) || !B64URL.test(teile[4])) return null;
    if (teile[1] !== '' && !B64URL.test(teile[1])) return null;
    var kopf;
    try { kopf = JSON.parse(b64urlText(teile[0])); } catch (_) { return null; }
    if (!kopf || typeof kopf !== 'object' || Array.isArray(kopf)) return null;
    return { kopf: kopf, schluesselLeer: teile[1] === '' };
  }

  function istUmschlag(u) {
    if (!u || typeof u !== 'object' || Array.isArray(u)) return false;
    for (var k in u) if (Object.prototype.hasOwnProperty.call(u, k) && HUELLE.indexOf(k) < 0) return false;
    var rumpf = u.pbkdf2 && typeof u.pbkdf2 === 'object' && typeof u.pbkdf2.salt === 'string'
      && typeof u.depotSalt === 'string' && typeof u.depotUUID === 'string';
    if (!rumpf) return false;
    var v3 = typeof u.iv === 'string' && typeof u.ct === 'string';
    var v4 = !!u.einheiten && typeof u.einheiten === 'object' && Array.isArray(u.umschlagTabelle) && u.umschlagTabelle.length > 0;
    return v3 !== v4;
  }

  /* text: der Dateiinhalt als Zeichenkette. Rückgabe { art } oder { fehler }. */
  function pruefen(text) {
    if (typeof text !== 'string' || text.length === 0) return { fehler: 'leer' };
    var t = text.trim();
    if (t.indexOf(DATEI_MAGIC) === 0) {
      var u;
      try { u = JSON.parse(t.slice(DATEI_MAGIC.length + 1)); } catch (_) { return { fehler: 'depot-datei-unlesbar' }; }
      return istUmschlag(u) ? { art: 'depot' } : { fehler: 'keine-depot-huelle' };
    }
    var j = jweKompakt(t);
    if (!j) return { fehler: 'kein-chiffrat' };
    if (j.kopf.enc !== 'A256GCM') return { fehler: 'verfahren-unbekannt' };
    if (j.kopf.alg === 'dir') {
      if (!j.schluesselLeer) return { fehler: 'kein-chiffrat' };
      return nurFelder(j.kopf, KOPF.shl) ? { art: 'shl' } : { fehler: 'kopf-fremdes-feld' };
    }
    if (j.kopf.alg === 'ECDH-ES' || j.kopf.alg === 'PBES2-HS512+A256KW') {
      // ECDH-ES direkt: der Inhaltsschlüssel wird abgeleitet, der Teil bleibt leer; PBES2 mit Schlüsselverpackung: nie leer.
      if ((j.kopf.alg === 'ECDH-ES') !== j.schluesselLeer) return { fehler: 'schluesselteil-passt-nicht' };
      return nurFelder(j.kopf, KOPF[j.kopf.alg]) ? { art: 'antwort' } : { fehler: 'kopf-fremdes-feld' };
    }
    return { fehler: 'verfahren-unbekannt' };
  }

  return { pruefen: pruefen, passtZurArt: passtZurArt, GRENZE: GRENZE, HUELLE: HUELLE, KOPF: KOPF };
});
