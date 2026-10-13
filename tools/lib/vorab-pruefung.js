'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   vorab-pruefung.js — die Vorab-Prüfung für Herausgeber als reine Funktion (U2-ADR-496, 10.10.2026)
   ────────────────────────────────────────────────────────────────────────────
   Ein Dokument hinein (Modul, Vorlage, Anfrage oder Einreichungs-Paket), ein Urteil heraus, je Zeile mit der Kennung der
   Regel aus docs/pruefregeln/pruefregeln.json. Diese Datei liest keine Datei, kennt keinen Schlüssel, kein Netz und keine
   Identität: Regeln, Kern-Prüfer und Fingerabdruck-Funktion kommen als Argumente herein. Die Hülle mit Dateizugriff ist
   tools/vorlage-pruefen.js.

   Das Urteil fällt der Kern, nicht diese Datei. Sie ruft die Prüfer der Bürger-App (über `kern`) und übersetzt deren
   Ablehnungsgrund in eine Regelkennung. Eine eigene Regel prüft sie nicht; was der Kern nicht prüft, steht hier nicht.

   Vier Urteile:
     bestanden     — der Kern nimmt das Dokument an und verwirft nichts.
     gemeldet      — der Kern nimmt es an, verwirft aber Teile; jede Verwerfung steht als Zeile da.
     abgewiesen    — der Kern nimmt es nicht an; die Zeile nennt die Regel.
     nichtGeprueft — für diese Art gibt es keinen Regelsatz, oder die Prüfung warf oder lieferte etwas Unerwartetes.
                     Nie „bestanden“ (U2-ADR-483 Nr. 4 und 5).

   Geprüft werden Form und Regeln. Ob der Inhalt richtig ist, prüft niemand (U2-ADR-097 Festlegung 8).

   Der Fingerabdruck des Inhalts kommt aus der Funktion, die der Aufrufer mitgibt; diese Datei legt keine Kanonisierung
   fest. Ohne Funktion bleibt das Feld null.
   ════════════════════════════════════════════════════════════════════════════ */

const URTEILE = Object.freeze(['bestanden', 'gemeldet', 'abgewiesen', 'nichtGeprueft']);
const SCHWEREN = Object.freeze(['abweisung', 'meldung', 'hinweis']);
const KEIN_URTEIL_UEBER_DIE_DATEI = Object.freeze(['fehler', 'kein-depot', 'vorfuehrung']);

/* Regeln nach Art und Kern-Grund auffindbar machen. Wirft bei einer doppelten Kennung: zwei Regeln mit derselben Kennung
   wären zwei Wahrheiten. */
function regelIndex(regeln) {
  const nachKennung = new Map();
  const nachArt = new Map();
  for (const r of (regeln && regeln.regeln) || []) {
    if (nachKennung.has(r.kennung)) throw new Error('vorab-pruefung: Regelkennung doppelt: ' + r.kennung);
    nachKennung.set(r.kennung, r);
    if (!nachArt.has(r.art)) nachArt.set(r.art, []);
    nachArt.get(r.art).push(r);
  }
  return { nachKennung, nachArt };
}

/* Welche Regel gehört zu diesem Grund des Kerns? `abgleich` sagt, wie verglichen wird: `gleich` (der Grund ist ein
   Kennwort), `anfang` oder `ende` (der Grund ist ein Satz des Kerns mit angehängtem oder vorangestelltem Namen).
   Bei mehreren Treffern gewinnt der längste Abgleich. */
function regelFinden(index, art, kernGrund) {
  if (typeof kernGrund !== 'string') return null;
  let beste = null;
  for (const r of index.nachArt.get(art) || []) {
    const k = r.kernGrund;
    if (typeof k !== 'string') continue;
    const trifft = r.abgleich === 'anfang' ? kernGrund.startsWith(k)
      : r.abgleich === 'ende' ? kernGrund.endsWith(k)
      : kernGrund === k;
    if (trifft && (!beste || k.length > beste.kernGrund.length)) beste = r;
  }
  return beste;
}

/* Die Art eines Dokuments, an seiner Form erkannt. Reihenfolge: Umschlag auspacken, dann das Eindeutige zuerst.
   Rückgabe { art, dokument, umschlag } — `dokument` ist der Gegenstand der Prüfung (im Umschlag: das Modul darin). */
function artErkennen(dokument, registerTypen) {
  let d = dokument, umschlag = false;
  if (d && typeof d === 'object' && !Array.isArray(d) && typeof d.modulSignaturJws === 'string'
      && d.modul && typeof d.modul === 'object') {
    d = d.modul; umschlag = true;
  }
  if (!d || typeof d !== 'object' || Array.isArray(d)) return { art: null, dokument: d, umschlag };
  if (typeof d.modulTyp === 'string') {
    if (d.modulTyp === 'anfrage') return { art: 'anfrage', dokument: d, umschlag };
    if (registerTypen.indexOf(d.modulTyp) >= 0) return { art: d.modulTyp, dokument: d, umschlag };
    if (d.modulTyp === 'design') return { art: 'design', dokument: d, umschlag };
    return { art: null, dokument: d, umschlag };
  }
  if (d.anfrageVersion != null) return { art: 'anfrage', dokument: d, umschlag };
  if (Array.isArray(d.templates) && d.anbieter && typeof d.anbieter === 'object') return { art: 'einreichung', dokument: d, umschlag };
  if (Array.isArray(d.felder)) return { art: 'vorlage', dokument: d, umschlag };
  return { art: null, dokument: d, umschlag };
}

