'use strict';
/* ══════════════════════════════════════════════════════
   v515-rest.js — was vom Unterschied zu v515 übrig bleibt, wenn der Kennungs-Umbau
   herausgerechnet ist (16.09.2026)
   ──────────────────────────────────────────────────────
   WARUM: tools/v515-vergleichen.js meldete nach dem Umbau „26 von 26 Aufnahmen weichen ab" — wahr,
   aber stumpf. Von Hand gemessen waren 1331 von 1529 Diff-Blöcken reine Umbenennungen und nur 198
   echte Weiterentwicklung. Ein Prüfstein, der den Umbau zählt statt den Unterschied, beantwortet
   die Frage der DoD nicht. Dieses Modul rechnet den Umbau heraus und benennt den Rest.

   WIE, in drei reinen Schritten:
     1  grundlinieUebersetzen: die v515-Aufnahme bekommt die heutigen Kennungen — NUR in den
        Attributen, die Kennungen tragen (data-feld, data-edit, data-sektor-id, data-eintrag…,
        for, name, id), NUR Token, die die Umbau-Tabelle kennt, und je Bereich zuerst die Paare
        DIESES Bereichs (Feldnamen wie `notiz` wiederholen sich über Bereiche). `data-typ` und
        `data-eingabetyp` tragen Typen, keine Kennungen, und bleiben. Sektions-IDs (`sek-person`)
        stehen nicht in der Tabelle und bleiben damit von selbst deutsch, wie die Regel es will.
     2  restBloecke: Token-Diff (Myers) zwischen übersetzter Grundlinie und heutiger Aufnahme —
        die Zahl der Änderungsblöcke und die ersten Beispiele, benannt.
     3  ratscheBewerten: Rest je Aufnahme gegen eine Grundlinie; rot nur, wenn ein Rest WÄCHST
        oder eine Aufnahme mit Rest neu dazukommt.

   Keine Prozesse, kein git, kein Netz — rein über Zeichenketten und die Tabelle.
   ══════════════════════════════════════════════════════ */

const KENNUNGS_ATTRIBUTE = /\b(data-[a-z-]+|id|name|for)="([^"]*)"/g;
const TYP_ATTRIBUTE = new Set(['data-typ', 'data-eingabetyp']);
const TOKEN = /[A-Za-z_][A-Za-z0-9_]*/g;

/* Paare alt→neu aus der Umbau-Tabelle. `bereichsweise[bereichAlt]` enthält die Segment-Paare der
   Einträge dieses Bereichs; `global` nur Paare, die über alle Bereiche EINDEUTIG sind, plus die
   Bereichs-IDs selbst. Ein mehrdeutiger Token ohne Bereichspaar bleibt unübersetzt und zählt als
   Rest — lieber einen Rest zu viel melden als eine Umbenennung zu erfinden. */
function umbauPaare(tabelle) {
  const bereichsweise = Object.create(null);
  const kandidaten = Object.create(null);
  const bereiche = Object.create(null);
  for (const e of tabelle || []) {
    if (!e || !e.kennungAlt || !e.kennungNeu) continue;
    if (e.bereichAlt && e.bereichNeu) bereiche[e.bereichAlt] = e.bereichNeu;
    const alt = e.kennungAlt.split(/[./]/), neu = e.kennungNeu.split(/[./]/);
    if (alt.length !== neu.length) continue;
    const eigen = bereichsweise[e.bereichAlt] || (bereichsweise[e.bereichAlt] = Object.create(null));
    for (let i = 0; i < alt.length; i++) {
      if (alt[i] === neu[i]) continue;
      eigen[alt[i]] = neu[i];
      (kandidaten[alt[i]] || (kandidaten[alt[i]] = new Set())).add(neu[i]);
    }
  }
  const global = Object.create(null);
  for (const [alt, neue] of Object.entries(kandidaten)) if (neue.size === 1) global[alt] = [...neue][0];
  for (const [alt, neu] of Object.entries(bereiche)) global[alt] = neu;
  return { bereichsweise, global };
}

function grundlinieUebersetzen(html, bereichAlt, paare) {
  const eigen = (paare.bereichsweise && paare.bereichsweise[bereichAlt]) || Object.create(null);
  const nachschlagen = (t) => (eigen[t] !== undefined ? eigen[t] : (paare.global[t] !== undefined ? paare.global[t] : t));
  return String(html).replace(KENNUNGS_ATTRIBUTE, (voll, attr, wert) => {
    if (TYP_ATTRIBUTE.has(attr)) return voll;
    return attr + '="' + wert.replace(TOKEN, nachschlagen) + '"';
  });
}

function tokenisieren(html) {
  return String(html).match(/[A-Za-z_][A-Za-z0-9_\-]*|[^A-Za-z_\s]/g) || [];
}

