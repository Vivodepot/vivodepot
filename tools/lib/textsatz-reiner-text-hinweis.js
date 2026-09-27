'use strict';
/* Hinweis für Übersetzende (16.09.2026, v1-Blocker Sicherheit): der Kern verwirft einen Textsatz-Wert, der
   kein reiner Text ist (Grund `kein-reiner-text`) — ein Tag, eine Zeichenreferenz oder ein ASCII-
   Anführungszeichen. Wer ein Modul erzeugt, soll das beim Erstellen sehen, mit dem Grund und dem
   Vorschlag, nicht erst als abgelehnte Kennung beim Einlass. Gemeinsam genutzt von
   tools/textsatz-de-modul-erzeugen.js und tools/textsatz-en-modul-erzeugen.js. */
const VORSCHLAG = Object.freeze({ de: '„…“', en: '“…”' });

function reinerTextHinweise(verworfene, texte, sprache) {
  const zeilen = [];
  for (const v of verworfene || []) {
    if (!v || v.grund !== 'kein-reiner-text') continue;
    const wert = texte && typeof texte[v.kennung] === 'string' ? texte[v.kennung] : '';
    const warum = wert.includes('"')
      ? 'ASCII-Anführungszeichen " — typografisch setzen: ' + (VORSCHLAG[sprache] || VORSCHLAG.en)
      : (/</.test(wert) ? 'ein Tag (kleiner-als vor Buchstabe) — Beschriftungen sind reiner Text'
        : 'eine Zeichenreferenz (&#… oder &name;) — das Zeichen selbst schreiben');
    zeilen.push(v.kennung + ': ' + warum + ' · Wert: ' + wert.slice(0, 80));
  }
  return zeilen;
}

module.exports = { reinerTextHinweise };