function fundstelleAus(v) {
  if (!v || typeof v !== 'object') return null;
  for (const k of ['schluessel', 'id', 'kennung', 'typ', 'feld', 'pfad']) {
    if (typeof v[k] === 'string' && v[k]) return k + ': ' + v[k];
  }
  return null;
}

/* Die Prüfung. `opts`:
     regeln                — der Inhalt von docs/pruefregeln/pruefregeln.json
     regelnFingerabdruck   — SHA-256 der Regeldatei, vom Aufrufer gerechnet (diese Datei liest sie nicht)
     kern                  — { fassung, fingerabdruck, registerTypen, nurGeprueft, einlassen(modul), registerPruefen(typ, modul),
                               designPruefen(modul), vorlagePruefen(vorlage), anfragePruefen(anfrage) }
     schemaPruefen         — optional: (art, dokument) → null (nicht geprüft) | [] | [{ fundstelle, text }]
     fingerabdruck         — optional: (dokument) → Zeichenkette
     art                   — optional: die Art erzwingen statt erkennen
     sprache               — 'de' (Vorgabe) oder 'en' für den Satz in `grund` */
function pruefeEinreichung(dokument, opts) {
  const o = opts || {};
  const regeln = o.regeln || { regeln: [] };
  const kern = o.kern || {};
  const sprache = o.sprache === 'en' ? 'en' : 'de';
  const index = regelIndex(regeln);
  const registerTypen = Array.isArray(kern.registerTypen) ? kern.registerTypen : [];
  const zeilen = [];
  const satz = (r) => (r && r.satz && (r.satz[sprache] || r.satz.de)) || null;
  const zeile = (kennung, extra) => {
    const r = index.nachKennung.get(kennung) || null;
    zeilen.push(Object.assign({
      regel: r ? r.kennung : null, grund: satz(r), fundstelle: null,
      schwere: r ? r.schwere : 'abweisung', quelle: 'vorab-pruefung', kernGrund: null,
    }, extra || {}));
  };
  const kernZeile = (art, kernGrund, quelle, extra) => {
    /* Erst die Regel der Art, dann die allgemeine: `sprache` heißt beim Sprachmodul etwas anderes als im Einlassweg. */
    const r = regelFinden(index, art, kernGrund) || regelFinden(index, 'allgemein', kernGrund);
    zeilen.push(Object.assign({
      regel: r ? r.kennung : null, grund: satz(r) || String(kernGrund), fundstelle: null,
      schwere: r ? r.schwere : 'abweisung', quelle, kernGrund: String(kernGrund),
    }, extra || {}));
  };

  const erkannt = o.art ? { art: o.art, dokument, umschlag: false } : artErkennen(dokument, registerTypen);
  const d = erkannt.dokument;
  let urteil = null;
  /* Das schwerere Urteil gewinnt. Eine sichere Abweisung wiegt mehr als ein Teil, der nicht geprüft werden konnte. */
  const RANG = { bestanden: 0, gemeldet: 1, nichtGeprueft: 2, abgewiesen: 3 };
  const setze = (u) => { if (urteil === null || RANG[u] > RANG[urteil]) urteil = u; };

  try {
    if (erkannt.umschlag) zeile('allgemein.signatur-nicht-geprueft');
    if (!erkannt.art) {
      zeile('allgemein.unbekannte-art');
      setze('nichtGeprueft');
    } else if (erkannt.art === 'vorlage') {
      vorlage(d, null);
    } else if (erkannt.art === 'einreichung') {
      einreichung(d);
    } else if (erkannt.art === 'anfrage') {
      ergebnisform('anfrage', kern.anfragePruefen, d, 'anfragePruefen');
    } else if (erkannt.art === 'design') {
      ergebnisform('design', kern.designPruefen, d, 'designModulPruefen');
    } else if (registerTypen.indexOf(erkannt.art) >= 0) {
      register(erkannt.art, d);
    } else {
      zeile('allgemein.unbekannte-art');
      setze('nichtGeprueft');
    }
    schema(erkannt.art, d);
  } catch (e) {
    /* Fehlrichtung: wirft etwas, heißt das Urteil nie „bestanden“. */
    zeile('allgemein.pruefung-nicht-moeglich', { kernGrund: String(e && e.message || e) });
    urteil = 'nichtGeprueft';
  }
  if (urteil === null) urteil = 'bestanden';

  let inhaltsFingerabdruck = null;
  if (typeof o.fingerabdruck === 'function') {
    try { inhaltsFingerabdruck = String(o.fingerabdruck(d)); } catch (e) { inhaltsFingerabdruck = null; }
  }
  return {
    urteil,
    art: erkannt.art,
    zeilen,
    regelFassung: regeln.fassung != null ? regeln.fassung : null,
    pruefregelnFingerabdruck: o.regelnFingerabdruck || null,
    kernFassung: kern.fassung || null,
    kernFingerabdruck: kern.fingerabdruck || null,
    inhaltsFingerabdruck,
  };

  /* ── Ein Modul eines Registers: der Einlassweg der Bürger-App selbst ── */
  function register(art, modul) {
    if (typeof kern.einlassen !== 'function') return fehlt(art);
    let r = kern.einlassen(modul);
    if (!r || typeof r !== 'object' || typeof r.angenommen !== 'boolean') return unerwartet(art);
    /* Ein Register, das nur signierte Module einlässt: die Form wird trotzdem geprüft, der Hinweis steht daneben. */
    if (!r.angenommen && r.grund === 'nur-signiert-erlaubt') {
      zeile('allgemein.nur-signiert-erlaubt');
      if (typeof kern.registerPruefen !== 'function') return fehlt(art);
      const p = kern.registerPruefen(art, modul);
      if (!p || typeof p !== 'object' || typeof p.gueltig !== 'boolean') return unerwartet(art);
      r = { angenommen: p.gueltig, grund: p.grund, verworfene: p.verworfene || [] };
    }
    verworfene(art, r.verworfene, 'modulEinlassen');
    if (!r.angenommen) {
      kernZeile(art, r.grund, 'modulEinlassen');
      /* Diese Gründe sagen nichts über die Datei: die Prüfung warf, oder die App war nicht in dem Zustand, in dem sie prüft. */
      return setze(KEIN_URTEIL_UEBER_DIE_DATEI.indexOf(r.grund) >= 0 ? 'nichtGeprueft' : 'abgewiesen');
    }
    if (r.unvollstaendig) setze('gemeldet');
  }

  /* ── Ein Prüfer mit der Ergebnisform { gueltig, grund, verworfene } ── */
  function ergebnisform(art, pruefer, gegenstand, quelle) {
    if (typeof pruefer !== 'function') return fehlt(art);
    const p = pruefer(gegenstand);
    if (!p || typeof p !== 'object' || typeof p.gueltig !== 'boolean') return unerwartet(art);
    verworfene(art, p.verworfene, quelle);
    if (!p.gueltig) { kernZeile(art, p.grund, quelle); setze('abgewiesen'); }
  }

  /* ── Eine Vorlage: der Kern antwortet mit null (in Ordnung) oder einem Satz ── */
  function vorlage(tpl, ort) {
    if (typeof kern.vorlagePruefen !== 'function') return fehlt('vorlage');
    const fehler = kern.vorlagePruefen(tpl);
    if (fehler === null || fehler === undefined) return;
    if (typeof fehler !== 'string') return unerwartet('vorlage');
    kernZeile('vorlage', fehler, 'validateTemplate', { fundstelle: ort });
    setze('abgewiesen');
  }

  /* ── Ein Einreichungs-Paket: das Schema des Pakets, dann jede Vorlage darin ── */
  function einreichung(paket) {
    if (!paket.templates.length) { zeile('einreichung.ohne-vorlage'); return setze('abgewiesen'); }
    const s = typeof o.schemaPruefen === 'function' ? o.schemaPruefen('einreichung', paket) : null;
    if (s === null) { zeile('allgemein.schema-nicht-geprueft'); setze('nichtGeprueft'); }
    else if (s.length) {
      for (const f of s) zeile('einreichung.schema', { fundstelle: f.fundstelle || null, kernGrund: f.text || null, quelle: 'schema' });
      setze('abgewiesen');
    }
    paket.templates.forEach((t, i) => vorlage(t, 'templates[' + i + ']'));
  }

  /* ── Das Schema der Art als zweite Stimme: es kippt das Urteil nicht, es nennt die Stelle ── */
  function schema(art, gegenstand) {
    if (!art || art === 'einreichung' || typeof o.schemaPruefen !== 'function') return;
    const s = o.schemaPruefen(art, gegenstand);
    if (!s) return;
    for (const f of s) zeile('allgemein.schema', { fundstelle: f.fundstelle || null, kernGrund: f.text || null, quelle: 'schema' });
  }

  function verworfene(art, liste, quelle) {
    if (!Array.isArray(liste) || !liste.length) return;
    for (const v of liste) {
      zeile('allgemein.teil-verworfen', { fundstelle: fundstelleAus(v), kernGrund: v && typeof v.grund === 'string' ? v.grund : null, quelle });
    }
    setze('gemeldet');
  }
  function fehlt(art) { zeile('allgemein.pruefung-nicht-moeglich', { fundstelle: art }); setze('nichtGeprueft'); }
  function unerwartet(art) { zeile('allgemein.pruefung-nicht-moeglich', { fundstelle: art }); setze('nichtGeprueft'); }
}

module.exports = { URTEILE, SCHWEREN, pruefeEinreichung, artErkennen, regelIndex, regelFinden };
