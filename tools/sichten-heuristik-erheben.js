'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   sichten-heuristik-erheben.js — belegt die Grenze der Sicht-Ableitung
   (tests/e2e/sichten-erfassen.js, „B6a")
   ────────────────────────────────────────────────────────────────────────────
   DER EINWAND, DER DIESES WERKZEUG NÖTIG MACHTE (06.09.2026): eine
   Ableitung über `oeffne`/`render`/`flow`-Namen ist selbst eine Landkarte — ein
   Einstiegspunkt, der anders heißt, entkommt ihr lautlos (U2-ADR-322s Einwand,
   hier auf eine andere Ableitung angewandt). Nachgemessen am Kanon (06.09.2026,
   2308224a): eine Heuristik über den FUNKTIONSRUMPF (statt über den Namen)
   findet fünf echte, eigenständig gerenderte Sichten außerhalb des Namens-
   musters — `wiedereinstiegHinweisZeigen`, `zeigeInternenWiedereintritt`,
   `passwortWechselAbschlussZeigen`, `notfallblattOeffnen`, `zeigeSchlussSicht`.
   Von Hand geprüft (nicht nur gezählt): jede rendert einen eigenen Inhalt
   (eigenes `koerperHTML`/`innerHTML`), keine ist nur ein Umweg zu einer
   bereits gezählten Sicht.

   Der Rest der rohen Treffer ist das GEGENTEIL — Beleg, warum „ausgewiesen"
   mehr heißt als „gefunden": Orchestratoren, Schließer, Wizard-Schrittsteuerung,
   reine Event-Verdrahtung und Speicher-Status-Buchhaltung, die alle nur eine
   bereits gezählte oeffne/render/flow-Funktion aufrufen, statt selbst Inhalt
   zu rendern. Die vollständige, benannte Liste mit Grund je Gruppe steht in
   `tests/sichten-heuristik-guard.test.js` (`AUSGESCHLOSSENE_FEHLALARME`) — hier
   nicht dupliziert, um die beiden Listen nicht auseinanderlaufen zu lassen.
   Alle unterstrichenen `_xxx`-Namen sind interne Helfer nach der Konvention
   dieses Kerns (z. B. `_bereichAusBuendelErzeugen`) und werden von der
   Heuristik von vornherein ausgenommen.

   WAS DIESES WERKZEUG NICHT TUT: es leitet KEINE Kennung her (dieselbe
   Zurückhaltung wie U2-ADR-322). Es liefert nur die ROHEN Kandidaten einer
   Rumpf-Heuristik — welche davon echte zusätzliche Sichten sind, entscheidet
   die benannte Liste in tests/e2e/sichten-erfassen.js, von Hand geprüft. Der
   Test daneben (tests/sichten-heuristik-guard.test.js) hält NUR fest: taucht
   ein Kandidat auf, der WEDER im Namensmuster NOCH in der benannten Liste
   steht, ist das ein FUND — die Ausbeute-Zusicherung selbst geht dann rot,
   nicht durch eine stillschweigend erweiterte Ausnahme.
   ════════════════════════════════════════════════════════════════════════════ */

// Nullstellige Top-Level-Funktionsdeklarationen, deren Name NICHT dem
// oeffne/render/flow-Muster folgt und deren Rumpf typische Render-Marker trägt.
// `quelltext` ist der volle HTML-Text (vivodepot.html oder ein Fixture-String).
function heuristikKandidaten(quelltext) {
  const re = /^\s*function\s+([A-Za-z0-9_]+)\s*\(\s*\)\s*\{/gm;
  const kandidaten = [];
  let m;
  while ((m = re.exec(quelltext))) {
    const name = m[1];
    if (/^(oeffne|render|flow)/.test(name)) continue;   // schon in den drei Klassen
    if (name.startsWith('_')) continue;                 // Konvention: interner Helfer
    let i = re.lastIndex, tiefe = 1, j = i;
    while (tiefe > 0 && j < quelltext.length) {
      if (quelltext[j] === '{') tiefe++;
      else if (quelltext[j] === '}') tiefe--;
      j++;
    }
    const rumpf = quelltext.slice(i, j);
    // Direkter Marker (eigenes koerperHTML/innerHTML) ODER ein Aufruf eines PARAMETRISIERTEN
    // render*-Wegs — `zeigeInternenWiedereintritt` zeigt, warum die zweite Hälfte nötig ist: der
    // Rumpf selbst rendert nichts, ruft aber `renderCryptoOverlay(null, true)` auf, eine
    // render*-Funktion, die WEGEN ihrer Parameter nicht in Klasse 3 (nullstellig) fällt. Ohne
    // diesen Zweig wäre der Wrapper unsichtbar für beide: die Namens-Ableitung (falscher Name)
    // UND die Rumpf-Heuristik (kein eigener Render-Marker).
    if (/innerHTML\s*=|ui\.modal\(|\brender[A-Za-z0-9_]*\(/.test(rumpf)) kandidaten.push(name);
  }
  return kandidaten;
}

module.exports = { heuristikKandidaten };
