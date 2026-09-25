'use strict';
/* Achsen-Erlaubnisliste v1 — Beispiel-Instanz für das Manifest (Block D, Entwurf 07.09.2026).
   Gespiegelt aus den elf bestehenden EINLASS_REGISTER-Typen (vivodepot.html:24699, s. Entwurf
   Abschnitt 1.1) — nicht neu erfunden. WELCHE Achsen ein echtes Vivodepot-Manifest führen darf
   (und ob die Manifest-Ebene dieselben Typ-Namen wie das Einlass-Register trägt oder eigene,
   z. B. "sprache" statt "textsatz") ist eine noch offene Produktentscheidung (Entwurf, Fußnote
   zu "erscheinung": „keine Behauptung, es gebe sie schon") — diese Datei ist darum eine
   BEISPIEL-Instanz für den Wächter-Bau (D2), keine verbindliche Vivodepot-Festlegung. */
const ACHSEN_ERLAUBNIS_V1 = Object.freeze({
  version: '2026-09-07-a',
  achsen: Object.freeze([
    'textsatz', 'stellensatz', 'rechtsraum', 'institutionsArt', 'format',
    'bereich', 'situation', 'wizard', 'ereignisAchse', 'branding', 'logikModul',
  ]),
});

module.exports = { ACHSEN_ERLAUBNIS_V1 };
