'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   achsenregister-bauen.js — der gemeinsame Bau-Kern für kleine Achsen-Register
   (Register-Katalog-Plan §6 Schritt 4, 14.09.2026: Rechtsraum, Sprache)
   ────────────────────────────────────────────────────────────────────────────
   EIN Bau-Kern, nicht einer je Achse — dieselbe Disziplin wie bei
   `_einbettenMitFassung` im Kern und wie `tools/lib/register-index.js` für den
   Katalog-Index selbst. Anders als das Feldregister (457 Einträge, eigene
   Gruppierung/Seite) tragen Rechtsraum/Sprache heute EINEN bzw. ZWEI Einträge —
   kein eigener HTML-Seitenbau hier (bewusst zurückgestellt, s. Bericht), nur
   die maschinenlesbaren Artefakte (JSON + Prüfsumme) und die Anbindung an den
   gemeinsamen Katalog-Index.

   STARTBESTAND WIRD GEMESSEN, NICHT ERFUNDEN — jeder Aufrufer (die beiden
   CLI-Werkzeuge) übergibt seine Einträge selbst; dieser Kern prüft nur die
   FORM (kein doppelter Wert, jedes Feld vorhanden), erfindet keinen Inhalt.
   ════════════════════════════════════════════════════════════════════════════ */
const crypto = require('node:crypto');

function hashVonText(text) {
  return crypto.createHash('sha256').update(Buffer.from(text, 'utf8')).digest('hex');
}

function pruefsummenZeile(hash, dateiName) {
  return hash + '  ' + dateiName + '\n';
}

/* Baut das Register-JSON. `eintraege` trägt bereits die achsen-eigene Form
   (z. B. `{rechtsraum, label, status, quelle}`); dieser Kern ergänzt nur die
   gemeinsame Hülle (Kopfzeile/Fassung/Schlüsselraum/Anzahl) — GENAU wie
   `registerJson()` im Feldregister, hier verallgemeinert. */
function achsenRegisterJson({ schluesselraum, kopfzeile, herkunft, eintraege, fassung }) {
  return JSON.stringify({
    hinweis: kopfzeile,
    fassung: { datum: fassung.datum, kern: fassung.kern },
    schluesselraum,
    anzahl: eintraege.length,
    herkunft,
    eintraege,
  }, null, 2) + '\n';
}

/* Formprüfung — wirft benannt, statt still ein falsches Register zu erzeugen
   (dasselbe Prinzip wie `tools/feldregister-bauen.js`s Status-Prüfung). */
const STATUS_ERLAUBT = Object.freeze(['permanent', 'deprecated', 'obsoleted']);
function eintraegeFormPruefen(eintraege, schluesselFeld) {
  const gesehen = new Set();
  for (const e of eintraege) {
    if (!e || typeof e !== 'object') throw new Error('achsenregister-bauen: Eintrag ist kein Objekt.');
    const wert = e[schluesselFeld];
    if (typeof wert !== 'string' || !wert.trim()) {
      throw new Error('achsenregister-bauen: Eintrag ohne gültiges Feld "' + schluesselFeld + '".');
    }
    if (gesehen.has(wert)) throw new Error('achsenregister-bauen: doppelter Wert "' + wert + '" — jeder Eintrag muss eindeutig sein.');
    gesehen.add(wert);
    if (!e.label || typeof e.label.de !== 'string' || typeof e.label.en !== 'string') {
      throw new Error('achsenregister-bauen: Eintrag "' + wert + '" ohne label.de/label.en.');
    }
    if (STATUS_ERLAUBT.indexOf(e.status) < 0) {
      throw new Error('achsenregister-bauen: Eintrag "' + wert + '" trägt unbekannten Status "' + e.status + '".');
    }
    if (typeof e.quelle !== 'string' || !e.quelle.trim()) {
      throw new Error('achsenregister-bauen: Eintrag "' + wert + '" ohne "quelle" (Herkunftsangabe).');
    }
  }
}

module.exports = {
  hashVonText, pruefsummenZeile, achsenRegisterJson, eintraegeFormPruefen, STATUS_ERLAUBT,
};
