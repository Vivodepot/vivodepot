'use strict';
/* Der Kern im Wortlaut ab Werk — für Proben, die eine CSS-Regel als Text lesen.
   ────────────────────────────────────────────────────────────────────────────
   U2-ADR-473 (v894) hat die gestaltenden Rohwerte in Rollen-Tokens gezogen: aus
   `border-radius: 12px` wurde `border-radius: var(--radius-toast)`, und
   `--radius-toast: 12px` steht im Block „ERSCHEINUNGSBILD-TOKENS" in :root.
   Proben, die vorher `border-radius:\s*12px` im Regeltext suchten, sagen etwas
   über das AUSSEHEN AB WERK — und das ist unverändert. Dieser Helfer setzt darum
   genau die Tokens dieses Blocks auf ihre :root-Definition zurück und liefert den
   Text, den die Probe meint. Andere Tokens (`var(--line)`, `var(--fs-sm)`) bleiben
   stehen: viele Proben verlangen gerade den Bezug.

   Ändert ein Profil ab Werk (v898) einen dieser Werte, sehen die Proben den neuen
   Wert — so soll es sein: sie halten das Aussehen ab Werk fest, nicht eine Zahl. */
const MARKE = 'ERSCHEINUNGSBILD-TOKENS';

function erscheinungTokens(html) {
  const start = html.indexOf(MARKE);
  if (start < 0) return {};
  const ende = html.indexOf('\n  }', start);
  const block = html.slice(start, ende).replace(/\/\*[\s\S]*?\*\//g, '');
  return Object.fromEntries([...block.matchAll(/(--[a-z0-9-]+)\s*:\s*([^;]+);/g)].map((m) => [m[1], m[2].trim()]));
}

function abWerkWortlaut(html) {
  // v894: das Gerüst trägt die Werte nicht mehr; ohne den Block erst „Gerüst + heute" herstellen.
  const H = require('./kern-mit-erscheinungsbild.js');
  if (H.istGeruestOhneWerte(html)) html = H.kernMitHeute(html);
  const t = erscheinungTokens(html);
  const namen = Object.keys(t);
  if (!namen.length) return html;
  // Nur Bezüge OHNE Rückfall auf genau diese Namen; der Block selbst bleibt unangetastet.
  const re = new RegExp('var\\(\\s*(' + namen.map((n) => n.replace(/[-]/g, '\\-')).join('|') + ')\\s*\\)', 'g');
  const start = html.indexOf(MARKE);
  const ende = html.indexOf('\n  }', start);
  const ersetze = (s) => { let alt; do { alt = s; s = s.replace(re, (_, n) => t[n]); } while (s !== alt); return s; };
  return ersetze(html.slice(0, start)) + html.slice(start, ende) + ersetze(html.slice(ende));
}

module.exports = { abWerkWortlaut, erscheinungTokens };
