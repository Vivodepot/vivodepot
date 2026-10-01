'use strict';
// Prüfstellen-Angaben eines Zertifikats (Zertifikatsweg für externe Prüfer, 19.09.2026, U2-ADR-441):
// Rolle `pruefer`, Geltungsbereich (Sprachen, Modultypen), Laufzeit. Beide Ausstellwerkzeuge —
// `kundenzertifikat-ausstellen.js` (Treuhand-Schlüssel, der Regelweg ohne neue Anker-Zeremonie) und
// `behoerden-zertifikat-ausstellen.js` (Anker) — prüfen mit DERSELBEN Funktion, es gibt keine zweite Regel.
const MAX_MONATE_PRUEFER = 12;

const liste = (v) => (Array.isArray(v) ? v : String(v || '').split(',')).map((x) => String(x).trim()).filter(Boolean);
const kennung = /^[a-z][a-z0-9-]*$/;

// → { fehler: string|null, geltung: { modulTypen, sprachen }|null }
// `erlaubterTyp(anbieterTyp)`: darf dieser Typ die Rolle `pruefer` tragen? (Blatt unter der Treuhand: jeder
// gewöhnliche Typ außer `vivodepot/*`; Zwischenstufe unter dem Anker: `vivodepot/pruefstelle`.)
function pruefstellenAngabenPruefen({ rolle, anbieterTyp, sprachen, modulTypen, monate, erlaubterTyp }) {
  const s = liste(sprachen), m = liste(modulTypen);
  const gesetzt = s.length > 0 || m.length > 0;
  if (gesetzt && (!s.length || !m.length)) return { fehler: 'Ein Geltungsbereich braucht BEIDES: --sprachen und --modultypen.', geltung: null };
  if (gesetzt && ![...s, ...m].every((x) => kennung.test(x))) {
    return { fehler: 'Sprachen und Modultypen bestehen aus Kleinbuchstaben, Ziffern und Bindestrich (etwa fr oder textsatz).', geltung: null };
  }
  if (rolle !== 'pruefer') {
    return gesetzt
      ? { fehler: 'Ein Geltungsbereich gehört zur Rolle „pruefer" (--rolle pruefer).', geltung: null }
      : { fehler: null, geltung: null };
  }
  if (typeof erlaubterTyp === 'function' && !erlaubterTyp(anbieterTyp)) {
    return { fehler: 'Die Rolle „pruefer" ist für den Anbieter-Typ „' + anbieterTyp + '" nicht vorgesehen.', geltung: null };
  }
  if (!gesetzt) {
    return { fehler: 'Eine Prüfstelle braucht einen Geltungsbereich (--sprachen und --modultypen). Ohne ihn gilt sie im Kern nicht als Prüferin, es würde ein wirkungsloses Zertifikat ausgestellt.', geltung: null };
  }
  if (s.includes('de') || s.includes('en')) {
    return { fehler: 'Deutsch und Englisch sind app-eigen: kein Modul ersetzt ihren Wortlaut, eine Prüfstelle wird dafür nicht zugelassen.', geltung: null };
  }
  if (Number.isFinite(monate) && monate > MAX_MONATE_PRUEFER) {
    return { fehler: 'Ein Prüfstellen-Zertifikat gilt höchstens ' + MAX_MONATE_PRUEFER + ' Monate; angegeben sind ' + monate + '.', geltung: null };
  }
  return { fehler: null, geltung: { modulTypen: m, sprachen: s } };
}

module.exports = { pruefstellenAngabenPruefen, MAX_MONATE_PRUEFER };