/* Myers-Diff (O(ND)) über Token — liefert die Änderungsblöcke als [aVon, aBis, bVon, bBis].
   Die Aufnahmen sind einige tausend Token lang, der Rest einige Dutzend Blöcke: O(ND) bleibt klein,
   wo eine volle LCS-Tabelle (O(N·M)) hier Millionen Zellen bräuchte. */
function aenderungsBloecke(a, b) {
  const n = a.length, m = b.length, max = n + m;
  const v = new Map([[1, 0]]);
  const spur = [];
  let gefunden = false;
  for (let d = 0; d <= max && !gefunden; d++) {
    spur.push(new Map(v));
    for (let k = -d; k <= d; k += 2) {
      let x = (k === -d || (k !== d && (v.get(k - 1) ?? -1) < (v.get(k + 1) ?? -1))) ? (v.get(k + 1) ?? 0) : (v.get(k - 1) ?? 0) + 1;
      let y = x - k;
      while (x < n && y < m && a[x] === b[y]) { x++; y++; }
      v.set(k, x);
      if (x >= n && y >= m) { gefunden = true; break; }
    }
  }
  // Rückweg: welche Positionen gehören zum gemeinsamen Teil?
  const gleichA = new Uint8Array(n), gleichB = new Uint8Array(m);
  let x = n, y = m;
  for (let d = spur.length - 1; d >= 0 && (x > 0 || y > 0); d--) {
    const vd = spur[d];
    const k = x - y;
    const vonOben = (k === -d || (k !== d && (vd.get(k - 1) ?? -1) < (vd.get(k + 1) ?? -1)));
    const kVor = vonOben ? k + 1 : k - 1;
    const xVor = vd.get(kVor) ?? 0, yVor = xVor - kVor;
    while (x > xVor && y > yVor && x > 0 && y > 0 && a[x - 1] === b[y - 1]) { x--; y--; gleichA[x] = 1; gleichB[y] = 1; }
    if (d > 0) { x = xVor; y = yVor; }
  }
  while (x > 0 && y > 0 && a[x - 1] === b[y - 1]) { x--; y--; gleichA[x] = 1; gleichB[y] = 1; }
  // Blöcke: zusammenhängende Läufe von Nicht-Gleichem, parallel über beide Seiten.
  const bloecke = [];
  let i = 0, j = 0;
  while (i < n || j < m) {
    if (i < n && j < m && gleichA[i] && gleichB[j]) { i++; j++; continue; }
    const aVon = i, bVon = j;
    while (i < n && !gleichA[i]) i++;
    while (j < m && !gleichB[j]) j++;
    if (i === aVon && j === bVon) { if (i < n) i++; if (j < m) j++; continue; }
    bloecke.push([aVon, i, bVon, j]);
  }
  return bloecke;
}

function restBloecke(soll, ist, { beispiele = 5 } = {}) {
  const a = tokenisieren(soll), b = tokenisieren(ist);
  const bloecke = aenderungsBloecke(a, b);
  return {
    anzahl: bloecke.length,
    beispiele: bloecke.slice(0, beispiele).map(([av, ab, bv, bb]) => ({
      v515: a.slice(av, ab).join(' ').slice(0, 80),
      heute: b.slice(bv, bb).join(' ').slice(0, 80),
    })),
  };
}

/* Die Ratsche. `grundlinie` = { produkt: { aufnahme: anzahl } }. ROT nur bei Wachstum und bei einer
   Aufnahme mit Rest, die die Grundlinie nicht kennt; ein geschrumpfter Rest ist ein Hinweis
   („Grundlinie nachziehen"), kein Fehler. */
function ratscheBewerten(ist, grundlinie) {
  const gewachsen = [], neu = [], geschrumpft = [];
  for (const [produkt, aufnahmen] of Object.entries(ist || {})) {
    const bekannt = (grundlinie && grundlinie[produkt]) || {};
    for (const [name, anzahl] of Object.entries(aufnahmen)) {
      if (!(name in bekannt)) { if (anzahl > 0) neu.push(produkt + '/' + name + ' (' + anzahl + ')'); continue; }
      if (anzahl > bekannt[name]) gewachsen.push(produkt + '/' + name + ': ' + bekannt[name] + ' -> ' + anzahl);
      else if (anzahl < bekannt[name]) geschrumpft.push(produkt + '/' + name + ': ' + bekannt[name] + ' -> ' + anzahl);
    }
  }
  return { rot: gewachsen.length > 0 || neu.length > 0, gewachsen, neu, geschrumpft };
}

module.exports = {
  umbauPaare, grundlinieUebersetzen, tokenisieren, aenderungsBloecke, restBloecke, ratscheBewerten,
  KENNUNGS_ATTRIBUTE, TYP_ATTRIBUTE,
};
